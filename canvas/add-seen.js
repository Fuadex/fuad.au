// add-seen.js — append REVIEWED seen-works to artworks.js (free-recall additions, PIPELINE step 2, at list scale).
// Input: a JSON array of entries, each { title, artist, qid, year, seenAt, seenConfidence, ...optional }.
//   Optional: id, artistId, qidTrusted (default true), img (pseudo-qid works: the holder image), via, exhibition,
//   floored / liked, note, noResolve.
// Rules: refuses an id or a qid already in the canon (or twice in the input); derives id = slug(artist + title) and
//   artistId = the canon's existing id for that artist name, else slug(artist); a pseudo-qid (e.g. "bm-…", "met-…") must
//   carry `img`. Appends one compact JSON line per entry before the array's closing "];" — never re-emits the store.
// Usage: node add-seen.js <entries.json>            DRY RUN (prints what it would add)
//        node add-seen.js <entries.json> --write    writes artworks.js
// After a write, run the derived-store chain in PIPELINE.md (fetch-art, fetch-holders, palette, museum data/highlights).
const fs = require("fs"), path = require("path");
const FILE = path.join(__dirname, "artworks.js");
const input = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const WRITE = process.argv.includes("--write");
const src = fs.readFileSync(FILE, "utf8");
global.window = {}; eval(src);
const A = window.CANVAS_ARTWORKS;
const slug = s => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase()
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/, "");
const ids = new Set(A.map(w => w.id)), qids = new Set(A.map(w => w.qid).filter(Boolean));
const artistIdByName = {};
for (const w of A) if (w.artist && w.artistId && !artistIdByName[w.artist]) artistIdByName[w.artist] = w.artistId;
const out = [], problems = [];
for (const e of input) {
  for (const k of ["title", "artist", "seenAt", "seenConfidence"]) if (!e[k]) problems.push(`missing ${k}: ${JSON.stringify(e).slice(0, 120)}`);
  if (!["sure", "probably", "unsure"].includes(e.seenConfidence)) problems.push(`bad seenConfidence on ${e.title}`);
  const pseudo = e.qid && !/^Q\d+$/.test(e.qid);
  if (pseudo && !e.img) problems.push(`pseudo-qid ${e.qid} without img: ${e.title}`);
  if (e.qid && qids.has(e.qid)) { problems.push(`qid already in canon or input: ${e.qid} (${e.title})`); continue; }
  let id = e.id || slug(e.artist + " " + e.title), n = 2;
  while (ids.has(id)) id = (e.id || slug(e.artist + " " + e.title)) + "-" + n++;
  const row = { id, title: e.title, artist: e.artist, artistId: e.artistId || artistIdByName[e.artist] || slug(e.artist) };
  if (e.qid) { row.qid = e.qid; row.qidTrusted = e.qidTrusted !== false; }
  if (e.img) row.img = e.img;
  if (e.year != null) row.year = e.year;
  row.seenAt = e.seenAt;
  if (e.via) row.via = e.via;
  if (e.exhibition) row.exhibition = e.exhibition;
  row.seenConfidence = e.seenConfidence;
  if (e.floored) row.floored = true; else if (e.liked) row.liked = true;
  if (e.noResolve) row.noResolve = true;
  if (e.note) row.note = e.note;
  ids.add(id); if (e.qid) qids.add(e.qid);
  out.push(row);
}
if (problems.length) { console.log("PROBLEMS (" + problems.length + "):\n  " + problems.join("\n  ")); }
console.log(`${out.length} to add (${out.filter(r => r.floored).length} floored)`);
for (const r of out) console.log(`  + ${r.id}  [${r.seenConfidence}${r.floored ? ", floored" : ""}] ${r.qid || "(no qid)"}`);
if (!WRITE) { console.log("\nDRY RUN — add --write to apply."); process.exit(problems.length ? 1 : 0); }
if (problems.some(p => !p.startsWith("qid already"))) { console.log("\nrefusing to write with problems above"); process.exit(1); }
const end = src.lastIndexOf("\n];", src.indexOf("window.CANVAS_AFFINITY") > 0 ? src.indexOf("window.CANVAS_AFFINITY") : src.length);
if (end < 0) throw new Error("array end not found");
const before = src.slice(0, end).replace(/\s*$/, "");
const lines = out.map(r => JSON.stringify(r)).join(",\n");
const next = before + (before.endsWith(",") ? "\n" : ",\n") + lines + src.slice(end);
global.window = {}; eval(next);
if (window.CANVAS_ARTWORKS.length !== A.length + out.length) throw new Error("round-trip count mismatch");
fs.writeFileSync(FILE, next, "utf8");
console.log(`\nwrote ${out.length}; artworks ${A.length} -> ${window.CANVAS_ARTWORKS.length}`);
