// enrich-coverage.js — the "unknown unknowns" checklist. For every artist, which enrichment
// caches cover them, sliced by play volume — so gaps in the HEAD (well-played artists that
// failed enrichment: Hyper, DIVA) are separated from the deliberate long-tail cutoff.
//
//   node enrich-coverage.js            summary by play-band + top offenders per cache
//   node enrich-coverage.js --csv      full per-artist matrix to enrich-coverage.csv (gitignored ok)
const fs = require("fs"), path = require("path");
const here = (f) => path.join(__dirname, f);
const J = (f) => { try { return JSON.parse(fs.readFileSync(here(f), "utf8")); } catch (e) { return {}; } };

// — plays per artist straight from the CSV (same parse rules as build-data, minimal) —
const csv = fs.readFileSync(here("fuadex.csv"), "utf8");
const plays = new Map();
let pos = 0, header = true;
while (pos < csv.length) {
  let nl = csv.indexOf("\n", pos); if (nl < 0) nl = csv.length;
  const line = csv.slice(pos, nl); pos = nl + 1;
  if (header) { header = false; continue; }
  if (!line) continue;
  // artist is the first field; respect a leading quote
  let artist;
  if (line[0] === '"') { const q = line.indexOf('"', 1); artist = line.slice(1, q).replace(/""/g, '"'); }
  else artist = line.slice(0, line.indexOf(","));
  if (!artist) continue;
  plays.set(artist, (plays.get(artist) || 0) + 1);
}

const CACHES = {
  tags: J("tag-cache.json"),
  stats: J("artist-stats.json"),
  origins: J("artist-origins.json"),
  bios: J("artist-bios.json"),
  mb: J("artist-mb.json"),
  aliases: J("artist-aliases.json"),
  discogs: J("discogs-cache.json"),
  dgArtist: J("discogs-artist.json"),
  spotifyId: J("spotify-cache.json"),
  spotGenres: J("spotify-genres.json"),
  audioDNA: J("audio-features.json"),
};
const names = Object.keys(CACHES);
const hasIt = (c, name, key) => {
  const v = c[name];
  if (v === undefined || v === null) return false;
  if (key === "spotifyId") return !!(v && v.id);           // an entry without an id = failed resolution
  if (key === "stats") return !!(v && (v.listeners || v.mbid));
  return true;
};

const BANDS = [[1000, "1000+"], [300, "300–999"], [100, "100–299"], [30, "30–99"], [5, "5–29"], [1, "1–4"]];
const bandOf = (p) => BANDS.find(([min]) => p >= min);
const bands = new Map(BANDS.map(b => [b[1], { artists: 0, plays: 0, cov: Object.fromEntries(names.map(n => [n, 0])) }]));
const offenders = Object.fromEntries(names.map(n => [n, []]));

for (const [artist, p] of plays) {
  const b = bands.get(bandOf(p)[1]);
  b.artists++; b.plays += p;
  let covered = 0;
  for (const n of names) {
    if (hasIt(CACHES[n], artist, n)) { b.cov[n]++; covered++; }
    else if (p >= 30) offenders[n].push([artist, p]);
  }
  if (p >= 100 && covered <= 3) offenders.__broken = offenders.__broken || [], offenders.__broken.push([artist, p, covered]);
}

console.log("plays-band     artists   plays   " + names.map(n => n.padStart(10)).join(""));
for (const [label, b] of bands) {
  const pct = (n) => b.artists ? String(Math.round(b.cov[n] / b.artists * 100)).padStart(9) + "%" : "        —";
  console.log(label.padEnd(12) + String(b.artists).padStart(8) + String(b.plays).padStart(9) + "  " + names.map(pct).join(""));
}
console.log("\n— HEAD GAPS: well-played artists (≥30 plays) missing each cache (top 12 by plays) —");
for (const n of names) {
  const top = offenders[n].sort((a, b) => b[1] - a[1]).slice(0, 12);
  if (!top.length) { console.log(`${n}: complete ≥30 plays`); continue; }
  console.log(`${n} (${offenders[n].length} missing): ` + top.map(([a, p]) => `${a}[${p}]`).join(" · "));
}
if (offenders.__broken) {
  console.log("\n— EFFECTIVELY UNENRICHED with 100+ plays (≤3 caches) —");
  for (const [a, p, c] of offenders.__broken.sort((x, y) => y[1] - x[1]).slice(0, 20)) console.log(`  ${a} — ${p} plays, ${c} caches`);
}

if (process.argv.includes("--csv")) {
  const rows = [["artist", "plays", ...names].join(",")];
  for (const [artist, p] of [...plays.entries()].sort((a, b) => b[1] - a[1])) {
    if (p < 5) break;
    rows.push([JSON.stringify(artist), p, ...names.map(n => hasIt(CACHES[n], artist, n) ? 1 : 0)].join(","));
  }
  fs.writeFileSync(here("enrich-coverage.csv"), rows.join("\n"));
  console.log(`\nenrich-coverage.csv written (${rows.length - 1} artists ≥5 plays)`);
}
