// enrich-tm.js — location-first upcoming-events pull from the Ticketmaster Discovery API.
// For each configured market: pull EVERY music event in the radius (longest window TM has),
// then intersect each event's lineup (attractions) against the library — by MusicBrainz id
// when TM carries one (externalLinks.musicbrainz), by normalized name otherwise. Only events
// featuring library artists are kept, so the committed cache stays small.
//
// Design notes (probed 2026-07-05):
//   - radius max is 19,999 km but paging caps at 1,000 items per query — we date-cursor past it.
//   - Tokyo returns 0 at any radius (TM has no Japan inventory; eplus/Pia have no API). Kept in
//     the market list anyway: costs 1 call/week and lights up if TM JP ever gets stock.
//   - event.url points at the actual outlet (TM, Moshtix, …) — that's the ticket link we ship.
//
// Usage: node enrich-tm.js            (key: env TICKETMASTER_API, or ../.env)
// Output: tm-events.json (committed). Weekly via .github/workflows/tour.yml.

const fs = require("fs");
const path = require("path");
const https = require("https");

let KEY = process.env.TICKETMASTER_API || process.env.TICKETMASTER_API_KEY;
if (!KEY) {
  const envPath = path.join(__dirname, "..", ".env");
  if (fs.existsSync(envPath)) KEY = (fs.readFileSync(envPath, "utf8").match(/^TICKETMASTER_API=(.+)$/m) || [])[1];
}
if (!KEY) { console.error("no TICKETMASTER_API key (env or ../.env)"); process.exit(1); }
KEY = KEY.trim();

const MARKETS = [
  { id: "sydney", label: "Sydney", ll: "-33.87,151.21", radiusKm: 1200 },
  { id: "tokyo",  label: "Tokyo",  ll: "35.68,139.69",  radiusKm: 1200 },
  { id: "warsaw", label: "Warsaw", ll: "52.23,21.01",   radiusKm: 1200 },
];
const OUT = path.join(__dirname, "tm-events.json");
const DELAY_MS = 260; // < 5 req/s

// ── library: display name + rank (search-index.js) and name → mbid (artist-stats.json)
const idxSrc = fs.readFileSync(path.join(__dirname, "search-index.js"), "utf8");
const rows = JSON.parse(idxSrc.slice(idxSrc.indexOf("[", idxSrc.indexOf("ROTATION_SEARCH")), idxSrc.lastIndexOf("]") + 1));
const norm = (s) => (s || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]/g, "");
const byNorm = new Map(); // norm(name) → [name, rank]
rows.forEach((r, i) => { const n = norm(r[0]); if (n && !byNorm.has(n)) byNorm.set(n, [r[0], i + 1]); });
const STATS = JSON.parse(fs.readFileSync(path.join(__dirname, "artist-stats.json"), "utf8"));
const byMbid = new Map(); // mbid → name (only names we actually play)
for (const [name, s] of Object.entries(STATS)) if (s && s.mbid && byNorm.has(norm(name))) byMbid.set(s.mbid, name);
console.log(`library: ${byNorm.size} names, ${byMbid.size} with mbid`);

function getJSON(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { "User-Agent": "RotationEnricher/0.1 ( fuadex@gmail.com )" } }, (res) => {
      let b = ""; res.on("data", (c) => b += c);
      res.on("end", () => { try { resolve({ status: res.statusCode, json: JSON.parse(b) }); } catch { resolve({ status: res.statusCode, json: null }); } });
    }).on("error", () => resolve({ status: 0, json: null }));
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const mbidFromLinks = (att) => {
  const l = att && att.externalLinks && att.externalLinks.musicbrainz;
  const u = l && l[0] && (l[0].url || l[0].id) || "";
  const m = String(u).match(/artist\/([0-9a-f-]{36})/i) || String(u).match(/^([0-9a-f-]{36})$/i);
  return m ? m[1] : null;
};
const pickImg = (imgs) => {
  const w = (imgs || []).filter((i) => i.ratio === "16_9").sort((a, b) => Math.abs(a.width - 640) - Math.abs(b.width - 640));
  return w[0] ? w[0].url : "";
};

async function pullMarket(mkt) {
  let cursor = "";       // startDateTime cursor to slice past the 1000-item paging cap
  const seen = new Set(), events = [];
  let scanned = 0, calls = 0;
  for (let slice = 0; slice < 30; slice++) {
    let page = 0, totalPages = 1, totalElements = 0, got = 0, lastDate = "";
    while (page < totalPages && (page + 1) * 200 <= 1000) {
      const u = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${KEY}&latlong=${mkt.ll}&radius=${mkt.radiusKm}&unit=km&classificationName=Music&size=200&page=${page}&sort=date,asc${cursor ? `&startDateTime=${cursor}` : ""}`;
      const { status, json } = await getJSON(u); calls++;
      if (status === 429) { await sleep(5000); continue; }
      if (!json || !json._embedded) { page = totalPages; break; }
      totalPages = json.page.totalPages; totalElements = json.page.totalElements;
      for (const e of json._embedded.events) {
        got++;
        const date = (e.dates && e.dates.start && e.dates.start.localDate) || "";
        if (date) lastDate = date;
        if (seen.has(e.id)) continue;
        seen.add(e.id); scanned++;
        const atts = (e._embedded && e._embedded.attractions) || [];
        const hits = [];
        for (const a of atts) {
          const mb = mbidFromLinks(a);
          if (mb && byMbid.has(mb)) { hits.push([byMbid.get(mb), 1]); continue; }   // exact mbid join
          const hit = byNorm.get(norm(a.name));
          if (hit) hits.push([hit[0], 0]);                                          // name-only join
        }
        if (!hits.length) continue;
        const v = (e._embedded.venues && e._embedded.venues[0]) || {};
        events.push({
          id: e.id, mkt: mkt.id,
          date, time: (e.dates.start && e.dates.start.localTime || "").slice(0, 5),
          name: e.name, url: e.url || "",
          venue: v.name || "", city: (v.city && v.city.name) || "",
          country: (v.country && v.country.name) || "", cc: (v.country && v.country.countryCode) || "",
          lat: v.location ? +v.location.latitude : null, lng: v.location ? +v.location.longitude : null,
          img: pickImg(e.images),
          status: (e.dates.status && e.dates.status.code) || "",
          genre: (e.classifications && e.classifications[0] && e.classifications[0].genre && e.classifications[0].genre.name) || "",
          acts: atts.map((a) => a.name),
          hits,
        });
      }
      page++; await sleep(DELAY_MS);
    }
    // done if this slice saw everything TM reported for it; else cursor past the cap and go again
    if (got >= totalElements || !lastDate) break;
    cursor = lastDate + "T00:00:00Z";
  }
  console.log(`${mkt.label}: ${scanned} events scanned · ${events.length} feature library artists · ${calls} calls`);
  return { scanned, calls, events };
}

(async () => {
  const out = { fetched: new Date().toISOString().slice(0, 10), markets: [], events: [] };
  for (const mkt of MARKETS) {
    const r = await pullMarket(mkt);
    out.markets.push({ id: mkt.id, label: mkt.label, ll: mkt.ll, radiusKm: mkt.radiusKm, scanned: r.scanned, matched: r.events.length });
    out.events.push(...r.events);
  }
  out.events.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  fs.writeFileSync(OUT, JSON.stringify(out, null, 0), "utf8");
  const artists = new Set(); for (const e of out.events) for (const h of e.hits) artists.add(h[0]);
  console.log(`tm-events.json: ${out.events.length} events · ${artists.size} library artists on tour`);
})();
