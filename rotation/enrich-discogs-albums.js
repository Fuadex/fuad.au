// enrich-discogs-albums.js — capture Discogs release STYLES per ALBUM into discogs-album.json.
// Cheapest path: it re-uses the SAME per-artist release search that enrich-discogs.js already runs
// (search?type=release&artist=NAME&per_page=50) — ONE call per artist that owns a kept album — but
// instead of collapsing all of an artist's releases into one artist-level style bag, it BUCKETS the
// release rows by normalised release title and aggregates style[] across matching editions, giving a
// per-album style list keyed by slug(artist)~slug(title).
//
//   discogs-album.json { "artistSlug~albumSlug": { styles: [[name,count],…] } }
//
// Universe: only the KEPT albums (R.ALBUMS from music-core.js + music-rest.js). We fetch per DISTINCT
// artist that owns >=1 kept album, then match that artist's release rows to their kept album titles.
//
// Usage:  node enrich-discogs-albums.js [--limit=N]
//         DISCOGS_TOKEN=xxx node … (60 req/min instead of 24; token also read from ../culture/.env)
// Rate limits + UA + resumable cache per enrich-discogs.js conventions. Incremental by ARTIST slug
// (the fetch unit); an artist already in the cache is skipped.

const fs = require("fs");
const path = require("path");
const https = require("https");
const vm = require("vm");
const { slug } = require("./lib-slug");

function envToken() {
  if (process.env.DISCOGS_TOKEN) return process.env.DISCOGS_TOKEN;
  try {
    const envTxt = fs.readFileSync(path.join(__dirname, "..", "culture", ".env"), "utf8");
    const m = envTxt.match(/^\s*DISCOGS_TOKEN\s*=\s*(.+?)\s*$/m);
    if (m) return m[1].replace(/^["']|["']$/g, "");
  } catch (e) { /* no .env */ }
  return "";
}
const TOKEN = envToken();
const LIMIT_ARG = (process.argv.find(a => a.startsWith("--limit=")) || "").split("=")[1];
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG, 10) : Infinity;
const CACHE_PATH = path.join(__dirname, "discogs-album.json");
// 24 req/min unauthenticated → 2600ms; 60 req/min with token → 1100ms (matches enrich-discogs.js).
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

// edition-stripping title normaliser — the SAME symmetric norm() from enrich-spotify-archive.js
// (~lines 30-35): NFD-fold, drop bracketed noise, deluxe/remaster/edition/…, disc/vol/pt N, a
// leading "YYYY - " and "the ". Keeps letters/numbers of ANY script so JP/etc. titles stay distinct.
const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/\(.*?\)|\[.*?\]/g, "")
  .replace(/\b(deluxe|remaster(ed)?|expanded|edition|anniversary|mono|stereo|bonus|explicit|version|remix|reissue)\b/g, "")
  .replace(/\b(disc|cd|disk|pt|part|vol|volume)\s*\d+\b/g, "")
  .replace(/^\s*\d{4}\s*[-–—]\s*/, "").replace(/^\s*the\s+/, "")
  .replace(/[^\p{L}\p{N}]+/gu, "");

// pull all release rows for an artist (one search call) → aggregate style counts bucketed by
// normalised release title. Returns Map<normTitle, {styles:{name:count}}>.
async function fetchArtistReleaseStyles(name) {
  const u = `https://api.discogs.com/database/search?artist=${encodeURIComponent(name)}&type=release&per_page=50`;
  const { json } = await getJSON(u);
  const results = (json && json.results) || [];
  const byTitle = new Map();
  for (const r of results) {
    // Discogs release titles are "Artist - Album"; strip the leading "artist - " before norming.
    let t = String(r.title || "");
    const dash = t.indexOf(" - ");
    if (dash > 0) t = t.slice(dash + 3);
    const key = norm(t);
    if (!key) continue;
    if (!byTitle.has(key)) byTitle.set(key, {});
    const bag = byTitle.get(key);
    for (const s of (r.style || [])) bag[s] = (bag[s] || 0) + 1;
  }
  return byTitle;
}

// universe: kept albums (R.ALBUMS). Group by artist so we fetch each artist ONCE; carry each kept
// album's own norm(title) so we can pull its bucket out of the artist's release map afterwards.
function keptByArtist() {
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
  const byArtist = new Map();   // artistName → [{ key, n }]
  for (const a of (R.ALBUMS || [])) {
    if (!byArtist.has(a.artist)) byArtist.set(a.artist, []);
    byArtist.get(a.artist).push({ key: slug(a.artist) + "~" + slug(a.title), n: norm(a.title) });
  }
  return byArtist;
}

(async () => {
  const byArtist = keptByArtist();
  const cache = fs.existsSync(CACHE_PATH) ? JSON.parse(fs.readFileSync(CACHE_PATH, "utf8")) : {};
  // fetch unit = artist. Skip an artist only when ALL of its kept albums are already keyed in cache.
  let artists = [...byArtist.entries()].filter(([, albs]) => albs.some(al => !(al.key in cache)));
  if (LIMIT !== Infinity) artists = artists.slice(0, LIMIT);
  const totalAlbums = [...byArtist.values()].reduce((n, a) => n + a.length, 0);
  console.log(`${byArtist.size} kept-album artists (${totalAlbums} albums) · ${artists.length} to fetch${LIMIT !== Infinity ? ` (--limit=${LIMIT})` : ""} · ${Object.keys(cache).length} albums cached · ${TOKEN ? "AUTH 60/min" : "ANON 24/min"}`);

  let done = 0, matched = 0, miss = 0;
  for (const [name, albs] of artists) {
    const relStyles = await fetchArtistReleaseStyles(name);
    await sleep(DELAY_MS);
    for (const { key, n } of albs) {
      const bag = relStyles.get(n);
      if (bag && Object.keys(bag).length) {
        const styles = Object.entries(bag).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, v]);
        cache[key] = { styles };
        matched++;
      } else {
        cache[key] = { styles: [] };   // record the miss so we don't refetch this artist next run
        miss++;
      }
    }
    done++;
    if (done % 25 === 0) {
      fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 0), "utf8");
      console.log(`  ${done}/${artists.length} artists… (${matched} albums matched, ${miss} no-style)`);
    }
  }
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 0), "utf8");
  console.log(`done: ${done} artists processed · ${matched} albums with styles, ${miss} without · cache now ${Object.keys(cache).length} albums`);
})();
