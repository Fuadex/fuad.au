// audit-globals.js — catch duplicate TOP-LEVEL declarations across the rotation .jsx files.
//
// These files load as plain <script type="text/babel">, so every top-level const/let/function
// lands in ONE shared script scope. A name declared twice throws
//   SyntaxError: Identifier 'X' has already been declared
// at parse time, which kills the WHOLE file that loads second — not just the duplicate. On
// 2026-09-01 hoisting REG_VOCAB out of a component in rotation-media.jsx collided with the copy in
// rotation-explore.jsx and took the entire Explore page down (ExploreView never got defined).
//
// Compiling each file individually does NOT catch this — Babel is happy, the collision only exists
// once the browser has loaded them together. Hence this check.
//
//   node audit-globals.js          report duplicates (exit 1 if any)
//   node audit-globals.js --all    also list every top-level name per file
const fs = require("fs"), path = require("path");
const DIR = __dirname;
const ALL = process.argv.includes("--all");

// load order matters for the blame line: the file that loads LATER is the one that dies.
const order = (() => {
  try {
    const html = fs.readFileSync(path.join(DIR, "index.html"), "utf8");
    return [...html.matchAll(/src="([\w.-]+\.jsx)"/g)].map(m => m[1]);
  } catch (e) { return []; }
})();
const files = fs.readdirSync(DIR).filter(f => f.endsWith(".jsx"));
files.sort((a, b) => {
  const ia = order.indexOf(a), ib = order.indexOf(b);
  return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
});

// top-level = column 0. Anything indented is inside a function/component and safely scoped.
const DECL = /^(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/;
const seen = new Map();   // name -> [{file, line}]
const perFile = new Map();
for (const f of files) {
  const lines = fs.readFileSync(path.join(DIR, f), "utf8").split(/\r?\n/);
  const names = [];
  lines.forEach((l, i) => {
    const m = l.match(DECL); if (!m) return;
    names.push(m[1]);
    if (!seen.has(m[1])) seen.set(m[1], []);
    seen.get(m[1]).push({ file: f, line: i + 1 });
  });
  perFile.set(f, names);
}
const dupes = [...seen.entries()].filter(([, v]) => v.length > 1);
console.log(`scanned ${files.length} .jsx files in load order: ${files.filter(f => order.includes(f)).join(" -> ") || "(index.html unread)"}`);
if (ALL) for (const [f, n] of perFile) console.log(`  ${f}: ${n.length} top-level names`);

if (!dupes.length) { console.log("\nno duplicate top-level declarations — safe to ship"); process.exit(0); }
console.log(`\nDUPLICATE TOP-LEVEL DECLARATIONS: ${dupes.length}`);
for (const [name, at] of dupes) {
  const last = at[at.length - 1];
  console.log(`  ${name}`);
  for (const a of at) console.log(`      ${a.file}:${a.line}`);
  console.log(`      -> ${last.file} loads last and will throw; everything it defines goes missing.`);
}
console.log("\nFix: rename one, or move the single canonical copy into rotation-core.jsx (loads first).");
process.exit(1);
