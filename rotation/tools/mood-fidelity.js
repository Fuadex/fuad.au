#!/usr/bin/env node
/**
 * mood-fidelity.js - does the rebuilt scorer still score like the one that built the corpus?
 *
 * The rebuild had to change install details the original run never had to think about
 * (Python 3.12 instead of 3.14, torch 2.14+cu126, transformers 4.57, bitsandbytes 0.50).
 * Model, quantisation, prompt and decoding are byte-identical - but "identical in the
 * source" is a claim, and this script is the measurement.
 *
 * Re-score a sample of tracks that ALREADY have scores, then compare against two baselines:
 *
 *   A. .sptmp/nrc-audit/llm_scores.json - the RAW model outputs of the 2026-08 run,
 *      before any emit gate touched them. This is the true like-for-like: same instrument,
 *      same lyric, same question. Valence MAD and register top-1 here are the headline.
 *
 *   B. rotation/genius-mood.json - the shipped rows. Valence is comparable only on
 *      flag===1 rows ("valence IS the model's"); flag===2 rows kept NRC's valence by the
 *      section 4 cathartic rule, so they are excluded from the valence comparison but
 *      their regIdx is still the model's and is compared.
 *
 * Greedy decoding is deterministic given identical inputs, so a perfect rebuild scores
 * MAD 0.0 / 100% register. Anything else is kernel-level numeric drift between library
 * versions, and its size is exactly what the owner asked to see.
 *
 * Usage
 *   node mood-fidelity.js --store <sptmp>/mood-work/fidelity.jsonl
 *   node mood-fidelity.js --store ... --examples 8
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
const LLM_SCORES = path.join(SPTMP, 'nrc-audit', 'llm_scores.json');

const REG_VOCAB = ['anguished', 'bittersweet', 'bleak', 'tender', 'angry', 'defiant',
  'joyful', 'neutral', 'bitter'];
const STRAY_MAP = {
  confident: 'defiant', resilient: 'defiant', optimistic: 'joyful', ambiguous: 'neutral',
  melancholic: 'bittersweet', pessimistic: 'bleak', dark: 'bleak', serious: 'bleak',
  evil: 'angry', satanic: 'angry', sinister: 'angry', corrosive: 'angry',
  dominant: 'angry', belligerent: 'angry',
};
const norm = (r) => {
  const k = String(r || '').trim().toLowerCase();
  return STRAY_MAP[k] !== undefined ? STRAY_MAP[k] : k;
};

const argv = process.argv.slice(2);
function arg(n, d) { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; }
const storePath = arg('--store', path.join(SPTMP, 'mood-work', 'fidelity.jsonl'));
const nEx = parseInt(arg('--examples', '6'), 10);

if (!fs.existsSync(storePath)) { console.error(`store not found: ${storePath}`); process.exit(2); }

const rescored = new Map();
for (const line of fs.readFileSync(storePath, 'utf8').split('\n')) {
  const s = line.trim(); if (!s) continue;
  let r; try { r = JSON.parse(s); } catch { continue; }
  if (r && r.key && r.v !== null && r.v !== undefined) rescored.set(r.key, r);
}

const mood = JSON.parse(fs.readFileSync(MOOD, 'utf8'));
const legacy = fs.existsSync(LLM_SCORES) ? JSON.parse(fs.readFileSync(LLM_SCORES, 'utf8')) : {};

function stats(deltas) {
  if (!deltas.length) return null;
  const s = [...deltas].sort((a, b) => a - b);
  return {
    n: s.length,
    mad: (s.reduce((a, b) => a + b, 0) / s.length),
    median: s[Math.floor(s.length / 2)],
    max: s[s.length - 1],
    within0: s.filter((d) => d === 0).length,
    within5: s.filter((d) => d <= 5).length,
    within10: s.filter((d) => d <= 10).length,
  };
}
function pct(a, b) { return b ? `${(a * 100 / b).toFixed(1)}%` : 'n/a'; }

console.log('=== mood-fidelity.js ===\n');
console.log(`re-scored rows : ${rescored.size}`);
console.log(`store          : ${storePath}\n`);

// ---- baseline A: raw 2026-08 model outputs ----------------------------------
const aDelta = [];
let aRegMatch = 0; let aRegN = 0; let aMaskMatch = 0; let aMaskN = 0;
const regConf = {};
const examples = [];
for (const [k, r] of rescored) {
  const b = legacy[k];
  if (!b || b.v === undefined || b.v === null) continue;
  aDelta.push(Math.abs(r.v - b.v));
  aRegN++;
  const nb = norm(b.reg); const nr = norm(r.reg);
  if (nb === nr) aRegMatch++;
  else {
    const kk = `${nb} -> ${nr}`;
    regConf[kk] = (regConf[kk] || 0) + 1;
  }
  if (b.mask !== undefined && r.mask !== undefined && r.mask !== null) {
    aMaskN++; if (!!b.mask === !!r.mask) aMaskMatch++;
  }
  if (examples.length < nEx) {
    examples.push(`  ${k}\n      then v=${b.v} reg="${nb}" mask=${!!b.mask}`
      + `\n      now  v=${r.v} reg="${nr}" mask=${!!r.mask}`
      + `   (dv=${r.v - b.v}, reg ${nb === nr ? 'MATCH' : 'DIFFER'})`);
  }
}
const A = stats(aDelta);
console.log('BASELINE A - raw 2026-08 model outputs (llm_scores.json), like-for-like:');
if (!A) console.log('  no overlap with the legacy store');
else {
  console.log(`  compared              : ${A.n} tracks`);
  console.log(`  valence MAD           : ${A.mad.toFixed(2)} points`);
  console.log(`  valence median |diff| : ${A.median}   · max |diff| : ${A.max}`);
  console.log(`  exactly equal         : ${A.within0}/${A.n}  ${pct(A.within0, A.n)}`);
  console.log(`  within +/-5           : ${A.within5}/${A.n}  ${pct(A.within5, A.n)}`);
  console.log(`  within +/-10          : ${A.within10}/${A.n}  ${pct(A.within10, A.n)}`);
  console.log(`  register top-1 match  : ${aRegMatch}/${aRegN}  ${pct(aRegMatch, aRegN)}`);
  console.log(`  mask agreement        : ${aMaskMatch}/${aMaskN}  ${pct(aMaskMatch, aMaskN)}`);
  const conf = Object.entries(regConf).sort((a, b) => b[1] - a[1]);
  if (conf.length) {
    console.log('  register disagreements:');
    for (const [kk, c] of conf.slice(0, 10)) console.log(`    ${c}x  ${kk}`);
  }
}
console.log();

// ---- baseline B: the shipped rows -------------------------------------------
const bDelta = [];
let bRegMatch = 0; let bRegN = 0; let skippedCathartic = 0; let skippedNrc = 0;
for (const [k, r] of rescored) {
  const row = mood[k];
  if (!Array.isArray(row)) continue;
  const flag = row[3];
  const regIdx = row[4];
  if (flag === 1) bDelta.push(Math.abs(r.v - row[0]));
  else if (flag === 2) skippedCathartic++;
  else skippedNrc++;
  if (Number.isInteger(regIdx) && regIdx >= 0 && regIdx < REG_VOCAB.length) {
    bRegN++;
    if (REG_VOCAB[regIdx] === norm(r.reg)) bRegMatch++;
  }
}
const B = stats(bDelta);
console.log('BASELINE B - shipped rows (genius-mood.json):');
console.log(`  flag=1 rows (model valence)   : ${bDelta.length}`);
console.log(`  flag=2 cathartic, excluded    : ${skippedCathartic}  (row keeps NRC valence)`);
console.log(`  plain-NRC rows, excluded      : ${skippedNrc}`);
if (B) {
  console.log(`  valence MAD vs shipped        : ${B.mad.toFixed(2)} points`);
  console.log(`  exactly equal                 : ${B.within0}/${B.n}  ${pct(B.within0, B.n)}`);
  console.log(`  within +/-5                   : ${B.within5}/${B.n}  ${pct(B.within5, B.n)}`);
}
console.log(`  register index top-1 match    : ${bRegMatch}/${bRegN}  ${pct(bRegMatch, bRegN)}`);
console.log();

if (examples.length) {
  console.log(`${examples.length} EXAMPLES (keys and numbers only):`);
  console.log(examples.join('\n'));
  console.log();
}

// ---- verdict -----------------------------------------------------------------
if (A) {
  const ok = A.mad <= 2.0 && (aRegMatch / Math.max(aRegN, 1)) >= 0.95;
  console.log(`VERDICT: ${ok ? 'FIDELITY HELD' : 'DRIFT - needs the owner'} `
    + `(guide: MAD <= 2.0 points and register >= 95%)`);
}
