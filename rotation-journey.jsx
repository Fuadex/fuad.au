// rotation-journey.jsx — the taste-journey streamgraph, now multi-level. Three lenses over the
// same river: genre families (default), a family drilled into its subgenres, and top artists.
// x = year, ribbon thickness = plays that year. Data = GENRE_FLOW / SUB_FLOW / EXPLORE.yp.

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
function StreamGraph({ series, years, hi, setHi, onPick, clickable }) {
  const L = React.useMemo(() => {
    const com = series.map(s => { let n = 0, d = 0; s.vals.forEach((v, i) => { n += v * years[i]; d += v; }); return d ? n / d : 9999; });
    const order = series.map((s, i) => i).sort((a, b) => com[a] - com[b]);
    const totals = years.map((y, yi) => order.reduce((acc, i) => acc + series[i].vals[yi], 0));
    const maxTotal = Math.max(...totals, 1);
    const W = 1000, H = 500, padX = 26, padTop = 22, padBot = 42, innerH = H - padTop - padBot, midY = padTop + innerH / 2, yScale = innerH / maxTotal;
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
        return (
          <path key={s.key} d={L.area(i)} fill={`oklch(0.62 0.17 ${s.hue})`} fillOpacity={on ? (hi === i ? 0.96 : 0.82) : 0.15}
            stroke={`oklch(0.72 0.16 ${s.hue})`} strokeWidth={hi === i ? 1.4 : 0.5} strokeOpacity={on ? 0.5 : 0.12}
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
      {years.map((y, yi) => (
        <text key={"y" + yi} x={L.xAt(yi)} y={L.H - 16} textAnchor="middle" fontFamily="var(--mono)" fontSize="10"
          fill="var(--ink-faint)" opacity={yi % 2 === 0 || yi === years.length - 1 ? 1 : 0}>{"'" + String(y).slice(2)}</text>
      ))}
    </svg>
  );
}

function JourneyView({ go }) {
  const R = window.ROTATION;
  const GF = R.GENRE_FLOW, SF = R.SUB_FLOW;
  const yearsArr = GF.years.map(y => y.year);
  const [mode, setMode] = React.useState("genres"); // genres | artists
  const [drill, setDrill] = React.useState(null);    // family index when drilled into subgenres
  const [hi, setHi] = React.useState(-1);

  const series = React.useMemo(() => {
    if (mode === "artists") {
      return R.EXPLORE.slice().sort((a, b) => b.plays - a.plays).slice(0, 12)
        .map(a => ({ key: a.id, name: a.name, hue: a.hue, id: a.id, vals: yearsArr.map(y => a.yp ? (a.yp[y] || 0) : 0) }));
    }
    if (drill != null) {
      const fhue = (GF.families.find(f => f.i === drill) || {}).hue || 0;
      const subs = R.SUBS.map((s, i) => ({ s, i })).filter(o => o.s.fam === drill);
      return subs.map((o, idx) => ({
        key: o.i, name: o.s.name, hue: (fhue + (idx - (subs.length - 1) / 2) * 17 + 360) % 360,
        vals: SF.rows.map(r => r[o.i]),
      })).filter(se => se.vals.some(v => v > 0));
    }
    return GF.families.map(f => ({ key: f.i, name: f.family, hue: f.hue, fam: f.i, vals: GF.years.map(y => y.fams[f.i]) }))
      .filter(se => se.vals.some(v => v > 0));
  }, [mode, drill, R]);

  const onPick = (s) => {
    if (mode === "artists") go("artist", s.id);
    else if (drill == null) { setDrill(s.fam); setHi(-1); }   // genre → drill into its subgenres
  };

  const drillName = drill != null ? (GF.families.find(f => f.i === drill) || {}).family : null;

  return (
    <div className="r-view">
      <div className="r-viewhead">
        <div>
          <div className="r-kicker">Journey · {yearsArr[0]} — {yearsArr[yearsArr.length - 1]}</div>
          <h1 className="r-title">How it <em>flowed</em><span className="dot">.</span></h1>
        </div>
        <div className="r-seg" style={{ alignSelf: "flex-end" }}>
          {[["genres", "Genres"], ["artists", "Artists"]].map(([k, lbl]) =>
            <button key={k} data-on={mode === k} onClick={() => { setMode(k); setDrill(null); setHi(-1); }}>{lbl}</button>)}
        </div>
      </div>

      <p className="r-lede" style={{ marginTop: "-8px", marginBottom: "var(--gap)" }}>
        {mode === "artists"
          ? <>Your twelve most-played artists as ribbons over time — who carried which years.</>
          : drill != null
            ? <>Inside <b style={{ color: "var(--ink)" }}>{drillName}</b> — its subgenres flowing year by year. <span className="jy-back" onClick={() => { setDrill(null); setHi(-1); }}>‹ all genres</span></>
            : <>Each ribbon is a genre family; thickness is how much you played it that year. <b>Click any genre to break it into its subgenres.</b></>}
      </p>

      <div className="r-card" style={{ padding: "10px 8px 4px", overflow: "hidden" }}>
        {series.length === 0
          ? <div style={{ padding: 60, textAlign: "center", color: "var(--ink-faint)", fontFamily: "var(--mono)", fontSize: 12 }}>Nothing to flow here.</div>
          : <StreamGraph series={series} years={yearsArr} hi={hi} setHi={setHi} onPick={onPick} clickable={mode === "artists" || drill == null} />}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 16 }}>
        {series.map((s, i) => (
          <div key={s.key} onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(-1)}
            onClick={() => onPick(s)} style={{ display: "inline-flex", alignItems: "center", gap: 7, cursor: (mode === "artists" || drill == null) ? "pointer" : "default", opacity: hi < 0 || hi === i ? 1 : 0.36, transition: ".15s" }}>
            <span style={{ width: 11, height: 11, borderRadius: 3, background: `oklch(0.62 0.16 ${s.hue})` }} />
            <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>{s.name}</span>
          </div>
        ))}
      </div>

      <style>{`
        .jy-back { color: var(--accent); cursor: pointer; font-family: var(--mono); font-size: 11px; letter-spacing: .04em; margin-left: 8px; }
        .jy-back:hover { text-decoration: underline; }
      `}</style>
    </div>
  );
}
