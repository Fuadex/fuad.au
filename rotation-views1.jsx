// rotation-views1.jsx — Overview · Charts · Clock
// exports: OverviewView, ChartsView, ClockView, Popover (shared)

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
function OverviewView({ t, go }) {
  const R = window.ROTATION;
  const T = R.TOTALS;
  const [ref, seen] = useInView();
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
  const [recentN, setRecentN] = React.useState(6);

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
        {/* now playing */}
        <div className="r-card" style={{ gridColumn: "span 5", padding: 18, display: "flex", gap: 16, alignItems: "center", minWidth: 0 }}>
          <div style={{ position: "relative", cursor: npKnown ? "pointer" : "default" }} onClick={() => npKnown && go("artist", now.artistId)}>
            <GenCover hue={nowArtist.hue} name={now.artist} size={104} radius={4} />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", justifyContent: "center",
              gap: 3, padding: "0 0 9px" }}>
              {[0, 1, 2, 3, 4].map(i => <span key={i} className="eqbar" style={{ animationDelay: i * 0.13 + "s" }} />)}
            </div>
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="r-live" style={{ marginBottom: 9 }}><span className="dot" /> {now.nowplaying ? "Now playing" : "Last played"}</div>
            <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 22, lineHeight: 1.05 }}>{now.track}</div>
            <div style={{ color: "var(--ink-soft)", fontSize: 13, marginTop: 4 }}>
              {npKnown ? <b onClick={() => go("artist", now.artistId)} style={{ cursor: "pointer", color: "var(--ink)", fontWeight: 600 }}>{now.artist}</b> : now.artist} — <span style={{ color: "var(--ink-faint)" }}>{now.album}</span></div>
            <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
              {nowArtist.tags.slice(0, 3).map(g => <span key={g} className="r-chip link" title={`Explore ${g} →`} onClick={() => go("explore", g)}>{g}</span>)}
            </div>
          </div>
        </div>

        {/* scrobble counter + trend */}
        <div className="r-card" style={{ gridColumn: "span 4", padding: 18, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div className="r-card-h" style={{ padding: 0 }}><span className="lbl"><b>Scrobbles</b></span>
            <span className="meta">26-wk trend</span></div>
          <div className="r-stat-n" style={{ fontSize: "clamp(34px,4.6vw,52px)", margin: "6px 0 2px" }}>{fmt(Math.round(scrob))}</div>
          <div style={{ marginTop: 10 }}>
            <Spark data={trend} w={300} h={46} run={seen} fill="var(--accent-bg)" />
          </div>
        </div>

        {/* streak ring */}
        <div className="r-card" style={{ gridColumn: "span 3", padding: 18, display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div className="r-card-h" style={{ padding: 0 }}><span className="lbl"><b>Streak</b></span></div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
            <div className="r-stat-n" style={{ fontSize: 46 }}>{T.streak.current}</div>
            <span className="r-mono" style={{ fontSize: 11, color: "var(--ink-soft)" }}>days</span>
          </div>
          <div className="r-mono" style={{ fontSize: 10, color: "var(--ink-faint)", letterSpacing: ".1em" }}>
            best <span style={{ color: "var(--accent)" }}>{T.streak.best}</span> · every day this month
          </div>
        </div>

        {/* stat strip */}
        <div className="r-card m-2col" style={{ gridColumn: "span 8", padding: 20, display: "grid",
          gridTemplateColumns: "repeat(4,1fr)", gap: 18, alignItems: "center" }}>
          <Stat n={fmt(Math.round(hrs))} sub="hours listened" onClick={() => go("calendar")} />
          <Stat n={fmt(T.artists)} sub="distinct artists" onClick={() => go("explore")} />
          <Stat n={T.perDay} sub="avg / day" />
          <Stat n={sinceYears + " yr"} sub="of history" />
        </div>

        {/* peak day */}
        <div className="r-card ov-stat-link" style={{ gridColumn: "span 4", padding: 18, cursor: "pointer" }} onClick={() => go("calendar")}>
          <div className="r-card-h" style={{ padding: 0 }}><span className="lbl"><b>Heaviest day</b></span>
            <span className="meta">{R.TOTALS.topDay.date} ↗</span></div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "10px 0 6px" }}>
            <div className="r-stat-n" style={{ fontSize: 40 }}>{R.TOTALS.topDay.count}</div>
            <span className="r-mono" style={{ fontSize: 11, color: "var(--ink-soft)" }}>plays</span>
          </div>
          <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.4 }}>
            “{R.TOTALS.topDay.note}”</div>
        </div>

        {/* dynamic insight feed — week/month/mood/year/clock + milestones, ranked + rotating */}
        <InsightRow go={go} n={6} />

        {/* recent ticker */}
        <div className="r-card" style={{ gridColumn: "span 5", padding: 18 }}>
          <div className="r-card-h" style={{ padding: 0, marginBottom: 12 }}><span className="lbl"><b>Recently played</b></span>
            <a className="meta r-extlink-lf" href="https://www.last.fm/user/fuadex" target="_blank" rel="noopener noreferrer"
              style={{ color: "var(--ink-faint)", textDecoration: "none" }}>last.fm/fuadex ↗</a></div>
          <div style={{ display: "grid", gap: 2 }}>
            {recent.slice(0, recentN).map(r => (
              <div key={r.id} onClick={() => go("artist", r.artistId)} style={{ display: "flex", alignItems: "center", gap: 11,
                padding: "7px 6px", borderRadius: 4, cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--bg-3)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <GenCover hue={r.hue} name={r.artist} size={30} radius={2} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.track}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>{r.artist}</div>
                </div>
                <span className="r-mono" style={{ fontSize: 10, color: "var(--ink-faint)" }}>{r.when}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, flexWrap: "wrap", gap: 8 }}>
            <div className="r-seg">{[6, 10, 20].map(n => <button key={n} data-on={recentN === n} onClick={() => setRecentN(n)}
              disabled={n > recent.length} style={n > recent.length ? { opacity: .35, cursor: "default" } : null}>{n}</button>)}</div>
            <span className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)" }}>showing {Math.min(recentN, recent.length)} latest</span>
          </div>
        </div>

        {/* top artists peek */}
        <div className="r-card" style={{ gridColumn: "span 7", padding: 18 }}>
          <div className="r-card-h" style={{ padding: 0, marginBottom: 14 }}>
            <span className="lbl"><b>Top artists</b> · all time</span>
            <span className="meta" style={{ cursor: "pointer" }} onClick={() => go("explore")}>explore ↗</span></div>
          <div className="r-xscroll">
            {R.ARTISTS.slice(0, 12).map((a, i) => (
              <div key={a.id} onClick={() => go("artist", a.id)} style={{ cursor: "pointer", flex: "none", width: 96 }}>
                <div style={{ position: "relative" }}>
                  <GenCover hue={a.hue} name={a.name} size={96} />
                  <span className="r-mono" style={{ position: "absolute", top: 5, left: 6, fontSize: 9,
                    color: "rgba(255,255,255,.85)", textShadow: "0 1px 2px #000" }}>{String(i + 1).padStart(2, "0")}</span>
                </div>
                <div style={{ fontSize: 11.5, marginTop: 7, lineHeight: 1.25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</div>
                <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)" }}>{fmt(a.plays)} plays</div>
              </div>
            ))}
          </div>
        </div>
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
          <div style={{ marginTop: "calc(var(--gap)*1.6)" }}>
            <div className="r-mono hub-lbl">Where to dig</div>
            <div className="hub-grid">
              {cards.map((c, i) => (
                <div key={i} className="r-card hub-card" onClick={c.on} style={{ "--c": `oklch(0.7 0.16 ${c.hue})` }}>
                  <div className="hub-accent" />
                  <div className="r-mono hub-k">{c.k}</div>
                  <div className="hub-h">{c.h}</div>
                  <div className="hub-s">{c.s}</div>
                  <div className="hub-go">open <span className="hub-arrow">→</span></div>
                </div>
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

// ════════════════════════ CHARTS ════════════════════════
const PERIODS = [["7day", "7 days"], ["1month", "month"], ["3month", "3 mo"], ["12month", "year"], ["overall", "all time"]];
function ChartsView({ t, go, setPop }) {
  const R = window.ROTATION;
  const [kind, setKind] = React.useState("artists");
  const [period, setPeriod] = React.useState("overall");
  const [ref, seen] = useInView();

  // scale plays believably by period (shorter window → fewer plays)
  const scale = { "7day": 0.012, "1month": 0.05, "3month": 0.16, "12month": 0.52, "overall": 1 }[period];
  const base = kind === "artists" ? R.ARTISTS.map(a => ({ id: a.id, label: a.name, value: a.plays, hue: a.hue,
    sub: (a.styles && a.styles[0]) || a.tags[0] }))
    : kind === "albums" ? R.ALBUMS.map(a => ({ id: a.id, aid: a.artistId, label: a.title, value: a.plays, hue: a.hue, sub: a.artist }))
    : R.TRACKS.map(a => ({ id: a.id, aid: a.artistId, label: a.title, value: a.plays, hue: a.hue, sub: a.artist }));
  const items = base.map(b => ({ ...b, value: Math.max(1, Math.round(b.value * scale)) }))
    .sort((a, b) => b.value - a.value).slice(0, kind === "artists" ? 30 : 24);

  const layout = t.layout; // wall | bars | bubbles
  const onClick = (it) => go("artist", it.aid || it.id);

  return (
    <div className="r-view" ref={ref}>
      <div className="r-viewhead">
        <div>
          <div className="r-kicker">Charts</div>
          <h1 className="r-title">Most <em>played</em><span className="dot">.</span></h1>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div className="r-seg">
            {["artists", "albums", "tracks"].map(k =>
              <button key={k} data-on={kind === k} onClick={() => setKind(k)}>{k}</button>)}
          </div>
          <div className="r-seg">
            {PERIODS.map(([k, lbl]) => <button key={k} data-on={period === k} onClick={() => setPeriod(k)}>{lbl}</button>)}
          </div>
        </div>
      </div>

      {layout === "bars" && (
        <Bars items={items.slice(0, 18)} run={seen} expressive={t.chart === "expressive"} onClick={onClick}
          onHover={(it, el) => {
            if (!it) return setPop(null);
            const r = el.getBoundingClientRect();
            setPop({ x: r.left + 120, y: r.top, title: it.label, pip: it.hue, meta: kind.slice(0, -1),
              rows: [["plays", fmt(it.value)], ["tag", it.sub]], hint: "click → artist ↗" });
          }} />
      )}

      {layout === "wall" && (
        <WallGrid items={items} kind={kind} seen={seen} setPop={setPop} onClick={onClick} />
      )}

      {layout === "bubbles" && (
        <BubbleField items={items} seen={seen} setPop={setPop} onClick={onClick} expressive={t.chart === "expressive"} />
      )}
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

// ════════════════════════ CLOCK ════════════════════════
function ClockView({ t, setPop }) {
  const R = window.ROTATION;
  const { days, grid } = R.CLOCK;
  const [ref, seen] = useInView();
  const max = Math.max(...grid.flat());
  const hourTotals = Array.from({ length: 24 }, (_, h) => days.reduce((s, _, di) => s + grid[di][h], 0));
  const dayTotals = grid.map(row => row.reduce((a, b) => a + b, 0));
  const peakHour = hourTotals.indexOf(Math.max(...hourTotals));
  const nightShare = (hourTotals.slice(0, 5).reduce((a, b) => a + b, 0) / hourTotals.reduce((a, b) => a + b, 0) * 100);
  const peakDay = days[dayTotals.indexOf(Math.max(...dayTotals))];
  const cell = (v) => {
    const x = v / max;
    return { background: x < 0.04 ? "var(--bg-3)" : `oklch(${0.28 + x * 0.5} ${0.05 + x * 0.12} var(--acc-h))`,
      opacity: seen ? 1 : 0 };
  };
  const hr = (h) => (h % 12 === 0 ? 12 : h % 12) + (h < 12 ? "a" : "p");

  return (
    <div className="r-view" ref={ref}>
      <div className="r-viewhead">
        <div>
          <div className="r-kicker">Rhythm</div>
          <h1 className="r-title">When I <em>listen</em><span className="dot">.</span></h1>
        </div>
        <p className="r-lede">Plays mapped to the hour they happened. The shape of a week —
          <b> {peakDay} nights</b> and the small hours run deepest.</p>
      </div>

      <div className="m-stack" style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: "var(--gap)", alignItems: "start" }}>
        <div className="r-card" style={{ padding: "20px 22px 16px" }}>
         <div className="clk-scroll">
          {/* hour axis */}
          <div style={{ display: "grid", gridTemplateColumns: "34px repeat(24, 1fr)", gap: 3, marginBottom: 5 }}>
            <div />
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="r-mono" style={{ fontSize: 7.5, color: "var(--ink-faint)", textAlign: "center" }}>
                {h % 3 === 0 ? hr(h) : ""}</div>
            ))}
          </div>
          {days.map((d, di) => (
            <div key={d} style={{ display: "grid", gridTemplateColumns: "34px repeat(24, 1fr)", gap: 3, marginBottom: 3 }}>
              <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-soft)", display: "flex", alignItems: "center" }}>{d}</div>
              {grid[di].map((v, h) => (
                <div key={h} title={`${d} ${hr(h)} · ${v}`}
                  style={{ aspectRatio: "1", borderRadius: 2, cursor: "pointer", transition: `opacity .5s ${(di * 24 + h) * 0.0012}s, transform .12s`, ...cell(v) }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.35)"; e.currentTarget.style.boxShadow = "0 0 0 1.5px var(--accent)";
                    const r = e.currentTarget.getBoundingClientRect();
                    setPop({ x: r.left + r.width / 2, y: r.top, title: `${d}, ${hr(h)}`, pip: "var(--acc-h)",
                      meta: "listening", rows: [["plays", fmt(v)], ["of peak", Math.round(v / max * 100) + "%"]] }); }}
                  onClick={(e) => { const r = e.currentTarget.getBoundingClientRect();
                    setPop({ x: r.left + r.width / 2, y: r.top, title: `${d}, ${hr(h)}`, pip: "var(--acc-h)",
                      meta: "listening", rows: [["plays", fmt(v)], ["of peak", Math.round(v / max * 100) + "%"]] }); }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; setPop(null); }} />
              ))}
            </div>
          ))}
          {/* hour ridge */}
          <div style={{ display: "grid", gridTemplateColumns: "34px 1fr", gap: 0, marginTop: 16, alignItems: "end" }}>
            <div />
            <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: 54 }}>
              {hourTotals.map((v, h) => (
                <div key={h} style={{ flex: 1, height: (seen ? v / Math.max(...hourTotals) * 100 : 0) + "%",
                  background: h === peakHour ? "var(--accent)" : "var(--rule-2)", borderRadius: "2px 2px 0 0",
                  transition: `height .8s cubic-bezier(.3,.8,.3,1) ${h * 0.018}s` }} title={`${hr(h)} · ${v}`} />
              ))}
            </div>
          </div>
         </div>
        </div>

        {/* side stats */}
        <div style={{ display: "grid", gap: "var(--gap)" }}>
          <div className="r-card" style={{ padding: 18 }}>
            <div className="r-mono" style={{ fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--ink-faint)" }}>Peak hour</div>
            <div className="r-stat-n" style={{ fontSize: 38, marginTop: 8 }}>{hr(peakHour).replace("a", " AM").replace("p", " PM")}</div>
          </div>
          <div className="r-card" style={{ padding: 18 }}>
            <div className="r-mono" style={{ fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--ink-faint)" }}>Night-owl index</div>
            <div className="r-stat-n" style={{ fontSize: 38, marginTop: 8, color: "var(--accent)" }}>{nightShare.toFixed(0)}%</div>
            <div className="r-mono" style={{ fontSize: 10, color: "var(--ink-faint)", marginTop: 4 }}>of plays before 5 AM</div>
          </div>
          <div className="r-card" style={{ padding: 18 }}>
            <div className="r-mono" style={{ fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: 12 }}>By day</div>
            {days.map((d, i) => (
              <div key={d} style={{ display: "grid", gridTemplateColumns: "30px 1fr 30px", gap: 8, alignItems: "center", marginBottom: 6 }}>
                <span className="r-mono" style={{ fontSize: 10, color: "var(--ink-soft)" }}>{d}</span>
                <div style={{ height: 8, background: "var(--bg-3)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: (seen ? dayTotals[i] / Math.max(...dayTotals) * 100 : 0) + "%",
                    background: d === peakDay ? "var(--accent)" : "var(--accent-dim)", opacity: .85, borderRadius: 4,
                    transition: `width .9s cubic-bezier(.3,.8,.3,1) ${i * 0.05}s` }} />
                </div>
                <span className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", textAlign: "right" }}>{fmtK(dayTotals[i])}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        .clk-scroll > div { min-width: 0; }
        @media (max-width: 860px){ .r-view > div[style*="240px"]{ grid-template-columns: 1fr !important; } }
        @media (max-width: 560px){
          .clk-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; padding-bottom: 4px; }
          .clk-scroll::-webkit-scrollbar { display: none; }
          .clk-scroll > div { min-width: 430px; }
        }`}</style>
    </div>
  );
}

Object.assign(window, { Popover, OverviewView, ChartsView, ClockView });
