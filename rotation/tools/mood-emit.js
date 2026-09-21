#!/usr/bin/env node
/**
 * mood-emit.js - merges scored rows into rotation/genius-mood.json.
 *
 * Tracked rebuild of the 2026-08 workshop emitters (emit_v2..v6). The row schema, the
 * register vocabulary, the stray remap and the coherence gate are VERBATIM from emit_v6.js
 * - the file that actually wrote the rows now in the corpus.
 *
 *   row     [valence, emoIdx, words, flag, regIdx]      (MOOD_PIPELINE.md section 2)
 *   new row [v,       -1,     0,     1,    regIdx]      no NRC pass behind it
 *   emoIdx  -1  no NRC dominant emotion
 *   words    0  no NRC matched-word count
 *   flag     1  "valence IS the model's"
 *
 * COHERENCE GATE (section 4). A new row has no NRC valence to fall back on, so a
 * self-contradicting read is REFUSED rather than flagged `2`:
 *     incoherent = (v >= 60 && DARK.has(rawReg)) || (v <= 40 && BRIGHT.has(rawReg))
 * The gate reads the RAW register, before the stray remap - same as emit_v3/v6.
 *
 * NEVER touches an existing key. Three proofs say so, printed on every run:
 *   1. per-key deep equality across every pre-existing key
 *   2. BYTE PREFIX: the new serialisation must begin with the old file's exact bytes
 *      (minus its closing brace) - new keys can only be appended
 *   3. count assertions: created + each skip reason == keys examined, and
 *      keysAfter - keysBefore == created
 *
 * DRY-RUN BY DEFAULT. --write is the only way to touch the tracked file.
 *
 * Usage
 *   node mood-emit.js --store <sptmp>/mood-work/scores.jsonl
 *   node mood-emit.js --store ... --samples 8
 *   node mood-emit.js --store ... --write
 */
'use strict';

const fs = require('fs');
const path = require('path');

const TOOLS = __dirname;
const ROTATION = path.dirname(TOOLS);
const REPO = path.dirname(ROTATION);
const WORKSPACE = path.dirname(REPO);
const SPTMP = process.env.ROTATION_SPTMP || path.join(WORKSPACE, '.sptmp');

const MOOD = path.join(ROTATION, 'genius-mood.json');

// ---- VOCABULARY (verbatim from emit_v5/v6) ---------------------------------
// Order is load-bearing: the UI hard-codes these indices (REG_HUES in rotation-media.jsx).
const REG_VOCAB = ['anguished', 'bittersweet', 'bleak', 'tender', 'angry', 'defiant',
  'joyful', 'neutral', 'bitter'];
const REG_IDX = Object.fromEntries(REG_VOCAB.map((r, i) => [r, i]));

const STRAY_MAP = {
  confident: 'defiant',
  resilient: 'defiant',
  optimistic: 'joyful',
  ambiguous: 'neutral',
  melancholic: 'bittersweet',
  pessimistic: 'bleak',
  dark: 'bleak',
  serious: 'bleak',
  evil: 'angry',
  satanic: 'angry',
  sinister: 'angry',
  corrosive: 'angry',
  dominant: 'angry',
  belligerent: 'angry',
  // owner ruling 2026-09-21: a "hard" register is swagger, not rage. The model reached for
  // it once in the 09-21 pilot; this emitter refused that row as unmapped, as designed. It
  // maps to defiant, not angry - and defiant, unlike angry, is absent from the DARK set
  // below, so a bright valence over it is coherent rather than a refusal.
  hard: 'defiant',
};

function resolveReg(raw) {
  const key = String(raw || '').trim().toLowerCase();
  const norm = STRAY_MAP[key] !== undefined ? STRAY_MAP[key] : key;
  if (REG_IDX[norm] === undefined) {
    throw new Error(`UNMAPPED register value: "${raw}" (normalised to "${norm}") - `
      + 'add it to REG_VOCAB or STRAY_MAP before proceeding.');
  }
  return REG_IDX[norm];
}

// ---- COHERENCE GATE SETS (verbatim from emit_v3/v6) ------------------------
const DARK = new Set(['anguished', 'bleak', 'angry', 'bitter', 'pessimistic', 'evil',
  'dark', 'sinister', 'satanic', 'corrosive', 'belligerent']);
const BRIGHT = new Set(['joyful', 'tender', 'confident', 'optimistic', 'resilient']);

// ---- args ------------------------------------------------------------------
const argv = process.argv.slice(2);
function arg(name, dflt) {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
}
const write = argv.includes('--write');
const storePath = arg('--store', path.join(SPTMP, 'mood-work', 'scores.jsonl'));
const nSamples = parseInt(arg('--samples', '6'), 10);

if (!fs.existsSync(storePath)) {
  console.error(`score store not found: ${storePath}`);
  process.exit(2);
}

// ---- load -------------------------------------------------------------------
const oldBytes = fs.readFileSync(MOOD, 'utf8');
const mood = JSON.parse(oldBytes);
const keysBefore = Object.keys(mood).length;
const existingKeys = new Set(Object.keys(mood));
const beforeSnapshot = new Map();
for (const k of existingKeys) beforeSnapshot.set(k, JSON.stringify(mood[k]));

const scores = new Map();
for (const line of fs.readFileSync(storePath, 'utf8').split('\n')) {
  const s = line.trim();
  if (!s) continue;
  let r;
  try { r = JSON.parse(s); } catch { continue; }   // torn line from a crash
  if (r && r.key) scores.set(r.key, r);
}

// ---- merge ------------------------------------------------------------------
let created = 0;
let skippedIncoherent = 0;
let skippedAlready = 0;
let skippedNoScore = 0;
let skippedUnmapped = 0;
const incoherentList = [];
const unmappedList = [];
const samples = [];

for (const [k, s] of scores) {
  if (existingKeys.has(k)) { skippedAlready++; continue; }
  if (s.v === null || s.v === undefined) { skippedNoScore++; continue; }

  const rawReg = String(s.reg || '').trim().toLowerCase();
  const incoherent = (s.v >= 60 && DARK.has(rawReg)) || (s.v <= 40 && BRIGHT.has(rawReg));
  if (incoherent) {
    skippedIncoherent++;
    incoherentList.push({ key: k, v: s.v, reg: rawReg });
    continue;
  }

  let regIdx;
  try {
    regIdx = resolveReg(rawReg);
  } catch (e) {
    skippedUnmapped++;
    unmappedList.push({ key: k, reg: rawReg });
    continue;
  }

  mood[k] = [s.v, -1, 0, 1, regIdx];
  created++;
  if (samples.length < nSamples) {
    samples.push({ key: k, v: s.v, reg: rawReg, regIdx, row: mood[k].slice() });
  }
}

const keysAfter = Object.keys(mood).length;
const newBytes = JSON.stringify(mood);

// ---- PROOFS -----------------------------------------------------------------
console.log('=== mood-emit.js proofs ===\n');
console.log(`store      : ${storePath}`);
console.log(`target     : ${MOOD}\n`);

console.log('COUNTS:');
console.log('  score-store keys examined          :', scores.size);
console.log('  rows CREATED (new genius-mood keys):', created);
console.log('  skipped - incoherent gate          :', skippedIncoherent);
console.log('  skipped - already present in mood  :', skippedAlready);
console.log('  skipped - no usable score          :', skippedNoScore);
console.log('  skipped - unmapped register        :', skippedUnmapped);
const sum = created + skippedIncoherent + skippedAlready + skippedNoScore + skippedUnmapped;
console.log('  sum check (should == examined)     :', sum,
  sum === scores.size ? 'OK' : 'MISMATCH');
console.log();

console.log('KEY COUNT:');
console.log('  genius-mood before :', keysBefore);
console.log('  genius-mood after  :', keysAfter);
console.log('  delta (== created) :', keysAfter - keysBefore,
  (keysAfter - keysBefore) === created ? 'OK' : 'MISMATCH');
console.log();

// proof 1 - per-key deep equality
let mutated = 0;
let deleted = 0;
for (const k of existingKeys) {
  if (mood[k] === undefined) { deleted++; continue; }
  if (JSON.stringify(mood[k]) !== beforeSnapshot.get(k)) mutated++;
}
console.log('PROOF 1 - existing rows unchanged (deep equality over all pre-existing keys):');
console.log(`  compared ${existingKeys.size} keys · mutated ${mutated} · deleted ${deleted}`,
  (mutated === 0 && deleted === 0) ? '· PASS' : '· FAIL');
console.log();

// proof 2 - byte preservation
const oldPrefix = oldBytes.slice(0, oldBytes.length - 1);      // drop the closing '}'
const bytePreserved = newBytes.startsWith(oldPrefix);
console.log('PROOF 2 - BYTE PREFIX (new serialisation begins with the old file, verbatim):');
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

// proof 3 - round-trip parse of the candidate output
let roundTrip = false;
let rtKeys = 0;
try {
  const rt = JSON.parse(newBytes);
  rtKeys = Object.keys(rt).length;
  roundTrip = rtKeys === keysAfter;
} catch (e) { /* roundTrip stays false */ }
console.log('PROOF 3 - candidate output re-parses to the same key count:');
console.log(`  parsed keys ${rtKeys} vs expected ${keysAfter}`, roundTrip ? '· PASS' : '· FAIL');
console.log();

if (incoherentList.length) {
  console.log(`INCOHERENT - refused (${incoherentList.length}):`);
  for (const r of incoherentList.slice(0, 40)) {
    const why = (r.v >= 60 && DARK.has(r.reg))
      ? `v=${r.v}>=60 but reg="${r.reg}" is DARK`
      : `v=${r.v}<=40 but reg="${r.reg}" is BRIGHT`;
    console.log(`  ${r.key}: ${why}`);
  }
  if (incoherentList.length > 40) console.log(`  ... ${incoherentList.length - 40} more`);
  console.log();
}

if (unmappedList.length) {
  console.log(`UNMAPPED REGISTERS - refused (${unmappedList.length}) - add to STRAY_MAP:`);
  for (const r of unmappedList.slice(0, 20)) console.log(`  ${r.key}: reg="${r.reg}"`);
  console.log();
}

console.log(`${samples.length} SAMPLES (key | v | raw reg [regIdx] | final row):`);
for (const s of samples) {
  console.log(`  ${s.key}: v=${s.v} reg="${s.reg}" [${s.regIdx}] row=[${s.row.join(',')}]`);
}
console.log();

// ---- distribution of what would be added (vs MOOD_PIPELINE section 5 gates) ----
if (created) {
  const added = [];
  for (const [k, s] of scores) {
    if (!existingKeys.has(k) && mood[k]) added.push(mood[k]);
  }
  const vs = added.map((r) => r[0]).sort((a, b) => a - b);
  const band = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
  for (const v of vs) {
    band[v <= 20 ? '0-20' : v <= 40 ? '21-40' : v <= 60 ? '41-60'
      : v <= 80 ? '61-80' : '81-100']++;
  }
  const regCount = {};
  for (const r of added) {
    const w = REG_VOCAB[r[4]];
    regCount[w] = (regCount[w] || 0) + 1;
  }
  console.log('DISTRIBUTION of rows this emit would add:');
  console.log(`  median valence ${vs[Math.floor(vs.length / 2)]} · `
    + `mean ${(vs.reduce((a, b) => a + b, 0) / vs.length).toFixed(1)}`);
  console.log('  bands:', Object.fromEntries(Object.entries(band)
    .map(([k, v]) => [k, `${v} (${(v * 100 / vs.length).toFixed(1)}%)`])));
  console.log('  registers:', regCount);
  console.log();
}

// ---- WRITE GATE --------------------------------------------------------------
const proofsPass = mutated === 0 && deleted === 0 && bytePreserved && roundTrip
  && sum === scores.size && (keysAfter - keysBefore) === created;

if (!proofsPass) {
  console.log('WRITE BLOCKED: a proof failed - genius-mood.json NOT written.');
  process.exit(1);
} else if (write) {
  fs.writeFileSync(MOOD, newBytes);
  console.log('WRITTEN: genius-mood.json updated in place (minified, no indent).');
} else {
  console.log('DRY-RUN: all proofs pass. Pass --write to persist.');
}
