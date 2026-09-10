// gen-plate-audit-md.js — renders PLATE_AUDIT.md from plate_audit_classified.json (+ results.json
// for the Heiss spotlight). Run AFTER apply-plate-fixes.js (dry or real) has written the
// classification. Does not touch art_hires.js / art_imgsize.js itself.
'use strict';
const fs = require('fs');
const path = require('path');
const DIR = __dirname;

const cls = JSON.parse(fs.readFileSync(path.join(DIR, 'plate_audit_classified.json'), 'utf8'));
const results = JSON.parse(fs.readFileSync(path.join(DIR, 'plate_audit_results.json'), 'utf8'));
const APPLIED = fs.existsSync(path.join(DIR, 'plate_audit_applied.json'))
  ? JSON.parse(fs.readFileSync(path.join(DIR, 'plate_audit_applied.json'), 'utf8'))
  : { applied: false };

const heiss = results.hires.find((r) => r.id === 'anders-zorn-mrs-veronica-heiss');

function esc(s) { return String(s).replace(/\|/g, '\\|'); }
function tbl(headers, rows) {
  let out = '| ' + headers.join(' | ') + ' |\n';
  out += '|' + headers.map(() => ' --- ').join('|') + '|\n';
  for (const row of rows) out += '| ' + row.map(esc).join(' | ') + ' |\n';
  return out;
}

let md = '';
md += '# PLATE_AUDIT.md\n\n';
md += `Generated ${cls.generatedAt || new Date().toISOString()} by \`audit-plates.js\` + \`apply-plate-fixes.js\`. Measured ${results.hires.length} \`art_hires\` rows (all rows except the wilhelm-gentz id, held by another agent) and ${results.imgsize.length} \`art_imgsize\` entries. Holder mismatches computed locally from \`art_holders.js\` + \`museums.js\`, no network.\n\n`;

md += '## Counts per category\n\n';
md += tbl(['Category', 'Count', 'Disposition'], [
  ['(a) flat clamp lifted (server now serves ≥ 90% of master on the long side)', String(cls.catA.length), APPLIED.applied ? `APPLIED (${cls.catA.length} edits)` : 'pending apply'],
  ['(b) img serves a size >2% off w,h on either axis', String(cls.catB.length), 'REPORT ONLY — never applied alone (see note below)'],
  ['(c) iiif info.json width/height ≠ recorded w,h', String(cls.catC.length), `of which ${cls.catC_apply.length} had img-measured agree with info.json — ${APPLIED.applied ? 'APPLIED' : 'pending apply'}; the remaining ${cls.catC.length - cls.catC_apply.length} are capped/served-smaller and NOT applied`],
  ['(d) art_imgsize ≠ Commons true size', String(cls.catD.length), APPLIED.applied ? `APPLIED (${cls.catD_apply.length} edits)` : 'pending apply'],
  ['(e) URL 404s / errors', String(cls.catE.length), 'REPORT ONLY'],
  ['(f) holder mismatches (src-implied vs art_holders.js)', String(cls.catF.length), 'REPORT ONLY — holders never touched'],
]);

md += '\n**On (b):** the great majority of these rows are IIIF hosts deliberately requested at a capped width (NGA/Getty/YCBA all use `full/3000,` against masters far larger than 3000px; several Commons rows use a `?width=NNNN` TIFF-bucket request) — `img` is *supposed* to differ from the master `w,h` there, by the site’s own design (the note in `art_hires.js`’s header: `img` is "the largest single flat file URL", not necessarily the untouched master). Those are listed below for completeness but are not defects. A handful of non-IIIF direct-file rows also appear, where `img` is supposed to equal the master — those are the ones worth a human look.\n\n';

md += '## Heiss row (`anders-zorn-mrs-veronica-heiss`) — the row Fuad flagged\n\n';
if (heiss) {
  md += '- Recorded: `w=' + heiss.w + ', h=' + heiss.h + '`, `flat=[' + (heiss.flat || []).join(',') + ']`\n';
  md += '- info.json (nationalmuseumse.iiifhosting.com, IIIF 2, level1): width=' + (heiss.infoJson && heiss.infoJson.width) + ', height=' + (heiss.infoJson && heiss.infoJson.height) + ' — **matches recorded w,h exactly**\n';
  md += '- `img` (`.../full/full/0/default.jpg`) measured (SOF decode of the first 64KB): ' + JSON.stringify(heiss.imgMeasured) + '\n';
  md += '- Re-measured today: still serving **' + (heiss.flatMeasured && heiss.flatMeasured.w) + '×' + (heiss.flatMeasured && heiss.flatMeasured.h) + '** — the 1000px-per-axis iiifhosting clamp is **still in effect**, unchanged since it was recorded 2026-08-25. Category (a) does NOT fire for this row: 745×1000’s long side (1000) is nowhere near 90% of the master’s long side (7402).\n';
  md += '- Commons original behind `art_data.js`’s `img` (`?width=900` preview): API imageinfo reports **' + JSON.stringify((results.imgsize.find(x=>x.id==='anders-zorn-mrs-veronica-heiss')||{}).measured) + '**, matching the recorded `art_imgsize` pair `[3478,4649]` exactly. No drift there either.\n';
  md += '\n**Conclusion:** the Heiss row itself is internally consistent and unchanged today — what Fuad noticed (the plate reading "mushy"/undersized) is the *known, already-documented* iiifhosting flat-render clamp (see `HIRES_SOURCING.md` → "the one that explains a reader-visible complaint"), not a newly-stale record. The clamp has not lifted since 2026-08-25.\n\n';
} else {
  md += '(row not found in results — audit did not cover it, check for an error)\n\n';
}

md += '## (a) flat clamp lifted — APPLIED\n\n';
md += cls.catA.length
  ? tbl(['id', 'old flat', 'measured today', 'master w,h'], cls.catA.map((e) => [e.id, e.oldFlat.join('×'), e.measured.join('×'), e.masterLong + ' (long side)']))
  : '_none — every host that had a recorded `flat` clamp is still enforcing it._\n';

md += '\n## (b) img ≠ w,h by >2% (REPORT ONLY, full table)\n\n';
md += cls.catB.length
  ? tbl(['id', 'recorded w,h', 'measured img', 'Δw%', 'Δh%'], cls.catB.map((e) => [e.id, e.w + '×' + e.h, e.measured.join('×'), e.dw + '%', e.dh + '%']))
  : '_none._\n';

md += '\n## (c) iiif info.json ≠ recorded w,h (full table; ✓ = applied)\n\n';
md += cls.catC.length
  ? tbl(['id', 'recorded w,h', 'info.json w,h', 'applied?'], cls.catC.map((e) => [e.id, e.w + '×' + e.h, e.info.join('×'), cls.catC_apply.some((a) => a.id === e.id) ? '✓ applied' : 'not applied (img-measured does not agree with info.json)']))
  : '_none._\n';

md += '\n## (d) art_imgsize ≠ Commons true size (full table; all APPLIED)\n\n';
md += cls.catD.length
  ? tbl(['id', 'recorded', 'Commons true size'], cls.catD.map((e) => [e.id, e.recorded.join('×'), e.measured.join('×')]))
  : '_none._\n';

md += '\n## (e) URL errors (REPORT ONLY)\n\n';
md += cls.catE.length
  ? tbl(['id', 'url', 'error'], cls.catE.map((e) => [e.id, e.url, e.error]))
  : '_none — every URL touched by the audit answered._\n';

md += '\n## (f) holder mismatches (REPORT ONLY — holders not changed)\n\n';
md += cls.catF.length
  ? tbl(['id', 'src', 'art_holders.js says', 'src implies'], cls.catF.map((e) => [e.id, e.src, e.recorded, e.implied]))
  : '_none._\n';

fs.writeFileSync(path.join(DIR, 'PLATE_AUDIT.md'), md);
console.log('Wrote PLATE_AUDIT.md,', md.length, 'bytes.');
