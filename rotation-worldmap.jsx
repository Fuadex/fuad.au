// rotation-worldmap.jsx — the Map tab. Where the music comes from, as a pan/zoomable bubble map
// over a simplified equirectangular world (world-map.js). Toggle countries ⇄ cities; click a
// country to zoom into it and reveal its cities; click any place for a detail blob (top artists/
// albums/songs + Sound DNA, from the lazy geo-detail.js).

function MapView({ go }) {
  const R = window.ROTATION;
  const G = R.INSIGHTS.GEOGRAPHY;
  const cityPts = G.cityPoints || [];
  const [world, setWorld] = React.useState(window.ROTATION_WORLD || null);
  const [geo, setGeo] = React.useState(window.ROTATION_GEO || null);
  const [mode, setMode] = React.useState("country");
  const [focus, setFocus] = React.useState(null);   // focused country code (zoomed in)
  const [hi, setHi] = React.useState(null);
  const [sel, setSel] = React.useState(null);        // { kind:"country"|"city", key }
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

  const bubbles = React.useMemo(() => {
    if (!world) return [];
    const proj = (c) => [(c.lng + 180) / 360 * world.w, (90 - c.lat) / 180 * world.h];
    if (focus) { const cs = cityPts.filter(c => c.country === focus); const mx = Math.max(1, ...cs.map(c => c.plays)); return cs.map((c, i) => { const [x, y] = proj(c); return { key: "c" + i, kind: "city", x, y, r: 2 + Math.sqrt(c.plays / mx) * 16, c }; }); }
    if (mode === "city") { const mx = Math.max(1, ...cityPts.map(c => c.plays)); return cityPts.map((c, i) => { const [x, y] = proj(c); return { key: "c" + i, kind: "city", x, y, r: 2.5 + Math.sqrt(c.plays / mx) * 24, c }; }); }
    const C = world.centroids, placed = G.countries.filter(c => C[c.code]); const mx = Math.max(1, ...placed.map(c => c.plays));
    return placed.map(c => ({ key: c.code, kind: "country", x: C[c.code][0], y: C[c.code][1], r: 4 + Math.sqrt(c.plays / mx) * 28, c }));
  }, [world, mode, focus, R]);

  const openBubble = (b) => {
    if (b.kind === "country") { setFocus(b.c.code); frame(world.bbox[b.c.code]); setSel({ kind: "country", key: b.c.code }); }
    else setSel({ kind: "city", key: b.c.country + "|" + b.c.city });
    setPane("artists"); ensureGeo();
  };

  const hb = hi != null ? bubbles.find(b => b.key === hi) : null;
  // breakdown list (scrollable, up to 20)
  const list = focus ? cityPts.filter(c => c.country === focus).slice(0, 20) : (mode === "city" ? cityPts : G.countries).slice(0, 20);
  const listMax = Math.max(1, ...list.map(t => t.plays));

  const NM = geo && geo.names;
  const period = (geo && sel) ? (geo[sel.kind] || {})[sel.key] : null;
  const selName = sel ? (sel.kind === "country" ? ((G.countries.find(c => c.code === sel.key) || {}).name || sel.key) : sel.key.split("|")[1]) : "";
  const selFlag = sel ? (sel.kind === "country" ? (G.countries.find(c => c.code === sel.key) || {}).flag : (cityPts.find(c => c.country + "|" + c.city === sel.key) || {}).flag) : "";

  if (!world) return (
    <div className="r-view"><div className="r-viewhead"><div><div className="r-kicker">Geography</div><h1 className="r-title">Where it <em>comes from</em><span className="dot">.</span></h1></div></div>
      <div style={{ padding: 60, textAlign: "center", color: "var(--ink-faint)", fontFamily: "var(--mono)", fontSize: 12 }}>loading the map…</div></div>
  );

  const focusName = focus ? ((G.countries.find(c => c.code === focus) || {}).name || focus) : null;
  return (
    <div className="r-view">
      <div className="r-viewhead">
        <div>
          <div className="r-kicker">Geography · {G.totalCountries} countries · {fmt(cityPts.length)} cities</div>
          <h1 className="r-title">Where it <em>comes from</em><span className="dot">.</span></h1>
        </div>
        {!focus && <div className="r-seg" style={{ alignSelf: "flex-end" }}>
          {[["country", "countries"], ["city", "cities"]].map(([k, l]) => <button key={k} data-on={mode === k} onClick={() => { setMode(k); setHi(null); }}>{l}</button>)}
        </div>}
      </div>

      <div style={{ fontFamily: "var(--serif)", fontSize: 15, color: "var(--ink-soft)", marginBottom: 10, minHeight: 22 }}>
        {focus ? <><span style={{ cursor: "pointer", color: "var(--accent)", fontFamily: "var(--mono)", fontSize: 12 }} onClick={reset}>‹ world</span> &nbsp; cities of <b style={{ color: "var(--ink)" }}>{focusName}</b> — click one for its scene</>
          : hb ? (hb.kind === "city"
            ? <><span style={{ fontSize: 18 }}>{hb.c.flag}</span> <b style={{ color: "var(--ink)" }}>{hb.c.city}</b>, {hb.c.country} — {fmt(hb.c.plays)} plays · {hb.c.artists} artist{hb.c.artists !== 1 ? "s" : ""}</>
            : <><span style={{ fontSize: 18 }}>{hb.c.flag}</span> <b style={{ color: "var(--ink)" }}>{hb.c.name}</b> — {fmt(hb.c.plays)} plays · {hb.c.artists} artists <span style={{ color: "var(--ink-faint)", fontSize: 12 }}>(click to zoom in)</span></>)
            : <span style={{ color: "var(--ink-faint)" }}>{mode === "city" ? "every dot a city — hover to read it, click for its scene" : "click a country to zoom into its cities · scroll to zoom, drag to pan"}</span>}
      </div>

      <div className="r-card" style={{ padding: 0, overflow: "hidden", background: "var(--bg-2)" }}>
        <svg ref={svgRef} viewBox={`0 0 ${world.w} ${world.h}`} style={{ width: "100%", height: "auto", display: "block", cursor: drag.current ? "grabbing" : "grab", touchAction: "none" }}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={() => { onUp(); setHi(null); }}>
          <g transform={`translate(${view.x} ${view.y}) scale(${view.s})`}>
            {world.land.map((d, i) => <path key={i} d={d} fill="var(--bg-3)" stroke="var(--rule-2)" strokeWidth={0.4 / view.s} />)}
            {bubbles.slice().sort((a, b) => b.r - a.r).map(b => {
              const on = hi === b.key;
              return <circle key={b.key} cx={b.x} cy={b.y} r={b.r / Math.sqrt(view.s)} fill="var(--accent)" fillOpacity={on ? 0.62 : 0.26}
                stroke="var(--accent)" strokeWidth={(on ? 1.6 : 0.7) / view.s} style={{ cursor: "pointer", transition: "fill-opacity .12s" }}
                onMouseEnter={() => setHi(b.key)} onClick={(e) => { e.stopPropagation(); if (!drag.current || !drag.current.moved) openBubble(b); }} />;
            })}
          </g>
        </svg>
      </div>

      {/* breakdown list */}
      <div style={{ marginTop: "var(--gap)" }}>
        <div className="r-mono" style={{ fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: 10 }}>
          {focus ? "Cities in " + focusName : mode === "city" ? "Deepest cities" : "Deepest countries"}
        </div>
        <div style={{ maxHeight: 230, overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px,1fr))", gap: "5px 22px", paddingRight: 4 }}>
          {list.map((t, i) => (
            <div key={(t.code || t.city) + i} className="map-listrow"
              onMouseEnter={() => setHi(focus || mode === "city" ? "c" + cityPts.filter(c => !focus || c.country === focus).indexOf(t) : t.code)} onMouseLeave={() => setHi(null)}
              onClick={() => { if (t.code) openBubble({ kind: "country", c: t }); else { setSel({ kind: "city", key: t.country + "|" + t.city }); setPane("artists"); ensureGeo(); } }}>
              <span style={{ fontSize: 14, width: 20 }}>{t.flag}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.code ? t.name : t.city} <span className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)" }}>· {t.artists}a</span></div>
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

      <style>{`.map-listrow { display: flex; align-items: center; gap: 10px; padding: 3px 4px; border-radius: 5px; cursor: pointer; transition: background .12s; }
        .map-listrow:hover { background: var(--bg-3); }
        .cal-rows { display: grid; gap: 2px; }
        .cal-row { display: flex; align-items: center; gap: 11px; padding: 6px 6px; border-radius: 6px; transition: background .12s; }
        .cal-row[data-link="true"] { cursor: pointer; }
        .cal-row[data-link="true"]:hover { background: var(--bg-3); }
        .cal-rk { font-family: var(--mono); font-size: 10px; color: var(--ink-faint); width: 18px; }
        .cal-nm { font-size: 13.5px; flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cal-pl { font-family: var(--mono); font-size: 11px; color: var(--ink-soft); }`}</style>
    </div>
  );
}
