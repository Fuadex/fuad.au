// tokdiff.js — do bandgate and stopvar count the same words?
//
// WHY. The Podkowinski agent pointed out that the stop list I quoted it,
// [192,111,130,129,145,129,157,210], has a standard median of 137.5, while tonegate reported 143.
// Either the medians are computed differently, or the two gates tokenise differently — and I have
// been quoting stopvar's arrays to agents while bandgate is the DESIGNATED counter. If they
// disagree, every number I passed is suspect.
//
// This lifts each gate's own tokeniser at runtime rather than reimplementing either, for the same
// reason count-reads.js does: a second implementation is a second place for the same bug.
const fs = require('fs');
const C = 'C:/Users/Fuad/Documents/GitHub/fuad.au/canvas/';

// The two gates declare their counters differently, so each is matched on its own declaration.
// Neither is reimplemented here.
function lift(file, re, strip) {
  const src = fs.readFileSync(C + file, 'utf8');
  const m = src.match(re);
  if (!m) { console.log('could not lift a tokeniser out of ' + file + ' — not substituting one'); return null; }
  const body = m[0].replace(strip, '').replace(/;$/, '');
  return { fn: eval('(' + body + ')'), src: m[0] };
}

const bg = lift('bandgate.js', /const words\s*=\s*\(s\)\s*=>[\s\S]*?\.filter\(Boolean\)\.length;/, /^const words\s*=\s*/);
const sv = lift('stopvar.js', /const wc\s*=\s*s\s*=>[^\n]*?\.filter\(Boolean\)\.length;/, /^const wc\s*=\s*/);
if (!bg || !sv) process.exit(2);

console.log('bandgate tokeniser:\n  ' + bg.src.replace(/\n/g, '\n  '));
console.log('\nstopvar tokeniser:\n  ' + sv.src.replace(/\n/g, '\n  '));
console.log('\nIDENTICAL SOURCE: ' + (bg.src === sv.src ? 'YES' : 'NO'));

// Two medians, because tonegate does NOT use the standard one: medianRating() takes
// s[Math.floor(s.length/2)], which for an even stop count is the UPPER of the two middle values.
// That is stricter than the statistic, and it is what the "median <=135" rule actually enforces.
const medianStd = (a) => {
  const s = [...a].sort((x, y) => x - y);
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
};
const medianTonegate = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};
const median = medianTonegate;

const files = fs.readdirSync('.').filter(f => /^out_tour_.*\.json$/.test(f)).sort();
let anyDiff = false;
console.log('\nper-stop counts, bandgate vs stopvar:');
for (const f of files) {
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  const id = f.replace(/^out_tour_/, '').replace(/\.json$/, '');
  const b = j.deeper.map(d => bg.fn(d.body));
  const s = j.deeper.map(d => sv.fn(d.body));
  const diff = b.some((v, i) => v !== s[i]);
  if (diff) anyDiff = true;
  console.log('  ' + (diff ? 'DIFF ' : '  =  ') + id.slice(0, 44).padEnd(45) +
              'bg med(tone) ' + String(medianTonegate(b)).padStart(5) + ' std ' + String(medianStd(b)).padStart(6) +
              '  |  sv med(tone) ' + String(medianTonegate(s)).padStart(5) + ' std ' + String(medianStd(s)).padStart(6));
  if (diff) {
    console.log('        bandgate [' + b.join(',') + ']');
    console.log('        stopvar  [' + s.join(',') + ']');
  }
}
console.log('\nany per-stop disagreement: ' + (anyDiff ? 'YES' : 'NO'));
