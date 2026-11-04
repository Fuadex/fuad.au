#!/usr/bin/env node
// migrate-flicks.js — one-time migration (Fuad 2026-11-04): song-read flicks become a real system.
//
//   node migrate-flicks.js recover   -> walks llm-about.js git history and recovers the fvr each
//                                       current fable2 text carried while it was frontal; writes
//                                       flick-fvr.local.json (report only, no store change).
//   node migrate-flicks.js apply     -> rewrites every fable2 row as flicks:[{t, fvr}] and drops
//                                       fable2. Requires flick-fvr.local.json from `recover`.
//
// Rationale: fable2 was an unversioned string the track page STACKED under the frontal read.
// The flick system mirrors the artist/album Portrait chip: one read on the page, a chip that
// cycles to older takes and names what it reverts to. A flick's version was never stored, but
// every flick was once a frontal, so its fvr is recoverable from history (absent fvr = "2.2").
// `fableAlt` (a fold-merged twin's own read) is a different thing and is NOT migrated.
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const HERE = __dirname;
const SRC = path.join(HERE, 'llm-about.js');
const MAP = path.join(HERE, 'flick-fvr.local.json');

const loadStore = (text) => (new Function('window', text + '\nreturn window;'))({}).ROTATION_LLM_ABOUT;

function currentFlickRows() {
  const store = loadStore(fs.readFileSync(SRC, 'utf8'));
  const rows = {};
  for (const [k, v] of Object.entries(store)) if (v.fable2) rows[k] = v.fable2;
  return rows;
}

if (process.argv[2] === 'recover') {
  const want = currentFlickRows();
  const keys = new Set(Object.keys(want));
  console.log('flick rows to recover:', keys.size);
  // stream `git log -p` (newest first); every +line that carries one of our keys is a full
  // historical row — record each (key, fable, fvr) sighting. Newest-first order is fine: any
  // sighting of the flick text as a frontal carries the fvr it shipped under.
  const git = spawn('git', ['log', '-p', '--format=', '--', 'rotation/llm-about.js'], { cwd: path.join(HERE, '..') });
  let buf = '';
  const found = {}; // key -> fvr (first = most recent sighting wins)
  git.stdout.on('data', (d) => {
    buf += d;
    let nl;
    while ((nl = buf.indexOf('\n')) !== -1) {
      const line = buf.slice(0, nl); buf = buf.slice(nl + 1);
      if (line[0] !== '+') continue;
      const m = line.match(/^\+\s*"([^"]+)"\s*:\s*(\{.*\})(,?)\s*$/);
      if (!m || !keys.has(m[1]) || found[m[1]] !== undefined) continue;
      let o; try { o = JSON.parse(m[2]); } catch (e) { continue; }
      if (o.fable === want[m[1]]) found[m[1]] = o.fvr || '2.2';
    }
  });
  git.on('close', () => {
    const missing = [...keys].filter(k => found[k] === undefined);
    fs.writeFileSync(MAP, JSON.stringify({ found, missing }, null, 1));
    console.log('recovered:', Object.keys(found).length, '| missing:', missing.length);
    if (missing.length) console.log(missing.join('\n'));
  });
} else if (process.argv[2] === 'apply') {
  const { found, missing } = JSON.parse(fs.readFileSync(MAP, 'utf8'));
  if (missing.length) throw new Error('unresolved flicks: ' + missing.join(', '));
  const src = fs.readFileSync(SRC, 'utf8');
  const before = loadStore(src);
  const lines = src.split('\n');
  let done = 0;
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes('"fable2"')) continue;
    const m = lines[i].match(/^(\s*)"([^"]+)"\s*:\s*(\{.*\})(,?)\s*$/);
    if (!m) continue;
    const o = JSON.parse(m[3]);
    if (!o.fable2) continue;
    if (!found[m[2]]) throw new Error('no recovered fvr for ' + m[2]);
    o.flicks = [{ t: o.fable2, fvr: found[m[2]] }];
    delete o.fable2;
    lines[i] = m[1] + '"' + m[2] + '": ' + JSON.stringify(o) + m[4]; done++;
  }
  fs.writeFileSync(SRC, lines.join('\n'));
  const after = loadStore(fs.readFileSync(SRC, 'utf8'));
  let ident = 0, flicked = 0;
  for (const [k, v] of Object.entries(after)) {
    if (v.flicks) flicked++;
    else if (JSON.stringify(v) === JSON.stringify(before[k])) ident++;
  }
  if (Object.keys(after).length !== Object.keys(before).length) throw new Error('count drift');
  if (flicked !== done || ident !== Object.keys(before).length - done) throw new Error('drift');
  console.log('migrated rows:', done, '| byte-identical elsewhere:', ident);
} else {
  console.log('usage: node migrate-flicks.js recover|apply');
}
