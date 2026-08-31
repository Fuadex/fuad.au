// enrich-disc-numbers.js — recover the DISC NUMBER for tracks on multi-disc records.
//
//   NODE_PATH=../.dtmp/node_modules node enrich-disc-numbers.js
//
// Out: spotify-disc-numbers.json { "artistSlug~trackSlug": disc }  — TRACKED, like its siblings
//      spotify-track-data.json and mb-releases.json. It is derived from a local archive that CI has
//      no access to, so the OUTPUT is committed and the build only ever reads it.
//      Only tracks on records with 2+ discs are emitted; disc 1 is implied by absence.
//
// WHY (Fuad, 2026-09-01: "The Fragile album needs to be properly split into CD1 and 2").
// The Fragile's 23 tracks all carried per-disc positions — 1..12 then 1..11 — rendered as ONE flat
// list, so every number from 1 to 11 appeared twice. It reads as a scrambled tracklist rather than
// a double album.
//
// The cause is upstream of the UI. Track numbers come from one of two places, and NEITHER carries
// the disc:
//   * mb-releases.json, when MusicBrainz has a tracklist. It does not for The Fragile — the only
//     Fragile key there is thefragiledeviations1. (Its `discs` array also mixes true discs with
//     alternate EDITIONS, so its index cannot be read as a disc number either.)
//   * spotify-track-data.json otherwise, whose trackNo comes from the dump's tracks.track_number.
//     Spotify stores disc_number as a SEPARATE field, and the extraction never took it.
//
// The estate-wide count is 141 albums showing 3+ duplicated positions, so this is a general defect
// that The Fragile merely made obvious.
//
// SOURCE. Not the tracks parquet — that one is not extracted, and pulling it means unpacking the
// large archive again. spotify-huge-audio-features.parquet is already local and already carries
// disc_number, plus artist_name / album_name / track_name, so it joins on NAMES with no extraction
// step at all. That is the same file the BPM migration used.
//
// MATCHING is deliberately narrow. A disc number is only trusted when the (artist, album) pair
// agrees with ours and that release genuinely reports more than one disc. Everything else is left
// alone: a wrong disc number would split a single-disc album in half on screen, which is a louder
// failure than the duplicate numbering it replaces.

const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = __dirname;
const HUGE = path.join(ROOT, "spotify-huge-audio-features.parquet").replace(/\\/g, "/");
if (!fs.existsSync(HUGE)) { console.error("spotify-huge-audio-features.parquet not found — nothing to do"); process.exit(1); }

// slug MUST match build-data.js exactly (incl. hash fallback) so keys line up with the build.
const _slugHash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = (((h << 5) + h) ^ s.charCodeAt(i)) >>> 0; return h.toString(36); };
const slug = (s) => { const t = (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); return t || ("a-" + _slugHash(s || "x").slice(0, 7)); };
const CJK = "ぁ-んァ-ヶ一-龠";
const norm = (s) => (s || "").toLowerCase().replace(new RegExp("[^a-z0-9" + CJK + "]", "gu"), "");
const NRM = (c) => "regexp_replace(lower(" + c + "), '[^a-z0-9" + CJK + "]', '', 'g')";

const ctx = { window: {}, console: { log() {}, error() {} } };
vm.runInNewContext(fs.readFileSync(path.join(ROOT, "media-index.js"), "utf8"), ctx);
const MEDIA = ctx.window.ROTATION_MEDIA;

// our (artist, album, track) triples — only tracks that actually sit on an album row
const ourset = [], seen = new Set();
for (const t of MEDIA.tracks) {
  if (!(t[3] >= 0)) continue;
  const artist = MEDIA.artists[t[1]], album = MEDIA.albums[t[3]][0], title = t[0];
  const key = slug(artist) + "~" + slug(title);
  if (seen.has(key)) continue; seen.add(key);
  ourset.push({ a: norm(artist), b: norm(album), n: norm(title), key });
}
console.log(`${ourset.length} (artist, album, track) triples to look up`);

const duckdb = require("duckdb");
const db = new duckdb.Database(":memory:");
const run = (sql) => new Promise((res, rej) => db.all(sql, (e, r) => e ? rej(e) : res(r)));
const TMP = path.join(ROOT, "..", ".sptmp");
fs.mkdirSync(TMP, { recursive: true });
const OURSET_PATH = path.join(TMP, "ourset-disc.json").replace(/\\/g, "/");
fs.writeFileSync(OURSET_PATH, JSON.stringify(ourset));

(async () => {
  await run(`PRAGMA memory_limit='48GB';`);
  await run(`PRAGMA temp_directory='${TMP.replace(/\\/g, "/")}';`);
  await run(`SET preserve_insertion_order=false;`);
  await run(`CREATE TABLE ourset AS SELECT * FROM read_json_auto('${OURSET_PATH}');`);

  // Stage 1 — the normalised (artist, album) pairs we care about, and how many discs the dump says
  // each has. Restricting by artist first keeps the scan of a 4 GB file bounded.
  console.log("stage 1: counting discs per record…");
  await run(`
    CREATE TABLE recs AS
    SELECT ${NRM("h.artist_name")} AS a, ${NRM("h.album_name")} AS b, max(h.disc_number) AS ndisc
    FROM read_parquet('${HUGE}') h
    WHERE ${NRM("h.artist_name")} IN (SELECT DISTINCT a FROM ourset)
    GROUP BY 1, 2;`);
  const multi = (await run(`SELECT count(*) c FROM recs WHERE ndisc > 1`))[0].c;
  console.log(`  ${multi} multi-disc records in the dump under our artists`);

  // Stage 2 — disc number per track, ONLY on records the dump reports as multi-disc AND that we own.
  console.log("stage 2: resolving disc numbers for our tracks…");
  const rows = await run(`
    SELECT o.key AS key, min(h.disc_number) AS disc
    FROM read_parquet('${HUGE}') h
    JOIN recs r ON r.a = ${NRM("h.artist_name")} AND r.b = ${NRM("h.album_name")} AND r.ndisc > 1
    JOIN ourset o ON o.a = r.a AND o.b = r.b AND o.n = ${NRM("h.track_name")}
    GROUP BY 1;`);

  const out = {};
  for (const r of rows) { const d = Number(r.disc); if (d > 1) out[r.key] = d; }
  fs.writeFileSync(path.join(ROOT, "spotify-disc-numbers.json"), JSON.stringify(out));
  const albums = new Set(rows.map(r => String(r.key).split("~")[0]));
  console.log(`matched ${rows.length} tracks on multi-disc records · ${Object.keys(out).length} sit on disc 2+ · ${albums.size} artists`);
  console.log("wrote spotify-disc-numbers.json");
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
