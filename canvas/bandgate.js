// bandgate.js — the length/geometry gate for a drafted wave. Run: node bandgate.js <workshop-dir>
//
// WHY THIS EXISTS AS A FILE. The word count has now been got wrong twice by writing it ad hoc:
// a naive whitespace split counts a SPACED EM DASH as a word and splits HYPHENATED COMPOUNDS in
// two, which over-counts a 150-word stop by 2-4 and a whole tour by 8-13. In wave 7 that sent
// agents to trim paragraphs already in band; in wave 8 it flagged a tour whose author had counted
// correctly. Count the way a reader counts, from one place, or the gate produces false work.
//
// Also checks what agents cannot check for themselves: nearly every drafting agent runs without a
// shell, so their counts are hand-tallied and their boxes unverified. This is the only real check.
const fs = require('fs');
const DIR = (process.argv[2] || '.').replace(/\\/g, '/').replace(/\/?$/, '/');

const words = (s) => String(s || '')
  .toLowerCase()
  .replace(/[–—]/g, ' ')                 // em/en dashes separate, they are not words
  .replace(/[^a-z0-9\s'’-]/g, ' ')       // keep the hyphen: "fifty-nine" is ONE word
  .split(/\s+/)
  .map((w) => w.replace(/^['’-]+|['’-]+$/g, ''))
  .filter(Boolean).length;

const LENS = ['see', 'about', 'craft', 'context'];
const files = fs.readdirSync(DIR).filter((f) => /^out_tour_.*\.json$/.test(f)).sort();
if (!files.length) { console.log('no out_tour_*.json in ' + DIR); process.exit(1); }

let clean = 0, flagged = 0;
const spreads = [], stopCounts = [];
for (const f of files) {
  const id = f.replace('out_tour_', '').replace('.json', '');
  let t;
  try { t = JSON.parse(fs.readFileSync(DIR + f, 'utf8').replace(/^﻿/, '')); }
  catch (e) { console.log('  JSON FAIL  ' + id + ': ' + e.message.slice(0, 70)); flagged++; continue; }

  const problems = [];
  const lens = LENS.map((k) => words(t[k]));
  LENS.forEach((k, i) => {
    if (!t[k]) problems.push('missing ' + k);
    else if (lens[i] > 170) problems.push(k + ' ' + lens[i] + 'w >170');
  });
  const st = (t.deeper || []).map((d) => words(d.body));
  if (!st.length) problems.push('no stops');
  st.forEach((n, i) => { if (n < 80 || n > 200) problems.push('stop' + (i + 1) + ' ' + n + 'w'); });
  const spread = st.length ? Math.max(...st) - Math.min(...st) : 0;
  if (st.length && spread < 50) problems.push('spread ' + spread);
  for (const [i, d] of (t.deeper || []).entries()) {
    if (!(d.w > 0) || !(d.h > 0)) problems.push('stop' + (i + 1) + ' zero-area');
    else if (d.x < -0.001 || d.y < -0.001 || d.x + d.w > 1.002 || d.y + d.h > 1.002)
      problems.push('stop' + (i + 1) + ' box out of frame');
  }
  // a stop box that is the whole picture makes the zoom do nothing
  for (const [i, d] of (t.deeper || []).entries())
    if (d.w * d.h > 0.90) problems.push('stop' + (i + 1) + ' is the whole plate');

  spreads.push(spread); stopCounts.push(st.length);
  if (problems.length) { flagged++; console.log('  FLAG  ' + id.slice(0, 46).padEnd(47) + problems.join(', ')); }
  else { clean++; console.log('  ok    ' + id.slice(0, 46).padEnd(47) + st.length + ' stops, spread ' + spread); }
}
const mean = (a) => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1);
console.log('\n' + clean + ' clean | ' + flagged + ' flagged   of ' + files.length);
console.log('mean spread ' + mean(spreads) + ' | mean stops/tour ' + mean(stopCounts) +
            ' | stop-count range ' + Math.min(...stopCounts) + '-' + Math.max(...stopCounts));
