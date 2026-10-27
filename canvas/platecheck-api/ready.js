// platecheckNN/ready.js — list fix files that are checked but not yet sent to a seal; dry-run each.
// node ready.js [--mark id1,id2]   (--mark records ids as dispatched in dispatched.json)
const fs = require('fs'), { execSync } = require('child_process');
const D = __dirname + '/', M = D + 'dispatched.json';
const done = fs.existsSync(M) ? JSON.parse(fs.readFileSync(M, 'utf8')) : [];
const i = process.argv.indexOf('--mark');
if (i > 0) { const add = process.argv[i + 1].split(','); fs.writeFileSync(M, JSON.stringify([...new Set([...done, ...add])], null, 1)); console.log('marked', add.length); process.exit(0); }
for (const id of JSON.parse(fs.readFileSync(D + 'ids.json', 'utf8'))) {
  if (done.includes(id) || !fs.existsSync(D + `fix_${id}.json`)) continue;
  let r;
  try { r = execSync(`node apply-repairs.js ../../.dtmp/platecheckNN/fix_${id}.json`, { cwd: 'C:/Users/Fuad/Documents/GitHub/fuad.au/canvas' }).toString(); }
  catch (e) { r = String(e.stdout || '') + String(e.stderr || ''); }
  const ok = (r.match(/\d+ changes OK[^\n]*/) || [])[0];
  console.log(id, '|', ok || 'DRY RUN PROBLEM: ' + (r.match(/PROBLEMS:[\s\S]*?(?=\n\n|$)/) || [r.slice(-300)])[0].replace(/\n/g, ' '));
}
