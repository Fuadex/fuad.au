// enrich-stats.js — fetch last.fm global stats for the most-played artists into
// artist-stats.json. For each artist we store { listeners, playcount, mbid }.
//   · listeners/playcount  → the obscurity index (how underground your taste is)
//   · mbid (MusicBrainz ID) → seeds the AcousticBrainz / Discogs enrichment layer
// Usage: LASTFM_API_KEY=xxx node enrich-stats.js [topN]
// Cached + incremental (like enrich-tags.js): reruns only fetch what's new.

const fs = require("fs");
const path = require("path");
const https = require("https");

const API_KEY = process.env.LASTFM_API_KEY;
if (!API_KEY) { console.error("Set LASTFM_API_KEY env var."); process.exit(1); }

const TOP_N = parseInt(process.argv[2], 10) || 600;
const CACHE_PATH = path.join(__dirname, "artist-stats.json");
const INDEX_PATH = path.join(__dirname, "search-index.js");
const DELAY_MS = 250; // ~4 req/sec — under last.fm's limit

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

async function fetchInfo(artist) {
  const url = `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(artist)}&api_key=${API_KEY}&format=json&autocorrect=1`;
  const j = await getJSON(url);
  const a = j && j.artist;
  if (!a) return { listeners: 0, playcount: 0, mbid: "" };
  return {
    listeners: +(a.stats && a.stats.listeners) || 0,
    playcount: +(a.stats && a.stats.playcount) || 0,
    mbid: a.mbid || "",
  };
}

(async () => {
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
      cache[artist] = { ...await fetchInfo(artist), fetched: new Date().toISOString().slice(0, 10) };
    } catch (e) {
      cache[artist] = { listeners: 0, playcount: 0, mbid: "", fetched: new Date().toISOString().slice(0, 10), error: true };
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
