// replate2/add-hires.js (from replate1) (from platecheck8/apply-plate-upgrade.js) — add art_hires rows for same-framing Commons upgrades found by the
// plate-check seals (2026-10-26, Fuad: "if there are larger copies, then probably ideal to try and upgrade").
// LINE-LEVEL ONLY (canvas files are append-only): art_hires.js gets one compact JSON line inserted before
// its closing "};" (and a comma on the previous last line); art_imgsize.js gets one key inserted before its
// closing "}". Entry shape follows the store's commons rows (src/w/h/img/title/conf/note).
// Framing gate checked by the orchestrator (scale/offset search vs the current plate):
//   le-dejeuner-sur-l-herbe — best fit scale 1.01, offset under 1%, colour close (slightly darker).
//   Nymphéas (Monet_w1791.jpg) REJECTED: same framing but a heavy green/brown cast vs the holder's image.
// node apply-plate-upgrade.js [--write]
const fs = require('fs');
const C = 'C:/Users/Fuad/Documents/GitHub/fuad.au/canvas/';
const WRITE = process.argv.includes('--write');
const UP = [
  { id: 'salvador-dali-the-great-masturbator', src: 'reinasofia', url: 'https://recursos.museoreinasofia.es/Obra/AS11140_2.jpg', w: 2143, h: 1586,
    note: 'Museo Reina Sofía AS11140 (Legado Dalí 1990), holder image (includes a thin frame edge); replaces a Commons gallery photo with visitors in front of the canvas. Tour boxes remapped by registration (replate2, corr 0.866, 2026-10-27); text re-checked by the API checker on this plate.' },
  { id: 'edgar-degas-woman-drying-herself', src: 'google-arts', url: 'https://lh3.googleusercontent.com/ci/AL18g_QY1TqbOgogzf--YTp9mocqcVqL8Qru0Bg0NhahiTNljrnC6qr5DqY35j7icl2U7oBhxvogOPw=s0', w: 937, h: 1200,
    note: 'Museo Soumaya pastel (Google Arts & Culture asset 3QHog0NG4PkC3w, served at 1200 px max); replaces a Commons phone photo of the framed sheet on a gallery wall. Aspect matches the holder size 66.1 x 51.8 cm. Tour boxes remapped by registration (replate2, corr 0.936, 2026-10-27).' },
];
const g = {};
for (const f of ['art_hires.js', 'art_imgsize.js', 'artworks.js']) new Function('window', fs.readFileSync(C + f, 'utf8') + '\nreturn window;')(g);
const HI = g.CANVAS_HIRES, TITLE = {};
g.CANVAS_ARTWORKS.forEach(w => { TITLE[w.id] = w.title; });
let hires = fs.readFileSync(C + 'art_hires.js', 'utf8'), sizes = fs.readFileSync(C + 'art_imgsize.js', 'utf8');
for (const u of UP) {
  if (HI[u.id]) { console.log('SKIP', u.id, '— already has a hires entry'); continue; }
  const entry = u.url ? { src: u.src, w: u.w, h: u.h, img: u.url, iiif: null, title: TITLE[u.id], conf: 'high', note: u.note }
    : { src: 'commons', w: u.w, h: u.h, img: 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(u.file.replace(/ /g, '_')), title: TITLE[u.id], conf: 'high', note: u.note };
  const line = JSON.stringify(u.id) + ': ' + JSON.stringify(entry);
  const end = hires.lastIndexOf('\n};');
  if (end < 0) throw new Error('art_hires.js closing "};" not found');
  hires = hires.slice(0, end) + ',\n' + line + hires.slice(end);
  const send = sizes.lastIndexOf('};');
  sizes = sizes.slice(0, send) + ',' + JSON.stringify(u.id) + ':' + JSON.stringify([u.w, u.h]) + sizes.slice(send);
  console.log('ADD', u.id, u.w + 'x' + u.h);
}
// parse-check both before writing
const chk = {}; new Function('window', hires + '\n' + sizes)(chk);
if (Object.keys(chk.CANVAS_HIRES).length !== Object.keys(HI).length + UP.filter(u => !HI[u.id]).length) throw new Error('entry count mismatch');
if (!WRITE) { console.log('(dry run — add --write)'); process.exit(0); }
fs.writeFileSync(C + 'art_hires.js', hires); fs.writeFileSync(C + 'art_imgsize.js', sizes);
console.log('WROTE (line-level) art_hires.js + art_imgsize.js');
