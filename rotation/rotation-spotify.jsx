// rotation-spotify.jsx — the ATTENTION page (v4). The personal Spotify export knows what
// last.fm can't: ms_played (how long a song actually held you), reason_end (how it ended)
// and session shape. Data is precomputed PII-FREE aggregates in spotify-insights.js +
// spotify-attention.js — never raw rows / IPs / locations.
// shared stat block (headline row, attention layer, persona — size prop replaces the
// former duplicate inner definition; dedup 2026-07-18)
const SpStat = ({ n, l, accent, size }) => (
  <div><div className="r-stat-n" style={{ fontSize: size || 30, ...(accent ? { color: "var(--accent)" } : {}) }}>{n}</div>
    <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: ".12em", textTransform: "uppercase", marginTop: 4 }}>{l}</div></div>
);

function SpotifyView({ go }) {
  const [d, setD] = React.useState(window.ROTATION_SPOTIFY || null);
  const [P, setP] = React.useState(window.ROTATION_PERSONA || null);
  const [At, setAt] = React.useState(window.ROTATION_SPOT_ATTN || null);
  const [year, setYear] = React.useState(null);          // null = all-time
  const [failed, setFailed] = React.useState(false);     // insights file 404'd — say so instead of spinning forever
  React.useEffect(() => {
    if (!window.ROTATION_SPOTIFY) {
      const s = document.createElement("script"); s.src = "spotify-insights.js"; s.onload = () => setD(window.ROTATION_SPOTIFY);
      s.onerror = () => setFailed(true);
      document.head.appendChild(s);
    }
    if (!window.ROTATION_PERSONA) {
      const s = document.createElement("script"); s.src = "spotify-persona.js"; s.onload = () => setP(window.ROTATION_PERSONA);
      s.onerror = () => {};   // persona sections simply don't render without it
      document.head.appendChild(s);
    }
    if (!window.ROTATION_SPOT_ATTN) {
      const s = document.createElement("script"); s.src = "spotify-attention.js";
      s.onload = () => setAt(window.ROTATION_SPOT_ATTN); s.onerror = () => {};
      document.head.appendChild(s);
    }
  }, []);
  if (failed && !d) return <div className="r-rest-wait r-mono">Spotify history data isn't available right now.</div>;
  if (!d) return <div className="r-rest-wait r-mono">loading your Spotify history…</div>;

  const years = d.years.map(y => y.year);
  const maxYearPlays = Math.max(1, ...d.years.map(y => y.plays));

  return (
    <div className="r-view">
      <div className="r-viewhead">
        <div>
          <div className="r-kicker">Spotify · extended history · {d.totals.span[0]} → {d.totals.span[1]}</div>
          <h1 className="r-title">What held my <em>attention</em><span className="dot">.</span></h1>
        </div>
        <button className="r-back" style={{ marginBottom: 0 }} onClick={() => go("liked")}>♥ liked songs →</button>
      </div>
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
  const PStat = (p) => <SpStat {...p} size={26} />;   // persona uses the shared block, one size down
  const MOS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
  return (
    <React.Fragment>
      {/* Marquee: the label machine's verdict */}
      <div className="r-card" style={{ padding: 18, marginTop: "var(--gap)" }}>
        <div className="r-card-h" style={{ padding: 0, marginBottom: 6 }}><span className="lbl"><b>The label machine's verdict</b> · Marquee — how artists' marketing tools rate you</span></div>
        <div style={{ display: "flex", gap: 26, flexWrap: "wrap", margin: "10px 0 14px" }}>
          <PStat n={M.counts.super} l="super listener" accent />
          <PStat n={M.counts.moderate} l="moderate" />
          <PStat n={M.counts.light} l="light" />
          <PStat n={fmt(M.counts.previous)} l="previously active" />
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
          <PStat n={fmt(W.hours) + "h"} l="in their window" />
          <PStat n={fmt(W.uniqueArtists)} l="artists" />
          <PStat n={"top " + W.topPercentile + "%"} l={"fan of " + (W.leaderboard.artist || "your #1")} accent />
          <PStat n={W.listeningAge.age} l="“listening age”" />
          <PStat n={(100 - W.party.popularity) + "%"} l="obscurity" />
          <PStat n={W.party.tempo + " bpm"} l="avg tempo" />
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

// ─── LikedView (#liked) — the ~3,592 Spotify saved songs as a navigable, bucketed playlist ───
// The owner's ask: "a much easier playlist to sort through and use alternatively to the Spotify
// system." Data = liked-meta.js (window.ROTATION_LIKED_META, a lazy sidecar built by build-data.js
// joining the saved-tracks source against the scrobble record) + its bucket legend. Every row is
// keyed slug(artist)~slug(track), so a click opens the TrackView when the media index knows the
// song, and the per-row ♪ button always jumps to the Spotify track page (works even for saves that
// were never scrobbled). Windowed render for the 3.6k rows — only the visible slice mounts.
const LIKED_BUCKET_COLOR = {   // hue per derived bucket — tuned to the app's oklch palette
  fresh: "oklch(0.72 0.15 150)", doorway: "oklch(0.7 0.15 280)", canon: "var(--accent)",
  lived: "oklch(0.7 0.13 45)", left: "var(--ink-faint)", mid: "var(--ink-soft)",
};
// (The old standalone log-scaled tempo helper LT_TEMPO/TEMPO_STEPS/posTempo was removed 2026-08-12
// with the standalone tempo/energy/mood handles — the DNA tuner's linear per-axis bands replace them.)
// dual-thumb range: two overlaid native range inputs (min + max). Minimal, app-styled — no library.
// Optional `hist` (array of bar heights 0..1 in position order) draws the corpus distribution behind the
// track; `meanPos` (a min..max value) draws a dashed tick for the aggregate liked-corpus mean.
function LikedRange({ label, lo, hi, min, max, onChange, fmt, hist, meanPos }) {
  const active = lo > min || hi < max;
  const pct = v => ((v - min) / (max - min)) * 100;
  const clampLo = v => onChange([Math.min(v, hi), hi]);
  const clampHi = v => onChange([lo, Math.max(v, lo)]);
  return (
    <div style={{ flex: "1 1 200px", minWidth: 170 }}>
      <div className="r-mono" style={{ fontSize: 9.5, letterSpacing: ".1em", textTransform: "uppercase", color: active ? "var(--accent)" : "var(--ink-faint)", marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
        <span>{label}</span><span style={{ color: "var(--ink-soft)" }}>{fmt(lo)} – {fmt(hi)}</span>
      </div>
      {/* corpus distribution histogram behind the track (tiny sparkline of where the liked songs sit) */}
      {hist && hist.length > 0 && (
        <div style={{ display: "flex", alignItems: "flex-end", gap: 1, height: 16, marginBottom: 1 }}>
          {/* hollow like Overview's bars (Fuad 2026-08-22): transparent body, stroked outline */}
          {hist.map((h, i) => <div key={i} style={{ flex: 1, height: Math.max(1, h * 16), background: "transparent", boxShadow: "inset 0 0 0 1px var(--rule-2)", opacity: 0.9, borderRadius: "1px 1px 0 0" }} />)}
        </div>
      )}
      <div style={{ position: "relative", height: 20 }}>
        <div style={{ position: "absolute", top: 8, left: 0, right: 0, height: 4, borderRadius: 2, background: "var(--rule-2)" }} />
        {/* aggregate liked-corpus mean — the "your average" dashed reference (matches the DNA-radar idiom) */}
        {meanPos != null && <div title="liked-corpus average" style={{ position: "absolute", top: 2, bottom: 2, left: pct(meanPos) + "%", width: 0, borderLeft: "1.5px dashed var(--ink-faint)", opacity: 0.85 }} />}
        <div style={{ position: "absolute", top: 8, height: 4, borderRadius: 2, background: "var(--accent)", left: pct(lo) + "%", right: (100 - pct(hi)) + "%" }} />
        {/* two full-width overlaid inputs — only the thumbs take pointer events. The hi input is
            DOM-later so it paints ON TOP; once the lo thumb crosses into the upper half it sits under
            the hi input's (invisible) track and becomes ungrabbable. Lift lo above hi whenever it's
            past the midpoint so BOTH thumbs stay draggable across the whole range. */}
        <input type="range" className="lt-range" style={{ zIndex: pct(lo) > 50 ? 4 : 3 }} min={min} max={max} value={lo} onChange={e => clampLo(+e.target.value)} />
        <input type="range" className="lt-range" style={{ zIndex: pct(lo) > 50 ? 3 : 4 }} min={min} max={max} value={hi} onChange={e => clampHi(+e.target.value)} />
      </div>
    </div>
  );
}
// ── DNA tuner axes ─────────────────────────────────────────────────────────────────────────────
// Per-liked-track audio characteristics wired as range bands. Two data sources, both keyed the SAME
// way as a liked row so the join is a lookup:
//   • liked-meta row itself → tempo (real BPM), energy, valence (already folded in by build-data)
//   • liked-audio.json (keyed by Spotify track id = meta[0]) → danceability
//   • track-audio.js / ROTATION_TRACKAUDIO (keyed artistSlug~trackSlug) → loudness(dB), speechiness,
//     liveness, popularity, key(0-11), mode(0/1)   [field layout decoded from spotify-track-data.json]
// followers is ARTIST-level only (R.AUDIO[id][8]) — not cleanly per-track, so it is intentionally
// NOT wired here (documented: no per-liked-track datum).
// Each axis: { k, label, min, max, fmt, get(row) } where get returns a value or null (missing → the
// row is excluded only while THIS axis's band is active — the vocals-filter convention).
const TA_IDX = { pop: 1, energy: 4, valence: 5, acoustic: 6, tempoN: 7, dance: 8, instr: 9, loud: 10, speech: 11, live: 12, key: 13, mode: 14 };  // ROTATION_TRACKAUDIO fields
const PITCH_CLASSES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];  // key idx 0..11
const LK_DNA_AXES = [
  { k: "tempo",   label: "tempo",       min: 40,   max: 220, fmt: v => v + "♩",  get: r => r.tempo },
  { k: "energy",  label: "energy",      min: 0,    max: 100, fmt: v => v,        get: r => r.energy },
  { k: "valence", label: "positivity",  min: 0,    max: 100, fmt: v => v,        get: r => r.valence },
  { k: "dance",   label: "danceable",   min: 0,    max: 100, fmt: v => v,        get: r => r.dance },
  // acoustic (ta[6]) + instrumental (ta[9]): the row extraction already exists (radar work); wire them
  // as bands so the two radar-only axes also gain a numeric range filter. Same 0..100 remap as the blob.
  { k: "acoustic", label: "acoustic",     min: 0,   max: 100, fmt: v => v,        get: r => r.acoustic },
  { k: "instr",    label: "instrumental", min: 0,   max: 100, fmt: v => v,        get: r => r.instr },
  // loudness is stored in the track-audio blob as dB×10 (median ≈ -55 → -5.5 dB); scale to real dB.
  { k: "loud",    label: "loudness",    min: -40,  max: 3,   fmt: v => v + "dB", get: r => r.loud == null ? null : Math.round(r.loud / 10) },
  { k: "speech",  label: "speechy",     min: 0,    max: 100, fmt: v => v,        get: r => r.speech },
  { k: "live",    label: "liveness",    min: 0,    max: 100, fmt: v => v,        get: r => r.live },
  { k: "pop",     label: "popularity",  min: 0,    max: 100, fmt: v => v,        get: r => r.pop },
];
// ── vocals dimension (mirrors Explore's vocalsPass) ──────────────────────────────────────────────
// Liked rows carry `aSlug` = R.slug(artist); the artist's vocals code lives on the artist record
// (R.expById[aSlug] || R.byId[aSlug]).vx — the SAME `vx` field + semantics as the Explore vocals chip.
//   vx: "m"/"f"/"n" chars in lineup order · "" = instrumental · undefined = no data.
//   male = only male · female = only female · mixed = ≥2 distinct genders · nb = contains non-binary ·
//   instrumental = empty list. undefined vx → hidden under any active option (the no-data convention).
// LK_ prefix + lk-prefixed fn: top-level names share global scope across the buildless jsx files.
const LK_VOCALS = [["any", "Any"], ["male", "Male"], ["female", "Female"], ["mixed", "Mixed"], ["nb", "Non-binary"], ["instrumental", "Instrumental"]];
// Phone labels for the genre family chips (Fuad 2026-08-21, his wording). Fourteen families whose
// full names run to "Industrial/Noise/Hyperpop" — at phone width that is barely two chips per line
// and the row costs four of them. Keyed on the family STRING from liked-meta rather than the index,
// so reordering the families cannot silently mislabel a chip; anything unmapped falls through to
// the full name rather than rendering blank.
const LK_FAM_ABBR = {
  "Thrash/Death": "Thrash", "Heavy/Doom": "Heavy", "Metalcore/Nu": "Nu",
  "Punk/Hardcore": "Punk/H", "Prog": "Prog", "Shoegaze/Grunge": "Shoe/G",
  "Alternative/Indie": "Alt", "Industrial/Noise/Hyperpop": "Ind/Noise",
  "Electronic/DnB": "DnB", "Hip-Hop/Rap": "Rap", "Pop": "Pop",
  "Jazz/Funk": "Jazz/F", "Classical": "Classical", "Score": "Score",
};
// chip colours (Fuad 2026-08-13 — "still defaulting as grey"): bucket + vocals chips carry
// their dimension's colour at rest (like genre-family chips), full fill when active. left/mid
// get muted-but-real hues HERE ONLY — their row dots keep the semantic grey of LIKED_BUCKET_COLOR.
const LK_CHIP_COLOR = { fresh: "oklch(0.72 0.15 150)", doorway: "oklch(0.7 0.15 280)", canon: "var(--accent)",
  lived: "oklch(0.7 0.13 45)", left: "oklch(0.66 0.09 20)", mid: "oklch(0.72 0.09 75)" };
const LK_VOX_COLOR = { male: "oklch(0.7 0.12 230)", female: "oklch(0.72 0.14 350)", mixed: "oklch(0.7 0.12 300)",
  nb: "oklch(0.72 0.12 110)", instrumental: "oklch(0.7 0.08 60)" };
// INVERT chip labels per active sort — [natural-direction glyph-label, inverted glyph-label]. The chip
// shows "▼ <hi>" in natural order and "▲ <lo>" when inverted, mirroring Explore's SND_FLIP idiom.
const LK_FLIP = {
  plays:     ["most", "least"],
  "first-new": ["newest", "oldest"],   // natural = newest-first; invert = oldest-first (replaces the old OLDEST chip)
  artist:    ["a→z", "z→a"],
  tempo:     ["slow→fast", "fast→slow"],
  energy:    ["high→low", "low→high"],
  mood:      ["bright→dark", "dark→bright"],
  neglect:   ["most faded", "least faded"],
  obscure:   ["deep cuts", "best known"],
  closest:   ["closest", "farthest"],
};
// FADE RATE (Fuad 2026-08-20) — plays divided by the years you have had the track, so "liked in 2013
// and played twice" separates from "liked in 2013 and played four hundred times". Nothing else on
// the page tells those apart: `plays` ranks by the raw count and `newest` by the year, and a small
// count is only damning once you know how long it has had to grow. 74 saves have never been played
// at all; they all tie at 0, so age breaks the tie and the longest-ignored lead.
// Recency is handled by the divisor rather than by excluding this year: a 2026 save played twice
// scores 2.0 and sits mid-list, while a 2013 save played twice scores 0.14 and heads it — which is
// the distinction the sort is for.
const LK_NOW_Y = new Date().getUTCFullYear();
const lkFade = (r) => (r.meta[1] || 0) / Math.max(1, LK_NOW_Y - (r.meta[2] || LK_NOW_Y) + 1);
function lkVocalsPass(vx, opt) {
  if (opt === "any") return true;
  if (vx === undefined || vx === null) return false;   // no data → hidden under an active filter
  const set = new Set(vx.split(""));
  switch (opt) {
    case "instrumental": return vx === "";
    case "male":   return vx !== "" && set.size === 1 && set.has("m");
    case "female": return vx !== "" && set.size === 1 && set.has("f");
    case "nb":     return set.has("n");
    case "mixed":  return set.size >= 2;
    default:       return true;
  }
}
// ── audio-DNA radar ──────────────────────────────────────────────────────────────────────────────
// A compact spider chart of the liked corpus across the six CORE audio axes, mirroring the artist
// page's Sound-DNA radar (rotation-views2 DNA_AXES / AudioRadar idiom). Axes + order are the artist
// radar's: energy · valence(mood) · acoustic · tempo · dance · instrumental. Each row carries a 0..100
// value per axis (`radarGet`) — tempo uses the track-audio blob's 0..100 remap (ta[7]) so it shares a
// scale with the dashed library reference; the real-BPM band above is a separate concern.
// LK_ prefix: top-level consts share global scope across the buildless jsx files (DNA_AXES already
// collided once) — never reuse a bare name that exists in another file.
const LK_RADAR_AXES = [
  { k: "energy",   label: "NRG",   radarGet: r => r.energy },
  { k: "valence",  label: "MOOD",  radarGet: r => r.valence },
  { k: "acoustic", label: "ACOU",  radarGet: r => r.acoustic },
  { k: "tempo",    label: "BPM",   radarGet: r => r.tempoN },
  { k: "dance",    label: "DANCE", radarGet: r => r.dance },
  { k: "instr",    label: "INSTR", radarGet: r => r.instr },
];
// Whole-library play-weighted average per radar axis (0..100), read straight from R.AUDIO_DIST's
// permille CDF — the same source the artist radar's dashed "your average" shape uses (libMean idiom
// in rotation-views2, replicated locally so this file stays self-contained). Returns null per axis
// when the distribution is absent (dashed shape simply doesn't draw).
function lkLibMean(axis) {
  const D = window.ROTATION && window.ROTATION.AUDIO_DIST; if (!D || !D.axes || !D.cdf) return null;
  const ai = D.axes.indexOf(axis); if (ai < 0) return null;
  const c = D.cdf[ai]; let m = 0, prev = 0;
  for (let v = 0; v <= 100; v++) { m += v * (c[v] - prev) / 1000; prev = c[v]; }
  return m;
}
// The 6-axis aggregate of a liked row-set, as a 0..1 array in LK_RADAR_AXES order (used to seed the
// draggable target and to draw the faint "liked aggregate" shape). Rows missing an axis just don't
// contribute to that axis's mean.
function lkRadarAgg(rows) {
  return LK_RADAR_AXES.map(ax => {
    let sum = 0, n = 0;
    for (const r of rows) { const v = ax.radarGet(r); if (v != null && Number.isFinite(v)) { sum += v; n++; } }
    return n ? Math.max(0, Math.min(1, (sum / n) / 100)) : 0;
  });
}
// A row's own 6-axis vector in LK_RADAR_AXES order (0..1), or null if ANY axis is missing — a row
// without full audio data can't be distance-compared, so it's excluded under DNA mode (the no-data
// convention). Kept as a bare function so the sims can import the math without React.
function lkRowVec(r) {
  const out = new Array(LK_RADAR_AXES.length);
  for (let i = 0; i < LK_RADAR_AXES.length; i++) {
    const v = LK_RADAR_AXES[i].radarGet(r);
    if (v == null || !Number.isFinite(v)) return null;
    out[i] = Math.max(0, Math.min(1, v / 100));
  }
  return out;
}
// Normalized Euclidean distance between two 0..1 6-vectors: raw L2 divided by sqrt(N) so it lands in
// 0..1 and compares directly against the tolerance slider. (max L2 across a unit 6-cube = sqrt(6).)
function lkTargetDist(vec, target) {
  let s = 0; for (let i = 0; i < target.length; i++) { const d = vec[i] - target[i]; s += d * d; }
  return Math.sqrt(s) / Math.sqrt(target.length);
}
// LikedRadar — now THREE shapes: faint = liked aggregate (initial target seed), dashed = library
// average, solid draggable = the TARGET (a filter shape). Drag any of the 6 vertices radially to move
// that axis's target 0..1; `onTarget(nextArray)` reports the change (and flips mode→'dna' upstream).
// Self-contained SVG (the shared window.Radar is passive — no pointer handling), same visual grammar.
function LikedRadar({ rows, size, target, onTarget, dimmed }) {
  const S = size || 172, c = S / 2, r = S / 2 - 26, n = LK_RADAR_AXES.length;
  const svgRef = React.useRef(null);
  const [drag, setDrag] = React.useState(-1);   // index of the vertex being dragged (-1 = none)
  const agg = React.useMemo(() => lkRadarAgg(rows), [rows]);
  const dashed = React.useMemo(() => {
    const vals = LK_RADAR_AXES.map(ax => lkLibMean(ax.k));
    return vals.some(v => v == null) ? null : vals.map(v => Math.max(0, Math.min(1, v / 100)));
  }, []);
  const ang = i => (i / n) * Math.PI * 2 - Math.PI / 2;
  const pt = (i, v) => [c + Math.cos(ang(i)) * r * v, c + Math.sin(ang(i)) * r * v];
  const poly = vals => vals.map((v, i) => pt(i, v).map(x => x.toFixed(1)).join(",")).join(" ");
  // pointer → new radial value for axis `i`: project the cursor onto that axis's spoke, clamp 0..1.
  const valueAt = (i, clientX, clientY) => {
    const rect = svgRef.current.getBoundingClientRect();
    const sx = S / rect.width, sy = S / rect.height;            // css px → viewBox units
    const dx = (clientX - rect.left) * sx - c, dy = (clientY - rect.top) * sy - c;
    const proj = (dx * Math.cos(ang(i)) + dy * Math.sin(ang(i))) / r;
    return Math.max(0, Math.min(1, proj));
  };
  const onDown = (i, e) => {
    // interacting with the shape (even while dimmed) flips mode→'dna' via onTarget below; a pointerdown
    // on a vertex both grabs it and sets that axis to the cursor's radial position.
    e.currentTarget.setPointerCapture(e.pointerId); setDrag(i);
    const next = target.slice(); next[i] = valueAt(i, e.clientX, e.clientY);
    if (onTarget) onTarget(next);
  };
  const onMove = e => {
    if (drag < 0) return;
    const next = target.slice(); next[drag] = valueAt(drag, e.clientX, e.clientY);
    if (onTarget) onTarget(next);
  };
  const onUp = () => setDrag(-1);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, opacity: dimmed ? 0.45 : 1, transition: "opacity .2s" }}>
      <svg ref={svgRef} width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{ touchAction: "none", cursor: drag >= 0 ? "grabbing" : "default" }}
        onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        {[0.25, 0.5, 0.75, 1].map((g, i) => (
          <polygon key={i} points={LK_RADAR_AXES.map((_, j) => pt(j, g).join(",")).join(" ")} fill="none" stroke="var(--rule-2)" strokeWidth="1" opacity={0.6 - i * 0.1} />
        ))}
        {LK_RADAR_AXES.map((_, j) => { const p = pt(j, 1); return <line key={j} x1={c} y1={c} x2={p[0]} y2={p[1]} stroke="var(--rule)" strokeWidth="1" />; })}
        {/* faint = liked aggregate (the whole selection's shape) */}
        <polygon points={poly(agg)} fill="none" stroke="var(--ink-faint)" strokeWidth="1" opacity="0.5" />
        {/* dashed = whole-library average */}
        {dashed && <polygon points={poly(dashed)} fill="none" stroke="var(--ink-faint)" strokeWidth="1.3" strokeDasharray="3 3" opacity="0.8" />}
        {/* solid = the draggable TARGET */}
        <polygon points={poly(target)} fill="var(--accent-bg)" stroke="var(--accent)" strokeWidth="1.8" />
        {/* draggable vertices — generous ~14px transparent hit area over a small visible knob */}
        {target.map((v, j) => { const p = pt(j, v); return (
          <g key={j}>
            <circle cx={p[0]} cy={p[1]} r="14" fill="transparent" style={{ cursor: "grab" }} onPointerDown={e => onDown(j, e)} />
            <circle cx={p[0]} cy={p[1]} r={drag === j ? 5 : 3.5} fill="var(--accent)" stroke="var(--bg)" strokeWidth="1" style={{ pointerEvents: "none" }} />
          </g>
        ); })}
        {LK_RADAR_AXES.map((ax, j) => { const p = pt(j, 1.18);
          return <text key={j} x={p[0]} y={p[1]} fill="var(--ink-soft)" fontSize="8.5" fontFamily="var(--mono)" textAnchor="middle" dominantBaseline="middle" style={{ letterSpacing: ".06em", textTransform: "uppercase" }}>{ax.label}</text>; })}
      </svg>
      <div className="r-mono" style={{ fontSize: 8.5, color: "var(--ink-faint)", textAlign: "center", lineHeight: 1.4 }}>
        drag a vertex to set a target · dashed = your library · faint = this selection
      </div>
    </div>
  );
}
function LikedRow({ r, legendByCode, famById, go, navable, albumCover }) {
  // id (spotify track id) is no longer read — the row-level Spotify redirect was removed (owner
  // 2026-08-17, "redundant"). Kept in the destructure only to hold the positional slot.
  const [, plays, firstYear, code, famId, tempo, energy] = r.meta;
  // the "2010.10" month column (Fuad 2026-08-22) — meta slot 9. Real SAVE months once
  // liked-added.json exists (pull-liked-added.js, one-time OAuth pull); until then the first
  // scrobble month stands in, and the tooltip wording follows the build flag so it never
  // claims "added" for a month that is actually first-heard.
  const firstYM = r.meta[9] || (firstYear ? String(firstYear) : "");
  const ymWord = window.ROTATION_LIKED_ADDED_REAL ? "added" : "first heard";
  const leg = legendByCode[code] || { key: "mid", label: "Mid" };
  const color = LIKED_BUCKET_COLOR[leg.key] || "oklch(0.68 0.12 320)";  // brand labels get a fixed violet
  const fam = famId != null ? famById[famId] : null;
  const canNav = navable && go;
  const hue = fam ? fam.hue : 40;
  // genre → colour: the family hue tints the ARTIST NAME (all widths — harmless, and it's how the
  // genre survives once its text chip is hidden on mobile). Discoverable via the title tooltip.
  const famTint = fam ? "oklch(0.72 0.11 " + fam.hue + ")" : "var(--ink-faint)";
  // bucket label: the single leading capital was only ever meant for MOBILE, where the row runs out
  // of width — on a full screen it should still read "Doorway", not "D" (Fuad 2026-08-19; it had
  // been applied at every width). Both forms are rendered and CSS shows one, so there is no
  // window-width state and nothing re-renders on resize. The title holds the full word regardless.
  const bucketLetter = (leg.label || "?").charAt(0).toUpperCase();
  return (
    <div className="lk-row" style={{ display: "flex", alignItems: "center", gap: 10, height: 52, padding: "0 4px", borderBottom: "1px solid var(--rule)", cursor: canNav ? "pointer" : "default" }}
      onClick={canNav ? () => go("track", r.key) : undefined}>
      {/* left miniatures: round artist thumb (auto-resolved by GenCover) + square album cover.
          GenCover paints a generated gradient underneath, so an unresolved thumb reads as a tasteful
          placeholder — never a broken-image icon. */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <GenCover hue={hue} name={r.artist} size={28} radius={999} />
        <GenCover hue={hue} name={r.album || r.artist} image={albumCover || ""} thumb={albumCover || ""} size={28} radius={5} />
      </div>
      <div className="lk-title" style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: canNav ? "var(--ink)" : "var(--ink-soft)" }} title={r.track}>{r.track}</div>
        <div className="r-mono" style={{ fontSize: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
          title={fam ? r.artist + " · " + fam.family : r.artist}>
          {/* artist name carries the genre as a colour tint (fam hue). The " · genre" text stays on
              desktop for legibility but is hidden on mobile (.lk-genre) — the tint is the mobile cue. */}
          <span style={{ color: famTint }}>{r.artist}</span>{fam ? <span className="lk-genre" style={{ color: famTint }}> · {fam.family}</span> : ""}
        </div>
      </div>
      <span className="r-mono lk-nums" style={{ fontSize: 9.5, color: "var(--ink-faint)", width: 70, textAlign: "right", whiteSpace: "nowrap" }}
        title={tempo != null ? tempo + " BPM · energy " + energy : "no audio features"}>
        {tempo != null ? tempo + "♩" : ""}{tempo != null && energy != null ? " " : ""}{energy != null ? "e" + energy : ""}</span>
      <span className="r-chip lk-bucket" style={{ borderColor: color, color, textTransform: "none", cursor: "inherit" }} title={leg.label}>
        <span className="lk-bucket-full">{leg.label}</span><span className="lk-bucket-abbr">{bucketLetter}</span>
      </span>
      <span className="r-mono lk-nums" style={{ fontSize: 10.5, color: "var(--ink-soft)", width: 46, textAlign: "right" }}>{plays ? plays + "p" : "—"}</span>
      <span className="r-mono lk-nums" style={{ fontSize: 10, color: "var(--ink-faint)", width: 50, textAlign: "right" }}
        title={firstYM ? ymWord + " " + firstYM : "never scrobbled"}>{firstYM || "·"}</span>
    </div>
  );
}
function LikedView({ go }) {
  const [ready, setReady] = React.useState(!!window.ROTATION_LIKED_META);
  const [failed, setFailed] = React.useState(false);
  const [mediaReady, setMediaReady] = React.useState(!!window.ROTATION_MEDIA);
  const [taReady, setTaReady] = React.useState(!!window.ROTATION_TRACKAUDIO);   // extra DNA axes (lazy)
  const [restReady, setRestReady] = React.useState(() => !!(window.ROTATION && window.ROTATION._restLoaded));  // deferred bundle → R.expById (explorable-artist vx for the vocals filter)
  const [q, setQ] = React.useState("");
  const [bucket, setBucket] = React.useState("all");
  const [sort, setSort] = React.useState("plays");
  const [inv, setInv] = React.useState(false);   // transient invert of the active sort's direction (reset when sort changes)
  const [fams, setFams] = React.useState(() => new Set());   // selected family ids (empty = all)
  const [subFilter, setSubFilter] = React.useState("");      // subgenre label ("" = any)
  const [vocals, setVocals] = React.useState("any");         // vocals dimension — ALWAYS-ON class (any/male/female/mixed/nb/instrumental), independent of DNA/sliders arbitration
  // The standalone tempo/energy/mood handles were removed 2026-08-12 — the DNA tuner's tempo/energy
  // bands + valence(positivity) axis fully replace them. Their filter now lives entirely in the bands.
  const [tuneOpen, setTuneOpen] = React.useState(true);      // DNA tuner panel OPEN BY DEFAULT (owner)
  const [bands, setBands] = React.useState(() => ({}));      // { axisKey: [lo, hi] } — absent = full range (no filter)
  const [keySel, setKeySel] = React.useState(() => new Set()); // selected pitch classes 0..11 (empty = any)
  const [mode, setMode] = React.useState("any");             // any | major | minor
  // ── mode arbitration (owner 2026-08-12): ONE filter system dictates at a time, last-touched wins.
  //    null = neither engaged yet (both idle). Touching a band/key/mode → 'sliders'; dragging a radar
  //    vertex or the tolerance → 'dna'. The INACTIVE system keeps its values (dimmed, not reset).
  const [arbMode, setArbMode] = React.useState(null);        // null | 'sliders' | 'dna'
  const [target, setTarget] = React.useState(null);          // draggable radar TARGET (6-array 0..1); null until seeded
  const [tol, setTol] = React.useState(0.25);                // distance tolerance 0.05..0.60 (default ~25%)
  const [win, setWin] = React.useState({ start: 0, end: 60 });   // rendered row window
  const scrollRef = React.useRef(null);
  const tuneRef = React.useRef(null);   // the DNA panel (now under the results) — header pill jumps here

  React.useEffect(() => {
    if (!window.ROTATION_LIKED_META) {
      const s = document.createElement("script"); s.src = "liked-meta.js";
      s.onload = () => setReady(true); s.onerror = () => setFailed(true);
      document.head.appendChild(s);
    }
    // media-index tells us which rows can deep-link to a TrackView (some saves were never scrobbled)
    if (!window.ROTATION_MEDIA) {
      const s = document.createElement("script"); s.src = "media-index.js";
      s.onload = () => setMediaReady(true); s.onerror = () => {};
      document.head.appendChild(s);
    }
    // track-audio blob carries the extra DNA axes (loudness/speech/live/pop/key/mode) per track. Shared
    // with Explore/Album/Track views; only loaded once. The tuner degrades to tempo/energy/valence/dance
    // until it lands, so the page is usable immediately.
    if (!window.ROTATION_TRACKAUDIO) {
      const id = "xp-track-audio-js";
      if (!document.getElementById(id)) {
        const s = document.createElement("script"); s.id = id; s.src = "track-audio.js";
        s.onload = () => setTaReady(true); s.onerror = () => {};
        document.head.appendChild(s);
      } else {
        const poll = setInterval(() => { if (window.ROTATION_TRACKAUDIO) { clearInterval(poll); setTaReady(true); } }, 120);
        return () => clearInterval(poll);
      }
    }
  }, []);

  // the app loads music-rest.js at top level (rebuilds R.expById, carrying every explorable artist's
  // vx). Poll until it lands so the vocals filter's artist-join lights up for non-kept artists too.
  React.useEffect(() => {
    if (window.ROTATION && window.ROTATION._restLoaded) { setRestReady(true); return; }
    const poll = setInterval(() => { if (window.ROTATION && window.ROTATION._restLoaded) { clearInterval(poll); setRestReady(true); } }, 200);
    return () => clearInterval(poll);
  }, []);

  const R = window.ROTATION;
  const legend = (window.ROTATION_LIKED_LEGEND || []);
  const legendByCode = React.useMemo(() => Object.fromEntries(legend.map(l => [l.code, l])), [legend.length]);
  const famList = (window.ROTATION_LIKED_FAMS || []);
  const famById = React.useMemo(() => Object.fromEntries(famList.map(f => [f.i, f])), [famList.length]);
  const subsByArtist = window.ROTATION_LIKED_SUBS || {};

  // set of media track keys (slug(artist)~slug(track)) that exist → those rows are clickable
  const navKeys = React.useMemo(() => {
    const set = new Set();
    const M = window.ROTATION_MEDIA;
    if (M && R) for (const t of M.tracks) set.add(R.slug(M.artists[t[1]]) + "~" + R.slug(t[0]));
    return set;
  }, [mediaReady]);

  // album cover + real-name lookup keyed "<artistSlug>~<albumSlug>", built from the media-index
  // album rows (al[6] = Spotify cover url). The liked rows carry the album slug (meta[8]); this map
  // is the FALLBACK join for unscrobbled saves (no media track row). media-index is already loaded
  // for navKeys, so this adds no fetch. ~89% of saves land an album here; the rest fall back to a
  // generated placeholder.
  const albCoverBySlug = React.useMemo(() => {
    const M = window.ROTATION_MEDIA; const out = new Map();
    if (M && R && M.albums) for (const al of M.albums) { if (al[6]) out.set(R.slug(M.artists[al[1]]) + "~" + R.slug(al[0]), al[6]); }
    return out;
  }, [mediaReady]);
  const albNameBySlug = React.useMemo(() => {
    const M = window.ROTATION_MEDIA; const out = new Map();
    if (M && R && M.albums) for (const al of M.albums) { const k = R.slug(M.artists[al[1]]) + "~" + R.slug(al[0]); if (!out.has(k)) out.set(k, al[0]); }
    return out;
  }, [mediaReady]);
  // GROUND TRUTH for a scrobbled row: the media track row (t) carries t[3] = its own album index, so
  // M.albums[t[3]] is the exact album the track was played from — [6]=cover, [0]=name. The liked-src
  // album NAME (meta[8]) is often a standalone single that slugs to a DIFFERENT same-artist album,
  // so the name-slug join above resolves the wrong cover for ~2% of saves (and misses ~2% more whose
  // single has no cover row). Keying by the track's real album index removes that whole class of bug.
  const trackAlbumByKey = React.useMemo(() => {
    const M = window.ROTATION_MEDIA; const out = new Map();
    if (M && R && M.tracks && M.albums) for (const t of M.tracks) {
      const ai = t[3];                                    // media track [3] = album index (-1 if none)
      if (ai == null || ai < 0) continue;
      const al = M.albums[ai]; if (!al) continue;
      const k = R.slug(M.artists[t[1]]) + "~" + R.slug(t[0]);
      if (!out.has(k)) out.set(k, [al[6] || "", al[0]]);  // [cover, name]
    }
    return out;
  }, [mediaReady]);

  // flatten the meta map into rows once, re-deriving artist/title from the media index where present
  // (real names), falling back to a de-slugged label for unscrobbled saves.
  const rows = React.useMemo(() => {
    const META = window.ROTATION_LIKED_META; if (!META) return [];
    const M = window.ROTATION_MEDIA;
    const TA = window.ROTATION_TRACKAUDIO || null;   // per-track extra DNA axes, keyed like a liked row
    const LAX = window.ROTATION_LIKED_AUDIO_X || null;   // liked-scoped parquet sidecar (rides liked-meta.js)
    const nameByKey = new Map();
    if (M && R) for (const t of M.tracks) { const k = R.slug(M.artists[t[1]]) + "~" + R.slug(t[0]); if (!nameByKey.has(k)) nameByKey.set(k, [M.artists[t[1]], t[0]]); }
    const deslug = s => s.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    const out = [];
    for (const key in META) {
      const meta = META[key];
      const ix = key.indexOf("~");
      const pair = nameByKey.get(key);
      const artist = pair ? pair[0] : deslug(key.slice(0, ix));
      const track = pair ? pair[1] : deslug(key.slice(ix + 1));
      const leg = legendByCode[meta[3]] || { key: "mid" };
      const aSlug = key.slice(0, ix);
      // album cover + name for the row thumbnail. GROUND TRUTH first: if the track is scrobbled, use
      // the album it was actually played from (media track [3] → album row). Only unscrobbled saves
      // (or scrobbled ones whose album row lacks a cover) fall back to the meta[8] album-name slug
      // join, then to a de-slugged label.
      const albumSlug = meta[8] || "";
      const truth = trackAlbumByKey.get(key);            // [cover, name] from the track's real album
      const joinKey = aSlug + "~" + albumSlug;
      const albumCover = (truth && truth[0]) || albCoverBySlug.get(joinKey) || "";
      const album = (truth && truth[1]) || albNameBySlug.get(joinKey) || (albumSlug ? deslug(albumSlug) : "");
      // extra DNA axes from the track-audio blob (same key). Only valid features surface — a loudness
      // of exactly 0 is real, but a whole-row miss (no TA entry) leaves these null so the band filter
      // excludes the row only while that axis is engaged. Saves the corpus store misses (unscrobbled,
      // or featureless 4-field rows) fall back to the liked-scoped parquet sidecar (same TA slot
      // layout), which is what shrank the tuner's "without data" pool (2026-08-12).
      let ta = TA ? TA[key] : null;
      if (!(ta && ta.length >= 15) && LAX && LAX[key]) ta = LAX[key];
      const taOk = ta && ta.length >= 15;   // 16-field rows carry features; 4-field rows are featureless
      const _sub = subsByArtist[aSlug] || "";
      const _fam = (window.ROTATION_LIKED_FAMS || []).find(f => f.i === meta[4]);
      out.push({ key, meta, artist, track, album, albumCover, aSlug, albumSlug, bucketKey: leg.key,
        famId: meta[4], sub: _sub,
        // SEARCH HAYSTACK (Fuad 2026-08-21) — artist + title + subgenre + genre family, folded once
        // here rather than rebuilt inside the three separate filters that need it. Adding the
        // subgenre to the matcher means typing "shoegaze" finds the tracks even when no chip is set,
        // and the family name comes along so "metalcore" works whether it is a family or a subgenre.
        _hay: (artist + " " + track + " " + _sub + " " + (_fam ? _fam.family : "")).toLowerCase(),
        tempo: meta[5], energy: meta[6], valence: meta[7],
        dance:    taOk ? ta[TA_IDX.dance]    : null,
        acoustic: taOk ? ta[TA_IDX.acoustic] : null,   // radar axis (0..100)
        instr:    taOk ? ta[TA_IDX.instr]    : null,   // radar axis (0..100)
        tempoN:   taOk ? ta[TA_IDX.tempoN]   : null,   // 0..100 tempo remap for the radar (real BPM lives in .tempo)
        loud:   taOk ? ta[TA_IDX.loud] : null,
        speech: taOk ? ta[TA_IDX.speech] : null,
        live:   taOk ? ta[TA_IDX.live] : null,
        pop:    taOk ? ta[TA_IDX.pop]  : null,
        pkey:   taOk ? ta[TA_IDX.key]  : null,
        pmode:  taOk ? ta[TA_IDX.mode] : null });
    }
    return out;
  }, [ready, mediaReady, taReady, legendByCode, albNameBySlug, albCoverBySlug, trackAlbumByKey]);

  // vocals join: each liked row's aSlug (= R.slug(artist)) → the artist record's `vx` code, the SAME
  // field the Explore vocals chip reads (R.expById for explorable artists, R.byId for kept ones — kept
  // vx ships in music-core, explorable vx arrives with music-rest, hence the restReady dep). A slug
  // absent from both stays undefined → the row is hidden only while a vocals option is active.
  const vxBySlug = React.useMemo(() => {
    const m = new Map();
    // liked-scoped codes (ride liked-meta.js): liked-only artists have no byId/expById record,
    // so their vocals.json entries never surfaced here before this fallback (2026-08-12).
    const LVX = window.ROTATION_LIKED_VX || null;
    if (R) for (const r of rows) {
      if (m.has(r.aSlug)) continue;
      const e = (R.expById && R.expById[r.aSlug]) || (R.byId && R.byId[r.aSlug]);
      const v = e && e.vx !== undefined ? e.vx : (LVX && r.aSlug in LVX ? LVX[r.aSlug] : undefined);
      m.set(r.aSlug, v);   // undefined = no vocals data for this artist
    }
    return m;
  }, [rows, restReady]);
  const vocalsActive = vocals !== "any";

  // aggregate liked-corpus profile per axis: min/max/mean + a coarse histogram of where the songs sit.
  // Feeds the dashed "your average" tick + the sparkline behind each slider, and initializes each band
  // to the corpus min..max so "the filter starts encapsulating all" (no filtering until a handle moves).
  const HIST_BINS = 24;
  const corpus = React.useMemo(() => {
    const out = {};
    for (const ax of LK_DNA_AXES) {
      const vals = [];
      for (const r of rows) { const v = ax.get(r); if (v != null && Number.isFinite(v)) vals.push(v); }
      if (!vals.length) { out[ax.k] = null; continue; }
      let lo = Infinity, hi = -Infinity, sum = 0;
      for (const v of vals) { if (v < lo) lo = v; if (v > hi) hi = v; sum += v; }
      lo = Math.max(ax.min, Math.floor(lo)); hi = Math.min(ax.max, Math.ceil(hi));
      const hist = new Array(HIST_BINS).fill(0), span = ax.max - ax.min || 1;
      for (const v of vals) { let b = Math.floor(((v - ax.min) / span) * HIST_BINS); if (b < 0) b = 0; if (b >= HIST_BINS) b = HIST_BINS - 1; hist[b]++; }
      const peak = Math.max(...hist, 1);
      out[ax.k] = { lo, hi, mean: sum / vals.length, n: vals.length, hist: hist.map(h => h / peak) };
    }
    return out;
  }, [rows]);
  // the axes that actually have corpus data — everything else is dropped from the panel
  const liveAxes = React.useMemo(() => LK_DNA_AXES.filter(ax => corpus[ax.k] && corpus[ax.k].n > 0), [corpus]);
  // does the liked corpus carry key/mode? (gates the pitch-chip row + major/minor toggle)
  const hasKey = React.useMemo(() => rows.some(r => r.pkey != null), [rows]);
  const hasMode = React.useMemo(() => rows.some(r => r.pmode != null), [rows]);

  // bucket counts (over the full set, unfiltered by search) for the chip labels
  const counts = React.useMemo(() => {
    const c = { all: rows.length };
    for (const r of rows) c[r.bucketKey] = (c[r.bucketKey] || 0) + 1;
    return c;
  }, [rows]);

  // family counts + subgenre option list — live-scoped to the CURRENT non-genre filters (bucket +
  // search), so the chip numbers reflect what a family click would actually surface.
  const genreBase = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter(r => (bucket === "all" || r.bucketKey === bucket) &&
      (!needle || r._hay.includes(needle)));
  }, [rows, q, bucket]);
  const famCounts = React.useMemo(() => {
    const c = {}; for (const r of genreBase) if (r.famId != null) c[r.famId] = (c[r.famId] || 0) + 1;
    return c;
  }, [genreBase]);
  const subOptions = React.useMemo(() => {
    // subgenres present among rows whose family is selected (or all rows if no family picked)
    const m = new Map();
    for (const r of genreBase) {
      if (fams.size && (r.famId == null || !fams.has(r.famId))) continue;
      if (r.sub) m.set(r.sub, (m.get(r.sub) || 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [genreBase, fams]);

  // DNA tuner: which axis bands are actually narrowed off the corpus min..max (an engaged band = a
  // filter). A band initialized to [corpus.lo, corpus.hi] is inert; it only bites once a handle moves.
  const activeBands = React.useMemo(() => {
    const out = [];
    for (const ax of liveAxes) {
      const b = bands[ax.k], c = corpus[ax.k]; if (!b || !c) continue;
      if (b[0] > c.lo || b[1] < c.hi) out.push({ ax, lo: b[0], hi: b[1] });
    }
    return out;
  }, [bands, liveAxes, corpus]);
  const keyActive = keySel.size > 0, modeActive = mode !== "any";
  // does each SYSTEM carry any narrowing? (independent of which one currently dictates)
  const slidersEngaged = activeBands.length > 0 || keyActive || modeActive;
  // which system DICTATES the pipeline right now (last-touched wins; only one applies at a time)
  const dictating = arbMode;   // null | 'sliders' | 'dna'
  const anyTuneActive = dictating != null && (dictating === "sliders" ? slidersEngaged : true);

  // filtered list. Only the DICTATING system applies (plus the always-on bucket/genre/search filters).
  // hiddenNoData counts rows dropped ONLY because they lack audio data while a DNA system dictates.
  const { list: filtered, hiddenNoData } = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    let hidden = 0;
    const useSliders = dictating === "sliders";
    const useDna = dictating === "dna" && target != null;
    let list = rows.filter(r => {
      if (bucket !== "all" && r.bucketKey !== bucket) return false;
      if (needle && !r._hay.includes(needle)) return false;
      if (fams.size && (r.famId == null || !fams.has(r.famId))) return false;
      if (subFilter && r.sub !== subFilter) return false;
      // vocals dimension — ALWAYS-ON (like bucket/genre/search), independent of DNA/sliders arbitration.
      // Rows whose artist has no vx are excluded only while a vocals option is active (no-data convention).
      if (vocalsActive && !lkVocalsPass(vxBySlug.get(r.aSlug), vocals)) return false;
      if (useSliders) {
        const noData = r.tempo == null && r.energy == null;
        if (noData) { hidden++; return false; }   // hide featureless rows when a band is engaged
        // DNA bands: each active band excludes rows outside [lo,hi]. Missing datum on THAT axis excludes
        // the row (the vocals-filter convention) — but only because the band is engaged.
        for (const { ax, lo, hi } of activeBands) {
          const v = ax.get(r);
          if (v == null || v < lo || v > hi) return false;
        }
        if (keyActive && (r.pkey == null || !keySel.has(r.pkey))) return false;
        if (modeActive) {
          if (r.pmode == null) return false;
          if (mode === "major" && r.pmode !== 1) return false;
          if (mode === "minor" && r.pmode !== 0) return false;
        }
      } else if (useDna) {
        // target-shape filter: keep rows whose normalized distance to the target ≤ tolerance. Rows
        // missing any radar-axis datum can't be distance-compared → excluded (no-data convention, but
        // ONLY because DNA dictates).
        const vec = lkRowVec(r);
        if (vec == null) { hidden++; return false; }
        if (lkTargetDist(vec, target) > tol) return false;
      }
      return true;
    });
    const s = list.slice();
    if (sort === "closest" && useDna) s.sort((a, b) => {
      const va = lkRowVec(a), vb = lkRowVec(b);
      return (va ? lkTargetDist(va, target) : Infinity) - (vb ? lkTargetDist(vb, target) : Infinity);
    });
    else if (sort === "plays") s.sort((a, b) => b.meta[1] - a.meta[1] || a.artist.localeCompare(b.artist));
    else if (sort === "first-new") s.sort((a, b) => (b.meta[2] || 0) - (a.meta[2] || 0) || b.meta[1] - a.meta[1]);
    else if (sort === "first-old") s.sort((a, b) => (a.meta[2] || 9999) - (b.meta[2] || 9999) || b.meta[1] - a.meta[1]);
    else if (sort === "artist") s.sort((a, b) => a.artist.localeCompare(b.artist) || a.track.localeCompare(b.track));
    else if (sort === "tempo") s.sort((a, b) => (a.tempo == null) - (b.tempo == null) || (a.tempo || 0) - (b.tempo || 0));
    else if (sort === "energy") s.sort((a, b) => (a.energy == null) - (b.energy == null) || (b.energy || 0) - (a.energy || 0));
    // valence, 91% covered — the third of the three basic audio axes, and the only one the row of
    // chips stopped short of. tempo says how fast, energy says how hard, mood says how it feels.
    else if (sort === "mood") s.sort((a, b) => (a.valence == null) - (b.valence == null) || (b.valence || 0) - (a.valence || 0));
    // Spotify popularity, 75% covered — the only axis here that is not about you. Everything else
    // ranks by what YOU did with the track; this ranks by what everyone else did, so the tracks
    // nobody streams come first. The uncovered quarter parks at the tail like tempo/energy nulls.
    else if (sort === "obscure") s.sort((a, b) => (a.pop == null) - (b.pop == null) || (a.pop || 0) - (b.pop || 0));
    else if (sort === "neglect") s.sort((a, b) => lkFade(a) - lkFade(b) || (a.meta[2] || 9999) - (b.meta[2] || 9999));
    // INVERT flips the active sort's direction. Rows lacking the sort datum (tempo/energy null) are
    // parked last by the comparators above via the `(x == null)` primer; reversing would float them to
    // the top, so keep those no-data rows pinned to the tail and only reverse the rows that HAVE data.
    // `dated` must be a FRESH array even when nothing is dataless (Fuad 2026-08-20: inverting newest
    // or plays returned an empty list). The old form aliased `s` itself in that case, so `s.length = 0`
    // emptied the very array the next line was about to spread. Only tempo and energy escaped it,
    // because their filter happened to allocate. first-new joins them: a row with no year is parked at
    // the tail by `|| 0` in the comparator, and should stay there rather than head the inverted list.
    if (inv) {
      const lacks = (r) => sort === "tempo" ? r.tempo == null
        : sort === "energy" ? r.energy == null
        : sort === "mood" ? r.valence == null
        : sort === "obscure" ? r.pop == null
        : sort === "first-new" ? !r.meta[2]
        : false;   // `neglect` derives from plays + firstYear, both 100% populated — no tail to pin
      const dataless = s.filter(lacks);
      const dated = s.filter(r => !lacks(r));
      dated.reverse();
      s.length = 0; s.push(...dated, ...dataless);
    }
    return { list: s, hiddenNoData: hidden };
  }, [rows, q, bucket, sort, inv, fams, subFilter, vocals, vocalsActive, vxBySlug, dictating, target, tol, activeBands, keyActive, modeActive, keySel, mode]);

  // how many rows the ACTIVE vocals filter drops purely for lacking artist vx — the same "N without
  // data" honesty as the audio sliders. Counts rows passing the OTHER always-on filters (bucket/genre/
  // search) whose artist has no vx (vocalsActive only).
  const vocalsNoData = React.useMemo(() => {
    if (!vocalsActive) return 0;
    const needle = q.trim().toLowerCase();
    let n = 0;
    for (const r of rows) {
      if (bucket !== "all" && r.bucketKey !== bucket) continue;
      if (needle && !r._hay.includes(needle)) continue;
      if (fams.size && (r.famId == null || !fams.has(r.famId))) continue;
      if (subFilter && r.sub !== subFilter) continue;
      if (vxBySlug.get(r.aSlug) === undefined) n++;
    }
    return n;
  }, [rows, q, bucket, fams, subFilter, vocals, vocalsActive, vxBySlug]);

  // seed the draggable TARGET from the current liked aggregate ONCE audio data is present (before the
  // user has touched it). Re-seeds only while still untouched (arbMode !== 'dna') so it tracks the
  // corpus as track-audio lazy-loads; a user drag (arbMode='dna') freezes it.
  React.useEffect(() => {
    if (arbMode === "dna") return;              // user owns it now — don't clobber
    if (!taReady && target != null) return;     // keep the first seed until full audio lands
    const seed = lkRadarAgg(rows);
    if (seed.some(v => v > 0)) setTarget(seed);
  }, [rows, taReady, arbMode]);

  // windowing: render only rows near the viewport. ROW_H must match the row height in LikedRow.
  const ROW_H = 52, PAD = 18, OVERSCAN = 12;
  React.useEffect(() => { setWin({ start: 0, end: 60 }); if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [q, bucket, sort, inv, fams, subFilter, vocals, dictating, activeBands, keyActive, modeActive, target, tol]);
  // drop a subgenre selection that the current family set no longer offers
  React.useEffect(() => { if (subFilter && !subOptions.some(([s]) => s === subFilter)) setSubFilter(""); }, [subOptions, subFilter]);
  // "closest" sort only exists while DNA dictates — fall back to plays if the shape stops dictating
  React.useEffect(() => { if (sort === "closest" && dictating !== "dna") setSort("plays"); }, [sort, dictating]);
  const onScroll = React.useCallback(e => {
    const st = e.target.scrollTop, h = e.target.clientHeight;
    const start = Math.max(0, Math.floor(st / ROW_H) - OVERSCAN);
    const end = Math.ceil((st + h) / ROW_H) + OVERSCAN;
    setWin(w => (w.start === start && w.end === end) ? w : { start, end });
  }, []);

  if (failed && !ready) return (
    <div className="r-view"><button className="r-back" onClick={() => go("spotify")}>← spotify</button>
      <div className="r-rest-wait r-mono">Liked-songs data isn't available right now.</div></div>
  );
  if (!ready && !window.ROTATION_LIKED_META) return <div className="r-view"><div className="r-rest-wait r-mono">loading your liked songs…</div></div>;

  const CHIPS = [["all", "All"], ...legend.map(l => [l.key, l.label])].filter(([k]) => k === "all" || counts[k]);
  const total = filtered.length;
  const vis = filtered.slice(win.start, win.end);

  // reset BOTH tune systems and clear the arbitration mode (owner: the bucket-row ✕ nukes everything).
  // The sliders go inert (bands to full corpus range, key/mode cleared); the DNA target re-seeds from
  // the aggregate (via the seeding effect, now that arbMode is no longer 'dna'), tolerance to default.
  const resetTune = () => { setBands({}); setKeySel(new Set()); setMode("any"); setTol(0.25); setArbMode(null); };
  // a band's current [lo,hi], defaulting to the corpus full range so it starts encapsulating all.
  const bandOf = (ax) => { const c = corpus[ax.k]; return bands[ax.k] || (c ? [c.lo, c.hi] : [ax.min, ax.max]); };
  // ── mode-arbitration setters: touching a slider control claims 'sliders'; a radar drag / tolerance
  //    claims 'dna'. Each wraps the underlying setState so ANY interaction flips the dictating system
  //    (last-touched wins), and interacting with a DIMMED group instantly takes it over.
  const setBand = (ax, v) => { setArbMode("sliders"); setBands(b => ({ ...b, [ax.k]: v })); };
  const claimSliders = () => setArbMode("sliders");
  const claimDna = () => setArbMode("dna");
  // radar vertex drag: any reported target change claims 'dna' (last-touched wins) and persists it.
  const onTarget = (next) => { setArbMode("dna"); setTarget(next); };
  const dimSliders = dictating === "dna";   // sliders idle while DNA dictates
  const dimDna = dictating === "sliders";   // shape idle while sliders dictate

  return (
    <div className="r-view lk-quiet">
      {/* QUIET CHIPS v3 (Fuad 2026-08-13): inactive chips mirror Explore's xp-chip resting
          grammar — soft var(--rule) border + ink-soft text, hover = ink-faint border + ink
          text, accent fill ONLY when active. (v1 rule-2 borders read distracting; v2
          borderless-at-rest also rejected — Explore-adjacent is the ruling.) Scoped to
          .lk-quiet; famchips keep their family-colour identity via --gc. No backticks here. */}
      <style>{`
        /* THE ACTUAL BUG (Fuad 2026-08-13, "the FILL is grey"): .r-chip never sets background —
           fine on spans, but these chips are <button>s, so the UA's native grey button fill
           showed through (Explore's xp-chip sets background:transparent explicitly, hence never
           had it). Fix = transparent fill at rest; text colour stays the DEFAULT ink-soft (the
           colored-text experiment is reverted — not asked for). Active keeps Explore's data-on
           grammar: full accent fill, near-black text. Family chips keep their --gc colours. */
        .lk-quiet .r-chip { background: transparent; }
        .lk-quiet .r-chip.link:not(.solid):not(.on) { border-color: var(--rule); color: var(--ink-soft); }
        .lk-quiet .r-chip.link:not(.solid):not(.on):hover { border-color: var(--ink-faint); color: var(--ink); background: transparent; }
        .lk-quiet .r-chip.link.solid, .lk-quiet .r-chip.link.lk-cchip.on,
        .lk-quiet .r-chip.link.solid:hover, .lk-quiet .r-chip.link.lk-cchip.on:hover {
          background: var(--accent); border-color: var(--accent); color: #0c0a08; }
        .lk-quiet .lk-famchip:not(.on) { border-color: var(--rule); background: transparent; }
        .lk-quiet .lk-famchip:not(.on):hover { border-color: var(--gc); background: transparent; color: var(--gc); }
        .lk-quiet .lk-famchip.on, .lk-quiet .lk-famchip.on:hover { border-color: var(--gc); background: var(--gc); color: #0c0a08; }
        .lk-quiet .lk-tunepill { border: 1px solid var(--rule); background: transparent; color: var(--ink-soft); transition: .15s; }
        .lk-quiet .lk-tunepill:hover { border-color: var(--ink-faint); color: var(--ink); }
        .lk-quiet .lk-tunepill.on { border-color: var(--accent); color: var(--accent); }
        /* sort segment: default r-seg lozenge; its buttons also need the UA fill cleared */
        .lk-quiet .r-seg button { background: transparent; }
        .lk-quiet .r-seg button[data-on="true"] { background: var(--accent); }
        /* header rhythm (Fuad 2026-08-13): the gap under "Your liked songs" was deeper than the
           kicker-to-title gap above — tightened so title-to-chips reads symmetrical. */
        .lk-quiet .r-viewhead { margin-bottom: calc(var(--pad) * 0.8); }
        /* subtle hover language (Fuad 2026-08-13): rows tint, the search field's border wakes on
           hover and glows faintly on focus — nothing moves, nothing shouts. */
        .lk-quiet .lk-row { transition: background .15s ease; }
        .lk-quiet .lk-row:hover { background: var(--bg-2); }
        .lk-quiet input:hover { border-color: var(--ink-faint); }
        .lk-quiet input:focus { border-color: var(--accent-dim); box-shadow: 0 0 0 3px var(--accent-bg); }
        /* bucket chip: FULL WORD on a full screen, leading capital only on mobile (Fuad 2026-08-19).
           The 2026-08-17 pass abbreviated it at every width, which was never the intent — the
           abbreviation exists to buy row width, and on desktop there is width to spare. Both forms
           are in the DOM and CSS picks one, so nothing depends on measuring the window. */
        .lk-quiet .lk-bucket { flex-shrink: 0; height: 20px; padding: 0 9px; display: inline-flex;
          align-items: center; justify-content: center; border-radius: 999px; font-weight: 600; }
        .lk-quiet .lk-bucket-abbr { display: none; }
        /* MOBILE (Fuad 2026-08-17): reclaim the row for the song name. The right-side numeric cluster
           (tempo/energy, plays, first-year) collapses out entirely — there is simply not enough width;
           the values stay reachable on desktop. The " · genre" text also hides (the artist-name colour
           tint carries the genre now). The bucket pip stays as the one right-side survivor. */
        /* the abbreviated forms exist only for phones — see the media block below */
        .lk-fam-abbr, .lk-tuneabbr { display: none; }
        @media (max-width: 760px) {
          /* GENRE CHIPS abbreviate (Fuad 2026-08-21). Both labels ship and CSS picks one, the same
             way the bucket pip already swaps its full word for a capital — no measuring in JS. */
          .lk-fam-full { display: none; }
          .lk-fam-abbr { display: inline; }
          /* TUNE DNA holds the kicker's line and shortens to DNA. The head is flex-wrap:wrap, so the
             pill was dropping to a second line and losing its right-hand anchor; nowrap keeps the
             two ends of the row facing each other, which is only affordable once the label is three
             characters long. */
          .lk-head { flex-wrap: nowrap !important; }
          .lk-tunelbl { display: none; }
          .lk-tuneabbr { display: inline; }
          /* buckets and vocals become two SEPARATE rails. One shared rail would mean scrolling past
             every bucket to reach the vocals chips, and the vocals label would scroll away from the
             chips it names. marginLeft:auto is what right-pins vocals on desktop; here the group is
             a full-width row of its own, so the auto margin has to go or it fights the width. */
          .lk-buckets, .lk-vocalsrow {
            /* !important is the whole fix (Fuad 2026-08-22, third attempt). Both of these divs carry
               an INLINE flexWrap:"wrap" from their style prop, and an inline declaration beats a
               stylesheet rule no matter how specific the selector — so the rows kept wrapping and
               the overflow never became scroll. Two earlier passes chased min-width up the ancestor
               chain, which was a real bug elsewhere and simply not this one. */
            flex-wrap: nowrap !important; overflow-x: auto; overflow-y: hidden; min-width: 0; width: 100%;
            scrollbar-width: none; -webkit-overflow-scrolling: touch; padding-bottom: 3px;
            -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 30px), transparent 100%);
                    mask-image: linear-gradient(to right, #000 calc(100% - 30px), transparent 100%);
          }
          .lk-buckets::-webkit-scrollbar, .lk-vocalsrow::-webkit-scrollbar { display: none; }
          .lk-buckets > *, .lk-vocalsrow > * { flex: none; }
          .lk-vocalsrow { margin-left: 0 !important; }
          /* RELEASE THE WHOLE CHAIN (Fuad 2026-08-21, second pass — the rails still were not
             scrolling). The rails themselves were right; their parent was not. .lk-bucketrow is a
             flex container AND a flex item, and a flex item defaults to min-width:auto, so it
             refused to shrink below its widest child and the overflow moved up a level instead of
             turning into scroll. min-width on the scroller alone never works — every ancestor
             between it and the page has to be released too. And width:100% on a rail is measured
             against this box, so while this box is too wide the rail is too. */
          .lk-bucketrow { min-width: 0; width: 100%; }
          .lk-bucketrow > * { min-width: 0; }
          /* TUNE DNA on a phone (Fuad 2026-08-21). The group is a fixed 190px column so the radar
             and its tolerance slider both sat hard against the left edge of a full-width card,
             with dead space to their right. Taking the full width does both jobs at once: the
             group already centres its children, so the radar centres itself, and the tolerance
             div is width:100% of the group, so it grows to the card. The radar is an SVG with its
             own size prop and does not stretch — only its box does. */
          .lk-dnagroup { width: 100% !important; flex: 1 1 100% !important; }
          .lk-quiet .lk-nums { display: none; }
          .lk-quiet .lk-genre { display: none; }
          /* here the abbreviation earns its keep — swap to the single capital and shrink the chip
             back to a round pip so the column costs almost nothing */
          .lk-quiet .lk-bucket-full { display: none; }
          .lk-quiet .lk-bucket-abbr { display: inline; }
          .lk-quiet .lk-bucket { width: 20px; padding: 0; }
          /* The reserved "reset tune" slot comes OUT of the flow on mobile (Fuad 2026-08-20:
             a gap under the vocals chips, above the genre row). It is always rendered and only
             visibility:hidden, so it keeps its box — and on a narrow screen that box wraps onto
             a line of its own, leaving a permanently empty row between vocals and genres.
             Reserving the slot exists to stop the row reflowing as a tune is set and cleared,
             which is worth it on a wide row where the button costs nothing; here it buys a
             flicker at the price of a standing gap, so on mobile the flicker wins. */
          .lk-quiet .lk-resettune:not(.lk-tuneon) { display: none; }
        }
      `}</style>
      {/* (the "← spotify" back button was removed on request — Fuad 2026-08-12; Liked is now a
          first-class navbar destination, so the up-navigation was noise) */}
      {/* header row: title on the left, the DNA TUNE control hugging the right (stacks under the
          title on narrow screens via flex-wrap). */}
      {/* title hidden (Fuad 2026-08-20); .r-headbare closes the gap it leaves. */}
      <div className="r-viewhead r-headbare lk-head" style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 10 }}>
        <div>
          <div className="r-kicker">Spotify · {rows.length} saved songs</div>
          {/* <h1 className="r-title">Your <em>liked</em> songs<span className="dot">.</span></h1> */}
        </div>
        {/* header "tune DNA" pill — the panel now lives UNDER the results, so this is a jump/collapse
            control: click scrolls down to the panel (opening it if collapsed); the chevron collapses it. */}
        <button onClick={() => {
            setTuneOpen(true);
            requestAnimationFrame(() => { if (tuneRef.current) tuneRef.current.scrollIntoView({ behavior: "smooth", block: "start" }); });
          }} className={"r-mono lk-tunepill" + (anyTuneActive ? " on" : "")}
          title="jump to the audio-DNA tuner (below the songs)"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase",
            padding: "7px 13px", borderRadius: 999, background: "transparent", cursor: "pointer" }}>
          <span className="lk-tunelbl">tune DNA</span><span className="lk-tuneabbr">DNA</span> {anyTuneActive ? <span style={{ opacity: .7 }}>· {dictating === "dna" ? "shape" : (activeBands.length + (keyActive ? 1 : 0) + (modeActive ? 1 : 0)) + " on"}</span> : null}
          <span onClick={e => { e.stopPropagation(); setTuneOpen(o => !o); }} title={tuneOpen ? "collapse" : "expand"} style={{ opacity: .8 }}>{tuneOpen ? "▾" : "▸"}</span>
        </button>
      </div>
      {/* bucket chips with counts — the ✕ at the right of THIS row resets the DNA tune (shown only when
          a band/key/mode is active), keeping the row uncluttered (the standalone handles are gone).
          Vocals chips are an ALWAYS-ON filter (like buckets/genre/search) and ride the RIGHT of this row
          (marginLeft:auto group), before the reserved reset-tune slot; the group wraps below when narrow. */}
      <div className="lk-bucketrow" style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10, alignItems: "center" }}>
        {/* wrapped so the bucket chips and the vocals group can become two SEPARATE rails on a
            phone; on desktop a nested flex with the same gap renders identically to the flat row */}
        <div className="lk-buckets" style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        {CHIPS.map(([k, label]) => (
          <button key={k} className={"r-chip link lk-cchip" + (bucket === k ? " on" : "")}
            style={{ textTransform: "none" }} onClick={() => setBucket(k)}>
            {label} <span style={{ opacity: .6 }}>{counts[k] || 0}</span>
          </button>
        ))}
        </div>
        {/* reset-tune (Fuad 2026-08-12): its slot is RESERVED — always rendered, hidden (visibility) +
            inert when no tune is active, so the row never reflows as it appears/disappears. Accent-toned
            (var(--accent) + accent-dim border), matching the clear-filter pill convention (gv-tour-chip).
            No longer marginLeft:auto — it trails the right-aligned vocals group. */}
        <button className={"r-chip link lk-resettune" + (anyTuneActive ? " lk-tuneon" : "")}
          aria-hidden={!anyTuneActive} tabIndex={anyTuneActive ? 0 : -1}
          style={{ textTransform: "none", color: "var(--accent)", borderColor: "var(--accent-dim)",
            visibility: anyTuneActive ? "visible" : "hidden", pointerEvents: anyTuneActive ? "auto" : "none" }}
          onClick={resetTune}>reset tune ✕</button>
        {/* vocals dimension — now the LAST item in the row, so marginLeft:auto genuinely pins it to
            the right edge. It used to sit before the reset-tune slot, which is always rendered and
            only visibility:hidden, so on desktop an invisible button held ~90px to the right of
            vocals and the group never reached the edge (Fuad 2026-08-20). Toggle semantics: clicking
            the active option returns to "any"; the "N without data" note shows only under one. */}
        <div className="lk-vocalsrow" style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginLeft: "auto" }}>
          <span className="r-mono" style={{ fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: vocalsActive ? "var(--accent)" : "var(--ink-faint)", marginRight: 2 }}>vocals</span>
          {LK_VOCALS.map(([k, l]) => (
            <button key={k} className={"r-chip link lk-cchip" + (vocals === k ? " on" : "")}
              style={{ textTransform: "none" }}
              onClick={() => setVocals(vocals === k ? "any" : k)}>{l}</button>
          ))}
          {vocalsActive && vocalsNoData > 0 &&
            <span className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)" }}>{vocalsNoData} without data</span>}
        </div>
      </div>

      {/* genre family chips (multi-select) + subgenre dropdown scoped to the selection */}
      {famList.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10, alignItems: "center" }}>
          {famList.filter(f => famCounts[f.i]).sort((a, b) => famCounts[b.i] - famCounts[a.i]).map(f => {
            const on = fams.has(f.i);
            const c = "oklch(0.7 0.12 " + f.hue + ")";
            return (
              <button key={f.i} className={"r-chip link lk-famchip" + (on ? " on" : "")} style={{ textTransform: "none", "--gc": c, color: on ? undefined : c }}
                onClick={() => setFams(s => { const n = new Set(s); n.has(f.i) ? n.delete(f.i) : n.add(f.i); return n; })}>
                {/* both labels ship and CSS picks one — same idiom as the bucket pip below, and it
                    keeps the swap a pure layout concern with no width measuring in JS */}
                <span className="lk-fam-full">{f.family}</span>
                <span className="lk-fam-abbr">{LK_FAM_ABBR[f.family] || f.family}</span>
                {" "}<span style={{ opacity: .6 }}>{famCounts[f.i]}</span>
              </button>
            );
          })}
          {fams.size > 0 && <button className="r-chip link" style={{ textTransform: "none", color: "var(--ink-faint)" }} onClick={() => setFams(new Set())}>clear ✕</button>}
          {subOptions.length > 0 && (
            <select value={subFilter} onChange={e => setSubFilter(e.target.value)}
              style={{ background: "var(--bg-2)", border: "1px solid var(--rule-2)", borderRadius: 999, padding: "5px 10px", color: subFilter ? "var(--accent)" : "var(--ink-soft)", fontFamily: "var(--mono)", fontSize: 10.5, outline: "none", maxWidth: 220 }}>
              <option value="">any subgenre</option>
              {subOptions.map(([s, n]) => <option key={s} value={s}>{s} ({n})</option>)}
            </select>
          )}
        </div>
      )}

      {/* (standalone tempo/energy/mood handles removed 2026-08-12 — replaced by the DNA tuner below) */}

      {/* search + sort */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 12 }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="search artist, title or genre…"
          style={{ flex: "1 1 200px", minWidth: 0, background: "var(--bg-2)", border: "1px solid var(--rule-2)", borderRadius: 999, padding: "8px 14px", color: "var(--ink)", fontFamily: "var(--mono)", fontSize: 12, outline: "none" }} />
        <div className="r-seg r-seg-sm" style={{ flexWrap: "wrap" }}>
          {/* "oldest" retired 2026-08-17 — replaced by the INVERT chip at the row's end, which flips
              whatever sort is active (owner request). "closest" is offered ONLY while the DNA dictates.
              Clicking the ACTIVE sort again flips it (Fuad 2026-08-24) — the column-header idiom.
              It lights the INVERT chip at the row's end, since that chip reads the same inv state;
              switching to a DIFFERENT sort still lands in its natural direction. (A JSX comment can't
              sit inside the map's parenthesized return — it broke the deploy once.) */}
          {[["plays", "plays"], ["first-new", "newest"], ["artist", "a–z"], ["tempo", "tempo"], ["energy", "energy"],
            ["mood", "mood"], ["neglect", "neglect"], ["obscure", "obscure"],
            ...(dictating === "dna" ? [["closest", "closest"]] : [])].map(([k, l]) => (
            <button key={k} data-on={sort === k}
              title={sort === k ? "click again to invert" : undefined}
              onClick={() => { if (sort === k) setInv(v => !v); else { setSort(k); setInv(false); } }}>{l}</button>
          ))}
          {/* INVERT — matches Explore's flip idiom (rotation-explore.jsx ~1762): a ▼/▲ glyph + a short
              label appropriate to the ACTIVE sort. Transient: switching sorts resets it (above). */}
          {(() => { const [hi, lo] = LK_FLIP[sort] || ["▼", "▲"]; return (
            <button data-on={inv} onClick={() => setInv(v => !v)} title="invert sort direction">{inv ? "▲ " + lo : "▼ " + hi}</button>); })()}
        </div>
      </div>

      {/* windowed list — FIXED-HEIGHT scroll well (Fuad 2026-08-12): the outer height is CONSTANT
          regardless of how many rows match, so the tuner panel below never moves when filters/tune/
          arbitration change the count. Same idiom as the Overview "Recently played" capped well. The
          empty/few state keeps the exact well height with a centered quiet "N match" note. */}
      <div className="r-card" style={{ padding: PAD }}>
        <div ref={scrollRef} onScroll={onScroll} style={{ height: "min(64vh, 640px)", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
          {total === 0
            ? <div className="r-mono" style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "var(--ink-faint)", textAlign: "center" }}>no saved songs match.</div>
            : <div style={{ height: total * ROW_H, position: "relative" }}>
                <div style={{ position: "absolute", top: win.start * ROW_H, left: 0, right: 0 }}>
                  {vis.map(r => <LikedRow key={r.key} r={r} legendByCode={legendByCode} famById={famById} go={go} navable={navKeys.has(r.key)} albumCover={r.albumCover} />)}
                </div>
              </div>}
        </div>
        {/* count text lives in a stable slot: minHeight reserves the line so the clauses
            (`of N`, `hidden`) appearing/disappearing with the count never nudge the tuner below. */}
        <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", marginTop: 8, minHeight: 14 }}>
          {total} shown{(bucket !== "all" || q || fams.size || subFilter || vocalsActive || anyTuneActive) ? ` of ${rows.length}` : ""} · plays are your scrobbles · “—” = saved but never scrobbled
          {anyTuneActive && hiddenNoData > 0 ? ` · ${hiddenNoData} hidden (no audio data)` : ""}
        </div>
      </div>

      {/* ── DNA tuner panel — UNDER the results, full-width, OPEN BY DEFAULT (owner 2026-08-12) ────────
          Left of the sliders grid (desktop) / above them (mobile): the audio-DNA RADAR of the CURRENTLY
          FILTERED liked set (solid) vs the whole-library average (dashed). Then per-axis range bands over
          the liked corpus's audio characteristics — each slider starts at the corpus min..max (encapsulating
          all, no filter) with the distribution behind it and the corpus mean as a dashed tick. Bands AND
          with the bucket/genre filters and give live "N match" feedback. Session-only state. */}
      <div ref={tuneRef} style={{ scrollMarginTop: 12 }}>
        {tuneOpen && (
          <div className="r-card" style={{ padding: "14px 16px", marginTop: "var(--gap)", background: "var(--bg-2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              <div className="r-mono" style={{ fontSize: 9.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-soft)" }}>
                tune DNA <span style={{ color: "var(--ink-faint)" }}>· {dictating === "dna" ? "shape filter" : dictating === "sliders" ? "range bands" : "drag the shape or move a band"} · {total} match</span>
              </div>
              {anyTuneActive && <button className="r-chip link" style={{ textTransform: "none", color: "var(--accent)", borderColor: "var(--accent-dim)" }} onClick={resetTune}>reset tune ✕</button>}
            </div>
            {!taReady && liveAxes.length <= 3 && (
              <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", marginBottom: 10 }}>loading full audio DNA…</div>
            )}
            {/* radar LEFT of the sliders on desktop, ABOVE them on mobile (flex wraps) */}
            <div className="m-stack" style={{ display: "flex", flexWrap: "wrap", gap: "16px 24px", alignItems: "flex-start" }}>
              {/* DNA-SHAPE group — draggable radar + tolerance. Dims when the sliders dictate; touching
                  it (a vertex or the tolerance) flips mode→'dna' and its persisted values re-apply. */}
              <div className="lk-dnagroup" style={{ flex: "0 0 auto", width: 190, maxWidth: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                {target && <LikedRadar rows={filtered} size={172} target={target} onTarget={onTarget} dimmed={dimDna} />}
                {/* tolerance — a small horizontal slider, 5%..60%, ALWAYS visible under the radar (dimmed
                    only per DNA arbitration). The .lt-range input is position:absolute + pointer-events:none
                    on its track (only the thumb re-enables events), so it MUST live in a position:relative
                    box with an explicit height and its own visible rail — otherwise it drops out of flow and
                    collapses to nothing (the "hidden slider" bug). Same track idiom as LikedRange. */}
                <div style={{ width: "100%", opacity: dimDna ? 0.45 : 1, transition: "opacity .2s" }}>
                  <div className="r-mono" style={{ fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: dictating === "dna" ? "var(--accent)" : "var(--ink-faint)", marginBottom: 4 }}>
                    tolerance <span style={{ color: "var(--ink-soft)" }}>· {Math.round(tol * 100)}%</span>
                  </div>
                  <div style={{ position: "relative", height: 20 }}>
                    {/* base rail + filled portion 5..60 → 0..1 of the track */}
                    <div style={{ position: "absolute", top: 8, left: 0, right: 0, height: 4, borderRadius: 2, background: "var(--rule-2)" }} />
                    <div style={{ position: "absolute", top: 8, left: 0, height: 4, borderRadius: 2, background: "var(--accent)", width: (((Math.round(tol * 100) - 5) / 55) * 100) + "%" }} />
                    <input type="range" className="lt-range" style={{ width: "100%" }} min={5} max={60} value={Math.round(tol * 100)}
                      onChange={e => { claimDna(); setTol(+e.target.value / 100); }} title="how close a song must be to the target shape" />
                  </div>
                </div>
                {dimDna && <div className="r-mono" style={{ fontSize: 8.5, color: "var(--ink-faint)", textAlign: "center" }}>shape idle — drag to take over</div>}
              </div>
              {/* RANGE-BANDS group — per-axis sliders + key/mode. Dims when the DNA shape dictates. */}
              <div style={{ flex: "1 1 340px", minWidth: 0, opacity: dimSliders ? 0.45 : 1, transition: "opacity .2s" }}>
                {/* one slim dual-range per axis: exactly 2×5 on desktop (≥900px), auto-fill wrap below.
                    The grid template lives in the .lk-dna-sliders CSS class so the breakpoint applies —
                    an inline gridTemplateColumns would override the media query. */}
                <div className="lk-dna-sliders">
                  {liveAxes.map(ax => {
                    const c = corpus[ax.k], [lo, hi] = bandOf(ax);
                    return <LikedRange key={ax.k} label={ax.label} lo={lo} hi={hi} min={ax.min} max={ax.max}
                      onChange={v => setBand(ax, v)} fmt={ax.fmt} hist={c ? c.hist : null} meanPos={c ? c.mean : null} />;
                  })}
                </div>
                {/* key is categorical — a 12-note chip row + major/minor toggle (only if the corpus carries them) */}
                {(hasKey || hasMode) && (
                  <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--rule)", display: "flex", flexWrap: "wrap", gap: "10px 16px", alignItems: "center" }}>
                    {hasKey && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                        <span className="r-mono" style={{ fontSize: 9.5, letterSpacing: ".1em", textTransform: "uppercase", color: keyActive ? "var(--accent)" : "var(--ink-faint)", marginRight: 2 }}>key</span>
                        {PITCH_CLASSES.map((p, i) => {
                          const on = keySel.has(i);
                          return <button key={i} className={"r-chip link" + (on ? " solid" : "")} style={{ textTransform: "none", minWidth: 30, textAlign: "center" }}
                            onClick={() => { claimSliders(); setKeySel(s => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; }); }}>{p}</button>;
                        })}
                        {keyActive && <button className="r-chip link" style={{ textTransform: "none", color: "var(--ink-faint)" }} onClick={() => { claimSliders(); setKeySel(new Set()); }}>clear ✕</button>}
                      </div>
                    )}
                    {hasMode && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="r-mono" style={{ fontSize: 9.5, letterSpacing: ".1em", textTransform: "uppercase", color: modeActive ? "var(--accent)" : "var(--ink-faint)" }}>mode</span>
                        <div className="r-seg r-seg-sm">
                          {[["any", "any"], ["major", "major"], ["minor", "minor"]].map(([k, l]) => (
                            <button key={k} data-on={mode === k} onClick={() => { claimSliders(); setMode(k); }}>{l}</button>
                          ))}
                        </div>
                      </div>
                    )}
                    {dimSliders && <div className="r-mono" style={{ fontSize: 8.5, color: "var(--ink-faint)" }}>sliders idle — adjust to take over</div>}
                  </div>
                )}
                {/* idle hint when there's no key/mode row to host it (keeps the message present) */}
                {dimSliders && !(hasKey || hasMode) && <div className="r-mono" style={{ fontSize: 8.5, color: "var(--ink-faint)", marginTop: 10 }}>sliders idle — adjust to take over</div>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
