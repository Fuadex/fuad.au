const fs = require('fs');
// Usage: node <script> <workshop-dir>   (defaults to this directory)
const WORKDIR = (process.argv[2] || __dirname).replace(/\\/g, '/').replace(/\/?$/, '/');
const D = WORKDIR;
const ids = JSON.parse(fs.readFileSync(D + 'ids.json', 'utf8'));
const w = {}; global.window = w;
eval(fs.readFileSync('C:/Users/Fuad/Documents/GitHub/fuad.au/canvas/artworks.js', 'utf8'));
const W = new Set(w.CANVAS_ARTWORKS.map(a => a.id));
// COMPANION GROUNDING (added 2026-09-03, after the wave-6 seal caught two besides asserting the
// content of INFO-less companions and this script passed them silently): the candidate rows record
// which companions ship an Info. A companion without one licenses artist/title/year and NOTHING
// else. The script cannot judge semantics, so it hard-flags those besides and prints exactly what
// IS licensed, so a human ruling is cheap.
function infoMap(id) {
  const p = D + 'cand_' + id + '.txt';
  const m = {};
  if (!fs.existsSync(p)) return m;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const cid = line.split(' | ')[0].trim();
    m[cid] = { hasInfo: line.includes(' | INFO: '), row: line.split(' | INFO: ')[0].trim() };
  }
  return m;
}
let ungrounded = 0;
for (const id of ids) {
  const b = JSON.parse(fs.readFileSync(D + 'beside_' + id + '.json', 'utf8').replace(/^﻿/, ''));
  const wc = b.beside.trim().split(/\s+/).length;
  const occ = b.beside.split(b.refText).length - 1;
  const bad = [];
  if (!W.has(b.companion)) bad.push('COMPANION NOT IN CANON');
  if (occ !== 1) bad.push('refText occurs ' + occ);
  if (b.companion === id) bad.push('SELF');
  // COLLECTION COUNT = counting the CANVAS collection, not "the only X" inside a picture.
  if (/the only [^.]{0,40}\b(in|on) (the|this) (collection|site|wall|walls|gallery|room)\b|hangs twice|the collection (holds|has|contains|owns)|\b(only|other) (work|painting|canvas) (here|on this site|in the collection)\b/i.test(b.beside))
    bad.push('COLLECTION COUNT');
  if (/["“”!]/.test(b.beside)) bad.push('quotes or bang');
  // the collection is virtual — no beside may claim a physical hang relationship
  if (/\bnearby hangs\b|\ba few steps away\b|\bnext door\b|\bin the next room\b|\bpacing two rooms\b/i.test(b.beside))
    bad.push('PHYSICAL ADJACENCY (use in-this-collection phrasing)');
  const comp = infoMap(id)[b.companion];
  if (!comp) bad.push('companion not in this work\'s candidate pool');
  else if (!comp.hasInfo) {
    ungrounded++;
    bad.push('COMPANION HAS NO SHIPPED INFO — artist/title/year is ALL that is licensed; any content claim\n     about it must be cut or re-attributed to THIS work\'s record. Licensed: ' + comp.row);
  }
  console.log('== ' + id + ' [' + wc + 'w] -> ' + b.companion + (bad.length ? '  WARN: ' + bad.join(', ') : ''));
  console.log(b.beside);
  console.log('');
}
console.log(ungrounded
  ? ungrounded + ' beside(s) lean on an INFO-less companion — a human must confirm no content is claimed.'
  : 'all companions carry shipped Info — content claims are groundable');
