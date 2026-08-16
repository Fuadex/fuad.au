// enrich-deezer-img.js — fill artist photos from Deezer for corpus artists that have NO image
// in any local source, so the artist page / Sounds-like tiles / explore grids show a real photo
// instead of a generative placeholder (owner ask: ANIMISERY & friends). Usage: node enrich-deezer-img.js [capN]
//
// Strict-gate, keyless Deezer search (mirrors sync-live.js's deezer()/mkey): a name only keeps a
// photo when the top hit's name matchKey-equals the query — a miss stays a placeholder by design
// (wrong-band photos are the enemy). Cached + incremental: names already in deezer-artist-img.json
// (or already resolvable locally, or already in live-artist-img.json) are skipped. Throttled ~4 req/s.
//
// Cache value semantics (same as sync-live): url = confirmed match, null = confirmed no-match (cache
// it, don't refetch), undefined = network/parse failure (do NOT cache — Deezer may be unreachable).

const fs = require("fs");
const path = require("path");
const https = require("https");
const vm = require("vm");

const CAP = parseInt(process.argv[2], 10) || 500;   // per-run fetch cap (cron stays fast; incremental chips away)
const CACHE_PATH = path.join(__dirname, "deezer-artist-img.json");
const LIVE_PATH = path.join(__dirname, "live-artist-img.json");   // sync-live's cache — same tier, don't refetch its names
const DELAY_MS = 250;   // ~4 req/s

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── load the last full build so we know the corpus (kept ARTISTS + EXPLORE), each artist's plays,
//    and which names already resolve to a local image (so we only network for genuine gaps) ──
let R = null, ADETAIL = null;
try {
  const ctx = { window: {}, console: { log() {}, error() {} } };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "music-core.js"), "utf8"), ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "music-rest.js"), "utf8"), ctx);   // merges EXPLORE
  R = ctx.window.ROTATION;
} catch (e) { console.error("could not load music-core/rest — run node build-data.js first: " + e.message); process.exit(1); }
// artist-detail.js carries the explorable artists' similar lists (`sim`) — the OTHER half of the
// similar-tile display names (kept artists carry theirs inline as `similarNames`). Optional: if the
// shard is missing we just skip the explorable sim names (older builds still enrich the corpus pool).
try {
  const ad = { window: {} };
  vm.createContext(ad);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "artist-detail.js"), "utf8"), ad);
  ADETAIL = ad.window.ROTATION_ADETAIL;
} catch (e) { ADETAIL = null; }

const idFor = (name) => (R.idForName && R.idForName(name)) || R.slug(name);
const mkey = (s) => (R.matchKey ? R.matchKey(s) : String(s).normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, ""));
// true when the client would ALREADY resolve a photo locally (kept-artist image or explorable THUMB
// slug — the THUMB slot already folds Discogs/curated/Spotify). If so, no Deezer lookup is needed.
const hasLocalImage = (name) => { const id = idFor(name); const a = R.byId[id]; if (a && a.image) return true; return !!(R.THUMBS && R.THUMBS[id]); };

// Deezer public search (no auth). url for an exact-name hit, null for a confident no-match, undefined
// on a network/parse hiccup (leave uncached — retry next run). Same strict squash the client uses.
const deezer = (name) => new Promise((res) => {
  const url = `https://api.deezer.com/search/artist?q=${encodeURIComponent(name)}&limit=1`;
  https.get(url, { headers: { "User-Agent": "rotation-enrich/1.0 (+https://fuad.au)", "Accept": "application/json" } }, (r) => {
    let b = ""; r.on("data", c => b += c); r.on("end", () => {
      try {
        const j = JSON.parse(b), a = j && j.data && j.data[0];
        if (a && a.name && mkey(a.name) === mkey(name)) return res(a.picture_medium || a.picture_big || a.picture || null);
        return res(null); // valid response, just no exact-name hit
      } catch (e) { return res(undefined); } // non-JSON / hiccup → unknown, leave uncached
    });
  }).on("error", () => res(undefined));
});

(async () => {
  const cache = fs.existsSync(CACHE_PATH) ? JSON.parse(fs.readFileSync(CACHE_PATH, "utf8")) : {};
  const live = fs.existsSync(LIVE_PATH) ? JSON.parse(fs.readFileSync(LIVE_PATH, "utf8")) : {};

  // target list = EVERY corpus artist name (kept ARTISTS + EXPLORE), plays-ordered so the visible
  // ANIMISERY-class artists come first, deduped by name.
  const playsByName = new Map();
  for (const a of (R.EXPLORE || [])) if (!playsByName.has(a.name)) playsByName.set(a.name, a.plays || 0);
  for (const a of (R.ARTISTS || [])) { const p = a.plays || 0; if (!playsByName.has(a.name) || p > playsByName.get(a.name)) playsByName.set(a.name, p); }
  const corpus = [...playsByName.entries()].sort((x, y) => y[1] - x[1]).map(e => e[0]);

  // sim-only names = every similar-tile DISPLAY name that is NOT a corpus artist. These render as
  // "Sounds like" tiles (kept artists' `similarNames`, explorable artists' artist-detail `sim`) but
  // have no byId record and no THUMB slot, so GenCover can only draw a generative placeholder today
  // — the Deezer tier (via SIMIMG) is the only way to give them a real photo. Collect the exact
  // display forms, drop any that fold to a corpus artist (idForName resolves → covered by the main
  // pool above), dedupe. These are appended AFTER the corpus so corpus artists always fetch first.
  const corpusKeys = new Set(corpus.map(mkey));                 // matchKey of every corpus name
  const isCorpusName = (name) => {
    const id = idFor(name);
    if (R.byId[id] || (R.THUMBS && R.THUMBS[id])) return true;   // resolves to a kept/explorable record
    return corpusKeys.has(mkey(name));                          // or shares a corpus name's match key
  };
  const simSeen = new Set(), simOnly = [];
  const addSim = (name) => {
    if (!name || typeof name !== "string") return;
    if (isCorpusName(name)) return;                             // covered by the corpus pool / byId / THUMBS
    const k = mkey(name); if (!k || simSeen.has(k)) return;     // dedupe by match key (same slot the client uses)
    simSeen.add(k); simOnly.push(name);
  };
  for (const a of (R.ARTISTS || [])) for (const s of (a.similarNames || [])) addSim(s);   // kept artists' similar lists
  if (ADETAIL && ADETAIL.d && Array.isArray(ADETAIL.names)) {                             // explorable artists' similar lists
    for (const id in ADETAIL.d) for (const ix of (ADETAIL.d[id].sim || [])) addSim(ADETAIL.names[ix]);
  }
  // artist-bios.json also carries last.fm `similar` name lists — for some explore-tier artists this
  // is the ONLY place a similar tile's display name exists (e.g. Chromera under ANIMISERY), so
  // sweep it too; same corpus/dedupe gates apply.
  try {
    const bios = JSON.parse(fs.readFileSync(path.join(__dirname, "artist-bios.json"), "utf8"));
    for (const k in bios) for (const s of (bios[k].similar || [])) addSim(typeof s === "string" ? s : (s && s.name));
  } catch (e) { /* optional source */ }

  // imageless = no local image, and not already resolved/decided in either Deezer cache (live is the
  // same tier — sync-live already fetched those names; a null there is a confirmed no-match too).
  const uncached = (name) =>
    !Object.prototype.hasOwnProperty.call(cache, name) &&
    !Object.prototype.hasOwnProperty.call(live, name);
  const need = corpus.filter(name => !hasLocalImage(name) && uncached(name))   // corpus first…
    .concat(simOnly.filter(uncached));                                          // …then sim-only display names

  // how many corpus artists are imageless in TOTAL (independent of cache state) — for the report
  const imagelessTotal = corpus.filter(name => !hasLocalImage(name)).length;
  console.log(`corpus artists: ${corpus.length} · imageless (no local photo): ${imagelessTotal} · sim-only names: ${simOnly.length} · to fetch this run: ${Math.min(need.length, CAP)} (of ${need.length} uncached) · cap ${CAP}`);

  let done = 0, hits = 0, noMatch = 0, netFail = 0;
  for (const name of need) {
    if (done >= CAP) break;
    const url = await deezer(name);
    if (url !== undefined) { cache[name] = url; if (url) hits++; else noMatch++; }   // undefined = leave uncached
    else netFail++;
    done++;
    if (done % 25 === 0) {
      fs.writeFileSync(CACHE_PATH, JSON.stringify(cache) + "\n", "utf8");
      console.log(`  ${done}/${Math.min(need.length, CAP)}… ${hits} matched, ${noMatch} no-match, ${netFail} net-fail`);
    }
    await sleep(DELAY_MS);
  }
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache) + "\n", "utf8");
  console.log(`done: ${done} fetched (${hits} matched, ${noMatch} no-match, ${netFail} net-fail) · cache now ${Object.keys(cache).length} names`);
})();
