// rotation-views2.jsx — Artist drilldown · Album · Track + Live
// exports: ArtistView, AlbumView, TrackView, LiveView

// ════════════════════════ ARTIST DRILLDOWN ════════════════════════
const DNA_AXES = ["NRG", "MOOD", "ACOU", "BPM", "DANCE", "INSTR"];

// Per-artist album/song streamgraph (reuses the Journey StreamGraph). Flow data lives in a
// separate artist-flow.js, lazy-loaded on the first artist-page visit so first paint stays lean.
function ArtistFlow({ id, hue, go, drill: drillProp, setDrill: setDrillProp, onAlbum }) {
  const get = () => (window.ROTATION_FLOW && window.ROTATION_FLOW.byId[id]) || (window.ROTATION_FLOW ? false : null);
  const [flow, setFlow] = React.useState(get);
  const [mode, setMode] = React.useState("albums");  // albums | songs
  // drill (album index when broken into its songs) can be CONTROLLED by the parent, so the
  // selection also scopes the artist page's Top-tracks + Sound-DNA cards (Fuad, 2026-07-07)
  const [drillS, setDrillS] = React.useState(null);
  const drill = drillProp !== undefined ? drillProp : drillS;
  const setDrill = setDrillProp || setDrillS;
  const [hi, setHi] = React.useState(-1);
  // report the drilled album object (name + per-track year series) upward
  React.useEffect(() => {
    if (onAlbum) onAlbum(drill != null && flow && flow.albums && flow.albums[drill] ? flow.albums[drill] : null);
  }, [drill, flow]);
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
    <div className="r-card" style={{ padding: 18, touchAction: "manipulation" }}>
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
      {/* secondary modules share a responsive grid — no lone full-width bands, and auto-fit
         redistributes when a module is missing (long-tail artists lack some) — Fuad 2026-07-09 */}
      <div className="m-stack av-row2" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: "var(--gap)", alignItems: "start", marginBottom: "var(--gap)" }}>
      {spark && spark.some(v => v > 0) && (
        <div className="r-card" style={{ padding: 18 }}>
          <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", letterSpacing: ".14em", textTransform: "uppercase", marginBottom: 12 }}>Plays by year</div>
          <Spark data={spark} w={620} h={70} run={true} stroke="var(--accent)" fill="var(--accent-bg)" />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)" }}>{years[0]}</span>
            <span className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)" }}>{years[years.length - 1]}</span>
          </div>
        </div>
      )}
      {dna && (
        <div className="r-card" style={{ padding: 18 }}>
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
      <ArtistFlow id={a.id} hue={a.hue} go={go} />
      </div>
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
function SoundSimilar({ id, go, ctl }) {
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
  // count + tune-panel toggle can be lifted to the parent (Artist page renders them inline with the
  // last.fm/by-sound switch); fall back to internal state when uncontrolled (Fuad 2026-07-07)
  const [countI, setCountI] = React.useState(8);
  const [openI, setOpenI] = React.useState(false);
  const count = ctl ? ctl.count : countI, setCount = ctl ? ctl.setCount : setCountI;
  const open = ctl ? ctl.open : openI, setOpen = ctl ? ctl.setOpen : setOpenI;

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
      {!ctl && <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <div className="r-seg r-seg-sm">{[8, 16, 24].map(n => <button key={n} data-on={count === n} onClick={() => setCount(n)}>{n}</button>)}</div>
        <button onClick={() => setOpen(o => !o)} className="r-mono" style={{ fontSize: 10, padding: "4px 10px", borderRadius: 999, border: "1px solid var(--rule)", background: open ? "var(--bg-3)" : "transparent", color: "var(--ink-soft)", cursor: "pointer" }}>tune {open ? "▴" : "▾"}</button>
      </div>}
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
// "liked on Spotify" ♥ + per-track engagement bar — same track-row treatment as the 🎤 marker.
// Both read committed, PII-free data (window.ROTATION_LIKED, window.ROTATION_ENGAGE) keyed by
// artist~track slug. Engagement = [plays, skipPct]; the bar fills with the "listened through" share.
const likedKey = (key) => !!(window.ROTATION_LIKED && window.ROTATION_LIKED[key]);
const LikedMark = ({ on }) => on
  ? <span className="r-likemark" title="You liked this on Spotify">♥</span>
  : null;
const engOf = (key) => (window.ROTATION_ENGAGE || {})[key] || null;
const EngBar = ({ eng }) => {
  if (!eng) return null;
  const [plays, skipPct] = eng, keep = Math.max(0, 100 - skipPct);
  return <span className="r-engbar" title={`Spotify · ${plays} plays · ${keep}% listened through · ${skipPct}% skipped`}>
    <span className="r-engbar-fill" style={{ width: keep + "%" }} /></span>;
};

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

// ─────────────────────────────────────────────────────────────────
//  Former-members block for "The lineup" — faint rule + collapse past 10
// ─────────────────────────────────────────────────────────────────
function LineupFormer({ former, Row }) {
  const [open, setOpen] = React.useState(false);
  const LIMIT = 10;
  const shown = open ? former : former.slice(0, LIMIT);
  const extra = former.length - LIMIT;
  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--rule)" }}>
      <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 8 }}>formerly</div>
      <div style={{ display: "grid", gap: 1 }}>{shown.map(Row)}</div>
      {extra > 0 && (
        <button className="av-more" style={{ marginTop: 8 }} onClick={() => setOpen(o => !o)}>
          {open ? "show less ▴" : `+${extra} more ▾`}
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  Lineup card — MusicBrainz per-artist distill, collapsed by default.
//  Shows header + aka + a one-line summary; tapping unravels full rows.
// ─────────────────────────────────────────────────────────────────
function LineupCard({ mb }) {
  const glyph = (g) => g === "F" ? "♀" : g === "M" ? "♂" : "";
  const years = mb.from ? (mb.to ? mb.from + "–" + mb.to : mb.from + " →") : "";
  const headBits = [mb.type, mb.area, years].filter(Boolean);
  const aka = mb.aka || [];
  const isPerson = mb.type === "Person";
  const members = (!isPerson && mb.members) ? mb.members : [];
  const current = members.filter(m => !m.t);
  const former = members.filter(m => m.t);
  const tenure = (m) => m.f ? (m.t ? m.f + "–" + m.t : m.f + " →") : (m.t ? "–" + m.t : "");
  const Row = (m, i) => (
    <div key={m.n + i} style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap", padding: "3px 0" }}>
      <span style={{ fontSize: 13, color: "var(--ink)" }}>{m.n}</span>
      {glyph(m.g) && <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>{glyph(m.g)}</span>}
      {(m.i || []).length > 0 && (
        <span style={{ display: "inline-flex", gap: 5, flexWrap: "wrap" }}>
          {m.i.slice(0, 4).map((r, ri) => (
            <span key={r + ri} className="r-mono" style={{ fontSize: 9, color: "var(--ink-soft)", padding: "1px 6px", borderRadius: 999, border: "1px solid var(--rule)" }}>{r}</span>
          ))}
        </span>
      )}
      {tenure(m) && <span className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", marginLeft: "auto" }}>{tenure(m)}</span>}
    </div>
  );
  // Instrument normalisation for the summary line.
  // "lead vocals" / "background vocals" → "vocals"; "drums (drum set)" / "drum kit" → "drums".
  // Deduped, first-seen order, up to 4 labels.
  const normInstr = (raw) => {
    const s = raw.toLowerCase().trim();
    if (s.includes("vocal")) return "vocals";
    if (s.includes("drum")) return "drums";
    return raw;
  };
  const instrSummary = (() => {
    const seen = [], seenSet = new Set();
    for (const m of current) {
      for (const instr of (m.i || [])) {
        const n = normInstr(instr);
        if (!seenSet.has(n)) { seenSet.add(n); seen.push(n); }
        if (seen.length >= 4) break;
      }
      if (seen.length >= 4) break;
    }
    return seen;
  })();
  const [open, setOpen] = React.useState(false);
  return (
    <div className="r-card av-lineupcard" style={{ padding: 18 }}>
      <div className="r-card-h" style={{ padding: 0, marginBottom: 10 }}>
        <span className="lbl">The <b>lineup</b></span>
        <span className="meta">musicbrainz</span></div>
      {headBits.length > 0 && (
        <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: aka.length ? 6 : 10 }}>
          {headBits.map((b, i) => <React.Fragment key={i}>{i > 0 && <span style={{ color: "var(--ink-faint)" }}> · </span>}{b}</React.Fragment>)}
        </div>
      )}
      {aka.length > 0 && (
        <div style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 10 }}>
          also known as: <span style={{ color: "var(--ink-soft)" }}>{aka.slice(0, 4).join(", ")}</span>
        </div>
      )}
      {!open && members.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", cursor: "pointer" }}
          onClick={() => setOpen(true)}>
          <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>
            <b style={{ color: "var(--ink)" }}>{current.length}</b>{" member"}{current.length !== 1 ? "s" : ""}
            {instrSummary.length > 0 && (
              <span style={{ color: "var(--ink-faint)" }}>{" — "}{instrSummary.join(" · ")}</span>
            )}
          </span>
          <span className="av-more" style={{ pointerEvents: "none" }}>{"▾ full lineup"}</span>
        </div>
      )}
      {open && (
        <React.Fragment>
          {current.length > 0 && <div style={{ display: "grid", gap: 1 }}>{current.map(Row)}</div>}
          {former.length > 0 && <LineupFormer former={former} Row={Row} />}
          <button className="av-more" style={{ marginTop: 10 }} onClick={() => setOpen(false)}>{"▴ collapse"}</button>
        </React.Fragment>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  Per-artist barcode strip — active-day hairlines from artist-days.js
// ─────────────────────────────────────────────────────────────────
function ArtistBarcode({ artistId, daysReady }) {
  const AD = window.ROTATION_ARTIST_DAYS;
  // decode base36 delta encoding → array of integer day-offsets from global start
  const offsets = React.useMemo(() => {
    if (!AD || !AD.days || !AD.days[artistId]) return null;
    const tokens = AD.days[artistId].split(",");
    const result = [];
    let running = 0;
    for (let i = 0; i < tokens.length; i++) {
      running += parseInt(tokens[i], 36);
      result.push(running);
    }
    return result;
  }, [artistId, daysReady]);

  if (!offsets || offsets.length === 0) return null;

  const startMs = new Date(AD.start).getTime();
  const nowMs = Date.now();
  const totalDays = Math.max(1, Math.round((nowMs - startMs) / 86400000));
  const W = 1000, H = 28;
  const firstOffset = offsets[0];
  const lastOffset = offsets[offsets.length - 1];
  const firstYear = new Date(startMs + firstOffset * 86400000).getFullYear();
  const lastYear = new Date(startMs + lastOffset * 86400000).getFullYear();

  const lines = offsets.map(off => {
    const x = ((off / totalDays) * W).toFixed(2);
    const isoDate = new Date(startMs + off * 86400000).toISOString().slice(0, 10);
    return (
      <line key={off} x1={x} x2={x} y1="0" y2={H}
        stroke="oklch(0.44 0.10 300)" strokeWidth="0.8" opacity="0.8">
        <title>{isoDate}</title>
      </line>
    );
  });

  // width:100% of the (now fit-content) stat column — no fixed 560 cap, so the barcode
  // hugs the plays→listeners stat row's width (Fuad 2026-07-12).
  return (
    <div style={{ marginBottom: 10, width: "100%", minWidth: 280 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}
        style={{ display: "block", imageRendering: "crispEdges" }}
        preserveAspectRatio="none">
        {lines}
      </svg>
      <div className="r-mono" style={{ fontSize: 8.5, color: "var(--ink-faint)", letterSpacing: ".08em", textAlign: "right", marginTop: 3 }}>
        every active day · {firstYear}→{lastYear}
      </div>
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
  const [compsOpen, setCompsOpen] = React.useState(false);  // comps/live/OSTs section — collapsed by default
  // by-sound depth (8/16/24) + tune-panel toggle lifted here so they sit inline with the
  // last.fm/by-sound switch in the header (Fuad 2026-07-07)
  const [soundCount, setSoundCount] = React.useState(8);
  const [soundOpen, setSoundOpen] = React.useState(false);
  // 30-s preview hashes for the header "needle drop" (plays the artist's most-played playable song)
  const [prevReady, setPrevReady] = React.useState(!!window.ROTATION_PREVIEWS);
  React.useEffect(() => {
    if (window.ROTATION_PREVIEWS) { setPrevReady(true); return; }
    const s = document.createElement("script"); s.src = "track-previews.js"; s.onload = () => setPrevReady(true); document.head.appendChild(s);
  }, []);
  // flowmap album selection (drill lifted OUT of ArtistFlow) scopes Top tracks + Sound DNA
  // to that album (Fuad, 2026-07-07). selAlbum = the flow album object {name, tracks:[{name,vals}]}.
  const [flowDrill, setFlowDrill] = React.useState(null);
  const [selAlbum, setSelAlbum] = React.useState(null);
  React.useEffect(() => { setFlowDrill(null); setSelAlbum(null); }, [id]);
  const clearAlbumSel = () => { setFlowDrill(null); setSelAlbum(null); };
  // per-track audio features load lazily the first time an album is drilled
  const [taReady, setTaReady] = React.useState(!!window.ROTATION_TRACKAUDIO);
  React.useEffect(() => {
    if (!selAlbum || window.ROTATION_TRACKAUDIO) { if (window.ROTATION_TRACKAUDIO) setTaReady(true); return; }
    const s = document.createElement("script"); s.src = "track-audio.js"; s.onload = () => setTaReady(true); document.head.appendChild(s);
  }, [selAlbum]);
  // album DNA = mean of the drilled album's per-track features (0–100 → radar's 0–1).
  // Kept ABOVE the early returns like every other hook here (hook order must stay stable).
  const albumDna = React.useMemo(() => {
    if (!selAlbum || !taReady || !window.ROTATION_TRACKAUDIO) return null;
    const TA = window.ROTATION_TRACKAUDIO, vs = [];
    for (const tr of (selAlbum.tracks || [])) {
      const f = TA[R.slug(a.name) + "~" + R.slug(tr.name)];
      if (f && f.length >= 10) vs.push([f[4], f[5], f[6], f[7], f[8], f[9]]);
    }
    if (!vs.length) return null;
    const m = [0, 0, 0, 0, 0, 0];
    for (const v of vs) for (let k = 0; k < 6; k++) m[k] += v[k];
    return { vec: m.map(x => x / vs.length / 100), n: vs.length, of: (selAlbum.tracks || []).length };
  }, [selAlbum, taReady, a.id]);
  // artist-days.js — lazy-loaded once; presence-only day offsets for the barcode strip
  const [daysReady, setDaysReady] = React.useState(!!window.ROTATION_ARTIST_DAYS);
  React.useEffect(() => {
    if (window.ROTATION_ARTIST_DAYS) { setDaysReady(true); return; }
    let s = document.getElementById("artist-days-js");
    if (!s) { s = document.createElement("script"); s.id = "artist-days-js"; s.src = "artist-days.js"; s.onerror = () => {}; document.head.appendChild(s); }
    const onLoad = () => { if (window.ROTATION_ARTIST_DAYS) setDaysReady(true); };
    s.addEventListener("load", onLoad);
    return () => s.removeEventListener("load", onLoad);
  }, []);
  // mb-lineup.js — lazy-loaded once on ArtistView mount (mirrors artist-days.js): MusicBrainz
  // lineup distill, powers "The lineup" card. Presence-gated — no entry → no card.
  const [mbReady, setMbReady] = React.useState(!!window.ROTATION_MB);
  React.useEffect(() => {
    if (window.ROTATION_MB) { setMbReady(true); return; }
    let s = document.getElementById("mb-lineup-js");
    if (!s) { s = document.createElement("script"); s.id = "mb-lineup-js"; s.src = "mb-lineup.js"; s.onerror = () => {}; document.head.appendChild(s); }
    const onLoad = () => { if (window.ROTATION_MB) setMbReady(true); };
    s.addEventListener("load", onLoad);
    return () => s.removeEventListener("load", onLoad);
  }, []);
  // mb-artist-x.js — PILOT MB extras (label eras + producer/mix credits), same lazy pattern.
  const [mbxReady, setMbxReady] = React.useState(!!window.ROTATION_MBX);
  React.useEffect(() => {
    if (window.ROTATION_MBX) { setMbxReady(true); return; }
    let s = document.getElementById("mb-artist-x-js");
    if (!s) { s = document.createElement("script"); s.id = "mb-artist-x-js"; s.src = "mb-artist-x.js"; s.onerror = () => {}; document.head.appendChild(s); }
    const onLoad = () => { if (window.ROTATION_MBX) setMbxReady(true); };
    s.addEventListener("load", onLoad);
    return () => s.removeEventListener("load", onLoad);
  }, []);
  // Instrument taxonomy strip — a compact "{N}-piece · {glyphs}" line derived from the
  // MusicBrainz CURRENT lineup (t === ""), shown up near the header. Solo artists (type
  // Person) and groups with no member data are skipped. Each member contributes up to 2
  // glyphs when their instruments span groups; the sequence caps at 8 (+"…"). Kept ABOVE the
  // early returns so hook order stays stable across navigations. (Fuad 2026-07-12)
  const instrStrip = React.useMemo(() => {
    const mb = mbReady && window.ROTATION_MB && window.ROTATION_MB[a.id];
    if (!mb || mb.type === "Person" || !Array.isArray(mb.members)) return null;
    const current = mb.members.filter(m => !m.t);
    if (current.length === 0) return null;
    // group key → glyph. bass uses the guitar glyph with a "b" superscript so it reads apart
    // from a lead guitar (owner's-call: keep it readable, not a new emoji).
    const glyphOf = (key) => key === "bass"
      ? <span>🎸<sup style={{ fontSize: 7, verticalAlign: "super" }}>b</sup></span>
      : ({ vocals: "🎤", guitar: "🎸", drums: "🥁", keys: "🎹", electronics: "🎛️", strings: "🎻", brass: "🎺", wind: "🪈" })[key];
    // classify one instrument name into a group key (order matters — bass before guitar).
    const classify = (raw) => {
      const s = raw.toLowerCase();
      if (/vocal|sing|voice/.test(s)) return "vocals";
      if (/bass/.test(s)) return "bass";
      if (/guitar/.test(s)) return "guitar";
      if (/drum|percussion/.test(s)) return "drums";
      if (/key|piano|synth|organ|mellotron/.test(s)) return "keys";
      if (/program|electron|turntable|sampler|sequenc|machine/.test(s)) return "electronics";
      if (/violin|viola|cello|string/.test(s)) return "strings";
      if (/sax|trumpet|brass|horn|trombone/.test(s)) return "brass";
      if (/flute|wind|clarinet|oboe|recorder/.test(s)) return "wind";
      return null;   // other/unknown → skip
    };
    const LABELS = { vocals: "vocals", bass: "bass", guitar: "guitar", drums: "drums", keys: "keys", electronics: "electronics", strings: "strings", brass: "brass", wind: "wind" };
    const seq = [];        // ordered group keys, one entry per glyph rendered
    const counts = {};     // group key → count, for the tooltip expansion
    for (const m of current) {
      const groups = [];   // distinct groups THIS member contributes (cap 2)
      for (const instr of (m.i || [])) {
        const k = classify(instr);
        if (k && !groups.includes(k)) groups.push(k);
        if (groups.length >= 2) break;
      }
      for (const k of groups) { seq.push(k); counts[k] = (counts[k] || 0) + 1; }
    }
    if (seq.length === 0) return null;
    const overflow = seq.length > 8;
    const shown = overflow ? seq.slice(0, 8) : seq;
    // tooltip: "2x vocals · 2x guitar · bass · drums", in the ORDER groups first appear
    const order = []; seq.forEach(k => { if (!order.includes(k)) order.push(k); });
    const tip = order.map(k => (counts[k] > 1 ? counts[k] + "x " : "") + LABELS[k]).join(" · ");
    return { n: current.length, glyphs: shown.map(glyphOf), overflow, tip };
  }, [a.id, mbReady]);
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
  const allAlbums = a.topAlbums || [];
  // sectioned album taxonomy (build-data tags each entry with kind ∈ single/ep/album/comp/live/ost;
  // kind=single may carry `on` = the canonical slug of the host album it appears on).
  const albums = allAlbums.filter(al => !al.kind || al.kind === "album");     // LPs (+ anything unknown)
  const epsSingles = allAlbums.filter(al => al.kind === "ep" || al.kind === "single");
  const comps = allAlbums.filter(al => al.kind === "comp" || al.kind === "live" || al.kind === "ost");
  const goAlbum = (title) => go("album", R.slug(a.name) + "~" + R.slug(title));
  const tracks = a.topTracks || [];
  // album-scoped views (active while an album is drilled in the flow):
  // tracks from the flow's per-album series; DNA = mean of per-track features (0–100 → 0–1)
  const albTracks = selAlbum
    ? (selAlbum.tracks || []).map(t => ({ title: t.name, plays: (t.vals || []).reduce((s, v) => s + v, 0) }))
        .sort((x, y) => y.plays - x.plays)
    : null;
  const shownTracks = albTracks || tracks;
  // "needle drop" for the artist: the most-played track that actually has a playable preview
  // (fall through to the next if the top one has no hash). prevReady re-renders on load.
  const needleKey = (() => {
    const P = window.ROTATION_PREVIEWS; if (!P || !tracks.length) return null;
    for (const tr of tracks.slice().sort((x, y) => y.plays - x.plays)) {
      const k = R.slug(a.name) + "~" + R.slug(tr.title); if (P[k]) return k;
    }
    return null;
  })();
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
          <div style={{ display: "flex", gap: 8, marginTop: 13, flexWrap: "wrap", alignItems: "center" }}>
            {needleKey && <ShNeedle trackKey={needleKey} hue={a.hue} />}
            <a className="r-extlink r-extlink-lf" href={`https://www.last.fm/music/${encodeURIComponent(a.name)}`} target="_blank" rel="noopener noreferrer">last.fm ↗</a>
            <a className="r-extlink r-extlink-sp" href={`https://open.spotify.com/search/${encodeURIComponent(a.name)}`} target="_blank" rel="noopener noreferrer">Spotify ↗</a>
          </div>
        </div>
        {/* stat column hugs the stat ROW's intrinsic width (fit-content) instead of a fixed
           560px, so the barcode squeezes down to just the plays→listeners block. Still
           right-stuck via marginLeft:auto; min-width floor keeps it from collapsing on
           narrow artists (Fuad 2026-07-12). */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0, alignSelf: "flex-end", marginLeft: "auto", width: "fit-content", maxWidth: "100%", minWidth: 280 }}>
          {/* instrument strip rides ABOVE the barcode (Fuad 2026-07-12), right-aligned with it */}
          {instrStrip && (
            <div title={instrStrip.tip} style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end",
              marginBottom: 8, cursor: "default" }}>
              <span className="r-mono" style={{ fontSize: 10.5, color: "var(--ink-soft)", letterSpacing: ".02em" }}>{instrStrip.n}-piece</span>
              <span style={{ color: "var(--ink-faint)" }}>·</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 14, lineHeight: 1 }}>
                {instrStrip.glyphs.map((g, i) => <span key={i}>{g}</span>)}
                {instrStrip.overflow && <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>…</span>}
              </span>
            </div>
          )}
          {/* width:0 + minWidth:100% — the barcode contributes NOTHING to the column's intrinsic
             width, so the column sizes to the STAT ROW alone and the barcode then fills exactly
             that width (the "hug the plays→listeners block" ask, done right this time). */}
          <div style={{ width: 0, minWidth: "100%" }}>
            <ArtistBarcode artistId={a.id} daysReady={daysReady} />
          </div>
          <div style={{ display: "flex", gap: 26, justifyContent: "flex-end" }}>
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
      </div>

      {/* bio — full-width; Sound DNA moved down into the tracks/albums row (Fuad, 2026-07-05) */}
      {a.bio && a.bio.length > 40 && (
        <div className="r-card" style={{ padding: "18px 22px", marginBottom: "var(--gap)" }}>
          <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", letterSpacing: ".14em", textTransform: "uppercase", marginBottom: 10 }}>About</div>
          <p style={{ fontFamily: "var(--serif)", fontSize: 15.5, lineHeight: 1.55, color: "var(--ink-soft)", margin: 0 }}>
            {a.bio.length > 620 ? a.bio.slice(0, 620).replace(/\s+\S*$/, "") + "…" : a.bio}
          </p>
          {/* attribution — last.fm's API terms ask that wiki/bio text credit + link back to them */}
          <a href={`https://www.last.fm/music/${encodeURIComponent(a.name)}/+wiki`} target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-block", marginTop: 10, fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ink-faint)", textDecoration: "none" }}>
            via last.fm ↗
          </a>
        </div>
      )}

      <div style={{ display: "grid", gap: "var(--gap)" }}>
          {/* row 2 on PC: flow (wide — Sound DNA moved to the bottom row for breathing room,
             Fuad 2026-07-06) · top tracks · albums */}
          <div className="m-stack av-row2" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: "var(--gap)", alignItems: "start" }}>
            {/* top tracks · how they played out (flow now in the MIDDLE — Fuad 2026-07-06) · albums.
               alignItems:stretch (was start) so the three modules share the tallest sibling's
               height instead of the releases card ballooning — matters at the owner's 200-250%
               laptop zoom, where the covers grid reflows tall (Fuad 2026-07-12). */}
            <div className="r-card" style={{ padding: 18 }}>
              <div className="r-card-h" style={{ padding: 0, marginBottom: 12 }}>
                <span className="lbl"><b>Top tracks</b>{selAlbum && (
                  <span className="r-mono" style={{ fontSize: 9.5, color: `oklch(0.66 0.14 ${a.hue})`, marginLeft: 8 }}>
                    · {selAlbum.name}
                    <button onClick={clearAlbumSel} title="back to all tracks"
                      style={{ marginLeft: 6, border: "none", background: "none", color: "var(--ink-faint)", cursor: "pointer", fontSize: 10, padding: 0 }}>✕</button>
                  </span>
                )}</span>
                <span className="meta">{shownTracks.length} listed</span></div>
              {(shownTracks.length ? shownTracks : [{ title: "—", plays: 0 }]).map((tr, i) => {
                const clickable = !!tr.plays;
                return (
                <div key={tr.title + i} className={clickable ? "r-track-row" : undefined} onClick={clickable ? () => go("track", R.slug(a.name) + "~" + R.slug(tr.title)) : undefined} title={clickable ? `${tr.title} →` : undefined}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0",
                  cursor: clickable ? "pointer" : "default",
                  borderBottom: i < shownTracks.length - 1 ? "1px solid var(--rule)" : "none" }}>
                  <span className="r-mono" style={{ fontSize: 10, color: "var(--ink-faint)", width: 18 }}>{String(i + 1).padStart(2, "0")}</span>
                  <span style={{ fontSize: 13, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tr.title}</span>
                  <LikedMark on={likedKey(R.slug(a.name) + "~" + R.slug(tr.title))} />
                  <EngBar eng={engOf(R.slug(a.name) + "~" + R.slug(tr.title))} />
                  <LiveMark on={clickable && seenLiveKey(R.slug(a.name) + "~" + R.slug(tr.title))} />
                  <span className="r-mono" style={{ fontSize: 10, color: "var(--ink-soft)" }}>{tr.plays ? fmt(tr.plays) : "—"}</span>
                </div>
              );})}
            </div>
            {/* how they played out — flow, in the middle; drill is lifted so the album
                selection scopes Top tracks + Sound DNA too */}
            <ArtistFlow id={a.id} hue={a.hue} go={go} drill={flowDrill} setDrill={setFlowDrill} onAlbum={setSelAlbum} />
            {/* releases — sectioned taxonomy: Albums (covers/list), EPs & singles (spine rows),
                Comps/live/OSTs (collapsed). Each section renders only when non-empty. */}
            {/* releases card — flex column so its body scrolls INSIDE a bounded height rather
               than the whole card dictating the row's height at high zoom. maxHeight is a soft
               cap; short release lists still shrink to fit (Fuad 2026-07-12). */}
            {/* modest fixed cap + internal scroll — "roughly match the row, don't blow it out" */}
            <div className="r-card" style={{ padding: 18, display: "flex", flexDirection: "column", maxHeight: 620 }}>
              <div style={{ overflowY: "auto", minHeight: 0, marginRight: -4, paddingRight: 4 }}>
              {albums.length > 0 && <React.Fragment>
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
                <div className="av-albumcovers" style={{
                  display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))", gap: 10 }}>
                  {albums.map((al, i) => (
                    <div key={al.title + i} style={{ cursor: "pointer", minWidth: 0 }} onClick={() => goAlbum(al.title)} title={`${al.title} →`}>
                      <GenCover hue={a.hue} name={al.title} image={al.cover} thumb={al.cover} size={"100%"} style={{ aspectRatio: "1", width: "100%", height: "auto" }} radius={3} />
                      <div style={{ fontSize: 10, marginTop: 5, lineHeight: 1.2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{al.title}</div>
                      <div className="r-mono" style={{ fontSize: 8.5, color: "var(--ink-faint)" }}>{fmt(al.plays)} plays</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: "grid", gap: 2 }}>
                  {albums.map((al, i) => (
                    <div key={al.title + i} className="r-track-row" onClick={() => goAlbum(al.title)} title={`${al.title} →`}
                      style={{ display: "flex", alignItems: "center", gap: 9, padding: "5px 4px", cursor: "pointer", borderRadius: 4 }}>
                      <GenCover hue={a.hue} name={al.title} image={al.cover} thumb={al.cover} size={30} radius={2} />
                      <span style={{ flex: 1, minWidth: 0, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{al.title}</span>
                      <span className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)" }}>{fmt(al.plays)}</span>
                    </div>
                  ))}
                </div>
              )}
              </React.Fragment>}

              {/* EPs & singles — same covers/list toggle as Albums; singles with `on` show host album. */}
              {epsSingles.length > 0 && (() => {
                const titleForSlug = (s) => { const hit = allAlbums.find(al => R.slug(al.title) === s); return hit ? hit.title : null; };
                return (
                <div style={{ marginTop: albums.length ? 16 : 0 }}>
                  <div className="r-card-h" style={{ padding: 0, marginBottom: 8 }}>
                    <span className="lbl"><b>EPs & singles</b></span><span className="meta">{epsSingles.length}</span></div>
                  {albMode === "covers" ? (
                    <div className="av-albumcovers" style={{
                      display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))", gap: 10 }}>
                      {epsSingles.map((al, i) => {
                        const onTitle = al.on ? titleForSlug(al.on) : null;
                        const nav = al.on ? () => go("album", R.slug(a.name) + "~" + al.on) : () => goAlbum(al.title);
                        return (
                          <div key={al.title + i} style={{ cursor: "pointer", minWidth: 0 }} onClick={nav}
                            title={onTitle ? `${onTitle} →` : `${al.title} →`}>
                            <GenCover hue={a.hue} name={al.title} image={al.cover} thumb={al.cover} size={"100%"} style={{ aspectRatio: "1", width: "100%", height: "auto" }} radius={3} />
                            <div style={{ fontSize: 10, marginTop: 5, lineHeight: 1.2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{al.title}</div>
                            <div className="r-mono" style={{ fontSize: 8.5, color: "var(--ink-faint)" }}>
                              <span style={{ textTransform: "uppercase", letterSpacing: ".05em" }}>{al.kind}</span>
                              {onTitle && <span style={{ marginLeft: 4 }}>· on {onTitle}</span>}
                            </div>
                            <div className="r-mono" style={{ fontSize: 8.5, color: "var(--ink-faint)" }}>{fmt(al.plays)} plays</div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ display: "grid", gap: 2 }}>
                      {epsSingles.map((al, i) => {
                        const onTitle = al.on ? titleForSlug(al.on) : null;
                        const nav = al.on ? () => go("album", R.slug(a.name) + "~" + al.on) : () => goAlbum(al.title);
                        return (
                          <div key={al.title + i} className="r-track-row" onClick={nav}
                            title={onTitle ? `${onTitle} →` : `${al.title} →`}
                            style={{ display: "flex", alignItems: "center", gap: 9, padding: "5px 4px", cursor: "pointer", borderRadius: 4 }}>
                            <GenCover hue={a.hue} name={al.title} image={al.cover} thumb={al.cover} size={30} radius={2} />
                            <span style={{ flex: 1, minWidth: 0, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {al.title}
                              {onTitle && <span className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", marginLeft: 7 }}>→ appears on {onTitle}</span>}
                            </span>
                            <span className="r-mono" style={{ fontSize: 8, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--ink-faint)" }}>{al.kind}</span>
                            <span className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)" }}>{fmt(al.plays)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );})()}

              {/* Compilations, live & OSTs — same covers/list as above, collapsed behind "+ N more" */}
              {comps.length > 0 && (
                <div style={{ marginTop: (albums.length || epsSingles.length) ? 16 : 0 }}>
                  <div className="r-card-h" style={{ padding: 0, marginBottom: 8 }}>
                    <span className="lbl"><b>Compilations, live & OSTs</b></span>
                    <button className="av-more" onClick={() => setCompsOpen(o => !o)}>{compsOpen ? "hide ▴" : `+ ${comps.length} more`}</button>
                  </div>
                  {compsOpen && (albMode === "covers" ? (
                    <div className="av-albumcovers" style={{
                      display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))", gap: 10 }}>
                      {comps.map((al, i) => (
                        <div key={al.title + i} style={{ cursor: "pointer", minWidth: 0 }} onClick={() => goAlbum(al.title)} title={`${al.title} →`}>
                          <GenCover hue={a.hue} name={al.title} image={al.cover} thumb={al.cover} size={"100%"} style={{ aspectRatio: "1", width: "100%", height: "auto" }} radius={3} />
                          <div style={{ fontSize: 10, marginTop: 5, lineHeight: 1.2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{al.title}</div>
                          <div className="r-mono" style={{ fontSize: 8.5, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: ".05em" }}>{al.kind}</div>
                          <div className="r-mono" style={{ fontSize: 8.5, color: "var(--ink-faint)" }}>{fmt(al.plays)} plays</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ display: "grid", gap: 2 }}>
                      {comps.map((al, i) => (
                        <div key={al.title + i} className="r-track-row" onClick={() => goAlbum(al.title)} title={`${al.title} →`}
                          style={{ display: "flex", alignItems: "center", gap: 9, padding: "5px 4px", cursor: "pointer", borderRadius: 4 }}>
                          <GenCover hue={a.hue} name={al.title} image={al.cover} thumb={al.cover} size={30} radius={2} />
                          <span style={{ flex: 1, minWidth: 0, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{al.title}</span>
                          <span className="r-mono" style={{ fontSize: 8, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--ink-faint)" }}>{al.kind}</span>
                          <span className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)" }}>{fmt(al.plays)}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              </div>
            </div>
          </div>

          {/* bottom row: how-they-played-out + family tree — kept at their ⅓ widths but
             CENTERED in the row rather than stretched across it (Fuad, 2026-07-04) */}
          <div className="m-stack av-endrow" style={{ display: "flex", gap: "var(--gap)", justifyContent: "center", alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* sound DNA — collapsed down from row 2, kept COMPACT (~224px) so it doesn't stretch
              wide; flow + albums breathe in row 2 instead (Fuad, 2026-07-06) */}
          <div className="r-card av-dnacard" style={{ padding: 18 }}>
            <div className="r-card-h" style={{ padding: 0, marginBottom: 8 }}><span className="lbl"><b>Sound DNA</b></span>
              <span className="meta">{albumDna
                ? `${selAlbum.name.length > 22 ? selAlbum.name.slice(0, 21) + "…" : selAlbum.name} · ${albumDna.n}/${albumDna.of} tracks measured`
                : selAlbum ? "no per-track audio for this album" : (a.am ? "measured" : "inferred")}</span></div>
            <div className="av-dna" style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
              <div style={{ flex: "0 0 auto", width: 156, maxWidth: "100%" }}>
                <Radar axes={DNA_AXES} values={albumDna ? albumDna.vec : dna} values2={albumDna ? dna : avg} run={seen} size={156} />
                <div className="r-mono" style={{ fontSize: 8.5, color: "var(--ink-faint)", textAlign: "center", marginTop: 2 }}>
                  {albumDna ? `solid = album · dashed = ${a.name.split(" ")[0]}` : `solid = ${a.name.split(" ")[0]} · dashed = your avg`}</div>
              </div>
              {/* tempo → followers — two-column so the seven measures fit the module height rather
                  than stacking into a tall single strip (Fuad, 2026-07-06) */}
              {af && <div style={{ width: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 12, rowGap: 8 }}>
                {[
                  { k: "tempo", v: Math.round(50 + a.audio.tempo * 140), u: " bpm", f: a.audio.tempo },
                  { k: "key", v: af[6] >= 0.5 ? "major" : "minor", f: af[6] },
                  { k: "loud", v: Math.round(af[9]), u: " dB", f: Math.max(0, Math.min(1, (af[9] + 60) / 60)) },
                  { k: "speech", v: Math.round(af[10] * 100), u: "%", f: af[10] },
                  { k: "live", v: Math.round(af[11] * 100), u: "%", f: af[11] },
                  { k: "pop", v: af[7], u: "/100", f: af[7] / 100 },
                  { k: "followers", v: fmtK(af[8]), f: null },
                ].map(s => (
                  <div key={s.k} style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 6 }}>
                      <span className="r-mono" style={{ fontSize: 8, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--ink-faint)" }}>{s.k}</span>
                      <span style={{ fontSize: 11.5, whiteSpace: "nowrap" }}>{s.v}{s.u && <span style={{ fontSize: 8, color: "var(--ink-faint)" }}>{s.u}</span>}</span>
                    </div>
                    <div style={{ height: 3, background: "var(--bg-3)", borderRadius: 2, marginTop: 3, overflow: "hidden" }}>{s.f != null && <div style={{ height: "100%", width: (s.f * 100) + "%", background: `oklch(0.62 0.15 ${a.hue})` }} />}</div>
                  </div>
                ))}
              </div>}
            </div>
          </div>
          {/* sounds like — swapped down from row 2 */}
          <div className="r-card av-simcard" style={{ padding: 18 }}>
              <div className="r-card-h" style={{ padding: 0, marginBottom: 14 }}>
                <span className="lbl"><b>Sounds like</b></span>
                <span style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {simTab === "lastfm" && a.similar.length > 8 && (
                    <button className="av-more" onClick={() => setSimN(n => n === 8 ? 16 : 8)}>{simN === 8 ? "16 ▾" : "8 ▴"}</button>
                  )}
                  {simTab === "sound" && <React.Fragment>
                    <div className="r-seg r-seg-sm">{[8, 16, 24].map(n => <button key={n} data-on={soundCount === n} onClick={() => setSoundCount(n)}>{n}</button>)}</div>
                    <button onClick={() => setSoundOpen(o => !o)} className="r-mono" style={{ fontSize: 10, padding: "4px 10px", borderRadius: 999, border: "1px solid var(--rule)", background: soundOpen ? "var(--bg-3)" : "transparent", color: "var(--ink-soft)", cursor: "pointer" }}>tune {soundOpen ? "▴" : "▾"}</button>
                  </React.Fragment>}
                  <div className="r-seg r-seg-sm">
                    {[["lastfm", "last.fm"], ["sound", "by sound"]].map(([k, l]) => <button key={k} data-on={simTab === k} onClick={() => setSimTab(k)}>{l}</button>)}
                  </div>
                </span></div>
              {simTab === "sound" ? <SoundSimilar id={a.id} go={go} ctl={{ count: soundCount, setCount: setSoundCount, open: soundOpen, setOpen: setSoundOpen }} /> : (() => {
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

          {/* family tree — members + shared-member lineage (MusicBrainz + Discogs + Wikidata)
              PLUS the MB lineup roster (injected here; the standalone LineupCard is removed).
              Renders when tree data OR MB data is present. */}
          {((a.members && a.members.length > 0) || (a.wd && a.wd.lineup) || (a.connections && a.connections.length > 0) || (mbReady && window.ROTATION_MB && window.ROTATION_MB[a.id])) && (() => {
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

            // MB lineup section — mirrors LineupCard internals, rendered inside this card
            const mb = mbReady && window.ROTATION_MB && window.ROTATION_MB[a.id];
            const mbYears = mb ? (mb.from ? (mb.to ? mb.from + "-" + mb.to : mb.from + " ->") : "") : "";
            const mbHeadBits = mb ? [mb.type, mb.area, mbYears].filter(Boolean) : [];
            const mbAka = (mb && mb.aka) || [];
            const isPerson = mb && mb.type === "Person";
            const mbMembers = (mb && !isPerson && mb.members) ? mb.members : [];
            const mbCurrent = mbMembers.filter(m => !m.t);
            const mbFormer = mbMembers.filter(m => m.t);
            const tenure = (m) => m.f ? (m.t ? m.f + "-" + m.t : m.f + " ->") : (m.t ? "-" + m.t : "");
            const normInstr = (raw) => { const s = raw.toLowerCase().trim(); if (s.includes("vocal")) return "vocals"; if (s.includes("drum")) return "drums"; return raw; };
            const instrSummary = (() => {
              const seen = [], seenSet = new Set();
              for (const m of mbCurrent) {
                for (const instr of (m.i || [])) {
                  const n = normInstr(instr);
                  if (!seenSet.has(n)) { seenSet.add(n); seen.push(n); }
                  if (seen.length >= 4) break;
                }
                if (seen.length >= 4) break;
              }
              return seen;
            })();
            const MbRow = (m, i) => {
              const gg = genderGlyph(m.g === "F" ? "f" : m.g === "M" ? "m" : (m.g || ""));
              return (
                <div key={m.n + i} style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap", padding: "3px 0" }}>
                  <span style={{ fontSize: 13, color: "var(--ink)" }}>{m.n}</span>
                  {gg && <span title={gg.label} style={{ fontSize: 11, color: "var(--ink-faint)" }}>{gg.ch}</span>}
                  {(m.i || []).length > 0 && (
                    <span style={{ display: "inline-flex", gap: 5, flexWrap: "wrap" }}>
                      {m.i.slice(0, 4).map((r, ri) => (
                        <span key={r + ri} className="r-mono" style={{ fontSize: 9, color: "var(--ink-soft)", padding: "1px 6px", borderRadius: 999, border: "1px solid var(--rule)" }}>{r}</span>
                      ))}
                    </span>
                  )}
                  {tenure(m) && <span className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", marginLeft: "auto" }}>{tenure(m)}</span>}
                </div>
              );
            };

            // lineup open/close state — stored in the IIFE via a ref trick: React.useState
            // can't be called inside an IIFE, so we lift it to a small inner component.
            const LineupRoster = () => {
              const [open, setOpen] = React.useState(false);
              return (
                <React.Fragment>
                  {!open && mbMembers.length > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", cursor: "pointer" }}
                      onClick={() => setOpen(true)}>
                      <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                        <b style={{ color: "var(--ink)" }}>{mbCurrent.length}</b>{" member"}{mbCurrent.length !== 1 ? "s" : ""}
                        {instrSummary.length > 0 && (
                          <span style={{ color: "var(--ink-faint)" }}>{" — "}{instrSummary.join(" · ")}</span>
                        )}
                      </span>
                      <span className="av-more" style={{ pointerEvents: "none" }}>{"▾ full lineup"}</span>
                    </div>
                  )}
                  {open && (
                    <React.Fragment>
                      {mbCurrent.length > 0 && <div style={{ display: "grid", gap: 1 }}>{mbCurrent.map(MbRow)}</div>}
                      {mbFormer.length > 0 && <LineupFormer former={mbFormer} Row={MbRow} />}
                      <button className="av-more" style={{ marginTop: 10 }} onClick={() => setOpen(false)}>{"▴ collapse"}</button>
                    </React.Fragment>
                  )}
                </React.Fragment>
              );
            };

            const hasMb = !!mb;
            // what actually renders ABOVE the MB block, so the MB border-top divider only
            // draws when there's content over it (the flat member row + Formed line are now
            // hidden in the MB case — don't count them then). (Fuad 2026-07-12)
            const showFlatMembers = roster.length > 0 && mbMembers.length === 0;
            const showFormed = (wCity || wInc) && !(mb && mbHeadBits.length > 0);
            const hasTreeData = showFlatMembers || (a.connections && a.connections.length > 0) || showFormed;

            return (
            <div className={`r-card av-famcard${famWide ? " wide" : ""}`} style={{ padding: 18 }}>
              <div className="r-card-h" style={{ padding: 0, marginBottom: 14 }}>
                <span className="lbl"><b>Family tree</b></span>
                <span className="meta">musicbrainz · discogs{a.wd ? " · wikidata" : ""}</span></div>
              {/* "Formed in {city}" — dropped when the MB header line (type · area · years)
                 is present, since that's the preferred header and its area/years overlap
                 this line's inception/dissolved (Fuad 2026-07-12). */}
              {(wCity || wInc) && !(mb && mbHeadBits.length > 0) && (
                <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 14 }}>
                  Formed{wCity ? <> in <b style={{ color: "var(--ink)" }}>{wCity}</b></> : null}
                  {wInc ? <>, <span className="r-mono">{wInc}{wDis ? `-${wDis}` : ""}</span></> : null}
                  {wDis ? <span style={{ color: "var(--ink-faint)" }}> · disbanded</span> : null}
                </div>
              )}
              {/* legacy flat member chip-row — only a FALLBACK now; when the MB roster below
                 exists it renders the same names (with tenure/instruments), so we drop this
                 duplicate and keep MB as the source of truth (Fuad 2026-07-12). */}
              {roster.length > 0 && mbMembers.length === 0 && (
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
                <div style={{ marginBottom: hasMb ? 18 : 0 }}>
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
              {hasMb && (
                <div style={{ borderTop: hasTreeData ? "1px solid var(--rule)" : "none", paddingTop: hasTreeData ? 14 : 0 }}>
                  {mbHeadBits.length > 0 && (
                    <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: mbAka.length ? 6 : 10 }}>
                      {mbHeadBits.map((b, i) => <React.Fragment key={i}>{i > 0 && <span style={{ color: "var(--ink-faint)" }}> · </span>}{b}</React.Fragment>)}
                    </div>
                  )}
                  {mbAka.length > 0 && (
                    <div style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 10 }}>
                      also known as: <span style={{ color: "var(--ink-soft)" }}>{mbAka.slice(0, 4).join(", ")}</span>
                    </div>
                  )}
                  {mbMembers.length > 0 && <LineupRoster />}
                </div>
              )}
            </div>
            );
          })()}
          </div>

          {/* PILOT: the paper trail — label eras + studio hands from the MB B/C/D harvest */}
          {(() => {
            const x = mbxReady && window.ROTATION_MBX && window.ROTATION_MBX[a.id];
            if (!x || (!(x.labels || []).length && !(x.prod || []).length)) return null;
            const era = ([n, from, to, cnt]) => from ? `${n} ${from}${to !== from ? "–" + to : ""}` : n;
            return (
              <div className="r-card" style={{ padding: 18 }}>
                <div className="r-card-h" style={{ padding: 0, marginBottom: 10 }}>
                  <span className="lbl">The paper trail</span><span className="meta">via MusicBrainz · pilot</span></div>
                <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
                  {(x.labels || []).length > 0 && (
                    <div><span className="r-mono" style={{ fontSize: 10, color: "var(--ink-faint)", marginRight: 8, letterSpacing: ".06em" }}>LABELS</span>
                      {x.labels.map(era).join(" · ")}</div>
                  )}
                  {(x.prod || []).length > 0 && (
                    <div><span className="r-mono" style={{ fontSize: 10, color: "var(--ink-faint)", marginRight: 8, letterSpacing: ".06em" }}>PRODUCED BY</span>
                      {x.prod.map(([n, c]) => c > 1 ? `${n} (${c})` : n).join(" · ")}
                      <span className="r-mono" style={{ fontSize: 10, color: "var(--ink-faint)", marginLeft: 8 }}>across your top tracks</span></div>
                  )}
                  {(x.mix || []).length > 0 && (
                    <div><span className="r-mono" style={{ fontSize: 10, color: "var(--ink-faint)", marginRight: 8, letterSpacing: ".06em" }}>MIXED BY</span>
                      {x.mix.map(([n, c]) => c > 1 ? `${n} (${c})` : n).join(" · ")}</div>
                  )}
                </div>
              </div>
            );
          })()}

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
        /* av-row2 is a resilient auto-fit grid: 3 modules when wide, and if a module (e.g. the flow)
           has no data and doesn't render, the survivors re-flow to fill instead of stranding a gap
           or mis-sizing. children must be allowed to shrink inside their track. */
        .av-row2 > * { min-width: 0; }
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
// direction-aware "sits" phrase: a BELOW-median percentile reads as the low adjective, not
// "more <hi> than 10%" (which misleads — 10% means it's low). → { word, pct } for "More {word} than {pct}%".
function sitsWord(p, hi, lo) {
  if (p == null) return null;
  return p >= 50 ? { word: hi, pct: Math.round(p) } : { word: lo, pct: Math.round(100 - p) };
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
  // album "what it's about" blurb (Wikipedia themes section) — lazy + optional (404s harmlessly
  // if the build has no album-about layer yet)
  const [, setAaReady] = React.useState(!!window.ROTATION_ALBUM_ABOUT);
  React.useEffect(() => {
    if (window.ROTATION_ALBUM_ABOUT) return;
    const s = document.createElement("script"); s.src = "album-about-lazy.js";
    s.onload = () => setAaReady(true); s.onerror = () => setAaReady(true); document.head.appendChild(s);
  }, []);
  // per-track themes for the "mostly about…" roll-up — tiny extra render when it arrives
  const [themesReady, setThemesReady] = React.useState(!!window.ROTATION_TRACKTHEMES);
  React.useEffect(() => {
    if (window.ROTATION_TRACKTHEMES) return;
    const s = document.createElement("script"); s.src = "genius-themes-lazy.js"; s.onload = () => setThemesReady(true); document.head.appendChild(s);
  }, []);
  // album extras (deluxe/bonus tracks + absorbed-edition names) — lazy + optional (404 = feature off).
  // shared script tag so every AlbumView reuses one load; graceful onerror keeps the page working.
  const [, setExReady] = React.useState(!!window.ROTATION_ALBUM_EXTRAS);
  React.useEffect(() => {
    if (window.ROTATION_ALBUM_EXTRAS) return;
    let s = document.getElementById("album-extras-js");
    if (!s) { s = document.createElement("script"); s.id = "album-extras-js"; s.src = "album-extras.js"; document.head.appendChild(s); }
    const done = () => setExReady(true);
    s.addEventListener("load", done); s.addEventListener("error", done);
    return () => { s.removeEventListener("load", done); s.removeEventListener("error", done); };
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
  // album "what it's about" (Wikipedia themes) — id is artistSlug~albumSlug, same key the pull uses
  const albumAbout = (window.ROTATION_ALBUM_ABOUT && window.ROTATION_ALBUM_ABOUT[id]) || null; // [excerpt, wikiTitle]
  // album extras (same id key): { bonus:[track titles], from:[edition names], byEdition:{suffix:[…]} }.
  // The base tracklist renders first (real Spotify track numbers, or sequential fallback). The bonus
  // tracks — variant-only, marked live/demo/etc — split into one restart-numbered SUB-SECTION per
  // edition below it, disc-style. This kills track-NUMBER COLLISIONS after edition-merging: e.g. NIN's
  // "01 Mr. Self Destruct" (base) vs "01 Burn" (reissue) no longer share one flat number column — each
  // section restarts at 01. (True CD1/CD2 disc splits need MusicBrainz release data — a later pass.)
  const extras = (window.ROTATION_ALBUM_EXTRAS && window.ROTATION_ALBUM_EXTRAS[id]) || null;
  const bonusSet = extras && extras.bonus ? new Set(extras.bonus) : null;
  const baseTracks = bonusSet ? data.tracks.filter(t => !bonusSet.has(t.title)) : data.tracks;
  const bonusTracks = bonusSet ? data.tracks.filter(t => bonusSet.has(t.title)) : [];
  // build the per-edition sections from byEdition. Each section = { name, tracks[] }, tracks pulled
  // from bonusTracks (so we keep plays/mood/no); ordered by track count descending. Any bonus track
  // not attributable to a named edition (byEdition[""], or missing byEdition) falls into a final
  // "bonus / other editions" catch-all.
  const bonusSections = (() => {
    if (!bonusTracks.length) return [];
    const byTitle = new Map(bonusTracks.map(t => [t.title, t]));
    const be = (extras && extras.byEdition) || null;
    const named = [], leftover = new Set(byTitle.keys());
    if (be) for (const suf in be) {
      if (!suf) continue;   // "" handled as catch-all below
      const rows = be[suf].map(ti => byTitle.get(ti)).filter(Boolean);
      if (rows.length) { named.push({ name: suf, tracks: rows }); rows.forEach(r => leftover.delete(r.title)); }
    }
    named.sort((a, b) => b.tracks.length - a.tracks.length);   // biggest editions first
    if (leftover.size) named.push({ name: "bonus / other editions", tracks: [...leftover].map(ti => byTitle.get(ti)) });
    return named;
  })();

  return (
    <div className="r-view tv-page">
      {/* an album's natural parent is its artist — go up to them, not back out to Explore */}
      <button className="r-back" onClick={() => (known ? go("artist", artistId) : go("explore"))}>← {known ? data.artist : "explore"}</button>
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
          {(() => {   // "front-to-back" sittings for this album (Phase 3 sessions layer), if any
            const SESS = R.INSIGHTS.SESSIONS, ft = SESS && SESS.sittings && SESS.sittings.byAlbum && SESS.sittings.byAlbum[id];
            return ft ? <div title="times you played this album start-to-finish in one sitting"><div className="r-stat-n" style={{ fontSize: 36 }}>{ft}×</div>
              <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: ".12em", textTransform: "uppercase", marginTop: 5 }}>front-to-back</div></div> : null;
          })()}
        </div>
      </div>

      {/* what it's about — Wikipedia themes/content section (album-about-lazy.js) */}
      {albumAbout && (
        <div className="tv-about" style={{ maxWidth: "none", marginBottom: "var(--gap)" }}>
          <span className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: ".14em", textTransform: "uppercase", marginRight: 8 }}>What it's about</span>
          <span className="tv-about-txt">{albumAbout[0]}</span>
          {albumAbout[1] ? <a className="tv-about-src" href={`https://en.wikipedia.org/wiki/${encodeURIComponent(albumAbout[1].replace(/ /g, "_"))}`} target="_blank" rel="noopener noreferrer">via Wikipedia ↗</a> : null}
        </div>
      )}

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
                  {(() => { const e = sitsWord(eP, "intense", "mellow"); return e && <div>More <b style={{ color: "var(--ink)" }}>{e.word}</b> than {e.pct}% of your plays.</div>; })()}
                  {(() => { const v = sitsWord(vP, "upbeat", "downbeat"); return v && <div>More <b style={{ color: "var(--ink)" }}>{v.word}</b> than {v.pct}% of them.</div>; })()}
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
        <div className="r-card-h" style={{ padding: 0, marginBottom: 6, flexWrap: "wrap", gap: 6 }}><span className="lbl"><b>Tracks you've played</b></span>
          <span className="meta">{fmt(data.trackPlays)} plays across {data.tracks.length}</span></div>
        {/* absorbed edition chip — this canonical album merged one or more variant editions */}
        {extras && extras.from && extras.from.length > 0 && (
          <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: ".06em", textTransform: "uppercase", margin: "0 0 10px" }}>
            also logged as: <span style={{ color: "var(--ink-soft)" }}>{extras.from.join(", ")}</span>
          </div>
        )}
        {(() => {
          // numLabel: for the base list, prefer the real Spotify track number (t.no); for edition
          // sub-sections, force the section-local sequential number (nStr) — the merged Spotify nos
          // collide across releases, so per-section restart is the whole point.
          const row = (t, i, nStr) => (
            <div key={t.title + i} className="r-track-row" onClick={() => go("track", R.slug(data.artist) + "~" + R.slug(t.title))} title={`${t.title} →${t.e != null ? ` · energy ${t.e} · positivity ${t.v}` : ""}`} style={{ display: "grid", gridTemplateColumns: "24px minmax(0,1fr) 72px 46px", gap: 10, alignItems: "center", padding: "7px 4px", cursor: "pointer", borderRadius: 4 }}>
              <span className="r-mono" style={{ fontSize: 10, color: "var(--ink-faint)" }}>{nStr != null ? nStr : (t.no ? String(t.no).padStart(2, "0") : String(i + 1).padStart(2, "0"))}</span>
              <div style={{ fontSize: 13, lineHeight: 1.25, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "break-word" }}>
                {t.title}{standout && t === standout ? <span title="your most-played from this album" style={{ color: "var(--accent)", marginLeft: 5 }}>★</span> : null}
                {" "}<LikedMark on={likedKey(R.slug(data.artist) + "~" + R.slug(t.title))} />
                {" "}<EngBar eng={engOf(R.slug(data.artist) + "~" + R.slug(t.title))} />
                {" "}<LiveMark on={seenLiveKey(R.slug(data.artist) + "~" + R.slug(t.title))} /></div>
              <div className="xp-bar" style={{ width: "100%" }}><div style={{ width: (t.plays / maxT * 100) + "%", background: `oklch(0.6 0.14 ${hue})` }} /></div>
              <span className="r-mono" style={{ fontSize: 11, color: "var(--ink-soft)", textAlign: "right" }}>{fmt(t.plays)}</span>
            </div>
          );
          const secHead = (name) => (
            <div key={"h~" + name} className="r-mono" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 8.5, color: "var(--ink-faint)", letterSpacing: ".14em", textTransform: "uppercase", margin: "12px 4px 4px" }}>
              <span>{name}</span>
              <span style={{ flex: 1, height: 1, background: "var(--rule)" }} />
            </div>
          );
          return (
            <div style={{ display: "grid", gap: 2 }}>
              {/* base tracklist — numbering as today (real Spotify no, else sequential) */}
              {baseTracks.map((t, i) => row(t, i))}
              {/* one restart-numbered sub-section per edition (disc-like), biggest first, catch-all last */}
              {bonusSections.map(sec => (
                <React.Fragment key={"sec~" + sec.name}>
                  {secHead(sec.name)}
                  {sec.tracks.map((t, i) => row(t, i, String(i + 1).padStart(2, "0")))}
                </React.Fragment>
              ))}
            </div>
          );
        })()}
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
  React.useEffect(() => {
    // On id change (navigation) or unmount: stop playback and reset UI state.
    return () => {
      if (ref.current) { ref.current.pause(); ref.current = null; }
      setPlaying(false);
    };
  }, [id]);
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
// "What it's about" — the Haiku gist is the default read; flick to Fable / Opus (deeper reads) or
// Genius (human, community-written) where present. Order Haiku → Fable → Opus → Genius; Sonnet is
// intentionally omitted. Reads come from blurb-reads (bake-off data today; the real pipeline later).
// Where the track carries a fableDeep close-reading, an Info / Interpretation toggle sits at the
// module's top right: Info = the normal one-line reads, Interpretation = Fable's longer reading.
const BLURB_ORDER = [["haiku", "Haiku"], ["fable", "Fable"], ["opus", "Opus"]];
// which READ sources live in the gist shard (light) vs the deep shard (mirrors shard-about.js).
const GIST_SRC = { haiku: 1, web: 1 };
function BlurbSwitcher({ id, about }) {
  const R = window.ROTATION;
  const [, bump] = React.useReducer(x => x + 1, 0);   // re-render when a lazy data file lands
  // GIST first (light default read); DEEP loads only when a deep source / Interpretation opens.
  React.useEffect(() => {
    if (R && R.loadAbout) R.loadAbout(id, bump);
    if (!window.ROTATION_BLURB_DEMO) { const s = document.createElement("script"); s.src = "blurb-demo.js"; s.onload = bump; s.onerror = bump; document.head.appendChild(s); }
  }, [id]);
  const [pick, setPick] = React.useState(null);
  const [mode, setMode] = React.useState("info");     // "info" | "deep" (Fable interpretation)
  React.useEffect(() => { setPick(null); setMode("info"); }, [id]);   // new song → default read; clicks never clobbered
  const gist0 = (R && R.aboutGist && R.aboutGist(id)) || null;   // read before deciding on deep load
  // pull the deep shard when a deep read is being shown: a picked deep source, the Interpretation
  // mode, OR when the DEFAULT source (gist.src) is itself a deep read (so it renders without a click).
  const defaultDeep = !!(gist0 && gist0.src && !GIST_SRC[gist0.src]);
  const needDeep = mode === "deep" || (pick && !GIST_SRC[pick]) || (!pick && defaultDeep);
  React.useEffect(() => { if (needDeep && R && R.loadAboutDeep) R.loadAboutDeep(id, bump); }, [needDeep, id]);
  const gist = gist0;                                            // src + haiku + web + has (deep markers)
  const deep = (R && R.aboutDeep && R.aboutDeep(id)) || null;    // sonnet/opus/fable/fableDeep (once loaded)
  const llm = (gist || deep) ? Object.assign({}, gist || {}, deep || {}) : null;   // merged, blob-shape
  const reads = (window.ROTATION_BLURB_DEMO && window.ROTATION_BLURB_DEMO[id]) || null; // bake-off multi-model
  // buttons: the model reads (Haiku · Sonnet · Opus · Fable), a Web read (researched from web sources
  // when the lyrics dump had none), then Genius (human). Default = the chosen source (llm.src).
  // Bake-off songs keep their set. Deep buttons appear from the gist's `has` marker even before
  // the deep shard lands; opening one triggers its load and re-render (text fills in).
  const sources = [];
  if (gist) {
    const hasMark = gist.has || "";
    const present = { haiku: !!gist.haiku, web: !!gist.web,
      sonnet: hasMark.includes("s"), opus: hasMark.includes("o"), fable: hasMark.includes("f") };
    for (const [m, label] of [["haiku", "Haiku"], ["sonnet", "Sonnet"], ["opus", "Opus"], ["fable", "Fable"], ["web", "Web"]]) {
      if (present[m]) sources.push({ m, label, text: llm[m] || null });   // text null until deep loads
    }
  } else if (reads) {
    for (const [m, label] of BLURB_ORDER) if (reads[m]) sources.push({ m, label, text: reads[m] });
  }
  const geniusText = (about && about[0]) || (reads && reads.genius);
  if (geniusText) sources.push({ m: "genius", label: "Genius", text: geniusText, link: about && about[1] ? `https://genius.com/songs/${about[1]}` : null });
  if (!sources.length) return null;
  const cur = sources.find(s => s.m === pick) || sources.find(s => gist && s.m === gist.src) || sources[0];
  const multi = sources.length > 1;
  // fableDeep lives in the deep shard; the gist `has` "I" marker tells us it EXISTS so the
  // Interpretation toggle renders before the deep shard lands. Its text fills in on load.
  const hasDeepRead = !!(gist && gist.has && gist.has.includes("I")) || !!(llm && llm.fableDeep);
  const deepText = llm && llm.fableDeep;              // Fable's close-reading, once loaded
  const showDeep = mode === "deep" && hasDeepRead;
  // a deep model read (sonnet/opus/fable) is selected but its shard hasn't landed yet
  const curLoading = !showDeep && cur.text == null && !GIST_SRC[cur.m] && cur.m !== "genius";
  return (
    <div className="tv-switch">
      <div className="tv-switch-head">
        <span className="tv-switch-lbl">What it's about</span>
        {multi && (
          <div className="tv-switch-btns" data-dim={showDeep}>
            {sources.map(s => (
              <button key={s.m} data-on={!showDeep && cur.m === s.m} data-m={s.m} onClick={() => { setPick(s.m); setMode("info"); }}>{s.label}</button>
            ))}
          </div>
        )}
        {hasDeepRead && (
          <div className="tv-switch-mode">
            <button data-on={mode === "info"} onClick={() => setMode("info")}>Info</button>
            <button data-on={mode === "deep"} data-m="fable" onClick={() => setMode("deep")}>Interpretation</button>
          </div>
        )}
      </div>
      <div className="tv-switch-body">
        <span className="tv-switch-txt">{showDeep ? (deepText || "…") : (curLoading ? "…" : cur.text)}</span>
        {showDeep
          ? <span className="tv-switch-brand" data-m="fable">via Fable · interpretation</span>
          : cur.m === "genius" && cur.link
            ? <a className="tv-switch-brand" data-m="genius" href={cur.link} target="_blank" rel="noopener noreferrer">via Genius ↗</a>
            : <span className="tv-switch-brand" data-m={cur.m}>via {cur.label}</span>}
      </div>
      {showDeep
        ? <div className="tv-switch-note r-mono">a closer reading of the lyric — how it works, not just what it says</div>
        : multi && <div className="tv-switch-note r-mono">different reads of what the song is about</div>}
    </div>
  );
}

function TrackView({ id, go }) {
  const R = window.ROTATION;
  const [ready, setReady] = React.useState(!!(window.ROTATION_MEDIA && window.ROTATION_TRACKAUDIO));
  React.useEffect(() => {
    let need = 0; const done = () => { if (--need <= 0) setReady(true); };
    const load = (src, glob) => { if (window[glob]) return; need++; const s = document.createElement("script"); s.src = src; s.onload = done; document.head.appendChild(s); };
    load("media-index.js", "ROTATION_MEDIA"); load("track-audio.js", "ROTATION_TRACKAUDIO");
    load("track-previews.js", "ROTATION_PREVIEWS"); load("genius-mood-lazy.js", "ROTATION_MOOD");
    load("genius-about-lazy.js", "ROTATION_ABOUT");
    load("blurb-demo.js", "ROTATION_BLURB_DEMO");   // DEMO: multi-model "what it's about" reads
    load("mb-track-bio.js", "ROTATION_TRACKBIO");   // PILOT: song bios (writers/covers/versions) via MusicBrainz
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
  // "In your rotation, this track is…" — the audio axes where THIS song is a genuine outlier
  // against YOUR own distribution. Reworked 2026-07-07 (Fuad: a bare "top 26%" meant nothing):
  // tighter gate (≥85 / ≤15 pctile, so only real standouts speak) + comparative wording
  // ("faster than 88% of what you play"). `p` = share of your plays with a lower value on the axis.
  const tasteStandouts = (() => {
    if (!f) return [];
    const DIMS = [
      { k: "energy", i: 4, hi: "more intense", lo: "more mellow" },
      { k: "valence", i: 5, hi: "brighter", lo: "darker" },
      { k: "tempo", i: 7, hi: "faster", lo: "slower" },
      { k: "acoustic", i: 6, hi: "more acoustic", lo: null },
      { k: "dance", i: 8, hi: "more danceable", lo: null },
      { k: "instr", i: 9, hi: "more instrumental", lo: null },
    ];
    const out = [];
    for (const d of DIMS) {
      const p = tastePctl(d.k, f[d.i]); if (p == null) continue;
      if (p >= 85 && d.hi) out.push({ phrase: d.hi, pct: p, ex: p - 50 });        // above most of your rotation
      else if (p <= 15 && d.lo) out.push({ phrase: d.lo, pct: 100 - p, ex: 50 - p }); // below most of it
    }
    return out.sort((a, b) => b.ex - a.ex).slice(0, 3);
  })();
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

      {/* "in your rotation" outliers LEFT · sounds/reads RIGHT (the Genius blurb moved into the
          switcher below, so this slot now carries a personal audio read — Fuad 2026-07-06). */}
      {(tasteStandouts.length > 0 || (audVal != null && lyrVal != null)) && (
        <div className="tv-subrow" data-both={!!(tasteStandouts.length > 0 && audVal != null && lyrVal != null)}>
          {tasteStandouts.length > 0 && (
            <div className="tv-taste">
              <div className="tv-taste-h">Next to everything you play, it's…</div>
              <div className="tv-taste-list">
                {tasteStandouts.map(s => (
                  <div className="tv-taste-row" key={s.phrase}>
                    <span className="tv-taste-adj">{s.phrase}</span>
                    <div className="tv-taste-bar"><i style={{ width: s.pct + "%", background: `oklch(0.62 0.15 ${hue})` }} /></div>
                    <span className="tv-taste-pct">than {Math.round(s.pct)}%</span>
                  </div>
                ))}
              </div>
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

      {/* "what it's about" — real Genius blurb always; the bake-off model reads where present */}
      <BlurbSwitcher id={id} about={about} />

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
                  {(() => { const e = sitsWord(eP, "intense", "mellow"); return e && <div>More <b style={{ color: "var(--ink)" }}>{e.word}</b> than {e.pct}% of your plays.</div>; })()}
                  {(() => { const v = sitsWord(vP, "upbeat", "downbeat"); return v && <div>More <b style={{ color: "var(--ink)" }}>{v.word}</b> than {v.pct}% of them.</div>; })()}
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
                  <LikedMark on={likedKey(s.id)} />
                  <EngBar eng={engOf(s.id)} />
                  <LiveMark on={seenLiveKey(s.id)} /></span>
                <span className="r-mono" style={{ fontSize: 11, color: "var(--ink-soft)", textAlign: "right" }}>{fmt(s.plays)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(() => {
        // PILOT: the song's biography — writers, cover status, cross-library versions (MB works)
        const b = window.ROTATION_TRACKBIO && window.ROTATION_TRACKBIO[id];
        if (!b) return null;
        return (
          <div className="r-card" style={{ padding: "16px 18px" }}>
            <div className="r-card-h" style={{ padding: 0, marginBottom: 8 }}>
              <span className="lbl">The song itself{!b.own && b.w ? " · a cover" : ""}</span>
              <span className="meta">via MusicBrainz</span></div>
            <div style={{ display: "grid", gap: 7, fontSize: 13 }}>
              {b.w && <div><span className="r-mono" style={{ fontSize: 10, color: "var(--ink-faint)", marginRight: 8, letterSpacing: ".06em" }}>WRITTEN BY</span>{b.w.join(", ")}</div>}
              {b.also && b.also.length > 0 && (
                <div><span className="r-mono" style={{ fontSize: 10, color: "var(--ink-faint)", marginRight: 8, letterSpacing: ".06em" }}>ALSO IN YOUR LIBRARY BY</span>
                  {b.also.map(([s, n], i) => (
                    <React.Fragment key={s}>{i > 0 ? " · " : ""}<a onClick={() => go("artist", s)} style={{ cursor: "pointer", borderBottom: "1px dotted var(--ink-faint)" }}>{n}</a></React.Fragment>
                  ))}</div>
              )}
              {b.v > 1 && <div className="r-mono" style={{ fontSize: 11, color: "var(--ink-soft)" }}>{b.v} recorded versions exist on MusicBrainz (live takes included)</div>}
            </div>
          </div>
        );
      })()}

      {known && <div style={{ marginTop: 14 }}><button className="r-back" style={{ margin: 0 }} onClick={() => go("artist", artistId)}>more from {data.artist} →</button></div>}
    </div>
  );
}

Object.assign(window, { ArtistView, AlbumView, TrackView, LiveView, ConcertRow });
