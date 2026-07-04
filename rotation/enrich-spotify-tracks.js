// enrich-spotify-tracks.js — pull per-track audio features (#1) + track stats (#2) for OUR tracks out
// of the local Spotify catalogue dataset, WITHOUT unpacking the whole archive. A driver streams four
// parquets into ../.sptmp (artists, artist_albums, tracks, track_audio_features); this script queries
// them with DuckDB and matches to our own (artist, track) pairs from media-index.js.
//
//   NODE_PATH=../.dtmp/node_modules node enrich-spotify-tracks.js   (needs the 4 parquets extracted)
//
// Out: spotify-track-data.json { "artistSlug~trackSlug": [durSec, pop, explicit, trackNo,
//        energy, valence, acoustic, tempo, dance, instr, loud, live, speech, key, mode, timeSig] }
//      Stats+features are ints; entry is length 4 when no audio features were found, length 16 with.
//      energy/valence/acoustic/dance/instr/live/speech are 0..100; tempo is remapped 50..190bpm → 0..100;
//      loud = dB×10 (e.g. -62 = -6.2dB); key = 0..11 pitch class (-1 unknown); mode = 1 major/0 minor/-1;
//      timeSig = 3..7 (0 unknown).
//
// Track identity = slug(artist)+"~"+slug(track) — mirrors AlbumView's album id so TrackView can route.
// Matching strategy: resolve our artists to Spotify artist rowids (via spotify-cache ids), walk their
// OWNED albums (artist_albums.is_appears_on=0) to their tracks, and match on a script-preserving
// normalisation of the track title. Audio features join by tracks.id → track_audio_features.track_id.

const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = __dirname, TMP = path.join(ROOT, "..", ".sptmp");
const P = (f) => `read_parquet('${path.join(TMP, f + ".parquet").replace(/\\/g, "/")}')`;
const OURS = `read_json_auto('${path.join(TMP, "ours.json").replace(/\\/g, "/")}')`;
const OURSET = `read_json_auto('${path.join(TMP, "ourset.json").replace(/\\/g, "/")}')`;

// slug MUST match build-data.js exactly (incl. hash fallback) so non-Latin keys line up with the build.
const _slugHash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = (((h << 5) + h) ^ s.charCodeAt(i)) >>> 0; return h.toString(36); };
const slug = (s) => { const t = (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); return t || ("a-" + _slugHash(s || "x").slice(0, 7)); };
// script-preserving title normaliser — keep a-z0-9 + CJK so Japanese titles stay distinguishable.
// (no accent folding: strip_accents corrupts Japanese dakuten, so JS and SQL both just drop non-kept chars.)
const CJK = "ぁ-んァ-ヶ一-龠";
const norm = (s) => (s || "").toLowerCase().replace(new RegExp("[^a-z0-9" + CJK + "]", "gu"), "");
const NRM = "regexp_replace(lower(tk.name), '[^a-z0-9" + CJK + "]', '', 'g')";
const clamp = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
const i100 = (v) => Math.round(clamp(v) * 100);

const SPOT = JSON.parse(fs.readFileSync(path.join(ROOT, "spotify-cache.json"), "utf8"));
const ours = Object.entries(SPOT).filter(([, v]) => v && v.id).map(([name, v]) => ({ name, sid: v.id }));

const ctx = { window: {}, console: { log() {}, error() {} } };
vm.runInNewContext(fs.readFileSync(path.join(ROOT, "media-index.js"), "utf8"), ctx);
const MEDIA = ctx.window.ROTATION_MEDIA;
const ourset = [];   // one row per (artist, track): { a:artist, n:norm(title), key }
const seen = new Set();
for (const t of MEDIA.tracks) {
  const artist = MEDIA.artists[t[1]], title = t[0];
  const key = slug(artist) + "~" + slug(title);
  if (seen.has(key)) continue; seen.add(key);
  ourset.push({ a: artist, n: norm(title), key });
}

const duckdb = require("duckdb");
const db = new duckdb.Database(":memory:");
const run = (sql) => new Promise((res, rej) => db.all(sql, (e, r) => e ? rej(e) : res(r)));
fs.mkdirSync(TMP, { recursive: true });
fs.writeFileSync(path.join(TMP, "ours.json"), JSON.stringify(ours));
fs.writeFileSync(path.join(TMP, "ourset.json"), JSON.stringify(ourset));
console.log(`${ours.length} artists with a Spotify id · ${ourset.length} distinct (artist,track) pairs to match`);

(async () => {
  await run(`PRAGMA memory_limit='48GB';`);
  await run(`PRAGMA temp_directory='${TMP.replace(/\\/g, "/")}';`);
  await run(`SET preserve_insertion_order=false;`);

  console.log("stage 1: matching track names (scans tracks)…");
  // resolve artist ids → rowids, walk owned albums → tracks, keep the most-popular track per key.
  await run(`
    CREATE TABLE best AS
    SELECT os.key AS key,
           arg_max(tk.id, tk.popularity) AS sid,
           max(tk.popularity) AS pop,
           arg_max(tk.duration_ms, tk.popularity) AS dur,
           arg_max(CAST(tk.explicit AS INT), tk.popularity) AS exp,
           arg_max(tk.track_number, tk.popularity) AS trackno
    FROM ${OURS} o
    JOIN ${P("artists")} ar ON ar.id = o.sid
    JOIN ${P("artist_albums")} aa ON aa.artist_rowid = ar.rowid AND aa.is_appears_on = 0
    JOIN ${P("tracks")} tk ON tk.album_rowid = aa.album_rowid
    JOIN ${OURSET} os ON os.a = o.name AND ${NRM} = os.n
    GROUP BY os.key;`);
  const nb = (await run(`SELECT count(*) c FROM best`))[0].c;
  console.log(`  matched ${nb} tracks`);

  console.log("stage 2: joining audio features…");
  const rows = await run(`
    SELECT b.key, b.dur, b.pop, b.exp, b.trackno,
           af.energy, af.valence, af.acousticness AS acoustic, af.tempo,
           af.danceability AS dance, af.instrumentalness AS instr,
           af.loudness AS loud, af.liveness AS live, af.speechiness AS speech,
           af.key AS mkey, af.mode AS mode, af.time_signature AS tsig
    FROM best b
    LEFT JOIN ${P("track_audio_features")} af
      ON af.track_id = b.sid AND (af.null_response IS NULL OR af.null_response = false);`);

  // extended per-track entry (features present) — indices:
  //  0 durSec 1 popularity 2 explicit 3 trackNo | 4 energy 5 valence 6 acoustic 7 tempo(0..100) 8 dance 9 instr
  //  10 loud(dB×10, e.g. -62) 11 liveness 12 speechiness 13 key(0..11 pitch class, -1 unknown) 14 mode(1=major,0=minor,-1=?) 15 timeSig(3..7,0=?)
  const iv = (v, d) => (v == null ? d : Math.round(Number(v)));
  const out = {}; let withFeat = 0;
  for (const r of rows) {
    const durSec = Math.round((Number(r.dur) || 0) / 1000);
    const base = [durSec, Number(r.pop) || 0, Number(r.exp) || 0, Number(r.trackno) || 0];
    if (r.energy != null || r.valence != null || r.tempo != null) {
      withFeat++;
      const tempo = i100(clamp((Number(r.tempo) - 50) / 140));   // 50..190 bpm → 0..100
      out[r.key] = base.concat([
        i100(r.energy), i100(r.valence), i100(r.acoustic), tempo, i100(r.dance), i100(r.instr),
        r.loud == null ? 0 : Math.round(Number(r.loud) * 10), i100(r.live), i100(r.speech),
        iv(r.mkey, -1), iv(r.mode, -1), iv(r.tsig, 0),
      ]);
    } else {
      out[r.key] = base;
    }
  }
  fs.writeFileSync(path.join(ROOT, "spotify-track-data.json"), JSON.stringify(out));
  const bytes = fs.statSync(path.join(ROOT, "spotify-track-data.json")).size;
  console.log(`spotify-track-data.json: ${Object.keys(out).length} tracks (${withFeat} with features), ${(bytes / 1e6).toFixed(1)}MB`);
  process.exit(0);
})().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
