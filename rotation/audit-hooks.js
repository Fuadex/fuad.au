// audit-hooks.js — find React hooks called AFTER an early return inside a component.
//
// React requires the same hooks, in the same order, on every render. A hook below a `return` that
// only fires on some renders changes the count between renders and throws
//   Minified React error #310  ("Rendered more hooks than during the previous render")
// which surfaces as an intermittent crash on navigation, not a reliable one — so it survives
// testing. That is exactly what happened on 2026-09-01: two useDragScroll() calls were added to
// AlbumView below its `if (!ready)` / `if (!data)` guards.
//
// Heuristic and deliberately noisy-on-the-safe-side: it tracks top-level `function X(` blocks whose
// name starts uppercase (a component) or `use` (a hook), notes the first top-level early return,
// and flags any hook call after it at the same brace depth.
//
//   node audit-hooks.js
const fs = require("fs"), path = require("path");
const DIR = __dirname;
const HOOK = /\b(React\.)?(useState|useEffect|useMemo|useRef|useCallback|useLayoutEffect|useReducer|useContext|use[A-Z]\w*)\s*\(/;
const FN = /^(?:function|const)\s+([A-Z]\w*|use[A-Z]\w*)\s*[=(]/;

let flagged = 0, scanned = 0;
for (const f of fs.readdirSync(DIR).filter(x => x.endsWith(".jsx"))) {
  const lines = fs.readFileSync(path.join(DIR, f), "utf8").split(/\r?\n/);
  let inFn = null, depth = 0, retLine = 0;
  lines.forEach((raw, i) => {
    const l = raw.replace(/\/\/.*$/, "");
    const m = raw.match(FN);
    if (m && /^(function|const)/.test(raw)) { inFn = m[1]; depth = 0; retLine = 0; scanned++; }
    if (!inFn) return;
    // a top-level (2-space) `if (...) return` inside the component body
    if (!retLine && /^ {2}if\s*\(.*\)\s*return\b/.test(l)) retLine = i + 1;
    if (retLine && /^ {2}(const|let|var)?\s*.*/.test(l) && HOOK.test(l) && /^ {2}\S/.test(l)) {
      const name = (l.match(HOOK) || [])[0].replace(/\s*\($/, "");
      console.log(`${f}:${i + 1}  ${inFn}() calls ${name} AFTER an early return at line ${retLine}`);
      flagged++;
    }
    for (const c of l) { if (c === "{") depth++; else if (c === "}") { depth--; if (depth < 0) { inFn = null; retLine = 0; } } }
  });
}
console.log(`\nscanned ${scanned} component/hook definitions`);
if (!flagged) { console.log("no hooks found below an early return — safe"); process.exit(0); }
console.log(`${flagged} suspect call(s).

A flag is only a LIVE bug if the guarded value can CHANGE between renders. Guards on eagerly
loaded data (anything already in music-core.js — R.TOUR and R.GIGS, for instance) never flip
during a mount, so those hooks always run the same number of times and cannot throw. The
dangerous case is a guard on LAZY data: the component renders once without it, returns early,
then re-renders with it and runs extra hooks. That is what AlbumView's \`if (!ready)\` did to two
useDragScroll() calls on 2026-09-01.

Known-benign at the time of writing: GigsView and TourSection, both guarding on eager
music-core data. Anything NEW in this list deserves a look before shipping.`);
process.exit(1);
