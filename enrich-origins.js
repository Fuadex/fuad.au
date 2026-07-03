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

// mbid fallback for artists last.fm has no mbid for (Ling Tosite Sigure class): MB name search,
// accepted ONLY on a score-100 hit whose name or alias matches exactly (case-insensitive) —
// ambiguity is rejected outright (no Bleach repeats).
async function searchMbid(name) {
  const q = `https://musicbrainz.org/ws/2/artist/?query=artist:${encodeURIComponent(JSON.stringify(name))}&fmt=json&limit=3`;
  const { json } = await getJSON(q);
  const arts = (json && json.artists) || [];
  const hit = arts.filter(a => a.score === 100);
  if (hit.length !== 1) return null;
  const a = hit[0], lo = name.toLowerCase();
  const names = [a.name, a["sort-name"], ...((a.aliases || []).map(x => x.name))].filter(Boolean).map(s => s.toLowerCase());
  return names.includes(lo) ? a.id : null;
}

async function fetchOrigin(mbid) {
  const u = `https://musicbrainz.org/ws/2/artist/${encodeURIComponent(mbid)}?fmt=json`;
  const { json } = await getJSON(u);
  if (!json) return { country: "", area: "", beginArea: "", type: "", gender: "", begin: "", end: "", ended: false };
  // `country` is the ISO code (e.g. "JP", "AU"); `area.name` is the human form ("Japan");
  // `begin-area.name` is finer when it exists (e.g. "Tokyo"). type is "Group"/"Person".
  // gender is set for Person artists only. life-span.{begin,end,ended} → active/disbanded(/deceased).
  const ls = json["life-span"] || {};
  return {
    country: json.country || "",
    area: (json.area && json.area.name) || "",
    beginArea: (json["begin-area"] && json["begin-area"].name) || "",
    type: json.type || "",
    gender: json.gender || "",
    begin: ls.begin || "",
    end: ls.end || "",
    ended: !!ls.ended,
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
  // fetch new artists AND backfill cached entries missing the newer fields (gender/life-span).
  // Artists without a last.fm mbid go through the exact-match MB name search (2 requests each).
  const todo = ranked.filter(name => (!(name in cache) || !("gender" in cache[name])) && stats[name] && stats[name].mbid);
  const noMbid = ranked.filter(name => (!(name in cache) || cache[name].error) && (!stats[name] || !stats[name].mbid));
  console.log(`${ranked.length} target artists · ${todo.length} to fetch · ${Object.keys(cache).length} cached · ${noMbid.length} no-mbid → search fallback`);

  let done = 0, failed = 0;
  const today = new Date().toISOString().slice(0, 10);
  for (const name of noMbid) {
    const mbid = await searchMbid(name);
    await sleep(DELAY_MS);
    if (!mbid) { done++; continue; }
    try { cache[name] = { ...await fetchOrigin(mbid), mbidVia: "search", fetched: today }; }
    catch (e) { failed++; }
    done++;
    if (done % 25 === 0) { fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 0), "utf8"); console.log(`  search ${done}/${noMbid.length}…`); }
    await sleep(DELAY_MS);
  }
  done = 0;
  for (const name of todo) {
    try {
      cache[name] = { ...await fetchOrigin(stats[name].mbid), fetched: today };
    } catch (e) {
      cache[name] = { country: "", area: "", beginArea: "", type: "", gender: "", begin: "", end: "", ended: false, fetched: today, error: true };
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
