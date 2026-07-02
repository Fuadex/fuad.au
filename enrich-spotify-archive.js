// enrich-spotify-archive.js — pull album covers, artist images and Spotify genres for OUR artists
// out of the a local dataset Spotify metadata dump, WITHOUT unpacking the whole large archive.
//
// The bash driver streams the needed parquets out of archive.zip (`unzip -p`) into ../.sptmp, then
// runs THIS script (DuckDB — columnar, low RAM), then deletes them. Tables link by integer rowids:
//   artists(rowid,id,name,followers_total,popularity) · artist_albums(artist_rowid,album_rowid,is_appears_on)
//   albums(rowid,name,album_type,release_date,label) · album_images(album_rowid,width,url)
//   artist_images(artist_rowid,width,url) · artist_genres(artist_rowid,genre)
//
// Run (parquets must already be in ../.sptmp):  NODE_PATH=../.dtmp/node_modules node enrich-spotify-archive.js
// Out: spotify-albumart.json {artistSlug~titleSlug: url} · spotify-genres.json {name:[genre]}
//      spotify-artist-img.json {name: url}   (all small, committed; parquets never persist)

const fs = require("fs"), path = require("path"), vm = require("vm");
const duckdb = require("duckdb");

const ROOT = __dirname, TMP = path.join(ROOT, "..", ".sptmp");
const P = (f) => `read_parquet('${path.join(TMP, f + ".parquet").replace(/\\/g, "/")}')`;
const OURS = `read_json_auto('${path.join(TMP, "ours.json").replace(/\\/g, "/")}')`;

const slug = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/\(.*?\)|\[.*?\]/g, "").replace(/\b(deluxe|remaster(ed)?|expanded|edition|anniversary|mono|stereo|bonus)\b/g, "")
  .replace(/[^a-z0-9]+/g, "");

const SPOT = JSON.parse(fs.readFileSync(path.join(ROOT, "spotify-cache.json"), "utf8"));
const ours = Object.entries(SPOT).filter(([, v]) => v && v.id).map(([name, v]) => ({ name, sid: v.id }));
const ctx = { window: {}, console: { log() {}, error() {} } };
vm.runInNewContext(fs.readFileSync(path.join(ROOT, "media-index.js"), "utf8"), ctx);
const MEDIA = ctx.window.ROTATION_MEDIA;
const ourAlbums = new Map();  // artistName → [{title, n:normalised}]
for (const a of MEDIA.albums) { const artist = MEDIA.artists[a[1]], title = a[0]; if (!ourAlbums.has(artist)) ourAlbums.set(artist, []); ourAlbums.get(artist).push({ title, n: norm(title) }); }
fs.mkdirSync(TMP, { recursive: true });
fs.writeFileSync(path.join(TMP, "ours.json"), JSON.stringify(ours));
console.log(`${ours.length} artists with a Spotify id · ${MEDIA.albums.length} albums to match against`);

const db = new duckdb.Database(":memory:");
const run = (sql) => new Promise((res, rej) => db.all(sql, (e, r) => e ? rej(e) : res(r)));

(async () => {
  await run(`PRAGMA memory_limit='3GB';`);
  await run(`PRAGMA temp_directory='${TMP.replace(/\\/g, "/")}';`);

  // our Spotify ids → rowids
  await run(`CREATE TABLE amap AS SELECT ar.rowid, o.name AS our_name FROM ${OURS} o JOIN ${P("artists")} ar ON ar.id = o.sid;`);
  console.log(`  matched ${(await run(`SELECT count(*) c FROM amap`))[0].c} artists to the dump`);

  // Spotify genres per artist
  const grows = await run(`SELECT m.our_name AS name, g.genre FROM amap m JOIN ${P("artist_genres")} g ON g.artist_rowid = m.rowid`);
  const genres = {}; for (const r of grows) (genres[r.name] || (genres[r.name] = [])).push(r.genre);
  fs.writeFileSync(path.join(ROOT, "spotify-genres.json"), JSON.stringify(genres));
  console.log(`spotify-genres.json: ${Object.keys(genres).length} artists`);

  // artist images (640px)
  const irows = await run(`SELECT m.our_name AS name, i.url FROM amap m JOIN ${P("artist_images")} i ON i.artist_rowid = m.rowid AND i.width = 640`);
  const imgs = {}; for (const r of irows) if (!imgs[r.name]) imgs[r.name] = r.url;
  fs.writeFileSync(path.join(ROOT, "spotify-artist-img.json"), JSON.stringify(imgs));
  console.log(`spotify-artist-img.json: ${Object.keys(imgs).length} artists`);

  // album covers: our artists → their own albums → 640px cover
  await run(`CREATE TABLE alb AS SELECT m.our_name, aa.album_rowid FROM amap m JOIN ${P("artist_albums")} aa ON aa.artist_rowid = m.rowid AND aa.is_appears_on = 0;`);
  await run(`CREATE TABLE albn AS SELECT a.our_name, a.album_rowid, al.name AS album FROM alb a JOIN ${P("albums")} al ON al.rowid = a.album_rowid;`);
  const crows = await run(`SELECT n.our_name AS name, n.album, img.url FROM albn n JOIN ${P("album_images")} img ON img.album_rowid = n.album_rowid AND img.width = 640`);

  const spotByArtist = new Map();  // name → Map(normAlbum → url)
  for (const r of crows) { if (!spotByArtist.has(r.name)) spotByArtist.set(r.name, new Map()); const m = spotByArtist.get(r.name); const k = norm(r.album); if (!m.has(k)) m.set(k, r.url); }
  const art = {}; let matched = 0, total = 0;
  for (const [artist, list] of ourAlbums) { const sm = spotByArtist.get(artist); for (const al of list) { total++; if (sm && sm.get(al.n)) { art[slug(artist) + "~" + slug(al.title)] = sm.get(al.n); matched++; } } }
  fs.writeFileSync(path.join(ROOT, "spotify-albumart.json"), JSON.stringify(art));
  console.log(`spotify-albumart.json: matched ${matched}/${total} albums (${(matched / total * 100).toFixed(0)}%)`);
  process.exit(0);
})().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
