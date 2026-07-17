// rotation-book.jsx — "Stories as a Book" v4
// StPageFlip 2.0.7 (vendor-page-flip.js, window.St.PageFlip)
//
// Chapter / page map — MAIN CHAPTERS ONLY (shorter atmospheric spreads).
// The book is a FOREFRONT, not the whole content.  Elaborate sections are
// rendered BELOW the stage in normal page flow.
//
//   Page  0  — Front Cover (hard)
//   Page  1  — Title / endpaper (soft, paper)
//   Page  2  — Ch I prose  : Genre Eras (soft, paper)
//   Page  3  — Ch I chart  : Genre stream (soft, dark)
//   Page  4  — Ch II chart : Hour ridgeline (soft, dark)
//   Page  5  — Ch II prose : Listening Hours (soft, paper)
//   Page  6  — Ch III prose: Artist Eras (soft, paper)
//   Page  7  — Ch III chart: Artist bump (soft, dark)
//   Page  8  — Ch IV chart : Milestones (soft, dark)
//   Page  9  — Ch IV prose : Milestones & Streaks (soft, paper)
//   Page 10  — Ch V prose  : Taste Chapters (soft, paper)
//   Page 11  — Ch V chart  : Taste chapter timeline (soft, dark)
//   Page 12  — Colophon (soft, dark)
//   Page 13  — Blank endpaper (soft, paper) — pads to even inner count
//   Page 14  — Rear endpaper (soft, dark)
//   Page 15  — Back Cover (hard)
//
// Two-page spread mode: usePortrait:false, size:"fixed", width = ONE page width.
// On narrow screens (< 700px) switches to portrait single-page mode.
//
// Architecture:
//   BookSection = <stage> + <elaborate sections> in normal page flow.
//   Each spread carries a "read the full chapter ↓" link → the matching #bk-ch-N below.
//   Each elaborate section has a "back to the book ↑" link.
//
// Bug fixes vs v3:
//   1. Scale computed from ResizeObserver on stage — fills ~80% stage width at 4K.
//   2. Dark parchment paper pages (not bright white).
//   3. Annotations target computed from the rendered stf__parent bounding box.
//   4. pointer-events: none on annotation SVG; stage wrapper does not intercept.
//   5. Chapter rail rendered outside any transformed ancestor (untransformed page space).
//
// Exports: window.BookSection, window.BookLaunchButton (legacy compat)
// Data: ROTATION.GENRE_FLOW, CLOCK_BY_YEAR, CLOCK, TOTALS, ERAS, ARTISTS,
//       INSIGHTS.TASTE_ERAS, INSIGHTS.MILESTONES, INSIGHTS.YEAR_PEAKS

(function () {
  const { useState, useEffect, useRef, useMemo, useCallback } = React;

  // ─── palette ───────────────────────────────────────────────────────────────
  const BK_BG        = "#0b0a0f";
  const BK_STAGE     = "#0e0c14";
  // v4: dark parchment — warm dark, readable ink, not bright
  const BK_PAPER     = "#1e1a14";   // dark warm parchment (was #f4f1ea)
  const BK_PAPER_INK = "#d4cebc";   // warm cream text on dark parchment
  const BK_PAPER_RULE= "#3a3228";   // subtle rule on dark parchment
  const BK_INK       = "var(--ink, #f1eef6)";
  const BK_DIM       = "#a09bb0";
  const BK_FAINT     = "#665f78";
  const BK_RULE      = "#272235";
  const BK_ACCENT    = "oklch(0.74 0.13 330)";
  const BK_COVER_BG  = "#100d1a";
  const BK_SPINE     = "oklch(0.35 0.10 330)";

  // ─── book dimensions ───────────────────────────────────────────────────────
  const PAGE_W = 500;
  const PAGE_H = 660;
  const PAGE_COUNT = 16;   // v4: 16 pages (0–15, inner pages 1–14 = 14, even)

  const PAGE_DENSITIES = Array.from({ length: PAGE_COUNT }, (_, i) =>
    i === 0 || i === PAGE_COUNT - 1 ? "hard" : "soft"
  );

  // portrait breakpoint
  const PORTRAIT_BP = 700; // px — stage narrower than this → single page mode

  // ─── Catmull-Rom spline helper ─────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────────
  //  CHARTS (unchanged data derivations from v3)
  // ─────────────────────────────────────────────────────────────────────────────

  function GenreStreamChart({ W: CW, H: CH }) {
    const W = CW || PAGE_W - 32;
    const H = CH || 300;
    const R = window.ROTATION;
    const gf = R && R.GENRE_FLOW;
    if (!gf || !gf.years || !gf.families) {
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
          height: H, fontFamily: "var(--mono)", fontSize: 11, color: BK_FAINT,
          letterSpacing: ".08em", textAlign: "center", padding: 24 }}>
          GENRE_FLOW not available
        </div>
      );
    }
    const years    = gf.years.map(y => y.year);
    const famData  = gf.families;
    const totals   = gf.years.map(yr => yr.fams.reduce((s, v) => s + v, 0) || 1);
    const normRows = gf.years.map((yr, yi) => yr.fams.map(v => v / totals[yi]));
    const active   = famData.filter((f, fi) => normRows.some(row => row[fi] > 0.02));

    const padX = 16, padTop = 14, padBot = 24;
    const iw = W - padX * 2, ih = H - padTop - padBot;
    const xAt = yi => padX + (years.length <= 1 ? iw / 2 : (yi / (years.length - 1)) * iw);

    const stacked = {};
    for (const f of active) stacked[f.i] = years.map(() => [0, 0, 0]);
    years.forEach((y, yi) => {
      let acc = 0;
      for (const f of active) {
        const v = normRows[yi][f.i];
        stacked[f.i][yi] = [xAt(yi), acc, acc + v];
        acc += v;
      }
    });

    const areaPath = fi => {
      const rows = stacked[fi];
      const topPts = rows.map(([x, , y1]) => [x, padTop + (1 - y1) * ih]);
      const botPts = rows.map(([x, y0]) => [x, padTop + (1 - y0) * ih]);
      const botRev = [...botPts].reverse();
      return `M${topPts[0][0].toFixed(1)} ${topPts[0][1].toFixed(1)}` +
        _segs(topPts) +
        ` L${botRev[0][0].toFixed(1)} ${botRev[0][1].toFixed(1)}` +
        _segs(botRev) + " Z";
    };

    const peakOf = fi => {
      let best = 0;
      years.forEach((y, yi) => { if (normRows[yi][fi] > normRows[best][fi]) best = yi; });
      const [x, y0, y1] = stacked[fi][best];
      return { x, yMid: padTop + (1 - (y0 + y1) / 2) * ih, height: (y1 - y0) * ih };
    };

    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: "block" }}>
        {active.map(f => {
          const col  = `oklch(0.60 0.16 ${f.hue})`;
          const strk = `oklch(0.68 0.14 ${f.hue})`;
          return <path key={f.i} d={areaPath(f.i)} fill={col} fillOpacity={0.82}
            stroke={strk} strokeWidth="0.8" strokeOpacity={0.6} />;
        })}
        {active.map(f => {
          const { x, yMid, height } = peakOf(f.i);
          if (height < 14) return null;
          return (
            <text key={"l" + f.i} x={x} y={yMid} textAnchor="middle"
              dominantBaseline="middle"
              fontFamily="var(--mono)" fontSize={height > 30 ? 9 : 7}
              fontWeight="600" fill="rgba(255,255,255,0.9)" style={{ pointerEvents: "none" }}>
              {f.family.length > 14 ? f.family.slice(0, 12) + "…" : f.family}
            </text>
          );
        })}
        {years.map((y, yi) => (
          (yi % 2 === 0 || yi === years.length - 1) ? (
            <text key={"y" + yi} x={xAt(yi)} y={H - 6} textAnchor="middle"
              fontFamily="var(--mono)" fontSize="8" fill={BK_FAINT}>
              {"`" + String(y).slice(2)}
            </text>
          ) : null
        ))}
      </svg>
    );
  }

  function HourRidgeChart({ W: CW, H: CH }) {
    const W = CW || PAGE_W - 32;
    const R = window.ROTATION;
    const cby   = R && R.CLOCK_BY_YEAR;
    const clock  = R && R.CLOCK;

    if (!cby || !cby.length) {
      if (!clock || !clock.length) {
        return (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
            height: CH || 200, fontFamily: "var(--mono)", fontSize: 10, color: BK_FAINT,
            textAlign: "center", padding: 20 }}>
            CLOCK_BY_YEAR loads after first paint
          </div>
        );
      }
      const vals = clock.map(v => typeof v === "object" ? (v.plays || 0) : v);
      const mx   = Math.max(...vals, 1);
      const norm = vals.map(v => v / mx);
      const H = CH || 200;
      const padL = 24, padR = 8, padT = 12, padB = 22;
      const iw = W - padL - padR, ih = H - padT - padB;
      const xAt = h => padL + (h / 23) * iw;
      const pts  = norm.map((v, h) => [xAt(h), padT + (1 - v) * ih]);
      const area = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}` + _segs(pts) +
        ` L${pts[pts.length - 1][0].toFixed(1)} ${padT + ih} L${pts[0][0].toFixed(1)} ${padT + ih} Z`;
      return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: "block" }}>
          <path d={area} fill="oklch(0.60 0.16 330)" fillOpacity={0.75}
            stroke="oklch(0.72 0.14 330)" strokeWidth="1.2" />
          {[0, 6, 12, 18, 23].map(h => (
            <text key={h} x={xAt(h)} y={H - 6} textAnchor="middle"
              fontFamily="var(--mono)" fontSize="8" fill={BK_FAINT}>{h}h</text>
          ))}
          <text x={W / 2} y={10} textAnchor="middle" fontFamily="var(--mono)"
            fontSize="9" fill={BK_DIM}>all-time</text>
        </svg>
      );
    }

    const years = cby.map(r => r.year).sort((a, b) => a - b)
      .filter(y => {
        const row = cby.find(r => r.year === y);
        return row && row.hours && row.hours.reduce((s, v) => s + v, 0) > 200;
      });
    if (!years.length) return null;

    const RIDGE_H = 44, PAD_L = 34, PAD_R = 8, PAD_TOP = 12, PAD_BOT = 18;
    const OVERLAP = RIDGE_H * 0.72;
    const totalH = PAD_TOP + years.length * (RIDGE_H * 0.50) + RIDGE_H + PAD_BOT;
    const iw = W - PAD_L - PAD_R;
    const xAt = h => PAD_L + (h / 23) * iw;
    const yBase = yi => PAD_TOP + yi * (RIDGE_H * 0.50) + RIDGE_H;

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
          <text key={h} x={xAt(h)} y={totalH - 2} fill={BK_FAINT}
            fontSize="7.5" fontFamily="var(--mono)" textAnchor="middle">{h}h</text>
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
            ` L${pts[pts.length - 1][0].toFixed(1)} ${yb.toFixed(1)}` +
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

  function ArtistEraBumpChart({ W: CW, H: CH }) {
    const W = CW || PAGE_W - 32;
    const H = CH || 300;
    const R = window.ROTATION;
    if (!R || !R.ERAS || !R.ERAS.length) {
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
          height: H, fontFamily: "var(--mono)", fontSize: 10, color: BK_FAINT,
          textAlign: "center", padding: 20 }}>
          ERAS not available
        </div>
      );
    }
    const eras  = R.ERAS.slice().sort((a, b) => a.year - b.year).slice(-12);
    const years = eras.map(e => e.year);
    const artistSet = new Set();
    for (const e of eras) for (const a of (e.top || [])) artistSet.add(a.name);
    const artists = [...artistSet];
    const ranks = {};
    for (const name of artists) {
      ranks[name] = years.map((y, yi) => {
        const idx = (eras[yi].top || []).findIndex(a => a.name === name);
        return idx >= 0 ? idx + 1 : null;
      });
    }
    const featured = artists.filter(name => {
      const r = ranks[name];
      return r.filter(x => x !== null).length >= 2 && r.some(x => x !== null && x <= 5);
    }).slice(0, 12);

    const PAD_L = 96, PAD_R = 16, PAD_T = 24, PAD_B = 20;
    const W2 = W - PAD_L - PAD_R, H2 = H - PAD_T - PAD_B;
    const N = 10;
    const xOf = yi => PAD_L + (yi / Math.max(years.length - 1, 1)) * W2;
    const yOf = rank => PAD_T + ((rank - 1) / (N - 1)) * H2;
    const hueOf = name => {
      const a = R.byId && R.byId[R.slug ? R.slug(name) : name];
      if (a) return a.hue;
      let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
      return h % 360;
    };

    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: "block", overflow: "visible" }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(r => (
          <line key={r} x1={PAD_L} x2={W - PAD_R} y1={yOf(r)} y2={yOf(r)}
            stroke={BK_RULE} strokeWidth="0.8" />
        ))}
        {years.map((y, yi) => (
          <text key={y} x={xOf(yi)} y={PAD_T - 8} fill={BK_FAINT} fontSize="8"
            fontFamily="var(--mono)" textAnchor="middle">{y}</text>
        ))}
        {[1, 3, 5, 10].map(r => (
          <text key={r} x={PAD_L - 5} y={yOf(r) + 3.5} fill={BK_FAINT} fontSize="7.5"
            fontFamily="var(--mono)" textAnchor="end">#{r}</text>
        ))}
        {featured.map(name => {
          const r = ranks[name];
          const hue = hueOf(name);
          const col = `oklch(0.65 0.16 ${hue})`;
          const segs = [];
          let prev = null;
          for (let i = 0; i < years.length; i++) {
            if (r[i] !== null) { if (prev !== null) segs.push([prev, i]); prev = i; }
            else { prev = null; }
          }
          const first = r.findIndex(x => x !== null);
          return (
            <g key={name}>
              {segs.map(([a, b], si) => (
                <line key={si} x1={xOf(a)} y1={yOf(r[a])} x2={xOf(b)} y2={yOf(r[b])}
                  stroke={col} strokeWidth="2" strokeLinecap="round" opacity="0.85" />
              ))}
              {r.map((rank, yi) => rank !== null
                ? <circle key={yi} cx={xOf(yi)} cy={yOf(rank)} r="3" fill={col} />
                : null
              )}
              {first >= 0 && first === 0 && (
                <text x={PAD_L - 8} y={yOf(r[first]) + 3.5} fill={col} fontSize="8"
                  fontFamily="var(--mono)" textAnchor="end">
                  {name.length > 13 ? name.slice(0, 12) + "…" : name}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    );
  }

  function MilestonesChart({ W: CW, H: CH }) {
    const W = CW || PAGE_W - 32;
    const H = CH || 300;
    const R = window.ROTATION;
    const totals = R && R.TOTALS;
    if (!totals) {
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
          height: H, fontFamily: "var(--mono)", fontSize: 10, color: BK_FAINT,
          textAlign: "center", padding: 20 }}>
          TOTALS not available
        </div>
      );
    }

    const ERAS = R && R.ERAS ? R.ERAS.slice().sort((a, b) => a.year - b.year) : [];
    const scrobbles = (totals.scrobbles) || 0;
    const since = totals.since ? new Date(totals.since).getUTCFullYear() : 2006;
    const now = new Date().getUTCFullYear();
    const years = Array.from({ length: now - since + 1 }, (_, i) => since + i);

    const yearPlays = {};
    for (const e of ERAS) yearPlays[e.year] = e.plays || 0;
    const maxPlays = Math.max(...Object.values(yearPlays), 1);

    const PAD_L = 28, PAD_R = 8, PAD_T = 28, PAD_B = 32;
    const iw = W - PAD_L - PAD_R, ih = H - PAD_T - PAD_B;
    const xOf = y => PAD_L + ((y - since) / Math.max(years.length - 1, 1)) * iw;
    const yOf = v => PAD_T + (1 - v / maxPlays) * ih;

    const pts = years.map(y => [xOf(y), yearPlays[y] ? yOf(yearPlays[y]) : PAD_T + ih]);
    const area = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}` + _segs(pts) +
      ` L${pts[pts.length - 1][0].toFixed(1)} ${PAD_T + ih} L${pts[0][0].toFixed(1)} ${PAD_T + ih} Z`;

    let peakYear = since, peakVal = 0;
    for (const [y, v] of Object.entries(yearPlays)) {
      if (v > peakVal) { peakVal = v; peakYear = +y; }
    }

    const milestoneNs = [50000, 100000, 150000, 200000, 250000, 300000];
    const shownMiles = milestoneNs.filter(n => n <= scrobbles);

    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: "block", overflow: "visible" }}>
        <path d={area} fill="oklch(0.52 0.14 330)" fillOpacity={0.35} />
        <path d={`M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}` + _segs(pts)}
          fill="none" stroke="oklch(0.72 0.14 330)" strokeWidth="1.8" strokeLinejoin="round" />
        {years.filter((y, i) => i % 4 === 0 || y === now).map(y => (
          <text key={y} x={xOf(y)} y={H - 10} textAnchor="middle"
            fontFamily="var(--mono)" fontSize="7.5" fill={BK_FAINT}>{y}</text>
        ))}
        {peakYear && (
          <>
            <line x1={xOf(peakYear)} x2={xOf(peakYear)} y1={PAD_T} y2={PAD_T + ih}
              stroke={BK_ACCENT} strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
            <text x={xOf(peakYear)} y={PAD_T - 6} textAnchor="middle"
              fontFamily="var(--mono)" fontSize="8" fill={BK_ACCENT}>{peakYear}</text>
          </>
        )}
        {shownMiles.map(n => {
          let cum = 0, crossYear = since;
          for (const y of years) {
            cum += yearPlays[y] || 0;
            if (cum >= n) { crossYear = y; break; }
          }
          const cx = xOf(crossYear);
          const cy = yearPlays[crossYear] ? yOf(yearPlays[crossYear]) : PAD_T + ih;
          const label = n >= 1000 ? (n / 1000) + "k" : String(n);
          return (
            <g key={n}>
              <circle cx={cx} cy={cy} r="4" fill={BK_ACCENT} opacity="0.85" />
              <text x={cx} y={cy - 8} textAnchor="middle" fontFamily="var(--mono)"
                fontSize="7.5" fill={BK_ACCENT}>{label}</text>
            </g>
          );
        })}
      </svg>
    );
  }

  function TasteChapterChart({ W: CW, H: CH }) {
    const W = CW || PAGE_W - 32;
    const H = CH || 280;
    const R = window.ROTATION;
    const TE = R && R.INSIGHTS && R.INSIGHTS.TASTE_ERAS;
    const chapters = TE && (TE.chapters || TE.eras);
    if (!chapters || !chapters.length) {
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
          height: H, fontFamily: "var(--mono)", fontSize: 10, color: BK_FAINT,
          textAlign: "center", padding: 20 }}>
          TASTE_ERAS not available
        </div>
      );
    }

    const PAD_L = 8, PAD_R = 8, PAD_T = 20, PAD_B = 40;
    const iw = W - PAD_L - PAD_R, ih = H - PAD_T - PAD_B;
    const n = chapters.length;
    const blockW = iw / n;

    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: "block" }}>
        {chapters.map((ch, i) => {
          const fam  = (ch.topFams && ch.topFams[0]) || (ch.topFam ? [ch.topFam] : null);
          const hue  = (fam && (fam.hue || (fam[0] && fam[0].hue))) || (200 + i * 40);
          const name = (fam && (fam.fam || (fam[0] && fam[0].fam))) || "era";
          const x0   = PAD_L + i * blockW;
          const col  = `oklch(0.52 0.16 ${hue % 360})`;
          const colL = `oklch(0.70 0.14 ${hue % 360})`;
          const startLabel = ch.start ? ch.start.slice(0, 7) : (ch.year ? String(ch.year) : "");
          const barH = Math.min(ih, 60 + i * 8);

          return (
            <g key={i}>
              <rect x={x0 + 1} y={PAD_T + ih - barH} width={blockW - 2} height={barH}
                fill={col} fillOpacity={0.65} rx="2" />
              <line x1={x0} x2={x0} y1={PAD_T} y2={PAD_T + ih + 4}
                stroke={BK_RULE} strokeWidth="0.8" />
              <text x={x0 + blockW / 2} y={H - PAD_B + 14} textAnchor="middle"
                fontFamily="var(--mono)" fontSize="7" fill={BK_FAINT} transform={`rotate(-30 ${x0 + blockW / 2} ${H - PAD_B + 14})`}>
                {startLabel}
              </text>
              {blockW > 50 && (
                <text x={x0 + blockW / 2} y={PAD_T + ih - barH - 5} textAnchor="middle"
                  fontFamily="var(--mono)" fontSize="8" fill={colL}>
                  {name.length > 10 ? name.slice(0, 9) + "…" : name}
                </text>
              )}
            </g>
          );
        })}
        <line x1={PAD_L} x2={W - PAD_R} y1={PAD_T + ih} y2={PAD_T + ih}
          stroke={BK_RULE} strokeWidth="1" />
      </svg>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //  DATA NARRATIVES (unchanged from v3)
  // ─────────────────────────────────────────────────────────────────────────────

  function useGenreNarrative() {
    return useMemo(() => {
      const R = window.ROTATION;
      if (!R) return [];
      const gf   = R.GENRE_FLOW;
      const tf   = R.INSIGHTS && R.INSIGHTS.TASTE_ERAS;
      const tot  = R.TOTALS || {};
      const since = tot.since ? new Date(tot.since).getUTCFullYear() : 2006;
      const span  = new Date().getUTCFullYear() - since;

      let topFam = null, runnerUp = null;
      if (gf && gf.years && gf.families) {
        const sumByFam = new Array(gf.families.length).fill(0);
        for (const yr of gf.years) yr.fams.forEach((v, fi) => { sumByFam[fi] += v; });
        const grand  = sumByFam.reduce((s, v) => s + v, 0) || 1;
        const ranked = gf.families.map((f, fi) => ({ ...f, share: sumByFam[fi] / grand }))
          .sort((a, b) => b.share - a.share);
        topFam = ranked[0]; runnerUp = ranked[1];
      }
      const chapters = tf && (tf.chapters || tf.eras);
      const first    = chapters && chapters[0];
      const latest   = chapters && chapters[chapters.length - 1];

      const paras = [];
      paras.push(
        `${span} years. That's how long this library has been accumulating — since ${since}, ` +
        `one scrobble at a time, until ${(tot.scrobbles || 0).toLocaleString("en-US")} plays ` +
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
      if (first && latest && first !== latest) {
        const fFams = (first.topFams || []).slice(0, 2).map(f => f.fam || f).join(" and ");
        const lFams = (latest.topFams || []).slice(0, 2).map(f => f.fam || f).join(" and ");
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
      const tot    = R.TOTALS || {};

      let peakHour = 22;
      if (clock && clock.length) {
        const vals = clock.map(v => typeof v === "object" ? (v.plays || 0) : v);
        peakHour   = vals.indexOf(Math.max(...vals));
      }
      const peakLabel = peakHour < 6 ? "deep in the night"
        : peakHour < 10 ? "the morning hours" : peakHour < 14 ? "midday"
        : peakHour < 18 ? "the afternoon" : peakHour < 21 ? "the evening"
        : "late at night";

      const paras = [
        `When does music happen? Not on the calendar — on the clock. ` +
        `${(tot.scrobbles || 0).toLocaleString("en-US")} scrobbles ` +
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

  function useArtistErasSummary() {
    return useMemo(() => {
      const R = window.ROTATION;
      if (!R || !R.ERAS) return [];
      const eras = R.ERAS.slice().sort((a, b) => a.year - b.year);
      const tot  = R.TOTALS || {};

      const counts = {};
      for (const e of eras) {
        const top = e.top && e.top[0];
        if (top) counts[top.name] = (counts[top.name] || 0) + 1;
      }
      const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      const paras = [];
      paras.push(
        `${eras.length} years of data — each with its own summit. ` +
        `The bump chart on the facing page shows every artist who cracked the top 10 ` +
        `in any given year. Lines crossing reveal the obsessions a streamgraph buries.`
      );
      if (dominant && dominant[1] > 1) {
        paras.push(
          `${dominant[0]} holds the record: top of the year for ${dominant[1]} different ` +
          `years. Consistency like that isn't random — it's gravity.`
        );
      }
      const topArtist = R.ARTISTS && R.ARTISTS[0];
      if (topArtist) {
        paras.push(
          `All-time: ${topArtist.name} leads with ${(topArtist.plays || 0).toLocaleString("en-US")} ` +
          `plays across ${Object.keys(topArtist.yp || {}).length || "?"} different years. ` +
          `Some artists sprint in and vanish. Others anchor.`
        );
      }
      return paras;
    }, []);
  }

  function useMilestonesNarrative() {
    return useMemo(() => {
      const R = window.ROTATION;
      if (!R) return [];
      const tot   = R.TOTALS || {};
      const streak = tot.streak;
      const topDay = tot.topDay;

      const paras = [];
      const hrs = tot.exactHours ? Math.round(tot.exactHours).toLocaleString("en-US") : "thousands of";
      paras.push(
        `${(tot.scrobbles || 0).toLocaleString("en-US")} plays. ` +
        `${hrs} hours of listening time — pressed into a single dataset.`
      );
      if (streak && (streak.best || streak.current)) {
        const best = streak.best || 0;
        const cur  = streak.current || 0;
        paras.push(
          `The longest streak: ${best} consecutive days without missing a scrobble. ` +
          `Currently at ${cur} days and counting. ` +
          `Streaks are an accidental self-portrait — they show when music is essential.`
        );
      }
      if (topDay) {
        const MON = window.MON;
        const d = topDay.date ? new Date(topDay.date + "T00:00:00Z") : null;
        const dateStr = d ? `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}` : "one day";
        paras.push(
          `The heaviest single day: ${topDay.count ? topDay.count.toLocaleString("en-US") : "?"} plays on ${dateStr}. ` +
          `The chart above tracks the annual accumulation — each milestone dot marks a ` +
          `round number crossed.`
        );
      }
      return paras;
    }, []);
  }

  function useTasteChaptersNarrative() {
    return useMemo(() => {
      const R = window.ROTATION;
      if (!R) return [];
      const TE = R.INSIGHTS && R.INSIGHTS.TASTE_ERAS;
      const chapters = TE && (TE.chapters || TE.eras);
      if (!chapters || !chapters.length) return [];

      const paras = [];
      paras.push(
        `Taste doesn't drift uniformly — it pivots. The algorithm found ${chapters.length} ` +
        `distinct chapters in this listening history, each with its own dominant genre profile.`
      );
      let sharpest = null, maxD = 0;
      for (const ch of chapters) {
        if (!ch.shift) continue;
        const d = Math.max(
          ch.shift.up   ? (ch.shift.up.d   || 0) : 0,
          ch.shift.down ? (ch.shift.down.d || 0) : 0
        );
        if (d > maxD) { maxD = d; sharpest = ch; }
      }
      if (sharpest) {
        const yearStr = sharpest.start ? sharpest.start.slice(0, 4) : "?";
        const up   = sharpest.shift && sharpest.shift.up;
        const down = sharpest.shift && sharpest.shift.down;
        let changeDesc = "";
        if (up && down) changeDesc = `${up.fam} rose as ${down.fam} fell`;
        else if (up)   changeDesc = `${up.fam} surged`;
        else if (down) changeDesc = `${down.fam} receded sharply`;
        paras.push(
          `The sharpest pivot came around ${yearStr}: ${changeDesc}. ` +
          `The bar chart on the facing page maps each chapter's width to its duration.`
        );
      }
      const last = chapters[chapters.length - 1];
      const lastFam = last && last.topFams && last.topFams[0];
      if (lastFam) {
        paras.push(
          `The current chapter is defined by ${lastFam.fam || lastFam}. ` +
          `Where it goes next is the only question the data can't answer.`
        );
      }
      return paras;
    }, []);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //  PAGE CONTENT PRIMITIVES
  // ─────────────────────────────────────────────────────────────────────────────

  // v4: PaperPage uses dark parchment, not bright white
  function PaperPage({ children, style }) {
    return (
      <div style={{
        width: "100%", height: "100%", background: BK_PAPER,
        display: "flex", flexDirection: "column",
        padding: "40px 36px 32px", boxSizing: "border-box", overflowY: "hidden",
        ...style
      }}>
        {children}
      </div>
    );
  }

  function DarkPage({ children, style }) {
    return (
      <div style={{
        width: "100%", height: "100%", background: BK_BG,
        display: "flex", flexDirection: "column",
        padding: "28px 20px 20px", boxSizing: "border-box", overflowY: "hidden",
        ...style
      }}>
        {children}
      </div>
    );
  }

  function ChapterKicker({ roman, title }) {
    return (
      <div style={{
        fontFamily: "var(--mono)", fontSize: 8, letterSpacing: ".28em",
        textTransform: "uppercase", color: BK_PAPER_RULE, marginBottom: 14
      }}>
        Chapter {roman} · {title}
      </div>
    );
  }

  function ProseTitle({ children }) {
    return (
      <div style={{
        fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 600,
        fontSize: 26, lineHeight: 1.2, letterSpacing: "-.02em",
        color: BK_PAPER_INK, marginBottom: 18
      }}>
        {children}
      </div>
    );
  }

  function Rule() {
    return <div style={{ width: 32, height: 1.5, background: BK_PAPER_RULE, marginBottom: 22 }} />;
  }

  function Paras({ paras }) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1, overflow: "hidden" }}>
        {paras.map((p, i) => (
          <p key={i} style={{
            margin: 0, fontFamily: "var(--serif)",
            fontSize: 13, lineHeight: 1.72,
            color: i === 0 ? BK_PAPER_INK : "#8a8070",
            fontWeight: i === 0 ? 500 : 400
          }}>{p}</p>
        ))}
      </div>
    );
  }

  // "read the full chapter ↓" link inside each spread's prose page
  function ReadMoreLink({ chapterId, dark }) {
    return (
      <div style={{ marginTop: "auto", paddingTop: 16 }}>
        <a href={`#bk-ch-${chapterId}`}
          onClick={e => {
            e.preventDefault();
            const el = document.getElementById(`bk-ch-${chapterId}`);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          style={{
            fontFamily: "var(--mono)", fontSize: 8.5, letterSpacing: ".12em",
            textTransform: "uppercase",
            color: dark ? BK_ACCENT : "oklch(0.65 0.13 330)",
            textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5
          }}
        >
          read the full chapter ↓
        </a>
      </div>
    );
  }

  function ChartKicker({ children }) {
    return (
      <div style={{
        fontFamily: "var(--mono)", fontSize: 8, letterSpacing: ".20em",
        textTransform: "uppercase", color: BK_FAINT, marginBottom: 14
      }}>
        {children}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //  PAGE CONTENT (v4 — 16 pages, 0–15)
  // ─────────────────────────────────────────────────────────────────────────────

  // Page 0 — Front Cover
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
        padding: "48px 40px", textAlign: "center",
        boxSizing: "border-box", position: "relative", overflow: "hidden"
      }}>
        <div style={{ position: "absolute", inset: 18,
          border: `1px solid oklch(0.38 0.10 330 / 0.55)`, borderRadius: 2, pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 23,
          border: `1px solid oklch(0.28 0.08 330 / 0.35)`, borderRadius: 1, pointerEvents: "none" }} />
        <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: ".34em",
          textTransform: "uppercase", color: BK_FAINT, marginBottom: 36, position: "relative", zIndex: 1 }}>
          fuad.au · a personal archive
        </div>
        <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 600,
          fontSize: 52, letterSpacing: "-.03em", lineHeight: 1.1,
          color: BK_INK, position: "relative", zIndex: 1 }}>
          the listening<br />
          <span style={{ color: BK_ACCENT }}>years</span>
        </div>
        <div style={{
          width: 48, height: 2,
          background: `linear-gradient(90deg, transparent, ${BK_ACCENT}, transparent)`,
          margin: "32px auto", position: "relative", zIndex: 1
        }} />
        <div style={{ fontFamily: "var(--serif)", fontStyle: "italic",
          fontSize: 15, color: BK_DIM, lineHeight: 1.6, position: "relative", zIndex: 1 }}>
          {scrobbles} plays<br />
          {since} to today
        </div>
        <div style={{
          position: "absolute", bottom: 44, left: 0, right: 0, textAlign: "center",
          fontFamily: "var(--mono)", fontSize: 9, letterSpacing: ".22em",
          textTransform: "uppercase", color: BK_FAINT, zIndex: 1,
          animation: "bk-pulse 2.4s ease-in-out infinite"
        }}>open the cover →</div>
        <div style={{
          position: "absolute", top: 0, right: 0, bottom: 0, width: 20,
          background: "linear-gradient(to left, rgba(0,0,0,0.45), transparent)",
          pointerEvents: "none"
        }} />
      </div>
    );
  }

  // Page 1 — Title / endpaper
  function PageContent_Title() {
    const R = window.ROTATION;
    const tot = (R && R.TOTALS) || {};
    const since = tot.since ? new Date(tot.since).getUTCFullYear() : 2006;
    const hours = tot.exactHours ? Math.round(tot.exactHours).toLocaleString("en-US") : null;
    const scrobbles = tot.scrobbles ? tot.scrobbles.toLocaleString("en-US") : "—";
    return (
      <PaperPage>
        <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: ".28em",
          textTransform: "uppercase", color: BK_PAPER_RULE, marginBottom: 28 }}>
          fuad.au · listening archive
        </div>
        <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 600,
          fontSize: 38, letterSpacing: "-.02em", lineHeight: 1.1,
          color: BK_PAPER_INK, marginBottom: 32 }}>
          the listening<br />
          <span style={{ color: "oklch(0.65 0.15 330)" }}>years</span>
        </div>
        <div style={{ width: 36, height: 1.5, background: BK_PAPER_RULE, marginBottom: 36 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 16,
          fontFamily: "var(--serif)", fontSize: 14, color: BK_PAPER_INK, lineHeight: 1.7 }}>
          <div>
            <span style={{ color: BK_PAPER_RULE, fontFamily: "var(--mono)", fontSize: 9,
              letterSpacing: ".14em", textTransform: "uppercase" }}>plays</span><br />
            <strong style={{ color: BK_PAPER_INK }}>{scrobbles}</strong>
          </div>
          <div>
            <span style={{ color: BK_PAPER_RULE, fontFamily: "var(--mono)", fontSize: 9,
              letterSpacing: ".14em", textTransform: "uppercase" }}>years active</span><br />
            <strong style={{ color: BK_PAPER_INK }}>{since} – today</strong>
          </div>
          {hours && <div>
            <span style={{ color: BK_PAPER_RULE, fontFamily: "var(--mono)", fontSize: 9,
              letterSpacing: ".14em", textTransform: "uppercase" }}>hours</span><br />
            <strong style={{ color: BK_PAPER_INK }}>{hours}</strong>
          </div>}
        </div>
        <div style={{ marginTop: "auto", fontFamily: "var(--mono)", fontSize: 8.5,
          color: BK_PAPER_RULE, lineHeight: 1.6, letterSpacing: ".06em" }}>
          last.fm user: fuadex<br />
          source: {scrobbles} scrobbles · real data
        </div>
      </PaperPage>
    );
  }

  // Page 2 — Ch I prose
  function PageContent_GenreProse() {
    const paras = useGenreNarrative();
    return (
      <PaperPage>
        <ChapterKicker roman="I" title="Genre Eras" />
        <ProseTitle>How the sound shifted</ProseTitle>
        <Rule />
        <Paras paras={paras} />
        <ReadMoreLink chapterId="genre" />
      </PaperPage>
    );
  }

  // Page 3 — Ch I chart
  function PageContent_GenreChart() {
    return (
      <DarkPage>
        <ChartKicker>genre families · share of plays per year</ChartKicker>
        <div style={{ flex: 1, display: "flex", alignItems: "center", minHeight: 0 }}>
          <GenreStreamChart H={340} />
        </div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 7.5, color: BK_FAINT,
          lineHeight: 1.5, letterSpacing: ".06em" }}>
          Data: ROTATION.GENRE_FLOW · each year normalised<br />
          families via last.fm tags + Discogs
        </div>
      </DarkPage>
    );
  }

  // Page 4 — Ch II chart
  function PageContent_RidgeChart() {
    return (
      <DarkPage>
        <ChartKicker>hour of day · ridgeline by year</ChartKicker>
        <div style={{ flex: 1, display: "flex", alignItems: "center", minHeight: 0 }}>
          <HourRidgeChart />
        </div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 7.5, color: BK_FAINT,
          lineHeight: 1.5, letterSpacing: ".06em" }}>
          Data: ROTATION.CLOCK_BY_YEAR · each year normalised · 24-hour local time
        </div>
      </DarkPage>
    );
  }

  // Page 5 — Ch II prose
  function PageContent_RidgeProse() {
    const paras = useRidgeNarrative();
    return (
      <PaperPage>
        <ChapterKicker roman="II" title="Listening Hours" />
        <ProseTitle>When the music plays</ProseTitle>
        <Rule />
        <Paras paras={paras} />
        <ReadMoreLink chapterId="hours" />
      </PaperPage>
    );
  }

  // Page 6 — Ch III prose
  function PageContent_ArtistErasProse() {
    const paras = useArtistErasSummary();
    return (
      <PaperPage>
        <ChapterKicker roman="III" title="Artist Eras" />
        <ProseTitle>Who commanded the years</ProseTitle>
        <Rule />
        <Paras paras={paras} />
        <ReadMoreLink chapterId="artists" />
      </PaperPage>
    );
  }

  // Page 7 — Ch III chart
  function PageContent_ArtistErasChart() {
    return (
      <DarkPage>
        <ChartKicker>top-10 artist rank per year · bumps reveal obsessions</ChartKicker>
        <div style={{ flex: 1, display: "flex", alignItems: "center", minHeight: 0 }}>
          <ArtistEraBumpChart H={340} />
        </div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 7.5, color: BK_FAINT,
          lineHeight: 1.5, letterSpacing: ".06em" }}>
          Data: ROTATION.ERAS · rank crossings = obsession shifts
        </div>
      </DarkPage>
    );
  }

  // Page 8 — Ch IV chart
  function PageContent_MilestonesChart() {
    return (
      <DarkPage>
        <ChartKicker>scrobbles per year · milestone markers</ChartKicker>
        <div style={{ flex: 1, display: "flex", alignItems: "center", minHeight: 0 }}>
          <MilestonesChart H={340} />
        </div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 7.5, color: BK_FAINT,
          lineHeight: 1.5, letterSpacing: ".06em" }}>
          Data: ROTATION.ERAS + ROTATION.TOTALS · circles = milestone crossings
        </div>
      </DarkPage>
    );
  }

  // Page 9 — Ch IV prose
  function PageContent_MilestonesProse() {
    const paras = useMilestonesNarrative();
    return (
      <PaperPage>
        <ChapterKicker roman="IV" title="Milestones &amp; Streaks" />
        <ProseTitle>The accumulated weight</ProseTitle>
        <Rule />
        <Paras paras={paras} />
        <ReadMoreLink chapterId="milestones" />
      </PaperPage>
    );
  }

  // Page 10 — Ch V prose
  function PageContent_TasteChaptersProse() {
    const paras = useTasteChaptersNarrative();
    return (
      <PaperPage>
        <ChapterKicker roman="V" title="Taste Chapters" />
        <ProseTitle>The chapters of a musical life</ProseTitle>
        <Rule />
        <Paras paras={paras} />
        <ReadMoreLink chapterId="taste" />
      </PaperPage>
    );
  }

  // Page 11 — Ch V chart
  function PageContent_TasteChaptersChart() {
    return (
      <DarkPage>
        <ChartKicker>taste chapters · width = era duration · colour = dominant genre</ChartKicker>
        <div style={{ flex: 1, display: "flex", alignItems: "center", minHeight: 0 }}>
          <TasteChapterChart H={320} />
        </div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 7.5, color: BK_FAINT,
          lineHeight: 1.5, letterSpacing: ".06em" }}>
          Data: ROTATION.INSIGHTS.TASTE_ERAS · auto-segmented chapters
        </div>
      </DarkPage>
    );
  }

  // Page 12 — Colophon
  function PageContent_Colophon() {
    const R = window.ROTATION;
    const tot = (R && R.TOTALS) || {};
    const scrobbles = tot.scrobbles ? tot.scrobbles.toLocaleString("en-US") : "319,000+";
    const artists = tot.artists ? tot.artists.toLocaleString("en-US") : "—";
    const hrs = tot.exactHours ? Math.round(tot.exactHours).toLocaleString("en-US") : "—";
    const since = tot.since ? new Date(tot.since).getUTCFullYear() : 2006;
    return (
      <DarkPage style={{ alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <div style={{ fontFamily: "var(--serif)", fontStyle: "italic",
          fontSize: 18, color: BK_DIM, lineHeight: 1.8, maxWidth: 340 }}>
          {scrobbles} plays. {artists} artists.<br />
          {hrs} hours. {new Date().getUTCFullYear() - since} years.
        </div>
        <div style={{ margin: "28px 0", width: 40, height: 1.5,
          background: `linear-gradient(90deg, transparent, ${BK_ACCENT}, transparent)` }} />
        <div style={{ fontFamily: "var(--serif)", fontStyle: "italic",
          fontSize: 13, color: BK_FAINT, lineHeight: 1.9, maxWidth: 300 }}>
          A musical life, pressed into cloth.<br />
          Built on real last.fm data.<br />
          No two pages look alike.
        </div>
        <div style={{ marginTop: 40, fontFamily: "var(--mono)", fontSize: 8.5,
          color: BK_FAINT, lineHeight: 2, letterSpacing: ".12em", textTransform: "uppercase" }}>
          fuad.au<br />
          last.fm / fuadex<br />
          {new Date().getUTCFullYear()}
        </div>
      </DarkPage>
    );
  }

  // Page 13 — Blank endpaper (pads inner count to 12 even = 6 spreads)
  function PageContent_Endpaper() {
    const R = window.ROTATION;
    const tot = (R && R.TOTALS) || {};
    const scrobbles = tot.scrobbles ? tot.scrobbles.toLocaleString("en-US") : "316,000+";
    return (
      <div style={{
        width: "100%", height: "100%",
        background: BK_PAPER,
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden"
      }}>
        <div style={{
          fontFamily: "var(--serif)", fontStyle: "italic",
          fontSize: 11, color: "#2e2820",
          textAlign: "center", letterSpacing: ".06em", lineHeight: 2,
          userSelect: "none", pointerEvents: "none"
        }}>
          {scrobbles} plays · fuad.au
        </div>
        {[0,1,2,3].map(c => (
          <div key={c} style={{
            position: "absolute",
            top: c < 2 ? 24 : "auto", bottom: c >= 2 ? 24 : "auto",
            left: c % 2 === 0 ? 24 : "auto", right: c % 2 !== 0 ? 24 : "auto",
            width: 4, height: 4, borderRadius: "50%",
            background: BK_PAPER_RULE
          }} />
        ))}
      </div>
    );
  }

  // Page 14 — Rear endpaper (dark)
  function PageContent_RearEndpaper() {
    const R = window.ROTATION;
    const tot = (R && R.TOTALS) || {};
    const scrobbles = tot.scrobbles ? tot.scrobbles.toLocaleString("en-US") : "316,000+";
    return (
      <div style={{
        width: "100%", height: "100%",
        background: BK_COVER_BG,
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden"
      }}>
        <div style={{
          fontFamily: "var(--serif)", fontStyle: "italic",
          fontSize: 11, color: "oklch(0.28 0.06 330)",
          textAlign: "center", letterSpacing: ".06em", lineHeight: 2,
          userSelect: "none", pointerEvents: "none"
        }}>
          {scrobbles} plays · fuad.au
        </div>
        {[0,1,2,3].map(c => (
          <div key={c} style={{
            position: "absolute",
            top: c < 2 ? 24 : "auto", bottom: c >= 2 ? 24 : "auto",
            left: c % 2 === 0 ? 24 : "auto", right: c % 2 !== 0 ? 24 : "auto",
            width: 4, height: 4, borderRadius: "50%",
            background: "oklch(0.35 0.08 330)"
          }} />
        ))}
      </div>
    );
  }

  // Page 15 — Back Cover
  function PageContent_BackCover() {
    const R = window.ROTATION;
    const tot = (R && R.TOTALS) || {};
    const scrobbles = tot.scrobbles ? tot.scrobbles.toLocaleString("en-US") : "319,000+";
    return (
      <div style={{
        width: "100%", height: "100%", background: BK_COVER_BG,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "48px 40px", textAlign: "center",
        boxSizing: "border-box", position: "relative"
      }}>
        <div style={{ position: "absolute", inset: 18,
          border: `1px solid oklch(0.38 0.10 330 / 0.45)`,
          borderRadius: 2, pointerEvents: "none" }} />
        <div style={{ fontFamily: "var(--serif)", fontStyle: "italic",
          fontSize: 15, color: BK_DIM, lineHeight: 1.8, position: "relative", zIndex: 1, maxWidth: 280 }}>
          {scrobbles} plays. Twenty years of a musical life, recorded one track at a time.
        </div>
        <div style={{ margin: "32px 0", width: 40, height: 1.5,
          background: `linear-gradient(90deg, transparent, ${BK_ACCENT}, transparent)`,
          position: "relative", zIndex: 1 }} />
        <div style={{ fontFamily: "var(--mono)", fontSize: 8.5, color: BK_FAINT,
          lineHeight: 1.8, letterSpacing: ".1em",
          textTransform: "uppercase", position: "relative", zIndex: 1 }}>
          fuad.au<br />last.fm / fuadex<br />built with real data
        </div>
        <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 20,
          background: "linear-gradient(to right, rgba(0,0,0,0.5), transparent)",
          pointerEvents: "none" }} />
      </div>
    );
  }

  // ─── PAGE REGISTRY ──────────────────────────────────────────────────────────
  // v4: 16 pages (inner 1–14 = 14 pages, even: 7 spreads)
  const PAGE_RENDERERS = [
    PageContent_Cover,               // 0  hard
    PageContent_Title,               // 1  paper
    PageContent_GenreProse,          // 2  paper
    PageContent_GenreChart,          // 3  dark
    PageContent_RidgeChart,          // 4  dark
    PageContent_RidgeProse,          // 5  paper
    PageContent_ArtistErasProse,     // 6  paper
    PageContent_ArtistErasChart,     // 7  dark
    PageContent_MilestonesChart,     // 8  dark
    PageContent_MilestonesProse,     // 9  paper
    PageContent_TasteChaptersProse,  // 10 paper
    PageContent_TasteChaptersChart,  // 11 dark
    PageContent_Colophon,            // 12 dark
    PageContent_Endpaper,            // 13 paper (blank pad)
    PageContent_RearEndpaper,        // 14 dark endpaper
    PageContent_BackCover,           // 15 hard
  ];

  // ─── CHAPTER RAIL ───────────────────────────────────────────────────────────
  // v4: rendered OUTSIDE the scaled book wrapper — in untransformed page space.
  // This means it lives at the BookSection level and receives onChapterClick.
  const CHAPTERS = [
    { label: "Cover",              page: 0  },
    { label: "I · Genre Eras",    page: 2  },
    { label: "II · Hours",        page: 4  },
    { label: "III · Artists",     page: 6  },
    { label: "IV · Milestones",   page: 8  },
    { label: "V · Taste",         page: 10 },
    { label: "Colophon",          page: 12 },
  ];

  function activeChapter(pageIdx) {
    let ch = 0;
    for (let i = 0; i < CHAPTERS.length; i++) {
      if (pageIdx >= CHAPTERS[i].page) ch = i;
    }
    return ch;
  }

  // ChapterRail: rendered in untransformed stage coordinates (Bug #5 fix)
  function ChapterRail({ currentPage, onChapterClick }) {
    const active = activeChapter(currentPage);
    return (
      <div style={{
        position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
        display: "flex", flexDirection: "column", gap: 4,
        padding: "12px 6px",
        // v4: z-index high but no pointer-events confusion; lives outside transformed wrapper
        zIndex: 30,
        // ensure it doesn't intercept clicks meant for the book (only its own buttons)
      }}>
        {CHAPTERS.map((ch, i) => (
          <button key={i} onClick={() => onChapterClick(ch.page)} style={{
            background: "none", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 8, padding: "5px 4px"
          }}>
            <div style={{
              width: i === active ? 24 : 10, height: 2,
              background: i === active ? BK_ACCENT : BK_FAINT,
              transition: "width 0.3s ease, background 0.3s ease", flexShrink: 0
            }} />
            <span style={{
              fontFamily: "var(--mono)", fontSize: 8.5, letterSpacing: ".12em",
              textTransform: "uppercase",
              color: i === active ? BK_ACCENT : BK_FAINT,
              transition: "color 0.2s ease", whiteSpace: "nowrap",
              opacity: i === active ? 1 : 0.7
            }}>{ch.label}</span>
          </button>
        ))}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //  ANNOTATIONS (v4)
  //  Bug #3 fix: annotation targets are fractions of the VISIBLE SPREAD box
  //  (the stf__parent bounding box), not stage fractions.
  //  tx/ty are fractions of the visible spread box: 0=left, 1=right, 0=top, 1=bottom.
  //  The AnnotationLayer measures the stf__parent bbox on every render + resize.
  // ─────────────────────────────────────────────────────────────────────────────
  const ANNOTATIONS = {
    0: [
      { side: "right", y: 0.35, tx: 0.62, ty: 0.45, text: "316,000 plays pressed\ninto cloth" },
      { side: "right", y: 0.65, tx: 0.72, ty: 0.72, text: "click to open →" },
    ],
    1: [
      { side: "left", y: 0.50, tx: 0.22, ty: 0.38, text: "since 2006 —\n18 years of\ndata" },
    ],
    3: [
      { side: "right", y: 0.40, tx: 0.78, ty: 0.38, text: "2019 —\nthe peak\nyear" },
      { side: "left",  y: 0.60, tx: 0.24, ty: 0.62, text: "genre share\nnormalised\nper year" },
    ],
    4: [
      { side: "left", y: 0.35, tx: 0.28, ty: 0.30, text: "late-night\npeak: 22:00" },
      { side: "right", y: 0.55, tx: 0.74, ty: 0.60, text: "each ridge\nis one year" },
    ],
    7: [
      { side: "right", y: 0.42, tx: 0.76, ty: 0.35, text: "rank crossings\nshow obsession\nshifts" },
    ],
    8: [
      { side: "left",  y: 0.38, tx: 0.26, ty: 0.32, text: "100k milestone\ncrossed" },
      { side: "right", y: 0.55, tx: 0.76, ty: 0.55, text: "peak year\nmarked in\naccent" },
    ],
    11: [
      { side: "left", y: 0.45, tx: 0.22, ty: 0.50, text: "each bar =\none chapter\nin taste" },
    ],
  };

  // v4: AnnotationLayer receives the measured spread bbox so it can place
  // leader-line targets relative to the actual rendered book position.
  function AnnotationLayer({ stageW, stageH, spreadRect, currentPage, visible }) {
    const candidates = [];
    for (const pi of [currentPage, currentPage + 1]) {
      const anns = ANNOTATIONS[pi];
      if (anns) candidates.push(...anns);
    }
    if (!candidates.length || !spreadRect) return null;

    const MARGIN = 120;
    const { left: sl, top: st, width: sw, height: sh } = spreadRect;

    return (
      <svg
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          // Bug #4 fix: pointer-events none so mouse drags pass through to StPageFlip
          pointerEvents: "none",
          zIndex: 25,
          opacity: visible ? 1 : 0,
          transition: "opacity 0.5s ease"
        }}
        viewBox={`0 0 ${stageW} ${stageH}`}
        preserveAspectRatio="none"
      >
        {candidates.map((ann, i) => {
          const isLeft = ann.side === "left";
          const noteX = isLeft ? MARGIN * 0.5 : stageW - MARGIN * 0.5;
          const noteY = ann.y * stageH;
          // v4: target anchored to the SPREAD box's actual position on screen
          const targetX = sl + ann.tx * sw;
          const targetY = st + ann.ty * sh;

          const cpX = (noteX + targetX) / 2;
          const cpY = (noteY + targetY) / 2 - 20;

          const lines = String(ann.text).split("\n");
          const lineH = 13;
          const totalTextH = lines.length * lineH;

          return (
            <g key={i}>
              <path
                d={`M${noteX.toFixed(1)} ${noteY.toFixed(1)} Q${cpX.toFixed(1)} ${cpY.toFixed(1)} ${targetX.toFixed(1)} ${targetY.toFixed(1)}`}
                fill="none" stroke={BK_ACCENT} strokeWidth="0.8"
                strokeOpacity="0.55" strokeDasharray="3 3"
              />
              <circle cx={targetX} cy={targetY} r="2.5" fill={BK_ACCENT} opacity="0.65" />
              {lines.map((line, li) => (
                <text key={li} x={noteX}
                  y={noteY - totalTextH / 2 + li * lineH + lineH * 0.75}
                  textAnchor="middle" fontFamily="var(--mono)" fontSize="9"
                  fill={BK_ACCENT} opacity="0.80" letterSpacing=".06em">
                  {line}
                </text>
              ))}
            </g>
          );
        })}
      </svg>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //  CLOSED BOOK
  // ─────────────────────────────────────────────────────────────────────────────
  function ClosedBook({ onClick }) {
    const R = window.ROTATION;
    const since = R && R.TOTALS && R.TOTALS.since
      ? new Date(R.TOTALS.since).getUTCFullYear() : 2006;
    return (
      <div onClick={onClick} style={{
        cursor: "pointer",
        width: PAGE_W, height: PAGE_H, position: "relative",
        filter: "drop-shadow(0 32px 48px rgba(0,0,0,0.85)) drop-shadow(0 8px 16px rgba(0,0,0,0.6))",
        transition: "transform 0.15s ease",
      }}
        onMouseEnter={e => e.currentTarget.style.transform = "translateY(-6px)"}
        onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
      >
        <div style={{
          width: "100%", height: "100%", background: BK_COVER_BG,
          borderRadius: "2px 6px 6px 2px",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          textAlign: "center", padding: "40px 36px",
          boxSizing: "border-box", position: "relative", overflow: "hidden"
        }}>
          <div style={{ position: "absolute", inset: 16,
            border: `1px solid oklch(0.38 0.10 330 / 0.55)`,
            borderRadius: 2, pointerEvents: "none" }} />
          <div style={{ position: "absolute", inset: 20,
            border: `1px solid oklch(0.28 0.08 330 / 0.30)`,
            borderRadius: 1, pointerEvents: "none" }} />
          <div style={{ fontFamily: "var(--mono)", fontSize: 8, letterSpacing: ".30em",
            textTransform: "uppercase", color: BK_FAINT, marginBottom: 28, position: "relative", zIndex: 1 }}>
            fuad.au · a personal archive
          </div>
          <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 600,
            fontSize: 44, letterSpacing: "-.03em", lineHeight: 1.1,
            color: BK_INK, position: "relative", zIndex: 1 }}>
            the<br />listening<br /><span style={{ color: BK_ACCENT }}>years</span>
          </div>
          <div style={{ width: 40, height: 2,
            background: `linear-gradient(90deg, transparent, ${BK_ACCENT}, transparent)`,
            margin: "24px auto", position: "relative", zIndex: 1 }} />
          <div style={{ fontFamily: "var(--serif)", fontStyle: "italic",
            fontSize: 12, color: BK_DIM, lineHeight: 1.6, position: "relative", zIndex: 1 }}>
            {since} – today
          </div>
          <div style={{
            position: "absolute", bottom: 32, left: 0, right: 0, textAlign: "center",
            fontFamily: "var(--mono)", fontSize: 8, letterSpacing: ".20em",
            textTransform: "uppercase", color: BK_FAINT, zIndex: 1,
            animation: "bk-pulse 2.4s ease-in-out infinite"
          }}>click to open</div>
          <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 18,
            background: "linear-gradient(to left, rgba(0,0,0,0.5), transparent)",
            pointerEvents: "none" }} />
        </div>
        <div style={{
          position: "absolute", top: 0, left: -14, bottom: 0, width: 14,
          background: `linear-gradient(to right, ${BK_SPINE}, oklch(0.28 0.08 330))`,
          borderRadius: "4px 0 0 4px",
          boxShadow: "-4px 0 12px rgba(0,0,0,0.5)"
        }} />
        <div style={{
          position: "absolute", bottom: -28, left: "5%", right: "5%", height: 28,
          background: "radial-gradient(ellipse at 50% 0%, rgba(0,0,0,0.5) 0%, transparent 80%)",
          pointerEvents: "none"
        }} />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //  VENDOR LOADER
  // ─────────────────────────────────────────────────────────────────────────────
  function loadVendor(cb, onFail) {
    if (window.St && window.St.PageFlip) { cb(); return; }
    const existing = document.getElementById("vendor-page-flip-js");
    if (existing) {
      const poll = setInterval(() => {
        if (window.St && window.St.PageFlip) { clearInterval(poll); cb(); }
      }, 60);
      return;
    }
    const s = document.createElement("script");
    s.id = "vendor-page-flip-js";
    s.src = "vendor-page-flip.js";
    s.onload = () => cb();
    s.onerror = () => { console.error("[BookSection] vendor-page-flip.js failed to load"); if (onFail) onFail(); };
    document.head.appendChild(s);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //  OPEN BOOK
  //  v4 fixes:
  //    Bug #1: scale computed via ResizeObserver on the stage element;
  //            targets ~80% of stage width; no hard cap (allows 4K fill).
  //    Bug #4: stage wrapper has no pointerdown intercept; annotation SVG
  //            has pointer-events:none.  useMouseEvents:true is set.
  //    Bug #5: ChapterRail is hoisted outside this component into BookSection
  //            so it lives in untransformed stage space.
  // ─────────────────────────────────────────────────────────────────────────────
  function BookOpen({ stageRef, onClose, onChapterClick, currentPage, setCurrentPage, portrait }) {
    const containerRef = useRef(null);
    const pageFlipRef  = useRef(null);
    const [vendorReady, setVendorReady]   = useState(!!(window.St && window.St.PageFlip));
    const [vendorFailed, setVendorFailed] = useState(false);
    const [annotVisible, setAnnotVisible] = useState(true);
    const [scale, setScale]               = useState(1);
    const [stageSize, setStageSize]       = useState({ w: 900, h: 600 });
    // v4 Bug #3: spreadRect tracks the actual rendered spread bounding box
    const [spreadRect, setSpreadRect]     = useState(null);

    // v4 Bug #1: scale fills ~80% of stage width at any resolution
    const calcScale = useCallback(() => {
      const stage = stageRef && stageRef.current;
      if (!stage) return;
      const sw = stage.offsetWidth;
      const sh = stage.offsetHeight;
      setStageSize({ w: sw, h: sh });

      const padH = 56; // top hint bar + bottom counter
      const availW = portrait ? sw * 0.88 : sw * 0.80;  // 80% of stage width
      const availH = sh - padH;
      const bookNatW = portrait ? PAGE_W : PAGE_W * 2;
      const scaleW = availW / bookNatW;
      const scaleH = availH / PAGE_H;
      // take the smaller so the book fits; no upper cap (allows 4K fill)
      setScale(Math.min(scaleW, scaleH));
    }, [portrait]);

    useEffect(() => {
      calcScale();
      const obs = new ResizeObserver(calcScale);
      const stage = stageRef && stageRef.current;
      if (stage) obs.observe(stage);
      return () => obs.disconnect();
    }, [calcScale]);

    // v4 Bug #3: measure the stf__parent after every flip + on resize
    const measureSpread = useCallback(() => {
      const stage = stageRef && stageRef.current;
      if (!stage) return;
      const parent = stage.querySelector(".stf__parent");
      if (!parent) return;
      const sr = stage.getBoundingClientRect();
      const pr = parent.getBoundingClientRect();
      setSpreadRect({
        left: pr.left - sr.left,
        top:  pr.top  - sr.top,
        width: pr.width,
        height: pr.height,
      });
    }, []);

    useEffect(() => {
      if (!vendorReady) return;
      // measure after a short delay to let StPageFlip settle
      const t = setTimeout(measureSpread, 200);
      return () => clearTimeout(t);
    }, [vendorReady, scale, measureSpread]);

    // Resize also re-measures spread
    useEffect(() => {
      const stage = stageRef && stageRef.current;
      if (!stage) return;
      const obs = new ResizeObserver(measureSpread);
      obs.observe(stage);
      return () => obs.disconnect();
    }, [measureSpread]);

    useEffect(() => {
      if (vendorReady) return;
      loadVendor(() => setVendorReady(true), () => setVendorFailed(true));
    }, []);

    useEffect(() => {
      if (!vendorReady || !containerRef.current) return;
      const pageEls = Array.from(containerRef.current.querySelectorAll(".book-page"));
      if (pageEls.length !== PAGE_COUNT) return;

      const pf = new window.St.PageFlip(containerRef.current, {
        width:               PAGE_W,
        height:              PAGE_H,
        size:                "fixed",
        // v4: portrait mode for narrow screens
        usePortrait:         portrait,
        maxShadowOpacity:    0.5,
        showCover:           true,
        // Bug #4: ensure mouse events enabled
        useMouseEvents:      true,
        mobileScrollSupport: false,
        flippingTime:        700,
        startZIndex:         10,
        drawShadow:          true,
        showPageCorners:     true,
        disableFlipByClick:  false,
      });

      pf.loadFromHTML(pageEls);

      pf.on("flip", e => {
        setCurrentPage(e.data);
        setAnnotVisible(false);
        setTimeout(() => {
          setAnnotVisible(true);
          measureSpread();
        }, 700);
      });

      pageFlipRef.current = pf;

      // measure once StPageFlip has laid out
      setTimeout(measureSpread, 300);

      return () => {
        if (pageFlipRef.current) {
          try { pageFlipRef.current.destroy(); } catch (_) {}
          pageFlipRef.current = null;
        }
      };
    }, [vendorReady, portrait]);

    // Keyboard nav
    useEffect(() => {
      const h = e => {
        if (e.key === "ArrowRight" || e.key === "PageDown") {
          pageFlipRef.current && pageFlipRef.current.flipNext();
        }
        if (e.key === "ArrowLeft" || e.key === "PageUp") {
          pageFlipRef.current && pageFlipRef.current.flipPrev();
        }
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", h);
      return () => window.removeEventListener("keydown", h);
    }, [onClose]);

    // Chapter click — passed in from BookSection (outside transform)
    const handleChapterClick = useCallback(pageIdx => {
      if (pageFlipRef.current) pageFlipRef.current.turnToPage(pageIdx);
    }, []);
    // expose to parent
    useEffect(() => {
      onChapterClick.current = handleChapterClick;
    }, [handleChapterClick]);

    const bookNaturalW = portrait ? PAGE_W : PAGE_W * 2;

    return (
      <div style={{ position: "absolute", inset: 0 }}>
        {/* Hint bar */}
        <div style={{
          position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
          fontFamily: "var(--mono)", fontSize: 8.5, letterSpacing: ".18em",
          textTransform: "uppercase", color: BK_FAINT, zIndex: 30, pointerEvents: "none",
          whiteSpace: "nowrap"
        }}>← → to turn pages · Esc to close</div>

        {/* Close button */}
        <button onClick={onClose} style={{
          position: "absolute", top: 8, right: 12,
          background: "rgba(17,15,23,0.80)", border: `1px solid ${BK_RULE}`,
          color: BK_DIM, cursor: "pointer",
          width: 34, height: 34, borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, zIndex: 30, backdropFilter: "blur(8px)"
        }}
          onMouseEnter={e => { e.currentTarget.style.color = BK_INK; }}
          onMouseLeave={e => { e.currentTarget.style.color = BK_DIM; }}
          title="Close book (Esc)"
        >✕</button>

        {/* Vendor failed → say so instead of an empty stage (close button above still works) */}
        {vendorFailed && !vendorReady && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            color: BK_DIM, fontFamily: "var(--mono)", fontSize: 12, letterSpacing: ".08em" }}>
            The book can't open right now — its page-flip engine failed to load.
          </div>
        )}

        {/* Book — centred in stage, scaled to fill; no pointer intercept on the centering wrapper */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          // Bug #4: no pointerEvents block here; let events reach StPageFlip's DOM
        }}>
          <div style={{
            transform: `scale(${scale})`,
            transformOrigin: "center center",
            position: "relative",
          }}>
            <div
              ref={containerRef}
              style={{ width: bookNaturalW, height: PAGE_H, position: "relative" }}
            >
              {Array.from({ length: PAGE_COUNT }, (_, i) => {
                const Comp = PAGE_RENDERERS[i];
                return (
                  <div key={i} className="book-page" data-density={PAGE_DENSITIES[i]}
                    style={{
                      width: PAGE_W, height: PAGE_H,
                      position: "absolute", top: 0, left: 0,
                      overflow: "hidden", boxSizing: "border-box"
                    }}>
                    <Comp />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Annotation overlay — pointer-events:none (Bug #4); uses spread bbox (Bug #3) */}
        <AnnotationLayer
          stageW={stageSize.w}
          stageH={stageSize.h}
          spreadRect={spreadRect}
          currentPage={currentPage}
          visible={annotVisible}
        />

        {/* Page counter */}
        <div style={{
          position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)",
          fontFamily: "var(--mono)", fontSize: 9, color: BK_FAINT,
          letterSpacing: ".14em", zIndex: 30, pointerEvents: "none"
        }}>
          {currentPage + 1} / {PAGE_COUNT}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //  ELABORATE SECTIONS — rendered below the stage in normal page flow
  //  Each chapter's full prose + larger chart, r-card idiom.
  // ─────────────────────────────────────────────────────────────────────────────

  function BackToBook() {
    return (
      <div style={{ marginBottom: 12 }}>
        <a href="#bk-stage"
          onClick={e => {
            e.preventDefault();
            const el = document.getElementById("bk-stage");
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          style={{
            fontFamily: "var(--mono)", fontSize: 8.5, letterSpacing: ".12em",
            textTransform: "uppercase",
            color: BK_ACCENT, textDecoration: "none",
            display: "inline-flex", alignItems: "center", gap: 5
          }}
        >
          ↑ back to the book
        </a>
      </div>
    );
  }

  function ElaborateCard({ id, roman, title, children }) {
    return (
      <div id={`bk-ch-${id}`} className="r-card" style={{
        marginBottom: 28,
        background: "#13111a",
        border: `1px solid ${BK_RULE}`,
        borderRadius: 8, padding: "24px 28px",
        scrollMarginTop: 24,
      }}>
        <BackToBook />
        <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: ".22em",
          textTransform: "uppercase", color: BK_ACCENT, marginBottom: 6 }}>
          {roman && `Chapter ${roman} · `}{title}
        </div>
        {children}
      </div>
    );
  }

  function ElaborateGenre() {
    const paras = useGenreNarrative();
    return (
      <ElaborateCard id="genre" roman="I" title="Genre Eras — How the Sound Shifted">
        <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 600,
          fontSize: 22, color: BK_INK, marginBottom: 16, lineHeight: 1.3 }}>
          How the sound shifted
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
          {paras.map((p, i) => (
            <p key={i} style={{ margin: 0, fontFamily: "var(--serif)", fontSize: 14,
              lineHeight: 1.78, color: i === 0 ? BK_INK : BK_DIM }}>{p}</p>
          ))}
        </div>
        <GenreStreamChart W={680} H={340} />
        <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: BK_FAINT,
          letterSpacing: ".08em", marginTop: 10 }}>
          Genre families by share of plays per year · Data: ROTATION.GENRE_FLOW
        </div>
      </ElaborateCard>
    );
  }

  function ElaborateHours() {
    const paras = useRidgeNarrative();
    return (
      <ElaborateCard id="hours" roman="II" title="Listening Hours — When the Music Plays">
        <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 600,
          fontSize: 22, color: BK_INK, marginBottom: 16, lineHeight: 1.3 }}>
          When the music plays
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
          {paras.map((p, i) => (
            <p key={i} style={{ margin: 0, fontFamily: "var(--serif)", fontSize: 14,
              lineHeight: 1.78, color: i === 0 ? BK_INK : BK_DIM }}>{p}</p>
          ))}
        </div>
        <HourRidgeChart W={680} CH={undefined} />
        <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: BK_FAINT,
          letterSpacing: ".08em", marginTop: 10 }}>
          Hour-of-day ridgeline by year · Data: ROTATION.CLOCK_BY_YEAR
        </div>
      </ElaborateCard>
    );
  }

  function ElaborateArtists() {
    const paras = useArtistErasSummary();
    return (
      <ElaborateCard id="artists" roman="III" title="Artist Eras — Who Commanded the Years">
        <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 600,
          fontSize: 22, color: BK_INK, marginBottom: 16, lineHeight: 1.3 }}>
          Who commanded the years
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
          {paras.map((p, i) => (
            <p key={i} style={{ margin: 0, fontFamily: "var(--serif)", fontSize: 14,
              lineHeight: 1.78, color: i === 0 ? BK_INK : BK_DIM }}>{p}</p>
          ))}
        </div>
        <ArtistEraBumpChart W={680} H={380} />
        <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: BK_FAINT,
          letterSpacing: ".08em", marginTop: 10 }}>
          Top-10 artist rank per year · Data: ROTATION.ERAS
        </div>
      </ElaborateCard>
    );
  }

  function ElaborateMilestones() {
    const paras = useMilestonesNarrative();
    return (
      <ElaborateCard id="milestones" roman="IV" title="Milestones & Streaks — The Accumulated Weight">
        <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 600,
          fontSize: 22, color: BK_INK, marginBottom: 16, lineHeight: 1.3 }}>
          The accumulated weight
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
          {paras.map((p, i) => (
            <p key={i} style={{ margin: 0, fontFamily: "var(--serif)", fontSize: 14,
              lineHeight: 1.78, color: i === 0 ? BK_INK : BK_DIM }}>{p}</p>
          ))}
        </div>
        <MilestonesChart W={680} H={360} />
        <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: BK_FAINT,
          letterSpacing: ".08em", marginTop: 10 }}>
          Scrobbles per year + milestone crossings · Data: ROTATION.ERAS + ROTATION.TOTALS
        </div>
      </ElaborateCard>
    );
  }

  function ElaborateTaste() {
    const paras = useTasteChaptersNarrative();
    return (
      <ElaborateCard id="taste" roman="V" title="Taste Chapters — The Chapters of a Musical Life">
        <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 600,
          fontSize: 22, color: BK_INK, marginBottom: 16, lineHeight: 1.3 }}>
          The chapters of a musical life
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
          {paras.map((p, i) => (
            <p key={i} style={{ margin: 0, fontFamily: "var(--serif)", fontSize: 14,
              lineHeight: 1.78, color: i === 0 ? BK_INK : BK_DIM }}>{p}</p>
          ))}
        </div>
        <TasteChapterChart W={680} H={320} />
        <div style={{ fontFamily: "var(--mono)", fontSize: 8, color: BK_FAINT,
          letterSpacing: ".08em", marginTop: 10 }}>
          Auto-segmented taste chapters · Data: ROTATION.INSIGHTS.TASTE_ERAS
        </div>
      </ElaborateCard>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //  BOOK SECTION — stage + elaborate sections in normal page flow
  //  v4: BookSection is the top-level component; ChapterRail lives here
  //      (outside the transformed book wrapper) to fix Bug #5.
  // ─────────────────────────────────────────────────────────────────────────────
  function BookSection() {
    const [phase, setPhase] = useState("closed");
    const [currentPage, setCurrentPage] = useState(0);
    const stageRef = useRef(null);
    const chapterClickRef = useRef(null);  // set by BookOpen

    // detect portrait mode from stage width
    const [portrait, setPortrait] = useState(false);
    useEffect(() => {
      const stage = stageRef.current;
      if (!stage) return;
      const check = () => setPortrait(stage.offsetWidth < PORTRAIT_BP);
      check();
      const obs = new ResizeObserver(check);
      obs.observe(stage);
      return () => obs.disconnect();
    }, []);

    const openBook  = useCallback(() => setPhase("open"),   []);
    const closeBook = useCallback(() => setPhase("closed"), []);

    const handleChapterClick = useCallback(pageIdx => {
      if (chapterClickRef.current) chapterClickRef.current(pageIdx);
    }, []);

    return (
      <div>
        {/* ── Stage ── */}
        <div
          id="bk-stage"
          ref={stageRef}
          style={{
            position: "relative",
            width: "100%",
            height: "88vh",
            minHeight: 480,
            background: BK_STAGE,
            borderRadius: 10,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 36,
            // Bug #4: no pointer intercept on the stage wrapper itself
          }}
        >
          {phase === "closed" && (
            <>
              <div style={{
                position: "absolute", bottom: "22%", left: "8%", right: "8%", height: 2,
                background: "radial-gradient(ellipse at 50% 50%, oklch(0.30 0.08 330 / 0.30) 0%, transparent 70%)",
                pointerEvents: "none"
              }} />
              <ClosedBook onClick={openBook} />
            </>
          )}
          {phase === "open" && (
            <>
              {/* Bug #5: ChapterRail OUTSIDE the scaled book wrapper */}
              <ChapterRail currentPage={currentPage} onChapterClick={handleChapterClick} />
              <BookOpen
                stageRef={stageRef}
                onClose={closeBook}
                onChapterClick={chapterClickRef}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                portrait={portrait}
              />
            </>
          )}
        </div>

        {/* ── Elaborate Sections (below the stage, normal page flow) ── */}
        <div style={{ marginTop: 8 }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: ".18em",
            textTransform: "uppercase", color: BK_FAINT, marginBottom: 20 }}>
            Full chapters · scroll to read in detail
          </div>
          <ElaborateGenre />
          <ElaborateHours />
          <ElaborateArtists />
          <ElaborateMilestones />
          <ElaborateTaste />
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //  LEGACY: BookLaunchButton
  // ─────────────────────────────────────────────────────────────────────────────
  function BookLaunchButton() {
    return (
      <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: BK_FAINT,
        letterSpacing: ".12em", textTransform: "uppercase", padding: "8px 0" }}>
        scroll down · the book is rendered below ↓
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //  CSS
  // ─────────────────────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────────
  //  EXPORTS
  // ─────────────────────────────────────────────────────────────────────────────
  Object.assign(window, { BookSection, BookLaunchButton });
})();
