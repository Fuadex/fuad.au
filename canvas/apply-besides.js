// apply-besides.js — TRACKED TOOL (promoted from the 10-06 pilot): applies a wave of beside
// backfills/reseals ({id,partner,beside,replaces} rows) into art_inspect.js, each with a
// refs entry {id, text} where text = the partner work's title EXACTLY as the beside names it
// (apply-repairs' invariant: each ref text occurs exactly once in the beside). Mirrors
// apply-repairs.js's splice() so untouched entries stay byte-identical; round-trip proof; dry by
// default, WRITE=1 applies.
const fs = require('fs');
const F = 'C:/Users/Fuad/Documents/GitHub/fuad.au/canvas/art_inspect.js';
const AW = 'C:/Users/Fuad/Documents/GitHub/fuad.au/canvas/artworks.js';
const load = (src) => { const w = {}; new Function('window', src)(w); return w.CANVAS_INSPECT; };
let src = fs.readFileSync(F, 'utf8');
const data = load(src);
const before = JSON.parse(JSON.stringify(data));
const works = {}; { const w = {}; new Function('window', fs.readFileSync(AW, 'utf8'))(w); for (const x of w.CANVAS_ARTWORKS) works[x.id] = x; }
const IN = process.argv[2]; if (!IN) { console.log('usage: node apply-besides.js <besides.json> [WRITE=1]'); process.exit(1); }
const P = JSON.parse(fs.readFileSync(IN, 'utf8'));
const probs = [];
for (const p of P) {
  const t = data[p.id];
  if (!t) { probs.push(p.id + ': no tour'); continue; }
  if (p.replaces && !t.beside) { probs.push(p.id + ': reseal but no beside'); continue; }
  if (!p.replaces && t.beside) { probs.push(p.id + ': backfill but beside exists'); continue; }
  // the ref text: find the partner's title as the beside names it — longest title-form occurring once
  const title = (works[p.partner] || {}).title || '';
  // forms: full title, the title without a trailing parenthetical (the prose rightly drops it), NFC
  const bare = title.replace(/\s*\([^)]*\)\s*$/, '');
  const forms = [...new Set([title, title.normalize('NFC'), bare, bare.normalize('NFC')])].filter(Boolean);
  // a wave file may carry its own verified ref span (refs[0].text); honour it when it matches the
  // partner and occurs exactly once — canon titles can carry junk the prose rightly omits (10-07:
  // "La Mort de Barbara Radziwiłł by Józef Simmler")
  const given = (p.refs || []).find(r => r.id === p.partner);
  let text = (given && p.beside.split(given.text).length === 2) ? given.text : forms.find(f => p.beside.split(f).length === 2);
  if (!text) { probs.push(p.id + ': partner title "' + title + '" not found once in beside'); continue; }
  t.beside = p.beside;
  // keep only refs whose text still occurs exactly once in the new beside (a reseal drops the old
  // partner's stale ref — apply-repairs enforces this same invariant), then add the new partner
  const dropped = (t.refs || []).filter(r => r.id !== p.partner && p.beside.split(r.text).length !== 2);
  for (const d of dropped) console.log('   -ref dropped on ' + p.id + ': ' + d.id);
  t.refs = [...(t.refs || []).filter(r => r.id !== p.partner && p.beside.split(r.text).length === 2), { id: p.partner, text }];
  for (const r of t.refs) if (t.beside.split(r.text).length !== 2) probs.push(p.id + ': ref "' + r.text + '" not exactly once');
  console.log((p.replaces ? ' ~reseal  ' : ' +backfill') + ' ' + p.id);
}
if (probs.length) { console.log('PROBLEMS:\n  ' + probs.join('\n  ')); process.exit(1); }
console.log(P.length + ' entries OK');
if (process.env.WRITE !== '1') { console.log('DRY — WRITE=1 to apply.'); process.exit(0); }
function splice(s, id, obj) {
  const re = new RegExp('\\n(\\s*)' + JSON.stringify(id).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*:\\s*\\{', 'g');
  const hits = [...s.matchAll(re)]; if (hits.length !== 1) throw new Error(id + ': ' + hits.length + ' key matches');
  const at = hits[0].index + 1, open = s.indexOf('{', at); let d = 0, end = -1, inStr = false, esc = false;
  for (let i = open; i < s.length; i++) {
    const ch = s[i];
    if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; continue; }
    if (ch === '"') inStr = true; else if (ch === '{') d++; else if (ch === '}') { d--; if (!d) { end = i + 1; break; } }
  }
  const old = s.slice(open, end), indent = hits[0][1];
  const body = old.includes('\n') ? JSON.stringify(obj, null, 1).split('\n').join('\n' + indent) : JSON.stringify(obj);
  return s.slice(0, open) + body + s.slice(end);
}
for (const p of P) src = splice(src, p.id, data[p.id]);
const after = load(src);
for (const id of Object.keys(before)) {
  const want = P.some(p => p.id === id) ? data[id] : before[id];
  if (JSON.stringify(after[id]) !== JSON.stringify(want)) throw new Error('round-trip differs: ' + id);
}
if (Object.keys(after).length !== Object.keys(before).length) throw new Error('entry count changed');
fs.writeFileSync(F, src, 'utf8');
console.log('PROOF OK — written; every untouched entry unchanged.');
