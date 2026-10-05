#!/usr/bin/env node
/* corpus-health.js — per-wave drift stats over the tour + Info corpus (Fuad 2026-10-06: "just for
 * stats probably worth doing to see drift"). Read-only; prints one table, no store is touched.
 * Run after every wave merge and diff the numbers against the last run (the wave print carries both).
 *
 *   node corpus-health.js            # whole corpus + per-era breakdown
 *
 * Columns per era (mv):  n        tours in that era
 *   beside%   tours carrying the closing beside paragraph
 *   refs%     tours carrying cross-references
 *   year%     contexts with at least one dated year (the 09-26 context role check, as a number)
 *   voice%    contexts with an artist-voice verb (wrote/said/letter/diary/recalled/told/「)
 *   lab       tours with pipeline vocabulary in reader text (09-26 measurement quarantine)
 *   stops~    median stops per tour
 * Info rows: label = label-citation phrasings (the 08-15 voice lesson); deep% = Infos with deeps.
 */
const fs = require('fs');
const C = __dirname + '/';
const load = f => { const w = {}; new Function('window', fs.readFileSync(C + f, 'utf8'))(w); return Object.values(w)[0]; };
const I = load('art_inspect.js');
const AB = load('art-about.js');
const LAB = /\b(pixels?|sampled|a lightness scale|median colou?r|evenly spaced|threshold of|rgb|hex value)\b/i;
const VOICE = /(wrote|letter|diary|said|told|recalled|「)/;
const LABEL = /\b(accession|inventory number|raisonn|its catalogue|the catalogue (entry|notes)|the museum('s)? (file|record|label) (calls|says|notes))\b/i;
const eras = {};
for (const [id, t] of Object.entries(I)) {
  const mv = String(t.mv || '?');
  const e = eras[mv] = eras[mv] || { n: 0, beside: 0, refs: 0, year: 0, voice: 0, lab: 0, stops: [] };
  e.n++;
  if (t.beside) e.beside++;
  if (t.refs && t.refs.length) e.refs++;
  if (t.context && /\b1[5-9]\d\d\b/.test(t.context)) e.year++;
  if (t.context && VOICE.test(t.context)) e.voice++;
  const all = [t.see, t.about, t.craft, t.context, t.beside, ...(t.deeper || []).map(s => s.body)].filter(Boolean).join(' ');
  if (LAB.test(all)) e.lab++;
  e.stops.push((t.deeper || []).length);
}
const pc = (a, b) => b ? Math.round(100 * a / b) + '%' : '-';
const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
console.log('TOURS — era    n   beside  refs  year  voice  lab  stops~');
const order = Object.keys(eras).sort((a, b) => parseFloat(a) - parseFloat(b));
let T = { n: 0, beside: 0, refs: 0, year: 0, voice: 0, lab: 0, stops: [] };
for (const mv of order) {
  const e = eras[mv];
  console.log('  mv ' + mv.padEnd(6), String(e.n).padStart(4), pc(e.beside, e.n).padStart(7), pc(e.refs, e.n).padStart(5), pc(e.year, e.n).padStart(5), pc(e.voice, e.n).padStart(6), String(e.lab).padStart(4), String(med(e.stops)).padStart(6));
  for (const k of ['n', 'beside', 'refs', 'year', 'voice', 'lab']) T[k] += e[k];
  T.stops.push(...e.stops);
}
console.log('  ALL   ', String(T.n).padStart(5), pc(T.beside, T.n).padStart(7), pc(T.refs, T.n).padStart(5), pc(T.year, T.n).padStart(5), pc(T.voice, T.n).padStart(6), String(T.lab).padStart(4), String(med(T.stops)).padStart(6));
let infoN = 0, deepN = 0, labelN = 0; const labelIds = [];
for (const [id, e] of Object.entries(AB)) {
  infoN++; if (e.deep) deepN++;
  if (LABEL.test([e.about, e.deep].filter(Boolean).join(' '))) { labelN++; labelIds.push(id); }
}
console.log('\nINFOS', infoN, '| deep%', pc(deepN, infoN), '| label-citation hits', labelN, labelN ? '→ ' + labelIds.slice(0, 6).join(' ') : '');
console.log('\n(diff these numbers against the previous run in the wave print; a moving era row = drift)');
