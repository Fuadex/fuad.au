// fixjson.js <final_*.md> <out.json> — repair unescaped inner quotes in an API reply's ```json block: a quote inside a string
// is treated as structural (the string's end) only when followed by optional space and one of : , } ]; otherwise it is escaped.
const fs = require('fs');
const s = fs.readFileSync(process.argv[2], 'utf8');
const a = s.indexOf('```json'), b = s.lastIndexOf('```');
const j = s.slice(a + 7, b).trim();
let out = '', inStr = false;
for (let i = 0; i < j.length; i++) {
  const c = j[i];
  if (c === '\\' && inStr) { out += c + j[i + 1]; i++; continue; }
  if (c === '"') {
    if (!inStr) { inStr = true; out += c; continue; }
    const ahead = j.slice(i + 1, i + 60);
    const structural = /^\s*[:}\]]/.test(ahead) || /^\s*,\s*["{\[\d\-tfn]/.test(ahead);
    if (structural) { inStr = false; out += c; } else out += '\\"';
    continue;
  }
  out += c;
}
const o = JSON.parse(out);
fs.writeFileSync(process.argv[3], JSON.stringify(o, null, 1));
const n = {}; for (const f of o.findings || []) n[f.severity] = (n[f.severity] || 0) + 1;
console.log('repaired:', JSON.stringify(n));
