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
const sql = `
  CREATE TABLE ours AS SELECT name, lower(name) AS lname FROM read_json_auto('.names.tmp.json');
  CREATE TABLE feats AS
    SELECT o.name AS name,
      avg(energy) energy, avg(valence) valence, avg(acousticness) acoustic,
      avg(tempo) tempo, avg(danceability) dance, avg(instrumentalness) instr,
      avg(speechiness) speech, avg(liveness) live, avg(loudness) loud,
      avg(case when mode = 1 then 1.0 else 0.0 end) major,
      max(artist_popularity) pop, max(artist_followers) followers, avg(duration_ms) dur, count(*) n
    FROM read_parquet('${AF.f}') t
    JOIN ours o ON lower(t.artist_name) = o.lname
    GROUP BY o.name;`;

const num = (x) => x == null ? 0 : Number(x);
const norm = (b) => Math.max(0, Math.min(1, (num(b) - 50) / 140)); // BPM → 0-1
db.exec(sql, (err) => {
  if (err) throw err;
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
    console.log("matched", rows.length, "/", names.length, "artists →", (fs.statSync("audio-features.json").size / 1024).toFixed(0) + "KB");
  });
});
