// extract-liked-audio.js — build liked-audio.json (per-liked-track audio handles) from the local
// audio-features parquet, keyed by Spotify track id.
//
// The Liked-songs view (#liked) wants audio handles — tempo (BPM), energy, valence, danceability —
// per saved track. liked rows carry real Spotify track ids, so we resolve them straight against the
// local audio-features parquet by track_id (the authoritative BPM source; the per-artist averages in
// audio-features.json / the 0..100 track-audio store are lossy for this).
//
// The parquet (spotify-huge-audio-features.parquet) is a large LOCAL file — gitignored, never
// committed. It needs duckdb, installed OUTSIDE the repo (../../.dtmp/pylibs, python). Run with:
//   PYTHONPATH=../../.dtmp/pylibs node extract-liked-audio.js   (spawns the bundled python query)
//
// Output liked-audio.json: { "<trackId>": [tempoBpm, energy0to100, valence0to100, dance0to100] }
// (compact ints; tempo rounded to whole BPM). build-data.js reads this and folds the handles into
// each liked-meta.js row, falling back to the 0..100 track-audio store for ids the parquet misses.
const { execFileSync } = require("child_process"), fs = require("fs"), path = require("path");

const liked = JSON.parse(fs.readFileSync(path.join(__dirname, "spotify-liked-src.json"), "utf8"));
const ids = [...new Set(liked.map(r => r.id).filter(Boolean))];
fs.writeFileSync(path.join(__dirname, ".liked-ids.tmp.json"), JSON.stringify(ids));

const fwd = p => p.replace(/\\/g, "/");   // forward slashes are safe in both python + duckdb path literals
const py = `
import json, duckdb
ids = json.load(open('${fwd(path.join(__dirname, ".liked-ids.tmp.json"))}', encoding='utf-8'))
con = duckdb.connect()
con.execute('CREATE TEMP TABLE ids(id VARCHAR)')
con.executemany('INSERT INTO ids VALUES (?)', [(i,) for i in ids])
rows = con.execute('''
  SELECT t.track_id,
         avg(t.tempo)         AS tempo,
         avg(t.energy)        AS energy,
         avg(t.valence)       AS valence,
         avg(t.danceability)  AS dance
  FROM read_parquet('${fwd(path.join(__dirname, "spotify-huge-audio-features.parquet"))}') t
  JOIN ids ON t.track_id = ids.id
  GROUP BY t.track_id
''').fetchall()
def clampi(x, lo, hi):
    return max(lo, min(hi, int(round(x))))
out = {}
for tid, tempo, energy, valence, dance in rows:
    if tempo is None:
        continue
    out[tid] = [clampi(tempo, 0, 400), clampi((energy or 0)*100, 0, 100),
                clampi((valence or 0)*100, 0, 100), clampi((dance or 0)*100, 0, 100)]
json.dump(out, open('${fwd(path.join(__dirname, "liked-audio.json"))}', 'w', encoding='utf-8'), separators=(',', ':'), ensure_ascii=False)
print('matched', len(out), '/', len(ids), 'liked ids')
`;

const pylibs = process.env.LIKED_PYLIBS || path.join(__dirname, "..", "..", ".dtmp", "pylibs");
const env = { ...process.env, PYTHONPATH: pylibs + (process.env.PYTHONPATH ? path.delimiter + process.env.PYTHONPATH : ""), PYTHONIOENCODING: "utf-8" };
let res;
try {
  res = execFileSync("python", ["-c", py], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env });
} catch (e) { process.stderr.write(String(e.stderr || e.message)); process.exit(1); }
process.stdout.write(res);
fs.unlinkSync(path.join(__dirname, ".liked-ids.tmp.json"));
const kb = (fs.statSync(path.join(__dirname, "liked-audio.json")).size / 1024).toFixed(0);
console.log(`liked-audio.json written (${kb} KB)`);
