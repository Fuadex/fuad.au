// sync-csv.js — keep fuadex.csv in sync with last.fm so `node build-data.js` grows the FULL
// per-artist/album/track dataset (not just the live total). Run before build-data.js.
//
//   node sync-csv.js          → cheap forward delta (append scrobbles newer than the CSV's latest);
//                               if afterwards the CSV is still materially short of last.fm's reported
//                               total (export gaps / back-dated imports), it auto-falls-back to --full.
//   node sync-csv.js --full   → re-pull the ENTIRE history and rewrite the CSV (authoritative; also
//                               repairs lost-timestamp "1970" rows since the API has real dates).
//
// Usage:  LASTFM_API_KEY=xxx node sync-csv.js   (locally also reads ../culture/.env)
// CSV format matches the export: `artist,album,track,DD Mon YYYY HH:MM`, times in UTC (build-data.js
// applies TZ_OFFSET_HOURS to shift to local). Boundary dedup by (artist, track, minute-string).

const fs = require("fs"), path = require("path"), https = require("https");

let KEY = process.env.LASTFM_API_KEY;
if (!KEY) { try { const m = fs.readFileSync(path.join(__dirname, "../culture/.env"), "utf8").match(/LASTFM_API_KEY\s*=\s*(.+)/); if (m) KEY = m[1].trim(); } catch (e) {} }
if (!KEY) { console.error("Set LASTFM_API_KEY env var."); process.exit(1); }

const USER = "fuadex", CSV = path.join(__dirname, "fuadex.csv");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MIDX = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
const UA = "rotation-sync/1.0 (+https://fuad.au)";
const DRIFT_TOL = 40;   // if the CSV is more than this short of last.fm's total after a delta → full re-pull

const get = (url) => new Promise((res, rej) => {
  https.get(url, { headers: { "User-Agent": UA, "Accept": "application/json" } }, (r) => {
    let b = ""; r.on("data", c => b += c); r.on("end", () => {
      if (r.statusCode !== 200) return rej(new Error("HTTP " + r.statusCode + " · " + b.replace(/\s+/g, " ").slice(0, 120)));
      try { res(JSON.parse(b)); } catch (e) { rej(new Error("non-JSON · " + b.replace(/\s+/g, " ").slice(0, 120))); }
    });
  }).on("error", rej);
});
const getRetry = async (u, t = 4) => { let e; for (let i = 0; i < t; i++) { try { return await get(u); } catch (x) { e = x; console.error(`  retry ${i + 1}: ${x.message}`); await new Promise(r => setTimeout(r, 1500 * (i + 1))); } } throw e; };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function parseLine(line) { const o = []; let c = "", q = false; for (let i = 0; i < line.length; i++) { const ch = line[i]; if (q) { if (ch === '"') { if (line[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; } else if (ch === '"') q = true; else if (ch === ",") { o.push(c); c = ""; } else c += ch; } o.push(c); return o; }
const fmtUTC = (uts) => { const d = new Date(uts * 1000), p = (n) => String(n).padStart(2, "0"); return `${p(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`; };
const csvEsc = (s) => { s = s == null ? "" : String(s); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
// Data overrides applied as rows are written to fuadex.csv (durable — re-applied on every pull).
// last.fm stored a batch of scrobbles under the literal artist "<Unknown>"; we identified them and
// rewrite artist/album/track to the real values here rather than soft-remapping downstream.
const cleanTrack = (t) => { const s = (t || "").replace(/_-_www\.[^\s]+/ig, "").replace(/_+/g, " ").replace(/^\d{1,3}\s*[-.\s]+/, "").trim(); return s || t; };
function fixUnknown(artist, album, track) {
  if (artist !== "<Unknown>") return [artist, album, track];
  const a = album || "";
  if (/sounds of violence/i.test(a) || a === "Onslaught") return ["Onslaught", "Sounds of Violence", cleanTrack(track)];
  if (a === "Sepultura") return ["Sepultura", "", cleanTrack(track)];
  if (/^cd\s*\d/i.test(a)) return ["deadmau5", "", cleanTrack(track)];
  if (a === "Him" || /greatest lovesongs|greatest love songs|screamworks|venus doom|this is only the beginning/i.test(a))
    return ["HIM", a === "Him" ? "" : a.replace(/^\s*\d{4}\s*-\s*/, ""), cleanTrack(track)];
  return [artist, album, track];
}
// scatter a bogus placeholder album onto the real releases its tracks belong to (per-track)
const ALBUM_REMAP = {
  ["Linkin Park\x00Mój Album"]: {
    "Numb": "Meteora", "From the Inside": "Meteora", "Somewhere I Belong": "Meteora",
    "Faint": "Meteora", "Breaking the Habbit": "Meteora",
    "In the End": "Hybrid Theory", "Points of Authority (remix)": "Hybrid Theory",
    "Points of Authority (Cristal Remix)": "Reanimation", "By My Self (Remix)": "Reanimation",
  },
};
// strip junk tags so fragmented variants merge: [FLAC]/[Deluxe]/[Left]…, "Disc 1"/"(Disc 1 of 2)"/"CD1", leading "YYYY - "
const cleanAlbum = (name) => {
  if (!name) return name;
  const s = name.replace(/\s*\[[^\]]*\]/g, "").replace(/\s*\(?\s*(?:disc|cd|disk)\s*\d+(?:\s*of\s*\d+)?\s*\)?/ig, "")
    .replace(/^\s*\d{4}\s*[-–—]\s*/, "").replace(/\s{2,}/g, " ").trim().replace(/[\s:–—-]+$/, "").trim();
  return s || name;
};
// all data-hygiene overrides in one place; applied on every pulled row AND to the existing CSV (--fixcsv)
function fixRow(artist, album, track) {
  [artist, album, track] = fixUnknown(artist, album, track);
  const m = ALBUM_REMAP[artist + "\x00" + album]; if (m && m[track]) album = m[track];
  return [artist, cleanAlbum(album), track];
}
const rowOf = (t) => { const artist = (t.artist && (t.artist["#text"] || t.artist.name)) || "", album = (t.album && t.album["#text"]) || "", track = t.name || "", uts = t.date ? +t.date.uts : 0; const [a, al, tr] = fixRow(artist, album, track); return { uts, artist: a, album: al, track: tr }; };
const lineOf = (s) => [s.artist, s.album, s.track, fmtUTC(s.uts)].map(csvEsc).join(",");

// page through user.getrecenttracks; from=0 → entire history. Returns {rows, total}.
async function pull(from) {
  const out = []; let page = 1, totalPages = 1, total = 0;
  do {
    const q = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${USER}&api_key=${KEY}&format=json&limit=200&page=${page}` + (from ? `&from=${from}` : "");
    const j = await getRetry(q);
    if (j && j.error) throw new Error(`last.fm error ${j.error}: ${j.message}`);
    const rt = j && j.recenttracks, tr = rt && rt.track, arr = Array.isArray(tr) ? tr : tr ? [tr] : [];
    if (rt && rt["@attr"]) { totalPages = +rt["@attr"].totalPages || 1; total = +rt["@attr"].total || 0; }
    for (const t of arr) { if (t["@attr"] && t["@attr"].nowplaying) continue; const r = rowOf(t); if (r.uts) out.push(r); }
    if (page % 100 === 0) console.log(`  …page ${page}/${totalPages}`);
    page++; if (page <= totalPages) await sleep(280);
  } while (page <= totalPages);
  return { rows: out, total };
}

function writeFull(rows) {
  rows.sort((a, b) => b.uts - a.uts);   // newest-first, like the export
  fs.writeFileSync(CSV, rows.map(lineOf).join("\n") + "\n", "utf8");
}

// --fixcsv: apply the data overrides (fixUnknown) to the CSV we already have, in place — no network.
// Durable because the same fix also runs on every pull via rowOf.
if (process.argv.includes("--fixcsv")) {
  const lines = fs.readFileSync(CSV, "utf8").split(/\r?\n/).filter(l => l.trim());
  let changed = 0;
  const out = lines.map(l => {
    const p = parseLine(l), [a, al, tr] = fixRow(p[0], p[1], p[2]);
    if (a !== p[0] || al !== p[1] || tr !== p[2]) { changed++; return [a, al, tr, p[3]].map(csvEsc).join(","); }
    return l;
  });
  fs.writeFileSync(CSV, out.join("\n") + "\n", "utf8");
  console.log(`fixcsv: rewrote ${changed} rows in place`);
  process.exit(0);
}

(async () => {
  const full = process.argv.includes("--full");
  const raw = fs.existsSync(CSV) ? fs.readFileSync(CSV, "utf8") : "";
  const lines = raw.split(/\r?\n/).filter(l => l.trim());

  if (full || !lines.length) {
    console.log(full ? "full re-pull requested…" : "no CSV — full pull…");
    const { rows, total } = await pull(0);
    writeFull(rows);
    console.log(`full pull: wrote ${rows.length} scrobbles (last.fm total ${total})`);
    return;
  }

  // forward delta from the newest dated row
  let maxMs = 0; const recentKeys = new Set(), WINDOW = 3 * 86400e3;
  const parsed = lines.map(l => { const p = parseLine(l); const m = /^(\d{2}) (\w{3}) (\d{4}) (\d{2}):(\d{2})$/.exec(p[3] || ""); return { p, ms: m ? Date.UTC(+m[3], MIDX[m[2]], +m[1], +m[4], +m[5]) : null }; });
  for (const x of parsed) if (x.ms && x.ms > maxMs) maxMs = x.ms;
  for (const x of parsed) if (x.ms && x.ms >= maxMs - WINDOW) recentKeys.add(x.p[0] + " " + x.p[2] + " " + x.p[3]);
  const from = maxMs ? Math.floor(maxMs / 1000) : 0;
  console.log(`newest in CSV: ${maxMs ? new Date(maxMs).toISOString() : "—"} · delta since…`);

  const { rows, total } = await pull(from);
  const fresh = [];
  for (const r of rows) { const key = r.artist + " " + r.track + " " + fmtUTC(r.uts); if (recentKeys.has(key)) continue; recentKeys.add(key); fresh.push(r); }
  if (fresh.length) {
    fresh.sort((a, b) => a.uts - b.uts);
    fs.appendFileSync(CSV, (raw.endsWith("\n") ? "" : "\n") + fresh.map(lineOf).join("\n") + "\n", "utf8");
    console.log(`appended ${fresh.length} new scrobbles · CSV now ${lines.length + fresh.length} rows`);
  } else console.log("no new scrobbles to append.");

  // self-heal: if the CSV is still materially short of last.fm's total, history is incomplete → full re-pull
  const nowRows = lines.length + fresh.length;
  if (total && total - nowRows > DRIFT_TOL) {
    console.log(`CSV ${nowRows} vs last.fm ${total} (short ${total - nowRows}) → full re-pull to repair history…`);
    const all = await pull(0);
    writeFull(all.rows);
    console.log(`full re-pull: wrote ${all.rows.length} scrobbles (last.fm total ${all.total})`);
  }
})();
