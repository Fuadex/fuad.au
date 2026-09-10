// apply-plate-fixes.js — consumes plate_audit_results.json (written by audit-plates.js) and applies
// ONLY the unambiguous corrections the task authorized:
//   (a) flat clamp lifted -> delete `flat`, append a note sentence, on the row's OWN line in
//       art_hires.js (line-based: each hires entry is exactly one line in that file).
//   (c) iiif info.json and the measured `img` agree with each other, and differ from recorded w/h
//       -> set w,h to the info.json size, on the row's own line in art_hires.js.
//   (d) art_imgsize entry differs from Commons' true size -> set the pair, via a targeted substring
//       replace in art_imgsize.js (that file is one giant object literal on one line, so entries are
//       addressed by their exact `"id":[w,h]` substring rather than by line).
// (b), (e), (f) are NEVER applied — report only, per instruction.
// Before any write, copies both files to the session scratchpad with a .before.js suffix.
'use strict';
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const SCRATCH = 'C:/Users/Fuad/AppData/Local/Temp/claude/c--Users-Fuad-Documents-GitHub/43a3ca77-8302-49db-b3f8-49ad0458917f/scratchpad';
const HIRES_PATH = path.join(DIR, 'art_hires.js');
const IMGSIZE_PATH = path.join(DIR, 'art_imgsize.js');
const RESULTS_PATH = path.join(DIR, 'plate_audit_results.json');
const TODAY = '2026-09-10';
const FLAT_LIFT_THRESHOLD = 0.9; // >= 90% of master long side

const DRY = process.argv.includes('--dry');

const results = JSON.parse(fs.readFileSync(RESULTS_PATH, 'utf8'));

function longSide(pair) { return Math.max(pair[0], pair[1]); }

// ---------- classify ----------
const catA = []; // flat clamp lifted
const catB = []; // img size differs from w,h by >2% (report only)
const catC = []; // iiif info.json differs from w,h (report only); applyC subset actually mutated
const catC_apply = [];
const catD = []; // imgsize differs from commons truth (report only)
const catD_apply = [];
const catE = []; // any URL error
const catF = results.holderMismatches || [];

for (const r of results.hires) {
  // (e) errors
  if (r.imgMeasured && r.imgMeasured.error) catE.push({ id: r.id, url: r.img, error: r.imgMeasured.error });
  if (r.infoJson && r.infoJson.error) catE.push({ id: r.id, url: r.iiif, error: r.infoJson.error });
  if (r.flatMeasured && r.flatMeasured.error) catE.push({ id: r.id, url: r.flatUrl, error: r.flatMeasured.error });
  if (r.commonsMeasured && r.commonsMeasured.error) catE.push({ id: r.id, url: r.img, error: r.commonsMeasured.error });

  // (a) flat clamp lifted
  if (r.flat && r.flatMeasured && !r.flatMeasured.error && r.flatMeasured.w && r.flatMeasured.h) {
    const masterLong = Math.max(r.w, r.h);
    const measLong = Math.max(r.flatMeasured.w, r.flatMeasured.h);
    if (measLong >= FLAT_LIFT_THRESHOLD * masterLong) {
      catA.push({ id: r.id, oldFlat: r.flat, measured: [r.flatMeasured.w, r.flatMeasured.h], masterLong, measLong });
    }
  }

  // (b) img size differs from w,h by >2% on either axis (report only, never applied alone)
  if (r.imgMeasured && !r.imgMeasured.error && r.imgMeasured.w && r.imgMeasured.h) {
    const dw = Math.abs(r.imgMeasured.w - r.w) / r.w;
    const dh = Math.abs(r.imgMeasured.h - r.h) / r.h;
    if (dw > 0.02 || dh > 0.02) {
      catB.push({ id: r.id, w: r.w, h: r.h, measured: [r.imgMeasured.w, r.imgMeasured.h], dw: +(dw * 100).toFixed(1), dh: +(dh * 100).toFixed(1) });
    }
  }

  // (c) iiif info.json differs from w,h
  if (r.infoJson && !r.infoJson.error && r.infoJson.width && r.infoJson.height) {
    if (r.infoJson.width !== r.w || r.infoJson.height !== r.h) {
      const entry = { id: r.id, w: r.w, h: r.h, info: [r.infoJson.width, r.infoJson.height] };
      catC.push(entry);
      // apply only when info.json AND the measured img agree with each other
      if (r.imgMeasured && !r.imgMeasured.error && r.imgMeasured.w === r.infoJson.width && r.imgMeasured.h === r.infoJson.height) {
        catC_apply.push(entry);
      }
    }
  }
}

for (const r of results.imgsize) {
  if (r.error) { catE.push({ id: r.id, url: r.title || '(no commons title)', error: r.error }); continue; }
  if (r.measured && r.measured.error) { catE.push({ id: r.id, url: r.title, error: r.measured.error }); continue; }
  if (r.measured && (r.measured.w !== r.recorded[0] || r.measured.h !== r.recorded[1])) {
    const entry = { id: r.id, recorded: r.recorded, measured: [r.measured.w, r.measured.h] };
    catD.push(entry);
    catD_apply.push(entry);
  }
}

console.log('Category A (flat clamp lifted, APPLY):', catA.length);
console.log('Category B (img != w,h by >2%, REPORT ONLY):', catB.length);
console.log('Category C (iiif info.json != w,h, REPORT ONLY):', catC.length, '  of which agree-with-img and APPLY:', catC_apply.length);
console.log('Category D (art_imgsize != commons truth, APPLY):', catD.length);
console.log('Category E (errors, REPORT ONLY):', catE.length);
console.log('Category F (holder mismatches, REPORT ONLY):', catF.length);

// Write the classification early (even on --dry) so the report generator always has something to
// read; it's harmless to re-write after real edits too, since the classification itself doesn't
// change (it was computed from the audit's measurements, not from the files being edited).
fs.writeFileSync(path.join(DIR, 'plate_audit_classified.json'), JSON.stringify({
  catA, catB, catC, catC_apply, catD, catD_apply, catE, catF,
}, null, 1));
console.log('Wrote plate_audit_classified.json');

if (DRY) { console.log('\n--dry run, stopping before any file edit.'); process.exit(0); }

// ---------- scratchpad before-copies ----------
if (!fs.existsSync(SCRATCH)) fs.mkdirSync(SCRATCH, { recursive: true });
fs.copyFileSync(HIRES_PATH, path.join(SCRATCH, 'art_hires.before.js'));
fs.copyFileSync(IMGSIZE_PATH, path.join(SCRATCH, 'art_imgsize.before.js'));
console.log('Wrote before-copies to', SCRATCH);

// ---------- apply to art_hires.js (line-based) ----------
const hiresRaw = fs.readFileSync(HIRES_PATH, 'utf8');
const nl = hiresRaw.includes('\r\n') ? '\r\n' : '\n';
const lines = hiresRaw.split(nl);

const idToFixes = new Map(); // id -> {flatFix, wh}
for (const e of catA) idToFixes.set(e.id, { ...(idToFixes.get(e.id) || {}), flatLift: e.measured });
for (const e of catC_apply) idToFixes.set(e.id, { ...(idToFixes.get(e.id) || {}), wh: e.info });

let editedLines = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const m = line.match(/^"([^"]+)":\{/) || line.match(/^"([^"]+)":\s*\{/);
  if (!m) continue;
  const id = m[1];
  const fix = idToFixes.get(id);
  if (!fix) continue;

  const trailingComma = /\},?$/.test(line) && line.trimEnd().endsWith(',');
  const braceStart = line.indexOf('{');
  let bodyEnd = line.lastIndexOf('}');
  const jsonText = '{' + line.slice(braceStart + 1, bodyEnd) + '}';
  let obj;
  try { obj = JSON.parse(jsonText); } catch (e) { console.error('PARSE FAIL for', id, e.message); continue; }

  if (fix.flatLift) {
    delete obj.flat;
    const sentence = `flat clamp lifted: server measured serving ${fix.flatLift[0]}\u00d7${fix.flatLift[1]} on ${TODAY}`;
    obj.note = obj.note ? (obj.note + ' ' + sentence) : sentence;
  }
  if (fix.wh) {
    obj.w = fix.wh[0];
    obj.h = fix.wh[1];
  }

  const newBody = JSON.stringify(obj);
  const newLine = '"' + id + '":' + newBody + (trailingComma ? ',' : '');
  lines[i] = newLine;
  editedLines++;
}
console.log('art_hires.js: edited', editedLines, 'line(s) (', idToFixes.size, 'ids targeted).');
fs.writeFileSync(HIRES_PATH, lines.join(nl));

// ---------- apply to art_imgsize.js (targeted substring replace; file is one giant line) ----------
let imgsizeRaw = fs.readFileSync(IMGSIZE_PATH, 'utf8');
let imgsizeEdits = 0;
for (const e of catD_apply) {
  const oldSub = `"${e.id}":[${e.recorded[0]},${e.recorded[1]}]`;
  const newSub = `"${e.id}":[${e.measured[0]},${e.measured[1]}]`;
  if (!imgsizeRaw.includes(oldSub)) {
    console.error('NOT FOUND (skipped):', oldSub);
    continue;
  }
  const before = imgsizeRaw;
  imgsizeRaw = imgsizeRaw.replace(oldSub, newSub);
  if (imgsizeRaw !== before) imgsizeEdits++;
}
console.log('art_imgsize.js: edited', imgsizeEdits, 'entr(y/ies).');
fs.writeFileSync(IMGSIZE_PATH, imgsizeRaw);
