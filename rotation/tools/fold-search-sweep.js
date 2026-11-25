#!/usr/bin/env node
// tools/fold-search-sweep.js — do folded track titles still surface in search as their own songs?
//
// PRINTS ONLY. Run from rotation/ AFTER `node build-data.js` (reads the freshly built
// media-index.js — the Songs half of the `/` search overlay — never a stale shard).
//
// For every track-level fold in folds.json (per-artist `tracks` blocks) whose `from` slugs
// differently from its `to`, look for a media-index track row keyed slug(artist)~slug(from):
//   spelling fold → the row should NOT exist at all (TRACK_MERGE renames it at ingest). Any hit
//                   is a LEAK.
//   variant fold  → the row is KEPT on purpose (LINK not MERGE, ARCHITECTURE.md §5 stage 2), but
//                   search must land on the canonical. A hit is OK only when ROTATION_MEDIA.vof
//                   maps the variant row to the canonical row (the overlay resolves through it).
//                   Without that link it is a LEAK (the 2026-11-26 Ocean Grove "Fly Away" bug).
//                   A variant whose canonical has NO media row is reported separately (nothing
//                   to point at — the variant is the only row, so search keeps it).
//
// Usage: node tools/fold-search-sweep.js [--json out.json] [--all]
//   --all  also list the variant rows that already resolve (default: summary count only)
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const ROT = path.join(__dirname, "..");
const { slug } = require(path.join(ROT, "lib-slug"));

const args = process.argv.slice(2);
const jsonOut = args.includes("--json") ? args[args.indexOf("--json") + 1] : null;
const showAll = args.includes("--all");

const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(ROT, "media-index.js"), "utf8"), ctx);
const M = ctx.window.ROTATION_MEDIA;
const vof = M.vof || {};
const rowByKey = new Map();   // slug(artist)~slug(title) → [rowIdx,…]
M.tracks.forEach((t, i) => {
  const k = slug(M.artists[t[1]]) + "~" + slug(t[0]);
  if (!rowByKey.has(k)) rowByKey.set(k, []);
  rowByKey.get(k).push(i);
});

const folds = JSON.parse(fs.readFileSync(path.join(ROT, "folds.json"), "utf8"));
const leaks = [], resolved = [], noCanon = [];
let checked = 0;
for (const [artist, block] of Object.entries(folds)) {
  if (!block || typeof block !== "object" || !Array.isArray(block.tracks)) continue;
  const aS = slug(artist);
  for (const f of block.tracks) {
    if (!f || !f.from || !f.to) continue;
    if (slug(f.from) === slug(f.to)) continue;   // same key — the prescan groups them; nothing separate can surface
    checked++;
    const hits = rowByKey.get(aS + "~" + slug(f.from));
    if (!hits) continue;
    const canonRows = rowByKey.get(aS + "~" + slug(f.to)) || [];
    for (const ri of hits) {
      const t = M.tracks[ri];
      const rec = { artist, type: f.type, from: f.from, to: f.to, row: ri, rowTitle: t[0], plays: t[2],
        canonRow: canonRows.length ? canonRows[0] : null,
        canonTitle: canonRows.length ? M.tracks[canonRows[0]][0] : null };
      // vof may land on a chain ROOT (variant of a variant), or on the canonical's surviving
      // spelling — the link itself is the client contract, so take its target as the landing row.
      if (f.type === "variant" && vof[ri] != null) {
        rec.canonRow = vof[ri]; rec.canonTitle = M.tracks[vof[ri]][0]; resolved.push(rec);
      } else if (f.type === "variant" && !canonRows.length) noCanon.push(rec);
      else leaks.push(rec);
    }
  }
}

const line = (r) => `  ${r.artist} :: "${r.rowTitle}" (${r.plays} plays, ${r.type}) → ${r.canonTitle != null ? `"${r.canonTitle}"` : `[no canonical row; ledger to "${r.to}"]`}`;
console.log(`media-index: ${M.tracks.length} track rows · vof links: ${Object.keys(vof).length}`);
console.log(`track folds checked (from/to slug differently): ${checked}`);
console.log(`\nLEAKS — folded title searchable as an independent song (${leaks.length}):`);
leaks.forEach(r => console.log(line(r)));
console.log(`\nvariant rows whose canonical has no media row — kept as-is (${noCanon.length}):`);
noCanon.forEach(r => console.log(line(r)));
console.log(`\nvariant rows resolving to their canonical in search: ${resolved.length}`);
if (showAll) resolved.forEach(r => console.log(line(r)));
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ checked, leaks, noCanon, resolved }, null, 1));
process.exitCode = leaks.length ? 1 : 0;
