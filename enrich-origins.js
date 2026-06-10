// enrich-origins.js — fetch artist country/area from MusicBrainz using mbids already
// stored in artist-stats.json. Writes artist-origins.json: { name → { country, area, type, fetched } }.
// MusicBrainz rate limit: 1 req/sec, requires UA. No API key.
// Usage:  node enrich-origins.js [topN]   (default 2000)
// Cached + incremental. Artists without an mbid are skipped.

const fs = require("fs");
const path = require("path");
const https = require("https");

const TOP_N = parseInt(process.argv[2], 10) || 2000;
const CACHE_PATH = path.join(__dirname, "artist-origins.json");
const STATS_PATH = path.join(__dirname, "artist-stats.json");
const INDEX_PATH = path.join(__dirname, "search-index.js");
const DELAY_MS = 1100; // MusicBrainz: ~1 req/sec
const UA = "RotationEnricher/0.1 ( fuadex@gmail.com )";

function getJSON(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { "User-Agent": UA } }, (res) => {
      let body = "";
      res.on("data", (c) => body += c);
      res.on("end", () => { try { resolve({ status: res.statusCode, json: JSON.parse(body) }); } catch (e) { resolve({ status: res.statusCode, json: null }); } });
    }).on("error", () => resolve({ status: 0, json: null }));
  });
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchOrigin(mbid) {
  const u = `https://musicbrainz.org/ws/2/artist/${encodeURIComponent(mbid)}?fmt=json`;
  const { json } = await getJSON(u);
  if (!json) return { country: "", area: "", type: "" };
  // `country` is the ISO code (e.g. "JP", "AU"); `area.name` is the human form ("Japan");
  // `begin-area.name` is finer when it exists (e.g. "Tokyo"). type is "Group"/"Person".
  return {
    country: json.country || "",
    area: (json.area && json.area.name) || "",
    beginArea: (json["begin-area"] && json["begin-area"].name) || "",
    type: json.type || "",
  };
}

(async () => {
  const stats = fs.existsSync(STATS_PATH) ? JSON.parse(fs.readFileSync(STATS_PATH, "utf8")) : {};
  // Rank by play-popularity using search-index ordering for consistency with other enrichers.
  const idxSrc = fs.readFileSync(INDEX_PATH, "utf8");
  const eq = idxSrc.indexOf("ROTATION_SEARCH");
  const start = idxSrc.indexOf("[", eq);
  const rows = JSON.parse(idxSrc.slice(start, idxSrc.lastIndexOf("]") + 1));
  const ranked = rows.slice(0, TOP_N).map(r => r[0]);

  const cache = fs.existsSync(CACHE_PATH) ? JSON.parse(fs.readFileSync(CACHE_PATH, "utf8")) : {};
  const todo = ranked.filter(name => !(name in cache) && stats[name] && stats[name].mbid);
  const noMbid = ranked.filter(name => !stats[name] || !stats[name].mbid).length;
  console.log(`${ranked.length} target artists · ${todo.length} to fetch · ${Object.keys(cache).length} cached · ${noMbid} no-mbid skipped`);

  let done = 0, failed = 0;
  const today = new Date().toISOString().slice(0, 10);
  for (const name of todo) {
    try {
      cache[name] = { ...await fetchOrigin(stats[name].mbid), fetched: today };
    } catch (e) {
      cache[name] = { country: "", area: "", beginArea: "", type: "", fetched: today, error: true };
      failed++;
    }
    done++;
    if (done % 25 === 0) {
      fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 0), "utf8");
      console.log(`  ${done}/${todo.length}…`);
    }
    await sleep(DELAY_MS);
  }
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 0), "utf8");
  console.log(`done: ${done} fetched (${failed} failed) · cache now ${Object.keys(cache).length} artists`);
})();
