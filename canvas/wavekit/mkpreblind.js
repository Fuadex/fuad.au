// mkpreblind.js (was mkpreblindNN.js; set D to the workshop) — phase 1 works BLIND: preblind_<id>.json = pre_<id>.json minus every shipped text (existingInfo,
// existingDeep) and minus the note's sentence about the shipped Info. Asserts no shipped string survives.
const fs = require('fs');
const D = 'C:/Users/Fuad/Documents/GitHub/.dtmp/tourwave41/';
const ids = JSON.parse(fs.readFileSync(D + 'ids.json', 'utf8'));
for (const id of ids) {
  const p = JSON.parse(fs.readFileSync(D + 'pre_' + id + '.json', 'utf8'));
  const shipped = [p.existingInfo, p.existingDeep].filter(Boolean);
  const b = {};
  for (const [k, v] of Object.entries(p)) if (k !== 'existingInfo' && k !== 'existingDeep') b[k] = v;
  b.note = 'The identity block names the plate source: THIS object (that museum, that page) is the one under discussion — never a sister version. Boxes are fractions of the plate at `image`, which is the same object the site zooms.';
  const out = JSON.stringify(b, null, 1);
  for (const s of shipped) if (out.includes(String(s).slice(0, 40))) throw new Error('shipped text leaked: ' + id);
  if (/existingInfo|existingDeep|An Info already ships/.test(out)) throw new Error('shipped marker leaked: ' + id);
  fs.writeFileSync(D + 'preblind_' + id + '.json', out);
}
console.log('wrote', ids.length, 'preblind files');
