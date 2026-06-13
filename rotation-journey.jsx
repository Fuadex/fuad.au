// rotation-journey.jsx — the taste-journey streamgraph. Genre families flow and hand off across
// the years (data = window.ROTATION.GENRE_FLOW). x = year, band thickness = plays that year,
// each ribbon = a genre family. Replaces the old constellation as the "how did I get here" view.

// Catmull-Rom → cubic-bezier smoothing for flowing ribbon edges.
function _segs(pts) {
  let d = "";
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || pts[i + 1];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

function JourneyView({ go }) {
  const R = window.ROTATION;
  const F = R.GENRE_FLOW;
  const [hi, setHi] = React.useState(-1);

  const L = React.useMemo(() => {
    const fams = F.families, years = F.years;
    const total = fams.map((f, i) => years.reduce((s, y) => s + y.fams[i], 0));
    const active = fams.map((f, i) => i).filter(i => total[i] > 0);
    const com = (i) => { let n = 0, d = 0; years.forEach(y => { n += y.fams[i] * y.year; d += y.fams[i]; }); return d ? n / d : 9999; };
    const order = active.slice().sort((a, b) => com(a) - com(b));
    const totals = years.map(y => order.reduce((s, i) => s + y.fams[i], 0));
    const maxTotal = Math.max(...totals, 1);
    const W = 1000, H = 520, padX = 26, padTop = 26, padBot = 44, innerH = H - padTop - padBot, midY = padTop + innerH / 2;
    const yScale = innerH / maxTotal;
    const xAt = (yi) => padX + (years.length === 1 ? 0 : yi / (years.length - 1)) * (W - 2 * padX);
    const bands = {}; order.forEach(i => bands[i] = []);
    years.forEach((y, yi) => {
      let acc = -totals[yi] / 2;
      order.forEach(i => { const v = y.fams[i]; bands[i].push({ x: xAt(yi), yTop: midY - (acc + v) * yScale, yBot: midY - acc * yScale, v }); acc += v; });
    });
    const area = (i) => {
      const b = bands[i];
      const top = b.map(p => [p.x, p.yTop]), bot = b.map(p => [p.x, p.yBot]).reverse();
      return `M ${top[0][0].toFixed(1)} ${top[0][1].toFixed(1)}` + _segs(top) + ` L ${bot[0][0].toFixed(1)} ${bot[0][1].toFixed(1)}` + _segs(bot) + " Z";
    };
    const peak = {}; order.forEach(i => { let by = 0; years.forEach((y, yi) => { if (y.fams[i] > years[by].fams[i]) by = yi; }); peak[i] = { yi: by, year: years[by].year, share: years[by].fams[i] / totals[by] }; });
    return { fams, years, order, bands, area, peak, W, H, midY, padBot, xAt, totals };
  }, [F]);

  const famName = (i) => L.fams[i].family;

  return (
    <div className="r-view">
      <div className="r-viewhead">
        <div>
          <div className="r-kicker">Journey · {L.years[0].year} — {L.years[L.years.length - 1].year}</div>
          <h1 className="r-title">How it <em>flowed</em><span className="dot">.</span></h1>
        </div>
        <p className="r-lede">Every genre you've lived in, as a river over time. Each ribbon is a family;
          its <b>thickness</b> is how much you played it that year. Watch the handoffs —
          <b> thrash giving way to metalcore giving way to the Tokyo underground</b>.</p>
      </div>

      <div className="r-card" style={{ padding: "10px 8px 4px", overflow: "hidden" }}>
        <svg viewBox={`0 0 ${L.W} ${L.H}`} style={{ width: "100%", height: "auto", display: "block" }} onMouseLeave={() => setHi(-1)}>
          {L.order.map(i => {
            const on = hi < 0 || hi === i;
            return (
              <path key={i} d={L.area(i)} fill={`oklch(0.62 0.17 ${L.fams[i].hue})`} fillOpacity={on ? (hi === i ? 0.95 : 0.82) : 0.16}
                stroke={`oklch(0.7 0.16 ${L.fams[i].hue})`} strokeWidth={hi === i ? 1.4 : 0.5} strokeOpacity={on ? 0.5 : 0.15}
                style={{ cursor: "pointer", transition: "fill-opacity .15s" }}
                onMouseEnter={() => setHi(i)} onClick={() => go("explore")}>
                <title>{famName(i)} · peak {L.peak[i].year} ({Math.round(L.peak[i].share * 100)}%)</title>
              </path>
            );
          })}
          {/* inline labels at each family's thickest point */}
          {L.order.map(i => {
            const b = L.bands[i][L.peak[i].yi], thick = b.yBot - b.yTop;
            if (thick < 18 && hi !== i) return null;
            return (
              <text key={"t" + i} x={b.x} y={(b.yTop + b.yBot) / 2} textAnchor="middle" dominantBaseline="middle"
                fontFamily="var(--sans)" fontWeight="600" fontSize={hi === i ? 13 : 10.5}
                fill={hi === i ? "#0c0a08" : "rgba(255,255,255,.92)"} style={{ pointerEvents: "none", textShadow: hi === i ? "none" : "0 1px 3px rgba(0,0,0,.6)" }}>
                {famName(i)}
              </text>
            );
          })}
          {/* year axis */}
          {L.years.map((y, yi) => (
            <text key={"y" + yi} x={L.xAt(yi)} y={L.H - 16} textAnchor="middle" fontFamily="var(--mono)" fontSize="10"
              fill={hi < 0 ? "var(--ink-faint)" : "var(--ink-faint)"} opacity={yi % 2 === 0 || yi === L.years.length - 1 ? 1 : 0}>{"'" + String(y.year).slice(2)}</text>
          ))}
        </svg>
      </div>

      {/* legend — families in stack order, hover to isolate */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 16 }}>
        {L.order.map(i => (
          <div key={i} onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(-1)}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, cursor: "default", opacity: hi < 0 || hi === i ? 1 : 0.36, transition: ".15s" }}>
            <span style={{ width: 11, height: 11, borderRadius: 3, background: `oklch(0.62 0.16 ${L.fams[i].hue})` }} />
            <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>{famName(i)}</span>
            <span className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)" }}>peak '{String(L.peak[i].year).slice(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
