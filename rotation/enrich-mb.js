// enrich-mb.js — deep MusicBrainz pull: release-groups (adoption-lag) + artist relations
// (connection graph: members / bands / collaborations) in ONE request per artist.
// Uses mbids already in artist-stats.json. Writes artist-mb.json:
//   { name → { debut, latest, rgCount, releases:[[title,year,type]], rels:[[type,name,mbid]], fetched } }
// MusicBrainz: 1 req/sec, UA required, no API key. Cached + incremental.
// Usage:  node enrich-mb.js [topN]   (default 6000)

const fs = require("fs");
const path = require("path");
const https = require("https");

const TOP_N = parseInt(process.argv[2], 10) || 6000;
const CACHE_PATH = path.join(__dirname, "artist-mb.json");
const STATS_PATH = path.join(__dirname, "artist-stats.json");
const INDEX_PATH = path.join(__dirname, "search-index.js");
const DELAY_MS = 1100; // ~1 req/sec
const UA = "RotationEnricher/0.2 ( fuadex@gmail.com )";

// relation types worth keeping for the connection graph (artist↔artist edges)
const REL_KEEP = new Set([
  "member of band", "collaboration", "supporting musician", "founder",
  "conductor position", "subgroup", "tribute", "artistic director", "is person",
]);

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
const yr = (d) => (d && /^\d{4}/.test(d)) ? parseInt(d.slice(0, 4), 10) : null;

async function fetchDeep(mbid) {
  const u = `https://musicbrainz.org/ws/2/artist/${encodeURIComponent(mbid)}?inc=release-groups+artist-rels&fmt=json`;
  const { json } = await getJSON(u);
  if (!json) return null;

  // release groups → debut/latest year + a compact [title, year, type] list (albums/EPs only)
  const rgs = (json["release-groups"] || [])
    .map(rg => ({ title: rg.title || "", year: yr(rg["first-release-date"]), type: rg["primary-type"] || "" }))
    .filter(r => r.year && /^(Album|EP|Single)$/.test(r.type));
  const albumYears = rgs.filter(r => r.type !== "Single").map(r => r.year);
  const debut = albumYears.length ? Math.min(...albumYears) : (rgs.length ? Math.min(...rgs.map(r => r.year)) : null);
  const latest = rgs.length ? Math.max(...rgs.map(r => r.year)) : null;
  const releases = rgs.filter(r => r.type !== "Single")
    .sort((a, b) => a.year - b.year).slice(0, 40).map(r => [r.title, r.year, r.type]);

  // artist relations → connection-graph edges
  const rels = [];
  for (const rel of (json.relations || [])) {
    if (!REL_KEEP.has(rel.type)) continue;
    const a = rel.artist;
    if (!a || !a.name) continue;
    rels.push([rel.type, a.name, a.id || ""]);
    if (rels.length >= 40) break;
  }
  return { debut, latest, rgCount: rgs.length, releases, rels };
}

(async () => {
  const stats = fs.existsSync(STATS_PATH) ? JSON.parse(fs.readFileSync(STATS_PATH, "utf8")) : {};
  const idxSrc = fs.readFileSync(INDEX_PATH, "utf8");
  const start = idxSrc.indexOf("[", idxSrc.indexOf("ROTATION_SEARCH"));
  const rows = JSON.parse(idxSrc.slice(start, idxSrc.lastIndexOf("]") + 1));
  const ranked = rows.slice(0, TOP_N).map(r => r[0]);

  const cache = fs.existsSync(CACHE_PATH) ? JSON.parse(fs.readFileSync(CACHE_PATH, "utf8")) : {};
  const todo = ranked.filter(name => !(name in cache) && stats[name] && stats[name].mbid);
  const noMbid = ranked.filter(name => !stats[name] || !stats[name].mbid).length;
  console.log(`${ranked.length} targets · ${todo.length} to fetch · ${Object.keys(cache).length} cached · ${noMbid} no-mbid`);

  let done = 0, failed = 0;
  const today = new Date().toISOString().slice(0, 10);
  for (const name of todo) {
    try {
      const d = await fetchDeep(stats[name].mbid);
      cache[name] = d ? { ...d, fetched: today } : { debut: null, latest: null, rgCount: 0, releases: [], rels: [], fetched: today, error: true };
      if (!d) failed++;
    } catch (e) {
      cache[name] = { debut: null, latest: null, rgCount: 0, releases: [], rels: [], fetched: today, error: true };
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
