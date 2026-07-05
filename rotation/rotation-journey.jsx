// rotation-journey.jsx — the StreamGraph primitive (shared). The taste-journey itself now lives in
// the Map tab (rotation-worldmap.jsx → MapFlow): genre families → subgenres → the bands behind a
// slice, as ribbons over time, wired into the map's place / genre / year cross-filter. This file is
// just the reusable streamgraph, also used by per-artist album/song flows on artist pages.

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

// generic streamgraph over `series` ([{key,name,hue,vals:[per year]}]) and `years` ([nums])
function StreamGraph({ series, years, hi, setHi, onPick, clickable, markYi }) {
  const L = React.useMemo(() => {
    const com = series.map(s => { let n = 0, d = 0; s.vals.forEach((v, i) => { n += v * years[i]; d += v; }); return d ? n / d : 9999; });
    const order = series.map((s, i) => i).sort((a, b) => com[a] - com[b]);
    const totals = years.map((y, yi) => order.reduce((acc, i) => acc + series[i].vals[yi], 0));
    const maxTotal = Math.max(...totals, 1);
    // height grows past ~10 series so a family with many subgenres expands to fill the module
    // container instead of squashing into unreadable slivers (Fuad 2026-07-06)
    const W = 1000, H = Math.min(920, 500 + Math.max(0, series.length - 10) * 30), padX = 26, padTop = 22, padBot = 42, innerH = H - padTop - padBot, midY = padTop + innerH / 2, yScale = innerH / maxTotal;
    const xAt = (yi) => padX + (years.length === 1 ? 0 : yi / (years.length - 1)) * (W - 2 * padX);
    const bands = series.map(() => []);
    years.forEach((y, yi) => { let acc = -totals[yi] / 2; order.forEach(i => { const v = series[i].vals[yi]; bands[i].push({ x: xAt(yi), yTop: midY - (acc + v) * yScale, yBot: midY - acc * yScale }); acc += v; }); });
    const area = (i) => { const b = bands[i]; const top = b.map(p => [p.x, p.yTop]), bot = b.map(p => [p.x, p.yBot]).reverse(); return `M ${top[0][0].toFixed(1)} ${top[0][1].toFixed(1)}` + _segs(top) + ` L ${bot[0][0].toFixed(1)} ${bot[0][1].toFixed(1)}` + _segs(bot) + " Z"; };
    const peak = {}; order.forEach(i => { let by = 0; series[i].vals.forEach((v, yi) => { if (v > series[i].vals[by]) by = yi; }); peak[i] = { yi: by, year: years[by], share: totals[by] ? series[i].vals[by] / totals[by] : 0 }; });
    return { order, bands, area, peak, W, H, xAt };
  }, [series, years]);

  return (
    <svg viewBox={`0 0 ${L.W} ${L.H}`} style={{ width: "100%", height: "auto", display: "block" }} onMouseLeave={() => setHi(-1)}>
      {L.order.map(i => {
        const on = hi < 0 || hi === i, s = series[i];
        const fill = s.mute ? "oklch(0.5 0.02 270)" : `oklch(0.62 0.17 ${s.hue})`;
        const strk = s.mute ? "oklch(0.62 0.02 270)" : `oklch(0.72 0.16 ${s.hue})`;
        return (
          <path key={s.key} d={L.area(i)} fill={fill} fillOpacity={on ? (hi === i ? 0.96 : 0.82) : 0.15}
            stroke={strk} strokeWidth={hi === i ? 1.4 : 0.5} strokeOpacity={on ? 0.5 : 0.12}
            style={{ cursor: clickable ? "pointer" : "default", transition: "fill-opacity .15s" }}
            onMouseEnter={() => setHi(i)} onClick={() => onPick && onPick(s, i)}>
            <title>{s.name} · peak {L.peak[i].year} ({Math.round(L.peak[i].share * 100)}%)</title>
          </path>
        );
      })}
      {L.order.map(i => {
        const b = L.bands[i][L.peak[i].yi], thick = b.yBot - b.yTop, s = series[i];
        if (thick < 17 && hi !== i) return null;
        return (
          <text key={"t" + s.key} x={b.x} y={(b.yTop + b.yBot) / 2} textAnchor="middle" dominantBaseline="middle"
            fontFamily="var(--sans)" fontWeight="600" fontSize={hi === i ? 13 : 10.5}
            fill={hi === i ? "#0c0a08" : "rgba(255,255,255,.92)"} style={{ pointerEvents: "none", textShadow: hi === i ? "none" : "0 1px 3px rgba(0,0,0,.6)" }}>
            {s.name.length > 18 ? s.name.slice(0, 16) + "…" : s.name}
          </text>
        );
      })}
      {markYi != null && markYi >= 0 && (
        <line x1={L.xAt(markYi)} y1={6} x2={L.xAt(markYi)} y2={L.H - 30} stroke="var(--accent)" strokeWidth="1.4" strokeDasharray="3 3" opacity="0.85" style={{ pointerEvents: "none" }} />
      )}
      {years.map((y, yi) => (
        <text key={"y" + yi} x={L.xAt(yi)} y={L.H - 16} textAnchor="middle" fontFamily="var(--mono)" fontSize="10"
          fill={markYi === yi ? "var(--accent)" : "var(--ink-faint)"} fontWeight={markYi === yi ? 700 : 400}
          opacity={yi % 2 === 0 || yi === years.length - 1 || markYi === yi ? 1 : 0}>{"'" + String(y).slice(2)}</text>
      ))}
    </svg>
  );
}
