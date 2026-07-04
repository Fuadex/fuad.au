// enrich-images.js — fetch artist images from Discogs (/artists/{id}).
// Requires Discogs IDs already populated in discogs-cache.json by enrich-discogs.js.
// Output: artist-images.json, keyed by artist name → { image, thumb, fetched }.
//
// Usage:  node enrich-images.js [topN]   (default 130, covers kept 118 + buffer)
//         DISCOGS_TOKEN=xxx node enrich-images.js [topN]
// Rate limit: 24/min anon, 60/min with token. Cached + incremental.

const fs = require("fs");
const path = require("path");
const https = require("https");

const TOKEN = process.env.DISCOGS_TOKEN || "";
const TOP_N = parseInt(process.argv[2], 10) || 130;
const CACHE_PATH = path.join(__dirname, "artist-images.json");
const DISCOGS_PATH = path.join(__dirname, "discogs-cache.json");
const INDEX_PATH = path.join(__dirname, "search-index.js");
const DELAY_MS = TOKEN ? 1100 : 2600;
const UA = "RotationEnricher/0.1 ( fuadex@gmail.com )";

function getJSON(url) {
  return new Promise((resolve) => {
    const headers = { "User-Agent": UA };
    if (TOKEN) headers["Authorization"] = `Discogs token=${TOKEN}`;
    https.get(url, { headers }, (res) => {
      let body = "";
      res.on("data", (c) => body += c);
      res.on("end", () => { try { resolve({ status: res.statusCode, json: JSON.parse(body) }); } catch (e) { resolve({ status: res.statusCode, json: null }); } });
    }).on("error", () => resolve({ status: 0, json: null }));
  });
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchImage(discogsId) {
  const u = `https://api.discogs.com/artists/${discogsId}`;
  const { status, json } = await getJSON(u);
  if (status === 429) { await sleep(8000); return fetchImage(discogsId); }
  if (!json || !Array.isArray(json.images) || json.images.length === 0) return { image: "", thumb: "" };
  const primary = json.images.find(i => i.type === "primary") || json.images[0];
  return { image: primary.uri || "", thumb: primary.uri150 || primary.uri || "" };
}

(async () => {
  const discogs = fs.existsSync(DISCOGS_PATH) ? JSON.parse(fs.readFileSync(DISCOGS_PATH, "utf8")) : {};
  const idxSrc = fs.readFileSync(INDEX_PATH, "utf8");
  const eq = idxSrc.indexOf("ROTATION_SEARCH");
  const start = idxSrc.indexOf("[", eq);
  const rows = JSON.parse(idxSrc.slice(start, idxSrc.lastIndexOf("]") + 1));
  const ranked = rows.slice(0, TOP_N).map(r => r[0]);

  const cache = fs.existsSync(CACHE_PATH) ? JSON.parse(fs.readFileSync(CACHE_PATH, "utf8")) : {};
  const todo = ranked.filter(name => !(name in cache) && discogs[name] && discogs[name].id && !discogs[name].ambiguous);
  const noId = ranked.filter(name => !discogs[name] || !discogs[name].id || discogs[name].ambiguous).length;
  console.log(`${ranked.length} target artists · ${todo.length} to fetch · ${Object.keys(cache).length} cached · ${noId} no-id/ambig skipped · ${TOKEN ? "AUTH 60/min" : "ANON 24/min"}`);

  let done = 0, withImage = 0;
  const today = new Date().toISOString().slice(0, 10);
  for (const name of todo) {
    try {
      const { image, thumb } = await fetchImage(discogs[name].id);
      cache[name] = { image, thumb, fetched: today };
      if (image) withImage++;
    } catch (e) {
      cache[name] = { image: "", thumb: "", fetched: today, error: true };
    }
    done++;
    if (done % 25 === 0) {
      fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 0), "utf8");
      console.log(`  ${done}/${todo.length} (${withImage} with images)…`);
    }
    await sleep(DELAY_MS);
  }
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 0), "utf8");
  console.log(`done: ${done} fetched · ${withImage} have images · cache now ${Object.keys(cache).length} artists`);
})();
