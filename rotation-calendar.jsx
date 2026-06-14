// rotation-calendar.jsx — the listening calendar: 15 years of daily plays as a contributions-style
// heatmap (one cell per day, years stacked). Data lives in a lazy-loaded calendar.js.

function CalendarView({ go }) {
  const R = window.ROTATION;
  const [cal, setCal] = React.useState(window.ROTATION_CAL || null);
  const [hover, setHover] = React.useState(null);   // { y, d, count, top }
  React.useEffect(() => {
    if (window.ROTATION_CAL) { setCal(window.ROTATION_CAL); return; }
    let s = document.getElementById("rotation-cal-js");
    if (!s) { s = document.createElement("script"); s.id = "rotation-cal-js"; s.src = "calendar.js"; document.head.appendChild(s); }
    const onLoad = () => setCal(window.ROTATION_CAL);
    s.addEventListener("load", onLoad);
    return () => s.removeEventListener("load", onLoad);
  }, []);

  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dateOf = (y, d) => new Date(Date.UTC(y, 0, 1) + d * 86400e3);
  const fmtDate = (dt) => dt.getUTCDate() + " " + MON[dt.getUTCMonth()] + " " + dt.getUTCFullYear();

  if (!cal) return (
    <div className="r-view">
      <div className="r-viewhead"><div><div className="r-kicker">Calendar</div><h1 className="r-title">Every <em>day</em><span className="dot">.</span></h1></div></div>
      <div style={{ padding: 40, color: "var(--ink-faint)", fontFamily: "var(--mono)", fontSize: 12 }}>loading the calendar…</div>
    </div>
  );

  const cell = 9, gap = 2, step = cell + gap, leftPad = 40, topPad = 26, yearGap = 12, rowH = 7 * step;
  const max = cal.max || 1;
  const color = (c) => c <= 0 ? "var(--bg-3)" : `oklch(${(0.3 + (c / max) * 0.5).toFixed(3)} ${(0.04 + (c / max) * 0.13).toFixed(3)} var(--acc-h))`;
  const years = cal.years;
  const W = leftPad + 53 * step + 6;
  const H = topPad + years.length * (rowH + yearGap);

  const hov = hover ? { date: fmtDate(dateOf(hover.y, hover.d)), count: hover.count, top: hover.top } : null;
  const openTop = (name) => { if (name) go("artist", R.slug(name)); };

  return (
    <div className="r-view">
      <div className="r-viewhead">
        <div>
          <div className="r-kicker">Calendar · {years[0]}—{years[years.length - 1]} · {fmt(max)} in a single day</div>
          <h1 className="r-title">Every <em>day</em><span className="dot">.</span></h1>
        </div>
        <p className="r-lede">Fifteen years of listening, one cell a day — darker is more plays. The binges, the dry
          spells, the seasons. Hover a day; click to open who owned it.</p>
      </div>

      <div className="cal-detail">
        {hov
          ? <><b style={{ color: "var(--ink)" }}>{hov.date}</b>{hov.count ? <> · {fmt(hov.count)} plays{hov.top ? <> — mostly <span className="cal-art" onClick={() => openTop(hov.top[0])}>{hov.top[0]}</span> ({hov.top[1]})</> : null}</> : <span style={{ color: "var(--ink-faint)" }}> · quiet</span>}</>
          : <span style={{ color: "var(--ink-faint)" }}>hover a day to see what you played…</span>}
      </div>

      <div className="r-card" style={{ padding: "12px 10px", overflowX: "auto" }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: W, minWidth: 660, height: "auto", display: "block" }}
          onMouseLeave={() => setHover(null)}>
          {(() => { const y = years[0], jd = new Date(Date.UTC(y, 0, 1)).getUTCDay();
            return MON.map((m, mi) => { const fom = Math.round((Date.UTC(y, mi, 1) - Date.UTC(y, 0, 1)) / 86400e3); const col = Math.floor((fom + jd) / 7);
              return <text key={m} x={leftPad + col * step} y={topPad - 12} fontFamily="var(--mono)" fontSize="9" fill="var(--ink-faint)">{m}</text>; });
          })()}
          {years.map((y, yi) => {
            const Y = cal.byYear[y], jd = new Date(Date.UTC(y, 0, 1)).getUTCDay(), gy = topPad + yi * (rowH + yearGap);
            return (
              <g key={y}>
                <text x={leftPad - 8} y={gy + rowH / 2 + 3} textAnchor="end" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-soft)">{"'" + String(y).slice(2)}</text>
                {Y.counts.map((c, d) => {
                  const col = Math.floor((d + jd) / 7), row = (d + jd) % 7, on = hover && hover.y === y && hover.d === d;
                  return <rect key={d} x={leftPad + col * step} y={gy + row * step} width={cell} height={cell} rx={1.5}
                    fill={color(c)} stroke={on ? "var(--ink)" : "none"} strokeWidth={on ? 1 : 0}
                    style={{ cursor: c ? "pointer" : "default" }}
                    onMouseEnter={() => setHover({ y, d, count: c, top: Y.tops[d] || null })}
                    onClick={() => { if (Y.tops[d]) go("artist", R.slug(Y.tops[d][0])); }} />;
                })}
              </g>
            );
          })}
        </svg>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 12, fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-faint)" }}>
        less
        {[0, 0.18, 0.4, 0.68, 1].map((f, i) => <span key={i} style={{ width: 11, height: 11, borderRadius: 2, background: f === 0 ? "var(--bg-3)" : color(f * max) }} />)}
        more
      </div>

      <style>{`
        .cal-detail { font-family: var(--serif); font-size: 15px; color: var(--ink-soft); margin-bottom: 12px; min-height: 22px; }
        .cal-art { color: var(--accent); cursor: pointer; border-bottom: 1px solid currentColor; }
        .cal-art:hover { opacity: .8; }
      `}</style>
    </div>
  );
}
