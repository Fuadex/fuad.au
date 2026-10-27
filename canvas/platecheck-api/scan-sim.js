// platecheckNN/scan-sim.js — scan the simulated (post-apply) text of every work touched by fix/seal/zz_orch files
// for banned viewing / apparatus words and unaccented names. node scan-sim.js <simDir>
const fs = require('fs');
const S = process.argv[2].replace(/\/?$/, '/');
const L = f => { const o = {}; new Function('window', fs.readFileSync(S + f, 'utf8'))(o); return Object.values(o)[0]; };
const I = L('art_inspect.js'), A = L('art-about.js');
const ids = new Set();
for (const f of fs.readdirSync('.').filter(f => /^(fix|seal)_.*\.json$|^zz_orch\.json$/.test(f))) for (const c of JSON.parse(fs.readFileSync(f, 'utf8'))) ids.add(c.id);
const re = /\b(plate|crop|cropped|zoom|photograph(ed)?|reproduction|in person|up close|step back|step close|stand(ing)? (in front|before)|from the doorway|across the room|at arm's length|the gallery|Floge|Musee|Hebuterne|color|gray)\b/gi;
const out = new Set();
for (const id of ids) {
  const t = I[id] || {}, a = A[id] || {};
  const parts = { see: t.see, about: t.about, craft: t.craft, context: t.context, beside: t.beside, Iabout: a.about, deep: a.deep };
  (t.deeper || []).forEach((d, i) => { parts['d' + i + 't'] = d.t; parts['d' + i] = d.body; });
  for (const [k, s] of Object.entries(parts)) {
    if (typeof s !== 'string') continue;
    let m; re.lastIndex = 0;
    while ((m = re.exec(s))) out.add(id.slice(0, 44) + ' ' + k + ' :: ' + s.slice(Math.max(0, m.index - 70), m.index + 60));
  }
}
console.log([...out].sort().join('\n') || 'clean');
