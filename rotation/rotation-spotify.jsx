// rotation-spotify.jsx — the ATTENTION page (v4). The personal Spotify export knows what
// last.fm can't: ms_played (how long a song actually held you), reason_end (how it ended)
// and session shape. Data is precomputed PII-FREE aggregates in spotify-insights.js +
// spotify-attention.js — never raw rows / IPs / locations.
// shared stat block (used by the headline row and the attention layer)
const SpStat = ({ n, l, accent }) => (
  <div><div className="r-stat-n" style={{ fontSize: 30, ...(accent ? { color: "var(--accent)" } : {}) }}>{n}</div>
    <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: ".12em", textTransform: "uppercase", marginTop: 4 }}>{l}</div></div>
);

function SpotifyView({ go }) {
  const [d, setD] = React.useState(window.ROTATION_SPOTIFY || null);
  const [P, setP] = React.useState(window.ROTATION_PERSONA || null);
  const [At, setAt] = React.useState(window.ROTATION_SPOT_ATTN || null);
  const [year, setYear] = React.useState(null);          // null = all-time
  React.useEffect(() => {
    if (!window.ROTATION_SPOTIFY) {
      const s = document.createElement("script"); s.src = "spotify-insights.js"; s.onload = () => setD(window.ROTATION_SPOTIFY);
      document.head.appendChild(s);
    }
    if (!window.ROTATION_PERSONA) {
      const s = document.createElement("script"); s.src = "spotify-persona.js"; s.onload = () => setP(window.ROTATION_PERSONA);
      document.head.appendChild(s);
    }
    if (!window.ROTATION_SPOT_ATTN) {
      const s = document.createElement("script"); s.src = "spotify-attention.js";
      s.onload = () => setAt(window.ROTATION_SPOT_ATTN); s.onerror = () => {};
      document.head.appendChild(s);
    }
  }, []);
  if (!d) return <div className="r-rest-wait r-mono">loading your Spotify history…</div>;

  const years = d.years.map(y => y.year);
  const maxYearPlays = Math.max(1, ...d.years.map(y => y.plays));

  return (
    <div className="r-view">
      <div className="r-viewhead"><div>
        <div className="r-kicker">Spotify · extended history · {d.totals.span[0]} → {d.totals.span[1]}</div>
        <h1 className="r-title">What held my <em>attention</em><span className="dot">.</span></h1>
      </div></div>
      <div className="r-card" style={{ padding: "10px 16px", marginBottom: "var(--gap)", fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-faint)" }}>
        the export knows what last.fm can't: how long each song actually played, how it ended, and the shape of every session
      </div>

      {/* headline stats */}
      <div className="r-card" style={{ padding: 18, marginBottom: "var(--gap)", display: "flex", gap: 30, flexWrap: "wrap" }}>
        <SpStat n={fmt(d.totals.plays)} l="plays" />
        <SpStat n={fmt(d.totals.hours) + "h"} l="listening" />
        <SpStat n={Math.round(d.totals.hours / 24) + "d"} l="of your life" />
        <SpStat n={d.totals.skipPct + "%"} l="skipped" accent />
      </div>

      {/* migration map removed 2026-07-13 (Fuad: "doesn't show anything at the moment").
          Year filter chips move to the per-year card below. */}
      {/* per-year volume + skip rate */}
      <div className="r-card" style={{ padding: 18, marginBottom: "var(--gap)" }}>
        <div className="r-card-h" style={{ padding: 0, marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <span className="lbl"><b>Plays per year</b> · bar height = plays · number = skip %</span>
          <div className="r-seg" style={{ flexWrap: "wrap" }}>
            <button data-on={year == null} onClick={() => setYear(null)}>all</button>
            {years.map(y => <button key={y} data-on={year === y} onClick={() => setYear(y)}>{"'" + String(y).slice(2)}</button>)}
          </div>
        </div>
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

      {/* ——— v4: the ATTENTION layer (spotify-attention.js) — what only ms_played can tell ——— */}
      {At && <SpotifyAttention A={At} />}

      {/* ——— v3: the Account Data layer (spotify-persona.js) ——— */}
      {P && <SpotifyPersona P={P} />}
    </div>
  );
}

// v4 sections — the page's real story: ATTENTION. Only this export knows how long a song
// actually held you (ms_played), how it ended (reason_end), and the shape of your sessions.
function SpotifyAttention({ A }) {
  const years = Object.keys(A.medianListenSec || {}).sort();
  const maxSpan = Math.max(...years.map(y => A.medianListenSec[y] || 0), 1);
  const S = A.sessions || {};
  const row = (a, i, right) => (
    <div key={(a[0] || "") + (a[1] || "") + i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0", borderBottom: "1px solid var(--rule)" }}>
      <span className="r-mono" style={{ fontSize: 10, color: "var(--ink-faint)", width: 18 }}>{String(i + 1).padStart(2, "0")}</span>
      <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={a[0]}>{a[1] || a[0]}<span className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", marginLeft: 6 }}>{a[1] ? a[0] : ""}</span></span>
      {right(a)}
    </div>
  );
  return (
    <React.Fragment>
      {/* session anatomy */}
      <div className="r-card" style={{ padding: 18, marginTop: "var(--gap)", marginBottom: "var(--gap)" }}>
        <div className="r-card-h" style={{ padding: 0, marginBottom: 12 }}><span className="lbl"><b>Session anatomy</b> · a session ends after 30 quiet minutes</span></div>
        <div style={{ display: "flex", gap: 30, flexWrap: "wrap", marginBottom: 14 }}>
          <SpStat n={fmt(S.count)} l="sessions" />
          <SpStat n={S.medianMin + "m"} l="median session" />
          <SpStat n={Math.round((S.longest || {}).min / 60) + "h"} l={`longest (${(S.longest || {}).tracks} tracks, ${(S.longest || {}).year})`} accent />
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 90 }}>
          {Object.entries(S.byYear || {}).map(([y, e]) => (
            <div key={y} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}
              title={`${y}: ${fmt(e.n)} sessions · avg ${e.avgMin}m · ${e.avgTracks} tracks`}>
              <div className="r-mono" style={{ fontSize: 8.5, color: "var(--ink-faint)" }}>{e.avgMin}m</div>
              <div style={{ width: "100%", height: Math.max(4, e.avgMin / Math.max(...Object.values(S.byYear).map(x => x.avgMin)) * 64) + "px", background: "var(--accent-bg)", borderTop: "2px solid var(--accent)", marginTop: 2 }} />
              <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", marginTop: 3 }}>{"'" + y.slice(2)}</div>
            </div>
          ))}
        </div>
        <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", marginTop: 4 }}>bar = average session length per year</div>
      </div>

      {/* attention span + how songs end */}
      <div className="m-stack" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: "var(--gap)", marginBottom: "var(--gap)" }}>
        <div className="r-card" style={{ padding: 18 }}>
          <div className="r-card-h" style={{ padding: 0, marginBottom: 12 }}><span className="lbl"><b>How long a song holds you</b> · median seconds actually played</span></div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 110 }}>
            {years.map(y => (
              <div key={y} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }} title={`${y}: ${A.medianListenSec[y]}s median`}>
                <div className="r-mono" style={{ fontSize: 8.5, color: "var(--ink-faint)" }}>{A.medianListenSec[y]}s</div>
                <div style={{ width: "100%", height: Math.max(4, A.medianListenSec[y] / maxSpan * 78) + "px", background: "var(--accent-bg)", borderTop: "2px solid var(--accent)", marginTop: 2 }} />
                <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", marginTop: 3 }}>{"'" + y.slice(2)}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="r-card" style={{ padding: 18 }}>
          <div className="r-card-h" style={{ padding: 0, marginBottom: 12 }}><span className="lbl"><b>How songs end</b> · played out vs skipped ahead</span></div>
          <div style={{ display: "grid", gap: 5 }}>
            {years.map(y => {
              const e = (A.ends || {})[y] || {};
              const segs = [["played out", "var(--accent)"], ["skipped ahead", "oklch(0.6 0.13 30)"], ["closed app", "var(--rule-2)"], ["other", "var(--bg-3)"]];
              return (
                <div key={y} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", width: 24 }}>{"'" + y.slice(2)}</span>
                  <div style={{ flex: 1, display: "flex", height: 10, borderRadius: 5, overflow: "hidden" }}
                    title={segs.map(([k]) => `${k} ${e[k] || 0}%`).join(" · ")}>
                    {segs.map(([k, c]) => <div key={k} style={{ width: (e[k] || 0) + "%", background: c }} />)}
                  </div>
                  <span className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-soft)", width: 34, textAlign: "right" }}>{e["played out"] || 0}%</span>
                </div>
              );
            })}
          </div>
          <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", marginTop: 8 }}>number = share of songs allowed to finish</div>
        </div>
      </div>

      {/* the leaderboards attention makes possible */}
      <div className="m-stack" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: "var(--gap)", marginBottom: "var(--gap)" }}>
        <div className="r-card" style={{ padding: 18 }}>
          <div className="r-card-h" style={{ padding: 0, marginBottom: 12 }}><span className="lbl"><b>Songs you never finish</b> · high plays, high skips</span></div>
          {(A.never || []).slice(0, 12).map((a, i) => row(a, i, x => <span className="r-mono" style={{ fontSize: 11, color: "var(--accent)" }}>{x[3]}%<span style={{ color: "var(--ink-faint)", fontSize: 9 }}> · {fmt(x[2])}p</span></span>))}
        </div>
        <div className="r-card" style={{ padding: 18 }}>
          <div className="r-card-h" style={{ padding: 0, marginBottom: 12 }}><span className="lbl"><b>Songs you devour</b> · high plays, never skipped</span></div>
          {(A.devoured || []).slice(0, 12).map((a, i) => row(a, i, x => <span className="r-mono" style={{ fontSize: 11, color: "var(--ink-soft)" }}>{x[3]}%<span style={{ color: "var(--ink-faint)", fontSize: 9 }}> · {fmt(x[2])}p</span></span>))}
        </div>
      </div>

      {/* platform eras */}
      <div className="r-card" style={{ padding: 18, marginBottom: "var(--gap)" }}>
        <div className="r-card-h" style={{ padding: 0, marginBottom: 12 }}><span className="lbl"><b>Where you listened</b> · device mix per year</span></div>
        <div style={{ display: "grid", gap: 5 }}>
          {Object.entries(A.platforms || {}).map(([y, mix]) => {
            const segs = [["phone", "var(--accent)"], ["desktop", "oklch(0.62 0.1 250)"], ["web", "var(--rule-2)"], ["living room", "oklch(0.6 0.1 140)"], ["other", "var(--bg-3)"]];
            return (
              <div key={y} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", width: 24 }}>{"'" + y.slice(2)}</span>
                <div style={{ flex: 1, display: "flex", height: 10, borderRadius: 5, overflow: "hidden" }}
                  title={segs.map(([k]) => `${k} ${mix[k] || 0}%`).join(" · ")}>
                  {segs.map(([k, c]) => <div key={k} style={{ width: (mix[k] || 0) + "%", background: c }} />)}
                </div>
                <span className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-soft)", width: 60, textAlign: "right" }}>{(mix.phone || 0)}% phone</span>
              </div>
            );
          })}
        </div>
      </div>
    </React.Fragment>
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
  const SpStat = ({ n, l, accent }) => (
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
          <SpStat n={M.counts.super} l="super listener" accent />
          <SpStat n={M.counts.moderate} l="moderate" />
          <SpStat n={M.counts.light} l="light" />
          <SpStat n={fmt(M.counts.previous)} l="previously active" />
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
          <SpStat n={fmt(W.hours) + "h"} l="in their window" />
          <SpStat n={fmt(W.uniqueArtists)} l="artists" />
          <SpStat n={"top " + W.topPercentile + "%"} l={"fan of " + (W.leaderboard.artist || "your #1")} accent />
          <SpStat n={W.listeningAge.age} l="“listening age”" />
          <SpStat n={(100 - W.party.popularity) + "%"} l="obscurity" />
          <SpStat n={W.party.tempo + " bpm"} l="avg tempo" />
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
