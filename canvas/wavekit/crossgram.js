// crossgram.js — shared n-grams ACROSS the ten works' reads artifacts.
//
// WHY ONLY THE ORCHESTRATOR CAN RUN THIS. Each reads agent checked its own paragraph against its own
// tour, which is the rule. None of them could check against the other nine, because they wrote
// blind and simultaneously. Cross-work repetition is the batch-gait failure the lens sweeps found in
// every field of the tour layer, and nothing has looked for it in the reads layer at all.
//
// Compared separately by KIND — interp against interp, info against info, beside against beside —
// because the three have different jobs and a phrase shared between an Info and an Interpretation
// of different works is a much weaker signal than two Infos sharing one.
const fs = require('fs');

const N = parseInt(process.argv[2] || '5', 10);  // n-gram width, CLI arg
const STOP = new Set(['the', 'a', 'an', 'of', 'in', 'on', 'and', 'is', 'it', 'to', 'that', 'this']);

const norm = (s) => String(s || '')
  .toLowerCase()
  .replace(/[‘’]/g, "'")
  .replace(/[^a-z0-9\s'-]/g, ' ')
  .split(/\s+/).filter(Boolean);

function grams(words, n) {
  const out = [];
  for (let i = 0; i + n <= words.length; i++) out.push(words.slice(i, i + n).join(' '));
  return out;
}

function load(prefix, ext) {
  const files = fs.readdirSync('.').filter(f => f.startsWith(prefix) && f.endsWith(ext) && !/candidates/.test(f));
  const out = {};
  for (const f of files) {
    const id = f.slice(prefix.length, f.length - ext.length);
    let text = fs.readFileSync(f, 'utf8');
    if (ext === '.json') {
      try {
        const j = JSON.parse(text);
        const b = j.beside || j;
        text = [b.text, b.prose, b.body, j.text].filter(x => typeof x === 'string').join(' ') || '';
      } catch (e) { text = ''; }
    }
    out[id] = norm(text);
  }
  return out;
}

const KINDS = [['interp_', '.md', 'INTERPRETATIONS'], ['info_', '.md', 'INFOS'], ['beside_', '.json', 'BESIDES']];

let worst = 0;
for (const [prefix, ext, label] of KINDS) {
  const docs = load(prefix, ext);
  const ids = Object.keys(docs).sort();
  if (!ids.length) { console.log('\n' + label + ': no files found'); continue; }
  console.log('\n=== ' + label + ' — ' + ids.length + ' files, ' + N + '-grams ===');

  const index = {};
  for (const id of ids) {
    for (const g of new Set(grams(docs[id], N))) {
      // a gram made only of stopwords is not a tell
      if (g.split(' ').every(w => STOP.has(w))) continue;
      (index[g] = index[g] || []).push(id);
    }
  }
  const shared = Object.entries(index).filter(([, who]) => who.length > 1)
    .sort((a, b) => b[1].length - a[1].length);
  if (!shared.length) { console.log('  none shared between any two works'); continue; }
  worst += shared.length;
  for (const [g, who] of shared.slice(0, 25)) {
    console.log('  ' + String(who.length) + '×  "' + g + '"');
    console.log('       ' + who.map(x => x.slice(0, 28)).join(' | '));
  }
  if (shared.length > 25) console.log('  … and ' + (shared.length - 25) + ' more');
}

console.log('\n' + (worst ? worst + ' shared ' + N + '-gram(s) across works — each is a judgement call, not automatically a defect'
                          : 'no cross-work ' + N + '-gram sharing in any kind'));
