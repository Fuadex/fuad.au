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
function StoriesView({ t, go }) {
  const R = window.ROTATION;
  const I = R.INSIGHTS;
  const goIf = (name) => { const id = R.slug(name); if (R.byId[id]) go("artist", id); };
  const clickable = (name) => !!R.byId[R.slug(name)];

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

      <div className="st-feed">

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
              <div><div className="st-yir-n">{fmt(yr.tracks)}</div><div className="st-yir-l">tracks</div></div>
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
        @media (max-width: 640px) {
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
        @media (max-width: 640px) {
          .st-card { padding: 20px 18px; }
          .st-hero { padding: 24px 20px; }
          .st-grid { grid-template-columns: 1fr 1fr; }
          .st-peak { grid-template-columns: 42px 44px 1fr; }
          .st-peak-d { display: none; }
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
  const [sel, setSel] = React.useState(null);
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    if (!open) return;
    setQ(""); setSel(null);
    if (!window.ROTATION_SEARCH) {
      const s = document.createElement("script");
      s.src = "search-index.js";
      s.onload = () => setReady(true);
      document.head.appendChild(s);
    }
    setTimeout(() => inputRef.current && inputRef.current.focus(), 40);
  }, [open]);

  const results = React.useMemo(() => {
    if (!ready || !q.trim()) return [];
    const needle = q.trim().toLowerCase();
    const starts = [], contains = [];
    for (const row of window.ROTATION_SEARCH) {
      const lo = row[0].toLowerCase();
      if (lo.startsWith(needle)) starts.push(row);
      else if (lo.includes(needle)) contains.push(row);
      if (starts.length > 60) break;
    }
    return starts.concat(contains).slice(0, 30);
  }, [q, ready]);

  if (!open) return null;

  const pick = (row) => {
    const id = R.slug(row[0]);
    if (R.byId[id]) { onClose(); go("artist", id); }
    else setSel(sel && sel[0] === row[0] ? null : row);
  };

  return (
    <div className="se-veil" onClick={onClose}>
      <div className="se-panel" onClick={e => e.stopPropagation()}>
        <div className="se-bar">
          <span className="se-glyph">⌕</span>
          <input ref={inputRef} value={q} onChange={e => { setQ(e.target.value); setSel(null); }}
            placeholder={ready ? `search ${fmt(window.ROTATION_SEARCH.length)} artists you've played…` : "loading your library…"}
            spellCheck={false} />
          <button className="se-x" onClick={onClose}>esc</button>
        </div>
        {q.trim() && (
          <div className="se-results">
            {results.length === 0 && ready && (
              <div className="se-empty">Nothing. You've truly never played “{q.trim()}”.</div>
            )}
            {results.map(row => {
              const [name, plays, first, last, peakYear, peakPlays] = row;
              const inLib = !!R.byId[R.slug(name)];
              const isSel = sel && sel[0] === name;
              return (
                <div key={name}>
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
          </div>
        )}
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
