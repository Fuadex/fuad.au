// rotation-constellation.jsx — the library as an explorable graph. Nodes = kept artists
// (size = plays, colour = family), edges = shared band members ("via …") + last.fm similarity.
// Layout is pre-computed in build-data.js. Click a star to focus its ego-network and read its
// links; drag to pan, scroll / +- to zoom, click a neighbour to walk the graph.

function ConstellationView({ go }) {
  const R = window.ROTATION;
  const C = R.CONSTELLATION;
  const svgRef = React.useRef(null);
  const [hover, setHover] = React.useState(-1);
  const [focus, setFocus] = React.useState(-1);
  const [famHi, setFamHi] = React.useState(null);
  const [view, setView] = React.useState({ s: 1, x: 0, y: 0 });
  const drag = React.useRef(null);

  // adjacency with the connection reason
  const nbr = React.useMemo(() => {
    const a = C.nodes.map(() => []);
    for (const [i, j, via] of C.edges) { a[i].push({ k: j, via }); a[j].push({ k: i, via }); }
    return a;
  }, [C]);

  const active = focus >= 0 ? focus : hover;
  const nbrSet = React.useMemo(() => active < 0 ? null : new Set(nbr[active].map(n => n.k)), [active, nbr]);
  const lit = (i) => active < 0 ? (famHi == null || C.nodes[i].fam === famHi) : (i === active || nbrSet.has(i));

  // zoom helpers
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const toSvg = (clientX, clientY) => { const r = svgRef.current.getBoundingClientRect(); return [(clientX - r.left) / r.width * C.w, (clientY - r.top) / r.height * C.h]; };
  const zoomAt = (sx, sy, factor) => setView(v => {
    const ns = clamp(v.s * factor, 0.6, 6);
    return { s: ns, x: sx - (sx - v.x) / v.s * ns, y: sy - (sy - v.y) / v.s * ns };
  });
  React.useEffect(() => {
    const el = svgRef.current; if (!el) return;
    const onWheel = (e) => { e.preventDefault(); const [sx, sy] = toSvg(e.clientX, e.clientY); zoomAt(sx, sy, e.deltaY < 0 ? 1.12 : 1 / 1.12); };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);
  const onDown = (e) => { drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false }; };
  const onMove = (e) => {
    if (!drag.current) return;
    const r = svgRef.current.getBoundingClientRect();
    const dx = (e.clientX - drag.current.x) / r.width * C.w, dy = (e.clientY - drag.current.y) / r.height * C.h;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.current.moved = true;
    setView(v => ({ ...v, x: drag.current.vx + dx, y: drag.current.vy + dy }));
  };
  const onUp = () => { drag.current = null; };
  const reset = () => { setView({ s: 1, x: 0, y: 0 }); setFocus(-1); };

  const F = focus >= 0 ? C.nodes[focus] : null;

  return (
    <div className="r-view">
      <div className="r-viewhead">
        <div>
          <div className="r-kicker">Constellation · {C.nodes.length} artists · {C.edges.length} links</div>
          <h1 className="r-title">The <em>web</em><span className="dot">.</span></h1>
        </div>
        <p className="r-lede">Your library wired by <b>shared members</b> and <b>last.fm similarity</b>, clustered by genre.
          Click a star to trace its bloodline; drag to pan, scroll to zoom.</p>
      </div>

      <div className="r-card cst-wrap" style={{ padding: 0, overflow: "hidden", position: "relative" }}>
        <svg ref={svgRef} viewBox={`0 0 ${C.w} ${C.h}`} className="cst-svg"
          style={{ width: "100%", height: "auto", display: "block", cursor: drag.current ? "grabbing" : "grab", touchAction: "none" }}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={() => { onUp(); setHover(-1); }}
          onClick={() => { if (!drag.current || !drag.current.moved) setFocus(-1); }}>
          <g transform={`translate(${view.x} ${view.y}) scale(${view.s})`}>
            <g>
              {C.edges.map(([i, j, via], e) => {
                const on = active >= 0 && (i === active || j === active);
                const op = active < 0 ? (famHi == null ? 0.45 : ((C.nodes[i].fam === famHi || C.nodes[j].fam === famHi) ? 0.4 : 0.05)) : (on ? 0.85 : 0.04);
                return <line key={e} x1={C.nodes[i].x} y1={C.nodes[i].y} x2={C.nodes[j].x} y2={C.nodes[j].y}
                  stroke={on ? (via ? "var(--accent)" : "var(--ink-faint)") : "var(--rule-2)"} strokeWidth={(on ? 1.5 : 0.6) / view.s} opacity={op} />;
              })}
            </g>
            {C.nodes.map((n, i) => {
              const on = lit(i);
              const showLabel = (active === i) || (on && n.r > 13 && active < 0) || (active >= 0 && nbrSet && nbrSet.has(i));
              return (
                <g key={n.id} style={{ cursor: "pointer" }}
                  onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(-1)}
                  onClick={(e) => { e.stopPropagation(); if (!drag.current || !drag.current.moved) setFocus(i === focus ? -1 : i); }}>
                  <circle cx={n.x} cy={n.y} r={n.r} fill={`oklch(0.62 0.16 ${n.hue})`} fillOpacity={on ? 0.9 : 0.12}
                    stroke={`oklch(0.74 0.16 ${n.hue})`} strokeWidth={(focus === i ? 2.6 : hover === i ? 2 : 0.8) / view.s} style={{ transition: "fill-opacity .15s" }} />
                  {showLabel && <text x={n.x} y={n.y - n.r - 4 / view.s} textAnchor="middle" fontSize={(active === i ? 13 : 10) / view.s}
                    fill="var(--ink)" fontFamily="var(--sans)" fontWeight="600" style={{ pointerEvents: "none" }}>{n.name}</text>}
                </g>
              );
            })}
          </g>
        </svg>

        {/* zoom controls */}
        <div className="cst-ctl">
          <button onClick={() => zoomAt(C.w / 2, C.h / 2, 1.25)}>+</button>
          <button onClick={() => zoomAt(C.w / 2, C.h / 2, 1 / 1.25)}>−</button>
          <button onClick={reset} title="reset">⟲</button>
        </div>

        {/* focus detail panel */}
        {F && (
          <div className="cst-panel">
            <div className="cst-panel-h">
              <span style={{ width: 11, height: 11, borderRadius: 3, background: `oklch(0.62 0.16 ${F.hue})`, flex: "none" }} />
              <b onClick={() => go("artist", F.id)} style={{ cursor: "pointer", fontSize: 15 }}>{F.name}</b>
              <span className="cst-x" onClick={() => setFocus(-1)}>✕</span>
            </div>
            <div className="cst-panel-sub">{nbr[focus].length} connection{nbr[focus].length !== 1 ? "s" : ""} · <span onClick={() => go("artist", F.id)} style={{ color: "var(--accent)", cursor: "pointer" }}>open page ↗</span></div>
            <div className="cst-links">
              {nbr[focus].slice().sort((a, b) => (b.via ? 1 : 0) - (a.via ? 1 : 0)).map((l, x) => (
                <div key={x} className="cst-link" onClick={() => setFocus(l.k)}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: `oklch(0.62 0.16 ${C.nodes[l.k].hue})`, flex: "none" }} />
                  <span style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{C.nodes[l.k].name}</span>
                  <span className="cst-via">{l.via ? "via " + l.via : "similar"}</span>
                </div>
              ))}
              {nbr[focus].length === 0 && <div className="cst-via" style={{ padding: "4px 2px" }}>No links in your library — a lone star.</div>}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 16 }}>
        {R.FAMILIES.map(f => (
          <div key={f.i} onMouseEnter={() => setFamHi(f.i)} onMouseLeave={() => setFamHi(null)}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, cursor: "default", opacity: famHi == null || famHi === f.i ? 1 : 0.38, transition: ".15s" }}>
            <span style={{ width: 11, height: 11, borderRadius: 3, background: `oklch(0.62 0.16 ${f.hue})` }} />
            <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>{f.family}</span>
          </div>
        ))}
      </div>

      <style>{`
        .cst-ctl { position: absolute; top: 12px; right: 12px; display: flex; flex-direction: column; gap: 6px; }
        .cst-ctl button { width: 30px; height: 30px; border-radius: 7px; border: 1px solid var(--rule-2); background: var(--bg-2);
          color: var(--ink-soft); font-size: 16px; cursor: pointer; transition: .12s; display: flex; align-items: center; justify-content: center; }
        .cst-ctl button:hover { color: var(--ink); border-color: var(--accent-dim); }
        .cst-panel { position: absolute; top: 12px; left: 12px; width: min(280px, 70%); background: var(--bg-2);
          border: 1px solid var(--rule-2); border-radius: 10px; padding: 12px 14px; box-shadow: 0 18px 44px -14px rgba(0,0,0,.7); }
        .cst-panel-h { display: flex; align-items: center; gap: 9px; }
        .cst-panel-h b { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cst-x { color: var(--ink-faint); cursor: pointer; font-size: 12px; }
        .cst-panel-sub { font-family: var(--mono); font-size: 10px; color: var(--ink-faint); margin: 4px 0 10px; }
        .cst-links { display: grid; gap: 3px; max-height: 280px; overflow-y: auto; }
        .cst-link { display: flex; align-items: center; gap: 8px; padding: 4px 6px; border-radius: 5px; cursor: pointer; font-size: 12px; transition: background .12s; }
        .cst-link:hover { background: var(--bg-3); }
        .cst-via { font-family: var(--mono); font-size: 9px; color: var(--ink-faint); white-space: nowrap; }
        @media (max-width: 640px) { .cst-panel { width: calc(100% - 24px); } }
      `}</style>
    </div>
  );
}
