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

console.log("── album canonicalisation + release-type + artist active-days");
// (a) base+variant collapsed: no "Mezzanine (Deluxe)" distinct from "Mezzanine" for Massive Attack.
// Check the kept-artist topAlbums (per-artist aggregate) — the canonical merge site.
if (core && Array.isArray(core.ARTISTS)) {
  const ma = core.ARTISTS.find(a => a.name === "Massive Attack");
  if (!ma) console.warn("  ⚠ Massive Attack not a kept artist — skipping Mezzanine merge check");
  else {
    const titles = (ma.topAlbums || []).map(a => a.title);
    const hasDeluxe = titles.some(t => /^Mezzanine\s*[([]/i.test(t));   // "Mezzanine (Deluxe)" etc.
    ok(!hasDeluxe, `Massive Attack: no "Mezzanine (Deluxe)" variant distinct from "Mezzanine" (${titles.filter(t => /mezzanine/i.test(t)).join(" | ") || "none"})`);
  }
  // (d) every album kind is one of the allowed release types
  const KINDS = new Set(["single", "ep", "album", "comp", "live", "ost"]);
  let badKind = 0, kindSeen = 0;
  for (const a of core.ARTISTS) for (const al of (a.topAlbums || [])) { kindSeen++; if (!KINDS.has(al.kind)) badKind++; }
  ok(kindSeen > 0 && badKind === 0, `every album kind ∈ {single,ep,album,comp,live,ost} (${kindSeen} checked, ${badKind} bad)`);
}

// (b) album-alias.js parses and has ≥ 200 alias entries
{
  const r = loadGlobal("album-alias.js", "ROTATION_ALBUM_ALIAS");
  if (r.missing) ok(false, "album-alias.js exists");
  else if (r.error) ok(false, "album-alias.js parses — " + r.error);
  else {
    const n = r.value ? Object.keys(r.value).length : 0;
    ok(n >= 200, `album-alias.js has ≥200 aliases (${n})`);
  }
}

// (c) artist-days.js parses, ≥300 artists, spot-decode yields strictly increasing offsets
{
  const r = loadGlobal("artist-days.js", "ROTATION_ARTIST_DAYS");
  if (r.missing) ok(false, "artist-days.js exists");
  else if (r.error) ok(false, "artist-days.js parses — " + r.error);
  else {
    const v = r.value || {};
    const days = v.days || {};
    const ids = Object.keys(days);
    ok(v.v === 1 && /^\d{4}-\d{2}-\d{2}$/.test(v.start || ""), `artist-days: v=1 + start day (${v.start})`);
    ok(ids.length >= 300, `artist-days: ≥300 artists (${ids.length})`);
    // decode one artist per the LOCKED delta-base36 scheme → offsets must be strictly increasing
    const sample = ids.find(id => days[id] && days[id].indexOf(",") > 0) || ids[0];
    const toks = (days[sample] || "").split(",");
    let prev = -1, strict = true, off = 0;
    for (let i = 0; i < toks.length; i++) {
      const t = parseInt(toks[i], 36);
      off = i === 0 ? t : off + t;
      if (i > 0 && t < 1) strict = false;       // gaps must be ≥1
      if (off <= prev) strict = false;           // offsets strictly increasing
      prev = off;
    }
    ok(toks.length > 0 && strict, `artist-days: spot-decode "${sample}" gives strictly increasing offsets (${toks.length} days)`);
  }
}

// (c2) mb-lineup.js parses, ≥300 entries, a sampled member has n + i array
{
  const r = loadGlobal("mb-lineup.js", "ROTATION_MB");
  if (r.missing) ok(false, "mb-lineup.js exists");
  else if (r.error) ok(false, "mb-lineup.js parses — " + r.error);
  else {
    const v = r.value || {};
    const ids = Object.keys(v);
    ok(ids.length >= 300, `mb-lineup: ≥300 entries (${ids.length})`);
    // find an entry with members, sample the first, assert n string + i is an array
    const mid = ids.find(id => v[id] && v[id].members && v[id].members.length);
    const m = mid ? v[mid].members[0] : null;
    ok(!!m && typeof m.n === "string" && m.n.length > 0 && Array.isArray(m.i),
      mid ? `mb-lineup: sampled member "${m.n}" (of ${mid}) has n + i array` : "mb-lineup: no member found");
  }
}

// (e) album-extras.js parses; when it has entries, each value has array bonus/from fields
{
  const r = loadGlobal("album-extras.js", "ROTATION_ALBUM_EXTRAS");
  if (r.missing) ok(false, "album-extras.js exists");
  else if (r.error) ok(false, "album-extras.js parses — " + r.error);
  else {
    const v = r.value || {};
    const keys = Object.keys(v);
    ok(true, `album-extras.js parses (${keys.length} albums)`);
    if (keys.length > 0) {
      let badShape = 0, empties = 0, badEd = 0, edCoverGap = 0;
      for (const k of keys) {
        const e = v[k];
        // present fields must be arrays; entries with neither bonus nor from should not be emitted
        if ("bonus" in e && !Array.isArray(e.bonus)) badShape++;
        if ("from" in e && !Array.isArray(e.from)) badShape++;
        const nb = (e.bonus && e.bonus.length) || 0, nf = (e.from && e.from.length) || 0;
        if (nb === 0 && nf === 0) empties++;
        // byEdition (new): present iff bonus present; object of suffix → track[]; its tracks must
        // exactly cover the bonus set (no track dropped or invented by the grouping pass).
        if (nb > 0) {
          if (typeof e.byEdition !== "object" || e.byEdition === null || Array.isArray(e.byEdition)) badEd++;
          else {
            const covered = new Set();
            for (const suf in e.byEdition) {
              if (!Array.isArray(e.byEdition[suf])) { badEd++; break; }
              for (const t of e.byEdition[suf]) covered.add(t);
            }
            if (covered.size !== nb || !e.bonus.every(t => covered.has(t))) edCoverGap++;
          }
        } else if ("byEdition" in e) badEd++;   // no bonus → byEdition must be absent
      }
      ok(badShape === 0, `album-extras: bonus/from are arrays where present (${badShape} bad)`);
      ok(empties === 0, `album-extras: no empty entries (bonus.length||from.length > 0) (${empties} empty)`);
      ok(badEd === 0, `album-extras: byEdition is {suffix:[…]} present iff bonus present (${badEd} bad)`);
      ok(edCoverGap === 0, `album-extras: byEdition tracks exactly cover the bonus set (${edCoverGap} mismatched)`);
    }
  }
}

// (f) at least one kept-artist single carries `on` (host-album resolution)
if (core && Array.isArray(core.ARTISTS)) {
  let singles = 0, withOn = 0;
  for (const a of core.ARTISTS) for (const al of (a.topAlbums || [])) {
    if (al.kind === "single") { singles++; if (al.on) withOn++; }
  }
  ok(withOn >= 1, `at least one kept-artist single carries \`on\` (${withOn} of ${singles} singles)`);
}

// (g) day-hours.js parses, v=1, ≥3000 rows; a sampled row decodes to hours 0–23 w/ counts ≥1;
//     and the sum of a sampled day's counts equals that day's count in day-series (same day-0).
console.log("── day × hour histogram (day-hours.js ↔ day-series.js)");
{
  const r = loadGlobal("day-hours.js", "ROTATION_DAY_HOURS");
  const ds = loadGlobal("day-series.js", "ROTATION_DAYS");
  if (r.missing) ok(false, "day-hours.js exists");
  else if (r.error) ok(false, "day-hours.js parses — " + r.error);
  else if (ds.missing || ds.error || !ds.value) ok(false, "day-series.js loads (needed to cross-check day-hours)");
  else {
    const v = r.value || {};
    const rows = v.rows || {};
    const offs = Object.keys(rows);
    ok(v.v === 1, `day-hours: v=1 (${v.v})`);
    ok(v.start === ds.value.start, `day-hours: same day-0 as day-series (${v.start} === ${ds.value.start})`);
    ok(offs.length >= 3000, `day-hours: ≥3000 rows (${offs.length})`);
    // decode a sampled non-trivial row: hours in 0–23, counts ≥1
    const sample = offs.find(o => rows[o] && rows[o].indexOf(";") > 0) || offs[0];
    const pairs = (rows[sample] || "").split(";").filter(Boolean);
    let hourOk = true, sum = 0, lastH = -1;
    for (const p of pairs) {
      const [hs, cs] = p.split(":");
      const h = parseInt(hs, 36), c = parseInt(cs, 36);
      if (!(h >= 0 && h <= 23)) hourOk = false;
      if (!(c >= 1)) hourOk = false;
      if (h <= lastH) hourOk = false;   // hours ascending
      lastH = h; sum += c;
    }
    ok(pairs.length > 0 && hourOk, `day-hours: sampled row "${sample}" decodes to hours 0–23, counts ≥1 (${pairs.length} hours)`);
    // sum of the sampled day's counts must equal day-series counts[offset]
    const off = parseInt(sample, 36);
    const dsCount = (ds.value.counts || [])[off];
    ok(sum === dsCount, `day-hours: sampled day sum === day-series count (offset ${off}: ${sum} === ${dsCount})`);
  }
}

console.log(failures ? `\n${failures} FAILURE(S) — deploy should be blocked.` : "\nall smoke checks passed");
process.exit(failures ? 1 : 0);
