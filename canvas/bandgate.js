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
  // A stop may legitimately carry NO box. canvas-app.jsx gives such a chapter `anchor: null`:
  // it reads in the Reader but sits out of the zoom tour. That is the right shape for a stop
  // with nothing to point at ("What an eclogue is"). Five shipped stops do this on purpose, so
  // treat an absent box as a choice and only judge boxes that exist.
  const boxed = (d) => ['x', 'y', 'w', 'h'].every((k) => typeof d[k] === 'number' && isFinite(d[k]));
  const anyCoord = (d) => ['x', 'y', 'w', 'h'].some((k) => d[k] !== undefined);
  for (const [i, d] of (t.deeper || []).entries()) {
    if (!boxed(d)) {
      // half a box is a typo, not a device
      if (anyCoord(d)) problems.push('stop' + (i + 1) + ' has a partial box');
      continue;
    }
    if (!(d.w > 0) || !(d.h > 0)) problems.push('stop' + (i + 1) + ' zero-area');
    else if (d.x < -0.001 || d.y < -0.001 || d.x + d.w > 1.002 || d.y + d.h > 1.002)
      problems.push('stop' + (i + 1) + ' box out of frame');
  }
  // A whole-plate box makes the zoom do nothing — UNLESS it is the closing pull-back, where
  // showing the whole picture after a small stop IS the move. 161 shipped tours across every
  // methodology band close exactly this way, so flagging it flatly is a false-positive machine:
  // it condemns an approved device. What actually fails is a whole-plate box the viewer arrives
  // at from another large box, because then nothing visibly happens.
  // ...and the same goes for the whole-plate box. It is inert MID-TOUR, but at either end it is
  // a move: an establishing shot first, a pull-back last. 161 shipped tours close this way and
  // 14 open this way, so flagging area>0.90 flatly condemns an approved device rather than
  // finding a fault. What actually fails is arriving at the whole plate from another big box.
  const D = t.deeper || [];
  const area = (d) => (boxed(d) ? d.w * d.h : null);
  for (const [i, d] of D.entries()) {
    if (!(area(d) > 0.90)) continue;
    if (i === 0) continue;                                   // establishing shot
    const prev = area(D[i - 1]);
    if (i === D.length - 1 && (prev === null || prev < 0.50)) continue;   // pull-back
    problems.push('stop' + (i + 1) + ' is the whole plate' +
      (i === D.length - 1 ? ', arrived at from another big box' : ' mid-tour'));
  }

  spreads.push(spread); stopCounts.push(st.length);
  if (problems.length) { flagged++; console.log('  FLAG  ' + id.slice(0, 46).padEnd(47) + problems.join(', ')); }
  else { clean++; console.log('  ok    ' + id.slice(0, 46).padEnd(47) + st.length + ' stops, spread ' + spread); }
}
const mean = (a) => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1);
console.log('\n' + clean + ' clean | ' + flagged + ' flagged   of ' + files.length);
console.log('mean spread ' + mean(spreads) + ' | mean stops/tour ' + mean(stopCounts) +
            ' | stop-count range ' + Math.min(...stopCounts) + '-' + Math.max(...stopCounts));
