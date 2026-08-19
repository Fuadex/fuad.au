// hires-commons.js — for each scouted low-res toured work, look inside its Commons CATEGORY for a
// bigger file of the same painting. Read-only: writes candidates for review, changes nothing.
//
// Why the category and not a text search: P18 points at ONE file, but institutions and the Google
// Art Project routinely upload a second, far larger scan into the same category. Staying inside
// the work's own category keeps precision high — a title search would drag in details, frames,
// gallery photos and other paintings by the same artist.
//
//   node hires-commons.js   -> ../../.sptmp/hires-commons.json
const fs = require("fs"), path = require("path");
const UA = { "User-Agent": "fuad.au-canvas/0.1 (https://fuad.au; fuadex@gmail.com)" };
const S = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", ".sptmp", "hires-scout.json"), "utf8"));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function api(url) {
  for (let a = 0; a < 5; a++) {
    const res = await fetch(url, { headers: UA });
    const body = await res.text();
    await sleep(250);
    if (res.ok && body[0] === "{") { try { return JSON.parse(body); } catch (e) {} }
    await sleep(1500 * Math.pow(2, a));
  }
  return null;
}

// files that are not the painting itself — details, frames, backs, signatures, room shots
const JUNK = /(detail|fragment|signature|frame|verso|recto|back|reverse|infrared|x-ray|xray|sketch|study for|in situ|gallery|museum|exhibition|plaque|label|comparison|animation|\.svg$|\.pdf$|\.webm$|\.ogv$)/i;

(async () => {
  const targets = S.filter(r => r.commonsCat.length);
  console.log(`${targets.length} works have a Commons category\n`);
  const out = [];
  for (const r of targets) {
    const cat = "Category:" + r.commonsCat[0];
    const j = await api("https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=categorymembers&gcmtitle=" +
      encodeURIComponent(cat) + "&gcmtype=file&gcmlimit=60&prop=imageinfo&iiprop=size");
    const pages = (j && j.query && j.query.pages) || {};
    const files = Object.values(pages).map(p => {
      const ii = p.imageinfo && p.imageinfo[0];
      return ii && ii.width ? { title: String(p.title).replace(/^File:/, ""), w: ii.width, h: ii.height } : null;
    }).filter(Boolean);
    // keep only plausible full-work images that beat what we have, and whose ASPECT matches —
    // a different aspect means a different framing, which would invalidate the tour's boxes.
    const aspect = r.px[0] / r.px[1];
    const cands = files
      .filter(f => !JUNK.test(f.title))
      .filter(f => f.w > r.px[0] * 1.25)
      .map(f => ({ ...f, ar: f.w / f.h, arDelta: Math.abs((f.w / f.h) / aspect - 1) }))
      .sort((a, b) => a.arDelta - b.arDelta || b.w - a.w);
    const best = cands.filter(c => c.arDelta <= 0.02)[0] || null;   // <=2% aspect drift = same framing
    const bestAny = cands[0] || null;
    out.push({ id: r.id, title: r.title, artist: r.artist, cat: r.commonsCat[0], px: r.px, aspect: +aspect.toFixed(4), nFiles: files.length, best, bestAny, cands: cands.slice(0, 4) });
    const tag = best ? `WIN x${(best.w / r.px[0]).toFixed(1)} same-framing`
      : bestAny ? `bigger but REFRAMED (ar ${(bestAny.arDelta * 100).toFixed(0)}% off) — needs recalibration`
        : "nothing bigger";
    console.log(`${String(r.px[0]).padStart(5)}px  ${r.title.slice(0, 38).padEnd(40)} ${tag}`);
  }
  const outPath = path.join(__dirname, "..", "..", ".sptmp", "hires-commons.json");
  fs.writeFileSync(outPath, JSON.stringify(out, null, 1));
  const free = out.filter(o => o.best), reframed = out.filter(o => !o.best && o.bestAny);
  console.log(`\n── ${out.length} probed ──`);
  console.log(`  FREE swaps (bigger, same framing, tour boxes hold): ${free.length}`);
  console.log(`  bigger but reframed (needs box recalibration)     : ${reframed.length}`);
  console.log(`  nothing bigger in category                        : ${out.length - free.length - reframed.length}`);
  if (free.length) {
    console.log(`\nfree swaps:`);
    free.sort((a, b) => (b.best.w / b.px[0]) - (a.best.w / a.px[0]))
      .forEach(o => console.log(`  x${(o.best.w / o.px[0]).toFixed(1)}  ${o.px[0]}→${o.best.w}px  ${o.title.slice(0, 40)}`));
  }
  console.log(`\nwritten to .sptmp/hires-commons.json`);
})();
