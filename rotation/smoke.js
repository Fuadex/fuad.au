// smoke.js — post-build sanity gate for CI. Fails loudly if the dataset the app boots from is
// broken, so a bad build never reaches Pages. Run AFTER build-data.js (+ sync-live.js).
const fs = require("fs"), vm = require("vm"), path = require("path");
const here = (f) => path.join(__dirname, f);
let failed = 0;
const ok = (cond, msg) => { if (cond) console.log("  ok  " + msg); else { console.error("  FAIL " + msg); failed++; } };

// 1) music-core.js + music-rest.js evaluate and, merged, carry every key the views consume.
//    (The runtime loads core eagerly and injects rest after first paint; evaluating both in one
//    context reconstitutes the full window.ROTATION, since rest Object.assigns into it.)
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(here("music-core.js"), "utf8"), ctx, { filename: "music-core.js" });
const core = ctx.window.ROTATION;
ok(!!core, "music-core.js evaluates → window.ROTATION");
ok(core && core._restLoaded === false && core.EXPLORE.length === 0 && core.EXPLORE_N > 0,
  "core paints alone: rest stubbed empty, EXPLORE_N present");
vm.runInContext(fs.readFileSync(here("music-rest.js"), "utf8"), ctx, { filename: "music-rest.js" });
const R = ctx.window.ROTATION;
ok(!!R && R._restLoaded === true, "music-rest.js merges → _restLoaded");
// artist-x.js — the twelve heavy per-artist fields, split out of music-rest by the 2026-09-22
// audit (B1). Evaluating it in the SAME context merges them onto the records core built, which is
// exactly what the artist page and the map band do at runtime — so a node consumer reconstitutes
// a full record by evaluating the three files in order. The BEFORE check is the one that matters:
// it is what proves the 879 KB gz actually left the every-route payload.
{
  const before = R.ARTISTS.filter(a => a.topAlbums != null).length;
  ok(before === 0, `core+rest alone carry NO heavy per-artist fields (${before} of ${R.ARTISTS.length} with topAlbums — want 0)`);
  vm.runInContext(fs.readFileSync(here("artist-x.js"), "utf8"), ctx, { filename: "artist-x.js" });
  ok(R._artistXLoaded === true, "artist-x.js merges → _artistXLoaded");
  const after = R.ARTISTS.filter(a => a.topAlbums && a.topAlbums.length).length;
  ok(after > 200, `artist-x.js folds the heavy fields onto the core records (${after} artists carry topAlbums)`);
  ok(R.ARTISTS.some(a => a.bio) && R.ARTISTS.some(a => a.origin) && R.ARTISTS.some(a => a.similarNames),
    "bio / origin / similarNames present on kept records after artist-x");
}
for (const k of ["ARTISTS", "ALBUMS", "TRACKS", "GENRES", "YEARS", "TOTALS", "INSIGHTS", "EXPLORE", "SUBS",
  "FAMILIES", "CLOCK", "CLOCK_BY_YEAR", "ARTIST_CLOCK", "SUB_ARTISTS", "AUDIO", "AUDIO_DIST", "GENRE_FLOW",
  "THUMBS", "SPOTIMG", "TREND", "NOW", "RECENT", "ERAS"])
  ok(R && R[k] != null, "ROTATION." + k);
ok(R.ARTISTS.length >= 200, `ARTISTS kept = ${R.ARTISTS.length} (≥200)`);
ok(R.EXPLORE.length >= 3000, `EXPLORE universe = ${R.EXPLORE.length} (≥3000)`);
ok(R.TOTALS.scrobbles > 300000, `scrobbles = ${R.TOTALS.scrobbles}`);
ok(typeof R.slug === "function" && typeof R.idForName === "function" && typeof R.played === "function", "runtime helpers (slug/idForName/played)");

// 2) live snapshot evaluates
const lctx = { window: {} };
vm.createContext(lctx);
vm.runInContext(fs.readFileSync(here("live-data.js"), "utf8"), lctx, { filename: "live-data.js" });
ok(lctx.window.ROTATION_LIVE && lctx.window.ROTATION_LIVE.total > 0, "live-data.js evaluates, total > 0");

// 3) every lazy generated file exists, is non-trivial, and parses as JS
for (const [f, min] of [["media-index.js", 3000], ["track-audio.js", 1000], ["track-previews.js", 500], ["artist-flow.js", 1000],
  ["artist-detail.js", 500], ["artist-x.js", 1000], ["calendar.js", 50], ["calendar-detail.js", 500], ["geo-detail.js", 100],
  ["search-index.js", 100], ["world-map.js", 50], ["day-series.js", 5]]) {
  const p = here(f);
  const exists = fs.existsSync(p);
  ok(exists && fs.statSync(p).size > min * 1024, `${f} exists, > ${min} KB`);
  if (exists) {
    const c2 = { window: {} }; vm.createContext(c2);
    try { vm.runInContext(fs.readFileSync(p, "utf8"), c2, { filename: f }); ok(true, f + " evaluates"); }
    catch (e) { ok(false, f + " evaluates: " + e.message); }
  }
}

// ─── stray backticks inside <style> template literals ───
// This has now bitten twice, and Babel cannot catch it: a backtick in a CSS comment closes the
// template early and everything after it still parses as valid JavaScript, so the file compiles
// clean and throws at runtime instead. Gigs shipped broken this way (2026-08-20, "title is not
// defined" — a comment had written .r-title .dot wrapped in backticks). Cheap to check, so check it.
for (const f of fs.readdirSync(__dirname).filter(n => n.endsWith(".jsx"))) {
  const lines = fs.readFileSync(here(f), "utf8").split("\n");
  let inStyle = false; const hits = [];
  lines.forEach((ln, i) => {
    if (/<style>\{`/.test(ln)) { inStyle = true; return; }
    if (inStyle && /`\}<\/style>/.test(ln)) { inStyle = false; return; }
    if (inStyle && ln.includes("`")) hits.push(i + 1);
  });
  ok(hits.length === 0, f + " — no stray backticks in <style> blocks" + (hits.length ? " (lines " + hits.join(", ") + ")" : ""));
}

console.log(failed ? `\nSMOKE FAILED: ${failed} check(s)` : "\nsmoke: all green");
process.exit(failed ? 1 : 0);
