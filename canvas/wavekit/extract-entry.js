// extract.js — dump one work's shipped store entries (tour, reads, hires, canon row, Wikidata cache) for a repair agent.
// Usage: node extract.js <id>   → writes shipped_<id>.json in this folder. Read-only on the stores.
const fs = require('fs'), C = 'C:/Users/Fuad/Documents/GitHub/fuad.au/canvas/';
const load = (f, v) => { global.window = {}; eval(fs.readFileSync(C + f, 'utf8')); return window[v]; };
const id = process.argv[2]; if (!id) throw new Error('id?');
const I = load('art_inspect.js', 'CANVAS_INSPECT'), A = load('art-about.js', 'CANVAS_ART_ABOUT'), H = load('art_hires.js', 'CANVAS_HIRES');
let D = null; try { D = load('art_data.js', 'CANVAS_ART_DATA') } catch (e) {}
const row = fs.readFileSync(C + 'artworks.js', 'utf8').split('\n').filter(l => l.includes('"' + id + '"')).join('\n');
const out = { id, tour: I[id] || null, reads: A[id] || null, hires: H[id] || null, canonRowText: row, wikidataCache: D && D.artworks ? (D.artworks[id] || null) : null };
fs.writeFileSync(__dirname + '/shipped_' + id + '.json', JSON.stringify(out, null, 1));
console.log('shipped_' + id + '.json', 'tour:' + !!out.tour, 'reads:' + !!out.reads, 'hires:' + !!out.hires);
