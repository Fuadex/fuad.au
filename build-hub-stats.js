// build-hub-stats.js — tiny live counters for the root launcher.
// Runs in CI right after rotation's build-data.js (so the scrobble total is the
// daily-fresh one) and emits hub-stats.json, which index.html fetches at load.
// The static text in index.html is the fallback if the fetch ever fails.
const fs = require("fs"), vm = require("vm"), path = require("path");
const R = (p) => fs.readFileSync(path.join(__dirname, p), "utf8");
const win = (src) => { const w = {}; vm.runInNewContext(src, { window: w }); return w; };

const rot = win(R("rotation/music-core.js")).ROTATION;
const cultureImports = win(R("culture/imports.js")).CULTURE_IMPORTS || [];
// culture/data.js keeps ITEMS as a const (not a window global) — count entries by shape
const cultureItems = (R("culture/data.js").match(/\bmedium\s*:/g) || []).length;
const art = win(R("canvas/artworks.js")).CANVAS_ARTWORKS || [];

const stats = {
  rotation: { scrobbles: rot.TOTALS.scrobbles },
  culture:  { works: cultureItems + cultureImports.length },
  canvas:   { works: art.length, museums: new Set(art.map(a => a.seenAt).filter(Boolean)).size },
  built: new Date().toISOString().slice(0, 10),
};
fs.writeFileSync(path.join(__dirname, "hub-stats.json"), JSON.stringify(stats));
console.log("hub-stats.json:", JSON.stringify(stats));
