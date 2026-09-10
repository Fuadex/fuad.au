// audit-plates.js — measures every art_hires.js row + every art_imgsize.js entry against what the
// holders actually serve today, and cross-checks the holder implied by each hires row's `src`
// against art_holders.js. Read-only measurement pass: writes plate_audit_cache.json (resumable,
// cache-by-URL/title) and plate_audit_results.json (the raw findings, consumed by a separate apply
// step). Does NOT touch artworks.js, art_holders.js, or the wilhelm-gentz row — those are excluded
// or left alone per instruction.
//
// Usage: node audit-plates.js [--limit N] [--only commons|nga|...] [--skip-imgsize] [--skip-hires]
'use strict';
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const UA = 'fuad.au-canvas/0.1 (https://fuad.au; fuadex@gmail.com)';
const CACHE_PATH = path.join(DIR, 'plate_audit_cache.json');
const RESULTS_PATH = path.join(DIR, 'plate_audit_results.json');
const SKIP_ID = 'wilhelm-gentz-einzug-des-kronprinzen-friedrich-wilhelm-von-p';
const CONCURRENCY = 4;
const HOST_GAP_MS = 150;
// upload.wikimedia.org and commons.wikimedia.org started answering 429 partway through the first
// full run (749 of them, plus 501 API calls that got a rate-limit text body where JSON was
// expected) — the flat 150ms/host floor wasn't enough for Wikimedia's anonymous-traffic limiter.
// Widen the floor for those two hosts specifically; everything else keeps the spec's 150ms.
// Live-tested 2026-09-10: 500ms still drew 429s on upload.wikimedia.org (Retry-After: 11); a
// direct probe at 2000ms spacing ran five requests clean with none. commons.wikimedia.org gets far
// fewer calls now that titles are pre-batched 50/call, but give it real headroom too.
const HOST_GAP_OVERRIDE = {
  'upload.wikimedia.org': 2200,
  'commons.wikimedia.org': 800,
};
const RANGE_BYTES = 65536; // 64KB

const args = process.argv.slice(2);
function argVal(flag) { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; }
const LIMIT = argVal('--limit') ? parseInt(argVal('--limit'), 10) : Infinity;
const ONLY_SRC = argVal('--only');
const SKIP_IMGSIZE = args.includes('--skip-imgsize');
const SKIP_HIRES = args.includes('--skip-hires');
const SAVE_EVERY = 20;

// ---------- load stores ----------
const w = {};
global.window = w;
eval(fs.readFileSync(path.join(DIR, 'art_hires.js'), 'utf8'));
eval(fs.readFileSync(path.join(DIR, 'art_imgsize.js'), 'utf8'));
eval(fs.readFileSync(path.join(DIR, 'art_holders.js'), 'utf8'));
eval(fs.readFileSync(path.join(DIR, 'museums.js'), 'utf8'));
eval(fs.readFileSync(path.join(DIR, 'art_data.js'), 'utf8'));
const HIRES = w.CANVAS_HIRES;
const IMGSIZE = w.CANVAS_IMGSIZE;
const HOLDERS = w.CANVAS_HOLDERS;
const MUSEUMS = w.CANVAS_MUSEUMS;
const ARTWORKS = w.CANVAS_ART_DATA.artworks;

// ---------- cache ----------
let CACHE = {};
if (fs.existsSync(CACHE_PATH)) {
  try { CACHE = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8')); } catch (e) { CACHE = {}; }
}
let dirty = 0;
function saveCache(force) {
  if (!force && dirty < SAVE_EVERY) return;
  fs.writeFileSync(CACHE_PATH, JSON.stringify(CACHE));
  dirty = 0;
}
function cacheGet(key) { return CACHE[key]; }
function cacheSet(key, val) { CACHE[key] = val; dirty++; saveCache(false); }

// ---------- rate limiter: global concurrency 4, per-host >=150ms spacing ----------
let activeSlots = 0;
const waiters = [];
function acquireSlot() {
  if (activeSlots < CONCURRENCY) { activeSlots++; return Promise.resolve(); }
  return new Promise((res) => waiters.push(res));
}
function releaseSlot() {
  activeSlots--;
  const next = waiters.shift();
  if (next) { activeSlots++; next(); }
}
const hostChain = new Map();
const hostLast = new Map();
function hostThrottle(host) {
  const gap = HOST_GAP_OVERRIDE[host] || HOST_GAP_MS;
  const prev = hostChain.get(host) || Promise.resolve();
  const next = prev.then(async () => {
    const last = hostLast.get(host) || 0;
    const now = Date.now();
    const wait = last + gap - now;
    if (wait > 0) await sleep(wait);
    hostLast.set(host, Date.now());
  });
  hostChain.set(host, next);
  return next;
}
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function hostOf(url) { try { return new URL(url).hostname; } catch (e) { return 'unknown'; } }

// Retries 429s with backoff (honouring Retry-After when the server sends one), transparently for
// every call site below — Range-GETs, info.json GETs, and the Commons API alike.
async function throttledFetch(url, opts, attempt) {
  attempt = attempt || 0;
  const host = hostOf(url);
  await acquireSlot();
  let res;
  try {
    await hostThrottle(host);
    res = await fetch(url, opts);
  } finally {
    releaseSlot();
  }
  if (res.status === 429 && attempt < 6) {
    const ra = res.headers.get('retry-after');
    const raMs = ra && !isNaN(ra) ? parseInt(ra, 10) * 1000 : null;
    const waitMs = raMs || Math.round(4000 * Math.pow(1.6, attempt));
    try { await res.body && res.body.cancel(); } catch (e) {}
    process.stderr.write(`  [429] ${host} — backing off ${waitMs}ms (attempt ${attempt + 1})\n`);
    await sleep(waitMs);
    return throttledFetch(url, opts, attempt + 1);
  }
  return res;
}

// ---------- image header parsing ----------
function parseJpeg(buf) {
  if (buf.length < 4 || buf[0] !== 0xFF || buf[1] !== 0xD8) return null;
  let i = 2;
  while (i + 4 <= buf.length) {
    if (buf[i] !== 0xFF) { i++; continue; }
    const marker = buf[i + 1];
    if (marker === 0xFF) { i++; continue; }
    if (marker === 0xD8 || marker === 0xD9 || (marker >= 0xD0 && marker <= 0xD7) || marker === 0x01) { i += 2; continue; }
    if (i + 4 > buf.length) break;
    const len = buf.readUInt16BE(i + 2);
    const isSOF = marker >= 0xC0 && marker <= 0xCF && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC;
    if (isSOF) {
      if (i + 9 > buf.length) return null; // truncated before we could read dims
      const h = buf.readUInt16BE(i + 5);
      const ww = buf.readUInt16BE(i + 7);
      return { w: ww, h };
    }
    if (marker === 0xDA) return null; // start of scan, no SOF found (shouldn't happen)
    i += 2 + len;
  }
  return null; // ran out of the 64KB window before finding SOF
}
function parsePng(buf) {
  if (buf.length < 24) return null;
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  if (!buf.slice(0, 8).equals(sig)) return null;
  // bytes 8-11 length, 12-15 'IHDR', 16-19 width, 20-23 height
  if (buf.slice(12, 16).toString('ascii') !== 'IHDR') return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}
function parseTiff(buf) {
  if (buf.length < 8) return null;
  let little;
  if (buf[0] === 0x49 && buf[1] === 0x49) little = true;
  else if (buf[0] === 0x4D && buf[1] === 0x4D) little = false;
  else return null;
  const rd16 = (o) => (little ? buf.readUInt16LE(o) : buf.readUInt16BE(o));
  const rd32 = (o) => (little ? buf.readUInt32LE(o) : buf.readUInt32BE(o));
  const ifdOff = rd32(4);
  if (ifdOff + 2 > buf.length) return null;
  const count = rd16(ifdOff);
  let width = null, height = null;
  for (let e = 0; e < count; e++) {
    const entryOff = ifdOff + 2 + e * 12;
    if (entryOff + 12 > buf.length) break;
    const tag = rd16(entryOff);
    const type = rd16(entryOff + 2);
    let value;
    if (type === 3) value = rd16(entryOff + 8); // SHORT
    else if (type === 4) value = rd32(entryOff + 8); // LONG
    else continue;
    if (tag === 256) width = value;
    else if (tag === 257) height = value;
  }
  if (width == null || height == null) return null;
  return { w: width, h: height };
}
function parseImageSize(buf) {
  if (buf.length >= 3 && buf[0] === 0xFF && buf[1] === 0xD8) { const r = parseJpeg(buf); return r ? { type: 'jpeg', ...r } : { type: 'jpeg', error: 'no SOF in 64KB window' }; }
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50) { const r = parsePng(buf); return r ? { type: 'png', ...r } : { type: 'png', error: 'bad IHDR' }; }
  if (buf.length >= 8 && ((buf[0] === 0x49 && buf[1] === 0x49) || (buf[0] === 0x4D && buf[1] === 0x4D))) { const r = parseTiff(buf); return r ? { type: 'tiff', ...r } : { type: 'tiff', error: 'IFD outside 64KB window' }; }
  return { type: 'unknown', error: 'unrecognized magic bytes' };
}

// ---------- HTTP helpers (cached) ----------
async function fetchRangeSize(url) {
  const key = 'img:' + url;
  const cached = cacheGet(key);
  if (cached) return cached;
  let result;
  try {
    const res = await throttledFetch(url, { headers: { 'User-Agent': UA, Range: `bytes=0-${RANGE_BYTES - 1}` }, redirect: 'follow' });
    if (res.status !== 200 && res.status !== 206) {
      try { await res.body?.cancel(); } catch (e) {}
      result = { status: res.status, error: 'http_' + res.status };
    } else {
      const reader = res.body.getReader();
      const chunks = []; let total = 0;
      try {
        while (total < RANGE_BYTES) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value); total += value.length;
        }
      } finally { try { await reader.cancel(); } catch (e) {} }
      const buf = Buffer.concat(chunks.map((c) => Buffer.from(c)), total);
      const parsed = parseImageSize(buf);
      result = { status: res.status, ...parsed };
    }
  } catch (e) {
    result = { error: 'fetch_error: ' + String(e.message || e) };
  }
  cacheSet(key, result);
  return result;
}
async function fetchInfoJson(url) {
  const key = 'info:' + url;
  const cached = cacheGet(key);
  if (cached) return cached;
  let result;
  try {
    const res = await throttledFetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
    if (!res.ok) { result = { status: res.status, error: 'http_' + res.status }; }
    else {
      const json = await res.json();
      result = { status: res.status, width: json.width, height: json.height, profile: json.profile, sizes: json.sizes, maxWidth: json.maxWidth, maxHeight: json.maxHeight, maxArea: json.maxArea, context: json['@context'], type: json.type };
    }
  } catch (e) {
    result = { error: 'fetch_error: ' + String(e.message || e) };
  }
  cacheSet(key, result);
  return result;
}
async function commonsBatch(titles) {
  const need = titles.filter((t) => !cacheGet('commons:' + t));
  for (let i = 0; i < need.length; i += 50) {
    const batch = need.slice(i, i + 50);
    const params = new URLSearchParams({ action: 'query', titles: batch.map((t) => 'File:' + t).join('|'), prop: 'imageinfo', iiprop: 'size', format: 'json', formatversion: '2' });
    const url = 'https://commons.wikimedia.org/w/api.php?' + params.toString();
    let json;
    try {
      const res = await throttledFetch(url, { headers: { 'User-Agent': UA } });
      json = await res.json();
    } catch (e) {
      for (const t of batch) cacheSet('commons:' + t, { error: 'fetch_error: ' + String(e.message || e) });
      continue;
    }
    const pages = (json.query && json.query.pages) || [];
    const norm = {}; // encoded/from title -> canonical title
    for (const n of (json.query && json.query.normalized) || []) norm[n.from] = n.to;
    const byTitle = {};
    for (const p of pages) byTitle[p.title] = p;
    for (const t of batch) {
      const full = 'File:' + t;
      const canon = norm[full] || full;
      const page = byTitle[canon];
      if (!page || page.missing) { cacheSet('commons:' + t, { error: 'commons_missing' }); continue; }
      const ii = page.imageinfo && page.imageinfo[0];
      if (!ii) { cacheSet('commons:' + t, { error: 'no_imageinfo' }); continue; }
      cacheSet('commons:' + t, { w: ii.width, h: ii.height });
    }
  }
  const out = {};
  for (const t of titles) out[t] = cacheGet('commons:' + t);
  return out;
}

// ---------- URL / title helpers ----------
function commonsTitleFromUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname === 'upload.wikimedia.org') {
      const parts = u.pathname.split('/');
      let name = parts[parts.length - 1];
      if (parts.includes('thumb')) name = parts[parts.length - 2];
      return decodeURIComponent(name);
    }
    if (u.hostname === 'commons.wikimedia.org' && u.pathname.includes('Special:FilePath/')) {
      const idx = u.pathname.indexOf('Special:FilePath/');
      const name = u.pathname.slice(idx + 'Special:FilePath/'.length);
      return decodeURIComponent(name);
    }
  } catch (e) {}
  return null;
}
function isV3(info) {
  if (info.type === 'ImageService3') return true;
  if (info.context && String(info.context).includes('/3/context')) return true;
  return false;
}
function flatUrlFromIiif(iiifUrl) {
  const base = iiifUrl.replace(/\/info\.json$/, '');
  return { v3: base + '/full/max/0/default.jpg', v2: base + '/full/full/0/default.jpg' };
}

// ---------- async pool ----------
async function pool(items, worker, label) {
  let idx = 0, done = 0;
  const total = items.length;
  async function next() {
    while (idx < total) {
      const my = idx++;
      await worker(items[my], my);
      done++;
      if (done % 50 === 0 || done === total) process.stderr.write(`[${label}] ${done}/${total}\n`);
    }
  }
  const workers = Array.from({ length: CONCURRENCY }, next);
  await Promise.all(workers);
}

// ---------- holder mapping ----------
const museumById = {}; for (const m of MUSEUMS) museumById[m.id] = m;
const SRC_TO_MUSEUM = {
  nga: 'nga-dc', mnw: 'mnw', 'nationalmuseum-se': 'nationalmuseum', met: 'met-nyc', gugg: 'guggenheim',
  vgm: 'van-gogh-museum', 'kroller-muller': 'kroller-muller', rijksmuseum: 'rijksmuseum', 'ng-london': 'national-gallery-london',
  vam: 'v-and-a', ycba: 'ycba', ngv: 'ngv', 'centre-pompidou': 'pompidou', agsa: 'agsa', whitney: 'whitney', orsay: 'orsay',
  getty: 'getty-center', harvard: 'harvard-art',
  // aggregators / ambiguous: no single implied holder, skip
  commons: null, artuk: null, parismusees: null,
};
function expectedQidForSrc(src) {
  const mid = SRC_TO_MUSEUM[src];
  if (!mid) return null;
  const m = museumById[mid];
  return m ? m.qid : null;
}
function holderNameForQid(qid) {
  const p = HOLDERS.places[qid];
  return p ? p.name : null;
}

function normName(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
function namesMatch(a, b) {
  const na = normName(a), nb = normName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  // substring both ways catches "Centre Pompidou" vs "Musée national d'art moderne, Centre
  // Pompidou"-style aliasing, and "National Gallery" vs "National Gallery of Art" etc.
  return na.includes(nb) || nb.includes(na);
}
function computeHolderMismatches() {
  const rows = [];
  // works[id] is populated ONLY for UNSEEN works (fetch-holders.js, header comment) — an id absent
  // from it is routinely a seen-in-person work (recorded via seenAt elsewhere) or a noResolve/no-qid
  // work (no Wikidata P195 to fetch). Neither is a mismatch; skip absent entries entirely.
  for (const id of Object.keys(HIRES)) {
    if (id === SKIP_ID) continue;
    const r = HIRES[id];
    const expQid = expectedQidForSrc(r.src);
    if (!expQid) continue; // aggregator/ambiguous src (commons/artuk/parismusees), skip
    const recQid = HOLDERS.works[id];
    if (!recQid) continue; // no holder record for this id — not a mismatch, see above
    const recName = holderNameForQid(recQid);
    const impName = holderNameForQid(expQid) || SRC_TO_MUSEUM[r.src];
    if (namesMatch(recName, impName)) continue; // same institution under different QIDs
    rows.push({ id, src: r.src, recorded: recName || recQid, implied: impName, recQid, expQid });
  }
  return rows;
}

// ---------- main measurement ----------
async function measureHiresRow(id, r) {
  const rec = { id, src: r.src, w: r.w, h: r.h, flat: r.flat || null, img: r.img, iiif: r.iiif || null, page: r.page || null };
  // img itself
  rec.imgMeasured = await fetchRangeSize(r.img);
  // iiif info.json
  if (r.iiif) {
    rec.infoJson = await fetchInfoJson(r.iiif);
  }
  // commons cross-check for commons-src rows
  if (r.src === 'commons') {
    const title = commonsTitleFromUrl(r.img);
    rec.commonsTitle = title;
    if (title) {
      const res = await commonsBatch([title]);
      rec.commonsMeasured = res[title];
    }
  }
  // flat-clamp re-measure: only rows that currently record `flat`
  if (r.flat && r.iiif) {
    const info = rec.infoJson;
    let flatUrl = null;
    if (info && !info.error) {
      const cands = flatUrlFromIiif(r.iiif);
      flatUrl = isV3(info) ? cands.v3 : cands.v2;
    } else {
      flatUrl = flatUrlFromIiif(r.iiif).v2;
    }
    rec.flatUrl = flatUrl;
    rec.flatMeasured = await fetchRangeSize(flatUrl);
  } else if (r.flat && r.src === 'commons') {
    // TIFF-bucket case: probe a much larger width request to see current bucket ceiling
    const probeUrl = r.img.includes('?width=') ? r.img.replace(/\?width=\d+/, '?width=10000') : r.img + '?width=10000';
    rec.flatUrl = probeUrl;
    rec.flatMeasured = await fetchRangeSize(probeUrl);
  }
  return rec;
}

async function run() {
  console.log('Loaded:', Object.keys(HIRES).length, 'hires rows,', Object.keys(IMGSIZE).length, 'imgsize entries.');
  const results = { generatedAt: new Date().toISOString(), hires: [], imgsize: [], holderMismatches: [] };

  results.holderMismatches = computeHolderMismatches();
  console.log('Holder mismatches (local, no network):', results.holderMismatches.length);

  if (!SKIP_HIRES) {
    let ids = Object.keys(HIRES).filter((id) => id !== SKIP_ID);
    if (ONLY_SRC) ids = ids.filter((id) => HIRES[id].src === ONLY_SRC);
    ids = ids.slice(0, LIMIT);
    // Pre-warm the Commons title cache in real 50-per-call batches BEFORE the per-row pool, so
    // measureHiresRow's per-row commonsBatch([title]) call below hits cache and issues zero
    // network calls. (Round 1 called the API once per row — ~830 individual calls instead of ~17
    // batched ones, which is most of why upload/commons rate-limited us.)
    const commonsTitles = ids
      .filter((id) => HIRES[id].src === 'commons')
      .map((id) => commonsTitleFromUrl(HIRES[id].img))
      .filter(Boolean);
    console.log('Pre-warming Commons API cache for', commonsTitles.length, 'hires titles...');
    await commonsBatch(commonsTitles);
    saveCache(true);

    const rows = new Array(ids.length);
    await pool(ids, async (id, i) => { rows[i] = await measureHiresRow(id, HIRES[id]); }, 'hires');
    results.hires = rows;
    saveCache(true);
  }

  if (!SKIP_IMGSIZE) {
    const ids = Object.keys(IMGSIZE).slice(0, LIMIT === Infinity ? undefined : LIMIT);
    const idTitle = {};
    for (const id of ids) {
      const art = ARTWORKS[id];
      if (art && art.img) idTitle[id] = commonsTitleFromUrl(art.img);
    }
    console.log('Pre-warming Commons API cache for', Object.keys(idTitle).length, 'imgsize titles...');
    await commonsBatch(Object.values(idTitle).filter(Boolean));
    saveCache(true);

    const rows = new Array(ids.length);
    await pool(ids, async (id, i) => {
      const rec = { id, recorded: IMGSIZE[id] };
      const art = ARTWORKS[id];
      if (!art || !art.img) { rec.error = 'no art_data entry / img'; rows[i] = rec; return; }
      const title = idTitle[id];
      rec.title = title;
      if (!title) { rec.error = 'img not a commons URL: ' + art.img; rows[i] = rec; return; }
      const res = await commonsBatch([title]);
      rec.measured = res[title];
      rows[i] = rec;
    }, 'imgsize');
    results.imgsize = rows;
    saveCache(true);
  }

  fs.writeFileSync(RESULTS_PATH, JSON.stringify(results, null, 1));
  saveCache(true);
  console.log('Wrote', RESULTS_PATH);
}

run().catch((e) => { console.error(e); saveCache(true); process.exit(1); });
