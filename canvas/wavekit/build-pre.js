// build-pre.js — one pre_<id>.json job file per work: identity, plate paths, reader ceiling, existing Info.
const fs = require('fs');
const D = 'c:/Users/Fuad/Documents/GitHub/.dtmp/tourwave29/';
const rows = JSON.parse(fs.readFileSync(D + 'canon_full.json', 'utf8'));
const C = 'c:/Users/Fuad/Documents/GitHub/fuad.au/canvas/';
function load(f, k) { global.window = {}; eval(fs.readFileSync(C + f, 'utf8')); return window[k]; }
const SZ = load('art_imgsize.js', 'CANVAS_IMGSIZE');
const HOLD = load('art_holders.js', 'CANVAS_HOLDERS') || {};
// wave 17: the seven works whose held image is small, of unknown origin, or not the museum's own
const PLATE_HUNT = new Set([]);   // wave 26: none — plates screened and ruled by the orchestrator (contact sheet; plates24.py)
for (const r of rows) {
  const pre = {
    id: r.id, title: r.title, artist: r.artist, year: r.year, qid: r.qid,
    seenAt: r.seenAt, seenConfidence: r.seenConfidence,
    identity: {
      plateSource: r.hiresSrc, museumPage: r.hiresPage, iiif: r.hiresIiif,
      plateDims: r.plateDims, readerCeiling: r.readerCeiling, plateNote: r.plateNote, plateChangesAtMerge: !!r.plateChangesAtMerge,
    },
    image: D + 'img_' + r.id + '.jpg',
    tiles: D + 'tile_' + r.id + '_r<row>c<col>.jpg  (3x3, r1c1 = top-left; exact fractions in TILE_MAP.json)',
    existingInfo: r.existingInfo,
    existingDeep: r.existingDeep || null,
    currentPlate: { url: r.plate, pixelSize: r.plateDims },
    colourAuthority: fs.existsSync(D + 'colour_' + r.id + '.jpg') ? D + 'colour_' + r.id + '.jpg' : null,
    holderQid: (HOLD.artworks || HOLD)[r.id] || null,
    plateHunt: PLATE_HUNT.has(r.id),
    note: 'The identity block names the plate source: THIS object (that museum, that page) is the one under discussion — never a sister version. Boxes are fractions of the plate at `image`, which is the same object the site zooms. ' + (r.existingInfo ? 'An Info already ships for this work: it is quoted above. Research must go BEYOND it and must say so if it is wrong.' : 'No Info ships for this work yet.'),
  };
  fs.writeFileSync(D + 'pre_' + r.id + '.json', JSON.stringify(pre, null, 1));
}
console.log('wrote', rows.length, 'pre files');
