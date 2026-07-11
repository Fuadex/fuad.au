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
    if (a) return a.hue;
    let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return h % 360;
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
        const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
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
//  3. HORIZON CHART — daily plays in stacked bands
// ─────────────────────────────────────────────────────────────────
const HORIZON_BANDS = 5;
const HORIZON_COLORS = [
  "oklch(0.28 0.08 260)",
  "oklch(0.38 0.12 280)",
  "oklch(0.48 0.15 300)",
  "oklch(0.60 0.18 320)",
  "oklch(0.74 0.18 340)",
];

function HorizonInner() {
  const D = window.ROTATION_DAYS;
  if (!D) return null;

  const counts = D.counts;
  const max = Math.max(...counts, 1);
  const BAND_H = 32;
  const W = 700, H = BAND_H;

  // Each day is 1px wide; we squeeze into viewBox width W
  const n = counts.length;
  const dx = W / n;

  return (
    <div style={{ overflowX: "auto" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%"
        style={{ display: "block", imageRendering: "pixelated" }}>
        {counts.map((v, i) => {
          if (!v) return null;
          const norm = v / max; // 0–1
          // band index: which band this value falls into
          for (let b = HORIZON_BANDS - 1; b >= 0; b--) {
            const lo = b / HORIZON_BANDS;
            const hi = (b + 1) / HORIZON_BANDS;
            if (norm > lo) {
              const barH = Math.min(1, (norm - lo) / (1 / HORIZON_BANDS)) * BAND_H;
              return (
                <rect key={i} x={(i * dx).toFixed(2)} y={(BAND_H - barH).toFixed(2)}
                  width={Math.max(0.8, dx).toFixed(2)} height={barH.toFixed(2)}
                  fill={HORIZON_COLORS[b]} />
              );
            }
          }
          return null;
        })}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4,
        fontFamily: "var(--mono)", fontSize: 9, color: LAB_FAINT, letterSpacing: ".08em" }}>
        <span>{D.start}</span>
        <span>{new Date(new Date(D.start + "T00:00:00Z").getTime() + (D.days - 1) * 86400000).toISOString().slice(0, 10)}</span>
      </div>
    </div>
  );
}

function HorizonWrapper() {
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
    "Horizon Chart",
    "Daily plays 2010–now compressed into a single band — colour encodes intensity so 15 years of listening fits in one line.",
    ready ? <HorizonInner /> : <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: LAB_FAINT }}>Loading…</div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  4. RIDGELINE / JOYPLOT — play-share per month across years
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
//  7. BARCODE STRIP — #1 artist's active days as hairlines
// ─────────────────────────────────────────────────────────────────
function BarcodeStrip() {
  const R = window.ROTATION;
  const D = window.ROTATION_DAYS;

  if (!R || !R.ARTISTS || !R.ARTISTS.length) return <StubCard title="Barcode" caption="#1 artist active-day texture" needs="ROTATION.ARTISTS" />;

  const top = R.ARTISTS[0];
  // Use the artist's yp (per-year plays) to find their active years
  // Day-level data per-artist isn't emitted; use overall ROTATION_DAYS as a fallback barcode
  // (shows the library's texture — still reveals obsession vs steady patterns)

  const useArtist = !!(top && top.era);
  const label = useArtist ? `${top.name} — overall active days (day-level per-artist not emitted; showing library texture shaped by their era field)` : "Full library";

  if (!D) return (
    <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: LAB_FAINT }}>Loading…</div>
  );

  const counts = D.counts;
  const W = 700, H = 50;

  // colour hairlines by intensity
  const sorted = counts.slice().sort((a, b) => a - b);
  const p80 = sorted[Math.floor(sorted.length * 0.8)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];

  return (
    <div>
      <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: LAB_FAINT,
        marginBottom: 6, letterSpacing: ".06em" }}>Library ({D.start} → {D.days} days)</div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%"
        style={{ display: "block", imageRendering: "crispEdges" }}>
        {counts.map((v, i) => {
          if (!v) return null;
          const x = (i / (counts.length - 1)) * W;
          const col = v >= p95 ? "oklch(0.80 0.18 340)"
            : v >= p80 ? "oklch(0.62 0.15 320)"
            : "oklch(0.44 0.10 300)";
          return <line key={i} x1={x.toFixed(2)} x2={x.toFixed(2)} y1="0" y2={H}
            stroke={col} strokeWidth="0.8" opacity="0.8" />;
        })}
      </svg>
      <div style={{ display: "flex", gap: 16, marginTop: 6, fontFamily: "var(--mono)",
        fontSize: 9, color: LAB_FAINT, letterSpacing: ".06em" }}>
        <span><i style={{ display: "inline-block", width: 10, height: 10, background: "oklch(0.80 0.18 340)", verticalAlign: "middle", marginRight: 4, borderRadius: 1 }} />peak days (top 5%)</span>
        <span><i style={{ display: "inline-block", width: 10, height: 10, background: "oklch(0.62 0.15 320)", verticalAlign: "middle", marginRight: 4, borderRadius: 1 }} />heavy (top 20%)</span>
        <span><i style={{ display: "inline-block", width: 10, height: 10, background: "oklch(0.44 0.10 300)", verticalAlign: "middle", marginRight: 4, borderRadius: 1 }} />active</span>
      </div>
    </div>
  );
}

function BarcodeWrapper() {
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
    "Barcode Strip",
    "Every active day as a hairline — texture of obsessive bursts vs steady presence that totals and bar charts flatten into a number.",
    ready ? <BarcodeStrip /> : <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: LAB_FAINT }}>Loading…</div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  8. SLOPE GRAPH — this year vs last year top-15 artists
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
//  9. DECADE TREEMAP — play-weighted area by music decade (bonus)
// ─────────────────────────────────────────────────────────────────
function DecadeTreemap() {
  const R = window.ROTATION;
  const ad = R && R.INSIGHTS && R.INSIGHTS.ADOPTION;
  if (!ad || !ad.decades || !ad.decades.length) {
    return <StubCard title="Decade Treemap" caption="Listening by music release decade" needs="ROTATION.INSIGHTS.ADOPTION.decades" />;
  }

  const decades = ad.decades.filter(d => d.share > 0).sort((a, b) => b.share - a.share);
  const total = decades.reduce((s, d) => s + d.share, 0);
  const W = 660, H = 120;

  // simple horizontal strip treemap
  let cx = 0;
  const rects = decades.map(d => {
    const w = (d.share / total) * W;
    const r = { x: cx, w, decade: d.decade, share: d.share };
    cx += w;
    return r;
  });

  return labCard(
    "Decade Treemap",
    "Area = share of your plays by the music's release decade — reveals whether you live in the past or track the present.",
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", borderRadius: 4 }}>
      {rects.map((r, i) => {
        const hue = 60 + i * 28;
        return (
          <g key={r.decade}>
            <rect x={r.x.toFixed(1)} y="0" width={Math.max(r.w - 1, 0).toFixed(1)} height={H}
              fill={`oklch(${0.32 + i * 0.055} 0.14 ${hue % 360})`} rx="2" />
            {r.w > 36 && (
              <text x={(r.x + r.w / 2).toFixed(1)} y={H / 2 - 6}
                fill="rgba(255,255,255,0.9)" fontSize="11" fontFamily="var(--mono)"
                fontWeight="600" textAnchor="middle">{r.decade}s</text>
            )}
            {r.w > 36 && (
              <text x={(r.x + r.w / 2).toFixed(1)} y={H / 2 + 10}
                fill="rgba(255,255,255,0.65)" fontSize="9" fontFamily="var(--mono)"
                textAnchor="middle">{Math.round(r.share * 100)}%</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────
//  0. ATTRIBUTE LAB — library projected onto pickable audio-attribute axes
// ─────────────────────────────────────────────────────────────────
// Per-track audio features live in track-audio.js (window.ROTATION_TRACKAUDIO),
// keyed artistSlug~trackSlug -> [durSec, pop, explicit, trackNo, energy, valence,
// acoustic, tempo, dance, instr]. Features are present only when length >= 10;
// every feature axis is scaled 0..100. We average per artist (artistSlug = the
// leading key segment = R.ARTISTS/R.EXPLORE .id) into an attribute centroid.

const ATTR_FEAT_IX = { energy: 4, valence: 5, acoustic: 6, tempo: 7, dance: 8, instr: 9 };

// axis descriptors: key -> { label, kind }. kind drives scaling + value formatting.
const ATTR_AXES = [
  { key: "energy",     label: "energy",       kind: "feat" },
  { key: "dance",      label: "danceability", kind: "feat" },
  { key: "valence",    label: "valence",      kind: "feat" },
  { key: "acoustic",   label: "acousticness", kind: "feat" },
  { key: "instr",      label: "instrumental", kind: "feat" },
  { key: "tempo",      label: "tempo",        kind: "feat" },
  { key: "popularity", label: "popularity",   kind: "log" },   // listeners, log-scaled
  { key: "debut",      label: "debut year",   kind: "year" },
  { key: "plays",      label: "your plays",   kind: "log" },
];
const ATTR_SHADE = [
  { key: "none",     label: "none" },
  { key: "acoustic", label: "acoustic" },
  { key: "instr",    label: "instrumental" },
  { key: "tempo",    label: "tempo" },
];
const attrAxisByKey = (k) => ATTR_AXES.find(a => a.key === k) || ATTR_AXES[0];

// build (memo-friendly) per-artist attribute centroids from the track-audio blob.
// One-time ~40k-row pass; caller memoises on the blob identity.
function attrBuildArtists(TA, R) {
  // accumulate feature sums + counts per artistSlug
  const acc = new Map(); // slug -> { n, sum:[6], key }
  const keys = Object.keys(TA);
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    const td = TA[k];
    if (!td || td.length < 10) continue; // no feature block
    const tilde = k.indexOf("~");
    if (tilde < 1) continue;
    const aSlug = k.slice(0, tilde);
    let e = acc.get(aSlug);
    if (!e) { e = { n: 0, sum: [0, 0, 0, 0, 0, 0] }; acc.set(aSlug, e); }
    // energy,valence,acoustic,tempo,dance,instr in that fixed order
    const vs = [td[4], td[5], td[6], td[7], td[8], td[9]];
    let ok = true;
    for (let j = 0; j < 6; j++) { const v = vs[j]; if (typeof v !== "number" || v !== v) { ok = false; break; } }
    if (!ok) continue;
    for (let j = 0; j < 6; j++) e.sum[j] += vs[j];
    e.n++;
  }

  // meta lookup: id -> { name, plays, hue, listeners, debut }. ARTISTS is always
  // present; EXPLORE (deferred) carries the long tail + listeners(l)/debut(d).
  const meta = new Map();
  const addMeta = (a, kept) => {
    if (!a || !a.id) return;
    const cur = meta.get(a.id) || {};
    meta.set(a.id, {
      name: cur.name || a.name,
      plays: cur.plays != null ? cur.plays : a.plays,
      hue: cur.hue != null ? cur.hue : (a.hue != null ? a.hue : 300),
      listeners: cur.listeners != null ? cur.listeners : (a.l != null ? a.l : null),
      debut: cur.debut != null ? cur.debut : (a.d != null ? a.d : null),
      s: cur.s != null ? cur.s : (a.s || null),
    });
  };
  if (R.ARTISTS) for (const a of R.ARTISTS) addMeta(a, true);
  if (R.EXPLORE) for (const a of R.EXPLORE) addMeta(a, false);

  const artists = [];
  for (const [aSlug, e] of acc) {
    if (e.n < 3) continue; // require >=3 audio-covered tracks
    const m = meta.get(aSlug);
    if (!m) continue; // not in our library projection (unkept, unscrobbled)
    const feat = {
      energy:   e.sum[0] / e.n,
      valence:  e.sum[1] / e.n,
      acoustic: e.sum[2] / e.n,
      tempo:    e.sum[3] / e.n,
      dance:    e.sum[4] / e.n,
      instr:    e.sum[5] / e.n,
    };
    artists.push({
      id: aSlug,
      name: m.name || aSlug,
      plays: m.plays || 0,
      hue: m.hue,
      listeners: m.listeners,
      debut: m.debut,
      sub: (m.s && m.s.length) ? m.s[0] : null,
      nTracks: e.n,
      feat,
    });
  }
  return { artists, totalAudioArtists: acc.size };
}

// weighted subgenre centroids from the per-artist rows (weight = plays).
function attrBuildSubs(artists, R) {
  const SUBS = R.SUBS || [];
  const agg = new Map(); // subIdx -> { w, sum:[6], listW, listSum, debW, debSum, plays }
  for (const a of artists) {
    if (a.sub == null || !SUBS[a.sub]) continue;
    const w = Math.max(a.plays, 1);
    let e = agg.get(a.sub);
    if (!e) { e = { w: 0, sum: [0, 0, 0, 0, 0, 0], listW: 0, listSum: 0, debW: 0, debSum: 0, plays: 0 }; agg.set(a.sub, e); }
    const f = a.feat;
    e.sum[0] += f.energy * w; e.sum[1] += f.valence * w; e.sum[2] += f.acoustic * w;
    e.sum[3] += f.tempo * w;  e.sum[4] += f.dance * w;   e.sum[5] += f.instr * w;
    e.w += w; e.plays += a.plays;
    if (a.listeners != null) { e.listSum += a.listeners * w; e.listW += w; }
    if (a.debut != null)     { e.debSum += a.debut * w;      e.debW += w; }
  }
  const subs = [];
  for (const [si, e] of agg) {
    if (e.w <= 0) continue;
    const S = SUBS[si];
    subs.push({
      id: "sub-" + si,
      name: S.name,
      plays: e.plays,
      hue: S.hue != null ? S.hue : 300,
      listeners: e.listW > 0 ? e.listSum / e.listW : null,
      debut: e.debW > 0 ? e.debSum / e.debW : null,
      sub: si,
      feat: {
        energy: e.sum[0] / e.w, valence: e.sum[1] / e.w, acoustic: e.sum[2] / e.w,
        tempo: e.sum[3] / e.w,  dance: e.sum[4] / e.w,   instr: e.sum[5] / e.w,
      },
    });
  }
  return subs;
}

// raw axis value for a row given an axis key.
function attrRawVal(row, key) {
  if (key === "plays") return row.plays || 0;
  if (key === "popularity") return row.listeners != null ? row.listeners : null;
  if (key === "debut") return row.debut != null ? row.debut : null;
  return row.feat ? row.feat[key] : null; // feature axis (0..100)
}

// human-readable value for the tooltip / results list.
function attrFmtVal(row, key) {
  const v = attrRawVal(row, key);
  if (v == null) return "–";
  if (key === "plays") return Math.round(v).toLocaleString("en-US");
  if (key === "popularity") return Math.round(v).toLocaleString("en-US");
  if (key === "debut") return String(Math.round(v));
  return v.toFixed(0); // 0..100 feature
}

function AttributeChart({ artists, subs, totalAudioArtists, hasRest }) {
  const R = window.ROTATION;
  const [xKey, setXKey] = React.useState("energy");
  const [yKey, setYKey] = React.useState("valence");
  const [mode, setMode] = React.useState("artists");
  const [shade, setShade] = React.useState("none");
  const [hover, setHover] = React.useState(null);
  const [brush, setBrush] = React.useState(null);   // {x0,y0,x1,y1} in pixel space, live
  const [brushed, setBrushed] = React.useState(null); // committed rect
  const dragRef = React.useRef(null);
  const svgRef = React.useRef(null);

  const rows = mode === "subgenres" ? subs : artists;

  // pixel-space plot geometry (viewBox 1000 x H, non-stretched via preserveAspectRatio)
  const W = 1000, H = 520;
  const PAD_L = 44, PAD_R = 20, PAD_T = 20, PAD_B = 40;
  const PW = W - PAD_L - PAD_R, PH = H - PAD_T - PAD_B;

  // build scale for an axis over the current rows.
  const buildScale = React.useCallback((key) => {
    const ax = attrAxisByKey(key);
    const vals = [];
    for (const r of rows) { const v = attrRawVal(r, key); if (v != null && v === v) vals.push(v); }
    if (!vals.length) return { ax, ok: false, map: () => 0, min: 0, max: 1 };
    let min = Math.min(...vals), max = Math.max(...vals);
    if (ax.kind === "feat") { min = 0; max = 100; }
    let tf = (v) => v;
    if (ax.kind === "log") { tf = (v) => Math.log10(Math.max(v, 1)); min = tf(min); max = tf(Math.max(max, 1)); }
    if (min === max) max = min + 1;
    return { ax, ok: true, tf, min, max, map: (v) => (tf(v) - min) / (max - min) };
  }, [rows]);

  const sx = React.useMemo(() => buildScale(xKey), [buildScale, xKey]);
  const sy = React.useMemo(() => buildScale(yKey), [buildScale, yKey]);

  // plotted points with pixel coords.
  const pts = React.useMemo(() => {
    const out = [];
    let maxPlays = 1;
    for (const r of rows) maxPlays = Math.max(maxPlays, r.plays || 0);
    const totPlays = rows.reduce((s, r) => s + (r.plays || 0), 0) || 1;
    for (const r of rows) {
      const vx = attrRawVal(r, xKey), vy = attrRawVal(r, yKey);
      if (vx == null || vy == null || vx !== vx || vy !== vy) continue;
      const px = PAD_L + sx.map(vx) * PW;
      const py = PAD_T + (1 - sy.map(vy)) * PH; // y inverted (higher value = up)
      // r ∝ sqrt(plays); subgenre dots sized to total plays share
      const base = Math.sqrt((r.plays || 1) / maxPlays);
      const radius = mode === "subgenres"
        ? Math.max(4, 6 + base * 20)
        : Math.max(2.2, 2.5 + base * 12);
      out.push({ row: r, px, py, radius, vx, vy });
    }
    return out;
  }, [rows, sx, sy, xKey, yKey, mode]);

  // top subgenres to label (by plays) when in subgenre mode.
  const labelIds = React.useMemo(() => {
    if (mode !== "subgenres") return new Set();
    const sorted = pts.slice().sort((a, b) => (b.row.plays || 0) - (a.row.plays || 0)).slice(0, 25);
    return new Set(sorted.map(p => p.row.id));
  }, [pts, mode]);

  // shade-by luminance: map chosen attr to 0..1 (only feature axes offered).
  const shadeVal = React.useCallback((row) => {
    if (shade === "none") return null;
    const v = row.feat ? row.feat[shade] : null;
    if (v == null || v !== v) return null;
    return Math.max(0, Math.min(1, v / 100));
  }, [shade]);

  // convert a client mouse event to pixel-space coords in the viewBox.
  const toLocal = (evt) => {
    const svg = svgRef.current; if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const cx = (evt.clientX - rect.left) / rect.width * W;
    const cy = (evt.clientY - rect.top) / rect.height * H;
    return { x: cx, y: cy };
  };

  const onMove = (evt) => {
    const p = toLocal(evt); if (!p) return;
    if (dragRef.current) {
      setBrush({ x0: dragRef.current.x, y0: dragRef.current.y, x1: p.x, y1: p.y });
      return;
    }
    // nearest dot within 24px (pixel-space)
    let best = null, bd = 24 * 24;
    for (const pt of pts) {
      const dx = pt.px - p.x, dy = pt.py - p.y;
      const d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = pt; }
    }
    setHover(best);
  };

  const onDown = (evt) => {
    const p = toLocal(evt); if (!p) return;
    dragRef.current = p;
    setBrush({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
  };
  const onUp = () => {
    if (dragRef.current && brush) {
      const w = Math.abs(brush.x1 - brush.x0), h = Math.abs(brush.y1 - brush.y0);
      if (w > 6 && h > 6) {
        setBrushed({
          x0: Math.min(brush.x0, brush.x1), x1: Math.max(brush.x0, brush.x1),
          y0: Math.min(brush.y0, brush.y1), y1: Math.max(brush.y0, brush.y1),
        });
      } else { setBrushed(null); }
    }
    dragRef.current = null;
    setBrush(null);
  };
  const onLeave = () => { if (!dragRef.current) setHover(null); };

  // which points are inside the committed brush?
  const inBrush = React.useCallback((pt) => {
    if (!brushed) return true;
    return pt.px >= brushed.x0 && pt.px <= brushed.x1 && pt.py >= brushed.y0 && pt.py <= brushed.y1;
  }, [brushed]);

  const brushedPts = React.useMemo(() => {
    if (!brushed) return [];
    return pts.filter(inBrush).sort((a, b) => (b.row.plays || 0) - (a.row.plays || 0)).slice(0, 30);
  }, [pts, brushed, inBrush]);

  // axis tick labels (HTML, outside svg per house rule): 4 ticks.
  const ticksFor = (scale) => {
    if (!scale.ok) return [];
    const out = [];
    for (let i = 0; i <= 3; i++) {
      const frac = i / 3;
      let raw;
      if (scale.ax.kind === "log") raw = Math.pow(10, scale.min + frac * (scale.max - scale.min));
      else raw = scale.min + frac * (scale.max - scale.min);
      let lbl;
      if (scale.ax.kind === "feat") lbl = Math.round(raw).toString();
      else if (scale.ax.kind === "year") lbl = Math.round(raw).toString();
      else if (raw >= 1000) lbl = (raw / 1000).toFixed(raw >= 10000 ? 0 : 1) + "k";
      else lbl = Math.round(raw).toString();
      out.push({ frac, lbl });
    }
    return out;
  };
  const xTicks = ticksFor(sx), yTicks = ticksFor(sy);

  const selBox = {
    background: LAB_BG2, color: LAB_INK, border: "1px solid " + LAB_RULE,
    borderRadius: 4, fontFamily: "var(--mono)", fontSize: 11, padding: "3px 6px",
    letterSpacing: ".04em", cursor: "pointer",
  };
  const ctrlLabel = { fontFamily: "var(--mono)", fontSize: 9, color: LAB_FAINT,
    letterSpacing: ".14em", textTransform: "uppercase", marginRight: 6 };

  const segBtn = (on) => ({
    fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".08em",
    padding: "4px 10px", cursor: "pointer", border: "1px solid " + LAB_RULE,
    background: on ? LAB_ACC : "transparent", color: on ? "#120c16" : LAB_DIM,
    textTransform: "uppercase",
  });

  const hoverRow = hover ? hover.row : null;

  // luminance-shaded fill for a row.
  const fillFor = (row) => {
    const sv = shadeVal(row);
    const L = sv == null ? 0.66 : (0.34 + sv * 0.5);
    return "oklch(" + L.toFixed(3) + " 0.15 " + (row.hue != null ? row.hue : 300) + ")";
  };

  return (
    <div>
      {/* CONTROLS */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "14px 20px", alignItems: "center", marginBottom: 12 }}>
        <div>
          <span style={ctrlLabel}>X</span>
          <select value={xKey} onChange={e => { setXKey(e.target.value); setBrushed(null); }} style={selBox}>
            {ATTR_AXES.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}
          </select>
        </div>
        <div>
          <span style={ctrlLabel}>Y</span>
          <select value={yKey} onChange={e => { setYKey(e.target.value); setBrushed(null); }} style={selBox}>
            {ATTR_AXES.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}
          </select>
        </div>
        <div>
          <span style={ctrlLabel}>shade</span>
          <select value={shade} onChange={e => setShade(e.target.value)} style={selBox}>
            {ATTR_SHADE.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", borderRadius: 4, overflow: "hidden" }}>
          <div onClick={() => { setMode("artists"); setBrushed(null); setHover(null); }} style={segBtn(mode === "artists")}>artists</div>
          <div onClick={() => { setMode("subgenres"); setBrushed(null); setHover(null); }} style={segBtn(mode === "subgenres")}>subgenres</div>
        </div>
      </div>

      {/* HOVER READOUT (top of card) */}
      <div style={{ minHeight: 18, marginBottom: 6, fontFamily: "var(--mono)", fontSize: 11,
        color: hoverRow ? LAB_INK : LAB_FAINT, letterSpacing: ".04em" }}>
        {hoverRow ? (
          <span>
            <b style={{ color: labHue(hoverRow.hue != null ? hoverRow.hue : 300) }}>{hoverRow.name}</b>
            {"  ·  " + attrAxisByKey(xKey).label + " " + attrFmtVal(hoverRow, xKey)}
            {"  ·  " + attrAxisByKey(yKey).label + " " + attrFmtVal(hoverRow, yKey)}
            {"  ·  " + (hoverRow.plays || 0).toLocaleString("en-US") + " plays"}
          </span>
        ) : (
          <span>hover a dot for its values · drag to brush a region</span>
        )}
      </div>

      {/* PLOT: y-label column + svg */}
      <div style={{ display: "flex", alignItems: "stretch" }}>
        <div style={{ position: "relative", width: 16, flex: "0 0 16px" }}>
          <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%) rotate(-90deg)",
            transformOrigin: "left", whiteSpace: "nowrap", fontFamily: "var(--mono)", fontSize: 10,
            color: LAB_ACC, letterSpacing: ".14em", textTransform: "uppercase" }}>
            {attrAxisByKey(yKey).label} →
          </div>
        </div>
        <div style={{ position: "relative", flex: 1 }}>
          <svg ref={svgRef} viewBox={"0 0 " + W + " " + H} width="100%"
            style={{ display: "block", background: LAB_BG, borderRadius: 6, touchAction: "none",
              aspectRatio: W + " / " + H,
              cursor: dragRef.current ? "crosshair" : "default" }}
            onMouseMove={onMove} onMouseDown={onDown} onMouseUp={onUp} onMouseLeave={onLeave}>
            {/* grid */}
            {yTicks.map((t, i) => {
              const y = PAD_T + (1 - t.frac) * PH;
              return <line key={"gy" + i} x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke={LAB_RULE} strokeWidth="1" opacity="0.5" />;
            })}
            {xTicks.map((t, i) => {
              const x = PAD_L + t.frac * PW;
              return <line key={"gx" + i} x1={x} x2={x} y1={PAD_T} y2={H - PAD_B} stroke={LAB_RULE} strokeWidth="1" opacity="0.5" />;
            })}
            {/* axis frame */}
            <line x1={PAD_L} x2={PAD_L} y1={PAD_T} y2={H - PAD_B} stroke={LAB_FAINT} strokeWidth="1" />
            <line x1={PAD_L} x2={W - PAD_R} y1={H - PAD_B} y2={H - PAD_B} stroke={LAB_FAINT} strokeWidth="1" />

            {/* dots */}
            {pts.map((pt, i) => {
              const on = inBrush(pt);
              const isHover = hover && hover.row.id === pt.row.id;
              const op = brushed ? (on ? 0.92 : 0.12) : (mode === "subgenres" ? 0.82 : 0.75);
              return (
                <circle key={pt.row.id + i} cx={pt.px.toFixed(1)} cy={pt.py.toFixed(1)}
                  r={(isHover ? pt.radius + 2 : pt.radius).toFixed(1)}
                  fill={fillFor(pt.row)} opacity={op}
                  stroke={isHover ? LAB_INK : "none"} strokeWidth={isHover ? 1.4 : 0} />
              );
            })}

            {/* subgenre labels (tiny mono) for the top ~25 */}
            {mode === "subgenres" && pts.filter(pt => labelIds.has(pt.row.id)).map((pt, i) => (
              <text key={"lbl" + pt.row.id} x={(pt.px + pt.radius + 3).toFixed(1)} y={(pt.py + 3).toFixed(1)}
                fill={LAB_DIM} fontSize="10" fontFamily="var(--mono)">
                {pt.row.name.length > 22 ? pt.row.name.slice(0, 21) + "…" : pt.row.name}
              </text>
            ))}

            {/* live brush rectangle */}
            {brush && (
              <rect x={Math.min(brush.x0, brush.x1).toFixed(1)} y={Math.min(brush.y0, brush.y1).toFixed(1)}
                width={Math.abs(brush.x1 - brush.x0).toFixed(1)} height={Math.abs(brush.y1 - brush.y0).toFixed(1)}
                fill={LAB_ACC} fillOpacity="0.08" stroke={LAB_ACC} strokeWidth="1" strokeDasharray="4 3" />
            )}
            {/* committed brush outline */}
            {brushed && !brush && (
              <rect x={brushed.x0.toFixed(1)} y={brushed.y0.toFixed(1)}
                width={(brushed.x1 - brushed.x0).toFixed(1)} height={(brushed.y1 - brushed.y0).toFixed(1)}
                fill="none" stroke={LAB_ACC} strokeWidth="1" strokeDasharray="4 3" opacity="0.7" />
            )}
          </svg>

          {/* X tick labels (HTML, outside svg) */}
          <div style={{ position: "relative", height: 14, marginTop: 2 }}>
            {xTicks.map((t, i) => (
              <div key={"xt" + i} style={{ position: "absolute",
                left: ((PAD_L + t.frac * PW) / W * 100) + "%", transform: "translateX(-50%)",
                fontFamily: "var(--mono)", fontSize: 9, color: LAB_FAINT }}>{t.lbl}</div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 2, fontFamily: "var(--mono)", fontSize: 10,
            color: LAB_ACC, letterSpacing: ".14em", textTransform: "uppercase" }}>
            {attrAxisByKey(xKey).label} →
          </div>

          {/* Y tick labels floated over left edge */}
          {yTicks.map((t, i) => (
            <div key={"yt" + i} style={{ position: "absolute", left: -2,
              top: (PAD_T + (1 - t.frac) * PH) / H * 100 + "%", transform: "translate(-100%,-50%)",
              fontFamily: "var(--mono)", fontSize: 9, color: LAB_FAINT, paddingRight: 4 }}>{t.lbl}</div>
          ))}
        </div>
      </div>

      {/* BRUSH RESULTS */}
      {brushed && (
        <div style={{ marginTop: 14, borderTop: "1px solid " + LAB_RULE, paddingTop: 12 }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: LAB_FAINT,
            letterSpacing: ".14em", textTransform: "uppercase", marginBottom: 8 }}>
            {brushedPts.length} in region — top {Math.min(30, brushedPts.length)} by plays
            <span style={{ color: LAB_FAINT, textTransform: "none", letterSpacing: 0 }}>
              {"  (names are plain text — the #lab view isn't wired to navigation)"}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "4px 16px" }}>
            {brushedPts.map((pt) => (
              <div key={pt.row.id} style={{ fontFamily: "var(--mono)", fontSize: 11,
                color: LAB_DIM, display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span style={{ color: labHue(pt.row.hue != null ? pt.row.hue : 300), overflow: "hidden",
                  textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pt.row.name}</span>
                <span style={{ color: LAB_FAINT, flex: "0 0 auto" }}>
                  {(pt.row.plays || 0).toLocaleString("en-US")} · {attrFmtVal(pt.row, xKey)}/{attrFmtVal(pt.row, yKey)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasRest && (
        <div style={{ marginTop: 10, fontFamily: "var(--mono)", fontSize: 9, color: LAB_FAINT, letterSpacing: ".06em" }}>
          long-tail universe still loading — popularity &amp; debut-year axes fill in once music-rest.js lands.
        </div>
      )}
    </div>
  );
}

function AttributeWrapper() {
  const R = window.ROTATION;
  const [taReady, setTaReady] = React.useState(!!window.ROTATION_TRACKAUDIO);
  const [restReady, setRestReady] = React.useState(!!(R && R._restLoaded));

  // lazy-load the shared track-audio blob (id reused so we never double-inject).
  React.useEffect(() => {
    if (window.ROTATION_TRACKAUDIO) { setTaReady(true); return; }
    const existing = document.getElementById("lab-track-audio-js");
    if (!existing) {
      const s = document.createElement("script");
      s.id = "lab-track-audio-js"; s.src = "track-audio.js";
      s.onload = () => setTaReady(true); s.onerror = () => setTaReady(true);
      document.head.appendChild(s);
    } else {
      const poll = setInterval(() => { if (window.ROTATION_TRACKAUDIO) { clearInterval(poll); setTaReady(true); } }, 80);
      return () => clearInterval(poll);
    }
  }, []);

  // watch for the deferred EXPLORE universe (listeners/debut axes + long tail).
  React.useEffect(() => {
    if (!R || R._restLoaded) { setRestReady(true); return; }
    const poll = setInterval(() => { if (R._restLoaded) { clearInterval(poll); setRestReady(true); } }, 120);
    return () => clearInterval(poll);
  }, []);

  // HARD MEMO: the ~40k-row centroid pass runs once per (blob, rest-arrival).
  const built = React.useMemo(() => {
    if (!taReady || !window.ROTATION_TRACKAUDIO || !R) return null;
    const base = attrBuildArtists(window.ROTATION_TRACKAUDIO, R);
    const subs = attrBuildSubs(base.artists, R);
    return { ...base, subs };
  }, [taReady, restReady, R]);

  const caption = built
    ? "The library projected onto pickable audio-attribute axes — pick X/Y, brush a region, "
      + "read who lives there. " + built.artists.length + " of "
      + (built.totalAudioArtists ? built.totalAudioArtists : "?") + " audio-covered artists have ≥3 featured tracks "
      + "(only those get a stable centroid)."
    : "The library projected onto pickable audio-attribute axes for granular discovery.";

  let body;
  if (!taReady) {
    body = <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: LAB_FAINT, letterSpacing: ".06em" }}>Loading track-audio…</div>;
  } else if (!built || !built.artists.length) {
    body = <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: LAB_FAINT, letterSpacing: ".06em" }}>No artists with ≥3 audio-featured tracks.</div>;
  } else {
    body = <AttributeChart artists={built.artists} subs={built.subs} totalAudioArtists={built.totalAudioArtists} hasRest={restReady} />;
  }

  return labCard("Attribute Lab", caption, body);
}

// ─────────────────────────────────────────────────────────────────
//  LAB VIEW
// ─────────────────────────────────────────────────────────────────
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

      <AttributeWrapper />
      <BumpChart />
      <SpiralWrapper />
      <HorizonWrapper />
      <RidgeWrapper />
      <ArcDiagram />
      <Beeswarm />
      <BarcodeWrapper />
      <SlopeGraph />
      <DecadeTreemap />
    </div>
  );
}
