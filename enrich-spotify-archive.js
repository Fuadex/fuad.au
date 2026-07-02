// enrich-spotify-archive.js — pull album covers + album metadata (release date / label / type),
// artist images and Spotify genres for OUR artists out of the Anna's Archive Spotify dump, WITHOUT
// unpacking the 148GB archive. The bash driver streams the needed parquets into ../.sptmp; this
// script queries them with DuckDB, caches the raw album join, and matches to our own album titles.
//
//   NODE_PATH=../.dtmp/node_modules node enrich-spotify-archive.js            (full: needs parquets extracted)
//   NODE_PATH=../.dtmp/node_modules node enrich-spotify-archive.js --rematch  (cheap: re-match from the raw cache)
//
// Out: spotify-albumart.json {artistSlug~titleSlug: url} · spotify-albummeta.json {key:[year,typeChar,label]}
//      spotify-genres.json {name:[genre]} · spotify-artist-img.json {name: url}
// Tables link by integer rowids: artists(rowid,id,name) · artist_albums(artist_rowid,album_rowid,is_appears_on)
//   albums(rowid,name,album_type,release_date,label) · album_images(album_rowid,width,url) · artist_(images|genres)

const fs = require("fs"), path = require("path"), vm = require("vm");

const ROOT = __dirname, TMP = path.join(ROOT, "..", ".sptmp");
const RAW = path.join(TMP, "albums-raw.json");
const REMATCH = process.argv.includes("--rematch");
const P = (f) => `read_parquet('${path.join(TMP, f + ".parquet").replace(/\\/g, "/")}')`;
const OURS = `read_json_auto('${path.join(TMP, "ours.json").replace(/\\/g, "/")}')`;
const has = (f) => fs.existsSync(path.join(TMP, f + ".parquet"));

const slug = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
// symmetric normaliser: drops bracketed/qualifier noise, disc/vol numbers, a leading "YYYY - " and a
// leading "the ", so "2007 - Elect The Dead" ≡ "Elect the Dead" and "The Burning Red" ≡ "Burning Red".
const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/\(.*?\)|\[.*?\]/g, "")
  .replace(/\b(deluxe|remaster(ed)?|expanded|edition|anniversary|mono|stereo|bonus|explicit|version|remix|reissue)\b/g, "")
  .replace(/\b(disc|cd|disk|pt|part|vol|volume)\s*\d+\b/g, "")
  .replace(/^\s*\d{4}\s*[-–—]\s*/, "").replace(/^\s*the\s+/, "")
  .replace(/[^a-z0-9]+/g, "");

const SPOT = JSON.parse(fs.readFileSync(path.join(ROOT, "spotify-cache.json"), "utf8"));
const ours = Object.entries(SPOT).filter(([, v]) => v && v.id).map(([name, v]) => ({ name, sid: v.id }));
const ctx = { window: {}, console: { log() {}, error() {} } };
vm.runInNewContext(fs.readFileSync(path.join(ROOT, "media-index.js"), "utf8"), ctx);
const MEDIA = ctx.window.ROTATION_MEDIA;
const ourAlbums = new Map();  // artistName → [{title, n:normalised}]
for (const a of MEDIA.albums) { const artist = MEDIA.artists[a[1]], title = a[0]; if (!ourAlbums.has(artist)) ourAlbums.set(artist, []); ourAlbums.get(artist).push({ title, n: norm(title) }); }

// match a raw album join ([{name(artist), album, type, rel, label, url}]) to our own titles
function match(crows) {
  const byArtist = new Map();
  for (const r of crows) {
    if (!byArtist.has(r.name)) byArtist.set(r.name, new Map());
    const m = byArtist.get(r.name), k = norm(r.album), prev = m.get(k);
    if (!prev || (r.type === "album" && prev.type !== "album")) m.set(k, { url: r.url, y: (r.rel || "").slice(0, 4), type: r.type, label: r.label || "" });  // prefer the LP over singles/comps
  }
  const art = {}, meta = {}; let matched = 0, total = 0;
  for (const [artist, list] of ourAlbums) { const sm = byArtist.get(artist); for (const al of list) { total++; const hit = sm && sm.get(al.n); if (hit) { const key = slug(artist) + "~" + slug(al.title); if (hit.url) art[key] = hit.url; meta[key] = [+hit.y || 0, hit.type === "album" ? "a" : hit.type === "single" ? "s" : hit.type === "compilation" ? "c" : "", hit.label]; matched++; } } }
  fs.writeFileSync(path.join(ROOT, "spotify-albumart.json"), JSON.stringify(art));
  fs.writeFileSync(path.join(ROOT, "spotify-albummeta.json"), JSON.stringify(meta));
  console.log(`spotify-albumart.json + spotify-albummeta.json: matched ${matched}/${total} albums`);
}

if (REMATCH) {
  console.log("re-matching from cached raw join…");
  match(JSON.parse(fs.readFileSync(RAW, "utf8")));
  process.exit(0);
}

const duckdb = require("duckdb");
const db = new duckdb.Database(":memory:");
const run = (sql) => new Promise((res, rej) => db.all(sql, (e, r) => e ? rej(e) : res(r)));
fs.mkdirSync(TMP, { recursive: true });
fs.writeFileSync(path.join(TMP, "ours.json"), JSON.stringify(ours));
console.log(`${ours.length} artists with a Spotify id · ${MEDIA.albums.length} albums to match`);

(async () => {
  await run(`PRAGMA memory_limit='3GB';`);
  await run(`PRAGMA temp_directory='${TMP.replace(/\\/g, "/")}';`);
  await run(`CREATE TABLE amap AS SELECT ar.rowid, o.name AS our_name FROM ${OURS} o JOIN ${P("artists")} ar ON ar.id = o.sid;`);
  console.log(`  matched ${(await run(`SELECT count(*) c FROM amap`))[0].c} artists to the dump`);

  if (has("artist_genres")) {
    const g = await run(`SELECT m.our_name AS name, gg.genre FROM amap m JOIN ${P("artist_genres")} gg ON gg.artist_rowid = m.rowid`);
    const genres = {}; for (const r of g) (genres[r.name] || (genres[r.name] = [])).push(r.genre);
    fs.writeFileSync(path.join(ROOT, "spotify-genres.json"), JSON.stringify(genres));
    console.log(`spotify-genres.json: ${Object.keys(genres).length} artists`);
  }
  if (has("artist_images")) {
    const im = await run(`SELECT m.our_name AS name, i.url FROM amap m JOIN ${P("artist_images")} i ON i.artist_rowid = m.rowid AND i.width = 640`);
    const imgs = {}; for (const r of im) if (!imgs[r.name]) imgs[r.name] = r.url;
    fs.writeFileSync(path.join(ROOT, "spotify-artist-img.json"), JSON.stringify(imgs));
    console.log(`spotify-artist-img.json: ${Object.keys(imgs).length} artists`);
  }

  await run(`CREATE TABLE alb AS SELECT m.our_name, aa.album_rowid FROM amap m JOIN ${P("artist_albums")} aa ON aa.artist_rowid = m.rowid AND aa.is_appears_on = 0;`);
  await run(`CREATE TABLE albn AS SELECT a.our_name, a.album_rowid, al.name AS album, al.album_type AS type, al.release_date AS rel, al.label FROM alb a JOIN ${P("albums")} al ON al.rowid = a.album_rowid;`);
  const crows = await run(`SELECT n.our_name AS name, n.album, n.type, n.rel, n.label, img.url FROM albn n JOIN ${P("album_images")} img ON img.album_rowid = n.album_rowid AND img.width = 640`);
  fs.writeFileSync(RAW, JSON.stringify(crows));   // cache for cheap --rematch later
  console.log(`raw album join cached: ${crows.length} rows`);
  match(crows);
  process.exit(0);
})().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
