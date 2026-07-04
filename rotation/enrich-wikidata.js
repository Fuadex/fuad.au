// enrich-wikidata.js — batch Wikidata SPARQL keyed off the MBIDs already in
// artist-stats.json (Wikidata property P434 = MusicBrainz artist id). Keyless.
// Writes wikidata-cache.json: { name → { wd, inception, dissolved, formCity,
//   formCityQ, coords:[lon,lat], country, countryCode, members:[{name,gender}],
//   memberCount, femaleShare, fetched } }.
//
// What this ADDS over MusicBrainz (artist-origins.json already has country/area/
// begin/end/type/gender at the ARTIST level): band-member-level gender via
// P527→P21 (MB's gender is null for Groups), the exact formation *city* + its
// coordinates (P740→P625, finer + mappable than MB's begin-area string), the
// country of origin as an entity (P495), and a clean dissolution date (P576).
//
// SPARQL rate limit is generous but be polite: UA required, ~1.2s between queries.
// Batches ~40 MBIDs per query via VALUES. Cached + incremental; re-run resumes.
// Usage:  node enrich-wikidata.js [topN]   (default 2500)

const fs = require("fs");
const path = require("path");
const https = require("https");

const TOP_N = parseInt(process.argv[2], 10) || 2500;
const CACHE_PATH = path.join(__dirname, "wikidata-cache.json");
const STATS_PATH = path.join(__dirname, "artist-stats.json");
const INDEX_PATH = path.join(__dirname, "search-index.js");
const ENDPOINT = "https://query.wikidata.org/sparql";
const BATCH = 40;
const DELAY_MS = 1200;
const UA = "RotationEnricher/0.1 ( fuadex@gmail.com )";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function sparql(query) {
  const url = `${ENDPOINT}?format=json&query=${encodeURIComponent(query)}`;
  return new Promise((resolve) => {
    https.get(url, { headers: { "User-Agent": UA, Accept: "application/sparql-results+json" } }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, json: JSON.parse(body) }); }
        catch (e) { resolve({ status: res.statusCode, json: null }); }
      });
    }).on("error", () => resolve({ status: 0, json: null }));
  });
}

// One query resolves a whole batch of MBIDs → artist entity + its properties.
// Members explode into multiple rows; scalar props repeat per row and are folded
// back together in JS. Genres/influences are deliberately left out here to avoid a
// cartesian blow-up with members (they can be a later focused pass).
function buildQuery(mbids) {
  const values = mbids.map((m) => `"${m}"`).join(" ");
  return `SELECT ?mbid ?artist ?inception ?dissolved ?formLoc ?formLocLabel ?coords ?country ?countryLabel ?countryCode ?member ?memberLabel ?genderLabel WHERE {
  VALUES ?mbid { ${values} }
  ?artist wdt:P434 ?mbid .
  OPTIONAL { ?artist wdt:P571 ?inception. }
  OPTIONAL { ?artist wdt:P576 ?dissolved. }
  OPTIONAL { ?artist wdt:P740 ?formLoc. OPTIONAL { ?formLoc wdt:P625 ?coords. } }
  OPTIONAL { ?artist wdt:P495 ?country. OPTIONAL { ?country wdt:P297 ?countryCode. } }
  OPTIONAL { ?artist wdt:P527 ?member. OPTIONAL { ?member wdt:P21 ?gender. } }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,mul". }
}`;
}

const qid = (uri) => (uri ? uri.split("/").pop() : "");
const yr = (iso) => (iso ? String(iso).slice(0, 10) : "");
function parsePoint(wkt) {
  // "Point(lon lat)" → [lon, lat]
  const m = /Point\(([-\d.]+)\s+([-\d.]+)\)/.exec(wkt || "");
  return m ? [parseFloat(m[1]), parseFloat(m[2])] : null;
}

(async () => {
  const stats = JSON.parse(fs.readFileSync(STATS_PATH, "utf8"));

  // Rank by play-popularity via the search-index ordering (same as other enrichers).
  const idxSrc = fs.readFileSync(INDEX_PATH, "utf8");
  const start = idxSrc.indexOf("[", idxSrc.indexOf("ROTATION_SEARCH"));
  const rows = JSON.parse(idxSrc.slice(start, idxSrc.lastIndexOf("]") + 1));
  const ranked = rows.slice(0, TOP_N).map((r) => r[0]);

  const cache = fs.existsSync(CACHE_PATH) ? JSON.parse(fs.readFileSync(CACHE_PATH, "utf8")) : {};

  // Build mbid → name for artists we want and haven't fetched yet.
  const todo = [];
  const mbidToName = {};
  for (const name of ranked) {
    if (name in cache) continue;
    const mbid = stats[name] && stats[name].mbid;
    if (!mbid) continue;
    mbidToName[mbid] = name;
    todo.push(mbid);
  }
  console.log(`${ranked.length} target artists · ${Object.keys(cache).length} cached · ${todo.length} mbids to query · ${Math.ceil(todo.length / BATCH)} batches`);

  const today = new Date().toISOString().slice(0, 10);
  let done = 0, matched = 0;

  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH);
    const { status, json } = await sparql(buildQuery(batch));
    if (!json || !json.results) {
      console.log(`  batch ${i / BATCH + 1}: HTTP ${status} / no results — retrying once`);
      await sleep(DELAY_MS * 3);
      const retry = await sparql(buildQuery(batch));
      if (retry.json && retry.json.results) json && (json.results = retry.json.results);
      else { done += batch.length; continue; }
    }
    const results = (json && json.results && json.results.bindings) || [];

    // Fold exploded rows: one record per mbid, members collected into a set.
    const acc = {};
    for (const b of results) {
      const mbid = b.mbid && b.mbid.value;
      if (!mbid) continue;
      const name = mbidToName[mbid];
      if (!name) continue;
      let rec = acc[mbid];
      if (!rec) {
        rec = acc[mbid] = {
          wd: qid(b.artist && b.artist.value),
          inception: yr(b.inception && b.inception.value),
          dissolved: yr(b.dissolved && b.dissolved.value),
          formCity: (b.formLocLabel && b.formLocLabel.value) || "",
          formCityQ: qid(b.formLoc && b.formLoc.value),
          coords: parsePoint(b.coords && b.coords.value),
          country: (b.countryLabel && b.countryLabel.value) || "",
          countryCode: (b.countryCode && b.countryCode.value) || "",
          _members: {},
          fetched: today,
        };
      }
      const mq = qid(b.member && b.member.value);
      if (mq && !rec._members[mq]) {
        rec._members[mq] = {
          name: (b.memberLabel && b.memberLabel.value) || "",
          gender: (b.genderLabel && b.genderLabel.value) || "",
        };
      }
    }

    for (const [mbid, rec] of Object.entries(acc)) {
      const members = Object.values(rec._members).filter((m) => m.name && !/^Q\d+$/.test(m.name));
      delete rec._members;
      rec.members = members;
      rec.memberCount = members.length;
      const gendered = members.filter((m) => m.gender);
      const fem = members.filter((m) => /female|trans woman/i.test(m.gender)).length;
      rec.femaleShare = gendered.length ? Math.round((fem / gendered.length) * 100) / 100 : null;
      cache[mbidToName[mbid]] = rec;
      matched++;
    }

    done += batch.length;
    if ((i / BATCH) % 5 === 0) {
      fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 0), "utf8");
      console.log(`  ${done}/${todo.length} queried · ${matched} matched to a Wikidata entity`);
    }
    await sleep(DELAY_MS);
  }

  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 0), "utf8");
  console.log(`done: ${done} mbids queried · ${matched} matched · cache now ${Object.keys(cache).length} artists`);
})();
