// rotation-explore.jsx — faceted explorer: one filter set {time · genre · subgenre · clock-slots}
// over Ranking + Sound, with a persistent, selectable Rhythm clock at the bottom that doubles as
// a time-of-day filter. Cross-tabs from build-data.js (yp / fam / CLOCK_CUBE / SOUND_BY_YEAR /
// SUB_ARTISTS / ARTIST_CLOCK / YEARS). Pick a slice once; every lens answers for it.

const _inflate = (flat) => Array.from({ length: 7 }, (_, r) => flat.slice(r * 24, r * 24 + 24));
const _zeros = () => Array.from({ length: 7 }, () => new Array(24).fill(0));

// rhythm grid for the {year, fam} slice (sub/cells are reflected via highlight, not aggregation)
function rhythmGrid(R, year, fam) {
  if (fam == null && year == null) return R.CLOCK.grid;
  if (fam == null) return R.CLOCK_BY_YEAR[year] ? _inflate(R.CLOCK_BY_YEAR[year]) : _zeros();
  if (year != null) { const g = (R.CLOCK_CUBE[year] || {})[fam]; return g ? _inflate(g) : _zeros(); }
  const acc = new Array(168).fill(0);
  for (const y in R.CLOCK_CUBE) { const g = R.CLOCK_CUBE[y][fam]; if (g) for (let i = 0; i < 168; i++) acc[i] += g[i]; }
  return _inflate(acc);
}

// plays by an artist inside a set of selected clock cells (Set<number 0..167>)
function tsPlays(R, id, cells) {
  const arr = R.ARTIST_CLOCK[id];
  if (!arr) return 0;
  let s = 0;
  for (const [c, n] of arr) if (cells.has(c)) s += n;
  return s;
}

function rankingItems(R, kind, f) {
  const { year, fam, sub, cells } = f;
  const hasCells = cells && cells.size > 0;
  const subSet = sub ? new Set(R.SUB_ARTISTS[sub] || []) : null;
  if (kind === "artists") {
    const arr = R.ARTISTS.filter(a => {
      if (year != null && !(a.yp && a.yp[year])) return false;
      if (fam != null && a.fam !== fam) return false;
      if (subSet && !subSet.has(a.id)) return false;
      if (hasCells && tsPlays(R, a.id, cells) === 0) return false;
      return true;
    }).map(a => ({
      id: a.id, label: a.name, hue: a.hue, sub: (a.styles && a.styles[0]) || a.tags[0], fam: a.fam,
      value: hasCells ? tsPlays(R, a.id, cells) : (year != null ? a.yp[year] : a.plays),
    }));
    return arr.sort((x, y) => y.value - x.value).slice(0, 30);
  }
  let src;
  if (year == null) {
    const base = kind === "albums" ? R.ALBUMS : R.TRACKS;
    src = base.map(a => ({ id: a.id, aid: a.artistId, label: a.title, value: a.plays, hue: a.hue, sub: a.artist }));
  } else {
    const yr = R.YEARS.find(y => y.year === year) || {};
    src = (yr[kind] || []).map((it, i) => ({ id: kind + year + i, aid: it.artistId, label: it.title, value: it.plays, hue: it.hue, sub: it.artist }));
  }
  if (fam != null) src = src.filter(it => (R.byId[it.aid] || {}).fam === fam);
  if (subSet) src = src.filter(it => subSet.has(it.aid));
  if (hasCells) src = src.filter(it => tsPlays(R, it.aid, cells) > 0);
  return src.sort((a, b) => b.value - a.value).slice(0, 24);
}

function soundSubs(R, year) {
  const base = R.GENRES.flatMap(f => f.subs.map(s => ({ ...s, family: f.family, hue: f.hue })));
  if (year == null) return base;
  const wy = R.SOUND_BY_YEAR[year] || {};
  return base.map(s => ({ ...s, w: wy[s.name] || 0 })); // keep zeros so the scatter morphs
}

// ── faceted search: map a typed query to navigations (artist/album/track) or filter-sets
// (genre / subgenre / year / time-of-day). Each category is capped so the dropdown stays tight.
function timeMatches(R, q) {
  if (q.length < 2) return [];
  const days = R.CLOCK.days, all7 = [0, 1, 2, 3, 4, 5, 6], allH = Array.from({ length: 24 }, (_, h) => h);
  const cellsFrom = (ds, hs) => { const c = []; for (const d of ds) for (const h of hs) c.push(d * 24 + h); return c; };
  const out = [];
  const defs = [
    [["late night", "night", "late"], "Late night · 12–5 AM", all7, [0, 1, 2, 3, 4]],
    [["morning"], "Morning · 6–11 AM", all7, [6, 7, 8, 9, 10, 11]],
    [["afternoon", "arvo"], "Afternoon · 12–5 PM", all7, [12, 13, 14, 15, 16, 17]],
    [["evening"], "Evening · 6–11 PM", all7, [18, 19, 20, 21, 22, 23]],
    [["weekend"], "Weekend", [5, 6], allH],
    [["weekday", "weekdays", "week day"], "Weekdays", [0, 1, 2, 3, 4], allH],
  ];
  for (const [kws, label, ds, hs] of defs) if (kws.some(k => k.startsWith(q) || k.includes(q))) out.push({ type: "time", label, cells: cellsFrom(ds, hs) });
  ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].forEach((dn, i) => {
    if (dn.startsWith(q)) out.push({ type: "time", label: days[i], cells: cellsFrom([i], allH) });
  });
  const m = /^(\d{1,2})\s*(am|pm)$/.exec(q);
  if (m) { let h = parseInt(m[1], 10) % 12; if (m[2] === "pm") h += 12; out.push({ type: "time", label: `${m[1]} ${m[2].toUpperCase()}`, cells: cellsFrom(all7, [h]) }); }
  if ("midnight".startsWith(q) && q.length >= 3) out.push({ type: "time", label: "Midnight", cells: cellsFrom(all7, [0]) });
  if ("noon".startsWith(q) && q.length >= 2) out.push({ type: "time", label: "Noon", cells: cellsFrom(all7, [12]) });
  return out.slice(0, 4);
}

function computeResults(R, yearKeys, subIndex, raw) {
  const q = (raw || "").trim().toLowerCase();
  if (q.length < 2) return [];
  const inc = (s) => s && s.toLowerCase().includes(q);
  return [
    { type: "artist", label: "Artists", items: R.ARTISTS.filter(a => inc(a.name)).slice(0, 5).map(a => ({ type: "artist", label: a.name, id: a.id, dot: a.hue })) },
    { type: "genre", label: "Genres", items: R.FAMILIES.filter(f => inc(f.family)).slice(0, 3).map(f => ({ type: "genre", label: f.family, famIdx: f.i, dot: f.hue })) },
    { type: "sub", label: "Subgenres", items: [...subIndex.keys()].filter(inc).slice(0, 5).map(n => ({ type: "sub", label: n, name: n, famIdx: subIndex.get(n) })) },
    { type: "album", label: "Albums", items: R.ALBUMS.filter(a => inc(a.title)).slice(0, 3).map(a => ({ type: "album", label: a.title, sub: a.artist, id: a.artistId, dot: a.hue })) },
    { type: "track", label: "Tracks", items: R.TRACKS.filter(a => inc(a.title)).slice(0, 3).map(a => ({ type: "track", label: a.title, sub: a.artist, id: a.artistId, dot: a.hue })) },
    { type: "year", label: "Years", items: yearKeys.filter(y => String(y).includes(q)).slice(0, 4).map(y => ({ type: "year", label: String(y), year: y })) },
    { type: "time", label: "Times", items: timeMatches(R, q) },
  ];
}

function ExploreSearch({ R, yearKeys, onArtist, onFam, onSub, onYear, onCells }) {
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const boxRef = React.useRef(null);
  const subIndex = React.useMemo(() => {
    const m = new Map(), famByName = {};
    R.FAMILIES.forEach(f => famByName[f.family] = f.i);
    for (const f of R.GENRES) for (const s of f.subs) if (!m.has(s.name)) m.set(s.name, famByName[f.family]);
    return m;
  }, [R]);
  const groups = React.useMemo(() => computeResults(R, yearKeys, subIndex, q), [R, yearKeys, subIndex, q]);
  const flat = groups.flatMap(g => g.items);

  const pick = (it) => {
    setQ(""); setOpen(false);
    if (it.type === "artist" || it.type === "album" || it.type === "track") onArtist(it.id);
    else if (it.type === "genre") onFam(it.famIdx);
    else if (it.type === "sub") onSub(it.name, it.famIdx);
    else if (it.type === "year") onYear(it.year);
    else if (it.type === "time") onCells(it.cells);
  };

  return (
    <div className="xp-search" ref={boxRef}
      onBlur={(e) => { if (!boxRef.current || !boxRef.current.contains(e.relatedTarget)) setOpen(false); }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
      </svg>
      <input value={q} placeholder="Search artists, genres, years, times…"
        onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === "Enter" && flat[0]) pick(flat[0]); if (e.key === "Escape") setOpen(false); }} />
      {open && q.trim().length >= 2 && (
        <div className="xp-search-pop">
          {flat.length === 0 ? <div className="xp-search-empty">No matches for “{q.trim()}”</div> :
            groups.filter(g => g.items.length).map(g => (
              <div key={g.type} className="xp-search-grp">
                <div className="xp-search-gl">{g.label}</div>
                {g.items.map((it, i) => (
                  <button key={it.type + i} className="xp-search-item" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(it)}>
                    {it.dot != null && <span className="xp-dot" style={{ background: `oklch(0.62 0.16 ${it.dot})` }} />}
                    <span className="xp-search-lbl">{it.label}</span>
                    {it.sub && <span className="xp-search-sub">{it.sub}</span>}
                  </button>
                ))}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function ExploreView({ t, go, setPop }) {
  const R = window.ROTATION;
  const [tab, setTab] = React.useState("ranking");   // ranking | sound
  const [kind, setKind] = React.useState("artists"); // artists | albums | tracks
  const [year, setYear] = React.useState(null);
  const [fam, setFam] = React.useState(null);
  const [sub, setSub] = React.useState(null);        // selected subgenre name
  const [cells, setCells] = React.useState(() => new Set()); // selected clock slots
  const [playing, setPlaying] = React.useState(false);
  const [ref, seen] = useInView();

  const yearKeys = React.useMemo(() => Object.keys(R.CLOCK_BY_YEAR).map(Number).sort((a, b) => a - b), [R]);

  // "play the decade" — auto-advance the year filter; every lens animates along (sound morphs)
  React.useEffect(() => {
    if (!playing) return;
    const tmr = setInterval(() => setYear(y => {
      const i = y == null ? -1 : yearKeys.indexOf(y);
      if (i >= yearKeys.length - 1) { setPlaying(false); return yearKeys[yearKeys.length - 1]; }
      return yearKeys[i + 1];
    }), 1600);
    return () => clearInterval(tmr);
  }, [playing, yearKeys]);
  const togglePlay = () => {
    if (!playing && (year == null || yearKeys.indexOf(year) >= yearKeys.length - 1)) setYear(yearKeys[0]);
    setPlaying(p => !p);
  };
  const famName = fam == null ? null : (R.FAMILIES.find(f => f.i === fam) || {}).family;
  const filter = { year, fam, sub, cells };

  // selecting a subgenre implies (and locks to) its family for the highlight; clearing genre clears sub
  const pickFam = (i) => { setFam(fam === i ? null : i); setSub(null); };
  const pickSub = (name, famIdx) => { if (sub === name) { setSub(null); } else { setSub(name); if (famIdx != null) setFam(famIdx); } };

  const toggleCell = (c) => setCells(prev => { const n = new Set(prev); n.has(c) ? n.delete(c) : n.add(c); return n; });
  const toggleMany = (list) => setCells(prev => {
    const n = new Set(prev); const all = list.every(c => n.has(c));
    list.forEach(c => all ? n.delete(c) : n.add(c)); return n;
  });

  const chips = [];
  if (year != null) chips.push(["time", year, () => setYear(null)]);
  if (famName) chips.push(["genre", famName, () => pickFam(fam)]);
  if (sub) chips.push(["subgenre", sub, () => setSub(null)]);
  if (cells.size) chips.push(["clock", cells.size + " slot" + (cells.size > 1 ? "s" : ""), () => setCells(new Set())]);

  return (
    <div className="r-view xp" ref={ref}>
      <div className="r-viewhead">
        <div>
          <div className="r-kicker">Explore{chips.length ? "" : " · all time"}</div>
          <h1 className="r-title">Dig <em>through</em><span className="dot">.</span></h1>
        </div>
        <div className="xp-head-right">
          <ExploreSearch R={R} yearKeys={yearKeys}
            onArtist={(id) => go("artist", id)}
            onFam={(i) => { setFam(i); setSub(null); }}
            onSub={(name, fi) => { setSub(name); if (fi != null) setFam(fi); }}
            onYear={(y) => setYear(y)}
            onCells={(arr) => setCells(new Set(arr))} />
          <div className="r-seg xp-tabs">
            {[["ranking", "Ranking"], ["sound", "Sound"]].map(([k, lbl]) =>
              <button key={k} data-on={tab === k} onClick={() => setTab(k)}>{lbl}</button>)}
          </div>
        </div>
      </div>

      {/* ── shared filter bar ── */}
      <div className="xp-filters r-card">
        <div className="xp-frow">
          <span className="xp-flabel">Time</span>
          <div className="xp-chiprow">
            <button className="xp-chip xp-play" data-on={playing} onClick={togglePlay} title="Play the decade — watch every year animate">
              {playing ? "❚❚" : "▶"} decade
            </button>
            <button className="xp-chip" data-on={year == null} onClick={() => { setPlaying(false); setYear(null); }}>All</button>
            {yearKeys.map(y => (
              <button key={y} className="xp-chip" data-on={year === y} onClick={() => { setPlaying(false); setYear(year === y ? null : y); }}>{"'" + String(y).slice(2)}</button>
            ))}
          </div>
        </div>
        <div className="xp-frow">
          <span className="xp-flabel">Genre</span>
          <div className="xp-chiprow">
            <button className="xp-chip" data-on={fam == null} onClick={() => { setFam(null); setSub(null); }}>All</button>
            {R.FAMILIES.map(f => (
              <button key={f.i} className="xp-chip xp-chip-g" data-on={fam === f.i} onClick={() => pickFam(f.i)}>
                <span className="xp-dot" style={{ background: `oklch(0.62 0.16 ${f.hue})` }} />{f.family}
              </button>
            ))}
          </div>
        </div>
        {chips.length > 0 && (
          <div className="xp-frow">
            <span className="xp-flabel">Active</span>
            <div className="xp-chiprow">
              {chips.map(([k, v, clr]) => (
                <button key={k} className="xp-chip xp-chip-active" onClick={clr} title="clear">
                  <span className="xp-ck">{k}</span> {v} <span className="xp-x">✕</span>
                </button>
              ))}
              <button className="xp-chip xp-clearall" onClick={() => { setYear(null); setFam(null); setSub(null); setCells(new Set()); }}>clear all</button>
            </div>
          </div>
        )}
      </div>

      {tab === "ranking" && <RankingPanel R={R} t={t} go={go} setPop={setPop} kind={kind} setKind={setKind} filter={filter} seen={seen} />}
      {tab === "sound" && <SoundPanel R={R} t={t} setPop={setPop} year={year} fam={fam} sub={sub} famName={famName} pickFam={pickFam} pickSub={pickSub} seen={seen} />}

      {/* ── persistent, selectable rhythm (also a time-of-day filter) ── */}
      <RhythmBar R={R} year={year} fam={fam} cells={cells} toggleCell={toggleCell} toggleMany={toggleMany}
        clear={() => setCells(new Set())} setPop={setPop} seen={seen} />

      {/* ── year detail at the bottom (when a single year is selected) ── */}
      {year != null && <YearDetail R={R} go={go} year={year} />}

      <style>{`
        .xp-head-right { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; justify-content: flex-end; }
        .xp-tabs { align-self: flex-end; }
        .xp-search { position: relative; display: inline-flex; align-items: center; gap: 7px; padding: 7px 12px;
          border: 1px solid var(--rule); border-radius: 999px; color: var(--ink-dim); min-width: 230px; transition: border-color .15s; }
        .xp-search:focus-within { border-color: var(--ink-faint); }
        .xp-search svg { flex: none; color: var(--ink-faint); }
        .xp-search input { flex: 1; min-width: 0; background: transparent; border: 0; outline: 0; color: var(--ink);
          font-family: var(--sans); font-size: 12.5px; }
        .xp-search input::placeholder { color: var(--ink-faint); }
        .xp-search-pop { position: absolute; top: calc(100% + 6px); left: 0; right: 0; z-index: 60; max-height: 360px; overflow-y: auto;
          background: var(--bg-2); border: 1px solid var(--rule-2); border-radius: 10px; padding: 6px; box-shadow: 0 18px 44px -12px rgba(0,0,0,.7); }
        .xp-search-grp { padding: 4px 0; }
        .xp-search-gl { font-family: var(--mono); font-size: 8.5px; letter-spacing: .14em; text-transform: uppercase; color: var(--ink-faint); padding: 2px 8px 4px; }
        .xp-search-item { display: flex; align-items: center; gap: 8px; width: 100%; text-align: left; padding: 7px 8px; border: 0;
          background: transparent; border-radius: 6px; cursor: pointer; color: var(--ink); font-family: var(--sans); font-size: 12.5px; }
        .xp-search-item:hover, .xp-search-item:focus { background: var(--bg-3); outline: 0; }
        .xp-search-lbl { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .xp-search-sub { margin-left: auto; padding-left: 10px; color: var(--ink-faint); font-size: 11px; white-space: nowrap; }
        .xp-search-empty { padding: 14px 10px; color: var(--ink-faint); font-family: var(--mono); font-size: 11px; }
        .xp-filters { padding: 14px 16px; margin-bottom: var(--gap); display: grid; gap: 10px; }
        .xp-frow { display: grid; grid-template-columns: 56px 1fr; gap: 10px; align-items: start; }
        .xp-flabel { font-family: var(--mono); font-size: 9.5px; letter-spacing: .14em; text-transform: uppercase; color: var(--ink-faint); padding-top: 7px; }
        .xp-chiprow { display: flex; flex-wrap: wrap; gap: 6px; }
        .xp-chip { font-family: var(--mono); font-size: 10.5px; letter-spacing: .04em; padding: 5px 10px; border-radius: 999px;
          border: 1px solid var(--rule); background: transparent; color: var(--ink-soft); cursor: pointer; transition: .14s;
          display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
        .xp-chip:hover { border-color: var(--ink-faint); color: var(--ink); }
        .xp-chip[data-on="true"] { background: var(--accent); border-color: var(--accent); color: #0c0a08; }
        .xp-chip[data-on="true"] .xp-dot { box-shadow: 0 0 0 1.5px #0c0a08; }
        .xp-play { border-color: var(--accent); color: var(--accent); letter-spacing: .08em; }
        .xp-play[data-on="true"] { background: var(--accent); color: #0c0a08; }
        .xp-dot { width: 9px; height: 9px; border-radius: 3px; flex: none; }
        .xp-chip-active { border-color: var(--accent); color: var(--ink); }
        .xp-chip-active .xp-ck { color: var(--ink-faint); text-transform: uppercase; letter-spacing: .1em; font-size: 8.5px; }
        .xp-chip-active .xp-x { color: var(--ink-faint); }
        .xp-clearall { color: var(--ink-faint); border-style: dashed; }
        .xp-empty { padding: 56px 20px; text-align: center; color: var(--ink-faint); font-family: var(--mono); font-size: 12px; letter-spacing: .04em; }
        .xp-yeardetail { padding: 18px 22px; margin-top: var(--gap); }
        .xp-yd-head { display: flex; align-items: baseline; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
        .xp-yd-year { font-size: 40px; line-height: .9; }
        .xp-yd-title { font-family: var(--serif); font-style: italic; font-size: 19px; line-height: 1.1; }
        .xp-yd-sub { color: var(--ink-soft); font-size: 12.5px; margin-top: 3px; }
        .era-d-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 16px 22px; }
        .era-d-stat { min-width: 0; } .era-d-stat[data-link="true"] { cursor: pointer; }
        .era-d-stat[data-link="true"]:hover .era-d-v { color: var(--accent); }
        .era-d-k { font-size: 9.5px; color: var(--ink-faint); letter-spacing: .12em; text-transform: uppercase; margin-bottom: 4px; }
        .era-d-v { font-family: var(--serif); font-style: italic; font-size: 17px; line-height: 1.15; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .era-d-sub { font-size: 11.5px; color: var(--ink-soft); margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .xp-sub-row { display: flex; justify-content: space-between; align-items: center; padding: 2px 4px; border-radius: 4px; cursor: pointer; transition: .12s; }
        .xp-sub-row:hover { background: var(--bg-3); }
        .xp-sub-row[data-on="true"] { background: var(--accent-bg); box-shadow: inset 0 0 0 1px var(--accent); }
        @media (max-width: 640px) {
          .xp-frow { grid-template-columns: 1fr; gap: 6px; }
          .xp-flabel { padding-top: 0; }
          .xp-chiprow { overflow-x: auto; flex-wrap: nowrap; padding-bottom: 4px; -webkit-overflow-scrolling: touch; }
          .xp-tabs { align-self: stretch; }
          .xp-head-right { width: 100%; }
          .xp-search { min-width: 0; width: 100%; order: -1; }
          .era-d-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </div>
  );
}

// ── RANKING ──
function RankingPanel({ R, t, go, setPop, kind, setKind, filter, seen }) {
  const items = rankingItems(R, kind, filter);
  const onClick = (it) => go("artist", it.aid || it.id);
  const timed = filter.cells && filter.cells.size > 0;
  return (
    <div>
      <div className="r-seg" style={{ marginBottom: "var(--gap)" }}>
        {["artists", "albums", "tracks"].map(k => <button key={k} data-on={kind === k} onClick={() => setKind(k)}>{k}</button>)}
      </div>
      {timed && kind !== "artists" && (
        <div className="r-mono" style={{ fontSize: 10, color: "var(--ink-faint)", marginBottom: 10 }}>
          showing {kind} by artists active in the selected time slots
        </div>
      )}
      {items.length === 0 ? (
        <div className="r-card xp-empty">Nothing in this slice — loosen a filter.</div>
      ) : t.layout === "bars" ? (
        <Bars items={items.slice(0, 18)} run={seen} expressive={t.chart === "expressive"} onClick={onClick}
          onHover={(it, el) => {
            if (!it) return setPop(null);
            const r = el.getBoundingClientRect();
            setPop({ x: r.left + 120, y: r.top, title: it.label, pip: it.hue, meta: kind.slice(0, -1),
              rows: [[timed ? "slot plays" : "plays", fmt(it.value)], ["·", it.sub]], hint: "click → artist ↗" });
          }} />
      ) : t.layout === "bubbles" ? (
        <BubbleField items={items} seen={seen} setPop={setPop} onClick={onClick} expressive={t.chart === "expressive"} />
      ) : (
        <WallGrid items={items} kind={kind} seen={seen} setPop={setPop} onClick={onClick} />
      )}
    </div>
  );
}

// ── SOUND ── map persists; families breakdown sits below and drives the subgenre filter
function SoundPanel({ R, t, setPop, year, fam, sub, famName, pickFam, pickSub, seen }) {
  const subs = soundSubs(R, year);
  const live = subs.filter(s => s.w > 0);
  const maxW = Math.max(1, ...subs.map(s => s.w));
  const totalW = live.reduce((s, x) => s + x.w, 0) || 1;
  const groups = R.FAMILIES.map(f => ({
    ...f,
    subs: live.filter(s => s.family === f.family).sort((a, b) => b.w - a.w),
    w: live.filter(s => s.family === f.family).reduce((a, s) => a + s.w, 0),
  })).filter(g => g.subs.length).sort((a, b) => b.w - a.w);

  return (
    <div style={{ display: "grid", gap: "var(--gap)" }}>
      <div className="m-stack" style={{ display: "grid", gridTemplateColumns: "1fr 210px", gap: "var(--gap)", alignItems: "start" }}>
        <div className="r-card" style={{ padding: 0, position: "relative", overflow: "hidden", minHeight: 220 }}>
          {live.length === 0
            ? <div className="xp-empty">No tagged listening in {year}.</div>
            : <SoundScatter subs={subs} maxW={maxW} seen={seen} activeFam={famName}
                expressive={t.chart === "expressive"} setPop={setPop} />}
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          <div className="r-mono" style={{ fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: 2 }}>Families {year ? "· " + year : ""}</div>
          {groups.map(f => (
            <div key={f.family} onClick={() => pickFam(f.i)}
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

      {/* families breakdown — click a subgenre row to filter the whole explorer by it */}
      <div>
        <div className="r-mono" style={{ fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--ink-faint)", margin: "4px 0 10px" }}>
          Subgenres — tap one to filter
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px,1fr))", gap: "var(--gap)" }}>
          {groups.map((f, fi) => {
            const fmax = Math.max(1, ...f.subs.map(s => s.w));
            return (
              <div key={f.family} className="r-card" style={{ padding: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, cursor: "pointer" }} onClick={() => pickFam(f.i)}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: `oklch(0.62 0.16 ${f.hue})` }} />
                  <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 19 }}>{f.family}</div>
                  <span className="r-mono" style={{ marginLeft: "auto", fontSize: 10, color: "var(--ink-faint)" }}>{fmtK(f.w)}</span>
                </div>
                <div style={{ display: "grid", gap: 7 }}>
                  {f.subs.map((s, si) => (
                    <div key={s.name} className="xp-sub-row" data-on={sub === s.name} onClick={() => pickSub(s.name, f.i)}>
                      <span style={{ fontSize: 11.5, color: "var(--ink-soft)", flex: 1, minWidth: 0 }}>{s.name}</span>
                      <div style={{ height: 6, width: 90, background: "var(--bg-3)", borderRadius: 3, overflow: "hidden", margin: "0 8px" }}>
                        <div style={{ height: "100%", width: (seen ? s.w / fmax * 100 : 0) + "%",
                          background: t.chart === "expressive" ? `oklch(0.6 0.16 ${f.hue})` : "var(--accent)", opacity: .85,
                          borderRadius: 3, transition: `width .8s cubic-bezier(.3,.8,.3,1) ${(fi * 0.02 + si * 0.04)}s` }} />
                      </div>
                      <span className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", width: 38, textAlign: "right" }}>{fmtK(s.w)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── RHYTHM (bottom, persistent) — heatmap doubles as a time-of-day filter ──
function RhythmBar({ R, year, fam, cells, toggleCell, toggleMany, clear, setPop, seen }) {
  const days = R.CLOCK.days;
  const grid = rhythmGrid(R, year, fam);
  const max = Math.max(1, ...grid.flat());
  const total = grid.flat().reduce((a, b) => a + b, 0);
  const hourTotals = Array.from({ length: 24 }, (_, h) => days.reduce((s, _, di) => s + grid[di][h], 0));
  const peakHour = hourTotals.indexOf(Math.max(...hourTotals));
  const nightShare = total ? (hourTotals.slice(0, 5).reduce((a, b) => a + b, 0) / total * 100) : 0;
  const hr = (h) => (h % 12 === 0 ? 12 : h % 12) + (h < 12 ? "a" : "p");
  const sel = cells && cells.size > 0;
  const cellStyle = (v, c) => {
    const x = v / max;
    const on = cells.has(c);
    return {
      aspectRatio: "1", borderRadius: 2, cursor: "pointer", transition: "opacity .4s, transform .12s, box-shadow .12s",
      background: x < 0.04 ? "var(--bg-3)" : `oklch(${0.28 + x * 0.5} ${0.05 + x * 0.12} var(--acc-h))`,
      opacity: seen ? (sel && !on ? 0.32 : 1) : 0,
      boxShadow: on ? "0 0 0 1.6px var(--accent)" : "none",
    };
  };

  return (
    <div className="r-card" style={{ padding: "16px 18px 14px", marginTop: "var(--gap)" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap", marginBottom: 12 }}>
        <div className="r-mono" style={{ fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--ink-faint)" }}>Rhythm</div>
        <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>
          Peak <b style={{ color: "var(--ink)" }}>{hr(peakHour).replace("a", " AM").replace("p", " PM")}</b>
          <span style={{ color: "var(--ink-faint)" }}> · </span>
          <b style={{ color: "var(--accent)" }}>{nightShare.toFixed(0)}%</b> before 5 AM
        </div>
        <div className="r-mono" style={{ marginLeft: "auto", fontSize: 10, color: "var(--ink-faint)" }}>
          {sel ? <span>{cells.size} slot{cells.size > 1 ? "s" : ""} · <span style={{ color: "var(--accent)", cursor: "pointer" }} onClick={clear}>clear</span></span>
            : "tap cells / day / hour to filter"}
        </div>
      </div>
      <div className="clk-scroll">
        <div style={{ display: "grid", gridTemplateColumns: "34px repeat(24, 1fr)", gap: 3, marginBottom: 5 }}>
          <div />
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} onClick={() => toggleMany(days.map((_, di) => di * 24 + h))} title={`toggle ${hr(h)} column`}
              className="r-mono" style={{ fontSize: 7.5, color: "var(--ink-faint)", textAlign: "center", cursor: "pointer" }}>{h % 3 === 0 ? hr(h) : ""}</div>
          ))}
        </div>
        {days.map((d, di) => (
          <div key={d} style={{ display: "grid", gridTemplateColumns: "34px repeat(24, 1fr)", gap: 3, marginBottom: 3 }}>
            <div className="r-mono" onClick={() => toggleMany(Array.from({ length: 24 }, (_, h) => di * 24 + h))} title={`toggle ${d}`}
              style={{ fontSize: 9.5, color: "var(--ink-soft)", display: "flex", alignItems: "center", cursor: "pointer" }}>{d}</div>
            {grid[di].map((v, h) => {
              const c = di * 24 + h;
              return (
                <div key={h} title={`${d} ${hr(h)} · ${v}`} style={cellStyle(v, c)}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.35)";
                    const r = e.currentTarget.getBoundingClientRect();
                    setPop({ x: r.left + r.width / 2, y: r.top, title: `${d}, ${hr(h)}`, pip: "var(--acc-h)", meta: "listening",
                      rows: [["plays", fmt(v)], ["of peak", Math.round(v / max * 100) + "%"]], hint: "click to filter" }); }}
                  onClick={() => toggleCell(c)}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = ""; setPop(null); }} />
              );
            })}
          </div>
        ))}
        <div style={{ display: "grid", gridTemplateColumns: "34px 1fr", gap: 0, marginTop: 14, alignItems: "end" }}>
          <div />
          <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: 44 }}>
            {hourTotals.map((v, h) => (
              <div key={h} style={{ flex: 1, height: (seen ? v / Math.max(...hourTotals, 1) * 100 : 0) + "%",
                background: h === peakHour ? "var(--accent)" : "var(--rule-2)", borderRadius: "2px 2px 0 0",
                transition: `height .6s cubic-bezier(.3,.8,.3,1) ${h * 0.012}s` }} title={`${hr(h)} · ${v}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── YEAR DETAIL ── editorial strip from the old Eras view (headline + year stats)
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
        {yr.topTrack && <Stat k="Top track" v={yr.topTrack.title} sub={`${yr.topTrack.artist} · ${yr.topTrack.plays} plays`} onClick={() => open(yr.topTrack.artist)} />}
        {yr.topAlbum && <Stat k="Top album" v={yr.topAlbum.title} sub={`${yr.topAlbum.artist} · ${yr.topAlbum.plays} plays`} onClick={() => open(yr.topAlbum.artist)} />}
        {yr.peakDay && <Stat k="Peak day" v={yr.peakDay.plays + " plays"} sub={yr.peakDay.date} />}
        <Stat k="Hours" v={fmt(yr.hours)} sub={`${yr.activeDays} active days`} />
        <Stat k="Artists touched" v={fmt(yr.artists)} sub={`${fmt(yr.tracks)} tracks`} />
        {yr.discoveries[0] && <Stat k="Top discovery" v={yr.discoveries[0].name} sub={`${yr.discoveries[0].plays} plays · first heard ${year}`} onClick={() => open(yr.discoveries[0].name)} />}
        {yr.gainer && yr.gainer.delta > 50 && <Stat k="Biggest jump" v={yr.gainer.name} sub={`${yr.gainer.prev} → ${yr.gainer.plays} (+${yr.gainer.delta})`} onClick={() => open(yr.gainer.name)} />}
      </div>
    </div>
  );
}
