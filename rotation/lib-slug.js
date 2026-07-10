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

const slug = (s) => {
  const t = (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return t || ("a-" + _slugHash(s || "x").slice(0, 7));
};

module.exports = { slug, _slugHash };
