#!/usr/bin/env node
/* fuad.au hub — deploy stager.
 * Reads apps.json and assembles _site/: hub root files at the top, each app under _site/<id>/.
 * Only files listed in an app's "deploy" array are copied — the app's workshop (Python,
 * caches, CSVs, source JSON) is never shipped. Adding an app = an apps.json entry; this
 * script and the CI workflow need no edits.
 *
 * Run from the repo root, AFTER any per-app build step (e.g. rotation's `node build-data.js`).
 */
const fs = require("fs");
const path = require("path");

const OUT = "_site";
const manifest = JSON.parse(fs.readFileSync("apps.json", "utf8"));
let copied = 0, missing = 0;

function copy(src, dst) {
  if (!fs.existsSync(src)) { console.warn("  ! missing:", src); missing++; return; }
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  copied++;
}
function dirSize(dir) {
  let n = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    n += e.isDirectory() ? dirSize(p) : fs.statSync(p).size;
  }
  return n;
}
const mb = (b) => (b / 1048576).toFixed(1) + " MB";

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

console.log("hub root:");
for (const f of manifest.hubFiles) copy(f, path.join(OUT, f));

for (const app of manifest.apps) {
  console.log(`app: ${app.id}/`);
  for (const f of app.deploy) copy(path.join(app.id, f), path.join(OUT, app.id, f));
  if (fs.existsSync(path.join(OUT, app.id)))
    console.log(`  -> ${mb(dirSize(path.join(OUT, app.id)))}`);
}

console.log(`\nstaged ${copied} files into ${OUT}/ (${mb(dirSize(OUT))} total)`);
if (missing) {
  console.warn(`WARNING: ${missing} file(s) missing.`);
  // In CI, generated Rotation data must exist post-build — fail loudly there.
  if (process.env.CI) { console.error("Missing files in CI — failing."); process.exit(1); }
}
