// rotation-lab.jsx — hidden visualisation testbed (#lab)
// Ugly-but-honest novel chart forms on real data.
// Route: #lab — reachable but NOT in NAV. No library deps.

// ─────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────
const LAB_BG    = "#0b0a0f";
const LAB_BG2   = "#131119";
const LAB_PANEL = "#110f17";
const LAB_RULE  = "#272235";
const LAB_INK   = "#f1eef6";
const LAB_DIM   = "#a09bb0";
const LAB_FAINT = "#665f78";
const LAB_ACC   = "oklch(0.74 0.13 330)";

function labHue(h) { return `oklch(0.68 0.15 ${h})`; }
function labHueDim(h) { return `oklch(0.45 0.10 ${h})`; }

const labCard = (title, caption, children, extra) => (
  <div style={{
    background: LAB_PANEL, border: `1px solid ${LAB_RULE}`, borderRadius: 8,
    marginBottom: 28, overflow: "hidden"
  }}>
    <div style={{ padding: "16px 20px 10px", borderBottom: `1px solid ${LAB_RULE}` }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".2em",
        textTransform: "uppercase", color: LAB_ACC, marginBottom: 5 }}>{title}</div>
      <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 13,
        color: LAB_DIM, lineHeight: 1.5 }}>{caption}</div>
      {extra}
    </div>
    <div style={{ padding: "18px 20px 20px" }}>{children}</div>
  </div>
);

function StubCard({ title, caption, needs }) {
  return labCard(title, caption,
    <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: LAB_FAINT,
      padding: "14px 0", letterSpacing: ".06em" }}>
      ⚠ stub — needs: <b style={{ color: LAB_DIM }}>{needs}</b>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  1. BUMP CHART — top-10 artist rank per year
// ─────────────────────────────────────────────────────────────────
function BumpChart() {
  const R = window.ROTATION;
  if (!R || !R.ERAS || !R.ERAS.length) return <StubCard title="Bump Chart" caption="Top-10 artist rank per year" needs="ROTATION.ERAS" />;

  const eras = R.ERAS.slice().sort((a, b) => a.year - b.year);
  const years = eras.map(e => e.year);

  // collect every artist who appears in any year's top-10
  const artistSet = new Set();
  for (const e of eras) for (const a of (e.top || [])) artistSet.add(a.name);
  const artists = [...artistSet];

  // build rank matrix: ranks[artistName][yearIdx] = rank (1-based) or null
  const ranks = {};
  for (const name of artists) {
    ranks[name] = years.map((y, yi) => {
      const e = eras[yi];
      const idx = (e.top || []).findIndex(a => a.name === name);
      return idx >= 0 ? idx + 1 : null;
    });
  }

  // only keep artists who appear in ≥2 years and were ever in top 5
  const featured = artists.filter(name => {
    const r = ranks[name];
    const present = r.filter(x => x !== null).length;
    const topFive = r.some(x => x !== null && x <= 5);
    return present >= 2 && topFive;
  }).slice(0, 14);

  const W = 680, H = 360;
  const PAD_L = 110, PAD_R = 110, PAD_T = 24, PAD_B = 24;
  const W2 = W - PAD_L - PAD_R;
  const H2 = H - PAD_T - PAD_B;
  const N = 10; // rank slots 1–10

  const xOf = (yi) => PAD_L + (yi / Math.max(years.length - 1, 1)) * W2;
  const yOf = (rank) => PAD_T + ((rank - 1) / (N - 1)) * H2;

  const hueOf = (name) => {
    const a = R.byId && R.byId[R.slug ? R.slug(name) : name];
    return a ? a.hue : window.hashInt(name, 0) % 360;   // core's hash (dedup 2026-07-18)
  };

  return labCard(
    "Bump Chart",
    "Top-10 artist rank per year — rank crossings show obsessions that a streamgraph area buries.",
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", overflow: "visible" }}>
      {/* grid lines */}
      {[1,2,3,4,5,6,7,8,9,10].map(r => (
        <line key={r} x1={PAD_L} x2={W - PAD_R} y1={yOf(r)} y2={yOf(r)}
          stroke={LAB_RULE} strokeWidth="1" />
      ))}
      {/* year labels */}
      {years.map((y, yi) => (
        <text key={y} x={xOf(yi)} y={PAD_T - 8} fill={LAB_FAINT} fontSize="9"
          fontFamily="var(--mono)" textAnchor="middle">{y}</text>
      ))}
      {/* rank labels left */}
      {[1,3,5,7,10].map(r => (
        <text key={r} x={PAD_L - 8} y={yOf(r) + 3.5} fill={LAB_FAINT} fontSize="8"
          fontFamily="var(--mono)" textAnchor="end">#{r}</text>
      ))}
      {/* lines per artist */}
      {featured.map(name => {
        const r = ranks[name];
        const hue = hueOf(name);
        const col = labHue(hue);
        // build segments between consecutive non-null points
        const segs = [];
        let prev = null;
        for (let i = 0; i < years.length; i++) {
          if (r[i] !== null) {
            if (prev !== null) segs.push([prev, i]);
            prev = i;
          } else { prev = null; }
        }
        return (
          <g key={name}>
            {segs.map(([a, b], si) => (
              <line key={si} x1={xOf(a)} y1={yOf(r[a])} x2={xOf(b)} y2={yOf(r[b])}
                stroke={col} strokeWidth="2.2" strokeLinecap="round" opacity="0.85" />
            ))}
            {r.map((rank, yi) => rank !== null
              ? <circle key={yi} cx={xOf(yi)} cy={yOf(rank)} r="3.5" fill={col} />
              : null
            )}
            {/* label at first and last occurrence */}
            {(() => {
              const first = r.findIndex(x => x !== null);
              const last = r.reduce((acc, x, i) => x !== null ? i : acc, -1);
              const nodes = [];
              if (first >= 0 && first === 0) {
                nodes.push(
                  <text key="lf" x={PAD_L - 12} y={yOf(r[first]) + 3.5}
                    fill={col} fontSize="9" fontFamily="var(--mono)" textAnchor="end">
                    {name.length > 16 ? name.slice(0, 15) + "…" : name}
                  </text>
                );
              }
              if (last >= 0 && last === years.length - 1) {
                nodes.push(
                  <text key="ll" x={W - PAD_R + 10} y={yOf(r[last]) + 3.5}
                    fill={col} fontSize="9" fontFamily="var(--mono)" textAnchor="start">
                    {name.length > 16 ? name.slice(0, 15) + "…" : name}
                  </text>
                );
              }
              return nodes;
            })()}
          </g>
        );
      })}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────
//  2. SPIRAL TIME PLOT — one ring per year, weeks as angle
// ─────────────────────────────────────────────────────────────────
function SpiralPlot() {
  const D = window.ROTATION_DAYS;
  if (!D) return (
    <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: LAB_FAINT, letterSpacing: ".06em" }}>
      Loading day-series…
    </div>
  );

  // aggregate days → weeks (7-day buckets from day 0 = Mon of start week)
  const startDate = new Date(D.start + "T00:00:00Z");
  const counts = D.counts;

  // build weeks: group days into ISO weeks by year
  // dayIdx 0 = D.start
  const weeks = {}; // year → array of 52+ weekly sums
  for (let i = 0; i < counts.length; i++) {
    const d = new Date(startDate.getTime() + i * 86400000);
    const y = d.getUTCFullYear();
    // week of year 0-51
    const jan1 = Date.UTC(y, 0, 1);
    const dow = new Date(jan1).getUTCDay();
    const w = Math.floor((d.getTime() - jan1) / 86400000 + ((dow + 6) % 7)) / 7 | 0;
    const wk = Math.min(w, 51);
    if (!weeks[y]) weeks[y] = new Array(52).fill(0);
    weeks[y][wk] += counts[i];
  }

  const years = Object.keys(weeks).map(Number).sort();
  const allVals = Object.values(weeks).flatMap(arr => arr);
  const globalMax = Math.max(...allVals, 1);

  const SIZE = 500;
  const CX = SIZE / 2, CY = SIZE / 2;
  const INNER = 36, RING = 14, GAP = 2;

  const angleOf = (wk) => (wk / 52) * Math.PI * 2 - Math.PI / 2;

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width="100%" style={{ display: "block", maxWidth: 500, margin: "0 auto" }}>
      {years.map((y, yi) => {
        const r0 = INNER + yi * (RING + GAP);
        const r1 = r0 + RING - 1;
        const arr = weeks[y];
        const hue = 180 + yi * 22;
        return (
          <g key={y}>
            {arr.map((v, wk) => {
              const a0 = angleOf(wk);
              const a1 = angleOf(wk + 1) - 0.01;
              const int = v / globalMax;
              if (int < 0.01) return null;
              const x1a = CX + Math.cos(a0) * r0, y1a = CY + Math.sin(a0) * r0;
              const x1b = CX + Math.cos(a0) * r1, y1b = CY + Math.sin(a0) * r1;
              const x2a = CX + Math.cos(a1) * r1, y2a = CY + Math.sin(a1) * r1;
              const x2b = CX + Math.cos(a1) * r0, y2b = CY + Math.sin(a1) * r0;
              return (
                <path key={wk}
                  d={`M${x1a.toFixed(1)} ${y1a.toFixed(1)} L${x1b.toFixed(1)} ${y1b.toFixed(1)} L${x2a.toFixed(1)} ${y2a.toFixed(1)} L${x2b.toFixed(1)} ${y2b.toFixed(1)} Z`}
                  fill={`oklch(${0.3 + int * 0.52} 0.18 ${hue})`}
                  opacity={0.55 + int * 0.45}
                />
              );
            })}
            {/* year label at 9-o'clock */}
            {(() => {
              const rm = r0 + RING / 2;
              return (
                <text x={CX - rm - 2} y={CY + 3.5} fill={`oklch(0.62 0.12 ${hue})`}
                  fontSize="7.5" fontFamily="var(--mono)" textAnchor="end">{y}</text>
              );
            })()}
          </g>
        );
      })}
      {/* month spokes */}
      {[0,1,2,3,4,5,6,7,8,9,10,11].map(m => {
        const frac = m / 12;
        const a = frac * Math.PI * 2 - Math.PI / 2;
        const outerR = INNER + years.length * (RING + GAP) + 6;
        const months = window.MON;
        return (
          <g key={m}>
            <line x1={CX + Math.cos(a) * INNER} y1={CY + Math.sin(a) * INNER}
              x2={CX + Math.cos(a) * outerR} y2={CY + Math.sin(a) * outerR}
              stroke={LAB_RULE} strokeWidth="0.7" />
            <text x={CX + Math.cos(a) * (outerR + 11)} y={CY + Math.sin(a) * (outerR + 11) + 3}
              fill={LAB_FAINT} fontSize="8" fontFamily="var(--mono)" textAnchor="middle">{months[m]}</text>
          </g>
        );
      })}
    </svg>
  );
}

function SpiralWrapper() {
  const [ready, setReady] = React.useState(!!window.ROTATION_DAYS);
  React.useEffect(() => {
    if (window.ROTATION_DAYS) return;
    const s = document.createElement("script");
    s.src = "day-series.js";
    s.onload = () => setReady(true);
    s.onerror = () => setReady(true);
    document.head.appendChild(s);
  }, []);
  return labCard(
    "Spiral Time Plot",
    "One ring per year, angle = week-of-year, ring thickness = plays that week — seasonal alignment becomes visible as radial spokes.",
    ready ? <SpiralPlot /> : <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: LAB_FAINT, letterSpacing: ".06em" }}>Loading day-series…</div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  3 (→4). RIDGELINE / JOYPLOT — play-share per month across years
// ─────────────────────────────────────────────────────────────────
function RidgeLine() {
  const R = window.ROTATION;
  if (!R || !R.ERAS) return <StubCard title="Ridgeline" caption="Month-of-year profile per year" needs="ROTATION.ERAS" />;

  const D = window.ROTATION_DAYS;
  if (!D) return (
    <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: LAB_FAINT }}>Loading day-series…</div>
  );

  // aggregate monthly totals per year from day-series
  const startDate = new Date(D.start + "T00:00:00Z");
  const yearMonths = {}; // year → months[0..11]
  for (let i = 0; i < D.counts.length; i++) {
    const d = new Date(startDate.getTime() + i * 86400000);
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    if (!yearMonths[y]) yearMonths[y] = new Array(12).fill(0);
    yearMonths[y][m] += D.counts[i];
  }

  const years = Object.keys(yearMonths).map(Number).sort();
  const MONTHS = ["J","F","M","A","M","J","J","A","S","O","N","D"];
  const W = 620, RIDGE_H = 44, PAD_L = 44, PAD_R = 12, PAD_TOP = 14;
  const totalH = PAD_TOP + years.length * (RIDGE_H * 0.58) + RIDGE_H;

  // normalise each year to its own max (shape comparison not volume)
  const profiles = years.map(y => {
    const arr = yearMonths[y];
    const mx = Math.max(...arr, 1);
    return arr.map(v => v / mx);
  });

  const xOf = (m) => PAD_L + (m / 11) * (W - PAD_L - PAD_R);
  const yBase = (yi) => PAD_TOP + yi * (RIDGE_H * 0.58) + RIDGE_H;
  const OVERLAP = RIDGE_H * 0.85;

  return (
    <svg viewBox={`0 0 ${W} ${totalH}`} width="100%" style={{ display: "block" }}>
      {[...MONTHS.keys()].map(m => (
        <text key={m} x={xOf(m)} y={totalH - 4} fill={LAB_FAINT} fontSize="8"
          fontFamily="var(--mono)" textAnchor="middle">{MONTHS[m]}</text>
      ))}
      {years.map((y, yi) => {
        const vals = profiles[yi];
        const hue = 190 + yi * 14;
        const col = `oklch(0.65 0.15 ${hue % 360})`;
        const colFill = `oklch(0.45 0.12 ${hue % 360} / 0.55)`;
        const yb = yBase(yi);
        const pts = vals.map((v, m) => [xOf(m), yb - v * OVERLAP]);
        const d = pts.map((p, i) => (i === 0 ? `M${p[0].toFixed(1)} ${p[1].toFixed(1)}` : `L${p[0].toFixed(1)} ${p[1].toFixed(1)}`)).join(" ");
        const area = d + ` L${pts[pts.length - 1][0].toFixed(1)} ${yb} L${pts[0][0].toFixed(1)} ${yb} Z`;
        return (
          <g key={y}>
            <path d={area} fill={colFill} />
            <path d={d} fill="none" stroke={col} strokeWidth="1.5" strokeLinejoin="round" />
            <text x={PAD_L - 4} y={yb - 4} fill={col} fontSize="8.5" fontFamily="var(--mono)"
              textAnchor="end">{y}</text>
          </g>
        );
      })}
    </svg>
  );
}

function RidgeWrapper() {
  const [ready, setReady] = React.useState(!!window.ROTATION_DAYS);
  React.useEffect(() => {
    if (window.ROTATION_DAYS) return;
    const existing = document.getElementById("lab-day-series-js");
    if (!existing) {
      const s = document.createElement("script");
      s.id = "lab-day-series-js"; s.src = "day-series.js";
      s.onload = () => setReady(true); s.onerror = () => setReady(true);
      document.head.appendChild(s);
    } else {
      const poll = setInterval(() => { if (window.ROTATION_DAYS) { clearInterval(poll); setReady(true); } }, 80);
      return () => clearInterval(poll);
    }
  }, []);
  return labCard(
    "Ridgeline / Joyplot",
    "Month-of-year listening profile per year (each row normalised) — reveals whether your peak shifts between winter and summer across time.",
    ready ? <RidgeLine /> : <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: LAB_FAINT }}>Loading…</div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  5. ARC DIAGRAM — shared band-members graph
// ─────────────────────────────────────────────────────────────────
function ArcDiagram() {
  const R = window.ROTATION;
  const conn = R && R.INSIGHTS && R.INSIGHTS.CONNECTIONS;
  if (!conn || !conn.links || !conn.links.length) {
    return <StubCard title="Arc Diagram" caption="Artists sharing band members" needs="ROTATION.INSIGHTS.CONNECTIONS (MusicBrainz data required during build)" />;
  }

  const links = conn.links.slice(0, 10);
  // collect unique artists in order of their total plays
  const artistMap = new Map();
  for (const lk of links) {
    for (const a of lk.artists) {
      if (!artistMap.has(a.name)) artistMap.set(a.name, { ...a, totalLinks: 0 });
      artistMap.get(a.name).totalLinks++;
    }
  }
  const nodes = [...artistMap.values()].sort((a, b) => b.plays - a.plays).slice(0, 20);
  const nodeIdx = new Map(nodes.map((n, i) => [n.name, i]));

  const W = 660, H = 260, PAD_L = 12, PAD_R = 12;
  const usable = W - PAD_L - PAD_R;
  const xOf = (i) => PAD_L + (i / Math.max(nodes.length - 1, 1)) * usable;
  const BASE_Y = 196;

  return labCard(
    "Arc Diagram",
    "Artists sharing band members linked by arcs — the hidden lineage that genre boxes erase.",
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
      {/* baseline */}
      <line x1={PAD_L} x2={W - PAD_R} y1={BASE_Y} y2={BASE_Y} stroke={LAB_RULE} strokeWidth="1" />
      {/* arcs */}
      {links.map((lk, li) => {
        const linked = lk.artists.filter(a => nodeIdx.has(a.name));
        if (linked.length < 2) return null;
        const idxs = linked.map(a => nodeIdx.get(a.name)).sort((a, b) => a - b);
        const arcs = [];
        for (let i = 0; i < idxs.length - 1; i++) {
          for (let j = i + 1; j < idxs.length; j++) {
            const x1 = xOf(idxs[i]), x2 = xOf(idxs[j]);
            const rx = (x2 - x1) / 2;
            const ry = Math.min(rx * 0.65, 130);
            arcs.push(
              <path key={`${li}-${i}-${j}`}
                d={`M${x1.toFixed(1)} ${BASE_Y} A${rx.toFixed(1)} ${ry.toFixed(1)} 0 0 1 ${x2.toFixed(1)} ${BASE_Y}`}
                fill="none" stroke={`oklch(0.62 0.14 ${(li * 37 + 200) % 360})`}
                strokeWidth="1.4" opacity="0.6" />
            );
          }
        }
        return arcs;
      })}
      {/* nodes */}
      {nodes.map((n, i) => {
        const x = xOf(i);
        const col = labHue(n.hue);
        return (
          <g key={n.name}>
            <circle cx={x} cy={BASE_Y} r="4.5" fill={col} />
            <text x={x} y={BASE_Y + 14}
              fill={col} fontSize="8" fontFamily="var(--mono)"
              textAnchor="middle" transform={`rotate(-40,${x},${BASE_Y + 14})`}>
              {n.name.length > 14 ? n.name.slice(0, 13) + "…" : n.name}
            </text>
          </g>
        );
      })}
      {/* person labels at arc tops */}
      {links.slice(0, 6).map((lk, li) => {
        const linked = lk.artists.filter(a => nodeIdx.has(a.name));
        if (linked.length < 2) return null;
        const idxs = linked.map(a => nodeIdx.get(a.name)).sort((a, b) => a - b);
        const x1 = xOf(idxs[0]), x2 = xOf(idxs[idxs.length - 1]);
        const mx = (x1 + x2) / 2;
        const ry = Math.min((x2 - x1) / 2 * 0.65, 130);
        return (
          <text key={li} x={mx} y={BASE_Y - ry - 4}
            fill={LAB_FAINT} fontSize="7.5" fontFamily="var(--mono)" textAnchor="middle">
            {lk.person.length > 18 ? lk.person.slice(0, 17) + "…" : lk.person}
          </text>
        );
      })}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────
//  6. BEESWARM — adoption lag
// ─────────────────────────────────────────────────────────────────
function Beeswarm() {
  const R = window.ROTATION;
  const ad = R && R.INSIGHTS && R.INSIGHTS.ADOPTION;
  if (!ad || !ad.artists) {
    return <StubCard title="Beeswarm" caption="Adoption lag: how old the music was when you found it" needs="ROTATION.INSIGHTS.ADOPTION (MusicBrainz debut dates required during build)" />;
  }

  // We only have summary data (early[], digs[], medianLag, decades) in INSIGHTS.ADOPTION
  // — the full rows array isn't emitted to the client. Build a synthetic dot cloud
  // from the decade breakdown and the early/digs outliers.
  const { medianLag, decades, early, digs } = ad;

  // create dots from early (low lag) + digs (high lag) arrays + spread filler from decades
  const dots = [];
  const seenNames = new Set();

  if (early) for (const r of early) {
    seenNames.add(r.name);
    dots.push({ name: r.name, lag: r.lag, plays: r.plays, hue: r.hue, label: true });
  }
  if (digs) for (const r of digs) {
    if (!seenNames.has(r.name)) {
      seenNames.add(r.name);
      dots.push({ name: r.name, lag: r.lag, plays: r.plays, hue: r.hue, label: true });
    }
  }

  // Synthesise approximate scatter from decades data for visual mass
  let seed = 7;
  const lcg = () => { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 0xffffffff; };
  if (decades) {
    for (const d of decades) {
      const approxCount = Math.round(d.share * 80);
      const decLag = Math.max(0, new Date().getFullYear() - d.decade - 15);
      for (let i = 0; i < approxCount && dots.length < 200; i++) {
        dots.push({ lag: Math.max(0, decLag + (lcg() * 30 - 8) | 0), plays: 10, hue: (d.decade - 1960) * 6 + 120, label: false });
      }
    }
  }

  const maxLag = Math.max(...dots.map(d => d.lag), 50);
  const W = 660, H = 140;
  const PAD = 36;
  const usable = W - PAD * 2;
  const xOf = (lag) => PAD + (lag / maxLag) * usable;

  // simple jitter: distribute dots vertically within band using deterministic hash
  seed = 42;
  const positioned = dots.map((d, i) => ({
    ...d,
    x: xOf(d.lag) + (lcg() * 8 - 4),
    y: H / 2 + (lcg() * 60 - 30),
  }));

  return labCard(
    "Beeswarm — Adoption Lag",
    `How old (in years) the artist's music was when you first listened — median ${medianLag}y; left = caught early, right = deep archive digs.`,
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
        {/* axis line */}
        <line x1={PAD} x2={W - PAD} y1={H / 2} y2={H / 2} stroke={LAB_RULE} strokeWidth="1" />
        {/* median marker */}
        <line x1={xOf(medianLag)} x2={xOf(medianLag)} y1={20} y2={H - 20}
          stroke={LAB_ACC} strokeWidth="1.2" strokeDasharray="3 3" />
        <text x={xOf(medianLag)} y={15} fill={LAB_ACC} fontSize="8.5"
          fontFamily="var(--mono)" textAnchor="middle">median {medianLag}y</text>
        {/* axis ticks */}
        {[0, 10, 20, 30, 40, 50].filter(v => v <= maxLag).map(v => (
          <g key={v}>
            <line x1={xOf(v)} x2={xOf(v)} y1={H / 2 - 4} y2={H / 2 + 4} stroke={LAB_FAINT} strokeWidth="1" />
            <text x={xOf(v)} y={H - 4} fill={LAB_FAINT} fontSize="7.5"
              fontFamily="var(--mono)" textAnchor="middle">{v}y</text>
          </g>
        ))}
        {/* dots */}
        {positioned.filter(d => !d.label).map((d, i) => (
          <circle key={i} cx={d.x.toFixed(1)} cy={d.y.toFixed(1)}
            r="3.5" fill={labHueDim(d.hue)} opacity="0.45" />
        ))}
        {positioned.filter(d => d.label).map((d, i) => (
          <circle key={i} cx={d.x.toFixed(1)} cy={d.y.toFixed(1)}
            r="4.5" fill={labHue(d.hue)} opacity="0.9" />
        ))}
        {/* outlier labels */}
        {positioned.filter(d => d.label).map((d, i) => (
          <text key={i} x={d.x.toFixed(1)} y={(d.y - 8).toFixed(1)}
            fill={labHue(d.hue)} fontSize="7.5" fontFamily="var(--mono)"
            textAnchor="middle">
            {d.name.length > 14 ? d.name.slice(0, 13) + "…" : d.name}
          </text>
        ))}
      </svg>
      {decades && (
        <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {decades.map(d => (
            <div key={d.decade} style={{ fontFamily: "var(--mono)", fontSize: 9,
              color: LAB_FAINT, letterSpacing: ".06em" }}>
              {d.decade}s <span style={{ color: LAB_DIM }}>{Math.round(d.share * 100)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  7 (→8). SLOPE GRAPH — this year vs last year top-15 artists
// ─────────────────────────────────────────────────────────────────
function SlopeGraph() {
  const R = window.ROTATION;
  if (!R || !R.ARTISTS || !R.ERAS) return <StubCard title="Slope Graph" caption="This year vs last year" needs="ROTATION.ARTISTS + ROTATION.ERAS" />;

  const eras = R.ERAS.slice().sort((a, b) => a.year - b.year);
  if (eras.length < 2) return <StubCard title="Slope Graph" caption="This year vs last year" needs="at least 2 years of data in ROTATION.ERAS" />;

  const curEra = eras[eras.length - 1];
  const prevEra = eras[eras.length - 2];
  const curYear = curEra.year;
  const prevYear = prevEra.year;

  // Build top-15 from union of both years' top-10
  const nameSet = new Set();
  for (const a of (curEra.top || [])) nameSet.add(a.name);
  for (const a of (prevEra.top || [])) nameSet.add(a.name);
  const names = [...nameSet].slice(0, 16);

  // plays per artist per year (from ARTISTS[i].yp)
  const byName = {};
  for (const a of R.ARTISTS) byName[a.name] = a;

  const rows = names.map(name => {
    const a = byName[name];
    const curP = a ? (a.yp && a.yp[curYear] || 0) : 0;
    const prevP = a ? (a.yp && a.yp[prevYear] || 0) : 0;
    return { name, curP, prevP, hue: a ? a.hue : 200 };
  }).filter(r => r.curP > 0 || r.prevP > 0)
    .sort((a, b) => b.curP - a.curP);

  const allVals = rows.flatMap(r => [r.curP, r.prevP]).filter(v => v > 0);
  const maxV = Math.max(...allVals, 1);

  const W = 480, H_TOTAL = Math.max(320, rows.length * 22 + 60);
  const PAD_L = 130, PAD_R = 130, PAD_T = 36, PAD_B = 20;
  const usableH = H_TOTAL - PAD_T - PAD_B;

  // y position based on rank in each column
  const prevRanked = rows.slice().sort((a, b) => b.prevP - a.prevP);
  const curRanked = rows.slice().sort((a, b) => b.curP - a.curP);
  const prevRank = new Map(prevRanked.map((r, i) => [r.name, i]));
  const curRank = new Map(curRanked.map((r, i) => [r.name, i]));
  const rowCount = rows.length;
  const yOf = (rankIdx) => PAD_T + (rankIdx / Math.max(rowCount - 1, 1)) * usableH;

  return labCard(
    "Slope Graph",
    `${prevYear} vs ${curYear} — rising and falling artists as slope lines; direction and steepness beat a paired bar chart for comparisons.`,
    <svg viewBox={`0 0 ${W} ${H_TOTAL}`} width="100%"
      style={{ display: "block", maxWidth: 480, margin: "0 auto" }}>
      {/* column headers */}
      <text x={PAD_L - 10} y={22} fill={LAB_DIM} fontSize="10" fontFamily="var(--mono)"
        textAnchor="end" letterSpacing=".1em">{prevYear}</text>
      <text x={W - PAD_R + 10} y={22} fill={LAB_DIM} fontSize="10" fontFamily="var(--mono)"
        textAnchor="start" letterSpacing=".1em">{curYear}</text>
      {/* lines */}
      {rows.map(r => {
        const x1 = PAD_L - 4, x2 = W - PAD_R + 4;
        const y1 = r.prevP > 0 ? yOf(prevRank.get(r.name)) : null;
        const y2 = r.curP > 0 ? yOf(curRank.get(r.name)) : null;
        const col = labHue(r.hue);
        const rising = y1 !== null && y2 !== null && y2 < y1;
        const falling = y1 !== null && y2 !== null && y2 > y1;
        const lw = rising ? 2.0 : 1.4;
        const op = rising ? 0.9 : falling ? 0.55 : 0.75;
        return (
          <g key={r.name}>
            {y1 !== null && y2 !== null && (
              <line x1={x1} y1={y1.toFixed(1)} x2={x2} y2={y2.toFixed(1)}
                stroke={col} strokeWidth={lw} opacity={op} />
            )}
            {y1 !== null && (
              <g>
                <circle cx={x1} cy={y1.toFixed(1)} r="3.5" fill={col} />
                <text x={x1 - 7} y={(y1 + 3.5).toFixed(1)} fill={col} fontSize="8.5"
                  fontFamily="var(--mono)" textAnchor="end">
                  {r.name.length > 16 ? r.name.slice(0, 15) + "…" : r.name}
                  <tspan fill={LAB_FAINT}> {r.prevP}</tspan>
                </text>
              </g>
            )}
            {y2 !== null && (
              <g>
                <circle cx={x2} cy={y2.toFixed(1)} r="3.5" fill={col} />
                <text x={x2 + 7} y={(y2 + 3.5).toFixed(1)} fill={col} fontSize="8.5"
                  fontFamily="var(--mono)" textAnchor="start">
                  {r.name.length > 16 ? r.name.slice(0, 15) + "…" : r.name}
                  <tspan fill={LAB_FAINT}> {r.curP}</tspan>
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────
//  LAB VIEW
// ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────
//  INSIGHT PROTOTYPES (2026-08-26) — the three roadmap insights staged
//  in the lab BEFORE any rollout (Fuad: "I need to get a good idea of
//  what we're doing here"): taste fingerprint · lyrical diet · discovery
//  genealogy. Placement/graduation is Fuad's call; nothing links here.
// ─────────────────────────────────────────────────────────────────

const FP_LABEL = { energy: "Energy", valence: "Positivity", dance: "Danceability", acoustic: "Acoustic", instr: "Instrumental", tempo: "Tempo" };
// R.AUDIO artist rows are [energy, valence, acoustic, tempo, dance, instr, …] — NOT the
// AUDIO_DIST axis order. Map by name; never by position.
const FP_AUDIO_IDX = { energy: 0, valence: 1, acoustic: 2, tempo: 3, dance: 4, instr: 5 };

function TasteFingerprint() {
  const R = window.ROTATION;
  const D = R && R.AUDIO_DIST;
  const [pick, setPick] = React.useState("");
  if (!D || !D.cdf) return <StubCard title="Taste Fingerprint" caption="Sweet-spot bands per audio axis" needs="ROTATION.AUDIO_DIST" />;
  const q = (c, pm) => { for (let v = 0; v <= 100; v++) if (c[v] >= pm) return v; return 100; };
  const bands = D.axes.map((name, i) => {
    const c = D.cdf[i];
    const dens = c.map((v, j) => (j ? v - c[j - 1] : v));
    return { name, p25: q(c, 250), p50: q(c, 500), p75: q(c, 750), dens, max: Math.max(...dens) };
  });
  const tight = bands.slice().sort((a, b) => (a.p75 - a.p25) - (b.p75 - b.p25));
  const pid = pick && R.idForName ? R.idForName(pick) : null;
  const row = pid && R.AUDIO ? R.AUDIO[pid] : null;
  const picked = row && { name: (R.byId[pid] || { name: pick }).name, vals: Object.fromEntries(bands.map(b => [b.name, Math.round((row[FP_AUDIO_IDX[b.name]] || 0) * 100)])) };
  const inBand = b => picked && picked.vals[b.name] >= b.p25 && picked.vals[b.name] <= b.p75;
  const grad = (b) => "linear-gradient(90deg," + b.dens.filter((_, j) => j % 2 === 0)
    .map((d, j) => `oklch(0.74 0.13 330 / ${(d / b.max * 0.85).toFixed(2)}) ${j * 2}%`).join(",") + ")";
  return labCard("Taste Fingerprint", "Where 20 years of plays actually live on each audio axis — the shaded mass is play-weighted density, the bracket is your middle-50% comfort band. Type an artist to score them against it.",
    <div>
      {bands.map(b => (
        <div key={b.name} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}>
          <div style={{ width: 86, fontFamily: "var(--mono)", fontSize: 10, color: LAB_DIM, textAlign: "right", flex: "none" }}>{FP_LABEL[b.name]}</div>
          <div style={{ position: "relative", flex: 1, height: 20, background: LAB_BG2, borderRadius: 4, overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, backgroundImage: grad(b) }} />
            <div style={{ position: "absolute", top: 0, bottom: 0, left: b.p25 + "%", width: (b.p75 - b.p25) + "%", border: `1px solid ${LAB_INK}`, borderRadius: 3, opacity: 0.55 }} title={`comfort band ${b.p25}–${b.p75}`} />
            <div style={{ position: "absolute", top: 2, bottom: 2, left: `calc(${b.p50}% - 1px)`, width: 2, background: LAB_INK, opacity: 0.9 }} title={`median ${b.p50}`} />
            {picked && <div style={{ position: "absolute", top: 4, width: 10, height: 10, borderRadius: "50%", left: `calc(${picked.vals[b.name]}% - 5px)`, background: inBand(b) ? "oklch(0.8 0.16 150)" : "oklch(0.72 0.19 25)", border: `1.5px solid ${LAB_BG}` }} title={`${picked.name}: ${picked.vals[b.name]}`} />}
          </div>
          <div style={{ width: 62, fontFamily: "var(--mono)", fontSize: 9, color: LAB_FAINT, flex: "none" }}>{b.p25}–{b.p75}</div>
        </div>
      ))}
      <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: LAB_DIM, margin: "12px 0 10px", lineHeight: 1.7 }}>
        Tightest preference: <b style={{ color: LAB_INK }}>{FP_LABEL[tight[0].name]}</b> ({tight[0].p25}–{tight[0].p75}) ·
        loosest: <b style={{ color: LAB_INK }}>{FP_LABEL[tight[5].name]}</b> ({tight[5].p25}–{tight[5].p75})
      </div>
      <input list="fp-artists" value={pick} onChange={e => setPick(e.target.value)} placeholder="score an artist against your fingerprint…"
        style={{ background: LAB_BG2, border: `1px solid ${LAB_RULE}`, color: LAB_INK, borderRadius: 6, padding: "7px 10px", fontFamily: "var(--mono)", fontSize: 11, width: "min(320px,100%)" }} />
      <datalist id="fp-artists">{(R.ARTISTS || []).map(a => <option key={a.id} value={a.name} />)}</datalist>
      {picked && (() => {
        const hits = bands.filter(inBand), miss = bands.filter(b => !inBand(b));
        return <div style={{ fontFamily: "var(--serif)", fontSize: 13, color: LAB_DIM, marginTop: 10, lineHeight: 1.6 }}>
          <b style={{ color: LAB_INK }}>{picked.name}</b> sits inside your comfort band on <b style={{ color: LAB_INK }}>{hits.length} of 6</b> axes{miss.length ? <> — the outliers: {miss.map(b => `${FP_LABEL[b.name].toLowerCase()} ${picked.vals[b.name]} vs your ${b.p25}–${b.p75}`).join(", ")}.</> : " — squarely your sound."}
        </div>;
      })()}
      {!picked && pick && <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: LAB_FAINT, marginTop: 8 }}>no audio row for that name (top-400 artists carry one)</div>}
    </div>
  );
}

const DIET_HUES = [330, 46, 4, 282, 96, 214, 150, 60];
function LyricalDiet() {
  const T = window.ROTATION && window.ROTATION.INSIGHTS && window.ROTATION.INSIGHTS.THEMES;
  const [sel, setSel] = React.useState(null);
  if (!T || !T.arc) return <StubCard title="Lyrical Diet" caption="What you listen ABOUT, over time" needs="INSIGHTS.THEMES.arc" />;
  const themes = T.arc.themes, years = T.arc.years;
  const hueOf = th => DIET_HUES[themes.indexOf(th) >= 0 ? themes.indexOf(th) % DIET_HUES.length : 7];
  const shift = themes.map(th => {
    const f = years.slice(0, 3).reduce((s, y) => s + (y.byTheme[th] || 0), 0) / 3;
    const l = years.slice(-3).reduce((s, y) => s + (y.byTheme[th] || 0), 0) / 3;
    return { th, d: l - f };
  }).sort((a, b) => b.d - a.d);
  const H = 150;
  return labCard("Lyrical Diet", `What the lyrics you play are ABOUT, year by year — play-weighted shares over ${T.covered.toLocaleString("en-US")} theme-classified tracks. Click a theme for its exemplar songs and the artists who feed it.`,
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: H + 22, marginBottom: 10 }}>
        {years.map(y => {
          const shown = themes.reduce((s, th) => s + (y.byTheme[th] || 0), 0);
          return (
            <div key={y.year} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%" }} title={`${y.year} · ${y.plays.toLocaleString("en-US")} themed plays`}>
              <div style={{ height: Math.round((1 - shown) * H), background: LAB_BG2 }} title="other themes" />
              {themes.slice().reverse().map(th => (
                <div key={th} style={{ height: Math.max(1, Math.round((y.byTheme[th] || 0) * H)), background: sel && sel !== th ? labHueDim(hueOf(th)) : labHue(hueOf(th)), opacity: sel && sel !== th ? 0.35 : 1 }} title={`${th} ${(100 * (y.byTheme[th] || 0)).toFixed(1)}%`} />
              ))}
              <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: LAB_FAINT, textAlign: "center", marginTop: 4 }}>{String(y.year).slice(2)}</div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {T.shares.slice(0, 8).map(s => (
          <button key={s.theme} onClick={() => setSel(sel === s.theme ? null : s.theme)}
            style={{ background: sel === s.theme ? labHue(hueOf(s.theme)) : LAB_BG2, color: sel === s.theme ? LAB_BG : LAB_DIM, border: `1px solid ${LAB_RULE}`, borderRadius: 20, padding: "4px 11px", fontFamily: "var(--mono)", fontSize: 10, cursor: "pointer" }}>
            {s.theme} · {Math.round(s.share * 100)}%
          </button>
        ))}
      </div>
      <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: LAB_DIM, lineHeight: 1.8 }}>
        Rising: <b style={{ color: LAB_INK }}>{shift[0].th}</b> (+{(shift[0].d * 100).toFixed(1)} pts vs your first years) ·
        fading: <b style={{ color: LAB_INK }}>{shift[shift.length - 1].th}</b> ({(shift[shift.length - 1].d * 100).toFixed(1)} pts)
      </div>
      {sel && (
        <div style={{ marginTop: 12, borderTop: `1px solid ${LAB_RULE}`, paddingTop: 12 }}>
          {(T.exemplars[sel] || []).map(x => (
            <div key={x.id} style={{ fontFamily: "var(--serif)", fontSize: 13, color: LAB_DIM, marginBottom: 3 }}>
              <a href={"#track/" + x.id} style={{ color: LAB_INK, textDecoration: "none" }}>{x.artist} — {x.title}</a>
              <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: LAB_FAINT }}> · {x.plays} plays</span>
            </div>
          ))}
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: LAB_FAINT, marginTop: 6 }}>
            fed by: {T.artists.filter(a => a.themes.some(t => t.theme === sel)).slice(0, 6).map(a => a.name).join(" · ") || "—"}
          </div>
        </div>
      )}
    </div>
  );
}

function GenealogyLab() {
  const R = window.ROTATION;
  const [ready, setReady] = React.useState(!!window.ROTATION_GENEALOGY);
  const [pick, setPick] = React.useState("");
  React.useEffect(() => {
    if (!window.ROTATION_GENEALOGY) window.loadScript("genealogy.js", "rotation-genealogy-js", () => setReady(true));
  }, []);
  if (!ready) return labCard("Discovery Genealogy", "How did I get here? — who introduced whom, reconstructed from first plays inside listening sessions.",
    <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: LAB_FAINT }}>loading the family tree…</div>);
  const G = window.ROTATION_GENEALOGY || {};
  const nameOf = s => (R.byId[s] && R.byId[s].name) || (R.expById && R.expById[s] && R.expById[s].name) || s;
  const kids = {};
  for (const k in G) { const p = G[k][0]; if (p) (kids[p] = kids[p] || []).push(k); }
  const gateways = Object.entries(kids).sort((a, b) => b[1].length - a[1].length).slice(0, 15);
  const pid = pick && R.idForName ? R.idForName(pick) : null;
  const chain = [];
  if (pid && G[pid]) {
    let cur = pid, guard = 0;
    while (cur && guard++ < 12 && !chain.some(c => c.id === cur)) { chain.unshift({ id: cur, d: G[cur] ? G[cur][1] : null }); cur = G[cur] ? G[cur][0] : null; }
  }
  const children = pid && kids[pid] ? kids[pid].slice().sort((a, b) => (G[a][1] < G[b][1] ? -1 : 1)) : [];
  return labCard("Discovery Genealogy", "Every artist's first play happened inside a session — the artist heard just before it is the best mechanical guess at who introduced whom. Chains and gateways derive from that one map (dated plays, ≥5-play artists).",
    <div>
      <input list="gen-artists" value={pick} onChange={e => setPick(e.target.value)} placeholder="trace an artist…"
        style={{ background: LAB_BG2, border: `1px solid ${LAB_RULE}`, color: LAB_INK, borderRadius: 6, padding: "7px 10px", fontFamily: "var(--mono)", fontSize: 11, width: "min(320px,100%)", marginBottom: 12 }} />
      <datalist id="gen-artists">{(R.ARTISTS || []).map(a => <option key={a.id} value={a.name} />)}</datalist>
      {chain.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: ".16em", textTransform: "uppercase", color: LAB_FAINT, marginBottom: 6 }}>ancestry</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 14, lineHeight: 2, color: LAB_DIM }}>
            {chain.map((c, i) => (
              <span key={c.id}>
                {i > 0 && <span style={{ color: LAB_FAINT }}> → </span>}
                <a href={"#artist/" + c.id} style={{ color: i === chain.length - 1 ? LAB_ACC : LAB_INK, textDecoration: "none" }}>{nameOf(c.id)}</a>
                <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: LAB_FAINT }}> {c.d ? c.d.slice(0, 7) : ""}</span>
              </span>
            ))}
          </div>
          {children.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: ".16em", textTransform: "uppercase", color: LAB_FAINT, marginBottom: 6 }}>introduced {children.length} artist{children.length === 1 ? "" : "s"}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {children.slice(0, 24).map(k => (
                  <a key={k} href={"#artist/" + k} style={{ background: LAB_BG2, border: `1px solid ${LAB_RULE}`, borderRadius: 20, padding: "3px 10px", fontFamily: "var(--mono)", fontSize: 10, color: LAB_DIM, textDecoration: "none" }}>
                    {nameOf(k)} <span style={{ color: LAB_FAINT }}>{G[k][1].slice(0, 7)}</span>
                  </a>
                ))}
                {children.length > 24 && <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: LAB_FAINT, alignSelf: "center" }}>+{children.length - 24} more</span>}
              </div>
            </div>
          )}
        </div>
      )}
      {pick && !chain.length && <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: LAB_FAINT, marginBottom: 10 }}>no genealogy entry for that name (dated era, ≥5 plays)</div>}
      <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: ".16em", textTransform: "uppercase", color: LAB_FAINT, margin: "4px 0 6px" }}>your biggest gateways</div>
      {gateways.map(([g, ks]) => (
        <div key={g} onClick={() => setPick(nameOf(g))} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "3px 0" }}>
          <div style={{ width: 150, fontFamily: "var(--serif)", fontSize: 13, color: LAB_INK, flex: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nameOf(g)}</div>
          <div style={{ height: 8, borderRadius: 4, background: LAB_ACC, width: (ks.length / gateways[0][1].length * 60) + "%" }} />
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: LAB_DIM }}>{ks.length}</div>
        </div>
      ))}
    </div>
  );
}

function LabView() {
  const R = window.ROTATION;
  const totals = R && R.TOTALS;

  return (
    <div className="r-view" style={{ maxWidth: 760, margin: "0 auto" }}>
      <div style={{ marginBottom: 32 }}>
        <div className="r-kicker">Lab</div>
        <h1 className="r-title">Visualisation Testbed</h1>
        <p className="r-lede" style={{ marginTop: 8 }}>
          Novel chart forms on real data. Ugly-but-honest —
          each chart reveals something a bar or line chart hides.
          {totals && <> {totals.scrobbles ? ` ${totals.scrobbles.toLocaleString("en-US")} scrobbles.` : ""}</>}
        </p>
        <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: LAB_FAINT,
          marginTop: 10, letterSpacing: ".14em", textTransform: "uppercase" }}>
          Hidden route — <a href="#overview" style={{ color: LAB_ACC, textDecoration: "none" }}>← back to overview</a>
        </div>
      </div>

      {/* ── Book v3 — inline section (not an overlay) ── */}
      {(() => {
        const BookSection = window.BookSection;
        if (!BookSection) return null;
        return (
          <div style={{ marginBottom: 28 }}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".2em",
                textTransform: "uppercase", color: LAB_ACC, marginBottom: 5 }}>
                Stories as a Book · v3
              </div>
              <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 13,
                color: LAB_DIM, lineHeight: 1.5 }}>
                18 pages · 5 chapters · hard covers + soft pages · two-page spread (StPageFlip landscape mode).
                Click the cover to open. ← → or chapter rail to navigate. Margin annotations point at chart features.
                Renders inline — part of this page, not a modal.
              </div>
            </div>
            <BookSection />
          </div>
        );
      })()}

      {/* ── Insight prototypes — roadmap candidates staged before rollout (2026-08-26) ── */}
      <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".2em", textTransform: "uppercase", color: LAB_ACC, margin: "6px 0 14px" }}>
        Insight prototypes · fingerprint / diet / genealogy
      </div>
      <TasteFingerprint />
      <LyricalDiet />
      <GenealogyLab />
      <BumpChart />
      <SpiralWrapper />
      <RidgeWrapper />
      <ArcDiagram />
      <Beeswarm />
      <SlopeGraph />
    </div>
  );
}
