// rotation-explore.jsx — the converged explorer. One filter set {time · subgenre · clock-slots}
// over a SINGLE side-by-side surface: the sound map (left, sticky) and the ranked results
// (right) are the same universe (window.ROTATION.EXPLORE — every tagged artist), so clicking a
// subgenre bubble filters the list and a click is never empty. Genres are grouped under families
// (FamiliesGrid) — filter by family or subgenre; subgenres morph smoothly as you scrub years.

const _inflate = (flat) => Array.from({ length: 7 }, (_, r) => flat.slice(r * 24, r * 24 + 24));
const _zeros = () => Array.from({ length: 7 }, () => new Array(24).fill(0));

// Legacy family-NAME bridge (genre-v2, 2026-08-12). Deep links carry ?f=<family name>; the v2
// migration renamed/merged families, so old bookmarks/artist-chip links would dead-end. Map each
// v1 family name → its nearest v2 family so existing links resolve. Keyed by the normalised name
// (lowercase, alnum-only — same norm the resolver uses). v2 names resolve directly and never hit
// this bridge (they're matched first).
const _V1_FAM_BRIDGE = {
  "numetalaltmetal": "Metalcore/Nu",
  "metalcorecore": "Metalcore/Nu",
  "industrial": "Industrial/Noise/Hyperpop",
  "thrashheavy": "Thrash/Death",
  "progaltrock": "Prog",
  "japanese": "Pop",                        // dissolved scene family → nearest surviving bucket
  "electronicdnb": "Electronic/DnB",
  "digitalhardcorehyperpop": "Industrial/Noise/Hyperpop",
  "hiphop": "Hip-Hop/Rap",
  "punkgarage": "Punk/Hardcore",
  "shoegazenoise": "Shoegaze/Grunge",
  "popindie": "Pop",
  "jazz": "Jazz/Funk",
  "classicalscore": "Classical",
  // v2 long names + short-lived split names → current names (name-shorten, no split; 2026-08-12)
  "scoregamesfilm": "Score",                          // "Score/Games & Film"
  "progmetalrock": "Prog",                            // "Prog Metal/Rock"
  "heavydoomgothic": "Heavy/Doom",                    // "Heavy/Doom/Gothic"
  "industrialnoise": "Industrial/Noise/Hyperpop",     // short-lived "Industrial/Noise"
  "dhhyperpop": "Industrial/Noise/Hyperpop",          // short-lived "DH/Hyperpop"
  "industrialdhhyperpopnoise": "Industrial/Noise/Hyperpop",  // "Industrial/DH/Hyperpop/Noise"
};
// resolve a ?f= family token to a v2 FAMILIES entry: exact v2 name first, then the v1 bridge.
const _resolveFamParam = (R, raw) => {
  const norm = (x) => (x || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const q = norm(raw);
  let fm = R.FAMILIES.find(f => norm(f.family) === q);
  if (fm) return fm;
  const v2name = _V1_FAM_BRIDGE[q];
  if (v2name) { const nn = norm(v2name); return R.FAMILIES.find(f => norm(f.family) === nn) || null; }
  return null;
};

// rhythm grid for the selected year (genre/sub reflected as highlight, not aggregation)
function rhythmGrid(R, year) {
  if (year == null) return R.CLOCK.grid;
  return R.CLOCK_BY_YEAR[year] ? _inflate(R.CLOCK_BY_YEAR[year]) : _zeros();
}

// plays by an artist inside selected clock cells (kept artists only — ARTIST_CLOCK is the 205)
function tsPlays(R, id, cells) {
  const arr = R.ARTIST_CLOCK[id];
  if (!arr) return 0;
  let s = 0;
  for (const [c, n] of arr) if (cells.has(c)) s += n;
  return s;
}

// subgenre bubble weights for the selected years, summed over the EXPLORE universe (so map ↔ ranking
// match). `years` is a Set of listening years; empty/null = all-time. Multiselect sums across the set.
function mapWeights(R, years) {
  const hasYears = years && years.size > 0;
  const w = new Array(R.SUBS.length).fill(0);
  for (const a of R.EXPLORE) {
    let p = a.plays;
    if (hasYears) { p = 0; if (a.yp) for (const y of years) p += a.yp[y] || 0; }
    if (!p) continue;
    for (const si of a.s) w[si] += p;
  }
  return R.SUBS.map((s, i) => ({ ...s, w: w[i] }));
}

// FAMILY membership: test the record's `fm` array (approved 2026-08-12 — mention ≠ membership).
// Falls back to any-sub-in-family only for legacy records that predate `fm`.
function recInFam(R, rec, fam) {
  if (fam == null) return true;
  if (rec && rec.fm) return rec.fm.indexOf(fam) >= 0;
  return !!(rec && rec.s && rec.s.some(si => R.SUBS[si] && R.SUBS[si].fam === fam));
}
// SUBGENRE membership for FILTERING: `sq` (subs whose backing tag ≥25% of the artist's top-tag
// weight) when present, else `s` (display subs). Keeps a stray tag from making an artist filterable.
const _filtSubs = (rec) => (rec && rec.sq) ? rec.sq : ((rec && rec.s) || []);

// ── artist Sort specs ──
// One entry per Sort chip beyond plays. `v(a, af, plays)` returns the sortable number (or null to
// DROP the artist from this sort, mirroring how audio sorts drop artists without measured audio);
// `af` is R.AUDIO[a.id] (may be undefined), `a` the EXPLORE rec. `d` is the natural default direction
// (+1 = high→low, -1 = low→high, before the flip button multiplies it). `disp` formats the value
// label. `audio` marks sorts that read the measured vector (kept behind the ≥15-play floor + af gate,
// byte-identical to the old path). `bar:false` hides the length bar where value isn't a magnitude.
const SND_SPECS = {
  energy:  { audio: true, v: (a, af) => af[0], disp: v => Math.round(v * 100) + "%" },
  valence: { audio: true, v: (a, af) => af[1], disp: v => Math.round(v * 100) + "%" },
  acoustic:{ audio: true, v: (a, af) => af[2], disp: v => Math.round(v * 100) + "%" },
  tempo:   { audio: true, v: (a, af) => af[3], disp: v => Math.round(v * 100) + "%" },
  dance:   { audio: true, v: (a, af) => af[4], disp: v => Math.round(v * 100) + "%" },
  instr:   { audio: true, v: (a, af) => af[5], disp: v => Math.round(v * 100) + "%" },   // instrumentalness (idx 5)
  loud:    { audio: true, v: (a, af) => af[9], disp: v => Math.round(v) + " dB", bar: false }, // loudness dB (idx 9), negative
  pop:     { audio: true, v: (a, af) => af[7], disp: v => v + "/100" },
  // non-audio sorts — read fields shipped on the EXPLORE rec (l/d/fd/sd), so they reach the whole pool
  mine:    { v: (a) => (a.l > 0 ? a.plays / a.l : null),                       // obscurity: your plays ÷ global listeners
             disp: v => v >= 1 ? "≥1 per listener" : ("1 in " + Math.round(1 / v).toLocaleString("en-US")) },
  disc:    { v: (a) => (a.fd != null ? a.fd : null), disp: (v, a) => String(FDY(a)), bar: false }, // first-play day (newest first)
  span:    { v: (a) => (a.sd != null ? a.sd : null),                            // first→last spread
             // months as the concrete unit, years appended after a slash for scale once it adds info
             // (≥2y). Under 2 months → days. e.g. 5985d → "197mo/16y", ~1y → "12mo", 43d → "43d".
             disp: v => { const mo = Math.floor(v / 30.44), y = Math.floor(v / 365.25);
                          return mo < 2 ? Math.max(1, Math.round(v)) + "d" : (y >= 2 ? mo + "mo/" + y + "y" : mo + "mo"); } },
  vintage: { v: (a) => (a.d > 0 ? a.d : null), d: -1, disp: (v, a) => String(a.d), bar: false }, // est. year, oldest first
};
// first-play YEAR from the rec's fd — for the "discovered" label.
// fd is days since the REAL first dated scrobble (oldestMs in build-data), so anchor on TOTALS.fdAnchor —
// NOT `since`, which is pushed back to UNDATED_REMAP_START when undated plays exist (that ~4-yr gap made
// 2026 read as 2022). Fall back to `since` only if fdAnchor is absent (old bundle).
const FDY = (a) => { const R = window.ROTATION; const T = R.TOTALS || {}; const t = T.fdAnchor || T.since || "2013-01-01"; const d = new Date(Date.parse(t) + (a.fd || 0) * 86400e3); return d.getUTCFullYear() + "." + String(d.getUTCMonth() + 1).padStart(2, "0"); };
// flip-button labels per sort: [what sndDir=1 (the natural default) shows first, what the flip shows].
const SND_FLIP = {
  mine:    ["most mine", "least mine"],   disc: ["newest", "oldest"],
  span:    ["longest", "shortest"],       vintage: ["oldest", "newest"],
  loud:    ["loudest", "quietest"],       instr: ["most instr.", "least instr."],
  pop:     ["most popular", "most obscure"],
};
// one-line hint under the Sort row per sort (falls back to the audio-trait wording).
const SND_HINT = {
  pop:     "Spotify popularity 0–100 · flip for most-obscure first",
  loud:    "average track loudness in dB (louder = closer to 0)",
  instr:   "instrumentalness, 0–100% · flip for most-vocal first",
  mine:    "your obscurity: your plays ÷ global last.fm listeners",
  disc:    "when you first scrobbled them · newest first",
  span:    "loyalty: time from your first to your last scrobble",
  vintage: "band's est. year (first release) · oldest first · flip for newest",
};

// years = Set of selected listening years (empty = all-time). yearsPlays(rec) sums a rec's plays
// across the selection (0 if none) — the multiselect union of the old single-year `a.yp[year]`.
function exploreRank(R, kind, f, limit = 40) {
  const { years, fam, subIdx, cells } = f;
  const hasYears = years && years.size > 0;
  const yearsPlays = (yp) => { if (!yp) return 0; let s = 0; for (const y of years) s += yp[y] || 0; return s; };
  const vocals = f.vocals && f.vocals !== "any" ? f.vocals : null;   // active vocals filter, or null
  const hasCells = cells && cells.size > 0;
  const pass = f.pass && f.pass.active ? f.pass : null;   // theme/decade filter (filter-index); membership sets
  if (kind === "artists") {
    const snd = f.sound, spec = snd ? SND_SPECS[snd] : null, dir = (f.dir || 1) * (spec && spec.d ? spec.d : 1);
    const arr = [];
    for (const a of R.EXPLORE) {
      if (hasYears && !yearsPlays(a.yp)) continue;
      if (pass && !pass.art.has(a.id)) continue;   // theme/decade: artist keeps ≥20% of matched-track plays
      if (subIdx >= 0) { if (_filtSubs(a).indexOf(subIdx) < 0) continue; }
      else if (!recInFam(R, a, fam)) continue;
      if (vocals && !vocalsPass(a.vx, vocals)) continue;   // vocals dimension (hides no-data artists)
      if (f.attrSel) {  // attributes-lens brush/click: filter the FULL universe, not the top-40 slice
        if (f.attrSel.mode === "artists") { if (!f.attrSel.keys.has(a.id)) continue; }
        else if (!a.s.some(ix => f.attrSel.keys.has(ix))) continue;
      }
      if (f.picks && f.picks.size && !f.picks.has(a.id)) continue;   // artists chosen from the search box
      const plays = hasCells ? tsPlays(R, a.id, cells) : (hasYears ? yearsPlays(a.yp) : a.plays);
      if (hasCells && !plays) continue;
      let value = plays, disp, bar = true;
      if (spec) {                                  // sort by a measured/derived axis instead of plays
        if (plays < 15) continue;                  // shared floor keeps every alt-sort meaningful
        const af = spec.audio ? R.AUDIO[a.id] : null;
        if (spec.audio && !af) continue;           // audio sorts drop artists without a measured vector
        value = spec.v(a, af, plays);
        if (value == null) continue;               // non-audio sorts drop artists lacking the field
        disp = spec.disp(value, a); if (spec.bar === false) bar = false;
      }
      arr.push({ id: a.id, label: a.name, value, disp, bar, plays, hue: a.hue, kept: !!(R.byId[a.id] || (R.expById && R.expById[a.id])),
        sub: (R.SUBS[a.s[0]] || {}).name || "" });
    }
    const _seen = new Set();   // distinct artists can share a slug id (✝✝✝/Crosses) — keep one, avoids key collisions
    return arr.sort((x, y) => (y.value - x.value) * (snd ? dir : 1)).filter(x => _seen.has(x.id) ? false : _seen.add(x.id)).slice(0, limit);
  }
  let src;
  if (!hasYears) {
    const base = kind === "albums" ? R.ALBUMS : R.TRACKS;
    src = base.map(a => ({ id: a.id, aid: a.artistId, label: a.title, value: a.plays, hue: a.hue, sub: a.artist }));
  } else {
    // multiselect: merge each selected year's per-year album/track list, summing plays for items
    // that recur across years (keyed by artist+title). id keeps a stable per-item slug.
    const merged = new Map();
    for (const y of years) {
      const yr = R.YEARS.find(yy => yy.year === y) || {};
      (yr[kind] || []).forEach(it => {
        const k = it.artistId + "|" + it.title;
        const e = merged.get(k);
        if (e) e.value += it.plays;
        else merged.set(k, { id: kind + "-" + it.artistId + "-" + it.title, aid: it.artistId, label: it.title, value: it.plays, hue: it.hue, sub: it.artist });
      });
    }
    src = [...merged.values()];
  }
  if (subIdx >= 0) src = src.filter(it => { const e = R.expById[it.aid]; return e && _filtSubs(e).indexOf(subIdx) >= 0; });
  else if (fam != null) src = src.filter(it => { const e = R.expById[it.aid]; return recInFam(R, e, fam); });
  if (hasCells) src = src.filter(it => tsPlays(R, it.aid, cells) > 0);
  if (pass) src = src.filter(it => kind === "albums" ? pass.alb.has(it.id) : pass.trk(it.id));   // it.id = artSlug~titleSlug
  if (vocals) src = src.filter(it => { const e = R.expById[it.aid] || R.byId[it.aid]; return e && vocalsPass(e.vx, vocals); });   // vocals dimension
  return src.map(it => ({ ...it, kept: !!(R.byId[it.aid] || (R.expById && R.expById[it.aid])) })).sort((a, b) => b.value - a.value).slice(0, limit);
}

// ── vocals filter (the VOCALS dimension) ──
// vx is the per-artist vocals code from build-data: "m"/"f"/"n" chars in lineup order,
// "" = instrumental, undefined = no data. Options: any / male / female / mixed / nb / instrumental.
//   male   = ONLY male vocalists     female = ONLY female vocalists
//   mixed  = ≥2 DISTINCT genders     nb     = list contains a non-binary vocalist
//   instr  = empty list (no vocals)
// Returns false when the artist has no vocals data (undefined vx) under any active option — those
// artists are hidden while the filter is on (see the "N without data" note).
function vocalsPass(vx, opt) {
  if (opt === "any") return true;
  if (vx === undefined || vx === null) return false;   // no data → hidden under an active filter
  const set = new Set(vx.split(""));                    // distinct gender chars
  switch (opt) {
    case "instrumental": return vx === "";
    case "male":   return vx !== "" && set.size === 1 && set.has("m");
    case "female": return vx !== "" && set.size === 1 && set.has("f");
    case "nb":     return set.has("n");
    case "mixed":  return set.size >= 2;
    default: return true;
  }
}

// ── mood lens (the former Mood page, folded in as a filter) ──
// Zones split the valence (af[1], x) × energy (af[0], y) plane into quadrants around the midline.
const MOOD_ZONES = ["dark-intense", "bright-intense", "dark-calm", "bright-calm"];
const MOOD_LABELS = { "dark-intense": "dark · intense", "bright-intense": "bright · intense", "dark-calm": "dark · calm", "bright-calm": "bright · calm" };
const zoneOf = (x, y) => (x >= 0.5 ? "bright" : "dark") + "-" + (y >= 0.5 ? "intense" : "calm");
const inMoodZone = (af, z) => !z || zoneOf(af[1], af[0]) === z;

// EXPLORE artists (with measured audio) passing the genre/time filters; moodZone applied only when
// applyZone is set (the quadrant shows the whole slice; facts/results reflect the chosen zone too).
// vocals + pass (theme/decade, filter-index) use the SAME predicates as exploreRank's artists path
// (vocalsPass hides no-data artists; pass.art already folds theme AND decade at artist granularity),
// so the left-surface charts' active slice tracks the ranked results. Both fail open when inactive.
function sliceArtists(R, f, applyZone) {
  const A = R.AUDIO || {}, { years, fam, subIdx, cells, moodZone } = f;
  const hasYears = years && years.size > 0;
  const inYears = (yp) => { if (!yp) return false; for (const y of years) if (yp[y]) return true; return false; };
  const hasCells = cells && cells.size > 0;
  const vocals = f.vocals && f.vocals !== "any" ? f.vocals : null;   // active vocals filter, or null
  const pass = f.pass && f.pass.active ? f.pass : null;              // theme/decade filter (filter-index)
  const out = [];
  for (const a of R.EXPLORE) {
    const af = A[a.id]; if (!af) continue;
    if (hasYears && !inYears(a.yp)) continue;
    if (pass && !pass.art.has(a.id)) continue;   // theme/decade: artist keeps ≥20% of matched-track plays
    if (subIdx >= 0) { if (_filtSubs(a).indexOf(subIdx) < 0) continue; } else if (!recInFam(R, a, fam)) continue;
    if (hasCells && !tsPlays(R, a.id, cells)) continue;
    if (vocals && !vocalsPass(a.vx, vocals)) continue;   // vocals dimension (hides no-data artists)
    if (applyZone && moodZone && !inMoodZone(af, moodZone)) continue;
    out.push(a);
  }
  return out;
}

// hue for a media artist with no profiled record — core's hashInt, mod 360 (dedup 2026-07-18)
const _hueHash = (s) => window.hashInt(s || "", 0) % 360;

// mediaRank — rank albums/tracks from the lazy media-index at FULL depth, applying the same filter
// set as the inline ranking. `meta` is the precomputed per-artist resolution (id/record/hue). Returns
// the top `limit` rows + whether more exist. Genre/mood/clock reach as far as the artist data does;
// year/plays reach the whole library. Rows are pre-sorted by plays, so all-time queries break early.
function mediaRank(M, R, meta, kind, f, limit) {
  const rows = kind === "albums" ? M.albums : M.tracks;
  const tailIdx = kind === "albums" ? 5 : 4;
  const { years, fam, subIdx, cells, moodZone } = f;
  const vocals = f.vocals && f.vocals !== "any" ? f.vocals : null;   // active vocals filter, or null
  const pass = f.pass && f.pass.active ? f.pass : null;   // theme/decade filter (filter-index)
  const hasCells = cells && cells.size > 0, noYear = !(years && years.size > 0);
  const playsInYear = (row, y) => { const t = row[tailIdx]; if (t == null) return 0; if (typeof t === "number") return t === y ? row[2] : 0; for (let i = 0; i < t.length; i += 2) if (t[i] === y) return t[i + 1]; return 0; };
  const playsInYears = (row) => { let s = 0; for (const y of years) s += playsInYear(row, y); return s; };   // union of selected years
  const out = []; let more = false;
  for (const row of rows) {
    const m = meta[row[1]]; if (!m) continue;   // guard: a media row whose artist idx has no meta (index desync) — skip, don't throw
    const rec = m.rec;
    if (pass) { const aname = M.artists[row[1]] || "", key = R.slug(aname) + "~" + R.slug(row[0]); if (kind === "albums" ? !pass.alb.has(key) : !pass.trk(key)) continue; }
    if (subIdx >= 0) { if (!rec || _filtSubs(rec).indexOf(subIdx) < 0) continue; }
    else if (fam != null) { if (!recInFam(R, rec, fam)) continue; }
    if (vocals) { const vx = (rec && rec.vx !== undefined) ? rec.vx : (R.byId[m.aid] && R.byId[m.aid].vx); if (!vocalsPass(vx, vocals)) continue; }   // vocals dimension
    if (moodZone) { const af = R.AUDIO[m.aid]; if (!af || !inMoodZone(af, moodZone)) continue; }
    if (f.attrSel) {
      if (f.attrSel.mode === "artists") { if (!f.attrSel.keys.has(m.aid)) continue; }
      else if (!rec || !rec.s || !rec.s.some(si => f.attrSel.keys.has(si))) continue;
    }
    if (f.picks && f.picks.size && !f.picks.has(m.aid)) continue;   // artists chosen from the search box
    if (hasCells && !tsPlays(R, m.aid, cells)) continue;
    // (m.aid always present once m is; label/sub read row[0]/M.artists[row[1]] which are guarded above)
    let value = row[2];
    if (!noYear) { value = playsInYears(row); if (!value) continue; }
    out.push({ id: (kind === "albums" ? "ma" : "mt") + row[1], aid: m.aid, label: row[0], sub: M.artists[row[1]], value, hue: m.hue, kept: kind === "albums" ? true : !!rec, cover: kind === "albums" ? (row[6] || "") : "" });
    if (noYear && out.length > limit) { more = true; break; }   // pre-sorted → top `limit` already
  }
  if (!noYear) { out.sort((a, b) => b.value - a.value); more = out.length > limit; }
  return { items: out.slice(0, limit), more };
}

// useZoom — shared wheel-zoom + drag-pan for the Explore scatters. Returns a viewBox string, the
// scale factor k (=vb.w/W) so dots/labels can be drawn a CONSTANT on-screen size at any zoom (which
// is what actually de-clutters — the gaps grow while the marks stay put), and svg event bindings.
function useZoom(W, H) {
  const ref = React.useRef(null);
  const [vb, setVb] = React.useState({ x: 0, y: 0, w: W, h: H });
  const vbRef = React.useRef(vb); vbRef.current = vb;
  const raf = React.useRef(0);
  const AR = H / W;
  // coalesce all view changes (wheel + drag) into ONE state commit per animation frame, so a burst
  // of wheel events can't trigger a re-render storm (the earlier maps' crash/VRAM spike).
  const commit = (next) => { vbRef.current = next; if (!raf.current) raf.current = requestAnimationFrame(() => { raf.current = 0; setVb(vbRef.current); }); };
  // attach wheel NON-passively via the DOM so preventDefault actually stops the page scrolling
  // (React's synthetic onWheel is passive, which is why the page scrolled under the map).
  React.useEffect(() => {
    const el = ref.current; if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const mx = (e.clientX - r.left) / r.width, my = (e.clientY - r.top) / r.height;
      const f = e.deltaY < 0 ? 1 / 1.2 : 1.2, v = vbRef.current;
      const w = Math.min(W, Math.max(W * 0.1, v.w * f)), h = w * AR;
      commit({ x: v.x + mx * v.w - mx * w, y: v.y + my * v.h - my * h, w, h });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => { el.removeEventListener("wheel", onWheel); if (raf.current) cancelAnimationFrame(raf.current); };
  }, [W, H]);
  const drag = React.useRef(null);
  const onDown = (e) => { if (e.button !== 0) return; drag.current = { mx: e.clientX, my: e.clientY, v: vbRef.current, lx: null, ly: null }; };
  // PAN PERF (Fuad 2026-07-15): panning used to commit the viewBox every frame, which forces the
  // browser to repaint ALL ~3.9k dots each move. Instead, translate the whole svg with a cheap
  // GPU-composited CSS transform DURING the drag and commit the equivalent viewBox shift only on
  // release (the fisheye is paused while dragging, so nothing reads the viewBox mid-gesture).
  const onMove = (e) => { const d = drag.current; if (!d || !ref.current) return; d.lx = e.clientX; d.ly = e.clientY; ref.current.style.transform = `translate(${e.clientX - d.mx}px, ${e.clientY - d.my}px)`; };
  const onUp = () => {
    const d = drag.current; drag.current = null; const el = ref.current; if (!d || !el) return;
    if (d.lx == null) { el.style.transform = ""; return; }   // a click, no pan
    const r = el.getBoundingClientRect();
    const nv = { ...d.v, x: d.v.x - (d.lx - d.mx) / r.width * d.v.w, y: d.v.y - (d.ly - d.my) / r.height * d.v.h };
    el.setAttribute("viewBox", `${nv.x} ${nv.y} ${nv.w} ${nv.h}`);   // apply the real pan…
    el.style.transform = "";                                         // …and drop the CSS pan in the same frame (no jump)
    commit(nv);
  };
  const reset = () => commit({ x: 0, y: 0, w: W, h: H });
  // button zoom — around the chart centre (the touch-friendly path; pinch handles the rest)
  const zoomBy = (f) => { const v = vbRef.current; const w = Math.min(W, Math.max(W * 0.1, v.w * f)), h = w * AR;
    commit({ x: v.x + 0.5 * v.w - 0.5 * w, y: v.y + 0.5 * v.h - 0.5 * h, w, h }); };
  // two-finger pinch → zoom + pan around the finger midpoint. Single-finger touch is left to the
  // browser (touch-action: pan-y on the svg) so the page still scrolls over the chart (Fuad 2026-07-18).
  const pinch = React.useRef(null);
  const fdist = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  const onTouchStart = (e) => {
    if (e.touches.length >= 2) { const [a, b] = [e.touches[0], e.touches[1]];
      pinch.current = { d: fdist(a, b) || 1, cx: (a.clientX + b.clientX) / 2, cy: (a.clientY + b.clientY) / 2, v: vbRef.current };
      drag.current = null; }
  };
  const onTouchMove = (e) => {
    if (!pinch.current || e.touches.length < 2 || !ref.current) return;
    const [a, b] = [e.touches[0], e.touches[1]], p = pinch.current, nd = fdist(a, b); if (nd < 1) return;
    const r = ref.current.getBoundingClientRect();
    const mx = (a.clientX + b.clientX) / 2, my = (a.clientY + b.clientY) / 2, f = p.d / nd;
    const fx = (p.cx - r.left) / r.width, fy = (p.cy - r.top) / r.height;
    const w = Math.min(W, Math.max(W * 0.1, p.v.w * f)), h = w * AR;
    let nx = p.v.x + fx * p.v.w - fx * w, ny = p.v.y + fy * p.v.h - fy * h;
    nx -= (mx - p.cx) / r.width * w; ny -= (my - p.cy) / r.height * h;   // pan by midpoint drift
    commit({ x: nx, y: ny, w, h });
  };
  const onTouchEnd = (e) => { if (e.touches.length < 2) pinch.current = null; };
  // live numeric viewBox [x,y,w,h] for the fisheye (mid-gesture-correct, reads vbRef not state);
  // draggingRef lets a chart tell the fisheye to pause while the pan drag is active.
  const vbArr = React.useRef([vb.x, vb.y, vb.w, vb.h]);
  vbArr.current = [vbRef.current.x, vbRef.current.y, vbRef.current.w, vbRef.current.h];
  return { k: vb.w / W, zoomed: vb.w < W - 0.5, reset, zoomBy, vbRef: vbArr, draggingRef: drag,
    bind: { ref, viewBox: `${vb.x} ${vb.y} ${vb.w} ${vb.h}`, onMouseDown: onDown, onMouseMove: onMove, onMouseUp: onUp,
      onTouchStart, onTouchMove, onTouchEnd } };
}

// a small floating "reset zoom" chip shown over a chart once it's been zoomed
function ZoomReset({ z }) {
  return z.zoomed ? <button className="xp-zoomreset" onClick={z.reset} title="reset zoom">⤢ reset</button> : null;
}

// +/−/home cluster (top-right of a chart) — the reliable way to zoom on a phone where there's no
// scroll wheel; ⌂ resets. Complements pinch. (Fuad 2026-07-18)
function ZoomControls({ z }) {
  return (
    <div className="xp-zoomctl">
      <button type="button" onClick={() => z.zoomBy(1 / 1.3)} title="Zoom in" aria-label="Zoom in">+</button>
      <button type="button" onClick={() => z.zoomBy(1.3)} title="Zoom out" aria-label="Zoom out">−</button>
      <button type="button" onClick={z.reset} title="Reset zoom" aria-label="Reset zoom" data-dim={!z.zoomed}>⌂</button>
    </div>
  );
}

// ── cursor FISHEYE for the Explore dot clouds ──────────────────────────────────
// A small local port of TourMap's fisheye (canonical copy in rotation-views3.jsx ~L2160). These
// charts keep every dot a CONSTANT on-screen size by riding a --zk CSS var (r = calc(Npx*var(--zk)));
// so instead of writing the r attribute we multiply in a per-dot --fk variable and render
// r = calc(Npx * var(--zk) * var(--fk,1)). Setting --fk imperatively on the DOM node's style never
// re-renders the memoized cloud. pointermove → rAF → each dot in ~R_PX screen px gets an eased k in
// [1,FISH_MAXK]; pointerleave / any active drag resets. The chart supplies its live viewBox (vbRef,
// so a zoom/pan mid-hover still maps correctly) and marks its fisheye dots with `data-fk` + data-cx/cy
// (the dots' base 1000×H coords, which ARE viewBox-base units). draggingRef pauses it during a pan.
function useFisheye(svgRef, vbRef, sel, draggingRef) {
  const raf = React.useRef(0);
  const FISH_R_PX = 55, FISH_MAXK = 1.35;
  const reset = React.useCallback(() => { const el = svgRef.current; if (!el) return; for (const c of el.querySelectorAll(sel)) c.style.setProperty("--fk", "1"); }, [sel]);
  const run = React.useCallback((cx, cy) => {
    const el = svgRef.current; if (!el) return;
    if (draggingRef && draggingRef.current) return;   // paused during a pan/brush gesture
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      const rect = el.getBoundingClientRect(); if (!rect.width || !rect.height) return;
      if (cx < rect.left || cx > rect.right || cy < rect.top || cy > rect.bottom) { reset(); return; }
      const vb = vbRef.current;   // [x,y,w,h]
      const mvx = vb[0] + (cx - rect.left) / rect.width * vb[2];   // cursor in viewBox-base units
      const mvy = vb[1] + (cy - rect.top) / rect.height * vb[3];
      const rr = FISH_R_PX * (vb[2] / rect.width);   // R_PX screen px → viewBox units
      const inv = 1 / rr;
      for (const c of el.querySelectorAll(sel)) {
        const bx = +c.dataset.cx, by = +c.dataset.cy;
        const dnorm = Math.hypot((bx - mvx) * inv, (by - mvy) * inv);   // 0 at cursor, 1 at edge
        const k = dnorm >= 1 ? 1 : 1 + (FISH_MAXK - 1) * (1 - dnorm) * (1 - dnorm);
        c.style.setProperty("--fk", k.toFixed(3));
      }
    });
  }, [sel, reset, draggingRef]);
  React.useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current); }, []);
  return { run, reset };
}

// MoodQuadrant — valence × energy scatter that doubles as a filter: click a quadrant to scope the
// ranked results to that mood zone; click a dot to open the artist. It renders a stable universe of
// dots and animates each dot's opacity/size as the active slice (activeIds) changes, so filter
// changes elsewhere on the page ripple in smoothly rather than popping.
function MoodQuadrant({ pts, activeIds, go, moodZone, setMoodZone }) {
  const [hi, setHi] = React.useState(null);
  // progressive render: mount the ~1000 dots a few hundred per animation frame so opening the
  // lens never blocks the main thread (the chart "fills in" instead of freezing). Resets only
  // when the point universe itself changes, not on every filter (activeIds handles those).
  const [n, setN] = React.useState(0);
  React.useEffect(() => {
    setN(0); let raf, i = 0;
    const step = () => { i = Math.min(pts.length, i + 180); setN(i); if (i < pts.length) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [pts]);
  const z = useZoom(1000, 560);
  const fish = useFisheye(z.bind.ref, z.vbRef, ".xp-fdot", z.draggingRef);
  // same 1000×560 canvas as the texture scatter so switching lenses doesn't change the
  // module height (Fuad 2026-07-05); quadrants are simply rectangles now.
  const QW = 1000, QH = 560, qp = 40;
  const qx = (v) => qp + v * (QW - 2 * qp), qy = (e) => qp + (1 - e) * (QH - 2 * qp);
  const maxPlays = React.useMemo(() => { let m = 1; for (const p of pts) if (activeIds.has(p.id) && p.plays > m) m = p.plays; return m; }, [pts, activeIds]);
  const nActive = activeIds.size;
  // dots memoized without the zoom factor; radius rides the --zk CSS var so zoom rescales
  // natively without re-reconciling the whole cloud (Fuad 2026-07-09).
  // `hi` deliberately NOT a dep — hover during drag re-reconciled the whole cloud and killed
  // performance (Fuad 2026-07-14); the hovered dot gets one separate highlight ring.
  const dots = React.useMemo(() => pts.slice(0, n).map(p => {
    const active = activeIds.has(p.id);
    const dimZone = active && moodZone && zoneOf(p.x, p.y) !== moodZone;
    const op = !active ? 0.05 : dimZone ? 0.1 : 0.62;
    const baseR = 3 + Math.sqrt(p.plays / maxPlays) * 9;
    return (
      <circle key={p.id} className="xp-fdot" data-cx={qx(p.x).toFixed(1)} data-cy={qy(p.y).toFixed(1)}
        cx={qx(p.x)} cy={qy(p.y)} fill={`oklch(0.64 0.16 ${p.hue})`}
        fillOpacity={op} vectorEffect="non-scaling-stroke"
        style={{ r: `calc(${baseR.toFixed(2)}px * var(--zk) * var(--fk, 1))`, cursor: active ? "pointer" : "default", pointerEvents: active ? "auto" : "none", transition: "fill-opacity .45s ease" }}
        onMouseEnter={() => active && setHi(p)} onClick={(e) => { e.stopPropagation(); active && go("artist", p.id); }}><title>{p.name}</title></circle>);
  }), [pts, n, activeIds, maxPlays, moodZone, go]);
  const hiRing = hi && (
    <circle cx={qx(hi.x)} cy={qy(hi.y)} fill={`oklch(0.7 0.16 ${hi.hue})`} fillOpacity={0.95}
      stroke="#fff" strokeWidth={1.3} vectorEffect="non-scaling-stroke" pointerEvents="none"
      style={{ r: `calc(7px * var(--zk))` }} />);
  const mid = 0.5;
  const zones = [
    { z: "dark-intense", x: qp, y: qp, w: qx(mid) - qp, h: qy(mid) - qp },
    { z: "bright-intense", x: qx(mid), y: qp, w: QW - qp - qx(mid), h: qy(mid) - qp },
    { z: "dark-calm", x: qp, y: qy(mid), w: qx(mid) - qp, h: QH - qp - qy(mid) },
    { z: "bright-calm", x: qx(mid), y: qy(mid), w: QW - qp - qx(mid), h: QH - qp - qy(mid) },
  ];
  return (
    <div style={{ padding: "14px 16px 10px", position: "relative" }}>
      <ZoomControls z={z} />
      <svg {...z.bind} style={{ width: "100%", height: "auto", display: "block", cursor: "grab", touchAction: "pan-y", "--zk": z.k }}
        onMouseMove={(e) => { z.bind.onMouseMove(e); fish.run(e.clientX, e.clientY); }}
        onMouseLeave={() => { setHi(null); z.bind.onMouseUp(); fish.reset(); }}>
        {zones.map(zn => <rect key={zn.z} x={zn.x} y={zn.y} width={zn.w} height={zn.h}
          fill={moodZone === zn.z ? "var(--accent-bg)" : "transparent"} stroke="none"
          style={{ transition: "fill .35s ease" }}><title>{MOOD_LABELS[zn.z]}</title></rect>)}  {/* quadrant-click filter disabled (Fuad 2026-07-14: cool but pointless for now) */}
        <line x1={qx(.5)} y1={qp} x2={qx(.5)} y2={QH - qp} stroke="var(--rule)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <line x1={qp} y1={qy(.5)} x2={QW - qp} y2={qy(.5)} stroke="var(--rule)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        {[["intense", qx(.5), qp - 4, "middle"], ["calm", qx(.5), QH - qp + 16, "middle"], ["dark", qp - 8, qy(.5), "end"], ["bright", QW - qp + 8, qy(.5), "start"]].map(([t, x, y, anc]) =>
          <text key={t} x={x} y={y} textAnchor={anc} fontFamily="var(--mono)" fontSize={10 * z.k} fill="var(--ink-faint)">{t}</text>)}
        {dots}
        {hiRing}
      </svg>
      <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", textAlign: "center", marginTop: 2 }}>
        {n < pts.length ? `plotting ${fmt(n)} / ${fmt(pts.length)}…` : hi ? hi.name : moodZone ? `${MOOD_LABELS[moodZone]} — tap again to clear` : `${fmt(nActive)} artists · tap a quadrant to filter · tap a dot to open`}</div>
    </div>
  );
}

// ArtistCloud — the "artists" granularity for the TEXTURE lens: every (top-played) artist plotted
// at its primary subgenre's organic↔electronic / calm↔violent position (jittered so a shared
// subgenre fans out). Progressive render (chunked) so 1000 dots never block; dims dots outside the
// active slice. Clicking an active dot opens the artist.
function ArtistCloud({ pts, activeIds, go }) {
  const W = 1000, H = 560, pad = 46;
  const px = (x) => pad + x * (W - pad * 2), py = (y) => H - pad - y * (H - pad * 2);
  const [hi, setHi] = React.useState(null);
  const [n, setN] = React.useState(0);
  React.useEffect(() => {
    setN(0); let raf, i = 0;
    const step = () => { i = Math.min(pts.length, i + 180); setN(i); if (i < pts.length) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [pts]);
  const maxPlays = React.useMemo(() => Math.max(1, ...pts.map(p => p.plays)), [pts]);
  const z = useZoom(1000, 560);
  const fish = useFisheye(z.bind.ref, z.vbRef, ".xp-fdot", z.draggingRef);
  // dots memoized WITHOUT the zoom factor — radius rides a CSS var (--zk) so zooming rescales
  // marks natively without React re-reconciling the whole cloud (Fuad 2026-07-09).
  // `hi` is deliberately NOT a dep: hovering during a drag re-reconciled all ~3.9k dots per
  // crossed dot and killed the page (Fuad 2026-07-14). The hovered dot gets ONE highlight
  // ring rendered separately instead.
  const dots = React.useMemo(() => pts.slice(0, n).map(p => {
    const active = activeIds.has(p.id);
    const baseR = 2.4 + Math.sqrt(p.plays / maxPlays) * 8.5;
    return (
      <circle key={p.id} className="xp-fdot" data-cx={px(p.x).toFixed(1)} data-cy={py(p.y).toFixed(1)}
        cx={px(p.x)} cy={py(p.y)} fill={`oklch(0.64 0.16 ${p.hue})`} fillOpacity={active ? 0.6 : 0.05}
        vectorEffect="non-scaling-stroke"
        style={{ r: `calc(${baseR.toFixed(2)}px * var(--zk) * var(--fk, 1))`, cursor: active ? "pointer" : "default", pointerEvents: active ? "auto" : "none", transition: "fill-opacity .45s ease" }}
        onMouseEnter={() => active && setHi(p)} onClick={() => active && go("artist", p.id)}><title>{p.name}</title></circle>);
  }), [pts, n, activeIds, maxPlays, go]);
  const hiRing = hi && (
    <circle cx={px(hi.x)} cy={py(hi.y)} fill={`oklch(0.7 0.16 ${hi.hue})`} fillOpacity={0.95}
      stroke="#fff" strokeWidth={1.3} vectorEffect="non-scaling-stroke" pointerEvents="none"
      style={{ r: `calc(7px * var(--zk))` }} />);
  return (
    <div style={{ padding: "14px 16px 10px", position: "relative" }}>
      <ZoomControls z={z} />
      <svg {...z.bind} style={{ width: "100%", height: "auto", display: "block", cursor: "grab", touchAction: "pan-y", "--zk": z.k }}
        onMouseMove={(e) => { z.bind.onMouseMove(e); fish.run(e.clientX, e.clientY); }}
        onMouseLeave={() => { setHi(null); z.bind.onMouseUp(); fish.reset(); }}>
        {[.25, .5, .75].map(g => (<g key={g}>
          <line x1={px(g)} y1={pad} x2={px(g)} y2={H - pad} stroke="var(--rule)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          <line x1={pad} y1={py(g)} x2={W - pad} y2={py(g)} stroke="var(--rule)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        </g>))}
        <rect x={pad} y={pad} width={W - pad * 2} height={H - pad * 2} fill="none" stroke="var(--rule-2)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <text x={pad} y={H - 16} fill="var(--ink-faint)" fontSize={11 * z.k} fontFamily="var(--mono)" style={{ letterSpacing: ".1em" }}>ORGANIC</text>
        <text x={W - pad} y={H - 16} fill="var(--ink-faint)" fontSize={11 * z.k} fontFamily="var(--mono)" textAnchor="end" style={{ letterSpacing: ".1em" }}>ELECTRONIC</text>
        <text x={20} y={H - pad} fill="var(--ink-faint)" fontSize={11 * z.k} fontFamily="var(--mono)" transform={`rotate(-90 20 ${H - pad})`} style={{ letterSpacing: ".1em" }}>CALM</text>
        <text x={20} y={pad + 56} fill="var(--ink-faint)" fontSize={11 * z.k} fontFamily="var(--mono)" transform={`rotate(-90 20 ${pad + 56})`} textAnchor="end" style={{ letterSpacing: ".1em" }}>VIOLENT</text>
        {dots}
        {hiRing}
      </svg>
      <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", textAlign: "center", marginTop: 2 }}>
        {n < pts.length ? `plotting ${fmt(n)} / ${fmt(pts.length)}…` : hi ? hi.name : `${fmt(activeIds.size)} artists in view · tap a dot to open`}</div>
    </div>
  );
}

// SubMoodScatter — the "subgenres" granularity for the MOOD lens: each subgenre bubbled at its
// members' mean valence × energy (sized by plays), on the same quadrant canvas as MoodQuadrant.
// Tap a bubble to filter by subgenre; tap a quadrant to scope by mood zone. Far fewer points than
// the artist cloud, so it's the cheap default.
function SubMoodScatter({ subs, activeSub, activeFam, onPick, moodZone, setMoodZone }) {
  const [hi, setHi] = React.useState(null);
  const z = useZoom(1000, 560);
  const QW = 1000, QH = 560, qp = 40;
  const qx = (v) => qp + v * (QW - 2 * qp), qy = (e) => qp + (1 - e) * (QH - 2 * qp);
  const maxW = Math.max(1, ...subs.map(s => s.w));
  const fish = useFisheye(z.bind.ref, z.vbRef, ".xp-fdot", z.draggingRef);
  // bubbles memoized without the zoom factor; radius/label ride the --zk CSS var so zoom
  // rescales them natively without re-reconciling every subgenre bubble (Fuad 2026-07-09).
  const bubbles = React.useMemo(() => subs.map((s, i) => {
    const on = activeSub ? activeSub === s.name : (activeFam != null && s.fam === activeFam);
    const dim = activeSub ? activeSub !== s.name : (activeFam != null && s.fam !== activeFam);
    const foc = hi === s.name;
    const baseR = 9 + (s.w / maxW) * 40;
    const baseFs = Math.min(13, baseR / 3.2);
    return (
      <g key={s.name} style={{ cursor: "pointer" }}
        onMouseEnter={() => setHi(s.name)} onClick={(e) => { e.stopPropagation(); onPick(s.name); }}>
        <circle className="xp-fdot" data-cx={qx(s.x).toFixed(1)} data-cy={qy(s.y).toFixed(1)} cx={qx(s.x)} cy={qy(s.y)} fill="transparent" style={{ r: `calc(${Math.max(baseR, 14).toFixed(2)}px * var(--zk) * var(--fk, 1))` }} />
        <circle className="xp-fdot" data-cx={qx(s.x).toFixed(1)} data-cy={qy(s.y).toFixed(1)} cx={qx(s.x)} cy={qy(s.y)} fill={`oklch(0.64 0.16 ${s.hue})`}
          fillOpacity={on ? .55 : dim ? .12 : .28} stroke={`oklch(0.6 0.16 ${s.hue})`} strokeWidth={on || foc ? 2.2 : 1.3} vectorEffect="non-scaling-stroke"
          style={{ r: `calc(${baseR.toFixed(2)}px * var(--zk) * var(--fk, 1))`, transition: `fill-opacity .45s cubic-bezier(.3,.8,.3,1) ${i * 0.008}s` }} />
        {baseR > 16 && <text x={qx(s.x)} y={qy(s.y)} textAnchor="middle" dominantBaseline="middle" fill="var(--ink)" fontFamily="var(--sans)" fontWeight="500" style={{ pointerEvents: "none", fontSize: `calc(${baseFs.toFixed(2)}px * var(--zk))` }}>{s.name.length > 13 ? s.name.split(" ")[0] : s.name}</text>}
      </g>);
  }), [subs, maxW, activeSub, activeFam, hi, onPick]);
  const mid = 0.5;
  const zones = [
    { z: "dark-intense", x: qp, y: qp, w: qx(mid) - qp, h: qy(mid) - qp },
    { z: "bright-intense", x: qx(mid), y: qp, w: QW - qp - qx(mid), h: qy(mid) - qp },
    { z: "dark-calm", x: qp, y: qy(mid), w: qx(mid) - qp, h: QH - qp - qy(mid) },
    { z: "bright-calm", x: qx(mid), y: qy(mid), w: QW - qp - qx(mid), h: QH - qp - qy(mid) },
  ];
  return (
    <div style={{ padding: "14px 16px 10px", position: "relative" }}>
      <ZoomControls z={z} />
      <svg {...z.bind} style={{ width: "100%", height: "auto", display: "block", cursor: "grab", touchAction: "pan-y", "--zk": z.k }}
        onMouseMove={(e) => { z.bind.onMouseMove(e); fish.run(e.clientX, e.clientY); }}
        onMouseLeave={() => { setHi(null); z.bind.onMouseUp(); fish.reset(); }}>
        {zones.map(zn => <rect key={zn.z} x={zn.x} y={zn.y} width={zn.w} height={zn.h}
          fill={moodZone === zn.z ? "var(--accent-bg)" : "transparent"} stroke="none"
          style={{ transition: "fill .35s ease" }}><title>{MOOD_LABELS[zn.z]}</title></rect>)}  {/* quadrant-click filter disabled (Fuad 2026-07-14: cool but pointless for now) */}
        <line x1={qx(.5)} y1={qp} x2={qx(.5)} y2={QH - qp} stroke="var(--rule)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <line x1={qp} y1={qy(.5)} x2={QW - qp} y2={qy(.5)} stroke="var(--rule)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        {[["intense", qx(.5), qp - 4, "middle"], ["calm", qx(.5), QH - qp + 16, "middle"], ["dark", qp - 8, qy(.5), "end"], ["bright", QW - qp + 8, qy(.5), "start"]].map(([t, x, y, anc]) =>
          <text key={t} x={x} y={y} textAnchor={anc} fontFamily="var(--mono)" fontSize={10 * z.k} fill="var(--ink-faint)">{t}</text>)}
        {bubbles}
      </svg>
      <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", textAlign: "center", marginTop: 2 }}>
        {hi ? hi : moodZone ? `${MOOD_LABELS[moodZone]} — tap again to clear` : `${fmt(subs.length)} subgenres · tap to filter · tap a quadrant to scope`}</div>
    </div>
  );
}

// ── ATTRIBUTES lens ──────────────────────────────────────────────────────────
// The former #lab "Attribute Lab" graduated into Explore. The library is projected onto pickable
// audio-attribute axes (energy·dance·valence·acoustic·instrumental·tempo·popularity·debut·plays).
// Per-track audio features live in the shared track-audio.js blob (window.ROTATION_TRACKAUDIO),
// keyed artistSlug~trackSlug -> [durSec, pop, explicit, trackNo, energy, valence, acoustic, tempo,
// dance, instr]; features are present only when length >= 10 and every feature axis is 0..100. We
// average per artist into a centroid (>=3 audio-covered tracks) and colour every dot by its
// Sound-Map FAMILY hue exactly as the rest of Explore does. Zoomable (shared useZoom / --zk), brush-
// select with a click-through results list, family colour key that dims by family.

// When the axes change (or a lens switch keeps the same points), the attribute dots can glide to
// their new spots instead of snapping — but only when few enough are visible that animating every
// node's transform won't jank on a phone (the owner's Fold 5). Above this count we snap as before.
// Measured reasoning: the artists universe is thousands of SVG circles; transitioning transform on
// all of them means the compositor tweens thousands of nodes for 450ms while React has already
// swapped the values — that's the exact node×style-recalc load that spiked earlier maps. A slice of
// ~1.2k animated transforms is the comfort ceiling; the subgenre grain (~200) is always under it.
const ATTR_ANIM_MAX = 1200;
const ATTR_ANIM_MS = 450;

const ATTR_AXES = [
  { key: "energy",     label: "energy",       kind: "feat" },
  { key: "dance",      label: "danceability", kind: "feat" },
  { key: "valence",    label: "valence",      kind: "feat" },
  { key: "acoustic",   label: "acousticness", kind: "feat" },
  { key: "instr",      label: "instrumental", kind: "feat" },
  { key: "tempo",      label: "tempo",        kind: "feat" },
  { key: "popularity", label: "popularity",   kind: "log" },
  { key: "debut",      label: "debut year",   kind: "year" },
  { key: "plays",      label: "your plays",   kind: "log" },
];
const attrAxisByKey = (k) => ATTR_AXES.find(a => a.key === k) || ATTR_AXES[0];

// build per-artist attribute centroids from the track-audio blob. One-time ~40k-row pass; caller
// memoises on the blob identity. Rows carry: id (= artist slug), name, plays, hue (family hue),
// fam (family index), listeners, debut, recency (year of last play, from yp), sub (first sub idx).
function attrBuildArtists(TA, R) {
  const acc = new Map(); // slug -> { n, sum:[6] }
  const keys = Object.keys(TA);
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i], td = TA[k];
    if (!td || td.length < 10) continue;
    const tilde = k.indexOf("~"); if (tilde < 1) continue;
    const aSlug = k.slice(0, tilde);
    let e = acc.get(aSlug);
    if (!e) { e = { n: 0, sum: [0, 0, 0, 0, 0, 0] }; acc.set(aSlug, e); }
    const vs = [td[4], td[5], td[6], td[7], td[8], td[9]];
    let ok = true;
    for (let j = 0; j < 6; j++) { const v = vs[j]; if (typeof v !== "number" || v !== v) { ok = false; break; } }
    if (!ok) continue;
    for (let j = 0; j < 6; j++) e.sum[j] += vs[j];
    e.n++;
  }
  // meta lookup: id -> { name, plays, listeners, debut, s(subs), recency }. ARTISTS is always
  // present (full yp); EXPLORE (deferred) carries the long tail + listeners(l)/debut(d) and yp on
  // its top slice. recency = max year in yp, when yp is present.
  const meta = new Map();
  const recencyOf = (a) => { if (!a.yp) return null; let m = null; for (const y in a.yp) { const yn = +y; if (a.yp[y] > 0 && (m == null || yn > m)) m = yn; } return m; };
  const addMeta = (a) => {
    if (!a || !a.id) return;
    const cur = meta.get(a.id) || {};
    const rec = recencyOf(a);
    meta.set(a.id, {
      name: cur.name || a.name,
      plays: cur.plays != null ? cur.plays : a.plays,
      listeners: cur.listeners != null ? cur.listeners : (a.l != null ? a.l : null),
      debut: cur.debut != null ? cur.debut : (a.d != null ? a.d : null),
      s: cur.s != null ? cur.s : (a.s || null),
      recency: cur.recency != null ? cur.recency : rec,
    });
  };
  if (R.ARTISTS) for (const a of R.ARTISTS) addMeta(a);
  if (R.EXPLORE) for (const a of R.EXPLORE) addMeta(a);
  // seen-live: any artist slug that appears in the attended-gigs set
  const gigSet = new Set();
  if (R.GIGS && Array.isArray(R.GIGS.gigs)) for (const g of R.GIGS.gigs) if (g.artistId) gigSet.add(g.artistId);

  const artists = [];
  for (const [aSlug, e] of acc) {
    if (e.n < 3) continue;
    const m = meta.get(aSlug); if (!m) continue;
    const subIdx0 = (m.s && m.s.length) ? m.s[0] : null;
    const fam = (subIdx0 != null && R.SUBS[subIdx0]) ? R.SUBS[subIdx0].fam : null;
    const hue = (fam != null && R.FAMILIES[fam]) ? R.FAMILIES[fam].hue : 300;
    artists.push({
      id: aSlug, name: m.name || aSlug, plays: m.plays || 0, hue, fam,
      listeners: m.listeners, debut: m.debut, recency: m.recency,
      seenLive: gigSet.has(aSlug), sub: subIdx0, nTracks: e.n,
      feat: { energy: e.sum[0] / e.n, valence: e.sum[1] / e.n, acoustic: e.sum[2] / e.n, tempo: e.sum[3] / e.n, dance: e.sum[4] / e.n, instr: e.sum[5] / e.n },
    });
  }
  return { artists, totalAudioArtists: acc.size };
}

// play-weighted subgenre centroids from the per-artist rows. Coloured by family hue too. Subgenre
// rows have no per-year recency/seen-live, so those shade options are skipped in subgenre mode.
function attrBuildSubs(artists, R) {
  const SUBS = R.SUBS || [];
  const agg = new Map();
  for (const a of artists) {
    if (a.sub == null || !SUBS[a.sub]) continue;
    const w = Math.max(a.plays, 1);
    let e = agg.get(a.sub);
    if (!e) { e = { w: 0, sum: [0, 0, 0, 0, 0, 0], listW: 0, listSum: 0, debW: 0, debSum: 0, plays: 0 }; agg.set(a.sub, e); }
    const f = a.feat;
    e.sum[0] += f.energy * w; e.sum[1] += f.valence * w; e.sum[2] += f.acoustic * w;
    e.sum[3] += f.tempo * w;  e.sum[4] += f.dance * w;   e.sum[5] += f.instr * w;
    e.w += w; e.plays += a.plays;
    if (a.listeners != null) { e.listSum += a.listeners * w; e.listW += w; }
    if (a.debut != null)     { e.debSum += a.debut * w;      e.debW += w; }
  }
  const subs = [];
  for (const [si, e] of agg) {
    if (e.w <= 0) continue;
    const S = SUBS[si];
    const fam = S.fam != null ? S.fam : null;
    const hue = (fam != null && R.FAMILIES[fam]) ? R.FAMILIES[fam].hue : (S.hue != null ? S.hue : 300);
    subs.push({
      id: "sub-" + si, name: S.name, plays: e.plays, hue, fam,
      listeners: e.listW > 0 ? e.listSum / e.listW : null,
      debut: e.debW > 0 ? e.debSum / e.debW : null,
      recency: null, seenLive: null, sub: si,
      feat: { energy: e.sum[0] / e.w, valence: e.sum[1] / e.w, acoustic: e.sum[2] / e.w, tempo: e.sum[3] / e.w, dance: e.sum[4] / e.w, instr: e.sum[5] / e.w },
    });
  }
  return subs;
}

function attrRawVal(row, key) {
  if (key === "plays") return row.plays || 0;
  if (key === "popularity") return row.listeners != null ? row.listeners : null;
  if (key === "debut") return row.debut != null ? row.debut : null;
  return row.feat ? row.feat[key] : null;
}
function attrFmtVal(row, key) {
  const v = attrRawVal(row, key);
  if (v == null) return "–";
  if (key === "plays" || key === "popularity") return Math.round(v).toLocaleString("en-US");
  if (key === "debut") return String(Math.round(v));
  return v.toFixed(0);
}

// AttrScatter — the zoomable attribute plot. X/Y pickers, artists|subgenres, hover readout, brush.
// Reuses useZoom / --zk / non-scaling-stroke exactly like the other Explore charts, so dots are
// memoized without the zoom factor and zoom only mutates the viewBox + a CSS var (no React reconcile
// of the cloud). Colours ride the family hue; the legend below dims by family.
function AttrScatter({ rows, mode, xKey, yKey, shade, famDim, go, onBrushSel, pageActiveOf }) {
  const [hover, setHover] = React.useState(null);
  const [brush, setBrush] = React.useState(null);    // live pixel rect while dragging
  const [brushed, setBrushed] = React.useState(null); // committed rect
  const [singleSel, setSingleSel] = React.useState(null); // single-clicked subgenre row id (multi = drag)
  const [clickSel, setClickSel] = React.useState(null);   // artists grain: click-picked dot ids (Set) — click again to remove (Fuad 2026-07-18)
  const dragRef = React.useRef(null);
  const z = useZoom(1000, 560);
  const svgRef = z.bind.ref; // share the element useZoom already tracks (wheel-zoom binds to it)
  const fish = useFisheye(svgRef, z.vbRef, ".xp-fdot", dragRef);   // pause fisheye while brushing (dragRef)

  const W = 1000, H = 560;
  const PAD_L = 54, PAD_R = 24, PAD_T = 24, PAD_B = 46;
  const PW = W - PAD_L - PAD_R, PH = H - PAD_T - PAD_B;

  React.useEffect(() => { setBrushed(null); setSingleSel(null); setClickSel(null); }, [xKey, yKey, mode]);

  const buildScale = React.useCallback((key) => {
    const ax = attrAxisByKey(key);
    const vals = [];
    for (const r of rows) { const v = attrRawVal(r, key); if (v != null && v === v) vals.push(v); }
    if (!vals.length) return { ax, ok: false, map: () => 0, min: 0, max: 1 };
    let min = Math.min(...vals), max = Math.max(...vals);
    if (ax.kind === "feat") { min = 0; max = 100; }
    let tf = (v) => v;
    if (ax.kind === "log") { tf = (v) => Math.log10(Math.max(v, 1)); min = tf(min); max = tf(Math.max(max, 1)); }
    if (min === max) max = min + 1;
    return { ax, ok: true, tf, min, max, map: (v) => (tf(v) - min) / (max - min) };
  }, [rows]);
  const sx = React.useMemo(() => buildScale(xKey), [buildScale, xKey]);
  const sy = React.useMemo(() => buildScale(yKey), [buildScale, yKey]);

  const pts = React.useMemo(() => {
    const out = [];
    let maxPlays = 1;
    for (const r of rows) maxPlays = Math.max(maxPlays, r.plays || 0);
    for (const r of rows) {
      const vx = attrRawVal(r, xKey), vy = attrRawVal(r, yKey);
      if (vx == null || vy == null || vx !== vx || vy !== vy) continue;
      const px = PAD_L + sx.map(vx) * PW;
      const py = PAD_T + (1 - sy.map(vy)) * PH;
      const base = Math.sqrt((r.plays || 1) / maxPlays);
      const radius = mode === "subgenres" ? Math.max(4, 6 + base * 20) : Math.max(2.4, 2.5 + base * 12);
      out.push({ row: r, px, py, radius, vx, vy });
    }
    return out;
  }, [rows, sx, sy, xKey, yKey, mode]);

  const labelIds = React.useMemo(() => {
    if (mode !== "subgenres") return new Set();
    return new Set(pts.slice().sort((a, b) => (b.row.plays || 0) - (a.row.plays || 0)).slice(0, 25).map(p => p.row.id));
  }, [pts, mode]);

  // shade luminance: none · recency (year of last play) · seen-live (brighter if NEVER seen — the
  // discovery-relevant read). recency/seen-live only exist per-artist, so subgenre mode → no shade.
  const shadeExtent = React.useMemo(() => {
    if (shade !== "recency") return null;
    let mn = Infinity, mx = -Infinity;
    for (const r of rows) { const v = r.recency; if (v != null) { if (v < mn) mn = v; if (v > mx) mx = v; } }
    return mx > mn ? { mn, mx } : null;
  }, [rows, shade]);
  const shadeVal = React.useCallback((row) => {
    if (shade === "none") return null;
    if (shade === "seenLive") { if (row.seenLive == null) return null; return row.seenLive ? 0.15 : 1; } // brighter = never seen live
    if (shade === "recency") { if (row.recency == null || !shadeExtent) return null; return (row.recency - shadeExtent.mn) / (shadeExtent.mx - shadeExtent.mn); }
    return null;
  }, [shade, shadeExtent]);
  const fillFor = React.useCallback((row) => {
    const sv = shadeVal(row);
    const L = sv == null ? 0.64 : (0.34 + sv * 0.5);
    return "oklch(" + L.toFixed(3) + " 0.16 " + (row.hue != null ? row.hue : 300) + ")";
  }, [shadeVal]);

  // pointer → pixel-space coords in the (possibly zoomed) viewBox
  const toLocal = (evt) => {
    const svg = svgRef.current; if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const vb = z.bind.viewBox.split(" ").map(Number);
    const vx = vb[0] + (evt.clientX - rect.left) / rect.width * vb[2];
    const vy = vb[1] + (evt.clientY - rect.top) / rect.height * vb[3];
    return { x: vx, y: vy };
  };
  const onDown = (evt) => {
    if (evt.button != null && evt.button !== 0) return;
    const p = toLocal(evt); if (!p) return;
    dragRef.current = p;
    setBrush({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
    try { evt.currentTarget.setPointerCapture(evt.pointerId); } catch (e) {}
  };
  const onMove = (evt) => {
    const p = toLocal(evt); if (!p) return;
    if (dragRef.current) { setBrush({ x0: dragRef.current.x, y0: dragRef.current.y, x1: p.x, y1: p.y }); return; }
    let best = null, bd = 26 * 26;
    for (const pt of pts) { if (isPageDim(pt.row)) continue; const dx = pt.px - p.x, dy = pt.py - p.y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = pt; } }
    setHover(best);
    fish.run(evt.clientX, evt.clientY);   // proximity fisheye (paused while brushing via dragRef)
  };
  const onUp = () => {
    // guard on the REF (always current) — the `brush` STATE can lag a crisp click (setBrush from
    // onDown may not have committed yet), which silently swallowed subgenre/artist clicks (Fuad 2026-07-18).
    const start = dragRef.current;
    dragRef.current = null;
    if (start) {
      const w = brush ? Math.abs(brush.x1 - brush.x0) : 0, h = brush ? Math.abs(brush.y1 - brush.y0) : 0;
      if (brush && w > 6 && h > 6) { setBrushed({ x0: Math.min(brush.x0, brush.x1), x1: Math.max(brush.x0, brush.x1), y0: Math.min(brush.y0, brush.y1), y1: Math.max(brush.y0, brush.y1) }); setSingleSel(null); setClickSel(null); }
      else {
        // a CLICK (not a drag): subgenre mode toggles that one subgenre's selection (multi stays
        // on drag); artists grain TOGGLES the dot in/out of a picked list — click once to add,
        // again to subtract (Fuad 2026-07-18). Empty-space click clears everything.
        setBrushed(null);
        if (hover && mode === "subgenres") setSingleSel(s => s === hover.row.id ? null : hover.row.id);
        else if (hover) {
          setSingleSel(null);
          setClickSel(s => { const n = new Set(s || []); if (n.has(hover.row.id)) n.delete(hover.row.id); else n.add(hover.row.id); return n.size ? n : null; });
        } else { setSingleSel(null); setClickSel(null); }
      }
    }
    setBrush(null);
  };
  const onLeave = () => { if (!dragRef.current) { setHover(null); fish.reset(); } };

  const inBrush = React.useCallback((pt) => brushed ? (pt.px >= brushed.x0 && pt.px <= brushed.x1 && pt.py >= brushed.y0 && pt.py <= brushed.y1) : true, [brushed]);
  const isDimFam = React.useCallback((row) => famDim != null && row.fam !== famDim, [famDim]);
  // dimmed because it's outside the page's active time/genre/clock slice (the filter conjunction).
  // Treated like the family-dim: non-members drop out of the brush region and can't be opened.
  const isPageDim = React.useCallback((row) => pageActiveOf ? !pageActiveOf(row) : false, [pageActiveOf]);

  const brushedPts = React.useMemo(() => {
    if (!brushed) return [];
    return pts.filter(p => inBrush(p) && !isDimFam(p.row) && !isPageDim(p.row)).sort((a, b) => (b.row.plays || 0) - (a.row.plays || 0)).slice(0, 40);
  }, [pts, brushed, inBrush, isDimFam, isPageDim]);
  // lift the selection to the ranked list: a committed brush (region) OR a single-clicked
  // subgenre — artists as slugs, subgenres as SUBS indexes (Fuad 2026-07-13/14). The brush composes
  // WITH the page filter: dots dimmed by the active slice are excluded so brushing only ever refines
  // within the conjunction the chart already shows.
  React.useEffect(() => {
    if (!onBrushSel) return;
    if (brushed) {
      const all = pts.filter(p => inBrush(p) && !isDimFam(p.row) && !isPageDim(p.row));
      onBrushSel({ mode, keys: new Set(all.map(p => mode === "subgenres" ? parseInt(String(p.row.id).slice(4), 10) : p.row.id)) });
    } else if (clickSel && clickSel.size && mode !== "subgenres") {
      onBrushSel({ mode, keys: new Set(clickSel) });   // the click-picked artists behave like a brush
    } else if (singleSel && mode === "subgenres") {
      onBrushSel({ mode, keys: new Set([parseInt(String(singleSel).slice(4), 10)]) });
    } else onBrushSel(null);
  }, [brushed, singleSel, clickSel, pts, inBrush, isDimFam, isPageDim, mode, onBrushSel]);

  // POSITIONAL TRANSITIONS (guarded) — when the axes change React reuses each dot (keys are stable
  // per row), so we CAN glide dots to their new spot. cx/cy attributes don't animate, only CSS props
  // do, so on the animated path we pin cx/cy=0 and place the dot with transform: translate(px,py),
  // which the compositor can tween cheaply. Guard: only animate when the visible (non-dimmed) count
  // is ≤ ATTR_ANIM_MAX — thousands of tweening transforms would jank the Fold 5, so above the ceiling
  // (typically the full artists universe) we snap instantly exactly as before. Subgenres (~200) and
  // any filtered artist slice under the ceiling get the glide.
  const visCount = React.useMemo(() => {
    let c = 0;
    for (const pt of pts) if (!isDimFam(pt.row) && !isPageDim(pt.row)) c++;
    return c;
  }, [pts, isDimFam, isPageDim]);

  // Position is ALWAYS expressed as transform: translate(px,py) with cx/cy pinned to 0 (see dots
  // below) so a dot never switches how it is placed — that removes the path-switch that used to make
  // filtered-in points fly from the (0,0) corner. The only thing the guard decides is whether the
  // transform TRANSITION is armed for a given render. We arm it only when this render was caused by an
  // axis/lens change (X, Y, or artists|subgenres) AND no filter change happened this render, and both
  // the previous and current visible counts are under the ceiling. A filter change (anything that
  // alters the visible/dimmed set: page slice, family-dim, the underlying rows) suppresses the
  // transition for that render — so entering/leaving points snap into place. Opacity (dimming) keeps
  // transitioning on every path regardless; that's handled separately in the style.
  const lensKey = xKey + "|" + yKey + "|" + mode;
  // filter signature: anything that changes which dots are shown / dimmed but is NOT the lens.
  const filterSig = React.useMemo(() => rows.length + "|" + String(famDim) + "|" + String(!!pageActiveOf), [rows, famDim, pageActiveOf]);
  const prevFilterSigRef = React.useRef(filterSig);
  const prevLensRef = React.useRef(lensKey);
  const prevUnderCeilRef = React.useRef(visCount <= ATTR_ANIM_MAX);
  const filterChanged = prevFilterSigRef.current !== filterSig;
  const lensChanged = prevLensRef.current !== lensKey;
  const underCeil = visCount <= ATTR_ANIM_MAX;
  // arm the glide only for a pure lens change (no filter change this render) where both the previous
  // and the new render sit under the ceiling — i.e. two transform-mode renders whose only difference
  // is position. First mount (prev refs seeded equal) is never a lens change, so it never animates.
  const animatePos = lensChanged && !filterChanged && underCeil && prevUnderCeilRef.current;
  prevFilterSigRef.current = filterSig;
  prevLensRef.current = lensKey;
  prevUnderCeilRef.current = underCeil;

  // dots memoized WITHOUT the zoom factor — radius rides --zk so wheel-zoom reconciles nothing.
  // hover is deliberately NOT a dep (it changes every mousemove and used to rebuild the whole
  // layer per frame — audit 2026-07-18); the hover emphasis is a separate overlay ring below.
  const dots = React.useMemo(() => pts.map((pt, i) => {
    const on = inBrush(pt), dimF = isDimFam(pt.row), dimP = isPageDim(pt.row);
    const isSel = (singleSel && pt.row.id === singleSel) || (clickSel && clickSel.has(pt.row.id));
    // page-slice dim is the same visual language as ArtistCloud (0.05) / ExploreScatter (~0.14): a
    // dot outside the active slice fades hard and stops responding to pointer, so brush/hover only
    // touch the conjunction. Family-dim (0.06) still wins when both apply.
    const op = dimF ? 0.06 : dimP ? (mode === "subgenres" ? 0.12 : 0.05) : brushed ? (on ? 0.92 : 0.1) : (singleSel || clickSel) ? (isSel ? 0.95 : 0.15) : (mode === "subgenres" ? 0.82 : 0.72);
    // Position is ALWAYS via transform (cx/cy=0) so no dot ever switches how it's placed — that's what
    // kills the corner-flight. Opacity always transitions (cheap). The transform transition is armed
    // ONLY on a pure lens-change render (animatePos); otherwise transform:none so entering/moved-by-
    // filter dots snap. data-cx/data-cy keep the TRUE pixel coords for hover/brush/fisheye radius.
    const trans = animatePos ? `transform ${ATTR_ANIM_MS}ms ease-out, fill-opacity .3s ease` : "fill-opacity .3s ease";
    return (
      <circle key={pt.row.id + "-" + i} className="xp-fdot" data-cx={pt.px.toFixed(1)} data-cy={pt.py.toFixed(1)}
        cx={0} cy={0}
        fill={fillFor(pt.row)} fillOpacity={op}
        stroke={isSel ? "#fff" : "none"} strokeWidth={2} vectorEffect="non-scaling-stroke"
        style={{ transform: `translate(${pt.px.toFixed(1)}px, ${pt.py.toFixed(1)}px)`, r: `calc(${pt.radius.toFixed(2)}px * var(--zk) * var(--fk, 1))`, cursor: dimF || dimP ? "default" : "pointer", pointerEvents: dimF || dimP ? "none" : "auto", transition: trans }} />);
  }), [pts, brushed, singleSel, clickSel, inBrush, isDimFam, isPageDim, fillFor, mode, animatePos]);

  const subLabels = React.useMemo(() => mode !== "subgenres" ? null : pts.filter(pt => labelIds.has(pt.row.id) && !isDimFam(pt.row) && !isPageDim(pt.row)).map(pt => (
    <text key={"lbl" + pt.row.id} x={(pt.px + pt.radius + 3).toFixed(1)} y={(pt.py + 3).toFixed(1)}
      fill="var(--ink-dim)" fontFamily="var(--mono)" style={{ fontSize: `calc(10px * var(--zk))`, pointerEvents: "none" }}>
      {pt.row.name.length > 22 ? pt.row.name.slice(0, 21) + "…" : pt.row.name}</text>)), [pts, labelIds, mode, isDimFam, isPageDim]);

  const ticksFor = (scale) => {
    if (!scale.ok) return [];
    const out = [];
    for (let i = 0; i <= 3; i++) {
      const frac = i / 3;
      let raw = scale.ax.kind === "log" ? Math.pow(10, scale.min + frac * (scale.max - scale.min)) : scale.min + frac * (scale.max - scale.min);
      let lbl;
      if (scale.ax.kind === "feat" || scale.ax.kind === "year") lbl = Math.round(raw).toString();
      else if (raw >= 1000) lbl = (raw / 1000).toFixed(raw >= 10000 ? 0 : 1) + "k";
      else lbl = Math.round(raw).toString();
      out.push({ frac, lbl });
    }
    return out;
  };
  const xTicks = ticksFor(sx), yTicks = ticksFor(sy);
  const hoverRow = hover ? hover.row : null;

  // brush rect drawn in pixel space; --zk keeps stroke crisp at any zoom
  const bx = brush ? Math.min(brush.x0, brush.x1) : 0, by = brush ? Math.min(brush.y0, brush.y1) : 0;

  const openRow = (row) => { if (mode === "subgenres") return; go("artist", row.id); };

  return (
    <div style={{ padding: "10px 14px 12px", position: "relative" }}>
      {/* HOVER READOUT */}
      <div className="r-mono" style={{ minHeight: 16, marginBottom: 6, fontSize: 11, color: hoverRow ? "var(--ink)" : "var(--ink-faint)", letterSpacing: ".03em" }}>
        {hoverRow ? (
          <span>
            <b style={{ color: `oklch(0.7 0.16 ${hoverRow.hue != null ? hoverRow.hue : 300})` }}>{hoverRow.name}</b>
            {"  ·  " + attrAxisByKey(xKey).label + " " + attrFmtVal(hoverRow, xKey)}
            {"  ·  " + attrAxisByKey(yKey).label + " " + attrFmtVal(hoverRow, yKey)}
            {"  ·  " + (hoverRow.plays || 0).toLocaleString("en-US") + " plays"}
            {mode !== "subgenres" && hoverRow.seenLive ? "  ·  seen live" : ""}
          </span>
        ) : <span>hover a dot for its values{mode !== "subgenres" ? " · click to pick it (click again to remove)" : ""} · drag to brush a region · scroll to zoom</span>}
      </div>
      <ZoomControls z={z} />
      <div style={{ display: "flex", alignItems: "stretch" }}>
        {/* Y axis caption */}
        <div style={{ position: "relative", width: 16, flex: "0 0 16px" }}>
          <div className="r-mono" style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%) rotate(-90deg)", transformOrigin: "left", whiteSpace: "nowrap", fontSize: 9.5, color: "var(--ink-faint)", letterSpacing: ".14em", textTransform: "uppercase" }}>{attrAxisByKey(yKey).label} →</div>
        </div>
        <div style={{ position: "relative", flex: 1 }}>
          {/* keep useZoom's ref (wheel-zoom is bound via that ref) + viewBox + --zk, but DON'T spread
              its mouse pan handlers — this chart's drag is the brush, not a pan. Wheel + reset zoom. */}
          <svg ref={svgRef} viewBox={z.bind.viewBox}
            style={{ width: "100%", height: "auto", display: "block", background: "var(--bg-2, #0b0a0f)", borderRadius: 6, touchAction: "none", cursor: "crosshair", "--zk": z.k }}
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onLeave}>
            {yTicks.map((t, i) => { const y = PAD_T + (1 - t.frac) * PH; return <line key={"gy" + i} x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke="var(--rule)" strokeWidth="1" opacity="0.5" vectorEffect="non-scaling-stroke" />; })}
            {xTicks.map((t, i) => { const x = PAD_L + t.frac * PW; return <line key={"gx" + i} x1={x} x2={x} y1={PAD_T} y2={H - PAD_B} stroke="var(--rule)" strokeWidth="1" opacity="0.5" vectorEffect="non-scaling-stroke" />; })}
            <line x1={PAD_L} x2={PAD_L} y1={PAD_T} y2={H - PAD_B} stroke="var(--ink-faint)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            <line x1={PAD_L} x2={W - PAD_R} y1={H - PAD_B} y2={H - PAD_B} stroke="var(--ink-faint)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            {/* tick labels inside the svg so they ride the zoom transform */}
            {xTicks.map((t, i) => <text key={"xt" + i} x={PAD_L + t.frac * PW} y={H - PAD_B + 16} textAnchor="middle" fill="var(--ink-faint)" fontFamily="var(--mono)" style={{ fontSize: `calc(9px * var(--zk))` }}>{t.lbl}</text>)}
            {yTicks.map((t, i) => <text key={"yt" + i} x={PAD_L - 6} y={PAD_T + (1 - t.frac) * PH + 3} textAnchor="end" fill="var(--ink-faint)" fontFamily="var(--mono)" style={{ fontSize: `calc(9px * var(--zk))` }}>{t.lbl}</text>)}
            {dots}
            {/* hover emphasis lives OUTSIDE the memoized dot layer: one ring re-renders per
                mousemove instead of the whole field (audit 2026-07-18) */}
            {hover && <circle cx={hover.px} cy={hover.py} fill="none" stroke="#fff" strokeWidth="1.6"
              vectorEffect="non-scaling-stroke" pointerEvents="none"
              style={{ r: `calc(${(hover.radius + 2).toFixed(2)}px * var(--zk) * var(--fk, 1))` }} />}
            {/* printed subgenre labels removed (Fuad 2026-07-14: confusing black text) —
                replaced by a subtle hover label right above the bubble you're on */}
            {hover && <text x={hover.px} y={hover.py - hover.radius - 7} textAnchor="middle"
              fill="var(--ink)" fontFamily="var(--mono)" pointerEvents="none"
              style={{ fontSize: `calc(10.5px * var(--zk))`, paintOrder: "stroke", stroke: "var(--bg-2, #0b0a0f)", strokeWidth: 3 }}>{hover.row.name}</text>}
            {brush && <rect x={bx.toFixed(1)} y={by.toFixed(1)} width={Math.abs(brush.x1 - brush.x0).toFixed(1)} height={Math.abs(brush.y1 - brush.y0).toFixed(1)} fill="var(--accent)" fillOpacity="0.08" stroke="var(--accent)" strokeWidth="1" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />}
            {brushed && !brush && <rect x={brushed.x0.toFixed(1)} y={brushed.y0.toFixed(1)} width={(brushed.x1 - brushed.x0).toFixed(1)} height={(brushed.y1 - brushed.y0).toFixed(1)} fill="none" stroke="var(--accent)" strokeWidth="1" strokeDasharray="4 3" opacity="0.7" vectorEffect="non-scaling-stroke" />}
          </svg>
          <div className="r-mono" style={{ textAlign: "center", marginTop: 4, fontSize: 9.5, color: "var(--ink-faint)", letterSpacing: ".14em", textTransform: "uppercase" }}>{attrAxisByKey(xKey).label} →</div>
        </div>
      </div>

      {/* SELECTION RESULTS — a committed brush region OR the click-picked dots; rows click
          through to artist pages (artists mode); scrolls inside .xp-attr-info so the chart
          above never moves (Fuad 2026-07-14) */}
      {(brushed || (clickSel && clickSel.size > 0)) && (() => {
        const listPts = brushed ? brushedPts : pts.filter(p => clickSel.has(p.row.id)).sort((a, b) => (b.row.plays || 0) - (a.row.plays || 0));
        return (
        <div className="xp-attr-info" style={{ marginTop: 14, borderTop: "1px solid var(--rule)", paddingTop: 12 }}>
          <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: ".14em", textTransform: "uppercase", marginBottom: 8 }}>
            {brushed
              ? <>{listPts.length} in region — top {Math.min(40, listPts.length)} by plays{mode !== "subgenres" ? " · tap to open" : ""}</>
              : <>{listPts.length} picked — click a dot again to remove it · tap a row to open</>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "2px 16px" }}>
            {listPts.map((pt) => (
              <div key={pt.row.id} className="xp-attr-brushrow" data-link={mode !== "subgenres"} onClick={() => openRow(pt.row)}>
                <span style={{ color: `oklch(0.7 0.16 ${pt.row.hue != null ? pt.row.hue : 300})`, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pt.row.name}</span>
                <span style={{ color: "var(--ink-faint)", flex: "0 0 auto" }}>{(pt.row.plays || 0).toLocaleString("en-US")} · {attrFmtVal(pt.row, xKey)}/{attrFmtVal(pt.row, yKey)}</span>
              </div>
            ))}
          </div>
        </div>
        );
      })()}
    </div>
  );
}

// AttrExplore — the "attributes" lens wrapper: lazy-loads track-audio.js, memoises the centroid
// pass, owns the X/Y/shade pickers + the family colour key (click a family to dim the rest).
function AttrExplore({ R, go, grain, onBrushSel, activeIds, activeSub, activeFam, filtersActive, xKey, yKey, setXKey, setYKey }) {
  const [taReady, setTaReady] = React.useState(!!window.ROTATION_TRACKAUDIO);
  const [restReady, setRestReady] = React.useState(!!(R && R._restLoaded));
  const [shade, setShade] = React.useState("none");
  const [famDim, setFamDim] = React.useState(null); // family index to isolate, or null

  const mode = grain === "artists" ? "artists" : "subgenres"; // reuse Explore's subs|artists seg

  React.useEffect(() => {
    if (window.ROTATION_TRACKAUDIO) { setTaReady(true); return; }
    const existing = document.getElementById("xp-track-audio-js");
    if (!existing) {
      const s = document.createElement("script");
      s.id = "xp-track-audio-js"; s.src = "track-audio.js";
      s.onload = () => setTaReady(true); s.onerror = () => setTaReady(true);
      document.head.appendChild(s);
    } else {
      const poll = setInterval(() => { if (window.ROTATION_TRACKAUDIO) { clearInterval(poll); setTaReady(true); } }, 80);
      return () => clearInterval(poll);
    }
  }, []);
  React.useEffect(() => {
    if (!R || R._restLoaded) { setRestReady(true); return; }
    const poll = setInterval(() => { if (R._restLoaded) { clearInterval(poll); setRestReady(true); } }, 150);
    return () => clearInterval(poll);
  }, []);

  const built = React.useMemo(() => {
    if (!taReady || !window.ROTATION_TRACKAUDIO || !R) return null;
    const base = attrBuildArtists(window.ROTATION_TRACKAUDIO, R);
    return { ...base, subs: attrBuildSubs(base.artists, R) };
  }, [taReady, restReady, R]);

  const rows = built ? (mode === "subgenres" ? built.subs : built.artists) : [];

  // FILTER CONJUNCTION — the attributes lens now honours the page's time/genre/clock slice exactly
  // like the texture/mood charts: dots outside the active slice dim (and go non-interactive), and the
  // brush refines WITHIN that dimmed view. artists grain reads the shared `activeIds` set (moodActive,
  // same as ArtistCloud/MoodQuadrant); subs grain reads activeSub/activeFam like ExploreScatter. When
  // no page filter is set, everything renders full strength (pageFiltered=false → pageActiveOf=true).
  // artists honour the whole slice (year/genre/clock via activeIds); subs dim by genre only, exactly
  // like ExploreScatter (which ignores year/clock for its subgenre dimming).
  const pageFiltered = mode === "subgenres"
    ? (activeSub != null || activeFam != null)
    : (!!filtersActive && activeIds != null && activeIds.size > 0);
  const pageActiveOf = React.useCallback((row) => {
    if (!pageFiltered) return true;
    if (mode === "subgenres") {
      const nm = (row.sub != null && R.SUBS[row.sub]) ? R.SUBS[row.sub].name : row.name;
      return activeSub != null ? nm === activeSub : (activeFam != null ? row.fam === activeFam : true);
    }
    return activeIds ? activeIds.has(row.id) : true;
  }, [pageFiltered, mode, activeSub, activeFam, activeIds, R]);

  // families actually present in the current rows, for the colour key (ordered by FAMILIES index)
  const legendFams = React.useMemo(() => {
    if (!built) return [];
    const present = new Set();
    for (const r of rows) if (r.fam != null) present.add(r.fam);
    return R.FAMILIES.filter(f => present.has(f.i));
  }, [rows, built, R]);

  // shade options: none · recency · seen-live. recency/seen-live are per-artist only → hidden in
  // subgenre mode. If shade is set to a per-artist option and we switch to subgenres, fall back.
  const shadeOpts = mode === "subgenres"
    ? [{ key: "none", label: "none" }]
    : [{ key: "none", label: "none" }, { key: "recency", label: "recency" }, { key: "seenLive", label: "seen-live" }];
  React.useEffect(() => { if (!shadeOpts.some(o => o.key === shade)) setShade("none"); }, [mode]);

  const selBox = { background: "var(--bg-2)", color: "var(--ink)", border: "1px solid var(--rule)", borderRadius: 6, fontFamily: "var(--mono)", fontSize: 11, padding: "4px 8px", letterSpacing: ".03em", cursor: "pointer" };
  const ctrlLabel = { fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-faint)", letterSpacing: ".14em", textTransform: "uppercase", marginRight: 6 };

  if (!taReady) return <div className="r-mono xp-attr-msg">Loading track-audio…</div>;
  if (!built || !built.artists.length) return <div className="r-mono xp-attr-msg">No artists with ≥3 audio-featured tracks.</div>;

  return (
    <div>
      {/* pickers — wrap on mobile */}
      <div className="xp-attr-ctrls">
        <div><span style={ctrlLabel}>X</span>
          <select value={xKey} onChange={e => setXKey(e.target.value)} style={selBox}>{ATTR_AXES.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}</select></div>
        <div><span style={ctrlLabel}>Y</span>
          <select value={yKey} onChange={e => setYKey(e.target.value)} style={selBox}>{ATTR_AXES.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}</select></div>
        <div><span style={ctrlLabel}>shade</span>
          <select value={shade} onChange={e => setShade(e.target.value)} style={selBox}>{shadeOpts.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}</select></div>
      </div>

      <AttrScatter rows={rows} mode={mode} xKey={xKey} yKey={yKey} shade={shade} famDim={famDim} go={go} onBrushSel={onBrushSel} pageActiveOf={pageActiveOf} />

      {/* family colour key — tap a family to isolate it (dim the rest); tap again to clear */}
      <div className="xp-attr-legend">
        {legendFams.map(f => {
          const on = famDim === f.i;
          return (
            <button key={f.i} className="xp-attr-legitem" data-on={on} data-dim={famDim != null && !on}
              onClick={() => setFamDim(x => x === f.i ? null : f.i)} title={"isolate " + f.family}>
              <span className="xp-attr-swatch" style={{ background: `oklch(0.62 0.16 ${f.hue})` }} />
              <span>{f.family}</span>
            </button>
          );
        })}
        {famDim != null && <button className="xp-attr-legitem xp-attr-legclear" onClick={() => setFamDim(null)}>clear</button>}
      </div>

      <div className="r-mono xp-attr-foot">
        {/* "plotted", not "have ≥3 featured tracks" — 2,774 clear that bar but 4 of them have no
            row in ARTISTS or EXPLORE to hang a name and a genre on, so they cannot be drawn. The
            old wording reported the plotted count as if it were the population, which was off by
            those 4. (Checked 2026-08-20 when Fuad expected the Explore floor change to move this
            number: it doesn't. The binding constraint here is the ≥3-audio-track bar, not the play
            floor — every artist the floor added has too few tracks with features to qualify.) */}
        {built.artists.length} of {built.totalAudioArtists || "?"} audio-covered artists plotted · ≥3 featured tracks each · coloured by genre family
        {shade === "seenLive" ? " · brighter = never seen live" : shade === "recency" ? " · brighter = played more recently" : ""}
        {!restReady ? " · popularity & debut-year fill in as the long-tail universe loads" : ""}
      </div>

      <style>{`
        .xp-attr-msg { font-size: 11px; color: var(--ink-faint); letter-spacing: .06em; padding: 24px 16px; text-align: center; }
        .xp-attr-ctrls { display: flex; flex-wrap: wrap; gap: 10px 18px; align-items: center; padding: 12px 14px 4px; }
        .xp-attr-brushrow { font-family: var(--mono); font-size: 11px; color: var(--ink-dim); display: flex; justify-content: space-between; gap: 8px; padding: 2px 3px; border-radius: 4px; }
        .xp-attr-brushrow[data-link="true"] { cursor: pointer; }
        .xp-attr-brushrow[data-link="true"]:hover { background: var(--bg-3); }
        .xp-attr-legend { display: flex; flex-wrap: wrap; gap: 5px 6px; padding: 4px 14px 10px; }
        .xp-attr-legitem { display: inline-flex; align-items: center; gap: 6px; padding: 4px 9px; border-radius: 999px; border: 1px solid var(--rule); background: transparent; color: var(--ink-soft); font-family: var(--mono); font-size: 10px; cursor: pointer; transition: .14s; }
        .xp-attr-legitem:hover { border-color: var(--ink-faint); color: var(--ink); }
        .xp-attr-legitem[data-on="true"] { border-color: var(--accent); color: var(--ink); box-shadow: inset 0 0 0 1px var(--accent); }
        .xp-attr-legitem[data-dim="true"] { opacity: .5; }
        .xp-attr-legclear { color: var(--ink-faint); border-style: dashed; }
        .xp-attr-swatch { width: 10px; height: 10px; border-radius: 3px; flex: none; }
        .xp-attr-foot { font-size: 9.5px; color: var(--ink-faint); letter-spacing: .04em; padding: 2px 14px 12px; line-height: 1.5; }
        /* each ctrl group (label + select) must not push past the card edge on narrow phones (Fuad 2026-07-25) */
        .xp-attr-ctrls > div { min-width: 0; }
        .xp-attr-ctrls select { max-width: 100%; }
        @media (max-width: 520px) { .xp-attr-ctrls { gap: 8px 12px; } .xp-attr-ctrls select { font-size: 11px; } }
      `}</style>
    </div>
  );
}

// MoodContext — the facts strip + mood-over-years arc, recomputed for whatever slice is active.
function MoodContext({ R, arts, go }) {
  const A = R.AUDIO || {};
  const years = React.useMemo(() => R.GENRE_FLOW.years.map(y => y.year), [R]);
  const facts = React.useMemo(() => {
    const all = arts; const n = all.length || 1;
    let se = 0, sv = 0, sd = 0, smaj = 0, sbpm = 0;
    for (const a of all) { const af = A[a.id]; se += af[0]; sv += af[1]; sd += af[4]; smaj += af[6]; sbpm += 50 + af[3] * 140; }
    const strong = all.filter(a => a.plays >= 30); const pool = strong.length ? strong : all;
    const top = (idx, dir) => pool.slice().sort((x, y) => dir * (A[y.id][idx] - A[x.id][idx]))[0];
    return { n: all.length, energy: se / n, valence: sv / n, dance: sd / n, major: smaj / n, bpm: Math.round(sbpm / n),
      danceArtist: top(4, 1), sadArtist: top(1, -1), obscureArtist: top(7, -1) };
  }, [arts]);
  const arc = React.useMemo(() => {
    const e = years.map(() => [0, 0]), v = years.map(() => [0, 0]);
    for (const a of arts) { const af = A[a.id]; if (!af || !a.yp) continue; years.forEach((y, i) => { const w = a.yp[y] || 0; if (!w) return; e[i][0] += af[0] * w; e[i][1] += w; v[i][0] += af[1] * w; v[i][1] += w; }); }
    return years.map((y, i) => ({ y, energy: e[i][1] ? e[i][0] / e[i][1] : null, valence: v[i][1] ? v[i][0] / v[i][1] : null }));
  }, [arts, years]);
  const W = 1000, H = 240, pad = 30;
  const xAt = (i) => pad + (years.length === 1 ? 0 : i / (years.length - 1)) * (W - 2 * pad);
  const yAt = (val) => pad + (1 - val) * (H - 2 * pad);
  const line = (key) => arc.map((d, i) => d[key] == null ? null : `${xAt(i).toFixed(1)} ${yAt(d[key]).toFixed(1)}`).filter(Boolean).join(" L ");
  const Fact = ({ k, v, sub }) => (<div className="r-card" style={{ padding: "13px 15px" }}><div className="r-mono" style={{ fontSize: 8.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ink-faint)" }}>{k}</div><div style={{ fontFamily: "var(--serif)", fontSize: 21, marginTop: 2 }}>{v}</div>{sub && <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", marginTop: 2 }}>{sub}</div>}</div>);
  if (!arts.length) return <div className="r-card xp-empty" style={{ marginTop: "var(--gap)" }}>No measured audio in this slice — loosen a filter.</div>;
  return (
    <div style={{ marginTop: "var(--gap)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: "var(--gap)", marginBottom: "var(--gap)" }}>
        <Fact k="avg energy" v={Math.round(facts.energy * 100) + "%"} sub={facts.bpm + " bpm median"} />
        <Fact k="avg mood" v={Math.round(facts.valence * 100) + "%"} sub={facts.valence < .45 ? "leans dark" : facts.valence > .55 ? "leans bright" : "balanced"} />
        <Fact k="key" v={Math.round(facts.major * 100) + "% major"} sub={facts.major < .5 ? "minor-leaning" : "mostly major"} />
        <Fact k="most danceable" v={facts.danceArtist ? facts.danceArtist.name : "—"} sub="by audio" />
        <Fact k="darkest" v={facts.sadArtist ? facts.sadArtist.name : "—"} sub="lowest valence" />
        <Fact k="most obscure" v={facts.obscureArtist ? facts.obscureArtist.name : "—"} sub="lowest popularity" />
      </div>
      <div className="r-card" style={{ padding: "16px 18px" }}>
        <div className="r-card-h" style={{ padding: 0, marginBottom: 6 }}><span className="lbl"><b>Mood over the years</b></span>
          <span className="meta"><span style={{ color: "oklch(0.66 0.18 30)" }}>● energy</span> &nbsp; <span style={{ color: "oklch(0.66 0.16 250)" }}>● mood</span> · {fmt(facts.n)} artists</span></div>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
          <line x1={pad} y1={yAt(.5)} x2={W - pad} y2={yAt(.5)} stroke="var(--rule)" strokeDasharray="3 4" />
          <path d={"M " + line("energy")} fill="none" stroke="oklch(0.66 0.18 30)" strokeWidth="2.4" />
          <path d={"M " + line("valence")} fill="none" stroke="oklch(0.66 0.16 250)" strokeWidth="2.4" />
          {years.map((y, i) => <text key={y} x={xAt(i)} y={H - 8} textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-faint)" opacity={i % 2 === 0 || i === years.length - 1 ? 1 : 0}>{"'" + String(y).slice(2)}</text>)}
        </svg>
        <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", marginTop: 4 }}>each year averaged across what you played in this slice that year, weighted by plays · midline = 50%</div>
      </div>
    </div>
  );
}

// ── search ──
function timeMatches(R, q) {
  if (q.length < 2) return [];
  const days = R.CLOCK.days, all7 = [0, 1, 2, 3, 4, 5, 6], allH = Array.from({ length: 24 }, (_, h) => h);
  const cf = (ds, hs) => { const c = []; for (const d of ds) for (const h of hs) c.push(d * 24 + h); return c; };
  const out = [];
  const defs = [
    [["late night", "night", "late"], "Late night · 12–5 AM", all7, [0, 1, 2, 3, 4]],
    [["morning"], "Morning · 6–11 AM", all7, [6, 7, 8, 9, 10, 11]],
    [["afternoon", "arvo"], "Afternoon · 12–5 PM", all7, [12, 13, 14, 15, 16, 17]],
    [["evening"], "Evening · 6–11 PM", all7, [18, 19, 20, 21, 22, 23]],
    [["weekend"], "Weekend", [5, 6], allH],
    [["weekday", "weekdays", "week day"], "Weekdays", [0, 1, 2, 3, 4], allH],
  ];
  for (const [kws, label, ds, hs] of defs) if (kws.some(k => k.startsWith(q) || k.includes(q))) out.push({ type: "time", label, cells: cf(ds, hs) });
  ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].forEach((dn, i) => { if (dn.startsWith(q)) out.push({ type: "time", label: days[i], cells: cf([i], allH) }); });
  const m = /^(\d{1,2})\s*(am|pm)$/.exec(q);
  if (m) { let h = parseInt(m[1], 10) % 12; if (m[2] === "pm") h += 12; out.push({ type: "time", label: `${m[1]} ${m[2].toUpperCase()}`, cells: cf(all7, [h]) }); }
  if ("midnight".startsWith(q) && q.length >= 3) out.push({ type: "time", label: "Midnight", cells: cf(all7, [0]) });
  if ("noon".startsWith(q) && q.length >= 2) out.push({ type: "time", label: "Noon", cells: cf(all7, [12]) });
  return out.slice(0, 4);
}
function computeResults(R, yearKeys, subNames, raw) {
  const q = (raw || "").trim().toLowerCase();
  if (q.length < 2) return [];
  const inc = (s) => s && (s.toLowerCase().includes(q) || (KANA_RE.test(s) && kanaToRomaji(s).includes(q)));
  return [
    { type: "artist", label: "Artists", items: R.ARTISTS.filter(a => inc(a.name)).slice(0, 6).map(a => ({ type: "artist", label: a.name, id: a.id, dot: a.hue })) },
    { type: "sub", label: "Subgenres", items: subNames.filter(inc).slice(0, 6).map(n => ({ type: "sub", label: n, name: n })) },
    { type: "album", label: "Albums", items: R.ALBUMS.filter(a => inc(a.title)).slice(0, 3).map(a => ({ type: "album", label: a.title, sub: a.artist, id: a.artistId, dot: a.hue })) },
    { type: "track", label: "Tracks", items: R.TRACKS.filter(a => inc(a.title)).slice(0, 3).map(a => ({ type: "track", label: a.title, sub: a.artist, id: a.artistId, dot: a.hue })) },
    { type: "year", label: "Years", items: yearKeys.filter(y => String(y).includes(q)).slice(0, 4).map(y => ({ type: "year", label: String(y), year: y })) },
    { type: "time", label: "Times", items: timeMatches(R, q) },
  ];
}
function ExploreSearch({ R, yearKeys, subNames, onArtist, onSub, onYear, onCells, go }) {
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const boxRef = React.useRef(null);
  const groups = React.useMemo(() => computeResults(R, yearKeys, subNames, q), [R, yearKeys, subNames, q]);
  const flat = groups.flatMap(g => g.items);
  const pick = (it) => {
    setQ(""); setOpen(false);
    // Album and track hits narrow to their ARTIST rather than opening that album's or track's page
    // (Fuad 2026-08-20). Explore is the narrowing surface; leaving it on a click was the one thing
    // this box did that the rest of the page never does. Their `id` is already the artist id.
    if (it.type === "track" || it.type === "album" || it.type === "artist") onArtist(it.id);
    else if (it.type === "sub") onSub(it.name);
    else if (it.type === "year") onYear(it.year);
    else if (it.type === "time") onCells(it.cells);
  };
  return (
    <div className="xp-search" ref={boxRef} onBlur={(e) => { if (!boxRef.current || !boxRef.current.contains(e.relatedTarget)) setOpen(false); }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
      <input value={q} placeholder="Search artists, subgenres, years, times…"
        onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === "Enter" && flat[0]) pick(flat[0]); if (e.key === "Escape") setOpen(false); }} />
      {open && q.trim().length >= 2 && (
        <div className="xp-search-pop">
          {flat.length === 0 ? <div className="xp-search-empty">No matches for “{q.trim()}”</div> :
            groups.filter(g => g.items.length).map(g => (
              <div key={g.type} className="xp-search-grp">
                <div className="xp-search-gl">{g.label}</div>
                {g.items.map((it, i) => (
                  <button key={it.type + i} className="xp-search-item" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(it)}>
                    {it.dot != null && <span className="xp-dot" style={{ background: `oklch(0.62 0.16 ${it.dot})` }} />}
                    <span className="xp-search-lbl">{it.label}</span>
                    {it.sub && <span className="xp-search-sub">{it.sub}</span>}
                  </button>
                ))}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function ExploreView({ t, go, setPop, seed }) {
  const R = window.ROTATION;
  const [kind, setKind] = React.useState("artists");
  // Time filter is now MULTISELECT: a Set of listening years. Empty set = "All" (no year constraint).
  // A record qualifies if it has plays in ANY selected year (union); play counts sum across the set.
  const [years, setYears] = React.useState(() => new Set());
  const hasYears = years.size > 0;                        // any year constraint active?
  // toggle one year in/out of the selection; used by the Time chiprow
  const toggleYear = (y) => setYears(prev => { const n = new Set(prev); n.has(y) ? n.delete(y) : n.add(y); return n; });
  const [fam, setFam] = React.useState(null);             // family index, or null
  const [sub, setSub] = React.useState(null);             // subgenre NAME, or null
  const [cells, setCells] = React.useState(() => new Set());
  const [vocals, setVocals] = React.useState("any");      // vocals dimension: any/male/female/mixed/nb/instrumental
  const [playing, setPlaying] = React.useState(false);
  const [lens, setLens] = React.useState("attributes");   // left surface: "texture" map · "mood" quadrant · "attributes" (default — no panning, best perf; Fuad 2026-07-15)
  const [attrSel, setAttrSel] = React.useState(null);     // attributes-lens brush selection ({mode, keys}) — filters the ranked list
  // Artists picked out of the search box. Choosing a result used to navigate away to that
  // artist/album/track page, which is the opposite of what a filter bar is for (Fuad 2026-08-20):
  // Explore is where you narrow, so a hit narrows. Album and track hits resolve to their artist,
  // since the ranked list and both maps key on artist id — searching an album is a way of saying
  // "this artist" without having to remember which one it was.
  const [picks, setPicks] = React.useState(() => new Set());
  const addPick = (id) => { if (id) setPicks(prev => new Set(prev).add(id)); };
  const dropPick = (id) => setPicks(prev => { const n = new Set(prev); n.delete(id); return n; });
  React.useEffect(() => { if (lens !== "attributes") setAttrSel(null); }, [lens]);
  // attributes-lens axis pair, lifted here so it's URL-serialisable (deep-link/refresh). Owner's
  // requested Explore default is Energy × Popularity (energy horizontal, popularity vertical); the
  // axis keys are validated against ATTR_AXES (unknown/absent → the default).
  const [attrX, setAttrX] = React.useState("energy");
  const [attrY, setAttrY] = React.useState("popularity");
  const [grain, setGrain] = React.useState("artists");    // plot granularity for either lens: "subs" or "artists" (default artists; Fuad 2026-07-15)
  const [moodZone, setMoodZone] = React.useState(null);   // active valence×energy quadrant filter, or null
  const [themeSel, setThemeSel] = React.useState(() => new Set());   // selected theme bit-indices (AND within selection)
  const [relDec, setRelDec] = React.useState(null);       // selected release DECADE (start year e.g. 1990), or null
  const [relYear, setRelYear] = React.useState(null);     // drilled release YEAR within relDec, or null
  const [filtReady, setFiltReady] = React.useState(!!window.ROTATION_FILTER);   // filter-index (themes + release years) loaded
  const [mediaReady, setMediaReady] = React.useState(!!window.ROTATION_MEDIA);
  const [showN, setShowN] = React.useState(16);           // base visible rows (16/32/64 buttons; default 16)
  const [extra, setExtra] = React.useState(0);            // extra rows revealed by "load more" beyond the base;
  const visN = showN + extra;                             //   reset by the count buttons and by any filter change
  const [disp, setDisp] = React.useState("list");         // ranked results: list ⇄ cover grid (Fuad 2026-07-07)
  const [ref, seen] = useInView();

  // albums/tracks now rank from the lazy media-index (full library depth) — load it the first time
  // one of those tabs is opened.
  React.useEffect(() => {
    if (kind === "artists" || window.ROTATION_MEDIA) { if (window.ROTATION_MEDIA && !mediaReady) setMediaReady(true); return; }
    window.loadScript("media-index.js", "rotation-media-idx-js", () => setMediaReady(true));
  }, [kind]);

  // filter-index (themes + release years) — needed for the theme chips AND the decades bar on every
  // tab, so lazy-load it on the first Explore visit via the shared loadScript idiom (fail-open).
  // Also pull media-index on mount: the theme/decade aggregation (track→artist/album ≥20% rule) and
  // the decades-bar play weights both read it, even on the artists tab (which otherwise skips it).
  React.useEffect(() => {
    if (window.ROTATION_FILTER) { if (!filtReady) setFiltReady(true); }
    else window.loadScript("filter-index.js", "rotation-filter-js", () => setFiltReady(true));
    if (window.ROTATION_MEDIA) { if (!mediaReady) setMediaReady(true); }
    else window.loadScript("media-index.js", "rotation-media-idx-js", () => setMediaReady(true));
  }, []);

  // deep-link: arriving via #explore/<tag> (e.g. from an artist-page genre chip) preselects that
  // subgenre, or its family if the tag names a family rather than a leaf subgenre. A seed with
  // "=" is instead a full serialized filter slice (see the hash-writer effect below).
  React.useEffect(() => {
    if (!seed) return;
    const norm = (x) => (x || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (seed.includes("=")) {   // restore a shared/bookmarked slice (";"-separated; parseHash already url-decoded)
      const p = {}; for (const kv of seed.split(";")) { const i = kv.indexOf("="); if (i > 0) p[kv.slice(0, i)] = kv.slice(i + 1); }
      // y = selected listening years. Multiselect encodes a "."-separated list ("2015.2019");
      // a bare single year ("y=2015") still restores (backward compat with old single-year links).
      if (p.y) { const ys = String(p.y).split(".").map(Number).filter(n => !isNaN(n)); if (ys.length) setYears(new Set(ys)); }
      if (p.s) { const s = R.SUBS.find(x => norm(x.name) === norm(p.s)); if (s) { setFam(null); setSub(s.name); } }
      else if (p.f) { const fm = _resolveFamParam(R, p.f); if (fm) { setSub(null); setFam(fm.i); } }
      if (p.m && MOOD_ZONES.includes(p.m)) setMoodZone(p.m);
      if (p.c) setCells(new Set(p.c.split(".").map(Number).filter(n => n >= 0 && n < 168)));
      if (p.t) setThemeSel(new Set(p.t.split(".").map(Number).filter(n => n >= 0 && n < 28)));
      if (p.rd && !isNaN(+p.rd)) setRelDec(+p.rd);
      if (p.ry && !isNaN(+p.ry)) setRelYear(+p.ry);
      if (p.k === "albums" || p.k === "tracks") setKind(p.k);
      // attributes-lens axis pair (ax=X, ay=Y). Validated against ATTR_AXES; unknown/absent keeps
      // the Energy × Popularity default set above (backward compat with links that predate this).
      if (p.ax && ATTR_AXES.some(a => a.key === p.ax)) setAttrX(p.ax);
      if (p.ay && ATTR_AXES.some(a => a.key === p.ay)) setAttrY(p.ay);
      return;
    }
    const q = norm(seed);
    const s = R.SUBS.find(x => norm(x.name) === q);
    if (s) { setFam(null); setSub(s.name); return; }
    const fm = _resolveFamParam(R, seed);
    if (fm) { setSub(null); setFam(fm.i); }
  }, [seed, R]);

  // keep the active slice in the URL (replaceState — no history spam, no popstate loops) so any
  // Explore state is bookmarkable/shareable and survives refresh.
  const _mounted = React.useRef(false);
  React.useEffect(() => {
    if (!_mounted.current) { _mounted.current = true; if (seed) return; }   // don't clobber an incoming seed on first render
    if (!(window.location.hash || "").startsWith("#explore")) return;      // only while Explore owns the URL
    const parts = [];
    if (years.size) parts.push("y=" + [...years].sort((a, b) => a - b).join("."));
    if (sub) parts.push("s=" + encodeURIComponent(sub));
    else if (fam != null) { const fm = R.FAMILIES.find(f => f.i === fam); if (fm) parts.push("f=" + encodeURIComponent(fm.family)); }
    if (moodZone) parts.push("m=" + moodZone);
    if (cells.size) parts.push("c=" + [...cells].sort((a, b) => a - b).join("."));
    if (themeSel.size) parts.push("t=" + [...themeSel].sort((a, b) => a - b).join("."));
    if (relDec != null) parts.push("rd=" + relDec);
    if (relYear != null) parts.push("ry=" + relYear);
    if (kind !== "artists") parts.push("k=" + kind);
    // attributes-lens axis pair — only serialise when it differs from the Energy × Popularity default
    // (absent = default), so ordinary links stay clean and old links keep working.
    if (attrX !== "energy") parts.push("ax=" + attrX);
    if (attrY !== "popularity") parts.push("ay=" + attrY);
    const target = "#explore" + (parts.length ? "/" + parts.join(";") : "");
    if ((window.location.hash || "") !== target) window.history.replaceState(null, "", target);
  }, [kind, years, fam, sub, moodZone, cells, themeSel, relDec, relYear, attrX, attrY, R]);

  const yearKeys = React.useMemo(() => Object.keys(R.CLOCK_BY_YEAR).map(Number).sort((a, b) => a - b), [R]);
  const subNames = React.useMemo(() => R.SUBS.map(s => s.name), [R]);
  const subIdx = sub == null ? -1 : R.SUBS.findIndex(s => s.name === sub);

  // "play the decade" scrubs one year at a time — it REPLACES the multiselect with the single
  // advancing year each tick (so the map/list animate exactly as before). curYear = the sole year
  // when precisely one is selected, else null.
  const curYear = years.size === 1 ? [...years][0] : null;
  React.useEffect(() => {
    if (!playing) return;
    const tmr = setInterval(() => setYears(prev => {
      const y = prev.size === 1 ? [...prev][0] : null;
      const i = y == null ? -1 : yearKeys.indexOf(y);
      if (i >= yearKeys.length - 1) { setPlaying(false); return new Set([yearKeys[yearKeys.length - 1]]); }
      return new Set([yearKeys[i + 1]]);
    }), 1600);
    return () => clearInterval(tmr);
  }, [playing, yearKeys]);
  const togglePlay = () => {
    if (!playing && (curYear == null || yearKeys.indexOf(curYear) >= yearKeys.length - 1)) setYears(new Set([yearKeys[0]]));
    setPlaying(p => !p);
  };

  const weights = React.useMemo(() => mapWeights(R, years), [R, years]);
  // stable all-time grouping (families + their subgenres) so the breakdown never reflows on year-scrub
  const order = React.useMemo(() => {
    const allW = mapWeights(R, null);
    const byFam = new Map();
    R.SUBS.forEach((s, i) => {
      if (!byFam.has(s.fam)) byFam.set(s.fam, { fam: s.fam, family: (R.FAMILIES.find(f => f.i === s.fam) || {}).family || "—", hue: s.hue, subs: [], total: 0 });
      const g = byFam.get(s.fam); g.subs.push({ idx: i, name: s.name }); g.total += allW[i].w;
    });
    const arr = [...byFam.values()];
    arr.forEach(g => g.subs.sort((a, b) => allW[b.idx].w - allW[a.idx].w));
    return arr.sort((a, b) => b.total - a.total);
  }, [R]);
  const [sound, setSound] = React.useState(null);
  const [sndDir, setSndDir] = React.useState(1);

  // per-media-artist resolution (id / profiled record / hue), computed once the index is loaded
  const mediaArtMeta = React.useMemo(() => {
    const M = window.ROTATION_MEDIA; if (!M) return null;
    // prefer the EXPLORE record (it carries subgenres .s); fall back to the kept-artist record for hue
    return M.artists.map(name => { const aid = R.idForName(name) || R.slug(name); const rec = (R.expById && R.expById[aid]) || R.byId[aid]; return { aid, rec, hue: rec ? rec.hue : _hueHash(name) }; });
  }, [R, mediaReady]);
  // ── THEMES + DECADES filter (filter-index.js) ──────────────────────────────────────────────
  // themeSel = selected theme bit-indices (AND within selection — a track must carry EVERY selected
  // theme); relDec/relYear = release-era window.
  // The mask/year test runs at TRACK level; artists & albums qualify when ≥MATCH_FRAC of their
  // matched-track plays fall in the selection (tune: 20%). Sets are precomputed once per selection,
  // and the ranked lists just membership-test — same shape as the attrSel pre-slice path.
  const MATCH_FRAC = 0.20;
  const themeNames = (window.ROTATION_FILTER && window.ROTATION_FILTER.themes) || [];
  const themeMask = React.useMemo(() => { let m = 0; for (const b of themeSel) m |= (1 << b); return m; }, [themeSel]);
  const relLo = relYear != null ? relYear : (relDec != null ? relDec : null);
  const relHi = relYear != null ? relYear : (relDec != null ? relDec + 9 : null);
  const filtActive = (themeMask !== 0) || (relLo != null);
  // per-track predicate over filter-index: theme (AND — a track must carry EVERY selected theme,
  // so (mask & sel) === sel) AND release-year window (both optional).
  const passTrack = React.useCallback((key) => {
    const F = window.ROTATION_FILTER; if (!F) return true;
    const v = F.t[key]; if (!v) return false;                 // unfiltered track can't satisfy an active selection
    if (themeMask && (v[0] & themeMask) !== themeMask) return false;
    if (relLo != null) { const y = v[1]; if (!y || y < relLo || y > relHi) return false; }
    return true;
  }, [themeMask, relLo, relHi]);
  // artist/album qualify-sets (≥MATCH_FRAC of matched-track plays in-selection) + per-theme live counts.
  const passAgg = React.useMemo(() => {
    const F = window.ROTATION_FILTER, M = window.ROTATION_MEDIA;
    if (!filtActive || !F || !M || !mediaArtMeta) return null;
    const artTot = new Map(), artHit = new Map(), albTot = new Map(), albHit = new Map();
    for (const row of M.tracks) {
      const meta = mediaArtMeta[row[1]]; if (!meta) continue;   // guard: media artist idx with no meta (index desync) — skip, don't throw
      const plays = row[2], aid = meta.aid, ai = row[3];
      const alb = ai >= 0 ? M.albums[ai] : null;   // guard: a dangling album idx must not throw the whole aggregation
      const albKey = alb ? R.slug(M.artists[alb[1]]) + "~" + R.slug(alb[0]) : null;
      artTot.set(aid, (artTot.get(aid) || 0) + plays);
      if (albKey) albTot.set(albKey, (albTot.get(albKey) || 0) + plays);
      const key = R.slug(M.artists[row[1]] || "") + "~" + R.slug(row[0]);
      if (passTrack(key)) { artHit.set(aid, (artHit.get(aid) || 0) + plays); if (albKey) albHit.set(albKey, (albHit.get(albKey) || 0) + plays); }
    }
    const art = new Set(), alb = new Set();
    for (const [id, hit] of artHit) if (hit / (artTot.get(id) || hit) >= MATCH_FRAC) art.add(id);
    for (const [key, hit] of albHit) if (hit / (albTot.get(key) || hit) >= MATCH_FRAC) alb.add(key);
    return { active: true, art, alb, trk: passTrack };
  }, [filtActive, passTrack, mediaArtMeta, R]);
  const pass = passAgg;
  // theme chip live-counts (AND semantics): for each theme bit b, how many tracks would REMAIN if
  // that chip were ADDED to the current selection — i.e. tracks carrying every already-selected theme
  // AND theme b, within the current release-era. So the count is (m & cand) === cand with cand =
  // themeMask | (1<<b). Already-selected bits give cand === themeMask (the count of the current
  // result). A zero-count chip hides (unless already selected), so the counts strictly shrink as
  // themes are stacked. Cheap single walk over the (era-filtered) tracks.
  const themeCounts = React.useMemo(() => {
    const F = window.ROTATION_FILTER; if (!F) return null;
    const n = (F.themes || []).length, cnt = new Array(n).fill(0);
    for (const key in F.t) {
      const v = F.t[key], m = v[0]; if (!m) continue;
      if (relLo != null) { const y = v[1]; if (!y || y < relLo || y > relHi) continue; }
      // only tracks already matching the current AND-selection can contribute to any chip's count
      if (themeMask && (m & themeMask) !== themeMask) continue;
      for (let b = 0; b < n; b++) { const cand = themeMask | (1 << b); if ((m & cand) === cand) cnt[b]++; }
    }
    return cnt;
  }, [filtReady, relLo, relHi, themeMask]);

  // decades bar: release-year play volume from filter-index, keyed by decade → { plays, byYear{} }.
  // Sized/tinted by plays (mirrors the Overview weather-card decade strip). Themes+genre unaffect
  // it (it's the era axis); it reflects the whole played library's release spread. Built once.
  // Artist-level gate for the decade bar (Fuad 2026-08-20: make it react to the active filters, as
  // Overview's now does). Deliberately NOT sliceArtists/moodActive: sliceArtists only walks artists
  // that have audio features (~3.9k of 6,000), which is the right population for the sound charts and
  // the wrong one for a release-year histogram, and `pass` already carries the era window — gating on
  // it would make the bar filter itself, collapsing to the single decade you just clicked.
  // So: everything the page filters by EXCEPT its own era, and themes handled per-track below.
  const decGateIds = React.useMemo(() => {
    // Selections made ON a chart — the attributes brush and the mood quadrant — count as filters here
    // just like the chips do (Fuad 2026-08-20). They were the gap: picking bands off the map left the
    // era band unmoved, while the search box, which lands in `picks`, moved it. `sel` covers both the
    // artists grain (keys are artist ids) and the subgenres grain (keys are sub indices).
    const sel = (lens === "attributes" && attrSel && attrSel.keys.size) ? attrSel : null;
    const anyFilter = hasYears || fam != null || subIdx >= 0 || cells.size > 0 || vocals !== "any"
      || picks.size > 0 || !!sel || !!moodZone;
    if (!anyFilter) return null;   // null = count everything, and skip the per-track Set lookup
    const inYears = (yp) => { if (!yp) return false; for (const y of years) if (yp[y]) return true; return false; };
    const out = new Set();
    for (const a of R.EXPLORE) {
      if (picks.size && !picks.has(a.id)) continue;
      if (hasYears && !inYears(a.yp)) continue;
      if (subIdx >= 0) { if (_filtSubs(a).indexOf(subIdx) < 0) continue; } else if (!recInFam(R, a, fam)) continue;
      if (cells.size && !tsPlays(R, a.id, cells)) continue;
      if (vocals !== "any" && !vocalsPass(a.vx, vocals)) continue;
      if (sel) {
        if (sel.mode === "artists") { if (!sel.keys.has(a.id)) continue; }
        else if (!(a.s || []).some(ix => sel.keys.has(ix))) continue;
      }
      if (moodZone) { const af = (R.AUDIO || {})[a.id]; if (!af || !inMoodZone(af, moodZone)) continue; }
      out.add(a.id);
    }
    return out;
  }, [R, years, hasYears, fam, subIdx, cells, vocals, picks, attrSel, lens, moodZone]);

  const decadeData = React.useMemo(() => {
    const F = window.ROTATION_FILTER; if (!F) return null;
    const dec = new Map();   // decadeStart → { plays, byYear: Map(year→plays) }
    const gate = decGateIds;
    const add = (y, plays) => { const d = Math.floor(y / 10) * 10; let e = dec.get(d); if (!e) dec.set(d, e = { plays: 0, byYear: new Map() }); e.plays += plays; e.byYear.set(y, (e.byYear.get(y) || 0) + plays); };
    // plays per track: filter-index has no plays, so fold in media-index track plays by key.
    const M = window.ROTATION_MEDIA;
    if (M) {
      for (const row of M.tracks) {
        if (gate) { const meta = mediaArtMeta && mediaArtMeta[row[1]]; if (!meta || !gate.has(meta.aid)) continue; }
        const v = F.t[R.slug(M.artists[row[1]] || "") + "~" + R.slug(row[0])]; if (!v || !v[1]) continue;
        if (themeMask && (v[0] & themeMask) !== themeMask) continue;   // themes narrow the bar; the era window must not
        add(v[1], row[2]);
      }
    } else {
      // no media-index yet: unweighted track counts, and no artist gate is derivable from keys alone
      for (const key in F.t) { const v = F.t[key]; if (!v[1]) continue; if (themeMask && (v[0] & themeMask) !== themeMask) continue; add(v[1], 1); }
    }
    const decades = [...dec.entries()].map(([d, e]) => ({ decade: d, plays: e.plays, byYear: [...e.byYear.entries()].map(([year, plays]) => ({ year, plays })).sort((a, b) => a.year - b.year) })).sort((a, b) => a.decade - b.decade);
    const tot = decades.reduce((s, d) => s + d.plays, 0);
    return { decades, tot };
  }, [filtReady, mediaReady, R, decGateIds, themeMask, mediaArtMeta]);

  // A decade selected before the filter changed can vanish from the bar entirely. Drop it rather
  // than leave an era chip pinning the page to a window with nothing in it.
  React.useEffect(() => {
    if (relDec == null || !decadeData) return;
    const d = decadeData.decades.find(x => x.decade === relDec);
    if (!d) { setRelDec(null); setRelYear(null); }
    else if (relYear != null && !d.byYear.some(y => y.year === relYear)) setRelYear(null);
  }, [decadeData, relDec, relYear]);

  const mediaItems = React.useMemo(() => {
    if (kind === "artists" || !mediaReady || !mediaArtMeta) return null;
    // fetch a lookahead past what's visible so "load more" has rows ready and `more` is detectable
    return mediaRank(window.ROTATION_MEDIA, R, mediaArtMeta, kind, { years, fam, subIdx, cells, moodZone, vocals, pass, picks, attrSel: (lens === "attributes" && attrSel && attrSel.keys.size) ? attrSel : null }, visN + 40);
  }, [kind, mediaReady, mediaArtMeta, years, fam, subIdx, cells, moodZone, vocals, pass, visN, R, attrSel, lens, picks]);
  // the attributes-lens selection now filters INSIDE the rank functions (full universe,
  // pre-slice) — the old post-filter ran on the top-40 and starved the list (Fuad 2026-07-14)
  const items = (kind !== "artists" && mediaItems) ? mediaItems.items
    // artists get the same visN+40 lookahead as mediaRank, so "load more" keeps expanding
    // past 40 instead of hitting the old hard cap (Fuad 2026-07-26)
    : exploreRank(R, kind, { years, fam, subIdx, cells, sound, dir: sndDir, moodZone, vocals, pass, picks, attrSel: (lens === "attributes" && attrSel && attrSel.keys.size) ? attrSel : null }, visN + 40);
  // more rows to reveal? true whenever the ranked pool has more than we're currently showing —
  // works for artists (full list) AND albums/tracks (media pool), so load-more applies to all three.
  const more = items.length > visN;
  // a new slice resets the load-more expansion (the chosen 16/32/64 base stays)
  React.useEffect(() => { setExtra(0); }, [kind, years, fam, subIdx, cells, moodZone, vocals, attrSel, themeMask, relLo, relHi, picks]);
  // how many artists the ACTIVE vocals filter drops purely for lacking vocals data — same "N without
  // data" honesty as the Liked audio sliders. Counts artists that pass every OTHER filter but have no
  // vx (kind === "artists" only; the note is about artists either way).
  const vocalsNoData = React.useMemo(() => {
    if (vocals === "any") return 0;
    const pass = passAgg && passAgg.active ? passAgg : null;
    let n = 0;
    for (const a of R.EXPLORE) {
      if (a.vx !== undefined) continue;                 // has data — not a no-data drop
      if (hasYears && !(a.yp && [...years].some(y => a.yp[y]))) continue;
      if (pass && !pass.art.has(a.id)) continue;
      if (subIdx >= 0) { if (_filtSubs(a).indexOf(subIdx) < 0) continue; } else if (!recInFam(R, a, fam)) continue;
      if (cells.size && !tsPlays(R, a.id, cells)) continue;
      n++;
    }
    return n;
  }, [R, vocals, years, fam, subIdx, cells, passAgg]);
  // mood-lens slices. The quadrant renders a STABLE universe of points (so dots persist across filter
  // changes and can transition opacity/size) and toggles which are "active" for the current slice;
  // facts/arc reflect the chosen zone too.
  // the full audio universe (every artist with measured features — ~3.9k) for both artist clouds;
  // progressive rendering keeps mounting them cheap. af = [energy, valence, acoustic, tempo, dance, instr].
  const moodUniverse = React.useMemo(() => R.EXPLORE.filter(a => R.AUDIO[a.id])
    .map(a => { const af = R.AUDIO[a.id]; return { id: a.id, name: a.name, hue: a.hue, x: af[1], y: af[0], plays: a.plays }; }), [R]);
  // `picks` (search-box selections) narrows this too — it is the set all three chart lenses read to
  // decide what is in the active slice, so intersecting here covers attributes, texture and mood at
  // once. Without it the search filtered the ranked list and left the charts untouched, which is
  // half a filter (Fuad 2026-08-20). sliceArtists takes the page's own filter object and knows
  // nothing about picks, so the intersection happens outside it rather than by threading a new key
  // through every caller.
  const moodActive = React.useMemo(() => {
    const s = new Set(sliceArtists(R, { years, fam, subIdx, cells, vocals, pass }, false).map(a => a.id));
    if (!picks.size) return s;
    const n = new Set();
    for (const id of picks) if (s.has(id)) n.add(id);
    return n;
  }, [R, years, fam, subIdx, cells, vocals, pass, picks]);
  const moodSet = React.useMemo(() => sliceArtists(R, { years, fam, subIdx, cells, moodZone, vocals, pass }, true), [R, years, fam, subIdx, cells, moodZone, vocals, pass]);
  // ── granularity data (built once from the universe; independent of the active slice) ──
  // subMood: each subgenre bubbled at its members' play-weighted mean valence × energy.
  const subMood = React.useMemo(() => {
    const acc = R.SUBS.map(s => ({ name: s.name, fam: s.fam, hue: s.hue, vs: 0, es: 0, w: 0 }));
    for (const a of R.EXPLORE) { const af = R.AUDIO[a.id]; if (!af) continue; for (const si of (a.s || [])) { const m = acc[si]; if (!m) continue; m.vs += af[1] * a.plays; m.es += af[0] * a.plays; m.w += a.plays; } }
    return acc.map(m => ({ name: m.name, fam: m.fam, hue: m.hue, w: m.w, x: m.w ? m.vs / m.w : .5, y: m.w ? m.es / m.w : .5 })).filter(m => m.w > 0);
  }, [R]);
  // artTexture: every artist with audio, placed straight from its features — x = organic↔electronic
  // (inverse acousticness), y = calm↔violent (energy). No subgenre inheritance (that path was empty
  // because per-sub x/y live on the year-weighted map, not on R.SUBS).
  const artTexture = React.useMemo(() => R.EXPLORE.filter(a => R.AUDIO[a.id])
    .map(a => { const af = R.AUDIO[a.id]; return { id: a.id, name: a.name, hue: a.hue, plays: a.plays, x: Math.max(0, Math.min(1, 1 - af[2])), y: Math.max(0, Math.min(1, af[0])) }; }), [R]);
  const pickSub = (name) => { setFam(null); setSub(s => s === name ? null : name); };
  const pickFam = (f) => { setSub(null); setFam(x => x === f ? null : f); };
  const toggleCell = (c) => setCells(prev => { const n = new Set(prev); n.has(c) ? n.delete(c) : n.add(c); return n; });
  const toggleMany = (list) => setCells(prev => { const n = new Set(prev); const all = list.every(c => n.has(c)); list.forEach(c => all ? n.delete(c) : n.add(c)); return n; });

  const toggleTheme = (b) => setThemeSel(prev => { const n = new Set(prev); n.has(b) ? n.delete(b) : n.add(b); return n; });
  const toggleDec = (d) => { setRelYear(null); setRelDec(x => x === d ? null : d); };
  const clearTheme = () => setThemeSel(new Set());
  const clearRel = () => { setRelYear(null); setRelDec(null); };

  // terse multi-year label for the active-filter chip: up to 3 years show inline ("'13 '15 '19");
  // beyond that, first year + "+N more" ("'13 +2 more") — matches the site's compact chip idiom.
  const yearsLabel = (set) => {
    const ys = [...set].sort((a, b) => a - b), tag = (y) => "'" + String(y).slice(2);
    return ys.length <= 3 ? ys.map(tag).join(" ") : tag(ys[0]) + " +" + (ys.length - 1) + " more";
  };

  const chips = [];
  if (hasYears) chips.push(["time", yearsLabel(years), () => { setPlaying(false); setYears(new Set()); }]);
  if (sub) chips.push(["subgenre", sub, () => setSub(null)]);
  else if (fam != null) chips.push(["genre", (R.FAMILIES.find(f => f.i === fam) || {}).family, () => setFam(null)]);
  if (moodZone) chips.push(["mood", MOOD_LABELS[moodZone], () => setMoodZone(null)]);
  if (cells.size) chips.push(["clock", cells.size + " slot" + (cells.size > 1 ? "s" : ""), () => setCells(new Set())]);
  if (vocals !== "any") chips.push(["vocals", ({ male: "male", female: "female", mixed: "mixed", nb: "non-binary", instrumental: "instrumental" })[vocals] || vocals, () => setVocals("any")]);
  if (themeSel.size) chips.push(["theme", [...themeSel].map(b => themeNames[b]).filter(Boolean).join(" · "), clearTheme]);
  if (relLo != null) chips.push(["era", relYear != null ? relYear : relDec + "s", clearRel]);
  // one chip per picked artist rather than a single "3 artists" chip — you need to be able to drop
  // the wrong one without losing the other two.
  for (const id of picks) chips.push(["artist", (R.byId[id] && R.byId[id].name) || (R.expById && R.expById[id] && R.expById[id].name) || id, () => dropPick(id)]);

  return (
    <div className="r-view xp" ref={ref}>
      <div className="r-viewhead">
        <div>
          <div className="r-kicker">Explore{chips.length ? "" : " · all time"}</div>
          <h1 className="r-title">Dig <em>through</em><span className="dot">.</span></h1>
        </div>
        <div className="xp-head-right">
          <ExploreSearch R={R} yearKeys={yearKeys} subNames={subNames} go={go}
            onArtist={addPick} onSub={setSub} onYear={(y) => { setPlaying(false); setYears(new Set([y])); }} onCells={(arr) => setCells(new Set(arr))} />
        </div>
      </div>

      {/* filter bar: Time on the left, Active filters pinned to the right of the SAME row — so
         activating a filter fills the right side instead of adding a row that shoves the page
         down (Fuad 2026-07-09). Vocals rides the same row hugging the far right (Fuad 2026-08-12),
         dropping below (full-width, still right-aligned) on narrow screens. Collapses to stacked
         on mobile. */}
      <div className="xp-filters r-card">
        <div className="xp-frow xp-frow-main">
          <span className="xp-flabel">Time</span>
          <div className="xp-chiprow xp-chiprow-time">
            <button className="xp-chip xp-play" data-on={playing} onClick={togglePlay} title="Play the decade">{playing ? "❚❚" : "▶"} decade</button>
            <button className="xp-chip" data-on={!hasYears} onClick={() => { setPlaying(false); setYears(new Set()); }}>All</button>
            {yearKeys.map(y => <button key={y} className="xp-chip" data-on={years.has(y)} onClick={() => { setPlaying(false); toggleYear(y); }}>{"'" + String(y).slice(2)}</button>)}
          </div>
          {chips.length > 0 && (
            <div className="xp-active">
              <span className="xp-flabel">Active</span>
              <div className="xp-chiprow">
                {chips.map(([k, v, clr]) => <button key={k} className="xp-chip xp-chip-active" onClick={clr}><span className="xp-ck">{k}</span> {v} <span className="xp-x">✕</span></button>)}
                <button className="xp-chip xp-clearall" onClick={() => { setPlaying(false); setYears(new Set()); setFam(null); setSub(null); setCells(new Set()); setMoodZone(null); setVocals("any"); clearTheme(); clearRel(); setPicks(new Set()); }}>clear all</button>
              </div>
            </div>
          )}
          {/* Vocals dimension: filter by who's singing. Composes with every other filter above.
             Hugs the right of the Time row; wraps below (full-width, right-aligned) when narrow. */}
          <div className="xp-vocals">
            <span className="xp-flabel">Vocals</span>
            <div className="xp-chiprow">
              {[["any", "Any"], ["male", "Male"], ["female", "Female"], ["mixed", "Mixed"], ["nb", "Non-binary"], ["instrumental", "Instrumental"]].map(([k, l]) =>
                <button key={k} className="xp-chip" data-on={vocals === k} onClick={() => setVocals(vocals === k ? "any" : k)}>{l}</button>)}
              {vocals !== "any" && vocalsNoData > 0 &&
                <span className="r-mono xp-note" style={{ margin: 0, alignSelf: "center" }}>{vocalsNoData} without data</span>}
            </div>
          </div>
        </div>
      </div>

      {/* converged surface: sound map (sticky left) + ranked results (right) */}
      <div className="xp-main m-stack">
        <div className="xp-left">
          <div className="r-card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="xp-lens">
              <div className="r-seg xp-lens-seg">
                <button data-on={lens === "texture"} onClick={() => setLens("texture")}>texture</button>
                <button data-on={lens === "mood"} onClick={() => setLens("mood")}>mood</button>
                <button data-on={lens === "attributes"} onClick={() => setLens("attributes")}>attributes</button>
              </div>
              <div className="r-seg xp-lens-seg" title="plot subgenres or individual artists">
                <button data-on={grain === "subs"} onClick={() => setGrain("subs")}>subgenres</button>
                <button data-on={grain === "artists"} onClick={() => setGrain("artists")}>artists</button>
              </div>
              <span className="xp-lens-cap">{lens === "texture" ? "organic ↔ electronic" : lens === "mood" ? "valence × energy" : "pick any two axes"}</span>
            </div>
            <div className="xp-chartwrap">
            {lens === "attributes"
              ? <AttrExplore R={R} go={go} grain={grain} onBrushSel={setAttrSel} activeIds={moodActive} activeSub={sub} activeFam={fam} filtersActive={hasYears || fam != null || sub != null || cells.size > 0 || vocals !== "any" || filtActive || picks.size > 0} xKey={attrX} yKey={attrY} setXKey={setAttrX} setYKey={setAttrY} />
              : lens === "texture"
              ? (grain === "subs"
                ? <ExploreScatter subs={weights} seen={seen} activeSub={sub} activeFam={fam} onPick={pickSub} expressive={t.chart === "expressive"} setPop={setPop} />
                : <ArtistCloud pts={artTexture} activeIds={moodActive} go={go} />)
              : (grain === "artists"
                ? <MoodQuadrant pts={moodUniverse} activeIds={moodActive} go={go} moodZone={moodZone} setMoodZone={setMoodZone} />
                : <SubMoodScatter subs={subMood} activeSub={sub} activeFam={fam} onPick={pickSub} moodZone={moodZone} setMoodZone={setMoodZone} />)}
            </div>
          </div>
        </div>
        <div className="xp-right">
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: "var(--gap)" }}>
            <div className="r-seg">
              {["artists", "albums", "tracks"].map(k => <button key={k} data-on={kind === k} onClick={() => setKind(k)}>{k}</button>)}
            </div>
            <div className="r-seg" title="list ⇄ cover grid">
              <button data-on={disp === "list"} onClick={() => setDisp("list")}>list</button>
              <button data-on={disp === "grid"} onClick={() => setDisp("grid")}>grid</button>
            </div>
            <div className="r-seg">
              {[16, 32, 64].map(n => <button key={n} data-on={extra === 0 && showN === n} onClick={() => { setShowN(n); setExtra(0); }}>{n}</button>)}
            </div>
          </div>
          {cells.size > 0 && kind !== "artists" && <div className="r-mono xp-note">filtered to {kind} by artists active in the selected slots</div>}
          {attrSel && lens === "attributes" && attrSel.keys.size > 0 && (
            <div className="r-mono xp-note">filtered to the brushed region — {attrSel.keys.size} {attrSel.mode === "subgenres" ? "subgenres" : "artists"} · clear the brush (click the chart) to reset</div>
          )}
          {items.length === 0
            ? <div className="r-card xp-empty">Nothing in this slice — loosen a filter.</div>
            : <div className="xp-rank-win"><RankRows items={items.slice(0, visN)} go={go} kind={kind} disp={disp} /></div>}
          {more && <button className="xp-loadmore" onClick={() => setExtra(e => e + 24)}>load more {kind} ↓</button>}
          {kind !== "artists" && mediaItems && <div className="r-mono xp-note" style={{ marginTop: 8, textAlign: "center" }}>full library · {fmt(Math.min(visN, items.length))} shown</div>}
        </div>
      </div>

      {/* Filter module (Fuad's layout spec): the Sort buttons and the Era bar share one top row
          (Sort left, Era pinned right), and the Themes chips span the full module width beneath —
          so the themes can spread across the whole page instead of a narrow left column. */}
      <div className="r-card xp-td">
        <div className="xp-td-top">
          {kind === "artists" && (
            <div className="xp-frow xp-td-sort" style={{ marginBottom: 0 }}>
              <span className="xp-flabel">Sort</span>
              <div className="xp-chiprow">
                {[["", "plays"], ["energy", "energy"], ["valence", "mood"], ["dance", "dance"], ["acoustic", "acoustic"], ["tempo", "tempo"], ["loud", "loud"], ["instr", "instrumental"], ["pop", "popularity"], ["mine", "most mine"], ["disc", "discovered"], ["span", "span"], ["vintage", "vintage"]].map(([k, l]) =>
                  <button key={k || "p"} className="xp-chip" data-on={(sound || "") === k} onClick={() => setSound(k || null)}>{l}</button>)}
                {sound && (() => { const [hi, lo] = SND_FLIP[sound] || ["high→low", "low→high"]; return (
                  <button className="xp-chip" onClick={() => setSndDir(d => -d)} title="flip direction">{sndDir === 1 ? "▼ " + hi : "▲ " + lo}</button>); })()}
              </div>
            </div>
          )}
          <div className="xp-frow xp-td-decs" style={{ marginBottom: 0 }}>
            <span className="xp-flabel">Era</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              {!decadeData ? <span className="r-mono xp-note" style={{ margin: 0 }}>loading…</span> : (() => {
                const showYears = relDec != null;
                const decSel = relDec != null ? decadeData.decades.find(d => d.decade === relDec) : null;
                const rows = showYears && decSel ? decSel.byYear : decadeData.decades;
                const tot = showYears && decSel ? decSel.byYear.reduce((s, r) => s + r.plays, 0) : decadeData.tot;
                return (
                  <div>
                    <div className="xp-decbar">
                      {rows.map((d, i) => {
                        const isYear = showYears;
                        const key = isYear ? d.year : d.decade;
                        const w = tot ? (d.plays / tot) * 100 : 0;
                        const pct = tot ? Math.round(d.plays / tot * 100) : 0;
                        const hue = isYear ? (60 + (d.year - relDec) * 20) : (60 + i * 28);
                        const on = isYear ? relYear === d.year : relDec === d.decade;
                        const lo = isYear ? "0.40" : "0.34", li = isYear ? (i % 5) * 0.05 : i * 0.055;
                        return (
                          <div key={key} className="xp-decseg" data-on={on}
                            title={(isYear ? d.year : d.decade + "s") + " · " + d.plays.toLocaleString("en-US") + " plays · " + pct + "%" + (isYear ? " — click to filter" : " — click to drill in")}
                            onClick={() => isYear ? setRelYear(y => y === d.year ? null : d.year) : toggleDec(d.decade)}
                            style={{ width: w + "%", minWidth: 3,
                              background: `oklch(${(+lo) + li} ${isYear ? 0.13 : 0.14} ${hue % 360} / 0.34)`,
                              boxShadow: `inset 0 0 0 1px oklch(${(+lo) + li + 0.26} ${isYear ? 0.16 : 0.17} ${hue % 360} / 0.7)` }}>
                            {w > (isYear ? 8 : 9) && <span className="xp-decseg-l">{isYear ? "'" + String(d.year).slice(2) : String(d.decade).slice(2) + "s"}</span>}
                          </div>
                        );
                      })}
                    </div>
                    {showYears && <button className="xp-decback" onClick={() => { setRelYear(null); setRelDec(null); }}>← all decades</button>}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
        {kind === "artists" && sound && <div className="r-mono xp-note" style={{ marginTop: 8, marginBottom: 0 }}>{SND_HINT[sound] || "share of that trait, 0–100%"} · artists with ≥15 plays</div>}
        <div className="xp-frow xp-td-themes" style={{ marginBottom: 0, marginTop: 12 }}>
          <span className="xp-flabel">Themes</span>
          <div className="xp-chiprow">
            {!filtReady
              ? <span className="r-mono xp-note" style={{ margin: 0 }}>loading…</span>
              : themeNames.map((name, b) => {
                  const on = themeSel.has(b);
                  const c = themeCounts ? themeCounts[b] : 0;
                  if (!on && !c) return null;               // hide zero-count chips in the current context
                  return <button key={b} className="xp-chip" data-on={on} onClick={() => toggleTheme(b)}
                    title={c.toLocaleString("en-US") + " tracks"}>{name}</button>;
                })}
          </div>
        </div>
        {themeSel.size > 0 && <div className="r-mono xp-note" style={{ marginTop: 6, marginBottom: 0 }}>matching {themeSel.size > 1 ? "ALL selected themes" : "the selected theme"} · artists/albums shown when ≥20% of their plays fit</div>}
      </div>

      {/* "Mood over the years" arc removed from Explore (Fuad 2026-07-07) — candidate to move into
          Stories as a lifetime section. MoodContext (above) + moodSet are kept for that follow-up. */}

      {/* genres grouped under families — 6 columns per row, each card scrollable (Fuad) */}
      <FamiliesGrid order={order} weights={weights} fam={fam} sub={sub} pickFam={pickFam} pickSub={pickSub} year={curYear} seen={seen} expressive={t.chart === "expressive"} />

      {/* Rhythm (the 7×24 clock) moved to the Calendar page (2026-07-05) — time-of-day lives with time. */}
      {/* per-year stat card only makes sense for a single selected year (multiselect has no single "year") */}
      {curYear != null && <YearDetail R={R} go={go} year={curYear} />}

      <style>{`
        .xp-head-right { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; justify-content: flex-end; }
        .xp-search { position: relative; display: inline-flex; align-items: center; gap: 7px; padding: 7px 12px; border: 1px solid var(--rule); border-radius: 999px; color: var(--ink-dim); min-width: 240px; transition: border-color .15s; }
        .xp-search:focus-within { border-color: var(--ink-faint); }
        .xp-search svg { flex: none; color: var(--ink-faint); }
        .xp-search input { flex: 1; min-width: 0; background: transparent; border: 0; outline: 0; color: var(--ink); font-family: var(--sans); font-size: 12.5px; }
        .xp-search input::placeholder { color: var(--ink-faint); }
        .xp-search-pop { position: absolute; top: calc(100% + 6px); left: 0; right: 0; z-index: 60; max-height: 360px; overflow-y: auto; background: var(--bg-2); border: 1px solid var(--rule-2); border-radius: 10px; padding: 6px; box-shadow: 0 18px 44px -12px rgba(0,0,0,.7); }
        .xp-search-gl { font-family: var(--mono); font-size: 8.5px; letter-spacing: .14em; text-transform: uppercase; color: var(--ink-faint); padding: 6px 8px 4px; }
        .xp-search-item { display: flex; align-items: center; gap: 8px; width: 100%; text-align: left; padding: 7px 8px; border: 0; background: transparent; border-radius: 6px; cursor: pointer; color: var(--ink); font-family: var(--sans); font-size: 12.5px; }
        .xp-search-item:hover, .xp-search-item:focus { background: var(--bg-3); outline: 0; }
        .xp-search-lbl { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .xp-search-sub { margin-left: auto; padding-left: 10px; color: var(--ink-faint); font-size: 11px; white-space: nowrap; }
        .xp-search-empty { padding: 14px 10px; color: var(--ink-faint); font-family: var(--mono); font-size: 11px; }
        .xp-filters { padding: 14px 16px; margin-bottom: var(--gap); display: grid; gap: 10px; }
        .xp-frow { display: grid; grid-template-columns: 56px 1fr; gap: 10px; align-items: start; }
        /* Time + Active share one flex row; Active pins right and the bar stays a fixed height,
           so filtering never reflows the page below it. */
        .xp-frow-main { display: flex; align-items: center; gap: 12px; }
        .xp-chiprow-time { flex: 1 1 auto; min-width: 0; flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; }
        .xp-chiprow-time::-webkit-scrollbar { display: none; }
        /* The "Time" label sat 7px low against its own chip row (Fuad 2026-08-20). .xp-flabel
           carries padding-top:7px for the GRID form of .xp-frow, where the label sits above the
           chips; inside the centred flex row that padding is pure offset. Active and Vocals had
           each already zeroed it locally — Time was the one that never got the same treatment. */
        .xp-frow-main > .xp-flabel { padding-top: 0; }
        .xp-active { display: flex; align-items: center; gap: 8px; margin-left: auto; flex: 0 0 auto; }
        .xp-active .xp-flabel { padding-top: 0; }
        /* Vocals rides the far right of the Time row (Fuad 2026-08-12). margin-left:auto pins it
           right when Active is absent; the growing time chiprow keeps it right when Active shows. */
        .xp-vocals { display: flex; align-items: center; gap: 8px; margin-left: auto; flex: 0 0 auto; }
        .xp-vocals .xp-flabel { padding-top: 0; }
        /* FIRST concession as the band tightens (Fuad 2026-08-16): before the Era bar ever
           gives up its labels, the Vocals group (natural ≈ 474px) drops to its OWN full-width
           line below Time — freeing the top row and giving the band a calm two-line rhythm on
           16" laptops instead of Vocals sitting inline while year segments fold below it.
           Time chips scroll (overflow-x:auto) so they never force the break; this is a
           deliberate, edge-aligned wrap, not a reflow. */
        @media (max-width: 1600px) {
          .xp-frow-main { flex-wrap: wrap; }
          /* once Vocals collapses to its own full-width line, align it LEFT (Fuad 2026-08-17) —
             a stacked group reads as a fresh left-edge row, not a right-pinned tail. */
          .xp-vocals { margin-left: 0; width: 100%; order: 2; justify-content: flex-start; }
        }
        .xp-flabel { font-family: var(--mono); font-size: 9.5px; letter-spacing: .14em; text-transform: uppercase; color: var(--ink-faint); padding-top: 7px; }
        .xp-chiprow { display: flex; flex-wrap: wrap; gap: 6px; }
        .xp-chip { font-family: var(--mono); font-size: 10.5px; letter-spacing: .04em; padding: 5px 10px; border-radius: 999px; border: 1px solid var(--rule); background: transparent; color: var(--ink-soft); cursor: pointer; transition: .14s; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
        .xp-chip:hover { border-color: var(--ink-faint); color: var(--ink); }
        .xp-chip[data-on="true"] { background: var(--accent); border-color: var(--accent); color: #0c0a08; }
        .xp-play { border-color: var(--accent); color: var(--accent); letter-spacing: .08em; }
        .xp-play[data-on="true"] { background: var(--accent); color: #0c0a08; }
        .xp-chip-active { border-color: var(--accent); color: var(--ink); }
        .xp-chip-active .xp-ck { color: var(--ink-faint); text-transform: uppercase; letter-spacing: .1em; font-size: 8.5px; }
        .xp-clearall { color: var(--ink-faint); border-style: dashed; }
        /* filter module (Fuad's layout spec): Sort + Era share a top row (Era pinned right),
           Themes chips span the full module width beneath. */
        .xp-td { padding: 12px 14px; margin-top: var(--gap); }
        .xp-td-top { display: flex; align-items: flex-start; gap: 22px; flex-wrap: wrap; }
        .xp-td-sort { flex: 0 0 auto; }
        .xp-td-decs { flex: 1 1 300px; min-width: 260px; margin-left: auto; }
        /* Control-band degradation order (Fuad 2026-08-16, ProArt P16 ~1512px CSS vw).
           MATH: Sort chips natural ≈ 1084px, Era needs ≈ 300px+ to keep its year labels
           (segments fold at ≤8% of bar width). On the .xp-td card inner (≈ vw − 96px):
           1536→Era gets ~334px (ok) · 1440→~238px · 1366→~164px (labels fold). So the
           Era bar loses its labels well before mobile purely because Sort is hogging the row.
           FIX: at ≤1500px, Sort wraps onto its OWN full line so Era ALWAYS spans the whole
           card (≥ ~1180px even at a 1280 vw) → an 8% segment ≈ 94px, plenty for a "'23"
           label. After this the only remaining fold is data-driven (a year with <8% of the
           plays), which is intentional — not a width artifact. */
        @media (max-width: 1500px) {
          .xp-td-top { gap: 12px 22px; }
          .xp-td-sort { flex: 1 1 100%; }
          .xp-td-decs { flex: 1 1 100%; min-width: 0; margin-left: 0; }
        }
        .xp-td-themes .xp-chiprow { max-height: 132px; overflow-y: auto; }
        .xp-decbar { display: flex; height: 46px; border-radius: 4px; overflow: hidden; gap: 1px; }
        .xp-decseg { min-width: 3px; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; transition: filter .14s, outline-color .14s; outline: 1.5px solid transparent; outline-offset: -1.5px; }
        .xp-decseg:hover { filter: brightness(1.18); }
        .xp-decseg[data-on="true"] { outline-color: var(--accent); }
        .xp-decseg-l { font-family: var(--mono); font-size: 10px; font-weight: 600; color: rgba(255,255,255,.92); white-space: nowrap; }
        .xp-decback { font-family: var(--mono); font-size: 8.5px; letter-spacing: .1em; text-transform: uppercase; background: none; border: 1px solid var(--rule); border-radius: 999px; padding: 3px 9px; color: var(--ink-soft); cursor: pointer; margin-top: 8px; }
        .xp-decback:hover { color: var(--accent); border-color: var(--accent-dim); }
        @media (max-width: 760px) { .xp-td-top { gap: 12px; } .xp-td-decs { flex-basis: 100%; margin-left: 0; } }
        .xp-dot { width: 9px; height: 9px; border-radius: 3px; flex: none; }
        .xp-empty { padding: 56px 20px; text-align: center; color: var(--ink-faint); font-family: var(--mono); font-size: 12px; }
        .xp-note { font-size: 10px; color: var(--ink-faint); margin-bottom: 10px; }
        .xp-loadmore { display: block; width: 100%; margin-top: 10px; padding: 9px; font-family: var(--mono); font-size: 10px;
          letter-spacing: .1em; text-transform: uppercase; color: var(--ink-soft); background: transparent;
          border: 1px dashed var(--rule-2); border-radius: 8px; cursor: pointer; transition: .15s; }
        .xp-loadmore:hover { color: var(--ink); border-color: var(--ink-faint); }
        .xp-lens { display: flex; align-items: center; justify-content: space-between; gap: 10px 12px; padding: 11px 14px 0; flex-wrap: wrap; }
        .xp-lens-seg button { font-size: 9px; padding: 4px 10px; }
        .xp-lens-cap { font-family: var(--mono); font-size: 9px; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-faint); }
        .xp-zoomreset { position: absolute; top: 8px; right: 10px; z-index: 3; font-family: var(--mono); font-size: 9px;
          letter-spacing: .08em; text-transform: uppercase; color: var(--ink-soft); background: var(--bg-2, rgba(20,16,12,.7));
          border: 1px solid var(--rule); border-radius: 999px; padding: 5px 9px; cursor: pointer; }
        .xp-zoomreset:hover { color: var(--ink); border-color: var(--ink-faint); }
        /* +/−/⌂ zoom cluster, top-right of a scatter — the touch/no-wheel path (Fuad 2026-07-18) */
        .xp-zoomctl { position: absolute; top: 8px; right: 10px; z-index: 4; display: flex; flex-direction: column; gap: 5px; }
        .xp-zoomctl button { width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;
          font-family: var(--sans); font-size: 16px; line-height: 1; color: var(--ink-soft);
          background: var(--bg-2, rgba(20,16,12,.78)); border: 1px solid var(--rule); border-radius: 8px; cursor: pointer;
          transition: color .15s, border-color .15s; }
        .xp-zoomctl button:hover { color: var(--ink); border-color: var(--ink-faint); }
        .xp-zoomctl button[data-dim="true"] { opacity: .45; }
        /* stretch both columns to the taller one and let the chart card fill + center its SVG, so the
           sound map ≈ the artists module height beside it (mirrors Overview's map card — Fuad 2026-07-07) */
        .xp-main { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); gap: var(--gap); align-items: stretch; }
        .xp-left { position: sticky; top: 76px; display: grid; gap: var(--gap); }
        .xp-left > .r-card { height: 100%; display: flex; flex-direction: column; }
        /* fill the card width (children stretch) and centre vertically, so BOTH charts — the bare
           <svg> texture scatter and the <div>-wrapped mood quadrant — scale with the container/screen
           instead of collapsing (Fuad 2026-07-07: mood had gone tiny under align-items:center) */
        .xp-chartwrap { flex: 1; display: flex; flex-direction: column; justify-content: center; min-height: 0; }
        .xp-chartwrap > svg, .xp-chartwrap > div { width: 100%; }
        .xp-chartwrap svg { width: 100%; height: auto; max-height: 68vh; }
        /* ranked results — cover/artist grid mode (list ⇄ grid toggle) */
        /* grid: 8 tiles per row (smaller covers), stepping down on narrower widths (Fuad 2026-07-07) */
        .xp-cardgrid { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 9px; }
        @media (max-width: 1200px) { .xp-cardgrid { grid-template-columns: repeat(6, minmax(0, 1fr)); } }
        @media (max-width: 900px) { .xp-cardgrid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
        @media (max-width: 520px) { .xp-cardgrid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        .xp-carditem { cursor: pointer; min-width: 0; }
        .xp-carditem[data-link="false"] { cursor: default; opacity: .6; }
        .xp-cardrk { position: absolute; top: 3px; left: 4px; font-family: var(--mono); font-size: 8px; color: rgba(255,255,255,.85); text-shadow: 0 1px 2px #000; }
        .xp-cardnm { font-size: 10px; margin-top: 5px; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .xp-cardsub { font-family: var(--mono); font-size: 8px; color: var(--ink-faint); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .xp-mood svg { max-height: 330px; margin: 0 auto; }
        .xp-rows { display: grid; gap: 2px; overflow-x: clip; }
        .xp-row { display: grid; grid-template-columns: 24px 34px 1fr 90px 46px; gap: 10px; align-items: center; padding: 5px 6px; border-radius: 6px; transition: background .12s; min-width: 0; }
        .xp-row[data-link="true"] { cursor: pointer; }
        .xp-row[data-link="true"]:hover { background: var(--bg-3); }
        .xp-rank { font-family: var(--mono); font-size: 10px; color: var(--ink-faint); }
        .xp-row-main { min-width: 0; }
        .xp-row-name { font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .xp-row-sub { font-family: var(--mono); font-size: 9px; color: var(--ink-faint); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .xp-bar { height: 7px; background: var(--bg-3); border-radius: 4px; overflow: hidden; }
        .xp-bar > div { height: 100%; border-radius: 4px; transition: width .5s cubic-bezier(.3,.8,.3,1); }
        /* tv-grid/tv-head/r-track-row rules moved to cssRotation (rotation-core) — they style the
           Album/Track pages, which can be deep-linked WITHOUT Explore ever mounting. */
        /* PC: chart card and results column share ONE FIXED height — the chart never resizes or
           jumps when a click changes the list, and overflow scrolls INSIDE each column.
           Round 2 (Fuad 2026-07-14): the v1 clamp + r-card overflow:hidden clipped the hover
           status line and let the tall svg overlay the lens buttons (hover stopped firing).
           Now: lens row is a fixed opaque layer; everything below it scrolls DOWNWARD inside
           the card (chart + status + brush results), so nothing is ever cut or covered. */
        /* Round 5 (Fuad 2026-07-14): fixed column heights caused 4K dead space under small
           charts AND let the chart itself scroll out of view when brush results grew. New model:
           the card is CONTENT-SIZED (no dead space), the CHART NEVER SCROLLS (it and its status
           line are always fully visible), and only the info regions below it scroll internally.
           Columns are independent (align start); the results column keeps its own scroll window. */
        @media (min-width: 980px) {
          .xp-main { align-items: start; }
          .xp-lens { position: relative; z-index: 3; background: var(--bg-1, var(--bg-2)); flex: 0 0 auto; }
          .xp-chartwrap { flex: 0 0 auto; justify-content: flex-start; overflow: visible; }
          .xp-chartwrap svg { max-height: min(62vh, 760px); }
          .xp-attr-info { max-height: 34vh; overflow-y: auto; padding-right: 4px;
            scrollbar-width: thin; scrollbar-color: var(--rule-2) transparent; }
          .xp-right { display: flex; flex-direction: column; min-height: 0; }
          .xp-rank-win { max-height: min(78vh, 900px); overflow-y: auto; padding-right: 4px;
            scrollbar-width: thin; scrollbar-color: var(--rule-2) transparent; }
        }
        .xp-val { font-family: var(--mono); font-size: 10.5px; color: var(--ink-soft); text-align: right; white-space: nowrap; }
        /* xp-sub-row was never defined → block layout, so a long nowrap subgenre name set the
           column's min-content width ("second wave of…" widened Nu-metal). Flex + min-width:0
           lets the name actually truncate; minmax(0,1fr) columns stop content-driven widening. */
        .xp-sub-row { display: flex; align-items: center; min-width: 0; cursor: pointer; border-radius: 4px; padding: 1px 2px; }
        .xp-sub-row:hover { background: var(--bg-3); }
        .xp-sub-row[data-on="true"] { background: var(--accent-bg); }
        .xp-famgrid { grid-template-columns: repeat(6, minmax(0, 1fr)) !important; }
        @media (max-width: 1500px) { .xp-famgrid { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; } }
        @media (max-width: 1100px) { .xp-famgrid { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; } }
        @media (max-width: 760px) { .xp-famgrid { grid-template-columns: minmax(0, 1fr) !important; } }
        .xp-fam-head { display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 2px; border-radius: 5px; transition: .12s; }
        .xp-fam-resize { display: flex; align-items: center; gap: 10px; justify-content: center; margin-top: 8px; padding: 6px; cursor: ns-resize; user-select: none; color: var(--ink-faint); }
        .xp-fam-resize:hover { color: var(--ink-soft); }
        .xp-fam-resize span:first-child, .xp-fam-resize span:last-child { flex: 1; height: 1px; background: var(--rule); }
        .xp-fam-resize .r-mono { font-size: 8.5px; letter-spacing: .14em; text-transform: uppercase; }
        .xp-fam-head:hover { opacity: .85; }
        .xp-fam-head[data-on="true"] span:nth-child(2) { color: var(--accent); }
        .xp-railrow { display: flex; align-items: center; gap: 8px; padding: 4px 6px; border-radius: 5px; cursor: pointer; transition: .12s; }
        .xp-railrow:hover { background: var(--bg-3); }
        .xp-railrow[data-on="true"] { background: var(--accent-bg); box-shadow: inset 0 0 0 1px var(--accent); }
        .clk-scroll > div { min-width: 0; }
        .xp-yeardetail { padding: 18px 22px; margin-top: var(--gap); }
        .xp-yd-head { display: flex; align-items: baseline; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
        .xp-yd-year { font-size: 40px; line-height: .9; }
        .xp-yd-title { font-family: var(--serif); font-style: italic; font-size: 19px; line-height: 1.1; }
        .xp-yd-sub { color: var(--ink-soft); font-size: 12.5px; margin-top: 3px; }
        .era-d-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 16px 22px; }
        .era-d-stat { min-width: 0; } .era-d-stat[data-link="true"] { cursor: pointer; }
        .era-d-stat[data-link="true"]:hover .era-d-v { color: var(--accent); }
        .era-d-k { font-size: 9.5px; color: var(--ink-faint); letter-spacing: .12em; text-transform: uppercase; margin-bottom: 4px; }
        .era-d-v { font-family: var(--serif); font-style: italic; font-size: 17px; line-height: 1.15; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .era-d-sub { font-size: 11.5px; color: var(--ink-soft); margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        @media (max-width: 860px) { .xp-left { position: static; } }
        @media (max-width: 760px) {
          .xp-frow { grid-template-columns: 1fr; gap: 6px; }
          /* stack Active under Time on narrow screens */
          .xp-frow-main { flex-wrap: wrap; }
          .xp-active { margin-left: 0; width: 100%; gap: 6px; }
          /* vocals drops below the time row, full-width and left-aligned (Fuad 2026-08-17) —
             same collapsed-state left alignment as the ≤1600px break */
          .xp-vocals { margin-left: 0; width: 100%; gap: 6px; justify-content: flex-start; }
          .xp-vocals .xp-chiprow { flex: 0 1 auto; }
          .xp-flabel { padding-top: 0; }
          .xp-chiprow { overflow-x: auto; flex-wrap: nowrap; padding-bottom: 4px; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
          .xp-chiprow::-webkit-scrollbar { display: none; }
          /* the year row wraps to fit the phone instead of scrolling off-screen (it was clipped
             by .r-app's overflow-x:clip, so buttons past the edge were unreachable) — Fuad 2026-07-18 */
          .xp-chiprow-time { flex-wrap: wrap; overflow-x: visible; }
          .xp-head-right { width: 100%; }
          .xp-search { min-width: 0; width: 100%; }
          .clk-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; padding-bottom: 4px; }
          .clk-scroll::-webkit-scrollbar { display: none; }
          .clk-scroll > div { min-width: 430px; }
          .era-d-grid { grid-template-columns: 1fr 1fr; }
          /* ranked list rows: tighten bar+val columns at phone widths so the name column
             has enough room to read — 64px bar, 34px val, 8px gap (Fuad 2026-07-25) */
          .xp-row { grid-template-columns: 20px 30px 1fr 64px 34px; gap: 8px; }
          /* year detail: use standard card padding instead of the desktop 22px gutter (Fuad 2026-07-25) */
          .xp-yeardetail { padding: 14px 16px; }
          /* lens control row: tighter button padding so both segments stay on one line (Fuad 2026-07-25) */
          .xp-lens { padding: 9px 12px 0; gap: 8px 10px; }
          .xp-lens-seg button { padding: 3px 8px; }
        }
      `}</style>
    </div>
  );
}

// scatter where bubbles ARE subgenres; click selects/filters; radius morphs with the year
function ExploreScatter({ subs, seen, activeSub, activeFam, onPick, expressive, setPop }) {
  const W = 1000, H = 560, pad = 46;
  const [hi, setHi] = React.useState(null);   // hovered subgenre — bottom status line (popover phased out, Fuad 2026-07-14)
  const maxW = Math.max(1, ...subs.map(s => s.w));
  const px = (x) => pad + x * (W - pad * 2);
  const py = (y) => H - pad - y * (H - pad * 2);
  const z = useZoom(W, H);
  // cursor fisheye (same as the MOOD/subgenres scatter): radius rides --zk (inverse zoom → constant
  // screen size, no ballooning) × --fk (fisheye growth near the cursor). Both are CSS vars so zoom
  // and fisheye rescale marks natively without React re-reconciling ~200 bubbles (Fuad 2026-07-15).
  const fish = useFisheye(z.bind.ref, z.vbRef, ".xp-fdot", z.draggingRef);
  const bubbles = React.useMemo(() => subs.map((s, i) => {
        const present = s.w > 0;
        const baseR = present ? 9 + (s.w / maxW) * 42 : 0;
        const on = activeSub ? activeSub === s.name : (activeFam != null && s.fam === activeFam);
        const dim = activeSub ? activeSub !== s.name : (activeFam != null && s.fam !== activeFam);
        const foc = hi && hi.name === s.name;                        // the bubble under the cursor
        const col = expressive ? `oklch(0.62 0.17 ${s.hue})` : "var(--accent)";
        const baseFs = Math.min(13, baseR / 3.2);
        return (
          <g key={s.name} style={{ cursor: present ? "pointer" : "default", opacity: seen ? (present ? (dim ? 0.14 : 1) : 0) : 0,
            transition: `opacity .45s cubic-bezier(.3,.8,.3,1) ${i * 0.008}s`, pointerEvents: present ? "auto" : "none" }}
            onMouseEnter={() => setHi(s)}
            onClick={() => onPick(s.name)} onMouseLeave={() => setHi(null)}>
            {/* transparent min-size hit target so even tiny subgenres are clickable/hoverable */}
            <circle className="xp-fdot" data-cx={px(s.x).toFixed(1)} data-cy={py(s.y).toFixed(1)} cx={px(s.x)} cy={py(s.y)} fill="transparent" style={{ r: `calc(${Math.max(baseR, 14).toFixed(2)}px * var(--zk) * var(--fk, 1))` }} />
            {/* hover: a distinct scale-up + fill-opacity bump (still translucent), both transitioned —
                done via CSS transform/opacity so they never fight the fisheye's per-frame --fk writes */}
            <circle className="xp-fdot" data-cx={px(s.x).toFixed(1)} data-cy={py(s.y).toFixed(1)} cx={px(s.x)} cy={py(s.y)} fill={col}
              fillOpacity={foc ? .46 : on ? .5 : (expressive ? .28 : .14)} stroke={col} strokeWidth={on || foc ? 2.4 : 1.4} vectorEffect="non-scaling-stroke"
              style={{ r: `calc(${baseR.toFixed(2)}px * var(--zk) * var(--fk, 1))`, transformBox: "fill-box", transformOrigin: "center", transform: foc ? "scale(1.18)" : "scale(1)", transition: "transform .2s cubic-bezier(.3,.8,.3,1), fill-opacity .2s, stroke-width .2s" }} />
            {baseR > 17 && <text x={px(s.x)} y={py(s.y)} textAnchor="middle" dominantBaseline="middle" fill="var(--ink)" fontFamily="var(--sans)" fontWeight="500" style={{ pointerEvents: "none", fontSize: `calc(${baseFs.toFixed(2)}px * var(--zk))` }}>{s.name.length > 13 ? s.name.split(" ")[0] : s.name}</text>}
          </g>
        );
      }), [subs, maxW, activeSub, activeFam, expressive, seen, onPick, hi]);
  return (
    <div style={{ position: "relative" }}>
      <ZoomControls z={z} />
    <svg {...z.bind} style={{ width: "100%", height: "auto", display: "block", cursor: "grab", touchAction: "pan-y", "--zk": z.k }}
      onMouseMove={(e) => { z.bind.onMouseMove(e); fish.run(e.clientX, e.clientY); }}
      onMouseLeave={() => { setHi(null); z.bind.onMouseUp(); fish.reset(); }}>
      {[.25, .5, .75].map(g => (<g key={g}>
        <line x1={px(g)} y1={pad} x2={px(g)} y2={H - pad} stroke="var(--rule)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <line x1={pad} y1={py(g)} x2={W - pad} y2={py(g)} stroke="var(--rule)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </g>))}
      <rect x={pad} y={pad} width={W - pad * 2} height={H - pad * 2} fill="none" stroke="var(--rule-2)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <text x={pad} y={H - 16} fill="var(--ink-faint)" fontSize="11" fontFamily="var(--mono)" style={{ letterSpacing: ".1em" }}>ORGANIC</text>
      <text x={W - pad} y={H - 16} fill="var(--ink-faint)" fontSize="11" fontFamily="var(--mono)" textAnchor="end" style={{ letterSpacing: ".1em" }}>ELECTRONIC</text>
      <text x={20} y={H - pad} fill="var(--ink-faint)" fontSize="11" fontFamily="var(--mono)" transform={`rotate(-90 20 ${H - pad})`} style={{ letterSpacing: ".1em" }}>CALM</text>
      <text x={20} y={pad + 56} fill="var(--ink-faint)" fontSize="11" fontFamily="var(--mono)" transform={`rotate(-90 20 ${pad + 56})`} textAnchor="end" style={{ letterSpacing: ".1em" }}>VIOLENT</text>
      {bubbles}
    </svg>
    <div className="r-mono" style={{ textAlign: "center", marginTop: 6, fontSize: 10, color: hi ? "var(--ink-soft)" : "var(--ink-faint)", letterSpacing: ".08em", minHeight: 14 }}>
      {hi ? `${hi.name} — ${fmt(hi.w)} plays · click to filter` : `${subs.filter(x => x.w > 0).length} subgenres · hover to identify · click to filter`}
    </div>
    </div>
  );
}

// genres grouped under families — the breakdown you liked, restored. Family header filters by
// family; each subgenre row filters by subgenre. Order is stable (all-time); only the bars move
// when you scrub years, so play-the-decade animates instead of reflowing.
function FamiliesGrid({ order, weights, fam, sub, pickFam, pickSub, year, seen, expressive }) {
  const [famH, setFamH] = React.useState(148);
  const startResize = (e) => { if (e.button !== 0) return; const y0 = e.clientY, h0 = famH;
    const mv = (ev) => setFamH(Math.max(100, Math.min(1000, h0 + (ev.clientY - y0))));
    const up = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
    window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up); e.preventDefault(); };
  return (
    <div style={{ marginTop: "var(--gap)" }}>
      <div className="r-mono" style={{ fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--ink-faint)", margin: "4px 0 10px" }}>
        Genres — tap a family or subgenre to filter {year ? "· " + year : ""}
      </div>
      <div className="xp-famgrid" style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "var(--gap)" }}>
        {order.map((g, gi) => {
          const fw = g.subs.reduce((s, su) => s + (weights[su.idx].w || 0), 0);
          const fmax = Math.max(1, ...g.subs.map(su => weights[su.idx].w || 0));
          const onFam = fam === g.fam;
          return (
            <div key={g.fam} className="r-card" style={{ padding: 16, boxShadow: onFam ? "inset 0 0 0 1px var(--accent)" : "none", transition: ".15s" }}>
              <div className="xp-fam-head" data-on={onFam} onClick={() => pickFam(g.fam)}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: `oklch(0.62 0.16 ${g.hue})`, flex: "none" }} />
                <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 18, flex: 1, minWidth: 0 }}>{g.family}</span>
                <span className="r-mono" style={{ fontSize: 10, color: "var(--ink-faint)" }}>{fmtK(fw)}</span>
              </div>
              <div style={{ display: "grid", gap: 6, marginTop: 12, maxHeight: famH, overflowY: "auto", paddingRight: 4 }}>
                {g.subs.map((su, si) => {
                  const w = weights[su.idx].w || 0;
                  return (
                    <div key={su.name} className="xp-sub-row" data-on={sub === su.name} onClick={() => pickSub(su.name)} style={{ opacity: w === 0 ? 0.4 : 1 }} title={su.name}>
                      <span style={{ fontSize: 11.5, color: "var(--ink-soft)", flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{su.name}</span>
                      <div style={{ width: 80, height: 5, background: "var(--bg-3)", borderRadius: 3, overflow: "hidden", margin: "0 8px" }}>
                        <div style={{ height: "100%", width: (seen ? w / fmax * 100 : 0) + "%", background: expressive ? `oklch(0.6 0.16 ${g.hue})` : "var(--accent)", borderRadius: 3, transition: `width .7s cubic-bezier(.3,.8,.3,1) ${(gi * 0.02 + si * 0.03)}s` }} />
                      </div>
                      <span className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", width: 34, textAlign: "right" }}>{fmtK(w)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="xp-fam-resize" onMouseDown={startResize} title="drag to expand every column">
        <span /><span className="r-mono">drag to expand ⇕</span><span />
      </div>
    </div>
  );
}

// compact ranked rows for the right column. Albums open their own page; artists/tracks navigate to
// the artist (kept artists/long-tail with a page only).
function RankRows({ items, go, kind, disp }) {
  const R = window.ROTATION;
  const max = Math.max(1, ...items.map(i => i.value));
  const isAlbum = kind === "albums", isTrack = kind === "tracks";
  const onClick = (it) => {
    if (isAlbum) { go("album", R.slug(it.sub) + "~" + R.slug(it.label)); return; }
    if (isTrack) { go("track", R.slug(it.sub) + "~" + R.slug(it.label)); return; }
    if (it.kept !== false) go("artist", it.aid || it.id);
  };
  if (disp === "grid") return (
    <div className="xp-cardgrid">
      {items.map((it, i) => {
        const link = isAlbum || isTrack || it.kept !== false;
        return (
          <div key={(it.aid || it.id) + "-" + i} className="xp-carditem" data-link={link} onClick={() => onClick(it)}>
            <div style={{ position: "relative" }}>
              <GenCover hue={it.hue} name={isAlbum ? it.label : (it.aid ? it.sub : it.label)} image={it.cover} thumb={it.cover} size={"100%"} style={{ aspectRatio: "1", width: "100%", height: "auto" }} radius={4} />
              <span className="xp-cardrk">{String(i + 1).padStart(2, "0")}</span>
            </div>
            <div className="xp-cardnm">{it.label}</div>
            <div className="xp-cardsub">{it.sub}</div>
          </div>
        );
      })}
    </div>
  );
  return (
    <div className="xp-rows">
      {items.map((it, i) => (
        <div key={(it.aid || it.id) + "-" + i} className="xp-row" data-link={isAlbum || isTrack || it.kept !== false} onClick={() => onClick(it)}>
          <span className="xp-rank">{String(i + 1).padStart(2, "0")}</span>
          <GenCover hue={it.hue} name={isAlbum ? it.label : (it.aid ? it.sub : it.label)} image={it.cover} thumb={it.cover} size={34} radius={3} />
          <div className="xp-row-main">
            <div className="xp-row-name">{it.label}</div>
            <div className="xp-row-sub">{it.sub}</div>
          </div>
          <div className="xp-bar">{it.bar !== false && <div style={{ width: (it.value / max * 100) + "%", background: `oklch(0.6 0.14 ${it.hue})` }} />}</div>
          <span className="xp-val">{it.disp || fmt(it.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ── RHYTHM (persistent, selectable) ──
function RhythmBar({ R, year, cells, toggleCell, toggleMany, clear, setPop, seen }) {
  const days = R.CLOCK.days;
  const grid = rhythmGrid(R, year);
  const max = Math.max(1, ...grid.flat());
  const total = grid.flat().reduce((a, b) => a + b, 0);
  const hourTotals = Array.from({ length: 24 }, (_, h) => days.reduce((s, _, di) => s + grid[di][h], 0));
  const peakHour = hourTotals.indexOf(Math.max(...hourTotals));
  const nightShare = total ? (hourTotals.slice(0, 5).reduce((a, b) => a + b, 0) / total * 100) : 0;
  const hr = (h) => (h % 12 === 0 ? 12 : h % 12) + (h < 12 ? "a" : "p");
  const sel = cells && cells.size > 0;
  const cellStyle = (v, c) => {
    const x = v / max, on = cells.has(c);
    return { aspectRatio: "1", borderRadius: 2, cursor: "pointer", transition: "opacity .4s, transform .12s, box-shadow .12s",
      background: x < 0.04 ? "var(--bg-3)" : `oklch(${0.28 + x * 0.5} ${0.05 + x * 0.12} var(--acc-h))`,
      opacity: seen ? (sel && !on ? 0.32 : 1) : 0, boxShadow: on ? "0 0 0 1.6px var(--accent)" : "none" };
  };
  if (total === 0) return <div className="r-card xp-empty" style={{ marginTop: "var(--gap)" }}>No plays in this slice.</div>;
  return (
    <div className="r-card" style={{ padding: "16px 18px 14px", marginTop: "var(--gap)" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap", marginBottom: 12 }}>
        <div className="r-mono" style={{ fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--ink-faint)" }}>Rhythm</div>
        <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>Peak <b style={{ color: "var(--ink)" }}>{hr(peakHour).replace("a", " AM").replace("p", " PM")}</b><span style={{ color: "var(--ink-faint)" }}> · </span><b style={{ color: "var(--accent)" }}>{nightShare.toFixed(0)}%</b> before 5 AM</div>
        <div className="r-mono" style={{ marginLeft: "auto", fontSize: 10, color: "var(--ink-faint)" }}>
          {sel ? <span>{cells.size} slot{cells.size > 1 ? "s" : ""} · <span style={{ color: "var(--accent)", cursor: "pointer" }} onClick={clear}>clear</span></span> : "tap cells / day / hour to filter"}
        </div>
      </div>
      <div className="clk-scroll">
        <div style={{ display: "grid", gridTemplateColumns: "34px repeat(24, 1fr)", gap: 3, marginBottom: 5 }}>
          <div />
          {Array.from({ length: 24 }, (_, h) => <div key={h} onClick={() => toggleMany(days.map((_, di) => di * 24 + h))} className="r-mono" style={{ fontSize: 7.5, color: "var(--ink-faint)", textAlign: "center", cursor: "pointer" }}>{h % 3 === 0 ? hr(h) : ""}</div>)}
        </div>
        {days.map((d, di) => (
          <div key={d} style={{ display: "grid", gridTemplateColumns: "34px repeat(24, 1fr)", gap: 3, marginBottom: 3 }}>
            <div className="r-mono" onClick={() => toggleMany(Array.from({ length: 24 }, (_, h) => di * 24 + h))} style={{ fontSize: 9.5, color: "var(--ink-soft)", display: "flex", alignItems: "center", cursor: "pointer" }}>{d}</div>
            {grid[di].map((v, h) => { const c = di * 24 + h; return (
              <div key={h} title={`${d} ${hr(h)} · ${v}`} style={cellStyle(v, c)}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.35)"; const r = e.currentTarget.getBoundingClientRect(); setPop({ x: r.left + r.width / 2, y: r.top, title: `${d}, ${hr(h)}`, pip: "var(--acc-h)", meta: "listening", rows: [["plays", fmt(v)], ["of peak", Math.round(v / max * 100) + "%"]], hint: "click to filter" }); }}
                onClick={() => toggleCell(c)} onMouseLeave={(e) => { e.currentTarget.style.transform = ""; setPop(null); }} />
            ); })}
          </div>
        ))}
        <div style={{ display: "grid", gridTemplateColumns: "34px 1fr", gap: 0, marginTop: 14, alignItems: "end" }}>
          <div />
          <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: 44 }}>
            {hourTotals.map((v, h) => <div key={h} style={{ flex: 1, height: (seen ? v / Math.max(...hourTotals, 1) * 100 : 0) + "%", background: h === peakHour ? "var(--accent)" : "var(--rule-2)", borderRadius: "2px 2px 0 0", transition: `height .6s cubic-bezier(.3,.8,.3,1) ${h * 0.012}s` }} title={`${hr(h)} · ${v}`} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── YEAR DETAIL ──
function YearDetail({ R, go, year }) {
  const yr = (R.YEARS || []).find(y => y.year === year);
  if (!yr || yr.plays < 300) return null;
  const headline = (typeof ERA_HEADLINE !== "undefined" && ERA_HEADLINE[year]) || ["", ""];
  const open = (name) => go("artist", R.idForName(name) || R.slug(name));
  const Stat = ({ k, v, sub, onClick }) => (<div className="era-d-stat" data-link={!!onClick} onClick={onClick}><div className="r-mono era-d-k">{k}</div><div className="era-d-v">{v}</div>{sub && <div className="era-d-sub">{sub}</div>}</div>);
  return (
    <div className="r-card xp-yeardetail">
      <div className="xp-yd-head">
        <div className="r-stat-n xp-yd-year">{year}</div>
        {headline[0] && <div><div className="xp-yd-title">{headline[0]}</div><div className="xp-yd-sub">{headline[1]}</div></div>}
      </div>
      <div className="era-d-grid">
        {yr.topTrack && <Stat k="Top track" v={yr.topTrack.title} sub={`${yr.topTrack.artist} · ${yr.topTrack.plays} plays`} onClick={() => open(yr.topTrack.artist)} />}
        {yr.topAlbum && <Stat k="Top album" v={yr.topAlbum.title} sub={`${yr.topAlbum.artist} · ${yr.topAlbum.plays} plays`} onClick={() => open(yr.topAlbum.artist)} />}
        {yr.peakDay && <Stat k="Peak day" v={yr.peakDay.plays + " plays"} sub={yr.peakDay.date} />}
        <Stat k="Hours" v={fmt(yr.hours)} sub={`${yr.activeDays} active days`} />
        <Stat k="Artists touched" v={fmt(yr.artists)} sub={`${fmt(yr.tracks)} tracks`} />
        {yr.discoveries[0] && <Stat k="Top discovery" v={yr.discoveries[0].name} sub={`${yr.discoveries[0].plays} plays · first heard ${year}`} onClick={() => open(yr.discoveries[0].name)} />}
        {yr.gainer && yr.gainer.delta > 50 && <Stat k="Biggest jump" v={yr.gainer.name} sub={`${yr.gainer.prev} → ${yr.gainer.plays} (+${yr.gainer.delta})`} onClick={() => open(yr.gainer.name)} />}
      </div>
    </div>
  );
}
