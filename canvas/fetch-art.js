// fetch-art.js — Canvas's Wikidata/Commons enricher (Phase 1). No API key needed.
// Resolves museums + artworks + artists BY NAME (memory-drafted qids are verified, never
// trusted), pulls images (P18 → Commons FilePath thumb URLs), coordinates, life dates,
// movements. Cache-backed and resumable: wikidata_cache.json is committed so progress
// survives machine moves (culture's pattern). Output: art_data.js overlay keyed by id.
//   node fetch-art.js            — incremental (cache hits skipped)
//   node fetch-art.js --force    — refetch everything
const fs = require("fs"), path = require("path"), vm = require("vm");

const HERE = __dirname;
const CACHE_PATH = path.join(HERE, "wikidata_cache.json");
const OUT_PATH = path.join(HERE, "art_data.js");
const UA = "fuad.au-canvas/0.1 (https://fuad.au; fuadex@gmail.com)";
const FORCE = process.argv.includes("--force");

function evalFile(file, glob) {
  const ctx = { window: {} }; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(HERE, file), "utf8"), ctx, { filename: file });
  return ctx.window[glob];
}
const MUSEUMS = evalFile("museums.js", "CANVAS_MUSEUMS");
const ARTWORKS = evalFile("artworks.js", "CANVAS_ARTWORKS");

let cache = {};
try { cache = JSON.parse(fs.readFileSync(CACHE_PATH, "utf8")); } catch (e) {}
const saveCache = () => fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 1));

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function wd(params) {   // Wikidata action API, polite pace
  const url = "https://www.wikidata.org/w/api.php?format=json&" + new URLSearchParams(params);
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error("HTTP " + res.status + " for " + url.slice(0, 120));
  await sleep(250);
  return res.json();
}

async function search(query, limit = 6) {
  const key = "search:" + query;
  if (!FORCE && cache[key]) return cache[key];
  const j = await wd({ action: "wbsearchentities", search: query, language: "en", type: "item", limit });
  cache[key] = (j.search || []).map(s => ({ id: s.id, label: s.label, desc: s.description || "" }));
  saveCache();
  return cache[key];
}

async function entities(qids) {  // batched wbgetentities (claims + labels), ≤50 per call
  const need = FORCE ? qids : qids.filter(q => !cache["ent:" + q]);
  for (let i = 0; i < need.length; i += 50) {
    const batch = need.slice(i, i + 50);
    const j = await wd({ action: "wbgetentities", ids: batch.join("|"), props: "claims|labels|descriptions", languages: "en" });
    for (const q of batch) cache["ent:" + q] = j.entities && j.entities[q] ? j.entities[q] : null;
    saveCache();
  }
  const out = {}; for (const q of qids) out[q] = cache["ent:" + q]; return out;
}

const claim = (ent, p) => {
  const c = ent && ent.claims && ent.claims[p];
  return c && c[0] && c[0].mainsnak && c[0].mainsnak.datavalue ? c[0].mainsnak.datavalue.value : null;
};
const claimAll = (ent, p) => ((ent && ent.claims && ent.claims[p]) || [])
  .map(c => c.mainsnak && c.mainsnak.datavalue ? c.mainsnak.datavalue.value : null).filter(Boolean);
const commonsUrl = (file, w) =>
  "https://commons.wikimedia.org/wiki/Special:FilePath/" + encodeURIComponent(String(file).replace(/ /g, "_")) + "?width=" + w;
const yearOf = (t) => t && t.time ? parseInt(t.time.slice(1, 5), 10) : null;

// museum-ish / artwork-ish scoring for search disambiguation
const MUSEUMY = /museum|gallery|galerie|mus[ée]e|muzeum|nationalmuseum|centre|center/i;
const ARTY = /painting|drawing|sculpture|artwork|series|cycle|canvas/i;

(async () => {
  const out = { museums: {}, artworks: {}, artists: {} };
  const report = [];

  // ---- museums: resolve by name (+city hint), verify drafted qid ----
  for (const m of MUSEUMS) {
    if (m.noResolve) continue;
    const hits = await search(m.searchAs || m.name.replace(/\s*\(.*\)$/, ""));
    let pick = hits.find(h => MUSEUMY.test(h.desc) && h.desc.toLowerCase().includes(m.city.toLowerCase()))
            || hits.find(h => MUSEUMY.test(h.desc)) || hits[0] || null;
    if (!pick) { report.push(`museum ${m.id}: NO MATCH for "${m.name}"`); continue; }
    const ent = (await entities([pick.id]))[pick.id];
    const coord = claim(ent, "P625");
    out.museums[m.id] = {
      qid: pick.id, label: pick.label, desc: pick.desc,
      lat: coord ? coord.latitude : null, lng: coord ? coord.longitude : null,
      image: claim(ent, "P18") ? commonsUrl(claim(ent, "P18"), 640) : null,
    };
    if (m.qid && m.qid !== pick.id) report.push(`museum ${m.id}: drafted ${m.qid} → resolved ${pick.id} (${pick.label} — ${pick.desc})`);
  }

  // ---- artworks: resolve by title+artist where concrete; skip pure TBC bundles ----
  for (const a of ARTWORKS) {
    if (a.noResolve) continue;
    if (/^TBC/.test(a.title)) { report.push(`artwork ${a.id}: TBC title — skipped (recall-deck material)`); continue; }
    let pick = null;
    if (a.qid && a.qidTrusted) {
      pick = { id: a.qid, label: a.title, desc: "(trusted deck qid)" };   // deck qids came FROM Wikidata
    } else {
      const q = a.searchAs || (a.title.replace(/\s*\(.*\)$/, "") + " " + a.artist);
      let hits = await search(q);
      if (!hits.length) hits = await search(a.title.replace(/\s*\(.*\)$/, ""));
      pick = hits.find(h => ARTY.test(h.desc)) || hits[0] || null;
      if (!pick) { report.push(`artwork ${a.id}: NO MATCH for "${q}"`); continue; }
    }
    const ent = (await entities([pick.id]))[pick.id];
    const img = claim(ent, "P18");
    const coll = claimAll(ent, "P195").map(v => v.id);       // collection(s)
    const loc = claim(ent, "P276");                           // location
    out.artworks[a.id] = {
      qid: pick.id, label: pick.label, desc: pick.desc,
      img: img ? commonsUrl(img, 900) : null,
      imgGrid: img ? commonsUrl(img, 480) : null,
      imgZoom: img ? commonsUrl(img, 2000) : null,
      year: yearOf(claim(ent, "P571")),
      collectionQids: coll, locationQid: loc ? loc.id : null,
    };
    if (a.qid && a.qid !== pick.id) report.push(`artwork ${a.id}: drafted ${a.qid} → resolved ${pick.id} (${pick.label} — ${pick.desc})`);
    if (!img) report.push(`artwork ${a.id}: resolved ${pick.id} but NO IMAGE (P18) — text-forward card`);
  }

  // ---- artists: resolve the affinity list + everyone in the canon ----
  const artistNames = {};
  for (const a of ARTWORKS) if (a.artistId && a.artist && !/TBC/.test(a.artist)) artistNames[a.artistId] = a.artist.replace(/\s*\(.*\)$/, "");
  for (const [id, name] of Object.entries(artistNames)) {
    const hits = await search(name);
    const pick = hits.find(h => /painter|artist|sculptor|printmaker/i.test(h.desc)) || hits[0] || null;
    if (!pick) { report.push(`artist ${id}: NO MATCH for "${name}"`); continue; }
    const ent = (await entities([pick.id]))[pick.id];
    out.artists[id] = {
      qid: pick.id, label: pick.label, desc: pick.desc,
      born: yearOf(claim(ent, "P569")), died: yearOf(claim(ent, "P570")),
      image: claim(ent, "P18") ? commonsUrl(claim(ent, "P18"), 480) : null,
      movementQids: claimAll(ent, "P135").map(v => v.id),
    };
  }

  // ---- artist notable works (fame-ranked; feeds the artist pages' "majors you haven't met") ----
  async function sparql(q, tries = 3) {
    for (let t = 1; t <= tries; t++) {
      const res = await fetch("https://query.wikidata.org/sparql?query=" + encodeURIComponent(q), {
        headers: { "Accept": "application/sparql-results+json", "User-Agent": UA } });
      if (res.ok) { await sleep(600); return res.json(); }
      if (res.status === 429 || res.status === 503) { await sleep(4000 * t); continue; }
      throw new Error("HTTP " + res.status);
    }
    throw new Error("throttled");
  }
  for (const [id, art] of Object.entries(out.artists)) {
    const key = "notable:" + art.qid;
    if (FORCE || !cache[key]) {
      const q = `SELECT ?item ?itemLabel ?img ?links ?date WHERE {
        ?item wdt:P170 wd:${art.qid} ; wdt:P18 ?img ; wikibase:sitelinks ?links . FILTER(?links > 2)
        OPTIONAL { ?item wdt:P571 ?date }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en,fr,de,pl,ja,sv". }
      } ORDER BY DESC(?links) LIMIT 16`;
      try {
        const rows = (await sparql(q)).results.bindings, seenQ = {}, list = [];
        for (const b of rows) {
          const qq = b.item.value.split("/").pop();
          if (seenQ[qq]) continue; seenQ[qq] = 1;
          list.push({ qid: qq, title: b.itemLabel.value, year: b.date ? parseInt(b.date.value.slice(0, 4), 10) : null,
            img: commonsUrl(decodeURIComponent(b.img.value.split("/").pop()), 480) });
        }
        cache[key] = list; saveCache();
      } catch (e) { console.log(`  notable ${id}: ${e.message}`); cache[key] = []; saveCache(); }
    }
    art.notable = cache[key];
  }

  // ---- similar artists ("who's next"): influence links (P737 both ways) + teacher/student
  // (P1066 both ways) + shared-movement peers, fame-ranked. Feeds the artist-page strip. ----
  for (const [id, art] of Object.entries(out.artists)) {
    const key = "similar:" + art.qid;
    if (FORCE || !cache[key]) {
      const q = `SELECT DISTINCT ?a ?aLabel ?aDescription ?links WHERE {
        { wd:${art.qid} wdt:P737 ?a } UNION { ?a wdt:P737 wd:${art.qid} }
        UNION { wd:${art.qid} wdt:P1066 ?a } UNION { ?a wdt:P1066 wd:${art.qid} }
        UNION { ?a wdt:P135 ?m . wd:${art.qid} wdt:P135 ?m . ?a wdt:P106 ?occ . VALUES ?occ { wd:Q1028181 wd:Q1281618 } }
        ?a wikibase:sitelinks ?links . FILTER(?a != wd:${art.qid}) FILTER(?links > 25)
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en,fr,de,pl,ja,sv". }
      } ORDER BY DESC(?links) LIMIT 10`;
      try {
        const rows = (await sparql(q)).results.bindings, seenQ = {}, list = [];
        for (const b of rows) {
          const qq = b.a.value.split("/").pop();
          if (seenQ[qq]) continue; seenQ[qq] = 1;
          list.push({ qid: qq, label: b.aLabel.value, desc: b.aDescription ? b.aDescription.value : "" });
        }
        cache[key] = list; saveCache();
      } catch (e) { console.log(`  similar ${id}: ${e.message}`); cache[key] = []; saveCache(); }
    }
    // keep only visual artists — influence claims bring in poets and kings (Hesse, Bhumibol…)
    art.similar = (cache[key] || []).filter(s => !s.desc || /paint|sculpt|artist|printmak|engrav|illustrat|ukiyo/i.test(s.desc));
  }

  // ---- movement labels (artist context lines) ----
  const movQids = [...new Set(Object.values(out.artists).flatMap(a => a.movementQids || []))];
  const movEnts = await entities(movQids);
  out.movements = {};
  for (const q of movQids) {
    const e = movEnts[q];
    const L = e && e.labels && (e.labels.en || e.labels.fr);
    if (L) out.movements[q] = L.value;
  }

  const header = "// GENERATED by fetch-art.js — Wikidata/Commons enrichment keyed by canvas ids.\n" +
    "// Do not hand-edit; re-run the fetcher. Images are Commons Special:FilePath thumbs.\n";
  fs.writeFileSync(OUT_PATH, header + "window.CANVAS_ART_DATA = " + JSON.stringify(out) + ";\n");
  console.log(`art_data.js written: ${Object.keys(out.museums).length} museums · ${Object.keys(out.artworks).length} artworks · ${Object.keys(out.artists).length} artists`);
  console.log("\n--- REVIEW REPORT ---");
  for (const r of report) console.log(" ·", r);
})().catch(e => { console.error("FATAL", e.message); process.exit(1); });
