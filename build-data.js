// build-data.js — regenerates music-data.js from fuadex.csv (last.fm export)
// Usage: node build-data.js
// CSV format (no header): artist,album,track,"DD MMM YYYY HH:MM" (UTC)

const fs = require("fs");
const path = require("path");

const CSV_PATH = path.join(__dirname, "fuadex.csv");
const OUT_PATH = path.join(__dirname, "music-data.js");
// last.fm exports timestamps in UTC; shift to local listening time (AEST)
const TZ_OFFSET_HOURS = 10;
// scrobbles with lost timestamps (1970) are legacy plays from before scrobbling
// began — spread them evenly from here to the first real scrobble. They count
// toward eras/years/discovery but not the clock, streaks, or top-day stats.
const UNDATED_REMAP_START = Date.UTC(2006, 0, 1);

const TOP_ARTISTS = 200;       // bumped from 60 — ミドリ (#124) + Yellow Machinegun (#166)
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

function _slugHash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (((h << 5) + h) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}
const slug = (s) => {
  const t = (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return t || ("a-" + _slugHash(s || "x").slice(0, 7));
};
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
const cachedTags = (name) => (TAG_CACHE[name] && TAG_CACHE[name].tags) || []; // [[tag, count 0–100], …]
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

// ─────────── global last.fm stats (artist-stats.json, built by enrich-stats.js) ───────────
// Per artist: { listeners, playcount, mbid }. Powers the obscurity index; mbid
// seeds the future MusicBrainz / AcousticBrainz / Discogs enrichment layer.
const STATS_PATH = path.join(__dirname, "artist-stats.json");
const STATS = fs.existsSync(STATS_PATH) ? JSON.parse(fs.readFileSync(STATS_PATH, "utf8")) : {};
const hasStats = Object.keys(STATS).length > 0;
const listenersOf = (name) => { const s = STATS[name]; return s && s.listeners > 0 ? s.listeners : null; };

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
// enrichment pulled from the Anna's Archive Spotify dump (enrich-spotify-archive.js): album covers,
// artist images (fallback), Spotify genres.
const _readJson = (f) => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, f), "utf8")); } catch (e) { return {}; } };
const ALBART = _readJson("spotify-albumart.json");   // "artistSlug~titleSlug" → cover url
const ALBMETA = _readJson("spotify-albummeta.json"); // "artistSlug~titleSlug" → [releaseYear, typeChar, label]
const ARTIMG = _readJson("spotify-artist-img.json");  // name → 640px artist image
const SPOTGEN = _readJson("spotify-genres.json");     // name → [genre, …]
const albArt = (artist, title) => ALBART[slug(artist) + "~" + slug(title)] || "";
const albMeta = (artist, title) => ALBMETA[slug(artist) + "~" + slug(title)] || 0;
const spotImg = (name) => (SPOT[name] && SPOT[name].img) || ARTIMG[name] || "";
const imageOf = (name) => (DGA[name] && DGA[name].image) || (IMAGES[name] && IMAGES[name].image) || spotImg(name) || "";
const thumbOf = (name) => (DGA[name] && DGA[name].thumb) || (IMAGES[name] && IMAGES[name].thumb) || spotImg(name) || "";
const dgProfileOf = (name) => (DGA[name] && DGA[name].profile) || "";
const dgMembersOf = (name) => (DGA[name] && DGA[name].members) || [];

// ─────────── last.fm bios + REAL similar-artists (artist-bios.json, by enrich-bios.js) ───────────
const BIOS_PATH = path.join(__dirname, "artist-bios.json");
const BIOS = fs.existsSync(BIOS_PATH) ? JSON.parse(fs.readFileSync(BIOS_PATH, "utf8")) : {};
const hasBios = Object.keys(BIOS).length > 0;
const bioOf = (name) => (BIOS[name] && BIOS[name].bio) || "";
const realSimilar = (name) => (BIOS[name] && BIOS[name].similar) || null;

// ─────────── MusicBrainz origins (artist-origins.json, built by enrich-origins.js) ───────────
// Per artist: { country (ISO), area, beginArea, type }. Used for "taste geography".
const ORIGINS_PATH = path.join(__dirname, "artist-origins.json");
const ORIGINS = fs.existsSync(ORIGINS_PATH) ? JSON.parse(fs.readFileSync(ORIGINS_PATH, "utf8")) : {};
// city-coords.json: "ISO|City" → [lat, lng], from the one-time gazetteer geocode. For the world map.
const CITYCOORDS_PATH = path.join(__dirname, "city-coords.json");
const CITYCOORDS = fs.existsSync(CITYCOORDS_PATH) ? JSON.parse(fs.readFileSync(CITYCOORDS_PATH, "utf8")) : {};
const hasOrigins = Object.keys(ORIGINS).length > 0;
const originOf = (name) => {
  const o = ORIGINS[name];
  if (!o || !o.country) return null;
  return { country: o.country, area: o.area || "", city: o.beginArea || "" };
};
// gender (Person artists only) → glyph; life-span → active / disbanded / deceased on artist pages
const genderOf = (name) => (ORIGINS[name] && ORIGINS[name].gender) || "";
const lifeOf = (name) => { const o = ORIGINS[name]; if (!o || !o.type || !("ended" in o)) return null; return { type: o.type, ended: !!o.ended, end: (o.end || "").slice(0, 4) }; };

// ─────────── Discogs styles/genres (discogs-cache.json, built by enrich-discogs.js) ───────────
// Per artist: { id, styles: [[name,count],…], genres: [[name,count],…], releases, ambiguous }.
// Finer-grained than last.fm tags (e.g. "Breakcore", "Synthwave", "Nu Metal", "Drum n Bass").
const DISCOGS_PATH = path.join(__dirname, "discogs-cache.json");
const DISCOGS = fs.existsSync(DISCOGS_PATH) ? JSON.parse(fs.readFileSync(DISCOGS_PATH, "utf8")) : {};
const hasDiscogs = Object.keys(DISCOGS).length > 0;
function stylesOf(name) {
  const d = DISCOGS[name];
  if (!d || !d.styles || d.styles.length === 0) return [];
  return d.styles.slice(0, 5).map(s => s[0]);
}
function dGenresOf(name) {
  const d = DISCOGS[name];
  if (!d || !d.genres || d.genres.length === 0) return [];
  return d.genres.slice(0, 3).map(g => g[0]);
}

// ─────────── MusicBrainz deep (artist-mb.json, by enrich-mb.js) ───────────
// Per artist: { debut, latest, rgCount, releases:[[title,year,type]], rels:[[type,name,mbid]] }.
// Powers adoption-lag ("how old the music was when you found it") + the connection graph.
const MB_PATH = path.join(__dirname, "artist-mb.json");
const MB = fs.existsSync(MB_PATH) ? JSON.parse(fs.readFileSync(MB_PATH, "utf8")) : {};
const hasMB = Object.keys(MB).length > 0;
const debutOf = (name) => (MB[name] && MB[name].debut) || null;
const membersOf = (name) => ((MB[name] && MB[name].rels) || []).filter(r => r[0] === "member of band").map(r => r[1]);

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

// tag → Sound-Map family. Membership + weights are REAL; x/y is a curated layout
// (organic↔electronic × calm↔violent) so the scatter stays legible. First match wins.
const FAMILIES = [
  { family: "Nu-metal / alt-metal", hue: 24,  cx: .28, cy: .74, kw: /nu-metal|nu metal|rap metal|funk metal|alternative metal|rapcore/ },
  { family: "Metalcore / -core",    hue: 346, cx: .42, cy: .9,  kw: /metalcore|post-hardcore|deathcore|djent|mathcore|electronicore|screamo/ },
  { family: "Industrial",           hue: 214, cx: .6,  cy: .76, kw: /industrial|ebm|neue deutsche|aggrotech|cyber/ },
  { family: "Thrash / heavy",       hue: 4,   cx: .22, cy: .9,  kw: /thrash|heavy metal|groove metal|speed metal|death metal|black metal|doom|sludge|grind|power metal|symphonic metal|metal$|^metal/ },
  { family: "Prog / alt rock",      hue: 282, cx: .3,  cy: .54, kw: /progressive metal|progressive rock|art rock|alternative rock|post-metal|stoner|grunge|indie rock|psychedelic|hard rock|rock$|^rock/ },
  { family: "Japanese",             hue: 332, cx: .46, cy: .64, kw: /japanese|j-rock|j-pop|jpop|jrock|visual kei|kawaii|city pop|shibuya/ },
  { family: "Electronic / DnB",     hue: 190, cx: .84, cy: .64, kw: /drum and bass|drum n bass|dnb|jungle|breakbeat|big beat|techno|house|trance|electro|edm|rave|hardstyle|electronic|idm|downtempo|dubstep/ },
  { family: "Digital hardcore / hyperpop", hue: 308, cx: .86, cy: .9, kw: /digital hardcore|breakcore|gabber|speedcore|witch house|hyperpop|glitch|vaporwave/ },
  { family: "Hip-hop",              hue: 46,  cx: .62, cy: .42, kw: /hip-hop|hip hop|rap|boom bap|trap|grime|polish hip/ },
  { family: "Punk / garage",        hue: 96,  cx: .26, cy: .8,  kw: /punk|garage|post-punk|emo|riot grrrl|hardcore punk/ },
  { family: "Shoegaze / noise",     hue: 252, cx: .5,  cy: .56, kw: /shoegaze|dream pop|nu-gaze|noise rock|noise|post-rock|ambient/ },
  { family: "Pop / indie",          hue: 60,  cx: .72, cy: .4,  kw: /synth-pop|synthpop|new wave|art pop|indie pop|electropop|dance-pop|pop$|^pop/ },
];
function classifyTag(tag) { for (const f of FAMILIES) if (f.kw.test(tag)) return f; return null; }

// umbrella tags too broad to be interesting — kept out of the Sound Map + artist chips
const GENERIC = new Set([
  "rock", "metal", "pop", "electronic", "electronica", "alternative", "alternative rock",
  "indie", "indie rock", "hard rock", "classic rock", "pop rock", "rock and roll",
  "british", "american", "uk", "usa", "german", "polish", "australian",
]);
const niceTags = (name) => {
  const all = cachedTags(name).map(t => t[0]);
  const specific = all.filter(t => !GENERIC.has(t));
  return (specific.length ? specific : all).slice(0, 4);
};

// artist → primary Sound-Map family INDEX (aligns with FAMILIES order, the cube's famIdx).
// First classifiable tag wins; Discogs styles as fallback. Memoised — the clock cube calls
// this once per scrobble (315k), so it must not re-classify per call.
const _famCache = new Map();
function familyIdxByName(name) {
  if (_famCache.has(name)) return _famCache.get(name);
  const tags = (META[name] && META[name].tags) || niceTags(name);
  let idx = -1;
  for (const tg of tags) { const f = classifyTag(tg); if (f) { idx = FAMILIES.indexOf(f); break; } }
  if (idx < 0) for (const s of stylesOf(name)) { const f = classifyTag(s.toLowerCase()); if (f) { idx = FAMILIES.indexOf(f); break; } }
  _famCache.set(name, idx);
  return idx;
}

// ─────────── read + aggregate ───────────
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
}
const canon = (name) => CANON.get(name) || name;

// Album cleanup — scatter a bogus placeholder "album" (a bad local-file/import tag scrobbled with
// lost 1970 timestamps) back onto the real releases its tracks belong to. Keyed by artist\x00album,
// then per-track → real album; only rewrites within the named junk block, so it's safe/idempotent.
const ALBUM_REMAP = {
  ["Linkin Park\x00Mój Album"]: {
    "Numb": "Meteora", "From the Inside": "Meteora", "Somewhere I Belong": "Meteora",
    "Faint": "Meteora", "Breaking the Habbit": "Meteora",
    "In the End": "Hybrid Theory", "Points of Authority (remix)": "Hybrid Theory",
    "Points of Authority (Cristal Remix)": "Reanimation", "By My Self (Remix)": "Reanimation",
  },
};
const albumRemap = (artist, album, track) => { const m = ALBUM_REMAP[artist + "\x00" + album]; return (m && m[track]) || album; };

const artistPlays = new Map();           // name → count
const albumPlays = new Map();            // artist\x00album → count
const trackPlays = new Map();            // artist\x00track → count
const trackAlbumCount = new Map();       // artist\x00track → Map(artist\x00album → count) — dominant album per track
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
  const [rawArtist, rawAlbum, track, ts] = parseLine(line);
  if (!rawArtist) continue;
  const artist = canon(rawArtist);   // merge scrobble-name variants
  const album = albumRemap(artist, rawAlbum, track);   // scatter bogus placeholder albums to real ones
  artistPlays.set(artist, (artistPlays.get(artist) || 0) + 1);
  if (album) albumPlays.set(artist + "\x00" + album, (albumPlays.get(artist + "\x00" + album) || 0) + 1);
  if (track) trackPlays.set(artist + "\x00" + track, (trackPlays.get(artist + "\x00" + track) || 0) + 1);
  if (track && album) { const tk = artist + "\x00" + track, ak = artist + "\x00" + album; let m = trackAlbumCount.get(tk); if (!m) { m = new Map(); trackAlbumCount.set(tk, m); } m.set(ak, (m.get(ak) || 0) + 1); }

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

// Per-artist top tracks + albums computed from the FULL trackPlays/albumPlays maps,
// not from the globally-capped TRACKS (top 24) / ALBUMS (top 472). Previously ArtistView
// filtered globals and an artist like Midori showed zero tracks even though they're scrobbled.
const TRACKS_PER_ARTIST = 15;
const ALBUMS_PER_ARTIST_VIEW = 15;
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

// measured Sound DNA from the Spotify audio-features dump (built by extract-audio.js); falls back to
// inferred tag-derived DNA where an artist didn't match (~98% are measured).
const AUDIO = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, "audio-features.json"), "utf8")); } catch (e) { return {}; } })();
const ARTISTS = rankedArtists.filter(([name]) => include.has(name)).map(([name, plays], i) => {
  const meta = META[name] || {};
  const yc = artistYear.get(name) || new Map();
  const counts = years.map(y => yc.get(y) || 0);
  const max = Math.max(...counts, 1);
  return {
    id: slug(name), rank: i + 1, name, plays,
    hue: meta.hue !== undefined ? meta.hue : hueOf(name),
    tags: meta.tags || niceTags(name),
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
    topAlbums: (_aBy.get(name) || []).slice(0, ALBUMS_PER_ARTIST_VIEW).map(a => ({ ...a, cover: albArt(name, a.title) })),
    spotGenres: (SPOTGEN[name] || []).slice(0, 8),   // Spotify's own genre tags
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
    firstYear: new Date(firstSeen.get(name)).getUTCFullYear(),
    debut: debutOf(name),
    members: [...new Set([...membersOf(name), ...dgMembersOf(name)])].slice(0, 10), // MB + Discogs members

    listeners: listenersOf(name),
    styles: stylesOf(name),
    discogsGenres: dGenresOf(name),
    origin: originOf(name),
    country: meta.country || (originOf(name) ? originOf(name).country.toLowerCase() : ""),
    gender: genderOf(name),     // "Male"/"Female"/"Other"/"" — solo artists only
    life: lifeOf(name),         // { type, ended, end } → active/disbanded/deceased badge
  };
});
const byName = Object.fromEntries(ARTISTS.map(a => [a.name, a]));
const hueFor = (name) => byName[name] ? byName[name].hue : hueOf(name);

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
  return { id: "al" + i, artistId: slug(artist), artist, title, year: null, plays, hue: hueFor(artist) };
});

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
    tracks: _yTracks.get(year).size,
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

// ─────────── CLOCK CROSS-TABS (year × family) for the Explore "Rhythm" tab ───────────
// CLOCK_BY_YEAR[y] = real per-year hour-grid (all plays, including untagged artists).
// CLOCK_CUBE[y][famIdx] = per-year-per-family hour-grid (only artists with a known family).
// Grids are FLAT length-168 arrays: cell = ((day+6)%7)*24 + hour. The client inflates to 7×24
// and rolls up: family-only = Σ years; year-only = CLOCK_BY_YEAR; both = direct cube lookup.
const CLOCK_BY_YEAR = {};
const CLOCK_CUBE = {};
for (const [artist, , , ms] of scrobbles) {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const cell = ((d.getUTCDay() + 6) % 7) * 24 + d.getUTCHours();
  if (!CLOCK_BY_YEAR[y]) CLOCK_BY_YEAR[y] = new Array(168).fill(0);
  CLOCK_BY_YEAR[y][cell]++;
  const fi = familyIdxByName(artist);
  if (fi < 0) continue;
  if (!CLOCK_CUBE[y]) CLOCK_CUBE[y] = {};
  if (!CLOCK_CUBE[y][fi]) CLOCK_CUBE[y][fi] = new Array(168).fill(0);
  CLOCK_CUBE[y][fi][cell]++;
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
const TOTALS = {
  scrobbles: totalScrobbles,
  artists: artistPlays.size,
  albums: albumPlays.size,
  tracks: trackPlays.size,
  since: new Date(undated ? UNDATED_REMAP_START : oldestMs).toISOString().slice(0, 10),
  perDay: Math.round(totalScrobbles / spanDays * 10) / 10,
  topDay: {
    date: topDayKey, count: dayCounts.get(topDayKey),
    note: `Mostly ${topDayArtist[0]} — ${topDayArtist[1]} plays in one day.`,
  },
  streak: { current, best },
  listeningHours: Math.round(totalScrobbles * 3.6 / 60),
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
const COMEBACKS = [];
for (const [artist, ts] of times) {
  let gi = 0, gap = 0;
  for (let i = 1; i < ts.length; i++) { const g = ts[i] - ts[i - 1]; if (g > gap) { gap = g; gi = i; } }
  const gapDays = Math.round(gap / 86400e3), playsAfter = ts.length - gi;
  if (gapDays >= 540 && playsAfter >= 50)
    COMEBACKS.push({ artist, gapDays, left: iso(ts[gi - 1]), back: iso(ts[gi]), playsAfter, hue: hueFor(artist) });
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
    countries: countries.slice(0, 20),
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
    const d = DISCOGS[name];
    if (!d || !d.styles || d.styles.length === 0) continue;
    artistsCovered++;
    const topStyles = d.styles.slice(0, 5).map(s => s[0]);
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
    const mb = MB[name];
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

// ─────────── CONSTELLATION (force-laid graph of the kept library) ───────────
// Nodes = kept artists; edges = shared band members (per-artist connections) + last.fm
// similarity. Positions are pre-computed with a small force sim here so the buildless client
// only has to render. Clustered by family (each family pulled toward its own point on a ring).
let CONSTELLATION = null;
{
  const nodes = ARTISTS.map((a, i) => ({ i, id: a.id, name: a.name, hue: a.hue, plays: a.plays, fam: a.fam, x: 0, y: 0, vx: 0, vy: 0 }));
  const idIndex = new Map(nodes.map(n => [n.id, n.i]));
  const edgeKey = new Map(); const edges = [];
  const addEdge = (i, j, via) => {
    if (i == null || j == null || i === j) return;
    const k = i < j ? i + "_" + j : j + "_" + i;
    if (edgeKey.has(k)) { if (via && !edgeKey.get(k)) edgeKey.set(k, via); return; }
    edgeKey.set(k, via || ""); edges.push([i, j, k]);
  };
  for (const a of ARTISTS) {
    const ai = idIndex.get(a.id);
    for (const c of (a.connections || [])) for (const o of c.others) addEdge(ai, idIndex.get(o.artistId), c.person);
    for (const sname of (realSimilar(a.name) || [])) addEdge(ai, idIndex.get(slug(sname)), "");
  }
  const N = nodes.length, FAMN = FAMILIES.length;
  const famCenter = (f) => { const ang = ((f >= 0 ? f : 0) / FAMN) * Math.PI * 2; return [Math.cos(ang) * 320, Math.sin(ang) * 320]; };
  const rng = (s) => { let h = 5381; for (const c of s) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0; return (h % 1000) / 1000; };
  nodes.forEach(n => { const fc = famCenter(n.fam); n.x = fc[0] + (rng(n.id) - .5) * 150; n.y = fc[1] + (rng(n.id + "y") - .5) * 150; });
  for (let iter = 0; iter < 320; iter++) {
    const cool = 1 - iter / 320;
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
      let dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y, d2 = dx * dx + dy * dy + 0.01, d = Math.sqrt(d2), rep = 950 / d2;
      const fx = dx / d * rep, fy = dy / d * rep;
      nodes[i].vx += fx; nodes[i].vy += fy; nodes[j].vx -= fx; nodes[j].vy -= fy;
    }
    for (const [i, j] of edges) {
      let dx = nodes[j].x - nodes[i].x, dy = nodes[j].y - nodes[i].y, d = Math.sqrt(dx * dx + dy * dy) + 0.01, f = (d - 58) * 0.02;
      const fx = dx / d * f, fy = dy / d * f;
      nodes[i].vx += fx; nodes[i].vy += fy; nodes[j].vx -= fx; nodes[j].vy -= fy;
    }
    for (const n of nodes) {
      const fc = famCenter(n.fam);
      n.vx += (fc[0] - n.x) * 0.008 - n.x * 0.002; n.vy += (fc[1] - n.y) * 0.008 - n.y * 0.002;
      n.x += n.vx * 0.85 * cool; n.y += n.vy * 0.85 * cool; n.vx *= 0.6; n.vy *= 0.6;
    }
  }
  const xs = nodes.map(n => n.x), ys = nodes.map(n => n.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const W = 1000, H = 720, pad = 44;
  const sc = Math.min((W - 2 * pad) / (maxX - minX || 1), (H - 2 * pad) / (maxY - minY || 1));
  const offX = (W - (maxX - minX) * sc) / 2, offY = (H - (maxY - minY) * sc) / 2;
  const maxPlays = Math.max(...nodes.map(n => n.plays));
  const outNodes = nodes.map(n => ({
    id: n.id, name: n.name, hue: n.hue, fam: n.fam,
    x: Math.round((offX + (n.x - minX) * sc) * 10) / 10,
    y: Math.round((offY + (n.y - minY) * sc) * 10) / 10,
    r: Math.round((4 + Math.sqrt(n.plays / maxPlays) * 17) * 10) / 10,
  }));
  // edges as [i, j, via] — via = shared band member's name, or "" for last.fm similarity
  const outEdges = edges.map(([i, j, k]) => [i, j, edgeKey.get(k) || ""]);
  CONSTELLATION = { w: W, h: H, nodes: outNodes, edges: outEdges };
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

const INSIGHTS = {
  MILESTONES, OBSESSIONS, ALBUM_OBSESSIONS, LIFETIME_TRACKS, FLAMEOUTS, INCUBATION, ARTIST_ERAS, COMEBACKS, WONDERS, NIGHT_OWLS, DISCOVERIES, YEAR_PEAKS, ON_THIS_DAY,
  AUDIO_DRIFT, ADOPTION, CONNECTIONS, RECOMMENDATIONS, REVISIT,
  STREAK: { best, start: bestStart, end: bestEnd, current },
  UNDERGROUND, GEOGRAPHY, STYLE_ATLAS,
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
const mediaTracks = [...trackPlays.entries()].sort((a, b) => b[1] - a[1]).map(([key, plays]) => {
  const ix = key.indexOf("\x00"), artist = key.slice(0, ix), title = key.slice(ix + 1);
  if (!title) return null;
  let albumIdx = -1; const m = trackAlbumCount.get(key);
  if (m) { let best = null, bv = 0; for (const [ak, c] of m) if (c > bv) { bv = c; best = ak; } if (best != null && albumKeyIdx.has(best)) albumIdx = albumKeyIdx.get(best); }
  return [title, _ai(artist), plays, albumIdx, _tail(trackYear.get(key))];
}).filter(Boolean);
const mediaOut = `// GENERATED by build-data.js — lazy media index (header search + album pages + Explore depth).
// albums = [title, artistIdx, plays, firstYear, lastYear, yearTail, coverUrl]; tracks = [title, artistIdx, plays, albumIdx, yearTail].
window.ROTATION_MEDIA = { artists: ${JSON.stringify(_mArtists)}, tracks: ${JSON.stringify(mediaTracks)}, albums: ${JSON.stringify(mediaAlbums)} };
`;
fs.writeFileSync(path.join(__dirname, "media-index.js"), mediaOut, "utf8");
console.log(`media index: ${mediaTracks.length} tracks · ${mediaAlbums.length} albums · ${_mArtists.length} artists (${(mediaOut.length / 1024).toFixed(0)} KB)`);

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
const GENRES_CURATED = [
  { family: "Nu-metal", hue: 24, subs: [
    { name: "nu-metal", x: .30, y: .80, w: 2890 },
    { name: "rap metal", x: .36, y: .78, w: 1490 },
    { name: "alternative metal", x: .32, y: .70, w: 2410 },
    { name: "funk metal", x: .28, y: .66, w: 520 },
  ]},
  { family: "Metalcore", hue: 346, subs: [
    { name: "metalcore", x: .34, y: .88, w: 1680 },
    { name: "post-hardcore", x: .36, y: .82, w: 1490 },
    { name: "djent", x: .44, y: .86, w: 1180 },
    { name: "progressive metalcore", x: .46, y: .84, w: 1430 },
    { name: "deathcore", x: .40, y: .92, w: 540 },
  ]},
  { family: "Industrial", hue: 214, subs: [
    { name: "industrial rock", x: .58, y: .72, w: 3120 },
    { name: "industrial metal", x: .55, y: .82, w: 1870 },
    { name: "neue deutsche härte", x: .52, y: .80, w: 1870 },
    { name: "electronicore", x: .62, y: .82, w: 640 },
  ]},
  { family: "Alt / Prog metal", hue: 282, subs: [
    { name: "progressive metal", x: .30, y: .66, w: 1980 },
    { name: "art rock", x: .34, y: .50, w: 1540 },
    { name: "stoner rock", x: .26, y: .62, w: 1290 },
    { name: "post-metal", x: .38, y: .60, w: 720 },
  ]},
  { family: "Thrash / Heavy", hue: 4, subs: [
    { name: "thrash metal", x: .24, y: .92, w: 1450 },
    { name: "groove metal", x: .26, y: .84, w: 1610 },
    { name: "heavy metal", x: .22, y: .80, w: 1380 },
    { name: "speed metal", x: .25, y: .90, w: 540 },
  ]},
  { family: "Japanese underground", hue: 332, subs: [
    { name: "japanese noise rock", x: .40, y: .82, w: 1280 },
    { name: "math rock", x: .38, y: .64, w: 1180 },
    { name: "kawaii metal", x: .56, y: .78, w: 1240 },
    { name: "j-punk", x: .30, y: .80, w: 590 },
    { name: "nu-gaze", x: .44, y: .58, w: 1210 },
  ]},
  { family: "Digital hardcore / Hyperpop", hue: 308, subs: [
    { name: "digital hardcore", x: .82, y: .92, w: 1340 },
    { name: "breakcore", x: .88, y: .90, w: 760 },
    { name: "witch house", x: .80, y: .58, w: 1120 },
    { name: "hyperpop", x: .84, y: .60, w: 680 },
  ]},
  { family: "Electronic / DnB", hue: 190, subs: [
    { name: "drum and bass", x: .86, y: .74, w: 980 },
    { name: "big beat", x: .80, y: .66, w: 1620 },
    { name: "breakbeat", x: .82, y: .70, w: 760 },
    { name: "progressive house", x: .90, y: .50, w: 1440 },
  ]},
  { family: "Hip-hop", hue: 46, subs: [
    { name: "polish hip-hop", x: .64, y: .44, w: 1630 },
    { name: "boom bap", x: .60, y: .40, w: 760 },
  ]},
];
const GENRES = (hasTags && GENRES_REAL.length) ? GENRES_REAL : GENRES_CURATED;

// ─────────── SOUND_BY_YEAR — per-year weight for each Sound-Map subgenre ───────────
// Lets the Explore "Sound" tab reshape bubble sizes for a single selected year (positions
// stay from GENRES; only the weight changes). { [year]: { [subName]: weight } }, sparse.
const SOUND_BY_YEAR = {};
if (hasTags && GENRES_REAL.length) {
  const subNames = new Set();
  for (const f of GENRES) for (const s of f.subs) subNames.add(s.name);
  for (const year of years) {
    if ((yearTotals.get(year) || 0) < 500) continue;
    const w = new Map();
    for (const [name, m] of artistYear) {
      const p = m.get(year) || 0;
      if (!p) continue;
      for (const [tag, count] of cachedTags(name)) {
        if (!subNames.has(tag)) continue;
        w.set(tag, (w.get(tag) || 0) + p * ((count || 0) / 100));
      }
    }
    if (w.size) { const o = {}; for (const [k, v] of w) o[k] = Math.round(v); SOUND_BY_YEAR[year] = o; }
  }
}

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
const EXPLORE_CAP = 6000;
const EXPLORE_YP_TOP = 3000;   // only the top-by-plays carry per-year detail (file-size control)
const SUBS = [];
{
  const perFam = new Map();
  for (const [tag, w] of [...tagWeight.entries()].sort((a, b) => b[1] - a[1])) {
    if (GENERIC.has(tag)) continue;
    const f = classifyTag(tag);
    if (!f) continue;
    const fi = FAMILIES.indexOf(f);
    const n = perFam.get(fi) || 0;
    if (n >= 16) continue;            // cap per family so the scatter doesn't choke
    perFam.set(fi, n + 1);
    SUBS.push({
      name: tag, fam: fi, hue: f.hue,
      x: Math.round(clamp01(f.cx + ((tagHash(tag) % 1000) / 1000 - .5) * 0.18) * 100) / 100,
      y: Math.round(clamp01(f.cy + ((tagHash(tag + "y") % 1000) / 1000 - .5) * 0.18) * 100) / 100,
    });
  }
}
const subIdxByName = new Map(SUBS.map((s, i) => [s.name, i]));
const EXPLORE = [];
for (const [name, plays] of rankedArtists) {
  if (plays < 5) continue;
  const meta = META[name];
  // subgenre membership from last.fm tags AND Discogs styles — the latter reaches the ~6000
  // artists we have Discogs data for, well past last.fm's tag coverage.
  const vocab = [...((meta && meta.tags) || []), ...cachedTags(name).map(t => t[0]), ...stylesOf(name).map(s => s.toLowerCase())];
  const seen = new Set(), s = [];
  for (const tg of vocab) { const i = subIdxByName.get(tg); if (i != null && !seen.has(i)) { seen.add(i); s.push(i); } }
  if (!s.length) continue;            // no placeable subgenre at all → skip
  const rec = { id: slug(name), name, plays, hue: hueFor(name), s, l: listenersOf(name) || 0, d: debutOf(name) || 0 };
  const _o = originOf(name);            // country/city tag → lets the Journey scope to a place
  if (_o) { rec.co = _o.country; if (_o.city) rec.ci = _o.city; }
  const _g = genderOf(name); const _gc = _g === "Female" ? "f" : _g === "Male" ? "m" : (_g === "Non-binary" || _g === "Other") ? "x" : ""; if (_gc) rec.g = _gc;   // f/m/x glyph (mini); "Not applicable" → none
  const _lf = lifeOf(name); if (_lf) { rec.ty = _lf.type[0].toLowerCase(); if (_lf.ended) { rec.ed = 1; if (_lf.end) rec.en = +_lf.end || 0; } }
  if (EXPLORE.length < EXPLORE_YP_TOP) {
    const yc = artistYear.get(name) || new Map();
    const yp = {}; for (const [y, c] of yc) if (c > 0) yp[y] = c;
    rec.yp = yp;
  }
  EXPLORE.push(rec);
  if (EXPLORE.length >= EXPLORE_CAP) break;
}

// ─────────── THUMBS — Discogs cover thumbnail per explorable artist id (covers everywhere) ───────────
// Shipped as a compact { id → 150px url } map so the ranking rows and MiniArtist pages show real
// art, not just generative covers. Only thumbnails (bios/members stay build-side to keep payload sane).
// Ship a 150px Discogs cover for every explorable non-kept artist that has one (kept artists
// already carry full images in their ARTISTS record). ~+215KB over the old 1200 cap, but the
// user wanted covers everywhere — generative tiles only remain where Discogs has no image.
const THUMBS = {};
for (const a of EXPLORE) {
  if (byName[a.name]) continue;              // kept artists resolve via byId already
  const t = thumbOf(a.name);   // Discogs thumb, else last.fm, else Spotify photo
  if (t) THUMBS[a.id] = t;
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
  const DETAIL = {};
  for (const a of EXPLORE) {
    if (byName[a.name]) continue;
    const rec = {};
    const t = top(tBy.get(a.name)), al = top(aBy.get(a.name));
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

// ─────────── GENRE_FLOW + SUB_FLOW — per-year weights for the taste-journey streamgraph ───────────
// Each artist's yearly plays go to its PRIMARY subgenre (s[0]); family weight = that subgenre's
// family. GENRE_FLOW drives the default view; SUB_FLOW lets clicking a family drill into its
// subgenres over time. Covers the top-3000 EXPLORE artists that carry per-year data.
let GENRE_FLOW = null, SUB_FLOW = null;
{
  const flowYears = years.filter(y => y >= 2010 && (yearTotals.get(y) || 0) >= 500);
  const subRows = flowYears.map(year => {
    const sw = new Array(SUBS.length).fill(0);
    for (const a of EXPLORE) { const p = a.yp ? (a.yp[year] || 0) : 0; if (p) sw[a.s[0]] += p; }
    return sw;
  });
  const famRows = subRows.map(sw => { const fw = new Array(FAMILIES.length).fill(0); sw.forEach((v, si) => { if (v) fw[SUBS[si].fam] += v; }); return fw; });
  GENRE_FLOW = { families: FAMILIES.map((f, i) => ({ i, family: f.family, hue: f.hue })), years: flowYears.map((y, i) => ({ year: y, fams: famRows[i] })) };
  SUB_FLOW = { years: flowYears, rows: subRows };
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
  for (const [artist, album, track, ms] of scrobbles) {
    if (!byName[artist] && !exploreNames.has(artist)) continue;
    const yi = yIdx.get(new Date(ms).getUTCFullYear());
    if (yi == null) continue;
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

  // tier 1: the heatmap (loads when the Calendar tab opens). tier 2: the period detail
  // (loads only when a day/week/month is first clicked) — keeps the heatmap snappy.
  const CAL = { years: calYears, byYear, max: maxDay };
  fs.writeFileSync(path.join(__dirname, "calendar.js"), "// GENERATED by build-data.js — daily listening heatmap (lazy-loaded)\nwindow.ROTATION_CAL = " + JSON.stringify(CAL) + ";\n", "utf8");
  fs.writeFileSync(path.join(__dirname, "calendar-detail.js"), "// GENERATED by build-data.js — calendar period summaries (lazy-loaded on first period click)\nwindow.ROTATION_CAL_DETAIL = " + JSON.stringify(periods) + ";\n", "utf8");
  console.log(`calendar.js ${(fs.statSync(path.join(__dirname, "calendar.js")).size / 1024).toFixed(0)}KB · calendar-detail.js ${(fs.statSync(path.join(__dirname, "calendar-detail.js")).size / 1024).toFixed(0)}KB (${Object.keys(periods.day).length}d/${Object.keys(periods.week).length}w/${Object.keys(periods.month).length}m · ${pool.length} names)`);
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

// FAMILIES — lightweight {i, family, hue} aligned to the cube's famIdx, for Explore chips.
// Only the families that actually carry weight in GENRES are surfaced (keeps the chip row honest).
const _famWithData = new Set(GENRES.map(g => g.family));
const FAMILIES_OUT = FAMILIES.map((f, i) => ({ i, family: f.family, hue: f.hue }))
  .filter(f => _famWithData.has(f.family));

// compact measured audio per explorable/kept artist id →
// [0 energy, 1 valence, 2 acoustic, 3 tempo(0-1), 4 dance, 5 instr, 6 major-key, 7 popularity,
//  8 followers, 9 loudness(dB), 10 speechiness, 11 liveness, 12 avg track length(sec)]
const AUDIO_OUT = {};
const _afRow = (af) => [af.energy, af.valence, af.acoustic, af.tempo, af.dance, af.instr, af.major, af.pop, af.followers, af.loud, af.speech, af.live, Math.round((af.dur || 0) / 1000)];
for (const a of EXPLORE) { const af = AUDIO[a.name]; if (af) AUDIO_OUT[a.id] = _afRow(af); }
for (const a of ARTISTS) { if (!AUDIO_OUT[a.id]) { const af = AUDIO[a.name]; if (af) AUDIO_OUT[a.id] = _afRow(af); } }

// Spotify photo per artist id — alternate/backup image (GenCover falls back to it if the primary 404s)
const SPOTIMG_OUT = {};
for (const a of EXPLORE) { const s = SPOT[a.name]; if (s && s.img) SPOTIMG_OUT[a.id] = s.img; }
for (const a of ARTISTS) { if (!SPOTIMG_OUT[a.id]) { const s = SPOT[a.name]; if (s && s.img) SPOTIMG_OUT[a.id] = s.img; } }

const DATA = {
  ARTISTS, ALBUMS, TRACKS, GENRES, CLOCK, ERAS, YEARS, CONCERTS,
  CITIES, TOTALS, NOW, RECENT, ERA_START, TREND, INSIGHTS, PLAYED, ALIAS_TO_ID,
  CLOCK_BY_YEAR, CLOCK_CUBE, SOUND_BY_YEAR, FAMILIES: FAMILIES_OUT,
  SUB_ARTISTS, ARTIST_CLOCK, SUBS, EXPLORE, CONSTELLATION, GENRE_FLOW, SUB_FLOW, THUMBS, AUDIO: AUDIO_OUT, SPOTIMG: SPOTIMG_OUT,
};
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
  const D = ${JSON.stringify(DATA)};
  D.byId = Object.fromEntries(D.ARTISTS.map(a => [a.id, a]));
  // lightweight lookup over the whole explorable universe (kept artists keep their full byId record)
  D.expById = Object.fromEntries((D.EXPLORE || []).map(a => [a.id, a]));
  D.slug = slug;
  // played(name) — kept artist OR scrobbled ≥3 times (plus aliases). Covers the long tail
  // (Otoboke Beaver) AND cross-script (ミドリ ↔ "Midori" via MusicBrainz aliases).
  const _played = new Set(D.PLAYED || []);
  D.played = (name) => _played.has(name) || !!D.byId[slug(name)];
  delete D.PLAYED;
  // idForName(name) — resolve a name to a kept-artist id. Tries direct slug first, then the
  // alias map (so a similar-link click on "Midori" lands on ミドリ's page).
  const _aliasMap = D.ALIAS_TO_ID || {};
  D.idForName = (name) => {
    if (!name) return null;
    const direct = slug(name);
    if (D.byId[direct]) return direct;
    return _aliasMap[name] || null;
  };
  delete D.ALIAS_TO_ID;
  return D;
})();
`;
fs.writeFileSync(OUT_PATH, out, "utf8");

console.log(`music-data.js written (${(out.length / 1024).toFixed(0)} KB)`);
console.log(`scrobbles: ${totalScrobbles} (${undated} undated) · artists: ${artistPlays.size} · albums: ${albumPlays.size} · tracks: ${trackPlays.size}`);
console.log(`span: ${TOTALS.since} → ${new Date(newestMs).toISOString().slice(0, 10)} · perDay: ${TOTALS.perDay}`);
console.log(`topDay: ${TOTALS.topDay.date} (${TOTALS.topDay.count}) · streak best: ${best}, current: ${current}`);
console.log(`eras: ${ERA_START}–${ERA_END} · ARTISTS kept: ${ARTISTS.length} · ALBUMS kept: ${ALBUMS.length}`);
console.log(`insights: ${OBSESSIONS.length} obsessions · ${COMEBACKS.length} comebacks · ${WONDERS.length} wonders · ${NIGHT_OWLS.length} night owls · ${MILESTONES.length} milestones`);
console.log(`search index: ${searchRows.length} artists (${(searchOut.length / 1024).toFixed(0)} KB)`);
console.log(`genres: ${GENRES === GENRES_REAL ? `REAL from ${Object.keys(TAG_CACHE).length} tagged artists (${GENRES.length} families)` : "curated fallback"}`);
