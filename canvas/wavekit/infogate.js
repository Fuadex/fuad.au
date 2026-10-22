#!/usr/bin/env node
// infogate.js — Info apparatus tripwire (the 2026-10-22 Info-drift rulings, READS_SPEC tail; ruling 6).
// The Info is a doorway whose hook is an EVENT WITH AN ACTOR AND STAKES. This gate does not judge that —
// it trips on the two measurable symptoms of apparatus (two+ distinct year tokens, or catalogue lexicon)
// and FORCES THE QUESTION: a trip is cleared only by a seal/QUEUE line naming the Info's hook class
// (making / biography / technique / subject / reception), or by a re-hook. A trip is NOT an auto-fail:
// the Hobbema class (an apparatus story with actor and stakes) trips and is then cleared in writing.
//
// Usage: node infogate.js <workshopDir>   — scans info_*.md (prose lines, '#' lines ignored)
// Exit 1 if any Info trips, else 0.
'use strict';
const fs = require('fs');
const path = require('path');

const dir = process.argv[2];
if (!dir || !fs.existsSync(dir)) { console.error('usage: node infogate.js <workshopDir>'); process.exit(2); }

const LEXICON = [
  /catalogu/i, /raisonn/i, /identified as/i, /attribut/i, /inscri(?:bed|ption)/i,
  /accession/i, /\bregister\b/i, /\bre-?dated\b/i, /has (?:also )?been dated/i,
  /\bdating\b/i, /dated (?:it |this |the )?(?:to )?1[5-9]\d\d/i, /moved it to 1[5-9]\d\d/i,
  /\blisted (?:in|under|as)\b/i, /\bnumbered\b/i, /matched to its entry/i,
];

const files = fs.readdirSync(dir).filter(f => /^info_.*\.md$/.test(f)).sort();
if (!files.length) { console.error('infogate: no info_*.md in ' + dir); process.exit(2); }

let trips = 0;
for (const f of files) {
  const prose = fs.readFileSync(path.join(dir, f), 'utf8')
    .split(/\r?\n/).filter(l => !l.trim().startsWith('#')).join(' ').trim();
  const years = new Set((prose.match(/\b(1[5-9]\d\d|20[0-2]\d)\b/g) || []));
  const lex = LEXICON.filter(re => re.test(prose)).map(re => (prose.match(re) || [''])[0]);
  const reasons = [];
  if (years.size >= 2) reasons.push('years: ' + [...years].join(','));
  if (lex.length) reasons.push('lexicon: ' + [...new Set(lex)].join(' | '));
  const id = f.replace(/^info_/, '').replace(/\.md$/, '');
  if (reasons.length) {
    trips++;
    console.log('TRIP ' + id + '  [' + reasons.join('; ') + ']');
    console.log('     needs a written hook-class line (making/biography/technique/subject/reception) or a re-hook');
  } else {
    console.log('ok   ' + id);
  }
}
console.log((files.length - trips) + ' ok | ' + trips + ' trip   of ' + files.length);
process.exit(trips ? 1 : 0);
