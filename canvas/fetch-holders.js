// fetch-holders.js — WHERE an unseen work hangs, so the pilgrimage can say "go here to see it".
//
// The canon's `seenAt` answers "where did Fuad stand". That is the wrong question for a work he
// has NOT seen. This resolves the artwork's Wikidata COLLECTION (P195) into a real institution
// with a place on the map, written to art_holders.js:
//
//   window.CANVAS_HOLDERS = {
//     works:  { <work id>: <holder qid> },
//     places: { <holder qid>: { name, city, country, lat, lon, museumId? } }
//   }
//
// `museumId` is set when the holder is already a museum in museums.js, so the map can merge a
// wanted work into the city bubble Fuad has actually visited rather than drawing a second pin.
//
// Caveat carried into the UI copy: P195 says where a work is CATALOGUED, not that it is on
// display. "Held by" is honest; "you will see it there" is not.
const fs = require("fs"), path = require("path");
const HERE = __dirname;
const UA = { "User-Agent": "fuad.au-canvas/0.1 (https://fuad.au; fuadex@gmail.com)" };
const CACHE = path.join(HERE, "holders_cache.json");
const load = (f, fb) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { return fb; } };
const cache = load(CACHE, {});

const g = {};
for (const f of ["artworks.js", "art_data.js", "museums.js"])
  new Function("window", fs.readFileSync(path.join(HERE, f), "utf8") + "\nreturn window;")(g);
const W = g.CANVAS_ARTWORKS, AD = g.CANVAS_ART_DATA.artworks, MUS = g.CANVAS_MUSEUMS;
const musByQid = {}; MUS.forEach(m => { if (m.qid) musByQid[m.qid] = m; });

// Everything Fuad has not actually stood in front of: an explicit wish, or a sighting he is not
// sure of. Both belong on the pilgrimage (Fuad 2026-08-19).
const unseen = W.filter(w => w.wish || w.seenConfidence === "unsure");
const holderOf = (w) => {
  const d = AD[w.id] || {};
  return (d.collectionQids && d.collectionQids[0]) || d.locationQid || null;
};
const works = {};
for (const w of unseen) { const q = holderOf(w); if (q) works[w.id] = q; }
const qids = [...new Set(Object.values(works))];
console.log(`${unseen.length} unseen works · ${Object.keys(works).length} with a holder · ${qids.length} distinct institutions`);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function api(url) {
  for (let a = 0; a < 6; a++) {
    const res = await fetch(url, { headers: UA });
    const body = await res.text();
    await sleep(300);
    if (res.ok && body[0] === "{") { try { return JSON.parse(body); } catch (e) {} }
    await sleep(2000 * Math.pow(2, a));
  }
  return null;
}
const val = (ent, p) => { const c = ent && ent.claims && ent.claims[p] && ent.claims[p][0]; return c && c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value; };
const labelOf = (ent) => ent && ent.labels && ent.labels.en && ent.labels.en.value;

(async () => {
  const need = qids.filter(q => !(q in cache));
  console.log(`fetching ${need.length} institutions (${qids.length - need.length} cached)`);
  for (let i = 0; i < need.length; i += 45) {
    const batch = need.slice(i, i + 45);
    const j = await api("https://www.wikidata.org/w/api.php?action=wbgetentities&props=claims|labels&languages=en&format=json&ids=" + batch.join("|"));
    for (const q of batch) {
      const e = j && j.entities && j.entities[q];
      if (!e) { cache[q] = null; continue; }
      const coord = val(e, "P625");
      cache[q] = {
        name: labelOf(e) || q,
        countryQid: (val(e, "P17") || {}).id || null,
        cityQid: (val(e, "P131") || {}).id || null,
        lat: coord ? coord.latitude : null,
        lon: coord ? coord.longitude : null,
      };
    }
    fs.writeFileSync(CACHE, JSON.stringify(cache));
    console.log(`  ${Math.min(i + 45, need.length)}/${need.length}`);
  }

  // resolve country + city labels (and inherit coordinates from the city when the museum has none)
  const secondary = [...new Set(qids.flatMap(q => cache[q] ? [cache[q].countryQid, cache[q].cityQid] : []).filter(Boolean))].filter(q => !(q in cache));
  console.log(`resolving ${secondary.length} country/city entities`);
  for (let i = 0; i < secondary.length; i += 45) {
    const batch = secondary.slice(i, i + 45);
    const j = await api("https://www.wikidata.org/w/api.php?action=wbgetentities&props=claims|labels&languages=en&format=json&ids=" + batch.join("|"));
    for (const q of batch) {
      const e = j && j.entities && j.entities[q];
      const coord = e && val(e, "P625");
      cache[q] = e ? { name: labelOf(e) || q, iso: val(e, "P297") || null, lat: coord ? coord.latitude : null, lon: coord ? coord.longitude : null } : null;
    }
    fs.writeFileSync(CACHE, JSON.stringify(cache));
  }

  // P131 returns the administrative unit a building sits in, so museums come back filed under
  // boroughs, arrondissements and parks. Fine for a database, wrong for a sentence that reads
  // "where this work lives" — nobody says a Tate work is in the City of Westminster.
  const CITY_FIX = {
    "City of Westminster": "London", "Royal Borough of Kensington and Chelsea": "London",
    "South Kensington": "London", "Camden": "London", "Southwark": "London",
    "City of London": "London", "Bloomsbury": "London", "Millbank": "London",
    "Manhattan": "New York", "Brooklyn": "New York", "Upper East Side": "New York",
    "Saint-Germain-l'Auxerrois": "Paris", "Ueno-kōen": "Tokyo", "Kitanomaru Park": "Tokyo",
    "Taitō": "Tokyo", "Chiyoda": "Tokyo", "Minato": "Tokyo", "Sumida": "Tokyo",
    "Victoria": "Melbourne", "Museumsinsel": "Berlin", "Mitte": "Berlin",
    "Innere Stadt": "Vienna", "Maxvorstadt": "Munich",
  };
  const fixCity = (c) => (c && CITY_FIX[c]) || c;
  const places = {};
  let placed = 0, unplaced = 0, mergedIntoCanon = 0;
  for (const q of qids) {
    const h = cache[q]; if (!h) { unplaced++; continue; }
    const city = h.cityQid && cache[h.cityQid] ? cache[h.cityQid] : null;
    const country = h.countryQid && cache[h.countryQid] ? cache[h.countryQid] : null;
    const lat = h.lat != null ? h.lat : (city ? city.lat : null);
    const lon = h.lon != null ? h.lon : (city ? city.lon : null);
    const m = musByQid[q];
    if (m) mergedIntoCanon++;
    if (lat == null) { unplaced++; continue; }
    placed++;
    places[q] = {
      name: m ? m.name : h.name,
      city: m ? m.city : fixCity(city ? city.name : null),
      country: m ? m.country : (country && country.iso ? String(country.iso).toLowerCase() : (country ? country.name : null)),
      lat, lon,
      ...(m ? { museumId: m.id } : {}),
    };
  }
  fs.writeFileSync(path.join(HERE, "art_holders.js"),
    "// GENERATED by fetch-holders.js — where an UNSEEN work hangs (Wikidata P195 collection).\n" +
    "// Distinct from seenAt, which records where Fuad stood. `museumId` means the holder is\n" +
    "// already a museum in museums.js, so the map merges into that city rather than adding a pin.\n" +
    "// P195 is where a work is CATALOGUED — not a promise it is on display.\n" +
    "window.CANVAS_HOLDERS = " + JSON.stringify({ works, places }) + ";\n", "utf8");

  const perPlace = {};
  for (const [id, q] of Object.entries(works)) if (places[q]) perPlace[q] = (perPlace[q] || 0) + 1;
  console.log(`\ninstitutions placed on the map: ${placed} · unplaced (no coords): ${unplaced} · already a canon museum: ${mergedIntoCanon}`);
  console.log(`works that can now be located: ${Object.entries(works).filter(([, q]) => places[q]).length} of ${unseen.length}`);
  console.log(`\nwhere the pilgrimage actually is:`);
  Object.entries(perPlace).sort((a, b) => b[1] - a[1]).slice(0, 20)
    .forEach(([q, n]) => console.log(`  ${String(n).padStart(4)}  ${places[q].name}${places[q].city ? " · " + places[q].city : ""}`));
})();
