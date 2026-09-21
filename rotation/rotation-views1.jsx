// rotation-views1.jsx — Overview
// exports: OverviewView, Popover (shared).
// The header used to claim WallGrid/BubbleField were "used by Overview"; they had not been
// rendered for a long time, and TopArtistsPeek beside them was in the same state. All three were
// deleted on 2026-09-19 along with the .wall-* styles WallGrid carried in its own <style> block.
// (variant-wall.jsx declares its own .wall-cell rules and never read these.)

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
// OvCalRail — the calendar as a NARROW vertical filter rail beside the map: pick year + month,
// day ⇄ week granularity, click a cell. What it drives today: the map/flow scrub to that year,
// and the cell deep-opens its day/week in the full Calendar. (Day-level geography needs a new
// build export — the tandem deepens next iteration.)
function OvCalRail({ go, onYear, onPeriod, init, extYear }) {
  // init = {year, period} restored from the URL — preselect the cell/year so the rail's highlight
  // matches the filtered map on a deep-link/refresh.
  const [selDay, setSelDay] = React.useState((init && init.period && init.period.key) || null);
  const [detReady, setDetReady] = React.useState(!!window.ROTATION_CAL_DETAIL);
  React.useEffect(() => {   // period → results filtering needs the detail file; fetch it lazily
    if (window.ROTATION_CAL_DETAIL) return;
    // AT IDLE, NOT AT MOUNT (2026-09-21, audit A3): this 1.02 MB gz fetch sat on the landing
    // page's critical path for a file only a period pick reads. A seeded deep-link period still
    // fetches immediately (the seed needs it to filter at all); everyone else pays after first
    // paint. The SW prime warms it for repeat visits, so idle here is a cold-visit-only cost.
    // audit B2 2026-09-22: ensureShard — the same canonical tag the Calendar view's ensureDetail
    // uses, and it settles on a 404 (a period pick then simply has no detail to filter by). WHEN
    // it fires is untouched: seeded deep-link immediately, everyone else at idle.
    const inject = () => { window.ensureShard("calendar-detail.js", "ROTATION_CAL_DETAIL", () => setDetReady(true)); };
    if (init && init.period) { inject(); return; }
    const idle = window.requestIdleCallback || ((f) => setTimeout(f, 2500));
    idle(inject);
  }, []);
  const [cal, setCal] = React.useState(window.ROTATION_CAL || null);
  const [calGone, setCalGone] = React.useState(false);   // calendar.js settled with no data (audit B2 2026-09-22)
  const now = new Date();
  const _ip = init && init.period, _ik = _ip && init.period.key;
  const [yr, setYr] = React.useState((_ik && +_ik.slice(0, 4)) || (init && init.year) || now.getUTCFullYear());
  const [mo, setMo] = React.useState((_ik && _ik.length >= 7 ? +_ik.slice(5, 7) - 1 : now.getUTCMonth()));   // 0-11
  // default granularity week, not day (Fuad 2026-08-22) — a deep-linked period still wins
  const [gran, setGran] = React.useState((_ip && init.period.gran) || "week");   // day | week | month
  // Year handed down from the map (Fuad 2026-09-13). Sets yr directly rather than going through
  // shift(), which would call onYear straight back up and loop. Month and any day selection are
  // left alone: the map only ever names a year, so carrying the selection the way shift() does
  // would invent a month the map never asked for.
  React.useEffect(() => {
    if (extYear == null) return;
    setYr(y => (y === extYear ? y : extYear));
  }, [extYear]);
  // audit B2 2026-09-22 (4.4): no onerror here meant the Overview rail read "calendar…" forever
  // when calendar.js 404'd. ensureShard settles either way; calGone names the outcome below.
  React.useEffect(() => window.ensureShard("calendar.js", "ROTATION_CAL", () => {
    const C = window.ROTATION_CAL; if (C) setCal(C); else setCalGone(true);
  }), []);
  const years = cal ? Object.keys(cal.byYear).map(Number).sort((a, b) => b - a) : [];
  const y = cal && cal.byYear[yr];
  const MON = window.MON;
  if (!y) return <div className="r-card ov-nr" style={{ padding: 16 }}>{calGone ? "calendar unavailable" : "calendar…"}</div>;
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
  // One rule for turning a calendar position into a period key, so clicking a cell and carrying
  // a selection across a year/month change can't drift apart.
  const keyFor = (Y, M, D) => {
    if (gran === "month") return `${Y}-${String(M + 1).padStart(2, "0")}`;   // whole selected month
    const t = Date.UTC(Y, M, D);
    if (gran === "week") { const dow = (new Date(t).getUTCDay() + 6) % 7; return new Date(t - dow * 86400e3).toISOString().slice(0, 10); }
    return new Date(t).toISOString().slice(0, 10);
  };
  const pick = (d) => {
    const key = keyFor(yr, mo, d);
    setSelDay(key === selDay ? null : key);
    onPeriod && onPeriod(key === selDay ? null : { gran, key });   // filters the map's results (stays on page)
  };
  // Changing year or month carries the selection with it (Fuad 2026-08-20): pick 14 March and
  // scrub to 2019 and you get 14 March 2019, not a rail sitting on 2019 while the map is still
  // filtered to the March you left. The day-of-month is the anchor at every granularity — for a
  // week it re-derives that date's Monday, for a month it's ignored — and it clamps, so the 31st
  // carried into February lands on the 28th or 29th rather than silently rolling into March.
  const shift = (nextYr, nextMo) => {
    if (nextYr !== yr) { setYr(nextYr); onYear && onYear(nextYr); }
    if (nextMo !== mo) setMo(nextMo);
    if (!selDay) return;
    const dom = selDay.length >= 10 ? +selDay.slice(8, 10) : 1;
    const d = Math.min(dom, new Date(Date.UTC(nextYr, nextMo + 1, 0)).getUTCDate());
    const key = keyFor(nextYr, nextMo, d);
    setSelDay(key);
    onPeriod && onPeriod({ gran, key });
  };
  // COMPACT: fits the pulse-row height — a single horizontal strip of the month's days.
  const dayStrip = Array.from({ length: dim }, (_, i) => i + 1);
  return (
    <div className="r-card ov-calrail" style={{ padding: "12px 14px" }}>
      {/* One row instead of two (Fuad 2026-09-13): the title carries the link to the full
          Calendar page, so the separate "full" affordance goes, and the year/month selects and
          the d/w/m segment come up beside it. Aligned center rather than the card header default
          of baseline, because a select and a segmented control have no text baseline to share
          with the label. */}
      <div className="r-card-h ov-calhead" style={{ padding: 0, marginBottom: 8 }}>
        <button className="lbl ov-caltitle" onClick={() => go("calendar")} title="open the full Calendar page"><b>Calendar</b> ↗</button>
        <select className="ov-calsel" value={yr} onChange={(e) => shift(+e.target.value, mo)}>
          {years.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select className="ov-calsel" value={mo} onChange={(e) => shift(yr, +e.target.value)}>
          {MON.map((m, i) => <option key={m} value={i}>{m}</option>)}
        </select>
        <div className="r-seg r-seg-sm" style={{ display: "flex", marginLeft: "auto" }}>
          {["day", "week", "month"].map(g => (
            <button key={g} data-on={gran === g} title={g === "month" ? "filter by the whole selected month" : undefined}
              onClick={() => { setGran(g); setSelDay(null); onPeriod && onPeriod(null); }}>{g[0]}</button>
          ))}
        </div>
      </div>
      <div className="ov-daystrip" style={{ display: "grid", gridTemplateColumns: `repeat(${dim}, 1fr)`, gap: 2 }}>
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
      {/* 8px, half a step under the footnote grade, and 7px of lead: this line is the last thing
          in the rail and the rail is what sets the map band's height, so a rounder number here
          pushes the band — and everything under it — down the page. */}
      <div className="ov-eb" style={{ fontSize: 8, marginTop: 7 }}>
        {selDay ? <>filtering {gran} · <span style={{ cursor: "pointer", color: "var(--accent)" }} onClick={() => { setSelDay(null); onPeriod && onPeriod(null); }}>clear ✕</span></> : "click a " + gran + " to filter the map"}
      </div>
    </div>
  );
}

// OvMapBand — the geography band: the FULL MapView (+ the calendar rail slotted into its left
// column, under deepest places). Mounts once the user scrolls near, so Overview's first paint
// doesn't pay for world-map.js.
function OvMapBand({ go, extYear, onYear, calPeriod, onStats, calRail, statSlot, restReady, initFilter, onFilter, onClearPeriod }) {
  const [ref, seen] = useInView();
  const [on, setOn] = React.useState(false);
  React.useEffect(() => { if (seen) setOn(true); }, [seen]);
  // MapView reads the deferred EXPLORE/AUDIO — only mount it once music-rest has landed
  // (in practice always true by the time the map scrolls into view).
  const ready = on && restReady;
  return (
    <div ref={ref} style={{ minHeight: ready ? 0 : 220 }}>
      {ready ? <MapView go={go} embedded extYear={extYear} onYear={onYear} calPeriod={calPeriod} onStats={onStats} calSlot={calRail} statSlot={statSlot} initFilter={initFilter} onFilter={onFilter} onClearPeriod={onClearPeriod} />
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

// Emotional-weather card. The last-90-days block (baseline vs last-90d sounds/reads) routes to
// the story on click. The RELEASE-DECADE strip treemap used to ride underneath here; it now lives
// in its own OvDecadesCard on the Story-of-the-day row (Fuad 2026-08-17) so this module is short.
// (A by-year emotional-weather timeline is parked as a future pairing with the map's date scrubber.)
// Shared bar for the Emotional-weather card — the filled 0-100 track with the library-average tick.
// DEFINED AT MODULE SCOPE ON PURPOSE (Fuad 2026-09-13): while it was declared inside OvWeatherCard,
// every render produced a new component type, so React unmounted and remounted the bars instead of
// updating them. A freshly mounted element has no previous width to animate from, which is why the
// fill transition never fired on a filter change. Nothing here reads the card's scope, only props.
const OvWeatherBar = ({ label, v, avg, col }) => (
  <div style={{ display: "grid", gridTemplateColumns: "52px 1fr 26px", gap: 9, alignItems: "center" }}>
    {/* per-row axis label (footnote-grade eyebrow — Fuad 2026-08-24: eyebrow collapse, two sizes only) */}
    <span className="ov-eb" style={{ letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ink-soft)" }}>{label}</span>
    <div style={{ position: "relative", height: 7, background: "var(--bg-3)", borderRadius: 4 }}>
      {/* Transparent fill, vivid rim (Fuad 2026-08-20). The first pass put `opacity` on the whole
          element, which faded the border along with the fill — the one thing that was supposed to
          stay strong. Alpha now lives in the background colour only, so the stroke is free to be
          brighter and more saturated than the fill it encloses. */}
      {/* the fill animates between values so a filter change reads as a move, not a jump */}
      <div style={{ position: "absolute", inset: "0 auto 0 0", width: v + "%", background: col.f,
        border: "1px solid " + col.s, boxSizing: "border-box", borderRadius: 4,
        transition: "width .45s cubic-bezier(.3,.8,.3,1)" }} />
      {avg != null && <div title={"library average " + avg} style={{ position: "absolute", top: -2, bottom: -2, left: avg + "%", width: 2, background: "var(--ink-faint)", borderRadius: 1 }} />}
    </div>
    {/* the readout TRAVELS with the bar (2026-09-19): the fill has animated between values since
        the bar moved to module scope, but the number beside it still hard-swapped, so a filter
        change slid one and blinked the other. */}
    <span className="ov-nr" style={{ textAlign: "right" }}>
      {typeof v === "number" ? <TweenNum v={v} /> : v}</span>
  </div>
);

function OvWeatherCard({ R, go, fStats }) {
  const M = R.INSIGHTS && R.INSIGHTS.MOOD, N = M && M.now;
  // SOUNDS FOLLOWS THE FILTER (Fuad 2026-09-13). fStats.sndValence is a play-weighted mean of the
  // measured audio valence over the rows the map band is currently showing — the same rows its
  // play and artist counts come from. READS cannot follow: lyric valence is only in the build-time
  // genius-mood store and nothing equivalent ships, so it stays all-time and is labelled that way
  // rather than being silently compared against a filtered number.
  const filt = !!(fStats && fStats.active && fStats.sndValence != null);
  const audV = filt ? fStats.sndValence : (N && N.aud);
  // READS follows too now that `lv` ships per artist. It can still be null on a slice whose
  // artists have no lyric data at all, in which case the bar falls back to the all-time figure.
  const lyrV = (filt && fStats.rdsValence != null) ? fStats.rdsValence : (N && N.lyr);
  const lyrFilt = !!(filt && fStats.rdsValence != null);

  if (!N) return null;

  // .f = fill (translucent), .s = stroke (opaque, lifted in lightness AND chroma so the rim reads
  // as the drawn edge rather than as a darker outline of the same wash).
  const SND = { f: "oklch(0.72 0.15 145 / 0.28)", s: "oklch(0.80 0.19 145)" };
  const RDS = { f: "oklch(0.68 0.16 25 / 0.28)",  s: "oklch(0.78 0.20 25)" };

  // ── WEATHER (last 90 days — unchanged behaviour, incl. click-through to the story) ──
  // Now the WHOLE card body: no decades strip underneath, so the module is short and the
  // Right-now row it shares sits leaner (Fuad 2026-08-17).
  const d = (v, avg) => v - avg;
  const word = (dv) => dv >= 4 ? "brighter" : dv <= -4 ? "darker" : "steady";

  return (
    <div className="r-card ov-weather" style={{ padding: 12 }}>
      <div className="r-card-h" style={{ padding: 0, marginBottom: 8 }}>
        <span className="lbl"><b>Emotional weather</b></span>
        {filt && <span className="ov-eb ov-eb-on">{fStats.label || "filtered"}</span>}
      </div>
      <div onClick={() => go("stories", "emotional-weather")} style={{ cursor: "pointer" }}>
        <div style={{ display: "grid", gap: 8 }}>
          <OvWeatherBar label="Sounds" v={audV} avg={M.avgAud} col={SND} />
          <OvWeatherBar label={filt && !lyrFilt ? "Reads*" : "Reads"} v={lyrV} avg={M.avgLyr} col={RDS} />
        </div>
        {/* the prose line is gone (Fuad 2026-08-20) — it restated the two bars underneath it in
            words and was most of this card's height. The bars carry the reading; the mood word is
            the one thing they cannot show, so it moves into the footer line. */}
        {/* footer hint (footnote-grade eyebrow — Fuad 2026-08-24: eyebrow collapse, two sizes only) */}
        {/* dominant REGISTER (play-weighted mode over rows carrying regIdx) — the human mood word;
            falls back to the NRC emotion when no register data is present. */}
        <div className="ov-eb" style={{ marginTop: 8, letterSpacing: ".06em" }}>
          {filt
            ? (lyrFilt
                ? <>this slice · {fmt(fStats.sndPlays || 0)} plays measured for sounds, {fmt(fStats.rdsPlays || 0)} for reads</>
                : <>sounds across {fmt(fStats.sndPlays || 0)} measured plays · <b style={{ color: "var(--ink-soft)", fontWeight: 600 }}>reads*</b> has no lyric data in this slice, so it stays all-time</>)
            : <>last {N.days} days{(M.topRegister || N.emo) ? <> · mostly <b style={{ color: "var(--ink-soft)", fontWeight: 600 }}>{M.topRegister || N.emo}</b></> : null}</>}</div>
      </div>
    </div>
  );
}

// RELEASE-DECADE strip treemap — a chronological strip where each decade's WIDTH = its share of
// plays; click a decade to drill into a per-year strip (reconstructed from EXPLORE debut years,
// so it needs the rest bundle → gated on restReady). Lifted out of OvWeatherCard into its own
// module so it can ride the Story-of-the-day row at the Emotional-weather width (Fuad 2026-08-17).
// The zoom state (clicked decade) lives here now, alongside the "← all decades" return chip.
function OvDecadesCard({ R, go, restReady, fStats }) {
  const [zoom, setZoom] = React.useState(null);   // clicked decade (per-year drill-down) or null
  const ad = R.INSIGHTS && R.INSIGHTS.ADOPTION;
  // The map publishes a debut-year histogram over whatever is currently filtered, so the card can
  // follow a place, genre, year or calendar pick instead of always showing lifetime (Fuad 2026-08-20).
  // Only used when a filter is actually on: unfiltered, the precomputed ADOPTION table is the better
  // source, because it is built server-side over the full library and additionally drops artists whose
  // first-listen predates their debut year or trails it by 70+ years. The live histogram cannot apply
  // that check — it has no first-listen date — so filtered and lifetime totals differ slightly by
  // design. This is the same derivation the per-year drill-down has always used.
  const fy = (fStats && fStats.active && fStats.debutYears) ? fStats.debutYears : null;
  const decades = React.useMemo(() => {
    if (fy) {
      const b = new Map();
      for (const y in fy) { const d = Math.floor(+y / 10) * 10; b.set(d, (b.get(d) || 0) + fy[y]); }
      const tot = [...b.values()].reduce((s, p) => s + p, 0);
      return [...b.entries()].filter(([, p]) => p > 0).sort((a, c) => a[0] - c[0])
        .map(([decade, plays]) => ({ decade, plays, share: tot ? plays / tot : 0 }));
    }
    return ad && ad.decades ? ad.decades.filter(d => d.plays > 0).slice().sort((a, b) => a.decade - b.decade) : [];
  }, [ad, fy]);
  const hasDec = decades.length > 0;
  // Drop the drill-down when the filter changes: a decade that had bars under the old slice can be
  // empty under the new one, and "loading detail…" over nothing is worse than going back to the strip.
  React.useEffect(() => { setZoom(z => (z != null && !decades.some(d => d.decade === z)) ? null : z); }, [decades]);

  // per-year plays inside a decade — from the filtered histogram when there is one, otherwise
  // reconstructed from EXPLORE debut years (needs the rest bundle)
  const yearBreak = React.useMemo(() => {
    if (zoom == null) return null;
    const buckets = new Map();
    if (fy) {
      for (const y in fy) { const yn = +y; if (yn >= zoom && yn < zoom + 10 && fy[y] > 0) buckets.set(yn, fy[y]); }
    } else {
      if (!restReady || !R.EXPLORE) return null;
      for (const a of R.EXPLORE) { const y = a.d; if (y >= zoom && y < zoom + 10 && a.plays > 0) buckets.set(y, (buckets.get(y) || 0) + a.plays); }
    }
    const rows = [...buckets.entries()].map(([year, plays]) => ({ year, plays })).sort((a, b) => a.year - b.year);
    const tot = rows.reduce((s, r) => s + r.plays, 0);
    return { rows, tot };
  }, [zoom, restReady, R, fy]);

  if (!hasDec) return null;

  const H = 46;   // strip height px — HTML flex strips, not SVG: a stretched viewBox distorts label glyphs
  const strip = () => {
    if (zoom != null) {
      const dec = decades.find(x => x.decade === zoom);
      if (!yearBreak) {
        return <div className="ov-nr" style={{ padding: "14px 0" }}>loading detail…</div>;
      }
      const { rows, tot } = yearBreak;
      return (
        <div>
          <div style={{ display: "flex", height: H, borderRadius: 4, overflow: "hidden", gap: 1 }}>
            {rows.map((r, i) => {
              const w = tot ? (r.plays / tot) * 100 : 0;
              const pct = tot ? Math.round(r.plays / tot * 100) : 0;
              const hue = 60 + ((r.year - zoom) * 20);
              return (
                <div key={r.year} title={`${r.year} · ${r.plays.toLocaleString("en-US")} plays · ${pct}% of the ${zoom}s — open in Explore`}
                  onClick={(e) => { e.stopPropagation(); go && go("explore", "rd=" + zoom + ";ry=" + r.year); }}
                  className="ov-decseg"
                  style={{ width: w + "%", minWidth: 2, cursor: "pointer",
                    background: `oklch(${0.34 + (i % 5) * 0.05} 0.13 ${hue % 360} / 0.34)`,
                    "--sk": `oklch(${0.58 + (i % 5) * 0.04} 0.08 ${hue % 360} / 0.42)`,
                    "--skh": `oklch(${0.66 + (i % 5) * 0.04} 0.17 ${hue % 360} / 0.78)`,
                    display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {w > 8 && <span className="ov-mi" style={{ color: "rgba(255,255,255,.9)", whiteSpace: "nowrap" }}>'{String(r.year).slice(2)}</span>}
                </div>
              );
            })}
          </div>
          {/* strip caption (footnote-grade eyebrow — Fuad 2026-08-24: eyebrow collapse, two sizes only) */}
          <div className="ov-eb" style={{ marginTop: 8, lineHeight: 1.5 }}>
            {dec ? Math.round(dec.share * 100) + "% of plays are " + zoom + "s music" : ""} — by artist debut year · click a year to open it in Explore
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
                className="ov-decseg"
                style={{ width: w + "%", minWidth: 2, cursor: "pointer",
                  background: `oklch(${0.32 + i * 0.055} 0.14 ${hue % 360} / 0.34)`,
                  "--sk": `oklch(${0.56 + i * 0.04} 0.08 ${hue % 360} / 0.42)`,
                  "--skh": `oklch(${0.64 + i * 0.04} 0.18 ${hue % 360} / 0.78)`,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                {w > 9 && <span className="ov-nr" style={{ fontWeight: 600, color: "rgba(255,255,255,.92)", whiteSpace: "nowrap" }}>{String(d.decade).slice(2)}s</span>}
                {w > 9 && <span className="ov-eb" style={{ color: "rgba(255,255,255,.62)", whiteSpace: "nowrap" }}>{pct}%</span>}
              </div>
            );
          })}
        </div>
        {/* strip caption (footnote-grade eyebrow — Fuad 2026-08-24: eyebrow collapse, two sizes only) */}
        <div className="ov-eb" style={{ marginTop: 8 }}>
          area = share of plays by release decade · click a decade to drill in
        </div>
      </div>
    );
  };

  return (
    <div className="r-card ov-decades" style={{ padding: 12 }}>
      <div className="r-card-h" style={{ padding: 0, marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
        <span className="lbl"><b>Decades</b></span>
        {fy && <span className="ov-eb ov-eb-on">{(fStats && fStats.label) || "filtered"}</span>}
        {zoom != null && (
          <button onClick={(e) => { e.stopPropagation(); setZoom(null); }} className="ov-wback">← all decades</button>
        )}
      </div>
      {strip()}
      <style>{`
        .ov-wback { font-family: var(--mono); font-size: 8.5px; letter-spacing: .1em; text-transform: uppercase;
          background: none; border: 1px solid var(--rule); border-radius: 999px; padding: 3px 9px;
          color: var(--ink-soft); cursor: pointer; }
        .ov-wback:hover { color: var(--accent); border-color: var(--accent-dim); }
        /* Segment rims sit desaturated at rest and come up to full colour under the cursor (Fuad
           2026-08-20). Both values are handed in per-segment as --sk / --skh, because each one's hue
           is computed from its position; only the swap between them belongs in CSS. Same quiet-at-
           rest, vivid-on-hover rule the flow bands ended up with. */
        .ov-decseg { box-shadow: inset 0 0 0 1px var(--sk); transition: box-shadow .16s ease-out; }
        .ov-decseg:hover { box-shadow: inset 0 0 0 1px var(--skh); }
      `}</style>
    </div>
  );
}

// OvFacts — the bullet-list renderer both .ov-pd modules used, DELETED on 2026-09-19 with its
// two callers. It fired a list of lab2 FACT_RULES by id and collapsed each derivation to one
// headline you could click open; the rules themselves are untouched and still drive #lab2.
// If a fact list ever comes back to Overview, it comes back at a shape that has a subject.

// GATHERING DUST — the four favourites that have gone quietest. INSIGHTS.REVISIT is the same
// export the Stories feed's "Gathering dust" section reads (score = plays × silence), so the
// module and the story cannot drift apart. Every row opens the artist.
function OvDustCard({ go }) {
  const R = window.ROTATION;
  const rows = ((R.INSIGHTS && R.INSIGHTS.REVISIT && R.INSIGHTS.REVISIT.artists) || []).slice(0, 4);
  if (!rows.length) return null;
  return (
    <div className="r-card ov-pd-card" style={{ padding: "12px 16px" }}>
      <div className="r-mono ov-pd-lbl">Gathering dust</div>
      <div className="ov-pd-rows">
        {rows.map(a => (
          <div key={a.artistId || a.name} className="ov-hovrow ov-pd-row" style={{ cursor: "pointer" }}
            title={`${a.name} →`} onClick={() => go("artist", a.artistId || R.slug(a.name))}>
            <GenCover hue={a.hue} name={a.name} size={28} radius={3} style={{ flex: "none" }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="ov-pd-name">{a.name}</div>
              <div className="r-mono ov-pd-sub">quiet {Math.round(a.monthsSince)} months</div>
            </div>
            <span className="r-mono ov-pd-fig">{fmt(a.plays)} plays</span>
          </div>
        ))}
      </div>
      <div className="r-mono ov-pd-foot" onClick={() => go("stories", "gathering-dust")}>read the story ↗</div>
    </div>
  );
}

// BLIND SPOTS — artists your most-played acts keep getting compared to, that you have barely
// touched. INSIGHTS.RECOMMENDATIONS, the export behind the Stories section of the same name.
function OvBlindCard({ go, restReady }) {
  const R = window.ROTATION;
  // restReady is the memo's only dep on purpose: the click gate below asks whether a recommended
  // artist has a page at all, and expById — which is where an explore-only artist answers yes —
  // arrives with music-rest, after this module's first paint.
  const rows = React.useMemo(
    () => ((R.INSIGHTS && R.INSIGHTS.RECOMMENDATIONS && R.INSIGHTS.RECOMMENDATIONS.artists) || []).slice(0, 4),
    [restReady]);   // eslint-disable-line react-hooks/exhaustive-deps
  if (!rows.length) return null;
  // Alias-aware id, then the same hasPage test the Stories module runs (rotation-views3.jsx
  // "blind spots", Fuad 2026-09-14): these are artists you have NOT explored, so most have no
  // page — the ROW links only where one exists, and the VIA names, which are your most-played
  // acts and always have pages, are links in their own right. That is the useful jump anyway:
  // it answers "who sent me here?".
  const idOf = (name) => (R.idForName && R.idForName(name)) || R.slug(name);
  const pageId = (name) => { const id = idOf(name); return (R.byId[id] || (R.expById && R.expById[id])) ? id : null; };
  const fmtL = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1000 ? Math.round(n / 1000) + "k" : String(n));
  return (
    <div className="r-card ov-pd-card" style={{ padding: "12px 16px" }}>
      <div className="r-mono ov-pd-lbl">Blind spots</div>
      <div className="ov-pd-rows">
        {rows.map(r => {
          const pid = pageId(r.name);
          return (
            <div key={r.name} className={"ov-pd-row" + (pid ? " ov-hovrow" : "")}
              style={{ cursor: pid ? "pointer" : "default" }} title={pid ? `${r.name} →` : undefined}
              onClick={pid ? () => go("artist", pid) : undefined}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="ov-pd-name">{r.name}</div>
                <div className="r-mono ov-pd-sub">via {(r.via || []).map((v, i) => (
                  <React.Fragment key={v.name}>
                    {i > 0 ? ", " : ""}
                    <b className="ov-pd-via" title={`${v.name} →`}
                      onClick={(e) => { e.stopPropagation(); go("artist", v.artistId || idOf(v.name)); }}>{v.name}</b>
                  </React.Fragment>
                ))}</div>
              </div>
              {r.listeners ? <span className="r-mono ov-pd-fig">{fmtL(r.listeners)} listeners</span> : null}
            </div>
          );
        })}
      </div>
      <div className="r-mono ov-pd-foot" onClick={() => go("stories", "blind-spots")}>read the story ↗</div>
    </div>
  );
}

// Stat takes a RAW NUMBER plus its formatter (2026-09-19), not a pre-formatted string: a numeral
// that arrives as text can only be swapped, and every one of these ten changes the moment a filter
// lands. `f` formats, `from`/`dur` hand TweenNum a first-paint ramp for the two figures that used
// to get one from useCountUp. Anything non-numeric (a hyphen, a unit already baked in) still prints
// as-is, so a call site that has nothing to tween costs nothing — SINCE and PEAK YEAR below lean on
// exactly this (2026-09-21): a year handed in as a string skips TweenNum entirely, because a
// count-up through a run of intermediate years reads as a date glitch, not a stat landing.
// `title` (2026-09-21) is a plain passthrough to the tile's own div, for PEAK YEAR's exact-count
// tooltip — optional, costs nothing when omitted.
//
// IT LIVES OUT HERE, NOT INSIDE OverviewView (2026-09-21). Declared in the view body it was a NEW
// component type on every render, so React threw the whole strip away and remounted it whenever a
// filter landed — and a remounted TweenNum starts at its target with nothing to travel from. Every
// tile snapped; `hours`, the one tile carrying from={0}, restarted its 1.4s ramp from zero, which
// is the exact fault the TweenNum migration was written to fix ("a figure that MOVED restarted from
// nothing instead of travelling the difference"). Measured over CDP at 40ms: 7,800 -> 23 in one
// frame before, the ease across ~420ms after. The component closes over nothing but its props, so
// the hoist is the whole fix.
const Stat = ({ n, f, sub, big, onClick, from, dur, title }) => (
  <div onClick={onClick} title={title} style={onClick ? { cursor: "pointer" } : null} className={onClick ? "ov-stat-link" : ""}>
    <div className="r-stat-n" style={{ fontSize: big ? "clamp(28px,3.4vw,40px)" : 20 }}>
      {/* STRING VALUES CROSS-FADE (Fuad 2026-09-21: "years changing need to transition as well").
          A year deliberately never tweens — counting through 1,974 reads as a date glitch — but a
          hard swap snapped while every numeric neighbour eased. The key remounts the span on each
          new value, and .ov-yrswap fades it in; reduced-motion turns it off with the rest. */}
      {typeof n === "number" && isFinite(n) ? <TweenNum v={n} f={f} from={from} dur={dur} /> : <span key={String(n)} className="ov-yrswap">{n}</span>}</div>
    {/* the ↗ is gone (Fuad 2026-08-20). It marked the stat as clickable, but every stat in the
        strip is, so it marked nothing — and it inflated captions that are already tight once a
        filter name is concatenated in. .ov-stat-link still carries the hover affordance. */}
    {/* per-tile stat caption (footnote-grade eyebrow — Fuad 2026-08-24: eyebrow collapse, two sizes only) */}
    <div className="ov-eb ov-stat-sub" style={{ marginTop: 4 }}>{sub}</div>
  </div>
);

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
  // audit B2 2026-09-22: was one of four day-series.js sites, two of them id-less. One tag now,
  // and a 404 leaves days null — the stats fall back to lifetime, which is the no-filter state.
  React.useEffect(() => window.ensureShard("day-series.js", "ROTATION_DAYS", () => setDays(window.ROTATION_DAYS || null)), []);
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
    // ACTIVE-DAY COUNT AND THE HEAVIEST-DAY SCAN WENT (Fuad 2026-09-21) with the two strip tiles
    // that read them. Both only ever answered a TIME pick — day-series is flat per-day totals with
    // no place or genre in it — so under a place/genre-only filter they silently kept showing this
    // window's unsliced numbers. Exchanged for peak year / since year, built off `yp` in the map
    // band's own onStats pass (rotation-worldmap.jsx), which a place or genre slice can answer too.
    let plays = 0;
    for (let i = from; i <= to; i++) plays += days.counts[i];
    const spanDays = to - from + 1;
    return { plays, spanDays, label, avgDay: Math.round(plays / spanDays * 10) / 10,
      sharePct: Math.round(plays / (days.total || 1) * 1000) / 10 };
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
    // DEPTH (plays per artist) AND ITS SHARE FALLBACK ARE GONE FROM HERE (Fuad 2026-09-21) — the
    // tenth-tile ternary they fed is too, replaced by ONE stable PLAYS/ARTIST identity computed
    // straight off fStats.plays/fStats.artists at the call site (no flt detour needed: unlike
    // avg/day, this ratio never wanted the day-series window, only the Results counts). `hi`
    // (heaviest day) is gone with the peak-day tile it fed — see the dyn comment above.
    return {
      avgDay: Math.round(fp / Math.max(1, spanDays) * 10) / 10,
      label: rawLabel.length > 18 ? rawLabel.slice(0, 17) + "…" : rawLabel,
    };
  }, [fStats, dyn, days]);
  // Share of all-time plays held by the artists currently in the map's Results list. fStats now
  // reports its totals whether or not a filter is on, so this one number is live from the first
  // paint and moves with every place, genre, year and calendar pick.
  const resShare = React.useMemo(() => {
    if (!fStats || fStats.plays == null) return null;
    const total = (days && days.total) || T.scrobbles || 0;
    if (!total) return null;
    return Math.round(fStats.plays / total * 1000) / 10;
  }, [fStats, days, T.scrobbles]);
  const liveTotal = (window.ROTATION_LIVE && window.ROTATION_LIVE.total) || T.scrobbles;
  // useCountUp is gone from this view (2026-09-19): it ramps 0→target on mount and then only ever
  // re-ramps from zero, so a figure that MOVED — hours under a filter — restarted from nothing
  // instead of travelling the difference. TweenNum does both (from={0} buys back the mount ramp).
  // LIVE-ADJUSTED HOURS (Fuad 2026-08-27 #5): the scrobble stat ticks live off the daily
  // snapshot while hours froze at the build-baked T.listeningHours, so the pair drifted
  // apart between builds. Extend the baked hours by the live delta at the library's own
  // average track length (baked hours ÷ baked plays) — the cheap approximation that adds
  // zero data weight and converges to the exact figure at every rebuild.
  const hrsLive = React.useMemo(() => {
    const base = T.listeningHours || 0, baked = T.scrobbles || 0;
    const avgSec = baked ? base * 3600 / baked : 210;
    return Math.round(base + Math.max(0, liveTotal - baked) * avgSec / 3600);
  }, [T, liveTotal]);
  // seen-live share (Fuad 2026-08-13): % of ALL plays belonging to artists you've stood in front
  // of. seenLive ships ONLY on kept (core) artist records — expById rest rows never carry it, and
  // they OVERLAP the kept set, so summing both would be a double-count trap. Denominator is
  // lifetime scrobbles: the honest share, support-act tail excluded until gigs data reaches core.
  const seenLivePct = React.useMemo(() => {
    let live = 0;
    for (const a of R.ARTISTS) if (a.seenLive) live += a.plays || 0;
    return T.scrobbles ? Math.round(live / T.scrobbles * 100) : 0;
  }, [R]);
  // Filter-scoped variant (Fuad 2026-08-22): the map band reports livePlays off the same Results
  // rows as plays, so under any place/genre/year/calendar filter the stat becomes that slice's
  // own seen-live share instead of freezing at the lifetime number.
  const seenLiveShown = (fStats && fStats.active && fStats.plays > 0 && fStats.livePlays != null)
    ? Math.round(fStats.livePlays / fStats.plays * 100) : seenLivePct;
  const now = useLiveNow(); const nowArtist = R.byId[now.artistId] || { hue: 200, tags: [] };
  const npKnown = !!(R.byId[now.artistId] || (R.expById && R.expById[now.artistId]) || (R.played && R.played(now.artist)));

  // 26-week scrobble trend (real if the build provides it)
  const trend = React.useMemo(() => R.TREND || Array.from({ length: 26 }, (_, i) =>
    180 + Math.round(Math.sin(i / 3) * 60 + (hashInt("wk" + i, 5) % 90) + i * 3)), []);
  // Library's first year — flt-independent (Fuad 2026-09-21), so the SINCE tile below has a real
  // number to show before the map band's fStats pass lands (or on a slice with no yp coverage at
  // all). Same source the header kicker used when it was on screen: new Date(T.since).getFullYear().
  const firstYear = new Date(T.since).getFullYear();
  // NEXT MILESTONE, FOLDED IN (2026-09-19). It was its own pulse card printing the same live total
  // the Scrobbles card prints one cell along — two of the row's four seats spent on one number.
  // What the card actually added was the DISTANCE to the next round five thousand, so that is what
  // comes across: a bar under the sparkline, the target as an end-cap, and the last crossing named
  // underneath (INSIGHTS.MILESTONES is the build's ledger of them — biggest n is the most recent).
  // The `mile` memo (next round 5k + pct + last crossing from INSIGHTS.MILESTONES) went with its
  // last consumer, the "last: 300k — …" line, on 2026-09-21. paceEta above computes its own next.
  // 10,485 → "10.5k". The strip and the milestone line both want a round number small enough to
  // ride inside a caption; fmt() spells every digit and is too wide for either.
  const kAbbr = (n) => n >= 10000 ? (Math.round(n / 100) / 10) + "k" : fmt(n);
  // PACE + MILESTONE ETA for the Scrobbles card (Fuad 2026-09-21, his own spec: "'26 pace 29.3k ·
  // 300k in ~41 days — except take into account that we already do have over 300k"). Two live
  // facts in the Streak card's best-line grammar: this year's projected total (year-to-date over
  // day-of-year, the live delta riding on top of the baked day-series so today's plays count),
  // and when the NEXT round five-thousand lands at that pace — the folded milestone card's own
  // grain, and ceil() from the live total, so the line can never name a milestone already crossed.
  // Day-of-year clamps to 7 so the first week of January doesn't project one wild afternoon into
  // a 60k year.
  const paceEta = React.useMemo(() => {
    if (!days || !days.counts || !days.start) return null;
    const startMs = new Date(days.start + "T00:00:00Z").getTime();
    const y = new Date().getUTCFullYear();
    const jan1 = Date.UTC(y, 0, 1);
    const idx0 = Math.max(0, Math.round((jan1 - startMs) / 86400e3));
    let ytd = 0; for (let i = idx0; i < days.counts.length; i++) ytd += days.counts[i];
    ytd += Math.max(0, liveTotal - (T.scrobbles || 0));
    const doy = Math.max(7, Math.floor((Date.now() - jan1) / 86400e3) + 1);
    const perDay = ytd / doy;
    if (!(perDay > 0)) return null;
    const next = Math.ceil((liveTotal + 1) / 5000) * 5000;
    return { yy: String(y).slice(2), pace: Math.round(perDay * 365), next,
      eta: Math.max(1, Math.round((next - liveTotal) / perDay)) };
  }, [days, liveTotal, T.scrobbles]);
  // THE "· lifetime" MARKER IS GONE, AND SO IS WHAT IT WAS APOLOGISING FOR (Fuad 2026-09-21:
  // "after filtering 'lifetime' popping up under Albums is no good, it blows up a row" /
  // "Overall it'd be better if we had numbers updating with filters"). It was added on 2026-09-19
  // to own up to two tiles that couldn't follow the filter; the honest fix was to make them
  // follow it. The map band now reports the Results pane's own album and song counts alongside
  // plays and artists (rotation-worldmap.jsx), so both tiles narrow with everything else and
  // there is nothing left to caption. .ov-stat-lt went with it.
  //
  // ACTIVE DAYS (which had replaced "N / sitting" on 2026-09-19) IS GONE TOO, ONE DAY LATER
  // (Fuad 2026-09-21). Same fault as its neighbour, peak day: day-series is flat per-day totals
  // with no place or genre in it, so under a place/genre-only filter "days" silently kept showing
  // this window's unfiltered count instead of the slice's own. Exchanged for SINCE — the earliest
  // year the current slice actually has plays in, off the map band's own yp-built fStats pass
  // (rotation-worldmap.jsx) — which a place or genre filter, not just a time one, can answer.

  return (
    <div className="r-view" ref={ref}>
      {/* WHOLE HEADER temporarily off (Fuad 2026-08-20) — kicker, title and lede — so the page opens
          straight onto content. Restoring it means uncommenting this block AND dropping the
          .r-headbare class from the div, which exists only to close the gap a missing title leaves.
          See MEMORY: state_2026_08_20_overview_experiment.
      <div className="r-viewhead r-headbare">
        <div>
          <div className="r-kicker">Rotation · since {new Date(T.since).getFullYear()}</div>
          <h1 className="r-title">A life, <em>counted</em><span className="dot">.</span></h1>
        </div>
        <p className="r-lede">Every track I've played, since the mid-2000s —
          turned into something I can actually <b>look at</b>.</p>
      </div>
      */}

      {/* bento */}
      <div className="m-stack" style={{ display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gap: "var(--gap)" }}>
        {/* NOW PLAYING temporarily off (Fuad 2026-08-20). See MEMORY:
            state_2026_08_20_overview_experiment.
        <div className="r-card ov-np" style={{ gridColumn: "span 4", padding: "8px 12px", display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
          <div style={{ position: "relative", cursor: npKnown ? "pointer" : "default" }} onClick={() => npKnown && go("artist", now.artistId)}>
            <GenCover hue={nowArtist.hue} name={now.artist} image={now.img || undefined} size={62} radius={4} />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", justifyContent: "center",
              gap: 3, padding: "0 0 6px" }}>
              {[0, 1, 2, 3, 4].map(i => <span key={i} className="eqbar" style={{ animationDelay: i * 0.13 + "s" }} />)}
            </div>
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="r-live" style={{ marginBottom: 3 }}><span className="dot" /> {now.nowplaying ? "Now playing" : "Last played"}</div>
            <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 17, lineHeight: 1.05 }}>
              {npKnown ? <span onClick={() => go("track", R.slug(now.artist) + "~" + R.slug(now.track))} style={{ cursor: "pointer" }}>{now.track}</span> : now.track}</div>
            <div style={{ color: "var(--ink-soft)", fontSize: 12.5, marginTop: 2 }}>
              {npKnown ? <b onClick={() => go("artist", now.artistId)} style={{ cursor: "pointer", color: "var(--ink)", fontWeight: 600 }}>{now.artist}</b> : now.artist} — {npKnown ? <span onClick={() => go("album", R.slug(now.artist) + "~" + R.slug(now.album))} style={{ cursor: "pointer", color: "var(--ink-faint)" }}>{now.album}</span> : <span style={{ color: "var(--ink-faint)" }}>{now.album}</span>}</div>
            <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
              {nowArtist.tags.slice(0, 3).map(g => <span key={g} className="r-chip link" title={`Explore ${g} →`} onClick={() => go("explore", g)}>{g}</span>)}
            </div>
          </div>
        </div>
        */}


        {/* THE MAP BAND — full width, right below the pulse row. The calendar rail rides along as
            a slot: it renders under the map's deepest-places column and cross-filters the results. */}
        <div className="ov-mapslot" style={{ gridColumn: "1 / -1" }}>
          <OvMapBand go={go} restReady={restReady} extYear={mapYear} onYear={setMapYear} calPeriod={mapPeriod} onStats={setFStats}
            onClearPeriod={() => { setMapPeriod(null); setMapYear(null); }}
            initFilter={_seed.filter} onFilter={setMapFilter}
            calRail={<OvCalRail go={go} onYear={setMapYear} onPeriod={setMapPeriod} init={_seed} extYear={mapYear} />}
            statSlot={
              /* the stat strip, nested under the flowmap (Fuad 2026-07-06). EVERY TILE is
                 filter-reactive as of 2026-09-21 (Fuad: "it'd be better if we had numbers updating
                 with filters") — hours, artists, albums, songs, since year, seen live, avg/day,
                 plays/artist, peak year and results-share all narrow with the map/calendar pick.
                 SINCE and PEAK YEAR are the last two in (replacing "days played" and "peak day"):
                 both used to read the day-series TIME window only — day-series carries no place or
                 genre, so a place/genre-only filter silently kept showing the unsliced lifetime
                 numbers underneath them. Both now come off the map band's own onStats pass instead
                 (rotation-worldmap.jsx), which accumulates a year→plays map from each Results row's
                 `yp` and so can answer a place or genre slice honestly, not just a time pick. */
              <div className="r-card ov-strip" style={{ padding: "12px 14px", display: "grid",
                gridTemplateColumns: "repeat(2,1fr)", gap: "10px 16px", alignContent: "center" }}>
                <Stat n={fStats && fStats.active ? fStats.hours : hrsLive} f={fmt} from={0} dur={1400} sub="hours" onClick={() => go("calendar")} />
                <Stat n={fStats && fStats.active ? fStats.artists : T.artists} f={fmt} sub="artists" onClick={() => go("explore")} />
                {/* the catalogue row (Fuad 2026-08-12): how much MUSIC that listening covered —
                    LPs / EPs+singles / distinct folded songs.
                    THESE TWO FOLLOW THE FILTER NOW (Fuad 2026-09-21). They were lifetime-only from
                    the start on the grounds that media rows carry no per-period tags — true of the
                    shelf counts, but beside the point: the map band has been building the Results
                    pane's albums and songs on every filter change all along, and it now reports
                    their counts in fStats. Filtered, each tile is the slice's own list, which is
                    the list one click away in Results. The EP/singles tail stays a LIFETIME
                    footnote and so shows only unfiltered — a filtered LP count has no filtered
                    tail to hang off it, and appending a lifetime one is the "· lifetime" marker
                    coming back in another costume. */}
                {T.albumsLP != null && <Stat f={fmt} onClick={() => go("shelves")}
                  n={fStats && fStats.active && fStats.albums != null ? fStats.albums : T.albumsLP}
                  sub={fStats && fStats.active && fStats.albums != null
                    ? <span>albums</span> : <span>albums +{kAbbr(T.epsSingles || 0)}</span>} />}
                {/* SINCE (Fuad 2026-09-21) replaces "days played" — see the strip's opening comment
                    and the removed activeDays memo above for why. The number is the earliest year
                    the CURRENT slice has any plays in at all, off fStats.sinceYear; the library's
                    own first year covers the gap before the map band's first onStats report lands.
                    Rendered as a STRING on purpose, not a number: Stat's f={fmt} would comma a year
                    ("2,013"), and passing it through TweenNum/n-as-number would count up to it,
                    which reads as a date glitch rather than a stat. A string skips both — it falls
                    through Stat's own non-numeric branch (`typeof n === "number" ... : n`), which
                    renders as-is with no formatter and no tween. */}
                <Stat n={String(fStats && fStats.sinceYear != null ? fStats.sinceYear : firstYear)} sub="since" onClick={() => go("calendar")} />
                {T.tracks != null && <Stat f={fmt} sub={<span>songs</span>} onClick={() => go("explore")}
                  n={fStats && fStats.active && fStats.songs != null ? fStats.songs : T.tracks} />}
                {seenLivePct > 0 && <Stat n={seenLiveShown} f={(x) => x + "%"} sub="seen live" onClick={() => go("gigs")} />}
                <Stat n={flt ? flt.avgDay : T.perDay} sub="avg / day" />
                {/* PLAYS / ARTIST (Fuad 2026-09-21) is this tile's ONE stable identity now —
                    it used to shape-shift between depth / share% / years-of-history depending on
                    what was active, three different quantities behind one slot. fStats.plays /
                    fStats.artists already IS the old "depth" reading, and fStats reports both
                    whether or not a filter is on, so this single expression covers every case; the
                    T.scrobbles/T.artists arm only covers the instant before the map band's first
                    report lands. The FULL caption ships, not the "per artist" it was cut to on
                    2026-09-19 (that cut, and "of history"'s, are why this and the tile below carry
                    dated captions-cut-to-fit comments below) — here the CAPTION shrinks instead of
                    the words: see .ov-stat-fit, sized against this strip's real ~57px 1fr track. */}
                {/* BASE MATCHES THE VISIBLE NEIGHBOUR (2026-09-21, caught at QC render): unfiltered,
                    fStats.plays/fStats.artists said 45.6 while the ARTISTS tile two cells over said
                    16,054 — fStats counts Explore-eligible artists only, the tile counts the whole
                    library, and a ratio the reader can't rebuild from the numbers beside it is the
                    old "computable" complaint in a new costume. So: unfiltered reads lifetime over
                    lifetime (T.scrobbles/T.artists, ≈20), filtered reads the slice over the slice's
                    own artist count — each state computes against the ARTISTS tile it sits with. */}
                <Stat n={fStats && fStats.active ? Math.round(fStats.plays / Math.max(1, fStats.artists) * 10) / 10
                    : Math.round(T.scrobbles / Math.max(1, T.artists) * 10) / 10}
                  sub={<span className="ov-stat-fit">plays / artist</span>} />
                {/* PEAK YEAR (Fuad 2026-09-21) replaces "peak day" — the pair to SINCE above and
                    the same fault as "days played": R.TOTALS.topDay was a LIFETIME constant with no
                    filtered form, blind to place or genre. fStats.peakYear is the year with the most
                    plays in whatever the onStats pass just aggregated (clamped to the picked
                    window under a year/calendar pick — see rotation-worldmap.jsx); the exact count
                    rides in the title tooltip, where a comma is correct, rather than in the tile
                    itself. Plain-string year again, same reasoning as SINCE. */}
                <Stat n={fStats && fStats.peakYear ? String(fStats.peakYear.y) : "–"} sub="peak year" onClick={() => go("calendar")}
                  title={fStats && fStats.peakYear ? `${fmt(fStats.peakYear.plays)} plays in ${fStats.peakYear.y}` : undefined} />
                {/* Tenth stat (Fuad 2026-08-20): what share of everything I've ever played belongs
                    to the artists standing in the Results list right now — the WHOLE list, not its
                    visible top ten. Unfiltered it reads as the genre map's coverage of my listening;
                    narrow to a city or a genre and it drops to that corner's weight. Distinct from
                    plays/artist beside it, which answers obsession-vs-breadth rather than coverage. */}
                {resShare != null && <Stat n={resShare} f={(x) => x + "%"} sub="of plays" onClick={() => go("explore")} />}
              </div>
            } />
        </div>

        {/* PULSE SLOT (Fuad 2026-08-20): Scrobbles, Streak, Riser of the week and Next milestone,
            in the row Story of the day used to hold, so the map leads the page. They live in a
            nested 4-up grid rather than being re-pinned individually — the ≥981px rules pinned each
            card to grid-row 1, so moving them in the DOM alone would have snapped them back up. */}
        <div className="ov-pulseslot">
        {/* scrobble counter + trend + the next milestone — left anchor of the pulse row */}
        <div className="r-card ov-scrob" style={{ padding: 12, display: "flex", flexDirection: "column" }}>
          <div className="r-card-h" style={{ padding: 0 }}>
            <span className="lbl"><b>Scrobbles</b></span>
            <span className="meta">26-wk</span>
          </div>
          <div className="ov-n" style={{ margin: "1px 0 0" }}>
            <TweenNum v={liveTotal} f={fmt} from={0} dur={1400} /></div>
          {/* pace + ETA line, the Streak best-line's seat on this card — see the paceEta memo */}
          {paceEta && <div className="ov-eb" style={{ letterSpacing: ".04em", whiteSpace: "nowrap",
            overflow: "hidden", textOverflow: "ellipsis", margin: "2px 0 0" }}
            title={`${fmt(paceEta.pace)} plays if this year's rate holds · ${fmt(paceEta.next)} at ~${paceEta.eta} days away`}>
            '{paceEta.yy} pace {kAbbr(paceEta.pace)} · {kAbbr(paceEta.next)} in ~{paceEta.eta}d</div>}
          <div style={{ marginTop: 2 }}>
            <Spark data={trend} w={300} h={22} run={seen} fill="var(--accent-bg)" />
          </div>
          {/* The folded-in milestone card is now FULLY unwound: the bar retired 2026-09-21 (Fuad:
              redundant, and it grew the whole row), and the last-crossing line — "last: 300k —
              Poppy, Nothing" — followed on 2026-09-21 (Fuad: "let's remove this bit for now").
              What the card says about milestones now is only the pace/ETA line above, which looks
              FORWARD; INSIGHTS.MILESTONES still ships if a crossing memory ever earns a seat back. */}
        </div>

        {/* streak — current run + when the all-time best happened (INSIGHTS.STREAK carries the range) */}
        <div className="r-card ov-streak" style={{ padding: 12, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <div className="r-card-h" style={{ padding: 0 }}><span className="lbl"><b>Streak</b></span>
            {T.streak.current >= T.streak.best ? <span className="meta" style={{ color: "var(--accent)" }}>record!</span> : null}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 0 }}>
            <div className="ov-n">{T.streak.current}</div>
            <span className="ov-nr" style={{ color: "var(--ink-soft)" }}>days</span>
          </div>
          {(() => {
            const S = R.INSIGHTS && R.INSIGHTS.STREAK;
            const MON = window.MON;
            const f = (d) => { const x = new Date(d + "T00:00:00Z"); return MON[x.getUTCMonth()] + " '" + String(x.getUTCFullYear()).slice(2); };
            // THE VOID, FILLED (2026-09-19). This card carried a number, a "best" and one sentence,
            // and once On this day joined the row it was left holding ~40px of nothing. Two things
            // go in, both of them the record's own context:
            //   · WHEN the record ran. INSIGHTS.STREAK has shipped {start,end} all along and the
            //     card only ever printed the count, so "best 329" named a feat with no date on it.
            //   · WHAT THE LAST 60 DAYS LOOK LIKE. ROTATION_DAYS is already resident here — the
            //     same flat per-day counts the stat strip filters on — so the run costs one slice
            //     and no fetch, and it puts the current streak in a picture instead of a claim.
            // "N days from the record" came OUT: Your portrait printed the same subtraction two
            // rows down ("317 days from the 329-day record"), and that module is gone now anyway.
            const run = (days && days.counts) ? days.counts.slice(-60) : null;
            const mx = run ? Math.max(1, ...run) : 1;
            return (
              <div style={{ alignSelf: "stretch", width: "100%", minWidth: 0 }}>
                {/* per-item micro-label, pairs with the 8.5px line below (footnote-grade eyebrow — Fuad 2026-08-24: eyebrow collapse, two sizes only)
                    TRACKING PAYS FOR THE DATES (2026-09-19), the same trade the stat strip's
                    captions made: at .08em this line ran two characters past the 162px this card
                    gets at 1280 and ellipsised the record's end month. Down to .04em, and the
                    dash loses its spaces, so the whole span fits with room. */}
                <div className="ov-eb" style={{ letterSpacing: ".04em",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                  title={S && S.start && S.end ? `longest run: ${T.streak.best} days, ${S.start} to ${S.end}` : undefined}>
                  best <span style={{ color: "var(--accent)" }}>{T.streak.best}</span>
                  {S && S.start && S.end ? <> · {f(S.start)}–{f(S.end)}</> : null}
                </div>
                {/* strip AND caption, or neither: day-series.js is lazy, so on the paint before it
                    lands `run` is null and a bare "last 60 days" would caption nothing. */}
                {run && (<>
                  <div className="ov-daybar" title="the last 60 days — one bar a day, empty where nothing played">
                    {run.map((c, i) => <i key={i} style={c ? { background: "var(--accent)", opacity: 0.32 + 0.68 * Math.min(1, c / mx) } : { background: "var(--bg-3)" }} />)}
                  </div>
                  <div className="ov-eb" style={{ letterSpacing: ".06em" }}>last 60 days</div>
                </>)}
              </div>
            );
          })()}
        </div>

        {/* Riser of the week + Next milestone (Fuad 2026-08-20). These two used to compete for space
            in the scored insight deck below, where Next milestone at 0.5 essentially never won a
            slot — it is the card that says how close the next round total is, which is exactly the
            kind of thing you want in the row you actually look at. Pulled up here as FIXED slots via
            `only`, so the scorer no longer decides whether they appear.
            `span="auto"` because .ov-pulseslot is a plain 4-up grid, not the 12-col bento the deck
            sits on — the default "span 4" would eat the whole row.
            This week is retired rather than moved: the Riser card is already framed on the week, and
            two week-shaped cards side by side said the same thing twice.
            NEXT MILESTONE IS GONE FROM HERE (2026-09-19) — it folded into the Scrobbles card at the
            head of this row, which was already printing its number. "On this day" takes the seat:
            it scores 0.68 against an on-repeat at 0.78 and a riser at 0.72, so it lost the lottery
            essentially every day despite being the only card here that looks backwards. Pinned, in
            the freed cell, with About to tip over holding the trailing one it already had.
            ABOUT TO TIP OVER LEFT THIS ROW (2026-09-19) — it named whichever artist in the whole
            library happened to be nearest a round total, which is a fact about that artist and not
            about this week, and it now rides under their own play count on the artist page. Its
            seat goes to In season: the two or three artists whose listening only ever happens in
            the window the calendar is standing in right now. */}
        <InsightRow go={go} n={2} span="auto" only={["otd", "in-season"]}
          omit={["week", "story-day"]} />
        </div>{/* /ov-pulseslot */}

        {/* STORY OF THE DAY temporarily off (Fuad 2026-08-20) — the pulse modules take this
            row instead. See MEMORY: state_2026_08_20_overview_experiment.
            Story of the day — a DEDICATED slot (was only an insight-row card, so higher-scoring
            milestone cards crowded it out of the top-4 and nothing showed — Fuad 2026-07-18). Now
            it always features, deterministic per UTC day via window.storyOfDay(). Shares its row
            with the Decades card now (cols 1-8; Decades takes 9-12) — Fuad 2026-08-17.    
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
                <span className="ov-story-teaser" style={{ fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.45, minWidth: 0 }}>{pick ? pick.teaser : ""}</span>
              </div>
              <span className="r-mono ov-story-go">read →</span>
            </div>
          );
        })()}
        */}

        {/* Decades — release-decade strip treemap, lifted out of Emotional weather so it rides the
            Story-of-the-day row at the same width the weather card uses (cols 9-12). Drillable to
            per-year; the drill needs the rest bundle, hence restReady (Fuad 2026-08-17). */}
        <OvDecadesCard R={R} go={go} restReady={restReady} fStats={fStats} />

        {/* The "Right now" wrapper card is gone (Fuad 2026-08-20) — a card whose only content was
            four more cards, so it charged a header, a border and two lots of padding for nothing.
            The insight cards now sit straight on the grid. .ov-insgrid keeps the class so its
            existing column rules still apply; it is a bare grid rather than an .r-card. */}
        {/* SAME GRID AS THE PULSE ROW (Fuad 2026-08-20: "still not vertically aligned with other
            modules above"). Both rows span the bento's first eight columns and both show four
            cards, but they were dividing that width by different arithmetic: the pulse row is four
            1fr tracks with a var(--gap) 20px gutter, while this was twelve tracks with an 8px
            gutter and each card spanning three. Same outer width, different inner edges — every
            card here landed a few px off the one above it, and the drift compounded across the row.
            One template and one gap for both. */}
        <div className="ov-insgrid" style={{ gridColumn: "span 8", display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "var(--gap)" }}>
          {/* LAST 72 HOURS in the ticker's seat (Fuad 2026-09-22: "the only thing I like is the
              last 72h ... Let's put this in instead of recent as the only module substitution" —
              the whole of the B4-overhaul verdict). Same fixed lead cell, for the same reason the
              ticker held it: a fixed card is steadier at an edge than wedged between three that
              reshuffle by score every day. The strip is the live sync's clock72 — 72 hourly bins,
              newest at the right — read at render time: live-data.js is a deferred script ahead
              of the app bundle (index.html), so it has already run by first render, and if its
              fetch ever failed outright the card degrades to the quiet header. The ranked deck
              omits "clock72" or the page could print the same strip twice. The last.fm address
              stays in the header: it is the page's only outbound link to the account, and this
              card draws from the same live feed the ticker did. */}
          <div className="r-card ov-last72" style={{ padding: "8px 11px", display: "flex", flexDirection: "column" }}>
            {/* The link is ONE WORD at 8.5px nowrap — the Recent-era sizing (git history): at this
                card's ~185px anything larger dropped the ↗ to its own line. The size stays INLINE:
                this anchor keeps .meta for its margin-left:auto, and .r-card-h .meta outranks a
                bare role class, so a class here would silently lose. */}
            <div className="r-card-h" style={{ padding: 0, marginBottom: 3, flexWrap: "nowrap" }}>
              {/* "Last 72h", not "Last 72 hours" (render QC 2026-09-22): the full label plus the
                  address measured to this card's ~185px exactly and wrapped the header to two
                  lines at 1340 — and it is Fuad's own name for the module. The caption row
                  underneath still spells the window out. */}
              <span className="lbl"><b>Last 72h</b></span>
              <a className="meta r-extlink-lf" href="https://www.last.fm/user/fuadex" target="_blank" rel="noopener noreferrer"
                style={{ color: "var(--ink-faint)", textDecoration: "none", fontSize: 8.5, whiteSpace: "nowrap", flex: "none" }}>last.fm/fuadex ↗</a></div>
            {(() => {
              const c = window.ROTATION_LIVE && window.ROTATION_LIVE.clock72;
              if (!c || !c.bins || !c.bins.length) return null;   // shard not landed → quiet header-only card
              const sum = c.bins.reduce((a, b) => a + b, 0);
              const max = Math.max(...c.bins, 1);
              // the deck card's own geometry (46px bars, eyebrow caption), centred in the taller
              // fixed cell. sum CAN be 0 on a silent stretch: the flat baseline and "0 plays" are
              // the honest render, where the scored card would simply have skipped its turn.
              return (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 1, height: 46 }}>
                    {c.bins.map((v, i) => <div key={i} style={{ flex: 1, height: Math.max(2, v / max * 46), background: v ? "var(--accent)" : "var(--bg-3)", opacity: v ? 0.5 + 0.5 * (v / max) : 1, borderRadius: 1 }} title={v + " plays"} />)}
                  </div>
                  <div className="ov-eb" style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                    <span>72h ago</span><span>{fmt(sum)} plays</span><span>now</span>
                  </div>
                </div>
              );
            })()}
          </div>
          {/* three scored cards beside it. otd + in-season are pinned into the pulse row above and
              `week` is retired, so all three are omitted here or the page shows them twice.
              (scrob-mile left this list on 2026-09-19 along with the provider itself; artist-mile
              and movement followed on the same day — the first moved to the artist page, the
              second merged into "This week", and neither can return a card to omit.)
              `last` went with movement, which was the only id it ever pinned. Position is back to
              score order here; if a card needs a fixed cell again, `last` is still in runInsights.
              clock72 joined on 2026-09-22: the strip owns the fixed cell where the ticker sat,
              and a card cannot be in both. */}
          <InsightRow go={go} n={3} omit={["otd", "in-season", "week", "mood", "clock72"]} />
        </div>

        {/* emotional weather — last-90d sounds/reads only now (the decades strip moved up to the
            Story row), so it's short and keeps the Right-now row lean. cols 9-12 (ov-weather grid rules). */}
        <OvWeatherCard R={R} go={go} fStats={fStats} />

      </div>

      {/* THE TWO MODULES CHANGED SUBJECT (2026-09-19). "Your portrait" and "Where to dig" were
          Phase 1 of the Overview makeover (Fuad 2026-07-17): each fired a hand-picked subset of
          lab2's FACT_RULES and printed six or seven one-line claims you could click open. The
          claims were true and the lists were unreadable — seven bullets of seven different shapes
          ("48% of library under 50k listeners", "'Tsunami (11:11)' is 60% of Bambie Thug"), with
          no through-line and, for most of them, nowhere to go. And the portrait's last bullet was
          the Streak card's own sentence, two rows apart on the same page.
          Both slots now name ARTISTS, four rows each, out of the same build exports the Stories
          feed reads — and every row is a page. Gathering dust (INSIGHTS.REVISIT) is the library
          you already own and stopped playing; Blind spots (INSIGHTS.RECOMMENDATIONS) is the one
          your most-played acts keep pointing at. The .ov-pd frame and its 1fr/1fr split are
          unchanged, so the pair still sits at the width the fact modules held. */}
      <div className="ov-pd" style={{ marginTop: "calc(var(--gap)*1.4)" }}>
        <OvDustCard go={go} />
        <OvBlindCard go={go} restReady={restReady} />
      </div>

      <style>{`
        /* ══ EIGHT TYPE ROLES FOR THE OVERVIEW (2026-09-19) ═══════════════════════════
           The move rotation-views3.jsx made for the Stories feed (.st-mi / .st-nr / .st-tx), run
           over Overview. Sixty-odd inline declarations across this file and rotation-insights.jsx
           were re-deriving the same handful of faces by hand, so a row and the row under it could
           disagree by half a pixel and nothing in the file said which was right.
             .ov-eb      the 8.5px footnote grade — captions, axis labels, strip legends
             .ov-eb-on   the same thing while a filter is on: tracked, capped, accent
             .ov-mi      the 9px micro-label (the mono sub-line under a name)
             .ov-nr      a 10px count or caption, usually at a row's trailing edge
             .ov-tx      a row's primary name
             .ov-tx-soft secondary prose beside it
             .ov-n       a pulse numeral
             .ov-quote   the serif italic aside
           Each role carries FACE, SIZE and INK and nothing else, exactly as .st-mi does. Tracking,
           caps, truncation, flex and margins stay at the call site, because those are facts about
           one row rather than about the type: the 8.5px grade runs sentence-case more often than
           capped, and its tracking is tuned per card down to .04em where a line has to fit a
           measured width (see the streak-line and strip-caption notes below). .ov-eb-on is the one
           exception — the filtered chip is always a capped .1em chip, so it owns both. */
        .ov-eb { font-family: var(--mono); font-size: 8.5px; color: var(--ink-faint); font-variant-numeric: tabular-nums; }
        .ov-eb-on { letter-spacing: .1em; text-transform: uppercase; color: var(--accent); }
        .ov-mi { font-family: var(--mono); font-size: 9px; color: var(--ink-faint); font-variant-numeric: tabular-nums; }
        .ov-nr { font-family: var(--mono); font-size: 10px; color: var(--ink-faint); font-variant-numeric: tabular-nums; }
        .ov-tx { font-family: var(--sans); font-size: 12px; font-weight: 500; color: var(--ink);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ov-tx-soft { font-family: var(--sans); font-size: 12.5px; color: var(--ink-soft); }
        /* the pulse numeral: .r-stat-n's own face, pinned to the one size this row uses. It
           replaces .ov-ins-fig, which wore it for the insight figures and lost its last element
           when SubjectStat went. The Stat tiles in the strip stay on .r-stat-n — they are the
           clamped ones, and .ov-stat-link's hover is bound to that class. */
        .ov-n { font-family: var(--serif); font-weight: 400; font-size: 20px; color: var(--ink);
          letter-spacing: -.02em; font-variant-numeric: tabular-nums; line-height: 1; }
        /* 12.5px/1.35, not the 13px/1.4 the review sketched: this is On this day's "Biggest:" line,
           and that card sets the pulse row's height — a 13px line grows it 1.3px and takes the
           whole row with it. The role is the file's own measurement. */
        .ov-quote { font-family: var(--serif); font-style: italic; font-size: 12.5px; line-height: 1.35;
          color: var(--ink-soft); }
        /* Kicker-only header (2026-08-20). .r-kicker carries a 12px bottom margin to stand off the
           title beneath it, and .r-viewhead adds pad*1.35 below the pair — with the title commented
           out, both were holding open space for something that is not there. Delete this rule at the
           same time as uncommenting the title; the two belong together. */
        /* The relocated pulse row: four cards side by side inside one grid cell. Stacks to two
           columns on mobile, where the parent grid is single-column anyway. */
        .ov-pulseslot { grid-column: 1 / -1; display: grid; gap: var(--gap);
          grid-template-columns: repeat(2, minmax(0, 1fr)); }
        @media (min-width: 981px) { .ov-pulseslot { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
        /* ── PC bento (≥981px, Fuad's redesign 2026-07-04): ONE pulse row — scrobbles ·
           streak · recently-played squeezed centrally · now-playing top-right. The recent
           list scrolls inside a capped well so the row stays shallow. Calendar rail lives
           in the map band's left column. ── */
        @media (min-width: 981px) {
          /* The pulse cards are no longer direct children of .m-stack — they sit inside
             .ov-pulseslot, which takes the row Story of the day used to (Fuad 2026-08-20). Their
             per-card column pins and grid-row:1 are commented out rather than deleted: restoring the
             old layout means putting these back and unwrapping the slot, as one change.
          .ov-scrob   { grid-column: 1 / span 3 !important; grid-row: 1; }
          .ov-streak  { grid-column: 4 / span 2 !important; grid-row: 1; }
          .ov-recent  { grid-column: 6 / span 3 !important; grid-row: 1; }
          .ov-np      { grid-column: 9 / -1 !important; grid-row: 1; }
          .m-stack:has(.ov-week) .ov-scrob  { grid-column: 1 / span 2 !important; }
          .m-stack:has(.ov-week) .ov-streak { grid-column: 3 / span 2 !important; }
          .m-stack:has(.ov-week) .ov-week   { grid-column: 5 / span 2 !important; grid-row: 1; }
          .m-stack:has(.ov-week) .ov-recent { grid-column: 7 / span 3 !important; }
          .m-stack:has(.ov-week) .ov-np     { grid-column: 10 / -1 !important; }
          */
          /* the slot takes Story's old eight columns; Decades keeps 9-12 beside it */
          .ov-pulseslot { grid-column: 1 / span 8 !important; }
          /* The 92px cap belonged to the OLD pulse row, where these shared a band with nothing
             taller and the cap kept it lean. They sit beside Decades now (Fuad 2026-08-20), and the
             cap was the only thing stopping them reaching that row's height — leaving their headers
             jammed against the content while the Decades card ran deeper. Stretching to the row
             instead, with each card a column that spreads its content, gives the headers air.
             .ov-np keeps the cap: it is commented out of the tree, and if it comes back it returns
             to a row it has to fit. */
          .ov-pulseslot > .r-card { height: 100%; overflow: hidden; }
          /* Third pass on this row (Fuad 2026-08-20). space-between put the slack in the MIDDLE;
             centring with auto margins moved it above and below but left the bottom edge tight
             against the content. What he pointed at is Decades, which does nothing clever: a plain
             12px pad all round and content stacked from the top, so the leftover height simply sits
             underneath and reads as padding. Same here — flow from the top with an even gap, and
             let the slack fall to the bottom where it looks deliberate. */
          .ov-pulseslot > .r-card { justify-content: flex-start; gap: 5px; }
          /* ONE ROW, FOUR IDENTICAL FRAMES (Fuad 2026-08-20: "the blocks need to align vertically,
             the widths are uneven"). Two of these four are InsightCards and two are bespoke pulse
             cards, and they disagreed on every measurement that shows: 8px vertical padding against
             12px, a 3px header margin against none, and three different number sizes. Nothing was
             uneven by much, which is exactly why it read as sloppy rather than as a decision — the
             labels sat on four different baselines and the numbers on four more. Forced to one set
             here rather than at each call site, so a fifth card dropped into this row inherits it. */
          .ov-pulseslot > .r-card { padding: 12px !important; }
          .ov-pulseslot > .r-card > .r-card-h { margin-bottom: 4px !important; }
          .ov-pulseslot .r-stat-n { font-size: 20px !important; }
          /* Insight figures sit ONE STEP DOWN from the two bespoke cards (Fuad 2026-08-20). Same
             face, same weight, same colour — 27px was simply too much next to a 12px name and a 9px
             footnote, where Scrobbles and Streak carry their number alone. Matching the row means
             matching the typeface, not the point size; the earlier attempt swapped the family
             instead and had to be reverted. */
          .ov-scrob .spark { max-height: 30px; }
          .ov-np { max-height: 92px; overflow: hidden; }
          .ov-strip    { grid-column: 1 / span 8 !important; grid-template-columns: repeat(5, 1fr) !important; gap: 10px !important; }
          .ov-strip .r-stat-n { font-size: 20px !important; }
          /* Decades takes cols 9-12, the same span the weather card uses on the row below
             (Fuad 2026-08-17). The .ov-story pin beside it went with the rest of that card's
             styles on 2026-09-19. */
          .ov-decades  { grid-column: 9 / -1 !important; }
          /* Insight cards left (8) + emotional weather right (9-12), one row. The .ov-insights
             wrapper card is gone, so .ov-insgrid takes the span directly. */
          .ov-insgrid  { grid-column: 1 / span 8 !important; }
          .ov-weather  { grid-column: 9 / -1 !important; }
          /* four cards across the eight columns → one rank. The grid IS four tracks now (see the
             inline style), so auto-placement does this and a span rule would only re-introduce the
             misalignment with the pulse row above. */
          .ov-insgrid > .r-card { grid-column: auto !important; }
          /* Cap the row (Fuad 2026-08-20). Grid rows size to their tallest item, so one long
             insight was setting the height for the weather card beside it and the whole band read
             taller than it needed to. Capping the cards themselves rather than the row keeps the
             weather card free to be short.
             A FLOOR, NOT A CEILING (2026-09-19). 104px was 13px short of what the Recent card
             needs for two rows, so it sliced the second entry through the middle of the glyphs —
             the cap was doing the equalising these four wanted AND clipping the one card that
             overran it. min-height equalises exactly the same (the cards stretch to the row
             anyway) and lets the tallest set the row instead of being cut to fit it. */
          .ov-insgrid > .r-card, .ov-weather { min-height: 104px; }
        }
        /* Selects sit on the title row now, so they lose the full-width block sizing and come down
           to the d/w/m segment height beside them: 9px type on 2px/6px padding measures ~21px
           against .r-seg-sm's ~25px, close enough to read as one row of controls. */
        .ov-calsel { width: auto; flex: 0 0 auto; background: var(--bg-3); border: 1px solid var(--rule);
          color: var(--ink); border-radius: 6px; padding: 2px 6px; font-family: var(--mono); font-size: 9px;
          line-height: 1.5; cursor: pointer; }
        .ov-calsel:hover { border-color: var(--accent-dim); }
        /* .r-card-h aligns its children on the baseline, which a select does not usefully share. */
        .ov-calhead { align-items: center; gap: 6px; flex-wrap: wrap; }
        .ov-caltitle { background: transparent; border: 0; padding: 0; cursor: pointer; }
        .ov-caltitle:hover, .ov-caltitle:focus-visible { color: var(--accent); }
        .ov-caltitle:hover b, .ov-caltitle:focus-visible b { color: var(--accent); }
        .ov-calrail i { transition: transform .1s; display: block; }
        /* The old hover rule below never fired: it required a [data-gran="day"] ancestor that the
           day strip does not have, so the calendar had no hover at all (Fuad 2026-08-20). Replaced
           by .ov-daystrip. Note the choice of properties — the cells set outline INLINE for the
           selected state, so a CSS outline on hover would lose to it; box-shadow and filter are
           free. No backticks anywhere in this block.
        .ov-calrail [data-gran="day"] i:hover { transform: scale(1.45); outline: 1px solid var(--accent); }
        */
        .ov-daystrip i { transition: filter .12s ease-out, box-shadow .12s ease-out, transform .12s ease-out; }
        .ov-daystrip i:hover { filter: brightness(1.4); box-shadow: 0 0 0 1px var(--accent-dim);
          transform: scaleY(1.14); z-index: 1; position: relative; }
        /* The hub-* chip/card vocabulary, .pt-link and .ov-calweek were DELETED here on
           2026-09-19. Thirteen hub classes, two portrait-link classes and a calendar-week hover
           rule, none of them named by any element this file (or any other) renders — leftovers of
           a hub layout the Overview stopped being. Nothing to restore: there is no markup for
           them anywhere in the tree. */
        /* The .ov-story* rules went on 2026-09-19. The Story-of-the-day banner they dressed has
           been commented out of the tree since 2026-08-20 and the pulse modules hold its row; the
           styles were carrying a card that is not there. If the banner ever comes back it needs
           its own look at the width it lands on, not this one. */
        /* portrait + dig — twin compact fact modules, side-by-side on PC, stacked on mobile */
        .ov-pd { display: grid; grid-template-columns: 1fr 1fr; gap: var(--gap); }
        @media (max-width: 760px) { .ov-pd { grid-template-columns: 1fr; } }
        /* Fuad 2026-08-24: eyebrow collapse, two sizes only. The module title snaps to the
           canonical 10px title-eyebrow; its footer link is an annotation, so it drops to 8.5px. */
        .ov-pd-lbl { font-size: 10px; letter-spacing: .16em; text-transform: uppercase; color: var(--ink-faint); margin-bottom: 9px; }
        .ov-pd-foot { font-size: 8.5px; letter-spacing: .1em; color: var(--ink-faint); margin-top: 9px; cursor: pointer; }
        .ov-pd-foot:hover { color: var(--accent); }
        /* The .ov-fact* block (bulleted lab2 fact list: dot lead-in, one-line headline, click to
           expand the sentence + derivation) was DELETED here on 2026-09-19 with OvFacts and its
           two callers. Both .ov-pd modules name artists now; their rows are below. */
        /* ONE ROW RHYTHM FOR BOTH .ov-pd MODULES. These sit at half the page, so the row can carry
           a real name size and a trailing figure without the ellipsis fight the pulse-row rows
           have — but it stays the same shape as those rows (hover from .ov-hovrow, name over a
           mono sub-line) so the page reads as one family top to bottom. The negative margin lets
           the hover wash reach past the card's text column, as the fact list's did. */
        .ov-pd-rows { display: grid; gap: 2px; }
        .ov-pd-row { display: flex; align-items: center; gap: 10px; min-width: 0;
          padding: 4px 6px; margin: 0 -6px; border-radius: 5px; }
        .ov-pd-name { font-size: 12.5px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        /* sub-line + trailing figure are footnote-grade (Fuad 2026-08-24: eyebrow collapse, two sizes only) */
        .ov-pd-sub { font-size: 9px; color: var(--ink-faint); line-height: 1.5;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ov-pd-fig { font-size: 9.5px; color: var(--ink-faint); flex: none; white-space: nowrap; }
        .ov-pd-via { color: var(--accent); font-weight: 600; cursor: pointer; }
        .ov-pd-via:hover { text-decoration: underline; }
        .ov-stat-link:hover .r-stat-n { color: var(--accent); } .ov-stat-link:hover { color: var(--accent); }
        /* HOVER TRANSITIONS FOR THE OVERVIEW (2026-09-19), the same audit rotation-views3.jsx ran
           over the Stories feed on 2026-09-14. Five things here change background, border or
           colour on hover and declared no transition, so each one snapped while the feed eased.
           .ov-hovrow is new: the Recently-played, On repeat, Movement and Riser rows were each
           setting currentTarget.style.background in JS on enter and clearing it on leave — four
           hand-rolled copies of one rule, and an inline style swap is exactly the thing a CSS
           transition cannot smooth, since it is the transition that has to be declared first. */
        /* Round two of the same sweep (wave 3). Two more colour swaps were snapping:
           · .ov-stat-link declared the easing on ITSELF, so the caption faded and the numeral
             inside it — a different element, and the one you are actually looking at — jumped.
             The stat tile's number is named here so both halves move together.
           · The last.fm link in the Last-72-hours header wears .r-extlink-lf without .r-extlink, and
             the .15s lives on .r-extlink; the red-on-hover had nothing to ease. Scoped to the
             card so the pill-shaped .r-extlink uses elsewhere keep their own timing.
           Not folded in: .ov-pd-via's hover, which only adds an underline — there is nothing
           there to interpolate. */
        .ov-hovrow, .ov-wback, .ov-calsel, .ov-caltitle, .ov-pd-foot,
        .ov-stat-link, .ov-stat-link .r-stat-n, .ov-last72 .r-extlink-lf {
          transition: background .16s ease, border-color .16s ease, color .16s ease;
        }
        @media (prefers-reduced-motion: reduce) {
          .ov-hovrow, .ov-wback, .ov-calsel, .ov-caltitle, .ov-pd-foot,
          .ov-stat-link, .ov-stat-link .r-stat-n, .ov-last72 .r-extlink-lf { transition: none; }
        }
        .ov-hovrow:hover { background: var(--bg-3); }
        /* year tiles (SINCE / PEAK YEAR): the string branch of Stat cross-fades on value change —
           see the comment at the render site. Animation, not transition: the span REMOUNTS via its
           key, so there is no old state to transition from. */
        @keyframes ov-yr-in { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: none; } }
        .ov-yrswap { display: inline-block; animation: ov-yr-in .28s ease; }
        @media (prefers-reduced-motion: reduce) { .ov-yrswap { animation: none; } }
        /* .ov-ins-fig lived here from 2026-09-19 until later the same day: it gave the pulse row's
           insight figures the serif face, and its only element was SubjectStat, which went when its
           last caller did. The face it carried is .ov-n, at the top of this block. */
        /* STREAK'S 60-DAY RUN (2026-09-19). Sixty bars and fifty-nine 1px gaps inside a ~161px
           card column leaves each bar under 2px, which is the point: this is a texture, not a
           chart — you read the density and the gaps, not any one day. flex-basis 0 with a 0 min
           keeps all sixty inside the card; without the min they would each claim their content
           box and the run would push past the card's padding. */
        .ov-daybar { display: flex; gap: 1px; margin: 5px 0 4px; width: 100%; }
        .ov-daybar i { flex: 1 1 0; min-width: 0; height: 9px; border-radius: 1px; display: block; }
        /* STRIP CAPTIONS (2026-09-19). A 1fr track in this strip is ~57px — nine characters at
           the old .14em — and three captions were over it, so they broke mid-phrase and dropped
           that tile's caption a line below its neighbours'. Letter-spacing came down to .06em,
           which is what pays for the EP count now folded into the album tile, and each caption
           holds its segments unbreakable: a caption that still runs long drops a whole phrase.
           The whole strip is measured against the NARROWEST case — the 366px the map band's
           middle column gives it at 1280px — because that is where it breaks first. */
        .ov-stat-sub { letter-spacing: .06em; text-transform: uppercase; }
        .ov-stat-sub > span { white-space: nowrap; }
        /* .ov-stat-lt held the "· lifetime" marker from 2026-09-19 to 2026-09-21. The marker is
           gone — the two tiles it annotated follow the filter now — so the rule went with it. */
        /* .ov-stat-fit (2026-09-21): the plays/artist caption is the one place the CAPTION shrinks
           instead of the words being cut — "plays / artist" was amputated to "per artist" on
           2026-09-19 for exactly the reason above (~57px track, .06em spacing → ~10 characters).
           Full phrase is 14 characters incl. the slash; JetBrains Mono's advance is ~0.6em, so at
           this rule's 6.5px / 0 letter-spacing that's 14 × 6.5 × 0.6 ≈ 54.6px — under the ~57px
           track with a few px to spare, still comfortably inside the narrowest (366px/5-col) case
           the rest of this comment block is measured against. Nowrap already comes from the parent
           rule above (this is a direct .ov-stat-sub > span child — NO backticks in this
           comment: the whole style block is one template literal, and a nested backtick
           closes it early, turning the text between into live JS that parses but crashes
           the view at runtime; check-jsx cannot catch it). */
        .ov-stat-fit { font-size: 6.5px; letter-spacing: 0; }
        /* .eqbar and its @keyframes went on 2026-09-19 — the five animated bars belonged to the
           Now-playing card, commented out of the tree since 2026-08-20, and an infinite animation
           on elements nothing renders is pure weight. */
        /* bare fr tracks have an implicit auto min, so a long insight can push a card past its track
           and overflow. Pin the tracks to a 0 min and let the cards stack once there isn't room
           (Fuad 2026-07-16). Four tracks, matching .ov-pulseslot — see the inline style. */
        .ov-insgrid { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
        .ov-insgrid > .r-card { min-width: 0; }
        @media (max-width: 760px) {
          .ov-insgrid > .r-card { grid-column: 1 / -1 !important; }
          /* STAT STRIP shrinks on a phone (Fuad 2026-08-21: "too large"). The 27px inline size was
             set for a five-across desktop strip; at two-across on a phone the numbers dominate the
             card and crowd their own captions. Only the strip is touched — the pulse row's figures
             are the point of their cards and keep their size. */
          .ov-strip .r-stat-n { font-size: 20px !important; }
          .ov-strip { gap: 8px 12px !important; }
          /* the milestone bar and its target stay on one line; wrapping put "→ 325,000" under the
             bar and off its baseline, which is the misalignment Fuad saw. The row moved into the
             Scrobbles card on 2026-09-19 and kept the class — the rule is still what it needs. */
          /* the fade that keeps a long song title from shoving the play count off-screen */
          .ov-rep-txt > div {
            -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 14px), transparent 100%);
                    mask-image: linear-gradient(to right, #000 calc(100% - 14px), transparent 100%);
          }
        }
        /* Only span the 12-col overview grid while it IS 12 columns (861–980px). At ≤860 the
           .m-stack utility collapses to a single minmax(0,1fr) track and forces children to
           grid-column:auto; a lingering span-12 here (higher specificity than .m-stack > *) would
           re-create 12 implicit tracks and strand auto items — the map band — in a ~58%-wide
           track (Fuad 2026-07-18). */
        @media (min-width: 861px) and (max-width: 980px) {
          .r-view .r-card { grid-column: span 12 !important; }
        }
      `}</style>
    </div>
  );
}

Object.assign(window, { Popover, OverviewView });
