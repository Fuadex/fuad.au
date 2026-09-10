const fs = require('fs');
// Usage: node <script> <workshop-dir>   (defaults to this directory)
const WORKDIR = (process.argv[2] || __dirname).replace(/\\/g, '/').replace(/\/?$/, '/');
const D = WORKDIR;
const ids = JSON.parse(fs.readFileSync(D + 'ids.json', 'utf8'));
const w = {}; global.window = w;
eval(fs.readFileSync('C:/Users/Fuad/Documents/GitHub/fuad.au/canvas/artworks.js', 'utf8'));
const W = new Set(w.CANVAS_ARTWORKS.map(a => a.id));
// The store's own reads, so a companion found outside the candidate pools can still be grounded.
eval(fs.readFileSync('C:/Users/Fuad/Documents/GitHub/fuad.au/canvas/art-about.js', 'utf8'));
const ABOUT = w.CANVAS_ART_ABOUT || {};
// COMPANION GROUNDING (added 2026-09-03, after the wave-6 seal caught two besides asserting the
// content of INFO-less companions and this script passed them silently): the candidate rows record
// which companions ship an Info. A companion without one licenses artist/title/year and NOTHING
// else. The script cannot judge semantics, so it hard-flags those besides and prints exactly what
// IS licensed, so a human ruling is cheap.
// Two candidate-file formats exist. Waves 1-6 wrote one `cand_<id>.txt` per work; from wave 10 the
// builder emits a single `beside_candidates.json` keyed by work id, with three pools per work.
// ⚠ THE FAILURE THIS GUARD EXISTS FOR ALREADY HAPPENED TO THIS FUNCTION. Reading only the old
// format, it returned {} for every work in a newer wave — so the pool check and the GROUNDING check
// both went dead, `ungrounded` stayed 0 because nothing incremented it, and the script printed
// "all companions carry shipped Info" over twenty entirely unchecked besides. A check that cannot
// find its input must SAY SO, never pass. Hence the hard exit below.
const CAND_JSON = (() => {
  const p = D + 'beside_candidates.json';
  try { return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null; } catch (e) { return null; }
})();
let sawAnyPool = false;
function infoMap(id) {
  const m = {};
  if (CAND_JSON && CAND_JSON[id]) {
    for (const pool of ['sameArtist', 'crossArtist', 'periodToured']) {
      for (const r of (CAND_JSON[id][pool] || [])) {
        m[r.id] = { hasInfo: !!r.info, row: [r.id, r.artist, r.title, r.year, r.museum].filter(Boolean).join(' | ') };
      }
    }
    sawAnyPool = sawAnyPool || Object.keys(m).length > 0;
    return m;
  }
  const p = D + 'cand_' + id + '.txt';
  if (!fs.existsSync(p)) return m;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const cid = line.split(' | ')[0].trim();
    m[cid] = { hasInfo: line.includes(' | INFO: '), row: line.split(' | INFO: ')[0].trim() };
  }
  sawAnyPool = sawAnyPool || Object.keys(m).length > 0;
  return m;
}
let ungrounded = 0;
for (const id of ids) {
  const b = JSON.parse(fs.readFileSync(D + 'beside_' + id + '.json', 'utf8').replace(/^﻿/, ''));
  // An omission is a recorded DECISION, not a missing file — skip it, but refuse a silent one.
  if (!b.beside) { console.log('== ' + id + '  OMITTED' + (b.notes ? ': ' + String(b.notes).slice(0, 120) : '  WARN: NO REASON RECORDED')); console.log(''); continue; }
  const wc = b.beside.trim().split(/\s+/).length;
  // Two file shapes exist and both are valid. Waves 1-6 wrote scalar `companion` + `refText`;
  // from wave 10 the file carries `refs: [{id, text}]` — which is also the STORE's shape — and
  // `companion` became an object. Reading only the old shape does not fail loudly: `b.refText`
  // comes back undefined, `split(undefined)` yields one element, and every entry reports
  // "COMPANION NOT IN CANON, refText occurs 0" while being perfectly sound. Normalise first.
  // The array form is also what supports the second companion the spec permits.
  const pairs = Array.isArray(b.refs) && b.refs.length
    ? b.refs.map((r) => ({ id: r.id, text: r.text }))
    : [{ id: b.companion, text: b.refText }];
  const bad = [];
  if (!pairs.length) bad.push('NO COMPANION');
  for (const p of pairs) {
    if (!W.has(p.id)) bad.push('COMPANION NOT IN CANON: ' + p.id);
    const occ = p.text == null ? 0 : b.beside.split(p.text).length - 1;
    if (occ !== 1) bad.push('refText occurs ' + occ + (pairs.length > 1 ? ' for ' + p.id : ''));
    if (p.id === id) bad.push('SELF');
  }
  // COLLECTION COUNT = counting the CANVAS collection, not "the only X" inside a picture.
  if (/the only [^.]{0,40}\b(in|on) (the|this) (collection|site|wall|walls|gallery|room)\b|hangs twice|the collection (holds|has|contains|owns)|\b(only|other) (work|painting|canvas) (here|on this site|in the collection)\b/i.test(b.beside))
    bad.push('COLLECTION COUNT');
  if (/["“”!]/.test(b.beside)) bad.push('quotes or bang');
  // the collection is virtual — no beside may claim a physical hang relationship
  if (/\bnearby hangs\b|\ba few steps away\b|\bnext door\b|\bin the next room\b|\bpacing two rooms\b/i.test(b.beside))
    bad.push('PHYSICAL ADJACENCY (use in-this-collection phrasing)');
  const pool = infoMap(id);
  for (const p of pairs) {
    const comp = pool[p.id];
    // Reaching past the pool is ALLOWED — the pools are built by proxy (same artist, shared
    // subject terms, a +/-30-year window) and some works have empty or degenerate ones; several of
    // the best companions were found by reading the corpus index directly. But "outside the pool"
    // must never mean "unchecked": fall back to the STORE, which is the better authority anyway.
    if (!comp) {
      const shipped = ABOUT[p.id] && ABOUT[p.id].about;
      console.log('   .. ' + p.id + ' is outside this work\'s candidate pool — ' +
        (shipped ? 'shipped Info found in the store, grounded' : 'AND SHIPS NO INFO'));
      if (!shipped) { ungrounded++; bad.push('COMPANION HAS NO SHIPPED INFO (checked pool and store) — artist/title/year is ALL that is licensed'); }
      continue;
    }
    if (!comp.hasInfo) {
      ungrounded++;
      bad.push('COMPANION HAS NO SHIPPED INFO — artist/title/year is ALL that is licensed; any content claim\n     about it must be cut or re-attributed to THIS work\'s record. Licensed: ' + comp.row);
    }
  }
  console.log('== ' + id + ' [' + wc + 'w] -> ' + pairs.map((p) => p.id).join(' + ') + (bad.length ? '  WARN: ' + bad.join(', ') : ''));
  console.log(b.beside);
  console.log('');
}
console.log(ungrounded
  ? ungrounded + ' beside(s) lean on an INFO-less companion — a human must confirm no content is claimed.'
  : 'all companions carry shipped Info — content claims are groundable');

// The guard the header describes: if NO candidate pool was readable for any work, the grounding
// check above never ran, and the reassuring line just printed means nothing. Refuse rather than
// pass — a silent green is worse than a red, because it is believed.
if (!sawAnyPool) {
  console.error('\nFATAL: no candidate pools were readable in ' + D + ' — expected beside_candidates.json ' +
    'or cand_<id>.txt. Grounding was NOT checked; ignore any pass printed above.');
  process.exit(1);
}
