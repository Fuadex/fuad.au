// shelve-besides.js — TRACKED TOOL (Fuad 2026-10-09: "redo the weak ones (and shelve the old ones somewhere)").
// Before a beside wave REPLACES shipped besides, this copies each current beside (text + refs) into
// canvas/archive/besides-retired.json, an append-only shelf the site never loads. Each record:
//   { id, retiredAt, reason, beside, refs, replacedBy: { companion, beside } }
// It reads the wave file apply-besides.js consumes ([{id, partner, beside, replaces, refs}]) and asserts that each
// `replaces` equals the live beside, so the shelf holds exactly what is being taken down.
// Usage: node shelve-besides.js <wave-besides.json> "<reason>" [--write]   (dry run by default)
const fs = require('fs'), path = require('path');
const C = __dirname + '/';
const ARCH = path.join(C, 'archive', 'besides-retired.json');
const [waveFile, reason] = [process.argv[2], process.argv[3]];
if (!waveFile || !reason) { console.log('usage: node shelve-besides.js <wave-besides.json> "<reason>" [--write]'); process.exit(2); }
const load = f => { const w = {}; new Function('window', fs.readFileSync(C + f, 'utf8'))(w); return Object.values(w)[0]; };
const I = load('art_inspect.js');
const refsOf = t => Array.isArray(t.refs) ? t.refs : (t.refs && t.refs.beside) || [];
const wave = JSON.parse(fs.readFileSync(waveFile, 'utf8'));
const shelf = fs.existsSync(ARCH) ? JSON.parse(fs.readFileSync(ARCH, 'utf8')) : [];
const today = new Date().toISOString().slice(0, 10);
const add = [];
for (const r of wave) {
  if (!r.replaces) continue;                       // backfills have nothing to shelve
  const t = I[r.id]; if (!t) throw new Error('no tour: ' + r.id);
  if (t.beside !== r.replaces) throw new Error('replaces ≠ live beside: ' + r.id);
  if (shelf.some(s => s.id === r.id && s.beside === t.beside)) { console.log('  already shelved', r.id); continue; }
  add.push({ id: r.id, retiredAt: today, reason, beside: t.beside, refs: refsOf(t), replacedBy: { companion: r.partner, beside: r.beside } });
}
console.log((process.argv.includes('--write') ? 'SHELVING ' : 'DRY: would shelve ') + add.length + ' beside(s); shelf now ' + shelf.length);
add.forEach(a => console.log('  +', a.id, '→', a.replacedBy.companion));
if (process.argv.includes('--write')) {
  fs.mkdirSync(path.dirname(ARCH), { recursive: true });
  fs.writeFileSync(ARCH, JSON.stringify(shelf.concat(add), null, 1) + '\n');
  console.log('written', ARCH, '(' + (shelf.length + add.length) + ' records)');
}
