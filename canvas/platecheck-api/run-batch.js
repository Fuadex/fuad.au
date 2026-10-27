// platecheckNN/run-batch.js — run api-check.js over a slice of ids.json with bounded concurrency.
// node run-batch.js <from> <to> [concurrency=5]   (0-based slice of ids.json; skips ids that already have fix_<id>.json)
// One summary line per work on stdout ("DONE id …" / "FAIL id …"); each work's full log is log_<id>.txt.
const fs = require('fs'), { spawn } = require('child_process');
const D = __dirname + '/';
const [from, to, conc] = [+process.argv[2], +process.argv[3], +(process.argv[4] || 5)];
const ids = JSON.parse(fs.readFileSync(D + 'ids.json', 'utf8')).slice(from, to)
  .filter(id => !fs.existsSync(D + `fix_${id}.json`) && fs.existsSync(D + `img_${id}.jpg`));
let next = 0, live = 0;
const run = () => {
  while (live < conc && next < ids.length) {
    const id = ids[next++]; live++;
    const log = fs.openSync(D + `log_${id}.txt`, 'w');
    const p = spawn('node', [D + 'api-check.js', id], { stdio: ['ignore', log, log] });
    p.on('exit', code => {
      live--; const t = fs.readFileSync(D + `log_${id}.txt`, 'utf8');
      const ch = (t.match(/: (\d+) changes/) || [])[1], u = (t.match(/usage (\{.*\})/) || [])[1];
      let cost = '';
      if (u) { const j = JSON.parse(u); cost = '$' + (j.output_tokens * 25e-6 + j.cache_creation_input_tokens * 6.25e-6 + j.cache_read_input_tokens * 0.5e-6 + j.input_tokens * 5e-6).toFixed(2); }
      console.log(code === 0 && ch ? `DONE ${id} ${ch} changes ${cost}` : `FAIL ${id} exit ${code} ${t.split('\n').filter(Boolean).slice(-1)[0] || ''}`);
      if (next >= ids.length && live === 0) console.log('BATCH COMPLETE'); else run();
    });
  }
};
console.log('queue', ids.length); if (!ids.length) console.log('BATCH COMPLETE'); run();
