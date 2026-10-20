// merge-template.js — copy to .dtmp/tourwaveNN/mergeNN.js; fill PLATES / REPLACE_PLATES / RETOUR (mv 6). RUN WITH --write ONLY ON FUAD'S VERDICT; without it the script
// writes, proves the round trip, then RESTORES all three stores (dry proof). art_inspect +3 tours, the Kiss tour replaced; art-about: 3 REPLACE, the Kiss KEEP unless --approve-proposed=the-kiss.
// art_hires: 1 insert (Turner) + 2 replacements (the Kiss marble, the Böcklin colour photo). Every splice ASSERTS its anchor matched; round-trip proof over all three stores.
const fs = require('fs');
const C = 'C:/Users/Fuad/Documents/GitHub/fuad.au/canvas/';
const W = 'C:/Users/Fuad/Documents/GitHub/.dtmp/tourwaveNN/';
const INSPECT = C + 'art_inspect.js', ABOUT = C + 'art-about.js', HIRES = C + 'art_hires.js';
const IDS = JSON.parse(fs.readFileSync(W + 'ids.json', 'utf8'));
const BY = 'Opus 5.5', MV = 6;
const PLATES = {
};   // per wave: id -> art_hires row for each NEW plate (src, w, h, img, title, conf, note)
const REPLACE_PLATES = {
};   // per wave: id -> art_hires row that REPLACES a shipped one (re-tours, image fixes)
const RETOUR = new Set([]);   // wave 29: the tour entry is REPLACED, not inserted
const WRITE = process.argv.includes('--write');
const parse = (src, v) => { global.window = {}; eval(src); return window[v]; };
function locate(src, id) {
  let key = JSON.stringify(id) + ':'; let at = src.indexOf('\n' + key);
  if (at < 0) { key = ' ' + key; at = src.indexOf('\n' + key); }   // wave 29: older entries carry a leading space
  if (at < 0 || src.indexOf('\n' + key, at + 1) >= 0) return null;
  const open = src.indexOf('{', at); let d = 0;
  for (let i = open; i < src.length; i++) { const c = src[i]; if (c === '{') d++; else if (c === '}') { d--; if (!d) return { at, open, end: i + 1, key }; } }
  return null;
}
const block = (id, e) => ' ' + JSON.stringify(id) + ': ' + JSON.stringify(e, null, 1).split('\n').join('\n ') + ',\n';
// ---------- gather ----------
const G = {};
for (const id of IDS) {
  // PROPOSE-REPLACE ships the drafts only on Fuad's separate verdict (--approve-proposed=<id>); otherwise KEEP.
  // Checked FIRST: a bare \bREPLACE\b would match inside "PROPOSE-REPLACE".
  const dtxt = fs.readFileSync(W + 'infodisp_' + id + '.md', 'utf8');
  const APPROVED = (process.argv.find(a => a.startsWith('--approve-proposed=')) || '').split('=')[1] || '';
  const disp = /DISPOSITION:\s*PROPOSE-REPLACE/.test(dtxt) ? (APPROVED.split(',').includes(id) ? 'REPLACE' : 'KEEP')
    : (dtxt.match(/\b(NEW|REPLACE|LEAVE|KEEP)\b/) || [])[0];
  if (!disp) throw new Error('no disposition for ' + id);
  const t = JSON.parse(fs.readFileSync(W + 'out_tour_' + id + '.json', 'utf8'));
  const b = JSON.parse(fs.readFileSync(W + 'beside_' + id + '.json', 'utf8'));
  G[id] = { disp, tour: t, beside: b, interp: disp === 'KEEP' ? null : fs.readFileSync(W + 'interp_' + id + '.md', 'utf8').trim(), info: disp === 'KEEP' ? null : fs.readFileSync(W + 'info_' + id + '.md', 'utf8').trim() };
}
const bak = f => f + '.preNN';
for (const f of [INSPECT, ABOUT, HIRES]) fs.copyFileSync(f, bak(f));
function restore(why) { for (const f of [INSPECT, ABOUT, HIRES]) fs.copyFileSync(bak(f), f); console.log('\n⛔ RESTORED ALL THREE FILES — ' + why); process.exit(2); }
try {
  // LF-normalise on read: core.autocrlf=true can leave a CRLF working copy of an LF blob (art-about.js did after 881c1b4).
  const lf = f => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
  let sI = lf(INSPECT), sA = lf(ABOUT), sH = lf(HIRES);
  const bI = parse(sI, 'CANVAS_INSPECT'), bA = parse(sA, 'CANVAS_ART_ABOUT'), bH = parse(sH, 'CANVAS_HIRES');
  const nI = Object.keys(bI).length, nA = Object.keys(bA).length, nH = Object.keys(bH).length;
  console.log('before: art_inspect ' + nI + ' | art-about ' + nA + ' | art_hires ' + nH);
  const keep = {};
  for (const id of IDS) {
    if (bI[id] && !RETOUR.has(id)) restore('tour already present: ' + id);
    if (RETOUR.has(id) && !bI[id]) restore('RETOUR but no shipped tour: ' + id);
    const d = G[id].disp;
    if (d === 'NEW' && bA[id]) restore('NEW Info but entry exists: ' + id);
    if (d !== 'NEW' && !bA[id]) restore(d + ' but no shipped entry: ' + id);
    if (d === 'KEEP' && !RETOUR.has(id)) restore('KEEP is only for a re-tour: ' + id);
    if (bA[id]) { keep[id] = {}; for (const [k, v] of Object.entries(bA[id])) if (!['about', 'by', 'deep', 'deepBy'].includes(k)) keep[id][k] = v; }
  }
  // ---- art_inspect: insert after the anchor
  const aI = 'window.CANVAS_INSPECT = {\n';
  if (sI.split(aI).length !== 2) restore('art_inspect anchor not exactly once');
  let ins = '';
  const RE = {};
  for (const id of IDS) {
    const t = G[id].tour, b = G[id].beside;
    const e = { mv: MV, see: t.see, about: t.about, craft: t.craft, context: t.context, deeper: t.deeper, beside: b.beside, refs: b.refs, by: BY };
    if (!e.see || !e.about || !e.craft || !e.context || !Array.isArray(e.deeper) || !e.beside || !Array.isArray(e.refs)) restore('incomplete tour: ' + id);
    if (RETOUR.has(id)) RE[id] = e; else ins += block(id, e);
  }
  sI = sI.replace(aI, aI + ins);
  for (const [id, e] of Object.entries(RE)) {
    const loc = locate(sI, id); if (!loc) restore('cannot locate the shipped tour exactly once: ' + id);
    sI = sI.slice(0, loc.at + 1) + loc.key + ' ' + JSON.stringify(e, null, 1).split(String.fromCharCode(10)).join(String.fromCharCode(10) + ' ') + sI.slice(loc.end);
  }
  // ---- art-about: NEW inserted; REPLACE rewrites about+deep; LEAVE keeps about, adds deep
  const aA = 'window.CANVAS_ART_ABOUT = {\n';
  if (sA.split(aA).length !== 2) restore('art-about anchor not exactly once');
  let insA = '';
  for (const id of IDS) if (G[id].disp === 'NEW') insA += block(id, { about: G[id].info, deep: G[id].interp, by: BY });
  sA = sA.replace(aA, aA + insA);
  for (const id of IDS) {
    const d = G[id].disp; if (d === 'NEW' || d === 'KEEP') continue;
    const loc = locate(sA, id); if (!loc) restore('cannot locate exactly one entry: ' + id);
    const about = d === 'LEAVE' ? bA[id].about : G[id].info;
    const merged = Object.assign({ about, deep: G[id].interp, by: BY }, keep[id]);
    sA = sA.slice(0, loc.at + 1) + loc.key + ' ' + JSON.stringify(merged, null, 1).split('\n').join('\n ') + sA.slice(loc.end);
  }
  // ---- art_hires: INSERT one compact line per plate after the anchor (neither id may already exist)
  const aH = 'window.CANVAS_HIRES = {\n';
  if (sH.split(aH).length !== 2) restore('art_hires anchor not exactly once');
  let insH = '';
  for (const [id, row] of Object.entries(PLATES)) {
    if (bH[id]) restore('art_hires row already exists: ' + id);
    insH += JSON.stringify(id) + ':' + JSON.stringify(row) + ',\n';
  }
  sH = sH.replace(aH, aH + insH);
  for (const [id, row] of Object.entries(REPLACE_PLATES)) {
    if (!bH[id]) restore('REPLACE row missing: ' + id);
    const NL = String.fromCharCode(10);
    const key = NL + JSON.stringify(id) + ':'; const at = sH.indexOf(key);
    if (at < 0 || sH.indexOf(key, at + 1) >= 0) restore('REPLACE row not exactly once: ' + id);
    const eol = sH.indexOf(NL, at + 1);
    sH = sH.slice(0, at + 1) + JSON.stringify(id) + ': ' + JSON.stringify(row) + ',' + sH.slice(eol);
  }
  fs.writeFileSync(INSPECT, sI, 'utf8'); fs.writeFileSync(ABOUT, sA, 'utf8'); fs.writeFileSync(HIRES, sH, 'utf8');
  // ---------- ROUND-TRIP PROOF ----------
  const aIo = parse(fs.readFileSync(INSPECT, 'utf8'), 'CANVAS_INSPECT'), aAo = parse(fs.readFileSync(ABOUT, 'utf8'), 'CANVAS_ART_ABOUT'), aHo = parse(fs.readFileSync(HIRES, 'utf8'), 'CANVAS_HIRES');
  const newA = IDS.filter(id => G[id].disp === 'NEW').length;
  if (Object.keys(aIo).length !== nI + IDS.filter(id => !RETOUR.has(id)).length) restore('art_inspect count');
  if (Object.keys(aAo).length !== nA + newA) restore('art-about count');
  if (Object.keys(aHo).length !== nH + Object.keys(PLATES).length) restore('art_hires count');
  for (const id of Object.keys(bI)) if (!RETOUR.has(id) && JSON.stringify(aIo[id]) !== JSON.stringify(bI[id])) restore('unrelated tour changed: ' + id);
  for (const id of Object.keys(bA)) if ((!IDS.includes(id) || G[id].disp === 'KEEP') && JSON.stringify(aAo[id]) !== JSON.stringify(bA[id])) restore('unrelated read changed: ' + id);
  for (const id of Object.keys(bH)) if (!PLATES[id] && !REPLACE_PLATES[id] && JSON.stringify(aHo[id]) !== JSON.stringify(bH[id])) restore('unrelated hires row changed: ' + id);
  for (const [id, row] of Object.entries(REPLACE_PLATES)) if (JSON.stringify(aHo[id]) !== JSON.stringify(row)) restore('hires row not replaced: ' + id);
  let refs = 0;
  for (const id of IDS) {
    const a = aIo[id], t = G[id].tour;
    if (!a || a.mv !== MV || a.by !== BY || a.flags !== undefined || a.survey !== undefined || a.id !== undefined) restore('tour stamp/fields wrong: ' + id);
    for (const k of ['see', 'about', 'craft', 'context']) if (a[k] !== t[k]) restore(k + ' drifted: ' + id);
    if (JSON.stringify(a.deeper) !== JSON.stringify(t.deeper)) restore('stops drifted: ' + id);
    for (const r of a.refs) { if (a.beside.split(r.text).length !== 2) restore('ref text not once: ' + id); if (!aIo[r.id] && !aAo[r.id]) restore('companion resolves nowhere: ' + r.id); refs++; }
    const ab = aAo[id];
    if (G[id].disp === 'KEEP') { if (JSON.stringify(ab) !== JSON.stringify(bA[id])) restore('KEEP read changed: ' + id); continue; }
    const wantAbout = G[id].disp === 'LEAVE' ? bA[id].about : G[id].info;
    if (!ab || ab.about !== wantAbout || ab.deep !== G[id].interp || ab.by !== BY) restore('read entry wrong: ' + id);
    for (const [k, v] of Object.entries(keep[id] || {})) if (JSON.stringify(ab[k]) !== JSON.stringify(v)) restore('preserved field lost: ' + k + ' on ' + id);
  }
  for (const [id, row] of Object.entries(PLATES)) if (JSON.stringify(aHo[id]) !== JSON.stringify(row)) restore('hires row not applied: ' + id);
  console.log('\nPROOF OK');
  console.log('  art_inspect ' + nI + ' -> ' + Object.keys(aIo).length + ' | art-about ' + nA + ' -> ' + Object.keys(aAo).length + ' | art_hires rows inserted: ' + Object.keys(PLATES).length);
  console.log('  ' + refs + ' beside refs verified; every other entry byte-identical');
  console.log('  art_hires rows replaced: ' + Object.keys(REPLACE_PLATES).join(', '));
  console.log('  tours replaced (re-tour): ' + [...RETOUR].join(', '));
  if (!WRITE) { for (const f of [INSPECT, ABOUT, HIRES]) { fs.copyFileSync(bak(f), f); fs.unlinkSync(bak(f)); } console.log('  DRY PROOF OK — stores restored (pass --write to keep)'); }
  else { for (const f of [INSPECT, ABOUT, HIRES]) fs.unlinkSync(bak(f)); console.log('  WRITTEN — backups removed'); }
} catch (e) { restore('threw: ' + e.message); }
