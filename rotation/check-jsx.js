// check-jsx.js — EVALUATE each view file, don't just parse it.
//
//   node check-jsx.js [--babel <path to babel.min.js>]
//
// Why this exists (2026-09-13): a shipped line read
//
//   const REG_ORDER = [bleak, anguished, angry, ...];
//
// — the quotes had been eaten while writing the patch, so those are undefined identifiers rather
// than register names. Explore died on load. Babel parsed it happily, because an array of bare
// identifiers is perfectly valid syntax; the fault only exists once the module is EVALUATED. A
// parse check can never catch that class of bug, so this one runs the module's top level.
//
// It does NOT render components — their bodies never execute here. It catches what module-level
// code touches: const/let initialisers, top-level statements, and anything Object.assign'd onto
// window at the bottom of these files. That is exactly where a stray identifier lands.
//
// Globals are stubbed DELIBERATELY NARROWLY. A permissive Proxy would resolve `bleak` to a dummy
// and defeat the whole point, so only things the runtime genuinely provides are defined and
// everything else is left to throw ReferenceError.
//
// Babel is not a repo dependency and CI installs nothing, so the transpiler is passed in or found
// in the usual scratch location. Run it before pushing view changes.

const fs = require("fs"), path = require("path"), vm = require("vm");

const argv = process.argv.slice(2);
const babelFlag = argv.indexOf("--babel");
const CANDIDATES = [
  babelFlag >= 0 ? argv[babelFlag + 1] : null,
  process.env.BABEL_STANDALONE,
  path.join(__dirname, "node_modules", "@babel", "standalone", "babel.min.js"),
].filter(Boolean);

let Babel = null;
for (const p of CANDIDATES) {
  try { if (fs.existsSync(p)) { Babel = require(path.resolve(p)); break; } } catch (e) {}
}
if (!Babel || !Babel.transform) {
  console.error("check-jsx: need @babel/standalone. Pass --babel <path/to/babel.min.js>, set");
  console.error("           BABEL_STANDALONE, or fetch it:");
  console.error("           curl -sSL -o babel.min.js https://unpkg.com/@babel/standalone@7.29.0/babel.min.js");
  process.exit(2);
}

const files = argv.filter(a => a.endsWith(".jsx"));
const targets = files.length ? files
  : fs.readdirSync(__dirname).filter(f => f.endsWith(".jsx")).sort();

// A minimal but HONEST browser surface: enough that legitimate top-level code runs, never so much
// that an unknown identifier silently resolves.
function makeSandbox() {
  const noop = () => {};
  const el = () => ({
    style: { setProperty: noop, removeProperty: noop }, dataset: {}, classList: { add: noop, remove: noop, toggle: noop },
    setAttribute: noop, removeAttribute: noop, getAttribute: () => null, appendChild: noop, removeChild: noop,
    addEventListener: noop, removeEventListener: noop, querySelector: () => null, querySelectorAll: () => [],
    getBoundingClientRect: () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }),
    contains: () => false, focus: noop, click: noop, scrollIntoView: noop, insertBefore: noop,
  });
  class Component { constructor() { this.props = {}; this.state = {}; } setState() {} render() { return null; } }
  const React = new Proxy({}, { get: (t, k) => {
    if (k === "Fragment") return "Fragment";
    if (k === "createElement") return () => ({});
    if (k === "Component" || k === "PureComponent") return Component;   // some views subclass it
    return () => undefined;   // hooks etc. never run at module scope
  } });
  const doc = {
    getElementById: () => null, createElement: () => el(), querySelector: () => null, querySelectorAll: () => [],
    head: el(), body: el(), documentElement: el(), addEventListener: noop, removeEventListener: noop,
    createTextNode: () => ({}), visibilityState: "visible",
  };
  const win = {
    ROTATION: undefined, location: { hash: "", href: "", search: "", pathname: "/" }, history: { replaceState: noop, pushState: noop },
    matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop }),
    addEventListener: noop, removeEventListener: noop, requestAnimationFrame: () => 0, cancelAnimationFrame: noop,
    setTimeout: () => 0, clearTimeout: noop, setInterval: () => 0, clearInterval: noop,
    devicePixelRatio: 1, innerWidth: 1440, innerHeight: 900, scrollTo: noop, getComputedStyle: () => ({ getPropertyValue: () => "" }),
    localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
    loadScript: noop, hashInt: () => 0, fetch: () => Promise.resolve({ json: () => Promise.resolve({}) }),
  };
  // index.html loads react-dom beside react, so it is a real global, not a leak in this stub.
  const ReactDOM = { createRoot: () => ({ render: noop, unmount: noop }), render: noop, flushSync: (f) => f && f() };
  const sandbox = {
    window: win, document: doc, React, ReactDOM, console,
    navigator: { userAgent: "node", language: "en-US" },
    Image: function () { return el(); }, Element: function () {}, Node: function () {},
    performance: { now: () => 0 },
    requestAnimationFrame: win.requestAnimationFrame, cancelAnimationFrame: win.cancelAnimationFrame,
    setTimeout: win.setTimeout, clearTimeout: win.clearTimeout, setInterval: win.setInterval, clearInterval: win.clearInterval,
    matchMedia: win.matchMedia, localStorage: win.localStorage, getComputedStyle: win.getComputedStyle,
    location: win.location, history: win.history, innerWidth: win.innerWidth, innerHeight: win.innerHeight,
  };
  sandbox.globalThis = sandbox; sandbox.self = sandbox;
  return sandbox;
}

let failed = 0, ran = 0;
for (const f of targets) {
  const full = path.isAbsolute(f) ? f : path.join(__dirname, f);
  const name = path.basename(full);
  let code;
  try { code = Babel.transform(fs.readFileSync(full, "utf8"), { presets: ["react"], filename: name }).code; }
  catch (e) { console.error("  PARSE  " + name + "  " + String(e.message).split("\n")[0]); failed++; continue; }

  const sandbox = makeSandbox();
  vm.createContext(sandbox);
  try {
    vm.runInContext(code, sandbox, { filename: name, timeout: 10000 });
    console.log("  ok     " + name);
    ran++;
  } catch (e) {
    // A ReferenceError here is the real prize: an identifier that does not exist at module scope.
    // Compared by NAME, not instanceof: an error thrown inside the vm context is not an instance of
    // this realm's ReferenceError, so instanceof silently mislabels every one of them.
    const kind = e && e.name === "ReferenceError" ? "UNDEFINED" : "THROWS  ";
    console.error("  " + kind + " " + name + "  " + String(e.message).split("\n")[0]);
    failed++;
  }
}
console.log("");
console.log(ran + " evaluated cleanly, " + failed + " failed");
process.exit(failed ? 1 : 0);
