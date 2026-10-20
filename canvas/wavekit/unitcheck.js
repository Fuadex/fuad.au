// unitcheck.js — catch the wave's most persistent fault: a length converted to the wrong unit.
//
// WHY. In wave 13 the same mm/cm class appeared at THREE separate stages: in my briefs (ppi written
// as px/cm, three times), in a drafter's flag (Rubens flag 9: "100-200 native px at 224 px/cm, i.e.
// 0.45-0.89 mm" — that is 4.46 mm, off by ten), and in reader-facing prose ("under a millimetre
// wide" for a band measuring 4.7-12.2 mm). Every instance was caught by a human-equivalent reader
// looking hard. None was caught by a gate, because no gate looks at arithmetic.
//
// WHAT IT CHECKS. Wherever text states a pixel count and a scale together and then gives a physical
// length, it redoes the division. It does NOT try to understand prose: it only fires where all
// three numbers are present in one sentence, which is exactly the shape that has gone wrong.
//
// It also flags a scale that is implausible as px/cm but plausible as ppi (the other half of the
// same fault): 220-620 px/cm is normal for these plates, and a "px/cm" figure between about 100 and
// 700 that equals a known ppi is worth a human look.
//
// ⛔ This gate FLAGS, it does not fail. A flag is a question for a person, and the false-positive
// rate on prose arithmetic is high enough that an automatic verdict would be dishonest.
const fs = require('fs');
const path = require('path');

const DIR = process.argv[2] || '.';
const TOL = 0.12; // 12% — wide enough for rounded prose, far tighter than a factor of ten.

const files = fs.readdirSync(DIR).filter(f => /^out_tour_.*\.json$/.test(f)).sort();
if (!files.length) { console.log('REFUSING TO PASS: no out_tour_*.json in ' + DIR); process.exit(2); }

// "<n> px at <s> px/cm ... <v> mm|cm"  — the numbers may be ranges (100-200).
//
// ⚠ THE WINDOWS MUST ALLOW A FULL STOP. The first version of this used [^.] to keep the match
// inside one sentence, and it matched NOTHING — because the real text reads "…at 224 px/cm, i.e.
// 0.45-0.89 mm", and "i.e." is full of periods. For the same reason this scans whole field texts
// and does NOT pre-split into sentences: splitting on "." breaks at exactly the abbreviation the
// fault likes to hide behind. (That is the same defect tonegate.js has with personal initials.)
// The windows stay short instead, which is what keeps a match inside one clause.
const TRIPLE = /(\d[\d.,]*)\s*(?:-|–|to)?\s*([\d.,]*)\s*(?:native\s+)?px\b[^;]{0,40}?at\s*([\d.,]+)\s*px\s*\/\s*cm\b[^;]{0,60}?(\d[\d.,]*)\s*(?:-|–|to)?\s*([\d.,]*)\s*(mm|cm)\b/gi;
const num = (s) => { const v = parseFloat(String(s).replace(/,/g, '')); return isFinite(v) ? v : null; };

let checked = 0, flagged = 0, sentencesSeen = 0;

for (const f of files) {
  const j = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
  const id = f.replace(/^out_tour_/, '').replace(/\.json$/, '');
  const parts = [];
  for (const k of ['see', 'about', 'craft', 'context']) if (typeof j[k] === 'string') parts.push([k, j[k]]);
  (j.deeper || []).forEach((d, i) => { if (d && typeof d.body === 'string') parts.push(['stop' + (i + 1), d.body]); });
  (j.flags || []).forEach((s, i) => { if (typeof s === 'string') parts.push(['flag' + i, s]); });

  const hits = [];
  for (const [where, text] of parts) {
    {
      const sentence = text;
      sentencesSeen++;
      let m;
      TRIPLE.lastIndex = 0;
      while ((m = TRIPLE.exec(sentence)) !== null) {
        const px1 = num(m[1]), px2 = num(m[2]), scale = num(m[3]);
        const v1 = num(m[4]), v2 = num(m[5]), unit = m[6].toLowerCase();
        if (px1 === null || scale === null || v1 === null || !scale) continue;
        checked++;
        const toCm = (px) => px / scale;
        const stated = (v) => unit === 'mm' ? v / 10 : v;   // normalise to cm
        const pairs = [[px1, v1]];
        if (px2 !== null && v2 !== null) pairs.push([px2, v2]);
        for (const [px, v] of pairs) {
          const expect = toCm(px), got = stated(v);
          if (!expect || !got) continue;
          const ratio = got / expect;
          if (Math.abs(ratio - 1) > TOL) {
            hits.push({
              where, ratio,
              msg: px + ' px at ' + scale + ' px/cm = ' + expect.toFixed(3) + ' cm (' +
                   (expect * 10).toFixed(2) + ' mm), but the text says ' + v + ' ' + unit +
                   '  [off by ' + (ratio < 1 ? (1 / ratio).toFixed(1) + '× too small' : ratio.toFixed(1) + '× too large') + ']',
              sentence: sentence.trim().slice(0, 190),
            });
          }
        }
      }
    }
  }

  if (hits.length) {
    flagged++;
    console.log('  FLAG  ' + id);
    for (const h of hits) {
      console.log('          ' + h.where + ': ' + h.msg);
      console.log('          > ' + h.sentence);
    }
  } else {
    console.log('  ok    ' + id);
  }
}

console.log('\n' + (files.length - flagged) + ' clean | ' + flagged + ' flagged   of ' + files.length);
console.log(checked + ' conversion statement(s) found across ' + sentencesSeen + ' text blocks, tolerance ' + (TOL * 100) + '%');
console.log('\n⚠ READ THE COVERAGE HONESTLY. This gate fires only where a pixel count, a px/cm scale');
console.log('  and a physical length appear together. Most length claims in these tours state the');
console.log('  physical figure alone, and those are INVISIBLE to it. "0 flagged" means no stated');
console.log('  conversion is wrong — never that the units are right.');
if (!checked) {
  console.log('\n⛔ NO CONVERSION STATEMENTS MATCHED AT ALL. That is not a pass. Either no tour shows');
  console.log('  its arithmetic, or the pattern has drifted and this gate is checking nothing.');
}
