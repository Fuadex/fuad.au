// stopvar.js — WAVE-5 PILOT instrument: proportion gate (report-only; orchestrator rules).
// Flags per tour: (a) stop-length CV < 0.07 (metronome), (b) max-min stop spread < 40w,
// (c) any lens > 120w without a flags justification mentioning it, (d) lens total > 460w.
// Touchstone calibration: Parasol CV .08 spread 32 / Convent CV .11 spread 57 / Szał CV .08 spread 28.
const fs = require('fs');
// Usage: node <script> <workshop-dir>   (defaults to this directory)
const WORKDIR = (process.argv[2] || __dirname).replace(/\\/g, '/').replace(/\/?$/, '/');
const wc = s => (s || '').trim().split(/\s+/).filter(Boolean).length;
const files = fs.readdirSync(WORKDIR).filter(f => f.startsWith('out_tour_'));
let flagged = 0;
for (const fn of files) {
  const t = JSON.parse(fs.readFileSync(WORKDIR + fn, 'utf8'));
  const stops = (t.deeper || []).map(d => wc(d.body));
  const mean = stops.reduce((a, b) => a + b, 0) / stops.length;
  const sd = Math.sqrt(stops.reduce((a, b) => a + (b - mean) ** 2, 0) / stops.length);
  const cvv = sd / mean;
  const spread = Math.max(...stops) - Math.min(...stops);
  const lens = { see: wc(t.see), about: wc(t.about), craft: wc(t.craft), context: wc(t.context) };
  const lensTotal = Object.values(lens).reduce((a, b) => a + b, 0);
  const flagsText = JSON.stringify(t.flags || []);
  const problems = [];
  if (cvv < 0.07) problems.push('METRONOME cv' + cvv.toFixed(2));
  if (spread < 40) problems.push('SPREAD ' + spread + 'w (<40)');
  for (const [k, v] of Object.entries(lens))
    if (v > 120 && !flagsText.toLowerCase().includes(k)) problems.push('LENS ' + k + ' ' + v + 'w UNJUSTIFIED');
  if (lensTotal > 460) problems.push('LENS-TOTAL ' + lensTotal + 'w (>460)');
  const line = fn.replace('out_tour_', '').replace('.json', '').slice(0, 40).padEnd(41) +
    stops.length + 'st [' + stops.join(',') + '] cv' + cvv.toFixed(2) + ' spread' + spread +
    ' | lens ' + Object.values(lens).join('/') + ' =' + lensTotal;
  if (problems.length) { flagged++; console.log('FLAG ' + line + '\n     >> ' + problems.join(' ; ')); }
  else console.log('ok   ' + line);
}
console.log('\n' + (files.length - flagged) + '/' + files.length + ' pass proportion gate');
