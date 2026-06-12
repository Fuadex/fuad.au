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

// Lightweight page for an explorable artist that isn't in the kept top-205 (no full per-artist
// build). Shows what the EXPLORE record carries: plays, subgenres, listeners, debut, year shape.
function MiniArtistView({ a, go }) {
  const R = window.ROTATION;
  const subs = (a.s || []).map(i => R.SUBS[i] && R.SUBS[i].name).filter(Boolean);
  const years = React.useMemo(() => Object.keys(R.CLOCK_BY_YEAR).map(Number).sort((x, y) => x - y), []);
  const spark = a.yp ? years.map(y => a.yp[y] || 0) : null;
  const L = a.l ? (a.l >= 1e6 ? (a.l / 1e6).toFixed(1) + "M" : a.l >= 1000 ? Math.round(a.l / 1000) + "k" : a.l) : null;
  return (
    <div className="r-view">
      <button className="r-back" onClick={() => go("explore")}>← explore</button>
      <div style={{ display: "flex", gap: 26, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 24 }}>
        <GenCover hue={a.hue} name={a.name} size={120} radius={6} />
        <div style={{ flex: 1, minWidth: 240 }}>
          <div className="r-kicker">explore{a.d ? ` · est. ${a.d}` : ""}</div>
          <h1 className="r-title" style={{ fontSize: "clamp(32px,4.5vw,54px)" }}>{a.name}<span className="dot">.</span></h1>
          <div style={{ display: "flex", gap: 7, marginTop: 12, flexWrap: "wrap" }}>
            {subs.slice(0, 6).map(s => <span key={s} className="r-chip">{s}</span>)}
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
      <div className="r-card" style={{ padding: "16px 20px", fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.5 }}>
        A quick view — <b style={{ color: "var(--ink)" }}>{a.name}</b> sits outside your top 205, so the full
        breakdown (tracks, albums, similar, sound DNA) isn't built for them yet.
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
  // artists outside the kept 205 still rank in Explore — give them a lightweight page
  // (return AFTER hooks so hook order stays stable across navigations).
  if (!full && R.expById && R.expById[id]) return <MiniArtistView a={R.expById[id]} go={go} />;
  const dna = [a.audio.energy, a.audio.valence, a.audio.acoustic, a.audio.tempo, a.audio.dance, a.audio.instr];
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
          <div style={{ display: "flex", gap: 7, marginTop: 14, flexWrap: "wrap" }}>
            {a.tags.map(g => <span key={g} className="r-chip">{g}</span>)}
          </div>
          {a.styles && a.styles.length > 0 && (
            <div style={{ display: "flex", gap: 7, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: ".12em", textTransform: "uppercase" }}>discogs</span>
              {a.styles.map(s => <span key={s} className="r-chip" style={{ fontSize: 10.5, padding: "3px 8px", background: "transparent", borderColor: "var(--line)" }}>{s}</span>)}
            </div>
          )}
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
            solid = {a.name.split(" ")[0]} · dashed = your average
          </div>
        </div>

        <div style={{ display: "grid", gap: "var(--gap)" }}>
          {/* sounds like */}
          <div className="r-card" style={{ padding: 18 }}>
            <div className="r-card-h" style={{ padding: 0, marginBottom: 14 }}>
              <span className="lbl"><b>Sounds like</b></span>
              <span className="meta">last.fm similar</span></div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 12 }}>
              {a.similar.map((sid, i) => {
                const name = a.similarNames[i];
                // Resolve to a kept-artist id via the alias map ("Midori" → ミドリ's id)
                const realId = (R.idForName && R.idForName(name)) || sid;
                const sim = R.byId[realId];
                const played = sim || (R.played && R.played(name));
                return (
                  <div key={sid + i} onClick={() => sim && go("artist", realId)}
                    style={{ display: "flex", flexDirection: "column", gap: 8, cursor: sim ? "pointer" : "default",
                      opacity: played ? 1 : 0.62 }}
                    onMouseEnter={(e) => { if (sim) e.currentTarget.style.transform = "translateY(-3px)"; }}
                    onMouseLeave={(e) => e.currentTarget.style.transform = ""}>
                    <div style={{ position: "relative", transition: "transform .2s" }}>
                      <GenCover hue={sim ? sim.hue : (a.hue + 40 + i * 25) % 360} name={name} size={"100%"}
                        style={{ aspectRatio: "1", width: "100%", height: "auto" }} radius={4} />
                      {played && <span className="r-mono r-inlib">in library</span>}
                    </div>
                    <div style={{ fontSize: 12, lineHeight: 1.2 }}>{name}</div>
                    {sim ? <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)" }}>{fmt(sim.plays)} plays →</div>
                      : played ? <div className="r-mono" style={{ fontSize: 9, color: "var(--accent-dim)" }}>scrobbled · deeper cut</div>
                      : <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)" }}>not yet scrobbled</div>}
                  </div>
                );
              })}
            </div>
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
                          const kept = !!R.byId[oid];
                          return (
                            <span key={o.name} onClick={() => kept && go("artist", oid)}
                              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 9px", borderRadius: 999,
                                border: "1px solid var(--rule)", fontSize: 11.5, cursor: kept ? "pointer" : "default",
                                color: kept ? "var(--ink)" : "var(--ink-soft)" }}>
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
                  <div key={al.title + i} style={{ width: 78 }}>
                    <GenCover hue={a.hue} name={a.name} size={78} radius={3} />
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
        .r-back { font-family: var(--mono); font-size: 10.5px; letter-spacing: .12em; text-transform: uppercase;
          background: transparent; border: 1px solid var(--rule-2); color: var(--ink-soft); padding: 8px 14px;
          border-radius: 999px; cursor: pointer; margin-bottom: 22px; transition: .15s; }
        .r-back:hover { color: var(--ink); border-color: var(--accent-dim); }
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

Object.assign(window, { SoundMapView, ErasView, ArtistView, LiveView, ConcertRow });
