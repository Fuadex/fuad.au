// extract-liked-audio.js — build liked-audio.json (per-liked-track audio handles) from the local
// audio-features parquet.
//
// The Liked-songs view (#liked) wants audio handles per saved track — tempo (BPM), energy, valence,
// danceability, plus the EXTENDED DNA axes the tuner radar/sliders use (acoustic, instrumental,
// speechiness, liveness, loudness, key, mode). Two passes (2026-08-12 — before the name pass ~2.2k
// saves sat "without data" in the tuner):
//   pass 1 — by Spotify track id (authoritative; liked rows carry real ids).
//   pass 2 — for ids the parquet misses: the same RECORDING usually exists under other release ids,
//            so match by normalized (artist, title) equality and average across releases. Exact
//            normalized equality only — no fuzzy distance, so live/remix variants stay unmatched
//            rather than wrongly matched.
//
// The parquet (spotify-huge-audio-features.parquet) is a large LOCAL file — gitignored, never
// committed. It needs duckdb, installed OUTSIDE the repo (../../.dtmp/pylibs, python). Run with:
//   node extract-liked-audio.js
//
// Output liked-audio.json:
//   { "<trackId>": [tempoBpm, energy, valence, dance, acoustic, instr, speech, live, loudDbx10, key, mode] }
// 0..100 ints except tempo (whole BPM), loudness (dB × 10, matches the track-audio store's loud
// slot), key (0..11) and mode (0/1). Older 4-field consumers keep working — slots 0..3 unchanged.
// build-data.js reads this and folds the handles into each liked-meta.js row, falling back to the
// 0..100 track-audio store for ids both passes miss.
const { execFileSync } = require("child_process"), fs = require("fs"), path = require("path");

const liked = JSON.parse(fs.readFileSync(path.join(__dirname, "spotify-liked-src.json"), "utf8"));
const byId = {};
for (const r of liked) if (r.id && !byId[r.id]) byId[r.id] = [r.artist || "", r.track || ""];
fs.writeFileSync(path.join(__dirname, ".liked-ids.tmp.json"), JSON.stringify(byId));

const fwd = p => p.replace(/\\/g, "/");   // forward slashes are safe in both python + duckdb path literals
const py = `
import json, duckdb, re
by_id = json.load(open('${fwd(path.join(__dirname, ".liked-ids.tmp.json"))}', encoding='utf-8'))
ids = list(by_id.keys())
con = duckdb.connect()
con.execute('CREATE TEMP TABLE ids(id VARCHAR)')
con.executemany('INSERT INTO ids VALUES (?)', [(i,) for i in ids])
PQ = '${fwd(path.join(__dirname, "spotify-huge-audio-features.parquet"))}'
COLS = 'avg(t.tempo) AS tempo, avg(t.energy) AS energy, avg(t.valence) AS valence, avg(t.danceability) AS dance, ' \\
       'avg(t.acousticness) AS acoustic, avg(t.instrumentalness) AS instr, avg(t.speechiness) AS speech, ' \\
       'avg(t.liveness) AS live, avg(t.loudness) AS loud, mode(t.key) AS pkey, mode(t.mode) AS pmode'

def clampi(x, lo, hi):
    return max(lo, min(hi, int(round(x))))
def pack(row):
    tempo, energy, valence, dance, acoustic, instr, speech, live, loud, pkey, pmode = row
    if tempo is None:
        return None
    return [clampi(tempo, 0, 400)] + [clampi((v or 0) * 100, 0, 100) for v in (energy, valence, dance, acoustic, instr, speech, live)] \\
        + [clampi((loud or 0) * 10, -900, 100), None if pkey is None else int(pkey), None if pmode is None else int(pmode)]

out = {}
# pass 1 — id join
for r in con.execute(f"SELECT t.track_id, {COLS} FROM read_parquet('{PQ}') t JOIN ids ON t.track_id = ids.id GROUP BY t.track_id").fetchall():
    v = pack(r[1:])
    if v is not None:
        out[r[0]] = v
# pass 2 — normalized (artist, title) join for the ids pass 1 missed
norm = lambda s: re.sub(r'[^a-z0-9]+', '', (s or '').lower())
missing = [(norm(by_id[i][0]), norm(by_id[i][1]), i) for i in ids if i not in out]
missing = [m for m in missing if m[0] and m[1]]
con.execute('CREATE TEMP TABLE want(na VARCHAR, nt VARCHAR, id VARCHAR)')
con.executemany('INSERT INTO want VALUES (?, ?, ?)', missing)
q = f'''
  SELECT w.id, {COLS}
  FROM read_parquet('{PQ}') t
  JOIN want w ON regexp_replace(lower(t.artist_name), '[^a-z0-9]+', '', 'g') = w.na
             AND regexp_replace(lower(t.track_name),  '[^a-z0-9]+', '', 'g') = w.nt
  GROUP BY w.id
'''
named = 0
for r in con.execute(q).fetchall():
    v = pack(r[1:])
    if v is not None:
        out[r[0]] = v
        named += 1
json.dump(out, open('${fwd(path.join(__dirname, "liked-audio.json"))}', 'w', encoding='utf-8'), separators=(',', ':'), ensure_ascii=False)
print('matched', len(out), '/', len(ids), 'liked ids (', named, 'via the artist+title pass )')
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
