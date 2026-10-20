// build-corpus-index.js — the companion-selection index for the `beside` stage (step 8).
// One line per canon work: id | artist | title | year | museum | TOURED? | INFO? — a drafter cannot
// search the store, so this file is the only way it can name a companion that actually exists.
const fs = require('fs');
const C = 'c:/Users/Fuad/Documents/GitHub/fuad.au/canvas/';
const D = 'c:/Users/Fuad/Documents/GitHub/.dtmp/tourwave29/';
function load(f, k) { global.window = {}; eval(fs.readFileSync(C + f, 'utf8')); return window[k]; }
const A = load('artworks.js', 'CANVAS_ARTWORKS');
const I = load('art_inspect.js', 'CANVAS_INSPECT');
const AB = load('art-about.js', 'CANVAS_ART_ABOUT');
const M = load('museums.js', 'CANVAS_MUSEUMS');
const HO = load('art_holders.js', 'CANVAS_HOLDERS');
const mus = Object.fromEntries((M || []).map(m => [m.id, m.name]));
const musByQid = Object.fromEntries((M || []).filter(m => m.qid).map(m => [m.qid, m.name]));
const lines = A.map(w => {
  // Same dead fallback as build-beside-candidates.js had: art_holders.js exports
  // `{works: {id -> qid}, places: {qid -> {...}}}`, so `HO[w.id]` was always undefined and this
  // column was purely seenAt — WHERE FUAD STOOD, not who holds the work. A drafter naming a
  // companion's museum needs the HOLDER, so prefer it and fall back to the venue.
  const venue = Array.isArray(w.seenAt) ? w.seenAt[0] : w.seenAt;
  const q = (HO && HO.works) ? HO.works[w.id] : null;
  const holder = q ? (musByQid[q] || ((HO.places && HO.places[q]) ? (HO.places[q].name || HO.places[q].label || '') : '')) : '';
  const where = holder || mus[venue] || venue || '';
  return [w.id, w.artist || '', w.title || '', w.year || '', where, I[w.id] ? 'TOURED' : '', AB[w.id] ? 'INFO' : ''].join(' | ');
});
fs.writeFileSync(D + 'CORPUS_INDEX.txt', lines.sort().join('\n'));
console.log('wrote', lines.length, 'rows;', Object.keys(I).length, 'toured;', Object.keys(AB).length, 'with Info');
