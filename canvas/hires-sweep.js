// hires-sweep.js — widen the Commons-category hunt from the 75 toured works to EVERY work whose
// source image is under 2000px. Read-only: writes candidates for review.
//
//   node hires-sweep.js   -> ../../.sptmp/hires-sweep.json
//
// Same two-stage logic as hires-commons.js, which returned 13 usable upgrades from 39 candidates:
//   1. read the work's Commons category (P373) — staying inside it keeps precision high, where a
//      title search would drag in details, frames and other paintings by the same hand;
//   2. keep files that are meaningfully bigger AND whose ASPECT matches, because tour anchors and
//      crop boxes are normalised fractions: same framing = free swap, different framing = every
//      box moves.
const fs = require("fs"), path = require("path");
const HERE = __dirname;
const UA = { "User-Agent": "fuad.au-canvas/0.1 (https://fuad.au; fuadex@gmail.com)" };
const CACHE = path.join(HERE, "commonscat_cache.json");
const load = (f, fb) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { return fb; } };
const catCache = load(CACHE, {});

const g = {};
for (const f of ["artworks.js", "art_imgsize.js", "art_hires.js", "art_inspect.js", "art-about.js"])
  new Function("window", fs.readFileSync(path.join(HERE, f), "utf8") + "\nreturn window;")(g);
const W = g.CANVAS_ARTWORKS, SIZE = g.CANVAS_IMGSIZE, HI = g.CANVAS_HIRES;
const TOURS = g.CANVAS_INSPECT, READS = g.CANVAS_ART_ABOUT;

// worth-fixing order: a tour flies into crop boxes, a read means the work is written about,
// floored means it mattered. Everything else still gets swept, just later.
const score = (w) => (TOURS[w.id] ? 4 : 0) + (READS[w.id] ? 2 : 0) + ((w.floored || w.favorite) ? 1 : 0);
const targets = W.filter(w => w.qid && SIZE[w.id] && SIZE[w.id][0] < 2000 && !HI[w.id])
  .sort((a, b) => score(b) - score(a) || SIZE[a.id][0] - SIZE[b.id][0]);
console.log(`${targets.length} works under 2000px with no hires source`);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function api(url) {
  for (let a = 0; a < 5; a++) {
    const res = await fetch(url, { headers: UA });
    const body = await res.text();
    await sleep(220);
    if (res.ok && body[0] === "{") { try { return JSON.parse(body); } catch (e) {} }
    await sleep(1500 * Math.pow(2, a));
  }
  return null;
}

const JUNK = /(detail|fragment|signature|frame|verso|recto|back|reverse|infrared|x-ray|xray|sketch|study for|in situ|gallery|museum|exhibition|plaque|label|comparison|animation|rawpixel|enhanced|restored|colou?ri[sz]ed|\.svg$|\.pdf$|\.webm$|\.ogv$|\.tif+$)/i;

(async () => {
  // ---- stage 1: Commons category per work (cached) ----
  const need = targets.filter(w => !(w.qid in catCache)).map(w => w.qid);
  console.log(`fetching P373 for ${need.length} works (${targets.length - need.length} cached)`);
  for (let i = 0; i < need.length; i += 45) {
    const j = await api("https://www.wikidata.org/w/api.php?action=wbgetentities&props=claims&format=json&ids=" + need.slice(i, i + 45).join("|"));
    for (const q of need.slice(i, i + 45)) {
      const ent = j && j.entities && j.entities[q];
      const c = ent && ent.claims && ent.claims.P373 && ent.claims.P373[0];
      catCache[q] = (c && c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value) || null;
    }
    fs.writeFileSync(CACHE, JSON.stringify(catCache));
    if (i % 450 === 0) console.log(`  P373 ${Math.min(i + 45, need.length)}/${need.length}`);
  }

  // ---- stage 2: hunt inside each category ----
  const withCat = targets.filter(w => catCache[w.qid]);
  console.log(`${withCat.length} have a Commons category — hunting\n`);
  const out = [];
  let free = 0, reframed = 0;
  for (let i = 0; i < withCat.length; i++) {
    const w = withCat[i], px = SIZE[w.id], aspect = px[0] / px[1];
    const j = await api("https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=categorymembers&gcmtitle=" +
      encodeURIComponent("Category:" + catCache[w.qid]) + "&gcmtype=file&gcmlimit=60&prop=imageinfo&iiprop=size");
    const files = Object.values((j && j.query && j.query.pages) || {}).map(p => {
      const ii = p.imageinfo && p.imageinfo[0];
      return ii && ii.width ? { title: String(p.title).replace(/^File:/, ""), w: ii.width, h: ii.height } : null;
    }).filter(Boolean);
    const cands = files.filter(f => !JUNK.test(f.title)).filter(f => f.w > px[0] * 1.25)
      .map(f => ({ ...f, arDelta: Math.abs((f.w / f.h) / aspect - 1) }))
      .sort((a, b) => a.arDelta - b.arDelta || b.w - a.w);
    const best = cands.filter(c => c.arDelta <= 0.02)[0] || null;
    if (best) free++; else if (cands[0]) reframed++;
    out.push({ id: w.id, title: w.title, artist: w.artist, cat: catCache[w.qid], px, aspect: +aspect.toFixed(4),
      toured: !!TOURS[w.id], read: !!READS[w.id], floored: !!(w.floored || w.favorite), best, bestAny: cands[0] || null });
    if (i % 40 === 0 || best) console.log(`  ${String(i + 1).padStart(4)}/${withCat.length}  ${best ? "WIN x" + (best.w / px[0]).toFixed(1) : "—".padEnd(7)}  ${w.title.slice(0, 42)}`);
    fs.writeFileSync(path.join(HERE, "..", "..", ".sptmp", "hires-sweep.json"), JSON.stringify(out, null, 1));
  }
  console.log(`\n── swept ${out.length} ──`);
  console.log(`  free swaps (bigger, same framing): ${free}`);
  console.log(`  bigger but reframed              : ${reframed}`);
  console.log(`  nothing bigger                   : ${out.length - free - reframed}`);
})();
