// canvas-app.jsx — Canvas Phase 1: the wall (collage + salon toggle), Reader, Museums.
// Data: museums.js + artworks.js (hand canon) ⊕ art_data.js (Wikidata/Commons overlay, by id).
// Routes: #/ (wall) · #/museums · #/work/<id>. Confidence renders honestly: "?" = probably,
// "??" = unsure, faded card. No-image works (copyright/TBC) are text-forward cards by design.
const { useState, useEffect, useMemo, useRef, useCallback } = React;

const MUSEUMS = window.CANVAS_MUSEUMS || [];
// Anonymous / institutional works (artifact decks — British Museum, NMK Seoul) carry a null
// artist; coerce to "" once here so the many downstream `.artist.replace/.split/.localeCompare`
// sites don't throw. Falsy-guards elsewhere (`w.artist || "—"`, `p.artist ? …`) still hold.
const WORKS = (window.CANVAS_ARTWORKS || []).map(w => (w.artist == null ? { ...w, artist: "" } : w));
const AD = window.CANVAS_ART_DATA || { museums: {}, artworks: {}, artists: {} };

const MUS_BY_ID = {}; for (const m of MUSEUMS) MUS_BY_ID[m.id] = m;

// ——— lazy data tier (2026-08-26): the three heaviest overlays no longer ride index.html.
// art_inspect.js (Study tours), art-about.js (Reader reads) and museum_highlights.js (decks)
// are injected here — on an idle timer after boot, or immediately when a route needs them.
// Every consumer already reads `window.X || {}` at RENDER time (never cached at module scope
// — keep it that way), so the only wiring needed is a re-render when a file lands: each
// onload calls App's `__cvLazyTick`. The injected requests are unversioned; the service
// worker's stale-while-revalidate tier + the per-deploy cache epoch keep them fresh (the
// same contract Rotation's lazy shards use).
const LAZY_DATA = [
  ["art_inspect.js", "CANVAS_INSPECT"],
  ["art-about.js", "CANVAS_ART_ABOUT"],
  ["museum_highlights.js", "CANVAS_HIGHLIGHTS"],
];
function ensureLazyData() {
  for (const [src, glob] of LAZY_DATA) {
    if (window[glob] || document.getElementById("cv-lazy-" + glob)) continue;
    const s = document.createElement("script");
    s.id = "cv-lazy-" + glob;
    s.src = src;
    s.async = true;
    s.onload = () => {
      window.__cvLazyGen = (window.__cvLazyGen || 0) + 1;
      window.dispatchEvent(new Event("cv-lazy"));
    };
    // no onerror handler on purpose: a failed fetch just means the affected surfaces render
    // without that layer (same graceful degradation as before the split); SW retries next visit
    document.head.appendChild(s);
  }
}
// Subscribe a component to lazy-data arrivals. Returns a generation counter that bumps when a
// lazy file lands — ⚠ any useMemo whose filter/build chain reads one of the lazy globals MUST
// list this in its deps (the same stale-memo bug class as the wall's media/qual/tourOnly deps:
// the chip lights up but the list doesn't change). Render-scope reads need nothing extra.
function useLazyGen() {
  const [gen, setGen] = useState(() => window.__cvLazyGen || 0);
  useEffect(() => {
    const on = () => setGen(window.__cvLazyGen || 0);
    window.addEventListener("cv-lazy", on);
    return () => window.removeEventListener("cv-lazy", on);
  }, []);
  return gen;
}

// ── THE SEMANTIC HUNT (Fuad 2026-08-26: "free lexicon… let people freely search with
// whatever words they use"). Query encoder = hunt-encoder.js (Model2Vec potion-base-8M
// WordPiece port, parity-proven vs python at cosine ≥0.99996); assets = int8 token table
// (6.75 MB) + per-work prose vectors (human text only — tours/reads, never machine text).
// ⛔ Loads ONLY on search-bar focus (Fuad: "warm the prefetch only after hitting the
// searchbar") — never idle. SW caches every asset after first use. Fail-open: if anything
// here breaks, Subjects mode keeps its Wikidata tier exactly as before.
let HUNT_STATE = null, HUNT_LOADING = false;
function ensureHuntModel() {
  if (HUNT_STATE || HUNT_LOADING) return;
  HUNT_LOADING = true;
  const load = async () => {
    if (!window.HUNT_ENCODER) await new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "hunt-encoder.js"; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
    const [tokens, table, scales, works, wScales, ids] = await Promise.all([
      fetch("hunt_tokens.json").then(r => r.json()),
      fetch("hunt_table.bin").then(r => r.arrayBuffer()),
      fetch("hunt_scales.bin").then(r => r.arrayBuffer()),
      fetch("hunt_works.bin").then(r => r.arrayBuffer()),
      fetch("hunt_works_scales.bin").then(r => r.arrayBuffer()),
      fetch("hunt_works_ids.json").then(r => r.json()),
    ]);
    const DIMS = 256;
    // pre-dequantize all rows once (~6.2k×256 floats ≈ 6 MB RAM — cheap, queries fast)
    const wq = new Int8Array(works), ws = new Float32Array(wScales);
    const W = new Float32Array(wq.length);
    const nRows = wq.length / DIMS;
    for (let i = 0; i < nRows; i++) {
      const sc = ws[i], off = i * DIMS;
      for (let d = 0; d < DIMS; d++) W[off + d] = wq[off + d] * sc;
    }
    // ids file = { works: [workId], rowWork: [rowIndex → work index] } — rows are paragraph
    // chunks PLUS one doc-mean row per work; scoring takes the max per work (2026-08-26
    // tightening: chunk grain catches in-paragraph conjunctions, doc grain cross-paragraph).
    HUNT_STATE = {
      vocab: window.HUNT_ENCODER.buildVocab(tokens),
      table: new Int8Array(table), scales: new Float32Array(scales),
      works: W, workIds: ids.works, rowWork: ids.rowWork, dims: DIMS,
    };
    window.__cvLazyGen = (window.__cvLazyGen || 0) + 1;
    window.dispatchEvent(new Event("cv-lazy"));
  };
  load().catch(() => { HUNT_LOADING = false; });
}
// cosine top-k over the prose vectors + a small exact-term boost from art_hunt.js — the
// keyword index is a BOOST signal, never a gate (free-lexicon ruling).
function huntSearch(query, k) {
  if (!HUNT_STATE) return null;
  const E = window.HUNT_ENCODER, H = HUNT_STATE;
  const qv = E.encode(query, H.vocab, H.table, H.scales, H.dims);
  const HX = window.CANVAS_HUNT || {};
  // stem query words so "snowing" boosts snow, "mountains" boosts mountain
  const stem = w => w.replace(/ing$/, "").replace(/([^s])s$/, "$1");
  const qWords = new Set(query.toLowerCase().split(/[^a-z-]+/).filter(Boolean).map(stem));
  // best row (chunk OR doc grain) per work, then boost per matched hunt term (stacking —
  // "snow" AND "mountain" both matching outranks one)
  const best = new Map();
  for (const [s, i] of E.cosineTop(qv, H.works, H.dims, Math.min(400, H.rowWork.length))) {
    if (s < 0.18) break;
    const w = H.rowWork[i];
    if (s > (best.get(w) || -1)) best.set(w, s);
  }
  const out = [];
  for (const [w, s] of best) {
    const id = H.workIds[w];
    let boost = 0;
    for (const ft of (HX[id] || [])) if (qWords.has(stem(ft.split(":")[1]))) boost += 0.05;
    out.push({ id, score: s + Math.min(boost, 0.12) });
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, k);
}

// ——— deck queue: unmet majors added from artist pages, held in localStorage until graded.
// Shape: array of { qid, title, artist, year, img } (dedup by qid). The by-artists deck reads
// this FIRST, then the shipped CANVAS_BY_ARTISTS list (dedup by qid across both).
const DECK_QUEUE_KEY = "canvas-deck-queue";
const readDeckQueue = () => {
  try { const a = JSON.parse(localStorage.getItem(DECK_QUEUE_KEY)); return Array.isArray(a) ? a : []; }
  catch (e) { return []; }
};
const writeDeckQueue = (arr) => { try { localStorage.setItem(DECK_QUEUE_KEY, JSON.stringify(arr)); } catch (e) {} };
const isQueued = (qid) => readDeckQueue().some(w => w.qid === qid);
const addToDeckQueue = (w) => {
  const arr = readDeckQueue();
  if (arr.some(x => x.qid === w.qid)) return arr;
  const next = [...arr, { qid: w.qid, title: w.title, artist: w.artist, year: w.year || null, img: w.img || null }];
  writeDeckQueue(next);
  return next;
};
const COUNTRY = { jp: "Japan", us: "United States", fr: "France", ie: "Ireland", gb: "United Kingdom", at: "Austria", pl: "Poland", se: "Sweden", au: "Australia", nl: "Netherlands", ch: "Switzerland", de: "Germany", ca: "Canada", it: "Italy", gr: "Greece", kr: "South Korea" };

// merged view of one work: hand canon ⊕ overlay
const HIRES = window.CANVAS_HIRES || {};
// art_medium.js — [bucket, kindLabel, p31Qid] per work id. The Wall filters on the BUCKET; the
// raw Wikidata kind ("pastel artwork", "woodblock print", "group of casts") rides along for
// later use and is shown as the tooltip so the coarse chip never hides what the thing actually is.
const MEDIUM = window.CANVAS_MEDIUM || {};
const IMGSIZE = window.CANVAS_IMGSIZE || {};
// qid → canon work, for places that hold a Wikidata id and need to know whether the gallery
// already has the thing (museum highlights, deck picks).
const WORK_BY_QID = (() => { const m = {}; for (const w of WORKS) if (w.qid) m[w.qid] = w; return m; })();
// id → canon work. Used by the cross-reference resolver below to refuse a ref that names an id
// nobody minted (a plausible id typed from a title is the classic failure here — e.g.
// "teodor-axentowicz-kolomyjka" when the real slug is "teodor-axentowicz-ko-omyjka").
const WORK_BY_ID = (() => { const m = {}; for (const w of WORKS) m[w.id] = w; return m; })();

// ——— CORPUS CROSS-REFERENCES (Fuad 2026-08-25) ———————————————————————————————————————————
// Prose across the corpus names OTHER works that are also in this collection, and those names
// should be clickable. THE PROSE STRING IS NEVER MODIFIED: a sibling `refs` field carries the
// target id and the exact words to link. Inline [[id|text]] markup was rejected deliberately —
// the 13-step tour QC greps these paragraphs, word counts are enforced against them, and the
// reads cascade distils Interpretations out of them; markup inside the string corrupts all three.
//
//   beside: "The version he made outdoors is in this collection too. Wheat Field with Cypresses…",
//   refs:   [{ id: "vincent-van-gogh-wheat-field-with-cypresses", text: "Wheat Field with Cypresses" }]
//
// An entry holds more than one paragraph, so `refs` may ALSO be keyed by the field the paragraph
// lives in — refs: { context: [...], beside: [...] }. The bare-array form belongs to the object's
// DEFAULT paragraph, named explicitly at each call site (tour entry → `beside`, a `deeper` stop →
// `body`, an art-about read → `about`), so a beside-ref can never leak into the context paragraph.
const REF_DEV = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === "file:";
const refWarn = (msg) => { if (REF_DEV) console.warn("[refs] " + msg); };

// Pick the ref list for `obj[field]`; `dflt` names the paragraph the bare-array form belongs to.
function refsFor(obj, field, dflt) {
  const r = obj && obj.refs;
  if (!r) return null;
  if (Array.isArray(r)) return field === dflt ? r : null;
  return Array.isArray(r[field]) ? r[field] : null;
}

// linkRefs(text, refs, where) → React nodes. Concatenating the output reproduces `text` EXACTLY:
// every run is sliced out of the string itself, so nothing is reformatted or re-typed. With no
// refs the string is handed back untouched and renders byte-for-byte as it did before — zero
// visual change for the entries that carry none.
// A ref is SKIPPED, loudly in dev and harmlessly in production, when its id is outside the canon,
// when its text is absent from this paragraph, or when it occurs more than once (there is no
// honest way to choose an occurrence, so it does not guess). `where` is a label for the warning.
function linkRefs(text, refs, where) {
  if (typeof text !== "string" || !refs || !refs.length) return text;
  const spans = [];
  for (const r of refs) {
    if (!r || !r.id || !r.text) { refWarn("malformed ref in " + where); continue; }
    if (!WORK_BY_ID[r.id]) { refWarn("id not in canon: \"" + r.id + "\" — " + where); continue; }
    // indexOf, never a built regex: these paragraphs are full of straight apostrophes, em-dashes,
    // parentheses and diacritics that a pattern would reinterpret. Matching stays literal.
    const at = text.indexOf(r.text);
    if (at < 0) { refWarn("text not found: \"" + r.text + "\" — " + where); continue; }
    if (text.indexOf(r.text, at + r.text.length) >= 0) {
      refWarn("text occurs more than once, refusing to guess: \"" + r.text + "\" — " + where); continue;
    }
    spans.push({ start: at, end: at + r.text.length, id: r.id, text: r.text });
  }
  if (!spans.length) return text;
  // Longest match first, then drop anything that overlaps something already kept: a title that
  // contains a shorter title links as the fuller phrase, and links never nest.
  spans.sort((a, b) => (b.end - b.start) - (a.end - a.start) || a.start - b.start);
  const kept = [];
  for (const s of spans) {
    if (kept.some(k => s.start < k.end && k.start < s.end)) { refWarn("overlapping ref dropped: \"" + s.text + "\" — " + where); continue; }
    kept.push(s);
  }
  kept.sort((a, b) => a.start - b.start);
  const out = [];
  let cur = 0;
  for (let i = 0; i < kept.length; i++) {
    const s = kept[i];
    if (s.start > cur) out.push(text.slice(cur, s.start));
    // a plain hash anchor, exactly like the museum/artist "open ours in the Reader" links: the
    // hashchange listener in useRoute re-renders in place (no page load) and it leaves a real
    // history entry, so Back returns the reader to the paragraph they left.
    out.push(<a key={"r" + i} className="cv-ref" href={"#/work/" + s.id}
      title={WORK_BY_ID[s.id].title + " — also in this collection"}>{text.slice(s.start, s.end)}</a>);
    cur = s.end;
  }
  if (cur < text.length) out.push(text.slice(cur));
  return out;
}
// art_artists.js — short reads on the artist page. Absent for most artists BY DESIGN: the
// coverage gate in READS_SPEC §10 is >=3 works, a floored work, or an existing read, and an
// artist with nothing to say keeps the bare Wikidata descriptor rather than being padded.
const ARTIST_READ = window.CANVAS_ARTISTS || {};
// art_holders.js — for a work Fuad has NOT seen, where it lives. Wikidata's collection (P195),
// which is the work's home institution rather than a promise about what is on the wall this week.
// Kept apart from seenAt, which records where he stood.
const HOLD = window.CANVAS_HOLDERS || { works: {}, places: {} };
const homeOf = (w) => HOLD.places[HOLD.works[w.id]] || null;
// The pilgrimage is everything still to be met: an explicit wish, or a sighting he is unsure of.
// Loved and liked are kept distinguishable — they are different appetites, not one list.
const isUnseen = (w) => !!w.wish || w.seenConfidence === "unsure";
const unseenRank = (w) => (w.floored || w.favorite) ? 2 : w.liked ? 1 : 0;   // 2 = loved, 1 = liked
const mediumOf = (w) => MEDIUM[w.id] || null;
const MEDIA = [["painting", "paintings"], ["sculpture", "sculpture"], ["paper", "works on paper"], ["object", "objects"], ["photo", "photography"]];
// QUALITY buckets (Fuad 2026-08-23) — how much real pixel the best-known source holds, from
// art_hires w/h (the 1,019-entry emit) falling back to art_imgsize. Cut-offs: 100MP = the
// Google-Art-class giga scans (~10k px+); 20MP = ~5k px, deep-zoom really rewards; 4MP = the
// ~2400px stage-A floor, solid full-screen; below that is a plate. Unknown size = no bucket,
// excluded when the filter is on (same no-guess rule as medium).
// Six MP tiers on a ~×4 ladder (Fuad 2026-08-23, second cut: "change the names to MP
// equivalents" — the gargantuan/yuge/meh/shoe draft renamed; band edges rebalanced from the
// first cut so no chip is near-empty). 150MP+ ≈ beyond the in-browser render cap (12.8k
// long side): those works always view through a pyramid/IIIF, with the full file behind
// the Ultra HQ link.
const QUALITY = [["q150", "150MP+"], ["q50", "50MP+"], ["q12", "12MP+"], ["q3", "3MP+"], ["q1", "1MP+"], ["q0", "<1MP"], ["iiif", "tiled · IIIF"]];
const qualityOf = (w) => {
  const h = HIRES[w.id];
  // `flat` caps the bucket: where the holder clamps flat renders (nationalmuseum-se ~1000px),
  // the master exists only tile by tile — advertising its MP here promised a download the
  // server refuses. Deep zoom stays discoverable through the "iiif" tag; the footer already
  // tells the same truth.
  let px = h && h.w && h.h ? (h.flat ? h.flat[0] * h.flat[1] : h.w * h.h) : null;
  if (!px) { const p = IMGSIZE[w.id]; if (p && p[0] && p[1]) px = p[0] * p[1]; }
  if (!px) return null;
  return px >= 150e6 ? "q150" : px >= 50e6 ? "q50" : px >= 12e6 ? "q12" : px >= 3e6 ? "q3" : px >= 1e6 ? "q1" : "q0";
};
// "iiif" is a cross-cutting TAG, not a size bucket (Fuad 2026-08-23) — works whose holder serves
// a real tile pyramid (NGA/AIC/CMA/V&A…), i.e. progressive zoom with no texture ceiling. It ORs
// with the size chips like everything else in the group.
const qualMatch = (w, ks) => ks.some(k => k === "iiif" ? !!(HIRES[w.id] && HIRES[w.id].iiif) : qualityOf(w) === k);
function enrich(w) {
  const d = AD.artworks[w.id] || {};
  const artist = AD.artists[w.artistId] || {};
  const venues = (Array.isArray(w.seenAt) ? w.seenAt : w.seenAt ? [w.seenAt] : []).map(id => MUS_BY_ID[id]).filter(Boolean);
  // hand-set images on the canon row (in-copyright works Wikidata can't supply) beat the overlay.
  // Machine img resolves first (thumbnails: grid stays lightweight); a hi-res overlay (Met/AIC/CMA
  // full-res, keyed by id) is layered BETWEEN hand and machine: it only upgrades the zoom/large
  // context, never the grid thumbnail — unless the machine has no image at all, then it fills in.
  const hires = HIRES[w.id] || null;
  const mImg = d.img || null, mGrid = d.imgGrid || null, mZoom = d.imgZoom || null;
  const hi = hires && hires.img ? hires.img : null;
  return { ...w, ...d, artistData: artist, venues, year: w.year || d.year || null, hires,
    img: w.img || mImg || hi || null,
    // hand-set canon img doubles as the grid thumb when the machine has none (at a lighter
    // width for FilePath URLs) — a hand-fixed image should never leave a blank wall tile
    imgGrid: w.imgGrid || mGrid || (mImg ? null : hi) || (w.img ? w.img.replace(/width=\d+/, "width=440") : null),
    imgZoom: w.imgZoom || hi || mZoom || null,
    // TRUE pixel size of the Commons source (art_imgsize.js). Commons never upscales, so a
    // ?width=2000 url is only worth 2000px if the original is at least that wide — 844 works
    // are not, and used to advertise "Full resolution" for an image a few hundred pixels across.
    px: IMGSIZE[w.id] || null };
}

// ——— LazyImg — real off-screen deferral (mirrors culture's, audit 2026-07-18). Native loading="lazy"
// does NOT defer images that share the viewport's vertical band — a horizontal floored strip or a
// tall masonry wall fetches its whole row/column on first paint. A viewport-rooted IntersectionObserver
// only reveals src once a tile is actually near view, in ANY scroll direction. The container must carry
// its own dimensions (fixed height or aspect) so withholding src never collapses layout. (Fuad 2026-07-25)
// Admission queue in front of Commons (Fuad 2026-08-20: "Failed to load resource: 429" in bursts).
// Deferral alone is not enough — scrolling a wall into view reveals a whole band at once and every
// tile hits upload.wikimedia.org in the same tick. This caps how many are in flight and hands the
// slot on as each settles, so the same images still load, in a queue rather than a stampede.
//
// An <img> exposes no status code, so a 429 and a 404 both arrive as the same bare onError. That is
// why the retry is unconditional and capped at one: it recovers a rate-limited image transparently
// and costs a genuinely missing one a single extra request.
const IMG_MAX_INFLIGHT = 6;
const _imgWaiting = [];
let _imgActive = 0;
const _imgPump = () => {
  while (_imgActive < IMG_MAX_INFLIGHT && _imgWaiting.length) { _imgActive++; _imgWaiting.shift()(); }
};
const imgAcquire = (run) => { _imgWaiting.push(run); _imgPump(); };
const imgRelease = () => { _imgActive = Math.max(0, _imgActive - 1); _imgPump(); };

// ——— img.fuad.au: Cloudflare edge proxy over the hotlinked image hosts (source of truth:
// /img-proxy.worker.js + HUB.md, live 2026-08-22). proxied() rewrites a known host; every user
// pairs it with a fallback to the ORIGINAL url, so the worker failing — or its free-tier quota
// running dry on a big day — degrades to exactly the pre-proxy behaviour. Unknown hosts pass
// through untouched.
// The last two entries (added 2026-08-25) are CORS aliases, not cache aliases: the National
// Gallery London IIIF server and the Centre Pompidou DeepZoom host send NO Access-Control-Allow-
// Origin, so OSD's XHR for info.json / .dzi is blocked outright unless it goes through the worker.
// The worker does not know those aliases until Fuad pastes the change in his Cloudflare dashboard
// (.dtmp/tourqc-pass/WORKER_CHANGES.local.md); until then the alias 404s, OSD fires open-failed
// and the viewer falls back to the canon plate — i.e. exactly today's behaviour, never worse.
const IMG_PROXY = {
  "https://upload.wikimedia.org/": "https://img.fuad.au/upload/",
  "https://commons.wikimedia.org/": "https://img.fuad.au/commons/",
  "https://images.metmuseum.org/": "https://img.fuad.au/met/",
  "https://www.artic.edu/": "https://img.fuad.au/aic/",
  // Aliases MUST match the deployed worker's UPSTREAM map exactly (img-proxy.worker.js is the
  // canonical copy of what is pasted into the Cloudflare dashboard). An alias the worker does
  // not know 404s, which here degrades silently to the 900px canon plate — so a typo costs a
  // 679-megapixel scan and looks like nothing happened. Deployed 2026-08-25 as ngl / cpom.
  "https://www.nationalgallery.org.uk/": "https://img.fuad.au/ngl/",
  "https://www.centrepompidou.fr/": "https://img.fuad.au/cpom/",
  // Added after MEASURING the headers (2026-08-25) rather than trusting the sourcing sheet,
  // which said only NG and Pompidou lacked CORS. They don't: NGV answers with
  // acao=https://content.ngv.vic.gov.au (its own origin, useless to us) and AGSA + Whitney
  // send none at all. All three are fetched with crossOriginPolicy Anonymous, so all three
  // need the proxy. NGV is the urgent one — Zoomify fetches no descriptor, so a CORS failure
  // there shows as broken tiles with NO open-failed event and therefore no fallback.
  "https://content.ngv.vic.gov.au/": "https://img.fuad.au/ngv/",
  "https://agsa-prod.s3.amazonaws.com/": "https://img.fuad.au/agsa/",
  "https://whitneymedia.org/": "https://img.fuad.au/whitney/",
  // Art UK (2026-08-25 round 3, 9 floor-raiser plates). d3d00swyhr67nd.cloudfront.net sends NO
  // Access-Control-Allow-Origin — measured on both a 200 and a 404 — and resolveOSDSource hands
  // hires.img to OSD with cors:"Anonymous", so the un-proxied url fails the crossorigin load.
  // NOT YET IN THE WORKER: alias "artuk" must be pasted in the Cloudflare dashboard
  // (.dtmp/tourqc-pass/WORKER_ARTUK.local.md). Until then the alias 404s → open-failed → the
  // viewer rebuilds on the DIRECT url with cors:false, which loads fine, so the degradation is
  // benign and never worse than the pre-adoption plate.
  "https://d3d00swyhr67nd.cloudfront.net/": "https://img.fuad.au/artuk/",
  // Guggenheim (2026-08-25 w17, 20 adopted plates). www.guggenheim.org sends NO
  // Access-Control-Allow-Origin and no `vary` at all — measured with Origin: https://fuad.au on
  // 30 assets by the sourcing pass and re-measured here on a live row (direct: 200 image/jpeg,
  // ACAO absent). These are `type:"image"` sources opened with cors:"Anonymous", so without the
  // proxy the first open ALWAYS fails and open-failed rebuilds on the direct url with cors:false
  // — never a worse image, just a wasted round-trip. The alias earns its place by removing it.
  // DEPLOYED: verified 2026-08-25 against the live worker — /gugg/ returns 200 image/jpeg with
  // access-control-allow-origin: *, where an unknown alias returns the worker's "unknown
  // upstream" 404. (`artuk` above is still unpasted: it 404s on that same probe.)
  "https://www.guggenheim.org/": "https://img.fuad.au/gugg/",
};
const proxied = (u) => {
  if (!u) return u;
  for (const k in IMG_PROXY) if (u.startsWith(k)) return IMG_PROXY[k] + u.slice(k.length);
  return u;
};
// shared onError for PLAIN <img> tags rendered with a proxied src: one hop back to the direct
// url, then (if data-slug is present) one final hop to the Commons fallback for single-host
// museum plates (cyfrowe-cdn.mnw.art.pl / api.nga.gov). Chain: proxied → direct → Commons.
// Matches LazyImg's single-retry discipline — each distinct src is its own attempt.
const unproxy = (e) => {
  const el = e.currentTarget, orig = el.dataset && el.dataset.orig;
  if (orig && el.src !== orig) { el.src = orig; return; }
  // final hop: Commons fallback for single-host museum plates
  const slug = el.dataset && el.dataset.slug;
  const fb = slug && (window.CANVAS_FALLBACKS || {})[slug];
  if (fb && el.src !== fb[0]) el.src = fb[0];
};

// ——— Fold — disclosure wrapper animated BOTH ways (Fuad 2026-08-22: closing "fewer" and the
// pilgrimage countries/cities must ease shut, not vanish). Content mounts on open (grid-rows
// 0fr→1fr), plays the reverse animation on close, and unmounts only when that finishes — so
// the heavy reels/chips still stay out of the DOM whenever the fold is shut at rest.
// onAnimationEnd is name-guarded: child mount animations (cvChipIn) bubble through here too.
function Fold({ open, children }) {
  const [render, setRender] = useState(open);
  // `.cv-foldin` must clip while the grid-rows animation runs — that clipping IS the fold. But
  // leaving it clipped at rest ate the pilgrimage reel's hover pop, which deliberately overflows
  // upward out of its row (Fuad 2026-08-24: "hovered versions of the artworks need to have the
  // highest z-index, at the moment they're covered by the row's container"). So the fold marks
  // itself at rest once the animation ends and CSS releases the overflow only then.
  const [atRest, setAtRest] = useState(false);
  useEffect(() => { if (open) setRender(true); setAtRest(false); }, [open]);
  if (!render) return null;
  return (
    <div className="cv-fold" data-closing={!open || undefined} data-rest={atRest || undefined}
      onAnimationEnd={(e) => {
        if (!open && /cvFoldClose/.test(e.animationName)) setRender(false);
        else if (open && /cvPilOpen/.test(e.animationName)) setAtRest(true);
      }}>
      <div className="cv-foldin">{children}</div>
    </div>
  );
}

function LazyImg({ src, alt, className, title, loading, style }) {
  const ref = useRef(null);
  const [show, setShow] = useState(false);
  const [bust, setBust] = useState(0);     // retry counter; also forces a fresh request
  const held = useRef(false);              // do we hold a slot right now? (guards a double release)
  const release = () => { if (held.current) { held.current = false; imgRelease(); } };
  useEffect(() => {
    if (show || !src) return;
    const el = ref.current; if (!el) return;
    let queued = false;
    const admit = () => { queued = true; imgAcquire(() => { held.current = true; setShow(true); }); };
    if (typeof IntersectionObserver === "undefined") { admit(); return () => { if (queued) release(); }; }
    const io = new IntersectionObserver((ents) => {
      for (const e of ents) if (e.isIntersecting) { admit(); io.disconnect(); return; }
    }, { rootMargin: "500px" });
    io.observe(el);
    return () => { io.disconnect(); if (queued) release(); };
  }, [show, src]);
  // release on unmount too — a slot held by a tile that scrolls out of the tree would otherwise
  // shrink the pool permanently, and enough of those deadlock loading altogether.
  useEffect(() => release, []);
  const onFail = () => {
    release();
    if (bust === 0) setTimeout(() => setBust(1), 400 + Math.random() * 600);   // jittered single retry
  };
  // proxy-first: attempt 0 goes through img.fuad.au; the existing retry slot doubles as the
  // fallback and goes DIRECT (a different url is its own cache-bust). Hosts the proxy doesn't
  // know keep the original bust-retry semantics.
  const prox = proxied(src);
  const url = show
    ? (bust ? (prox !== src ? src : src + (src.includes("?") ? "&" : "?") + "_r=" + bust) : prox)
    : undefined;
  return <img ref={ref} className={className} alt={alt || ""} title={title} style={style}
    src={url} loading={loading || "lazy"} decoding="async" onLoad={release} onError={onFail} />
}

// ——— HighlightPeek — a look at a museum highlight the canon does NOT hold.
// Those thumbnails were links straight out to Wikidata, which is a fine place to READ about a work
// and a poor one to LOOK at it — leaving the site to see a picture already on screen is a strange
// trade (Fuad 2026-08-19: "I still can't click to see them"). Highlights the canon DOES hold open
// the real Reader; this is only for the rest, so it stays small: the image at a usable size, what
// little we know, and the Wikidata link still offered rather than forced.
function HighlightPeek({ item, onClose }) {
  useEffect(() => {
    if (!item) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";     // the page behind must not scroll under the overlay
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [item, onClose]);
  if (!item) return null;
  const big = (item.img || "").replace(/width=\d+/, "width=1400");
  return (
    <div className="cv-peek" onClick={onClose} role="dialog" aria-modal="true" aria-label={item.title}>
      <div className="cv-peek-inner" onClick={e => e.stopPropagation()}>
        <button className="cv-peek-x" onClick={onClose} aria-label="Close">✕</button>
        {item.img && <img src={proxied(big)} data-orig={big} data-slug={item.id} onError={unproxy} alt={item.title} />}
        <div className="cv-peek-cap">
          <div className="cv-peek-title">{item.title}</div>
          <div className="cv-peek-sub">
            {[item.artist, item.year].filter(Boolean).join(" · ")}
            {item.qid && <> · <a href={`https://www.wikidata.org/wiki/${item.qid}`} target="_blank" rel="noopener noreferrer">Wikidata ↗</a></>}
          </div>
          <div className="cv-peek-note">A highlight of the collection you haven't met.</div>
        </div>
      </div>
    </div>
  );
}

// ——— PilReel — a horizontal reel of miniatures; hovering one lifts a larger version above the strip
// with its title and artist (Fuad 2026-08-20). A stack of full-width rows was the wrong shape for
// 1,465 works you browse rather than read: the thumbnail is what you recognise a painting by, and a
// reel puts twenty of them where one row used to sit.
//
// The enlarged view is a SIBLING of the scroller, not a child, absolutely positioned above it. A
// child would be clipped by the reel's own overflow-x — that is the trap with this pattern, since
// you cannot scale a tile up inside a horizontal scroller and expect it to escape. It overlays what
// is above rather than reserving a slot, so nothing shifts as the pointer runs along the strip.
function PilReel({ works, go }) {
  const [hov, setHov] = useState(null);          // { w, x } — x anchors the pop over its tile
  const wrapRef = useRef(null);
  const onEnter = (w) => (e) => {
    const wrap = wrapRef.current; if (!wrap) return;
    const r = e.currentTarget.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
    // centre the pop on the tile, then clamp so it never hangs off either end of the strip
    setHov({ w, x: Math.max(0, Math.min(r.left - wr.left + r.width / 2 - 110, Math.max(0, wr.width - 220))) });
  };
  return (
    <div className="cv-reel-wrap" ref={wrapRef} onMouseLeave={() => setHov(null)}>
      {hov && (
        <div className="cv-reel-pop" style={{ left: hov.x }}>
          {hov.w.imgGrid && <img src={proxied(hov.w.imgGrid)} data-orig={hov.w.imgGrid} data-slug={hov.w.id} onError={unproxy} alt="" />}
          <div className="cv-reel-cap">
            <b>{hov.w.title}</b>
            <span>{hov.w.artist.replace(/\s*\(.*\)$/, "")}{hov.w.year ? " · " + hov.w.year : ""}</span>
          </div>
        </div>
      )}
      <div className="cv-reel">
        {works.map(w => (
          <button key={w.id} className="cv-reel-item" data-loved={unseenRank(w) === 2 ? "true" : undefined}
            title={w.title} onMouseEnter={onEnter(w)} onFocus={onEnter(w)} onClick={() => go("work", w.id)}>
            {w.imgGrid ? <LazyImg src={w.imgGrid} alt={w.title} /> : <span className="cv-reel-none">{w.title.slice(0, 2)}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

// ——— RevealChunks — reveal-based lazy RENDERING for long lists (Fuad 2026-07-25). Renders the first
// `initial` items immediately, then reveals `step` more each time a sentinel near the list's end scrolls
// into view. Keeps the initial DOM small on museum/artist/index pages (long walls used to mount every
// card up-front). `render(items)` receives the currently-revealed slice and returns the wall/grid markup.
function RevealChunks({ items, initial = 24, step = 24, render }) {
  const [n, setN] = useState(Math.min(initial, items.length));
  const sentinel = useRef(null);
  // reset the reveal window when the source list changes (filter/sort/route change)
  useEffect(() => { setN(Math.min(initial, items.length)); }, [items, initial]);
  useEffect(() => {
    if (n >= items.length) return;
    const el = sentinel.current; if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setN(items.length); return; }
    const io = new IntersectionObserver((ents) => {
      for (const e of ents) if (e.isIntersecting) { setN(v => Math.min(v + step, items.length)); return; }
    }, { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [n, items, step]);
  return (
    <React.Fragment>
      {render(items.slice(0, n))}
      {n < items.length && <div ref={sentinel} className="cv-reveal-sentinel" aria-hidden="true" />}
    </React.Fragment>
  );
}

function useRoute() {
  const parse = () => {
    const h = (location.hash || "#/").replace(/^#\/?/, "");
    const segs = h.split("/");
    return { view: segs[0] || "wall", id: segs[1] || null, part: segs[2] ? (parseInt(segs[2], 10) || 1) : 1 };
  };
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => setRoute(parse());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

function ConfChip({ conf }) {
  const label = conf === "sure" ? "seen — sure" : conf === "probably" ? "seen — probably" : "seen — unsure";
  return <span className="cv-chip" data-k={"conf-" + conf}>{label}</span>;
}

function Card({ w, go }) {
  const img = w.imgGrid;
  const title = w.label && !/^TBC/.test(w.title) ? w.title : w.title.replace(/^TBC — /, "");
  const byline = w.artist.replace(/\s*\(.*\)$/, "") + (w.year ? " · " + w.year : "");
  return (
    <div className={"cv-card" + (img ? "" : " cv-text")} data-conf={w.seenConfidence}
      onClick={() => go("work", w.id)}
      // hover shows the RAW Wikidata kind next to the title — the medium chips are deliberately
      // coarse, and this is where "woodblock print", "cage cup", "diorama" or "group of casts"
      // stays visible instead of being flattened into "works on paper" / "objects".
      title={w.title + ((mediumOf(w) && mediumOf(w)[1]) ? " · " + mediumOf(w)[1] : "")}>
      {(w.favorite || w.floored) ? <span className="cv-fav">★</span> : w.liked ? <span className="cv-fav">♡</span> : null}
      {/* The wall is a CSS-column masonry, so an image with no src collapses to zero height and
          the whole column reflows. art_imgsize gives real dimensions, so reserve the space with
          aspect-ratio and the tile holds its shape while the src is still withheld — which also
          kills the layout shift that used to happen as each image landed. Works with no measured
          size (24 of them) keep the plain img, where the natural aspect is doing that job. */}
      {img && (w.px
        ? <LazyImg src={img} alt={w.title} style={{ aspectRatio: `${w.px[0]} / ${w.px[1]}` }} />
        : <LazyImg src={img} alt={w.title} />)}
      <div className="cv-label">
        <div className="cv-title">{title}</div>
        <div className="cv-byline">{byline}</div>
        {!img && w.note && <div className="cv-note">{w.note.split(" NOTE:")[0].split(" Attribution")[0]}</div>}
        {!img && <div className="cv-why">{/TBC/.test(w.title) ? "awaiting the recall deck" : "image withheld — in-copyright artist"}</div>}
      </div>
      {/* hover-peek Info was tried and DISABLED the same day (Fuad 2026-08-15: "this
          doesn't look right") — don't re-add without asking. The fused Info lives on the
          work page; the byline fix (.cv-byline rename) stays. */}
    </div>
  );
}

// ——— the Wall: filter chips × museum select × sort, capped at 48 with reversible load-more.
// Sorts: "hang" (floored → loved → the rest, images first) · year · artist · museum.
const CAP = 48;
// TWO independent axes (Fuad 2026-08-20), each multi-select and OR'd within itself, AND'd across.
//
// MARKS are the feeling, and the vocabulary is counter-intuitive on purpose: what this site calls
// FLOORED is what Fuad means by loved, and what it calls LOVED is what he means by liked. They are
// separate tiers, not nested — "loved" used to resolve to floored ∪ liked, which is 1,833 of 1,894
// works and therefore filtered nothing. It now means the `liked` mark alone.
//
// STATUS is the encounter: did you stand in front of it, are you unsure, is it still to come. All
// six chips used to share one radio group, so "floored things I still haven't seen" — the question
// the pilgrimage exists to answer — could not be asked.
// Each filter carries a full label and a phone label. The glyph alone is enough on a phone for
// the two marks — a star and a heart are already the vocabulary the cards use — while the status
// filters keep their words, because "seen" and "not seen" have no agreed symbol and guessing one
// would be worse than the space it saves (Fuad 2026-08-22).
// "seen — sure" became "Seen" and "pilgrimage" became "Not seen" on BOTH sizes: the old pair named
// the data model (a confidence value, an aspiration) rather than the thing you are asking for.
const MARK_FILTERS = [["floored", "★ floored", "★"], ["loved", "♥ loved", "♥"]];
const STATUS_FILTERS = [["sure", "seen", "seen"], ["unsure", "unsure", "unsure"], ["wish", "not seen", "not seen"]];
const markPass = (w, k) => k === "floored" ? !!(w.floored || w.favorite) : !!w.liked;
const statusPass = (w, k) =>
  k === "sure" ? w.seenConfidence === "sure"
  : k === "unsure" ? (w.seenConfidence != null && w.seenConfidence !== "sure")
  // pilgrimage: an explicit wish, or an unsure sighting you marked — you want to see it properly
  : !!(w.wish || (w.seenConfidence === "unsure" && (w.liked || w.floored || w.favorite)));
const weight = (w) => (w.floored || w.favorite) ? 0 : (w.liked ? 1 : 2);
// arrangement helpers — dominant-hue of a work (grey/no-palette sort last), primary movement,
// and century band. All from data already loaded (CANVAS_PALETTE, AD.artists movementQids, year).
const palHueOf = (w) => { const p = (window.CANVAS_PALETTE || {})[w.id]; if (!p || !p[0]) return 999; const h = hexHue(p[0]); return h < 0 ? 998 : h; };
// PICK-A-COLOUR SORT (Fuad 2026-08-20: "it'd be nice if we could select our own palette and sort
// this way"). Distance is measured against EVERY swatch a work carries, not just the dominant one —
// a painting that is mostly sky but holds the red you asked for should still surface, and keying on
// swatch [0] alone would bury it. Works with no palette sort LAST rather than first, so the wall
// never opens on a block of unknowns.
const SPECTRUM_PICKS = [
  ["", "hue ramp"], ["#b23b2e", "red"], ["#c8762a", "amber"], ["#c2a53c", "gold"],
  ["#4a7a45", "green"], ["#2f6285", "blue"], ["#6b4b86", "violet"], ["#6f6257", "earth"],
  ["#20222a", "near-black"], ["#e6e0d4", "near-white"],
];
const rgbOf = (hex) => { const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || ""); return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null; };
const palDistTo = (w, target) => {
  const p = (window.CANVAS_PALETTE || {})[w.id]; if (!p || !p.length || !target) return 1e9;
  let best = 1e9;
  for (const hex of p) {
    const c = rgbOf(hex); if (!c) continue;
    const d = (c[0] - target[0]) ** 2 + (c[1] - target[1]) ** 2 + (c[2] - target[2]) ** 2;
    if (d < best) best = d;
  }
  return best;
};
// ERA CHIPS (Fuad 2026-08-20, replacing Timeline mode). Sized off the real distribution rather
// than round numbers: the median work is from 1888 and the middle half sits 1865-1906, so a
// century split would have produced one enormous 1800s bucket doing no work. These seven keep
// every band between roughly 150 and 380 works, with the thin pre-1800 tail merged into one.
const ERAS = [
  ["pre1800", "before 1800", -9999, 1799],
  ["e1800", "1800–49", 1800, 1849],
  ["e1850", "1850–74", 1850, 1874],
  ["e1875", "1875–89", 1875, 1889],
  ["e1890", "1890s", 1890, 1899],
  ["e1900", "1900–19", 1900, 1919],
  ["e1920", "1920 on", 1920, 9999],
  ["undated", "undated", null, null],
];
const eraPass = (w, k) => {
  const e = ERAS.find(x => x[0] === k); if (!e) return true;
  if (k === "undated") return !w.year;
  return !!w.year && w.year >= e[2] && w.year <= e[3];
};
const centuryOf = (w) => w.year ? Math.floor(w.year / 100) * 100 : null;

// ——— MOVEMENTS ———————————————————————————————————————————————————————————————
// Wikidata files movement on the ARTIST (P135), never on the canvas — so a style here always
// means "by an artist Wikidata calls an Impressionist", not "this picture is Impressionist".
// The copy says so; don't let the UI imply otherwise.
//
// Raw labels need a pass before they're fit to show: case is inconsistent ("Expressionism" and
// "expressionism" are separate labels, likewise Naturalism), "Baroque painting" is just Baroque,
// and Jules Bastien-Lepage's movement is literally "potato" (Wikidata junk, 2026-08-07).
const MOV_DROP = new Set(["potato"]);
const MOV_ALIAS = { "Baroque painting": "Baroque" };
// Title-case the first word and each space-separated word after it. Hyphen continuations are left
// alone on purpose, so "Post-impressionism" and "Ukiyo-e" keep the form the literature uses.
const movLabel = (s) => (MOV_ALIAS[s] || s).replace(/^[a-zà-ÿ]/, c => c.toUpperCase()).replace(/ ([a-zà-ÿ])/g, (m, c) => " " + c.toUpperCase());
const movSlug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
// ALL of an artist's movements, cleaned and deduped. Filtering matches ANY of them: reading only
// movementQids[0] hides most of the collection — Neo-impressionism is 1 work by primary and 23 by
// any, Bauhaus 0 vs 14, Fauvism 1 vs 11.
const movsOf = (w) => {
  const a = AD.artists[w.artistId];
  if (!a || !a.movementQids) return [];
  const out = [];
  for (const q of a.movementQids) {
    const raw = (AD.movements || {})[q];
    if (!raw || MOV_DROP.has(raw)) continue;
    const l = movLabel(raw);
    if (!out.includes(l)) out.push(l);
  }
  return out;
};
// grouped Movements mode needs ONE bucket per work, so it still keys off the primary movement.
const movOf = (w) => movsOf(w)[0] || null;
// every movement present in the canon, by work count — the chip row's source of truth
const movIndex = () => {
  const counts = {};
  for (const w of WORKS) for (const m of movsOf(w)) counts[m] = (counts[m] || 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([label, n]) => ({ label, n, slug: movSlug(label) }));
};

// how many style chips sit on the row before the rest fold into "+N more"
const STYLE_CHIPS = 12;

function Wall({ go, styleIds }) {
  const all = useMemo(() => WORKS.map(enrich), []);
  const lazyGen = useLazyGen();   // the ✦/⤢ read chips filter on lazy CANVAS_INSPECT
  // TODAY'S HANG (Fuad 2026-08-20): the Wall serves what Home used to serve, and Home is gone. Not
  // a filter and not a sort — homeHang picks a set AND orders it, including works pinned to always
  // appear, so it is applied as a whole rather than expressed in chips.
  // ON BY DEFAULT: this is the landing page now, and landing on 1,894 tiles is not a greeting.
  // Exception: a style deep-link (#/wall/impressionism) asked for a specific slice of the FULL
  // wall, so honouring the hang there would silently drop most of what was linked to.
  // DECLARED FIRST, above every filter: `unhang` below is CALLED during render rather than merely
  // closed over, so setHang has to exist by then. Move this back down and the toggles throw.
  const [hang, setHang] = useState(() => !styleIds);
  // ANY FILTER TURNS THE HANG OFF (Fuad 2026-08-21). The chips used to narrow the hang instead, so
  // "today's hang, 1890s only" was expressible — but it made the chip counts lie. Those are counted
  // against the whole wall, so a chip reading 240 could leave nine tiles on screen with nothing on
  // the page explaining the gap. Reaching for a filter is a statement about wanting the collection
  // rather than today's selection from it, so the hang steps aside instead of intersecting. The
  // chip stays lit-able to put it back.
  const unhang = (fn) => (...a) => { setHang(false); return fn(...a); };
  const [marks, setMarks] = useState(() => new Set());     // ★ floored / ♥ loved — OR within
  const [status, setStatus] = useState(() => new Set());    // seen / unsure / pilgrimage — OR within
  const toggleIn = (set, setter) => (k) => setter(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const toggleMark = unhang(toggleIn(marks, setMarks));
  const toggleStatus = unhang(toggleIn(status, setStatus));
  const [mus, setMus] = useState("");
  const [sort, setSort] = useState("hang");
  const [extra, setExtra] = useState(0);
  const [allStyles, setAllStyles] = useState(false);   // "+N more" disclosure
  const [media, setMedia] = useState([]);              // selected medium buckets, OR'd like styles
  const [pick, setPick] = useState("");                // colour-sort target ("" = hue ramp)
  const [eras, setEras] = useState(() => new Set());   // era chips — OR within, AND with the rest
  const toggleEra = unhang((k) => setEras(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; }));
  // ⤢ HAS A TOUR (Fuad 2026-08-24) — a cross-cutting filter on the first row, since "which of
  // these has something written about it" is a different question from grade or status.
  // It was briefly a PAIR of chips, INFO and TOUR (Fuad 2026-08-24: "introduce a button HAS A
  // TOUR next to HAS A READ, abbreviate the names to INFO and TOUR"). The INFO half was removed
  // on 2026-08-25 at Fuad's request — a read exists for nearly the whole imaged canon now, so
  // asking for "has an Info" barely narrowed anything, while a study tour is still scarce enough
  // to be worth a chip. Only TOUR remains; the `readOnly` state that backed INFO is gone with it.
  const [tourOnly, setTourOnly] = useState(false);
  const [qual, setQual] = useState([]);                // quality buckets, OR'd like media
  const toggleQual = unhang((k) => setQual(q => q.includes(k) ? q.filter(x => x !== k) : [...q, k]));
  // The full style list — order and slugs are stable so a URL like #/wall/impressionism keeps
  // working whatever is filtered. Only the NUMBERS react; see `movCounts` below.
  const movs = useMemo(movIndex, []);
  const toggleMedium = unhang((k) => setMedia(m => m.includes(k) ? m.filter(x => x !== k) : [...m, k]));
  // Selected styles live in the URL (#/wall/impressionism+fauvism), not in state — that makes a
  // filtered wall shareable and back-button-able, and gives Portrait somewhere to link to.
  const sel = useMemo(() => {
    const bySlug = new Map(movs.map(m => [m.slug, m.label]));
    return (styleIds || "").split("+").map(s => bySlug.get(s)).filter(Boolean);
  }, [styleIds, movs]);
  // setSel routes through go(), which changes the hash but does NOT remount Wall — so `hang` state
  // survives the navigation and has to be cleared explicitly like every other filter.
  const setSel = unhang((labels) => go("wall", labels.length ? labels.map(movSlug).join("+") : null));
  const toggle = (label) => setSel(sel.includes(label) ? sel.filter(x => x !== label) : [...sel, label]);
  useEffect(() => { setExtra(0); }, [marks, status, eras, mus, sort, styleIds, media, qual, pick, hang, tourOnly]);

  // Everything EXCEPT the style and medium selections. Both chip rows count against this, so their
  // numbers follow floored / liked / sure / wish / museum without either row filtering itself —
  // a facet that narrows by its own selection just reads 0 everywhere except what you picked
  // (Fuad 2026-08-20). Styles and media still AND against each other in `shown` below.
  const base = useMemo(() => {
    let list = all;
    if (marks.size) list = list.filter(w => [...marks].some(k => markPass(w, k)));
    if (status.size) list = list.filter(w => [...status].some(k => statusPass(w, k)));
    if (eras.size) list = list.filter(w => [...eras].some(k => eraPass(w, k)));
    if (mus) list = list.filter(w => (Array.isArray(w.seenAt) ? w.seenAt : [w.seenAt || w.at]).includes(mus));
    return list;
  }, [all, marks, status, eras, mus]);

  // Live facet counts. Both rows count against `base` — every filter EXCEPT their own — and each
  // also honours the other, so with Sculpture on, the style numbers are sculpture-only. A chip that
  // would return nothing shows 0 rather than lying with the all-time total.
  const qualPass = (w) => qualMatch(w, qual);
  const movCounts = useMemo(() => {
    const c = {};
    let list = media.length ? base.filter(w => { const m = mediumOf(w); return m && m[0] && media.includes(m[0]); }) : base;
    if (qual.length) list = list.filter(qualPass);
    for (const w of list) for (const m of movsOf(w)) c[m] = (c[m] || 0) + 1;
    return c;
  }, [base, media, qual]);
  const mediaCounts = useMemo(() => {
    const c = {};
    let list = sel.length ? base.filter(w => movsOf(w).some(m => sel.includes(m))) : base;
    if (qual.length) list = list.filter(qualPass);
    for (const w of list) { const m = mediumOf(w); if (m && m[0]) c[m[0]] = (c[m[0]] || 0) + 1; }
    return c;
  }, [base, sel, qual]);
  // quality counts follow every filter but not the quality selection itself — the shared facet rule
  const qualCounts = useMemo(() => {
    let list = base;
    if (sel.length) list = list.filter(w => movsOf(w).some(m => sel.includes(m)));
    if (media.length) list = list.filter(w => { const m = mediumOf(w); return m && m[0] && media.includes(m[0]); });
    const c = {};
    for (const w of list) {
      const q = qualityOf(w); if (q) c[q] = (c[q] || 0) + 1;
      if (qualMatch(w, ["iiif"])) c.iiif = (c.iiif || 0) + 1;
    }
    return c;
  }, [base, sel, media]);
  // era counts follow every other filter but not the era selection itself — same facet rule as
  // the style and medium rows
  const eraCounts = useMemo(() => {
    let list = all;
    if (marks.size) list = list.filter(w => [...marks].some(k => markPass(w, k)));
    if (status.size) list = list.filter(w => [...status].some(k => statusPass(w, k)));
    if (mus) list = list.filter(w => (Array.isArray(w.seenAt) ? w.seenAt : [w.seenAt || w.at]).includes(mus));
    if (sel.length) list = list.filter(w => movsOf(w).some(m => sel.includes(m)));
    if (media.length) list = list.filter(w => { const m = mediumOf(w); return m && m[0] && media.includes(m[0]); });
    if (qual.length) list = list.filter(w => qualMatch(w, qual));
    const c = {};
    for (const [k] of ERAS) c[k] = 0;
    for (const w of list) for (const [k] of ERAS) if (eraPass(w, k)) c[k]++;
    return c;
  }, [all, marks, status, mus, sel, media, qual]);
  // all-time counts, used only to decide which medium chips exist at all
  const mediaAll = useMemo(() => {
    const c = {};
    for (const w of all) { const m = mediumOf(w); if (m && m[0]) c[m[0]] = (c[m[0]] || 0) + 1; }
    return c;
  }, [all]);


  const shown = useMemo(() => {
    // marks and status are OR'd within themselves and AND'd against each other; see MARK_FILTERS.
    let list = all;
    if (marks.size) list = list.filter(w => [...marks].some(k => markPass(w, k)));
    if (status.size) list = list.filter(w => [...status].some(k => statusPass(w, k)));
    if (eras.size) list = list.filter(w => [...eras].some(k => eraPass(w, k)));
    if (mus) list = list.filter(w => (Array.isArray(w.seenAt) ? w.seenAt : [w.seenAt || w.at]).includes(mus));
    // styles are OR'd — picking Impressionism + Fauvism widens, it doesn't narrow to the overlap
    if (sel.length) list = list.filter(w => movsOf(w).some(m => sel.includes(m)));
    // medium buckets OR the same way, and AND against everything else. A work with no decided
    // bucket (vague or missing P31) is excluded once any chip is on — it is genuinely unknown,
    // and quietly sweeping it into "paintings" is the guess this pipeline refuses to make.
    if (media.length) list = list.filter(w => { const m = mediumOf(w); return m && m[0] && media.includes(m[0]); });
    // quality buckets OR like media; a work with no known pixel size is excluded once a chip is
    // on — unknown is unknown, not "plate". "iiif" ORs in as a cross-cutting tag.
    if (qual.length) list = list.filter(w => qualMatch(w, qual));
    if (tourOnly) list = list.filter(w => !!(window.CANVAS_INSPECT || {})[w.id]);
    const arr = [...list];
    // TODAY'S HANG short-circuits the sort: its order IS the content — pinned leads first, then the
    // day-seeded spread. The chips still narrow it, so "today's hang, 1890s only" works, but nothing
    // reorders it, because any reorder would throw away the thing that makes it a hang.
    if (hang) {
      const keep = new Set(list.map(w => w.id));
      return homeHang(all).filter(w => keep.has(w.id));
    }
    // ONE WALL, sorted (Fuad 2026-08-20). Spectrum, Timeline and Movements were three separate
    // "modes" that only ever differed by sort order, so they are sort options and chips now: colour
    // joins the dropdown, time became the era chips, and movement was always better served by the
    // style chips, which filter rather than merely reorder.
    if (sort === "hang") arr.sort((a, b) => (b.imgGrid ? 1 : 0) - (a.imgGrid ? 1 : 0) || weight(a) - weight(b));
    else if (sort === "year") arr.sort((a, b) => (a.year || 9999) - (b.year || 9999));
    else if (sort === "artist") arr.sort((a, b) => a.artist.localeCompare(b.artist) || (a.year || 0) - (b.year || 0));
    else if (sort === "museum") arr.sort((a, b) => String(a.seenAt).localeCompare(String(b.seenAt)) || weight(a) - weight(b));
    else if (sort === "colour") {
      const target = pick ? rgbOf(pick) : null;
      if (target) arr.sort((a, b) => palDistTo(a, target) - palDistTo(b, target) || weight(a) - weight(b));
      else arr.sort((a, b) => palHueOf(a) - palHueOf(b) || weight(a) - weight(b));
    }
    return arr;
    // `media` belongs in here: the filter above reads it, and without it the wall kept showing the
    // previous medium's results until some other filter happened to change (found 2026-08-20).
  // `qual` MUST be in these deps (2026-08-23 bug: it filtered inside but wasn't a dep, so only
  // the first quality click — which also cleared the hang — recomputed; later toggles froze)
  // …and `tourOnly` (the ✦/⤢ chip — 2026-08-24 was the THIRD time this exact bug shipped: media,
  // then qual, then the read chips). EVERY value the filter chain above reads has to appear here.
  // If you add a filter, add its state to this array in the same edit; the chip will light up
  // either way and the wall will simply not change, which looks like a broken button rather than
  // a stale memo.
  // …and `lazyGen` (2026-08-26): tourOnly reads the LAZY CANVAS_INSPECT — without the gen dep,
  // toggling the chip before the file lands cached an empty wall forever.
  }, [all, marks, status, eras, mus, sort, sel, media, qual, pick, hang, tourOnly, lazyGen]);
  const visN = CAP + extra;
  const musOpts = useMemo(() => {
    const counts = {};
    for (const w of all) for (const id of (Array.isArray(w.seenAt) ? w.seenAt : [w.seenAt || w.at])) if (id) counts[id] = (counts[id] || 0) + 1;
    return MUSEUMS.filter(m => counts[m.id]).map(m => ({ id: m.id, label: m.name.replace(/\s*\(.*\)$/, "") + " (" + counts[m.id] + ")" }));
  }, [all]);

  const vis = shown.slice(0, visN);

  return (
    <React.Fragment>
      <div className="cv-filters">
        {/* TODAY'S HANG — what Home shows, on the Wall: the day's rotating floored works with the
            ones Fuad pins always present. It leads the row because it replaces the whole selection
            rather than narrowing it, and it reads as a place to start rather than another filter. */}
        <button className="cv-hang-chip" data-on={hang} onClick={() => setHang(v => !v)}
          title="today's hang — a curated rotation of works that floored me">⌂ today's hang</button>
        <span className="cv-filt-div" aria-hidden="true" />
        {/* "all" clears both axes — a reset, not a third state you can be in */}
        <button data-on={!marks.size && !status.size}
          onClick={unhang(() => { setMarks(new Set()); setStatus(new Set()); })}>all</button>
        {MARK_FILTERS.map(([v, label, tiny]) => (
          <button key={v} data-on={marks.has(v)} onClick={() => toggleMark(v)} title={label}>
            <span className="cv-f-full">{label}</span><span className="cv-f-tiny">{tiny}</span>
          </button>
        ))}
        <span className="cv-filt-div" aria-hidden="true" />
        {STATUS_FILTERS.map(([v, label]) => (
          <button key={v} data-on={status.has(v)} onClick={() => toggleStatus(v)}>{label}</button>
        ))}
        <span className="cv-filt-div" aria-hidden="true" />
        <button data-on={tourOnly} onClick={unhang(() => setTourOnly(v => !v))}
          title="only works with a study tour — a walked close reading of the surface">
          <span className="cv-f-full">⤢ tour</span><span className="cv-f-tiny">⤢</span>
        </button>
        <select value={mus} onChange={unhang(e => setMus(e.target.value))}>
          <option value="">every museum</option>
          {musOpts.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
        <select value={sort === "colour" ? "hang" : sort} onChange={unhang(e => setSort(e.target.value))}>
          <option value="hang">hang order</option>
          <option value="year">by year</option>
          <option value="artist">by artist</option>
          <option value="museum">by museum</option>
        </select>
        {/* COLOUR SWATCHES, always present (Fuad 2026-08-20). First it was a mode, then a dropdown
            option, then a toggle that revealed them — each step still asked you to turn colour ON
            before you could use it. Now the swatches simply sit in the row: click one and the wall
            sorts toward it, click the lit one again and you are back to hang order. No enabling
            step, which is what "integrated" meant. Circles only, names on hover — ten labelled
            chips would have doubled the width of this row. */}
        <span className="cv-filt-div" aria-hidden="true" />
        <span className="cv-pick-lbl">colour</span>
        <span className="cv-picks">
          {SPECTRUM_PICKS.map(([hex, label]) => {
            const on = sort === "colour" && pick === hex;
            return (
              <button key={label} className="cv-pick-dot" data-on={on} title={hex ? "sort toward " + label : "sort along the hue ramp"}
                onClick={unhang(() => { if (on) { setSort("hang"); return; } setPick(hex); setSort("colour"); })}>
                <i className={hex ? "" : "cv-pick-ramp"} style={hex ? { background: hex } : null} />
              </button>
            );
          })}
          {/* the custom swatch shows its own lit state (Fuad 2026-08-20: "it doesn't show that this
              is currently active"). It is lit when a colour sort is running on a value that is not
              one of the presets — i.e. one you chose yourself. */}
          <label className="cv-pick-custom" data-on={sort === "colour" && !!pick && !SPECTRUM_PICKS.some(([hex]) => hex === pick)}
            title="sort toward any colour">
            <input type="color" value={pick || "#b23b2e"}
              onChange={unhang(e => { setPick(e.target.value); setSort("colour"); })} />
          </label>
          {/* an explicit off. Clicking a lit preset toggles it, but a colour input cannot: clicking
              it just reopens the picker, so a custom colour had no way out except choosing a
              different one. Same ✕ idiom the style and era rows use. */}
          {sort === "colour" && (
            <button className="cv-pick-off" onClick={unhang(() => setSort("hang"))} title="stop sorting by colour">✕</button>
          )}
        </span>
        <span className="cv-count">{Math.min(visN, shown.length)} of {shown.length}</span>
      </div>
      {/* MEDIUM + ERA share one row, medium leading (Fuad 2026-08-20). Both are short, closed sets
          of chips — five buckets and eight bands — so two full-width rows spent a lot of vertical
          space on a little over a line of content each, and pushed the wall further down the page.
          They are the two axes that describe the OBJECT (what it is, when it was made), which is
          why these pair and styles stays on its own row: that one is about the artist, and it grows
          to twenty-odd chips when expanded.
          MEDIUM — five coarse buckets folded from Wikidata P31, multi-select and OR'd. Unlike
          movement (which Wikidata files on the ARTIST) this is a property of the object itself, so
          no disclaimer is needed.
          ERA — replaces the old Timeline mode. Buckets are sized off the collection's real shape
          rather than round centuries; see ERAS. */}
      <div className="cv-styles cv-objrow">
        <span className="cv-objgrp">
          <span className="cv-styles-lbl" title="what kind of object it is — Wikidata P31">medium</span>
          {/* which chips EXIST is decided against the whole collection, so the row keeps a stable
              shape; the number on each is live, and a bucket with none left under the current
              filters dims instead of disappearing. Before the counts moved they were static, so
              dropping the empties was free — now it would make the row jump on every filter. */}
          {MEDIA.filter(([k]) => mediaAll[k]).map(([k, label]) => {
            const n = mediaCounts[k] || 0;
            return (
              <button key={k} data-on={media.includes(k)} data-empty={n === 0 && !media.includes(k)}
                onClick={() => toggleMedium(k)}>
                {label}<i>{n}</i>
              </button>
            );
          })}
          {media.length > 0 && <button className="cv-styles-clear" onClick={unhang(() => setMedia([]))}>✕ clear</button>}
        </span>
        <span className="cv-objgrp">
          <span className="cv-styles-lbl" title="when the work was made">era</span>
          {ERAS.map(([k, label]) => {
            const n = eraCounts[k] || 0;
            return (
              <button key={k} data-on={eras.has(k)} data-empty={n === 0 && !eras.has(k)}
                onClick={() => toggleEra(k)}>{label}<i>{n}</i></button>
            );
          })}
          {eras.size > 0 && <button className="cv-styles-clear" onClick={unhang(() => setEras(new Set()))}>✕ clear</button>}
        </span>
      </div>
      {/* STYLES — multi-select, OR'd. Movement is the artist's (Wikidata P135), so the note says
          so rather than pretending each canvas carries the tag. */}
      {(() => {
        const chip = (m) => {
          const n = movCounts[m.label] || 0;
          return (
            <button key={m.slug} data-on={sel.includes(m.label)} data-empty={n === 0 && !sel.includes(m.label)}
              onClick={() => toggle(m.label)}>
              {m.label}<i>{n}</i>
            </button>
          );
        };
        return (
          <React.Fragment>
            <div className="cv-styles">
              {/* QUALITY leads the shared line, styles after it (Fuad 2026-08-23 — moved three
                  times: medium+era row → own row → after styles → before styles). Buckets:
                  gigapixel >=100MP · ultra >=20MP · high >=4MP · plate below; unknown size
                  excluded when active. */}
              <span className="cv-styles-lbl"
                title="pixel size of the best source image — gigapixel ≥100MP · ultra ≥20MP · high ≥4MP · plate below">quality</span>
              {QUALITY.map(([k, label]) => {
                const n = qualCounts[k] || 0;
                return (
                  <button key={k} data-on={qual.includes(k)} data-empty={n === 0 && !qual.includes(k)}
                    onClick={() => toggleQual(k)}>{label}<i>{n}</i></button>
                );
              })}
              {qual.length > 0 && <button className="cv-styles-clear" onClick={unhang(() => setQual([]))}>✕ clear</button>}
              <span className="cv-styles-lbl" style={{ marginLeft: 14 }}
                title="Wikidata files movement on the artist, not the artwork">styles</span>
              {/* the count is the LIVE one; a chip that would return nothing is dimmed rather than hidden,
                  so the row does not reshuffle under the cursor every time a filter changes */}
              {movs.slice(0, STYLE_CHIPS).map(chip)}
              {movs.length > STYLE_CHIPS && (
                <button className="cv-styles-more" onClick={() => setAllStyles(v => !v)}>
                  {allStyles ? "fewer" : `+ ${movs.length - STYLE_CHIPS} more`}
                </button>
              )}
              {sel.length > 0 && <button className="cv-styles-clear" onClick={() => setSel([])}>✕ clear</button>}
            </div>
            {/* "+N more" EASES OPEN — and "fewer" eases SHUT (Fuad 2026-08-22 ×2). The overflow
                chips used to splice into the same wrap row, landing all ~109 in one frame; now
                the Fold animates both directions and keeps them unmounted at rest. */}
            <Fold open={allStyles && movs.length > STYLE_CHIPS}>
              <div className="cv-styles cv-styles-ext">{movs.slice(STYLE_CHIPS).map(chip)}</div>
            </Fold>
          </React.Fragment>
        );
      })()}
      {sel.length > 0 && (
        <div className="cv-styles-note">
          {shown.length} {shown.length === 1 ? "work" : "works"} by artists working in {sel.join(" or ")}
        </div>
      )}
      <div className="cv-wall">{vis.map(w => <Card key={w.id} w={w} go={go} />)}</div>
      {shown.length > visN && (
        <div className="cv-more"><button onClick={() => setExtra(e => e + CAP)}>hang {Math.min(CAP, shown.length - visN)} more</button></div>
      )}
    </React.Fragment>
  );
}

// ——— Pilgrimage: deck-derived wishes (artworks.js wish:true) grouped by holding museum,
// plus hand-authored places (pilgrimage.js) the decks can't know — the trip planner seed.
// (The standalone Pilgrimage view was folded into the Map — the "to see" works now pin to
//  their holding city on the map, with the grouped list beneath it. See MapView.)

// full-screen pan/zoom (Phase 5 "stand close to the brushwork" mode) — dependency-free:
// scroll to zoom (1–8×), drag to pan, double-click resets, Esc closes. Uses a 3200px thumb.
//
// CRASH FIX (was: onMouseMove → setT → React re-render on every mousemove pixel → jank/crash):
//   • Transform is written directly to img.style.transform via a ref on every pointermove event
//     (no React re-render mid-drag).
//   • State (scale+pan) is committed to React only on pointerup so React is only involved twice
//     (mount + release). This eliminates the re-render storm that caused the jank/crash.
//   • Pointer capture (setPointerCapture) keeps events coming even when the pointer leaves the
//     div — previously drag would silently stall on a fast swipe out-of-bounds.
//   • All listeners are on the overlay div (not window), cleaned up on unmount via the ref guard.
//   • Pan is clamped to avoid runaway offsets at low zoom.
function Zoom({ src, onClose }) {
  const imgRef = useRef(null);
  const overlayRef = useRef(null);
  // committed state: only updated on release so React never re-renders mid-drag
  const [committed, setCommitted] = useState({ s: 1.6, x: 0, y: 0 });
  // live state kept in a ref so pointermove reads it without stale closures
  const live = useRef({ s: 1.6, x: 0, y: 0 });
  const drag = useRef(null); // { pointerId, startX, startY, baseX, baseY }
  const raf = useRef(0);

  const applyTransform = useCallback((s, x, y) => {
    if (!imgRef.current) return;
    imgRef.current.style.transform = `translate(${x}px,${y}px) scale(${s})`;
  }, []);

  // keep live ref in sync with committed (e.g. on double-click reset)
  useEffect(() => {
    live.current = { ...committed };
    applyTransform(committed.s, committed.x, committed.y);
  }, [committed]);

  useEffect(() => {
    const on = (e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", on, true);
    return () => {
      window.removeEventListener("keydown", on, true);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [onClose]);

  // wheel handler — bound non-passively so we can preventDefault
  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      const { s, x, y } = live.current;
      const ns = Math.min(8, Math.max(1, s * (e.deltaY < 0 ? 1.15 : 0.87)));
      // scale around cursor position
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left - rect.width / 2;
      const cy = e.clientY - rect.top - rect.height / 2;
      const nx = cx + (x - cx) * (ns / s);
      const ny = cy + (y - cy) * (ns / s);
      live.current = { s: ns, x: nx, y: ny };
      if (!raf.current) raf.current = requestAnimationFrame(() => {
        raf.current = 0;
        applyTransform(live.current.s, live.current.x, live.current.y);
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [applyTransform]);

  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    // Don't capture/start pan when pressing the close button or hint — let their click fire normally.
    if (e.target.closest(".cv-zoom-close") || e.target.closest(".cv-zoom-hint")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, baseX: live.current.x, baseY: live.current.y };
  };

  const onPointerMove = (e) => {
    if (!drag.current || drag.current.pointerId !== e.pointerId) return;
    const nx = drag.current.baseX + (e.clientX - drag.current.startX);
    const ny = drag.current.baseY + (e.clientY - drag.current.startY);
    live.current = { ...live.current, x: nx, y: ny };
    if (!raf.current) raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      if (!imgRef.current) return;
      imgRef.current.style.transform = `translate(${live.current.x}px,${live.current.y}px) scale(${live.current.s})`;
    });
  };

  const onPointerUp = (e) => {
    if (!drag.current || drag.current.pointerId !== e.pointerId) return;
    drag.current = null;
    // commit to React state so a future double-click reset sees the right base
    setCommitted({ ...live.current });
  };

  const onDoubleClick = () => {
    drag.current = null;
    setCommitted({ s: 1.6, x: 0, y: 0 });
  };

  return (
    <div className="cv-zoom" ref={overlayRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={onDoubleClick}>
      <img ref={imgRef} src={src.replace(/width=\d+/, "width=3200")} alt=""
        style={{ transform: `translate(${committed.x}px,${committed.y}px) scale(${committed.s})` }}
        draggable="false" />
      <button className="cv-r-close cv-zoom-close" onClick={onClose}>✕</button>
      <div className="cv-zoom-hint">scroll to zoom · drag to pan · double-click resets · Esc closes</div>
    </div>
  );
}

// ——— Deep zoom: full-screen OpenSeadragon — source tiers, best first:
//   1. IIIF behind a CORS-less host: work.hires.iiifId — inline descriptor, proxied service base
//   2. IIIF (AIC/Met/CMA/NGA/V&A/Nationalmuseum tiled): work.hires.iiif — full tile pyramid
//   3. Zoomify pyramid (NGV): work.hires.zoomify — OSD's built-in zoomifytileservice
//   4. DeepZoom descriptor (Centre Pompidou): work.hires.dzi — OSD reads .dzi natively
//   5. commons legacy pyramid: work.hires.pyr — measured Commons server renders
//   6. hires simple image: work.hires.img — OSD simple-image source, whole file fetched
//   7. fallback simple image: work.imgZoom || work.img — same simple-image path, no hires entry
// The OSD script is vendored (never CDN) and lazy-loaded ONCE via a shared #osd-js tag; the
// viewer mounts into its own dark layer above the Reader and is destroyed on close.
// osdFailed: module-level flag set when the OSD script itself fails to load, so we can skip
// the OSD path entirely and tell the Reader to fall back to the plain Zoom overlay.
let osdLoad = null; // shared promise so the script is fetched a single time across opens
let osdFailed = false; // true after a hard script-load error
function loadOSD() {
  if (window.OpenSeadragon) return Promise.resolve();
  if (osdFailed) return Promise.reject(new Error("osd previously failed"));
  if (osdLoad) return osdLoad;
  osdLoad = new Promise((resolve, reject) => {
    let s = document.getElementById("osd-js");
    if (!s) {
      s = document.createElement("script");
      s.id = "osd-js";
      s.src = "vendor/openseadragon/openseadragon.min.js";
      document.body.appendChild(s);
    }
    s.addEventListener("load", () => resolve());
    s.addEventListener("error", () => { osdLoad = null; osdFailed = true; reject(new Error("osd load failed")); });
  });
  return osdLoad;
}

// Derive the OSD tileSource and caption label for any work.
// Returns { tileSource, label } or null if no usable image exists.
function resolveOSDSource(work) {
  if (!work) return null;
  // cors: only claim Anonymous where the host actually sends ACAO (museum APIs, wikimedia);
  // for arbitrary hosts (reddit etc.) crossOriginPolicy must be FALSE or the tile load errors.

  // IIIF ON A HOST THAT SENDS NO CORS HEADER (National Gallery London, 2026-08-25). Proxying the
  // info.json url alone is NOT enough: OSD's IIIFTileSource takes its tile base from the value of
  // `@id`/`id` INSIDE the response body (`this._id = this["@id"] || this.id || this.identifier`),
  // so the tiles would still be requested from the direct host and blocked. Hand OSD an inline
  // descriptor instead, with the service base already proxied — dims come from art_hires, and no
  // info.json round-trip happens at all. `protocol` is required: IIIFTileSource.supports() does
  // not recognise a bare IIIF 3 @context. No `tiles`/`sizes` declared on purpose — OSD then picks
  // a 1024 tile and asks for arbitrary regions, which any level2 server (IIPImage here) serves,
  // rather than us guessing the pyramid's own tile grid.
  // Exception, paid for on NG London: read `maxWidth`/`maxHeight` first. Where the descriptor
  // declares a clamp, omitting `tiles` silently caps the zoom at the clamp — declare `hires.tile`
  // at or under it instead.
  if (work.hires && work.hires.iiifId && work.hires.w && work.hires.h) {
    const src = (work.hires.src || "").toUpperCase();
    const ts = {
      protocol: "http://iiif.io/api/image",
      "@context": "http://iiif.io/api/image/3/context.json",
      "@id": proxied(work.hires.iiifId),
      profile: "level2",
      width: work.hires.w, height: work.hires.h,
    };
    // A CLAMPED SERVER IS THE EXCEPTION TO "OMIT tiles" (measured on ng-london, 2026-08-25).
    // Omitting `tiles` makes OSD pick a 1024 tile and ask for arbitrary regions — correct on an
    // unclamped level2 server, WRONG here: NG London's info.json declares maxWidth/maxHeight 800
    // and enforces it with a 200, so every 1024 tile came back at 800 and was upscaled, running
    // the deep zoom at ~78% of available detail on two toured works. A region whose OUTPUT size
    // is at or under the clamp is served at NATIVE pixels off the full master, so declaring a
    // tile at or under the clamp recovers all of it. `hires.tile` carries that number; the
    // scaleFactors below reproduce the server's own published list exactly.
    if (work.hires.tile) {
      const sf = [];
      for (let f = 1; Math.max(work.hires.w, work.hires.h) / f > work.hires.tile; f *= 2) sf.push(f);
      sf.push(sf.length ? sf[sf.length - 1] * 2 : 1);
      ts.tiles = [{ width: work.hires.tile, height: work.hires.tile, scaleFactors: sf }];
    }
    return { tileSource: ts, cors: "Anonymous", label: src ? `deep zoom via ${src}` : "deep zoom" };
  }
  if (work.hires && work.hires.iiif) {
    const src = (work.hires.src || "").toUpperCase();
    return { tileSource: work.hires.iiif, cors: "Anonymous", label: src ? `deep zoom via ${src}` : "deep zoom" };
  }
  // ZOOMIFY (NGV, 2026-08-25) — the NGV object page inlines an OpenLayers ol.source.Zoomify over
  // content.ngv.vic.gov.au/col-images/zooms/<imgid>/, with the true dims declared beside it (and
  // in that directory's ImageProperties.xml). OSD ships a ZoomifyTileSource: it needs nothing but
  // type + tilesUrl + width/height (tileSize defaults to 256, format to jpg, which is what NGV
  // serves), and it computes the grid itself — there is no metadata fetch, so no CORS on open.
  if (work.hires && work.hires.zoomify && work.hires.w && work.hires.h) {
    const src = (work.hires.src || "").toUpperCase();
    // 2026-08-25: tilesUrl was UNPROXIED while the dzi branch below uses proxied(). NGV tiles carry
    // ACAO for their own origin only, so fuad.au got blank tiles — and because Zoomify fetches no
    // descriptor, `open-failed` never fired and no fallback was ever set. Silent, on a toured
    // Rembrandt with six chapters. Through the ngv alias the same tile returns ACAO * and
    // byte-identical bytes (27,930 B, measured).
    return { tileSource: { type: "zoomifytileservice", tilesUrl: proxied(work.hires.zoomify),
      width: work.hires.w, height: work.hires.h },
      cors: "Anonymous", label: src ? `deep zoom via ${src}` : "deep zoom" };
  }
  // DEEPZOOM / DZI (Centre Pompidou, 2026-08-25) — OSD reads a .dzi descriptor natively and, unlike
  // IIIF, derives the tile directory from the URL IT FETCHED (`<name>_files/<level>/<x>_<y>.<fmt>`).
  // So proxying the descriptor proxies the tiles for free, which is what centrepompidou.fr needs:
  // it sends no ACAO and the descriptor is read by XHR. Pompidou caps these at 4000px long side
  // ("uhd" render tier, not the archival master) — still ×4 linear on the Matisses.
  if (work.hires && work.hires.dzi) {
    const src = (work.hires.src || "").toUpperCase();
    return { tileSource: proxied(work.hires.dzi), cors: "Anonymous", label: src ? `deep zoom via ${src}` : "deep zoom" };
  }
  // COMMONS PYRAMID (Fuad 2026-08-23, "the middle path"): museums without IIIF (MoMA, Orsay…)
  // only exist as flat Commons giga-files, and those can NEVER load whole (WebGL ~16k texture
  // ceiling; the Starry Night original is 696MB — never plugged in as-is). A legacy image
  // pyramid of Commons SERVER-RENDERED sizes gets progressive zoom with zero hosting.
  // EXACT DIMS ONLY (same day, second pass): the first cut computed level heights with our own
  // rounding, but Commons' thumbnailer rounds differently, and OSD's legacy pyramid visibly
  // wobbles when declared dims miss the file by even a pixel. `pyr` holds the MEASURED [w,h] of
  // each ladder thumb (emit-pyramids.py, JPEG-header-parsed); no pyr = plain 6000px plate, never
  // a guessed pyramid.
  if (work.hires && work.hires.src === "commons" && work.hires.orig && Array.isArray(work.hires.pyr)) {
    const file = decodeURIComponent(work.hires.orig.split("/").pop());
    const levels = work.hires.pyr.map(([lw, lh]) => ({
      url: proxied("https://commons.wikimedia.org/wiki/Special:FilePath/" + encodeURIComponent(file) + "?width=" + lw),
      width: lw, height: lh,
    }));
    const top = levels[levels.length - 1];
    const mp = Math.round(top.width * top.height / 1e6);
    return { tileSource: { type: "legacy-image-pyramid", levels }, cors: "Anonymous",
      label: `progressive zoom · ${mp} MP` };
  }
  if (work.hires && work.hires.img) {
    const src = (work.hires.src || "").toUpperCase();
    // proxied: the worker adds ACAO and follows redirects; open-failed still falls back to the
    // DIRECT canon image, so the chain is proxy → direct, never worse than before
    return { tileSource: { type: "image", url: proxied(work.hires.img) }, cors: "Anonymous", label: src ? `deep zoom via ${src}` : "deep zoom" };
  }
  const simpleUrl = work.imgZoom || work.img;
  if (simpleUrl) {
    // Proxied first: img.fuad.au follows the Special:FilePath redirect ITSELF and serves the
    // bytes with ACAO:* — which retires the Murillo gotcha (2026-07-12: the redirect hop sends
    // no ACAO, so crossorigin loads failed and this path was pinned to cors:false). Through the
    // proxy, cors stays false anyway — we still never need pixel access for plain viewing —
    // and the open-failed fallback rebuilds with the DIRECT url, unproxied, as before.
    return { tileSource: { type: "image", url: proxied(simpleUrl) }, cors: false, label: work.title.replace(/^TBC — /, "") };
  }
  return null;
}

// ULTRA-HQ policy (settled with Fuad 2026-08-22 after two failed attempts — do not rebuild):
// giga-scan art_hires entries cap their in-app `img` at a 6000px thumb and keep the untouched
// original in `orig`. (1) An in-viewer source-SWAP button was tried and killed: OSD renders a
// type:"image" source as one WebGL texture (max ~16384px → "INVALID_VALUE: texImage2D" on the
// 23k/44k scans), and even the capped swap didn't substitute reliably. (2) A plain new-tab link
// alone under-sold it. The settled shape: the READER FOOTER carries an explicit "Ultra HQ ↗"
// link to the untouched original (see cv-r-links), and the viewers stay on the 6000px plate.

// Who serves the deep-zoom tiles, for the reader's citation link (art_hires `src` → label).
// Only sources that publish a per-object page are listed; anything else falls back to a
// generic label rather than claiming an institution we can't name.
const HIRES_SOURCE_LABEL = {
  nga: "National Gallery of Art",
  met: "The Met",
  cma: "Cleveland Museum of Art",
  vam: "V&A",
  harvard: "Harvard Art Museums",
  parismusees: "Paris Musées",
  // 2026-08-25 holder-anchored batch — two IIIF, one Zoomify, one DeepZoom, two plain-JPEG
  "ng-london": "The National Gallery, London",
  "nationalmuseum-se": "Nationalmuseum, Stockholm",
  ngv: "National Gallery of Victoria",
  "centre-pompidou": "Centre Pompidou",
  agsa: "Art Gallery of South Australia",
  whitney: "Whitney Museum of American Art",
  // 2026-08-25 w17 — two flat-JPEG holders, both anchored on the holder's own accession
  gugg: "Solomon R. Guggenheim Museum",
  mnw: "National Museum in Warsaw",
};

// Fly an OSD viewer to a normalized-image region {x,y,w,h} (all 0..1 fractions of the image).
// immediately=false gives the gentle animated spring flight; true snaps. Shared by DeepZoom's
// detail tour and Study mode's anchored zoom so the imageToViewportRectangle math lives once.
function flyToAnchor(viewer, a, immediately) {
  if (!viewer || !a) return;
  try {
    const item = viewer.world.getItemAt(0);
    if (!item) return;
    const size = item.getContentSize();
    const rect = viewer.viewport.imageToViewportRectangle(
      a.x * size.x, a.y * size.y, a.w * size.x, a.h * size.y
    );
    viewer.viewport.fitBounds(rect, !!immediately);
  } catch (e) {}
}

// Mount an OpenSeadragon viewer for `work` into elRef, reusing loadOSD + resolveOSDSource.
// Returns { viewerRef, err, ready }. onOsdFail (optional) fires if the OSD *script* won't load
// (so callers can fall back to the plain Zoom overlay); otherwise a source/open failure sets err.
// The viewer is created once and destroyed on unmount. `ready` flips true once world is loaded,
// which is when imageToViewportRectangle math becomes valid (anchors can fly).
function useOSDViewer(work, onOsdFail) {
  const elRef = useRef(null);
  const viewerRef = useRef(null);
  const [err, setErr] = useState(false);
  const [ready, setReady] = useState(false);
  // When a HIRES tile source dies (dead IIIF id, CORS, museum API down — the Great Wave's AIC
  // iiif, found 2026-07-24), fall back to the plain canon image instead of stranding the view
  // with the err strip. The viewer is rebuilt with cors:false (Commons FilePath redirects send
  // no ACAO — the Murillo gotcha). One retry only; a failed fallback errs as before.
  const [fallbackUrl, setFallbackUrl] = useState(null);
  useEffect(() => { setFallbackUrl(null); setErr(false); setReady(false); }, [work]);
  const osdSrc = useMemo(() => {
    if (fallbackUrl) return { tileSource: { type: "image", url: fallbackUrl }, cors: false, label: work ? work.title.replace(/^TBC — /, "") : "" };
    return resolveOSDSource(work);
  }, [work, fallbackUrl]);
  useEffect(() => {
    let cancelled = false;
    if (!osdSrc) { setErr(true); return; }
    loadOSD().then(() => {
      if (cancelled || !elRef.current || !window.OpenSeadragon) return;
      try {
        const viewer = window.OpenSeadragon({
          element: elRef.current,
          prefixUrl: "vendor/openseadragon/images/",
          tileSources: osdSrc.tileSource,
          showNavigator: true,
          navigatorPosition: "BOTTOM_RIGHT",
          showNavigationControl: false,
          maxZoomPixelRatio: 2,
          gestureSettingsMouse: { clickToZoom: false, dblClickToZoom: true },
          crossOriginPolicy: osdSrc.cors,
          ajaxWithCredentials: false,
        });
        viewer.addHandler("open-failed", () => {
          if (cancelled) return;
          const simple = work && (work.imgZoom || work.img);
          // fall back when a retry would actually differ: a hires source dying drops to the
          // canon image, and a PROXIED canon image dying drops to the direct url (the simple
          // path goes through img.fuad.au now too, so it needs the same escape hatch)
          if (!fallbackUrl && simple && (work.hires || proxied(simple) !== simple)) { setFallbackUrl(simple); return; }
          // last resort: Commons fallback plate for works with no canon img (single-host museum
          // CDNs — MNW Warsaw / NGA Washington). A low-res card beats a blank viewer.
          const fb = !fallbackUrl && work && (window.CANVAS_FALLBACKS || {})[work.id];
          if (fb) { setFallbackUrl(fb[0]); return; }
          setErr(true);
        });
        viewer.addHandler("open", () => { if (!cancelled) setReady(true); });
        viewerRef.current = viewer;
      } catch (e) { if (!cancelled) setErr(true); }
    }).catch(() => {
      if (!cancelled) { if (onOsdFail) onOsdFail(); else setErr(true); }
    });
    return () => {
      cancelled = true;
      if (viewerRef.current) { try { viewerRef.current.destroy(); } catch (e) {} viewerRef.current = null; }
    };
  }, [osdSrc]);
  return { elRef, viewerRef, err, ready, osdSrc };
}

// Site-styled zoom controls — the default OSD chrome (image-sprite + − home fullscreen
// buttons) is disabled in useOSDViewer; these are the only viewer buttons.
function OSDControls({ viewerRef }) {
  const zoom = (f) => { const v = viewerRef.current; if (v) { v.viewport.zoomBy(f); v.viewport.applyConstraints(); } };
  const home = () => { const v = viewerRef.current; if (v) v.viewport.goHome(false); };
  return (
    <div className="cv-osd-ctl">
      <button type="button" onClick={() => zoom(1.5)} title="Zoom in">+</button>
      <button type="button" onClick={() => zoom(1 / 1.5)} title="Zoom out">−</button>
      <button type="button" onClick={home} title="Full view">⌂</button>
    </div>
  );
}

function DeepZoom({ work, onClose, onOsdFail }) {
  const { elRef, viewerRef, err, osdSrc } = useOSDViewer(work, onOsdFail);
  const lazyGen = useLazyGen();   // CANVAS_INSPECT is lazy now — rebuild details when it lands
  // FIX 6b (2026-07-17): prefer the work's own hires detail tour; but when it has none, fall back to
  // the anchored chapters of its study (CANVAS_INSPECT[id].deeper) — {t,x,y,w,h,body} → {t,x,y,w,h,n}
  // so every studied work gets a "walk the details" tour here too (title = chapter t, note = body).
  const details = useMemo(() => {
    const hd = (work.hires && work.hires.details) || [];
    if (hd.length) return hd;
    const insp = (window.CANVAS_INSPECT || {})[work.id];
    const deeper = (insp && insp.deeper) || [];
    return deeper
      .filter(c => typeof c.x === "number" && typeof c.y === "number" && typeof c.w === "number" && typeof c.h === "number")
      .map(c => ({ t: c.t, x: c.x, y: c.y, w: c.w, h: c.h, n: c.body }));
  }, [work, lazyGen]);
  // activeDetail: null = full view; number = index into details
  const [activeDetail, setActiveDetail] = useState(null);

  // Navigate to a detail via OSD viewport, or go home
  const goToDetail = useCallback((idx) => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    if (idx === null) {
      setActiveDetail(null);
      viewer.viewport.goHome(false);
      return;
    }
    const d = details[idx];
    if (!d) return;
    setActiveDetail(idx);
    flyToAnchor(viewer, d, false);
  }, [details]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); return; }
      if (!details.length) return;
      if (e.key === "ArrowRight") {
        e.stopPropagation();
        setActiveDetail(prev => {
          const next = prev === null ? 0 : Math.min(prev + 1, details.length - 1);
          // defer so goToDetail sees the viewer
          setTimeout(() => goToDetail(next), 0);
          return next;
        });
      }
      if (e.key === "ArrowLeft") {
        e.stopPropagation();
        setActiveDetail(prev => {
          if (prev === null || prev === 0) { setTimeout(() => goToDetail(null), 0); return null; }
          const next = prev - 1;
          setTimeout(() => goToDetail(next), 0);
          return next;
        });
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [goToDetail, onClose]);

  const activeDet = activeDetail !== null ? details[activeDetail] : null;
  const capLabel = osdSrc ? osdSrc.label : work.title.replace(/^TBC — /, "");

  return (
    <div className="cv-osd">
      <div className="cv-osd-view" ref={elRef} />
      <OSDControls viewerRef={viewerRef} />
      {err && <div className="cv-osd-err">zoom unavailable — the tile source didn't load</div>}
      <button className="cv-r-close cv-osd-close" onClick={onClose}>✕</button>

      {/* Annotation tour strip — only when details exist */}
      {details.length > 0 && (
        <div className="cv-osd-tour">
          <button
            className={"cv-osd-chip" + (activeDetail === null ? " cv-osd-chip-home" : "")}
            onClick={() => goToDetail(null)}
            title="Return to full view">
            ⌂ full view
          </button>
          {details.map((d, i) => (
            <button
              key={i}
              className={"cv-osd-chip" + (activeDetail === i ? " cv-osd-chip-on" : "")}
              onClick={() => goToDetail(i)}
              title={d.t}>
              <span className="cv-osd-chip-n">{i + 1}</span>
              <span className="cv-osd-chip-t">{d.t}</span>
            </button>
          ))}
          {details.length > 1 && <span className="cv-osd-tour-hint">← → to step</span>}
        </div>
      )}

      {/* Active detail caption card — bottom-left, replaces plain cap while a detail is active */}
      {activeDet ? (
        <div className="cv-osd-det-cap">
          <span className="cv-osd-det-n">{activeDetail + 1}/{details.length}</span>
          <span className="cv-osd-det-title">{activeDet.t}</span>
          <span className="cv-osd-det-note">{activeDet.n}</span>
        </div>
      ) : (
        <div className="cv-osd-cap">{capLabel}{details.length ? " · click a detail below to explore" : ""}</div>
      )}
    </div>
  );
}

// ——— Study mode (#/study/<id>): the flagship "tour guide who can talk for minutes, plus prose
// bound to pixels". Full-screen two-pane: LEFT a persistent OSD viewer (reusing useOSDViewer +
// the detail-tour chip strip), RIGHT a scrollable reading pane — the four lenses as sections,
// then the long-form `deeper` study chapters. Any lens/chapter with an {x,y,w,h} anchor gets a
// "⌖ look" button that flies the viewer there; when an anchored section scrolls into view (and
// auto-follow is on) the viewer GENTLY flies there on its own — reading IS the tour.
const STUDY_LENS_LABELS = { see: "What you see", about: "What it's about", craft: "Why it sings", context: "The moment" };
const STUDY_LENS_ORDER = ["see", "about", "craft", "context"];

function StudyView({ id, go }) {
  const work = useMemo(() => { const x = WORKS.find(x => x.id === id); return x ? enrich(x) : null; }, [id]);
  const inspect = (window.CANVAS_INSPECT || {})[id] || null;
  const { elRef, viewerRef, err, ready } = useOSDViewer(work, null);
  const [activeDetail, setActiveDetail] = useState(null);
  const [autoFollow, setAutoFollow] = useState(true);
  const autoRef = useRef(true); autoRef.current = autoFollow;
  const paneRef = useRef(null);
  const tourRef = useRef(null);                          // the horizontal chip strip, for scrollLeft math

  // Build the ordered list of reading sections. Each: {key, label, body, anchor?}. Lenses first,
  // then the `deeper` chapters. Only sections with an anchor participate in scroll-follow / look.
  const sections = useMemo(() => {
    if (!inspect) return [];
    const out = [];
    // each section carries its own cross-reference list (see linkRefs at the top of the file);
    // a lens reads from the ENTRY keyed by lens name, a chapter from the stop object itself.
    for (const k of STUDY_LENS_ORDER) {
      if (inspect[k]) out.push({ key: "lens-" + k, label: STUDY_LENS_LABELS[k], body: inspect[k], refs: refsFor(inspect, k, "beside"), anchor: null });
    }
    (inspect.deeper || []).forEach((c, i) => {
      const anchor = (typeof c.x === "number" && typeof c.y === "number" && typeof c.w === "number" && typeof c.h === "number")
        ? { x: c.x, y: c.y, w: c.w, h: c.h } : null;
      out.push({ key: "deep-" + i, label: c.t, body: c.body, refs: refsFor(c, "body", "body"), anchor, chapter: true });
    });
    return out;
  }, [inspect]);
  const firstDeep = sections.findIndex(s => s.chapter);
  // FIX 6a (2026-07-17): the detail TOUR is sourced from the anchored deep chapters (inspect.deeper),
  // NOT from work.hires.details — so every studied work with anchored chapters gets a "walk the
  // details" tour, whether or not it also has a hires detail tour. Each tour stop carries the section
  // key so stepping can highlight + scroll the matching chapter in the pane.
  const tour = useMemo(() => sections.filter(s => s.chapter && s.anchor)
    .map(s => ({ key: s.key, t: s.label, anchor: s.anchor })), [sections]);

  // FIX 4 (2026-07-17): adjustable split (draggable divider) + collapse toggle. `split` is the
  // viewer's flex-basis as a 0..1 fraction of the row width, persisted in localStorage; `collapsed`
  // hides the prose pane entirely (viewer full-bleed, a floating restore button appears). The divider
  // is inert on the stacked mobile layout (a media query hides it; drag handlers no-op there).
  const SPLIT_MIN = 0.4, SPLIT_MAX = 0.72;              // viewer never below ~40%
  const [split, setSplit] = useState(() => {
    const v = parseFloat(localStorage.getItem("canvas-study-split"));
    return (isFinite(v) && v >= SPLIT_MIN && v <= SPLIT_MAX) ? v : 0.57;
  });
  const [collapsed, setCollapsed] = useState(false);
  const splitRef = useRef(null);                        // the flex row element, for width math
  const dragSplit = useRef(false);
  const onSplitDown = useCallback((e) => {
    if (!splitRef.current) return;
    dragSplit.current = true;
    e.preventDefault();
    // on the stacked mobile layout the row is a COLUMN, so the divider resizes the viewer's
    // HEIGHT (drag up/down) instead of its width (Fuad 2026-07-19).
    const move = (cx, cy) => {
      const el = splitRef.current, r = el.getBoundingClientRect();
      const vertical = getComputedStyle(el).flexDirection === "column";
      const f = vertical ? (r.height > 0 ? (cy - r.top) / r.height : null) : (r.width > 0 ? (cx - r.left) / r.width : null);
      if (f == null) return;
      setSplit(Math.max(SPLIT_MIN, Math.min(SPLIT_MAX, f)));
    };
    const mm = (ev) => { if (dragSplit.current) move(ev.clientX, ev.clientY); };
    const tm = (ev) => { if (dragSplit.current && ev.touches[0]) { move(ev.touches[0].clientX, ev.touches[0].clientY); ev.preventDefault(); } };
    const up = () => {
      dragSplit.current = false;
      // (persist happens in the [split] effect below — writing here captured the STALE
      // start-of-drag value in this closure, audit 2026-07-18)
      window.removeEventListener("pointermove", mm); window.removeEventListener("pointerup", up);
      window.removeEventListener("touchmove", tm); window.removeEventListener("touchend", up);
    };
    window.addEventListener("pointermove", mm); window.addEventListener("pointerup", up);
    window.addEventListener("touchmove", tm, { passive: false }); window.addEventListener("touchend", up);
  }, [split]);
  // persist whenever split settles (covers keyboard/programmatic changes too)
  useEffect(() => { try { localStorage.setItem("canvas-study-split", String(split)); } catch (e) {} }, [split]);

  const flyTo = useCallback((anchor, immediately) => {
    const viewer = viewerRef.current;
    if (!viewer || !anchor) return;
    flyToAnchor(viewer, anchor, immediately);
  }, []);
  const goHome = useCallback(() => {
    setActiveDetail(null);
    const viewer = viewerRef.current;
    if (viewer) { try { viewer.viewport.goHome(false); } catch (e) {} }
  }, []);
  // Step the tour to stop `idx` (into `tour`): fly the viewer to its anchor AND highlight + scroll
  // the matching chapter in the prose pane. The IntersectionObserver auto-follow is temporarily
  // ignored during a programmatic scroll so it doesn't fight the fly we just issued.
  const suppressFollow = useRef(false);
  const goToDetail = useCallback((idx) => {
    if (idx === null) { goHome(); return; }
    const stop = tour[idx]; if (!stop) return;
    setActiveDetail(idx);
    flyTo(stop.anchor, false);
    if (paneRef.current) {
      const el = paneRef.current.querySelector(`[data-skey="${stop.key}"]`);
      if (el) { suppressFollow.current = true; el.scrollIntoView({ behavior: "smooth", block: "start" }); setTimeout(() => { suppressFollow.current = false; }, 650); }
    }
  }, [tour, flyTo, goHome]);
  const stepTour = useCallback((dir) => {
    setActiveDetail(prev => {
      let next;
      if (dir > 0) next = prev === null ? 0 : Math.min(prev + 1, tour.length - 1);
      else { if (prev === null || prev === 0) { setTimeout(() => goToDetail(null), 0); return null; } next = prev - 1; }
      setTimeout(() => goToDetail(next), 0);
      return next;
    });
  }, [tour, goToDetail]);

  // ESC leaves study; ← → step the detail tour (when there is one).
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); history.back(); return; }
      if (!tour.length) return;
      if (e.key === "ArrowRight") { e.stopPropagation(); stepTour(1); }
      else if (e.key === "ArrowLeft") { e.stopPropagation(); stepTour(-1); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [tour, stepTour]);

  // Bad/unknown artwork id: leave study (done in an effect so render stays side-effect-free).
  useEffect(() => { if (!work) history.back(); }, [work]);

  // Scroll-follow: observe EVERY section's heading (lenses too). The most-visible heading drives
  // the tour UI — the chip strip, the "1 / N" arrows label and the chapter highlight all track the
  // reading position (Fuad 2026-07-24: "the ui elements would respond… scroll through 1 2 3
  // dynamically as well, not just zoom") — and, when auto-follow is on, also flies the viewer.
  // Scrolling back up into the lens sections clears the chip without touching the zoom.
  // Only (re)wired once the viewer is ready and sections exist.
  // POSITIONAL scroll-spy (rewritten 2026-08-13 — Fuad: the old one fired "as only barely
  // seeing the element", failed going upwards, and jumped stops). The IntersectionObserver it
  // replaced had three faults: (1) it observed HEADINGS, which are ~30px tall, so a 0.6 ratio
  // was satisfied by ~18px peeking past the bottom edge — hence the hair-trigger on the way
  // down; (2) an IO callback receives only the entries whose threshold JUST changed, not every
  // observed element, so "most visible among entries" compared an incomplete set — scrolling up
  // often delivered no entry at >=0.6 and the `if (!best) return` swallowed the update
  // entirely; (3) picking the highest ratio among whatever happened to fire let the active stop
  // jump non-adjacently. Measuring position against a line in the pane fixes all three: it is
  // symmetric up and down, always considers every section, and can only ever move to the
  // section you are actually reading.
  useEffect(() => {
    const pane = paneRef.current;
    if (!pane || !sections.length) return;
    const byKey = {};
    for (const s of sections) if (s.anchor) byKey[s.key] = s.anchor;
    const tourIdx = {};
    tour.forEach((t, i) => { tourIdx[t.key] = i; });

    let raf = 0, lastKey = null;
    const pick = () => {
      raf = 0;
      if (suppressFollow.current) return;
      const box = pane.getBoundingClientRect();
      // the trigger line sits at 40% of the pane height — a heading becomes "current" only once
      // it has travelled up to near the middle of the reading pane, not when it first appears.
      const line = box.top + box.height * 0.4;
      let key = null;
      for (const s of sections) {
        const el = pane.querySelector(`[data-skey="${s.key}"]`);
        if (!el) continue;
        // the LAST heading at or above the line is the section being read; if none has reached
        // it yet (top of the pane) fall back to the first section.
        if (el.getBoundingClientRect().top <= line) key = s.key; else break;
      }
      if (key === null) key = sections[0].key;
      // BOTTOM CLAMP (Fuad 2026-08-13): the final section's heading can never reach the 40%
      // line — there is not enough content beneath it to scroll that far — so the last stop
      // would otherwise be unreachable by scrolling. At the end of the pane, it IS the one
      // being read.
      if (pane.scrollTop + pane.clientHeight >= pane.scrollHeight - 24) key = sections[sections.length - 1].key;
      if (key === lastKey) return;
      lastKey = key;
      setActiveDetail(key in tourIdx ? tourIdx[key] : null);
      if (autoRef.current && ready && byKey[key]) flyTo(byKey[key], false);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(pick); };
    pane.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    pick();   // set the initial state without waiting for a scroll
    return () => {
      pane.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [ready, sections, tour, flyTo]);

  // Slide the active chip into view WITHIN the horizontal strip whenever activeDetail changes —
  // whether the scroll-spy set it or a tap did (Fuad 2026-07-25: the deep-read buttons highlight on
  // scroll but the strip never moved, so late chips stayed off-screen). scrollLeft math only, NOT
  // scrollIntoView (which would also scroll the pane / page ancestors and fight the prose scroll).
  useEffect(() => {
    const strip = tourRef.current; if (!strip || activeDetail === null) return;
    // chips index: [0] is the "⌂ full view" chip, so tour[i] lives at child i+1
    const chip = strip.children[activeDetail + 1]; if (!chip) return;
    const pad = 24;   // keep a little of the neighbour chip visible on either side
    const left = chip.offsetLeft - pad;
    const right = chip.offsetLeft + chip.offsetWidth + pad;
    let target = strip.scrollLeft;
    if (left < strip.scrollLeft) target = left;                                   // chip is off the left edge
    else if (right > strip.scrollLeft + strip.clientWidth) target = right - strip.clientWidth;  // off the right
    if (target !== strip.scrollLeft) strip.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [activeDetail]);

  if (!work) return null;
  const a = work.artistData || {};
  const life = a.born ? `${a.born}–${a.died || ""}` : null;

  const activeKey = activeDetail !== null && tour[activeDetail] ? tour[activeDetail].key : null;
  return (
    <div className={"cv-study" + (collapsed ? " cv-study-collapsed" : "")} ref={splitRef}>
      <div className="cv-study-viewer" style={{ flexBasis: collapsed ? "100%" : (split * 100) + "%" }}>
        <div className="cv-osd-view" ref={elRef} />
        <OSDControls viewerRef={viewerRef} />
        {err && <div className="cv-osd-err">zoom unavailable — the tile source didn't load
          {" · "}<a href={"#/work/" + id} style={{ color: "inherit", textDecoration: "underline" }}>open in reader →</a></div>}
        {/* FIX 6a: the detail tour over the viewer — prev/next arrows step through the anchored
            chapters (fly + highlight/scroll the chapter), plus a chip strip. Sourced from `tour`
            (inspect.deeper anchors), so it appears for every studied work with anchored chapters. */}
        {tour.length > 0 && (
          <React.Fragment>
            <div className="cv-study-tourarrows">
              <button className="cv-study-arrow" onClick={() => stepTour(-1)} disabled={activeDetail === null}
                title="Previous detail (←)" aria-label="Previous detail">‹</button>
              <span className="cv-study-arrow-lbl">{activeDetail === null ? "walk the details" : `${activeDetail + 1} / ${tour.length}`}</span>
              <button className="cv-study-arrow" onClick={() => stepTour(1)} disabled={activeDetail === tour.length - 1}
                title="Next detail (→)" aria-label="Next detail">›</button>
            </div>
            <div className="cv-osd-tour cv-study-tour" ref={tourRef}>
              <button className={"cv-osd-chip" + (activeDetail === null ? " cv-osd-chip-home" : "")}
                onClick={goHome} title="Return to full view">⌂ full view</button>
              {tour.map((d, i) => (
                <button key={d.key} className={"cv-osd-chip" + (activeDetail === i ? " cv-osd-chip-on" : "")}
                  onClick={() => goToDetail(i)} title={d.t}>
                  <span className="cv-osd-chip-n">{i + 1}</span>
                  <span className="cv-osd-chip-t">{d.t}</span>
                </button>
              ))}
            </div>
          </React.Fragment>
        )}
        {/* when the prose pane is collapsed, a small floating button brings it back */}
        {collapsed && (
          <button className="cv-study-restore" onClick={() => setCollapsed(false)} title="Show the study pane">☰ study</button>
        )}
        {/* exit study — always reachable from the viewer's top-right. The pane's own ✕ close is
            hidden when collapsed and below the fold on a phone, so this is the dependable way out
            (Fuad 2026-07-18). Hidden only on desktop-expanded where the pane ✕ is already visible. */}
        <button className="cv-study-exit" onClick={() => history.back()} title="Leave the study (Esc)" aria-label="Close study">✕</button>
      </div>
      {/* draggable divider (inert on the stacked mobile layout via CSS) */}
      {!collapsed && (
        <div className="cv-study-divider" onPointerDown={onSplitDown} onTouchStart={onSplitDown}
          role="separator" aria-orientation="vertical" title="Drag to resize">
          <span className="cv-study-divider-grip" />
        </div>
      )}
      {!collapsed && (
      <div className="cv-study-pane" ref={paneRef}>
        <div className="cv-study-panehead">
          <button className="cv-study-back" onClick={() => history.back()} title="Leave the study (Esc)">✕ close</button>
          <button className="cv-study-collapse" onClick={() => setCollapsed(true)} title="Hide the study pane (full-bleed viewer)">⤢ hide pane</button>
          <label className="cv-study-follow" title="Let the viewer follow your reading">
            <input type="checkbox" checked={autoFollow} onChange={e => setAutoFollow(e.target.checked)} />
            auto-follow
          </label>
        </div>
        <div className="cv-study-body">
          <h1 className="cv-study-title">{work.title.replace(/^TBC — /, "")}</h1>
          <div className="cv-study-meta">
            <b onClick={() => go("artist", work.artistId)} style={{ cursor: "pointer" }}>{work.artist.replace(/\s*\(.*\)$/, "")}</b>
            {life ? ` · ${life}` : ""}{work.year ? ` · ${work.year}` : ""}
          </div>
          {!inspect && <p className="cv-study-empty">No study written for this work yet.</p>}
          {sections.map((s, i) => (
            <React.Fragment key={s.key}>
              {s.chapter && i === firstDeep && (
                <div className="cv-study-chaprule"><span>The study</span></div>
              )}
              <section className={"cv-study-sec" + (s.chapter ? " cv-study-chapter" : "") + (s.key === activeKey ? " cv-study-sec-on" : "")}>
                <h2 className="cv-study-sec-h" data-skey={s.key}>
                  <span>{s.label}</span>
                  {s.anchor && (
                    <button className="cv-study-look" onClick={() => flyTo(s.anchor, false)}
                      title="Fly the viewer to this detail">⌖ look</button>
                  )}
                </h2>
                <p className="cv-study-sec-txt">{linkRefs(s.body, s.refs, id + " " + s.key)}</p>
              </section>
            </React.Fragment>
          ))}
          {/* beside = the outward closing paragraph. REQUIRED as of Fuad 2026-08-25 (it was optional per entry when piloted 2026-08-24). The guard is for entries written before the campaign, which have none yet — it is not a licence to omit one. */}
          {inspect && inspect.beside && (
            <React.Fragment>
              <div className="cv-study-chaprule"><span>beside</span></div>
              <p className="cv-study-sec-txt">{linkRefs(inspect.beside, refsFor(inspect, "beside", "beside"), id + " beside")}</p>
            </React.Fragment>
          )}
          <div className="cv-study-foot">
            <button className="cv-study-home" onClick={goHome}>⌂ full view</button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

function Reader({ id, go }) {
  const w = useMemo(() => { const x = WORKS.find(x => x.id === id); return x ? enrich(x) : null; }, [id]);
  const [zoom, setZoom] = useState(false);       // plain Zoom overlay (fallback when OSD fails)
  const [deep, setDeep] = useState(false);       // DeepZoom (OSD) overlay
  const [tier, setTier] = useState("about");
  const [inspOpen, setInspOpen] = useState(false);
  // close returns to the previous history entry (home or wall, depending where the card was clicked)
  const close = () => { history.back(); };
  useEffect(() => { setZoom(false); setDeep(false); setTier("about"); setInspOpen(false); }, [id]);
  useEffect(() => {
    const on = (e) => { if (e.key === "Escape" && !zoom && !deep) close(); };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [zoom, deep]);
  // movement labels for this work's artist (art_data.artists[].movementQids -> art_data.movements).
  // Declared ABOVE the early return: hooks must run on every render (the first attempt sat below
  // it, in the wrong component, and took the reader down entirely).
  const styleTags = useMemo(() => {
    const ad = (w && AD.artists && AD.artists[w.artistId]) || null;
    const qids = (ad && ad.movementQids) || [];
    const seen = new Set();
    return qids.map(q => AD.movements && AD.movements[q]).filter(l => l && !seen.has(l) && seen.add(l)).slice(0, 2);
  }, [w]);
  if (!w) return null;
  const a = w.artistData;
  const life = a.born ? `${a.born}–${a.died || ""}` : null;
  const pal = (window.CANVAS_PALETTE || {})[id];
  const read = (window.CANVAS_ART_ABOUT || {})[id];
  const inspect = (window.CANVAS_INSPECT || {})[id] || null;
  // FIX 6b: a deep-zoom detail tour is available if the work has hires details OR its study has at
  // least one anchored chapter (DeepZoom builds the tour from inspect.deeper in that case).
  const hasDetailTour = !!((w.hires && w.hires.details && w.hires.details.length) ||
    (inspect && (inspect.deeper || []).some(c => typeof c.x === "number" && typeof c.y === "number" && typeof c.w === "number" && typeof c.h === "number")));

  // Does this work have a usable OSD source? (IIIF, hires.img, or fallback imgZoom/img)
  const hasDeepZoom = !!resolveOSDSource(w);
  // Clicking the hero image opens DeepZoom when available; falls back to plain Zoom only if
  // OSD script failed to load (osdFailed flag) and we have a imgZoom/img to show.
  const openZoom = () => {
    if (hasDeepZoom && !osdFailed) { setDeep(true); return; }
    // OSD unavailable — fall back to plain overlay if we have a zoom-worthy URL
    const fallbackSrc = w.imgZoom || w.img;
    if (fallbackSrc) setZoom(true);
  };
  // Called by DeepZoom when the OSD script itself fails to load; switches to plain overlay.
  const handleOsdFail = () => {
    setDeep(false);
    const fallbackSrc = w.imgZoom || w.img;
    if (fallbackSrc) setZoom(true);
  };

  return (
    <React.Fragment>
      <div className="cv-reader-bg" onClick={close} />
      <div className="cv-reader">
        <button className="cv-r-close" onClick={close}>✕</button>
        {/* FIX 5 (2026-07-17): when this work has a study (CANVAS_INSPECT entry), the hero opens Study
            mode instead of the bare DeepZoom overlay; works without a study keep the plain zoom. */}
        {w.img && <img className="hero" src={w.img} alt={w.title}
          title={inspect ? "click to open the study" : "click to zoom"}
          style={{ cursor: inspect ? "pointer" : "zoom-in" }}
          role="button" tabIndex={0} aria-label={(inspect ? "open the study of " : "zoom into ") + w.title}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); (inspect ? () => go("study", w.id) : openZoom)(); } }}
          onClick={inspect ? () => go("study", w.id) : openZoom} />}
        <div className="cv-r-body">
          <h1 className="cv-r-title">{w.title.replace(/^TBC — /, "")}</h1>
          <div className="cv-r-meta"><b style={{ cursor: "pointer" }} title="artist page" onClick={() => go("artist", w.artistId)}>{w.artist.replace(/\s*\(.*\)$/, "")}</b>{life ? ` · ${life}` : ""}{w.year ? ` · ${w.year}` : ""}{a.desc ? ` · ${a.desc}` : ""}</div>
          <div className="cv-chips">
            <ConfChip conf={w.seenConfidence} />
            {/* STYLE TAGS (Fuad 2026-08-13). Sourced from the artist's movementQids resolved
                through art_data.movements — real data already in the overlay, not guessed per
                work.
                Clicking one FILTERS THE WALL by that movement (Fuad 2026-08-24: "clicking a
                style such as impressionism shouldn't take to the artist's page but filter by
                impressionism"). It used to open the artist page, which answered a question
                nobody asked of a style chip — the artist's name is right above it and already
                links there. This matches the identical chip on the artist page, which has
                always routed to the wall. */}
            {styleTags.map(t => (
              <span key={t} className="cv-chip cv-chip-style" title={`see every work on the wall in ${t}`}
                onClick={() => go("wall", movSlug(t))}>{t}</span>
            ))}
            {w.floored && <span className="cv-chip" data-k="floored">★ floored me</span>}
            {w.favorite && <span className="cv-chip" data-k="floored">★ favorite</span>}
            {w.liked && !w.floored && <span className="cv-chip" data-k="floored">♡ liked</span>}
            {w.wish && <span className="cv-chip">pilgrimage — not yet seen</span>}
            {w.via === "exhibition" && <span className="cv-chip">temporary exhibition</span>}
            {/* the full study is the flagship — promoted up here (Fuad: at the bottom it hides) */}
            {inspect && <button type="button" className="cv-chip cv-chip-study" onClick={() => go("study", w.id)}>Open the full study →</button>}
          </div>
          {read && (
            <div className="cv-r-read">
              <div className="cv-r-read-head">
                <span className="lbl">The read</span>
                <div className="cv-r-tiers">
                  <button data-on={tier === "about"} onClick={() => setTier("about")}>Info</button>
                  <button data-on={tier === "deep"} onClick={() => setTier("deep")}>Interpretation</button>
                </div>
              </div>
              {/* full long-form studies live in Study mode (#/study/<id>), not as a flat tier here */}
              <div className="cv-r-read-txt">{linkRefs(tier === "deep" ? read.deep : read.about,
                refsFor(read, tier, "about"), id + " read." + tier)}</div>
              <div className="cv-r-read-by">via {(tier === "deep" && read.deepBy) ? read.deepBy : (read.by || "Fable")}</div>
            </div>
          )}
          {/* WHERE I SAW IT + PALETTE SHARE A ROW (Fuad 2026-08-24: "Where I saw it line should
              live in the same row as the palette but as the first object"). Both are one-line
              facts about the object rather than reading, so they belong together and out of the
              way of the read above them. Palette leads, venue second (Fuad 2026-08-24). */}
          {(w.venues.length > 0 || pal) && (
            <div className="cv-r-metarow">
              {pal && (
                <div className="cv-r-sec"><span className="lbl">Palette</span>
                  <span className="cv-pal">{pal.map(c => <i key={c} style={{ background: c }} title={c} />)}</span>
                </div>
              )}
              {w.venues.length > 0 && (
                <div className="cv-r-sec"><span className="lbl">Where I saw it{w.venues.length > 1 ? " — an impression at each" : ""}</span>
                  {w.venues.map((v, vi) => (
                    <React.Fragment key={v.id}>
                      {vi > 0 ? " · " : ""}
                      <a className="cv-r-venue" href={"#/museum/" + v.id} onClick={(e) => { e.preventDefault(); go("museum", v.id); }}>{v.name.replace(/\s*\(.*\)$/, "")}, {v.city}</a>
                    </React.Fragment>
                  ))}
                  {w.exhibition ? ` — ${w.exhibition}` : ""}
                </div>
              )}
            </div>
          )}
          {w.note && <div className="cv-r-note">{w.note}</div>}
          {/* The four-lens inspection panel (see / about / craft / context) was removed
              2026-08-24: "let's remove the inspection - a close reading by (...) element as it
              already lives as part of the tours". It duplicated the study tour's own four
              sections verbatim. The study is still one click away — the "Open the full study"
              chip sits with the grade chips at the top of the reader, and deep zoom has its own
              entry in the links row below. */}
          <div className="cv-r-links">
            {hasDeepZoom && <button type="button" className="cv-r-deep" onClick={() => setDeep(true)}>⤢ Deep zoom</button>}
            {w.qid && <a href={`https://www.wikidata.org/wiki/${w.qid}`} target="_blank" rel="noopener noreferrer">Wikidata ↗</a>}
            {/* say what the file ACTUALLY is. "Full resolution" was a promise the data could not
                keep for 844 works — Commons returns the original when asked for a bigger width,
                so the link opened a 363px Monet under a label implying otherwise.
                Ultra-HQ (Fuad 2026-08-22): giga-scan works carry the untouched original in
                hires.orig — that gets its own explicit footer link (the viewers stay on the
                6000px plate; see the ULTRA-HQ policy note above FullRes history). */}
            {w.hires && w.hires.orig ? (
              <React.Fragment>
                <a href={w.hires.orig} target="_blank" rel="noopener noreferrer"
                  title={`The untouched original scan — ${w.hires.w}×${w.hires.h}px, a very large download; browsers display giant scans downsampled`}>
                  {`Ultra HQ ↗ ${w.hires.w}×${w.hires.h}`}
                </a>
                {/* ?download flips Wikimedia to Content-Disposition: attachment (verified
                    2026-08-22) — saves the file instead of rendering it downsampled in a tab */}
                <a href={w.hires.orig + "?download"} title="Save the original file instead of opening it">⭳ save</a>
              </React.Fragment>
            ) : w.hires && w.hires.iiif && w.hires.w ? (
              /* IIIF works (Fuad 2026-08-24: "list the resolution in-line with how we've
                 marked other artworks"). These carry no `orig` — the master lives behind the
                 tile server — so they fell through to the Commons branch and advertised
                 either nothing or the dimensions of a thumbnail-grade Commons file. The real
                 number is the holder's master, which art_hires already records; the link asks
                 the tile server for it at full size. `full`, when present, overrides that guess:
                 `full/full` is an IIIF 2 spelling and is INVALID on IIIF 3 (National Gallery
                 London, 2026-08-25), where the size keyword is `max`. */
              <React.Fragment>
                {/* `flat` = the MEASURED ceiling of a single flat render, where the holder's
                    server clamps it below the master (National Gallery London: maxWidth/maxHeight
                    800, enforced with a 200). Without this the link read "Ultra HQ ↗ 28641×23726"
                    and delivered an 800px jpeg — the master on that host exists only tile by tile,
                    which the Deep zoom button already offers. Records with no `flat` are unchanged. */}
                <a href={w.hires.full || w.hires.iiif.replace(/\/info\.json$/, "/full/full/0/default.jpg")}
                  target="_blank" rel="noopener noreferrer"
                  title={w.hires.flat
                    ? `The largest single file this holder will serve — ${w.hires.flat[0]}×${w.hires.flat[1]}px. Its server clamps every flat render; the ${w.hires.w}×${w.hires.h} master is reachable only tile by tile, in the deep zoom.`
                    : `The holder's master scan — ${w.hires.w}×${w.hires.h}px, a very large download; browsers display giant scans downsampled`}>
                  {w.hires.flat
                    ? `Museum render ↗ ${w.hires.flat[0]}×${w.hires.flat[1]}`
                    : `Ultra HQ ↗ ${w.hires.w}×${w.hires.h}`}
                </a>
                {!w.hires.flat &&
                  <a href={w.hires.img} title="A 3000px render, if the master is too large to open">⭳ 3000px</a>}
              </React.Fragment>
            ) : w.imgZoom && (
              <a href={w.imgZoom} target="_blank" rel="noopener noreferrer"
                title={w.px ? `Commons source is ${w.px[0]}×${w.px[1]}px` : undefined}>
                {w.px ? `Source image ↗ ${w.px[0]}×${w.px[1]}` : "Full resolution ↗"}
              </a>
            )}
            {/* cite the museum that serves the IIIF tiles (Fuad 2026-08-23). The zoom on
                these works is the holder's own scan, so the holder's object page is the
                citation — and the place to read the catalogue entry we deliberately keep
                out of the reads. hires.page is set at ingest and backfilled for older
                entries from the NGA opendata uuid→objectid map. */}
            {w.hires && w.hires.page && (
              <a href={w.hires.page} target="_blank" rel="noopener noreferrer"
                title="The holder's own catalogue entry — the source of this work's deep-zoom tiles">
                {HIRES_SOURCE_LABEL[w.hires.src] || "Museum page"} ↗
              </a>
            )}
            {a.qid && <a href={`https://www.wikidata.org/wiki/${a.qid}`} target="_blank" rel="noopener noreferrer">{w.artist.split(" ").pop()} on Wikidata ↗</a>}
          </div>
        </div>
      </div>
      {zoom && (w.imgZoom || w.img) && <Zoom src={w.imgZoom || w.img} onClose={() => setZoom(false)} />}
      {deep && <DeepZoom work={w} onClose={() => setDeep(false)} onOsdFail={handleOsdFail} />}
    </React.Fragment>
  );
}

// ——— Museums index (#/museums): a country-grouped card gallery of every venue walked.
// Sections order by total works met (desc). Within a country, venues split three ways:
//   met  — the owner met canon works here (cards ordered by met desc, floored as tiebreak)
//   quiet — no met works, but a read/highlights/deck give it a reason to exist (muted cards)
//   rest — neither; folded into a "…and N more venues" row.
// A card reads: facade thumb (CANVAS_MUSEUM_DATA.img) or a cv-text variant, name, city,
// met + ★ floored counts and a ✦ marker when a read exists.
// Whole card → #/museum/<id>. Fallback country name for codes outside COUNTRY.
function countryName(cc) {
  if (COUNTRY[cc]) return COUNTRY[cc];
  try { return new Intl.DisplayNames(["en"], { type: "region" }).of((cc || "").toUpperCase()) || (cc || "").toUpperCase(); }
  catch (e) { return (cc || "").toUpperCase(); }
}

function MuseumCard({ m, go, quiet }) {
  const DATA = (window.CANVAS_MUSEUM_DATA || {})[m.id] || null;
  const hasRead = !!(window.CANVAS_MUSEUM_ABOUT || {})[m.id];
  const img = DATA && DATA.img ? DATA.img : null;
  const name = m.name.replace(/\s*\(.*\)$/, "");
  return (
    <div className={"cv-musidx-card" + (img ? "" : " cv-musidx-text") + (quiet ? " cv-musidx-quiet" : "")}
      data-kind={m.kind} onClick={() => go("museum", m.id)} title={"open " + name}>
      {img
        ? <div className="cv-musidx-thumb"><LazyImg src={img} alt={name} /></div>
        : null}
      <div className="cv-musidx-body">
        <div className="cv-musidx-name">{name}{hasRead ? <span className="cv-musidx-read" title="has a read"> ✦</span> : null}</div>
        <div className="cv-musidx-city">{m.city}</div>
        <div className="cv-musidx-meta">
          {m.met ? <span className="cv-musidx-met">{m.met} met</span> : <span className="cv-musidx-met cv-musidx-none">no works met yet</span>}
          {m.floored ? <span className="cv-musidx-floored">★ {m.floored}</span> : null}
          {/* the DECK chip that used to sit here (linking to the per-museum #/deck/ route) is
              GONE (Fuad 2026-08-25: "we need the DECK buttons remove"). m.deck itself STAYS —
              Museums still uses it to decide whether a no-works-met venue is "quiet" rather
              than "rest". The per-museum deck route still resolves; it just has no affordance
              left anywhere, since "grade this museum's deck" in MuseumView is already gated
              off behind `false &&`. */}
        </div>
      </div>
    </div>
  );
}

function Museums({ go }) {
  const lazyGen = useLazyGen();   // HL is lazy now — deck presence feeds the quiet/rest split
  const HL = window.CANVAS_HIGHLIGHTS || {};
  const sections = useMemo(() => {
    // per-museum met/floored tallies from the enriched canon (seenAt → this venue).
    const met = {}, floored = {};
    for (const w of WORKS.map(enrich)) {
      for (const id of (Array.isArray(w.seenAt) ? w.seenAt : [w.seenAt])) {
        if (!id) continue;
        met[id] = (met[id] || 0) + 1;
        if (w.floored || w.favorite) floored[id] = (floored[id] || 0) + 1;
      }
    }
    const by = {};
    for (const m of MUSEUMS) {
      const row = { ...m, ...(AD.museums[m.id] || {}), met: met[m.id] || 0, floored: floored[m.id] || 0, deck: HL[m.id] || null };
      (by[m.country] = by[m.country] || []).push(row);
    }
    // section order: total works met desc, then museum count desc as tiebreak.
    return Object.entries(by).map(([cc, list]) => {
      const metWorks = list.reduce((s, m) => s + m.met, 0);
      // within a country: met venues first (met desc, floored tiebreak), then quiet (read/deck), then rest.
      const has = (m) => m.deck || (window.CANVAS_MUSEUM_ABOUT || {})[m.id] || (window.CANVAS_MUSEUM_DATA || {})[m.id];
      const withMet = list.filter(m => m.met > 0).sort((a, b) => b.met - a.met || b.floored - a.floored || a.name.localeCompare(b.name));
      const quiet = list.filter(m => m.met === 0 && has(m)).sort((a, b) => a.name.localeCompare(b.name));
      const rest = list.filter(m => m.met === 0 && !has(m)).sort((a, b) => a.name.localeCompare(b.name));
      return { cc, metWorks, count: list.length, withMet, quiet, rest };
    }).sort((a, b) => b.metWorks - a.metWorks || b.count - a.count);
  }, [lazyGen]);
  return (
    <div className="cv-musidx">
      {sections.map(sec => (
        <MuseumSection key={sec.cc} sec={sec} go={go} />
      ))}
    </div>
  );
}

function MuseumSection({ sec, go }) {
  // open by default — the icon-first version meant a click before you could type (Fuad
  // 2026-08-13: "should as default let you already write in there").
  const [open, setOpen] = useState(true);
  return (
    <section className="cv-musidx-sec">
      <header className="cv-musidx-head">
        <h2 className="cv-musidx-country">{countryName(sec.cc)}</h2>
        <p className="cv-musidx-tally">{sec.count} museum{sec.count === 1 ? "" : "s"}{sec.metWorks ? ` · ${sec.metWorks} works met` : ""}</p>
      </header>
      {(sec.withMet.length || sec.quiet.length) ? (
        <div className="cv-musidx-grid">
          {sec.withMet.map(m => <MuseumCard key={m.id} m={m} go={go} />)}
          {sec.quiet.map(m => <MuseumCard key={m.id} m={m} go={go} quiet />)}
        </div>
      ) : null}
      {sec.rest.length ? (
        open ? (
          <div className="cv-musidx-grid cv-musidx-rest">
            {sec.rest.map(m => <MuseumCard key={m.id} m={m} go={go} quiet />)}
          </div>
        ) : (
          <button className="cv-musidx-more" onClick={() => setOpen(true)}>
            …and {sec.rest.length} more venue{sec.rest.length === 1 ? "" : "s"}
          </button>
        )
      ) : null}
    </section>
  );
}

// ——— Museum pages (#/museum/<id>): the venue as a place you walked. Header (floored strip +
// stats + deck link) → optional museum read (CANVAS_MUSEUM_ABOUT overlay) → the encounters
// (canon works met here, permanent) → met-on-loan (via==="exhibition") → the artists → still in
// the building (highlights minus canon) → reasons to return (pilgrimage) → the colour of the
// place (aggregate palette). Works without the overlay/highlights render gracefully. Follows the
// StudyView/ArtistView patterns for structure; class prefix cv-mus-.
// normT/isMet mirror ArtistView so "still in the building" hides highlights already in the canon
// (qid match OR normalised-title match — series/prefix aware).
const museumNormT = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/\bwomen\b/g, "woman").replace(/\bmen\b/g, "man")
  .replace(/\b(series|study|no\s*\d+)\b/g, "").replace(/[^a-z0-9]+/g, " ").trim();
// approximate hex distance for palette dedup (sum of abs channel diffs, 0..765)
const hexRGB = (h) => { const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(h || ""); return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null; };
const hexClose = (a, b) => { const x = hexRGB(a), y = hexRGB(b); if (!x || !y) return false; return Math.abs(x[0] - y[0]) + Math.abs(x[1] - y[1]) + Math.abs(x[2] - y[2]) < 46; };

function MuseumView({ museumId, go }) {
  const m = MUS_BY_ID[museumId];
  const HL = window.CANVAS_HIGHLIGHTS || {};
  const PAL = window.CANVAS_PALETTE || {};
  const ABOUT = (window.CANVAS_MUSEUM_ABOUT || {})[museumId] || null;
  const DATA = (window.CANVAS_MUSEUM_DATA || {})[museumId] || null;
  const READS = window.CANVAS_ART_ABOUT || {};
  const INSPECT = window.CANVAS_INSPECT || {};
  const [tier, setTier] = useState("about");
  // the highlight currently being looked at in place (non-canon works only)
  const [peek, setPeek] = useState(null);
  // NO "+ deck" BUTTON HERE (Fuad 2026-08-25: "remove DECK buttons from the museum's page"). The
  // unmet-majors tiles below used to carry one, and the `queuedQids` / `queueMajor` state that
  // backed it lived on this line; both are gone. The affordance is NOT gone from the app — the
  // artist pages keep their copy (see ArtistView), which is where the By Your Artists deck is
  // actually fed from, and #/deck/by-artists still resolves. Don't reintroduce it here.

  // every canon work whose seenAt includes this museum, enriched. Split permanent vs on-loan.
  // (all hooks run unconditionally — the missing-museum guard sits AFTER them, below, so hook
  //  order stays stable per React's rules; met is empty for a bad id so the memos stay safe.)
  const met = useMemo(() => WORKS.map(enrich).filter(w =>
    (Array.isArray(w.seenAt) ? w.seenAt : [w.seenAt]).includes(museumId)), [museumId]);

  const hasRead = (w) => !!(READS[w.id] || INSPECT[w.id]);
  // ★ floored/favorite first, then liked, then the rest; images ahead of text within a tier.
  const hangSort = (a, b) => {
    const wa = (a.floored || a.favorite) ? 0 : a.liked ? 1 : 2, wb = (b.floored || b.favorite) ? 0 : b.liked ? 1 : 2;
    return wa - wb || (b.imgGrid ? 1 : 0) - (a.imgGrid ? 1 : 0);
  };
  const encounters = met.filter(w => w.via !== "exhibition").sort(hangSort);
  const onLoan = met.filter(w => w.via === "exhibition").sort(hangSort);
  const floored = met.filter(w => w.floored || w.favorite);
  const liked = met.filter(w => w.liked).length;

  // confidence breakdown for the stats title attr
  const conf = { sure: 0, probably: 0, unsure: 0 };
  for (const w of met) conf[w.seenConfidence === "sure" ? "sure" : w.seenConfidence === "probably" ? "probably" : "unsure"]++;

  // artists met here, by count (desc)
  const artistRows = useMemo(() => {
    const by = {};
    for (const w of met) { if (!w.artistId) continue; const r = by[w.artistId] = by[w.artistId] || { id: w.artistId, name: w.artist.replace(/\s*\(.*\)$/, ""), n: 0 }; r.n++; }
    return Object.values(by).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
  }, [met]);

  // still in the building: this museum's highlights minus the canon (by qid, then normalised title)
  const canonQids = new Set(met.map(w => w.qid).filter(Boolean));
  const canonT = met.map(w => museumNormT(w.title)).filter(Boolean);
  const isMet = (n) => {
    if (n.qid && canonQids.has(n.qid)) return true;
    const nt = museumNormT(n.title); if (nt.length < 4) return false;
    const series = /\bseries\b/i.test(n.title);
    return canonT.some(ct => ct === nt
      || (nt.length >= 5 && (ct.startsWith(nt + " ") || nt.startsWith(ct + " ")))
      || (series && (ct.includes(nt) || nt.includes(ct))));
  };
  const highlights = HL[museumId] || [];
  const unmet = useMemo(() => {
    const seen = new Set();
    return highlights.filter(n => { if (isMet(n) || (n.qid && seen.has(n.qid))) return false; if (n.qid) seen.add(n.qid); return true; });
  }, [museumId, met]);

  // reasons to return: pilgrimage/wish works held by this venue. Two sources:
  //  1. artworks.js wish:true canon rows whose seenAt (holder ref) points at this museum
  //  2. hand-authored CANVAS_PILGRIMAGE entries (place/work) — match by a holder/museum/venue ref
  //     if one exists, else by city+country. pilgrimage.js currently ships only a place entry with
  //     no venue ref, so nothing binds to a specific museum here; the city-match keeps it working.
  const wishWorks = met.filter(w => w.wish);

  // the colour of the place: union of met works' palettes, similar hexes deduped, cap 12
  const palette = useMemo(() => {
    const out = [];
    for (const w of met) { const p = PAL[w.id]; if (!p) continue; for (const hex of p) { if (out.length >= 12) break; if (!out.some(o => hexClose(o, hex))) out.push(hex); } }
    return out;
  }, [met]);

  // ——— all hooks are above this line; the missing-museum guard is safe here (stable per mount). ———
  if (!m) return <div className="cv-mus"><p>No museum here (yet).</p></div>;

  const pilgrimagePlaces = (window.CANVAS_PILGRIMAGE || []).filter(p =>
    p.museumId === museumId || p.holder === museumId || p.at === museumId ||
    (p.museumId == null && p.holder == null && p.at == null && p.city === m.city && p.country === m.country));

  const cityLine = `${m.city} · ${(COUNTRY[m.country] || m.country || "").toUpperCase()}`;

  // building facts + imagery (data-driven; every element renders only when its datum exists)
  const fmtVisitors = (n) => n >= 1e6 ? +(n / 1e6).toFixed(1) + "M" : n >= 1e3 ? +(n / 1e3).toFixed(0) + "K" : String(n);
  const fmtWorks = (n) => n.toLocaleString("en-US");
  const architectsLine = DATA && Array.isArray(DATA.architects) && DATA.architects.length ? DATA.architects.join(" · ") : null;
  const hasReadPane = !!(ABOUT && (ABOUT.about || ABOUT.deep));

  // DRAG-SCROLL for the highlights strip (Fuad 2026-08-13). Native listeners rather than React
  // synthetic handlers: the synthetic version did not produce a drag in practice. Pointer is
  // captured on DOWN so the gesture survives leaving the element, and a 4px threshold keeps a
  // plain click opening the work — a real drag swallows the trailing click.
  // ENCOUNTER FILTER (Fuad 2026-08-13): filter what was met here by how it landed. Mirrors the
  // Wall's own chip vocabulary so the two pages filter alike. "unmet" is NOT here — unmet majors
  // are a separate section further down, not part of the encounters grid.
  const [musFilt, setMusFilt] = useState("all");
  const MUS_FILTERS = [["all", "all"], ["floored", "★ floored"], ["loved", "♥ loved"],
                       ["sure", "seen — sure"], ["unsure", "unsure"], ["read", "✦ has a read"]];
  const applyMusFilt = (list) => {
    if (musFilt === "floored") return list.filter(w => w.floored || w.favorite);
    // the liked mark alone — same tier split as the Wall (Fuad 2026-08-20), so "loved" cannot mean
    // one thing on one page and a superset of it on another
    if (musFilt === "loved") return list.filter(w => w.liked);
    if (musFilt === "sure") return list.filter(w => w.seenConfidence === "sure");
    if (musFilt === "unsure") return list.filter(w => w.seenConfidence !== "sure");
    if (musFilt === "read") return list.filter(w => hasRead(w));
    return list;
  };

  const flooredRef = useRef(null);
  useEffect(() => {
    const el = flooredRef.current;
    if (!el) return;
    let down = false, moved = false, x0 = 0, left0 = 0;
    const onDown = (e) => {
      if (e.button !== 0) return;
      down = true; moved = false; x0 = e.clientX; left0 = el.scrollLeft;
      // pointer capture is deliberately NOT taken here — see onMove
    };
    const onMove = (e) => {
      if (!down) return;
      const dx = e.clientX - x0;
      if (!moved && Math.abs(dx) < 4) return;
      if (!moved) {
        // Capture only once a real drag begins (Fuad 2026-08-20: the works in this strip were not
        // clickable). Capturing on pointerdown retargets the following click to the CAPTURING
        // element, so every click landed on the container and the child button's onClick never ran.
        // The 4px threshold was doing its job and the capture was quietly eating the result.
        // Taking it here still keeps the gesture alive when the pointer leaves the strip, which is
        // all it was ever for, without standing between a plain click and its target.
        try { el.setPointerCapture(e.pointerId); } catch (err) {}
      }
      moved = true;
      e.preventDefault();
      el.scrollLeft = left0 - dx;
    };
    const onUp = (e) => {
      if (moved) { const kill = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
        el.addEventListener("click", kill, { capture: true, once: true }); }
      down = false;
      try { el.releasePointerCapture(e.pointerId); } catch (err) {}
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
  }, []);
  // date chip eligibility
  const eligible = (dateStr, country) => dateStr < "2024-06" || dateStr > "2025-12" || country === "au";
  const visitDate = (Array.isArray(m.visits) ? m.visits : []).find(d => /^\d{4}-\d{2}/.test(d)) || null;
  const visitMonthLabel = (dateStr) => {
    const dt = new Date(dateStr + (dateStr.length === 7 ? "-01" : ""));
    return isNaN(dt) ? null : dt.toLocaleString("en-US", { month: "short", year: "numeric" });
  };
  const showVisitChip = visitDate && eligible(visitDate, m.country) ? visitMonthLabel(visitDate) : null;

  // reusable card wall (uses the home Card so ✦ read markers + floored ★ + conf styling match).
  // Reveal-chunked (Fuad 2026-07-25): only the first ~30 cards mount up-front; the rest render as the
  // wall scrolls into view, so a 200-work venue no longer builds its whole masonry on first paint.
  const Wall = ({ works, lead }) => (
    <RevealChunks items={works} initial={30} step={30} render={(slice) => (
      <div className="cv-wall cv-mus-wall">
        {/* `lead` rides INSIDE the masonry as a column-span:all island, so the works flow around and
            beneath it rather than being pushed down by a separate block above it (Fuad 2026-08-20).
            Multi-column is what makes this possible — column-span is the one way to interrupt a
            column flow and have it resume underneath. */}
        {lead && <div className="cv-mus-lead">{lead}</div>}
        {slice.map(w => (
          <div className="cv-mus-cardwrap" key={w.id}>
            {hasRead(w) && <span className="cv-mus-read" title="has a read / study">✦</span>}
            <Card w={w} go={go} />
          </div>
        ))}
      </div>
    )} />
  );

  return (
    <div className="cv-museum">
      {/* 1. HEADER */}
      <div className="cv-mus-head" data-kind={m.kind}>
        <div className="cv-mus-head-main">
          <h1 className="cv-mus-h1">{m.name.replace(/\s*\(.*\)$/, "")}</h1>
          <div className="cv-mus-sub">{cityLine}</div>
          {DATA && (DATA.founded || architectsLine || DATA.style || DATA.visitors || DATA.site || showVisitChip) && (
            <div className="cv-mus-chips">
              {DATA.founded && <span className="cv-mus-chip">est. {DATA.founded}</span>}
              {architectsLine && <span className="cv-mus-chip">{architectsLine}</span>}
              {DATA.style && <span className="cv-mus-chip">{DATA.style}</span>}
              {DATA.visitors && <span className="cv-mus-chip">{fmtVisitors(DATA.visitors)} visitors/yr</span>}
              {showVisitChip && <span className="cv-mus-chip">visited · {showVisitChip}</span>}
              {DATA.site && <a className="cv-mus-chip cv-mus-chip-link" href={DATA.site} target="_blank" rel="noopener noreferrer">site ↗</a>}
            </div>
          )}
          {floored.length > 0 && (
            <div className="cv-mus-floored" ref={flooredRef}>
              {floored.filter(w => w.imgGrid).map(w => (
                <button className="cv-mus-floored-item" key={w.id} onClick={() => go("work", w.id)} title={w.title}>
                  <LazyImg src={w.imgGrid} alt={w.title} />
                </button>
              ))}
            </div>
          )}
          <div className="cv-mus-stats">
            {DATA && DATA.works
              ? <span title="your coverage of the collection">{met.length} work{met.length !== 1 ? "s" : ""} met · of ~{fmtWorks(DATA.works)}</span>
              : <span title={`sure ${conf.sure} · probably ${conf.probably} · unsure ${conf.unsure}`}>{met.length} work{met.length !== 1 ? "s" : ""} met</span>}
            {floored.length ? <span>★ {floored.length} floored</span> : null}
            {liked ? <span>♡ {liked} loved</span> : null}
            {unmet.length ? <span>{unmet.length} unmet major{unmet.length !== 1 ? "s" : ""}</span> : null}
            {/* "grade this museum's deck" HIDDEN "for now" (Fuad 2026-08-22) — the deck route
                itself stays live (recall grading still works via url); only the affordance is
                off. Flip `false` to bring it back. */}
            {false && highlights.length > 0 && <a className="cv-mus-gradebtn" href={"#/deck/" + museumId}>grade this museum's deck →</a>}
          </div>
        </div>
        {DATA && DATA.img && (
          <figure className="cv-mus-postcard">
            <img src={proxied(DATA.img)} data-orig={DATA.img} onError={unproxy} alt={m.name.replace(/\s*\(.*\)$/, "")} loading="lazy" />
            <figcaption>the building</figcaption>
          </figure>
        )}
      </div>

      {/* 2. MUSEUM READ (only when the overlay ships an entry) */}
      {hasReadPane && (
        <div className="cv-r-read cv-mus-read-pane">
          <div className="cv-r-read-head">
            <span className="lbl">The museum</span>
            {ABOUT.deep && (
              <div className="cv-r-tiers">
                <button data-on={tier === "about"} onClick={() => setTier("about")}>Info</button>
                <button data-on={tier === "deep"} onClick={() => setTier("deep")}>Interpretation</button>
              </div>
            )}
          </div>
          {/* the interior photo used to float right INSIDE this pane, squeezing the read to
              ~60% width. Folded out (Fuad 2026-08-13) — the description now takes the module's
              full width and the photo renders standalone below (2b), which also runs whether or
              not there is a read pane. */}
          {/* the museum read gets the same cross-reference treatment as an artwork read — same
              { about, deep, refs } shape, so a museum paragraph naming a work it holds links too */}
          <div className="cv-r-read-txt">{(() => { const t = (tier === "deep" && ABOUT.deep) ? "deep" : "about";
            return linkRefs(ABOUT[t], refsFor(ABOUT, t, "about"), museumId + " read." + t); })()}</div>
          <div className="cv-r-read-by">via {(tier === "deep" && ABOUT.deepBy) ? ABOUT.deepBy : (ABOUT.by || "Fable")}</div>
        </div>
      )}

      {/* 2b. INTERIOR STANDALONE (interior exists but no read pane to host it) */}
      {/* INTERIOR PHOTO DISABLED (Fuad 2026-08-13, explicit: "completely disable them for now").
          The data (DATA.interior) is untouched — re-enable by restoring this figure. */}

      {/* 3. THE ENCOUNTERS */}
      {encounters.length > 0 && (() => {
        const shown = applyMusFilt(encounters);
        return (
          <React.Fragment>
            {/* The heading and its filters are one centred island at the top of the wall now, rather
                than a heading, then a filter row, then the works (Fuad 2026-08-20, trying it out).
                Passed as `lead` so it lives inside the masonry and the works close around it. */}
            {shown.length ? (
              <Wall works={shown} lead={
                <React.Fragment>
                  <div className="cv-mus-lead-l">The encounters — what I met here</div>
                  <div className="cv-mus-filters">
                    {MUS_FILTERS.map(([k, label]) => (
                      <button key={k} className="cv-mus-filt" data-on={musFilt === k}
                        onClick={() => setMusFilt(k)}>{label}</button>
                    ))}
                    {musFilt !== "all" && <span className="cv-mus-filt-n">{shown.length} of {encounters.length}</span>}
                  </div>
                </React.Fragment>
              } />
            ) : (
              <React.Fragment>
                <div className="cv-a-secl">The encounters — what I met here</div>
                <div className="cv-mus-filters">
                  {MUS_FILTERS.map(([k, label]) => (
                    <button key={k} className="cv-mus-filt" data-on={musFilt === k}
                      onClick={() => setMusFilt(k)}>{label}</button>
                  ))}
                  <span className="cv-mus-filt-n">{shown.length} of {encounters.length}</span>
                </div>
                <p className="cv-mus-filt-none">Nothing here matches that.</p>
              </React.Fragment>
            )}
          </React.Fragment>
        );
      })()}

      {/* 4. MET ON LOAN HERE */}
      {onLoan.length > 0 && (
        <React.Fragment>
          <div className="cv-a-secl">Met on loan here — temporary exhibitions</div>
          <Wall works={onLoan} />
        </React.Fragment>
      )}

      {/* 5. THE ARTISTS */}
      {artistRows.length > 0 && (
        <React.Fragment>
          <div className="cv-a-secl">The artists</div>
          <div className="cv-mus-artists">
            {artistRows.map(r => (
              <button className="cv-mus-artchip" key={r.id} onClick={() => go("artist", r.id)}>{r.name}<i>×{r.n}</i></button>
            ))}
          </div>
        </React.Fragment>
      )}

      {/* 6. STILL IN THE BUILDING */}
      {unmet.length > 0 && (
        <React.Fragment>
          <div className="cv-a-secl">Still in the building — majors you haven't met</div>
          <RevealChunks items={unmet} initial={18} step={18} render={(slice) => (
            <div className="cv-a-unmet">
              {slice.map(n => {
                // A highlight can already BE a canon work — met at another venue, or a multi-venue
                // cast/impression — in which case sending you to Wikidata was throwing you off the
                // site to read about something the gallery already holds. Open the reader instead;
                // Wikidata stays the destination only for works genuinely not in the canon.
                const own = n.qid && WORK_BY_QID[n.qid];
                return (
                  <div className="cv-a-unmet-item" key={n.qid || n.title}>
                    {own
                      ? <a href={`#/work/${own.id}`} title={n.title}>
                          <LazyImg src={n.img} alt={n.title} />
                          <span>{n.title}{n.artist ? ` · ${n.artist}` : ""}{n.year ? ` · ${n.year}` : ""}</span>
                        </a>
                      : <a href="#" onClick={e => { e.preventDefault(); setPeek(n); }} title={`${n.title} — look closer`}>
                          <LazyImg src={n.img} alt={n.title} />
                          <span>{n.title}{n.artist ? ` · ${n.artist}` : ""}{n.year ? ` · ${n.year}` : ""}</span>
                        </a>}
                  </div>
                );
              })}
            </div>
          )} />
        </React.Fragment>
      )}

      {/* 7. REASONS TO RETURN */}
      {(wishWorks.length > 0 || pilgrimagePlaces.length > 0) && (
        <React.Fragment>
          <div className="cv-a-secl">Reasons to return — the pilgrimage</div>
          {wishWorks.length > 0 && (
            <div className="cv-wall cv-mus-wall">{wishWorks.map(w => <Card key={w.id} w={w} go={go} />)}</div>
          )}
          {pilgrimagePlaces.map(p => (
            <div className="cv-mus-row" key={p.id}>
              <span className="cv-mus-name">{p.title}</span>
              <span className="cv-mus-city">{p.city}</span>
              {p.note && <span className="cv-mus-note">{p.note}</span>}
            </div>
          ))}
        </React.Fragment>
      )}

      {/* 8. THE COLOUR OF THE PLACE */}
      {palette.length >= 4 && (
        <React.Fragment>
          <div className="cv-a-secl">The colour of the place</div>
          <div className="cv-mus-palette">{palette.map((c, i) => <i key={i} style={{ background: c }} title={c} />)}</div>
        </React.Fragment>
      )}
      <HighlightPeek item={peek} onClose={() => setPeek(null)} />
    </div>
  );
}

// ——— Phase 2: the recall deck — a core Canvas instrument. Two independent axes per card:
// SEEN (memory: didn't see / not sure / saw it — the tap that advances) and FEELING
// (♡ like / ♥ love — optional toggle, set before the seen-tap). Floored = saw it + ♥.
// "Didn't see it + ♥" is the most valuable answer of all: it builds the Pilgrimage list.
// Verdicts persist in localStorage as {seen, love}; the summary exports JSON for folding
// into artworks.js / pilgrimage.js. Old-format string verdicts are migrated on load.
// Decks > 40 cards are split into sequential parts of 40 (last part = remainder).
// Part routing: #/deck/<museumId>/2 — part 1 is the default (no suffix needed).
// Verdicts and the export are deck-wide (all parts share one storeKey); the part split
// is presentation-only slicing so already-graded items work exactly as before.
const DECK_PART_SIZE = 40;
const SEEN_OPTS = [["no", "didn't see it"], ["unsure", "not sure"], ["yes", "saw it"]];
const LOVE_OPTS = [[0, "○ nothing special"], [1, "♡ like it"], [2, "♥ love it"]];
const migrateVerdict = (v) => typeof v === "string"
  ? { seen: v === "floored" ? "yes" : v, love: v === "floored" ? 2 : 0 } : v;
function Deck({ museumId, part, go }) {
  const lazyGen = useLazyGen();   // HL is lazy now — the deck list itself depends on it
  const HL = window.CANVAS_HIGHLIGHTS || {};
  // the "by-artists" virtual deck: discovery works by artists you love, tied to no single venue
  const VIRTUAL = museumId === "by-artists";
  const mus = VIRTUAL ? { name: "Works by artists you love" } : MUS_BY_ID[museumId];
  const canonQids = useMemo(() => new Set(WORKS.map(w => (AD.artworks[w.id] || {}).qid).filter(Boolean)), []);
  // queued works added from artist pages (by-artists deck only). Read once at mount so grading
  // doesn't reshuffle the live deck; pruning happens in localStorage, reflected on next visit.
  const [queued] = useState(() => (museumId === "by-artists" ? readDeckQueue() : []));
  // full deck (all parts) — verdicts are stored here across parts. For the by-artists deck the
  // queued works (minus canon) come FIRST, then the shipped list, deduped by qid across both.
  const fullDeck = useMemo(() => {
    if (VIRTUAL) {
      const shipped = window.CANVAS_BY_ARTISTS || [];
      const seen = new Set();
      const merged = [];
      for (const w of [...queued, ...shipped]) {
        if (!w.qid || seen.has(w.qid) || canonQids.has(w.qid)) continue;
        seen.add(w.qid); merged.push(w);
      }
      return merged;
    }
    return (HL[museumId] || []).filter(w => !canonQids.has(w.qid));
  }, [museumId, queued, lazyGen]);
  const queuedCount = VIRTUAL ? fullDeck.filter(w => queued.some(q => q.qid === w.qid)).length : 0;
  // part splitting: 40-card pages (last page = remainder); part is 1-based
  const numParts = Math.max(1, Math.ceil(fullDeck.length / DECK_PART_SIZE));
  const safePart = Math.min(Math.max(part || 1, 1), numParts);
  const partStart = (safePart - 1) * DECK_PART_SIZE;
  const deck = fullDeck.slice(partStart, partStart + DECK_PART_SIZE);
  const partHref = (p) => "#/deck/" + museumId + (p > 1 ? "/" + p : "");

  const storeKey = "canvas-deck-" + museumId;
  const [verdicts, setVerdicts] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(storeKey)) || {};
      const out = {}; for (const q of Object.keys(raw)) out[q] = migrateVerdict(raw[q]);
      return out;
    } catch (e) { return {}; }
  });
  const firstOpen = deck.findIndex(w => !verdicts[w.qid]);
  const [i, setI] = useState(firstOpen < 0 ? deck.length : firstOpen);
  const [love, setLove] = useState(0);
  const [copied, setCopied] = useState(false);
  const [saveWarn, setSaveWarn] = useState(false);   // localStorage write failed (quota / private mode)
  // reset card index when part changes (key on Deck in App handles full remount, but guard here too)
  useEffect(() => {
    const fo = deck.findIndex(w => !verdicts[w.qid]);
    setI(fo < 0 ? deck.length : fo);
    setCopied(false);
  }, [safePart, museumId]);
  useEffect(() => {   // returning to an answered card (Backspace) restores its feeling
    const w = deck[i]; setLove(w && verdicts[w.qid] ? verdicts[w.qid].love : 0);
  }, [i]);

  const judge = (seenV) => {
    if (i >= deck.length) return;
    const gradedQid = deck[i].qid;
    const next = { ...verdicts, [gradedQid]: { seen: seenV, love } };
    setVerdicts(next);
    try { localStorage.setItem(storeKey, JSON.stringify(next)); setSaveWarn(false); }
    catch (e) { setSaveWarn(true); }   // quota/private-mode: grade shows but won't survive reload — say so
    // once a queued work is graded, prune it from the queue (harmless if it lingers, but tidy)
    if (VIRTUAL && isQueued(gradedQid)) writeDeckQueue(readDeckQueue().filter(w => w.qid !== gradedQid));
    setI(i + 1);
  };
  useEffect(() => {
    const on = (e) => {
      if (e.key >= "1" && e.key <= "3") judge(SEEN_OPTS[+e.key - 1][0]);
      if (e.key === "4") setLove(love === 1 ? 0 : 1);
      if (e.key === "5") setLove(love === 2 ? 0 : 2);
      if (e.key === "Backspace" && i > 0) setI(i - 1);
      if (e.key === "Escape") go("museums");
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [i, verdicts, love]);

  if (!mus || !fullDeck.length) return <div className="cv-mus"><p>No deck for this museum (yet).</p></div>;

  // Part nav strip (only shown when there are multiple parts)
  const partNav = numParts > 1 ? (
    <div className="cv-deck-parts">
      {Array.from({ length: numParts }, (_, pi) => {
        const pn = pi + 1;
        const pStart = pi * DECK_PART_SIZE;
        const pSlice = fullDeck.slice(pStart, pStart + DECK_PART_SIZE);
        const pCount = pSlice.length;
        return (
          <a key={pn} className={"cv-deck-part" + (pn === safePart ? " cv-deck-part-on" : "")}
            href={partHref(pn)}>Part {pn} <span className="cv-deck-part-n">·{pCount}</span></a>
        );
      })}
    </div>
  ) : null;

  if (i >= deck.length) {
    // summary is for ALL parts combined (full-deck verdicts)
    const rows = fullDeck.filter(w => verdicts[w.qid] && (verdicts[w.qid].seen !== "no" || verdicts[w.qid].love > 0))
      .map(w => ({ qid: w.qid, title: w.title, artist: w.artist, year: w.year, museum: VIRTUAL ? null : museumId, ...verdicts[w.qid] }));
    const seen = rows.filter(r => r.seen === "yes");
    const discoveries = rows.filter(r => r.seen !== "yes" && r.love > 0);
    const json = JSON.stringify(rows, null, 1);
    const nextPart = safePart < numParts ? safePart + 1 : null;
    return (
      <div className="cv-deck">
        {partNav}
        <div className="cv-deck-head">{VIRTUAL ? mus.name.replace(/\s*\(.*\)$/, "") : <a className="cv-deck-headlink" onClick={() => go("museum", museumId)}>{mus.name.replace(/\s*\(.*\)$/, "")}</a>} — Part {safePart} done{queuedCount > 0 ? <span className="cv-deck-queued"> · {queuedCount} from artist pages</span> : null}</div>
        <p className="cv-deck-sum">{seen.length} recognised across all parts ({seen.filter(r => r.love === 2).length} floored) · {rows.filter(r => r.seen === "unsure").length} unsure · {discoveries.length} discoveries you'd love to see.</p>
        {nextPart && (
          <a className="cv-deck-btn cv-deck-btn-next" href={partHref(nextPart)}>Continue to Part {nextPart} →</a>
        )}
        {seen.length > 0 && (
          <React.Fragment>
            <div className="cv-deck-secl">Seen</div>
            <ul className="cv-deck-picks">{seen.map(p => <li key={p.qid}>{p.love === 2 ? "★ " : p.love === 1 ? "♡ " : ""}{p.title}{p.artist ? " — " + p.artist : ""}</li>)}</ul>
          </React.Fragment>
        )}
        {discoveries.length > 0 && (
          <React.Fragment>
            <div className="cv-deck-secl">Discoveries → pilgrimage</div>
            <ul className="cv-deck-picks">{discoveries.map(p => <li key={p.qid}>{p.love === 2 ? "♥ " : "♡ "}{p.title}{p.artist ? " — " + p.artist : ""}</li>)}</ul>
          </React.Fragment>
        )}
        {rows.length > 0 && (
          <React.Fragment>
            <button className="cv-deck-btn" onClick={() => { navigator.clipboard.writeText(json).then(() => setCopied(true)); }}>
              {copied ? "copied ✓" : "copy picks as JSON"}</button>
            <textarea className="cv-deck-json" readOnly value={json} rows={6} />
          </React.Fragment>
        )}
        <button className="cv-deck-btn" onClick={() => { setI(0); setCopied(false); }}>re-deal this part</button>
        <a className="cv-deal" href="#/museums">← back to museums</a>
      </div>
    );
  }

  const w = deck[i];
  return (
    <div className="cv-deck">
      {partNav}
      <div className="cv-deck-head">{VIRTUAL ? mus.name.replace(/\s*\(.*\)$/, "") : <a className="cv-deck-headlink" onClick={() => go("museum", museumId)}>{mus.name.replace(/\s*\(.*\)$/, "")}</a>}{numParts > 1 ? " · Part " + safePart : ""} · did you see this?{queuedCount > 0 ? <span className="cv-deck-queued"> · {queuedCount} from artist pages</span> : null}</div>
      <div className="cv-deck-prog">{i + 1} / {deck.length} · 1–3 seen · 4 ♡ · 5 ♥{i > 0 ? " · Backspace = back" : ""}</div>
      <div className="cv-deck-card" key={w.qid}>{/* remount per card: stale image must not linger under the next label */}
        {w.img
          ? <img src={proxied(w.img)} data-orig={w.img} alt={w.title} loading="eager"
              onError={(e) => { const el = e.currentTarget; if (el.dataset.orig && el.src !== el.dataset.orig) el.src = el.dataset.orig; else el.style.display = "none"; }} />
          : <div className="cv-deck-noimg" style={{ padding: "60px 20px", color: "var(--ink-faint)", font: "400 14px/1.5 var(--serif)" }}>no image — judge from the title</div>}
        <div className="cv-deck-label">
          <div className="cv-title">{w.title}</div>
          <div className="cv-byline">{w.artist || "—"}{w.year ? " · " + w.year : ""}</div>
        </div>
      </div>
      <div className="cv-deck-love">
        {LOVE_OPTS.map(([v, label]) => (
          <button key={v} data-on={love === v} data-love={v} onClick={() => setLove(v)}>{label}</button>
        ))}
      </div>
      <div className="cv-deck-btns">
        {SEEN_OPTS.map(([v, label], k) => (
          <button key={v} data-v={v} onClick={() => judge(v)}><span className="key">{k + 1}</span>{label}</button>
        ))}
      </div>
      <div className="cv-deck-hint">{saveWarn
        ? "⚠ grades aren't being saved (storage unavailable — private mode?) — they'll be lost on reload"
        : "feeling first (optional), then the seen answer deals the next card — \"didn't see it\" + ♥ builds your pilgrimage list"}</div>
    </div>
  );
}

// ——— Phase 3: artist pages (charcoal-editorial per mockup 1c) + an artists index.
// Page = your history with them (canon works, floored/liked, venues) + their majors you
// haven't met (fame-ranked notable works minus the canon) — the artist-direction seeder.
function ArtistView({ artistId, go }) {
  const AD2 = AD.artists[artistId] || {};
  const works = useMemo(() => WORKS.map(enrich).filter(w => w.artistId === artistId), [artistId]);
  // queued-qids for the "+ deck" affordance: seeded from localStorage so an already-queued major
  // renders as "queued" immediately; adding one updates the set for instant feedback. Declared
  // before the early return below to keep the hook order stable (rules of hooks).
  const [queuedQids, setQueuedQids] = useState(() => new Set(readDeckQueue().map(w => w.qid)));
  // the highlight currently being looked at in place (non-canon works only)
  const [peek, setPeek] = useState(null);
  // canon wall page size (Fuad 2026-08-22: a hard 32 with an explicit button, not scroll-reveal).
  // The route keys this component by artist id, so a fresh artist resets to 32 by remount.
  const [wallN, setWallN] = useState(32);
  const queueMajor = (n) => { addToDeckQueue(n); setQueuedQids(prev => new Set(prev).add(n.qid)); };
  if (!works.length && !AD2.qid) return <div className="cv-mus"><p>No artist here (yet).</p></div>;
  const name = (works[0] && works[0].artist.replace(/\s*\(.*\)$/, "")) || AD2.label;
  // "Majors you haven't met" filters the notable list against the canon. Matching on qid alone
  // misses the common case where the canon holds a SPECIFIC painting (e.g. Haystacks, midday) but
  // the notable list carries the SERIES / generic qid (Haystacks). So also match by normalised
  // title: exact, prefix (canon specifies a base title), or series-stem containment. women→woman
  // so "Woman/Women in the Garden" unify. Kept strict enough that e.g. Irises ≠ Vase with Irises.
  const normT = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\bwomen\b/g, "woman").replace(/\bmen\b/g, "man")
    .replace(/\b(series|study|no\s*\d+)\b/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  const canonQids = new Set(works.map(w => w.qid).filter(Boolean));
  const canonT = works.map(w => normT(w.title)).filter(Boolean);
  const isMet = (n) => {
    if (canonQids.has(n.qid)) return true;
    const nt = normT(n.title); if (nt.length < 4) return false;
    const series = /\bseries\b/i.test(n.title);
    return canonT.some(ct => ct === nt
      || (nt.length >= 5 && (ct.startsWith(nt + " ") || nt.startsWith(ct + " ")))
      || (series && (ct.includes(nt) || nt.includes(ct))));
  };
  const unmet = (AD2.notable || []).filter(n => !isMet(n));
  // cleaned + deduped, and each one links onto the wall filtered to that style. Keyed off the id
  // rather than works[0] so an artist with nothing hung yet still shows their movements.
  const movements = movsOf({ artistId });
  const venues = [...new Set(works.flatMap(w => (Array.isArray(w.seenAt) ? w.seenAt : [w.seenAt || w.at]).filter(Boolean)))]
    .map(id => MUS_BY_ID[id]).filter(Boolean);
  const floored = works.filter(w => w.floored || w.favorite).length;
  const liked = works.filter(w => w.liked).length;
  return (
    <div className="cv-artist">
      {/* COMPRESSED to the museum header's grammar (Fuad 2026-08-19). It used to stack four
          blocks — dates, movements, stats — each with its own margin, so the header ran deep
          before a single work appeared. Now: title, ONE sub line, and a row of chips, with the
          portrait moved right and bottom-aligned like the museum postcard. Movements stay
          clickable, as chips rather than a prose run. */}
      <div className="cv-a-head">
        <div className="cv-a-head-main">
          <h1 className="cv-a-name">{name}</h1>
          <div className="cv-a-meta">{[
            AD2.born ? `${AD2.born}–${AD2.died || ""}` : "",
            AD2.desc ? AD2.desc.replace(/\s*\(\d{4}[–-]?\d{0,4}\)$/, "") : "",
          ].filter(Boolean).join(" · ")}</div>
          <div className="cv-a-chips">
            <span className="cv-a-chip">{works.length} in your canon</span>
            {floored > 0 && <span className="cv-a-chip">★ {floored} floored</span>}
            {liked > 0 && <span className="cv-a-chip">♡ {liked} liked</span>}
            {venues.length > 0 && <span className="cv-a-chip" title={venues.map(v => v.name).join(", ")}>
              met at {venues.length === 1 ? venues[0].name.replace(/\s*\(.*\)$/, "") : `${venues.length} museums`}</span>}
          </div>
          {/* the read sits INSIDE the header block, under the chips: it is context for the name
              above it, not a section of its own. Most artists have none and the header simply
              ends at the chips. */}
          {ARTIST_READ[artistId] && <p className="cv-a-read">{ARTIST_READ[artistId]}</p>}
          {/* MOVEMENTS LAST, BELOW THE READ (Fuad 2026-08-22). A first pass used CSS order to
              push them to the end of the chip row, which was not far enough — that row sits above
              the read, so they were still ahead of it. These are links OUT to the wall rather than
              facts about this artist, so they belong after everything that describes him. Their own
              row, because that is the only way to get below the read. */}
          {movements.length > 0 && (
            <div className="cv-a-chips cv-a-movrow">
              {movements.map(m => (
                <button key={m} className="cv-a-chip cv-a-chip-mov" onClick={() => go("wall", movSlug(m))}
                  title={`see every work on the wall by artists working in ${m}`}>{m}</button>
              ))}
            </div>
          )}
        </div>
        {AD2.image && <img className="cv-a-face" src={proxied(AD2.image)} data-orig={AD2.image} onError={unproxy} alt={name} />}
      </div>
      <div className="cv-a-secl">In your canon</div>
      <div className="cv-wall cv-a-wall">{works.slice(0, wallN).map(w => <Card key={w.id} w={w} go={go} />)}</div>
      {works.length > wallN && (
        <div className="cv-more">
          <button type="button" onClick={() => setWallN(n => n + 32)}>
            show 32 more · {works.length - wallN} to go
          </button>
        </div>
      )}
      {unmet.length > 0 && (
        <React.Fragment>
          <div className="cv-a-secl">Their majors you haven't met</div>
          {/* deliberately unpaginated (Fuad 2026-08-22): the unmet list IS the destination —
              cutting it short hides exactly what this section exists to surface */}
          {((slice) => (
            <div className="cv-a-unmet">
              {slice.map(n => {
                const q = queuedQids.has(n.qid);
                return (
                  <div className="cv-a-unmet-item" key={n.qid}>
                    {/* same rule as the museum page: open ours in the Reader, peek at the rest
                        in place rather than shipping the visitor off to Wikidata */}
                    {WORK_BY_QID[n.qid]
                      ? <a href={`#/work/${WORK_BY_QID[n.qid].id}`} title={n.title}>
                          <LazyImg src={n.img} alt={n.title} />
                          <span>{n.title}{n.year ? ` · ${n.year}` : ""}</span>
                        </a>
                      : <a href="#" onClick={e => { e.preventDefault(); setPeek(n); }} title={`${n.title} — look closer`}>
                          <LazyImg src={n.img} alt={n.title} />
                          <span>{n.title}{n.year ? ` · ${n.year}` : ""}</span>
                        </a>}
                    <button type="button" className="cv-a-unmet-add" data-q={q} disabled={q}
                      title={q ? "queued for the By Your Artists deck" : "add to the By Your Artists deck"}
                      onClick={() => queueMajor(n)}>{q ? "queued ✓" : "+ deck"}</button>
                  </div>
                );
              })}
            </div>
          ))(unmet)}
        </React.Fragment>
      )}
      {(AD2.similar || []).length > 0 && (
        <React.Fragment>
          <div className="cv-a-secl">Who's next — kin, teachers, students</div>
          <div className="cv-a-kin">
            {AD2.similar.slice(0, 8).map(s2 => {
              const inCanon = Object.entries(AD.artists).find(([k, v]) => v.qid === s2.qid);
              return inCanon
                ? <a key={s2.qid} className="cv-a-kin-chip" data-in="true" href={"#/artist/" + inCanon[0]}>{s2.label}<i>in your canon</i></a>
                : <a key={s2.qid} className="cv-a-kin-chip" href={"https://www.wikidata.org/wiki/" + s2.qid} target="_blank" rel="noopener noreferrer">{s2.label}{s2.desc ? <i>{s2.desc.slice(0, 40)}</i> : null}</a>;
            })}
          </div>
        </React.Fragment>
      )}
      {AD2.qid && <div className="cv-r-links" style={{ padding: "18px 0 0" }}>
        <a href={`https://www.wikidata.org/wiki/${AD2.qid}`} target="_blank" rel="noopener noreferrer">Wikidata ↗</a>
      </div>}
      <HighlightPeek item={peek} onClose={() => setPeek(null)} />
    </div>
  );
}

// deterministic hue from a string, for the fallback avatar when an artist has no web photo
const strHue = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; };
const initialsOf = (name) => name.split(/\s+/).map(s => s[0]).filter(c => /[A-Za-zÀ-ÿ]/.test(c || "")).slice(0, 2).join("").toUpperCase();

function Artists({ go }) {
  const rows = useMemo(() => {
    const by = {};
    for (const w of WORKS.map(enrich)) {
      if (!w.artistId) continue;
      const r = (by[w.artistId] = by[w.artistId] || { id: w.artistId, name: w.artist.replace(/\s*\(.*\)$/, ""), n: 0, fl: 0, lk: 0 });
      r.n++; if (w.floored || w.favorite) r.fl++; if (w.liked) r.lk++;
    }
    return Object.values(by).sort((a, b) => (b.fl * 3 + b.lk) - (a.fl * 3 + a.lk) || b.n - a.n);
  }, []);
  return (
    <div className="cv-artists">
      <p className="cv-deck-sum">{rows.length} artists in the canon, ranked by how hard they hit.</p>
      <div className="cv-artgrid">
        {rows.map(r => {
          const a = AD.artists[r.id] || {};
          const life = a.born ? `${a.born}–${a.died || ""}` : (a.desc ? a.desc.replace(/\s*\(\d{4}[–-]?\d{0,4}\)$/, "") : "");
          return (
            <button className="cv-artblob" key={r.id} onClick={() => go("artist", r.id)} title={r.name}>
              <span className="cv-artblob-face" data-empty={a.image ? "false" : "true"}
                style={a.image ? { backgroundImage: `url("${a.image}")` } : { background: `hsl(${strHue(r.id)} 34% 52%)` }}>
                {!a.image && <i>{initialsOf(r.name)}</i>}
                {r.fl > 0 && <b className="cv-artblob-star">★{r.fl}</b>}
              </span>
              <span className="cv-artblob-name">{r.name}</span>
              {life && <span className="cv-artblob-life">{life}</span>}
              <span className="cv-artblob-n">{r.n} work{r.n > 1 ? "s" : ""}{r.lk ? ` · ♡${r.lk}` : ""}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ——— Phase 4a: the painterly map (mockup 2b) — every museum pinned where it stands,
// sized by canon works; the trip strip below groups dated visits by year. Land geometry
// is rotation's simplified equirect world, copied (apps stay self-contained).
// CITY RADIUS IS LOGARITHMIC, CAPPED (Fuad 2026-08-22, fifth pass on map busy-ness). The old
// sqrt curve gave Paris (176 met works) a 12-unit world radius — rendered at half that is
// still 6 units, and Paris sits ~3.5 units from the Channel: the BUBBLE itself covered
// northern France, so its halo could only ever start "beyond the country". log2 compresses
// the giants (176 → ~5.1, 50 → ~4.1, 10 → ~3.0) while barely touching one-work towns, and
// the hard cap keeps every bubble smaller than a small country. ONE canonical helper — the
// halo seeding, dot eviction, branch and render all read it; keep them agreeing.
const cityRad = (n) => (n ? Math.min(5.2, 1.2 + Math.log2(1 + n) * 0.52) : 1.1);
// ——— WORLD-MAP LEADER LAYOUT (Fuad 2026-08-25, third report on this feature: "the lines are the
// same length around cities and overlapping with points over other lines" / "branching lines can
// vary in length and don't need to symmetrically go all around a city" / "worth taking a look at
// copying the pattern" from the city-entry view "how it branches off to institutions and artworks").
// The two previous attempts reasoned about the layout without measuring it and were wrong twice; the
// lesson (in .dtmp/map-leaders-v3) is that this is now MEASURED headlessly against the real data
// before it ships. What the numbers said about the layout this replaces, at the resting world view:
// TOKYO drew ten leaders at ONE length, and the median city drew a near-even 360-degree fan — the
// sunburst Fuad has now objected to three times.
//
// This ports the CITY-ENTRY pattern he likes (relaxFan seed + declutterLeaders, further down in
// MapView) to the world map, with GLOBAL collision avoidance instead of the city view's per-city one:
//   1. SEED each halo like the city view — a golden-angle spiral out of the bubble, biased toward
//      open space, relaxed dot-against-dot so siblings pack to ONE SIDE with distinct bearings, never
//      a full 360 ring. Each dot also carries a GRADUATED REST length (staggered by ordinal), so a
//      fan reads as varied lengths, EARNED BY ROOM: a halo alone on its coast fans out; one buried in
//      the dense European cluster keeps its leaders tight, because that is where reaching would
//      collide ("especially if they appear to end up colliding with surrounding branches").
//   2. DECLUTTER globally like the city view — every leader keeps its bearing unless it collides, and
//      length is the free variable, priced as deviation from that per-dot rest. A conflicted dot
//      reaches, shortens or re-angles to clear a dot / leader / bubble of ANY neighbour; NOTHING
//      prices angular evenness, so a city bunches to one side freely.
// Measured before -> after on the four overlaps Fuad named, resting frame (Z0=0.5): 74 -> 123, with
// distinct leader lengths 42 -> 401 (Tokyo 1 -> 10). The resting frame is the WORST case — at any
// deeper zoom the dots shrink in map units while geography holds, so at Z0=0.25 it is 85 -> 84. The
// residual clutter is the objectively dense Netherlands/Rhineland/N.France cluster (Cologne,
// Rotterdam, Amsterdam, Utrecht, Ede, Lille, Douai), where the cities sit a few map units apart and
// no length can keep every dot off every neighbour — that is geography, not a solver miss.
//
// Inputs are plain data (nothing global); .dtmp/map-leaders-v3/layout.js is a byte-parallel copy the
// harness runs, so the metrics above are of THIS code, not an approximation of it.
//   halos:   [{ list:[{w,venue}], x, y, r, city, far, cap }]  (r = bubble radius, world units)
//   bubbles: [{ x, y, r }] world units — every bubble a dot must clear (a dot MAY sit on its OWN)
//   opt:     { Z0, dotMul, rank }   (Z0 = zoom*dotZoom of the frame being solved)
// Returns nodes: [{ e, city, key, bx, by, rim, rad, ang, out, x, y, far }] — ang the solved bearing,
// out the solved length in RENDERED DOT RADII above the RENDERED rim (the currency the renderer draws
// in, so a leader rides the zoom with the dot it dodges).
function layoutWorldLeaders(halos, bubbles, opt) {
  const Z0 = opt.Z0, dotMul = opt.dotMul, rank = opt.rank;
  const dotR0 = 2.1 * Z0 * dotMul;             // a resting halo dot's rendered radius
  const HALF = 0.25;                            // half a leader's stroke
  // reach band in dot-radii above the rendered rim. MIN is the resting nub (dot touching its bubble);
  // REST is where an unconflicted dot parks so a quiet halo still visibly emerges; MAX bounds a dodge
  // and the neighbourhood search (raising it costs mount time quadratically).
  const MINOUT = 0.3, REST = 0.7, MAXOUT = 3.6, GA = 2.399963;
  const cityPts = halos.map(h => ({ x: h.x, y: h.y }));
  const nodes = [];
  for (const h of halos) {
    const list = [...h.list].sort((a, b) => rank(b.w) - rank(a.w)).slice(0, h.cap);
    if (!list.length) continue;
    const rimR = h.r * Z0 * dotMul;
    // seed bearing points at OPEN SPACE (away from the nearest neighbours) so a sparse halo leans
    // into empty map — the one-sided fan of the city view, not a spoke due east.
    let openAng = -Math.PI / 2;
    { let vx = 0, vy = 0;
      for (const o of cityPts) { const dx = h.x - o.x, dy = h.y - o.y, d2 = dx * dx + dy * dy;
        if (d2 < 0.01 || d2 > 40000) continue; vx += dx / d2; vy += dy / d2; }
      if (vx || vy) openAng = Math.atan2(vy, vx);
    }
    // ROOM MODULATES REACH. Variance is earned by free space: `room` is 1 in the open and eases hard
    // toward 0 as near neighbours pile up (the dense European mass runs crowd 4-8). It scales both the
    // base reach and the per-ordinal spread, so a crowded halo rests near the rim and an open one fans.
    let crowd = 0;
    for (const o of cityPts) { const d = Math.hypot(h.x - o.x, h.y - o.y); if (d > 0.01 && d < 12) crowd += (12 - d) / 12; }
    const room = 1 / (1 + 1.7 * crowd);
    const baseOut = MINOUT + room * (REST - MINOUT);
    // SEED on a tight golden-angle spiral just off the rim, relaxed in 2D against one another exactly
    // as relaxFan does, so every sibling gets a DISTINCT BEARING — the descent then spends length, and
    // never pulls two siblings out along one radial. Only the bearing is read back; the length is set
    // to the graduated rest. Angle from the seed, length from the descent, cleanly separated.
    const pts = list.map((e, i) => {
      const a = openAng + i * GA, r = rimR + dotR0 * (MINOUT + 0.32 * Math.sqrt(i));
      return { e, i, x: h.x + Math.cos(a) * r, y: h.y + Math.sin(a) * r,
               rad: (rank(e.w) === 2 ? 2.1 : 1.7) * Z0 * dotMul };
    });
    const floorR = rimR + dotR0 * MINOUT;
    const clearB = (p) => { let ex = p.x - h.x, ey = p.y - h.y, e = Math.hypot(ex, ey) || 0.001; if (e < floorR + p.rad) { p.x = h.x + ex / e * (floorR + p.rad); p.y = h.y + ey / e * (floorR + p.rad); } };
    for (let pass = 0; pass < 16; pass++) {
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i], b = pts[j], min = a.rad + b.rad + 0.35 * dotR0;
        let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
        if (d >= min) continue; if (d < 0.001) { dx = Math.cos(i) * 0.5; dy = Math.sin(i) * 0.5; d = Math.hypot(dx, dy); }
        const push = (min - d) / d / 2; a.x -= dx * push; a.y -= dy * push; b.x += dx * push; b.y += dy * push;
      }
      for (const p of pts) clearB(p);
    }
    for (const p of pts) clearB(p);
    // FOURTEENTH PASS (Fuad 2026-08-26: "vary the branches' length distance more, they don't
    // all have to be that long"). The graduated rest gave siblings NEAR-EQUAL reach at low
    // ordinals — visible sameness. Each dot now owns a stable factor (hashed off its venue,
    // so it never re-rolls between mounts) spanning 35%–100% of its earned reach: some dots
    // hug the rim as nubs, some fan to the old rest, and the ordinal graduation survives
    // inside the factor. Floor stays MINOUT; the descent still spends length only to dodge.
    const h01 = (s) => { let x = 7; for (let ci = 0; ci < s.length; ci++) x = (x * 31 + s.charCodeAt(ci)) >>> 0; return (x % 1000) / 1000; };
    for (const p of pts) {
      const vary = 0.35 + 0.65 * h01(String((p.e && p.e.venue) || p.i));
      const restOut = Math.min(MAXOUT, MINOUT + (baseOut - MINOUT + room * 0.45 * Math.sqrt(p.i)) * vary);
      const dx = p.x - h.x, dy = p.y - h.y;
      const seedOut = Math.max(MINOUT, Math.min(restOut, (Math.hypot(dx, dy) - rimR) / dotR0));
      nodes.push({ e: p.e, city: h.city, key: h.x + "|" + h.y, bx: h.x, by: h.y, rim: rimR,
                   rad: p.rad, ang: Math.atan2(dy, dx), out: seedOut, restOut, far: h.far, x: 0, y: 0 });
    }
  }
  const place = (n) => { const r = n.rim + dotR0 * n.out; n.x = n.bx + Math.cos(n.ang) * r; n.y = n.by + Math.sin(n.ang) * r; };
  for (const n of nodes) place(n);
  const segD = (px, py, ax, ay, bx, by) => {
    const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
    let t = L ? ((px - ax) * dx + (py - ay) * dy) / L : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
    const ex = px - (ax + t * dx), ey = py - (ay + t * dy); return Math.sqrt(ex * ex + ey * ey);
  };
  const side = (ax, ay, bx, by, cx, cy) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const crosses = (ax, ay, bx, by, cx, cy, dx, dy) =>
    ((side(cx, cy, dx, dy, ax, ay) > 0) !== (side(cx, cy, dx, dy, bx, by) > 0)) &&
    ((side(ax, ay, bx, by, cx, cy) > 0) !== (side(ax, ay, bx, by, dx, dy) > 0));
  // per-dot candidate neighbourhood: two dots further apart than the sum of their max reaches can
  // never interact. A dot's OWN siblings ARE candidates — a free bearing lets two of one city meet,
  // and a sibling's leader is what a shortened dot most often lands on.
  const bubR = bubbles.map(b => ({ x: b.x, y: b.y, r: b.r * Z0 * dotMul }));
  const maxReachOf = (n) => n.rim + dotR0 * MAXOUT + n.rad;
  const cand = nodes.map(() => []);
  const bubCand = nodes.map(() => []);
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i], ra = maxReachOf(a);
    for (let j = 0; j < nodes.length; j++) {
      if (j === i) continue; const b = nodes[j];
      if (Math.hypot(a.bx - b.bx, a.by - b.by) < ra + maxReachOf(b)) cand[i].push(j);
    }
    for (const b of bubR) {
      if (Math.abs(b.x - a.bx) < 1e-6 && Math.abs(b.y - a.by) < 1e-6) continue;   // own bubble is allowed
      if (Math.hypot(a.bx - b.x, a.by - b.y) < ra + b.r) bubCand[i].push(b);
    }
  }
  // WHAT A CANDIDATE COSTS. Collisions are weighted an order above the length price, so clearing an
  // overlap is always worth a longer or re-angled leader (the request in as many words). A dot on a
  // foreign LEADER is charged hardest and in both directions — the smear Fuad named; a dot on a DOT
  // next, it kills a click target. Every term is a flat charge PLUS overlap depth, so the solver has a
  // slope to walk, not a cliff. The length price alone decides between two equally-clear positions and
  // there pulls the dot to its graduated rest (pulling IN priced harder than reaching OUT, so a
  // trapped dot tucks under a neighbour's leader rather than spears past it). No term prices evenness.
  // GRAZE (Fuad 2026-08-25: "shorten lines that are about to overlap other lines"). A leader that does
  // not overlap but passes within GRAZE of a neighbour's leader or dot is charged too, so a near-miss
  // is a cost the solve will pay a shorter leader to avoid — not just a true crossing. The charge
  // ramps from 0 at GRAZE clearance up to W_GRAZE at zero clearance, so it hands off smoothly to the
  // overlap terms and never double-counts (it fires only in the gap OUTSIDE the overlap threshold).
  const W_LINE = 40, W_DOT = 24, W_CROSS = 22, W_BUB = 24, W_GRAZE = 10, LEN = 1.1, REACH = 0.55;
  const GRAZE = 0.9 * dotR0;                 // clearance under which a near-miss is charged
  const graze = (clear) => clear < GRAZE ? W_GRAZE * (1 - clear / GRAZE) : 0;
  const costParts = (ni, x, y, out) => {
    const n = nodes[ni];
    const dOut = out - n.restOut;
    const lenC = dOut >= 0 ? REACH * dOut : LEN * (-dOut);
    let col = 0; const t1 = n.rad + HALF;
    for (const j of cand[ni]) {
      const o = nodes[j];
      const dx = x - o.x, dy = y - o.y, rr = n.rad + o.rad, dd = Math.sqrt(dx * dx + dy * dy);
      if (dd < rr) col += W_DOT * (1 + (rr - dd) / dotR0); else col += graze(dd - rr);
      const dOnO = segD(x, y, o.bx, o.by, o.x, o.y);
      if (dOnO < t1) col += W_LINE * (1 + (t1 - dOnO) / dotR0); else col += graze(dOnO - t1);
      const t2 = o.rad + HALF, oOnMe = segD(o.x, o.y, n.bx, n.by, x, y);
      if (oOnMe < t2) col += W_LINE * (1 + (t2 - oOnMe) / dotR0); else col += graze(oOnMe - t2);
      if (o.key !== n.key && crosses(n.bx, n.by, x, y, o.bx, o.by, o.x, o.y)) col += W_CROSS;
    }
    for (const b of bubCand[ni]) {
      const dx = x - b.x, dy = y - b.y, rr = b.r + n.rad, dd = Math.sqrt(dx * dx + dy * dy);
      if (dd < rr) col += W_BUB * (1 + (rr - dd) / dotR0); else col += graze(dd - rr);
    }
    return [col, lenC];
  };
  const costAt = (ni, x, y, out) => { const p = costParts(ni, x, y, out); return p[0] + p[1]; };
  // COORDINATE DESCENT on (length, bearing). Length is the primary lever (the city-view move); the
  // bearing opens up only for a dot that actually COLLIDES, so an off-rest but clear dot keeps the
  // one-sided bearing the seed handed it. Length offsets are RELATIVE to this dot's rest. Moving one
  // dot changes only the pairs its own cost sums, so the solve is monotone and can never return worse
  // than the seed. A DIRTY SET keeps the tail passes to a few dozen dots, not a full re-sweep.
  const DOUT = [0, -0.25, 0.25, -0.4, 0.4, -0.7, 0.7, -1.1, 1.1, -1.6, 1.6, 2.2, 2.9];
  // SHORTEN-FIRST clearing ladder (Fuad 2026-08-25: shortening should be "the first move tried" for
  // a leader about to overlap). Pure shortenings, shallowest first, tried BEFORE the mixed line
  // search — so a conflicted or grazing dot clears by pulling in when it can, and only reaches out
  // or re-angles when no shortening clears. It stops at the first offset that drops the collision to
  // zero, which is the SHORTEST clearing length by construction (the ladder deepens monotonically).
  const SHORT = [-0.2, -0.35, -0.55, -0.8, -1.1, -1.5, -2.0, -2.6];
  const JA = [0, 0.06, -0.06], JO = [0.25, -0.25, 0.6, -0.6];
  const SWEEP = 32;
  const clampO = (o) => o < MINOUT ? MINOUT : o > MAXOUT ? MAXOUT : o;
  let dirty = nodes.map(() => true);
  for (let pass = 0; pass < 9; pass++) {
    const moved = [];
    for (let ni = 0; ni < nodes.length; ni++) {
      if (!dirty[ni]) continue;
      const n = nodes[ni], a0 = n.ang, o0 = n.out;
      const cp = costParts(ni, n.x, n.y, n.out);
      let bA = n.ang, bO = n.out, bC = cp[0] + cp[1];
      const seedCol = cp[0];
      const tryAt = (a, o) => { o = clampO(o); const r = n.rim + dotR0 * o;
        const c = costAt(ni, n.bx + Math.cos(a) * r, n.by + Math.sin(a) * r, o);
        if (c < bC - 1e-9) { bC = c; bA = a; bO = o; } };
      // SHORTEN FIRST: if the incumbent collides or grazes, walk the shorten ladder and take the
      // first length that clears it (collision to ~0) at the same bearing. Preferring the shortest
      // clearing length over lengthening or re-angling is exactly the city-view's opportunistic
      // shortening — so when it succeeds we COMMIT to it and skip the reach line search + bearing
      // sweep below, which (pricing a reach cheaper than a pull-in) would otherwise trade the short
      // clearing leader for a longer one. If no shortening clears, the general search still runs.
      let cleared = false;
      if (seedCol > 1e-9) {
        for (const d of SHORT) {
          const o = clampO(n.restOut + d), r = n.rim + dotR0 * o;
          const cx = n.bx + Math.cos(n.ang) * r, cy = n.by + Math.sin(n.ang) * r;
          const cp2 = costParts(ni, cx, cy, o);
          if (cp2[0] < 1e-9) { const c = cp2[0] + cp2[1]; if (c < bC - 1e-9) { bC = c; bA = n.ang; bO = o; cleared = true; } break; }
        }
        n.ang = bA; n.out = bO; place(n);
      }
      if (!cleared) for (const d of DOUT) tryAt(n.ang, n.restOut + d);   // length line-search, about rest
      n.ang = bA; n.out = bO; place(n);
      if (seedCol > 1e-9 && !cleared) {
        // a conflicted dot gets the full RING SWEEP on the first two passes — that is where a boxed-in
        // dot escapes to the open side, a move a small nudge cannot make, and the wedge it needs often
        // only appears once its neighbours (still moving on pass 0) have settled on pass 1. Later
        // passes only refine; the dirty set keeps the second sweep cheap.
        if (pass < 2) for (let s = 1; s < SWEEP; s++) for (const d of DOUT)
          tryAt(n.ang + s / SWEEP * Math.PI * 2, n.restOut + d);
        else for (const j of JA) tryAt(n.ang + j, n.out);
        n.ang = bA; n.out = bO; place(n);
        for (const d of DOUT) tryAt(n.ang, n.restOut + d);
        n.ang = bA; n.out = bO; place(n);
        for (const j of JA) for (const f of JO) tryAt(n.ang + j, n.out + f);
        n.ang = bA; n.out = bO; place(n);
      }
      if (n.ang !== a0 || n.out !== o0) moved.push(ni);
    }
    if (!moved.length) break;
    const nd = nodes.map(() => false);
    for (const ni of moved) { nd[ni] = true; for (const j of cand[ni]) nd[j] = true; }
    dirty = nd;
  }
  return nodes;
}
function MapView({ go }) {
  const world = window.CANVAS_WORLD || null;
  // pilgrimage disclosure state: which cities are open, plus the two folded tails
  const [openCountry, setOpenCountry] = useState(() => new Set());
  const [openCity, setOpenCity] = useState(() => new Set());
  const [showUnplaced, setShowUnplaced] = useState(false);
  const toggleCity = (k) => setOpenCity(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const toggleCountry = (k) => setOpenCountry(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });
  // FIX 6 (Fuad 2026-07-25): on a phone the dots are tiny and the labels illegible, so make the
  // dots bigger — a VISUAL/hit-area multiplier applied to the rendered radii only (positions are
  // already collision-relaxed in map units, so we don't touch the layout, just paint fatter dots).
  const [dotMul] = useState(() => (typeof window !== "undefined" && window.matchMedia
    && window.matchMedia("(max-width: 620px)").matches) ? 1.7 : 1);
  const P = (lat, lng) => [(lng + 180) / 360 * 1000, (90 - lat) / 180 * 500];
  const coordOf = (id) => { const d = AD.museums[id] || {}; return d.lat == null ? null : P(d.lat, d.lng); };
  const landPath = useMemo(() => (world && world.land ? world.land.join(" ") : ""), []);
  // ONE bubble per CITY at its true location (Fuad 2026-07-14). Per-museum pins overlapped badly,
  // and any anti-overlap relaxation that separated a city's 5–6 museums dragged them off the real
  // city (capitals "didn't match"). A city sits exactly where it is (cities are far apart → no
  // overlap) and BRANCHES to its museums → loved/liked works on click. Works are aggregated so the
  // bubble is sized by the whole city's canon, and each city keeps its museum list for the branch.
  const cities = useMemo(() => {
    const counts = {};
    for (const w of WORKS) for (const id of (Array.isArray(w.seenAt) ? w.seenAt : [w.seenAt || w.at])) if (id) counts[id] = (counts[id] || 0) + 1;
    const byCity = {};
    for (const m of MUSEUMS) {
      const d = AD.museums[m.id] || {}; if (d.lat == null) continue;
      const [x, y] = P(d.lat, d.lng);
      const c = (byCity[m.city] = byCity[m.city] || { city: m.city, xs: 0, ys: 0, k: 0, wxs: 0, wys: 0, wk: 0, n: 0, museums: [] });
      const n = counts[m.id] || 0; c.xs += x; c.ys += y; c.k++; c.n += n;
      // works-weighted accumulator: the anchor is pulled toward the museums that actually
      // hold the canon (min weight 1 so coordinate-only venues still register), so the bubble
      // sits on the loved-works mass rather than a plain geometric mean of every pin.
      const wt = n + 1; c.wxs += x * wt; c.wys += y * wt; c.wk += wt;
      c.museums.push({ id: m.id, name: m.name.replace(/\s*\(.*\)$/, ""), x, y, n });
    }
    // x/y = the single TRUE anchor (works-weighted centroid). The default bubble, the branch
    // root, the viewBox framing AND the museum fan all read this one point → every layer
    // diverges from exactly the same place (root cause of the old "emanates elsewhere" drift:
    // the bubble used the plain mean while relaxation then nudged it, so the branch fanned from
    // a spot the eye never saw). We keep ax/ay = this anchor and never let relaxation move it.
    const arr = Object.values(byCity).map(c => ({ ...c, x: c.wxs / c.wk, y: c.wys / c.wk }));
    // light relaxation only — cities rarely collide; radii are small and drift is hard-clamped to
    // 5 units so a city can never leave its spot even where two are close (e.g. European neighbours).
    for (const c of arr) { c.ox = c.x; c.oy = c.y; }
    const rOf = c => cityRad(c.n);
    for (let it = 0; it < 30; it++) {
      let moved = false;
      for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) {
        const a = arr[i], b = arr[j], min = rOf(a) + rOf(b) + 0.6;
        let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
        if (d >= min) continue; if (d < 0.01) { dx = 0.5; dy = 0.3; d = Math.hypot(dx, dy); }
        const push = (min - d) / d / 2; a.x -= dx * push; a.y -= dy * push; b.x += dx * push; b.y += dy * push; moved = true;
      }
      for (const c of arr) { c.x += (c.ox - c.x) * 0.3; c.y += (c.oy - c.y) * 0.3; const ex = c.x - c.ox, ey = c.y - c.oy, e = Math.hypot(ex, ey); if (e > 5) { c.x = c.ox + ex / e * 5; c.y = c.oy + ey / e * 5; } }
      if (!moved) break;
    }
    const map = {}; for (const c of arr) map[c.city] = c;
    return { list: arr, byCity: map };
  }, []);
  // pilgrimage layer: wish ("to see") works you're still chasing. FIX 2 (2026-07-17): these pink ♥
  // dots used to fan from the holding MUSEUM's raw coordinate (coordOf(mid)) with a plain golden-angle
  // spiral and NO collision pass — so a) they emanated from a point that is NOT the city bubble (the
  // bubble sits on the works-weighted city anchor, offset from any single museum), and b) at a shared
  // venue several ♥ seeds landed on top of each other. Now each city's wishes fan out of that SAME
  // city-bubble anchor and run through a relaxation pass identical in spirit to relaxFan, so the ♥
  // dots share the city bubble's parent and never overlap. (Only shown in the all-cities view; during
  // focus the museum work-fans take over.)
  const { wishMarkers, wishCityReach, wishFar, wishFarByKey, wishTotals, wishCountries, wishCities, wishUnplaced, wishList } = useMemo(() => {
    const wishes = WORKS.map(enrich).filter(isUnseen);
    // WHERE A WANTED WORK GOES ON THE MAP (2026-08-19). It used to key off seenAt — the venue Fuad
    // stood in — which for a work he has NOT seen is empty by definition. After the photo import
    // that meant 1,007 of 1,094 fell into one "location TBC" bucket and drew no marker at all.
    // Now the anchor is the work's HOME (P195): the city it lives in, whether or not he has been
    // there. seenAt is still honoured first for the handful of wishes that carry one (a work met
    // at one venue but wanted at another), then home fills the rest in.
    const byCity = {}, byMus = {};
    // TRIP-PLANNER SHAPE (Fuad 2026-08-20). Keyed by institution the list ran to 323 groups, 174 of
    // them holding a single work — a median group size of 1, which is why it read as endless scroll.
    // You do not travel to a museum, you travel to a CITY and walk between its museums, so the city
    // is the outer level and the institution the inner one.
    const cityGroups = new Map(), unplacedWishes = [];
    // FAR CITIES (Fuad 2026-08-22: "map out the other galleries I haven't been to"). Until now a
    // wanted work only reached the MAP if its home city already had a visited bubble — the ~500
    // works homed in cities never walked fell through to the text list and drew nothing. Those
    // cities now become their own bubbles. Placement is name-match first, then a PROXIMITY FOLD:
    // P131 often names a district rather than the city ("Quartier Saint-Merri" for the Pompidou,
    // "Altstadt-Nord" for Museum Ludwig), and taking the name literally would ghost a second
    // bubble on top of the visited city it belongs to. Anything anchoring within FOLD_R (~40 km)
    // of a visited bubble joins that bubble — comfortably under any two real cities on this map.
    const farMap = new Map(), FOLD_R = 1.0;
    const nearVisited = (x, y) => {
      for (const c of cities.list) if (Math.hypot(x - c.ox, y - c.oy) < FOLD_R) return c;
      return null;
    };
    for (const w of wishes) {
      const mid = (Array.isArray(w.seenAt) ? w.seenAt[0] : w.seenAt) || w.at;
      const home = homeOf(w);
      const m = mid ? MUS_BY_ID[mid] : (home && home.museumId ? MUS_BY_ID[home.museumId] : null);
      const venueName = m ? m.name.replace(/\s*\(.*\)$/, "") : (home ? home.name : null);
      // P131 sometimes names an administrative entity nobody would put on an envelope
      // ("Khamovniki District" is the Tretyakov's corner of Moscow). Only the handful that
      // actually appear in the data; everything else keeps its honest name.
      const CITY_ALIAS = { "Khamovniki District": "Moscow", "Glasgow City": "Glasgow", "Aberdeen City": "Aberdeen", "City of Edinburgh": "Edinburgh" };
      const rawCity = m ? m.city : (home ? home.city : null);
      const cityName = CITY_ALIAS[rawCity] || rawCity;
      // list key: the institution that houses it, so the text list reads as an itinerary
      const key = venueName ? (cityName ? cityName + " — " + venueName : venueName) : "home unknown";
      (byMus[key] = byMus[key] || []).push(w);
      const hasCoords = !m && home && home.lat != null;
      const [hx, hy] = hasCoords ? P(home.lat, home.lon) : [0, 0];
      const fold = (cityName && cities.byCity[cityName]) || (hasCoords ? nearVisited(hx, hy) : null);
      if (fold) {
        (byCity[fold.city] = byCity[fold.city] || { c: fold, list: [] }).list.push({ w, venue: venueName });
      } else if (cityName && hasCoords) {
        const fk = cityName + "|" + (home.country || "");
        let f = farMap.get(fk);
        if (!f) { f = { key: fk, city: cityName, cc: String(home.country || "").toUpperCase(), n: 0, wxs: 0, wys: 0, venues: new Map() }; farMap.set(fk, f); }
        f.n++; f.wxs += hx; f.wys += hy;
        let v = f.venues.get(venueName);
        if (!v) { v = { name: venueName, x: hx, y: hy, list: [] }; f.venues.set(venueName, v); }
        v.list.push(w);
      }
      const cc = (m && m.country) || (home && home.country) || "";
      if (cityName) {
        const cKey = cityName + (cc ? ", " + String(cc).toUpperCase() : "");
        let c = cityGroups.get(cKey);
        if (!c) { c = { key: cKey, city: cityName, cc: String(cc || "").toUpperCase(), n: 0, floored: 0, venues: new Map() }; cityGroups.set(cKey, c); }
        c.n++; if (w.floored || w.favorite) c.floored++;
        const vn = venueName || "elsewhere in the city";
        if (!c.venues.has(vn)) c.venues.set(vn, []);
        c.venues.get(vn).push(w);
      } else unplacedWishes.push(w);
    }
    // FAR BUBBLES SIT AT THEIR TRUE COORDINATES, FULL STOP (Fuad 2026-08-22, third report:
    // Genoa in the sea, after Helsinki and Bordeaux). Two rounds of "gentler" collision
    // relaxation both lost to the same fact: at deep zoom even a 1.2-unit clamp is ~6px of
    // displacement, and for a coastal city the sea starts at 0. These bubbles are 3-4px marks;
    // two of them overlapping is cosmetically harmless and honestly TRUE (the cities are that
    // close), while a bubble off its coastline is false. So: no eviction, no mutual push, no
    // spring, no clamp — geography, verbatim. Density is handled where it can be, honestly:
    // z-order (far paints above the big visited discs, so a Fontainebleau stays visible at the
    // rim of Paris), the fisheye lens, and zoom. Do not reintroduce a relaxation here.
    const farRad = (f) => 1.1 + Math.sqrt(f.n) * 0.55;
    const visRad = (c) => cityRad(c.n);
    const farList = [...farMap.values()].map(f => ({
      ...f, x: f.wxs / f.n, y: f.wys / f.n, venues: [...f.venues.values()],
    }));
    for (const f of farList) { f.r = farRad(f); }
    const farByKey = {}; for (const f of farList) farByKey[f.key] = f;
    const markers = [];
    // HALO CAP (Fuad 2026-08-19: zoom and pan went "slightly weird"). Anchoring wanted works on
    // their HOME collection took the halo from 87 markers to 1,303 — roughly 2,600 SVG nodes, each
    // rebuilding a fresh path string on every frame of a zoom or pan. New York alone drew 175 dots,
    // Paris 143, which is both unaffordable and unreadable: at that density no individual dot can
    // be told apart or aimed at. Each city now shows its strongest few, LOVED first, and the true
    // total lives on the bubble's tooltip and in the list below the map, which is where you would
    // actually read it. The collision relaxation is O(n²) per city, so this makes mount cheaper too.
    // Far cities cap lower (6): 118 of the 206 hold a single work anyway, and the far layer plus
    // its halos must stay lighter than the lived layer both visually and per frame.
    const HALO_CAP = 10, FAR_HALO_CAP = 6;
    const halosOf = [];
    for (const entry of Object.values(byCity)) {
      const c = entry.c;
      entry.total = entry.list.length;
      halosOf.push({ list: entry.list, cap: HALO_CAP, x: c.x, y: c.y, r: visRad(c), city: c.city, far: false });
    }
    for (const f of farList) {
      const flat = f.venues.flatMap(v => v.list.map(w => ({ w, venue: v.name })));
      halosOf.push({ list: flat, cap: FAR_HALO_CAP, x: f.x, y: f.y, r: f.r, city: f.city, far: true });
    }
    // every bubble a halo dot must clear: the visited cities AND the far ones. Solved in the RESTING
    // world frame (Z0 = dotZoom = bubZoom = 0.5 at the world view) because that is the frame Fuad
    // looks at and the worst case for overlap — see the layoutWorldLeaders header. dotMul is the
    // phone hit-area multiplier; the solve honours it so a fat-dot phone map stays non-overlapping.
    const bubbles = [...cities.list.map(c => ({ x: c.x, y: c.y, r: visRad(c) })),
                     ...farList.map(f => ({ x: f.x, y: f.y, r: f.r }))];
    const cityReach = new Map();
    const solved = layoutWorldLeaders(halosOf, bubbles, { Z0: 0.5, dotMul, rank: unseenRank });
    for (const n of solved) {
      const dotR0 = 2.1 * 0.5 * dotMul;
      // markers carry the SOLVED bearing (ringAng) and length (leadOut); `ring: 0` keeps fanAt on the
      // polar branch (it reads ringAng/leadOut, never a ring radius). x/y are the resting rendered dot
      // centre — dead to the halo renderer since fanAt rebuilds from bearing+length, but still what
      // the degenerate-marker guard reads, so it stays honest. cityScale = 1: the solve placed
      // full-size dots, so nothing shrinks them at render (the old per-city halo-shrink is gone —
      // length and bearing do that job per dot now).
      markers.push({ w: n.e.w, x: n.x, y: n.y, bx: n.bx, by: n.by, city: n.city, venue: n.e.venue,
        far: n.far, keepR: n.rim / (0.5 * dotMul), ring: 0, ringAng: n.ang, leadOut: n.out, cityScale: 1 });
      // the halo's reach in dot radii above the rim, so the city label clears the fringe
      cityReach.set(n.city, Math.max(cityReach.get(n.city) || 0, n.out + n.rad / dotR0));
    }
    // The old resting map ran a global bubble-eviction + dot-separation pass HERE, over mk.x/mk.y.
    // It was already dead (fanAt rebuilds a halo dot from its bearing and length, never mk.x/mk.y)
    // and is now removed: layoutWorldLeaders solves dot-off-bubble and dot-off-dot globally as part
    // of its cost, so mk.x/mk.y arrive already clear and only feed the degenerate-marker guard.
    // The text list is already keyed by institution, so it reads as an itinerary: the places
    // holding the most wanted works come first, and "home unknown" sinks to the bottom.
    // per-city totals BEFORE the halo cap, so the bubble can state what the dots no longer show
    const totals = {};
    for (const [city, entry] of Object.entries(byCity)) totals[city] = entry.total;
    // RANKED BY TRIP VALUE, not alphabetically and not purely by volume. Floored leads, because
    // those are the works you would actually cross a border for — New York holds the most wanted
    // works of anywhere (151) and exactly one of them floored him, which volume alone would have
    // put at the top of the page. Volume breaks the tie.
    const sortedCities = [...cityGroups.values()].map(c => ({
      ...c,
      venues: [...c.venues.entries()]
        .map(([name, list]) => ({ name, list: list.slice().sort((a, b) => unseenRank(b) - unseenRank(a) || String(a.title).localeCompare(String(b.title))) }))
        .sort((a, b) => b.list.length - a.list.length || a.name.localeCompare(b.name)),
    })).sort((a, b) => b.floored - a.floored || b.n - a.n || a.city.localeCompare(b.city));
    // COUNTRY above city (Fuad 2026-08-20). 235 cities roll up to 39 countries, which is how a trip
    // is actually decided — pick the country, then see which of its cities earn the detour. It also
    // retires the "Elsewhere" fold: a city holding one work is now simply near the bottom of an
    // already-collapsed country, so nothing has to be hidden by hand.
    const ccMap = new Map();
    for (const c of sortedCities) {
      let e = ccMap.get(c.cc);
      if (!e) { e = { cc: c.cc, name: countryName(c.cc), n: 0, floored: 0, cities: [] }; ccMap.set(c.cc, e); }
      e.n += c.n; e.floored += c.floored; e.cities.push(c);
    }
    // Halo separation and the per-dot free bearing/length solve used to live here (the
    // cityScale halo-shrink and the LEADER LENGTH AND BEARING solve). Both are now folded into
    // layoutWorldLeaders above, which solves bearing and length per dot against every neighbour in
    // one place — so there is no separate cityScale (dots render full size, the solve accounts for
    // it) and no second solve here. cityReach was filled at the marker build above.
    const sortedCountries = [...ccMap.values()]
      .sort((a, b) => b.floored - a.floored || b.n - a.n || a.name.localeCompare(b.name));
    return {
      wishCountries: sortedCountries,
      wishMarkers: markers,
      // the city label reads the halo's MEASURED reach (dot radii above the rim), which is exactly
      // as tall as the solved fan actually stands — no longer estimated from a ring count.
      wishCityReach: cityReach,
      wishFar: farList,
      wishFarByKey: farByKey,
      wishTotals: totals,
      wishCities: sortedCities,
      wishUnplaced: unplacedWishes.sort((a, b) => unseenRank(b) - unseenRank(a) || String(a.title).localeCompare(String(b.title))),
      wishList: Object.entries(byMus).sort((a, b) =>
        (a[0] === "home unknown") - (b[0] === "home unknown") || b[1].length - a[1].length),
    };
    // dotMul joins the deps because the varied-length solve reasons about RENDERED sizes and
    // dotMul is one of them. It is a useState with no setter — a mount-time media-query read that
    // never changes — so this can never actually re-run the memo; it is here so the dependency is
    // honest rather than implied.
  }, [cities, dotMul]);
  const trips = useMemo(() => {
    const by = {};
    for (const m of MUSEUMS) for (const v of (m.visits || [])) {
      const y = String(v).match(/^(~?)(\d{4})/); if (!y) continue;
      (by[y[2]] = by[y[2]] || new Set()).add(m.city);
    }
    return Object.entries(by).map(([y, s]) => [y, [...s]]).sort((a, b) => b[0] - a[0]);
  }, []);

  // zoom + pan: the viewBox is state; wheel zooms toward the cursor, drag pans. Marker/label sizes
  // are multiplied by k = vb.w/880 so they stay a constant size on screen at any zoom. The wheel is
  // bound NON-passively via the DOM (React's onWheel is passive → the page used to scroll instead)
  // and every view change is coalesced to ONE state commit per animation frame (a wheel burst can't
  // trigger a re-render storm on the big land path — the earlier crash/VRAM spike).
  const AR = 380 / 880;
  const HOME = { x: 60, y: 40, w: 880, h: 380 };
  const svgRef = React.useRef(null);
  const drag = React.useRef(null);
  const raf = React.useRef(0);
  const [vb, setVb] = useState(HOME);
  const vbRef = React.useRef(vb); vbRef.current = vb;
  const [hover, setHover] = useState(null);
  const k = vb.w / 880;
  const commit = (next) => { vbRef.current = next; if (!raf.current) raf.current = requestAnimationFrame(() => { raf.current = 0; setVb(vbRef.current); }); };
  // ——— cursor magnifier (fix 4, reworked 2026-07-17). SCALE-ONLY: the pointer is tracked in MAP
  // units (lens) and every bubble within LENS_R grows with a smooth cosine falloff (up to LENS_MAG
  // at the cursor), labels fade in and the nearest raises z-order — but POSITIONS STAY STATIC. The
  // earlier version also displaced nodes radially OUTWARD from the pointer, which made a bubble flee
  // the cursor as you approached (an anti-magnet). Static overlap is already handled by relaxFan, so
  // approaching a bubble now simply grows it → easier to hit. On touch there is no hover, so the
  // lens is driven by a tap that also nudges a semantic zoom step toward the tapped point.
  const [lens, setLens] = useState(null);           // { x, y } in map units, or null
  const lensRaf = React.useRef(0);
  const LENS_R = 26;                                 // magnifier radius, map units (scales with zoom via vb)
  const LENS_MAG = 2.1;                              // peak size multiplier at the cursor
  const LENS_SPREAD = 0.16;                          // (historic) how far the lens PARTED a cluster
  const LENS_PULL = 0.10;                            // how far it now draws one in — see `fish`
  const LENS_GRAB = 1.0;                             // extra size in the innermost third — makes small dots catchable
  // FAN SCALING (Fuad 2026-08-19: "the branches out from the big circles should decrease as I zoom
  // in"). Marker positions are solved ONCE, in world units, by a collision relaxation far too
  // expensive to re-run per frame for ~1,300 dots. So the solved offset from the city anchor is
  // simply re-scaled at render: k is vb.w/880, which shrinks as you zoom, so the fan contracts
  // toward its bubble and the halo stops sprawling across a zoomed-in view. Clamped so the dots
  // never collapse INTO the bubble at extreme zoom, and never overreach when zoomed out.
  // Floor 0.28 → 0.16 (Fuad 2026-08-22: "the branching needs to be shorter" once zoomed in);
  // ceiling 1.15 → 0.8 ("the longest lines are still too long") → 0.4 (third pass, same day:
  // "half the length they are now"). The fan renders at 40% of its solved length; fanAt clamps
  // the contracted offset at the marker's `keep` floor so no dot is ever pulled back inside
  // its own bubble — at this ceiling most dots ride near that floor, which is the point.
  // Both contraction factors are LAWS OF k, hoisted into named functions because the branch
  // declutter (see `declutterLeaders`) has to evaluate them at a k that is not this render's:
  // it runs the instant a city is focused, while the viewBox is still the world view, and has to
  // reason about the frame the focus effect is about to commit. One definition each, no drift.
  const FAN_K_AT = (kk) => Math.max(0.14, Math.min(0.24, kk * 0.24));
  const BRANCH_K_AT = (kk) => Math.max(0.35, Math.min(0.8, kk * 0.8));
  const fanK = FAN_K_AT(k);
  const fanAt = (mk) => {
    const ox = mk.x - mk.bx, oy = mk.y - mk.by, len = Math.hypot(ox, oy) || 0.001;
    // COLLAR MODEL (Fuad 2026-08-22, sixth line-length pass: "cut pretty much all of them by
    // half again"). The dot keeps its solved ANGLE; its distance is pinned to a tight band just
    // off the rendered rim — floor = rim + rendered dot + a hair, cap = floor + 0.9 — so every
    // leader is a short whisker no matter how far the collision solver pushed the dot in world
    // units. Dense small cities may bead-overlap at rest; the fisheye parts them under the
    // cursor, and short-beats-separated is the owner's consistently chosen trade.
    // seventh pass (Fuad: "even shorter, probably by another half — way too long and
    // overlapping"): the collar sits ON the rim (dot centre at rim + 60% of dot radius, so
    // the dot visibly touches its bubble) and the band is 0.45 — leaders are nubs now.
    // Eighth pass (Fuad 2026-08-22: "further reduced in length, another half"): band 0.45 →
    // 0.22, so the leaders that still cleared the collar floor halve again.
    // Ninth pass (Fuad 2026-08-24: "reduce the length of the connected lines even further, we
    // need to avoid overlapping lines and dots — Paris begin to overlap with Dijon"). The
    // failure is no longer inside one city but BETWEEN neighbouring ones: a big city's halo
    // reaching far enough to touch its neighbour's. Band 0.22 → 0.11 and the fan ceiling
    // 0.32 → 0.24, which pulls the longest leaders in from both directions. He confirmed the
    // dot system itself reads right ("looking at Tokyo the dots properly fan out"), so the
    // angles and the collar model stay exactly as they are.
    // ELEVENTH PASS — read the ring assignment instead of rescaling the solved offset (see the
    // RING PACKING note where markers are built). Radius scales with the RENDERED dot size,
    // because that is what decides whether two dots touch: at the world view dots draw at half
    // size so the rings pull in tight, and they open out as you zoom exactly in step with the
    // dots growing. (Superseded by the thirteenth pass below, which keeps the currency and throws
    // away the ring: the claim that "no leader is longer than it has to be" was never true — every
    // leader on a ring was exactly as long as every other leader on that ring.)
    if (mk.ring != null) {
      // UNIT BUG (Fuad 2026-08-24: "the length of the lines is good now but the dot size has
      // decreased, which is wrong"). The previous pass bought shorter leaders by shrinking the
      // dots, which was treating the symptom. The cause: ring pitch was expressed in MAP units
      // (ring * 2.2) while the dot is drawn at 2.1 * k * dotMul * dotZoom, i.e. a constant SCREEN
      // size — two different spaces, so the spacing that was supposed to be "one dot" was not.
      // The dot's real rendered radius is still the unit everything here is measured in.
      const dotR = 2.1 * k * dotMul * dotZoom;         // the dot's radius in MAP units
      const rimR = (mk.keepR || 0) * bubZoom * dotMul;
      // THIRTEENTH PASS — LENGTH IS A FREEDOM, NOT A JITTER (Fuad 2026-08-25: "the lines are the
      // same length around cities and overlapping with points over other lines" / "Again,
      // branching lines can vary in length and don't need to symmetrically go all around a city").
      // The twelfth pass's note here said uneven lengths were deliberate; the rendered output said
      // otherwise — Tokyo drew ten leaders at one length, London three lengths for ten dots — and
      // the reason was this very line: `base` was a per-RING radius shared by every dot on it, and
      // ringVary a small, mostly-zero nudge on top. There is no shared radius any more. `leadOut`
      // is this dot's own distance, in RENDERED DOT RADII above the RENDERED rim, solved at mount
      // against its real neighbours (see LEADER LENGTH AND BEARING ARE BOTH FREE where the markers
      // are built), and `ringAng` is its own bearing, solved in the same place. Dot radii rather
      // than map units so a leader rides the zoom with the dot it is dodging; the rim term is the
      // floor by construction, since leadOut is solved with a positive minimum, so nothing here
      // needs to clamp. The fallback keeps a marker drawable if it somehow reached the renderer
      // unsolved (never in practice — the solver visits every ring marker).
      const r = rimR + dotR * (mk.leadOut != null ? mk.leadOut : 1.1 * (mk.cityScale || 1));
      return [mk.bx + Math.cos(mk.ringAng) * r, mk.by + Math.sin(mk.ringAng) * r];
    }
    const lo = (mk.keepR || 0) * bubZoom * dotMul + 2 * dotZoom * dotMul * 0.6;
    const newLen = Math.min(lo + 0.11, Math.max(lo, len * fanK));
    return [mk.bx + ox / len * newLen, mk.by + oy / len * newLen];
  };
  // DOT ZOOM (Fuad 2026-08-22: "the dots can start initially smaller — when zoomed in they can
  // be the size they are"). Halo dots render at 60% in the resting world view and ramp to full
  // size as the viewBox narrows; k = vb.w/880, full size from a 2.5x zoom (k ≤ 0.4) on down.
  // Resting floor 0.5 -> 0.34 (Fuad 2026-08-24: "further halve the line distance"). With dots
  // ring-packed at one diameter's spacing, the halo's reach IS a multiple of the rendered dot
  // size — so at constant dot size the reach cannot be halved without dots touching. Shrinking
  // the resting dot is the only lever that buys distance without reintroducing overlap. Full
  // size from a 2.5x zoom on down, unchanged.
  const dotZoom = Math.max(0.5, Math.min(1, 0.4 / k));
  // Same idea for the CITY BUBBLES, harder (Fuad, same day: "the large city blobs should be
  // half the size when starting from the furthest" — the resting view was "super busy").
  // Half size at the world view, full from the same 2.5x zoom. Render-only: the world-unit
  // radii still drive halo seeding and dot eviction, which stay conservative.
  const bubZoom = Math.max(0.5, Math.min(1, 0.4 / k));
  // pull any child toward its parent by the same zoom factor, so the opened branch contracts on
  // zoom exactly as the resting halo does
  const towards = (px, py, x, y) => [px + (x - px) * fanK, py + (y - py) * fanK];
  // MUSEUM FAN — its own factor (Fuad 2026-08-24: "the fan out for those browsed cities should
  // be further away from the main city: the museums sit too close and we're already looking at
  // the map from the context of a city anyway but the artwork dots are spaced out logically").
  // The opened branch is the opposite problem from the resting halo: there you are looking at a
  // continent and long leaders collide with the next city, here you are already inside one city
  // and have the room. So museums get ~2.5x the resting fan while their WORK dots keep the
  // resting spacing, which he signed off on. The focused viewBox is framed from `branch.reach`,
  // measured in uncontracted world units, so a longer museum fan still fits without reframing.
  const branchK = BRANCH_K_AT(k);
  const towardsBranch = (px, py, x, y) => [px + (x - px) * branchK, py + (y - py) * branchK];
  // LABEL ZOOM (Fuad 2026-08-24: "reduce the text size when zoomed in so close"). Label sizes are
  // multiplied by k, which keeps them a CONSTANT size on screen at every zoom — so as you close
  // in and the dots grow, the names stop being annotation and start being furniture. This shrinks
  // them the deeper you go. Base curve pulled gentler (Fuad 2026-08-25: "the font size is
  // overpowering") — starts lower and eases toward its floor over more of the zoom, so a name is
  // small when it first appears and only grows a little as you close in, never becoming furniture.
  const labelZoom = Math.max(0.5, Math.min(0.82, Math.pow(k / 0.4, 0.5) * 0.82));
  // LABEL LEVEL-OF-DETAIL (Fuad 2026-08-25: "let the font appear when zooming in closer to the map,
  // as currently the cities even not in-context appear too fast when zooming in"). The old rule
  // showed EVERY city name at one flat k<0.42, so the whole map lit up at once the moment you
  // committed to a region. Now a city's name appears LATER the smaller the city is: the biggest
  // cities (largest bubble) label first, at ~k 0.40; the smallest only once you are genuinely on
  // top of them, at ~k 0.24. cityLabelK returns each city's own threshold from its bubble radius
  // (cityRad spans ~1.1..5.2). The lens still reveals any name under the cursor regardless.
  const cityLabelK = (cr) => 0.24 + Math.min(1, Math.max(0, (cr - 1.1) / (5.2 - 1.1))) * 0.16;
  // FADE, don't pop: a name eases in over the last stretch of zoom before its threshold rather than
  // appearing whole. 1 once k is a hair past the threshold, 0 at/above it, linear across a small band.
  const labelFade = (kk, thr) => Math.max(0, Math.min(1, (thr - kk) / (thr * 0.14)));
  // VIEWPORT CULLING. Zooming and panning felt "weird" (Fuad 2026-08-19) because every halo marker
  // was re-solved and re-serialised into a path string on each frame, whether or not it was on
  // screen — and anchoring works on their home collection had taken the halo from 87 markers to
  // over a thousand. Panning at zoom is exactly the case where most of them are outside the frame.
  // The margin is a generous half-viewport so nothing pops in at the edge mid-drag.
  const inView = (x, y) => {
    const mx = vb.w * 0.5, my = vb.h * 0.5;
    return x >= vb.x - mx && x <= vb.x + vb.w + mx && y >= vb.y - my && y <= vb.y + vb.h + my;
  };
  // a consistently-bowed quadratic between two points. Bow is a fraction of the run's own length
  // so short connectors stay near-straight and long ones arc; the perpendicular is taken in a
  // fixed rotational direction so every branch off a bubble curves the same way.
  const bow = (x1, y1, x2, y2, amt = 0.18, cap = 2.2) => {
    const vx = x2 - x1, vy = y2 - y1, len = Math.hypot(vx, vy) || 1;
    const b = Math.min(len * amt, cap * k);
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    return `M${x1} ${y1} Q${mx - (vy / len) * b} ${my + (vx / len) * b} ${x2} ${y2}`;
  };
  const lensR = LENS_R * k;
  const setLensThrottled = (p) => { if (lensRaf.current) return; lensRaf.current = requestAnimationFrame(() => { lensRaf.current = 0; setLens(p); }); };
  // magnifier transform for one point: returns [x, y, scale]. Position is unchanged; only scale
  // ramps 1→LENS_MAG as the point nears the cursor (t is a 0..1 nearness ramp, cosine falloff).
  // `r` is the node's own radius in map units (optional). Big bubbles are already easy to hit,
  // and magnifying them by the full LENS_MAG while zoomed out made them balloon over their
  // neighbours and grab the cursor from far away (Fuad 2026-08-13: "too aggressive when you're
  // zoomed out for the biggest location blobs, the small ones are ok"). So the magnification is
  // damped by size: a small dot still gets the full effect, a large city bubble much less.
  // DISPLACEMENT (Fuad 2026-08-19: the branching "feels very inorganic"). Until now the lens only
  // magnified a node's SIZE and left every position untouched, so passing the cursor over a dense
  // cluster made the dots swell into each other instead of opening up — the map stayed rigid while
  // things merely got fatter. A real focus+context lens also PUSHES points radially away from the
  // cursor, so a crowd parts as you move through it and closes again behind you. The push is
  // proportional to the lens radius, which itself shrinks with zoom, so the effect stays the same
  // size on screen at every scale.
  const fish = (x, y, r) => {
    if (!lens) return [x, y, 1];
    const dx = x - lens.x, dy = y - lens.y, d = Math.hypot(dx, dy);
    if (d >= lensR) return [x, y, 1];
    const t = 0.5 + 0.5 * Math.cos(Math.PI * d / lensR);   // 1 at centre → 0 at edge (smooth)
    // NEAR-FIELD GRAB (Fuad 2026-08-19: the small dots are "still a bit hard to get"). The cosine
    // ramp is deliberately gentle across the whole lens, which is right for context but means a
    // dot is only ~2x even when you are almost on it. This second term lives in the innermost
    // third of the lens and is SQUARED, so it stays out of the way until the cursor is genuinely
    // close and then adds real size right where you are aiming. Damped by node size like the main
    // ramp, so it enlarges small dots and barely touches city bubbles.
    const near = Math.max(0, 1 - d / (lensR * 0.34));
    // size damping: full magnification up to ~3 map units, tapering to ~25% by ~12 units
    const damp = r ? Math.max(0.25, Math.min(1, 3 / r)) : 1;
    // The push profile is a SINE, not a falloff: zero at the cursor, peaking half a lens-radius
    // out, back to zero at the rim. The first attempt peaked at the CENTRE, which meant a dot fled
    // fastest exactly as you reached for it (Fuad 2026-08-19: "these escape the mouse cursor").
    // Zero at the centre means whatever you are aiming at holds still while its neighbours step
    // aside — the cluster opens AROUND the target instead of running from it — and zero at the rim
    // still leaves the rest of the map undisturbed.
    // MAGNET, NOT SPREAD (Fuad 2026-08-24: "those dots should behave as slight magnets when
    // interacting with the map"). The sign is now NEGATIVE: neighbours drift TOWARD the cursor
    // instead of stepping aside from it. The profile is unchanged and still earns its shape —
    // zero at the cursor means the dot you are aiming at holds perfectly still (an earlier build
    // peaked at the centre and dots fled the pointer, "these escape the mouse cursor"), and zero
    // at the rim leaves the rest of the map undisturbed. The pull is deliberately weaker than the
    // old push, 0.10 against 0.16: dots are being MAGNIFIED at the same time, so a strong inward
    // pull would collide the very cluster the ring packing was built to keep apart.
    const push = d > 0.001 ? -LENS_PULL * lensR * Math.sin(Math.PI * d / lensR) : 0;
    const ux = dx / (d || 1), uy = dy / (d || 1);
    return [x + ux * push, y + uy * push, 1 + (LENS_MAG - 1) * t * damp + LENS_GRAB * near * near * damp];
  };
  const clientToMap = (cx, cy) => {
    const el = svgRef.current; if (!el) return null; const r = el.getBoundingClientRect(); const v = vbRef.current;
    return { x: v.x + (cx - r.left) / r.width * v.w, y: v.y + (cy - r.top) / r.height * v.h };
  };
  // ——— branching: click a city → it fans out to its museums, and each museum to the loved/liked
  // works you saw there (hover a work for a preview, click to open). Pure geometry in map units;
  // focusing auto-zooms the viewBox to frame the branch. (Fuad 2026-07-14)
  const [focus, setFocus] = useState(null);
  // ——— collision-relaxed radial fan (fix 2). Seed each child on a golden-angle spiral out of the
  // parent (guarantees an even, non-symmetrical spread that adapts to count), then run a few
  // relaxation passes: children that sit closer than their combined radii shove each other apart
  // and are gently pulled back toward the parent. Longer leader lines are preferred over overlap,
  // so no two bubbles clump. minR keeps the ring off the parent bubble; the result is used for
  // BOTH museums (out of the city) and works (out of each museum).
  // FIX 1 (2026-07-17): the parent-clear clamp is now RADIUS-AWARE. The old clamp pushed a node's
  // CENTRE to minR, ignoring the node's own radius and the parent's — so a fat child seeded at minR
  // still had its disc overlapping (and often sitting on top of) the parent bubble, which is exactly
  // the "stray dot in the centre of the city bubble" the owner saw. Now every node is kept so its
  // EDGE clears the parent bubble by `gap`: dist(center) >= parentR + nodeR + gap, enforced every
  // pass AND once more at the very end so no path can leave a marker under a parent. `parentR`/`gap`
  // come from opt; minR is still the seed ring but the clamp no longer trusts it alone.
  const relaxFan = (px, py, items, opt) => {
    const n = items.length; if (!n) return [];
    const GA = 2.399963;                                       // golden angle (rad) — even fan
    const minR = opt.minR, step = opt.step, sep = opt.sep, rOf = opt.rOf, seedAng = opt.seedAng || 0;
    const parentR = opt.parentR || 0, gap = opt.gap == null ? 1.2 : opt.gap;
    const nodes = items.map((it, i) => {
      const rr = minR + step * Math.sqrt(i);
      const a = seedAng + i * GA;
      return { it, x: px + rr * Math.cos(a), y: py + rr * Math.sin(a), r: rOf(it, i) };
    });
    const clearParent = (nd) => {
      const need = parentR + nd.r + gap;                       // node EDGE must clear the parent bubble
      let ex = nd.x - px, ey = nd.y - py, e = Math.hypot(ex, ey) || 0.001;
      const floor = Math.max(minR, need);
      if (e < floor) { nd.x = px + ex / e * floor; nd.y = py + ey / e * floor; }
    };
    for (let pass = 0; pass < 16; pass++) {
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        const a = nodes[i], b = nodes[j], min = a.r + b.r + sep;
        let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
        if (d >= min) continue; if (d < 0.001) { dx = Math.cos(i) * 0.5; dy = Math.sin(i) * 0.5; d = Math.hypot(dx, dy); }
        const push = (min - d) / d / 2; a.x -= dx * push; a.y -= dy * push; b.x += dx * push; b.y += dy * push;
      }
      for (const nd of nodes) clearParent(nd);                 // radius-aware parent clear, every pass
    }
    for (const nd of nodes) clearParent(nd);                   // final hard guarantee: nothing under the parent
    return nodes;
  };
  // ——— LEADER DECLUTTER (Fuad 2026-08-24: "allow the lines to reduce their lengths if they are to
  // overlap with other lines ... we don't need all to be symmetrical, I do like how the lines and
  // dots branch off when clicking inside a city"). relaxFan above solves DOT versus DOT and has no
  // concept of the segments joining them, which is why an opened city still showed leaders crossing
  // each other and skewering other museums' dots — the dots were all legally spaced, the lines
  // between them were not. The branching is liked and is NOT redesigned here. Every leader keeps
  // its solved ANGLE exactly; the only thing this pass touches is how far along that angle the
  // child sits. The lengths therefore come out DELIBERATELY UNEVEN, and that unevenness is the fix
  // rather than a side effect — he asked for it in as many words. Where two leaders are both spent
  // we accept the overlap instead of bending an angle: a wrong angle is a lie about the geometry,
  // a touching line is only untidy.
  //
  // WHICH SPACE. Solved in RENDERED map units, not the world units relaxFan works in, because the
  // two are not the same picture. A museum draws at city + (m - city) * branchK — a uniform scale
  // about the city, which preserves crossings, so that tier alone could have been solved either
  // way. A WORK does not: it draws at M + (w - M) * fanK where M is the museum's ALREADY-CONTRACTED
  // position (see `towards` and the museum-fan note above), i.e. the vector runs from the contracted
  // parent to the UNcontracted child. That is not a scaled copy of the world-unit fan — it carries
  // an extra outward shove of fanK * (1 - branchK) * |m - city| — so a work leader's on-screen angle
  // and length are genuinely different quantities from its world-unit ones, and a crossing solved in
  // world units would be a crossing nobody can see. So: contract, solve, invert back to world units.
  // The inversion is exact, so the renderer reproduces this layout to the pixel.
  //
  // WHICH k. The contraction depends on k and at the moment a city is focused the live k is still
  // the world view's, so we use the k the focus effect is ABOUT to commit — half = max(28, reach+6),
  // w = 2 * half — measured from the pre-declutter extent. That is an upper bound, since this pass
  // only ever shortens, which leaves the clearances a hair conservative. In practice both laws sit
  // pinned at their FLOOR for any frame you can reach while focused (fanK leaves its floor only
  // above vb.w ~513 and branchK above ~385, while a focused frame is ~60-90 wide), so the solved
  // layout survives zooming unchanged; only the dot radii, which are screen-constant, breathe.
  //
  // A MOVED MUSEUM CARRIES ITS WORKS, rigidly, in the rendered space: the museum's step inward is
  // added to each of its works' raw anchors, which is exactly the amount that leaves fanK * (w - M)
  // — the work's entire rendered leader, angle and length — unchanged, so the sub-fan translates as
  // one body. This is not fussiness. The obvious alternative, letting each work re-derive from the
  // moved museum, does the OPPOSITE of what it sounds like: w is fixed while M steps toward the
  // city, so (w - M) grows and pulling a museum in FLINGS its works outward. The first build of this
  // pass did that and traded two crossings for fifty grazes before the numbers caught it.
  //
  // BEST-OF, NOT LAST. Shortening to clear a CROSSING is monotone — the new segment is a subset of
  // the old, so it cannot invent one — but shortening to clear a GRAZE moves a dot, and a moving dot
  // can wander onto some third line. So every pass is scored (a crossing counts treble a graze) and
  // the best state seen is what gets written back, with the untouched input as pass zero. That makes
  // the whole pass strictly non-worsening: if it cannot beat the layout it was handed, it hands it
  // straight back.
  //
  // Not modelled, on purpose: `grow` (the unfurl tween) and the cursor fisheye, both per-frame and
  // transient, and the bow on each connector — its control offset is capped at 2.2k / 1.4k, well
  // under a dot radius of mid-curve deviation, so the chord is a faithful stand-in and `pad` below
  // pays a little of it back. Runs once per focus change over <15 museums and <100 works, so the
  // O(n²) pair sweep is a few tens of thousands of cheap tests — never per frame.
  const declutterLeaders = (cx, cy, cityR, nodes) => {
    if (!nodes.length) return;
    let ext = cityR + 4;                                       // mirrors the reach loop / focus framing
    for (const nd of nodes) {
      ext = Math.max(ext, Math.hypot(nd.x - cx, nd.y - cy) + nd.mr + 5.2);
      for (const wn of nd.wnodes) ext = Math.max(ext, Math.hypot(wn.x - cx, wn.y - cy) + wn.r);
    }
    const kF = Math.max(28, ext + 6) * 2 / 880;                // the focused frame's k
    const bK = BRANCH_K_AT(kF), fK = FAN_K_AT(kF);
    const cityRr = cityR * 1.55 * kF;                          // the city blob as DRAWN
    const pad = 1.6 * kF;                                      // breathing room, and the bow's slop
    const KEEP = 0.45;                                         // never below this share of natural:
    const PASSES = 10, SHRINK = 0.92;                          // uneven is wanted, collapsed is not
    // One segment per leader. pid/cid are identities, not indices: two segments sharing an endpoint
    // (siblings off one parent, or a museum leader and the works hanging off its far end) meet there
    // by construction and must never be read as a collision. Museum ids are >= 0 and the sentinels
    // negative, so the three identity tests in `rel` cover every such pair.
    const segs = [], wSeg = [], wByM = nodes.map(() => []);
    const mSeg = nodes.map((nd, i) => {
      const dx = (nd.x - cx) * bK, dy = (nd.y - cy) * bK, L = Math.hypot(dx, dy) || 0.001;
      const s = { pid: -1, cid: i, mi: i, work: null, nd, px: cx, py: cy,
                  ux: dx / L, uy: dy / L, len: L, r: nd.mr * kF, x: cx + dx, y: cy + dy };
      s.floor = Math.min(L, Math.max(cityRr + s.r + pad, L * KEEP));
      segs.push(s); return s;
    });
    for (let i = 0; i < nodes.length; i++) for (const wn of nodes[i].wnodes) {
      const s = { pid: i, cid: -2, mi: i, work: wn, r: wn.r * kF * dotMul, wx: wn.x, wy: wn.y,
                  px: 0, py: 0, ux: 1, uy: 0, len: Infinity, floor: 0, x: 0, y: 0 };
      wByM[i].push(s); wSeg.push(s); segs.push(s);
    }
    // a work hangs off its museum's CURRENT rendered spot; its stored length is capped by, and on
    // first call set to, the full leader the renderer would draw
    const placeW = (s) => {
      const m = mSeg[s.mi];
      const dx = (s.wx - m.x) * fK, dy = (s.wy - m.y) * fK, L = Math.hypot(dx, dy) || 0.001;
      s.px = m.x; s.py = m.y; s.ux = dx / L; s.uy = dy / L;
      s.floor = Math.min(L, Math.max(m.r + s.r + pad, L * KEEP));
      s.len = Math.max(s.floor, Math.min(L, s.len));
      s.x = s.px + s.ux * s.len; s.y = s.py + s.uy * s.len;
    };
    const placeM = (s) => {
      const ox = s.x, oy = s.y;
      s.x = cx + s.ux * s.len; s.y = cy + s.uy * s.len;
      const dx = s.x - ox, dy = s.y - oy;                      // the sub-fan rides along, rigidly
      for (const w of wByM[s.mi]) { w.wx += dx; w.wy += dy; placeW(w); }
    };
    for (const s of wSeg) placeW(s);
    const side = (ax, ay, bx, by, px, py) => (bx - ax) * (py - ay) - (by - ay) * (px - ax);
    const crosses = (a, b) => {
      const d1 = side(a.px, a.py, a.x, a.y, b.px, b.py), d2 = side(a.px, a.py, a.x, a.y, b.x, b.y);
      const d3 = side(b.px, b.py, b.x, b.y, a.px, a.py), d4 = side(b.px, b.py, b.x, b.y, a.x, a.y);
      return (d1 > 0) !== (d2 > 0) && (d3 > 0) !== (d4 > 0);
    };
    // a line GRAZING a foreign dot reads as overlap just as loudly as a crossing does
    const grazes = (s, px, py, rad) => {
      const vx = s.x - s.px, vy = s.y - s.py, L2 = vx * vx + vy * vy || 1e-6;
      const t = Math.max(0, Math.min(1, ((px - s.px) * vx + (py - s.py) * vy) / L2));
      return Math.hypot(s.px + vx * t - px, s.py + vy * t - py) < rad;
    };
    const rel = (a, b) => a.pid === b.pid || a.pid === b.cid || a.cid === b.pid;
    const cost = (a, b) => {
      const rad = a.r + b.r + pad;
      return (crosses(a, b) ? 3 : 0) +
             ((grazes(a, b.x, b.y, rad) || grazes(b, a.x, a.y, rad)) ? 1 : 0);
    };
    const score = () => {
      let sc = 0;
      for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++)
        if (!rel(segs[i], segs[j])) sc += cost(segs[i], segs[j]);
      return sc;
    };
    // the whole solve is two numbers per leader (a length, and for a work the anchor its museum has
    // dragged around), so snapshotting the input costs nothing worth counting
    const capture = () => ({ m: mSeg.map(s => s.len), w: wSeg.map(s => [s.wx, s.wy, s.len]) });
    const restore = (st) => {
      mSeg.forEach((s, i) => { s.len = st.m[i]; s.x = cx + s.ux * s.len; s.y = cy + s.uy * s.len; });
      wSeg.forEach((s, i) => { s.wx = st.w[i][0]; s.wy = st.w[i][1]; s.len = st.w[i][2]; });
      for (const s of wSeg) placeW(s);
    };
    // every pair a move can possibly disturb. Moving a museum drags its sub-fan, so its own works
    // count as part of it; two works of ONE museum are rigid against each other and `rel` skips
    // them anyway, which is what makes this an exact accounting rather than a heuristic.
    const localCost = (s) => {
      let sc = 0;
      const mine = s.work ? [s] : [s, ...wByM[s.mi]];
      for (const p of mine) for (const o of segs) if (o !== p && !rel(p, o)) sc += cost(p, o);
      return sc;
    };
    const move = (s, len) => {
      s.len = len;
      if (s.work) { s.x = s.px + s.ux * s.len; s.y = s.py + s.uy * s.len; } else placeM(s);
    };
    // One step inward, KEPT ONLY IF IT PAYS. placeM's delta is computed from where the museum was,
    // so calling move() with the old length applies the exact inverse translation to the sub-fan —
    // the undo is reversible to the bit, which is what lets us gamble a move and take it back.
    // Accepting ties (<=, not <) is deliberate twice over: a step of 8% rarely clears a conflict on
    // its own, so demanding immediate profit would freeze the solve before it started, and a leader
    // whose overlap cannot be cleared at all still ends up shorter — which is the letter of the
    // request, "reduce their lengths if they are to overlap".
    const tryShrink = (s) => {
      const was = s.len, next = Math.max(s.floor, s.len * SHRINK);
      if (next >= was - 1e-6) return false;                    // already on its floor
      const before = localCost(s);
      move(s, next);
      if (localCost(s) <= before) return true;
      move(s, was); return false;
    };
    const start = capture(), sc0 = score();
    for (let pass = 0; pass < PASSES && sc0 > 0; pass++) {
      const tried = new Set();                                 // one ATTEMPT per leader per pass, so a
      let moved = false;                                       // crowded node can't stampede the solve
      for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) {
        const a = segs[i], b = segs[j];
        if (rel(a, b) || !cost(a, b)) continue;
        // spend the LONGER one's slack first, and fall through to the other if it has none left or
        // its step didn't pay. If neither can give, the overlap stands: angles win over tidiness.
        for (const t of a.len >= b.len ? [a, b] : [b, a]) {
          if (tried.has(t) || t.len <= t.floor + 1e-6) continue;
          tried.add(t);
          if (tryShrink(t)) { moved = true; break; }
        }
      }
      if (!moved) break;
    }
    if (score() > sc0) restore(start);                         // belt and braces: never ship a regression
    // back to world units. The renderer re-applies exactly the contraction inverted here, so what it
    // paints is what was solved. Museums first: the work write-back reads mSeg's RENDERED x/y, which
    // that loop leaves untouched (it writes to nd, not to the segment).
    for (const s of mSeg) {
      s.nd.x = cx + (s.x - cx) / bK; s.nd.y = cy + (s.y - cy) / bK;
      s.nd.lx = s.nd.x; s.nd.ly = s.nd.y - (s.nd.mr + 4.2);
    }
    for (const s of wSeg) {
      const m = mSeg[s.mi];
      s.work.x = m.x + (s.x - m.x) / fK; s.work.y = m.y + (s.y - m.y) / fK;
    }
  };
  const branch = useMemo(() => {
    if (!focus) return null;
    // FAR BRANCH (2026-08-22): a far city opens exactly like a visited one — venues fan out of
    // the bubble, wanted works fan out of each venue. The fan geometry is already synthetic
    // (relaxFan seeds a spiral; even the visited branch never used the museums' true coordinates),
    // so the only real differences are the source lists and that a far venue has no museum page
    // to click through to.
    if (focus.startsWith("far:")) {
      const f = wishFarByKey[focus.slice(4)]; if (!f) return null;
      const cityR = f.r;
      const musR = (m) => 3.0 + Math.min(m.n, 8) * 0.16;
      const venues = f.venues.map(v => ({ id: null, name: v.name, n: v.list.length, list: v.list }));
      const mFan = relaxFan(f.x, f.y, venues, {
        minR: cityR + musR({ n: 0 }) + 0.4, step: 1.3, sep: 1.4, seedAng: -Math.PI / 2,
        parentR: cityR, gap: 0.8, rOf: musR,
      });
      const nodes = mFan.map((mn) => {
        const m = mn.it, mx = mn.x, my = mn.y;
        const works = [...m.list].sort((a, b) => unseenRank(b) - unseenRank(a));
        const outAng = Math.atan2(my - f.y, mx - f.x);
        const wRof = (w) => (unseenRank(w) === 2 ? 1.8 : unseenRank(w) === 1 ? 1.5 : 1.3);
        const wFan = relaxFan(mx, my, works, {
          minR: mn.r + 1.8 + 0.4, step: 0.8, sep: 0.7, seedAng: outAng - Math.PI / 2,
          parentR: mn.r, gap: 0.6, rOf: wRof,
        });
        const wnodes = wFan.map((wn) => ({ w: wn.it, x: wn.x, y: wn.y, r: wRof(wn.it) }));
        return { m, x: mx, y: my, mr: mn.r, wnodes, nw: works.length, lx: mx, ly: my - (mn.r + 4.2) };
      });
      declutterLeaders(f.x, f.y, cityR, nodes);   // shorten crossing leaders BEFORE measuring reach
      let reach = cityR + 4;
      for (const nd of nodes) {
        reach = Math.max(reach, Math.hypot(nd.x - f.x, nd.y - f.y) + nd.mr + 5.2);
        for (const wn of nd.wnodes) reach = Math.max(reach, Math.hypot(wn.x - f.x, wn.y - f.y) + wn.r);
      }
      return { c: { x: f.x, y: f.y, city: f.city }, nodes, cityR, reach, far: true };
    }
    const c = cities.byCity[focus]; if (!c) return null;
    const museums = c.museums.filter(m => m.n > 0);
    const nm = museums.length || 1;
    const enriched = WORKS.map(enrich);
    // museum fan: starts CLOSE to the city bubble (minR) and adapts — length/angle fall out of the
    // relaxation, so a dense city just pushes its museums a little further, never symmetric-forced.
    const cityR = cityRad(c.n);
    // FIX 3 (2026-07-17): museum bubbles ~1.5x (rOf base 2.4→3.6). FIX 1: pass parentR=cityR so the
    // radius-aware clamp keeps every museum's disc off the city bubble. FIX 2: seed ring hugs the
    // city (minR small) and the radial step is gentle — a dense city packs a tighter fan (relaxation
    // + a second ring) instead of flinging museums across the country.
    // FIX 4 (2026-07-17 r4): museums come down a touch (base 3.6 -> 3.0) to rebalance against the much
    // smaller work dots so the fan reads as a tight halo, not city-sized satellites.
    const musR = (m) => 3.0 + Math.min(m.n, 8) * 0.16;
    // TIGHTER HALO (2026-07-17 r4): pull the museum ring right onto the city (minR offset + step + gap
    // all reduced) so the museums sit as a tight ring around the city bubble, not spokes. The clamp is
    // still radius-aware (parentR=cityR) so no museum disc ever overlaps the city.
    const mFan = relaxFan(c.x, c.y, museums, {
      minR: cityR + musR({ n: 0 }) + 0.4, step: 1.3, sep: 1.4, seedAng: -Math.PI / 2,
      parentR: cityR, gap: 0.8, rOf: musR,
    });
    const nodes = mFan.map((mn, i) => {
      const m = mn.it, mx = mn.x, my = mn.y;
      const works = enriched.filter(w => !w.wish && (w.floored || w.liked) &&
        (Array.isArray(w.seenAt) ? w.seenAt : [w.seenAt]).includes(m.id));
      const nw = works.length;
      // FIX 4 (2026-07-17 r4): the work dots were almost city-sized (4.6/3.8). Shrink ~2.5x to a tight
      // constellation: floored 1.8, liked 1.5. The scale-only fisheye (up to 2.1x) restores hittability
      // on hover. FIX 1: with the smaller radii the ring hugs the museum tightly (seed offset is just the
      // largest work radius, gentle step, sep rebalanced to the smaller discs so the tighter fan still
      // has no overlaps). parentR=mn.r keeps every work disc clear of its museum bubble on all paths.
      // seed the work fan pointing AWAY from the city so works splay outward, not back over the ring
      const outAng = Math.atan2(my - c.y, mx - c.x);
      const wRof = (w) => (w.floored ? 1.8 : 1.5);
      const wFan = relaxFan(mx, my, works, {
        minR: mn.r + 1.8 + 0.4, step: 0.8, sep: 0.7, seedAng: outAng - Math.PI / 2,
        parentR: mn.r, gap: 0.6, rOf: wRof,
      });
      const wnodes = wFan.map((wn, j) => ({ w: wn.it, x: wn.x, y: wn.y, r: wRof(wn.it) }));
      // label sits clear ABOVE the bubble; leader line drawn if the offset is non-trivial
      return { m, x: mx, y: my, mr: mn.r, wnodes, nw, lx: mx, ly: my - (mn.r + 4.2) };
    });
    declutterLeaders(c.x, c.y, cityR, nodes);     // shorten crossing leaders BEFORE measuring reach
    // FIX 2 (2026-07-17): frame from the ACTUAL fan extent (every bubble edge relative to the city
    // anchor) rather than a loose formula, so the focused viewBox always contains the whole fan with
    // a small margin and never leaves the country. reach = furthest bubble edge from the city centre.
    let reach = cityR + 4;
    for (const nd of nodes) {
      reach = Math.max(reach, Math.hypot(nd.x - c.x, nd.y - c.y) + nd.mr + 5.2 /* label */);
      for (const wn of nd.wnodes) reach = Math.max(reach, Math.hypot(wn.x - c.x, wn.y - c.y) + wn.r);
    }
    return { c, nodes, cityR, reach };
  }, [focus, wishFarByKey]);
  // ——— divergence transition (fix 5). grow ramps 0→1 on focus (museums/works ease-OUT of the city
  // bubble) and 1→0 on collapse (they retract back into it). Per-node stagger is applied at render
  // time from the node index so museums unfurl in sequence, then their works. rAF drives it so the
  // leader lines (SVG geometry, not CSS-animatable) interpolate in lockstep with the bubbles.
  const [grow, setGrow] = useState(0);
  const growRaf = React.useRef(0), growFrom = React.useRef(0), growTo = React.useRef(0), growT0 = React.useRef(0);
  const animateGrow = (to, from) => {
    growFrom.current = from == null ? grow : from; growTo.current = to; growT0.current = performance.now();
    if (growRaf.current) cancelAnimationFrame(growRaf.current);
    const DUR = 420;
    const tick = (now) => {
      const p = Math.min(1, (now - growT0.current) / DUR);
      const e = 1 - Math.pow(1 - p, 3);                  // ease-out cubic
      setGrow(growFrom.current + (growTo.current - growFrom.current) * e);
      if (p < 1) growRaf.current = requestAnimationFrame(tick); else growRaf.current = 0;
    };
    growRaf.current = requestAnimationFrame(tick);
  };
  const framePending = React.useRef(false);
  const focusCity = (c) => {
    setFocus(c.city); setGrow(0); animateGrow(1, 0);
    framePending.current = true;                       // frame once `branch` (hence its reach) is ready
  };
  const focusFar = (f) => {
    setFocus("far:" + f.key); setGrow(0); animateGrow(1, 0);
    framePending.current = true;
  };
  // FIX 2 (2026-07-17): frame the focused viewBox from the fan's MEASURED reach (branch.reach), not a
  // formula, so the whole fan fits with a small pad and no dot spills off the country. Runs the frame
  // once per fresh focus (framePending guards against re-frames on unrelated re-renders / hover).
  React.useEffect(() => {
    if (!branch || !framePending.current) return;
    framePending.current = false;
    const half = Math.max(28, branch.reach + 6);      // +6 map-unit breathing pad
    const w = half * 2, h = w * AR;
    commit({ x: branch.c.x - half, y: branch.c.y - h / 2, w, h });
  }, [branch]);
  const clearFocus = () => {
    setHover(null); commit(HOME); animateGrow(0);
    setTimeout(() => setFocus(null), 440);            // retract the branch, then drop it
  };
  React.useEffect(() => {
    const el = svgRef.current; if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const mx = (e.clientX - r.left) / r.width, my = (e.clientY - r.top) / r.height;
      const f = e.deltaY < 0 ? 1 / 1.18 : 1.18, v = vbRef.current;
      const w = Math.min(880, Math.max(70, v.w * f)), h = w * AR;
      commit({ x: v.x + mx * v.w - mx * w, y: v.y + my * v.h - my * h, w, h });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => { el.removeEventListener("wheel", onWheel); if (raf.current) cancelAnimationFrame(raf.current); if (lensRaf.current) cancelAnimationFrame(lensRaf.current); if (growRaf.current) cancelAnimationFrame(growRaf.current); };
  }, []);
  const onDown = (e) => { if (e.button !== 0) return; drag.current = { mx: e.clientX, my: e.clientY, v: vbRef.current, moved: false }; };
  const onMove = (e) => {
    if (drag.current && svgRef.current) {
      const r = svgRef.current.getBoundingClientRect(), d = drag.current;
      if (Math.abs(e.clientX - d.mx) + Math.abs(e.clientY - d.my) > 3) d.moved = true;
      commit({ ...d.v, x: d.v.x - (e.clientX - d.mx) / r.width * d.v.w, y: d.v.y - (e.clientY - d.my) / r.height * d.v.h });
      return;
    }
    const p = clientToMap(e.clientX, e.clientY); if (p) setLensThrottled(p);   // fisheye follows the cursor
  };
  const stop = () => { drag.current = null; };
  const onLeave = () => { drag.current = null; setLensThrottled(null); };
  // touch fallback: no hover, so a single tap sets the lens under the finger AND toggles a gentle
  // semantic zoom step toward that point (tap zoomed-out -> zoom in; tap zoomed-in -> zoom back out);
  // a drag still pans. This keeps tiny bubbles reachable on touch with no hover dependency.
  const touch = React.useRef(null);
  // two-finger pinch → zoom around the finger midpoint (touch-action:none feeds every touch to JS)
  const pinch = React.useRef(null);
  const fingerDist = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  const onTouchStart = (e) => {
    if (e.touches.length >= 2) {
      const [a, b] = [e.touches[0], e.touches[1]];
      pinch.current = { d: fingerDist(a, b) || 1, v: vbRef.current };
      touch.current = null; drag.current = null; return;
    }
    const t = e.touches[0]; if (t) touch.current = { x: t.clientX, y: t.clientY, moved: false, t: Date.now() };
  };
  const onTouchMove = (e) => {
    if (pinch.current && e.touches.length >= 2 && svgRef.current) {
      const [a, b] = [e.touches[0], e.touches[1]], p = pinch.current;
      const nd = fingerDist(a, b); if (nd < 1) return;
      const f = p.d / nd;   // fingers spreading → nd>d → f<1 → smaller viewBox → zoom in
      const r = svgRef.current.getBoundingClientRect();
      const fx = ((a.clientX + b.clientX) / 2 - r.left) / r.width, fy = ((a.clientY + b.clientY) / 2 - r.top) / r.height;
      const w = Math.min(880, Math.max(70, p.v.w * f)), h = w * AR;
      commit({ x: p.v.x + fx * p.v.w - fx * w, y: p.v.y + fy * p.v.h - fy * h, w, h });
      return;
    }
    const t = e.touches[0], d = touch.current; if (!t || !d || !svgRef.current) return;
    if (Math.abs(t.clientX - d.x) + Math.abs(t.clientY - d.y) > 6) {
      if (!drag.current) drag.current = { mx: d.x, my: d.y, v: vbRef.current, moved: true };
      const r = svgRef.current.getBoundingClientRect(), dr = drag.current;
      commit({ ...dr.v, x: dr.v.x - (t.clientX - dr.mx) / r.width * dr.v.w, y: dr.v.y - (t.clientY - dr.my) / r.height * dr.v.h });
      d.moved = true;
    }
  };
  const onTouchEnd = (e) => {
    // end / restart pinch cleanly as fingers lift
    if (pinch.current) { if (e.touches.length >= 2) { const [a, b] = [e.touches[0], e.touches[1]]; pinch.current = { d: fingerDist(a, b) || 1, v: vbRef.current }; } else pinch.current = null; touch.current = null; drag.current = null; return; }
    const d = touch.current; drag.current = null; touch.current = null; if (!d || d.moved) return;
    const p = clientToMap(d.x, d.y); if (!p) return;
    setLens(p);                                   // magnify under the tap (hover-free)
    const v = vbRef.current, out = v.w < 300, f = out ? 1.6 : 1 / 1.6;   // toggle a zoom step
    const w = Math.min(880, Math.max(70, v.w * f)), h = w * AR;
    const el = svgRef.current, r = el.getBoundingClientRect();
    const fx = (d.x - r.left) / r.width, fy = (d.y - r.top) / r.height;
    commit({ x: v.x + fx * v.w - fx * w, y: v.y + fy * v.h - fy * h, w, h });
  };

  // on-screen zoom around the map centre — the touch-friendly path (pinch works too, but buttons
  // are the reliable way on a phone; ⌂ recovers a lost view). Fuad 2026-07-18.
  const zoomCenter = (f) => { const v = vbRef.current; const w = Math.min(880, Math.max(70, v.w * f)), h = w * AR; commit({ x: v.x + 0.5 * v.w - 0.5 * w, y: v.y + 0.5 * v.h - 0.5 * h, w, h }); };

  return (
    <div className="cv-map">
      {/* the long map explainer was removed 2026-08-24 — it cost a block of vertical
          space above the map itself, and the affordances it described (click a city, hover a
          work, scroll to zoom) are all discoverable by doing them. */}
      <div className="cv-map-wrap" onMouseLeave={onLeave}>
        <div className="cv-map-zoom">
          <button type="button" onClick={() => zoomCenter(1 / 1.4)} aria-label="Zoom in" title="Zoom in">+</button>
          <button type="button" onClick={() => zoomCenter(1.4)} aria-label="Zoom out" title="Zoom out">−</button>
          <button type="button" onClick={() => setVb(HOME)} aria-label="Reset view" title="Reset view">⌂</button>
        </div>
        <svg ref={svgRef} viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
          onMouseDown={onDown} onMouseMove={onMove} onMouseUp={stop}
          onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
          {landPath && <path d={landPath} fill="#d3c4ab" stroke="none" />}
          {/* DEFAULT: one bubble per city (click to branch) + the ♥ works you're still chasing.
              FIX 3 (2026-07-17 r4) Z-ORDER: all ♥ leader lines are drawn FIRST, in their own layer,
              so they render BEHIND the orange city bubbles — a line emerges from underneath its city
              and never crosses over the dots. City bubbles paint next, then the ♥ dots on top. */}
          {!focus && wishMarkers.map((mk, i) => {
            if (mk.x === mk.bx && mk.y === mk.by) return null;
            if (!inView(mk.bx, mk.by)) return null;
            const [px, py] = fanAt(mk);
            const [fx, fy] = fish(px, py);
            // (was: a curve, not a spoke, Fuad 2026-08-19 — superseded below)
            // STRAIGHT, NOT BOWED (Fuad 2026-08-24: "let's make the lines straight, unless
            // they're bending to avoid intersecting with other lines"). Ring packing already
            // guarantees leaders inside a city cannot cross — they are radii of concentric
            // circles from one centre — and halo separation stops them meeting a neighbour's.
            // With crossing designed out, the bow was decoration that made the map look tangled.
            //   CORRECTED 2026-08-25: only the first half of that was ever true. Two leaders of
            // ONE halo do share an origin and so cannot cross — that still holds — but "halo
            // separation stops them meeting a neighbour's" did not: the rendered map carried 82
            // crossings between neighbouring cities when this was written. Crossings are now
            // priced directly in the length/bearing solve and stand at 16, the residue being the
            // Randstad and the Île-de-France, where the city ANCHORS are 0.7–4.8 map units apart
            // and the halos have nowhere to be. Straight stays: the conclusion was right even
            // though the reason given for it was wrong, and Fuad asked for straight lines.
            return <path key={"wl" + mk.w.id + "-" + i} d={`M${mk.bx} ${mk.by}L${fx} ${fy}`}
              fill="none" stroke={mk.far ? "oklch(0.5 0.12 150 / .38)" : "oklch(0.55 0.19 18 / .4)"} strokeWidth={0.5 * k} />;
          })}
          {!focus && cities.list.map(c => {
            if (!inView(c.x, c.y)) return null;
            const cr = cityRad(c.n);
            const [fx, fy, fs] = fish(c.x, c.y, cr);
            return (
              <g key={c.city} className="cv-pin" onClick={() => focusCity(c)} style={{ cursor: "pointer" }}>
                <circle cx={fx} cy={fy} r={cr * fs * k * dotMul * bubZoom}
                  fill={c.n ? "oklch(0.55 0.13 46 / .82)" : "rgba(58,47,34,.45)"} stroke="#f4ecdf" strokeWidth={0.6 * k} />
                {/* the halo is capped, so the city's real want-to-see total is stated here rather
                    than implied by a count of dots that is deliberately not all of them */}
                <title>{c.city} — {c.n} work{c.n !== 1 ? "s" : ""} seen · {c.museums.length} museum{c.museums.length !== 1 ? "s" : ""}{wishTotals[c.city] ? ` · ${wishTotals[c.city]} still to see` : ""}{c.n ? " · click to open" : ""}</title>
                {/* CITY LABEL (Fuad 2026-08-24: "the name of the city always above the city blob
                    it represents", and "make sure it doesn't obfuscate the dots"). Two changes:
                    it is no longer gated on size or the lens — every city is named, always — and
                    it clears the WHOLE halo rather than the bubble rim, so it can never sit on
                    top of the work dots ringed around the blob. */}
                {/* Hidden at the world view, fading in as you zoom (Fuad 2026-08-24: "city
                    names should not be visible when maximally zoomed out, only when you start
                    to zoom in"). k is vb.w/880. First set to 0.82, which was the resting frame
                    itself and so fired almost immediately; 0.42 is about a 2.4x zoom, which is
                    where you have actually committed to a region (Fuad: "kicks in too fast, it
                    should kick in when you really zoom in close"). Now TIERED by city size
                    (Fuad 2026-08-25: "the cities even not in-context appear too fast when zooming
                    in") — cityLabelK gives the biggest cities ~0.40 and the smallest ~0.24, so
                    small cities out of context stay unlabelled until you are close, and the whole
                    map no longer lights up at once. The lens (fs>1.25) reveals any name under the
                    cursor early. Each name FADES in over the last stretch before its threshold.
                    CLEARANCE: the label sits above the halo and above its own glyph height.
                    The gap used to be 1.1 + 2.25*(rings+1) dot-radii, which scaled straight off
                    how many works a city holds — Paris at ~6 rings got ~17, Dijon at 0 got ~3,
                    and the two looked like different rules (Fuad: "London, Paris, Amsterdam too
                    far... Dijon is too close. I don't understand why there is such
                    discrepancy"). That was then rewritten as (2.7 + (rings+1)*0.67) * cityScale,
                    which was wrong in a way nothing caught: it estimated the halo's height from
                    the RING COUNT and then multiplied by the halo shrink, so a squeezed city like
                    London worked out at under one dot-radius of clearance while its leaders were
                    pushed OUT past two — the label sat in the dots. Since leader length became a
                    free per-dot quantity there is no ring height to estimate from anyway, so this
                    now reads the halo's MEASURED reach (`wishCityReach`, dot radii above the rim,
                    dot radius already included) and adds a fixed 1.8 of margin. Same units as
                    before, so the range still compresses; it is simply true now. */}
                {(() => {
                  const thr = cityLabelK(cr);
                  if (k >= thr && fs <= 1.25) return null;
                  const op = fs > 1.25 ? 1 : labelFade(k, thr);
                  if (op <= 0) return null;
                  /* Fuad 2026-08-25: big-city labels (London/Paris tier) sat too far out — pull
                     them ~1/3 in by shedding PADDING only, scaled by the same cr tier as
                     cityLabelK. The measured fan reach itself is never reduced: it is the
                     collision floor that keeps the name off the dots, so small cities (t=0)
                     are untouched and no tier can land inside its own fan. */
                  const t = Math.min(1, Math.max(0, (cr - 1.1) / (5.2 - 1.1)));
                  return (
                    {/* Fuad 2026-08-26: labels ×2 font, and HALF the old standoff — the rim
                        clearance stays whole (a label may not enter its bubble), everything
                        beyond it (hair + wish-fan clearance + label gap) is halved. */}
                    <text x={fx} y={fy - (cr * fs * dotMul * bubZoom) * k
                          - 0.5 * (2.4 * k
                            + 2.1 * k * dotMul * dotZoom * ((wishCityReach.get(c.city) || 1.1) + 1.8 - 1.3 * t)
                            + (7 - 5 * t) * k * dotMul * labelZoom)}
                      textAnchor="middle" style={{ fontSize: 13.2 * k * dotMul * labelZoom, opacity: op }}>{c.city}</text>
                  );
                })()}
              </g>
            );
          })}
          {/* FAR CITIES (2026-08-22): the galleries not yet walked, holding the works not yet
              seen. Same map language as the lived layer — a bubble sized by what it holds, a halo
              of its strongest wants, click to branch — but GREEN (Fuad: the first pass used a rose
              near the biography's warmth and the whole map read as one warm mush). Green is the
              unseen register everywhere on this map now; cool against the warm lived layer.
              Hollow was rejected for the work dots once (reads as a hole in the map); these are
              filled for the same reason, and distinguished by hue alone. Labels only from 10
              works up — at 8 the resting view grew a crowd of names (also Fuad). And, like the
              lived layer, only once ZOOMED toward them (Fuad 2026-08-25: names appear too fast):
              the far bubble's radius drives the same tiered threshold, so a big far city labels
              at ~0.40 and a small one only up close, faded in rather than popped. */}
          {!focus && wishFar.map(f => {
            if (!inView(f.x, f.y)) return null;
            const [fx, fy, fs] = fish(f.x, f.y, f.r);
            return (
              <g key={"far" + f.key} className="cv-pin" onClick={() => focusFar(f)} style={{ cursor: "pointer" }}>
                <circle cx={fx} cy={fy} r={f.r * fs * k * dotMul * bubZoom}
                  fill="oklch(0.52 0.09 150 / .55)" stroke="#f4ecdf" strokeWidth={0.5 * k} />
                <title>{f.city} — {f.n} work{f.n !== 1 ? "s" : ""} to see · {f.venues.length} venue{f.venues.length !== 1 ? "s" : ""} · not yet walked · click to open</title>
                {(() => {
                  if (f.n < 10 && fs <= 1.25) return null;
                  const thr = cityLabelK(f.r);
                  if (k >= thr && fs <= 1.25) return null;
                  const op = (fs > 1.25 ? 1 : labelFade(k, thr)) * 0.75;
                  if (op <= 0) return null;
                  return <text x={fx} y={fy - (f.r * fs * dotMul * bubZoom + 1) * k} textAnchor="middle" style={{ fontSize: 6 * k * dotMul * labelZoom, opacity: op }}>{f.city}</text>;
                })()}
              </g>
            );
          })}
          {!focus && wishMarkers.map((mk, i) => {
            if (!inView(mk.bx, mk.by)) return null;
            const [px, py] = fanAt(mk);
            const [fx, fy, fs] = fish(px, py);
            return (
              <g key={mk.w.id + "-" + i} className="cv-wishpin" onClick={() => go("work", mk.w.id)}
                onMouseEnter={e => setHover({ w: mk.w, mx: e.clientX, my: e.clientY, venue: mk.venue, city: mk.city })}
                onMouseMove={e => setHover(h => h && h.w === mk.w ? { ...h, mx: e.clientX, my: e.clientY } : h)}
                onMouseLeave={() => setHover(null)}>
                {/* GREEN IS THE FAR LAYER, NOT EVERY WANT (Fuad 2026-08-22, second pass: "the
                    artworks I've seen kept the old color style… but you've made everything
                    green"). The first green pass painted every chase dot green, including the
                    halos around cities already walked — at rest ALL dots are chase dots, so the
                    whole map went green. The register split he actually wants is by DISCOVERY:
                    dots orbiting a walked city keep the old loved-red/liked-amber, and only the
                    far layer — cities never walked, works to be discovered — wears green.
                    dotZoom starts them smaller at the resting view; full size from ~2.5x zoom. */}
                {/* cityScale must scale the DOT as well as the ring radius: a halo squeezed to
                    clear its neighbour would otherwise pack the same-size dots into a smaller
                    circumference and start overlapping internally — trading one collision for
                    another. See HALO SEPARATION where the factor is computed. */}
                {unseenRank(mk.w) === 2
                  ? <circle cx={fx} cy={fy} r={2.1 * fs * k * dotMul * dotZoom * Math.max(0.82, mk.cityScale || 1)} fill={mk.far ? "oklch(0.45 0.14 150 / .92)" : "oklch(0.55 0.19 18 / .92)"} stroke="#f7efe2" strokeWidth={0.5 * k} />
                  : <circle cx={fx} cy={fy} r={1.7 * fs * k * dotMul * dotZoom * Math.max(0.82, mk.cityScale || 1)} fill={mk.far ? "oklch(0.6 0.11 130 / .9)" : "oklch(0.62 0.12 52 / .9)"} stroke="#f7efe2" strokeWidth={0.45 * k} />}
              </g>
            );
          })}
          {/* FOCUSED: the branch — city → museums → works. grow (0→1) eases every child OUT of the
              city bubble with a per-node stagger; the fisheye reshapes it on top. */}
          {branch && (() => {
            const cx = branch.c.x, cy = branch.c.y, N = branch.nodes.length;
            // stagger: museum i unfurls over its slice of grow; its works trail just behind it
            const mProg = (i) => { const s = N > 1 ? 0.45 * i / (N - 1) : 0; return Math.max(0, Math.min(1, (grow - s) / (1 - s || 1))); };
            const lerp = (a, b, t) => a + (b - a) * t;
            // The opened branch gets the same zoom contraction and bowed connectors as the resting
            // halo — it was left out of the first pass, so clicking a city dropped you back into
            // rigid spokes that sprawled as you zoomed (Fuad 2026-08-19). Museum nodes pull toward
            // the city, work nodes toward their museum.
            const mAt = (nd) => towardsBranch(cx, cy, nd.x, nd.y);
            return (
              <g className="cv-branch">
                {branch.nodes.map((nd, i) => {
                  const g = mProg(i), [tx, ty] = mAt(nd), mx = lerp(cx, tx, g), my = lerp(cy, ty, g);
                  return <path key={"cm" + nd.m.id} d={bow(cx, cy, mx, my)} fill="none" stroke="rgba(58,47,34,.5)" strokeWidth={0.5 * k} style={{ opacity: g }} />;
                })}
                {branch.nodes.map((nd, i) => {
                  const g = mProg(i), [tx, ty] = mAt(nd), mx = lerp(cx, tx, g), my = lerp(cy, ty, g), wg = Math.max(0, (g - 0.3) / 0.7);
                  return nd.wnodes.map((wn, j) => {
                    const [wtx, wty] = towards(tx, ty, wn.x, wn.y);
                    const wx0 = lerp(mx, wtx, wg), wy0 = lerp(my, wty, wg);
                    const [fx, fy, fs] = fish(wx0, wy0);
                    return (
                      <g key={nd.m.id + "-w" + j} className="cv-wishpin" style={{ opacity: wg }} onClick={() => go("work", wn.w.id)}
                        onMouseEnter={e => setHover({ w: wn.w, mx: e.clientX, my: e.clientY, venue: nd.m.name, city: branch.c.city, seen: !branch.far })}
                        onMouseMove={e => setHover(h => h && h.w === wn.w ? { ...h, mx: e.clientX, my: e.clientY } : h)}
                        onMouseLeave={() => setHover(null)}>
                        <path d={bow(mx, my, fx, fy, 0.16, 1.4)} fill="none" stroke="rgba(58,47,34,.26)" strokeWidth={0.3 * k} />
                        {/* red/amber = seen-and-loved/liked; a far branch's works are UNMET, so
                            they stay in the green register like every other unseen mark */}
                        <circle cx={fx} cy={fy} r={wn.r * fs * k * dotMul}
                          fill={branch.far
                            ? (unseenRank(wn.w) === 2 ? "oklch(0.45 0.14 150 / .92)" : "oklch(0.6 0.11 130 / .9)")
                            : (wn.w.floored ? "oklch(0.55 0.19 18 / .92)" : "oklch(0.62 0.12 52 / .9)")} stroke="#f7efe2" strokeWidth={0.4 * k} />
                      </g>
                    );
                  });
                })}
                {branch.nodes.map((nd, i) => {
                  const g = mProg(i), [tx, ty] = mAt(nd), mx = lerp(cx, tx, g), my = lerp(cy, ty, g);
                  const [fx, fy, fs] = fish(mx, my);
                  // LABEL PLACEMENT (Fuad 2026-08-19: the chip read "like a slapstick over a
                  // button", and labels were covering work dots). Two changes:
                  //   · the opaque pill is gone. The name is now halo-stroked text, the same
                  //     treatment the city labels already use, so it stays readable over land and
                  //     sea while occluding a fraction of what a filled rect did.
                  //   · it sits on the side FACING THE CITY. The work fan is deliberately seeded
                  //     pointing away from the city (seedAng, above), so the inward wedge is the
                  //     one part of a museum's surroundings the works never occupy — putting the
                  //     label anywhere else guarantees it lands on top of them.
                  const inward = fy > cy ? -1 : 1;                 // -1 = label above, 1 = below
                  // OVERLAP (Fuad 2026-08-24: "some texts overlap when clicking Paris"). Museums
                  // at similar bearings get labels at the same radius and collide. Stagger the
                  // offset by index so consecutive nodes sit on different lines; the fan order is
                  // by angle, so neighbours in the list are neighbours on the ring.
                  const stagger = (i % 3) * 2.6;
                  const lx = fx, ly = fy + inward * (nd.mr * fs + 3.4 + stagger) * k;
                  return (
                    <g key={"m" + (nd.m.id || nd.m.name)} className="cv-mus" style={{ opacity: g, cursor: nd.m.id ? "pointer" : "default" }}
                      onClick={() => nd.m.id && go("museum", nd.m.id)}>
                      <circle cx={fx} cy={fy} r={nd.mr * fs * k}
                        fill={branch.far ? "oklch(0.45 0.1 150 / .92)" : "oklch(0.5 0.14 46 / .95)"} stroke="#f4ecdf" strokeWidth={0.7 * k} />
                      <text className="cv-map-mlabel" x={lx} y={ly + (inward > 0 ? 1.9 : 0) * k}
                        textAnchor="middle" style={{ fontSize: 7.6 * k, strokeWidth: 1.6 * k }}>{nd.m.name}</text>
                    </g>
                  );
                })}
                <circle cx={cx} cy={cy} r={branch.cityR * 1.55 * k} fill={branch.far ? "oklch(0.36 0.1 150 / .96)" : "oklch(0.42 0.15 30 / .96)"} stroke="#f4ecdf" strokeWidth={0.9 * k} />
                {/* the opened city's name sits ABOVE its blob in the same ink as every other label
                    (Fuad 2026-08-24: "Paris should be also in same black font and the name
                    should be over the blob"). It used to be pale type dropped inside the
                    circle, which read as a different kind of thing from the museum names
                    around it and fought the blob's own fill for contrast. */}
                <text x={cx} y={cy - (branch.cityR * 1.55 + 3.4) * k} textAnchor="middle"
                  style={{ fontSize: 8.4 * k, fontWeight: 700, fill: "var(--ink)" }}>{branch.c.city}</text>
              </g>
            );
          })()}
        </svg>
        {hover && (
          <div className="cv-map-preview" style={{ left: Math.min(hover.mx + 16, (window.innerWidth || 1200) - 210), top: Math.min(hover.my + 16, (window.innerHeight || 800) - 160) }}>
            {hover.w.imgGrid && <img src={proxied(hover.w.imgGrid)} data-orig={hover.w.imgGrid} data-slug={hover.w.id} onError={unproxy} alt="" />}
            <div className="cv-map-preview-t">{hover.w.title}</div>
            <div className="cv-map-preview-s">{hover.w.artist.replace(/\s*\(.*\)$/, "")}{hover.w.year ? " · " + hover.w.year : ""}</div>
            {hover.venue && <div className="cv-map-preview-s">{hover.seen ? "seen at " : "to see at "}{hover.venue}, {hover.city}</div>}
          </div>
        )}
        {(focus || vb.w < 880) && <button className="cv-map-reset" onClick={clearFocus}>{focus ? "← all cities" : "reset view"}</button>}
      </div>
      <div className="cv-map-legend">
        <span><i className="lg-seen" /> museums you've walked</span>
        <span><i className="lg-far" /> holding your wants, not yet walked</span>
        <span><i className="lg-wish" /> loved, not yet met</span>
        <span><i className="lg-like" /> liked, not yet met</span>
      </div>
      <div className="cv-trips">
        {trips.map(([y, cities]) => (
          <div className="cv-trip-row" key={y}>
            <span className="cv-trip-year">{y}</span>
            <span className="cv-trip-cities">{cities.join(" · ")}</span>
          </div>
        ))}
      </div>
      {wishCities.length > 0 && (
        <div className="cv-map-tosee">
          <div className="cv-a-secl">To see — the pilgrimage</div>
          {/* Ranked by TRIP VALUE: floored first, then volume. New York holds more wanted works
              than anywhere (151) and exactly one of them floored him — volume alone would have led
              the page with it. "home" stays the honest word: P195 says where a work is catalogued,
              not what is hanging this week. */}
          <div className="cv-pil-note">
            Where each work lives, by city — the ones worth the trip first. Museums nest inside.
          </div>
          {wishCountries.map(co => {
            const cOpen = openCountry.has(co.cc);
            return (
              <div className="cv-pil-country" key={co.cc}>
                <button className="cv-pil-cityhead cv-pil-cchead" data-on={cOpen} onClick={() => toggleCountry(co.cc)}>
                  <span className="cv-pil-cityname">{co.name}</span>
                  <span className="cv-pil-citymeta">
                    {co.floored > 0 && <b>★ {co.floored}</b>}
                    {co.n} work{co.n === 1 ? "" : "s"} · {co.cities.length} cit{co.cities.length === 1 ? "y" : "ies"}
                  </span>
                  <span className="cv-pil-caret" data-open={cOpen || undefined}>▸</span>
                </button>
                {/* TRANSITION ON DISCLOSURE, BOTH WAYS (Fuad 2026-08-22 ×2: open, then "an
                    appropriate folding transition as well" on close). The shared Fold animates
                    grid-rows in either direction and unmounts at rest — the reels hold ~1,500
                    LazyImg tiles across all venues, so they still never sit in a closed DOM. */}
                <Fold open={cOpen}>{co.cities.map(c => {
                  const open = openCity.has(c.key);
                  return (
                    <div className="cv-pil-city" key={c.key}>
                      <button className="cv-pil-cityhead" data-on={open} onClick={() => toggleCity(c.key)}>
                        <span className="cv-pil-cityname">{c.city}</span>
                        <span className="cv-pil-citymeta">
                          {c.floored > 0 && <b>★ {c.floored}</b>}
                          {c.n} work{c.n === 1 ? "" : "s"} · {c.venues.length} venue{c.venues.length === 1 ? "" : "s"}
                        </span>
                        <span className="cv-pil-caret" data-open={open || undefined}>▸</span>
                      </button>
                      <Fold open={open}>{c.venues.map(v => (
                        <div className="cv-pil-venue" key={v.name}>
                          <div className="cv-pil-venuename">{v.name} <span>· {v.list.length}</span></div>
                          <PilReel works={v.list} go={go} />
                        </div>
                      ))}</Fold>
                    </div>
                  );
                })}</Fold>
              </div>
            );
          })}

          {wishUnplaced.length > 0 && (
            <div className="cv-pil-city">
              <button className="cv-pil-cityhead" data-on={showUnplaced} onClick={() => setShowUnplaced(v => !v)}>
                <span className="cv-pil-cityname">Home not known</span>
                <span className="cv-pil-citymeta">{wishUnplaced.length} works</span>
                <span className="cv-pil-caret" data-open={showUnplaced || undefined}>▸</span>
              </button>
              <Fold open={showUnplaced}>
                <div className="cv-pil-venue">
                  <div className="cv-pil-venuename">No P195 on the record <span>· {wishUnplaced.length}</span></div>
                  <PilReel works={wishUnplaced} go={go} />
                </div>
              </Fold>
            </div>
          )}
          <div className="cv-pil-total r-mono">
            {wishCities.reduce((n, c) => n + c.n, 0) + wishUnplaced.length} works you're chasing, across {wishCities.length} cities
          </div>
          {(window.CANVAS_PILGRIMAGE || []).length > 0 && (
            <React.Fragment>
              <div className="cv-mus-country">Places</div>
              {(window.CANVAS_PILGRIMAGE || []).map(p => (
                <div className="cv-mus-row" key={p.id}>
                  <span className="cv-mus-name">{p.title}</span>
                  <span className="cv-mus-city">{p.city}</span>
                  {p.note && <span className="cv-mus-note">{p.note}</span>}
                </div>
              ))}
            </React.Fragment>
          )}
        </div>
      )}
    </div>
  );
}

// ——— Portrait: reads your taste back to you (Canvas's answer to Rotation's Stories).
// Everything computed client-side from the loaded canon + overlays — no new data.
const hexHue = (hex) => {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex); if (!m) return 0;
  const r = parseInt(m[1], 16) / 255, g = parseInt(m[2], 16) / 255, b = parseInt(m[3], 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (!d) return -1;   // grey → sorts to the end
  let h; if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
  return (h * 60 + 360) % 360;
};
const AFFINITY = new Set(window.CANVAS_AFFINITY || []);

function Portrait({ go }) {
  const PAL = window.CANVAS_PALETTE || {};
  const data = useMemo(() => {
    const works = WORKS.map(enrich);
    // BIOGRAPHY vs HORIZON (Fuad 2026-08-22 QC). Since the photo-import ~40% of the canon is
    // works never seen, and every figure here silently included them — "you've stood in front
    // of 1,894 works" was false, and an imported wish-list could crown the favourite artist.
    // Met works carry the biography; the chase is stated as its own register, like the map.
    const met = works.filter(w => !isUnseen(w));
    const chase = works.filter(isUnseen);
    const loved = met.filter(w => w.floored || w.favorite || w.liked);
    const museums = new Set(), countries = new Set();
    for (const w of met) for (const id of (Array.isArray(w.seenAt) ? w.seenAt : [w.seenAt || w.at])) { const m = MUS_BY_ID[id]; if (m) { museums.add(m.id); countries.add(m.country); } }
    const chaseCities = new Set();
    for (const w of chase) { const h = homeOf(w); if (h && h.city) chaseCities.add(h.city); }
    // artists ranked by impact — met works only
    const byArtist = {};
    for (const w of met) { if (!w.artistId) continue; const r = byArtist[w.artistId] = byArtist[w.artistId] || { id: w.artistId, name: w.artist.replace(/\s*\(.*\)$/, ""), n: 0, love: 0 }; r.n++; if (w.floored || w.favorite) r.love += 3; if (w.liked) r.love += 1; }
    const artists = Object.values(byArtist).sort((a, b) => b.love - a.love || b.n - a.n);
    const found = artists.filter(a => !AFFINITY.has(a.id) && a.love >= 4).slice(0, 14);
    // movements (loved among met)
    const movCount = {};
    // via movsOf so the labels are the cleaned ones the Wall's chips use — these bars link there
    for (const w of loved) for (const m of movsOf(w)) movCount[m] = (movCount[m] || 0) + 1;
    const movements = Object.entries(movCount).sort((a, b) => b[1] - a[1]).slice(0, 8);
    // centuries — met and chase kept apart, the same two registers the map wears
    const cent = {};
    for (const w of works) { if (!w.year) continue; const c = Math.floor((w.year - 1) / 100) + 1; const e = cent[c] = cent[c] || { met: 0, chase: 0 }; e[isUnseen(w) ? "chase" : "met"]++; }
    const centuries = Object.entries(cent).map(([c, v]) => ({ c: +c, met: v.met, chase: v.chase, n: v.met + v.chase })).sort((a, b) => a.c - b.c);
    // palette spectrum — dominant swatch of every work that has one, sorted by hue
    const swatches = [];
    for (const w of works) { const p = PAL[w.id]; if (p && p[0]) swatches.push(p[0]); }
    swatches.sort((a, b) => hexHue(a) - hexHue(b));
    // the spectrum, named: cluster the swatches into hue families the caption can speak
    const famDef = [["umber", 0, 50], ["ochre", 50, 78], ["olive", 78, 150], ["verdigris", 150, 200], ["slate", 200, 262], ["violet", 262, 312], ["rose", 312, 360]];
    const famCount = { grey: 0 };
    for (const c of swatches) { const h = hexHue(c); if (h < 0) { famCount.grey++; continue; } const f = famDef.find(([, a, b]) => h >= a && h < b); if (f) famCount[f[0]] = (famCount[f[0]] || 0) + 1; }
    const families = Object.entries(famCount).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
    // what you keep looking at — depicted motifs (P180), weighted by love. Proper nouns are
    // dropped (sitters and places aren't motifs) and pure atmosphere is stoplisted, or "sky"
    // wins every taste it is pointed at.
    const STOP = new Set(["sky", "cloud", "clouds", "daylight", "shadow", "grass", "standing", "sitting", "strolling", "contre-jour", "landscape"]);
    const subjCount = {};
    // HUNT-FIRST (Fuad 2026-08-26): motifs now come from OUR OWN prose (art_hunt.js — mined
    // from tours/reads, incl. the conditions Wikidata never records: morning, nocturne, mist).
    // Wikidata P180 stays only as the fallback for works with no text yet, so coverage grows
    // as tours complete — which is the accuracy plan.
    const HUNT = window.CANVAS_HUNT || {};
    for (const w of works) {
      const wt = (w.floored || w.favorite) ? 3 : w.liked ? 1 : 0; if (!wt) continue;
      const h = HUNT[w.id];
      if (h) {
        for (const ft of h) { const t = ft.split(':')[1]; if (STOP.has(t)) continue; subjCount[t] = (subjCount[t] || 0) + wt; }
        continue;
      }
      const s = SUBJ[w.id]; if (!s) continue;
      for (const d of (s.d || [])) { const raw = String(d); if (/^[A-ZÀ-Ż]/.test(raw)) continue; const t = raw.toLowerCase(); if (STOP.has(t)) continue; subjCount[t] = (subjCount[t] || 0) + wt; }
    }
    // 14 → 24 (Fuad 2026-08-26: "let 3 rows be displayed") — with the hunt terms feeding
    // this, the chip cloud earns roughly three wrapped rows at desktop width.
    const motifs = Object.entries(subjCount).sort((a, b) => b[1] - a[1]).slice(0, 24);
    // breadth vs depth — the whole canon speaks here (an artist chased is still a taste)
    const perArtist = {}; for (const w of works) if (w.artistId) perArtist[w.artistId] = (perArtist[w.artistId] || 0) + 1;
    const singles = Object.values(perArtist).filter(n => n === 1).length;
    const deepEntry = Object.entries(perArtist).sort((a, b) => b[1] - a[1])[0];
    const deepWork = deepEntry && works.find(w => w.artistId === deepEntry[0]);
    return {
      total: met.length, loved: loved.length,
      floored: met.filter(w => w.floored || w.favorite).length,
      museums: museums.size, countries: countries.size,
      chase: chase.length, chaseCities: chaseCities.size,
      artists, found, movements, centuries, swatches, families, motifs,
      breadth: { artists: Object.keys(perArtist).length, singles, deepId: deepEntry ? deepEntry[0] : null, deepN: deepEntry ? deepEntry[1] : 0, deepName: deepWork ? deepWork.artist.replace(/\s*\(.*\)$/, "") : "" },
      topMovement: movements[0], favArtist: artists[0],
    };
  }, []);

  const cy = (c) => c >= 1 ? c + (["th", "st", "nd", "rd"][((c % 100 - c % 10 !== 10) && c % 10 < 4) ? c % 10 : 0] || "th") : "";
  const maxCent = Math.max(...data.centuries.map(c => c.n), 1);
  const maxMov = data.movements.length ? data.movements[0][1] : 1;

  return (
    <div className="cv-portrait">
      <p className="cv-p-read">
        You've stood in front of <b>{data.total}</b> works across <b>{data.museums}</b> museums in <b>{data.countries}</b> countries —
        {" "}<b>{data.loved}</b> of them moved you, <b>{data.floored}</b> stopped you cold.
        {data.chase > 0 && <> Another <b onClick={() => go("map")} style={{ cursor: "pointer", color: "oklch(0.45 0.12 150)" }}>{data.chase}</b> are waiting for you in <b>{data.chaseCities}</b> cities.</>}
        {data.favArtist && <> The artist you return to most is <b onClick={() => go("artist", data.favArtist.id)} style={{ cursor: "pointer", color: "var(--accent)" }}>{data.favArtist.name}</b>.</>}
        {data.topMovement && <> Your eye lives in <b onClick={() => go("wall", movSlug(data.topMovement[0]))} style={{ cursor: "pointer", color: "var(--accent)" }}>{data.topMovement[0]}</b> — it accounts for more of what you love than any other movement, by far.</>}
      </p>

      <div className="cv-p-sec">
        <div className="cv-p-lbl">The palette of your taste</div>
        <div className="cv-p-spectrum">{data.swatches.map((c, i) => <i key={i} style={{ background: c }} />)}</div>
        <div className="cv-p-note">
          every work's dominant colour, {data.swatches.length} of them, sorted across the spectrum —
          {" "}mostly <b>{data.families[0] && data.families[0][0]}</b> and <b>{data.families[1] && data.families[1][0]}</b>
          {data.families[2] && <>, a seam of <b>{data.families[2][0]}</b></>}
          {" "}({data.families.slice(0, 3).map(([, n]) => n).join(" / ")} works)
        </div>
      </div>

      <div className="cv-p-cols">
        <div className="cv-p-sec">
          <div className="cv-p-lbl">Where your love lives — movements</div>
          {data.movements.map(([m, n]) => (
            <div className="cv-p-bar cv-p-barlink" key={m} onClick={() => go("wall", movSlug(m))}
              title={`see every work on the wall by artists working in ${m}`}>
              <span className="cv-p-barlbl">{m}</span>
              <span className="cv-p-bartrack"><i style={{ width: (n / maxMov * 100) + "%" }} /></span>
              <span className="cv-p-barn">{n}</span>
            </div>
          ))}
        </div>

        <div className="cv-p-sec cv-p-sec-cent">
          <div className="cv-p-lbl">Across the centuries</div>
          {/* two registers, stacked: sienna = met, green = still chasing — the map's colour
              grammar carried over, so the histogram stops silently mixing the two.
              The key sits ABOVE the chart so the chart can be pushed to the section's floor
              (margin-top:auto) and its bars share a baseline with the movements bars beside
              it (Fuad 2026-08-22: "align floor-wise"). */}
          <div className="cv-p-note" style={{ marginTop: 2 }}><i className="cv-p-key" /> met · <i className="cv-p-key cv-p-key-chase" /> still chasing</div>
          <div className="cv-p-cent">
            {data.centuries.map(({ c, n, met, chase }) => (
              <div className="cv-p-centcol" key={c} title={`${cy(c)} century — ${met} met, ${chase} to see`}>
                {chase > 0 && <span className="cv-p-centbar cv-p-centbar-chase" style={{ height: (chase / maxCent * 100) + "%" }} />}
                {met > 0 && <span className="cv-p-centbar" style={{ height: (met / maxCent * 100) + "%" }} />}
                <span className="cv-p-centlbl">{c}00s</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* "Where love struck hardest" was tried here and cut (Fuad 2026-08-22) — the hit-rate
          framing didn't earn its place. Motifs moved to the page's END, also his call. */}
      {/* "Breadth and depth" DISABLED "for now" (Fuad 2026-08-22) — kept in place rather than
          deleted because the framing may return; the data.breadth computation still runs. */}
      {false && (
        <div className="cv-p-sec">
          <div className="cv-p-lbl">Breadth and depth</div>
          <p className="cv-p-prose">
            Your canon spans <b>{data.breadth.artists}</b> artists — <b>{data.breadth.singles}</b> of them
            represented by a single work, one encounter that earned its place. At the other end
            {data.breadth.deepId && <> stands <b onClick={() => go("artist", data.breadth.deepId)} style={{ cursor: "pointer", color: "var(--accent)" }}>{data.breadth.deepName}</b> with <b>{data.breadth.deepN}</b>.</>}
            {" "}A taste that collects widely and digs where it matters.
          </p>
        </div>
      )}

      {data.found.length > 0 && (
        <div className="cv-p-sec">
          <div className="cv-p-lbl">Who your eye chose</div>
          <div className="cv-p-note" style={{ marginTop: 0, marginBottom: 12 }}>your most-loved artists beyond the handful you walked in naming — ranked by how hard they hit</div>
          <div className="cv-p-found">
            {data.found.map(a => (
              <div className="cv-p-foundchip" key={a.id} onClick={() => go("artist", a.id)}>
                {AD.artists[a.id] && AD.artists[a.id].image && <LazyImg src={AD.artists[a.id].image} alt="" />}
                <div><b>{a.name}</b><span>{a.n} work{a.n > 1 ? "s" : ""} · {a.love} pts</span></div>
              </div>
            ))}
          </div>
        </div>
      )}
      {data.motifs.length > 0 && (
        <div className="cv-p-sec">
          <div className="cv-p-lbl">What you keep looking at</div>
          <div className="cv-p-note" style={{ marginTop: 0, marginBottom: 12 }}>the things depicted in the works you love, weighted by how hard they hit</div>
          <div className="cv-p-motifs">
            {data.motifs.map(([t, n]) => (
              <span className="cv-p-motif" key={t} title={`${n} love-weighted points`}>{t}<i>{n}</i></span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ——— Home: one uniform grid — curated lead sequence followed by a deterministic
// day-seeded round-robin spread of liked/loved works, one per artist, images required.
// Lead order: two hand-pinned works, then impressionist/post-impressionist liked/floored
// works (best-per-artist, quality-sorted), with the two Leech paintings spliced in at
// ~position 6.  The seed rotates daily so the spread shifts without random flicker.
// No latest-skew: recency plays no role; the spread is artist-diversity + quality-gated.
// PINNED on Home — always present, never rotated out (Fuad 2026-08-13).
const HOME_LEAD_IDS = ["monet-woman-with-a-parasol", "podkowinski-szal-uniesien"];
const HOME_LEECH_IDS = ["leech-the-sunshade", "leech-convent-garden"];
// Deterministic per-day seed + PRNG. Everything not pinned rotates off this, so the wall is
// stable for a whole day (no flicker between renders) and genuinely different tomorrow.
// Previously the day only rotated the ARTIST ORDER of the round-robin while each artist always
// contributed their single best work — so the same ~24 pictures came back every day, reshuffled.
const homeDaySeed = () => {
  const d = new Date();
  return d.getFullYear() * 1000 + Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
};
const mulberry32 = (a) => () => {
  a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const seededShuffle = (arr, rnd) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const IMPRESSIONIST_RE = /impressionis/i;   // matches "Impressionism" + "Post-impressionism"
const HOME_SPREAD_CAP = 24;   // spread cards (after lead); total wall ~28 max

// ——— homeHang — the curated daily wall: pinned leads, five impressionists that rotate each day,
// the Leech works spliced at their fixed position, then a round-robin spread over floored works.
// Lifted out of HomeView (Fuad 2026-08-20) so The Wall can offer the same thing without a second
// implementation drifting away from this one. It is a SELECTION and an ORDER, which is why it is a
// function and not a sort: no chip could reproduce the pinning or the day seed.
function homeHang(all) {
    const placed = new Set();
    // HOME IS FLOORED-ONLY (Fuad 2026-08-19: "Home should strictly be built from rotating artworks
    // that floored me"). Two exclusions matter and neither is obvious from the flag alone:
    //   · `liked` is out. It used to seed both the leads and the spread, and after the import it
    //     means "liked the look of a thumbnail in a matcher" for well over a thousand rows.
    //   · floored WISH/UNSURE works are out too. Their ★ came from loving a candidate on screen,
    //     not from being floored in the room — 68 of the 179 ★ works are that. "Floored me" is a
    //     claim about having been there.
    // Leaves 110 works across 51 artists, which is deep enough that the daily rotation genuinely
    // turns the wall over rather than reshuffling the same two dozen.
    const flooredMet = (w) => (w.floored || w.favorite) && !isUnseen(w) && (w.imgGrid || w.img);

    // helper: resolve the primary movement label for a work
    const movLabel = (w) => {
      const a = AD.artists[w.artistId];
      const q = a && a.movementQids && a.movementQids[0];
      return (q && (AD.movements || {})[q]) || null;
    };

    // 1. resolve the two explicit lead works (must have an id match in canon)
    const byId = {};
    for (const w of all) byId[w.id] = w;
    // hand-picked leads are held to the same bar — leech-convent-garden is liked, not floored,
    // so it no longer opens the page
    const leadExplicit = HOME_LEAD_IDS.map(id => byId[id]).filter(w => w && flooredMet(w));
    for (const w of leadExplicit) placed.add(w.id);

    // 2. impressionist / post-impressionist FLOORED works with images, best per artist
    const impPool = all.filter(w =>
      !placed.has(w.id) && flooredMet(w) && IMPRESSIONIST_RE.test(movLabel(w))
    );
    // sort: floored/favorite first, then liked; within tier by year ascending
    impPool.sort((a, b) => weight(a) - weight(b) || (a.year || 9999) - (b.year || 9999));
    // one best work per artist
    const impByArtist = {};
    for (const w of impPool) {
      const key = w.artistId || w.id;
      if (!impByArtist[key]) impByArtist[key] = w;
    }
    // up to 5 impressionist leads — WHICH five rotate daily (they were previously a fixed
    // quality-sorted slice, so the same five sat there permanently)
    const impRnd = mulberry32(homeDaySeed());
    const impLeads = seededShuffle(Object.values(impByArtist), impRnd).slice(0, 5);
    for (const w of impLeads) placed.add(w.id);

    // 3. Leech works — leech has no movementQids so splice them in explicitly at ~position 6
    //    (after lead[0..1] + 3 impressionists, i.e. after index 4 in the assembled sequence)
    const leechWorks = HOME_LEECH_IDS.map(id => byId[id]).filter(w => w && flooredMet(w));
    for (const w of leechWorks) placed.add(w.id);

    // assemble lead: explicit[0..1] + impLeads[0..2] + leechs + impLeads[3..4]
    const lead = [
      ...leadExplicit,
      ...impLeads.slice(0, 3),
      ...leechWorks,
      ...impLeads.slice(3),
    ];

    // 4. spread pool: floored works he actually met, not already placed
    const pool = all.filter(w => !placed.has(w.id) && flooredMet(w));

    // 5. group by artistId, sort each bucket by quality
    const byArtist = {};
    for (const w of pool) {
      const key = w.artistId || w.id;
      (byArtist[key] = byArtist[key] || []).push(w);
    }
    for (const key of Object.keys(byArtist)) {
      byArtist[key].sort((a, b) => weight(a) - weight(b));
    }

    // 6. daily rotation. Two things turn, not one: the artist ORDER, and WHICH work each
    //    artist contributes — the second is what actually changes the wall's content.
    const seed = homeDaySeed();
    const rnd = mulberry32(seed);
    const artistKeys = seededShuffle(Object.keys(byArtist).sort(), rnd);

    // 7. round-robin fill up to HOME_SPREAD_CAP, each artist starting at a day-dependent
    //    index into their own bucket so a prolific artist shows a different picture daily
    const picks = [];
    let round = 0;
    outer: while (picks.length < HOME_SPREAD_CAP) {
      let any = false;
      for (const key of artistKeys) {
        const bucket = byArtist[key];
        if (round >= bucket.length) continue;
        const w = bucket[(seed + round) % bucket.length];
        if (!w || picks.includes(w)) continue;
        picks.push(w);
        any = true;
        if (picks.length >= HOME_SPREAD_CAP) break outer;
      }
      if (!any) break;
      round++;
    }

    return [...lead, ...picks];
}

// HomeView lived here until 2026-08-20. It was an intro line over homeHang(all) — the Wall renders
// the same set from the same function with the chip lit, so keeping a second surface for it only
// gave the two copies somewhere to drift apart.

// ——— Search: live-filter across all enriched works (title + artist + museum name).
// Results appear as a dropdown (max 12). Clicking a work opens its Reader directly.
// Museum-name hits navigate to the museums view. ESC / click-outside closes.
// Keyboard: Arrow up/down moves selection; Enter opens the highlighted hit.
// Mobile: icon-only button expands to a full-width input.

// fold: NFD + strip combining marks → case-insensitive diacritic-insensitive substring match
const fold = (s) => (s || "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

// SUBJECT SEARCH (art_subjects.js — Wikidata depicts P180 + genre P136). Covers 1,100 of 1,868
// works. Only this layer is trusted: mining the reads for subjects was built, measured at ~30%
// corroboration and left unwired — see DATA_NOISE.md §8. Note it can find dogs and the sea but
// never "morning": Wikidata records objects and genres, never conditions.
const SUBJ = window.CANVAS_SUBJECTS || {};
// Query expansion, so the word you reach for finds the word Wikidata used. One-way: the typed term
// on the left is widened into the terms on the right before matching.
const SUBJ_SYN = {
  ocean: ["sea", "marine", "seascape", "water"], sea: ["sea", "marine", "seascape"],
  coast: ["coast", "beach", "shore", "cliff", "harbour", "bay"],
  landscape: ["landscape", "countryside", "rural"], seascape: ["marine", "sea"],
  dog: ["dog", "puppy", "hound"], dogs: ["dog", "puppy", "hound"],
  cat: ["cat", "kitten"], horse: ["horse", "equestrian", "rider"], horses: ["horse", "equestrian"],
  bird: ["bird", "swan", "crow", "raven", "gull", "peacock"], birds: ["bird", "swan", "crow"],
  flower: ["flower", "blossom", "rose", "lily", "iris"], flowers: ["flower", "blossom", "rose", "lily"],
  tree: ["tree", "forest", "wood"], trees: ["tree", "forest", "wood"],
  mountain: ["mountain", "peak", "alp"], mountains: ["mountain", "peak", "alp"],
  boat: ["boat", "ship", "sail"], boats: ["boat", "ship", "sail"], ship: ["ship", "boat", "sail"],
  snow: ["snow", "winter", "ice"], sky: ["sky", "cloud"], cloud: ["cloud", "sky"], clouds: ["cloud", "sky"],
  nude: ["nude", "nudity"], nudes: ["nude", "nudity"],
  portrait: ["portrait"], portraits: ["portrait"],
  selfportrait: ["self-portrait"], "self portrait": ["self-portrait"],
  stilllife: ["still life"], "still life": ["still life"],
  religious: ["religious art", "saint", "christ", "angel", "madonna"],
  myth: ["mythological", "venus", "apollo", "diana", "nymph"], mythology: ["mythological", "venus", "apollo"],
  city: ["cityscape", "city", "street", "town"], street: ["street", "cityscape"],
  war: ["battle", "war", "soldier", "military"], battle: ["battle", "war", "soldier"],
  river: ["river", "seine", "stream"], garden: ["garden", "park"],
  woman: ["woman", "girl"], women: ["woman", "girl"], man: ["man", "boy"], men: ["man", "boy"],
  child: ["child", "girl", "boy", "infant"], children: ["child", "girl", "boy"],
};
const expandQuery = (needle) => SUBJ_SYN[needle] || [needle];
const subjTerms = (id) => {
  const s = SUBJ[id]; if (!s) return "";
  return [...(s.d || []), ...(s.g || [])].join(" ");
};
// TOKENS, not substrings. Matching a subject bag with `includes` is quietly wrong: "sea" hits
// "seat" (Whistler's Mother depicts a seat), "war" hits "Black Lion Wharf", "ice" hits "office".
// Each work gets a set of whole labels plus the whole words inside them, and a term must equal one.
const subjTokenSet = (id) => {
  const s = SUBJ[id]; if (!s) return null;
  const labels = [...(s.d || []), ...(s.g || [])].map(fold);
  if (!labels.length) return null;
  const toks = new Set(labels);                       // keeps multi-word labels: "still life"
  for (const l of labels) for (const word of l.split(/[^a-z0-9]+/)) if (word.length > 2) toks.add(word);
  return toks;
};

// build the search index once at module level (enriched canon + museum name lookup)
const SEARCH_INDEX = (() => {
  const enriched = WORKS.map(enrich);
  return enriched.map(w => {
    const musNames = w.venues.map(v => v.name.replace(/\s*\(.*\)$/, "")).join(" ");
    const subj = subjTerms(w.id);
    return {
      id: w.id,
      title: w.title.replace(/^TBC — /, ""),
      artist: w.artist.replace(/\s*\(.*\)$/, ""),
      musNames,
      musIds: w.venues.map(v => v.id),
      imgGrid: w.imgGrid || null,
      subj,
      // pre-folded haystack for fast matching
      hay: fold(w.title + " " + w.artist + " " + musNames),
      // subjects are a TOKEN SET, kept separate so a title match still outranks a subject match —
      // searching "venus" should lead with the painting called Venus, not everything depicting her
      stok: subjTokenSet(w.id),
    };
  });
})();

// artists are searchable too (Fuad 2026-07-24): one entry per canon artist, portrait thumb
// where Wikidata has one, routed to the artist page (#/artist/<id>).
const ARTIST_SEARCH_INDEX = (() => {
  const by = {};
  for (const w of WORKS) {
    if (!w.artistId) continue;
    const r = (by[w.artistId] = by[w.artistId] || { id: w.artistId, name: (w.artist || "").replace(/\s*\(.*\)$/, ""), n: 0 });
    r.n++;
  }
  return Object.values(by).map(r => {
    const a = AD.artists[r.id] || {};
    const name = a.label || r.name;
    return {
      kind: "artist", id: r.id, title: name,
      artist: `${r.n} ${r.n === 1 ? "work" : "works"} in the canon${a.desc ? " · " + a.desc : ""}`,
      imgGrid: a.image ? a.image.replace(/width=\d+/, "width=160") : null,
      hay: fold(name),
    };
  });
})();

function SearchBar({ go }) {
  // The bar is always present now (Fuad 2026-08-19: "an actual search bar ready to go"); `open`
  // survives only to gate the results panel and to be the thing "/" and Cmd-K focus.
  const [open, setOpen] = useState(true);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  // TWO INTENTS, kept apart — the same split Rotation draws between Names and Themes. "names"
  // searches what a thing IS CALLED (title, artist, museum); "subjects" searches what a picture
  // CONTAINS or IS (Wikidata depicts + genre). Muddling them makes both worse: a subject query
  // buries its hits under coincidental title matches, and a name query gets padded with works
  // that merely depict the word.
  const [mode, setMode] = useState("names");
  const huntGen = useLazyGen();   // re-run results when the hunt model lands mid-typing
  const inputRef = useRef(null);
  const wrapRef = useRef(null);

  const results = useMemo(() => {
    const needle = fold(q);
    if (!needle || needle.length < 1) return [];
    // SUBJECTS mode: only what the picture contains or is. No title/artist matching at all, so the
    // list is not padded with works that merely happen to have the word in their name, and it can
    // run deeper than the 12 a name search wants.
    if (mode === "subjects") {
      // SEMANTIC TIER (2026-08-26): once the hunt model has loaded (search-bar focus kicks
      // it), free-text queries rank the whole read corpus by meaning — "quiet snow at dusk"
      // works. Until it loads (or if it failed), the Wikidata-token tier below answers
      // exactly as before. The keyword hunt index rides inside huntSearch as a boost only.
      if (HUNT_STATE && needle.length >= 3) {
        const hits = huntSearch(q, 40);
        if (hits && hits.length) {
          const byId = new Map(SEARCH_INDEX.map(it => [it.id, it]));
          const out = [];
          for (const h of hits) {
            const it = byId.get(h.id);
            if (it) out.push({ kind: "work", ...it, via: "hunt" });
          }
          if (out.length) return out;
        }
      }
      const terms = expandQuery(needle).map(fold);
      const out = [];
      for (const it of SEARCH_INDEX) {
        if (!it.stok || !terms.some(t => it.stok.has(t))) continue;
        out.push({ kind: "work", ...it, via: "subject" });
        if (out.length >= 60) break;
      }
      return out;
    }
    // NAMES mode: what a thing is called. Subjects are deliberately absent — they have their own
    // mode now, and mixing them here was padding name searches with coincidental depictions.
    const hits = [];
    const musHits = new Map();                 // museumId → museum name (deduped)
    for (const it of SEARCH_INDEX) {
      // mark whether the match came from museum-name only
      const inTitle = fold(it.title).includes(needle) || fold(it.artist).includes(needle);
      const inMus = fold(it.musNames).includes(needle);
      if (inTitle || inMus) {
        hits.push({ kind: "work", ...it });
        if (inMus && !inTitle) {
          // surface museum as a dedicated result too
          for (let i = 0; i < it.musIds.length; i++) {
            const mid = it.musIds[i];
            if (!musHits.has(mid)) musHits.set(mid, true);
          }
        }
      }
      if (hits.length >= 20) break;
    }
    // deduplicate museum hits and prepend them when search term matches a museum name directly
    const musResults = [];
    for (const [mid] of musHits) {
      const mn = MUS_BY_ID[mid];
      if (mn && fold(mn.name).includes(needle)) {
        musResults.push({ kind: "museum", id: mid, title: mn.name.replace(/\s*\(.*\)$/, ""), artist: mn.city, imgGrid: null });
      }
    }
    // artist hits lead (they're the broadest destination), then museums, then works
    const artistResults = ARTIST_SEARCH_INDEX.filter(a => a.hay.includes(needle)).slice(0, 3);
    return [...artistResults, ...musResults, ...hits].slice(0, 12);
  }, [q, mode, huntGen]);

  // reset selection when results change
  useEffect(() => { setSel(0); }, [results]);

  // close on click-outside
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false); setQ("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const openResult = (r) => {
    if (r.kind === "museum") { go("museum", r.id); }   // straight to the venue page, not the index
    else if (r.kind === "artist") { go("artist", r.id); }
    else { go("work", r.id); }
    setOpen(false); setQ("");
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") { setOpen(false); setQ(""); return; }
    if (results.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setSel(s => Math.min(s + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel(s => Math.max(s - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (results[sel]) openResult(results[sel]); }
  };

  const expand = () => { setOpen(true); setTimeout(() => inputRef.current && inputRef.current.focus(), 0); };

  // "/" (or Cmd/Ctrl-K) summons search from anywhere — same muscle memory as Rotation/Culture
  useEffect(() => {
    const onKey = (e) => {
      const el = e.target;
      const typing = el && (/(input|textarea|select)/i.test(el.tagName || "") || el.isContentEditable);
      if (((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") || (e.key === "/" && !typing)) {
        e.preventDefault(); expand();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="cv-search" ref={wrapRef}>
      <div className="cv-search-box">
        <input
          ref={inputRef}
          className="cv-search-input"
          type="search"
          /* the placeholder is the only signpost that subject search exists, so it names what the
             active mode will actually match rather than describing search in general */
          placeholder={mode === "subjects" ? "sea, dogs, landscape, battle…" : "title, artist, museum…"}
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => { setOpen(true); ensureHuntModel(); }}
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
        />
        {q && <button className="cv-search-dismiss" onClick={() => { setQ(""); inputRef.current && inputRef.current.focus(); }} aria-label="Clear">✕</button>}
      </div>
      {open && q.trim() && (
        <div className="cv-search-drop">
          {/* mode toggle lives IN the panel, not in the header — the header bar stays a bar, and
              the choice appears exactly when there is a result set to re-cast. */}
          <div className="cv-search-modes">
            <button data-on={mode === "names"} onMouseDown={e => { e.preventDefault(); setMode("names"); setSel(0); }}>Names</button>
            <button data-on={mode === "subjects"} onMouseDown={e => { e.preventDefault(); setMode("subjects"); setSel(0); }}>Subjects</button>
            <span className="cv-search-modehint">
              {mode === "subjects" ? "what a picture shows or is" : "title · artist · museum"}
            </span>
          </div>
          {results.length === 0 && (
            <div className="cv-search-empty">
              {mode === "subjects"
                /* be specific about the limit rather than implying the work does not exist —
                   time of day and mood are absent from the source, not from the collection */
                ? <>Nothing catalogued as “{q.trim()}”. Subjects come from Wikidata, which records things and genres — not times of day, weather or mood.</>
                : <>No title, artist or museum matches “{q.trim()}”.</>}
            </div>
          )}
          {results.map((r, i) => (
            <div key={r.kind + r.id} className={"cv-search-hit" + (i === sel ? " cv-search-hit-sel" : "")}
              onMouseEnter={() => setSel(i)}
              onMouseDown={e => { e.preventDefault(); openResult(r); }}>
              {r.imgGrid
                ? <LazyImg className="cv-search-thumb" src={r.imgGrid} alt="" />
                : <span className="cv-search-thumb cv-search-thumb-empty" />}
              <span className="cv-search-hit-text">
                <span className="cv-search-hit-title">{r.title}</span>
                <span className="cv-search-hit-sub">{r.kind === "museum" ? "Museum · " : r.kind === "artist" ? "Artist · " : ""}{r.artist}
                  {/* say WHY a work with an unrelated title surfaced — searching "ocean" returning
                      "Impression, Sunrise" only makes sense once you can see it matched on subject */}
                  {r.via === "subject" && r.subj && <span className="cv-search-why"> · {r.subj.split(" ").slice(0, 6).join(" ")}</span>}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function App() {
  const route = useRoute();
  const go = (view, id) => { location.hash = id ? "/" + view + "/" + id : view === "home" ? "/" : "/" + view; };
  // lazy data tier: re-render the tree when a lazy overlay lands (render-scope readers see it
  // immediately), and prefetch on an idle timer so the overlays are usually resident before
  // the first click (Culture's idle-preload idiom)
  useLazyGen();
  useEffect(() => {
    const t = setTimeout(ensureLazyData, 1200);
    return () => clearTimeout(t);
  }, []);
  // deep links / navigation into surfaces that read the lazy overlays skip the idle wait
  useEffect(() => {
    if (["study", "work", "museum", "museums", "deck", "artist"].includes(route.view)) ensureLazyData();
  }, [route.view]);
  // HOME IS FOLDED INTO THE WALL (Fuad 2026-08-20). useRoute already parses "#/" as view="wall",
  // so the landing page IS the wall; it just opens with the today's-hang chip lit. There is no
  // second surface and no second nav entry — the chip is the whole difference, and turning it off
  // is how you get the full wall. "#/wall/<style+style>" still carries a style filter in the id.
  const view = route.view === "work" ? "work" : route.view;
  // WHAT SITS BEHIND THE READER (Fuad 2026-08-19). #/work/<id> and #/study/<id> are overlays, but
  // neither matched a branch in the content switch below, so both fell through to the default and
  // dropped HOME behind them — open a work from the map and the map vanished under the reader,
  // reappearing only on close. Remember the last real page and keep rendering that instead.
  // A ref, not state: it must already hold the previous page on the render where the overlay opens,
  // and it must never itself trigger a re-render. Cold deep-links to #/work/<id> have no previous
  // page, so they keep the old behaviour and land on the wall.
  const bgRoute = useRef({ view: "wall", id: null });
  if (route.view !== "work" && route.view !== "study") bgRoute.current = { ...route };
  const bg = (route.view === "work" || route.view === "study") ? bgRoute.current : { ...route };
  const bgView = bg.view;
  return (
    <React.Fragment>
      <header className="cv-head">
        <a className="cv-brand" href="#/">Canvas<i>.</i></a>
        <nav className="cv-nav">
          {/* highlight follows the page BEHIND an open reader, so the nav does not go blank the
              moment you open a work from the map or a museum */}
          <a href="#/" data-on={bgView === "wall"}>The Wall</a>
          <a href="#/portrait" data-on={bgView === "portrait"}>Portrait</a>
          <a href="#/museums" data-on={bgView === "museums" || bg.view === "museum" || (bg.view === "deck" && bg.id !== "by-artists")}>Museums</a>
          <a href="#/artists" data-on={bgView === "artists" || bg.view === "artist"}>Artists</a>
          {/* By Your Artists removed from the nav (Fuad 2026-08-22). The route and the deck itself
              still work — #/deck/by-artists resolves, and the "+ deck" buttons on artist pages
              still queue into it — so nothing is orphaned; it just no longer takes a top-level
              slot. Re-add this line to bring it back. */}
          <a href="#/map" data-on={bgView === "map" || bgView === "pilgrimage"}>Map</a>
        </nav>
        <SearchBar go={go} />
      </header>
      {/* driven by `bg`, not `route`, so an open reader leaves the page beneath it intact */}
      {bg.view === "deck" ? <Deck museumId={bg.id} part={bg.part} go={go} key={bg.id + "-" + bg.part} />
        : bg.view === "museum" ? <MuseumView museumId={bg.id} go={go} key={bg.id} />
        : bgView === "museums" ? <Museums go={go} />
        : bgView === "portrait" ? <Portrait go={go} />
        : (bgView === "map" || bgView === "pilgrimage") ? <MapView go={go} />
        : bg.view === "artist" ? <ArtistView artistId={bg.id} go={go} key={bg.id} />
        : bgView === "artists" ? <Artists go={go} />
        : <Wall go={go} styleIds={bg.view === "wall" ? bg.id : null} />}
      {route.view === "work" && <Reader id={route.id} go={go} />}
      {route.view === "study" && <StudyView id={route.id} go={go} key={route.id} />}
      {/* Site-switch leads, credit trails — same order as Rotation's footer (Fuad 2026-08-20). */}
      <footer className="cv-foot">
        <nav className="site-switch">part of <a href="/">fuad.au</a> · <a href="/rotation/">Rotation</a> · <a href="/culture/">Culture</a> · <a href="/canvas/">Canvas</a></nav>
        <span className="cv-foot-main">canvas · a personal gallery, reconstructed from memory · images via <a href="https://commons.wikimedia.org" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a> / <a href="https://www.wikidata.org" target="_blank" rel="noopener noreferrer">Wikidata</a></span>
      </footer>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
