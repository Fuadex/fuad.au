#!/usr/bin/env node
/**
 * lyric-names.js - stage 0a: resolve lyric KEYS back to the REAL artist / track names.
 *
 * The standing rule for every lyric fetch is LRCLIB BY REAL NAMES, NEVER DE-SLUGGED
 * (MOOD_PIPELINE.md section 3.4). A key like `rammstein~wei-es-fleisch` de-slugs to
 * nonsense; the real title is "Weisses Fleisch" and only the corpus knows that. This
 * script is the one place that reconstructs the mapping, and it does it the way
 * build-data.js builds `trackPlays`: read the scrobble CSV, apply the coherency ledger
 * (folds.json + track-merge.json), and key the result with the CANONICAL slug.
 *
 * It requires ../lib-slug.js rather than re-implementing slug(): the empty->hash
 * fallback for CJK names is load-bearing and a hand copy mis-keys every non-Latin row.
 *
 * Output (scratch only) is a JSON map
 *     "artistslug~trackslug": [artist, title, plays, how]
 * where `how` records which pass matched:
 *     folded   the ledger-folded name, exactly as build-data would key it
 *     raw      the raw scrobbled name (its slug already equals the key)
 *     norm     a normalised-title match (feat credits / bracketed tags / dash suffix
 *              stripped) - the inverse of a TRACK_MERGE the ledger has not spelled out
 *     pairs    <sptmp>/our-tracks.json, the 2026-07 artist/title index
 * Several spellings under one key collapse to the MOST PLAYED spelling, the same rule
 * TRACK_FOLD uses to pick a display title.
 *
 * NO LYRIC TEXT passes through this script. Artist and track names only.
 *
 * Usage
 *   node lyric-names.js --out <sptmp>/refetch-work/name-index.json
 *   node lyric-names.js --out ... --keys <sptmp>/refetch-work/targets.txt   # + coverage
 */
'use strict';

const fs = require('fs');
const path = require('path');

const TOOLS = __dirname;
const ROTATION = path.dirname(TOOLS);
const REPO = path.dirname(ROTATION);
const WORKSPACE = path.dirname(REPO);
const SPTMP = process.env.ROTATION_SPTMP || path.join(WORKSPACE, '.sptmp');

const { slug } = require(path.join(ROTATION, 'lib-slug.js'));

const CSV = path.join(ROTATION, 'fuadex.csv');
const FOLDS_FILE = path.join(ROTATION, 'folds.json');
const TRACK_MERGE_FILE = path.join(ROTATION, 'track-merge.json');
const PAIRS = path.join(SPTMP, 'our-tracks.json');

// Composite-map separator. Built with fromCharCode on purpose: a literal NUL escape in a
// source file is one bad patch away from a real NUL byte on disk, and that corrupts the file.
const SEP = String.fromCharCode(0);

const argv = process.argv.slice(2);
function arg(name, dflt) {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
}
const outPath = arg('--out', path.join(SPTMP, 'refetch-work', 'name-index.json'));
const keysPath = arg('--keys', null);

if (!path.resolve(outPath).startsWith(path.resolve(SPTMP))) {
  console.error(`REFUSING: --out must live under the scratch tree ${SPTMP}`);
  process.exit(2);
}

// ---- the coherency ledger (the same reads build-data.js does) ---------------
const raw = JSON.parse(fs.readFileSync(FOLDS_FILE, 'utf8'));
const HAND_MERGE = {};           // variant artist name -> canonical block key   (folds 3a)
const TRACK_MERGE = fs.existsSync(TRACK_MERGE_FILE)
  ? JSON.parse(fs.readFileSync(TRACK_MERGE_FILE, 'utf8')) : {};
const TRACK_FOLD = new Map();    // artist + SEP + slug(to) -> display title     (folds 3c)
const MOVES = new Map();         // slug(fromArtist)~slug(fromTrack) -> [to, to] (folds _moves)

for (const [canonName, block] of Object.entries(raw)) {
  if (canonName.startsWith('_')) continue;
  for (const a of [].concat((block && block.artist) || [])) {
    if (a && a.from) HAND_MERGE[a.from] = canonName;
  }
  for (const f of ((block && block.tracks) || [])) {
    if (!f || !f.from || !f.to || f.type !== 'spelling') continue;
    TRACK_MERGE[slug(canonName) + '~' + slug(f.from)] = f.to;
    TRACK_FOLD.set(canonName + SEP + slug(f.to), f.to);
  }
}
// flatten multi-hop artist folds to a fixed point (build-data.js does the same)
for (const k of Object.keys(HAND_MERGE)) {
  let v = HAND_MERGE[k];
  const seen = new Set([k]);
  while (HAND_MERGE[v] && !seen.has(v)) { seen.add(v); v = HAND_MERGE[v]; }
  HAND_MERGE[k] = v;
}
for (const m of (raw._moves || [])) {
  if (m && m.fromArtist && m.fromTrack) {
    MOVES.set(slug(m.fromArtist) + '~' + slug(m.fromTrack), [m.toArtist, m.toTrack]);
  }
}
const canonArtist = (name) => HAND_MERGE[name] || name;
function foldTrack(artist, track) {
  if (!track) return track;
  const merged = TRACK_MERGE[slug(artist) + '~' + slug(track)];
  if (merged) track = merged;
  return TRACK_FOLD.get(artist + SEP + slug(track)) || track;
}

// ---- normalised title (the inverse of an unspelled TRACK_MERGE) -------------
// "Rainbow (feat. The Partysquad)" -> "Rainbow"; "Parasite [Explicit]" -> "Parasite";
// "March of the Pigs - Unclean Version" -> "March of the Pigs"; "The Wall" -> "Wall".
function normTitle(t) {
  let s = String(t || '');
  s = s.replace(/\s*[([][^)\]]*[)\]]\s*$/g, '');
  s = s.replace(/\s+-\s+.*$/, '');
  s = s.replace(/^\s*(the|a|an)\s+/i, '');
  return s.trim();
}

// ---- CSV --------------------------------------------------------------------
function parseLine(l) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < l.length; i++) {
    const c = l[i];
    if (q) {
      if (c === '"') {
        if (l[i + 1] === '"') { cur += '"'; i++; } else q = false;
      } else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

// key -> how -> (artist + SEP + title) -> plays
const buckets = new Map();
function note(key, how, artist, title) {
  if (!key || !artist || !title) return;
  let byHow = buckets.get(key);
  if (!byHow) { byHow = new Map(); buckets.set(key, byHow); }
  let m = byHow.get(how);
  if (!m) { m = new Map(); byHow.set(how, m); }
  const n = artist + SEP + title;
  m.set(n, (m.get(n) || 0) + 1);
}

let rows = 0;
for (const line of fs.readFileSync(CSV, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  const f = parseLine(line);
  if (f.length < 4) continue;
  const rawArtist = f[0].trim();
  const rawTrack = f[2].trim();
  if (!rawArtist || !rawTrack) continue;
  rows++;

  let artist = canonArtist(rawArtist);
  let track = foldTrack(artist, rawTrack);
  const mv = MOVES.get(slug(artist) + '~' + slug(track));
  if (mv) { artist = mv[0]; track = foldTrack(artist, mv[1]); }

  // the key build-data.js would produce, named with the real scrobbled spelling
  note(slug(artist) + '~' + slug(track), 'folded', artist, track);
  // the raw spelling, for keys minted before a fold landed
  note(slug(rawArtist) + '~' + slug(rawTrack), 'raw', rawArtist, rawTrack);
  // and the normalised title, for merges the ledger has not spelled out
  const nt = normTitle(track);
  if (nt && slug(nt) !== slug(track)) note(slug(artist) + '~' + slug(nt), 'norm', artist, track);
}

// the 2026-07 artist/title index, lowest priority
let pairs = [];
try { pairs = JSON.parse(fs.readFileSync(PAIRS, 'utf8')); } catch (e) { /* optional */ }
for (const p of pairs) {
  if (!Array.isArray(p) || p.length < 2) continue;
  note(slug(p[0]) + '~' + slug(p[1]), 'pairs', p[0], p[1]);
}

// ---- collapse: best spelling per key, best pass first -----------------------
const ORDER = ['folded', 'raw', 'norm', 'pairs'];
const index = {};
for (const [key, byHow] of buckets) {
  for (const how of ORDER) {
    const m = byHow.get(how);
    if (!m) continue;
    let best = null;
    let bn = -1;
    for (const [n, c] of m) if (c > bn) { bn = c; best = n; }
    const ix = best.indexOf(SEP);
    index[key] = [best.slice(0, ix), best.slice(ix + 1), bn, how];
    break;
  }
}

fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(index));

console.log(`csv rows        : ${rows}`);
console.log(`artist folds    : ${Object.keys(HAND_MERGE).length}`);
console.log(`track merges    : ${Object.keys(TRACK_MERGE).length} (+${TRACK_FOLD.size} display pins)`);
console.log(`name index keys : ${Object.keys(index).length}`);
const byHow = {};
for (const v of Object.values(index)) byHow[v[3]] = (byHow[v[3]] || 0) + 1;
console.log('by pass         :', byHow);
console.log(`wrote -> ${outPath}`);

if (keysPath) {
  const keys = fs.readFileSync(keysPath, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);
  const miss = keys.filter((k) => !index[k]);
  const hitHow = {};
  for (const k of keys) if (index[k]) hitHow[index[k][3]] = (hitHow[index[k][3]] || 0) + 1;
  console.log(`\ncoverage over ${keys.length} keys: named ${keys.length - miss.length} `
    + `· unnamed ${miss.length}`);
  console.log('  by pass:', hitHow);
  if (miss.length) {
    console.log('  unnamed keys:');
    for (const k of miss.slice(0, 60)) console.log('   ', k);
    if (miss.length > 60) console.log(`    ... ${miss.length - 60} more`);
  }
}
