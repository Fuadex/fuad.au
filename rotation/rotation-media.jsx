// rotation-media.jsx — Album + Track pages and the shared audio widgets (radar, sparkline,
// quadrant, preview button, blurb switcher). Split from rotation-views2.jsx (2026-08-26, audit A5).

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
// mid-rank variant for tie-heavy axes: uses the midpoint of the CDF step so a track
// with value=8 on an axis where 90% sit at 0 doesn't rank above ~90% of the library.
// Guards v=0 by treating the lower bound as 0 (no entries below 0).
function tastePctlMid(axis, value) {
  const D = window.ROTATION && window.ROTATION.AUDIO_DIST; if (!D) return null;
  const ai = D.axes.indexOf(axis); if (ai < 0 || value == null) return null;
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const lo = v > 0 ? D.cdf[ai][v - 1] : 0;
  return (lo + D.cdf[ai][v]) / 2 / 10;   // midrank → percent; ties split evenly
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
// A single moving value→colour ramp shared by BOTH mood bars, so divergence reads as colour
// contrast at a glance: a low value sits deep cool violet (hue ~290), a high value warms to gold
// (hue ~85). Lightness/chroma stay moderate (0.62/0.13) to keep it in the app's muted voice.
// Hoisted to module scope 2026-09-01 so the album Sounds/Reads pair uses the same ramp as the song
// page — two ramps would make the same number read as two different colours between the views.
const moodColor = (v) => `oklch(0.62 0.13 ${290 - Math.max(0, Math.min(100, v)) / 100 * 205})`;

// AlbumView — your history with one album: the tracks you've played from it (with per-song plays),
// when you played it, and the artist's genre/mood (joined from the inline universe). The album's
// identity is "artistSlug~titleSlug"; data comes from the lazy media-index, loaded on demand.

// AlbumTracksPlayed — the INNER body of the old "Tracks you've played" module (meta line, absorbed-
// edition chip, tracklist with the per-edition sub-sections). No card wrapper: it is now folded into
// "The record, as released" behind an expandable handle (Fuad 2026-07-17), and only used standalone as
// a fallback for albums with no MB spine. All page-derived values arrive as props so it stays pure.
function AlbumTracksPlayed({ data, extras, standout, maxT, hue, R, go, baseTracks, bonusSections }) {
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
    <>
      <div className="r-card-h" style={{ padding: 0, marginBottom: 6, flexWrap: "wrap", gap: 6 }}><span className="lbl"><b>Tracks you've played</b></span>
        <span className="meta">{fmt(data.trackPlays)} plays across {data.tracks.length}</span></div>
      {/* absorbed edition chip — this canonical album merged one or more variant editions */}
      {extras && extras.from && extras.from.length > 0 && (
        <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: ".06em", textTransform: "uppercase", margin: "0 0 10px" }}>
          also logged as: <span style={{ color: "var(--ink-soft)" }}>{extras.from.join(", ")}</span>
        </div>
      )}
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
    </>
  );
}

// AlbumTracksHandle — the expandable "tracks you've played ▾" foot for "The record, as released".
// Styled like the portrait's "the full read ▾" toggle; expanded shows exactly the old module content.
function AlbumTracksHandle(props) {
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--rule)" }}>
      <button className="pv-toggle" onClick={() => setOpen(o => !o)} aria-expanded={open}
        style={{ margin: 0 }}>
        {open ? "hide the tracks you've played ▴" : "tracks you've played ▾"}
      </button>
      {open && <div style={{ marginTop: 12 }}><AlbumTracksPlayed {...props} /></div>}
    </div>
  );
}

// AlbumWordsBlock — the album "In its own words" row (signature phrases + bright/intense/unresolved
// bars), lifted OUT of PortraitCard (Fuad 2026-07-17) to sit as its own compact block directly under
// "The record, as released". Same content + same ww- styling as before. Presence-gated on the words
// overlay carrying this album id.
function AlbumWordsBlock({ id }) {
  const words = useWordsLayer();
  const w = (words && words.albums && words.albums[id]) || null;
  if (!w) return null;
  return (
    <div className="r-card ww-albumblock" style={{ padding: "16px 18px", marginBottom: "var(--gap)" }}>
      <div className="ww-own-h r-mono">In its own words</div>
      {w.phrases && w.phrases.length > 0 && (
        <div className="ww-chips">
          {w.phrases.map((ph, i) => <span key={i} className="ww-chip">{ph}</span>)}
        </div>
      )}
      <WordsWeatherBars v={w.v} a={w.a} x={w.x} />
      <style>{`
        /* album words block — reuses the ww-track grammar (compact bars + chips). No backticks here. */
        .ww-albumblock .ww-own-h { font-size: 9px; color: var(--ink-faint); letter-spacing: .14em; text-transform: uppercase; margin-bottom: 9px; }
        .ww-albumblock .ww-chips { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 12px; }
        .ww-albumblock .ww-chip { max-width: 100%; background: var(--bg-3); border: 1px solid var(--rule); border-radius: 999px;
          padding: 4px 11px; font-family: var(--serif); font-size: 12px; font-style: italic; line-height: 1.35;
          color: var(--ink-soft); white-space: normal; }
        .ww-albumblock .ww-bars { display: grid; gap: 7px; }
        .ww-albumblock .ww-axis { display: grid; grid-template-columns: 74px minmax(0,1fr) 30px; gap: 10px; align-items: center; }
        .ww-albumblock .ww-k { font-family: var(--mono); font-size: 9.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-soft); }
        .ww-albumblock .ww-bar { height: 6px; background: var(--bg-3); border-radius: 4px; overflow: hidden; }
        .ww-albumblock .ww-bar i { display: block; height: 100%; border-radius: 4px; }
        .ww-albumblock .ww-v { font-family: var(--mono); font-size: 10px; color: var(--ink-faint); text-align: right; }
      `}</style>
    </div>
  );
}

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
  // FABLE themes for the roll-up (preferred over the lexicon TRACKTHEMES). They ride in the gist
  // shard (about/g-NN.js), keyed artistSlug~trackSlug, first = primary — same source TrackView uses.
  // One album's tracks all share the artist's bucket, so a single loadAbout covers the whole record;
  // the callback flips gistReady and re-renders (mirrors the themesReady pattern, no flicker beyond
  // the same old-source→upgrade one).
  const [gistReady, setGistReady] = React.useState(false);
  React.useEffect(() => {
    if (!R || !R.loadAbout || !id) return;
    R.loadAbout(id, () => setGistReady(true));
  }, [id]);
  // album-level covers rollup (core feature) (MB works) — same file as the track bios, lazy + optional
  const [, setBioReady] = React.useState(!!window.ROTATION_ALBBIO);
  React.useEffect(() => {
    if (window.ROTATION_ALBBIO) return;
    const s = document.createElement("script"); s.src = "mb-track-bio.js";
    s.onload = () => setBioReady(true); s.onerror = () => setBioReady(true); document.head.appendChild(s);
  }, []);
  // the album SPINE (core feature) — the canonical MB release as tracklist skeleton (true disc
  // boundaries, official order), with your plays hung off it. Lazy + optional.
  const [, setSpineReady] = React.useState(!!window.ROTATION_ALBSPINE);
  React.useEffect(() => {
    if (window.ROTATION_ALBSPINE) return;
    const s = document.createElement("script"); s.src = "mb-album-spine.js";
    s.onload = () => setSpineReady(true); s.onerror = () => setSpineReady(true); document.head.appendChild(s);
  }, []);
  // per-album LINEUP — members whose tenure covers the record's year (mb-lineup.js, lazy)
  const [, setMbReady] = React.useState(!!window.ROTATION_MB);
  React.useEffect(() => {
    if (window.ROTATION_MB) return;
    let s = document.getElementById("mb-lineup-js");
    if (!s) { s = document.createElement("script"); s.id = "mb-lineup-js"; s.src = "mb-lineup.js"; s.onerror = () => {}; document.head.appendChild(s); }
    s.addEventListener("load", () => setMbReady(true));
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
    for (const t of M.tracks) if (t[3] === bestIdx) tracks.push({ title: t[0], plays: t[2], no: t[5] || 0, e: t[6] != null ? t[6] : null, v: t[7] != null ? t[7] : null, bonus: t[8] === 1 });
    const hasNos = tracks.some(t => t.no);
    tracks.sort((x, y) => hasNos ? ((x.no || 999) - (y.no || 999)) || (y.plays - x.plays) : y.plays - x.plays);
    return { title: al[0], artist, plays: al[2], firstY: al[3], lastY: al[4], cover: al[6] || "", meta: al[7] || null,
      tracks, trackPlays: tracks.reduce((s, t) => s + t.plays, 0), dna: al[8] || null, ext: al[10] || null, reads: al[11] || null,
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
  // Album stat block — the same row the song page shows, averaged up to the album (Fuad
  // 2026-09-01: "I want the song-level values to also get averaged out at album level").
  // ext = media row [10] = [loud dBx10, live, speech, pop, keyPitch, keyMode], play-weighted in
  // build-data. Key is the play-weighted MODE, not a mean — pitch classes are categorical.
  // followers stays ARTIST-level: it is a property of the act, not of one record, so averaging it
  // across an album would be meaningless. It reads from R.AUDIO like the song page does.
  const ext = data.ext;
  const albSounds = dna ? dna[1] : null;   // play-weighted audio valence — "how it sounds"
  const albReads = data.reads || null;     // [play-weighted NRC lyric valence, N lyric-scored tracks]
  const albArtAF = R.AUDIO && R.AUDIO[artistId];
  const albAttrs = ext ? [
    { k: "tempo", v: bpm || "—", u: bpm ? " bpm" : "" },
    { k: "key", v: keyName(ext[4], ext[5]) || "—", t: "the key most of this album's plays sit in" },
    { k: "loud", v: ext[0] ? (ext[0] / 10).toFixed(1) : "—", u: ext[0] ? " dB" : "" },
    { k: "speech", v: ext[2], u: "%" },
    { k: "live", v: ext[1], u: "%" },
    { k: "pop", v: ext[3], u: "/100" },
    { k: "followers", v: albArtAF ? fmtK(albArtAF[8]) : "—", t: "the artist's Spotify followers" },
  ] : [];
  const avgSec = (R.TOTALS && R.TOTALS.avgTrackSec) || 216;
  const listenedMin = Math.round(avgSec * data.trackPlays / 60);
  const sr = data.series, sFirst = sr[0], sLast = sr[sr.length - 1], sPeak = sr.reduce((a, b) => b.p > (a ? a.p : 0) ? b : a, null);
  // album theme roll-up: play-weighted primary themes across this album's tracks (≥2 themed).
  // PREFER the fable reads (R.aboutGist(key).themes — reasoned, first = primary) over the stale
  // lexicon source (ROTATION_TRACKTHEMES). Both are computed the same way; fable wins only when its
  // themed-track count is ≥2 AND ≥ half the lexicon's themed count for THIS album (so 2/14 fabled
  // tracks can't claim "mostly about…" over a 12-track lexicon coverage). gistReady/themesReady are
  // referenced so the memo recomputes when either lazy source lands.
  void gistReady; void themesReady;
  // fable roll-up (from the gist shard) → { list:[{theme,share}], themed }
  const albThemesFable = (() => {
    if (!R || !R.aboutGist) return { list: null, themed: 0 };
    const acc = new Map(); let themed = 0, tot = 0;
    for (const t of data.tracks) {
      const g = R.aboutGist(R.slug(data.artist) + "~" + R.slug(t.title));
      const th = g && g.themes;
      if (!th || !th.length) continue;
      themed++; tot += t.plays;
      acc.set(th[0], (acc.get(th[0]) || 0) + t.plays);
    }
    if (themed < 2 || !tot) return { list: null, themed };
    return { list: [...acc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2)
      .map(([theme, p]) => ({ theme, share: Math.round(p / tot * 100) })), themed };
  })();
  // lexicon roll-up (ROTATION_TRACKTHEMES) → { list:[{theme,share}], themed }
  const albThemesLex = (() => {
    const TT = window.ROTATION_TRACKTHEMES; if (!TT || !TT._themes) return { list: null, themed: 0 };
    const acc = new Map(); let themed = 0, tot = 0;
    for (const t of data.tracks) {
      const th = TT[R.slug(data.artist) + "~" + R.slug(t.title)];
      if (!th || !th.length) continue;
      themed++; tot += t.plays;
      acc.set(th[0][0], (acc.get(th[0][0]) || 0) + t.plays);
    }
    if (themed < 2 || !tot) return { list: null, themed };
    return { list: [...acc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2)
      .map(([i, p]) => ({ theme: TT._themes[i], share: Math.round(p / tot * 100) })), themed };
  })();
  // pick fable when it clears the coverage guard; else fall back to the lexicon unchanged.
  const albThemes = (() => {
    const fable = albThemesFable, lex = albThemesLex;
    if (fable.list && fable.themed >= 2 && fable.themed >= Math.ceil(lex.themed / 2))
      return { list: fable.list, src: "reads" };
    if (lex.list) return { list: lex.list, src: "lyric" };
    return null;
  })();
  // singles→LP absorb: this album row is KEPT + browsable, but if it's an absorbed single, surface
  // one subtle line linking to the LP it lives on. id is artistSlug~albumSlug (same absorb key).
  const livesOn = (() => {
    const lpId = window.ROTATION_absorbAlbum ? window.ROTATION_absorbAlbum(id) : id;
    if (!lpId || lpId === id) return null;
    const M = window.ROTATION_MEDIA, lpSlug = lpId.slice(lpId.indexOf("~") + 1);
    const row = M && M.albums.find(r => r[1] === M.artists.indexOf(data.artist) && R.slug(r[0]) === lpSlug);
    return { id: lpId, title: row ? row[0] : lpSlug };
  })();
  // album "what it's about" (Wikipedia themes) — id is artistSlug~albumSlug, same key the pull uses
  const albumAbout = (window.ROTATION_ALBUM_ABOUT && window.ROTATION_ALBUM_ABOUT[id]) || null; // [excerpt, wikiTitle]
  // album extras (same id key): { bonus:[track titles], from:[edition names], byEdition:{suffix:[…]} }.
  // The base tracklist renders first (real Spotify track numbers, or sequential fallback). The bonus
  // tracks — variant-only, marked live/demo/etc — split into one restart-numbered SUB-SECTION per
  // edition below it, disc-style. This kills track-NUMBER COLLISIONS after edition-merging: e.g. NIN's
  // "01 Mr. Self Destruct" (base) vs "01 Burn" (reissue) no longer share one flat number column — each
  // section restarts at 01. (True CD1/CD2 disc splits need MusicBrainz release data — a later pass.)
  // per-album last.fm genre chips — top tag names, ships in the SAME lazy file as extras (setExReady
  // covers the re-render). Same vocabulary + clickability as the artist page's last.fm tags.
  const genreTags = (window.ROTATION_ALBUM_TAGS && window.ROTATION_ALBUM_TAGS[id]) || null;
  const extras = (window.ROTATION_ALBUM_EXTRAS && window.ROTATION_ALBUM_EXTRAS[id]) || null;
  const bonusSet = extras && extras.bonus ? new Set(extras.bonus) : null;
  // a track is "below the line" when the edition-extras layer names it as bonus OR the media index
  // flagged it ([8]===1): listed only on a non-standard/deluxe disc, or a variant recording sitting
  // beside its studio base (STEP 3/4 of the album-homing reshape). Both keep the standard tracklist clean.
  const isBonus = (t) => (bonusSet && bonusSet.has(t.title)) || t.bonus;
  const anyBonus = data.tracks.some(isBonus);
  const baseTracks = anyBonus ? data.tracks.filter(t => !isBonus(t)) : data.tracks;
  const bonusTracks = anyBonus ? data.tracks.filter(isBonus) : [];
  // build the per-edition sections from byEdition. Each section = { name, tracks[] }, tracks pulled
  // from bonusTracks (so we keep plays/mood/no); ordered by track count descending. Any bonus track
  // not attributable to a named edition (byEdition[""], or missing byEdition, or flagged only by the
  // media index) falls into a final "bonus & beside the album" catch-all.
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
    if (leftover.size) named.push({ name: "bonus & beside the album", tracks: [...leftover].map(ti => byTitle.get(ti)) });
    return named;
  })();

  return (
    <div className="r-view tv-page">
      {/* Album-header chip rows never wrap (Fuad 2026-08-16): when the tags overflow the row scrolls
          sideways instead of collapsing to a second line. Label (when present) stays fixed at the
          start; only the chips scroll. Hidden scrollbar + right-edge fade mask reads as "more →".
          Mirrors the .r-xscroll / .r-nav mobile precedents (rotation-core.jsx). */}
      <style>{`
        .alb-chiprow { display: flex; align-items: center; gap: 7px; min-width: 0; }
        .alb-chipscroll { display: flex; align-items: center; gap: 7px; flex: 1 1 auto; min-width: 0;
          flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; -webkit-overflow-scrolling: touch;
          -webkit-mask-image: linear-gradient(90deg, #000 calc(100% - 22px), transparent 100%);
                  mask-image: linear-gradient(90deg, #000 calc(100% - 22px), transparent 100%); }
        .alb-chipscroll::-webkit-scrollbar { display: none; }
        .alb-chiprow > .r-mono { flex-shrink: 0; }
        .alb-chipscroll > .r-chip { flex-shrink: 0; }
      `}</style>
      {/* an album's natural parent is its artist — go up to them, not back out to Explore.
          The back button lives at page left ABOVE the cover — its original home; both
          2026-08-28 experiments (same-row merge, then in-column stack) reverted on the
          owner's call ("not over the cover" = regression). */}
      <button className="r-back" style={{ marginBottom: 6 }} onClick={() => (known ? go("artist", artistId) : go("explore"))}>← {known ? data.artist : "explore"}</button>
      <div className="tv-head" style={{ display: "flex", gap: 26, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 26 }}>
        <GenCover hue={hue} name={data.title} image={data.cover} thumb={data.cover} size={150} radius={6} />
        <div style={{ flex: 1, minWidth: 240 }}>
          <div className="r-kicker">{typeName}{relYear ? ` · ${relYear}` : ""}{data.tracks.length ? ` · ${data.tracks.length} track${data.tracks.length !== 1 ? "s" : ""} played` : ""}</div>
          {/* Font scales down for long album titles so they fill the row before wrapping
              (Fuad 2026-08-28): >26 chars → small clamp, >18 → mid clamp, else full size. */}
          <h1 className="r-title" style={{ fontSize: data.title.length > 30 ? "clamp(22px,3vw,36px)" : data.title.length > 26 ? "clamp(26px,3.6vw,44px)" : data.title.length > 18 ? "clamp(30px,4.2vw,52px)" : "clamp(36px,5vw,64px)" }}>{data.title}<span className="dot">.</span></h1>
          <div style={{ color: "var(--ink-soft)", fontSize: 15, marginTop: 6 }}>
            by {known ? <b onClick={() => go("artist", artistId)} style={{ cursor: "pointer", color: "var(--ink)" }}>{data.artist}</b> : data.artist}</div>
          {livesOn && <div className="r-mono" style={{ fontSize: 10.5, color: "var(--ink-faint)", marginTop: 5 }}>
            single · lives on <span className="link" style={{ cursor: "pointer", color: "var(--accent)" }} onClick={() => go("album", livesOn.id)} title={`${livesOn.title} →`}>{livesOn.title}</span></div>}
          {label && <div className="r-mono" style={{ fontSize: 10.5, color: "var(--ink-faint)", marginTop: 4 }}>{label}{heardYr ? ` · you played it ${heardYr}` : ""}</div>}
          {albThemes && (
            <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 8 }} title="Play-weighted lyric themes across the tracks you've played from this album">
              Mostly about <b style={{ color: "var(--ink)" }}>{albThemes.list[0].theme}</b>
              {albThemes.list[1] ? <>, with <b style={{ color: "var(--ink)" }}>{albThemes.list[1].theme}</b></> : null}
              <span style={{ color: "var(--ink-faint)" }}> · {albThemes.src === "reads" ? "from the reads" : "lyric themes"}</span>
            </div>
          )}
          {/* album's OWN last.fm genre tags — mirrors the artist page's last.fm chip row; clickable
              into Explore (same tag vocabulary the artist chips use). Album-specific, so it sits above
              the artist-level subgenre chips. Renders nothing when the album has no tags. */}
          {genreTags && genreTags.length > 0 && (
            <div className="alb-chiprow" style={{ marginTop: 12 }}>
              <span className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: ".12em", textTransform: "uppercase" }}>last.fm</span>
              <div className="alb-chipscroll">
                {genreTags.map(g => <span key={g} className="r-chip link" title={`Explore ${g} →`} onClick={() => go("explore", g)}>{g}</span>)}
              </div>
            </div>
          )}
          {subs.length > 0 && <div className="alb-chipscroll" style={{ marginTop: 12 }}>
            {subs.map(s => <span key={s} className="r-chip link" title={`Explore ${s} →`} onClick={() => go("explore", s)}>{s}</span>)}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 13, flexWrap: "wrap", alignItems: "center" }}>
            {standout && <ShNeedle trackKey={R.slug(data.artist) + "~" + R.slug(standout.title)} artist={data.artist} album={data.title} track={standout.title} hue={hue} />}
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

      {/* PORTRAIT owns this slot (Fuad 2026-07-17). When a liner entry exists it is the primary read;
          a flick chip at its foot cycles to the OLD Wikipedia "What it's about" (source link intact)
          and back. When no entry exists, PortraitCard renders this same Wikipedia block verbatim as
          the fallback. Words ("In its own words") are lifted OUT to their own block below "The record,
          as released", so showWords is false here. */}
      <PortraitCard id={id} go={go} showWords={false} alt={albumAbout ? {
        label: "Wikipedia",
        node: (
          <div className="tv-about" style={{ maxWidth: "none", margin: 0 }}>
            <span className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: ".14em", textTransform: "uppercase", marginRight: 8 }}>What it's about</span>
            <span className="tv-about-txt">{albumAbout[0]}</span>
            {albumAbout[1] ? <a className="tv-about-src" href={`https://en.wikipedia.org/wiki/${encodeURIComponent(albumAbout[1].replace(/ /g, "_"))}`} target="_blank" rel="noopener noreferrer">via Wikipedia ↗</a> : null}
          </div>
        )
      } : null} />

      {dna && (
        <div className="tv-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0,1.1fr) minmax(0,1fr)", gap: "var(--gap)", marginBottom: "var(--gap)" }}>
          <div className="r-card" style={{ padding: "16px 18px" }}>
            <div className="r-card-h" style={{ padding: 0, marginBottom: 6 }}><span className="lbl"><b>Album Audio DNA</b></span>
              <span className="meta">{bpm ? `~${bpm} BPM` : ""}</span></div>
            {/* The 2026-08-28 graph/text flip was REVERTED same day (Fuad: "not working" — the
                auto-sized label column collapsed its bars). Original arrangement restored: graph
                left at fixed width, labels right taking the flexible space — with ONE survivor
                from the experiment: flex-start instead of center, so the text no longer floats
                vertically centered ("reads odd" was the original complaint). */}
            <div className="tv-dna-row" style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ flex: "0 0 auto", width: 188 }}>
                <AudioRadar axes={radar} hue={hue} avg={radarLibAvg()} />
                <div className="r-mono" style={{ fontSize: 8.5, color: "var(--ink-faint)", textAlign: "center", marginTop: 2 }}>solid = this album · dashed = your average</div>
              </div>
              <div style={{ flex: 1, minWidth: 170, display: "grid", gap: 8, alignContent: "start" }}>
                {[["Energy", dna[0]], ["Positivity", dna[1]], ["Danceability", dna[2]], ["Acousticness", dna[3]], ["Instrumental", dna[4]]].map(([label, v]) => (
                  <div key={label} style={{ display: "grid", gridTemplateColumns: "94px minmax(0,1fr) 26px", gap: 10, alignItems: "center" }}>
                    <span className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-soft)" }}>{label}</span>
                    <div className="xp-bar" style={{ width: "100%" }}><div style={{ width: v + "%", background: `oklch(0.62 0.15 ${hue})` }} /></div>
                    <span className="r-mono" style={{ fontSize: 10, color: "var(--ink-faint)", textAlign: "right" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* same stat row the song page carries, averaged to the album (Fuad 2026-09-01) */}
            {albAttrs.length > 0 && <div style={{ marginTop: 13, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(62px, 1fr))", gap: 9, borderTop: "1px solid var(--rule)", paddingTop: 12 }}>
              {albAttrs.map(s => (
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
                <MiniQuadrant valence={dna[1]} energy={dna[0]} hue={hue} />
                <div style={{ fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.5 }}>
                  {(() => { const e = sitsWord(eP, "intense", "mellow"); return e && <div>More <b style={{ color: "var(--ink)" }}>{e.word}</b> than {e.pct}% of your plays.</div>; })()}
                  {(() => { const v = sitsWord(vP, "upbeat", "downbeat"); return v && <div>More <b style={{ color: "var(--ink)" }}>{v.word}</b> than {v.pct}% of them.</div>; })()}
                  <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", marginTop: 5 }}>album mood vs your library</div>
                </div>
              </div>
            </div>
            {/* Sounds vs Reads, averaged to the album (Fuad 2026-09-01) — the same pair the song
                page carries. Sounds is the play-weighted audio valence (album DNA[1]); Reads is the
                play-weighted NRC lyric valence. The gap is the point: Toxicity sounds 53 and reads
                36. The track count is shown because lyric coverage is thinner than audio — a read
                drawn from 3 of 12 tracks is a weaker claim than one from 12, and hiding that would
                overstate it. Sits between "Where it sits" and "Your history" (Fuad's placement,
                third attempt): it belongs with the mood reading, not up in the play counts. */}
            {albReads && (
              <div className="tv-mood">
                {albSounds != null && (
                  <div className="tv-mood-axis">
                    <span className="tv-mood-k">Sounds</span>
                    <div className="tv-mood-bar"><i style={{ width: albSounds + "%", background: moodColor(albSounds) }} /></div>
                    <span className="tv-mood-v">{albSounds}</span>
                  </div>
                )}
                <div className="tv-mood-axis">
                  <span className="tv-mood-k">Reads</span>
                  <div className="tv-mood-bar"><i style={{ width: albReads[0] + "%", background: moodColor(albReads[0]) }} /></div>
                  <span className="tv-mood-v">{albReads[0]}</span>
                </div>
                <div className="tv-mood-note"><span className="txt r-mono" style={{ fontSize: 9, color: "var(--ink-faint)" }}>
                  how it sounds vs what it says · lyrics from {albReads[1]} track{albReads[1] === 1 ? "" : "s"}
                </span></div>
              </div>
            )}
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

      {(() => {
        // "the record, as released" (core feature) — MB canonical tracklist as the spine, your play
        // counts hung off each track (fold match); unplayed tracks ghosted. Disc boundaries real.
        // Match keys come from the resolution layer (ROTATION.matchKey / matchKeyLoose) — the ONE
        // canonical display-time bridge, shared with every other view. Never re-inline these.
        const _f = R.matchKey;    // strict: entity-decode + lowercase-alnum squash (the join key)
        const _fx = R.matchKeyLoose;  // + strips feat./with/[Explicit]/-Single credit segments
        const _fm = R.matchKeyMovement;  // strips a leading suite prefix → bare-movement key ("" if none)
        const aS = id.slice(0, id.indexOf("~"));
        const sp = window.ROTATION_ALBSPINE && window.ROTATION_ALBSPINE[aS] && window.ROTATION_ALBSPINE[aS][_f(data.title)];
        if (!sp) return null;
        // plays are AGGREGATED across the artist's releases (single/EP/album versions of the
        // same song share the mark — Fuad 2026-07-14: Oddworld's tracks were "unplayed" because
        // the plays sat on the singles). Falls back to this album's rows if media isn't loaded.
        const M2 = window.ROTATION_MEDIA;
        const pl = new Map(data.tracks.map(t => [_f(t.title), { title: t.title, plays: t.plays }]));
        // register a candidate under a key without letting a weaker entry clobber a stronger one.
        const put = (k, e) => { const cur = pl.get(k); if (!cur || e.plays > cur.plays) pl.set(k, e); };
        if (M2) {
          const aIx = M2.artists.indexOf(data.artist);
          if (aIx >= 0) {
            const agg = new Map();
            for (const t of M2.tracks) if (t[1] === aIx) {
              const k2 = _f(t[0]);
              const e2 = agg.get(k2) || { title: t[0], plays: 0 };
              e2.plays += t[2]; agg.set(k2, e2);
            }
            for (const [k2, e2] of agg) pl.set(k2, e2);
            // _fx layer: each agg entry has a distinct _f key, so a shared _fx key means two
            // different songs collapsed to the same credit-stripped form — SUM their plays there
            // (never double-counts a track with itself) and keep the higher-play title.
            const fxAgg = new Map();
            for (const e2 of agg.values()) {
              const kx = _fx(e2.title);
              const cur = fxAgg.get(kx);
              if (!cur) fxAgg.set(kx, { title: e2.title, plays: e2.plays });
              else { cur.plays += e2.plays; if (e2.plays > cur.plays - e2.plays) cur.title = e2.title; }
            }
            for (const [kx, ex] of fxAgg) put(kx, ex);
          }
        }
        // converse suite bridge: a PLAY row that itself carries the suite prefix (e.g. a raw
        // "Six Degrees…: Pt. III \"War Inside My Head\"" scrobble) also registers under its bare-
        // movement key, so a bare spine row can find it. Cheap + symmetric with the row-side try
        // below; "" (no prefix) is skipped so plain titles never collide.
        for (const e of [...pl.values()]) { const km = _fm(e.title); if (km) put(km, e); }
        const multi = sp.discs.length > 1;
        return (
          <div className="r-card" style={{ padding: "16px 18px", marginBottom: "var(--gap)" }}>
            <div className="r-card-h" style={{ padding: 0, marginBottom: 10, flexWrap: "wrap", gap: 6 }}>
              <span className="lbl"><b>The record, as released</b>{sp.d ? ` · ${sp.d.slice(0, 4)}` : ""}</span>
              <span className="meta">via MusicBrainz</span></div>
            {sp.discs.map(([dt, tracks], di) => (
              <div key={di} style={{ marginBottom: di < sp.discs.length - 1 ? 14 : 0 }}>
                {multi && <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", letterSpacing: ".08em", textTransform: "uppercase", margin: "0 0 6px", borderBottom: "1px solid var(--rule)", paddingBottom: 4 }}>
                  disc {di + 1}{dt && dt !== data.title ? ` — ${dt}` : ""}</div>}
                <div style={{ display: "grid", gap: 1 }}>
                  {tracks.map((tt, i) => {
                    // last resort: spine titles sometimes carry a dash-subtitle the scrobble lacks;
                    // strip it UNLESS the tail is a numbered/part segment (spine "X - Part 2" must
                    // never match a scrobbled "X").
                    const _dashBase = (s) => { const m = /^(.*\S)\s+-\s+([^-]+)$/.exec(String(s)); return m && !/\b(pt|part|vol)\b|\d/i.test(m[2]) ? m[1] : null; };
                    // paren-strip: a spine title may carry a trailing parenthetical the scrobble lacks —
                    // strip it to match, UNLESS the paren marks a DISTINCT recording (a "(radio edit)"
                    // is its own track, must not inherit the album version's plays — else it and the
                    // canonical row would both claim the same count). Version markers are excluded.
                    const _parenBase = (s) => { const m = /^(.*\S)\s*\(([^)]*)\)\s*$/.exec(String(s)); return m && !/\b(radio|single|album|edit|version|remaster(ed)?|re-?master|mix|remix|live|acoustic|demo|instrumental|reprise|mono|stereo)\b/i.test(m[2]) ? m[1] : null; };
                    // suite bridge: a spine movement titled "«suite»: VI. Solitary Shell" strips to
                    // its bare-movement key and finds the scrobble folded onto "Solitary Shell".
                    const _mv = _fm(tt);
                    const hit = pl.get(_f(tt)) || (_parenBase(tt) ? pl.get(_f(_parenBase(tt))) : undefined) || pl.get(_fx(tt))
                      || (_mv ? pl.get(_mv) : undefined)
                      || (_dashBase(tt) ? (pl.get(_f(_dashBase(tt))) || pl.get(_fx(_dashBase(tt)))) : undefined);
                    const tid = hit ? aS + "~" + R.slug(hit.title) : null;
                    return (
                      <div key={i} className={hit ? "r-track-row" : undefined}
                        onClick={hit ? () => go("track", tid) : undefined}
                        style={{ display: "grid", gridTemplateColumns: "24px minmax(0,1fr) 52px", gap: 10, alignItems: "center", padding: "4px 4px", borderRadius: 4, cursor: hit ? "pointer" : "default", opacity: hit ? 1 : 0.38 }}>
                        <span className="r-mono" style={{ fontSize: 10, color: "var(--ink-faint)" }}>{String(i + 1).padStart(2, "0")}</span>
                        <span style={{ fontSize: 13, minWidth: 0, display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tt}</span>
                          {tid && <LikedMark on={likedKey(tid)} />}
                          {tid && <EngBar eng={engOf(tid)} />}
                          {tid && <LiveMark on={seenLiveKey(tid)} />}</span>
                        <span className="r-mono" style={{ fontSize: 11, color: hit ? "var(--ink-soft)" : "var(--ink-faint)", textAlign: "right" }}>{hit ? fmt(hit.plays) : "—"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {/* "Tracks you've played" is now FOLDED IN here behind an expandable handle (Fuad
                2026-07-17), styled like the portrait's "the full read" toggle. */}
            <AlbumTracksHandle data={data} extras={extras} standout={standout} maxT={maxT} hue={hue}
              R={R} go={go} baseTracks={baseTracks} bonusSections={bonusSections} />
          </div>
        );
      })()}

      {/* WORDS block — album "In its own words", relocated OUT of PortraitCard (Fuad 2026-07-17) to
          sit directly under "The record, as released" as its own compact ww- block. */}
      {/* words-layer pilot phased out 2026-08-27 (Fuad: "the reads all come from lyrics anyway") — component + data kept for possible repurpose */}
      {/* <AlbumWordsBlock id={id} /> */}

      {/* Fallback ONLY when the album has no MB spine (so "The record, as released" didn't render):
          keep "Tracks you've played" as a standalone card so the tracklist isn't lost. */}
      {!(window.ROTATION_ALBSPINE && window.ROTATION_ALBSPINE[id.slice(0, id.indexOf("~"))]
         && window.ROTATION_ALBSPINE[id.slice(0, id.indexOf("~"))][R.matchKey(data.title)]) && (
        <div className="r-card" style={{ padding: "16px 18px", marginBottom: "var(--gap)" }}>
          <AlbumTracksPlayed data={data} extras={extras} standout={standout} maxT={maxT} hue={hue}
            R={R} go={go} baseTracks={baseTracks} bonusSections={bonusSections} />
        </div>
      )}

      {(() => {
        // per-album LINEUP: who actually played on this record — tenure windows crossed with
        // the record's year (MB members via ROTATION_MB; spine date beats the meta year).
        const mb = window.ROTATION_MB && window.ROTATION_MB[id.slice(0, id.indexOf("~"))];
        if (!mb || mb.type === "Person" || !Array.isArray(mb.members) || !mb.members.length) return null;
        const _f2 = R.matchKey;   // resolution layer — same album-title↔spine-key bridge as above
        const sp2 = window.ROTATION_ALBSPINE && window.ROTATION_ALBSPINE[id.slice(0, id.indexOf("~"))];
        const spd = sp2 && sp2[_f2(data.title)] && sp2[_f2(data.title)].d;
        const yr = parseInt((spd || "").slice(0, 4)) || (data.meta && data.meta[0]) || null;
        if (!yr) return null;
        const on = mb.members.filter(m => {
          const from = parseInt(m.f) || parseInt(mb.from) || 0;
          const to = m.t ? (parseInt(m.t) || 9999) : 9999;
          return from <= yr && yr <= to;
        });
        if (!on.length) return null;
        return (
          <div className="r-card" style={{ padding: "16px 18px", marginBottom: "var(--gap)" }}>
            <div className="r-card-h" style={{ padding: 0, marginBottom: 8 }}>
              <span className="lbl">The {yr} lineup</span><span className="meta">who played on this record · via MusicBrainz</span></div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", fontSize: 12.5 }}>
              {on.map(m => (
                <span key={m.n}>{m.n}{m.i && m.i.length ? <span className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", marginLeft: 5 }}>{m.i.slice(0, 2).join(", ")}</span> : null}</span>
              ))}
            </div>
          </div>
        );
      })()}

      {(() => {
        // album-level covers rollup (core feature) — cov = covers ON this album; out = tracks here
        // that other library artists also recorded (each links straight to the counterpart).
        const ab = window.ROTATION_ALBBIO && window.ROTATION_ALBBIO[id];
        if (!ab) return null;
        const tlink = (ts, label) => <a onClick={() => go("track", id.slice(0, id.indexOf("~")) + "~" + ts)} style={{ cursor: "pointer", borderBottom: "1px dotted var(--ink-faint)" }}>{label}</a>;
        return (
          <div className="r-card" style={{ padding: "16px 18px", marginBottom: "var(--gap)" }}>
            <div className="r-card-h" style={{ padding: 0, marginBottom: 8 }}><span className="lbl">Shared songs</span><span className="meta">via MusicBrainz</span></div>
            <div style={{ display: "grid", gap: 6, fontSize: 12.5 }}>
              {(ab.cov || []).map(([ts, w]) => (
                <div key={"c" + ts}>{tlink(ts, ts.replace(/-/g, " "))}<span className="r-mono" style={{ fontSize: 10, color: "var(--ink-soft)", marginLeft: 8 }}>a cover — written by {w}</span></div>
              ))}
              {(ab.out || []).map(([ts, also]) => (
                <div key={"o" + ts}>{tlink(ts, ts.replace(/-/g, " "))}<span className="r-mono" style={{ fontSize: 10, color: "var(--ink-faint)", margin: "0 6px" }}>ALSO BY</span>
                  {also.map(([s, n, cts], i) => (
                    <React.Fragment key={s}>{i > 0 ? " · " : ""}<a onClick={() => cts ? go("track", s + "~" + cts) : go("artist", s)} style={{ cursor: "pointer", borderBottom: "1px dotted var(--ink-faint)" }}>{n}{cts ? " →" : ""}</a></React.Fragment>
                  ))}</div>
              ))}
            </div>
          </div>
        );
      })()}

      {known && <div style={{ marginTop: 14 }}><button className="r-back" style={{ margin: 0 }} onClick={() => go("artist", artistId)}>more from {data.artist} →</button></div>}
    </div>
  );
}

// PreviewBtn — plays the 30-second preview (hash from the lazy track-previews.js; the cid query
// param is constant across the whole dump). When the dump has no Spotify preview (e.g. much of
// NIN's catalog), falls back to a build-time VETTED iTunes preview URL keyed by track id
// (preview-fallback.js — window.ROTATION_PREVIEW_FALLBACK). That table was human-adjudicated so it
// never serves the wrong version (remix/dub/live).
// 2026-08-19: a THIRD source was added — the same track-verified runtime iTunes lookup the album
// and artist needles use. The old comment here said "NO runtime search / guessing", and the reason
// was sound: an unverified search can hand you a remix or a live cut. But the album needle had been
// doing exactly that search all along, which is why Model/Actriz's Pirouette had a needle while
// Poppy's own page had none. Requiring the TRACK NAME to match removes the guessing, so the same
// source can now serve all three pages instead of only one.
// If no source has the track, the button hides itself. One Audio element, toggled; cleaned on nav.
const PREVIEW_CID = "65b708073fc0480ea92a077233ca87bd";
function PreviewBtn({ id, hue, artist, title }) {
  const [playing, setPlaying] = React.useState(false);
  const ref = React.useRef(null);
  const hash = window.ROTATION_PREVIEWS && window.ROTATION_PREVIEWS[id];
  const fallback = window.ROTATION_PREVIEW_FALLBACK && window.ROTATION_PREVIEW_FALLBACK[id];
  const [itUrl, setItUrl] = React.useState(null);
  React.useEffect(() => {
    // On id change (navigation) or unmount: stop playback and reset UI state.
    return () => {
      if (ref.current) { ref.current.pause(); ref.current = null; }
      setPlaying(false);
    };
  }, [id]);
  React.useEffect(() => {
    setItUrl(null);
    if (hash || fallback || !artist || !title) return;
    let dead = false;
    const nrm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\(.*?\)|\[.*?\]/g, "").replace(/[^a-z0-9぀-ゟ゠-ヿ一-鿿]/gu, "");
    fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(artist + " " + title)}&media=music&entity=song&limit=12`)
      .then(r => r.json())
      .then(j => {
        if (dead) return;
        const aN = nrm(artist), tN = nrm(title);
        const hit = (j.results || []).find(r => r.previewUrl && nrm(r.trackName) === tN &&
          (nrm(r.artistName).includes(aN) || aN.includes(nrm(r.artistName))));
        setItUrl(hit ? hit.previewUrl : null);
      })
      .catch(() => { if (!dead) setItUrl(null); });
    return () => { dead = true; };
  }, [id, hash, fallback, artist, title]);
  const src = hash ? `https://p.scdn.co/mp3-preview/${hash}?cid=${PREVIEW_CID}` : (fallback || itUrl || null);
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
    <button onClick={toggle} title="30-second preview"
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
// Genius (human, community-written) where present. All model reads live in llm-about (the old
// blurb-demo bake-off file was folded in and retired, 2026-07-18).
// Where the track carries a fableDeep close-reading, an Info / Interpretation toggle sits at the
// module's top right: Info = the normal one-line reads, Interpretation = Fable's longer reading.
// which READ sources live in the gist shard (light) vs the deep shard (mirrors shard-about.js).
const GIST_SRC = { haiku: 1, web: 1 };
function BlurbSwitcher({ id, about }) {
  const R = window.ROTATION;
  const [, bump] = React.useReducer(x => x + 1, 0);   // re-render when a lazy data file lands
  // GIST first (light default read); DEEP loads only when a deep source / Interpretation opens.
  React.useEffect(() => {
    if (R && R.loadAbout) R.loadAbout(id, bump);
    if (!window.ROTATION_INSTRUMENTALS) { const s = document.createElement("script"); s.src = "instrumentals.js"; s.onload = bump; s.onerror = bump; document.head.appendChild(s); }
  }, [id]);
  const [pick, setPick] = React.useState(null);
  const [mode, setMode] = React.useState("info");     // "info" | "deep" (Fable interpretation)
  const [altTake, setAltTake] = React.useState(false); // false = primary fable, true = fableAlt (the fold-merged twin's read)
  React.useEffect(() => { setPick(null); setMode("info"); setAltTake(false); }, [id]);   // new song → default read; clicks never clobbered
  const gist0 = (R && R.aboutGist && R.aboutGist(id)) || null;   // read before deciding on deep load
  // pull the deep shard when a deep read is being shown: a picked deep source, the Interpretation
  // mode, OR when the DEFAULT source (gist.src) is itself a deep read (so it renders without a click).
  const defaultDeep = !!(gist0 && gist0.src && !GIST_SRC[gist0.src]);
  const needDeep = mode === "deep" || (pick && !GIST_SRC[pick]) || (!pick && defaultDeep);
  React.useEffect(() => { if (needDeep && R && R.loadAboutDeep) R.loadAboutDeep(id, bump); }, [needDeep, id]);
  const gist = gist0;                                            // src + haiku + web + has (deep markers)
  const deep = (R && R.aboutDeep && R.aboutDeep(id)) || null;    // sonnet/opus/fable/fableDeep (once loaded)
  const llm = (gist || deep) ? Object.assign({}, gist || {}, deep || {}) : null;   // merged, blob-shape
  // buttons: the model reads (Haiku · Sonnet · Opus · Fable), a Web read (researched from web sources
  // when the lyrics dump had none), then Genius (human). Default = the chosen source (llm.src).
  // Deep buttons appear from the gist's `has` marker even before
  // the deep shard lands; opening one triggers its load and re-render (text fills in).
  const sources = [];
  if (gist) {
    const hasMark = gist.has || "";
    const present = { haiku: !!gist.haiku, web: !!gist.web,
      sonnet: hasMark.includes("s"), opus: hasMark.includes("o"), fable: hasMark.includes("f") };
    for (const [m, label] of [["haiku", "Haiku"], ["sonnet", "Sonnet"], ["opus", "Opus"], ["fable", "Fable"], ["web", "Web"]]) {
      if (present[m]) sources.push({ m, label, text: llm[m] || null });   // text null until deep loads
    }
  }
  const geniusText = about && about[0];
  if (geniusText) sources.push({ m: "genius", label: "Genius", text: geniusText, link: about && about[1] ? `https://genius.com/songs/${about[1]}` : null });
  if (!sources.length) {
    // no read exists — if the track is classified instrumental, say so instead of vanishing
    const inst = window.ROTATION_INSTRUMENTALS;
    if (inst && inst.includes(id)) {
      return (
        <div className="tv-switch">
          <div className="tv-switch-head"><span className="tv-switch-lbl">What it's about</span></div>
          <div className="tv-switch-body">
            <span className="tv-switch-txt" style={{ fontStyle: "italic", color: "var(--ink-soft)" }}>Instrumental — no words to read.</span>
          </div>
        </div>
      );
    }
    return null;
  }
  const cur = sources.find(s => s.m === pick) || sources.find(s => gist && s.m === gist.src) || sources[0];
  const multi = sources.length > 1;
  // fableDeep/opusDeep live in the deep shard; the gist `has` "I" marker tells us one EXISTS so
  // the Interpretation toggle renders before the deep shard lands. Its text fills in on load.
  const hasDeepRead = !!(gist && gist.has && gist.has.includes("I")) || !!(llm && (llm.fableDeep || llm.opusDeep));
  const deepText = llm && (llm.fableDeep || llm.opusDeep);   // Fable's close-reading wins over Opus's
  const deepBy = llm && llm.fableDeep ? "fable" : "opus";    // honest attribution in the brand line
  const showDeep = mode === "deep" && hasDeepRead;
  // a deep model read (sonnet/opus/fable) is selected but its shard hasn't landed yet
  const curLoading = !showDeep && cur.text == null && !GIST_SRC[cur.m] && cur.m !== "genius";
  return (
    <div className="tv-switch">
      <div className="tv-switch-head">
        <span className="tv-switch-lbl">What it's about
          {about && about[1] && <a href={`https://genius.com/songs/${about[1]}`} target="_blank" rel="noopener noreferrer"
            className="r-mono" style={{ fontSize: 9.5, marginLeft: 10, color: "var(--ink-faint)", borderBottom: "1px dotted var(--ink-faint)", letterSpacing: ".06em" }}>full lyrics ↗</a>}</span>
        {multi && (
          <div className="tv-switch-btns" data-dim={showDeep}>
            {sources.map(s => (
              <button key={s.m} data-on={!showDeep && cur.m === s.m} data-m={s.m}
                title={s.m === "fable" ? "fable v" + ((llm && llm.fvr) || "2.2") : undefined}
                onClick={() => { setPick(s.m); setMode("info"); }}>{s.label}</button>
            ))}
          </div>
        )}
        {hasDeepRead && (
          <div className="tv-switch-mode">
            <button data-on={mode === "info"} onClick={() => setMode("info")}>Info</button>
            <button data-on={mode === "deep"} data-m={deepBy} onClick={() => setMode("deep")}>Interpretation</button>
          </div>
        )}
      </div>
      <div className="tv-switch-body">
        {/* the read + its attribution form one block; the brand anchors to THIS, not the whole
            body, so Means/Built can sit beneath it without pushing the credit down (2026-08-08) */}
        <div className="tv-switch-read">
        {/* fableAlt (Fuad 2026-08-11): after a coherency fold merged a duplicate spelling into
            this track, its own Fable read survives as `fableAlt`. A subtle flick swaps between the
            two takes — same tv-switch-mode button idiom, scoped to the Fable read only. */}
        {(() => {
          const hasAlt = !showDeep && cur.m === "fable" && llm && llm.fableAlt;
          const shown = hasAlt && altTake ? llm.fableAlt : cur.text;
          return <span className="tv-switch-txt">{showDeep ? (deepText || "…") : (curLoading ? "…" : shown)}</span>;
        })()}
        {!showDeep && cur.m === "fable" && llm && llm.fableAlt && (
          <div className="tv-switch-mode tv-switch-alt">
            <button data-on={!altTake} onClick={() => setAltTake(false)}>Take</button>
            <button data-on={altTake} onClick={() => setAltTake(true)}>Alt take</button>
          </div>
        )}
        {/* Stacked second take (Fuad 2026-08-04): where an old-era Fable read stays primary,
            the newer read rides as `fable2` under a hairline split — same formatting, both kept. */}
        {!showDeep && !altTake && cur.m === "fable" && llm && llm.fable2 && (
          <span className="tv-switch-txt" style={{ display: "block", marginTop: 9, paddingTop: 9, borderTop: "1px solid var(--ink-faint, rgba(127,127,127,.3))" }}>{llm.fable2}</span>
        )}
        {/* Fable addition (Fuad 2026-07-28): when QC sees a verified layer the read couldn't
            surface, it rides as `fnote` — an italic line under the Fable read, never an edit. */}
        {!showDeep && !altTake && cur.m === "fable" && llm && llm.fnote && (
          <span className="tv-switch-txt" style={{ display: "block", marginTop: 7, fontStyle: "italic", opacity: 0.85 }}>{llm.fnote}</span>
        )}
        {/* Second fnote slot (Fuad 2026-08-12): a further verified annotation stacks as
            `fnote2` under the first — same italic styling, only when present. */}
        {!showDeep && !altTake && cur.m === "fable" && llm && llm.fnote2 && (
          <span className="tv-switch-txt" style={{ display: "block", marginTop: 7, fontStyle: "italic", opacity: 0.85 }}>{llm.fnote2}</span>
        )}
        {showDeep
          ? <span className="tv-switch-brand" data-m={deepBy}>via {deepBy === "fable" ? "Fable" : "Opus"} · interpretation</span>
          : cur.m === "genius" && cur.link
            ? <a className="tv-switch-brand" data-m="genius" href={cur.link} target="_blank" rel="noopener noreferrer">via Genius ↗</a>
            /* v2 = Opus-authored + Fable-QC'd (Fuad 2026-07-27). v3 = the Fable QC pass was
               cut short and finished under Opus, so the credit names all three legs. */
            : <span className="tv-switch-brand" data-m={cur.m}>via {cur.m === "fable" && llm && (llm.fv === 2 || llm.fv === 3) ? (llm.fv === 3 ? "Opus · Fable · Opus" : "Opus · Fable") : cur.label}</span>}
        </div>
        {/* MEANS + BUILT (pilot 2026-08-08) — distilled from the same read, so they sit BELOW the
            read's attribution behind a hairline: the credit closes the read, these open a second
            register. They describe the song, not the selected tier, so they don't switch. */}
        {llm && (llm.means || llm.built) && (
          <div className="tv-craft">
            {llm.means && <div className="tv-craft-row"><span className="tv-craft-k">Meaning</span><span className="tv-craft-v">{llm.means}</span></div>}
            {llm.built && <div className="tv-craft-row"><span className="tv-craft-k">Device</span><span className="tv-craft-v">{llm.built}</span></div>}
          </div>
        )}
      </div>
      {showDeep
        ? <div className="tv-switch-note r-mono">a closer reading of the lyric — how it works, not just what it says</div>
        : multi && <div className="tv-switch-note r-mono">different reads of what the song is about</div>}
    </div>
  );
}

// TrackWords — "What the words say" (pilot). Renders only when the words overlay carries this track
// (id is artistSlug~trackSlug, the same key TrackView routes by). Lead: the signature phrase (serif
// italic); beneath it the trajectory (smaller); then the free theme phrases as chips; and a compact
// three-mini-bar row for v/a/x labelled bright / intense / unresolved (matches the tv-mood bar grammar).
function TrackWords({ id }) {
  const words = useWordsLayer();
  const w = (words && words.tracks && words.tracks[id]) || null;
  if (!w) return null;
  return (
    <div className="r-card ww-track" style={{ padding: "16px 18px", marginBottom: "var(--gap)" }}>
      <div className="ww-own-h r-mono">What the words say</div>
      {w.s && <p className="ww-sig">{w.s}</p>}
      {w.tr && <p className="ww-tr">{w.tr}</p>}
      {w.t && w.t.length > 0 && (
        <div className="ww-chips">
          {w.t.map((ph, i) => <span key={i} className="ww-chip">{ph}</span>)}
        </div>
      )}
      <WordsWeatherBars v={w.v} a={w.a} x={w.x} />
      <style>{`
        /* words overlay (pilot) — scoped ww- styles for the track card. No backticks in comments. */
        .ww-track .ww-own-h { font-size: 9px; color: var(--ink-faint); letter-spacing: .14em; text-transform: uppercase; margin-bottom: 9px; }
        .ww-sig { font-family: var(--serif); font-style: italic; font-size: 16px; line-height: 1.5; color: var(--ink); margin: 0; }
        .ww-tr { font-size: 12px; line-height: 1.55; color: var(--ink-soft); margin: 6px 0 0; }
        .ww-track .ww-chips { display: flex; flex-wrap: wrap; gap: 7px; margin: 12px 0; }
        .ww-track .ww-chip { max-width: 100%; background: var(--bg-3); border: 1px solid var(--rule); border-radius: 999px;
          padding: 4px 11px; font-family: var(--mono); font-size: 10px; letter-spacing: .04em; line-height: 1.35;
          color: var(--ink-soft); white-space: normal; }
        .ww-track .ww-bars { display: grid; gap: 7px; }
        .ww-track .ww-axis { display: grid; grid-template-columns: 74px minmax(0,1fr) 30px; gap: 10px; align-items: center; }
        .ww-track .ww-k { font-family: var(--mono); font-size: 9.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-soft); }
        .ww-track .ww-bar { height: 6px; background: var(--bg-3); border-radius: 4px; overflow: hidden; }
        .ww-track .ww-bar i { display: block; height: 100%; border-radius: 4px; }
        .ww-track .ww-v { font-family: var(--mono); font-size: 10px; color: var(--ink-faint); text-align: right; }
      `}</style>
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
    load("track-previews.js", "ROTATION_PREVIEWS"); load("preview-fallback.js", "ROTATION_PREVIEW_FALLBACK");
    load("genius-mood-lazy.js", "ROTATION_MOOD");
    load("genius-about-lazy.js", "ROTATION_ABOUT");
    load("mb-track-bio.js", "ROTATION_TRACKBIO");   // song bios (writers/covers/versions) via MusicBrainz
    if (need === 0) setReady(true);
  }, []);
  // the gist shard carries themes/means for the mood card (the switcher pulls the same shard —
  // loadAbout is cached, so asking twice costs one fetch)
  const [, bumpGist] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => { if (R && R.loadAbout) R.loadAbout(id, bumpGist); }, [id]);
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
    // song pages aggregate plays across ALL of the artist's releases of the title (single +
    // album + EP versions are the same song — Fuad 2026-07-14); the host album stays bestIdx's.
    let plays = 0;
    if (t) for (let i = 0; i < M.tracks.length; i++) { const o = M.tracks[i]; if (o[1] === t[1] && R.slug(o[0]) === tSlug) plays += o[2]; }
    // ranks + siblings (from the media index)
    let artistRank = 0, artistTracks = 0, globalRank = bestIdx >= 0 ? bestIdx + 1 : 0;
    const siblings = [];
    if (t) {
      const aIx = t[1];
      for (let i = 0; i < M.tracks.length; i++) { const o = M.tracks[i]; if (o[1] === aIx) { artistTracks++; if (o[2] > plays || (o[2] === plays && i < bestIdx)) artistRank++; } }
      if (albIdx >= 0) for (let i = 0; i < M.tracks.length && siblings.length < 20; i++) { const o = M.tracks[i]; if (i !== bestIdx && o[3] === albIdx) siblings.push({ title: o[0], plays: o[2], no: o[5] || 0, id: R.slug(artist) + "~" + R.slug(o[0]) }); }
      siblings.sort((x, y) => (x.no && y.no) ? x.no - y.no : y.plays - x.plays);
    }
    // track→album navigation: if the track's home album is an absorbed SINGLE row, route to the LP
    // it lives on (link, not merge — the single row still exists, this only redirects the chip).
    let albName = alb ? alb[0] : "", albId = alb ? R.slug(M.artists[alb[1]]) + "~" + R.slug(alb[0]) : "";
    if (albId && window.ROTATION_absorbAlbum) {
      const lpId = window.ROTATION_absorbAlbum(albId);
      if (lpId !== albId) {
        albId = lpId;
        // resolve the LP's display title from the media index (fallback: keep the single's label)
        const [lpaSlug, lpSlug] = lpId.split("~");
        const lpRow = M.albums.find(r => R.slug(M.artists[r[1]]) === lpaSlug && R.slug(r[0]) === lpSlug);
        if (lpRow) albName = lpRow[0];
      }
    }
    return {
      title: t ? t[0] : tSlug, artist, plays,
      album: albName, albumId: albId,
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
  // Row shape: [valence, emoIdx, words, flag?, regIdx?] — flag 1 = calibrated whole-lyric re-score,
  // flag 2 = cathartic (dark register, NRC valence kept); regIdx = REG_VOCAB index (absent on legacy rows).
  const mood = (window.ROTATION_MOOD && window.ROTATION_MOOD[id]) || null; // [valence, emoIdx, words, flag?, regIdx?]
  const about = (window.ROTATION_ABOUT && window.ROTATION_ABOUT[id]) || null; // [excerpt, geniusId]
  const audVal = f ? f[5] : null;    // Spotify audio valence ("sounds")
  const lyrVal = mood ? mood[0] : null;  // NRC lyric valence ("reads")
  const lyrEmo = mood && mood[1] >= 0 ? EMO_NAMES[mood[1]] : null;
  // THEMES + MEANS (pilot 2026-08-08) — reasoned from the fable read, not the NRC lexicon.
  // They ride in the GIST shard so they paint with the bars instead of popping in late; the
  // switcher below loads the same shard, and loadAbout is idempotent.
  const tGist = (R && R.aboutGist && R.aboutGist(id)) || null;
  const themes = (tGist && tGist.themes) || null;
  const seenLive = !!(R.GIGS && R.GIGS.liveSongs && R.GIGS.liveSongs.indexOf(id) >= 0);
  const divergent = (audVal != null && lyrVal != null && Math.abs(audVal - lyrVal) >= 30);
  // Register vocabulary for calibrated/cathartic rows (mood[4] = index). ORDER IS THE EMIT'S —
  // .sptmp/nrc-audit/emit_v5.js — do not reorder. reg is null for legacy 4-element rows, which
  // fall back to the unmarked lyrEmo copy below.
  const REG_VOCAB = ['anguished', 'bittersweet', 'bleak', 'tender', 'angry', 'defiant', 'joyful', 'neutral', 'bitter'];
  const reg = (mood && mood[4] != null) ? REG_VOCAB[mood[4]] : null;
  // (moodColor hoisted to module scope 2026-09-01 — shared with the album Sounds/Reads pair.)
  // Per-register hue for the bolded register WORD in the note (not the bar). Same muted oklch family,
  // keys mirror REG_VOCAB. neutral is chroma 0 (grey). Anguished→deep violet, joyful→gold.
  const REG_HUES = { anguished: 290, bleak: 250, bitter: 110, angry: 25, bittersweet: 320, tender: 350, neutral: 0, defiant: 45, joyful: 85 };
  const regColor = reg ? `oklch(0.55 ${reg === 'neutral' ? 0 : 0.13} ${REG_HUES[reg] || 0})` : null;
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
    // DIMS reworked 2026-08-27: zero-heavy axes (acoustic, dance, instr) used at-or-below CDF which
    // made a track with acoustic=8 rank above ~90% of the library — "more acoustic than 90%"
    // was a lie. Fix: tastePctlMid splits ties, and an absolute floor must clear before the hi
    // claim fires (acoustic >=40, instrumental >=70, danceable >=50; energy/valence/tempo omitted
    // as their distributions are well-spread). Valence words renamed: lyric side owns bright/dark
    // since the 2026-08-27 recalibration; these words describe the SOUND.
    const DIMS = [
      // plain adjectives only — the "more" now lives once on the right ("more than 88%"), so the
      // adjective column stays short and the bars line up in a row (Fuad 2026-07-14).
      { k: "energy",   i: 4, hi: "intense",      lo: "mellow" },
      { k: "valence",  i: 5, hi: "sunny",         lo: "sombre" },
      { k: "tempo",    i: 7, hi: "fast",           lo: "slow" },
      { k: "acoustic", i: 6, hi: "acoustic",       lo: null,  min: 40 },
      { k: "dance",    i: 8, hi: "danceable",      lo: null,  min: 50 },
      { k: "instr",    i: 9, hi: "instrumental",   lo: null,  min: 70 },
    ];
    const out = [];
    for (const d of DIMS) {
      const raw = f[d.i];
      const p = tastePctlMid(d.k, raw); if (p == null) continue;
      // TEMPO SANITY (2026-08-27, ゆきこさん: energy 94 yet "slow"): the dump's beat tracker
      // half-times songs with mixed passages, so a tempo claim must not contradict energy —
      // a frantic track is never "slow", a dead-calm one is never "fast". Suppress, don't fix:
      // we can't recover the true BPM, only refuse the absurd sentence.
      if (d.k === "tempo" && ((p <= 15 && f[4] >= 80) || (p >= 85 && f[4] <= 20))) continue;
      if (p >= 85 && d.hi && (d.min == null || raw >= d.min)) out.push({ phrase: d.hi, pct: p, ex: p - 50 });        // above most of your rotation
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
      {/* Back button at page left ABOVE the cover — original home; both 2026-08-28 experiments
          reverted on the owner's call ("not over the cover" = regression). */}
      <button className="r-back" style={{ marginBottom: 6 }} onClick={() => go(data.albumId ? "album" : "explore", data.albumId || undefined)}>← {data.album || "explore"}</button>
      <div className="tv-head" style={{ display: "flex", gap: 26, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 24 }}>
        <GenCover hue={hue} name={data.title} image={data.cover} thumb={data.cover} size={132} radius={6} />
        <div style={{ flex: 1, minWidth: 240 }}>
          <div className="r-kicker">Song{data.trackNo ? ` · track ${data.trackNo}` : ""}{data.dur ? ` · ${mmss(data.dur)}` : ""}{data.explicit ? " · explicit" : ""}</div>
          <h1 className="r-title" style={{ fontSize: data.title.length > 30 ? "clamp(22px,3vw,36px)" : data.title.length > 26 ? "clamp(26px,3.6vw,44px)" : data.title.length > 18 ? "clamp(30px,4.2vw,52px)" : "clamp(36px,5vw,64px)" }}>{data.title}<span className="dot">.</span></h1>
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
      {(tasteStandouts.length > 0 || lyrVal != null) && (
        <div className="tv-subrow" data-both={!!(tasteStandouts.length > 0 && lyrVal != null)}>
          {tasteStandouts.length > 0 && (
            <div className="tv-taste">
              <div className="tv-taste-h">Next to everything you play, it's…</div>
              <div className="tv-taste-list">
                {tasteStandouts.map(s => (
                  <div className="tv-taste-row" key={s.phrase}>
                    <span className="tv-taste-adj">{s.phrase}</span>
                    <div className="tv-taste-bar"><i style={{ width: s.pct + "%", background: `oklch(0.62 0.15 ${hue})` }} /></div>
                    <span className="tv-taste-pct">more than {Math.round(s.pct)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {(lyrVal != null) && (
            <div className="tv-mood">
              {audVal != null && (
                <div className="tv-mood-axis">
                  <span className="tv-mood-k">Sounds</span>
                  <div className="tv-mood-bar"><i style={{ width: audVal + "%", background: moodColor(audVal) }} /></div>
                  <span className="tv-mood-v">{audVal}</span>
                </div>
              )}
              <div className="tv-mood-axis">
                <span className="tv-mood-k">Reads</span>
                <div className="tv-mood-bar"><i style={{ width: lyrVal + "%", background: moodColor(lyrVal) }} /></div>
                <span className="tv-mood-v">{lyrVal}</span>
              </div>
              {/* The NRC emotion caption + the Sounds/Reads axis help. THEMES used to supersede
                  this caption here (pilot 2026-08-08) but moved into "Where it sits" (2026-08-16,
                  Fuad) — so this card always carries its own note again. */}
              <div className="tv-mood-note">
                <span className="txt">
                  {/* COPY MATRIX (Fuad 2026-08-27): on recalibrated rows the tone word must be
                      the whole-lyric REGISTER (reg), never the NRC word-count emotion (lyrEmo),
                      and the consensus sentence is recomputed from audVal vs the CURRENT lyrVal.
                      Rows without reg (legacy 4-element mood, or mark set but index missing) fall
                      back to the unmarked lyrEmo copy so 4-element rows still render correctly. */}
                  {(mood && mood[3] === 2 && reg)
                    ? <>Reads <b style={{ color: regColor }}>{reg}</b>; the sound carries it as triumph.</>
                    : (mood && mood[3] === 1 && reg)
                      ? (audVal == null
                          ? <>Reads <b style={{ color: regColor }}>{reg}</b>.</>
                          : (divergent
                              ? (audVal > lyrVal
                                  ? <>Sounds bright, reads <b style={{ color: regColor }}>{reg}</b>.</>
                                  : <>Sounds heavy, reads <b style={{ color: regColor }}>{reg}</b>.</>)
                              : <>Sound and words agree — <b style={{ color: regColor }}>{reg}</b>.</>))
                      : (audVal == null
                          ? (lyrEmo ? <>Lyric tone reads <b>{lyrEmo}</b>.</> : null)
                          : <>
                              {divergent
                                ? (audVal > lyrVal ? <>Bright sound, bleak words.</> : <>Heavy sound, hopeful words.</>)
                                : <>Sound and words agree.</>}
                              {lyrEmo ? <> Lyric tone reads <b>{lyrEmo}</b>.</> : null}
                            </>)}
                  {/* PROVENANCE MARK (Fuad 2026-08-28): mood[3]===1 = valence re-scored by
                      the local whole-lyric model (the surgical pass that caught bright-lexical
                      masks over dark songs); unmarked rows are plain NRC lexicon. Lives in the
                      note row — the axis grid is a fixed 3-column and must not gain children. */}
                  {mood && mood[3] === 1 && (
                    <span className="tv-mood-src" title="Valence re-scored by a whole-lyric language model — the word-count lexicon was misled by bright vocabulary over dark meaning. Unmarked tracks are plain NRC lexicon scores.">calibrated</span>
                  )}
                  {mood && mood[3] === 2 && (
                    <span className="tv-mood-src" title="Reads furious, feels triumphant — the whole-lyric model rated this lyric's felt energy bright while its register stays dark, so the lexicon value was kept and the tension is named instead.">cathartic</span>
                  )}
                </span>
                <span className="tv-mood-help" tabIndex={0}>
                  <i>?</i>
                  <span className="tv-mood-tip">
                    <b>Sounds</b> — how upbeat the music itself is: Spotify&#8217;s audio positivity, 0 gloomy &#8594; 100 euphoric.<br />
                    <b>Reads</b> — how positive the lyrics are on the page, scored word-by-word against an emotion lexicon in the song&#8217;s language. Tracks tagged <b>calibrated</b> were re-scored by a whole-lyric model that reads meaning, not just vocabulary — it catches songs wearing bright words over dark content. Tracks tagged <b>cathartic</b> kept their lexicon score but the register tension is named — the model read the felt energy as bright while the lyric stays dark.<br />
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

      {/* PILOT: the words-annotation overlay — sits with the reads, gated on words-layer.js carrying this id */}
      {/* words-layer pilot phased out 2026-08-27 (Fuad: "the reads all come from lyrics anyway") — component + data kept for possible repurpose */}
      {/* <TrackWords id={id} /> */}

      {f ? (
        <div className="tv-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0,1.1fr) minmax(0,1fr)", gap: "var(--gap)", marginBottom: "var(--gap)" }}>
          <div className="r-card" style={{ padding: "16px 18px" }}>
            <div className="r-card-h" style={{ padding: 0, marginBottom: 6 }}><span className="lbl"><b>Audio DNA</b></span>
              <span className="meta">Spotify features</span></div>
            {/* The 2026-08-28 flip REVERTED same day with the album block (the auto-sized label
                column collapsed its bars). Graph left / labels right restored; flex-start kept. */}
            <div className="tv-dna-row" style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ flex: "0 0 auto", width: 188 }}>
                <AudioRadar axes={radar} hue={hue} avg={radarLibAvg()} />
                <div className="r-mono" style={{ fontSize: 8.5, color: "var(--ink-faint)", textAlign: "center", marginTop: 2 }}>solid = this song · dashed = your average</div>
              </div>
              <div style={{ flex: 1, minWidth: 170, display: "grid", gap: 8, alignContent: "start" }}>
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
              {/* THEMES (pilot 2026-08-08, relocated here 2026-08-16 per Fuad) — reasoned from the
                  fable read, not the NRC lexicon. Stacked at the bottom of "Where it sits" behind a
                  hairline, matching how stacked sub-sections separate elsewhere in this view. */}
              {themes && themes.length > 0 && (
                <div style={{ marginTop: 12, borderTop: "1px solid var(--rule)", paddingTop: 11 }}>
                  <div className="r-mono" style={{ fontSize: 9, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: 7 }}>Themes</div>
                  <div className="tv-themes" style={{ margin: 0 }}>
                    {themes.map(t => <span key={t} className="tv-theme">{t}</span>)}
                    <span className="tv-mood-help" tabIndex={0}>
                      <i>?</i>
                      <span className="tv-mood-tip">
                        The threads the lyrics keep returning to, reasoned from a close read of the words rather than counted off a lexicon. The first is the song&#8217;s spine; the rest are what it brushes against.
                      </span>
                    </span>
                  </div>
                </div>
              )}
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
          <div className="r-mono" style={{ fontSize: 11, color: "var(--ink-faint)" }}>No audio features or lyric read matched for this track.</div>
          {data.series.length > 0 && <div style={{ marginTop: 10 }}><Sparkline series={data.series} hue={hue} /></div>}
          {/* no audio features → no "Where it sits" card, so themes land here instead (2026-08-16) */}
          {themes && themes.length > 0 && (
            <div style={{ marginTop: 12, borderTop: "1px solid var(--rule)", paddingTop: 11 }}>
              <div className="r-mono" style={{ fontSize: 9, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: 7 }}>Themes</div>
              <div className="tv-themes" style={{ margin: 0 }}>
                {themes.map(t => <span key={t} className="tv-theme">{t}</span>)}
              </div>
            </div>
          )}
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
                  {b.also.map(([s, n, ts], i) => (
                    // link straight to the counterpart's own version when we can key it;
                    // artist page only as fallback (Fuad: "hyperlink direct to the cover")
                    <React.Fragment key={s}>{i > 0 ? " · " : ""}<a onClick={() => ts ? go("track", s + "~" + ts) : go("artist", s)} style={{ cursor: "pointer", borderBottom: "1px dotted var(--ink-faint)" }}>{n}{ts ? " →" : ""}</a></React.Fragment>
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

Object.assign(window, { AlbumView, TrackView });
