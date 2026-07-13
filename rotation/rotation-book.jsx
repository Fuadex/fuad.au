// rotation-book.jsx — "Stories as a Book" — physical page-turn pilot
// Uses StPageFlip 2.0.7 (vendor-page-flip.js, window.St) for real page-turn physics.
//
// Chapter / page map:
//   Page 0  — Cover (hard)          : "the listening years" + particle texture
//   Page 1  — Title page            : subtitle, scrobble count, since/hours stats
//   Page 2  — Chapter 1 prose       : Genre Eras narrative
//   Page 3  — Chapter 1 chart       : Stacked-area genre stream (SVG)
//   Page 4  — Chapter 2 chart       : Listening hours ridgeline (SVG)
//   Page 5  — Chapter 2 prose       : Listening Hours narrative
//   Page 6  — Back cover (hard)     : colophon
//
// Exports: window.BookOverlay, window.BookLaunchButton
// Data reads: ROTATION.GENRE_FLOW, ROTATION.CLOCK_BY_YEAR, ROTATION.CLOCK,
//             ROTATION.TOTALS, ROTATION.ERAS, ROTATION.INSIGHTS.TASTE_ERAS

(function () {
  const { useState, useEffect, useRef, useMemo, useCallback } = React;

  // ─── palette ───────────────────────────────────────────────────────────────
  const BK_BG          = "#0b0a0f";
  const BK_STAGE       = "#0e0c14";
  const BK_PAPER       = "#f4f1ea";
  const BK_PAPER_INK   = "#16131c";
  const BK_PAPER_RULE  = "#cbc4ba";
  const BK_INK         = "#f1eef6";
  const BK_DIM         = "#a09bb0";
  const BK_FAINT       = "#665f78";
  const BK_RULE        = "#272235";
  const BK_ACCENT      = "oklch(0.74 0.13 330)";
  const BK_COVER_BG    = "#100d1a";   // slightly warmer dark for cover pages
  const BK_SPINE       = "oklch(0.35 0.10 330)";

  // ─── book dimensions ───────────────────────────────────────────────────────
  // StPageFlip needs fixed pixel dimensions. We scale the wrapper to fit viewport.
  const PAGE_W = 480;
  const PAGE_H = 640;

  // ────────────────────────────────────────────────────────────────────────────
  //  CATMULL-ROM helper (reused from original pilot)
  // ────────────────────────────────────────────────────────────────────────────
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

  // ────────────────────────────────────────────────────────────────────────────
  //  GENRE STREAM CHART  (inline SVG, fits inside a page)
  // ────────────────────────────────────────────────────────────────────────────
  function GenreStreamChart() {
    const R = window.ROTATION;
    const gf = R && R.GENRE_FLOW;
    if (!gf || !gf.years || !gf.families) {
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
          height: "100%", fontFamily: "var(--mono)", fontSize: 11, color: BK_FAINT,
          letterSpacing: ".08em", textAlign: "center", padding: 24 }}>
          GENRE_FLOW not available
        </div>
      );
    }

    const years   = gf.years.map(y => y.year);
    const famData = gf.families;
    const totals  = gf.years.map(yr => yr.fams.reduce((s, v) => s + v, 0) || 1);
    const normRows = gf.years.map((yr, yi) => yr.fams.map(v => v / totals[yi]));
    const active_fams = famData.filter((f, fi) => normRows.some(row => row[fi] > 0.02));

    const W = PAGE_W - 48, H = 280;
    const padX = 20, padTop = 14, padBot = 28;
    const inner_w = W - padX * 2, inner_h = H - padTop - padBot;
    const xAt = (yi) => padX + (years.length <= 1 ? inner_w / 2 : (yi / (years.length - 1)) * inner_w);

    const stacked = {};
    for (const f of active_fams) stacked[f.i] = years.map(() => [0, 0]);
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
      const topPts = rows.map(([x, , y1]) => [x, padTop + (1 - y1) * inner_h]);
      const botPts = rows.map(([x, y0]) => [x, padTop + (1 - y0) * inner_h]);
      const botRev = [...botPts].reverse();
      return `M${topPts[0][0].toFixed(1)} ${topPts[0][1].toFixed(1)}` +
        _segs(topPts) +
        ` L${botRev[0][0].toFixed(1)} ${botRev[0][1].toFixed(1)}` +
        _segs(botRev) + " Z";
    };

    const peakOf = (fi) => {
      let best = 0;
      years.forEach((y, yi) => { if (normRows[yi][fi] > normRows[best][fi]) best = yi; });
      const [x, y0, y1] = stacked[fi][best];
      return { x, yMid: padTop + (1 - (y0 + y1) / 2) * inner_h, height: (y1 - y0) * inner_h };
    };

    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}
        style={{ display: "block" }}>
        {active_fams.map((f) => {
          const col = `oklch(0.60 0.16 ${f.hue})`;
          const colStk = `oklch(0.68 0.14 ${f.hue})`;
          return (
            <path key={f.i} d={areaPath(f.i)}
              fill={col} fillOpacity={0.80}
              stroke={colStk} strokeWidth="0.8" strokeOpacity={0.6} />
          );
        })}
        {active_fams.map((f) => {
          const { x, yMid, height } = peakOf(f.i);
          if (height < 16) return null;
          return (
            <text key={"l" + f.i} x={x} y={yMid}
              textAnchor="middle" dominantBaseline="middle"
              fontFamily="var(--mono)" fontSize={height > 32 ? 9 : 7}
              fontWeight="600" fill="rgba(255,255,255,0.9)" style={{ pointerEvents: "none" }}>
              {f.family.length > 14 ? f.family.slice(0, 12) + "…" : f.family}
            </text>
          );
        })}
        {years.map((y, yi) => (
          (yi % 2 === 0 || yi === years.length - 1) ? (
            <text key={"y" + yi} x={xAt(yi)} y={H - 8}
              textAnchor="middle" fontFamily="var(--mono)" fontSize="8"
              fill={BK_FAINT}>
              {"`" + String(y).slice(2)}
            </text>
          ) : null
        ))}
      </svg>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  //  HOUR RIDGE CHART  (inline SVG, fits inside a page)
  // ────────────────────────────────────────────────────────────────────────────
  function HourRidgeChart() {
    const R = window.ROTATION;
    const cby = R && R.CLOCK_BY_YEAR;
    const clock = R && R.CLOCK;

    if (!cby || !cby.length) {
      // Fallback: single all-time shape
      if (!clock || !clock.length) {
        return (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
            height: 200, fontFamily: "var(--mono)", fontSize: 10, color: BK_FAINT,
            textAlign: "center", padding: 20 }}>
            CLOCK_BY_YEAR loads after first paint
          </div>
        );
      }
      const vals = clock.map(v => typeof v === "object" ? (v.plays || 0) : v);
      const mx   = Math.max(...vals, 1);
      const norm = vals.map(v => v / mx);
      const W = PAGE_W - 48, H = 180;
      const padL = 24, padR = 8, padT = 12, padB = 22;
      const iw = W - padL - padR, ih = H - padT - padB;
      const xAt = (h) => padL + (h / 23) * iw;
      const pts  = norm.map((v, h) => [xAt(h), padT + (1 - v) * ih]);
      const area = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}` + _segs(pts) +
        ` L${pts[pts.length-1][0].toFixed(1)} ${padT + ih} L${pts[0][0].toFixed(1)} ${padT + ih} Z`;
      return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: "block" }}>
          <path d={area} fill="oklch(0.60 0.16 330)" fillOpacity={0.75}
            stroke="oklch(0.72 0.14 330)" strokeWidth="1.2" />
          {[0,6,12,18,23].map(h => (
            <text key={h} x={xAt(h)} y={H - 6} textAnchor="middle"
              fontFamily="var(--mono)" fontSize="8" fill={BK_FAINT}>{h}h</text>
          ))}
          <text x={W/2} y={10} textAnchor="middle" fontFamily="var(--mono)"
            fontSize="9" fill={BK_DIM}>all-time</text>
        </svg>
      );
    }

    const years = cby.map(r => r.year).sort((a, b) => a - b)
      .filter(y => { const row = cby.find(r => r.year === y); return row && row.hours && row.hours.reduce((s, v) => s + v, 0) > 200; });

    if (!years.length) return null;

    const W = PAGE_W - 48;
    const RIDGE_H = 44, PAD_L = 34, PAD_R = 8, PAD_TOP = 12, PAD_BOT = 18;
    const OVERLAP = RIDGE_H * 0.72;
    const totalH = PAD_TOP + years.length * (RIDGE_H * 0.50) + RIDGE_H + PAD_BOT;
    const iw = W - PAD_L - PAD_R;
    const xAt = (h) => PAD_L + (h / 23) * iw;
    const yBase = (yi) => PAD_TOP + yi * (RIDGE_H * 0.50) + RIDGE_H;

    const profiles = years.map(y => {
      const row = cby.find(r => r.year === y);
      const arr = row ? row.hours : new Array(24).fill(0);
      const mx  = Math.max(...arr, 1);
      return arr.map(v => v / mx);
    });

    return (
      <svg viewBox={`0 0 ${W} ${totalH}`} width="100%"
        style={{ display: "block", overflow: "visible" }}>
        {[0, 6, 12, 18, 23].map(h => (
          <text key={h} x={xAt(h)} y={totalH - 2}
            fill={BK_FAINT} fontSize="7.5" fontFamily="var(--mono)" textAnchor="middle">
            {h}h
          </text>
        ))}
        {years.map((y, yi) => {
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
          return (
            <g key={y}>
              <path d={area} fill={fill} />
              <path d={d} fill="none" stroke={col} strokeWidth="1.3" strokeLinejoin="round" />
              <text x={PAD_L - 3} y={yb - 4} fill={col} fontSize="7.5"
                fontFamily="var(--mono)" textAnchor="end">{y}</text>
            </g>
          );
        })}
      </svg>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  //  DATA DERIVATIONS  (same as original pilot — genre narrative + ridge prose)
  // ────────────────────────────────────────────────────────────────────────────
  function useGenreNarrative() {
    return useMemo(() => {
      const R = window.ROTATION;
      if (!R) return [];
      const gf   = R.GENRE_FLOW;
      const tf   = R.INSIGHTS && R.INSIGHTS.TASTE_ERAS;
      const totals = R.TOTALS || {};
      const since  = totals.since ? new Date(totals.since).getUTCFullYear() : 2006;
      const span   = new Date().getUTCFullYear() - since;

      let topFam = null, runnerUp = null;
      if (gf && gf.years && gf.families) {
        const sumByFam = new Array(gf.families.length).fill(0);
        for (const yr of gf.years) yr.fams.forEach((v, fi) => { sumByFam[fi] += v; });
        const grand = sumByFam.reduce((s, v) => s + v, 0) || 1;
        const ranked = gf.families.map((f, fi) => ({ ...f, share: sumByFam[fi] / grand }))
          .sort((a, b) => b.share - a.share);
        topFam = ranked[0]; runnerUp = ranked[1];
      }
      const chapters    = tf && tf.chapters;
      const firstChapter  = chapters && chapters[0];
      const latestChapter = chapters && chapters[chapters.length - 1];

      const paras = [];
      paras.push(
        `${span} years. That's how long this library has been accumulating — since ${since}, ` +
        `one scrobble at a time, until ${(totals.scrobbles || 0).toLocaleString("en-US")} plays ` +
        `settled into the data like sediment.`
      );
      if (topFam && runnerUp) {
        const topPct = Math.round(topFam.share  * 100);
        const runPct = Math.round(runnerUp.share * 100);
        paras.push(
          `${topFam.family} has been the gravitational centre — roughly ${topPct}% of genre-weighted ` +
          `plays — with ${runnerUp.family} pulling in at ${runPct}%. The balance has shifted across ` +
          `eras, each genre cresting and receding like tides.`
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
      }
      return paras;
    }, []);
  }

  function useRidgeNarrative() {
    return useMemo(() => {
      const R = window.ROTATION;
      if (!R) return [];
      const clock  = R.CLOCK;
      const cby    = R.CLOCK_BY_YEAR;
      const totals = R.TOTALS || {};

      let peakHour = 22;
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
        `${(totals.scrobbles || 0).toLocaleString("en-US")} scrobbles ` +
        `have recorded it faithfully: the peak falls at ${peakHour}:00, ${peakLabel}.`
      ];
      if (cby && cby.length > 3) {
        paras.push(
          `Each ridge is a single year — the shape of how its hours were spent. ` +
          `Some years have sharp peaks, others sprawl across the day.`
        );
        paras.push(
          `Late-night spikes are the giveaway of deep listening sessions — ` +
          `the kind where a single album plays twice because no one turned it off.`
        );
      }
      return paras;
    }, []);
  }

  // ────────────────────────────────────────────────────────────────────────────
  //  PAGE CONTENT COMPONENTS  (render into fixed-size page divs)
  // ────────────────────────────────────────────────────────────────────────────
  function PageContent_Cover() {
    const R = window.ROTATION;
    const since = R && R.TOTALS && R.TOTALS.since
      ? new Date(R.TOTALS.since).getUTCFullYear() : 2006;
    const scrobbles = R && R.TOTALS && R.TOTALS.scrobbles
      ? R.TOTALS.scrobbles.toLocaleString("en-US") : "319,000+";

    return (
      <div style={{
        width: "100%", height: "100%", background: BK_COVER_BG,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "48px 40px", textAlign: "center", gap: 0,
        boxSizing: "border-box", position: "relative", overflow: "hidden"
      }}>
        {/* embossed border inset */}
        <div style={{
          position: "absolute", inset: 18,
          border: `1px solid oklch(0.38 0.10 330 / 0.55)`,
          borderRadius: 2, pointerEvents: "none"
        }} />
        <div style={{
          position: "absolute", inset: 22,
          border: `1px solid oklch(0.28 0.08 330 / 0.35)`,
          borderRadius: 1, pointerEvents: "none"
        }} />

        {/* kicker */}
        <div style={{
          fontFamily: "var(--mono)", fontSize: 9, letterSpacing: ".34em",
          textTransform: "uppercase", color: BK_FAINT, marginBottom: 36,
          position: "relative", zIndex: 1
        }}>fuad.au · a personal archive</div>

        {/* title */}
        <div style={{
          fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 600,
          fontSize: 52, letterSpacing: "-.03em", lineHeight: 1.1,
          color: BK_INK, position: "relative", zIndex: 1
        }}>
          the listening<br />
          <span style={{ color: BK_ACCENT }}>years</span>
        </div>

        {/* rule */}
        <div style={{
          width: 48, height: 2,
          background: `linear-gradient(90deg, transparent, ${BK_ACCENT}, transparent)`,
          margin: "32px auto", position: "relative", zIndex: 1
        }} />

        {/* subtitle */}
        <div style={{
          fontFamily: "var(--serif)", fontStyle: "italic",
          fontSize: 15, color: BK_DIM, lineHeight: 1.6,
          position: "relative", zIndex: 1
        }}>
          {scrobbles} plays<br />
          {since} to today
        </div>

        {/* open affordance */}
        <div style={{
          position: "absolute", bottom: 44, left: 0, right: 0, textAlign: "center",
          fontFamily: "var(--mono)", fontSize: 9, letterSpacing: ".22em",
          textTransform: "uppercase", color: BK_FAINT, zIndex: 1,
          animation: "bk-pulse 2.4s ease-in-out infinite"
        }}>open the cover →</div>

        {/* spine shadow on the right edge */}
        <div style={{
          position: "absolute", top: 0, right: 0, bottom: 0, width: 20,
          background: "linear-gradient(to left, rgba(0,0,0,0.45), transparent)",
          pointerEvents: "none"
        }} />
      </div>
    );
  }

  function PageContent_Title() {
    const R = window.ROTATION;
    const totals = (R && R.TOTALS) || {};
    const since = totals.since ? new Date(totals.since).getUTCFullYear() : 2006;
    const hours = totals.exactHours ? Math.round(totals.exactHours).toLocaleString("en-US") : null;
    const scrobbles = totals.scrobbles ? totals.scrobbles.toLocaleString("en-US") : "—";

    return (
      <div style={{
        width: "100%", height: "100%", background: BK_PAPER,
        display: "flex", flexDirection: "column", justifyContent: "center",
        padding: "56px 48px", boxSizing: "border-box"
      }}>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 9, letterSpacing: ".28em",
          textTransform: "uppercase", color: BK_PAPER_RULE, marginBottom: 28
        }}>fuad.au · listening archive</div>

        <div style={{
          fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 600,
          fontSize: 42, letterSpacing: "-.02em", lineHeight: 1.1,
          color: BK_PAPER_INK, marginBottom: 32
        }}>
          the listening<br />
          <span style={{ color: "oklch(0.48 0.15 330)" }}>years</span>
        </div>

        <div style={{
          width: 36, height: 1.5, background: BK_PAPER_RULE, marginBottom: 36
        }} />

        <div style={{
          display: "flex", flexDirection: "column", gap: 14,
          fontFamily: "var(--serif)", fontSize: 14, color: BK_PAPER_INK, lineHeight: 1.7
        }}>
          <div><span style={{ color: BK_PAPER_RULE, fontFamily: "var(--mono)", fontSize: 9, letterSpacing: ".14em", textTransform: "uppercase" }}>plays</span><br />
            <strong>{scrobbles}</strong></div>
          <div><span style={{ color: BK_PAPER_RULE, fontFamily: "var(--mono)", fontSize: 9, letterSpacing: ".14em", textTransform: "uppercase" }}>years active</span><br />
            <strong>{since} – today</strong></div>
          {hours && <div><span style={{ color: BK_PAPER_RULE, fontFamily: "var(--mono)", fontSize: 9, letterSpacing: ".14em", textTransform: "uppercase" }}>hours</span><br />
            <strong>{hours}</strong></div>}
        </div>

        <div style={{
          marginTop: "auto",
          fontFamily: "var(--mono)", fontSize: 8.5, color: BK_PAPER_RULE,
          lineHeight: 1.6, letterSpacing: ".06em"
        }}>
          last.fm user: fuadex<br />
          source: {scrobbles} scrobbles · real data
        </div>
      </div>
    );
  }

  function PageContent_GenreProse() {
    const paras = useGenreNarrative();
    return (
      <div style={{
        width: "100%", height: "100%", background: BK_PAPER,
        display: "flex", flexDirection: "column",
        padding: "44px 40px 36px", boxSizing: "border-box", overflowY: "hidden"
      }}>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 8.5, letterSpacing: ".28em",
          textTransform: "uppercase", color: BK_PAPER_RULE, marginBottom: 16
        }}>Chapter I · Genre Eras</div>

        <div style={{
          fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 600,
          fontSize: 28, lineHeight: 1.2, letterSpacing: "-.02em",
          color: BK_PAPER_INK, marginBottom: 20
        }}>How the sound shifted</div>

        <div style={{
          width: 32, height: 1.5, background: BK_PAPER_RULE, marginBottom: 24
        }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1, overflow: "hidden" }}>
          {paras.map((p, i) => (
            <p key={i} style={{
              margin: 0, fontFamily: "var(--serif)",
              fontSize: 13.5, lineHeight: 1.72,
              color: i === 0 ? BK_PAPER_INK : "#3d3830",
              fontWeight: i === 0 ? 500 : 400
            }}>{p}</p>
          ))}
        </div>

        <div style={{
          marginTop: "auto", paddingTop: 18,
          fontFamily: "var(--mono)", fontSize: 7.5, color: BK_PAPER_RULE,
          letterSpacing: ".08em"
        }}>→ see chart on facing page</div>
      </div>
    );
  }

  function PageContent_GenreChart() {
    return (
      <div style={{
        width: "100%", height: "100%", background: BK_BG,
        display: "flex", flexDirection: "column",
        padding: "32px 24px 24px", boxSizing: "border-box"
      }}>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 8.5, letterSpacing: ".22em",
          textTransform: "uppercase", color: BK_FAINT, marginBottom: 16
        }}>genre families · share of plays per year</div>

        <div style={{ flex: 1, display: "flex", alignItems: "center", minHeight: 0 }}>
          <GenreStreamChart />
        </div>

        <div style={{
          fontFamily: "var(--mono)", fontSize: 7.5, color: BK_FAINT,
          lineHeight: 1.5, letterSpacing: ".06em"
        }}>
          Data: ROTATION.GENRE_FLOW · each year normalised<br />
          families via last.fm tags + Discogs
        </div>
      </div>
    );
  }

  function PageContent_RidgeChart() {
    return (
      <div style={{
        width: "100%", height: "100%", background: BK_BG,
        display: "flex", flexDirection: "column",
        padding: "32px 24px 24px", boxSizing: "border-box"
      }}>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 8.5, letterSpacing: ".22em",
          textTransform: "uppercase", color: BK_FAINT, marginBottom: 16
        }}>hour of day · ridgeline by year</div>

        <div style={{ flex: 1, display: "flex", alignItems: "center", minHeight: 0 }}>
          <HourRidgeChart />
        </div>

        <div style={{
          fontFamily: "var(--mono)", fontSize: 7.5, color: BK_FAINT,
          lineHeight: 1.5, letterSpacing: ".06em"
        }}>
          Data: ROTATION.CLOCK_BY_YEAR · each year normalised · 24-hour local time
        </div>
      </div>
    );
  }

  function PageContent_RidgeProse() {
    const paras = useRidgeNarrative();
    return (
      <div style={{
        width: "100%", height: "100%", background: BK_PAPER,
        display: "flex", flexDirection: "column",
        padding: "44px 40px 36px", boxSizing: "border-box", overflowY: "hidden"
      }}>
        <div style={{
          fontFamily: "var(--mono)", fontSize: 8.5, letterSpacing: ".28em",
          textTransform: "uppercase", color: BK_PAPER_RULE, marginBottom: 16
        }}>Chapter II · Listening Hours</div>

        <div style={{
          fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 600,
          fontSize: 28, lineHeight: 1.2, letterSpacing: "-.02em",
          color: BK_PAPER_INK, marginBottom: 20
        }}>When the music plays</div>

        <div style={{
          width: 32, height: 1.5, background: BK_PAPER_RULE, marginBottom: 24
        }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1, overflow: "hidden" }}>
          {paras.map((p, i) => (
            <p key={i} style={{
              margin: 0, fontFamily: "var(--serif)",
              fontSize: 13.5, lineHeight: 1.72,
              color: i === 0 ? BK_PAPER_INK : "#3d3830",
              fontWeight: i === 0 ? 500 : 400
            }}>{p}</p>
          ))}
        </div>

        <div style={{
          marginTop: "auto", paddingTop: 18,
          fontFamily: "var(--mono)", fontSize: 7.5, color: BK_PAPER_RULE,
          letterSpacing: ".08em"
        }}>← see ridgeline on facing page</div>
      </div>
    );
  }

  function PageContent_BackCover() {
    const R = window.ROTATION;
    const totals = (R && R.TOTALS) || {};
    const scrobbles = totals.scrobbles ? totals.scrobbles.toLocaleString("en-US") : "319,000+";

    return (
      <div style={{
        width: "100%", height: "100%", background: BK_COVER_BG,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "48px 40px", textAlign: "center",
        boxSizing: "border-box", position: "relative"
      }}>
        <div style={{
          position: "absolute", inset: 18,
          border: `1px solid oklch(0.38 0.10 330 / 0.45)`,
          borderRadius: 2, pointerEvents: "none"
        }} />

        <div style={{
          fontFamily: "var(--serif)", fontStyle: "italic",
          fontSize: 15, color: BK_DIM, lineHeight: 1.8,
          position: "relative", zIndex: 1, maxWidth: 280
        }}>
          {scrobbles} plays. Twenty years of a musical life, recorded one track at a time.
        </div>

        <div style={{
          margin: "32px 0",
          width: 40, height: 1.5,
          background: `linear-gradient(90deg, transparent, ${BK_ACCENT}, transparent)`,
          position: "relative", zIndex: 1
        }} />

        <div style={{
          fontFamily: "var(--mono)", fontSize: 8.5, color: BK_FAINT,
          lineHeight: 1.8, letterSpacing: ".1em",
          textTransform: "uppercase", position: "relative", zIndex: 1
        }}>
          fuad.au<br />
          last.fm / fuadex<br />
          built with real data
        </div>

        {/* spine highlight on left */}
        <div style={{
          position: "absolute", top: 0, left: 0, bottom: 0, width: 20,
          background: "linear-gradient(to right, rgba(0,0,0,0.5), transparent)",
          pointerEvents: "none"
        }} />
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  //  CHAPTER BREADCRUMB RAIL  (left of the stage)
  // ────────────────────────────────────────────────────────────────────────────
  //  Chapter → first page index mapping (StPageFlip 0-based)
  const CHAPTERS = [
    { label: "Cover",            page: 0 },
    { label: "I · Genre Eras",   page: 2 },
    { label: "II · Hours",       page: 4 },
  ];

  // Which chapter is active given a page index?
  function activeChapter(pageIdx) {
    let ch = 0;
    for (let i = 0; i < CHAPTERS.length; i++) {
      if (pageIdx >= CHAPTERS[i].page) ch = i;
    }
    return ch;
  }

  function ChapterRail({ currentPage, onChapterClick }) {
    const active = activeChapter(currentPage);
    return (
      <div style={{
        position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
        display: "flex", flexDirection: "column", gap: 6,
        padding: "12px 8px", zIndex: 20
      }}>
        {CHAPTERS.map((ch, i) => (
          <button key={i} onClick={() => onChapterClick(ch.page)} style={{
            background: "none", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 8, padding: "6px 4px"
          }}>
            <div style={{
              width: i === active ? 24 : 12,
              height: 2,
              background: i === active ? BK_ACCENT : BK_FAINT,
              transition: "width 0.3s ease, background 0.3s ease",
              flexShrink: 0
            }} />
            <span style={{
              fontFamily: "var(--mono)", fontSize: 9, letterSpacing: ".14em",
              textTransform: "uppercase",
              color: i === active ? BK_ACCENT : BK_FAINT,
              transition: "color 0.2s ease",
              whiteSpace: "nowrap",
              opacity: i === active ? 1 : 0.7
            }}>{ch.label}</span>
          </button>
        ))}
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  //  CLOSED BOOK  (the resting state before user opens it)
  // ────────────────────────────────────────────────────────────────────────────
  function ClosedBook({ onClick }) {
    const R = window.ROTATION;
    const since = R && R.TOTALS && R.TOTALS.since
      ? new Date(R.TOTALS.since).getUTCFullYear() : 2006;

    // The closed book is just the cover page visual at reduced size with a shadow
    return (
      <div onClick={onClick} style={{
        cursor: "pointer",
        width: PAGE_W,
        height: PAGE_H,
        position: "relative",
        // Drop shadow to simulate resting on a surface
        filter: "drop-shadow(0 32px 48px rgba(0,0,0,0.85)) drop-shadow(0 8px 16px rgba(0,0,0,0.6))",
        transition: "transform 0.15s ease",
      }}
        onMouseEnter={e => e.currentTarget.style.transform = "translateY(-4px)"}
        onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
      >
        {/* Cover face */}
        <div style={{
          width: "100%", height: "100%",
          background: BK_COVER_BG,
          borderRadius: "2px 6px 6px 2px",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          textAlign: "center", padding: "40px 36px",
          boxSizing: "border-box", position: "relative", overflow: "hidden"
        }}>
          {/* embossed border */}
          <div style={{
            position: "absolute", inset: 16,
            border: `1px solid oklch(0.38 0.10 330 / 0.55)`,
            borderRadius: 2, pointerEvents: "none"
          }} />
          <div style={{
            position: "absolute", inset: 20,
            border: `1px solid oklch(0.28 0.08 330 / 0.30)`,
            borderRadius: 1, pointerEvents: "none"
          }} />

          <div style={{
            fontFamily: "var(--mono)", fontSize: 8, letterSpacing: ".30em",
            textTransform: "uppercase", color: BK_FAINT, marginBottom: 28,
            position: "relative", zIndex: 1
          }}>fuad.au · a personal archive</div>

          <div style={{
            fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 600,
            fontSize: 44, letterSpacing: "-.03em", lineHeight: 1.1,
            color: BK_INK, position: "relative", zIndex: 1
          }}>
            the<br />listening<br />
            <span style={{ color: BK_ACCENT }}>years</span>
          </div>

          <div style={{
            width: 40, height: 2,
            background: `linear-gradient(90deg, transparent, ${BK_ACCENT}, transparent)`,
            margin: "24px auto", position: "relative", zIndex: 1
          }} />

          <div style={{
            fontFamily: "var(--serif)", fontStyle: "italic",
            fontSize: 12, color: BK_DIM, lineHeight: 1.6,
            position: "relative", zIndex: 1
          }}>{since} – today</div>

          <div style={{
            position: "absolute", bottom: 32, left: 0, right: 0, textAlign: "center",
            fontFamily: "var(--mono)", fontSize: 8, letterSpacing: ".20em",
            textTransform: "uppercase", color: BK_FAINT, zIndex: 1,
            animation: "bk-pulse 2.4s ease-in-out infinite"
          }}>click to open</div>

          {/* spine shadow right edge */}
          <div style={{
            position: "absolute", top: 0, right: 0, bottom: 0, width: 18,
            background: "linear-gradient(to left, rgba(0,0,0,0.5), transparent)",
            pointerEvents: "none"
          }} />
        </div>

        {/* Spine on left */}
        <div style={{
          position: "absolute", top: 0, left: -14, bottom: 0, width: 14,
          background: `linear-gradient(to right, ${BK_SPINE}, oklch(0.28 0.08 330))`,
          borderRadius: "4px 0 0 4px",
          boxShadow: "-4px 0 12px rgba(0,0,0,0.5)"
        }} />

        {/* Surface shadow (book resting on table) */}
        <div style={{
          position: "absolute", bottom: -28, left: "5%", right: "5%", height: 28,
          background: "radial-gradient(ellipse at 50% 0%, rgba(0,0,0,0.5) 0%, transparent 80%)",
          pointerEvents: "none"
        }} />
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  //  VENDOR LOADER
  // ────────────────────────────────────────────────────────────────────────────
  function loadVendor(cb) {
    if (window.St && window.St.PageFlip) { cb(); return; }
    const existing = document.getElementById("vendor-page-flip-js");
    if (existing) {
      // already loading — poll
      const poll = setInterval(() => {
        if (window.St && window.St.PageFlip) { clearInterval(poll); cb(); }
      }, 60);
      return;
    }
    const s = document.createElement("script");
    s.id = "vendor-page-flip-js";
    s.src = "vendor-page-flip.js";
    s.onload = () => cb();
    s.onerror = () => console.error("[BookOverlay] vendor-page-flip.js failed to load");
    document.head.appendChild(s);
  }

  // ────────────────────────────────────────────────────────────────────────────
  //  BOOK OPEN  (StPageFlip-powered)
  // ────────────────────────────────────────────────────────────────────────────
  // Number of pages:  7  (pages 0-6 as described in the module header)
  const PAGE_COUNT = 7;

  // data-density attr drives StPageFlip "hard" cover behaviour
  // page 0 (cover) and page 6 (back cover) are "hard"
  const PAGE_DENSITIES = ["hard", "soft", "soft", "soft", "soft", "soft", "hard"];

  function BookOpen({ onClose }) {
    const containerRef  = useRef(null);  // the .stf__parent wrapper
    const pageFlipRef   = useRef(null);  // the StPageFlip instance
    const [currentPage, setCurrentPage] = useState(0);
    const [vendorReady, setVendorReady] = useState(!!(window.St && window.St.PageFlip));

    // ── scale the outer wrapper to fit the viewport ──────────────────────────
    const [scale, setScale] = useState(1);

    function calcScale() {
      // book spread = 2×PAGE_W wide, PAGE_H tall; plus 200px rail on left
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const railW = 140;  // left breadcrumb rail
      const padH  = 80;   // top+bottom padding on stage
      const availW = vw - railW - 40;
      const availH = vh - padH;
      const scaleW = availW / (PAGE_W * 2);
      const scaleH = availH / PAGE_H;
      setScale(Math.min(scaleW, scaleH, 1.0));
    }

    useEffect(() => {
      calcScale();
      window.addEventListener("resize", calcScale);
      return () => window.removeEventListener("resize", calcScale);
    }, []);

    // ── load vendor then init PageFlip ────────────────────────────────────────
    useEffect(() => {
      if (vendorReady) return;
      loadVendor(() => setVendorReady(true));
    }, []);

    useEffect(() => {
      if (!vendorReady) return;
      if (!containerRef.current) return;

      // StPageFlip requires all page elements to be in the DOM at init time.
      // They are already rendered (visibility:hidden) as children of containerRef.
      const pageEls = Array.from(containerRef.current.querySelectorAll(".book-page"));
      if (pageEls.length !== PAGE_COUNT) return;

      const pf = new window.St.PageFlip(containerRef.current, {
        width:  PAGE_W,
        height: PAGE_H,
        size:  "fixed",
        maxShadowOpacity: 0.5,
        showCover: true,         // page 0 and last page get hard-cover treatment
        useMouseEvents: true,
        mobileScrollSupport: false,
        flippingTime: 700,
        startZIndex: 10,
        drawShadow: true,
        showPageCorners: true,
        disableFlipByClick: false,
      });

      pf.loadFromHTML(pageEls);

      pf.on("flip", (e) => {
        setCurrentPage(e.data);
      });

      pageFlipRef.current = pf;

      return () => {
        if (pageFlipRef.current) {
          try { pageFlipRef.current.destroy(); } catch (_) {}
          pageFlipRef.current = null;
        }
      };
    }, [vendorReady]);

    // ── keyboard nav ─────────────────────────────────────────────────────────
    useEffect(() => {
      const handler = (e) => {
        if (e.key === "ArrowRight" || e.key === "PageDown") {
          pageFlipRef.current && pageFlipRef.current.flipNext();
        }
        if (e.key === "ArrowLeft" || e.key === "PageUp") {
          pageFlipRef.current && pageFlipRef.current.flipPrev();
        }
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
    }, [onClose]);

    // ── chapter rail click ────────────────────────────────────────────────────
    const handleChapterClick = useCallback((pageIdx) => {
      if (pageFlipRef.current) pageFlipRef.current.turnToPage(pageIdx);
    }, []);

    // ── page dimensions for the stf__parent element ───────────────────────────
    // StPageFlip reads offsetWidth/offsetHeight, so we set it explicitly.
    // The containing div uses transform scale, but the stf__parent must be at natural size.
    const bookNaturalW = PAGE_W * 2;   // landscape spread
    const bookNaturalH = PAGE_H;

    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: BK_STAGE,
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        {/* Close button */}
        <button onClick={onClose} style={{
          position: "absolute", top: 16, right: 20,
          background: "rgba(17,15,23,0.80)",
          border: `1px solid ${BK_RULE}`,
          color: BK_DIM, cursor: "pointer",
          width: 36, height: 36, borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, zIndex: 30,
          backdropFilter: "blur(8px)"
        }}
          onMouseEnter={e => { e.currentTarget.style.color = BK_INK; }}
          onMouseLeave={e => { e.currentTarget.style.color = BK_DIM; }}
          title="Close book (Esc)"
        >✕</button>

        {/* Esc hint */}
        <div style={{
          position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)",
          fontFamily: "var(--mono)", fontSize: 8.5, letterSpacing: ".18em",
          textTransform: "uppercase", color: BK_FAINT, zIndex: 30, pointerEvents: "none"
        }}>← → to turn pages · Esc to close</div>

        {/* Left chapter rail */}
        <ChapterRail currentPage={currentPage} onChapterClick={handleChapterClick} />

        {/* Book wrapper — scaled to fit */}
        <div style={{
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          position: "relative"
        }}>
          {/* stf__parent — must be at natural book dimensions */}
          <div
            ref={containerRef}
            style={{
              width:  bookNaturalW,
              height: bookNaturalH,
              position: "relative"
            }}
          >
            {/*
              All 7 pages rendered as hidden divs BEFORE loadFromHTML.
              StPageFlip will reveal/position them itself via CSS.
              We use visibility:hidden (not display:none) so they have layout.
              data-density drives cover hardness.
            */}
            {[0,1,2,3,4,5,6].map(i => (
              <div key={i} className="book-page" data-density={PAGE_DENSITIES[i]}
                style={{
                  width: PAGE_W, height: PAGE_H,
                  position: "absolute", top: 0, left: 0,
                  // StPageFlip overrides display/position/transform; we just need them in DOM
                  overflow: "hidden", boxSizing: "border-box"
                }}>
                {i === 0 && <PageContent_Cover />}
                {i === 1 && <PageContent_Title />}
                {i === 2 && <PageContent_GenreProse />}
                {i === 3 && <PageContent_GenreChart />}
                {i === 4 && <PageContent_RidgeChart />}
                {i === 5 && <PageContent_RidgeProse />}
                {i === 6 && <PageContent_BackCover />}
              </div>
            ))}
          </div>
        </div>

        {/* Page number indicator */}
        <div style={{
          position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)",
          fontFamily: "var(--mono)", fontSize: 9, color: BK_FAINT,
          letterSpacing: ".14em", zIndex: 30
        }}>
          {currentPage + 1} / {PAGE_COUNT}
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  //  MAIN BOOK OVERLAY  (closed book → zoom → open book)
  // ────────────────────────────────────────────────────────────────────────────
  function BookOverlay({ onClose }) {
    const [phase, setPhase] = useState("closed");
    // phase: "closed" | "zooming" | "open" | "closing"

    const openBook = useCallback(() => {
      setPhase("zooming");
      // After the zoom-in CSS transition, switch to the PageFlip view
      setTimeout(() => setPhase("open"), 520);
    }, []);

    const closeBook = useCallback(() => {
      setPhase("closing");
      setTimeout(() => onClose(), 420);
    }, [onClose]);

    // Escape handler at overlay level (closed phase)
    useEffect(() => {
      if (phase !== "closed" && phase !== "zooming") return;
      const h = (e) => { if (e.key === "Escape") onClose(); };
      window.addEventListener("keydown", h);
      return () => window.removeEventListener("keydown", h);
    }, [phase, onClose]);

    // Closed phase — dark stage with centered closed book
    if (phase === "open") {
      return <BookOpen onClose={closeBook} />;
    }

    const isClosing = phase === "closing";
    const isZooming = phase === "zooming";

    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: BK_STAGE,
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: isClosing ? 0 : 1,
        transition: "opacity 0.4s ease"
      }}>
        {/* subtle surface below the book */}
        <div style={{
          position: "absolute", bottom: "25%", left: "10%", right: "10%", height: 2,
          background: `radial-gradient(ellipse at 50% 50%, oklch(0.30 0.08 330 / 0.35) 0%, transparent 70%)`,
          pointerEvents: "none"
        }} />

        <div style={{
          transform: isZooming ? "scale(1.18)" : "scale(1)",
          transition: "transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
          opacity: isZooming ? 0 : 1
        }}>
          <ClosedBook onClick={openBook} />
        </div>

        {/* Close affordance */}
        <button onClick={onClose} style={{
          position: "absolute", top: 16, right: 20,
          background: "rgba(17,15,23,0.70)",
          border: `1px solid ${BK_RULE}`,
          color: BK_FAINT, cursor: "pointer",
          width: 36, height: 36, borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, zIndex: 20, backdropFilter: "blur(8px)"
        }}>✕</button>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  //  LAUNCH BUTTON  (rendered inside Lab card)
  // ────────────────────────────────────────────────────────────────────────────
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
        {open && <BookOverlay onClose={() => setOpen(false)} />}
      </>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  //  CSS INJECTION
  // ────────────────────────────────────────────────────────────────────────────
  (function injectCSS() {
    if (document.getElementById("bk-styles")) return;
    const s = document.createElement("style");
    s.id = "bk-styles";
    s.textContent = `
      @keyframes bk-pulse {
        0%,100% { opacity: .35; }
        50%      { opacity:  1;  }
      }
      /* StPageFlip injects its own .stf__parent / .stf__block / .stf__item CSS via vendor */
    `;
    document.head.appendChild(s);
  })();

  // ────────────────────────────────────────────────────────────────────────────
  //  EXPORTS
  // ────────────────────────────────────────────────────────────────────────────
  Object.assign(window, { BookOverlay, BookLaunchButton });
})();
