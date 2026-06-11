// rotation-explore.jsx — unified explorer: one filter (time × genre) over three lenses
// (Ranking · Sound · Rhythm). Replaces the old Charts / Eras / Sound Map / Clock tabs.
// The filter bar is the whole point: pick "2022 · Japanese" once and every lens answers
// for that slice. Cross-tabs come from build-data.js (yp / CLOCK_CUBE / SOUND_BY_YEAR / YEARS).

// flat-168 → 7×24 grid (cell = ((day+6)%7)*24 + hour)
const _inflate = (flat) => Array.from({ length: 7 }, (_, r) => flat.slice(r * 24, r * 24 + 24));
const _zeros = () => Array.from({ length: 7 }, () => new Array(24).fill(0));

// ── data resolvers (pure, driven by the shared {year, fam} filter) ──
function rhythmGrid(R, year, fam) {
  if (fam == null && year == null) return R.CLOCK.grid;
  if (fam == null) return R.CLOCK_BY_YEAR[year] ? _inflate(R.CLOCK_BY_YEAR[year]) : _zeros();
  if (year != null) { const g = (R.CLOCK_CUBE[year] || {})[fam]; return g ? _inflate(g) : _zeros(); }
  const acc = new Array(168).fill(0); // family across all years → Σ cube
  for (const y in R.CLOCK_CUBE) { const g = R.CLOCK_CUBE[y][fam]; if (g) for (let i = 0; i < 168; i++) acc[i] += g[i]; }
  return _inflate(acc);
}

function rankingItems(R, kind, year, fam) {
  const famOk = (aid) => fam == null || ((R.byId[aid] || {}).fam === fam);
  if (kind === "artists") {
    const map = (a, v) => ({ id: a.id, label: a.name, value: v, hue: a.hue, sub: (a.styles && a.styles[0]) || a.tags[0], fam: a.fam });
    let arr = year == null ? R.ARTISTS.map(a => map(a, a.plays))
      : R.ARTISTS.filter(a => a.yp && a.yp[year]).map(a => map(a, a.yp[year]));
    if (fam != null) arr = arr.filter(a => a.fam === fam);
    return arr.sort((a, b) => b.value - a.value).slice(0, 30);
  }
  let src;
  if (year == null) {
    const base = kind === "albums" ? R.ALBUMS : R.TRACKS;
    src = base.map(a => ({ id: a.id, aid: a.artistId, label: a.title, value: a.plays, hue: a.hue, sub: a.artist }));
  } else {
    const yr = R.YEARS.find(y => y.year === year) || {};
    src = (yr[kind] || []).map((it, i) => ({ id: kind + year + i, aid: it.artistId, label: it.title, value: it.plays, hue: it.hue, sub: it.artist }));
  }
  if (fam != null) src = src.filter(it => famOk(it.aid));
  return src.sort((a, b) => b.value - a.value).slice(0, 24);
}

function soundSubs(R, year) {
  const base = R.GENRES.flatMap(f => f.subs.map(s => ({ ...s, family: f.family, hue: f.hue })));
  if (year == null) return base;
  // keep every sub (even at w=0) so the scatter morphs radius→0 instead of unmounting
  const wy = R.SOUND_BY_YEAR[year] || {};
  return base.map(s => ({ ...s, w: wy[s.name] || 0 }));
}

function ExploreView({ t, go, setPop }) {
  const R = window.ROTATION;
  const [tab, setTab] = React.useState("ranking");   // ranking | sound | rhythm
  const [kind, setKind] = React.useState("artists"); // artists | albums | tracks
  const [year, setYear] = React.useState(null);      // null = all time
  const [fam, setFam] = React.useState(null);        // null = all genres; else famIdx
  const [ref, seen] = useInView();

  const yearKeys = React.useMemo(() => Object.keys(R.CLOCK_BY_YEAR).map(Number).sort((a, b) => a - b), [R]);
  const famName = fam == null ? null : (R.FAMILIES.find(f => f.i === fam) || {}).family;
  const slice = (year == null ? "All time" : year) + (famName ? " · " + famName : "");

  return (
    <div className="r-view xp" ref={ref}>
      <div className="r-viewhead">
        <div>
          <div className="r-kicker">Explore · {slice}</div>
          <h1 className="r-title">Dig <em>through</em><span className="dot">.</span></h1>
        </div>
        <div className="r-seg xp-tabs">
          {[["ranking", "Ranking"], ["sound", "Sound"], ["rhythm", "Rhythm"]].map(([k, lbl]) =>
            <button key={k} data-on={tab === k} onClick={() => setTab(k)}>{lbl}</button>)}
        </div>
      </div>

      {/* ── shared filter bar ── */}
      <div className="xp-filters r-card">
        <div className="xp-frow">
          <span className="xp-flabel">Time</span>
          <div className="xp-chiprow">
            <button className="xp-chip" data-on={year == null} onClick={() => setYear(null)}>All</button>
            {yearKeys.map(y => (
              <button key={y} className="xp-chip" data-on={year === y} onClick={() => setYear(year === y ? null : y)}>
                {"'" + String(y).slice(2)}
              </button>
            ))}
          </div>
        </div>
        <div className="xp-frow">
          <span className="xp-flabel">Genre</span>
          <div className="xp-chiprow">
            <button className="xp-chip" data-on={fam == null} onClick={() => setFam(null)}>All</button>
            {R.FAMILIES.map(f => (
              <button key={f.i} className="xp-chip xp-chip-g" data-on={fam === f.i}
                onClick={() => setFam(fam === f.i ? null : f.i)}>
                <span className="xp-dot" style={{ background: `oklch(0.62 0.16 ${f.hue})` }} />
                {f.family}
              </button>
            ))}
          </div>
        </div>
      </div>

      {year != null && <YearDetail R={R} go={go} year={year} />}

      {tab === "ranking" && <RankingPanel R={R} t={t} go={go} setPop={setPop} kind={kind} setKind={setKind} year={year} fam={fam} seen={seen} />}
      {tab === "sound" && <SoundPanel R={R} t={t} setPop={setPop} year={year} fam={fam} famName={famName} setFam={setFam} seen={seen} />}
      {tab === "rhythm" && <RhythmPanel R={R} year={year} fam={fam} setPop={setPop} seen={seen} />}

      <style>{`
        .xp-tabs { align-self: flex-end; }
        .xp-filters { padding: 14px 16px; margin-bottom: var(--gap); display: grid; gap: 10px; }
        .xp-frow { display: grid; grid-template-columns: 52px 1fr; gap: 10px; align-items: start; }
        .xp-flabel { font-family: var(--mono); font-size: 9.5px; letter-spacing: .14em; text-transform: uppercase;
          color: var(--ink-faint); padding-top: 7px; }
        .xp-chiprow { display: flex; flex-wrap: wrap; gap: 6px; }
        .xp-chip { font-family: var(--mono); font-size: 10.5px; letter-spacing: .04em; padding: 5px 10px;
          border-radius: 999px; border: 1px solid var(--rule); background: transparent; color: var(--ink-soft);
          cursor: pointer; transition: .14s; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
        .xp-chip:hover { border-color: var(--ink-faint); color: var(--ink); }
        .xp-chip[data-on="true"] { background: var(--accent); border-color: var(--accent); color: #0c0a08; }
        .xp-chip[data-on="true"] .xp-dot { box-shadow: 0 0 0 1.5px #0c0a08; }
        .xp-dot { width: 9px; height: 9px; border-radius: 3px; flex: none; }
        .xp-empty { padding: 60px 20px; text-align: center; color: var(--ink-faint);
          font-family: var(--mono); font-size: 12px; letter-spacing: .04em; }
        .xp-yeardetail { padding: 18px 22px; margin-bottom: var(--gap); }
        .xp-yd-head { display: flex; align-items: baseline; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
        .xp-yd-year { font-size: 40px; line-height: .9; }
        .xp-yd-title { font-family: var(--serif); font-style: italic; font-size: 19px; line-height: 1.1; }
        .xp-yd-sub { color: var(--ink-soft); font-size: 12.5px; margin-top: 3px; }
        .era-d-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 16px 22px; }
        .era-d-stat { min-width: 0; }
        .era-d-stat[data-link="true"] { cursor: pointer; }
        .era-d-stat[data-link="true"]:hover .era-d-v { color: var(--accent); }
        .era-d-k { font-size: 9.5px; color: var(--ink-faint); letter-spacing: .12em; text-transform: uppercase; margin-bottom: 4px; }
        .era-d-v { font-family: var(--serif); font-style: italic; font-size: 17px; line-height: 1.15;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .era-d-sub { font-size: 11.5px; color: var(--ink-soft); margin-top: 3px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        @media (max-width: 640px) {
          .xp-frow { grid-template-columns: 1fr; gap: 6px; }
          .xp-flabel { padding-top: 0; }
          .xp-chiprow { overflow-x: auto; flex-wrap: nowrap; padding-bottom: 4px; -webkit-overflow-scrolling: touch; }
          .xp-tabs { align-self: stretch; }
          .era-d-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </div>
  );
}

// ── YEAR DETAIL ── the editorial strip that lived in the old Eras view: headline +
// top track/album/peak day/discovery/jump for the selected year (data from R.YEARS).
function YearDetail({ R, go, year }) {
  const yr = (R.YEARS || []).find(y => y.year === year);
  if (!yr || yr.plays < 300) return null;
  const headline = (typeof ERA_HEADLINE !== "undefined" && ERA_HEADLINE[year]) || ["", ""];
  const open = (name) => go("artist", R.idForName(name) || R.slug(name));
  const Stat = ({ k, v, sub, onClick }) => (
    <div className="era-d-stat" data-link={!!onClick} onClick={onClick}>
      <div className="r-mono era-d-k">{k}</div>
      <div className="era-d-v">{v}</div>
      {sub && <div className="era-d-sub">{sub}</div>}
    </div>
  );
  return (
    <div className="r-card xp-yeardetail">
      <div className="xp-yd-head">
        <div className="r-stat-n xp-yd-year">{year}</div>
        {headline[0] && <div>
          <div className="xp-yd-title">{headline[0]}</div>
          <div className="xp-yd-sub">{headline[1]}</div>
        </div>}
      </div>
      <div className="era-d-grid">
        {yr.topTrack && <Stat k="Top track" v={yr.topTrack.title}
          sub={`${yr.topTrack.artist} · ${yr.topTrack.plays} plays`} onClick={() => open(yr.topTrack.artist)} />}
        {yr.topAlbum && <Stat k="Top album" v={yr.topAlbum.title}
          sub={`${yr.topAlbum.artist} · ${yr.topAlbum.plays} plays`} onClick={() => open(yr.topAlbum.artist)} />}
        {yr.peakDay && <Stat k="Peak day" v={yr.peakDay.plays + " plays"} sub={yr.peakDay.date} />}
        <Stat k="Hours" v={fmt(yr.hours)} sub={`${yr.activeDays} active days`} />
        <Stat k="Artists touched" v={fmt(yr.artists)} sub={`${fmt(yr.tracks)} tracks`} />
        {yr.discoveries[0] && <Stat k="Top discovery" v={yr.discoveries[0].name}
          sub={`${yr.discoveries[0].plays} plays · first heard ${year}`} onClick={() => open(yr.discoveries[0].name)} />}
        {yr.gainer && yr.gainer.delta > 50 && <Stat k="Biggest jump" v={yr.gainer.name}
          sub={`${yr.gainer.prev} → ${yr.gainer.plays} (+${yr.gainer.delta})`} onClick={() => open(yr.gainer.name)} />}
      </div>
    </div>
  );
}

// ── RANKING ── reuses WallGrid / Bars / BubbleField from rotation-views1
function RankingPanel({ R, t, go, setPop, kind, setKind, year, fam, seen }) {
  const items = rankingItems(R, kind, year, fam);
  const onClick = (it) => go("artist", it.aid || it.id);
  return (
    <div>
      <div className="r-seg" style={{ marginBottom: "var(--gap)" }}>
        {["artists", "albums", "tracks"].map(k =>
          <button key={k} data-on={kind === k} onClick={() => setKind(k)}>{k}</button>)}
      </div>
      {items.length === 0 ? (
        <div className="r-card xp-empty">Nothing in this slice — try a wider time range or genre.</div>
      ) : t.layout === "bars" ? (
        <Bars items={items.slice(0, 18)} run={seen} expressive={t.chart === "expressive"} onClick={onClick}
          onHover={(it, el) => {
            if (!it) return setPop(null);
            const r = el.getBoundingClientRect();
            setPop({ x: r.left + 120, y: r.top, title: it.label, pip: it.hue, meta: kind.slice(0, -1),
              rows: [["plays", fmt(it.value)], ["·", it.sub]], hint: "click → artist ↗" });
          }} />
      ) : t.layout === "bubbles" ? (
        <BubbleField items={items} seen={seen} setPop={setPop} onClick={onClick} expressive={t.chart === "expressive"} />
      ) : (
        <WallGrid items={items} kind={kind} seen={seen} setPop={setPop} onClick={onClick} />
      )}
    </div>
  );
}

// ── SOUND ── reuses SoundScatter from rotation-views2; year reshapes weights, genre highlights.
// Two modes: "map" (scatter + family rail) and "families" (per-family subgenre breakdown cards).
function SoundPanel({ R, t, setPop, year, fam, famName, setFam, seen }) {
  const [mode, setMode] = React.useState("map");
  const subs = soundSubs(R, year);
  const live = subs.filter(s => s.w > 0);
  const maxW = Math.max(1, ...subs.map(s => s.w));
  const totalW = live.reduce((s, x) => s + x.w, 0) || 1;
  const famTotals = R.FAMILIES.map(f => ({ ...f, w: live.filter(s => s.family === f.family).reduce((a, s) => a + s.w, 0) }))
    .filter(f => f.w > 0).sort((a, b) => b.w - a.w);

  return (
    <div>
      <div className="r-seg" style={{ marginBottom: "var(--gap)" }}>
        {["map", "families"].map(m => <button key={m} data-on={mode === m} onClick={() => setMode(m)}>{m}</button>)}
      </div>

      {mode === "map" && (
        <div className="m-stack" style={{ display: "grid", gridTemplateColumns: "1fr 210px", gap: "var(--gap)", alignItems: "start" }}>
          <div className="r-card" style={{ padding: 0, position: "relative", overflow: "hidden", minHeight: 200 }}>
            {live.length === 0
              ? <div className="xp-empty">No tagged listening in {year}.</div>
              : <SoundScatter subs={subs} maxW={maxW} seen={seen} activeFam={famName}
                  expressive={t.chart === "expressive"} setPop={setPop} />}
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <div className="r-mono" style={{ fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: 2 }}>Families {year ? "· " + year : ""}</div>
            {famTotals.map(f => (
              <div key={f.family} onClick={() => setFam(fam === f.i ? null : f.i)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 9px", borderRadius: 5, cursor: "pointer",
                  background: fam === f.i ? "var(--bg-3)" : "transparent", transition: ".15s" }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: `oklch(0.62 0.16 ${f.hue})`, flex: "none" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.family}</div>
                  <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)" }}>{(f.w / totalW * 100).toFixed(0)}% · {fmtK(f.w)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {mode === "families" && (
        <SoundFamilies R={R} live={live} totalW={totalW} expressive={t.chart === "expressive"} seen={seen} fam={fam} setFam={setFam} year={year} />
      )}
    </div>
  );
}

// per-family subgenre breakdown — bars sized within each family, year-aware via `live` subs
function SoundFamilies({ R, live, totalW, expressive, seen, fam, setFam, year }) {
  const groups = R.FAMILIES.map(f => ({
    ...f,
    subs: live.filter(s => s.family === f.family).sort((a, b) => b.w - a.w),
    w: live.filter(s => s.family === f.family).reduce((a, s) => a + s.w, 0),
  })).filter(g => g.subs.length).sort((a, b) => b.w - a.w);

  if (groups.length === 0) return <div className="r-card xp-empty">No tagged listening in {year}.</div>;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px,1fr))", gap: "var(--gap)" }}>
      {groups.map((f, fi) => {
        const fmax = Math.max(1, ...f.subs.map(s => s.w));
        const on = fam === f.i;
        return (
          <div key={f.family} className="r-card" style={{ padding: 18, cursor: "pointer",
            boxShadow: on ? "inset 0 0 0 1px var(--accent)" : "none", transition: ".15s" }}
            onClick={() => setFam(on ? null : f.i)}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: `oklch(0.62 0.16 ${f.hue})` }} />
              <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 20 }}>{f.family}</div>
              <span className="r-mono" style={{ marginLeft: "auto", fontSize: 10, color: "var(--ink-faint)" }}>{fmtK(f.w)} · {(f.w / totalW * 100).toFixed(0)}%</span>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {f.subs.map((s, si) => (
                <div key={s.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>{s.name}</span>
                    <span className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)" }}>{fmt(s.w)}</span>
                  </div>
                  <div style={{ height: 6, background: "var(--bg-3)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: (seen ? s.w / fmax * 100 : 0) + "%",
                      background: expressive ? `oklch(0.6 0.16 ${f.hue})` : "var(--accent)", opacity: .85,
                      borderRadius: 3, transition: `width .8s cubic-bezier(.3,.8,.3,1) ${(fi * 0.03 + si * 0.05)}s` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── RHYTHM ── self-contained heatmap + side stats, driven by the {year, fam} cube ──
function RhythmPanel({ R, year, fam, setPop, seen }) {
  const days = R.CLOCK.days;
  const grid = rhythmGrid(R, year, fam);
  const max = Math.max(1, ...grid.flat());
  const total = grid.flat().reduce((a, b) => a + b, 0);
  const hourTotals = Array.from({ length: 24 }, (_, h) => days.reduce((s, _, di) => s + grid[di][h], 0));
  const dayTotals = grid.map(row => row.reduce((a, b) => a + b, 0));
  const peakHour = hourTotals.indexOf(Math.max(...hourTotals));
  const nightShare = total ? (hourTotals.slice(0, 5).reduce((a, b) => a + b, 0) / total * 100) : 0;
  const hr = (h) => (h % 12 === 0 ? 12 : h % 12) + (h < 12 ? "a" : "p");
  const cell = (v) => {
    const x = v / max;
    return { background: x < 0.04 ? "var(--bg-3)" : `oklch(${0.28 + x * 0.5} ${0.05 + x * 0.12} var(--acc-h))`, opacity: seen ? 1 : 0 };
  };

  if (total === 0) return <div className="r-card xp-empty">No plays recorded in this slice.</div>;

  return (
    <div className="m-stack" style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: "var(--gap)", alignItems: "start" }}>
      <div className="r-card" style={{ padding: "20px 22px 16px" }}>
        <div className="clk-scroll">
          <div style={{ display: "grid", gridTemplateColumns: "34px repeat(24, 1fr)", gap: 3, marginBottom: 5 }}>
            <div />
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="r-mono" style={{ fontSize: 7.5, color: "var(--ink-faint)", textAlign: "center" }}>{h % 3 === 0 ? hr(h) : ""}</div>
            ))}
          </div>
          {days.map((d, di) => (
            <div key={d} style={{ display: "grid", gridTemplateColumns: "34px repeat(24, 1fr)", gap: 3, marginBottom: 3 }}>
              <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-soft)", display: "flex", alignItems: "center" }}>{d}</div>
              {grid[di].map((v, h) => (
                <div key={h} title={`${d} ${hr(h)} · ${v}`}
                  style={{ aspectRatio: "1", borderRadius: 2, cursor: "pointer", transition: "opacity .4s, transform .12s", ...cell(v) }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.35)"; e.currentTarget.style.boxShadow = "0 0 0 1.5px var(--accent)";
                    const r = e.currentTarget.getBoundingClientRect();
                    setPop({ x: r.left + r.width / 2, y: r.top, title: `${d}, ${hr(h)}`, pip: "var(--acc-h)", meta: "listening",
                      rows: [["plays", fmt(v)], ["of peak", Math.round(v / max * 100) + "%"]] }); }}
                  onClick={(e) => { const r = e.currentTarget.getBoundingClientRect();
                    setPop({ x: r.left + r.width / 2, y: r.top, title: `${d}, ${hr(h)}`, pip: "var(--acc-h)", meta: "listening",
                      rows: [["plays", fmt(v)], ["of peak", Math.round(v / max * 100) + "%"]] }); }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; setPop(null); }} />
              ))}
            </div>
          ))}
          <div style={{ display: "grid", gridTemplateColumns: "34px 1fr", gap: 0, marginTop: 16, alignItems: "end" }}>
            <div />
            <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: 54 }}>
              {hourTotals.map((v, h) => (
                <div key={h} style={{ flex: 1, height: (seen ? v / Math.max(...hourTotals, 1) * 100 : 0) + "%",
                  background: h === peakHour ? "var(--accent)" : "var(--rule-2)", borderRadius: "2px 2px 0 0",
                  transition: `height .6s cubic-bezier(.3,.8,.3,1) ${h * 0.014}s` }} title={`${hr(h)} · ${v}`} />
              ))}
            </div>
          </div>
        </div>
      </div>

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
                <div style={{ height: "100%", width: (seen ? dayTotals[i] / Math.max(...dayTotals, 1) * 100 : 0) + "%",
                  background: "var(--accent-dim)", borderRadius: 4, transition: "width .7s cubic-bezier(.3,.8,.3,1)" }} />
              </div>
              <span className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", textAlign: "right" }}>{Math.round(dayTotals[i] / total * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
