// extract-liked.js — one-time source extractor for the Liked-songs feature.
//
// Reads the gitignored personal Spotify export zip (my_spotify_data (2).zip), pulls ONLY the
// "Spotify Account Data/YourLibrary.json" entry, and writes rotation/spotify-liked-src.json:
// one row per saved track = { artist, album, track, id } where id is the bare Spotify track id
// (the "spotify:track:" prefix stripped). NOTHING else from the zip is touched — no streaming
// history, no IPs, no inferences. The output is pure taste data (artist/album/title/id), so it
// IS committed (unlike the zip, which stays local-only per rotation/.gitignore).
//
// Dependency-free: the repo has no zip lib and never npm-installs (node_modules isn't gitignored),
// so we shell out to the system `python` with a tiny inline zipfile reader — the same tactic other
// pipeline steps use for archive extraction (see ARCHITECTURE.md §4). Run: `node extract-liked.js`.

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ZIP = path.join(__dirname, "my_spotify_data (2).zip");
const ENTRY = "Spotify Account Data/YourLibrary.json";
const OUT = path.join(__dirname, "spotify-liked-src.json");

if (!fs.existsSync(ZIP)) {
  console.error(`FATAL: ${path.basename(ZIP)} not found in ${__dirname}. This is the personal, gitignored Spotify export — extract-liked.js only runs where that zip is present.`);
  process.exit(1);
}

// Read the single JSON entry out of the zip via python's stdlib zipfile (no npm dependency).
const py = `import zipfile,sys,json\nz=zipfile.ZipFile(r'''${ZIP}''')\nsys.stdout.buffer.write(z.read('''${ENTRY}'''))`;
let res = spawnSync("python", ["-c", py], { maxBuffer: 1 << 28 });
if (res.error || res.status !== 0) res = spawnSync("python3", ["-c", py], { maxBuffer: 1 << 28 });
if (res.error || res.status !== 0) {
  console.error("FATAL: could not read the zip entry via python/python3.", res.stderr && res.stderr.toString());
  process.exit(1);
}

const lib = JSON.parse(res.stdout.toString("utf8"));
const tracks = lib.tracks || [];
const rows = tracks.map(t => ({
  artist: t.artist,
  album: t.album,
  track: t.track,
  id: String(t.uri || "").replace(/^spotify:track:/, ""),
})).filter(r => r.artist && r.track);

// Deterministic order (export order) so re-runs produce a stable, review-friendly diff.
fs.writeFileSync(OUT, JSON.stringify(rows, null, 0) + "\n", "utf8");
console.log(`spotify-liked-src.json: ${rows.length} liked tracks (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB)`);
