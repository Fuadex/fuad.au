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
// Usage:  node enrich-wikidata.js [topN] [--refresh=N]   (default topN=2500, refresh=0)
//
// No-entity (null) caching: mbids that resolve to NO Wikidata entity are now cached as
// `null` so they don't re-query every week (previously they were re-fetched forever).
// Rolling refresh (--refresh=N): after the new-artist pass, refetch the N oldest-`fetched`
// mbids so dissolutions / new members / gained entities reach the frozen cache. Candidates
// are ranked by (priority-class, fetched asc) and refetched in the same 40-per-batch VALUES
// queries: class 0 = ENDED (artist-origins.json `ended`) OR top-500-by-plays, class 1 = rest
// with an entity, class 2 = null (no-entity) rows — a null can gain an entity later, so it's
// refreshed, just LAST. Default 0 keeps local one-off runs behaving exactly as before.

const fs = require("fs");
const path = require("path");
const https = require("https");

const args = process.argv.slice(2);
const TOP_N = parseInt(args.find(a => /^\d+$/.test(a)), 10) || 2500;
const REFRESH_ARG = args.find(a => /^--refresh=/.test(a));
const REFRESH_N = REFRESH_ARG ? Math.max(0, parseInt(REFRESH_ARG.split("=")[1], 10) || 0) : 0;
const CACHE_PATH = path.join(__dirname, "wikidata-cache.json");
const STATS_PATH = path.join(__dirname, "artist-stats.json");
const ORIGINS_PATH = path.join(__dirname, "artist-origins.json");
const INDEX_PATH = path.join(__dirname, "search-index.js");
const ENDPOINT = "https://query.wikidata.org/sparql";
const BATCH = 40;
const TOP_PLAYS = 500; // top-N-by-plays that share priority class 0 with ended artists
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
  const origins = fs.existsSync(ORIGINS_PATH) ? JSON.parse(fs.readFileSync(ORIGINS_PATH, "utf8")) : {};

  // Rank by play-popularity via the search-index ordering (same as other enrichers).
  const idxSrc = fs.readFileSync(INDEX_PATH, "utf8");
  const start = idxSrc.indexOf("[", idxSrc.indexOf("ROTATION_SEARCH"));
  const rows = JSON.parse(idxSrc.slice(start, idxSrc.lastIndexOf("]") + 1));
  const ranked = rows.slice(0, TOP_N).map((r) => r[0]);
  const topPlaysSet = new Set(rows.slice(0, TOP_PLAYS).map((r) => r[0]));

  const cache = fs.existsSync(CACHE_PATH) ? JSON.parse(fs.readFileSync(CACHE_PATH, "utf8")) : {};
  const today = new Date().toISOString().slice(0, 10);
  let done = 0, matched = 0;

  // Process one batch of mbids: fold rows, write a record per matched mbid, and cache
  // `null` for every mbid in the batch that returned NO entity (no-entity caching).
  // `mbidToName` maps the batch's mbids back to artist names. Returns #matched in batch.
  async function runBatch(batch, mbidToName, label) {
    const { status, json } = await sparql(buildQuery(batch));
    let payload = json;
    if (!payload || !payload.results) {
      console.log(`  ${label}: HTTP ${status} / no results — retrying once`);
      await sleep(DELAY_MS * 3);
      const retry = await sparql(buildQuery(batch));
      if (retry.json && retry.json.results) payload = retry.json;
      else return 0; // give up on this batch; leave entries as-is for next run
    }
    const results = (payload && payload.results && payload.results.bindings) || [];

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

    let batchMatched = 0;
    for (const [mbid, rec] of Object.entries(acc)) {
      const members = Object.values(rec._members).filter((m) => m.name && !/^Q\d+$/.test(m.name));
      delete rec._members;
      rec.members = members;
      rec.memberCount = members.length;
      const gendered = members.filter((m) => m.gender);
      const fem = members.filter((m) => /female|trans woman/i.test(m.gender)).length;
      rec.femaleShare = gendered.length ? Math.round((fem / gendered.length) * 100) / 100 : null;
      cache[mbidToName[mbid]] = rec;
      batchMatched++;
    }
    // no-entity caching: any mbid in the batch that matched nothing is cached as null so
    // it won't be re-queried every run. Refresh gives nulls lower priority (class 2).
    for (const mbid of batch) {
      const name = mbidToName[mbid];
      if (!(mbid in acc)) cache[name] = null;
    }
    matched += batchMatched;
    return batchMatched;
  }

  // Run a list of mbids in BATCH-sized queries (shared by new-artist + refresh passes).
  async function runAll(mbids, mbidToName, tag) {
    for (let i = 0; i < mbids.length; i += BATCH) {
      const batch = mbids.slice(i, i + BATCH);
      await runBatch(batch, mbidToName, `${tag} batch ${i / BATCH + 1}`);
      done += batch.length;
      if ((i / BATCH) % 5 === 0) {
        fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 0), "utf8");
        console.log(`  ${tag}: ${Math.min(i + BATCH, mbids.length)}/${mbids.length} queried · ${matched} matched`);
      }
      await sleep(DELAY_MS);
    }
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 0), "utf8");
  }

  // ---- new-artist pass: ranked artists not yet in cache (null counts as "in cache") ----
  const todo = [];
  const mbidToName = {};
  for (const name of ranked) {
    if (name in cache) continue; // includes null-cached (no-entity) artists → skipped
    const mbid = stats[name] && stats[name].mbid;
    if (!mbid) continue;
    mbidToName[mbid] = name;
    todo.push(mbid);
  }
  console.log(`${ranked.length} target artists · ${Object.keys(cache).length} cached · ${todo.length} mbids to query · ${Math.ceil(todo.length / BATCH)} batches · refresh=${REFRESH_N}`);
  await runAll(todo, mbidToName, "new");
  console.log(`new-artist pass done: ${done} mbids queried · ${matched} matched · cache now ${Object.keys(cache).length} artists`);

  // ---- rolling-refresh pass ----
  if (REFRESH_N > 0) {
    const isEnded = (name) => !!(origins[name] && origins[name].ended);
    // priority-class: 0 = ended/top-500 with entity, 1 = other with entity, 2 = null (no-entity)
    const priClass = (name, rec) => {
      if (rec === null) return 2;
      return (isEnded(name) || topPlaysSet.has(name)) ? 0 : 1;
    };
    const refreshCands = Object.keys(cache)
      .filter((name) => stats[name] && stats[name].mbid)
      .map((name) => {
        const rec = cache[name];
        return { name, mbid: stats[name].mbid, pc: priClass(name, rec), fetched: (rec && rec.fetched) || "" };
      })
      // (priority-class asc, fetched-date asc); null rows have fetched "" → sort first
      // within class 2 but the class ordering keeps them behind all entity rows.
      .sort((a, b) => (a.pc - b.pc) || (a.fetched < b.fetched ? -1 : a.fetched > b.fetched ? 1 : 0))
      .slice(0, REFRESH_N);

    const refMbids = [];
    const refMbidToName = {};
    for (const c of refreshCands) { refMbids.push(c.mbid); refMbidToName[c.mbid] = c.name; }
    const c0 = refreshCands.filter((c) => c.pc === 0).length;
    const c2 = refreshCands.filter((c) => c.pc === 2).length;
    console.log(`refresh: ${refreshCands.length} entries (${c0} class-0 ended/top${TOP_PLAYS}, ${refreshCands.length - c0 - c2} class-1 tail, ${c2} class-2 null) · ${Math.ceil(refMbids.length / BATCH)} batches`);
    const before = matched;
    await runAll(refMbids, refMbidToName, "refresh");
    console.log(`refresh pass done: ${refMbids.length} mbids refetched · ${matched - before} matched an entity`);
  }

  console.log(`done: ${done} mbids queried · ${matched} matched · cache now ${Object.keys(cache).length} artists`);
})();
