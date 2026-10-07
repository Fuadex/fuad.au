// apply-repairs.js — apply REVIEWED field-level repair proposals to the shipped Canvas stores.
// A proposal file is a JSON array (or {changes:[…]}, or one object) of { id, field, old, new }:
//   field "about" | "deep"                          → art-about.js entry
//   field "tour.see|about|craft|context", "beside",
//         "tour.deeper[i].body|t", "tour.deeper[i].box" ({x,y,w,h})  → art_inspect.js entry
//   field "art_hires" (old null, new = row)          → art_hires.js, one compact line inserted (id must have no row)
// Every change ASSERTS its `old` equals the live value (deep-equal) — a stale proposal is refused, never forced.
// Only the touched entries are re-serialised, each in its OWN existing format (compact one-liner or the 1-space
// pretty block), then a round-trip proof checks every untouched entry is byte-for-byte unchanged in value.
// Usage: node apply-repairs.js <proposal.json>… [--write]     (dry run by default; prints each change)
const fs = require("fs"), path = require("path");
const files = process.argv.slice(2).filter(a => !a.startsWith("--"));
const WRITE = process.argv.includes("--write");
const P = { about: path.join(__dirname, "art-about.js"), inspect: path.join(__dirname, "art_inspect.js"), hires: path.join(__dirname, "art_hires.js") };
const K = { about: "CANVAS_ART_ABOUT", inspect: "CANVAS_INSPECT", hires: "CANVAS_HIRES" };
const load = (src, k) => { global.window = {}; eval(src); return window[k]; };
const src = {}, data = {}, before = {};
for (const s of Object.keys(P)) { src[s] = fs.readFileSync(P[s], "utf8"); data[s] = load(src[s], K[s]); before[s] = JSON.parse(JSON.stringify(data[s])); }
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const changes = [];
for (const f of files) { const j = JSON.parse(fs.readFileSync(f, "utf8")); changes.push(...(Array.isArray(j) ? j : j.changes || [j])); }
const touched = { about: new Set(), inspect: new Set() }, newHires = [], problems = [];
for (const c of changes) {
  const { id, field } = c;
  try {
    if (field === "art_hires") {
      if (data.hires[id]) throw new Error("already has a hires row");
      newHires.push([id, c.new]); console.log(`  + art_hires ${id}  ${c.new.w}x${c.new.h} (${c.new.src})`); continue;
    }
    let store, obj, key;
    if (field === "about" || field === "deep") { store = "about"; obj = data.about[id]; key = field; }
    else {
      store = "inspect"; const t = data.inspect[id]; if (!t) throw new Error("no tour");
      const m = field.match(/^tour\.deeper\[(\d+)\]\.(body|t|box)$/);
      if (m) {
        const stop = t.deeper[+m[1]]; if (!stop) throw new Error("no stop " + m[1]);
        if (m[2] === "box") {
          const cur = { x: stop.x, y: stop.y, w: stop.w, h: stop.h };
          if (!eq(cur, c.old)) throw new Error(`box old mismatch: live ${JSON.stringify(cur)}`);
          Object.assign(stop, c.new); touched.inspect.add(id); console.log(`  ~ ${id} ${field}`); continue;
        }
        obj = stop; key = m[2];
      } else if (field === "beside") { obj = t; key = "beside"; }
      else { const k2 = field.replace(/^tour\./, ""); if (!["see", "about", "craft", "context"].includes(k2)) throw new Error("unknown field"); obj = t; key = k2; }
    }
    if (!obj) throw new Error("no entry");
    // SPAN EDITS (2026-10-06, tranche-1 era repair): when `old` is not the whole field, it may be
    // a contiguous span inside it — accepted only if it occurs EXACTLY once, replaced in place.
    // Entries apply in file order, so a later span asserts against the already-edited field.
    if (obj[key] !== c.old) {
      const n = obj[key].split(c.old).length - 1;
      if (n !== 1) throw new Error(`old text mismatch on ${field} (whole-field no, span x${n})`);
      obj[key] = obj[key].replace(c.old, c.new); touched[store].add(id); console.log(`  ~ ${id} ${field} (span)`); continue;
    }
    obj[key] = c.new; touched[store].add(id); console.log(`  ~ ${id} ${field}`);
  } catch (e) { problems.push(`${id} ${field}: ${e.message}`); }
}
// beside refs must still each occur exactly once
// refs come in TWO shapes (STUDY_SPEC *The two accepted shapes*): a bare array attaches to the default
// paragraph (`beside` on a tour), a keyed object maps field -> refs. Check every ref against ITS field
// (2026-10-07: a keyed-object tour crashed this loop, which read only the array shape).
for (const id of touched.inspect) {
  const t = data.inspect[id]; const R = t.refs;
  const groups = !R ? [] : Array.isArray(R) ? [["beside", R]] : Object.entries(R);
  for (const [fld, rs] of groups) for (const r of (rs || [])) if ((t[fld] || "").split(r.text).length !== 2) problems.push(`${id}: ${fld} ref "${r.text}" no longer occurs exactly once`);
}
if (problems.length) { console.log("\nPROBLEMS:\n  " + problems.join("\n  ")); console.log("\nnothing written"); process.exit(1); }
console.log(`\n${changes.length} changes OK (${touched.about.size} Info/Interp entries, ${touched.inspect.size} tours, ${newHires.length} hires rows)`);
if (!WRITE) { console.log("DRY RUN — add --write to apply."); process.exit(0); }
function splice(s, id, obj) {
  const re = new RegExp("\\n(\\s*)" + JSON.stringify(id).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*:\\s*\\{", "g");
  const hits = [...s.matchAll(re)]; if (hits.length !== 1) throw new Error(`${id}: ${hits.length} key matches`);
  const at = hits[0].index + 1, open = s.indexOf("{", at); let d = 0, end = -1, inStr = false, esc = false;
  for (let i = open; i < s.length; i++) {
    const ch = s[i];
    if (inStr) { if (esc) esc = false; else if (ch === "\\") esc = true; else if (ch === '"') inStr = false; continue; }
    if (ch === '"') inStr = true; else if (ch === "{") d++; else if (ch === "}") { d--; if (!d) { end = i + 1; break; } }
  }
  const old = s.slice(open, end), indent = hits[0][1];
  const body = old.includes("\n") ? JSON.stringify(obj, null, 1).split("\n").join("\n" + indent) : JSON.stringify(obj);
  return s.slice(0, open) + body + s.slice(end);
}
for (const st of ["about", "inspect"]) for (const id of touched[st]) src[st] = splice(src[st], id, data[st][id]);
if (newHires.length) {
  const anchor = "window.CANVAS_HIRES = {\n"; if (src.hires.split(anchor).length !== 2) throw new Error("hires anchor");
  src.hires = src.hires.replace(anchor, anchor + newHires.map(([id, r]) => JSON.stringify(id) + ":" + JSON.stringify(r) + ",\n").join(""));
}
// round-trip proof
for (const st of Object.keys(P)) {
  const after = load(src[st], K[st]);
  for (const id of Object.keys(before[st])) {
    const want = (touched[st] && touched[st].has(id)) ? data[st][id] : before[st][id];
    if (!eq(after[id], want)) throw new Error(`round-trip: ${st} ${id} differs`);
  }
  if (Object.keys(after).length !== Object.keys(before[st]).length + (st === "hires" ? newHires.length : 0)) throw new Error("count " + st);
}
for (const st of Object.keys(P)) fs.writeFileSync(P[st], src[st], "utf8");
console.log("PROOF OK — written; every untouched entry unchanged.");
