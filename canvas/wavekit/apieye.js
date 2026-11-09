// apieye.js — the LOOKING stages of a Canvas tour wave, run through the Anthropic Messages API (Fuad 2026-11-09:
// "reading the artwork (ie. opening it up and looking at it) gets billed by API … rest you'd be doing yourself").
// The orchestrator writes research, fusion, phase 2, reads and seal text; every stage whose substance is looking at a
// plate runs here, with `zoom` / `colour` tools served from the full-resolution plate (tool.py, from platecheck-api).
//
//   node apieye.js p1    <id>                     blind phase 1: survey, stops + boxes, see  -> phase1_<id>.json, eye_<id>.md
//   node apieye.js audit <id>                     independent audit, account FIRST (two turns) -> audit_<id>.json
//   node apieye.js ask   <id> <questions.md> [--plate f] [--tag t]   plate questions          -> ask_<tag>_<id>.md
//   node apieye.js cold  <LETTER> <id,id,…>       visitor cold read of cold/<id>.md packets   -> cold/verdict_<LETTER>.json
// Options: --model (default claude-opus-5-5; cold defaults to claude-fable-5-1), --turns (default 40).
// Every run appends one line to api_spend.jsonl (tokens and an estimate at list prices) and keeps run_<mode>_<id>.json
// (the transcript without image bytes). The key is read from fuad.au/.env and never printed. No store writes.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const D = __dirname + '/', KIT = D + 'briefs_kit/';
const [mode, id, third] = process.argv.slice(2);
if (!mode || !id) throw new Error('usage: node apieye.js <p1|audit|ask|cold> <id|LETTER> [...]');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const MODEL = arg('--model', mode === 'cold' ? 'claude-fable-5-1' : 'claude-opus-5-5'), MAX_TURNS = +arg('--turns', 40);
const KEY = ((fs.readFileSync('C:/Users/Fuad/Documents/GitHub/fuad.au/.env', 'utf8').match(/^ANTHROPIC_API_KEY=(.+)$/m) || [])[1] || '').trim();
if (!KEY) throw new Error('ANTHROPIC_API_KEY missing from fuad.au/.env');
const PRICE = { 'claude-opus-5-5': [5, 25], 'claude-fable-5-1': [15, 75], 'claude-sonnet-5-5': [3, 15] }[MODEL] || [5, 25];
const rd = f => fs.readFileSync(f, 'utf8');
const py = (...a) => execFileSync('python', [D + (fs.existsSync(D + 'tool.py') ? 'tool.py' : 'apieye_tool.py'), ...a], { env: { ...process.env, PYTHONUTF8: '1' } }).toString().trim();
const b64 = f => fs.readFileSync(f).toString('base64');
const img = f => ({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64(f) } });
const fit = (src, max) => { const out = D + '_api_' + (max || 1568) + '_' + path.basename(src).replace(/\.\w+$/, '.jpg'); py('fit', src, out, String(max || 1568)); return out; };
const size = f => JSON.parse(execFileSync('python', ['-c', `from PIL import Image;Image.MAX_IMAGE_PIXELS=None;print(list(Image.open(r"${f}").size))`]).toString());
const txt = t => ({ type: 'text', text: t });

const API_NOTE = `# HOW THIS SESSION WORKS (read before the briefs)
You are running through the API, not in a workshop shell. You have NO file system: wherever a brief tells you to open,
crop, render, cut or save an image, call the \`zoom\` tool (a box of the FULL-RESOLUTION plate, fractions 0–1 of the plate)
— the crop it returns IS the render. \`colour\` returns a box's mean and dominant colours (use it, and zooms, for any
measured claim: brightness = the mean RGB values; a size = box fractions times the plate's pixel size). Wherever a brief
tells you to WRITE a file, put its content in the fenced block your task names, at the end of your reply. Scripts and
gates named in the briefs are run by the orchestrator afterwards — do not claim to have run them. Word counts are the
orchestrator's (write "count not verified"). Use the tools as much as the work needs; there is no prize for few calls.
`;

// ---------------------------------------------------------------- stage builders
function plateBlock(f, label) {
  const [w, h] = size(f);
  return [txt(`${label}: native ${w}x${h} px; shown below downscaled. Zoom/colour coordinates are fractions of the native plate.`), img(fit(f))];
}
function canonRow(wid) { return JSON.parse(rd(D + 'canon.json')).find(r => r.id === wid); }

const STAGES = {
  p1() {
    const system = [API_NOTE, rd(D + 'RULE_CARD.md'), rd(D + 'PHASE1_BRIEF.md'), rd(D + 'STUDY_BRIEF.md'), rd(D + 'EYE_BRIEF.md')].join('\n\n---\n\n');
    const plate = D + 'img_' + id + '.jpg', tm = JSON.parse(rd(D + 'TILE_MAP.json'));
    const pre = JSON.parse(rd(D + 'preblind_' + id + '.json'));
    const content = [txt(`WORK id: ${id}\nIDENTITY (canon.json row, the whole of what you know): ${JSON.stringify(canonRow(id), null, 1)}\n\nJOB FILE (preblind_${id}.json): ${JSON.stringify(pre, null, 1)}\n\nTILE_MAP.json (fractions of the plate): ${JSON.stringify(tm[id] || tm, null, 1)}`),
      ...plateBlock(plate, 'THE PLATE (img_' + id + '.jpg)')];
    for (let r = 1; r <= 3; r++) for (let c = 1; c <= 3; c++) {
      const f = D + `tile_${id}_r${r}c${c}.jpg`;
      if (fs.existsSync(f)) content.push(txt(`tile r${r}c${c}`), img(fit(f)));
    }
    content.push(txt(`Do phase 1 for this work, in the brief's ORDER (survey → stops → boxes from their own zooms → see last → hunt your draft for the failure patterns). Zoom every box you commit before you commit it. End your reply with exactly two fenced blocks: \`\`\`json (the phase1_${id}.json object: id, see, deeper[{t,x,y,w,h,body}], survey[], flags[], coverage) and \`\`\`markdown (eye_${id}.md: ### SEEN, ### CANDIDATE STOPS, ### LENS SEEDS, ### QUESTIONS, ### FLAGS). Your reply after the blocks: nothing.`));
    return { system, content, plate, out: final => {
      const j = fence(final, 'json'), m = fence(final, 'markdown');
      if (!j || !m) throw new Error('missing fenced block(s)');
      const o = lenientParse(j); if (o.id !== id) throw new Error('id mismatch ' + o.id);
      fs.writeFileSync(D + `phase1_${id}.json`, JSON.stringify(o, null, 1)); fs.writeFileSync(D + `eye_${id}.md`, m);
      return `phase1: ${o.deeper.length} stops, coverage ${o.coverage}`;
    } };
  },
  audit() {
    const system = [API_NOTE, rd(D + 'RULE_CARD.md'), rd(D + 'LESSON_LEDGER.md'), rd(D + 'AUDIT_BRIEF.md')].join('\n\n---\n\n');
    const plate = D + 'img_' + id + '.jpg';
    const pre = JSON.parse(rd(D + 'pre_' + id + '.json'));
    const content = [txt(`WORK id: ${id}\nIDENTITY: ${JSON.stringify(canonRow(id), null, 1)}\nPLATE NOTE: ${pre.identity.plateNote || '-'}`), ...plateBlock(plate, 'THE PLATE')
      , txt('STEP 1 ONLY: write your whole-image account now (5–8 lines, per the brief), zooming as you need. You have NOT been given the tour yet and will receive it after this account. Reply with the account only.')];
    const tour = JSON.parse(rd(D + `out_tour_${id}.json`));
    const second = [txt('THE DRAFT TOUR (out_tour_' + id + '.json):\n' + JSON.stringify(tour, null, 1)), txt('Numbered box overlay (ov_' + id + '.jpg):'), img(fit(D + `ov_${id}.jpg`, 1200))];
    (tour.deeper || []).forEach((s, i) => { const f = D + `box_${id}_${i + 1}.jpg`; if (fs.existsSync(f)) second.push(txt(`Stop ${i + 1} (1-based) box {x:${s.x},y:${s.y},w:${s.w},h:${s.h}} — its crop (name its three most prominent things BEFORE reading stop ${i + 1}'s body):`), img(fit(f, 1000))); });
    for (const f of [`hook_${id}.md`, `fusion_${id}.md`, `eye_${id}.md`]) if (fs.existsSync(D + f)) second.push(txt(`${f}:\n` + rd(D + f)));
    if (fs.existsSync(D + 'QUEUE.md')) second.push(txt('QUEUE.md (orchestrator rulings; the tone-gate LOOKs for your work are listed there):\n' + rd(D + 'QUEUE.md')));
    if (fs.existsSync(D + `gates_${id}.txt`)) second.push(txt('Gate output for this work (coverage, bands, tone):\n' + rd(D + `gates_${id}.txt`)));
    second.push(txt(`Now run steps 2–6 of the brief against the plate (zoom at one magnification finer than each claim). Stops are numbered 1-based. End with one fenced \`\`\`json block: the audit_${id}.json object ({id, account, findings[{where, claim, verdict, evidence, severity, plateLimited, fix}], deepening, depth:{voice, story}, clean}). Put your step-1 account in "account" unchanged.`));
    return { system, content, plate, second, out: final => {
      const j = fence(final, 'json'); if (!j) throw new Error('missing json block');
      const o = lenientParse(j); fs.writeFileSync(D + `audit_${id}.json`, JSON.stringify(o, null, 1));
      const c = {}; for (const f of o.findings || []) c[f.severity] = (c[f.severity] || 0) + 1;
      return 'audit: ' + JSON.stringify(c);
    } };
  },
  ask() {
    const qf = third; if (!qf) throw new Error('ask needs a questions file');
    const tag = arg('--tag', path.basename(qf).replace(/\.\w+$/, ''));
    const plate = arg('--plate', D + 'img_' + id + '.jpg');
    const system = [API_NOTE, rd(D + 'ASK_BRIEF.md'), fs.existsSync(D + 'RULE_CARD.md') ? rd(D + 'RULE_CARD.md') : ''].join('\n\n---\n\n');
    const q = rd(qf);
    const content = [txt(`WORK id: ${id}\nIDENTITY: ${JSON.stringify(canonRow(id) || {}, null, 1)}`), ...plateBlock(plate, 'THE PLATE (' + path.basename(plate) + ')')];
    for (const m of q.matchAll(/^IMAGE:\s*(\S+)\s*\|\s*(.+)$/gm)) { const f = path.isAbsolute(m[1]) ? m[1] : D + m[1]; content.push(...plateBlock(f, 'EXTRA IMAGE ' + m[2].trim() + ' (' + path.basename(f) + ')')); }
    content.push(txt('QUESTIONS:\n' + q.replace(/^IMAGE:.*$/gm, '').trim() + '\n\nAnswer every question by number, from the plate. End with one fenced ```markdown block holding your answers (one numbered section per question: VERDICT, then what the plate shows and which zooms settled it).'));
    return { system, content, plate, out: final => {
      const m = fence(final, 'markdown') || final; fs.writeFileSync(D + `ask_${tag}_${id}.md`, m); return 'ask: ' + tag;
    } };
  },
  cold() {
    const ids = (third || '').split(',').filter(Boolean); if (!ids.length) throw new Error('cold needs ids');
    const system = [rd(D + 'COLD_BRIEF.md'), 'You are running through the API: the folder\'s files are given to you below in this message (each entry\'s text, its painting, and each stop\'s zoom crop). Write your verdict file as one fenced ```json block at the end of your reply.'].join('\n\n');
    const content = [];
    for (const w of ids) {
      const md = D + `cold/${w}.md`; content.push(txt(`=== ENTRY ${w} ===\n` + rd(md)), txt(`plate_${w}.jpg (the painting):`), img(fit(D + `cold/plate_${w}.jpg`, 1400)));
      for (let n = 1; n < 20; n++) { const f = D + `cold/box_${w}_${n}.jpg`; if (!fs.existsSync(f)) break; content.push(txt(`box_${w}_${n}.jpg (what stop ${n} zooms to):`), img(fit(f, 700))); }
    }
    content.push(txt(`Read each entry in order as the brief says. Your letter is ${id}. End with one fenced \`\`\`json block: the verdict_${id}.json object.`));
    return { system, content, plate: null, out: final => {
      const j = fence(final, 'json'); if (!j) throw new Error('missing json block');
      const o = lenientParse(j); fs.writeFileSync(D + `cold/verdict_${id}.json`, JSON.stringify(o, null, 1));
      return 'cold: ' + Object.entries(o).map(([k, v]) => k.slice(0, 18) + ' ' + (v.flags || []).length).join('; ');
    } };
  },
};
function lenientParse(j) {
  try { return JSON.parse(j); } catch (e) {}
  let out = '', inStr = false;
  for (let i = 0; i < j.length; i++) {
    const c = j[i];
    if (c === '\\' && inStr) { out += c + j[i + 1]; i++; continue; }
    if (c === '"') {
      if (!inStr) { inStr = true; out += c; continue; }
      const ahead = j.slice(i + 1, i + 60);
      if (/^\s*[:}\]]/.test(ahead) || /^\s*,\s*["{\[\d\-tfn]/.test(ahead)) { inStr = false; out += c; } else out += '\\"';
      continue;
    }
    out += c;
  }
  return JSON.parse(out);
}
function fence(s, lang) {
  const re = new RegExp('```' + lang + '\\s*\\n([\\s\\S]*?)\\n```(?![\\s\\S]*```' + lang + ')', 'm');
  const m = s.match(re); if (m) return m[1];
  const open = s.lastIndexOf('```' + lang); if (open < 0) return null;
  return s.slice(open + 3 + lang.length).replace(/```\s*$/, '').trim();
}

// ---------------------------------------------------------------- the loop
const S = STAGES[mode](); if (!S) throw new Error('unknown mode ' + mode);
const tools = S.plate ? [
  { name: 'zoom', description: 'Crop a box of the FULL-RESOLUTION plate and return it as an image (long side up to 1568 px). Coordinates are fractions 0–1 of the plate width/height. Returns native and sent pixel sizes.',
    input_schema: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' }, w: { type: 'number' }, h: { type: 'number' } }, required: ['x', 'y', 'w', 'h'] } },
  { name: 'colour', description: 'Mean colour (RGB) and 5 dominant colours with area share for a box of the plate. Fractions 0–1.',
    input_schema: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' }, w: { type: 'number' }, h: { type: 'number' } }, required: ['x', 'y', 'w', 'h'] } },
] : [];
const system = [{ type: 'text', text: S.system, cache_control: { type: 'ephemeral' } }];
const messages = [{ role: 'user', content: S.content }];
const usage = { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, calls: 0, zooms: 0, colours: 0 };
let thinking = { type: 'adaptive' };
async function call() {
  for (const m of messages) if (Array.isArray(m.content)) for (const b of m.content) delete b.cache_control;
  const last = messages[messages.length - 1].content; last[last.length - 1].cache_control = { type: 'ephemeral' };
  for (let a = 0; a < 6; a++) {
    const body = { model: MODEL, max_tokens: 32000, system, messages, thinking }; if (tools.length) body.tools = tools;
    let r, j;
    try { r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify(body) }); j = await r.json(); }
    catch (e) { console.log('  network retry', e.message); await new Promise(z => setTimeout(z, 15000 * (a + 1))); continue; }
    if (r.ok) { for (const k of ['input_tokens', 'output_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens']) usage[k] += (j.usage && j.usage[k]) || 0; usage.calls++; return j; }
    const msg = JSON.stringify(j.error || j).slice(0, 400);
    if (r.status === 400 && /thinking/i.test(msg) && thinking.type === 'adaptive') { thinking = { type: 'enabled', budget_tokens: 16000 }; console.log('  (adaptive thinking refused; enabled/16000)'); continue; }
    if ([429, 500, 502, 503, 529].includes(r.status)) { console.log('  retry', r.status, msg); await new Promise(z => setTimeout(z, 20000 * (a + 1))); continue; }
    throw new Error(r.status + ' ' + msg);
  }
  throw new Error('gave up after retries');
}
async function loop(turnsLeft) {
  for (let t = 0; t < turnsLeft; t++) {
    const j = await call(); messages.push({ role: 'assistant', content: j.content });
    const uses = j.content.filter(b => b.type === 'tool_use');
    if (j.stop_reason !== 'tool_use' || !uses.length) return j.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
    const results = [];
    for (const u of uses) {
      const { x, y, w, h } = u.input || {};
      try {
        if (u.name === 'zoom') { const out = D + `_z_${mode}_${id}_${usage.zooms++}.jpg`; const meta = py('zoom', S.plate, String(x), String(y), String(w), String(h), out); results.push({ type: 'tool_result', tool_use_id: u.id, content: [txt(meta), img(out)] }); }
        else { usage.colours++; results.push({ type: 'tool_result', tool_use_id: u.id, content: py('colour', S.plate, String(x), String(y), String(w), String(h)) }); }
      } catch (e) { results.push({ type: 'tool_result', tool_use_id: u.id, is_error: true, content: String(e.message).slice(0, 300) }); }
    }
    messages.push({ role: 'user', content: results });
    process.stdout.write(`  ${mode} ${id} turn: ${uses.map(u => u.name).join(',')}\n`);
  }
  messages.push({ role: 'user', content: [txt('Turn budget reached. Stop using tools and give your final output now, with the fenced block(s) your task names.')] });
  const j = await call(); messages.push({ role: 'assistant', content: j.content });
  return j.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
}
const cost = () => (usage.input_tokens * PRICE[0] + usage.cache_creation_input_tokens * PRICE[0] * 1.25 + usage.cache_read_input_tokens * PRICE[0] * 0.1 + usage.output_tokens * PRICE[1]) / 1e6;
(async () => {
  const t0 = Date.now();
  let final = await loop(MAX_TURNS);
  if (S.second) { fs.writeFileSync(D + `account_${mode}_${id}.md`, final); messages.push({ role: 'user', content: S.second }); final = await loop(MAX_TURNS); }
  fs.writeFileSync(D + `final_${mode}_${id}.md`, final);
  let res; try { res = S.out(final); } catch (e) { res = 'OUTPUT FAILED: ' + e.message + ` (raw in final_${mode}_${id}.md)`; }
  const strip = messages.map(m => ({ role: m.role, content: Array.isArray(m.content) ? m.content.map(b => b.type === 'image' ? { type: 'image' } : b.type === 'tool_result' && Array.isArray(b.content) ? { ...b, content: b.content.map(c => c.type === 'image' ? { type: 'image' } : c) } : b) : m.content }));
  usage.seconds = Math.round((Date.now() - t0) / 1000); usage.model = MODEL; usage.usd = +cost().toFixed(3);
  fs.writeFileSync(D + `run_${mode}_${id}.json`, JSON.stringify({ usage, messages: strip }, null, 1));
  fs.appendFileSync(D + 'api_spend.jsonl', JSON.stringify({ when: new Date().toISOString(), mode, id, tag: arg('--tag', null), ...usage }) + '\n');
  console.log(`${res.startsWith('OUTPUT FAILED') ? 'FAIL' : 'DONE'} ${mode} ${id} — ${res} — $${usage.usd} (${usage.calls} calls, ${usage.zooms} zooms, ${usage.seconds}s)`);
  if (res.startsWith('OUTPUT FAILED')) process.exit(2);
})().catch(e => { console.error('FAIL', mode, id, e.message); process.exit(1); });
