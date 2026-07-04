// enrich-bios.js — fetch last.fm artist.getInfo for the top N artists and capture
// the bio summary + REAL similar-artists list (replacing curated META.similar).
//
// Usage:  LASTFM_API_KEY=xxx node enrich-bios.js [topN]   (default 250)
// Output: artist-bios.json, keyed by artist name → { bio, similar: [name, ...], fetched }.
// Cached + incremental — reruns only fetch what's missing.
//
// We re-hit artist.getinfo (already used by enrich-stats.js) because it returns
// ALL fields in a single call; the bio + similar were just not previously captured.

const fs = require("fs");
const path = require("path");
const https = require("https");

const API_KEY = process.env.LASTFM_API_KEY;
if (!API_KEY) { console.error("Set LASTFM_API_KEY env var."); process.exit(1); }

const TOP_N = parseInt(process.argv[2], 10) || 250;
const CACHE_PATH = path.join(__dirname, "artist-bios.json");
const INDEX_PATH = path.join(__dirname, "search-index.js");
const DELAY_MS = 250; // ~4 req/sec under last.fm's limit

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

// last.fm bio summary has HTML + a trailing "<a href...>Read more on Last.fm</a>" link.
// Strip both. Also collapse whitespace.
function cleanBio(html) {
  if (!html) return "";
  // remove <a ...>Read more...</a> tail
  let s = html.replace(/<a [^>]*>[^<]*<\/a>/gi, "").trim();
  // strip remaining HTML tags
  s = s.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  // collapse whitespace
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

async function fetchBio(artist) {
  const url = `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(artist)}&api_key=${API_KEY}&format=json&autocorrect=1`;
  const j = await getJSON(url);
  const a = j && j.artist;
  if (!a) return { bio: "", similar: [] };
  const bio = cleanBio((a.bio && a.bio.summary) || "");
  // dedicated getsimilar returns up to `limit`; getinfo's embedded similar is capped at ~5 by last.fm
  let similar = [];
  try {
    await sleep(DELAY_MS);
    const su = `https://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&artist=${encodeURIComponent(artist)}&api_key=${API_KEY}&format=json&autocorrect=1&limit=10`;
    const sj = await getJSON(su);
    similar = ((sj && sj.similarartists && sj.similarartists.artist) || []).map(x => x.name).filter(Boolean).slice(0, 10);
  } catch (e) {}
  if (!similar.length) similar = ((a.similar && a.similar.artist) || []).map(x => x.name).filter(Boolean).slice(0, 10);
  return { bio, similar };
}

(async () => {
  const idxSrc = fs.readFileSync(INDEX_PATH, "utf8");
  const eq = idxSrc.indexOf("ROTATION_SEARCH");
  const start = idxSrc.indexOf("[", eq);
  const rows = JSON.parse(idxSrc.slice(start, idxSrc.lastIndexOf("]") + 1));
  const artists = rows.slice(0, TOP_N).map(r => r[0]);

  const cache = fs.existsSync(CACHE_PATH) ? JSON.parse(fs.readFileSync(CACHE_PATH, "utf8")) : {};
  const todo = artists.filter(a => !(a in cache) || ((cache[a].similar || []).length < 6 && !cache[a].error));
  console.log(`${artists.length} target artists · ${todo.length} to fetch · ${Object.keys(cache).length} cached`);

  let done = 0, failed = 0;
  const today = new Date().toISOString().slice(0, 10);
  for (const artist of todo) {
    try {
      cache[artist] = { ...await fetchBio(artist), fetched: today };
    } catch (e) {
      cache[artist] = { bio: "", similar: [], fetched: today, error: true };
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
