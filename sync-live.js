// sync-live.js — writes live-data.js (small, committed) from the last.fm API.
// Run daily by .github/workflows/sync.yml. Usage: LASTFM_API_KEY=xxx node sync-live.js
// Keeps the homepage scrobble total + recent feed fresh between full CSV re-exports.

const fs = require("fs");
const path = require("path");
const https = require("https");

const KEY = process.env.LASTFM_API_KEY;
const USER = "fuadex";
if (!KEY) { console.error("Set LASTFM_API_KEY env var."); process.exit(1); }

const get = (url) => new Promise((res, rej) => {
  https.get(url, (r) => { let b = ""; r.on("data", c => b += c); r.on("end", () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } }); }).on("error", rej);
});
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

(async () => {
  const j = await get(`https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${USER}&api_key=${KEY}&format=json&limit=12`);
  const rt = j && j.recenttracks;
  if (!rt || !rt.track) { console.error("unexpected response", JSON.stringify(j).slice(0, 200)); process.exit(1); }

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
