// validate-refs.js — gate for corpus cross-references (Fuad 2026-08-25).
//
// The prose string is never modified; a sibling `refs` field names the target id and the exact
// words to link. That split is only safe if something checks the two halves still agree, so this
// walks every `refs` in the shipped stores (and, with a path argument, a proposed backfill file
// before it is applied) and reports:
//
//   * BAD ID    — ref.id is not in the canon. This is the whole point of the script: ids typed
//                 from a title look plausible and are wrong ("teodor-axentowicz-kolomyjka" for
//                 the real "teodor-axentowicz-ko-omyjka"), and a wrong id renders a dead link.
//   * NOT FOUND — ref.text occurs zero times in its paragraph (prose edited under the ref).
//   * AMBIGUOUS — ref.text occurs more than once; there is no honest way to pick an occurrence.
//   * SELF      — the ref points at the work whose paragraph it sits in.
//   * SHAPE     — malformed ref, or refs keyed to a field that holds no string.
//
// Matching is literal indexOf, exactly as the renderer does it — the corpus is full of straight
// apostrophes, em-dashes and diacritics that a built regex would reinterpret.
//
// Usage:  node validate-refs.js [extra-refs.json ...]
// Exits non-zero on any failure so it can gate a batch.

const fs = require('fs');
const path = require('path');
const REPO = path.resolve(__dirname, '..', '..');
const C = (f) => path.join(REPO, 'canvas', f);

function evalStore(file, globalName) {
  const w = {};
  new Function('window', fs.readFileSync(file, 'utf8'))(w);
  const s = w[globalName];
  if (!s || typeof s !== 'object') throw new Error('no ' + globalName + ' in ' + file);
  return s;
}

const WORKS = evalStore(C('artworks.js'), 'CANVAS_ARTWORKS');
const CANON = new Set(WORKS.map(w => w.id));

const problems = [];
const fail = (kind, where, detail) => problems.push({ kind, where, detail });
let checked = 0, refsSeen = 0;

// One paragraph + its ref list. `owner` is the entry id, used for the self-reference check.
function checkParagraph(where, owner, text, refs) {
  if (!refs) return;
  if (!Array.isArray(refs)) { fail('SHAPE', where, 'refs is not an array'); return; }
  if (typeof text !== 'string') { fail('SHAPE', where, 'refs present but the paragraph is ' + typeof text); return; }
  checked++;
  for (const r of refs) {
    refsSeen++;
    if (!r || typeof r !== 'object' || typeof r.id !== 'string' || typeof r.text !== 'string' || !r.id || !r.text) {
      fail('SHAPE', where, 'malformed ref ' + JSON.stringify(r));
      continue;
    }
    if (!CANON.has(r.id)) { fail('BAD ID', where, '"' + r.id + '" is not a canon id  (text: "' + r.text + '")'); continue; }
    if (r.id === owner) { fail('SELF', where, 'points at its own work: ' + r.id); }
    let n = 0, at = text.indexOf(r.text);
    while (at >= 0) { n++; at = text.indexOf(r.text, at + r.text.length); }
    if (n === 0) fail('NOT FOUND', where, '"' + r.text + '" does not occur in the paragraph');
    else if (n > 1) fail('AMBIGUOUS', where, '"' + r.text + '" occurs ' + n + ' times');
  }
}

// Resolve the two accepted shapes: a bare array belongs to `dflt`; an object is keyed by field.
function walkObject(where, owner, obj, fields, dflt) {
  const r = obj && obj.refs;
  if (!r) return;
  if (Array.isArray(r)) { checkParagraph(where + '.' + dflt, owner, obj[dflt], r); return; }
  if (typeof r !== 'object') { fail('SHAPE', where, 'refs is neither an array nor an object'); return; }
  for (const k of Object.keys(r)) {
    if (!fields.includes(k)) { fail('SHAPE', where, 'refs keyed to "' + k + '", which is not one of ' + fields.join('/')); continue; }
    checkParagraph(where + '.' + k, owner, obj[k], r[k]);
  }
}

const INSPECT_FIELDS = ['see', 'about', 'craft', 'context', 'beside'];
function walkInspect(store, label) {
  for (const [id, e] of Object.entries(store)) {
    walkObject(label + ' ' + id, id, e, INSPECT_FIELDS, 'beside');
    (e.deeper || []).forEach((c, i) => walkObject(label + ' ' + id + ' deeper[' + i + ']', id, c, ['body'], 'body'));
  }
}
function walkReads(store, label) {
  for (const [id, e] of Object.entries(store)) walkObject(label + ' ' + id, id, e, ['about', 'deep'], 'about');
}

walkInspect(evalStore(C('art_inspect.js'), 'CANVAS_INSPECT'), 'inspect');
walkReads(evalStore(C('art-about.js'), 'CANVAS_ART_ABOUT'), 'art-about');
// the museum read pane renders through the same helper; a museum id is never a work id, so the
// self-reference check simply never fires there.
walkReads(evalStore(C('museum_about.js'), 'CANVAS_MUSEUM_ABOUT'), 'museum-about');

// Optional: validate a proposed backfill BEFORE it is applied. Shape mirrors the stores —
// { tours: { <id>: { refs, <paragraph fields...> } }, reads: { <id>: {...} } } — and the
// paragraphs are read from the LIVE store when the plan does not carry them, so a plan whose
// text has drifted out from under it fails here rather than in the browser.
for (const arg of process.argv.slice(2)) {
  const plan = JSON.parse(fs.readFileSync(arg, 'utf8'));
  const live = {
    tours: evalStore(C('art_inspect.js'), 'CANVAS_INSPECT'),
    reads: evalStore(C('art-about.js'), 'CANVAS_ART_ABOUT'),
  };
  const shapes = { tours: [INSPECT_FIELDS, 'beside'], reads: [['about', 'deep'], 'about'] };
  for (const bucket of ['tours', 'reads']) {
    for (const [id, patch] of Object.entries(plan[bucket] || {})) {
      const base = live[bucket][id];
      if (!base) { fail('BAD ID', path.basename(arg) + ' ' + bucket + ' ' + id, 'no such entry in the live store'); continue; }
      const [fields, dflt] = shapes[bucket];
      walkObject(path.basename(arg) + ' ' + id, id, Object.assign({}, base, patch), fields, dflt);

      // A tour plan may also carry stop-level refs, as `deeper: { "<index>": { refs, body } }`.
      // The merged top-level walk above cannot see them (`deeper` is not one of INSPECT_FIELDS and
      // walkObject only reads the object's own `refs`), so before 2026-08-25 those refs were
      // applied unchecked. Walk them here against the LIVE stop body, exactly as the shipped-store
      // walk does, so a plan whose stop text has drifted fails here and not in the browser.
      if (bucket !== 'tours' || !patch.deeper) continue;
      const liveStops = base.deeper || [];
      for (const [k, stop] of Object.entries(patch.deeper)) {
        const i = Number(k);
        const where = path.basename(arg) + ' ' + id + ' deeper[' + k + ']';
        if (!Number.isInteger(i) || i < 0 || i >= liveStops.length) { fail('SHAPE', where, 'no such stop in the live entry (' + liveStops.length + ' stops)'); continue; }
        walkObject(where, id, Object.assign({}, liveStops[i], stop), ['body'], 'body');
      }
    }
  }
}

const order = ['BAD ID', 'NOT FOUND', 'AMBIGUOUS', 'SELF', 'SHAPE'];
console.log('canon: ' + CANON.size + ' works · paragraphs with refs: ' + checked + ' · refs checked: ' + refsSeen);
if (!problems.length) { console.log('OK — every ref resolves to a canon id and matches its paragraph exactly once'); process.exit(0); }
for (const k of order) {
  const g = problems.filter(p => p.kind === k);
  if (!g.length) continue;
  console.log('\n' + k + ' (' + g.length + ')');
  for (const p of g) console.log('  ' + p.where + '\n     ' + p.detail);
}
console.log('\nFAILED: ' + problems.length + ' problem' + (problems.length === 1 ? '' : 's'));
process.exit(1);
