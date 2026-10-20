// besidegate.js — the companion-layer gate for wave 10. Run: node besidegate.js
//
// It folds the STUDY_SPEC's checklist steps 12c–12h into one pass. Six checks:
//  (1) BAND 70-130 (STUDY_SPEC rule 11, 2026-10-09; was 90-120) — the batch should spread across it.
//      carries, so 116-125 prints as a LOOK and only >125 / <90 is a fail.
//  (2) THE NO-COUNT RULE (12g) — a beside never counts the collection, because a count is a fact
//      with an expiry date and these paragraphs are meant to last. Stated counts, absolutes over
//      holdings, and IMPLIED counts ("his other portrait here", "both of his works here").
//  (3) THE COMPANION RESOLVES (12c) — id present in CORPUS_INDEX.txt, READ not typed. A
//      plausible id typed from a title is a live failure mode here, not a hypothetical.
//  (4) COMPANION GROUNDING — flags a companion that ships no Info of its own, because then
//      nothing verifies the paragraph's claims about it. Notes one that is not TOURED.
//  (5) REF TEXT OCCURS EXACTLY ONCE (12h) — literal indexOf, the renderer's own rule. Zero and
//      two both fail.
//  (6) BANNED OPENERS + the recap test's cheap half — an earlier wave had 5 of 10 besides
//      opening "Set this beside".
const fs = require('fs');
const D = __dirname + '/';

const words = (s) => String(s || '').toLowerCase()
  .replace(/[–—]/g, ' ').replace(/[^a-z0-9\s'’-]/g, ' ')
  .split(/\s+/).map((w) => w.replace(/^['’-]+|['’-]+$/g, '')).filter(Boolean);

const ids = JSON.parse(fs.readFileSync(D + 'ids.json', 'utf8'));
const canon = {};
for (const line of fs.readFileSync(D + 'CORPUS_INDEX.txt', 'utf8').split(/\r?\n/)) {
  if (!line.trim()) continue;
  const p = line.split('|').map((s) => s.trim());
  canon[p[0]] = { id: p[0], artist: p[1], title: p[2], year: p[3], museum: p[4], toured: p[5] === 'TOURED', info: p[6] === 'INFO' };
}

// 12g — counts of the COLLECTION. Not counts inside a painting: "the same pair of cypresses" is fine.
const COUNTS = [
  [/hangs?\s+twice/i, 'stated count'],
  [/\bone of (two|three|four|five|six|\d+)\b/i, 'stated count'],
  [/\bthe only\b/i, 'absolute over holdings'],
  [/\b(earliest|latest|largest|smallest|finest|greatest)\b[^.]{0,40}\b(here|in this collection)\b/i, 'ranking over holdings'],
  [/\b\d+\s+works?\b/i, 'stated count'],
  [/\bboth\b[^.]{0,40}\b(here|in this collection)\b/i, 'implied count'],
  [/\bother\b[^.]{0,30}\b(here|in this collection)\b/i, 'implied count ("his other ... here")'],
  [/\bthe pair of them\b/i, 'implied count'],
];
const OPENERS = [/^set this beside/i, /^compare this/i, /^elsewhere in this collection/i];

let fail = 0, look = 0, ok = 0, omitted = 0;
for (const id of ids) {
  const f = D + 'beside_' + id + '.json';
  if (!fs.existsSync(f)) { console.log('MISSING ' + id); fail++; continue; }
  let j;
  try { j = JSON.parse(fs.readFileSync(f, 'utf8')); }
  catch (e) { console.log('FAIL ' + id + '\n     >> unparseable JSON: ' + e.message); fail++; continue; }

  if (j.beside === null || j.beside === undefined) {
    console.log('OMIT ' + id + (j.notes ? '\n     .. ' + String(j.notes).slice(0, 160) : '  << no reason recorded — an omission is a DECISION, and undocumented is a fail'));
    omitted++; if (!j.notes) fail++;
    continue;
  }

  const p = String(j.beside);
  const probs = [], notes = [];
  const n = words(p).length;
  if (n < 70 || n > 130) probs.push('BAND ' + n + 'w (70-130, rule 11 2026-10-09)');
  else if (n > 115) notes.push('band ' + n + 'w — over ~115: name what the extra carries');

  for (const [re, why] of COUNTS) { const m = p.match(re); if (m) probs.push('12g NO-COUNT (' + why + '): "' + m[0] + '"'); }
  for (const re of OPENERS) if (re.test(p.trim())) probs.push('banned opener');

  const refs = Array.isArray(j.refs) ? j.refs : [];
  if (!refs.length) probs.push('no refs entry — a beside names a companion by definition, so a beside without a ref is INCOMPLETE');
  for (const r of refs) {
    const row = canon[r.id];
    if (!row) { probs.push('12c ref id NOT IN CANON: "' + r.id + '" — ids are read from CORPUS_INDEX.txt, never typed from a title'); continue; }
    let c = 0, i = 0;
    while ((i = p.indexOf(r.text, i)) !== -1) { c++; i += r.text.length; }
    if (c !== 1) probs.push('12h ref.text occurs ' + c + 'x (must be exactly 1): "' + r.text + '"');
    if (!row.info) probs.push('companion "' + row.title + '" ships NO INFO — nothing verifies the claims made about it');
    else if (!row.toured) notes.push('companion "' + row.title + '" is canon but not TOURED (spec holds toured as the bar)');
    // the museum the drafter asserted, against the canon row
    if (j.companion && j.companion.id === r.id && j.companion.museum && row.museum &&
        !row.museum.toLowerCase().includes(String(j.companion.museum).toLowerCase().slice(0, 12))) {
      notes.push('museum stated "' + j.companion.museum + '" vs canon row "' + row.museum + '" — verify');
    }
  }

  if (probs.length) { console.log('FAIL ' + id); probs.forEach((x) => console.log('     >> ' + x)); notes.forEach((x) => console.log('     .. ' + x)); fail++; }
  else if (notes.length) { console.log('LOOK ' + id); notes.forEach((x) => console.log('     .. ' + x)); look++; }
  else { console.log('ok   ' + id + '  (' + n + 'w -> ' + refs.map((r) => r.id).join(', ') + ')'); ok++; }
}
console.log('\n' + ok + ' clean | ' + look + ' look | ' + fail + ' fail | ' + omitted + ' omitted   of ' + ids.length);
