// gate-quarantine.js — STUDY_SPEC §2026-09-26 rule 2 (measurement quarantine).
// Scans reader-facing prose for pipeline vocabulary and counts measured figures per stop.
// Usage: node gate-quarantine.js <id> [<id> ...]   (reads the live store + any rewrite_<id>.json here)
const fs = require('fs');
const C = 'C:/Users/Fuad/Documents/GitHub/fuad.au/canvas/';
const insp = Object.values((new Function('window', fs.readFileSync(C + 'art_inspect.js', 'utf8') + ';return window;'))({}))[0];
const about = Object.values((new Function('window', fs.readFileSync(C + 'art-about.js', 'utf8') + ';return window;'))({}))[0];
const VOCAB = /\bpixels?\b|\bthresholds?\b|\bsampl(?:e[sd]?|ing)\b|lightness scale|median colou?r|\bnative samples\b|scale of (?:a )?hundred|\bof the \d+ lightest\b|\bluma\b|\bluminance\b|\bchroma\b|\bb\*|\bpercentiles?\b|colou?r-and-tone test/i;
// a "measured figure" = a number tied to measurement phrasing in the same sentence
const MEASURE = /\b(?:measured|averages?|averaging|counted|by one|per cent|percent|\d+%|\d+ of (?:the )?\d+|\bpoints? on\b)\b/i;
let fail = 0;
for (const id of process.argv.slice(2)) {
  const rw = fs.existsSync(__dirname + '/rewrite_' + id + '.json')
    ? JSON.parse(fs.readFileSync(__dirname + '/rewrite_' + id + '.json', 'utf8')).fields : {};
  // wave 17: a NEW tour lives in out_tour_<id>.json (and reads in interp_/info_/beside_ files) — gate those too
  const ot = __dirname + '/out_tour_' + id + '.json';
  const e = fs.existsSync(ot) ? JSON.parse(fs.readFileSync(ot, 'utf8')) : JSON.parse(JSON.stringify(insp[id] || {}));
  for (const [f, k] of [['interp_', 'deep'], ['info_', 'about']]) {
    const fp = __dirname + '/' + f + id + '.md';
    if (fs.existsSync(fp)) { if (k === 'deep') rw.deep = rw.deep || fs.readFileSync(fp, 'utf8').trim(); else rw.info = rw.info || fs.readFileSync(fp, 'utf8').trim(); }
  }
  const bf = __dirname + '/beside_' + id + '.json';
  if (fs.existsSync(bf)) { const b = JSON.parse(fs.readFileSync(bf, 'utf8')); if (b.beside) e.beside = b.beside; }
  const a = JSON.parse(JSON.stringify(about[id] || {}));
  for (const [k, v] of Object.entries(rw)) {
    if (k === 'info') a.about = v;
    else if (k === 'deep') a.deep = v;
    else if (k.startsWith('deeper[')) { const i = +k.match(/\d+/)[0]; if (e.deeper && e.deeper[i]) e.deeper[i].body = v; }
    else e[k] = v;
  }
  const lenses = { see: e.see, about: e.about, craft: e.craft, context: e.context, beside: e.beside, info: a.about, deep: a.deep };
  for (const [k, t] of Object.entries(lenses)) {
    if (!t) continue;
    const hit = t.match(VOCAB);
    if (hit) { console.log(`FAIL ${id} ${k}: vocab "${hit[0]}"`); fail++; }
  }
  (e.deeper || []).forEach((d, i) => {
    const hit = d.body.match(VOCAB);
    if (hit) { console.log(`FAIL ${id} stop[${i}] ${d.t}: vocab "${hit[0]}"`); fail++; }
    const sents = d.body.split(/(?<=[.!?])\s+/).filter(s => MEASURE.test(s) && /\d/.test(s));
    if (sents.length > 1) { console.log(`WARN ${id} stop[${i}] ${d.t}: ${sents.length} measured-figure sentences (quota 1)`); }
  });
}
console.log(fail ? `\n${fail} FAIL(s)` : 'quarantine: CLEAN');
process.exitCode = fail ? 1 : 0;
