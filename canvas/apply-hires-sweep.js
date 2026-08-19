// apply-hires-sweep.js — apply the wider Commons sweep, with the guards the first pass taught us.
//   node apply-hires-sweep.js [--write]
//
// The aspect gate proves the FRAMING matches. It cannot tell you the file is a different CAST of
// the same sculpture, a different IMPRESSION of the same print, a gallery snapshot, or a
// derivative. Those need rules of their own:
//
//   SCULPTURE and WORKS ON PAPER are held back automatically. A bronze is cast many times and a
//   print pulled many times; "same title, same artist, same aspect" is genuinely NOT the same
//   object, and the holder named in a filename (Albertinum, Burrell, Minneapolis) is usually the
//   giveaway. Paintings are unique objects, so a same-framing match is safe.
//   CAMERA FILENAMES (P1050593, PA291038, DSC_1234, Flickr id suffixes) are gallery snapshots:
//   glare, keystone, colour cast. A flat reproduction is always preferable.
//   DERIVATIVE MARKERS in the title ("etching by", "My Dream", enhanced/restored) mean the file
//   depicts or reworks the artwork rather than reproducing it.
const fs = require("fs"), path = require("path");
const HERE = __dirname;
const WRITE = process.argv.includes("--write");
const SERVE_W = 3000;

const g = {};
for (const f of ["artworks.js", "art_imgsize.js", "art_hires.js", "art_medium.js"])
  new Function("window", fs.readFileSync(path.join(HERE, f), "utf8") + "\nreturn window;")(g);
const HI = g.CANVAS_HIRES, SIZE = g.CANVAS_IMGSIZE, MED = g.CANVAS_MEDIUM;
const TITLE = {}; g.CANVAS_ARTWORKS.forEach(w => { TITLE[w.id] = w.title; });
const found = JSON.parse(fs.readFileSync(path.join(HERE, "..", "..", ".sptmp", "hires-sweep.json"), "utf8")).filter(o => o.best);

const CAMERA = /(^|[^a-z])(P\d{7}|PA\d{6}|PB\d{6}|DSC[_-]?\d|DSCN\d|IMG[_-]?\d|_MG_\d|CIMG\d|SAM_\d|DP\d{6})|\(\d{9,}\)/i;
const DERIV = /(etching by|engraving by|drawing after|after the painting|my dream|enhanced|restored|colou?ri[sz]ed|replica)/i;

let applied = 0, held = 0;
const added = {}, sizes = {};
const holdLog = [];
for (const o of found) {
  const bucket = (MED[o.id] || [])[0];
  const file = o.best.title;
  let hold = null;
  if (HI[o.id]) hold = "already has a hires entry";
  else if (bucket === "sculpture") hold = "SCULPTURE — casts differ; a same-aspect match is not proof of the same bronze";
  else if (bucket === "paper") hold = "WORKS ON PAPER — impressions/states differ between institutions";
  else if (CAMERA.test(file)) hold = "camera filename — a gallery snapshot, not a flat reproduction";
  else if (DERIV.test(file)) hold = "filename marks a derivative or a depiction, not a reproduction";
  if (hold) { held++; holdLog.push({ o, hold, file }); continue; }

  const servedW = Math.min(SERVE_W, o.best.w);
  const servedH = Math.round(o.best.h * (servedW / o.best.w));
  added[o.id] = {
    src: "commons",
    img: "https://commons.wikimedia.org/wiki/Special:FilePath/" + encodeURIComponent(file.replace(/ /g, "_")) + "?width=" + servedW,
    file, title: TITLE[o.id] || o.title, conf: "high",
    from: { was: o.px, now: [o.best.w, o.best.h], served: [servedW, servedH], arDelta: +o.best.arDelta.toFixed(4), cat: o.cat },
  };
  sizes[o.id] = [servedW, servedH];
  applied++;
  console.log(`  x${(o.best.w / o.px[0]).toFixed(1).padStart(4)}  ${String(o.px[0]).padStart(4)}→${String(servedW).padEnd(5)} ${(o.toured ? "[tour] " : "       ")}${o.title.slice(0, 40)}`);
}

console.log(`\nHELD BACK (${held}) — need a human eye, listed worst-risk first:`);
holdLog.sort((a, b) => a.hold.localeCompare(b.hold)).forEach(h =>
  console.log(`  ${h.o.title.slice(0, 32).padEnd(34)} ${h.hold.slice(0, 52)}\n      ← ${h.file.slice(0, 74)}`));

console.log(`\napply ${applied} · hold ${held}`);
if (!WRITE) { console.log("(dry run — add --write)"); process.exit(0); }
const merged = { ...HI }; for (const [k, v] of Object.entries(added)) merged[k] = v;
const h1 = fs.readFileSync(path.join(HERE, "art_hires.js"), "utf8").split("window.CANVAS_HIRES")[0];
fs.writeFileSync(path.join(HERE, "art_hires.js"), h1 + "window.CANVAS_HIRES = " + JSON.stringify(merged, null, 1) + ";\n");
const ns = { ...SIZE }; for (const [k, v] of Object.entries(sizes)) ns[k] = v;
const h2 = fs.readFileSync(path.join(HERE, "art_imgsize.js"), "utf8").split("window.CANVAS_IMGSIZE")[0];
fs.writeFileSync(path.join(HERE, "art_imgsize.js"), h2 + "window.CANVAS_IMGSIZE = " + JSON.stringify(ns) + ";\n");
console.log(`WROTE art_hires.js (${Object.keys(HI).length} → ${Object.keys(merged).length})`);
