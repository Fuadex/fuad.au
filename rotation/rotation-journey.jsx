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
// `faint` opts a caller into transparent bands (Fuad 2026-08-20, after three passes on the Overview
// flow). Settled at fill .26 lit, .12 dimmed — the transparent look he wanted, with two corrections
// learned on the way:
//
//   · Lowering opacity alone made it DARKER, not lighter. A band at 18% is mostly the dark card
//     showing through, so the whole flow muddied. `faint` therefore also raises the fill's oklch
//     LIGHTNESS, .62 → .80, and the stroke's to .86. Transparency and lightness are separate knobs
//     and only one of them was the ask.
//   · The stroke opacity goes UP as the fill comes down, .5 → .8, because at this fill the edges are
//     what separate one band from its neighbour.
//
// A detour through the map bubbles' exact numbers (.72/.34) was tried and rejected as too solid.
// Opt-in rather than a change to the primitive: the same StreamGraph draws the artist-page flow and
// the Journey, where the original contrast is the point.
const SG_BANDS = {
  solid: { on: 0.82, hi: 0.96, off: 0.15, strokeOn: 0.5, strokeOff: 0.12, L: 0.62, sL: 0.72 },
  faint: { on: 0.26, hi: 0.52, off: 0.12, strokeOn: 0.8, strokeOff: 0.22, L: 0.80, sL: 0.86 },
};
function StreamGraph({ series, years, hi, setHi, onPick, clickable, markYi, fixedH, faint }) {
  const BO = faint ? SG_BANDS.faint : SG_BANDS.solid;
  const L = React.useMemo(() => {
    const com = series.map(s => { let n = 0, d = 0; s.vals.forEach((v, i) => { n += v * years[i]; d += v; }); return d ? n / d : 9999; });
    const order = series.map((s, i) => i).sort((a, b) => com[a] - com[b]);
    const totals = years.map((y, yi) => order.reduce((acc, i) => acc + series[i].vals[yi], 0));
    const maxTotal = Math.max(...totals, 1);
    // height grows past ~10 series so a family with many subgenres expands to fill the module
    // container instead of squashing into unreadable slivers (Fuad 2026-07-06). `fixedH` pins it
    // (the Overview map band passes it) so drilling genres of different subgenre counts doesn't
    // change the flow's height and shove the whole row-2 down (Fuad 2026-07-07).
    const W = 1000, H = fixedH || Math.min(920, 500 + Math.max(0, series.length - 10) * 30), padX = 26, padTop = 22, padBot = 42, innerH = H - padTop - padBot, midY = padTop + innerH / 2, yScale = innerH / maxTotal;
    const xAt = (yi) => padX + (years.length === 1 ? 0 : yi / (years.length - 1)) * (W - 2 * padX);
    const bands = series.map(() => []);
    years.forEach((y, yi) => { let acc = -totals[yi] / 2; order.forEach(i => { const v = series[i].vals[yi]; bands[i].push({ x: xAt(yi), yTop: midY - (acc + v) * yScale, yBot: midY - acc * yScale }); acc += v; }); });
    const area = (i) => { const b = bands[i]; const top = b.map(p => [p.x, p.yTop]), bot = b.map(p => [p.x, p.yBot]).reverse(); return `M ${top[0][0].toFixed(1)} ${top[0][1].toFixed(1)}` + _segs(top) + ` L ${bot[0][0].toFixed(1)} ${bot[0][1].toFixed(1)}` + _segs(bot) + " Z"; };
    const peak = {}; order.forEach(i => { let by = 0; series[i].vals.forEach((v, yi) => { if (v > series[i].vals[by]) by = yi; }); peak[i] = { yi: by, year: years[by], share: totals[by] ? series[i].vals[by] / totals[by] : 0 }; });
    return { order, bands, area, peak, W, H, xAt };
  }, [series, years, fixedH]);

  return (
    <svg viewBox={`0 0 ${L.W} ${L.H}`} style={{ width: "100%", height: "auto", display: "block" }} onMouseLeave={() => setHi(-1)}>
      {L.order.map(i => {
        const on = hi < 0 || hi === i, s = series[i];
        const fill = s.mute ? "oklch(0.5 0.02 270)" : `oklch(${BO.L} 0.17 ${s.hue})`;
        const strk = s.mute ? "oklch(0.62 0.02 270)" : `oklch(${BO.sL} 0.16 ${s.hue})`;
        return (
          <path key={s.key} d={L.area(i)} fill={fill} fillOpacity={on ? (hi === i ? BO.hi : BO.on) : BO.off}
            stroke={strk} strokeWidth={hi === i ? 1.4 : 0.5} strokeOpacity={on ? BO.strokeOn : BO.strokeOff}
            style={{ cursor: clickable ? "pointer" : "default", transition: "fill-opacity .15s" }}
            onMouseEnter={() => setHi(i)} onClick={() => onPick && onPick(s, i)}>
            <title>{s.name} · peak {L.peak[i].year} ({Math.round(L.peak[i].share * 100)}%)</title>
          </path>
        );
      })}
      {L.order.map(i => {
        const b = L.bands[i][L.peak[i].yi], thick = b.yBot - b.yTop, s = series[i];
        if (thick < 17 && hi !== i) return null;
        // Label stays white at every state (Fuad 2026-08-20). The hovered one used to flip to
        // near-black, which only worked because the hovered band was painted at 96% — it assumed a
        // solid fill behind the text. The shadow stays on for the same reason: it is what keeps the
        // label legible now that a band is mostly transparent.
        return (
          <text key={"t" + s.key} x={b.x} y={(b.yTop + b.yBot) / 2} textAnchor="middle" dominantBaseline="middle"
            fontFamily="var(--sans)" fontWeight="600" fontSize={hi === i ? 13 : 10.5}
            fill="rgba(255,255,255,.96)" style={{ pointerEvents: "none", textShadow: "0 1px 3px rgba(0,0,0,.6)" }}>
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
