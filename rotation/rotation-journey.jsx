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
// `faint` opts a caller into transparent bands. Tuned over five passes on the Overview flow with
// Fuad (2026-08-20) — the log matters, because each rejection ruled out a different knob and the
// three are easy to confuse:
//
//   · OPACITY alone. Dropping to .18 at the original lightness read as too DARK, not lighter: a
//     mostly-transparent band is mostly the dark card showing through.
//   · The map bubbles' exact numbers (.72 lit / .34 dimmed) — rejected as too solid.
//   · LIGHTNESS. Lifting the fill to .80 to counter the darkness went chalky: pale and milky, high
//     lightness against moderate chroma reads as pastel.
//
// Landed on all three moving together: dim (L .66, between the two failures), saturated (C .17 →
// .20, so it stays coloured rather than greying out as the fill drops) and genuinely transparent
// (.16 lit, .07 dimmed). Chroma is the knob that was missing for the first four passes — it is what
// lets a band be both dim and clearly its own hue, which is what "dimmer, more transparent" needs.
//
// Sixth pass, strokes only: the fill was right but the outlines were limp next to the map bubbles
// beside them. The bubbles set no strokeOpacity at all, i.e. they draw their rim at FULL opacity in
// the fill's own colour — that is the whole difference. So the band stroke goes .6 → .92 lit, and
// thickens at rest, .5 → .85, to match a bubble's resting rim. With a fill this transparent the
// stroke is doing most of the drawing anyway; it should be the confident part.
//
// Opt-in rather than a change to the primitive: the same StreamGraph draws the artist-page flow and
// the Journey, where the original contrast is the point.
const SG_BANDS = {
  solid: { on: 0.82, hi: 0.96, off: 0.15, L: 0.62, C: 0.17, sL: 0.72, sC: 0.16,
           strokeOn: 0.5, strokeHi: 0.5, strokeOff: 0.12, w: 0.5, wHi: 1.4, sLHi: 0.72, sCHi: 0.16 },
  // resting strokes sit halfway between the limp originals and the neon pass; the HOVERED band keeps
  // the full-strength version, which is where Fuad wanted that energy (2026-08-20). Splitting the two
  // is the point: at rest the flow should read quietly, and the thing under your cursor should not.
  faint: { on: 0.16, hi: 0.38, off: 0.07, L: 0.66, C: 0.20, sL: 0.74, sC: 0.20,
           strokeOn: 0.74, strokeHi: 0.95, strokeOff: 0.22, w: 0.65, wHi: 1.9, sLHi: 0.80, sCHi: 0.25 },
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
        const lit = hi === i;
        const fill = s.mute ? "oklch(0.5 0.02 270)" : `oklch(${BO.L} ${BO.C} ${s.hue})`;
        const strk = s.mute ? "oklch(0.62 0.02 270)"
          : `oklch(${lit ? BO.sLHi : BO.sL} ${lit ? BO.sCHi : BO.sC} ${s.hue})`;
        return (
          <path key={s.key} d={L.area(i)} fill={fill} fillOpacity={on ? (lit ? BO.hi : BO.on) : BO.off}
            stroke={strk} strokeWidth={lit ? BO.wHi : BO.w}
            strokeOpacity={on ? (lit ? BO.strokeHi : BO.strokeOn) : BO.strokeOff}
            style={{ cursor: clickable ? "pointer" : "default",
              transition: "fill-opacity .15s, stroke-opacity .15s, stroke-width .15s ease-out, stroke .15s" }}
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
          // font-size lives in `style`, not as an SVG attribute, so it can actually be transitioned —
          // a presentation attribute swap just snaps (Fuad 2026-08-20). Same curve as the band's own
          // stroke so the label grows with the outline rather than a beat behind it.
          <text key={"t" + s.key} x={b.x} y={(b.yTop + b.yBot) / 2} textAnchor="middle" dominantBaseline="middle"
            fontFamily="var(--sans)" fontWeight="600" fill="rgba(255,255,255,.96)"
            style={{ pointerEvents: "none", textShadow: "0 1px 3px rgba(0,0,0,.6)",
              fontSize: (hi === i ? 13 : 10.5) + "px", transition: "font-size .16s cubic-bezier(.22,.68,.36,1)" }}>
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
