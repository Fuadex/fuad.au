// sync-live.js — writes live-data.js (small, committed) from the last.fm API.
// Run daily by .github/workflows/sync.yml. Usage: LASTFM_API_KEY=xxx node sync-live.js
//
// Keeps the homepage fresh between full CSV re-exports. Beyond the scrobble total + recent feed, it
// also captures rolling windows that power the Overview's dynamic insight cards:
//   • week     — 7d plays vs the lifetime weekly average, this week's top artist/track, new artists,
//                and a plays-weighted mood read (energy/valence vs the all-time baseline)
//   • month    — 30d "new obsessions" (artists new to the library) + deepest dive
//   • clock72  — hourly play counts for the last 72 hours (a 3-day activity strip)
// It loads music-data.js (the last full build) to know which artists are already in the library, to
// resolve artist ids/hues, and to look up measured audio for the mood read.

const fs = require("fs");
const path = require("path");
const https = require("https");
const vm = require("vm");

const KEY = process.env.LASTFM_API_KEY;
const USER = "fuadex";
if (!KEY) { console.error("Set LASTFM_API_KEY env var."); process.exit(1); }

const API = "https://ws.audioscrobbler.com/2.0/";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// last.fm rate-limits / blocks requests with no User-Agent from datacenter IPs (e.g. GitHub Actions
// runners), returning a non-JSON page → so always send a UA and retry transient failures.
const get = (url) => new Promise((res, rej) => {
  https.get(url, { headers: { "User-Agent": "rotation-sync/1.0 (+https://fuad.au)", "Accept": "application/json" } }, (r) => {
    let b = ""; r.on("data", c => b += c); r.on("end", () => {
      if (r.statusCode !== 200) return rej(new Error("HTTP " + r.statusCode + " · " + b.replace(/\s+/g, " ").slice(0, 140)));
      try { res(JSON.parse(b)); } catch (e) { rej(new Error("non-JSON response · " + b.replace(/\s+/g, " ").slice(0, 140))); }
    });
  }).on("error", rej);
});
const getRetry = async (url, tries = 4) => { let last; for (let i = 0; i < tries; i++) { try { return await get(url); } catch (e) { last = e; console.error(`attempt ${i + 1} failed: ${e.message}`); await sleep(1500 * (i + 1)); } } throw last; };
const q = (method, extra) => `${API}?method=${method}&user=${USER}&api_key=${KEY}&format=json${extra || ""}`;
const slugFallback = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// ── load the last full build so we know the existing library + audio + ids ──
let R = null;
try {
  const ctx = { window: {}, console: { log() {}, error() {} } };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "music-core.js"), "utf8"), ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "music-rest.js"), "utf8"), ctx);   // merges EXPLORE/AUDIO/expById
  R = ctx.window.ROTATION;
} catch (e) { console.error("could not load music-core/rest (degrading): " + e.message); }

const idFor = (name) => (R && (R.idForName(name) || R.slug(name))) || slugFallback(name);
const hueFor = (name) => { if (!R) return 210; const e = R.byId[idFor(name)] || (R.expById && R.expById[idFor(name)]); return e && e.hue != null ? e.hue : 210; };
const isKnown = (name) => !!(R && R.played(name));
const audioFor = (name) => (R && R.AUDIO && R.AUDIO[idFor(name)]) || null;

// all-time, plays-weighted energy/valence baseline (so "lately" has something to lean against)
const baseline = (() => {
  if (!R || !R.ARTISTS) return { energy: 0.5, valence: 0.5 };
  let e = 0, v = 0, w = 0;
  for (const a of R.ARTISTS) { if (!a.audio) continue; const p = a.plays || 1; e += a.audio.energy * p; v += a.audio.valence * p; w += p; }
  return w ? { energy: e / w, valence: v / w } : { energy: 0.5, valence: 0.5 };
})();

// weekly artist/track charts accept explicit from/to unix windows → top items + playcounts per range
async function artistChart(from, to) {
  const j = await getRetry(q("user.getweeklyartistchart", `&from=${from}&to=${to}`));
  const arr = (j && j.weeklyartistchart && j.weeklyartistchart.artist) || [];
  return (Array.isArray(arr) ? arr : [arr]).map(a => ({ name: a.name, plays: +a.playcount || 0 }));
}
async function trackChart(from, to) {
  const j = await getRetry(q("user.getweeklytrackchart", `&from=${from}&to=${to}`));
  const arr = (j && j.weeklytrackchart && j.weeklytrackchart.track) || [];
  return (Array.isArray(arr) ? arr : [arr]).map(t => ({ name: t.name, artist: (t.artist && (t.artist["#text"] || t.artist.name)) || "", plays: +t.playcount || 0 }));
}

// last 72h, bucketed into 72 hourly bins (page recent tracks until older than the window)
async function clock72(now) {
  const to = now, from = now - 72 * 3600;
  const bins = new Array(72).fill(0);
  for (let page = 1; page <= 6; page++) {
    const j = await getRetry(q("user.getrecenttracks", `&from=${from}&to=${to}&limit=200&page=${page}`));
    const rt = j && j.recenttracks; const tr = rt && rt.track;
    const tracks = (Array.isArray(tr) ? tr : tr ? [tr] : []);
    let oldest = Infinity;
    for (const t of tracks) {
      if (t["@attr"] && t["@attr"].nowplaying) continue;
      const uts = t.date ? +t.date.uts : null; if (!uts) continue;
      oldest = Math.min(oldest, uts);
      const i = Math.floor((uts - from) / 3600);
      if (i >= 0 && i < 72) bins[i]++;
    }
    const totalPages = rt && rt["@attr"] ? +rt["@attr"].totalPages : 1;
    if (page >= totalPages || tracks.length === 0 || oldest <= from) break;
    await sleep(300);
  }
  return { from, to, bins };
}

(async () => {
  const j = await getRetry(q("user.getrecenttracks", "&limit=25"));
  if (j && j.error) { console.error(`last.fm error ${j.error}: ${j.message}`); process.exit(1); }
  const rt = j && j.recenttracks;
  if (!rt || !rt.track || !rt["@attr"]) { console.error("unexpected response", JSON.stringify(j).slice(0, 200)); process.exit(1); }

  const tracks = (Array.isArray(rt.track) ? rt.track : [rt.track]).map(t => ({
    artist: (t.artist && (t.artist["#text"] || t.artist.name)) || "",
    track: t.name || "", album: (t.album && t.album["#text"]) || "",
    nowplaying: !!(t["@attr"] && t["@attr"].nowplaying), uts: t.date ? +t.date.uts : null,
  }));
  const np = tracks.find(t => t.nowplaying) || tracks[0];
  const recent = tracks.filter(t => !t.nowplaying).slice(0, 20).map((t, i) => ({
    id: "lv" + i, artistId: idFor(t.artist), artist: t.artist, track: t.track, uts: t.uts,
  }));

  const total = +rt["@attr"].total;
  const data = {
    total,
    now: { artist: np.artist, track: np.track, album: np.album, artistId: idFor(np.artist), nowplaying: np.nowplaying },
    recent, updated: new Date().toISOString(),
  };

  // ── rolling-window enrichment (best-effort; never blocks the core snapshot) ──
  try {
    const now = Math.floor(Date.now() / 1000);
    const [a7, t7, a30, c72] = [await artistChart(now - 7 * 86400, now), await (sleep(300).then(() => trackChart(now - 7 * 86400, now))),
      await (sleep(300).then(() => artistChart(now - 30 * 86400, now))), await (sleep(300).then(() => clock72(now)))];

    const plays7 = a7.reduce((s, a) => s + a.plays, 0);
    const lifetimeWeekAvg = R ? Math.round((R.TOTALS.perDay || 0) * 7) : 0;
    const topArtists = a7.slice(0, 5).map(a => ({ name: a.name, artistId: idFor(a.name), plays: a.plays }));
    const topTracks = t7.slice(0, 5).map(t => ({ name: t.name, artist: t.artist, artistId: idFor(t.artist), plays: t.plays }));
    const new7 = a7.filter(a => !isKnown(a.name));
    const newArtists = a30.filter(a => !isKnown(a.name)).slice(0, 6).map(a => ({ name: a.name, artistId: idFor(a.name), plays: a.plays, hue: hueFor(a.name) }));
    const deepest = a30[0] ? { name: a30[0].name, artistId: idFor(a30[0].name), plays: a30[0].plays, hue: hueFor(a30[0].name) } : null;

    // plays-weighted mood over this week's artists, where we have measured audio
    let me = 0, mv = 0, mw = 0;
    for (const a of a7) { const af = audioFor(a.name); if (!af) continue; me += af[0] * a.plays; mv += af[1] * a.plays; mw += a.plays; }
    const mood = mw ? { energy: +(me / mw).toFixed(3), valence: +(mv / mw).toFixed(3), baseEnergy: +baseline.energy.toFixed(3), baseValence: +baseline.valence.toFixed(3), covered: mw } : null;

    data.week = { plays7, weekAvg: lifetimeWeekAvg, topArtists, topTracks, newArtistsThisWeek: new7.length };
    data.month = { newArtists, deepest };
    data.mood = mood;
    data.clock72 = c72;
    console.log(`windows: 7d=${plays7} plays (avg ${lifetimeWeekAvg}) · #1 ${topArtists[0] ? topArtists[0].name : "—"} · ${new7.length} new this week · ${newArtists.length} new this month`);
  } catch (e) {
    console.error("window enrichment failed (core snapshot still written): " + e.message);
  }

  fs.writeFileSync(path.join(__dirname, "live-data.js"),
    `// GENERATED daily by sync-live.js — last.fm live snapshot. Do not edit by hand.\nwindow.ROTATION_LIVE = ${JSON.stringify(data)};\n`, "utf8");
  console.log(`live-data.js: ${data.total} scrobbles · now: ${data.now.artist} — ${data.now.track}${data.now.nowplaying ? " (live)" : ""}`);
})();
