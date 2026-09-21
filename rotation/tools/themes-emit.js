#!/usr/bin/env node
/**
 * themes-emit.js - merges classified rows into rotation/genius-themes.json.
 *
 * File shape (see MOOD_PIPELINE.md's sibling layer, and genius-themes.py of 2026-07-05):
 *   {"_themes": [ ...18 bucket names, order load-bearing... ],
 *    "artistslug~trackslug": [[themeIdx, score0-100], ... up to 3]}
 *
 * Score is round(cosine * 100) with a 0.24 floor, top 3 - identical normalisation to the
 * rows already in the file, which is why this emitter does no rescaling of its own. It
 * DOES report the new rows' score distribution against the existing one so a drift shows
 * up in the proof block rather than in the UI a week later.
 *
 * Guarantees, proved on every run:
 *   1. "_themes" is byte-identical and still the first key
 *   2. no pre-existing track row is mutated or deleted (deep equality, all keys)
 *   3. BYTE PREFIX: the new serialisation begins with the old file's exact bytes
 *   4. count assertions: created + skips == examined; keysAfter - keysBefore == created
 *
 * DRY-RUN BY DEFAULT. --write is the only way to touch the tracked file.
 *
 * Usage
 *   node themes-emit.js --store <sptmp>/themes-work/themes.jsonl
 *   node themes-emit.js --store ... --write
 */
'use strict';

const fs = require('fs');
const path = require('path');

const TOOLS = __dirname;
const ROTATION = path.dirname(TOOLS);
const REPO = path.dirname(ROTATION);
const WORKSPACE = path.dirname(REPO);
const SPTMP = process.env.ROTATION_SPTMP || path.join(WORKSPACE, '.sptmp');

const THEMES_FILE = path.join(ROTATION, 'genius-themes.json');
const TOP_K = 3;
const FLOOR_SCORE = 24;   // round(0.24 * 100) - the floor genius-themes.py applied

const argv = process.argv.slice(2);
function arg(name, dflt) {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
}
const write = argv.includes('--write');
const storePath = arg('--store', path.join(SPTMP, 'themes-work', 'themes.jsonl'));
const nSamples = parseInt(arg('--samples', '6'), 10);

if (!fs.existsSync(storePath)) {
  console.error(`themes store not found: ${storePath}`);
  process.exit(2);
}

// ---- load --------------------------------------------------------------------
const oldBytes = fs.readFileSync(THEMES_FILE, 'utf8');
const themes = JSON.parse(oldBytes);
const chart = themes._themes;
const chartBytes = JSON.stringify(chart);
const firstKeyWas = Object.keys(themes)[0];

const existingKeys = new Set(Object.keys(themes));
const beforeSnapshot = new Map();
for (const k of existingKeys) beforeSnapshot.set(k, JSON.stringify(themes[k]));
const keysBefore = Object.keys(themes).length;

const rows = [];
for (const line of fs.readFileSync(storePath, 'utf8').split('\n')) {
  const s = line.trim();
  if (!s) continue;
  let r;
  try { r = JSON.parse(s); } catch { continue; }
  if (r && r.key && Array.isArray(r.picks)) rows.push(r);
}

// ---- merge -------------------------------------------------------------------
let created = 0;
let skippedAlready = 0;
let skippedEmpty = 0;
let skippedMalformed = 0;
const malformed = [];
const samples = [];

for (const r of rows) {
  if (r.key === '_themes') { skippedMalformed++; malformed.push({ key: r.key, why: 'reserved key' }); continue; }
  if (existingKeys.has(r.key)) { skippedAlready++; continue; }
  if (!r.picks.length) { skippedEmpty++; continue; }

  let bad = null;
  if (r.picks.length > TOP_K) bad = `more than ${TOP_K} picks`;
  for (const p of r.picks) {
    if (!Array.isArray(p) || p.length !== 2) { bad = 'pick is not a [idx, score] pair'; break; }
    if (!Number.isInteger(p[0]) || p[0] < 0 || p[0] >= chart.length) { bad = `themeIdx ${p[0]} out of range`; break; }
    if (!Number.isInteger(p[1]) || p[1] < FLOOR_SCORE || p[1] > 100) { bad = `score ${p[1]} outside [${FLOOR_SCORE},100]`; break; }
  }
  if (bad) { skippedMalformed++; malformed.push({ key: r.key, why: bad }); continue; }

  themes[r.key] = r.picks;
  created++;
  if (samples.length < nSamples) {
    samples.push({
      key: r.key,
      picks: r.picks,
      named: r.picks.map((p) => `${chart[p[0]]}=${p[1]}`).join(', '),
    });
  }
}

const keysAfter = Object.keys(themes).length;
const newBytes = JSON.stringify(themes);

// ---- PROOFS --------------------------------------------------------------------
console.log('=== themes-emit.js proofs ===\n');
console.log(`store  : ${storePath}`);
console.log(`target : ${THEMES_FILE}\n`);

console.log('COUNTS:');
console.log('  store rows examined                 :', rows.length);
console.log('  rows CREATED (new genius-themes keys):', created);
console.log('  skipped - already present            :', skippedAlready);
console.log('  skipped - no theme above the floor   :', skippedEmpty);
console.log('  skipped - malformed                  :', skippedMalformed);
const sum = created + skippedAlready + skippedEmpty + skippedMalformed;
console.log('  sum check (should == examined)       :', sum,
  sum === rows.length ? 'OK' : 'MISMATCH');
console.log();

console.log('KEY COUNT:');
console.log('  genius-themes before :', keysBefore, `(incl. "_themes")`);
console.log('  genius-themes after  :', keysAfter);
console.log('  delta (== created)   :', keysAfter - keysBefore,
  (keysAfter - keysBefore) === created ? 'OK' : 'MISMATCH');
console.log();

// proof 1 - the chart
const chartSame = JSON.stringify(themes._themes) === chartBytes;
const firstKeyStill = Object.keys(themes)[0] === firstKeyWas && firstKeyWas === '_themes';
console.log('PROOF 1 - the 18-bucket chart is untouched and still first:');
console.log(`  "_themes" byte-identical : ${chartSame ? 'PASS' : 'FAIL'}`);
console.log(`  still the first key      : ${firstKeyStill ? 'PASS' : 'FAIL'}`);
console.log(`  buckets                  : ${chart.length}`);
console.log();

// proof 2 - existing rows
let mutated = 0;
let deleted = 0;
for (const k of existingKeys) {
  if (themes[k] === undefined) { deleted++; continue; }
  if (JSON.stringify(themes[k]) !== beforeSnapshot.get(k)) mutated++;
}
console.log('PROOF 2 - existing rows unchanged (deep equality over all pre-existing keys):');
console.log(`  compared ${existingKeys.size} keys · mutated ${mutated} · deleted ${deleted}`,
  (mutated === 0 && deleted === 0) ? '· PASS' : '· FAIL');
console.log();

// proof 3 - byte prefix
const oldPrefix = oldBytes.slice(0, oldBytes.length - 1);
const bytePreserved = newBytes.startsWith(oldPrefix);
console.log('PROOF 3 - BYTE PREFIX (new serialisation begins with the old file, verbatim):');
console.log(`  old file bytes          : ${oldBytes.length}`);
console.log(`  new serialisation bytes : ${newBytes.length}`);
console.log(`  appended bytes          : ${newBytes.length - oldBytes.length}`);
console.log(`  prefix match            : ${bytePreserved ? 'PASS' : 'FAIL'}`);
if (!bytePreserved) {
  let i = 0;
  while (i < oldPrefix.length && oldPrefix[i] === newBytes[i]) i++;
  console.log(`  first divergence at byte ${i}`);
}
console.log();

// proof 4 - round trip
let roundTrip = false;
let rtKeys = 0;
try {
  const rt = JSON.parse(newBytes);
  rtKeys = Object.keys(rt).length;
  roundTrip = rtKeys === keysAfter && JSON.stringify(rt._themes) === chartBytes;
} catch (e) { /* stays false */ }
console.log('PROOF 4 - candidate output re-parses with the same keys and chart:');
console.log(`  parsed keys ${rtKeys} vs expected ${keysAfter}`, roundTrip ? '· PASS' : '· FAIL');
console.log();

if (malformed.length) {
  console.log(`MALFORMED - refused (${malformed.length}):`);
  for (const m of malformed.slice(0, 20)) console.log(`  ${m.key}: ${m.why}`);
  console.log();
}

console.log(`${samples.length} SAMPLES (key | picks | named):`);
for (const s of samples) {
  console.log(`  ${s.key}: ${JSON.stringify(s.picks)}  ->  ${s.named}`);
}
console.log();

// ---- distribution check vs the existing corpus ---------------------------------
if (created) {
  function summarise(rowsIn) {
    const primary = {};
    const scores = [];
    let nPicks = 0;
    for (const r of rowsIn) {
      primary[chart[r[0][0]]] = (primary[chart[r[0][0]]] || 0) + 1;
      nPicks += r.length;
      for (const p of r) scores.push(p[1]);
    }
    scores.sort((a, b) => a - b);
    return {
      n: rowsIn.length,
      primary,
      picksPerTrack: (nPicks / rowsIn.length).toFixed(2),
      topScoreMedian: scores.length ? scores[Math.floor(scores.length / 2)] : null,
      scoreMean: scores.length
        ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : null,
    };
  }
  const oldRows = [];
  for (const k of existingKeys) if (k !== '_themes') oldRows.push(beforeSnapshot.get(k) ? JSON.parse(beforeSnapshot.get(k)) : null);
  const newRows = [];
  for (const r of rows) if (!existingKeys.has(r.key) && themes[r.key]) newRows.push(themes[r.key]);

  const A = summarise(oldRows.filter(Boolean));
  const B = summarise(newRows);
  console.log('DISTRIBUTION - existing corpus vs the rows this emit would add:');
  console.log(`  tracks            : ${A.n}  ->  +${B.n}`);
  console.log(`  picks per track   : ${A.picksPerTrack}  ->  ${B.picksPerTrack}`);
  console.log(`  score mean/median : ${A.scoreMean}/${A.topScoreMedian}  ->  ${B.scoreMean}/${B.topScoreMedian}`);
  const topOld = Object.entries(A.primary).sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([k, v]) => `${k} ${(v * 100 / A.n).toFixed(1)}%`);
  const topNew = Object.entries(B.primary).sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([k, v]) => `${k} ${(v * 100 / B.n).toFixed(1)}%`);
  console.log('  existing primaries:', topOld.join(' · '));
  console.log('  new primaries     :', topNew.join(' · '));
  console.log();
}

// ---- WRITE GATE ------------------------------------------------------------------
const proofsPass = chartSame && firstKeyStill && mutated === 0 && deleted === 0
  && bytePreserved && roundTrip && sum === rows.length
  && (keysAfter - keysBefore) === created;

if (!proofsPass) {
  console.log('WRITE BLOCKED: a proof failed - genius-themes.json NOT written.');
  process.exit(1);
} else if (write) {
  fs.writeFileSync(THEMES_FILE, newBytes);
  console.log('WRITTEN: genius-themes.json updated in place (minified, no indent).');
} else {
  console.log('DRY-RUN: all proofs pass. Pass --write to persist.');
}
