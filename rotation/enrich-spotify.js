// enrich-spotify.js — pulls Spotify identity + artwork for the profiled (EXPLORE) artists.
//
// Spotify (post-Feb-2026, client-credentials) gives a NARROW set: no genres, no popularity,
// no audio-features, no top-tracks, no related-artists (all 403/stripped). What survives:
//   • artist  → id, deep-link (open.spotify.com/artist/{id}), ONE photo in 3 resolutions
//   • albums  → per-album cover (640/300/64), name, release date, deep-link  ← the "cover wall"
//
// Keys come from ../culture/.env (SPOTIFY / SPOTIFY_SECRET). NEVER printed, NEVER
// committed, NEVER shipped to a browser file. Output: spotify-cache.json (raw cache, resumable).
// build-data.js folds the useful bits (id, url, photo-fallback, album covers) into artist records.
//
//   node enrich-spotify.js --mode=images --limit=300   → fill PHOTO gaps only (artists the build has no art for; 1 call each)
//   node enrich-spotify.js --mode=covers --top=80      → album-cover walls for the 80 most-played artists
//   node enrich-spotify.js --limit=400                 → full pass, capped to N artists this run (stay under the daily quota)
//   node enrich-spotify.js --retry                     → also retry previous misses
//
// NOTE: a Development-Mode Spotify app has a small DAILY quota. Exceeding it returns a 429 with a
// ~24h Retry-After. This script ABORTS (saving progress) on any Retry-After > MAX_BACKOFF rather
// than sleeping for a day — so re-running tomorrow resumes cleanly from the cache. Pull in batches.
//
const https = require("https"), fs = require("fs"), path = require("path"), vm = require("vm");

const ROOT = __dirname;
const ENV_PATH = path.join(ROOT, "..", "culture", ".env");
const CORE_PATH = path.join(ROOT, "music-core.js");
const REST_PATH = path.join(ROOT, "music-rest.js");   // holds EXPLORE (merged in below)
const CACHE_PATH = path.join(ROOT, "spotify-cache.json");
const arg = (k, d) => { const m = process.argv.find(a => a.startsWith(k + "=")); return m ? m.slice(k.length + 1) : d; };
const RETRY_MISSES = process.argv.includes("--retry");
const MODE = arg("--mode", "");        // "images" (gap fill) | "photos" (ALL artists, for Spotify alternates) | "covers" (album walls) | "" (full)
const TOP = parseInt(arg("--top", "100"), 10);
const LIMIT = parseInt(arg("--limit", "Infinity"), 10) || Infinity;
let skipAlbums = process.argv.includes("--no-albums") || MODE === "images" || MODE === "photos"; // photo modes never need album calls

const MIN_INTERVAL = 400;          // ms between calls (~2.5/s ≈ 80% of Spotify's ~180/min ceiling)
const MAX_BACKOFF = 120;           // seconds — a longer Retry-After means the daily quota is spent → abort
const ALBUM_CAP = 40;              // covers per artist (deduped by name)
let aborted = false;

// ── keys ──────────────────────────────────────────────────────────────────────
let env = ""; try { env = fs.readFileSync(ENV_PATH, "utf8"); } catch (e) {}   // local .env optional — CI passes keys via env vars
const getv = (k) => { if (process.env[k]) return process.env[k].trim(); const m = env.match(new RegExp("^" + k + "=(.*)$", "m")); return m ? m[1].trim() : ""; };
const CLIENT_ID = getv("SPOTIFY"), CLIENT_SECRET = getv("SPOTIFY_SECRET");
if (!CLIENT_ID || !CLIENT_SECRET) { console.error("Missing SPOTIFY / SPOTIFY_SECRET in .env"); process.exit(1); }

// ── artist universe — EXPLORE in plays-desc order, flagged for whether the build already has art ──
function loadArtists() {
  const ctx = { window: {}, console };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(CORE_PATH, "utf8"), ctx);
  if (fs.existsSync(REST_PATH)) vm.runInContext(fs.readFileSync(REST_PATH, "utf8"), ctx);
  const R = ctx.window.ROTATION || {};
  const byId = R.byId || {}, THUMBS = R.THUMBS || {}, slug = R.slug || (s => s);
  const seen = new Set(), out = [];
  for (const a of (R.EXPLORE || [])) {
    if (!a.name || seen.has(a.name)) continue; seen.add(a.name);
    const id = slug(a.name);
    const hasImage = !!(byId[id] && (byId[id].image || byId[id].thumb)) || !!THUMBS[id];
    out.push({ name: a.name, hasImage });
  }
  return out;
}

// ── tiny request helpers ────────────────────────────────────────────────────────
function req(opts, body) {
  return new Promise((res) => {
    const r = https.request(opts, (rs) => { let b = ""; rs.on("data", c => b += c); rs.on("end", () => res({ status: rs.statusCode, headers: rs.headers, body: b })); });
    r.on("error", e => res({ status: 0, headers: {}, body: String(e) }));
    if (body) r.write(body); r.end();
  });
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

let token = "", tokenExp = 0;
async function ensureToken() {
  if (token && Date.now() < tokenExp - 60000) return;
  const auth = Buffer.from(CLIENT_ID + ":" + CLIENT_SECRET).toString("base64");
  const t = await req({ method: "POST", hostname: "accounts.spotify.com", path: "/api/token", headers: { "Authorization": "Basic " + auth, "Content-Type": "application/x-www-form-urlencoded" } }, "grant_type=client_credentials");
  if (t.status !== 200) throw new Error("token failed " + t.status);
  const j = JSON.parse(t.body);
  token = j.access_token; tokenExp = Date.now() + (j.expires_in || 3600) * 1000;
}

let lastCall = 0;
async function api(p) {
  await ensureToken();
  const wait = MIN_INTERVAL - (Date.now() - lastCall);
  if (wait > 0) await sleep(wait);
  for (let attempt = 0; attempt < 5; attempt++) {
    lastCall = Date.now();
    const r = await req({ method: "GET", hostname: "api.spotify.com", path: "/v1" + p, headers: { "Authorization": "Bearer " + token } });
    if (r.status === 429) {
      const ra = parseInt(r.headers["retry-after"] || "2", 10);
      if (ra > MAX_BACKOFF) { console.log(`  429 — Retry-After ${ra}s (~${(ra / 3600).toFixed(1)}h): daily quota spent, aborting run (progress saved)`); aborted = true; return { status: 429, body: "quota" }; }
      console.log("  429 — backing off " + ra + "s"); await sleep((ra + 1) * 1000); continue;
    }
    if (r.status === 401) { token = ""; await ensureToken(); continue; }
    return r;
  }
  return { status: 0, body: "retries exhausted" };
}

// ── per-artist pull ──────────────────────────────────────────────────────────────
const norm = (s) => s.toLowerCase().replace(/\s+/g, " ").trim();
function pickArtist(items, name) {
  if (!items || !items.length) return null;
  const exact = items.find(a => norm(a.name) === norm(name));
  return exact || items[0];
}
async function pullArtist(name, existing) {
  let rec;
  if (existing && existing.id) {                 // reuse a cached identity → spend the call on albums only
    rec = { id: existing.id, url: existing.url, name: existing.name, img: existing.img, imgs: existing.imgs };
  } else {
    const s = await api("/search?q=" + encodeURIComponent(name) + "&type=artist&limit=5");
    if (s.status !== 200) return { err: s.status };
    const a = pickArtist(JSON.parse(s.body).artists.items, name);
    if (!a) return { miss: true };
    rec = {
      id: a.id,
      url: a.external_urls && a.external_urls.spotify || "",
      name: a.name,
      img: a.images && a.images[0] && a.images[0].url || "",
      imgs: (a.images || []).map(i => i.url),
    };
  }
  if (skipAlbums || aborted) return rec;
  const al = await api("/artists/" + rec.id + "/albums?include_groups=album&market=US&limit=50");
  if (al.status === 200) {
    const seen = new Set(), albums = [];
    for (const x of JSON.parse(al.body).items) {
      const k = norm(x.name); if (seen.has(k)) continue; seen.add(k);
      albums.push({ n: x.name, r: x.release_date || "", u: x.external_urls && x.external_urls.spotify || "", img: x.images && x.images[0] && x.images[0].url || "" });
      if (albums.length >= ALBUM_CAP) break;
    }
    rec.albums = albums;
  }
  return rec;
}

// ── main ───────────────────────────────────────────────────────────────────────
(async () => {
  const arts = loadArtists();           // plays-desc; index = popularity rank
  const cache = fs.existsSync(CACHE_PATH) ? JSON.parse(fs.readFileSync(CACHE_PATH, "utf8")) : {};
  // mode picks WHICH artists to consider:
  //   images → only those the build has no art for (identity fills the photo gap)
  //   covers → the top-N most-played (album-cover walls, where they matter most)
  //   (full) → everyone
  let pool = arts;
  if (MODE === "images") pool = arts.filter(a => !a.hasImage);
  else if (MODE === "photos") pool = arts;                  // every artist — Spotify alternate for all
  else if (MODE === "covers") pool = arts.slice(0, TOP);
  const names = pool.map(a => a.name);
  let todo = names.filter(n => {
    const c = cache[n];
    if (!c) return true;
    if (c.err) return true;                                  // always retry hard errors
    if (c.miss) return RETRY_MISSES;
    if (c.id && !c.albums && !skipAlbums) return true;       // got identity but never landed the album wall
    return false;
  });
  if (LIMIT !== Infinity) todo = todo.slice(0, LIMIT);
  const tag = MODE ? ` · mode=${MODE}${MODE === "covers" ? " top" + TOP : ""}` : "";
  console.log(`EXPLORE: ${arts.length} · pool: ${pool.length}${tag} · this run: ${todo.length}${skipAlbums ? " (identity only)" : ""}`);
  const t0 = Date.now();
  let added = 0;   // new photos/albums landed this run — drives the "all done" signal
  for (let i = 0; i < todo.length; i++) {
    const name = todo[i];
    try {
      const before = cache[name];
      const r = await pullArtist(name, before);
      if (r && (r.id || r.miss)) {
        if ((r.id && !(before && before.id)) || (r.albums && r.albums.length && !(before && before.albums && before.albums.length))) added++;
        cache[name] = r;   // keep hits + confirmed misses; abort leaves the rest untouched for next run
      }
    }
    catch (e) { cache[name] = { err: String(e).slice(0, 80) }; }
    if (aborted) { fs.writeFileSync(CACHE_PATH, JSON.stringify(cache)); console.log(`  stopped at ${i + 1}/${todo.length} — resume tomorrow`); break; }
    if ((i + 1) % 25 === 0 || i === todo.length - 1) {
      fs.writeFileSync(CACHE_PATH, JSON.stringify(cache));
      const el = (Date.now() - t0) / 1000, rate = (i + 1) / el;
      const eta = Math.round((todo.length - i - 1) / rate / 60);
      console.log(`  ${i + 1}/${todo.length}  ·  ${rate.toFixed(1)}/s  ·  ~${eta} min left`);
    }
  }
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache));
  const hits = Object.values(cache).filter(c => c.id).length, miss = Object.values(cache).filter(c => c.miss).length;
  console.log(`done · ${hits} matched · ${miss} missed · +${added} new this run · cache → spotify-cache.json`);
  // exit code is the completion signal for the daily routine: 4 = quota-paused (retry), 3 = nothing
  // left to pull (this mode is complete), 0 = made progress (keep going).
  process.exitCode = aborted ? 4 : (added === 0 ? 3 : 0);
})();
