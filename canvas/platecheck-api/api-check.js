// platecheckNN/api-check.js — the plate-check CHECKER stage run through the Anthropic API instead of a subagent.
// One work per invocation: node api-check.js <id> [--model claude-opus-5-5] [--turns 30]
// Sends API_BRIEF.md as the system prompt; the plate, overlay, stop crops, tour, reads, coverage, beside grade and
// incoming besides as the first message; serves `zoom` / `colour` tool calls from the full-resolution plate (tool.py).
// Writes fix_<id>.json + fix_<id>.notes.md + run_<id>.json (transcript without image data, token usage). No store writes.
// The key is read from fuad.au/.env and never printed.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const D = __dirname + '/', C = 'C:/Users/Fuad/Documents/GitHub/fuad.au/canvas/';
const id = process.argv[2]; if (!id) throw new Error('usage: node api-check.js <id>');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const MODEL = arg('--model', 'claude-opus-5-5'), MAX_TURNS = +arg('--turns', 30);
const KEY = (fs.readFileSync('C:/Users/Fuad/Documents/GitHub/fuad.au/.env', 'utf8').match(/^ANTHROPIC_API_KEY=(.+)$/m) || [])[1];
if (!KEY) throw new Error('ANTHROPIC_API_KEY missing from fuad.au/.env');
const L = f => { const o = {}; new Function('window', fs.readFileSync(C + f, 'utf8'))(o); return Object.values(o)[0]; };
const INS = L('art_inspect.js'), ABOUT = L('art-about.js'), ROWS = L('artworks.js');
const row = ROWS.find(r => r.id === id) || {}, tour = INS[id], reads = ABOUT[id] || {};
if (!tour) throw new Error('no tour for ' + id);
const PY = 'python', plate = D + 'img_' + id + '.jpg';
const py = (...a) => execFileSync(PY, [D + 'tool.py', ...a], { env: { ...process.env, PYTHONUTF8: '1' } }).toString().trim();
const b64 = f => fs.readFileSync(f).toString('base64');
const img = f => ({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64(f) } });
const fit = (src, max) => { const out = D + '_api_' + path.basename(src); py('fit', src, out, String(max || 1568)); return out; };

// ---- inputs
const native = JSON.parse(execFileSync(PY, ['-c', `from PIL import Image;Image.MAX_IMAGE_PIXELS=None;print(list(Image.open(r"${plate}").size))`]).toString());
const ceil = (JSON.parse(fs.readFileSync(D + 'ceiling.json', 'utf8'))[id] || {}).tier || 'stitched IIIF tiles';
// guard (batch 10 lesson): some IIIF servers (National Gallery London) clamp full renders at 800 px — a capped plate
// starves the checker of detail. Refuse it; build the plate from tiles with stitch.py first.
if (/IIIF/.test(ceil) && Math.max(...native) < 1500) throw new Error(`plate capped at ${native.join('x')} for an IIIF source — run: python stitch.py ${id}`);
const cov = JSON.parse(fs.readFileSync(D + 'groupD.json', 'utf8'))[id];
const scan = JSON.parse(fs.readFileSync(D + '../beside-scan/scan_all.json', 'utf8'));
const grade = (Array.isArray(scan) ? scan : Object.values(scan)).find(s => s.id === id) || null;
const incoming = [];
for (const [k, v] of Object.entries(INS)) {
  const r = v.refs, arr = Array.isArray(r) ? r : (r && r.beside ? [].concat(r.beside) : []);
  if (k !== id && arr.some(x => (x.id || x) === id)) incoming.push({ id: k, beside: v.beside, refs: arr });
}
const stops = tour.deeper || [];
const content = [
  { type: 'text', text: `WORK: ${id}\nTitle: ${row.title} — ${row.artist}, ${row.year || '?'}\nPlate: native ${native[0]}x${native[1]} px (${ceil}); shown below downscaled. Box/zoom coordinates are fractions of the full plate.` },
  img(fit(plate)),
  { type: 'text', text: 'Overlay: the numbered stop boxes.' }, img(fit(D + 'ov_' + id + '.jpg', 900)),
];
stops.forEach((s, i) => {
  const f = D + `box_${id}_${i + 1}.jpg`;
  if (fs.existsSync(f)) content.push({ type: 'text', text: `Stop ${i + 1} (deeper[${i}]) box {x:${s.x},y:${s.y},w:${s.w},h:${s.h}} — crop:` }, img(fit(f)));
  else content.push({ type: 'text', text: `Stop ${i + 1} (deeper[${i}]) has no box.` });
});
content.push({ type: 'text', text: [
  'LIVE TOUR (art_inspect entry):', JSON.stringify(tour, null, 1),
  '\nINFO (`about`) and INTERPRETATION (`deep`):', JSON.stringify({ about: reads.about, deep: reads.deep }, null, 1),
  '\nCOVERAGE:', JSON.stringify(cov),
  '\nBESIDE GRADE:', grade ? JSON.stringify(grade) : (tour.beside ? 'not graded in the scan' : 'no beside on this work'),
  '\nINCOMING BESIDES (other works whose beside describes this picture):', incoming.length ? JSON.stringify(incoming, null, 1) : 'none',
  '\nBegin with the account, then check. Use the tools as much as you need. End with the two fenced blocks.',
].join('\n') });

const tools = [
  { name: 'zoom', description: 'Crop a box of the FULL-RESOLUTION plate and return it as an image (long side up to 1568 px). Coordinates are fractions 0–1 of the plate width/height.',
    input_schema: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' }, w: { type: 'number' }, h: { type: 'number' } }, required: ['x', 'y', 'w', 'h'] } },
  { name: 'colour', description: 'Mean colour and 5 dominant colours (with area share) of a box of the plate. Fractions 0–1.',
    input_schema: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' }, w: { type: 'number' }, h: { type: 'number' } }, required: ['x', 'y', 'w', 'h'] } },
];
const system = [{ type: 'text', text: fs.readFileSync(D + 'API_BRIEF.md', 'utf8'), cache_control: { type: 'ephemeral' } }];
const messages = [{ role: 'user', content }];
const usage = { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, calls: 0, zooms: 0, colours: 0 };
let thinking = { type: 'adaptive' };

async function call() {
  // one moving cache breakpoint on the newest user message (plus the system block)
  for (const m of messages) if (Array.isArray(m.content)) for (const b of m.content) delete b.cache_control;
  const last = messages[messages.length - 1].content; last[last.length - 1].cache_control = { type: 'ephemeral' };
  for (let a = 0; a < 5; a++) {
    const body = { model: MODEL, max_tokens: 32000, system, tools, messages, thinking };
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json();
    if (r.ok) return j;
    const msg = JSON.stringify(j.error || j).slice(0, 400);
    if (r.status === 400 && /thinking/i.test(msg) && thinking.type === 'adaptive') { thinking = { type: 'enabled', budget_tokens: 12000 }; console.log('  (adaptive thinking refused; using enabled/12000)'); continue; }
    if ([429, 500, 502, 503, 529].includes(r.status)) { console.log('  retry', r.status, msg); await new Promise(z => setTimeout(z, 15000 * (a + 1))); continue; }
    throw new Error(r.status + ' ' + msg);
  }
  throw new Error('gave up after retries');
}

(async () => {
  const t0 = Date.now(); let final = null;
  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const j = await call(); usage.calls++;
    for (const k of ['input_tokens', 'output_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens']) usage[k] += (j.usage && j.usage[k]) || 0;
    messages.push({ role: 'assistant', content: j.content });
    const uses = j.content.filter(b => b.type === 'tool_use');
    if (j.stop_reason !== 'tool_use' || !uses.length) { final = j.content.filter(b => b.type === 'text').map(b => b.text).join('\n'); break; }
    const results = [];
    for (const u of uses) {
      const { x, y, w, h } = u.input;
      try {
        if (u.name === 'zoom') {
          const out = D + `_z_${id}_${usage.zooms++}.jpg`;
          const meta = py('zoom', plate, String(x), String(y), String(w), String(h), out);
          results.push({ type: 'tool_result', tool_use_id: u.id, content: [{ type: 'text', text: meta }, img(out)] });
        } else {
          usage.colours++;
          results.push({ type: 'tool_result', tool_use_id: u.id, content: py('colour', plate, String(x), String(y), String(w), String(h)) });
        }
      } catch (e) { results.push({ type: 'tool_result', tool_use_id: u.id, is_error: true, content: String(e.message).slice(0, 300) }); }
    }
    messages.push({ role: 'user', content: results });
    process.stdout.write(`  ${id} turn ${turn + 1}: ${uses.map(u => u.name).join(',')}\n`);
  }
  if (final == null) {
    messages.push({ role: 'user', content: [{ type: 'text', text: 'Turn budget reached. Stop using tools and give your final output now: the two fenced blocks.' }] });
    const j = await call(); usage.calls++;
    for (const k of ['input_tokens', 'output_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens']) usage[k] += (j.usage && j.usage[k]) || 0;
    messages.push({ role: 'assistant', content: j.content }); final = j.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
  }
  const jm = final.match(/```json\s*([\s\S]*?)```/), nm = final.match(/```(?:markdown|md)\s*([\s\S]*?)```\s*$/) || final.match(/```(?:markdown|md)\s*([\s\S]*)$/);
  fs.writeFileSync(D + `final_${id}.md`, final);
  if (jm) { try { const arr = JSON.parse(jm[1]); fs.writeFileSync(D + `fix_${id}.json`, JSON.stringify(arr, null, 1)); console.log(`  ${id}: ${arr.length} changes`); } catch (e) { console.log(`  ${id}: JSON PARSE FAILED (raw in final_${id}.md)`, e.message); } }
  else console.log(`  ${id}: NO JSON BLOCK`);
  fs.writeFileSync(D + `fix_${id}.notes.md`, nm ? nm[1] : final);
  const strip = messages.map(m => ({ role: m.role, content: Array.isArray(m.content) ? m.content.map(b => b.type === 'image' ? { type: 'image' } : b.type === 'tool_result' && Array.isArray(b.content) ? { ...b, content: b.content.map(c => c.type === 'image' ? { type: 'image' } : c) } : b) : m.content }));
  usage.seconds = Math.round((Date.now() - t0) / 1000); usage.model = MODEL; usage.thinking = thinking;
  fs.writeFileSync(D + `run_${id}.json`, JSON.stringify({ usage, messages: strip }, null, 1));
  console.log('  usage', JSON.stringify(usage));
})().catch(e => { console.error('FAIL', id, e.message); process.exit(1); });
