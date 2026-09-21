// lib-slug.js — THE canonical slug. Single source of truth for the identity keys that join
// every dataset in Rotation (music-core, media-index, llm-about, spotify-liked/engagement,
// gigs, workshop scripts). The frontend mirror is R.slug in rotation-core.jsx — if this
// changes, that must change identically (asserted by smoke-test.js).
//
// The empty→hash fallback is LOAD-BEARING: CJK/non-latin names strip to "" under the ascii
// slug and would all collide on one key. ミドリ → "a-2yw9ix". A plain slug mis-keys ALL
// non-latin content (the 2026-07 Spotify hearts bug). Never reimplement this by hand —
// require this file: const { slug, _slugHash } = require("./lib-slug");

function _slugHash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (((h << 5) + h) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

// MEMOISED (2026-09-22, audit B3/R10): slug() was 6.2% of build-data.js CPU (~2.1 s of 30.9 s)
// across 152 call sites, almost all of them re-slugging the SAME artist / album / track names over
// and over. The function is pure, so a module-level cache cannot change the frozen contract —
// smoke-test.js's slug invariants still assert it byte-for-byte. The key is `s || ""`, exactly the
// value the body uses, so every falsy input (null/undefined/""/0) shares the one correct entry.
// Non-string inputs still throw at .toLowerCase() as before, and throw BEFORE anything is cached.
// The 1e6 cap keeps a long-running workshop script from growing the map without bound (the build
// itself peaks far below it).
const _slugCache = new Map();

const slug = (s) => {
  const k = s || "";
  const hit = _slugCache.get(k);
  if (hit !== undefined) return hit;
  const t = k.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const v = t || ("a-" + _slugHash(k || "x").slice(0, 7));
  if (_slugCache.size >= 1e6) _slugCache.clear();
  _slugCache.set(k, v);
  return v;
};

module.exports = { slug, _slugHash };
