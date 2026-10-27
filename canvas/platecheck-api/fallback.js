// fallback.js — works with no art_hires row and no artworks img: the viewer's plate is art_data's imgZoom (Commons render).
const fs = require('fs'); const L = f => { const o = {}; new Function('window', fs.readFileSync('C:/Users/Fuad/Documents/GitHub/fuad.au/canvas/' + f, 'utf8'))(o); return Object.values(o)[0]; };
const AD = L('art_data.js'); const c = JSON.parse(fs.readFileSync('ceiling.json', 'utf8'));
for (const [id, v] of Object.entries(c)) if (!v.url) { const d = (AD.artworks || AD)[id]; const u = (d.imgZoom || d.img).replace(/\?width=\d+/, '?width=2400'); c[id] = { url: u, tier: 'art_data imgZoom (Commons render, no hires row)' }; console.log(id + '\t' + u); }
fs.writeFileSync('ceiling.json', JSON.stringify(c, null, 1));
