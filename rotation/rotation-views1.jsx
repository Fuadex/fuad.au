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
function OvCalRail({ go, onYear, onPeriod }) {
  const [selDay, setSelDay] = React.useState(null);
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
  const [yr, setYr] = React.useState(now.getUTCFullYear());
  const [mo, setMo] = React.useState(now.getUTCMonth());   // 0-11
  const [gran, setGran] = React.useState("day");           // day | week
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
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
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
function OvMapBand({ go, extYear, calPeriod, onStats, calRail, statSlot }) {
  const [ref, seen] = useInView();
  const [on, setOn] = React.useState(false);
  React.useEffect(() => { if (seen) setOn(true); }, [seen]);
  return (
    <div ref={ref} style={{ minHeight: on ? 0 : 220 }}>
      {on ? <MapView go={go} embedded extYear={extYear} calPeriod={calPeriod} onStats={onStats} calSlot={calRail} statSlot={statSlot} />
        : <div className="r-card" style={{ padding: 40, textAlign: "center", color: "var(--ink-faint)", fontFamily: "var(--mono)", fontSize: 11 }}>the world map loads as you scroll…</div>}
    </div>
  );
}

function OverviewView({ t, go }) {
  const R = window.ROTATION;
  const T = R.TOTALS;
  const [ref, seen] = useInView();
  // map/calendar filter state lives here so the calendar (pulse row) and the map band (below)
  // stay in sync — the calendar is its cross-filter even though they're no longer adjacent.
  const [mapYear, setMapYear] = React.useState(null);
  const [mapPeriod, setMapPeriod] = React.useState(null);
  const [fStats, setFStats] = React.useState(null);   // filtered totals reported by the map band
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
    const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const when = (uts) => { if (!uts) return ""; const d = new Date(uts * 1000); return d.getUTCDate() + " " + MON[d.getUTCMonth()]; };
    const hueOf = (id) => { const e = R.byId[id] || (R.expById && R.expById[id]); return e && e.hue != null ? e.hue : 210; };
    return LV.recent.map((r, i) => ({ id: "lv" + i, artistId: r.artistId, artist: r.artist, track: r.track, when: when(r.uts), hue: hueOf(r.artistId) }));
  }, [R]);
  // just the last 3 played (the 6/12/18 selector was too tight for the row — Fuad 2026-07-06)
  const recent3 = React.useMemo(() => recent.slice(0, 3), [recent]);

  // 26-week scrobble trend (real if the build provides it)
  const trend = React.useMemo(() => R.TREND || Array.from({ length: 26 }, (_, i) =>
    180 + Math.round(Math.sin(i / 3) * 60 + (hashInt("wk" + i, 5) % 90) + i * 3)), []);
  const sinceYears = ((Date.now() - new Date(T.since)) / 3.156e10).toFixed(1);

  const Stat = ({ n, sub, big, onClick }) => (
    <div onClick={onClick} style={onClick ? { cursor: "pointer" } : null} className={onClick ? "ov-stat-link" : ""}>
      <div className="r-stat-n" style={{ fontSize: big ? "clamp(30px,4vw,46px)" : 30 }}>{n}</div>
      <div className="r-mono" style={{ fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase",
        color: "var(--ink-faint)", marginTop: 7 }}>{sub}{onClick ? " ↗" : ""}</div>
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
      <div className="m-stack" style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "var(--gap)" }}>
        {/* now playing — top-right corner of the pulse row (DOM-first so mobile still leads
            with it; the ≥981px block pins it to cols 9-12) */}
        <div className="r-card ov-np" style={{ gridColumn: "span 4", padding: 14, display: "flex", gap: 14, alignItems: "center", minWidth: 0 }}>
          <div style={{ position: "relative", cursor: npKnown ? "pointer" : "default" }} onClick={() => npKnown && go("artist", now.artistId)}>
            <GenCover hue={nowArtist.hue} name={now.artist} size={92} radius={4} />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", justifyContent: "center",
              gap: 3, padding: "0 0 9px" }}>
              {[0, 1, 2, 3, 4].map(i => <span key={i} className="eqbar" style={{ animationDelay: i * 0.13 + "s" }} />)}
            </div>
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="r-live" style={{ marginBottom: 7 }}><span className="dot" /> {now.nowplaying ? "Now playing" : "Last played"}</div>
            <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 19, lineHeight: 1.05 }}>{now.track}</div>
            <div style={{ color: "var(--ink-soft)", fontSize: 13, marginTop: 4 }}>
              {npKnown ? <b onClick={() => go("artist", now.artistId)} style={{ cursor: "pointer", color: "var(--ink)", fontWeight: 600 }}>{now.artist}</b> : now.artist} — <span style={{ color: "var(--ink-faint)" }}>{now.album}</span></div>
            <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
              {nowArtist.tags.slice(0, 3).map(g => <span key={g} className="r-chip link" title={`Explore ${g} →`} onClick={() => go("explore", g)}>{g}</span>)}
            </div>
          </div>
        </div>

        {/* scrobble counter + trend — left anchor of the pulse row */}
        <div className="r-card ov-scrob" style={{ gridColumn: "span 3", padding: 14, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div className="r-card-h" style={{ padding: 0 }}><span className="lbl"><b>Scrobbles</b></span>
            <span className="meta">26-wk</span></div>
          <div className="r-stat-n" style={{ fontSize: "clamp(30px,4vw,44px)", margin: "4px 0 2px" }}>{fmt(Math.round(scrob))}</div>
          <div style={{ marginTop: 6 }}>
            <Spark data={trend} w={300} h={34} run={seen} fill="var(--accent-bg)" />
          </div>
        </div>

        {/* streak — current run + when the all-time best happened (INSIGHTS.STREAK carries the range) */}
        <div className="r-card ov-streak" style={{ gridColumn: "span 2", padding: 14, display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div className="r-card-h" style={{ padding: 0 }}><span className="lbl"><b>Streak</b></span>
            {T.streak.current >= T.streak.best ? <span className="meta" style={{ color: "var(--accent)" }}>record!</span> : null}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginTop: 2 }}>
            <div className="r-stat-n" style={{ fontSize: 34 }}>{T.streak.current}</div>
            <span className="r-mono" style={{ fontSize: 10, color: "var(--ink-soft)" }}>days</span>
          </div>
          {(() => {
            const S = R.INSIGHTS && R.INSIGHTS.STREAK;
            const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
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
            <div className="r-card ov-week" style={{ gridColumn: "span 3", padding: 14, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div className="r-card-h" style={{ padding: 0 }}><span className="lbl"><b>This week</b></span>
                <span className="meta" style={{ color: up ? "var(--accent)" : "var(--ink-faint)" }}>{up ? "▲" : "▼"} {Math.abs(delta)}%</span></div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginTop: 2 }}>
                <div className="r-stat-n" style={{ fontSize: 34 }}>{fmt(w.plays7)}</div>
                <span className="r-mono" style={{ fontSize: 10, color: "var(--ink-soft)" }}>plays</span>
              </div>
              {ta ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", minWidth: 0 }} onClick={() => go("artist", ta.artistId)}>
                  <GenCover hue={(R.byId[ta.artistId] || (R.expById && R.expById[ta.artistId]) || { hue: 210 }).hue} name={ta.name} size={26} radius={2} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ta.name}</div>
                    <div className="r-mono" style={{ fontSize: 8.5, color: "var(--ink-faint)" }}>#1 · {ta.plays} plays</div>
                  </div>
                </div>
              ) : <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)" }}>vs your weekly average</div>}
              {w.newArtistsThisWeek > 0
                ? <div className="r-mono" style={{ fontSize: 8.5, color: "var(--ink-faint)", letterSpacing: ".06em", textTransform: "uppercase", marginTop: 6 }}>{w.newArtistsThisWeek} new artist{w.newArtistsThisWeek !== 1 ? "s" : ""} this week</div>
                : <div className="r-mono" style={{ fontSize: 8.5, color: "var(--ink-faint)", marginTop: 6 }}>no new artists yet</div>}
            </div>
          );
        })()}

        {/* recent ticker — squeezed centrally between streak and now-playing; the list is a
            capped scroll well at PC widths so the pulse row stays shallow */}
        <div className="r-card ov-recent" style={{ gridColumn: "span 3", padding: 11, display: "flex", flexDirection: "column" }}>
          <div className="r-card-h" style={{ padding: 0, marginBottom: 7 }}><span className="lbl"><b>Recently played</b></span>
            <a className="meta r-extlink-lf" href="https://www.last.fm/user/fuadex" target="_blank" rel="noopener noreferrer"
              style={{ color: "var(--ink-faint)", textDecoration: "none" }}>last.fm/fuadex ↗</a></div>
          <div className="ov-rl" style={{ display: "grid", gap: 2, flex: 1, alignContent: "center" }}>
            {recent3.map(r => (
              <div key={r.id} onClick={() => go("track", R.slug(r.artist) + "~" + R.slug(r.track))} title={`${r.track} →`} style={{ display: "flex", alignItems: "center", gap: 10,
                padding: "4px 6px", borderRadius: 4, cursor: "pointer", minWidth: 0 }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--bg-3)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <GenCover hue={r.hue} name={r.artist} size={26} radius={2} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.track}</div>
                  <div style={{ fontSize: 10.5, color: "var(--ink-faint)", cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={`${r.artist} →`}
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
          <OvMapBand go={go} extYear={mapYear} calPeriod={mapPeriod} onStats={setFStats}
            calRail={<OvCalRail go={go} onYear={setMapYear} onPeriod={setMapPeriod} />}
            statSlot={
              /* lifetime stats, now nested under the flowmap (Fuad 2026-07-06); hours + distinct
                 artists react to the active map/calendar filter, the rest are lifetime. */
              <div className="r-card ov-strip" style={{ padding: 16, display: "grid",
                gridTemplateColumns: "repeat(2,1fr)", gap: "14px 16px", alignContent: "center" }}>
                <Stat n={fStats && fStats.active ? fmt(fStats.hours) : fmt(Math.round(hrs))} sub={fStats && fStats.active ? "hrs · " + fStats.label : "hours listened"} onClick={() => go("calendar")} />
                <Stat n={fStats && fStats.active ? fmt(fStats.artists) : fmt(T.artists)} sub={fStats && fStats.active ? "artists · filtered" : "distinct artists"} onClick={() => go("explore")} />
                <Stat n={T.perDay} sub="avg / day" />
                <Stat n={sinceYears + " yr"} sub="of history" />
                <Stat n={R.TOTALS.topDay.count} sub={"heaviest · " + R.TOTALS.topDay.date.slice(2)} onClick={() => go("calendar")} />
              </div>
            } />
        </div>

        {/* Right now — the live insight feed, promoted directly under the map (Fuad 2026-07-06),
            paired with emotional weather on its row (was full-width lower down). */}
        <div className="r-card ov-insights" style={{ gridColumn: "span 8", padding: 18 }}>
          <div className="r-card-h" style={{ padding: 0, marginBottom: 14 }}><span className="lbl"><b>Right now</b></span>
            <span className="meta">what's moving</span></div>
          <div className="ov-insgrid" style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "var(--gap)" }}>
            <InsightRow go={go} n={4} />
          </div>
        </div>

        {/* emotional weather now — last 90 days' sounds/reads vs the library baseline */}
        {(() => {
          const M = R.INSIGHTS && R.INSIGHTS.MOOD, N = M && M.now;
          if (!N) return null;
          const d = (v, avg) => v - avg;
          const word = (dv) => dv >= 4 ? "brighter" : dv <= -4 ? "darker" : "steady";
          const Bar = ({ label, v, avg, col }) => (
            <div style={{ display: "grid", gridTemplateColumns: "52px 1fr 26px", gap: 9, alignItems: "center" }}>
              <span className="r-mono" style={{ fontSize: 9, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ink-soft)" }}>{label}</span>
              <div style={{ position: "relative", height: 7, background: "var(--bg-3)", borderRadius: 4 }}>
                <div style={{ position: "absolute", inset: "0 auto 0 0", width: v + "%", background: col, borderRadius: 4 }} />
                <div title={"library average " + avg} style={{ position: "absolute", top: -2, bottom: -2, left: avg + "%", width: 2, background: "var(--ink-faint)", borderRadius: 1 }} />
              </div>
              <span className="r-mono" style={{ fontSize: 10, color: "var(--ink-faint)", textAlign: "right" }}>{v}</span>
            </div>
          );
          return (
            <div className="r-card ov-weather" style={{ gridColumn: "span 4", padding: 18, cursor: "pointer" }} onClick={() => go("stories", "emotional-weather")}>
              <div className="r-card-h" style={{ padding: 0, marginBottom: 10 }}><span className="lbl"><b>Emotional weather</b></span>
                <span className="meta">last {N.days} days ↗</span></div>
              <div style={{ display: "grid", gap: 8 }}>
                <Bar label="Sounds" v={N.aud} avg={M.avgAud} col="oklch(0.72 0.15 145)" />
                <Bar label="Reads" v={N.lyr} avg={M.avgLyr} col="oklch(0.68 0.16 25)" />
              </div>
              <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 13, color: "var(--ink-soft)", marginTop: 10 }}>
                {word(d(N.aud, M.avgAud)) === "steady" && word(d(N.lyr, M.avgLyr)) === "steady"
                  ? <>Right on your baseline{N.emo ? <> — reading <b style={{ color: "var(--ink)" }}>{N.emo}</b></> : null}.</>
                  : <>Sounding {word(d(N.aud, M.avgAud))}, reading {word(d(N.lyr, M.avgLyr))}{N.emo ? <> — mostly <b style={{ color: "var(--ink)" }}>{N.emo}</b></> : null}.</>}
              </div>
            </div>
          );
        })()}

      </div>

      {/* hub — teasers into every deeper view */}
      {(() => {
        const I = R.INSIGHTS, U = I.UNDERGROUND, G = I.GEOGRAPHY, GF = R.GENRE_FLOW;
        const cards = [];
        cards.push({ k: "Explore", h: `${fmt(R.EXPLORE.length)} artists`, s: `${R.SUBS.length} subgenres · filter any slice`, hue: 255, on: () => go("explore") });
        if (GF) cards.push({ k: "The journey", h: `${GF.years.length} years of drift`, s: "watch genres hand off over time", hue: 330, on: () => go("journey") });
        if (U) cards.push({ k: "How deep it goes", h: `${Math.round(U.artistShare50k * 100)}% under 50k`, s: "the depth is in the breadth", hue: 188, on: () => go("stories") });
        if (I.RECOMMENDATIONS && I.RECOMMENDATIONS.artists[0]) { const r = I.RECOMMENDATIONS.artists[0]; cards.push({ k: "Blind spots", h: r.name, s: `you'd love them — via ${r.via.map(v => v.name).join(", ")}`, hue: r.hue, on: () => go("stories") }); }
        if (I.REVISIT && I.REVISIT.artists[0]) { const r = I.REVISIT.artists[0]; cards.push({ k: "Gathering dust", h: r.name, s: `${r.monthsSince} months since you played them`, hue: r.hue, on: () => go("stories") }); }
        if (G && G.countries[0]) cards.push({ k: "Taste geography", h: `${G.countries[0].flag || ""} ${G.countries[0].name}`, s: `${G.totalCountries} countries deep`, hue: 140, on: () => go("stories") });
        if (I.ADOPTION) cards.push({ k: "How old the music was", h: `${I.ADOPTION.medianLag}yr median`, s: "you dig back-catalogue, not new releases", hue: 28, on: () => go("stories") });
        return (
          <div style={{ marginTop: "calc(var(--gap)*1.4)" }}>
            <div className="r-mono hub-lbl">Where to dig</div>
            <div className="hub-chips">
              {cards.map((c, i) => (
                <button key={i} className="hub-chip" onClick={c.on} style={{ "--c": `oklch(0.7 0.16 ${c.hue})` }} title={c.s}>
                  <span className="hub-chip-k">{c.k}</span>
                  <span className="hub-chip-h">{c.h}</span>
                  <span className="hub-arrow">→</span>
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* portrait — a generated verdict; sits at the end, after you've seen the numbers */}
      {(() => {
        const U = R.INSIGHTS.UNDERGROUND, A = R.INSIGHTS.ADOPTION, G = R.INSIGHTS.GEOGRAPHY, GF = R.GENRE_FLOW;
        const grid = R.CLOCK.grid, hourTot = Array.from({ length: 24 }, (_, h) => grid.reduce((s, r) => s + r[h], 0));
        const tot = hourTot.reduce((a, b) => a + b, 0) || 1, night = Math.round(hourTot.slice(0, 5).reduce((a, b) => a + b, 0) / tot * 100);
        const em = (txt, hue) => <b style={{ color: hue != null ? `oklch(0.8 0.13 ${hue})` : "var(--ink)" }}>{txt}</b>;
        const link = (txt, dest, hue) => <b className="pt-link" onClick={() => go(dest)} style={{ color: hue != null ? `oklch(0.8 0.13 ${hue})` : "var(--accent)" }}>{txt}</b>;
        let thenG, nowG;
        if (GF && GF.years.length) { const domOf = (y) => { let bi = 0; y.fams.forEach((v, i) => { if (v > y.fams[bi]) bi = i; }); return GF.families[bi]; }; thenG = domOf(GF.years[0]); nowG = domOf(GF.years[GF.years.length - 1]); }
        const peakDec = A && A.decades.length ? A.decades.slice().sort((a, b) => b.share - a.share)[0] : null;
        return (
          <div className="r-card" style={{ padding: "22px 26px", marginTop: "calc(var(--gap)*1.6)" }}>
            <div className="r-mono" style={{ fontSize: 9.5, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: 12 }}>Your portrait</div>
            <p style={{ fontFamily: "var(--serif)", fontSize: "clamp(16px,1.9vw,21px)", lineHeight: 1.62, color: "var(--ink-soft)", margin: 0 }}>
              {night >= 18 && <>A {em(night + "%")}-before-5AM night owl with {em("genuinely underground")} taste — </>}
              {U && <>{link(Math.round(U.artistShare50k * 100) + "%", "stories")} of the artists you play sit under 50k listeners worldwide, the median just {em(fmt(U.medianArtistListeners))}. </>}
              {A && <>You don't chase new releases, you {link("dig", "stories")}: the typical artist was {em(A.medianLag + " years")} past their debut when you found them{peakDec ? <>, most of it made in the {em(peakDec.decade + "s")}</> : null}. </>}
              {G && G.countries[0] && <>Rooted in {link(G.countries[0].name, "stories")} but reaching across {em(G.totalCountries + " countries")}. </>}
              {thenG && nowG && thenG.family !== nowG.family && <>And the taste {link("migrated", "journey")} — from {link(thenG.family, "journey", thenG.hue)} to {link(nowG.family, "journey", nowG.hue)} across {GF.years.length} years.</>}
            </p>
            <div className="r-mono" style={{ fontSize: 10, color: "var(--ink-faint)", marginTop: 14, cursor: "pointer" }} onClick={() => go("journey")}>see the journey ↗</div>
          </div>
        );
      })()}

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
          .ov-scrob .r-stat-n { font-size: clamp(20px, 1.9vw, 27px) !important; }
          .ov-streak .r-stat-n, .ov-week .r-stat-n { font-size: 27px !important; }
          .ov-week .spark, .ov-scrob .spark { max-height: 30px; }
          /* row 3 = map band (1/-1 inline); row 4 — the four stats (left, they react to the
             map/calendar filter) + heaviest day (right) */
          .ov-strip    { grid-column: 1 / span 8 !important; grid-template-columns: repeat(5, 1fr) !important; gap: 14px !important; }
          .ov-weather  { grid-column: 9 / -1 !important; }
          .ov-strip .r-stat-n { font-size: 24px !important; }
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
        .hub-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px,1fr)); gap: var(--gap); }
        .hub-card { padding: 16px 18px; cursor: pointer; transition: transform .15s, box-shadow .15s; }
        .hub-card:hover { transform: translateY(-3px); box-shadow: 0 16px 34px -16px rgba(0,0,0,.6); }
        .hub-card:hover .hub-go { color: var(--accent); }
        .hub-k { font-size: 9px; letter-spacing: .14em; text-transform: uppercase; color: var(--ink-faint); }
        .hub-h { font-family: var(--serif); font-style: italic; font-size: 21px; margin: 10px 0 4px; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .hub-s { font-size: 12px; color: var(--ink-soft); line-height: 1.35; }
        .hub-go { font-family: var(--mono); font-size: 9px; letter-spacing: .1em; color: var(--ink-faint); margin-top: 12px; transition: color .15s; }
        .ov-stat-link { transition: color .15s; } .ov-stat-link:hover .r-stat-n { color: var(--accent); } .ov-stat-link:hover { color: var(--accent); }
        .eqbar { width: 4px; height: 10px; background: var(--accent); border-radius: 2px;
          animation: eq .9s ease-in-out infinite alternate; box-shadow: 0 0 6px var(--accent-bg); }
        @keyframes eq { from { height: 6px; } to { height: 26px; } }
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
              onMouseEnter={(e) => setPop({ x: p.x / W * window.innerWidth, y: 260, title: p.label, pip: p.hue,
                meta: "plays", rows: [["plays", fmt(p.value)], ["·", p.sub]], hint: "click to open ↗" })}
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
