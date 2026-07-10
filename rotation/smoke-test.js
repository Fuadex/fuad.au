// smoke-test.js — invariant checks that run in CI AFTER build-data.js and BEFORE deploy.
// Purpose: convert the silent-failure class (key mismatches, empty emits, slug drift) into
// a red deploy. Keep it fast (<5s) and dependency-free. Run: node smoke-test.js
//
// If a check here fails, the deploy is BLOCKED — that is the point. Fix the data/code,
// don't loosen the check without understanding why it fired.

const fs = require("fs");
const path = require("path");
const { slug, _slugHash } = require("./lib-slug");

let failures = 0;
const ok = (cond, msg) => {
  if (cond) { console.log("  ✓ " + msg); }
  else { failures++; console.error("  ✗ FAIL: " + msg); }
};

// load an emitted data file into a sandboxed window and return it
function loadGlobal(file, name) {
  const p = path.join(__dirname, file);
  if (!fs.existsSync(p)) return { missing: true };
  const w = {};
  try {
    const code = fs.readFileSync(p, "utf8").replace(/^﻿/, "");
    new Function("window", code)(w);
    return { value: w[name] };
  } catch (e) { return { error: e.message }; }
}

console.log("── slug invariants (lib-slug.js ↔ frontend R.slug contract)");
ok(slug("Nine Inch Nails") === "nine-inch-nails", "ascii slug basic");
ok(slug("ミドリ") === "a-" + _slugHash("ミドリ").slice(0, 7), "CJK falls back to hash slug");
ok(slug("ミドリ") !== "" && slug("ミドリ").startsWith("a-"), "CJK slug non-empty (a-…)");
ok(slug("ミドリ") === "a-2yw9ix", "ミドリ → a-2yw9ix (frozen: R.slug + all committed keys depend on it)");
ok(slug("!!!") !== slug("???"), "distinct non-latin inputs get distinct slugs");
ok(slug("AC/DC") === "ac-dc", "punctuation collapses to single dash");

console.log("── emitted files parse + globals defined (post build-data.js)");
const emits = [
  ["music-core.js", "ROTATION"],
  ["media-index.js", "ROTATION_MEDIA"],
  ["search-index.js", "ROTATION_SEARCH"],
];
const loaded = {};
for (const [file, g] of emits) {
  const r = loadGlobal(file, g);
  if (r.missing) { ok(false, `${file} exists`); continue; }
  ok(!r.error, `${file} parses${r.error ? " — " + r.error : ""}`);
  ok(r.value !== undefined, `${file} defines window.${g}`);
  loaded[g] = r.value;
}
// music-rest.js merges into window.ROTATION (deferred payload) — must parse and flip the flag
{
  const p = path.join(__dirname, "music-rest.js");
  if (!fs.existsSync(p)) ok(false, "music-rest.js exists");
  else {
    const w = { ROTATION: loaded.ROTATION || {} };
    try {
      new Function("window", fs.readFileSync(p, "utf8"))(w);
      ok(w.ROTATION && w.ROTATION.EXPLORE && w.ROTATION.EXPLORE.length > 1000,
        `music-rest merges EXPLORE into ROTATION (${w.ROTATION.EXPLORE && w.ROTATION.EXPLORE.length} artists)`);
    } catch (e) { ok(false, "music-rest.js parses — " + e.message); }
  }
}

console.log("── committed key files join against the slug contract");
const about = loadGlobal("llm-about.js", "ROTATION_LLM_ABOUT").value;
if (about) {
  const keys = Object.keys(about);
  const bad = keys.filter(k => { const i = k.indexOf("~"); return i <= 0 || i === k.length - 1; });
  ok(bad.length === 0, `llm-about: every key is artist~track with both sides non-empty (${keys.length} keys${bad.length ? ", bad: " + bad.slice(0, 3).join(", ") : ""})`);
  ok(keys.length >= 9000, `llm-about: entry count sane (${keys.length} ≥ 9000 — guards against a truncated merge)`);
} else ok(false, "llm-about.js loads");

// ── llm-about shards + theme index (about/, produced by shard-about.js) ──
// In CI shard-about.js runs BEFORE this, so about/ exists and these checks are real. Locally,
// if a dev never ran shard-about.js, skip with a warning rather than failing (the dev fallback
// in the frontend loads the whole blob instead).
console.log("── llm-about shards + theme index (about/, from shard-about.js)");
const N_BUCKETS = 16;
const aboutBucket = (key) => {
  const artistSlug = key.slice(0, key.indexOf("~") < 0 ? key.length : key.indexOf("~"));
  const h = _slugHash(artistSlug);
  let acc = 0;
  for (let i = 0; i < h.length; i++) acc = (acc * 36 + parseInt(h[i], 36)) % N_BUCKETS;
  return acc;
};
if (!about) {
  console.warn("  ⚠ llm-about.js absent — skipping shard checks");
} else if (!fs.existsSync(path.join(__dirname, "about", "g-00.js"))) {
  console.warn("  ⚠ about/ not built (run `node shard-about.js`) — skipping shard checks");
} else {
  const srcKeys = new Set(Object.keys(about));
  // merge every gist + deep shard into one window and collect keys + verify bucketing
  const G = {}, D = {};
  let bucketBad = 0;
  for (const tier of ["g", "d"]) {
    for (let b = 0; b < N_BUCKETS; b++) {
      const bb = String(b).padStart(2, "0");
      const glob = tier === "g" ? "ROTATION_ABOUT_G" : "ROTATION_ABOUT_D";
      const r = loadGlobal(`about/${tier}-${bb}.js`, glob);
      if (r.missing) { ok(false, `about/${tier}-${bb}.js exists`); continue; }
      if (r.error) { ok(false, `about/${tier}-${bb}.js parses — ${r.error}`); continue; }
      const obj = r.value || {};
      for (const k in obj) {
        if (aboutBucket(k) !== b) bucketBad++;
        (tier === "g" ? G : D)[k] = obj[k];
      }
    }
  }
  const unionKeys = new Set([...Object.keys(G), ...Object.keys(D)]);
  const missingFromShards = [...srcKeys].filter(k => !unionKeys.has(k));
  const extraInShards = [...unionKeys].filter(k => !srcKeys.has(k));
  ok(missingFromShards.length === 0 && extraInShards.length === 0,
    `shards: gist∪deep keys === llm-about keys exactly (${unionKeys.size} keys` +
    `${missingFromShards.length ? ", missing: " + missingFromShards.slice(0, 3).join(", ") : ""}` +
    `${extraInShards.length ? ", extra: " + extraInShards.slice(0, 3).join(", ") : ""})`);
  ok(bucketBad === 0, `shards: every key sits in bucket _slugHash(artist)%16 (${bucketBad} misplaced)`);

  const idx = loadGlobal("about/index.js", "ROTATION_ABOUT_INDEX");
  if (idx.missing) ok(false, "about/index.js exists");
  else if (idx.error) ok(false, `about/index.js parses — ${idx.error}`);
  else {
    const I = idx.value;
    const tokCount = I && I.tok ? Object.keys(I.tok).length : 0;
    ok(tokCount > 5000, `theme index: >5000 tokens (${tokCount})`);
    ok(Array.isArray(I.keys) && I.keys.length === srcKeys.size,
      `theme index: keys array covers the source (${I.keys && I.keys.length} vs ${srcKeys.size})`);
    // every key referenced by the index exists in the source
    const badKeyRef = (I.keys || []).some(k => !srcKeys.has(k));
    ok(!badKeyRef, "theme index: every index key exists in llm-about");
    // spot-check: token id refs are in range and resolve to real keys
    let refBad = 0, checked = 0;
    for (const t in I.tok) { for (const id of I.tok[t]) { checked++; if (!(id >= 0 && id < I.keys.length)) refBad++; } if (checked > 20000) break; }
    ok(refBad === 0, `theme index: token→id refs in range (${checked} sampled)`);
  }
}

for (const [file, g] of [["spotify-liked.js", "ROTATION_LIKED"], ["spotify-engagement.js", "ROTATION_ENGAGE"]]) {
  const v = loadGlobal(file, g).value;
  if (!v) { ok(false, `${file} loads`); continue; }
  const ks = Object.keys(v).filter(k => typeof v[k] !== "object" || Array.isArray(v[k]));
  const bad = ks.filter(k => k.includes("~") && (/^~|~$/.test(k)));
  ok(bad.length === 0, `${file}: no empty-sided ~ keys (${ks.length} keys)`);
}

console.log("── core dataset sanity");
const core = loaded.ROTATION;
if (core) {
  ok(Array.isArray(core.ARTISTS) && core.ARTISTS.length >= 300, `kept artists present (${core.ARTISTS && core.ARTISTS.length})`);
  ok(core.TOTALS && core.TOTALS.scrobbles > 300000, `total scrobbles sane (${core.TOTALS && core.TOTALS.scrobbles})`);
  ok(core.FAMILIES && Object.keys(core.FAMILIES).length >= 10, `taxonomy families present (${core.FAMILIES && Object.keys(core.FAMILIES).length})`);
  ok(core.SUBS && Object.keys(core.SUBS).length > 50, `subgenres present (${core.SUBS && Object.keys(core.SUBS).length})`);
}

console.log(failures ? `\n${failures} FAILURE(S) — deploy should be blocked.` : "\nall smoke checks passed");
process.exit(failures ? 1 : 0);
