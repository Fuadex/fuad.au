// hires-wanted.js — write the hunting list: toured works still too small to zoom, with everything
// needed to look one up by hand (holder, inventory number, Commons category, museum page).
// Output is a *.local.md, which the root .gitignore keeps out of the repo.
const fs = require("fs"), path = require("path");
const HERE = __dirname;
const UA = { "User-Agent": "fuad.au-canvas/0.1 (https://fuad.au; fuadex@gmail.com)" };

const g = {};
for (const f of ["artworks.js", "art_imgsize.js", "art_hires.js", "art_inspect.js", "museums.js"])
  new Function("window", fs.readFileSync(path.join(HERE, f), "utf8") + "\nreturn window;")(g);
const W = g.CANVAS_ARTWORKS, SIZE = g.CANVAS_IMGSIZE, HI = g.CANVAS_HIRES, TOURS = g.CANVAS_INSPECT;
const MUS = {}; g.CANVAS_MUSEUMS.forEach(m => { MUS[m.id] = m; });

const scout = JSON.parse(fs.readFileSync(path.join(HERE, "..", "..", ".sptmp", "hires-scout.json"), "utf8"));
const byId = {}; scout.forEach(r => { byId[r.id] = r; });
let commons = [];
try { commons = JSON.parse(fs.readFileSync(path.join(HERE, "..", "..", ".sptmp", "hires-commons.json"), "utf8")); } catch (e) {}
const comById = {}; commons.forEach(c => { comById[c.id] = c; });

const want = W.filter(w => TOURS[w.id] && SIZE[w.id] && SIZE[w.id][0] < 2000 && !HI[w.id])
  .sort((a, b) => SIZE[a.id][0] - SIZE[b.id][0]);

(async () => {
  // resolve the holding-institution labels once
  const collQids = [...new Set(want.flatMap(w => (byId[w.id] || {}).collection || []))];
  const labels = {};
  for (let i = 0; i < collQids.length; i += 45) {
    const j = await (await fetch("https://www.wikidata.org/w/api.php?format=json&action=wbgetentities&props=labels&languages=en&ids=" + collQids.slice(i, i + 45).join("|"), { headers: UA })).json();
    for (const q of collQids.slice(i, i + 45)) { const e = j.entities && j.entities[q]; labels[q] = (e && e.labels && e.labels.en && e.labels.en.value) || q; }
    await new Promise(r => setTimeout(r, 400));
  }

  const rows = want.map(w => {
    const s = byId[w.id] || {}, c = comById[w.id] || {};
    const px = SIZE[w.id];
    return {
      px: px[0] + "×" + px[1],
      w0: px[0],
      title: w.title,
      artist: w.artist,
      holder: (s.collection || []).map(q => labels[q]).join(" / ") || (MUS[w.seenAt] ? MUS[w.seenAt].name : "—"),
      inv: (s.inv || []).join(", ") || "—",
      cat: (s.commonsCat || [])[0] || "—",
      qid: w.qid,
      note: c.bestAny && !c.best ? `Commons has ${c.bestAny.w}px but REFRAMED (${(c.bestAny.arDelta * 100).toFixed(0)}% aspect drift) — usable only if the tour boxes are recalibrated`
        : c.nFiles === 0 ? "Commons category empty"
          : c.cands && c.cands.length === 0 ? "nothing bigger in the Commons category"
            : !s.commonsCat || !s.commonsCat.length ? "no Commons category — try the museum directly"
              : "",
    };
  });

  const md = [
    "# Canvas — hi-res wanted",
    "",
    `${rows.length} toured works whose image is still under 2000px, so Study mode's crop boxes fly into an upscale.`,
    "Sorted worst first. `inv` is the museum's inventory number — searching a collection site by that",
    "beats searching by title, which collides constantly (Monet alone has dozens of near-identical titles).",
    "",
    "**If you find one:** the tour anchors are normalised 0–1 fractions, so a bigger scan of the SAME",
    "framing needs no rework at all. A differently-cropped photograph moves every box and needs a",
    "recalibration pass — worth it only if the gain is large.",
    "",
    "| px | work | artist | holder | inv. no. | Commons cat | note |",
    "|---|---|---|---|---|---|---|",
    ...rows.map(r => `| ${r.px} | ${r.title} | ${r.artist} | ${r.holder} | ${r.inv} | ${r.cat} | ${r.note} |`),
    "",
    "## Known dead ends",
    "- **Musée Marmottan Monet** — private foundation, no open API, no IIIF. The largest single cluster here.",
    "- **MoMA** — open data is metadata only; images are rights-restricted by policy, not access.",
    "- **National Gallery, London** — no open image API.",
    "- **Musée d'Orsay** — has IIIF, but it caps at 649×850, smaller than what we already serve.",
    "- **Europeana** — key is in .env and was tested: it returns Gallica book scans and Bildindex archive",
    "  photos for these works, not museum reproductions.",
    "- **Google Arts & Culture** — holds Art Camera gigapixel scans of much of this, Marmottan included,",
    "  and has no public API.",
  ].join("\n");

  const out = path.join(HERE, "HIRES_WANTED.local.md");
  fs.writeFileSync(out, md);
  console.log(`wrote ${out}  (${rows.length} works)`);
  console.log("\nworst 25:");
  rows.slice(0, 25).forEach(r => console.log(`  ${r.px.padStart(10)}  ${r.title.slice(0, 40).padEnd(42)}${r.holder.slice(0, 30)}`));
})();
