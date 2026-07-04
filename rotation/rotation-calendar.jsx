// rotation-calendar.jsx — the listening calendar. Tier 1: a contributions-style heatmap of daily
// plays (calendar.js). Tier 2: click a Day/Week/Month to load period summaries (calendar-detail.js,
// only fetched on first drill) and show a bottom overview — top artists/albums/songs + Sound DNA.
// Also hosts the Rhythm clock (moved from Explore 2026-07-05).

// ClockCard — VERTICAL hour-of-day histogram (00→23 as rows), all-time or a single year.
// Lives to the RIGHT of the calendar as a sticky rail. Clicking an hour selects it (future:
// filters the heatmap once per-day-hour data exists — see ROADMAP).
function ClockCard({ R, selHours, setSelHours }) {
  const days = R.CLOCK.days;
  const grid = R.CLOCK.grid;
  const hourTot = React.useMemo(() =>
    Array.from({ length: 24 }, (_, h) => days.reduce((s, _, di) => s + grid[di][h], 0)), [R]);
  const max = Math.max(1, ...hourTot);
  const total = hourTot.reduce((a, b) => a + b, 0) || 1;
  const peakHour = hourTot.indexOf(Math.max(...hourTot));
  const nightShare = hourTot.slice(0, 5).reduce((a, b) => a + b, 0) / total * 100;
  const hr = (h) => (h % 12 === 0 ? 12 : h % 12) + (h < 12 ? "am" : "pm");
  const selShare = selHours.size ? Array.from(selHours).reduce((s, h) => s + hourTot[h], 0) / total * 100 : 0;
  const toggle = (h) => { const n = new Set(selHours); n.has(h) ? n.delete(h) : n.add(h); setSelHours(n); };
  return (
    <div className="r-card cal-clock" style={{ padding: "14px 14px 12px" }}>
      <div className="r-card-h" style={{ padding: 0, marginBottom: 4, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span className="lbl"><b>Rhythm</b></span>
        {selHours.size > 0 && <button onClick={() => setSelHours(new Set())} className="r-mono" style={{ background: "none", border: "none", color: "var(--ink-faint)", cursor: "pointer", fontSize: 9 }}>clear ✕</button>}
      </div>
      <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 10 }}>
        {selHours.size > 0
          ? <>Selected <b style={{ color: "var(--ink)" }}>{selHours.size}h</b> · <b style={{ color: "var(--accent)" }}>{selShare.toFixed(0)}%</b> of plays</>
          : <>Peak <b style={{ color: "var(--ink)" }}>{hr(peakHour)}</b> · <b style={{ color: "var(--accent)" }}>{nightShare.toFixed(0)}%</b> pre-5AM · <span style={{ color: "var(--ink-faint)" }}>tap hours to select</span></>}
      </div>
      <div style={{ display: "grid", gap: 2 }}>
        {hourTot.map((v, h) => {
          const on = selHours.has(h);
          return (
            <div key={h} onClick={() => toggle(h)} title={`${hr(h)} · ${fmt(v)} plays`}
              style={{ display: "grid", gridTemplateColumns: "30px 1fr 30px", gap: 6, alignItems: "center", cursor: "pointer", opacity: selHours.size && !on ? 0.4 : 1 }}>
              <span className="r-mono" style={{ fontSize: 8.5, color: on || h === peakHour ? "var(--accent)" : "var(--ink-faint)", textAlign: "right" }}>{hr(h)}</span>
              <div style={{ height: 8, background: "var(--bg-3)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: (v / max * 100) + "%", background: on || h === peakHour ? "var(--accent)" : `oklch(0.5 0.1 var(--acc-h))`, outline: on ? "1px solid var(--accent)" : "none" }} />
              </div>
              <span className="r-mono" style={{ fontSize: 8, color: "var(--ink-faint)" }}>{fmtK(v)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Draggable, repositionable floating panel; remembers its position in localStorage.
function DraggablePanel({ storageKey, title, onClose, children }) {
  const ref = React.useRef(null);
  const posRef = React.useRef(null);
  const [pos, setPos] = React.useState(() => {
    try { const s = JSON.parse(localStorage.getItem(storageKey) || "null"); if (s && typeof s.x === "number") { posRef.current = s; return s; } } catch (e) {}
    return null;
  });
  const startDrag = (e) => {
    if (e.button !== 0) return;
    const r = ref.current.getBoundingClientRect();
    const off = { x: e.clientX - r.left, y: e.clientY - r.top };
    const move = (ev) => {
      const x = Math.max(6, Math.min(window.innerWidth - 80, ev.clientX - off.x));
      const y = Math.max(6, Math.min(window.innerHeight - 30, ev.clientY - off.y));
      posRef.current = { x, y }; setPos({ x, y });
    };
    const up = () => {
      window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up);
      try { localStorage.setItem(storageKey, JSON.stringify(posRef.current)); } catch (e) {}
    };
    window.addEventListener("mousemove", move); window.addEventListener("mouseup", up);
    e.preventDefault();
  };
  const style = pos ? { left: pos.x, top: pos.y, right: "auto", bottom: "auto" } : {};
  return (
    <div ref={ref} className="cal-float" style={style}>
      <div className="cal-float-bar" onMouseDown={startDrag}>
        <span className="cal-float-grip">⠿</span>
        <span className="cal-float-title">{title}</span>
        <button className="cal-float-x" onClick={onClose} title="close">✕</button>
      </div>
      <div className="cal-float-body">{children}</div>
    </div>
  );
}

function sumHours(h, hrs) { if (!h) return 0; let s = 0; for (const x of hrs) s += h[x] || 0; return s; }
// merge the selected hours' month sub-breakdowns into one ranked set (Tier 2)
function mergeHours(period, hrs) {
  const merge = (key) => {
    const m = new Map();
    for (const hr of hrs) { const sub = period.h[hr]; if (!sub) continue;
      for (const row of sub[key]) { const id = row.slice(0, -1).join("|"); const plays = row[row.length - 1];
        const cur = m.get(id); if (cur) cur[cur.length - 1] += plays; else m.set(id, row.slice()); } }
    return [...m.values()].sort((a, b) => b[b.length - 1] - a[a.length - 1]);
  };
  let t = 0; const dsum = [0, 0, 0, 0, 0, 0]; let tw = 0;
  for (const hr of hrs) { const sub = period.h[hr]; if (!sub) continue; t += sub.t;
    for (let i = 0; i < 6; i++) dsum[i] += sub.d[i] * sub.t; tw += sub.t; }
  return { t, n: period.n, a: merge("a"), al: merge("al"), s: merge("s"), d: dsum.map(x => Math.round(x / (tw || 1) * 100) / 100) };
}

function CalendarView({ go, seed }) {
  const R = window.ROTATION;
  const [cal, setCal] = React.useState(window.ROTATION_CAL || null);
  const [detail, setDetail] = React.useState(window.ROTATION_CAL_DETAIL || null);
  const [hover, setHover] = React.useState(null);     // { y, d, count, top }
  // deep link: #calendar/YYYY-MM-DD opens straight onto that day (the Overview mini-cal uses it)
  const seedDay = seed && /^\d{4}-\d{2}-\d{2}$/.test(seed) ? seed : null;
  const [gran, setGran] = React.useState(seedDay ? "day" : "month");    // day | week | month
  const [sel, setSel] = React.useState(seedDay);      // selected period key (string)
  const [pane, setPane] = React.useState("artists");  // artists | albums | songs | dna
  const [selHours, setSelHours] = React.useState(() => new Set()); // rhythm hour multi-select
  React.useEffect(() => { if (seedDay) ensureDetail(); }, []);

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
  const selArr = selHours.size ? [...selHours].sort((a, b) => a - b) : null;
  const period = (detail && sel) ? (detail[gran] || {})[sel] : null;
  const P = (gran === "month" && selArr && period && period.h) ? mergeHours(period, selArr) : period;
  const selLabel = sel ? (gran === "day" ? fmtDate(new Date(sel + "T00:00:00Z")) : gran === "week" ? "Week of " + fmtDate(new Date(sel + "T00:00:00Z")) : MONF[+sel.split("-")[1] - 1] + " " + sel.split("-")[0]) : "";
  const aRow = ([i, p]) => ({ name: NM[i], plays: p });
  const iRow = ([t, a, p]) => ({ title: NM[t], artist: NM[a], plays: p });

  return (
    <div className="r-view tv-page">
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

      <div className="cal-heatwrap">
      <div className="cal-heatleft" style={{ minWidth: 0 }}>
      <div className="r-card cal-heatcard" style={{ padding: "12px 10px", overflowX: "auto" }}>
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
                  const cv = selArr ? sumHours(Y.hours && Y.hours[d], selArr) : c;
                  const cms = jan1 + d * 86400e3, onSel = selRange && cms >= selRange[0] && cms <= selRange[1];
                  const onHov = hover && hover.y === y && hover.d === d;
                  return <rect key={d} x={leftPad + col * step} y={gy + row * step} width={cell} height={cell} rx={1.5}
                    fill={color(cv)} stroke={onSel ? "var(--accent)" : onHov ? "var(--ink)" : "none"} strokeWidth={onSel ? 1.4 : onHov ? 1 : 0}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={() => setHover({ y, d, count: cv, top: selArr ? null : (Y.tops[d] || null) })}
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
      </div>
      {/* rhythm — the vertical hour clock (moved from Explore), sitting to the right of the calendar */}
      <ClockCard R={R} selHours={selHours} setSelHours={setSelHours} />
      </div>

      {/* period overview */}
      {sel && (
        <DraggablePanel storageKey="rot-cal-panel" title={gran + " overview" + (selLabel ? " · " + selLabel : "")} onClose={() => setSel(null)}>
          {!detail ? <div style={{ color: "var(--ink-faint)", fontFamily: "var(--mono)", fontSize: 12, padding: "10px 0" }}>loading the detail…</div>
            : !period ? <div style={{ color: "var(--ink-soft)" }}><b>{selLabel}</b> — too quiet for a full breakdown{hov && hov.top ? <> (mostly {hov.top[0]})</> : ""}.</div>
              : <>
                <div className="cal-ov-head">
                  <div>
                    <div className="r-mono" style={{ fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: 4 }}>{gran} overview</div>
                    <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 24 }}>{selLabel}</div>
                  </div>
                  <div style={{ display: "flex", gap: 22, alignItems: "baseline" }}>
                    <div><div className="r-stat-n" style={{ fontSize: 26 }}>{fmt(P.t)}</div><div className="r-mono" style={{ fontSize: 8.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ink-faint)" }}>plays</div></div>
                    {gran !== "day" && <div><div className="r-stat-n" style={{ fontSize: 26 }}>{P.n}</div><div className="r-mono" style={{ fontSize: 8.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ink-faint)" }}>active days</div></div>}
                  </div>
                </div>

                <div className="r-seg" style={{ margin: "16px 0 14px" }}>
                  {[["artists", "artists"], ["albums", "albums"], ["songs", "songs"], ["dna", "sound dna"]].map(([k, l]) =>
                    <button key={k} data-on={pane === k} onClick={() => setPane(k)}>{l}</button>)}
                </div>
                {selArr && (gran === "month"
                  ? <div className="r-mono" style={{ fontSize: 9.5, color: "var(--accent)", marginBottom: 12 }}>filtered to {selHours.size} selected hour{selHours.size > 1 ? "s" : ""} · {fmt(P.t)} plays</div>
                  : <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", marginBottom: 12 }}>hour filter shows on the heatmap · switch to <b>month</b> to filter this list</div>)}

                {pane === "artists" && (
                  <div className="cal-rows">
                    {P.a.map(aRow).map((r, i) => (
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
                    {(pane === "albums" ? P.al : P.s).map(iRow).map((r, i) => (
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
                      <Radar axes={["NRG", "MOOD", "ACOU", "BPM", "DANCE", "INSTR"]} values={P.d} values2={avg} run={true} size={300} />
                      <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", textAlign: "center", marginTop: 6 }}>solid = this {gran} · dashed = your all-time average</div>
                    </div>
                  </div>
                )}
              </>}
        </DraggablePanel>
      )}

      <style>{`
        .cal-heatwrap { display: grid; grid-template-columns: minmax(0,1fr) 210px; gap: var(--gap); align-items: start; }
        .cal-clock { position: sticky; top: 12px; }
        @media (max-width: 900px) { .cal-heatwrap { grid-template-columns: 1fr; } .cal-clock { position: static; } }
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
        .cal-float { position: fixed; right: 24px; bottom: 24px; z-index: 60; width: min(560px, 92vw);
          max-height: 82vh; display: flex; flex-direction: column; background: var(--panel);
          border: 1px solid var(--rule-2); border-radius: 12px; box-shadow: 0 24px 60px -20px rgba(0,0,0,.7); overflow: hidden; }
        .cal-float-bar { display: flex; align-items: center; gap: 8px; padding: 9px 12px; cursor: grab;
          background: var(--bg-3); border-bottom: 1px solid var(--rule); user-select: none; }
        .cal-float-bar:active { cursor: grabbing; }
        .cal-float-grip { color: var(--ink-faint); font-size: 12px; }
        .cal-float-title { font-family: var(--mono); font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-soft); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cal-float-x { background: none; border: none; color: var(--ink-faint); cursor: pointer; font-size: 12px; line-height: 1; }
        .cal-float-x:hover { color: var(--ink); }
        .cal-float-body { padding: 18px 20px; overflow-y: auto; }
      `}</style>
    </div>
  );
}
