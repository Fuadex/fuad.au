// count-reads.js — counts the reads layer with bandgate.js's OWN tokeniser, so that the numbers in
// the print are produced by the designated counter and not by a second, differing one. The whole
// reason bandgate exists as a file is that counting ad hoc has been got wrong three times.
const fs = require('fs');
const src = fs.readFileSync('c:/Users/Fuad/Documents/GitHub/fuad.au/canvas/bandgate.js', 'utf8');
const m = src.match(/const words = \(s\) =>[\s\S]*?\.filter\(Boolean\)\.length;/);
if (!m) throw new Error('could not lift the tokeniser out of bandgate.js — do not substitute one');
const words = eval('(' + m[0].replace(/^const words = /, '').replace(/;$/, '') + ')');
const ids = JSON.parse(fs.readFileSync('ids.json', 'utf8'));
const B = { interp: [95, 115], info: [32, 38], beside: [70, 130] };
let bad = 0;
for (const id of ids) {
  const row = { id };
  for (const k of ['interp', 'info']) {
    const f = `${k}_${id}.md`;
    row[k] = fs.existsSync(f) ? words(fs.readFileSync(f, 'utf8').trim()) : null;
  }
  const bf = `beside_${id}.json`;
  if (fs.existsSync(bf)) {
    const j = JSON.parse(fs.readFileSync(bf, 'utf8'));
    row.beside = j.beside === null ? 'OMITTED' : words(j.beside);
  } else row.beside = null;
  const flag = (k) => {
    const v = row[k];
    if (v === null) return '   —   ';
    if (v === 'OMITTED') return ' OMIT  ';
    const [lo, hi] = B[k];
    const ok = v >= lo && v <= hi;
    if (!ok) bad++;
    return String(v).padStart(4) + (ok ? '   ' : ' !!');
  };
  console.log(`${flag('interp')} ${flag('info')} ${flag('beside')}  ${id}`);
}
console.log(`\nbands: interp ${B.interp.join('-')} (target) | info ${B.info.join('-')} (CONSTRAINT) | beside ${B.beside.join('-')} (soft)`);
console.log(bad ? `${bad} value(s) outside band — marked !!` : 'all present values inside band');
