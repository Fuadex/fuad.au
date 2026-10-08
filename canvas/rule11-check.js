// rule11-check.js — STUDY_SPEC rule 11 (Fuad 2026-10-09: "the machinecut fix is approved"): shape variety for a
// beside wave. Reads every beside_<id>.json in the given workshop (ids.json order) and reports: the word spread and
// band (70–130), imperative openers, semicolon-pair closers (at most one paragraph in five), and the pet verbs.
// Usage: node rule11-check.js <workshop-dir>
const fs = require('fs'), path = require('path');
const D = process.argv[2] || __dirname;
const ids = JSON.parse(fs.readFileSync(path.join(D, 'ids.json'), 'utf8'));
const B = {};
for (const id of ids) { const p = path.join(D, 'beside_' + id + '.json'); if (fs.existsSync(p)) { const b = JSON.parse(fs.readFileSync(p, 'utf8').replace(/^﻿/, '')); if (b.beside) B[id] = b.beside; } }
const wc = s => (s.match(/[A-Za-zÀ-ÿ’'-]+/g) || []).length;
const issues = []; const n = Object.keys(B).length;
const ws = Object.values(B).map(wc);
if (n) { const mn = Math.min(...ws), mx = Math.max(...ws); console.log('spread ' + mn + '–' + mx + ' words over ' + n);
  if (n >= 5 && mx - mn < 25) issues.push('word spread only ' + (mx - mn) + ' — aim to spread across 70–130'); }
for (const [id, s] of Object.entries(B)) { const w = wc(s); if (w < 70 || w > 130) issues.push('band: ' + id + ' ' + w + 'w'); }
const imp = Object.keys(B).filter(id => /^(Start|Find|Follow|Look|Measure|Weigh|Go back|Notice|See)\b/.test(B[id].trim()));
if (imp.length) issues.push('imperative opener: ' + imp.join(', '));
const semi = Object.keys(B).filter(id => /;/.test(B[id].trim().split(/(?<=[.!?])\s+/).pop()));
if (n && semi.length > Math.max(1, Math.floor(n / 5))) issues.push('semicolon-pair closers ' + semi.length + '/' + n + ': ' + semi.join(', '));
const pet = Object.keys(B).filter(id => /\b(spend|spends|spent|pay|pays|paid|ration|rationed)\b/i.test(B[id]));
if (pet.length) issues.push('pet verbs: ' + pet.join(', '));
console.log('RULE 11 ISSUES: ' + issues.length); issues.forEach(x => console.log('  ' + x));
