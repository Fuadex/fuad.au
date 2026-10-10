// swap-hires-row.js — TRACKED TOOL (2026-10-10, plate upgrades). Replaces or inserts ONE art_hires.js row per work and
// sets that work's art_imgsize.js entry to the new plate's true size, with a round-trip proof: every other row in both
// stores must come back value-identical. Generalises the one-off .dtmp/auditwave4/plate-swap.js (Peaches, 2026-10-08).
// Input: a JSON array [{ id, hires: {src, w, h, img, iiif, title, conf, note} }] (plates5/plates.json shape; rows
// without `hires` are skipped). Box remaps travel separately through apply-repairs.js — run both in one commit.
// Usage: node swap-hires-row.js <plates.json> [--write]   (dry run by default)
const fs = require('fs'), path = require('path');
const HF = path.join(__dirname, 'art_hires.js'), SF = path.join(__dirname, 'art_imgsize.js');
const parse = s => { const w = {}; new Function('window', s)(w); return Object.values(w)[0]; };
const rows = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).filter(r => r && r.hires);
let hs = fs.readFileSync(HF, 'utf8'), ss = fs.readFileSync(SF, 'utf8');
const H0 = parse(hs), S0 = parse(ss);
for (const { id, hires } of rows) {
  if (!hires.img || !(hires.w > 0) || !(hires.h > 0)) throw new Error('incomplete hires row: ' + id);
  const lines = hs.split('\n'); const key = JSON.stringify(id) + ':';
  const hits = lines.map((l, i) => l.startsWith(key) ? i : -1).filter(i => i >= 0);
  if (hits.length > 1) throw new Error('row more than once: ' + id);
  if (hits.length === 1) {
    const old = lines[hits[0]]; lines[hits[0]] = key + ' ' + JSON.stringify(hires) + (old.trimEnd().endsWith(',') ? ',' : '');
    console.log(`  ~ ${id}  ${H0[id].w}x${H0[id].h} → ${hires.w}x${hires.h}`);
  } else {
    const end = lines.findIndex(l => /^};?\s*$/.test(l)); if (end < 1) throw new Error('no closing brace');
    let p = end - 1; while (p > 0 && !lines[p].trim()) p--;
    if (!lines[p].trimEnd().endsWith(',') && !lines[p].trimEnd().endsWith('{')) lines[p] = lines[p].trimEnd() + ',';
    lines.splice(p + 1, 0, key + ' ' + JSON.stringify(hires));
    console.log(`  + ${id}  ${hires.w}x${hires.h} (new row)`);
  }
  hs = lines.join('\n');
  const sk = JSON.stringify(id) + ':['; const at = ss.indexOf(sk);
  if (at >= 0) { if (ss.indexOf(sk, at + 1) >= 0) throw new Error('imgsize twice: ' + id); const close = ss.indexOf(']', at);
    ss = ss.slice(0, at) + sk + hires.w + ',' + hires.h + ss.slice(close); }
  else console.log(`    (no art_imgsize entry for ${id}; left as is)`);
}
const H1 = parse(hs), S1 = parse(ss), ids = new Set(rows.map(r => r.id));
for (const k of new Set([...Object.keys(H0), ...Object.keys(H1)])) if (!ids.has(k) && JSON.stringify(H0[k]) !== JSON.stringify(H1[k])) throw new Error('hires changed: ' + k);
for (const k of new Set([...Object.keys(S0), ...Object.keys(S1)])) if (!ids.has(k) && JSON.stringify(S0[k]) !== JSON.stringify(S1[k])) throw new Error('imgsize changed: ' + k);
for (const { id, hires } of rows) { if (JSON.stringify(H1[id]) !== JSON.stringify(hires)) throw new Error('row not applied: ' + id);
  if (S1[id] && (S1[id][0] !== hires.w || S1[id][1] !== hires.h)) throw new Error('imgsize not applied: ' + id); }
if (process.argv.includes('--write')) { fs.writeFileSync(HF, hs); fs.writeFileSync(SF, ss); console.log('WRITTEN — proof OK (' + rows.length + ' rows)'); }
else console.log('DRY — proof OK (' + rows.length + ' rows)');
