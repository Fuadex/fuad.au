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

const TOP_ARTISTS = 60;
const TOP_ALBUMS = 60;
const TOP_TRACKS = 24;
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

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "unknown";
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

// ─────────── MusicBrainz origins (artist-origins.json, built by enrich-origins.js) ───────────
// Per artist: { country (ISO), area, beginArea, type }. Used for "taste geography".
const ORIGINS_PATH = path.join(__dirname, "artist-origins.json");
const ORIGINS = fs.existsSync(ORIGINS_PATH) ? JSON.parse(fs.readFileSync(ORIGINS_PATH, "utf8")) : {};
const hasOrigins = Object.keys(ORIGINS).length > 0;
const originOf = (name) => {
  const o = ORIGINS[name];
  if (!o || !o.country) return null;
  return { country: o.country, area: o.area || "", city: o.beginArea || "" };
};

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

// ─────────── read + aggregate ───────────
const raw = fs.readFileSync(CSV_PATH, "utf8");
const lines = raw.split(/\r?\n/).filter(l => l.trim());

const artistPlays = new Map();           // name → count
const albumPlays = new Map();            // artist\x00album → count
const trackPlays = new Map();            // artist\x00track → count
const artistYear = new Map();            // name → Map(year → count)
const yearTotals = new Map();            // year → count
const dayCounts = new Map();             // yyyy-mm-dd → count
const dayTopArtist = new Map();          // yyyy-mm-dd → Map(artist → count)
const firstSeen = new Map();             // name → ms of first scrobble
const clockGrid = Array.from({ length: 7 }, () => new Array(24).fill(0));
const scrobbles = [];                    // [artist, album, track, ms] newest-first (CSV order)
const undatedArtists = [];

for (const line of lines) {
  const [artist, album, track, ts] = parseLine(line);
  if (!artist) continue;
  artistPlays.set(artist, (artistPlays.get(artist) || 0) + 1);
  if (album) albumPlays.set(artist + "\x00" + album, (albumPlays.get(artist + "\x00" + album) || 0) + 1);
  if (track) trackPlays.set(artist + "\x00" + track, (trackPlays.get(artist + "\x00" + track) || 0) + 1);

  const d = parseDate(ts);
  if (!d || d.getTime() < 31536e6) { undatedArtists.push(artist); continue; } // 1970 = lost timestamp
  const ms = d.getTime();
  scrobbles.push([artist, album, track, ms]);

  const y = d.getUTCFullYear();
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

const ARTISTS = rankedArtists.filter(([name]) => include.has(name)).map(([name, plays], i) => {
  const meta = META[name] || {};
  const yc = artistYear.get(name) || new Map();
  const counts = years.map(y => yc.get(y) || 0);
  const max = Math.max(...counts, 1);
  return {
    id: slug(name), rank: i + 1, name, plays,
    hue: meta.hue !== undefined ? meta.hue : hueOf(name),
    tags: meta.tags || niceTags(name),
    similar: (meta.similar || []).map(slug), similarNames: meta.similar || [],
    audio: meta.audio
      ? { energy: meta.audio[0], valence: meta.audio[1], acoustic: meta.audio[2], tempo: meta.audio[3], dance: meta.audio[4], instr: meta.audio[5] }
      : tagAudio(cachedTags(name)),
    era: counts.map(c => c === 0 ? 0 : Math.max(1, Math.round(9 * c / max))),
    firstYear: new Date(firstSeen.get(name)).getUTCFullYear(),
    listeners: listenersOf(name),
    styles: stylesOf(name),
    discogsGenres: dGenresOf(name),
    origin: originOf(name),
    country: meta.country || (originOf(name) ? originOf(name).country.toLowerCase() : ""),
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
  };
});

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

// on this day: all-time top artist for each calendar day
const otd = new Map();
for (const [artist, , , ms] of scrobbles) {
  const d = new Date(ms);
  const k = String(d.getUTCMonth() + 1).padStart(2, "0") + "-" + String(d.getUTCDate()).padStart(2, "0");
  if (!otd.has(k)) otd.set(k, { total: 0, art: new Map() });
  const O = otd.get(k); O.total++; O.art.set(artist, (O.art.get(artist) || 0) + 1);
}
const ON_THIS_DAY = {};
for (const [k, O] of otd) {
  const [artist, plays] = [...O.art.entries()].sort((a, b) => b[1] - a[1])[0];
  ON_THIS_DAY[k] = { artist, plays, total: O.total, hue: hueFor(artist) };
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
  const ctry = new Map(); // code → { plays, artists:Set }
  const cit = new Map();  // "country|city" → { plays, artists:Set, country, city }
  let totalCovered = 0;
  for (const [name, plays] of artistPlays) {
    const o = originOf(name);
    if (!o) continue;
    totalCovered += plays;
    const cc = o.country;
    if (!ctry.has(cc)) ctry.set(cc, { plays: 0, artists: new Set() });
    const c = ctry.get(cc); c.plays += plays; c.artists.add(name);
    if (o.city) {
      const k = cc + "|" + o.city;
      if (!cit.has(k)) cit.set(k, { plays: 0, artists: new Set(), country: cc, city: o.city });
      const ci = cit.get(k); ci.plays += plays; ci.artists.add(name);
    }
  }
  const countries = [...ctry.entries()]
    .map(([code, v]) => ({ code, name: COUNTRY_NAMES[code] || code, flag: flagOf(code),
      plays: v.plays, artists: v.artists.size, share: totalCovered ? v.plays / totalCovered : 0 }))
    .sort((a, b) => b.plays - a.plays);
  const cities = [...cit.values()]
    .map(c => ({ country: c.country, city: c.city, flag: flagOf(c.country),
      plays: c.plays, artists: c.artists.size }))
    .sort((a, b) => b.plays - a.plays).slice(0, 12);
  GEOGRAPHY = {
    coverage: Math.round(totalCovered / lines.length * 100) / 100,
    countries: countries.slice(0, 20),
    cities,
    totalCountries: countries.length,
  };
}

// ─────────── STYLE ATLAS (Discogs styles unique-in-library) ───────────
// "Only-in-your-library" styles — Discogs styles that exist in your collection
// via just 1 or 2 artists. Counts how many distinct styles you've touched overall.
let STYLE_ATLAS = null;
if (hasDiscogs) {
  // style → { artists: [{name, plays, hue}], plays: total }
  const styleMap = new Map();
  let artistsCovered = 0;
  for (const a of ARTISTS) {
    if (!a.styles || a.styles.length === 0) continue;
    artistsCovered++;
    for (const s of a.styles) {
      if (!styleMap.has(s)) styleMap.set(s, { artists: [], plays: 0 });
      const m = styleMap.get(s);
      m.artists.push({ name: a.name, plays: a.plays, hue: a.hue });
      m.plays += a.plays;
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
  STYLE_ATLAS = {
    uniqueStyles: styleMap.size,
    artistsCovered,
    rarest,
    scenes,
  };
}

const INSIGHTS = {
  MILESTONES, OBSESSIONS, COMEBACKS, WONDERS, NIGHT_OWLS, DISCOVERIES, YEAR_PEAKS, ON_THIS_DAY,
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

const CITY = {
  "Tokyo": [
    ["Ocean Grove", "Shibuya WWW X", "2026-06-20"],
    ["Haru Nemuri", "Daikanyama UNIT", "2026-06-28"],
    ["Coaltar of the Deepers", "Shindaita Fever", "2026-07-05"],
    ["HANABIE.", "Shinjuku Loft", "2026-07-12"],
    ["Maximum the Hormone", "Zepp Haneda", "2026-07-19"],
    ["Crossfaith", "Spotify O-East", "2026-08-01"],
    ["Babymetal", "Makuhari Messe", "2026-08-16"],
    ["Machine Girl", "Shibuya Cyclone", "2026-08-23"],
    ["Otoboke Beaver", "Shimokitazawa Shelter", "2026-09-06"],
  ],
  "London": [
    ["Bring Me the Horizon", "The O2", "2026-06-22"],
    ["Architects", "Alexandra Palace", "2026-07-03"],
    ["Northlane", "Electric Ballroom", "2026-07-15"],
    ["Wargasm", "Heaven", "2026-07-26"],
    ["Machine Girl", "EartH, Hackney", "2026-08-09"],
    ["The Prodigy", "Finsbury Park", "2026-08-22"],
    ["Pendulum", "O2 Academy Brixton", "2026-09-12"],
  ],
  "Warsaw": [
    ["PRO8L3M", "Stodoła", "2026-06-25"],
    ["Pezet", "Klub Hydrozagadka", "2026-07-08"],
    ["Rammstein", "PGE Narodowy", "2026-08-01"],
    ["Slipknot", "Tauron Arena (Kraków)", "2026-08-14"],
    ["Korn", "COS Torwar", "2026-09-20"],
  ],
  "Berlin": [
    ["Nine Inch Nails", "Velodrom", "2026-06-28"],
    ["deadmau5", "Kraftwerk", "2026-07-12"],
    ["Crystal Castles", "Berghain", "2026-07-29"],
    ["Rammstein", "Olympiastadion", "2026-08-18"],
    ["Celldweller", "SO36", "2026-09-06"],
  ],
};
const CONCERTS = {};
for (const [city, list] of Object.entries(CITY)) {
  CONCERTS[city] = list.map((r, i) => ({
    id: city.toLowerCase() + i, city, artistId: slug(r[0]), artist: r[0], hue: hueFor(r[0]),
    venue: r[1], date: r[2], inLibrary: !!byName[r[0]],
  })).sort((a, b) => a.date.localeCompare(b.date));
}

// ─────────── emit ───────────
const DATA = {
  ARTISTS, ALBUMS, TRACKS, GENRES, CLOCK, ERAS, YEARS, CONCERTS,
  CITIES: Object.keys(CITY), TOTALS, NOW, RECENT, ERA_START, TREND, INSIGHTS,
};
const out = `// ────────────────────────────────────────────────────────────────
// Rotation — Fuad's listening data (last.fm/user/fuadex)
// GENERATED by build-data.js from fuadex.csv — do not edit by hand.
// ${totalScrobbles.toLocaleString("en-US")} scrobbles · ${new Date(oldestMs).toISOString().slice(0, 10)} → ${new Date(newestMs).toISOString().slice(0, 10)} · built ${new Date().toISOString().slice(0, 10)}
// GENRES + per-artist tags/audio-DNA from last.fm tags (${hasTags ? Object.keys(TAG_CACHE).length + " artists cached" : "curated fallback"}). CONCERTS still curated.
// ────────────────────────────────────────────────────────────────
window.ROTATION = (function () {
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const D = ${JSON.stringify(DATA)};
  D.byId = Object.fromEntries(D.ARTISTS.map(a => [a.id, a]));
  D.slug = slug;
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
