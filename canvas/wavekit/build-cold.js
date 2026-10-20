// build-cold.js — the visitor cold pass packet (STUDY_SPEC 2026-10-06 rule 5) for NEW tours.
// Writes cold/<id>.md: the entry in reading order (Info, Interpretation, the four lenses, the stops with their crop
// files, the beside) and NOTHING else — no briefs, no research, no flags, no survey. The cold reader gets only this
// folder (the plate + the stop crops are copied in beside it).
// Usage: node build-cold.js [ids…]     (default: all ids in ids.json)
const fs = require('fs'), path = require('path');
const W = __dirname, OUT = path.join(W, 'cold');
fs.mkdirSync(OUT, { recursive: true });
const canon = JSON.parse(fs.readFileSync(path.join(W, 'canon.json'), 'utf8'));
const IDS = process.argv.slice(2).length ? process.argv.slice(2) : JSON.parse(fs.readFileSync(path.join(W, 'ids.json'), 'utf8'));
const rd = f => fs.existsSync(path.join(W, f)) ? fs.readFileSync(path.join(W, f), 'utf8').trim() : null;
for (const id of IDS) {
  const c = canon.find(r => r.id === id) || {};
  const t = JSON.parse(rd('out_tour_' + id + '.json'));
  const info = rd('info_' + id + '.md'), interp = rd('interp_' + id + '.md');
  const bs = rd('beside_' + id + '.json'); const beside = bs ? JSON.parse(bs).beside : null;
  if (!info || !interp || !beside) throw new Error('reads missing for ' + id);
  fs.copyFileSync(path.join(W, 'img_' + id + '.jpg'), path.join(OUT, 'plate_' + id + '.jpg'));
  const L = [`# ${c.title} — ${c.artist}, ${c.year || ''}`, '', 'Painting: plate_' + id + '.jpg', '',
    '## Info', info, '', '## Interpretation', interp, '', '## What you see', t.see, '', '## About', t.about, '',
    '## Craft', t.craft, '', '## Context', t.context, '', '## The tour (each stop zooms the painting to its crop)'];
  t.deeper.forEach((s, i) => {
    const crop = 'box_' + id + '_' + (i + 1) + '.jpg';
    if (fs.existsSync(path.join(W, crop))) fs.copyFileSync(path.join(W, crop), path.join(OUT, crop));
    L.push('', `### Stop ${i + 1}: ${s.t}`, '(zoom: ' + crop + ')', s.body);
  });
  L.push('', '## Beside', beside, '');
  fs.writeFileSync(path.join(OUT, id + '.md'), L.join('\n'), 'utf8');
  console.log('cold/' + id + '.md', t.deeper.length + ' stops');
}
