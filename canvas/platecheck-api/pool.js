// pool.js — plate-check lane queue (rebuilt 2026-10-15 for batch 2).
// Pool = toured works whose mv is 1 / 2 / 2.1, minus every id touched by the 10-07+ lanes (merges2–6, dataflags2–7,
// auditwave3–4, plates5, tourwave20–22) and minus platecheck1. Tiers: seen loved/floored → seen liked → wish loved/floored
// → other seen → liked wish → other wish. "Seen" = !wish && seenConfidence in {sure, probably} (wish = UNSEEN, memory rule).
// Writes pool.json (all, tiered) and prints the counts and the next 15.
const fs = require('fs');
const C = 'C:/Users/Fuad/Documents/GitHub/fuad.au/canvas/';
const D = 'C:/Users/Fuad/Documents/GitHub/.dtmp/';
const load = (f) => { const w = {}; new Function('window', fs.readFileSync(C + f, 'utf8'))(w); return w; };
const INS = load('art_inspect.js').CANVAS_INSPECT;
const AW = load('artworks.js'); const ROWS = AW.CANVAS_ARTWORKS || AW.ARTWORKS || Object.values(AW).find(Array.isArray);
const byId = new Map(ROWS.map(r => [r.id, r]));
const touched = new Set();
const lanes = ['merges2','merges3','merges4','merges5','merges6','dataflags2','dataflags3','dataflags4','dataflags5','dataflags6','dataflags7','auditwave3','auditwave4','plates5','tourwave20','tourwave21','tourwave22','platecheck1','platecheck2','platecheck3','platecheck4','platecheck5','platecheck6','platecheck7','platecheck8','platecheck9','platecheck10','platecheck11','platecheck12','platecheck12r','platecheck13'];
for (const l of lanes) { const f = D + l + '/ids.json'; if (!fs.existsSync(f)) { console.log('no ids.json in', l); continue; } const j = JSON.parse(fs.readFileSync(f, 'utf8')); const ids = Array.isArray(j) ? j : (j.ids || Object.keys(j)); for (const x of ids) touched.add(typeof x === 'string' ? x : x.id); }
const tier = (r) => {
  const seen = r && !r.wish && (r.seenConfidence === 'sure' || r.seenConfidence === 'probably');
  const top = r && (r.floored || r.favorite || r.loved);
  const liked = r && r.liked;
  if (seen && top) return 1; if (seen && liked) return 2; if (r && r.wish && top) return 3; if (seen) return 4; if (r && r.wish && liked) return 5; return 6;
};
const pool = [];
for (const [id, e] of Object.entries(INS)) {
  if (!['1', '2', '2.1'].includes(String(e.mv))) continue;
  if (touched.has(id)) continue;
  const r = byId.get(id);
  pool.push({ id, mv: String(e.mv), tier: tier(r), floored: !!(r && (r.floored || r.favorite)), artist: r && r.artist, title: r && r.title, stops: (e.deeper || []).length, beside: e.beside !== undefined });
}
pool.sort((a, b) => a.tier - b.tier || (b.floored - a.floored) || a.id.localeCompare(b.id));
fs.writeFileSync(D + 'platecheckNN/pool.json', JSON.stringify(pool, null, 1));
const cnt = {}; for (const p of pool) cnt[p.tier] = (cnt[p.tier] || 0) + 1;
console.log('pool', pool.length, '| by tier', JSON.stringify(cnt), '| touched ids', touched.size);
console.log('rows fields sample:', Object.keys(ROWS[0]).join(','));
for (const p of pool.slice(0, 15)) console.log(p.tier, p.mv, p.floored ? 'F' : ' ', p.id, '|', p.stops, 'stops', p.beside ? 'beside' : '');
