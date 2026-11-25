#!/usr/bin/env node
// sem-token-check.js — parity gate for the in-house WordPiece tokenizer (rotation/sem-wordpiece.js)
// against the python `tokenizers` ids recorded in tools/sem-token-fixture.json.
// Contract: .sptmp/searchbar/CONTRACT.md §6 + QC gate "Fixture parity — exact".
//
//   node tools/sem-token-check.js [--fixture <path>] [--vocab <path>]
//
// Defaults: fixture = tools/sem-token-fixture.json, vocab = about/sem-vocab.json.
// Exit 0 = every case matches; 1 = a mismatch; 2 = fixture or vocab missing (reported, not thrown).

const fs = require("fs");
const path = require("path");

const HERE = __dirname;
const ROT = path.join(HERE, "..");
const arg = (name, dflt) => { const i = process.argv.indexOf(name); return i > 0 && process.argv[i + 1] ? path.resolve(process.argv[i + 1]) : dflt; };
const FIXTURE = arg("--fixture", path.join(HERE, "sem-token-fixture.json"));
const VOCAB = arg("--vocab", path.join(ROT, "about", "sem-vocab.json"));

const { tokenize } = require(path.join(ROT, "sem-wordpiece.js"));

function readJson(p, label) {
  if (!fs.existsSync(p)) { console.log(`sem-token-check: ${label} missing (${p}) — nothing to check yet.`); process.exit(2); }
  return JSON.parse(fs.readFileSync(p, "utf8").replace(/^﻿/, ""));
}

const vocab = readJson(VOCAB, "vocab");
const fixture = readJson(FIXTURE, "fixture missing:");
const cases = Array.isArray(fixture) ? fixture : (fixture.cases || []);
if (!cases.length) { console.log("sem-token-check: fixture has no cases."); process.exit(2); }

let pass = 0, fail = 0;
cases.forEach((c, i) => {
  const got = tokenize(c.text, vocab, { maxLen: c.maxLen || 256 });
  const want = c.ids;
  const ok = got.length === want.length && got.every((v, j) => v === want[j]);
  const label = JSON.stringify(String(c.text)).slice(0, 60);
  if (ok) { pass++; console.log(`PASS ${String(i + 1).padStart(2)} (${want.length} ids) ${label}`); return; }
  fail++;
  let at = 0; while (at < got.length && at < want.length && got[at] === want[at]) at++;
  console.log(`FAIL ${String(i + 1).padStart(2)} ${label}`);
  console.log(`     first diff at #${at}: got ${JSON.stringify(got.slice(at, at + 8))} want ${JSON.stringify(want.slice(at, at + 8))} (len ${got.length} vs ${want.length})`);
});
console.log(`\nsem-token-check: ${pass}/${cases.length} pass${fail ? `, ${fail} FAIL` : ""}`);
process.exit(fail ? 1 : 0);
