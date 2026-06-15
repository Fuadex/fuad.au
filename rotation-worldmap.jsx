// rotation-worldmap.jsx — the Map tab: where the music comes from, as a bubble map over a
// simplified equirectangular world (world-map.js, lazy-loaded). Toggle countries ⇄ cities;
// country bubbles sit on baked centroids, city bubbles on geocoded lat/lng.

function MapView({ go }) {
  const R = window.ROTATION;
  const G = R.INSIGHTS.GEOGRAPHY;
  const [world, setWorld] = React.useState(window.ROTATION_WORLD || null);
  const [mode, setMode] = React.useState("country");
  const [hi, setHi] = React.useState(null);     // hovered key (country code or city index)
  React.useEffect(() => {
    if (window.ROTATION_WORLD) { setWorld(window.ROTATION_WORLD); return; }
    let s = document.getElementById("rotation-world-js");
    if (!s) { s = document.createElement("script"); s.id = "rotation-world-js"; s.src = "world-map.js"; document.head.appendChild(s); }
    const onLoad = () => setWorld(window.ROTATION_WORLD);
    s.addEventListener("load", onLoad);
    return () => s.removeEventListener("load", onLoad);
  }, []);

  const cities = G.cityPoints || [];
  // build the bubble set for the current mode
  const bubbles = React.useMemo(() => {
    if (!world) return [];
    if (mode === "city") {
      const maxP = Math.max(1, ...cities.map(c => c.plays));
      return cities.map((c, i) => ({ key: i, x: (c.lng + 180) / 360 * world.w, y: (90 - c.lat) / 180 * world.h, r: 2.5 + Math.sqrt(c.plays / maxP) * 24, c }));
    }
    const C = world.centroids, placed = G.countries.filter(c => C[c.code]);
    const maxP = Math.max(1, ...placed.map(c => c.plays));
    return placed.map(c => ({ key: c.code, x: C[c.code][0], y: C[c.code][1], r: 4 + Math.sqrt(c.plays / maxP) * 28, c }));
  }, [world, mode, R]);

  const hb = hi != null ? bubbles.find(b => b.key === hi) : null;
  const top = (mode === "city" ? cities : G.countries).slice(0, mode === "city" ? 16 : 12);
  const topMax = Math.max(1, ...top.map(t => t.plays));

  return (
    <div className="r-view">
      <div className="r-viewhead">
        <div>
          <div className="r-kicker">Geography · {G.totalCountries} countries · {fmt(cities.length)} cities placed</div>
          <h1 className="r-title">Where it <em>comes from</em><span className="dot">.</span></h1>
        </div>
        <div className="r-seg" style={{ alignSelf: "flex-end" }}>
          {[["country", "countries"], ["city", "cities"]].map(([k, l]) =>
            <button key={k} data-on={mode === k} onClick={() => { setMode(k); setHi(null); }}>{l}</button>)}
        </div>
      </div>

      <div style={{ fontFamily: "var(--serif)", fontSize: 15, color: "var(--ink-soft)", marginBottom: 12, minHeight: 22 }}>
        {hb
          ? (mode === "city"
            ? <><span style={{ fontSize: 18 }}>{hb.c.flag}</span> <b style={{ color: "var(--ink)" }}>{hb.c.city}</b>, {hb.c.country} — {fmt(hb.c.plays)} plays across {hb.c.artists} artist{hb.c.artists !== 1 ? "s" : ""}</>
            : <><span style={{ fontSize: 18 }}>{hb.c.flag}</span> <b style={{ color: "var(--ink)" }}>{hb.c.name}</b> — {fmt(hb.c.plays)} plays across {hb.c.artists} artists</>)
          : <span style={{ color: "var(--ink-faint)" }}>{mode === "city" ? "every dot a city — Cleveland for NIN, Tokyo for Boris, Melbourne for Ocean Grove. Hover to read it." : "bubbles sized by plays. Hover a country."}</span>}
      </div>

      <div className="r-card" style={{ padding: 0, overflow: "hidden", background: "var(--bg-2)" }}>
        {!world
          ? <div style={{ padding: 60, textAlign: "center", color: "var(--ink-faint)", fontFamily: "var(--mono)", fontSize: 12 }}>loading the map…</div>
          : <svg viewBox={`0 0 ${world.w} ${world.h}`} style={{ width: "100%", height: "auto", display: "block" }} onMouseLeave={() => setHi(null)}>
            {world.land.map((d, i) => <path key={i} d={d} fill="var(--bg-3)" stroke="var(--rule-2)" strokeWidth="0.4" />)}
            {bubbles.slice().sort((a, b) => b.r - a.r).map(b => {
              const on = hi === b.key;
              return <circle key={b.key} cx={b.x} cy={b.y} r={b.r} fill="var(--accent)" fillOpacity={on ? 0.6 : 0.26}
                stroke="var(--accent)" strokeWidth={on ? 1.6 : 0.7} style={{ cursor: "pointer", transition: "fill-opacity .12s" }}
                onMouseEnter={() => setHi(b.key)} />;
            })}
          </svg>}
      </div>

      {/* breakdown list for the current mode */}
      <div style={{ marginTop: "var(--gap)" }}>
        <div className="r-mono" style={{ fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: 10 }}>
          {mode === "city" ? "Deepest cities" : "Deepest countries"}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px,1fr))", gap: "6px 22px" }}>
          {top.map((t, i) => (
            <div key={(t.code || t.city) + i} style={{ display: "flex", alignItems: "center", gap: 10 }}
              onMouseEnter={() => setHi(mode === "city" ? cities.indexOf(t) : t.code)} onMouseLeave={() => setHi(null)}>
              <span style={{ fontSize: 15, width: 20 }}>{t.flag}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{mode === "city" ? t.city : t.name} <span className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)" }}>· {t.artists}a</span></div>
                <div style={{ height: 4, background: "var(--bg-3)", borderRadius: 3, overflow: "hidden", marginTop: 3 }}>
                  <div style={{ height: "100%", width: (t.plays / topMax * 100) + "%", background: "var(--accent-dim)", borderRadius: 3 }} />
                </div>
              </div>
              <span className="r-mono" style={{ fontSize: 10, color: "var(--ink-soft)" }}>{fmtK(t.plays)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
