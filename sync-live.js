// sync-live.js — writes live-data.js (small, committed) from the last.fm API.
// Run daily by .github/workflows/sync.yml. Usage: LASTFM_API_KEY=xxx node sync-live.js
// Keeps the homepage scrobble total + recent feed fresh between full CSV re-exports.

const fs = require("fs");
const path = require("path");
const https = require("https");

const KEY = process.env.LASTFM_API_KEY;
const USER = "fuadex";
if (!KEY) { console.error("Set LASTFM_API_KEY env var."); process.exit(1); }

// last.fm rate-limits / blocks requests with no User-Agent from datacenter IPs (e.g. GitHub
// Actions runners), returning a non-JSON page → so always send a UA and retry transient failures.
const get = (url) => new Promise((res, rej) => {
  https.get(url, { headers: { "User-Agent": "rotation-sync/1.0 (+https://fuad.au)", "Accept": "application/json" } }, (r) => {
    let b = ""; r.on("data", c => b += c); r.on("end", () => {
      if (r.statusCode !== 200) return rej(new Error("HTTP " + r.statusCode + " · " + b.replace(/\s+/g, " ").slice(0, 140)));
      try { res(JSON.parse(b)); } catch (e) { rej(new Error("non-JSON response · " + b.replace(/\s+/g, " ").slice(0, 140))); }
    });
  }).on("error", rej);
});
const getRetry = async (url, tries = 4) => { let last; for (let i = 0; i < tries; i++) { try { return await get(url); } catch (e) { last = e; console.error(`attempt ${i + 1} failed: ${e.message}`); await new Promise(r => setTimeout(r, 1500 * (i + 1))); } } throw last; };
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

(async () => {
  const j = await getRetry(`https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${USER}&api_key=${KEY}&format=json&limit=12`);
  if (j && j.error) { console.error(`last.fm error ${j.error}: ${j.message}`); process.exit(1); }
  const rt = j && j.recenttracks;
  if (!rt || !rt.track || !rt["@attr"]) { console.error("unexpected response", JSON.stringify(j).slice(0, 200)); process.exit(1); }

  const tracks = (Array.isArray(rt.track) ? rt.track : [rt.track]).map(t => ({
    artist: (t.artist && (t.artist["#text"] || t.artist.name)) || "",
    track: t.name || "", album: (t.album && t.album["#text"]) || "",
    nowplaying: !!(t["@attr"] && t["@attr"].nowplaying), uts: t.date ? +t.date.uts : null,
  }));
  const np = tracks.find(t => t.nowplaying) || tracks[0];
  const recent = tracks.filter(t => !t.nowplaying).slice(0, 8).map((t, i) => ({
    id: "lv" + i, artistId: slug(t.artist), artist: t.artist, track: t.track, uts: t.uts,
  }));

  const data = {
    total: +rt["@attr"].total,
    now: { artist: np.artist, track: np.track, album: np.album, artistId: slug(np.artist), nowplaying: np.nowplaying },
    recent, updated: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(__dirname, "live-data.js"),
    `// GENERATED daily by sync-live.js — last.fm live snapshot. Do not edit by hand.\nwindow.ROTATION_LIVE = ${JSON.stringify(data)};\n`, "utf8");
  console.log(`live-data.js: ${data.total} scrobbles · now: ${data.now.artist} — ${data.now.track}${data.now.nowplaying ? " (live)" : ""}`);
})();
