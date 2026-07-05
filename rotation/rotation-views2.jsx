// rotation-views2.jsx — Artist drilldown · Album · Track + Live
// exports: ArtistView, AlbumView, TrackView, LiveView

// ════════════════════════ ARTIST DRILLDOWN ════════════════════════
const DNA_AXES = ["NRG", "MOOD", "ACOU", "BPM", "DANCE", "INSTR"];

// Per-artist album/song streamgraph (reuses the Journey StreamGraph). Flow data lives in a
// separate artist-flow.js, lazy-loaded on the first artist-page visit so first paint stays lean.
function ArtistFlow({ id, hue, go }) {
  const get = () => (window.ROTATION_FLOW && window.ROTATION_FLOW.byId[id]) || (window.ROTATION_FLOW ? false : null);
  const [flow, setFlow] = React.useState(get);
  const [mode, setMode] = React.useState("albums");  // albums | songs
  const [drill, setDrill] = React.useState(null);    // album index when drilled into its songs
  const [hi, setHi] = React.useState(-1);
  React.useEffect(() => {
    if (window.ROTATION_FLOW) { setFlow(get()); return; }
    let s = document.getElementById("rotation-flow-js");
    if (!s) { s = document.createElement("script"); s.id = "rotation-flow-js"; s.src = "artist-flow.js"; document.head.appendChild(s); }
    const onLoad = () => setFlow(get());
    s.addEventListener("load", onLoad);
    return () => s.removeEventListener("load", onLoad);
  }, [id]);
  React.useEffect(() => { setMode("albums"); setDrill(null); setHi(-1); }, [id]);  // reset on artist change
  if (!flow) return null;
  if ((flow.albums || []).length < 1 && (flow.tracks || []).length < 1) return null;

  let items, years, drillAlbum = null;
  if (mode === "songs") { items = flow.tracks; years = flow.years; }
  else if (drill != null && flow.albums[drill]) { drillAlbum = flow.albums[drill]; items = drillAlbum.tracks; years = drillAlbum.tyears; }
  else { items = flow.albums; years = flow.years; }
  const series = items.map((it, i) => ({ key: it.name + i, name: it.name, hue: (hue + (i - (items.length - 1) / 2) * 15 + 360) % 360, vals: it.vals, mute: !!it.other }));
  const canDrill = mode === "albums" && drill == null;
  // albums drill into their songs; songs (top-songs mode OR inside a drilled album) open the track page
  const onPick = canDrill
    ? ((s, i) => { if (!s.mute && (flow.albums[i].tracks || []).length) { setDrill(i); setHi(-1); } })
    : (go ? ((s) => { if (!s.mute) go("track", id + "~" + window.ROTATION.slug(s.name)); }) : null);

  return (
    <div className="r-card" style={{ padding: 18 }}>
      <div className="r-card-h" style={{ padding: 0, marginBottom: 10 }}>
        <span className="lbl"><b>How they played out</b></span>
        <div className="r-seg">
          {[["albums", "albums"], ["songs", "songs"]].map(([k, lbl]) =>
            <button key={k} data-on={mode === k} onClick={() => { setMode(k); setDrill(null); setHi(-1); }}>{lbl}</button>)}
        </div>
      </div>
      {drillAlbum && (
        <div className="r-mono" style={{ fontSize: 11, marginBottom: 8 }}>
          <span style={{ cursor: "pointer", color: "var(--accent)" }} onClick={() => { setDrill(null); setHi(-1); }}>‹ albums</span>
          <span style={{ margin: "0 8px", color: "var(--ink-faint)" }}>›</span>
          <span style={{ color: "var(--ink)" }}>{drillAlbum.name}</span>
        </div>
      )}
      {series.length < 1
        ? <div style={{ padding: 26, textAlign: "center", color: "var(--ink-faint)", fontFamily: "var(--mono)", fontSize: 11 }}>Nothing tagged over time here.</div>
        : <StreamGraph series={series} years={years} hi={hi} setHi={setHi} onPick={onPick} clickable={!!onPick} />}
      {series.length >= 1 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 12 }}>
          {series.map((s, i) => (
            <div key={s.key} onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(-1)} onClick={() => onPick && onPick(s, i)}
              style={{ display: "inline-flex", alignItems: "center", gap: 7, transition: ".15s", opacity: hi < 0 || hi === i ? 1 : 0.34, cursor: onPick && !s.mute ? "pointer" : "default" }}>
              <span style={{ width: 9, height: 9, borderRadius: 2, background: s.mute ? "oklch(0.55 0.02 270)" : `oklch(0.62 0.16 ${s.hue})`, flex: "none" }} />
              <span style={{ fontSize: 11, color: "var(--ink-soft)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180 }}>{s.name}</span>
            </div>
          ))}
        </div>
      )}
      <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", marginTop: 10 }}>
        {canDrill ? "thickness = plays that year · click an album to break it into its songs"
          : drillAlbum ? "the songs on this record, over time — click one for its page" : "your top songs across the years — click one for its page"}
      </div>
    </div>
  );
}

// Lightweight page for an explorable artist that isn't in the kept top-205 (no full per-artist
// build). Shows what the EXPLORE record carries: plays, subgenres, listeners, debut, year shape.
// MiniArtistDetail — top tracks/albums for a long-tail artist, lazy-loaded from artist-detail.js
// (interned, fetched once on first mini-page visit so the main payload stays lean).
function MiniArtistDetail({ id, name, go }) {
  const [d, setD] = React.useState(window.ROTATION_ADETAIL || null);
  const [simTab, setSimTab] = React.useState("lastfm");
  React.useEffect(() => {
    if (window.ROTATION_ADETAIL) { setD(window.ROTATION_ADETAIL); return; }
    let s = document.getElementById("rotation-adetail-js");
    if (!s) { s = document.createElement("script"); s.id = "rotation-adetail-js"; s.src = "artist-detail.js"; document.head.appendChild(s); }
    const on = () => setD(window.ROTATION_ADETAIL);
    s.addEventListener("load", on);
    return () => s.removeEventListener("load", on);
  }, []);
  if (!d) return <div className="r-card" style={{ padding: "16px 20px", color: "var(--ink-faint)", fontFamily: "var(--mono)", fontSize: 12 }}>loading the rest…</div>;
  const R = window.ROTATION, rec = d.d[id], NM = d.names;
  if (!rec) return null;
  const artistName = name || (R.expById && R.expById[id] && R.expById[id].name) || "";
  // rows link to the real track/album pages — same routes the kept-artist page uses
  const Col = ({ title, rows, kind }) => (rows && rows.length) ? (
    <div className="r-card" style={{ padding: 18 }}>
      <div className="r-card-h" style={{ padding: 0, marginBottom: 10 }}><span className="lbl"><b>{title}</b></span></div>
      {rows.map(([ti, p], i) => (
        <div key={i} className="r-track-row" onClick={() => go(kind, R.slug(artistName) + "~" + R.slug(NM[ti]))}
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 2px", borderBottom: "1px solid var(--rule)", cursor: "pointer" }}>
          <span className="r-mono" style={{ fontSize: 10, color: "var(--ink-faint)", width: 18 }}>{String(i + 1).padStart(2, "0")}</span>
          <span style={{ flex: 1, minWidth: 0, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{NM[ti]}</span>
          <span className="r-mono" style={{ fontSize: 11, color: "var(--ink-soft)" }}>{fmt(p)}</span>
        </div>))}
    </div>) : null;
  return (
    <div style={{ display: "grid", gap: "var(--gap)" }}>
      {rec.bio && <div className="r-card" style={{ padding: "16px 20px", fontSize: 13.5, lineHeight: 1.6, color: "var(--ink-soft)" }}>{rec.bio}</div>}
      {(rec.t || rec.al) && <div className="m-stack" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--gap)" }}>
        <Col title="Top tracks" rows={rec.t} kind="track" />
        <Col title="Top albums" rows={rec.al} kind="album" />
      </div>}
      {((rec.sim && rec.sim.length > 0) || (R.AUDIO && R.AUDIO[id])) && <div className="r-card" style={{ padding: 18 }}>
        <div className="r-card-h" style={{ padding: 0, marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="lbl"><b>Sounds like</b></span>
          <div className="r-seg">
            {rec.sim && rec.sim.length > 0 && <button data-on={simTab === "lastfm"} onClick={() => setSimTab("lastfm")}>last.fm</button>}
            {R.AUDIO && R.AUDIO[id] && <button data-on={simTab === "sound"} onClick={() => setSimTab("sound")}>by sound</button>}
          </div>
        </div>
        {(simTab === "sound" || !(rec.sim && rec.sim.length)) && R.AUDIO && R.AUDIO[id] ? <SoundSimilar id={id} go={go} /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(110px,1fr))", gap: 12 }}>
          {rec.sim.map((name, i) => { const rid = (R.idForName && R.idForName(name)) || R.slug(name); const s = R.byId[rid] || (R.expById && R.expById[rid]); const played = !!s || (R.played && R.played(name)); return (
            <div key={name + i} onClick={() => s && go("artist", rid)} style={{ cursor: s ? "pointer" : "default", opacity: played ? 1 : 0.62 }}>
              <GenCover hue={s ? s.hue : 210} name={name} size={"100%"} style={{ aspectRatio: "1", width: "100%", height: "auto" }} radius={4} />
              <div style={{ fontSize: 12, lineHeight: 1.2, marginTop: 6 }}>{name}</div>
              {s ? <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)" }}>{fmt(s.plays)} plays →</div> : played ? <div className="r-mono" style={{ fontSize: 9, color: "var(--accent-dim)" }}>scrobbled</div> : <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)" }}>not yet</div>}
            </div>); })}
        </div>)}
      </div>}
      {rec.mem && rec.mem.length > 0 && <div className="r-card" style={{ padding: 18 }}>
        <div className="r-card-h" style={{ padding: 0, marginBottom: 12 }}><span className="lbl"><b>Members</b></span><span className="meta">musicbrainz · discogs</span></div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{rec.mem.map(m => <span key={m} className="r-chip" style={{ fontSize: 11 }}>{m}</span>)}</div>
      </div>}
    </div>
  );
}

function MiniArtistView({ a, go }) {
  const R = window.ROTATION;
  const subs = (a.s || []).map(i => R.SUBS[i] && R.SUBS[i].name).filter(Boolean);
  const years = React.useMemo(() => Object.keys(R.CLOCK_BY_YEAR).map(Number).sort((x, y) => x - y), []);
  const spark = a.yp ? years.map(y => a.yp[y] || 0) : null;
  const L = a.l ? (a.l >= 1e6 ? (a.l / 1e6).toFixed(1) + "M" : a.l >= 1000 ? Math.round(a.l / 1000) + "k" : a.l) : null;
  const af = R.AUDIO && R.AUDIO[a.id];   // measured audio is shipped for the long tail too
  const dna = af ? [af[0], af[1], af[2], af[3], af[4], af[5]] : null;
  const avg = React.useMemo(() => { const ks = ["energy", "valence", "acoustic", "tempo", "dance", "instr"]; return ks.map(k => R.ARTISTS.reduce((s, x) => s + x.audio[k], 0) / R.ARTISTS.length); }, []);
  const soundAlike = React.useMemo(() => {
    const me = R.AUDIO && R.AUDIO[a.id]; if (!me) return [];
    const out = [];
    for (const sid in R.AUDIO) { if (sid === a.id) continue; const v = R.AUDIO[sid]; let d = 0; for (let k = 0; k < 6; k++) { const dd = me[k] - v[k]; d += dd * dd; } out.push([sid, d]); }
    return out.sort((x, y) => x[1] - y[1]).slice(0, 6).map(e => e[0]);
  }, [a.id]);
  return (
    <div className="r-view">
      <button className="r-back" onClick={() => go("explore")}>← explore</button>
      <div style={{ display: "flex", gap: 26, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 24 }}>
        <GenCover hue={a.hue} name={a.name} size={120} radius={6} />{/* auto-resolves THUMBS + Spotify-alt fallback */}
        <div style={{ flex: 1, minWidth: 240 }}>
          <div className="r-kicker">explore{a.d ? ` · est. ${a.d}` : ""}</div>
          <h1 className="r-title" style={{ fontSize: "clamp(32px,4.5vw,54px)" }}>{a.name}<span className="dot">.</span></h1>
          <ArtistMeta gender={a.g} life={a.ty ? { type: a.ty, ended: !!a.ed, end: a.en } : null} size={16} />
          <div style={{ display: "flex", gap: 7, marginTop: 12, flexWrap: "wrap" }}>
            {subs.slice(0, 6).map(s => <span key={s} className="r-chip link" title={`Explore ${s} →`} onClick={() => go("explore", s)}>{s}</span>)}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            {[["last.fm", `https://www.last.fm/music/${encodeURIComponent(a.name)}`], ["Spotify", `https://open.spotify.com/search/${encodeURIComponent(a.name)}`]].map(([l, h]) =>
              <a key={l} href={h} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase", padding: "6px 11px", borderRadius: 999, border: "1px solid var(--rule)", color: "var(--ink-soft)", textDecoration: "none" }}>{l} ↗</a>)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 26 }}>
          <div><div className="r-stat-n" style={{ fontSize: 34 }}>{fmt(a.plays)}</div>
            <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: ".12em", textTransform: "uppercase", marginTop: 5 }}>plays</div></div>
          {L && <div><div className="r-stat-n" style={{ fontSize: 34 }}>{L}</div>
            <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: ".12em", textTransform: "uppercase", marginTop: 5 }}>listeners ww</div></div>}
        </div>
      </div>
      {spark && spark.some(v => v > 0) && (
        <div className="r-card" style={{ padding: 18, marginBottom: "var(--gap)" }}>
          <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", letterSpacing: ".14em", textTransform: "uppercase", marginBottom: 12 }}>Plays by year</div>
          <Spark data={spark} w={620} h={70} run={true} stroke="var(--accent)" fill="var(--accent-bg)" />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)" }}>{years[0]}</span>
            <span className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)" }}>{years[years.length - 1]}</span>
          </div>
        </div>
      )}
      {dna && (
        <div className="r-card" style={{ padding: 18, marginBottom: "var(--gap)", maxWidth: 380 }}>
          <div className="r-card-h" style={{ padding: 0, marginBottom: 4 }}><span className="lbl"><b>Sound DNA</b></span></div>
          <Radar axes={DNA_AXES} values={dna} values2={avg} run={true} size={224} />
          <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", textAlign: "center", marginTop: 4 }}>solid = {a.name.split(" ")[0]} · dashed = your average · measured</div>
          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 9 }}>
            {[
              { k: "tempo", v: Math.round(50 + af[3] * 140), u: " bpm", f: af[3] },
              { k: "key", v: af[6] >= 0.5 ? "major" : "minor", f: af[6] },
              { k: "loud", v: Math.round(af[9]), u: " dB", f: Math.max(0, Math.min(1, (af[9] + 60) / 60)) },
              { k: "speech", v: Math.round(af[10] * 100), u: "%", f: af[10] },
              { k: "live", v: Math.round(af[11] * 100), u: "%", f: af[11] },
              { k: "pop", v: af[7], u: "/100", f: af[7] / 100 },
              { k: "followers", v: fmtK(af[8]), f: null },
            ].map(s => (
              <div key={s.k}>
                <div className="r-mono" style={{ fontSize: 8, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--ink-faint)" }}>{s.k}</div>
                <div style={{ fontSize: 13, marginTop: 1, whiteSpace: "nowrap" }}>{s.v}{s.u && <span style={{ fontSize: 9, color: "var(--ink-faint)" }}>{s.u}</span>}</div>
                {s.f != null && <div style={{ height: 3, background: "var(--bg-3)", borderRadius: 2, marginTop: 5, overflow: "hidden" }}><div style={{ height: "100%", width: (s.f * 100) + "%", background: `oklch(0.62 0.15 ${a.hue})` }} /></div>}
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ marginBottom: "var(--gap)" }}><ArtistFlow id={a.id} hue={a.hue} go={go} /></div>
      <MiniArtistDetail id={a.id} name={a.name} hue={a.hue} go={go} />
    </div>
  );
}
// WeightRadar — the Sound DNA hexagon, but draggable: pull each axis out to weight it more, in to
// weight it less. The artist's actual DNA shows dashed underneath for reference.
function WeightRadar({ axes, weights, setWeight, dna }) {
  const size = 234, cx = size / 2, cy = size / 2, maxR = size / 2 - 32, N = axes.length;
  const ref = React.useRef(null);
  const [drag, setDrag] = React.useState(-1);
  const ang = (i) => (-Math.PI / 2) + i * 2 * Math.PI / N;
  const P = (i, r) => [cx + r * Math.cos(ang(i)), cy + r * Math.sin(ang(i))];
  const poly = (pts) => pts.map(p => p.map(n => n.toFixed(1)).join(",")).join(" ");
  const update = (i, e) => { const r = ref.current.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width * size, y = (e.clientY - r.top) / r.height * size; const a = ang(i); const proj = (x - cx) * Math.cos(a) + (y - cy) * Math.sin(a); setWeight(axes[i].k, Math.max(0, Math.min(2, Math.round(proj / maxR * 2 * 20) / 20))); };
  const onMove = (e) => { if (drag >= 0) { e.preventDefault(); update(drag, e); } };
  const wPoly = axes.map((a, i) => P(i, (weights[a.k] / 2) * maxR));
  const dPoly = dna ? axes.map((a, i) => P(i, Math.max(0, Math.min(1, dna[i])) * maxR)) : null;
  return (
    <svg ref={ref} viewBox={`0 0 ${size} ${size}`} style={{ width: "100%", maxWidth: size, height: "auto", display: "block", margin: "0 auto", touchAction: "none" }}
      onPointerMove={onMove} onPointerUp={() => setDrag(-1)} onPointerLeave={() => setDrag(-1)} onPointerCancel={() => setDrag(-1)}>
      {[0.5, 1].map(f => <polygon key={f} points={poly(axes.map((a, i) => P(i, f * maxR)))} fill="none" stroke="var(--rule)" strokeWidth="0.5" />)}
      {axes.map((a, i) => { const [x, y] = P(i, maxR); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--rule)" strokeWidth="0.5" />; })}
      {dPoly && <polygon points={poly(dPoly)} fill="var(--accent)" fillOpacity="0.07" stroke="var(--accent)" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="3 3" />}
      <polygon points={poly(wPoly)} fill="var(--accent)" fillOpacity="0.16" stroke="var(--accent)" strokeWidth="1.5" />
      {axes.map((a, i) => { const [x, y] = wPoly[i]; return <circle key={i} cx={x} cy={y} r={drag === i ? 8 : 6} fill="var(--accent)" stroke="var(--bg-2)" strokeWidth="2" style={{ cursor: "grab" }}
        onPointerDown={(e) => { e.preventDefault(); setDrag(i); try { ref.current.setPointerCapture(e.pointerId); } catch (x) {} }} />; })}
      {axes.map((a, i) => { const [x, y] = P(i, maxR + 16); return <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontFamily="var(--mono)" fontSize="9" fill={weights[a.k] == 0 ? "var(--ink-faint)" : "var(--ink-soft)"}>{a.label}</text>; })}
    </svg>
  );
}
// TouchSlider — a pointer-capture range control. Native <input type=range> drops the drag the moment
// a finger slides off the 3px track; here setPointerCapture keeps tracking the finger anywhere on
// screen until release. Big invisible vertical hit area, optional centre-anchored fill (for bipolar
// sliders like obscure↔famous).
function TouchSlider({ min, max, step, value, onChange, center }) {
  const ref = React.useRef(null);
  const drag = React.useRef(false);
  const set = (clientX) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect(); if (!r.width) return;
    let t = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    let v = Math.round((min + t * (max - min)) / step) * step;
    onChange(Math.max(min, Math.min(max, +v.toFixed(4))));
  };
  const pct = ((value - min) / (max - min)) * 100;
  const fill = center ? { left: Math.min(50, pct) + "%", width: Math.abs(pct - 50) + "%" } : { left: 0, width: pct + "%" };
  return (
    <div ref={ref} className="ts-hit"
      onPointerDown={(e) => { e.preventDefault(); drag.current = true; try { ref.current.setPointerCapture(e.pointerId); } catch (x) {} set(e.clientX); }}
      onPointerMove={(e) => { if (drag.current) { e.preventDefault(); set(e.clientX); } }}
      onPointerUp={() => { drag.current = false; }} onPointerLeave={() => {}} onPointerCancel={() => { drag.current = false; }}>
      <div className="ts-track"><div className="ts-fill" style={fill} /><div className="ts-thumb" style={{ left: pct + "%" }} /></div>
    </div>
  );
}

// SoundSimilar — weighted nearest-neighbour discovery. Distance over the measured audio axes (the 6
// main weighted via a draggable DNA radar, the rest via sliders), a genre-overlap term, an
// obscure↔famous lean. Shows 6/10/20.
function SoundSimilar({ id, go }) {
  const R = window.ROTATION;
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const AX = React.useMemo(() => [
    { i: 0, k: "energy", l: "NRG", n: v => v }, { i: 1, k: "mood", l: "MOOD", n: v => v }, { i: 2, k: "acoustic", l: "ACOU", n: v => v },
    { i: 3, k: "tempo", l: "BPM", n: v => v }, { i: 4, k: "dance", l: "DANCE", n: v => v }, { i: 5, k: "instr", l: "INSTR", n: v => v },
    { i: 9, k: "loud", n: v => clamp((v + 60) / 60) }, { i: 10, k: "speech", n: v => v }, { i: 11, k: "live", n: v => v },
    { i: 6, k: "key", n: v => v }, { i: 12, k: "length", n: v => clamp((v - 60) / 300) },
  ], []);
  const MAIN = AX.slice(0, 6).map(a => ({ k: a.k, label: a.l }));
  const EXTRA = AX.slice(6);
  const cand = React.useMemo(() => {
    const ex = R.expById || {}, out = [];
    for (const cid in (R.AUDIO || {})) { const af = R.AUDIO[cid]; const rec = ex[cid] || R.byId[cid]; out.push({ id: cid, vec: AX.map(a => a.n(af[a.i])), s: (rec && rec.s) || [], pop: (af[7] || 0) / 100, rec }); }
    return out;
  }, [R, AX]);
  const meEntry = cand.find(c => c.id === id);
  const [w, setW] = React.useState(() => Object.fromEntries(AX.map(a => [a.k, 1])));
  const [genreW, setGenreW] = React.useState(1.2);
  const [lean, setLean] = React.useState(0);
  const [count, setCount] = React.useState(8);
  const [open, setOpen] = React.useState(false);

  const results = React.useMemo(() => {
    if (!meEntry) return [];
    const meS = new Set(meEntry.s), wArr = AX.map(a => w[a.k]);
    return cand.filter(c => c.id !== id).map(c => {
      let dist = 0; for (let k = 0; k < wArr.length; k++) { const d = meEntry.vec[k] - c.vec[k]; dist += wArr[k] * d * d; }
      let inter = 0; for (const x of c.s) if (meS.has(x)) inter++;
      const jac = (meS.size + c.s.length - inter) ? inter / (meS.size + c.s.length - inter) : 0;
      return { c, score: -(dist + genreW * (1 - jac) * 3) + lean * c.pop * 2 };
    }).sort((a, b) => b.score - a.score).slice(0, count);
  }, [meEntry, cand, w, genreW, lean, count, id, AX]);

  if (!meEntry) return <div className="r-mono" style={{ fontSize: 11, color: "var(--ink-faint)" }}>no measured audio for this artist.</div>;
  const reset = () => { setW(Object.fromEntries(AX.map(a => [a.k, 1]))); setGenreW(1.2); setLean(0); };
  const genreLabel = genreW == 0 ? "ignored" : genreW < 0.9 ? "loose" : genreW < 1.8 ? "balanced" : "strict";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <div className="r-seg r-seg-sm">{[8, 16, 24].map(n => <button key={n} data-on={count === n} onClick={() => setCount(n)}>{n}</button>)}</div>
        <button onClick={() => setOpen(o => !o)} className="r-mono" style={{ fontSize: 10, padding: "4px 10px", borderRadius: 999, border: "1px solid var(--rule)", background: open ? "var(--bg-3)" : "transparent", color: "var(--ink-soft)", cursor: "pointer" }}>tune {open ? "▴" : "▾"}</button>
      </div>
      {open && (
        <div className="r-card" style={{ padding: "14px 16px", marginBottom: 12, background: "var(--bg-2)" }}>
          <div className="m-stack" style={{ display: "grid", gridTemplateColumns: "minmax(0,234px) 1fr", gap: "var(--gap)", alignItems: "center" }}>
            <div>
              <WeightRadar axes={MAIN} weights={w} setWeight={(k, v) => setW(p => ({ ...p, [k]: v }))} dna={meEntry.vec.slice(0, 6)} />
              <div className="r-mono" style={{ fontSize: 8.5, color: "var(--ink-faint)", textAlign: "center", marginTop: 2 }}>drag an axis · out = matters more · dashed = this artist</div>
            </div>
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(104px,1fr))", gap: "8px 12px" }}>
                {EXTRA.map(a => (
                  <div key={a.k}><span className="r-mono" style={{ fontSize: 8.5, letterSpacing: ".05em", textTransform: "uppercase", color: w[a.k] == 0 ? "var(--ink-faint)" : "var(--ink-soft)" }}>{a.k}</span>
                    <TouchSlider min={0} max={2} step={0.1} value={w[a.k]} onChange={v => setW(p => ({ ...p, [a.k]: v }))} /></div>
                ))}
              </div>
              <div style={{ display: "flex", gap: "12px 22px", flexWrap: "wrap", alignItems: "flex-start", marginTop: 16 }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div className="r-mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 8.5, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: 4 }}>
                    <span>weight by shared genre</span><span style={{ color: genreW == 0 ? "var(--ink-faint)" : "var(--accent)" }}>{genreLabel}</span></div>
                  <TouchSlider min={0} max={2.5} step={0.1} value={genreW} onChange={setGenreW} />
                  <div className="r-mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "var(--ink-faint)", marginTop: 2 }}><span>any sound</span><span>same scene</span></div>
                </div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div className="r-mono" style={{ fontSize: 8.5, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: 4 }}>lean</div>
                  <TouchSlider min={-1} max={1} step={0.1} value={lean} onChange={setLean} center />
                  <div className="r-mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "var(--ink-faint)", marginTop: 2 }}><span>obscure</span><span>famous</span></div>
                </div>
              </div>
              <div style={{ textAlign: "right", marginTop: 10 }}><button onClick={reset} className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", background: "none", border: "none", cursor: "pointer" }}>reset</button></div>
            </div>
          </div>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(80px,1fr))", gap: 10 }}>
        {results.map(({ c }) => { const s = c.rec, name = (s && s.name) || c.id, nav = !!(R.byId[c.id] || (R.expById && R.expById[c.id])); return (
          <div key={c.id} onClick={() => nav && go("artist", c.id)} style={{ cursor: nav ? "pointer" : "default" }}>
            <GenCover hue={(s && s.hue) || 210} name={name} size={"100%"} style={{ aspectRatio: "1", width: "100%", height: "auto" }} radius={4} />
            <div style={{ fontSize: 12, lineHeight: 1.2, marginTop: 6 }}>{name}</div>
            {s && s.plays != null && <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)" }}>{fmt(s.plays)} plays →</div>}
          </div>); })}
      </div>
      <style>{`.ts-hit { position: relative; padding: 9px 0; margin-top: 1px; cursor: pointer; touch-action: none; -webkit-user-select: none; user-select: none; -webkit-tap-highlight-color: transparent; }
        .ts-track { position: relative; height: 4px; border-radius: 4px; background: var(--bg-3); }
        .ts-fill { position: absolute; top: 0; height: 100%; border-radius: 4px; background: var(--accent); }
        .ts-thumb { position: absolute; top: 50%; width: 15px; height: 15px; border-radius: 50%; background: var(--accent); border: 2px solid var(--bg-2); transform: translate(-50%, -50%); box-shadow: 0 1px 3px rgba(0,0,0,.3); }`}</style>
    </div>
  );
}

// gender glyph (solo artists) + active/disbanded/deceased badge, from MusicBrainz. Accepts either the
// kept-artist shape (gender "Female", life {type,ended,end}) or the mini shape (g "f", ty/ed/en).
function genderGlyph(g) {
  const s = (g || "").toLowerCase();   // accepts full MB strings or the mini codes f/m/x
  if (s === "f" || s === "female") return { ch: "♀", label: "Female" };
  if (s === "m" || s === "male") return { ch: "♂", label: "Male" };
  if (s === "x" || s === "non-binary" || s === "other") return { ch: "⚧", label: s === "other" ? "Other" : "Non-binary" };
  return null;   // "Not applicable" / unknown → no glyph
}
function lifeBadge(life) {
  if (!life || !life.type) return null;
  const t = life.type[0].toLowerCase();
  if (life.ended) return { txt: t === "p" ? (life.end ? "Died " + life.end : "Deceased") : (life.end ? "Disbanded " + life.end : "Disbanded"), tone: "muted" };
  if (t === "g") return { txt: "Active", tone: "active" };   // living solo artists get no badge (noise)
  return null;
}
function ArtistMeta({ gender, life, size, seenLive, onTour }) {
  const g = genderGlyph(gender);
  let b = lifeBadge(life);
  // a "disbanded" GROUP with fresh tour dates isn't disbanded — it reactivated (the Bleach
  // case). Deceased Persons keep their badge: their events are tribute billings, not comebacks.
  if (b && onTour && life && life.ended && life.type[0].toLowerCase() !== "p")
    b = { txt: "Reactivated", tone: "react", tip: `on record as disbanded${life.end ? " " + life.end : ""} — yet they have upcoming dates` };
  if (!g && !b && !seenLive && !onTour) return null;
  // on-tour badge: amber — upcoming Ticketmaster dates around the configured markets
  const ot = onTour ? { txt: "On tour" + (onTour[0] > 1 ? " ×" + onTour[0] : ""), tip: `${onTour[0]} upcoming date${onTour[0] !== 1 ? "s" : ""} around your markets · next: ${onTour[1]}${onTour[2] ? " · " + onTour[2] : ""}` } : null;
  // seen-live badge: purple, so it doesn't fight the green "Active" badge sitting next to it
  const sl = seenLive ? { txt: "Seen live" + (seenLive.count > 1 ? " ×" + seenLive.count : ""), tip: `you attended ${seenLive.count} show${seenLive.count !== 1 ? "s" : ""}${seenLive.first ? " · " + seenLive.first.slice(0, 4) + (seenLive.last && seenLive.last.slice(0, 4) !== seenLive.first.slice(0, 4) ? "–" + seenLive.last.slice(0, 4) : "") : ""}` } : null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 9, flexWrap: "wrap" }}>
      {g && <span title={g.label} style={{ fontSize: size || 16, lineHeight: 1, color: "var(--ink-soft)" }}>{g.ch}</span>}
      {b && <span className="r-mono" title={b.tip} style={{ fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", padding: "2.5px 8px", borderRadius: 999, border: "1px solid " + (b.tone === "active" ? "oklch(0.6 0.13 150 / .5)" : b.tone === "react" ? "oklch(0.62 0.16 45 / .5)" : "var(--rule-2)"), color: b.tone === "active" ? "oklch(0.72 0.15 150)" : b.tone === "react" ? "oklch(0.75 0.16 45)" : "var(--ink-faint)", cursor: b.tip ? "help" : undefined }}>{b.txt}</span>}
      {ot && <span className="r-mono" title={ot.tip} style={{ fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", padding: "2.5px 8px", borderRadius: 999, border: "1px solid oklch(0.68 0.14 70 / .55)", color: "oklch(0.79 0.13 75)", cursor: "help" }}>{ot.txt}</span>}
      {sl && <span className="r-mono" title={sl.tip} style={{ fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", padding: "2.5px 8px", borderRadius: 999, border: "1px solid oklch(0.6 0.16 305 / .55)", color: "oklch(0.74 0.14 305)", cursor: "help" }}>🎤 {sl.txt}</span>}
    </div>
  );
}

// Shared "seen live" lookup — a track id (artistSlug~trackSlug) that appears in a setlist
// from a show Fuad attended. Built once from ROTATION.GIGS.liveSongs, reused across the
// artist top-tracks, album tracklist and track-page siblings so the 🎤 marker is consistent.
let _liveSet = null;
function seenLiveKey(trackId) {
  if (_liveSet === null) { const R = window.ROTATION; _liveSet = new Set((R && R.GIGS && R.GIGS.liveSongs) || []); }
  return _liveSet.has(trackId);
}
const LiveMark = ({ on }) => on
  ? <span className="r-livemark" title="You've watched this performed live">🎤</span>
  : null;

// Upcoming Ticketmaster dates for this artist (a.onTour is baked in; the full event list rides
// on the lazy tm-tour-lazy.js, loaded on demand). Sits above the Seen-live card on the page.
function ArtistTourCard({ a, go }) {
  const R = window.ROTATION;
  const [tour, setTour] = React.useState(window.ROTATION_TOUR || null);
  React.useEffect(() => {
    if (!a.onTour || window.ROTATION_TOUR) return;
    const s = document.createElement("script"); s.src = "tm-tour-lazy.js";
    s.onload = () => setTour(window.ROTATION_TOUR); document.head.appendChild(s);
  }, []);
  if (!a.onTour) return null;
  const MONS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dfmt = (d) => { const [y, m, dd] = d.split("-"); return `${+dd} ${MONS[+m - 1]} ${y}`; };
  const rec = tour && tour.artists.find(x => x.id === a.id);
  const n = a.onTour[0];
  return (
    <div className="r-card" style={{ padding: 18 }}>
      <div className="r-card-h" style={{ padding: 0, marginBottom: 12 }}>
        <span className="lbl">On <b>tour</b></span>
        <span className="meta" style={{ cursor: "pointer", color: "var(--accent)" }} onClick={() => go("gigs")}>tour explorer ↗</span></div>
      <div style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: rec ? 12 : 0 }}>
        {a.react
          ? <><b style={{ color: "oklch(0.75 0.16 45)" }}>Reactivated</b> — on record as disbanded, yet </>
          : <>{a.name} has </>}
        <b style={{ color: "var(--ink)" }}>{n}</b> upcoming date{n !== 1 ? "s" : ""} around your markets{a.seenLive ? <> · you've already seen them <b style={{ color: "var(--ink)" }}>{a.seenLive.count === 1 ? "once" : a.seenLive.count + "×"}</b></> : null}.
      </div>
      {!rec ? <div className="r-mono" style={{ fontSize: 10, color: "var(--ink-faint)" }}>loading dates…</div> : (
        <div style={{ display: "grid", gap: 2 }}>
          {rec.events.map((e, i) => (
            <a key={(e.url || e.d) + i} className="av-tourrow" href={e.url || undefined} target="_blank" rel="noopener noreferrer" data-dead={!e.url}>
              <span className="r-mono av-tourrow-d">{dfmt(e.d)}</span>
              <span className="av-tourrow-w">{e.v}{e.city ? `, ${e.city}` : ""}{e.cc ? ` (${e.cc})` : ""}</span>
              {e.url ? <span className="av-tourrow-out">↗</span> : null}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function ArtistView({ t, id, go, setPop, city, setCity }) {
  const R = window.ROTATION;
  const full = R.byId[id];
  const a = full || R.ARTISTS[0];
  const [ref, seen] = useInView();
  const avg = React.useMemo(() => {
    const ks = ["energy", "valence", "acoustic", "tempo", "dance", "instr"];
    return ks.map(k => R.ARTISTS.reduce((s, x) => s + x.audio[k], 0) / R.ARTISTS.length);
  }, []);
  // nearest neighbours by measured sound (6-axis euclidean over the whole audio map)
  const soundAlike = React.useMemo(() => {
    const me = R.AUDIO && R.AUDIO[a.id]; if (!me) return [];
    const out = [];
    for (const sid in R.AUDIO) { if (sid === a.id) continue; const v = R.AUDIO[sid]; let d = 0; for (let k = 0; k < 6; k++) { const dd = me[k] - v[k]; d += dd * dd; } out.push([sid, d]); }
    return out.sort((x, y) => x[1] - y[1]).slice(0, 6).map(e => e[0]);
  }, [a.id]);
  const [simTab, setSimTab] = React.useState("lastfm");
  const [simN, setSimN] = React.useState(8);      // last.fm sounds-like depth (8 ⇄ 16)
  const [albMode, setAlbMode] = React.useState("covers");   // albums: covers (default) ⇄ list
  // NB: by-sound depth (8/16/24) is SoundSimilar's own internal `count` selector.
  // artists outside the kept 205 still rank in Explore — give them a lightweight page
  // (return AFTER hooks so hook order stays stable across navigations).
  if (!full && R.expById && R.expById[id]) return <MiniArtistView a={R.expById[id]} go={go} />;
  // unknown id (e.g. a connection to an artist not in the explorable set) — graceful, not the #1 artist
  if (!full) return (
    <div className="r-view">
      <button className="r-back" onClick={() => go("explore")}>← explore</button>
      <div className="r-card" style={{ padding: "44px 24px", textAlign: "center", color: "var(--ink-soft)", fontFamily: "var(--serif)", fontSize: 15 }}>
        This artist isn't in your library's profiled set — no page to show yet.
      </div>
    </div>
  );
  const dna = [a.audio.energy, a.audio.valence, a.audio.acoustic, a.audio.tempo, a.audio.dance, a.audio.instr];
  const af = R.AUDIO && R.AUDIO[a.id];   // [..,6 major, 7 popularity, 8 followers]
  const peakIdx = a.era.indexOf(Math.max(...a.era));
  const peakYear = (R.ERA_START || 2014) + peakIdx;
  // Per-artist top tracks/albums computed in build-data.js — full top per artist, not
  // globally-capped lists. NIN gets all their top tracks, Midori gets theirs, etc.
  const albums = a.topAlbums || [];
  const tracks = a.topTracks || [];
  // Search ALL real concerts (not just the chosen city) for this artist's upcoming dates.
  const upcoming = Object.values(R.CONCERTS || {}).flat().filter(g => g.artistId === a.id)
    .sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
  const hasConcertData = (R.CITIES || []).length > 0;
  const shareOfTotal = (a.plays / R.TOTALS.scrobbles * 100);

  return (
    <div className="r-view tv-page av-page" ref={ref}>
      <button className="r-back" onClick={() => go("explore")}>← explore</button>

      {/* header */}
      <div style={{ display: "flex", gap: 26, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 30 }}>
        <GenCover hue={a.hue} name={a.name} size={150} radius={6} />
        <div style={{ flex: 1, minWidth: 240 }}>
          <div className="r-kicker">#{String(a.rank).padStart(2, "0")} all time
            {a.origin && a.origin.city ? ` · ${a.origin.city.toUpperCase()}, ${a.origin.country}` : a.country ? ` · ${a.country.toUpperCase()}` : ""}
            {a.debut ? ` · EST. ${a.debut}` : ""}</div>
          <h1 className="r-title" style={{ fontSize: "clamp(36px,5vw,64px)" }}>{a.name}<span className="dot">.</span></h1>
          <ArtistMeta gender={a.gender} life={a.life} size={18} seenLive={a.seenLive} onTour={a.onTour} />
          {a.tags && a.tags.length > 0 && (
            <div style={{ display: "flex", gap: 7, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
              <span className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: ".12em", textTransform: "uppercase" }}>last.fm</span>
              {a.tags.map(g => <span key={g} className="r-chip link" title={`Explore ${g} →`} onClick={() => go("explore", g)}>{g}</span>)}
            </div>
          )}
          {a.styles && a.styles.length > 0 && (
            <div style={{ display: "flex", gap: 7, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: ".12em", textTransform: "uppercase" }}>discogs</span>
              {a.styles.map(s => <span key={s} className="r-chip link" title={`Explore ${s} →`} onClick={() => go("explore", s)} style={{ fontSize: 10.5, padding: "3px 8px", borderColor: "var(--line)" }}>{s}</span>)}
            </div>
          )}
          {a.spotGenres && a.spotGenres.length > 0 && (
            <div style={{ display: "flex", gap: 7, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: ".12em", textTransform: "uppercase" }}>spotify</span>
              {a.spotGenres.map(s => <span key={s} className="r-chip link" title={`Explore ${s} →`} onClick={() => go("explore", s)} style={{ fontSize: 10.5, padding: "3px 8px", borderColor: "var(--line)" }}>{s}</span>)}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 13, flexWrap: "wrap" }}>
            <a className="r-extlink r-extlink-lf" href={`https://www.last.fm/music/${encodeURIComponent(a.name)}`} target="_blank" rel="noopener noreferrer">last.fm ↗</a>
            <a className="r-extlink r-extlink-sp" href={`https://open.spotify.com/search/${encodeURIComponent(a.name)}`} target="_blank" rel="noopener noreferrer">Spotify ↗</a>
          </div>
        </div>
        <div style={{ display: "flex", gap: 26 }}>
          <div><div className="r-stat-n" style={{ fontSize: 38 }}>{fmt(a.plays)}</div>
            <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: ".12em", textTransform: "uppercase", marginTop: 5 }}>plays</div></div>
          <div><div className="r-stat-n" style={{ fontSize: 38 }}>{peakYear}</div>
            <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: ".12em", textTransform: "uppercase", marginTop: 5 }}>peak year</div></div>
          <div><div className="r-stat-n" style={{ fontSize: 38, color: "var(--accent)" }}>{shareOfTotal.toFixed(1)}%</div>
            <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: ".12em", textTransform: "uppercase", marginTop: 5 }}>of all plays</div></div>
          {a.listeners != null && (
            <div><div className="r-stat-n" style={{ fontSize: 38 }}>{a.listeners >= 1e6 ? (a.listeners / 1e6).toFixed(1) + "M" : a.listeners >= 1000 ? Math.round(a.listeners / 1000) + "k" : a.listeners}</div>
              <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: ".12em", textTransform: "uppercase", marginTop: 5 }}>listeners ww</div></div>
          )}
        </div>
      </div>

      {/* bio — full-width; Sound DNA moved down into the tracks/albums row (Fuad, 2026-07-05) */}
      {a.bio && a.bio.length > 40 && (
        <div className="r-card" style={{ padding: "18px 22px", marginBottom: "var(--gap)" }}>
          <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", letterSpacing: ".14em", textTransform: "uppercase", marginBottom: 10 }}>About</div>
          <p style={{ fontFamily: "var(--serif)", fontSize: 15.5, lineHeight: 1.55, color: "var(--ink-soft)", margin: 0 }}>
            {a.bio.length > 620 ? a.bio.slice(0, 620).replace(/\s+\S*$/, "") + "…" : a.bio}
          </p>
        </div>
      )}

      <div style={{ display: "grid", gap: "var(--gap)" }}>
          {/* row 2 on PC: flow (wide — Sound DNA moved to the bottom row for breathing room,
             Fuad 2026-07-06) · top tracks · albums */}
          <div className="m-stack av-row2" style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr 0.9fr", gap: "var(--gap)", alignItems: "start" }}>
            {/* top tracks · how they played out (flow now in the MIDDLE — Fuad 2026-07-06) · albums */}
            <div className="r-card" style={{ padding: 18 }}>
              <div className="r-card-h" style={{ padding: 0, marginBottom: 12 }}>
                <span className="lbl"><b>Top tracks</b></span>
                <span className="meta">{tracks.length} listed</span></div>
              {(tracks.length ? tracks : [{ title: "—", plays: 0 }]).map((tr, i) => {
                const clickable = !!tr.plays;
                return (
                <div key={tr.title + i} className={clickable ? "r-track-row" : undefined} onClick={clickable ? () => go("track", R.slug(a.name) + "~" + R.slug(tr.title)) : undefined} title={clickable ? `${tr.title} →` : undefined}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0",
                  cursor: clickable ? "pointer" : "default",
                  borderBottom: i < tracks.length - 1 ? "1px solid var(--rule)" : "none" }}>
                  <span className="r-mono" style={{ fontSize: 10, color: "var(--ink-faint)", width: 18 }}>{String(i + 1).padStart(2, "0")}</span>
                  <span style={{ fontSize: 13, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tr.title}</span>
                  <LiveMark on={clickable && seenLiveKey(R.slug(a.name) + "~" + R.slug(tr.title))} />
                  <span className="r-mono" style={{ fontSize: 10, color: "var(--ink-soft)" }}>{tr.plays ? fmt(tr.plays) : "—"}</span>
                </div>
              );})}
            </div>
            {/* how they played out — flow, in the middle */}
            <ArtistFlow id={a.id} hue={a.hue} go={go} />
            {/* all albums — covers (default) ⇄ compact list */}
            <div className="r-card" style={{ padding: 18 }}>
              <div className="r-card-h" style={{ padding: 0, marginBottom: 12 }}>
                <span className="lbl"><b>Albums</b></span>
                <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                  <div className="r-seg r-seg-sm">
                    <button data-on={albMode === "covers"} onClick={() => setAlbMode("covers")}>covers</button>
                    <button data-on={albMode === "list"} onClick={() => setAlbMode("list")}>list</button>
                  </div>
                  <span className="meta">{albums.length}</span>
                </span></div>
              {albMode === "covers" ? (
                <div className="av-albumcovers" style={{ maxHeight: 420, overflowY: "auto", paddingRight: 4,
                  display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))", gap: 10 }}>
                  {(albums.length ? albums : []).map((al, i) => (
                    <div key={al.title + i} style={{ cursor: "pointer", minWidth: 0 }} onClick={() => go("album", R.slug(a.name) + "~" + R.slug(al.title))} title={`${al.title} →`}>
                      <GenCover hue={a.hue} name={al.title} image={al.cover} thumb={al.cover} size={"100%"} style={{ aspectRatio: "1", width: "100%", height: "auto" }} radius={3} />
                      <div style={{ fontSize: 10, marginTop: 5, lineHeight: 1.2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{al.title}</div>
                      <div className="r-mono" style={{ fontSize: 8.5, color: "var(--ink-faint)" }}>{fmt(al.plays)} plays</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: "grid", gap: 2, maxHeight: 420, overflowY: "auto", paddingRight: 4 }}>
                  {(albums.length ? albums : []).map((al, i) => (
                    <div key={al.title + i} className="r-track-row" onClick={() => go("album", R.slug(a.name) + "~" + R.slug(al.title))} title={`${al.title} →`}
                      style={{ display: "flex", alignItems: "center", gap: 9, padding: "5px 4px", cursor: "pointer", borderRadius: 4 }}>
                      <GenCover hue={a.hue} name={al.title} image={al.cover} thumb={al.cover} size={30} radius={2} />
                      <span style={{ flex: 1, minWidth: 0, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{al.title}</span>
                      <span className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)" }}>{fmt(al.plays)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* bottom row: how-they-played-out + family tree — kept at their ⅓ widths but
             CENTERED in the row rather than stretched across it (Fuad, 2026-07-04) */}
          <div className="m-stack av-endrow" style={{ display: "flex", gap: "var(--gap)", justifyContent: "center", alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* sound DNA — collapsed down from row 2, kept COMPACT (~224px) so it doesn't stretch
              wide; flow + albums breathe in row 2 instead (Fuad, 2026-07-06) */}
          <div className="r-card av-dnacard" style={{ padding: 18 }}>
            <div className="r-card-h" style={{ padding: 0, marginBottom: 8 }}><span className="lbl"><b>Sound DNA</b></span>
              <span className="meta">{a.am ? "measured" : "inferred"}</span></div>
            <div className="av-dna" style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
              <div style={{ flex: "0 0 auto", width: 176, maxWidth: "100%" }}>
                <Radar axes={DNA_AXES} values={dna} values2={avg} run={seen} size={176} />
                <div className="r-mono" style={{ fontSize: 8.5, color: "var(--ink-faint)", textAlign: "center", marginTop: 2 }}>solid = {a.name.split(" ")[0]} · dashed = your avg</div>
              </div>
              {/* tempo → followers, stacked UNDER the radar at the radar's own width (Fuad) */}
              {af && <div style={{ width: 176, maxWidth: "100%", display: "grid", gap: 7 }}>
                {[
                  { k: "tempo", v: Math.round(50 + a.audio.tempo * 140), u: " bpm", f: a.audio.tempo },
                  { k: "key", v: af[6] >= 0.5 ? "major" : "minor", f: af[6] },
                  { k: "loud", v: Math.round(af[9]), u: " dB", f: Math.max(0, Math.min(1, (af[9] + 60) / 60)) },
                  { k: "speech", v: Math.round(af[10] * 100), u: "%", f: af[10] },
                  { k: "live", v: Math.round(af[11] * 100), u: "%", f: af[11] },
                  { k: "pop", v: af[7], u: "/100", f: af[7] / 100 },
                  { k: "followers", v: fmtK(af[8]), f: null },
                ].map(s => (
                  <div key={s.k} style={{ display: "grid", gridTemplateColumns: "52px 1fr auto", gap: 8, alignItems: "center" }}>
                    <span className="r-mono" style={{ fontSize: 8.5, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--ink-faint)" }}>{s.k}</span>
                    <div style={{ height: 3, background: "var(--bg-3)", borderRadius: 2, overflow: "hidden" }}>{s.f != null && <div style={{ height: "100%", width: (s.f * 100) + "%", background: `oklch(0.62 0.15 ${a.hue})` }} />}</div>
                    <span style={{ fontSize: 12, whiteSpace: "nowrap" }}>{s.v}{s.u && <span style={{ fontSize: 8.5, color: "var(--ink-faint)" }}>{s.u}</span>}</span>
                  </div>
                ))}
              </div>}
            </div>
          </div>
          {/* sounds like — swapped down from row 2 */}
          <div className="r-card av-simcard" style={{ padding: 18 }}>
              <div className="r-card-h" style={{ padding: 0, marginBottom: 14 }}>
                <span className="lbl"><b>Sounds like</b></span>
                <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                  {simTab === "lastfm" && a.similar.length > 8 && (
                    <button className="av-more" onClick={() => setSimN(n => n === 8 ? 16 : 8)}>{simN === 8 ? "16 ▾" : "8 ▴"}</button>
                  )}
                  <div className="r-seg r-seg-sm">
                    {[["lastfm", "last.fm"], ["sound", "by sound"]].map(([k, l]) => <button key={k} data-on={simTab === k} onClick={() => setSimTab(k)}>{l}</button>)}
                  </div>
                </span></div>
              {simTab === "sound" ? <SoundSimilar id={a.id} go={go} /> : (() => {
                const items = a.similar.slice(0, simN).map((sid, i) => { const name = a.similarNames[i]; const rid = (R.idForName && R.idForName(name)) || R.slug(name); const rec = R.byId[rid] || (R.expById && R.expById[rid]); return { name, navId: rec ? rid : null, hue: rec ? rec.hue : (a.hue + 40 + i * 25) % 360, plays: rec ? rec.plays : null, played: !!rec || (R.played && R.played(name)) }; });
                if (!items.length) return <div className="r-mono" style={{ fontSize: 11, color: "var(--ink-faint)" }}>no last.fm matches here.</div>;
                return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(80px,1fr))", gap: 10 }}>
                  {items.map((it, i) => (
                    <div key={it.name + i} onClick={() => it.navId && go("artist", it.navId)}
                      style={{ display: "flex", flexDirection: "column", gap: 8, cursor: it.navId ? "pointer" : "default", opacity: it.played ? 1 : 0.62 }}
                      onMouseEnter={(e) => { if (it.navId) e.currentTarget.style.transform = "translateY(-3px)"; }}
                      onMouseLeave={(e) => e.currentTarget.style.transform = ""}>
                      <div style={{ position: "relative", transition: "transform .2s" }}>
                        <GenCover hue={it.hue} name={it.name} size={"100%"} style={{ aspectRatio: "1", width: "100%", height: "auto" }} radius={4} />
                        {it.played && <span className="r-mono r-inlib">in library</span>}
                      </div>
                      <div style={{ fontSize: 12, lineHeight: 1.2 }}>{it.name}</div>
                      {it.plays != null ? <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)" }}>{fmt(it.plays)} plays →</div>
                        : it.played ? <div className="r-mono" style={{ fontSize: 9, color: "var(--accent-dim)" }}>scrobbled · deeper cut</div>
                          : <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)" }}>not yet scrobbled</div>}
                    </div>
                  ))}
                </div>;
              })()}
            </div>

          {/* family tree — members + shared-member lineage (MusicBrainz + Discogs + Wikidata) */}
          {((a.members && a.members.length > 0) || (a.wd && a.wd.lineup) || (a.connections && a.connections.length > 0)) && (() => {
            // Wikidata lineup carries gender MB can't (its `gender` is null for Groups). Merge it
            // in: colour a member's dot by gender, and surface Wikidata-only members (e.g. a new
            // vocalist) the MB/Discogs lists haven't caught up to.
            const wdLine = (a.wd && a.wd.lineup) || [];
            const genderOf = {}; wdLine.forEach(m => { genderOf[m.n] = m.g; });
            const base = a.members || [];
            const extra = wdLine.map(m => m.n).filter(n => !base.includes(n));
            const roster = [...base, ...extra];
            const dot = (g) => g && /female|woman/i.test(g) ? "var(--accent)" : g ? "var(--rule-2)" : "transparent";
            const wCity = a.wd && a.wd.city, wInc = a.wd && a.wd.inception, wDis = a.wd && a.wd.dissolved;
            // widen the card once the members' other bands ("rotated to") start filling it, so
            // those orphan chips get room instead of wrapping into a tall column (Fuad 2026-07-06)
            const otherBands = (a.connections || []).reduce((n, l) => n + (l.others ? l.others.length : 0), 0);
            const famWide = otherBands >= 6 || roster.length >= 10;
            return (
            <div className={`r-card av-famcard${famWide ? " wide" : ""}`} style={{ padding: 18 }}>
              <div className="r-card-h" style={{ padding: 0, marginBottom: 14 }}>
                <span className="lbl"><b>Family tree</b></span>
                <span className="meta">musicbrainz · discogs{a.wd ? " · wikidata" : ""}</span></div>
              {(wCity || wInc) && (
                <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 14 }}>
                  Formed{wCity ? <> in <b style={{ color: "var(--ink)" }}>{wCity}</b></> : null}
                  {wInc ? <>, <span className="r-mono">{wInc}{wDis ? `–${wDis}` : ""}</span></> : null}
                  {wDis ? <span style={{ color: "var(--ink-faint)" }}> · disbanded</span> : null}
                </div>
              )}
              {roster.length > 0 && (
                <div style={{ marginBottom: (a.connections && a.connections.length) ? 16 : 0 }}>
                  <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 8 }}>Members</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {roster.map(m => (
                      <span key={m} className="r-chip" style={{ fontSize: 11, display: "inline-flex", alignItems: "center", gap: 6 }}>
                        {genderOf[m] ? <span style={{ width: 6, height: 6, borderRadius: 999, background: dot(genderOf[m]) }} /> : null}
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {a.connections && a.connections.length > 0 && (
                <div>
                  <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 10 }}>Shares members with</div>
                  <div style={{ display: "grid", gap: 9 }}>
                    {a.connections.map((l, i) => (
                      <div key={l.person + i} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 13, color: "var(--ink-soft)", minWidth: 104 }}>{l.person}</span>
                        <span style={{ color: "var(--ink-faint)" }}>→</span>
                        {l.others.map(o => {
                          const oid = (R.idForName && R.idForName(o.name)) || o.artistId;
                          const openable = !!R.byId[oid] || !!(R.expById && R.expById[oid]); // kept OR explorable
                          return (
                            <span key={o.name} onClick={() => openable && go("artist", oid)}
                              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 9px", borderRadius: 999,
                                border: "1px solid var(--rule)", fontSize: 11.5, cursor: openable ? "pointer" : "default",
                                color: openable ? "var(--ink)" : "var(--ink-soft)" }}>
                              <span style={{ width: 8, height: 8, borderRadius: 2, background: `oklch(0.62 0.16 ${o.hue})` }} />{o.name}
                            </span>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            );
          })()}
          </div>

          {/* on tour — upcoming Ticketmaster dates, above Seen live (Fuad 2026-07-06) */}
          <ArtistTourCard a={a} go={go} />

          {/* seen live — from Fuad's attended setlist.fm shows (ROTATION.GIGS) */}
          {a.seenLive && (
            <div className="r-card" style={{ padding: 18 }}>
              <div className="r-card-h" style={{ padding: 0, marginBottom: 12 }}>
                <span className="lbl">Seen <b>live</b></span>
                <span className="meta" style={{ cursor: "pointer", color: "var(--accent)" }} onClick={() => go("gigs")}>gigs ↗</span></div>
              <div style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: a.seenLive.songs.length ? 12 : 0 }}>
                You've seen {a.name} <b style={{ color: "var(--ink)" }}>{a.seenLive.count === 1 ? "once" : a.seenLive.count + " times"}</b>
                {a.seenLive.first ? <> · <span className="r-mono">{a.seenLive.first.slice(0, 4) === a.seenLive.last.slice(0, 4) ? a.seenLive.first.slice(0, 4) : a.seenLive.first.slice(0, 4) + "–" + a.seenLive.last.slice(0, 4)}</span></> : null}.
                {a.seenLive.songs.length ? <> {a.seenLive.songs.length} songs performed{a.seenLive.songs.some(s => s.played) ? <> — <span style={{ color: "var(--accent)" }}>highlighted</span> ones you also play</> : null}:</> : null}
              </div>
              {a.seenLive.songs.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {a.seenLive.songs.map(s => (
                    <span key={s.title} className="r-chip" style={{ fontSize: 11,
                      color: s.played ? "var(--accent)" : "var(--ink-soft)",
                      borderColor: s.played ? "var(--accent-dim)" : "var(--rule)" }}>
                      {s.title}{s.times > 1 ? <span style={{ color: "var(--ink-faint)" }}> ×{s.times}</span> : null}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* live near you */}
          {hasConcertData && (
            <div className="r-card" style={{ padding: 18 }}>
              <div className="r-card-h" style={{ padding: 0, marginBottom: 14 }}>
                <span className="lbl">Upcoming <b>shows</b></span>
                <span className="meta" style={{ cursor: "pointer", color: "var(--accent)" }} onClick={() => go("live")}>all concerts ↗</span></div>
              {upcoming.length ? upcoming.map(g => <ConcertRow key={g.id} g={g} />) : (
                <div style={{ padding: "14px 16px", border: "1px dashed var(--rule-2)", borderRadius: 6,
                  fontSize: 13, color: "var(--ink-soft)" }}>
                  No upcoming {a.name} dates in the data right now.
                </div>
              )}
            </div>
          )}
      </div>
      <style>{`
        .r-inlib { position: absolute; bottom: 6px; left: 6px; font-size: 7.5px; letter-spacing: .08em; text-transform: uppercase;
          background: var(--accent); color: #0c0a08; padding: 2px 5px; border-radius: 3px; }
        .r-alert { font-family: var(--mono); font-size: 9.5px; letter-spacing: .1em; text-transform: uppercase;
          background: var(--accent-bg); border: 0; color: var(--accent-ink); padding: 8px 12px; border-radius: 5px; cursor: pointer; white-space: nowrap; }
        @media (max-width: 860px){ .r-view > div[style*="340px"]{ grid-template-columns: 1fr !important; }
          .r-view div[style*="1fr 1fr"]{ grid-template-columns: 1fr !important; } }
        .av-more { background: none; border: 1px solid var(--rule); border-radius: 999px; padding: 3px 9px;
          color: var(--ink-faint); cursor: pointer; font-family: var(--mono); font-size: 9px; letter-spacing: .1em; }
        .av-more:hover { color: var(--accent); border-color: var(--accent-dim); }
        /* bottom row: each card keeps its ~⅓ width and the pair sits centered; the m-stack
           class turns this into a 1-col grid on mobile (flex props are then inert) */
        .av-endrow > * { flex: 0 1 calc((100% - 2 * var(--gap)) / 3); min-width: 300px; }
        /* Sound DNA stays compact (radar-width) rather than stretching to a full third */
        .av-endrow > .av-dnacard { flex: 0 0 236px; min-width: 236px; }
        @media (max-width: 980px){ .av-endrow > .av-dnacard { flex: 1 1 100%; } }
        /* family tree grows wider when a band's members have rotated through many other bands */
        .av-endrow > .av-famcard.wide { flex: 1.5 1 400px; }
        /* on-tour date rows */
        .av-tourrow { display: flex; align-items: baseline; gap: 10px; padding: 6px 4px; border-radius: 4px;
          text-decoration: none; color: var(--ink-soft); border-bottom: 1px solid var(--rule); }
        .av-tourrow:last-child { border-bottom: none; }
        .av-tourrow:hover { color: var(--accent); background: var(--bg-3); }
        .av-tourrow[data-dead="true"] { pointer-events: none; }
        .av-tourrow-d { font-size: 10.5px; color: var(--ink-faint); white-space: nowrap; flex: none; width: 92px; }
        .av-tourrow-w { flex: 1; min-width: 0; font-size: 12.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .av-tourrow-out { flex: none; font-size: 10px; color: var(--ink-faint); }
      `}</style>
    </div>
  );
}

function ConcertRow({ g, onArtist }) {
  const d = new Date(g.date);
  const mo = d.toLocaleString("en", { month: "short" }).toUpperCase();
  return (
    <div className="r-gig" onClick={onArtist ? () => onArtist(g.artistId) : undefined}
      style={{ display: "grid", gridTemplateColumns: "44px 36px 1fr auto", gap: 13, alignItems: "center",
        padding: "11px 4px", borderBottom: "1px solid var(--rule)", cursor: onArtist ? "pointer" : "default" }}>
      <div style={{ textAlign: "center" }}>
        <div className="r-mono" style={{ fontSize: 9, color: "var(--accent)", letterSpacing: ".1em" }}>{mo}</div>
        <div className="r-stat-n" style={{ fontSize: 22 }}>{d.getDate()}</div>
      </div>
      <GenCover hue={g.hue} name={g.artist} size={36} radius={3} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
          {g.artist}{g.inLibrary && <span className="r-mono" style={{ fontSize: 8, color: "var(--accent)", border: "1px solid var(--accent-dim)", borderRadius: 3, padding: "1px 4px", letterSpacing: ".06em" }}>YOURS</span>}</div>
        <div style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>{g.venue}</div>
      </div>
      <button className="r-alert">tickets ↗</button>
    </div>
  );
}

// ════════════════════════ LIVE ════════════════════════
function LiveView({ t, go, city, setCity }) {
  const R = window.ROTATION;
  const cities = R.CITIES || [];
  const activeCity = cities.includes(city) ? city : (cities[0] || "");
  const gigs = (activeCity && R.CONCERTS[activeCity]) || [];
  const yours = gigs.filter(g => g.inLibrary);

  // empty state: no concerts data has been enriched yet
  if (cities.length === 0) {
    return (
      <div className="r-view">
        <div className="r-viewhead">
          <div>
            <div className="r-kicker">Live · upcoming</div>
            <h1 className="r-title">Out <em>tonight</em><span className="dot">.</span></h1>
          </div>
          <p className="r-lede">Shows for the artists you actually play — once the concert data is wired up.</p>
        </div>
        <div className="r-card" style={{ padding: 32, textAlign: "center" }}>
          <div className="r-mono" style={{ fontSize: 10, color: "var(--ink-faint)", letterSpacing: ".14em", textTransform: "uppercase", marginBottom: 14 }}>No concert data yet</div>
          <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 24, lineHeight: 1.2, marginBottom: 12 }}>
            Real upcoming shows arrive once <code style={{ fontFamily: "var(--mono)", fontSize: 17, color: "var(--accent)" }}>concerts-cache.json</code> is populated.
          </div>
          <div style={{ color: "var(--ink-soft)", fontSize: 14, maxWidth: 480, margin: "0 auto" }}>
            Run <code style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--accent)" }}>TICKETMASTER_API_KEY=… node enrich-concerts.js</code> to pull
            live event data via the Ticketmaster Discovery API (free key, instant signup at developer.ticketmaster.com).
            The placeholder concerts have been removed.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="r-view">
      <div className="r-viewhead">
        <div>
          <div className="r-kicker">Live · upcoming</div>
          <h1 className="r-title">Out <em>tonight</em><span className="dot">.</span></h1>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <p className="r-lede" style={{ marginBottom: 2 }}>Shows from artists you actually play, wherever you are.
            <b> {yours.length} of your artists</b> are touring {activeCity}.</p>
          <div className="r-seg">
            {cities.map(c => <button key={c} data-on={activeCity === c} onClick={() => setCity(c)}>{c}</button>)}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(380px,100%),1fr))", gap: "var(--gap)" }}>
        <div className="r-card" style={{ padding: "8px 18px 14px" }}>
          <div className="r-card-h" style={{ padding: "12px 0 8px" }}><span className="lbl"><b>From your library</b></span>
            <span className="meta">{yours.length} dates</span></div>
          {yours.length
            ? yours.map(g => <ConcertRow key={g.id} g={g} onArtist={(id) => go("artist", id)} />)
            : <div style={{ padding: 16, color: "var(--ink-faint)", fontSize: 13 }}>No shows in {activeCity} from artists you play right now.</div>}
        </div>
        <div className="r-card" style={{ padding: "8px 18px 14px" }}>
          <div className="r-card-h" style={{ padding: "12px 0 8px" }}><span className="lbl"><b>Also in town</b></span>
            <span className="meta">{gigs.filter(g => !g.inLibrary).length} dates</span></div>
          {gigs.filter(g => !g.inLibrary).length
            ? gigs.filter(g => !g.inLibrary).map(g => <ConcertRow key={g.id} g={g} />)
            : <div style={{ padding: 16, color: "var(--ink-faint)", fontSize: 13 }}>Nothing else booked in {activeCity}.</div>}
        </div>
      </div>
    </div>
  );
}

// ─────────── shared audio-viz helpers (Album + Track panes) ───────────
// expand a media yearTail (0 | year | [year,plays,…]) + the row's total plays into [{y, p}] sorted by year.
function yearSeries(tail, total) {
  if (tail == null || tail === 0) return [];
  if (typeof tail === "number") return [{ y: tail, p: total }];
  const out = []; for (let i = 0; i < tail.length; i += 2) out.push({ y: tail[i], p: tail[i + 1] });
  return out.sort((a, b) => a.y - b.y);
}
// share of your play-weighted library at or below `value` on an axis (0..100) → percent, via R.AUDIO_DIST.
function tastePctl(axis, value) {
  const D = window.ROTATION && window.ROTATION.AUDIO_DIST; if (!D) return null;
  const ai = D.axes.indexOf(axis); if (ai < 0 || value == null) return null;
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return D.cdf[ai][v] / 10;   // permille → percent
}
// play-weighted mean of an audio axis across your whole library (0..100), derived from R.AUDIO_DIST's CDF.
function libMean(axis) {
  const D = window.ROTATION && window.ROTATION.AUDIO_DIST; if (!D) return null;
  const ai = D.axes.indexOf(axis); if (ai < 0) return null;
  const c = D.cdf[ai]; let m = 0, prev = 0;
  for (let v = 0; v <= 100; v++) { m += v * (c[v] - prev) / 1000; prev = c[v]; }
  return m;
}
// radar / spider chart for N audio axes (each {label, value 0..100}). `avg` (same order/length) draws a
// dashed reference shape — your library average — so the solid shape's deviation reads at a glance.
function AudioRadar({ axes, hue, size = 188, avg = null }) {
  const n = axes.length, cx = size / 2, cy = size / 2, R = size / 2 - 30;
  const pt = (i, r) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
  const poly = (r, sc) => axes.map((_, i) => pt(i, typeof r === "function" ? r(i) : r * sc).join(",")).join(" ");
  const col = `oklch(0.64 0.16 ${hue})`;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: "100%", maxWidth: size, height: "auto", display: "block" }}>
      {[0.25, 0.5, 0.75, 1].map(f => <polygon key={f} points={poly(R * f, 1)} fill="none" stroke="var(--rule)" strokeWidth="1" />)}
      {axes.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--rule)" strokeWidth="1" />; })}
      {avg && <polygon points={poly(i => R * Math.max(0, Math.min(100, avg[i] || 0)) / 100, 1)} fill="none" stroke="var(--ink-faint)" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.85" />}
      <polygon points={poly(i => R * Math.max(0, Math.min(100, axes[i].value)) / 100, 1)} fill={col} fillOpacity="0.22" stroke={col} strokeWidth="1.7" />
      {axes.map((ax, i) => { const [x, y] = pt(i, R + 15); return (
        <text key={i} x={x} y={y} textAnchor={Math.abs(x - cx) < 6 ? "middle" : x > cx ? "start" : "end"}
          dominantBaseline="middle" fontFamily="var(--mono)" fontSize="8.5" fill="var(--ink-faint)">{ax.label}</text>); })}
      {axes.map((ax, i) => { const [x, y] = pt(i, R * Math.max(2, Math.min(100, ax.value)) / 100); return <circle key={i} cx={x} cy={y} r="2.1" fill={col} />; })}
    </svg>
  );
}
// library average in the radar's axis order: Energy, Tempo, Dance, Positive(valence), Acoustic, Instr.
function radarLibAvg() { return ["energy", "tempo", "dance", "valence", "acoustic", "instr"].map(a => libMean(a)); }
// tiny per-year play sparkline (bars).
function Sparkline({ series, hue, height = 34 }) {
  if (!series.length) return null;
  const max = Math.max(...series.map(s => s.p), 1);
  const y0 = series[0].y, y1 = series[series.length - 1].y, span = Math.max(1, y1 - y0);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height, marginTop: 2 }} title={`${y0}–${y1}`}>
      {series.map(s => (
        <div key={s.y} title={`${s.y}: ${fmt(s.p)}`} style={{ flex: 1, minWidth: 3,
          height: Math.max(2, s.p / max * height), background: `oklch(0.62 0.14 ${hue})`, borderRadius: "2px 2px 0 0", opacity: 0.55 + 0.45 * (s.p / max) }} />
      ))}
    </div>
  );
}
// tiny valence×energy quadrant with a single dot (where this track/album sits).
function MiniQuadrant({ valence, energy, hue, size = 96 }) {
  const p = 8, x = p + (valence / 100) * (size - 2 * p), y = p + (1 - energy / 100) * (size - 2 * p);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size, display: "block" }}>
      <rect x="1" y="1" width={size - 2} height={size - 2} rx="5" fill="var(--bg-3)" stroke="var(--rule)" />
      <line x1={size / 2} y1={p} x2={size / 2} y2={size - p} stroke="var(--rule)" strokeWidth="1" />
      <line x1={p} y1={size / 2} x2={size - p} y2={size / 2} stroke="var(--rule)" strokeWidth="1" />
      <circle cx={x} cy={y} r="4.5" fill={`oklch(0.66 0.17 ${hue})`} stroke="#fff" strokeWidth="1.2" />
    </svg>
  );
}
const PITCH = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
const keyName = (k, m) => (k == null || k < 0) ? "" : PITCH[k] + (m === 0 ? " min" : m === 1 ? " maj" : "");

// AlbumView — your history with one album: the tracks you've played from it (with per-song plays),
// when you played it, and the artist's genre/mood (joined from the inline universe). The album's
// identity is "artistSlug~titleSlug"; data comes from the lazy media-index, loaded on demand.
function AlbumView({ id, go }) {
  const R = window.ROTATION;
  const [ready, setReady] = React.useState(!!window.ROTATION_MEDIA);
  React.useEffect(() => {
    if (window.ROTATION_MEDIA) { setReady(true); return; }
    const s = document.createElement("script"); s.src = "media-index.js"; s.onload = () => setReady(true); document.head.appendChild(s);
  }, []);
  // 30-second "needle drop" previews (same as Shelves) — load the hash index on demand
  const [, setPrevReady] = React.useState(!!window.ROTATION_PREVIEWS);
  React.useEffect(() => {
    if (window.ROTATION_PREVIEWS) return;
    const s = document.createElement("script"); s.src = "track-previews.js"; s.onload = () => setPrevReady(true); document.head.appendChild(s);
  }, []);
  // per-track themes for the "mostly about…" roll-up — tiny extra render when it arrives
  const [themesReady, setThemesReady] = React.useState(!!window.ROTATION_TRACKTHEMES);
  React.useEffect(() => {
    if (window.ROTATION_TRACKTHEMES) return;
    const s = document.createElement("script"); s.src = "genius-themes-lazy.js"; s.onload = () => setThemesReady(true); document.head.appendChild(s);
  }, []);
  const hueOf = (s) => { let h = 0; for (const c of (s || "")) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 360; };

  const data = React.useMemo(() => {
    const M = window.ROTATION_MEDIA; if (!M || !id) return null;
    const sep = id.indexOf("~"); const aSlug = id.slice(0, sep), tSlug = id.slice(sep + 1);
    let bestIdx = -1, bestPlays = -1;
    for (let i = 0; i < M.albums.length; i++) { const al = M.albums[i]; if (al[2] > bestPlays && R.slug(M.artists[al[1]]) === aSlug && R.slug(al[0]) === tSlug) { bestIdx = i; bestPlays = al[2]; } }
    if (bestIdx < 0) return null;
    const al = M.albums[bestIdx], artist = M.artists[al[1]];
    const tracks = [];
    for (const t of M.tracks) if (t[3] === bestIdx) tracks.push({ title: t[0], plays: t[2], no: t[5] || 0, e: t.length >= 8 ? t[6] : null, v: t.length >= 8 ? t[7] : null });
    const hasNos = tracks.some(t => t.no);
    tracks.sort((x, y) => hasNos ? ((x.no || 999) - (y.no || 999)) || (y.plays - x.plays) : y.plays - x.plays);
    return { title: al[0], artist, plays: al[2], firstY: al[3], lastY: al[4], cover: al[6] || "", meta: al[7] || null,
      tracks, trackPlays: tracks.reduce((s, t) => s + t.plays, 0), dna: al[8] || null,
      series: yearSeries(al[5], al[2]), rank: bestIdx + 1, albumCount: M.albums.length };
  }, [ready, id]);

  if (!ready) return <div className="r-view"><div className="r-mono" style={{ color: "var(--ink-faint)", padding: 40 }}>loading album…</div></div>;
  if (!data) return <div className="r-view"><button className="r-back" onClick={() => go("explore")}>← explore</button><div className="r-mono" style={{ color: "var(--ink-faint)", padding: 24 }}>Album not found.</div></div>;

  const artistId = R.idForName(data.artist) || R.slug(data.artist);
  const rec = R.byId[artistId] || (R.expById && R.expById[artistId]);
  const known = !!rec;
  const hue = rec ? rec.hue : hueOf(data.artist);
  const subs = rec && rec.s ? rec.s.map(i => R.SUBS[i] && R.SUBS[i].name).filter(Boolean).slice(0, 6) : [];
  const maxT = Math.max(...data.tracks.map(t => t.plays), 1);
  const standout = data.tracks.reduce((a, b) => b.plays > (a ? a.plays : 0) ? b : a, null);
  const heardYr = data.firstY ? (data.firstY === data.lastY ? `${data.firstY}` : `${data.firstY}–${data.lastY}`) : "";
  const typeName = data.meta ? ({ a: "Album", s: "Single", c: "Compilation" }[data.meta[1]] || "Album") : "Album";
  const relYear = data.meta && data.meta[0] ? data.meta[0] : "";
  const label = data.meta && data.meta[2] ? data.meta[2] : "";
  const dna = data.dna;   // [energy, valence, dance, acoustic, instr, tempo]
  const radar = dna ? [{ label: "Energy", value: dna[0] }, { label: "Tempo", value: dna[5] }, { label: "Dance", value: dna[2] }, { label: "Positive", value: dna[1] }, { label: "Acoustic", value: dna[3] }, { label: "Instr.", value: dna[4] }] : null;
  const eP = dna ? tastePctl("energy", dna[0]) : null, vP = dna ? tastePctl("valence", dna[1]) : null;
  const bpm = dna ? Math.round(50 + dna[5] / 100 * 140) : 0;
  const avgSec = (R.TOTALS && R.TOTALS.avgTrackSec) || 216;
  const listenedMin = Math.round(avgSec * data.trackPlays / 60);
  const sr = data.series, sFirst = sr[0], sLast = sr[sr.length - 1], sPeak = sr.reduce((a, b) => b.p > (a ? a.p : 0) ? b : a, null);
  // album theme roll-up: play-weighted primary themes across this album's tracks (≥2 themed)
  const albThemes = (() => {
    const TT = window.ROTATION_TRACKTHEMES; if (!TT || !TT._themes) return null;
    const acc = new Map(); let themed = 0, tot = 0;
    for (const t of data.tracks) {
      const th = TT[R.slug(data.artist) + "~" + R.slug(t.title)];
      if (!th || !th.length) continue;
      themed++; tot += t.plays;
      acc.set(th[0][0], (acc.get(th[0][0]) || 0) + t.plays);
    }
    if (themed < 2 || !tot) return null;
    return [...acc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2)
      .map(([i, p]) => ({ theme: TT._themes[i], share: Math.round(p / tot * 100) }));
  })();

  return (
    <div className="r-view tv-page">
      <button className="r-back" onClick={() => go("explore")}>← explore</button>
      <div className="tv-head" style={{ display: "flex", gap: 26, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 26 }}>
        <GenCover hue={hue} name={data.title} image={data.cover} thumb={data.cover} size={150} radius={6} />
        <div style={{ flex: 1, minWidth: 240 }}>
          <div className="r-kicker">{typeName}{relYear ? ` · ${relYear}` : ""}{data.tracks.length ? ` · ${data.tracks.length} track${data.tracks.length !== 1 ? "s" : ""} played` : ""}</div>
          <h1 className="r-title" style={{ fontSize: "clamp(30px,4.4vw,54px)" }}>{data.title}<span className="dot">.</span></h1>
          <div style={{ color: "var(--ink-soft)", fontSize: 15, marginTop: 6 }}>
            by {known ? <b onClick={() => go("artist", artistId)} style={{ cursor: "pointer", color: "var(--ink)" }}>{data.artist}</b> : data.artist}</div>
          {label && <div className="r-mono" style={{ fontSize: 10.5, color: "var(--ink-faint)", marginTop: 4 }}>{label}{heardYr ? ` · you played it ${heardYr}` : ""}</div>}
          {albThemes && (
            <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 8 }} title="Play-weighted lyric themes across the tracks you've played from this album">
              Mostly about <b style={{ color: "var(--ink)" }}>{albThemes[0].theme}</b>
              {albThemes[1] ? <>, with <b style={{ color: "var(--ink)" }}>{albThemes[1].theme}</b></> : null}
              <span style={{ color: "var(--ink-faint)" }}> · lyric themes</span>
            </div>
          )}
          {subs.length > 0 && <div style={{ display: "flex", gap: 7, marginTop: 12, flexWrap: "wrap" }}>
            {subs.map(s => <span key={s} className="r-chip link" title={`Explore ${s} →`} onClick={() => go("explore", s)}>{s}</span>)}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 13, flexWrap: "wrap", alignItems: "center" }}>
            {standout && <ShNeedle trackKey={R.slug(data.artist) + "~" + R.slug(standout.title)} artist={data.artist} album={data.title} hue={hue} />}
            <a className="r-extlink r-extlink-lf" href={`https://www.last.fm/music/${encodeURIComponent(data.artist)}/${encodeURIComponent(data.title)}`} target="_blank" rel="noopener noreferrer">last.fm ↗</a>
            <a className="r-extlink r-extlink-sp" href={`https://open.spotify.com/search/${encodeURIComponent(data.artist + " " + data.title)}`} target="_blank" rel="noopener noreferrer">Spotify ↗</a>
          </div>
        </div>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div><div className="r-stat-n" style={{ fontSize: 36 }}>{fmt(data.plays)}</div>
            <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: ".12em", textTransform: "uppercase", marginTop: 5 }}>plays</div></div>
          {listenedMin > 0 && <div><div className="r-stat-n" style={{ fontSize: 36 }}>{listenedMin >= 60 ? Math.round(listenedMin / 60) + "h" : listenedMin + "m"}</div>
            <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: ".12em", textTransform: "uppercase", marginTop: 5 }}>~listened</div></div>}
          <div><div className="r-stat-n" style={{ fontSize: 36, color: "var(--accent)" }}>#{fmt(data.rank)}</div>
            <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: ".12em", textTransform: "uppercase", marginTop: 5 }}>your albums</div></div>
        </div>
      </div>

      {dna && (
        <div className="tv-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0,1.1fr) minmax(0,1fr)", gap: "var(--gap)", marginBottom: "var(--gap)" }}>
          <div className="r-card" style={{ padding: "16px 18px" }}>
            <div className="r-card-h" style={{ padding: 0, marginBottom: 6 }}><span className="lbl"><b>Album Audio DNA</b></span>
              <span className="meta">{bpm ? `~${bpm} BPM` : ""}</span></div>
            <div className="tv-dna-row" style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ flex: "0 0 auto", width: 188, maxWidth: "100%" }}>
                <AudioRadar axes={radar} hue={hue} avg={radarLibAvg()} />
                <div className="r-mono" style={{ fontSize: 8.5, color: "var(--ink-faint)", textAlign: "center", marginTop: 2 }}>solid = this album · dashed = your average</div>
              </div>
              <div style={{ flex: 1, minWidth: 170, display: "grid", gap: 8 }}>
                {[["Energy", dna[0]], ["Positivity", dna[1]], ["Danceability", dna[2]], ["Acousticness", dna[3]], ["Instrumental", dna[4]]].map(([label, v]) => (
                  <div key={label} style={{ display: "grid", gridTemplateColumns: "94px minmax(0,1fr) 26px", gap: 10, alignItems: "center" }}>
                    <span className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-soft)" }}>{label}</span>
                    <div className="xp-bar" style={{ width: "100%" }}><div style={{ width: v + "%", background: `oklch(0.62 0.15 ${hue})` }} /></div>
                    <span className="r-mono" style={{ fontSize: 10, color: "var(--ink-faint)", textAlign: "right" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="r-card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div className="r-card-h" style={{ padding: 0, marginBottom: 8 }}><span className="lbl"><b>Where it sits</b></span></div>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <MiniQuadrant valence={dna[1]} energy={dna[0]} hue={hue} />
                <div style={{ fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.5 }}>
                  {eP != null && <div>More <b style={{ color: "var(--ink)" }}>intense</b> than {Math.round(eP)}% of your plays.</div>}
                  {vP != null && <div>More <b style={{ color: "var(--ink)" }}>upbeat</b> than {Math.round(vP)}% of them.</div>}
                  <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", marginTop: 5 }}>album mood vs your library</div>
                </div>
              </div>
            </div>
            {sr.length > 0 && <div>
              <div className="r-card-h" style={{ padding: 0, marginBottom: 4 }}><span className="lbl"><b>Your history</b></span>
                <span className="meta">{sFirst.y === sLast.y ? sFirst.y : `${sFirst.y}–${sLast.y}`}</span></div>
              <Sparkline series={sr} hue={hue} />
              <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 6 }}>
                {sFirst.y === sLast.y ? `All ${fmt(data.plays)} plays in ${sFirst.y}.` : `First in ${sFirst.y}, peaked ${sPeak.y} (${fmt(sPeak.p)}).`}</div>
            </div>}
          </div>
        </div>
      )}

      <div className="r-card" style={{ padding: "16px 18px" }}>
        <div className="r-card-h" style={{ padding: 0, marginBottom: 6 }}><span className="lbl"><b>Tracks you've played</b></span>
          <span className="meta">{fmt(data.trackPlays)} plays across {data.tracks.length}</span></div>
        <div style={{ display: "grid", gap: 2 }}>
          {data.tracks.map((t, i) => (
            <div key={t.title + i} className="r-track-row" onClick={() => go("track", R.slug(data.artist) + "~" + R.slug(t.title))} title={`${t.title} →${t.e != null ? ` · energy ${t.e} · positivity ${t.v}` : ""}`} style={{ display: "grid", gridTemplateColumns: "24px minmax(0,1fr) 72px 46px", gap: 10, alignItems: "center", padding: "7px 4px", cursor: "pointer", borderRadius: 4 }}>
              <span className="r-mono" style={{ fontSize: 10, color: "var(--ink-faint)" }}>{t.no ? String(t.no).padStart(2, "0") : String(i + 1).padStart(2, "0")}</span>
              <div style={{ fontSize: 13, lineHeight: 1.25, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "break-word" }}>
                {t.title}{standout && t === standout ? <span title="your most-played from this album" style={{ color: "var(--accent)", marginLeft: 5 }}>★</span> : null}
                <LiveMark on={seenLiveKey(R.slug(data.artist) + "~" + R.slug(t.title))} /></div>
              <div className="xp-bar" style={{ width: "100%" }}><div style={{ width: (t.plays / maxT * 100) + "%", background: `oklch(0.6 0.14 ${hue})` }} /></div>
              <span className="r-mono" style={{ fontSize: 11, color: "var(--ink-soft)", textAlign: "right" }}>{fmt(t.plays)}</span>
            </div>
          ))}
        </div>
        {known && <div style={{ marginTop: 14 }}><button className="r-back" style={{ margin: 0 }} onClick={() => go("artist", artistId)}>more from {data.artist} →</button></div>}
      </div>
    </div>
  );
}

// PreviewBtn — plays the 30-second Spotify preview (hash from the lazy track-previews.js; the
// cid query param is constant across the whole dump). When the dump has no preview (e.g. much
// of NIN's catalog), falls back to the keyless iTunes Search API — accepted only when BOTH the
// artist and title match after normalisation, so it can't play the wrong song. One Audio
// element, toggled; cleaned on nav.
const PREVIEW_CID = "65b708073fc0480ea92a077233ca87bd";
const _itCache = new Map();   // id → url | null (session-level, avoids repeat lookups)
function PreviewBtn({ id, hue, artist, title }) {
  const [playing, setPlaying] = React.useState(false);
  const [itUrl, setItUrl] = React.useState(() => _itCache.has(id) ? _itCache.get(id) : undefined);
  const ref = React.useRef(null);
  React.useEffect(() => () => { if (ref.current) { ref.current.pause(); ref.current = null; } }, [id]);
  const hash = window.ROTATION_PREVIEWS && window.ROTATION_PREVIEWS[id];
  React.useEffect(() => {
    if (hash || !artist || !title || _itCache.has(id)) return;
    const nrm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\(.*?\)|\[.*?\]/g, "").replace(/[^a-z0-9ぁ-んァ-ヶ一-龠]/gu, "");
    fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(artist + " " + title)}&media=music&entity=song&limit=5`)
      .then(r => r.json())
      .then(j => {
        const tN = nrm(title), aN = nrm(artist);
        const hit = (j.results || []).find(r => r.previewUrl && nrm(r.trackName) === tN &&
          (nrm(r.artistName).includes(aN) || aN.includes(nrm(r.artistName))));
        const url = hit ? hit.previewUrl : null;
        _itCache.set(id, url); setItUrl(url);
      })
      .catch(() => { _itCache.set(id, null); setItUrl(null); });
  }, [id, hash]);
  const src = hash ? `https://p.scdn.co/mp3-preview/${hash}?cid=${PREVIEW_CID}` : itUrl;
  if (!src) return null;
  const toggle = () => {
    if (ref.current && !ref.current.paused) { ref.current.pause(); setPlaying(false); return; }
    if (!ref.current) {
      ref.current = new Audio(src);
      ref.current.addEventListener("ended", () => setPlaying(false));
      ref.current.addEventListener("error", () => setPlaying(false));
    }
    ref.current.play().catch(() => setPlaying(false));
    setPlaying(true);
  };
  return (
    <button onClick={toggle} title="30-second preview (Spotify)"
      style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 14px", borderRadius: 999,
        border: `1px solid ${playing ? `oklch(0.6 0.14 ${hue} / .8)` : "var(--rule-2)"}`,
        background: playing ? `oklch(0.6 0.14 ${hue} / .16)` : "transparent",
        color: playing ? `oklch(0.82 0.12 ${hue})` : "var(--ink-soft)", cursor: "pointer",
        fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase" }}>
      {playing ? "❚❚ playing" : "▶ preview"}
    </button>
  );
}

// TrackView — one song's story: your play history joined with its Spotify audio DNA (energy, mood,
// acousticness, tempo, danceability, instrumentalness, key/mode, loudness, liveness, time signature) +
// stats (duration, popularity, explicit, track #, ranks). Identity is "artistSlug~trackSlug" (mirrors
// AlbumView). Needs media-index (plays/album) + the lazy track-audio.js (features), loaded on demand.
function TrackView({ id, go }) {
  const R = window.ROTATION;
  const [ready, setReady] = React.useState(!!(window.ROTATION_MEDIA && window.ROTATION_TRACKAUDIO));
  React.useEffect(() => {
    let need = 0; const done = () => { if (--need <= 0) setReady(true); };
    const load = (src, glob) => { if (window[glob]) return; need++; const s = document.createElement("script"); s.src = src; s.onload = done; document.head.appendChild(s); };
    load("media-index.js", "ROTATION_MEDIA"); load("track-audio.js", "ROTATION_TRACKAUDIO");
    load("track-previews.js", "ROTATION_PREVIEWS"); load("genius-mood-lazy.js", "ROTATION_MOOD");
    load("genius-about-lazy.js", "ROTATION_ABOUT");
    if (need === 0) setReady(true);
  }, []);
  const hueOf = (s) => { let h = 0; for (const c of (s || "")) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 360; };

  const data = React.useMemo(() => {
    const M = window.ROTATION_MEDIA, A = window.ROTATION_TRACKAUDIO; if (!M || !A || !id) return null;
    const sep = id.indexOf("~"); const aSlug = id.slice(0, sep), tSlug = id.slice(sep + 1);
    let bestIdx = -1, bestPlays = -1;
    for (let i = 0; i < M.tracks.length; i++) { const t = M.tracks[i]; if (t[2] > bestPlays && R.slug(M.artists[t[1]]) === aSlug && R.slug(t[0]) === tSlug) { bestIdx = i; bestPlays = t[2]; } }
    const feat = A[id] || null;
    if (bestIdx < 0 && !feat) return null;
    const t = bestIdx >= 0 ? M.tracks[bestIdx] : null;
    const artist = t ? M.artists[t[1]] : aSlug;
    const albIdx = t ? t[3] : -1; const alb = albIdx >= 0 ? M.albums[albIdx] : null;
    const plays = t ? t[2] : 0;
    // ranks + siblings (from the media index)
    let artistRank = 0, artistTracks = 0, globalRank = bestIdx >= 0 ? bestIdx + 1 : 0;
    const siblings = [];
    if (t) {
      const aIx = t[1];
      for (let i = 0; i < M.tracks.length; i++) { const o = M.tracks[i]; if (o[1] === aIx) { artistTracks++; if (o[2] > plays || (o[2] === plays && i < bestIdx)) artistRank++; } }
      if (albIdx >= 0) for (let i = 0; i < M.tracks.length && siblings.length < 20; i++) { const o = M.tracks[i]; if (i !== bestIdx && o[3] === albIdx) siblings.push({ title: o[0], plays: o[2], no: o[5] || 0, id: R.slug(artist) + "~" + R.slug(o[0]) }); }
      siblings.sort((x, y) => (x.no && y.no) ? x.no - y.no : y.plays - x.plays);
    }
    return {
      title: t ? t[0] : tSlug, artist, plays,
      album: alb ? alb[0] : "", albumId: alb ? R.slug(M.artists[alb[1]]) + "~" + R.slug(alb[0]) : "",
      cover: alb && alb[6] ? alb[6] : "", trackNo: (t && t[5]) || (feat && feat[3]) || 0,
      dur: feat ? feat[0] : 0, pop: feat ? feat[1] : 0, explicit: feat ? !!feat[2] : false,
      feat: feat && feat.length >= 16 ? feat : null,
      series: t ? yearSeries(t[4], plays) : [], artistRank: artistRank + 1, artistTracks, globalRank,
      siblings: siblings.slice(0, 8),
    };
  }, [ready, id]);

  if (!ready) return <div className="r-view"><div className="r-mono" style={{ color: "var(--ink-faint)", padding: 40 }}>loading track…</div></div>;
  if (!data) return <div className="r-view"><button className="r-back" onClick={() => go("explore")}>← explore</button><div className="r-mono" style={{ color: "var(--ink-faint)", padding: 24 }}>Track not found.</div></div>;

  const artistId = R.idForName(data.artist) || R.slug(data.artist);
  const rec = R.byId[artistId] || (R.expById && R.expById[artistId]);
  const known = !!rec;
  const hue = rec ? rec.hue : hueOf(data.artist);
  const mmss = (s) => s ? Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0") : "";
  const f = data.feat;
  // lyric mood (NRC) + "seen live" — both keyed by the same slug id TrackView routes by
  const EMO_NAMES = ["anger", "anticipation", "disgust", "fear", "joy", "sadness", "surprise", "trust"];
  const mood = (window.ROTATION_MOOD && window.ROTATION_MOOD[id]) || null; // [lyrValence, emoIdx, matched]
  const about = (window.ROTATION_ABOUT && window.ROTATION_ABOUT[id]) || null; // [excerpt, geniusId]
  const audVal = f ? f[5] : null;    // Spotify audio valence ("sounds")
  const lyrVal = mood ? mood[0] : null;  // NRC lyric valence ("reads")
  const lyrEmo = mood && mood[1] >= 0 ? EMO_NAMES[mood[1]] : null;
  const seenLive = !!(R.GIGS && R.GIGS.liveSongs && R.GIGS.liveSongs.indexOf(id) >= 0);
  const divergent = (audVal != null && lyrVal != null && Math.abs(audVal - lyrVal) >= 30);
  const bpm = f ? Math.round(50 + f[7] / 100 * 140) : 0;   // undo build-time 50..190 remap
  const totalMin = data.dur && data.plays ? Math.round(data.dur * data.plays / 60) : 0;
  const radar = f ? [{ label: "Energy", value: f[4] }, { label: "Tempo", value: f[7] }, { label: "Dance", value: f[8] }, { label: "Positive", value: f[5] }, { label: "Acoustic", value: f[6] }, { label: "Instr.", value: f[9] }] : null;
  const bars = f ? [["Energy", f[4]], ["Positivity", f[5]], ["Danceability", f[8]], ["Acousticness", f[6]], ["Liveness", f[11]], ["Instrumental", f[9]]] : null;
  const eP = f ? tastePctl("energy", f[4]) : null, vP = f ? tastePctl("valence", f[5]) : null;
  const sr = data.series, first = sr[0], last = sr[sr.length - 1], peak = sr.reduce((a, b) => b.p > (a ? a.p : 0) ? b : a, null);
  const kName = f ? keyName(f[13], f[14]) : "";
  const artAF = R.AUDIO && R.AUDIO[artistId];   // artist-level: [..7 pop, 8 followers ..]
  // mirror the artist "Sound DNA" stat grid — tempo → followers (7), but per-song where it differs.
  const attrs = f ? [
    { k: "tempo", v: bpm || "—", u: bpm ? " bpm" : "" },
    { k: "key", v: kName || "—" },
    { k: "loud", v: f[10] ? (f[10] / 10).toFixed(1) : "—", u: f[10] ? " dB" : "" },
    { k: "speech", v: f[12], u: "%" },
    { k: "live", v: f[11], u: "%" },
    { k: "pop", v: data.pop, u: "/100" },
    { k: "followers", v: artAF ? fmtK(artAF[8]) : "—", t: "the artist's Spotify followers" },
  ] : [];

  return (
    <div className="r-view tv-page">
      <button className="r-back" onClick={() => go(data.albumId ? "album" : "explore", data.albumId || undefined)}>← {data.album || "explore"}</button>
      <div className="tv-head" style={{ display: "flex", gap: 26, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 24 }}>
        <GenCover hue={hue} name={data.title} image={data.cover} thumb={data.cover} size={132} radius={6} />
        <div style={{ flex: 1, minWidth: 240 }}>
          <div className="r-kicker">Song{data.trackNo ? ` · track ${data.trackNo}` : ""}{data.dur ? ` · ${mmss(data.dur)}` : ""}{data.explicit ? " · explicit" : ""}</div>
          <h1 className="r-title" style={{ fontSize: "clamp(28px,4.2vw,50px)" }}>{data.title}<span className="dot">.</span></h1>
          <div style={{ color: "var(--ink-soft)", fontSize: 15, marginTop: 6 }}>
            by {known ? <b onClick={() => go("artist", artistId)} style={{ cursor: "pointer", color: "var(--ink)" }}>{data.artist}</b> : data.artist}
            {data.album && <> · <span onClick={() => go("album", data.albumId)} style={{ cursor: "pointer", color: "var(--ink-soft)" }}>{data.album}</span></>}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 13, flexWrap: "wrap", alignItems: "center" }}>
            <PreviewBtn id={id} hue={hue} artist={data.artist} title={data.title} />
            {seenLive && <span className="tv-seen" title="You've watched this performed live — it's in a setlist from a show you attended">🎤 Seen live</span>}
            <a className="r-extlink r-extlink-lf" href={`https://www.last.fm/music/${encodeURIComponent(data.artist)}/_/${encodeURIComponent(data.title)}`} target="_blank" rel="noopener noreferrer">last.fm ↗</a>
            <a className="r-extlink r-extlink-sp" href={`https://open.spotify.com/search/${encodeURIComponent(data.artist + " " + data.title)}`} target="_blank" rel="noopener noreferrer">Spotify ↗</a>
          </div>
        </div>
        <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
          <div><div className="r-stat-n" style={{ fontSize: 34 }}>{fmt(data.plays)}</div>
            <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: ".12em", textTransform: "uppercase", marginTop: 5 }}>plays</div></div>
          {totalMin > 0 && <div><div className="r-stat-n" style={{ fontSize: 34 }}>{totalMin >= 60 ? Math.round(totalMin / 60) + "h" : totalMin + "m"}</div>
            <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: ".12em", textTransform: "uppercase", marginTop: 5 }}>listened</div></div>}
          {data.artistTracks > 1 && <div><div className="r-stat-n" style={{ fontSize: 34, color: "var(--accent)" }}>#{data.artistRank}</div>
            <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: ".12em", textTransform: "uppercase", marginTop: 5 }}>of {data.artistTracks} by artist</div></div>}
          {data.pop > 0 && <div><div className="r-stat-n" style={{ fontSize: 34 }}>{data.pop}</div>
            <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: ".12em", textTransform: "uppercase", marginTop: 5 }}>popularity</div></div>}
        </div>
      </div>

      {/* blurb + mood row — description LEFT, sounds/reads RIGHT (under the header stats),
          per Fuad 2026-07-05. Single column when only one of the two exists. */}
      {(about || (audVal != null && lyrVal != null)) && (
        <div className="tv-subrow" data-both={!!(about && audVal != null && lyrVal != null)}>
          {about && (
            <div className="tv-about">
              <span className="tv-about-txt">{about[0]}</span>
              {about[1] ? <a className="tv-about-src" href={`https://genius.com/songs/${about[1]}`} target="_blank" rel="noopener noreferrer">via Genius ↗</a> : null}
            </div>
          )}
          {(audVal != null && lyrVal != null) && (
            <div className="tv-mood">
              <div className="tv-mood-axis">
                <span className="tv-mood-k">Sounds</span>
                <div className="tv-mood-bar"><i style={{ width: audVal + "%", background: "oklch(0.72 0.15 145)" }} /></div>
                <span className="tv-mood-v">{audVal}</span>
              </div>
              <div className="tv-mood-axis">
                <span className="tv-mood-k">Reads</span>
                <div className="tv-mood-bar"><i style={{ width: lyrVal + "%", background: "oklch(0.68 0.16 25)" }} /></div>
                <span className="tv-mood-v">{lyrVal}</span>
              </div>
              <div className="tv-mood-note">
                <span className="txt">
                  {divergent
                    ? (audVal > lyrVal ? <>Bright sound, bleak words.</> : <>Heavy sound, hopeful words.</>)
                    : <>Sound and words agree.</>}
                  {lyrEmo ? <> Lyric tone reads <b>{lyrEmo}</b>.</> : null}
                </span>
                <span className="tv-mood-help" tabIndex={0}>
                  <i>?</i>
                  <span className="tv-mood-tip">
                    <b>Sounds</b> — how upbeat the music itself is: Spotify&#8217;s audio positivity, 0 gloomy &#8594; 100 euphoric.<br />
                    <b>Reads</b> — how positive the lyrics are on the page, scored word-by-word against an emotion lexicon in the song&#8217;s language.<br />
                    A wide gap is the classic trick: music that smiles while the words don&#8217;t.
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {f ? (
        <div className="tv-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0,1.1fr) minmax(0,1fr)", gap: "var(--gap)", marginBottom: "var(--gap)" }}>
          <div className="r-card" style={{ padding: "16px 18px" }}>
            <div className="r-card-h" style={{ padding: 0, marginBottom: 6 }}><span className="lbl"><b>Audio DNA</b></span>
              <span className="meta">Spotify features</span></div>
            <div className="tv-dna-row" style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ flex: "0 0 auto", width: 188, maxWidth: "100%" }}>
                <AudioRadar axes={radar} hue={hue} avg={radarLibAvg()} />
                <div className="r-mono" style={{ fontSize: 8.5, color: "var(--ink-faint)", textAlign: "center", marginTop: 2 }}>solid = this song · dashed = your average</div>
              </div>
              <div style={{ flex: 1, minWidth: 180, display: "grid", gap: 8 }}>
                {bars.map(([label, v]) => (
                  <div key={label} style={{ display: "grid", gridTemplateColumns: "96px minmax(0,1fr) 26px", gap: 10, alignItems: "center" }}>
                    <span className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-soft)" }}>{label}</span>
                    <div className="xp-bar" style={{ width: "100%" }}><div style={{ width: v + "%", background: `oklch(0.62 0.15 ${hue})` }} /></div>
                    <span className="r-mono" style={{ fontSize: 10, color: "var(--ink-faint)", textAlign: "right" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
            {attrs.length > 0 && <div style={{ marginTop: 13, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(62px, 1fr))", gap: 9, borderTop: "1px solid var(--rule)", paddingTop: 12 }}>
              {attrs.map(s => (
                <div key={s.k} title={s.t || ""}>
                  <div className="r-mono" style={{ fontSize: 8, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--ink-faint)" }}>{s.k}</div>
                  <div style={{ fontSize: 13, marginTop: 1, whiteSpace: "nowrap" }}>{s.v}{s.u && <span style={{ fontSize: 9, color: "var(--ink-faint)" }}>{s.u}</span>}</div>
                </div>
              ))}
            </div>}
          </div>

          <div className="r-card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div className="r-card-h" style={{ padding: 0, marginBottom: 8 }}><span className="lbl"><b>Where it sits</b></span></div>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <MiniQuadrant valence={f[5]} energy={f[4]} hue={hue} />
                <div style={{ fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.5 }}>
                  {eP != null && <div>More <b style={{ color: "var(--ink)" }}>intense</b> than {Math.round(eP)}% of your plays.</div>}
                  {vP != null && <div>More <b style={{ color: "var(--ink)" }}>upbeat</b> than {Math.round(vP)}% of them.</div>}
                  <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", marginTop: 5 }}>valence × energy vs your library</div>
                </div>
              </div>
            </div>
            {sr.length > 0 && <div>
              <div className="r-card-h" style={{ padding: 0, marginBottom: 4 }}><span className="lbl"><b>Your history</b></span>
                <span className="meta">{first.y === last.y ? first.y : `${first.y}–${last.y}`}</span></div>
              <Sparkline series={sr} hue={hue} />
              <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 6 }}>
                {first.y === last.y ? `All ${fmt(data.plays)} plays in ${first.y}.` : `First in ${first.y}, peaked ${peak.y} (${fmt(peak.p)}).`}
                {data.globalRank ? <span className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)" }}> · #{fmt(data.globalRank)} track all-time</span> : null}
              </div>
            </div>}
          </div>
        </div>
      ) : (
        <div className="r-card" style={{ padding: "16px 18px", marginBottom: "var(--gap)" }}>
          <div className="r-mono" style={{ fontSize: 11, color: "var(--ink-faint)" }}>No Spotify audio features matched for this track.</div>
          {data.series.length > 0 && <div style={{ marginTop: 10 }}><Sparkline series={data.series} hue={hue} /></div>}
        </div>
      )}

      {data.siblings.length > 0 && (
        <div className="r-card" style={{ padding: "16px 18px" }}>
          <div className="r-card-h" style={{ padding: 0, marginBottom: 8 }}><span className="lbl">More from <b>{data.album}</b></span>
            <span className="meta">{data.siblings.length} more you've played</span></div>
          <div style={{ display: "grid", gap: 2 }}>
            {data.siblings.map((s, i) => (
              <div key={s.id + i} className="r-track-row" onClick={() => go("track", s.id)} title={`${s.title} →`}
                style={{ display: "grid", gridTemplateColumns: "24px minmax(0,1fr) 46px", gap: 10, alignItems: "center", padding: "6px 4px", cursor: "pointer", borderRadius: 4 }}>
                <span className="r-mono" style={{ fontSize: 10, color: "var(--ink-faint)" }}>{s.no ? String(s.no).padStart(2, "0") : "·"}</span>
                <span style={{ fontSize: 13, minWidth: 0, display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</span>
                  <LiveMark on={seenLiveKey(s.id)} /></span>
                <span className="r-mono" style={{ fontSize: 11, color: "var(--ink-soft)", textAlign: "right" }}>{fmt(s.plays)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {known && <div style={{ marginTop: 14 }}><button className="r-back" style={{ margin: 0 }} onClick={() => go("artist", artistId)}>more from {data.artist} →</button></div>}
    </div>
  );
}

Object.assign(window, { ArtistView, AlbumView, TrackView, LiveView, ConcertRow });
