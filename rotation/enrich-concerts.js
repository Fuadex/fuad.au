// enrich-concerts.js — fetch real upcoming events for top N artists via the
// Ticketmaster Discovery API. Bandsintown's keyless API was killed (403). Songkick is
// partner-only. Ticketmaster is free + instant registration at developer.ticketmaster.com,
// 5000 req/day / 5 req/sec.
//
// Usage:  TICKETMASTER_API_KEY=xxx node enrich-concerts.js [topN]   (default 200)
// Output: concerts-cache.json, keyed by artist name → { events: [...], fetched }.
// Concerts are time-sensitive — this script ALWAYS re-fetches all artists.

const fs = require("fs");
const path = require("path");
const https = require("https");

const API_KEY = process.env.TICKETMASTER_API_KEY;
if (!API_KEY) { console.error("Set TICKETMASTER_API_KEY env var. Free key: developer.ticketmaster.com"); process.exit(1); }

const TOP_N = parseInt(process.argv[2], 10) || 200;
const CACHE_PATH = path.join(__dirname, "concerts-cache.json");
const INDEX_PATH = path.join(__dirname, "search-index.js");
const DELAY_MS = 220; // ~4.5 req/sec — under TM's 5/sec ceiling
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

async function fetchEvents(artist) {
  const u = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${API_KEY}&keyword=${encodeURIComponent(artist)}&size=20&sort=date,asc&segmentName=Music&classificationName=Music`;
  const { json, status } = await getJSON(u);
  if (status === 429) { await sleep(5000); return fetchEvents(artist); } // rate-limit hiccup
  const events = (json && json._embedded && json._embedded.events) || [];
  // Filter to events whose top-billed artist actually matches our query (loose).
  // TM's keyword search can return tribute bands / festivals that name the artist in the description.
  const target = artist.toLowerCase().replace(/[^a-z0-9]/g, "");
  return events.map(e => {
    const v = (e._embedded && e._embedded.venues && e._embedded.venues[0]) || {};
    const attractions = (e._embedded && e._embedded.attractions) || [];
    const headline = attractions[0] && attractions[0].name;
    return {
      datetime: (e.dates && e.dates.start && (e.dates.start.dateTime || e.dates.start.localDate)) || "",
      date: (e.dates && e.dates.start && e.dates.start.localDate) || "",
      venue: v.name || "",
      city: (v.city && v.city.name) || "",
      country: (v.country && v.country.name) || "",
      lat: v.location && v.location.latitude ? +v.location.latitude : null,
      lon: v.location && v.location.longitude ? +v.location.longitude : null,
      url: e.url || "",
      headline: headline || "",
    };
  }).filter(e => {
    if (!e.date || !e.city) return false;
    const h = (e.headline || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    // require the headline to share at least the first 6 normalized chars with the query
    // (lets through "Linkin Park" vs "Linkin Park Tribute" — but the latter often shows up first
    //  so we accept it; user-facing filter can dedupe later)
    return !h || !target || h.includes(target.slice(0, 6)) || target.includes(h.slice(0, 6));
  });
}

(async () => {
  const idxSrc = fs.readFileSync(INDEX_PATH, "utf8");
  const eq = idxSrc.indexOf("ROTATION_SEARCH");
  const start = idxSrc.indexOf("[", eq);
  const rows = JSON.parse(idxSrc.slice(start, idxSrc.lastIndexOf("]") + 1));
  const artists = rows.slice(0, TOP_N).map(r => r[0]);

  const cache = {};
  console.log(`fetching upcoming events for top ${artists.length} artists from Ticketmaster`);

  let done = 0, withEvents = 0, totalEvents = 0;
  const today = new Date().toISOString().slice(0, 10);
  for (const artist of artists) {
    try {
      const events = await fetchEvents(artist);
      cache[artist] = { events, fetched: today };
      if (events.length) { withEvents++; totalEvents += events.length; }
    } catch (e) {
      cache[artist] = { events: [], fetched: today, error: true };
    }
    done++;
    if (done % 25 === 0) {
      fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 0), "utf8");
      console.log(`  ${done}/${artists.length} (${withEvents} with events, ${totalEvents} total)…`);
    }
    await sleep(DELAY_MS);
  }
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 0), "utf8");
  console.log(`done: ${done} artists checked · ${withEvents} have upcoming events · ${totalEvents} events total`);
})();
