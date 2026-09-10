// verify-plate-edits.js — proves the applied edits touched ONLY the intended keys, in ONLY the
// intended fields, by diffing the scratchpad .before.js copies against the live files via eval.
'use strict';
const fs = require('fs');
const path = require('path');
const DIR = __dirname;
const SCRATCH = 'C:/Users/Fuad/AppData/Local/Temp/claude/c--Users-Fuad-Documents-GitHub/43a3ca77-8302-49db-b3f8-49ad0458917f/scratchpad';

function loadStore(file, prop) {
  const w = {}; const saved = global.window; global.window = w;
  eval(fs.readFileSync(file, 'utf8'));
  global.window = saved;
  return w[prop];
}

const hiresBefore = loadStore(path.join(SCRATCH, 'art_hires.before.js'), 'CANVAS_HIRES');
const hiresAfter = loadStore(path.join(DIR, 'art_hires.js'), 'CANVAS_HIRES');
const imgsizeBefore = loadStore(path.join(SCRATCH, 'art_imgsize.before.js'), 'CANVAS_IMGSIZE');
const imgsizeAfter = loadStore(path.join(DIR, 'art_imgsize.js'), 'CANVAS_IMGSIZE');

function diffObjects(before, after, label) {
  const beforeIds = new Set(Object.keys(before));
  const afterIds = new Set(Object.keys(after));
  const changedIds = [];
  for (const id of new Set([...beforeIds, ...afterIds])) {
    const b = JSON.stringify(before[id]);
    const a = JSON.stringify(after[id]);
    if (b !== a) changedIds.push(id);
  }
  console.log(`\n== ${label}: ${changedIds.length} id(s) changed ==`);
  for (const id of changedIds) {
    const b = before[id] || {};
    const a = after[id] || {};
    const keys = new Set([...Object.keys(b), ...Object.keys(a)]);
    const fieldDiffs = [];
    for (const k of keys) {
      const bv = JSON.stringify(b[k]);
      const av = JSON.stringify(a[k]);
      if (bv !== av) fieldDiffs.push(`${k}: ${bv} -> ${av}`);
    }
    console.log(' -', id);
    for (const fd of fieldDiffs) console.log('     ' + fd);
  }
  return changedIds;
}

const hiresChanged = diffObjects(hiresBefore, hiresAfter, 'art_hires.js');
const imgsizeChanged = diffObjects(imgsizeBefore, imgsizeAfter, 'art_imgsize.js');

// sanity: only expected field names should ever change on a hires row
const ALLOWED_HIRES_FIELDS = new Set(['flat', 'note', 'w', 'h']);
let bad = 0;
for (const id of hiresChanged) {
  const b = hiresBefore[id] || {}, a = hiresAfter[id] || {};
  const keys = new Set([...Object.keys(b), ...Object.keys(a)]);
  for (const k of keys) {
    if (JSON.stringify(b[k]) !== JSON.stringify(a[k]) && !ALLOWED_HIRES_FIELDS.has(k)) {
      console.error('UNEXPECTED FIELD CHANGED:', id, k);
      bad++;
    }
  }
}
console.log('\nUnexpected-field violations:', bad);
console.log('Total hires ids touched:', hiresChanged.length, ' | Total imgsize ids touched:', imgsizeChanged.length);
