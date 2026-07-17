// rotation-worldmap.jsx — the Map band (lives inside Overview). A pan/zoomable bubble map of where the music comes from
// (world-map.js). Toggle countries ⇄ cities; colour by dominant genre or the top artist's genre;
// ▶ play the years to watch the map shift; click a country to zoom into its cities; click any
// place for a detail blob (top artists/albums/songs + Sound DNA, from the lazy geo-detail.js).

// MapFlow — the taste-flow that doubles as the Map's genre filter, legend AND full taste-journey.
// Computed from the place-scoped EXPLORE set (a.yp over the years). Three lenses over the same river:
// genre families → a family's subgenres (both drive the map filter via setFilt) → the bands behind
// the current slice as ribbons (artist view; click opens the artist). markYi marks the active year.
function MapFlow({ artists, filt, setFilt, years, markYi, go }) {
  const R = window.ROTATION;
  // pin the streamgraph height to the families-view size so drilling into a genre (whose subgenre
  // count differs) never changes the flow's height and shoves row-2 of the map band down.
  const FLOW_H = Math.min(920, 500 + Math.max(0, R.FAMILIES.length - 10) * 30);
  const [hi, setHi] = React.useState(-1);
  const [view, setView] = React.useState("genre");   // genre | artist
  const { fam, sub } = filt;
  React.useEffect(() => { setHi(-1); }, [fam, sub, view]);
  const series = React.useMemo(() => {
    const sumBy = (keyOf) => {
      const m = new Map();
      for (const a of artists) {
        if (!a.yp) continue;
        const k = keyOf(a); if (k == null) continue;
        if (!m.has(k)) m.set(k, new Array(years.length).fill(0));
        const arr = m.get(k); years.forEach((y, i) => { arr[i] += a.yp[y] || 0; });
      }
      return m;
    };
    if (view === "artist") {   // the bands behind the current place ∩ genre slice
      const fn = sub != null ? (a => a.s.indexOf(sub) >= 0) : fam != null ? (a => a.s.some(si => R.SUBS[si] && R.SUBS[si].fam === fam)) : (() => true);
      return artists.filter(a => a.yp && fn(a)).sort((a, b) => b.plays - a.plays).slice(0, 12)
        .map(a => ({ key: a.id, name: a.name, hue: a.hue, id: a.id, vals: years.map(y => a.yp[y] || 0) })).filter(s => s.vals.some(v => v > 0));
    }
    if (fam != null) {
      const m = sumBy(a => (a.s.length && R.SUBS[a.s[0]] && R.SUBS[a.s[0]].fam === fam) ? a.s[0] : null);
      const fhue = (R.FAMILIES.find(f => f.i === fam) || {}).hue || 0;
      const arr = [...m.entries()];
      return arr.map(([si, vals], idx) => ({ key: si, name: R.SUBS[si].name, hue: (fhue + (idx - (arr.length - 1) / 2) * 17 + 360) % 360, sub: si, vals })).filter(s => s.vals.some(v => v > 0));
    }
    const m = sumBy(a => a.s.length ? (R.SUBS[a.s[0]] && R.SUBS[a.s[0]].fam) : null);
    return R.FAMILIES.map(f => ({ key: f.i, name: f.family, hue: f.hue, fam: f.i, vals: m.get(f.i) || new Array(years.length).fill(0) })).filter(s => s.vals.some(v => v > 0));
  }, [artists, fam, sub, view, years, R]);

  // families → their subgenres → the bands within (drilling a subgenre also scopes the map to it);
  // artist ribbons open the artist
  const onPick = (s) => {
    if (view === "artist") { go && go("artist", s.id); return; }
    if (fam == null) setFilt({ fam: s.fam, sub: null });        // family → its subgenres
    else { setFilt({ fam, sub: s.sub }); setView("artist"); }   // subgenre → its bands (+ scope the map)
  };
  const famName = fam != null ? (R.FAMILIES.find(f => f.i === fam) || {}).family : null;
  const hasFlow = artists.filter(a => a.yp).length >= 2 && series.length >= 1;
  const hint = view === "artist" ? "the bands behind this slice · click one to open"
    : fam == null ? "click a genre to drill into its subgenres" : "click a subgenre to see its bands";

  return (
    <div className="r-card" style={{ padding: "13px 16px 11px", background: "var(--bg-2)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
        <div className="r-mono" style={{ fontSize: 11, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 2, flex: 1, minWidth: 0 }}>
          <span style={{ cursor: "pointer", color: fam == null ? "var(--ink)" : "var(--accent)" }} onClick={() => { setFilt({ fam: null, sub: null }); setView("genre"); }}>all genres</span>
          {fam != null && <><span style={{ margin: "0 7px", color: "var(--ink-faint)" }}>›</span><span style={{ cursor: "pointer", color: sub == null && view === "genre" ? "var(--ink)" : "var(--accent)" }} onClick={() => { setFilt({ fam, sub: null }); setView("genre"); }}>{famName}</span></>}
          {sub != null && <><span style={{ margin: "0 7px", color: "var(--ink-faint)" }}>›</span><span style={{ cursor: "pointer", color: view === "genre" ? "var(--ink)" : "var(--accent)" }} onClick={() => setView("genre")}>{R.SUBS[sub].name}</span></>}
        </div>
        <div className="r-seg r-seg-sm">
          {[["genre", fam != null ? "subgenres" : "genres"], ["artist", "bands"]].map(([k, lbl]) =>
            <button key={k} data-on={view === k} onClick={() => setView(k)}>{lbl}</button>)}
        </div>
      </div>
      {hasFlow
        ? <StreamGraph series={series} years={years} hi={hi} setHi={setHi} onPick={onPick} clickable={true} markYi={markYi} fixedH={FLOW_H} />
        : <div style={{ padding: 18, minHeight: 224, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-faint)", fontFamily: "var(--mono)", fontSize: 11 }}>not enough placed artists here for a flow.</div>}
      {hasFlow && <>
        {/* fixed-height legend well (scrolls if crowded) — fewer series can't shrink the
            whole map/flow row anymore (Fuad 2026-07-05) */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 12px", marginTop: 8, height: 46, overflowY: "auto",
          alignContent: "flex-start", scrollbarWidth: "thin" }}>
          {series.map((s, i) => (
            <div key={s.key} onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(-1)} onClick={() => onPick(s)}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", opacity: hi < 0 || hi === i ? 1 : 0.4, transition: ".15s" }}>
              <span style={{ width: 9, height: 9, borderRadius: 2, background: `oklch(0.62 0.16 ${s.hue})` }} />
              <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>{s.name.length > 22 ? s.name.slice(0, 20) + "…" : s.name}</span>
            </div>
          ))}
        </div>
        <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", marginTop: 7 }}>{hint}</div>
      </>}
    </div>
  );
}

function MapView({ go, embedded, extYear, calPeriod, onStats, calSlot, statSlot, initFilter, onFilter }) {
  const R = window.ROTATION;
  const G = R.INSIGHTS.GEOGRAPHY;
  const cityPts = G.cityPoints || [];
  const geoYears = G.geoYears || [];
  const FAMHUE = React.useMemo(() => { const m = {}; R.FAMILIES.forEach(f => m[f.i] = f.hue); return m; }, [R]);
  const _if = initFilter || {};   // seeded from the Overview hash (genre + mode); place-select is transient

  const [world, setWorld] = React.useState(window.ROTATION_WORLD || null);
  const [mode, setMode] = React.useState(_if.mode || "country");   // countries are the default lens (Fuad, 2026-07-16)
  const [colorBy, setColorBy] = React.useState("dominant"); // dominant | top
  const [focus, setFocus] = React.useState(null);
  const [yearIdx, setYearIdx] = React.useState(null);       // null = all-time
  // the Overview calendar rail scrubs the map's year from outside
  React.useEffect(() => {
    if (extYear == null) return;
    const i = geoYears.indexOf(extYear);
    if (i >= 0) setYearIdx(i);
  }, [extYear]);
  const [playing, setPlaying] = React.useState(false);
  const [hi, setHi] = React.useState(null);
  const [sel, setSel] = React.useState(null);
  const [pane, setPane] = React.useState("artists");
  const [filt, setFilt] = React.useState(_if.filt || { fam: null, sub: null }); // genre pivot: size every place by this genre
  // report the serializable filter (genre + mode) up so the Overview can put it in the URL
  React.useEffect(() => { if (onFilter) onFilter({ mode, filt }); }, [mode, filt]);
  const [limit, setLimit] = React.useState(() => {
    try { const v = parseInt(localStorage.getItem("rot-ov-results-n"), 10); if (v === 10 || v === 25 || v === 50) return v; } catch (e) {}
    return embedded ? 10 : 10;
  });
  const setLimitPersist = (v) => { setLimit(v); try { localStorage.setItem("rot-ov-results-n", String(v)); } catch (e) {} };
  const [disp, setDisp] = React.useState("list"); // results display for artists: list ⇄ cover grid
  // albums + songs list/grid toggle, persisted separately
  const [resView, setResView] = React.useState(() => {
    try { const v = localStorage.getItem("rot-ov-results-view"); if (v === "grid" || v === "list") return v; } catch (e) {}
    return "list";
  });
  const setResViewPersist = (v) => { setResView(v); try { localStorage.setItem("rot-ov-results-view", v); } catch (e) {} };
  const [adetail, setADetail] = React.useState(window.ROTATION_ADETAIL || null); // lazy tracks/albums for the long tail
  // song→album cover lookup: if ROTATION_MEDIA is already loaded, build a title+artist keyed map
  // so each song row can show its album cover instead of the artist/generative cover. Falls back
  // to artist art when the media-index isn't loaded or the track isn't found in it.
  // media index loaded here explicitly (covers were hit-or-miss before) + an ALBUM cover map —
  // album tiles had no cover source at all (Fuad 2026-07-14)
  const [mediaReady2, setMediaReady2] = React.useState(!!window.ROTATION_MEDIA);
  React.useEffect(() => {
    if (window.ROTATION_MEDIA) return;
    let sM = document.getElementById("media-index-js");
    if (!sM) { sM = document.createElement("script"); sM.id = "media-index-js"; sM.src = "media-index.js"; sM.onerror = () => {}; document.head.appendChild(sM); }
    sM.addEventListener("load", () => setMediaReady2(true));
  }, []);
  const songAlbumCover = React.useMemo(() => {
    const M = window.ROTATION_MEDIA; if (!M || !M.tracks || !M.albums || !M.artists) return {};
    const out = {};
    for (const t of M.tracks) {
      const cover = M.albums[t[3]] && M.albums[t[3]][6];
      if (cover) out[t[0] + "\x00" + M.artists[t[1]]] = cover;
    }
    return out;
  }, [adetail, mediaReady2]);
  const albumCoverMap2 = React.useMemo(() => {
    const M = window.ROTATION_MEDIA; if (!M || !M.albums || !M.artists) return {};
    const out = {};
    for (const al of M.albums) if (al[6]) out[al[0] + "\x00" + M.artists[al[1]]] = al[6];
    return out;
  }, [adetail, mediaReady2]);
  const [view, setView] = React.useState({ s: 1, x: 0, y: 0 });
  const svgRef = React.useRef(null);
  const gRef = React.useRef(null);
  const viewRef = React.useRef(view);   // live view during a gesture (avoids a React re-render per frame)
  const drag = React.useRef(null);
  const ptrs = React.useRef(new Map());
  const pinch = React.useRef(null);
  const moved = React.useRef(false);
  React.useEffect(() => { viewRef.current = view; }, [view]);
  // Pan/zoom by writing the <g> transform directly each frame — re-rendering the whole map (land +
  // bubbles) on every pointermove crashes mobile browsers (GPU/memory). We commit to React state once
  // on gesture end so bubble sizes (r/√s) and stroke widths re-derive.
  const applyView = (v) => { viewRef.current = v; const g = gRef.current; if (g) g.setAttribute("transform", `translate(${v.x} ${v.y}) scale(${v.s})`); };
  const commitView = () => { if (moved.current) setView(viewRef.current); };

  // ── cursor FISHEYE ─────────────────────────────────────────────────────────
  // Subtle proximity enlargement of the nearest bubbles, mirroring TourMap's useTourMapNav in
  // rotation-views3.jsx (~L2160, the canonical copy): pointermove → rAF → for each bubble compute
  // an eased k in [1, FISH_MAXK] within ~R_PX screen px, write the r attribute from the UNSCALED
  // base (data-r0). Each bubble's on-screen radius already = r0 / s^0.8, so the fisheye writes
  // r = (r0 / s^0.8) * k — growth stays constant on screen at any zoom. Paused during any pan/pinch
  // gesture (drag/pinch/ptrs) so it never fights the transform write. No hover readout (that stays
  // the existing hb text above the map). Reads live viewRef so it survives mid-gesture.
  const fishRaf = React.useRef(0);
const mpRadExp = (s) => 0.8 + 0.15 * Math.min(1, (s - 1) / 5);   // bubbles shrink further when deep-zoomed (Fuad 2026-07-12)
  const FISH_R_PX = 45, FISH_MAXK = 1.22;
  // Two transition modes for the bubbles (Fuad 2026-07-15 — the size/colour morphs stopped firing
  // after the first hover because reset left transition="" forever): IDLE animates r on a data
  // change (year scrub / mode); FISH turns r off so the cursor fisheye drives r per frame without
  // lag. fishOn flips them ONCE per engage/reset instead of every frame.
  const FISH_TR = "fill .5s, fill-opacity .12s";
  const IDLE_TR = "r .6s cubic-bezier(.3,.8,.3,1), fill .5s, fill-opacity .12s";
  const fishOn = React.useRef(false);
  const resetFisheye = () => { const el = svgRef.current; if (!el) return; const s = viewRef.current.s; for (const c of el.querySelectorAll(".mp-bub")) { const r0 = +c.dataset.r0; if (r0) { c.style.transition = IDLE_TR; c.setAttribute("r", (r0 / Math.pow(s, mpRadExp(s))).toFixed(3)); } } fishOn.current = false; };
  const runFisheye = (cx, cy) => {
    const el = svgRef.current; if (!el) return;
    // never during a gesture (pan/pinch) — the transform write owns the frame then
    if (drag.current || pinch.current || ptrs.current.size > 0) return;
    if (fishRaf.current) return;
    fishRaf.current = requestAnimationFrame(() => {
      fishRaf.current = 0;
      const rect = el.getBoundingClientRect(); if (!rect.width || !rect.height) return;
      if (cx < rect.left || cx > rect.right || cy < rect.top || cy > rect.bottom) { resetFisheye(); return; }
      const v = viewRef.current;
      // client px → svg viewBox units → model (pre-transform) units the data-cx/cy live in
      const sx = (cx - rect.left) / rect.width * W, sy = (cy - rect.top) / rect.height * Hh;
      const mvx = (sx - v.x) / v.s, mvy = (sy - v.y) / v.s;
      // fisheye radius: FISH_R_PX screen px → viewBox units (W/rect.width) → model units (÷s)
      const rr = FISH_R_PX * (W / rect.width) / v.s;
      const inv = 1 / rr, sk = 1 / Math.pow(v.s, mpRadExp(v.s));
      const bubs = el.querySelectorAll(".mp-bub");
      if (!fishOn.current) { for (const c of bubs) c.style.transition = FISH_TR; fishOn.current = true; }  // r off while the fisheye drives
      for (const c of bubs) {
        const bx = +c.dataset.cx, by = +c.dataset.cy, r0 = +c.dataset.r0;
        if (!r0) continue;
        const dnorm = Math.hypot((bx - mvx) * inv, (by - mvy) * inv);   // 0 at cursor, 1 at edge
        const k = dnorm >= 1 ? 1 : 1 + (FISH_MAXK - 1) * (1 - dnorm) * (1 - dnorm);
        c.setAttribute("r", (r0 * sk * k).toFixed(3));
      }
    });
  };
  React.useEffect(() => () => { if (fishRaf.current) cancelAnimationFrame(fishRaf.current); }, []);

  React.useEffect(() => {
    if (window.ROTATION_WORLD) { setWorld(window.ROTATION_WORLD); return; }
    let s = document.getElementById("rotation-world-js");
    if (!s) { s = document.createElement("script"); s.id = "rotation-world-js"; s.src = "world-map.js"; document.head.appendChild(s); }
    const on = () => setWorld(window.ROTATION_WORLD);
    s.addEventListener("load", on);
    return () => s.removeEventListener("load", on);
  }, []);
  const ensureADetail = () => {   // long-tail tracks/albums, so the results work without picking a place
    if (window.ROTATION_ADETAIL) { setADetail(window.ROTATION_ADETAIL); return; }
    let s = document.getElementById("rotation-adetail-js");
    if (!s) { s = document.createElement("script"); s.id = "rotation-adetail-js"; s.src = "artist-detail.js"; document.head.appendChild(s); s.addEventListener("load", () => setADetail(window.ROTATION_ADETAIL)); }
  };
  React.useEffect(() => { ensureADetail(); }, []);
  const avg = React.useMemo(() => { const ks = ["energy", "valence", "acoustic", "tempo", "dance", "instr"]; return ks.map(k => R.ARTISTS.reduce((s, x) => s + x.audio[k], 0) / R.ARTISTS.length); }, []);
  React.useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setYearIdx(i => { const n = (i == null ? 0 : i + 1); if (n >= geoYears.length) { setPlaying(false); return geoYears.length - 1; } return n; }), 1100);
    return () => clearInterval(t);
  }, [playing, geoYears]);
  const W = world ? world.w : 1000, Hh = world ? world.h : 500;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const toSvg = (cx, cy) => { const el = svgRef.current; if (!el) return [W / 2, Hh / 2]; const r = el.getBoundingClientRect(); if (!r.width || !r.height) return [W / 2, Hh / 2]; return [(cx - r.left) / r.width * W, (cy - r.top) / r.height * Hh]; };
  React.useEffect(() => {
    const el = svgRef.current; if (!el) return;
    const onWheel = (e) => { e.preventDefault(); setViewAnim(false); const [sx, sy] = toSvg(e.clientX, e.clientY); setView(v => { const ns = clamp(v.s * (e.deltaY < 0 ? 1.15 : 1 / 1.15), 1, 14); return { s: ns, x: sx - (sx - v.x) / v.s * ns, y: sy - (sy - v.y) / v.s * ns }; }); };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [world]);
  const onDown = (e) => {
    setViewAnim(false);   // dragging must be instant, not eased
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved.current = false;
    if (ptrs.current.size === 1) drag.current = { x: e.clientX, y: e.clientY, vx: viewRef.current.x, vy: viewRef.current.y }; // mouse, or one finger when zoomed
  };
  // grab the pointer once a real drag/pinch starts (not on a tap — that would steal the bubble's click);
  // capture keeps moves flowing and suppresses pointerleave once the gesture crosses the map's edge
  const capture = (e) => { if (!moved.current) { try { e.currentTarget.setPointerCapture(e.pointerId); } catch (x) {} } };
  const onMove = (e) => {
    if (ptrs.current.has(e.pointerId)) ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...ptrs.current.values()];
    if (pts.length >= 2) {                    // two-finger pinch-zoom (one finger still scrolls the page)
      e.preventDefault(); capture(e); moved.current = true;
      const [a, b] = pts, dist = Math.hypot(a.x - b.x, a.y - b.y), mx2 = (a.x + b.x) / 2, my2 = (a.y + b.y) / 2;
      if (pinch.current) { const [sx, sy] = toSvg(mx2, my2), ratio = dist / pinch.current; const v = viewRef.current; const ns = clamp(v.s * ratio, 1, 14); applyView({ s: ns, x: sx - (sx - v.x) / v.s * ns, y: sy - (sy - v.y) / v.s * ns }); }
      pinch.current = dist; drag.current = null; return;
    }
    pinch.current = null;
    // mouse pans always; a single finger pans only when zoomed in (otherwise the page scrolls)
    if (drag.current && (e.pointerType === "mouse" || viewRef.current.s > 1)) {
      const el = svgRef.current; if (!el) return;
      if (e.pointerType !== "mouse" && e.cancelable) e.preventDefault();
      const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
      const dx = (e.clientX - drag.current.x) / r.width * W, dy = (e.clientY - drag.current.y) / r.height * Hh;
      if (Math.abs(dx) + Math.abs(dy) > 3) { capture(e); moved.current = true; }
      applyView({ s: viewRef.current.s, x: drag.current.vx + dx, y: drag.current.vy + dy });
      return;
    }
    // no active gesture → the cursor fisheye owns the move (mouse only; touch has no hover)
    if (e.pointerType === "mouse") runFisheye(e.clientX, e.clientY);
  };
  const onUp = (e) => { if (e && e.pointerId != null) ptrs.current.delete(e.pointerId); if (ptrs.current.size < 2) pinch.current = null; if (ptrs.current.size === 0) { drag.current = null; commitView(); } };
  // only clear hover on leave — never drop an active drag/pinch (pointer capture keeps the gesture
  // alive past the edge; the window pointerup/cancel handler below does the real cleanup on release)
  const onLeave = () => { setHi(null); resetFisheye(); };
  // a gesture can end off the map (finger/mouse released outside its bounds) — clear drag state globally
  React.useEffect(() => {
    const up = (e) => { if (e && e.pointerId != null) ptrs.current.delete(e.pointerId); if (ptrs.current.size < 2) pinch.current = null; if (ptrs.current.size === 0) { drag.current = null; commitView(); } };
    window.addEventListener("pointerup", up); window.addEventListener("pointercancel", up);
    return () => { window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up); };
  }, []);
  // smooth the <g> transform for PROGRAMMATIC zooms (fly into a clicked country, zoom back out on
  // deactivate) but keep it OFF during interactive pan/wheel so those stay instant (Fuad 2026-07-15).
  const setViewAnim = (on) => { const g = gRef.current; if (g) g.style.transition = on ? "transform .6s cubic-bezier(.3,.8,.3,1)" : "none"; };
  const frame = (bb) => { if (!bb) return; const [x0, y0, x1, y1] = bb, bw = Math.max(8, x1 - x0), bh = Math.max(8, y1 - y0), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2; const s = clamp(Math.min(W / (bw * 1.6), Hh / (bh * 1.6)), 1, 12); setViewAnim(true); setView({ s, x: W / 2 - cx * s, y: Hh / 2 - cy * s }); };
  const reset = () => { setFocus(null); setSel(null); setViewAnim(true); setView({ s: 1, x: 0, y: 0 }); };

  // genre pivot — sum every place's plays for the selected family/subgenre (membership-based, like Explore).
  // year-aware: when a year is active we sum that year's plays (a.yp) so genre × year combine.
  const matchGenre = (a) => filt.sub != null ? a.s.includes(filt.sub) : a.s.some(si => R.SUBS[si] && R.SUBS[si].fam === filt.fam);
  const filtSums = React.useMemo(() => {
    if (filt.sub == null && filt.fam == null) return null;
    const yr = yearIdx != null ? geoYears[yearIdx] : null;
    const country = {}, city = {};
    for (const a of R.EXPLORE) {
      if (!matchGenre(a)) continue;
      const w = yr != null ? (a.yp ? (a.yp[yr] || 0) : 0) : a.plays;
      if (!w) continue;
      if (a.co) country[a.co] = (country[a.co] || 0) + w;
      if (a.co && a.ci) { const k = a.co + "|" + a.ci; city[k] = (city[k] || 0) + w; }
    }
    return { country, city };
  }, [filt, yearIdx, R]);
  const gval = (c) => !filtSums ? 0 : (c.code ? filtSums.country[c.code] : filtSums.city[c.country + "|" + c.city]) || 0;
  const sizeOf = (c) => filtSums ? gval(c) : (yearIdx != null ? (c.yr ? c.yr[yearIdx] : 0) : c.plays);
  // the flow rescopes to the selected place (or the whole world); the results list is the place ∩ genre ∩ year set.
  // When a calendar period is active, the flow narrows to THAT period's top artists (calendar-detail
  // keeps 5-6 per day/week — thin, but honest: "the journey of what you played that day").
  const flowArtists = React.useMemo(() => {
    if (calPeriod && window.ROTATION_CAL_DETAIL) {
      const CD = window.ROTATION_CAL_DETAIL, P = CD[calPeriod.gran] && CD[calPeriod.gran][calPeriod.key];
      if (P && P.a && P.a.length) {
        const byIdSet = [];
        for (const [ni] of P.a) {
          const name = CD.names[ni]; const id = (R.idForName && R.idForName(name)) || R.slug(name);
          const rec = R.EXPLORE.find(a => a.id === id);
          if (rec) byIdSet.push(rec);
        }
        if (byIdSet.length >= 2) return byIdSet;
      }
    }
    if (!sel) return R.EXPLORE;
    if (sel.kind === "country") return R.EXPLORE.filter(a => a.co === sel.key);
    const [iso, city] = sel.key.split("|"); return R.EXPLORE.filter(a => a.co === iso && a.ci === city);
  }, [sel, R, calPeriod]);
  const filteredArtists = React.useMemo(() => {
    let set = flowArtists;
    if (filt.fam != null || filt.sub != null) set = set.filter(matchGenre);
    return set;
  }, [flowArtists, filt]);
  // calendar-rail period override: when a day/week is picked, results come from calendar-detail
  // (top artists/albums/songs for that exact period) instead of the geography slice.
  const periodData = React.useMemo(() => {
    if (!calPeriod || !window.ROTATION_CAL_DETAIL) return null;
    const CD = window.ROTATION_CAL_DETAIL, P = CD[calPeriod.gran] && CD[calPeriod.gran][calPeriod.key];
    if (!P) return null;
    const NM = CD.names;
    const arts = (P.a || []).map(([ni, p]) => { const name = NM[ni]; const id = (R.idForName && R.idForName(name)) || R.slug(name); const rec = R.byId[id] || (R.expById && R.expById[id]); return { a: { id, name, hue: rec ? rec.hue : 210 }, p }; });
    const albums = (P.al || []).map(([ti, ai, p]) => { const artist = NM[ai]; const id = (R.idForName && R.idForName(artist)) || R.slug(artist); return { title: NM[ti], artist, aid: id, plays: p }; });
    const songs = (P.s || []).map(([ti, ai, p]) => { const artist = NM[ai]; const id = (R.idForName && R.idForName(artist)) || R.slug(artist); return { title: NM[ti], artist, aid: id, plays: p }; });
    return { arts, albums, songs, label: calPeriod.key + (calPeriod.gran === "week" ? " (week)" : "") };
  }, [calPeriod, R]);
  const resultArtists = React.useMemo(() => {
    if (periodData) return periodData.arts;
    const yr = yearIdx != null ? geoYears[yearIdx] : null;
    return filteredArtists.map(a => ({ a, p: yr != null ? (a.yp ? (a.yp[yr] || 0) : 0) : a.plays }))
      .filter(e => e.p > 0).sort((x, y) => y.p - x.p).slice(0, 25);
  }, [filteredArtists, yearIdx, periodData]);
  // albums/songs aggregated from each filtered artist's own top lists (kept records + lazy detail) —
  // so the results work without picking a place. all-time (per-artist lists aren't year-split).
  const resultMedia = React.useMemo(() => {
    if (periodData) return { albums: periodData.albums, songs: periodData.songs };
    const set = filteredArtists.slice().sort((a, b) => b.plays - a.plays).slice(0, 160);
    const albums = [], songs = [];
    for (const a of set) {
      const kept = R.byId[a.id];
      if (kept) {
        for (const t of (kept.topAlbums || [])) albums.push({ title: t.title, artist: a.name, aid: a.id, plays: t.plays });
        for (const t of (kept.topTracks || [])) songs.push({ title: t.title, artist: a.name, aid: a.id, plays: t.plays });
      } else if (adetail && adetail.d[a.id]) {
        const rec = adetail.d[a.id], NMx = adetail.names;
        for (const [ti, p] of (rec.al || [])) albums.push({ title: NMx[ti], artist: a.name, aid: a.id, plays: p });
        for (const [ti, p] of (rec.t || [])) songs.push({ title: NMx[ti], artist: a.name, aid: a.id, plays: p });
      }
    }
    albums.sort((x, y) => y.plays - x.plays); songs.sort((x, y) => y.plays - x.plays);
    return { albums, songs };
  }, [filteredArtists, adetail, periodData]);
  const resultDNA = React.useMemo(() => {
    const yr = yearIdx != null ? geoYears[yearIdx] : null;
    const acc = [0, 0, 0, 0, 0, 0]; let w = 0;
    for (const a of filteredArtists) { const af = R.AUDIO[a.id]; if (!af) continue; const ww = yr != null ? (a.yp ? (a.yp[yr] || 0) : 0) : a.plays; if (!ww) continue; for (let k = 0; k < 6; k++) acc[k] += af[k] * ww; w += ww; }
    return w ? acc.map(x => x / w) : null;
  }, [filteredArtists, yearIdx]);
  // report the current filtered totals so the Overview stat strip (hours / distinct artists)
  // reflects whatever slice is active. period > place/genre/year > lifetime.
  React.useEffect(() => {
    if (!onStats) return;
    const active = !!(sel || focus || filt.fam != null || filt.sub != null || yearIdx != null || periodData);
    if (!active) { onStats(null); return; }
    const avgSec = (R.TOTALS && R.TOTALS.avgTrackSec) || 216;
    // `slice` = a place/genre filter is active (not just a year/period). The Overview stat strip uses
    // it to decide whether to size avg/day from this (EXPLORE-scoped) count or from the exact day-series
    // total (which is right for a pure time filter). periodData is a time filter → slice:false.
    if (periodData) { const plays = periodData.arts.reduce((s, e) => s + e.p, 0); onStats({ active: true, slice: false, plays, artists: periodData.arts.length, hours: Math.round(plays * avgSec / 3600), label: periodData.label }); return; }
    const yr = yearIdx != null ? geoYears[yearIdx] : null;
    let plays = 0, artists = 0;
    for (const a of filteredArtists) { const p = yr != null ? (a.yp ? (a.yp[yr] || 0) : 0) : a.plays; if (p > 0) { plays += p; artists++; } }
    const slice = !!(sel || focus || filt.fam != null || filt.sub != null);
    onStats({ active: true, slice, plays, artists, hours: Math.round(plays * avgSec / 3600), label: [sel ? selName : null, filt.sub != null ? R.SUBS[filt.sub].name : filt.fam != null ? R.FAMILIES[filt.fam].family : null, yr].filter(Boolean).join(" · ") || "filtered" });
  }, [filteredArtists, yearIdx, periodData, sel, focus, filt, onStats]);
  // calendar-period → the places its top artists come from. calendar-detail only stores the
  // top 5-6 artists per day/week, so a full dot re-weight would be dishonest — instead we
  // RING those artists' origins and dim the rest ("where that day's music came from").
  const periodPlaces = React.useMemo(() => {
    if (!periodData) return null;
    const cc = new Set(), ci = new Set();
    for (const e of periodData.arts) {
      const rec = R.byId[e.a.id] || (R.expById && R.expById[e.a.id]);
      const co = rec && (rec.co || (rec.origin && rec.origin.country));
      const cty = rec && (rec.ci || (rec.origin && rec.origin.city));
      if (co) { cc.add(co); if (cty) ci.add(co + "|" + cty); }
    }
    return cc.size ? { cc, ci } : null;
  }, [periodData, R]);
  // only plot country bubbles that actually have artists in EXPLORE — else a country whose only
  // artists fall below the EXPLORE cutoff (e.g. Jamaica/Morocco with a single low-play act) shows a
  // bubble that clicks through to an empty Results list (Fuad 2026-07-15).
  const exploreCC = React.useMemo(() => new Set((R.EXPLORE || []).map(a => a.co).filter(Boolean)), [R]);
  const bubbles = React.useMemo(() => {
    if (!world) return [];
    const proj = (c) => [(c.lng + 180) / 360 * world.w, (90 - c.lat) / 180 * world.h];
    let set, kind, base, scale, project;
    if (focus) { set = cityPts.filter(c => c.country === focus); kind = "city"; base = 2; scale = 16; project = proj; }
    else if (mode === "city") { set = cityPts; kind = "city"; base = 2.5; scale = 24; project = proj; }
    else { const C = world.centroids; set = G.countries.filter(c => C[c.code] && exploreCC.has(c.code)); kind = "country"; base = 4; scale = 28; project = (c) => C[c.code]; }
    const mx = Math.max(1, ...set.map(sizeOf));
    return set.map((c, i) => { const [x, y] = project(c); const sv = sizeOf(c); const r = ((yearIdx != null || filtSums) && sv === 0) ? 0 : base + Math.sqrt(sv / mx) * scale; return { key: kind === "country" ? c.code : "c" + i, kind, x, y, r, c }; });
  }, [world, mode, focus, yearIdx, filtSums, R]);

  // metrics you can colour the map by — measured audio dims + a few derived place metrics.
  // each returns a 0-1 normalised value per place → a cool→warm temperature hue.
  const METRICS = {
    energy: { kind: "audio", idx: 0, lo: "low", hi: "high", label: "energy" },
    valence: { kind: "audio", idx: 1, lo: "dark", hi: "bright", label: "mood" },
    acoustic: { kind: "audio", idx: 2, lo: "electric", hi: "acoustic", label: "acousticness" },
    dance: { kind: "audio", idx: 4, lo: "still", hi: "danceable", label: "danceability" },
    instr: { kind: "audio", idx: 5, lo: "vocal", hi: "instr.", label: "instrumentalness" },
    tempo: { kind: "audio", idx: 3, lo: "slow", hi: "fast", label: "tempo (bpm)" },
    major: { kind: "audio", idx: 6, lo: "minor", hi: "major", label: "major-key" },
    loud: { kind: "audio", idx: 9, xf: (v) => clamp((v + 60) / 60, 0, 1), lo: "quiet", hi: "loud", label: "loudness" },
    speech: { kind: "audio", idx: 10, lo: "sung", hi: "spoken", label: "speechiness" },
    live: { kind: "audio", idx: 11, lo: "studio", hi: "live", label: "liveness" },
    pop: { kind: "audio", idx: 7, xf: (v) => v / 100, lo: "obscure", hi: "mainstream", label: "popularity" },
    followers: { kind: "audio", idx: 8, xf: (v) => clamp(Math.log10(v + 1) / 7, 0, 1), lo: "cult", hi: "famous", label: "followers" },
    vintage: { kind: "debut", lo: "classic", hi: "recent", label: "vintage (debut yr)" },
    diversity: { kind: "diversity", lo: "focused", hi: "eclectic", label: "diversity" },
    depth: { kind: "depth", lo: "wide", hi: "deep", label: "depth (plays/artist)" },
  };
  const placeMetric = React.useMemo(() => {
    const M = METRICS[colorBy]; if (!M) return null;
    let C = {}, Ci = {};
    if (M.kind === "audio" || M.kind === "debut") {
      const cc = {}, cic = {}, acc = (m, k, v, w) => { if (!m[k]) m[k] = [0, 0]; m[k][0] += v * w; m[k][1] += w; };
      for (const a of R.EXPLORE) {
        let v; if (M.kind === "audio") { const af = R.AUDIO[a.id]; if (!af) continue; v = M.xf ? M.xf(af[M.idx]) : af[M.idx]; } else { if (!a.d) continue; v = a.d; }
        const w = a.plays; if (a.co) acc(cc, a.co, v, w); if (a.co && a.ci) acc(cic, a.co + "|" + a.ci, v, w);
      }
      const red = (m) => { const o = {}; for (const k in m) o[k] = m[k][1] ? m[k][0] / m[k][1] : null; return o; };
      C = red(cc); Ci = red(cic);
      if (M.kind === "debut") { const all = [...Object.values(C), ...Object.values(Ci)].filter(x => x != null); const lo = Math.min(...all), hi = Math.max(...all); const nz = (x) => x == null ? null : (hi > lo ? (x - lo) / (hi - lo) : 0.5); for (const k in C) C[k] = nz(C[k]); for (const k in Ci) Ci[k] = nz(Ci[k]); }
    } else if (M.kind === "diversity") {
      const cs = {}, cis = {};
      for (const a of R.EXPLORE) { if (a.co) { (cs[a.co] = cs[a.co] || new Set()); a.s.forEach(si => cs[a.co].add(si)); } if (a.co && a.ci) { const k = a.co + "|" + a.ci; (cis[k] = cis[k] || new Set()); a.s.forEach(si => cis[k].add(si)); } }
      for (const k in cs) C[k] = cs[k].size; for (const k in cis) Ci[k] = cis[k].size;
      const mx = Math.max(1, ...Object.values(C), ...Object.values(Ci)); for (const k in C) C[k] /= mx; for (const k in Ci) Ci[k] /= mx;
    } else if (M.kind === "depth") {
      for (const c of G.countries) if (c.artists) C[c.code] = c.plays / c.artists;
      for (const c of cityPts) if (c.artists) Ci[c.country + "|" + c.city] = c.plays / c.artists;
      const mx = Math.max(1, ...Object.values(C), ...Object.values(Ci)); for (const k in C) C[k] /= mx; for (const k in Ci) Ci[k] /= mx;
    }
    return { country: C, city: Ci, lo: M.lo, hi: M.hi };
  }, [colorBy, R]);
  const placeHue = (c) => {
    if (placeMetric) { const e = c.code ? placeMetric.country[c.code] : placeMetric.city[c.country + "|" + c.city]; if (e == null) return "var(--bg-3)"; return `oklch(0.66 0.15 ${(250 - e * 230).toFixed(0)})`; }
    if (filtSums) { const fi = filt.sub != null ? (R.SUBS[filt.sub] && R.SUBS[filt.sub].fam) : filt.fam; return (fi != null && FAMHUE[fi] != null) ? `oklch(0.63 0.17 ${FAMHUE[fi]})` : "var(--accent)"; }
    let fi; if (yearIdx != null) fi = c.yf ? c.yf[yearIdx] : -1; else fi = colorBy === "top" ? c.tf : c.df; return (fi >= 0 && FAMHUE[fi] != null) ? `oklch(0.63 0.17 ${FAMHUE[fi]})` : "var(--accent)";
  };
  const openBubble = (b) => {
    // clicking the already-selected place again DEACTIVATES it and zooms back out to the world
    // (Fuad 2026-07-15 — needs an obvious way out, and the zoom should reverse).
    if (b.kind === "city" && sel && sel.kind === "city" && sel.key === b.c.country + "|" + b.c.city) { reset(); return; }
    if (b.kind === "country") {
      if (sel && sel.kind === "country" && sel.key === b.c.code) { reset(); return; }   // click again → zoom out
      setFocus(b.c.code); frame(world.bbox[b.c.code]); setSel({ kind: "country", key: b.c.code });
    }
    else setSel({ kind: "city", key: b.c.country + "|" + b.c.city });
    setPane("artists");
  };

  const hb = hi != null ? bubbles.find(b => b.key === hi) : null;
  const listBase = focus ? cityPts.filter(c => c.country === focus) : (mode === "city" ? cityPts : G.countries);
  const list = filtSums
    ? listBase.map(t => [t, gval(t)]).filter(e => e[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 19).map(e => e[0])
    : listBase.slice(0, 19);
  const listMax = Math.max(1, ...list.map(t => filtSums ? gval(t) : t.plays));
  const selName = sel ? (sel.kind === "country" ? ((G.countries.find(c => c.code === sel.key) || {}).name || sel.key) : sel.key.split("|")[1]) : "";
  const selFlag = sel ? (sel.kind === "country" ? (G.countries.find(c => c.code === sel.key) || {}).flag : (cityPts.find(c => c.country + "|" + c.city === sel.key) || {}).flag) : "";
  const focusName = focus ? ((G.countries.find(c => c.code === focus) || {}).name || focus) : null;

  if (!world) return (
    <div className={embedded ? "map-embed" : "r-view"}><div className="r-viewhead"><div><div className="r-kicker">Geography</div>{!embedded && <h1 className="r-title">Where it <em>comes from</em><span className="dot">.</span></h1>}</div></div>
      <div style={{ padding: embedded ? 30 : 60, textAlign: "center", color: "var(--ink-faint)", fontFamily: "var(--mono)", fontSize: 12 }}>loading the map…</div></div>
  );

  return (
    <div className={embedded ? "map-embed" : "r-view tv-page"} style={embedded ? undefined : { maxWidth: 1360 }}>
      <div className="r-viewhead" style={embedded ? { marginBottom: 16 } : undefined}>
        <div>
          <div className="r-kicker">Geography · {G.totalCountries} countries · {fmt(cityPts.length)} cities{yearIdx != null ? " · " + geoYears[yearIdx] : ""}</div>
          {embedded
            ? <h2 style={{ fontFamily: "var(--serif)", fontWeight: 400, fontStyle: "italic", fontSize: 26, margin: "4px 0 0" }}>Where it comes from<span className="dot" style={{ color: "var(--accent)" }}>.</span></h2>
            : <h1 className="r-title">Where it <em>comes from</em><span className="dot">.</span></h1>}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          {(sel || focus || filt.fam != null || filt.sub != null) && (
            <button className="mp-clear" onClick={() => { reset(); setFilt({ fam: null, sub: null }); }}>✕ clear filters</button>
          )}
        </div>
      </div>

      {/* colour-by + year controls */}
      <div className="map-ctl">
        <div className="r-seg" title="how the bubbles are coloured">
          <button data-on={colorBy === "dominant" && yearIdx == null && !filtSums} disabled={yearIdx != null || !!filtSums} onClick={() => setColorBy("dominant")}>genre</button>
          <button data-on={colorBy === "top" && yearIdx == null && !filtSums} disabled={yearIdx != null || !!filtSums} onClick={() => setColorBy("top")}>top artist</button>
          <select className="map-soundsel" data-on={!!METRICS[colorBy]} value={METRICS[colorBy] ? colorBy : ""} onChange={(e) => setColorBy(e.target.value || "dominant")} title="colour by a measured dimension">
            <option value="">by sound / metric…</option>
            {Object.keys(METRICS).map(k => <option key={k} value={k}>{METRICS[k].label}</option>)}
          </select>
        </div>
        {!focus && <div className="r-seg" title="countries or cities">
          {[["country", "countries"], ["city", "cities"]].map(([k, l]) => <button key={k} data-on={mode === k} onClick={() => { setMode(k); setHi(null); }}>{l}</button>)}
        </div>}
        <div className="map-years">
          <button className="map-play" data-on={playing} onClick={() => { if (!playing && (yearIdx == null || yearIdx >= geoYears.length - 1)) setYearIdx(0); setPlaying(p => !p); }}>{playing ? "❚❚" : "▶"}</button>
          <input className="map-slider" type="range" min="0" max={geoYears.length} value={yearIdx == null ? 0 : yearIdx + 1}
            onChange={(e) => { setPlaying(false); const v = +e.target.value; setYearIdx(v === 0 ? null : v - 1); }} />
          <span className="map-yrlabel">{yearIdx == null ? "all years" : geoYears[yearIdx]}</span>
        </div>
      </div>

      {/* fixed-height + nowrap so hover text (with its taller flag glyph) can NEVER reflow the map below */}
      <div style={{ fontFamily: "var(--serif)", fontSize: 15, color: "var(--ink-soft)", margin: "10px 0", height: 26, lineHeight: "26px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {focus ? <><span style={{ cursor: "pointer", color: "var(--accent)", fontFamily: "var(--mono)", fontSize: 12 }} onClick={reset}>‹ world</span> &nbsp; cities of <b style={{ color: "var(--ink)" }}>{focusName}</b> — click one for its scene</>
          : hb ? (hb.kind === "city"
            ? <><span style={{ fontSize: 18 }}>{hb.c.flag}</span> <b style={{ color: "var(--ink)" }}>{hb.c.city}</b>, {hb.c.country} — {fmt(yearIdx != null ? sizeOf(hb.c) : hb.c.plays)} plays{yearIdx != null ? " in " + geoYears[yearIdx] : " · " + hb.c.artists + " artists"}</>
            : <><span style={{ fontSize: 18 }}>{hb.c.flag}</span> <b style={{ color: "var(--ink)" }}>{hb.c.name}</b> — {fmt(yearIdx != null ? sizeOf(hb.c) : hb.c.plays)} plays{yearIdx != null ? " in " + geoYears[yearIdx] : " · " + hb.c.artists + " artists"} <span style={{ color: "var(--ink-faint)", fontSize: 12 }}>(click to zoom in)</span></>)
            : filtSums ? <>showing <b style={{ color: "var(--ink)" }}>{filt.sub != null ? R.SUBS[filt.sub].name : R.FAMILIES[filt.fam].family}</b> across {mode === "city" ? "cities" : "the world"} — bigger means it ran deeper there{list[0] ? <> · led by <b style={{ color: "var(--ink)" }}>{list[0].flag} {list[0].code ? list[0].name : list[0].city}</b></> : null}</>
            : <span style={{ color: "var(--ink-faint)" }}>{mode === "city" ? "every dot a city — hover to read, click for its scene" : "click a country to zoom into its cities · scroll to zoom, drag to pan"}</span>}
      </div>

      <div className="mp-grid">
      <div className="mp-map">
      <div className="r-card" style={{ padding: 0, overflow: "hidden", background: "var(--bg-2)" }}>
        <svg ref={svgRef} viewBox={`0 0 ${world.w} ${world.h}`} style={{ width: "100%", height: "auto", display: "block", cursor: "grab", touchAction: view.s > 1 ? "none" : "pan-y" }}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onPointerLeave={onLeave}>
          <g ref={gRef} transform={`translate(${view.x} ${view.y}) scale(${view.s})`}>
            {world.land.map((d, i) => <path key={i} d={d} fill="var(--bg-3)" stroke="var(--rule-2)" strokeWidth={0.4 / view.s} />)}
            {bubbles.slice().sort((a, b) => b.c.plays - a.c.plays).map(b => {
              const on = hi === b.key, col = placeHue(b.c);
              // calendar-period filter: only the origins of that period's top artists REMAIN
              // on the map (Fuad 2026-07-05 — hiding beats dimming, visually)
              const inPeriod = periodPlaces
                ? (b.kind === "country" ? periodPlaces.cc.has(b.c.code) : periodPlaces.ci.has(b.c.country + "|" + b.c.city))
                : null;
              if (inPeriod === false) return null;
              // data-cx/cy/r0 feed the cursor fisheye (see runFisheye) — r0 is the UNSCALED base
              // radius; the fisheye writes r from it each frame. `r` IS in the CSS transition
              // (the smooth year-morph Fuad missed — 2026-07-14); the fisheye suppresses the
              // transition inline while the cursor is engaged and restores it on reset.
              return <circle key={b.key} className="mp-bub" data-cx={b.x} data-cy={b.y} data-r0={b.r}
                cx={b.x} cy={b.y} r={b.r / Math.pow(view.s, mpRadExp(view.s))} fill={col} fillOpacity={on ? 0.72 : 0.34}
                stroke={inPeriod ? "var(--accent)" : col} strokeWidth={((inPeriod ? 1.8 : on ? 1.6 : 0.7)) / view.s}
                style={{ cursor: "pointer", transition: "r .6s cubic-bezier(.3,.8,.3,1), fill .5s, fill-opacity .12s" }}
                onMouseEnter={() => setHi(b.key)} onClick={(e) => { e.stopPropagation(); if (!moved.current) openBubble(b); }} />;
            })}
          </g>
        </svg>
      </div>

      </div>

      {/* the flow doubles as filter — pick a band to scope the map; picking a place rescopes the flow.
          MapFlow's own interactive legend is THE genre legend (static FAMILIES strip removed, Fuad
          2026-07-04); only the metric gradient shows when colouring by a measured dimension. */}
      <div className="mp-flow" style={{ marginTop: "var(--gap)" }}>
        <MapFlow artists={flowArtists} filt={filt} setFilt={setFilt} years={geoYears} markYi={yearIdx} go={go} />
        {placeMetric && <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 10, alignItems: "center", minHeight: 20 }}>
          <span className="r-mono" style={{ fontSize: 10, color: "var(--ink-faint)" }}>{METRICS[colorBy].label}:</span>
          <span className="r-mono" style={{ fontSize: 10, color: "var(--ink-faint)" }}>{placeMetric.lo}</span>
          <span style={{ width: 130, height: 9, borderRadius: 3, background: "linear-gradient(90deg, oklch(0.66 0.15 250), oklch(0.66 0.15 135), oklch(0.66 0.15 30))" }} />
          <span className="r-mono" style={{ fontSize: 10, color: "var(--ink-faint)" }}>{placeMetric.hi}</span>
        </div>}
      </div>

      {/* breakdown list */}
      <div className="mp-list" style={{ marginTop: "var(--gap)" }}>
        <div className="r-mono" style={{ fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: 10 }}>{focus ? "Cities in " + focusName : mode === "city" ? "Deepest cities" : "Deepest countries"}</div>
        <div style={{ maxHeight: 230, overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px,1fr))", gap: "5px 22px", paddingRight: 4 }}>
          {list.map((t, i) => (
            <div key={(t.code || t.city) + i} className="map-listrow"
              onMouseEnter={() => setHi(t.code ? t.code : "c" + cityPts.filter(c => !focus || c.country === focus).indexOf(t))} onMouseLeave={() => setHi(null)}
              onClick={() => { if (t.code) openBubble({ kind: "country", c: t }); else { setSel({ kind: "city", key: t.country + "|" + t.city }); setPane("artists"); } }}>
              <span style={{ width: 11, height: 11, borderRadius: 3, background: placeHue(t), flex: "none" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.flag} {t.code ? t.name : t.city} <span className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)" }}>· {t.artists}a</span></div>
                <div style={{ height: 4, background: "var(--bg-3)", borderRadius: 3, overflow: "hidden", marginTop: 3 }}><div style={{ height: "100%", width: ((filtSums ? gval(t) : t.plays) / listMax * 100) + "%", background: "var(--accent-dim)", borderRadius: 3 }} /></div>
              </div>
              <span className="r-mono" style={{ fontSize: 10, color: "var(--ink-soft)" }}>{fmtK(filtSums ? gval(t) : t.plays)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* lifetime stat strip (slotted in from Overview) — row 2 centre, under the flow (Fuad
          2026-07-06). hours + distinct artists react to the active filter; the rest are lifetime. */}
      {statSlot && <div className="mp-stats" style={{ marginTop: "var(--gap)" }}>{statSlot}</div>}

      {/* the calendar rail (slotted in from Overview) — row 2 right, under the results; picking a
          day/week swaps the results to that period */}
      {calSlot && <div className="mp-cal" style={{ marginTop: "var(--gap)" }}>{calSlot}</div>}

      {/* results — top artists + albums + songs + DNA for the current place ∩ genre ∩ year (no place needed) */}
      {(() => {
        const gName = filt.sub != null ? R.SUBS[filt.sub].name : filt.fam != null ? R.FAMILIES[filt.fam].family : null;
        const parts = periodData ? ["on " + periodData.label] : [sel ? (selFlag + " " + selName) : "everywhere", gName || "all genres", yearIdx != null ? geoYears[yearIdx] : "all years"];
        const totalPlays = resultArtists.reduce((s, e) => s + e.p, 0);
        return (
          <div className="r-card mp-results" style={{ marginTop: "var(--gap)", padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
              <div style={{ minWidth: 0 }}><div className="r-mono" style={{ fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: 4 }}>{periodData ? "on this " + calPeriod.gran : "results"}</div>
                <div className="mp-restitle" style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 22 }}>{parts.join("  ·  ")}</div></div>
              <div><div className="r-stat-n" style={{ fontSize: 26 }}>{fmt(totalPlays)}</div><div className="r-mono" style={{ fontSize: 8.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ink-faint)" }}>plays</div></div>
            </div>
            <div className="mp-resctl" style={{ display: "flex", alignItems: "center", gap: "8px 10px", flexWrap: "wrap", margin: "16px 0 14px" }}>
              <div className="r-seg">
                {[["artists", "artists"], ["albums", "albums"], ["songs", "songs"], ["dna", "sound dna"]].map(([k, l]) => <button key={k} data-on={pane === k} onClick={() => { setPane(k); if (k === "albums" || k === "songs") ensureADetail(); }}>{l}</button>)}
              </div>
              {pane === "artists" && <div className="r-seg" title="list ⇄ cover grid">
                <button data-on={disp === "list"} onClick={() => setDisp("list")}>list</button>
                <button data-on={disp === "grid"} onClick={() => setDisp("grid")}>grid</button>
              </div>}
              {(pane === "albums" || pane === "songs") && (
                <div className="r-seg cal-view-seg" title="list / grid view">
                  <button data-on={resView === "list"} onClick={() => setResViewPersist("list")} title="list view">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <line x1="4" y1="2" x2="12" y2="2"/><line x1="4" y1="6" x2="12" y2="6"/><line x1="4" y1="10" x2="12" y2="10"/>
                      <rect x="0" y="0.5" width="2.5" height="2.5" rx="0.5"/><rect x="0" y="4.5" width="2.5" height="2.5" rx="0.5"/><rect x="0" y="8.5" width="2.5" height="2.5" rx="0.5"/>
                    </svg>
                  </button>
                  <button data-on={resView === "grid"} onClick={() => setResViewPersist("grid")} title="grid view">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="0" y="0" width="5" height="5" rx="1"/><rect x="7" y="0" width="5" height="5" rx="1"/>
                      <rect x="0" y="7" width="5" height="5" rx="1"/><rect x="7" y="7" width="5" height="5" rx="1"/>
                    </svg>
                  </button>
                </div>
              )}
              {pane !== "dna" && <div className="r-seg map-limseg">
                {[10, 25, 50].map(n => <button key={n} data-on={limit === n} onClick={() => setLimitPersist(n)}>{n}</button>)}
              </div>}
            </div>
            {!periodData && yearIdx != null && (pane === "albums" || pane === "songs") && <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", marginBottom: 8 }}>albums &amp; songs aren't split by year — showing all-time for this slice.</div>}
            <div className="mp-resbody">
            {pane === "artists" && (resultArtists.length
              ? (disp === "grid"
                ? <div className="mp-covergrid">{resultArtists.slice(0, limit).map((e, i) => { const a = e.a, kept = !!R.byId[a.id] || !!(R.expById && R.expById[a.id]); return (
                    <div key={a.id} className="mp-coveritem" data-link={kept} onClick={() => kept && go("artist", a.id)}>
                      <div style={{ position: "relative" }}><GenCover hue={a.hue || 210} name={a.name} size={"100%"} style={{ aspectRatio: "1", width: "100%", height: "auto" }} radius={4} />
                        <span className="r-mono" style={{ position: "absolute", top: 4, left: 5, fontSize: 8.5, color: "rgba(255,255,255,.85)", textShadow: "0 1px 2px #000" }}>{String(i + 1).padStart(2, "0")}</span></div>
                      <div className="mp-covernm">{a.name}</div><div className="r-mono" style={{ fontSize: 8.5, color: "var(--ink-faint)" }}>{fmt(e.p)}</div></div>); })}</div>
                : <div className="cal-rows">{resultArtists.slice(0, limit).map((e, i) => { const a = e.a, kept = !!R.byId[a.id] || !!(R.expById && R.expById[a.id]); return (
                    <div key={a.id} className="cal-row" data-link={kept} onClick={() => kept && go("artist", a.id)}>
                      <span className="cal-rk">{String(i + 1).padStart(2, "0")}</span><GenCover hue={a.hue || 210} name={a.name} size={34} radius={3} />
                      <span className="cal-nm">{a.name}</span><span className="cal-pl">{fmt(e.p)}</span></div>); })}</div>)
              : <div style={{ color: "var(--ink-soft)" }}>Nothing matches this filter.</div>)}
            {(pane === "albums" || pane === "songs") && (() => {
              const isSongs = pane === "songs";
              const rows = isSongs ? resultMedia.songs : resultMedia.albums;
              if (!rows.length) return <div style={{ color: "var(--ink-soft)", fontFamily: "var(--mono)", fontSize: 12 }}>{adetail ? "Nothing here." : "loading…"}</div>;
              const shown = rows.slice(0, limit);
              if (resView === "grid") return (
                <div className="mp-medgrid">{shown.map((r, i) => {
                  const hue = (R.byId[r.aid] || {}).hue || 210;
                  const ck3 = r.title + "\x00" + r.artist;
                  const albumCover = isSongs ? (songAlbumCover[ck3] || "") : (albumCoverMap2[ck3] || "");
                  const mid = R.slug(r.artist) + "~" + R.slug(r.title);
                  return (
                    <div key={r.aid + "|" + r.title + i} className="mp-medtile" data-link={true} onClick={() => go(isSongs ? "track" : "album", mid)} title={r.title}>
                      <GenCover hue={hue} name={r.title} image={albumCover} thumb={albumCover} size="100%" style={{ aspectRatio: "1", width: "100%", height: "auto" }} radius={3} />
                      <div className="mp-medtile-title">{r.title}</div>
                      <div className="mp-medtile-plays">{isSongs ? r.artist + " · " : ""}{fmt(r.plays)}</div>
                    </div>
                  );
                })}</div>
              );
              return <div className="cal-rows">{shown.map((r, i) => {
                const hue = (R.byId[r.aid] || {}).hue || 210;
                const ck3 = r.title + "\x00" + r.artist;
                const albumCover = isSongs ? (songAlbumCover[ck3] || "") : (albumCoverMap2[ck3] || "");
                const mid = R.slug(r.artist) + "~" + R.slug(r.title);
                return (
                  <div key={r.aid + "|" + r.title + i} className="cal-row" data-link={true} onClick={() => go(isSongs ? "track" : "album", mid)} title={`${r.title} →`}>
                    <span className="cal-rk">{String(i + 1).padStart(2, "0")}</span>
                    <GenCover hue={hue} name={r.title} image={albumCover} thumb={albumCover} size={34} radius={3} />
                    <div style={{ minWidth: 0, flex: 1 }}><div className="cal-nm" style={{ fontStyle: "italic" }}>{r.title}</div><div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)" }}>{r.artist}</div></div>
                    <span className="cal-pl">{fmt(r.plays)}</span>
                  </div>
                );
              })}</div>;
            })()}
            {pane === "dna" && (resultDNA
              ? <div style={{ display: "flex", justifyContent: "center", padding: "6px 0" }}><div style={{ maxWidth: 340, width: "100%" }}>
                  <Radar axes={["NRG", "MOOD", "ACOU", "BPM", "DANCE", "INSTR"]} values={resultDNA} values2={avg} run={true} size={300} />
                  <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", textAlign: "center", marginTop: 6 }}>solid = this slice · dashed = your average</div></div></div>
              : <div style={{ color: "var(--ink-soft)" }}>No DNA for this slice.</div>)}
            </div>
          </div>
        );
      })()}
      </div>

      <style>{`.map-ctl { display: flex; gap: 14px 18px; flex-wrap: wrap; align-items: center; margin-top: 6px; }
        /* the map band's columns must never grow past their share: bare fr / block children have an
           implicit min-width:auto, so a wide flow/results/list — or drilling a subgenre — could blow
           the whole band past the viewport. Pin every child + track to a 0 min (Fuad 2026-07-16). */
        .mp-grid, .mp-map, .mp-flow, .mp-results, .mp-list, .mp-stats, .mp-cal { min-width: 0; max-width: 100%; }
        .mp-map > .r-card, .mp-flow > .r-card { min-width: 0; max-width: 100%; }
        /* PC composition (Fuad, 2026-07-04): map · flow · results at 3:3:2, height-matched on
           one row; row 2 = deepest places stretched under map+flow, calendar squeezed to its
           right under the results. The results body is a flexed scroll well (height:0 + grow)
           so a long list can never inflate the shared row height — map/flow set it. */
        @media (min-width: 1150px) {
          /* map column widened (was 3fr:3fr:2fr) so the world fills its container instead of
             sitting small and letterboxed in a narrow cell (Fuad 2026-07-06) */
          .mp-grid { display: grid; grid-template-columns: minmax(0, 7fr) minmax(0, 5fr) minmax(0, 4fr); gap: var(--gap); align-items: stretch; }
          .mp-map { grid-column: 1; grid-row: 1; display: flex; flex-direction: column; }
          .mp-map > .r-card { flex: 1; display: flex; align-items: center; }
          .mp-flow { grid-column: 2; grid-row: 1; margin-top: 0 !important; display: flex; flex-direction: column; }
          .mp-flow > .r-card { flex: 1; }
          .mp-results { grid-column: 3; grid-row: 1; margin-top: 0 !important; padding: 16px 16px 12px !important;
            display: flex; flex-direction: column; min-height: 0; }
          .mp-restitle { font-size: 15px !important; line-height: 1.3; }
          .mp-resbody { flex: 1 1 0; height: 0; min-height: 0; overflow-y: auto; padding-right: 4px; }
          .mp-results .mp-covergrid { grid-template-columns: repeat(5, 1fr); gap: 6px; }
          .mp-results .mp-covergrid .mp-covernm { font-size: 8.5px; }
          /* deepest-cities + stat strip sit ~2/3 the calendar's height: stop them stretching
             the shared row and cap the list well (Fuad 2026-07-06) */
          .mp-list { grid-column: 1; grid-row: 2; margin-top: 0 !important; align-self: start; }
          .mp-list > div:last-child { max-height: 147px !important; }
          .mp-stats { grid-column: 2; grid-row: 2; margin-top: 0 !important; display: flex; align-self: start; }
          .mp-stats > .r-card { flex: 1; }
          .mp-cal { grid-column: 3; grid-row: 2; margin-top: 0 !important; }
        }
        .mp-clear { font-family: var(--mono); font-size: 9.5px; letter-spacing: .08em; text-transform: uppercase;
          padding: 6px 11px; border-radius: 999px; border: 1px solid var(--accent-dim); color: var(--accent);
          background: var(--accent-bg); cursor: pointer; align-self: flex-end; }
        .mp-clear:hover { background: transparent; }
        /* cover grid: fixed columns so a lone last item doesn't stretch into an orphan */
        .mp-covergrid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .mp-coveritem { cursor: pointer; min-width: 0; }
        .mp-coveritem[data-link="false"] { cursor: default; }
        .mp-covernm { font-size: 10.5px; margin-top: 6px; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .map-years { display: flex; gap: 10px; align-items: center; flex: 1 1 260px; min-width: 200px; }
        .map-play { font-family: var(--mono); font-size: 11px; letter-spacing: .08em; padding: 5px 11px; border-radius: 999px; border: 1px solid var(--accent); color: var(--accent); background: transparent; cursor: pointer; flex: none; }
        .map-play[data-on="true"] { background: var(--accent); color: #0c0a08; }
        .map-slider { flex: 1; min-width: 90px; height: 4px; -webkit-appearance: none; appearance: none; background: var(--bg-3); border-radius: 3px; outline: none; cursor: pointer; }
        .map-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 15px; height: 15px; border-radius: 50%; background: var(--accent); cursor: pointer; border: 2px solid var(--bg-2); }
        .map-slider::-moz-range-thumb { width: 15px; height: 15px; border-radius: 50%; background: var(--accent); cursor: pointer; border: 2px solid var(--bg-2); }
        .map-yrlabel { font-family: var(--mono); font-size: 10px; color: var(--ink-soft); flex: none; min-width: 56px; text-align: right; }
        .map-soundsel { font-family: var(--mono); font-size: 10px; padding: 4px 6px; border-radius: 999px; border: 1px solid var(--rule); color: var(--ink-soft); background: var(--bg-2); cursor: pointer; }
        .map-soundsel[data-on="true"] { border-color: var(--accent); color: var(--accent); }
        .map-limseg button { font-size: 10px; padding: 4px 8px; }
        /* results controls: keep pane · list/grid · counts compact and grouped so they don't eat
           half the panel width on a laptop; tighten further as the panel narrows (Fuad P16, 2026-07-07) */
        .mp-resctl .r-seg button { font-size: 10.5px; padding: 4px 9px; }
        @media (max-width: 1500px) { .mp-resctl .r-seg button { font-size: 9.5px; padding: 3px 7px; letter-spacing: .02em; } .mp-resctl { gap: 6px 8px; } }
        .map-listrow { display: flex; align-items: center; gap: 10px; padding: 3px 4px; border-radius: 5px; cursor: pointer; transition: background .12s; }
        .map-listrow:hover { background: var(--bg-3); }
        .cal-rows { display: grid; gap: 2px; }
        .cal-row { display: flex; align-items: center; gap: 11px; padding: 6px 6px; border-radius: 6px; transition: background .12s; }
        .cal-row[data-link="true"] { cursor: pointer; } .cal-row[data-link="true"]:hover { background: var(--bg-3); }
        .cal-rk { font-family: var(--mono); font-size: 10px; color: var(--ink-faint); width: 18px; }
        .cal-nm { font-size: 13.5px; flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cal-pl { font-family: var(--mono); font-size: 11px; color: var(--ink-soft); }
        /* album/song cover grid in the results panel */
        .mp-medgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(72px, 1fr)); gap: 10px; margin-bottom: 4px; }
        @media (min-width: 1150px) { .mp-results .mp-medgrid { grid-template-columns: repeat(auto-fill, minmax(62px, 1fr)); gap: 6px; } }
        .mp-medtile { min-width: 0; cursor: pointer; }
        .mp-medtile-title { font-size: 10px; margin-top: 5px; line-height: 1.2;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .mp-medtile-plays { font-family: var(--mono); font-size: 8.5px; color: var(--ink-faint);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }`}</style>
    </div>
  );
}
