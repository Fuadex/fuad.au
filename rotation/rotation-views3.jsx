// rotation-views3.jsx — Stories (mined insights) + artist Search overlay
// exports: StoriesView, SearchOverlay

const fmtDate = (s) => {
  const d = new Date(s + "T00:00:00Z");
  return d.getUTCDate() + " " + ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getUTCMonth()] + " " + d.getUTCFullYear();
};
const yearsOf = (days) => (days / 365.25).toFixed(1);
const hueOfName = (name) => (window.ROTATION.byId[window.ROTATION.slug(name)] || {}).hue != null
  ? window.ROTATION.byId[window.ROTATION.slug(name)].hue
  : hashInt(name, 0) % 360;

// ════════════════════════ STORIES ════════════════════════
function StoriesView({ t, go, seed }) {
  const R = window.ROTATION;
  const I = R.INSIGHTS;
  // ── TOC / chapters / deep links ──
  // Sections self-register: after render we read each card's .st-label from the DOM (conditional
  // cards are handled for free), assign stable ids, build the sticky TOC, and scrollspy it.
  const feedRef = React.useRef(null);
  const [toc, setToc] = React.useState([]);
  const [active, setActive] = React.useState("");
  const _slugify = (s) => (s || "").toLowerCase().split("·")[0].trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  React.useEffect(() => {
    const feed = feedRef.current; if (!feed) return;
    const items = [];
    for (const sec of feed.querySelectorAll("section")) {
      const lbl = sec.querySelector(".st-label"); if (!lbl) continue;
      const label = lbl.textContent.split("·")[0].trim();
      const id = "st-" + _slugify(label);
      sec.id = id;
      items.push({ id, label });
    }
    setToc(items);
    if (seed) {
      const el = document.getElementById("st-" + _slugify(decodeURIComponent(seed)));
      if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    }
    const obs = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) setActive(e.target.id); },
      { rootMargin: "-12% 0px -72% 0px" });
    for (const it of items) { const el = document.getElementById(it.id); if (el) obs.observe(el); }
    return () => obs.disconnect();
  }, [seed]);
  const jump = (id) => {
    const el = document.getElementById(id); if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", "#stories/" + id.replace(/^st-/, ""));
  };
  // freshness — stories whose underlying data changed recently get a pulse dot in the TOC
  const fresh = React.useMemo(() => {
    const now = Date.now(), d30 = 30 * 86400e3, d60 = 60 * 86400e3, cy = new Date().getUTCFullYear();
    const recent = (iso, win) => iso && (now - new Date(iso).getTime()) < win;
    const f = {};
    if ((I.COMEBACKS || []).some(c => recent(c.back, d60))) f["st-comebacks"] = 1;
    if (I.LIFESPAN && (I.LIFESPAN.whileListening || []).some(w => w.end >= cy)) f["st-the-ones-that-ended"] = 1;
    if ((I.DISCOVERIES || []).some(x => recent(x.date, d30))) f["st-first-contact"] = 1;
    if ((I.OBSESSIONS || []).some(o => recent(o.weekStart, d60))) f["st-obsessions"] = 1;
    if ((I.ALBUM_OBSESSIONS || []).some(o => recent(o.weekStart, d60))) f["st-album-weeks"] = 1;
    if ((I.WONDERS || []).some(w => recent(w.date, d60))) f["st-one-day-wonders"] = 1;
    if (I.STREAK && I.STREAK.current >= 30) f["st-the-streak"] = 1;
    return f;
  }, []);
  // Alias-aware: "Midori" resolves through R.idForName → ミドリ's id when applicable.
  // Kept AND explore artists are clickable — non-kept ids get a MiniArtistView, so fully
  // enriched non-top-206 artists (Yoko Kanno) are reachable from every story.
  const resolveId = (name) => (R.idForName && R.idForName(name)) || R.slug(name);
  const hasPage = (id) => !!(R.byId[id] || (R.expById && R.expById[id]));
  const goIf = (name) => { const id = resolveId(name); if (hasPage(id)) go("artist", id); };
  const clickable = (name) => hasPage(resolveId(name));

  // year-in-review state — default to most recent year with real listening volume
  const realYears = (R.YEARS || []).filter(y => y.plays > 500);
  const [yi, setYi] = React.useState(realYears.length - 1);
  const yr = realYears[yi];

  const today = new Date();
  const todayKey = String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");
  const otd = I.ON_THIS_DAY[todayKey];
  const todayLabel = today.getDate() + " " + ["January","February","March","April","May","June","July","August","September","October","November","December"][today.getMonth()];

  const ArtistRow = ({ name, hue, children, right }) => (
    <div className="st-row" data-link={clickable(name)} onClick={() => goIf(name)}>
      <GenCover hue={hue} name={name} size={44} radius={4} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="st-row-name">{name}</div>
        <div className="st-row-sub">{children}</div>
      </div>
      {right && <div className="st-row-right">{right}</div>}
    </div>
  );

  return (
    <div className="r-view">
      <div className="r-viewhead">
        <div>
          <div className="r-kicker">Stories · mined from {fmt(R.TOTALS.scrobbles)} scrobbles</div>
          <h1 className="r-title">Things last.fm <em>won't tell you</em><span className="dot">.</span></h1>
        </div>
        <p className="r-lede">Not charts — <b>patterns</b>. Obsessions, disappearances, comebacks,
          and the songs that own particular hours of the night.</p>
      </div>

      {toc.length > 3 && (() => {
        const activeIdx = toc.findIndex(it => it.id === active);
        return (
        <nav className="st-toc" aria-label="stories">
          {toc.map((it, idx) => (
            <button key={it.id} data-on={active === it.id}
              data-reached={activeIdx >= 0 && idx <= activeIdx ? "true" : undefined}
              onClick={() => jump(it.id)}
              title={fresh[it.id] ? "changed recently" : undefined}>
              <span className="st-node" />
              <span className="st-toc-lbl">{it.label}{fresh[it.id] ? <i className="st-fresh" /> : null}</span>
            </button>
          ))}
        </nav>
        );
      })()}

      <div className="st-feed" ref={feedRef}>

        {/* on this day */}
        {otd && (
          <section className="st-card st-hero">
            <div className="st-label">On this day · {todayLabel}</div>
            <div className="st-big" data-link={clickable(otd.artist)} onClick={() => goIf(otd.artist)}>
              Every {todayLabel} belongs to <em style={{ color: `oklch(0.78 0.14 ${otd.hue})` }}>{otd.artist}</em>.
            </div>
            <div className="st-sub">{otd.plays} of the {fmt(otd.total)} plays you've ever logged on this date —
              more than any other artist.</div>
          </section>
        )}

        <div className="st-chapter"><span>I</span> Depth &amp; taste</div>

        {/* underground index */}
        {I.UNDERGROUND && I.UNDERGROUND.deepCuts && I.UNDERGROUND.deepCuts.length > 0 && (() => {
          const U = I.UNDERGROUND;
          const deepest = U.deepCuts[0];
          return (
            <section className="st-card st-hero">
              <div className="st-label">How deep it goes</div>
              <div className="st-big" data-link={clickable(deepest.artist)} onClick={() => goIf(deepest.artist)}>
                <em style={{ color: `oklch(0.78 0.14 ${deepest.hue})` }}>{deepest.artist}</em> has {fmt(deepest.listeners)} listeners
                in the entire world. You've played them <em>{fmt(deepest.plays)}</em> times.
              </div>
              <div className="st-sub">
                That's volume, not taste — your charts lean on a few giants (a typical <em>play</em> is a ~{fmt(U.medianListeners)}-listener artist).
                But of the {fmt(U.artistsCovered)} artists you actually play, <b style={{ color: "var(--ink)" }}>{Math.round(U.artistShare50k * 100)}% sit under 50k listeners</b> and {Math.round(U.artistShare10k * 100)}% under 10k —
                the median one has just {fmt(U.medianArtistListeners)}. The depth is in the breadth. Your deepest cuts:
              </div>
              <div className="st-ug-cuts">
                {U.deepCuts.map(c => (
                  <div key={c.artist} className="st-ug-cut" data-link={clickable(c.artist)} onClick={() => goIf(c.artist)}>
                    <GenCover hue={c.hue} name={c.artist} size={40} radius={4} />
                    <div style={{ minWidth: 0 }}>
                      <div className="st-row-name">{c.artist}</div>
                      <div className="st-row-sub">{fmt(c.listeners)} listeners · {fmt(c.plays)} of yours</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })()}

        {/* adoption lag — how old the music was when you found it */}
        {I.ADOPTION && I.ADOPTION.decades && I.ADOPTION.decades.length > 0 && (() => {
          const A = I.ADOPTION;
          const peakDec = A.decades.slice().sort((a, b) => b.share - a.share)[0];
          const dig = A.digs[0];
          return (
            <section className="st-card st-hero">
              <div className="st-label">How old the music was</div>
              <div className="st-big">
                The median artist you found was <em>{A.medianLag} years</em> past their debut when you pressed play.
              </div>
              <div className="st-sub">
                You don't chase new releases — you dig. Most of what you play was made in the
                <b style={{ color: "var(--ink)" }}> {peakDec.decade}s</b> ({Math.round(peakDec.share * 100)}% of plays){dig ? <>, and you went {dig.lag} years deep into <em>{dig.name}</em>'s back-catalogue</> : null}.
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 96, margin: "18px 0 6px" }}>
                {A.decades.filter(d => d.share >= 0.005).map(d => (
                  <div key={d.decade} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 9.5, color: "var(--ink-faint)" }}>{Math.round(d.share * 100)}%</div>
                    <div style={{ width: "100%", maxWidth: 40, height: Math.max(3, d.share / peakDec.share * 64), borderRadius: "3px 3px 0 0",
                      background: d.decade === peakDec.decade ? "var(--accent)" : "var(--rule-2)" }} />
                    <div style={{ fontFamily: "var(--mono)", fontSize: 9.5, color: "var(--ink-soft)" }}>'{String(d.decade).slice(2)}s</div>
                  </div>
                ))}
              </div>
              <div className="st-ug-cuts">
                {A.digs.slice(0, 4).map(c => (
                  <div key={c.name} className="st-ug-cut" data-link={clickable(c.name)} onClick={() => goIf(c.name)}>
                    <GenCover hue={c.hue} name={c.name} size={40} radius={4} />
                    <div style={{ minWidth: 0 }}>
                      <div className="st-row-name">{c.name}</div>
                      <div className="st-row-sub">debut {c.debut} · found {c.foundYear} · {c.lag}yr later</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })()}

        {/* connections — shared members / side-projects threading the library */}
        {I.CONNECTIONS && I.CONNECTIONS.links && I.CONNECTIONS.links.length > 0 && (() => {
          const C = I.CONNECTIONS;
          const top = C.links[0];
          return (
            <section className="st-card st-hero">
              <div className="st-label">Connected by blood</div>
              <div className="st-big" data-link={clickable(top.artists[0].name)} onClick={() => goIf(top.artists[0].name)}>
                <em>{top.person}</em> ties together {top.artists.length} acts you play.
              </div>
              <div className="st-sub">
                {fmt(C.totalLinks)} hidden threads run through your library — shared members, side-projects,
                the same hands on different records. The bloodlines that run deepest:
              </div>
              <div style={{ display: "grid", gap: 12, marginTop: 6 }}>
                {C.links.slice(0, 6).map(l => (
                  <div key={l.person} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 14, color: "var(--ink)", minWidth: 120 }}>{l.person}</span>
                    {l.artists.map(a => (
                      <span key={a.name} data-link={a.kept} onClick={() => a.kept && goIf(a.name)}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 9px", borderRadius: 999,
                          border: "1px solid var(--rule)", fontSize: 11.5, cursor: a.kept ? "pointer" : "default",
                          color: a.kept ? "var(--ink)" : "var(--ink-soft)" }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: `oklch(0.62 0.16 ${a.hue})` }} />
                        {a.name}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </section>
          );
        })()}

        {/* blind spots — taste-gap recommendations */}
        {I.RECOMMENDATIONS && I.RECOMMENDATIONS.artists.length > 0 && (() => {
          const RC = I.RECOMMENDATIONS;
          const top = RC.artists[0];
          const fmtL = (n) => n ? ((n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1000 ? Math.round(n / 1000) + "k" : n) + " listeners") : "";
          return (
            <section className="st-card st-hero">
              <div className="st-label">Blind spots</div>
              <div className="st-big">
                Your favourites keep pointing to <em style={{ color: `oklch(0.78 0.14 ${top.hue})` }}>{top.name}</em> — and you've barely pressed play.
              </div>
              <div className="st-sub">
                Artists your most-played acts are repeatedly compared to, that you haven't really explored. The most overdue:
              </div>
              <div className="st-ug-cuts">
                {RC.artists.slice(0, 6).map(r => (
                  <div key={r.name} className="st-ug-cut" style={{ cursor: "default" }}>
                    <GenCover hue={r.hue} name={r.name} size={40} radius={4} />
                    <div style={{ minWidth: 0 }}>
                      <div className="st-row-name">{r.name}</div>
                      <div className="st-row-sub">via {r.via.map(v => v.name).join(", ")}{r.listeners ? ` · ${fmtL(r.listeners)}` : ""}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })()}

        {/* revisit — favourites gone quiet */}
        {I.REVISIT && I.REVISIT.artists.length > 0 && (() => {
          const RV = I.REVISIT;
          const top = RV.artists[0];
          const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const monthName = (ym) => { if (!ym) return ""; const [y, m] = ym.split("-"); return MON[+m - 1] + " " + y; };
          const ago = (mo) => mo >= 12 ? (mo / 12).toFixed(mo >= 24 ? 0 : 1) + " years" : mo + " months";
          return (
            <section className="st-card st-hero">
              <div className="st-label">Gathering dust</div>
              <div className="st-big" data-link={clickable(top.name)} onClick={() => goIf(top.name)}>
                You played <em style={{ color: `oklch(0.78 0.14 ${top.hue})` }}>{top.name}</em> {fmt(top.plays)} times — and haven't pressed play in {ago(top.monthsSince)}.
              </div>
              <div className="st-sub">Artists you once lived in, now gone quiet. Maybe it's time:</div>
              <div className="st-ug-cuts">
                {RV.artists.slice(0, 6).map(a => (
                  <div key={a.name} className="st-ug-cut" data-link={clickable(a.name)} onClick={() => goIf(a.name)}>
                    <GenCover hue={a.hue} name={a.name} size={40} radius={4} />
                    <div style={{ minWidth: 0 }}>
                      <div className="st-row-name">{a.name}</div>
                      <div className="st-row-sub">{fmt(a.plays)} plays · peak {monthName(a.peakMonth)} · {ago(a.monthsSince)} ago</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })()}

        <div className="st-chapter"><span>II</span> Lives &amp; years</div>

        {/* lifespan — bands that ended while you were listening, graves you dug up, the elders */}
        {I.LIFESPAN && I.LIFESPAN.whileListening.length > 0 && (() => {
          const L = I.LIFESPAN;
          const top = L.whileListening[0];
          const verb = (w) => w.person ? "died" : "disbanded";
          return (
            <section className="st-card st-hero">
              <div className="st-label">The ones that ended</div>
              <div className="st-big" data-link={clickable(top.name)} onClick={() => goIf(top.name)}>
                <em style={{ color: `oklch(0.78 0.14 ${top.hue})` }}>{top.name}</em> {verb(top)} in {top.end} —
                you'd already played them <em>{fmt(top.before)}</em> times.
              </div>
              <div className="st-sub">
                Of the {fmt(L.known)} artists here with a documented life-span, <b style={{ color: "var(--ink)" }}>{L.endedCount} have ended</b> ({Math.round(L.endedShare * 100)}%).
                The median band you play lasted {L.medianLife} years{L.worstYear ? <>, and {L.worstYear} alone took {L.worstYearCount} of yours</> : null}.
                These ended <i>while you were listening</i> — you were there for the last records:
              </div>
              <div className="st-ug-cuts">
                {L.whileListening.map(w => (
                  <div key={w.name} className="st-ug-cut" data-link={clickable(w.name)} onClick={() => goIf(w.name)}>
                    <GenCover hue={w.hue} name={w.name} size={40} radius={4} />
                    <div style={{ minWidth: 0 }}>
                      <div className="st-row-name">{w.name}</div>
                      <div className="st-row-sub">{verb(w)} {w.end} · {fmt(w.before)} plays while alive{w.after >= 20 ? ` · ${fmt(w.after)} since` : ""}</div>
                    </div>
                  </div>
                ))}
              </div>
              {L.graves.length > 0 && (
                <div className="st-sub" style={{ marginTop: 18 }}>
                  And the graves you dug up: {L.graves.map((g, i) => (
                    <span key={g.name}>{i > 0 ? " · " : ""}<b className="st-inline-link" data-link={clickable(g.name)} onClick={() => goIf(g.name)}
                      style={{ color: "var(--ink)", cursor: clickable(g.name) ? "pointer" : "default" }}>{g.name}</b> ({g.gap} yrs after the end)</span>
                  ))}.
                  {L.elders.length > 0 && <> Still standing after everything: <b style={{ color: "var(--ink)" }}>{L.elders[0].name}</b>, going since {L.elders[0].begin}.</>}
                </div>
              )}
            </section>
          );
        })()}

        {/* year in review */}
        {yr && (
          <section className="st-card st-hero">
            <div className="st-yir-head">
              <div className="st-label" style={{ marginBottom: 0 }}>A year in review</div>
              <div className="st-yir-nav">
                <button onClick={() => setYi(Math.max(0, yi - 1))} disabled={yi === 0} aria-label="previous year">‹</button>
                <span className="st-yir-y">{yr.year}</span>
                <button onClick={() => setYi(Math.min(realYears.length - 1, yi + 1))} disabled={yi === realYears.length - 1} aria-label="next year">›</button>
              </div>
            </div>
            {yr.topArtist && (
              <div className="st-big" data-link={clickable(yr.topArtist.name)} onClick={() => goIf(yr.topArtist.name)}>
                <em style={{ color: `oklch(0.78 0.14 ${yr.topArtist.hue})` }}>{yr.topArtist.name}</em>'s year.
              </div>
            )}
            <div className="st-sub">
              {yr.topArtist ? <>You played them <em>{fmt(yr.topArtist.plays)}</em> times in {yr.year} — more than anyone else. </> : null}
              {yr.activeDays} active days · roughly <em>{fmt(yr.hours)} hours</em> of music.
            </div>

            <div className="st-yir-stats">
              <div><div className="st-yir-n">{fmt(yr.plays)}</div><div className="st-yir-l">plays</div></div>
              <div><div className="st-yir-n">{fmt(yr.artists)}</div><div className="st-yir-l">artists</div></div>
              <div><div className="st-yir-n">{fmt(yr.distinctTracks || 0)}</div><div className="st-yir-l">tracks</div></div>
              {yr.peakDay && <div><div className="st-yir-n">{yr.peakDay.plays}</div><div className="st-yir-l">peak · {fmtDate(yr.peakDay.date)}</div></div>}
            </div>

            <div className="st-yir-grid">
              <div>
                <div className="st-yir-h">On rotation</div>
                {yr.topTrack && (
                  <div className="st-row" data-link={clickable(yr.topTrack.artist)} onClick={() => goIf(yr.topTrack.artist)} style={{ marginBottom: 8 }}>
                    <GenCover hue={yr.topTrack.hue} name={yr.topTrack.artist} size={40} radius={4} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="st-row-name">{yr.topTrack.title}</div>
                      <div className="st-row-sub">{yr.topTrack.artist} · {yr.topTrack.plays} plays · top track</div>
                    </div>
                  </div>
                )}
                {yr.topAlbum && (
                  <div className="st-row" data-link={clickable(yr.topAlbum.artist)} onClick={() => goIf(yr.topAlbum.artist)}>
                    <GenCover hue={yr.topAlbum.hue} name={yr.topAlbum.artist} size={40} radius={4} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="st-row-name">{yr.topAlbum.title}</div>
                      <div className="st-row-sub">{yr.topAlbum.artist} · {yr.topAlbum.plays} plays · top album</div>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <div className="st-yir-h">New that year</div>
                {yr.discoveries.length === 0 && <div className="st-row-sub">No new artists ranked this year.</div>}
                {yr.discoveries.map(d => (
                  <div key={d.name} className="st-row" data-link={clickable(d.name)} onClick={() => goIf(d.name)} style={{ marginBottom: 6 }}>
                    <GenCover hue={d.hue} name={d.name} size={36} radius={4} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="st-row-name">{d.name}</div>
                      <div className="st-row-sub">{d.plays} plays — first heard this year</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {yr.gainer && yr.gainer.delta > 50 && (
              <div className="st-yir-jump" data-link={clickable(yr.gainer.name)} onClick={() => goIf(yr.gainer.name)}>
                <span className="r-mono" style={{ fontSize: 10, color: "var(--ink-faint)", letterSpacing: ".12em", textTransform: "uppercase" }}>Biggest jump</span>
                &nbsp;&nbsp;
                <b style={{ color: `oklch(0.78 0.14 ${yr.gainer.hue})` }}>{yr.gainer.name}</b>
                <span style={{ color: "var(--ink-soft)" }}> · {yr.gainer.prev} → <em>{yr.gainer.plays}</em> plays (+{yr.gainer.delta} YoY)</span>
              </div>
            )}
          </section>
        )}

        <div className="st-chapter"><span>III</span> Scenes &amp; places</div>

        {/* the languages you listen in — from Genius lyrics language detection */}
        {I.LANGUAGE && I.LANGUAGE.shares.length > 1 && (() => {
          const L = I.LANGUAGE;
          const max = L.shares[0].plays;
          const top = L.shares.slice(0, 8);
          const topNon = L.topNonEn[0];
          return (
            <section className="st-card st-hero">
              <div className="st-label">What you listen in</div>
              <div className="st-big">
                {L.nonEnPct >= 4
                  ? <><em>{L.nonEnPct}%</em> of your listening isn't in English.</>
                  : <>You listen across <em>{L.langs}</em> languages.</>}
              </div>
              <div className="st-sub">
                Across the {fmt(L.covered)} songs with detectable lyrics, {L.shares[1] ? <>the biggest non-English voice is <b style={{ color: "var(--ink)" }}>{L.shares[1].name}</b>{L.shares[2] ? <>, then {L.shares[2].name}</> : null}. </> : null}
                {topNon ? <>Your most-played non-English track: <b className="st-inline-link" data-link={clickable(topNon.artist)} onClick={() => go("track", topNon.id)} style={{ color: "var(--ink)", cursor: "pointer" }}>{topNon.title}</b> ({topNon.langName}, {fmt(topNon.plays)} plays).</> : null}
              </div>
              <div style={{ display: "grid", gap: 7, marginTop: 18, maxWidth: 520 }}>
                {top.map(s => (
                  <div key={s.lang} style={{ display: "grid", gridTemplateColumns: "84px 1fr 54px", gap: 10, alignItems: "center" }}>
                    <span style={{ fontSize: 12.5, color: s.lang === "en" ? "var(--ink-soft)" : "var(--ink)" }}>{s.name}</span>
                    <div style={{ height: 7, background: "var(--bg-3)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: (s.plays / max * 100) + "%", background: s.lang === "en" ? "var(--rule-2)" : "var(--accent)", borderRadius: 4 }} />
                    </div>
                    <span className="r-mono" style={{ fontSize: 10, color: "var(--ink-faint)", textAlign: "right" }}>{fmt(s.plays)}</span>
                  </div>
                ))}
              </div>
              {L.topNonEn.length > 1 && (
                <div className="st-ug-cuts" style={{ marginTop: 18 }}>
                  {L.topNonEn.slice(0, 6).map(t => (
                    <div key={t.id} className="st-ug-cut" data-link={clickable(t.artist)} onClick={() => go("track", t.id)}>
                      <GenCover hue={t.hue} name={t.artist} size={40} radius={4} />
                      <div style={{ minWidth: 0 }}>
                        <div className="st-row-name">{t.title}</div>
                        <div className="st-row-sub">{t.artist} · {t.langName} · {fmt(t.plays)} plays</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })()}

        {/* language arc — how the non-English share moved across years */}
        {I.LANGUAGE && I.LANGUAGE.arc && I.LANGUAGE.arc.years.length >= 6 && (() => {
          const A = I.LANGUAGE.arc;
          const huesByLang = { pl: 15, de: 110, ja: 340, sv: 210, es: 40, fr: 260, ko: 300, fi: 190, ru: 350, pt: 60 };
          // mover: the non-English language that gained the most share, early years → last 3 avg
          const firstYears = A.years.slice(0, 3), lastYears = A.years.slice(-3);
          const mover = A.langs.map(l => {
            const before = firstYears.reduce((s, y) => s + (y.byLang[l.lang] || 0), 0) / firstYears.length;
            const after = lastYears.reduce((s, y) => s + (y.byLang[l.lang] || 0), 0) / lastYears.length;
            return { ...l, delta: after - before, after };
          }).sort((a, b) => b.delta - a.delta)[0];
          const moverYear = A.years.find(y => (y.byLang[mover.lang] || 0) >= mover.after * 0.5);
          const nonEnSeries = A.years.map(y => y.nonEnPct);
          const peakNonEn = A.years[nonEnSeries.indexOf(Math.max(...nonEnSeries))];
          return (
            <section className="st-card st-hero">
              <div className="st-label">How the languages moved</div>
              <div className="st-big">
                <em>{mover.name}</em> crept in around <em>{moverYear ? moverYear.year : "—"}</em> —
                now <em>{Math.round(mover.after * 100)}%</em> of a year's lyrics.
              </div>
              <div className="st-sub">
                Each line is a language's share of that year's detectable-lyric plays. Your most non-English
                year was <b style={{ color: "var(--ink)" }}>{peakNonEn.year}</b> at {Math.round(peakNonEn.nonEnPct * 100)}% —
                the rest is English underneath.
              </div>
              <div className="st-arc">
                {A.langs.map(l => {
                  const series = A.years.map(y => y.byLang[l.lang] || 0);
                  const now = series[series.length - 1];
                  const peak = Math.max(...series);
                  const peakYr = A.years[series.indexOf(peak)].year;
                  const hue = huesByLang[l.lang] || 200;
                  return (
                    <div key={l.lang} className="st-arc-row">
                      <div className="st-arc-head">
                        <span className="st-arc-name">{l.name}</span>
                        <span className="st-arc-now" style={{ color: `oklch(0.7 0.16 ${hue})` }}>{Math.round(now * 100)}%</span>
                      </div>
                      <Spark data={series} w={420} h={32} run={true}
                        stroke={`oklch(0.7 0.16 ${hue})`} fill={`oklch(0.7 0.16 ${hue} / .12)`} />
                      <div className="st-arc-peak">peak {Math.round(peak * 100)}% in '{String(peakYr).slice(2)}</div>
                    </div>
                  );
                })}
              </div>
              <div className="st-arc-axis">
                <span>{A.years[0].year}</span>
                <span>{A.years[Math.floor(A.years.length / 2)].year}</span>
                <span>{A.years[A.years.length - 1].year}</span>
              </div>
            </section>
          );
        })()}

        {/* mood — Spotify audio valence × NRC lyric valence ("sounds happy / reads dark") */}
        {I.MOOD && (I.MOOD.happyDark.length >= 3 || I.MOOD.darkHappy.length >= 3) && (() => {
          const M = I.MOOD;
          const Cut = ({ t }) => (
            <div className="st-ug-cut" data-link={true} onClick={() => go("track", t.id)}>
              <GenCover hue={t.hue} name={t.artist} size={40} radius={4} />
              <div style={{ minWidth: 0 }}>
                <div className="st-row-name">{t.title}</div>
                <div className="st-row-sub">{t.artist} · <span style={{ color: "oklch(0.72 0.15 145)" }}>sounds {t.aud}</span> · <span style={{ color: "oklch(0.68 0.16 25)" }}>reads {t.lyr}</span></div>
              </div>
            </div>
          );
          return (
            <section className="st-card st-hero">
              <div className="st-label">Sounds happy, reads dark</div>
              <div className="st-big">
                Your library <em>sounds {M.avgAud}</em> but <em>reads {M.avgLyr}</em>
                <span style={{ color: "var(--ink-soft)", fontSize: ".5em", fontStyle: "normal", display: "block", marginTop: 6 }}>
                  0–100 — how it sounds (Spotify) vs what the words say (NRC lyric sentiment)
                </span>
              </div>
              <div className="st-sub">
                Across {fmt(M.tracks)} tracks scored on both axes, {M.happyDarkCount} are bright melodies wrapped
                around bleak words{M.darkHappyCount ? <>, and {M.darkHappyCount} are the reverse — heavy sound, hopeful text</> : null}.
              </div>
              {M.happyDark.length >= 3 && (
                <>
                  <div className="st-title-sm" style={{ marginTop: 20, marginBottom: 10 }}>Bright sound, bleak words</div>
                  <div className="st-ug-cuts" style={{ marginTop: 0 }}>{M.happyDark.slice(0, 6).map(t => <Cut key={t.id} t={t} />)}</div>
                </>
              )}
              {M.darkHappy.length >= 3 && (
                <>
                  <div className="st-title-sm" style={{ marginTop: 20, marginBottom: 10 }}>Heavy sound, hopeful words</div>
                  <div className="st-ug-cuts" style={{ marginTop: 0 }}>{M.darkHappy.slice(0, 6).map(t => <Cut key={t.id} t={t} />)}</div>
                </>
              )}
              {M.emotions.length > 0 && (
                <div className="st-sub" style={{ marginTop: 18 }}>
                  Dominant lyric emotion across your plays: {M.emotions.slice(0, 4).map((e, i) => (
                    <React.Fragment key={e.emo}>{i > 0 ? ", " : ""}<b style={{ color: "var(--ink)" }}>{e.emo}</b></React.Fragment>
                  ))}.
                </div>
              )}
            </section>
          );
        })()}

        {/* emotional weather — per-year listening mood (sounds vs reads + dominant emotion) */}
        {I.MOOD && I.MOOD.arc && I.MOOD.arc.length >= 6 && (() => {
          const A = I.MOOD.arc;
          const last = A[A.length - 1], first = A[0];
          // most recent year the dominant emotion changed
          let flipYear = null;
          for (let i = A.length - 1; i > 0; i--) if (A[i].topEmo !== A[i - 1].topEmo) { flipYear = A[i]; break; }
          const darkest = A.reduce((m, y) => y.aud < m.aud ? y : m, A[0]);
          return (
            <section className="st-card st-hero">
              <div className="st-label">Emotional weather</div>
              <div className="st-big">
                {flipYear === null
                  ? <>Every year of your listening reads <em>{last.topEmo}</em>.</>
                  : flipYear === last
                    ? <>After years of <em>{A[A.length - 2].topEmo}</em>, {last.year} reads <em>{last.topEmo}</em>.</>
                    : <>Your listening's mood, year by year — now reading <em>{last.topEmo}</em>.</>}
              </div>
              <div className="st-sub">
                Play-weighted mood of everything you heard — how it <span style={{ color: "oklch(0.72 0.15 145)" }}>sounds</span> (Spotify)
                vs what the words <span style={{ color: "oklch(0.68 0.16 25)" }}>say</span> (NRC).
                Your darkest-sounding year was <b style={{ color: "var(--ink)" }}>{darkest.year}</b> ({darkest.aud})
                {last.aud > darkest.aud + 3 ? <>; since then it's brightened to {last.aud}.</> : <>.</>}
              </div>
              <div className="st-arc" style={{ marginTop: 16 }}>
                <div className="st-arc-row">
                  <div className="st-arc-head"><span className="st-arc-name">Sounds</span>
                    <span className="st-arc-now" style={{ color: "oklch(0.72 0.15 145)" }}>{last.aud}</span></div>
                  <Spark data={A.map(y => y.aud)} w={420} h={32} run={true}
                    stroke="oklch(0.72 0.15 145)" fill="oklch(0.72 0.15 145 / .12)" />
                </div>
                <div className="st-arc-row">
                  <div className="st-arc-head"><span className="st-arc-name">Reads</span>
                    <span className="st-arc-now" style={{ color: "oklch(0.68 0.16 25)" }}>{last.lyr}</span></div>
                  <Spark data={A.map(y => y.lyr)} w={420} h={32} run={true}
                    stroke="oklch(0.68 0.16 25)" fill="oklch(0.68 0.16 25 / .12)" />
                </div>
              </div>
              <div style={{ display: "flex", gap: 4, marginTop: 14, flexWrap: "wrap" }}>
                {A.map(y => (
                  <span key={y.year} className="r-mono" title={`${y.year}: ${y.topEmo} (${Math.round(y.topEmoShare * 100)}% of scored plays)`}
                    style={{ fontSize: 9, padding: "3px 7px", borderRadius: 999, border: "1px solid var(--rule)",
                      color: flipYear && y.year >= flipYear.year ? "var(--accent)" : "var(--ink-faint)" }}>
                    '{String(y.year).slice(2)} {y.topEmo}
                  </span>
                ))}
              </div>
              <div className="st-arc-axis">
                <span>{first.year}</span><span>{A[Math.floor(A.length / 2)].year}</span><span>{last.year}</span>
              </div>
            </section>
          );
        })()}

        {/* themes — what the lyrics are ABOUT (embedding themes, not sentiment) */}
        {I.THEMES && I.THEMES.shares.length >= 6 && (() => {
          const T = I.THEMES;
          const top = T.shares[0];
          const max = top.plays;
          // movers: biggest riser/faller between the first 3 and last 3 arc years
          let riser = null, faller = null;
          if (T.arc) {
            const A = T.arc.years, f3 = A.slice(0, 3), l3 = A.slice(-3);
            const deltas = T.arc.themes.map(th => {
              const before = f3.reduce((s, y) => s + (y.byTheme[th] || 0), 0) / f3.length;
              const after = l3.reduce((s, y) => s + (y.byTheme[th] || 0), 0) / l3.length;
              return { th, delta: after - before, after };
            }).sort((a, b) => b.delta - a.delta);
            riser = deltas[0]; faller = deltas[deltas.length - 1];
          }
          return (
            <section className="st-card st-hero">
              <div className="st-label">What it's all about · lyric themes</div>
              <div className="st-big">
                <em>{Math.round(top.share * 100)}%</em> of what you play is about <em>{top.theme}</em>.
              </div>
              <div className="st-sub">
                Not how it sounds — what the words are <i>about</i>, read from the lyrics of {fmt(T.covered)} tracks
                ({Math.round(T.coveredPlays / T.totalPlays * 100)}% of your plays, all languages).
                {riser && faller && riser.delta > 0.02 ? <> Over the years <b style={{ color: "var(--ink)" }}>{riser.th}</b> has been rising while <b style={{ color: "var(--ink)" }}>{faller.th}</b> fades.</> : null}
              </div>
              <div style={{ display: "grid", gap: 7, marginTop: 18, maxWidth: 560 }}>
                {T.shares.slice(0, 8).map(s => (
                  <div key={s.theme} style={{ display: "grid", gridTemplateColumns: "170px 1fr 44px", gap: 10, alignItems: "center" }}>
                    <span style={{ fontSize: 12.5, color: "var(--ink)" }}>{s.theme}</span>
                    <div style={{ height: 7, background: "var(--bg-3)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: (s.plays / max * 100) + "%", background: "var(--accent)", borderRadius: 4 }} />
                    </div>
                    <span className="r-mono" style={{ fontSize: 10, color: "var(--ink-faint)", textAlign: "right" }}>{Math.round(s.share * 100)}%</span>
                  </div>
                ))}
              </div>
              {T.exemplars[top.theme] && (
                <div className="st-ug-cuts" style={{ marginTop: 18 }}>
                  {T.shares.slice(0, 3).flatMap(s => (T.exemplars[s.theme] || []).slice(0, 2).map(e => (
                    <div key={e.id} className="st-ug-cut" data-link={true} onClick={() => go("track", e.id)}>
                      <GenCover hue={e.hue} name={e.artist} size={40} radius={4} />
                      <div style={{ minWidth: 0 }}>
                        <div className="st-row-name">{e.title}</div>
                        <div className="st-row-sub">{e.artist} · {s.theme} · {fmt(e.plays)} plays</div>
                      </div>
                    </div>
                  )))}
                </div>
              )}
              {T.artists.length >= 5 && (
                <div className="st-sub" style={{ marginTop: 18 }}>
                  Signature obsessions: {T.artists.slice(0, 6).map((a, i) => (
                    <React.Fragment key={a.artistId}>{i > 0 ? " · " : ""}
                      <b className="st-inline-link" data-link={!!R.byId[a.artistId]}
                        onClick={() => R.byId[a.artistId] && go("artist", a.artistId)}
                        style={{ color: "var(--ink)", cursor: R.byId[a.artistId] ? "pointer" : "default" }}>{a.name}</b>
                      {a.themes[0] ? <span style={{ color: "var(--ink-faint)" }}> ({a.themes[0].theme})</span> : null}
                    </React.Fragment>
                  ))}.
                </div>
              )}
            </section>
          );
        })()}

        {/* lineups — Wikidata band-member gender (the layer MB can't give us) */}
        {I.LINEUPS && I.LINEUPS.featured && I.LINEUPS.featured.length >= 4 && (() => {
          const L = I.LINEUPS;
          return (
            <section className="st-card">
              <div className="st-label">Who's in the bands · Wikidata lineups</div>
              <div className="st-big">
                <em>{Math.round(L.womenBandShare * 100)}%</em> of your band-listening has women in the lineup.
              </div>
              <div className="st-sub">
                Of the {L.bandsAnalyzed} groups whose members Wikidata knows by name, <b style={{ color: "var(--ink)" }}>{L.bandsWithWomen}</b> have
                at least one woman on stage — a cut MusicBrainz can't make, since it marks a band itself as genderless.
                {L.allWomen.length > 0 ? <> {L.allWomen.length} of them are all-women.</> : null}
              </div>
              <div className="st-ug-cuts" style={{ marginTop: 18 }}>
                {L.featured.slice(0, 6).map(b => (
                  <div key={b.artistId} className="st-ug-cut" data-link={!!R.byId[b.artistId]}
                    onClick={() => R.byId[b.artistId] && go("artist", b.artistId)}>
                    <GenCover hue={b.hue} name={b.name} size={40} radius={4} />
                    <div style={{ minWidth: 0 }}>
                      <div className="st-row-name">{b.name}</div>
                      <div className="st-row-sub">{b.women.join(", ")}{b.memberCount > b.women.length ? ` · ${b.women.length}/${b.memberCount}` : ""} · {fmt(b.plays)} plays</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })()}

        {/* top scenes — Discogs styles you've gone deepest on */}
        {I.STYLE_ATLAS && I.STYLE_ATLAS.scenes && I.STYLE_ATLAS.scenes.length >= 6 && (
          <section className="st-card">
            <div className="st-label">Top of each scene</div>
            <div className="st-title-sm">Where you went deepest.</div>
            <div className="st-scenes">
              {I.STYLE_ATLAS.scenes.map(sc => (
                <div key={sc.style} className="st-scene">
                  <div className="st-scene-name">{sc.style}</div>
                  <div className="st-scene-n">{fmt(sc.plays)} plays</div>
                  <div className="st-scene-via">
                    {sc.artists.map((a, i) => (
                      <div key={a.name} className="st-scene-a" data-link={clickable(a.name)} onClick={() => goIf(a.name)}>
                        <GenCover hue={a.hue} name={a.name} size={32} radius={3} />
                        <div style={{ minWidth: 0 }}>
                          <div className="st-row-name" style={{ fontSize: 13 }}>{a.name}</div>
                          <div className="st-row-sub" style={{ fontSize: 11 }}>{fmt(a.plays)} plays</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* bridges — artists carrying ≥ 2 of your top scenes */}
        {I.STYLE_ATLAS && I.STYLE_ATLAS.bridges && I.STYLE_ATLAS.bridges.length >= 4 && (
          <section className="st-card">
            <div className="st-label">Bridge artists</div>
            <div className="st-title-sm">Who connects your scenes.</div>
            <div className="st-sub" style={{ marginBottom: 14 }}>
              The connector nodes — artists whose Discogs styles span ≥ 2 of your top scenes.
              These are the records that make the rest of the library cohere.
            </div>
            <div className="st-bridges">
              {I.STYLE_ATLAS.bridges.map(b => (
                <div key={b.artist} className="st-bridge" data-link={!!R.byId[b.artistId]}
                  onClick={() => R.byId[b.artistId] && go("artist", b.artistId)}>
                  <GenCover hue={b.hue} name={b.artist} size={44} radius={4} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="st-row-name">{b.artist}</div>
                    <div className="st-bridge-scenes">
                      {b.scenes.map((s, i) => (
                        <React.Fragment key={s}>
                          {i > 0 ? <span className="st-bridge-plus">+</span> : null}
                          <span className="st-bridge-scene" style={{ color: `oklch(0.78 0.13 ${b.hue + i * 18})` }}>{s}</span>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                  <div className="st-bridge-n">{fmt(b.plays)} <small style={{ color: "var(--ink-faint)" }}>plays</small></div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* style atlas — discogs styles only you (or 1-2 artists) keep alive in this library */}
        {I.STYLE_ATLAS && I.STYLE_ATLAS.rarest && I.STYLE_ATLAS.rarest.length > 3 && (() => {
          const S = I.STYLE_ATLAS;
          const sole = S.rarest.filter(r => r.artists.length === 1).length;
          return (
            <section className="st-card">
              <div className="st-label">Style atlas · {fmt(S.uniqueStyles)} distinct Discogs styles</div>
              <div className="st-title-sm">Only one or two artists hold these for you.</div>
              <div className="st-sub" style={{ marginBottom: 14 }}>
                Across {S.artistsCovered} of your artists indexed on Discogs, <em>{S.uniqueStyles}</em> distinct styles —
                {sole > 0 && <> and <em>{sole}</em> of these top ones live on a single artist in your library. </>}
                The styles you've gone deepest on with the narrowest set of carriers:
              </div>
              <div className="st-atlas">
                {S.rarest.map(r => (
                  <div key={r.style} className="st-atlas-row">
                    <div className="st-atlas-style">{r.style}</div>
                    <div className="st-atlas-via">
                      via {r.artists.map((a, i) => (
                        <React.Fragment key={a.name}>
                          {i > 0 ? <span style={{ color: "var(--ink-faint)" }}> + </span> : null}
                          <span data-link={clickable(a.name)} onClick={() => goIf(a.name)}
                            style={{ color: `oklch(0.78 0.14 ${a.hue})`, cursor: clickable(a.name) ? "pointer" : "default", fontWeight: 500 }}>
                            {a.name}
                          </span>
                        </React.Fragment>
                      ))}
                    </div>
                    <div className="st-atlas-n">{fmt(r.plays)}</div>
                  </div>
                ))}
              </div>
            </section>
          );
        })()}

        {/* gateways — for each top country, the first artist that brought it into the library */}
        {I.GEOGRAPHY && I.GEOGRAPHY.gateways && I.GEOGRAPHY.gateways.length >= 5 && (() => {
          const G = I.GEOGRAPHY.gateways;
          // pick a hero: latest gateway with substantial follow-on plays (the "lane that exploded")
          const hero = G.slice().filter(g => g.plays >= 50)
            .sort((a, b) => b.firstHeard.localeCompare(a.firstHeard))[0] || G[G.length - 1];
          const fmtMonth = (iso) => {
            const d = new Date(iso);
            return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getUTCMonth()] + " " + d.getUTCFullYear();
          };
          return (
            <section className="st-card st-hero">
              <div className="st-label">Gateways</div>
              <div className="st-big">
                {hero.flag} <em>{hero.country}</em> arrived <em>{fmtMonth(hero.firstHeard)}</em> via
                {" "}<span data-link={hero.kept} onClick={() => hero.kept && go("artist", hero.artistId)}
                  style={{ color: `oklch(0.78 0.14 ${hero.hue})`, cursor: hero.kept ? "pointer" : "default", fontStyle: "italic" }}>{hero.artist}</span>.
              </div>
              <div className="st-sub">
                For each lane in the library, the first artist who opened the door. Some gateways stayed quiet
                (one-offs like {G.find(g => g.plays < 50) ? `${G.find(g => g.plays < 50).artist} for ${G.find(g => g.plays < 50).flag}` : "passing visitors"}),
                others kicked off years of obsession.
              </div>
              <div className="st-gates">
                {G.map(g => (
                  <div key={g.code} className="st-gate" data-link={g.kept} onClick={() => g.kept && go("artist", g.artistId)}>
                    <div className="st-gate-stamp">
                      <span className="st-gate-flag">{g.flag}</span>
                      <span className="st-gate-date">{fmtMonth(g.firstHeard)}</span>
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="st-gate-country">{g.country}</div>
                      <div className="st-row-name" style={{ fontSize: 14, marginTop: 2 }}>via {g.artist}</div>
                    </div>
                    <div className="st-gate-n">{fmt(g.plays)} <small style={{ color: "var(--ink-faint)" }}>plays since</small></div>
                  </div>
                ))}
              </div>
            </section>
          );
        })()}

        {/* audio DNA drift — how the play-weighted average sound profile shifted year over year */}
        {I.AUDIO_DRIFT && I.AUDIO_DRIFT.years && I.AUDIO_DRIFT.years.length >= 12 && (() => {
          // skip pre-scrobbling synthetic years (undated remapped scrobbles)
          const Y = I.AUDIO_DRIFT.years.filter(y => y.coverage >= 1500);
          if (Y.length < 8) return null;
          const labels = {
            energy: "Energy",
            valence: "Mood",
            acoustic: "Acoustic",
            dance: "Danceable",
            tempo: "Tempo",
            instr: "Instrumental",
          };
          // deltas: last-3-year avg minus first-3-year avg, pick biggest absolute mover
          const first3 = Y.slice(0, 3), last3 = Y.slice(-3);
          const avg = (arr, ax) => arr.reduce((s, y) => s + y[ax], 0) / arr.length;
          const order = Object.keys(labels)
            .map(ax => ({ ax, delta: avg(last3, ax) - avg(first3, ax) }))
            .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
          const hue = { energy: 18, valence: 60, acoustic: 140, dance: 280, tempo: 200, instr: 340 };
          const top = order[0], second = order[1];
          const dir = d => d > 0 ? "climbed" : "dropped";
          return (
            <section className="st-card st-hero">
              <div className="st-label">How the sound drifted</div>
              <div className="st-big">
                <em>{labels[top.ax]}</em> {dir(top.delta)} {Math.round(Math.abs(top.delta) * 100)} pts.
                {" "}<em>{labels[second.ax]}</em> {dir(second.delta)} {Math.round(Math.abs(second.delta) * 100)}.
              </div>
              <div className="st-sub">
                Play-weighted average sound profile per year, across artists with audio data
                ({Math.round(Y[Y.length - 1].coverage / 1000)}k plays/yr coverage).
                The taste shifted away from pure intensity toward brighter, more danceable, more textured material.
              </div>
              <div className="st-turn">
                {order.map(({ ax }) => {
                  const series = Y.map(y => y[ax]);
                  return (
                    <div key={ax} className="st-turn-row">
                      <div className="st-turn-label">{labels[ax]}</div>
                      <Spark data={series} w={520} h={32} run={true}
                        stroke={`oklch(0.7 0.16 ${hue[ax]})`} fill={`oklch(0.7 0.16 ${hue[ax]} / .12)`} />
                      <div className="st-turn-n">{Math.round(Y[Y.length - 1][ax] * 100)}</div>
                    </div>
                  );
                })}
                <div className="st-turn-axis">
                  <span>{Y[0].year}</span>
                  <span>{Y[Math.floor(Y.length / 2)].year}</span>
                  <span>{Y[Y.length - 1].year}</span>
                </div>
              </div>
            </section>
          );
        })()}

        {/* when the taste turned — share of yearly discoveries that were underground */}
        {I.UNDERGROUND && I.UNDERGROUND.discoveryShape && I.UNDERGROUND.discoveryShape.length >= 10 && (() => {
          const D = I.UNDERGROUND.discoveryShape.filter(y => y.withStats >= 10);
          // headline year: max under-10k count
          const peak = D.slice().sort((a, b) => b.under10k - a.under10k)[0];
          // turning year: first year where ≥ 50% of new discoveries were under 50k
          const turn = D.find(y => y.under50k / y.withStats >= 0.5);
          const series50 = D.map(y => y.under50k / y.withStats);
          const series10 = D.map(y => y.under10k / y.withStats);
          const last = D[D.length - 1];
          return (
            <section className="st-card st-hero">
              <div className="st-label">When the taste turned</div>
              <div className="st-big">
                In <em>{peak.year}</em> you discovered <em>{peak.under10k}</em> artists with
                under <em>10k listeners</em> worldwide.
              </div>
              <div className="st-sub">
                The crossover happened in <em>{turn ? turn.year : "—"}</em> — the first year more than half of
                your new artists were under 50k listeners. Now it's the default: {last.year} sits at <em>{Math.round(last.under50k / last.withStats * 100)}% under 50k</em>,
                {" "}{Math.round(last.under10k / last.withStats * 100)}% under 10k.
              </div>
              <div className="st-turn">
                <div className="st-turn-row">
                  <div className="st-turn-label">under 50k listeners</div>
                  <Spark data={series50} w={520} h={36} run={true}
                    stroke="var(--accent)" fill="var(--accent-bg)" />
                  <div className="st-turn-n">{Math.round(last.under50k / last.withStats * 100)}%</div>
                </div>
                <div className="st-turn-row">
                  <div className="st-turn-label">under 10k listeners</div>
                  <Spark data={series10} w={520} h={36} run={true}
                    stroke="oklch(0.75 0.16 320)" fill="oklch(0.75 0.16 320 / .15)" />
                  <div className="st-turn-n">{Math.round(last.under10k / last.withStats * 100)}%</div>
                </div>
                <div className="st-turn-axis">
                  <span>{D[0].year}</span>
                  <span>{D[Math.floor(D.length / 2)].year}</span>
                  <span>{last.year}</span>
                </div>
              </div>
            </section>
          );
        })()}

        {/* taste arc — how the geography moved across years (origins × years) */}
        {I.GEOGRAPHY && I.GEOGRAPHY.arc && I.GEOGRAPHY.arc.years.length >= 10 && (() => {
          const A = I.GEOGRAPHY.arc;
          // hue per country code — distinct, oklch chroma 0.16
          const huesByCC = { US: 30, GB: 240, AU: 50, CA: 0, DE: 110, JP: 340 };
          // mover narrative: country that gained the most share between first year and the last 3 yrs avg
          const firstYears = A.years.slice(0, 3), lastYears = A.years.slice(-3);
          const mover = A.countries.map(c => {
            const before = firstYears.reduce((s, y) => s + (y[c.code] || 0), 0) / firstYears.length;
            const after = lastYears.reduce((s, y) => s + (y[c.code] || 0), 0) / lastYears.length;
            return { ...c, delta: after - before, after };
          }).sort((a, b) => b.delta - a.delta)[0];
          const moverYear = A.years.find(y => (y[mover.code] || 0) >= mover.after * 0.4);
          return (
            <section className="st-card st-hero">
              <div className="st-label">How the map moved</div>
              <div className="st-big">
                <em>{mover.flag} {mover.name}</em> crept in around <em>{moverYear ? moverYear.year : "—"}</em> —
                now <em>{Math.round(mover.after * 100)}%</em> of what we can place on a map.
              </div>
              <div className="st-sub">
                Each line is a country's share of your plays over time. {A.years[0].year} was {Math.round(A.years[0].US * 100)}% American;
                today the lines tangle. {A.countries.length} countries shown, the rest folded into "elsewhere."
              </div>
              <div className="st-arc">
                {A.countries.map(c => {
                  const series = A.years.map(y => y[c.code] || 0);
                  const now = series[series.length - 1];
                  const peak = Math.max(...series);
                  const peakYr = A.years[series.indexOf(peak)].year;
                  const hue = huesByCC[c.code] || 200;
                  return (
                    <div key={c.code} className="st-arc-row">
                      <div className="st-arc-head">
                        <span className="st-arc-flag">{c.flag}</span>
                        <span className="st-arc-name">{c.name}</span>
                        <span className="st-arc-now" style={{ color: `oklch(0.7 0.16 ${hue})` }}>{Math.round(now * 100)}%</span>
                      </div>
                      <Spark data={series} w={420} h={32} run={true}
                        stroke={`oklch(0.7 0.16 ${hue})`} fill={`oklch(0.7 0.16 ${hue} / .12)`} />
                      <div className="st-arc-peak">peak {Math.round(peak * 100)}% in '{String(peakYr).slice(2)}</div>
                    </div>
                  );
                })}
              </div>
              <div className="st-arc-axis">
                <span>{A.years[0].year}</span>
                <span>{A.years[Math.floor(A.years.length / 2)].year}</span>
                <span>{A.years[A.years.length - 1].year}</span>
              </div>
            </section>
          );
        })()}

        {/* taste geography */}
        {I.GEOGRAPHY && I.GEOGRAPHY.coverage > 0.3 && (() => {
          const G = I.GEOGRAPHY;
          const top = G.countries[0];
          const restShare = G.countries.slice(1, 6).reduce((s, c) => s + c.share, 0);
          return (
            <section className="st-card st-hero">
              <div className="st-label">Where the taste comes from</div>
              <div className="st-big">
                <em>{Math.round(top.share * 100)}%</em> {top.flag} <em>{top.name}</em>
                <span style={{ color: "var(--ink-soft)", fontSize: ".55em", fontStyle: "normal", marginLeft: 14 }}>
                  · {G.totalCountries} countries on the map
                </span>
              </div>
              <div className="st-sub">
                Of the {Math.round(G.coverage * 100)}% of plays we can place on a map, the rest scatter:&nbsp;
                {G.countries.slice(1, 6).map((c, i) => (
                  <React.Fragment key={c.code}>{i > 0 ? ", " : ""}{c.flag} <b style={{ color: "var(--ink)" }}>{c.name}</b> ({Math.round(c.share * 100)}%)</React.Fragment>
                ))}.
              </div>
              <div className="st-geo-grid">
                {G.countries.slice(0, 12).map(c => (
                  <div key={c.code} className="st-geo-c">
                    <div className="st-geo-flag">{c.flag || c.code}</div>
                    <div style={{ minWidth: 0 }}>
                      <div className="st-row-name">{c.name}</div>
                      <div className="st-row-sub">{fmt(c.plays)} plays · {c.artists} artists</div>
                    </div>
                    <div className="st-geo-pct">{Math.round(c.share * 100)}%</div>
                  </div>
                ))}
              </div>
              {G.cities && G.cities.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div className="st-yir-h">Cities you tap into</div>
                  <div className="st-geo-cities">
                    {G.cities.slice(0, 8).map(c => (
                      <span key={c.country + c.city} className="r-chip" style={{ fontSize: 11 }}>
                        {c.flag} {c.city} <span style={{ color: "var(--ink-faint)", fontSize: 10 }}>· {c.artists}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          );
        })()}

        <div className="st-chapter"><span>IV</span> Rhythms &amp; records</div>

        {/* streak */}
        <section className="st-card st-hero">
          <div className="st-label">The streak</div>
          <div className="st-big"><em>{I.STREAK.best} days</em> without missing one.</div>
          <div className="st-sub">From {fmtDate(I.STREAK.start)} to {fmtDate(I.STREAK.end)} you scrobbled
            every single day — nearly a year of unbroken listening. Current run: {I.STREAK.current} days.</div>
        </section>

        {/* milestones */}
        <section className="st-card">
          <div className="st-label">Milestones</div>
          <div className="st-title-sm">What the counter landed on.</div>
          <div className="st-miles">
            {I.MILESTONES.map(m => (
              <div key={m.n} className="st-mile" data-link={clickable(m.artist)} onClick={() => goIf(m.artist)}>
                <span className="st-mile-n">{m.n / 1000}k</span>
                <GenCover hue={m.hue} name={m.artist} size={38} radius={3} />
                <div style={{ minWidth: 0 }}>
                  <div className="st-row-name">{m.track}</div>
                  <div className="st-row-sub">{m.artist} · {fmtDate(m.date)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* obsessions */}
        <section className="st-card">
          <div className="st-label">Obsessions</div>
          <div className="st-title-sm">Weeks one artist ate everything.</div>
          <div className="st-grid">
            {I.OBSESSIONS.map(o => (
              <div key={o.artist + o.weekStart} className="st-obs" data-link={clickable(o.artist)} onClick={() => goIf(o.artist)}>
                <GenCover hue={o.hue} name={o.artist} size={56} radius={4} />
                <div className="st-obs-share" style={{ color: `oklch(0.78 0.14 ${o.hue})` }}>{Math.round(o.share * 100)}%</div>
                <div className="st-row-name">{o.artist}</div>
                <div className="st-row-sub">{o.plays} plays, week of {fmtDate(o.weekStart)}</div>
                <div className="st-obs-bar"><i style={{ width: (o.share * 100) + "%", background: `oklch(0.62 0.15 ${o.hue})` }} /></div>
              </div>
            ))}
          </div>
        </section>

        {/* flameouts — songs that owned a single week and were never replayed (pair with constants) */}
        {I.FLAMEOUTS && I.FLAMEOUTS.length >= 5 && (
          <section className="st-card">
            <div className="st-label">Flameouts</div>
            <div className="st-title-sm">Songs that owned one week, then vanished.</div>
            <div className="st-sub" style={{ marginBottom: 14 }}>
              The opposite of the constants — tracks where 40%+ of every play you ever gave them
              happened in a single week. A one-off obsession, then silence.
            </div>
            <div className="st-life">
              {I.FLAMEOUTS.map((t, i) => (
                <div key={t.artist + t.title} className="st-life-row"
                  data-link={t.kept} onClick={() => t.kept && go("artist", t.artistId)}>
                  <span className="r-mono" style={{ fontSize: 11, color: "var(--ink-faint)", width: 24 }}>{String(i + 1).padStart(2, "0")}</span>
                  <GenCover hue={t.hue} name={t.artist} size={36} radius={3} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="st-row-name" style={{ fontStyle: "italic" }}>{t.title}</div>
                    <div className="st-row-sub">{t.artist} · {t.peakPlays} of {t.plays} plays in the week of {fmtDate(t.peakWeek)}</div>
                  </div>
                  <div className="st-flame-pct" style={{ color: `oklch(0.78 0.14 ${t.hue})` }}>{Math.round(t.peakShare * 100)}%</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* lifetime tracks — songs that survived every era (year-span first sort, plays tiebreak) */}
        {I.LIFETIME_TRACKS && I.LIFETIME_TRACKS.length >= 5 && (() => {
          const L = I.LIFETIME_TRACKS;
          const hero = L[0];
          return (
            <section className="st-card">
              <div className="st-label">The constants</div>
              <div className="st-title-sm">Songs that survived every era.</div>
              <div className="st-sub" style={{ marginBottom: 14 }}>
                Tracks you've played across <em>{hero.yearSpan} different years</em>. They were there before the
                Tokyo phase, before Ocean Grove, before any of it — and they're still in rotation.
                "<i>{hero.title}</i>" leads with {hero.plays} plays from {hero.firstYr} to {hero.lastYr}.
              </div>
              <div className="st-life">
                {L.map((t, i) => (
                  <div key={t.artist + t.title} className="st-life-row"
                    data-link={t.kept} onClick={() => t.kept && go("artist", t.artistId)}>
                    <span className="r-mono" style={{ fontSize: 11, color: "var(--ink-faint)", width: 24 }}>{String(i + 1).padStart(2, "0")}</span>
                    <GenCover hue={t.hue} name={t.artist} size={36} radius={3} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="st-row-name" style={{ fontStyle: "italic" }}>{t.title}</div>
                      <div className="st-row-sub">{t.artist} · {t.plays} plays across {t.yearSpan} years</div>
                    </div>
                    <div className="st-life-span">
                      <span className="r-mono" style={{ fontSize: 10.5, color: "var(--ink-soft)" }}>'{String(t.firstYr).slice(2)}</span>
                      <div className="st-life-bar" style={{ background: `oklch(0.6 0.16 ${t.hue})` }} />
                      <span className="r-mono" style={{ fontSize: 10.5, color: "var(--ink-soft)" }}>'{String(t.lastYr).slice(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })()}

        {/* their era — the calendar month each top artist owned the listening (share %) */}
        {I.ARTIST_ERAS && I.ARTIST_ERAS.length >= 6 && (() => {
          const E = I.ARTIST_ERAS;
          const top = E[0];
          const monthLabel = (mk) => {
            const d = new Date(mk + "-15");
            return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getUTCMonth()] + " " + d.getUTCFullYear();
          };
          return (
            <section className="st-card st-hero">
              <div className="st-label">Their era</div>
              <div className="st-big">
                <em>{monthLabel(top.month)}</em> was <em>{Math.round(top.share * 100)}%</em>
                {" "}<span data-link={!!R.byId[top.artistId]} onClick={() => R.byId[top.artistId] && go("artist", top.artistId)}
                  style={{ color: `oklch(0.78 0.14 ${top.hue})`, cursor: R.byId[top.artistId] ? "pointer" : "default", fontStyle: "italic" }}>{top.artist}</span>.
              </div>
              <div className="st-sub">
                For each top artist, the single month where they owned the highest <em>share</em> of your listening.
                Not the month with the most plays — the month where everyone else got pushed out.
              </div>
              <div className="st-life">
                {E.map((e, i) => (
                  <div key={e.artist + e.month} className="st-life-row"
                    data-link={!!R.byId[e.artistId]} onClick={() => R.byId[e.artistId] && go("artist", e.artistId)}>
                    <span className="r-mono" style={{ fontSize: 11, color: "var(--ink-faint)", width: 24 }}>{String(i + 1).padStart(2, "0")}</span>
                    <GenCover hue={e.hue} name={e.artist} size={36} radius={3} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="st-row-name">{e.artist}</div>
                      <div className="st-row-sub">{monthLabel(e.month)} · {e.plays} of the {e.total} plays that month</div>
                    </div>
                    <div className="st-flame-pct" style={{ color: `oklch(0.78 0.14 ${e.hue})` }}>{Math.round(e.share * 100)}%</div>
                  </div>
                ))}
              </div>
            </section>
          );
        })()}

        {/* incubation — how long from first-play to peak-week, per top artist */}
        {I.INCUBATION && I.INCUBATION.length >= 6 && (() => {
          const N = I.INCUBATION;
          const slow = N.slice(0, 5);
          const fast = N.slice().reverse().slice(0, 5);
          const maxDays = slow[0].incubDays;
          const fmtIncub = (d) => d < 30 ? `${d || 0} day${d === 1 ? "" : "s"}` :
            d < 365 ? `${Math.round(d / 30)} months` : `${(d / 365).toFixed(1)} years`;
          return (
            <section className="st-card st-hero">
              <div className="st-label">The incubation</div>
              <div className="st-big">
                <em>{slow[0].artist}</em> took <em>{(slow[0].incubDays / 365).toFixed(1)} years</em> to peak.
                <em> {fast[0].artist}</em> took <em>{fast[0].incubDays || "zero"} {fast[0].incubDays === 1 ? "day" : "days"}</em>.
              </div>
              <div className="st-sub">
                For each top artist, the gap between the first time you played them and the week they peaked.
                Western mainstream marinates; the deeper cuts tend to land instantly.
              </div>
              <div className="st-incub">
                <div>
                  <div className="st-yir-h">Slow burners</div>
                  {slow.map(a => (
                    <div key={a.artist} className="st-incub-row" data-link={!!R.byId[a.artistId]} onClick={() => R.byId[a.artistId] && go("artist", a.artistId)}>
                      <GenCover hue={a.hue} name={a.artist} size={32} radius={3} />
                      <div className="st-incub-main">
                        <div className="st-row-name">{a.artist}</div>
                        <div className="st-incub-bar"><i style={{ width: (a.incubDays / maxDays * 100) + "%", background: `oklch(0.62 0.16 ${a.hue})` }} /></div>
                        <div className="st-row-sub">{fmtDate(a.firstHeard)} → {fmtDate(a.peakWeek)}</div>
                      </div>
                      <div className="st-incub-n">{fmtIncub(a.incubDays)}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="st-yir-h">Instant addictions</div>
                  {fast.map(a => (
                    <div key={a.artist} className="st-incub-row" data-link={!!R.byId[a.artistId]} onClick={() => R.byId[a.artistId] && go("artist", a.artistId)}>
                      <GenCover hue={a.hue} name={a.artist} size={32} radius={3} />
                      <div className="st-incub-main">
                        <div className="st-row-name">{a.artist}</div>
                        <div className="st-incub-bar"><i style={{ width: Math.max(2, a.incubDays / maxDays * 100) + "%", background: `oklch(0.62 0.16 ${a.hue})` }} /></div>
                        <div className="st-row-sub">discovered {fmtDate(a.firstHeard)} · peaked {fmtDate(a.peakWeek)}</div>
                      </div>
                      <div className="st-incub-n">{fmtIncub(a.incubDays)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        })()}

        {/* album obsessions — the same lens, one album-deep */}
        {I.ALBUM_OBSESSIONS && I.ALBUM_OBSESSIONS.length > 0 && (
          <section className="st-card">
            <div className="st-label">Album weeks</div>
            <div className="st-title-sm">Weeks one record ate everything.</div>
            <div className="st-grid">
              {I.ALBUM_OBSESSIONS.map(o => (
                <div key={o.artist + o.album + o.weekStart} className="st-obs"
                  data-link={!!R.byId[o.artistId]} onClick={() => R.byId[o.artistId] && go("artist", o.artistId)}>
                  <GenCover hue={o.hue} name={o.album} size={56} radius={4} />
                  <div className="st-obs-share" style={{ color: `oklch(0.78 0.14 ${o.hue})` }}>{Math.round(o.share * 100)}%</div>
                  <div className="st-row-name" style={{ fontStyle: "italic" }}>{o.album}</div>
                  <div className="st-row-sub">{o.artist} · {o.plays} plays, week of {fmtDate(o.weekStart)}</div>
                  <div className="st-obs-bar"><i style={{ width: (o.share * 100) + "%", background: `oklch(0.62 0.15 ${o.hue})` }} /></div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* comebacks */}
        <section className="st-card">
          <div className="st-label">Comebacks</div>
          <div className="st-title-sm">Gone for years. Then suddenly not.</div>
          <div className="st-list">
            {I.COMEBACKS.map(c => (
              <ArtistRow key={c.artist} name={c.artist} hue={c.hue}
                right={<span className="st-num">{yearsOf(c.gapDays)}<small> yr away</small></span>}>
                silent after {fmtDate(c.left)} — back {fmtDate(c.back)}, {fmt(c.playsAfter)} plays since
              </ArtistRow>
            ))}
          </div>
        </section>

        {/* one-day wonders */}
        <section className="st-card">
          <div className="st-label">One-day wonders</div>
          <div className="st-title-sm">Burned bright. Once.</div>
          <div className="st-list">
            {I.WONDERS.map(w => (
              <ArtistRow key={w.artist} name={w.artist} hue={w.hue}
                right={<span className="st-num">{w.plays}<small> plays</small></span>}>
                everything on {fmtDate(w.date)} — then never again
              </ArtistRow>
            ))}
          </div>
        </section>

        {/* night owls */}
        <section className="st-card">
          <div className="st-label">After midnight</div>
          <div className="st-title-sm">What only the small hours hear.</div>
          <div className="st-list">
            {I.NIGHT_OWLS.map(n => (
              <ArtistRow key={n.artist} name={n.artist} hue={n.hue}
                right={<span className="st-num">{Math.round(n.nightShare * 100)}%<small> 12–5am</small></span>}>
                {fmt(n.plays)} plays, mostly while the rest of the city sleeps
              </ArtistRow>
            ))}
          </div>
        </section>

        {/* discoveries */}
        <section className="st-card">
          <div className="st-label">First contact</div>
          <div className="st-title-sm">The track that started each obsession.</div>
          <div className="st-list">
            {I.DISCOVERIES.map(d => (
              <ArtistRow key={d.artist} name={d.artist} hue={d.hue}
                right={<span className="st-num">{fmt(d.plays)}<small> since</small></span>}>
                “{d.track}” · {fmtDate(d.date)}
              </ArtistRow>
            ))}
          </div>
        </section>

        {/* year peaks */}
        <section className="st-card">
          <div className="st-label">The heaviest day of every year</div>
          <div className="st-title-sm">Annual single-day records.</div>
          <div className="st-peaks">
            {I.YEAR_PEAKS.map(p => (
              <div key={p.year} className="st-peak" data-link={clickable(p.artist)} onClick={() => goIf(p.artist)}>
                <span className="st-peak-y">{p.year}</span>
                <span className="st-peak-n">{p.count}</span>
                <span className="st-peak-a" style={{ color: `oklch(0.74 0.12 ${p.hue})` }}>{p.artist}</span>
                <span className="st-peak-d">{fmtDate(p.date).slice(0, -5)}</span>
              </div>
            ))}
          </div>
        </section>

      </div>

      <style>{`
        .st-feed { max-width: 780px; margin: 0 auto; display: grid; gap: var(--gap); }
        /* desktop: two-column magazine flow — chapters span both columns, cards never split */
        @media (min-width: 1150px) {
          .st-feed { display: block; columns: 2; column-gap: var(--gap); max-width: 1520px; }
          .st-feed > section { break-inside: avoid; margin-bottom: var(--gap); }
          .st-feed > .st-chapter { column-span: all; break-inside: avoid; margin-bottom: var(--gap); }
        }
        .st-card { background: var(--panel); border: 1px solid var(--rule); border-radius: 8px; padding: 26px 28px; }
        .st-hero { padding: 34px 32px; }
        .st-label { font-family: var(--mono); font-size: 9.5px; letter-spacing: .22em; text-transform: uppercase;
          color: var(--accent); margin-bottom: 14px; }
        .st-big { font-family: var(--serif); font-size: clamp(24px, 3.4vw, 36px); line-height: 1.12; letter-spacing: -.015em; }
        .st-big em { font-style: italic; }
        .st-big[data-link="true"] { cursor: pointer; }
        .st-sub { color: var(--ink-soft); font-size: 14px; line-height: 1.55; margin-top: 12px; max-width: 560px; }
        .st-title-sm { font-family: var(--serif); font-style: italic; font-size: 21px; margin-bottom: 18px; }
        .st-list { display: grid; gap: 4px; }
        .st-row { display: flex; gap: 14px; align-items: center; padding: 9px 10px; margin: 0 -10px; border-radius: 6px;
          transition: background .15s; }
        .st-row[data-link="true"] { cursor: pointer; }
        .st-row[data-link="true"]:hover { background: var(--bg-3); }
        .st-row-name { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .st-row-sub { font-size: 12px; color: var(--ink-faint); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .st-row-right { flex: none; }
        .st-num { font-family: var(--serif); font-size: 22px; font-variant-numeric: tabular-nums; }
        .st-num small { font-family: var(--mono); font-size: 9px; letter-spacing: .1em; text-transform: uppercase;
          color: var(--ink-faint); margin-left: 5px; }
        .st-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; }
        .st-obs { border: 1px solid var(--rule); border-radius: 6px; padding: 14px; position: relative; transition: border-color .15s; }
        .st-obs[data-link="true"] { cursor: pointer; }
        .st-obs[data-link="true"]:hover { border-color: var(--rule-2); }
        .st-obs-share { position: absolute; top: 12px; right: 14px; font-family: var(--serif); font-size: 24px; }
        .st-obs .st-row-name { margin-top: 12px; }
        .st-obs-bar { height: 3px; background: var(--bg-3); border-radius: 2px; margin-top: 10px; overflow: hidden; }
        .st-obs-bar i { display: block; height: 100%; border-radius: 2px; }
        .st-ug-cuts { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 8px; margin-top: 18px; }
        .st-ug-cut { display: flex; gap: 12px; align-items: center; padding: 8px 10px; border: 1px solid var(--rule);
          border-radius: 6px; transition: border-color .15s; }
        .st-ug-cut[data-link="true"] { cursor: pointer; }
        .st-ug-cut[data-link="true"]:hover { border-color: var(--accent-dim); }
        .st-yir-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
        .st-yir-nav { display: flex; align-items: center; gap: 6px; }
        .st-yir-nav button { width: 28px; height: 28px; border: 1px solid var(--line); background: transparent; color: var(--ink-soft);
          border-radius: 5px; font-size: 16px; line-height: 1; cursor: pointer; transition: .15s; }
        .st-yir-nav button:hover:not(:disabled) { border-color: var(--accent-dim); color: var(--ink); }
        .st-yir-nav button:disabled { opacity: .3; cursor: default; }
        .st-yir-y { font-family: var(--serif); font-style: italic; font-size: 22px; min-width: 64px; text-align: center; }
        .st-yir-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-top: 22px;
          padding: 14px 0; border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule); }
        .st-yir-n { font-family: var(--serif); font-size: clamp(20px, 2.4vw, 28px); line-height: 1; }
        .st-yir-l { font-family: var(--mono); font-size: 9.5px; color: var(--ink-faint); letter-spacing: .12em;
          text-transform: uppercase; margin-top: 6px; }
        .st-yir-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 18px; }
        .st-yir-h { font-family: var(--mono); font-size: 10px; color: var(--ink-faint); letter-spacing: .12em;
          text-transform: uppercase; margin-bottom: 10px; }
        .st-yir-jump { margin-top: 16px; padding: 11px 14px; background: var(--bg-3); border-radius: 5px; font-size: 13.5px; cursor: default; }
        .st-yir-jump[data-link="true"] { cursor: pointer; }
        .st-yir-jump[data-link="true"]:hover { background: var(--bg-4, var(--bg-3)); }
        .st-geo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 8px; margin-top: 22px; }
        .st-geo-c { display: flex; gap: 12px; align-items: center; padding: 9px 11px; border: 1px solid var(--rule); border-radius: 6px; }
        .st-geo-flag { font-size: 22px; line-height: 1; flex: none; width: 30px; text-align: center; }
        .st-geo-pct { font-family: var(--serif); font-style: italic; font-size: 18px; color: var(--accent); margin-left: auto; flex: none; }
        .st-geo-cities { display: flex; gap: 6px; flex-wrap: wrap; }
        .st-flame-pct { font-family: var(--serif); font-style: italic; font-size: 18px; flex: none; }
        .st-turn { display: grid; gap: 10px; margin-top: 22px; }
        .st-turn-row { display: grid; grid-template-columns: 160px 1fr 60px; gap: 18px; align-items: center; }
        .st-turn-label { font-family: var(--mono); font-size: 10.5px; color: var(--ink-faint); letter-spacing: .1em; text-transform: uppercase; }
        .st-turn-n { font-family: var(--serif); font-style: italic; font-size: 17px; text-align: right; }
        .st-turn-axis { display: flex; justify-content: space-between; padding-left: 178px;
          font-family: var(--mono); font-size: 10px; color: var(--ink-faint); letter-spacing: .1em; margin-top: 4px; }
        @media (max-width: 700px) {
          .st-turn-row { grid-template-columns: 1fr; gap: 2px; }
          .st-turn-n { text-align: left; }
          .st-turn-axis { padding-left: 0; }
        }
        .st-life { display: grid; gap: 4px; }
        .st-life-row { display: grid; grid-template-columns: 24px 36px 1fr 110px; gap: 12px; align-items: center;
          padding: 7px 8px; margin: 0 -8px; border-radius: 5px; }
        .st-life-row[data-link="true"] { cursor: pointer; }
        .st-life-row[data-link="true"]:hover { background: var(--bg-3); }
        .st-life-span { display: flex; align-items: center; gap: 6px; }
        .st-life-bar { flex: 1; height: 2px; border-radius: 1px; opacity: .65; }
        @media (max-width: 700px) {
          /* 4 cols on mobile: 4th col is auto so Flameouts %ages still fit. Lifetime's span moves to row 2. */
          .st-life-row { grid-template-columns: 20px 32px 1fr auto; gap: 9px; padding: 6px 6px; }
          .st-life-span { grid-column: 1 / -1; padding-left: 60px; }
          .st-flame-pct { font-size: 15px; }
          .st-row-name { font-size: 13.5px; }
          .st-row-sub { font-size: 11.5px; }
        }
        .st-gates { display: grid; gap: 4px; margin-top: 18px; }
        .st-gate { display: grid; grid-template-columns: 110px 1fr auto; gap: 16px; align-items: center;
          padding: 10px 12px; margin: 0 -12px; border-radius: 5px; }
        .st-gate[data-link="true"] { cursor: pointer; }
        .st-gate[data-link="true"]:hover { background: var(--bg-3); }
        .st-gate-stamp { display: flex; align-items: center; gap: 8px; }
        .st-gate-flag { font-size: 20px; line-height: 1; }
        .st-gate-date { font-family: var(--mono); font-size: 10.5px; color: var(--ink-faint); letter-spacing: .08em; text-transform: uppercase; }
        .st-gate-country { font-family: var(--serif); font-style: italic; font-size: 16px; }
        .st-gate-n { font-family: var(--serif); font-size: 15px; flex: none; }
        @media (max-width: 700px) {
          .st-gate { grid-template-columns: auto 1fr auto; gap: 10px; }
          .st-gate-stamp { flex-direction: column; align-items: flex-start; gap: 2px; }
        }
        .st-bridges { display: grid; gap: 8px; }
        .st-bridge { display: flex; gap: 12px; align-items: center; padding: 9px 11px; border: 1px solid var(--rule); border-radius: 6px; transition: border-color .15s; }
        .st-bridge[data-link="true"] { cursor: pointer; }
        .st-bridge[data-link="true"]:hover { border-color: var(--accent-dim); }
        .st-bridge-scenes { display: flex; gap: 8px; flex-wrap: wrap; align-items: baseline; margin-top: 4px; font-size: 12.5px; }
        .st-bridge-scene { font-family: var(--serif); font-style: italic; font-weight: 500; }
        .st-bridge-plus { color: var(--ink-faint); font-family: var(--mono); font-size: 11px; }
        .st-bridge-n { font-family: var(--serif); font-size: 17px; flex: none; margin-left: auto; }
        .st-incub { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 22px; }
        .st-incub-row { display: grid; grid-template-columns: 32px 1fr auto; gap: 10px; align-items: center;
          padding: 7px 8px; margin: 0 -8px; border-radius: 5px; }
        .st-incub-row[data-link="true"] { cursor: pointer; }
        .st-incub-row[data-link="true"]:hover { background: var(--bg-3); }
        .st-incub-main { min-width: 0; }
        .st-incub-bar { height: 3px; background: var(--bg-3); border-radius: 2px; margin: 4px 0 3px; overflow: hidden; }
        .st-incub-bar i { display: block; height: 100%; border-radius: 2px; transition: width .8s; }
        .st-incub-n { font-family: var(--serif); font-style: italic; font-size: 15px; color: var(--accent);
          white-space: nowrap; flex: none; }
        @media (max-width: 700px) { .st-incub { grid-template-columns: 1fr; gap: 18px; } }
        .st-arc { display: grid; gap: 14px; margin-top: 22px; }
        .st-arc-row { display: grid; grid-template-columns: 200px 1fr 110px; gap: 18px; align-items: center; }
        .st-arc-head { display: flex; gap: 9px; align-items: baseline; min-width: 0; }
        .st-arc-flag { font-size: 18px; line-height: 1; flex: none; }
        .st-arc-name { font-size: 13.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .st-arc-now { font-family: var(--serif); font-style: italic; font-size: 17px; margin-left: auto; }
        .st-arc-peak { font-family: var(--mono); font-size: 10.5px; color: var(--ink-faint); text-align: right; }
        .st-arc-axis { display: flex; justify-content: space-between; margin: 8px 0 0; padding-left: 218px;
          font-family: var(--mono); font-size: 10px; color: var(--ink-faint); letter-spacing: .1em; }
        @media (max-width: 760px) {
          .st-arc-row { grid-template-columns: 1fr; gap: 4px; }
          .st-arc-peak { text-align: left; }
          .st-arc-axis { padding-left: 0; }
        }
        .st-atlas { display: grid; gap: 4px; }
        .st-atlas-row { display: grid; grid-template-columns: minmax(140px, 1fr) 2fr auto; gap: 16px;
          align-items: baseline; padding: 9px 10px; margin: 0 -10px; border-radius: 5px; font-size: 13px; }
        .st-atlas-row:hover { background: var(--bg-3); }
        .st-atlas-style { font-family: var(--serif); font-style: italic; font-size: 17px; }
        .st-atlas-via { font-size: 12.5px; color: var(--ink-soft); }
        .st-atlas-n { font-family: var(--mono); font-size: 11px; color: var(--ink-faint); }
        .st-scenes { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
        .st-scene { border: 1px solid var(--rule); border-radius: 6px; padding: 14px 14px 12px; }
        .st-scene-name { font-family: var(--serif); font-style: italic; font-size: 19px; line-height: 1; }
        .st-scene-n { font-family: var(--mono); font-size: 10px; color: var(--ink-faint); letter-spacing: .12em;
          text-transform: uppercase; margin-top: 5px; margin-bottom: 10px; }
        .st-scene-via { display: grid; gap: 7px; }
        .st-scene-a { display: flex; gap: 9px; align-items: center; padding: 4px 0; }
        .st-scene-a[data-link="true"] { cursor: pointer; }
        .st-scene-a[data-link="true"]:hover .st-row-name { color: var(--accent); }
        @media (max-width: 700px) {
          .st-atlas-row { grid-template-columns: 1fr auto; gap: 6px 12px; }
          .st-atlas-via { grid-column: 1 / -1; font-size: 12px; }
        }
        @media (max-width: 700px) {
          .st-yir-stats { grid-template-columns: repeat(2, 1fr); gap: 14px 18px; }
          .st-yir-grid { grid-template-columns: 1fr; gap: 18px; }
        }
        .st-miles { display: grid; gap: 10px; }
        .st-mile { display: flex; gap: 13px; align-items: center; padding: 6px 8px; margin: 0 -8px; border-radius: 6px; }
        .st-mile[data-link="true"] { cursor: pointer; }
        .st-mile[data-link="true"]:hover { background: var(--bg-3); }
        .st-mile-n { font-family: var(--serif); font-style: italic; font-size: 19px; width: 52px; flex: none;
          color: var(--accent); }
        .st-peaks { display: grid; gap: 2px; }
        .st-peak { display: grid; grid-template-columns: 48px 52px 1fr auto; gap: 12px; align-items: baseline;
          padding: 7px 10px; margin: 0 -10px; border-radius: 5px; font-size: 13px; }
        .st-peak[data-link="true"] { cursor: pointer; }
        .st-peak[data-link="true"]:hover { background: var(--bg-3); }
        .st-peak-y { font-family: var(--mono); font-size: 11px; color: var(--ink-faint); }
        .st-peak-n { font-family: var(--serif); font-size: 18px; }
        .st-peak-a { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .st-peak-d { font-family: var(--mono); font-size: 10px; color: var(--ink-faint); }
        @media (max-width: 700px) {
          .st-card { padding: 20px 18px; }
          .st-hero { padding: 24px 20px; }
          .st-grid { grid-template-columns: 1fr 1fr; }
          .st-peak { grid-template-columns: 42px 44px 1fr; }
          .st-peak-d { display: none; }
        }

        /* ── TOC + chapters (Stories overhaul v1) ── */
        .st-toc { position: sticky; top: 0; z-index: 30; display: flex; gap: 6px; overflow-x: auto;
          padding: 10px 2px; margin: -6px 0 16px; background: rgba(11,10,15,.86);
          backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
          scrollbar-width: none; -webkit-overflow-scrolling: touch; }
        .st-toc::-webkit-scrollbar { display: none; }
        .st-toc button { flex: none; padding: 5px 11px; border-radius: 999px; border: 1px solid var(--rule);
          background: transparent; color: var(--ink-faint); font-family: var(--mono); font-size: 9px;
          letter-spacing: .1em; text-transform: uppercase; cursor: pointer; white-space: nowrap;
          transition: color .15s, border-color .15s; }
        .st-toc button:hover { color: var(--ink); border-color: var(--rule-2); }
        .st-toc button[data-on="true"] { color: var(--accent); border-color: var(--accent-dim); }
        .st-fresh { display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: var(--accent);
          margin-right: 6px; vertical-align: 1px; }
        .st-chapter { display: flex; align-items: baseline; gap: 12px; margin: 26px 2px 2px;
          font-family: var(--serif); font-style: italic; font-size: 24px; color: var(--ink); }
        .st-chapter span { font-family: var(--mono); font-style: normal; font-size: 10px;
          letter-spacing: .2em; color: var(--accent); }
        .st-chapter::after { content: ""; flex: 1; height: 1px; background: var(--rule); align-self: center; }

        /* Stories TOC as a vertical breadcrumb rail pinned to the left edge (wide screens).
           Dots-only by default so it never sits over content; labels reveal on hover only. */
        @media (min-width: 1240px) {
          .st-toc { position: fixed; left: 16px; top: 50%; transform: translateY(-50%);
            flex-direction: column; gap: 0; overflow: visible; margin: 0; padding: 0;
            background: none; backdrop-filter: none; -webkit-backdrop-filter: none;
            max-height: 86vh; z-index: 40; width: auto; }
          .st-toc button { position: relative; flex: none; display: flex; align-items: center; gap: 11px;
            min-height: 24px; padding: 6px 0; border: none; border-radius: 0; background: none;
            text-align: left; color: var(--ink-faint); white-space: nowrap; }
          .st-toc button::before { content: ""; position: absolute; left: 3.25px; top: -50%; height: 100%;
            width: 1.5px; background: var(--rule); z-index: 0; }
          .st-toc button:first-child::before { display: none; }
          .st-toc button[data-reached="true"]::before { background: var(--accent-dim); }
          .st-node { position: relative; z-index: 1; width: 8px; height: 8px; flex: none; border-radius: 50%;
            border: 1.5px solid var(--rule-2); background: #0b0a0f;
            transition: transform .2s, background .2s, border-color .2s, box-shadow .2s; }
          .st-toc button[data-reached="true"] .st-node { border-color: var(--accent-dim); }
          .st-toc button[data-on="true"] .st-node { background: var(--accent); border-color: var(--accent);
            transform: scale(1.25); box-shadow: 0 0 0 4px var(--accent-bg); }
          /* label chip: hidden until you hover the rail, then floats over content readably */
          .st-toc-lbl { max-width: 0; overflow: hidden; opacity: 0; border-radius: 4px;
            transition: max-width .3s ease, opacity .2s ease, padding .3s ease; }
          .st-toc:hover .st-toc-lbl { max-width: 260px; opacity: 1; padding: 3px 9px;
            background: rgba(11,10,15,.94); box-shadow: 0 6px 18px -8px rgba(0,0,0,.8); }
          .st-toc button[data-on="true"] { color: var(--accent); }
          .st-toc button[data-on="true"] .st-toc-lbl { color: var(--accent); }
          .st-toc button:hover { color: var(--ink); }
        }

        /* ── mobile pass ── */
        @media (max-width: 700px) {
          .st-ug-cuts { grid-template-columns: 1fr 1fr; gap: 6px; }
          .st-ug-cut { padding: 8px; }
          .st-big { font-size: 19px; line-height: 1.45; }
          .st-chapter { font-size: 20px; margin-top: 18px; }
          .st-row-right { font-size: 12px; }
        }
        @media (max-width: 420px) {
          .st-ug-cuts { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}

// ════════════════════════ GIGS ════════════════════════
// Attended concerts (setlist.fm → ROTATION.GIGS), joined to the listening data.
function GigsView({ go }) {
  const R = window.ROTATION, G = R.GIGS;
  if (!G || !G.gigs || !G.gigs.length) return (
    <div style={{ maxWidth: 720, margin: "60px auto", textAlign: "center", color: "var(--ink-soft)" }}>No attended concerts yet.</div>
  );
  const openArtist = (id) => R.byId[id] && go("artist", id);
  const years = [...new Set(G.gigs.map(g => g.year))].sort((a, b) => b - a);
  const span = G.firstGig.slice(0, 4) + "–" + G.lastGig.slice(0, 4);
  const maxCity = Math.max(...G.cityList.map(c => c.count));
  const Tile = ({ a, sub }) => (
    <div className="gv-tile" data-link={!!R.byId[a.artistId]} onClick={() => openArtist(a.artistId)}>
      <GenCover hue={a.hue} name={a.artist} size={40} radius={4} />
      <div style={{ minWidth: 0 }}>
        <div className="gv-tile-name">{a.artist}</div>
        <div className="gv-tile-sub">{sub(a)}</div>
      </div>
    </div>
  );
  return (
    <div className="gv">
      <header className="gv-hero">
        <div className="gv-kicker">Attended · setlist.fm</div>
        <h1 className="gv-h1">You've stood in the crowd for <em>{G.total}</em> shows.</h1>
        <p className="gv-lead">
          {G.artists} artists across {G.cities} cities in {G.countries} countries, {span}.
          {" "}{fmt(G.songsSeen)} songs played to you live — <b>{G.inLibrary}</b> of these acts are in your rotation.
        </p>
        <div className="gv-stats">
          {[["shows", G.total], ["artists", G.artists], ["cities", G.cities], ["songs seen", G.songsSeen]].map(([l, n]) => (
            <div key={l} className="gv-stat"><div className="gv-stat-n">{fmt(n)}</div><div className="gv-stat-l">{l}</div></div>
          ))}
        </div>
      </header>

      {G.seenTop.length > 0 && (
        <section className="gv-sec">
          <div className="gv-label">Seen &amp; loved</div>
          <div className="gv-title">The acts you play the most, live in the room.</div>
          <div className="gv-tiles">
            {G.seenTop.map(a => <Tile key={a.artistId} a={a} sub={(x) => `${fmt(x.plays)} plays`} />)}
          </div>
        </section>
      )}

      {G.preFans.length > 0 && (
        <section className="gv-sec">
          <div className="gv-label">Before you were a fan</div>
          <div className="gv-title">You saw them first — the obsession came later.</div>
          <div className="gv-tiles">
            {G.preFans.map(a => <Tile key={a.artistId} a={a} sub={(x) => `saw ${fmtDate(x.date)} · now ${fmt(x.plays)} plays`} />)}
          </div>
        </section>
      )}

      {G.strangers.length > 0 && (
        <section className="gv-sec">
          <div className="gv-label">Passed through</div>
          <div className="gv-title">Caught live — festival stages, support slots — but never in rotation.</div>
          <div className="gv-tiles">
            {G.strangers.map(a => (
              <div key={a.artistId} className="gv-tile" style={{ cursor: "default" }}>
                <GenCover hue={a.hue} name={a.artist} size={40} radius={4} />
                <div style={{ minWidth: 0 }}>
                  <div className="gv-tile-name">{a.artist}</div>
                  <div className="gv-tile-sub">{a.city} · {a.songCount} songs</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {G.cityList.length > 1 && (
        <section className="gv-sec">
          <div className="gv-label">Where</div>
          <div className="gv-title">The cities that put you in a crowd.</div>
          <div className="gv-cities">
            {G.cityList.map(c => (
              <div key={c.countryCode + c.city} className="gv-city">
                <span className="gv-city-name">{c.city} <small>{c.country}</small></span>
                <div className="gv-city-bar"><i style={{ width: (c.count / maxCity * 100) + "%" }} /></div>
                <span className="gv-city-n">{c.count}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="gv-sec">
        <div className="gv-label">The timeline</div>
        <div className="gv-title">Every night, newest first.</div>
        {years.map(y => (
          <div key={y} className="gv-year-block">
            <div className="gv-year">{y}<span>{G.byYear[y]} {G.byYear[y] === 1 ? "show" : "shows"}</span></div>
            <div className="gv-gigs">
              {G.gigs.filter(g => g.year === y).map((g, i) => (
                <div key={g.artist + g.date + i} className="gv-gig" data-link={!!R.byId[g.artistId]} onClick={() => openArtist(g.artistId)}>
                  <div className="gv-gig-date">{fmtDate(g.date).replace(/ (\d{4})$/, "")}</div>
                  <span className="gv-gig-dot" style={{ background: `oklch(0.68 0.16 ${g.hue})` }} />
                  <div className="gv-gig-main">
                    <div className="gv-gig-artist">{g.artist}{g.tour ? <span className="gv-gig-tour"> · {g.tour}</span> : null}</div>
                    <div className="gv-gig-venue">{g.venue}{g.city ? ` · ${g.city}` : ""}</div>
                    {g.knownSongs.length > 0 && (
                      <div className="gv-gig-songs">
                        heard live, in your rotation: {g.knownSongs.map((s, j) => (
                          <React.Fragment key={s.title}>{j > 0 ? ", " : ""}<b>{s.title}</b></React.Fragment>
                        ))}{g.knownCount > g.knownSongs.length ? ` +${g.knownCount - g.knownSongs.length}` : ""}
                      </div>
                    )}
                  </div>
                  <div className="gv-gig-meta">
                    {g.plays > 0 ? <span className="gv-gig-plays">{fmt(g.plays)}<small>plays</small></span> : null}
                    {g.songCount > 0 ? <span className="gv-gig-set">{g.songCount}<small>songs</small></span> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <div className="gv-foot">Attended-show data from your setlist.fm profile · {G.fetched}</div>

      <style>{`
        .gv { max-width: 900px; margin: 0 auto; }
        .gv-hero { padding: 12px 2px 26px; }
        .gv-kicker { font-family: var(--mono); font-size: 9.5px; letter-spacing: .22em; text-transform: uppercase; color: var(--accent); margin-bottom: 14px; }
        .gv-h1 { font-family: var(--serif); font-size: clamp(26px, 4vw, 42px); line-height: 1.1; letter-spacing: -.02em; margin: 0; }
        .gv-h1 em { font-style: italic; }
        .gv-lead { color: var(--ink-soft); font-size: 15px; line-height: 1.6; margin: 14px 0 0; max-width: 620px; }
        .gv-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 24px; max-width: 560px; }
        .gv-stat { border: 1px solid var(--rule); border-radius: 8px; padding: 14px 12px; }
        .gv-stat-n { font-family: var(--serif); font-size: 26px; font-variant-numeric: tabular-nums; }
        .gv-stat-l { font-family: var(--mono); font-size: 9px; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-faint); margin-top: 4px; }
        .gv-sec { margin-top: 40px; }
        .gv-label { font-family: var(--mono); font-size: 9.5px; letter-spacing: .22em; text-transform: uppercase; color: var(--accent); margin-bottom: 8px; }
        .gv-title { font-family: var(--serif); font-style: italic; font-size: 21px; margin-bottom: 16px; }
        .gv-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 8px; }
        .gv-tile { display: flex; gap: 12px; align-items: center; padding: 8px 10px; border: 1px solid var(--rule); border-radius: 6px; transition: border-color .15s; }
        .gv-tile[data-link="true"] { cursor: pointer; }
        .gv-tile[data-link="true"]:hover { border-color: var(--rule-2); }
        .gv-tile-name { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .gv-tile-sub { font-size: 11.5px; color: var(--ink-faint); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .gv-cities { display: grid; gap: 8px; max-width: 560px; }
        .gv-city { display: grid; grid-template-columns: 150px 1fr 34px; gap: 12px; align-items: center; }
        .gv-city-name { font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .gv-city-name small { color: var(--ink-faint); font-size: 11px; }
        .gv-city-bar { height: 7px; background: var(--bg-3); border-radius: 4px; overflow: hidden; }
        .gv-city-bar i { display: block; height: 100%; background: var(--accent); border-radius: 4px; }
        .gv-city-n { font-family: var(--mono); font-size: 11px; color: var(--ink-faint); text-align: right; }
        .gv-year-block { margin-bottom: 6px; }
        .gv-year { display: flex; align-items: baseline; gap: 12px; font-family: var(--serif); font-size: 24px; margin: 22px 2px 8px; }
        .gv-year span { font-family: var(--mono); font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-faint); }
        .gv-year::after { content: ""; flex: 1; height: 1px; background: var(--rule); align-self: center; }
        .gv-gigs { display: grid; gap: 2px; }
        .gv-gig { display: grid; grid-template-columns: 88px 10px 1fr auto; gap: 12px; align-items: start; padding: 10px; margin: 0 -10px; border-radius: 6px; transition: background .15s; }
        .gv-gig[data-link="true"] { cursor: pointer; }
        .gv-gig[data-link="true"]:hover { background: var(--bg-3); }
        .gv-gig-date { font-family: var(--mono); font-size: 11px; color: var(--ink-faint); padding-top: 3px; white-space: nowrap; }
        .gv-gig-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 5px; }
        .gv-gig-artist { font-size: 14.5px; font-weight: 600; }
        .gv-gig-tour { font-weight: 400; font-style: italic; color: var(--ink-faint); font-size: 12.5px; }
        .gv-gig-venue { font-size: 12px; color: var(--ink-soft); margin-top: 1px; }
        .gv-gig-songs { font-size: 11.5px; color: var(--ink-faint); margin-top: 5px; line-height: 1.5; }
        .gv-gig-songs b { color: var(--ink-soft); font-weight: 500; }
        .gv-gig-meta { display: flex; gap: 12px; align-items: baseline; text-align: right; }
        .gv-gig-plays, .gv-gig-set { font-family: var(--serif); font-size: 16px; font-variant-numeric: tabular-nums; white-space: nowrap; }
        .gv-gig-set { color: var(--ink-soft); }
        .gv-gig-meta small { font-family: var(--mono); font-size: 8px; letter-spacing: .1em; text-transform: uppercase; color: var(--ink-faint); margin-left: 4px; }
        .gv-foot { margin: 40px 0 20px; font-family: var(--mono); font-size: 10px; color: var(--ink-faint); text-align: center; letter-spacing: .05em; }
        @media (max-width: 700px) {
          .gv-stats { grid-template-columns: 1fr 1fr; }
          .gv-tiles { grid-template-columns: 1fr; }
          .gv-city { grid-template-columns: 110px 1fr 30px; }
          .gv-gig { grid-template-columns: 64px 8px 1fr; }
          .gv-gig-meta { grid-column: 3; justify-content: flex-start; margin-top: 4px; }
          .gv-gig-date { font-size: 10px; }
        }
      `}</style>
    </div>
  );
}

// ════════════════════════ SEARCH ════════════════════════
function SearchOverlay({ open, onClose, go }) {
  const R = window.ROTATION;
  const [q, setQ] = React.useState("");
  const [ready, setReady] = React.useState(!!window.ROTATION_SEARCH);
  const [mediaReady, setMediaReady] = React.useState(!!window.ROTATION_MEDIA);
  const [sel, setSel] = React.useState(null);
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    if (!open) return;
    setQ(""); setSel(null);
    const load = (src, has, done) => { if (window[has]) return; const s = document.createElement("script"); s.src = src; s.onload = done; document.head.appendChild(s); };
    load("search-index.js", "ROTATION_SEARCH", () => setReady(true));
    load("media-index.js", "ROTATION_MEDIA", () => setMediaReady(true));   // albums + songs (big, lazy)
    setTimeout(() => inputRef.current && inputRef.current.focus(), 40);
  }, [open]);

  // accent-insensitive so "americain" finds "à l'américaine", "bjork" finds "Björk", etc.
  const deAccent = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  // also match the romanised form of kana names, so "midori" finds ミドリ, "boris" finds ボリス
  const romaMatch = (name, needle) => KANA_RE.test(name) && deAccent(kanaToRomaji(name)).includes(needle);

  const results = React.useMemo(() => {
    if (!ready || !q.trim()) return [];
    const needle = deAccent(q.trim());
    const starts = [], contains = [];
    for (const row of window.ROTATION_SEARCH) {
      const lo = deAccent(row[0]);
      if (lo.startsWith(needle)) starts.push(row);
      else if (lo.includes(needle) || romaMatch(row[0], needle)) contains.push(row);
      if (starts.length > 60) break;
    }
    return starts.concat(contains).slice(0, 30);
  }, [q, ready]);

  // songs + albums by title (the lazy media index; rows = [title, artistIdx, plays], sorted by plays)
  const media = React.useMemo(() => {
    const M = window.ROTATION_MEDIA;
    if (!q.trim() || !M) return { tracks: [], albums: [] };
    const needle = deAccent(q.trim());
    const scan = (rows) => { const out = []; for (const r of rows) { if (deAccent(r[0]).includes(needle) || romaMatch(r[0], needle)) { out.push(r); if (out.length >= 10) break; } } return out; };
    return { tracks: scan(M.tracks), albums: scan(M.albums) };
  }, [q, mediaReady]);

  if (!open) return null;

  const resolveId = (name) => { const s = R.slug(name); if (R.byId[s]) return s; const a = R.idForName && R.idForName(name); if (a) return a; if (R.expById && R.expById[s]) return s; return null; };
  const pick = (row) => {
    const id = resolveId(row[0]);   // kept OR explore (mini) page — only fall back to the blurb if neither
    if (id) { onClose(); go("artist", id); }
    else setSel(sel && sel[0] === row[0] ? null : row);
  };
  // song row → the track's own page (audio DNA + your play history), works for any song
  const pickMedia = (artist, title) => { onClose(); go("track", R.slug(artist) + "~" + R.slug(title)); };
  // album row → the album's own page (works for any album)
  const pickAlbum = (artist, title) => { onClose(); go("album", R.slug(artist) + "~" + R.slug(title)); };

  return (
    <div className="se-veil" onClick={onClose}>
      <div className="se-panel" onClick={e => e.stopPropagation()}>
        <div className="se-bar">
          <span className="se-glyph">⌕</span>
          <input ref={inputRef} value={q} onChange={e => { setQ(e.target.value); setSel(null); }}
            placeholder={ready ? `search artists, albums & songs you've played…` : "loading your library…"}
            spellCheck={false} />
          <button className="se-x" onClick={onClose}>esc</button>
        </div>
        {q.trim() && (() => {
          const mArt = (window.ROTATION_MEDIA && window.ROTATION_MEDIA.artists) || [];
          const nothing = ready && mediaReady && results.length === 0 && media.tracks.length === 0 && media.albums.length === 0;
          return (
          <div className="se-results">
            {nothing && <div className="se-empty">Nothing. You've truly never played “{q.trim()}”.</div>}

            {results.length > 0 && <div className="se-group">Artists</div>}
            {results.map(row => {
              const [name, plays, first, last, peakYear, peakPlays] = row;
              const inLib = !!R.byId[R.slug(name)];
              const isSel = sel && sel[0] === name;
              return (
                <div key={"a-" + name}>
                  <div className="se-row" onClick={() => pick(row)}>
                    <GenCover hue={hueOfName(name)} name={name} size={36} radius={3} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="se-name">{name} {inLib && <span className="se-tag">profiled</span>}</div>
                      <div className="se-sub">{first.slice(0, 4)} — {last.slice(0, 4)} · peak {peakYear}</div>
                    </div>
                    <span className="se-plays">{fmt(plays)}<small>plays</small></span>
                  </div>
                  {isSel && (
                    <div className="se-story">
                      You first played <b>{name}</b> on {fmtDate(first)}, last on {fmtDate(last)}.
                      {" "}{fmt(plays)} plays in total — the deepest year was <b>{peakYear}</b> with {fmt(peakPlays)} of them.
                    </div>
                  )}
                </div>
              );
            })}

            {media.tracks.length > 0 && <div className="se-group">Songs</div>}
            {media.tracks.map(([title, ai, plays], i) => { const name = mArt[ai] || ""; return (
              <div key={"s-" + i} className="se-row" onClick={() => pickMedia(name, title)}>
                <GenCover hue={hueOfName(name)} name={name} size={36} radius={3} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="se-name">{title}</div>
                  <div className="se-sub">{name}</div>
                </div>
                <span className="se-plays">{fmt(plays)}<small>plays</small></span>
              </div>); })}

            {media.albums.length > 0 && <div className="se-group">Albums</div>}
            {media.albums.map((row, i) => { const [title, ai, plays] = row, name = mArt[ai] || "", cover = row[6] || ""; return (
              <div key={"al-" + i} className="se-row" onClick={() => pickAlbum(name, title)}>
                <GenCover hue={hueOfName(name)} name={title} image={cover} thumb={cover} size={36} radius={3} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="se-name">{title}</div>
                  <div className="se-sub">{name}</div>
                </div>
                <span className="se-plays">{fmt(plays)}<small>plays</small></span>
              </div>); })}

            {results.length > 0 && !mediaReady && <div className="se-loading">searching songs & albums…</div>}
          </div>
          );
        })()}
      </div>
      <style>{`
        .se-veil { position: fixed; inset: 0; z-index: 900; background: rgba(8,7,12,.78);
          backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
          display: flex; justify-content: center; align-items: flex-start; padding: 12vh 18px 18px;
          animation: rFade .18s ease; }
        .se-panel { width: 100%; max-width: 600px; background: var(--panel); border: 1px solid var(--rule-2);
          border-radius: 10px; overflow: hidden; box-shadow: 0 30px 80px rgba(0,0,0,.55); }
        .se-bar { display: flex; align-items: center; gap: 12px; padding: 16px 18px; }
        .se-glyph { font-size: 18px; color: var(--ink-faint); }
        .se-bar input { flex: 1; background: transparent; border: 0; outline: 0; color: var(--ink);
          font-family: var(--sans); font-size: 17px; }
        .se-bar input::placeholder { color: var(--ink-faint); }
        .se-x { font-family: var(--mono); font-size: 9px; letter-spacing: .12em; text-transform: uppercase;
          background: var(--bg-3); color: var(--ink-faint); border: 1px solid var(--rule); border-radius: 5px;
          padding: 5px 8px; cursor: pointer; }
        .se-results { max-height: 56vh; overflow-y: auto; border-top: 1px solid var(--rule); padding: 8px; }
        .se-group { font-family: var(--mono); font-size: 8.5px; letter-spacing: .16em; text-transform: uppercase;
          color: var(--ink-faint); padding: 10px 10px 4px; }
        .se-group:first-child { padding-top: 4px; }
        .se-loading { font-family: var(--mono); font-size: 10px; color: var(--ink-faint); padding: 10px; text-align: center; }
        .se-empty { padding: 22px 14px; font-family: var(--serif); font-style: italic; color: var(--ink-soft); }
        .se-row { display: flex; gap: 12px; align-items: center; padding: 9px 10px; border-radius: 6px; cursor: pointer; }
        .se-row:hover { background: var(--bg-3); }
        .se-name { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .se-tag { font-family: var(--mono); font-size: 8px; letter-spacing: .12em; text-transform: uppercase;
          color: var(--accent); border: 1px solid var(--accent-dim); border-radius: 4px; padding: 1.5px 5px; margin-left: 7px;
          vertical-align: 2px; }
        .se-sub { font-family: var(--mono); font-size: 10px; color: var(--ink-faint); margin-top: 2px; }
        .se-plays { font-family: var(--serif); font-size: 17px; font-variant-numeric: tabular-nums; flex: none; }
        .se-plays small { font-family: var(--mono); font-size: 8px; letter-spacing: .1em; text-transform: uppercase;
          color: var(--ink-faint); margin-left: 4px; }
        .se-story { margin: 2px 10px 10px 58px; padding: 12px 14px; background: var(--accent-bg);
          border-radius: 6px; font-family: var(--serif); font-size: 13.5px; line-height: 1.55; color: var(--ink-soft); }
        .se-story b { color: var(--ink); font-weight: 600; }
      `}</style>
    </div>
  );
}

Object.assign(window, { StoriesView, SearchOverlay });
