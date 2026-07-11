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
  // Mobile: the panel becomes a bottom sheet (CSS below overrides the fixed pos). Dragging the
  // bar with a finger RESIZES it (24–90 vh), so it can be shrunk to a peek strip instead of
  // overshadowing the calendar behind it (Fuad 2026-07-05).
  const [sheetH, setSheetH] = React.useState(40);
  const onBarTouchStart = () => {
    const move = (ev) => {
      const t = ev.touches[0]; if (!t) return;
      setSheetH(Math.round(Math.max(24, Math.min(90, (window.innerHeight - t.clientY) / window.innerHeight * 100))));
    };
    const end = () => { window.removeEventListener("touchmove", move); window.removeEventListener("touchend", end); };
    window.addEventListener("touchmove", move, { passive: true }); window.addEventListener("touchend", end);
  };
  const style = { ...(pos ? { left: pos.x, top: pos.y, right: "auto", bottom: "auto" } : {}), "--sheet-h": sheetH + "vh" };
  return (
    <div ref={ref} className="cal-float" style={style}>
      <div className="cal-float-bar" onMouseDown={startDrag} onTouchStart={onBarTouchStart}>
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

// ─────────────────────────────────────────────────────────────────
//  BARCODE SCRUBBER — full-width strip at the bottom of the calendar page.
//  Every active listening day as a hairline across all years; clicking a year
//  segment sets the calendar's selYear highlight.
// ─────────────────────────────────────────────────────────────────
function BarcodeScrubber({ years, selYear, setSelYear }) {
  const [days, setDays] = React.useState(window.ROTATION_DAYS || null);

  React.useEffect(() => {
    if (window.ROTATION_DAYS) { setDays(window.ROTATION_DAYS); return; }
    // Reuse the lab's shared script tag id so we don't double-load.
    let s = document.getElementById("lab-day-series-js");
    if (!s) {
      s = document.createElement("script");
      s.id = "lab-day-series-js"; s.src = "day-series.js";
      s.onload = () => setDays(window.ROTATION_DAYS);
      s.onerror = () => setDays(null);
      document.head.appendChild(s);
    } else {
      // Script tag exists but data may not be ready yet; poll.
      const poll = setInterval(() => {
        if (window.ROTATION_DAYS) { clearInterval(poll); setDays(window.ROTATION_DAYS); }
      }, 80);
      return () => clearInterval(poll);
    }
  }, []);

  const STRIP_H = 52;   // total height of the strip (px in viewBox units)
  const LABEL_H = 13;   // space below hairlines for year labels
  const LINE_H = STRIP_H - LABEL_H;  // hairline area height

  // Memoize the static hairlines — they never change when selYear changes.
  const hairlines = React.useMemo(() => {
    if (!days) return null;
    const counts = days.counts;
    const n = counts.length;
    const sorted = counts.slice().sort((a, b) => a - b);
    const p80 = sorted[Math.floor(sorted.length * 0.8)] || 1;
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || 1;
    const lines = [];
    for (let i = 0; i < n; i++) {
      const v = counts[i];
      if (!v) continue;
      const x = (i / (n - 1)) * 1000;  // viewBox width = 1000
      // Taller + brighter for heavier days, giving texture without cost.
      const h = v >= p95 ? LINE_H : v >= p80 ? LINE_H * 0.72 : LINE_H * 0.42;
      const op = v >= p95 ? 0.95 : v >= p80 ? 0.70 : 0.42;
      const col = v >= p95 ? "var(--accent)"
        : v >= p80 ? "oklch(0.62 0.13 var(--acc-h))"
        : "oklch(0.44 0.08 var(--acc-h))";
      lines.push(
        <line key={i} x1={x.toFixed(2)} x2={x.toFixed(2)}
          y1={(LINE_H - h).toFixed(2)} y2={LINE_H.toFixed(2)}
          stroke={col} strokeWidth="0.55" opacity={op}
          vectorEffect="non-scaling-stroke" shapeRendering="crispEdges" />
      );
    }
    return lines;
  }, [days]);

  // Year segment boundaries: map each year → [xStart, xEnd] in viewBox (0–1000).
  const yearSegs = React.useMemo(() => {
    if (!days || !years || !years.length) return [];
    const start = new Date(days.start + "T00:00:00Z").getTime();
    const n = days.counts.length;
    return years.map(y => {
      const yStart = Date.UTC(y, 0, 1);
      const yEnd   = Date.UTC(y + 1, 0, 1);
      const i0 = Math.max(0, Math.round((yStart - start) / 86400e3));
      const i1 = Math.min(n - 1, Math.round((yEnd   - start) / 86400e3) - 1);
      const x0 = (i0 / (n - 1)) * 1000;
      const x1 = (i1 / (n - 1)) * 1000;
      return { y, x0, x1 };
    }).filter(s => s.x1 >= s.x0);
  }, [days, years]);

  const placeholder = (
    <div style={{
      height: STRIP_H + 20, display: "flex", alignItems: "center",
      fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-faint)",
      letterSpacing: ".1em", background: "var(--bg-3)", borderRadius: 6,
      padding: "0 16px"
    }}>
      loading history…
    </div>
  );

  if (!days) return (
    <div className="bc-scrubber-wrap">{placeholder}</div>
  );

  return (
    <div className="bc-scrubber-wrap">
      <svg
        viewBox={`0 0 1000 ${STRIP_H}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height: STRIP_H + 20, display: "block", overflow: "visible" }}
        aria-label="Listening history barcode — click a year to highlight it"
      >
        {/* Year highlight bands — rendered below hairlines, only changes on selYear. */}
        {yearSegs.map(({ y, x0, x1 }) => {
          const on = y === selYear;
          return (
            <rect key={y + "-bg"}
              x={x0.toFixed(2)} y="0"
              width={Math.max(0, x1 - x0).toFixed(2)} height={LINE_H}
              fill={on ? "oklch(0.35 0.07 var(--acc-h) / 0.55)" : "transparent"}
              rx="0"
            />
          );
        })}

        {/* Hairlines — memoized, never re-renders on year change. */}
        {hairlines}

        {/* Year separator lines + labels + click targets. */}
        {yearSegs.map(({ y, x0, x1 }, i) => {
          const on = y === selYear;
          const cx = ((x0 + x1) / 2).toFixed(2);
          const label = "'" + String(y).slice(2);
          return (
            <g key={y} style={{ cursor: "pointer", touchAction: "manipulation" }}
              onClick={() => setSelYear(on ? null : y)}>
              {/* Invisible wide hit target for mobile-friendly tap. */}
              <rect x={x0.toFixed(2)} y="0"
                width={Math.max(0, x1 - x0).toFixed(2)} height={STRIP_H}
                fill="transparent" />
              {/* Separator tick at year boundary (skip first). */}
              {i > 0 && (
                <line x1={x0.toFixed(2)} x2={x0.toFixed(2)} y1="0" y2={LINE_H}
                  stroke="var(--rule-2)" strokeWidth="0.8" opacity="0.6" />
              )}
              {/* Accent underline for selected year. */}
              {on && (
                <rect x={x0.toFixed(2)} y={(LINE_H - 2).toFixed(2)}
                  width={Math.max(0, x1 - x0).toFixed(2)} height="2"
                  fill="var(--accent)" rx="1" />
              )}
              {/* Year label. */}
              <text
                x={cx} y={(STRIP_H - 1).toFixed(2)}
                fontFamily="var(--mono)" fontSize="7.5"
                fill={on ? "var(--accent)" : "var(--ink-faint)"}
                textAnchor="middle"
                style={{ userSelect: "none" }}
              >{label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
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
  const [selYear, setSelYear] = React.useState(null); // barcode scrubber: highlighted year
  const heatRef = React.useRef(null);                  // heatmap svg — scrub clicks scroll to the year's row
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
        <svg ref={heatRef} viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", maxWidth: W, minWidth: 660, height: "auto", display: "block" }} onMouseLeave={() => setHover(null)}>
          {(() => { const y = years[0], jd = new Date(Date.UTC(y, 0, 1)).getUTCDay();
            return MON.map((m, mi) => { const fom = Math.round((Date.UTC(y, mi, 1) - Date.UTC(y, 0, 1)) / 86400e3); const col = Math.floor((fom + jd) / 7);
              return <text key={m} x={leftPad + col * step} y={topPad - 12} fontFamily="var(--mono)" fontSize="9" fill="var(--ink-faint)">{m}</text>; });
          })()}
          {years.map((y, yi) => {
            const Y = cal.byYear[y], jd = new Date(Date.UTC(y, 0, 1)).getUTCDay(), gy = topPad + yi * (rowH + yearGap), jan1 = Date.UTC(y, 0, 1);
            return (
              <g key={y}>
                <text x={leftPad - 8} y={gy + rowH / 2 + 3} textAnchor="end" fontFamily="var(--mono)" fontSize="10" fill={selYear === y ? "var(--accent)" : "var(--ink-soft)"}>{"'" + String(y).slice(2)}</text>
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

      {/* barcode year scrubber — full-width strip across all history */}
      {cal && (
        <div style={{ marginTop: 28 }}>
          <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: ".14em", textTransform: "uppercase", marginBottom: 6 }}>
            listening history{selYear ? <> · <span style={{ color: "var(--accent)" }}>{selYear} highlighted</span></> : " · click a year to jump to it"}
          </div>
          <BarcodeScrubber years={years} selYear={selYear} setSelYear={(y) => {
            setSelYear(y);
            // jump the page to that year's heatmap row (the calendar shows all years stacked)
            const el = heatRef.current;
            if (y != null && el) {
              const r = el.getBoundingClientRect();
              const frac = (topPad + years.indexOf(y) * (rowH + yearGap)) / H;
              window.scrollTo({ top: window.scrollY + r.top + frac * r.height - 110, behavior: "smooth" });
            }
          }} />
        </div>
      )}

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
        .bc-scrubber-wrap { width: 100%; border-radius: 6px; overflow: hidden; background: var(--bg-3); }
        /* mobile: bottom sheet — full width, finger-resizable via the bar (see onBarTouchStart).
           !important defeats any stored PC drag position. Default 40vh = calendar stays visible. */
        @media (max-width: 760px) {
          .cal-float { left: 0 !important; right: 0 !important; bottom: 0 !important; top: auto !important;
            width: 100% !important; height: var(--sheet-h, 40vh); max-height: 92vh;
            border-radius: 14px 14px 0 0; border-left: none; border-right: none; border-bottom: none; }
          .cal-float-bar { padding: 12px; touch-action: none; justify-content: center; position: relative; }
          .cal-float-bar::before { content: ""; position: absolute; top: 5px; left: 50%; transform: translateX(-50%);
            width: 44px; height: 4px; border-radius: 999px; background: var(--rule-2); }
          .cal-float-body { flex: 1; }
        }
      `}</style>
    </div>
  );
}
