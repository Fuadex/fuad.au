// rotation-worldmap.jsx — the Map tab. A pan/zoomable bubble map of where the music comes from
// (world-map.js). Toggle countries ⇄ cities; colour by dominant genre or the top artist's genre;
// ▶ play the years to watch the map shift; click a country to zoom into its cities; click any
// place for a detail blob (top artists/albums/songs + Sound DNA, from the lazy geo-detail.js).

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
  const [view, setView] = React.useState({ s: 1, x: 0, y: 0 });
  const svgRef = React.useRef(null);
  const drag = React.useRef(null);

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
  const onDown = (e) => { drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false }; };
  const onMove = (e) => { if (!drag.current) return; const r = svgRef.current.getBoundingClientRect(); const dx = (e.clientX - drag.current.x) / r.width * W, dy = (e.clientY - drag.current.y) / r.height * Hh; if (Math.abs(dx) + Math.abs(dy) > 3) drag.current.moved = true; setView(v => ({ ...v, x: drag.current.vx + dx, y: drag.current.vy + dy })); };
  const onUp = () => { drag.current = null; };
  const frame = (bb) => { if (!bb) return; const [x0, y0, x1, y1] = bb, bw = Math.max(8, x1 - x0), bh = Math.max(8, y1 - y0), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2; const s = clamp(Math.min(W / (bw * 1.6), Hh / (bh * 1.6)), 1, 12); setView({ s, x: W / 2 - cx * s, y: Hh / 2 - cy * s }); };
  const reset = () => { setFocus(null); setSel(null); setView({ s: 1, x: 0, y: 0 }); };

  const sizeOf = (c) => yearIdx != null ? (c.yr ? c.yr[yearIdx] : 0) : c.plays;
  const bubbles = React.useMemo(() => {
    if (!world) return [];
    const proj = (c) => [(c.lng + 180) / 360 * world.w, (90 - c.lat) / 180 * world.h];
    let set, kind, base, scale, project;
    if (focus) { set = cityPts.filter(c => c.country === focus); kind = "city"; base = 2; scale = 16; project = proj; }
    else if (mode === "city") { set = cityPts; kind = "city"; base = 2.5; scale = 24; project = proj; }
    else { const C = world.centroids; set = G.countries.filter(c => C[c.code]); kind = "country"; base = 4; scale = 28; project = (c) => C[c.code]; }
    const mx = Math.max(1, ...set.map(sizeOf));
    return set.map((c, i) => { const [x, y] = project(c); const sv = sizeOf(c); const r = (yearIdx != null && sv === 0) ? 0 : base + Math.sqrt(sv / mx) * scale; return { key: kind === "country" ? c.code : "c" + i, kind, x, y, r, c }; });
  }, [world, mode, focus, yearIdx, R]);

  const placeHue = (c) => { let fi; if (yearIdx != null) fi = c.yf ? c.yf[yearIdx] : -1; else fi = colorBy === "top" ? c.tf : c.df; return (fi >= 0 && FAMHUE[fi] != null) ? `oklch(0.63 0.17 ${FAMHUE[fi]})` : "var(--accent)"; };
  const openBubble = (b) => {
    if (b.kind === "country") { setFocus(b.c.code); frame(world.bbox[b.c.code]); setSel({ kind: "country", key: b.c.code }); }
    else setSel({ kind: "city", key: b.c.country + "|" + b.c.city });
    setPane("artists"); ensureGeo();
  };

  const hb = hi != null ? bubbles.find(b => b.key === hi) : null;
  const list = focus ? cityPts.filter(c => c.country === focus).slice(0, 20) : (mode === "city" ? cityPts : G.countries).slice(0, 20);
  const listMax = Math.max(1, ...list.map(t => t.plays));
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
          {[["dominant", "dominant genre"], ["top", "top artist's genre"]].map(([k, l]) => <button key={k} data-on={yearIdx == null && colorBy === k} disabled={yearIdx != null} onClick={() => setColorBy(k)}>{l}</button>)}
        </div>
        <div className="map-years">
          <button className="map-play" data-on={playing} onClick={() => { if (!playing && (yearIdx == null || yearIdx >= geoYears.length - 1)) setYearIdx(0); setPlaying(p => !p); }}>{playing ? "❚❚" : "▶"} years</button>
          <button className="map-yr" data-on={yearIdx == null} onClick={() => { setPlaying(false); setYearIdx(null); }}>all</button>
          {geoYears.map((y, i) => <button key={y} className="map-yr" data-on={yearIdx === i} onClick={() => { setPlaying(false); setYearIdx(i); }}>{"'" + String(y).slice(2)}</button>)}
        </div>
      </div>

      <div style={{ fontFamily: "var(--serif)", fontSize: 15, color: "var(--ink-soft)", margin: "10px 0", minHeight: 22 }}>
        {focus ? <><span style={{ cursor: "pointer", color: "var(--accent)", fontFamily: "var(--mono)", fontSize: 12 }} onClick={reset}>‹ world</span> &nbsp; cities of <b style={{ color: "var(--ink)" }}>{focusName}</b> — click one for its scene</>
          : hb ? (hb.kind === "city"
            ? <><span style={{ fontSize: 18 }}>{hb.c.flag}</span> <b style={{ color: "var(--ink)" }}>{hb.c.city}</b>, {hb.c.country} — {fmt(yearIdx != null ? sizeOf(hb.c) : hb.c.plays)} plays{yearIdx != null ? " in " + geoYears[yearIdx] : " · " + hb.c.artists + " artists"}</>
            : <><span style={{ fontSize: 18 }}>{hb.c.flag}</span> <b style={{ color: "var(--ink)" }}>{hb.c.name}</b> — {fmt(yearIdx != null ? sizeOf(hb.c) : hb.c.plays)} plays{yearIdx != null ? " in " + geoYears[yearIdx] : " · " + hb.c.artists + " artists"} <span style={{ color: "var(--ink-faint)", fontSize: 12 }}>(click to zoom in)</span></>)
            : <span style={{ color: "var(--ink-faint)" }}>{mode === "city" ? "every dot a city — hover to read, click for its scene" : "click a country to zoom into its cities · scroll to zoom, drag to pan"}</span>}
      </div>

      <div className="r-card" style={{ padding: 0, overflow: "hidden", background: "var(--bg-2)" }}>
        <svg ref={svgRef} viewBox={`0 0 ${world.w} ${world.h}`} style={{ width: "100%", height: "auto", display: "block", cursor: drag.current ? "grabbing" : "grab", touchAction: "none" }}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={() => { onUp(); setHi(null); }}>
          <g transform={`translate(${view.x} ${view.y}) scale(${view.s})`}>
            {world.land.map((d, i) => <path key={i} d={d} fill="var(--bg-3)" stroke="var(--rule-2)" strokeWidth={0.4 / view.s} />)}
            {bubbles.slice().sort((a, b) => b.r - a.r).map(b => {
              const on = hi === b.key, col = placeHue(b.c);
              return <circle key={b.key} cx={b.x} cy={b.y} r={b.r / Math.sqrt(view.s)} fill={col} fillOpacity={on ? 0.72 : 0.34}
                stroke={col} strokeWidth={(on ? 1.6 : 0.7) / view.s} style={{ cursor: "pointer", transition: "r .6s cubic-bezier(.3,.8,.3,1), fill .5s, fill-opacity .12s" }}
                onMouseEnter={() => setHi(b.key)} onClick={(e) => { e.stopPropagation(); if (!drag.current || !drag.current.moved) openBubble(b); }} />;
            })}
          </g>
        </svg>
      </div>

      {/* genre legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 12 }}>
        {R.FAMILIES.map(f => (
          <div key={f.i} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: `oklch(0.63 0.17 ${f.hue})` }} />
            <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>{f.family}</span>
          </div>
        ))}
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
                <div style={{ height: 4, background: "var(--bg-3)", borderRadius: 3, overflow: "hidden", marginTop: 3 }}><div style={{ height: "100%", width: (t.plays / listMax * 100) + "%", background: "var(--accent-dim)", borderRadius: 3 }} /></div>
              </div>
              <span className="r-mono" style={{ fontSize: 10, color: "var(--ink-soft)" }}>{fmtK(t.plays)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* selection detail blob */}
      {sel && (
        <div className="r-card" style={{ marginTop: "var(--gap)", padding: 22 }}>
          {!geo ? <div style={{ color: "var(--ink-faint)", fontFamily: "var(--mono)", fontSize: 12, padding: "8px 0" }}>loading the detail…</div>
            : !period ? <div style={{ color: "var(--ink-soft)" }}>No breakdown for {selName}.</div>
              : <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
                  <div><div className="r-mono" style={{ fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: 4 }}>{sel.kind} scene</div>
                    <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 24 }}>{selFlag} {selName}</div></div>
                  <div><div className="r-stat-n" style={{ fontSize: 26 }}>{fmt(period.t)}</div><div className="r-mono" style={{ fontSize: 8.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ink-faint)" }}>plays</div></div>
                </div>
                <div className="r-seg" style={{ margin: "16px 0 14px" }}>
                  {[["artists", "artists"], ["albums", "albums"], ["songs", "songs"], ["dna", "sound dna"]].map(([k, l]) => <button key={k} data-on={pane === k} onClick={() => setPane(k)}>{l}</button>)}
                </div>
                {pane === "artists" && <div className="cal-rows">{period.a.map(([ix, p], i) => { const nm = NM[ix], kept = !!R.byId[R.slug(nm)]; return (
                  <div key={nm} className="cal-row" data-link={kept} onClick={() => kept && go("artist", R.slug(nm))}>
                    <span className="cal-rk">{String(i + 1).padStart(2, "0")}</span><GenCover hue={(R.byId[R.slug(nm)] || {}).hue || 210} name={nm} size={34} radius={3} />
                    <span className="cal-nm">{nm}</span><span className="cal-pl">{fmt(p)}</span></div>); })}</div>}
                {(pane === "albums" || pane === "songs") && <div className="cal-rows">{(pane === "albums" ? period.al : period.s).map(([ti, ai, p], i) => { const t = NM[ti], a = NM[ai], kept = !!R.byId[R.slug(a)]; return (
                  <div key={t + i} className="cal-row" data-link={kept} onClick={() => kept && go("artist", R.slug(a))}>
                    <span className="cal-rk">{String(i + 1).padStart(2, "0")}</span><GenCover hue={(R.byId[R.slug(a)] || {}).hue || 210} name={a} size={34} radius={3} />
                    <div style={{ minWidth: 0, flex: 1 }}><div className="cal-nm" style={{ fontStyle: "italic" }}>{t}</div><div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)" }}>{a}</div></div>
                    <span className="cal-pl">{fmt(p)}</span></div>); })}</div>}
                {pane === "dna" && <div style={{ display: "flex", justifyContent: "center", padding: "6px 0" }}><div style={{ maxWidth: 340, width: "100%" }}>
                  <Radar axes={["NRG", "MOOD", "ACOU", "BPM", "DANCE", "INSTR"]} values={period.d} values2={avg} run={true} size={300} />
                  <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", textAlign: "center", marginTop: 6 }}>solid = {selName} · dashed = your average</div></div></div>}
              </>}
        </div>
      )}

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
