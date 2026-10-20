// sealscan21.js — the stack-wide forbidden-term scan (wave-21 rules, from the two fusions' Forbidden and RESERVED
// lists plus the R-rulings in QUEUE.md).
//
// ⛔ THIS FLAGS, IT DOES NOT JUDGE. Every hit is read before it is booked.
//
// Rule shape: [regex, why, allowIn?] — allowIn lists the layers where the term is EXPECTED (a reserved claim in the
// INTERP, the couplet in the INFO); a hit there is printed as "ok" and not counted. A hit anywhere else counts.
// Layer names: tour.see / tour.about / tour.craft / tour.context / tour.stopN(.title) / tour.survey / tour.flag / INFO /
// INTERP / BESIDE. Flags are LOG, so the apparatus and measurement GLOBALs skip them.
//
// FIX vs sealscan17: the beside JSON stores `beside` as a STRING; wave 17's reader looked for .text/.prose/.body on it
// and so never scanned a single companion paragraph. Here a string beside is read directly.
const fs = require('fs');
const INT = ['INTERP'], INF = ['INFO'];
const RULES = {
  'philip-james-de-loutherbourg-the-falls-of-the-rhine-at-schaf': [
    [/Lefeuvre[^.]{0,80}(narrower|taller|wall|steps|mound|crag)|narrower and taller|wall of water|in steps/i, 'RESERVED to the Interpretation (Lefeuvre\'s changes)', INT.concat(['tour.flag'])],
    [/Nile|Cataract/i, 'the Info owns the Nile notice', INF.concat(['tour.flag'])],
    [/soap-?suds/i, 'V&A summary only — keep out', ['tour.flag']],
    [/duel|pistol|arsenic/i, 'the duel is RUMOUR — never'],
    [/Germany|German falls|largest waterfall/i, 'the falls are in Switzerland; no superlative', ['tour.flag']],
    [/returned (to London )?in (January|May)|back in London (by|in)/i, 'the return date is a DOUBT'],
    [/Wörth[^.]{0,80}(north bank|moved|relocat)/i, 'the Wörth geography may not be stated (R7)'],
    [/\bsublime\b/i, 'LOG — stock lesson risk', ['tour.flag']],
  ],
  'anna-nordlander-at-the-suspended-cradle-study': [
    [/uncivilised|foreign race|Warburg|Lange/i, 'RESERVED to the Interpretation (the critics)', INT.concat(['tour.flag'])],
    [/Höckert|Hockert|Salon|seventy times/i, 'the Info owns Höckert', INF.concat(['INTERP', 'tour.flag'])],
    [/Madonna|Virgin|purity/i, 'the Madonna reading may be of the sister study — Interpretation only, hedged', INT.concat(['tour.flag'])],
    [/first (artist|painter) to (depict|paint)/i, 'unproven — never'],
    [/(his|her) (teacher|pupil)|taught her/i, 'Höckert as teacher is hedged everywhere — keep out', ['tour.flag']],
    [/signed|signature|dated 1870/i, 'no signature recorded', ['tour.flag']],
    [/\bchild'?s face|the baby'?s face|the infant'?s face/i, 'no face is painted in the bundle'],
    [/stolen|theft|1984/i, 'the sister study\'s theft — keep out', ['tour.flag']],
  ],
  'robert-delaunay-tour-eiffel': [
    [/Cendrars|collapsed on itself|ten viewpoints|bird'?s-eye/i, 'RESERVED to the Interpretation (Cendrars)', INT.concat(['tour.flag'])],
    [/sister|from below|looking up|contre-plong|Pompidou/i, 'the Info owns the sister canvas', INF.concat(['tour.flag'])],
    [/169 ?× ?86|169 x 86/i, 'the Pompidou size — never', ['tour.flag']],
    [/head tipped back|at its foot|climbs? (from|out of) its foot|from the ground up/i, 'R8: aerial throughout — no from-below view'],
    [/painted from (the|a) (balloon )?photograph|after the 1909 photograph/i, 'the 1909 photograph is SERIES-level only'],
    [/aviator|Ève future|taken down after/i, 'unconfirmed — never'],
    [/\blavender\b|\bindigo\b|mauve/i, 'R8 colour rulings (grey-blue, blue, fawn)', ['tour.flag']],
    [/Orphism|orphique|simultaneous contrast|simultan/i, 'stock label / collision', ['tour.flag']],
    [/twenty|fifty|\d+ Towers/i, 'never a count of Towers', ['tour.flag']],
  ],
};

// Across the batch (reader layers only for the apparatus/measurement rules; flags are LOG).
const GLOBAL = [
  [/on the museum'?s own file|the museum'?s own record|at the service'?s own resolution|the holder'?s own (file|catalogue)/i, 'the wave-12 banned phrase'],
  [/\bgoverns?\b|\bgoverning\b/i, 'batch law: never "governs"'],
  [/\b\d+ ?(%|per ?cent)|\bpixels?\b|\bpx\b|\bratio\b|luminance|\bRGB\b|histogram|\bsampled\b/i, 'LESSON 4 / measurement quarantine', 'reader'],
  [/\btiles?\b|\bthe plate\b|\bzoom|\bthe scan\b|\bthis (photograph|reproduction|image file)\b|\bthe file\b/i, 'never cite the apparatus', 'reader'],
  [/a handful of strokes/i, 'cross-wave template phrase'],
  [/aerial perspective|the old device/i, 'cross-wave: Corot and Dahl share it — at most one'],
];

function layers(id) {
  const out = [];
  const t = 'out_tour_' + id + '.json';
  if (fs.existsSync(t)) {
    const j = JSON.parse(fs.readFileSync(t, 'utf8'));
    for (const k of ['see', 'about', 'craft', 'context']) if (j[k]) out.push(['tour.' + k, j[k]]);
    (j.deeper || []).forEach((d, i) => { if (d.t) out.push(['tour.stop' + (i + 1) + '.title', d.t]); if (d.body) out.push(['tour.stop' + (i + 1), d.body]); });
    (j.survey || []).forEach(s => { const v = typeof s === 'string' ? s : JSON.stringify(s); out.push(['tour.survey', v]); });
    (j.flags || []).forEach(s => { if (typeof s === 'string') out.push(['tour.flag', s]); });
  }
  for (const [pre, label] of [['interp_', 'INTERP'], ['info_', 'INFO']]) {
    const f = pre + id + '.md'; if (fs.existsSync(f)) out.push([label, fs.readFileSync(f, 'utf8')]);
  }
  const b = 'beside_' + id + '.json';
  if (fs.existsSync(b)) {
    const j = JSON.parse(fs.readFileSync(b, 'utf8'));
    const o = j.beside;
    if (typeof o === 'string') out.push(['BESIDE', o]);
    else if (o) for (const k of ['text', 'prose', 'body']) if (typeof o[k] === 'string') out.push(['BESIDE', o[k]]);
    if (!out.some(l => l[0] === 'BESIDE')) out.push(['BESIDE', '(NO BESIDE TEXT FOUND)']);
  }
  return out;
}
const allowed = (where, allow) => Array.isArray(allow) && allow.some(a => where === a || where.startsWith(a + '.') || (a === 'tour.flag' && where === 'tour.flag'));
let counted = 0;
for (const id of Object.keys(RULES)) {
  const L = layers(id);
  if (!L.length) { console.log('?? ' + id + ' — no artifacts'); continue; }
  const found = [], ok = [];
  for (const [where, text] of L) {
    for (const [re, why, allow] of RULES[id].concat(GLOBAL)) {
      if (allow === 'reader' && (where === 'tour.flag' || where === 'tour.survey')) continue;
      const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
      let m;
      while ((m = g.exec(text))) {
        const ctx = text.slice(Math.max(0, m.index - 80), m.index + m[0].length + 80).replace(/\s+/g, ' ').trim();
        (allowed(where, allow) ? ok : found).push({ where, term: m[0], why, ctx });
        if (!m[0].length) g.lastIndex++;
      }
    }
  }
  // "rather than" at most once across the tour lenses + stops
  const rt = L.filter(l => l[0].startsWith('tour.') && l[0] !== 'tour.flag').map(l => (l[1].match(/rather than/gi) || []).length).reduce((a, b) => a + b, 0);
  if (rt > 1) found.push({ where: 'tour.*', term: 'rather than ×' + rt, why: 'at most once per tour', ctx: '' });
  counted += found.length;
  console.log((found.length ? '  HITS    ' : '  clean   ') + id + '  (' + found.length + ' counted, ' + ok.length + ' expected)');
  for (const h of found) console.log('     ✗ [' + h.where + '] "' + h.term + '" — ' + h.why + (h.ctx ? '\n         …' + h.ctx + '…' : ''));
  for (const h of ok) console.log('     · ok [' + h.where + '] "' + h.term + '"');
}
console.log('\n' + counted + ' counted hit(s) to read.');
