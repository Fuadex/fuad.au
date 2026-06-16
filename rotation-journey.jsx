// rotation-journey.jsx — the taste-journey streamgraph, now multi-level. Three lenses over the
// same river: genre families (default), a family drilled into its subgenres, and top artists.
// x = year, ribbon thickness = plays that year. Data = GENRE_FLOW / SUB_FLOW / EXPLORE.yp.

// Catmull-Rom → cubic-bezier smoothing for flowing ribbon edges.
function _segs(pts) {
  let d = "";
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || pts[i + 1];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

// generic streamgraph over `series` ([{key,name,hue,vals:[per year]}]) and `years` ([nums])
function StreamGraph({ series, years, hi, setHi, onPick, clickable, markYi }) {
  const L = React.useMemo(() => {
    const com = series.map(s => { let n = 0, d = 0; s.vals.forEach((v, i) => { n += v * years[i]; d += v; }); return d ? n / d : 9999; });
    const order = series.map((s, i) => i).sort((a, b) => com[a] - com[b]);
    const totals = years.map((y, yi) => order.reduce((acc, i) => acc + series[i].vals[yi], 0));
    const maxTotal = Math.max(...totals, 1);
    const W = 1000, H = 500, padX = 26, padTop = 22, padBot = 42, innerH = H - padTop - padBot, midY = padTop + innerH / 2, yScale = innerH / maxTotal;
    const xAt = (yi) => padX + (years.length === 1 ? 0 : yi / (years.length - 1)) * (W - 2 * padX);
    const bands = series.map(() => []);
    years.forEach((y, yi) => { let acc = -totals[yi] / 2; order.forEach(i => { const v = series[i].vals[yi]; bands[i].push({ x: xAt(yi), yTop: midY - (acc + v) * yScale, yBot: midY - acc * yScale }); acc += v; }); });
    const area = (i) => { const b = bands[i]; const top = b.map(p => [p.x, p.yTop]), bot = b.map(p => [p.x, p.yBot]).reverse(); return `M ${top[0][0].toFixed(1)} ${top[0][1].toFixed(1)}` + _segs(top) + ` L ${bot[0][0].toFixed(1)} ${bot[0][1].toFixed(1)}` + _segs(bot) + " Z"; };
    const peak = {}; order.forEach(i => { let by = 0; series[i].vals.forEach((v, yi) => { if (v > series[i].vals[by]) by = yi; }); peak[i] = { yi: by, year: years[by], share: totals[by] ? series[i].vals[by] / totals[by] : 0 }; });
    return { order, bands, area, peak, W, H, xAt };
  }, [series, years]);

  return (
    <svg viewBox={`0 0 ${L.W} ${L.H}`} style={{ width: "100%", height: "auto", display: "block" }} onMouseLeave={() => setHi(-1)}>
      {L.order.map(i => {
        const on = hi < 0 || hi === i, s = series[i];
        const fill = s.mute ? "oklch(0.5 0.02 270)" : `oklch(0.62 0.17 ${s.hue})`;
        const strk = s.mute ? "oklch(0.62 0.02 270)" : `oklch(0.72 0.16 ${s.hue})`;
        return (
          <path key={s.key} d={L.area(i)} fill={fill} fillOpacity={on ? (hi === i ? 0.96 : 0.82) : 0.15}
            stroke={strk} strokeWidth={hi === i ? 1.4 : 0.5} strokeOpacity={on ? 0.5 : 0.12}
            style={{ cursor: clickable ? "pointer" : "default", transition: "fill-opacity .15s" }}
            onMouseEnter={() => setHi(i)} onClick={() => onPick && onPick(s, i)}>
            <title>{s.name} · peak {L.peak[i].year} ({Math.round(L.peak[i].share * 100)}%)</title>
          </path>
        );
      })}
      {L.order.map(i => {
        const b = L.bands[i][L.peak[i].yi], thick = b.yBot - b.yTop, s = series[i];
        if (thick < 17 && hi !== i) return null;
        return (
          <text key={"t" + s.key} x={b.x} y={(b.yTop + b.yBot) / 2} textAnchor="middle" dominantBaseline="middle"
            fontFamily="var(--sans)" fontWeight="600" fontSize={hi === i ? 13 : 10.5}
            fill={hi === i ? "#0c0a08" : "rgba(255,255,255,.92)"} style={{ pointerEvents: "none", textShadow: hi === i ? "none" : "0 1px 3px rgba(0,0,0,.6)" }}>
            {s.name.length > 18 ? s.name.slice(0, 16) + "…" : s.name}
          </text>
        );
      })}
      {markYi != null && markYi >= 0 && (
        <line x1={L.xAt(markYi)} y1={6} x2={L.xAt(markYi)} y2={L.H - 30} stroke="var(--accent)" strokeWidth="1.4" strokeDasharray="3 3" opacity="0.85" style={{ pointerEvents: "none" }} />
      )}
      {years.map((y, yi) => (
        <text key={"y" + yi} x={L.xAt(yi)} y={L.H - 16} textAnchor="middle" fontFamily="var(--mono)" fontSize="10"
          fill={markYi === yi ? "var(--accent)" : "var(--ink-faint)"} fontWeight={markYi === yi ? 700 : 400}
          opacity={yi % 2 === 0 || yi === years.length - 1 || markYi === yi ? 1 : 0}>{"'" + String(y).slice(2)}</text>
      ))}
    </svg>
  );
}

// PlaceFlow — the Journey, scoped to a set of EXPLORE artists (e.g. a country or city). Same
// genre → subgenre → artist drill + StreamGraph, but the flow is computed client-side from the
// subset's per-year plays (a.yp) + subgenre membership (a.s). Used inside the Map's detail blob.
function PlaceFlow({ artists, go }) {
  const R = window.ROTATION;
  const years = React.useMemo(() => R.GENRE_FLOW.years.map(y => y.year), [R]);
  const [fam, setFam] = React.useState(null);
  const [sub, setSub] = React.useState(null);
  const [view, setView] = React.useState("genre");
  const [hi, setHi] = React.useState(-1);
  React.useEffect(() => { setFam(null); setSub(null); setView("genre"); setHi(-1); }, [artists]);

  const series = React.useMemo(() => {
    const sumBy = (keyOf) => {
      const m = new Map();
      for (const a of artists) {
        if (!a.yp) continue;
        const k = keyOf(a); if (k == null) continue;
        if (!m.has(k)) m.set(k, new Array(years.length).fill(0));
        const arr = m.get(k);
        years.forEach((y, i) => { arr[i] += a.yp[y] || 0; });
      }
      return m;
    };
    if (view === "artist") {
      const fn = sub != null ? (a => a.s.indexOf(sub) >= 0) : fam != null ? (a => a.s.some(si => R.SUBS[si].fam === fam)) : (() => true);
      return artists.filter(a => a.yp && fn(a)).sort((a, b) => b.plays - a.plays).slice(0, 12)
        .map(a => ({ key: a.id, name: a.name, hue: a.hue, id: a.id, vals: years.map(y => a.yp[y] || 0) }));
    }
    if (fam != null) {
      const m = sumBy(a => (a.s.length && R.SUBS[a.s[0]].fam === fam) ? a.s[0] : null);
      const fhue = (R.FAMILIES.find(f => f.i === fam) || {}).hue || 0;
      const arr = [...m.entries()];
      return arr.map(([si, vals], idx) => ({ key: si, name: R.SUBS[si].name, hue: (fhue + (idx - (arr.length - 1) / 2) * 17 + 360) % 360, vals })).filter(s => s.vals.some(v => v > 0));
    }
    const m = sumBy(a => a.s.length ? R.SUBS[a.s[0]].fam : null);
    return R.FAMILIES.map(f => ({ key: f.i, name: f.family, hue: f.hue, fam: f.i, vals: m.get(f.i) || new Array(years.length).fill(0) })).filter(s => s.vals.some(v => v > 0));
  }, [artists, fam, sub, view, R]);

  const onPick = (s) => {
    if (view === "artist") { go("artist", s.id); return; }
    if (fam == null) { setFam(s.key); setHi(-1); }
    else { setSub(s.key); setView("artist"); setHi(-1); }
  };
  const famName = fam != null ? (R.FAMILIES.find(f => f.i === fam) || {}).family : null;

  if ((artists || []).filter(a => a.yp).length < 2) return <div style={{ padding: 24, textAlign: "center", color: "var(--ink-faint)", fontFamily: "var(--mono)", fontSize: 11 }}>not enough placed artists here for a flow.</div>;

  return (
    <div>
      <div className="r-mono" style={{ fontSize: 11, marginBottom: 8 }}>
        <span style={{ cursor: "pointer", color: fam == null ? "var(--ink)" : "var(--accent)" }} onClick={() => { setFam(null); setSub(null); setView("genre"); setHi(-1); }}>genres</span>
        {fam != null && <><span style={{ margin: "0 7px", color: "var(--ink-faint)" }}>›</span><span style={{ cursor: "pointer", color: sub == null && view === "genre" ? "var(--ink)" : "var(--accent)" }} onClick={() => { setSub(null); setView("genre"); setHi(-1); }}>{famName}</span></>}
        {sub != null && <><span style={{ margin: "0 7px", color: "var(--ink-faint)" }}>›</span><span style={{ color: "var(--ink)" }}>{R.SUBS[sub].name}</span></>}
      </div>
      {series.length < 1
        ? <div style={{ padding: 20, textAlign: "center", color: "var(--ink-faint)", fontFamily: "var(--mono)", fontSize: 11 }}>nothing to flow here.</div>
        : <StreamGraph series={series} years={years} hi={hi} setHi={setHi} onPick={onPick} clickable={true} />}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 12px", marginTop: 10 }}>
        {series.map((s, i) => (
          <div key={s.key} onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(-1)} onClick={() => onPick(s)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", opacity: hi < 0 || hi === i ? 1 : 0.35, transition: ".15s" }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: `oklch(0.62 0.16 ${s.hue})` }} />
            <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>{s.name.length > 22 ? s.name.slice(0, 20) + "…" : s.name}</span>
          </div>
        ))}
      </div>
      <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", marginTop: 8 }}>
        {view === "artist" ? "the bands, over time · click to open" : fam == null ? "genres here over time · click one to drill in" : "subgenres of " + famName + " · click one for its bands"}
      </div>
    </div>
  );
}

// MoodView — the measured-sound lens. Library facts, a play-weighted energy/valence arc over the
// years, and a valence×energy mood quadrant of your artists. All from the shipped AUDIO map
// ([0]energy [1]valence [2]acoustic [3]tempo [4]dance [5]instr [6]major [7]popularity [8]followers).
function MoodView({ go }) {
  const R = window.ROTATION, A = R.AUDIO || {};
  const years = React.useMemo(() => R.GENRE_FLOW.years.map(y => y.year), [R]);
  const [hi, setHi] = React.useState(null);

  const arc = React.useMemo(() => {
    const e = years.map(() => [0, 0]), v = years.map(() => [0, 0]);
    for (const a of R.EXPLORE) { const af = A[a.id]; if (!af || !a.yp) continue; years.forEach((y, i) => { const w = a.yp[y] || 0; if (!w) return; e[i][0] += af[0] * w; e[i][1] += w; v[i][0] += af[1] * w; v[i][1] += w; }); }
    return years.map((y, i) => ({ y, energy: e[i][1] ? e[i][0] / e[i][1] : null, valence: v[i][1] ? v[i][0] / v[i][1] : null }));
  }, [R, years]);

  const pts = React.useMemo(() => R.EXPLORE.filter(a => A[a.id]).slice(0, 260).map(a => ({ id: a.id, name: a.name, hue: a.hue, x: A[a.id][1], y: A[a.id][0], plays: a.plays })), [R]);

  const facts = React.useMemo(() => {
    const all = R.EXPLORE.filter(a => A[a.id]); const n = all.length || 1;
    let se = 0, sv = 0, sd = 0, smaj = 0, sbpm = 0;
    for (const a of all) { const af = A[a.id]; se += af[0]; sv += af[1]; sd += af[4]; smaj += af[6]; sbpm += 50 + af[3] * 140; }
    const strong = all.filter(a => a.plays >= 30); const pool = strong.length ? strong : all;  // recognisable picks, not 1-play noise
    const top = (idx, dir) => pool.slice().sort((x, y) => dir * (A[y.id][idx] - A[x.id][idx]))[0];
    return { n, energy: se / n, valence: sv / n, dance: sd / n, major: smaj / n, bpm: Math.round(sbpm / n),
      danceArtist: top(4, 1), sadArtist: top(1, -1), happyArtist: top(1, 1), obscureArtist: top(7, -1) };
  }, [R]);

  const W = 1000, H = 300, pad = 30;
  const xAt = (i) => pad + (years.length === 1 ? 0 : i / (years.length - 1)) * (W - 2 * pad);
  const yAt = (val) => pad + (1 - val) * (H - 2 * pad);
  const line = (key) => arc.map((d, i) => d[key] == null ? null : `${xAt(i).toFixed(1)} ${yAt(d[key]).toFixed(1)}`).filter(Boolean).join(" L ");
  const QS = 560, qp = 36;
  const qx = (v) => qp + v * (QS - 2 * qp), qy = (e) => qp + (1 - e) * (QS - 2 * qp);
  const maxPlays = Math.max(...pts.map(p => p.plays), 1);
  const Fact = ({ k, v, sub }) => (<div className="r-card" style={{ padding: "13px 15px" }}><div className="r-mono" style={{ fontSize: 8.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ink-faint)" }}>{k}</div><div style={{ fontFamily: "var(--serif)", fontSize: 21, marginTop: 2 }}>{v}</div>{sub && <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", marginTop: 2 }}>{sub}</div>}</div>);

  return (
    <div className="r-view">
      <div className="r-viewhead"><div>
        <div className="r-kicker">Mood · measured from {fmt(facts.n)} artists' audio</div>
        <h1 className="r-title">The <em>feel</em> of it<span className="dot">.</span></h1>
      </div></div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: "var(--gap)", marginBottom: "var(--gap)" }}>
        <Fact k="avg energy" v={Math.round(facts.energy * 100) + "%"} sub={facts.bpm + " bpm median"} />
        <Fact k="avg mood" v={Math.round(facts.valence * 100) + "%"} sub={facts.valence < .45 ? "leans dark" : facts.valence > .55 ? "leans bright" : "balanced"} />
        <Fact k="key" v={Math.round(facts.major * 100) + "% major"} sub={facts.major < .5 ? "a minor-key library" : "mostly major"} />
        <Fact k="most danceable" v={facts.danceArtist ? facts.danceArtist.name : "—"} sub="by audio" />
        <Fact k="darkest" v={facts.sadArtist ? facts.sadArtist.name : "—"} sub="lowest valence" />
        <Fact k="most obscure" v={facts.obscureArtist ? facts.obscureArtist.name : "—"} sub="lowest popularity" />
      </div>

      <div className="r-card" style={{ padding: "16px 18px", marginBottom: "var(--gap)" }}>
        <div className="r-card-h" style={{ padding: 0, marginBottom: 6 }}><span className="lbl"><b>Mood over the years</b></span>
          <span className="meta"><span style={{ color: "oklch(0.66 0.18 30)" }}>● energy</span> &nbsp; <span style={{ color: "oklch(0.66 0.16 250)" }}>● mood</span></span></div>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
          <line x1={pad} y1={yAt(.5)} x2={W - pad} y2={yAt(.5)} stroke="var(--rule)" strokeDasharray="3 4" />
          <path d={"M " + line("energy")} fill="none" stroke="oklch(0.66 0.18 30)" strokeWidth="2.4" />
          <path d={"M " + line("valence")} fill="none" stroke="oklch(0.66 0.16 250)" strokeWidth="2.4" />
          {years.map((y, i) => <text key={y} x={xAt(i)} y={H - 8} textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-faint)" opacity={i % 2 === 0 || i === years.length - 1 ? 1 : 0}>{"'" + String(y).slice(2)}</text>)}
        </svg>
        <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", marginTop: 4 }}>each year averaged across what you actually played that year, weighted by plays · midline = 50%</div>
      </div>

      <div className="r-card" style={{ padding: "16px 18px" }}>
        <div className="r-card-h" style={{ padding: 0, marginBottom: 6 }}><span className="lbl"><b>Mood quadrant</b></span><span className="meta">valence × energy · {pts.length} artists</span></div>
        <svg viewBox={`0 0 ${QS} ${QS}`} style={{ width: "100%", maxWidth: 560, height: "auto", display: "block", margin: "0 auto" }} onMouseLeave={() => setHi(null)}>
          <line x1={qx(.5)} y1={qp} x2={qx(.5)} y2={QS - qp} stroke="var(--rule)" strokeWidth="1" />
          <line x1={qp} y1={qy(.5)} x2={QS - qp} y2={qy(.5)} stroke="var(--rule)" strokeWidth="1" />
          {[["intense", qx(.5), qp + 4, "middle"], ["calm", qx(.5), QS - qp + 14, "middle"], ["dark", qp - 6, qy(.5), "end"], ["bright", QS - qp + 6, qy(.5), "start"]].map(([t, x, y, anc]) =>
            <text key={t} x={x} y={y} textAnchor={anc} fontFamily="var(--mono)" fontSize="10" fill="var(--ink-faint)">{t}</text>)}
          {pts.map(p => { const on = hi === p.id; return (
            <circle key={p.id} cx={qx(p.x)} cy={qy(p.y)} r={(on ? 7 : 3 + Math.sqrt(p.plays / maxPlays) * 9)} fill={`oklch(0.64 0.16 ${p.hue})`} fillOpacity={hi && !on ? 0.2 : 0.66}
              stroke={on ? "#fff" : "none"} strokeWidth="1.3" style={{ cursor: "pointer", transition: "fill-opacity .12s" }}
              onMouseEnter={() => setHi(p.id)} onClick={() => go("artist", p.id)}><title>{p.name}</title></circle>); })}
        </svg>
        <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", textAlign: "center", marginTop: 4 }}>{hi ? (pts.find(p => p.id === hi) || {}).name : "each dot an artist · right = brighter, up = more intense · size = plays · click to open"}</div>
      </div>
    </div>
  );
}

function JourneyView({ go }) {
  const R = window.ROTATION;
  const GF = R.GENRE_FLOW, SF = R.SUB_FLOW;
  const yearsArr = GF.years.map(y => y.year);
  const [fam, setFam] = React.useState(null);   // family idx context
  const [sub, setSub] = React.useState(null);   // subgenre idx context
  const [view, setView] = React.useState("genre"); // genre | artist
  const [hi, setHi] = React.useState(-1);
  const famName = (i) => (GF.families.find(f => f.i === i) || {}).family || "";

  const series = React.useMemo(() => {
    if (view === "artist") {
      const fn = sub != null ? (a => a.s.indexOf(sub) >= 0)
        : fam != null ? (a => a.s.some(si => R.SUBS[si].fam === fam)) : (() => true);
      return R.EXPLORE.filter(a => a.yp && fn(a)).sort((a, b) => b.plays - a.plays).slice(0, 12)
        .map(a => ({ key: a.id, name: a.name, hue: a.hue, id: a.id, vals: yearsArr.map(y => a.yp[y] || 0) }));
    }
    if (fam != null) {
      const fhue = (GF.families.find(f => f.i === fam) || {}).hue || 0;
      const subs = R.SUBS.map((s, i) => ({ s, i })).filter(o => o.s.fam === fam);
      return subs.map((o, idx) => ({ key: o.i, name: o.s.name, hue: (fhue + (idx - (subs.length - 1) / 2) * 17 + 360) % 360, vals: SF.rows.map(r => r[o.i]) }))
        .filter(se => se.vals.some(v => v > 0));
    }
    return GF.families.map(f => ({ key: f.i, name: f.family, hue: f.hue, vals: GF.years.map(y => y.fams[f.i]) }))
      .filter(se => se.vals.some(v => v > 0));
  }, [view, fam, sub, R]);

  // click a ribbon: families → subgenres → artists; artists open the page
  const onPick = (s) => {
    if (view === "artist") { go("artist", s.id); return; }
    if (fam == null) { setFam(s.key); setHi(-1); }            // family → its subgenres
    else { setSub(s.key); setView("artist"); setHi(-1); }     // subgenre → its bands
  };

  const ctxLabel = sub != null ? R.SUBS[sub].name : fam != null ? famName(fam) : null;

  return (
    <div className="r-view">
      <div className="r-viewhead">
        <div>
          <div className="r-kicker">Journey · {yearsArr[0]} — {yearsArr[yearsArr.length - 1]}</div>
          <h1 className="r-title">How it <em>flowed</em><span className="dot">.</span></h1>
        </div>
        <div className="r-seg" style={{ alignSelf: "flex-end" }}>
          {[["genre", fam != null ? "Subgenres" : "Genres"], ["artist", "Artists"]].map(([k, lbl]) =>
            <button key={k} data-on={view === k} onClick={() => { setView(k); setHi(-1); }}>{lbl}</button>)}
        </div>
      </div>

      {/* breadcrumb path */}
      <div className="jy-crumbs">
        <span className="jy-crumb" data-cur={fam == null} onClick={() => { setFam(null); setSub(null); setView("genre"); setHi(-1); }}>All genres</span>
        {fam != null && <><span className="jy-sep">›</span>
          <span className="jy-crumb" data-cur={sub == null && view === "genre"} onClick={() => { setSub(null); setView("genre"); setHi(-1); }}>{famName(fam)}</span></>}
        {sub != null && <><span className="jy-sep">›</span>
          <span className="jy-crumb" data-cur={true} onClick={() => { setView("artist"); setHi(-1); }}>{R.SUBS[sub].name}</span></>}
      </div>

      <p className="r-lede" style={{ marginTop: 4, marginBottom: "var(--gap)" }}>
        {view === "artist"
          ? <>The bands behind <b style={{ color: "var(--ink)" }}>{ctxLabel || "your whole library"}</b> — your most-played, as ribbons over time. Click one to open it.</>
          : fam != null
            ? <>Inside <b style={{ color: "var(--ink)" }}>{famName(fam)}</b> — its subgenres year by year. <b>Click a subgenre to see the bands</b> behind it.</>
            : <>Each ribbon is a genre family; thickness is how much you played it that year. <b>Click a genre to drill in.</b></>}
      </p>

      <div className="r-card" style={{ padding: "10px 8px 4px", overflow: "hidden" }}>
        {series.length === 0
          ? <div style={{ padding: 60, textAlign: "center", color: "var(--ink-faint)", fontFamily: "var(--mono)", fontSize: 12 }}>No per-year data for this slice.</div>
          : <StreamGraph series={series} years={yearsArr} hi={hi} setHi={setHi} onPick={onPick} clickable={true} />}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 16 }}>
        {series.map((s, i) => (
          <div key={s.key} onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(-1)} onClick={() => onPick(s)}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer", opacity: hi < 0 || hi === i ? 1 : 0.36, transition: ".15s" }}>
            <span style={{ width: 11, height: 11, borderRadius: 3, background: `oklch(0.62 0.16 ${s.hue})` }} />
            <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>{s.name}</span>
          </div>
        ))}
      </div>

      <style>{`
        .jy-crumbs { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px; }
        .jy-crumb { font-family: var(--mono); font-size: 11px; letter-spacing: .04em; color: var(--ink-faint); cursor: pointer; transition: color .12s; }
        .jy-crumb:hover { color: var(--ink); }
        .jy-crumb[data-cur="true"] { color: var(--accent); }
        .jy-sep { color: var(--ink-faint); font-size: 11px; }
      `}</style>
    </div>
  );
}
