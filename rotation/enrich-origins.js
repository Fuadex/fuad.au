// enrich-origins.js — fetch artist country/area from MusicBrainz using the artist's mbid:
// pins.json first (verified corrections win), else artist-stats.json's last.fm-resolved id.
// Writes artist-origins.json: { name → { country, area, type, fetched } }.
// MusicBrainz rate limit: 1 req/sec, requires UA. No API key.
// Usage:  node enrich-origins.js [topN] [--refresh=N]   (default topN=2000, refresh=0)
// Cached + incremental. Artists without an mbid are skipped.
//
// Rolling refresh (--refresh=N): after the normal new-artist pass, ALSO refetch the N
// entries with the OLDEST `fetched` dates so LIFE-STATUS changes (reactivations, new
// disbandments, deaths — the `ended`/`end` flags this cache owns) eventually reach the
// frozen cache. Refetched entries fully replace the cached record with a fresh `fetched`
// date, at the same 1 req/s throttle. Candidates are ranked by (priority-class, fetched asc):
// class 0 = currently-ENDED artists (this cache's own `ended` flag) OR the top-500-by-plays,
// class 1 = the long tail. Default 0 keeps local one-off runs behaving exactly as before.

const fs = require("fs");
const path = require("path");
const https = require("https");

const args = process.argv.slice(2);
const TOP_N = parseInt(args.find(a => /^\d+$/.test(a)), 10) || 2000;
const REFRESH_ARG = args.find(a => /^--refresh=/.test(a));
const REFRESH_N = REFRESH_ARG ? Math.max(0, parseInt(REFRESH_ARG.split("=")[1], 10) || 0) : 0;
const CACHE_PATH = path.join(__dirname, "artist-origins.json");
const STATS_PATH = path.join(__dirname, "artist-stats.json");
const PINS_PATH = path.join(__dirname, "pins.json");
const INDEX_PATH = path.join(__dirname, "search-index.js");
const TOP_PLAYS = 500; // top-N-by-plays that share priority class 0 with ended artists
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

// ─────────── PINNED MBIDs WIN (Fuad 2026-09-21: "make sure all these folds are recorded
// somewhere so that future scrapes or so don't undo the fixes") ───────────
// artist-stats.json's `mbid` is whatever last.fm resolved the scrobble name to, and last.fm
// resolves a short/common name to the wrong act often enough that 90 of them have now been
// hand-corrected across three repair waves. That field is rewritten by every enrich-stats.js
// run, so a stats-side mbid is NOT durable — a pin is. pins.json is the ledger of every
// verified correction (see its _doc: "enrichers should prefer a pinned id"), and this makes
// that promise true: the pin wins over stats, AND over the blind name search below (a pinned
// name is never guessed at again). Exact scrobble-name keys only (build-data's alias
// resolution isn't available here).
const PINS = (() => { try { const p = JSON.parse(fs.readFileSync(PINS_PATH, "utf8")); delete p._doc; return p; } catch (e) { return {}; } })();
const mbidFor = (stats, name) => (PINS[name] && PINS[name].mbid) || (stats[name] && stats[name].mbid) || "";

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
  // 2026-09-21: a parseable body is NOT proof of an answer. MusicBrainz returns JSON for its own
  // failures too ({"error":"Not Found"} on a dead mbid, the 503 rate-limit body, maintenance
  // pages), and returning the blank shape here froze one bad minute into a permanent "no country,
  // no life-span" record. An artist document always carries its own `id`; a body without one is
  // a FAILURE, and null says so — every caller below skips the write on null.
  if (!json || !json.id) return null;
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
  // top-500-by-plays share priority class 0 with ended artists in the refresh lane
  const topPlaysSet = new Set(rows.slice(0, TOP_PLAYS).map(r => r[0]));

  const cache = fs.existsSync(CACHE_PATH) ? JSON.parse(fs.readFileSync(CACHE_PATH, "utf8")) : {};
  // fetch new artists AND backfill cached entries missing the newer fields (gender/life-span).
  // Artists without a last.fm mbid go through the exact-match MB name search (2 requests each).
  const todo = ranked.filter(name => (!(name in cache) || !("gender" in cache[name])) && mbidFor(stats, name));
  // a pinned name always has an id, so it never falls through to the blind name search
  const noMbid = ranked.filter(name => (!(name in cache) || cache[name].error) && !mbidFor(stats, name));
  console.log(`${ranked.length} target artists · ${todo.length} to fetch · ${Object.keys(cache).length} cached · ${noMbid.length} no-mbid → search fallback · refresh=${REFRESH_N}`);

  let done = 0, failed = 0;
  const today = new Date().toISOString().slice(0, 10);
  for (const name of noMbid) {
    const mbid = await searchMbid(name);
    await sleep(DELAY_MS);
    if (!mbid) { done++; continue; }
    try {
      const o = await fetchOrigin(mbid);      // null ⇒ answerless/failed: skip the write (2026-09-21)
      if (o) cache[name] = { ...o, mbidVia: "search", fetched: today }; else failed++;
    }
    catch (e) { failed++; }
    done++;
    if (done % 25 === 0) { fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 0), "utf8"); console.log(`  search ${done}/${noMbid.length}…`); }
    await sleep(DELAY_MS);
  }
  done = 0;
  for (const name of todo) {
    // 2026-09-21: a failure writes NOTHING — see fetchOrigin. The old blank-with-error:true record
    // froze a transient MusicBrainz failure into a permanent stub, and because `todo` only picks
    // up names not already cached, the stub blocked the retry too (the 661-entry blank class).
    try {
      const o = await fetchOrigin(mbidFor(stats, name));   // pinned id wins over stats (2026-09-21)
      if (o) cache[name] = { ...o, fetched: today }; else failed++;
    } catch (e) {
      failed++;                        // no write, so the next run retries
    }
    done++;
    if (done % 25 === 0) {
      fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 0), "utf8");
      console.log(`  ${done}/${todo.length}…`);
    }
    await sleep(DELAY_MS);
  }
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 0), "utf8");
  console.log(`new-artist pass done: ${done} fetched (${failed} failed) · cache now ${Object.keys(cache).length} artists`);

  // ---- rolling-refresh pass ----
  if (REFRESH_N > 0) {
    // candidates: cached entries we can refetch by mbid, minus anything just fetched above
    // (their fetched === today already, so they naturally sort last anyway).
    const isEnded = (name) => !!(cache[name] && cache[name].ended);
    const priClass = (name) => (isEnded(name) || topPlaysSet.has(name)) ? 0 : 1;
    const candidates = Object.keys(cache)
      .filter(name => mbidFor(stats, name))
      .map(name => ({ name, pc: priClass(name), fetched: (cache[name] && cache[name].fetched) || "" }))
      // (priority-class asc, fetched-date asc): ended/top-500 first, oldest within each class
      .sort((a, b) => (a.pc - b.pc) || (a.fetched < b.fetched ? -1 : a.fetched > b.fetched ? 1 : 0))
      .slice(0, REFRESH_N);

    const c0 = candidates.filter(c => c.pc === 0).length;
    console.log(`refresh: ${candidates.length} entries (${c0} priority-class-0 ended/top${TOP_PLAYS}, ${candidates.length - c0} tail)`);

    let rdone = 0;
    for (const { name } of candidates) {
      // 2026-09-21: never clobber a good cached record with a blank on a transient failure.
      try {
        const o = await fetchOrigin(mbidFor(stats, name));  // pinned id wins over stats (2026-09-21)
        if (o) cache[name] = { ...o, fetched: today }; else failed++;
      } catch (e) {
        failed++;                      // no write: the existing record stands, retried later
      }
      rdone++; done++;
      if (rdone % 25 === 0) {
        fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 0), "utf8");
        console.log(`  refreshed ${rdone}/${candidates.length}…`);
      }
      await sleep(DELAY_MS);
    }
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 0), "utf8");
    console.log(`refresh pass done: ${rdone} refetched`);
  }

  console.log(`done: ${done} fetched total (${failed} failed) · cache now ${Object.keys(cache).length} artists`);
})();
