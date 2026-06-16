// rotation-calendar.jsx — the listening calendar. Tier 1: a contributions-style heatmap of daily
// plays (calendar.js). Tier 2: click a Day/Week/Month to load period summaries (calendar-detail.js,
// only fetched on first drill) and show a bottom overview — top artists/albums/songs + Sound DNA.

function CalendarView({ go }) {
  const R = window.ROTATION;
  const [cal, setCal] = React.useState(window.ROTATION_CAL || null);
  const [detail, setDetail] = React.useState(window.ROTATION_CAL_DETAIL || null);
  const [hover, setHover] = React.useState(null);     // { y, d, count, top }
  const [gran, setGran] = React.useState("month");    // day | week | month
  const [sel, setSel] = React.useState(null);         // selected period key (string)
  const [pane, setPane] = React.useState("artists");  // artists | albums | songs | dna

  React.useEffect(() => {
    if (window.ROTATION_CAL) { setCal(window.ROTATION_CAL); return; }
    let s = document.getElementById("rotation-cal-js");
    if (!s) { s = document.createElement("script"); s.id = "rotation-cal-js"; s.src = "calendar.js"; document.head.appendChild(s); }
    const onLoad = () => setCal(window.ROTATION_CAL);
    s.addEventListener("load", onLoad);
    return () => s.removeEventListener("load", onLoad);
  }, []);
  const ensureDetail = () => {
    if (window.ROTATION_CAL_DETAIL) { setDetail(window.ROTATION_CAL_DETAIL); return; }
    let s = document.getElementById("rotation-cal-detail-js");
    if (!s) { s = document.createElement("script"); s.id = "rotation-cal-detail-js"; s.src = "calendar-detail.js"; document.head.appendChild(s); s.addEventListener("load", () => setDetail(window.ROTATION_CAL_DETAIL)); }
  };
  const avg = React.useMemo(() => { const ks = ["energy", "valence", "acoustic", "tempo", "dance", "instr"]; return ks.map(k => R.ARTISTS.reduce((s, x) => s + x.audio[k], 0) / R.ARTISTS.length); }, []);
  // selected period → ms range, for highlighting cells cheaply. MUST be above the early return
  // below (otherwise the hook count changes once the calendar loads → React crash).
  const selRange = React.useMemo(() => {
    if (!sel) return null;
    if (gran === "month") { const [y, m] = sel.split("-").map(Number); return [Date.UTC(y, m - 1, 1), Date.UTC(y, m, 1) - 86400e3]; }
    const start = new Date(sel + "T00:00:00Z").getTime();
    return gran === "week" ? [start, start + 6 * 86400e3] : [start, start];
  }, [sel, gran]);

  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const MONF = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dateOf = (y, d) => new Date(Date.UTC(y, 0, 1) + d * 86400e3);
  const fmtDate = (dt) => dt.getUTCDate() + " " + MON[dt.getUTCMonth()] + " " + dt.getUTCFullYear();
  const keyFor = (g, dt) => { const iso = dt.toISOString().slice(0, 10); if (g === "day") return iso; if (g === "month") return iso.slice(0, 7); const dow = (dt.getUTCDay() + 6) % 7; return new Date(dt.getTime() - dow * 86400e3).toISOString().slice(0, 10); };

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

  const pick = (y, d) => { const k = keyFor(gran, dateOf(y, d)); setSel(k); ensureDetail(); };  // keep the current pane so you can track e.g. DNA across days

  const hov = hover ? { date: fmtDate(dateOf(hover.y, hover.d)), count: hover.count, top: hover.top } : null;
  const NM = detail && detail.names;
  const period = (detail && sel) ? (detail[gran] || {})[sel] : null;
  const selLabel = sel ? (gran === "day" ? fmtDate(new Date(sel + "T00:00:00Z")) : gran === "week" ? "Week of " + fmtDate(new Date(sel + "T00:00:00Z")) : MONF[+sel.split("-")[1] - 1] + " " + sel.split("-")[0]) : "";
  const aRow = ([i, p]) => ({ name: NM[i], plays: p });
  const iRow = ([t, a, p]) => ({ title: NM[t], artist: NM[a], plays: p });

  return (
    <div className="r-view">
      <div className="r-viewhead">
        <div>
          <div className="r-kicker">Calendar · {years[0]}—{years[years.length - 1]} · {fmt(max)} in a single day</div>
          <h1 className="r-title">Every <em>day</em><span className="dot">.</span></h1>
        </div>
        <div className="r-seg" style={{ alignSelf: "flex-end" }}>
          {[["day", "day"], ["week", "week"], ["month", "month"]].map(([k, l]) =>
            <button key={k} data-on={gran === k} onClick={() => { setGran(k); setSel(null); }}>{l}</button>)}
        </div>
      </div>

      <div className="cal-detail">
        {hov
          ? <><b style={{ color: "var(--ink)" }}>{hov.date}</b>{hov.count ? <> · {fmt(hov.count)} plays{hov.top ? <> — mostly <span className="cal-art" onClick={() => go("artist", R.slug(hov.top[0]))}>{hov.top[0]}</span> ({hov.top[1]})</> : null}</> : <span style={{ color: "var(--ink-faint)" }}> · quiet</span>}</>
          : <span style={{ color: "var(--ink-faint)" }}>hover a day, or click to open the {gran} overview below…</span>}
      </div>

      <div className="r-card" style={{ padding: "12px 10px", overflowX: "auto" }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: W, minWidth: 660, height: "auto", display: "block" }} onMouseLeave={() => setHover(null)}>
          {(() => { const y = years[0], jd = new Date(Date.UTC(y, 0, 1)).getUTCDay();
            return MON.map((m, mi) => { const fom = Math.round((Date.UTC(y, mi, 1) - Date.UTC(y, 0, 1)) / 86400e3); const col = Math.floor((fom + jd) / 7);
              return <text key={m} x={leftPad + col * step} y={topPad - 12} fontFamily="var(--mono)" fontSize="9" fill="var(--ink-faint)">{m}</text>; });
          })()}
          {years.map((y, yi) => {
            const Y = cal.byYear[y], jd = new Date(Date.UTC(y, 0, 1)).getUTCDay(), gy = topPad + yi * (rowH + yearGap), jan1 = Date.UTC(y, 0, 1);
            return (
              <g key={y}>
                <text x={leftPad - 8} y={gy + rowH / 2 + 3} textAnchor="end" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-soft)">{"'" + String(y).slice(2)}</text>
                {Y.counts.map((c, d) => {
                  const col = Math.floor((d + jd) / 7), row = (d + jd) % 7;
                  const cms = jan1 + d * 86400e3, onSel = selRange && cms >= selRange[0] && cms <= selRange[1];
                  const onHov = hover && hover.y === y && hover.d === d;
                  return <rect key={d} x={leftPad + col * step} y={gy + row * step} width={cell} height={cell} rx={1.5}
                    fill={color(c)} stroke={onSel ? "var(--accent)" : onHov ? "var(--ink)" : "none"} strokeWidth={onSel ? 1.4 : onHov ? 1 : 0}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={() => setHover({ y, d, count: c, top: Y.tops[d] || null })}
                    onClick={() => pick(y, d)} />;
                })}
              </g>
            );
          })}
        </svg>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 12, fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-faint)" }}>
        less{[0, 0.18, 0.4, 0.68, 1].map((f, i) => <span key={i} style={{ width: 11, height: 11, borderRadius: 2, background: f === 0 ? "var(--bg-3)" : color(f * max) }} />)}more
        <span style={{ marginLeft: "auto" }}>click the grid to open a {gran} ↓</span>
      </div>

      {/* period overview */}
      {sel && (
        <div className="r-card cal-ov" style={{ marginTop: "var(--gap)", padding: 22 }}>
          {!detail ? <div style={{ color: "var(--ink-faint)", fontFamily: "var(--mono)", fontSize: 12, padding: "10px 0" }}>loading the detail…</div>
            : !period ? <div style={{ color: "var(--ink-soft)" }}><b>{selLabel}</b> — too quiet for a full breakdown{hov && hov.top ? <> (mostly {hov.top[0]})</> : ""}.</div>
              : <>
                <div className="cal-ov-head">
                  <div>
                    <div className="r-mono" style={{ fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: 4 }}>{gran} overview</div>
                    <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 24 }}>{selLabel}</div>
                  </div>
                  <div style={{ display: "flex", gap: 22, alignItems: "baseline" }}>
                    <div><div className="r-stat-n" style={{ fontSize: 26 }}>{fmt(period.t)}</div><div className="r-mono" style={{ fontSize: 8.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ink-faint)" }}>plays</div></div>
                    {gran !== "day" && <div><div className="r-stat-n" style={{ fontSize: 26 }}>{period.n}</div><div className="r-mono" style={{ fontSize: 8.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ink-faint)" }}>active days</div></div>}
                  </div>
                </div>

                <div className="r-seg" style={{ margin: "16px 0 14px" }}>
                  {[["artists", "artists"], ["albums", "albums"], ["songs", "songs"], ["dna", "sound dna"]].map(([k, l]) =>
                    <button key={k} data-on={pane === k} onClick={() => setPane(k)}>{l}</button>)}
                </div>

                {pane === "artists" && (
                  <div className="cal-rows">
                    {period.a.map(aRow).map((r, i) => (
                      <div key={r.name} className="cal-row" data-link={!!R.byId[R.slug(r.name)]} onClick={() => R.byId[R.slug(r.name)] && go("artist", R.slug(r.name))}>
                        <span className="cal-rk">{String(i + 1).padStart(2, "0")}</span>
                        <GenCover hue={(R.byId[R.slug(r.name)] || {}).hue || 210} name={r.name} size={34} radius={3} />
                        <span className="cal-nm">{r.name}</span>
                        <span className="cal-pl">{fmt(r.plays)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {(pane === "albums" || pane === "songs") && (
                  <div className="cal-rows">
                    {(pane === "albums" ? period.al : period.s).map(iRow).map((r, i) => (
                      <div key={r.title + i} className="cal-row" data-link={!!R.byId[R.slug(r.artist)]} onClick={() => R.byId[R.slug(r.artist)] && go("artist", R.slug(r.artist))}>
                        <span className="cal-rk">{String(i + 1).padStart(2, "0")}</span>
                        <GenCover hue={(R.byId[R.slug(r.artist)] || {}).hue || 210} name={r.artist} size={34} radius={3} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="cal-nm" style={{ fontStyle: "italic" }}>{r.title}</div>
                          <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)" }}>{r.artist}</div>
                        </div>
                        <span className="cal-pl">{fmt(r.plays)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {pane === "dna" && (
                  <div style={{ display: "flex", justifyContent: "center", padding: "6px 0" }}>
                    <div style={{ maxWidth: 360, width: "100%" }}>
                      <Radar axes={["NRG", "MOOD", "ACOU", "BPM", "DANCE", "INSTR"]} values={period.d} values2={avg} run={true} size={300} />
                      <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", textAlign: "center", marginTop: 6 }}>solid = this {gran} · dashed = your all-time average</div>
                    </div>
                  </div>
                )}
              </>}
        </div>
      )}

      <style>{`
        .cal-detail { font-family: var(--serif); font-size: 15px; color: var(--ink-soft); margin-bottom: 12px; min-height: 22px; }
        .cal-art { color: var(--accent); cursor: pointer; border-bottom: 1px solid currentColor; }
        .cal-art:hover { opacity: .8; }
        .cal-ov-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
        .cal-rows { display: grid; gap: 2px; }
        .cal-row { display: flex; align-items: center; gap: 11px; padding: 6px 6px; border-radius: 6px; transition: background .12s; }
        .cal-row[data-link="true"] { cursor: pointer; }
        .cal-row[data-link="true"]:hover { background: var(--bg-3); }
        .cal-rk { font-family: var(--mono); font-size: 10px; color: var(--ink-faint); width: 18px; }
        .cal-nm { font-size: 13.5px; flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cal-pl { font-family: var(--mono); font-size: 11px; color: var(--ink-soft); }
      `}</style>
    </div>
  );
}
