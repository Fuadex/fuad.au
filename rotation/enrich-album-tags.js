// enrich-album-tags.js — fetch last.fm PER-ALBUM top tags (method=album.gettoptags) for the KEPT
// albums into album-genres.json. Sibling of enrich-tags.js (which does the per-ARTIST vote) — same
// last.fm client, throttle, deny-list conventions, resumable cache. Keyed by the canonical join key
// slug(artist)~slug(title) (lib-slug — the single source of truth) so build-data.js can line rows up.
//
// Universe: the KEPT albums the build emits (R.ALBUMS from music-core.js + music-rest.js — artist +
// title). Run build-data.js first so those exist.
//
// Usage:  LASTFM_API_KEY=xxx node enrich-album-tags.js [--limit=N]
//         (key also read from ../culture/.env LASTFM_API_KEY, like the other enrichers)
// Cached + incremental: albums already keyed in album-genres.json are skipped, so reruns (and the
// smoke slice) only fetch what's new. Throttled to ~4 req/sec.

const fs = require("fs");
const path = require("path");
const https = require("https");
const vm = require("vm");
const { slug } = require("./lib-slug");

// ── API key: env first, else ../culture/.env LASTFM_API_KEY (same fallback the repo uses elsewhere)
function envKey() {
  if (process.env.LASTFM_API_KEY) return process.env.LASTFM_API_KEY;
  try {
    const envTxt = fs.readFileSync(path.join(__dirname, "..", "culture", ".env"), "utf8");
    const m = envTxt.match(/^\s*LASTFM_API_KEY\s*=\s*(.+?)\s*$/m);
    if (m) return m[1].replace(/^["']|["']$/g, "");
  } catch (e) { /* no .env — fall through */ }
  return "";
}
const API_KEY = envKey();
if (!API_KEY) { console.error("Set LASTFM_API_KEY env var or ../culture/.env LASTFM_API_KEY."); process.exit(1); }

const LIMIT_ARG = (process.argv.find(a => a.startsWith("--limit=")) || "").split("=")[1];
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG, 10) : Infinity;
const CACHE_PATH = path.join(__dirname, "album-genres.json");
const DELAY_MS = 250;          // ~4 requests/second — well under last.fm's limit (matches enrich-tags.js)
const KEEP_TAGS = 8;           // store this many top tags per album (design: top 8)
const MIN_COUNT = 5;           // ignore tags weaker than this (design: count>=5; artist enricher uses 10)

// tags that aren't genres — drop them. Reuses enrich-tags.js's list and EXTENDS it per the design:
// bare years/decades (handled by isJunk), 'albums i own' family, misc non-genre noise.
const DENY = new Set(["seen live", "favorites", "favourite", "favorite", "favourites", "love",
  "spotify", "albums i own", "albums i want", "albums i have", "vinyl", "cd", "awesome", "cool", "good",
  "amazing", "beautiful", "best", "under 2000 listeners", "my music", "check it out", "male vocalists",
  "female vocalists", "male vocalist", "female vocalist", "singer-songwriter", "band",
  "artists i've seen live", "favorite albums", "favourite albums", "best albums", "owned",
  "want", "wishlist", "to listen", "listened", "heard", "my favorite albums", "my favourite albums",
  "gems", "masterpiece", "perfect", "10 10", "all", "music", "audio", "songs i love", "playlist",
  "randomvalue", "random", "test", "n a", "none", "various", "misc"]);
// non-genre if: bare year (1999) or decade (90s / 1990s), or is (part of) the artist's own name.
const isDecade = (t) => /^(19|20)?\d0s$/.test(t) || /^\d{4}$/.test(t) || /^'?\d0s$/.test(t);
const norml = (s) => String(s).toLowerCase().trim();

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

// keep only genre-ish tags: >= MIN_COUNT, not in DENY, not a bare year/decade, not the artist's own
// name (last.fm album tags are riddled with the artist name as a tag). > 1 char.
function cleanTags(rawTags, artist) {
  const artistN = norml(artist);
  return (rawTags || [])
    .map(t => [norml(t.name), +t.count])
    .filter(([name, count]) =>
      count >= MIN_COUNT &&
      name.length > 1 &&
      !DENY.has(name) &&
      !isDecade(name) &&
      name !== artistN)                       // drop the artist's own name as a "tag"
    .slice(0, KEEP_TAGS);
}

async function fetchAlbumTags(artist, album) {
  const url = `https://ws.audioscrobbler.com/2.0/?method=album.gettoptags` +
    `&artist=${encodeURIComponent(artist)}&album=${encodeURIComponent(album)}` +
    `&api_key=${API_KEY}&format=json&autocorrect=1`;
  const j = await getJSON(url);
  const tags = (j && j.toptags && j.toptags.tag) || [];
  return cleanTags(tags, artist);
}

// universe = the KEPT albums the build emits (R.ALBUMS). eval music-core.js + music-rest.js in a
// sandbox — same trick smoke.js uses — and read artist + title.
function keptAlbums() {
  const corePath = path.join(__dirname, "music-core.js");
  const restPath = path.join(__dirname, "music-rest.js");
  if (!fs.existsSync(corePath) || !fs.existsSync(restPath)) {
    console.error("music-core.js / music-rest.js missing — run `node build-data.js` first.");
    process.exit(1);
  }
  const ctx = { window: { ROTATION: {} }, console: { log() {}, error() {} } };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(corePath, "utf8"), ctx, { filename: "music-core.js" });
  vm.runInContext(fs.readFileSync(restPath, "utf8"), ctx, { filename: "music-rest.js" });
  const R = ctx.window.ROTATION;
  const seen = new Set();
  const out = [];
  for (const a of (R.ALBUMS || [])) {
    const key = slug(a.artist) + "~" + slug(a.title);
    if (seen.has(key)) continue;             // a title can repeat across editions post-slug — key-dedupe
    seen.add(key);
    out.push({ artist: a.artist, title: a.title, key });
  }
  return out;
}

(async () => {
  const albums = keptAlbums();
  const cache = fs.existsSync(CACHE_PATH) ? JSON.parse(fs.readFileSync(CACHE_PATH, "utf8")) : {};
  let todo = albums.filter(a => !(a.key in cache));
  if (LIMIT !== Infinity) todo = todo.slice(0, LIMIT);
  console.log(`${albums.length} kept albums · ${todo.length} to fetch${LIMIT !== Infinity ? ` (--limit=${LIMIT})` : ""} · ${Object.keys(cache).length} cached`);

  const today = new Date().toISOString().slice(0, 10);
  let done = 0, failed = 0, empty = 0;
  for (const { artist, title, key } of todo) {
    try {
      const tags = await fetchAlbumTags(artist, title);
      cache[key] = { tags, fetched: today };
      if (!tags.length) empty++;
    } catch (e) {
      cache[key] = { tags: [], fetched: today, error: true };
      failed++;
    }
    done++;
    if (done % 25 === 0) {
      fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 0), "utf8");
      console.log(`  ${done}/${todo.length}… (${empty} empty, ${failed} failed)`);
    }
    await sleep(DELAY_MS);
  }
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 0), "utf8");
  console.log(`done: ${done} fetched (${empty} empty, ${failed} failed) · cache now ${Object.keys(cache).length} albums`);
})();
