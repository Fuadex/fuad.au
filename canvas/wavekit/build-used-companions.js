// build-used-companions.js — rebuild USED_COMPANIONS.txt (every companion a shipped `beside` already points at) from
// art_inspect.js refs. Run inside the workshop: `node build-used-companions.js` → ./USED_COMPANIONS.txt (wave 41).
const fs = require('fs'); const C = 'c:/Users/Fuad/Documents/GitHub/fuad.au/canvas/';
global.window = {}; eval(fs.readFileSync(C + 'art_inspect.js', 'utf8'));
const A = window[Object.keys(window)[0]]; const m = {};
for (const [id, e] of Object.entries(A)) for (const r of ((e && Array.isArray(e.refs) && e.refs) || [])) { const k = typeof r === 'string' ? r : (r.id || r.ref); if (k) (m[k] = m[k] || []).push(id); }
const rows = Object.entries(m).sort((a, b) => b[1].length - a[1].length);
fs.writeFileSync('USED_COMPANIONS.txt', '# companion id\ttimes used\tby (store beside refs) — rebuilt 2026-11-11 at seeding\n' + rows.map(([k, v]) => k + '\t' + v.length + '\t' + v.join(',')).join('\n') + '\n');
console.log(Object.keys(window), rows.length, 'companions');
