// rotation-views2.jsx — Sound Map · Eras scrubber · Artist drilldown + Live
// exports: SoundMapView, ErasView, ArtistView, LiveView

// ════════════════════════ SOUND MAP / GENRES ════════════════════════
function SoundMapView({ t, setPop }) {
  const R = window.ROTATION;
  const [ref, seen] = useInView();
  const [mode, setMode] = React.useState("map"); // map | families
  const [activeFam, setActiveFam] = React.useState(null);
  const fams = R.GENRES;
  const allSubs = fams.flatMap(f => f.subs.map(s => ({ ...s, family: f.family, hue: f.hue })));
  const maxW = Math.max(...allSubs.map(s => s.w));
  const totalW = allSubs.reduce((s, x) => s + x.w, 0);

  return (
    <div className="r-view" ref={ref}>
      <div className="r-viewhead">
        <div>
          <div className="r-kicker">Taxonomy · {allSubs.length} subgenres</div>
          <h1 className="r-title">The shape of <em>loud</em><span className="dot">.</span></h1>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <p className="r-lede" style={{ marginBottom: 2 }}>Every tag you've scrobbled, placed by <b>texture</b> (organic ↔ electronic)
            and <b>intensity</b> (calm ↔ violent). Bigger = more played.</p>
          <div className="r-seg">
            {["map", "families"].map(m => <button key={m} data-on={mode === m} onClick={() => setMode(m)}>{m}</button>)}
          </div>
        </div>
      </div>

      {mode === "map" && (
        <div className="m-stack" style={{ display: "grid", gridTemplateColumns: "1fr 210px", gap: "var(--gap)", alignItems: "start" }}>
          <div className="r-card" style={{ padding: 0, position: "relative", overflow: "hidden" }}>
            <SoundScatter subs={allSubs} maxW={maxW} seen={seen} activeFam={activeFam}
              expressive={t.chart === "expressive"} setPop={setPop} />
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <div className="r-mono" style={{ fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: 2 }}>Families</div>
            {fams.map(f => {
              const w = f.subs.reduce((s, x) => s + x.w, 0);
              const on = activeFam === f.family;
              return (
                <div key={f.family} onMouseEnter={() => setActiveFam(f.family)} onMouseLeave={() => setActiveFam(null)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 9px", borderRadius: 5, cursor: "default",
                    background: on ? "var(--bg-3)" : "transparent", transition: ".15s" }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: `oklch(0.62 0.16 ${f.hue})`, flex: "none" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.family}</div>
                    <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)" }}>{(w / totalW * 100).toFixed(0)}% · {fmtK(w)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {mode === "families" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px,1fr))", gap: "var(--gap)" }}>
          {fams.map((f, fi) => {
            const fw = f.subs.reduce((s, x) => s + x.w, 0);
            const fmax = Math.max(...f.subs.map(s => s.w));
            return (
              <div key={f.family} className="r-card" style={{ padding: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: `oklch(0.62 0.16 ${f.hue})` }} />
                  <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 20 }}>{f.family}</div>
                  <span className="r-mono" style={{ marginLeft: "auto", fontSize: 10, color: "var(--ink-faint)" }}>{fmtK(fw)}</span>
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {f.subs.slice().sort((a, b) => b.w - a.w).map((s, si) => (
                    <div key={s.name}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <span style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>{s.name}</span>
                        <span className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)" }}>{fmt(s.w)}</span>
                      </div>
                      <div style={{ height: 6, background: "var(--bg-3)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: (seen ? s.w / fmax * 100 : 0) + "%",
                          background: t.chart === "expressive" ? `oklch(0.6 0.16 ${f.hue})` : "var(--accent)", opacity: .85,
                          borderRadius: 3, transition: `width .9s cubic-bezier(.3,.8,.3,1) ${(fi * 0.04 + si * 0.05)}s` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SoundScatter({ subs, maxW, seen, activeFam, expressive, setPop }) {
  const W = 1000, H = 560, pad = 46;
  const px = (x) => pad + x * (W - pad * 2);
  const py = (y) => H - pad - y * (H - pad * 2);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      {/* grid + axes */}
      {[.25, .5, .75].map(g => (
        <g key={g}>
          <line x1={px(g)} y1={pad} x2={px(g)} y2={H - pad} stroke="var(--rule)" strokeWidth="1" />
          <line x1={pad} y1={py(g)} x2={W - pad} y2={py(g)} stroke="var(--rule)" strokeWidth="1" />
        </g>
      ))}
      <rect x={pad} y={pad} width={W - pad * 2} height={H - pad * 2} fill="none" stroke="var(--rule-2)" strokeWidth="1" />
      {/* axis labels */}
      <text x={pad} y={H - 16} fill="var(--ink-faint)" fontSize="11" fontFamily="var(--mono)" style={{ letterSpacing: ".1em" }}>ORGANIC</text>
      <text x={W - pad} y={H - 16} fill="var(--ink-faint)" fontSize="11" fontFamily="var(--mono)" textAnchor="end" style={{ letterSpacing: ".1em" }}>ELECTRONIC</text>
      <text x={20} y={H - pad} fill="var(--ink-faint)" fontSize="11" fontFamily="var(--mono)" transform={`rotate(-90 20 ${H - pad})`} style={{ letterSpacing: ".1em" }}>CALM</text>
      <text x={20} y={pad + 56} fill="var(--ink-faint)" fontSize="11" fontFamily="var(--mono)" transform={`rotate(-90 20 ${pad + 56})`} textAnchor="end" style={{ letterSpacing: ".1em" }}>VIOLENT</text>
      {subs.map((s, i) => {
        // present = has weight in the current slice. Absent subs animate their radius to 0
        // (and fade) rather than unmounting, so the field morphs smoothly between year filters.
        const present = s.w > 0;
        const r = present ? 10 + (s.w / maxW) * 40 : 0;
        const dim = activeFam && activeFam !== s.family;
        const col = expressive ? `oklch(0.62 0.17 ${s.hue})` : "var(--accent)";
        return (
          <g key={s.name} style={{ cursor: present ? "default" : "default",
            opacity: seen ? (present ? (dim ? 0.16 : 1) : 0) : 0,
            transform: seen ? "scale(1)" : "scale(0)", transformOrigin: `${px(s.x)}px ${py(s.y)}px`,
            transition: `opacity .45s cubic-bezier(.3,.8,.3,1) ${i * 0.012}s, transform .6s cubic-bezier(.3,1.4,.5,1) ${i * 0.018}s`,
            pointerEvents: present ? "auto" : "none" }}
            onMouseEnter={() => setPop({ x: px(s.x) / W * (window.innerWidth - 230), y: 280, title: s.name, pip: s.hue,
              meta: s.family, rows: [["plays", fmt(s.w)], ["texture", s.x < .5 ? "organic" : "electronic"], ["intensity", Math.round(s.y * 100) + "%"]] })}
            onClick={() => setPop({ x: Math.min(Math.max(px(s.x) / W * window.innerWidth, 140), window.innerWidth - 140), y: 280, title: s.name, pip: s.hue,
              meta: s.family, rows: [["plays", fmt(s.w)], ["texture", s.x < .5 ? "organic" : "electronic"], ["intensity", Math.round(s.y * 100) + "%"]] })}
            onMouseLeave={() => setPop(null)}>
            <circle cx={px(s.x)} cy={py(s.y)} r={r} fill={col} fillOpacity={expressive ? .28 : .14} stroke={col} strokeWidth="1.4"
              style={{ transition: "r .55s cubic-bezier(.3,.8,.3,1)" }} />
            {r > 18 && <text x={px(s.x)} y={py(s.y)} textAnchor="middle" dominantBaseline="middle" fill="var(--ink)"
              fontSize={Math.min(13, r / 3)} fontFamily="var(--sans)" fontWeight="500"
              style={{ transition: "font-size .55s" }}>
              {s.name.length > 13 ? s.name.split(" ")[0] : s.name}</text>}
          </g>
        );
      })}
    </svg>
  );
}

// ════════════════════════ ERAS (time scrubber) ════════════════════════
const ERA_HEADLINE = {
  2014: ["Teenage maximalism", "Nu-metal, big-beat rave, and everything turned up."],
  2015: ["First breakdowns", "The metalcore deep-dive begins."],
  2016: ["Heavier, faster", "Djent, Australia, and festival summers."],
  2017: ["Industrial nights", "NIN and Rammstein run the small hours."],
  2018: ["Wider nets", "Post-hardcore meets the first Japanese imports."],
  2019: ["Crossover", "Electronicore, Crossfaith, the line blurs."],
  2020: ["Lockdown loops", "Weirder, lonelier, heavier."],
  2021: ["Hyperpop bleeds in", "Digital hardcore and witch house arrive."],
  2022: ["Tokyo calling", "Japanese underground takes the wheel."],
  2023: ["No-genre era", "Haru Nemuri, Machine Girl, all volume."],
  2024: ["Ocean Grove on repeat", "A single record eats the year."],
  2025: ["All of it, at once", "Forty genres deep and still digging."],
};
function ErasView({ t, go }) {
  const R = window.ROTATION;
  const eras = R.ERAS;
  const [idx, setIdx] = React.useState(eras.length - 1);
  const [playing, setPlaying] = React.useState(false);
  const era = eras[idx];
  const headline = ERA_HEADLINE[era.year] || ["", ""];
  const maxPlays = Math.max(...era.top.map(x => x.plays));
  const totalsMax = Math.max(...eras.map(e => e.total));

  React.useEffect(() => {
    if (!playing) return;
    const tmr = setInterval(() => setIdx(i => {
      if (i >= eras.length - 1) { setPlaying(false); return i; }
      return i + 1;
    }), 1400);
    return () => clearInterval(tmr);
  }, [playing]);

  return (
    <div className="r-view">
      <div className="r-viewhead">
        <div>
          <div className="r-kicker">Eras · {eras[0].year} — {eras[eras.length - 1].year}</div>
          <h1 className="r-title">How it <em>changed</em><span className="dot">.</span></h1>
        </div>
        <p className="r-lede">Scrub a decade of scrobbles. The same person at fifteen and at twenty-six —
          <b> watch the taste migrate</b> from rave-era nu-metal to Tokyo's underground.</p>
      </div>

      <div className="era-grid" style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "var(--gap)", alignItems: "start" }}>
        {/* year + headline */}
        <div className="r-card era-year" style={{ padding: 24, position: "sticky", top: 84 }}>
          <div className="r-stat-n" style={{ fontSize: 76, lineHeight: .9 }}>{era.year}</div>
          <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 22, marginTop: 14, lineHeight: 1.1 }}>{headline[0]}</div>
          <div style={{ color: "var(--ink-soft)", fontSize: 13.5, marginTop: 8, lineHeight: 1.5 }}>{headline[1]}</div>
          <div style={{ display: "flex", gap: 18, marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--rule)" }}>
            <div><div className="r-stat-n" style={{ fontSize: 24 }}>{fmt(era.total)}</div>
              <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: ".1em", textTransform: "uppercase", marginTop: 4 }}>scrobbles</div></div>
            <div><div className="r-stat-n" style={{ fontSize: 24 }}>{era.top.length}</div>
              <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: ".1em", textTransform: "uppercase", marginTop: 4 }}>core artists</div></div>
          </div>
          <button className="r-playbtn" onClick={() => { if (idx >= eras.length - 1) setIdx(0); setPlaying(p => !p); }}>
            {playing ? "❚❚ Pause" : "▶ Play the decade"}
          </button>
        </div>

        {/* racing bars + year detail */}
        <div style={{ display: "grid", gap: "var(--gap)" }}>
          <div className="r-card" style={{ padding: "22px 24px" }}>
            <div style={{ display: "grid", gap: 9 }}>
              {era.top.map((a, i) => (
                <div key={a.id} style={{ display: "grid", gridTemplateColumns: "26px 30px 1fr auto", gap: 11, alignItems: "center",
                  cursor: "pointer", transition: "transform .5s cubic-bezier(.3,.8,.3,1)" }}
                  onClick={() => go("artist", a.id)}>
                  <span className="r-mono" style={{ fontSize: 11, color: "var(--ink-faint)" }}>{String(i + 1).padStart(2, "0")}</span>
                  <GenCover hue={a.hue} name={a.name} size={30} radius={3} />
                  <div style={{ position: "relative", height: 28, background: "var(--bg-3)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ position: "absolute", inset: 0, width: (a.plays / maxPlays * 100) + "%",
                      background: t.chart === "expressive" ? `oklch(0.58 0.16 ${a.hue})` : "var(--accent-dim)", opacity: .85,
                      borderRadius: 3, transition: "width .8s cubic-bezier(.3,.8,.3,1)" }} />
                    <span style={{ position: "absolute", left: 11, top: 0, height: 28, display: "flex", alignItems: "center",
                      fontSize: 12.5, fontWeight: 600, textShadow: "0 1px 4px rgba(0,0,0,.6)", whiteSpace: "nowrap" }}>{a.name}</span>
                  </div>
                  <span className="r-mono" style={{ fontSize: 11, color: "var(--ink-soft)" }}>{fmt(a.plays)}</span>
                </div>
              ))}
            </div>
          </div>
          {(() => {
            const yr = (R.YEARS || []).find(y => y.year === era.year);
            if (!yr || yr.plays < 500) return null;
            const Stat = ({ k, v, sub, onClick }) => (
              <div className="era-d-stat" data-link={!!onClick} onClick={onClick}>
                <div className="r-mono era-d-k">{k}</div>
                <div className="era-d-v">{v}</div>
                {sub && <div className="era-d-sub">{sub}</div>}
              </div>
            );
            return (
              <div className="r-card era-detail" style={{ padding: "18px 22px" }}>
                <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 14 }}>
                  {yr.year} in detail
                </div>
                <div className="era-d-grid">
                  {yr.topTrack && <Stat k="Top track" v={yr.topTrack.title}
                    sub={`${yr.topTrack.artist} · ${yr.topTrack.plays} plays`}
                    onClick={() => go("artist", R.slug(yr.topTrack.artist))} />}
                  {yr.topAlbum && <Stat k="Top album" v={yr.topAlbum.title}
                    sub={`${yr.topAlbum.artist} · ${yr.topAlbum.plays} plays`}
                    onClick={() => go("artist", R.slug(yr.topAlbum.artist))} />}
                  {yr.peakDay && <Stat k="Peak day" v={yr.peakDay.plays + " plays"} sub={yr.peakDay.date} />}
                  <Stat k="Hours" v={fmt(yr.hours)} sub={`${yr.activeDays} active days`} />
                  <Stat k="Artists touched" v={fmt(yr.artists)} sub={`${fmt(yr.tracks)} tracks`} />
                  {yr.discoveries[0] && <Stat k="Top discovery" v={yr.discoveries[0].name}
                    sub={`${yr.discoveries[0].plays} plays · first heard ${yr.year}`}
                    onClick={() => go("artist", R.slug(yr.discoveries[0].name))} />}
                  {yr.gainer && yr.gainer.delta > 50 && <Stat k="Biggest jump" v={yr.gainer.name}
                    sub={`${yr.gainer.prev} → ${yr.gainer.plays} (+${yr.gainer.delta})`}
                    onClick={() => go("artist", R.slug(yr.gainer.name))} />}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* scrubber */}
      <div className="r-card" style={{ padding: "16px 24px 20px", marginTop: "var(--gap)" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 56, marginBottom: 10 }}>
          {eras.map((e, i) => (
            <div key={e.year} onClick={() => { setPlaying(false); setIdx(i); }}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <div style={{ width: "100%", maxWidth: 38, height: e.total / totalsMax * 44 + 4, borderRadius: "3px 3px 0 0",
                background: i === idx ? "var(--accent)" : "var(--rule-2)", transition: "background .2s, height .3s" }} />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {eras.map((e, i) => (
            <div key={e.year} onClick={() => { setPlaying(false); setIdx(i); }}
              className="r-mono" style={{ flex: 1, textAlign: "center", fontSize: 9.5, cursor: "pointer",
                color: i === idx ? "var(--accent)" : "var(--ink-faint)", fontWeight: i === idx ? 600 : 400 }}>
              {"'" + String(e.year).slice(2)}</div>
          ))}
        </div>
      </div>
      <style>{`
        .r-playbtn { margin-top: 20px; width: 100%; font-family: var(--mono); font-size: 11px; letter-spacing: .12em;
          text-transform: uppercase; padding: 12px; border-radius: 6px; border: 1px solid var(--accent);
          background: var(--accent-bg); color: var(--accent-ink); cursor: pointer; transition: .15s; }
        .r-playbtn:hover { background: var(--accent); color: #0c0a08; }
        .era-d-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 18px 22px; }
        .era-d-stat { min-width: 0; }
        .era-d-stat[data-link="true"] { cursor: pointer; }
        .era-d-stat[data-link="true"]:hover .era-d-v { color: var(--accent); }
        .era-d-k { font-size: 9.5px; color: var(--ink-faint); letter-spacing: .12em; text-transform: uppercase; margin-bottom: 4px; }
        .era-d-v { font-family: var(--serif); font-style: italic; font-size: 18px; line-height: 1.15;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .era-d-sub { font-size: 11.5px; color: var(--ink-soft); margin-top: 3px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        @media (max-width: 860px){
          .era-grid { grid-template-columns: 1fr !important; }
          .era-year { position: static !important; top: auto !important; }
          .era-year .r-stat-n[style*="76"] { font-size: 58px !important; }
          .era-d-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </div>
  );
}

// ════════════════════════ ARTIST DRILLDOWN ════════════════════════
const DNA_AXES = ["NRG", "MOOD", "ACOU", "BPM", "DANCE", "INSTR"];

// Per-artist album/song streamgraph (reuses the Journey StreamGraph). Flow data lives in a
// separate artist-flow.js, lazy-loaded on the first artist-page visit so first paint stays lean.
function ArtistFlow({ id, hue }) {
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
  const onPick = canDrill ? ((s, i) => { if (!s.mute && (flow.albums[i].tracks || []).length) { setDrill(i); setHi(-1); } }) : null;

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
          : drillAlbum ? "the songs on this record, over time" : "your top songs across the years"}
      </div>
    </div>
  );
}

// Lightweight page for an explorable artist that isn't in the kept top-205 (no full per-artist
// build). Shows what the EXPLORE record carries: plays, subgenres, listeners, debut, year shape.
// MiniArtistDetail — top tracks/albums for a long-tail artist, lazy-loaded from artist-detail.js
// (interned, fetched once on first mini-page visit so the main payload stays lean).
function MiniArtistDetail({ id, go }) {
  const [d, setD] = React.useState(window.ROTATION_ADETAIL || null);
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
  const Col = ({ title, rows }) => (rows && rows.length) ? (
    <div className="r-card" style={{ padding: 18 }}>
      <div className="r-card-h" style={{ padding: 0, marginBottom: 10 }}><span className="lbl"><b>{title}</b></span></div>
      {rows.map(([ti, p], i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 2px", borderBottom: "1px solid var(--rule)" }}>
          <span className="r-mono" style={{ fontSize: 10, color: "var(--ink-faint)", width: 18 }}>{String(i + 1).padStart(2, "0")}</span>
          <span style={{ flex: 1, minWidth: 0, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{NM[ti]}</span>
          <span className="r-mono" style={{ fontSize: 11, color: "var(--ink-soft)" }}>{fmt(p)}</span>
        </div>))}
    </div>) : null;
  return (
    <div style={{ display: "grid", gap: "var(--gap)" }}>
      {rec.bio && <div className="r-card" style={{ padding: "16px 20px", fontSize: 13.5, lineHeight: 1.6, color: "var(--ink-soft)" }}>{rec.bio}</div>}
      {(rec.t || rec.al) && <div className="m-stack" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--gap)" }}>
        <Col title="Top tracks" rows={rec.t} />
        <Col title="Top albums" rows={rec.al} />
      </div>}
      {rec.sim && rec.sim.length > 0 && <div className="r-card" style={{ padding: 18 }}>
        <div className="r-card-h" style={{ padding: 0, marginBottom: 14 }}><span className="lbl"><b>Sounds like</b></span><span className="meta">last.fm</span></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(110px,1fr))", gap: 12 }}>
          {rec.sim.map((name, i) => { const rid = (R.idForName && R.idForName(name)) || R.slug(name); const s = R.byId[rid] || (R.expById && R.expById[rid]); const played = !!s || (R.played && R.played(name)); return (
            <div key={name + i} onClick={() => s && go("artist", rid)} style={{ cursor: s ? "pointer" : "default", opacity: played ? 1 : 0.62 }}>
              <GenCover hue={s ? s.hue : 210} name={name} size={"100%"} style={{ aspectRatio: "1", width: "100%", height: "auto" }} radius={4} />
              <div style={{ fontSize: 12, lineHeight: 1.2, marginTop: 6 }}>{name}</div>
              {s ? <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)" }}>{fmt(s.plays)} plays →</div> : played ? <div className="r-mono" style={{ fontSize: 9, color: "var(--accent-dim)" }}>scrobbled</div> : <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)" }}>not yet</div>}
            </div>); })}
        </div>
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
      {R.AUDIO && R.AUDIO[a.id] && (
        <div className="r-card" style={{ padding: 18, marginBottom: "var(--gap)" }}>
          <div className="r-card-h" style={{ padding: 0, marginBottom: 14 }}><span className="lbl"><b>Sounds like</b></span><span className="meta">by sound</span></div>
          <SoundSimilar id={a.id} go={go} />
        </div>
      )}
      <div style={{ marginBottom: "var(--gap)" }}><ArtistFlow id={a.id} hue={a.hue} /></div>
      <MiniArtistDetail id={a.id} hue={a.hue} go={go} />
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
  const [count, setCount] = React.useState(6);
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
        <div className="r-seg r-seg-sm">{[6, 10, 20].map(n => <button key={n} data-on={count === n} onClick={() => setCount(n)}>{n}</button>)}</div>
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(108px,1fr))", gap: 12 }}>
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
function ArtistMeta({ gender, life, size }) {
  const g = genderGlyph(gender), b = lifeBadge(life);
  if (!g && !b) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 9, flexWrap: "wrap" }}>
      {g && <span title={g.label} style={{ fontSize: size || 16, lineHeight: 1, color: "var(--ink-soft)" }}>{g.ch}</span>}
      {b && <span className="r-mono" style={{ fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", padding: "2.5px 8px", borderRadius: 999, border: "1px solid " + (b.tone === "active" ? "oklch(0.6 0.13 150 / .5)" : "var(--rule-2)"), color: b.tone === "active" ? "oklch(0.72 0.15 150)" : "var(--ink-faint)" }}>{b.txt}</span>}
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
    <div className="r-view" ref={ref}>
      <button className="r-back" onClick={() => go("explore")}>← explore</button>

      {/* header */}
      <div style={{ display: "flex", gap: 26, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 30 }}>
        <GenCover hue={a.hue} name={a.name} size={150} radius={6} />
        <div style={{ flex: 1, minWidth: 240 }}>
          <div className="r-kicker">#{String(a.rank).padStart(2, "0")} all time
            {a.origin && a.origin.city ? ` · ${a.origin.city.toUpperCase()}, ${a.origin.country}` : a.country ? ` · ${a.country.toUpperCase()}` : ""}
            {a.debut ? ` · EST. ${a.debut}` : ""}</div>
          <h1 className="r-title" style={{ fontSize: "clamp(36px,5vw,64px)" }}>{a.name}<span className="dot">.</span></h1>
          <ArtistMeta gender={a.gender} life={a.life} size={18} />
          <div style={{ display: "flex", gap: 7, marginTop: 14, flexWrap: "wrap" }}>
            {a.tags.map(g => <span key={g} className="r-chip link" title={`Explore ${g} →`} onClick={() => go("explore", g)}>{g}</span>)}
          </div>
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

      {/* bio — last.fm summary, rendered only when present */}
      {a.bio && a.bio.length > 40 && (
        <div className="r-card" style={{ padding: "18px 22px", marginBottom: "var(--gap)" }}>
          <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", letterSpacing: ".14em", textTransform: "uppercase", marginBottom: 10 }}>
            About
          </div>
          <p style={{ fontFamily: "var(--serif)", fontSize: 15.5, lineHeight: 1.55, color: "var(--ink-soft)", margin: 0 }}>
            {a.bio.length > 520 ? a.bio.slice(0, 520).replace(/\s+\S*$/, "") + "…" : a.bio}
          </p>
        </div>
      )}

      <div className="m-stack" style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "var(--gap)", alignItems: "start" }}>
        {/* sound DNA */}
        <div className="r-card" style={{ padding: 18 }}>
          <div className="r-card-h" style={{ padding: 0, marginBottom: 4 }}><span className="lbl"><b>Sound DNA</b></span></div>
          <Radar axes={DNA_AXES} values={dna} values2={avg} run={seen} size={224} />
          <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", textAlign: "center", marginTop: 4 }}>
            solid = {a.name.split(" ")[0]} · dashed = your average · {a.am ? "measured" : "inferred"}
          </div>
          {af && <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 9 }}>
            {[
              { k: "tempo", v: Math.round(50 + a.audio.tempo * 140), u: " bpm", f: a.audio.tempo },
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
          </div>}
        </div>

        <div style={{ display: "grid", gap: "var(--gap)" }}>
          {/* how they played out — album/song streamgraph (lazy-loaded), right after the Sound DNA */}
          <ArtistFlow id={a.id} hue={a.hue} />

          {/* sounds like — last.fm + by-sound; both link to kept OR explorable (mini) pages */}
          <div className="r-card" style={{ padding: 18 }}>
            <div className="r-card-h" style={{ padding: 0, marginBottom: 14 }}>
              <span className="lbl"><b>Sounds like</b></span>
              <div className="r-seg r-seg-sm">
                {[["lastfm", "last.fm"], ["sound", "by sound"]].map(([k, l]) => <button key={k} data-on={simTab === k} onClick={() => setSimTab(k)}>{l}</button>)}
              </div></div>
            {simTab === "sound" ? <SoundSimilar id={a.id} go={go} /> : (() => {
              const items = a.similar.slice(0, 6).map((sid, i) => { const name = a.similarNames[i]; const rid = (R.idForName && R.idForName(name)) || R.slug(name); const rec = R.byId[rid] || (R.expById && R.expById[rid]); return { name, navId: rec ? rid : null, hue: rec ? rec.hue : (a.hue + 40 + i * 25) % 360, plays: rec ? rec.plays : null, played: !!rec || (R.played && R.played(name)) }; });
              if (!items.length) return <div className="r-mono" style={{ fontSize: 11, color: "var(--ink-faint)" }}>no last.fm matches here.</div>;
              return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 12 }}>
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

          {/* family tree — members + shared-member lineage (MusicBrainz + Discogs) */}
          {((a.members && a.members.length > 0) || (a.connections && a.connections.length > 0)) && (
            <div className="r-card" style={{ padding: 18 }}>
              <div className="r-card-h" style={{ padding: 0, marginBottom: 14 }}>
                <span className="lbl"><b>Family tree</b></span>
                <span className="meta">musicbrainz · discogs</span></div>
              {a.members && a.members.length > 0 && (
                <div style={{ marginBottom: (a.connections && a.connections.length) ? 16 : 0 }}>
                  <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 8 }}>Members</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {a.members.map(m => <span key={m} className="r-chip" style={{ fontSize: 11 }}>{m}</span>)}
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
          )}

          {/* top tracks + albums */}
          <div className="m-stack" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--gap)" }}>
            <div className="r-card" style={{ padding: 18 }}>
              <div className="r-card-h" style={{ padding: 0, marginBottom: 12 }}>
                <span className="lbl"><b>Top tracks</b></span>
                <span className="meta">{tracks.length} listed</span></div>
              {(tracks.length ? tracks : [{ title: "—", plays: 0 }]).map((tr, i) => (
                <div key={tr.title + i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0",
                  borderBottom: i < tracks.length - 1 ? "1px solid var(--rule)" : "none" }}>
                  <span className="r-mono" style={{ fontSize: 10, color: "var(--ink-faint)", width: 18 }}>{String(i + 1).padStart(2, "0")}</span>
                  <span style={{ fontSize: 13, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tr.title}</span>
                  <span className="r-mono" style={{ fontSize: 10, color: "var(--ink-soft)" }}>{tr.plays ? fmt(tr.plays) : "—"}</span>
                </div>
              ))}
            </div>
            <div className="r-card" style={{ padding: 18 }}>
              <div className="r-card-h" style={{ padding: 0, marginBottom: 12 }}>
                <span className="lbl"><b>Top albums</b></span>
                <span className="meta">{albums.length} listed</span></div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {(albums.length ? albums : []).map((al, i) => (
                  <div key={al.title + i} style={{ width: 78, cursor: "pointer" }} onClick={() => go("album", R.slug(a.name) + "~" + R.slug(al.title))}>
                    <GenCover hue={a.hue} name={al.title} image={al.cover} thumb={al.cover} size={78} radius={3} />
                    <div style={{ fontSize: 10.5, marginTop: 6, lineHeight: 1.2,
                      display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                      overflow: "hidden" }}>{al.title}</div>
                    <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)" }}>{fmt(al.plays)} plays</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

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
      </div>
      <style>{`
        .r-inlib { position: absolute; bottom: 6px; left: 6px; font-size: 7.5px; letter-spacing: .08em; text-transform: uppercase;
          background: var(--accent); color: #0c0a08; padding: 2px 5px; border-radius: 3px; }
        .r-alert { font-family: var(--mono); font-size: 9.5px; letter-spacing: .1em; text-transform: uppercase;
          background: var(--accent-bg); border: 0; color: var(--accent-ink); padding: 8px 12px; border-radius: 5px; cursor: pointer; white-space: nowrap; }
        @media (max-width: 860px){ .r-view > div[style*="260px 1fr"]{ grid-template-columns: 1fr !important; }
          .r-view div[style*="1fr 1fr"]{ grid-template-columns: 1fr !important; } }
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
  const hueOf = (s) => { let h = 0; for (const c of (s || "")) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 360; };

  const data = React.useMemo(() => {
    const M = window.ROTATION_MEDIA; if (!M || !id) return null;
    const sep = id.indexOf("~"); const aSlug = id.slice(0, sep), tSlug = id.slice(sep + 1);
    let bestIdx = -1, bestPlays = -1;
    for (let i = 0; i < M.albums.length; i++) { const al = M.albums[i]; if (al[2] > bestPlays && R.slug(M.artists[al[1]]) === aSlug && R.slug(al[0]) === tSlug) { bestIdx = i; bestPlays = al[2]; } }
    if (bestIdx < 0) return null;
    const al = M.albums[bestIdx], artist = M.artists[al[1]];
    const tracks = [];
    for (const t of M.tracks) if (t[3] === bestIdx) tracks.push({ title: t[0], plays: t[2] });
    tracks.sort((x, y) => y.plays - x.plays);
    return { title: al[0], artist, plays: al[2], firstY: al[3], lastY: al[4], cover: al[6] || "", tracks, trackPlays: tracks.reduce((s, t) => s + t.plays, 0) };
  }, [ready, id]);

  if (!ready) return <div className="r-view"><div className="r-mono" style={{ color: "var(--ink-faint)", padding: 40 }}>loading album…</div></div>;
  if (!data) return <div className="r-view"><button className="r-back" onClick={() => go("explore")}>← explore</button><div className="r-mono" style={{ color: "var(--ink-faint)", padding: 24 }}>Album not found.</div></div>;

  const artistId = R.idForName(data.artist) || R.slug(data.artist);
  const rec = R.byId[artistId] || (R.expById && R.expById[artistId]);
  const known = !!rec;
  const hue = rec ? rec.hue : hueOf(data.artist);
  const subs = rec && rec.s ? rec.s.map(i => R.SUBS[i] && R.SUBS[i].name).filter(Boolean).slice(0, 6) : [];
  const af = R.AUDIO && R.AUDIO[artistId];
  const maxT = Math.max(...data.tracks.map(t => t.plays), 1);
  const yr = data.firstY ? (data.firstY === data.lastY ? `${data.firstY}` : `${data.firstY}–${data.lastY}`) : "";

  return (
    <div className="r-view">
      <button className="r-back" onClick={() => go("explore")}>← explore</button>
      <div style={{ display: "flex", gap: 26, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 26 }}>
        <GenCover hue={hue} name={data.title} image={data.cover} thumb={data.cover} size={150} radius={6} />
        <div style={{ flex: 1, minWidth: 240 }}>
          <div className="r-kicker">Album{yr ? ` · ${yr}` : ""}{data.tracks.length ? ` · ${data.tracks.length} track${data.tracks.length !== 1 ? "s" : ""} played` : ""}</div>
          <h1 className="r-title" style={{ fontSize: "clamp(30px,4.4vw,54px)" }}>{data.title}<span className="dot">.</span></h1>
          <div style={{ color: "var(--ink-soft)", fontSize: 15, marginTop: 6 }}>
            by {known ? <b onClick={() => go("artist", artistId)} style={{ cursor: "pointer", color: "var(--ink)" }}>{data.artist}</b> : data.artist}</div>
          {subs.length > 0 && <div style={{ display: "flex", gap: 7, marginTop: 12, flexWrap: "wrap" }}>
            {subs.map(s => <span key={s} className="r-chip link" title={`Explore ${s} →`} onClick={() => go("explore", s)}>{s}</span>)}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 13, flexWrap: "wrap" }}>
            <a className="r-extlink r-extlink-lf" href={`https://www.last.fm/music/${encodeURIComponent(data.artist)}/${encodeURIComponent(data.title)}`} target="_blank" rel="noopener noreferrer">last.fm ↗</a>
            <a className="r-extlink r-extlink-sp" href={`https://open.spotify.com/search/${encodeURIComponent(data.artist + " " + data.title)}`} target="_blank" rel="noopener noreferrer">Spotify ↗</a>
          </div>
        </div>
        <div style={{ display: "flex", gap: 26 }}>
          <div><div className="r-stat-n" style={{ fontSize: 38 }}>{fmt(data.plays)}</div>
            <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: ".12em", textTransform: "uppercase", marginTop: 5 }}>plays</div></div>
          {af && <div><div className="r-stat-n" style={{ fontSize: 38, color: "var(--accent)" }}>{Math.round(af[1] * 100)}%</div>
            <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: ".12em", textTransform: "uppercase", marginTop: 5 }}>mood</div></div>}
        </div>
      </div>

      <div className="r-card" style={{ padding: "16px 18px" }}>
        <div className="r-card-h" style={{ padding: 0, marginBottom: 10 }}><span className="lbl"><b>Tracks you've played</b></span>
          <span className="meta">{fmt(data.trackPlays)} plays across {data.tracks.length}</span></div>
        <div style={{ display: "grid", gap: 2 }}>
          {data.tracks.map((t, i) => (
            <div key={t.title + i} style={{ display: "grid", gridTemplateColumns: "24px minmax(0,1fr) 72px 46px", gap: 10, alignItems: "center", padding: "7px 4px" }}>
              <span className="r-mono" style={{ fontSize: 10, color: "var(--ink-faint)" }}>{String(i + 1).padStart(2, "0")}</span>
              <div style={{ fontSize: 13, lineHeight: 1.25, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", wordBreak: "break-word" }}>{t.title}</div>
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

Object.assign(window, { SoundMapView, ErasView, ArtistView, AlbumView, LiveView, ConcertRow });
