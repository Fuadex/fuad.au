// rotation-worldmap.jsx — the Map tab. A pan/zoomable bubble map of where the music comes from
// (world-map.js). Toggle countries ⇄ cities; colour by dominant genre or the top artist's genre;
// ▶ play the years to watch the map shift; click a country to zoom into its cities; click any
// place for a detail blob (top artists/albums/songs + Sound DNA, from the lazy geo-detail.js).

// MapFlow — the taste-flow that doubles as the Map's genre filter + legend. Computed from the
// currently place-scoped EXPLORE set (a.yp over the years), it shows families over time; clicking a
// band filters the map to that family (then drills to its subgenres). markYi draws the active year.
function MapFlow({ artists, filt, setFilt, years, markYi }) {
  const R = window.ROTATION;
  const [hi, setHi] = React.useState(-1);
  const { fam, sub } = filt;
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
    if (fam != null) {
      const m = sumBy(a => (a.s.length && R.SUBS[a.s[0]] && R.SUBS[a.s[0]].fam === fam) ? a.s[0] : null);
      const fhue = (R.FAMILIES.find(f => f.i === fam) || {}).hue || 0;
      const arr = [...m.entries()];
      return arr.map(([si, vals], idx) => ({ key: si, name: R.SUBS[si].name, hue: (fhue + (idx - (arr.length - 1) / 2) * 17 + 360) % 360, sub: si, vals })).filter(s => s.vals.some(v => v > 0));
    }
    const m = sumBy(a => a.s.length ? (R.SUBS[a.s[0]] && R.SUBS[a.s[0]].fam) : null);
    return R.FAMILIES.map(f => ({ key: f.i, name: f.family, hue: f.hue, fam: f.i, vals: m.get(f.i) || new Array(years.length).fill(0) })).filter(s => s.vals.some(v => v > 0));
  }, [artists, fam, years, R]);

  const onPick = (s) => { if (fam == null) setFilt({ fam: s.fam, sub: null }); else setFilt(p => ({ fam, sub: p.sub === s.sub ? null : s.sub })); };
  const famName = fam != null ? (R.FAMILIES.find(f => f.i === fam) || {}).family : null;
  const hasFlow = artists.filter(a => a.yp).length >= 2 && series.length >= 1;

  return (
    <div className="r-card" style={{ padding: "13px 16px 11px", background: "var(--bg-2)" }}>
      <div className="r-mono" style={{ fontSize: 11, marginBottom: 6, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
        <span style={{ cursor: "pointer", color: fam == null ? "var(--ink)" : "var(--accent)" }} onClick={() => setFilt({ fam: null, sub: null })}>all genres</span>
        {fam != null && <><span style={{ margin: "0 7px", color: "var(--ink-faint)" }}>›</span><span style={{ cursor: "pointer", color: sub == null ? "var(--ink)" : "var(--accent)" }} onClick={() => setFilt({ fam, sub: null })}>{famName}</span></>}
        {sub != null && <><span style={{ margin: "0 7px", color: "var(--ink-faint)" }}>›</span><span style={{ color: "var(--ink)" }}>{R.SUBS[sub].name}</span></>}
        <span style={{ marginLeft: "auto", color: "var(--ink-faint)" }}>{fam == null ? "click a band → filter the map" : "click a subgenre to narrow"}</span>
      </div>
      {hasFlow
        ? <StreamGraph series={series} years={years} hi={hi} setHi={setHi} onPick={onPick} clickable={true} markYi={markYi} />
        : <div style={{ padding: 18, textAlign: "center", color: "var(--ink-faint)", fontFamily: "var(--mono)", fontSize: 11 }}>not enough placed artists here for a flow.</div>}
      {hasFlow && <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 12px", marginTop: 8 }}>
        {series.map((s, i) => (
          <div key={s.key} onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(-1)} onClick={() => onPick(s)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", opacity: hi < 0 || hi === i ? 1 : 0.4, transition: ".15s" }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: `oklch(0.62 0.16 ${s.hue})` }} />
            <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>{s.name.length > 22 ? s.name.slice(0, 20) + "…" : s.name}</span>
          </div>
        ))}
      </div>}
    </div>
  );
}

function MapView({ go }) {
  const R = window.ROTATION;
  const G = R.INSIGHTS.GEOGRAPHY;
  const cityPts = G.cityPoints || [];
  const geoYears = G.geoYears || [];
  const FAMHUE = React.useMemo(() => { const m = {}; R.FAMILIES.forEach(f => m[f.i] = f.hue); return m; }, [R]);

  const [world, setWorld] = React.useState(window.ROTATION_WORLD || null);
  const [geo, setGeo] = React.useState(window.ROTATION_GEO || null);
  const [mode, setMode] = React.useState("country");
  const [colorBy, setColorBy] = React.useState("dominant"); // dominant | top
  const [focus, setFocus] = React.useState(null);
  const [yearIdx, setYearIdx] = React.useState(null);       // null = all-time
  const [playing, setPlaying] = React.useState(false);
  const [hi, setHi] = React.useState(null);
  const [sel, setSel] = React.useState(null);
  const [pane, setPane] = React.useState("artists");
  const [filt, setFilt] = React.useState({ fam: null, sub: null }); // genre pivot: size every place by this genre
  const [view, setView] = React.useState({ s: 1, x: 0, y: 0 });
  const svgRef = React.useRef(null);
  const drag = React.useRef(null);
  const ptrs = React.useRef(new Map());
  const pinch = React.useRef(null);
  const moved = React.useRef(false);

  React.useEffect(() => {
    if (window.ROTATION_WORLD) { setWorld(window.ROTATION_WORLD); return; }
    let s = document.getElementById("rotation-world-js");
    if (!s) { s = document.createElement("script"); s.id = "rotation-world-js"; s.src = "world-map.js"; document.head.appendChild(s); }
    const on = () => setWorld(window.ROTATION_WORLD);
    s.addEventListener("load", on);
    return () => s.removeEventListener("load", on);
  }, []);
  const ensureGeo = () => {
    if (window.ROTATION_GEO) { setGeo(window.ROTATION_GEO); return; }
    let s = document.getElementById("rotation-geo-js");
    if (!s) { s = document.createElement("script"); s.id = "rotation-geo-js"; s.src = "geo-detail.js"; document.head.appendChild(s); s.addEventListener("load", () => setGeo(window.ROTATION_GEO)); }
  };
  const avg = React.useMemo(() => { const ks = ["energy", "valence", "acoustic", "tempo", "dance", "instr"]; return ks.map(k => R.ARTISTS.reduce((s, x) => s + x.audio[k], 0) / R.ARTISTS.length); }, []);
  React.useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setYearIdx(i => { const n = (i == null ? 0 : i + 1); if (n >= geoYears.length) { setPlaying(false); return geoYears.length - 1; } return n; }), 1100);
    return () => clearInterval(t);
  }, [playing, geoYears]);
  const W = world ? world.w : 1000, Hh = world ? world.h : 500;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const toSvg = (cx, cy) => { const r = svgRef.current.getBoundingClientRect(); return [(cx - r.left) / r.width * W, (cy - r.top) / r.height * Hh]; };
  React.useEffect(() => {
    const el = svgRef.current; if (!el) return;
    const onWheel = (e) => { e.preventDefault(); const [sx, sy] = toSvg(e.clientX, e.clientY); setView(v => { const ns = clamp(v.s * (e.deltaY < 0 ? 1.15 : 1 / 1.15), 1, 14); return { s: ns, x: sx - (sx - v.x) / v.s * ns, y: sy - (sy - v.y) / v.s * ns }; }); };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [world]);
  const onDown = (e) => {
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved.current = false;
    if (e.pointerType === "mouse") drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
  };
  const onMove = (e) => {
    if (ptrs.current.has(e.pointerId)) ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...ptrs.current.values()];
    if (pts.length >= 2) {                    // two-finger pinch-zoom (one finger still scrolls the page)
      e.preventDefault(); moved.current = true;
      const [a, b] = pts, dist = Math.hypot(a.x - b.x, a.y - b.y), mx2 = (a.x + b.x) / 2, my2 = (a.y + b.y) / 2;
      if (pinch.current) { const [sx, sy] = toSvg(mx2, my2), ratio = dist / pinch.current; setView(v => { const ns = clamp(v.s * ratio, 1, 14); return { s: ns, x: sx - (sx - v.x) / v.s * ns, y: sy - (sy - v.y) / v.s * ns }; }); }
      pinch.current = dist; drag.current = null; return;
    }
    pinch.current = null;
    if (drag.current && e.pointerType === "mouse") {
      const r = svgRef.current.getBoundingClientRect(), dx = (e.clientX - drag.current.x) / r.width * W, dy = (e.clientY - drag.current.y) / r.height * Hh;
      if (Math.abs(dx) + Math.abs(dy) > 3) moved.current = true;
      setView(v => ({ ...v, x: drag.current.vx + dx, y: drag.current.vy + dy }));
    }
  };
  const onUp = (e) => { if (e && e.pointerId != null) ptrs.current.delete(e.pointerId); if (ptrs.current.size < 2) pinch.current = null; if (ptrs.current.size === 0) drag.current = null; };
  const onLeave = () => { ptrs.current.clear(); pinch.current = null; drag.current = null; setHi(null); };
  const frame = (bb) => { if (!bb) return; const [x0, y0, x1, y1] = bb, bw = Math.max(8, x1 - x0), bh = Math.max(8, y1 - y0), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2; const s = clamp(Math.min(W / (bw * 1.6), Hh / (bh * 1.6)), 1, 12); setView({ s, x: W / 2 - cx * s, y: Hh / 2 - cy * s }); };
  const reset = () => { setFocus(null); setSel(null); setView({ s: 1, x: 0, y: 0 }); };

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
  // the flow rescopes to the selected place (or the whole world); the results list is the place ∩ genre ∩ year set
  const flowArtists = React.useMemo(() => {
    if (!sel) return R.EXPLORE;
    if (sel.kind === "country") return R.EXPLORE.filter(a => a.co === sel.key);
    const [iso, city] = sel.key.split("|"); return R.EXPLORE.filter(a => a.co === iso && a.ci === city);
  }, [sel, R]);
  const resultArtists = React.useMemo(() => {
    const yr = yearIdx != null ? geoYears[yearIdx] : null;
    let set = flowArtists;
    if (filt.fam != null || filt.sub != null) set = set.filter(matchGenre);
    return set.map(a => ({ a, p: yr != null ? (a.yp ? (a.yp[yr] || 0) : 0) : a.plays }))
      .filter(e => e.p > 0).sort((x, y) => y.p - x.p).slice(0, 24);
  }, [flowArtists, filt, yearIdx]);
  // an album/song belongs to the active genre if ITS ARTIST does — resolved client-side, no rebuild
  const exByName = React.useMemo(() => new Map(R.EXPLORE.map(a => [a.name, a])), [R]);
  const passGenre = (artistName) => { if (filt.fam == null && filt.sub == null) return true; const rec = exByName.get(artistName); return rec ? matchGenre(rec) : false; };
  const bubbles = React.useMemo(() => {
    if (!world) return [];
    const proj = (c) => [(c.lng + 180) / 360 * world.w, (90 - c.lat) / 180 * world.h];
    let set, kind, base, scale, project;
    if (focus) { set = cityPts.filter(c => c.country === focus); kind = "city"; base = 2; scale = 16; project = proj; }
    else if (mode === "city") { set = cityPts; kind = "city"; base = 2.5; scale = 24; project = proj; }
    else { const C = world.centroids; set = G.countries.filter(c => C[c.code]); kind = "country"; base = 4; scale = 28; project = (c) => C[c.code]; }
    const mx = Math.max(1, ...set.map(sizeOf));
    return set.map((c, i) => { const [x, y] = project(c); const sv = sizeOf(c); const r = ((yearIdx != null || filtSums) && sv === 0) ? 0 : base + Math.sqrt(sv / mx) * scale; return { key: kind === "country" ? c.code : "c" + i, kind, x, y, r, c }; });
  }, [world, mode, focus, yearIdx, filtSums, R]);

  const placeHue = (c) => {
    if (filtSums) { const fi = filt.sub != null ? (R.SUBS[filt.sub] && R.SUBS[filt.sub].fam) : filt.fam; return (fi != null && FAMHUE[fi] != null) ? `oklch(0.63 0.17 ${FAMHUE[fi]})` : "var(--accent)"; }
    let fi; if (yearIdx != null) fi = c.yf ? c.yf[yearIdx] : -1; else fi = colorBy === "top" ? c.tf : c.df; return (fi >= 0 && FAMHUE[fi] != null) ? `oklch(0.63 0.17 ${FAMHUE[fi]})` : "var(--accent)";
  };
  const openBubble = (b) => {
    if (b.kind === "country") { setFocus(b.c.code); frame(world.bbox[b.c.code]); setSel({ kind: "country", key: b.c.code }); }
    else setSel({ kind: "city", key: b.c.country + "|" + b.c.city });
    setPane("artists"); ensureGeo();
  };

  const hb = hi != null ? bubbles.find(b => b.key === hi) : null;
  const listBase = focus ? cityPts.filter(c => c.country === focus) : (mode === "city" ? cityPts : G.countries);
  const list = filtSums
    ? listBase.map(t => [t, gval(t)]).filter(e => e[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 20).map(e => e[0])
    : listBase.slice(0, 20);
  const listMax = Math.max(1, ...list.map(t => filtSums ? gval(t) : t.plays));
  const NM = geo && geo.names;
  const period = (geo && sel) ? (geo[sel.kind] || {})[sel.key] : null;
  const selName = sel ? (sel.kind === "country" ? ((G.countries.find(c => c.code === sel.key) || {}).name || sel.key) : sel.key.split("|")[1]) : "";
  const selFlag = sel ? (sel.kind === "country" ? (G.countries.find(c => c.code === sel.key) || {}).flag : (cityPts.find(c => c.country + "|" + c.city === sel.key) || {}).flag) : "";
  const focusName = focus ? ((G.countries.find(c => c.code === focus) || {}).name || focus) : null;

  if (!world) return (
    <div className="r-view"><div className="r-viewhead"><div><div className="r-kicker">Geography</div><h1 className="r-title">Where it <em>comes from</em><span className="dot">.</span></h1></div></div>
      <div style={{ padding: 60, textAlign: "center", color: "var(--ink-faint)", fontFamily: "var(--mono)", fontSize: 12 }}>loading the map…</div></div>
  );

  return (
    <div className="r-view">
      <div className="r-viewhead">
        <div>
          <div className="r-kicker">Geography · {G.totalCountries} countries · {fmt(cityPts.length)} cities{yearIdx != null ? " · " + geoYears[yearIdx] : ""}</div>
          <h1 className="r-title">Where it <em>comes from</em><span className="dot">.</span></h1>
        </div>
        {!focus && <div className="r-seg" style={{ alignSelf: "flex-end" }}>
          {[["country", "countries"], ["city", "cities"]].map(([k, l]) => <button key={k} data-on={mode === k} onClick={() => { setMode(k); setHi(null); }}>{l}</button>)}
        </div>}
      </div>

      {/* colour-by + play-the-years controls */}
      <div className="map-ctl">
        <div className="r-seg" title="how the bubbles are coloured">
          {[["dominant", "dominant genre"], ["top", "top artist's genre"]].map(([k, l]) => <button key={k} data-on={yearIdx == null && !filtSums && colorBy === k} disabled={yearIdx != null || !!filtSums} onClick={() => setColorBy(k)}>{l}</button>)}
        </div>
        <div className="map-years">
          <button className="map-play" data-on={playing} onClick={() => { if (!playing && (yearIdx == null || yearIdx >= geoYears.length - 1)) setYearIdx(0); setPlaying(p => !p); }}>{playing ? "❚❚" : "▶"} years</button>
          <button className="map-yr" data-on={yearIdx == null} onClick={() => { setPlaying(false); setYearIdx(null); }}>all</button>
          {geoYears.map((y, i) => <button key={y} className="map-yr" data-on={yearIdx === i} onClick={() => { setPlaying(false); setYearIdx(i); }}>{"'" + String(y).slice(2)}</button>)}
        </div>
      </div>

      {/* the flow IS the filter — pick a band to scope the map; picking a place rescopes the flow */}
      <div style={{ marginTop: 10 }}>
        <MapFlow artists={flowArtists} filt={filt} setFilt={setFilt} years={geoYears} markYi={yearIdx} />
      </div>

      <div style={{ fontFamily: "var(--serif)", fontSize: 15, color: "var(--ink-soft)", margin: "10px 0", minHeight: 22 }}>
        {focus ? <><span style={{ cursor: "pointer", color: "var(--accent)", fontFamily: "var(--mono)", fontSize: 12 }} onClick={reset}>‹ world</span> &nbsp; cities of <b style={{ color: "var(--ink)" }}>{focusName}</b> — click one for its scene</>
          : hb ? (hb.kind === "city"
            ? <><span style={{ fontSize: 18 }}>{hb.c.flag}</span> <b style={{ color: "var(--ink)" }}>{hb.c.city}</b>, {hb.c.country} — {fmt(yearIdx != null ? sizeOf(hb.c) : hb.c.plays)} plays{yearIdx != null ? " in " + geoYears[yearIdx] : " · " + hb.c.artists + " artists"}</>
            : <><span style={{ fontSize: 18 }}>{hb.c.flag}</span> <b style={{ color: "var(--ink)" }}>{hb.c.name}</b> — {fmt(yearIdx != null ? sizeOf(hb.c) : hb.c.plays)} plays{yearIdx != null ? " in " + geoYears[yearIdx] : " · " + hb.c.artists + " artists"} <span style={{ color: "var(--ink-faint)", fontSize: 12 }}>(click to zoom in)</span></>)
            : filtSums ? <>showing <b style={{ color: "var(--ink)" }}>{filt.sub != null ? R.SUBS[filt.sub].name : R.FAMILIES[filt.fam].family}</b> across {mode === "city" ? "cities" : "the world"} — bigger means it ran deeper there{list[0] ? <> · led by <b style={{ color: "var(--ink)" }}>{list[0].flag} {list[0].code ? list[0].name : list[0].city}</b></> : null}</>
            : <span style={{ color: "var(--ink-faint)" }}>{mode === "city" ? "every dot a city — hover to read, click for its scene" : "click a country to zoom into its cities · scroll to zoom, drag to pan"}</span>}
      </div>

      <div className="r-card" style={{ padding: 0, overflow: "hidden", background: "var(--bg-2)" }}>
        <svg ref={svgRef} viewBox={`0 0 ${world.w} ${world.h}`} style={{ width: "100%", height: "auto", display: "block", cursor: "grab", touchAction: "pan-y" }}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onPointerLeave={onLeave}>
          <g transform={`translate(${view.x} ${view.y}) scale(${view.s})`}>
            {world.land.map((d, i) => <path key={i} d={d} fill="var(--bg-3)" stroke="var(--rule-2)" strokeWidth={0.4 / view.s} />)}
            {bubbles.slice().sort((a, b) => b.c.plays - a.c.plays).map(b => {
              const on = hi === b.key, col = placeHue(b.c);
              return <circle key={b.key} cx={b.x} cy={b.y} r={b.r / Math.sqrt(view.s)} fill={col} fillOpacity={on ? 0.72 : 0.34}
                stroke={col} strokeWidth={(on ? 1.6 : 0.7) / view.s} style={{ cursor: "pointer", transition: "r .6s cubic-bezier(.3,.8,.3,1), fill .5s, fill-opacity .12s" }}
                onMouseEnter={() => setHi(b.key)} onClick={(e) => { e.stopPropagation(); if (!moved.current) openBubble(b); }} />;
            })}
          </g>
        </svg>
      </div>

      {/* breakdown list */}
      <div style={{ marginTop: "var(--gap)" }}>
        <div className="r-mono" style={{ fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: 10 }}>{focus ? "Cities in " + focusName : mode === "city" ? "Deepest cities" : "Deepest countries"}</div>
        <div style={{ maxHeight: 230, overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px,1fr))", gap: "5px 22px", paddingRight: 4 }}>
          {list.map((t, i) => (
            <div key={(t.code || t.city) + i} className="map-listrow"
              onMouseEnter={() => setHi(t.code ? t.code : "c" + cityPts.filter(c => !focus || c.country === focus).indexOf(t))} onMouseLeave={() => setHi(null)}
              onClick={() => { if (t.code) openBubble({ kind: "country", c: t }); else { setSel({ kind: "city", key: t.country + "|" + t.city }); setPane("artists"); ensureGeo(); } }}>
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

      {/* results — artists are place ∩ genre ∩ year; albums/songs/dna are place-level (from geo-detail) */}
      {(() => {
        const gName = filt.sub != null ? R.SUBS[filt.sub].name : filt.fam != null ? R.FAMILIES[filt.fam].family : null;
        const parts = [sel ? (selFlag + " " + selName) : "everywhere", gName || "all genres", yearIdx != null ? geoYears[yearIdx] : "all years"];
        const totalPlays = resultArtists.reduce((s, e) => s + e.p, 0);
        const filtered = filt.fam != null || filt.sub != null;
        return (
          <div className="r-card" style={{ marginTop: "var(--gap)", padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
              <div><div className="r-mono" style={{ fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: 4 }}>results</div>
                <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 22 }}>{parts.join("  ·  ")}</div></div>
              <div><div className="r-stat-n" style={{ fontSize: 26 }}>{fmt(totalPlays)}</div><div className="r-mono" style={{ fontSize: 8.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ink-faint)" }}>plays</div></div>
            </div>
            <div className="r-seg" style={{ margin: "16px 0 14px" }}>
              {[["artists", "artists"], ["albums", "albums"], ["songs", "songs"], ["dna", "sound dna"]].map(([k, l]) => <button key={k} data-on={pane === k} onClick={() => setPane(k)}>{l}</button>)}
            </div>
            {pane === "artists"
              ? (resultArtists.length
                ? <div className="cal-rows">{resultArtists.map((e, i) => { const a = e.a, kept = !!R.byId[a.id]; return (
                    <div key={a.id} className="cal-row" data-link={kept} onClick={() => kept && go("artist", a.id)}>
                      <span className="cal-rk">{String(i + 1).padStart(2, "0")}</span><GenCover hue={a.hue || 210} name={a.name} size={34} radius={3} />
                      <span className="cal-nm">{a.name}</span><span className="cal-pl">{fmt(e.p)}</span></div>); })}</div>
                : <div style={{ color: "var(--ink-soft)" }}>Nothing matches this filter.</div>)
              : !sel ? <div style={{ color: "var(--ink-faint)", fontFamily: "var(--mono)", fontSize: 12, padding: "8px 0" }}>pick a place on the map for album, song &amp; DNA detail.</div>
                : !geo ? <div style={{ color: "var(--ink-faint)", fontFamily: "var(--mono)", fontSize: 12, padding: "8px 0" }}>loading the detail…</div>
                  : !period ? <div style={{ color: "var(--ink-soft)" }}>No breakdown for {selName}.</div>
                    : <>
                      {yearIdx != null && <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", marginBottom: 8 }}>album &amp; song detail isn't split by year yet — showing all-time for this place{filtered ? " + genre" : ""}.</div>}
                      {(pane === "albums" || pane === "songs") && (() => {
                        const rows = (pane === "albums" ? period.al : period.s).filter(([ti, ai]) => passGenre(NM[ai]));
                        return rows.length
                          ? <div className="cal-rows">{rows.map(([ti, ai, p], i) => { const t = NM[ti], a = NM[ai], kept = !!R.byId[R.slug(a)]; return (
                            <div key={t + i} className="cal-row" data-link={kept} onClick={() => kept && go("artist", R.slug(a))}>
                              <span className="cal-rk">{String(i + 1).padStart(2, "0")}</span><GenCover hue={(R.byId[R.slug(a)] || {}).hue || 210} name={a} size={34} radius={3} />
                              <div style={{ minWidth: 0, flex: 1 }}><div className="cal-nm" style={{ fontStyle: "italic" }}>{t}</div><div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)" }}>{a}</div></div>
                              <span className="cal-pl">{fmt(p)}</span></div>); })}</div>
                          : <div style={{ color: "var(--ink-soft)" }}>No {pane} from this genre here.</div>;
                      })()}
                      {pane === "dna" && <div style={{ display: "flex", justifyContent: "center", padding: "6px 0" }}><div style={{ maxWidth: 340, width: "100%" }}>
                        <Radar axes={["NRG", "MOOD", "ACOU", "BPM", "DANCE", "INSTR"]} values={period.d} values2={avg} run={true} size={300} />
                        <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", textAlign: "center", marginTop: 6 }}>solid = {selName} · dashed = your average</div></div></div>}
                    </>}
          </div>
        );
      })()}

      <style>{`.map-ctl { display: flex; gap: 14px 18px; flex-wrap: wrap; align-items: center; margin-top: 6px; }
        .map-years { display: flex; gap: 5px; flex-wrap: wrap; align-items: center; }
        .map-play { font-family: var(--mono); font-size: 10px; letter-spacing: .08em; padding: 5px 10px; border-radius: 999px; border: 1px solid var(--accent); color: var(--accent); background: transparent; cursor: pointer; }
        .map-play[data-on="true"] { background: var(--accent); color: #0c0a08; }
        .map-yr { font-family: var(--mono); font-size: 10px; padding: 4px 7px; border-radius: 999px; border: 1px solid var(--rule); color: var(--ink-soft); background: transparent; cursor: pointer; transition: .12s; }
        .map-yr:hover { border-color: var(--ink-faint); }
        .map-yr[data-on="true"] { background: var(--accent); border-color: var(--accent); color: #0c0a08; }
        .map-listrow { display: flex; align-items: center; gap: 10px; padding: 3px 4px; border-radius: 5px; cursor: pointer; transition: background .12s; }
        .map-listrow:hover { background: var(--bg-3); }
        .cal-rows { display: grid; gap: 2px; }
        .cal-row { display: flex; align-items: center; gap: 11px; padding: 6px 6px; border-radius: 6px; transition: background .12s; }
        .cal-row[data-link="true"] { cursor: pointer; } .cal-row[data-link="true"]:hover { background: var(--bg-3); }
        .cal-rk { font-family: var(--mono); font-size: 10px; color: var(--ink-faint); width: 18px; }
        .cal-nm { font-size: 13.5px; flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cal-pl { font-family: var(--mono); font-size: 11px; color: var(--ink-soft); }`}</style>
    </div>
  );
}
