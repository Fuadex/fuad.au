// rotation-spotify.jsx — PLACEHOLDER page for the personal Spotify export (13 yrs of extended
// history: ms_played, per-play country, skips). Data is precomputed PII-FREE aggregates in
// spotify-insights.js (window.ROTATION_SPOTIFY) — never raw rows / IPs. This page is a sandbox to
// see the data working before folding hearts / engagement into the artist/album/track modules.
function SpotifyView({ go }) {
  const [d, setD] = React.useState(window.ROTATION_SPOTIFY || null);
  const [P, setP] = React.useState(window.ROTATION_PERSONA || null);
  const [world, setWorld] = React.useState(window.ROTATION_WORLD || null);
  const [year, setYear] = React.useState(null);          // null = all-time
  const [hi, setHi] = React.useState(null);              // hovered country cc
  React.useEffect(() => {
    if (!window.ROTATION_SPOTIFY) {
      const s = document.createElement("script"); s.src = "spotify-insights.js"; s.onload = () => setD(window.ROTATION_SPOTIFY);
      document.head.appendChild(s);
    }
    if (!window.ROTATION_PERSONA) {
      const s = document.createElement("script"); s.src = "spotify-persona.js"; s.onload = () => setP(window.ROTATION_PERSONA);
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

      {/* ——— v3: the Account Data layer (spotify-persona.js) ——— */}
      {P && <SpotifyPersona P={P} />}
    </div>
  );
}

// v3 sections: Marquee segments, Wrapped 2025 cross-examined, ad-machine inferences, Sound Capsule.
// All from spotify-persona.js (window.ROTATION_PERSONA) — PII-free aggregates from the Account
// Data export. Wrapped artist names are INFERRED from our own play data (the export only carries
// anonymous URIs); captions say so.
function SpotifyPersona({ P }) {
  const [allSegs, setAllSegs] = React.useState(false);
  const M = P.marquee, W = P.wrapped, I = P.inferences;
  const chip = (name, tone) => (
    <span key={name} className="r-mono" style={{ fontSize: 10.5, padding: "3px 9px", borderRadius: 100, border: "1px solid var(--rule)", color: tone === "hot" ? "var(--accent)" : "var(--ink-soft)", borderColor: tone === "hot" ? "var(--accent)" : "var(--rule)", whiteSpace: "nowrap" }}>{name}</span>
  );
  const Stat = ({ n, l, accent }) => (
    <div><div className="r-stat-n" style={{ fontSize: 26, ...(accent ? { color: "var(--accent)" } : {}) }}>{n}</div>
      <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: ".12em", textTransform: "uppercase", marginTop: 4 }}>{l}</div></div>
  );
  const MOS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
  return (
    <React.Fragment>
      {/* Marquee: the label machine's verdict */}
      <div className="r-card" style={{ padding: 18, marginTop: "var(--gap)" }}>
        <div className="r-card-h" style={{ padding: 0, marginBottom: 6 }}><span className="lbl"><b>The label machine's verdict</b> · Marquee — how artists' marketing tools rate you</span></div>
        <div style={{ display: "flex", gap: 26, flexWrap: "wrap", margin: "10px 0 14px" }}>
          <Stat n={M.counts.super} l="super listener" accent />
          <Stat n={M.counts.moderate} l="moderate" />
          <Stat n={M.counts.light} l="light" />
          <Stat n={fmt(M.counts.previous)} l="previously active" />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{M.super.map(a => chip(a, "hot"))}</div>
        {allSegs && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10, opacity: .85 }}>{M.moderate.map(a => chip(a))}</div>}
        <button className="r-mono" onClick={() => setAllSegs(s => !s)} style={{ marginTop: 10, fontSize: 10, background: "none", border: "none", color: "var(--ink-faint)", cursor: "pointer", padding: 0, textDecoration: "underline" }}>
          {allSegs ? "hide the moderates" : `show the ${M.counts.moderate} moderates`}
        </button>
        <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", marginTop: 8 }}>orange = "Super Listener": the segment labels buy ads against. {fmt(M.counts.previous)} artists have already written you off.</div>
      </div>

      {/* Wrapped 2025 cross-examined */}
      <div className="r-card" style={{ padding: 18, marginTop: "var(--gap)" }}>
        <div className="r-card-h" style={{ padding: 0, marginBottom: 6 }}><span className="lbl"><b>Wrapped 2025, cross-examined</b> · their structured verdict vs this site's record</span></div>
        <div style={{ display: "flex", gap: 26, flexWrap: "wrap", margin: "10px 0 14px" }}>
          <Stat n={fmt(W.hours) + "h"} l="in their window" />
          <Stat n={fmt(W.uniqueArtists)} l="artists" />
          <Stat n={"top " + W.topPercentile + "%"} l={"fan of " + (W.leaderboard.artist || "your #1")} accent />
          <Stat n={W.listeningAge.age} l="“listening age”" />
          <Stat n={(100 - W.party.popularity) + "%"} l="obscurity" />
          <Stat n={W.party.tempo + " bpm"} l="avg tempo" />
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="r-mono" style={{ fontSize: 10.5, borderCollapse: "collapse" }}>
            <thead><tr><th style={{ textAlign: "left", paddingRight: 12, fontWeight: 400, color: "var(--ink-faint)" }}>top-artist race</th>
              {MOS.map((m, i) => <th key={i} style={{ padding: "0 4px", fontWeight: 400, color: "var(--ink-faint)" }}>{m}</th>)}</tr></thead>
            <tbody>{W.race.map(r => (
              <tr key={r.artist || Math.random()}>
                <td style={{ paddingRight: 12, whiteSpace: "nowrap", color: "var(--ink)" }}>{r.artist || "(unresolved)"}</td>
                {r.ranks.map((k, i) => <td key={i} style={{ textAlign: "center", padding: "1px 4px", color: k === 1 ? "var(--accent)" : k == null ? "var(--rule)" : "var(--ink-soft)", fontWeight: k === 1 ? 700 : 400 }}>{k == null ? "·" : k}</td>)}
              </tr>))}
            </tbody>
          </table>
        </div>
        <div className="r-mono" style={{ fontSize: 10.5, color: "var(--ink-soft)", marginTop: 12, lineHeight: 1.7 }}>
          You streamed <b>{fmt(W.leaderboard.minutes)} min</b> of {W.leaderboard.artist || "your #1"} — <b>#{W.leaderboard.topX}</b> on their top-fan leaderboard.
          Club: <b>{String(W.clubs.club).replace(/_/g, " ").toLowerCase()}</b> ({W.clubs.role.toLowerCase()}, top {W.clubs.pct}% take that role).
          {" "}Skips {W.party.skips}% · explicit {W.party.explicit}% · multilinguist score {W.party.multilinguist} · chaos {fmt(W.party.chaos)}.
        </div>
        <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", marginTop: 6 }}>artist names inferred from the play record — the export itself only carries anonymous ids. rank 1 in orange.</div>
      </div>

      <div className="m-stack" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: "var(--gap)", marginTop: "var(--gap)" }}>
        {/* the ad machine's imagination */}
        <div className="r-card" style={{ padding: 18 }}>
          <div className="r-card-h" style={{ padding: 0, marginBottom: 12 }}><span className="lbl"><b>What the ad machine thinks</b> · {I.total} targeting segments, verbatim</span></div>
          {I.gems.map(g => (
            <div key={g} className="r-mono" style={{ fontSize: 10.5, padding: "4px 0", borderBottom: "1px solid var(--rule)", color: "var(--ink-soft)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={g}>{g}</div>
          ))}
          <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", marginTop: 8 }}>{I.affinity} anonymous artist-affinity hashes + genre reads: {I.music.join(", ")}.</div>
        </div>
        {/* sound capsule */}
        <div className="r-card" style={{ padding: 18 }}>
          <div className="r-card-h" style={{ padding: 0, marginBottom: 12 }}><span className="lbl"><b>Sound capsule</b> · their recent highlights about you</span></div>
          {P.capsule.map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "5px 0", borderBottom: "1px solid var(--rule)" }}>
              <span className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", width: 64 }}>{c.date}</span>
              <span style={{ flex: 1, fontSize: 12.5 }}>{c.type === "first"
                ? <React.Fragment>#{fmt(c.n)} in the country to find <b>{c.entity}</b></React.Fragment>
                : <React.Fragment><b>{c.entity}</b> was {c.n}% of your listening that week</React.Fragment>}</span>
            </div>
          ))}
        </div>
      </div>
    </React.Fragment>
  );
}
