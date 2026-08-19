// apply-hires-iiif.js — apply the museum IIIF sources that genuinely beat what we serve.
// Same aspect gate as the Commons pass: >2% drift means a different framing, which would move
// every normalised tour anchor, so it is held back for recalibration instead of swapped.
//   node apply-hires-iiif.js [--write]
const fs = require("fs"), path = require("path");
const HERE = __dirname;
const WRITE = process.argv.includes("--write");
const UA = { "User-Agent": "fuad.au-canvas/0.1 (https://fuad.au; fuadex@gmail.com)" };
const SERVE_W = 3000;

const g = {};
for (const f of ["artworks.js", "art_imgsize.js", "art_hires.js"])
  new Function("window", fs.readFileSync(path.join(HERE, f), "utf8") + "\nreturn window;")(g);
const HI = g.CANVAS_HIRES, SIZE = g.CANVAS_IMGSIZE;
const TITLE = {}; g.CANVAS_ARTWORKS.forEach(w => { TITLE[w.id] = w.title; });
const S = JSON.parse(fs.readFileSync(path.join(HERE, "..", "..", ".sptmp", "hires-scout.json"), "utf8"));

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function biggest(manifestUrl) {
  const j = await (await fetch(manifestUrl, { headers: UA })).json();
  const canvases = j.items || (j.sequences && j.sequences[0] && j.sequences[0].canvases) || [];
  let best = null;
  for (const c of canvases) {
    const anno = (c.items && c.items[0] && c.items[0].items && c.items[0].items[0]) || (c.images && c.images[0]);
    const body = anno && (anno.body || anno.resource);
    if (!body) continue;
    const w = body.width || c.width, h = body.height || c.height;
    const svc = (body.service || [])[0];
    const sid = svc && (svc.id || svc["@id"]);
    if (!best || (w || 0) > best.w) best = { w, h, id: body.id || body["@id"], service: sid };
  }
  return best;
}

(async () => {
  const added = {}, sizes = {};
  for (const r of S.filter(x => x.iiif.length)) {
    let b; try { b = await biggest(r.iiif[0]); } catch (e) { console.log(`  ERR ${r.title.slice(0, 34)}`); continue; }
    await sleep(350);
    if (!b || !b.w) { console.log(`  ?   ${r.title.slice(0, 34)} — no image in manifest`); continue; }
    const gain = b.w / r.px[0];
    const ar = b.w / b.h, arWas = r.px[0] / r.px[1];
    const drift = Math.abs(ar / arWas - 1);
    const existing = HI[r.id];
    if (gain < 1.25) { console.log(`  no  ${r.title.slice(0, 34).padEnd(36)} ${b.w}px vs ${r.px[0]}px — not bigger`); continue; }
    if (drift > 0.02) { console.log(`  HOLD ${r.title.slice(0, 33).padEnd(36)} ${b.w}px but ${(drift * 100).toFixed(0)}% aspect drift → recalibrate first`); continue; }
    if (existing && existing.src !== "commons") { console.log(`  skip ${r.title.slice(0, 34)} — hand-authored hires entry`); continue; }
    const servedW = Math.min(SERVE_W, b.w);
    const servedH = Math.round(b.h * (servedW / b.w));
    // IIIF Image API: {service}/full/{w},/0/default.jpg
    const img = b.service ? b.service.replace(/\/$/, "") + `/full/${servedW},/0/default.jpg` : b.id;
    added[r.id] = {
      src: "iiif", img, iiif: b.service ? b.service.replace(/\/$/, "") + "/info.json" : null,
      title: TITLE[r.id] || r.title, conf: "high",
      from: { was: r.px, now: [b.w, b.h], served: [servedW, servedH], arDelta: +drift.toFixed(4), manifest: r.iiif[0] },
    };
    sizes[r.id] = [servedW, servedH];
    const over = existing ? `  (replaces the ${existing.from ? existing.from.served[0] : "?"}px Commons pick)` : "";
    console.log(`  YES ${r.title.slice(0, 34).padEnd(36)} ${r.px[0]} → ${servedW}px${over}`);
  }
  console.log(`\n${Object.keys(added).length} to write`);
  if (!WRITE) { console.log("(dry run — add --write)"); return; }
  const merged = { ...HI }; for (const [k, v] of Object.entries(added)) merged[k] = v;
  const h1 = fs.readFileSync(path.join(HERE, "art_hires.js"), "utf8").split("window.CANVAS_HIRES")[0];
  fs.writeFileSync(path.join(HERE, "art_hires.js"), h1 + "window.CANVAS_HIRES = " + JSON.stringify(merged, null, 1) + ";\n");
  const ns = { ...SIZE }; for (const [k, v] of Object.entries(sizes)) ns[k] = v;
  const h2 = fs.readFileSync(path.join(HERE, "art_imgsize.js"), "utf8").split("window.CANVAS_IMGSIZE")[0];
  fs.writeFileSync(path.join(HERE, "art_imgsize.js"), h2 + "window.CANVAS_IMGSIZE = " + JSON.stringify(ns) + ";\n");
  console.log(`WROTE art_hires.js (${Object.keys(HI).length} → ${Object.keys(merged).length})`);
})();
