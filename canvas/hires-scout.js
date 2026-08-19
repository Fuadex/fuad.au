// hires-scout.js — for the toured works whose Commons source is too small to zoom, find out what
// higher-resolution routes actually exist. READ-ONLY: writes a report, changes nothing.
//
//   node hires-scout.js            -> ../../.sptmp/hires-scout.json  + a printed summary
//
// Routes probed, best precision first:
//   P6108  IIIF manifest            — a direct tile source, the ideal answer
//   P4765  Commons compatible image URL — an explicit "here is the big file" pointer
//   P18    ALL values, not just the first — Wikidata often lists a better scan second
//   P195 + P217  collection + inventory number — lets a museum API be queried by INVENTORY
//                rather than by title, which is the difference between a precise hit and a guess
//   Commons category (P373) — the folder that usually holds the largest scans
const fs = require("fs"), path = require("path");
const HERE = __dirname;
const UA = { "User-Agent": "fuad.au-canvas/0.1 (https://fuad.au; fuadex@gmail.com)" };

const g = {};
for (const f of ["artworks.js", "art_imgsize.js", "art_hires.js", "art_inspect.js", "art_data.js"])
  new Function("window", fs.readFileSync(path.join(HERE, f), "utf8") + "\nreturn window;")(g);
const WORKS = g.CANVAS_ARTWORKS, SIZE = g.CANVAS_IMGSIZE, HI = g.CANVAS_HIRES, TOURS = g.CANVAS_INSPECT;
const AD = g.CANVAS_ART_DATA.artworks;

const targets = WORKS.filter(w => TOURS[w.id] && SIZE[w.id] && SIZE[w.id][0] < 2000 && !HI[w.id] && w.qid);
console.log(`${targets.length} toured works below 2000px with no hires source\n`);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function api(url) {
  for (let a = 0; a < 6; a++) {
    const res = await fetch(url, { headers: UA });
    const body = await res.text();
    await sleep(300);
    if (res.ok && body[0] === "{") { try { return JSON.parse(body); } catch (e) {} }
    await sleep(2000 * Math.pow(2, a));
  }
  throw new Error("refused: " + url.slice(0, 90));
}
const vals = (ent, p) => ((ent && ent.claims && ent.claims[p]) || [])
  .map(c => c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value).filter(Boolean);

(async () => {
  const out = [];
  for (let i = 0; i < targets.length; i += 40) {
    const batch = targets.slice(i, i + 40);
    const j = await api("https://www.wikidata.org/w/api.php?action=wbgetentities&props=claims&format=json&ids=" + batch.map(w => w.qid).join("|"));
    for (const w of batch) {
      const ent = j.entities && j.entities[w.qid];
      const p18 = vals(ent, "P18").map(String);
      const rec = {
        id: w.id, title: w.title, artist: w.artist, qid: w.qid, seenAt: w.seenAt,
        px: SIZE[w.id], aspect: +(SIZE[w.id][0] / SIZE[w.id][1]).toFixed(4),
        iiif: vals(ent, "P6108").map(String),
        bigImageUrl: vals(ent, "P4765").map(String),
        p18All: p18,
        p18Extra: p18.length > 1 ? p18.slice(1) : [],
        commonsCat: vals(ent, "P373").map(String),
        collection: vals(ent, "P195").map(v => v.id),
        inv: vals(ent, "P217").map(String),
        describedAt: vals(ent, "P973").map(String),
      };
      out.push(rec);
    }
    console.log(`  ${Math.min(i + 40, targets.length)}/${targets.length}`);
  }

  const outPath = path.join(HERE, "..", "..", ".sptmp", "hires-scout.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 1));

  const n = (f) => out.filter(f).length;
  console.log(`\n── routes available across ${out.length} works ──`);
  console.log(`  P6108 IIIF manifest        : ${n(r => r.iiif.length)}`);
  console.log(`  P4765 big-image url        : ${n(r => r.bigImageUrl.length)}`);
  console.log(`  extra P18 values           : ${n(r => r.p18Extra.length)}`);
  console.log(`  Commons category (P373)    : ${n(r => r.commonsCat.length)}`);
  console.log(`  collection + inventory no. : ${n(r => r.collection.length && r.inv.length)}`);
  console.log(`  collection only            : ${n(r => r.collection.length && !r.inv.length)}`);
  console.log(`  NO route at all            : ${n(r => !r.iiif.length && !r.bigImageUrl.length && !r.p18Extra.length && !r.commonsCat.length && !r.collection.length)}`);

  // which institutions hold these? that decides which open APIs are worth wiring
  const byColl = {};
  for (const r of out) for (const c of r.collection) byColl[c] = (byColl[c] || 0) + 1;
  console.log(`\n── holding institutions (qid → count) ──`);
  console.log(Object.entries(byColl).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([q, c]) => `  ${c}× ${q}`).join("\n"));
  console.log(`\nwritten to .sptmp/hires-scout.json`);
})();
