// build-data.js — regenerates music-core.js + music-rest.js (the split music data) from
// fuadex.csv (last.fm export). NOTE: pre-split checkouts wrote a single music-data.js — if
// that file reappears in the repo it's a stale build from an old machine; delete it.
// Usage: node build-data.js
// CSV format (no header): artist,album,track,"DD MMM YYYY HH:MM" (UTC)

const fs = require("fs");
const path = require("path");

const CSV_PATH = path.join(__dirname, "fuadex.csv");
const OUT_PATH = path.join(__dirname, "music-core.js");    // eager core (Phase 0 split)
const REST_PATH = path.join(__dirname, "music-rest.js");   // deferred rest, injected post-paint
// last.fm exports timestamps in UTC; shift to local listening time (AEST)
const TZ_OFFSET_HOURS = 10;
// scrobbles with lost timestamps (1970) are legacy plays from before scrobbling
// began — spread them evenly from here to the first real scrobble. They count
// toward eras/years/discovery but not the clock, streaks, or top-day stats.
const UNDATED_REMAP_START = Date.UTC(2006, 0, 1);

const TOP_ARTISTS = 400;       // ~100-play cutoff (rank 400 = 99 plays) — full pages for everyone played ~100+ times
const TOP_ALBUMS = 120;        // bumped from 60 — wider Charts coverage
const TOP_TRACKS = 50;         // bumped from 24 — wider Charts coverage
const ALBUMS_PER_ARTIST = 4;

// ─────────── CSV parsing ───────────
function parseLine(line) {
  const out = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
      else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

const MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
function parseDate(s) {
  // "25 May 2026 15:39"
  const m = /^(\d{2}) (\w{3}) (\d{4}) (\d{2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const ms = Date.UTC(+m[3], MONTHS[m[2]], +m[1], +m[4], +m[5]) + TZ_OFFSET_HOURS * 3600e3;
  return new Date(ms); // read with getUTC* = local listening time
}

// slug/_slugHash extracted to lib-slug.js — single source of truth; workshop scripts and
// the smoke test require the same file (a hand-copied slug caused the 2026-07 CJK key bug)
const { slug, _slugHash } = require("./lib-slug");
const hueOf = (name) => { let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 360; };

// ─────────── mock-curated artist metadata (name → hue, country, tags, similar, audio) ───────────
const META = {};
[
  ["Nine Inch Nails", 212, "us", ["industrial rock","industrial","electronic","alternative"], ["Marilyn Manson","Ministry","How to Destroy Angels","Filter"], [.82,.30,.18,.62,.45,.30]],
  ["Linkin Park", 18, "us", ["nu-metal","alternative metal","rap metal","electronic"], ["Limp Bizkit","Korn","Crossfaith","Papa Roach"], [.85,.42,.15,.66,.50,.20]],
  ["System of a Down", 8, "us", ["nu-metal","alternative metal","thrash metal","armenian"], ["Korn","Deftones","Slipknot","Rage Against the Machine"], [.92,.45,.12,.78,.40,.20]],
  ["Deftones", 290, "us", ["alternative metal","nu-metal","shoegaze","post-metal"], ["Tool","Coaltar of the Deepers","Chevelle","Far"], [.78,.35,.22,.58,.42,.30]],
  ["Korn", 26, "us", ["nu-metal","alternative metal","industrial metal"], ["Limp Bizkit","Slipknot","Linkin Park","Coal Chamber"], [.86,.32,.14,.62,.46,.20]],
  ["Tool", 276, "us", ["progressive metal","alternative metal","art rock"], ["A Perfect Circle","Deftones","Puscifer","Karnivool"], [.70,.30,.20,.55,.30,.45]],
  ["Rammstein", 220, "de", ["industrial metal","neue deutsche härte","industrial"], ["Nine Inch Nails","Ministry","Oomph!","Marilyn Manson"], [.84,.40,.14,.60,.50,.25]],
  ["Slipknot", 4, "us", ["nu-metal","metalcore","alternative metal"], ["Korn","Slayer","System of a Down","Machine Head"], [.94,.28,.10,.80,.35,.18]],
  ["Bring Me the Horizon", 342, "uk", ["metalcore","post-hardcore","electronicore","deathcore"], ["Architects","Northlane","Sleep Token","Thornhill"], [.85,.42,.16,.66,.45,.22]],
  ["The Prodigy", 152, "uk", ["big beat","breakbeat","electronic","rave"], ["The Chemical Brothers","Pendulum","Crystal Castles","Fatboy Slim"], [.90,.55,.10,.85,.78,.55]],
  ["Machine Head", 0, "us", ["groove metal","thrash metal","metalcore"], ["Slayer","Megadeth","Lamb of God","Pantera"], [.90,.30,.10,.78,.32,.20]],
  ["A Perfect Circle", 286, "us", ["alternative metal","art rock","progressive rock"], ["Tool","Puscifer","Deftones","Chevelle"], [.62,.35,.30,.50,.32,.35]],
  ["Muse", 256, "uk", ["alternative rock","art rock","electronic rock"], ["Queens of the Stone Age","Radiohead","Royal Blood","Biffy Clyro"], [.75,.50,.22,.62,.48,.30]],
  ["Ocean Grove", 322, "au", ["nu-metal","alternative metal","post-hardcore","nu-gaze"], ["Thornhill","Northlane","Deftones","House of Protection"], [.84,.48,.18,.64,.52,.28]],
  ["Limp Bizkit", 30, "us", ["nu-metal","rap metal","alternative metal"], ["Korn","Linkin Park","Papa Roach","P.O.D."], [.88,.50,.12,.70,.58,.18]],
  ["Slayer", 2, "us", ["thrash metal","speed metal","heavy metal"], ["Megadeth","Metallica","Sodom","Kreator"], [.95,.25,.08,.88,.28,.20]],
  ["deadmau5", 196, "ca", ["progressive house","electro house","techno"], ["Eric Prydz","Pendulum","Wolfgang Gartner","Rezz"], [.78,.55,.08,.82,.80,.75]],
  ["Megadeth", 12, "us", ["thrash metal","heavy metal","speed metal"], ["Slayer","Metallica","Annihilator","Testament"], [.90,.32,.10,.84,.30,.25]],
  ["Alice in Chains", 32, "us", ["grunge","alternative metal","sludge metal"], ["Soundgarden","Tool","Deftones","Mad Season"], [.68,.28,.30,.52,.32,.30]],
  ["Haru Nemuri", 330, "jp", ["japanese","poetry rap","noise rock","post-hardcore"], ["Number Girl","Ling Tosite Sigure","Otoboke Beaver","Tricot"], [.88,.55,.18,.70,.50,.30]],
  ["The Mad Capsule Markets", 140, "jp", ["digital hardcore","japanese","industrial","electronic"], ["Number Girl","Machine Girl","Coaltar of the Deepers","Boris"], [.92,.45,.10,.80,.60,.35]],
  ["Machine Girl", 308, "us", ["digital hardcore","breakcore","hardcore punk","electronic"], ["The Mad Capsule Markets","Crystal Castles","SeeYouSpaceCowboy","100 gecs"], [.95,.40,.08,.90,.55,.40]],
  ["Northlane", 240, "au", ["metalcore","djent","progressive metalcore","electronic"], ["Architects","Thornhill","Invent Animate","Erra"], [.86,.40,.16,.70,.48,.30]],
  ["Queens of the Stone Age", 22, "us", ["stoner rock","alternative rock","desert rock"], ["Them Crooked Vultures","Kyuss","Eagles of Death Metal","Royal Blood"], [.74,.48,.22,.60,.50,.30]],
  ["Type O Negative", 128, "us", ["gothic metal","doom metal","industrial"], ["Paradise Lost","Danzig","Moonspell","The 69 Eyes"], [.66,.25,.24,.48,.34,.30]],
  ["Babymetal", 346, "jp", ["kawaii metal","japanese","metalcore","idol"], ["HANABIE.","Maximum the Hormone","Bring Me the Horizon","Ladybeard"], [.88,.62,.14,.72,.58,.25]],
  ["Coaltar of the Deepers", 166, "jp", ["japanese","shoegaze","alternative metal","nu-gaze"], ["Deftones","Number Girl","Boris","Ling Tosite Sigure"], [.80,.42,.28,.60,.40,.45]],
  ["Ling Tosite Sigure", 200, "jp", ["japanese","math rock","post-hardcore","progressive"], ["Number Girl","Tricot","Haru Nemuri","toe"], [.86,.48,.20,.74,.42,.45]],
  ["Crystal Castles", 300, "ca", ["witch house","electronic","noise","synthpunk"], ["Sleigh Bells","HEALTH","Machine Girl","Grimes"], [.80,.35,.12,.72,.62,.45]],
  ["Number Girl", 352, "jp", ["japanese","noise rock","post-punk","alternative"], ["Ling Tosite Sigure","Haru Nemuri","Coaltar of the Deepers","Tricot"], [.86,.46,.22,.74,.40,.35]],
  ["Poppy", 318, "us", ["metalcore","art pop","industrial metal","electronic"], ["Spiritbox","Bring Me the Horizon","Babymetal","Sleep Token"], [.82,.45,.18,.66,.52,.28]],
  ["Maximum the Hormone", 14, "jp", ["japanese","nu-metal","hardcore punk","metalcore"], ["Babymetal","Crossfaith","Coaltar of the Deepers","Dir En Grey"], [.94,.55,.10,.82,.50,.22]],
  ["Architects", 350, "uk", ["metalcore","djent","progressive metalcore"], ["Bring Me the Horizon","Northlane","While She Sleeps","Erra"], [.88,.36,.14,.72,.44,.28]],
  ["Pendulum", 186, "au", ["drum and bass","electronic rock","breakbeat"], ["The Prodigy","Knife Party","Toronto Is Broken","Chase & Status"], [.90,.55,.10,.88,.74,.45]],
  ["Celldweller", 230, "us", ["industrial","electronic rock","industrial metal"], ["Nine Inch Nails","Blue Stahli","Crossfaith","Pendulum"], [.84,.45,.14,.72,.56,.40]],
  ["PRO8L3M", 46, "pl", ["polish hip-hop","hip-hop","electronic"], ["Pezet","Taco Hemingway","Quebonafide","O.S.T.R."], [.62,.50,.30,.55,.70,.30]],
  ["Toronto Is Broken", 176, "uk", ["drum and bass","liquid dnb","electronic"], ["Pendulum","Koven","Camo & Krooked","Netsky"], [.84,.58,.10,.90,.72,.55]],
  ["Pezet", 42, "pl", ["polish hip-hop","boom bap","hip-hop"], ["PRO8L3M","O.S.T.R.","Taco Hemingway","Małpa"], [.55,.52,.36,.50,.66,.25]],
  ["Wargasm", 314, "uk", ["electronic rock","industrial","nu-metal","alternative"], ["Nine Inch Nails","Poppy","Machine Girl","Pendulum"], [.86,.48,.14,.70,.58,.28]],
  ["Thornhill", 332, "au", ["metalcore","alternative metal","nu-gaze"], ["Ocean Grove","Northlane","Deftones","Invent Animate"], [.82,.40,.20,.64,.46,.30]],
  ["Otoboke Beaver", 336, "jp", ["japanese","garage punk","punk","noise rock"], ["TsuShiMaMiRe","Number Girl","Shonen Knife","Haru Nemuri"], [.92,.62,.16,.80,.48,.25]],
  ["HANABIE.", 340, "jp", ["kawaii metalcore","japanese","metalcore","electronicore"], ["Babymetal","Maximum the Hormone","Poppy","Crossfaith"], [.90,.62,.12,.74,.56,.25]],
  ["Magdalena Bay", 304, "us", ["hyperpop","synth-pop","art pop","electronic"], ["Jane Remover","100 gecs","Charli XCX","Grimes"], [.66,.62,.18,.58,.74,.40]],
  ["Crossfaith", 206, "jp", ["metalcore","electronicore","japanese","trance metal"], ["coldrain","Northlane","Bring Me the Horizon","Maximum the Hormone"], [.90,.50,.10,.76,.58,.28]],
].forEach(r => { META[r[0]] = { hue: r[1], country: r[2], tags: r[3], similar: r[4], audio: r[5] }; });

// ─────────── real last.fm tags (tag-cache.json, built by enrich-tags.js) ───────────
const TAG_CACHE_PATH = path.join(__dirname, "tag-cache.json");
const TAG_CACHE = fs.existsSync(TAG_CACHE_PATH) ? JSON.parse(fs.readFileSync(TAG_CACHE_PATH, "utf8")) : {};
const hasTags = Object.keys(TAG_CACHE).length > 0;
const cachedTags = (name) => { const t = aliasedByName(TAG_CACHE, name); return (t && t.tags) || []; }; // [[tag, count 0–100], …]
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

// ─────────── global last.fm stats (artist-stats.json, built by enrich-stats.js) ───────────
// Per artist: { listeners, playcount, mbid }. Powers the obscurity index; mbid
// seeds the future MusicBrainz / AcousticBrainz / Discogs enrichment layer.
const STATS_PATH = path.join(__dirname, "artist-stats.json");
const STATS = fs.existsSync(STATS_PATH) ? JSON.parse(fs.readFileSync(STATS_PATH, "utf8")) : {};
const hasStats = Object.keys(STATS).length > 0;
const listenersOf = (name) => { const s = aliasedByName(STATS, name); return s && s.listeners > 0 ? s.listeners : null; };

// ─────────── MusicBrainz aliases (artist-aliases.json, by enrich-aliases.js) ───────────
// Cross-script identity: ミドリ ↔ Midori, Боevsky ↔ Boevsky, etc. Folded into PLAYED
// so the Sounds-Like "in library" check works for similar-artist names in Latin script
// even when we've only scrobbled the native-script form.
const ALIASES_PATH = path.join(__dirname, "artist-aliases.json");
const ALIASES = fs.existsSync(ALIASES_PATH) ? JSON.parse(fs.readFileSync(ALIASES_PATH, "utf8")) : {};

// ─────────── Discogs artist images (artist-images.json, by enrich-images.js) ───────────
const IMAGES_PATH = path.join(__dirname, "artist-images.json");
const IMAGES = fs.existsSync(IMAGES_PATH) ? JSON.parse(fs.readFileSync(IMAGES_PATH, "utf8")) : {};
// discogs-artist.json (enrich-discogs-artist.js) — ONE /artists/{id} call captured image +
// profile (bio) + members/groups (connections) + urls. Preferred over the older image-only cache.
const DGA_PATH = path.join(__dirname, "discogs-artist.json");
const DGA = fs.existsSync(DGA_PATH) ? JSON.parse(fs.readFileSync(DGA_PATH, "utf8")) : {};
// Spotify photos (built by enrich-spotify.js, pulled daily) — fallback only, where Discogs/last.fm
// had no image. img is 640px; reused for both the full image and the thumbnail.
const SPOT = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, "spotify-cache.json"), "utf8")); } catch (e) { return {}; } })();
// enrichment pulled from the local Spotify catalogue dataset (enrich-spotify-archive.js): album covers,
// artist images (fallback), Spotify genres.
const _readJson = (f) => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, f), "utf8")); } catch (e) { return {}; } };
// -extra files hold conservatively fuzzy-matched additions (cover-audit tiers) + future CAA
// fills; kept separate so an enrich-spotify-archive --rematch can't clobber them. Base wins.
const ALBART = { ..._readJson("spotify-albumart-extra.json"), ..._readJson("spotify-albumart.json") };   // "artistSlug~titleSlug" → cover url
const ALBMETA = { ..._readJson("spotify-albummeta-extra.json"), ..._readJson("spotify-albummeta.json") }; // "artistSlug~titleSlug" → [releaseYear, typeChar, label]
const ARTIMG = _readJson("spotify-artist-img.json");  // name → 640px artist image
const SPOTGEN = { ..._readJson("spotify-genres-extra.json"), ..._readJson("spotify-genres.json") }; // name → [genre, …]
const ALBTRACKS = _readJson("spotify-albtracks.json"); // "artistSlug~titleSlug" → album total_tracks (completeness)
const TRACKDATA = _readJson("spotify-track-data.json"); // "artistSlug~trackSlug" → [durSec, pop, explicit, trackNo, (energy, valence, acoustic, tempo, dance, instr)]  (features 0..100)
// slug~album keyed → alias-aware (fall back to the pre-fold artist-slug prefix, same album part).
const albArt = (artist, title) => aliasedBySlugAlbum(ALBART, slug(artist), slug(title)) || "";
const albMeta = (artist, title) => aliasedBySlugAlbum(ALBMETA, slug(artist), slug(title)) || 0;
const trackData = (artist, title) => aliasedBySlugAlbum(TRACKDATA, slug(artist), slug(title)) || 0;
// name-keyed → alias-aware (fall back to a pre-fold variant name).
const spotImg = (name) => { const s = aliasedByName(SPOT, name); return (s && s.img) || aliasedByName(ARTIMG, name) || ""; };
// Deezer photos (deezer-artist-img.json by enrich-deezer-img.js; live-artist-img.json by sync-live.js) —
// the LAST-RESORT fallback for artists Discogs/last.fm/Spotify never covered, so long-tail acts
// (ANIMISERY-class) show a real photo instead of a generative placeholder. Both are {name: url|null}
// (null = confirmed Deezer no-match); merged live-first so a manual/live fill wins, then the batch cache.
const DZIMG = { ..._readJson("deezer-artist-img.json"), ..._readJson("live-artist-img.json") };
const deezerImg = (name) => { const u = aliasedByName(DZIMG, name); return (typeof u === "string" && u) ? u : ""; };
// clearImage pin: the Discogs/last.fm image is a wrong entity — fall through to Spotify
// (whose cache entry can itself be repointed by id via the spotify pin; the LiSA case).
// Deezer is appended LAST so it only fills genuine placeholder gaps; it never overrides Discogs/Spotify.
const imageOf = (name) => { { const _p = pinOf(name); if (_p && _p.clearImage) return spotImg(name) || deezerImg(name) || ""; } const d = aliasedByName(DGA, name), i = aliasedByName(IMAGES, name); return (d && d.image) || (i && i.image) || spotImg(name) || deezerImg(name) || ""; };
const thumbOf = (name) => { { const _p = pinOf(name); if (_p && _p.clearImage) return spotImg(name) || deezerImg(name) || ""; } const d = aliasedByName(DGA, name), i = aliasedByName(IMAGES, name); return (d && d.thumb) || (i && i.thumb) || spotImg(name) || deezerImg(name) || ""; };
const dgProfileOf = (name) => { const d = aliasedByName(DGA, name); return (d && d.profile) || ""; };
const dgMembersOf = (name) => { const d = aliasedByName(DGA, name); return (d && d.members) || []; };

// ─────────── last.fm bios + REAL similar-artists (artist-bios.json, by enrich-bios.js) ───────────
const BIOS_PATH = path.join(__dirname, "artist-bios.json");
const BIOS = fs.existsSync(BIOS_PATH) ? JSON.parse(fs.readFileSync(BIOS_PATH, "utf8")) : {};
const hasBios = Object.keys(BIOS).length > 0;
const bioOf = (name) => { const pn = pinOf(name); if (pn && pn.bio) return pn.bio; const b = aliasedByName(BIOS, name); return (b && b.bio) || ""; };
const realSimilar = (name) => { const b = aliasedByName(BIOS, name); return (b && b.similar) || null; };

// ─────────── curated coherency folds (folds.json — hand-auditable ledger) ───────────
// Optional ledger of KNOWN artist/album/track variants that build-data's automatic
// most-played-wins machinery can't express (see .sptmp/coherency/LEDGER_DESIGN.md).
// Ships SEPARATELY after owner review; when absent this whole feature no-ops (empty {}).
// Grouped by CANONICAL artist name; three optional arrays per block (tracks/albums/artist).
// Applied at four ingest slots below (artist→HAND_MERGE, album→ALBUM_FOLD, track→
// TRACK_MERGE/TRACK_FOLD, variant→ROTATION_VARIANT_OF sidecar). Keys derive via lib-slug.
const FOLDS = (() => {
  try { const f = JSON.parse(fs.readFileSync(path.join(__dirname, "folds.json"), "utf8")); delete f._doc; delete f._comment; delete f.note; delete f._exclude; delete f._moves; return f; }
  catch (e) { return {}; }
})();
// _moves: top-level list in folds.json of per-track ARTIST reassignments — a single (fromArtist,
// fromTrack) pair is retargeted to (toArtist, toTrack) at ingest, BEFORE any play/album/track map
// is keyed, so plays/media/reads all follow the move. Unlike an artist fold (whole artist) or a
// track fold (rename within one canonical artist), this SPLITS one row off an artist (e.g. "Late
// Goodbye" scrobbled under the game OST "Max Payne 2" → the band "Poets of the Fall"). Keyed on
// slug(fromArtist)~slug(fromTrack); value = [toArtist, toTrack]. Read raw (FOLDS deletes _moves).
const MOVES = new Map();
try {
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, "folds.json"), "utf8"));
  for (const m of (raw._moves || [])) {
    if (!m || !m.fromArtist || !m.fromTrack || !m.toArtist) continue;
    MOVES.set(slug(m.fromArtist) + "~" + slug(m.fromTrack), [m.toArtist, m.toTrack || m.fromTrack]);
  }
} catch (e) {}
// _exclude: top-level list in folds.json of pure-noise "artists" (tutorials, trailers, YouTube
// junk) to drop entirely at ingest — never reach plays/EXPLORE/search. Read raw (before _exclude
// is deleted from the FOLDS object above). Match on the exact raw scrobble name AND on slug
// equality as a safety net for whitespace/case drift. Distinct from NON_ARTISTS (baked-in list).
const EXCLUDE = new Set(), EXCLUDE_SLUGS = new Set();
try {
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, "folds.json"), "utf8"));
  for (const n of (raw._exclude || [])) { EXCLUDE.add(n); EXCLUDE_SLUGS.add(slug(n)); }
} catch (e) {}
const isExcluded = (name) => EXCLUDE.has(name) || EXCLUDE_SLUGS.has(slug(name));
// VARIANT_OF: "<artistSlug>~<variantSlug>" → "<artistSlug>~<canonSlug>" for track/album variants.
// Same shape as ALBUM_ALIAS; emitted to variant-of.js. Populated at the fold-seed steps below.
const VARIANT_OF = {};
// ABSORB: "<singleAlbumSlug>" → "<targetLpSlug>" for singles→LP folds (albums[] type "absorb").
// Same "<artistSlug>~<titleSlug>" key shape as ALBUM_ALIAS/VARIANT_OF. LINK, NOT MERGE — the
// single's album row is KEPT (browsable/clickable); only AGGREGATIONS (flowmap) and track→album
// navigation resolve through this map to the LP. Emitted to album-absorb.js. See LEDGER_DESIGN.md
// + the singles→LP absorb design. Populated at the album fold-seed step below.
const ALBUM_ABSORB = {};
// ABSORB_TITLE: "<canonArtist>\x00<singleDisplayTitle>" → <lpDisplayTitle>. Build-side twin of
// ALBUM_ABSORB used where the aggregation keys albums by DISPLAY title (artist-flow). Lets the
// single's per-year plays fold into the LP's flow stream so the single stops appearing as its own
// blob — without touching the single's own album row/plays.
const ABSORB_TITLE = new Map();
const absorbAlbumTitle = (artist, album) => album ? (ABSORB_TITLE.get(artist + "\x00" + album) || album) : album;

// ─────────── MusicBrainz origins (artist-origins.json, built by enrich-origins.js) ───────────
// Per artist: { country (ISO), area, beginArea, type }. Used for "taste geography".
const ORIGINS_PATH = path.join(__dirname, "artist-origins.json");
const ORIGINS = fs.existsSync(ORIGINS_PATH) ? JSON.parse(fs.readFileSync(ORIGINS_PATH, "utf8")) : {};
// city-coords.json: "ISO|City" → [lat, lng], from the one-time gazetteer geocode. For the world map.
const CITYCOORDS_PATH = path.join(__dirname, "city-coords.json");
const CITYCOORDS = fs.existsSync(CITYCOORDS_PATH) ? JSON.parse(fs.readFileSync(CITYCOORDS_PATH, "utf8")) : {};
// origin-overrides.json — verified true origins for artists whose MusicBrainz origin was wrong or
// city-less (Fuad 2026-07-15, Sonnet-assisted lookups). Each: name → { country (ISO2), city, lat,
// lng }. The lat/lng is merged into the gazetteer so the real city plots, and originOf consults
// these first, so a bad MB match can never override a hand-verified origin.
const OVERRIDES = (() => { try { const o = JSON.parse(fs.readFileSync(path.join(__dirname, "origin-overrides.json"), "utf8")); delete o._doc; return o; } catch (e) { return {}; } })();
for (const [nm, ov] of Object.entries(OVERRIDES)) { if (ov && ov.city && ov.country && ov.lat != null) CITYCOORDS[ov.country + "|" + ov.city] = [ov.lat, ov.lng]; }
const hasOrigins = Object.keys(ORIGINS).length > 0;
// ─────────── PINS (name-ambiguity overrides, pins.json) ───────────
// Durable corrections for wrong entity matches (Bleach/Brutus/daine class). Consulted at read
// time here; enrichers should prefer a pinned id over a blind name search. See pins.json._doc.
const PINS = (() => { try { const p = JSON.parse(fs.readFileSync(path.join(__dirname, "pins.json"), "utf8")); delete p._doc; return p; } catch (e) { return {}; } })();
const pinOf = (name) => aliasedByName(PINS, name) || null;
const originOf = (name) => {
  const pn = pinOf(name);
  if (pn && pn.origin) return { country: pn.origin.country || "", area: pn.origin.area || "", city: pn.origin.city || "" };
  const ov = aliasedByName(OVERRIDES, name);
  if (ov && ov.country) return { country: ov.country, area: ov.area || ov.city || "", city: ov.city || "" };
  const o = aliasedByName(ORIGINS, name);
  if (!o || !o.country) return null;
  return { country: o.country, area: o.area || "", city: o.beginArea || "" };
};
// gender → glyph; life-span → active / disbanded / deceased on artist pages.
// BANDS carry their LEAD VOCALIST's gender (Fuad 2026-07-12: "like on other pages that contain
// it") — from the MusicBrainz lineup distill. Solo artists keep their own gender as before.
const _MB_VOX_GENDER = (() => {
  const m = new Map();
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(__dirname, "mb-artists.json"), "utf8"));
    for (const e of Object.values(raw)) {
      if (!e.members || !e.members.length) continue;
      // Prefer the LEAD vocalist over any backing/"other vocals" credit, and only then fall back
      // by recency. The old order gated lead-vocals on t==="" (current member) first, so a band
      // whose lead singer had left (end-date set) skipped straight to any-"vocals" — picking a
      // backing vocalist of the wrong gender. (ミドリ: female lead Mariko Gotō t=2010 was skipped
      // for a male "other vocals" member.) Lead-vocals wins regardless of era; recency only breaks
      // ties within a credit tier.
      const vox = e.members.find(x => x.t === "" && (x.i || []).some(i => /lead vocals/.test(i)))
        || e.members.find(x => (x.i || []).some(i => /lead vocals/.test(i)))
        || e.members.find(x => x.t === "" && (x.i || []).some(i => /vocals/.test(i)))
        || e.members.find(x => (x.i || []).some(i => /vocals/.test(i)));
      if (vox && (vox.g === "M" || vox.g === "F" || vox.g === "m" || vox.g === "f"))
        m.set(e.q, /f/i.test(vox.g) ? "Female" : "Male");
    }
  } catch (err) {}
  return m;
})();
const genderOf = (name) => {
  const pn = pinOf(name); if (pn && "gender" in pn) return pn.gender;
  const o = aliasedByName(ORIGINS, name);
  return (o && o.gender) || _MB_VOX_GENDER.get(name) || "";
};
// ─────────── VOCALS (vocals.json, assembled from the phased MB/LLM/web vocals derivation) ───────────
// slug → ["male","female","nonbinary",…] in lineup order. [] = instrumental act; ABSENT = unknown.
// Shipped per-artist as a compact ORDER-PRESERVING code string: m=male f=female n=nonbinary,
// "" (empty string) = instrumental, field ABSENT = no data. e.g. LTS ["female","male"] → "fm".
const VOCALS = (() => { try { const v = JSON.parse(fs.readFileSync(path.join(__dirname, "vocals.json"), "utf8")); delete v._doc; return v; } catch (e) { return {}; } })();
const _VOX_CH = { male: "m", female: "f", nonbinary: "n" };
// returns the code string, "" for instrumental, or undefined when the slug has no vocals data.
const vocalsCodeBySlug = (s) => {
  if (!(s in VOCALS)) return undefined;
  return (VOCALS[s] || []).map(g => _VOX_CH[g] || "").join("");
};
// ── MB member lineups (artist-members.json, by enrich-members.js) — VOCALS FALLBACK ──
// Bands whose wikidata entry has no lineup (so no vocals.json entry) but whose MusicBrainz
// `member of band` relations DO carry the instrument/vocal attributes + member genders. Same
// per-member shape as mb-artists.json ({n,g,i[],f,t}), so membersVoxCode reuses the identical
// lead-vocals-first selection _MB_VOX_GENDER runs. Consulted ONLY when vocals.json is silent —
// verified data always wins. Keyed by band NAME (aliasedByName resolves fold variants).
const MEMBERS = (() => { const m = _readJson("artist-members.json"); delete m._members; return m; })();
// derive a single-vocalist code ("m"/"f") from an MB member lineup, or undefined when none of the
// lineup carries a gendered vocals credit. Mirrors build-data's vox tiers: lead-vocals current →
// lead-vocals any → vocals current → vocals any (recency only breaks ties within a credit tier).
const membersVoxCode = (name) => {
  const e = aliasedByName(MEMBERS, name);
  if (!e || !Array.isArray(e.members) || !e.members.length) return undefined;
  const vox = e.members.find(x => x.t === "" && (x.i || []).some(i => /lead vocals/i.test(i)))
    || e.members.find(x => (x.i || []).some(i => /lead vocals/i.test(i)))
    || e.members.find(x => x.t === "" && (x.i || []).some(i => /vocals/i.test(i)))
    || e.members.find(x => (x.i || []).some(i => /vocals/i.test(i)));
  if (!vox) return undefined;
  if (/^f/i.test(vox.g)) return "f";
  if (/^m/i.test(vox.g)) return "m";
  return undefined;   // vocalist found but no usable gender → still "no data", don't fabricate a code
};
const lifeOf = (name) => {
  const pn = pinOf(name);
  if (pn && pn.clearLife) return null;
  // hand-curated reactivated ledger: a "react" pin forces the Reactivated badge (band killed by
  // death/breakup then returned). Rides on life.react so ArtistMeta can read it without a tour join.
  // A numeric/string `react` (e.g. react:2024) also documents the COMEBACK year — carried through as
  // reactYear so the sub-line can honestly say "back since '24" instead of deriving from the split year.
  const react = !!(pn && pn.react);
  const reactYear = react && /^\d{4}$/.test(String(pn.react).slice(0, 4)) ? String(pn.react).slice(0, 4) : "";
  // a member's death that ended the band (Type O Negative / Peter Steele 2010) — carries the † like a
  // deceased Person. `died` (year) or endedByDeath:true; the year (if given) labels the cross.
  const diedYear = pn && pn.died ? String(pn.died).slice(0, 4) : (pn && pn.endedByDeath ? "" : undefined);
  const extra = { ...(react ? { react: true } : {}), ...(reactYear ? { reactYear } : {}), ...(diedYear !== undefined ? { diedByDeath: true, diedYear } : {}) };
  if (pn && pn.life) return { type: pn.life.type || "Group", ended: !!pn.life.ended, end: (pn.life.end || "").slice(0, 4), ...extra };
  const o = aliasedByName(ORIGINS, name); if (!o || !o.type || !("ended" in o)) return null; return { type: o.type, ended: !!o.ended, end: (o.end || "").slice(0, 4), ...extra };
};

// ─────────── Wikidata (wikidata-cache.json, by enrich-wikidata.js) ───────────
// Per artist: { wd, inception, dissolved, formCity, coords:[lon,lat], country, countryCode,
// members:[{name,gender}], memberCount, femaleShare }. Adds the member-level gender + exact
// formation city MB doesn't carry. wdOf() shapes the slice that rides on the artist page.
const WIKIDATA_PATH = path.join(__dirname, "wikidata-cache.json");
const WIKIDATA = fs.existsSync(WIKIDATA_PATH) ? JSON.parse(fs.readFileSync(WIKIDATA_PATH, "utf8")) : {};
function wdOf(name) {
  const w = aliasedByName(WIKIDATA, name);
  if (!w) return null;
  const r = {};
  if (w.formCity) r.city = w.formCity;                       // exact formation city ("Bergen", "Gothenburg")
  if (w.coords) r.coords = w.coords;                         // [lon, lat] of that city
  if (w.dissolved) r.dissolved = w.dissolved.slice(0, 4);    // year the band dissolved (P576)
  if (w.inception) r.inception = w.inception.slice(0, 4);    // year formed (P571)
  // lineup with known gender — drives the member-gender chips on the page
  const lineup = (w.members || []).filter(m => m.name && m.gender).map(m => ({ n: m.name, g: m.gender }));
  if (lineup.length) { r.lineup = lineup.slice(0, 12); r.femaleShare = w.femaleShare; }
  return Object.keys(r).length ? r : null;
}

// ─────────── Discogs styles/genres (discogs-cache.json, built by enrich-discogs.js) ───────────
// Per artist: { id, styles: [[name,count],…], genres: [[name,count],…], releases, ambiguous }.
// Finer-grained than last.fm tags (e.g. "Breakcore", "Synthwave", "Nu Metal", "Drum n Bass").
const DISCOGS_PATH = path.join(__dirname, "discogs-cache.json");
const DISCOGS = fs.existsSync(DISCOGS_PATH) ? JSON.parse(fs.readFileSync(DISCOGS_PATH, "utf8")) : {};
const hasDiscogs = Object.keys(DISCOGS).length > 0;
function stylesOf(name) {
  const pn = pinOf(name);
  if (pn && pn.clearStyles) return pn.styles || [];   // wrong-entity Discogs match → drop (or use pinned styles)
  const d = aliasedByName(DISCOGS, name);
  if (!d || !d.styles || d.styles.length === 0) return [];
  return d.styles.slice(0, 5).map(s => s[0]);
}
function dGenresOf(name) {
  const pn = pinOf(name);
  if (pn && pn.clearStyles) return pn.genres || [];
  const d = aliasedByName(DISCOGS, name);
  if (!d || !d.genres || d.genres.length === 0) return [];
  return d.genres.slice(0, 3).map(g => g[0]);
}

// ─────────── PER-ALBUM genre evidence (album-genres.json + discogs-album.json) ───────────
// album-genres.json  { "artistSlug~titleSlug": { tags:[[name,count 0..100],…], fetched } } — last.fm
//   album.gettoptags, built by enrich-album-tags.js.
// discogs-album.json { "artistSlug~titleSlug": { styles:[[name,count],…] } } — Discogs release styles
//   aggregated per album, built by enrich-discogs-albums.js.
// Both OPTIONAL: absent → familyIdxByAlbum returns -1 and the album falls back to its artist family
// (current behaviour everywhere — the build works with these files missing).
const ALBUM_TAGS_PATH = path.join(__dirname, "album-genres.json");
const ALBUM_TAGS = fs.existsSync(ALBUM_TAGS_PATH) ? JSON.parse(fs.readFileSync(ALBUM_TAGS_PATH, "utf8")) : {};
const ALBUM_STYLES_PATH = path.join(__dirname, "discogs-album.json");
const ALBUM_STYLES = fs.existsSync(ALBUM_STYLES_PATH) ? JSON.parse(fs.readFileSync(ALBUM_STYLES_PATH, "utf8")) : {};
const hasAlbumGenres = Object.keys(ALBUM_TAGS).length > 0 || Object.keys(ALBUM_STYLES).length > 0;

// ─────────── MusicBrainz deep (artist-mb.json, by enrich-mb.js) ───────────
// Per artist: { debut, latest, rgCount, releases:[[title,year,type]], rels:[[type,name,mbid]] }.
// Powers adoption-lag ("how old the music was when you found it") + the connection graph.
const MB_PATH = path.join(__dirname, "artist-mb.json");
const MB = fs.existsSync(MB_PATH) ? JSON.parse(fs.readFileSync(MB_PATH, "utf8")) : {};
const hasMB = Object.keys(MB).length > 0;
const debutOf = (name) => { const m = aliasedByName(MB, name); return (m && m.debut) || null; };
const membersOf = (name) => { const m = aliasedByName(MB, name); return ((m && m.rels) || []).filter(r => r[0] === "member of band").map(r => r[1]); };

// tag → audio-DNA vector. Tag-DERIVED, not measured (last.fm has no audio features);
// an artist's axes are the play-weighted average of its tags. First bucket wins.
function tagAxis(t) {
  if (/thrash|speed metal|death metal|grindcore|grind|black metal|deathcore|powerviolence/.test(t)) return { energy: .96, valence: .28, acoustic: .07, tempo: .9, dance: .15, instr: .35 };
  if (/breakcore|digital hardcore|gabber|hardcore techno|speedcore/.test(t)) return { energy: .97, valence: .4, acoustic: .05, tempo: .95, dance: .55, instr: .4 };
  if (/metalcore|post-hardcore|mathcore|screamo|electronicore|deathcore/.test(t)) return { energy: .9, valence: .35, acoustic: .1, tempo: .82, dance: .25, instr: .3 };
  if (/nu-metal|nu metal|rap metal|funk metal|alternative metal|groove metal|rapcore/.test(t)) return { energy: .85, valence: .42, acoustic: .12, tempo: .7, dance: .3, instr: .25 };
  if (/industrial|ebm|neue deutsche|aggrotech/.test(t)) return { energy: .82, valence: .35, acoustic: .1, tempo: .68, dance: .42, instr: .4 };
  if (/djent|progressive metal|post-metal|sludge|doom|drone/.test(t)) return { energy: .72, valence: .3, acoustic: .15, tempo: .5, dance: .12, instr: .55 };
  if (/heavy metal|power metal|symphonic metal|metal$|^metal/.test(t)) return { energy: .8, valence: .4, acoustic: .12, tempo: .68, dance: .2, instr: .35 };
  if (/drum and bass|drum n bass|dnb|jungle|breakbeat|big beat/.test(t)) return { energy: .85, valence: .55, acoustic: .07, tempo: .92, dance: .8, instr: .55 };
  if (/techno|house|trance|electro|edm|rave|hardstyle|dubstep/.test(t)) return { energy: .78, valence: .6, acoustic: .06, tempo: .82, dance: .9, instr: .55 };
  if (/hyperpop|witch house|glitch|idm|vaporwave/.test(t)) return { energy: .6, valence: .55, acoustic: .12, tempo: .6, dance: .7, instr: .5 };
  if (/hip-hop|hip hop|rap|boom bap|trap|grime/.test(t)) return { energy: .62, valence: .5, acoustic: .18, tempo: .55, dance: .6, instr: .15 };
  if (/punk|garage|post-punk|emo|riot grrrl/.test(t)) return { energy: .82, valence: .45, acoustic: .18, tempo: .78, dance: .3, instr: .25 };
  if (/shoegaze|dream pop|nu-gaze|noise rock|noise/.test(t)) return { energy: .58, valence: .42, acoustic: .25, tempo: .5, dance: .25, instr: .5 };
  if (/ambient|post-rock|drone|instrumental|classical|soundtrack/.test(t)) return { energy: .35, valence: .45, acoustic: .55, tempo: .35, dance: .1, instr: .9 };
  if (/folk|acoustic|singer-songwriter|country|americana/.test(t)) return { energy: .35, valence: .5, acoustic: .85, tempo: .4, dance: .2, instr: .35 };
  if (/synth-pop|synthpop|new wave|art pop|indie pop|electropop|pop$|^pop/.test(t)) return { energy: .55, valence: .68, acoustic: .25, tempo: .6, dance: .65, instr: .3 };
  if (/alternative rock|indie rock|art rock|grunge|stoner|rock$|^rock/.test(t)) return { energy: .65, valence: .48, acoustic: .3, tempo: .6, dance: .3, instr: .35 };
  return null; // unknown → neutral
}
const NEUTRAL = { energy: .5, valence: .5, acoustic: .5, tempo: .5, dance: .5, instr: .5 };
function tagAudio(tags) {
  if (!tags.length) return { ...NEUTRAL };
  const acc = { energy: 0, valence: 0, acoustic: 0, tempo: 0, dance: 0, instr: 0 };
  let wsum = 0;
  for (const [name, count] of tags) {
    const w = (count || 0) / 100 || 0.01;
    const v = tagAxis(name) || NEUTRAL;
    for (const k in acc) acc[k] += v[k] * w;
    wsum += w;
  }
  const out = {};
  for (const k in acc) out[k] = Math.round(clamp01(acc[k] / wsum) * 100) / 100;
  return out;
}

// ─────────── GENRE TAXONOMY v2 (approved 2026-08-12; see DESIGN.md §1.3, .sptmp/genre-v2) ───────────
// The 15-family v2 wheel. Membership is decided by a WEIGHTED VOTE over word-boundary rules across
// all three enrichment sources (last.fm tags, Spotify genres, Discogs styles) — NOT the old
// first-classifiable-tag-wins, which let the v1 `metal$`-first-match order decide ties. hue/cx/cy
// carry the color contract (hue = the ONE genre-color source; cx/cy = Sound-Map layout, x≈organic→
// electronic, y≈light→heavy). Views consume { i, family, hue } (index-keyed via R.FAMILIES[f.i]);
// cx/cy/grey stay build-side. "Other" keeps its grey marker + catch-all role.
const FAMILIES = [
  { family: "Thrash/Death",                 hue: 4,   cx: .22, cy: .90 },
  { family: "Heavy/Doom",                   hue: 24,  cx: .18, cy: .80 },
  { family: "Metalcore/Nu",                 hue: 346, cx: .38, cy: .88 },
  { family: "Punk/Hardcore",                hue: 96,  cx: .26, cy: .80 },
  { family: "Prog",                         hue: 282, cx: .30, cy: .54 },
  { family: "Shoegaze/Grunge",              hue: 252, cx: .50, cy: .60 },
  { family: "Alternative/Indie",            hue: 60,  cx: .40, cy: .50 },
  { family: "Industrial/Noise/Hyperpop",    hue: 214, cx: .68, cy: .80 },
  { family: "Electronic/DnB",               hue: 190, cx: .84, cy: .60 },
  { family: "Hip-Hop/Rap",                  hue: 46,  cx: .62, cy: .42 },
  { family: "Pop",                          hue: 332, cx: .72, cy: .38 },
  { family: "Jazz/Funk",                         hue: 40,  cx: .40, cy: .32 },
  { family: "Classical",                    hue: 150, cx: .18, cy: .22 },
  { family: "Score",                        hue: 308, cx: .50, cy: .22 },
  // Roots/Classic (Fuad approved 2026-08-31). The other fourteen families grew out of a metal and
  // electronic listening history and had NO home for classic rock, country rock, southern rock,
  // folk rock, rockabilly or americana — none of those words existed anywhere in the rule table,
  // so the whole roots canon fell through to the bare "rock" umbrella (Alternative/Indie, weight
  // 0.2) and was then DISPLAYED as post-rock, that family's lowest-index sub. CCR, The Cranberries,
  // Silos and CherryFilter all landed there. hue 123 sits in the widest free gap (96→150); cx/cy
  // put it left (organic, not electronic) and mid-light, between Jazz/Funk and Prog.
  { family: "Roots/Classic",                hue: 123, cx: .30, cy: .38 },
  // Other — catch-all so nothing gets nuked; no rule assigns it (only the explicit fallback does).
  // grey:true is a marker for the color pass (rendered with a placeholder hue until then).
  { family: "Other",                        hue: 72,  cx: .50, cy: .50, grey: true },
];
const _FAM_INDEX = new Map(FAMILIES.map((f, i) => [f.family, i]));
const _famByName = (name) => { const i = _FAM_INDEX.get(name); return i == null ? null : FAMILIES[i]; };

// v2 word-boundary vote (ported from .sptmp/genre-v2/engine.js so the build stays self-contained).
// Normalise a tag/style to a token stream where \b is meaningful (fold apostrophes, slashes→space).
const _gnorm = (t) => String(t).toLowerCase().trim()
  .replace(/[’']/g, "").replace(/[_/]+/g, " ").replace(/\s+/g, " ");
// Non-voting scene/country tags (orthogonal scene dimension) contribute ZERO. j-pop/city pop are
// the EXCEPTION → they vote Pop (handled in the rule table, so they must NOT be listed here).
const SCENE_ZERO = new Set([
  "japanese", "j-rock", "jrock", "j rock", "visual kei", "kawaii",
  "shibuya-kei", "shibuya kei", "polish", "german", "australian", "french", "russian",
  "swedish", "finnish", "norwegian", "british", "american", "uk", "usa", "us",
  "danish", "italian", "spanish", "dutch", "canadian", "belgian", "brazilian",
  "korean", "chinese", "icelandic", "austrian", "ukrainian", "seattle", "bergen",
  "gothenburg", "melbourne", "sydney", "london", "berlin", "tokyo", "chicago",
  "new york", "los angeles", "england", "scotland", "wales", "ireland", "europe",
  "european", "asian", "latin", "nordic", "scandinavian", "female fronted",
  "female vocalists", "male vocalists", "instrumental", "acoustic",
]);
// Junk / meta tags: always zero (personal-collection noise).
const GENRE_JUNK = new Set([
  "seen live", "favorites", "favourites", "favorite", "my top songs", "my favorites",
  "love", "loved", "awesome", "good", "cool", "epic", "amazing", "beautiful",
  "under 2000 listeners", "spotify", "albums i own", "vinyl", "owned", "check out",
  "want to see live", "concert", "band", "artist", "music", "songs", "playlist",
  "all", "seen live 2023", "seen live 2024", "10s", "00s", "90s", "80s", "70s", "60s",
  "2020s", "2010s", "2000s", "1990s", "1980s",
]);
const _GW = { strong: 1.0, med: 0.8, weak: 0.5, umbrella: 0.2 };
// Ordered rule table; first matching rule claims a tag (specific guards precede broad umbrellas).
// STEP-1 pattern fixes (owner-approved 2026-08-12) folded in: kawaii metal→Metalcore/Nu,
// gothic rock/folk metal/drone→Heavy/Doom, technical metal→Prog, 8-bit/chiptune/vgm→Score,
// blues→Jazz, electroclash→Electronic, dance→Electronic ×0.2, modern rock→Alt ×0.2.
const GENRE_RULES = [
  // ── ORDER-SENSITIVE guards first ──
  ["Metalcore/Nu", /\bkawaii metal\b/, _GW.strong],           // STEP1: BABYMETAL fix (before scene-zero would eat "kawaii")
  ["Metalcore/Nu", /\btrap metal\b/, _GW.strong],
  ["Punk/Hardcore", /\bpost[- ]hardcore\b/, _GW.strong],   // v2 spec: post-hardcore lives in Punk/Hardcore (Fuad ruling 2026-08-12)
  ["Punk/Hardcore", /\bmelodic hardcore\b/, _GW.strong],
  ["Electronic/DnB", /\bprogressive (house|trance)\b/, _GW.strong],   // EDM, not prog (Fuad 2026-08-13)
  ["Prog", /\bprogressive (metal|rock)\b/, _GW.strong],
  ["Prog", /\bprog (metal|rock)\b/, _GW.strong],
  ["Prog", /\btechnical (metal|rock)\b/, _GW.strong],   // STEP1
  ["Prog", /\bmath rock\b/, _GW.strong],   // moved Alt->Prog (Fuad 2026-08-13)
  ["Prog", /\bmath metal\b/, _GW.med],
  ["Industrial/Noise/Hyperpop", /\bnoise rock\b/, _GW.strong],
  ["Industrial/Noise/Hyperpop", /\bpower electronics\b/, _GW.strong],
  ["Pop", /\bcity pop\b/, _GW.strong],
  ["Pop", /\bj-?pop\b/, _GW.strong],

  // ── 1 Thrash/Death ──
  ["Thrash/Death", /\bthrash\b/, _GW.strong],
  ["Thrash/Death", /\bdeath metal\b/, _GW.strong],
  ["Thrash/Death", /\bblack metal\b/, _GW.strong],
  ["Thrash/Death", /\b(grindcore|grind)\b/, _GW.strong],
  ["Thrash/Death", /\bspeed metal\b/, _GW.strong],
  ["Thrash/Death", /\bgroove metal\b/, _GW.strong],
  ["Thrash/Death", /\b(brutal death|technical death|tech death|melodic death|melodeath|deathgrind)\b/, _GW.strong],
  ["Thrash/Death", /\bblackened\b/, _GW.med],

  // ── 2 Heavy/Doom ──
  ["Heavy/Doom", /\bheavy metal\b/, _GW.strong],
  ["Heavy/Doom", /\bdoom\b/, _GW.strong],
  ["Heavy/Doom", /\bstoner\b/, _GW.strong],
  ["Heavy/Doom", /\bsludge\b/, _GW.strong],
  ["Heavy/Doom", /\bgothic (metal|rock)\b/, _GW.strong],   // STEP1: gothic rock joins gothic metal here
  ["Heavy/Doom", /\bfolk metal\b/, _GW.strong],            // STEP1
  ["Heavy/Doom", /\bdrone\b/, _GW.strong],                 // STEP1
  ["Heavy/Doom", /\bpower metal\b/, _GW.strong],
  ["Heavy/Doom", /\bsymphonic metal\b/, _GW.strong],
  ["Heavy/Doom", /\bnwobhm\b/, _GW.strong],
  ["Heavy/Doom", /\btrue metal\b/, _GW.med],

  // ── 3 Metalcore/Nu ──
  ["Metalcore/Nu", /\bmetalcore\b/, _GW.strong],
  ["Metalcore/Nu", /\bdeathcore\b/, _GW.strong],
  ["Metalcore/Nu", /\bmathcore\b/, _GW.strong],
  ["Metalcore/Nu", /\belectronicore\b/, _GW.strong],
  ["Metalcore/Nu", /\bscreamo\b/, _GW.strong],
  ["Metalcore/Nu", /\bnu[- ]?metal\b/, _GW.strong],
  ["Metalcore/Nu", /\brap metal\b/, _GW.strong],
  ["Metalcore/Nu", /\bfunk metal\b/, _GW.strong],
  ["Metalcore/Nu", /\balternative metal\b/, _GW.strong],
  ["Metalcore/Nu", /\brapcore\b/, _GW.strong],
  ["Metalcore/Nu", /\bnu[- ]?core\b/, _GW.med],

  // ── 4 Punk/Hardcore ──
  // "hardcore hip-hop"/"hardcore rap" is an extension of hip-hop, NOT the hardcore-punk scene
  // (Fuad ruling 2026-08-17: Ground Zero Mixtape/PRO8L3M). Must precede the bare \bhardcore\b rule
  // below so this token votes Hip-Hop, not Punk. Covers corpus forms "hardcore hip hop",
  // "hardcore hip-hop" (Discogs; hyphen→space handled by _classifyToken), "hardcore rap".
  ["Hip-Hop/Rap", /\bhardcore (hip-?hop|rap)\b/, _GW.strong],
  ["Punk/Hardcore", /\bhardcore punk\b/, _GW.strong],
  ["Punk/Hardcore", /\bpunk\b/, _GW.strong],
  ["Punk/Hardcore", /\bhardcore\b/, _GW.strong],
  ["Hip-Hop/Rap", /\bemo rap\b|\bcloud rap\b/, _GW.strong],   // before the emo rule: emo-rap is rap (original-god/99drowntown class)
  ["Punk/Hardcore", /\bemo\b/, _GW.strong],
  ["Punk/Hardcore", /\bska(-?punk)?\b/, _GW.strong],
  ["Punk/Hardcore", /\briot grrrl\b/, _GW.strong],
  ["Alternative/Indie", /\bgarage rock\b/, _GW.strong],   // garage ROCK -> Alt (Fuad 2026-08-13); garage punk stays Punk
  ["Punk/Hardcore", /\bgarage punk\b/, _GW.strong],
  ["Punk/Hardcore", /\bcrust\b/, _GW.strong],
  ["Punk/Hardcore", /\bpost-punk\b/, _GW.med],

  // ── 5 Prog ──
  ["Prog", /\bdjent\b/, _GW.strong],
  ["Prog", /\bprogressive\b/, _GW.med],
  ["Prog", /\bpost-metal\b/, _GW.strong],
  ["Prog", /\bpsychedelic\b/, _GW.strong],
  // "classic rock" REMOVED from Prog (2026-08-28, owner-reported): it voted the entire
  // classic-rock canon into Prog — 25 artists incl. the Stones, CCR, Zeppelin, the Beatles —
  // and the family-fallback then DISPLAYED them as "progressive metal". Classic rock is an
  // umbrella; real prog acts carry "progressive rock" (matched above), and umbrella-only
  // artists now classify by their remaining tags (CCR → blues/roots per the Johnny Cash
  // precedent) or fall honestly to Other.
  ["Heavy/Doom", /\bhard rock\b/, _GW.weak],   // was Prog med — GN'R/AC/DC-class belongs nearer Heavy than Prog; weak so specific tags still win

  // ── 6 Shoegaze/Grunge ──
  ["Shoegaze/Grunge", /\bshoegaze\b/, _GW.strong],
  ["Shoegaze/Grunge", /\bnu-?gaze\b/, _GW.strong],
  ["Shoegaze/Grunge", /\bblackgaze\b/, _GW.strong],
  ["Shoegaze/Grunge", /\bgrunge\b/, _GW.strong],
  ["Shoegaze/Grunge", /\bpost-grunge\b/, _GW.strong],
  ["Shoegaze/Grunge", /\bslowcore\b/, _GW.strong],

  // ── 7 Alternative/Indie ──
  ["Alternative/Indie", /\balternative rock\b/, _GW.med],
  ["Alternative/Indie", /\bart rock\b/, _GW.med],   // moved Prog(strong)->Alt(med) (Fuad 2026-08-17)
  ["Alternative/Indie", /\bindie (rock|pop-rock|pop rock)\b/, _GW.strong],
  ["Alternative/Indie", /\bpost-rock\b/, _GW.strong],   // moved Shoegaze/Grunge->Alt (Fuad 2026-08-17: post-rock fits Alternative)
  ["Alternative/Indie", /\bpost-punk\b/, _GW.med],
  ["Alternative/Indie", /\bbritpop\b/, _GW.strong],
  ["Alternative/Indie", /\bmadchester\b/, _GW.strong],
  ["Alternative/Indie", /\bmodern rock\b/, _GW.umbrella],    // STEP1: weak ×0.2
  ["Alternative/Indie", /\bindie\b/, _GW.weak],

  // ── 8 Industrial/Noise/Hyperpop (single family; DH/hyperpop stay in-family, name shortened 2026-08-12) ──
  ["Industrial/Noise/Hyperpop", /\bindustrial\b/, _GW.strong],
  ["Industrial/Noise/Hyperpop", /\bebm\b/, _GW.strong],
  ["Industrial/Noise/Hyperpop", /\bneue deutsche h(a|ä)rte\b/, _GW.strong],
  ["Industrial/Noise/Hyperpop", /\baggrotech\b/, _GW.strong],
  ["Industrial/Noise/Hyperpop", /\bcyber\b/, _GW.med],
  ["Industrial/Noise/Hyperpop", /\bnoise\b/, _GW.med],
  ["Industrial/Noise/Hyperpop", /\bdigital hardcore\b/, _GW.strong],
  ["Industrial/Noise/Hyperpop", /\bbreakcore\b/, _GW.strong],
  ["Industrial/Noise/Hyperpop", /\bgabber\b/, _GW.strong],
  ["Industrial/Noise/Hyperpop", /\bspeedcore\b/, _GW.strong],
  ["Industrial/Noise/Hyperpop", /\bhyperpop\b/, _GW.strong],
  ["Industrial/Noise/Hyperpop", /\bglitch\b/, _GW.med],
  ["Industrial/Noise/Hyperpop", /\bwitch house\b/, _GW.strong],

  // ── 9 Electronic/DnB ──
  ["Electronic/DnB", /\b(drum and bass|drum n bass|dnb|d&b)\b/, _GW.strong],
  ["Electronic/DnB", /\b(jungle|breakbeat|big beat|breaks)\b/, _GW.strong],
  ["Electronic/DnB", /\btechno\b/, _GW.strong],
  ["Electronic/DnB", /\bhouse\b/, _GW.strong],
  ["Electronic/DnB", /\btrance\b/, _GW.strong],
  ["Electronic/DnB", /\belectroclash\b/, _GW.strong],   // STEP1 (before bare "electro")
  ["Electronic/DnB", /\belectro\b/, _GW.med],
  ["Electronic/DnB", /\bedm\b/, _GW.med],
  ["Electronic/DnB", /\brave\b/, _GW.med],
  ["Electronic/DnB", /\bhardstyle\b/, _GW.strong],
  ["Electronic/DnB", /\bidm\b/, _GW.strong],
  ["Electronic/DnB", /\bdowntempo\b/, _GW.strong],
  ["Electronic/DnB", /\btrip-?hop\b/, _GW.strong],
  ["Electronic/DnB", /\bdubstep\b/, _GW.strong],
  ["Electronic/DnB", /\b(synthwave|darksynth|retrowave|outrun)\b/, _GW.strong],
  ["Electronic/DnB", /\bambient techno\b/, _GW.strong],
  ["Electronic/DnB", /\bambient\b/, _GW.med],
  ["Electronic/DnB", /\bvaporwave\b/, _GW.strong],
  ["Electronic/DnB", /\bchillwave\b/, _GW.strong],
  ["Electronic/DnB", /\bdance\b/, _GW.umbrella],   // STEP1: weak ×0.2 (before bare "electronic")
  ["Electronic/DnB", /\belectronic\b/, _GW.weak],

  // ── 10 Hip-Hop/Rap ──
  ["Hip-Hop/Rap", /\bhip[- ]?hop\b/, _GW.strong],
  ["Hip-Hop/Rap", /\brap\b/, _GW.strong],
  ["Hip-Hop/Rap", /\bboom bap\b/, _GW.strong],
  ["Hip-Hop/Rap", /\btrap\b/, _GW.strong],   // "trap metal" already claimed above
  ["Hip-Hop/Rap", /\bgrime\b/, _GW.strong],
  ["Hip-Hop/Rap", /\bpolish hip[- ]?hop\b/, _GW.strong],

  // ── 11 Pop ──
  ["Pop", /\bsynth-?pop\b/, _GW.strong],
  ["Pop", /\bnew wave\b/, _GW.strong],
  ["Pop", /\bart pop\b/, _GW.strong],
  ["Pop", /\bindie pop\b/, _GW.strong],
  ["Pop", /\bdream pop\b/, _GW.strong],   // moved Shoegaze/Grunge->Pop (Fuad 2026-08-17)
  ["Pop", /\belectropop\b/, _GW.strong],
  ["Pop", /\bdance-?pop\b/, _GW.strong],
  ["Pop", /\bdark pop\b/, _GW.strong],
  ["Pop", /\bk-?pop\b/, _GW.strong],
  ["Pop", /\bpop\b/, _GW.weak],

  // ── 11b Roots/Classic (Fuad approved 2026-08-31) ──
  // Placed HERE deliberately, between two rules that would otherwise swallow these tokens:
  //   • after \bfolk metal\b (§1) so folk metal stays Heavy/Doom, not Roots;
  //   • before \bblues\b → Jazz/Funk (§12) so "blues rock" reads as rock, not as jazz.
  // "classic rock" was removed from the Prog rules on 2026-08-28 because it dragged the canon into
  // Prog; it has had no home since, which is the actual cause of the CCR/post-rock report.
  // "rock and roll" must precede nothing in particular but is spelled for both apostrophe forms —
  // _gnorm already strips ’ and ', so "rock'n'roll" arrives as "rocknroll".
  // GUARD FIRST: a roots word with "metal" welded on is a METAL tag, not a roots one. Without this
  // /\bcountry\b/ below claimed "country metal" and it became a Roots/Classic subgenre (Fuad
  // 2026-08-31). \bfolk metal\b is already caught back in §1; these are the rest.
  ["Heavy/Doom", /\b(country|blues|americana|bluegrass|southern)[- ]metal\b/, _GW.strong],
  ["Roots/Classic", /\bclassic rock\b/, _GW.strong],
  ["Roots/Classic", /\bcountry rock\b/, _GW.strong],
  ["Roots/Classic", /\bsouthern rock\b/, _GW.strong],
  ["Roots/Classic", /\bfolk rock\b/, _GW.strong],
  ["Roots/Classic", /\broots rock\b/, _GW.strong],
  ["Roots/Classic", /\bblues rock\b/, _GW.strong],
  ["Roots/Classic", /\brockabilly\b|\bpsychobilly\b/, _GW.strong],
  ["Roots/Classic", /\b(rock ?n ?roll|rocknroll)\b/, _GW.strong],
  ["Roots/Classic", /\bamericana\b/, _GW.strong],
  ["Roots/Classic", /\bbluegrass\b/, _GW.strong],
  ["Roots/Classic", /\b(alt|alternative)[- ]country\b/, _GW.strong],
  ["Roots/Classic", /\bsinger[- ]songwriter\b/, _GW.weak],
  ["Roots/Classic", /\bcountry\b/, _GW.med],
  ["Roots/Classic", /\bfolk\b/, _GW.med],

  // ── 12 Jazz (soul/funk/R&B/blues fold in) ──
  ["Jazz/Funk", /\bjazz\b/, _GW.strong],
  ["Jazz/Funk", /\bbebop\b/, _GW.strong],
  ["Jazz/Funk", /\bfusion\b/, _GW.med],
  ["Jazz/Funk", /\bbig band\b/, _GW.strong],
  ["Jazz/Funk", /\bneo-?soul\b/, _GW.strong],
  ["Jazz/Funk", /\bsoul\b/, _GW.med],
  ["Jazz/Funk", /\bmotown\b/, _GW.strong],
  ["Electronic/DnB", /\bliquid funk\b|\bneurofunk\b/, _GW.strong],   // DnB subgenres, before the funk rule (Metrik-class fix, Fuad 2026-08-13)
  ["Jazz/Funk", /\bfunk\b/, _GW.med],
  ["Jazz/Funk", /\bblues\b/, _GW.med],   // STEP1: blues → Jazz
  ["Jazz/Funk", /\b(rhythm and blues|r&b|rnb)\b/, _GW.med],

  // ── 13 Classical ──
  ["Classical", /\b(neo-?classical|modern classical|contemporary classical|classical)\b/, _GW.strong],
  ["Classical", /\borchestral\b/, _GW.med],
  ["Classical", /\bopera\b/, _GW.strong],
  ["Classical", /\bbaroque\b/, _GW.strong],
  ["Classical", /\bchamber\b/, _GW.strong],
  ["Classical", /\bpiano\b/, _GW.med],

  // ── 14 Score ──
  ["Score", /\b(8-?bit|chiptune|chip music)\b/, _GW.strong],   // STEP1
  ["Score", /\bsoundtrack\b/, _GW.strong],
  ["Score", /\bfilm score\b/, _GW.strong],
  ["Score", /\bscore\b/, _GW.strong],
  ["Score", /\bcinematic\b/, _GW.strong],
  ["Score", /\b(video game music|vgm|game music)\b/, _GW.strong],   // STEP1: vgm
  ["Score", /\bost\b/, _GW.strong],
  ["Score", /\bepic orchestral\b/, _GW.strong],
];
// Bare-umbrella handling (tag equals the umbrella exactly, after norm): bare metal→Heavy ×0.2,
// bare rock/alternative→Alt ×0.2.
const GENRE_UMBRELLA = new Map([
  ["metal", ["Heavy/Doom", _GW.umbrella]],
  ["rock", ["Alternative/Indie", _GW.umbrella]],
  ["alternative", ["Alternative/Indie", _GW.umbrella]],
]);
// classifyTag(tag) → { family, hue, cx, cy, i, weight } | null. `family`-shaped like the old
// FAMILIES entry (so existing `f.family`/`f.hue`/`f.cx`/`f.cy`/FAMILIES.indexOf(f) callers work),
// plus `.weight` (the family multiplier). Returns the FIRST matching rule.
function _classifyToken(rawTag) {
  const t = _gnorm(rawTag);
  if (!t) return null;
  if (GENRE_JUNK.has(t)) return null;
  if (SCENE_ZERO.has(t)) return null;
  if (GENRE_UMBRELLA.has(t)) { const [fam, w] = GENRE_UMBRELLA.get(t); const f = _famByName(fam); return f && { ...f, i: _FAM_INDEX.get(fam), weight: w }; }
  // B4 fix (2026-08-17): rules are written in the SPACE form ("dream pop"), but SUB_CANON hands the
  // classifier the HYPHENATED canonical form ("dream-pop") in the SUBS/Explore path, and last.fm/
  // Discogs deliver both spellings. _gnorm folds _ and / to spaces but leaves hyphens intact, so a
  // hyphenated tag silently missed every space-form rule (dream-pop/new-wave/hard-rock/*-metal, …).
  // Fix centrally by testing each rule against BOTH the raw-normalised token and a hyphen→space
  // variant: pure-space rules match the folded form, deliberately-hyphenated rules (post-rock,
  // trip-?hop) still match the raw form, and rules using [- ]?/-? match either. First hit wins.
  const th = t.indexOf("-") >= 0 ? t.replace(/-/g, " ") : null;
  for (const [fam, re, w] of GENRE_RULES) {
    if (re.test(t) || (th !== null && re.test(th))) { const f = _famByName(fam); return f && { ...f, i: _FAM_INDEX.get(fam), weight: w }; }
  }
  return null;
}
// Back-compat surface: classifyTag returns the family object (no weight needed by SUBS/GENRES
// callers, which only read .family/.hue/.cx/.cy and FAMILIES.indexOf). Memoised on the token.
const _clsCache = new Map();
function classifyTag(tag) {
  const key = tag == null ? "" : String(tag);
  if (_clsCache.has(key)) return _clsCache.get(key);
  const c = _classifyToken(key);
  const f = c ? FAMILIES[c.i] : null;   // return the CANONICAL FAMILIES object so indexOf works
  _clsCache.set(key, f);
  return f;
}

// ── _voteArtist(evidence) — the weighted vote (ported engine). Returns per-family vote TOTALS
//    (Map<famIdx, weight>) + the ranked list, so callers can read the winner OR the full spread
//    (family-membership ruleset, 2026-08-12). evidence = { lastfm:[[tag,count0..100],…],
//    spotify:[genre,…], discogs:[[style,count],…] }. Source weights: last.fm count/100, spotify
//    flat 0.7, discogs count-scaled to 0.5 max within the artist.
const _GENRE_SRC = { spotify: 0.7, discogsBase: 0.5 };
function _voteArtist(ev) {
  const totals = new Map();
  const nvote = new Map();   // family → # of tags that voted for it (for the confidence gate)
  const add = (idx, contribution) => { totals.set(idx, (totals.get(idx) || 0) + contribution); nvote.set(idx, (nvote.get(idx) || 0) + 1); };
  for (const [tag, count] of (ev.lastfm || [])) {
    const c = _classifyToken(tag); if (!c) continue;
    add(c.i, (((count || 0) / 100) || 0.01) * c.weight);
  }
  for (const g of (ev.spotify || [])) {
    const c = _classifyToken(g); if (!c) continue;
    add(c.i, _GENRE_SRC.spotify * c.weight);
  }
  const dstyles = ev.discogs || [];
  const dmax = dstyles.reduce((m, s) => Math.max(m, s[1] || 0), 0) || 1;
  for (const [style, count] of dstyles) {
    const c = _classifyToken(style); if (!c) continue;
    add(c.i, (_GENRE_SRC.discogsBase * ((count || 0) / dmax)) * c.weight);
  }
  const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  return { totals, ranked };
}
// Back-compat: the winning family INDEX (or -1 for no evidence).
function classifyArtist(ev) { const { ranked } = _voteArtist(ev); return ranked.length ? ranked[0][0] : -1; }

// ── FAMILY MEMBERSHIP (approved 2026-08-12): mention ≠ membership. A family is a MEMBER of an
//    artist only when it earns SHARE ≥ 25% of the artist's total vote AND absolute weight ≥ 0.5,
//    from the SAME weighted 3-source vote that assigns the dominant family. The dominant family
//    (familyIdxByName — fam pins + FAMILY_OVERRIDES + vote) is ALWAYS a member. Runner-up families
//    that clear the gate join, capped at 3 total, ordered dominant-first then by share. Most
//    artists end up with exactly one. `famAlso` pins (pins.json, array of family NAMES) append
//    memberships (cap still 3). Returns a 1–3 element array of family indexes, dominant first.
// ── ROOTS GUARD (Fuad ruling 2026-08-31: "anything metal shouldn't live in that genre") ──
// Roots/Classic exists for classic/country/southern/folk ROCK. Those tags sit all over metal
// bands too — AC/DC and Led Zeppelin carry "blues rock", Korpiklaani and In Extremo carry "folk",
// Texas Hippie Coalition carries "southern rock" and "country" — and on the first build that was
// enough to make Roots/Classic the DOMINANT family for 20 metal acts, S.O.D. (a thrash band)
// among them. A metal act is never a roots act, so the two are mutually exclusive: if any metal
// family carries real weight, Roots/Classic is dropped from both the dominant slot and the
// membership list. Prog is deliberately NOT in this set — prog rock is not metal.
const _METAL_FAMS = ["Thrash/Death", "Heavy/Doom", "Metalcore/Nu"];
const _metalIdx = () => _METAL_FAMS.map(f => _FAM_INDEX.get(f)).filter(i => i != null);
const _rootsIdx = () => _FAM_INDEX.get("Roots/Classic");
function _rootsGuard(idx, ev) {
  const rc = _rootsIdx();
  if (rc == null || idx !== rc) return idx;
  const { totals } = _voteArtist(ev);
  let best = -1, bestW = 0;
  for (const mi of _metalIdx()) { const w = totals.get(mi) || 0; if (w > bestW) { bestW = w; best = mi; } }
  return bestW >= FAM_ABS_MIN ? best : idx;   // any real metal vote outranks a roots reading
}

const FAM_SHARE_MIN = 0.25, FAM_ABS_MIN = 0.5, FAM_MEMBER_CAP = 3;
const _famMembersCache = new Map();
function familyMembersByName(name) {
  if (_famMembersCache.has(name)) return _famMembersCache.get(name);
  const dom = familyIdxByName(name);
  const out = [];
  if (dom >= 0 && !(FAMILIES[dom] && FAMILIES[dom].grey)) out.push(dom);   // dominant always a member (unless it's grey "Other")
  // per-family vote totals from the same evidence the classifier used
  const lastfm = (META[name] && META[name].tags)
    ? META[name].tags.map(t => Array.isArray(t) ? t : [t, 100])
    : cachedTags(name);
  const spotify = aliasedByName(SPOTGEN, name) || [];
  const discogs = stylesCountOf(name);
  const { totals } = _voteArtist({ lastfm, spotify, discogs });
  let sum = 0; for (const w of totals.values()) sum += w;
  if (sum > 0) {
    const runners = [...totals.entries()]
      .filter(([idx]) => idx !== dom && !(FAMILIES[idx] && FAMILIES[idx].grey))
      .filter(([, w]) => (w / sum) >= FAM_SHARE_MIN && w >= FAM_ABS_MIN)
      .sort((a, b) => b[1] - a[1]);
    for (const [idx] of runners) { if (out.length >= FAM_MEMBER_CAP) break; if (!out.includes(idx)) out.push(idx); }
  }
  // famAlso pin: append hand-curated extra memberships (still capped)
  const pn = pinOf(name);
  if (pn && Array.isArray(pn.famAlso)) {
    for (const fn of pn.famAlso) { const fi = _FAM_INDEX.get(fn); if (fi != null && !out.includes(fi) && out.length < FAM_MEMBER_CAP) out.push(fi); }
  }
  if (!out.length && dom >= 0) out.push(dom);   // grey-dominant fallback: keep at least the dominant so fm is never empty
  // roots guard, membership half: a metal act is never also a roots act (see _rootsGuard above).
  const _rc = _rootsIdx(), _mi = _metalIdx();
  if (_rc != null && out.includes(_rc) && out.some(i => _mi.includes(i))) {
    const i = out.indexOf(_rc); out.splice(i, 1);
  }
  _famMembersCache.set(name, out);
  return out;
}

// umbrella tags too broad to be interesting — kept out of the Sound Map + artist chips
const GENERIC = new Set([
  "rock", "metal", "pop", "electronic", "electronica", "alternative", "alternative rock",
  "indie", "indie rock", "hard rock", "classic rock", "pop rock", "rock and roll",
  "british", "american", "uk", "usa", "german", "polish", "australian",
]);
const niceTags = (name) => {
  const pn = pinOf(name);
  if (pn && pn.tags) return pn.tags.slice(0, 4);   // hard-override tag chips (same-name enrichment collision)
  const drop = new Set((pn && pn.dropTags) || []);  // franchise/collision tags to filter out (e.g. "anime")
  const all = cachedTags(name).map(t => t[0]).filter(t => !drop.has(t));
  const specific = all.filter(t => !GENERIC.has(t));
  return (specific.length ? specific : all).slice(0, 4);
};

// Discogs styles WITH release counts (fold-aware), for the weighted vote — [[style, count], …].
// stylesOf() returns names-only (top-5, display); the vote wants the full count-weighted list.
function stylesCountOf(name) {
  const pn = pinOf(name);
  if (pn && pn.clearStyles) return [];   // wrong-entity Discogs match → no discogs evidence
  const d = aliasedByName(DISCOGS, name);
  return (d && d.styles) ? d.styles : [];
}

// artist → primary Sound-Map family INDEX (aligns with FAMILIES order, the cube's famIdx).
// v2: a WEIGHTED VOTE (classifyArtist) over ALL THREE sources — last.fm tag-cache (count-scaled),
// Spotify genres (flat 0.7), Discogs styles (count-scaled, 0.5 max) — replaces the old
// first-classifiable-tag-wins. Precedence: pins.json "fam" (hard pin) > FAMILY_OVERRIDES (legacy
// hand list) > the vote. Memoised — the clock cube calls this once per scrobble (315k).
const _famCache = new Map();
function familyIdxByName(name) {
  if (_famCache.has(name)) return _famCache.get(name);
  // NEW `fam` pin (pins.json): hard-override the assignment by family NAME.
  const pn = pinOf(name);
  if (pn && pn.fam) {
    const pi = _FAM_INDEX.get(pn.fam);
    if (pi != null) { _famCache.set(name, pi); return pi; }
  }
  if (typeof FAMILY_OVERRIDES !== "undefined" && FAMILY_OVERRIDES[name]) {
    const oi = _FAM_INDEX.get(FAMILY_OVERRIDES[name]);
    if (oi != null) { _famCache.set(name, oi); return oi; }
  }
  const lastfm = (META[name] && META[name].tags)
    ? META[name].tags.map(t => Array.isArray(t) ? t : [t, 100])   // curated META tags are bare strings
    : cachedTags(name);                                            // [[tag, count], …]
  const spotify = aliasedByName(SPOTGEN, name) || [];
  const discogs = stylesCountOf(name);
  const idx = _rootsGuard(classifyArtist({ lastfm, spotify, discogs }), { lastfm, spotify, discogs });
  _famCache.set(name, idx);
  return idx;
}

// ── familyIdxByAlbum(artist, title) — a PER-ALBUM dominant family from album-level evidence, run
//    through the SAME weighted 3-source vote (_voteArtist) as the artist classifier. Evidence:
//    { lastfm: album-genres tags for slug(artist)~slug(title), spotify: [] (no per-album Spotify
//    genres yet), discogs: discogs-album styles }. GATE (approved 2026-08-12): the winner must own
//    SHARE >= 0.5 of the album's total vote weight (FAM_ABS_MIN class — a confident dominant), else
//    return -1 so the consumer falls back to the artist family (familyIdxByName). Returns a FAMILIES
//    index or -1. Absent caches → no evidence → -1 (build works without album-genres.json).
const _famAlbCache = new Map();
// Hand vetoes: album keys whose album-evidence vote misfires (rule artifacts at album
// granularity) — forces the artist-family fallback. First entry: bare hard-rock tags
// dragging AC/DC-class albums into Prog (Fuad 2026-08-12).
const ALBUM_FAM_VETO = new Set(["airbourne~runnin-wild"]);
function familyIdxByAlbum(artist, title) {
  if (!hasAlbumGenres) return -1;
  const key = slug(artist) + "~" + slug(title);
  if (ALBUM_FAM_VETO.has(key)) return -1;
  if (_famAlbCache.has(key)) return _famAlbCache.get(key);
  const at = aliasedBySlugAlbum(ALBUM_TAGS, slug(artist), slug(title));
  const as = aliasedBySlugAlbum(ALBUM_STYLES, slug(artist), slug(title));
  const lastfm = (at && at.tags) || [];
  const discogs = (as && as.styles) || [];
  if (!lastfm.length && !discogs.length) { _famAlbCache.set(key, -1); return -1; }
  const { totals, ranked } = _voteArtist({ lastfm, spotify: [], discogs });
  let idx = -1;
  if (ranked.length) {
    const [winner, top] = ranked[0];
    let sum = 0; for (const w of totals.values()) sum += w;
    // dominant-share gate: winner must be a real (non-grey) family AND own >= 50% of the vote.
    if (sum > 0 && (top / sum) >= FAM_ABS_MIN && !(FAMILIES[winner] && FAMILIES[winner].grey)) idx = winner;
  }
  _famAlbCache.set(key, idx);
  return idx;
}

// ─────────── read + aggregate ───────────
if (!fs.existsSync(CSV_PATH)) {
  console.error(`FATAL: ${CSV_PATH} missing — the daily scrobble sync must run before build-data.`);
  process.exit(1);
}
const raw = fs.readFileSync(CSV_PATH, "utf8");
const lines = raw.split(/\r?\n/).filter(l => l.trim());

// ─────────── canonicalise scrobble-name variants ───────────
// last.fm scrobbles the same artist under many spellings (NIN / Nine Inch Nails;
// "Trent Reznor & Atticus Ross" / "…and…"). Group by MusicBrainz id when known, else by a
// normalised name (case/punctuation/&/and-insensitive), and remap every variant to the most-
// played spelling BEFORE aggregating, so no list shows duplicates. mbid grouping is safe (a
// shared id means last.fm already calls them one artist); name grouping only touches no-mbid acts.
const _rawCount = new Map();
for (const line of lines) { const a = parseLine(line)[0]; if (a) _rawCount.set(a, (_rawCount.get(a) || 0) + 1); }
const _normName = (s) => s.toLowerCase().replace(/&/g, " ").replace(/[^a-z0-9]+/g, " ").replace(/\band\b/g, " ").replace(/\s+/g, " ").trim();
const CANON = new Map();
{
  const groups = new Map();
  for (const name of _rawCount.keys()) {
    const mb = STATS[name] && STATS[name].mbid;
    const key = mb ? "mb:" + mb : "nm:" + _normName(name);
    if (!key || key === "nm:") continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(name);
  }
  for (const names of groups.values()) {
    if (names.length < 2) continue;
    let rep = names[0];
    for (const n of names) if ((_rawCount.get(n) || 0) > (_rawCount.get(rep) || 0)) rep = n;
    for (const n of names) if (n !== rep) CANON.set(n, rep);
  }
  // second pass (Fuad 2026-07-14): a mbid-keyed artist and a NO-mbid decorated variant of the same
  // name land in different groups above, so they never merge (e.g. "Deftones" [mbid] vs "♥ Deftones"
  // scrobbled by a player that prepends a heart on loved tracks — same slug, shown as a duplicate).
  // Fold any orphan no-mbid name onto the mbid-anchored artist that shares its normalised name.
  const mbNorm = new Map();
  for (const name of _rawCount.keys()) {
    if (!(STATS[name] && STATS[name].mbid)) continue;
    const nn = _normName(name); if (!nn) continue;
    const cur = mbNorm.get(nn);
    if (!cur || (_rawCount.get(name) || 0) > (_rawCount.get(cur) || 0)) mbNorm.set(nn, name);
  }
  for (const name of _rawCount.keys()) {
    if (CANON.has(name) || (STATS[name] && STATS[name].mbid)) continue;
    const rep = mbNorm.get(_normName(name));
    if (rep && rep !== name) CANON.set(name, rep);
  }
  // flatten chains to a fixed point — canon() applies the map only once, so a two-hop variant like
  // "♥️ deftones" → "♥ Deftones" → "Deftones" would otherwise strand the middle name as a phantom.
  for (const k of [...CANON.keys()]) {
    let v = CANON.get(k); const seen = new Set([k]);
    while (CANON.has(v) && !seen.has(v)) { seen.add(v); v = CANON.get(v); }
    CANON.set(k, v);
  }
}
// ─────────── hand fixes (Fuad's verdicts, 2026-07-13) ───────────
// Merges the mbid/name grouping can't see (genuinely different names, same act):
const HAND_MERGE = {
  "A. Yarmak": "Alex Yarmak",
  "\"Pts.Of.Athrty\" (Official HD Video)": "Linkin Park",   // junk video-title scrobbles
  "Cyberpunk 2077 – E3 2018 Trailer Music / Hyper": "Hyper",
  "DOOM (2016) OST": "Mick Gordon",
  "Gary Moore -Rocksijen.Com-": "Gary Moore",               // junk site-suffix scrobble
  "Nothing's Carved In Stone「Out of Control (Live from Monthly Live at QUATTRO Vol.2": "Nothing's Carved In Stone",
};
// ─────────── NON-ARTISTS (Fuad 2026-08-13: "clean up artists which are not artists") ───────────
// Scrobble noise from YouTube/browser sessions — news domains, trailers, TV episodes, how-tos,
// dog videos, parody covers, full-concert channel uploads. Rows are DROPPED at ingest (no music
// identity to retarget). Real acts with domain-ish or sentence-ish names are NOT here on purpose:
// Vein.fm, Charisma.com, You Love Her Coz She's Dead, I DONT KNOW HOW BUT THEY FOUND ME,
// BBC Scottish Symphony Orchestra. Parked as ambiguous: The Dark.FM, I Don't Know What I Can
// Save You From, Everybody's Doing It (featuring Chris Martin, Jay.
const NON_ARTISTS = new Set([
  "https", "news.google.com", "www.abc.net.au", "findesign.com.au", "epicofficefurniture.com.au",
  "drive.google.com", "store.epicgames.com", "m.imdb.com", "liveuamap.com", "instagram.com",
  "hermanmiller.com", "decathlon.com.au", "businessinsider.com.pl", "Facebook.com",
  "Netflix Polska", "Guardian Australia", "guardian news", "Sparrows News",
  "How to sound smart in your TEDx Talk", "Rick and Morty Season 3 Trailer",
  "How to count one to ten", "Antichamber Launch Trailer", "So I've Finally Played... Mirror's Edge",
  "How to create a 3D Terrain with Google Maps and height maps in Photoshop",
  "The Grand Tour Cast on Amazon vs the BBC, cars, and being recognized in Syria",
  "Snoop Dogg impersonates today's rappers sound", "Ghost in the Shell Official Trailer 1 (2017)",
  "GTA 5 Official Trailer Song/Music", "Does that mean he's not coming on then",
  "learn how to roll a joint in 3 minutes [POV", "Yahtzee's Microsoft E3 2019 Showcase Adventure",
  "Yahtzee Documentary Teaser", "Why So Serious? The Joker Theme The Dark Knight Soundtrack",
  "WWW.WORKING!! OP", "Tony Hawk's Pro Skater 4 OST",
  "This is why  GERMAN SHEPHERDS are the FUNNIEST  DOGS",
  "This Is What Life Is Like with a Gigantic Penis", "Southpaw Official Trailer #1 (2015)",
  "Shameless Season 10 (2019) Official Trailer",
  "Ryan Gosling and Harrison Ford Lose It at Hilarious Interview!",
  "Robert De Niro Explains How He De", "Rap Was a Man's Soul... Right?",
  "Psychosocial but it's a complete shit show", "Nine Inch Nails Interview",
  "Maynard James Keenan on how the Fibonacci Sequence inspired the lyrics",
  "Limp Bizkit LIVE Show Me What You Got & Break Stuff",
  "Levi vs Kenny's Squad Full Fight | Attack on Titan Season 3",
  "Killing In The Name but it's a complete shit show", "Kill La Kill Episode 9",
  "JoJo's Bizarre Adventure: Diamond is Unbreakable OP 1",
  "Jeremy Clarkson Reveals What He Thinks of the New Top Gear!",
  "It's time to complete the circle.", "It's poppin! Ah man, the building is on fire!",
  "In The End but it's played on the piano in Half",
  "How to curve type around a badge using Adobe Illustrator CS3",
  "How to Remove Background from Video Footage without Greenscreen",
  "How WES BORLAND (LIMP BIZKIT) Nearly Joined One Of the Biggest 90's",
  "How To Animate Humans in Blender", "How Nordic Are You? with Mads Mikkelsen and Jonas Åkerlund",
  "Game of Thrones Season 4: Episode #10", "Freak on a Leash but it's a complete shit show",
  "Fargo Season 4 Trailer", "Extended Trailer", "Down With The Sickness but it's a complete shit show",
  "Defending a Wild Bird Nest from the Neighbor's Cats",
  "Coldplay's Game of Thrones: The Musical (Full 12", "Charlie Brooker's How to Report the News",
  "Cat names that get your cat's attention", "Before I Forget but it's a complete shit show",
  "B.Y.O.B. but it's a complete shit show", "Attack on Titan Season 3 Part 2 Trailer",
  "Blaze Loves His Kennel (Original) Husky Says No to Kennel", "Husky Dog Sings with iPAD",
  "Husky Dog Talking",
  "bizkitlivechannel", "KręciołaTV", "metfan4l", "KroodKoala", "(2-Cam-Mix) Limp Bizkit",
  "APMAs 2016 Performance",
]);
// 3a — artist folds (feat-credit / diacritic / spelling) seed HAND_MERGE: variant name →
// canonical block key. Semantically identical to a hand fix; canon() (below) already applies
// HAND_MERGE[c] || c after CANON. MUST run before the spelling-fold prescan (which calls canon()
// to bucket by artist) — it does, prescan is further down. See LEDGER_DESIGN.md §3a / risk #5.
for (const [canonName, block] of Object.entries(FOLDS)) {
  // `artist` may be a single {from,…} object OR an array of them ([].concat normalizes both) —
  // one canonical key can absorb several variant credit-strings (e.g. i_o gets two feat folds).
  const arts = block && block.artist ? [].concat(block.artist) : [];
  for (const a of arts) if (a && a.from) HAND_MERGE[a.from] = canonName;
}
// canon() applies HAND_MERGE only once, so — unlike CANON — it is NOT fixed-point flattened.
// A folded `from` pointing at a name that is itself another `from` would strand the middle hop
// (LEDGER_DESIGN.md risk #1). Flatten HAND_MERGE to a fixed point so multi-hop folds resolve.
for (const k of Object.keys(HAND_MERGE)) {
  let v = HAND_MERGE[k]; const seen = new Set([k]);
  while (HAND_MERGE[v] && !seen.has(v)) { seen.add(v); v = HAND_MERGE[v]; }
  HAND_MERGE[k] = v;
}
// ─────────── fold alias maps (canonical → [folded-from variants]) ───────────
// A fold re-attributes a variant's scrobbles to a canonical name (WARGASM (UK) → Wargasm), but the
// ENRICHMENT stores (images/art/bios/genres/…) were pulled under the OLD name/slug and never re-keyed.
// After a fold the canonical name/slug misses every one of those stores → folded artists render blank.
// Build the reverse map ONCE so every enrichment join can fall back to the pre-fold key on a miss.
//   ALIAS_NAMES : canonicalName → [foldedFromName, …]   (for name-keyed stores)
//   ALIAS_SLUGS : canonicalSlug → [foldedFromSlug, …]   (for slug- and slug~album-keyed stores)
// A canonical may absorb several variants; keep them all (first hit wins at read time). We SKIP any
// alias whose slug already equals the canonical slug (nothing to gain), and dedupe within a canonical.
const ALIAS_NAMES = new Map();
const ALIAS_SLUGS = new Map();
for (const [from, canonName] of Object.entries(HAND_MERGE)) {
  if (!from || !canonName || from === canonName) continue;
  if (!ALIAS_NAMES.has(canonName)) ALIAS_NAMES.set(canonName, []);
  const nl = ALIAS_NAMES.get(canonName);
  if (!nl.includes(from)) nl.push(from);
  const cS = slug(canonName), fS = slug(from);
  if (fS && fS !== cS) {
    if (!ALIAS_SLUGS.has(cS)) ALIAS_SLUGS.set(cS, []);
    const sl = ALIAS_SLUGS.get(cS);
    if (!sl.includes(fS)) sl.push(fS);
  }
}
// aliasedByName(map, name)  — return map[name] if present (canonical always wins), else the first
//   folded-from variant of `name` that has a value in the map. `map` is a plain object.
// aliasedBySlug(map, key)   — same, for a store keyed by artist SLUG.
// aliasedBySlugAlbum(map, artistSlug, albumSlug) — for "<artistSlug>~<albumSlug>" keyed stores: try
//   the canonical prefix, then each alias prefix with the SAME album part (albumSlug is fold-invariant —
//   only the artist half changes across a fold). Returns the value or undefined.
// These ONLY add fallbacks; a present canonical key is never overridden.
function aliasedByName(map, name) {
  if (!map || name == null) return undefined;
  if (map[name] != null) return map[name];
  const al = ALIAS_NAMES.get(name);
  if (al) for (const a of al) if (map[a] != null) return map[a];
  return undefined;
}
function aliasedBySlug(map, key) {
  if (!map || key == null) return undefined;
  if (map[key] != null) return map[key];
  const al = ALIAS_SLUGS.get(key);
  if (al) for (const a of al) if (map[a] != null) return map[a];
  return undefined;
}
function aliasedBySlugAlbum(map, artistSlug, albumSlug) {
  if (!map || artistSlug == null) return undefined;
  const ck = artistSlug + "~" + albumSlug;
  if (map[ck] != null) return map[ck];
  const al = ALIAS_SLUGS.get(artistSlug);
  if (al) for (const a of al) { const v = map[a + "~" + albumSlug]; if (v != null) return v; }
  return undefined;
}
// Emit-time aliasing for the LAZY SIDECARS shipped wholesale and looked up CLIENT-SIDE by canonical
// slug (mb-lineup, track-audio, genius-mood/about/themes, album-about). The client only knows the
// canonical slug post-fold, but these objects still carry the pre-fold slug keys → a folded artist's
// lookup misses. Inject canonical-slug alias entries (canonical NEVER overwrites an existing key).
//   aliasSidecarBySlug(obj)       — obj keyed by "<artistSlug>": for each canonical with a folded
//                                   variant present, copy the variant's entry to the canonical slug.
//   aliasSidecarBySlugAlbum(obj)  — obj keyed by "<artistSlug>~<albumSlug>": likewise, per album part.
// Both mutate + return `obj`. Purely additive: only fills a missing canonical key.
function aliasSidecarBySlug(obj) {
  if (!obj) return obj;
  for (const [cS, aliases] of ALIAS_SLUGS) {
    if (obj[cS] != null) continue;                 // canonical already keyed — leave it
    for (const a of aliases) if (obj[a] != null) { obj[cS] = obj[a]; break; }
  }
  return obj;
}
function aliasSidecarBySlugAlbum(obj) {
  if (!obj) return obj;
  const adds = {};
  for (const key of Object.keys(obj)) {
    const t = key.indexOf("~"); if (t < 0) continue;
    const aliasArtist = key.slice(0, t), album = key.slice(t + 1);
    // which canonical(s) fold this artist slug? invert ALIAS_SLUGS on demand.
    for (const [cS, aliases] of ALIAS_SLUGS) {
      if (cS === aliasArtist || !aliases.includes(aliasArtist)) continue;
      const ck = cS + "~" + album;
      if (obj[ck] == null && adds[ck] == null) adds[ck] = obj[key];   // canonical wins if already present
    }
  }
  Object.assign(obj, adds);
  return obj;
}
// Sound-map family overrides — consulted BEFORE the tag vote (tag data is wrong/absent).
// v2 (2026-08-12): values re-mapped to the v2 15-family vocabulary. The dissolved "Japanese"
// family is gone — each JP-scene act is pinned to its real musical family (Sound-Map lens is genre,
// not scene; the scene dimension is orthogonal/non-voting). New hard pins should ride pins.json's
// `fam` field (checked first in familyIdxByName); this legacy hand list stays for the acts already
// verified here. Owner may migrate individual rows to pins.json over time.
const FAMILY_OVERRIDES = {
  // Adjudication wave 2026-08-13 (Sonnet swarm → Opus verify → Fable QC; 34 confirmed):
  "Nevermore": "Prog",
  "Metallica": "Thrash/Death",
  "MAN WITH A MISSION": "Alternative/Indie",
  "Faith No More": "Alternative/Indie",
  "Skywalker": "Punk/Hardcore",
  "Eville": "Thrash/Death",
  "Lowlives": "Shoegaze/Grunge",
  "The Glitch Mob": "Electronic/DnB",
  "Mötley Crüe": "Heavy/Doom",
  "The Cure": "Alternative/Indie",
  "MY FIRST STORY": "Punk/Hardcore",
  "Show Me the Body": "Punk/Hardcore",
  "Hana": "Pop",
  "And So I Watch You From Afar": "Shoegaze/Grunge",
  "Gurren Lagann OST Disc 1": "Score",
  "Tides From Nebula": "Shoegaze/Grunge",
  "Evanescence": "Heavy/Doom",
  "a flood of circle": "Alternative/Indie",
  "Sleeping With Sirens": "Punk/Hardcore",
  "Original God": "Hip-Hop/Rap",
  "Willow": "Alternative/Indie",
  "THE NOVEMBERS": "Shoegaze/Grunge",
  "Zankyou no Terror OST": "Score",
  "Future Foundation": "Punk/Hardcore",
  "Wienners": "Punk/Hardcore",
  // was a "blues/roots stretch" into Jazz/Funk (Fuad 2026-08-13) purely to get him out of Other —
  // he displayed as "jazz". Roots/Classic is his actual home, so the stretch is retired.
  "Johnny Cash": "Roots/Classic",
  "Vana": "Metalcore/Nu",
  "Ylvis": "Pop",
  "Spec Ops: The Line": "Score",
  "3nd": "Shoegaze/Grunge",
  "99DROWNTOWN": "Hip-Hop/Rap",
  "Nubia": "Prog",
  "The London Metropolitan Orchestra;Michael Kamen": "Score",
  "Hide": "Alternative/Indie",
  "daine": "Industrial/Noise/Hyperpop",   // v1 Digital hardcore / hyperpop → stays in the single Industrial/Noise/Hyperpop family (2026-08-12)
  // Genre corrections round 3 (Fuad 2026-07-12, vs tag noise) + Fable's tag-audit verdicts:
  "Dream Theater": "Prog",
  "Tool": "Prog",
  "TesseracT": "Prog",
  "Animals as Leaders": "Prog",
  "Periphery": "Prog",
  "BABYMETAL": "Metalcore/Nu",               // v2: kawaii metal → Metalcore/Nu (STEP1 fix; owner-approved)
  "Melt-Banana": "Punk/Hardcore",            // Japanese noise-punk
  "ミドリ": "Punk/Hardcore",                  // Japanese noise-rock/jazz-punk
  "9mm Parabellum Bullet": "Alternative/Indie",
  "MAN WITH A MISSION": "Metalcore/Nu",      // Japanese alt-metal/rock
  "Trent Reznor and Atticus Ross": "Score",
  "Trent Reznor & Atticus Ross": "Score",
  // "HEALTH": "Shoegaze/Grunge" removed 2026-08-17 — evidence wins (noise rock 100 → Industrial/Noise/Hyperpop).
  "Grimes": "Electronic/DnB",
  "Battle Tapes": "Electronic/DnB",
  "Airbourne": "Heavy/Doom",          // hard-rock/heavy → Heavy bucket
  "RedHook": "Metalcore/Nu",
  "Alex": "Electronic/DnB",
  "Romes": "Metalcore/Nu",
  "Lisa": "Pop",                             // JP pop-rock vocalist → Pop
  "Gramatik": "Electronic/DnB",
  "Metrik": "Electronic/DnB",
  "Yours Truly": "Metalcore/Nu",
  "Jon Opstad": "Score",
  "Volumes": "Prog",
  // Other-list fold, round 2 (Fuad's verdicts + Fable's confident calls, 2026-07-12):
  "PRO8L3M, Dawid Podsiadło, Duit": "Hip-Hop/Rap",
  "Gurren Lagann OST Disc 1": "Score",
  "Morgan Thomaso": "Prog",
  "DHMHTHP": "Punk/Hardcore",
  "Ivy Lab, Roses Gabor": "Electronic/DnB",
  "Hensonn": "Electronic/DnB",
  "Grimes, i_o": "Electronic/DnB",
  "Glacerate": "Electronic/DnB",
  "panda beats": "Electronic/DnB",
  "Beatman, Hyper, Ludmilla": "Electronic/DnB",
  "Tommy Trash, i_o, Daisy Guttridge": "Electronic/DnB",
  "Kaskade x Deadmau5 feat. Skylar Grey": "Electronic/DnB",
  "SBCR & Razihel": "Electronic/DnB",
  "Zankyou no Terror OST": "Score",
  "Spec Ops: The Line": "Score",
  "UnderTale OST": "Score",
  "The London Metropolitan Orchestra;Michael Kamen": "Score",
  "05.  Counterattack Mankind": "Score",
  "Vaporwave with Teenage Engineering OP-1 蒸気波 (feat. Blank Banshee": "Electronic/DnB",
  "Yuna Kil": "Metalcore/Nu",
  "i_o, Lights": "Electronic/DnB",           // collab credit; i_o leads → electronic
  "Mystery Kiss": "Pop",                     // Odd Taxi's fictional j-pop unit → Pop
  "Taoubt": "Prog",
  "VonRyk": "Electronic/DnB",
};
// Non-music scrobbles (YouTube shows etc.) — excluded from Explore / the genre map.
// ("Corridor" ≠ "Corridor Crew" — the Montreal band stays.)
const NONMUSIC = new Set(["Corridor Crew", "George Carlin"]);   // stand-up, not music
// deliberately unclassified — kept in the library but off the genre map (Fuad's own releases:
// "doesn't belong anywhere, this needs to be invalidated somehow", 2026-07-12)
const UNCLASSIFIABLE = new Set(["Fuad Soudah"]);
for (const n of UNCLASSIFIABLE) NONMUSIC.add(n);
const canon = (name) => { const c = CANON.get(name) || name; return HAND_MERGE[c] || c; };
// (album hygiene — placeholder remaps + tag stripping — now lives in sync-csv.js as data overrides,
// so fuadex.csv already holds clean album titles by the time we read it here.)

// ─────────── album canonicalisation (base-exists folding) ───────────
// Collapse variant titles onto their base release so base+variant count as ONE album everywhere
// albums aggregate (per-artist lists, media index, flow, geo/day, obsessions).
//
// TIGHTER POLICY (2026-08-17, owner design ask "we need a tighter system"):
// The old approach was a marker ALLOWLIST — a title only folded if its suffix matched a curated
// edition vocabulary (deluxe/remaster/anniversary/…). That silently missed anything the list didn't
// name: "Herzeleid (XXV Anniversary Edition – Remastered)" (arbitrary text before the keyword),
// "Random Album Title (Promo CD)", "Widmo (Instrumentals)", "The Burning Red" vs "Burning Red".
// The new rule inverts it to BASE-EXISTS EVIDENCE:
//   when the SAME artist already has a bare album "X" (with real plays), then "X (anything)",
//   "X - anything", and the "The X"/"X" article variant ALL fold onto X BY DEFAULT — regardless of
//   what the parenthetical says. Evidence that the base is a real release you play is what licenses
//   the fold; we no longer need to enumerate every edition word.
//
// SHORT PROTECT LIST (_ALBUM_PROTECT) — the ONLY suffix classes kept separate even when the base
// exists, because they denote a genuinely DIFFERENT PERFORMANCE/RECORDING, not a repackage of the
// same masters:
//   • live / "live at <venue>" / "live in <city>" / (… tour) — a concert recording is its own work.
//   • unplugged / "MTV Unplugged" — a distinct acoustic re-performance (its own release + tracklist).
//   • acoustic / "acoustic version(s)/sessions" — re-recorded, not the studio master.
//   • "<X> sessions" (Peel/BBC/live sessions) — separate session recordings.
// Deliberately NOT protected (owner: "(Instrumentals) should FOLD"): instrumental(s), demo(s),
// remix(es/ed), and every edition/reissue/promo word — these are the SAME songs (a stem-mute, an
// early take, a re-tooled mix, or a repackage) and belong on the base album's row.
//
// FALLBACK (base does NOT exist): a standalone variant with no bare counterpart — e.g. a title we
// only ever scrobbled as "Album (Deluxe Edition)" — still normalises via the edition marker STRIP
// below, and a standalone "X (Live)" with no studio X is LEFT AS-IS (protect list still applies).
// Title-collision guard: we never fold onto a "base" that is itself a different real album — the
// census tracks per-artist raw titles so a same-name-different-release collision is detectable
// (none found in this corpus; logged if one appears).

// performance/recording classes that stay a distinct row even when the base album exists
const _ALBUM_PROTECT = /\b(live|unplugged|acoustic|a cappella|acapella|sessions?)\b/i;
// marker vocabulary used ONLY by the fallback strip (when no bare base exists to anchor the fold)
const _ALBUM_KEEP = /\b(live|acoustic|unplugged|instrumentals?|demos?|acapella|a cappella|remix(?:es|ed)?|single|ep|ost|soundtrack|sessions?|covers?)\b/i;
const _ALBUM_STRIP = new RegExp(
  "^(.*?)[\\s]*[([\\-–—][\\s]*(?:" +
  "deluxe|expanded|remaster(?:ed)?|anniversary|special edition|extended|" +
  "bonus(?:[\\s-]track)?(?:[\\s-]edition)?(?:[\\s-]version)?|collector(?:'?s)?(?:[\\s-]edition)?|redux|" +
  "tour edition|complete edition|limited(?:[\\s-]edition)?|digipak|re-?issue|" +
  "audiophile(?:[\\s-](?:mastered|master))?(?:[\\s-]version)?|international(?:[\\s-](?:edition|version))?|" +
  "legacy edition|platinum edition|gold edition|(?:japanese|japan|uk|u\\.?k\\.?|us|u\\.?s\\.?|european|intl|int'?l) (?:only )?(?:edition|version)|bonus disc|" +
  "\\d+(?:th|st|nd|rd)[\\s-]anniversary(?:[\\s-]edition)?|" +
  "(?:19|20)\\d{2}(?:[\\s-](?:remaster(?:ed)?|mix|master|edition|version))?" +   // "2012 Mix/Master", bare year only when in a suffix segment
  ")[^)\\]]*[)\\]]?\\s*$", "i"
);
// edition suffixes that appear WITHOUT a bracket/dash delimiter: "Meteora 20th Anniversary Edition"
const _ALBUM_STRIP_BARE = /^(.{3,}?)\s+(\d+(?:th|st|nd|rd)\s+anniversary(?:\s+edition)?|limited edition|deluxe(?:\s+(?:edition|version))?|special edition)$/i;

// ── base-exists census ──────────────────────────────────────────────────────────────────────
// _albCensus: canonArtist → Map(_foldName(rawTitle) → { plays, disp }) built in a pre-pass over the
// CSV (below, right before the spelling prescan). Records every RAW album title an artist has and
// its total plays + most-played display spelling, so canonAlbum can ask "does a bare base exist?".
// _albCensusFold: quick lookup helper filled once the census is ready.
const _albCensus = new Map();
const _minBasePlays = 2;   // "meaningful plays" floor — a base seen only once isn't strong evidence
// peel ONE trailing paren/bracket/dash suffix → { base, suffix } (suffix "" if none peeled)
function _peelSuffix(s) {
  // trailing (…) or […]
  let m = /^(.*\S)\s*[([]([^)\]]*)[)\]]\s*$/.exec(s);
  if (m) return { base: m[1].trim(), suffix: m[2].trim() };
  // trailing " - suffix" / " – suffix" / " — suffix" (dash with spaces, so hyphenated titles survive)
  m = /^(.*\S)\s+[\-–—]\s+(\S.*)$/.exec(s);
  if (m) return { base: m[1].trim(), suffix: m[2].trim() };
  return { base: s, suffix: "" };
}
// does a bare base title exist for this artist with real plays? returns its display spelling or null.
function _baseExists(artist, base) {
  if (!base) return null;
  const c = _albCensus.get(artist); if (!c) return null;
  const e = c.get(_foldName(base));
  return e && e.plays >= _minBasePlays ? e.disp : null;
}
// canonAlbum(name, artist): with an artist + a ready census, fold variant→base by evidence; else
// fall back to the marker-strip. artist optional so the census pre-pass can call canonAlbum(raw)
// with the OLD (marker-only) behaviour while it is still building the census.
function canonAlbum(name, artist) {
  if (!name) return name;
  let s = name;
  if (artist && _albCensus.size) {
    // base-exists folding: peel one suffix / drop leading article, fold if the bare base is real
    for (let i = 0; i < 4; i++) {
      let folded = false;
      // (a) trailing parenthetical / bracket / " - " suffix
      const { base, suffix } = _peelSuffix(s);
      if (base && base !== s && !_ALBUM_PROTECT.test(suffix)) {
        const disp = _baseExists(artist, base);
        if (disp && _foldName(disp) !== _foldName(s)) { s = disp; folded = true; }
      }
      if (folded) continue;
      // (b) leading article: "The X" ↔ "X" when the counterpart exists (fold toward the real base).
      // BOTH directions (2026-08-28, owner-reported): the strip-only version left Onslaught's
      // stray "Force" row beside "The Force" and Ministry's "Land of Rape and Honey" beside
      // "The Land…" — the ↔ in this comment was aspirational for two months.
      const noThe = s.replace(/^the\s+/i, "");
      if (noThe !== s) {
        const disp = _baseExists(artist, noThe);
        if (disp && _foldName(disp) !== _foldName(s)) { s = disp; folded = true; }
      } else {
        const disp = _baseExists(artist, "The " + s);
        if (disp && _foldName(disp) !== _foldName(s)) { s = disp; folded = true; }
      }
      if (folded) continue;
      // (c) mojibake rescue (2026-08-28, owner-reported "two Liebe ist für alle da"): a UTF-8
      // diacritic corrupted to U+FFFD replacement chars eats the BASE letter too ("für" →
      // "f??r"), so _foldName can never equate the rows ("f r" vs "fur"). Treat each FFFD run
      // as a 0-2 char wildcard and look for exactly one same-artist census match.
      if (s.includes("�")) {
        const c = _albCensus.get(artist);
        if (c) {
          const rx = new RegExp("^" + s.split(/�+/).map(p => _foldName(p).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[\\p{L}\\p{N} ]{0,2}") + "$", "u");
          const cands = [...c.values()].filter(e => e.plays >= _minBasePlays && rx.test(_foldName(e.disp)));
          if (cands.length === 1) { s = cands[0].disp; folded = true; }
        }
      }
      if (!folded) break;
    }
    if (s !== name) return s;   // evidence-based fold won; done
  }
  // ── fallback: marker-strip (no bare base to anchor on, or census not ready) ──
  // peel one trailing edition segment at a time (handles "… (Deluxe) (Remastered)")
  for (let i = 0; i < 4; i++) {
    const m = _ALBUM_STRIP.exec(s) || _ALBUM_STRIP_BARE.exec(s);
    if (!m) break;
    const base = m[1].replace(/[\s\-–—]+$/, "").trim();
    const stripped = s.slice(base.length);            // the tail we'd remove
    if (!base) break;                                  // never strip to empty
    if (_ALBUM_KEEP.test(stripped)) break;             // exclusion list wins — leave as-is
    s = base;
  }
  return s;
}
// diacritic/punctuation fold — "Liebe Ist Fur Alle Da" ≡ "Liebe ist für alle da",
// "Reise, Reise" ≡ "Reise Reise". Groups same-artist spellings; display = most-played.
// Uses Unicode letter/number classes (not [a-z0-9]) so NON-LATIN titles keep their characters:
// otherwise every all-CJK album title folds to "" and distinct albums collapse into one — that
// bug merged ミドリ's 清水 / 深夜高速 / ライブ!! into あらためまして (all folded to empty). Stripping
// only marks + non-alphanumerics also re-merges mojibake-corrupted duplicates onto the clean title.
const _foldName = (s) => String(s).normalize("NFD").replace(/\p{M}/gu, "")
  .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
// alias entries: "<artistSlug>~<variantAlbumSlug>" → "<artistSlug>~<canonAlbumSlug>", recorded
// at ingest whenever a variant title differs from its canonical base (emitted to album-alias.js).
const ALBUM_ALIAS = {};

// human-readable suffix that canonAlbum() peeled off "Mezzanine (Deluxe Edition)" → "Deluxe Edition".
// Used to populate album-extras `from`. Returns "" when nothing was stripped or the tail is empty.
function variantSuffix(raw, canon) {
  if (!raw || raw === canon || !canon) return "";
  if (raw.slice(0, canon.length) !== canon) return "";
  // strip the leading bracket/dash/space that opened the edition segment, and any trailing bracket
  return raw.slice(canon.length).replace(/^[\s([\-–—]+/, "").replace(/[)\]\s]+$/, "").trim();
}
// per canonical album, capture what the base vs the variants contributed — for album-extras.js:
//   _albBaseTracks: artist\x00canonAlbum → Set(track titles that appeared under the BASE title)
//   _albVarTracks:  artist\x00canonAlbum → Set(track titles that appeared under a VARIANT title)
//   _albVarNames:   artist\x00canonAlbum → Set(distinct human-readable variant suffix names)
//   _albVarByEd:    artist\x00canonAlbum → Map(editionSuffix → Map(track → plays)) — WHICH edition
//                   each variant track arrived under, so bonus tracks can group by release below.
//                   plays counted here (variant-title scrobbles) resolve a track to its most-played
//                   edition when it appears under several.
const _albBaseTracks = new Map();
const _albVarTracks = new Map();
const _albVarNames = new Map();
const _albVarByEd = new Map();
const _addTo = (map, key, val) => { let s = map.get(key); if (!s) { s = new Set(); map.set(key, s); } s.add(val); };
// bump artist\x00album → suffix → track → +1 play (nested-map bookkeeping, sane memory: only
// variant-title scrobbles ever land here, a small tail of the whole CSV).
const _bumpEd = (key, suffix, track) => {
  let bySuf = _albVarByEd.get(key); if (!bySuf) { bySuf = new Map(); _albVarByEd.set(key, bySuf); }
  let byTrk = bySuf.get(suffix); if (!byTrk) { byTrk = new Map(); bySuf.set(suffix, byTrk); }
  byTrk.set(track, (byTrk.get(track) || 0) + 1);
};

// ─────────── base-exists census pre-pass ───────────
// One pass over the CSV BEFORE the spelling prescan: per canon-artist, tally every RAW album title's
// total plays + most-played display spelling. canonAlbum (above) reads this to decide whether a
// variant's stripped base is a real release the owner plays (→ fold) or a standalone (→ keep/strip).
// Must precede the spelling prescan because that prescan now calls canonAlbum(raw, artist) and the
// evidence fold needs the census populated. Cheap: one Map(fold→{plays,disp}) per artist.
{
  const raw = new Map();   // artist → Map(fold → Map(rawTitle → plays))
  for (const line of lines) {
    const [ra, rAlb] = parseLine(line);
    if (!ra || !rAlb) continue;
    const a = canon(ra);
    let m = raw.get(a); if (!m) { m = new Map(); raw.set(a, m); }
    const f = _foldName(rAlb);
    let sp = m.get(f); if (!sp) { sp = new Map(); m.set(f, sp); }
    sp.set(rAlb, (sp.get(rAlb) || 0) + 1);
  }
  for (const [a, m] of raw) {
    const c = new Map(); _albCensus.set(a, c);
    for (const [f, sp] of m) {
      let plays = 0, disp = "", best = -1;
      for (const [title, n] of sp) { plays += n; if (n > best) { best = n; disp = title; } }
      c.set(f, { plays, disp });
    }
  }
}

// ─────────── spelling-fold prescan (albums + tracks) ───────────
// One extra pass over the CSV: per artist, group album titles (post-suffix-strip) and track
// titles by folded key; every variant spelling remaps to the most-played one at ingest.
// Catches umlaut-less dupes, curly-vs-straight apostrophes, comma variants.
const ALBUM_FOLD = new Map();   // artist\x00fold(album) → best spelling
const TRACK_FOLD = new Map();   // artist\x00slug(track) → best spelling
{
  const albC = new Map(), trkC = new Map();
  for (const line of lines) {
    const [ra, rAlb, trk] = parseLine(line);
    if (!ra) continue;
    const a = canon(ra);
    if (rAlb) { const al = canonAlbum(rAlb, a); const k = a + "\x00" + _foldName(al) + "\x00" + al;
      albC.set(k, (albC.get(k) || 0) + 1); }
    if (trk) { const k = a + "\x00" + slug(trk) + "\x00" + trk; trkC.set(k, (trkC.get(k) || 0) + 1); }
  }
  const pick = (src, dst) => {
    const best = new Map();
    for (const [k, n] of src) {
      const i = k.lastIndexOf("\x00"); const g = k.slice(0, i), spelling = k.slice(i + 1);
      const cur = best.get(g);
      if (!cur || n > cur[1]) best.set(g, [spelling, n]);
    }
    for (const [g, [spelling]] of best) dst.set(g, spelling);
  };
  pick(albC, ALBUM_FOLD); pick(trkC, TRACK_FOLD);
  // 3b — album SPELLING folds: force the curated canonical over the prescan's most-played winner.
  // Overwrite BOTH the variant's fold-group AND the target's group to resolve to f.to, so the
  // variant title never survives into an album Map. variant-type album folds are NOT merged here
  // (that would erase the row) — they emit a ROTATION_VARIANT_OF link below (3d). Slug/_foldName
  // compare per fold. See LEDGER_DESIGN.md §3b / risk #2.
  for (const [canonName, block] of Object.entries(FOLDS)) {
    for (const f of ((block && block.albums) || [])) {
      if (f && f.type === "spelling" && f.from && f.to) {
        ALBUM_FOLD.set(canonName + "\x00" + _foldName(f.from), f.to);
        ALBUM_FOLD.set(canonName + "\x00" + _foldName(f.to), f.to);
      } else if (f && f.type === "variant" && f.from && f.to) {
        const aSlug = slug(canonName);
        const vk = aSlug + "~" + slug(f.from);
        if (slug(f.from) !== slug(f.to)) VARIANT_OF[vk] = aSlug + "~" + slug(f.to);
      } else if (f && f.type === "absorb" && f.from && f.to) {
        // singles→LP absorb: KEEP the single's album row (NO ALBUM_FOLD write). Record only a
        // link so aggregations + track nav resolve the single's album to its LP. See sidecar.
        const aSlug = slug(canonName);
        if (slug(f.from) !== slug(f.to)) {
          ALBUM_ABSORB[aSlug + "~" + slug(f.from)] = aSlug + "~" + slug(f.to);
          ABSORB_TITLE.set(canonName + "\x00" + f.from, f.to);
        }
      }
    }
  }
}
const foldAlbum = (artist, album) => album ? (ALBUM_FOLD.get(artist + "\x00" + _foldName(album)) || album) : album;

// ─────────── curated track merges ───────────
// De-facto duplicate tracks whose titles slug DIFFERENTLY (feat. credits, remaster/explicit
// tags, leading articles), so the spelling fold above can't see them as one group. variant
// "artistSlug~trackSlug" → a title that slugs to the canonical track; the fold then picks the
// best display spelling. Bulk map lives in track-merge.json (generated by a corpus scan, then
// hand-vetoed: live/remix/acoustic/etc variants are DIFFERENT recordings and never fold).
// Hand overrides below win over the file.
const TRACK_MERGE = Object.assign(
  fs.existsSync(path.join(__dirname, "track-merge.json"))
    ? JSON.parse(fs.readFileSync(path.join(__dirname, "track-merge.json"), "utf8")) : {},
  {
    "deadmau5~sofi-needs-a-ladder-ft-sofi": "Sofi Needs A Ladder",
  });
// 3c / 3d — track folds. SPELLING folds ride the existing rails so the variant title yields
// exactly one media row + one read key: TRACK_MERGE renames the variant slug to the canonical
// spelling, TRACK_FOLD pins the display spelling. (When slug(from)===slug(to) the prescan already
// grouped them; TRACK_FOLD alone forces the winner. TRACK_MERGE is a harmless no-op there.)
// VARIANT folds stay DISTINCT rows — kept OUT of TRACK_MERGE/TRACK_FOLD — and emit a
// ROTATION_VARIANT_OF link instead. Slug compare per fold. See LEDGER_DESIGN.md §3c/§3d.
for (const [canonName, block] of Object.entries(FOLDS)) {
  for (const f of ((block && block.tracks) || [])) {
    if (!f || !f.from || !f.to) continue;
    if (f.type === "spelling") {
      TRACK_MERGE[slug(canonName) + "~" + slug(f.from)] = f.to;   // rename to canonical spelling
      TRACK_FOLD.set(canonName + "\x00" + slug(f.to), f.to);      // pin the display spelling
    } else if (f.type === "variant") {
      const aSlug = slug(canonName);
      const vk = aSlug + "~" + slug(f.from);
      if (slug(f.from) !== slug(f.to)) VARIANT_OF[vk] = aSlug + "~" + slug(f.to);
    }
  }
}
const foldTrack = (artist, track) => {
  if (!track) return track;
  const merged = TRACK_MERGE[slug(artist) + "~" + slug(track)];
  if (merged) track = merged;
  return TRACK_FOLD.get(artist + "\x00" + slug(track)) || track;
};

const artistPlays = new Map();           // name → count
const albumPlays = new Map();            // artist\x00album → count
const trackPlays = new Map();            // artist\x00track → count
const trackAlbumCount = new Map();       // artist\x00track → Map(artist\x00album → count) — dominant album per track
const albumTracks = new Map();           // artist\x00album → Set(track titles) — distinct tracks → release-type kind
const albumSpan = new Map();             // artist\x00album → [firstYear, lastYear]
const trackYear = new Map();             // artist\x00track → Map(year → count) — for per-year ranking
const albumYear = new Map();             // artist\x00album → Map(year → count)
const artistYear = new Map();            // name → Map(year → count)
const yearTotals = new Map();            // year → count
const dayCounts = new Map();             // yyyy-mm-dd → count
const dayTopArtist = new Map();          // yyyy-mm-dd → Map(artist → count)
const firstSeen = new Map();             // name → ms of first scrobble
const clockGrid = Array.from({ length: 7 }, () => new Array(24).fill(0));
const scrobbles = [];                    // [artist, album, track, ms] newest-first (CSV order)
const undatedArtists = [];

for (const line of lines) {
  const [rawArtist, rawAlbum, rawTrack, ts] = parseLine(line);
  if (!rawArtist) continue;
  if (NON_ARTISTS.has(rawArtist)) continue;   // scrobble noise, dropped at ingest (see the set)
  if (isExcluded(rawArtist)) continue;        // folds.json _exclude: curated noise names, dropped whole
  let artist = canon(rawArtist);   // merge scrobble-name variants (album hygiene done in the CSV)
  let track = foldTrack(artist, rawTrack);   // "Don’t stay" → "Don't Stay" (most-played spelling)
  // _moves: per-track artist reassignment (folds.json §_moves). A single (artist,track) pair is
  // retargeted to another artist BEFORE any map is keyed, so plays/media/reads follow the move.
  // Re-run foldTrack under the NEW artist so any track fold scoped to the target also applies.
  const _mv = track ? MOVES.get(slug(artist) + "~" + slug(track)) : null;
  if (_mv) { artist = _mv[0]; track = foldTrack(artist, _mv[1]); }
  // collapse edition variants onto the base title BEFORE any album map is keyed,
  // then fold spelling variants ("Liebe Ist Fur Alle Da" → "Liebe ist für alle da")
  const albumStripped = canonAlbum(rawAlbum, artist);
  const album = foldAlbum(artist, albumStripped);
  if (album && rawAlbum !== album && slug(rawAlbum) !== slug(album)) {
    const aSlug = slug(artist);
    ALBUM_ALIAS[aSlug + "~" + slug(rawAlbum)] = aSlug + "~" + slug(album);
  }
  if (album && rawAlbum !== albumStripped) {
    // an EDITION suffix was stripped — remember it + which track the variant carried.
    // (pure spelling folds are NOT variants: they count as base scrobbles below)
    const ak = artist + "\x00" + album;
    const suf = variantSuffix(rawAlbum, albumStripped);
    if (suf) _addTo(_albVarNames, ak, suf);
    if (track) _addTo(_albVarTracks, ak, track);
    if (suf && track) _bumpEd(ak, suf, track);   // remember which edition carried this track (with plays)
  } else if (album && track) {
    // base-title scrobble (nothing stripped) — records that this track lives on the base album
    _addTo(_albBaseTracks, artist + "\x00" + album, track);
  }
  artistPlays.set(artist, (artistPlays.get(artist) || 0) + 1);
  if (album) albumPlays.set(artist + "\x00" + album, (albumPlays.get(artist + "\x00" + album) || 0) + 1);
  if (track) trackPlays.set(artist + "\x00" + track, (trackPlays.get(artist + "\x00" + track) || 0) + 1);
  if (track && album) { const tk = artist + "\x00" + track, ak = artist + "\x00" + album; let m = trackAlbumCount.get(tk); if (!m) { m = new Map(); trackAlbumCount.set(tk, m); } m.set(ak, (m.get(ak) || 0) + 1); let s = albumTracks.get(ak); if (!s) { s = new Set(); albumTracks.set(ak, s); } s.add(track); }

  const d = parseDate(ts);
  if (!d || d.getTime() < 31536e6) { undatedArtists.push(artist); continue; } // 1970 = lost timestamp
  const ms = d.getTime();
  scrobbles.push([artist, album, track, ms]);

  const y = d.getUTCFullYear();
  if (album) { const ak = artist + "\x00" + album; const sp = albumSpan.get(ak); if (!sp) albumSpan.set(ak, [y, y]); else { if (y < sp[0]) sp[0] = y; if (y > sp[1]) sp[1] = y; } let m = albumYear.get(ak); if (!m) { m = new Map(); albumYear.set(ak, m); } m.set(y, (m.get(y) || 0) + 1); }
  if (track) { const tk = artist + "\x00" + track; let m = trackYear.get(tk); if (!m) { m = new Map(); trackYear.set(tk, m); } m.set(y, (m.get(y) || 0) + 1); }
  yearTotals.set(y, (yearTotals.get(y) || 0) + 1);
  if (!artistYear.has(artist)) artistYear.set(artist, new Map());
  artistYear.get(artist).set(y, (artistYear.get(artist).get(y) || 0) + 1);

  const key = d.toISOString().slice(0, 10);
  dayCounts.set(key, (dayCounts.get(key) || 0) + 1);
  if (!dayTopArtist.has(key)) dayTopArtist.set(key, new Map());
  dayTopArtist.get(key).set(artist, (dayTopArtist.get(key).get(artist) || 0) + 1);

  clockGrid[(d.getUTCDay() + 6) % 7][d.getUTCHours()]++;

  if (!firstSeen.has(artist) || ms < firstSeen.get(artist)) firstSeen.set(artist, ms);
}

scrobbles.sort((a, b) => b[3] - a[3]);
const newestMs = scrobbles[0][3];
const oldestMs = scrobbles[scrobbles.length - 1][3];
const undated = undatedArtists.length;

// remap undated scrobbles across the pre-scrobbling era (year-level stats only)
undatedArtists.forEach((artist, i) => {
  const ms = oldestMs - ((i + 1) / undated) * (oldestMs - UNDATED_REMAP_START);
  const y = new Date(ms).getUTCFullYear();
  yearTotals.set(y, (yearTotals.get(y) || 0) + 1);
  if (!artistYear.has(artist)) artistYear.set(artist, new Map());
  artistYear.get(artist).set(y, (artistYear.get(artist).get(y) || 0) + 1);
  if (!firstSeen.has(artist) || ms < firstSeen.get(artist)) firstSeen.set(artist, ms);
});

const years = [...yearTotals.keys()].sort((a, b) => a - b);
const ERA_START = years[0], ERA_END = years[years.length - 1];

// Per-track first/last play ms (dated scrobbles only) — used by the Liked-songs sidecar to
// bucket each saved track by when it entered the rotation and how long it stuck. Keyed the same
// as trackPlays (canon artist \x00 folded track). Cheap single pass over the already-built,
// already-sorted scrobble list; nothing else consumes it, so it lives next to the join below.
const trackFirstMs = new Map();          // artist\x00track → ms of earliest dated play
const trackLastMs = new Map();           // artist\x00track → ms of latest dated play
for (const [artist, , track, ms] of scrobbles) {
  if (!track) continue;
  const k = artist + "\x00" + track;
  const f = trackFirstMs.get(k); if (f === undefined || ms < f) trackFirstMs.set(k, ms);
  const l = trackLastMs.get(k); if (l === undefined || ms > l) trackLastMs.set(k, ms);
}

// ─────────── ARTISTS ───────────
const rankedArtists = [...artistPlays.entries()].sort((a, b) => b[1] - a[1]);

// union: global top N + every artist in any year's top 10
const include = new Set(rankedArtists.slice(0, TOP_ARTISTS).map(r => r[0]));
const erasRaw = years.map(year => {
  const top = rankedArtists
    .map(([name]) => ({ name, plays: (artistYear.get(name) || new Map()).get(year) || 0 }))
    .filter(x => x.plays > 0).sort((a, b) => b.plays - a.plays).slice(0, 10);
  top.forEach(x => include.add(x.name));
  return { year, top };
});

// seen-live inclusion: any artist you've attended a gig for gets a full artist entry
// (and thus the seen-live badge), regardless of play count — so niche live acts you
// rarely stream (e.g. Maximum the Hormone, 44 plays) aren't dropped by the TOP_ARTISTS
// cutoff. Only rescues artists with >=1 scrobble; pure gig-only acts stay gig-map-only.
{
  const _rankSlug = new Map(rankedArtists.map(([n]) => [slug(n), n]));
  const _gigNames = [];
  try { const j = JSON.parse(fs.readFileSync(path.join(__dirname, "gigs.json"), "utf8")); for (const g of (j.gigs || [])) _gigNames.push(g.artist); } catch (e) {}
  try { const j = JSON.parse(fs.readFileSync(path.join(__dirname, "gigs-manual.json"), "utf8")); for (const g of (j.add || [])) _gigNames.push(g.artist); } catch (e) {}
  let _added = 0;
  for (const gn of _gigNames) { const n = _rankSlug.get(slug(gn)); if (n && !include.has(n)) { include.add(n); _added++; } }
  console.log(`seen-live inclusion: +${_added} sub-threshold gig artists into the artist set`);
}

// Per-artist top tracks + albums computed from the FULL trackPlays/albumPlays maps,
// not from the globally-capped TRACKS (top 24) / ALBUMS (top 472). Previously ArtistView
// filtered globals and an artist like Midori showed zero tracks even though they're scrobbled.
const TRACKS_PER_ARTIST = 15;
const ALBUMS_PER_ARTIST_VIEW = 40;   // artist page lists them all in a compact scrolling column
const _tBy = new Map(), _aBy = new Map();
for (const [k, plays] of trackPlays) {
  const ix = k.indexOf("\x00"); if (ix < 0) continue;
  const artist = k.slice(0, ix), title = k.slice(ix + 1);
  if (!include.has(artist)) continue;
  if (!_tBy.has(artist)) _tBy.set(artist, []);
  _tBy.get(artist).push({ title, plays });
}
for (const [k, plays] of albumPlays) {
  const ix = k.indexOf("\x00"); if (ix < 0) continue;
  const artist = k.slice(0, ix), title = k.slice(ix + 1);
  if (!include.has(artist)) continue;
  if (!_aBy.has(artist)) _aBy.set(artist, []);
  _aBy.get(artist).push({ title, plays });
}
for (const m of _tBy.values()) m.sort((a, b) => b.plays - a.plays);
for (const m of _aBy.values()) m.sort((a, b) => b.plays - a.plays);

// release-type per (canonical) album — the "tighter system" (2026-08-17):
//   1. name-pattern overrides → comp/live/ost (unchanged)
//   2. MusicBrainz release-group type (mb-releases.json), joined by the SAME squash key the UI uses
//      (decEnt + lowercase-alnum), with a leading-"The " fallback so "Burning Red" hits MB's
//      "theburningred". This is the authoritative source — but see the COLLISION guard below.
//   3. track-count fallback when MB has nothing: 1 distinct track → single, 2–6 → ep, ≥7 → album.
//
// WHY THE OLD RESULT WAS WRONG (Mutter/Toxicity/Hypnotize/Black Label): the shipped mb-kinds.js was
// generated by an exact-squash join to MB that took last-write-wins. MB carries BOTH a studio-album
// release-group AND a same-named CD-SINGLE release-group ("Mutter" single 2002, "Toxicity" single,
// "Hypnotize" single) whose squash keys COLLIDE (mutter/toxicity/hypnotize) — so the single clobbered
// the album and every LP read as "single". The fix: resolve collisions by RANK (album > ep > single)
// AND cross-check the corpus — if MB says single/ep but the tracklist we actually scrobbled has ≥7
// distinct tracks, the corpus wins (it's the full LP, not the CD single). Black Label was mislabelled
// "ep" the same way; its 10-track corpus tracklist promotes it to album.
const _kNameComp = /\b(greatest hits|best of|anthology|collection|singles)\b/i;
const _kNameLive = /\blive\b|\blive at\b|unplugged/i;
const _kNameOst = /\b(ost|original soundtrack|soundtrack)\b/i;
const _EMPTY_SET = new Set();
// squash key = the UI's matchKey (decEnt not needed here — titles are already decoded): lowercase alnum
const _kSquash = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
const _kStripThe = (s) => _kSquash(String(s || "").replace(/^the\s+/i, ""));
const _kRank = { album: 3, ep: 2, single: 1 };
// build artistSlug → Map(squashKey → "album"/"ep"/"single") from MB release groups, collision-aware.
const MB_KIND = (() => {
  const out = new Map();
  let raw; try { raw = JSON.parse(fs.readFileSync(path.join(__dirname, "mb-releases.json"), "utf8")); }
  catch (e) { console.log("albumKind: mb-releases.json missing — track-count fallback only"); return out; }
  for (const [aSlug, e] of Object.entries(raw)) {
    if (!e || !e.rg) continue;
    const m = new Map();
    for (const [rgKey, rg] of Object.entries(e.rg)) {
      const k = (rg && rg.k || "").toLowerCase();
      const kind = k === "album" ? "album" : k === "ep" ? "ep" : k === "single" ? "single" : null;
      if (!kind) continue;   // ignore Broadcast/Compilation/Other RG types — name patterns handle those
      // collision: keep the highest-rank type for a given squash (album beats a same-named CD single)
      const cur = m.get(rgKey);
      if (!cur || _kRank[kind] > _kRank[cur]) m.set(rgKey, kind);
    }
    out.set(aSlug, m);
  }
  return out;
})();
// MB kind for (artistSlug, title): direct squash, then leading-"The " stripped, both directions.
function _mbKindOf(aSlug, title) {
  const m = MB_KIND.get(aSlug); if (!m) return null;
  const k = _kSquash(title);
  if (m.has(k)) return m.get(k);
  const kt = _kStripThe(title);
  if (kt !== k && m.has(kt)) return m.get(kt);
  // corpus title lacks "the" but MB keyed it with "the" (e.g. Burning Red ↔ theburningred)
  const kThe = "the" + k;
  if (m.has(kThe)) return m.get(kThe);
  return null;
}
function albumKind(artist, title) {
  if (_kNameComp.test(title)) return "comp";
  if (_kNameLive.test(title)) return "live";
  if (_kNameOst.test(title)) return "ost";
  const n = (albumTracks.get(artist + "\x00" + title) || _EMPTY_SET).size;
  const mb = _mbKindOf(slug(artist), title);
  if (mb) {
    // trust MB, EXCEPT when it says single/ep but our own tracklist proves a full LP (collision case)
    if ((mb === "single" || mb === "ep") && n >= 7) return "album";
    if (mb === "single" && n >= 2 && n <= 6) return "ep";   // MB single but we have an EP's worth
    return mb;
  }
  // fallback — corpus distinct-track count (owner spec: 1→single, 2–6→ep, ≥7→album)
  if (n <= 1) return "single";
  if (n <= 6) return "ep";
  return "album";
}

// index of the albums each artist owns, so we can resolve a single onto its host LP/EP.
// artist → [{ title, kind, plays }] (kind album/ep only — where a real tracklist lives).
const _hostAlbumsBy = new Map();
{
  for (const [k, plays] of albumPlays) {
    const ix = k.indexOf("\x00"); if (ix < 0) continue;
    const artist = k.slice(0, ix), title = k.slice(ix + 1);
    const kind = albumKind(artist, title);
    if (kind !== "album" && kind !== "ep") continue;
    if (!_hostAlbumsBy.has(artist)) _hostAlbumsBy.set(artist, []);
    _hostAlbumsBy.get(artist).push({ title, kind, plays });
  }
}
// For a kind=single titled `single`, find the most-played album/ep of the same artist whose
// tracklist contains a track named like the single. Exact title match first; normalized
// match (casefold, feat/with parentheticals, edit-suffixes) as the fallback — the strict
// rule alone missed ~145 real hosts (CALI SUN vs Cali Sun, Afterimage (feat. Ian Kenny)).
// Returns the host row or null; `excludeTitle` skips the single release itself.
const _normCache = new Map();
function _normTitle(s) {
  let v = _normCache.get(s);
  if (v == null) {
    v = s.toLowerCase()
      .replace(/\s*[\(\[][^\)\]]*(feat\.?|ft\.?|with |w\/)[^\)\]]*[\)\]]\s*/gi, " ")
      .replace(/\s*-\s*(single|radio edit|album version|remaster(ed)?( \d{4})?)$/i, "")
      .replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    _normCache.set(s, v);
  }
  return v;
}
function singleHost(artist, song, excludeTitle) {
  const hosts = _hostAlbumsBy.get(artist);
  if (!hosts) return null;
  const ns = _normTitle(song);
  let best = null;
  for (const h of hosts) {
    if (h.title === excludeTitle) continue;   // don't point a single at an LP of the same name
    const tracks = albumTracks.get(artist + "\x00" + h.title);
    if (!tracks) continue;
    let hit = tracks.has(song);
    if (!hit) for (const t of tracks) if (_normTitle(t) === ns) { hit = true; break; }
    if (hit && (!best || h.plays > best.plays)) best = h;
  }
  return best;
}
function singleHostSlug(artist, single) {
  const best = singleHost(artist, single, single);
  return best ? slug(best.title) : "";
}

// measured Sound DNA from the Spotify audio-features dump (built by extract-audio.js); falls back to
// inferred tag-derived DNA where an artist didn't match (~98% are measured).
const AUDIO = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, "audio-features.json"), "utf8")); } catch (e) { return {}; } })();
// Colour contract (DESIGN.md §1.2, enforced 2026-08-13): artist hue = the assigned family's
// anchor hue ± a deterministic ≤10° per-artist jitter (variety inside the family band, still
// reads as the family everywhere). Untagged/Other artists keep the legacy sources (curated
// META hue, else name-hash) — they never claimed a family colour.
const famAnchorHue = (name, metaHue) => {
  const fi = familyIdxByName(name);
  if (fi >= 0 && FAMILIES[fi] && !FAMILIES[fi].grey)
    return (FAMILIES[fi].hue + (hueOf(name) % 21) - 10 + 360) % 360;
  return metaHue !== undefined ? metaHue : hueOf(name);
};
const ARTISTS = rankedArtists.filter(([name]) => include.has(name)).map(([name, plays], i) => {
  const meta = META[name] || {};
  const yc = artistYear.get(name) || new Map();
  const counts = years.map(y => yc.get(y) || 0);
  const max = Math.max(...counts, 1);
  return {
    id: slug(name), rank: i + 1, name, plays,
    hue: famAnchorHue(name, meta.hue),
    tags: meta.tags || niceTags(name),
    // SOURCE-FAITHFUL last.fm tags (2026-08-28, owner-reported): niceTags drops GENERIC
    // umbrellas, so the artist page's "last.fm" rail showed the residue — the Stones rail
    // read "blues" while last.fm itself leads with classic rock. tagsLf carries the cache's
    // real top-4 (junk already filtered at fetch) so the rail can quote the source honestly;
    // `tags` keeps its filtered form for nav chips and everything downstream.
    ...(() => { const raw = cachedTags(name).map(t => t[0]).slice(0, 4); return raw.length ? { tagsLf: raw } : {}; })(),
    // similar: prefer REAL last.fm similar-artists when we have them, else fall back to curated META
    ...(() => {
      const real = realSimilar(name);
      const names = (real && real.length > 0) ? real.slice(0, 8) : (meta.similar || []);
      return { similar: names.map(slug), similarNames: names };
    })(),
    bio: bioOf(name) || dgProfileOf(name),  // last.fm bio, else Discogs profile (covers underground)
    image: imageOf(name),
    thumb: thumbOf(name),
    topTracks: (_tBy.get(name) || []).slice(0, TRACKS_PER_ARTIST),
    topAlbums: (_aBy.get(name) || []).slice(0, ALBUMS_PER_ARTIST_VIEW).map(a => { const kind = albumKind(name, a.title); const rec = { ...a, cover: albArt(name, a.title), kind }; if (kind === "single") { const on = singleHostSlug(name, a.title); if (on) rec.on = on; } return rec; }),
    spotGenres: (aliasedByName(SPOTGEN, name) || []).slice(0, 8),   // Spotify's own genre tags
    audio: AUDIO[name]
      ? { energy: AUDIO[name].energy, valence: AUDIO[name].valence, acoustic: AUDIO[name].acoustic, tempo: AUDIO[name].tempo, dance: AUDIO[name].dance, instr: AUDIO[name].instr }
      : meta.audio
        ? { energy: meta.audio[0], valence: meta.audio[1], acoustic: meta.audio[2], tempo: meta.audio[3], dance: meta.audio[4], instr: meta.audio[5] }
        : tagAudio(cachedTags(name)),
    am: AUDIO[name] ? 1 : 0,   // 1 = measured DNA (Spotify), 0 = inferred from tags
    era: counts.map(c => c === 0 ? 0 : Math.max(1, Math.round(9 * c / max))),
    // raw per-year plays (sparse) + primary family index — powers the Explore ranking filter
    yp: Object.fromEntries(years.map(y => [y, yc.get(y) || 0]).filter(e => e[1] > 0)),
    fam: familyIdxByName(name),
    fm: familyMembersByName(name),   // family MEMBERSHIP set (1–3, dominant first) — filter surfaces test fm, not sub-derived
    firstYear: new Date(firstSeen.get(name)).getUTCFullYear(),
    debut: debutOf(name),
    members: [...new Set([...membersOf(name), ...dgMembersOf(name)])].slice(0, 10), // MB + Discogs members

    listeners: listenersOf(name),
    styles: stylesOf(name),
    discogsGenres: dGenresOf(name),
    origin: originOf(name),
    country: meta.country || (originOf(name) ? originOf(name).country.toLowerCase() : ""),
    gender: genderOf(name),     // "Male"/"Female"/"Other"/"" — solo artists only
    ...(() => { let vx = vocalsCodeBySlug(slug(name)); if (vx === undefined) vx = membersVoxCode(name); return vx === undefined ? {} : { vx }; })(),  // vocals code (m/f/n, ""=instrumental; MB-lineup fallback); absent = no data
    life: lifeOf(name),         // { type, ended, end } → active/disbanded/deceased badge
    wd: wdOf(name),             // Wikidata slice: formation city+coords, dissolved, lineup+gender
  };
});
const byName = Object.fromEntries(ARTISTS.map(a => [a.name, a]));
const hueFor = (name) => byName[name] ? byName[name].hue : famAnchorHue(name, undefined);

// ─────────── ALBUMS (global top + top per included artist) ───────────
const rankedAlbums = [...albumPlays.entries()].sort((a, b) => b[1] - a[1]);
const albumKeys = new Set(rankedAlbums.slice(0, TOP_ALBUMS).map(r => r[0]));
const perArtistCount = new Map();
for (const [key] of rankedAlbums) {
  const artist = key.split("\x00")[0];
  if (!byName[artist]) continue;
  const n = perArtistCount.get(artist) || 0;
  if (n < ALBUMS_PER_ARTIST) { albumKeys.add(key); perArtistCount.set(artist, n + 1); }
}
const ALBUMS = rankedAlbums.filter(([key]) => albumKeys.has(key)).map(([key, plays], i) => {
  const [artist, title] = key.split("\x00");
  // fam: prefer the album's OWN dominant family (from per-album evidence, gated ≥50% share); fall
  // back to the artist family when the album has no confident evidence. afam:1 flags album-derived
  // so views can distinguish an album that broke from its artist's family.
  const albFam = familyIdxByAlbum(artist, title);
  const rec = { id: "al" + i, artistId: slug(artist), artist, title, year: null, plays, hue: hueFor(artist), kind: albumKind(artist, title), fam: albFam >= 0 ? albFam : familyIdxByName(artist) };
  if (albFam >= 0) rec.afam = 1;
  return rec;
});

// ─────────── mb-kinds.js (regenerated) ───────────
// The artist page (rotation-views2 kindOf) overrides al.kind with ROTATION_MB_KINDS[artistId][squash].
// The old file was a STALE exact-MB join (single-vs-album collisions → Mutter/Toxicity read "single").
// Regenerate it here from the SAME reconciled albumKind() every other view uses, keyed by the UI's
// matchKey squash, so the artist page and the shelves taxonomy can never disagree again. We emit the
// kind for every canonical album title each included artist owns (their full per-artist album list).
{
  const KINDS = {};
  for (const [k] of albumPlays) {
    const ix = k.indexOf("\x00"); if (ix < 0) continue;
    const artist = k.slice(0, ix), title = k.slice(ix + 1);
    if (!byName[artist]) continue;
    const aid = slug(artist), sq = _kSquash(title);
    if (!sq) continue;
    (KINDS[aid] || (KINDS[aid] = {}))[sq] = albumKind(artist, title);
  }
  fs.writeFileSync(path.join(__dirname, "mb-kinds.js"),
    "// GENERATED by build-data.js — reconciled release-group kinds (MB release-group ∪ track-count\n" +
    "// fallback, single-vs-album collisions resolved). Keyed artistSlug → matchKey(title) → kind.\n" +
    "// Overrides the shipped al.kind in the artist view (rotation-views2 kindOf).\n" +
    "window.ROTATION_MB_KINDS = " + JSON.stringify(KINDS) + ";\n", "utf8");
  console.log(`mb-kinds.js: ${Object.keys(KINDS).length} artists, reconciled kinds emitted`);
}

// ─────────── TRACKS ───────────
const TRACKS = [...trackPlays.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP_TRACKS)
  .map(([key, plays], i) => {
    const [artist, title] = key.split("\x00");
    return { id: "tr" + i, rank: i + 1, artistId: slug(artist), artist, title, plays, hue: hueFor(artist) };
  });

// ─────────── CLOCK / ERAS ───────────
const CLOCK = { days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], grid: clockGrid };
const ERAS = erasRaw.map(({ year, top }) => ({
  year, total: yearTotals.get(year),
  top: top.map(x => ({ id: slug(x.name), name: x.name, hue: hueFor(x.name), plays: x.plays })),
}));

// ─────────── YEARS (per-year deep aggregates for Year-in-Review) ───────────
// Second pass over dated scrobbles; only counts the real ones (undated/1970 excluded).
const _yTracks = new Map(), _yAlbums = new Map(), _yArtistsSet = new Map();
for (const [artist, album, track, ms] of scrobbles) {
  const y = new Date(ms).getUTCFullYear();
  if (!_yTracks.has(y)) { _yTracks.set(y, new Map()); _yAlbums.set(y, new Map()); _yArtistsSet.set(y, new Set()); }
  if (track) { const k = artist + "\x00" + track; const m = _yTracks.get(y); m.set(k, (m.get(k) || 0) + 1); }
  if (album) { const k = artist + "\x00" + album; const m = _yAlbums.get(y); m.set(k, (m.get(k) || 0) + 1); }
  _yArtistsSet.get(y).add(artist);
}
function _topEntry(map) {
  let bestK = null, bestV = 0;
  for (const [k, v] of map) if (v > bestV) { bestV = v; bestK = k; }
  return bestK ? [bestK, bestV] : null;
}
// top-N items from a "artist\x00title" → plays map, for per-year Explore ranking
function _topItems(map, n) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, p]) => {
    const ix = k.indexOf("\x00"); const a = k.slice(0, ix), title = k.slice(ix + 1);
    return { artist: a, title, plays: p, hue: hueFor(a), artistId: slug(a) };
  });
}
const YEARS = years.filter(y => _yTracks.has(y)).map(year => {
  const tt = _topEntry(_yTracks.get(year));
  const ta = _topEntry(_yAlbums.get(year));
  // top artist that year
  const ranked = [...(artistYear.entries())]
    .map(([n, m]) => [n, m.get(year) || 0]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]);
  const topArt = ranked[0] || [null, 0];
  // peak day in this year
  let peakDate = null, peakPlays = 0, activeDays = 0;
  for (const [date, n] of dayCounts) {
    if (date.slice(0, 4) !== String(year)) continue;
    activeDays++;
    if (n > peakPlays) { peakPlays = n; peakDate = date; }
  }
  // discoveries: artists whose firstSeen falls in this year, ranked by their plays this year
  const disc = [];
  for (const [n, ms] of firstSeen) {
    if (new Date(ms).getUTCFullYear() !== year) continue;
    const p = (artistYear.get(n) || new Map()).get(year) || 0;
    if (p > 0) disc.push({ name: n, plays: p, hue: hueFor(n) });
  }
  disc.sort((a, b) => b.plays - a.plays);
  // biggest YoY gainer: artists with the largest +Δ vs prior year (require ≥ 30 plays this year)
  let gainer = null;
  for (const [n, m] of artistYear) {
    const cur = m.get(year) || 0;
    const prev = m.get(year - 1) || 0;
    if (cur < 30) continue;
    const delta = cur - prev;
    if (!gainer || delta > gainer.delta) gainer = { name: n, plays: cur, prev, delta, hue: hueFor(n) };
  }
  return {
    year,
    plays: yearTotals.get(year),
    artists: _yArtistsSet.get(year).size,
    distinctTracks: _yTracks.get(year).size,   // NB: `tracks` below is the per-year ranking ARRAY (they used to collide → "[object Object]" in YiR)
    hours: Math.round(yearTotals.get(year) * 3.5 / 60),
    activeDays,
    peakDay: peakDate ? { date: peakDate, plays: peakPlays } : null,
    topTrack: tt ? (() => { const [a, t] = tt[0].split("\x00"); return { artist: a, title: t, plays: tt[1], hue: hueFor(a) }; })() : null,
    topAlbum: ta ? (() => { const [a, t] = ta[0].split("\x00"); return { artist: a, title: t, plays: ta[1], hue: hueFor(a) }; })() : null,
    topArtist: topArt[0] ? { name: topArt[0], plays: topArt[1], hue: hueFor(topArt[0]) } : null,
    discoveries: disc.slice(0, 3),
    gainer,
    // per-year ranking lists for the Explore "Ranking" tab when a single year is selected
    albums: _topItems(_yAlbums.get(year), 18),
    tracks: _topItems(_yTracks.get(year), 18),
  };
});

// ─────────── CLOCK BY YEAR for the Explore "Rhythm" tab ───────────
// CLOCK_BY_YEAR[y] = real per-year hour-grid (all plays, including untagged artists).
// Grids are FLAT length-168 arrays: cell = ((day+6)%7)*24 + hour. The client inflates to 7×24.
const CLOCK_BY_YEAR = {};
for (const [, , , ms] of scrobbles) {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const cell = ((d.getUTCDay() + 6) % 7) * 24 + d.getUTCHours();
  if (!CLOCK_BY_YEAR[y]) CLOCK_BY_YEAR[y] = new Array(168).fill(0);
  CLOCK_BY_YEAR[y][cell]++;
}

// ARTIST_CLOCK — per kept artist, sparse [[cell, count]] hour-grid (cell = ((day+6)%7)*24+hour).
// Powers time-of-day / day-of-week filtering of the ranking: select clock cells → re-rank artists
// by plays inside those slots. Sparse keeps it compact (only the cells an artist actually played).
const ARTIST_CLOCK = {};
{
  const acc = new Map();
  for (const [artist, , , ms] of scrobbles) {
    const a = byName[artist];
    if (!a) continue;
    const d = new Date(ms);
    const cell = ((d.getUTCDay() + 6) % 7) * 24 + d.getUTCHours();
    if (!acc.has(a.id)) acc.set(a.id, new Map());
    const m = acc.get(a.id); m.set(cell, (m.get(cell) || 0) + 1);
  }
  for (const [id, m] of acc) ARTIST_CLOCK[id] = [...m.entries()].sort((x, y) => x[0] - y[0]);
}

// ─────────── TOTALS ───────────
const dayKeys = [...dayCounts.keys()].sort();
let topDayKey = dayKeys[0];
for (const k of dayKeys) if (dayCounts.get(k) > dayCounts.get(topDayKey)) topDayKey = k;
const topDayArtist = [...dayTopArtist.get(topDayKey).entries()].sort((a, b) => b[1] - a[1])[0];

let best = 0, cur = 0, prev = null, bestEnd = null;
const daySet = new Set(dayKeys);
for (const k of dayKeys) {
  if (prev && (new Date(k) - new Date(prev)) === 86400e3) cur++; else cur = 1;
  if (cur > best) { best = cur; bestEnd = k; }
  prev = k;
}
const bestStart = new Date(new Date(bestEnd).getTime() - (best - 1) * 86400e3).toISOString().slice(0, 10);
let current = 0;
for (let d = new Date(newestMs); ; d = new Date(d.getTime() - 86400e3)) {
  if (daySet.has(d.toISOString().slice(0, 10))) current++; else break;
}

const yearAgo = newestMs - 365 * 86400e3;
let newPlays = 0, windowPlays = 0;
for (const [artist, , , ms] of scrobbles) {
  if (ms < yearAgo) break;
  windowPlays++;
  if (firstSeen.get(artist) >= yearAgo) newPlays++;
}

const totalScrobbles = lines.length;
const spanDays = Math.round((newestMs - oldestMs) / 86400e3);

// exact listening hours + explicit share from real Spotify durations (play-weighted; covered plays are
// exact, the uncovered remainder is filled at the measured average track length so the total stays honest).
// Same pass builds a play-weighted distribution of each audio axis across your library → AUDIO_DIST, so
// a track/album page can say "more intense than 78% of your plays" without loading the per-track file.
const DIST_AXES = [["energy", 4], ["valence", 5], ["dance", 8], ["acoustic", 6], ["instr", 9], ["tempo", 7]];
const _hist = DIST_AXES.map(() => new Float64Array(101));
let _distTotal = 0;
let _secCov = 0, _playsCov = 0, _totPlays = 0, _explPlays = 0, _explCov = 0;
for (const [key, plays] of trackPlays) {
  _totPlays += plays;
  const ix = key.indexOf("\x00"); const td = aliasedBySlugAlbum(TRACKDATA, slug(key.slice(0, ix)), slug(key.slice(ix + 1)));
  if (!td) continue;
  if (td[0]) { _secCov += td[0] * plays; _playsCov += plays; }
  if (td.length >= 3) { _explCov += plays; if (td[2]) _explPlays += plays; }
  if (td.length >= 10) { _distTotal += plays; for (let a = 0; a < DIST_AXES.length; a++) { const v = Math.max(0, Math.min(100, td[DIST_AXES[a][1]] | 0)); _hist[a][v] += plays; } }
}
const _avgSec = _playsCov ? _secCov / _playsCov : 216;
const exactHours = Math.round((_secCov + (_totPlays - _playsCov) * _avgSec) / 3600);
const explicitPct = _explCov ? Math.round(_explPlays / _explCov * 100) : 0;
// cumulative distribution per axis as permille (0..1000): AUDIO_DIST.cdf[axis][v] = share of plays ≤ v.
const AUDIO_DIST = { axes: DIST_AXES.map(a => a[0]), cdf: _hist.map(h => { const c = []; let run = 0; for (let v = 0; v <= 100; v++) { run += h[v]; c.push(_distTotal ? Math.round(run / _distTotal * 1000) : 0); } return c; }) };

// album-kind split for the Overview stats strip (Fuad 2026-08-12): LPs vs EPs/singles vs
// compilations, from the same albummeta the media rows carry. Post-fold rows, so the counts
// honor the coherency ledger. Rows with no kind metadata (~14k long-tail variants) are NOT
// binned as albums — the strip shows known-kind counts, the honest number.
const _albKinds = { a: 0, s: 0, c: 0, u: 0 };
for (const key of albumPlays.keys()) {
  const ix = key.indexOf("\x00");
  const m = albMeta(key.slice(0, ix), key.slice(ix + 1));
  const k = (m && m[1]) || "u";
  _albKinds[k] = (_albKinds[k] || 0) + 1;
}
const TOTALS = {
  scrobbles: totalScrobbles,
  artists: artistPlays.size,
  albums: albumPlays.size,
  albumsLP: _albKinds.a, epsSingles: _albKinds.s, comps: _albKinds.c,
  tracks: trackPlays.size,
  since: new Date(undated ? UNDATED_REMAP_START : oldestMs).toISOString().slice(0, 10),
  // TRUE dated-corpus start (the real first DATED scrobble), regardless of the undated remap that
  // pushes `since` back to UNDATED_REMAP_START. The EXPLORE recs' `fd` is days-since-oldestMs, so the
  // "discovered" label converter (FDY) must anchor on THIS, not `since` — else every year shifts down
  // by the (oldestMs − UNDATED_REMAP_START) gap (~4 yrs) and 2026 reads as 2022.
  fdAnchor: new Date(oldestMs).toISOString().slice(0, 10),
  perDay: Math.round(totalScrobbles / spanDays * 10) / 10,
  topDay: {
    date: topDayKey, count: dayCounts.get(topDayKey),
    note: `Mostly ${topDayArtist[0]} — ${topDayArtist[1]} plays in one day.`,
  },
  streak: { current, best },
  listeningHours: exactHours || Math.round(totalScrobbles * 3.6 / 60),
  listeningHoursExact: _playsCov > 0,
  avgTrackSec: Math.round(_avgSec),
  explicitPct,
  discoveryRate: Math.round(newPlays / windowPlays * 100) / 100,
  undated,
};

// ─────────── TREND (last 26 weeks) ───────────
const TREND = new Array(26).fill(0);
for (const [, , , ms] of scrobbles) {
  const w = Math.floor((newestMs - ms) / (7 * 86400e3));
  if (w >= 26) break;
  TREND[25 - w]++;
}

// ─────────── NOW / RECENT ───────────
const fmtWhen = (ms) => {
  const d = new Date(ms);
  return d.getUTCDate() + " " + ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getUTCMonth()];
};
const NOW = { artistId: slug(scrobbles[0][0]), artist: scrobbles[0][0], track: scrobbles[0][2], album: scrobbles[0][1], nowplaying: false };
const RECENT = scrobbles.slice(0, 8).map((s, i) => ({
  id: "rc" + i, artistId: slug(s[0]), artist: s[0], track: s[2], when: fmtWhen(s[3]), hue: hueFor(s[0]),
}));

// ─────────── INSIGHTS ───────────
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
const asc = [...scrobbles].reverse(); // oldest-first, timestamped only

// milestones: every 50,000th timestamped scrobble
const MILESTONES = [];
for (let n = 50000; n <= asc.length; n += 50000) {
  const s = asc[n - 1];
  MILESTONES.push({ n, artist: s[0], track: s[2], date: iso(s[3]), hue: hueFor(s[0]) });
}

// obsessions: weeks dominated by a single artist (best week per artist)
const WEEK0 = Date.UTC(2006, 0, 2); // a Monday
const weeks = new Map();
for (const [artist, , , ms] of scrobbles) {
  const w = Math.floor((ms - WEEK0) / (7 * 86400e3));
  if (!weeks.has(w)) weeks.set(w, { total: 0, art: new Map() });
  const W = weeks.get(w); W.total++; W.art.set(artist, (W.art.get(artist) || 0) + 1);
}
const obsByArtist = new Map();
for (const [w, W] of weeks) {
  if (W.total < 70) continue;
  const [artist, plays] = [...W.art.entries()].sort((a, b) => b[1] - a[1])[0];
  const share = plays / W.total;
  if (share < 0.5) continue;
  const o = { weekStart: iso(WEEK0 + w * 7 * 86400e3), total: W.total, artist, plays, share: Math.round(share * 100) / 100, hue: hueFor(artist) };
  if (!obsByArtist.has(artist) || obsByArtist.get(artist).plays < plays) obsByArtist.set(artist, o);
}
const OBSESSIONS = [...obsByArtist.values()].sort((a, b) => b.plays - a.plays).slice(0, 10);

// album obsessions: weeks one ALBUM ate everything (the "Flip Phone Fantasy week")
const albumWeeks = new Map();
for (const [artist, album, , ms] of scrobbles) {
  if (!album) continue;
  const w = Math.floor((ms - WEEK0) / (7 * 86400e3));
  if (!albumWeeks.has(w)) albumWeeks.set(w, { total: 0, alb: new Map() });
  const W = albumWeeks.get(w); W.total++;
  const k = artist + "\x00" + album;
  W.alb.set(k, (W.alb.get(k) || 0) + 1);
}
const obsByAlbum = new Map();
for (const [w, W] of albumWeeks) {
  if (W.total < 70) continue;
  const [key, plays] = [...W.alb.entries()].sort((a, b) => b[1] - a[1])[0];
  const share = plays / W.total;
  if (share < 0.35) continue;
  const [artist, title] = key.split("\x00");
  const o = { weekStart: iso(WEEK0 + w * 7 * 86400e3), total: W.total, artist, album: title,
    plays, share: Math.round(share * 100) / 100, hue: hueFor(artist), artistId: slug(artist) };
  if (!obsByAlbum.has(key) || obsByAlbum.get(key).plays < plays) obsByAlbum.set(key, o);
}
const ALBUM_OBSESSIONS = [...obsByAlbum.values()].sort((a, b) => b.plays - a.plays).slice(0, 8);

// flameouts: tracks where 40%+ of lifetime plays happened in a single week — the songs
// that exploded then disappeared (opposite of LIFETIME_TRACKS).
const trackWeekCounts = new Map();
for (const [artist, , track, ms] of scrobbles) {
  if (!track) continue;
  const k = artist + "\x00" + track;
  const w = Math.floor((ms - WEEK0) / (7 * 86400e3));
  if (!trackWeekCounts.has(k)) trackWeekCounts.set(k, new Map());
  const m = trackWeekCounts.get(k);
  m.set(w, (m.get(w) || 0) + 1);
}
const FLAMEOUTS = [...trackPlays.entries()]
  .filter(([k, p]) => p >= 40 && trackWeekCounts.has(k))
  .map(([k, plays]) => {
    const [artist, title] = k.split("\x00");
    const m = trackWeekCounts.get(k);
    let peakW = null, peakP = 0;
    for (const [w, p] of m) if (p > peakP) { peakP = p; peakW = w; }
    return { artist, title, plays, peakPlays: peakP,
      peakShare: Math.round(peakP / plays * 1000) / 1000,
      peakWeek: iso(WEEK0 + peakW * 7 * 86400e3),
      hue: hueFor(artist), artistId: slug(artist), kept: !!byName[artist] };
  })
  // require ≥ 12 weeks past peak — otherwise we surface this-week's discoveries as "flameouts"
  // that simply haven't had time to be replayed yet (Ecca Vandal trap from 2026-05).
  .filter(t => t.peakShare >= 0.4 && (newestMs - new Date(t.peakWeek).getTime()) > 84 * 86400e3)
  .sort((a, b) => b.peakShare - a.peakShare || b.peakPlays - a.peakPlays)
  .slice(0, 10);

// lifetime tracks: songs played across the most distinct years (the constant companions
// that survived every era shift). yearSpan = how many calendar years this track was active.
const trackYears = new Map();
for (const [artist, , track, ms] of scrobbles) {
  if (!track) continue;
  const k = artist + "\x00" + track;
  const y = new Date(ms).getUTCFullYear();
  if (!trackYears.has(k)) trackYears.set(k, new Set());
  trackYears.get(k).add(y);
}
const LIFETIME_TRACKS = [...trackPlays.entries()]
  .filter(([k, p]) => p >= 50 && trackYears.has(k) && trackYears.get(k).size >= 7)
  .map(([k, plays]) => {
    const [artist, title] = k.split("\x00");
    const ys = [...trackYears.get(k)].sort((a, b) => a - b);
    return { artist, title, plays, yearSpan: ys.length,
      firstYr: ys[0], lastYr: ys[ys.length - 1],
      hue: hueFor(artist), artistId: slug(artist), kept: !!byName[artist] };
  })
  .sort((a, b) => b.yearSpan - a.yearSpan || b.plays - a.plays)
  .slice(0, 10);

// "Their era" — for each top artist, the single calendar MONTH where they owned the
// highest SHARE of your listening. Pairs with INCUBATION: incubation = how long until
// they peaked, this = the specific month that became them.
const monthPlays = new Map();
const monthByArtist = new Map();
for (const [artist, , , ms] of scrobbles) {
  const mk = new Date(ms).toISOString().slice(0, 7);
  monthPlays.set(mk, (monthPlays.get(mk) || 0) + 1);
  if (!monthByArtist.has(mk)) monthByArtist.set(mk, new Map());
  const m = monthByArtist.get(mk);
  m.set(artist, (m.get(artist) || 0) + 1);
}
const ARTIST_ERAS = ARTISTS.slice(0, 40)
  .map(a => {
    let peak = null;
    for (const [mk, total] of monthPlays) {
      if (total < 200) continue; // require a substantively-listened month
      const plays = (monthByArtist.get(mk).get(a.name)) || 0;
      if (plays < 40) continue;
      const share = plays / total;
      if (!peak || share > peak.share) peak = { month: mk, plays, total, share };
    }
    return peak ? {
      artist: a.name, hue: a.hue, artistId: a.id,
      month: peak.month, plays: peak.plays,
      total: peak.total, share: Math.round(peak.share * 1000) / 1000,
    } : null;
  })
  .filter(Boolean)
  .sort((a, b) => b.share - a.share)
  .slice(0, 10);

// incubation: for each top artist, the gap from first-play to peak-week.
// Reveals slow burners (Linkin Park ~4yr to peak) vs instant addictions (daine in days).
const peakWeekByArtist = new Map(); // artist → { weekIdx, plays }
for (const [w, W] of weeks) {
  for (const [artist, n] of W.art) {
    const cur = peakWeekByArtist.get(artist);
    if (!cur || n > cur.plays) peakWeekByArtist.set(artist, { weekIdx: w, plays: n });
  }
}
const INCUBATION = ARTISTS.slice(0, 20)
  .filter(a => peakWeekByArtist.has(a.name) && firstSeen.has(a.name))
  .map(a => {
    const fs = firstSeen.get(a.name);
    if (fs < UNDATED_REMAP_START + 86400e3) return null; // skip pre-scrobbling remapped
    const pk = peakWeekByArtist.get(a.name);
    const peakMs = WEEK0 + pk.weekIdx * 7 * 86400e3;
    const incubDays = Math.max(0, Math.round((peakMs - fs) / 86400e3));
    return {
      artist: a.name, hue: a.hue, plays: a.plays,
      firstHeard: iso(fs), peakWeek: iso(peakMs), peakPlays: pk.plays,
      incubDays, artistId: a.id,
    };
  })
  .filter(Boolean)
  .sort((a, b) => b.incubDays - a.incubDays);

// comebacks: big artists dropped for 18+ months, then 50+ plays after returning
const bigArtists = new Set([...artistPlays.entries()].filter(([, c]) => c >= 300).map(([n]) => n));
const times = new Map();
for (const s of asc) if (bigArtists.has(s[0])) {
  if (!times.has(s[0])) times.set(s[0], []);
  times.get(s[0]).push(s[3]);
}
// A comeback needs you to have been there in the FIRST place. This used to gate only on the size of
// the gap and the plays after it, which made "the largest gap between any two scrobbles" the whole
// definition — so a single stray early play manufactured a comeback narrative out of what was really
// a first discovery. Fuad caught it on Wargasm (2026-08-20): one play in 2011, 1,821 from 2020, sold
// as an eight-year return. That one play is almost certainly the 1980s US thrash band rather than the
// UK duo, who did not exist until 2018 — the artist-name collision this library has hit before.
//
// Five of the eight rows had the same defect (Wargasm 1 prior play, Devin Townsend 1, Lantlos 1,
// daine 2, Eville 3). The threshold is not finely tuned and does not need to be: the distribution is
// bimodal, jumping straight from 3 prior plays to 184, so anything in that chasm keeps the three
// genuine returns (Kyuss, TV on the Radio, Black River) and drops all five false ones.
const COMEBACK_MIN_BEFORE = 25;
const COMEBACKS = [];
for (const [artist, ts] of times) {
  let gi = 0, gap = 0;
  for (let i = 1; i < ts.length; i++) { const g = ts[i] - ts[i - 1]; if (g > gap) { gap = g; gi = i; } }
  const gapDays = Math.round(gap / 86400e3), playsAfter = ts.length - gi, playsBefore = gi;
  if (gapDays >= 540 && playsAfter >= 50 && playsBefore >= COMEBACK_MIN_BEFORE)
    COMEBACKS.push({ artist, gapDays, left: iso(ts[gi - 1]), back: iso(ts[gi]), playsBefore, playsAfter, hue: hueFor(artist) });
}
COMEBACKS.sort((a, b) => b.gapDays - a.gapDays).splice(8);

// one-day wonders: 15+ plays inside 48h, then never (or barely) again
const span = new Map();
for (const [artist, , , ms] of scrobbles) {
  const s = span.get(artist);
  if (!s) span.set(artist, [ms, ms]); else { if (ms < s[0]) s[0] = ms; if (ms > s[1]) s[1] = ms; }
}
const WONDERS = [];
for (const [artist, [f, l]] of span) {
  const plays = artistPlays.get(artist);
  if (plays >= 15 && l - f <= 2 * 86400e3) WONDERS.push({ artist, plays, date: iso(f), hue: hueFor(artist) });
}
WONDERS.sort((a, b) => b.plays - a.plays).splice(8);

// night owls: artists that live in the 12am–5am window
const nightSet = new Set([...artistPlays.entries()].filter(([, c]) => c >= 150).map(([n]) => n));
const night = new Map();
for (const [artist, , , ms] of scrobbles) if (nightSet.has(artist)) {
  if (!night.has(artist)) night.set(artist, { n: 0, t: 0 });
  const N = night.get(artist); N.t++;
  if (new Date(ms).getUTCHours() < 5) N.n++;
}
const NIGHT_OWLS = [...night.entries()]
  .map(([artist, N]) => ({ artist, plays: N.t, nightShare: Math.round(N.n / N.t * 100) / 100, hue: hueFor(artist) }))
  .filter(x => x.nightShare >= 0.3).sort((a, b) => b.nightShare - a.nightShare).slice(0, 6);

// discoveries: first-ever scrobble of the all-time top artists
const firstScrobble = new Map();
for (const s of asc) if (!firstScrobble.has(s[0])) firstScrobble.set(s[0], s);
const DISCOVERIES = ARTISTS.slice(0, 15)
  .map(a => { const s = firstScrobble.get(a.name); return s ? { artist: a.name, hue: a.hue, date: iso(s[3]), track: s[2], plays: a.plays } : null; })
  .filter(Boolean);

// heaviest day of each year
const YEAR_PEAKS = years.filter(y => y >= new Date(oldestMs).getUTCFullYear()).map(y => {
  let bk = null;
  for (const k of dayKeys) if (k.startsWith(y) && (!bk || dayCounts.get(k) > dayCounts.get(bk))) bk = k;
  if (!bk) return null;
  const top = [...dayTopArtist.get(bk).entries()].sort((a, b) => b[1] - a[1])[0];
  return { year: y, date: bk, count: dayCounts.get(bk), artist: top[0], artistPlays: top[1], hue: hueFor(top[0]) };
}).filter(Boolean);

// on this day: all-time top artist for each calendar day, plus a per-year breakdown (this date
// "through the years") for the Overview's dynamic on-this-day card.
const otd = new Map();
for (const [artist, , , ms] of scrobbles) {
  const d = new Date(ms);
  const k = String(d.getUTCMonth() + 1).padStart(2, "0") + "-" + String(d.getUTCDate()).padStart(2, "0");
  const y = d.getUTCFullYear();
  if (!otd.has(k)) otd.set(k, { total: 0, art: new Map(), years: new Map() });
  const O = otd.get(k); O.total++; O.art.set(artist, (O.art.get(artist) || 0) + 1);
  if (!O.years.has(y)) O.years.set(y, { total: 0, art: new Map() });
  const Y = O.years.get(y); Y.total++; Y.art.set(artist, (Y.art.get(artist) || 0) + 1);
}
const _top1 = (m) => [...m.entries()].sort((a, b) => b[1] - a[1])[0];
const ON_THIS_DAY = {};
for (const [k, O] of otd) {
  const [artist, plays] = _top1(O.art);
  // up to 5 years for this date — the biggest by that day's play count, shown newest-first
  const byYear = [...O.years.entries()].map(([y, Y]) => {
    const [ta] = _top1(Y.art);
    return { y, plays: Y.total, artist: ta, artistId: slug(ta), hue: hueFor(ta) };
  }).sort((a, b) => b.plays - a.plays).slice(0, 5).sort((a, b) => b.y - a.y);
  ON_THIS_DAY[k] = { artist, plays, total: O.total, hue: hueFor(artist), artistId: slug(artist), byYear };
}

// ─────────── UNDERGROUND INDEX (how obscure the taste is) ───────────
// Play-weighted over every artist we have a global listener count for.
let UNDERGROUND = null;
if (hasStats) {
  let covered = 0, under50k = 0, under10k = 0;        // play-weighted
  let aUnder50k = 0, aUnder10k = 0, aUnder1k = 0;     // catalogue-breadth (per artist)
  const wl = [];        // [listeners, plays] for play-weighted median
  const listenerList = []; // listeners only, for the unweighted artist median
  for (const [name, plays] of artistPlays) {
    const L = listenersOf(name);
    if (L == null) continue;
    covered += plays; wl.push([L, plays]); listenerList.push(L);
    if (L < 50000) { under50k += plays; aUnder50k++; }
    if (L < 10000) { under10k += plays; aUnder10k++; }
    if (L < 1000) aUnder1k++;
  }
  const nA = listenerList.length;
  wl.sort((a, b) => a[0] - b[0]);
  let acc = 0, medianListeners = 0;
  for (const [L, p] of wl) { acc += p; if (acc >= covered / 2) { medianListeners = L; break; } }
  listenerList.sort((a, b) => a - b);
  const medianArtistListeners = nA ? listenerList[Math.floor(nA / 2)] : 0;
  // deep cuts: your kept artists with the fewest global listeners (favourites almost nobody else plays)
  const deepCuts = ARTISTS.filter(a => a.listeners != null).slice()
    .sort((a, b) => a.listeners - b.listeners).slice(0, 8)
    .map(a => ({ artist: a.name, hue: a.hue, listeners: a.listeners, plays: a.plays }));
  // discovery shape: per year, the count of newly-discovered artists at each listener tier.
  // Reveals "when the taste turned underground" — the year discoveries shifted to obscure.
  const shape = [];
  for (const year of years) {
    if ((yearTotals.get(year) || 0) < 500) continue;
    let total = 0, sUnder50k = 0, sUnder10k = 0, sUnder1k = 0, withStats = 0;
    for (const [name, ms] of firstSeen) {
      if (new Date(ms).getUTCFullYear() !== year) continue;
      if (ms < UNDATED_REMAP_START + 86400e3) continue;
      const yp = (artistYear.get(name) || new Map()).get(year) || 0;
      if (yp < 3) continue; // require ≥3 plays in discovery year to count as real
      total++;
      const L = listenersOf(name);
      if (L == null) continue;
      withStats++;
      if (L < 50000) sUnder50k++;
      if (L < 10000) sUnder10k++;
      if (L < 1000) sUnder1k++;
    }
    shape.push({ year, total, withStats, under50k: sUnder50k, under10k: sUnder10k, under1k: sUnder1k });
  }
  UNDERGROUND = {
    coverage: Math.round(covered / lines.length * 100) / 100,
    share50k: covered ? Math.round(under50k / covered * 100) / 100 : 0,
    share10k: covered ? Math.round(under10k / covered * 100) / 100 : 0,
    medianListeners,
    artistsCovered: nA,
    artistShare50k: nA ? Math.round(aUnder50k / nA * 100) / 100 : 0,
    artistShare10k: nA ? Math.round(aUnder10k / nA * 100) / 100 : 0,
    artistShare1k: nA ? Math.round(aUnder1k / nA * 100) / 100 : 0,
    medianArtistListeners,
    deepCuts,
    discoveryShape: shape,
  };
}

// ─────────── GEOGRAPHY (where your taste comes from, MusicBrainz origins) ───────────
// Play-weighted over every artist that resolved to a country in artist-origins.json.
let GEOGRAPHY = null;
if (hasOrigins) {
  const COUNTRY_NAMES = { US: "United States", GB: "United Kingdom", JP: "Japan", AU: "Australia",
    DE: "Germany", FR: "France", CA: "Canada", SE: "Sweden", NO: "Norway", FI: "Finland",
    RU: "Russia", PL: "Poland", NL: "Netherlands", BE: "Belgium", IT: "Italy", ES: "Spain",
    BR: "Brazil", AR: "Argentina", MX: "Mexico", KR: "South Korea", CN: "China", TW: "Taiwan",
    DK: "Denmark", IE: "Ireland", IS: "Iceland", NZ: "New Zealand", CH: "Switzerland",
    AT: "Austria", CZ: "Czechia", UA: "Ukraine", HU: "Hungary", IL: "Israel", IN: "India",
    ID: "Indonesia", PT: "Portugal", GR: "Greece", TR: "Turkey", ZA: "South Africa",
    XW: "Worldwide", "": "" };
  const flagOf = (cc) => {
    if (!cc || cc.length !== 2 || cc === "XW") return "";
    return String.fromCodePoint(...cc.toUpperCase().split("").map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
  };
  const ctry = new Map(); // code → { plays, artists:Set, fam:Map, top:{plays,fam} }
  const cit = new Map();  // "country|city" → { plays, artists:Set, country, city, fam:Map, top }
  let totalCovered = 0;
  const bumpFam = (e, fi, plays, name) => {
    if (fi >= 0) e.fam.set(fi, (e.fam.get(fi) || 0) + plays);
    if (plays > e.top.plays) { e.top = { plays, fam: fi }; }
  };
  for (const [name, plays] of artistPlays) {
    const o = originOf(name);
    if (!o) continue;
    totalCovered += plays;
    const fi = familyIdxByName(name);
    const cc = o.country;
    if (!ctry.has(cc)) ctry.set(cc, { plays: 0, artists: new Set(), fam: new Map(), top: { plays: 0, fam: -1 } });
    const c = ctry.get(cc); c.plays += plays; c.artists.add(name); bumpFam(c, fi, plays, name);
    if (o.city) {
      const k = cc + "|" + o.city;
      if (!cit.has(k)) cit.set(k, { plays: 0, artists: new Set(), country: cc, city: o.city, fam: new Map(), top: { plays: 0, fam: -1 } });
      const ci = cit.get(k); ci.plays += plays; ci.artists.add(name); bumpFam(ci, fi, plays, name);
    }
  }
  // df = family with the most plays here; tf = family of the single most-played artist here
  const domFam = (e) => { let bi = -1, bv = 0; for (const [f, v] of e.fam) if (v > bv) { bv = v; bi = f; } return bi; };
  const countries = [...ctry.entries()]
    .map(([code, v]) => ({ code, name: COUNTRY_NAMES[code] || code, flag: flagOf(code),
      plays: v.plays, artists: v.artists.size, share: totalCovered ? v.plays / totalCovered : 0, df: domFam(v), tf: v.top.fam }))
    .sort((a, b) => b.plays - a.plays);
  const cities = [...cit.values()]
    .map(c => ({ country: c.country, city: c.city, flag: flagOf(c.country),
      plays: c.plays, artists: c.artists.size }))
    .sort((a, b) => b.plays - a.plays).slice(0, 12);
  // city points for the world map — only cities geocoded in city-coords.json (built by the
  // gazetteer match). Capped to the top 300 by plays; the rest fall back to their country bubble.
  const cityPoints = [...cit.values()].map(c => {
    const ll = CITYCOORDS[c.country + "|" + c.city];
    return ll ? { city: c.city, country: c.country, flag: flagOf(c.country), plays: c.plays, artists: c.artists.size, lat: ll[0], lng: ll[1], df: domFam(c), tf: c.top.fam } : null;
  }).filter(Boolean).sort((a, b) => b.plays - a.plays).slice(0, 300);
  GEOGRAPHY = {
    coverage: Math.round(totalCovered / lines.length * 100) / 100,
    // ALL countries (was top-20) so the Overview map plots every country the profile counts —
    // the map already filters to those with a world-geometry centroid (Fuad 2026-07-14).
    countries,
    cities,
    cityPoints,
    totalCountries: countries.length,
  };

  // play-the-years: per-place plays-by-year (yr) + dominant family per year (yf), from a scrobble pass
  {
    const gy = years.filter(y => y >= 2010);
    const yIdx = new Map(gy.map((y, i) => [y, i]));
    const F = FAMILIES.length;
    const cityKeys = new Set(GEOGRAPHY.cityPoints.map(c => c.country + "|" + c.city));
    const mkA = () => ({ p: new Array(gy.length).fill(0), f: Array.from({ length: gy.length }, () => new Array(F).fill(0)) });
    const cAcc = new Map(), ctAcc = new Map();
    for (const [artist, , , ms] of scrobbles) {
      const o = originOf(artist); if (!o) continue;
      const yi = yIdx.get(new Date(ms).getUTCFullYear()); if (yi == null) continue;
      const fi = familyIdxByName(artist);
      let A = cAcc.get(o.country); if (!A) { A = mkA(); cAcc.set(o.country, A); }
      A.p[yi]++; if (fi >= 0) A.f[yi][fi]++;
      if (o.city) { const k = o.country + "|" + o.city; if (cityKeys.has(k)) { let B = ctAcc.get(k); if (!B) { B = mkA(); ctAcc.set(k, B); } B.p[yi]++; if (fi >= 0) B.f[yi][fi]++; } }
    }
    const domY = (A) => A.f.map(fr => { let bi = -1, bv = 0; fr.forEach((v, i) => { if (v > bv) { bv = v; bi = i; } }); return bi; });
    for (const c of GEOGRAPHY.countries) { const A = cAcc.get(c.code); if (A) { c.yr = A.p; c.yf = domY(A); } }
    for (const c of GEOGRAPHY.cityPoints) { const A = ctAcc.get(c.country + "|" + c.city); if (A) { c.yr = A.p; c.yf = domY(A); } }
    GEOGRAPHY.geoYears = gy;
  }

  // Taste arc: per-year share by top countries. Cross of origins × years.
  // Reveals "Japan crept in around 2018", "Australia spiked in 2024" etc.
  const TOP_ARC_COUNTRIES = countries.slice(0, 6).map(c => c.code);
  const arc = [];
  for (const year of years) {
    if ((yearTotals.get(year) || 0) < 500) continue; // skip near-empty years
    const byCC = {}; let knownInYear = 0;
    for (const [name, m] of artistYear) {
      const n = m.get(year) || 0;
      if (!n) continue;
      const o = originOf(name);
      if (!o) continue;
      const cc = TOP_ARC_COUNTRIES.includes(o.country) ? o.country : "OTHER";
      byCC[cc] = (byCC[cc] || 0) + n;
      knownInYear += n;
    }
    if (knownInYear < 200) continue;
    const e = { year, knownPlays: knownInYear };
    for (const cc of [...TOP_ARC_COUNTRIES, "OTHER"]) {
      e[cc] = knownInYear ? Math.round((byCC[cc] || 0) / knownInYear * 1000) / 1000 : 0;
    }
    arc.push(e);
  }
  GEOGRAPHY.arc = {
    countries: TOP_ARC_COUNTRIES.map(code => {
      const meta = countries.find(c => c.code === code);
      return { code, name: meta.name, flag: meta.flag };
    }),
    years: arc,
  };

  // Gateways: for each top country, the EARLIEST artist you ever played from there.
  // "Japan arrived March 2018 via X" — the discovery moment for each lane in your library.
  const gateways = countries.slice(0, 10).map(c => {
    let earliest = null;
    for (const [name, ms] of firstSeen) {
      const o = originOf(name);
      if (!o || o.country !== c.code) continue;
      if (ms < UNDATED_REMAP_START + 86400e3) continue; // skip remapped pre-scrobbling
      if (!earliest || ms < earliest.ms) earliest = { name, ms, plays: artistPlays.get(name) || 0 };
    }
    if (!earliest) return null;
    return {
      code: c.code, country: c.name, flag: c.flag,
      artist: earliest.name, firstHeard: iso(earliest.ms),
      plays: earliest.plays, hue: hueFor(earliest.name), artistId: slug(earliest.name),
      kept: !!byName[earliest.name],
    };
  }).filter(Boolean).sort((a, b) => a.firstHeard.localeCompare(b.firstHeard));
  GEOGRAPHY.gateways = gateways;
}

// ─────────── STYLE ATLAS (Discogs styles unique-in-library) ───────────
// "Only-in-your-library" styles — Discogs styles that exist in your collection
// via just 1 or 2 artists. Counts how many distinct styles you've touched overall.
let STYLE_ATLAS = null;
if (hasDiscogs) {
  // style → { artists: [{name, plays, hue}], plays: total }.
  // Iterate ALL artists with Discogs data + meaningful plays (≥ 10) — not just the kept
  // top 118 ARTISTS. This lets the deeper Discogs enrichment actually deepen the atlas:
  // a Breakcore artist at rank #800 with 60 plays still contributes to uniqueStyles + rarest.
  const styleMap = new Map();
  const byNameKept = new Set(ARTISTS.map(a => a.name));
  let artistsCovered = 0;
  for (const [name, plays] of artistPlays) {
    if (plays < 3) continue; // require ≥3 plays to count as real (not a one-off scrobble)
    const pn = pinOf(name);
    if (pn && pn.clearStyles && !(pn.styles && pn.styles.length)) continue; // pinned: wrong Discogs match, no styles to contribute
    const _dg = aliasedByName(DISCOGS, name);
    const styles = (pn && pn.clearStyles && pn.styles) ? pn.styles.map(s => Array.isArray(s) ? s : [s]) : (_dg && _dg.styles);
    if (!styles || styles.length === 0) continue;
    artistsCovered++;
    const topStyles = styles.slice(0, 5).map(s => s[0]);
    for (const s of topStyles) {
      if (!styleMap.has(s)) styleMap.set(s, { artists: [], plays: 0 });
      const m = styleMap.get(s);
      m.artists.push({ name, plays, hue: hueFor(name), kept: byNameKept.has(name) });
      m.plays += plays;
    }
  }
  // rarest = styles with ≤ 2 artists in YOUR library, ranked by your play volume.
  // (signal: you went deep on a niche style only 1-2 artists carry for you.)
  const rarest = [...styleMap.entries()]
    .filter(([, v]) => v.artists.length <= 2)
    .map(([style, v]) => ({ style, plays: v.plays, artists: v.artists }))
    .sort((a, b) => b.plays - a.plays)
    .slice(0, 8);
  // top scenes = the Discogs styles you've gone deepest on (most total plays via your artists).
  // Filter to those with ≥ 2 artists so it reads as a "scene" not a one-artist style;
  // pick a diverse top by skipping near-duplicate label families (Hip-Hop / Hip Hop, etc).
  const topScenes = [...styleMap.entries()]
    .filter(([, v]) => v.artists.length >= 2)
    .map(([style, v]) => ({ style, plays: v.plays,
      artists: v.artists.slice().sort((a, b) => b.plays - a.plays).slice(0, 2) }))
    .sort((a, b) => b.plays - a.plays);
  const seenKey = new Set();
  const scenes = [];
  for (const sc of topScenes) {
    const k = sc.style.toLowerCase().replace(/[^a-z]/g, "");
    let dup = false;
    for (const s of seenKey) if (k.startsWith(s) || s.startsWith(k)) { dup = true; break; }
    if (dup) continue;
    seenKey.add(k);
    scenes.push(sc);
    if (scenes.length >= 8) break;
  }
  // bridges: artists who carry styles from ≥ 2 of your top scenes —
  // the connector nodes between scene clusters (e.g. Northlane = Metalcore + Synthwave).
  const sceneStyleSet = new Set(scenes.map(sc => sc.style));
  const bridges = ARTISTS
    .filter(a => a.styles && a.styles.length > 0)
    .map(a => {
      const carried = a.styles.filter(s => sceneStyleSet.has(s));
      return { artist: a.name, hue: a.hue, plays: a.plays, artistId: a.id, scenes: carried };
    })
    .filter(b => b.scenes.length >= 2)
    .sort((a, b) => (b.scenes.length - a.scenes.length) || (b.plays - a.plays))
    .slice(0, 8);
  STYLE_ATLAS = {
    uniqueStyles: styleMap.size,
    artistsCovered,
    rarest,
    scenes,
    bridges,
  };
}

// Audio DNA drift: per-year play-weighted average audio profile across artists that
// have audio data (the kept 118). Reveals "energy went up", "danceability climbed", etc.
let AUDIO_DRIFT = null;
{
  const axes = ["energy", "valence", "acoustic", "tempo", "dance", "instr"];
  const byNameAudio = new Map(ARTISTS.map(a => [a.name, a.audio]));
  const drift = [];
  for (const year of years) {
    if ((yearTotals.get(year) || 0) < 500) continue;
    const sum = { energy: 0, valence: 0, acoustic: 0, tempo: 0, dance: 0, instr: 0 };
    let totalCov = 0;
    for (const [name, m] of artistYear) {
      const p = m.get(year) || 0;
      if (!p) continue;
      const aud = byNameAudio.get(name);
      if (!aud) continue;
      totalCov += p;
      for (const ax of axes) sum[ax] += aud[ax] * p;
    }
    if (totalCov < 100) continue;
    const e = { year, coverage: totalCov };
    for (const ax of axes) e[ax] = Math.round(sum[ax] / totalCov * 1000) / 1000;
    drift.push(e);
  }
  AUDIO_DRIFT = { axes, years: drift };
}

// ─────────── ADOPTION LAG (how old the music was when you found it, MusicBrainz debut) ───────────
// lag = (first-listen year) − (artist debut year). ~0 = caught them near release; large = you
// dug deep into back-catalogue. Also a play-weighted breakdown of which release-DECADE your
// listening comes from (when the MUSIC is from, not when you played it).
let ADOPTION = null;
if (hasMB) {
  const rows = [];
  const decadePlays = new Map();
  let covered = 0;
  for (const [name, plays] of artistPlays) {
    if (plays < 5) continue;
    const deb = debutOf(name);
    if (!deb) continue;
    const sp = span.get(name);                  // dated first/last play
    if (!sp) continue;
    const foundYear = new Date(sp[0]).getUTCFullYear();
    const lag = foundYear - deb;
    if (lag < 0 || lag > 70) continue;          // skip data errors / impossible
    covered += plays;
    const dec = Math.floor(deb / 10) * 10;
    decadePlays.set(dec, (decadePlays.get(dec) || 0) + plays);
    rows.push({ name, plays, debut: deb, foundYear, lag, hue: hueFor(name), artistId: slug(name), kept: !!byName[name] });
  }
  rows.sort((a, b) => a.lag - b.lag);
  const lagArr = rows.map(r => r.lag).sort((a, b) => a - b);
  const medianLag = lagArr.length ? lagArr[Math.floor(lagArr.length / 2)] : 0;
  const decades = [...decadePlays.entries()].sort((a, b) => a[0] - b[0])
    .map(([decade, p]) => ({ decade, plays: p, share: covered ? Math.round(p / covered * 1000) / 1000 : 0 }));
  // caught-early: smallest lag among well-played artists; digs: oldest music when found
  const early = rows.filter(r => r.plays >= 30).slice(0, 8);
  const digs = rows.filter(r => r.plays >= 20).slice().sort((a, b) => b.lag - a.lag).slice(0, 8);
  ADOPTION = { coverage: Math.round(covered / lines.length * 100) / 100, artists: rows.length, medianLag, decades, early, digs };
}

// ─────────── LIFESPAN (MusicBrainz life-spans × your listening timeline) ───────────
// Who ended while you were a fan, who was long gone before you arrived, who's still going after
// decades. Uses ORIGINS (begin/end/ended/type) against each artist's first-play date. ≥5 plays
// keeps it meaningful (same lean threshold as the rest of the enrichment layer).
let LIFESPAN = null;
{
  const yearOf = (s) => { const y = parseInt(String(s || "").slice(0, 4), 10); return y >= 1900 && y <= 2100 ? y : 0; };
  let known = 0, endedCount = 0;
  const whileListening = [], graves = [], elders = [], endYears = new Map(), lives = [];
  for (const [name, plays] of artistPlays) {
    if (plays < 5) continue;
    const pn = pinOf(name);
    if (pn && pn.clearLife) continue; // pinned: MB matched a wrong entity, drop its life-span
    const o = (pn && pn.life) || aliasedByName(ORIGINS, name);
    if (!o || (!o.begin && !o.end && !o.ended)) continue;
    known++;
    const sp = span.get(name);
    const firstYear = sp ? new Date(sp[0]).getUTCFullYear() : 0;
    const beginY = yearOf(o.begin), endY = yearOf(o.end);
    const person = o.type === "Person";
    if (o.ended) {
      endedCount++;
      if (endY && beginY && endY > beginY) lives.push(endY - beginY);
      if (endY) endYears.set(endY, (endYears.get(endY) || 0) + 1);
      if (endY && firstYear && endY >= firstYear) {
        // they ended while (or after) you were listening — split plays at the end year
        let before = 0, after = 0;
        const ym = artistYear.get(name);
        if (ym) for (const [y, c] of ym) (y <= endY ? before += c : after += c);
        if (before >= 8) whileListening.push({ name, artistId: slug(name), hue: hueFor(name), plays,
          end: endY, endFull: String(o.end || "").slice(0, 10), person: person ? 1 : 0, before, after, found: firstYear });
      } else if (endY && firstYear && endY < firstYear && plays >= 15) {
        graves.push({ name, artistId: slug(name), hue: hueFor(name), plays, end: endY, found: firstYear, gap: firstYear - endY, person: person ? 1 : 0 });
      }
    } else if (beginY && plays >= 20 && !person) {
      elders.push({ name, artistId: slug(name), hue: hueFor(name), plays, begin: beginY, years: new Date().getUTCFullYear() - beginY });
    }
  }
  whileListening.sort((a, b) => b.before - a.before);
  graves.sort((a, b) => b.gap - a.gap);
  elders.sort((a, b) => a.begin - b.begin);
  lives.sort((a, b) => a - b);
  let worstYear = null, worstN = 0;
  for (const [y, n] of endYears) if (n > worstN || (n === worstN && worstYear != null && y > worstYear)) { worstYear = y; worstN = n; }
  if (known >= 50) LIFESPAN = {
    known, endedCount, endedShare: Math.round(endedCount / known * 100) / 100,
    medianLife: lives.length ? lives[Math.floor(lives.length / 2)] : 0,
    worstYear, worstYearCount: worstN,
    whileListening: whileListening.slice(0, 8),
    graves: graves.slice(0, 6),
    elders: elders.slice(0, 5),
  };
}

// ─────────── LANGUAGE (Genius lyrics language layer — .sptmp/genius-match.py) ───────────
// Play-weighted: what languages you actually listen in, and how the mix shifted over the years.
const GENIUS = _readJson("genius-lyrics.json");   // "artistSlug~trackSlug" → [lang, tag, year, wc, uniq]
const LANG_NAMES = { en: "English", pl: "Polish", ja: "Japanese", de: "German", sv: "Swedish", fr: "French", es: "Spanish", fi: "Finnish", pt: "Portuguese", is: "Icelandic", ko: "Korean", it: "Italian", ru: "Russian", nl: "Dutch", no: "Norwegian", da: "Danish", zh: "Chinese", cs: "Czech" };
let LANGUAGE = null;
{
  const shares = new Map(), byYear = new Map(), nonEn = [];
  let coveredPlays = 0, totalPlays = 0, covered = 0;
  for (const [key, plays] of trackPlays) {
    totalPlays += plays;
    const ix = key.indexOf("\x00"); const artist = key.slice(0, ix), title = key.slice(ix + 1);
    const g = GENIUS[slug(artist) + "~" + slug(title)];
    if (!g || !g[0]) continue;
    const lang = g[0];
    covered++; coveredPlays += plays;
    shares.set(lang, (shares.get(lang) || 0) + plays);
    const ym = trackYear.get(key);
    if (ym) for (const [y, c] of ym) { if (!byYear.has(y)) byYear.set(y, new Map()); const m = byYear.get(y); m.set(lang, (m.get(lang) || 0) + c); }
    if (lang !== "en") nonEn.push({ artist, title, lang, langName: LANG_NAMES[lang] || lang, plays, id: slug(artist) + "~" + slug(title), artistId: slug(artist), hue: hueFor(artist) });
  }
  if (covered >= 30) {
    nonEn.sort((a, b) => b.plays - a.plays);
    const sharesArr = [...shares.entries()].sort((a, b) => b[1] - a[1]).map(([l, p]) => ({ lang: l, name: LANG_NAMES[l] || l, plays: p }));
    const byYearO = {};
    for (const [y, m] of [...byYear.entries()].sort((a, b) => a[0] - b[0])) { if (m.size) byYearO[y] = Object.fromEntries([...m.entries()].sort((a, b) => b[1] - a[1])); }
    const enPlays = shares.get("en") || 0;
    // Language arc: per-year non-English share, plus the top non-EN languages' slice of each
    // year. English is ~97% so a raw streamgraph is a flat English band — the arc instead tracks
    // the non-English fraction over time (when Polish crept in, when Japanese spiked) and which
    // language carried it. Fraction is of that YEAR's detectable-lyric plays.
    const arcLangs = sharesArr.filter(s => s.lang !== "en").slice(0, 5).map(s => s.lang);
    const arcYears = [];
    for (const [y, m] of [...byYear.entries()].sort((a, b) => a[0] - b[0])) {
      let tot = 0; for (const v of m.values()) tot += v;
      if (tot < 150) continue;                       // skip thin years
      const en = m.get("en") || 0;
      const e = { year: y, plays: tot, nonEnPct: Math.round((tot - en) / tot * 1000) / 1000, byLang: {} };
      for (const l of arcLangs) e.byLang[l] = Math.round((m.get(l) || 0) / tot * 1000) / 1000;
      arcYears.push(e);
    }
    const arc = arcYears.length >= 6 ? { langs: arcLangs.map(l => ({ lang: l, name: LANG_NAMES[l] || l })), years: arcYears } : null;
    LANGUAGE = {
      shares: sharesArr, byYear: byYearO, topNonEn: nonEn.slice(0, 12), arc,
      covered, coveredPlays, totalPlays, langs: sharesArr.length,
      nonEnPct: coveredPlays ? Math.round((coveredPlays - enPlays) / coveredPlays * 100) : 0,
    };
  }
}

// ─────────── MOOD (sounds happy / reads dark — Spotify valence × NRC lyric valence) ───────────
// Two independent 0–100 axes per track: how it SOUNDS (Spotify audio valence, in TRACKDATA[5])
// and how it READS (NRC multilingual lyric valence = positive vs negative share, genius-mood.json
// by .sptmp/genius-sentiment.py). The interesting tracks are where they diverge — an upbeat tune
// carrying bleak words, or a dirge with hopeful ones. Play-weighted; needs ≥3 emotive words to
// have been scored. NRC emotion index: 0 anger 1 anticipation 2 disgust 3 fear 4 joy 5 sadness
// 6 surprise 7 trust.
// Row shape: [valence 0–100, emoIdx (NRC), emotiveWords, flag?, regIdx?]
//   flag 1 = whole-lyric "calibrated" re-score; flag 2 = "cathartic" (dark-register work whose
//   NRC lexical valence is deliberately KEPT, so its stored valence scatters bright→dark).
//   regIdx = index into REG_VOCAB (the human "register" word); absent on legacy 4-element rows.
const GENIUS_MOOD = _readJson("genius-mood.json"); // key → [lyricValence0-100, domEmotionIdx, emotiveWords, flag?, regIdx?]
const MOOD_EMO = ["anger", "anticipation", "disgust", "fear", "joy", "sadness", "surprise", "trust"];
// Register vocabulary for calibrated/cathartic rows (row[4] = index). ORDER IS THE EMIT'S —
// .sptmp/nrc-audit/emit_v5.js — do not reorder. (mirrors rotation-media.jsx REG_VOCAB.)
const MOOD_REG = ['anguished', 'bittersweet', 'bleak', 'tender', 'angry', 'defiant', 'joyful', 'neutral', 'bitter'];
let MOOD = null;
{
  const rows = [];
  // emotional weather: per-year play-weighted lyric valence (reads), audio valence (sounds)
  // and the emotion mix — the listening-mood arc over the years.
  const yAcc = new Map(); // year → { p, lyrW, lyrP, audW, audP, emo: [8 counts] }
  for (const [key, plays] of trackPlays) {
    const ix = key.indexOf("\x00"); const artist = key.slice(0, ix), title = key.slice(ix + 1);
    const aS = slug(artist), tS = slug(title), sk = aS + "~" + tS;
    const m = aliasedBySlugAlbum(GENIUS_MOOD, aS, tS), td = aliasedBySlugAlbum(TRACKDATA, aS, tS);
    const hasLyr = m && m[0] != null, hasAud = td && td.length >= 6 && typeof td[5] === "number";
    if (hasLyr || hasAud) {
      const ym = trackYear.get(key);
      if (ym) for (const [y, c] of ym) {
        let a = yAcc.get(y);
        if (!a) { a = { p: 0, lyrW: 0, lyrP: 0, audW: 0, audP: 0, emo: new Array(8).fill(0), reg: new Array(MOOD_REG.length).fill(0) }; yAcc.set(y, a); }
        a.p += c;
        if (hasLyr) { a.lyrW += m[0] * c; a.lyrP += c; if (m[1] >= 0) a.emo[m[1]] += c; if (m[4] != null) a.reg[m[4]] += c; }
        if (hasAud) { a.audW += td[5] * c; a.audP += c; }
      }
    }
    if (!hasLyr || !hasAud) continue;
    rows.push({ artist, title, id: sk, artistId: slug(artist), hue: hueFor(artist), plays,
      aud: td[5], lyr: m[0], emo: m[1] >= 0 ? MOOD_EMO[m[1]] : null,
      flag: m[3] != null ? m[3] : null, reg: m[4] != null ? m[4] : null });
  }
  // arc rows (skip thin years)
  const MOOD_ARC = [...yAcc.entries()].sort((a, b) => a[0] - b[0])
    .filter(([, a]) => a.lyrP >= 300 && a.audP >= 300)
    .map(([year, a]) => {
      const mix = a.emo.map((c, i) => [c, i]).sort((x, y) => y[0] - x[0]);
      const emoTot = a.emo.reduce((s, c) => s + c, 0);
      const regMix = a.reg.map((c, i) => [c, i]).sort((x, y) => y[0] - x[0]);
      const regTot = a.reg.reduce((s, c) => s + c, 0);
      return { year, plays: a.p,
        lyr: Math.round(a.lyrW / a.lyrP), aud: Math.round(a.audW / a.audP),
        topEmo: emoTot ? MOOD_EMO[mix[0][1]] : null,
        topEmoShare: emoTot ? Math.round(mix[0][0] / emoTot * 100) / 100 : 0,
        reg: regTot ? MOOD_REG[regMix[0][1]] : null };
    });
  if (rows.length >= 50) {
    const totPlays = rows.reduce((s, r) => s + r.plays, 0);
    const wavg = (f) => Math.round(rows.reduce((s, r) => s + f(r) * r.plays, 0) / totPlays);
    const trim = (arr) => arr.map(r => ({ id: r.id, artist: r.artist, title: r.title, artistId: r.artistId, hue: r.hue, plays: r.plays, aud: r.aud, lyr: r.lyr, emo: r.emo }));
    // sounds happy / reads dark = high audio valence, low lyric valence (and the inverse).
    // 2026-08-27 recalibration: the lyric model re-scored, collapsing the middle band (39–57:
    // 31.7%→9.7%) and dropping the median 40→30, so the old lyr<=38 / lyr>=58 gates skewed to
    // 64%/24% eligibility. Regated on the NEW quartiles (lyr<=22 / lyr>=45) to restore ~26%/~27%.
    // Reads-dark classification is flag-aware: a flag-2 "cathartic" row is a dark-register work
    // whose bright NRC value is deliberately kept, so it counts as bleak WORDS regardless of lyr,
    // and can never sit on the hopeful-text (darkHappy) side. Classification only — stored lyr
    // (used for avgLyr/arc means) is untouched.
    const readsDark = (r) => r.lyr <= 22 || r.flag === 2;   // 2026-08-27 recalibration: quartile anchor (lyr<=22 ≈ p25, ~26% eligible) restores the intended tail
    const readsBright = (r) => r.lyr >= 45 && r.flag !== 2; // 2026-08-27 recalibration: quartile anchor (lyr>=45 ≈ p75, ~27% eligible); cathartic rows excluded
    const happyDark = rows.filter(r => r.aud >= 58 && readsDark(r) && r.plays >= 8).sort((a, b) => (b.aud - b.lyr) - (a.aud - a.lyr) || b.plays - a.plays);
    const darkHappy = rows.filter(r => r.aud <= 38 && readsBright(r) && r.plays >= 8).sort((a, b) => (b.lyr - b.aud) - (a.lyr - a.aud) || b.plays - a.plays);
    const emoC = {};
    for (const r of rows) if (r.emo) emoC[r.emo] = (emoC[r.emo] || 0) + r.plays;
    // play-weighted modal REGISTER over rows carrying regIdx (the human "register" word the bars
    // can't show); null when no row carries col4, so the card falls back to the NRC emotion.
    const regC = new Array(MOOD_REG.length).fill(0);
    for (const r of rows) if (r.reg != null) regC[r.reg] += r.plays;
    const regTop = regC.reduce((s, c) => s + c, 0) ? MOOD_REG[regC.indexOf(Math.max(...regC))] : null;
    // modal register of a row set (play-weighted), for the Story sub-line; null when none carry col4.
    const regModeOf = (set) => {
      const c = new Array(MOOD_REG.length).fill(0);
      for (const r of set) if (r.reg != null) c[r.reg] += r.plays;
      return c.reduce((s, n) => s + n, 0) ? MOOD_REG[c.indexOf(Math.max(...c))] : null;
    };
    // "emotional weather NOW" — last 90 days of scrobbles, mean sounds/reads + dominant
    // emotion, to sit against the library averages on the Overview. CI rebuilds daily.
    let NOW_MOOD = null;
    {
      const cutoff = newestMs - 90 * 86400e3;
      let audW = 0, audP = 0, lyrW = 0, lyrP = 0; const emoN = new Array(8).fill(0);
      for (const [artist, , track, ms] of scrobbles) {
        if (ms < cutoff) continue;
        const aS = slug(artist), tS = slug(track);
        const m = aliasedBySlugAlbum(GENIUS_MOOD, aS, tS), td = aliasedBySlugAlbum(TRACKDATA, aS, tS);
        if (m && m[0] != null) { lyrW += m[0]; lyrP++; if (m[1] >= 0) emoN[m[1]]++; }
        if (td && td.length >= 6 && typeof td[5] === "number") { audW += td[5]; audP++; }
      }
      if (audP >= 100 && lyrP >= 100) {
        const mix = emoN.map((c, i) => [c, i]).sort((x, y) => y[0] - x[0]);
        NOW_MOOD = { aud: Math.round(audW / audP), lyr: Math.round(lyrW / lyrP),
          emo: mix[0][0] > 0 ? MOOD_EMO[mix[0][1]] : null, plays: audP, days: 90 };
      }
    }
    MOOD = {
      tracks: rows.length, avgAud: wavg(r => r.aud), avgLyr: wavg(r => r.lyr),
      happyDark: trim(happyDark.slice(0, 10)), darkHappy: trim(darkHappy.slice(0, 10)),
      happyDarkCount: happyDark.length, darkHappyCount: darkHappy.length,
      emotions: Object.entries(emoC).sort((a, b) => b[1] - a[1]).map(([emo, plays]) => ({ emo, plays })),
      topRegister: regTop, happyDarkReg: regModeOf(happyDark),
      arc: MOOD_ARC.length >= 6 ? MOOD_ARC : null,
      now: NOW_MOOD,
    };
  }
}

// ─────────── THEMES (what the lyrics are ABOUT — .sptmp/genius-themes.py) ───────────
// Multilingual embedding themes, not sentiment: each matched track carries up to 3 themes from
// an 18-theme taxonomy ("madness & the mind", "faith & the occult", "war & battle", …), scored
// 0-100 (anchor cosine). Validated: Numb→alienation .61, Teardrop→love .58, KAT(pl)→occult .48,
// Gimme Chocolate(ja)→party .46. Aggregated play-weighted by PRIMARY theme.
const GENIUS_THEMES = _readJson("genius-themes.json"); // "_themes": [names], key → [[themeIdx, score], …]
let THEMES = null;
if (GENIUS_THEMES._themes) {
  const TN = GENIUS_THEMES._themes;
  const shares = new Array(TN.length).fill(0);
  const byYear = new Map();            // year → per-theme plays
  const exemplars = TN.map(() => []);  // per theme: top played tracks
  const artistAcc = new Map();         // artist → per-theme plays (for profiles)
  let coveredPlays = 0, totalPlays = 0, covered = 0;
  for (const [key, plays] of trackPlays) {
    totalPlays += plays;
    const ix = key.indexOf("\x00"); const artist = key.slice(0, ix), title = key.slice(ix + 1);
    const sk = slug(artist) + "~" + slug(title);
    const th = aliasedBySlugAlbum(GENIUS_THEMES, slug(artist), slug(title));
    if (!th || !th.length) continue;
    covered++; coveredPlays += plays;
    const prim = th[0][0];
    shares[prim] += plays;
    exemplars[prim].push({ artist, title, id: sk, artistId: slug(artist), hue: hueFor(artist), plays, score: th[0][1] });
    const ym = trackYear.get(key);
    if (ym) for (const [y, c] of ym) {
      let a = byYear.get(y); if (!a) { a = new Array(TN.length).fill(0); byYear.set(y, a); }
      a[prim] += c;
    }
    let aa = artistAcc.get(artist); if (!aa) { aa = { plays: 0, t: new Array(TN.length).fill(0) }; artistAcc.set(artist, aa); }
    aa.plays += plays; aa.t[prim] += plays;
  }
  if (covered >= 500) {
    const order = shares.map((p, i) => [p, i]).sort((a, b) => b[0] - a[0]);
    const sharesArr = order.filter(([p]) => p > 0).map(([p, i]) => ({ theme: TN[i], plays: p, share: Math.round(p / coveredPlays * 1000) / 1000 }));
    for (const ex of exemplars) ex.sort((a, b) => b.plays - a.plays);
    // arc: top-6 themes' share of each year's themed plays (LANGUAGE.arc pattern)
    const arcThemes = order.slice(0, 6).map(([, i]) => i);
    const arcYears = [];
    for (const [y, a] of [...byYear.entries()].sort((x, z) => x[0] - z[0])) {
      const tot = a.reduce((s, c) => s + c, 0);
      if (tot < 400) continue;
      const e = { year: y, plays: tot, byTheme: {} };
      for (const ti of arcThemes) e.byTheme[TN[ti]] = Math.round(a[ti] / tot * 1000) / 1000;
      arcYears.push(e);
    }
    // artist theme profiles: top artists (≥300 themed plays) → their top-2 themes with shares
    const artistProfiles = [...artistAcc.entries()]
      .filter(([, v]) => v.plays >= 300)
      .map(([name, v]) => {
        const top = v.t.map((p, i) => [p, i]).sort((a, b) => b[0] - a[0]).slice(0, 2)
          .filter(([p]) => p > 0).map(([p, i]) => ({ theme: TN[i], share: Math.round(p / v.plays * 100) / 100 }));
        return { name, artistId: slug(name), hue: hueFor(name), plays: v.plays, themes: top };
      })
      .sort((a, b) => b.plays - a.plays).slice(0, 14);
    THEMES = {
      names: TN, covered, coveredPlays, totalPlays,
      shares: sharesArr,
      exemplars: Object.fromEntries(order.slice(0, 8).map(([, i]) => [TN[i], exemplars[i].slice(0, 3)])),
      arc: arcYears.length >= 6 ? { themes: arcThemes.map(i => TN[i]), years: arcYears } : null,
      artists: artistProfiles,
    };
  }
}

// ─────────── LINEUPS (Wikidata band-member gender — enrich-wikidata.js) ───────────
// The layer MusicBrainz can't give us: MB's `gender` is null for Groups, so at the artist
// level a band is genderless. Wikidata's P527→P21 exposes the members and their gender, so
// we can finally ask "how much of my band-listening involves women musicians?" — play-weighted
// over groups whose lineup gender is actually known. Solo artists (no members) are excluded
// here on purpose; their gender lives in the MB origins layer.
let LINEUPS = null;
{
  let bandsAnalyzed = 0, bandsWithWomen = 0, playsWithWomen = 0, playsAllMale = 0;
  const featured = [], allWomen = [], biggestLineups = [];
  for (const [name, plays] of artistPlays) {
    if (plays < 20) continue;
    const w = aliasedByName(WIKIDATA, name);
    if (!w || !w.members || w.members.length === 0) continue;
    const gendered = w.members.filter(m => m.gender);
    biggestLineups.push({ name, artistId: slug(name), hue: hueFor(name), plays, memberCount: w.members.length });
    if (gendered.length < 2) continue;                 // need a knowable lineup to judge
    bandsAnalyzed++;
    const women = gendered.filter(m => /female|trans woman/i.test(m.gender));
    if (women.length > 0) {
      bandsWithWomen++; playsWithWomen += plays;
      const rec = { name, artistId: slug(name), hue: hueFor(name), plays,
        femaleShare: Math.round(women.length / gendered.length * 100) / 100,
        women: women.slice(0, 4).map(m => m.name), memberCount: gendered.length };
      featured.push(rec);
      if (women.length === gendered.length) allWomen.push(rec);
    } else {
      playsAllMale += plays;
    }
  }
  featured.sort((a, b) => b.plays - a.plays);
  allWomen.sort((a, b) => b.plays - a.plays);
  biggestLineups.sort((a, b) => b.memberCount - a.memberCount);
  const denom = playsWithWomen + playsAllMale;
  if (bandsAnalyzed >= 20) LINEUPS = {
    bandsAnalyzed, bandsWithWomen,
    womenBandShare: denom ? Math.round(playsWithWomen / denom * 100) / 100 : 0,
    featured: featured.slice(0, 10),
    allWomen: allWomen.slice(0, 6),
    biggestLineups: biggestLineups.filter(b => b.memberCount >= 8).slice(0, 6),
  };
}

// ─────────── CONNECTIONS (shared band members — the "same drummer" graph) ───────────
// A person who is a "member of band" for ≥2 artists in your library links those artists.
let CONNECTIONS = null;
if (hasMB || Object.keys(DGA).length > 0) {
  const personBands = new Map();
  const addEdge = (person, band) => {
    if (!personBands.has(person)) personBands.set(person, new Set());
    personBands.get(person).add(band);
  };
  for (const [name, plays] of artistPlays) {
    if (plays < 5) continue;
    const mb = aliasedByName(MB, name);
    if (mb && mb.rels) for (const [type, rn] of mb.rels) if (type === "member of band") addEdge(rn, name);
    // Discogs members fill the gap for artists MusicBrainz has no relations for (underground)
    for (const p of dgMembersOf(name)) addEdge(p, name);
  }
  const mbidOf = (name) => (STATS[name] && STATS[name].mbid) || null;
  const links = [];
  for (const [person, bandSet] of personBands) {
    if (bandSet.size < 2) continue;
    // collapse scrobble-name variants of one artist (NIN / Nine Inch Nails / nineinchnails)
    // by shared MusicBrainz id, keeping the highest-play spelling.
    const byKey = new Map();
    for (const n of bandSet) {
      const key = mbidOf(n) || slug(n);
      const cur = byKey.get(key);
      if (!cur || (artistPlays.get(n) || 0) > (artistPlays.get(cur) || 0)) byKey.set(key, n);
    }
    const names = [...byKey.values()];
    if (names.length < 2) continue;
    const arr = names.map(n => ({ name: n, hue: hueFor(n), plays: artistPlays.get(n) || 0, artistId: slug(n), kept: !!byName[n] }))
      .sort((a, b) => b.plays - a.plays);
    links.push({ person, artists: arr, plays: arr.reduce((s, a) => s + a.plays, 0) });
  }
  links.sort((a, b) => b.plays - a.plays);
  // per-kept-artist lineage: for each kept artist, the persons that link them to other acts.
  // Attached onto ARTISTS (mutated here, before serialization) so ArtistView can show a tree.
  const connByArtist = new Map();
  for (const l of links) {
    for (const m of l.artists) {
      if (!byName[m.name]) continue; // only kept artists get a page
      const others = l.artists.filter(x => x.name !== m.name).slice(0, 4);
      if (!others.length) continue;
      if (!connByArtist.has(m.name)) connByArtist.set(m.name, []);
      connByArtist.get(m.name).push({ person: l.person, others });
    }
  }
  for (const a of ARTISTS) a.connections = (connByArtist.get(a.name) || []).slice(0, 5);
  CONNECTIONS = { links: links.slice(0, 12), totalLinks: links.length };
}

// ─────────── RECOMMENDATIONS (taste-gap / blind spots) ───────────
// Artists frequently listed as last.fm "similar" to your favourites that you barely play.
// Weighted by how high in the similar list + how much you love the source artist.
let RECOMMENDATIONS = null;
if (hasBios) {
  const rec = new Map();
  for (const a of ARTISTS.slice(0, 100)) {
    const sims = realSimilar(a.name) || [];
    sims.forEach((simName, idx) => {
      if (byName[simName]) return;                 // already one of your kept artists
      if ((artistPlays.get(simName) || 0) >= 15) return; // you already play them enough
      if (!rec.has(simName)) rec.set(simName, { name: simName, count: 0, via: [], weight: 0 });
      const r = rec.get(simName);
      r.count++;
      r.weight += (8 - Math.min(idx, 7)) * a.plays;
      if (r.via.length < 3) r.via.push({ name: a.name, hue: a.hue, artistId: a.id });
    });
  }
  const list = [...rec.values()]
    .filter(r => r.count >= 2)                      // recommended by ≥2 of your favourites
    .sort((x, y) => y.weight - x.weight).slice(0, 12)
    .map(r => ({ name: r.name, count: r.count, via: r.via, hue: hueOf(r.name),
      listeners: listenersOf(r.name), plays: artistPlays.get(r.name) || 0 }));
  if (list.length) RECOMMENDATIONS = { artists: list };
}

// ─────────── REVISIT (decay — favourites you've drifted from) ───────────
// Artists that once carried real weight but you haven't played in a long while. Scored by
// how big they were × how long they've been gone — the rediscovery flip-side of RECOMMENDATIONS.
let REVISIT = null;
{
  const MONTH = 30 * 86400e3;
  const list = [];
  for (const [name, plays] of artistPlays) {
    if (plays < 120 || !byName[name]) continue;        // significant + has a page to open
    const sp = span.get(name);
    if (!sp) continue;
    const monthsSince = (newestMs - sp[1]) / MONTH;
    if (monthsSince < 10) continue;                    // still in rotation — not "drifted"
    const pk = peakWeekByArtist.get(name);
    const peakMs = pk ? WEEK0 + pk.weekIdx * 7 * 86400e3 : null;
    list.push({
      name, plays, hue: hueFor(name), artistId: slug(name),
      lastHeard: iso(sp[1]), monthsSince: Math.round(monthsSince),
      peakMonth: peakMs ? iso(peakMs).slice(0, 7) : null, peakPlays: pk ? pk.plays : 0,
      score: plays * Math.log(1 + monthsSince),
    });
  }
  list.sort((a, b) => b.score - a.score);
  if (list.length) REVISIT = { artists: list.slice(0, 10) };
}

// ─────────── SESSIONS — how you actually listen (Phase 3; pure timestamps) ───────────
// Group dated scrobbles into listening sessions (a gap > 30 min starts a new one). Derives the
// richest untouched signal: session-length distribution, your longest sittings, binge-vs-shuffle,
// and the albums you play in one sitting (front-to-back). Dated range only (undated 2006–2010
// have no usable timestamps and are excluded from `scrobbles`).
let SESSIONS = null;
{
  const GAP = 30 * 60 * 1000;                       // 30 min silence = a new session
  const chron = scrobbles.slice().reverse();        // oldest → newest
  const avgTrackMs = (_avgSec || 216) * 1000;
  // distinct tracks ever seen per album — to tell a "whole album" run from a couple of tracks
  const albTrackSet = new Map();
  for (const [artist, album, track] of scrobbles) { if (album && track) { const ak = artist + "\x00" + album; let s = albTrackSet.get(ak); if (!s) { s = new Set(); albTrackSet.set(ak, s); } s.add(track); } }

  const sessions = [];
  let cur = null;
  for (const [artist, album, track, ms] of chron) {
    if (!cur || ms - cur.endMs > GAP) { cur = { startMs: ms, endMs: ms, items: [] }; sessions.push(cur); }
    cur.items.push({ artist, album, track, ms });
    cur.endMs = ms;
  }
  if (sessions.length) {
    const summ = sessions.map(s => {
      const art = new Map();
      for (const it of s.items) art.set(it.artist, (art.get(it.artist) || 0) + 1);
      let topArt = null, topN = 0; for (const [a, n] of art) if (n > topN) { topN = n; topArt = a; }
      return { startMs: s.startMs, n: s.items.length, durMs: s.endMs - s.startMs + avgTrackMs, topArt, topShare: topN / s.items.length };
    });
    const lens = summ.map(s => s.n).sort((a, b) => a - b);
    const median = lens[Math.floor(lens.length / 2)];
    // your longest sittings (by track count), top 8
    const longest = summ.slice().sort((a, b) => b.n - a.n).slice(0, 8).map(s => ({
      date: iso(s.startMs), tracks: s.n, hours: Math.round(s.durMs / 3.6e6 * 10) / 10,
      artist: s.topArt, artistId: slug(s.topArt), hue: hueFor(s.topArt), share: Math.round(s.topShare * 100),
    }));
    // binge vs shuffle: of sessions ≥5 tracks, share dominated (≥70%) by a single artist
    const big = summ.filter(s => s.n >= 5);
    const bingeShare = big.length ? Math.round(big.filter(s => s.topShare >= 0.7).length / big.length * 100) : 0;

    // album front-to-back: a run of same-album tracks inside one session that covers most of the album
    const runs = new Map();
    for (const s of sessions) {
      let i = 0;
      while (i < s.items.length) {
        const { artist, album } = s.items[i];
        if (!album) { i++; continue; }
        let j = i; const seen = new Set();
        while (j < s.items.length && s.items[j].album === album && s.items[j].artist === artist) { if (s.items[j].track) seen.add(s.items[j].track); j++; }
        const runLen = j - i;
        const ak = artist + "\x00" + album;
        const size = (albTrackSet.get(ak) || seen).size || runLen;
        if (runLen >= 5 && seen.size >= Math.max(5, Math.round(size * 0.6))) runs.set(ak, (runs.get(ak) || 0) + 1);
        i = j;
      }
    }
    const top = [...runs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([ak, count]) => {
      const ix = ak.indexOf("\x00"); const artist = ak.slice(0, ix), album = ak.slice(ix + 1);
      return { artist, album, count, aid: slug(artist) + "~" + slug(album), hue: hueFor(artist) };
    });
    const totalRuns = [...runs.values()].reduce((a, b) => a + b, 0);
    // per-album count (aid → sittings) so any album page can show "played front-to-back N times"
    const byAlbum = {};
    for (const [ak, count] of runs) { if (count >= 2) { const ix = ak.indexOf("\x00"); byAlbum[slug(ak.slice(0, ix)) + "~" + slug(ak.slice(ix + 1))] = count; } }

    // segue graph: what you play RIGHT AFTER what (consecutive X→Y inside a session, Y≠X). Keep
    // only strong, reliable rituals — X seen in ≥12 transitions and followed by the same Y ≥35%.
    const trans = new Map(), outTot = new Map();
    for (const s of sessions) {
      for (let i = 0; i + 1 < s.items.length; i++) {
        const a = s.items[i], b = s.items[i + 1];
        if (!a.track || !b.track) continue;
        const xk = a.artist + "\x00" + a.track, yk = b.artist + "\x00" + b.track;
        if (xk === yk) continue;
        let m = trans.get(xk); if (!m) { m = new Map(); trans.set(xk, m); }
        m.set(yk, (m.get(yk) || 0) + 1);
        outTot.set(xk, (outTot.get(xk) || 0) + 1);
      }
    }
    // A same-artist 100% segue is usually just album track-order; the SURPRISING ones cross artists
    // (a genuine "after X I always cue up Y" ritual). Give cross-artist a lower bar and rank it first.
    const segues = [];
    for (const [xk, m] of trans) {
      const tot = outTot.get(xk); if (tot < 8) continue;
      let bestY = null, bestN = 0;
      for (const [yk, n] of m) if (n > bestN) { bestN = n; bestY = yk; }
      const share = bestN / tot;
      const xa = xk.slice(0, xk.indexOf("\x00")), ya = bestY.slice(0, bestY.indexOf("\x00"));
      const sameArtist = xa === ya;
      if (sameArtist) { if (tot < 12 || bestN < 6 || share < 0.45) continue; }   // album-order: strict
      else { if (bestN < 4 || share < 0.30) continue; }                          // cross-artist: rarer, gentler
      segues.push({ xk, yk: bestY, n: bestN, share, sameArtist });
    }
    // cross-artist first, then by strength
    segues.sort((a, b) => (Number(a.sameArtist) - Number(b.sameArtist)) || (b.share - a.share) || (b.n - a.n));
    const segList = segues.slice(0, 14).map(s => {
      const xi = s.xk.indexOf("\x00"), yi = s.yk.indexOf("\x00");
      const xa = s.xk.slice(0, xi), xt = s.xk.slice(xi + 1), ya = s.yk.slice(0, yi), yt = s.yk.slice(yi + 1);
      return { fromArtist: xa, fromTrack: xt, toArtist: ya, toTrack: yt, pct: Math.round(s.share * 100), n: s.n,
        fromId: slug(xa) + "~" + slug(xt), toId: slug(ya) + "~" + slug(yt), hue: hueFor(xa), sameArtist: s.sameArtist };
    });

    SESSIONS = {
      total: sessions.length, median, mean: Math.round(chron.length / sessions.length * 10) / 10,
      longest, bingeShare, sittings: { total: totalRuns, albums: runs.size, top, byAlbum }, segues: segList,
    };
    console.log(`sessions: ${sessions.length} · median ${median} tracks · binge ${bingeShare}% · album sittings ${totalRuns} across ${runs.size} albums`);
  }
}

// ─────────── DISCOVERY GENEALOGY (lab prototype, 2026-08-26) ───────────
// "How did I get here?" — every artist's FIRST play sits inside a listening session, and the
// artist heard immediately before it (last DIFFERENT artist in the same session) is the best
// mechanical guess at who introduced whom. Dated scrobbles only (same rule as SESSIONS); a
// first play that OPENS a session has no introducer (p:null — self-found / external source).
// Emitted as a lazy file: slug → [parentSlug|null, "YYYY-MM-DD"] for artists ≥5 plays. The
// lab page derives chains, descendants and gateway rankings client-side from this one map.
{
  const GAP = 30 * 60 * 1000;
  const chron = scrobbles.slice().reverse();                 // oldest → newest
  const playsBy = new Map();
  for (const [artist] of scrobbles) playsBy.set(artist, (playsBy.get(artist) || 0) + 1);
  const firstSeen = new Map();                               // name → { p: parentName|null, ms }
  let prevMs = 0, prevArtist = null;                         // last artist of the running session
  for (const [artist, , , ms] of chron) {
    if (!ms) continue;
    if (ms - prevMs > GAP) prevArtist = null;                // session boundary — no carry-over
    if (!firstSeen.has(artist))
      firstSeen.set(artist, { p: prevArtist !== artist ? prevArtist : null, ms });
    if (prevArtist !== artist) prevArtist = artist;
    prevMs = ms;
  }
  const GEN = {};
  let kept = 0, rooted = 0;
  for (const [name, o] of firstSeen) {
    if ((playsBy.get(name) || 0) < 5) continue;
    // parent must itself clear the floor, or the chain dead-ends on an artist with no entry
    const par = o.p && (playsBy.get(o.p) || 0) >= 5 ? slug(o.p) : null;
    GEN[slug(name)] = [par, new Date(o.ms).toISOString().slice(0, 10)];
    kept++; if (!par) rooted++;
  }
  fs.writeFileSync(path.join(__dirname, "genealogy.js"),
    "// GENERATED by build-data.js — discovery genealogy (lazy; lab prototype).\n" +
    "// slug -> [introducerSlug|null, first-play date]. Dated scrobbles only; >=5 plays.\n" +
    "window.ROTATION_GENEALOGY = " + JSON.stringify(GEN) + ";\n", "utf8");
  console.log(`genealogy.js written — ${kept} artists (${rooted} self-found roots)`);
}

// ─────────── SEASONALITY — month-of-year fingerprints (Phase 3) ───────────
// Aggregate each artist's plays across the 12 months of the year (all years combined). Artists
// whose plays cluster into a 3-month window are "seasonal" — you reach for them at the same time
// of year. Requires ≥2 distinct years so a single binge doesn't masquerade as a season.
let SEASONALITY = null;
{
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthly = new Array(12).fill(0);
  const artMonth = new Map();   // artist -> { m:[12], years:Set }
  for (const [artist, , , ms] of scrobbles) {
    const d = new Date(ms), mo = d.getUTCMonth();
    monthly[mo]++;
    let a = artMonth.get(artist); if (!a) { a = { m: new Array(12).fill(0), years: new Set() }; artMonth.set(artist, a); }
    a.m[mo]++; a.years.add(d.getUTCFullYear());
  }
  const seasonal = [];
  for (const [artist, { m, years }] of artMonth) {
    const tot = m.reduce((a, b) => a + b, 0);
    if (tot < 150 || years.size < 2) continue;
    let best = 0, start = 0;
    for (let s = 0; s < 12; s++) { const w = m[s] + m[(s + 1) % 12] + m[(s + 2) % 12]; if (w > best) { best = w; start = s; } }
    const share = best / tot;
    let pm = 0; for (let i = 1; i < 12; i++) if (m[i] > m[pm]) pm = i;
    seasonal.push({ name: artist, id: slug(artist), hue: hueFor(artist), plays: tot, share, start, peak: pm });
  }
  seasonal.sort((a, b) => b.share - a.share);
  const top = seasonal.filter(s => s.share >= 0.5).slice(0, 12).map(s => ({
    name: s.name, id: s.id, hue: s.hue, plays: s.plays, share: Math.round(s.share * 100),
    window: MON[s.start] + "–" + MON[(s.start + 2) % 12], peak: MON[s.peak],
  }));
  SEASONALITY = { monthly, top };
  console.log(`seasonality: ${seasonal.length} artists ≥150 plays/2+ yrs · ${top.length} strongly seasonal (≥50% in a 3-mo window)`);
}

// ─────────── LIFECYCLE — the shape of each obsession (Phase 3) ───────────
// Per-artist monthly play curves, classified by trajectory: a fast burst that ended (flameout),
// a long steady presence (perennial), or a slow climb (slow-burn). Plus the predictive twist —
// artists burning brightest right now, most of their plays crammed into the last few months
// (the flameout shape, mid-flight).
let LIFECYCLE = null;
{
  const monthIdx = (ms) => { const d = new Date(ms); return d.getUTCFullYear() * 12 + d.getUTCMonth(); };
  const fmtMo = (mi) => Math.floor(mi / 12) + "-" + String(mi % 12 + 1).padStart(2, "0");
  const newestMo = monthIdx(newestMs), cutoff = newestMs - 120 * 86400e3;
  const art = new Map();
  for (const [artist, , , ms] of scrobbles) {
    let a = art.get(artist); if (!a) { a = { m: new Map(), tot: 0, first: ms, last: ms, recent: 0 }; art.set(artist, a); }
    const mi = monthIdx(ms); a.m.set(mi, (a.m.get(mi) || 0) + 1); a.tot++;
    if (ms < a.first) a.first = ms; if (ms > a.last) a.last = ms;
    if (ms >= cutoff) a.recent++;
  }
  const flameout = [], perennial = [], slowburn = [], burning = [];
  for (const [name, a] of art) {
    if (a.tot < 120) continue;
    const firstMo = monthIdx(a.first), lastMo = monthIdx(a.last), span = lastMo - firstMo + 1;
    let peakMo = firstMo, peakN = 0;
    for (const [mi, n] of a.m) if (n > peakN) { peakN = n; peakMo = mi; }
    let bestWin = 0;   // biggest 6-month window's share of all plays = concentration
    for (let s = firstMo; s <= lastMo; s++) { let w = 0; for (let k = s; k < s + 6; k++) w += (a.m.get(k) || 0); if (w > bestWin) bestWin = w; }
    const conc = bestWin / a.tot, sincePeak = newestMo - peakMo, t2p = span > 1 ? (peakMo - firstMo) / (span - 1) : 0;
    const base = { name, id: slug(name), hue: hueFor(name), plays: a.tot, peakM: fmtMo(peakMo) };
    if (conc >= 0.55 && sincePeak >= 12) flameout.push({ ...base, conc: Math.round(conc * 100) });
    else if (span >= 48 && (newestMo - lastMo) <= 12 && conc < 0.4) perennial.push({ ...base, years: Math.round(span / 12) });
    else if (t2p >= 0.6 && span >= 18) slowburn.push({ ...base });
    if (a.recent >= 35) burning.push({ name, id: slug(name), hue: hueFor(name), recentPlays: a.recent, plays: a.tot, flarePct: Math.round(a.recent / a.tot * 100), since: iso(a.first).slice(0, 7) });
  }
  const byPlays = (arr) => arr.sort((x, y) => y.plays - x.plays);
  burning.sort((x, y) => y.recentPlays - x.recentPlays);
  LIFECYCLE = {
    flameout: byPlays(flameout).slice(0, 5), perennial: byPlays(perennial).slice(0, 5), slowburn: byPlays(slowburn).slice(0, 4),
    burningNow: burning.slice(0, 6),
  };
  console.log(`lifecycle: ${flameout.length} flameouts · ${perennial.length} perennials · ${slowburn.length} slow-burns · ${burning.length} burning now`);
}

const INSIGHTS = {
  MILESTONES, OBSESSIONS, ALBUM_OBSESSIONS, LIFETIME_TRACKS, FLAMEOUTS, INCUBATION, ARTIST_ERAS, COMEBACKS, WONDERS, NIGHT_OWLS, DISCOVERIES, YEAR_PEAKS, ON_THIS_DAY,
  AUDIO_DRIFT, ADOPTION, CONNECTIONS, RECOMMENDATIONS, REVISIT, LIFESPAN, LANGUAGE, LINEUPS, MOOD, THEMES,
  STREAK: { best, start: bestStart, end: bestEnd, current },
  UNDERGROUND, GEOGRAPHY, STYLE_ATLAS, SESSIONS, SEASONALITY, LIFECYCLE,
};

// ─────────── SEARCH INDEX (separate lazy-loaded file) ───────────
const searchRows = [];
for (const [artist, plays] of rankedArtists) {
  if (plays < 3) break;
  const s = span.get(artist);
  if (!s) continue; // undated-only artists
  const yc = artistYear.get(artist) || new Map();
  let peakYear = 0, peakPlays = 0;
  for (const [y, c] of yc) if (c > peakPlays) { peakPlays = c; peakYear = y; }
  searchRows.push([artist, plays, iso(s[0]), iso(s[1]), peakYear, peakPlays]);
}
const searchOut = `// GENERATED by build-data.js — artist search index ([name, plays, first, last, peakYear, peakPlays])
window.ROTATION_SEARCH = ${JSON.stringify(searchRows)};
`;
fs.writeFileSync(path.join(__dirname, "search-index.js"), searchOut, "utf8");

// ─────────── MEDIA INDEX (separate lazy-loaded file — every album & track you've played) ───────────
// Powers the header search (songs/albums by title), album pages AND Explore's full-depth lists.
//   albums = [title, artistIdx, plays, firstYear, lastYear, yearTail, coverUrl]
//   tracks = [title, artistIdx, plays, albumIdx, yearTail]   (albumIdx → albums[], or -1)
// yearTail is sparse: a single number = the only year played (its plays = total); or a flat
// [year, plays, year, plays, …] for multi-year. 76% of tracks are single-year, so this stays lean.
const _mArtists = [], _mIdx = new Map();
const _ai = (name) => { let i = _mIdx.get(name); if (i == null) { i = _mArtists.length; _mArtists.push(name); _mIdx.set(name, i); } return i; };
const _tail = (ym) => {
  if (!ym || ym.size === 0) return 0;
  const e = [...ym.entries()].sort((a, b) => a[0] - b[0]);
  if (e.length === 1) return e[0][0];
  const flat = []; for (const [y, p] of e) flat.push(y, p); return flat;
};
// albums first → assign each a stable index so tracks can reference it
const _albumEntries = [...albumPlays.entries()].sort((a, b) => b[1] - a[1]);
const albumKeyIdx = new Map();
const mediaAlbums = _albumEntries.map(([key, plays], i) => {
  albumKeyIdx.set(key, i);
  const ix = key.indexOf("\x00"), artist = key.slice(0, ix), title = key.slice(ix + 1);
  const sp = albumSpan.get(key);
  return [title, _ai(artist), plays, sp ? sp[0] : 0, sp ? sp[1] : 0, _tail(albumYear.get(key)), albArt(artist, title) || 0, albMeta(artist, title)];   // [6]=cover url, [7]=[releaseYear,typeChar,label]
});
// ─────────── RELEASED-TRACKLIST INDEX (album homing authority — mb-releases.json `discs`) ───────────
// The single mb-releases.json (already parsed once for MB_KIND) also carries a per-artist `discs`
// field: discs[squashAlbumKey] = [[discTitle, [trackTitle, …]], …] — the OFFICIAL tracklist of the
// canonical release, disc boundaries and order intact (557 artists / ~3,346 albums, PARTIAL coverage:
// many albums have no disc data and fall through to the existing heuristic untouched).
//
// Two lookups per artist (keyed by artistSlug):
//   trackHome:  Map(_kSquash(trackTitle) → [{ albSquash, disc, pos, discTitle, standardDisc }, …])
//               where albSquash is the disc's album key (= _kSquash of the album title). A track can
//               appear on more than one release (e.g. an LP and a live album) → array, so STEP 2 can
//               ask "does THIS home list it? does ANOTHER discs-backed home list it?".
//   albTitle:   Map(_kSquash(corpusAlbumTitle) → corpusAlbumTitle) — bridges a disc's squash-key back
//               to the album STRING the corpus actually uses (so homing stays on canonical album keys
//               produced by canonAlbum, never raw scrobble strings). Built from albumPlays.
// `standardDisc` = the FIRST disc (di===0) of a release = the LP proper; later discs (di>0) are
// bonus/deluxe discs, so a track listed only there is flagged bonus in STEP 3/4.
// A discs-backed release that is really a box-set / anthology / "essential" / "original album" bundle is
// NOT a valid re-home target even though its track-count reads as an "album": homing a studio song onto a
// compilation is never the improvement we want. albumKind's comp regex only catches greatest-hits/best-of/
// anthology/collection/singles — this widens the net for the re-home eligibility check ONLY (the album row
// itself stays browsable). Studio LPs missing from `discs` (partial MB coverage) then simply keep the song.
const _reHomeBlockedName = /\b(essential|original album (classics|series)|music bank|box ?set|anthology|collection|complete|deluxe box|the singles|studio album|greatest hits|best of)\b/i;
// A disc-title marker for NON-STANDARD material — a live/unplugged/demo/instrumental/remix/etc. disc
// carries RE-RECORDINGS of songs that mostly belong to OTHER albums, so it must NOT feed the homing
// index: Sepultura's studio LP Quadra ships a deluxe "Live in Japan 2018" disc whose tracklist lists
// Ratamahatta (a Roots song), which re-homed Ratamahatta onto Quadra. The `discs` studio-guard filters
// target ALBUMS by kind but not DISCS within a studio album — this closes that gap at disc granularity.
const _nonStandardDisc = /\b(live|unplugged|acoustic|demos?|rehearsals?|instrumentals?|karaoke|remix(?:es|ed)?|re-?recorded|b[- ]?sides?|rarities|outtakes?|commentary|interview|sessions?|soundcheck|a cappella|orchestral|symphonic|piano versions?|stripped|jam)\b/i;
// keep = this disc is the standard studio disc (feeds homing). An EMPTY title is the LP proper; a title
// carrying "original album" is an explicit studio-master marker (e.g. "Original Album Remastered", or
// Beneath the Remains' "Original Album / 2004 Bonus Tracks / …Florida Sessions/Mixdown" — kept despite
// the "sessions" token); a title equal/similar to the album title (squash equal, or one is a prefix of
// the other, or the album key contains it — the LP-proper disc inside a box, or a remaster tag) is the
// standard disc. Only when none of those hold AND the title reads as non-standard material do we skip it.
const _isStandardDisc = (albSquash, discTitle) => {
  const dt = discTitle || "";
  if (!dt) return true;                                   // empty title = the LP proper
  if (/original album/i.test(dt)) return true;            // explicit studio-master marker
  const ds = _kSquash(dt);
  if (ds && (ds === albSquash || albSquash.startsWith(ds) || ds.startsWith(albSquash) || albSquash.includes(ds))) return true; // similar to album title
  return !_nonStandardDisc.test(dt);                      // else drop only if flagged non-standard material
};
const DISCS_BY_ARTIST = (() => {
  const out = new Map();
  let raw; try { raw = JSON.parse(fs.readFileSync(path.join(__dirname, "mb-releases.json"), "utf8")); }
  catch (e) { console.log("homing: mb-releases.json missing — released-tracklist homing OFF"); return out; }
  for (const [aSlug, e] of Object.entries(raw)) {
    if (!e || !e.discs) continue;
    const trackHome = new Map();
    for (const [albSquash, discs] of Object.entries(e.discs)) {
      if (!Array.isArray(discs)) continue;
      // Skip bonus/live/demo/etc. discs whose tracklists are re-recordings of other-album songs. When an
      // album has ONLY such discs, it contributes nothing to the index (conservative — never guess a home
      // off a live/comp disc). `di` (the true disc index) is retained so standardDisc still reflects di===0.
      discs.forEach(([discTitle, trackList], di) => {
        if (!_isStandardDisc(albSquash, discTitle)) return;
        (trackList || []).forEach((tt, pos) => {
          const k = _kSquash(tt);
          if (!k) return;
          let arr = trackHome.get(k); if (!arr) trackHome.set(k, arr = []);
          arr.push({ albSquash, disc: di, pos: pos + 1, discTitle: discTitle || "", standardDisc: di === 0 });
        });
      });
    }
    out.set(aSlug, trackHome);
  }
  return out;
})();
// artistSlug → Set(albSquash) — which album keys have an official discs tracklist at all. Used to detect
// a track homed to a discs-backed album but absent from its tracklist (a deluxe/bonus/live straggler).
const DISCS_BACKED_ALBUMS = (() => {
  const out = new Map();
  let raw; try { raw = JSON.parse(fs.readFileSync(path.join(__dirname, "mb-releases.json"), "utf8")); } catch (e) { return out; }
  for (const [aSlug, e] of Object.entries(raw)) {
    if (!e || !e.discs) continue;
    out.set(aSlug, new Set(Object.keys(e.discs)));
  }
  return out;
})();
// artistSlug → Map(_kSquash(corpusAlbumTitle) → corpusAlbumTitle). Lets a disc's albSquash resolve to
// the corpus album key. Where two corpus titles squash the same, the higher-play one wins (albumPlays
// is not sorted, so compare explicitly).
const ALB_BY_SQUASH = (() => {
  const out = new Map();
  for (const [k, plays] of albumPlays) {
    const ix = k.indexOf("\x00"); if (ix < 0) continue;
    const artist = k.slice(0, ix), title = k.slice(ix + 1);
    const aSlug = slug(artist), sq = _kSquash(title);
    if (!sq) continue;
    let m = out.get(aSlug); if (!m) out.set(aSlug, m = new Map());
    const cur = m.get(sq);
    if (!cur || plays > (albumPlays.get(artist + "\x00" + cur) || 0)) m.set(sq, title);
  }
  return out;
})();
// homingLog: every track whose album pointer MOVED vs the pre-reshape heuristic (owner review).
const homingLog = [];
const albDNA = new Map();   // albumIdx → play-weighted accumulator over 6 audio axes
const mediaTracks = [...trackPlays.entries()].sort((a, b) => b[1] - a[1]).map(([key, plays]) => {
  const ix = key.indexOf("\x00"), artist = key.slice(0, ix), title = key.slice(ix + 1);
  if (!title) return null;
  let albumIdx = -1; const m = trackAlbumCount.get(key);
  if (m) {
    let best = null, bv = 0; for (const [ak, c] of m) if (c > bv) { bv = c; best = ak; }
    // Singles re-home (Fuad 2026-07-26): when the most-scrobbled key is a kind=single
    // release but a host LP/EP carries the same song, the track's home is the host —
    // LP > EP > single, "it's essentially where the song belongs". The single release
    // keeps its own album row and scrobbles; only this pointer moves (~690 tracks).
    if (best != null && albumKind(artist, best) === "single") {
      const h = singleHost(artist, title, best);
      if (h && albumKeyIdx.has(artist + "\x00" + h.title)) best = artist + "\x00" + h.title;
    }
    if (best != null && albumKeyIdx.has(best)) albumIdx = albumKeyIdx.get(best);
  }
  // ── STEP 2/3: released-tracklist reconciliation. STRICT IMPROVEMENT — only overrides the heuristic
  // on POSITIVE disagreement: the current best does NOT list the song but another discs-backed album of
  // the artist's DOES. Studio bodies already homed correctly are left untouched. Also yields the disc
  // position (STEP 3 trackNo) and a bonus/beside flag (STEP 4). `homed` = the disc entry we adopted.
  let discNo = 0, discBonus = 0;  // [5] disc position, and bonus flag (1) for non-standard/beside rows
  const aSlug = slug(artist);
  const trackHome = DISCS_BY_ARTIST.get(aSlug);
  const albMap = ALB_BY_SQUASH.get(aSlug);
  if (trackHome && albMap) {
    const homes = trackHome.get(_kSquash(title)) || null;
    if (homes && homes.length) {
      // resolve each disc-home to a corpus album key that actually exists in the media index
      const resolved = homes.map(h => {
        const t = albMap.get(h.albSquash);
        const ak = t != null ? artist + "\x00" + t : null;
        return (ak && albumKeyIdx.has(ak)) ? { ...h, ak, idx: albumKeyIdx.get(ak) } : null;
      }).filter(Boolean);
      if (resolved.length) {
        const curKey = albumIdx >= 0 ? mediaAlbums[albumIdx] && (artist + "\x00" + mediaAlbums[albumIdx][0]) : null;
        // does the CURRENT best home list this track? (any disc of it) — when it appears on more than one
        // disc of the SAME release (standard + deluxe reissue), prefer the STANDARD disc so the position is
        // the canonical one and two rows can't both claim a deluxe number.
        const onCurrentAll = curKey ? resolved.filter(r => r.ak === curKey) : [];
        const onCurrent = onCurrentAll.sort((a, b) => (b.standardDisc - a.standardDisc) || (a.pos - b.pos))[0] || null;
        // is the current home already a STUDIO body (album/ep)? A studio home is authoritative even when
        // mb-releases has no disc data for it (partial coverage) — we must NOT move a studio track onto a
        // live album / box set / best-of just because THAT release's tracklist happened to be in `discs`.
        const curStudio = albumIdx >= 0 && (albumKind(artist, mediaAlbums[albumIdx][0]) === "album" || albumKind(artist, mediaAlbums[albumIdx][0]) === "ep");
        if (onCurrent) {
          // studio body already correct — keep home, adopt the official position + bonus flag
          discNo = onCurrent.pos;
          if (!onCurrent.standardDisc) discBonus = 1;   // listed only on a bonus/deluxe disc
        } else if (!curStudio) {
          // current best is NOT a studio home (single/comp/live/unhomed) and does NOT list this track →
          // re-home ONLY onto a genuine STUDIO release (album/ep) whose official tracklist lists it. This
          // is the strict-improvement case: a track sitting on a single/comp finds its studio LP. Never
          // targets a live/comp/ost/box-set release (albumKind filters those out).
          const studioHomes = resolved.filter(r => {
            const t = mediaAlbums[r.idx][0];
            const k = albumKind(artist, t);
            return (k === "album" || k === "ep") && !_reHomeBlockedName.test(t);
          });
          if (studioHomes.length) {
            studioHomes.sort((a, b) => (b.standardDisc - a.standardDisc) || (mediaAlbums[b.idx][2] - mediaAlbums[a.idx][2]));
            const pick = studioHomes[0];
            if (albumIdx !== pick.idx) {
              homingLog.push({ artist, title, from: albumIdx >= 0 ? mediaAlbums[albumIdx][0] : "(unhomed)", to: mediaAlbums[pick.idx][0], plays });
            }
            albumIdx = pick.idx;
            discNo = pick.pos;
            if (!pick.standardDisc) discBonus = 1;
          }
        }
        // curStudio && !onCurrent: the studio LP is the home but has no disc data for this exact title
        // (spelling drift, or the title lives on a bonus disc we can't see) — leave the pointer, no number.
      }
    }
    // STEP 3 completeness: if the FINAL home album is itself discs-backed but this track is NOT on its
    // official tracklist (discNo still 0 → we never matched it there), it's a deluxe/bonus/live straggler
    // that Spotify happens to number past the standard tracklist. Flag it bonus and suppress the Spotify
    // number so it can't collide with — or overflow past — the real tracklist. Studio bodies stay clean.
    if (!discNo && albumIdx >= 0) {
      const homeSq = _kSquash(mediaAlbums[albumIdx][0]);
      const dm = DISCS_BACKED_ALBUMS.get(aSlug);
      if (dm && dm.has(homeSq)) discBonus = 1;   // homed to a discs-backed album but unlisted → bonus
    }
  }
  const td = trackData(artist, title);
  const hasFeat = td && td.length >= 10;
  if (hasFeat && albumIdx >= 0) {   // accumulate album DNA: [energy, valence, dance, acoustic, instr, tempo]
    let a = albDNA.get(albumIdx); if (!a) albDNA.set(albumIdx, a = { s: [0, 0, 0, 0, 0, 0], w: 0 });
    // s[5] = TEMPO was never accumulated (Fuad 2026-08-31: "every song features a BPM 50"). Five of
    // the six axes were summed and tempo silently stayed 0, so every album read 50 + 0 = 50 bpm —
    // the floor of the 50..190 remap, which looks like a real number and so went unnoticed.
    // TRACKDATA idx: 4 energy · 5 valence · 6 acoustic · 7 tempo · 8 dance · 9 instr (all 0..100).
    a.s[0] += td[4] * plays; a.s[1] += td[5] * plays; a.s[2] += td[8] * plays; a.s[3] += td[6] * plays; a.s[4] += td[9] * plays; a.s[5] += td[7] * plays; a.w += plays;
  }
  const row = [title, _ai(artist), plays, albumIdx, _tail(trackYear.get(key))];
  // [5] = track number. The released-tracklist disc position (discNo) is AUTHORITATIVE — it fixes
  // duplicate-position collisions, overflow numbers, and edition-scrambled Spotify numbers. Spotify's
  // number stays only as the fallback where no discs tracklist matched.
  // A bonus/beside row keeps a number ONLY when it is a real disc position (e.g. bonus-disc pos 1..N);
  // an UNLISTED straggler (discNo 0) drops the Spotify number entirely so it can't collide with or
  // overflow the standard tracklist — its own bonus section restarts numbering in the UI.
  const tn = discBonus ? discNo : (discNo || (td && td[3]) || 0);
  // [8] = bonus flag (STEP 3/4): the track is listed on a NON-standard disc, OR is a variant recording
  // sitting beside its studio base — the UI drops it below the standard tracklist under a divider.
  // Fixed index: pad [5]/[6]/[7] so [8] always lands at 8. Energy/valence stay null when absent so the
  // UI mood dots still gate on real data (t[6] != null), not on the pad.
  if (discBonus) {
    row.push(tn, hasFeat ? td[4] : null, hasFeat ? td[5] : null, 1);
  } else {
    if (tn || hasFeat) row.push(tn);            // [5] track number (0 placeholder when only features present)
    if (hasFeat) row.push(td[4], td[5]);        // [6] energy, [7] valence (0..100) — tracklist mood dots
  }
  return row;
}).filter(Boolean);
// ─────────── STEP 4: variant-beside-base flag ───────────
// The ~150 `variant` folds (folds.json §3d) that KEEP their own row but land on the SAME album row as
// their studio base (acoustic/cover/live/remix sitting beside the original) must not interleave into
// the standard tracklist. Flag them bonus ([8]=1) so the UI drops them below the divider. Variants whose
// album is legitimately a distinct live/remix RELEASE (~300) home to a DIFFERENT albumIdx than their
// base → left untouched (that class is correct as-is). Done as a post-pass so base albumIdx is known
// regardless of emit order. Never re-homes — only sets the flag; the row stays where homing put it.
{
  const idxByKey = new Map();       // artistSlug~slug(title) → albumIdx (for base lookup)
  for (const r of mediaTracks) idxByKey.set(slug(_mArtists[r[1]]) + "~" + slug(r[0]), r[3]);
  let flagged = 0;
  for (const r of mediaTracks) {
    if (r[3] < 0) continue;                                    // unhomed — nothing to sit beside
    if (r.length > 8 && r[8] === 1) continue;                  // already flagged in STEP 3
    const vk = slug(_mArtists[r[1]]) + "~" + slug(r[0]);
    const baseKey = VARIANT_OF[vk];
    if (!baseKey) continue;                                    // not a variant recording
    const baseIdx = idxByKey.get(baseKey);
    if (baseIdx == null || baseIdx !== r[3]) continue;         // variant lives on its OWN release → keep
    // variant sits on the base's album row → flag bonus (pad to fixed index 8)
    while (r.length < 8) r.push(r.length === 5 ? (r[5] || 0) : null);
    r[8] = 1; flagged++;
  }
  console.log(`homing: STEP4 flagged ${flagged} variant-beside-base rows (of ${Object.keys(VARIANT_OF).length} variant links)`);
}
// homing reconciliation summary (owner review) — re-homed pointers written to a sidecar for the report.
console.log(`homing: STEP2 re-homed ${homingLog.length} track→album pointers (positive-disagreement only)`);
try {
  const _rd = path.join(__dirname, "..", ".dtmp", "fold-reshape");
  fs.mkdirSync(_rd, { recursive: true });
  fs.writeFileSync(path.join(_rd, "rehomed.json"),
    JSON.stringify(homingLog.sort((a, b) => b.plays - a.plays), null, 1));
} catch (e) { /* report still prints the count if the sidecar can't be written */ }
// play-weighted mean DNA per album → media album row [8] = [energy, valence, dance, acoustic, instr, tempo] (0..100)
for (const [ai, a] of albDNA) if (a.w) mediaAlbums[ai][8] = a.s.map(x => Math.round(x / a.w));
// [9] = Spotify total_tracks (sparse) → per-album completeness ("played 7 of 12")
for (const r of mediaAlbums) {
  const tt = aliasedBySlugAlbum(ALBTRACKS, slug(_mArtists[r[1]]), slug(r[0]));
  if (tt) { if (r[8] === undefined) r[8] = 0; r[9] = tt; }
}
const mediaOut = `// GENERATED by build-data.js — lazy media index (header search + album pages + Explore depth).
// albums = [title, artistIdx, plays, firstYear, lastYear, yearTail, coverUrl, meta, dna, totalTracks]
//   dna [8] = [energy, valence, dance, acoustic, instr, tempo] play-weighted 0..100 (sparse, 0 when only [9] present)
//   [9] = Spotify album total_tracks (sparse) — per-album completeness
// tracks = [title, artistIdx, plays, albumIdx, yearTail, trackNo?, energy?, valence?, bonus?]
//   [5] trackNo = the released-tracklist disc POSITION (mb-releases.json discs) where matched, else the
//       Spotify number as fallback. [6]/[7] energy/valence 0..100 (null when no audio features).
//   [8] bonus = 1 when the track is listed only on a non-standard/deluxe disc OR is a variant recording
//       sitting beside its studio base — the album page renders these below the standard tracklist.
//       ([5]/[6]/[7]/[8] sparse; energy/valence are null-padded when [8] is present so mood dots gate on t[6]!=null)
window.ROTATION_MEDIA = { artists: ${JSON.stringify(_mArtists)}, tracks: ${JSON.stringify(mediaTracks)}, albums: ${JSON.stringify(mediaAlbums)} };
`;
fs.writeFileSync(path.join(__dirname, "media-index.js"), mediaOut, "utf8");
console.log(`media index: ${mediaTracks.length} tracks · ${mediaAlbums.length} albums · ${_mArtists.length} artists (${(mediaOut.length / 1024).toFixed(0)} KB)`);

// ─────────── ALBUM ALIAS MAP (generated lazy file) ───────────
// "<artistSlug>~<variantAlbumSlug>" → "<artistSlug>~<canonAlbumSlug>", so any slug-keyed join
// (covers, album-about, front-to-back byAlbum) that still holds a pre-canon variant slug resolves
// to the merged album. Recorded at ingest into ALBUM_ALIAS whenever a title was stripped.
const _aliasOut = "// GENERATED by build-data.js — album edition-variant → canonical slug map (lazy).\n"
  + "window.ROTATION_ALBUM_ALIAS = " + JSON.stringify(ALBUM_ALIAS) + ";\n";
fs.writeFileSync(path.join(__dirname, "album-alias.js"), _aliasOut, "utf8");
console.log(`album-alias.js: ${Object.keys(ALBUM_ALIAS).length} variant→canonical aliases (${(_aliasOut.length / 1024).toFixed(0)} KB)`);

// ─────────── VARIANT-OF MAP (generated lazy file) ───────────
// "<artistSlug>~<variantTitleSlug>" → "<artistSlug>~<canonTitleSlug>" for curated `variant` folds
// (live/demo tracks + rare distinct live albums, from folds.json §3d). Unlike an alias/fold, the
// variant KEEPS its own row + plays; consumers resolve THROUGH this map for reads + album-
// completeness (deduping on the canonical slug so a live variant can't inflate "played N of M").
// Same emit shape as album-alias.js. Empty {} when folds.json is absent — the file still ships.
const _variantOut = "// GENERATED by build-data.js — curated variant → canonical slug map (lazy).\n"
  + "window.ROTATION_VARIANT_OF = " + JSON.stringify(VARIANT_OF) + ";\n";
fs.writeFileSync(path.join(__dirname, "variant-of.js"), _variantOut, "utf8");
console.log(`variant-of.js: ${Object.keys(VARIANT_OF).length} variant→canonical links (${(_variantOut.length / 1024).toFixed(0)} KB)`);

// ─────────── ALBUM-ABSORB MAP (generated lazy file) ───────────
// "<singleAlbumSlug>" → "<targetLpSlug>" for singles→LP `absorb` folds (folds.json albums[]).
// LINK, NOT MERGE: the single KEEPS its own album row + plays (still browsable/clickable in the
// albums pane). Consumers resolve THROUGH this map so AGGREGATIONS (artist flowmap) attribute the
// single's plays to the LP, and track→album navigation lands on the LP. Same emit/key shape as
// album-alias.js / variant-of.js. Empty {} when folds.json is absent — the file still ships.
const _absorbOut = "// GENERATED by build-data.js — singles→LP absorb (single album slug → target LP slug), lazy.\n"
  + "window.ROTATION_ALBUM_ABSORB = " + JSON.stringify(ALBUM_ABSORB) + ";\n";
fs.writeFileSync(path.join(__dirname, "album-absorb.js"), _absorbOut, "utf8");
console.log(`album-absorb.js: ${Object.keys(ALBUM_ABSORB).length} single→LP absorb links (${(_absorbOut.length / 1024).toFixed(0)} KB)`);

// ─────────── LIKED-SONGS META (generated lazy file) ───────────
// Joins Fuad's ~3,592 Spotify saved tracks (spotify-liked-src.json, committed taste data from the
// gitignored export — see extract-liked.js) against the scrobble record to make a navigable,
// bucketed "liked" view. For each saved track we resolve plays (post-fold), first/last-play years,
// and derive ONE bucket that says what the save turned into. Emitted lazily as liked-meta.js
//   window.ROTATION_LIKED_META = { "<artistSlug>~<trackSlug>": [spotifyId, plays, firstYear, bucketCode, ..., albumSlug] }
// keyed EXACTLY like the media-index track key (slug(artist)~slug(track)) so a row can go("track", key)
// and like the spotify-liked.js hearts. Unmatched saves (no scrobble) still ship (plays 0). The
// legend maps bucketCode → {code,label}. Gitignored + apps.json-listed exactly like variant-of.js.
{
  let LIKED_SRC = [];
  try { LIKED_SRC = JSON.parse(fs.readFileSync(path.join(__dirname, "spotify-liked-src.json"), "utf8")); } catch (e) {}
  // real save months (trackId → "YYYY.MM") from the one-time OAuth pull — see pull-liked-added.js
  let LIKED_ADDED = null;
  try { LIKED_ADDED = JSON.parse(fs.readFileSync(path.join(__dirname, "liked-added.json"), "utf8")); } catch (e) {}
  let BRANDS = {};
  try { BRANDS = JSON.parse(fs.readFileSync(path.join(__dirname, "liked-brands.json"), "utf8")); } catch (e) {}
  // per-track audio handles (tempo BPM / energy / valence, 0..100) resolved from the local
  // audio-features parquet by Spotify track id — see extract-liked-audio.js. Ids the parquet
  // misses fall back to the 0..100 TRACKDATA store (tempo de-normalised back to BPM) below.
  let LIKED_AUDIO = {};
  try { LIKED_AUDIO = JSON.parse(fs.readFileSync(path.join(__dirname, "liked-audio.json"), "utf8")); } catch (e) {}
  // tempo idx7 in the TRACKDATA store is normalised (bpm-50)/140*100 → invert to whole BPM.
  const tdTempoToBpm = (t) => Math.round(50 + (t / 100) * 140);
  // family + a primary human subgenre label per (canon) artist name, for the genre chip row +
  // subgenre dropdown. familyIdxByName is the same classifier the Sound Map uses; the subgenre is
  // the first SPECIFIC (non-umbrella) tag/style that classifies to that family (clean label).
  const _likedSubMemo = new Map();
  const primarySubOf = (name) => {
    if (_likedSubMemo.has(name)) return _likedSubMemo.get(name);
    const vocab = [...(((META[name] || {}).tags) || []), ...cachedTags(name).map(t => t[0]), ...stylesOf(name).map(s => s.toLowerCase())];
    let sub = "";
    for (const tg of vocab) { if (GENERIC.has(tg)) continue; if (classifyTag(tg)) { sub = tg; break; } }
    _likedSubMemo.set(name, sub);
    return sub;
  };

  // bucket legend — codes are stable ints; the view labels them. Priority order (first match wins)
  // is the array order below: fresh > doorway > canon > lived > left > mid.
  const LEGEND = [
    { code: 0, key: "fresh",   label: "Fresh" },
    { code: 1, key: "doorway", label: "Doorways" },
    { code: 2, key: "canon",   label: "Canon" },
    { code: 3, key: "lived",   label: "Lived-in" },
    { code: 4, key: "left",    label: "Saved-and-left" },
    { code: 5, key: "mid",     label: "Mid" },
  ];
  const CODE = Object.fromEntries(LEGEND.map(l => [l.key, l.code]));

  // Scrobble-side lookup: slug(artist)~slug(track) → aggregate. Built from trackPlays (canon
  // artist \x00 folded track), so folds/HAND_MERGE are already applied. If two raw spellings fold
  // to the same slug key their plays sum and the widest span wins.
  const tk = new Map();  // slugKey → { plays, firstMs, lastMs, artist(canon name) }
  for (const [k, plays] of trackPlays) {
    const ix = k.indexOf("\x00"); if (ix < 0) continue;
    const artist = k.slice(0, ix), title = k.slice(ix + 1);
    if (!title) continue;
    const sk = slug(artist) + "~" + slug(title);
    const fMs = trackFirstMs.get(k), lMs = trackLastMs.get(k);
    let e = tk.get(sk);
    if (!e) { e = { plays: 0, firstMs: fMs, lastMs: lMs, artist }; tk.set(sk, e); }
    e.plays += plays;
    if (fMs !== undefined && (e.firstMs === undefined || fMs < e.firstMs)) e.firstMs = fMs;
    if (lMs !== undefined && (e.lastMs === undefined || lMs > e.lastMs)) e.lastMs = lMs;
  }

  // Per-artist sorted play timestamps — ONLY for artists that own a liked track, so we can count
  // an artist's plays strictly BEFORE a given track's first play (the "canon" signal: you'd already
  // logged 100+ of this artist before you first heard — and then saved — this song). Built once.
  const likedArtistSlugs = new Set();
  for (const r of LIKED_SRC) likedArtistSlugs.add(slug(canon(r.artist)));
  const artistMsList = new Map();  // artistSlug → sorted-asc ms[]
  for (const [artist, , track, ms] of scrobbles) {
    const as = slug(artist);
    if (!likedArtistSlugs.has(as)) continue;
    let a = artistMsList.get(as); if (!a) artistMsList.set(as, a = []);
    a.push(ms);
  }
  for (const a of artistMsList.values()) a.sort((x, y) => x - y);
  const artistTotalPlays = new Map();  // artistSlug → total plays (post-fold), for the doorway "stuck around" test
  for (const [name, plays] of artistPlays) {
    const as = slug(name);
    artistTotalPlays.set(as, (artistTotalPlays.get(as) || 0) + plays);
  }
  const countBefore = (arr, ms) => {  // # of plays strictly before ms (binary search on sorted arr)
    let lo = 0, hi = arr.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (arr[mid] < ms) lo = mid + 1; else hi = mid; }
    return lo;
  };

  const yearOf = (ms) => ms === undefined ? 0 : new Date(ms).getUTCFullYear();
  const DAY = 86400e3;
  const FRESH_MS = newestMs - 90 * DAY;   // saved-track first play within last 90 days of the dataset

  const META = {};
  const dist = { fresh: 0, doorway: 0, canon: 0, lived: 0, left: 0, mid: 0, brand: 0 };
  let matched = 0, unmatched = 0, dupes = 0;
  const LIKED_SUBS = {};   // artistSlug → primary subgenre label (for the subgenre dropdown)
  const famUsed = new Set();
  let audParquet = 0, audFallback = 0, audNone = 0;   // coverage report
  const LIKED_AX = {};   // liked key → TA-shaped extended-axis row (see the fold in the loop below)

  for (const r of LIKED_SRC) {
    const cName = canon(r.artist);
    const aSlug = slug(cName);                     // fold artist name before slugging (HAND_MERGE)
    const key = aSlug + "~" + slug(r.track);       // display/route key — matches media-index + hearts
    if (META[key]) { dupes++; continue; }          // a save can appear once; first wins

    const hit = tk.get(key);
    const plays = hit ? hit.plays : 0;
    const firstMs = hit ? hit.firstMs : undefined;
    const firstYear = yearOf(firstMs);
    if (hit) matched++; else unmatched++;

    // signals
    const artistArr = artistMsList.get(aSlug) || [];
    const artistFirstMs = firstSeen.has(hit ? hit.artist : "") ? firstSeen.get(hit.artist) : (artistArr.length ? artistArr[0] : undefined);
    const artistTotal = artistTotalPlays.get(aSlug) || 0;
    const beforeCount = (firstMs !== undefined && artistArr.length) ? countBefore(artistArr, firstMs) : 0;
    const withinDoorway = (firstMs !== undefined && artistFirstMs !== undefined && (firstMs - artistFirstMs) <= 7 * DAY);
    // doorway "the artist stuck around" guard. A doorway is a GATEWAY: the saved song opened onto a
    // substantial relationship with the artist, not a two-song sample. Require the artist to have
    // grown well past this one track — total plays >= max(15, 4× this track's plays). This keeps
    // doorway a distinct, meaningful bucket rather than swallowing every day-one album binge (tuned
    // 2026: the plain "within 7 days + any stickiness" rule tagged ~24% of the library — degenerate).
    const artistStuck = artistTotal >= Math.max(15, 4 * plays);

    // derive bucket (priority order = LEGEND order)
    let bkey;
    if (firstMs !== undefined && firstMs >= FRESH_MS) bkey = "fresh";
    else if (withinDoorway && artistStuck && plays >= 1) bkey = "doorway";
    else if (beforeCount >= 100) bkey = "canon";
    else if (plays >= 15) bkey = "lived";
    else if (plays <= 2) bkey = "left";
    else bkey = "mid";

    // manual brand override (owner's hook): key → label string in liked-brands.json. A brand
    // REPLACES the derived bucket entirely, taking its own code (appended to the legend). We still
    // count the derived bucket in `dist` for the report, but the emitted code is the brand's.
    dist[bkey]++;

    // ── genre: family index (aligns with FAMILIES/the Sound Map) + a primary subgenre label ──
    let famId = familyIdxByName(cName);
    if (famId < 0) famId = null; else famUsed.add(famId);
    if (famId != null && !LIKED_SUBS[aSlug]) { const sub = primarySubOf(cName); if (sub) LIKED_SUBS[aSlug] = sub; }

    // ── audio handles: prefer the parquet-resolved BPM (by track id), else the 0..100 store ──
    let tempoBpm = null, energy = null, valence = null;
    const pa = LIKED_AUDIO[r.id];
    if (pa) { tempoBpm = pa[0]; energy = pa[1]; valence = pa[2]; audParquet++; }
    // extended DNA axes (2026-08-12): 11-field liked-audio rows also carry dance/acoustic/instr/
    // speech/live/loud/key/mode. Emit them TA-shaped (same slots as ROTATION_TRACKAUDIO, length 16)
    // into a liked-scoped sidecar so unscrobbled saves stop falling out of the tuner as "without
    // data". The view still prefers the corpus track-audio row when one exists.
    if (pa && pa.length >= 11) {
      const tempoN = Math.max(0, Math.min(100, Math.round((pa[0] - 50) / 140 * 100)));
      LIKED_AX[key] = [null, null, null, null, pa[1], pa[2], pa[4], tempoN, pa[3], pa[5], pa[8], pa[6], pa[7], pa[9], pa[10], null];
    }
    else {
      const td = aliasedBySlugAlbum(TRACKDATA, aSlug, slug(r.track));
      if (td && td.length >= 10) { tempoBpm = tdTempoToBpm(td[7]); energy = td[4]; valence = td[5]; audFallback++; }
      else audNone++;
    }

    const brand = BRANDS[key];
    const code = brand ? (dist.brand++, brandCode(brand)) : CODE[bkey];
    // album slug for the row's cover thumbnail (client joins it against the media-index album
    // covers, keyed "<artistSlug>~<albumSlug>"). Resolve through the singles→LP absorb map so an
    // absorbed single lands on its host LP's cover; the album half is fold-invariant, so aSlug
    // (already HAND_MERGE-folded above) is the right artist prefix. "" when the save has no album.
    let albumSlug = r.album ? slug(r.album) : "";
    if (albumSlug) {
      const absorbed = ALBUM_ABSORB[aSlug + "~" + albumSlug];
      if (absorbed) albumSlug = absorbed.slice(absorbed.indexOf("~") + 1);
    }
    // slot 9: the month for the "2010.10" column (Fuad 2026-08-22). REAL save months come from
    // liked-added.json when it exists (one-time OAuth pull, see pull-liked-added.js — the
    // account export carries no dates, verified). Fallback: first SCROBBLE month, which for a
    // saved track almost always shadows the save. "" when neither exists.
    const firstYM = firstMs !== undefined ? firstYear + "." + String(new Date(firstMs).getUTCMonth() + 1).padStart(2, "0") : "";
    const ym = (LIKED_ADDED && LIKED_ADDED[r.id]) || firstYM;
    META[key] = [r.id, plays, firstYear, code, famId, tempoBpm, energy, valence, albumSlug, ym];
  }

  // brand codes: each distinct label in liked-brands.json gets a stable code starting at 10,
  // appended to the legend so the view can chip brands alongside the derived buckets. Hoisted
  // (function declaration) so the loop above can call it.
  function brandCode(label) {
    const idx = LEGEND.findIndex(l => l.brand && l.label === label);
    if (idx >= 0) return LEGEND[idx].code;
    const c = 10 + LEGEND.filter(l => l.brand).length;
    LEGEND.push({ code: c, key: "brand-" + c, label, brand: true });
    return c;
  }

  // family legend (only the families actually used by a liked row) → {i, family, hue} for the
  // genre chip row. Same i/hue as the Sound Map's FAMILIES so colours stay consistent app-wide.
  const LIKED_FAMS = FAMILIES.map((f, i) => ({ i, family: f.family, hue: f.hue }))
    .filter(f => famUsed.has(f.i));

  const _likedOut = "// GENERATED by build-data.js — Liked-songs meta (join of saved tracks × scrobbles), lazy.\n"
    + "// { \"<artistSlug>~<trackSlug>\": [spotifyId, plays, firstYear, bucketCode, familyId, tempoBpm, energy0to100, valence0to100, albumSlug, firstYM] }\n"
    + "//   firstYM = first-heard month \"YYYY.MM\" (first scrobble; Spotify does not export the save date), \"\" when unscrobbled.\n"
    + "//   familyId/audio are null where unknown; albumSlug is \"\" when the save carries no album (client joins it to media-index album covers).\n"
    + "//   LEGEND = bucketCode→label; FAMS = genre families (i/hue align with the Sound Map); SUBS = artistSlug→primary subgenre.\n"
    + "window.ROTATION_LIKED_META = " + JSON.stringify(META) + ";\n"
    + "window.ROTATION_LIKED_ADDED_REAL = " + JSON.stringify(!!LIKED_ADDED) + ";\n"
    + "window.ROTATION_LIKED_LEGEND = " + JSON.stringify(LEGEND) + ";\n"
    + "window.ROTATION_LIKED_FAMS = " + JSON.stringify(LIKED_FAMS) + ";\n"
    + "window.ROTATION_LIKED_SUBS = " + JSON.stringify(LIKED_SUBS) + ";\n"
    + "window.ROTATION_LIKED_AUDIO_X = " + JSON.stringify(LIKED_AX) + ";\n"
    // liked-scoped vocals codes: the Liked view's vx join reads artist RECORDS (byId/expById),
    // which liked-only (unscrobbled) artists don't have — so their vocals.json entries never
    // surfaced (2026-08-12). Ship the code directly for every liked artist the ledger knows.
    + "window.ROTATION_LIKED_VX = " + JSON.stringify((() => {
        const o = {};
        for (const key in META) {
          const a = key.slice(0, key.indexOf("~"));
          if (a in o) continue;
          const c = vocalsCodeBySlug(a);
          if (c !== undefined) o[a] = c;
        }
        return o;
      })()) + ";\n";
  fs.writeFileSync(path.join(__dirname, "liked-meta.js"), _likedOut, "utf8");
  const audTot = audParquet + audFallback + audNone;
  console.log(`liked-meta.js: ${Object.keys(META).length} saved tracks (${matched} matched · ${unmatched} unscrobbled · ${dupes} dup keys) — `
    + `fresh ${dist.fresh} · doorway ${dist.doorway} · canon ${dist.canon} · lived ${dist.lived} · left ${dist.left} · mid ${dist.mid} · brand ${dist.brand} (${(_likedOut.length / 1024).toFixed(0)} KB)`);
  console.log(`  genre: ${LIKED_FAMS.length} families used · ${Object.keys(LIKED_SUBS).length} artists with a subgenre; `
    + `audio: ${audParquet + audFallback}/${audTot} covered (${audParquet} parquet · ${audFallback} track-store fallback · ${audNone} none)`);
}

// ─────────── ALBUM EXTRAS (generated lazy file) ───────────
// Per canonical album that absorbed edition variants: what the variants added on top of the base.
//   key = "<artistSlug>~<canonAlbumSlug>" → {
//     bonus:     [track titles ONLY ever seen under a variant, MARKED as live/demo/etc],
//     from:      [distinct human-readable variant suffix names, e.g. "Deluxe Edition", "2012 Mix"],
//     byEdition: { "<suffix>": [track, …], … } — the SAME bonus tracks grouped by the edition
//                suffix they arrived under. A track seen under several editions is filed under its
//                MOST-PLAYED one (variant-title plays, from _albVarByEd); ties broken by first-seen
//                Map order. Powers the per-edition sub-sections (disc-like) on the album view.
//   }
// Consumed lazily on the album view to (i) render one restart-numbered sub-section per edition,
// (ii) chip the "also logged as" editions. Only albums with bonus.length>0 || from.length>0 emitted.
const ALBUM_EXTRAS = {};
{
  const keys = new Set([..._albVarTracks.keys(), ..._albVarNames.keys()]);
  for (const ak of keys) {
    const ix = ak.indexOf("\x00"); if (ix < 0) continue;
    const artist = ak.slice(0, ix), title = ak.slice(ix + 1);
    const base = _albBaseTracks.get(ak) || _EMPTY_SET;
    const varTracks = _albVarTracks.get(ak) || _EMPTY_SET;
    // Variant editions often rename EVERY track ("Angel - Remastered 2019") — compare with
    // remaster-ish suffixes stripped or the whole base tracklist reads as "bonus". Live/demo/
    // acoustic variants stay distinct: those ARE genuine bonus content.
    const cmp = (t) => t.toLowerCase()
      .replace(/\s*[-–—(\[]\s*((\d{4}\s*)?remaster(ed)?(\s*\d{4})?|\d{4}\s*(mix|master)(\/(mix|master))?|(mix\/master))\s*[)\]]?\s*$/i, "")
      .trim();
    const baseCmp = new Set([...base].map(cmp));
    const varOnly = [...varTracks].filter(t => !base.has(t) && !baseCmp.has(cmp(t)));
    // We only know what was PLAYED, not release tracklists. Variant-only tracks split two ways:
    //  · MARKED (live/demo/unreleased/remix/version tails) = genuine edition extras → bonus divider
    //    (the Meteora|20 case: 60+ demos & live discs must sit below the rule, not inline).
    //  · CLEAN titles = standard album tracks the base was never scrobbled with (Hunting Party
    //    case) → merge silently, no "bonus" label.
    const MARKED = /(\s[-–—]\s.*\b(live|demo|unreleased|acoustic|instrumental|remix|rework|edit|mix|version)\b)|(\(\s*[^)]*\b(live|demo|unreleased|acoustic|instrumental|remix|version)\b[^)]*\))/i;
    const bonus = varOnly.filter(t => MARKED.test(t)).sort();
    const from = [...(_albVarNames.get(ak) || _EMPTY_SET)].sort();
    if (bonus.length === 0 && from.length === 0) continue;
    // group the bonus tracks by the edition suffix that carried the most plays of each.
    const byEdition = {};
    if (bonus.length) {
      const bySuf = _albVarByEd.get(ak);   // Map(suffix → Map(track → plays)), may be undefined
      for (const t of bonus) {
        let bestSuf = null, bestPlays = -1;
        if (bySuf) for (const [suf, byTrk] of bySuf) {   // Map iteration = first-seen order → tie-break
          const p = byTrk.get(t); if (p != null && p > bestPlays) { bestPlays = p; bestSuf = suf; }
        }
        (byEdition[bestSuf || ""] || (byEdition[bestSuf || ""] = [])).push(t);   // "" = no named edition
      }
      for (const k in byEdition) byEdition[k].sort();
    }
    const entry = {};
    if (bonus.length) entry.bonus = bonus;
    if (from.length) entry.from = from;
    if (bonus.length) entry.byEdition = byEdition;
    ALBUM_EXTRAS[slug(artist) + "~" + slug(title)] = entry;
  }
}
// ── per-album GENRE CHIPS for the album page — top last.fm tag NAMES (no counts), for the album
// page's chip row. Only for albums actually in the built ALBUMS set (no dead weight). Same DENY/decade
// filter the artist enrichers use (enrich-tags.js), plus drop tags that equal the artist name or the
// album title, so a chip never just echoes the header. Rides in album-extras.js (already lazy-loaded by
// AlbumView) as a SEPARATE object → no new HTTP fetch. Albums with no surviving tags are omitted (the
// UI renders nothing for a miss).
const _TAG_DENY = new Set(["seen live","favorites","favourite","favorite","favourites","love",
  "spotify","albums i own","vinyl","awesome","cool","good","amazing","beautiful","best",
  "under 2000 listeners","my music","check it out","male vocalists","female vocalists",
  "male vocalist","female vocalist","singer-songwriter","band","artists i've seen live"]);
const _isDecadeTag = (t) => /^(19|20)?\d0s$/.test(t) || /^\d{4}$/.test(t);
const ALBUM_TAG_CHIPS = {};
for (const rec of ALBUMS) {
  const at = aliasedBySlugAlbum(ALBUM_TAGS, slug(rec.artist), slug(rec.title));
  const tags = (at && at.tags) || [];
  if (!tags.length) continue;
  const aName = rec.artist.toLowerCase().trim(), tName = rec.title.toLowerCase().trim();
  const names = [];
  for (const [name] of tags) {   // tags are pre-sorted by weight in album-genres.json
    const n = String(name).toLowerCase().trim();
    if (_TAG_DENY.has(n) || _isDecadeTag(n) || n.length < 2 || n === aName || n === tName) continue;
    if (!names.includes(n)) names.push(n);
    if (names.length === 5) break;   // top 4-5 chips is plenty for a header row
  }
  if (names.length) ALBUM_TAG_CHIPS[slug(rec.artist) + "~" + slug(rec.title)] = names;
}
const _extrasOut = "// GENERATED by build-data.js — per-canonical-album deluxe/bonus + absorbed-edition names + genre chips (lazy).\n"
  + "window.ROTATION_ALBUM_EXTRAS = " + JSON.stringify(ALBUM_EXTRAS) + ";\n"
  + "window.ROTATION_ALBUM_TAGS = " + JSON.stringify(ALBUM_TAG_CHIPS) + ";\n";
fs.writeFileSync(path.join(__dirname, "album-extras.js"), _extrasOut, "utf8");
console.log(`album-extras.js: ${Object.keys(ALBUM_EXTRAS).length} albums w/ extras, ${Object.keys(ALBUM_TAG_CHIPS).length} w/ genre chips (${(_extrasOut.length / 1024).toFixed(0)} KB)`);

// ─────────── ARTIST ACTIVE-DAYS (generated lazy file) ───────────
// Per-artist barcode of active listening days for the artist page. Encoding (LOCKED — the UI
// agent decodes exactly this): "start" = global first scrobble day (YYYY-MM-DD). Each artist's
// value is the sorted active day-offsets (days since start) delta-encoded: first token = first
// offset, each later token = the gap (≥1) to the previous, every token base36, joined by ",".
//   offsets [3,4,10] → "3,1,6". Included: artists with ≥100 total plays.
const ARTIST_DAYS_MIN_PLAYS = 100;
const _dayMs = 86400e3;
const _adStartMs = Date.UTC(+iso(oldestMs).slice(0, 4), +iso(oldestMs).slice(5, 7) - 1, +iso(oldestMs).slice(8, 10));
const _adDays = new Map();   // artist → Set(dayOffset)
for (const [artist, , , ms] of scrobbles) {
  if ((artistPlays.get(artist) || 0) < ARTIST_DAYS_MIN_PLAYS) continue;
  const dk = iso(ms);   // same UTC day-key convention as dayCounts
  const off = Math.round((Date.UTC(+dk.slice(0, 4), +dk.slice(5, 7) - 1, +dk.slice(8, 10)) - _adStartMs) / _dayMs);
  let s = _adDays.get(artist); if (!s) { s = new Set(); _adDays.set(artist, s); } s.add(off);
}
const _adOut = {};
for (const [artist, set] of _adDays) {
  const offs = [...set].sort((a, b) => a - b);
  let prev = 0, parts = [];
  for (let i = 0; i < offs.length; i++) { const tok = i === 0 ? offs[i] : offs[i] - prev; parts.push(tok.toString(36)); prev = offs[i]; }
  _adOut[slug(artist)] = parts.join(",");
}
const _adFile = "// GENERATED by build-data.js — per-artist active-day barcode (delta-base36; lazy).\n"
  + "window.ROTATION_ARTIST_DAYS = " + JSON.stringify({ v: 1, start: iso(oldestMs), days: _adOut }) + ";\n";
fs.writeFileSync(path.join(__dirname, "artist-days.js"), _adFile, "utf8");
console.log(`artist-days.js: ${Object.keys(_adOut).length} artists ≥${ARTIST_DAYS_MIN_PLAYS} plays (${(_adFile.length / 1024).toFixed(0)} KB)`);

// ─────────── MB LINEUP (generated lazy file) ───────────
// Per-artist MusicBrainz lineup distill (mb-artists.json, a committed workshop input) re-keyed
// by the canonical artist slug so keys match artist ids exactly. Powers the artist page's
// "The lineup" card. Ships type/area/from/to (+ aka + members); the q/mbid stay client-side out.
const _MBRAW = _readJson("mb-artists.json");
const _mbOut = {};
for (const entry of Object.values(_MBRAW)) {
  if (!entry || !entry.q) continue;
  const id = slug(entry.q);
  const rec = { type: entry.type || "", area: entry.area || "", from: entry.from || "", to: entry.to || "" };
  // aka: drop the entries that just echo the queried name (any case) — keep the CJK/alt names
  const aka = (entry.aka || []).filter(a => a && slug(a) !== id);
  if (aka.length) rec.aka = aka;
  const members = (entry.members || [])
    .filter(m => m && m.n)
    .map(m => ({ n: m.n, g: m.g || "", i: Array.isArray(m.i) ? m.i : [], f: m.f || "", t: m.t || "" }));
  if (members.length) rec.members = members;
  _mbOut[id] = rec;
}
aliasSidecarBySlug(_mbOut);   // fold-alias: canonical artist slug inherits a folded variant's lineup
const _mbFile = "// GENERATED by build-data.js — per-artist MusicBrainz lineup distill (lazy-loaded on ArtistView).\n"
  + "window.ROTATION_MB = " + JSON.stringify(_mbOut) + ";\n";
fs.writeFileSync(path.join(__dirname, "mb-lineup.js"), _mbFile, "utf8");
console.log(`mb-lineup.js: ${Object.keys(_mbOut).length} artists (${(_mbFile.length / 1024).toFixed(0)} KB)`);

// lazy per-track audio detail (loaded only on a TrackView) — keyed slug(artist)~slug(track), same id TrackView routes by.
const _taOut = "// GENERATED by build-data.js — per-track Spotify audio features + stats (lazy-loaded on TrackView).\n"
  + "// key = artistSlug~trackSlug → [durSec, popularity, explicit, trackNo, energy, valence, acoustic, tempo, dance, instr] (features 0..100; length 4 when no features).\n"
  + "window.ROTATION_TRACKAUDIO = " + JSON.stringify(aliasSidecarBySlugAlbum(TRACKDATA)) + ";\n";
fs.writeFileSync(path.join(__dirname, "track-audio.js"), _taOut, "utf8");
console.log(`track-audio: ${Object.keys(TRACKDATA).length} tracks (${(_taOut.length / 1024).toFixed(0)} KB)`);

// lazy per-track lyric mood (loaded on TrackView alongside track-audio) — same slug key.
// key → [lyricValence0-100, domEmotionIdx(0..7 anger/anticipation/disgust/fear/joy/sadness/surprise/trust), emotiveWords]
const _moodOut = "// GENERATED by build-data.js — per-track NRC lyric mood (lazy-loaded on TrackView).\n"
  + "// key = artistSlug~trackSlug → [lyricValence0-100, domEmotionIdx, emotiveWords]. Emotions: anger anticipation disgust fear joy sadness surprise trust.\n"
  + "window.ROTATION_MOOD = " + JSON.stringify(aliasSidecarBySlugAlbum(GENIUS_MOOD)) + ";\n";
fs.writeFileSync(path.join(__dirname, "genius-mood-lazy.js"), _moodOut, "utf8");
console.log(`genius-mood-lazy: ${Object.keys(GENIUS_MOOD).length} tracks (${(_moodOut.length / 1024).toFixed(0)} KB)`);

// ─────────── COVERS STORY — "songs you own twice" (generated lazy file) ───────────
// Cross-library shared compositions for the Stories page (CoversStory). mb-works.json is the
// composition cache: artistSlug → { worksKey → {w:[writers], own:0|1, also:[other artistSlugs]} }.
// worksKey = title stripped to lowercase alnum (NO hyphens), distinct from the hyphenated lib slug.
// A group is one composition shared across the library: its members = {artistSlug} ∪ also (the cache
// records the same set symmetrically, so we dedup by worksKey + sorted-member-set). Per member we
// look up whether the user actually OWNS that song (a mediaTracks title whose worksKey matches) — that
// yields the non-null trackSlug (the hyphenated lib slug) and the display title; members with no owned
// copy carry a null trackSlug. own = the member whose cache record is own:1 (the "original"), else null.
// Order: group size desc, ties broken by cache iteration order (biggest cross-overs first — the view
// shows the top 12). No network: the whole join is reconstructed from committed caches + in-memory media.
const _COVRAW = _readJson("mb-works.json");
const _covWk = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");   // works-cache key form (no hyphens)
// per artist-slug: worksKey → {ls: libSlug, title, plays} (highest-play copy wins the title)
const _covOwned = new Map();
for (const row of mediaTracks) {
  const as = slug(_mArtists[row[1]]), title = row[0], plays = row[2] || 0;
  const ls = slug(title), wk = _covWk(title);
  let m = _covOwned.get(as); if (!m) _covOwned.set(as, m = new Map());
  const prev = m.get(wk);
  if (!prev || plays > prev.plays) m.set(wk, { ls, title, plays });
}
const _covName = new Map();   // artist-slug → display name (first occurrence, mirrors media artist order)
for (const n of _mArtists) { const s = slug(n); if (!_covName.has(s)) _covName.set(s, n); }
const _covGroups = new Map();
let _covOrd = 0;
for (const a of Object.keys(_COVRAW)) {
  for (const wk of Object.keys(_COVRAW[a])) {
    const rec = _COVRAW[a][wk];
    if (!rec.also || !rec.also.length) continue;
    const grp = [a, ...rec.also].filter((v, i, s) => s.indexOf(v) === i).sort();
    if (grp.length < 2) continue;
    const key = wk + "|" + grp.join(",");
    let g = _covGroups.get(key);
    if (!g) _covGroups.set(key, g = { wk, grp, ord: _covOrd++, recs: {} });
    g.recs[a] = rec;
  }
}
const COVSTORY = [..._covGroups.values()].map((g) => {
  // owner = the member whose cache record marks the original (own:1); writers travel with any member record.
  let own = null, ownerRec = null;
  for (const a of g.grp) if (g.recs[a] && g.recs[a].own === 1) { own = a; ownerRec = g.recs[a]; break; }
  let writers = ownerRec ? ownerRec.w : null;
  if (!writers) for (const a of g.grp) if (g.recs[a]) { writers = g.recs[a].w; break; }
  const owned = (as) => { const m = _covOwned.get(as); return m ? m.get(g.wk) || null : null; };
  // title: owner's owned copy, else the highest-play member copy, else the bare works key.
  let title = null;
  if (own) { const o = owned(own); if (o) title = o.title; }
  if (!title) { let best = null; for (const as of g.grp) { const o = owned(as); if (o && (!best || o.plays > best.plays)) best = o; } if (best) title = best.title; }
  if (!title) title = g.wk;
  const p = g.grp.map((as) => { const o = owned(as); return [as, _covName.get(as) || as, o ? o.ls : null]; });
  return { t: title, w: writers, own, p, _sz: g.grp.length, _ord: g.ord };
});
COVSTORY.sort((a, b) => b._sz - a._sz || a._ord - b._ord);   // biggest cross-library overlaps first
for (const e of COVSTORY) { delete e._sz; delete e._ord; }
const _covOut = "// GENERATED by build-data.js — cross-library shared works (\"songs you own twice\") for the Stories page.\n"
  + "window.ROTATION_COVSTORY = " + JSON.stringify(COVSTORY) + ";\n";
fs.writeFileSync(path.join(__dirname, "mb-covers-story.js"), _covOut, "utf8");
console.log(`covers-story: ${COVSTORY.length} shared compositions (${(_covOut.length / 1024).toFixed(0)} KB)`);

// lazy per-track "what it's about" blurb — Genius About excerpts (fetch-abouts.py, play-ranked
// batches). v2: only excerpts the aboutness scorer flagged as MEANING (m=1) ship — the audit
// showed first-sentence excerpts were ~24% pure release trivia; context-only Abouts stay cached
// but don't render. value = [excerpt, geniusId] for the attribution link.
const GENIUS_ABOUT = _readJson("genius-about.json"); // key → [excerpt|null, fullLen, id, meaning01]
const _aboutShip = {};
for (const [k, v] of Object.entries(GENIUS_ABOUT)) if (v && v[0] && v[3] === 1) _aboutShip[k] = [v[0], v[2] || 0];
aliasSidecarBySlugAlbum(_aboutShip);   // fold-alias: canonical artist slug inherits folded variant's track Abouts
const _aboutOut = "// GENERATED by build-data.js — Genius About excerpts (lazy-loaded on TrackView).\n"
  + "// key = artistSlug~trackSlug → [excerpt, geniusId]. Community-written; link back to Genius.\n"
  + "window.ROTATION_ABOUT = " + JSON.stringify(_aboutShip) + ";\n";
fs.writeFileSync(path.join(__dirname, "genius-about-lazy.js"), _aboutOut, "utf8");
console.log(`genius-about-lazy: ${Object.keys(_aboutShip).length} blurbs (${(_aboutOut.length / 1024).toFixed(0)} KB)`);

// lazy album-level "what it's about" blurbs — Wikipedia Themes/Content section, by
// .sptmp/album-about.py. key artistSlug~albumSlug → [excerpt, wikiTitle]. Only emitted when present.
{
  const ALBUM_ABOUT = aliasSidecarBySlugAlbum(_readJson("album-about.json"));
  if (ALBUM_ABOUT && Object.keys(ALBUM_ABOUT).length) {
    const _aaOut = "// GENERATED by build-data.js — album 'what it's about' blurbs (Wikipedia; AlbumView).\n"
      + "window.ROTATION_ALBUM_ABOUT = " + JSON.stringify(ALBUM_ABOUT) + ";\n";
    fs.writeFileSync(path.join(__dirname, "album-about-lazy.js"), _aaOut, "utf8");
    console.log(`album-about-lazy: ${Object.keys(ALBUM_ABOUT).length} album blurbs (${(_aaOut.length / 1024).toFixed(0)} KB)`);
  }
}

// lazy per-track themes — for client-side album roll-ups (AlbumView "mostly about…" chips).
const _themesOut = "// GENERATED by build-data.js — per-track lyric themes (lazy; AlbumView aggregates).\n"
  + "// _themes: names; key → [[themeIdx, score0-100], …top3]\n"
  + "window.ROTATION_TRACKTHEMES = " + JSON.stringify(aliasSidecarBySlugAlbum(GENIUS_THEMES)) + ";\n";
fs.writeFileSync(path.join(__dirname, "genius-themes-lazy.js"), _themesOut, "utf8");
console.log(`genius-themes-lazy: ${Object.keys(GENIUS_THEMES).length - 1} tracks (${(_themesOut.length / 1024).toFixed(0)} KB)`);

// ─────────── FILTER INDEX (Explore themes + decades filter — lazy sidecar) ───────────
// Per-track [themeMask, releaseYear] over a MERGED 28-bucket theme vocabulary, plus the mask-bit
// name order and a precomputed artist OR-mask. Powers Explore theme chips (OR-composed) AND its
// decades bar (release-year, drillable to a single year). Client-side bitmask filtering.
//   window.ROTATION_FILTER = { themes:[28 names, bit0..bit27], t:{ "artSlug~trackSlug":[mask,year] }, a:{ artistSlug: mask } }
// TWO theme systems merged into ONE 28-bucket assignment:
//   * REASONED themes (llm-about.js themes[], ~513 fable tracks) — WIN where present.
//   * EMBEDDING themes (genius-themes.json, 18 buckets, ~25k tracks) — fill the rest; each of the
//     18 embedding names maps 1:1 to an identically-named 28-bucket (a subset of the 28).
// 28 canonical buckets = every llm-about theme used on >=3 tracks; 17 one-off reasoned labels fold
// into the nearest canonical bucket (F28_FOLD). Year = album release year (spine date first, then
// Spotify album meta relYear); 0 when unknown (track sits out the decades filter).
{
  const F28 = [
    "love & desire", "artifice & performance", "anger & defiance", "addiction & self-destruction",
    "dissociation & numbness", "alienation & emptiness", "faith & the occult", "politics & society",
    "identity & becoming", "violence & murder", "shame & repression", "surveillance & control",
    "death & grief", "madness & the mind", "heartbreak & loss", "comedy & wordplay",
    "transcendence & consciousness", "freedom & escape", "suicide", "war & battle",
    "nostalgia & memory", "nature & the elements", "family & blood", "money & the street",
    "party & hedonism", "friendship & loyalty", "night & the city", "exile & diaspora",
  ];
  const F28_BIT = new Map(F28.map((n, i) => [n, i]));
  const F28_FOLD = {
    "objectless craving": "addiction & self-destruction",
    "unnameable craving": "addiction & self-destruction",
    "desire without arrival": "love & desire",
    "destructive merging": "love & desire",
    "aspiration & limits": "transcendence & consciousness",
    "homecoming": "nostalgia & memory",
    "erasure by looking": "alienation & emptiness",
    "vanishing meaning": "alienation & emptiness",
    "cycle of abuse": "surveillance & control",
    "spectacle & voyeurism": "surveillance & control",
    "time running out": "death & grief",
    "endurance": "death & grief",
    "endurance & exhaustion": "dissociation & numbness",
    "art & interpretation": "artifice & performance",
    "extinction": "nature & the elements",
    "doubt": "faith & the occult",
    "complicity": "shame & repression",
  };
  const bitFor = (name) => { let i = F28_BIT.get(name); if (i == null && F28_FOLD[name]) i = F28_BIT.get(F28_FOLD[name]); return i == null ? -1 : i; };

  let LLM_ABOUT = {};
  try {
    const vm = require("vm");
    const _ctx = { window: {} }; vm.createContext(_ctx);
    vm.runInContext(fs.readFileSync(path.join(__dirname, "llm-about.js"), "utf8").replace(/^﻿/, ""), _ctx, { filename: "llm-about.js" });
    LLM_ABOUT = _ctx.window.ROTATION_LLM_ABOUT || {};
  } catch (e) { console.log("filter-index: llm-about.js unread (" + e.message + ") — reasoned themes skipped"); }
  const reasonedMask = (aS, tS) => {
    const e = LLM_ABOUT[aS + "~" + tS]; if (!e || !Array.isArray(e.themes) || !e.themes.length) return 0;
    let m = 0; for (const n of e.themes) { const b = bitFor(n); if (b >= 0) m |= (1 << b); } return m;
  };
  const EMB_TN = (GENIUS_THEMES._themes || []);
  const EMB_BIT = EMB_TN.map(n => bitFor(n));
  const embMask = (aS, tS) => {
    const th = aliasedBySlugAlbum(GENIUS_THEMES, aS, tS); if (!th || !th.length) return 0;
    let m = 0; for (const t of th) { const b = EMB_BIT[t[0]]; if (b >= 0) m |= (1 << b); } return m;
  };

  const SPINE_YEAR = {};
  try {
    const vm = require("vm");
    const _ctx = { window: {} }; vm.createContext(_ctx);
    vm.runInContext(fs.readFileSync(path.join(__dirname, "mb-album-spine.js"), "utf8").replace(/^﻿/, ""), _ctx, { filename: "mb-album-spine.js" });
    const SP = _ctx.window.ROTATION_ALBSPINE || {};
    for (const aslug in SP) for (const alb in SP[aslug]) {
      const y = parseInt(String(SP[aslug][alb].d || "").slice(0, 4), 10);
      if (y >= 1900 && y <= 2100) SPINE_YEAR[aslug + "~" + alb] = y;
    }
  } catch (e) { /* spine optional */ }
  const albRelYear = mediaAlbums.map((a) => {
    const aS = slug(_mArtists[a[1]]), tS = slug(a[0]);
    if (SPINE_YEAR[aS + "~" + tS]) return SPINE_YEAR[aS + "~" + tS];
    const meta = a[7]; return (meta && meta[0]) ? meta[0] : 0;
  });

  const FILT = {};
  const artAcc = new Map();
  let nThemed = 0, nYear = 0;
  for (const row of mediaTracks) {
    const artist = _mArtists[row[1]], title = row[0];
    const aS = slug(artist), tS = slug(title), key = aS + "~" + tS;
    const mask = reasonedMask(aS, tS) || embMask(aS, tS);
    const ai = row[3];
    const year = (ai >= 0 && albRelYear[ai]) ? albRelYear[ai] : 0;
    if (!mask && !year) continue;
    FILT[key] = [mask, year];
    if (mask) { nThemed++; artAcc.set(aS, (artAcc.get(aS) || 0) | mask); }
    if (year) nYear++;
  }
  const ARTMASK = {}; for (const [aS, m] of artAcc) if (m) ARTMASK[aS] = m;

  const _filtOut = "// GENERATED by build-data.js — Explore themes + decades filter index (lazy).\n"
    + "// themes: 28-bucket names in mask-bit order (bit0..bit27). t: trackKey -> [themeMask, releaseYear|0].\n"
    + "// a: artistSlug -> OR-mask over its tracks (chip live-count assist). Year 0 = unknown.\n"
    + "window.ROTATION_FILTER = { themes: " + JSON.stringify(F28) + ", t: " + JSON.stringify(FILT) + ", a: " + JSON.stringify(ARTMASK) + " };\n";
  fs.writeFileSync(path.join(__dirname, "filter-index.js"), _filtOut, "utf8");
  console.log(`filter-index: ${Object.keys(FILT).length} tracks (${nThemed} themed ${(100 * nThemed / mediaTracks.length).toFixed(1)}% . ${nYear} year ${(100 * nYear / mediaTracks.length).toFixed(1)}%) . ${Object.keys(ARTMASK).length} artist masks (${(_filtOut.length / 1024).toFixed(0)} KB)`);
}

// lazy 30-second Spotify preview index — hash only (the cid query param is constant; the client
// rebuilds https://p.scdn.co/mp3-preview/<hash>?cid=…). From spotify-track-links.json (archive pass 2).
{
  const LINKS = _readJson("spotify-track-links.json");
  // hand kill-list — previews confirmed to play the WRONG recording (Fuad 2026-07-13). Wrong
  // audio is worse than none; artist-wide kills stay until an ISRC verification pass clears them.
  const PREVIEW_KILL_KEYS = new Set(["rammstein~engel", "wargasm-uk~venom", "limp-bizkit~my-generation"]);
  // + the MB-ISRC audit's confirmed wrong-recording matches (preview-kill.json, regenerated
  // from .sptmp/preview-audit.json — 225 keys as of 2026-07-12)
  try { for (const k of JSON.parse(fs.readFileSync(path.join(__dirname, "preview-kill.json"), "utf8"))) PREVIEW_KILL_KEYS.add(k); } catch (e) {}
  const PREVIEW_KILL_ARTISTS = new Set(["pro8l3m"]);
  const pv = {};
  for (const [k, v] of Object.entries(LINKS)) {
    if (PREVIEW_KILL_KEYS.has(k) || PREVIEW_KILL_ARTISTS.has(k.split("~")[0])) continue;
    const m = ((v && v[1]) || "").match(/mp3-preview\/([0-9a-f]+)/); if (m) pv[k] = m[1];
  }
  // fold-alias: the client reads previews by the CANONICAL TrackView id (wargasm~venom), but the
  // link source keys by the pre-fold slug (wargasm-uk~venom). Copy to the canonical key. Killed keys
  // were already excluded above, so no killed recording gets resurrected under a canonical alias.
  aliasSidecarBySlugAlbum(pv);
  const out = "// GENERATED by build-data.js — 30s Spotify preview hashes (lazy-loaded on TrackView).\nwindow.ROTATION_PREVIEWS = " + JSON.stringify(pv) + ";\n";
  fs.writeFileSync(path.join(__dirname, "track-previews.js"), out, "utf8");
  console.log(`track-previews: ${Object.keys(pv).length} tracks (${(out.length / 1024).toFixed(0)} KB)`);
}

// lazy Unplayed Shelf — LPs by your ≥20-play artists that you've NEVER played (the shrinkwrap
// wall). From spotify-unplayed.json (local archive diff, .sptmp/unplayed-build.js).
{
  const UN = _readJson("spotify-unplayed.json");
  if (Object.keys(UN).length) {
    const out = "// GENERATED by build-data.js — unplayed LPs per artist (lazy, Shelves shrinkwrap mode).\n// artist → [[title, year, coverUrl], …]\nwindow.ROTATION_UNPLAYED = " + JSON.stringify(UN) + ";\n";
    fs.writeFileSync(path.join(__dirname, "shelves-unplayed.js"), out, "utf8");
    console.log(`shelves-unplayed: ${Object.keys(UN).length} artists (${(out.length / 1024).toFixed(0)} KB)`);
  }
}

// ─────────── GENRES — real play-weighted tag aggregation (falls back to curated below) ───────────
const tagWeight = new Map(); // tag → play-weighted total across all artists
for (const [name, plays] of rankedArtists) {
  for (const [tag, count] of cachedTags(name)) {
    if (GENERIC.has(tag)) continue;
    tagWeight.set(tag, (tagWeight.get(tag) || 0) + plays * ((count || 0) / 100));
  }
}
const famSubs = new Map(FAMILIES.map(f => [f.family, []]));
for (const [tag, w] of [...tagWeight.entries()].sort((a, b) => b[1] - a[1])) {
  const f = classifyTag(tag);
  if (!f) continue;
  const arr = famSubs.get(f.family);
  if (arr.length < 8) arr.push({ name: tag, w: Math.round(w) });
}
const tagHash = (s) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const GENRES_REAL = FAMILIES.map(f => ({
  family: f.family, hue: f.hue,
  subs: (famSubs.get(f.family) || []).map(s => ({
    name: s.name, w: s.w,
    x: Math.round(clamp01(f.cx + ((tagHash(s.name) % 1000) / 1000 - .5) * 0.16) * 100) / 100,
    y: Math.round(clamp01(f.cy + ((tagHash(s.name + "y") % 1000) / 1000 - .5) * 0.16) * 100) / 100,
  })),
})).filter(f => f.subs.length);

// ─────────── GENRES_CURATED (fallback when tag-cache.json is absent) + CONCERTS ───────────
// v2 family names + hues mirror FAMILIES exactly. Re-homing vs v1:
//   Nu-metal(24) + Metalcore(346) subs → Metalcore/Nu(346); post-hardcore → Punk/Hardcore(96)
//   Alt/Prog metal(282) subs → Prog(282); stoner rock → Heavy/Doom(24)
//   Thrash/Heavy(4) → Thrash/Death(4)
//   Industrial + Digital hardcore/Hyperpop subs → Industrial/Noise/Hyperpop(214) (single family)
//   Japanese underground subs: noise rock/math rock/nu-gaze → Shoegaze/Grunge(252);
//     kawaii metal → Metalcore/Nu(346); j-punk → Punk/Hardcore(96)
//   Electronic/DnB(190) + Hip-hop(46) → exact name/hue match, kept as-is
const GENRES_CURATED = [
  { family: "Thrash/Death", hue: 4, subs: [
    { name: "thrash metal", x: .24, y: .92, w: 1450 },
    { name: "groove metal", x: .26, y: .84, w: 1610 },
    { name: "heavy metal", x: .22, y: .80, w: 1380 },
    { name: "speed metal", x: .25, y: .90, w: 540 },
  ]},
  { family: "Heavy/Doom", hue: 24, subs: [
    { name: "stoner rock", x: .26, y: .62, w: 1290 },
  ]},
  { family: "Metalcore/Nu", hue: 346, subs: [
    { name: "nu-metal", x: .30, y: .80, w: 2890 },
    { name: "rap metal", x: .36, y: .78, w: 1490 },
    { name: "alternative metal", x: .32, y: .70, w: 2410 },
    { name: "funk metal", x: .28, y: .66, w: 520 },
    { name: "metalcore", x: .34, y: .88, w: 1680 },
    { name: "djent", x: .44, y: .86, w: 1180 },
    { name: "progressive metalcore", x: .46, y: .84, w: 1430 },
    { name: "deathcore", x: .40, y: .92, w: 540 },
    { name: "kawaii metal", x: .56, y: .78, w: 1240 },
  ]},
  { family: "Punk/Hardcore", hue: 96, subs: [
    { name: "post-hardcore", x: .36, y: .82, w: 1490 },
    { name: "j-punk", x: .30, y: .80, w: 590 },
  ]},
  { family: "Prog", hue: 282, subs: [
    { name: "progressive metal", x: .30, y: .66, w: 1980 },
    { name: "art rock", x: .34, y: .50, w: 1540 },
    { name: "post-metal", x: .38, y: .60, w: 720 },
  ]},
  { family: "Shoegaze/Grunge", hue: 252, subs: [
    { name: "japanese noise rock", x: .40, y: .82, w: 1280 },
    { name: "math rock", x: .38, y: .64, w: 1180 },
    { name: "nu-gaze", x: .44, y: .58, w: 1210 },
  ]},
  { family: "Industrial/Noise/Hyperpop", hue: 214, subs: [
    { name: "industrial rock", x: .58, y: .72, w: 3120 },
    { name: "industrial metal", x: .55, y: .82, w: 1870 },
    { name: "neue deutsche härte", x: .52, y: .80, w: 1870 },
    { name: "electronicore", x: .62, y: .82, w: 640 },
    { name: "digital hardcore", x: .82, y: .92, w: 1340 },
    { name: "breakcore", x: .88, y: .90, w: 760 },
    { name: "witch house", x: .80, y: .58, w: 1120 },
    { name: "hyperpop", x: .84, y: .60, w: 680 },
  ]},
  { family: "Electronic/DnB", hue: 190, subs: [
    { name: "drum and bass", x: .86, y: .74, w: 980 },
    { name: "big beat", x: .80, y: .66, w: 1620 },
    { name: "breakbeat", x: .82, y: .70, w: 760 },
    { name: "progressive house", x: .90, y: .50, w: 1440 },
  ]},
  { family: "Hip-Hop/Rap", hue: 46, subs: [
    { name: "polish hip-hop", x: .64, y: .44, w: 1630 },
    { name: "boom bap", x: .60, y: .40, w: 760 },
  ]},
];
const GENRES = (hasTags && GENRES_REAL.length) ? GENRES_REAL : GENRES_CURATED;

// ─────────── SUB_ARTISTS — subgenre → kept-artist ids (for the Explore subgenre filter) ───────────
// Lets a click on a subgenre row in the Sound "families" pane filter the ranking to exactly the
// artists who carry that tag. Built from each kept artist's FULL last.fm tag list (not just top-4).
const SUB_ARTISTS = {};
{
  const subNames = new Set();
  for (const f of GENRES) for (const s of f.subs) subNames.add(s.name);
  for (const a of ARTISTS) {
    const tset = new Set([...cachedTags(a.name).map(t => t[0]), ...(a.tags || [])]);
    for (const tag of tset) if (subNames.has(tag)) (SUB_ARTISTS[tag] = SUB_ARTISTS[tag] || []).push(a.id);
  }
}

// ─────────── SUBS + EXPLORE — the converged Explore universe ───────────
// SUBS: every taxonomy subgenre with a fixed scatter position (family hue + jittered x/y).
// EXPLORE: a lightweight rankable/filterable record for EVERY tagged artist (not just the kept
// 205) — id, plays, hue, the subgenres it carries (membership → inclusive filtering), per-year
// plays. Map bubbles AND the ranking are computed client-side from this ONE set, so every bubble
// has artists behind it and a click is never empty. Cap is generous and raisable as tags grow.
const EXPLORE_CAP = 10000;   // 6000 -> 10000 (Fuad 2026-08-26): grows as the weekly enrichment hums through the tail
const EXPLORE_YP_TOP = 3000;   // only the top-by-plays carry per-year detail (file-size control)
// per-artist dominant REGISTER (the human "register" word — REG_VOCAB / MOOD_REG). Play-weighted
// modal regIdx over the artist's mood-scored tracks, reusing the exact MOOD-block join (trackPlays
// key artist\x00track → GENIUS_MOOD via aliasedBySlugAlbum; col 4 = regIdx). Powers the Explore
// Register filter row. Emitted additively as rec.rg (index into MOOD_REG); absent when no scored
// track carries col 4. artistRegC: name → Int counts over MOOD_REG; resolved to a single mode below.
const artistRegC = new Map();
for (const [key, plays] of trackPlays) {
  const ix = key.indexOf("\x00"); const aS = slug(key.slice(0, ix)), tS = slug(key.slice(ix + 1));
  const m = aliasedBySlugAlbum(GENIUS_MOOD, aS, tS);
  if (!m || m[4] == null) continue;
  let c = artistRegC.get(key.slice(0, ix)); if (!c) { c = new Array(MOOD_REG.length).fill(0); artistRegC.set(key.slice(0, ix), c); }
  c[m[4]] += plays;
}
const dominantReg = (name) => { const c = artistRegC.get(name); if (!c) return null; let bi = -1, bv = 0; for (let i = 0; i < c.length; i++) if (c[i] > bv) { bv = c[i]; bi = i; } return bi >= 0 ? bi : null; };
// merge spelling variants of the same subgenre so "hip hop"/"hip-hop" etc. are ONE row (Fuad).
const SUB_CANON = new Map([
  ["hip hop", "hip-hop"], ["hiphop", "hip-hop"],
  ["drum n bass", "drum and bass"], ["drum'n'bass", "drum and bass"], ["dnb", "drum and bass"], ["drum & bass", "drum and bass"], ["drumandbass", "drum and bass"],
  ["nu metal", "nu-metal"], ["numetal", "nu-metal"],
  ["post hardcore", "post-hardcore"], ["posthardcore", "post-hardcore"],
  ["j rock", "j-rock"], ["jrock", "j-rock"], ["j pop", "j-pop"], ["jpop", "j-pop"], ["j-metal", "j-rock"],
  ["synth pop", "synthpop"], ["synth-pop", "synthpop"],
  ["lo fi", "lo-fi"], ["lofi", "lo-fi"],
  ["trip hop", "trip-hop"], ["triphop", "trip-hop"],
  ["post rock", "post-rock"], ["postrock", "post-rock"],
  ["post punk", "post-punk"], ["postpunk", "post-punk"],
  ["post metal", "post-metal"], ["postmetal", "post-metal"],
  ["dark wave", "darkwave"], ["dark-wave", "darkwave"],
  ["electro pop", "electropop"], ["electro-pop", "electropop"],
  ["dream pop", "dream-pop"], ["dreampop", "dream-pop"],
  ["new wave", "new-wave"], ["hard rock", "hard-rock"],
  ["black metal", "black-metal"], ["death metal", "death-metal"], ["doom metal", "doom-metal"],
  ["power metal", "power-metal"], ["thrash metal", "thrash-metal"], ["heavy metal", "heavy-metal"],
]);
const canonSub = (t) => SUB_CANON.get(t) || t;
const SUBS = [];
{
  const canonWeight = new Map();   // fold variant tags into their canonical form before ranking
  for (const [tag, w] of tagWeight.entries()) { const c = canonSub(tag); canonWeight.set(c, (canonWeight.get(c) || 0) + w); }
  const perFam = new Map();
  for (const [tag, w] of [...canonWeight.entries()].sort((a, b) => b[1] - a[1])) {
    if (GENERIC.has(tag)) continue;
    const f = classifyTag(tag);
    if (!f) continue;
    const fi = FAMILIES.indexOf(f);
    const n = perFam.get(fi) || 0;
    if (n >= 20) continue;            // cap per family so the scatter doesn't choke
    perFam.set(fi, n + 1);
    SUBS.push({
      name: tag, fam: fi, hue: f.hue,
      x: Math.round(clamp01(f.cx + ((tagHash(tag) % 1000) / 1000 - .5) * 0.18) * 100) / 100,
      y: Math.round(clamp01(f.cy + ((tagHash(tag + "y") % 1000) / 1000 - .5) * 0.18) * 100) / 100,
    });
  }
}
// synthetic catch-all subgenre for the "Other" family — real tags never classify here (its kw
// never matches), so artists reach it only via the explicit EXPLORE fallback below. Keeps the
// long tail filterable/clickable instead of dropped. (Grey rendering: color pass.)
{
  const oi = FAMILIES.findIndex(f => f.family === "Other");
  if (oi >= 0) SUBS.push({ name: "other", fam: oi, hue: FAMILIES[oi].hue, x: .5, y: .5, grey: true });
}
const subIdxByName = new Map(SUBS.map((s, i) => [s.name, i]));
// ── qualifying-subgenre gate (2026-08-12): a sub is a FILTER-worthy membership only when its
//    backing tag carries ≥25% of the artist's TOP-tag weight. `s` (all matched subs) stays for
//    display; `sq` (this subset) is what the Explore subgenre filter tests. last.fm tag counts
//    (0–100) are the weight signal; a Discogs-only sub (no last.fm count) qualifies when its style
//    count is ≥25% of the artist's top Discogs style count. The dominant sub s[0] always qualifies.
const SUB_SHARE_MIN = 0.25;
function qualifyingSubs(name, s) {
  if (!s.length) return s;
  // per-canonical-sub best weight from last.fm tag counts + Discogs style counts (kept separate:
  // the two count scales aren't comparable, so each is thresholded against its own source max).
  const lfBy = new Map(), dgBy = new Map();
  for (const [tag, count] of cachedTags(name)) { const c = canonSub(tag); if (subIdxByName.has(c)) lfBy.set(c, Math.max(lfBy.get(c) || 0, count || 0)); }
  for (const [tag] of ((META[name] && META[name].tags) || []).map(t => Array.isArray(t) ? t : [t, 100])) { const c = canonSub(tag); if (subIdxByName.has(c)) lfBy.set(c, Math.max(lfBy.get(c) || 0, 100)); }
  for (const st of stylesCountOf(name)) { const c = canonSub(String(st[0]).toLowerCase()); if (subIdxByName.has(c)) dgBy.set(c, Math.max(dgBy.get(c) || 0, st[1] || 0)); }
  const lfMax = Math.max(0, ...lfBy.values()), dgMax = Math.max(0, ...dgBy.values());
  const nameBySub = new Map(); for (const [nm, i] of subIdxByName) if (!nameBySub.has(i)) nameBySub.set(i, nm);
  const sq = s.filter((idx, pos) => {
    if (pos === 0) return true;   // dominant sub always qualifies
    const nm = SUBS[idx] && SUBS[idx].name; if (nm == null) return true;
    const lf = lfBy.get(nm), dg = dgBy.get(nm);
    if (lf != null && lfMax > 0) return (lf / lfMax) >= SUB_SHARE_MIN;
    if (dg != null && dgMax > 0) return (dg / dgMax) >= SUB_SHARE_MIN;
    return false;   // sub came only from the family-fallback / no measurable weight → not filter-worthy beyond display
  });
  return sq.length ? sq : [s[0]];
}
const EXPLORE = [];
for (const [name, plays] of rankedArtists) {
  // Floor of 3, matching the search index above — NOT 5, which is what this used to be.
  // enrich-tags.js fetches from the search index, so every artist down to 3 plays already
  // has its last.fm tags cached; a floor of 5 was throwing away ~1,300 artists we had
  // already paid the API calls for. Going below 3 is a different proposition: it needs the
  // search-index floor lowered AND thousands of fresh fetches, for artists whose 1–2 plays
  // are mostly mis-scrobbles and radio spillover.
  if (plays < 3) continue;
  if (NONMUSIC.has(name)) continue;   // "inapplicable" — not music, keep off the genre map
  const meta = META[name];
  // subgenre membership from last.fm tags AND Discogs styles — the latter reaches the ~6000
  // artists we have Discogs data for, well past last.fm's tag coverage.
  const vocab = [...((meta && meta.tags) || []), ...cachedTags(name).map(t => t[0]), ...stylesOf(name).map(s => s.toLowerCase())];
  const seen = new Set(), s = [];
  for (const tg of vocab) { const i = subIdxByName.get(canonSub(tg)); if (i != null && !seen.has(i)) { seen.add(i); s.push(i); } }
  if (!s.length) {
    // family fallback: no SPECIFIC subgenre matched (the artist's tags are only generic umbrellas
    // like "rock" / "alternative rock", which are deliberately excluded from the subgenre vocab),
    // but those tags still classify to a Sound-Map FAMILY. Place the artist on that family's
    // representative subgenre so it stays in Explore — filterable, clickable, map-counted — instead
    // of being dropped from the universe entirely (Fuad: "not just Cranberries got nuked").
    const fi = familyIdxByName(name);
    if (fi >= 0) { const rep = SUBS.findIndex(su => su.fam === fi); if (rep >= 0) s.push(rep); }
  }
  if (!s.length) { const oi = subIdxByName.get("other"); if (oi != null) s.push(oi); }  // last resort → Other (never nuke)
  if (!s.length) continue;            // (only if the Other sub is somehow missing)
  const fm = familyMembersByName(name);   // 1–3 family indexes, dominant first (membership, not mention)
  const sq = qualifyingSubs(name, s);     // filter-worthy subs (backing tag ≥25% of top-tag weight)
  const rec = { id: slug(name), name, plays, hue: hueFor(name), s, fm, l: listenersOf(name) || 0, d: debutOf(name) || 0 };
  if (!(sq.length === s.length && sq.every((v, i) => v === s[i]))) rec.sq = sq;   // omit when identical to s (falls back to s)
  const _o = originOf(name);            // country/city tag → lets the Journey scope to a place
  if (_o) { rec.co = _o.country; if (_o.city) rec.ci = _o.city; }
  const _g = genderOf(name); const _gc = _g === "Female" ? "f" : _g === "Male" ? "m" : (_g === "Non-binary" || _g === "Other") ? "x" : ""; if (_gc) rec.g = _gc;   // f/m/x glyph (mini); "Not applicable" → none
  // vocals code (m/f/n; ""=instrumental) — powers the Explore vocals chip; absent = no data.
  // Primary: vocals.json (verified). Fallback: MB member lineup (artist-members.json) for bands
  // whose wikidata carried no lineup — same lead-vocals-first selection, so ZERO classifier change.
  let _vx = vocalsCodeBySlug(rec.id); if (_vx === undefined) _vx = membersVoxCode(name);
  if (_vx !== undefined) rec.vx = _vx;
  const _rg = dominantReg(name); if (_rg != null) rec.rg = _rg;   // dominant register (REG_VOCAB idx) — powers the Explore Register filter row
  const _lf = lifeOf(name); if (_lf) { rec.ty = _lf.type[0].toLowerCase(); if (_lf.ended) { rec.ed = 1; if (_lf.end) rec.en = +_lf.end || 0; } }
  // first-play day + listening span, as compact ints (days since oldestMs) — powers the Explore
  // "discovered" (newest first-play) + "span" (widest first→last) sorts. Dated scrobbles only;
  // undated-only artists get neither field and drop out of those two sorts.
  const _sp = span.get(name);
  if (_sp) { rec.fd = Math.round((_sp[0] - oldestMs) / 86400e3); rec.sd = Math.round((_sp[1] - _sp[0]) / 86400e3); }
  // PER-SOURCE GENRE RAILS FOR THE TAIL (Fuad 2026-08-31). These three fields are what
  // rotation-artist.jsx renders as the last.fm / discogs / spotify rows. They were ARTIST_HEAVY,
  // built only for the ~489 KEPT artists, so every Explore-tier artist showed merged subgenre
  // chips with no idea which service said what — Texas Hippie Coalition looked unenriched when
  // all three caches were in fact populated and correct. Same field names and same construction
  // as the kept-artist path (~L1872/1884/1901) so the rails render unchanged; capped tighter here
  // because this multiplies across 6,829 records rather than 489, and omitted entirely when empty
  // so artists with no data for a source cost nothing.
  const _tlf = cachedTags(name).map(t => t[0]).slice(0, 4);         if (_tlf.length) rec.tagsLf = _tlf;
  const _st = (stylesOf(name) || []).slice(0, 6);                   if (_st.length) rec.styles = _st;
  const _sg = (aliasedByName(SPOTGEN, name) || []).slice(0, 6);     if (_sg.length) rec.spotGenres = _sg;
  if (EXPLORE.length < EXPLORE_YP_TOP) {
    const yc = artistYear.get(name) || new Map();
    const yp = {}; for (const [y, c] of yc) if (c > 0) yp[y] = c;
    rec.yp = yp;
  }
  EXPLORE.push(rec);
  if (EXPLORE.length >= EXPLORE_CAP) break;
}

// ─────────── AUDIT — dominant-genre membership ruleset (2026-08-12) ───────────
// Verifies the "mention ≠ membership" fix: compares the OLD any-sub-in-family filterable population
// against the NEW fm-based one, and surfaces the artists whose stray-tag memberships were dropped.
{
  const famName = (fi) => (FAMILIES[fi] || {}).family || ("#" + fi);
  const oldFamsOf = (r) => { const set = new Set(); for (const si of r.s) { const f = SUBS[si] && SUBS[si].fam; if (f != null && !(FAMILIES[f] && FAMILIES[f].grey)) set.add(f); } return set; };
  const dist = { 1: 0, 2: 0, 3: 0 };
  const oldPop = new Array(FAMILIES.length).fill(0), newPop = new Array(FAMILIES.length).fill(0);
  const lost = [];   // artists that LOST ≥1 family membership vs the old any-sub rule
  for (const r of EXPLORE) {
    const n = Math.min(3, Math.max(1, r.fm.length)); dist[n]++;
    const oldSet = oldFamsOf(r), newSet = new Set(r.fm);
    for (const f of oldSet) oldPop[f]++;
    for (const f of newSet) newPop[f]++;
    let dropped = 0; for (const f of oldSet) if (!newSet.has(f)) dropped++;
    if (dropped > 0) lost.push({ name: r.name, plays: r.plays, from: [...oldSet].map(famName), to: r.fm.map(famName) });
  }
  console.log("\n── GENRE MEMBERSHIP AUDIT (mention ≠ membership) ──");
  console.log(`EXPLORE artists: ${EXPLORE.length} · memberships → 1 fam: ${dist[1]} · 2 fams: ${dist[2]} · 3 fams: ${dist[3]}`);
  console.log("per-family filterable population  old(any-sub) → new(fm)  Δ%:");
  FAMILIES.forEach((f, i) => {
    if (f.grey) return;
    const o = oldPop[i], nw = newPop[i], d = o ? Math.round((nw - o) / o * 1000) / 10 : 0;
    console.log(`  ${f.family.padEnd(34)} ${String(o).padStart(5)} → ${String(nw).padStart(5)}   ${d >= 0 ? "+" : ""}${d}%`);
  });
  const lostTop = lost.sort((a, b) => b.plays - a.plays).slice(0, 15);
  console.log(`artists that LOST a family membership (top 15 by plays; of ${lost.length} total):`);
  for (const a of lostTop) console.log(`  ${String(a.plays).padStart(6)}  ${a.name.padEnd(28)} [${a.from.join(", ")}] → [${a.to.join(", ")}]`);
  const three = EXPLORE.filter(r => r.fm.length === 3).sort((a, b) => b.plays - a.plays).slice(0, 15);
  console.log(`highest-play 3-membership artists (top 15):`);
  for (const r of three) console.log(`  ${String(r.plays).padStart(6)}  ${r.name.padEnd(28)} [${r.fm.map(famName).join(", ")}]`);
  console.log("── end audit ──\n");
}

// ─────────── THUMBS — Discogs cover thumbnail per explorable artist id (covers everywhere) ───────────
// Shipped as a compact { id → 150px url } map so the ranking rows and MiniArtist pages show real
// art, not just generative covers. Only thumbnails (bios/members stay build-side to keep payload sane).
// Ship a 150px Discogs cover for every explorable non-kept artist that has one (kept artists
// already carry full images in their ARTISTS record). ~+215KB over the old 1200 cap, but the
// user wanted covers everywhere — generative tiles only remain where Discogs has no image.
const THUMBS = {};
// THUMBS_HI — the FULL-RES (≈600px, q90) Discogs image for the same explorable artist, shipped
// deferred (music-rest.js) so grid CARDS render crisp on retina without softening from the 150px
// q40 thumb. Only stored when the full image is a DIFFERENT url than the thumb (Discogs case);
// Spotify-only entries already resolve to a 640px photo, and last.fm has no larger variant, so
// those add nothing. Eager first paint is untouched (THUMBS stays in core; HI is REST-only). The
// small ranked rows keep using THUMBS; only the large square cards prefer THUMBS_HI (see GenCover).
const THUMBS_HI = {};
for (const a of EXPLORE) {
  if (byName[a.name]) continue;              // kept artists resolve via byId already
  const t = thumbOf(a.name);   // Discogs thumb, else last.fm, else Spotify photo
  if (t) THUMBS[a.id] = t;
  const full = imageOf(a.name);   // full 600px Discogs image (else last.fm/Spotify — same as thumb)
  if (full && full !== t) THUMBS_HI[a.id] = full;
}

// ─────────── ARTIST DETAIL — lazy top tracks/albums for every non-kept EXPLORE artist ───────────
// Kept artists carry topTracks/topAlbums in their full record; the long tail gets them here, in a
// lazy file (interned titles) fetched once on first MiniArtist visit — keeps music-data.js lean.
{
  const detailNames = new Set(EXPLORE.filter(a => !byName[a.name]).map(a => a.name));
  const tBy = new Map(), aBy = new Map();
  const bucket = (m, src) => { for (const [k, plays] of src) { const ix = k.indexOf("\x00"); if (ix < 0) continue; const artist = k.slice(0, ix); if (!detailNames.has(artist)) continue; if (!m.has(artist)) m.set(artist, []); m.get(artist).push([k.slice(ix + 1), plays]); } };
  bucket(tBy, trackPlays); bucket(aBy, albumPlays);
  const NAMES = [], NI = new Map();
  const intern = (s) => { let i = NI.get(s); if (i == null) { i = NAMES.length; NI.set(s, i); NAMES.push(s); } return i; };
  const top = (arr) => (arr || []).sort((x, y) => y[1] - x[1]).slice(0, 12).map(([t, p]) => [intern(t), p]);
  // albums carry a 3rd slot: the release-type kind (single/ep/album/comp/live/ost).
  // singles that resolve onto a host album/ep carry a 4th slot: that host's canonical slug.
  const topAlb = (arr, artist) => (arr || []).sort((x, y) => y[1] - x[1]).slice(0, 12).map(([t, p]) => {
    const kind = albumKind(artist, t);
    const tup = [intern(t), p, kind];
    if (kind === "single") { const on = singleHostSlug(artist, t); if (on) tup.push(on); }
    return tup;
  });
  const DETAIL = {};
  for (const a of EXPLORE) {
    if (byName[a.name]) continue;
    const rec = {};
    const t = top(tBy.get(a.name)), al = topAlb(aBy.get(a.name), a.name);
    if (t.length) rec.t = t;
    if (al.length) rec.al = al;
    const bio = bioOf(a.name) || dgProfileOf(a.name);          // last.fm bio, else Discogs profile
    if (bio) rec.bio = bio.length > 700 ? bio.slice(0, 700).replace(/\s+\S*$/, "") + "…" : bio;
    const mem = [...new Set([...membersOf(a.name), ...dgMembersOf(a.name)])].slice(0, 12);
    if (mem.length) rec.mem = mem;
    const sim = realSimilar(a.name);                           // last.fm similar artists (names)
    if (sim && sim.length) rec.sim = sim.slice(0, 6);
    if (Object.keys(rec).length) DETAIL[a.id] = rec;
  }
  fs.writeFileSync(path.join(__dirname, "artist-detail.js"), `// GENERATED by build-data.js — lazy top tracks/albums for long-tail artists.\nwindow.ROTATION_ADETAIL = { names: ${JSON.stringify(NAMES)}, d: ${JSON.stringify(DETAIL)} };\n`);
  console.log(`artist-detail.js: ${Object.keys(DETAIL).length} artists · ${NAMES.length} interned titles`);
}

// ─────────── GENRE_FLOW — per-year weights for the taste-journey streamgraph ───────────
// Each artist's yearly plays go to its PRIMARY subgenre (s[0]); family weight = that subgenre's
// family. Covers the top-3000 EXPLORE artists that carry per-year data.
let GENRE_FLOW = null;
{
  const flowYears = years.filter(y => y >= 2010 && (yearTotals.get(y) || 0) >= 500);
  const subRows = flowYears.map(year => {
    const sw = new Array(SUBS.length).fill(0);
    for (const a of EXPLORE) { const p = a.yp ? (a.yp[year] || 0) : 0; if (p) sw[a.s[0]] += p; }
    return sw;
  });
  const famRows = subRows.map(sw => { const fw = new Array(FAMILIES.length).fill(0); sw.forEach((v, si) => { if (v) fw[SUBS[si].fam] += v; }); return fw; });
  // ROLLING LAST 365 DAYS (2026-08-19) — what the Records page ranks its genre shelves by.
  // The per-year rows above cannot answer it: in August "this year" is eight months and "last
  // year" is already stale, and neither is what "lately" means. The scrobbles carry real
  // timestamps so the window is measured directly. They are newest-first, so the walk breaks at
  // the cutoff instead of scanning two decades of history.
  const r12 = new Array(FAMILIES.length).fill(0);
  {
    const cutoff = Date.now() - 365 * 864e5;
    const famCache = new Map();                    // artist name → family index, resolved once each
    for (const s of scrobbles) {
      if (!s[3]) continue;                         // undated rows carry no timestamp to place
      if (s[3] < cutoff) break;
      let fi = famCache.get(s[0]);
      if (fi === undefined) { fi = familyIdxByName(s[0]); famCache.set(s[0], fi); }
      if (fi >= 0) r12[fi]++;
    }
  }
  GENRE_FLOW = { families: FAMILIES.map((f, i) => ({ i, family: f.family, hue: f.hue })), years: flowYears.map((y, i) => ({ year: y, fams: famRows[i] })), r12 };
}

// ─────────── TASTE_ERAS — auto-segmented chapters of your taste (Phase 3) ───────────
// Build monthly genre-family mix vectors, then binary-segment the timeline at the points where
// the mix shifts most (change-point detection). Each era = a stretch where your taste held a
// shape; the boundaries + "what rose / what faded" are found, not hand-drawn. (Needs EXPLORE.s —
// computed here, after EXPLORE is built, and attached to the already-assembled INSIGHTS.)
{
  const F = FAMILIES.length;
  const artFam = new Map();
  for (const a of EXPLORE) { if (a.s && a.s.length && SUBS[a.s[0]]) artFam.set(a.name, SUBS[a.s[0]].fam); }
  const monthFam = new Map();   // "YYYY-MM" -> [F] covered plays
  for (const [artist, , , ms] of scrobbles) {
    const f = artFam.get(artist); if (f == null) continue;
    const d = new Date(ms), key = d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0");
    let v = monthFam.get(key); if (!v) { v = new Array(F).fill(0); monthFam.set(key, v); }
    v[f]++;
  }
  const pts = [];   // chronological normalized vectors with enough coverage
  for (const key of [...monthFam.keys()].sort()) {
    const v = monthFam.get(key), tot = v.reduce((a, b) => a + b, 0);
    if (tot < 80) continue;
    pts.push({ month: key, vec: v.map(x => x / tot), w: tot });
  }
  const MINLEN = 4, MAXERAS = 7;
  const cost = (a, b) => {
    let W = 0; const mean = new Array(F).fill(0);
    for (let k = a; k <= b; k++) { const p = pts[k]; W += p.w; for (let f = 0; f < F; f++) mean[f] += p.vec[f] * p.w; }
    for (let f = 0; f < F; f++) mean[f] /= W;
    let c = 0;
    for (let k = a; k <= b; k++) { const p = pts[k]; let d = 0; for (let f = 0; f < F; f++) { const e = p.vec[f] - mean[f]; d += e * e; } c += p.w * d; }
    return c;
  };
  const bestSplit = (a, b) => {
    const base = cost(a, b); let m = -1, gain = 0;
    for (let s = a + MINLEN; s <= b - MINLEN + 1; s++) { const g = base - cost(a, s - 1) - cost(s, b); if (g > gain) { gain = g; m = s; } }
    return { m, gain };
  };
  if (pts.length >= 2 * MINLEN) {
    const total = cost(0, pts.length - 1);
    const segs = [{ a: 0, b: pts.length - 1 }];
    while (segs.length < MAXERAS) {
      let pick = null, pi = -1;
      for (let s = 0; s < segs.length; s++) { const { a, b } = segs[s]; if (b - a + 1 < 2 * MINLEN) continue; const sp = bestSplit(a, b); if (sp.m > 0 && (!pick || sp.gain > pick.gain)) { pick = sp; pi = s; } }
      if (!pick || pick.gain < total * 0.04) break;   // stop when the best remaining split is marginal
      const { a, b } = segs[pi]; segs.splice(pi, 1, { a, b: pick.m - 1 }, { a: pick.m, b });
    }
    segs.sort((x, y) => x.a - y.a);
    const famName = (f) => (FAMILIES[f] || {}).family, famHue = (f) => (FAMILIES[f] || {}).hue || 0;
    const eras = segs.map(s => {
      const mean = new Array(F).fill(0); let W = 0, plays = 0;
      for (let k = s.a; k <= s.b; k++) { const p = pts[k]; W += p.w; plays += p.w; for (let f = 0; f < F; f++) mean[f] += p.vec[f] * p.w; }
      for (let f = 0; f < F; f++) mean[f] /= W;
      const topFams = mean.map((v, f) => ({ f, v })).sort((a, b) => b.v - a.v).slice(0, 3).filter(x => x.v > 0.07)
        .map(x => ({ fam: famName(x.f), hue: famHue(x.f), share: Math.round(x.v * 100) }));
      return { start: pts[s.a].month, end: pts[s.b].month, plays, _mean: mean, topFams };
    });
    for (let i = 1; i < eras.length; i++) {
      const prev = eras[i - 1]._mean, cur = eras[i]._mean;
      const dz = cur.map((v, f) => ({ f, d: v - prev[f] }));
      const up = dz.slice().sort((a, b) => b.d - a.d)[0], down = dz.slice().sort((a, b) => a.d - b.d)[0];
      eras[i].shift = {
        up: up.d > 0.05 ? { fam: famName(up.f), hue: famHue(up.f), d: Math.round(up.d * 100) } : null,
        down: down.d < -0.05 ? { fam: famName(down.f), d: Math.round(-down.d * 100) } : null,
      };
    }
    eras.forEach(e => delete e._mean);
    INSIGHTS.TASTE_ERAS = { eras };
    console.log(`taste eras: ${eras.length} chapters — ${eras.map(e => e.start.slice(0, 4) + (e.topFams[0] ? "/" + e.topFams[0].fam.split(" ")[0] : "")).join(" · ")}`);
  }
}

// ─────────── ARTIST_FLOW — per kept artist, top albums/songs flowing over their active years ───────────
// Powers a Journey-style streamgraph on each artist page. Per-album-per-year and per-song-per-year
// counts from the dated scrobbles; trimmed to the artist's active span so the chart isn't padded.
let ARTIST_FLOW = null;
{
  const fy = GENRE_FLOW.years.map(y => y.year);
  const yIdx = new Map(fy.map((y, i) => [y, i]));
  const total = (vals) => vals.reduce((s, v) => s + v, 0);
  const norm = (s) => s.toLowerCase().replace(/\[[^\]]*\]/g, "").replace(/\([^)]*\)/g, "")
    .replace(/\b(deluxe|remaster(ed)?|edition|version|disc\s*\d*|bonus|expanded|anniversary|mastered|audiophile|left|right|reissue|special|limited)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ").trim();
  // artist → { albYear: Map(album→arr), albSong: Map(album→Map(song→arr)), songYear: Map(song→arr) }
  const exploreNames = new Set(EXPLORE.map(a => a.name));   // carry the flow to the long tail too
  const acc = new Map();
  for (const [artist, rawAlbum, track, ms] of scrobbles) {
    if (!byName[artist] && !exploreNames.has(artist)) continue;
    const yi = yIdx.get(new Date(ms).getUTCFullYear());
    if (yi == null) continue;
    // singles→LP absorb: attribute an absorbed single's plays to its LP so the flowmap streams the
    // single UNDER the LP (single stops appearing as its own blob). Link only — the single's own
    // album row + plays elsewhere are untouched. See ALBUM_ABSORB / album-absorb.js.
    const album = absorbAlbumTitle(artist, rawAlbum);
    if (!acc.has(artist)) acc.set(artist, { albYear: new Map(), albSong: new Map(), songYear: new Map() });
    const A = acc.get(artist);
    if (track) { if (!A.songYear.has(track)) A.songYear.set(track, new Array(fy.length).fill(0)); A.songYear.get(track)[yi]++; }
    if (album) {
      if (!A.albYear.has(album)) A.albYear.set(album, new Array(fy.length).fill(0)); A.albYear.get(album)[yi]++;
      if (track) {
        if (!A.albSong.has(album)) A.albSong.set(album, new Map());
        const sm = A.albSong.get(album);
        if (!sm.has(track)) sm.set(track, new Array(fy.length).fill(0)); sm.get(track)[yi]++;
      }
    }
  }
  const span = (arrs) => { let lo = fy.length, hi = -1; for (const v of arrs) v.forEach((x, i) => { if (x) { if (i < lo) lo = i; if (i > hi) hi = i; } }); return [lo, hi]; };
  // top N from Map(name→arr) over [lo,hi] + an "everything else" rollup
  const seriesFromMap = (m, n, lo, hi) => {
    const all = [...m.entries()].map(([name, vals]) => ({ name, vals, t: total(vals) })).filter(s => s.t > 0).sort((a, b) => b.t - a.t);
    const top = all.slice(0, n).map(s => ({ name: s.name, vals: s.vals.slice(lo, hi + 1) }));
    if (all.length > n) { const o = new Array(fy.length).fill(0); for (const r of all.slice(n)) r.vals.forEach((v, i) => o[i] += v); top.push({ name: "everything else", vals: o.slice(lo, hi + 1), other: 1 }); }
    return top;
  };
  // merge album editions/discs (The Fragile / [Left] / Disc 1 → The Fragile) incl. their songs
  const mergeAlb = (albYear, albSong) => {
    const g = new Map();
    for (const [title, vals] of albYear) {
      const k = norm(title) || title.toLowerCase(), t = total(vals);
      if (!g.has(k)) g.set(k, { title, vals: new Array(fy.length).fill(0), best: -1, songs: new Map() });
      const e = g.get(k);
      for (let i = 0; i < fy.length; i++) e.vals[i] += vals[i];
      if (t > e.best) { e.best = t; e.title = title; }
      const sm = albSong.get(title);
      if (sm) for (const [song, sv] of sm) { if (!e.songs.has(song)) e.songs.set(song, new Array(fy.length).fill(0)); const d = e.songs.get(song); for (let i = 0; i < fy.length; i++) d[i] += sv[i]; }
    }
    return [...g.values()];
  };
  const byId = {};
  const emit = (id, name, kept) => {
    if (byId[id]) return;
    const A = acc.get(name); if (!A) return;
    const [lo, hi] = span([...A.albYear.values(), ...A.songYear.values()]);
    if (hi < lo) return;
    if (!kept && hi === lo) return;            // long tail: skip single-year artists (no meaningful flow)
    const albCap = kept ? 15 : 10, songCap = kept ? 20 : 12;
    const merged = mergeAlb(A.albYear, A.albSong).map(e => ({ ...e, t: total(e.vals) })).sort((x, y) => y.t - x.t);
    const albums = merged.slice(0, albCap).map(e => {
      const [alo, ahi] = span([...e.songs.values(), e.vals]);
      return { name: e.title, vals: e.vals.slice(lo, hi + 1), tyears: fy.slice(alo, ahi + 1), tracks: seriesFromMap(e.songs, songCap, alo, ahi) };
    });
    if (merged.length > albCap) { const o = new Array(fy.length).fill(0); for (const e of merged.slice(albCap)) e.vals.forEach((v, i) => o[i] += v); albums.push({ name: "everything else", vals: o.slice(lo, hi + 1), other: 1, tyears: fy.slice(lo, hi + 1), tracks: [] }); }
    byId[id] = { years: fy.slice(lo, hi + 1), albums, tracks: seriesFromMap(A.songYear, songCap, lo, hi) };
  };
  for (const a of ARTISTS) emit(a.id, a.name, true);
  // long tail: only artists with enough history for a meaningful flow (keeps the lazy file lean)
  for (const a of EXPLORE) if (!byName[a.name] && a.plays >= 30) emit(a.id, a.name, false);
  ARTIST_FLOW = { byId };
}
// lazy-loaded on the first artist-page visit — kept OUT of music-data.js so first paint stays lean
fs.writeFileSync(path.join(__dirname, "artist-flow.js"), "// GENERATED by build-data.js — per-artist album/song flow (lazy-loaded)\nwindow.ROTATION_FLOW = " + JSON.stringify(ARTIST_FLOW) + ";\n", "utf8");
console.log(`artist-flow.js written (${(fs.statSync(path.join(__dirname, "artist-flow.js")).size / 1024).toFixed(0)} KB · ${Object.keys(ARTIST_FLOW.byId).length} artists)`);

// ─────────── CALENDAR — daily heatmap + day/week/month overview summaries (lazy file) ───────────
{
  const yset = new Set();
  for (const d of dayCounts.keys()) yset.add(+d.slice(0, 4));
  const calYears = [...yset].filter(y => y >= 2010).sort((a, b) => a - b);
  const byYear = {};
  let maxDay = 0;
  for (const y of calYears) {
    const leap = (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0));
    const N = leap ? 366 : 365;
    const counts = new Array(N).fill(0), tops = new Array(N).fill(0);
    const jan1 = Date.UTC(y, 0, 1);
    for (let d = 0; d < N; d++) {
      const key = new Date(jan1 + d * 86400e3).toISOString().slice(0, 10);
      const c = dayCounts.get(key) || 0;
      counts[d] = c;
      if (c > maxDay) maxDay = c;
      if (c > 0 && dayTopArtist.has(key)) {
        const [name, plays] = [...dayTopArtist.get(key).entries()].sort((a, b) => b[1] - a[1])[0];
        tops[d] = [name, plays];
      }
    }
    byYear[y] = { counts, tops };
  }

  // period summaries: top artists/albums/songs + Sound DNA per day/week/month. Strings are interned
  // into a shared pool (artists/albums/songs repeat across day→week→month) to keep the file sane.
  const pool = [], poolIdx = new Map();
  const intern = (s) => { let i = poolIdx.get(s); if (i == null) { i = pool.length; pool.push(s); poolIdx.set(s, i); } return i; };
  const audioMemo = new Map();
  const DAX = ["energy", "valence", "acoustic", "tempo", "dance", "instr"];
  const audioOf = (name) => {
    if (audioMemo.has(name)) return audioMemo.get(name);
    const m = META[name];
    const a = (m && m.audio) ? { energy: m.audio[0], valence: m.audio[1], acoustic: m.audio[2], tempo: m.audio[3], dance: m.audio[4], instr: m.audio[5] } : tagAudio(cachedTags(name));
    audioMemo.set(name, a); return a;
  };
  const mk = () => ({ tot: 0, art: new Map(), alb: new Map(), trk: new Map(), days: new Set() });
  const day = new Map(), week = new Map(), month = new Map();
  const dayHours = new Map();   // dayKey -> [24] play counts by hour
  const monthHourP = new Map(); // monKey -> [24] period objects
  const bump = (P, artist, album, track, dayKey) => {
    P.tot++; P.days.add(dayKey);
    P.art.set(artist, (P.art.get(artist) || 0) + 1);
    if (album) { const k = album + "\x00" + artist; P.alb.set(k, (P.alb.get(k) || 0) + 1); }
    if (track) { const k = track + "\x00" + artist; P.trk.set(k, (P.trk.get(k) || 0) + 1); }
  };
  const getP = (map, key) => { let P = map.get(key); if (!P) { P = mk(); map.set(key, P); } return P; };
  for (const [artist, album, track, ms] of scrobbles) {
    const dt = new Date(ms);
    if (dt.getUTCFullYear() < 2010) continue;
    const dayKey = dt.toISOString().slice(0, 10);
    const monKey = dayKey.slice(0, 7);
    const dow = (dt.getUTCDay() + 6) % 7;
    const weekKey = new Date(ms - dow * 86400e3).toISOString().slice(0, 10);  // Monday of the week
    const hour = dt.getUTCHours();
    let dh = dayHours.get(dayKey); if (!dh) { dh = new Array(24).fill(0); dayHours.set(dayKey, dh); } dh[hour]++;
    let mh = monthHourP.get(monKey); if (!mh) { mh = Array.from({ length: 24 }, mk); monthHourP.set(monKey, mh); }
    bump(mh[hour], artist, album, track, dayKey);
    bump(getP(day, dayKey), artist, album, track, dayKey);
    bump(getP(week, weekKey), artist, album, track, dayKey);
    bump(getP(month, monKey), artist, album, track, dayKey);
  }
  const topArt = (m, n) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([name, p]) => [intern(name), p]);
  const topItem = (m, n) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, p]) => { const ix = k.indexOf("\x00"); return [intern(k.slice(0, ix)), intern(k.slice(ix + 1)), p]; });
  const dnaOf = (artMap, tot) => { const s = { energy: 0, valence: 0, acoustic: 0, tempo: 0, dance: 0, instr: 0 }; for (const [name, p] of artMap) { const a = audioOf(name); for (const ax of DAX) s[ax] += a[ax] * p; } return DAX.map(ax => Math.round(s[ax] / (tot || 1) * 100) / 100); };
  const emit = (map, minPlays, na, nal, ns) => { const out = {}; for (const [key, P] of map) { if (P.tot < minPlays) continue; out[key] = { t: P.tot, n: P.days.size, a: topArt(P.art, na), al: topItem(P.alb, nal), s: topItem(P.trk, ns), d: dnaOf(P.art, P.tot) }; } return out; };
  // days get tighter caps (one day rarely has 10 meaningful songs) + a 15-play floor; week/month full.
  const periods = { day: emit(day, 15, 5, 4, 6), week: emit(week, 5, 6, 5, 10), month: emit(month, 10, 6, 5, 10), names: pool };
  // Tier 1 — per-day hour histogram so the heatmap can filter by hour (0 for empty days)
  for (const y of calYears) {
    const N = byYear[y].counts.length, jan1 = Date.UTC(y, 0, 1);
    const hrs = new Array(N).fill(0);
    for (let d = 0; d < N; d++) { const key = new Date(jan1 + d * 86400e3).toISOString().slice(0, 10); const dh = dayHours.get(key); if (dh) hrs[d] = dh; }
    byYear[y].hours = hrs;
  }
  // Tier 2 — per-month x hour top artists/albums/songs (breakdown reacts to the hour filter at month level)
  for (const monKey of Object.keys(periods.month)) {
    const mh = monthHourP.get(monKey); if (!mh) continue;
    const h = {};
    for (let hr = 0; hr < 24; hr++) { const P = mh[hr]; if (!P || P.tot < 5) continue;
      h[hr] = { t: P.tot, a: topArt(P.art, 6), al: topItem(P.alb, 5), s: topItem(P.trk, 10), d: dnaOf(P.art, P.tot) }; }
    periods.month[monKey].h = h;
  }

  // tier 1: the heatmap (loads when the Calendar tab opens). tier 2: the period detail
  // (loads only when a day/week/month is first clicked) — keeps the heatmap snappy.
  const CAL = { years: calYears, byYear, max: maxDay };
  fs.writeFileSync(path.join(__dirname, "calendar.js"), "// GENERATED by build-data.js — daily listening heatmap (lazy-loaded)\nwindow.ROTATION_CAL = " + JSON.stringify(CAL) + ";\n", "utf8");
  fs.writeFileSync(path.join(__dirname, "calendar-detail.js"), "// GENERATED by build-data.js — calendar period summaries (lazy-loaded on first period click)\nwindow.ROTATION_CAL_DETAIL = " + JSON.stringify(periods) + ";\n", "utf8");
  console.log(`calendar.js ${(fs.statSync(path.join(__dirname, "calendar.js")).size / 1024).toFixed(0)}KB · calendar-detail.js ${(fs.statSync(path.join(__dirname, "calendar-detail.js")).size / 1024).toFixed(0)}KB (${Object.keys(periods.day).length}d/${Object.keys(periods.week).length}w/${Object.keys(periods.month).length}m · ${pool.length} names)`);
}

// ─────────── DAY SERIES — flat per-day play counts (Phase 1; lazy, tiny) ───────────
// A dense array of daily play totals from the first dated day to the last. Lets the Overview
// stat strip compute avg/day, heaviest-day, and share-of-history for ANY date filter (year or
// calendar day/week/month) client-side — no per-period build export needed. Excludes the
// undated 2006–2010 smear (dayCounts is dated-only), which is exactly the filterable range.
{
  const dk = [...dayCounts.keys()].sort();
  const startMs = new Date(dk[0]).getTime(), endMs = new Date(dk[dk.length - 1]).getTime();
  const N = Math.round((endMs - startMs) / 86400e3) + 1;
  const counts = new Array(N).fill(0);
  let total = 0;
  for (const [k, c] of dayCounts) { const i = Math.round((new Date(k).getTime() - startMs) / 86400e3); if (i >= 0 && i < N) { counts[i] = c; total += c; } }
  const DAYS = { start: dk[0], days: N, total, counts };
  fs.writeFileSync(path.join(__dirname, "day-series.js"), "// GENERATED by build-data.js — flat per-day play counts (lazy; filter-reactive Overview stats)\nwindow.ROTATION_DAYS = " + JSON.stringify(DAYS) + ";\n", "utf8");
  console.log(`day-series.js written (${(fs.statSync(path.join(__dirname, "day-series.js")).size / 1024).toFixed(0)} KB · ${N} days, ${total} plays)`);

  // ─────────── DAY × HOUR — per-day hour histogram (Phase; lazy, UNSHARDED for now) ───────────
  // For the Calendar's Rhythm clock: when a custom range is active, the clock re-histograms over
  // just the range's days. day-0 == day-series start (dk[0]) so a dayOffset here indexes the same
  // day as ROTATION_DAYS.counts[offset] and artist-days offsets. Hour convention EXACTLY matches
  // the clock grid + calendar-detail dayHours: new Date(ms).getUTCHours() on the TZ-shifted ms.
  //   rows["<dayOffset b36>"] = "<H:C;H:C;...>", H = hour 0–23 b36, C = play count b36, hours asc.
  // One entry per active day. Sum of a day's C equals ROTATION_DAYS.counts[offset] (same source).
  {
    const dhByOffset = new Map();   // dayOffset → Array(24) counts
    for (const [, , , ms] of scrobbles) {
      const d = new Date(ms);
      const dk2 = d.toISOString().slice(0, 10);
      const off = Math.round((new Date(dk2 + "T00:00:00Z").getTime() - startMs) / 86400e3);
      if (off < 0) continue;
      let arr = dhByOffset.get(off); if (!arr) { arr = new Array(24).fill(0); dhByOffset.set(off, arr); }
      arr[d.getUTCHours()]++;
    }
    const rows = {};
    for (const [off, arr] of dhByOffset) {
      const parts = [];
      for (let h = 0; h < 24; h++) if (arr[h]) parts.push(h.toString(36) + ":" + arr[h].toString(36));
      rows[off.toString(36)] = parts.join(";");
    }
    const DH = { v: 1, start: dk[0], rows };
    fs.writeFileSync(path.join(__dirname, "day-hours.js"), "// GENERATED by build-data.js — per-day hour histogram (base36; lazy, unsharded)\nwindow.ROTATION_DAY_HOURS = " + JSON.stringify(DH) + ";\n", "utf8");
    const _dhKB = fs.statSync(path.join(__dirname, "day-hours.js")).size / 1024;
    console.log(`day-hours.js written (${_dhKB.toFixed(0)} KB · ${Object.keys(rows).length} active days)${_dhKB > 1536 ? " ⚠ >1.5MB — shipping unsharded (owner's call)" : ""}`);
  }
}

// ─────────── PULSE — tiny recent-listening snapshot for Culture's Tonight's Pick ───────────
// Cross-app artifact: Culture reads this to nudge its "deal" toward/against what I've been
// spinning lately. Windows are relative to the NEWEST scrobble date in the data (not wall clock),
// so the pulse stays meaningful even on a stale rebuild. Shares = fraction of plays in the window.
{
  let newestMs = 0;                       // no spread: 317k args blows the call stack
  for (const s of scrobbles) if (s[3] > newestMs) newestMs = s[3];
  if (!newestMs) newestMs = Date.now();
  const famMemo = new Map();
  const famOf = (name) => { if (famMemo.has(name)) return famMemo.get(name); const i = familyIdxByName(name); const f = i >= 0 ? (FAMILIES[i] || {}).family : "Other"; famMemo.set(name, f); return f; };
  const win = (days) => {
    const cutoff = newestMs - (days * 86400e3);
    const fam = new Map(), art = new Map();
    let plays = 0;
    for (const [artist, , , ms] of scrobbles) {
      if (ms < cutoff) continue;
      plays++;
      const f = famOf(artist);
      fam.set(f, (fam.get(f) || 0) + 1);
      art.set(artist, (art.get(artist) || 0) + 1);
    }
    const families = [...fam.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, c]) => ({ name, share: Math.round(c / (plays || 1) * 1000) / 1000 }));
    const topArtists = [...art.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([nm]) => nm);
    // SUBGENRE TAGS (2026-08-19) — Culture's Tonight's Pick matches a listening week onto film
    // badges, and 15 families is a very coarse instrument for that: "Alternative/Indie" says far
    // less about a mood than "shoegaze" or "post-punk" does. The raw last.fm tags behind the top
    // artists of the window are carried too, so the crossover has something finer to match on.
    const tag = new Map();
    for (const [artist, , , ms] of scrobbles) {
      if (ms < cutoff) continue;
      for (const t of (cachedTags(artist) || []).slice(0, 4)) {
        // cachedTags rows are "name,weight" — keep the name only
        const k = String(t).split(",")[0].toLowerCase().trim();
        if (k) tag.set(k, (tag.get(k) || 0) + 1);
      }
    }
    const tags = [...tag.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14)
      .map(([name, c]) => ({ name, share: Math.round(c / (plays || 1) * 1000) / 1000 }));
    return { plays, families, tags, topArtists };
  };
  const PULSE = { generated: new Date(newestMs).toISOString().slice(0, 10), last30: win(30), last7: win(7) };
  fs.writeFileSync(path.join(__dirname, "pulse.js"), "// GENERATED by build-data.js — recent-listening snapshot for Culture's Tonight's Pick (cross-app)\nwindow.ROTATION_PULSE = " + JSON.stringify(PULSE) + ";\n", "utf8");
  console.log(`pulse.js written (last7: ${PULSE.last7.plays} plays / ${PULSE.last7.families.length} fams · last30: ${PULSE.last30.plays} plays)`);
}

// ─────────── GEO DETAIL — per-country/city top artists/albums/songs + DNA (lazy file) ───────────
{
  const pool = [], poolIdx = new Map();
  const intern = (s) => { let i = poolIdx.get(s); if (i == null) { i = pool.length; pool.push(s); poolIdx.set(s, i); } return i; };
  const audioMemo = new Map();
  const DAX = ["energy", "valence", "acoustic", "tempo", "dance", "instr"];
  const audioOf = (name) => { if (audioMemo.has(name)) return audioMemo.get(name); const m = META[name]; const a = (m && m.audio) ? { energy: m.audio[0], valence: m.audio[1], acoustic: m.audio[2], tempo: m.audio[3], dance: m.audio[4], instr: m.audio[5] } : tagAudio(cachedTags(name)); audioMemo.set(name, a); return a; };
  const mk = () => ({ tot: 0, art: new Map(), alb: new Map(), trk: new Map() });
  const cc = new Map(), ct = new Map();
  const bump = (P, artist, album, track) => { P.tot++; P.art.set(artist, (P.art.get(artist) || 0) + 1); if (album) { const k = album + "\x00" + artist; P.alb.set(k, (P.alb.get(k) || 0) + 1); } if (track) { const k = track + "\x00" + artist; P.trk.set(k, (P.trk.get(k) || 0) + 1); } };
  const get = (m, k) => { let P = m.get(k); if (!P) { P = mk(); m.set(k, P); } return P; };
  for (const [artist, album, track, ms] of scrobbles) {
    const o = originOf(artist);
    if (!o) continue;
    bump(get(cc, o.country), artist, album, track);
    if (o.city && CITYCOORDS[o.country + "|" + o.city]) bump(get(ct, o.country + "|" + o.city), artist, album, track);
  }
  const topArt = (m, n) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([nm, p]) => [intern(nm), p]);
  const topItem = (m, n) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, p]) => { const ix = k.indexOf("\x00"); return [intern(k.slice(0, ix)), intern(k.slice(ix + 1)), p]; });
  const dnaOf = (am, tot) => { const s = { energy: 0, valence: 0, acoustic: 0, tempo: 0, dance: 0, instr: 0 }; for (const [nm, p] of am) { const a = audioOf(nm); for (const ax of DAX) s[ax] += a[ax] * p; } return DAX.map(ax => Math.round(s[ax] / (tot || 1) * 100) / 100); };
  const emit = (m) => { const o = {}; for (const [k, P] of m) o[k] = { t: P.tot, a: topArt(P.art, 10), al: topItem(P.alb, 10), s: topItem(P.trk, 10), d: dnaOf(P.art, P.tot) }; return o; };
  const GEO = { country: emit(cc), city: emit(ct), names: pool };
  fs.writeFileSync(path.join(__dirname, "geo-detail.js"), "// GENERATED — per-country/city overview (lazy-loaded on first map selection)\nwindow.ROTATION_GEO = " + JSON.stringify(GEO) + ";\n");
  console.log(`geo-detail.js written (${(fs.statSync(path.join(__dirname, "geo-detail.js")).size / 1024).toFixed(0)}KB · ${Object.keys(GEO.country).length} countries / ${Object.keys(GEO.city).length} cities)`);
}

// ─────────── CONCERTS: real upcoming events from Ticketmaster (concerts-cache.json) ───────────
// Built by enrich-concerts.js. If the cache is missing, CONCERTS+CITIES are empty
// and the LiveView / ArtistView gigs card show "no upcoming dates" empty states.
// Cities auto-derived from real event data — top 6 cities by event count become picker chips.
const CONCERTS_PATH = path.join(__dirname, "concerts-cache.json");
const CONCERT_CACHE = fs.existsSync(CONCERTS_PATH) ? JSON.parse(fs.readFileSync(CONCERTS_PATH, "utf8")) : {};
const CONCERTS = {};
let CITIES = [];
if (Object.keys(CONCERT_CACHE).length > 0) {
  const todayISO = new Date().toISOString().slice(0, 10);
  const byCity = new Map();
  for (const [artist, info] of Object.entries(CONCERT_CACHE)) {
    for (const e of (info.events || [])) {
      if (!e.date || !e.city) continue;
      if (e.date < todayISO) continue; // skip dates in the past (cache may be stale)
      if (!byCity.has(e.city)) byCity.set(e.city, []);
      byCity.get(e.city).push({
        artistId: slug(artist), artist, hue: hueFor(artist),
        venue: e.venue || "", city: e.city, country: e.country || "",
        date: e.date, url: e.url || "", inLibrary: !!byName[artist],
      });
    }
  }
  // Top 8 cities by event count → picker chips, default to "your-artist" density when tied
  CITIES = [...byCity.entries()]
    .map(([city, evs]) => ({ city, count: evs.length, yours: evs.filter(g => g.inLibrary).length }))
    .sort((a, b) => b.yours - a.yours || b.count - a.count)
    .slice(0, 8).map(x => x.city);
  for (const city of CITIES) {
    CONCERTS[city] = byCity.get(city)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((ev, i) => ({ id: city.toLowerCase().replace(/\s+/g, "-") + "-" + i, ...ev }));
  }
}

// ─────────── GIGS (attended concerts — setlist.fm, enrich-gigs.js) ───────────
// Fuad's real attended shows w/ setlists. Joined to the listening data: which acts are in the
// library and how deep, which songs you saw live you also play, and whether you saw an artist
// before or after you became a fan (gig date vs first scrobble). Powers the Gigs page + a card.
const GIGS_PATH = path.join(__dirname, "gigs.json");
const GIGS_RAW = fs.existsSync(GIGS_PATH) ? JSON.parse(fs.readFileSync(GIGS_PATH, "utf8")) : null;
// gigs-manual.json — hand-maintained corrections: `override` fixes a setlist.fm entry's fields
// in place (some markings are stand-ins for undocumented shows); `add` appends shows setlist.fm
// doesn't have (festival lineups, small Tokyo club nights). Month-precision dates ("YYYY-MM")
// + approx:1 are allowed; copySongsFrom clones another gig's setlist (same act, repeated set).
const GIGS_MANUAL = _readJson("gigs-manual.json");
let GIGS = null;
if (GIGS_RAW && Array.isArray(GIGS_RAW.gigs) && GIGS_RAW.gigs.length) {
  const rawGigs = GIGS_RAW.gigs.slice();
  for (const o of (GIGS_MANUAL.override || [])) {
    const hit = rawGigs.find(g => g.artist.toLowerCase() === o.match.artist.toLowerCase() && (!o.match.date || g.date === o.match.date));
    if (hit) Object.assign(hit, o.set);
    else console.warn(`gigs-manual: override target not found — ${o.match.artist} ${o.match.date || ""}`);
  }
  for (const a of (GIGS_MANUAL.add || [])) {
    const g = { songs: [], venue: "", city: "", country: "", countryCode: "", lat: null, lng: null, tour: "", url: "", id: "manual-" + slug(a.artist) + "-" + a.date, ...a };
    if (g.copySongsFrom) {
      const src = rawGigs.find(x => x.artist.toLowerCase() === g.copySongsFrom.artist.toLowerCase() && (!g.copySongsFrom.date || x.date === g.copySongsFrom.date));
      if (src) g.songs = src.songs.slice();
      delete g.copySongsFrom;
    }
    g.songs = (g.songs || []).map(s => typeof s === "string" ? { name: s, encore: 0, cover: null, tape: 0, with: null } : s);
    rawGigs.push(g);
  }
  rawGigs.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  // setlist.fm names can differ from library names by case or unicode punctuation (e.g. "Melt‐Banana"
  // with a U+2010 hyphen, "KNEECAP", "Ling tosite sigure"). Match each gig to its library artist by
  // slug so inLibrary / plays / known-songs reflect the real record, not the raw concert name
  // (Fuad, 2026-07-06 — Melt-Banana/Ling Tosite Sigure showed "never in rotation", Kneecap plays 0).
  const nameBySlug = new Map();
  for (const [nm, p] of artistPlays) { const s = slug(nm); if (!nameBySlug.has(s) || p > (artistPlays.get(nameBySlug.get(s)) || 0)) nameBySlug.set(s, nm); }
  // last.fm also disambiguates homonyms with a trailing parenthetical ("WARGASM (UK)") where
  // setlist.fm just prints the name. The plain slug then lands on the near-unplayed namesake, so
  // an act you HAVE seen gets credited 1 play and resurfaces under "still to catch". Same
  // most-played-wins rule, applied to the de-parenthesised slug
  // (Fuad 2026-08-06 — WARGASM 1 play vs WARGASM (UK) 1803).
  for (const [nm, p] of artistPlays) {
    const bare = slug(nm.replace(/\s*\([^)]*\)\s*$/, ""));
    if (!bare || bare === slug(nm)) continue;
    if (p > (artistPlays.get(nameBySlug.get(bare)) || 0)) nameBySlug.set(bare, nm);
  }
  const gigs = rawGigs.map(g => {
    const canon = nameBySlug.get(slug(g.artist)) || g.artist;   // canonical library name for this gig
    const plays = artistPlays.get(canon) || 0;
    const sp = span.get(canon);
    const firstPlay = sp ? iso(sp[0]).slice(0, 10) : null;
    // setlist × your library: songs from this show you also have scrobbles for
    const known = [];
    for (const s of (g.songs || [])) {
      const p = trackPlays.get(canon + "\x00" + s.name) || 0;
      if (p > 0) known.push({ title: s.name, plays: p });
    }
    known.sort((a, b) => b.plays - a.plays);
    return {
      date: g.date, year: +String(g.date).slice(0, 4),
      // id off the CANONICAL name, not the concert billing — otherwise the gig links to a dead
      // artist page and never matches the seen-set that "still to catch" subtracts.
      artist: g.artist, artistId: slug(canon), hue: hueFor(canon),
      inLibrary: plays > 0, plays,
      venue: g.venue, city: g.city, country: g.country, countryCode: g.countryCode,
      lat: g.lat, lng: g.lng, tour: g.tour || "",
      approx: g.approx ? 1 : 0,   // month-precision manual entry — UI shows "May 2025" style
      songCount: (g.songs || []).length,
      knownSongs: known.slice(0, 6), knownCount: known.length,
      // "before you were a fan": saw them ≥120 days before your first scrobble of them
      preFan: (firstPlay && g.date && g.date < firstPlay && plays >= 10) ? 1 : 0,
    };
  });
  // FESTIVAL DAYS — the client groups gigs into "nights" by date; a date with ≥2 acts is a
  // festival day. There's no setlist-level "which songs did you hear across the whole day", so
  // (as the label's phrasing hedges) we surface the songs you most LIVE WITH from that day's
  // acts: pool each act's known-in-rotation songs (already canon-matched, with your play counts),
  // rank across artists, keep the top 5 that clear a plays≥8 floor so filler doesn't pad. Attach
  // per-date so the view can hang it under the collapsed festival card without loading track data.
  const _byDate = new Map();
  for (const g of gigs) { if (!_byDate.has(g.date)) _byDate.set(g.date, []); _byDate.get(g.date).push(g); }
  const topLiveByDate = {};
  for (const [date, list] of _byDate) {
    if (list.length < 2) continue;   // single-act night — the per-gig knownSongs row already covers it
    const pool = [];
    for (const g of list) for (const s of (g.knownSongs || [])) {
      if (s.plays >= 8) pool.push([s.title, g.artist, g.artistId, s.plays]);
    }
    if (!pool.length) continue;
    pool.sort((a, b) => b[3] - a[3]);
    topLiveByDate[date] = pool.slice(0, 5);   // [title, artistName, artistId, plays]
  }

  const seenArtists = new Map();  // artistId → best gig record (slug key: "Paranoid Void" ≡ "paranoid void")
  for (const g of gigs) { const e = seenArtists.get(g.artistId); if (!e || g.plays > e.plays) seenArtists.set(g.artistId, g); }
  const cityMap = new Map();
  for (const g of gigs) { if (!g.city) continue; const k = g.countryCode + "|" + g.city; if (!cityMap.has(k)) cityMap.set(k, { city: g.city, country: g.country, countryCode: g.countryCode, lat: g.lat, lng: g.lng, count: 0 }); cityMap.get(k).count++; }
  const byYear = {};
  for (const g of gigs) byYear[g.year] = (byYear[g.year] || 0) + 1;
  const uniqArtists = [...seenArtists.values()];
  GIGS = {
    fetched: GIGS_RAW.fetched, total: gigs.length,
    artists: seenArtists.size,
    inLibrary: uniqArtists.filter(a => a.inLibrary).length,
    cities: cityMap.size,
    countries: new Set(gigs.map(g => g.countryCode).filter(Boolean)).size,
    songsSeen: gigs.reduce((s, g) => s + g.songCount, 0),
    firstGig: gigs.reduce((m, g) => g.date < m ? g.date : m, gigs[0].date),
    lastGig: gigs.reduce((m, g) => g.date > m ? g.date : m, gigs[0].date),
    gigs, // already newest-first from the enricher
    topLiveByDate,   // festival days → top cross-artist songs you play (date → [[title, artist, artistId, plays]])
    byYear,
    // acts you saw AND love — ranked by how much you play them (deep enough for the +12 pager)
    seenTop: uniqArtists.filter(a => a.inLibrary).sort((a, b) => b.plays - a.plays).slice(0, 60),
    // saw live but (almost) never played — festival discoveries / support acts. Shipped 60 deep to
    // match seenTop, so the +12 pager has somewhere to go (Fuad 2026-08-20 asked for the button and
    // the list was capped at exactly one page, which is why there was nothing to reveal).
    strangers: uniqArtists.filter(a => !a.inLibrary).slice(0, 60),
    // artists you saw before you were a fan
    preFans: uniqArtists.filter(a => a.preFan).sort((a, b) => b.plays - a.plays).slice(0, 8),
    cityList: [...cityMap.values()].sort((a, b) => b.count - a.count),
  };

  // Per-artist "seen live": how many times, when, and which songs — attached to the artist
  // object so the artist page can show a badge + the songs you've watched performed. Also a flat
  // set of "artistSlug~songSlug" performed live, for the TrackView "seen live" mark.
  const perArtist = new Map();
  const liveSongKeys = new Set();
  // Setlist.fm titles often differ from scrobbled titles by suffixes the service omits —
  // "(feat. X)", "(cover)", "(live)", "- Live On BBC…", "(TV-Size)" — so an exact slug match
  // misses them (the track row never gets the 🎤). Resolve each live song to any scrobbled
  // track sharing the same NORMALISED title: strip trailing bracket/paren suffixes and
  // version-y "- …" tails, but only when title text precedes them, so bracket-only interlude
  // titles like "[JFK]" stay intact and can't cross-match a different interlude.
  const _normTitle = (s) => {
    let t = (s || "").trim(), prev;
    do { prev = t; t = t.replace(/(.+?)\s*[\(\[][^\[\]\(\)]*[\)\]]\s*$/, "$1").trim(); } while (t !== prev);
    t = t.replace(/\s*[-–]\s+.*(remaster|live|mono|stereo|edit|version|mix|demo|session|bbc|radio|acoustic|single|album|take|anniversary|remix).*$/i, "").trim();
    t = t.replace(/\s+feat\.?\s+.*$/i, "").trim();
    return t.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
  };
  const _normMap = new Map();   // (artistSlug \x00 normTitle) -> Set(trackSlug)
  for (const k of trackPlays.keys()) {
    const i = k.indexOf("\x00"); if (i < 0) continue;
    const nt = _normTitle(k.slice(i + 1)); if (!nt) continue;
    const mk = slug(k.slice(0, i)) + "\x00" + nt;
    let set = _normMap.get(mk); if (!set) { set = new Set(); _normMap.set(mk, set); }
    set.add(slug(k.slice(i + 1)));
  }
  const _resolveLive = (aid, name) => {   // scrobbled trackSlugs whose normalised title matches
    const nt = _normTitle(name); if (!nt) return [];
    const set = _normMap.get(aid + "\x00" + nt); return set ? [...set] : [];
  };
  for (const g of rawGigs) {   // merged: setlist.fm + gigs-manual adds/overrides
    const aid = slug(g.artist);
    let e = perArtist.get(aid);
    if (!e) { e = { count: 0, dates: [], songs: new Map() }; perArtist.set(aid, e); }
    e.count++;
    e.dates.push(g.date);
    for (const s of (g.songs || [])) {
      if (!s.name) continue;
      liveSongKeys.add(aid + "~" + slug(s.name));
      for (const ts of _resolveLive(aid, s.name)) liveSongKeys.add(aid + "~" + ts); // suffix-mismatch resolution
      e.songs.set(s.name, (e.songs.get(s.name) || 0) + 1); // times seen performed
    }
  }
  for (const a of ARTISTS) {
    const e = perArtist.get(a.id);
    if (!e) continue;
    const dates = e.dates.slice().sort();
    a.seenLive = {
      count: e.count,
      first: dates[0], last: dates[dates.length - 1],
      // songs performed, most-repeated first (then alpha); flag which you also play
      songs: [...e.songs.entries()]
        .map(([title, times]) => ({ title, times, played: (trackPlays.get(a.name + "\x00" + title) || 0) > 0 || _resolveLive(a.id, title).length > 0 }))
        .sort((x, y) => (y.times - x.times) || x.title.localeCompare(y.title)),
    };
  }
  GIGS.liveSongs = [...liveSongKeys]; // TrackView builds a Set from this for the "seen live" badge
}

// ─────────── TOUR (tm-events.json, by enrich-tm.js — weekly Ticketmaster pull) ───────────
// Location-first: every music event around the configured markets (Sydney/Tokyo/Warsaw) whose
// lineup features a library artist. Distilled two ways: a tiny per-artist a.onTour rides
// music-data.js for the artist-page badge; the full artist→events list ships lazily
// (tm-tour-lazy.js — in apps.json deploy[]) and only the Gigs page pulls it in.
let TOUR = null;
const TM_RAW = _readJson("tm-events.json");
if (TM_RAW && TM_RAW.events && TM_RAW.events.length) {
  const _byName = new Map(ARTISTS.map(a => [a.name, a]));
  const _tour = new Map(); // library name → on-tour record
  for (const e of TM_RAW.events) {
    for (const [nm, viaMb] of e.hits) {
      const _pn = pinOf(nm);
      if (_pn && _pn.tmExclude) continue;   // pinned: TM name-match is a wrong entity (e.g. the "Bleach" Nirvana tribute act)
      let r = _tour.get(nm);
      if (!r) {
        const a = _byName.get(nm);
        const lf = lifeOf(nm), wd = wdOf(nm);
        _tour.set(nm, r = {
          id: a ? a.id : slug(nm), name: nm,
          plays: artistPlays.get(nm) || 0,
          mb: 0,                            // 1 = at least one event joined via exact MusicBrainz id
          seen: a && a.seenLive ? a.seenLive.count : 0,
          // disbanded on record, yet touring. Groups only — a deceased Person with events is a
          // tribute/orchestra billing (Morricone, Bill Evans), not a reactivation.
          react: (lf && lf.react) || (lf && lf.ended && lf.type !== "Person") || (wd && wd.dissolved) ? 1 : 0,
          _genres: new Map(),   // TM classification genre → count (fallback taxonomy for unplaced artists)
          events: [],
        });
      }
      if (viaMb) r.mb = 1;
      if (e.genre && e.genre !== "Undefined") r._genres.set(e.genre, (r._genres.get(e.genre) || 0) + 1);
      r.events.push({ d: e.date, ev: e.name, v: e.venue, city: e.city, cc: e.cc, url: e.url, mkt: e.mkt, status: e.status,
        ll: (e.lat != null && e.lng != null) ? [Math.round(e.lat * 100) / 100, Math.round(e.lng * 100) / 100] : null });
    }
  }
  // Ticketmaster lists hospitality/VIP/package tiers as SEPARATE events sharing the real show's
  // date+city (e.g. SoaD Berlin 8 Jul appears 3× — "Business Seat Packages", "VIP Packages", and
  // the actual show). Collapse each date+city to one row, preferring the real billing (Fuad, 2026-07-06).
  const _PKG = /\b(vip|packages?|hospitality|business\s*seat|hot\s*tickets?|premium|suites?|meet\s*&\s*greet|platinum|early\s*entry|upgrades?|add-?on)\b/i;
  const _evScore = ev => (_PKG.test(ev.ev || "") ? 0 : 2) + (ev.v ? 1 : 0);
  const _tourArtists = [..._tour.values()].sort((x, y) => y.plays - x.plays);
  let _pkgDropped = 0;
  for (const r of _tourArtists) {
    const _byKey = new Map();
    for (const ev of r.events) {
      const key = ev.d + "|" + (ev.city || "").toLowerCase() + "|" + (ev.cc || "");
      const cur = _byKey.get(key);
      if (!cur) { _byKey.set(key, ev); continue; }
      _pkgDropped++;
      if (_evScore(ev) > _evScore(cur)) _byKey.set(key, ev);   // keep the most "real" of the tier
    }
    r.events = [..._byKey.values()];
    r.events.sort((x, y) => (x.d < y.d ? -1 : x.d > y.d ? 1 : 0));
    // most-frequent Ticketmaster genre — resolves artists we can't place from our own tags
    r.tmGenre = r._genres.size ? [...r._genres.entries()].sort((a, b) => b[1] - a[1])[0][0] : "";
    delete r._genres;
  }
  TOUR = {
    fetched: TM_RAW.fetched,
    checked: TM_RAW.checked || TM_RAW.fetched,     // last pull attempt (may be newer than fetched if stale)
    warn: TM_RAW.warn || null,                     // {reason, at, markets} when the last pull looked broken
    markets: TM_RAW.markets.map(m => ({ id: m.id, label: m.label, radiusKm: m.radiusKm, scanned: m.scanned, matched: m.matched, stale: !!m.stale })),
    artistCount: _tourArtists.length, eventCount: _tourArtists.reduce((s, r) => s + r.events.length, 0),
    reactivated: _tourArtists.filter(r => r.react).length,
  };
  // artist-page badge payload — [eventCount, nextDate, nextCity]
  for (const r of _tourArtists) {
    const a = _byName.get(r.name); if (!a || !r.events.length) continue;
    a.onTour = [r.events.length, r.events[0].d, r.events[0].city];
  }
  const _tourOut = "// GENERATED by build-data.js — library artists with upcoming Ticketmaster dates (Gigs page).\n"
    + "window.ROTATION_TOUR = " + JSON.stringify({ fetched: TOUR.fetched, markets: TOUR.markets, artists: _tourArtists }) + ";\n";
  fs.writeFileSync(path.join(__dirname, "tm-tour-lazy.js"), _tourOut, "utf8");
  console.log(`tm-tour-lazy: ${_tourArtists.length} artists on tour (${(_tourOut.length / 1024).toFixed(0)} KB) · ${TOUR.reactivated} reactivated · ${_pkgDropped} package/VIP dupes merged`);
}

// ─────────── coverage ledger: kept artists × seen-live × life-status × tour dates ───────────
// "How many of my top artists have I seen, how many haven't I, how many CAN'T I anymore?"
// Four buckets over the kept ARTISTS: seen · still possible (open) · gone for good (ended,
// no comeback in the tour data; deceased Persons always) · second chances (disbanded groups
// with fresh dates you never saw). caught = seen AND since ended ("caught them in time").
if (GIGS) {
  const cov = { total: ARTISTS.length, seen: 0, caught: 0, gone: 0, chance: 0, open: 0,
    goneList: [], caughtList: [], chanceList: [] };
  // ── REACTIVATION: a band on record as done but demonstrably back. Three signals, only the
  // high-precision ones the data supports (2026-08-17):
  //   (C) upcoming Ticketmaster dates (a.onTour) — the strongest, and already excludes deceased
  //       Persons + wrong-entity name-matches (tmExclude pins). This is the existing signal.
  //   (A) WD carries a historical dissolved year while MB's life is NOT ended — the two sources
  //       disagreeing is the fingerprint of a reunion MB has since re-opened (L7, Gossip, X JAPAN,
  //       Kalafina). Clean: 6 artists, all genuine reformations.
  //   (pin) a curated life.react flag (the "react" pin) forces it, no tour join needed.
  // Signal (b) — a studio release dated after the end year — was investigated and REJECTED: MB
  // ships only the release-group PRIMARY type, so live albums / box sets / reissues / greatest-hits
  // all arrive labelled "Album", and an end+2 year gate still resurrects Nirvana, Led Zeppelin,
  // The Doors, Joy Division, CCR… from posthumous live/comp drops. Too noisy to ship on a personal
  // site; the two signals above are precise, so (b) adds only false positives and is left out.
  // A dead solo artist can never reactivate — every path guards on !isPerson.
  // reactInfo carries two DISTINCT years, never conflated (the "back since 'YY was wrong" bug):
  //   comeback — the year the band actually RETURNED. Only set when we genuinely know it: a numeric
  //              `react` pin (TDEP 2024). Never derived from the dissolution/split year.
  //   split    — the dissolution year (MB end / WD dissolved). Used for the honest fallback sub-line
  //              "split 'YY · back" when the comeback year is unknown — labels it as the split so it
  //              never reads as a multi-year reactivation duration.
  const reactInfo = (a, ended, isPerson) => {
    if (isPerson) return null;                                  // deceased/solo person can't reform
    const wdDis = a.wd && a.wd.dissolved ? String(a.wd.dissolved).slice(0, 4) : null;
    const end = (a.life && a.life.end) || null;
    const comeback = (a.life && a.life.reactYear) || null;      // ONLY the pin's explicit comeback year
    // (C) fresh tour dates on a band that's on record as ended (or WD-dissolved) — tour keeps `next`
    if (a.onTour && (ended || wdDis)) return { touring: true, next: a.onTour[1], comeback, split: end || wdDis || null };
    // curated pin (react:true / react:YYYY)
    if (a.life && a.life.react) return { touring: false, next: null, comeback, split: end || wdDis || null };
    // (A) WD dissolved but MB not-ended → the sources disagree = reunited (comeback year unknown)
    if (!ended && wdDis) return { touring: false, next: null, comeback: null, split: wdDis };
    return null;
  };
  for (const a of ARTISTS) {
    const ended = a.life && a.life.ended;
    const isPerson = !!(a.life && a.life.type && a.life.type[0].toLowerCase() === "p");
    // a band whose end was caused by a member's death carries the † like a deceased Person.
    const byDeath = !!(a.life && a.life.diedByDeath);
    const deathYr = byDeath ? ((a.life && a.life.diedYear) || (a.life && a.life.end) || "") : "";
    const ri = reactInfo(a, ended, isPerson);
    const react = !!ri;                                          // reactivated by any supported signal
    // comeback = real return year (or ""); split = dissolution year (or "") for the honest fallback.
    const comebackYr = ri && ri.comeback ? String(ri.comeback).slice(0, 4) : "";
    const splitYr = ri && ri.split ? String(ri.split).slice(0, 4) : "";
    if (a.seenLive) {
      cov.seen++;
      // seen AND (ended or reactivated): stays in "caught them in time". Entry:
      //   [name, id, plays, endYear, personOrDeath(0/1/2), comebackYr, splitYr, deathYr]
      //   idx4: 1 = deceased Person (†), 2 = band ended by member death (†), 0 = plain group.
      if (ended || react) { cov.caught++; cov.caughtList.push([a.name, a.id, a.plays, (a.life && a.life.end || ""), isPerson ? 1 : (byDeath ? 2 : 0), react ? comebackYr : "", react ? splitYr : "", deathYr]); }
    } else if (react) { cov.chance++; cov.chanceList.push([a.name, a.id, a.plays, (ri.touring ? ri.next : ""), comebackYr, splitYr]); }
    else if (ended) { cov.gone++; cov.goneList.push([a.name, a.id, a.plays, (a.life.end || ""), isPerson ? 1 : (byDeath ? 2 : 0), deathYr]); }
    else cov.open++;
  }
  for (const k of ["goneList", "caughtList", "chanceList"]) cov[k].sort((x, y) => y[2] - x[2]);
  cov.goneList = cov.goneList.slice(0, 14);
  cov.caughtList = cov.caughtList.slice(0, 14);
  cov.chanceList = cov.chanceList.slice(0, 10);
  GIGS.coverage = cov;
  console.log(`gig coverage: ${cov.seen} seen (${cov.caught} caught in time) · ${cov.open} open · ${cov.gone} gone · ${cov.chance} second chances — of ${cov.total}`);
}

// ─────────── EARNED BULLETS (Fuad 2026-08-27 #8) ───────────
// Short, earned fact-chips under an artist's Full Read — the redesign of the pilot
// portrait-facts idea. A RULE POOL over derived layers; every rule has a CLEARING BAR
// and a distinctiveness score; an artist shows only the top ~4 it genuinely earns —
// "short and sweet, applied suitingly, not all-everywhere". The universal pilot chips
// (discovered / peak year / deep cuts) are deliberately absent: a chip everyone gets
// distinguishes no one. ("Never skipped" is designed but DEFERRED — per-track skip data
// lives in spotify-insights tooling, not in this build's inputs.)
// Emits bullets.js → window.ROTATION_BULLETS { slug: [{k,v,x}] } (lazy, PortraitCard).
{
  const GAP = 30 * 60 * 1000;
  const chron = scrobbles.slice().reverse();               // oldest → newest
  // emit set: every artist ≥300 plays + every artist id carrying a portraits.js entry
  const portIds = new Set();
  try {
    const psrc = fs.readFileSync(path.join(__dirname, "portraits.js"), "utf8");
    const anchor = "window.ROTATION_PORTRAITS = ";
    const at = psrc.indexOf(anchor);
    const pjson = JSON.parse(psrc.slice(at + anchor.length).trim().replace(/;\s*$/, ""));
    for (const k of Object.keys(pjson)) if (!k.includes("~")) portIds.add(k);
  } catch (e) { console.log("bullets: portraits.js unread — " + e.message); }
  const keepName = new Map();                              // name → slug, for the emit set
  for (const [name, n] of artistPlays) { const id = slug(name); if (n >= 300 || portIds.has(id)) keepName.set(name, id); }
  // one chronological pass: first-plays (with introducer), sessions (co-occurrence),
  // per-artist weekly bests, recent-window plays
  const first = new Map();                                 // name → { ms, parent }
  const sess = new Map();                                  // name → session count (kept only)
  const co = new Map();                                    // name → Map(otherName → n) (kept only)
  const weekOf = (ms) => Math.floor(ms / (7 * 86400e3));
  const weekTot = new Map();                               // weekIdx → total plays
  const artWeek = new Map();                               // name → Map(weekIdx → n) (kept only)
  const cutoff = newestMs - 120 * 86400e3;
  const recent = new Map();                                // name → plays in last 120d
  let curSet = new Set(), prevMs = 0, prevArtist = null;
  const flushSession = () => {
    if (curSet.size) for (const a of curSet) {
      if (!keepName.has(a)) continue;
      sess.set(a, (sess.get(a) || 0) + 1);
      let m = co.get(a); if (!m) { m = new Map(); co.set(a, m); }
      for (const b of curSet) if (b !== a) m.set(b, (m.get(b) || 0) + 1);
    }
    curSet = new Set();
  };
  for (const [artist, , , ms] of chron) {
    if (!ms) continue;
    if (ms - prevMs > GAP) { flushSession(); prevArtist = null; }
    if (!first.has(artist)) first.set(artist, { ms, parent: prevArtist !== artist ? prevArtist : null });
    curSet.add(artist);
    if (prevArtist !== artist) prevArtist = artist;
    prevMs = ms;
    weekTot.set(weekOf(ms), (weekTot.get(weekOf(ms)) || 0) + 1);
    if (keepName.has(artist)) {
      let w = artWeek.get(artist); if (!w) { w = new Map(); artWeek.set(artist, w); }
      w.set(weekOf(ms), (w.get(weekOf(ms)) || 0) + 1);
      if (ms >= cutoff) recent.set(artist, (recent.get(artist) || 0) + 1);
    }
  }
  flushSession();
  // gateway counts: children per introducer (genealogy rule, ≥5-play children only)
  const children = new Map();                              // parentName → [childName…]
  for (const [name, o] of first) {
    if ((artistPlays.get(name) || 0) < 5 || !o.parent) continue;
    if (!children.has(o.parent)) children.set(o.parent, []);
    children.get(o.parent).push(name);
  }
  // monthly fingerprints for the seasonal rule (recomputed — SEASONALITY's list is scoped)
  const artMon = new Map();                                // name → { m:[12], years:Set }
  for (const [artist, , , ms] of scrobbles) {
    if (!keepName.has(artist) || !ms) continue;
    let a = artMon.get(artist); if (!a) { a = { m: new Array(12).fill(0), years: new Set() }; artMon.set(artist, a); }
    const d = new Date(ms); a.m[d.getUTCMonth()]++; a.years.add(d.getUTCFullYear());
  }
  // themes per artist from llm-about's reasoned layer (rank-weighted 3/2/1)
  const themeBy = new Map();                               // slug → { Map(theme→w), tracks }
  try {
    const vm2 = require("vm");
    const c2 = { window: {} }; vm2.createContext(c2);
    vm2.runInContext(fs.readFileSync(path.join(__dirname, "llm-about.js"), "utf8").replace(/^﻿/, ""), c2, { filename: "llm-about.js" });
    const LA = c2.window.ROTATION_LLM_ABOUT || {};
    for (const key in LA) {
      const e = LA[key]; if (!e || !e.themes || !e.themes.length) continue;
      const aid = key.slice(0, key.indexOf("~")); if (!aid) continue;
      let t = themeBy.get(aid); if (!t) { t = { w: new Map(), tracks: 0 }; themeBy.set(aid, t); }
      t.tracks++;
      e.themes.slice(0, 3).forEach((th, i) => t.w.set(th, (t.w.get(th) || 0) + (3 - i)));
    }
  } catch (e) { console.log("bullets: llm-about unread — themes rule skipped (" + e.message + ")"); }
  // earliest gig per artistId, for caught-live-first
  const firstGig = new Map();
  if (GIGS) for (const g of GIGS.gigs) { const cur = firstGig.get(g.artistId); if (!cur || g.date < cur) firstGig.set(g.artistId, g.date); }
  const MONF = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const BULLETS = {};
  let emitted = 0;
  for (const [name, id] of keepName) {
    const rows = [];
    const plays = artistPlays.get(name) || 0;
    // burning now (score 90): ≥35 plays in the trailing 120 days
    const rec = recent.get(name) || 0;
    if (rec >= 35) rows.push({ s: 90, k: "burning now", v: rec + " plays · 120 days",
      x: rec.toLocaleString() + " plays in the last four months — " + Math.round(rec / plays * 100) + "% of everything you have ever played by them, happening right now." });
    // seasonal band (85): ≥150 plays over 2+ years with ≥50% inside one 3-month window
    const am = artMon.get(name);
    if (am && plays >= 150 && am.years.size >= 2) {
      let best = 0, start = 0;
      for (let s = 0; s < 12; s++) { const w = am.m[s] + am.m[(s + 1) % 12] + am.m[(s + 2) % 12]; if (w > best) { best = w; start = s; } }
      if (best / plays >= 0.5) {
        let pk = 0; for (let i = 1; i < 12; i++) if (am.m[i] > am.m[pk]) pk = i;
        rows.push({ s: 85, k: MONF[pk] + " band", v: Math.round(best / plays * 100) + "% in season",
          x: Math.round(best / plays * 100) + "% of all their plays land in the " + MONF[start] + "–" + MONF[(start + 2) % 12] + " window, across " + am.years.size + " separate years — you reach for them when the season comes back." });
      }
    }
    // caught live first (80): stood in front of them before the first scrobble
    const fg = firstGig.get(id), fp = first.get(name);
    if (fg && fp && fg < iso(fp.ms).slice(0, 10)) rows.push({ s: 80, k: "caught live first", v: fg.slice(0, 4),
      x: "You stood in front of them on " + fg + " — before the library's first scrobble (" + iso(fp.ms).slice(0, 10) + "). The gig came first; the listening followed." });
    // via X (65): the introducer, genealogy rule (session-adjacent first play)
    if (fp && fp.parent && (artistPlays.get(fp.parent) || 0) >= 5) rows.push({ s: 65, k: "via " + fp.parent, v: iso(fp.ms).slice(0, 4),
      x: "Their first play arrived mid-session right after " + fp.parent + " on " + iso(fp.ms).slice(0, 10) + " — the mechanical best guess at who opened the door." });
    // gateway (60 + up to 25): introduced ≥5 other kept artists
    const kids = children.get(name) || [];
    if (kids.length >= 5) {
      const top = kids.slice().sort((a, b) => (artistPlays.get(b) || 0) - (artistPlays.get(a) || 0)).slice(0, 3);
      rows.push({ s: 60 + Math.min(25, kids.length), k: "gateway", v: "→ " + kids.length + " artists",
        x: "First plays of " + kids.length + " other artists arrived in-session directly after them — including " + top.join(", ") + ". A door other music walked in through." });
    }
    // pairs with X (55): most-shared listening sessions, ≥12 together and ≥20% of A's sessions
    const cm = co.get(name), sn = sess.get(name) || 0;
    if (cm && sn >= 20) {
      let bn = null, bc = 0;
      for (const [other, n] of cm) if (n > bc && other !== name) { bc = n; bn = other; }
      if (bn && bc >= 12 && bc / sn >= 0.2) rows.push({ s: 55, k: "pairs with " + bn, v: bc + " sessions",
        x: "They share a listening session with " + bn + " " + bc + " times — " + Math.round(bc / sn * 100) + "% of every sitting that includes them. The two are one habit." });
    }
    // sings about (50): the reasoned-theme layer's verdict, ≥5 themed tracks, top ≥30% of weight
    const tb = themeBy.get(id);
    if (tb && tb.tracks >= 5) {
      let bt = null, bw = 0, tw = 0;
      for (const [th, wgt] of tb.w) { tw += wgt; if (wgt > bw) { bw = wgt; bt = th; } }
      if (bt && bw / tw >= 0.3) rows.push({ s: 50, k: "sings about: " + bt.split(" & ")[0], v: tb.tracks + " reads",
        x: "Across " + tb.tracks + " close-read songs the dominant theme is " + bt + " — " + Math.round(bw / tw * 100) + "% of the rank-weighted signal." });
    }
    // binge week (45): one calendar week ≥80 plays holding ≥30% of everything heard that week
    const aw = artWeek.get(name);
    if (aw) {
      let bwk = 0, bwn = 0;
      for (const [wk, n] of aw) if (n > bwn) { bwn = n; bwk = wk; }
      const tot = weekTot.get(bwk) || 1;
      if (bwn >= 80 && bwn / tot >= 0.3) {
        const d = new Date(bwk * 7 * 86400e3);
        rows.push({ s: 45, k: "binge week", v: MONF[d.getUTCMonth()].slice(0, 3) + " " + d.getUTCFullYear() + " · " + bwn + " plays",
          x: "One week in " + MONF[d.getUTCMonth()] + " " + d.getUTCFullYear() + ": " + bwn + " plays — " + Math.round(bwn / tot * 100) + "% of everything you heard that week was them." });
      }
    }
    if (!rows.length) continue;
    rows.sort((a, b) => b.s - a.s);
    BULLETS[id] = rows.slice(0, 4).map(({ k, v, x }) => ({ k, v, x }));
    emitted++;
  }
  fs.writeFileSync(path.join(__dirname, "bullets.js"),
    "// GENERATED by build-data.js — EARNED artist bullets (lazy; PortraitCard fact chips).\n" +
    "// Rule pool w/ clearing bars + distinctiveness scores; top ~4 per artist, none universal.\n" +
    "window.ROTATION_BULLETS = " + JSON.stringify(BULLETS) + ";\n", "utf8");
  console.log(`bullets.js written — ${emitted}/${keepName.size} artists earned chips`);
}

// ─────────── emit ───────────
// PLAYED — every artist with ≥3 scrobbles + their MusicBrainz aliases (cross-script).
// Powers the Sounds-Like "in library" check. ミドリ's aliases include "Midori" so a similar
// list mentioning "Midori" resolves to true even though we scrobbled the Japanese form.
const _playedSet = new Set();
for (const [name, n] of artistPlays) {
  if (n < 3) continue;
  _playedSet.add(name);
  const aka = (ALIASES[name] && ALIASES[name].aliases) || [];
  for (const alias of aka) _playedSet.add(alias);
}
const PLAYED = [..._playedSet];

// ALIAS_TO_ID — for each kept artist, register every alias → that artist's slug-id.
// Lets a click on "Midori" in a similar-artists list route to ミドリ's actual page.
const ALIAS_TO_ID = {};
for (const a of ARTISTS) {
  ALIAS_TO_ID[a.name] = a.id;
  const aka = (ALIASES[a.name] && ALIASES[a.name].aliases) || [];
  for (const alias of aka) if (!ALIAS_TO_ID[alias]) ALIAS_TO_ID[alias] = a.id;
}

// CANON_MK — matchKey(variant) → kept-artist id. The fuzzy tier of idForName/played, so a name
// that isn't the canonical spelling still resolves to the right page. ALIAS_TO_ID above is
// EXACT-string keyed (built from the CSV's own spellings + MusicBrainz aliases); it misses live
// last.fm chart names that carry a case/punctuation drift or a source-side rename the full CSV
// re-export hasn't folded yet. Two classes bit the "New this month" module (sync-live.js pulls raw
// chart names): a rename — last.fm now serves "Wargasm (UK)", folded to "Wargasm" only via
// HAND_MERGE's exact "WARGASM (UK)" key — and a "The " prefix drift ("The Smashing Pumpkins" vs the
// kept "Smashing Pumpkins"), which no map held. Both showed as brand-new and clicked nowhere.
// Keyed by matchKey (case/punct-insensitive squash — the same core join key views use) so the drift
// normalises away; also register a leading-"the "-stripped key per source so prefix drift resolves.
// First writer wins; kept artists are registered first so a fold never shadows a real artist's key.
const _keptIds = new Set(ARTISTS.map(a => a.id));
const CANON_MK = {};
// Node-side mirror of the emitted core matchKey (defined inside the ROTATION IIFE below): strict
// entity-decode + lowercase-alnum squash. Build-time CANON_MK seeding runs before that IIFE string
// is emitted, so it needs its own copy here.
const _decEntBuild = (s) => String(s || "").replace(/&#0*39;|&apos;/gi, "'").replace(/&quot;/gi, '"').replace(/&amp;/gi, "&").replace(/&#(\d+);/g, (m, n) => { const c = parseInt(n, 10); return c ? String.fromCharCode(c) : m; });
const matchKey = (s) => _decEntBuild(s).toLowerCase().replace(/[^a-z0-9]+/g, "");
const _mkStripThe = (s) => matchKey(String(s || "").replace(/^the\s+/i, ""));
const _canonMkAdd = (name, id) => {
  if (!name || !id) return;
  const mk = matchKey(name); if (mk && CANON_MK[mk] == null) CANON_MK[mk] = id;
  const st = _mkStripThe(name); if (st && CANON_MK[st] == null) CANON_MK[st] = id;
};
// 1) kept artists (their own spelling + aliases) — highest authority, added first.
for (const a of ARTISTS) {
  _canonMkAdd(a.name, a.id);
  const aka = (ALIASES[a.name] && ALIASES[a.name].aliases) || [];
  for (const alias of aka) _canonMkAdd(alias, a.id);
}
// 2) HAND_MERGE folds: variant name → canonical name → that kept artist's id (slug of canon).
for (const [from, canonName] of Object.entries(HAND_MERGE)) {
  const id = slug(canonName);
  if (_keptIds.has(id)) _canonMkAdd(from, id);
}

// FAMILIES — lightweight {i, family, hue} aligned to the cube's famIdx, for Explore chips.
// Only the families that actually carry weight are surfaced (keeps the chip row honest): those in
// GENRES, PLUS any family a SUBS entry points at (covers the synthetic "Other" catch-all, whose
// family has no tag-derived GENRES row but does carry assigned artists). Emit FAMILIES at their
// ORIGINAL indices so SUBS[i].fam stays valid — never re-index a filtered subset.
const _famWithData = new Set([...GENRES.map(g => g.family), ...SUBS.map(s => (FAMILIES[s.fam] || {}).family).filter(Boolean)]);
const FAMILIES_OUT = FAMILIES.map((f, i) => ({ i, family: f.family, hue: f.hue, ...(f.grey ? { grey: true } : {}) }))
  .filter(f => _famWithData.has(f.family));

// compact measured audio per explorable/kept artist id →
// [0 energy, 1 valence, 2 acoustic, 3 tempo(0-1), 4 dance, 5 instr, 6 major-key, 7 popularity,
//  8 followers, 9 loudness(dB), 10 speechiness, 11 liveness, 12 avg track length(sec)]
const AUDIO_OUT = {};
const _afRow = (af) => [af.energy, af.valence, af.acoustic, af.tempo, af.dance, af.instr, af.major, af.pop, af.followers, af.loud, af.speech, af.live, Math.round((af.dur || 0) / 1000)];
for (const a of EXPLORE) { const af = aliasedByName(AUDIO, a.name); if (af) AUDIO_OUT[a.id] = _afRow(af); }
for (const a of ARTISTS) { if (!AUDIO_OUT[a.id]) { const af = aliasedByName(AUDIO, a.name); if (af) AUDIO_OUT[a.id] = _afRow(af); } }

// Spotify photo per artist id — alternate/backup image (GenCover falls back to it if the primary 404s)
const SPOTIMG_OUT = {};
for (const a of EXPLORE) { const s = aliasedByName(SPOT, a.name); if (s && s.img) SPOTIMG_OUT[a.id] = s.img; }
for (const a of ARTISTS) { if (!SPOTIMG_OUT[a.id]) { const s = aliasedByName(SPOT, a.name); if (s && s.img) SPOTIMG_OUT[a.id] = s.img; } }

// ─────────── SIMIMG — matchKey(name) → Deezer photo for SIM-ONLY similar-tile names ───────────
// A "Sounds like" tile can name an artist with zero scrobbles (e.g. Chromera in ANIMISERY's list):
// no byId record, no THUMB slot — so GenCover can only draw a generative placeholder. enrich-deezer-img.js
// strict-fetches those display names into the Deezer cache; here we ship them keyed by matchKey so
// GenCover's final fallback can light the tile. ONLY names that DON'T already resolve through
// byId/THUMBS are shipped (no double-shipping urls a THUMB already covers). matchKey key = the same
// case/punct squash GenCover uses via R.matchKey. Ships in REST (like THUMBS_HI — similar tiles are
// never on the eager first paint, so the deferred bundle carries it and keeps the first paint lean).
const _bIdForName = (name) => {                                   // node mirror of the client idForName
  if (!name) return null;
  const direct = slug(name);
  if (byName[name] || THUMBS[direct]) return direct;             // kept (has record) / explorable (has THUMB)
  return ALIAS_TO_ID[name] || CANON_MK[matchKey(name)] || CANON_MK[_mkStripThe(name)] || null;
};
const _resolvesToImage = (name) => {                             // true when byId/THUMBS already covers it
  const id = _bIdForName(name);
  if (!id) return false;
  if (byName[name] && imageOf(name)) return true;               // kept artist with a real image
  return !!THUMBS[id];                                          // explorable artist with a Discogs/Spotify thumb
};
// SIMIMG values are HASH-ONLY. Every Deezer cache url is verified-uniform:
//   https://cdn-images.dzcdn.net/images/artist/<32-hex-hash>/250x250-000000-80-0-0.jpg
// so we store just <hash> and GenCover reconstructs the full url (250x250 tile size). Two
// classes are DROPPED as dead placeholders: empty hash (…/artist//250x250…) and Deezer's
// blank-avatar hash d41d8cd98f00b204e9800998ecf8427e (both render a grey silhouette — the
// generative placeholder GenCover already draws is strictly better). If a url ever deviates
// from the reconstructable shape, the FULL url is stored verbatim and the client detects the
// "http" prefix (audit-mandated safety valve — currently the corpus has zero such variants).
const _DZ_ART_RE = /^https:\/\/cdn-images\.dzcdn\.net\/images\/artist\/([0-9a-f]*)\/250x250-000000-80-0-0\.jpg$/;
const _DZ_BLANK = "d41d8cd98f00b204e9800998ecf8427e";
const SIMIMG = {};
let _simDropped = 0, _simVariant = 0;
{
  const _simNames = new Set();
  for (const a of ARTISTS) { const real = realSimilar(a.name); const names = (real && real.length > 0) ? real.slice(0, 8) : ((META[a.name] && META[a.name].similar) || []); for (const n of names) _simNames.add(n); }
  for (const a of EXPLORE) { if (byName[a.name]) continue; const real = realSimilar(a.name); if (real && real.length) for (const n of real.slice(0, 6)) _simNames.add(n); }
  for (const name of _simNames) {
    if (!name || _resolvesToImage(name)) continue;              // covered by byId/THUMBS → don't double-ship
    const url = deezerImg(name);                                // Deezer cache (enrich-deezer-img.js / sync-live)
    const mk = matchKey(name);
    if (!url || !mk || SIMIMG[mk]) continue;
    const m = url.match(_DZ_ART_RE);
    if (m) {
      const hash = m[1];
      if (!hash || hash === _DZ_BLANK) { _simDropped++; continue; }   // empty / blank-avatar → drop
      SIMIMG[mk] = hash;                                        // hash-only value
    } else {
      SIMIMG[mk] = url; _simVariant++;                          // non-uniform url → store verbatim (client: startsWith "http")
    }
  }
}
// sim-img.js — standalone LAZY file (audit 2026-08-17): SIMIMG was ~28% of the deferred
// music-rest bundle at full backfill, yet only similar-tiles (never a first paint, rarely
// visited) read it. Split out so GenCover fetches it on-demand the first time it would draw a
// sim-only placeholder. Bare-filename lazy data file (no ?v= — GH Pages 10-min cache is the norm).
const _simImgOut = "// GENERATED by build-data.js — hash-only Deezer photos for sim-only similar-tile names (lazy; GenCover on-demand)\n"
  + "// value = <hash> of https://cdn-images.dzcdn.net/images/artist/<hash>/250x250-000000-80-0-0.jpg (or a full http url for the rare non-uniform variant)\n"
  + "window.ROTATION_SIMIMG = " + JSON.stringify(SIMIMG) + ";\n";
fs.writeFileSync(path.join(__dirname, "sim-img.js"), _simImgOut, "utf8");
{
  const _gz = require("zlib").gzipSync(_simImgOut);
  console.log(`sim-img.js: ${Object.keys(SIMIMG).length} keys (${_simDropped} placeholder-dropped, ${_simVariant} full-url variants) · ${(_simImgOut.length / 1024).toFixed(1)} KB raw / ${(_gz.length / 1024).toFixed(1)} KB gz`);
}

// ── ARTISTS field split (Phase 0.1): the heavy per-artist prose/relationship fields are only
//    read by views that mount AFTER music-rest merges (ArtistView in rotation-views2.jsx,
//    MapView in rotation-worldmap.jsx). Nothing on Overview's first paint — the FACT_RULES in
//    rotation-lab2.jsx, TopArtistsPeek/OverviewView in rotation-views1.jsx, or storyOfDay in
//    rotation-insights.jsx — touches them (verified field-by-field). So we strip them out of the
//    eager ARTISTS array and ship them in an id-keyed map (ARTIST_X) inside music-rest.js. The
//    rest file Object.assigns ARTIST_X[id] back onto the SAME record objects (which byId/expById
//    already reference) BEFORE _restLoaded flips, so every post-rest consumer sees identical
//    records to today. The build itself keeps the FULL records (STYLE_ATLAS bridges reads
//    a.styles at line ~1564, connections mutation at ~1984, etc.), so we only split at emit time.
const ARTIST_HEAVY = ["bio", "wd", "members", "topTracks", "topAlbums", "similar", "similarNames", "styles", "discogsGenres", "spotGenres", "origin"];
const ARTIST_X = {};       // id → { heavy fields } — deferred, merged by music-rest.js
const ARTISTS_CORE = ARTISTS.map(a => {
  const core = {}, heavy = {};
  for (const k in a) (ARTIST_HEAVY.includes(k) ? heavy : core)[k] = a[k];
  ARTIST_X[a.id] = heavy;
  return core;
});
// ── split emit (Phase 0): music-core.js (eager, everything Overview's first paint reads +
//    the inputs the runtime helpers need) + music-rest.js (deferred, injected after paint).
//    music-rest merges into window.ROTATION via Object.assign, so any Node consumer can
//    reconstitute the whole object by evaluating both files in one context (see smoke.js).
//    Split rule: a key belongs in REST only if NOTHING on the Overview first paint reads it.
//    EXPLORE is deferred but Overview needs its COUNT → shipped as EXPLORE_N in core. ──
const CORE = {
  ARTISTS: ARTISTS_CORE, TRACKS, GENRES, CLOCK, ERAS, YEARS, CONCERTS,
  CITIES, TOTALS, NOW, RECENT, ERA_START, TREND, INSIGHTS, PLAYED, ALIAS_TO_ID, CANON_MK,
  FAMILIES: FAMILIES_OUT, SUBS, GENRE_FLOW, THUMBS, SPOTIMG: SPOTIMG_OUT,
  AUDIO_DIST, GIGS, TOUR, EXPLORE_N: EXPLORE.length,
  // build stamp — cache-buster for lazily-fetched shards (Cloudflare caches 4h; stamped URLs
  // make each build's shards distinct AND keep core+shards version-consistent).
  BUILT: new Date().toISOString().slice(0, 16).replace(/[-:T]/g, ""),
};
// keep the world map coherent with the "N countries" stat: a country only counts if it has an
// artist in EXPLORE (the map plots exactly those; a country whose only act is below the EXPLORE
// cutoff — e.g. one 3-play artist — would show a bubble that clicks through to an empty Results
// list). Filter GEOGRAPHY.countries to EXPLORE-represented countries and re-derive the count.
if (GEOGRAPHY) {
  const _exCC = new Set(EXPLORE.map(a => a.co).filter(Boolean));
  GEOGRAPHY.countries = GEOGRAPHY.countries.filter(c => _exCC.has(c.code));
  GEOGRAPHY.totalCountries = GEOGRAPHY.countries.length;
}
const REST = {
  EXPLORE, ALBUMS, AUDIO: AUDIO_OUT, ARTIST_CLOCK, SUB_ARTISTS, CLOCK_BY_YEAR,
  ARTIST_X,   // id → heavy per-artist fields; folded back onto the ARTISTS records (see merge below)
  THUMBS_HI,  // id → full-res Discogs image; grid cards upgrade to it once rest loads (see GenCover)
  // SIMIMG moved to its own lazy file (sim-img.js → window.ROTATION_SIMIMG); GenCover fetches
  // it on-demand the first time it would draw a sim-only placeholder (audit 2026-08-17).
};
const DATA = CORE;   // the core file's IIFE builds window.ROTATION from these
const out = `// ────────────────────────────────────────────────────────────────
// Rotation — Fuad's listening data (last.fm/user/fuadex)
// GENERATED by build-data.js from fuadex.csv — do not edit by hand.
// ${totalScrobbles.toLocaleString("en-US")} scrobbles · ${new Date(oldestMs).toISOString().slice(0, 10)} → ${new Date(newestMs).toISOString().slice(0, 10)} · built ${new Date().toISOString().slice(0, 10)}
// GENRES + per-artist tags/audio-DNA from last.fm tags (${hasTags ? Object.keys(TAG_CACHE).length + " artists cached" : "curated fallback"}). CONCERTS still curated.
// ────────────────────────────────────────────────────────────────
window.ROTATION = (function () {
  // slug — match build-time slug() so route IDs work for kept artists even when their
  // names are entirely non-Latin (ミドリ → "a-3kf2e1" etc.).
  function _slugHash(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = (((h << 5) + h) ^ s.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }
  const slug = (s) => {
    const t = (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    return t || ("a-" + _slugHash(s || "x").slice(0, 7));
  };
  // ─── resolution layer (display-time bridge) ────────────────────────────────
  // Raw scrobbles get identity-merged at build time (folds.json) and aggregation-
  // linked via the absorb/variant sidecars. These helpers do the LAST mile: matching
  // a title from one data source (a play row) to a title from another (an MB spine,
  // an MB-kinds map) when the two spell it differently. Kept HERE, next to slug(), so
  // every view shares ONE normal form instead of re-typing an inline regex per card
  // (the class of drift that stranded plays on "unplayed" tracks). See ARCHITECTURE.md
  // "Resolution layer".
  //   decEnt        — HTML-entity decode (&#39;/&apos;/&quot;/&amp;/&#NN;).
  //   matchKey      — strict form: decEnt + lowercase-alnum squash. The join key.
  //   matchKeyLoose — decEnt + strip bracketed feat./ft./with/w credit segments,
  //                   [Explicit]/(Explicit), a trailing " - Single", then squash.
  //                   For when a play row carries a credit the canonical title omits.
  //   matchKeyMovement — strip a leading SUITE prefix ("«suite»: I. ", "«suite»: Pt. III …",
  //                   "«suite», Pt. I: ") off a movement title, THEN squash. For the stranded-
  //                   suite class: an MB spine names each movement "«suite»: VI. Solitary Shell"
  //                   while the scrobble folds to the bare "Solitary Shell" (like Oddworld's
  //                   tracks stranded on singles, a title-shape drift the strict key can't cross).
  //                   Returns "" when there is NO suite prefix, so callers cheaply skip it and it
  //                   can NEVER alias two unrelated plain titles to the same key.
  //   resolveAlbum  — follow the singles→LP absorb sidecar to the display key (identity
  //                   when the single isn't absorbed, or the sidecar isn't loaded yet).
  // NOTE: this whole IIFE is emitted THROUGH a template literal into music-core.js, so every
  // regex backslash must be DOUBLED here to survive to one backslash in the generated file.
  const decEnt = (s) => String(s || "").replace(/&#0*39;|&apos;/gi, "'").replace(/&quot;/gi, '"').replace(/&amp;/gi, "&").replace(/&#(\\d+);/g, function (m, n) { var c = parseInt(n, 10); return c ? String.fromCharCode(c) : m; });
  const matchKey = (s) => decEnt(s).toLowerCase().replace(/[^a-z0-9]+/g, "");
  const matchKeyLoose = (s) => decEnt(s)
    .replace(/[([]\\s*(?:feat\\.?|ft\\.?|featuring|with|w\\/)\\s[^)\\]]*[)\\]]/gi, " ")
    .replace(/[([]\\s*explicit\\s*[)\\]]/gi, " ")
    .replace(/\\s*-\\s*single\\s*$/i, " ")
    .toLowerCase().replace(/[^a-z0-9]+/g, "");
  // Leading suite-prefix stripper: "«suite»: <ROMAN>. ", "«suite»: Pt. <N>[:.] ",
  // "«suite», Pt. <N>: " (roman i–xii OR arabic 1–2 digits; case-insensitive; tolerant of the
  // ": / , / . / stray-quote" punctuation drift seen in real exporter data). No prefix → "".
  const _mvSuite = /^.*?(?::\\s*M{0,3}(?:ix|iv|v?i{1,3}|v)\\s*\\.\\s*|[:,]\\s*Pt\\.?\\s*(?:\\d{1,2}|M{0,3}(?:ix|iv|v?i{1,3}|v))\\s*[:.]?\\s*)["“”'\\s]*/i;
  const matchKeyMovement = (s) => { const d = decEnt(s); return _mvSuite.test(d) ? d.replace(_mvSuite, "").toLowerCase().replace(/[^a-z0-9]+/g, "") : ""; };
  const resolveAlbum = (key) => (key && typeof window !== "undefined" && window.ROTATION_ALBUM_ABSORB && window.ROTATION_ALBUM_ABSORB[key]) || key;
  const D = ${JSON.stringify(DATA)};
  // deferred keys (arrive via music-rest.js) — stubbed empty so any first-paint read never
  // throws; the rest file Object.assigns the real data, rebuilds expById, flips _restLoaded.
  D.EXPLORE = []; D.ALBUMS = []; D.AUDIO = {}; D.ARTIST_CLOCK = {}; D.SUB_ARTISTS = {}; D.CLOCK_BY_YEAR = {}; D.THUMBS_HI = {};
  // (SIMIMG is no longer a ROTATION key — it lives in the lazy sim-img.js as window.ROTATION_SIMIMG,
  //  fetched on-demand by GenCover; nothing on ROTATION reads R.SIMIMG anymore.)
  D.expById = {}; D._restLoaded = false;
  D.byId = Object.fromEntries(D.ARTISTS.map(a => [a.id, a]));
  D.slug = slug;
  D._slugHash = _slugHash;   // exposed so lazy loaders (llm-about shards) bucket via the canonical hash
  D.decEnt = decEnt;
  D.matchKey = matchKey;             // canonical display-time match key (see resolution layer above)
  D.matchKeyLoose = matchKeyLoose;   // credit/explicit/-single-insensitive squash
  D.matchKeyMovement = matchKeyMovement; // bare-movement squash for stranded suite rows ("" if no suite prefix)
  D.resolveAlbum = resolveAlbum;     // singles→LP absorb resolver (identity if unlinked/sidecar absent)
  // _canonMk(name) — matchKey-based fold to a kept-artist id (CANON_MK), the fuzzy last resort for
  // idForName/played. Catches case/punctuation drift and last.fm source renames the exact ALIAS_TO_ID
  // map misses (e.g. live chart "Wargasm (UK)" → wargasm, "The Smashing Pumpkins" → smashing-pumpkins).
  const _canonMkMap = D.CANON_MK || {};
  const _mkStripThe = (s) => matchKey(String(s || "").replace(/^the\\s+/i, ""));
  const _canonMk = (name) => name ? (_canonMkMap[matchKey(name)] || _canonMkMap[_mkStripThe(name)] || null) : null;
  delete D.CANON_MK;
  // played(name) — kept artist OR scrobbled ≥3 times (plus aliases). Covers the long tail
  // (Otoboke Beaver) AND cross-script (ミドリ ↔ "Midori" via MusicBrainz aliases), plus the
  // matchKey fold so a renamed/prefixed live-chart name isn't mistaken for a brand-new artist.
  const _played = new Set(D.PLAYED || []);
  D.played = (name) => _played.has(name) || !!D.byId[slug(name)] || !!_canonMk(name);
  delete D.PLAYED;
  // idForName(name) — resolve a name to a kept-artist id. Tries direct slug first, then the exact
  // alias map (so a similar-link click on "Midori" lands on ミドリ's page), then the matchKey fold.
  const _aliasMap = D.ALIAS_TO_ID || {};
  D.idForName = (name) => {
    if (!name) return null;
    const direct = slug(name);
    if (D.byId[direct]) return direct;
    return _aliasMap[name] || _canonMk(name) || null;
  };
  delete D.ALIAS_TO_ID;
  return D;
})();
`;
// Core write DEFERRED below: core must carry REST_V (music-rest.js content hash) so the
// runtime injection is epoch-locked. Without it the SW's stale-while-revalidate can pair an
// OLD rest with a NEW core — EXPLORE `s` indexes then join against the wrong SUBS table and
// artists surface under arbitrary families (the NIN-under-Hip-Hop incident, 2026-08-13).
const outEpoch = out + '\nwindow.ROTATION.REST_V = "__REST_V__";\n';

const restOut = `// ─── Rotation — deferred data (music-rest.js) · GENERATED by build-data.js ───
// Injected after Overview's first paint; merges into window.ROTATION and flips _restLoaded.
(function () {
  var R = window.ROTATION; if (!R) return;
  var REST = ${JSON.stringify(REST)};
  for (var k in REST) R[k] = REST[k];
  // fold the heavy per-artist fields (ARTIST_X) back onto the SAME record objects the core built,
  // which R.byId (and every post-rest consumer) already references — so ArtistView/MapView see full
  // records identical to the pre-split build. Must run BEFORE _restLoaded flips.
  var AX = REST.ARTIST_X || {};
  for (var _id in AX) { var _rec = R.byId[_id]; if (_rec) { var _h = AX[_id]; for (var _f in _h) _rec[_f] = _h[_f]; } }
  delete R.ARTIST_X;
  R.expById = {};
  for (var i = 0; i < R.EXPLORE.length; i++) R.expById[R.EXPLORE[i].id] = R.EXPLORE[i];
  R._restLoaded = true;
  if (typeof window.__rotRest === "function") { try { window.__rotRest(); } catch (e) {} }
})();
`;
const _restHash = require("crypto").createHash("md5").update(restOut).digest("hex").slice(0, 8);
fs.writeFileSync(OUT_PATH, outEpoch.replace("__REST_V__", _restHash), "utf8");
fs.writeFileSync(REST_PATH, restOut, "utf8");

console.log(`music-core.js written (${(out.length / 1024).toFixed(0)} KB) · music-rest.js written (${(restOut.length / 1024).toFixed(0)} KB) · REST_V ${_restHash}`);
console.log(`scrobbles: ${totalScrobbles} (${undated} undated) · artists: ${artistPlays.size} · albums: ${albumPlays.size} · tracks: ${trackPlays.size}`);
console.log(`span: ${TOTALS.since} → ${new Date(newestMs).toISOString().slice(0, 10)} · perDay: ${TOTALS.perDay}`);
console.log(`topDay: ${TOTALS.topDay.date} (${TOTALS.topDay.count}) · streak best: ${best}, current: ${current}`);
console.log(`eras: ${ERA_START}–${ERA_END} · ARTISTS kept: ${ARTISTS.length} · ALBUMS kept: ${ALBUMS.length}`);
console.log(`insights: ${OBSESSIONS.length} obsessions · ${COMEBACKS.length} comebacks · ${WONDERS.length} wonders · ${NIGHT_OWLS.length} night owls · ${MILESTONES.length} milestones`);
console.log(`search index: ${searchRows.length} artists (${(searchOut.length / 1024).toFixed(0)} KB)`);
console.log(`genres: ${GENRES === GENRES_REAL ? `REAL from ${Object.keys(TAG_CACHE).length} tagged artists (${FAMILIES.length} families; ${GENRES.length} carry subgenres)` : "curated fallback"}`);
