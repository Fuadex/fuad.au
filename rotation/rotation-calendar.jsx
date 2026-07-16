// rotation-calendar.jsx — the listening calendar. Tier 1: a contributions-style heatmap of daily
// plays (calendar.js). Tier 2: click a Day/Week/Month to load period summaries (calendar-detail.js,
// only fetched on first drill) and show a bottom overview — top artists/albums/songs + Sound DNA.
// Also hosts the Rhythm clock (moved from Explore 2026-07-05).

// ClockCard — VERTICAL hour-of-day histogram (00→23 as rows), all-time or a single year.
// Lives to the RIGHT of the calendar as a sticky rail. Clicking an hour selects it (future:
// filters the heatmap once per-day-hour data exists — see ROADMAP).
function ClockCard({ R, selHours, setSelHours, customRange }) {
  const days = R.CLOCK.days;
  const grid = R.CLOCK.grid;
  // Range-awareness: when a customRange is active, lazy-load day-hours.js and build the hour
  // histogram over ONLY the range's days; otherwise fall back to the all-time clock grid.
  const [dayHours, setDayHours] = React.useState(window.ROTATION_DAY_HOURS || null);
  React.useEffect(() => {
    if (!customRange) return;
    if (window.ROTATION_DAY_HOURS) { setDayHours(window.ROTATION_DAY_HOURS); return; }
    let s = document.getElementById("day-hours-js");
    if (!s) {
      s = document.createElement("script");
      s.id = "day-hours-js"; s.src = "day-hours.js";
      s.onload = () => setDayHours(window.ROTATION_DAY_HOURS);
      s.onerror = () => setDayHours(null);
      document.head.appendChild(s);
    } else {
      const poll = setInterval(() => { if (window.ROTATION_DAY_HOURS) { clearInterval(poll); setDayHours(window.ROTATION_DAY_HOURS); } }, 80);
      return () => clearInterval(poll);
    }
  }, [customRange]);

  const rangeActive = !!(customRange && dayHours);
  // Histogram over range days (decode day-hours rows for every offset inside [start,end]).
  const rangeHours = React.useMemo(() => {
    if (!rangeActive) return null;
    const startMs = new Date(dayHours.start + "T00:00:00Z").getTime();
    const i0 = Math.round((customRange[0] - startMs) / 86400e3);
    const i1 = Math.round((customRange[1] - startMs) / 86400e3);
    const tot = new Array(24).fill(0);
    for (let i = i0; i <= i1; i++) {
      const row = dayHours.rows[i.toString(36)];
      if (!row) continue;
      for (const p of row.split(";")) { if (!p) continue; const [hs, cs] = p.split(":"); tot[parseInt(hs, 36)] += parseInt(cs, 36); }
    }
    return tot;
  }, [rangeActive, dayHours, customRange]);

  const rangeLabel = React.useMemo(() => {
    if (!customRange) return "";
    const M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const fD = (ms) => { const dt = new Date(ms); return dt.getUTCDate() + " " + M[dt.getUTCMonth()] + " " + String(dt.getUTCFullYear()).slice(2); };
    return fD(customRange[0]) + " → " + fD(customRange[1]);
  }, [customRange]);

  const hourTot = React.useMemo(() =>
    rangeHours || Array.from({ length: 24 }, (_, h) => days.reduce((s, _, di) => s + grid[di][h], 0)), [R, rangeHours]);
  const max = Math.max(1, ...hourTot);
  const total = hourTot.reduce((a, b) => a + b, 0) || 1;
  const peakHour = hourTot.indexOf(Math.max(...hourTot));
  const nightShare = hourTot.slice(0, 5).reduce((a, b) => a + b, 0) / total * 100;
  const hr = (h) => (h % 12 === 0 ? 12 : h % 12) + (h < 12 ? "am" : "pm");
  const selShare = selHours.size ? Array.from(selHours).reduce((s, h) => s + hourTot[h], 0) / total * 100 : 0;
  const toggle = (h) => { const n = new Set(selHours); n.has(h) ? n.delete(h) : n.add(h); setSelHours(n); };
  return (
    <div className="r-card cal-clock" style={{ padding: "14px 14px 12px" }}>
      <div className="r-card-h" style={{ padding: 0, marginBottom: 4, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 6 }}>
        <span className="lbl" style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><b>Rhythm</b>{rangeActive && <span style={{ color: "var(--ink-faint)", fontWeight: 400 }}> · {rangeLabel}</span>}</span>
        {selHours.size > 0 && <button onClick={() => setSelHours(new Set())} className="r-mono" style={{ background: "none", border: "none", color: "var(--ink-faint)", cursor: "pointer", fontSize: 9, flexShrink: 0 }}>clear ✕</button>}
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

// Panel size clamps (desktop mode only — mobile is the CSS bottom-sheet, untouched).
const PANEL_MIN_W = 320, PANEL_MIN_H = 280;
const panelMaxW = () => Math.round(window.innerWidth * 0.92);
const panelMaxH = () => Math.round(window.innerHeight * 0.85);
// Clamp a stored {x,y,w,h} so the panel stays usable: size within [min, viewport-max], and at
// least the title bar reachable (x ≤ innerWidth−120, y ≤ innerHeight−60, both ≥ 0). Returns a
// normalised object (w/h may be undefined if never resized — CSS default width then applies).
function clampPanelBox(s) {
  if (!s || typeof s.x !== "number" || typeof s.y !== "number") return null;
  const vw = window.innerWidth, vh = window.innerHeight;
  const out = { x: s.x, y: s.y };
  if (typeof s.w === "number") out.w = Math.max(PANEL_MIN_W, Math.min(panelMaxW(), s.w));
  if (typeof s.h === "number") out.h = Math.max(PANEL_MIN_H, Math.min(panelMaxH(), s.h));
  out.x = Math.max(0, Math.min(vw - 120, out.x));
  out.y = Math.max(0, Math.min(vh - 60, out.y));
  return out;
}

// Draggable, repositionable, resizable floating panel; remembers {x,y,w,h} in localStorage.
// On mobile (≤760px) it becomes a bottom sheet that opens in a COLLAPSED "peek" state: a slim
// ~44px pill docked above the barcode scrubber. Tapping the pill expands to the full sheet;
// the drag bar's ▼ button collapses back to peek; ✕ closes fully.
function DraggablePanel({ storageKey, title, onClose, children }) {
  const ref = React.useRef(null);
  const boxRef = React.useRef(null);
  // Initialise from storage, clamped against the CURRENT viewport in the useState initializer so
  // an off-screen 4K position never paints (refinement #4 — runs before first paint).
  const [box, setBox] = React.useState(() => {
    try { const c = clampPanelBox(JSON.parse(localStorage.getItem(storageKey) || "null")); if (c) { boxRef.current = c; return c; } } catch (e) {}
    return null;
  });
  const persist = () => { try { localStorage.setItem(storageKey, JSON.stringify(boxRef.current)); } catch (e) {} };

  // On window resize, re-clamp position AND size so a shrunk viewport can't strand the panel.
  React.useEffect(() => {
    const onResize = () => {
      if (!boxRef.current) return;
      const c = clampPanelBox(boxRef.current);
      boxRef.current = c; setBox(c); persist();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ── Bar drag = reposition (Pointer Events → mouse + pen; touch on mobile keeps the sheet path). ──
  const startDrag = (e) => {
    if (e.button != null && e.button !== 0) return;
    // On mobile the bar RESIZES the sheet (onBarTouchStart) — don't hijack touch here.
    if (e.pointerType === "touch" && window.innerWidth <= 760) return;
    const r = ref.current.getBoundingClientRect();
    const off = { x: e.clientX - r.left, y: e.clientY - r.top };
    const move = (ev) => {
      const cur = boxRef.current || {};
      const c = clampPanelBox({ ...cur, x: ev.clientX - off.x, y: ev.clientY - off.y });
      boxRef.current = c; setBox(c);
    };
    const up = (ev) => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
      persist();
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
    e.preventDefault();
  };

  // ── Resize (desktop only): corner grip + right/bottom edges. Pointer Events + capture = mouse
  //    AND touch/pen on desktop-width viewports. dir picks which dimensions grow. ──
  const startResize = (dir) => (e) => {
    if (e.button != null && e.button !== 0) return;
    if (window.innerWidth <= 760) return;   // mobile sheet owns sizing
    e.preventDefault(); e.stopPropagation();
    const r = ref.current.getBoundingClientRect();
    const start = { mx: e.clientX, my: e.clientY, w: r.width, h: r.height, x: r.left, y: r.top };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
    const target = e.currentTarget;
    const move = (ev) => {
      const cur = boxRef.current || { x: start.x, y: start.y };
      let w = cur.w, h = cur.h;
      if (dir.indexOf("e") >= 0) w = Math.max(PANEL_MIN_W, Math.min(panelMaxW(), start.w + (ev.clientX - start.mx)));
      if (dir.indexOf("s") >= 0) h = Math.max(PANEL_MIN_H, Math.min(panelMaxH(), start.h + (ev.clientY - start.my)));
      const c = clampPanelBox({ x: cur.x != null ? cur.x : start.x, y: cur.y != null ? cur.y : start.y, w, h });
      boxRef.current = c; setBox(c);
    };
    const up = (ev) => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
      try { target.releasePointerCapture(ev.pointerId); } catch (err) {}
      persist();
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };

  // Mobile peek state — collapses the sheet to a slim pill above the scrubber.
  // Opens in peek by default (non-intrusive); tapping expands; ▼ collapses back; ✕ closes fully.
  // State resets per selection (component remounts when panelOpen toggles via the key prop on the
  // parent, so no persistent storage needed here — just React state).
  const [sheetPeek, setSheetPeek] = React.useState(true);
  const [sheetH, setSheetH] = React.useState(40);

  // ── Dynamic scrubber anchor (bug #2/#3) ──────────────────────────────────────────────────
  // The bottom scrubber (.bc-scrubber) is position:fixed but its bottom offset is JS-driven: 0
  // while scrolling, rising above the footer at page end. Its rendered height also varies with
  // the safe-area inset and — on Firefox Android — with URL-bar collapse (which changes
  // innerHeight and bumps the strip). A hard-coded `bottom: 92px` therefore drifts off the strip.
  // Mirror the scrubber's own docking listener: on every scroll/resize (rAF-throttled, plus the
  // visualViewport events that fire on URL-bar collapse) read the scrubber's LIVE top edge and
  // expose it as `--scrub-top` (distance from the viewport bottom to the scrubber's top). The CSS
  // sheet rules pin the panel's bottom to that value so the panel bottom sits EXACTLY on the
  // scrubber's top edge — in peek, at page bottom, and through URL-bar collapse.
  const [scrubTop, setScrubTop] = React.useState(92);
  React.useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const sc = document.querySelector(".bc-scrubber");
      if (!sc) return;
      const r = sc.getBoundingClientRect();
      // gap from the viewport bottom up to the scrubber's top edge.
      const vh = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
      const gap = Math.max(0, Math.round(vh - r.top));
      setScrubTop(gap);
    };
    const onChange = () => { if (!raf) raf = requestAnimationFrame(measure); };
    measure();
    window.addEventListener("scroll", onChange, { passive: true });
    window.addEventListener("resize", onChange);
    const vv = window.visualViewport;
    if (vv) { vv.addEventListener("resize", onChange); vv.addEventListener("scroll", onChange); }
    return () => {
      window.removeEventListener("scroll", onChange);
      window.removeEventListener("resize", onChange);
      if (vv) { vv.removeEventListener("resize", onChange); vv.removeEventListener("scroll", onChange); }
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Finger-resize the EXPANDED sheet by dragging the bar. (In peek the overlay button owns the
  // tap — see the expand handler below — so this only runs when already expanded.)
  const onBarTouchStart = () => {
    if (sheetPeek) return;
    const move = (ev) => {
      const t = ev.touches[0]; if (!t) return;
      setSheetH(Math.round(Math.max(24, Math.min(90, (window.innerHeight - t.clientY) / window.innerHeight * 100))));
    };
    const end = () => { window.removeEventListener("touchmove", move); window.removeEventListener("touchend", end); };
    window.addEventListener("touchmove", move, { passive: true }); window.addEventListener("touchend", end);
  };

  // ── Peek → expand: ONE tap target (bug #1) ───────────────────────────────────────────────
  // Firefox Android fired a synthetic click that fell through the pill onto the first artist row
  // that appeared once the sheet expanded (ghost/tap-through). Fix: a full-size overlay button is
  // the ONLY thing that receives the peek tap. It expands on pointerup and preventDefault()s so no
  // synthetic click is generated and nothing underneath (page rows or the just-revealed body) is
  // hit. stopPropagation keeps it off the bar's own handlers.
  // Expanding also UNMOUNTS this overlay (it's rendered only while peeked), so the synthetic click
  // the same tap emits a beat later lands on the just-revealed first artist row → it navigated
  // away instead of expanding, and only a long-press (which fires no synthetic click) "worked".
  // Swallow that one trailing click at the document level (capture phase) so the expand tap can
  // never also trigger a row (Fuad 2026-07-16).
  const onPeekExpand = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const swallow = (ev) => { ev.preventDefault(); ev.stopPropagation(); };
    document.addEventListener("click", swallow, { capture: true, once: true });
    // if no synthetic click arrives (e.g. mouse/pen), don't leave the one-shot armed for a later real click
    setTimeout(() => document.removeEventListener("click", swallow, { capture: true }), 500);
    setSheetPeek(false);
  };

  // Explicit w/h only apply on desktop (CSS `!important` sheet rules win on mobile ≤760px).
  const style = {
    ...(box ? { left: box.x, top: box.y, right: "auto", bottom: "auto" } : {}),
    ...(box && box.w ? { width: box.w } : {}),
    ...(box && box.h ? { height: box.h, maxHeight: box.h } : {}),
    "--sheet-h": sheetH + "vh",
    "--scrub-top": scrubTop + "px"
  };
  return (
    <div ref={ref} className="cal-float" data-peek={sheetPeek ? "true" : "false"} style={style}>
      <div className="cal-float-bar" onPointerDown={startDrag} onTouchStart={onBarTouchStart}>
        <span className="cal-float-grip">⠿</span>
        <span className="cal-float-title">{title}</span>
        {/* On mobile expanded: ▼ collapses back to peek; on peek: ▲ hint; desktop: neither shown */}
        <button className="cal-float-peek-btn" title="collapse to pill"
          onClick={(e) => { e.stopPropagation(); setSheetPeek(p => !p); }}>
          {sheetPeek ? "▲" : "▼"}
        </button>
        <button className="cal-float-x" onClick={onClose} title="close">✕</button>
      </div>
      {/* Peek-only expand target (bug #1): a full-size transparent button over the pill. It's the
          sole tap target in peek — pointer-events on the bar content are disabled via CSS so the
          tap can't reach the title/rows. Expands on pointerup + preventDefault (no ghost click). */}
      {sheetPeek && (
        <button className="cal-float-peek-hit" aria-label="expand overview"
          onPointerUp={onPeekExpand} onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} />
      )}
      <div className="cal-float-body">{children}</div>
      {/* Desktop resize affordances — hidden on mobile via CSS. Edges are 6px invisible strips;
          the corner is a 24×24 target. All use Pointer Events (mouse + touch/pen). */}
      <div className="cal-float-rz cal-float-rz-e" onPointerDown={startResize("e")} />
      <div className="cal-float-rz cal-float-rz-s" onPointerDown={startResize("s")} />
      <div className="cal-float-rz cal-float-rz-se" onPointerDown={startResize("se")} title="resize">
        <svg viewBox="0 0 10 10" width="10" height="10"><path d="M9 1 L1 9 M9 5 L5 9" stroke="currentColor" strokeWidth="1" fill="none" /></svg>
      </div>
    </div>
  );
}

function sumHours(h, hrs) { if (!h) return 0; let s = 0; for (const x of hrs) s += h[x] || 0; return s; }

// mergeBreakdowns — fold a list of period-like sub-breakdowns into ONE ranked pseudo-period.
// Each entry is { t, a, al, s, d } (t=plays, a/al/s = ranked id-rows [..ids, plays], d=6-slot DNA).
// Ranked lists are id-joined + play-summed; d is weight-averaged by each entry's t. Used by both
// mergeHours (month × selected-hours) and the calendar range overview (day entries across a range).
function mergeBreakdowns(entries) {
  const merge = (key) => {
    const m = new Map();
    for (const e of entries) { const rows = e && e[key]; if (!rows) continue;
      for (const row of rows) { const id = row.slice(0, -1).join("|"); const plays = row[row.length - 1];
        const cur = m.get(id); if (cur) cur[cur.length - 1] += plays; else m.set(id, row.slice()); } }
    return [...m.values()].sort((a, b) => b[b.length - 1] - a[a.length - 1]);
  };
  let t = 0; const dsum = [0, 0, 0, 0, 0, 0]; let tw = 0;
  for (const e of entries) { if (!e) continue; t += e.t;
    for (let i = 0; i < 6; i++) dsum[i] += (e.d ? e.d[i] : 0) * e.t; tw += e.t; }
  return { t, a: merge("a"), al: merge("al"), s: merge("s"), d: dsum.map(x => Math.round(x / (tw || 1) * 100) / 100) };
}
// merge the selected hours' month sub-breakdowns into one ranked set (Tier 2)
function mergeHours(period, hrs) {
  const subs = hrs.map(hr => period.h[hr]).filter(Boolean);
  return { ...mergeBreakdowns(subs), n: period.n };
}

// ─────────────────────────────────────────────────────────────────
//  BARCODE SCRUBBER — full-bleed sticky-bottom strip on the calendar page.
//  Every active listening day as a hairline across all years. The pane IS the
//  time control: Day/Week/Month granularity, two Premiere-style range handles
//  that clip a custom [start,end] day range (shared with the heatmap's selRange
//  contract), a year-segment click that selects the whole year, and a toggle
//  between the barcode view and a compact Horizon chart. All views share ONE
//  overlay layer (handles + veils), so drag/year-select behave identically.
// ─────────────────────────────────────────────────────────────────

// Horizon banding — adapted from rotation-lab.jsx HorizonInner to the slim strip.
const CAL_HORIZON_BANDS = 5;
const CAL_HORIZON_COLORS = [
  "oklch(0.28 0.08 260)",
  "oklch(0.38 0.12 280)",
  "oklch(0.48 0.15 300)",
  "oklch(0.60 0.18 320)",
  "oklch(0.74 0.18 340)",
];

const DAY_MS = 86400e3;

function BarcodeScrubber({ years, selYear, onYear, gran, setGran, setSel, customRange, setCustomRange, onRangeCommit }) {
  const [days, setDays] = React.useState(window.ROTATION_DAYS || null);
  const [view, setView] = React.useState(() => {
    // horizon is the DEFAULT (Fuad 2026-07-12: better perf); barcode only if explicitly chosen
    try { return localStorage.getItem("rot-cal-strip-view") === "barcode" ? "barcode" : "horizon"; } catch (e) { return "horizon"; }
  });
  const [hoverDay, setHoverDay] = React.useState(null);   // day offset under cursor (context readout)
  const stripRef = React.useRef(null);   // the interactive strip element (for px↔day mapping)
  const scrubRef = React.useRef(null);   // the fixed .bc-scrubber wrapper — docked above the footer

  // Dock the fixed bar above the app footer. `.r-app` has overflow-x:hidden, which defeats
  // position:sticky in real browsers, so we go fixed + compute the bottom offset from the footer
  // each scroll/resize (rAF-throttled). While scrolling: pinned to the viewport bottom (off=0).
  // At page end: rides up so its bottom sits exactly on the footer's top edge.
  React.useEffect(() => {
    let raf = 0;
    const apply = () => {
      raf = 0;
      const el = scrubRef.current; if (!el) return;
      const ft = document.querySelector(".r-foot");
      const off = ft ? Math.max(0, window.innerHeight - ft.getBoundingClientRect().top) : 0;
      el.style.bottom = off + "px";
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(apply); };
    apply();  // run once on mount (and again below when data loads)
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);
  // Re-dock once the history data loads (the strip height / footer position can shift).
  React.useEffect(() => {
    const el = scrubRef.current; if (!el) return;
    const ft = document.querySelector(".r-foot");
    const off = ft ? Math.max(0, window.innerHeight - ft.getBoundingClientRect().top) : 0;
    el.style.bottom = off + "px";
  }, [days]);

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

  const setViewPersist = (v) => { setView(v); try { localStorage.setItem("rot-cal-strip-view", v); } catch (e) {} };

  const STRIP_H = 40;   // interactive strip height (px, viewBox units and CSS px)

  // Lab-matched color tiers (mirrors BarcodeStrip in rotation-lab.jsx exactly).
  const COL_PEAK   = "oklch(0.80 0.18 340)";  // top 5%
  const COL_HEAVY  = "oklch(0.62 0.15 320)";  // top 20%
  const COL_ACTIVE = "oklch(0.44 0.10 300)";  // active

  // Day-index → viewBox-x mapping (viewBox width = 1000). msStart = UTC ms of counts[0].
  const meta = React.useMemo(() => {
    if (!days) return null;
    const n = days.counts.length;
    const msStart = new Date(days.start + "T00:00:00Z").getTime();
    return { n, msStart, msEnd: msStart + (n - 1) * DAY_MS };
  }, [days]);

  // Memoize the static hairlines — they never change with selection.
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
      const col = v >= p95 ? COL_PEAK : v >= p80 ? COL_HEAVY : COL_ACTIVE;
      lines.push(
        <line key={i} x1={x.toFixed(2)} x2={x.toFixed(2)}
          y1="0" y2={STRIP_H}
          stroke={col} strokeWidth="0.8" opacity="0.8"
          shapeRendering="crispEdges" />
      );
    }
    return lines;
  }, [days]);

  // Horizon bars — memoized; adapted from HorizonInner banding, filling STRIP_H.
  const horizonBars = React.useMemo(() => {
    if (!days) return null;
    const counts = days.counts;
    const n = counts.length;
    const max = Math.max(1, ...counts);
    const dx = 1000 / n;
    const bars = [];
    for (let i = 0; i < n; i++) {
      const v = counts[i];
      if (!v) continue;
      const norm = v / max;
      for (let b = CAL_HORIZON_BANDS - 1; b >= 0; b--) {
        const lo = b / CAL_HORIZON_BANDS;
        if (norm > lo) {
          const barH = Math.min(1, (norm - lo) / (1 / CAL_HORIZON_BANDS)) * STRIP_H;
          bars.push(
            <rect key={i} x={(i * dx).toFixed(2)} y={(STRIP_H - barH).toFixed(2)}
              width={Math.max(0.8, dx).toFixed(2)} height={barH.toFixed(2)}
              fill={CAL_HORIZON_COLORS[b]} shapeRendering="crispEdges" />
          );
          break;
        }
      }
    }
    return bars;
  }, [days]);

  // Year segments in viewBox-x space AND as fractional widths for the HTML label row.
  const yearSegs = React.useMemo(() => {
    if (!days || !years || !years.length || !meta) return [];
    const { n, msStart } = meta;
    return years.map(y => {
      const yStart = Date.UTC(y, 0, 1);
      const yEnd   = Date.UTC(y + 1, 0, 1);
      const i0 = Math.max(0, Math.round((yStart - msStart) / DAY_MS));
      const i1 = Math.min(n - 1, Math.round((yEnd   - msStart) / DAY_MS) - 1);
      const x0 = (i0 / (n - 1)) * 1000;
      const x1 = (i1 / (n - 1)) * 1000;
      return { y, x0, x1, yStart, yEnd: yEnd - DAY_MS };  // yEnd inclusive-last-day
    }).filter(s => s.x1 >= s.x0);
  }, [days, years, meta]);

  // ── px ↔ ms mapping for drag. Reads the live strip width each drag start. ──
  const clampMs = (ms) => Math.max(meta.msStart, Math.min(meta.msEnd, ms));
  const dayAlign = (ms) => clampMs(Math.round((ms - meta.msStart) / DAY_MS) * DAY_MS + meta.msStart);
  const msFromClientX = (clientX) => {
    const r = stripRef.current.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    return dayAlign(meta.msStart + frac * (meta.msEnd - meta.msStart));
  };
  // ms → viewBox-x (0–1000)
  const xOfMs = (ms) => ((ms - meta.msStart) / (meta.msEnd - meta.msStart)) * 1000;

  // ── Pointer-based dragging (unified mouse + touch via Pointer Events + capture). ──
  // Two drag modes share one move/end path:
  //   • edge drag  — grabbing a handle: the OTHER edge is the fixed anchor.
  //   • fresh drag — pressing empty strip with no range: the press point is the anchor,
  //     and the pointer defines the moving edge (clip a range out of nothing).
  //   • move drag  — grabbing the region BETWEEN the handles: translate the whole [start,end]
  //     window along the axis preserving its width, clamped at both ends (refinement #6).
  const dragRef = React.useRef(null);   // edge/fresh: { anchor: ms } · move: { move:true, grabMs, width }
  const onDragMove = (e) => {
    const d = dragRef.current; if (!d) return;
    if (d.move) {
      // Translate: keep the grabbed offset under the pointer, clamp so the whole window fits.
      const raw = msFromClientX(e.clientX) - d.grabMs;      // desired new start (day-aligned)
      const start = Math.max(meta.msStart, Math.min(meta.msEnd - d.width, raw));
      setCustomRange([start, start + d.width]);
      return;
    }
    const ms = msFromClientX(e.clientX);
    setCustomRange([Math.min(ms, d.anchor), Math.max(ms, d.anchor)]);
  };
  const endDrag = (e) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (err) {}
    // Commit the range on pointer-up (not per-move) → drives the range overview panel.
    // Skip a zero-width "clip out of nothing" tap that never grew into a range.
    if (onRangeCommit && customRange && customRange[1] > customRange[0]) onRangeCommit(customRange);
  };
  // Grab a handle → anchor is the opposite edge.
  const beginHandle = (edge) => (e) => {
    if (!customRange || !meta) return;
    e.preventDefault(); e.stopPropagation();
    dragRef.current = { anchor: edge === "start" ? customRange[1] : customRange[0] };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
  };
  // Grab the region BETWEEN the handles → MOVE the whole window (Premiere clip-slide).
  const beginMove = (e) => {
    if (!customRange || !meta) return;
    e.preventDefault(); e.stopPropagation();
    dragRef.current = { move: true, grabMs: msFromClientX(e.clientX) - customRange[0], width: customRange[1] - customRange[0] };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
  };
  // Press bare strip (in a gap between year targets) with no range → begin a fresh clip.
  // With a range active, the between-handles zone is the MOVE target (handled by beginMove), so a
  // fresh select only starts OUTSIDE the current range — guard on the ms falling in [start,end].
  const beginStrip = (e) => {
    if (!meta) return;
    if (e.target.closest && e.target.closest("[data-bc-handle],[data-bc-year],[data-bc-move]")) return;
    if (customRange) {
      const ms = msFromClientX(e.clientX);
      if (ms >= customRange[0] && ms <= customRange[1]) return;  // inside the range → move, not fresh-select
      return;  // a range exists; bare-strip outside it does nothing (clear via the ✕ / handles)
    }
    e.preventDefault();
    const anchor = msFromClientX(e.clientX);
    dragRef.current = { anchor };
    setCustomRange([anchor, anchor]);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
  };

  // Hover context (Fuad: "based on cursor's position, make it context aware — highlight what
  // the colored peaks mean"): track the day under the cursor when not dragging; readout shows
  // date · plays · intensity tier, and the svg draws a thin cursor line.
  const onStripMove = (e) => {
    if (dragRef.current) { onDragMove(e); return; }
    if (!meta || !days) return;
    const r = stripRef.current.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    setHoverDay(Math.round(frac * ((meta.msEnd - meta.msStart) / DAY_MS)));
  };
  const tiers = React.useMemo(() => {
    if (!days) return null;
    const sorted = days.counts.filter(v => v > 0).slice().sort((a, b) => a - b);
    return { p80: sorted[Math.floor(sorted.length * 0.8)] || 1, p95: sorted[Math.floor(sorted.length * 0.95)] || 1 };
  }, [days]);
  const fDd = (ms) => { const dt = new Date(ms); return dt.getUTCDate() + " " + ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][dt.getUTCMonth()] + " '" + String(dt.getUTCFullYear()).slice(2); };
  const hoverInfo = (hoverDay != null && days && meta && tiers) ? (() => {
    const v = days.counts[hoverDay] || 0;
    const tier = v === 0 ? "quiet" : v >= tiers.p95 ? "peak day — top 5%" : v >= tiers.p80 ? "heavy — top 20%" : "active";
    return { ms: meta.msStart + hoverDay * DAY_MS, v, tier };
  })() : null;

  const shell = (children) => <div className="bc-scrubber" ref={scrubRef}>{children}</div>;

  const header = (
    <div className="bc-head">
      <div className="r-seg bc-seg" data-locked={!!customRange}>
        {[["day", "day"], ["week", "week"], ["month", "month"]].map(([k, l]) =>
          <button key={k} data-on={gran === k} disabled={!!customRange}
            title={customRange ? "clear the range to use periods" : undefined}
            onClick={() => { if (customRange) return; setGran(k); setSel(null); }}>{l}</button>)}
      </div>
      <div className="bc-readout">
        {customRange && meta ? (() => {
          const [s, en] = customRange;
          const i0 = Math.round((s - meta.msStart) / DAY_MS);
          const i1 = Math.round((en - meta.msStart) / DAY_MS);
          let plays = 0, active = 0, peak = 0;
          for (let i = i0; i <= i1; i++) {
            const v = days.counts[i] || 0;
            plays += v; if (v) active++; if (v > peak) peak = v;
          }
          const fD = (ms) => { const dt = new Date(ms); return dt.getUTCDate() + " " + ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][dt.getUTCMonth()] + " " + String(dt.getUTCFullYear()).slice(2); };
          return <><b>{fD(s)}</b> → <b>{fD(en)}</b> · {fmt(plays)} plays · {active} active days · peak {fmt(peak)}
            {hoverInfo && <span className="bc-hov"> · {fDd(hoverInfo.ms)}: {fmt(hoverInfo.v)}p</span>}
            <button className="bc-clear" onClick={() => setCustomRange(null)} title="clear range">✕</button></>;
        })() : hoverInfo
          ? <span><b>{fDd(hoverInfo.ms)}</b> · {fmt(hoverInfo.v)} plays · <span className="bc-hov">{hoverInfo.tier}</span></span>
          : <span className="bc-hint">click a year to clip a range, then drag the edges</span>}
      </div>
      <div className="r-seg bc-seg bc-viewseg">
        {[["barcode", "barcode"], ["horizon", "horizon"]].map(([k, l]) =>
          <button key={k} data-on={view === k} onClick={() => setViewPersist(k)}>{l}</button>)}
      </div>
    </div>
  );

  if (!days || !meta) return shell(
    <>
      {header}
      <div style={{
        height: STRIP_H, display: "flex", alignItems: "center",
        fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-faint)",
        letterSpacing: ".1em"
      }}>
        loading history…
      </div>
    </>
  );

  const crX0 = customRange ? xOfMs(customRange[0]) : 0;
  const crX1 = customRange ? xOfMs(customRange[1]) : 0;

  return shell(
    <>
      {header}
      <div className="bc-strip" ref={stripRef}
        onPointerDown={beginStrip} onPointerMove={onStripMove}
        onPointerLeave={() => setHoverDay(null)}
        onPointerUp={endDrag} onPointerCancel={endDrag}>
        {/* Main render layer — barcode OR horizon; both memoized. */}
        <svg viewBox={`0 0 1000 ${STRIP_H}`} preserveAspectRatio="none"
          className="bc-svg" aria-label="Listening history — drag to clip a range">
          {/* Year highlight band (selYear). */}
          {yearSegs.map(({ y, x0, x1 }) => y === selYear && (
            <rect key={y + "-bg"} x={x0.toFixed(2)} y="0"
              width={Math.max(0, x1 - x0).toFixed(2)} height={STRIP_H}
              fill="oklch(0.35 0.07 var(--acc-h) / 0.55)" />
          ))}
          {view === "barcode" ? hairlines : horizonBars}
          {/* cursor context line */}
          {hoverInfo && (() => { const x = xOfMs(hoverInfo.ms); return (
            <line x1={x.toFixed(2)} x2={x.toFixed(2)} y1="0" y2={STRIP_H}
              stroke="var(--ink)" strokeWidth="1" opacity="0.55" vectorEffect="non-scaling-stroke" />
          ); })()}
          {/* Year separator ticks. */}
          {yearSegs.map(({ y, x0 }, i) => i > 0 && (
            <line key={y + "-sep"} x1={x0.toFixed(2)} x2={x0.toFixed(2)} y1="0" y2={STRIP_H}
              stroke="var(--rule)" strokeWidth="0.8" opacity="0.4" />
          ))}
        </svg>

        {/* Year click targets — transparent HTML buttons over each segment. */}
        <div className="bc-yearhits">
          {yearSegs.map(({ y, x0, x1, yStart, yEnd }) => (
            <button key={y} className="bc-yearhit" data-bc-year
              style={{ left: (x0 / 10) + "%", width: ((x1 - x0) / 10) + "%" }}
              onClick={(e) => { e.stopPropagation(); onYear(y, [yStart, yEnd]); }}
              title={"select " + y} aria-label={"select " + y} />
          ))}
        </div>

        {/* ── Shared overlay: veils + Premiere-style handles (only when a range is set).
             Move/up are handled on the parent .bc-strip; pointer capture (set in
             beginHandle) routes events there via bubbling. ── */}
        {customRange && (
          <>
            <div className="bc-veil" style={{ left: 0, width: (crX0 / 10) + "%" }} />
            <div className="bc-veil" style={{ left: (crX1 / 10) + "%", right: 0 }} />
            {/* Move zone — grab BETWEEN the handles to slide the whole window (refinement #6).
                Inset by the handle width so edge-grabs still hit the handles first. */}
            <div className="bc-move" data-bc-move
              style={{ left: (crX0 / 10) + "%", width: Math.max(0, (crX1 - crX0) / 10) + "%" }}
              onPointerDown={beginMove}
              title="drag to move the range" />
            <div className="bc-handle bc-handle-l" data-bc-handle
              style={{ left: (crX0 / 10) + "%" }}
              onPointerDown={beginHandle("start")}>
              <span className="bc-grip" />
            </div>
            <div className="bc-handle bc-handle-r" data-bc-handle
              style={{ left: (crX1 / 10) + "%" }}
              onPointerDown={beginHandle("end")}>
              <span className="bc-grip" />
            </div>
          </>
        )}
      </div>

      {/* HTML year label row — mono, one per segment, percentage-positioned (no glyph stretch). */}
      <div className="bc-yearrow">
        {yearSegs.map(({ y, x0, x1 }) => (
          <span key={y} className="bc-yearlbl" data-on={y === selYear}
            style={{ left: (x0 / 10) + "%", width: ((x1 - x0) / 10) + "%" }}>
            {"'" + String(y).slice(2)}
          </span>
        ))}
      </div>
    </>
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
  const [customRange, setCustomRange] = React.useState(null); // [startMs,endMs] UTC — Premiere-style clip on the strip
  const heatRef = React.useRef(null);                  // heatmap svg — scrub clicks scroll to the year's row
  const [pane, setPane] = React.useState("artists");  // artists | albums | songs | dna
  const [selHours, setSelHours] = React.useState(() => new Set()); // rhythm hour multi-select
  const [rangeCommit, setRangeCommit] = React.useState(null); // committed [startMs,endMs] → range overview panel
  // Panel page size: 10 | 25 | 50, persisted across sessions.
  const [panelN, setPanelN] = React.useState(() => {
    try { const v = parseInt(localStorage.getItem("rot-cal-panel-n"), 10); if (v === 10 || v === 25 || v === 50) return v; } catch (e) {}
    return 25;
  });
  const setPanelNPersist = (v) => { setPanelN(v); try { localStorage.setItem("rot-cal-panel-n", String(v)); } catch (e) {} };
  // Panel list/grid view toggle, persisted across sessions.
  const [panelView, setPanelView] = React.useState(() => {
    try { const v = localStorage.getItem("rot-cal-panel-view"); if (v === "grid" || v === "list") return v; } catch (e) {}
    return "list";
  });
  const setPanelViewPersist = (v) => { setPanelView(v); try { localStorage.setItem("rot-cal-panel-view", v); } catch (e) {} };
  const [rowCap, setRowCap] = React.useState(panelN); // "show more" gate — starts at panelN, grows by panelN
  React.useEffect(() => { if (seedDay) ensureDetail(); }, []);
  // Clearing the range anywhere (the strip's ✕, or setCustomRange(null)) closes the range panel.
  React.useEffect(() => { if (!customRange && rangeCommit) setRangeCommit(null); }, [customRange]);
  // Reset the "show more" row cap whenever the list identity or page size changes (new pane /
  // period / range / hour filter) so a fresh list starts at the top with only panelN covers loaded.
  React.useEffect(() => { setRowCap(panelN); }, [pane, sel, gran, rangeCommit, selHours, panelN]);

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
    // A custom clip from the barcode strip wins — same [startMs,endMs] inclusive contract
    // the heatmap consumes below (cms >= selRange[0] && cms <= selRange[1]).
    if (customRange) return customRange;
    if (!sel) return null;
    if (gran === "month") { const [y, m] = sel.split("-").map(Number); return [Date.UTC(y, m - 1, 1), Date.UTC(y, m, 1) - 86400e3]; }
    const start = new Date(sel + "T00:00:00Z").getTime();
    return gran === "week" ? [start, start + 6 * 86400e3] : [start, start];
  }, [sel, gran, customRange]);

  // Range overview: merge detail.day entries for every day inside the committed range into ONE
  // pseudo-period (top artists/albums/songs id-joined + summed, DNA weight-averaged by each day's
  // t) — rendered through the SAME panel markup as day/week/month. Re-runs when rangeCommit changes
  // (commit fires on pointer-up / year-click, not per-move) or when detail finishes loading.
  const rangePeriod = React.useMemo(() => {
    if (!rangeCommit || !detail || !detail.day) return null;
    const [s, en] = rangeCommit;
    const entries = [];
    for (let ms = s; ms <= en; ms += 86400e3) {
      const key = new Date(ms).toISOString().slice(0, 10);
      const p = detail.day[key];
      if (p) entries.push(p);
    }
    if (!entries.length) return { t: 0, n: 0, a: [], al: [], s: [], d: [0, 0, 0, 0, 0, 0] };
    const merged = mergeBreakdowns(entries);
    return { ...merged, n: entries.length };
  }, [rangeCommit, detail]);

  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const MONF = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dateOf = (y, d) => new Date(Date.UTC(y, 0, 1) + d * 86400e3);
  const fmtDate = (dt) => dt.getUTCDate() + " " + MON[dt.getUTCMonth()] + " " + dt.getUTCFullYear();
  const keyFor = (g, dt) => { const iso = dt.toISOString().slice(0, 10); if (g === "day") return iso; if (g === "month") return iso.slice(0, 7); const dow = (dt.getUTCDay() + 6) % 7; return new Date(dt.getTime() - dow * 86400e3).toISOString().slice(0, 10); };

  // song→album cover lookup (media-index, lazy). These hooks MUST sit above the `if (!cal)`
  // early return below — hooks after it change the hook count when calendar.js lazy-loads,
  // which is exactly React error #310 (crashed the view on first visit until 2026-07-17).
  const [mediaReady, setMediaReady] = React.useState(!!window.ROTATION_MEDIA);
  React.useEffect(() => {
    if (window.ROTATION_MEDIA) return;
    let sM = document.getElementById("media-index-js");
    if (!sM) { sM = document.createElement("script"); sM.id = "media-index-js"; sM.src = "media-index.js"; sM.onerror = () => {}; document.head.appendChild(sM); }
    sM.addEventListener("load", () => setMediaReady(true));
  }, []);
  const songAlbumCover = React.useMemo(() => {
    const M = window.ROTATION_MEDIA; if (!M || !M.tracks || !M.albums || !M.artists) return {};
    const out = {};
    for (const t of M.tracks) {
      const cover = M.albums[t[3]] && M.albums[t[3]][6];
      if (cover) out[t[0] + "\x00" + M.artists[t[1]]] = cover;
    }
    return out;
  }, [detail, mediaReady]);
  const albumCoverMap = React.useMemo(() => {
    const M = window.ROTATION_MEDIA; if (!M || !M.albums || !M.artists) return {};
    const out = {};
    for (const al of M.albums) if (al[6]) out[al[0] + "\x00" + M.artists[al[1]]] = al[6];
    return out;
  }, [detail, mediaReady]);

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

  // clicking a calendar cell EXITS any scrolling-timeline range (customRange/rangeCommit) and selects
  // that specific day/week/month at the current granularity — so a range no longer traps you (Fuad
  // 2026-07-15: previously only the ✕ could clear it). Keep the current pane (track DNA across days).
  const pick = (y, d) => { setCustomRange(null); setRangeCommit(null); const k = keyFor(gran, dateOf(y, d)); setSel(k); ensureDetail(); };

  const hov = hover ? { date: fmtDate(dateOf(hover.y, hover.d)), count: hover.count, top: hover.top } : null;
  const NM = detail && detail.names;
  const selArr = selHours.size ? [...selHours].sort((a, b) => a - b) : null;
  const period = (detail && sel) ? (detail[gran] || {})[sel] : null;
  const P = (gran === "month" && selArr && period && period.h) ? mergeHours(period, selArr) : period;
  const selLabel = sel ? (gran === "day" ? fmtDate(new Date(sel + "T00:00:00Z")) : gran === "week" ? "Week of " + fmtDate(new Date(sel + "T00:00:00Z")) : MONF[+sel.split("-")[1] - 1] + " " + sel.split("-")[0]) : "";
  const aRow = ([i, p]) => ({ name: NM[i], plays: p });
  const iRow = ([t, a, p]) => ({ title: NM[t], artist: NM[a], plays: p });
  // (song→album cover hooks live ABOVE the `if (!cal)` early return — see note there)

  // Unified panel state: a committed range takes priority over a period `sel`. Both feed the same
  // DraggablePanel markup. `panelKind` labels the overview; `panelP` is the merged pseudo-period.
  const rangeOpen = !!rangeCommit;
  const panelOpen = rangeOpen || !!sel;
  const panelKind = rangeOpen ? "range" : gran;
  const panelP = rangeOpen ? rangePeriod : P;
  const rangeLbl = rangeCommit ? fmtDate(new Date(rangeCommit[0])) + " → " + fmtDate(new Date(rangeCommit[1])) : "";
  const panelLabel = rangeOpen ? rangeLbl : selLabel;
  const panelTitle = rangeOpen ? ("range overview · " + rangeLbl) : (gran + " overview" + (selLabel ? " · " + selLabel : ""));
  // closing the panel clears the range too (✕ on the pane); a plain period close just clears sel.
  const closePanel = () => { if (rangeOpen) { setRangeCommit(null); setCustomRange(null); setSelYear(null); } else setSel(null); };

  return (
    <div className="r-view tv-page">
      <div className="r-viewhead">
        <div>
          <div className="r-kicker">Calendar · {years[0]}—{years[years.length - 1]} · {fmt(max)} in a single day</div>
          <h1 className="r-title">Every <em>day</em><span className="dot">.</span></h1>
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
      <ClockCard R={R} selHours={selHours} setSelHours={setSelHours} customRange={customRange} />
      </div>

      {/* period / range overview — a committed range takes priority over a day/week/month sel */}
      {panelOpen && (
        <DraggablePanel storageKey="rot-cal-panel" title={panelTitle} onClose={closePanel}>
          {!detail ? <div style={{ color: "var(--ink-faint)", fontFamily: "var(--mono)", fontSize: 12, padding: "10px 0" }}>loading the detail…</div>
            : !panelP || !panelP.t ? <div style={{ color: "var(--ink-soft)" }}><b>{panelLabel}</b> — too quiet for a full breakdown{!rangeOpen && hov && hov.top ? <> (mostly {hov.top[0]})</> : ""}.</div>
              : <>
                <div className="cal-ov-head">
                  <div>
                    <div className="r-mono" style={{ fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: 4 }}>{panelKind} overview</div>
                    <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 24 }}>{panelLabel}</div>
                  </div>
                  <div style={{ display: "flex", gap: 22, alignItems: "baseline" }}>
                    <div><div className="r-stat-n" style={{ fontSize: 26 }}>{fmt(panelP.t)}</div><div className="r-mono" style={{ fontSize: 8.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ink-faint)" }}>plays</div></div>
                    {(rangeOpen || gran !== "day") && <div><div className="r-stat-n" style={{ fontSize: 26 }}>{panelP.n}</div><div className="r-mono" style={{ fontSize: 8.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ink-faint)" }}>active days</div></div>}
                  </div>
                </div>

                {/* Tab row: pane selector + list/grid toggle (albums, songs, artists) */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "16px 0 14px", flexWrap: "wrap" }}>
                  <div className="r-seg" style={{ flex: 1, minWidth: 0 }}>
                    {[["artists", "artists"], ["albums", "albums"], ["songs", "songs"], ["dna", "sound dna"]].map(([k, l]) =>
                      <button key={k} data-on={pane === k} onClick={() => setPane(k)}>{l}</button>)}
                  </div>
                  {pane !== "dna" && (
                    <div className="r-seg cal-view-seg" title="list / grid view">
                      <button data-on={panelView === "list"} onClick={() => setPanelViewPersist("list")} title="list view">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <line x1="4" y1="2" x2="12" y2="2"/><line x1="4" y1="6" x2="12" y2="6"/><line x1="4" y1="10" x2="12" y2="10"/>
                          <rect x="0" y="0.5" width="2.5" height="2.5" rx="0.5"/><rect x="0" y="4.5" width="2.5" height="2.5" rx="0.5"/><rect x="0" y="8.5" width="2.5" height="2.5" rx="0.5"/>
                        </svg>
                      </button>
                      <button data-on={panelView === "grid"} onClick={() => setPanelViewPersist("grid")} title="grid view">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <rect x="0" y="0" width="5" height="5" rx="1"/><rect x="7" y="0" width="5" height="5" rx="1"/>
                          <rect x="0" y="7" width="5" height="5" rx="1"/><rect x="7" y="7" width="5" height="5" rx="1"/>
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
                {!rangeOpen && selArr && (gran === "month"
                  ? <div className="r-mono" style={{ fontSize: 9.5, color: "var(--accent)", marginBottom: 12 }}>filtered to {selHours.size} selected hour{selHours.size > 1 ? "s" : ""} · {fmt(panelP.t)} plays</div>
                  : <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", marginBottom: 12 }}>hour filter shows on the heatmap · switch to <b>month</b> to filter this list</div>)}

                {pane === "artists" && (() => {
                  const rows = panelP.a.map(aRow);
                  const shown = rows.slice(0, rowCap);
                  const remaining = rows.length - rowCap;
                  if (panelView === "grid") return (
                    <>
                      <div className="cal-grid">
                        {shown.map((r, i) => {
                          const rec = R.byId[R.slug(r.name)] || {};
                          return (
                            <div key={r.name} className="cal-gtile" data-link={!!R.byId[R.slug(r.name)]} onClick={() => R.byId[R.slug(r.name)] && go("artist", R.slug(r.name))}>
                              <GenCover hue={rec.hue || 210} name={r.name} size="100%" style={{ aspectRatio: "1", width: "100%", height: "auto" }} radius={3} />
                              <div className="cal-gtile-title">{r.name}</div>
                              <div className="cal-gtile-plays">{fmt(r.plays)}</div>
                            </div>
                          );
                        })}
                      </div>
                      {remaining > 0 && (
                        <div className="cal-more-row">
                          <button className="cal-more" onClick={() => setRowCap(c => c + panelN)}>
                            show {Math.min(panelN, remaining)} more · {remaining} left
                          </button>
                          <div className="cal-n-seg r-seg">
                            {[10, 25, 50].map(n => <button key={n} data-on={panelN === n} onClick={() => setPanelNPersist(n)}>{n}</button>)}
                          </div>
                        </div>
                      )}
                    </>
                  );
                  return (
                  <div className="cal-rows">
                    {shown.map((r, i) => (
                      <div key={r.name} className="cal-row" data-link={!!R.byId[R.slug(r.name)]} onClick={() => R.byId[R.slug(r.name)] && go("artist", R.slug(r.name))}>
                        <span className="cal-rk">{String(i + 1).padStart(2, "0")}</span>
                        <GenCover hue={(R.byId[R.slug(r.name)] || {}).hue || 210} name={r.name} size={34} radius={3} />
                        <span className="cal-nm">{r.name}</span>
                        <span className="cal-pl">{fmt(r.plays)}</span>
                      </div>
                    ))}
                    {remaining > 0 && (
                      <div className="cal-more-row">
                        <button className="cal-more" onClick={() => setRowCap(c => c + panelN)}>
                          show {Math.min(panelN, remaining)} more · {remaining} left
                        </button>
                        <div className="cal-n-seg r-seg">
                          {[10, 25, 50].map(n => <button key={n} data-on={panelN === n} onClick={() => setPanelNPersist(n)}>{n}</button>)}
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })()}
                {(pane === "albums" || pane === "songs") && (() => {
                  const isSongs = pane === "songs";
                  const rows = (isSongs ? panelP.s : panelP.al).map(iRow);
                  const shown = rows.slice(0, rowCap);
                  const remaining = rows.length - rowCap;
                  if (panelView === "grid") return (
                    <>
                      <div className="cal-grid">
                        {shown.map((r, i) => {
                          const hue = (R.byId[R.slug(r.artist)] || {}).hue || 210;
                          // songs: use album cover from media-index if loaded; albums: use artist hue (no cover in al rows)
                          const ck2 = r.title + "\x00" + r.artist;
                          const albumCover = isSongs ? (songAlbumCover[ck2] || "") : (albumCoverMap[ck2] || "");
                          return (
                            <div key={r.title + i} className="cal-gtile" data-link={true}
                              onClick={() => go(isSongs ? "track" : "album", R.slug(r.artist) + "~" + R.slug(r.title))}>
                              <GenCover hue={hue} name={r.title} image={albumCover} thumb={albumCover} size="100%" style={{ aspectRatio: "1", width: "100%", height: "auto" }} radius={3} />
                              <div className="cal-gtile-title">{r.title}</div>
                              <div className="cal-gtile-plays">{r.artist} · {fmt(r.plays)}</div>
                            </div>
                          );
                        })}
                      </div>
                      {remaining > 0 && (
                        <div className="cal-more-row">
                          <button className="cal-more" onClick={() => setRowCap(c => c + panelN)}>
                            show {Math.min(panelN, remaining)} more · {remaining} left
                          </button>
                          <div className="cal-n-seg r-seg">
                            {[10, 25, 50].map(n => <button key={n} data-on={panelN === n} onClick={() => setPanelNPersist(n)}>{n}</button>)}
                          </div>
                        </div>
                      )}
                    </>
                  );
                  return (
                  <div className="cal-rows">
                    {shown.map((r, i) => {
                      const hue = (R.byId[R.slug(r.artist)] || {}).hue || 210;
                      const ck2 = r.title + "\x00" + r.artist;
                      const albumCover = isSongs ? (songAlbumCover[ck2] || "") : (albumCoverMap[ck2] || "");
                      return (
                        <div key={r.title + i} className="cal-row" data-link={true}
                          onClick={() => go(isSongs ? "track" : "album", R.slug(r.artist) + "~" + R.slug(r.title))}>
                          <span className="cal-rk">{String(i + 1).padStart(2, "0")}</span>
                          <GenCover hue={hue} name={r.title} image={albumCover} thumb={albumCover} size={34} radius={3} />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div className="cal-nm" style={{ fontStyle: "italic" }}>{r.title}</div>
                            <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.artist}</div>
                          </div>
                          <span className="cal-pl">{fmt(r.plays)}</span>
                        </div>
                      );
                    })}
                    {remaining > 0 && (
                      <div className="cal-more-row">
                        <button className="cal-more" onClick={() => setRowCap(c => c + panelN)}>
                          show {Math.min(panelN, remaining)} more · {remaining} left
                        </button>
                        <div className="cal-n-seg r-seg">
                          {[10, 25, 50].map(n => <button key={n} data-on={panelN === n} onClick={() => setPanelNPersist(n)}>{n}</button>)}
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })()}
                {pane === "dna" && (
                  <div style={{ display: "flex", justifyContent: "center", padding: "6px 0" }}>
                    <div style={{ maxWidth: 360, width: "100%" }}>
                      {/* SOUND DNA is a 6-axis Radar (SVG polygon), NOT bars. The polygon `points`
                          are the value-driven attribute; Radar already animates them via
                          transition:all .9s on the <polygon>. A STABLE key ("cal-dna") keeps the
                          same Radar instance mounted across period ↔ range ↔ hour-filter switches
                          so the polygon tweens to new values instead of React remounting it. */}
                      <Radar key="cal-dna" axes={["NRG", "MOOD", "ACOU", "BPM", "DANCE", "INSTR"]} values={panelP.d} values2={avg} run={true} size={300} />
                      <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", textAlign: "center", marginTop: 6 }}>solid = this {panelKind} · dashed = your all-time average</div>
                    </div>
                  </div>
                )}
              </>}
        </DraggablePanel>
      )}

      {/* barcode / horizon time-control — sticky-bottom, LAST in the view flow so it
          docks and reveals the footer at the page bottom instead of covering it. */}
      {cal && (
        <BarcodeScrubber
          years={years} selYear={selYear}
          gran={gran} setGran={setGran} setSel={setSel}
          customRange={customRange} setCustomRange={setCustomRange}
          // committed on pointer-up (handle/strip drag) → open + aggregate the range overview panel
          onRangeCommit={(range) => { ensureDetail(); setRangeCommit(range); }}
          onYear={(y, range) => {
            setSelYear(y);
            setCustomRange(range);  // year click also clips the heatmap to that whole year
            ensureDetail(); setRangeCommit(range);  // year is a committed range → range overview
            // jump the page to that year's heatmap row (the calendar shows all years stacked)
            const el = heatRef.current;
            if (y != null && el) {
              const r = el.getBoundingClientRect();
              const frac = (topPad + years.indexOf(y) * (rowH + yearGap)) / H;
              window.scrollTo({ top: window.scrollY + r.top + frac * r.height - 110, behavior: "smooth" });
            }
          }}
        />
      )}

      <style>{`
        .cal-heatwrap { display: grid; grid-template-columns: minmax(0,1fr) 210px; gap: var(--gap); align-items: start; }
        /* Rhythm rail follows the scroll — sticky below the header. Sticky only works here since
           .r-app moved to overflow-x: CLIP (hidden made it a scroll container, which silently
           defeated sticky for every view — the barcode scrubber's fixed-position workaround
           exists for the same reason). self-max-height + own scroll caps a tall clock. */
        /* .cal-heatwrap > child selector outguns core's .r-card { position: relative } (equal
           class specificity otherwise, and core's sheet lands later — sticky silently lost) */
        .cal-heatwrap > .cal-clock { position: sticky; top: 76px; align-self: start; max-height: calc(100vh - 88px); overflow-y: auto; }
        @media (max-width: 900px) { .cal-heatwrap { grid-template-columns: 1fr; } .cal-heatwrap > .cal-clock { position: static; max-height: none; overflow-y: visible; } }
        .cal-detail { font-family: var(--serif); font-size: 15px; color: var(--ink-soft); margin-bottom: 12px; min-height: 22px; }
        .cal-art { color: var(--accent); cursor: pointer; border-bottom: 1px solid currentColor; }
        .cal-art:hover { opacity: .8; }
        .cal-ov-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
        .cal-rows { display: grid; gap: 2px; }
        .cal-row { display: flex; align-items: center; gap: 11px; padding: 6px 6px; border-radius: 6px; transition: background .12s; }
        .cal-row[data-link="true"] { cursor: pointer; }
        .cal-row[data-link="true"]:hover { background: var(--bg-3); }
        .cal-rk { font-family: var(--mono); font-size: 10px; color: var(--ink-faint); width: 18px; flex-shrink: 0; }
        .cal-nm { font-size: 13.5px; flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cal-pl { font-family: var(--mono); font-size: 11px; color: var(--ink-soft); flex-shrink: 0; text-align: right; margin-left: auto; }
        .cal-float { position: fixed; right: 24px; bottom: 82px; z-index: 60; width: min(560px, 92vw);
          max-height: 82vh; display: flex; flex-direction: column; background: var(--panel);
          border: 1px solid var(--rule-2); border-radius: 12px; box-shadow: 0 24px 60px -20px rgba(0,0,0,.7); overflow: hidden; }
        .cal-float-bar { display: flex; align-items: center; gap: 8px; padding: 9px 12px; cursor: grab;
          background: var(--bg-3); border-bottom: 1px solid var(--rule); user-select: none; }
        .cal-float-bar:active { cursor: grabbing; }
        .cal-float-grip { color: var(--ink-faint); font-size: 12px; }
        .cal-float-title { font-family: var(--mono); font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-soft); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cal-float-x { background: none; border: none; color: var(--ink-faint); cursor: pointer; font-size: 12px; line-height: 1; }
        .cal-float-x:hover { color: var(--ink); }
        .cal-float-peek-btn { background: none; border: none; color: var(--ink-faint); cursor: pointer; font-size: 11px; line-height: 1; display: none; }
        .cal-float-peek-btn:hover { color: var(--ink-soft); }
        /* Full-size peek expand target (mobile only — enabled in the ≤760px block). Hidden on desktop
           so it never covers the resizable panel. */
        .cal-float-peek-hit { display: none; }
        .cal-float-body { padding: 18px 20px; overflow-y: auto; overflow-x: hidden; min-width: 0; }
        /* No horizontal scroll (refinement #5): the overview head + hour-filter notes can wrap,
           the DNA radar is centered/max-width, and the list rows already ellipsis their titles. */
        .cal-ov-head { max-width: 100%; }
        /* "show more" button that gates the panel list length (refinement #2 — lazy cover requests) */
        .cal-more { display: block; flex: 1; margin-top: 0; padding: 7px 0;
          background: var(--bg-3); border: 1px solid var(--rule); border-radius: 6px;
          color: var(--ink-soft); font-family: var(--mono); font-size: 10px; letter-spacing: .06em;
          cursor: pointer; }
        .cal-more:hover { color: var(--ink); border-color: var(--rule-2); }
        /* "show more" row: the button fills the left, the 10/25/50 size selector sits on the right */
        .cal-more-row { display: flex; align-items: stretch; gap: 6px; margin-top: 4px; }
        .cal-n-seg button { font-size: 10px; padding: 2px 7px; }
        /* list/grid toggle in the tab row */
        .cal-view-seg button { padding: 4px 7px; line-height: 1; }
        /* grid view — auto-fill cover tiles */
        .cal-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(72px, 1fr)); gap: 10px; margin-bottom: 4px; }
        .cal-gtile { min-width: 0; cursor: default; }
        .cal-gtile[data-link="true"] { cursor: pointer; }
        .cal-gtile-title { font-size: 10px; margin-top: 5px; line-height: 1.2;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .cal-gtile-plays { font-family: var(--mono); font-size: 8.5px; color: var(--ink-faint);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        /* Desktop resize affordances (refinement #3). Hidden on the mobile sheet (≤760px below). */
        .cal-float-rz { position: absolute; touch-action: none; z-index: 4; }
        .cal-float-rz-e { top: 0; bottom: 12px; right: 0; width: 6px; cursor: ew-resize; }
        .cal-float-rz-s { left: 0; right: 12px; bottom: 0; height: 6px; cursor: ns-resize; }
        .cal-float-rz-se { right: 0; bottom: 0; width: 24px; height: 24px; cursor: nwse-resize;
          display: flex; align-items: flex-end; justify-content: flex-end; padding: 3px;
          color: var(--ink-faint); }
        .cal-float-rz-se:hover { color: var(--ink-soft); }
        /* ── Barcode / horizon time-control — FIXED to the viewport bottom, docked above the
           footer. .r-app has overflow-x:hidden which defeats position:sticky in real browsers, so
           we pin with position:fixed and set bottom from JS (footer-aware, rAF-throttled): 0px
           while scrolling, rising to the footer's height at page end so the footer stays visible.
           left/right:0 span the viewport edge-to-edge (no full-bleed margin trick needed now). */
        .bc-scrubber {
          position: fixed; left: 0; right: 0; bottom: 0; z-index: 50;
          background: color-mix(in oklab, var(--bg) 90%, transparent);
          -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
          border-top: 1px solid var(--rule);
          padding: 6px 12px;
          padding-bottom: calc(6px + env(safe-area-inset-bottom));
          box-sizing: border-box;
        }
        /* reserve space at the view bottom so page content clears the fixed bar (strip 40 + header
           + label rows + padding ≈ 118px). Matches the fixed bar's rendered height. */
        .tv-page { padding-bottom: 130px; }
        /* Slim header row: granularity · readout · view toggle */
        .bc-head { display: flex; align-items: center; gap: 12px; margin-bottom: 5px; flex-wrap: wrap; }
        .bc-seg { flex-shrink: 0; }
        .bc-seg button { font-size: 10px; padding: 2px 8px; }
        /* range takes priority — the Day/Week/Month buttons dim + go non-interactive while a
           customRange is active (clear the range to re-enable them). */
        .bc-seg[data-locked="true"] { opacity: .4; }
        .bc-seg[data-locked="true"] button { cursor: not-allowed; pointer-events: none; }
        .bc-viewseg { margin-left: auto; }
        .bc-readout { font-family: var(--mono); font-size: 10.5px; color: var(--ink-soft);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; min-width: 0; }
        .bc-readout b { color: var(--ink); }
        .bc-hint { color: var(--ink-faint); }
        .bc-hov { color: oklch(0.74 0.18 340); }
        .bc-clear { background: none; border: none; color: var(--ink-faint); cursor: pointer;
          font-size: 11px; line-height: 1; margin-left: 8px; padding: 0 2px; }
        .bc-clear:hover { color: var(--accent); }
        /* The interactive strip — the render layer + the shared overlay stack here. */
        .bc-strip { position: relative; width: 100%; height: 40px; touch-action: pan-y; cursor: crosshair; }
        .bc-svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
        /* Year click targets */
        .bc-yearhits { position: absolute; inset: 0; }
        .bc-yearhit { position: absolute; top: 0; bottom: 0; padding: 0; margin: 0;
          background: transparent; border: none; cursor: pointer; }
        .bc-yearhit:hover { background: color-mix(in oklab, var(--accent) 10%, transparent); }
        /* Translucent veil over the clipped-out region */
        .bc-veil { position: absolute; top: 0; bottom: 0;
          background: color-mix(in oklab, var(--bg) 62%, transparent); pointer-events: none; }
        /* Move zone between the handles — grab to slide the whole range (refinement #6).
           z-index below the handles (3) so edge-grabs still resize; touch-action:none for pointer
           capture on touch. */
        .bc-move { position: absolute; top: 0; bottom: 0; z-index: 2;
          cursor: grab; touch-action: none; }
        .bc-move:active { cursor: grabbing; }
        /* Premiere-style range handles — slim accent grips, ≥14px invisible touch pad. */
        .bc-handle { position: absolute; top: -2px; bottom: -2px; width: 16px;
          transform: translateX(-8px); cursor: ew-resize; touch-action: none;
          display: flex; align-items: center; justify-content: center; z-index: 3; }
        .bc-grip { display: block; width: 4px; height: 100%;
          background: var(--accent); border-radius: 2px;
          box-shadow: 0 0 0 1px color-mix(in oklab, var(--bg) 50%, transparent); }
        .bc-handle:hover .bc-grip { filter: brightness(1.15); width: 5px; }
        /* HTML year label row (no SVG glyph stretch) */
        .bc-yearrow { position: relative; height: 12px; margin-top: 2px; }
        .bc-yearlbl { position: absolute; top: 0; text-align: center;
          font-family: var(--mono); font-size: 8px; line-height: 12px;
          color: var(--ink-faint); overflow: hidden; white-space: nowrap;
          pointer-events: none; user-select: none; }
        .bc-yearlbl[data-on="true"] { color: var(--accent); }
        @media (max-width: 520px) {
          .bc-readout { flex-basis: 100%; order: 3; }
          .bc-viewseg { margin-left: auto; }
        }
        /* mobile: bottom sheet — full width, finger-resizable via the bar (see onBarTouchStart).
           !important defeats any stored PC drag position. Default 40vh = calendar stays visible. */
        @media (max-width: 760px) {
          /* Expanded sheet: its bottom sits on the scrubber's LIVE top edge (--scrub-top, set from
             JS every scroll/resize/visualViewport change — bug #3), never overlapping the strip.
             max-height also subtracts that gap so a tall sheet still clears the scrubber. */
          .cal-float { left: 0 !important; right: 0 !important; bottom: var(--scrub-top, 0px) !important; top: auto !important;
            width: 100% !important; height: var(--sheet-h, 40vh) !important;
            max-height: calc(96vh - var(--scrub-top, 0px)) !important;
            border-radius: 14px 14px 0 0; border-left: none; border-right: none; border-bottom: none; }
          /* the desktop resize grips are meaningless in the CSS-driven sheet — remove them */
          .cal-float-rz { display: none !important; }
          .cal-float-bar { padding: 12px; touch-action: none; justify-content: center; position: relative; }
          .cal-float-bar::before { content: ""; position: absolute; top: 5px; left: 50%; transform: translateX(-50%);
            width: 44px; height: 4px; border-radius: 999px; background: var(--rule-2); }
          .cal-float-body { flex: 1; }
          /* peek-btn visible on mobile only */
          .cal-float-peek-btn { display: block; }
          /* PEEK STATE: slim pill docked so its bottom sits on the scrubber's live top edge
             (--scrub-top — bug #2). The pill shows only the bar (44px); body is hidden.
             The full-size .cal-float-peek-hit overlay is the ONLY tap target (bug #1). */
          .cal-float[data-peek="true"] {
            bottom: var(--scrub-top, 92px) !important;
            height: 44px !important;
            max-height: 44px !important;
            border-radius: 22px !important;
            border: 1px solid var(--rule-2) !important;
            box-shadow: 0 4px 20px -8px rgba(0,0,0,.6) !important;
            cursor: pointer;
            overflow: hidden;
          }
          .cal-float[data-peek="true"] .cal-float-bar {
            padding: 0 14px;
            height: 44px;
            border-bottom: none;
            background: var(--panel);
          }
          .cal-float[data-peek="true"] .cal-float-bar::before { display: none; }
          .cal-float[data-peek="true"] .cal-float-grip { display: none; }
          .cal-float[data-peek="true"] .cal-float-body { display: none; }
          /* In peek, the bar's contents don't receive taps — the overlay button does. The ✕ stays
             tappable (higher stacking) so the user can still close from the pill. */
          .cal-float[data-peek="true"] .cal-float-bar { pointer-events: none; }
          .cal-float[data-peek="true"] .cal-float-x { pointer-events: auto; position: relative; z-index: 3; }
          .cal-float[data-peek="true"] .cal-float-peek-hit {
            display: block; position: absolute; inset: 0; z-index: 2;
            width: 100%; height: 100%; margin: 0; padding: 0;
            background: transparent; border: none; border-radius: 22px;
            cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: transparent;
          }
        }
      `}</style>
    </div>
  );
}
