// rotation-constellation.jsx — the library as a graph. Nodes = kept artists (size = plays,
// colour = family), edges = shared band members + last.fm similarity. Layout is pre-computed
// in build-data.js; this just renders it with hover-highlight + a family legend.

function ConstellationView({ go }) {
  const R = window.ROTATION;
  const C = R.CONSTELLATION;
  const [hover, setHover] = React.useState(-1);
  const [famHi, setFamHi] = React.useState(null);

  const adj = React.useMemo(() => {
    const a = C.nodes.map(() => new Set());
    for (const [i, j] of C.edges) { a[i].add(j); a[j].add(i); }
    return a;
  }, [C]);

  const lit = (i) => hover < 0 ? (famHi == null || C.nodes[i].fam === famHi) : (i === hover || adj[hover].has(i));

  return (
    <div className="r-view">
      <div className="r-viewhead">
        <div>
          <div className="r-kicker">Constellation · {C.nodes.length} artists · {C.edges.length} links</div>
          <h1 className="r-title">The <em>web</em><span className="dot">.</span></h1>
        </div>
        <p className="r-lede">Your library as a graph — wired by <b>shared members</b> and <b>last.fm similarity</b>,
          clustered by genre. Hover a star to light its neighbours; click to open.</p>
      </div>

      <div className="r-card" style={{ padding: 0, overflow: "hidden" }}>
        <svg viewBox={`0 0 ${C.w} ${C.h}`} style={{ width: "100%", height: "auto", display: "block" }}
          onMouseLeave={() => setHover(-1)}>
          <g>
            {C.edges.map(([i, j], e) => {
              const on = hover >= 0 && (i === hover || j === hover);
              const op = hover < 0 ? (famHi == null ? 0.5 : ((C.nodes[i].fam === famHi || C.nodes[j].fam === famHi) ? 0.4 : 0.06)) : (on ? 0.9 : 0.05);
              return <line key={e} x1={C.nodes[i].x} y1={C.nodes[i].y} x2={C.nodes[j].x} y2={C.nodes[j].y}
                stroke={on ? "var(--accent)" : "var(--rule-2)"} strokeWidth={on ? 1.5 : 0.6} opacity={op} />;
            })}
          </g>
          {C.nodes.map((n, i) => {
            const on = lit(i);
            const showLabel = (hover === i) || (on && n.r > 13);
            return (
              <g key={n.id} style={{ cursor: "pointer" }} onMouseEnter={() => setHover(i)} onClick={() => go("artist", n.id)}>
                <circle cx={n.x} cy={n.y} r={n.r} fill={`oklch(0.62 0.16 ${n.hue})`} fillOpacity={on ? 0.88 : 0.13}
                  stroke={`oklch(0.72 0.16 ${n.hue})`} strokeWidth={hover === i ? 2.2 : 0.8} style={{ transition: "fill-opacity .15s" }} />
                {showLabel && <text x={n.x} y={n.y - n.r - 4} textAnchor="middle" fontSize={hover === i ? 13 : 10}
                  fill="var(--ink)" fontFamily="var(--sans)" fontWeight="600" style={{ pointerEvents: "none" }}>{n.name}</text>}
              </g>
            );
          })}
        </svg>
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
    </div>
  );
}
