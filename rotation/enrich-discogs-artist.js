// enrich-discogs-artist.js — ONE Discogs /artists/{id} call per artist, grabbing EVERYTHING
// that endpoint offers: image, thumb, profile (bio), members + groups (connection graph,
// works for underground artists with no MusicBrainz id), and external urls.
// Supersedes enrich-images.js (which kept only the image from the same call).
// Output: discogs-artist.json, keyed by artist name.
//
// Usage:  node enrich-discogs-artist.js [topN]   (default 220, covers kept ~205 + buffer)
//         DISCOGS_TOKEN=xxx node enrich-discogs-artist.js [topN]
// Rate limit: 24/min anon, 60/min with token. Cached + incremental.

const fs = require("fs");
const path = require("path");
const https = require("https");

const TOKEN = process.env.DISCOGS_TOKEN || "";
const TOP_N = parseInt(process.argv[2], 10) || 220;
const CACHE_PATH = path.join(__dirname, "discogs-artist.json");
const DISCOGS_PATH = path.join(__dirname, "discogs-cache.json");
const INDEX_PATH = path.join(__dirname, "search-index.js");
const DELAY_MS = TOKEN ? 1100 : 2600;
const UA = "RotationEnricher/0.3 ( fuadex@gmail.com )";

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

// Discogs profile uses [a=Name]/[a123]/[l=Label]/[url=...] markup — flatten to plain prose.
function cleanProfile(s) {
  if (!s) return "";
  return s
    .replace(/\[url=[^\]]*\]/gi, "").replace(/\[\/?url\]/gi, "")
    .replace(/\[(?:a|l|m|b|r)=([^\]]*)\]/gi, "$1")
    .replace(/\[(?:a|l|m|b|r)\d+\]/gi, "")
    .replace(/\[\/?[bi]\]/gi, "")
    .replace(/\r/g, "").trim();
}

async function fetchArtist(id) {
  const { status, json } = await getJSON(`https://api.discogs.com/artists/${id}`);
  if (status === 429) { await sleep(8000); return fetchArtist(id); }
  if (!json) return null;
  const imgs = Array.isArray(json.images) ? json.images : [];
  const primary = imgs.find(i => i.type === "primary") || imgs[0] || {};
  const names = (arr) => Array.isArray(arr) ? arr.map(m => (m && m.name) || "").filter(Boolean) : [];
  const prof = cleanProfile(json.profile || "");
  return {
    image: primary.uri || "",
    thumb: primary.uri150 || primary.uri || "",
    profile: prof.length > 600 ? prof.slice(0, 597) + "…" : prof,
    members: names(json.members).slice(0, 16),
    groups: names(json.groups).slice(0, 16),
    urls: (Array.isArray(json.urls) ? json.urls : []).slice(0, 6),
  };
}

(async () => {
  const discogs = fs.existsSync(DISCOGS_PATH) ? JSON.parse(fs.readFileSync(DISCOGS_PATH, "utf8")) : {};
  const idxSrc = fs.readFileSync(INDEX_PATH, "utf8");
  const start = idxSrc.indexOf("[", idxSrc.indexOf("ROTATION_SEARCH"));
  const rows = JSON.parse(idxSrc.slice(start, idxSrc.lastIndexOf("]") + 1));
  const ranked = rows.slice(0, TOP_N).map(r => r[0]);

  const cache = fs.existsSync(CACHE_PATH) ? JSON.parse(fs.readFileSync(CACHE_PATH, "utf8")) : {};
  const todo = ranked.filter(name => !(name in cache) && discogs[name] && discogs[name].id && !discogs[name].ambiguous);
  const noId = ranked.filter(name => !discogs[name] || !discogs[name].id || discogs[name].ambiguous).length;
  console.log(`${ranked.length} targets · ${todo.length} to fetch · ${Object.keys(cache).length} cached · ${noId} no-id/ambig · ${TOKEN ? "AUTH 60/min" : "ANON 24/min"}`);

  let done = 0, withImg = 0, withProf = 0, withMembers = 0;
  const today = new Date().toISOString().slice(0, 10);
  for (const name of todo) {
    try {
      const d = await fetchArtist(discogs[name].id);
      cache[name] = d ? { ...d, fetched: today } : { image: "", thumb: "", profile: "", members: [], groups: [], urls: [], fetched: today, error: true };
      if (d && d.image) withImg++;
      if (d && d.profile) withProf++;
      if (d && (d.members.length || d.groups.length)) withMembers++;
    } catch (e) {
      cache[name] = { image: "", thumb: "", profile: "", members: [], groups: [], urls: [], fetched: today, error: true };
    }
    done++;
    if (done % 20 === 0) {
      fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 0), "utf8");
      console.log(`  ${done}/${todo.length} (${withImg} img · ${withProf} bio · ${withMembers} members)…`);
    }
    await sleep(DELAY_MS);
  }
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 0), "utf8");
  console.log(`done: ${done} fetched · ${withImg} images · ${withProf} bios · ${withMembers} with members · cache now ${Object.keys(cache).length}`);
})();
