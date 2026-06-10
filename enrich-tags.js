// enrich-tags.js — fetch last.fm top tags for the most-played artists into tag-cache.json
// Usage: LASTFM_API_KEY=xxx node enrich-tags.js [topN]
// Cached + incremental: artists already in tag-cache.json are skipped, so reruns
// (and the GitHub Action) only fetch what's new. Throttled to ~4 req/sec.

const fs = require("fs");
const path = require("path");
const https = require("https");

const API_KEY = process.env.LASTFM_API_KEY;
if (!API_KEY) { console.error("Set LASTFM_API_KEY env var."); process.exit(1); }

const TOP_N = parseInt(process.argv[2], 10) || 500;
const CACHE_PATH = path.join(__dirname, "tag-cache.json");
const INDEX_PATH = path.join(__dirname, "search-index.js");
const DELAY_MS = 250;          // ~4 requests/second — well under last.fm's limit
const KEEP_TAGS = 6;           // store this many top tags per artist
const MIN_COUNT = 10;          // ignore tags weaker than this (0–100 weight)

// tags that aren't genres — drop them
const DENY = new Set(["seen live","favorites","favourite","favorite","favourites","love",
  "spotify","albums i own","vinyl","awesome","cool","good","amazing","beautiful","best",
  "under 2000 listeners","my music","check it out","male vocalists","female vocalists",
  "male vocalist","female vocalist","singer-songwriter","band","artists i've seen live"]);
const isDecade = (t) => /^(19|20)?\d0s$/.test(t) || /^\d{4}$/.test(t);

function getJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let body = "";
      res.on("data", (c) => body += c);
      res.on("end", () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
    }).on("error", reject);
  });
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchTags(artist) {
  const url = `https://ws.audioscrobbler.com/2.0/?method=artist.gettoptags&artist=${encodeURIComponent(artist)}&api_key=${API_KEY}&format=json&autocorrect=1`;
  const j = await getJSON(url);
  const tags = (j && j.toptags && j.toptags.tag) || [];
  return tags
    .map(t => [String(t.name).toLowerCase().trim(), +t.count])
    .filter(([name, count]) => count >= MIN_COUNT && !DENY.has(name) && !isDecade(name) && name.length > 1)
    .slice(0, KEEP_TAGS);
}

(async () => {
  // artist names ranked by plays, from the generated search index
  const idxSrc = fs.readFileSync(INDEX_PATH, "utf8");
  const eq = idxSrc.indexOf("ROTATION_SEARCH");
  const start = idxSrc.indexOf("[", eq);
  const rows = JSON.parse(idxSrc.slice(start, idxSrc.lastIndexOf("]") + 1));
  const artists = rows.slice(0, TOP_N).map(r => r[0]);

  const cache = fs.existsSync(CACHE_PATH) ? JSON.parse(fs.readFileSync(CACHE_PATH, "utf8")) : {};
  const todo = artists.filter(a => !(a in cache));
  console.log(`${artists.length} target artists · ${todo.length} to fetch · ${Object.keys(cache).length} cached`);

  let done = 0, failed = 0;
  for (const artist of todo) {
    try {
      cache[artist] = { tags: await fetchTags(artist), fetched: new Date().toISOString().slice(0, 10) };
    } catch (e) {
      cache[artist] = { tags: [], fetched: new Date().toISOString().slice(0, 10), error: true };
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
