// rotation-book.jsx — "Stories as an interactive book" pilot
// A full-viewport overlay paged with ← → keys, on-screen arrows, and swipe.
// Three spreads:
//   0 — Cover     : title typography + "the listening years" + animated particle texture
//   1 — Genre Eras: LEFT prose from ROTATION data, RIGHT animated stacked-area genre stream
//   2 — Ridgeline : LEFT prose on listening rhythm, RIGHT ridgeline chart (hour-shapes by year)
//
// Exports window.BookOverlay  — rendered from rotation-lab.jsx.
// Self-contained except for the window.ROTATION data contract (GENRE_FLOW, CLOCK_BY_YEAR, TOTALS, ERAS).

(function () {
  const { useState, useEffect, useRef, useMemo, useCallback } = React;

  // ─── palette (matches LAB_* / r-card idiom) ───
  const BK_BG     = "#0b0a0f";
  const BK_PAPER  = "#f4f1ea";
  const BK_INK    = "#f1eef6";
  const BK_DIM    = "#a09bb0";
  const BK_FAINT  = "#665f78";
  const BK_RULE   = "#272235";
  const BK_ACCENT = "oklch(0.74 0.13 330)";
  const BK_PAPER_INK = "#16131c";
  const BK_PAPER_RULE = "#cbc4ba";

  // ────────────────────────────────────────────────────────────
  //  SPREAD 0 — COVER
  // ────────────────────────────────────────────────────────────
  function CoverSpread({ active }) {
    const canvasRef = useRef(null);
    const rafRef    = useRef(null);
    const tRef      = useRef(0);

    useEffect(() => {
      if (!active) { cancelAnimationFrame(rafRef.current); return; }
      const cv = canvasRef.current; if (!cv) return;
      const ctx = cv.getContext("2d");
      const N = 120;

      // deterministic particle positions (stable across renders)
      const particles = Array.from({ length: N }, (_, i) => {
        const x = ((Math.sin(i * 2.399) + 1) / 2) * cv.width;
        const y = ((Math.cos(i * 1.618) + 1) / 2) * cv.height;
        const size = 1.4 + (i % 5) * 0.6;
        const speed = 0.15 + (i % 7) * 0.06;
        const amp   = 18 + (i % 11) * 4;
        return { x0: x, y0: y, size, speed, amp, phase: i * 0.41 };
      });

      function draw(ts) {
        tRef.current = ts / 1000;
        const t = tRef.current;
        ctx.clearRect(0, 0, cv.width, cv.height);
        for (const p of particles) {
          const ox = Math.sin(t * p.speed + p.phase) * p.amp;
          const oy = Math.cos(t * p.speed * 0.7 + p.phase * 1.3) * p.amp * 0.5;
          const lum = 0.28 + 0.10 * Math.sin(t * 0.4 + p.phase);
          ctx.beginPath();
          ctx.arc(p.x0 + ox, p.y0 + oy, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `oklch(${lum.toFixed(2)} 0.10 330 / 0.55)`;
          ctx.fill();
        }
        rafRef.current = requestAnimationFrame(draw);
      }
      rafRef.current = requestAnimationFrame(draw);
      return () => cancelAnimationFrame(rafRef.current);
    }, [active]);

    const R = window.ROTATION;
    const since = R && R.TOTALS && R.TOTALS.since
      ? new Date(R.TOTALS.since).getUTCFullYear() : 2006;
    const scrobbles = R && R.TOTALS && R.TOTALS.scrobbles
      ? R.TOTALS.scrobbles.toLocaleString("en-US") : "319,000+";
    const hours = R && R.TOTALS && R.TOTALS.exactHours
      ? Math.round(R.TOTALS.exactHours).toLocaleString("en-US") : null;

    return (
      <div style={{
        width: "100%", height: "100%",
        background: BK_BG,
        display: "flex", alignItems: "stretch", position: "relative",
        overflow: "hidden"
      }}>
        {/* animated texture layer */}
        <canvas ref={canvasRef} width={900} height={600}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%",
            pointerEvents: "none", opacity: 0.85 }} />

        {/* centre content */}
        <div style={{
          position: "relative", zIndex: 2,
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "60px 10%", textAlign: "center", gap: 0
        }}>
          <div style={{
            fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".32em",
            textTransform: "uppercase", color: BK_FAINT, marginBottom: 28
          }}>fuad.au · a personal archive</div>

          <div style={{
            fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 600,
            fontSize: "clamp(52px, 8vw, 88px)", letterSpacing: "-.03em",
            lineHeight: 1, color: BK_INK,
            textShadow: "0 2px 40px rgba(11,10,15,.9)"
          }}>
            the listening<br />
            <span style={{ color: BK_ACCENT }}>years</span>
          </div>

          <div style={{
            width: 60, height: 2,
            background: `linear-gradient(90deg, transparent, ${BK_ACCENT}, transparent)`,
            margin: "36px auto"
          }} />

          <div style={{
            fontFamily: "var(--serif)", fontStyle: "italic",
            fontSize: "clamp(16px, 2.5vw, 22px)", color: BK_DIM,
            lineHeight: 1.5, maxWidth: 460
          }}>
            {scrobbles} scrobbles.<br />
            {since} to today.
            {hours && <><br />{hours} hours.</>}
          </div>

          <div style={{
            marginTop: 48,
            fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".2em",
            textTransform: "uppercase", color: BK_FAINT,
            animation: "bk-pulse 2.4s ease-in-out infinite"
          }}>press → to begin reading</div>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────
  //  HELPERS — Catmull-Rom smoothing (borrowed from journey)
  // ────────────────────────────────────────────────────────────
  function _segs(pts) {
    let d = "";
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i],
            p2 = pts[i + 1], p3 = pts[i + 2] || pts[i + 1];
      const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    return d;
  }

  // ────────────────────────────────────────────────────────────
  //  SPREAD 1 — GENRE ERAS
  //  LEFT  : prose narrative  |  RIGHT : animated stacked-area SVG
  // ────────────────────────────────────────────────────────────
  function GenreStreamChart({ active }) {
    const [drawn, setDrawn] = useState(false);
    const prevActive = useRef(false);

    useEffect(() => {
      if (active && !prevActive.current) {
        // trigger draw-in animation a tick after mounting
        const id = setTimeout(() => setDrawn(true), 80);
        return () => clearTimeout(id);
      }
      if (!active) { setDrawn(false); }
      prevActive.current = active;
    }, [active]);

    const R = window.ROTATION;
    const gf = R && R.GENRE_FLOW;

    if (!gf || !gf.years || !gf.families) {
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
          height: "100%", fontFamily: "var(--mono)", fontSize: 11, color: BK_FAINT,
          letterSpacing: ".08em" }}>
          GENRE_FLOW not available in this build
        </div>
      );
    }

    const years   = gf.years.map(y => y.year);
    const famData = gf.families; // [{i, family, hue}]
    // totals per year
    const totals  = gf.years.map(yr => yr.fams.reduce((s, v) => s + v, 0) || 1);
    // normalise: each year sums to 1
    const normRows = gf.years.map((yr, yi) => yr.fams.map(v => v / totals[yi]));

    // only keep families with any meaningful presence
    const active_fams = famData.filter((f, fi) => normRows.some(row => row[fi] > 0.02));

    const W = 520, H = 300;
    const padX = 24, padTop = 18, padBot = 32;
    const inner_w = W - padX * 2;
    const inner_h = H - padTop - padBot;

    const xAt = (yi) => padX + (years.length <= 1 ? inner_w / 2 : (yi / (years.length - 1)) * inner_w);

    // Stacked area — bottom to top stacking
    const stacked = {}; // fam index → [[x, y0, y1], ...]
    for (const f of active_fams) {
      stacked[f.i] = years.map(() => [0, 0]);
    }
    years.forEach((y, yi) => {
      let acc = 0;
      for (const f of active_fams) {
        const v = normRows[yi][f.i];
        stacked[f.i][yi] = [xAt(yi), acc, acc + v];
        acc += v;
      }
    });

    const areaPath = (fi) => {
      const rows = stacked[fi];
      const topPts  = rows.map(([x, , y1]) => [x, padTop + (1 - y1) * inner_h]);
      const botPts  = rows.map(([x, y0, ]) => [x, padTop + (1 - y0) * inner_h]);
      const botRev  = [...botPts].reverse();
      return `M${topPts[0][0].toFixed(1)} ${topPts[0][1].toFixed(1)}` +
        _segs(topPts) +
        ` L${botRev[0][0].toFixed(1)} ${botRev[0][1].toFixed(1)}` +
        _segs(botRev) + " Z";
    };

    // peak year label position per family
    const peakOf = (fi) => {
      let best = 0;
      years.forEach((y, yi) => { if (normRows[yi][fi] > normRows[best][fi]) best = yi; });
      const [x, y0, y1] = stacked[fi][best];
      return { x, yMid: padTop + (1 - (y0 + y1) / 2) * inner_h, height: (y1 - y0) * inner_h };
    };

    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%"
        style={{ display: "block", maxHeight: "100%" }}>
        {/* areas */}
        {active_fams.map((f) => {
          const col = `oklch(0.60 0.16 ${f.hue})`;
          const colStk = `oklch(0.68 0.14 ${f.hue})`;
          return (
            <path key={f.i} d={areaPath(f.i)}
              fill={col} fillOpacity={drawn ? 0.80 : 0}
              stroke={colStk} strokeWidth="0.8" strokeOpacity={drawn ? 0.6 : 0}
              style={{ transition: drawn ? "fill-opacity 1.2s ease, stroke-opacity 1.2s ease" : "none" }}
            />
          );
        })}
        {/* labels */}
        {active_fams.map((f) => {
          const { x, yMid, height } = peakOf(f.i);
          if (height < 16) return null;
          return (
            <text key={"l" + f.i} x={x} y={yMid}
              textAnchor="middle" dominantBaseline="middle"
              fontFamily="var(--mono)" fontSize={height > 32 ? 9.5 : 7.5}
              fontWeight="600"
              fill="rgba(255,255,255,0.9)"
              opacity={drawn ? 1 : 0}
              style={{ transition: drawn ? "opacity 1.4s ease 0.4s" : "none",
                pointerEvents: "none" }}>
              {f.family.length > 14 ? f.family.slice(0, 12) + "…" : f.family}
            </text>
          );
        })}
        {/* year axis */}
        {years.map((y, yi) => (
          (yi % 2 === 0 || yi === years.length - 1) ? (
            <text key={"y" + yi} x={xAt(yi)} y={H - 10}
              textAnchor="middle" fontFamily="var(--mono)" fontSize="8.5"
              fill={BK_FAINT}>
              {'`' + String(y).slice(2)}
            </text>
          ) : null
        ))}
      </svg>
    );
  }

  function GenreErasSpread({ active }) {
    const R = window.ROTATION;
    const gf   = R && R.GENRE_FLOW;
    const eras = R && R.ERAS;
    const tf   = R && R.INSIGHTS && R.INSIGHTS.TASTE_ERAS;

    // Build a simple narrative from available data
    const narrative = useMemo(() => {
      if (!R) return [];
      const totals = R.TOTALS || {};
      const since  = totals.since ? new Date(totals.since).getUTCFullYear() : 2006;
      const span   = new Date().getUTCFullYear() - since;

      // top families from GENRE_FLOW — find the one with highest share overall
      let topFam = null, runnerUp = null;
      if (gf && gf.years && gf.families) {
        const sumByFam = new Array(gf.families.length).fill(0);
        for (const yr of gf.years) yr.fams.forEach((v, fi) => { sumByFam[fi] += v; });
        const grand = sumByFam.reduce((s, v) => s + v, 0) || 1;
        const ranked = gf.families.map((f, fi) => ({ ...f, share: sumByFam[fi] / grand }))
          .sort((a, b) => b.share - a.share);
        topFam = ranked[0];
        runnerUp = ranked[1];
      }

      // Find earliest and most recent dominant genre via TASTE_ERAS
      const chapters = tf && tf.chapters;
      const firstChapter  = chapters && chapters[0];
      const latestChapter = chapters && chapters[chapters.length - 1];

      const paras = [];

      paras.push(
        `${span} years. That's how long this library has been accumulating — since ${since}, ` +
        `one scrobble at a time, until ${(totals.scrobbles || 0).toLocaleString("en-US")} plays ` +
        `settled into the data like sediment. The shape of that accumulation is not random.`
      );

      if (topFam && runnerUp) {
        const topPct  = Math.round(topFam.share  * 100);
        const runPct  = Math.round(runnerUp.share * 100);
        paras.push(
          `${topFam.family} has been the gravitational centre — roughly ${topPct}% of genre-weighted ` +
          `plays — with ${runnerUp.family} pulling in at ${runPct}%. But those numbers flatten ` +
          `what the chart to the right shows plainly: the balance has shifted across eras, each ` +
          `genre cresting and receding like tides.`
        );
      }

      if (firstChapter && latestChapter && firstChapter !== latestChapter) {
        const fFams = (firstChapter.topFams || []).slice(0, 2).join(" and ");
        const lFams = (latestChapter.topFams || []).slice(0, 2).join(" and ");
        paras.push(
          `The earliest chapter was defined by ${fFams || "heavy sounds"}. ` +
          `The most recent by ${lFams || "something newer"}. ` +
          `Between them: dozens of artists discovered, obsessed over, and carried forward.`
        );
      } else {
        paras.push(
          `Each band in the chart carries years of momentum — genres that arrived quietly, ` +
          `dominated for a stretch, then gave way to the next wave. The colour is the family; ` +
          `the height is how much of that year it owned.`
        );
      }

      return paras;
    }, [R]);

    return (
      <SpreadLayout
        leftBg={BK_PAPER}
        rightBg={BK_BG}
        left={
          <ProsePane
            kicker="Spread I · Genre Eras"
            title="How the sound shifted"
            paras={narrative}
            inkColor={BK_PAPER_INK}
            kickerColor={BK_PAPER_RULE}
            subtleRule={BK_PAPER_RULE}
          />
        }
        right={
          <div style={{ width: "100%", height: "100%", padding: "36px 32px",
            display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: ".24em",
              textTransform: "uppercase", color: BK_FAINT }}>
              Genre families · share of plays per year
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <GenreStreamChart active={active} />
            </div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 8.5, color: BK_FAINT,
              lineHeight: 1.5 }}>
              Data: ROTATION.GENRE_FLOW · each year normalised · families via last.fm tags + Discogs
            </div>
          </div>
        }
      />
    );
  }

  // ────────────────────────────────────────────────────────────
  //  SPREAD 2 — LISTENING HOUR SHAPES (Ridgeline by year)
  //  LEFT : prose  |  RIGHT : ridgeline using CLOCK_BY_YEAR
  // ────────────────────────────────────────────────────────────
  function HourRidgeChart({ active }) {
    const [drawn, setDrawn] = useState(false);
    const prevActive = useRef(false);

    useEffect(() => {
      if (active && !prevActive.current) {
        const id = setTimeout(() => setDrawn(true), 120);
        return () => clearTimeout(id);
      }
      if (!active) setDrawn(false);
      prevActive.current = active;
    }, [active]);

    const R = window.ROTATION;
    // CLOCK_BY_YEAR is in music-rest.js (deferred) — [{year, hours:[24 vals]}]
    const cby = R && R.CLOCK_BY_YEAR;
    // Fallback: CLOCK (all-time) if rest not loaded yet
    const clock = R && R.CLOCK; // 24-element array

    if (!cby || !cby.length) {
      // Render a single all-time shape if we only have CLOCK
      if (!clock || !clock.length) {
        return (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
            height: "100%", fontFamily: "var(--mono)", fontSize: 11, color: BK_FAINT,
            letterSpacing: ".08em", textAlign: "center", padding: 24 }}>
            CLOCK_BY_YEAR loads after first paint.<br />
            <span style={{ fontSize: 9, opacity: 0.6 }}>Navigate away and back, or wait for rest bundle.</span>
          </div>
        );
      }
      // single all-time ridge
      const vals = clock.map(v => typeof v === "object" ? (v.plays || 0) : v);
      const mx   = Math.max(...vals, 1);
      const norm = vals.map(v => v / mx);
      const W = 420, H = 200, padL = 28, padR = 12, padT = 18, padB = 28;
      const iw = W - padL - padR, ih = H - padT - padB;
      const xAt = (h) => padL + (h / 23) * iw;
      const pts  = norm.map((v, h) => [xAt(h), padT + (1 - v) * ih]);
      const area = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}` + _segs(pts) +
        ` L${pts[pts.length-1][0].toFixed(1)} ${padT + ih} L${pts[0][0].toFixed(1)} ${padT + ih} Z`;
      return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
          <path d={area}
            fill="oklch(0.60 0.16 330)" fillOpacity={drawn ? 0.75 : 0}
            stroke="oklch(0.72 0.14 330)" strokeWidth="1.2" strokeOpacity={drawn ? 0.8 : 0}
            style={{ transition: "fill-opacity 1.1s ease, stroke-opacity 1.1s ease" }} />
          {[0,6,12,18,23].map(h => (
            <text key={h} x={xAt(h)} y={H - 6} textAnchor="middle"
              fontFamily="var(--mono)" fontSize="8" fill={BK_FAINT}>{h}h</text>
          ))}
          <text x={W/2} y={12} textAnchor="middle" fontFamily="var(--serif)"
            fontStyle="italic" fontSize="11" fill={BK_DIM}>all-time</text>
        </svg>
      );
    }

    // Multi-year ridgeline
    const years = cby.map(r => r.year).sort((a, b) => a - b);
    // filter to years with enough data
    const active_years = years.filter(y => {
      const row = cby.find(r => r.year === y);
      return row && row.hours && row.hours.reduce((s, v) => s + v, 0) > 200;
    });

    if (!active_years.length) return null;

    const W = 480, RIDGE_H = 52;
    const PAD_L = 38, PAD_R = 12, PAD_TOP = 16, PAD_BOT = 22;
    const OVERLAP = RIDGE_H * 0.72;
    const totalH = PAD_TOP + active_years.length * (RIDGE_H * 0.52) + RIDGE_H + PAD_BOT;
    const iw = W - PAD_L - PAD_R;

    const xAt = (h) => PAD_L + (h / 23) * iw;
    const yBase = (yi) => PAD_TOP + yi * (RIDGE_H * 0.52) + RIDGE_H;

    const profiles = active_years.map(y => {
      const row = cby.find(r => r.year === y);
      const arr = row ? row.hours : new Array(24).fill(0);
      const mx  = Math.max(...arr, 1);
      return arr.map(v => v / mx);
    });

    return (
      <svg viewBox={`0 0 ${W} ${totalH}`} width="100%"
        style={{ display: "block", maxHeight: "100%", overflow: "visible" }}>
        {/* hour labels */}
        {[0, 6, 12, 18, 23].map(h => (
          <text key={h} x={xAt(h)} y={totalH - 4}
            fill={BK_FAINT} fontSize="8" fontFamily="var(--mono)" textAnchor="middle">
            {h}h
          </text>
        ))}

        {active_years.map((y, yi) => {
          const vals = profiles[yi];
          const hue  = 270 + yi * 16;
          const col  = `oklch(0.62 0.14 ${hue % 360})`;
          const fill = `oklch(0.42 0.11 ${hue % 360} / 0.58)`;
          const yb   = yBase(yi);
          const pts  = vals.map((v, h) => [xAt(h), yb - v * OVERLAP]);
          const d    = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}` + _segs(pts);
          const area = d +
            ` L${pts[pts.length-1][0].toFixed(1)} ${yb.toFixed(1)}` +
            ` L${pts[0][0].toFixed(1)} ${yb.toFixed(1)} Z`;
          const delay = (yi * 0.07).toFixed(2);
          return (
            <g key={y}>
              <path d={area} fill={fill}
                fillOpacity={drawn ? 1 : 0}
                style={{ transition: drawn ? `fill-opacity 0.9s ease ${delay}s` : "none" }} />
              <path d={d} fill="none" stroke={col} strokeWidth="1.4" strokeLinejoin="round"
                strokeOpacity={drawn ? 1 : 0}
                style={{ transition: drawn ? `stroke-opacity 0.9s ease ${delay}s` : "none" }} />
              <text x={PAD_L - 4} y={yb - 5} fill={col} fontSize="8"
                fontFamily="var(--mono)" textAnchor="end">{y}</text>
            </g>
          );
        })}
      </svg>
    );
  }

  function RidgeSpread({ active }) {
    const R = window.ROTATION;
    const cby = R && R.CLOCK_BY_YEAR;
    const clock = R && R.CLOCK;

    const narrative = useMemo(() => {
      if (!R) return [];
      const totals = R.TOTALS || {};

      // Find the peak hour from all-time CLOCK
      let peakHour = 22; // default: late night
      if (clock && clock.length) {
        const vals = clock.map(v => typeof v === "object" ? (v.plays || 0) : v);
        peakHour   = vals.indexOf(Math.max(...vals));
      }
      const peakLabel = peakHour < 6 ? "deep in the night"
        : peakHour < 10 ? "the morning hours"
        : peakHour < 14 ? "midday"
        : peakHour < 18 ? "the afternoon"
        : peakHour < 21 ? "the evening"
        : "late at night";

      const paras = [
        `When does music happen? Not on the calendar — on the clock. ` +
        `The body keeps its own schedule, and ${(totals.scrobbles || 0).toLocaleString("en-US")} scrobbles ` +
        `have recorded it faithfully: the peak falls at ${peakHour}:00, ${peakLabel}.`
      ];

      if (cby && cby.length > 3) {
        paras.push(
          `Each ridge to the right is a single year — the shape of how its hours were spent. ` +
          `Some years have sharp peaks, others sprawl across the day. The shape shifts as routines ` +
          `change: commutes, jobs, timezones, the thousand small reorganisations of a life.`
        );
        paras.push(
          `Late-night spikes are the giveaway of deep listening sessions — ` +
          `the kind where a single album plays twice because no one turned it off. ` +
          `Morning dips reveal the days music didn't get a look in until the afternoon.`
        );
      } else {
        paras.push(
          `The all-time shape shows the listening window at its fullest. ` +
          `The ridge concentrates where the hours were actually spent — ` +
          `not what was planned, but what the data remembers.`
        );
      }

      return paras;
    }, [R]);

    return (
      <SpreadLayout
        leftBg={BK_BG}
        rightBg={BK_PAPER}
        left={
          <div style={{ width: "100%", height: "100%", padding: "36px 32px",
            display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: ".24em",
              textTransform: "uppercase", color: BK_FAINT }}>
              Hour of day · ridgeline by year
            </div>
            <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center" }}>
              <HourRidgeChart active={active} />
            </div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 8.5, color: BK_FAINT,
              lineHeight: 1.5 }}>
              Data: ROTATION.CLOCK_BY_YEAR · each year normalised to its own peak · 24-hour local time
            </div>
          </div>
        }
        right={
          <ProsePane
            kicker="Spread II · Listening Hours"
            title="When the music plays"
            paras={narrative}
            inkColor={BK_PAPER_INK}
            kickerColor={BK_PAPER_RULE}
            subtleRule={BK_PAPER_RULE}
          />
        }
      />
    );
  }

  // ────────────────────────────────────────────────────────────
  //  SHARED LAYOUT PRIMITIVES
  // ────────────────────────────────────────────────────────────
  function SpreadLayout({ left, right, leftBg, rightBg }) {
    return (
      <div style={{
        width: "100%", height: "100%",
        display: "flex", flexDirection: "row"
      }}>
        <div style={{
          flex: 1, height: "100%", background: leftBg,
          overflow: "hidden", display: "flex", flexDirection: "column"
        }}>
          {left}
        </div>
        {/* spine */}
        <div style={{
          width: 2, background: `linear-gradient(180deg, transparent 10%, ${BK_RULE} 40%, ${BK_RULE} 60%, transparent 90%)`,
          flexShrink: 0
        }} />
        <div style={{
          flex: 1, height: "100%", background: rightBg,
          overflow: "hidden", display: "flex", flexDirection: "column"
        }}>
          {right}
        </div>
      </div>
    );
  }

  function ProsePane({ kicker, title, paras, inkColor, kickerColor, subtleRule }) {
    return (
      <div style={{
        flex: 1, padding: "52px 44px 40px",
        display: "flex", flexDirection: "column", gap: 24,
        color: inkColor, overflowY: "auto"
      }}>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 9, letterSpacing: ".28em",
          textTransform: "uppercase", color: kickerColor
        }}>{kicker}</div>

        <div style={{
          fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 600,
          fontSize: "clamp(26px, 3.5vw, 40px)", lineHeight: 1.15,
          letterSpacing: "-.02em", color: inkColor, marginTop: -4
        }}>{title}</div>

        <div style={{
          width: 40, height: 1.5,
          background: kickerColor, borderRadius: 1
        }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {paras.map((p, i) => (
            <p key={i} style={{
              margin: 0, fontFamily: "var(--serif)",
              fontSize: "clamp(13px, 1.5vw, 16px)", lineHeight: 1.7,
              color: i === 0 ? inkColor : (inkColor === BK_PAPER_INK ? "#3d3830" : BK_DIM),
              fontWeight: i === 0 ? 500 : 400
            }}>{p}</p>
          ))}
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────
  //  NAVIGATION ARROWS
  // ────────────────────────────────────────────────────────────
  function NavArrow({ dir, onClick, visible }) {
    if (!visible) return null;
    const isLeft = dir === "left";
    return (
      <button onClick={onClick} style={{
        position: "absolute",
        top: "50%", transform: "translateY(-50%)",
        [isLeft ? "left" : "right"]: 20,
        width: 48, height: 48, borderRadius: "50%",
        background: "rgba(17,15,23,0.72)",
        border: `1px solid ${BK_RULE}`,
        color: BK_DIM, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22, zIndex: 10,
        backdropFilter: "blur(8px)",
        transition: "color 0.15s, background 0.15s"
      }}
        onMouseEnter={e => { e.currentTarget.style.color = BK_INK; e.currentTarget.style.background = "rgba(39,34,53,0.9)"; }}
        onMouseLeave={e => { e.currentTarget.style.color = BK_DIM; e.currentTarget.style.background = "rgba(17,15,23,0.72)"; }}
      >
        {isLeft ? "‹" : "›"}
      </button>
    );
  }

  // ────────────────────────────────────────────────────────────
  //  PAGE INDICATOR DOTS
  // ────────────────────────────────────────────────────────────
  function PageDots({ count, current }) {
    return (
      <div style={{
        position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)",
        display: "flex", gap: 8, zIndex: 10
      }}>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} style={{
            width: i === current ? 24 : 8, height: 8,
            borderRadius: 4,
            background: i === current ? BK_ACCENT : BK_FAINT,
            transition: "width 0.3s ease, background 0.3s ease"
          }} />
        ))}
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────
  //  CLOSE BUTTON
  // ────────────────────────────────────────────────────────────
  function CloseBtn({ onClick }) {
    return (
      <button onClick={onClick} style={{
        position: "absolute", top: 16, right: 20,
        background: "rgba(17,15,23,0.72)",
        border: `1px solid ${BK_RULE}`,
        color: BK_DIM, cursor: "pointer",
        width: 36, height: 36, borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 18, zIndex: 20,
        backdropFilter: "blur(8px)",
        transition: "color 0.15s"
      }}
        onMouseEnter={e => { e.currentTarget.style.color = BK_INK; }}
        onMouseLeave={e => { e.currentTarget.style.color = BK_DIM; }}
        title="Close book"
      >
        ✕
      </button>
    );
  }

  // ────────────────────────────────────────────────────────────
  //  MAIN BOOK OVERLAY
  // ────────────────────────────────────────────────────────────
  const SPREADS = [
    { id: "cover",  label: "Cover" },
    { id: "genres", label: "Genre Eras" },
    { id: "hours",  label: "Listening Hours" },
  ];

  function BookOverlay({ onClose }) {
    const [page, setPage]     = useState(0);
    const [visible, setVisible] = useState(false);
    const touchStartX = useRef(null);

    // fade-in on mount
    useEffect(() => {
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }, []);

    const goNext = useCallback(() => setPage(p => Math.min(p + 1, SPREADS.length - 1)), []);
    const goPrev = useCallback(() => setPage(p => Math.max(p - 1, 0)), []);

    // keyboard navigation
    useEffect(() => {
      const handler = (e) => {
        if (e.key === "ArrowRight" || e.key === "PageDown") goNext();
        if (e.key === "ArrowLeft"  || e.key === "PageUp")   goPrev();
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
    }, [goNext, goPrev, onClose]);

    // touch/swipe
    const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
    const onTouchEnd   = (e) => {
      if (touchStartX.current == null) return;
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      if (dx < -40) goNext();
      if (dx >  40) goPrev();
      touchStartX.current = null;
    };

    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: BK_BG,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.35s ease",
        display: "flex", flexDirection: "column"
      }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* The spread area */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden", minHeight: 0 }}>
          {/* Slides — kept in DOM so charts don't remount on back-navigation */}
          {SPREADS.map((s, i) => (
            <div key={s.id} style={{
              position: "absolute", inset: 0,
              opacity: i === page ? 1 : 0,
              pointerEvents: i === page ? "auto" : "none",
              transition: "opacity 0.45s ease"
            }}>
              {i === 0 && <CoverSpread active={i === page} />}
              {i === 1 && <GenreErasSpread active={i === page} />}
              {i === 2 && <RidgeSpread active={i === page} />}
            </div>
          ))}

          <NavArrow dir="left"  onClick={goPrev} visible={page > 0} />
          <NavArrow dir="right" onClick={goNext} visible={page < SPREADS.length - 1} />
          <CloseBtn onClick={onClose} />
          <PageDots count={SPREADS.length} current={page} />
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────
  //  LAUNCH BUTTON (rendered inline in Lab)
  // ────────────────────────────────────────────────────────────
  function BookLaunchButton() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)} style={{
          fontFamily: "var(--mono)", fontSize: 11,
          letterSpacing: ".18em", textTransform: "uppercase",
          background: "transparent",
          border: `1px solid ${BK_ACCENT}`,
          color: BK_ACCENT,
          padding: "10px 22px", borderRadius: 4,
          cursor: "pointer",
          transition: "background 0.15s"
        }}
          onMouseEnter={e => { e.currentTarget.style.background = "oklch(0.74 0.13 330 / 0.12)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
        >
          Open the Book →
        </button>
        {open && (
          <BookOverlay onClose={() => setOpen(false)} />
        )}
      </>
    );
  }

  // ────────────────────────────────────────────────────────────
  //  CSS KEYFRAME INJECTION
  // ────────────────────────────────────────────────────────────
  (function injectCSS() {
    if (document.getElementById("bk-styles")) return;
    const s = document.createElement("style");
    s.id = "bk-styles";
    s.textContent = `
      @keyframes bk-pulse {
        0%,100% { opacity: .35; }
        50%      { opacity:  1;  }
      }
    `;
    document.head.appendChild(s);
  })();

  // ────────────────────────────────────────────────────────────
  //  EXPORTS
  // ────────────────────────────────────────────────────────────
  Object.assign(window, { BookOverlay, BookLaunchButton });
})();
