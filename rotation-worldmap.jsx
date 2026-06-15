// rotation-worldmap.jsx — a world map of where the music comes from. Country bubbles sized by
// plays, placed on a simplified equirectangular world (world-map.js, lazy-loaded). Backdrop +
// centroids are baked SVG; bubbles come from INSIGHTS.GEOGRAPHY.countries.

function WorldMap({ countries }) {
  const [world, setWorld] = React.useState(window.ROTATION_WORLD || null);
  const [hi, setHi] = React.useState(null);
  React.useEffect(() => {
    if (window.ROTATION_WORLD) { setWorld(window.ROTATION_WORLD); return; }
    let s = document.getElementById("rotation-world-js");
    if (!s) { s = document.createElement("script"); s.id = "rotation-world-js"; s.src = "world-map.js"; document.head.appendChild(s); }
    const onLoad = () => setWorld(window.ROTATION_WORLD);
    s.addEventListener("load", onLoad);
    return () => s.removeEventListener("load", onLoad);
  }, []);
  if (!world) return null;

  const C = world.centroids;
  const placed = countries.filter(c => C[c.code]);
  const maxP = Math.max(1, ...placed.map(c => c.plays));
  const hc = hi ? placed.find(c => c.code === hi) : null;

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ borderRadius: 8, overflow: "hidden", background: "var(--bg-2)", border: "1px solid var(--rule)" }}>
        <svg viewBox={`0 0 ${world.w} ${world.h}`} style={{ width: "100%", height: "auto", display: "block" }} onMouseLeave={() => setHi(null)}>
          {world.land.map((d, i) => <path key={i} d={d} fill="var(--bg-3)" stroke="var(--rule-2)" strokeWidth="0.4" />)}
          {placed.slice().sort((a, b) => b.plays - a.plays).map(c => {
            const [x, y] = C[c.code], r = 3.5 + Math.sqrt(c.plays / maxP) * 26, on = hi === c.code;
            return <circle key={c.code} cx={x} cy={y} r={r} fill="var(--accent)" fillOpacity={on ? 0.55 : 0.3}
              stroke="var(--accent)" strokeWidth={on ? 1.6 : 0.9} style={{ cursor: "pointer", transition: "fill-opacity .15s" }}
              onMouseEnter={() => setHi(c.code)} />;
          })}
        </svg>
      </div>
      <div style={{ fontFamily: "var(--serif)", fontSize: 14, color: "var(--ink-soft)", marginTop: 8, minHeight: 20 }}>
        {hc
          ? <><span style={{ fontSize: 18 }}>{hc.flag}</span> <b style={{ color: "var(--ink)" }}>{hc.name}</b> — {fmt(hc.plays)} plays across {hc.artists} artists</>
          : <span style={{ color: "var(--ink-faint)" }}>hover a bubble — bigger means more plays from there</span>}
      </div>
    </div>
  );
}
