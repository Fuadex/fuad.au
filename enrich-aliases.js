// enrich-aliases.js — fetch MusicBrainz artist aliases for cross-script identity.
// For each artist with an mbid (from artist-stats.json), MB returns all known name forms
// (e.g. "ミドリ" ↔ "Midori"). build-data.js folds these into a normalized-name → canonical map.
//
// Usage:  node enrich-aliases.js [topN]   (default 1000)
// Output: artist-aliases.json, keyed by artist canonical name → { aliases: [], fetched }.
// Cached + incremental. Rate-limited to 1 req/sec per MusicBrainz policy.

const fs = require("fs");
const path = require("path");
const https = require("https");

const TOP_N = parseInt(process.argv[2], 10) || 1000;
const CACHE_PATH = path.join(__dirname, "artist-aliases.json");
const STATS_PATH = path.join(__dirname, "artist-stats.json");
const INDEX_PATH = path.join(__dirname, "search-index.js");
const DELAY_MS = 1100;
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

async function fetchAliases(mbid) {
  const u = `https://musicbrainz.org/ws/2/artist/${encodeURIComponent(mbid)}?fmt=json&inc=aliases`;
  const { json } = await getJSON(u);
  if (!json) return [];
  const aliases = (json.aliases || []).map(a => a.name).filter(Boolean);
  // also include `sort-name` if distinct ("Beatles, The" → catches "The Beatles" → "Beatles, The")
  if (json["sort-name"] && json["sort-name"] !== json.name) aliases.push(json["sort-name"]);
  return [...new Set(aliases)];
}

(async () => {
  const stats = fs.existsSync(STATS_PATH) ? JSON.parse(fs.readFileSync(STATS_PATH, "utf8")) : {};
  const idxSrc = fs.readFileSync(INDEX_PATH, "utf8");
  const eq = idxSrc.indexOf("ROTATION_SEARCH");
  const start = idxSrc.indexOf("[", eq);
  const rows = JSON.parse(idxSrc.slice(start, idxSrc.lastIndexOf("]") + 1));
  const ranked = rows.slice(0, TOP_N).map(r => r[0]);

  const cache = fs.existsSync(CACHE_PATH) ? JSON.parse(fs.readFileSync(CACHE_PATH, "utf8")) : {};
  const todo = ranked.filter(name => !(name in cache) && stats[name] && stats[name].mbid);
  const noMbid = ranked.filter(name => !stats[name] || !stats[name].mbid).length;
  console.log(`${ranked.length} target artists · ${todo.length} to fetch · ${Object.keys(cache).length} cached · ${noMbid} no-mbid skipped`);

  let done = 0, withAliases = 0;
  const today = new Date().toISOString().slice(0, 10);
  for (const name of todo) {
    try {
      const aliases = await fetchAliases(stats[name].mbid);
      cache[name] = { aliases, fetched: today };
      if (aliases.length) withAliases++;
    } catch (e) {
      cache[name] = { aliases: [], fetched: today, error: true };
    }
    done++;
    if (done % 25 === 0) {
      fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 0), "utf8");
      console.log(`  ${done}/${todo.length} (${withAliases} with aliases)…`);
    }
    await sleep(DELAY_MS);
  }
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 0), "utf8");
  console.log(`done: ${done} fetched · ${withAliases} have aliases · cache now ${Object.keys(cache).length} artists`);
})();
