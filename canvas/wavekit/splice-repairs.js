// splice29.js — apply fix29 tour/read repairs to the stores, proving every other entry unchanged.
// For each id given: tour_<id>.json (if present) REPLACES the art_inspect entry (same key set required);
// reads_<id>.json (if present) replaces the about/deep VALUES inside the art-about entry (other fields untouched).
// Usage: node splice29.js <id…> [--write]    (without --write: proof only, nothing written)
const fs = require('fs');
const C = 'C:/Users/Fuad/Documents/GitHub/fuad.au/canvas/', W = __dirname + '/';
const IDS = process.argv.slice(2).filter(a => !a.startsWith('--')), WRITE = process.argv.includes('--write');
const lf = f => fs.readFileSync(C + f, 'utf8').replace(/\r\n/g, '\n');   // autocrlf working copies
const load = (src, v) => { global.window = {}; eval(src); return window[v]; };
function span(s, id) {   // the {...} value of key "id" (optionally with a leading space), string-aware brace match
  const ms = [...s.matchAll(new RegExp('\\n([ \\t]*)"' + id + '":', 'g'))];   // any line-start indent
  if (ms.length !== 1) throw new Error('key not exactly once (' + ms.length + '): ' + id);
  const i = ms[0].index, ind = ms[0][1];
  const k = s.indexOf('{', i); let d = 0, q = null, esc = false;
  for (let p = k; p < s.length; p++) {
    const c = s[p];
    if (q) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === '`') q = c; else if (c === '{') d++; else if (c === '}') { if (--d === 0) return { k, e: p + 1, ind, one: !s.slice(k, p + 1).includes('\n') }; }
  }
  throw new Error('unbalanced: ' + id);
}
let sI = lf('art_inspect.js'), sA = lf('art-about.js');
const BI = load(sI, 'CANVAS_INSPECT'), BA = load(sA, 'CANVAS_ART_ABOUT');
const want = { I: [], A: [] };
for (const id of IDS) {
  if (fs.existsSync(W + 'tour_' + id + '.json')) {
    const nw = JSON.parse(fs.readFileSync(W + 'tour_' + id + '.json', 'utf8'));
    if (JSON.stringify(Object.keys(BI[id]).sort()) !== JSON.stringify(Object.keys(nw).sort())) throw new Error('tour keys differ: ' + id);
    if (nw.deeper.length !== BI[id].deeper.length) throw new Error('stop count differs: ' + id);
    const { k, e, ind, one } = span(sI, id);   // keep the entry's layout: compact one-liner or indented multi-line
    const body = one ? JSON.stringify(nw) : JSON.stringify(nw, null, 1).split('\n').join('\n' + ind);
    sI = sI.slice(0, k) + body + sI.slice(e); want.I.push(id);
  }
  if (fs.existsSync(W + 'reads_' + id + '.json')) {
    const nw = JSON.parse(fs.readFileSync(W + 'reads_' + id + '.json', 'utf8'));
    const { k, e } = span(sA, id); let ent = sA.slice(k, e);
    for (const f of ['about', 'deep']) {
      if (nw[f] === undefined || nw[f] === BA[id][f]) continue;
      const old = JSON.stringify(BA[id][f]);
      if (ent.split(old).length !== 2) throw new Error(f + ' value not exactly once in entry: ' + id);
      ent = ent.split(old).join(JSON.stringify(nw[f]));
    }
    sA = sA.slice(0, k) + ent + sA.slice(e); want.A.push(id);
  }
}
const AI = load(sI, 'CANVAS_INSPECT'), AA = load(sA, 'CANVAS_ART_ABOUT');
const diff = (X, Y) => Object.keys(Y).filter(x => JSON.stringify(X[x]) !== JSON.stringify(Y[x]));
const cI = diff(BI, AI), cA = diff(BA, AA);
if (Object.keys(AI).length !== Object.keys(BI).length || Object.keys(AA).length !== Object.keys(BA).length) throw new Error('entry count changed');
if (cI.some(x => !want.I.includes(x)) || cA.some(x => !want.A.includes(x))) throw new Error('unrelated entry changed: ' + cI.concat(cA));
for (const id of want.I) { const n = JSON.parse(fs.readFileSync(W + 'tour_' + id + '.json', 'utf8')); if (JSON.stringify(AI[id]) !== JSON.stringify(n)) throw new Error('tour not as written: ' + id); }
for (const id of want.A) { const n = JSON.parse(fs.readFileSync(W + 'reads_' + id + '.json', 'utf8'));
  for (const f of ['about', 'deep']) if (n[f] !== undefined && AA[id][f] !== n[f]) throw new Error(f + ' not applied: ' + id);
  for (const f of Object.keys(BA[id])) if (!['about', 'deep'].includes(f) && JSON.stringify(AA[id][f]) !== JSON.stringify(BA[id][f])) throw new Error('other read field changed: ' + f); }
console.log('PROOF OK — tours changed: [' + cI + '] reads changed: [' + cA + '] — counts ' + Object.keys(AI).length + ' / ' + Object.keys(AA).length);
if (WRITE) { fs.writeFileSync(C + 'art_inspect.js', sI, 'utf8'); fs.writeFileSync(C + 'art-about.js', sA, 'utf8'); console.log('WRITTEN'); }
