// extract-audio.js — build audio-features.json (measured Sound DNA) from the local Spotify
// audio-features parquet (GildasLeDrogoff/spotify-huge-track-analysis-dataset, ~56M rows).
//
// The parquet (spotify-huge-audio-features.parquet) is a large LOCAL file — gitignored, never
// committed. Needs the duckdb node binding, which we install OUTSIDE the repo; run with:
//   NODE_PATH=../.dtmp/node_modules node extract-audio.js
//
// Matches our artist names (case-insensitive) against the dump and averages each artist's tracks
// into one vector. Spotify's 6 features map 1:1 onto our DNA axes (energy/valence/acousticness/
// tempo/danceability/instrumentalness); tempo (BPM) is normalised to 0-1 to match the radar.
// Also keeps extras for later: speech/live/loud, major-key share, popularity, followers, n.
const duckdb = require("duckdb"), fs = require("fs"), vm = require("vm");

const ctx = { window: {}, console };
vm.runInNewContext(fs.readFileSync("music-data.js", "utf8"), ctx);
const R = ctx.window.ROTATION;
const names = [...new Set([...R.ARTISTS.map(a => a.name), ...R.EXPLORE.map(a => a.name)])];
fs.writeFileSync(".names.tmp.json", JSON.stringify(names.map(n => ({ name: n }))));

const db = new duckdb.Database(":memory:");
const sql = `
  CREATE TABLE ours AS SELECT name, lower(name) AS lname FROM read_json_auto('.names.tmp.json');
  CREATE TABLE feats AS
    SELECT o.name AS name,
      avg(energy) energy, avg(valence) valence, avg(acousticness) acoustic,
      avg(tempo) tempo, avg(danceability) dance, avg(instrumentalness) instr,
      avg(speechiness) speech, avg(liveness) live, avg(loudness) loud,
      avg(case when mode = 1 then 1.0 else 0.0 end) major,
      max(artist_popularity) pop, max(artist_followers) followers, count(*) n
    FROM read_parquet('spotify-huge-audio-features.parquet') t
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
        major: f(r.major), pop: Math.round(num(r.pop)), followers: Math.round(num(r.followers)), n: num(r.n),
      };
    }
    fs.writeFileSync("audio-features.json", JSON.stringify(out));
    fs.unlinkSync(".names.tmp.json");
    console.log("matched", rows.length, "/", names.length, "artists →", (fs.statSync("audio-features.json").size / 1024).toFixed(0) + "KB");
  });
});
