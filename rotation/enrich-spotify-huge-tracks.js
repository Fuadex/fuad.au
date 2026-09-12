// enrich-spotify-huge-tracks.js — fill per-track audio features for tracks the id-based path missed,
// out of the big NAME-KEYED local dump. enrich-spotify-tracks.js resolves our artists to Spotify
// artist ids and walks their owned albums, which needs four parquets extracted into .sptmp and
// silently drops anything whose artist never resolved: score composers, soundtrack rows, small acts.
// This one joins on names instead, so it reaches those.
//
//   NODE_PATH=../../.dtmp/node_modules node enrich-spotify-huge-tracks.js          (dry run)
//   NODE_PATH=../../.dtmp/node_modules node enrich-spotify-huge-tracks.js WRITE    (merge the JSON)
//
// In:  media-index.js (our distinct artist/track pairs), spotify-track-data.json (what we already have)
// Out: spotify-track-data.json — ONLY keys that currently lack features are added. Entries that already
//      carry features are never touched, so this cannot regress the id-matched data.
//
// MATCHING. Titles must match exactly once normalised — that is the safety anchor. Artists match on a
// SORTED WORD SET with a leading "the" dropped, because the dump's credits disagree with ours in ways
// an exact compare cannot survive: it files Hiroyuki Sawano as "Sawano Hiroyuki" (Japanese name order)
// and The Sisters of Mercy as "Sisters of Mercy". Sorting the words makes both orders one key, and
// requiring an exact title match alongside it keeps that looseness safe. "The Sisters of Mercy Choir"
// still lands on its own key, so an extra word does not collide.
//
// Entry shape matches the existing store exactly:
//   [durSec, pop, explicit, trackNo, energy, valence, acoustic, tempo, dance, instr,
//    loud, live, speech, key, mode, timeSig]
//   energy/valence/acoustic/dance/instr/live/speech are 0..100; tempo is RAW BPM (the 2026-09-01
//   migration, see build-data.js); loud is dB x10; key 0..11; mode 1 major / 0 minor. timeSig is 0:
//   this dump has no time_signature column, and nothing in build-data or the views reads index 15.

const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = __dirname, TMP = path.join(ROOT, "..", "..", ".sptmp");
const WRITE = process.argv[2] === "WRITE";
// duckdb wants forward slashes in its path literals; build them without backslash escapes
const FWD = (p) => p.split(String.fromCharCode(92)).join("/");
const PARQUET = FWD(path.join(ROOT, "spotify-huge-audio-features.parquet"));

// slug MUST match build-data.js exactly (incl. the hash fallback) so non-Latin keys line up.
const _slugHash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = (((h << 5) + h) ^ s.charCodeAt(i)) >>> 0; return h.toString(36); };
const slug = (s) => { const t = (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); return t || ("a-" + _slugHash(s || "x").slice(0, 7)); };
// Script-preserving: keep a-z0-9 plus CJK so Japanese titles stay distinguishable. No accent folding
// (it corrupts dakuten); accented Latin simply drops out, identically on both sides of the join.
const CJK = "ぁ-んァ-ヶ一-龠";
const CLASS = "[^a-z0-9" + CJK + "]";
const norm = (s) => (s || "").toLowerCase().replace(new RegExp(CLASS, "gu"), "");
const akey = (s) => (s || "").toLowerCase().replace(new RegExp(CLASS + "+", "gu"), " ")
  .trim().split(" ").filter(w => w && w !== "the").sort().join("");
const SQL_NORM = (c) => "regexp_replace(lower(" + c + "), '" + CLASS + "', '', 'g')";
const SQL_AKEY = (c) => "array_to_string(list_sort(list_filter(string_split(regexp_replace(lower(" + c +
  "), '" + CLASS + "+', ' ', 'g'), ' '), x -> x <> '' AND x <> 'the')), '')";

const TD = JSON.parse(fs.readFileSync(path.join(ROOT, "spotify-track-data.json"), "utf8"));
const ctx = { window: {}, console: { log() {}, error() {} } };
vm.runInNewContext(fs.readFileSync(path.join(ROOT, "media-index.js"), "utf8"), ctx);
const MEDIA = ctx.window.ROTATION_MEDIA;

// every distinct library (artist, track) whose entry is missing or featureless
const want = [], seen = new Set();
for (const t of MEDIA.tracks) {
  const artist = MEDIA.artists[t[1]], title = t[0];
  const key = slug(artist) + "~" + slug(title);
  if (seen.has(key)) continue; seen.add(key);
  const cur = TD[key];
  if (cur && cur.length >= 10) continue;            // already has features — leave it alone
  const ak = akey(artist), tn = norm(title);
  if (!ak || !tn) continue;
  want.push({ key, ak, tn });
}
console.log(want.length + " library tracks lack audio features; looking them up by name");
if (!want.length) process.exit(0);

fs.mkdirSync(TMP, { recursive: true });
const SETF = FWD(path.join(TMP, "huge-rematch-set.json"));
fs.writeFileSync(SETF, JSON.stringify(want));

const duckdb = require("duckdb");
const db = new duckdb.Database(":memory:");
const run = (sql) => new Promise((res, rej) => db.all(sql, (e, r) => e ? rej(e) : res(r)));
const num = (v) => typeof v === "bigint" ? Number(v) : v;
const pct = (v) => v == null ? 0 : Math.max(0, Math.min(100, Math.round(num(v) * 100)));

// One row per key: where a title matches several releases (singles, reissues, compilations) take the
// most popular, then track_id so repeat runs are byte-stable.
const SQL = [
  "WITH ours AS (SELECT * FROM read_json_auto('" + SETF + "')),",
  "hits AS (",
  "  SELECT " + SQL_AKEY("artist_name") + " AS ak, " + SQL_NORM("track_name") + " AS tn,",
  "         duration_ms, explicit, track_number, track_popularity,",
  "         energy, valence, acousticness, tempo, danceability, instrumentalness,",
  "         loudness, liveness, speechiness, key, mode, track_id",
  "  FROM read_parquet('" + PARQUET + "')",
  "  WHERE " + SQL_AKEY("artist_name") + " IN (SELECT DISTINCT ak FROM ours)",
  ")",
  "SELECT o.key AS k, h.duration_ms, h.explicit, h.track_number, h.track_popularity,",
  "       h.energy, h.valence, h.acousticness, h.tempo, h.danceability, h.instrumentalness,",
  "       h.loudness, h.liveness, h.speechiness, h.key, h.mode",
  "FROM ours o JOIN hits h ON h.ak = o.ak AND h.tn = o.tn",
  "QUALIFY ROW_NUMBER() OVER (PARTITION BY o.key ORDER BY h.track_popularity DESC, h.track_id) = 1",
].join("\n");

(async () => {
  const t0 = Date.now();
  const rows = await run(SQL);
  console.log("matched " + rows.length + " of " + want.length +
    " (" + (100 * rows.length / want.length).toFixed(1) + "%) in " + ((Date.now() - t0) / 1000).toFixed(1) + "s");

  let added = 0;
  for (const r of rows) {
    if (TD[r.k] && TD[r.k].length >= 10) continue;   // belt and braces
    TD[r.k] = [
      Math.round(num(r.duration_ms) / 1000), num(r.track_popularity) || 0, num(r.explicit) ? 1 : 0, num(r.track_number) || 0,
      pct(r.energy), pct(r.valence), pct(r.acousticness), Math.round(num(r.tempo) || 0), pct(r.danceability), pct(r.instrumentalness),
      Math.round((num(r.loudness) || 0) * 10), pct(r.liveness), pct(r.speechiness),
      r.key == null ? -1 : num(r.key), r.mode == null ? -1 : num(r.mode), 0,
    ];
    added++;
  }
  const withF = Object.values(TD).filter(v => v && v.length >= 10).length;
  console.log("entries gaining features: " + added + "  |  store now " + Object.keys(TD).length +
    " keys, " + withF + " with features");
  if (!WRITE) { console.log("DRY RUN — pass WRITE to save spotify-track-data.json"); return; }
  fs.writeFileSync(path.join(ROOT, "spotify-track-data.json"), JSON.stringify(TD));
  console.log("written");
})().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
