// flagscan.js — HEDGE-INTEGRITY scan (added 2026-09-03 after the wave-6 seal found three
// captions asserting flat what their own flags called unproven).
// For each work: take the distinctive content words out of every flags[] entry, then look for
// sentences in ANY layer (tour lenses/stops, interp, fused, beside) that carry 2+ of those words
// with NO hedge marker nearby. Those are candidates — a human rules; the script only surfaces.
const fs = require('fs');
// Usage: node <script> <workshop-dir>   (defaults to this directory)
const WORKDIR = (process.argv[2] || __dirname).replace(/\\/g, '/').replace(/\/?$/, '/');
const D = WORKDIR;
const STOP = new Set(('the a an and or of in on at to for from with by is are was were be been it its this that these those ' +
  'as but not no if then than so such which who whom whose what when where how why can could may might will would shall should ' +
  'i you he she they we them him her his hers their our your my me us do does did done have has had having more most less least ' +
  'very much many few some any all both each other another same different one two three read reads reading text stop flag ' +
  'tour prose claim asserted assert asserts asserting uncertain unverified unconfirmed possible possibly cannot could not').split(/\s+/));
const HEDGE = /\b(may|might|could|appears?|seems?|reads? as|probably|possibly|likely|perhaps|apparently|what reads|if that is|unconfirmed|unverified|uncertain|not confirmed|hard to|difficult to|cannot be|suggests?|presumably|thought to|reported)\b/i;
const words = s => (s.toLowerCase().match(/[a-z][a-z'-]{4,}/g) || []).filter(w => !STOP.has(w));
const sentences = s => (s || '').split(/(?<=[.;:])\s+/).filter(x => x.trim().length > 25);
let total = 0;
for (const fn of fs.readdirSync(D).filter(f => f.startsWith('out_tour_'))) {
  const id = fn.replace('out_tour_', '').replace('.json', '');
  const t = JSON.parse(fs.readFileSync(D + fn, 'utf8').replace(/^﻿/, ''));
  const flags = t.flags || [];
  if (!flags.length) { console.log('· ' + id + '  — NO FLAGS (every other work has some; is that honest?)'); continue; }
  // layers to scan
  const layers = [];
  for (const k of ['see', 'about', 'craft', 'context']) layers.push([k, t[k]]);
  for (const [i, d] of (t.deeper || []).entries()) layers.push(['stop' + (i + 1), d.body]);
  for (const [tag, file] of [['interp', 'interp_'], ['fused', 'fused_'], ['beside', 'beside_']]) {
    const p = D + file + id + '.json';
    if (!fs.existsSync(p)) continue;
    const o = JSON.parse(fs.readFileSync(p, 'utf8').replace(/^﻿/, ''));
    layers.push([tag, o.deep || o.info || o.beside]);
  }
  // Only DOUBT-BEARING flags are hedges. Many flags are provenance notes ("VERIFIED in hook",
  // "reviewer should web-confirm") — those license the prose rather than qualifying it, and
  // scanning them buried the real hits 40-to-1 on first run (wave 6).
  const DOUBT = /\b(may|might|could|uncertain|unverified|unconfirmed|not confirmed|cannot|can't|ambiguous|inference|inferred|guess|estimated|unresolved|possibly|plausibl|assumed|assumption|hedg|not legibly|too (small|dark|compact)|illegible|read as|reading|over-read|unsure)\b/i;
  const VERIFIED_ONLY = /^\s*(VERIFIED|CONFIRMED)\b/i;
  const hits = [];
  for (const fl of flags) {
    if (!DOUBT.test(fl) || VERIFIED_ONLY.test(fl)) continue;
    const key = [...new Set(words(fl))];
    if (key.length < 2) continue;
    for (const [lname, text] of layers) {
      for (const s of sentences(text)) {
        const shared = key.filter(w => s.toLowerCase().includes(w));
        if (shared.length >= 2 && !HEDGE.test(s))
          hits.push('    [' + lname + '] ' + s.trim().slice(0, 150) + (s.length > 150 ? '…' : '') +
            '\n      ↳ flag terms present: ' + shared.slice(0, 6).join(', ') +
            '\n      ↳ flag: ' + fl.slice(0, 110) + (fl.length > 110 ? '…' : ''));
      }
    }
  }
  if (hits.length) {
    total += hits.length;
    console.log('FLAG-vs-PROSE  ' + id + '  (' + hits.length + ' candidate' + (hits.length > 1 ? 's' : '') + ')');
    console.log(hits.slice(0, 6).join('\n'));
    if (hits.length > 6) console.log('    … ' + (hits.length - 6) + ' more');
  } else console.log('ok  ' + id + ' — no unhedged sentence matches a flag');
}
console.log('\n' + total + ' candidate(s) for the sealer to rule on (heuristic — false positives expected)');
