// rotation-views1.jsx — Overview
// exports: OverviewView, Popover (shared) + WallGrid/BubbleField (used by Overview)

// shared hover popover (paper card following cursor)
function Popover({ data }) {
  if (!data) return null;
  const { x, y, title, pip, meta, rows, hint } = data;
  const ax = Math.min(Math.max(x, 140), window.innerWidth - 140);
  const below = y < 230;
  return (
    <div className={"r-pop on" + (below ? " below" : "")}
      style={{ left: ax, top: below ? y + 150 : y - 8,
        transform: below ? "translate(-50%,0) translateY(14px)" : undefined }}>
      <div className="pm"><span className="pip" style={{ background: `oklch(0.7 0.13 ${pip})` }} />{meta}</div>
      <div className="pt">{title}</div>
      {rows && <div className="pr">{rows.map((r, i) =>
        <div className="kv" key={i}><span>{r[0]}</span><b>{r[1]}</b></div>)}</div>}
      {hint && <div className="phint">{hint}</div>}
    </div>
  );
}

// ════════════════════════ OVERVIEW ════════════════════════
// Top-artists strip with an all-time ⇄ this-year toggle (this-year ranks kept artists by their
// current-year plays from the per-year yp map).
function TopArtistsPeek({ R, go }) {
  const [span, setSpan] = React.useState("all");
  const cy = new Date().getUTCFullYear();
  const items = React.useMemo(() => {
    if (span === "all") return R.ARTISTS.slice(0, 12).map(a => ({ ...a, n: a.plays }));
    return R.ARTISTS.map(a => ({ ...a, n: (a.yp && a.yp[cy]) || 0 })).filter(a => a.n > 0)
      .sort((x, y) => y.n - x.n).slice(0, 12);
  }, [R, span]);
  return (
    <div className="r-card ov-wall" style={{ gridColumn: "span 7", padding: 18 }}>
      <div className="r-card-h" style={{ padding: 0, marginBottom: 14 }}>
        <span className="lbl"><b>Top artists</b></span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <span className="r-seg">
            <button data-on={span === "all"} onClick={() => setSpan("all")}>all time</button>
            <button data-on={span === "year"} onClick={() => setSpan("year")}>'{String(cy).slice(2)}</button>
          </span>
          <span className="meta" style={{ cursor: "pointer" }} onClick={() => go("explore")}>explore ↗</span>
        </span></div>
      <div className="r-xscroll ov-wallgrid">
        {items.map((a, i) => (
          <div key={a.id} onClick={() => go("artist", a.id)} style={{ cursor: "pointer", flex: "none", width: 96 }}>
            <div style={{ position: "relative" }}>
              <GenCover hue={a.hue} name={a.name} size={"100%"} style={{ aspectRatio: "1", width: "100%", height: "auto" }} />
              <span className="r-mono" style={{ position: "absolute", top: 5, left: 6, fontSize: 9,
                color: "rgba(255,255,255,.85)", textShadow: "0 1px 2px #000" }}>{String(i + 1).padStart(2, "0")}</span>
            </div>
            <div style={{ fontSize: 11.5, marginTop: 7, lineHeight: 1.25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</div>
            <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)" }}>{fmt(a.n)} plays{span === "year" ? ` in '${String(cy).slice(2)}` : ""}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// OvCalRail — the calendar as a NARROW vertical filter rail beside the map: pick year + month,
// day ⇄ week granularity, click a cell. What it drives today: the map/flow scrub to that year,
// and the cell deep-opens its day/week in the full Calendar. (Day-level geography needs a new
// build export — the tandem deepens next iteration.)
function OvCalRail({ go, onYear, onPeriod, init }) {
  // init = {year, period} restored from the URL — preselect the cell/year so the rail's highlight
  // matches the filtered map on a deep-link/refresh.
  const [selDay, setSelDay] = React.useState((init && init.period && init.period.key) || null);
  const [detReady, setDetReady] = React.useState(!!window.ROTATION_CAL_DETAIL);
  React.useEffect(() => {   // period → results filtering needs the detail file; fetch it lazily
    if (window.ROTATION_CAL_DETAIL) return;
    let s = document.getElementById("rotation-cal-detail-js");
    if (!s) { s = document.createElement("script"); s.id = "rotation-cal-detail-js"; s.src = "calendar-detail.js"; document.head.appendChild(s); }
    const on = () => setDetReady(true); s.addEventListener("load", on);
    return () => s.removeEventListener("load", on);
  }, []);
  const [cal, setCal] = React.useState(window.ROTATION_CAL || null);
  const now = new Date();
  const _ip = init && init.period, _ik = _ip && init.period.key;
  const [yr, setYr] = React.useState((_ik && +_ik.slice(0, 4)) || (init && init.year) || now.getUTCFullYear());
  const [mo, setMo] = React.useState((_ik && _ik.length >= 7 ? +_ik.slice(5, 7) - 1 : now.getUTCMonth()));   // 0-11
  const [gran, setGran] = React.useState((_ip && init.period.gran) || "day");   // day | week | month
  React.useEffect(() => {
    if (window.ROTATION_CAL) return;
    let s = document.getElementById("rotation-cal-js");
    if (!s) { s = document.createElement("script"); s.id = "rotation-cal-js"; s.src = "calendar.js"; document.head.appendChild(s); }
    const on = () => setCal(window.ROTATION_CAL);
    s.addEventListener("load", on);
    return () => s.removeEventListener("load", on);
  }, []);
  const years = cal ? Object.keys(cal.byYear).map(Number).sort((a, b) => b - a) : [];
  const y = cal && cal.byYear[yr];
  const MON = window.MON;
  if (!y) return <div className="r-card" style={{ padding: 16, fontFamily: "var(--mono)", fontSize: 10, color: "var(--ink-faint)" }}>calendar…</div>;
  const counts = y.counts || [];
  const mx = Math.max(1, ...counts);
  const first = Date.UTC(yr, mo, 1), dim = new Date(Date.UTC(yr, mo + 1, 0)).getUTCDate();
  const jan1 = Date.UTC(yr, 0, 1);
  const doy = (d) => Math.round((Date.UTC(yr, mo, d) - jan1) / 86400e3);
  const pad = (new Date(first).getUTCDay() + 6) % 7;
  // weeks of the month as rows of day indices (nulls pad)
  const cells = [...Array(pad).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const weeks = []; for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  const pick = (d) => {
    const iso = new Date(Date.UTC(yr, mo, d)).toISOString().slice(0, 10);
    let key = iso;
    if (gran === "week") { const dow = (new Date(Date.UTC(yr, mo, d)).getUTCDay() + 6) % 7; key = new Date(Date.UTC(yr, mo, d) - dow * 86400e3).toISOString().slice(0, 10); }
    if (gran === "month") key = `${yr}-${String(mo + 1).padStart(2, "0")}`;   // whole selected month
    setSelDay(key === selDay ? null : key);
    onPeriod && onPeriod(key === selDay ? null : { gran, key });   // filters the map's results (stays on page)
  };
  // COMPACT: fits the pulse-row height — a single horizontal strip of the month's days.
  const dayStrip = Array.from({ length: dim }, (_, i) => i + 1);
  return (
    <div className="r-card ov-calrail" style={{ padding: "12px 14px" }}>
      <div className="r-card-h" style={{ padding: 0, marginBottom: 8 }}>
        <span className="lbl"><b>Calendar</b></span>
        <span className="meta" style={{ cursor: "pointer" }} onClick={() => go("calendar")}>full ↗</span>
      </div>
      <div style={{ display: "flex", gap: 5, marginBottom: 8, alignItems: "center" }}>
        <select className="ov-calsel" style={{ flex: "0 0 auto", width: "auto" }} value={yr} onChange={(e) => { const v = +e.target.value; setYr(v); onYear && onYear(v); }}>
          {years.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select className="ov-calsel" style={{ flex: "0 0 auto", width: "auto" }} value={mo} onChange={(e) => setMo(+e.target.value)}>
          {MON.map((m, i) => <option key={m} value={i}>{m}</option>)}
        </select>
        <div className="r-seg r-seg-sm" style={{ display: "flex", marginLeft: "auto" }}>
          {["day", "week", "month"].map(g => (
            <button key={g} data-on={gran === g} title={g === "month" ? "filter by the whole selected month" : undefined}
              onClick={() => { setGran(g); setSelDay(null); onPeriod && onPeriod(null); }}>{g[0]}</button>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${dim}, 1fr)`, gap: 2 }}>
        {dayStrip.map((d) => {
          const v = counts[doy(d)] || 0;
          const iso = `${yr}-${String(mo + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const isSel = selDay && (gran === "day" ? selDay === iso
            : gran === "month" ? iso.slice(0, 7) === selDay
            : (new Date(iso) >= new Date(selDay) && new Date(iso) < new Date(new Date(selDay).getTime() + 7 * 86400e3)));
          return <i key={d} title={`${iso} · ${v} plays — filter results`} onClick={() => pick(d)}
            style={{ height: 22, borderRadius: 2, background: v ? `oklch(${0.32 + (v / mx) * 0.45} ${0.05 + (v / mx) * 0.12} var(--acc-h))` : "var(--bg-3)",
              opacity: v ? 1 : 0.5, cursor: "pointer", outline: isSel ? "1.5px solid var(--accent)" : "none" }} />;
        })}
      </div>
      <div className="r-mono" style={{ fontSize: 8, color: "var(--ink-faint)", marginTop: 7 }}>
        {selDay ? <>filtering {gran} · <span style={{ cursor: "pointer", color: "var(--accent)" }} onClick={() => { setSelDay(null); onPeriod && onPeriod(null); }}>clear ✕</span></> : "click a " + gran + " to filter the map"}
      </div>
    </div>
  );
}

// OvMapBand — the geography band: the FULL MapView (+ the calendar rail slotted into its left
// column, under deepest places). Mounts once the user scrolls near, so Overview's first paint
// doesn't pay for world-map.js.
function OvMapBand({ go, extYear, calPeriod, onStats, calRail, statSlot, restReady, initFilter, onFilter }) {
  const [ref, seen] = useInView();
  const [on, setOn] = React.useState(false);
  React.useEffect(() => { if (seen) setOn(true); }, [seen]);
  // MapView reads the deferred EXPLORE/AUDIO — only mount it once music-rest has landed
  // (in practice always true by the time the map scrolls into view).
  const ready = on && restReady;
  return (
    <div ref={ref} style={{ minHeight: ready ? 0 : 220 }}>
      {ready ? <MapView go={go} embedded extYear={extYear} calPeriod={calPeriod} onStats={onStats} calSlot={calRail} statSlot={statSlot} initFilter={initFilter} onFilter={onFilter} />
        : <div className="r-card" style={{ padding: 40, textAlign: "center", color: "var(--ink-faint)", fontFamily: "var(--mono)", fontSize: 11 }}>the world map loads as you scroll…</div>}
    </div>
  );
}

// parse an Overview filter seed from the hash id: date (`y=2019`, `p=month~2019-06`) + the map's
// genre/mode by NAME (`f=<family>`, `s=<subgenre>`, `md=country`) — names, not array indices, so
// bookmarks survive a genre reorder (matches Explore's convention). ";"-separated.
function parseOvSeed(seed) {
  const out = { year: null, period: null, filter: null };
  if (!seed) return out;
  const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  let famName = null, subName = null, mode = null;
  for (const kv of seed.split(";")) {
    const i = kv.indexOf("="); if (i < 0) continue;
    const k = kv.slice(0, i), v = kv.slice(i + 1);
    if (k === "y") out.year = +v || null;
    else if (k === "p") { const j = v.indexOf("~"); if (j > 0) out.period = { gran: v.slice(0, j), key: v.slice(j + 1) }; }
    else if (k === "f") famName = v;
    else if (k === "s") subName = v;
    else if (k === "md") mode = v;
  }
  const R = window.ROTATION;
  let fam = null, sub = null;
  if (R && subName) { const si = R.SUBS.findIndex(x => norm(x.name) === norm(subName)); if (si >= 0) { sub = si; if (R.SUBS[si].fam != null) fam = R.SUBS[si].fam; } }
  if (R && famName && fam == null) { const fm = R.FAMILIES.find(f => norm(f.family) === norm(famName)); if (fm) fam = fm.i; }
  if (fam != null || sub != null || mode) out.filter = { mode: mode || "city", filt: { fam, sub } };
  return out;
}

// Emotional-weather card. The last-90-days block (baseline vs last-90d sounds/reads; routes to
// the story) sits on top; the RELEASE-DECADE strip treemap (formerly hidden behind a tab) sits
// directly underneath at reduced height — both fit in one module (Fuad, 2026-07-17). The strip
// stays drillable to per-year. (A by-year emotional-weather timeline is parked as a future
// pairing with the map's date scrubber.)
function OvWeatherCard({ R, go, restReady }) {
  const [zoom, setZoom] = React.useState(null);   // clicked decade (per-year drill-down) or null
  const M = R.INSIGHTS && R.INSIGHTS.MOOD, N = M && M.now;
  const ad = R.INSIGHTS && R.INSIGHTS.ADOPTION;
  const decades = React.useMemo(() =>
    ad && ad.decades ? ad.decades.filter(d => d.plays > 0).slice().sort((a, b) => a.decade - b.decade) : [],
    [ad]);
  const hasDec = decades.length > 0;

  // per-year plays inside a decade, reconstructed from EXPLORE debut years (needs the rest bundle)
  const yearBreak = React.useMemo(() => {
    if (zoom == null || !restReady || !R.EXPLORE) return null;
    const buckets = new Map();
    for (const a of R.EXPLORE) { const y = a.d; if (y >= zoom && y < zoom + 10 && a.plays > 0) buckets.set(y, (buckets.get(y) || 0) + a.plays); }
    const rows = [...buckets.entries()].map(([year, plays]) => ({ year, plays })).sort((a, b) => a.year - b.year);
    const tot = rows.reduce((s, r) => s + r.plays, 0);
    return { rows, tot };
  }, [zoom, restReady, R]);

  if (!N && !hasDec) return null;

  // Shared bar — identical visual language for the last-90d block and every decade row: a filled
  // 0–100 track with the library-average tick. (v is the metric value; avg draws the baseline tick.)
  const Bar = ({ label, v, avg, col }) => (
    <div style={{ display: "grid", gridTemplateColumns: "52px 1fr 26px", gap: 9, alignItems: "center" }}>
      <span className="r-mono" style={{ fontSize: 9, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ink-soft)" }}>{label}</span>
      <div style={{ position: "relative", height: 7, background: "var(--bg-3)", borderRadius: 4 }}>
        <div style={{ position: "absolute", inset: "0 auto 0 0", width: v + "%", background: col, borderRadius: 4 }} />
        {avg != null && <div title={"library average " + avg} style={{ position: "absolute", top: -2, bottom: -2, left: avg + "%", width: 2, background: "var(--ink-faint)", borderRadius: 1 }} />}
      </div>
      <span className="r-mono" style={{ fontSize: 10, color: "var(--ink-faint)", textAlign: "right" }}>{v}</span>
    </div>
  );
  const SND = "oklch(0.72 0.15 145)", RDS = "oklch(0.68 0.16 25)";

  // ── WEATHER (last 90 days — unchanged behaviour, incl. click-through to the story) ──
  const weather = () => {
    if (!N) return <div className="r-mono" style={{ fontSize: 10, color: "var(--ink-faint)", padding: "8px 0" }}>no mood data</div>;
    const d = (v, avg) => v - avg;
    const word = (dv) => dv >= 4 ? "brighter" : dv <= -4 ? "darker" : "steady";
    return (
      <div onClick={() => go("stories", "emotional-weather")} style={{ cursor: "pointer" }}>
        <div style={{ display: "grid", gap: 8 }}>
          <Bar label="Sounds" v={N.aud} avg={M.avgAud} col={SND} />
          <Bar label="Reads" v={N.lyr} avg={M.avgLyr} col={RDS} />
        </div>
        <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 13, color: "var(--ink-soft)", marginTop: 10 }}>
          {word(d(N.aud, M.avgAud)) === "steady" && word(d(N.lyr, M.avgLyr)) === "steady"
            ? <>Right on your baseline{N.emo ? <> — reading <b style={{ color: "var(--ink)" }}>{N.emo}</b></> : null}.</>
            : <>Sounding {word(d(N.aud, M.avgAud))}, reading {word(d(N.lyr, M.avgLyr))}{N.emo ? <> — mostly <b style={{ color: "var(--ink)" }}>{N.emo}</b></> : null}.</>}
        </div>
        <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", marginTop: 8, letterSpacing: ".06em" }}>last {N.days} days ↗</div>
      </div>
    );
  };

  // ── DECADES (chronological strip treemap → drillable per-year; reduced height so it fits
  //    under the weather block in one module) ──
  const H = 46;   // strip height px — HTML flex strips, not SVG: a stretched viewBox distorts label glyphs
  const decadesStrip = () => {
    if (!hasDec) return null;

    if (zoom != null) {
      const dec = decades.find(x => x.decade === zoom);
      if (!yearBreak) {
        return (
          <div>
            <button onClick={(e) => { e.stopPropagation(); setZoom(null); }} className="ov-wback">← {zoom}s</button>
            <div className="r-mono" style={{ fontSize: 10, color: "var(--ink-faint)", padding: "14px 0" }}>loading detail…</div>
          </div>
        );
      }
      const { rows, tot } = yearBreak;
      return (
        <div>
          <button onClick={(e) => { e.stopPropagation(); setZoom(null); }} className="ov-wback">← {zoom}s</button>
          <div style={{ display: "flex", height: H, borderRadius: 4, overflow: "hidden", gap: 1 }}>
            {rows.map((r, i) => {
              const w = tot ? (r.plays / tot) * 100 : 0;
              const pct = tot ? Math.round(r.plays / tot * 100) : 0;
              const hue = 60 + ((r.year - zoom) * 20);
              return (
                <div key={r.year} title={`${r.year} · ${r.plays.toLocaleString("en-US")} plays · ${pct}% of the ${zoom}s`}
                  style={{ width: w + "%", minWidth: 2, background: `oklch(${0.34 + (i % 5) * 0.05} 0.13 ${hue % 360})`,
                    display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {w > 8 && <span className="r-mono" style={{ fontSize: 9.5, color: "rgba(255,255,255,.9)", whiteSpace: "nowrap" }}>'{String(r.year).slice(2)}</span>}
                </div>
              );
            })}
          </div>
          <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", marginTop: 7, lineHeight: 1.5 }}>
            {dec ? Math.round(dec.share * 100) + "% of plays are " + zoom + "s music" : ""} — by artist debut year
          </div>
        </div>
      );
    }

    const tot = decades.reduce((s, d) => s + d.plays, 0);
    return (
      <div>
        <div style={{ display: "flex", height: H, borderRadius: 4, overflow: "hidden", gap: 1 }}>
          {decades.map((d, i) => {
            const w = tot ? (d.plays / tot) * 100 : 0;
            const pct = Math.round(d.share * 100);
            const hue = 60 + i * 28;
            return (
              <div key={d.decade} title={`${d.decade}s · ${d.plays.toLocaleString("en-US")} plays · ${pct}% — click to drill in`}
                onClick={(e) => { e.stopPropagation(); setZoom(d.decade); }}
                style={{ width: w + "%", minWidth: 2, background: `oklch(${0.32 + i * 0.055} 0.14 ${hue % 360})`, cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                {w > 9 && <span className="r-mono" style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,.92)", whiteSpace: "nowrap" }}>{String(d.decade).slice(2)}s</span>}
                {w > 9 && <span className="r-mono" style={{ fontSize: 8.5, color: "rgba(255,255,255,.62)", whiteSpace: "nowrap" }}>{pct}%</span>}
              </div>
            );
          })}
        </div>
        <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", marginTop: 7 }}>
          area = share of plays by release decade · click a decade to drill in
        </div>
      </div>
    );
  };

  return (
    <div className="r-card ov-weather" style={{ padding: 12 }}>
      <div className="r-card-h" style={{ padding: 0, marginBottom: 8 }}>
        <span className="lbl"><b>Emotional weather</b></span>
      </div>
      {weather()}
      {hasDec && (
        <div className="ov-wdecs">
          <div className="r-mono ov-wdlbl" style={{ fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ink-faint)" }}>Decades</div>
          {decadesStrip()}
        </div>
      )}
      <style>{`
        /* decades strip sits under the last-90d block; left edge aligns with the paragraph above */
        .ov-wdecs { margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--rule); }
        .ov-wdlbl { margin-bottom: 8px; }
        .ov-wback { font-family: var(--mono); font-size: 8.5px; letter-spacing: .1em; text-transform: uppercase;
          background: none; border: 1px solid var(--rule); border-radius: 999px; padding: 3px 9px;
          color: var(--ink-soft); cursor: pointer; margin-bottom: 8px; }
        .ov-wback:hover { color: var(--accent); border-color: var(--accent-dim); }
      `}</style>
    </div>
  );
}

// Compact fact line for the Overview "portrait" / "dig" modules — reuses lab2's FACT_RULES
// grammar (glanceable headline collapsed to ONE line, click to expand the full sentence +
// derivation detail). Kept dense on purpose: this whole pass is about tightening Overview.
// `ids` picks which lab2 rules to fire, in order; missing/null-returning rules are skipped.
function OvFacts({ ids, go, accent, restReady }) {
  const R = window.ROTATION;
  const rules = window.FACT_RULES;
  const [open, setOpen] = React.useState(-1);
  // restReady is a dep so rules that read deferred keys (ALBUMS → complete-discog) re-derive
  // once music-rest has merged into the same window.ROTATION object.
  const facts = React.useMemo(() => {
    if (!R || !rules) return [];
    const byId = {}; rules.forEach(r => { byId[r.id] = r; });
    const out = [];
    for (const id of ids) {
      const rule = byId[id]; if (!rule) continue;
      let res = null; try { res = rule.derive(R); } catch (e) { res = null; }
      if (res && res.headline) out.push({ rule, res });
    }
    return out;
  }, [R, rules, ids.join(","), restReady]);
  if (!facts.length) return null;
  // Bullet list in the #lab2 sense: a bullet-dot lead-in + one terse mono-ish headline per item,
  // tight vertical rhythm, click to expand the full sentence + derivation (mirrors lab2 FactCard's
  // collapsed→expanded grammar). Redesigned from the old full-width expanding rows (Fuad 2026-07-18).
  return (
    <ul className="ov-facts">
      {facts.map(({ rule, res }, i) => {
        const isOpen = open === i;
        return (
          <li key={rule.id} className="ov-fact" data-open={isOpen}>
            <button className="ov-fact-head" onClick={() => setOpen(x => x === i ? -1 : i)}>
              <span className="ov-fact-dot" style={accent ? { background: accent } : null} />
              <span className="ov-fact-hl">{res.headline}</span>
              {res.link && (
                <span className="ov-fact-go" onClick={(e) => { e.stopPropagation(); go(res.link.view, res.link.id || undefined); }}>→</span>
              )}
            </button>
            {isOpen && (
              <div className="ov-fact-body">
                <div className="ov-fact-text">{res.text}</div>
                {res.detail && <div className="ov-fact-det">{res.detail}</div>}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function OverviewView({ t, go, restReady, seed }) {
  const R = window.ROTATION;
  const T = R.TOTALS;
  const [ref, seen] = useInView();
  // map/calendar filter state lives here so the calendar (pulse row) and the map band (below)
  // stay in sync — the calendar is its cross-filter even though they're no longer adjacent.
  // Seeded from the hash so a filtered Overview is bookmarkable / refresh-proof (like Explore).
  const _seed = React.useRef(parseOvSeed(seed)).current;
  const [mapYear, setMapYear] = React.useState(_seed.year);
  const [mapPeriod, setMapPeriod] = React.useState(_seed.period);
  const [mapFilter, setMapFilter] = React.useState(_seed.filter);   // {mode, filt:{fam,sub}} from the map band
  const [fStats, setFStats] = React.useState(null);   // filtered totals reported by the map band
  // mirror the active filter (date + map genre/mode) into the URL (replaceState — no history spam)
  const _ovMounted = React.useRef(false);
  React.useEffect(() => {
    if (!_ovMounted.current) { _ovMounted.current = true; if (seed) return; }   // don't clobber the incoming seed
    if (!/^#(overview|$)/.test(window.location.hash || "#")) return;            // only while Overview owns the URL
    const parts = [];
    if (mapYear != null) parts.push("y=" + mapYear);
    if (mapPeriod) parts.push("p=" + mapPeriod.gran + "~" + mapPeriod.key);
    const mf = mapFilter && mapFilter.filt;
    if (mf && mf.fam != null) { const fm = R.FAMILIES.find(f => f.i === mf.fam); if (fm) parts.push("f=" + encodeURIComponent(fm.family)); }
    if (mf && mf.sub != null && R.SUBS[mf.sub]) parts.push("s=" + encodeURIComponent(R.SUBS[mf.sub].name));
    if (mapFilter && mapFilter.mode && mapFilter.mode !== "city") parts.push("md=" + mapFilter.mode);
    const target = parts.length ? "#overview/" + parts.join(";") : "";
    if ((window.location.hash || "") !== target) window.history.replaceState(null, "", target || (location.pathname + location.search));
  }, [mapYear, mapPeriod, mapFilter]);

  // Phase 1 — flat per-day play counts make avg/day, heaviest-day and share-of-history react to
  // the active date filter (year scrub or calendar day/week/month). Loaded lazily; tiny (~10 KB gz).
  const [days, setDays] = React.useState(window.ROTATION_DAYS || null);
  React.useEffect(() => {
    if (window.ROTATION_DAYS) { setDays(window.ROTATION_DAYS); return; }
    const s = document.createElement("script"); s.src = "day-series.js";
    s.onload = () => setDays(window.ROTATION_DAYS); document.head.appendChild(s);
  }, []);
  const dyn = React.useMemo(() => {
    if (!days || (mapYear == null && !mapPeriod)) return null;   // lifetime → static stats
    const startMs = new Date(days.start + "T00:00:00Z").getTime();
    const idxOf = (iso) => Math.round((new Date(iso + "T00:00:00Z").getTime() - startMs) / 86400e3);
    let from, to, label;
    if (mapPeriod) {
      const { gran, key } = mapPeriod;
      if (gran === "month") { const [Y, M] = key.split("-").map(Number); from = idxOf(key + "-01"); to = from + new Date(Date.UTC(Y, M, 0)).getUTCDate() - 1; label = key; }
      else if (gran === "week") { from = idxOf(key); to = from + 6; label = "wk " + key.slice(2); }
      else { from = to = idxOf(key); label = key.slice(2); }
    } else { from = idxOf(mapYear + "-01-01"); to = idxOf(mapYear + "-12-31"); label = "" + mapYear; }
    from = Math.max(0, from); to = Math.min(days.counts.length - 1, to);
    if (to < from) return null;
    let plays = 0, active = 0, hiC = -1, hiI = from;
    for (let i = from; i <= to; i++) { const c = days.counts[i]; plays += c; if (c > 0) active++; if (c > hiC) { hiC = c; hiI = i; } }
    const spanDays = to - from + 1;
    const hiDate = new Date(startMs + hiI * 86400e3).toISOString().slice(0, 10);
    return { plays, active, spanDays, label, avgDay: Math.round(plays / spanDays * 10) / 10,
      hiCount: hiC, hiDate, sharePct: Math.round(plays / (days.total || 1) * 1000) / 10 };
  }, [days, mapYear, mapPeriod]);
  // Combine the temporal window (day-series) with the map's reported filtered plays (place + genre
  // + year, from fStats) so avg/day and share-of-history follow ANY filter — not just the date one.
  // The map already intersects place×genre×year, so fStats.plays IS the fully-filtered count; divide
  // by the temporal window's span (or the whole span). Heaviest-day still needs a per-day×slice export
  // to be place/genre-specific, so it stays scoped to the time window (day-series) and reads lifetime
  // when only a place/genre filter is set.
  const flt = React.useMemo(() => {
    if (!days) return null;
    const slice = !!(fStats && fStats.active && fStats.slice);   // a place/genre slice is active
    // filtered play count: for a place/genre slice only the map has it; for a pure time filter the
    // exact day-series total is right (fStats counts EXPLORE artists only, so it slightly undercounts).
    const fp = slice ? fStats.plays : (dyn ? dyn.plays : null);
    if (fp == null) return null;   // no filter → lifetime static stats
    const spanDays = dyn ? dyn.spanDays : days.counts.length;   // temporal window, or the whole span
    const rawLabel = slice ? (fStats.label || "filtered") : (dyn ? dyn.label : "");
    return {
      avgDay: Math.round(fp / Math.max(1, spanDays) * 10) / 10,
      sharePct: Math.round(fp / (days.total || 1) * 1000) / 10,
      hi: dyn ? { count: dyn.hiCount, date: dyn.hiDate } : null,   // heaviest stays time-scoped (per-slice needs a heavier export)
      label: rawLabel.length > 18 ? rawLabel.slice(0, 17) + "…" : rawLabel,
    };
  }, [fStats, dyn, days]);
  const liveTotal = (window.ROTATION_LIVE && window.ROTATION_LIVE.total) || T.scrobbles;
  const scrob = useCountUp(liveTotal, 1400, seen);
  const hrs = useCountUp(T.listeningHours, 1400, seen);
  const now = useLiveNow(); const nowArtist = R.byId[now.artistId] || { hue: 200, tags: [] };
  const npKnown = !!(R.byId[now.artistId] || (R.expById && R.expById[now.artistId]) || (R.played && R.played(now.artist)));

  // Recently played: prefer the daily last.fm snapshot (live-data.js) so the feed stays fresh between
  // full CSV re-exports; fall back to the baked R.RECENT if the snapshot hasn't loaded.
  const recent = React.useMemo(() => {
    const LV = window.ROTATION_LIVE;
    if (!LV || !LV.recent || !LV.recent.length) return R.RECENT;
    const MON = window.MON;
    const when = (uts) => { if (!uts) return ""; const d = new Date(uts * 1000); return d.getUTCDate() + " " + MON[d.getUTCMonth()]; };
    const hueOf = (id) => { const e = R.byId[id] || (R.expById && R.expById[id]); return e && e.hue != null ? e.hue : 210; };
    return LV.recent.map((r, i) => ({ id: "lv" + i, artistId: r.artistId, artist: r.artist, track: r.track, when: when(r.uts), hue: hueOf(r.artistId) }));
  }, [R]);
  // just the last 2 played (was 3; the shallower 96px pulse row fits two cleanly — Fuad 2026-07-18)
  const recent3 = React.useMemo(() => recent.slice(0, 2), [recent]);

  // 26-week scrobble trend (real if the build provides it)
  const trend = React.useMemo(() => R.TREND || Array.from({ length: 26 }, (_, i) =>
    180 + Math.round(Math.sin(i / 3) * 60 + (hashInt("wk" + i, 5) % 90) + i * 3)), []);
  const sinceYears = ((Date.now() - new Date(T.since)) / 3.156e10).toFixed(1);

  const Stat = ({ n, sub, big, onClick }) => (
    <div onClick={onClick} style={onClick ? { cursor: "pointer" } : null} className={onClick ? "ov-stat-link" : ""}>
      <div className="r-stat-n" style={{ fontSize: big ? "clamp(28px,3.4vw,40px)" : 27 }}>{n}</div>
      <div className="r-mono" style={{ fontSize: 9, letterSpacing: ".14em", textTransform: "uppercase",
        color: "var(--ink-faint)", marginTop: 4 }}>{sub}{onClick ? " ↗" : ""}</div>
    </div>
  );

  return (
    <div className="r-view" ref={ref}>
      {/* header restored (Fuad 2026-07-05: "it looked better back then after all") */}
      <div className="r-viewhead">
        <div>
          <div className="r-kicker">Rotation · since {new Date(T.since).getFullYear()}</div>
          <h1 className="r-title">A life, <em>counted</em><span className="dot">.</span></h1>
        </div>
        <p className="r-lede">Every track I've played, since the mid-2000s —
          turned into something I can actually <b>look at</b>.</p>
      </div>

      {/* bento */}
      <div className="m-stack" style={{ display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gap: "var(--gap)" }}>
        {/* now playing — top-right corner of the pulse row (DOM-first so mobile still leads
            with it; the ≥981px block pins it to cols 9-12) */}
        <div className="r-card ov-np" style={{ gridColumn: "span 4", padding: "8px 12px", display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
          <div style={{ position: "relative", cursor: npKnown ? "pointer" : "default" }} onClick={() => npKnown && go("artist", now.artistId)}>
            <GenCover hue={nowArtist.hue} name={now.artist} size={62} radius={4} />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", justifyContent: "center",
              gap: 3, padding: "0 0 6px" }}>
              {[0, 1, 2, 3, 4].map(i => <span key={i} className="eqbar" style={{ animationDelay: i * 0.13 + "s" }} />)}
            </div>
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="r-live" style={{ marginBottom: 3 }}><span className="dot" /> {now.nowplaying ? "Now playing" : "Last played"}</div>
            <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 17, lineHeight: 1.05 }}>{now.track}</div>
            <div style={{ color: "var(--ink-soft)", fontSize: 12.5, marginTop: 2 }}>
              {npKnown ? <b onClick={() => go("artist", now.artistId)} style={{ cursor: "pointer", color: "var(--ink)", fontWeight: 600 }}>{now.artist}</b> : now.artist} — <span style={{ color: "var(--ink-faint)" }}>{now.album}</span></div>
            <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
              {nowArtist.tags.slice(0, 3).map(g => <span key={g} className="r-chip link" title={`Explore ${g} →`} onClick={() => go("explore", g)}>{g}</span>)}
            </div>
          </div>
        </div>

        {/* scrobble counter + trend — left anchor of the pulse row */}
        <div className="r-card ov-scrob" style={{ gridColumn: "span 3", padding: "8px 12px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div className="r-card-h" style={{ padding: 0 }}>
            <span className="lbl"><b>Scrobbles</b></span>
            <span className="meta">26-wk</span>
          </div>
          <div className="r-stat-n" style={{ fontSize: "clamp(24px,3.4vw,34px)", margin: "1px 0 0" }}>{fmt(Math.round(scrob))}</div>
          <div style={{ marginTop: 2 }}>
            <Spark data={trend} w={300} h={22} run={seen} fill="var(--accent-bg)" />
          </div>
        </div>

        {/* streak — current run + when the all-time best happened (INSIGHTS.STREAK carries the range) */}
        <div className="r-card ov-streak" style={{ gridColumn: "span 2", padding: "8px 12px", display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div className="r-card-h" style={{ padding: 0 }}><span className="lbl"><b>Streak</b></span>
            {T.streak.current >= T.streak.best ? <span className="meta" style={{ color: "var(--accent)" }}>record!</span> : null}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginTop: 0 }}>
            <div className="r-stat-n" style={{ fontSize: 28 }}>{T.streak.current}</div>
            <span className="r-mono" style={{ fontSize: 10, color: "var(--ink-soft)" }}>days</span>
          </div>
          {(() => {
            const S = R.INSIGHTS && R.INSIGHTS.STREAK;
            const MON = window.MON;
            const f = (d) => { const x = new Date(d + "T00:00:00Z"); return MON[x.getUTCMonth()] + " '" + String(x.getUTCFullYear()).slice(2); };
            return (
              <div>
                <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", letterSpacing: ".08em" }}>
                  best <span style={{ color: "var(--accent)" }}>{T.streak.best}</span>{S && S.start ? <> · {f(S.start)}–{f(S.end)}</> : null}
                </div>
                <div className="r-mono" style={{ fontSize: 8.5, color: "var(--ink-faint)", marginTop: 3 }}>
                  {T.streak.best > T.streak.current ? (T.streak.best - T.streak.current) + " days from the record" : "longest run ever — keep going"}
                </div>
              </div>
            );
          })()}
        </div>

        {/* this week — promoted from the insight deck into the pulse row (Fuad 2026-07-05);
            live-data dependent, so it only renders when the weekly sync is present. The
            :has(.ov-week) CSS below re-splits the row 2+2+2+3+3 when it's here. */}
        {(() => {
          const w = window.ROTATION_LIVE && window.ROTATION_LIVE.week;
          if (!w) return null;
          const delta = w.weekAvg ? Math.round((w.plays7 - w.weekAvg) / w.weekAvg * 100) : 0, up = delta >= 0;
          const ta = w.topArtists && w.topArtists[0];
          return (
            <div className="r-card ov-week" style={{ gridColumn: "span 3", padding: "8px 12px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div className="r-card-h" style={{ padding: 0 }}><span className="lbl"><b>This week</b></span>
                <span className="meta" style={{ color: up ? "var(--accent)" : "var(--ink-faint)" }}>{up ? "▲" : "▼"} {Math.abs(delta)}%</span></div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginTop: 0 }}>
                <div className="r-stat-n" style={{ fontSize: 28 }}>{fmt(w.plays7)}</div>
                <span className="r-mono" style={{ fontSize: 10, color: "var(--ink-soft)" }}>plays</span>
              </div>
              {ta ? (
                /* artist + play count INLINE on one line (Fuad 2026-07-17) — cover kept small at left */
                <div style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", minWidth: 0 }} onClick={() => go("artist", ta.artistId)}>
                  <GenCover hue={(R.byId[ta.artistId] || (R.expById && R.expById[ta.artistId]) || { hue: 210 }).hue} name={ta.name} size={20} radius={2} />
                  <div style={{ fontSize: 11.5, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    <b style={{ fontWeight: 600 }}>{ta.name}</b>
                    <span className="r-mono" style={{ fontSize: 10, color: "var(--ink-faint)" }}> · {ta.plays} plays</span>
                  </div>
                </div>
              ) : <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)" }}>vs your weekly average</div>}
              {w.newArtistsThisWeek > 0
                ? <div className="r-mono" style={{ fontSize: 8.5, color: "var(--ink-faint)", letterSpacing: ".06em", textTransform: "uppercase", marginTop: 3 }}>{w.newArtistsThisWeek} new artist{w.newArtistsThisWeek !== 1 ? "s" : ""} this week</div>
                : <div className="r-mono" style={{ fontSize: 8.5, color: "var(--ink-faint)", marginTop: 3 }}>no new artists yet</div>}
            </div>
          );
        })()}

        {/* recent ticker — squeezed centrally between streak and now-playing; the list is a
            capped scroll well at PC widths so the pulse row stays shallow */}
        <div className="r-card ov-recent" style={{ gridColumn: "span 3", padding: "8px 11px", display: "flex", flexDirection: "column" }}>
          <div className="r-card-h" style={{ padding: 0, marginBottom: 3 }}><span className="lbl"><b>Recently played</b></span>
            <a className="meta r-extlink-lf" href="https://www.last.fm/user/fuadex" target="_blank" rel="noopener noreferrer"
              style={{ color: "var(--ink-faint)", textDecoration: "none" }}>last.fm/fuadex ↗</a></div>
          <div className="ov-rl" style={{ display: "grid", gap: 1, flex: 1, alignContent: "center" }}>
            {recent3.map(r => (
              <div key={r.id} onClick={() => { if (r.artist && r.track) go("track", R.slug(r.artist) + "~" + R.slug(r.track)); }} title={`${r.track} →`} style={{ display: "flex", alignItems: "center", gap: 9,
                padding: "3px 6px", borderRadius: 4, cursor: "pointer", minWidth: 0 }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--bg-3)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <GenCover hue={r.hue} name={r.artist} size={22} radius={2} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.track}</div>
                  <div style={{ fontSize: 10, color: "var(--ink-faint)", cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={`${r.artist} →`}
                    onClick={e => { e.stopPropagation(); go("artist", r.artistId); }}>{r.artist}</div>
                </div>
                <span className="r-mono" style={{ fontSize: 10, color: "var(--ink-faint)", flex: "none" }}>{r.when}</span>
              </div>
            ))}
          </div>
        </div>

        {/* THE MAP BAND — full width, right below the pulse row. The calendar rail rides along as
            a slot: it renders under the map's deepest-places column and cross-filters the results. */}
        <div className="ov-mapslot" style={{ gridColumn: "1 / -1" }}>
          <OvMapBand go={go} restReady={restReady} extYear={mapYear} calPeriod={mapPeriod} onStats={setFStats}
            initFilter={_seed.filter} onFilter={setMapFilter}
            calRail={<OvCalRail go={go} onYear={setMapYear} onPeriod={setMapPeriod} init={_seed} />}
            statSlot={
              /* lifetime stats, now nested under the flowmap (Fuad 2026-07-06); hours + distinct
                 artists react to the active map/calendar filter, the rest are lifetime. */
              <div className="r-card ov-strip" style={{ padding: "12px 14px", display: "grid",
                gridTemplateColumns: "repeat(2,1fr)", gap: "10px 16px", alignContent: "center" }}>
                <Stat n={fStats && fStats.active ? fmt(fStats.hours) : fmt(Math.round(hrs))} sub={fStats && fStats.active ? "hrs · " + fStats.label : "hours listened"} onClick={() => go("calendar")} />
                <Stat n={fStats && fStats.active ? fmt(fStats.artists) : fmt(T.artists)} sub={fStats && fStats.active ? "artists · filtered" : "distinct artists"} onClick={() => go("explore")} />
                <Stat n={flt ? flt.avgDay : T.perDay} sub={flt ? "avg/day · " + flt.label : "avg / day"} />
                <Stat n={flt ? flt.sharePct + "%" : sinceYears + " yr"} sub={flt ? "of all plays" : "of history"} />
                <Stat n={flt && flt.hi ? fmt(flt.hi.count) : R.TOTALS.topDay.count} sub={"heaviest · " + ((flt && flt.hi ? flt.hi.date : R.TOTALS.topDay.date)).slice(2)} onClick={() => go("calendar")} />
              </div>
            } />
        </div>

        {/* Story of the day — a DEDICATED slot (was only an insight-row card, so higher-scoring
            milestone cards crowded it out of the top-4 and nothing showed — Fuad 2026-07-18). Now
            it always features, deterministic per UTC day via window.storyOfDay(). */}
        {(() => {
          const story = window.storyOfDay ? window.storyOfDay(go) : null;
          if (!story) return null;
          const pick = story._pick;
          return (
            <div className="r-card ov-story" style={{ gridColumn: "1 / -1", padding: "14px 18px", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 16 }} onClick={story.onClick}>
              <span className="r-mono ov-story-tag">Story of the day</span>
              <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 18, lineHeight: 1.2, color: "var(--ink)" }}>{pick ? pick.t : ""}</span>
                <span style={{ fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.45, minWidth: 0 }}>{pick ? pick.teaser : ""}</span>
              </div>
              <span className="r-mono ov-story-go">read →</span>
            </div>
          );
        })()}

        {/* Right now — the live insight feed, promoted directly under the map (Fuad 2026-07-06),
            paired with emotional weather on its row (was full-width lower down). */}
        <div className="r-card ov-insights" style={{ gridColumn: "span 8", padding: "8px 12px" }}>
          <div className="r-card-h" style={{ padding: 0, marginBottom: 5 }}><span className="lbl"><b>Right now</b></span>
            <span className="meta">what's moving</span></div>
          <div className="ov-insgrid" style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 8 }}>
            <InsightRow go={go} n={4} />
          </div>
        </div>

        {/* emotional weather now — last-90d sounds/reads on top, a per-decade row of the SAME
            two-axis metric underneath. Card footprint unchanged (ov-weather grid rules). */}
        <OvWeatherCard R={R} go={go} restReady={restReady} />

      </div>

      {/* portrait + dig — two compact data-derived modules, Phase 1 of the Overview makeover
          (Fuad 2026-07-17). Both share lab2's FACT_RULES grammar via <OvFacts>: a glanceable
          one-line headline, click to open the fuller sentence + derivation. Portrait = who you
          are (identity facts); Where to dig = where to explore next (discovery facts). Each
          module fires a hand-picked subset of rule ids so it stays tight. */}
      <div className="ov-pd" style={{ marginTop: "calc(var(--gap)*1.4)" }}>
        {/* YOUR PORTRAIT — self-portrait, now the FULL identity slice of lab2's rule set
            (populated like the old rich modules but each line stays an expandable bullet —
            Fuad 2026-07-18) */}
        <div className="r-card ov-pd-card" style={{ padding: "12px 16px" }}>
          <div className="r-mono ov-pd-lbl">Your portrait</div>
          <OvFacts ids={["underground", "decade-growth", "taste-era", "peak-day", "one-song", "obsession-peak", "streak-gap"]} go={go} accent="var(--accent)" restReady={restReady} />
          <div className="r-mono ov-pd-foot" onClick={() => go("stories")}>read the long version ↗</div>
        </div>

        {/* WHERE TO DIG — the full discovery slice: genre momentum · newest top-50 face ·
            comeback · discography to complete · binge album · disbanded favourite */}
        <div className="r-card ov-pd-card" style={{ padding: "12px 16px" }}>
          <div className="r-mono ov-pd-lbl">Where to dig</div>
          <OvFacts ids={["genre-shift", "new-to-top50", "comeback", "complete-discog", "binge-album", "disbanded"]} go={go} accent="oklch(0.7 0.16 188)" restReady={restReady} />
          <div className="r-mono ov-pd-foot" onClick={() => go("explore")}>open Explore ↗</div>
        </div>
      </div>

      <style>{`
        /* ── PC bento (≥981px, Fuad's redesign 2026-07-04): ONE pulse row — scrobbles ·
           streak · recently-played squeezed centrally · now-playing top-right. The recent
           list scrolls inside a capped well so the row stays shallow. Calendar rail lives
           in the map band's left column. ── */
        @media (min-width: 981px) {
          .ov-scrob   { grid-column: 1 / span 3 !important; grid-row: 1; }
          .ov-streak  { grid-column: 4 / span 2 !important; grid-row: 1; }
          .ov-recent  { grid-column: 6 / span 3 !important; grid-row: 1; }
          .ov-np      { grid-column: 9 / -1 !important; grid-row: 1; }
          /* when the live weekly sync is present, "This week" joins the pulse row:
             scrobbles 2 · streak 2 · week 2 · recent 3 · now-playing 3 (Fuad 2026-07-05) */
          .m-stack:has(.ov-week) .ov-scrob  { grid-column: 1 / span 2 !important; }
          .m-stack:has(.ov-week) .ov-streak { grid-column: 3 / span 2 !important; }
          .m-stack:has(.ov-week) .ov-week   { grid-column: 5 / span 2 !important; grid-row: 1; }
          .m-stack:has(.ov-week) .ov-recent { grid-column: 7 / span 3 !important; }
          .m-stack:has(.ov-week) .ov-np     { grid-column: 10 / -1 !important; }
          .ov-recent .ov-rl { max-height: none; overflow: visible; align-content: start; }
          .ov-scrob .r-stat-n { font-size: clamp(18px, 1.7vw, 22px) !important; }
          .ov-streak .r-stat-n, .ov-week .r-stat-n { font-size: 21px !important; }
          .ov-week .spark, .ov-scrob .spark { max-height: 20px; }
          /* cap the whole pulse row so it lands ~2/3 of its pre-tightening height: the tallest
             card (now-playing's cover stack / recently-played's 3 rows) can't push it taller than
             this. The recent list scrolls internally if it ever overflows (Fuad 2026-07-18). */
          .ov-scrob, .ov-streak, .ov-week, .ov-recent, .ov-np { max-height: 102px; overflow: hidden; }
          .ov-recent .ov-rl { overflow-y: auto; }
          /* row 3 = map band (1/-1 inline); row 4 — the four stats (left, they react to the
             map/calendar filter) + heaviest day (right) */
          .ov-strip    { grid-column: 1 / span 8 !important; grid-template-columns: repeat(5, 1fr) !important; gap: 10px !important; }
          .ov-weather  { grid-column: 9 / -1 !important; }
          .ov-strip .r-stat-n { font-size: 21px !important; }
          /* insights module is full-width → its four cards run in one rank */
          .ov-insgrid > .r-card { grid-column: span 3 !important; }
        }
        .ov-calsel { width: 100%; background: var(--bg-3); border: 1px solid var(--rule); color: var(--ink);
          border-radius: 6px; padding: 5px 7px; font-family: var(--mono); font-size: 10px; }
        .ov-calweek[data-gran="week"]:hover { outline: 1px solid var(--accent-dim); outline-offset: 1px; }
        .ov-calrail i { transition: transform .1s; display: block; }
        .ov-calrail [data-gran="day"] i:hover { transform: scale(1.45); outline: 1px solid var(--accent); }
        .hub-chips { display: flex; gap: 8px; flex-wrap: wrap; }
        .hub-chip { display: inline-flex; align-items: baseline; gap: 8px; padding: 8px 14px; border-radius: 999px;
          border: 1px solid var(--rule); background: none; cursor: pointer; transition: border-color .15s, transform .15s; }
        .hub-chip:hover { border-color: color-mix(in oklch, var(--c) 55%, var(--rule-2)); transform: translateY(-2px); }
        .hub-chip-k { font-family: var(--mono); font-size: 8.5px; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-faint); }
        .hub-chip-h { font-family: var(--serif); font-style: italic; font-size: 14px; color: var(--ink); }
        .hub-chip .hub-arrow { color: var(--c); font-size: 12px; }
        .pt-link { cursor: pointer; border-bottom: 1px solid currentColor; }
        .pt-link:hover { opacity: .8; }
        .hub-card { position: relative; overflow: hidden; }
        .hub-accent { position: absolute; top: 0; left: 0; right: 0; height: 3px; background: var(--c); opacity: .85; }
        .hub-arrow { display: inline-block; transition: transform .15s; }
        .hub-card:hover .hub-arrow { transform: translateX(3px); }
        .hub-card:hover { border-color: color-mix(in oklch, var(--c) 50%, var(--rule-2)); }
        .hub-h { color: var(--ink); }
        .hub-lbl { font-size: 10px; letter-spacing: .16em; text-transform: uppercase; color: var(--ink-faint); margin-bottom: 12px; }
        /* story of the day — a slim full-width banner card leading the insight section */
        .ov-story { transition: border-color .15s; }
        .ov-story:hover { border-color: var(--accent-dim); }
        .ov-story:hover .ov-story-go { color: var(--accent); }
        .ov-story-tag { flex: none; font-size: 8.5px; letter-spacing: .14em; text-transform: uppercase;
          color: var(--accent); border: 1px solid var(--accent-dim); border-radius: 999px; padding: 3px 9px; }
        .ov-story-go { flex: none; font-size: 9px; letter-spacing: .1em; text-transform: uppercase; color: var(--ink-faint); transition: color .15s; }
        @media (max-width: 760px) { .ov-story { flex-wrap: wrap; gap: 8px; } .ov-story-go { display: none; } }
        /* portrait + dig — twin compact fact modules, side-by-side on PC, stacked on mobile */
        .ov-pd { display: grid; grid-template-columns: 1fr 1fr; gap: var(--gap); }
        @media (max-width: 760px) { .ov-pd { grid-template-columns: 1fr; } }
        .ov-pd-lbl { font-size: 9.5px; letter-spacing: .16em; text-transform: uppercase; color: var(--ink-faint); margin-bottom: 9px; }
        .ov-pd-foot { font-size: 9.5px; letter-spacing: .1em; color: var(--ink-faint); margin-top: 9px; cursor: pointer; }
        .ov-pd-foot:hover { color: var(--accent); }
        /* tight bulleted fact list (lab2 collapsed-fact grammar): dot lead-in, terse mono-ish
           headline, minimal padding + rhythm; click expands the sentence + derivation. */
        .ov-facts { list-style: none; margin: 0; padding: 0; display: grid; gap: 0; }
        .ov-fact { border-radius: 5px; }
        .ov-fact-head { display: flex; align-items: baseline; gap: 8px; width: 100%; text-align: left;
          background: none; border: none; padding: 2.5px 6px; margin: 0 -6px; border-radius: 5px; cursor: pointer;
          transition: background .15s; }
        .ov-fact-head:hover { background: var(--bg-3); }
        .ov-fact-dot { flex: none; width: 4px; height: 4px; border-radius: 50%; background: var(--accent-dim);
          align-self: center; }
        .ov-fact-hl { flex: 1; min-width: 0; font-family: var(--mono); font-size: 10.5px; letter-spacing: .01em;
          line-height: 1.35; color: var(--ink-soft);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ov-fact[data-open="true"] .ov-fact-hl { white-space: normal; overflow: visible; color: var(--ink); }
        .ov-fact-go { flex: none; font-family: var(--mono); font-size: 11px; color: var(--accent); padding: 0 2px; }
        .ov-fact-body { padding: 1px 6px 8px 18px; display: grid; gap: 5px; }
        .ov-fact-text { font-family: var(--serif); font-style: italic; font-size: 13px; line-height: 1.5; color: var(--ink-soft); }
        .ov-fact-det { font-family: var(--mono); font-size: 9.5px; color: var(--ink-faint); line-height: 1.45; }
        .hub-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px,1fr)); gap: var(--gap); }
        .hub-card { padding: 16px 18px; cursor: pointer; transition: transform .15s, box-shadow .15s; }
        .hub-card:hover { transform: translateY(-3px); box-shadow: 0 16px 34px -16px rgba(0,0,0,.6); }
        .hub-card:hover .hub-go { color: var(--accent); }
        .hub-k { font-size: 9px; letter-spacing: .14em; text-transform: uppercase; color: var(--ink-faint); }
        .hub-h { font-family: var(--serif); font-style: italic; font-size: 21px; margin: 10px 0 4px; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .hub-s { font-size: 12px; color: var(--ink-soft); line-height: 1.35; }
        .hub-go { font-family: var(--mono); font-size: 9px; letter-spacing: .1em; color: var(--ink-faint); margin-top: 12px; transition: color .15s; }
        .ov-stat-link { transition: color .15s; } .ov-stat-link:hover .r-stat-n { color: var(--accent); } .ov-stat-link:hover { color: var(--accent); }
        .eqbar { width: 3px; height: 8px; background: var(--accent); border-radius: 2px;
          animation: eq .9s ease-in-out infinite alternate; box-shadow: 0 0 6px var(--accent-bg); }
        @keyframes eq { from { height: 5px; } to { height: 18px; } }
        /* the inner insight grid is a repeat(12,1fr); bare fr tracks have an implicit auto min, so a
           long insight can push a span-4 card past its third and overflow the card. Pin the tracks to
           a 0 min and let the cards stack once there isn't room (Fuad 2026-07-16). */
        .ov-insgrid { grid-template-columns: repeat(12, minmax(0, 1fr)) !important; }
        .ov-insgrid > .r-card { min-width: 0; }
        @media (max-width: 760px) {
          .ov-insgrid > .r-card { grid-column: 1 / -1 !important; }
        }
        @media (max-width: 980px) {
          .r-view .r-card { grid-column: span 12 !important; }
        }
      `}</style>
    </div>
  );
}

// wall of generative covers with hover-fan
function WallGrid({ items, kind, seen, setPop, onClick }) {
  const [hover, setHover] = React.useState(-1);
  return (
    <div className="wall" onMouseLeave={() => { setHover(-1); setPop(null); }}>
      {items.map((it, i) => (
        <div key={it.id} className="wall-cell" data-hot={hover === i}
          style={{ animationDelay: (i * 0.022).toFixed(2) + "s",
            zIndex: hover === i ? 30 : 1 }}
          onMouseEnter={(e) => {
            setHover(i);
            const r = e.currentTarget.getBoundingClientRect();
            setPop({ x: r.left + r.width / 2, y: r.top, title: it.label, pip: it.hue, meta: kind.slice(0, -1),
              rows: [["plays", fmt(it.value)], [kind === "artists" ? "tag" : "by", it.sub]], hint: "click to open ↗" });
          }}
          onClick={() => onClick(it)}>
          <GenCover hue={it.hue} name={it.label} size={"100%"} radius={3} style={{ aspectRatio: "1", width: "100%", height: "auto" }} />
          <span className="wall-rank r-mono">{String(i + 1).padStart(2, "0")}</span>
          <div className="wall-cap">
            <div className="wall-t">{it.label}</div>
            <div className="wall-s r-mono">{fmt(it.value)}</div>
          </div>
        </div>
      ))}
      <style>{`
        .wall { display: grid; grid-template-columns: repeat(auto-fill, minmax(118px, 1fr)); gap: calc(var(--gap)*.8); }
        .wall-cell { position: relative; cursor: pointer; transition: transform .35s cubic-bezier(.2,.7,.3,1); }
        @media (prefers-reduced-motion: no-preference) {
          .wall-cell { animation: wallIn .5s cubic-bezier(.2,.7,.3,1); }
        }
        @keyframes wallIn { from { transform: translateY(16px) scale(.95); } to { transform: none; } }
        .wall-cell[data-hot="true"] { transform: translateY(-8px) scale(1.06); }
        .wall-cell[data-hot="true"] .gc { box-shadow: 0 22px 44px -10px rgba(0,0,0,.7), inset 0 0 0 1px var(--accent); }
        .wall-rank { position: absolute; top: 6px; left: 7px; font-size: 9.5px; color: rgba(255,255,255,.9); text-shadow: 0 1px 3px #000; }
        .wall-cap { margin-top: 8px; }
        .wall-t { font-size: 12px; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .wall-s { font-size: 9.5px; color: var(--ink-faint); margin-top: 2px; }
      `}</style>
    </div>
  );
}

// packed bubbles sized by plays
function BubbleField({ items, seen, setPop, onClick, expressive }) {
  const max = Math.max(...items.map(i => i.value));
  // simple deterministic spiral pack
  const placed = [];
  const W = 1000, H = 520;
  items.slice(0, 22).forEach((it, i) => {
    const rad = 18 + (it.value / max) * 66;
    let a = i * 2.399, dist = 0, x, y, ok = false, tries = 0;
    while (!ok && tries < 400) {
      x = W / 2 + Math.cos(a) * dist; y = H / 2 + Math.sin(a) * dist * 0.62;
      ok = placed.every(p => Math.hypot(p.x - x, p.y - y) > p.rad + rad + 6)
        && x - rad > 0 && x + rad < W && y - rad > 0 && y + rad < H;
      a += 0.5; dist += 2.2; tries++;
    }
    placed.push({ ...it, x, y, rad });
  });
  return (
    <div style={{ width: "100%", overflow: "hidden" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
        {placed.map((p, i) => {
          const col = expressive ? `oklch(0.6 0.13 ${p.hue})` : "var(--accent-dim)";
          return (
            <g key={p.id} style={{ cursor: "pointer", opacity: seen ? 1 : 0,
              transform: seen ? "scale(1)" : "scale(0)", transformOrigin: `${p.x}px ${p.y}px`,
              transition: `all .6s cubic-bezier(.3,1.4,.5,1) ${i * 0.03}s` }}
              onMouseEnter={(e) => { const svg = e.currentTarget.ownerSVGElement, rc = svg && svg.getBoundingClientRect();
                setPop({ x: rc ? rc.left + p.x / W * rc.width : p.x, y: 260, title: p.label, pip: p.hue,
                meta: "plays", rows: [["plays", fmt(p.value)], ["·", p.sub]], hint: "click to open ↗" }); }}
              onMouseLeave={() => setPop(null)} onClick={() => onClick(p)}>
              <circle cx={p.x} cy={p.y} r={p.rad} fill={col} fillOpacity={expressive ? 0.32 : 0.16}
                stroke={col} strokeWidth="1.4" />
              <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fill="var(--ink)"
                fontFamily="var(--sans)" fontWeight="600" fontSize={Math.max(8, Math.min(14, p.rad / 3.6))}>
                {p.label.length > 14 ? p.label.slice(0, 12) + "…" : p.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

Object.assign(window, { Popover, OverviewView });
