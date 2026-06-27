// rotation-explore.jsx — the converged explorer. One filter set {time · subgenre · clock-slots}
// over a SINGLE side-by-side surface: the sound map (left, sticky) and the ranked results
// (right) are the same universe (window.ROTATION.EXPLORE — every tagged artist), so clicking a
// subgenre bubble filters the list and a click is never empty. Genres are grouped under families
// (FamiliesGrid) — filter by family or subgenre; subgenres morph smoothly as you scrub years.

const _inflate = (flat) => Array.from({ length: 7 }, (_, r) => flat.slice(r * 24, r * 24 + 24));
const _zeros = () => Array.from({ length: 7 }, () => new Array(24).fill(0));

// rhythm grid for the selected year (genre/sub reflected as highlight, not aggregation)
function rhythmGrid(R, year) {
  if (year == null) return R.CLOCK.grid;
  return R.CLOCK_BY_YEAR[year] ? _inflate(R.CLOCK_BY_YEAR[year]) : _zeros();
}

// plays by an artist inside selected clock cells (kept artists only — ARTIST_CLOCK is the 205)
function tsPlays(R, id, cells) {
  const arr = R.ARTIST_CLOCK[id];
  if (!arr) return 0;
  let s = 0;
  for (const [c, n] of arr) if (cells.has(c)) s += n;
  return s;
}

// subgenre bubble weights for a year, summed over the EXPLORE universe (so map ↔ ranking match)
function mapWeights(R, year) {
  const w = new Array(R.SUBS.length).fill(0);
  for (const a of R.EXPLORE) {
    const p = year == null ? a.plays : ((a.yp && a.yp[year]) || 0);
    if (!p) continue;
    for (const si of a.s) w[si] += p;
  }
  return R.SUBS.map((s, i) => ({ ...s, w: w[i] }));
}

function exploreRank(R, kind, f) {
  const { year, fam, subIdx, cells } = f;
  const hasCells = cells && cells.size > 0;
  const inFam = (s) => fam == null || s.some(si => R.SUBS[si].fam === fam); // inclusive: any sub in family
  if (kind === "artists") {
    const AXI = { energy: 0, valence: 1, acoustic: 2, tempo: 3, dance: 4 }, snd = f.sound, dir = f.dir || 1;
    const arr = [];
    for (const a of R.EXPLORE) {
      if (year != null && !(a.yp && a.yp[year])) continue;
      if (subIdx >= 0) { if (a.s.indexOf(subIdx) < 0) continue; }
      else if (!inFam(a.s)) continue;
      const plays = hasCells ? tsPlays(R, a.id, cells) : (year != null ? a.yp[year] : a.plays);
      if (hasCells && !plays) continue;
      let value = plays, disp;
      if (snd) {                                   // sort by measured sound instead of plays
        const af = R.AUDIO[a.id]; if (!af || plays < 15) continue;   // floor keeps it meaningful
        if (snd === "pop") { value = af[7]; disp = af[7] + "/100"; }
        else { value = af[AXI[snd]]; disp = Math.round(value * 100) + "%"; }
      }
      arr.push({ id: a.id, label: a.name, value, disp, plays, hue: a.hue, kept: !!(R.byId[a.id] || (R.expById && R.expById[a.id])),
        sub: (R.SUBS[a.s[0]] || {}).name || "" });
    }
    const _seen = new Set();   // distinct artists can share a slug id (✝✝✝/Crosses) — keep one, avoids key collisions
    return arr.sort((x, y) => (y.value - x.value) * (snd ? dir : 1)).filter(x => _seen.has(x.id) ? false : _seen.add(x.id)).slice(0, 40);
  }
  let src;
  if (year == null) {
    const base = kind === "albums" ? R.ALBUMS : R.TRACKS;
    src = base.map(a => ({ id: a.id, aid: a.artistId, label: a.title, value: a.plays, hue: a.hue, sub: a.artist }));
  } else {
    const yr = R.YEARS.find(y => y.year === year) || {};
    src = (yr[kind] || []).map((it, i) => ({ id: kind + year + i, aid: it.artistId, label: it.title, value: it.plays, hue: it.hue, sub: it.artist }));
  }
  if (subIdx >= 0) src = src.filter(it => { const e = R.expById[it.aid]; return e && e.s.indexOf(subIdx) >= 0; });
  else if (fam != null) src = src.filter(it => { const e = R.expById[it.aid]; return e && e.s.some(si => R.SUBS[si].fam === fam); });
  if (hasCells) src = src.filter(it => tsPlays(R, it.aid, cells) > 0);
  return src.map(it => ({ ...it, kept: !!(R.byId[it.aid] || (R.expById && R.expById[it.aid])) })).sort((a, b) => b.value - a.value).slice(0, 40);
}

// ── mood lens (the former Mood page, folded in as a filter) ──
// Zones split the valence (af[1], x) × energy (af[0], y) plane into quadrants around the midline.
const MOOD_ZONES = ["dark-intense", "bright-intense", "dark-calm", "bright-calm"];
const MOOD_LABELS = { "dark-intense": "dark · intense", "bright-intense": "bright · intense", "dark-calm": "dark · calm", "bright-calm": "bright · calm" };
const zoneOf = (x, y) => (x >= 0.5 ? "bright" : "dark") + "-" + (y >= 0.5 ? "intense" : "calm");
const inMoodZone = (af, z) => !z || zoneOf(af[1], af[0]) === z;

// EXPLORE artists (with measured audio) passing the genre/time filters; moodZone applied only when
// applyZone is set (the quadrant shows the whole slice; facts/results reflect the chosen zone too).
function sliceArtists(R, f, applyZone) {
  const A = R.AUDIO || {}, { year, fam, subIdx, cells, moodZone } = f;
  const hasCells = cells && cells.size > 0;
  const inFam = (s) => fam == null || s.some(si => R.SUBS[si].fam === fam);
  const out = [];
  for (const a of R.EXPLORE) {
    const af = A[a.id]; if (!af) continue;
    if (year != null && !(a.yp && a.yp[year])) continue;
    if (subIdx >= 0) { if (a.s.indexOf(subIdx) < 0) continue; } else if (!inFam(a.s)) continue;
    if (hasCells && !tsPlays(R, a.id, cells)) continue;
    if (applyZone && moodZone && !inMoodZone(af, moodZone)) continue;
    out.push(a);
  }
  return out;
}

// hue for a media artist with no profiled record (deterministic from the name)
const _hueHash = (s) => { let h = 0; for (const c of (s || "")) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 360; };

// mediaRank — rank albums/tracks from the lazy media-index at FULL depth, applying the same filter
// set as the inline ranking. `meta` is the precomputed per-artist resolution (id/record/hue). Returns
// the top `limit` rows + whether more exist. Genre/mood/clock reach as far as the artist data does;
// year/plays reach the whole library. Rows are pre-sorted by plays, so all-time queries break early.
function mediaRank(M, R, meta, kind, f, limit) {
  const rows = kind === "albums" ? M.albums : M.tracks;
  const tailIdx = kind === "albums" ? 5 : 4;
  const { year, fam, subIdx, cells, moodZone } = f;
  const hasCells = cells && cells.size > 0, noYear = year == null;
  const playsInYear = (row, y) => { const t = row[tailIdx]; if (t == null) return 0; if (typeof t === "number") return t === y ? row[2] : 0; for (let i = 0; i < t.length; i += 2) if (t[i] === y) return t[i + 1]; return 0; };
  const out = []; let more = false;
  for (const row of rows) {
    const m = meta[row[1]], rec = m.rec;
    if (subIdx >= 0) { if (!rec || !rec.s || rec.s.indexOf(subIdx) < 0) continue; }
    else if (fam != null) { if (!rec || !rec.s || !rec.s.some(si => R.SUBS[si].fam === fam)) continue; }
    if (moodZone) { const af = R.AUDIO[m.aid]; if (!af || !inMoodZone(af, moodZone)) continue; }
    if (hasCells && !tsPlays(R, m.aid, cells)) continue;
    let value = row[2];
    if (!noYear) { value = playsInYear(row, year); if (!value) continue; }
    out.push({ id: (kind === "albums" ? "ma" : "mt") + row[1], aid: m.aid, label: row[0], sub: M.artists[row[1]], value, hue: m.hue, kept: kind === "albums" ? true : !!rec });
    if (noYear && out.length > limit) { more = true; break; }   // pre-sorted → top `limit` already
  }
  if (!noYear) { out.sort((a, b) => b.value - a.value); more = out.length > limit; }
  return { items: out.slice(0, limit), more };
}

// MoodQuadrant — valence × energy scatter that doubles as a filter: click a quadrant to scope the
// ranked results to that mood zone; click a dot to open the artist. It renders a stable universe of
// dots and animates each dot's opacity/size as the active slice (activeIds) changes, so filter
// changes elsewhere on the page ripple in smoothly rather than popping.
function MoodQuadrant({ pts, activeIds, go, moodZone, setMoodZone }) {
  const [hi, setHi] = React.useState(null);
  const QS = 560, qp = 36;
  const qx = (v) => qp + v * (QS - 2 * qp), qy = (e) => qp + (1 - e) * (QS - 2 * qp);
  const maxPlays = React.useMemo(() => { let m = 1; for (const p of pts) if (activeIds.has(p.id) && p.plays > m) m = p.plays; return m; }, [pts, activeIds]);
  const nActive = activeIds.size;
  const mid = 0.5;
  const zones = [
    { z: "dark-intense", x: qp, y: qp, w: qx(mid) - qp, h: qy(mid) - qp },
    { z: "bright-intense", x: qx(mid), y: qp, w: QS - qp - qx(mid), h: qy(mid) - qp },
    { z: "dark-calm", x: qp, y: qy(mid), w: qx(mid) - qp, h: QS - qp - qy(mid) },
    { z: "bright-calm", x: qx(mid), y: qy(mid), w: QS - qp - qx(mid), h: QS - qp - qy(mid) },
  ];
  return (
    <div style={{ padding: "14px 16px 10px" }}>
      <svg viewBox={`0 0 ${QS} ${QS}`} style={{ width: "100%", height: "auto", display: "block" }} onMouseLeave={() => setHi(null)}>
        {zones.map(zn => <rect key={zn.z} x={zn.x} y={zn.y} width={zn.w} height={zn.h}
          fill={moodZone === zn.z ? "var(--accent-bg)" : "transparent"} stroke="none"
          style={{ cursor: "pointer", transition: "fill .35s ease" }} onClick={() => setMoodZone(moodZone === zn.z ? null : zn.z)}><title>{MOOD_LABELS[zn.z]}</title></rect>)}
        <line x1={qx(.5)} y1={qp} x2={qx(.5)} y2={QS - qp} stroke="var(--rule)" strokeWidth="1" />
        <line x1={qp} y1={qy(.5)} x2={QS - qp} y2={qy(.5)} stroke="var(--rule)" strokeWidth="1" />
        {[["intense", qx(.5), qp - 4, "middle"], ["calm", qx(.5), QS - qp + 16, "middle"], ["dark", qp - 8, qy(.5), "end"], ["bright", QS - qp + 8, qy(.5), "start"]].map(([t, x, y, anc]) =>
          <text key={t} x={x} y={y} textAnchor={anc} fontFamily="var(--mono)" fontSize="10" fill="var(--ink-faint)">{t}</text>)}
        {pts.map(p => {
          const active = activeIds.has(p.id), on = hi === p.id;
          const dimZone = active && moodZone && zoneOf(p.x, p.y) !== moodZone;
          const op = !active ? 0 : on ? 0.95 : dimZone ? 0.1 : 0.62;
          const r = on ? 7 : 3 + Math.sqrt(p.plays / maxPlays) * 9;
          return (
            <circle key={p.id} cx={qx(p.x)} cy={qy(p.y)} r={r} fill={`oklch(0.64 0.16 ${p.hue})`}
              fillOpacity={op} stroke={on ? "#fff" : "none"} strokeWidth="1.3"
              style={{ cursor: active ? "pointer" : "default", pointerEvents: active ? "auto" : "none", transition: "fill-opacity .45s ease, r .25s ease" }}
              onMouseEnter={() => active && setHi(p.id)} onClick={(e) => { e.stopPropagation(); active && go("artist", p.id); }}><title>{p.name}</title></circle>);
        })}
      </svg>
      <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", textAlign: "center", marginTop: 2 }}>
        {hi ? (pts.find(p => p.id === hi) || {}).name : moodZone ? `${MOOD_LABELS[moodZone]} — tap again to clear` : `${fmt(nActive)} artists · tap a quadrant to filter · tap a dot to open`}</div>
    </div>
  );
}

// MoodContext — the facts strip + mood-over-years arc, recomputed for whatever slice is active.
function MoodContext({ R, arts, go }) {
  const A = R.AUDIO || {};
  const years = React.useMemo(() => R.GENRE_FLOW.years.map(y => y.year), [R]);
  const facts = React.useMemo(() => {
    const all = arts; const n = all.length || 1;
    let se = 0, sv = 0, sd = 0, smaj = 0, sbpm = 0;
    for (const a of all) { const af = A[a.id]; se += af[0]; sv += af[1]; sd += af[4]; smaj += af[6]; sbpm += 50 + af[3] * 140; }
    const strong = all.filter(a => a.plays >= 30); const pool = strong.length ? strong : all;
    const top = (idx, dir) => pool.slice().sort((x, y) => dir * (A[y.id][idx] - A[x.id][idx]))[0];
    return { n: all.length, energy: se / n, valence: sv / n, dance: sd / n, major: smaj / n, bpm: Math.round(sbpm / n),
      danceArtist: top(4, 1), sadArtist: top(1, -1), obscureArtist: top(7, -1) };
  }, [arts]);
  const arc = React.useMemo(() => {
    const e = years.map(() => [0, 0]), v = years.map(() => [0, 0]);
    for (const a of arts) { const af = A[a.id]; if (!af || !a.yp) continue; years.forEach((y, i) => { const w = a.yp[y] || 0; if (!w) return; e[i][0] += af[0] * w; e[i][1] += w; v[i][0] += af[1] * w; v[i][1] += w; }); }
    return years.map((y, i) => ({ y, energy: e[i][1] ? e[i][0] / e[i][1] : null, valence: v[i][1] ? v[i][0] / v[i][1] : null }));
  }, [arts, years]);
  const W = 1000, H = 240, pad = 30;
  const xAt = (i) => pad + (years.length === 1 ? 0 : i / (years.length - 1)) * (W - 2 * pad);
  const yAt = (val) => pad + (1 - val) * (H - 2 * pad);
  const line = (key) => arc.map((d, i) => d[key] == null ? null : `${xAt(i).toFixed(1)} ${yAt(d[key]).toFixed(1)}`).filter(Boolean).join(" L ");
  const Fact = ({ k, v, sub }) => (<div className="r-card" style={{ padding: "13px 15px" }}><div className="r-mono" style={{ fontSize: 8.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ink-faint)" }}>{k}</div><div style={{ fontFamily: "var(--serif)", fontSize: 21, marginTop: 2 }}>{v}</div>{sub && <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", marginTop: 2 }}>{sub}</div>}</div>);
  if (!arts.length) return <div className="r-card xp-empty" style={{ marginTop: "var(--gap)" }}>No measured audio in this slice — loosen a filter.</div>;
  return (
    <div style={{ marginTop: "var(--gap)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: "var(--gap)", marginBottom: "var(--gap)" }}>
        <Fact k="avg energy" v={Math.round(facts.energy * 100) + "%"} sub={facts.bpm + " bpm median"} />
        <Fact k="avg mood" v={Math.round(facts.valence * 100) + "%"} sub={facts.valence < .45 ? "leans dark" : facts.valence > .55 ? "leans bright" : "balanced"} />
        <Fact k="key" v={Math.round(facts.major * 100) + "% major"} sub={facts.major < .5 ? "minor-leaning" : "mostly major"} />
        <Fact k="most danceable" v={facts.danceArtist ? facts.danceArtist.name : "—"} sub="by audio" />
        <Fact k="darkest" v={facts.sadArtist ? facts.sadArtist.name : "—"} sub="lowest valence" />
        <Fact k="most obscure" v={facts.obscureArtist ? facts.obscureArtist.name : "—"} sub="lowest popularity" />
      </div>
      <div className="r-card" style={{ padding: "16px 18px" }}>
        <div className="r-card-h" style={{ padding: 0, marginBottom: 6 }}><span className="lbl"><b>Mood over the years</b></span>
          <span className="meta"><span style={{ color: "oklch(0.66 0.18 30)" }}>● energy</span> &nbsp; <span style={{ color: "oklch(0.66 0.16 250)" }}>● mood</span> · {fmt(facts.n)} artists</span></div>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
          <line x1={pad} y1={yAt(.5)} x2={W - pad} y2={yAt(.5)} stroke="var(--rule)" strokeDasharray="3 4" />
          <path d={"M " + line("energy")} fill="none" stroke="oklch(0.66 0.18 30)" strokeWidth="2.4" />
          <path d={"M " + line("valence")} fill="none" stroke="oklch(0.66 0.16 250)" strokeWidth="2.4" />
          {years.map((y, i) => <text key={y} x={xAt(i)} y={H - 8} textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-faint)" opacity={i % 2 === 0 || i === years.length - 1 ? 1 : 0}>{"'" + String(y).slice(2)}</text>)}
        </svg>
        <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", marginTop: 4 }}>each year averaged across what you played in this slice that year, weighted by plays · midline = 50%</div>
      </div>
    </div>
  );
}

// ── search ──
function timeMatches(R, q) {
  if (q.length < 2) return [];
  const days = R.CLOCK.days, all7 = [0, 1, 2, 3, 4, 5, 6], allH = Array.from({ length: 24 }, (_, h) => h);
  const cf = (ds, hs) => { const c = []; for (const d of ds) for (const h of hs) c.push(d * 24 + h); return c; };
  const out = [];
  const defs = [
    [["late night", "night", "late"], "Late night · 12–5 AM", all7, [0, 1, 2, 3, 4]],
    [["morning"], "Morning · 6–11 AM", all7, [6, 7, 8, 9, 10, 11]],
    [["afternoon", "arvo"], "Afternoon · 12–5 PM", all7, [12, 13, 14, 15, 16, 17]],
    [["evening"], "Evening · 6–11 PM", all7, [18, 19, 20, 21, 22, 23]],
    [["weekend"], "Weekend", [5, 6], allH],
    [["weekday", "weekdays", "week day"], "Weekdays", [0, 1, 2, 3, 4], allH],
  ];
  for (const [kws, label, ds, hs] of defs) if (kws.some(k => k.startsWith(q) || k.includes(q))) out.push({ type: "time", label, cells: cf(ds, hs) });
  ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].forEach((dn, i) => { if (dn.startsWith(q)) out.push({ type: "time", label: days[i], cells: cf([i], allH) }); });
  const m = /^(\d{1,2})\s*(am|pm)$/.exec(q);
  if (m) { let h = parseInt(m[1], 10) % 12; if (m[2] === "pm") h += 12; out.push({ type: "time", label: `${m[1]} ${m[2].toUpperCase()}`, cells: cf(all7, [h]) }); }
  if ("midnight".startsWith(q) && q.length >= 3) out.push({ type: "time", label: "Midnight", cells: cf(all7, [0]) });
  if ("noon".startsWith(q) && q.length >= 2) out.push({ type: "time", label: "Noon", cells: cf(all7, [12]) });
  return out.slice(0, 4);
}
function computeResults(R, yearKeys, subNames, raw) {
  const q = (raw || "").trim().toLowerCase();
  if (q.length < 2) return [];
  const inc = (s) => s && (s.toLowerCase().includes(q) || (KANA_RE.test(s) && kanaToRomaji(s).includes(q)));
  return [
    { type: "artist", label: "Artists", items: R.ARTISTS.filter(a => inc(a.name)).slice(0, 6).map(a => ({ type: "artist", label: a.name, id: a.id, dot: a.hue })) },
    { type: "sub", label: "Subgenres", items: subNames.filter(inc).slice(0, 6).map(n => ({ type: "sub", label: n, name: n })) },
    { type: "album", label: "Albums", items: R.ALBUMS.filter(a => inc(a.title)).slice(0, 3).map(a => ({ type: "album", label: a.title, sub: a.artist, id: a.artistId, dot: a.hue })) },
    { type: "track", label: "Tracks", items: R.TRACKS.filter(a => inc(a.title)).slice(0, 3).map(a => ({ type: "track", label: a.title, sub: a.artist, id: a.artistId, dot: a.hue })) },
    { type: "year", label: "Years", items: yearKeys.filter(y => String(y).includes(q)).slice(0, 4).map(y => ({ type: "year", label: String(y), year: y })) },
    { type: "time", label: "Times", items: timeMatches(R, q) },
  ];
}
function ExploreSearch({ R, yearKeys, subNames, onArtist, onSub, onYear, onCells }) {
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const boxRef = React.useRef(null);
  const groups = React.useMemo(() => computeResults(R, yearKeys, subNames, q), [R, yearKeys, subNames, q]);
  const flat = groups.flatMap(g => g.items);
  const pick = (it) => {
    setQ(""); setOpen(false);
    if (it.type === "artist" || it.type === "album" || it.type === "track") onArtist(it.id);
    else if (it.type === "sub") onSub(it.name);
    else if (it.type === "year") onYear(it.year);
    else if (it.type === "time") onCells(it.cells);
  };
  return (
    <div className="xp-search" ref={boxRef} onBlur={(e) => { if (!boxRef.current || !boxRef.current.contains(e.relatedTarget)) setOpen(false); }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
      <input value={q} placeholder="Search artists, subgenres, years, times…"
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

function ExploreView({ t, go, setPop, seed }) {
  const R = window.ROTATION;
  const [kind, setKind] = React.useState("artists");
  const [year, setYear] = React.useState(null);
  const [fam, setFam] = React.useState(null);             // family index, or null
  const [sub, setSub] = React.useState(null);             // subgenre NAME, or null
  const [cells, setCells] = React.useState(() => new Set());
  const [playing, setPlaying] = React.useState(false);
  const [lens, setLens] = React.useState("texture");      // left surface: "texture" map or "mood" quadrant
  const [moodZone, setMoodZone] = React.useState(null);   // active valence×energy quadrant filter, or null
  const [mediaReady, setMediaReady] = React.useState(!!window.ROTATION_MEDIA);
  const [limit, setLimit] = React.useState(40);           // album/track list depth (load-more grows it)
  const [ref, seen] = useInView();

  // albums/tracks now rank from the lazy media-index (full library depth) — load it the first time
  // one of those tabs is opened.
  React.useEffect(() => {
    if (kind === "artists" || window.ROTATION_MEDIA) { if (window.ROTATION_MEDIA && !mediaReady) setMediaReady(true); return; }
    const s = document.createElement("script"); s.src = "media-index.js"; s.onload = () => setMediaReady(true); document.head.appendChild(s);
  }, [kind]);

  // deep-link: arriving via #explore/<tag> (e.g. from an artist-page genre chip) preselects that
  // subgenre, or its family if the tag names a family rather than a leaf subgenre.
  React.useEffect(() => {
    if (!seed) return;
    const norm = (x) => (x || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const q = norm(seed);
    const s = R.SUBS.find(x => norm(x.name) === q);
    if (s) { setFam(null); setSub(s.name); return; }
    const fm = R.FAMILIES.find(f => norm(f.family) === q);
    if (fm) { setSub(null); setFam(fm.i); }
  }, [seed, R]);

  const yearKeys = React.useMemo(() => Object.keys(R.CLOCK_BY_YEAR).map(Number).sort((a, b) => a - b), [R]);
  const subNames = React.useMemo(() => R.SUBS.map(s => s.name), [R]);
  const subIdx = sub == null ? -1 : R.SUBS.findIndex(s => s.name === sub);

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

  const weights = React.useMemo(() => mapWeights(R, year), [R, year]);
  // stable all-time grouping (families + their subgenres) so the breakdown never reflows on year-scrub
  const order = React.useMemo(() => {
    const allW = mapWeights(R, null);
    const byFam = new Map();
    R.SUBS.forEach((s, i) => {
      if (!byFam.has(s.fam)) byFam.set(s.fam, { fam: s.fam, family: (R.FAMILIES.find(f => f.i === s.fam) || {}).family || "—", hue: s.hue, subs: [], total: 0 });
      const g = byFam.get(s.fam); g.subs.push({ idx: i, name: s.name }); g.total += allW[i].w;
    });
    const arr = [...byFam.values()];
    arr.forEach(g => g.subs.sort((a, b) => allW[b.idx].w - allW[a.idx].w));
    return arr.sort((a, b) => b.total - a.total);
  }, [R]);
  const [sound, setSound] = React.useState(null);
  const [sndDir, setSndDir] = React.useState(1);

  // per-media-artist resolution (id / profiled record / hue), computed once the index is loaded
  const mediaArtMeta = React.useMemo(() => {
    const M = window.ROTATION_MEDIA; if (!M) return null;
    // prefer the EXPLORE record (it carries subgenres .s); fall back to the kept-artist record for hue
    return M.artists.map(name => { const aid = R.idForName(name) || R.slug(name); const rec = (R.expById && R.expById[aid]) || R.byId[aid]; return { aid, rec, hue: rec ? rec.hue : _hueHash(name) }; });
  }, [R, mediaReady]);
  const mediaItems = React.useMemo(() => {
    if (kind === "artists" || !mediaReady || !mediaArtMeta) return null;
    return mediaRank(window.ROTATION_MEDIA, R, mediaArtMeta, kind, { year, fam, subIdx, cells, moodZone }, limit);
  }, [kind, mediaReady, mediaArtMeta, year, fam, subIdx, cells, moodZone, limit, R]);
  const items = (kind !== "artists" && mediaItems) ? mediaItems.items : exploreRank(R, kind, { year, fam, subIdx, cells, sound, dir: sndDir, moodZone });
  const more = !!(mediaItems && mediaItems.more);
  // reset depth when the slice changes
  React.useEffect(() => { setLimit(40); }, [kind, year, fam, subIdx, cells, moodZone]);
  // mood-lens slices. The quadrant renders a STABLE universe of points (so dots persist across filter
  // changes and can transition opacity/size) and toggles which are "active" for the current slice;
  // facts/arc reflect the chosen zone too.
  const moodUniverse = React.useMemo(() => R.EXPLORE.filter(a => R.AUDIO[a.id]).slice()
    .sort((a, b) => b.plays - a.plays).slice(0, 1000)
    .map(a => { const af = R.AUDIO[a.id]; return { id: a.id, name: a.name, hue: a.hue, x: af[1], y: af[0], plays: a.plays }; }), [R]);
  const moodActive = React.useMemo(() => new Set(sliceArtists(R, { year, fam, subIdx, cells }, false).map(a => a.id)), [R, year, fam, subIdx, cells]);
  const moodSet = React.useMemo(() => sliceArtists(R, { year, fam, subIdx, cells, moodZone }, true), [R, year, fam, subIdx, cells, moodZone]);
  const pickSub = (name) => { setFam(null); setSub(s => s === name ? null : name); };
  const pickFam = (f) => { setSub(null); setFam(x => x === f ? null : f); };
  const toggleCell = (c) => setCells(prev => { const n = new Set(prev); n.has(c) ? n.delete(c) : n.add(c); return n; });
  const toggleMany = (list) => setCells(prev => { const n = new Set(prev); const all = list.every(c => n.has(c)); list.forEach(c => all ? n.delete(c) : n.add(c)); return n; });

  const chips = [];
  if (year != null) chips.push(["time", year, () => { setPlaying(false); setYear(null); }]);
  if (sub) chips.push(["subgenre", sub, () => setSub(null)]);
  else if (fam != null) chips.push(["genre", (R.FAMILIES.find(f => f.i === fam) || {}).family, () => setFam(null)]);
  if (moodZone) chips.push(["mood", MOOD_LABELS[moodZone], () => setMoodZone(null)]);
  if (cells.size) chips.push(["clock", cells.size + " slot" + (cells.size > 1 ? "s" : ""), () => setCells(new Set())]);

  return (
    <div className="r-view xp" ref={ref}>
      <div className="r-viewhead">
        <div>
          <div className="r-kicker">Explore{chips.length ? "" : " · all time"}</div>
          <h1 className="r-title">Dig <em>through</em><span className="dot">.</span></h1>
        </div>
        <div className="xp-head-right">
          <ExploreSearch R={R} yearKeys={yearKeys} subNames={subNames}
            onArtist={(id) => go("artist", id)} onSub={setSub} onYear={setYear} onCells={(arr) => setCells(new Set(arr))} />
        </div>
      </div>

      {/* filter bar: time + active */}
      <div className="xp-filters r-card">
        <div className="xp-frow">
          <span className="xp-flabel">Time</span>
          <div className="xp-chiprow">
            <button className="xp-chip xp-play" data-on={playing} onClick={togglePlay} title="Play the decade">{playing ? "❚❚" : "▶"} decade</button>
            <button className="xp-chip" data-on={year == null} onClick={() => { setPlaying(false); setYear(null); }}>All</button>
            {yearKeys.map(y => <button key={y} className="xp-chip" data-on={year === y} onClick={() => { setPlaying(false); setYear(year === y ? null : y); }}>{"'" + String(y).slice(2)}</button>)}
          </div>
        </div>
        {chips.length > 0 && (
          <div className="xp-frow">
            <span className="xp-flabel">Active</span>
            <div className="xp-chiprow">
              {chips.map(([k, v, clr]) => <button key={k} className="xp-chip xp-chip-active" onClick={clr}><span className="xp-ck">{k}</span> {v} <span className="xp-x">✕</span></button>)}
              <button className="xp-chip xp-clearall" onClick={() => { setPlaying(false); setYear(null); setFam(null); setSub(null); setCells(new Set()); setMoodZone(null); }}>clear all</button>
            </div>
          </div>
        )}
      </div>

      {/* converged surface: sound map (sticky left) + ranked results (right) */}
      <div className="xp-main m-stack">
        <div className="xp-left">
          <div className="r-card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="xp-lens">
              <div className="r-seg xp-lens-seg">
                <button data-on={lens === "texture"} onClick={() => setLens("texture")}>texture</button>
                <button data-on={lens === "mood"} onClick={() => setLens("mood")}>mood</button>
              </div>
              <span className="xp-lens-cap">{lens === "texture" ? "organic ↔ electronic" : "valence × energy"}</span>
            </div>
            {lens === "texture"
              ? <ExploreScatter subs={weights} seen={seen} activeSub={sub} activeFam={fam} onPick={pickSub} expressive={t.chart === "expressive"} setPop={setPop} />
              : <MoodQuadrant pts={moodUniverse} activeIds={moodActive} go={go} moodZone={moodZone} setMoodZone={setMoodZone} />}
          </div>
        </div>
        <div className="xp-right">
          <div className="r-seg" style={{ marginBottom: "var(--gap)" }}>
            {["artists", "albums", "tracks"].map(k => <button key={k} data-on={kind === k} onClick={() => setKind(k)}>{k}</button>)}
          </div>
          {kind === "artists" && (
            <div className="xp-frow" style={{ marginBottom: sound ? 4 : "var(--gap)" }}>
              <span className="xp-flabel">Sort</span>
              <div className="xp-chiprow">
                {[["", "plays"], ["energy", "energy"], ["valence", "mood"], ["dance", "dance"], ["acoustic", "acoustic"], ["tempo", "tempo"], ["pop", "popularity"]].map(([k, l]) =>
                  <button key={k || "p"} className="xp-chip" data-on={(sound || "") === k} onClick={() => setSound(k || null)}>{l}</button>)}
                {sound && <button className="xp-chip" onClick={() => setSndDir(d => -d)} title="flip direction">{sndDir === 1 ? "▼ high→low" : "▲ low→high"}</button>}
              </div>
            </div>
          )}
          {kind === "artists" && sound && <div className="r-mono xp-note" style={{ marginBottom: "var(--gap)" }}>{sound === "pop" ? "Spotify popularity 0–100 · flip for most-obscure first" : "share of that trait, 0–100% · artists with ≥15 plays"}</div>}
          {cells.size > 0 && kind !== "artists" && <div className="r-mono xp-note">filtered to {kind} by artists active in the selected slots</div>}
          {items.length === 0
            ? <div className="r-card xp-empty">Nothing in this slice — loosen a filter.</div>
            : <RankRows items={items} go={go} kind={kind} />}
          {more && <button className="xp-loadmore" onClick={() => setLimit(l => l + 40)}>load more {kind} ↓</button>}
          {kind !== "artists" && mediaItems && <div className="r-mono xp-note" style={{ marginTop: 8, textAlign: "center" }}>full library · {fmt(items.length)} shown</div>}
        </div>
      </div>

      {/* mood lens: contextual facts + the energy/mood arc for whatever slice is active */}
      {lens === "mood" && <MoodContext R={R} arts={moodSet} go={go} />}

      {/* genres grouped under families — tap a family or a subgenre to filter (stable order) */}
      <FamiliesGrid order={order} weights={weights} fam={fam} sub={sub} pickFam={pickFam} pickSub={pickSub} year={year} seen={seen} expressive={t.chart === "expressive"} />

      <RhythmBar R={R} year={year} cells={cells} toggleCell={toggleCell} toggleMany={toggleMany} clear={() => setCells(new Set())} setPop={setPop} seen={seen} />
      {year != null && <YearDetail R={R} go={go} year={year} />}

      <style>{`
        .xp-head-right { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; justify-content: flex-end; }
        .xp-search { position: relative; display: inline-flex; align-items: center; gap: 7px; padding: 7px 12px; border: 1px solid var(--rule); border-radius: 999px; color: var(--ink-dim); min-width: 240px; transition: border-color .15s; }
        .xp-search:focus-within { border-color: var(--ink-faint); }
        .xp-search svg { flex: none; color: var(--ink-faint); }
        .xp-search input { flex: 1; min-width: 0; background: transparent; border: 0; outline: 0; color: var(--ink); font-family: var(--sans); font-size: 12.5px; }
        .xp-search input::placeholder { color: var(--ink-faint); }
        .xp-search-pop { position: absolute; top: calc(100% + 6px); left: 0; right: 0; z-index: 60; max-height: 360px; overflow-y: auto; background: var(--bg-2); border: 1px solid var(--rule-2); border-radius: 10px; padding: 6px; box-shadow: 0 18px 44px -12px rgba(0,0,0,.7); }
        .xp-search-gl { font-family: var(--mono); font-size: 8.5px; letter-spacing: .14em; text-transform: uppercase; color: var(--ink-faint); padding: 6px 8px 4px; }
        .xp-search-item { display: flex; align-items: center; gap: 8px; width: 100%; text-align: left; padding: 7px 8px; border: 0; background: transparent; border-radius: 6px; cursor: pointer; color: var(--ink); font-family: var(--sans); font-size: 12.5px; }
        .xp-search-item:hover, .xp-search-item:focus { background: var(--bg-3); outline: 0; }
        .xp-search-lbl { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .xp-search-sub { margin-left: auto; padding-left: 10px; color: var(--ink-faint); font-size: 11px; white-space: nowrap; }
        .xp-search-empty { padding: 14px 10px; color: var(--ink-faint); font-family: var(--mono); font-size: 11px; }
        .xp-filters { padding: 14px 16px; margin-bottom: var(--gap); display: grid; gap: 10px; }
        .xp-frow { display: grid; grid-template-columns: 56px 1fr; gap: 10px; align-items: start; }
        .xp-flabel { font-family: var(--mono); font-size: 9.5px; letter-spacing: .14em; text-transform: uppercase; color: var(--ink-faint); padding-top: 7px; }
        .xp-chiprow { display: flex; flex-wrap: wrap; gap: 6px; }
        .xp-chip { font-family: var(--mono); font-size: 10.5px; letter-spacing: .04em; padding: 5px 10px; border-radius: 999px; border: 1px solid var(--rule); background: transparent; color: var(--ink-soft); cursor: pointer; transition: .14s; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
        .xp-chip:hover { border-color: var(--ink-faint); color: var(--ink); }
        .xp-chip[data-on="true"] { background: var(--accent); border-color: var(--accent); color: #0c0a08; }
        .xp-play { border-color: var(--accent); color: var(--accent); letter-spacing: .08em; }
        .xp-play[data-on="true"] { background: var(--accent); color: #0c0a08; }
        .xp-chip-active { border-color: var(--accent); color: var(--ink); }
        .xp-chip-active .xp-ck { color: var(--ink-faint); text-transform: uppercase; letter-spacing: .1em; font-size: 8.5px; }
        .xp-clearall { color: var(--ink-faint); border-style: dashed; }
        .xp-dot { width: 9px; height: 9px; border-radius: 3px; flex: none; }
        .xp-empty { padding: 56px 20px; text-align: center; color: var(--ink-faint); font-family: var(--mono); font-size: 12px; }
        .xp-note { font-size: 10px; color: var(--ink-faint); margin-bottom: 10px; }
        .xp-loadmore { display: block; width: 100%; margin-top: 10px; padding: 9px; font-family: var(--mono); font-size: 10px;
          letter-spacing: .1em; text-transform: uppercase; color: var(--ink-soft); background: transparent;
          border: 1px dashed var(--rule-2); border-radius: 8px; cursor: pointer; transition: .15s; }
        .xp-loadmore:hover { color: var(--ink); border-color: var(--ink-faint); }
        .xp-lens { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 11px 14px 0; }
        .xp-lens-seg button { font-size: 9px; padding: 4px 10px; }
        .xp-lens-cap { font-family: var(--mono); font-size: 9px; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-faint); }
        .xp-main { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); gap: var(--gap); align-items: start; }
        .xp-left { position: sticky; top: 76px; display: grid; gap: var(--gap); }
        .xp-rows { display: grid; gap: 2px; }
        .xp-row { display: grid; grid-template-columns: 24px 34px 1fr 90px 46px; gap: 10px; align-items: center; padding: 5px 6px; border-radius: 6px; transition: background .12s; }
        .xp-row[data-link="true"] { cursor: pointer; }
        .xp-row[data-link="true"]:hover { background: var(--bg-3); }
        .xp-rank { font-family: var(--mono); font-size: 10px; color: var(--ink-faint); }
        .xp-row-main { min-width: 0; }
        .xp-row-name { font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .xp-row-sub { font-family: var(--mono); font-size: 9px; color: var(--ink-faint); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .xp-bar { height: 7px; background: var(--bg-3); border-radius: 4px; overflow: hidden; }
        .xp-bar > div { height: 100%; border-radius: 4px; transition: width .5s cubic-bezier(.3,.8,.3,1); }
        .xp-val { font-family: var(--mono); font-size: 10.5px; color: var(--ink-soft); text-align: right; }
        .xp-fam-head { display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 2px; border-radius: 5px; transition: .12s; }
        .xp-fam-head:hover { opacity: .85; }
        .xp-fam-head[data-on="true"] span:nth-child(2) { color: var(--accent); }
        .xp-railrow { display: flex; align-items: center; gap: 8px; padding: 4px 6px; border-radius: 5px; cursor: pointer; transition: .12s; }
        .xp-railrow:hover { background: var(--bg-3); }
        .xp-railrow[data-on="true"] { background: var(--accent-bg); box-shadow: inset 0 0 0 1px var(--accent); }
        .clk-scroll > div { min-width: 0; }
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
        @media (max-width: 860px) { .xp-left { position: static; } }
        @media (max-width: 760px) {
          .xp-frow { grid-template-columns: 1fr; gap: 6px; }
          .xp-flabel { padding-top: 0; }
          .xp-chiprow { overflow-x: auto; flex-wrap: nowrap; padding-bottom: 4px; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
          .xp-chiprow::-webkit-scrollbar { display: none; }
          .xp-head-right { width: 100%; }
          .xp-search { min-width: 0; width: 100%; }
          .clk-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; padding-bottom: 4px; }
          .clk-scroll::-webkit-scrollbar { display: none; }
          .clk-scroll > div { min-width: 430px; }
          .era-d-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </div>
  );
}

// scatter where bubbles ARE subgenres; click selects/filters; radius morphs with the year
function ExploreScatter({ subs, seen, activeSub, activeFam, onPick, expressive, setPop }) {
  const W = 1000, H = 560, pad = 46;
  const maxW = Math.max(1, ...subs.map(s => s.w));
  const px = (x) => pad + x * (W - pad * 2);
  const py = (y) => H - pad - y * (H - pad * 2);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      {[.25, .5, .75].map(g => (<g key={g}>
        <line x1={px(g)} y1={pad} x2={px(g)} y2={H - pad} stroke="var(--rule)" strokeWidth="1" />
        <line x1={pad} y1={py(g)} x2={W - pad} y2={py(g)} stroke="var(--rule)" strokeWidth="1" />
      </g>))}
      <rect x={pad} y={pad} width={W - pad * 2} height={H - pad * 2} fill="none" stroke="var(--rule-2)" strokeWidth="1" />
      <text x={pad} y={H - 16} fill="var(--ink-faint)" fontSize="11" fontFamily="var(--mono)" style={{ letterSpacing: ".1em" }}>ORGANIC</text>
      <text x={W - pad} y={H - 16} fill="var(--ink-faint)" fontSize="11" fontFamily="var(--mono)" textAnchor="end" style={{ letterSpacing: ".1em" }}>ELECTRONIC</text>
      <text x={20} y={H - pad} fill="var(--ink-faint)" fontSize="11" fontFamily="var(--mono)" transform={`rotate(-90 20 ${H - pad})`} style={{ letterSpacing: ".1em" }}>CALM</text>
      <text x={20} y={pad + 56} fill="var(--ink-faint)" fontSize="11" fontFamily="var(--mono)" transform={`rotate(-90 20 ${pad + 56})`} textAnchor="end" style={{ letterSpacing: ".1em" }}>VIOLENT</text>
      {subs.map((s, i) => {
        const present = s.w > 0;
        const r = present ? 9 + (s.w / maxW) * 42 : 0;
        const on = activeSub ? activeSub === s.name : (activeFam != null && s.fam === activeFam);
        const dim = activeSub ? activeSub !== s.name : (activeFam != null && s.fam !== activeFam);
        const col = expressive ? `oklch(0.62 0.17 ${s.hue})` : "var(--accent)";
        return (
          <g key={s.name} style={{ cursor: present ? "pointer" : "default", opacity: seen ? (present ? (dim ? 0.14 : 1) : 0) : 0,
            transition: `opacity .45s cubic-bezier(.3,.8,.3,1) ${i * 0.008}s`, pointerEvents: present ? "auto" : "none" }}
            onMouseEnter={() => setPop({ x: px(s.x) / W * (window.innerWidth - 460), y: 300, title: s.name, pip: s.hue, meta: "subgenre", rows: [["plays", fmt(s.w)]], hint: "click to filter" })}
            onClick={() => onPick(s.name)} onMouseLeave={() => setPop(null)}>
            {/* transparent min-size hit target so even tiny subgenres are clickable/hoverable */}
            <circle cx={px(s.x)} cy={py(s.y)} r={Math.max(r, 14)} fill="transparent" />
            <circle cx={px(s.x)} cy={py(s.y)} r={r} fill={col} fillOpacity={on ? .5 : (expressive ? .28 : .14)} stroke={col} strokeWidth={on ? 2.2 : 1.4} style={{ transition: "r .55s cubic-bezier(.3,.8,.3,1), fill-opacity .2s" }} />
            {r > 17 && <text x={px(s.x)} y={py(s.y)} textAnchor="middle" dominantBaseline="middle" fill="var(--ink)" fontSize={Math.min(13, r / 3.2)} fontFamily="var(--sans)" fontWeight="500" style={{ pointerEvents: "none", transition: "font-size .55s" }}>{s.name.length > 13 ? s.name.split(" ")[0] : s.name}</text>}
          </g>
        );
      })}
    </svg>
  );
}

// genres grouped under families — the breakdown you liked, restored. Family header filters by
// family; each subgenre row filters by subgenre. Order is stable (all-time); only the bars move
// when you scrub years, so play-the-decade animates instead of reflowing.
function FamiliesGrid({ order, weights, fam, sub, pickFam, pickSub, year, seen, expressive }) {
  return (
    <div style={{ marginTop: "var(--gap)" }}>
      <div className="r-mono" style={{ fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--ink-faint)", margin: "4px 0 10px" }}>
        Genres — tap a family or subgenre to filter {year ? "· " + year : ""}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px,1fr))", gap: "var(--gap)" }}>
        {order.map((g, gi) => {
          const fw = g.subs.reduce((s, su) => s + (weights[su.idx].w || 0), 0);
          const fmax = Math.max(1, ...g.subs.map(su => weights[su.idx].w || 0));
          const onFam = fam === g.fam;
          return (
            <div key={g.fam} className="r-card" style={{ padding: 16, boxShadow: onFam ? "inset 0 0 0 1px var(--accent)" : "none", transition: ".15s" }}>
              <div className="xp-fam-head" data-on={onFam} onClick={() => pickFam(g.fam)}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: `oklch(0.62 0.16 ${g.hue})`, flex: "none" }} />
                <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 18, flex: 1, minWidth: 0 }}>{g.family}</span>
                <span className="r-mono" style={{ fontSize: 10, color: "var(--ink-faint)" }}>{fmtK(fw)}</span>
              </div>
              <div style={{ display: "grid", gap: 6, marginTop: 12 }}>
                {g.subs.map((su, si) => {
                  const w = weights[su.idx].w || 0;
                  return (
                    <div key={su.name} className="xp-sub-row" data-on={sub === su.name} onClick={() => pickSub(su.name)} style={{ opacity: w === 0 ? 0.4 : 1 }}>
                      <span style={{ fontSize: 11.5, color: "var(--ink-soft)", flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{su.name}</span>
                      <div style={{ width: 80, height: 5, background: "var(--bg-3)", borderRadius: 3, overflow: "hidden", margin: "0 8px" }}>
                        <div style={{ height: "100%", width: (seen ? w / fmax * 100 : 0) + "%", background: expressive ? `oklch(0.6 0.16 ${g.hue})` : "var(--accent)", borderRadius: 3, transition: `width .7s cubic-bezier(.3,.8,.3,1) ${(gi * 0.02 + si * 0.03)}s` }} />
                      </div>
                      <span className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", width: 34, textAlign: "right" }}>{fmtK(w)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// compact ranked rows for the right column. Albums open their own page; artists/tracks navigate to
// the artist (kept artists/long-tail with a page only).
function RankRows({ items, go, kind }) {
  const R = window.ROTATION;
  const max = Math.max(1, ...items.map(i => i.value));
  const isAlbum = kind === "albums";
  const onClick = (it) => {
    if (isAlbum) { go("album", R.slug(it.sub) + "~" + R.slug(it.label)); return; }
    if (it.kept !== false) go("artist", it.aid || it.id);
  };
  return (
    <div className="xp-rows">
      {items.map((it, i) => (
        <div key={(it.aid || it.id) + "-" + i} className="xp-row" data-link={isAlbum || it.kept !== false} onClick={() => onClick(it)}>
          <span className="xp-rank">{String(i + 1).padStart(2, "0")}</span>
          <GenCover hue={it.hue} name={isAlbum ? it.label : (it.aid ? it.sub : it.label)} size={34} radius={3} />
          <div className="xp-row-main">
            <div className="xp-row-name">{it.label}</div>
            <div className="xp-row-sub">{it.sub}</div>
          </div>
          <div className="xp-bar"><div style={{ width: (it.value / max * 100) + "%", background: `oklch(0.6 0.14 ${it.hue})` }} /></div>
          <span className="xp-val">{it.disp || fmt(it.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ── RHYTHM (persistent, selectable) ──
function RhythmBar({ R, year, cells, toggleCell, toggleMany, clear, setPop, seen }) {
  const days = R.CLOCK.days;
  const grid = rhythmGrid(R, year);
  const max = Math.max(1, ...grid.flat());
  const total = grid.flat().reduce((a, b) => a + b, 0);
  const hourTotals = Array.from({ length: 24 }, (_, h) => days.reduce((s, _, di) => s + grid[di][h], 0));
  const peakHour = hourTotals.indexOf(Math.max(...hourTotals));
  const nightShare = total ? (hourTotals.slice(0, 5).reduce((a, b) => a + b, 0) / total * 100) : 0;
  const hr = (h) => (h % 12 === 0 ? 12 : h % 12) + (h < 12 ? "a" : "p");
  const sel = cells && cells.size > 0;
  const cellStyle = (v, c) => {
    const x = v / max, on = cells.has(c);
    return { aspectRatio: "1", borderRadius: 2, cursor: "pointer", transition: "opacity .4s, transform .12s, box-shadow .12s",
      background: x < 0.04 ? "var(--bg-3)" : `oklch(${0.28 + x * 0.5} ${0.05 + x * 0.12} var(--acc-h))`,
      opacity: seen ? (sel && !on ? 0.32 : 1) : 0, boxShadow: on ? "0 0 0 1.6px var(--accent)" : "none" };
  };
  if (total === 0) return <div className="r-card xp-empty" style={{ marginTop: "var(--gap)" }}>No plays in this slice.</div>;
  return (
    <div className="r-card" style={{ padding: "16px 18px 14px", marginTop: "var(--gap)" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap", marginBottom: 12 }}>
        <div className="r-mono" style={{ fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--ink-faint)" }}>Rhythm</div>
        <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>Peak <b style={{ color: "var(--ink)" }}>{hr(peakHour).replace("a", " AM").replace("p", " PM")}</b><span style={{ color: "var(--ink-faint)" }}> · </span><b style={{ color: "var(--accent)" }}>{nightShare.toFixed(0)}%</b> before 5 AM</div>
        <div className="r-mono" style={{ marginLeft: "auto", fontSize: 10, color: "var(--ink-faint)" }}>
          {sel ? <span>{cells.size} slot{cells.size > 1 ? "s" : ""} · <span style={{ color: "var(--accent)", cursor: "pointer" }} onClick={clear}>clear</span></span> : "tap cells / day / hour to filter"}
        </div>
      </div>
      <div className="clk-scroll">
        <div style={{ display: "grid", gridTemplateColumns: "34px repeat(24, 1fr)", gap: 3, marginBottom: 5 }}>
          <div />
          {Array.from({ length: 24 }, (_, h) => <div key={h} onClick={() => toggleMany(days.map((_, di) => di * 24 + h))} className="r-mono" style={{ fontSize: 7.5, color: "var(--ink-faint)", textAlign: "center", cursor: "pointer" }}>{h % 3 === 0 ? hr(h) : ""}</div>)}
        </div>
        {days.map((d, di) => (
          <div key={d} style={{ display: "grid", gridTemplateColumns: "34px repeat(24, 1fr)", gap: 3, marginBottom: 3 }}>
            <div className="r-mono" onClick={() => toggleMany(Array.from({ length: 24 }, (_, h) => di * 24 + h))} style={{ fontSize: 9.5, color: "var(--ink-soft)", display: "flex", alignItems: "center", cursor: "pointer" }}>{d}</div>
            {grid[di].map((v, h) => { const c = di * 24 + h; return (
              <div key={h} title={`${d} ${hr(h)} · ${v}`} style={cellStyle(v, c)}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.35)"; const r = e.currentTarget.getBoundingClientRect(); setPop({ x: r.left + r.width / 2, y: r.top, title: `${d}, ${hr(h)}`, pip: "var(--acc-h)", meta: "listening", rows: [["plays", fmt(v)], ["of peak", Math.round(v / max * 100) + "%"]], hint: "click to filter" }); }}
                onClick={() => toggleCell(c)} onMouseLeave={(e) => { e.currentTarget.style.transform = ""; setPop(null); }} />
            ); })}
          </div>
        ))}
        <div style={{ display: "grid", gridTemplateColumns: "34px 1fr", gap: 0, marginTop: 14, alignItems: "end" }}>
          <div />
          <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: 44 }}>
            {hourTotals.map((v, h) => <div key={h} style={{ flex: 1, height: (seen ? v / Math.max(...hourTotals, 1) * 100 : 0) + "%", background: h === peakHour ? "var(--accent)" : "var(--rule-2)", borderRadius: "2px 2px 0 0", transition: `height .6s cubic-bezier(.3,.8,.3,1) ${h * 0.012}s` }} title={`${hr(h)} · ${v}`} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── YEAR DETAIL ──
function YearDetail({ R, go, year }) {
  const yr = (R.YEARS || []).find(y => y.year === year);
  if (!yr || yr.plays < 300) return null;
  const headline = (typeof ERA_HEADLINE !== "undefined" && ERA_HEADLINE[year]) || ["", ""];
  const open = (name) => go("artist", R.idForName(name) || R.slug(name));
  const Stat = ({ k, v, sub, onClick }) => (<div className="era-d-stat" data-link={!!onClick} onClick={onClick}><div className="r-mono era-d-k">{k}</div><div className="era-d-v">{v}</div>{sub && <div className="era-d-sub">{sub}</div>}</div>);
  return (
    <div className="r-card xp-yeardetail">
      <div className="xp-yd-head">
        <div className="r-stat-n xp-yd-year">{year}</div>
        {headline[0] && <div><div className="xp-yd-title">{headline[0]}</div><div className="xp-yd-sub">{headline[1]}</div></div>}
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
