// rotation-explore.jsx — the converged explorer. One filter set {time · subgenre · clock-slots}
// over a SINGLE side-by-side surface: the sound map (left, sticky) and the ranked results
// (right) are the same universe (window.ROTATION.EXPLORE — every tagged artist), so clicking a
// subgenre bubble filters the list and a click is never empty. Genres are grouped under families
// (FamiliesGrid) — filter by family or subgenre; subgenres morph smoothly as you scrub years.

const _inflate = (flat) => Array.from({ length: 7 }, (_, r) => flat.slice(r * 24, r * 24 + 24));
const _zeros = () => Array.from({ length: 7 }, () => new Array(24).fill(0));

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

// subgenre bubble weights for a year, summed over the EXPLORE universe (so map ↔ ranking match)
function mapWeights(R, year) {
  const w = new Array(R.SUBS.length).fill(0);
  for (const a of R.EXPLORE) {
    const p = year == null ? a.plays : ((a.yp && a.yp[year]) || 0);
    if (!p) continue;
    for (const si of a.s) w[si] += p;
  }
  return R.SUBS.map((s, i) => ({ ...s, w: w[i] }));
}

function exploreRank(R, kind, f) {
  const { year, fam, subIdx, cells } = f;
  const hasCells = cells && cells.size > 0;
  const inFam = (s) => fam == null || s.some(si => R.SUBS[si].fam === fam); // inclusive: any sub in family
  if (kind === "artists") {
    const AXI = { energy: 0, valence: 1, acoustic: 2, tempo: 3, dance: 4 }, snd = f.sound, dir = f.dir || 1;
    const arr = [];
    for (const a of R.EXPLORE) {
      if (year != null && !(a.yp && a.yp[year])) continue;
      if (subIdx >= 0) { if (a.s.indexOf(subIdx) < 0) continue; }
      else if (!inFam(a.s)) continue;
      if (f.attrSel) {  // attributes-lens brush/click: filter the FULL universe, not the top-40 slice
        if (f.attrSel.mode === "artists") { if (!f.attrSel.keys.has(a.id)) continue; }
        else if (!a.s.some(ix => f.attrSel.keys.has(ix))) continue;
      }
      const plays = hasCells ? tsPlays(R, a.id, cells) : (year != null ? a.yp[year] : a.plays);
      if (hasCells && !plays) continue;
      let value = plays, disp;
      if (snd) {                                   // sort by measured sound instead of plays
        const af = R.AUDIO[a.id]; if (!af || plays < 15) continue;   // floor keeps it meaningful
        if (snd === "pop") { value = af[7]; disp = af[7] + "/100"; }
        else { value = af[AXI[snd]]; disp = Math.round(value * 100) + "%"; }
      }
      arr.push({ id: a.id, label: a.name, value, disp, plays, hue: a.hue, kept: !!(R.byId[a.id] || (R.expById && R.expById[a.id])),
        sub: (R.SUBS[a.s[0]] || {}).name || "" });
    }
    const _seen = new Set();   // distinct artists can share a slug id (✝✝✝/Crosses) — keep one, avoids key collisions
    return arr.sort((x, y) => (y.value - x.value) * (snd ? dir : 1)).filter(x => _seen.has(x.id) ? false : _seen.add(x.id)).slice(0, 40);
  }
  let src;
  if (year == null) {
    const base = kind === "albums" ? R.ALBUMS : R.TRACKS;
    src = base.map(a => ({ id: a.id, aid: a.artistId, label: a.title, value: a.plays, hue: a.hue, sub: a.artist }));
  } else {
    const yr = R.YEARS.find(y => y.year === year) || {};
    src = (yr[kind] || []).map((it, i) => ({ id: kind + year + i, aid: it.artistId, label: it.title, value: it.plays, hue: it.hue, sub: it.artist }));
  }
  if (subIdx >= 0) src = src.filter(it => { const e = R.expById[it.aid]; return e && e.s.indexOf(subIdx) >= 0; });
  else if (fam != null) src = src.filter(it => { const e = R.expById[it.aid]; return e && e.s.some(si => R.SUBS[si].fam === fam); });
  if (hasCells) src = src.filter(it => tsPlays(R, it.aid, cells) > 0);
  return src.map(it => ({ ...it, kept: !!(R.byId[it.aid] || (R.expById && R.expById[it.aid])) })).sort((a, b) => b.value - a.value).slice(0, 40);
}

// ── mood lens (the former Mood page, folded in as a filter) ──
// Zones split the valence (af[1], x) × energy (af[0], y) plane into quadrants around the midline.
const MOOD_ZONES = ["dark-intense", "bright-intense", "dark-calm", "bright-calm"];
const MOOD_LABELS = { "dark-intense": "dark · intense", "bright-intense": "bright · intense", "dark-calm": "dark · calm", "bright-calm": "bright · calm" };
const zoneOf = (x, y) => (x >= 0.5 ? "bright" : "dark") + "-" + (y >= 0.5 ? "intense" : "calm");
const inMoodZone = (af, z) => !z || zoneOf(af[1], af[0]) === z;

// EXPLORE artists (with measured audio) passing the genre/time filters; moodZone applied only when
// applyZone is set (the quadrant shows the whole slice; facts/results reflect the chosen zone too).
function sliceArtists(R, f, applyZone) {
  const A = R.AUDIO || {}, { year, fam, subIdx, cells, moodZone } = f;
  const hasCells = cells && cells.size > 0;
  const inFam = (s) => fam == null || s.some(si => R.SUBS[si].fam === fam);
  const out = [];
  for (const a of R.EXPLORE) {
    const af = A[a.id]; if (!af) continue;
    if (year != null && !(a.yp && a.yp[year])) continue;
    if (subIdx >= 0) { if (a.s.indexOf(subIdx) < 0) continue; } else if (!inFam(a.s)) continue;
    if (hasCells && !tsPlays(R, a.id, cells)) continue;
    if (applyZone && moodZone && !inMoodZone(af, moodZone)) continue;
    out.push(a);
  }
  return out;
}

// hue for a media artist with no profiled record (deterministic from the name)
const _hueHash = (s) => { let h = 0; for (const c of (s || "")) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 360; };

// mediaRank — rank albums/tracks from the lazy media-index at FULL depth, applying the same filter
// set as the inline ranking. `meta` is the precomputed per-artist resolution (id/record/hue). Returns
// the top `limit` rows + whether more exist. Genre/mood/clock reach as far as the artist data does;
// year/plays reach the whole library. Rows are pre-sorted by plays, so all-time queries break early.
function mediaRank(M, R, meta, kind, f, limit) {
  const rows = kind === "albums" ? M.albums : M.tracks;
  const tailIdx = kind === "albums" ? 5 : 4;
  const { year, fam, subIdx, cells, moodZone } = f;
  const hasCells = cells && cells.size > 0, noYear = year == null;
  const playsInYear = (row, y) => { const t = row[tailIdx]; if (t == null) return 0; if (typeof t === "number") return t === y ? row[2] : 0; for (let i = 0; i < t.length; i += 2) if (t[i] === y) return t[i + 1]; return 0; };
  const out = []; let more = false;
  for (const row of rows) {
    const m = meta[row[1]], rec = m.rec;
    if (subIdx >= 0) { if (!rec || !rec.s || rec.s.indexOf(subIdx) < 0) continue; }
    else if (fam != null) { if (!rec || !rec.s || !rec.s.some(si => R.SUBS[si].fam === fam)) continue; }
    if (moodZone) { const af = R.AUDIO[m.aid]; if (!af || !inMoodZone(af, moodZone)) continue; }
    if (f.attrSel) {
      if (f.attrSel.mode === "artists") { if (!f.attrSel.keys.has(m.aid)) continue; }
      else if (!rec || !rec.s || !rec.s.some(si => f.attrSel.keys.has(si))) continue;
    }
    if (hasCells && !tsPlays(R, m.aid, cells)) continue;
    let value = row[2];
    if (!noYear) { value = playsInYear(row, year); if (!value) continue; }
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
  const onDown = (e) => { if (e.button !== 0) return; drag.current = { mx: e.clientX, my: e.clientY, v: vbRef.current }; };
  const onMove = (e) => { if (!drag.current || !ref.current) return; const r = ref.current.getBoundingClientRect(), d = drag.current; commit({ ...d.v, x: d.v.x - (e.clientX - d.mx) / r.width * d.v.w, y: d.v.y - (e.clientY - d.my) / r.height * d.v.h }); };
  const onUp = () => { drag.current = null; };
  const reset = () => commit({ x: 0, y: 0, w: W, h: H });
  // live numeric viewBox [x,y,w,h] for the fisheye (mid-gesture-correct, reads vbRef not state);
  // draggingRef lets a chart tell the fisheye to pause while the pan drag is active.
  const vbArr = React.useRef([vb.x, vb.y, vb.w, vb.h]);
  vbArr.current = [vbRef.current.x, vbRef.current.y, vbRef.current.w, vbRef.current.h];
  return { k: vb.w / W, zoomed: vb.w < W - 0.5, reset, vbRef: vbArr, draggingRef: drag,
    bind: { ref, viewBox: `${vb.x} ${vb.y} ${vb.w} ${vb.h}`, onMouseDown: onDown, onMouseMove: onMove, onMouseUp: onUp } };
}

// a small floating "reset zoom" chip shown over a chart once it's been zoomed
function ZoomReset({ z }) {
  return z.zoomed ? <button className="xp-zoomreset" onClick={z.reset} title="reset zoom">⤢ reset</button> : null;
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
      <ZoomReset z={z} />
      <svg {...z.bind} style={{ width: "100%", height: "auto", display: "block", cursor: "grab", touchAction: "manipulation", "--zk": z.k }}
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
      <ZoomReset z={z} />
      <svg {...z.bind} style={{ width: "100%", height: "auto", display: "block", cursor: "grab", touchAction: "manipulation", "--zk": z.k }}
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
      <ZoomReset z={z} />
      <svg {...z.bind} style={{ width: "100%", height: "auto", display: "block", cursor: "grab", touchAction: "manipulation", "--zk": z.k }}
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
function AttrScatter({ rows, mode, xKey, yKey, shade, famDim, go, onBrushSel }) {
  const [hover, setHover] = React.useState(null);
  const [brush, setBrush] = React.useState(null);    // live pixel rect while dragging
  const [brushed, setBrushed] = React.useState(null); // committed rect
  const [singleSel, setSingleSel] = React.useState(null); // single-clicked subgenre row id (multi = drag)
  const dragRef = React.useRef(null);
  const z = useZoom(1000, 560);
  const svgRef = z.bind.ref; // share the element useZoom already tracks (wheel-zoom binds to it)
  const fish = useFisheye(svgRef, z.vbRef, ".xp-fdot", dragRef);   // pause fisheye while brushing (dragRef)

  const W = 1000, H = 560;
  const PAD_L = 54, PAD_R = 24, PAD_T = 24, PAD_B = 46;
  const PW = W - PAD_L - PAD_R, PH = H - PAD_T - PAD_B;

  React.useEffect(() => { setBrushed(null); }, [xKey, yKey, mode]);

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
    for (const pt of pts) { const dx = pt.px - p.x, dy = pt.py - p.y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = pt; } }
    setHover(best);
    fish.run(evt.clientX, evt.clientY);   // proximity fisheye (paused while brushing via dragRef)
  };
  const onUp = () => {
    if (dragRef.current && brush) {
      const w = Math.abs(brush.x1 - brush.x0), h = Math.abs(brush.y1 - brush.y0);
      if (w > 6 && h > 6) { setBrushed({ x0: Math.min(brush.x0, brush.x1), x1: Math.max(brush.x0, brush.x1), y0: Math.min(brush.y0, brush.y1), y1: Math.max(brush.y0, brush.y1) }); setSingleSel(null); }
      else {
        // a CLICK (not a drag): in subgenre mode it toggles that one subgenre's selection
        // (multi stays on drag); in artist mode it clears. Empty-space click clears both.
        setBrushed(null);
        if (hover && mode === "subgenres") setSingleSel(s => s === hover.row.id ? null : hover.row.id);
        else setSingleSel(null);
      }
    }
    dragRef.current = null; setBrush(null);
  };
  const onLeave = () => { if (!dragRef.current) { setHover(null); fish.reset(); } };

  const inBrush = React.useCallback((pt) => brushed ? (pt.px >= brushed.x0 && pt.px <= brushed.x1 && pt.py >= brushed.y0 && pt.py <= brushed.y1) : true, [brushed]);
  const isDimFam = React.useCallback((row) => famDim != null && row.fam !== famDim, [famDim]);

  const brushedPts = React.useMemo(() => {
    if (!brushed) return [];
    return pts.filter(p => inBrush(p) && !isDimFam(p.row)).sort((a, b) => (b.row.plays || 0) - (a.row.plays || 0)).slice(0, 40);
  }, [pts, brushed, inBrush, isDimFam]);
  // lift the selection to the ranked list: a committed brush (region) OR a single-clicked
  // subgenre — artists as slugs, subgenres as SUBS indexes (Fuad 2026-07-13/14)
  React.useEffect(() => {
    if (!onBrushSel) return;
    if (brushed) {
      const all = pts.filter(p => inBrush(p) && !isDimFam(p.row));
      onBrushSel({ mode, keys: new Set(all.map(p => mode === "subgenres" ? parseInt(String(p.row.id).slice(4), 10) : p.row.id)) });
    } else if (singleSel && mode === "subgenres") {
      onBrushSel({ mode, keys: new Set([parseInt(String(singleSel).slice(4), 10)]) });
    } else onBrushSel(null);
  }, [brushed, singleSel, pts, inBrush, isDimFam, mode, onBrushSel]);

  // dots memoized WITHOUT the zoom factor — radius rides --zk so wheel-zoom reconciles nothing
  const dots = React.useMemo(() => pts.map((pt, i) => {
    const on = inBrush(pt), dimF = isDimFam(pt.row);
    const isHover = hover && hover.row.id === pt.row.id;
    const isSel = singleSel && pt.row.id === singleSel;
    const op = dimF ? 0.06 : brushed ? (on ? 0.92 : 0.1) : singleSel ? (isSel ? 0.95 : 0.15) : (mode === "subgenres" ? 0.82 : 0.72);
    const baseR = isHover ? pt.radius + 2 : pt.radius;
    return (
      <circle key={pt.row.id + "-" + i} className="xp-fdot" data-cx={pt.px.toFixed(1)} data-cy={pt.py.toFixed(1)}
        cx={pt.px.toFixed(1)} cy={pt.py.toFixed(1)}
        fill={fillFor(pt.row)} fillOpacity={op}
        stroke={isHover || isSel ? "#fff" : "none"} strokeWidth={isSel ? 2 : 1.4} vectorEffect="non-scaling-stroke"
        style={{ r: `calc(${baseR.toFixed(2)}px * var(--zk) * var(--fk, 1))`, cursor: "pointer", transition: "fill-opacity .3s ease" }} />);
  }), [pts, hover, brushed, singleSel, inBrush, isDimFam, fillFor, mode]);

  const subLabels = React.useMemo(() => mode !== "subgenres" ? null : pts.filter(pt => labelIds.has(pt.row.id) && !isDimFam(pt.row)).map(pt => (
    <text key={"lbl" + pt.row.id} x={(pt.px + pt.radius + 3).toFixed(1)} y={(pt.py + 3).toFixed(1)}
      fill="var(--ink-dim)" fontFamily="var(--mono)" style={{ fontSize: `calc(10px * var(--zk))`, pointerEvents: "none" }}>
      {pt.row.name.length > 22 ? pt.row.name.slice(0, 21) + "…" : pt.row.name}</text>)), [pts, labelIds, mode, isDimFam]);

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
        ) : <span>hover a dot for its values · drag to brush a region · scroll to zoom</span>}
      </div>
      <ZoomReset z={z} />
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

      {/* BRUSH RESULTS — rows click through to artist pages (artists mode); scrolls inside
          .xp-attr-info so the chart above never moves (Fuad 2026-07-14) */}
      {brushed && (
        <div className="xp-attr-info" style={{ marginTop: 14, borderTop: "1px solid var(--rule)", paddingTop: 12 }}>
          <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: ".14em", textTransform: "uppercase", marginBottom: 8 }}>
            {brushedPts.length} in region — top {Math.min(40, brushedPts.length)} by plays{mode !== "subgenres" ? " · tap to open" : ""}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "2px 16px" }}>
            {brushedPts.map((pt) => (
              <div key={pt.row.id} className="xp-attr-brushrow" data-link={mode !== "subgenres"} onClick={() => openRow(pt.row)}>
                <span style={{ color: `oklch(0.7 0.16 ${pt.row.hue != null ? pt.row.hue : 300})`, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pt.row.name}</span>
                <span style={{ color: "var(--ink-faint)", flex: "0 0 auto" }}>{(pt.row.plays || 0).toLocaleString("en-US")} · {attrFmtVal(pt.row, xKey)}/{attrFmtVal(pt.row, yKey)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// AttrExplore — the "attributes" lens wrapper: lazy-loads track-audio.js, memoises the centroid
// pass, owns the X/Y/shade pickers + the family colour key (click a family to dim the rest).
function AttrExplore({ R, go, grain, onBrushSel }) {
  const [taReady, setTaReady] = React.useState(!!window.ROTATION_TRACKAUDIO);
  const [restReady, setRestReady] = React.useState(!!(R && R._restLoaded));
  const [xKey, setXKey] = React.useState("energy");
  const [yKey, setYKey] = React.useState("valence");
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

      <AttrScatter rows={rows} mode={mode} xKey={xKey} yKey={yKey} shade={shade} famDim={famDim} go={go} onBrushSel={onBrushSel} />

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
        {built.artists.length} of {built.totalAudioArtists || "?"} audio-covered artists have ≥3 featured tracks · coloured by genre family
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
    if (it.type === "track") go("track", R.slug(it.sub) + "~" + R.slug(it.label));
    else if (it.type === "album") go("album", R.slug(it.sub) + "~" + R.slug(it.label));
    else if (it.type === "artist") onArtist(it.id);
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
  const [year, setYear] = React.useState(null);
  const [fam, setFam] = React.useState(null);             // family index, or null
  const [sub, setSub] = React.useState(null);             // subgenre NAME, or null
  const [cells, setCells] = React.useState(() => new Set());
  const [playing, setPlaying] = React.useState(false);
  const [lens, setLens] = React.useState("texture");      // left surface: "texture" map or "mood" quadrant
  const [attrSel, setAttrSel] = React.useState(null);     // attributes-lens brush selection ({mode, keys}) — filters the ranked list
  React.useEffect(() => { if (lens !== "attributes") setAttrSel(null); }, [lens]);
  const [grain, setGrain] = React.useState("subs");       // plot granularity for either lens: "subs" or "artists"
  const [moodZone, setMoodZone] = React.useState(null);   // active valence×energy quadrant filter, or null
  const [mediaReady, setMediaReady] = React.useState(!!window.ROTATION_MEDIA);
  const [showN, setShowN] = React.useState(16);           // base visible rows (8/16/24/32 buttons; default 16)
  const [extra, setExtra] = React.useState(0);            // extra rows revealed by "load more" beyond the base;
  const visN = showN + extra;                             //   reset by the count buttons and by any filter change
  const [disp, setDisp] = React.useState("list");         // ranked results: list ⇄ cover grid (Fuad 2026-07-07)
  const [ref, seen] = useInView();

  // albums/tracks now rank from the lazy media-index (full library depth) — load it the first time
  // one of those tabs is opened.
  React.useEffect(() => {
    if (kind === "artists" || window.ROTATION_MEDIA) { if (window.ROTATION_MEDIA && !mediaReady) setMediaReady(true); return; }
    const s = document.createElement("script"); s.src = "media-index.js"; s.onload = () => setMediaReady(true); document.head.appendChild(s);
  }, [kind]);

  // deep-link: arriving via #explore/<tag> (e.g. from an artist-page genre chip) preselects that
  // subgenre, or its family if the tag names a family rather than a leaf subgenre. A seed with
  // "=" is instead a full serialized filter slice (see the hash-writer effect below).
  React.useEffect(() => {
    if (!seed) return;
    const norm = (x) => (x || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (seed.includes("=")) {   // restore a shared/bookmarked slice (";"-separated; parseHash already url-decoded)
      const p = {}; for (const kv of seed.split(";")) { const i = kv.indexOf("="); if (i > 0) p[kv.slice(0, i)] = kv.slice(i + 1); }
      if (p.y && !isNaN(+p.y)) setYear(+p.y);
      if (p.s) { const s = R.SUBS.find(x => norm(x.name) === norm(p.s)); if (s) { setFam(null); setSub(s.name); } }
      else if (p.f) { const fm = R.FAMILIES.find(f => norm(f.family) === norm(p.f)); if (fm) { setSub(null); setFam(fm.i); } }
      if (p.m && MOOD_ZONES.includes(p.m)) setMoodZone(p.m);
      if (p.c) setCells(new Set(p.c.split(".").map(Number).filter(n => n >= 0 && n < 168)));
      if (p.k === "albums" || p.k === "tracks") setKind(p.k);
      return;
    }
    const q = norm(seed);
    const s = R.SUBS.find(x => norm(x.name) === q);
    if (s) { setFam(null); setSub(s.name); return; }
    const fm = R.FAMILIES.find(f => norm(f.family) === q);
    if (fm) { setSub(null); setFam(fm.i); }
  }, [seed, R]);

  // keep the active slice in the URL (replaceState — no history spam, no popstate loops) so any
  // Explore state is bookmarkable/shareable and survives refresh.
  const _mounted = React.useRef(false);
  React.useEffect(() => {
    if (!_mounted.current) { _mounted.current = true; if (seed) return; }   // don't clobber an incoming seed on first render
    if (!(window.location.hash || "").startsWith("#explore")) return;      // only while Explore owns the URL
    const parts = [];
    if (year != null) parts.push("y=" + year);
    if (sub) parts.push("s=" + encodeURIComponent(sub));
    else if (fam != null) { const fm = R.FAMILIES.find(f => f.i === fam); if (fm) parts.push("f=" + encodeURIComponent(fm.family)); }
    if (moodZone) parts.push("m=" + moodZone);
    if (cells.size) parts.push("c=" + [...cells].sort((a, b) => a - b).join("."));
    if (kind !== "artists") parts.push("k=" + kind);
    const target = "#explore" + (parts.length ? "/" + parts.join(";") : "");
    if ((window.location.hash || "") !== target) window.history.replaceState(null, "", target);
  }, [kind, year, fam, sub, moodZone, cells, R]);

  const yearKeys = React.useMemo(() => Object.keys(R.CLOCK_BY_YEAR).map(Number).sort((a, b) => a - b), [R]);
  const subNames = React.useMemo(() => R.SUBS.map(s => s.name), [R]);
  const subIdx = sub == null ? -1 : R.SUBS.findIndex(s => s.name === sub);

  React.useEffect(() => {
    if (!playing) return;
    const tmr = setInterval(() => setYear(y => {
      const i = y == null ? -1 : yearKeys.indexOf(y);
      if (i >= yearKeys.length - 1) { setPlaying(false); return yearKeys[yearKeys.length - 1]; }
      return yearKeys[i + 1];
    }), 1600);
    return () => clearInterval(tmr);
  }, [playing, yearKeys]);
  const togglePlay = () => {
    if (!playing && (year == null || yearKeys.indexOf(year) >= yearKeys.length - 1)) setYear(yearKeys[0]);
    setPlaying(p => !p);
  };

  const weights = React.useMemo(() => mapWeights(R, year), [R, year]);
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
  const mediaItems = React.useMemo(() => {
    if (kind === "artists" || !mediaReady || !mediaArtMeta) return null;
    // fetch a lookahead past what's visible so "load more" has rows ready and `more` is detectable
    return mediaRank(window.ROTATION_MEDIA, R, mediaArtMeta, kind, { year, fam, subIdx, cells, moodZone, attrSel: (lens === "attributes" && attrSel && attrSel.keys.size) ? attrSel : null }, visN + 40);
  }, [kind, mediaReady, mediaArtMeta, year, fam, subIdx, cells, moodZone, visN, R, attrSel, lens]);
  // the attributes-lens selection now filters INSIDE the rank functions (full universe,
  // pre-slice) — the old post-filter ran on the top-40 and starved the list (Fuad 2026-07-14)
  const items = (kind !== "artists" && mediaItems) ? mediaItems.items
    : exploreRank(R, kind, { year, fam, subIdx, cells, sound, dir: sndDir, moodZone, attrSel: (lens === "attributes" && attrSel && attrSel.keys.size) ? attrSel : null });
  // more rows to reveal? true whenever the ranked pool has more than we're currently showing —
  // works for artists (full list) AND albums/tracks (media pool), so load-more applies to all three.
  const more = items.length > visN;
  // a new slice resets the load-more expansion (the chosen 8/16/24/32 base stays)
  React.useEffect(() => { setExtra(0); }, [kind, year, fam, subIdx, cells, moodZone, attrSel]);
  // mood-lens slices. The quadrant renders a STABLE universe of points (so dots persist across filter
  // changes and can transition opacity/size) and toggles which are "active" for the current slice;
  // facts/arc reflect the chosen zone too.
  // the full audio universe (every artist with measured features — ~3.9k) for both artist clouds;
  // progressive rendering keeps mounting them cheap. af = [energy, valence, acoustic, tempo, dance, instr].
  const moodUniverse = React.useMemo(() => R.EXPLORE.filter(a => R.AUDIO[a.id])
    .map(a => { const af = R.AUDIO[a.id]; return { id: a.id, name: a.name, hue: a.hue, x: af[1], y: af[0], plays: a.plays }; }), [R]);
  const moodActive = React.useMemo(() => new Set(sliceArtists(R, { year, fam, subIdx, cells }, false).map(a => a.id)), [R, year, fam, subIdx, cells]);
  const moodSet = React.useMemo(() => sliceArtists(R, { year, fam, subIdx, cells, moodZone }, true), [R, year, fam, subIdx, cells, moodZone]);
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

  const chips = [];
  if (year != null) chips.push(["time", year, () => { setPlaying(false); setYear(null); }]);
  if (sub) chips.push(["subgenre", sub, () => setSub(null)]);
  else if (fam != null) chips.push(["genre", (R.FAMILIES.find(f => f.i === fam) || {}).family, () => setFam(null)]);
  if (moodZone) chips.push(["mood", MOOD_LABELS[moodZone], () => setMoodZone(null)]);
  if (cells.size) chips.push(["clock", cells.size + " slot" + (cells.size > 1 ? "s" : ""), () => setCells(new Set())]);

  return (
    <div className="r-view xp" ref={ref}>
      <div className="r-viewhead">
        <div>
          <div className="r-kicker">Explore{chips.length ? "" : " · all time"}</div>
          <h1 className="r-title">Dig <em>through</em><span className="dot">.</span></h1>
        </div>
        <div className="xp-head-right">
          <ExploreSearch R={R} yearKeys={yearKeys} subNames={subNames} go={go}
            onArtist={(id) => go("artist", id)} onSub={setSub} onYear={setYear} onCells={(arr) => setCells(new Set(arr))} />
        </div>
      </div>

      {/* filter bar: Time on the left, Active filters pinned to the right of the SAME row — so
         activating a filter fills the right side instead of adding a row that shoves the page
         down (Fuad 2026-07-09). Collapses to stacked on mobile. */}
      <div className="xp-filters r-card">
        <div className="xp-frow xp-frow-main">
          <span className="xp-flabel">Time</span>
          <div className="xp-chiprow xp-chiprow-time">
            <button className="xp-chip xp-play" data-on={playing} onClick={togglePlay} title="Play the decade">{playing ? "❚❚" : "▶"} decade</button>
            <button className="xp-chip" data-on={year == null} onClick={() => { setPlaying(false); setYear(null); }}>All</button>
            {yearKeys.map(y => <button key={y} className="xp-chip" data-on={year === y} onClick={() => { setPlaying(false); setYear(year === y ? null : y); }}>{"'" + String(y).slice(2)}</button>)}
          </div>
          {chips.length > 0 && (
            <div className="xp-active">
              <span className="xp-flabel">Active</span>
              <div className="xp-chiprow">
                {chips.map(([k, v, clr]) => <button key={k} className="xp-chip xp-chip-active" onClick={clr}><span className="xp-ck">{k}</span> {v} <span className="xp-x">✕</span></button>)}
                <button className="xp-chip xp-clearall" onClick={() => { setPlaying(false); setYear(null); setFam(null); setSub(null); setCells(new Set()); setMoodZone(null); }}>clear all</button>
              </div>
            </div>
          )}
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
              ? <AttrExplore R={R} go={go} grain={grain} onBrushSel={setAttrSel} />
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
              {[8, 16, 24, 32].map(n => <button key={n} data-on={extra === 0 && showN === n} onClick={() => { setShowN(n); setExtra(0); }}>{n}</button>)}
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

      {/* sort row — moved BELOW the artists/tracks module (Fuad): plays → most obscure */}
      {kind === "artists" && (
        <div className="r-card" style={{ padding: "10px 14px", marginTop: "var(--gap)" }}>
          <div className="xp-frow" style={{ marginBottom: 0 }}>
            <span className="xp-flabel">Sort</span>
            <div className="xp-chiprow">
              {[["", "plays"], ["energy", "energy"], ["valence", "mood"], ["dance", "dance"], ["acoustic", "acoustic"], ["tempo", "tempo"], ["pop", "popularity"]].map(([k, l]) =>
                <button key={k || "p"} className="xp-chip" data-on={(sound || "") === k} onClick={() => setSound(k || null)}>{l}</button>)}
              {sound && <button className="xp-chip" onClick={() => setSndDir(d => -d)} title="flip direction">{sndDir === 1 ? "▼ high→low" : "▲ low→high"}</button>}
            </div>
          </div>
          {sound && <div className="r-mono xp-note" style={{ marginTop: 6 }}>{sound === "pop" ? "Spotify popularity 0–100 · flip for most-obscure first" : "share of that trait, 0–100% · artists with ≥15 plays"}</div>}
        </div>
      )}

      {/* "Mood over the years" arc removed from Explore (Fuad 2026-07-07) — candidate to move into
          Stories as a lifetime section. MoodContext (above) + moodSet are kept for that follow-up. */}

      {/* genres grouped under families — 6 columns per row, each card scrollable (Fuad) */}
      <FamiliesGrid order={order} weights={weights} fam={fam} sub={sub} pickFam={pickFam} pickSub={pickSub} year={year} seen={seen} expressive={t.chart === "expressive"} />

      {/* Rhythm (the 7×24 clock) moved to the Calendar page (2026-07-05) — time-of-day lives with time. */}
      {year != null && <YearDetail R={R} go={go} year={year} />}

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
        .xp-active { display: flex; align-items: center; gap: 8px; margin-left: auto; flex: 0 0 auto; }
        .xp-active .xp-flabel { padding-top: 0; }
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
        .xp-rows { display: grid; gap: 2px; }
        .xp-row { display: grid; grid-template-columns: 24px 34px 1fr 90px 46px; gap: 10px; align-items: center; padding: 5px 6px; border-radius: 6px; transition: background .12s; }
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
        .xp-val { font-family: var(--mono); font-size: 10.5px; color: var(--ink-soft); text-align: right; }
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
          .xp-flabel { padding-top: 0; }
          .xp-chiprow { overflow-x: auto; flex-wrap: nowrap; padding-bottom: 4px; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
          .xp-chiprow::-webkit-scrollbar { display: none; }
          .xp-head-right { width: 100%; }
          .xp-search { min-width: 0; width: 100%; }
          .clk-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; padding-bottom: 4px; }
          .clk-scroll::-webkit-scrollbar { display: none; }
          .clk-scroll > div { min-width: 430px; }
          .era-d-grid { grid-template-columns: 1fr 1fr; }
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
  // bubbles don't ride the zoom factor, so memoizing them makes wheel-zoom (viewBox only)
  // reconcile nothing — no per-frame rebuild of ~200 subgenre marks (Fuad 2026-07-09).
  const bubbles = React.useMemo(() => subs.map((s, i) => {
        const present = s.w > 0;
        const r = present ? 9 + (s.w / maxW) * 42 : 0;
        const on = activeSub ? activeSub === s.name : (activeFam != null && s.fam === activeFam);
        const dim = activeSub ? activeSub !== s.name : (activeFam != null && s.fam !== activeFam);
        const col = expressive ? `oklch(0.62 0.17 ${s.hue})` : "var(--accent)";
        return (
          <g key={s.name} style={{ cursor: present ? "pointer" : "default", opacity: seen ? (present ? (dim ? 0.14 : 1) : 0) : 0,
            transition: `opacity .45s cubic-bezier(.3,.8,.3,1) ${i * 0.008}s`, pointerEvents: present ? "auto" : "none" }}
            onMouseEnter={() => setHi(s)}
            onClick={() => onPick(s.name)} onMouseLeave={() => setHi(null)}>
            {/* transparent min-size hit target so even tiny subgenres are clickable/hoverable */}
            <circle cx={px(s.x)} cy={py(s.y)} r={Math.max(r, 14)} fill="transparent" />
            <circle cx={px(s.x)} cy={py(s.y)} r={r} fill={col} fillOpacity={on ? .5 : (expressive ? .28 : .14)} stroke={col} strokeWidth={on ? 2.2 : 1.4} style={{ transition: "r .55s cubic-bezier(.3,.8,.3,1), fill-opacity .2s" }} />
            {r > 17 && <text x={px(s.x)} y={py(s.y)} textAnchor="middle" dominantBaseline="middle" fill="var(--ink)" fontSize={Math.min(13, r / 3.2)} fontFamily="var(--sans)" fontWeight="500" style={{ pointerEvents: "none", transition: "font-size .55s" }}>{s.name.length > 13 ? s.name.split(" ")[0] : s.name}</text>}
          </g>
        );
      }), [subs, maxW, activeSub, activeFam, expressive, seen, onPick]);
  return (
    <div style={{ position: "relative" }}>
      <ZoomReset z={z} />
    <svg {...z.bind} style={{ width: "100%", height: "auto", display: "block", cursor: "grab", touchAction: "manipulation" }}>
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
          <div className="xp-bar"><div style={{ width: (it.value / max * 100) + "%", background: `oklch(0.6 0.14 ${it.hue})` }} /></div>
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
