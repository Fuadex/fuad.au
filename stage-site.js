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

// ── Precompile (Phase 0) ──────────────────────────────────────────────────
// For apps flagged `"precompile": true`, Babel-transform their .jsx → .js in the
// STAGED _site copy only (authoring stays 100% buildless — local files stay .jsx,
// and `index.html` still loads them via in-browser Babel during local dev). This
// removes the ~700 KB gz @babel/standalone download AND the per-load compile from
// production. Faithful to current runtime: rotation-app.jsx compiled with env+react
// (it sets data-presets="env,react"); every other view with react-only (its default).
// If Babel can't be found, precompile is skipped and the app ships buildless exactly
// as before — a safe fallback (in CI we install it, so it always runs there).
function loadBabel() {
  const tries = [
    () => require("@babel/standalone"),
    () => require(path.resolve(__dirname, "../.babelcheck/node_modules/@babel/standalone")),
    () => require(path.resolve(__dirname, "node_modules/@babel/standalone")),
  ];
  for (const t of tries) { try { return t(); } catch (_) {} }
  return null;
}

function precompileApp(app, babel) {
  const dir = path.join(OUT, app.id);
  const jsxFiles = app.deploy.filter(f => f.endsWith(".jsx"));
  for (const f of jsxFiles) {
    const src = path.join(dir, f);
    if (!fs.existsSync(src)) continue;
    const code = fs.readFileSync(src, "utf8");
    // match the in-browser preset per file: app shell used env+react, views used react.
    const presets = /app\.jsx$/.test(f) ? ["env", "react"] : ["react"];
    let out;
    try { out = babel.transform(code, { presets, compact: false, comments: false }).code; }
    catch (e) {
      console.error(`  ! precompile FAIL ${app.id}/${f}: ${e.message}`);
      if (process.env.CI) process.exit(1);
      throw e;
    }
    fs.writeFileSync(src.replace(/\.jsx$/, ".js"), out, "utf8");
    fs.rmSync(src);   // drop the .jsx from the shipped bundle
  }
  // rewrite the staged index.html: strip the Babel runtime, point script tags at the
  // compiled .js, add `defer` so they no longer block parse. react/react-dom untouched.
  const idx = path.join(dir, "index.html");
  if (fs.existsSync(idx)) {
    let html = fs.readFileSync(idx, "utf8");
    html = html.replace(/^[ \t]*<script[^>]*@babel\/standalone[^>]*><\/script>\r?\n/m, "");
    html = html.replace(/<script\s+type="text\/babel"(?:\s+data-presets="[^"]*")?\s+src="([^"]+)\.jsx"><\/script>/g,
      '<script defer src="$1.js"></script>');
    fs.writeFileSync(idx, html, "utf8");
  }
  console.log(`  precompiled ${jsxFiles.length} .jsx → .js (Babel stripped from prod)`);
}

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

const babel = manifest.apps.some(a => a.precompile) ? loadBabel() : null;
if (manifest.apps.some(a => a.precompile) && !babel) {
  console.warn("  ! Babel not found — shipping .jsx buildless (install @babel/standalone to precompile)");
  if (process.env.CI) { console.error("Precompile expected in CI but Babel missing — failing."); process.exit(1); }
}

for (const app of manifest.apps) {
  console.log(`app: ${app.id}/`);
  for (const f of app.deploy) copy(path.join(app.id, f), path.join(OUT, app.id, f));
  if (app.precompile && babel) precompileApp(app, babel);
  if (fs.existsSync(path.join(OUT, app.id)))
    console.log(`  -> ${mb(dirSize(path.join(OUT, app.id)))}`);
}

console.log(`\nstaged ${copied} files into ${OUT}/ (${mb(dirSize(OUT))} total)`);
if (missing) {
  console.warn(`WARNING: ${missing} file(s) missing.`);
  // In CI, generated Rotation data must exist post-build — fail loudly there.
  if (process.env.CI) { console.error("Missing files in CI — failing."); process.exit(1); }
}
