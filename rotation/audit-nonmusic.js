// audit-nonmusic.js — flag non-music entries that have crept into the corpus: comedy specials,
// podcasts, audiobooks, spoken word. Scrobbling from Spotify picks these up and they then sit in
// Explore and the genre maps as if they were bands (Fuad spotted Ricky Gervais, 2026-08-31).
//
//   node audit-nonmusic.js            report
//   node audit-nonmusic.js --all      also list the single-signal tier and what is already excluded
//
// PRINTS ONLY. It never edits folds.json — removing an artist is a judgement call and some of the
// hits are false positives worth keeping (Tenacious D is comedy rock but a real band; Kitty is a
// cloud-rap artist Spotify mis-tagged "comedy"; Brendon Small's Galaktikon is an actual metal
// record). Act on it by hand: add confirmed names to _exclude in folds.json, which drops them at
// ingest so they never reach plays, Explore or search.
//
// Strongest signal is Discogs' own "Non-Music" top-level GENRE, which covers comedy, spoken word,
// audiobooks and interviews. It is only trusted when it OUTWEIGHS that artist's music genres, so a
// band with one spoken-word release does not trip it. Two independent signals are required to be
// listed as a candidate — a single tag is too weak, as the false positives above show.
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = __dirname;
const J = (f) => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, f), "utf8")); } catch (e) { return {}; } };
const ALL = process.argv.includes("--all");

const ctx = { window: {}, console: { log() {}, error() {} } };
vm.createContext(ctx);
for (const f of ["music-core.js", "music-rest.js"]) vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx);
const R = ctx.window.ROTATION;
if (!R || !R.ARTISTS) { console.error("music-core.js / music-rest.js not built — run build-data.js first"); process.exit(1); }

const TAGS = J("tag-cache.json"), DIS = J("discogs-cache.json");
const SG = { ...J("spotify-genres-extra.json"), ...J("spotify-genres.json") };
const folds = J("folds.json");
const already = new Set(folds._exclude || []);

const NONMUSIC_TAG = /^(comedy|stand-?up( comedy)?|podcast|audiobook|audio book|spoken word|spoken-word|humou?r|interview|asmr|meditation|white noise|sleep|radio|talk|news|motivational|self-help|documentary|lecture)$/i;
const NONMUSIC_STYLE = /^(comedy|spoken word|audiobook|interview|dialogue|monolog(ue)?|radioplay|poetry|education|speech|field recording|sermon|political|story)$/i;

const all = [...R.ARTISTS.map(a => ({ ...a, tier: "kept" })), ...R.EXPLORE.map(a => ({ ...a, tier: "explore" }))];
const strong = [], weak = [];
for (const a of all) {
  if (already.has(a.name)) continue;
  const d = DIS[a.name] || {};
  const tags = ((TAGS[a.name] || {}).tags || []).map(x => x[0]);
  const styles = (d.styles || []).map(x => x[0]);
  const spot = SG[a.name] || [];
  const why = [];
  const nm = (d.genres || []).find(x => /^non-?music$/i.test(x[0]));
  const musicW = (d.genres || []).filter(x => !/^non-?music$/i.test(x[0])).reduce((s, x) => s + x[1], 0);
  if (nm && nm[1] > musicW) why.push(`discogs Non-Music ${nm[1]} vs music ${musicW}`);
  if (tags.length && NONMUSIC_TAG.test(tags[0])) why.push(`top last.fm tag "${tags[0]}"`);
  if (spot.length && spot.every(x => NONMUSIC_TAG.test(x))) why.push(`spotify [${spot.join(", ")}]`);
  if (styles.length && NONMUSIC_STYLE.test(styles[0])) why.push(`discogs style "${styles[0]}"`);
  const row = { a, why, tags: tags.slice(0, 4), styles: styles.slice(0, 4), spot: spot.slice(0, 4) };
  if (why.length >= 2) strong.push(row); else if (why.length === 1) weak.push(row);
}
const byPlays = (x, y) => (y.a.plays || 0) - (x.a.plays || 0);
strong.sort(byPlays); weak.sort(byPlays);

const show = (r) => {
  console.log(`  ${String(r.a.plays || 0).padStart(5)}p  ${r.a.name}  [${r.a.tier}]`);
  console.log(`         ${r.why.join(" · ")}`);
  console.log(`         lastfm=[${r.tags.join(", ")}] discogs=[${r.styles.join(", ")}] spotify=[${r.spot.join(", ")}]`);
};
console.log(`already excluded in folds.json: ${already.size}`);
console.log(`\nCANDIDATES — two or more independent signals (${strong.length}):`);
if (!strong.length) console.log("  none — corpus is clean");
strong.forEach(show);
console.log(`\nsingle-signal tier: ${weak.length}${ALL ? "" : "  (run with --all to list — expect false positives)"}`);
if (ALL) weak.slice(0, 40).forEach(show);
console.log(`\nTo act: add a confirmed name to "_exclude" in folds.json, then rebuild.`);
