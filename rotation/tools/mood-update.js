#!/usr/bin/env node
/**
 * mood-update.js - updates EXISTING rows in rotation/genius-mood.json, in place.
 *
 * The counterpart to mood-emit.js, and the deliberate exception to it. mood-emit.js CREATES
 * rows and proves it never touched one that already existed (deep equality + a byte-prefix
 * proof). That is the right default and it stays the default. This tool exists for the one
 * case that default cannot serve: a row the INSTRUMENT OF RECORD has superseded - a pre-Qwen
 * three-element row whose valence is NULL, or whose NRC valence carries no register, now read
 * whole by the model. Writing those means mutating existing rows, so emit's proofs 1 and 2
 * fail by construction; the proofs below are their mutation-shaped equivalents.
 *
 *   row (documented, MOOD_PIPELINE.md section 2)
 *       [valence, emoIdx, words, flag?, regIdx?]
 *   before  [null, emoIdx, words]      pre-Qwen, NRC pass but no model valence
 *   before  [v,    emoIdx, words]      pre-Qwen, NRC valence, no register
 *   after   [v,    emoIdx, words, 1, regIdx]
 *
 * emoIdx and words are NRC's and are PRESERVED verbatim - section 2 is explicit that emoIdx
 * is kept even where valence was replaced. Only valence, flag and regIdx are written. flag 1
 * = "valence IS the model's".
 *
 * The register vocabulary, the stray remap and the COHERENCE GATE are verbatim from
 * mood-emit.js (itself verbatim from emit_v6.js). The gate reads the RAW register, before the
 * stray remap. A straggler row has no NRC valence to fall back on (49 of the 59 are NULL), so
 * a self-contradicting read is REFUSED rather than flagged `2` - the new-row policy of
 * MOOD_PIPELINE.md section 4, applied because the fallback the flag-`2` policy needs is
 * exactly what these rows lack.
 *
 * ALLOWLIST. Nothing is written that is not on an explicit allowlist derived from the input
 * and PRINTED in full. A key joins it only if: it is present in the score store with a usable
 * score; it EXISTS in genius-mood.json (an update cannot create); its existing row is a
 * three-element pre-model row (a row already carrying a full read is refused BY NAME and
 * asserted absent from the allowlist); it clears the coherence gate; its register maps.
 *
 * PROOFS - printed dry-run first, then re-run against the bytes on disk after the write:
 *   A. MASKED SERIALISATION - the store serialised with every allowlisted row replaced by a
 *      sentinel must be byte-identical before and after, with the same number of sentinels on
 *      both sides, and the key sequence unchanged. Every row NOT on the allowlist is
 *      therefore byte-identical, and no key was added, removed or reordered.
 *   B. SCHEMA - every updated row is the documented five-element row with a valid register,
 *      NRC's emoIdx and words preserved verbatim, and the updated count equals the allowlist.
 *   C. ROUND TRIP - the serialisation re-parses and re-serialises to the same bytes, at the
 *      same total key count.
 *   D. FAULT INJECTION - synthetic rows with a bad key or a bad shape are pushed through the
 *      same classifier the real pass uses and must each be refused BY NAME.
 *
 * DRY-RUN BY DEFAULT. --write is the only way to touch the tracked file, and it is gated on
 * every proof passing. A pre-write copy of the store is kept in the scratch dir.
 *
 * Usage
 *   node mood-update.js --store <sptmp>/mood-work/straggler-scores.jsonl
 *   node mood-update.js --store ... --roster <sptmp>/mood-work/stragglers.txt
 *   node mood-update.js --store ... --roster ... --write
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

// ---- VOCABULARY (verbatim from mood-emit.js) -------------------------------
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

// ---- COHERENCE GATE SETS (verbatim from mood-emit.js) ----------------------
const DARK = new Set(['anguished', 'bleak', 'angry', 'bitter', 'pessimistic', 'evil',
  'dark', 'sinister', 'satanic', 'corrosive', 'belligerent']);
const BRIGHT = new Set(['joyful', 'tender', 'confident', 'optimistic', 'resilient']);

const FLAG_MODEL_VALENCE = 1;

// ---- args ------------------------------------------------------------------
const argv = process.argv.slice(2);
function arg(name, dflt) {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
}
const write = argv.includes('--write');
const storePath = arg('--store', path.join(SPTMP, 'mood-work', 'straggler-scores.jsonl'));
const rosterPath = arg('--roster', '');
const nSamples = parseInt(arg('--samples', '3'), 10);
const backupPath = arg('--backup',
  path.join(SPTMP, 'mood-work', 'genius-mood.pre-update.json'));

if (!fs.existsSync(storePath)) {
  console.error(`score store not found: ${storePath}`);
  process.exit(2);
}

// ---- THE CLASSIFIER --------------------------------------------------------
// One function decides every key, for the real pass AND for fault injection, so proof D
// exercises the code that actually runs.
//   existing = the row currently in genius-mood.json, or undefined
// Returns { ok: true, row, regIdx } or { ok: false, reason, detail }.
function classify(key, s, existing) {
  if (typeof key !== 'string' || !key) {
    return { ok: false, reason: 'bad-key', detail: `key is ${JSON.stringify(key)}` };
  }
  if (existing === undefined) {
    return {
      ok: false,
      reason: 'not-in-store',
      detail: 'key absent from genius-mood.json - an update cannot create rows',
    };
  }
  if (!Array.isArray(existing) || existing.length < 3
      || !Number.isInteger(existing[1]) || !Number.isInteger(existing[2])
      || !(existing[0] === null || Number.isInteger(existing[0]))) {
    return {
      ok: false,
      reason: 'bad-existing-row',
      detail: `existing row is not [valence|null, emoIdx, words]: ${JSON.stringify(existing)}`,
    };
  }
  if (existing.length >= 4) {
    return {
      ok: false,
      reason: 'already-full-read',
      detail: `existing row already carries flag/register (${existing.length} elements)`,
    };
  }
  if (!s || typeof s !== 'object') {
    return { ok: false, reason: 'no-usable-score', detail: 'no score object' };
  }
  if (s.v === null || s.v === undefined || !Number.isInteger(s.v)) {
    return { ok: false, reason: 'no-usable-score', detail: `v is ${JSON.stringify(s.v)}` };
  }
  if (s.v < 0 || s.v > 100) {
    return { ok: false, reason: 'valence-out-of-range', detail: `v=${s.v} outside 0-100` };
  }
  const rawReg = String(s.reg || '').trim().toLowerCase();
  const incoherent = (s.v >= 60 && DARK.has(rawReg)) || (s.v <= 40 && BRIGHT.has(rawReg));
  if (incoherent) {
    return {
      ok: false,
      reason: 'incoherent',
      detail: (s.v >= 60 && DARK.has(rawReg))
        ? `v=${s.v}>=60 but reg="${rawReg}" is DARK (no NRC valence to fall back on)`
        : `v=${s.v}<=40 but reg="${rawReg}" is BRIGHT (no NRC valence to fall back on)`,
    };
  }
  let regIdx;
  try {
    regIdx = resolveReg(rawReg);
  } catch (e) {
    return { ok: false, reason: 'unmapped-register', detail: `reg="${rawReg}"` };
  }
  return {
    ok: true,
    regIdx,
    row: [s.v, existing[1], existing[2], FLAG_MODEL_VALENCE, regIdx],
  };
}

// ---- load ------------------------------------------------------------------
const oldBytes = fs.readFileSync(MOOD, 'utf8');
const before = JSON.parse(oldBytes);           // untouched reference copy
const mood = JSON.parse(oldBytes);             // the copy we mutate
const keysBefore = Object.keys(mood).length;

const scores = new Map();
let tornLines = 0;
for (const line of fs.readFileSync(storePath, 'utf8').split('\n')) {
  const t = line.trim();
  if (!t) continue;
  let r;
  try { r = JSON.parse(t); } catch { tornLines++; continue; }   // torn line from a crash
  if (r && r.key) scores.set(r.key, r);
}

let roster = null;
if (rosterPath) {
  if (!fs.existsSync(rosterPath)) {
    console.error(`roster not found: ${rosterPath}`);
    process.exit(2);
  }
  roster = fs.readFileSync(rosterPath, 'utf8').split('\n')
    .map((s) => s.trim()).filter(Boolean);
}

// ---- derive the allowlist --------------------------------------------------
const allow = [];                 // [{ key, v, reg, regIdx, oldRow, newRow }]
const refused = [];               // [{ key, reason, detail }]
const byReason = {};

for (const [k, s] of scores) {
  const verdict = classify(k, s, mood[k]);
  if (!verdict.ok) {
    refused.push({ key: k, reason: verdict.reason, detail: verdict.detail });
    byReason[verdict.reason] = (byReason[verdict.reason] || 0) + 1;
    continue;
  }
  allow.push({
    key: k,
    v: s.v,
    reg: String(s.reg || '').trim().toLowerCase(),
    regIdx: verdict.regIdx,
    oldRow: before[k].slice(),
    newRow: verdict.row,
  });
}
const allowSet = new Set(allow.map((a) => a.key));

// rule: a row already carrying a full read must NEVER be on the allowlist
const fullReadOnAllowlist = allow.filter((a) => a.oldRow.length >= 4);

// ---- apply (in memory) -----------------------------------------------------
for (const a of allow) mood[a.key] = a.newRow;
const keysAfter = Object.keys(mood).length;
const newBytes = JSON.stringify(mood);

// ---- proof machinery -------------------------------------------------------
const MASK = '<<<ALLOWLISTED-ROW-MASKED>>>';

function maskedSerialise(obj, keys) {
  const out = {};
  for (const k of Object.keys(obj)) out[k] = keys.has(k) ? MASK : obj[k];
  return JSON.stringify(out);
}
function countMasks(s) {
  return s.split(JSON.stringify(MASK)).length - 1;
}

function schemaCheck(row) {
  if (!Array.isArray(row) || row.length !== 5) return 'not a 5-element row';
  const [v, emo, words, flag, reg] = row;
  if (!Number.isInteger(v) || v < 0 || v > 100) return `valence ${JSON.stringify(v)}`;
  if (!Number.isInteger(emo) || emo < -1) return `emoIdx ${JSON.stringify(emo)}`;
  if (!Number.isInteger(words) || words < 0) return `words ${JSON.stringify(words)}`;
  if (flag !== FLAG_MODEL_VALENCE) return `flag ${JSON.stringify(flag)}`;
  if (!Number.isInteger(reg) || reg < 0 || reg >= REG_VOCAB.length) {
    return `regIdx ${JSON.stringify(reg)}`;
  }
  return null;
}

// Proof D operands. Each must come back refused, by the named reason.
// Every case carries its own `existing` row, so the suite is identical before and after the
// write - it never depends on whether a row has already been updated in the store it is
// handed. `store` supplies the two cases that are about the REAL store: a key that is not in
// it, and a key that is (and already carries a full read).
function faultCases(store) {
  const fullReadKey = Object.keys(store)
    .find((k) => Array.isArray(store[k]) && store[k].length >= 5);
  const pristineKey = allow.length ? allow[0].key : '<no-allowlisted-key>';
  const pristineRow = allow.length ? allow[0].oldRow.slice() : [null, 1, 5];
  const cases = [
    {
      name: 'key not present in genius-mood.json',
      key: 'synthetic~key-that-cannot-exist-0000',
      existing: store['synthetic~key-that-cannot-exist-0000'],
      score: { v: 50, reg: 'neutral' },
      expect: 'not-in-store',
    },
    {
      name: 'key of the wrong type (null)',
      key: null,
      existing: undefined,
      score: { v: 50, reg: 'neutral' },
      expect: 'bad-key',
    },
    {
      name: 'real key that already carries a full read',
      key: fullReadKey,
      existing: fullReadKey === undefined ? undefined : store[fullReadKey],
      score: { v: 50, reg: 'neutral' },
      expect: 'already-full-read',
    },
    {
      name: 'bad shape - existing row is not [valence|null, emoIdx, words]',
      key: pristineKey,
      existing: [50, 'not-an-emoIdx'],
      score: { v: 50, reg: 'neutral' },
      expect: 'bad-existing-row',
    },
    {
      name: 'bad shape - valence null',
      key: pristineKey,
      existing: pristineRow,
      score: { v: null, reg: 'neutral' },
      expect: 'no-usable-score',
    },
    {
      name: 'bad shape - valence not an integer',
      key: pristineKey,
      existing: pristineRow,
      score: { v: '50', reg: 'neutral' },
      expect: 'no-usable-score',
    },
    {
      name: 'bad shape - valence out of range',
      key: pristineKey,
      existing: pristineRow,
      score: { v: 150, reg: 'neutral' },
      expect: 'valence-out-of-range',
    },
    {
      name: 'bad shape - register absent from vocabulary and stray map',
      key: pristineKey,
      existing: pristineRow,
      score: { v: 50, reg: 'wobbly' },
      expect: 'unmapped-register',
    },
    {
      name: 'coherence gate - bright valence over a dark register',
      key: pristineKey,
      existing: pristineRow,
      score: { v: 80, reg: 'bleak' },
      expect: 'incoherent',
    },
  ];
  return cases.filter((c) => c.key !== undefined);
}

function runProofs(label, oldSerial, newSerial, store) {
  const res = {};
  const oldObj = JSON.parse(oldSerial);
  const newObj = JSON.parse(newSerial);

  console.log(`--- PROOFS (${label}) ---\n`);

  // A - masked serialisation
  const maskedOld = maskedSerialise(oldObj, allowSet);
  const maskedNew = maskedSerialise(newObj, allowSet);
  const masksOld = countMasks(maskedOld);
  const masksNew = countMasks(maskedNew);
  const oldKeys = Object.keys(oldObj);
  const newKeys = Object.keys(newObj);
  const seqSame = oldKeys.length === newKeys.length
    && oldKeys.every((k, i) => k === newKeys[i]);
  res.A = maskedOld === maskedNew && masksOld === allowSet.size
    && masksNew === allowSet.size && seqSame;
  console.log('PROOF A - every row NOT on the allowlist is byte-identical:');
  console.log(`  masked serialisation bytes : before ${maskedOld.length}`
    + ` · after ${maskedNew.length}`);
  console.log(`  masked rows                : before ${masksOld} · after ${masksNew}`
    + ` · allowlist ${allowSet.size}`);
  console.log(`  key sequence unchanged     : ${seqSame ? 'yes' : 'NO'}`
    + ` (${Object.keys(oldObj).length} -> ${Object.keys(newObj).length})`);
  console.log(`  masked bytes identical     : ${maskedOld === maskedNew ? 'yes' : 'NO'}`);
  if (maskedOld !== maskedNew) {
    let i = 0;
    while (i < maskedOld.length && maskedOld[i] === maskedNew[i]) i++;
    console.log(`  first divergence at byte ${i}`);
  }
  console.log(`  => ${res.A ? 'PASS' : 'FAIL'}\n`);

  // B - schema of the updated rows
  let schemaBad = 0;
  let preservedBad = 0;
  let updatedSeen = 0;
  const firstBad = [];
  for (const a of allow) {
    const row = newObj[a.key];
    updatedSeen++;
    const why = schemaCheck(row);
    if (why) {
      schemaBad++;
      if (firstBad.length < 5) firstBad.push(`${a.key}: ${why}`);
      continue;
    }
    if (row[1] !== oldObj[a.key][1] || row[2] !== oldObj[a.key][2]) {
      preservedBad++;
      if (firstBad.length < 5) firstBad.push(`${a.key}: NRC emoIdx/words not preserved`);
      continue;
    }
    if (row[0] !== a.v || row[4] !== a.regIdx) {
      schemaBad++;
      if (firstBad.length < 5) firstBad.push(`${a.key}: not the scored valence/register`);
    }
  }
  res.B = schemaBad === 0 && preservedBad === 0 && updatedSeen === allowSet.size;
  console.log('PROOF B - updated rows parse as the documented schema:');
  console.log(`  rows checked ${updatedSeen} vs allowlist ${allowSet.size}`);
  console.log(`  schema violations ${schemaBad} · NRC emoIdx/words not preserved ${preservedBad}`);
  for (const b of firstBad) console.log(`    ${b}`);
  console.log(`  => ${res.B ? 'PASS' : 'FAIL'}\n`);

  // C - round trip
  let rtKeys = 0;
  let rtBytes = false;
  try {
    const rt = JSON.parse(newSerial);
    rtKeys = Object.keys(rt).length;
    rtBytes = JSON.stringify(rt) === newSerial;
  } catch (e) { /* stays false */ }
  res.C = rtBytes && rtKeys === keysAfter && rtKeys === keysBefore;
  console.log('PROOF C - round-trip parse:');
  console.log(`  re-parsed keys ${rtKeys} · expected ${keysAfter} (before ${keysBefore})`);
  console.log(`  re-serialises to identical bytes: ${rtBytes ? 'yes' : 'NO'}`);
  console.log(`  => ${res.C ? 'PASS' : 'FAIL'}\n`);

  // D - fault injection through the real classifier
  const cases = faultCases(store);
  let faultBad = 0;
  console.log('PROOF D - fault injection (same classifier the real pass uses):');
  for (const c of cases) {
    const v = classify(c.key, c.score, c.existing);
    const got = v.ok ? 'ACCEPTED' : v.reason;
    const good = !v.ok && v.reason === c.expect;
    if (!good) faultBad++;
    console.log(`  ${good ? 'refused' : '!! NOT REFUSED AS EXPECTED'} [${got}]`
      + ` expected [${c.expect}] · ${c.name}`);
  }
  res.D = faultBad === 0 && cases.length >= 6;
  console.log(`  ${cases.length} synthetic cases · ${faultBad} wrong`
    + ` => ${res.D ? 'PASS' : 'FAIL'}\n`);

  res.all = res.A && res.B && res.C && res.D;
  return res;
}

// ---- report ----------------------------------------------------------------
console.log('=== mood-update.js - IN-PLACE update of superseded rows ===\n');
console.log(`store   : ${storePath}`);
console.log(`roster  : ${rosterPath || '(none)'}`);
console.log(`target  : ${MOOD}`);
console.log(`mode    : ${write ? 'WRITE (gated on every proof)' : 'DRY-RUN'}\n`);

console.log('COUNTS:');
console.log('  score-store rows examined     :', scores.size,
  tornLines ? `(${tornLines} torn lines skipped)` : '');
console.log('  ALLOWLIST (rows to update)    :', allow.length);
console.log('  refused                       :', refused.length);
for (const [r, n] of Object.entries(byReason)) console.log(`      ${r.padEnd(22)}: ${n}`);
const sum = allow.length + refused.length;
console.log('  sum check (== examined)       :', sum, sum === scores.size ? 'OK' : 'MISMATCH');
console.log('  genius-mood keys before/after :', keysBefore, '/', keysAfter,
  keysBefore === keysAfter ? '(unchanged, as an update must be)' : 'MISMATCH - row count moved');
console.log();

console.log('RULE - rows already carrying a full read are never touched:');
console.log(`  allowlisted keys whose existing row has >=4 elements: ${fullReadOnAllowlist.length}`,
  fullReadOnAllowlist.length === 0 ? '· ASSERTION HOLDS' : '· ASSERTION VIOLATED');
for (const a of fullReadOnAllowlist) console.log(`    !! ${a.key} ${JSON.stringify(a.oldRow)}`);
console.log();

if (roster) {
  const scoredSet = new Set(scores.keys());
  const rosterSet = new Set(roster);
  const noLine = roster.filter((k) => !scoredSet.has(k));
  const extra = [...scoredSet].filter((k) => !rosterSet.has(k));
  console.log('ROSTER RECONCILIATION:');
  console.log(`  roster keys ${roster.length} · scored ${roster.length - noLine.length}`
    + ` · no score line ${noLine.length} · scored but off-roster ${extra.length}`);
  const recon = allow.length + refused.length + noLine.length;
  console.log('  roster == allowlist + refused + no-score-line : '
    + `${allow.length} + ${refused.length} + ${noLine.length} = ${recon}`,
  recon === roster.length ? 'OK' : 'MISMATCH');
  if (noLine.length) {
    console.log('  NO SCORE LINE (never reached the scorer - no obtainable lyric upstream):');
    for (const k of noLine) console.log(`    ${k} ${JSON.stringify(before[k])}`);
  }
  if (extra.length) for (const k of extra) console.log(`  OFF-ROSTER: ${k}`);
  console.log();
}

if (refused.length) {
  console.log(`REFUSED BY THE GATES (${refused.length}) - left untouched:`);
  for (const r of refused) {
    const row = before[r.key] !== undefined ? before[r.key] : null;
    console.log(`  ${r.key} ${JSON.stringify(row)}`);
    console.log(`      [${r.reason}] ${r.detail}`);
  }
  console.log();
}

console.log(`ALLOWLIST (${allow.length}) - the only keys this run may write:`);
for (const a of allow) {
  console.log(`  ${a.key}`.padEnd(64)
    + ` ${JSON.stringify(a.oldRow)} -> ${JSON.stringify(a.newRow)}  (${a.reg})`);
}
console.log();

if (allow.length) {
  const vs = allow.map((a) => a.v).sort((x, y) => x - y);
  const regCount = {};
  for (const a of allow) {
    const w = REG_VOCAB[a.regIdx];
    regCount[w] = (regCount[w] || 0) + 1;
  }
  const hadNull = allow.filter((a) => a.oldRow[0] === null).length;
  console.log('WHAT THE UPDATE DOES:');
  console.log(`  rows that had a NULL valence : ${hadNull}`);
  console.log(`  rows that had an NRC valence : ${allow.length - hadNull}`
    + " (replaced by the model's, flag 1)");
  console.log(`  median valence ${vs[Math.floor(vs.length / 2)]} · `
    + `mean ${(vs.reduce((a, b) => a + b, 0) / vs.length).toFixed(1)}`);
  console.log('  registers:', regCount);
  console.log();

  console.log(`${Math.min(nSamples, allow.length)} SAMPLES (key | before -> after):`);
  for (const a of allow.slice(0, nSamples)) {
    console.log(`  ${a.key}: ${JSON.stringify(a.oldRow)} -> ${JSON.stringify(a.newRow)}`
      + ` · v=${a.v} reg="${a.reg}" [${a.regIdx}]`);
  }
  console.log();
}

// ---- DRY-RUN PROOFS --------------------------------------------------------
const dry = runProofs('dry-run, against the candidate serialisation', oldBytes, newBytes, mood);

const countsOK = sum === scores.size && keysBefore === keysAfter
  && fullReadOnAllowlist.length === 0 && allow.length === allowSet.size;
console.log('COUNT ASSERTIONS:', countsOK ? 'PASS' : 'FAIL');
console.log();

if (!(dry.all && countsOK)) {
  console.log('WRITE BLOCKED: a proof failed - genius-mood.json NOT written.');
  process.exit(1);
}

if (!write) {
  console.log('DRY-RUN: all proofs pass. Pass --write to persist.');
  process.exit(0);
}

// ---- WRITE -----------------------------------------------------------------
try {
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.writeFileSync(backupPath, oldBytes);
  console.log(`pre-write copy kept at ${backupPath}`);
} catch (e) {
  console.log(`WRITE BLOCKED: could not keep a pre-write copy (${e.message})`);
  process.exit(1);
}

fs.writeFileSync(MOOD, newBytes);
console.log('WRITTEN: genius-mood.json updated in place (minified, no indent).\n');

// ---- POST-WRITE RE-VERIFICATION -------------------------------------------
const diskBytes = fs.readFileSync(MOOD, 'utf8');
const diskMatches = diskBytes === newBytes;
console.log('POST-WRITE:');
console.log(`  bytes on disk == candidate serialisation : ${diskMatches ? 'yes' : 'NO'}`);
console.log(`  file bytes ${diskBytes.length} (was ${oldBytes.length},`
  + ` delta ${diskBytes.length - oldBytes.length})`);
console.log();

const post = runProofs('post-write, against the bytes on disk', oldBytes, diskBytes,
  JSON.parse(diskBytes));

const postKeys = Object.keys(JSON.parse(diskBytes)).length;
console.log('POST-WRITE ASSERTIONS:');
console.log(`  total rows ${postKeys} vs before ${keysBefore}`,
  postKeys === keysBefore ? 'OK' : 'MISMATCH');
console.log('  disk bytes match candidate      :', diskMatches ? 'OK' : 'MISMATCH');
console.log('  proofs                          :', post.all ? 'PASS' : 'FAIL');
console.log();

if (!(post.all && diskMatches && postKeys === keysBefore)) {
  console.log(`POST-WRITE VERIFICATION FAILED - restore from ${backupPath}`);
  process.exit(1);
}
console.log('DONE: write applied and re-verified on disk.');
