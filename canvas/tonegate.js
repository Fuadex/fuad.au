// tonegate.js — the VOICE gate: catches a house tic the length/box gate (bandgate.js) cannot see.
// Run: node tonegate.js <workshop-dir> [id...]   OR   node tonegate.js --store [id...]
//
// WHY THIS EXISTS. bandgate.js already checks that a stop is the right SIZE and its box the right
// SHAPE. It says nothing about what the sentences inside it are doing, and by wave 10 that silence
// had cost something specific: a methodology review of the latest wave found the median stop
// creeping to 149 words (bandgate's 80-200 band waves it through without complaint — it was built
// wide on purpose, to protect a stop whose SUBSTANCE runs long, and 149 sits nowhere near either
// edge) and, worse, nearly every stop in the wave now ENDS ON AN EPIGRAM: a short aphoristic final
// sentence bolted onto an otherwise discursive paragraph — "The hand is early." / "It leans; it
// does not swing." / "The sparkle is the weave, not the water." One or two of these, deployed where
// a passage earns a turn, is a real device (mv 3's proportion rules exist to let substance dictate
// length, not to forbid a short punchy close). Twenty tours where EVERY stop closes this way is not
// twenty decisions, it is a reflex the drafting agent has learned to reach for whether the passage
// argued its way there or not — the tell of a model performing its own house style back at itself.
// A gate cannot judge whether a given epigram is earned. What it CAN do is count how often the shape
// recurs and put a number on it, the same way bandgate turned "feels long" into a word count instead
// of a feeling.
//
// TWO SEPARATE THINGS ARE CHECKED, and they are kept separate below because conflating them was the
// first draft's mistake: (1) BAND — is the stop body 100-135 words, a tighter box than bandgate's
// 80-200, because this gate exists for a wave that specifically crept long; (2) CLOSER — does the
// FINAL sentence read as a bolted-on aphorism, independent of whether the stop is in band. A stop
// can be exactly 118 words and still end on a tic; a 140-word stop that overruns on band can still
// close in full argued prose. Reporting them as one verdict would hide which fix is needed.
//
// WORD COUNTING is bandgate.js's problem solved once already (a naive split miscounts a spaced em
// dash as a word and a hyphenated compound as two) — the function below is copied from bandgate.js
// verbatim rather than re-derived, because a second independent implementation is a second place for
// the same bug to recur under a different name.
//
// SENTENCE SPLITTING is new here and is a heuristic, not a parser. It walks the text for `.` `?` `!`
// `;` followed by whitespace-or-end, then throws out two false positives that would otherwise fire
// mid-sentence: a decimal point between two digits never even reaches the check (the lookahead
// requires the following character to be whitespace, and a decimal's next character is a digit), and
// a small list of period-abbreviations ("c." for circa, "st." for saint, and the like — these prose
// pieces date works "c. 1830" constantly) is excluded explicitly. This will not catch everything a
// human reads as one sentence; it is tuned against the actual prose in this store, not against
// English in general.
//
// EPIGRAM DETECTION is the part with real judgment calls in it, made explicit rather than buried: a
// sentence is an epigram CANDIDATE if it is short (<=8 words) outright, or short-ish (<=12 words) AND
// shaped like an aphorism (see APHORISM_PREFIXES / the "X, not Y" turn / the bare copula "A is B"
// form below). A candidate at <=5 words is rated FAIL (there is no reading of five words as anything
// but a dropped mic); a candidate above that is rated LOOK (short enough to be the tic, not so short
// it can only be the tic — a human still confirms). The shape list was tuned once, during calibration
// against the shipped store on 2026-09-10 — see the note at CALIBRATE below for exactly what changed
// and why; the WORD THRESHOLDS were left untouched throughout, because they were doing their job.
//
// CRAFT gets one extra check the other three lenses do not, because `craft` carries a specific job
// the others don't: state PLAINLY what the hand did (a stroke, a glaze, a scumbled edge — the actual
// physical decision), not gesture at it. A short craft sentence with no concrete-noun anchor in it
// (see CONCRETE_NOUNS) reads as a riddle standing in for an answer, which is the opposite of what the
// lens is for. This is flagged LOOK, not FAIL — plenty of short craft sentences are connective tissue
// between two that do the work ("This continues." is fine if the next sentence names the continuing
// thing) — but it is worth a human's eye every time it fires.
//
// STORE MODE additionally groups by `mv`/`by` and prints a per-cohort table, because the whole point
// of building this gate was to confirm the tic is a WAVE-10 problem and not an every-wave problem the
// project simply never measured before. Tours with no `mv` field and `by: "Opus 5"` are wave 10 (the
// field was only added after; see art_inspect.js's own header). Any other tour missing `mv` groups as
// "none" rather than being silently dropped or silently merged into wave 10 — twelve very old tours
// (mv 1, no `by` at all) predate both fields and are not the wave under review.
const fs = require('fs');
const path = require('path');

// ---- word count: copied verbatim from bandgate.js. Do not re-derive; see header. ----
const words = (s) => String(s || '')
  .toLowerCase()
  .replace(/[–—]/g, ' ')                 // em/en dashes separate, they are not words
  .replace(/[^a-z0-9\s'’-]/g, ' ')       // keep the hyphen: "fifty-nine" is ONE word
  .split(/\s+/)
  .map((w) => w.replace(/^['’-]+|['’-]+$/g, ''))
  .filter(Boolean).length;

// ---- sentence splitting ----
// A handful of period-abbreviations that appear routinely in this store's prose and must not be
// read as sentence ends. Extend by hand if calibration turns up a new one firing false.
const ABBR = new Set(['c', 'ca', 'b', 'd', 'r', 'st', 'mr', 'mrs', 'ms', 'dr', 'no', 'nos', 'vs',
  'jr', 'sr', 'vol', 'fig', 'cf', 'pl', 'op', 'ft', 'in', 'cm', 'kg', 'km', 'etc']);

function splitSentences(text) {
  const s = String(text || '').trim();
  if (!s) return [];
  const parts = [];
  const re = /[.?!;](?=\s|$)/g;
  let lastEnd = 0, m;
  while ((m = re.exec(s))) {
    const idx = m.index, punct = s[idx];
    if (punct === '.') {
      // decimal point: a digit-dot-digit never matches this regex at all (the lookahead demands
      // whitespace/end right after the dot), so only an abbreviation needs filtering here.
      const before = s.slice(0, idx);
      const wordMatch = before.match(/([A-Za-z]+)$/);
      if (wordMatch && ABBR.has(wordMatch[1].toLowerCase())) continue;
    }
    const piece = s.slice(lastEnd, idx + 1).trim();
    if (piece) parts.push(piece);
    lastEnd = idx + 1;
  }
  const rest = s.slice(lastEnd).trim();
  if (rest) parts.push(rest);
  return parts;
}

// ---- epigram shape ----
// Prefixes that read as an aphorism's wind-up ("That is..."/"It is..."/"Here..."), case-insensitive,
// matched at the start of the (trimmed) sentence.
const APHORISM_PREFIXES = [
  'that is ', 'that was ', 'this is ', 'it is ', 'it was ',
  'here ', 'there ', 'what ', 'not ', 'the rest', 'nothing', 'everything',
];

// The "no verb but the copula" test for a bare "A is B" aphorism. Not a real parser — a sentence
// with exactly one is/was/are and no word from this list is treated as having no other verb. Tuned
// against this store's register (Impressionist/study-tour prose), not general English.
const OTHER_VERBS = new Set([
  'has', 'have', 'had', 'does', 'did', 'makes', 'made', 'gives', 'gave', 'takes', 'took',
  'holds', 'held', 'keeps', 'kept', 'leaves', 'left', 'stays', 'stayed', 'remains', 'remained',
  'becomes', 'became', 'seems', 'seemed', 'looks', 'looked', 'feels', 'felt', 'runs', 'ran',
  'goes', 'went', 'comes', 'came', 'turns', 'turned', 'points', 'pointed', 'settles', 'settled',
  'sits', 'sat', 'stands', 'stood', 'lies', 'lay', 'opens', 'opened', 'closes', 'closed',
  'breaks', 'broke', 'builds', 'built', 'works', 'worked', 'moves', 'moved', 'reads', 'carries',
  'carried', 'pulls', 'pulled', 'throws', 'threw', 'drags', 'dragged', 'swings', 'swung',
  'leans', 'leaned', 'crosses', 'crossed', 'meets', 'met', 'follows', 'followed', 'shows',
  'showed', 'tells', 'told', 'says', 'said', 'calls', 'called', 'means', 'meant', 'matters',
  'mattered', 'counts', 'counted', 'lands', 'landed', 'arrives', 'arrived', 'waits', 'waited',
  'watches', 'watched', 'sees', 'saw', 'hears', 'heard', 'knows', 'knew', 'wants', 'wanted',
  'needs', 'needed', 'lets', 'let', 'puts', 'put', 'sets', 'set', 'gets', 'got', 'plays',
  'played', 'sings', 'sang', 'speaks', 'spoke', 'breathes', 'breathed', 'lives', 'lived',
  'dies', 'died', 'grows', 'grew', 'fills', 'filled', 'empties', 'emptied', 'spends', 'spent',
  'rests', 'rested', 'hangs', 'hung', 'stops', 'stopped', 'starts', 'started', 'begins',
  'began', 'ends', 'ended', 'finishes', 'finished', 'does', 'do', 'go', 'come',
]);

function hasAphorismPrefix(sentence) {
  const low = sentence.trim().toLowerCase();
  return APHORISM_PREFIXES.some((p) => low.startsWith(p) || low === p.trim());
}

function hasNotTurn(sentence) {
  // the "X, not Y" turn: a comma or semicolon immediately ahead of "not"
  return /[,;]\s*not\s+/i.test(sentence);
}

function isAisBShape(sentence) {
  const clean = sentence.replace(/[.?!;]+$/, '').trim();
  const toks = (clean.toLowerCase().match(/[a-z']+/g) || []);
  const copulas = toks.filter((w) => w === 'is' || w === 'was' || w === 'are').length;
  if (copulas !== 1) return false;
  return !toks.some((w) => OTHER_VERBS.has(w));
}

// BOLT-ON, added during calibration (see CALIBRATE below): the lexical shapes above match a short
// closer whether it grew out of the paragraph or was dropped onto it. What the methodology review
// actually flagged is the drop itself — a body that argues at length and then snaps to one bare
// line. So a final sentence that runs well under half the average length of the (at least two)
// sentences before it, in a paragraph that was genuinely discursive to begin with (prior-sentence
// mean >= 15 words), is treated as shaped even when it matches none of the lexical patterns: the
// bolt is the shape.
function isBoltOn(allSentences) {
  if (!allSentences || allSentences.length < 3) return false;
  const prior = allSentences.slice(0, -1).map(words);
  const meanPrior = prior.reduce((a, b) => a + b, 0) / prior.length;
  if (meanPrior < 15) return false;
  return words(allSentences[allSentences.length - 1]) <= meanPrior * 0.45;
}

function matchesAphorismShape(sentence, allSentences) {
  return hasAphorismPrefix(sentence) || hasNotTurn(sentence) || isAisBShape(sentence) ||
    isBoltOn(allSentences);
}

// Given the full sentence list of a text, rate its FINAL sentence: null (not an epigram) or
// {sentence, rating, wc}.
function checkCloser(text) {
  const sentences = splitSentences(text);
  if (!sentences.length) return null;
  const last = sentences[sentences.length - 1];
  const wc = words(last);
  const shapeHit = matchesAphorismShape(last, sentences);
  const isCandidate = wc <= 8 || (wc <= 12 && shapeHit);
  if (!isCandidate) return null;
  return { sentence: last, rating: wc <= 5 ? 'FAIL' : 'LOOK', wc };
}

// ---- craft: plain-statement check ----
// `craft` is supposed to name what the hand actually did. A short sentence in this lens that names
// none of these is probably gesturing at technique rather than stating it — flag it, don't fail it.
const CONCRETE_NOUNS = ['paint', 'brush', 'stroke', 'touch', 'glaze', 'ground', 'canvas', 'panel',
  'line', 'edge', 'contour', 'impasto', 'wash', 'pigment', 'layer', 'mark', 'scumble', 'drag',
  'load', 'varnish', 'weave'];

function craftAbstractHits(text) {
  const hits = [];
  for (const s of splitSentences(text)) {
    const wc = words(s);
    if (wc > 0 && wc < 9) {
      const low = s.toLowerCase();
      if (!CONCRETE_NOUNS.some((n) => low.includes(n))) hits.push({ sentence: s, wc });
    }
  }
  return hits;
}

// ---- per-stop band ----
function bandRating(wc) {
  if (wc < 100) return { rating: 'FAIL', note: '<100' };
  if (wc > 135) return { rating: 'FAIL', note: '>135' };
  if (wc >= 130) return { rating: 'LOOK', note: '130-135 ceiling' };
  return null;
}

// ---- assemble one tour's verdict ----
const LENS = ['see', 'about', 'craft', 'context'];

function checkTour(t) {
  const issues = [];
  let status = 'ok';
  const note = (sev, where, detail) => {
    issues.push({ sev, where, detail });
    if (sev === 'FAIL') status = 'FAIL';
    else if (sev === 'LOOK' && status === 'ok') status = 'LOOK';
  };

  const stops = t.deeper || [];
  const stopStats = [];
  stops.forEach((d, i) => {
    const wc = words(d.body);
    const label = 'stop' + (i + 1);
    const band = bandRating(wc);
    if (band) note(band.rating, label, band.rating + ' ' + wc + 'w (' + band.note + ')');
    const closer = checkCloser(d.body);
    if (closer) note(closer.rating, label + ' closer',
      closer.rating + ' closer "' + closer.sentence + '" (' + closer.wc + 'w)');
    stopStats.push({ wc, over135: wc > 135, closerRating: closer ? closer.rating : null, closerSentence: closer ? closer.sentence : null });
  });

  let craftAbstract = false;
  for (const lens of LENS) {
    const text = t[lens];
    if (!text) { note('LOOK', lens, 'LOOK missing ' + lens); continue; }
    const closer = checkCloser(text);
    if (closer) note(closer.rating, lens + ' closer',
      closer.rating + ' closer "' + closer.sentence + '" (' + closer.wc + 'w)');
    if (lens === 'craft') {
      const hits = craftAbstractHits(text);
      for (const h of hits) {
        note('LOOK', 'craft', 'LOOK craft: abstract "' + h.sentence + '" (' + h.wc + 'w)');
        craftAbstract = true;
      }
    }
  }

  return { status, issues, stopStats, craftAbstract, stopCount: stops.length };
}

// ---- CLI ----
const argv = process.argv.slice(2);
if (!argv.length) {
  console.log('usage: node tonegate.js <workshop-dir>|--store [id...]');
  process.exit(1);
}
const mode = argv[0] === '--store' ? 'store' : 'dir';
const DIR = mode === 'dir' ? argv[0].replace(/\\/g, '/').replace(/\/?$/, '/') : null;
const idFilter = argv.slice(1).length ? new Set(argv.slice(1)) : null;

const TOURS = {};
if (mode === 'store') {
  const w = {};
  global.window = w;
  eval(fs.readFileSync(path.join(__dirname, 'art_inspect.js'), 'utf8'));
  Object.assign(TOURS, w.CANVAS_INSPECT || {});
} else {
  if (!fs.existsSync(DIR)) { console.log('no such dir: ' + DIR); process.exit(1); }
  const files = fs.readdirSync(DIR).filter((f) => /^out_tour_.*\.json$/.test(f)).sort();
  if (!files.length) { console.log('no out_tour_*.json in ' + DIR); process.exit(1); }
  for (const f of files) {
    const id = f.replace('out_tour_', '').replace('.json', '');
    try { TOURS[id] = JSON.parse(fs.readFileSync(DIR + f, 'utf8').replace(/^﻿/, '')); }
    catch (e) { console.log('  JSON FAIL  ' + id + ': ' + e.message.slice(0, 70)); }
  }
}

let ids = Object.keys(TOURS);
if (idFilter) ids = ids.filter((id) => idFilter.has(id));
if (!ids.length) { console.log('no matching tours'); process.exit(1); }

let okN = 0, lookN = 0, failN = 0;
const results = {};
for (const id of ids.sort()) {
  const r = checkTour(TOURS[id]);
  results[id] = r;
  if (r.status === 'FAIL') failN++;
  else if (r.status === 'LOOK') lookN++;
  else okN++;
  if (r.status === 'ok') {
    console.log('  ok    ' + id.slice(0, 50).padEnd(51) + r.stopCount + ' stops');
  } else {
    console.log('  ' + r.status.padEnd(6) + id);
    for (const iss of r.issues) console.log('          ' + iss.where + ': ' + iss.detail);
  }
}
console.log('\n' + okN + ' ok | ' + lookN + ' LOOK | ' + failN + ' FAIL   of ' + ids.length + ' tours checked');

// ---- store mode: cohort table + opener census ----
// CALIBRATE, run 2026-09-10: read this before trusting the epigram columns of the cohort table.
// The BAND column (% stops over 135 words) separated cleanly on the FIRST run, no tuning needed:
// wave 10 came out at 69.9%, a clean staircase down to mv 1's 7.7% — the median-149-words finding
// confirmed exactly.
// The epigram columns did NOT separate on the first run, and the honest finding is worth recording
// rather than papering over: a plain word-count-and-lexical-prefix "short closer" rate is close to
// FLAT across the store's entire five-mv history (roughly 10-15% of stops end on a <=12-word closer
// in every cohort, wave 10 included) — extending the aphorism-prefix list alone could not open a gap
// that the underlying numbers do not contain, because this short-punchy-closer habit is not new to
// wave 10, it is the house voice and always has been. Reporting a false separation would have been
// worse than reporting none.
// One tuning pass DID move the number, and it is the isBoltOn() check above: instead of asking only
// "is the closer short/shaped", it asks "does the closer fall to under half the average length of
// the sentences before it, in a paragraph that was genuinely running on (>=15w/sentence) before the
// drop" — the actual rhetorical snap the review described, not just brevity. Restricted to bodies
// that ran >=120 words (long enough to BE discursive) this isolated pattern sits at 5.7% for wave 10
// against 3.1% for mv 1, with mv 3/mv 4 (the proportion-rules and parallel-front-end waves) lowest
// of all at 0.0% — which lines up with project history: those two waves are exactly the ones that
// added anti-sameness discipline to the cascade, and the bolt-on crept back after. It is NOT a clean
// monotonic staircase (mv 4.1 sits above wave 10 at 8.8%, an open question rather than an error), so
// treat the epigram columns as a real but noisier signal than BAND, and treat any single-tour FAIL
// as the trustworthy unit — the corpus-wide rate is where the tic hides in noise, not where it is
// easiest to see. The word thresholds (<=8 outright, <=12 with a shape hit, <=5 is FAIL) were never
// touched throughout any of this — only what counts as "shaped" changed.
if (mode === 'store' && !idFilter) {
  const cohortOf = (t) => {
    if (t.mv === undefined) return (t.by === 'Opus 5') ? 'w10' : 'none';
    return String(t.mv);
  };
  const cohorts = {};
  for (const id of ids) {
    const t = TOURS[id], r = results[id];
    const k = cohortOf(t);
    if (!cohorts[k]) cohorts[k] = { tours: 0, stops: 0, over135: 0, look: 0, fail: 0, craftAbstract: 0 };
    const c = cohorts[k];
    c.tours++;
    c.craftAbstract += r.craftAbstract ? 1 : 0;
    for (const s of r.stopStats) {
      c.stops++;
      if (s.over135) c.over135++;
      if (s.closerRating === 'LOOK') c.look++;
      if (s.closerRating === 'FAIL') c.fail++;
    }
  }
  const pct = (n, d) => d ? (100 * n / d).toFixed(1) + '%' : '-';
  const order = Object.keys(cohorts).sort((a, b) => {
    if (a === 'w10') return -1; if (b === 'w10') return 1;
    if (a === 'none') return 1; if (b === 'none') return -1;
    return parseFloat(b) - parseFloat(a);
  });
  console.log('\ncohort   tours  stops  >135w    epigram-LOOK  epigram-FAIL  craft-abstract(tours)');
  for (const k of order) {
    const c = cohorts[k];
    console.log(
      k.padEnd(8) + String(c.tours).padStart(5) + '  ' + String(c.stops).padStart(5) + '  ' +
      pct(c.over135, c.stops).padStart(6) + '   ' + pct(c.look, c.stops).padStart(11) + '   ' +
      pct(c.fail, c.stops).padStart(11) + '   ' + pct(c.craftAbstract, c.tours).padStart(6)
    );
  }

  // Top closing-sentence openers (first two words), stop bodies only, whole store — a raw census
  // to extend the tic list by hand, independent of whether the gate currently rates a given opener.
  const openerCount = {};
  for (const id of ids) {
    for (const s of results[id].stopStats) {
      if (!s.closerSentence) continue;
      const toks = s.closerSentence.trim().split(/\s+/).slice(0, 2).join(' ')
        .replace(/[.,;:!?"'']+$/, '');
      if (!toks) continue;
      const key = toks.toLowerCase();
      openerCount[key] = (openerCount[key] || 0) + 1;
    }
  }
  const topOpeners = Object.entries(openerCount).sort((a, b) => b[1] - a[1]).slice(0, 12);
  console.log('\ntop 12 closing-sentence openers (first two words, stop bodies, whole store):');
  for (const [k, n] of topOpeners) console.log('  ' + String(n).padStart(3) + '  ' + k);
}
