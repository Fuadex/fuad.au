// rotation-spotify.jsx — PLACEHOLDER page for the personal Spotify export (13 yrs of extended
// history: ms_played, per-play country, skips). Data is precomputed PII-FREE aggregates in
// spotify-insights.js (window.ROTATION_SPOTIFY) — never raw rows / IPs. This page is a sandbox to
// see the data working before folding hearts / engagement into the artist/album/track modules.
function SpotifyView({ go }) {
  const [d, setD] = React.useState(window.ROTATION_SPOTIFY || null);
  const [world, setWorld] = React.useState(window.ROTATION_WORLD || null);
  const [year, setYear] = React.useState(null);          // null = all-time
  const [hi, setHi] = React.useState(null);              // hovered country cc
  React.useEffect(() => {
    if (!window.ROTATION_SPOTIFY) {
      const s = document.createElement("script"); s.src = "spotify-insights.js"; s.onload = () => setD(window.ROTATION_SPOTIFY);
      document.head.appendChild(s);
    }
    if (!window.ROTATION_WORLD) {
      let s = document.getElementById("rotation-world-js");
      if (!s) { s = document.createElement("script"); s.id = "rotation-world-js"; s.src = "world-map.js"; document.head.appendChild(s); }
      s.addEventListener("load", () => setWorld(window.ROTATION_WORLD));
    }
  }, []);
  if (!d) return <div className="r-rest-wait r-mono">loading your Spotify history…</div>;

  const W = 1000, H = 500;
  const px = (lon) => (lon + 180) / 360 * W, py = (lat) => (90 - lat) / 180 * H;
  // per-country plays for the active year (or all-time)
  const playsFor = (c) => year == null ? c.plays : (d.countryYear[c.cc] || {})[year] || 0;
  const dots = d.countries.filter(c => c.ll && playsFor(c) > 0);
  const maxP = Math.max(1, ...dots.map(playsFor));
  const hiC = hi && d.countries.find(c => c.cc === hi);
  const CCN = { AU: "Australia", PL: "Poland", JP: "Japan", US: "United States", HK: "Hong Kong", KR: "South Korea", NZ: "New Zealand", GB: "United Kingdom", DE: "Germany", FR: "France", IT: "Italy", ES: "Spain", NL: "Netherlands", CZ: "Czechia", TH: "Thailand", SG: "Singapore", TW: "Taiwan", CN: "China", VN: "Vietnam", ID: "Indonesia", MY: "Malaysia", PH: "Philippines", AE: "UAE", CA: "Canada", MO: "Macau", BN: "Brunei" };
  const cname = (cc) => CCN[cc] || cc;
  const years = d.years.map(y => y.year);
  const maxYearPlays = Math.max(1, ...d.years.map(y => y.plays));

  const Stat = ({ n, l, accent }) => (
    <div><div className="r-stat-n" style={{ fontSize: 30, ...(accent ? { color: "var(--accent)" } : {}) }}>{n}</div>
      <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: ".12em", textTransform: "uppercase", marginTop: 4 }}>{l}</div></div>
  );

  return (
    <div className="r-view">
      <div className="r-viewhead"><div>
        <div className="r-kicker">Spotify · extended history · {d.totals.span[0]} → {d.totals.span[1]}</div>
        <h1 className="r-title">Where I <em>listened</em><span className="dot">.</span></h1>
      </div></div>
      <div className="r-card" style={{ padding: "10px 16px", marginBottom: "var(--gap)", fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-faint)" }}>
        ⚗ placeholder — a sandbox for the Spotify data (13 yrs, ms-played + per-play country). Not yet wired into the main pages.
      </div>

      {/* headline stats */}
      <div className="r-card" style={{ padding: 18, marginBottom: "var(--gap)", display: "flex", gap: 30, flexWrap: "wrap" }}>
        <Stat n={fmt(d.totals.plays)} l="plays" />
        <Stat n={fmt(d.totals.hours) + "h"} l="listening" />
        <Stat n={Math.round(d.totals.hours / 24) + "d"} l="of your life" />
        <Stat n={d.totals.skipPct + "%"} l="skipped" accent />
        <Stat n={d.countries.length} l="countries" />
      </div>

      {/* migration map */}
      <div className="r-card" style={{ padding: 18, marginBottom: "var(--gap)" }}>
        <div className="r-card-h" style={{ padding: 0, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <span className="lbl"><b>Listening by place</b>{hiC ? <span className="r-mono" style={{ fontSize: 10, color: "var(--ink-soft)", marginLeft: 8 }}>{cname(hiC.cc)} · {fmt(playsFor(hiC))} plays · {hiC.hours}h · top {hiC.topArtist}</span> : null}</span>
          <div className="r-seg" style={{ flexWrap: "wrap" }}>
            <button data-on={year == null} onClick={() => setYear(null)}>all</button>
            {years.map(y => <button key={y} data-on={year === y} onClick={() => setYear(y)}>{"'" + String(y).slice(2)}</button>)}
          </div>
        </div>
        <svg viewBox={`0 40 ${W} 420`} style={{ width: "100%", height: "auto", display: "block" }} onMouseLeave={() => setHi(null)}>
          {world && world.land.map((p, i) => <path key={i} d={p} fill="var(--bg-3)" />)}
          {dots.sort((a, b) => playsFor(b) - playsFor(a)).map(c => {
            const p = playsFor(c), r = 3 + Math.sqrt(p / maxP) * 34, on = hi === c.cc;
            return <circle key={c.cc} cx={px(c.ll[1])} cy={py(c.ll[0])} r={r}
              fill={c.cc === "AU" ? "var(--accent)" : c.cc === "PL" ? "oklch(0.7 0.15 30)" : "oklch(0.66 0.13 210)"}
              fillOpacity={on ? 0.9 : 0.5} stroke={on ? "#fff" : "none"} strokeWidth="1.2"
              style={{ cursor: "default" }} onMouseEnter={() => setHi(c.cc)}><title>{cname(c.cc)}: {fmt(p)} plays</title></circle>;
          })}
        </svg>
        <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", marginTop: 4 }}>bubble = plays from that country{year != null ? " in " + year : " (all time)"} · hover for detail</div>
      </div>

      {/* per-year volume + skip rate */}
      <div className="r-card" style={{ padding: 18, marginBottom: "var(--gap)" }}>
        <div className="r-card-h" style={{ padding: 0, marginBottom: 14 }}><span className="lbl"><b>Plays per year</b> · bar height = plays · number = skip %</span></div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 150 }}>
          {d.years.map(y => (
            <div key={y.year} onClick={() => setYear(year === y.year ? null : y.year)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer" }}>
              <div className="r-mono" style={{ fontSize: 8.5, color: "var(--ink-faint)" }}>{y.skipPct}%</div>
              <div style={{ width: "100%", height: (y.plays / maxYearPlays * 120) + "px", background: year === y.year ? "var(--accent)" : "var(--accent-bg)", borderTop: "2px solid var(--accent)", marginTop: 3 }} title={`${fmt(y.plays)} plays · ${y.hours}h`} />
              <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", marginTop: 4 }}>{"'" + String(y.year).slice(2)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* engagement: real minutes + skip extremes */}
      <div className="m-stack" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: "var(--gap)" }}>
        <div className="r-card" style={{ padding: 18 }}>
          <div className="r-card-h" style={{ padding: 0, marginBottom: 12 }}><span className="lbl"><b>Most hours</b> · real listening, not scrobbles</span></div>
          {d.topByMinutes.slice(0, 12).map((a, i) => (
            <div key={a.artist} style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0", borderBottom: "1px solid var(--rule)" }}>
              <span className="r-mono" style={{ fontSize: 10, color: "var(--ink-faint)", width: 18 }}>{String(i + 1).padStart(2, "0")}</span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.artist}</span>
              <span className="r-mono" style={{ fontSize: 11, color: "var(--ink-soft)" }}>{fmt(Math.round(a.minutes / 60))}h</span>
            </div>
          ))}
        </div>
        <div className="r-card" style={{ padding: 18 }}>
          <div className="r-card-h" style={{ padding: 0, marginBottom: 12 }}><span className="lbl"><b>You skip them most</b> · ≥80 plays</span></div>
          {d.mostSkipped.slice(0, 12).map((a) => (
            <div key={a.artist} style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0", borderBottom: "1px solid var(--rule)" }}>
              <span style={{ flex: 1, minWidth: 0, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.artist}</span>
              <span className="r-mono" style={{ fontSize: 11, color: "var(--accent)" }}>{a.skipPct}%</span>
              <span className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", width: 40, textAlign: "right" }}>{fmt(a.plays)}p</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
