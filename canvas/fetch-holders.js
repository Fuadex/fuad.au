// fetch-holders.js — WHERE an unseen work hangs, so the pilgrimage can say "go here to see it".
//
// The canon's `seenAt` answers "where did Fuad stand". That is the wrong question for a work he
// has NOT seen. This resolves the artwork's Wikidata COLLECTION (P195) into a real institution
// with a place on the map, written to art_holders.js:
//
//   window.CANVAS_HOLDERS = {
//     works:  { <work id>: <holder qid> },
//     places: { <holder qid>: { name, city, country, lat, lon, museumId? } },
//     lists:  { <work id>: [<holder qid>, ...] }   // every collection claim, unpicked
//   }
//
// `museumId` is set when the holder is already a museum in museums.js, so the map can merge a
// wanted work into the city bubble Fuad has actually visited rather than drawing a second pin.
//
// Caveat carried into the UI copy: P195 says where a work is CATALOGUED, not that it is on
// display. "Held by" is honest; "you will see it there" is not.
//
// SEEDING FROM ART_DATA + THE FULL LIST (2026-09-10) — `works` above only ever got built from
// the `unseen` loop below, so a SEEN work never got a holder even when art_data.js already
// carries its P195 collection list, and a work whose list has more than one claim (a cast, a
// print run, a composition study) only ever contributed its single winner. Two fixes, additive
// only — this run NEVER rewrites a `works` or `places` value a prior run already wrote:
//   1. Every canon work still missing from `works`, seen or unseen, with a non-empty
//      art_data.js `collectionQids`, gets seeded: filter DENY_HOLDERS, then prefer a qid that
//      is already a museum in museums.js (directly or via HOLDER_ALIASES) over the first listed
//      claim — a Wikidata list order is not curation, a museum match is. If every candidate is
//      denied (the Makart's own two claims both are), the work stays honestly holderless.
//   2. `lists` keeps every work's full collectionQids verbatim, uncut by DENY_HOLDERS or the
//      pick above, whenever it has 2+ entries — so the multi-valued P195 fact survives on disk
//      even though `works` still names only the one place a trip would go.
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
// HOLDER QID ALIASES (2026-08-27) — a holder collection whose qid differs from the museum's
// own row: the Louvre's Department of Paintings and the Pompidou's Musée National d'Art
// Moderne are P195 values that must merge into the visited rows, not spawn phantom museums.
// Tate (Q430682) is deliberately NOT aliased — the org qid can't pick Britain vs Modern.
const HOLDER_ALIASES = { Q3044768: "louvre", Q1895953: "pompidou" };
for (const [q, id] of Object.entries(HOLDER_ALIASES)) {
  const m = MUS.find(x => x.id === id);
  if (m && !musByQid[q]) musByQid[q] = m;
}

// Everything Fuad has not actually stood in front of: an explicit wish, or a sighting he is not
// sure of. Both belong on the pilgrimage (Fuad 2026-08-19).
const unseen = W.filter(w => w.wish || w.seenConfidence === "unsure");
// HISTORIC HOLDERS ARE NOT DESTINATIONS (Fuad 2026-08-22: "a country called GERMAN REICH on the
// map — but it's Linz"). P195 lists every collection a work ever passed through, and taking the
// first claim blindly once sent the Makart to the Führermuseum — an institution that was never
// built, in a country that no longer exists. No trip can end there. Denied qids fall through to
// the next collection claim or to none, which honestly reads "home unknown".
const DENY_HOLDERS = new Set([
  "Q475667",   // Führermuseum, Linz — planned, never built; a looting label, not an address
  "Q1053735",  // Munich Central Collecting Point — dissolved 1949, restitution way-station
]);
// PSEUDO-QID HOLDERS (2026-08-28) — works ingested straight from a museum's own catalogue
// carry a pseudo qid (`met-<objectid>`, `nga-<objectid>`) and never enter the Wikidata P195
// flow, so they sat holder-less even though the holder is IN THE ID. The prefix is the claim.
// (The remaining holder-less residue is honest: P195 snaktype "somevalue" = private collection.)
const PSEUDO_HOLDERS = { "met-": "Q160236", "nga-": "Q214867" };
const holderOf = (w) => {
  const pfx = w.qid && Object.keys(PSEUDO_HOLDERS).find(p => w.qid.startsWith(p));
  if (pfx) return PSEUDO_HOLDERS[pfx];
  const d = AD[w.id] || {};
  const cands = [...(d.collectionQids || []), d.locationQid].filter(Boolean);
  return cands.find(q => !DENY_HOLDERS.has(q)) || null;
};
// Load the file this script itself generates. Every write below is additive onto it — a rerun
// must never change a `works` or `places` value that is already sitting in art_holders.js.
const g2 = {};
try { new Function("window", fs.readFileSync(path.join(HERE, "art_holders.js"), "utf8") + "\nreturn window;")(g2); } catch (e) {}
const PRIOR = g2.CANVAS_HOLDERS || { works: {}, places: {} };

const works = { ...PRIOR.works };

// TASK 1 (2026-09-10): seed the works this file's own loop below never reaches — anything
// already `seen` is invisible to the `unseen` filter, so it never got a holder even when
// art_data.js has one sitting right there. Runs BEFORE the unseen/P195 loop so its museum-first
// pick is the one that lands, not that loop's plain "first candidate" fallback.
let seededByMuseum = 0, seededByFirst = 0, seededNone = 0;
for (const w of W) {
  if (works[w.id]) continue;
  const raw = (AD[w.id] && AD[w.id].collectionQids) || [];
  if (!raw.length) continue;
  const cq = raw.filter(q => !DENY_HOLDERS.has(q));
  if (!cq.length) { seededNone++; continue; } // every claim denied (the Makart) — stays holderless
  const musPick = cq.find(q => musByQid[q]);
  works[w.id] = musPick || cq[0];
  if (musPick) seededByMuseum++; else seededByFirst++;
}

// TASK 2 (2026-09-10): P195 is multi-valued — 447 canon works carry 2+ collection claims (casts,
// print runs, composition studies). `works` above still names only the one a trip would go to;
// `lists` keeps the full claim list, untouched by DENY_HOLDERS or the museum-first pick, so the
// multi-valued fact isn't lost to a single winner.
const lists = {};
for (const w of W) {
  const cq = (AD[w.id] && AD[w.id].collectionQids) || [];
  if (cq.length >= 2) lists[w.id] = cq.slice();
}

// Original P195/pseudo-qid/locationQid pass, unchanged — now just guarded so it only fills what
// the seed pass above didn't touch (pseudo-qid works and locationQid-only works have no
// collectionQids for that pass to seed from, so this is still load-bearing).
for (const w of unseen) { if (works[w.id]) continue; const q = holderOf(w); if (q) works[w.id] = q; }
const qids = [...new Set(Object.values(works))];
console.log(`${unseen.length} unseen works · ${Object.keys(works).length} with a holder · ${qids.length} distinct institutions`);
console.log(`seeded from art_data: ${seededByMuseum} by museum match, ${seededByFirst} by first listed, ${seededNone} fully denied · lists: ${Object.keys(lists).length}`);

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
// ⚠ Wikidata has been MIGRATING institution names off the `en` label onto `mul`, the
// multilingual label that serves every language at once. Reading only `en` returns nothing for
// those, and the caller then falls back to writing the bare QID as the name — which is how
// art_holders.js ended up with five places called things like "Q1117704" (the Indianapolis Museum
// of Art), feeding a raw qid into a candidate row where a museum name belongs. Try `mul` next,
// then any label at all: a museum's name in its own language beats no name.
const LANGS = ["en", "mul", "fr", "de", "nl", "it", "es", "sv", "pl", "da", "no", "fi", "ru"];
const labelOf = (ent) => {
  const L = ent && ent.labels;
  if (!L) return undefined;
  for (const k of LANGS) if (L[k] && L[k].value) return L[k].value;
  const first = Object.values(L)[0];
  return first && first.value;
};

(async () => {
  const need = qids.filter(q => !(q in cache));
  console.log(`fetching ${need.length} institutions (${qids.length - need.length} cached)`);
  for (let i = 0; i < need.length; i += 45) {
    const batch = need.slice(i, i + 45);
    const j = await api("https://www.wikidata.org/w/api.php?action=wbgetentities&props=claims|labels&languages=en|mul|fr|de|nl|it|es|sv|pl|da|no|fi|ru&format=json&ids=" + batch.join("|"));
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
    const j = await api("https://www.wikidata.org/w/api.php?action=wbgetentities&props=claims|labels&languages=en|mul|fr|de|nl|it|es|sv|pl|da|no|fi|ru&format=json&ids=" + batch.join("|"));
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
  // Start from the prior file's places verbatim — same rule as `works` above, a rerun only adds.
  const places = { ...PRIOR.places };
  let placed = 0, unplaced = 0, mergedIntoCanon = 0, newPlaces = 0;
  for (const q of qids) {
    if (places[q]) { placed++; if (musByQid[q]) mergedIntoCanon++; continue; }
    const h = cache[q]; if (!h) { unplaced++; continue; }
    const city = h.cityQid && cache[h.cityQid] ? cache[h.cityQid] : null;
    const country = h.countryQid && cache[h.countryQid] ? cache[h.countryQid] : null;
    const lat = h.lat != null ? h.lat : (city ? city.lat : null);
    const lon = h.lon != null ? h.lon : (city ? city.lon : null);
    const m = musByQid[q];
    if (m) mergedIntoCanon++;
    if (lat == null) { unplaced++; continue; }
    placed++; newPlaces++;
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
    "// `works` also covers SEEN works now (2026-09-10), seeded straight from art_data.js's\n" +
    "// collectionQids when the P195 pass above never had a reason to look at them; the pick\n" +
    "// prefers a museums.js institution over Wikidata's listed order. `lists` keeps every work's\n" +
    "// full collectionQids (2+ claims only) so the multi-valued fact isn't lost to that one pick.\n" +
    "window.CANVAS_HOLDERS = " + JSON.stringify({ works, places, lists }) + ";\n", "utf8");

  const perPlace = {};
  for (const [id, q] of Object.entries(works)) if (places[q]) perPlace[q] = (perPlace[q] || 0) + 1;
  console.log(`\ninstitutions placed on the map: ${placed} (${newPlaces} new) · unplaced (no coords): ${unplaced} · already a canon museum: ${mergedIntoCanon}`);
  console.log(`works that can now be located: ${Object.entries(works).filter(([, q]) => places[q]).length} of ${unseen.length}`);
  console.log(`\nwhere the pilgrimage actually is:`);
  Object.entries(perPlace).sort((a, b) => b[1] - a[1]).slice(0, 20)
    .forEach(([q, n]) => console.log(`  ${String(n).padStart(4)}  ${places[q].name}${places[q].city ? " · " + places[q].city : ""}`));
})();
