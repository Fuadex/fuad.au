// gate-label.js — READS_SPEC §2026-09-26 rule 2 (label-citation gate; mechanizes the 08-15 voice lesson).
// Reader-facing prose never cites the apparatus. Usage: node gate-label.js <id> [<id> ...]
const fs = require('fs');
const C = 'C:/Users/Fuad/Documents/GitHub/fuad.au/canvas/';
const insp = Object.values((new Function('window', fs.readFileSync(C + 'art_inspect.js', 'utf8') + ';return window;'))({}))[0];
const about = Object.values((new Function('window', fs.readFileSync(C + 'art-about.js', 'utf8') + ';return window;'))({}))[0];
const PAT = [
  /\bregister (?:calls|gives|lists|notes)\b/i,
  /\bcatalogue(?:s| entry| raisonn\u00e9)? (?:calls|gives|ties|lists|names|prints|records)\b/i,
  /\bthe record (?:gives|names|says|prints|lists|holds)\b/i,
  /\brecords? the inscription\b/i,
  /\b(?:museum|gallery|holder)(?:'s)? (?:catalogues?|records?|entry|file|label) (?:it|the|gives|says|calls)\b/i,
  /\bon the museum's own file\b/i,
  /\b(?:entry|record) for [A-Z]{1,4}\.? ?\d+ gives\b/i,
  /\bcuratorial prose\b/i,
  /\bits (?:catalogue|entry|label|record) (?:ties|calls|names|gives)\b/i,
  /\bcatalogued (?:as|under)\b/i,
  /\bthe indexes?\b/i,
  /\bkeywords\b/i,
];
let fail = 0;
for (const id of process.argv.slice(2)) {
  const rw = fs.existsSync(__dirname + '/rewrite_' + id + '.json')
    ? JSON.parse(fs.readFileSync(__dirname + '/rewrite_' + id + '.json', 'utf8')).fields : {};
  // wave 17: a NEW tour lives in out_tour_<id>.json (and reads in interp_/info_/beside_ files) — gate those too
  const ot = __dirname + '/out_tour_' + id + '.json';
  const e = fs.existsSync(ot) ? JSON.parse(fs.readFileSync(ot, 'utf8')) : JSON.parse(JSON.stringify(insp[id] || {}));
  for (const [f, k] of [['interp_', 'deep'], ['info_', 'about']]) {
    const fp = __dirname + '/' + f + id + '.md';
    if (fs.existsSync(fp)) { if (k === 'deep') rw.deep = rw.deep || fs.readFileSync(fp, 'utf8').trim(); else rw.info = rw.info || fs.readFileSync(fp, 'utf8').trim(); }
  }
  const bf = __dirname + '/beside_' + id + '.json';
  if (fs.existsSync(bf)) { const b = JSON.parse(fs.readFileSync(bf, 'utf8')); if (b.beside) e.beside = b.beside; }
  const a = JSON.parse(JSON.stringify(about[id] || {}));
  for (const [k, v] of Object.entries(rw)) {
    if (k === 'info') a.about = v;
    else if (k === 'deep') a.deep = v;
    else if (k.startsWith('deeper[')) { const i = +k.match(/\d+/)[0]; if (e.deeper && e.deeper[i]) e.deeper[i].body = v; }
    else e[k] = v;
  }
  const fields = { see: e.see, about: e.about, craft: e.craft, context: e.context, beside: e.beside, info: a.about, deep: a.deep };
  (e.deeper || []).forEach((d, i) => fields['stop[' + i + '] ' + d.t] = d.body);
  for (const [k, t] of Object.entries(fields)) {
    if (!t) continue;
    for (const p of PAT) {
      const hit = t.match(p);
      if (hit) { console.log(`FAIL ${id} ${k}: "${hit[0]}"`); fail++; }
    }
  }
}
console.log(fail ? `\n${fail} FAIL(s)` : 'label: CLEAN');
process.exitCode = fail ? 1 : 0;
