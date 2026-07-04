// enrich-gigs.js — pull Fuad's attended concerts from setlist.fm into gigs.json.
// setlist.fm: GET /rest/1.0/user/{username}/attended (paginated, 20/page), header
// x-api-key. Free key. Polite ~1.1s between pages. Writes a clean per-gig record;
// build-data.js joins these against the listening data (seen-vs-never, setlist ×
// your top tracks) and the Gigs page renders the timeline/map.
//
// Key is read from fuad.au/.env (SETLIST_FM_API) locally, or process.env in CI.
// Usage:  node enrich-gigs.js [username]   (default fuadex)

const fs = require("fs");
const path = require("path");
const https = require("https");

const USER = process.argv[2] || "fuadex";
const OUT = path.join(__dirname, "gigs.json");
const DELAY_MS = 1100;

function readKey() {
  if (process.env.SETLIST_FM_API) return process.env.SETLIST_FM_API.trim();
  try {
    const env = fs.readFileSync(path.join(__dirname, "..", ".env"), "utf8");
    const m = env.match(/^SETLIST_FM_API=(.*)$/m);
    return m ? m[1].trim() : "";
  } catch (e) { return ""; }
}
const KEY = readKey();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function getPage(p) {
  const opts = { headers: { "x-api-key": KEY, Accept: "application/json", "User-Agent": "RotationEnricher/0.1 ( fuadex@gmail.com )" } };
  const url = `https://api.setlist.fm/rest/1.0/user/${encodeURIComponent(USER)}/attended?p=${p}`;
  return new Promise((resolve) => {
    https.get(url, opts, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => { try { resolve({ status: res.statusCode, json: JSON.parse(body) }); } catch (e) { resolve({ status: res.statusCode, json: null }); } });
    }).on("error", () => resolve({ status: 0, json: null }));
  });
}

// "dd-MM-yyyy" → "yyyy-MM-dd"
const isoDate = (d) => { const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(d || ""); return m ? `${m[3]}-${m[2]}-${m[1]}` : (d || ""); };

function flattenSongs(sets) {
  const out = [];
  for (const s of (sets && sets.set) || []) {
    for (const song of s.song || []) {
      if (!song.name) continue; // skip untitled/tape markers with no title
      out.push({ name: song.name, encore: s.encore ? 1 : 0,
        cover: song.cover ? song.cover.name : null, tape: song.tape ? 1 : 0,
        with: song.with ? song.with.name : null });
    }
  }
  return out;
}

(async () => {
  if (!KEY) { console.error("No SETLIST_FM_API key (env or ../.env) — aborting."); process.exit(1); }
  const gigs = [];
  let total = Infinity, per = 20, p = 1;
  while ((p - 1) * per < total) {
    const { status, json } = await getPage(p);
    if (status === 404) { console.log(`user ${USER}: no attended concerts (404).`); break; }
    if (!json || !json.setlist) { console.log(`page ${p}: HTTP ${status} — stopping.`); break; }
    total = json.total; per = json.itemsPerPage || 20;
    for (const s of json.setlist) {
      const v = s.venue || {}, c = v.city || {}, co = c.coords || {}, ctry = c.country || {};
      gigs.push({
        date: isoDate(s.eventDate),
        artist: s.artist ? s.artist.name : "",
        artistMbid: s.artist ? s.artist.mbid : "",
        venue: v.name || "",
        city: c.name || "",
        state: c.stateCode || c.state || "",
        countryCode: ctry.code || "",
        country: ctry.name || "",
        lat: typeof co.lat === "number" ? co.lat : null,
        lng: typeof co.long === "number" ? co.long : null,
        tour: s.tour ? s.tour.name : "",
        songs: flattenSongs(s.sets),
        url: s.url || "",
        id: s.id || "",
      });
    }
    console.log(`page ${p}/${Math.ceil(total / per)}: +${json.setlist.length} (${gigs.length}/${total})`);
    p++;
    await sleep(DELAY_MS);
  }
  gigs.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)); // newest first
  const payload = { fetched: new Date().toISOString().slice(0, 10), user: USER, total: gigs.length, gigs };
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 0), "utf8");
  const withSet = gigs.filter((g) => g.songs.length > 0).length;
  const artists = new Set(gigs.map((g) => g.artist)).size;
  const cities = new Set(gigs.map((g) => g.countryCode + "|" + g.city)).size;
  console.log(`done: ${gigs.length} gigs · ${artists} artists · ${cities} cities · ${withSet} with a setlist → gigs.json`);
})();
