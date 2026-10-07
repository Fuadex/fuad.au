#!/usr/bin/env node
/* depth-census.js — per-tour DEPTH and LENS-ROLE census (Fuad 2026-10-07: "note down tours or measure how
 * much they also cover the voice etc. so we have candidates to deepen tours moving forward", and "check the
 * what you see, about, sing and moment so that these bits actually adhere to what they're supposed to do").
 * Read-only heuristics over art_inspect.js + art-about.js. A flag is a CANDIDATE for a human/agent read,
 * never a verdict. Writes depth-census.json (all tours) and prints the summary + top candidates.
 *
 * Signals per tour:
 *   voice      context/Info/Interp carries the artist's or a contemporary's own words or report
 *   story      context carries a narrated event (death, commission, sale, refusal, scandal, show, letter…)
 *   dated      context carries a year
 *   recordOnly context is mostly holder-record fields (accession, provenance, exhibition lists)
 *   lens roles (STUDY_SPEC Entry format):
 *     see      = NAMES what is on the surface; muddy if it DESCRIBES a stop's instance (shared 5-grams with
 *                stops) or argues meaning (about-words)
 *     about    = the layer behind the subject; muddy if it is mostly technique (craft-words)
 *     craft    = why it sings: method, marks, decisions; muddy if it carries no material/mark vocabulary
 *     context  = the moment: history, biography; muddy if no year and no event
 *   interpRetell  Interpretation shares many 4-grams with the tour's own stops (a retelling, not an argument)
 */
const fs = require('fs');
const C = __dirname + '/';
const load = f => { const w = {}; new Function('window', fs.readFileSync(C + f, 'utf8'))(w); return Object.values(w)[0]; };
const I = load('art_inspect.js'), A = load('art-about.js'), W = load('artworks.js');
const byId = {}; for (const r of W) byId[r.id] = r;
const toks = s => String(s || '').toLowerCase().replace(/[^a-z0-9à-ž' ]+/g, ' ').split(/\s+/).filter(Boolean);
const grams = (s, n) => { const t = toks(s), g = new Set(); for (let i = 0; i + n <= t.length; i++) g.add(t.slice(i, i + n).join(' ')); return g; };
const share = (a, b) => { let k = 0; for (const x of a) if (b.has(x)) k++; return a.size ? k / a.size : 0; };
const VOICE = /\b(wrote|writes|letter|letters|diary|told|said|recalled|remembered|complained|confessed|insisted|called it|in his words|in her words|his own account|her own account)\b|[“«„]|"[A-Z]/i;
const STORY = /\b(died|death|buried|married|commission(ed)?|sold|bought|refused|rejected|scandal|salon|exhibit(ed|ion)|shown at|debt|bankrupt|fled|war|exile|illness|ill|pregnan|born|patron|quarrel|stolen|restored|slashed|destroyed|burned|lost|rediscovered|bequeathed)\b/i;
const RECORD = /\b(accession|inventory|raisonn\w*|provenance|catalogue number|inv\.|acquired in|gift of|bequest of|lent by)\b/i;
const ABOUTW = /\b(means|meaning|about|subject|symbol\w*|theme|grief|love|death|memory|faith|desire|power|modern\w*|loss|time|longing)\b/gi;
const CRAFTW = /\b(brush\w*|stroke\w*|impasto|glaze\w*|scumble\w*|palette|pigment\w*|ground|underdrawing|wet|knife|layer\w*|canvas|paint\w*|edge\w*|contour\w*|colou?r\w*|tone\w*|composition|diagonal|light|shadow)\b/gi;
const rows = [];
for (const [id, t] of Object.entries(I)) {
  const ab = A[id] || {}; const ctx = t.context || '';
  const stopsText = (t.deeper || []).map(s => s.body).join(' ');
  const stop5 = grams(stopsText, 5), stop4 = grams(stopsText, 4);
  const voice = VOICE.test(ctx) || VOICE.test(ab.about || '') || VOICE.test(ab.deep || '');
  const story = STORY.test(ctx);
  const dated = /\b1[4-9]\d\d\b|\b20[0-2]\d\b/.test(ctx);
  const ctxSent = ctx.split(/(?<=[.!?])\s+/).filter(Boolean);
  const recordShare = ctxSent.length ? ctxSent.filter(s => RECORD.test(s)).length / ctxSent.length : 0;
  const seeSpend = share(grams(t.see, 5), stop5);
  const seeArgues = ((t.see || '').match(ABOUTW) || []).length;
  const aboutCraft = ((t.about || '').match(CRAFTW) || []).length / Math.max(1, toks(t.about).length);
  const craftMarks = ((t.craft || '').match(CRAFTW) || []).length;
  const interpRetell = ab.deep ? share(grams(ab.deep, 4), stop4) : null;
  const flags = [];
  if (!voice) flags.push('no-voice');
  if (!story) flags.push('no-story');
  if (!dated) flags.push('context-undated');
  if (recordShare >= 0.5) flags.push('context-record-led');
  if (seeSpend >= 0.12) flags.push('see-spends-stops');
  if (seeArgues >= 4) flags.push('see-argues');
  if (aboutCraft >= 0.09) flags.push('about-is-craft');
  if (craftMarks < 3) flags.push('craft-thin');
  if (interpRetell != null && interpRetell >= 0.15) flags.push('interp-retells');
  const depth = (voice ? 1 : 0) + (story ? 1 : 0) + (dated ? 1 : 0);
  const muddy = flags.filter(f => /see-|about-|craft-|interp-|record/.test(f)).length;
  const w = byId[id] || {};
  rows.push({ id, artist: w.artist || '', mv: t.mv || 1, seen: w.seenConfidence || (w.wish ? 'wish' : ''), floored: !!(w.floored || w.favorite),
    depth, muddy, flags, seeSpend: +seeSpend.toFixed(2), aboutCraft: +aboutCraft.toFixed(2), interpRetell: interpRetell == null ? null : +interpRetell.toFixed(2) });
}
fs.writeFileSync(C + 'depth-census.json', JSON.stringify(rows, null, 1));
const pc = (n, d) => Math.round(100 * n / d) + '%';
const by = k => rows.filter(r => r.flags.includes(k)).length;
console.log('TOURS', rows.length);
for (const k of ['no-voice', 'no-story', 'context-undated', 'context-record-led', 'see-spends-stops', 'see-argues', 'about-is-craft', 'craft-thin', 'interp-retells'])
  console.log('  ' + k.padEnd(20), String(by(k)).padStart(4), pc(by(k), rows.length));
const eras = [...new Set(rows.map(r => String(r.mv)))].sort((a, b) => parseFloat(a) - parseFloat(b));
console.log('\nby era: n | voice | story | muddy>=2');
for (const e of eras) { const R = rows.filter(r => String(r.mv) === e); console.log('  mv ' + e.padEnd(4), String(R.length).padStart(4), pc(R.filter(r => !r.flags.includes('no-voice')).length, R.length).padStart(5), pc(R.filter(r => !r.flags.includes('no-story')).length, R.length).padStart(5), pc(R.filter(r => r.muddy >= 2).length, R.length).padStart(5)); }
const cand = rows.filter(r => r.seen === 'sure' || r.floored).sort((a, b) => (a.depth - b.depth) || (b.muddy - a.muddy));
console.log('\nTOP DEEPENING CANDIDATES (seen sure or floored; lowest depth, muddiest first):');
for (const r of cand.slice(0, 25)) console.log('  ' + r.id.slice(0, 46).padEnd(48) + ('mv' + r.mv).padEnd(6) + 'depth ' + r.depth + '  ' + r.flags.join(','));
