// build-canon.js — wave 10 batch file: canon row + hires identity + existing Info + reader ceiling.
const fs = require('fs');
const C = 'c:/Users/Fuad/Documents/GitHub/fuad.au/canvas/';
const D = 'c:/Users/Fuad/Documents/GitHub/.dtmp/tourwave29/';   // point at the new workshop
const RETOUR = [];   // ids whose shipped tour this wave REPLACES (must match merge's RETOUR)
function load(f, k) { global.window = {}; eval(fs.readFileSync(C + f, 'utf8')); return window[k]; }
const A = load('artworks.js', 'CANVAS_ARTWORKS');
const H = load('art_hires.js', 'CANVAS_HIRES');
const AB = load('art-about.js', 'CANVAS_ART_ABOUT');
const I = load('art_inspect.js', 'CANVAS_INSPECT');
const AD = load('art_data.js', 'CANVAS_ART_DATA');   // wave 17: the site's plate for works with no hires row lives here
const IDS = JSON.parse(fs.readFileSync(D + 'ids.json', 'utf8'));
const byId = Object.fromEntries(A.map(w => [w.id, w]));
const out = IDS.map(id => {
  const w = byId[id]; if (!w) throw new Error('no canon row: ' + id);
  if (I[id] && !RETOUR.includes(id)) throw new Error('already toured: ' + id);   // a re-tour must be listed in RETOUR
  const h = H[id] || {};
  const tile = !!(h.iiif || h.iiifId || h.dzi || h.zoomify);
  const isTif = /\.tif(f)?(\?|$)/i.test(h.img || '');
  const ceiling = tile ? 'true tile pyramid — no reader ceiling; brushstroke-level craft claims are legitimate'
    : isTif ? 'TIFF-backed Commons file — Commons will not render above 1920 px on the long side; the reader ceiling is 1920'
    : 'flat image — the reader ceiling is the file itself, ' + (h.w || '?') + 'x' + (h.h || '?');
  const ab = AB[id];
  return {
    id, title: w.title, artist: w.artist, artistId: w.artistId, year: w.year, qid: w.qid,
    seenAt: Array.isArray(w.seenAt) ? w.seenAt.join(',') : (w.seenAt || null),
    seenConfidence: w.seenConfidence || null,
    floored: !!w.floored, liked: !!w.liked, note: w.note || null,
    plate: h.iiif ? h.iiif.replace(/info\.json$/, 'full/1600,/0/default.jpg') : (h.img || w.img || (AD.artworks[id] || {}).img),
    plateFull: h.iiif ? h.iiif.replace(/info\.json$/, '') : (h.img || w.img || (AD.artworks[id] || {}).img),
    hiresSrc: h.src || null, hiresPage: h.page || null, hiresIiif: h.iiif || null,
    hiresDims: (h.w && h.h) ? (h.w + 'x' + h.h) : null,
    tileService: tile, readerCeiling: ceiling,
    hasAbout: !!ab, existingInfo: ab ? ab.about : null, existingDeep: ab && ab.deep ? ab.deep : null,
  };
});
// wave 20 fix: the BLIND phase-1 pass reads canon.json, so it must not carry the shipped texts (the wave-20
// L'Été eye saw the existing Info there). canon_full.json keeps them for build-pre.js and the orchestrator.
fs.writeFileSync(D + 'canon_full.json', JSON.stringify(out, null, 1));
fs.writeFileSync(D + 'canon.json', JSON.stringify(out.map(r => { const b = Object.assign({}, r); delete b.existingInfo; delete b.existingDeep; delete b.hasAbout; return b; }), null, 1));
console.log('wrote', out.length, 'rows');
out.forEach(r => console.log([r.tileService ? 'TILE' : 'flat', (r.hiresDims || '').padStart(11), (r.hiresSrc || '').padEnd(18), r.hasAbout ? 'INFO' : '    ', r.id].join(' ')));
