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
