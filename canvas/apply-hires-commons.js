// apply-hires-commons.js — turn the verified same-framing Commons finds into CANVAS_HIRES
// overrides. Dry-run by default; --write to commit.
//
// Only entries that passed the ASPECT GATE (<=2% drift) are applied: tour anchors are normalised
// 0-1 fractions, so a bigger scan of the SAME framing leaves every box exactly where it was.
// Reframed candidates are deliberately NOT applied — they need a coordinate pass first.
//
// Existing CANVAS_HIRES entries are never touched: their `details` arrays are hand-authored zoom
// tours. Every id written here was checked to have no prior entry.
//
// We serve ?width=3000 rather than the raw file: several of these originals are 10-20k pixels
// wide (tens of MB) and 3000 is already far beyond what the zoom needs. art_imgsize is updated to
// the SERVED size so the work page's "Source image ↗ W×H" label states what the link opens.
const fs = require("fs"), path = require("path");
const HERE = __dirname;
const WRITE = process.argv.includes("--write");
const SERVE_W = 3000;

const found = JSON.parse(fs.readFileSync(path.join(HERE, "..", "..", ".sptmp", "hires-commons.json"), "utf8"));
const g = {};
for (const f of ["art_hires.js", "art_imgsize.js", "artworks.js"])
  new Function("window", fs.readFileSync(path.join(HERE, f), "utf8") + "\nreturn window;")(g);
const HI = g.CANVAS_HIRES, SIZE = g.CANVAS_IMGSIZE;
const TITLE = {}; g.CANVAS_ARTWORKS.forEach(w => { TITLE[w.id] = w.title; });

// Hand rejections. The aspect gate proves the FRAMING matches; it cannot tell you the file is the
// wrong cast, a retouched derivative, or a snapshot. Reading the filenames catches those.
const REJECT = {
  "the-thinker": "'Der Denker Albertinum' — the DRESDEN cast. The canon row is the Musée Rodin cast and its tour was authored against that photograph; a different bronze in different light is not the same object.",
  "vincent-van-gogh-cypresse": "'digitally enhanced by rawpixel' — a colour-altered derivative, not a faithful reproduction. Sharper is not the same as truer.",
  "franz-marc-triple-t": "'Marc Tiger PA291038.jpg' — a camera filename, i.e. a gallery snapshot rather than a flat reproduction. Aspect matches because it is cropped to the canvas, but glare and colour cast are likely.",
};

const swaps = found.filter(o => o.best);
console.log(`${swaps.length} same-framing upgrades found\n`);

const added = {}, sizes = {};
for (const o of swaps) {
  if (HI[o.id]) { console.log(`  SKIP ${o.id} — already has a hires entry (hand-authored details)`); continue; }
  if (REJECT[o.id]) { console.log(`  REJECT ${o.title.slice(0, 30)} — ${REJECT[o.id].slice(0, 96)}`); continue; }
  const file = o.best.title;
  const servedW = Math.min(SERVE_W, o.best.w);
  const servedH = Math.round(o.best.h * (servedW / o.best.w));
  added[o.id] = {
    src: "commons",
    img: "https://commons.wikimedia.org/wiki/Special:FilePath/" + encodeURIComponent(file.replace(/ /g, "_")) + "?width=" + servedW,
    file,
    title: TITLE[o.id] || o.title,
    conf: "high",
    // provenance of the swap, so a later pass can tell what was decided and why
    from: { was: o.px, now: [o.best.w, o.best.h], served: [servedW, servedH], arDelta: +o.best.arDelta.toFixed(4), cat: o.cat },
  };
  sizes[o.id] = [servedW, servedH];
  console.log(`  ${String(o.px[0]).padStart(5)} → ${String(servedW).padEnd(5)} (source ${o.best.w}px, ar drift ${(o.best.arDelta * 100).toFixed(1)}%)  ${o.title.slice(0, 42)}`);
}

console.log(`\n${Object.keys(added).length} entries to write`);
if (!WRITE) { console.log("(dry run — add --write)"); process.exit(0); }

// ---- merge into art_hires.js, preserving every existing entry verbatim ----
const merged = { ...HI };
for (const [id, v] of Object.entries(added)) merged[id] = v;
const header = fs.readFileSync(path.join(HERE, "art_hires.js"), "utf8").split("window.CANVAS_HIRES")[0];
fs.writeFileSync(path.join(HERE, "art_hires.js"), header + "window.CANVAS_HIRES = " + JSON.stringify(merged, null, 1) + ";\n");

// ---- art_imgsize: report the size the link now actually serves ----
const newSize = { ...SIZE };
for (const [id, wh] of Object.entries(sizes)) newSize[id] = wh;
const sHeader = fs.readFileSync(path.join(HERE, "art_imgsize.js"), "utf8").split("window.CANVAS_IMGSIZE")[0];
fs.writeFileSync(path.join(HERE, "art_imgsize.js"), sHeader + "window.CANVAS_IMGSIZE = " + JSON.stringify(newSize) + ";\n");

console.log(`WROTE art_hires.js (${Object.keys(HI).length} → ${Object.keys(merged).length}) and art_imgsize.js`);
