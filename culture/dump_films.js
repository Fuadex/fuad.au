// dump_films.js — emit a clean film index for build_script_mood.py (which can't parse the JS
// data files). Reads data.js/imports.js/wishlist.js via vm, writes .film-index.json:
//   [{ id, title, year, rating }]  for every film/TV-ish item.
// Local tooling for the (local-only) transcripts dump; the emitted .film-index.json is gitignored.
// Run:  node dump_films.js
const vm = require("vm"), fs = require("fs");
const ctx = { window: {} };
vm.createContext(ctx);
for (const f of ["data.js", "imports.js", "wishlist.js"]) {
  try { vm.runInContext(fs.readFileSync(f, "utf8"), ctx); } catch (e) { console.error(f, e.message); }
}
const C = ctx.window.CULTURE || {}, I = ctx.window.CULTURE_IMPORTS || [], W = ctx.window.CULTURE_WISHLIST || [];
const items = [...(C.ITEMS || []), ...I, ...W].filter(x => x && x.id && x.title);
const film = items.filter(x => /Movies|Feature Animation|Animated Series|TV|Shorts/i.test(x.medium || ""));
const out = film.map(x => ({ id: x.id, title: x.title, year: x.year || 0, rating: x.rating != null ? Number(x.rating) : null }));
fs.writeFileSync(".film-index.json", JSON.stringify(out));
console.log(`.film-index.json: ${out.length} film items (${out.filter(x => x.rating != null).length} rated)`);
