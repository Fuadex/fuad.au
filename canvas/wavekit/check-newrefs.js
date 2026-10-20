// check-newrefs.js — the refs gate for a wave of NEW entries.
//
// WHY THIS EXISTS. `validate-refs.js` has two modes and neither covers this case. Bare, it walks the
// SHIPPED stores, so it cannot see a wave that has not merged. In plan mode it merges each patch onto
// the LIVE entry and reports BAD ID when there is none — correct for a backfill, useless for an
// insertion, and it returned "no such entry in the live store" for 9 of our 10 rows.
//
// ⛔ AND IT FAILS OPEN. A plan shaped { <id>: … } instead of { tours: { <id>: … } } makes it iterate
// `plan.tours` === undefined, check nothing, and print OK. That is the exact failure `check-besides.js`
// was repaired for in wave 11 — a gate that cannot find its input must SAY SO, never pass. This script
// therefore asserts it found work to do and exits non-zero if it did not.
const fs = require('fs');
const C = 'c:/Users/Fuad/Documents/GitHub/fuad.au/canvas/';
function load(f, k) { global.window = {}; eval(fs.readFileSync(C + f, 'utf8')); return window[k]; }
const CANON = new Set(load('artworks.js', 'CANVAS_ARTWORKS').map(w => w.id));
const plan = JSON.parse(fs.readFileSync('plan_wave13.json', 'utf8'));
const problems = []; let seen = 0, paras = 0;
const walk = (where, ownerId, para, refs) => {
  if (!refs || !refs.length) return;
  paras++;
  for (const r of refs) {
    seen++;
    if (!r || typeof r.id !== 'string' || typeof r.text !== 'string') { problems.push(['SHAPE', where, JSON.stringify(r)]); continue; }
    if (!CANON.has(r.id)) problems.push(['BAD ID', where, r.id + ' is not a canon id']);
    if (r.id === ownerId) problems.push(['SELF', where, r.id]);
    // literal indexOf, never a built regex: these paragraphs carry em dashes, accents and parentheses
    let n = 0, i = 0; while ((i = para.indexOf(r.text, i)) !== -1) { n++; i += r.text.length; }
    if (n === 0) problems.push(['NOT FOUND', where, '"' + r.text + '" does not occur in the paragraph']);
    if (n > 1) problems.push(['AMBIGUOUS', where, '"' + r.text + '" occurs ' + n + ' times']);
  }
};
for (const [id, e] of Object.entries(plan.tours || {})) {
  if (e.refs) walk(id + ' beside', id, e.beside || '', e.refs);           // bare array -> entry default = beside
  if (e.refs && !Array.isArray(e.refs)) for (const [f, rr] of Object.entries(e.refs)) walk(id + ' ' + f, id, e[f] || '', rr);
  (e.deeper || []).forEach((s, i) => walk(id + ' deeper[' + i + ']', id, s.body || '', s.refs));
}
for (const [id, e] of Object.entries(plan.reads || {})) {
  if (Array.isArray(e.refs)) walk(id + ' about', id, e.about || '', e.refs);
  else if (e.refs) for (const [f, rr] of Object.entries(e.refs)) walk(id + ' ' + f, id, e[f] || '', rr);
}
console.log('canon ' + CANON.size + ' · paragraphs carrying refs ' + paras + ' · refs checked ' + seen);
if (!seen) { console.log('REFUSING TO PASS: found no refs to check — wrong plan shape or empty plan'); process.exit(2); }
if (!problems.length) { console.log('OK — every ref resolves to a canon id, is not a self-reference, and occurs exactly once'); process.exit(0); }
for (const p of problems) console.log('  ' + p[0] + '  ' + p[1] + '\n     ' + p[2]);
console.log('\nFAILED: ' + problems.length); process.exit(1);
