// coverage.js — the descent coverage guard.
//
// ⛔ READ THIS BEFORE READING THE OUTPUT. This is NOT a pass/fail gate. STUDY_SPEC is explicit:
// it is "rare-firing by design — an outlier detector, not a sizing rule", and ~1.14 is a ceiling
// that a meaningful slice of the corpus is EXPECTED to exceed (71 of 375 tours at the 2026-08-25
// calibration, ~19%). A tour over the line is "an outlier to look at, not a routine sizing
// failure". Reporting "N over" as if it were a failure count is the error this header exists to
// stop, and I made it once already.
//
// The rule: sum w*h across the DESCENT, counted WITH overlaps. Over ~1.14, the tour may be
// re-covering ground rather than deepening, and the remedy is to MERGE stops.
//
// The exemption: a full-frame box is an approved device (bandgate treats area > 0.90 specially
// rather than condemning it), so this reports coverage both ways — raw, and with any full-frame
// box excluded — because a tour whose only excess is one deliberate whole-plate stop is not
// re-covering anything.
//
// The spec's own corpus figures are dated and carry "this ages; re-measure, don't cite", so
// --store measures the live base rate instead of quoting them.
//
// Run: node coverage.js <workshop-dir>
//      node coverage.js --store        (measures the live store to get the current base rate)
const fs = require('fs');
const path = require('path');

const LIMIT = 1.14;
const FULL_FRAME = 0.90;
const arg = process.argv[2];
if (!arg) { console.log('usage: node coverage.js <workshop-dir> | --store'); process.exit(2); }

function coverageOf(stops) {
  let raw = 0, exFull = 0, boxes = 0, bad = 0, full = 0;
  for (const s of stops) {
    const w = Number(s.w), h = Number(s.h);
    if (!isFinite(w) || !isFinite(h)) { bad++; continue; }
    const a = w * h;
    raw += a;
    if (a > FULL_FRAME) full++; else exFull += a;
    boxes++;
  }
  return { raw, exFull, boxes, bad, full };
}

const rows = [];

if (arg === '--store') {
  const src = fs.readFileSync('C:/Users/Fuad/Documents/GitHub/fuad.au/canvas/art_inspect.js', 'utf8');
  // The store is a JS object literal with a mix of quoted and unquoted keys, so it is evaluated,
  // not JSON.parsed — the same reason the wave-12 merge had to eval its existing entry.
  const open = src.indexOf('{', src.indexOf('window.CANVAS_INSPECT'));
  const store = eval('(' + src.slice(open, src.lastIndexOf('}') + 1) + ')');
  for (const id of Object.keys(store)) {
    const d = store[id] && store[id].deeper;
    if (!Array.isArray(d) || !d.length) continue;
    const c = coverageOf(d);
    if (c.boxes) rows.push(Object.assign({ id }, c));
  }
} else {
  const files = fs.readdirSync(arg).filter(f => /^out_tour_.*\.json$/.test(f)).sort();
  if (!files.length) { console.log('REFUSING TO PASS: no out_tour_*.json in ' + arg); process.exit(2); }
  for (const f of files) {
    const j = JSON.parse(fs.readFileSync(path.join(arg, f), 'utf8'));
    const id = f.replace(/^out_tour_/, '').replace(/\.json$/, '');
    if (!Array.isArray(j.deeper)) { console.log('  ?? ' + id + ' — no `deeper` array'); continue; }
    const c = coverageOf(j.deeper);
    if (c.boxes) rows.push(Object.assign({ id }, c));
  }
}

if (!rows.length) { console.log('REFUSING TO PASS: parsed no tours — do not read this as a pass'); process.exit(2); }

const overRaw = rows.filter(r => r.raw > LIMIT).length;
const overEx = rows.filter(r => r.exFull > LIMIT).length;
const pct = (n) => (100 * n / rows.length).toFixed(1) + '%';

if (arg === '--store') {
  const sorted = rows.map(r => r.raw).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  console.log('LIVE STORE base rate, measured now, ' + rows.length + ' tours with a descent');
  console.log('  median coverage        ' + median.toFixed(4));
  console.log('  over ' + LIMIT + ' raw          ' + overRaw + '  (' + pct(overRaw) + ')');
  console.log('  over ' + LIMIT + ' ex-full-frame ' + overEx + '  (' + pct(overEx) + ')');
  console.log('  tours with a full-frame box: ' + rows.filter(r => r.full).length);
} else {
  rows.sort((a, b) => b.raw - a.raw);
  for (const r of rows) {
    console.log(
      (r.raw > LIMIT ? '  over ' : '  .    ') +
      r.id.slice(0, 46).padEnd(47) +
      'raw ' + r.raw.toFixed(3) +
      '   ex-full ' + r.exFull.toFixed(3) +
      '   ' + r.boxes + ' boxes' +
      (r.full ? '  (' + r.full + ' full-frame)' : '') +
      (r.bad ? '  (' + r.bad + ' unreadable)' : '')
    );
  }
  console.log('\n' + overRaw + ' of ' + rows.length + ' over ' + LIMIT + ' raw (' + pct(overRaw) + '), ' +
              overEx + ' ex-full-frame (' + pct(overEx) + ')');
  console.log('⚠ Compare against the live-store base rate before calling any of these a defect:');
  console.log('  node coverage.js --store');
}
