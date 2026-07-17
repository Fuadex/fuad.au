// fetch-museum-data.js — building facts + imagery for museum pages (keyless Wikidata).
// Resolves each museum to its Wikidata entity (search by name, sanity-checked by city in the
// description where possible), then pulls: P18 facade image, P5775 interior image, P571 founded,
// P84 architect(s), P149 architectural style, P1436 collection size, P1174 visitors/year,
// P856 official site. Emits museum_data.js (window.CANVAS_MUSEUM_DATA). Run per batch:
//   node fetch-museum-data.js <museumId> [<museumId> …]     (no args = the pilot list below)
const fs = require("fs"), path = require("path"), vm = require("vm");

const PILOT = ["met-nyc", "marmottan", "van-gogh-museum", "guggenheim", "belvedere",
  "orsay", "nationalmuseum", "frick", "nga-dc", "ngi"];
// searches that need a steer past ambiguous names
// hard qid pins — for names too ambiguous for search to resolve safely
const QID_PIN = {
  "national-gallery-london": "Q180788",
};
const SEARCH_HINT = {
  "belvedere": "Österreichische Galerie Belvedere",
  "nationalmuseum": "Nationalmuseum Stockholm",
  "nga-dc": "National Gallery of Art",
  "mnw": "National Museum in Warsaw",
  "national-gallery-london": "National Gallery",
  "rodin": "Musée Rodin",
  "nga-canberra": "National Gallery of Australia",
};

const w = {}; vm.runInNewContext(fs.readFileSync(path.join(__dirname, "museums.js"), "utf8"), { window: w });
const MUS = (w.CANVAS_MUSEUMS || w.MUSEUMS || []);
const byId = {}; for (const m of MUS) byId[m.id] = m;

const UA = { headers: { "User-Agent": "fuad.au-canvas/1.0 (personal gallery)" } };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const api = async (params) => {
  const u = "https://www.wikidata.org/w/api.php?format=json&" + new URLSearchParams(params);
  for (let tries = 0; ; tries++) {
    const r = await fetch(u, UA);
    if (r.ok) return r.json();
    if (r.status === 429 && tries < 5) { await sleep(15000 * (tries + 1)); continue; }
    throw new Error("wikidata " + r.status);
  }
};
const commons = (file, width) =>
  "https://commons.wikimedia.org/wiki/Special:FilePath/" + encodeURIComponent(file) + "?width=" + width;

const first = (claims, p) => {
  const c = claims[p] && claims[p][0] && claims[p][0].mainsnak;
  return c && c.datavalue ? c.datavalue.value : null;
};
const all = (claims, p) => (claims[p] || []).map(c => c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value).filter(Boolean);

async function labelOf(qids) {
  if (!qids.length) return {};
  const j = await api({ action: "wbgetentities", ids: qids.join("|"), props: "labels", languages: "en" });
  const out = {};
  for (const q of qids) out[q] = j.entities[q] && j.entities[q].labels.en ? j.entities[q].labels.en.value : null;
  return out;
}

(async () => {
  const ids = process.argv.slice(2).length ? process.argv.slice(2) : PILOT;
  const outPath = path.join(__dirname, "museum_data.js");
  let existing = {};
  if (fs.existsSync(outPath)) {
    const ew = {}; vm.runInNewContext(fs.readFileSync(outPath, "utf8"), { window: ew });
    existing = ew.CANVAS_MUSEUM_DATA || {};
  }
  for (const id of ids) {
    const m = byId[id];
    if (!m) { console.log(id, ": not in museums.js, skipped"); continue; }
    if (existing[id]) { console.log(id, ": already fetched, skip (pass the id explicitly to refresh)"); continue; }
    // search by the bare name — appending the city defeats wbsearchentities' label match
    let hit;
    if (QID_PIN[id]) hit = { id: QID_PIN[id], label: m.name, description: "(pinned)" };
    else {
      const q = SEARCH_HINT[id] || m.name;
      const s = await api({ action: "wbsearchentities", search: q, language: "en", type: "item", limit: 5 });
      hit = s.search && s.search[0];
      if (!hit) { console.log(id, ": no wikidata hit for", q); continue; }
    }
    await sleep(600);
    const cl = (await api({ action: "wbgetclaims", entity: hit.id })).claims || {};
    const archQ = all(cl, "P84").map(v => v.id).filter(Boolean);
    const styleQ = all(cl, "P149").map(v => v.id).filter(Boolean).slice(0, 1);
    await sleep(600);
    const labels = await labelOf([...archQ, ...styleQ]);
    const img = first(cl, "P18"), interior = first(cl, "P5775");
    const inception = first(cl, "P571");
    const collection = first(cl, "P1436"), visitors = first(cl, "P1174");
    existing[id] = {
      qid: hit.id,
      img: img ? commons(img, 640) : null,
      interior: interior ? commons(interior, 900) : null,
      founded: inception && inception.time ? parseInt(inception.time.slice(1, 5), 10) : null,
      architects: archQ.map(a => labels[a]).filter(Boolean).slice(0, 2),
      style: styleQ.length ? labels[styleQ[0]] : null,
      works: collection && collection.amount ? Math.round(Math.abs(parseFloat(collection.amount))) : null,
      visitors: visitors && visitors.amount ? Math.round(Math.abs(parseFloat(visitors.amount))) : null,
      site: first(cl, "P856"),
    };
    console.log(id, "→", hit.id, "|", hit.label, "|", hit.description || "");
    save(existing, outPath);   // checkpoint after every museum — a 429 crash loses nothing
    await sleep(5000);
  }
  save(existing, outPath);
  console.log("museum_data.js:", Object.keys(existing).length, "museums");
})();

function save(existing, outPath) {
  const keys = Object.keys(existing).sort();
  fs.writeFileSync(outPath,
    "// GENERATED by fetch-museum-data.js — building facts + imagery for museum pages.\n" +
    "window.CANVAS_MUSEUM_DATA = {\n" +
    keys.map(k => JSON.stringify(k) + ": " + JSON.stringify(existing[k])).join(",\n") +
    "\n};\n");
}
