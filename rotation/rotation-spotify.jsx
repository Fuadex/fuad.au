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
// audio-handle axes. tempo uses a LOG-scaled position so the busy 90–160 BPM band gets room
// (a linear 0–240 axis crushes it). LT_TEMPO/LT_ENERGY are the [min,max] envelopes; the sliders
// carry integer 0..STEPS positions that map to values through these helpers.
const LT_TEMPO = [40, 220], TEMPO_STEPS = 100;
const posTempo = (p) => Math.round(LT_TEMPO[0] * Math.pow(LT_TEMPO[1] / LT_TEMPO[0], p / TEMPO_STEPS));
// dual-thumb range: two overlaid native range inputs (min + max). Minimal, app-styled — no library.
function LikedRange({ label, lo, hi, min, max, onChange, fmt }) {
  const active = lo > min || hi < max;
  const pct = v => ((v - min) / (max - min)) * 100;
  const clampLo = v => onChange([Math.min(v, hi), hi]);
  const clampHi = v => onChange([lo, Math.max(v, lo)]);
  return (
    <div style={{ flex: "1 1 200px", minWidth: 170 }}>
      <div className="r-mono" style={{ fontSize: 9.5, letterSpacing: ".1em", textTransform: "uppercase", color: active ? "var(--accent)" : "var(--ink-faint)", marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
        <span>{label}</span><span style={{ color: "var(--ink-soft)" }}>{fmt(lo)} – {fmt(hi)}</span>
      </div>
      <div style={{ position: "relative", height: 20 }}>
        <div style={{ position: "absolute", top: 8, left: 0, right: 0, height: 4, borderRadius: 2, background: "var(--rule-2)" }} />
        <div style={{ position: "absolute", top: 8, height: 4, borderRadius: 2, background: "var(--accent)", left: pct(lo) + "%", right: (100 - pct(hi)) + "%" }} />
        <input type="range" className="lt-range" min={min} max={max} value={lo} onChange={e => clampLo(+e.target.value)} />
        <input type="range" className="lt-range" min={min} max={max} value={hi} onChange={e => clampHi(+e.target.value)} />
      </div>
    </div>
  );
}
function LikedRow({ r, legendByCode, famById, go, navable, albumCover }) {
  const [id, plays, firstYear, code, famId, tempo, energy] = r.meta;
  const leg = legendByCode[code] || { key: "mid", label: "Mid" };
  const color = LIKED_BUCKET_COLOR[leg.key] || "oklch(0.68 0.12 320)";  // brand labels get a fixed violet
  const fam = famId != null ? famById[famId] : null;
  const canNav = navable && go;
  const hue = fam ? fam.hue : 40;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, height: 52, padding: "0 4px", borderBottom: "1px solid var(--rule)", cursor: canNav ? "pointer" : "default" }}
      onClick={canNav ? () => go("track", r.key) : undefined}>
      {/* left miniatures: round artist thumb (auto-resolved by GenCover) + square album cover.
          GenCover paints a generated gradient underneath, so an unresolved thumb reads as a tasteful
          placeholder — never a broken-image icon. */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <GenCover hue={hue} name={r.artist} size={28} radius={999} />
        <GenCover hue={hue} name={r.album || r.artist} image={albumCover || ""} thumb={albumCover || ""} size={28} radius={5} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: canNav ? "var(--ink)" : "var(--ink-soft)" }}>{r.track}</div>
        <div className="r-mono" style={{ fontSize: 10, color: "var(--ink-faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {r.artist}{fam ? <span style={{ color: "oklch(" + "0.7 0.12 " + fam.hue + ")" }}> · {fam.family}</span> : ""}
        </div>
      </div>
      <span className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", width: 70, textAlign: "right", whiteSpace: "nowrap" }}
        title={tempo != null ? tempo + " BPM · energy " + energy : "no audio features"}>
        {tempo != null ? tempo + "♩" : ""}{tempo != null && energy != null ? " " : ""}{energy != null ? "e" + energy : ""}</span>
      <span className="r-chip" style={{ borderColor: color, color, textTransform: "none", cursor: "inherit" }}>{leg.label}</span>
      <span className="r-mono" style={{ fontSize: 10.5, color: "var(--ink-soft)", width: 46, textAlign: "right" }}>{plays ? plays + "p" : "—"}</span>
      <span className="r-mono" style={{ fontSize: 10, color: "var(--ink-faint)", width: 34, textAlign: "right" }}>{firstYear || "·"}</span>
      <a href={"https://open.spotify.com/track/" + id} target="_blank" rel="noopener noreferrer" title="open on Spotify"
        onClick={e => e.stopPropagation()}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 999, border: "1px solid var(--rule-2)", color: "oklch(0.72 0.17 150)", textDecoration: "none", flexShrink: 0, fontSize: 13 }}>♪</a>
    </div>
  );
}
function LikedView({ go }) {
  const [ready, setReady] = React.useState(!!window.ROTATION_LIKED_META);
  const [failed, setFailed] = React.useState(false);
  const [mediaReady, setMediaReady] = React.useState(!!window.ROTATION_MEDIA);
  const [q, setQ] = React.useState("");
  const [bucket, setBucket] = React.useState("all");
  const [sort, setSort] = React.useState("plays");
  const [fams, setFams] = React.useState(() => new Set());   // selected family ids (empty = all)
  const [subFilter, setSubFilter] = React.useState("");      // subgenre label ("" = any)
  const [tempo, setTempo] = React.useState([0, TEMPO_STEPS]); // slider positions (log axis)
  const [energy, setEnergy] = React.useState([0, 100]);
  const [valence, setValence] = React.useState("any");       // any | down | neutral | up
  const [win, setWin] = React.useState({ start: 0, end: 60 });   // rendered row window
  const scrollRef = React.useRef(null);

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
  // resolves it to a thumbnail + display title. media-index is already loaded for navKeys, so this
  // adds no fetch. ~89% of saves land an album here; the rest fall back to a generated placeholder.
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

  // flatten the meta map into rows once, re-deriving artist/title from the media index where present
  // (real names), falling back to a de-slugged label for unscrobbled saves.
  const rows = React.useMemo(() => {
    const META = window.ROTATION_LIKED_META; if (!META) return [];
    const M = window.ROTATION_MEDIA;
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
      // album for the row thumbnail: real name from the media-index album row when the track's album
      // is known, else a de-slugged label from the emitted albumSlug (meta[8]).
      const albumSlug = meta[8] || "";
      const album = albNameBySlug.get(aSlug + "~" + albumSlug) || (albumSlug ? deslug(albumSlug) : "");
      out.push({ key, meta, artist, track, album, aSlug, albumSlug, bucketKey: leg.key,
        famId: meta[4], sub: subsByArtist[aSlug] || "",
        tempo: meta[5], energy: meta[6], valence: meta[7] });
    }
    return out;
  }, [ready, mediaReady, legendByCode, albNameBySlug]);

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
      (!needle || (r.artist + " " + r.track).toLowerCase().includes(needle)));
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

  const tempoActive = tempo[0] > 0 || tempo[1] < TEMPO_STEPS;
  const energyActive = energy[0] > 0 || energy[1] < 100;
  const sliderActive = tempoActive || energyActive || valence !== "any";
  const tLo = posTempo(tempo[0]), tHi = posTempo(tempo[1]);

  // filtered list + count of rows dropped ONLY because they lack audio features while a slider is on
  const { list: filtered, hiddenNoData } = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    let hidden = 0;
    let list = rows.filter(r => {
      if (bucket !== "all" && r.bucketKey !== bucket) return false;
      if (needle && !(r.artist + " " + r.track).toLowerCase().includes(needle)) return false;
      if (fams.size && (r.famId == null || !fams.has(r.famId))) return false;
      if (subFilter && r.sub !== subFilter) return false;
      if (sliderActive) {
        const noData = r.tempo == null && r.energy == null;
        if (noData) { hidden++; return false; }   // hide featureless rows when a handle is engaged
        if (tempoActive && (r.tempo == null || r.tempo < tLo || r.tempo > tHi)) return false;
        if (energyActive && (r.energy == null || r.energy < energy[0] || r.energy > energy[1])) return false;
        if (valence !== "any") {
          const v = r.valence;
          if (v == null) return false;
          if (valence === "down" && v >= 40) return false;
          if (valence === "neutral" && (v < 40 || v > 60)) return false;
          if (valence === "up" && v <= 60) return false;
        }
      }
      return true;
    });
    const s = list.slice();
    if (sort === "plays") s.sort((a, b) => b.meta[1] - a.meta[1] || a.artist.localeCompare(b.artist));
    else if (sort === "first-new") s.sort((a, b) => (b.meta[2] || 0) - (a.meta[2] || 0) || b.meta[1] - a.meta[1]);
    else if (sort === "first-old") s.sort((a, b) => (a.meta[2] || 9999) - (b.meta[2] || 9999) || b.meta[1] - a.meta[1]);
    else if (sort === "artist") s.sort((a, b) => a.artist.localeCompare(b.artist) || a.track.localeCompare(b.track));
    else if (sort === "tempo") s.sort((a, b) => (a.tempo == null) - (b.tempo == null) || (a.tempo || 0) - (b.tempo || 0));
    else if (sort === "energy") s.sort((a, b) => (a.energy == null) - (b.energy == null) || (b.energy || 0) - (a.energy || 0));
    return { list: s, hiddenNoData: hidden };
  }, [rows, q, bucket, sort, fams, subFilter, tempo, energy, valence, sliderActive, tempoActive, energyActive, tLo, tHi]);

  // windowing: render only rows near the viewport. ROW_H must match the row height in LikedRow.
  const ROW_H = 52, PAD = 18, OVERSCAN = 12;
  React.useEffect(() => { setWin({ start: 0, end: 60 }); if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [q, bucket, sort, fams, subFilter, tempo, energy, valence]);
  // drop a subgenre selection that the current family set no longer offers
  React.useEffect(() => { if (subFilter && !subOptions.some(([s]) => s === subFilter)) setSubFilter(""); }, [subOptions, subFilter]);
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

  return (
    <div className="r-view">
      <button className="r-back" onClick={() => go("spotify")}>← spotify</button>
      <div className="r-viewhead"><div>
        <div className="r-kicker">Spotify · {rows.length} saved songs</div>
        <h1 className="r-title">Your <em>liked</em> songs<span className="dot">.</span></h1>
      </div></div>
      <div className="r-card" style={{ padding: "10px 16px", marginBottom: "var(--gap)", fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-faint)" }}>
        every song you saved, sorted by what the save turned into — grouped by how deep you went, not by when you added it. tap a row to open the track; ♪ jumps to Spotify.
      </div>

      {/* bucket chips with counts */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {CHIPS.map(([k, label]) => (
          <button key={k} className={"r-chip link" + (bucket === k ? " solid" : "")} style={{ textTransform: "none" }} onClick={() => setBucket(k)}>
            {label} <span style={{ opacity: .6 }}>{counts[k] || 0}</span>
          </button>
        ))}
      </div>

      {/* genre family chips (multi-select) + subgenre dropdown scoped to the selection */}
      {famList.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10, alignItems: "center" }}>
          {famList.filter(f => famCounts[f.i]).sort((a, b) => famCounts[b.i] - famCounts[a.i]).map(f => {
            const on = fams.has(f.i);
            const c = "oklch(0.7 0.12 " + f.hue + ")";
            return (
              <button key={f.i} className="r-chip link" style={{ textTransform: "none", borderColor: on ? c : "var(--rule-2)", color: on ? "#0c0a08" : c, background: on ? c : "transparent" }}
                onClick={() => setFams(s => { const n = new Set(s); n.has(f.i) ? n.delete(f.i) : n.add(f.i); return n; })}>
                {f.family} <span style={{ opacity: .6 }}>{famCounts[f.i]}</span>
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

      {/* audio handles: tempo (BPM, log axis) + energy dual-thumb ranges, valence toggle */}
      <div className="r-card" style={{ padding: "12px 16px", marginBottom: 10, display: "flex", flexWrap: "wrap", gap: "16px 24px", alignItems: "center" }}>
        <LikedRange label="tempo" lo={tempo[0]} hi={tempo[1]} min={0} max={TEMPO_STEPS} onChange={setTempo} fmt={p => posTempo(p) + "♩"} />
        <LikedRange label="energy" lo={energy[0]} hi={energy[1]} min={0} max={100} onChange={setEnergy} fmt={v => v} />
        <div style={{ flex: "0 0 auto" }}>
          <div className="r-mono" style={{ fontSize: 9.5, letterSpacing: ".1em", textTransform: "uppercase", color: valence !== "any" ? "var(--accent)" : "var(--ink-faint)", marginBottom: 6 }}>mood</div>
          <div className="r-seg r-seg-sm" style={{ flexWrap: "wrap" }}>
            {[["any", "any"], ["down", "downbeat"], ["neutral", "neutral"], ["up", "upbeat"]].map(([k, l]) => (
              <button key={k} data-on={valence === k} onClick={() => setValence(k)}>{l}</button>
            ))}
          </div>
        </div>
        {sliderActive && <button className="r-chip link" style={{ textTransform: "none", color: "var(--ink-faint)", alignSelf: "flex-end" }}
          onClick={() => { setTempo([0, TEMPO_STEPS]); setEnergy([0, 100]); setValence("any"); }}>reset handles ✕</button>}
      </div>

      {/* search + sort */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 12 }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="search artist or title…"
          style={{ flex: "1 1 200px", minWidth: 0, background: "var(--bg-2)", border: "1px solid var(--rule-2)", borderRadius: 999, padding: "8px 14px", color: "var(--ink)", fontFamily: "var(--mono)", fontSize: 12, outline: "none" }} />
        <div className="r-seg r-seg-sm" style={{ flexWrap: "wrap" }}>
          {[["plays", "plays"], ["first-new", "newest"], ["first-old", "oldest"], ["artist", "a–z"], ["tempo", "tempo"], ["energy", "energy"]].map(([k, l]) => (
            <button key={k} data-on={sort === k} onClick={() => setSort(k)}>{l}</button>
          ))}
        </div>
      </div>

      {/* windowed list */}
      <div className="r-card" style={{ padding: PAD }}>
        <div ref={scrollRef} onScroll={onScroll} style={{ maxHeight: "min(70vh, 720px)", overflowY: "auto" }}>
          {total === 0
            ? <div className="r-mono" style={{ fontSize: 12, color: "var(--ink-faint)", padding: "24px 0", textAlign: "center" }}>no saved songs match.</div>
            : <div style={{ height: total * ROW_H, position: "relative" }}>
                <div style={{ position: "absolute", top: win.start * ROW_H, left: 0, right: 0 }}>
                  {vis.map(r => <LikedRow key={r.key} r={r} legendByCode={legendByCode} famById={famById} go={go} navable={navKeys.has(r.key)} albumCover={albCoverBySlug.get(r.aSlug + "~" + r.albumSlug) || ""} />)}
                </div>
              </div>}
        </div>
        <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", marginTop: 8 }}>
          {total} shown{(bucket !== "all" || q || fams.size || subFilter || sliderActive) ? ` of ${rows.length}` : ""} · plays are your scrobbles · “—” = saved but never scrobbled
          {sliderActive && hiddenNoData > 0 ? ` · ${hiddenNoData} hidden (no audio data)` : ""}
        </div>
      </div>
    </div>
  );
}
