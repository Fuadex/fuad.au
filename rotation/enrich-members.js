// enrich-members.js — band → member lineup from MusicBrainz artist-rels, for the VOCALS filter.
//
// WHY: Explore's VOCALS dimension classifies bands by their lead vocalist's gender. That data
// comes from a wikidata lineup (member instruments + genders). ~3,800 explore-pool artists have
// NO vocals data because their wikidata entry carries no lineup. But MusicBrainz DOES carry the
// lineup for most of them via the band's `member of band` relations — with the instrument/vocal
// ATTRIBUTES ("lead vocals" / "vocals" / "guitar" …) and each member's own mbid. enrich-mb.js
// already pulls these rels but only as [type,name,mbid] triples: it drops the attributes and
// never fetches the members' genders. This script fills that gap.
//
// TARGETS: explore-pool artists that build-data classifies as a Group (artist-origins.json type)
// but for whom the VOCALS classifier has NO usable lineup — i.e. no vocals.json entry AND no
// usable mb-artists.json lineup (a member credited with "vocals"/"lead vocals"). Same gap
// build-data sees when it can't produce a vx code. Plays-ordered (search-index.js) so the
// visible/most-played bands clear first.
//
// FETCH (2 request tiers, all at MB's 1 req/s):
//   1. band:  /artist/{mbid}?inc=artist-rels  → the `member of band` relations. Each relation
//             carries `attributes` (["lead vocals","guitar",…]), `begin`/`end` dates and an
//             embedded `artist` stub {id,name,type} — but NO gender (MB omits gender from the
//             relation's artist stub).
//   2. member: /artist/{memberMbid}  (no inc) → the member's own `gender`. Fetched ONCE per
//             distinct member mbid and cached (members are shared across bands), so the marginal
//             cost is the distinct-member count, not band×members.
//
// CACHE artist-members.json:  { bandName → { members:[{n,g,i,f,t}], fetched } }
//   n = member name, g = "M"/"F"/"" (from the member lookup), i = instrument/role attribute
//   strings (["lead vocals","guitar"]), f = begin date, t = end date ("" = current member).
//   This is the SAME per-member shape mb-artists.json / the wikidata lineup produces, so
//   build-data can consume either through the identical lead-vocals-first vox selection.
//   A distinct-member gender sidecar (_members) lives under a reserved key so member lookups are
//   shared/deduped across bands and across runs.
//
// Usage:  node enrich-members.js [capN] [--refresh=N]     (default capN=6000, refresh=0)
//   capN     — cap on NEW bands fetched this run (member sub-fetches are uncapped but deduped).
//   --refresh=N — after the new pass, refetch the N oldest-fetched bands so lineup changes
//                 (a new singer, a departure) eventually reach the frozen cache. Same rolling
//                 convention as enrich-mb.js / enrich-origins.js.

const fs = require("fs");
const path = require("path");
const https = require("https");

const args = process.argv.slice(2);
const CAP_N = parseInt(args.find(a => /^\d+$/.test(a)), 10) || 6000;
const REFRESH_ARG = args.find(a => /^--refresh=/.test(a));
const REFRESH_N = REFRESH_ARG ? Math.max(0, parseInt(REFRESH_ARG.split("=")[1], 10) || 0) : 0;

const CACHE_PATH   = path.join(__dirname, "artist-members.json");
const STATS_PATH   = path.join(__dirname, "artist-stats.json");
const ORIGINS_PATH = path.join(__dirname, "artist-origins.json");
const VOCALS_PATH  = path.join(__dirname, "vocals.json");
const MBART_PATH   = path.join(__dirname, "mb-artists.json");
const INDEX_PATH   = path.join(__dirname, "search-index.js");
const TOP_PLAYS = 500;      // top-N-by-plays share priority class 0 with ended bands in the refresh lane
const DELAY_MS  = 1100;     // ~1 req/sec (MusicBrainz rate limit)
const UA = "RotationEnricher/0.2 ( fuadex@gmail.com )";
const MEMBERS_KEY = "_members";   // reserved cache key: distinct-member gender sidecar {mbid→{g,fetched}}

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

// slug() must match build-data's — only used to test vocals.json membership (which is slug-keyed).
function slug(s) {
  const base = String(s).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (base) return base;
  // non-Latin fallback: same _slugHash idiom build-data uses ("a-" + base36 djb2).
  let h = 5381; for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return "a-" + h.toString(36);
}

// does an mb-artists.json entry already give the classifier a usable lineup? (a member credited
// with any "vocals" role) — mirrors build-data's vox selection tiers. If yes, the band is NOT a
// target (the classifier already has data for it via the mb-lineup path).
function mbLineupUsable(entry) {
  if (!entry || !Array.isArray(entry.members) || !entry.members.length) return false;
  return entry.members.some(m => (m.i || []).some(i => /vocals/i.test(i)));
}

// pull a band's member lineup from its artist-rels. Returns [{n,i,f,t,mbid}] (gender filled later),
// or null on fetch failure.
async function fetchBandMembers(mbid) {
  const u = `https://musicbrainz.org/ws/2/artist/${encodeURIComponent(mbid)}?inc=artist-rels&fmt=json`;
  const { json } = await getJSON(u);
  if (!json) return null;
  const out = [];
  for (const rel of (json.relations || [])) {
    if (rel.type !== "member of band") continue;
    const a = rel.artist;
    if (!a || !a.name || !a.id) continue;
    out.push({
      n: a.name,
      mbid: a.id,
      i: Array.isArray(rel.attributes) ? rel.attributes.slice() : [],   // ["lead vocals","guitar",…]
      f: rel.begin || "",
      t: rel.end || "",                                                 // "" = current member
    });
    if (out.length >= 40) break;
  }
  return out;
}

// pull a single member's gender (own artist doc). Returns "M"/"F"/"" (MB gender → first letter,
// uppercased; only Male/Female matter to the vox classifier).
async function fetchMemberGender(mbid) {
  const u = `https://musicbrainz.org/ws/2/artist/${encodeURIComponent(mbid)}?fmt=json`;
  const { json } = await getJSON(u);
  if (!json) return null;
  const g = (json.gender || "").trim();
  if (/^f/i.test(g)) return "F";
  if (/^m/i.test(g)) return "M";
  return "";   // known-but-not-applicable / null → no usable gender
}

(async () => {
  const stats   = fs.existsSync(STATS_PATH)   ? JSON.parse(fs.readFileSync(STATS_PATH, "utf8"))   : {};
  const origins = fs.existsSync(ORIGINS_PATH) ? JSON.parse(fs.readFileSync(ORIGINS_PATH, "utf8")) : {};
  const vocals  = fs.existsSync(VOCALS_PATH)  ? JSON.parse(fs.readFileSync(VOCALS_PATH, "utf8"))  : {};
  const mbRaw   = fs.existsSync(MBART_PATH)   ? JSON.parse(fs.readFileSync(MBART_PATH, "utf8"))   : {};
  // mb-artists.json is keyed by an internal name; index its entries by the queried name `q`.
  const mbByName = {}; for (const e of Object.values(mbRaw)) { if (e && e.q) mbByName[e.q] = e; }

  const idxSrc = fs.readFileSync(INDEX_PATH, "utf8");
  const start = idxSrc.indexOf("[", idxSrc.indexOf("ROTATION_SEARCH"));
  const rows = JSON.parse(idxSrc.slice(start, idxSrc.lastIndexOf("]") + 1));
  const ranked = rows.map(r => r[0]);                                   // names, plays-ordered
  const topPlaysSet = new Set(rows.slice(0, TOP_PLAYS).map(r => r[0])); // refresh priority lane

  const cache = fs.existsSync(CACHE_PATH) ? JSON.parse(fs.readFileSync(CACHE_PATH, "utf8")) : {};
  if (!cache[MEMBERS_KEY]) cache[MEMBERS_KEY] = {};                     // distinct-member gender sidecar
  const memCache = cache[MEMBERS_KEY];

  // a band is a TARGET iff: it's a Group in origins, has an mbid, isn't already cached here,
  // has no vocals.json entry (verified classifier data), and has no usable mb-artists lineup
  // (the classifier's other lineup source). Exactly the gap that leaves vx undefined.
  const isTarget = (name) => {
    const o = origins[name];
    if (!o || o.type !== "Group") return false;             // classified Group only
    if (!stats[name] || !stats[name].mbid) return false;    // need an mbid to fetch
    if (name in cache) return false;                        // already have this band
    if (slug(name) in vocals) return false;                 // verified vocals data already
    if (mbLineupUsable(mbByName[name])) return false;       // mb-lineup already gives the classifier a vox
    return true;
  };

  const todo = ranked.filter(isTarget).slice(0, CAP_N);
  const eligible = ranked.filter(isTarget).length;
  const cachedBands = Object.keys(cache).filter(k => k !== MEMBERS_KEY).length;
  console.log(`${eligible} eligible target bands (no wikidata/vocals lineup) · ${todo.length} this run (cap ${CAP_N}) · ${cachedBands} cached · ${Object.keys(memCache).length} member-genders cached · refresh=${REFRESH_N}`);

  const today = new Date().toISOString().slice(0, 10);
  let done = 0, failed = 0, memFetched = 0, req = 0;

  // resolve a member's gender: cache hit → free; miss → one MB request (deduped across all bands).
  async function genderFor(mbid) {
    if (mbid in memCache) return memCache[mbid].g;
    const g = await fetchMemberGender(mbid);
    req++; memFetched++;
    memCache[mbid] = { g: g == null ? "" : g, fetched: today };
    await sleep(DELAY_MS);
    return memCache[mbid].g;
  }

  // fetch one band + its members' genders, store into cache (fully replacing any existing record).
  async function fetchInto(name) {
    try {
      const raw = await fetchBandMembers(stats[name].mbid);
      req++;
      await sleep(DELAY_MS);
      if (!raw) { cache[name] = { members: [], fetched: today, error: true }; failed++; return; }
      const members = [];
      for (const m of raw) {
        const g = await genderFor(m.mbid);                  // shared/deduped member lookup
        members.push({ n: m.n, g: g || "", i: m.i, f: m.f, t: m.t });
      }
      cache[name] = { members, fetched: today };
    } catch (e) {
      cache[name] = { members: [], fetched: today, error: true };
      failed++;
    }
  }

  const flush = () => fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 0), "utf8");

  // ---- new-band pass ----
  for (const name of todo) {
    await fetchInto(name);
    done++;
    if (done % 20 === 0) { flush(); console.log(`  ${done}/${todo.length} bands · ${req} reqs · ${Object.keys(memCache).length} members…`); }
  }
  flush();
  console.log(`new-band pass done: ${done} bands (${failed} failed) · ${memFetched} new member-genders · cache now ${Object.keys(cache).length - 1} bands`);

  // ---- rolling-refresh pass ----
  if (REFRESH_N > 0) {
    const isEnded = (name) => !!(origins[name] && origins[name].ended);
    const priClass = (name) => (isEnded(name) || topPlaysSet.has(name)) ? 0 : 1;
    const candidates = Object.keys(cache)
      .filter(name => name !== MEMBERS_KEY && stats[name] && stats[name].mbid)
      .map(name => ({ name, pc: priClass(name), fetched: cache[name].fetched || "" }))
      .sort((a, b) => (a.pc - b.pc) || (a.fetched < b.fetched ? -1 : a.fetched > b.fetched ? 1 : 0))
      .slice(0, REFRESH_N);
    const c0 = candidates.filter(c => c.pc === 0).length;
    console.log(`refresh: ${candidates.length} bands (${c0} priority-class-0 ended/top${TOP_PLAYS}, ${candidates.length - c0} tail)`);
    let rdone = 0;
    for (const { name } of candidates) {
      await fetchInto(name);
      rdone++; done++;
      if (rdone % 20 === 0) { flush(); console.log(`  refreshed ${rdone}/${candidates.length}…`); }
    }
    flush();
    console.log(`refresh pass done: ${rdone} refetched`);
  }

  console.log(`done: ${done} bands fetched (${failed} failed) · ${req} total MB requests · cache ${Object.keys(cache).length - 1} bands + ${Object.keys(memCache).length} member-genders`);
})();
