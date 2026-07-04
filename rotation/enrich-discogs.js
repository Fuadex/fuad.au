// enrich-discogs.js — fetch Discogs styles + genres for the most-played artists into
// discogs-cache.json. Two calls per artist:
//   1) /database/search?type=artist&q=NAME   → disambiguate (name collisions like "Skywalker")
//   2) /database/search?type=release&artist=NAME → aggregate style/genre across releases
// For each artist we store { id, styles[], genres[], releases, ambiguous, fetched }.
// Usage:  node enrich-discogs.js [topN]   (default 1000)
//         DISCOGS_TOKEN=xxx node enrich-discogs.js [topN]   (60 req/min instead of 24)
// Cached + incremental (like enrich-tags.js / enrich-stats.js).

const fs = require("fs");
const path = require("path");
const https = require("https");

const TOKEN = process.env.DISCOGS_TOKEN || "";
const TOP_N = parseInt(process.argv[2], 10) || 1000;
const CACHE_PATH = path.join(__dirname, "discogs-cache.json");
const INDEX_PATH = path.join(__dirname, "search-index.js");
// 24 req/min unauthenticated → 2600ms; 60 req/min with token → 1100ms.
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
const norm = (s) => String(s).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "");

async function resolveArtist(name) {
  // Search for the artist as an entity. We always proceed to a release fetch if anything
  // matches; "ambiguous" is just a flag for later review (multiple distinct artists share
  // the name, e.g. several "Skywalker"s).
  const u = `https://api.discogs.com/database/search?q=${encodeURIComponent(name)}&type=artist&per_page=5`;
  const { json } = await getJSON(u);
  const results = (json && json.results) || [];
  if (results.length === 0) return { id: null, ambiguous: false };
  const target = norm(name);
  const exact = results.filter(r => norm(r.title || "") === target);
  if (exact.length >= 1) return { id: exact[0].id, ambiguous: exact.length > 1 };
  // No exact match — try substring (handles non-Latin names like "Ling Tosite Sigure" /
  // "凛として時雨" where Discogs stores the script-native form, and "The Beatles" / "Beatles").
  const sub = results.find(r => { const t = norm(r.title || ""); return t && (t.includes(target) || target.includes(t)); });
  if (sub) return { id: sub.id, ambiguous: false };
  return { id: null, ambiguous: false };
}

async function fetchStyles(name) {
  // Aggregate style/genre across this artist's releases on Discogs.
  const u = `https://api.discogs.com/database/search?artist=${encodeURIComponent(name)}&type=release&per_page=50`;
  const { json } = await getJSON(u);
  const results = (json && json.results) || [];
  const styles = {}, genres = {};
  for (const r of results) {
    (r.style || []).forEach(s => styles[s] = (styles[s] || 0) + 1);
    (r.genre || []).forEach(g => genres[g] = (genres[g] || 0) + 1);
  }
  const ranked = o => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, v]);
  return { styles: ranked(styles), genres: ranked(genres), releases: results.length };
}

(async () => {
  const idxSrc = fs.readFileSync(INDEX_PATH, "utf8");
  const eq = idxSrc.indexOf("ROTATION_SEARCH");
  const start = idxSrc.indexOf("[", eq);
  const rows = JSON.parse(idxSrc.slice(start, idxSrc.lastIndexOf("]") + 1));
  const artists = rows.slice(0, TOP_N).map(r => r[0]);

  const cache = fs.existsSync(CACHE_PATH) ? JSON.parse(fs.readFileSync(CACHE_PATH, "utf8")) : {};
  const todo = artists.filter(a => !(a in cache));
  console.log(`${artists.length} target artists · ${todo.length} to fetch · ${Object.keys(cache).length} cached · ${TOKEN ? "AUTH 60/min" : "ANON 24/min"}`);

  let done = 0, miss = 0, ambig = 0;
  const today = new Date().toISOString().slice(0, 10);
  for (const artist of todo) {
    const { id, ambiguous } = await resolveArtist(artist);
    await sleep(DELAY_MS);

    if (id == null) {
      cache[artist] = { id: null, styles: [], genres: [], releases: 0, ambiguous: false, fetched: today };
      miss++;
    } else {
      if (ambiguous) ambig++;
      const { styles, genres, releases } = await fetchStyles(artist);
      cache[artist] = { id, styles, genres, releases, ambiguous, fetched: today };
      await sleep(DELAY_MS);
    }

    done++;
    if (done % 25 === 0) {
      fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 0), "utf8");
      console.log(`  ${done}/${todo.length}… (${miss} no-match, ${ambig} ambiguous)`);
    }
  }
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 0), "utf8");
  console.log(`done: ${done} processed (${miss} not on Discogs, ${ambig} ambiguous) · cache now ${Object.keys(cache).length} artists`);
})();
