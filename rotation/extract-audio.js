// extract-audio.js — build audio-features.json (measured Sound DNA) from the local Spotify
// audio-features parquet (a local track-analysis dataset).
//
// The parquet (spotify-audio-features.parquet) is a large LOCAL file — gitignored, never
// committed. Needs the duckdb node binding, which we install OUTSIDE the repo; run with:
//   NODE_PATH=../.dtmp/node_modules node extract-audio.js
//
// Matches our artist names (case-insensitive) against the dump and averages each artist's tracks
// into one vector. Spotify's 6 features map 1:1 onto our DNA axes (energy/valence/acousticness/
// tempo/danceability/instrumentalness); tempo (BPM) is normalised to 0-1 to match the radar.
// Also keeps extras for later: speech/live/loud, major-key share, popularity, followers, n.
const duckdb = require("duckdb"), fs = require("fs"), vm = require("vm");

const ctx = { window: {}, console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync("music-core.js", "utf8"), ctx);
vm.runInContext(fs.readFileSync("music-rest.js", "utf8"), ctx);   // merges EXPLORE (used below)
const R = ctx.window.ROTATION;
const names = [...new Set([...R.ARTISTS.map(a => a.name), ...R.EXPLORE.map(a => a.name)])];
fs.writeFileSync(".names.tmp.json", JSON.stringify(names.map(n => ({ name: n }))));
// MusicBrainz aliases (artist-aliases.json) as a LAST-RESORT key. Some artists are billed
// differently in the catalogue than on last.fm — "Scars on Broadway" (400 plays) is filed under
// "Daron Malakian and Scars On Broadway" — which no article-stripping rule can reach, but the
// alias cache already knows. Emitted as (ourName, aliasName) pairs; only consulted for names the
// first two passes failed on, so an exact or the-stripped hit always wins.
const ALIASES = (() => { try { return JSON.parse(fs.readFileSync("artist-aliases.json", "utf8")); } catch (e) { return {}; } })();
const aliasRows = [];
{
  const own = new Set(names.map(n => n.toLowerCase()));
  for (const n of names) {
    const rec = ALIASES[n];
    for (const a of (rec && rec.aliases) || []) {
      const la = String(a).toLowerCase();
      if (!la || la === n.toLowerCase()) continue;
      if (own.has(la)) continue;          // the alias is itself one of our artists — never cross-wire
      aliasRows.push({ name: n, alias: la });
    }
  }
}
fs.writeFileSync(".aliases.tmp.json", JSON.stringify(aliasRows));

// PICK THE FILE THAT ACTUALLY HAS DATA (Fuad 2026-08-31). spotify-audio-features.parquet was
// sitting at ZERO BYTES — a truncated stub — while the real 56.3M-row table lived in
// spotify-huge-audio-features.parquet. Every run since silently matched nothing, which is why
// audio-features.json froze on 2026-08-16 and the artists added by the lowered play floor never
// got a Sound-DNA vector (9 of the 2,158 in the 3-4 play band had one). Both names are local and
// gitignored; prefer whichever is non-empty, largest first, and fail loudly if neither is.
const AF_CANDIDATES = ["spotify-huge-audio-features.parquet", "spotify-audio-features.parquet"];
const AF = AF_CANDIDATES
  .map(f => ({ f, size: (() => { try { return fs.statSync(f).size; } catch (e) { return 0; } })() }))
  .filter(x => x.size > 0)
  .sort((a, b) => b.size - a.size)[0];
if (!AF) throw new Error("no non-empty audio-features parquet found — looked for: " + AF_CANDIDATES.join(", "));
console.log(`audio source: ${AF.f} (${(AF.size / 1024 / 1024 / 1024).toFixed(2)} GB)`);

const db = new duckdb.Database(":memory:");
// LEADING-"THE" FALLBACK (Fuad 2026-08-31). The exact name join silently drops artists whose
// billing differs by a leading article, and it happens in BOTH directions: we say "Smashing
// Pumpkins" (509 plays) where the dump says "The Smashing Pumpkins" (861 rows), and we say "The
// Devin Townsend Project" (238 plays) where the dump says "Devin Townsend Project" (607 rows).
// Both then vanish from every audio sort and from Texture/Mood, looking like missing data rather
// than a naming mismatch. So: pass 1 is the exact join, unchanged; pass 2 retries ONLY the names
// pass 1 found nothing for, on a "the"-stripped key. Fallback-only, so an exact match always wins
// and no existing vector can change. The same idiom already exists in the build's CANON_MK tier.
// NOT fixed here: full-billing variants ("Daron Malakian and Scars On Broadway") — those need an
// alias, not a rule — and artists genuinely absent from the dump (beats:metaphysical).
const AGG = `
      avg(energy) energy, avg(valence) valence, avg(acousticness) acoustic,
      avg(tempo) tempo, avg(danceability) dance, avg(instrumentalness) instr,
      avg(speechiness) speech, avg(liveness) live, avg(loudness) loud,
      avg(case when mode = 1 then 1.0 else 0.0 end) major,
      max(artist_popularity) pop, max(artist_followers) followers, avg(duration_ms) dur, count(*) n`;
const THE = (c) => `regexp_replace(${c}, '^the ', '')`;
const sql = `
  CREATE TABLE ours AS SELECT name, lower(name) AS lname, ${THE("lower(name)")} AS lkey
    FROM read_json_auto('.names.tmp.json');
  CREATE TABLE feats AS
    SELECT o.name AS name, ${AGG}
    FROM read_parquet('${AF.f}') t
    JOIN ours o ON lower(t.artist_name) = o.lname
    GROUP BY o.name;
  CREATE TABLE feats2 AS
    SELECT o.name AS name, ${AGG}
    FROM read_parquet('${AF.f}') t
    JOIN ours o ON ${THE("lower(t.artist_name)")} = o.lkey
    WHERE o.name NOT IN (SELECT name FROM feats)
    GROUP BY o.name;
  INSERT INTO feats SELECT * FROM feats2;
  CREATE TABLE al AS SELECT * FROM read_json_auto('.aliases.tmp.json');
  CREATE TABLE feats3 AS
    SELECT a.name AS name, ${AGG}
    FROM read_parquet('${AF.f}') t
    JOIN al a ON lower(t.artist_name) = a.alias
    WHERE a.name NOT IN (SELECT name FROM feats)
    GROUP BY a.name;
  INSERT INTO feats SELECT * FROM feats3;`;

const num = (x) => x == null ? 0 : Number(x);
const norm = (b) => Math.max(0, Math.min(1, (num(b) - 50) / 140)); // BPM → 0-1
db.exec(sql, (err) => {
  if (err) throw err;
  db.all("SELECT (SELECT count(*) FROM feats2) a, (SELECT count(*) FROM feats3) b", (e2, r2) => {
    if (!e2 && r2 && r2[0]) console.log(`  rescued beyond the exact join: ${r2[0].a} by leading-"the", ${r2[0].b} by MB alias`);
  });
  db.all("SELECT * FROM feats WHERE n >= 1", (err, rows) => {
    if (err) throw err;
    const out = {};
    for (const r of rows) {
      const f = (x) => +num(x).toFixed(3);
      out[r.name] = {
        energy: f(r.energy), valence: f(r.valence), acoustic: f(r.acoustic), tempo: +norm(r.tempo).toFixed(3),
        dance: f(r.dance), instr: f(r.instr), speech: f(r.speech), live: f(r.live), loud: +num(r.loud).toFixed(1),
        major: f(r.major), pop: Math.round(num(r.pop)), followers: Math.round(num(r.followers)), dur: Math.round(num(r.dur)), n: num(r.n),
      };
    }
    fs.writeFileSync("audio-features.json", JSON.stringify(out));
    fs.unlinkSync(".names.tmp.json");
    try { fs.unlinkSync(".aliases.tmp.json"); } catch (e) {}   // added with the alias pass; clean up like its sibling
    console.log("matched", rows.length, "/", names.length, "artists →", (fs.statSync("audio-features.json").size / 1024).toFixed(0) + "KB");
  });
});
