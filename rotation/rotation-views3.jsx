// rotation-views3.jsx — Stories (mined insights) + artist Search overlay
// exports: StoriesView, SearchOverlay

// fmtDate comes from core (top-level lexical binding shared across scripts — redeclaring it
// here would throw; audit-2026-07-18 dedup)
const yearsOf = (days) => (days / 365.25).toFixed(1);
// an artist id is navigable if it has EITHER a kept full page (byId) OR an EXPLORE record
// (rendered via MiniArtistView). Use this for every artist click-gate so the long tail is
// reachable from Stories/gigs too — not just the kept top-400 (matches the map fix).
const artistHasPage = (id) => { const R = window.ROTATION; return !!(id && R && (R.byId[id] || (R.expById && R.expById[id]))); };
const hueOfName = (name) => (window.ROTATION.byId[window.ROTATION.slug(name)] || {}).hue != null
  ? window.ROTATION.byId[window.ROTATION.slug(name)].hue
  : hashInt(name, 0) % 360;

// ── The comfort zone: audio-axis display names + the R.AUDIO column each one lives in ─────────
// TWIN of rotation-lab.jsx's FP_LABEL / FP_AUDIO_IDX — the #lab TasteFingerprint prototype this
// module graduated from on 2026-09-21. COPIED, not shared: rotation-lab.jsx only loads on #lab,
// so reaching into it would make the Stories feed depend on a hidden route. If the lab's pair
// moves, move this one too.
// The ORDER TRAP the lab documents is real and worth repeating: R.AUDIO rows are
// [energy, valence, acoustic, tempo, dance, instr, …] while AUDIO_DIST.axes is
// [energy, valence, dance, acoustic, instr, tempo]. Map by NAME through ST_FP_COL, never by
// position — the two disagree on four of six slots.
const ST_FP_LABEL = { energy: "Energy", valence: "Positivity", dance: "Danceability", acoustic: "Acoustic", instr: "Instrumental", tempo: "Tempo" };
const ST_FP_COL = { energy: 0, valence: 1, acoustic: 2, tempo: 3, dance: 4, instr: 5 };
// ── Lyrical diet: the semantic colour wheel ──────────────────────────────────────────────────
// Fuad 2026-09-21: "since we have so many colors, we can figure out a way to sort it more nicely
// to make a gradient or/and associate colors with themes." BOTH, and they are the same table.
// What this replaces: ST_DIET_HUE(i) = i x 137.508 mod 360, a golden-angle spin on the theme's
// INDEX in THEMES.names. Maximally distinct and maximally arbitrary — grief came out gold, party
// came out blue, and eighteen index-neighbours stacked as confetti. Hue is now hand-assigned by
// MEANING (reds for the violent themes, golds for the appetites, greens for the outdoors and the
// exits, blues for the cold city, indigo and violet for the dead and the damaged, rose for the
// heart) and the STACK IS SORTED BY IT, so every year's bar climbs the same wheel: blood at the
// foot, rose at the crown.
// Listed IN WHEEL ORDER, which is exactly the stack order — keep the numbers monotonic and the
// table keeps reading as its own documentation. Neighbours sit 12-34 degrees apart; the tightest
// run is the violet-to-rose tail, where six themes share a quarter of the wheel, which is the
// price of honouring the semantic grouping over even spacing. Keyed by NAME, not index, so the
// degraded top-6 arc payload colours identically to the full matrix; a theme the classifier adds
// later falls through to a hashed hue rather than going colourless.
const ST_DIET_HUES = {
  "violence & murder": 12,             // blood
  "anger & defiance": 30,              // red
  "war & battle": 48,                  // ember
  "nostalgia & memory": 70,            // amber
  "money & the street": 88,            // old gold
  "party & hedonism": 104,             // bright gold
  "nature & the elements": 138,        // green
  "freedom & escape": 162,             // spring green
  "identity & becoming": 186,          // teal
  "politics & society": 212,           // steel
  "night & the city": 240,             // deep blue
  "alienation & emptiness": 262,       // cold blue
  "death & grief": 282,                // indigo
  "faith & the occult": 300,           // deep purple
  "madness & the mind": 318,           // violet
  "addiction & self-destruction": 332, // violet-magenta
  "heartbreak & loss": 346,            // rose
  "love & desire": 358,                // pink
};
const ST_DIET_HUE = (th) => (ST_DIET_HUES[th] != null ? ST_DIET_HUES[th] : hashInt(String(th), 7) % 360);


// ── Who rose, who fell: the artist rows of the slope chart ───────────────────────────────────
// Fuad 2026-09-14: "I only wanted to transition the artist movements, so their texts and bars
// moving, the rest of the new on charts, probably just appearing." The module used to remount
// wholesale on a pair change — one keyed fade over the headline, the caption AND the chart — so
// nothing could travel: every dot was a brand new node at its new height. The rows now live in
// their own component, keyed by artist name, which is what lets React hand the same <g> back on
// the next pair; each artist's two endpoints then ease from where they are to where they belong.
//
// Two deliberate limits. An artist that was not on the previous pair's chart is SEEDED at its
// target, so it appears rather than flying in from an address it never had. And the line weight
// and opacity read from the TARGET ranks, not the in-flight ones, so a line does not thin and
// thicken while it swings.
//
// The easing is a rAF loop rather than a CSS transition because an SVG <line>'s x1/y1/x2/y2 are
// plain attributes, not the CSS geometry properties cx/cy/r/x/y — they cannot be transitioned.
// Fourteen rows re-rendering for about twenty-five frames is cheap. prefers-reduced-motion skips
// the loop and snaps.
function SlopeRows({ rows, X_L, X_R, goIf, isClickable }) {
  const [, bump] = React.useReducer((n) => n + 1, 0);
  const [hot, setHot] = React.useState(null);   // hovered artist — their line lifts, others dim
  const posRef = React.useRef(new Map());
  const rafRef = React.useRef(0);
  const calm = typeof window !== "undefined" && window.matchMedia
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const targets = new Map(rows.map((r) => [r.name, { y1: r.y1, y2: r.y2 }]));
  for (const [name, t] of targets) if (!posRef.current.has(name)) posRef.current.set(name, { y1: t.y1, y2: t.y2 });
  for (const name of Array.from(posRef.current.keys())) if (!targets.has(name)) posRef.current.delete(name);

  const sig = rows.map((r) => r.name + ":" + r.y1 + ":" + r.y2).join("|");
  React.useEffect(() => {
    if (calm) {
      for (const [name, t] of targets) posRef.current.set(name, { y1: t.y1, y2: t.y2 });
      bump();
      return;
    }
    const step = () => {
      let moving = false;
      for (const [name, t] of targets) {
        const p = posRef.current.get(name);
        if (!p) continue;
        for (const k of ["y1", "y2"]) {
          const to = t[k], from = p[k];
          // an endpoint that gains or loses a year has no path to travel — it cuts
          if (to === null || from === null) { if (from !== to) { p[k] = to; moving = true; } continue; }
          const d = to - from;
          if (Math.abs(d) < 0.25) { p[k] = to; } else { p[k] = from + d * 0.22; moving = true; }
        }
      }
      bump();
      if (moving) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [sig]);

  const trunc = (n) => (n.length > 18 ? n.slice(0, 17) + "\u2026" : n);
  return (
    <>
      {rows.map((r) => {
        const p = posRef.current.get(r.name) || { y1: r.y1, y2: r.y2 };
        const y1 = p.y1, y2 = p.y2;
        const col = "oklch(0.72 0.14 " + r.hue + ")";
        const rising = r.y1 !== null && r.y2 !== null && r.y2 < r.y1;
        const falling = r.y1 !== null && r.y2 !== null && r.y2 > r.y1;
        const strokeW = rising ? 2.0 : 1.3;
        const op = rising ? 0.9 : falling ? 0.55 : 0.78;
        const click = isClickable(r.name);
        const cur = { cursor: click ? "pointer" : "default" };
        return (
          <g key={r.name} onMouseEnter={() => setHot(r.name)} onMouseLeave={() => setHot(null)}
            style={{ opacity: hot && hot !== r.name ? 0.15 : 1, transition: "opacity .18s ease" }}>
            {y1 !== null && y2 !== null && (
              <line x1={X_L} y1={y1.toFixed(1)} x2={X_R} y2={y2.toFixed(1)}
                stroke={col} strokeWidth={strokeW} strokeLinecap="round" opacity={op} />
            )}
            {/* ghost "new" line from the left edge if only in cur */}
            {y1 === null && y2 !== null && (
              <line x1={X_L} y1={y2.toFixed(1)} x2={X_R} y2={y2.toFixed(1)}
                stroke={col} strokeWidth="1" strokeDasharray="3 3" opacity="0.35" />
            )}
            {/* ghost "gone" line to the right edge if only in prev */}
            {y1 !== null && y2 === null && (
              <line x1={X_L} y1={y1.toFixed(1)} x2={X_R} y2={y1.toFixed(1)}
                stroke={col} strokeWidth="1" strokeDasharray="3 3" opacity="0.35" />
            )}
            {y1 !== null && (
              <g style={cur} onClick={() => goIf(r.name)}>
                <circle cx={X_L} cy={y1.toFixed(1)} r="3.5" fill={col} opacity={op} />
                <text x={X_L - 8} y={(y1 + 3.8).toFixed(1)} fill={col} fontSize="9.5" opacity={op}
                  fontFamily="var(--mono)" textAnchor="end">
                  {trunc(r.name)}
                  <tspan fill="var(--ink-faint)" fontSize="8.5"> {r.prevP}</tspan>
                </text>
              </g>
            )}
            {y2 !== null && (
              <g style={cur} onClick={() => goIf(r.name)}>
                <circle cx={X_R} cy={y2.toFixed(1)} r="3.5" fill={col} opacity={op} />
                <text x={X_R + 8} y={(y2 + 3.8).toFixed(1)} fill={col} fontSize="9.5" opacity={op}
                  fontFamily="var(--mono)" textAnchor="start">
                  {trunc(r.name)}
                  <tspan fill="var(--ink-faint)" fontSize="8.5"> {r.curP}</tspan>
                </text>
              </g>
            )}
            {y1 === null && y2 !== null && (
              <text x={X_L - 8} y={(y2 + 3.8).toFixed(1)} fill={col} fontSize="8" opacity="0.55"
                fontFamily="var(--mono)" textAnchor="end" fontStyle="italic">new</text>
            )}
            {y1 !== null && y2 === null && (
              <text x={X_R + 8} y={(y1 + 3.8).toFixed(1)} fill={col} fontSize="8" opacity="0.55"
                fontFamily="var(--mono)" textAnchor="start" fontStyle="italic">gone</text>
            )}
          </g>
        );
      })}
    </>
  );
}

// TweenNum LIVES IN rotation-core.jsx NOW (2026-09-19). The Overview took it up for its stat
// strip and Scrobbles counter, and core loads first — two declarations of the same name at
// shared top-level scope is a trap, so the one copy sits beside Spark. Used below, unchanged.

// Swipe (touch) and arrow keys (while hovered) drive a prev/next pair — the year-in-review and
// slope-chart navs only had the two small buttons.
function usePairNav(ref, prev, next) {
  React.useEffect(() => {
    const el = ref.current; if (!el) return;
    let x0 = null, y0 = null, over = false;
    const ts = (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; };
    const te = (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) (dx > 0 ? prev : next)();
      x0 = null;
    };
    const en = () => { over = true; }, lv = () => { over = false; };
    const kd = (e) => {
      if (!over || e.altKey || e.metaKey || e.ctrlKey) return;
      if (e.key === "ArrowLeft") { prev(); e.preventDefault(); }
      else if (e.key === "ArrowRight") { next(); e.preventDefault(); }
    };
    el.addEventListener("touchstart", ts, { passive: true }); el.addEventListener("touchend", te);
    el.addEventListener("mouseenter", en); el.addEventListener("mouseleave", lv);
    window.addEventListener("keydown", kd);
    return () => {
      el.removeEventListener("touchstart", ts); el.removeEventListener("touchend", te);
      el.removeEventListener("mouseenter", en); el.removeEventListener("mouseleave", lv);
      window.removeEventListener("keydown", kd);
    };
  });
}

// ════════════════════════ STORIES ════════════════════════

// "The songs you own twice" — the cross-library covers graph (mb-covers-story.js, lazy).
// Each entry: {t: title, w: [writers], p: [[artistSlug, artistName, trackSlug|null]]}
function CoversStory({ go }) {
  const [d, setD] = React.useState(window.ROTATION_COVSTORY || null);
  React.useEffect(() => {
    if (window.ROTATION_COVSTORY) return;
    const s = document.createElement("script"); s.src = "mb-covers-story.js";
    s.onload = () => setD(window.ROTATION_COVSTORY); s.onerror = () => {};
    document.head.appendChild(s);
  }, []);
  if (!d || !d.length) return null;
  const top = d.slice(0, 12);
  return (
    <section className="st-card st-hero">
      <div className="st-label">The songs you own twice</div>
      <div className="st-big"><em>{d.length}</em> songs live more than once in your library.</div>
      <div className="st-sub">The same composition, recorded by different artists you actually play — found by joining every top track to its MusicBrainz work. The champion: <em>{top[0].t}</em>, held by {top[0].p.length} of your artists.</div>
      <div style={{ display: "grid", gap: 9, marginTop: 14 }}>
        {top.map((g, i) => (
          <div key={i} style={{ fontSize: 13 }}>
            <b>{g.t}</b>{g.w && g.w.length ? <span className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", marginLeft: 8 }}>written by {g.w.slice(0, 2).join(", ")}</span> : null}
            <div className="r-mono" style={{ fontSize: 10.5, color: "var(--ink-soft)", marginTop: 2 }}>
              {g.p.map(([sl, n, ts], j) => (
                <React.Fragment key={sl + j}>{j > 0 ? " · " : ""}<a className="st-alink" onClick={() => ts ? go("track", sl + "~" + ts) : go("artist", sl)}>{n}</a></React.Fragment>
              ))}
            </div>
          </div>
        ))}
      </div>
      {d.length > top.length && <div className="st-sub" style={{ marginTop: 10 }}>…and {d.length - top.length} more shared songs across the library.</div>}
    </section>
  );
}

const SHOW_STORIES_LEDE = false;
function StoriesView({ t, go, seed }) {
  const R = window.ROTATION;
  const I = R.INSIGHTS;
  // ── TOC / chapters / deep links ──
  // Sections self-register: after render we read each card's .st-label from the DOM (conditional
  // cards are handled for free), assign stable ids, build the sticky TOC, and scrollspy it.
  const feedRef = React.useRef(null);
  const [toc, setToc] = React.useState([]);
  const [active, setActive] = React.useState("");
  // WEIGHTED RAIL (Fuad 2026-08-13): when the chapter rail is taller than the viewport it used
  // to spill past the bottom (fixed element — unreachable). --stp = page scroll progress 0..1;
  // the CSS anchors the rail top at page top, bottom at page bottom, sliding in between, so the
  // overflow flips to wherever you AREN'T.
  const tocRef = React.useRef(null);
  // REAL ALBUM ART FOR "ALBUM WEEKS" (Fuad 2026-09-14: it showed "only placeholders currently").
  // GenCover draws a generated sleeve when it has no image, which is right for an ARTIST — there is
  // no canonical picture of one — but an album has an actual cover, and 19,948 of the media index's
  // 33,018 albums carry one. The index is lazy and not otherwise needed here, so it loads after
  // paint and the sleeves upgrade in place when it lands; the placeholder is the fallback, not the
  // default. Declared with the other hooks, above every early return.
  const [mediaReady, setMediaReady] = React.useState(!!window.ROTATION_MEDIA);
  React.useEffect(() => {
    if (window.ROTATION_MEDIA) { if (!mediaReady) setMediaReady(true); return; }
    if (window.loadScript) window.loadScript("media-index.js", "rotation-media-js", () => setMediaReady(true));
  }, []);
  // THE READING (2026-09-21) — the listening portrait + four era digests. Authored prose, not a
  // computed insight, so it lives in its own tracked file (reading.js) instead of the rebuilt data
  // shards, and index.html does not carry it: ~5 KB of text nobody needs until they reach this
  // feed. Same lazy idiom as the album index above and day-series on Overview — id-guarded
  // loadScript, state set on arrival, module renders nothing until then (no placeholder: a card
  // that flashes an empty frame is worse than one that simply appears). Declared here with the
  // other hooks, ABOVE every early return — a hook under a conditional return is React #310 at
  // runtime and check-jsx cannot see it.
  const [reading, setReading] = React.useState(window.ROTATION_READING || null);
  React.useEffect(() => {
    if (window.ROTATION_READING) { setReading(window.ROTATION_READING); return; }
    if (window.loadScript) window.loadScript("reading.js", "rotation-reading-js", () => setReading(window.ROTATION_READING || null));
  }, []);
  const [readingOpen, setReadingOpen] = React.useState({});   // era index → expanded? (all collapsed at rest, any number may be open)

  // ════ THREE LAB MODULES GRADUATE (2026-09-21) ════════════════════════════════════════════
  // The comfort zone · Lyrical diet · Who brought you here, ported out of rotation-lab.jsx. Each
  // reads as a STORY at rest — claim first, then evidence rows — but KEEPS the prototype's input
  // (Fuad: "interactivity is key, providing power to the audience"), so the reader can aim it.
  // EVERY hook below sits here with the rest, ABOVE every early return: a hook under a
  // conditional is React #310 at runtime and check-jsx cannot see it (same note as The Reading).
  const [czPick, setCzPick] = React.useState("");        // comfort-zone scorer input
  const [dietSel, setDietSel] = React.useState(null);    // lyrical-diet theme PINNED by a chip click — drives the stack AND the exemplar panel
  const [dietHot, setDietHot] = React.useState(null);    // …and the one merely hovered (2026-09-21): previews the stack, NEVER the panel
  const [dietAll, setDietAll] = React.useState(false);   // …and whether the long tail of chips is open
  const [genPick, setGenPick] = React.useState("");      // genealogy tracer input
  // genealogy.js is lazy (slug → [who you heard just before, first play]); the module renders
  // nothing until it lands, exactly like The Reading below. A 404 leaves genReady false forever,
  // which is the intended degrade — the section simply never appears.
  const [genReady, setGenReady] = React.useState(!!window.ROTATION_GENEALOGY);
  React.useEffect(() => {
    if (window.ROTATION_GENEALOGY) { if (!genReady) setGenReady(true); return; }
    // the lab uses this same script id on purpose: loadScript is id-guarded, so whichever route
    // asks first pays for the fetch and the other piggybacks on its load event.
    if (window.loadScript) window.loadScript("genealogy.js", "rotation-genealogy-js", () => setGenReady(!!window.ROTATION_GENEALOGY));
  }, []);
  // ONE memoised option list under BOTH datalists below. A React element array is an immutable
  // description, so the same array may hang under two parents; what it saves is rebuilding 1,061
  // options on every keystroke in either input.
  const artistOptions = React.useMemo(() => (R.ARTISTS || []).map(a => <option key={a.id} value={a.name} />), []);

  // ── THE COMFORT ZONE ── the six bands, plus the two precomputed story rows.
  // AUDIO_DIST.cdf[axis] is a 101-bucket cumulative curve in per-mille of PLAYS, so p25/p50/p75
  // are quantile reads of every play logged, not an average over artists — which is why the
  // bracket can end up narrower than any single artist sits.
  const comfort = React.useMemo(() => {
    const D = R.AUDIO_DIST;
    if (!D || !D.cdf || !D.axes || !D.axes.length) return null;
    const q = (c, pm) => { for (let v = 0; v <= 100; v++) if (c[v] >= pm) return v; return 100; };
    const bands = D.axes.map((name, i) => {
      const c = D.cdf[i];
      const dens = c.map((v, j) => (j ? v - c[j - 1] : v));   // cumulative → per-bucket mass
      return { name, label: ST_FP_LABEL[name] || name, p25: q(c, 250), p50: q(c, 500), p75: q(c, 750), dens, max: Math.max.apply(null, dens) };
    });
    const byWidth = bands.slice().sort((a, b) => (a.p75 - a.p25) - (b.p75 - b.p25));
    // THE STORY ROWS. Universe: the 100 heaviest artists carrying a measured audio row — small
    // enough that "the outlier you love anyway" means something (a twelve-play curio outside the
    // band on six axes is noise, not a story) and cheap enough to score once at mount.
    const pool = (R.ARTISTS || []).slice().sort((a, b) => b.plays - a.plays)
      .filter(a => R.AUDIO && R.AUDIO[a.id]).slice(0, 100);
    const scored = pool.map(a => {
      const row = R.AUDIO[a.id];
      const miss = []; let hits = 0, dist = 0;
      for (const b of bands) {
        const v = Math.round((row[ST_FP_COL[b.name]] || 0) * 100);
        if (v >= b.p25 && v <= b.p75) hits++;
        else { miss.push({ name: b.name, label: b.label, v: v, p25: b.p25, p75: b.p75 }); dist += v < b.p25 ? b.p25 - v : v - b.p75; }
      }
      return { id: a.id, name: a.name, hue: a.hue, plays: a.plays, hits, dist, miss };
    });
    // Ties break on total distance from the band edges, then on plays. Both tiebreaks earn their
    // keep on today's data: four artists sit 6/6 and distance is 0 for all four, so weight decides.
    const inside = scored.slice().sort((a, b) => (b.hits - a.hits) || (a.dist - b.dist) || (b.plays - a.plays))[0] || null;
    const outside = scored.slice().sort((a, b) => (b.miss.length - a.miss.length) || (b.plays - a.plays) || (b.dist - a.dist))[0] || null;
    return { bands, tight: byWidth[0], loose: byWidth[byWidth.length - 1], inside, outside };
  }, []);
  // The picked artist scored against those bands: null until something is typed, {found:false}
  // when the name resolves to nobody carrying a measured row (below the top ~6,500 artists).
  const czScore = React.useMemo(() => {
    if (!comfort || !czPick.trim()) return null;
    const pid = (R.idForName && R.idForName(czPick)) || R.slug(czPick);
    const row = pid && R.AUDIO ? R.AUDIO[pid] : null;
    if (!row) return { found: false };
    const rec = R.byId[pid] || (R.expById && R.expById[pid]) || null;
    const vals = {};
    for (const b of comfort.bands) vals[b.name] = Math.round((row[ST_FP_COL[b.name]] || 0) * 100);
    const inB = (b) => vals[b.name] >= b.p25 && vals[b.name] <= b.p75;
    return { found: true, id: pid, name: (rec && rec.name) || czPick, vals, hits: comfort.bands.filter(inB), miss: comfort.bands.filter(b => !inB(b)) };
  }, [czPick, comfort]);

  // ── LYRICAL DIET ── one normalised shape for both payload generations.
  // THEMES.matrix carries EVERY theme's per-mille share per year, which is what lets the whole
  // diet stack and the picker reach all eighteen. Older payloads only have THEMES.arc — the top
  // six, as fractions — so the module degrades to that and says so in its sub rather than
  // implying the other twelve do not exist.
  const diet = React.useMemo(() => {
    const T = I.THEMES;
    if (!T) return null;
    const M = T.matrix;
    let full, names, years;
    if (M && M.rows && M.rows.length >= 4 && M.years && T.names && T.names.length) {
      full = true; names = T.names;
      years = M.years.map((y, i) => ({ year: y, plays: (M.plays && M.plays[i]) || 0, v: M.rows[i].map(p => p / 1000) }));
    } else if (T.arc && T.arc.themes && T.arc.years && T.arc.years.length >= 4) {
      full = false; names = T.arc.themes;
      years = T.arc.years.map(y => ({ year: y.year, plays: y.plays || 0, v: names.map(th => y.byTheme[th] || 0) }));
    } else return null;
    const shares = (T.shares || []).filter(s => s.theme);
    // Colour key: the theme's NAME through ST_DIET_HUES (2026-09-21 — it used to be its position
    // in THEMES.names through the golden angle), so a theme keeps its hue whether the stack is
    // the full eighteen or the degraded six, and the degrade path needs no separate mapping.
    // EVERY theme a chip can carry still needs an entry, not only the ones drawn — on a
    // matrix-less payload the chips come from shares and reach past the arc's six, and a theme
    // with no hue falls out of the selectable test and leaves a dead chip.
    const key = ((T.names && T.names.length) ? T.names : names).slice();
    for (const s of shares) if (key.indexOf(s.theme) < 0) key.push(s.theme);
    for (const th of names) if (key.indexOf(th) < 0) key.push(th);
    const hue = {};
    for (const th of key) hue[th] = ST_DIET_HUE(th);
    // STACK ORDER (Fuad 2026-09-21: "sort it more nicely to make a gradient"). ONE hue-sorted
    // order, computed once and used by every year, so the bars agree on where a theme lives and
    // the column reads as a climb up the wheel. `draw` is that order REVERSED: the column is
    // justify-content:flex-end, so the FIRST child sits highest and the LAST drawn lands at the
    // foot — the low hues have to go out last to sit at the bottom.
    const draw = names.map((_, j) => j).sort((a, b) => hue[names[a]] - hue[names[b]]).reverse();
    // The headline: first-three-years average against the last three, in percentage POINTS.
    const n = years.length, w = Math.min(3, n);
    const first = years.slice(0, w), last = years.slice(-w);
    const mean = (arr, j) => arr.reduce((s, y) => s + (y.v[j] || 0), 0) / arr.length;
    const shift = names.map((th, j) => ({ th, j, d: (mean(last, j) - mean(first, j)) * 100 })).sort((a, b) => b.d - a.d);
    return { full, names, years, hue, draw, riser: shift[0], fader: shift[shift.length - 1], chips: shares.slice(0, 8), rest: shares.slice(8) };
  }, []);

  // ── WHO BROUGHT YOU HERE ── gateways ranked by INTRODUCED PLAYS, plus the library's heaviest
  // ancestry chain as a rendered specimen. Ranking by child COUNT (what the lab did) floats
  // artists whose twenty doors all opened onto nothing: one 5,000-play introduction is the bigger
  // event, so the sum of what walked through is the measure (Fuad 2026-09-21).
  const gen = React.useMemo(() => {
    const G = window.ROTATION_GENEALOGY;
    if (!G) return null;
    const recOf = (id) => R.byId[id] || (R.expById && R.expById[id]) || null;
    const nameOf = (id) => { const r = recOf(id); return (r && r.name) || id; };
    const playsOf = (id) => { const r = recOf(id); return (r && r.plays) || 0; };
    const hueOf = (id) => { const r = recOf(id); return r && r.hue != null ? r.hue : hashInt(String(id), 0) % 360; };
    const kids = {};
    for (const k in G) { const p = G[k][0]; if (p) (kids[p] = kids[p] || []).push(k); }
    const gateways = Object.keys(kids).map(g => {
      const ks = kids[g].slice().sort((a, b) => playsOf(b) - playsOf(a));
      return { id: g, name: nameOf(g), hue: hueOf(g), kids: ks, n: ks.length, introduced: ks.reduce((s, k) => s + playsOf(k), 0) };
    }).sort((a, b) => (b.introduced - a.introduced) || (b.n - a.n));
    // THE SPECIMEN. Walk parent links to the root with the lab's cycle guard (a self-referential
    // pair would otherwise spin forever), keep every chain of four or more, take the one whose
    // members carry the most plays — a long chain of strangers is a worse specimen than a short
    // one of records that were actually worn out.
    const walk = (id) => { const out = []; let cur = id, guard = 0; while (cur && guard++ < 24 && out.indexOf(cur) < 0) { out.unshift(cur); cur = G[cur] ? G[cur][0] : null; } return out; };
    let best = null;
    for (const k in G) {
      const ids = walk(k);
      if (ids.length < 4) continue;
      const tot = ids.reduce((s, c) => s + playsOf(c), 0);
      if (!best || tot > best.tot) best = { tot, ids };
    }
    const chain = best ? best.ids.map(id => ({ id, name: nameOf(id), plays: playsOf(id), date: G[id] ? G[id][1] : null })) : null;
    return { G, kids, gateways, chain, chainPlays: best ? best.tot : 0, nameOf, playsOf };
  }, [genReady]);
  const genTrace = React.useMemo(() => {
    if (!gen || !genPick.trim()) return null;
    const G = gen.G;
    const pid = (R.idForName && R.idForName(genPick)) || R.slug(genPick);
    if (!pid || !G[pid]) return { found: false };
    const chain = []; let cur = pid, guard = 0;
    while (cur && guard++ < 24 && !chain.some(c => c.id === cur)) {
      chain.unshift({ id: cur, name: gen.nameOf(cur), date: G[cur] ? G[cur][1] : null });
      cur = G[cur] ? G[cur][0] : null;
    }
    return { found: true, id: pid, name: gen.nameOf(pid), chain, kids: (gen.kids[pid] || []).slice().sort((a, b) => gen.playsOf(b) - gen.playsOf(a)) };
  }, [gen, genPick]);
  // keyed album\x00artist, the same key rotation-calendar builds
  const albumCover = React.useMemo(() => {
    const M = window.ROTATION_MEDIA; if (!M || !M.albums || !M.artists) return {};
    const out = {};
    for (const al of M.albums) if (al[6]) out[al[0] + "\x00" + M.artists[al[1]]] = al[6];
    return out;
  }, [mediaReady]);
  React.useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const el = tocRef.current; if (!el) return;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const pr = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0.5;
        el.style.setProperty("--stp", String(pr));
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => { window.removeEventListener("scroll", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);
  const _slugify = (s) => (s || "").toLowerCase().split("·")[0].trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  React.useEffect(() => {
    const feed = feedRef.current; if (!feed) return;
    const items = [];
    for (const sec of feed.querySelectorAll("section")) {
      const lbl = sec.querySelector(".st-label"); if (!lbl) continue;
      const label = lbl.textContent.split("·")[0].trim();
      const id = "st-" + _slugify(label);
      sec.id = id;
      items.push({ id, label });
    }
    setToc(items);
    if (seed) {
      const el = document.getElementById("st-" + _slugify(decodeURIComponent(seed)));
      if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    }
    const obs = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) setActive(e.target.id); },
      { rootMargin: "-12% 0px -72% 0px" });
    for (const it of items) { const el = document.getElementById(it.id); if (el) obs.observe(el); }
    return () => obs.disconnect();
    // `reading` is a dependency because The Reading is the first section in the feed that MOUNTS
    // LATE (2026-09-21): its content arrives on a lazy script, so at first paint there is no
    // section to find and the rail would have been permanently one crumb short. Re-running is
    // cheap — a querySelectorAll over ~30 sections plus a fresh observer — and the seed scroll it
    // also repeats lands on the same element, milliseconds after mount.
  }, [seed, reading]);
  const jump = (id) => {
    const el = document.getElementById(id); if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", "#stories/" + id.replace(/^st-/, ""));
  };
  // freshness — stories whose underlying data changed recently get a pulse dot in the TOC
  const fresh = React.useMemo(() => {
    const now = Date.now(), d30 = 30 * 86400e3, d60 = 60 * 86400e3, cy = new Date().getUTCFullYear();
    const recent = (iso, win) => iso && (now - new Date(iso).getTime()) < win;
    const f = {};
    if ((I.COMEBACKS || []).some(c => recent(c.back, d60))) f["st-comebacks"] = 1;
    if (I.LIFESPAN && (I.LIFESPAN.whileListening || []).some(w => w.end >= cy)) f["st-the-ones-that-ended"] = 1;
    if ((I.DISCOVERIES || []).some(x => recent(x.date, d30))) f["st-first-contact"] = 1;
    if ((I.OBSESSIONS || []).some(o => recent(o.weekStart, d60))) f["st-obsessions"] = 1;
    if ((I.ALBUM_OBSESSIONS || []).some(o => recent(o.weekStart, d60))) f["st-album-weeks"] = 1;
    if ((I.WONDERS || []).some(w => recent(w.date, d60))) f["st-one-day-wonders"] = 1;
    if (I.STREAK && I.STREAK.current >= 30) f["st-the-streak"] = 1;
    return f;
  }, []);
  // Alias-aware: "Midori" resolves through R.idForName → ミドリ's id when applicable.
  // Kept AND explore artists are clickable — non-kept ids get a MiniArtistView, so fully
  // enriched non-top-206 artists (Yoko Kanno) are reachable from every story.
  const resolveId = (name) => (R.idForName && R.idForName(name)) || R.slug(name);
  const hasPage = (id) => !!(R.byId[id] || (R.expById && R.expById[id]));
  const goIf = (name) => { const id = resolveId(name); if (hasPage(id)) go("artist", id); };
  const clickable = (name) => hasPage(resolveId(name));

  // year-in-review state — default to most recent year with real listening volume
  const realYears = (R.YEARS || []).filter(y => y.plays > 500);
  const [yi, setYi] = React.useState(realYears.length - 1);
  const yr = realYears[yi];
  const yirRef = React.useRef(null);
  usePairNav(yirRef, () => setYi((v) => Math.max(0, v - 1)), () => setYi((v) => Math.min(realYears.length - 1, v + 1)));

  const today = new Date();
  const todayKey = String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");
  const otd = I.ON_THIS_DAY[todayKey];
  const todayLabel = today.getDate() + " " + ["January","February","March","April","May","June","July","August","September","October","November","December"][today.getMonth()];

  const ArtistRow = ({ name, hue, children, right }) => (
    <div className="st-row" data-link={clickable(name)} onClick={() => goIf(name)}>
      <GenCover hue={hue} name={name} size={44} radius={4} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="st-row-name">{name}</div>
        <div className="st-row-sub">{children}</div>
      </div>
      {right && <div className="st-row-right">{right}</div>}
    </div>
  );

  return (
    <div className="r-view">
      <div className="r-viewhead st-head r-headbare">
        <div>
          <div className="r-kicker">Stories · mined from {fmt(R.TOTALS.scrobbles)} scrobbles</div>
          {/* "Things last.fm won’t tell you." retired (Fuad 2026-09-13) — the kicker above already names the page */}
        </div>
        {/* The lede is OFF (Fuad 2026-09-14: "let's hide this text"). Kept rather than deleted: the
            kicker above already names the page, and the chapter rules carry the structure this
            sentence used to announce. Restore by flipping the flag if the framing is wanted back. */}
        {SHOW_STORIES_LEDE && (
          <p className="r-lede" style={{ margin: 0 }}>Not charts — <b>patterns</b>. Obsessions, disappearances, comebacks,
            and the songs that own particular hours of the night.</p>
        )}
      </div>

      {toc.length > 3 && (() => {
        const activeIdx = toc.findIndex(it => it.id === active);
        return (
        <nav className="st-toc" aria-label="stories" ref={tocRef}>
          {toc.map((it, idx) => (
            <button key={it.id} data-on={active === it.id}
              data-reached={activeIdx >= 0 && idx <= activeIdx ? "true" : undefined}
              onClick={() => jump(it.id)}
              title={fresh[it.id] ? "changed recently" : undefined}>
              <span className="st-node" />
              <span className="st-toc-lbl">{it.label}{fresh[it.id] ? <i className="st-fresh" /> : null}</span>
            </button>
          ))}
        </nav>
        );
      })()}

      <div className="st-feed" ref={feedRef}>

        {/* on this day */}
        {otd && (
          <section className="st-card st-hero">
            <div className="st-label">On this day · {todayLabel}</div>
            <div className="st-big" data-link={clickable(otd.artist)} onClick={() => goIf(otd.artist)}>
              Every {todayLabel} belongs to <em style={{ color: `oklch(0.78 0.14 ${otd.hue})` }}>{otd.artist}</em>.
            </div>
            <div className="st-sub">{otd.plays} of the {fmt(otd.total)} plays you've ever logged on this date —
              more than any other artist.</div>
          </section>
        )}

        {/* CHAPTER I (feed re-cut 2026-09-21) — the nine-chapter re-cut lands here: what the library is made of, and how it got that way */}
        <div className="st-chapter"><span>I</span> Depth &amp; discovery</div>

        {/* underground index */}
        {I.UNDERGROUND && I.UNDERGROUND.deepCuts && I.UNDERGROUND.deepCuts.length > 0 && (() => {
          const U = I.UNDERGROUND;
          const deepest = U.deepCuts[0];
          return (
            <section className="st-card st-hero">
              <div className="st-label">How deep it goes</div>
              <div className="st-big" data-link={clickable(deepest.artist)} onClick={() => goIf(deepest.artist)}>
                <em style={{ color: `oklch(0.78 0.14 ${deepest.hue})` }}>{deepest.artist}</em> has {fmt(deepest.listeners)} listeners
                in the entire world. You've played them <em>{fmt(deepest.plays)}</em> times.
              </div>
              <div className="st-sub">
                That's volume, not taste — of the {fmt(U.artistsCovered)} artists you actually
                play, <b style={{ color: "var(--ink)" }}>{Math.round(U.artistShare50k * 100)}% sit under 50k listeners</b> and {Math.round(U.artistShare10k * 100)}% under 10k.
              </div>
              <div className="st-ug-cuts">
                {U.deepCuts.map(c => (
                  <div key={c.artist} className="st-ug-cut" data-link={clickable(c.artist)} onClick={() => goIf(c.artist)}>
                    <GenCover hue={c.hue} name={c.artist} size={40} radius={4} />
                    <div style={{ minWidth: 0 }}>
                      <div className="st-row-name">{c.artist}</div>
                      <div className="st-row-sub">{fmt(c.listeners)} listeners · {fmt(c.plays)} of yours</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })()}

        {/* when the taste turned — share of yearly discoveries that were underground */}
        {I.UNDERGROUND && I.UNDERGROUND.discoveryShape && I.UNDERGROUND.discoveryShape.length >= 10 && (() => {
          const D = I.UNDERGROUND.discoveryShape.filter(y => y.withStats >= 10);
          // headline year: max under-10k count
          const peak = D.slice().sort((a, b) => b.under10k - a.under10k)[0];
          // turning year: first year where ≥ 50% of new discoveries were under 50k
          const turn = D.find(y => y.under50k / y.withStats >= 0.5);
          const series50 = D.map(y => y.under50k / y.withStats);
          const series10 = D.map(y => y.under10k / y.withStats);
          const last = D[D.length - 1];
          return (
            <section className="st-card st-hero">
              <div className="st-label">When the taste turned</div>
              <div className="st-big">
                In <em>{peak.year}</em> you discovered <em>{peak.under10k}</em> artists with
                under <em>10k listeners</em> worldwide.
              </div>
              <div className="st-sub">
                <em>{turn ? turn.year : "—"}</em> was the first year more than half your new artists were under 50k
                listeners — {last.year} sits at <em>{Math.round(last.under50k / last.withStats * 100)}%</em>.
              </div>
              <div className="st-turn">
                <div className="st-turn-row">
                  <div className="st-turn-label">under 50k listeners</div>
                  <Spark data={series50} w={520} h={36} run={true} labels={D.map(y => y.year)} fmtV={(v) => Math.round(v * 100) + "%"}
                    stroke="var(--accent)" fill="var(--accent-bg)" />
                  <div className="st-turn-n">{Math.round(last.under50k / last.withStats * 100)}%</div>
                </div>
                <div className="st-turn-row">
                  <div className="st-turn-label">under 10k listeners</div>
                  <Spark data={series10} w={520} h={36} run={true} labels={D.map(y => y.year)} fmtV={(v) => Math.round(v * 100) + "%"}
                    stroke="oklch(0.75 0.16 320)" fill="oklch(0.75 0.16 320 / .15)" />
                  <div className="st-turn-n">{Math.round(last.under10k / last.withStats * 100)}%</div>
                </div>
                <div className="st-turn-axis">
                  <span>{D[0].year}</span>
                  <span>{D[Math.floor(D.length / 2)].year}</span>
                  <span>{last.year}</span>
                </div>
              </div>
            </section>
          );
        })()}

        {/* adoption lag — how old the music was when you found it */}
        {I.ADOPTION && I.ADOPTION.decades && I.ADOPTION.decades.length > 0 && (() => {
          const A = I.ADOPTION;
          const peakDec = A.decades.slice().sort((a, b) => b.share - a.share)[0];
          const dig = A.digs[0];
          return (
            <section className="st-card st-hero">
              <div className="st-label">Music age</div>
              <div className="st-big">
                The median artist you found was <em>{A.medianLag} years</em> past their debut when you pressed play.
              </div>
              <div className="st-sub">
                Most of what you play was made in the
                <b style={{ color: "var(--ink)" }}> {peakDec.decade}s</b> ({Math.round(peakDec.share * 100)}% of plays){dig ? <>, and you went {dig.lag} years deep into <em>{dig.name}</em>'s back-catalogue</> : null}.
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 96, margin: "18px 0 6px" }}>
                {A.decades.filter(d => d.share >= 0.005).map(d => (
                  <div key={d.decade} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                    <div className="st-mi">{Math.round(d.share * 100)}%</div>
                    <div style={{ width: "100%", maxWidth: 40, height: Math.max(3, d.share / peakDec.share * 64), borderRadius: "3px 3px 0 0",
                      background: d.decade === peakDec.decade ? "var(--accent)" : "var(--rule-2)" }} />
                    <div className="st-mi st-mi-soft">'{String(d.decade).slice(2)}s</div>
                  </div>
                ))}
              </div>
              <div className="st-ug-cuts">
                {A.digs.slice(0, 6).map(c => (
                  <div key={c.name} className="st-ug-cut" data-link={clickable(c.name)} onClick={() => goIf(c.name)}>
                    <GenCover hue={c.hue} name={c.name} size={40} radius={4} />
                    <div style={{ minWidth: 0 }}>
                      <div className="st-row-name">{c.name}</div>
                      <div className="st-row-sub">{c.debut} → {c.foundYear} · {c.lag} yrs</div>
                    </div>
                  </div>
                ))}
              </div>
              {/* discovery lag over time (wave F insight 1) — median years back to an artist’s
                  debut, per FOUND-year. Ships once CI rebuilds; hidden until then. */}
              {A.lagArc && A.lagArc.length >= 8 && (() => {
                const LA = A.lagArc;
                const first = LA[0], last2 = LA[LA.length - 1];
                return (
                  <div style={{ marginTop: 18 }}>
                    <div className="st-yir-h">The lag over time</div>
                    <div className="st-sub" style={{ marginBottom: 8 }}>
                      In {first.year} the artists you found were a median <b style={{ color: "var(--ink)" }}>{first.median} years</b> past
                      their debut — {last2.year} runs at <b style={{ color: "var(--ink)" }}>{last2.median}</b>.
                    </div>
                    <Spark data={LA.map(x => x.median)} w={520} h={30} run={true}
                      labels={LA.map(x => x.year)} fmtV={(v) => v + " yrs"}
                      stroke="var(--accent)" fill="var(--accent-bg)" />
                  </div>
                );
              })()}
            </section>
          );
        })()}

        {/* the songs you own twice — cross-library shared works (MB works graph) */}
        <CoversStory go={go} />

        {/* blind spots — taste-gap recommendations */}
        {I.RECOMMENDATIONS && I.RECOMMENDATIONS.artists.length > 0 && (() => {
          const RC = I.RECOMMENDATIONS;
          const top = RC.artists[0];
          const fmtL = (n) => n ? ((n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1000 ? Math.round(n / 1000) + "k" : n) + " listeners") : "";
          return (
            <section className="st-card st-hero">
              <div className="st-label">Blind spots</div>
              <div className="st-big" data-link={clickable(top.name)} onClick={() => goIf(top.name)}>
                Your favourites keep pointing to <em style={{ color: `oklch(0.78 0.14 ${top.hue})` }}>{top.name}</em> — and you've barely pressed play.
              </div>
              <div className="st-sub">
                Artists your most-played acts keep getting compared to — and you've barely touched.
              </div>
              <div className="st-ug-cuts">
                {/* LINKED WHERE A LINK EXISTS (Fuad 2026-09-14: "Blind spots completely are not
                    hyperlinked"). The whole row was cursor:default, which was over-cautious rather
                    than wrong: these are artists you have NOT explored, so most have no page —
                    1 of 6 here. So the row links only when it can, and the VIA names, which are
                    your most-played acts and always have pages, become links in their own right.
                    That is the useful jump anyway: it answers "who sent me here?". */}
                {RC.artists.slice(0, 6).map(r => (
                  <div key={r.name} className="st-ug-cut" data-link={clickable(r.name)}
                    onClick={() => goIf(r.name)} style={clickable(r.name) ? undefined : { cursor: "default" }}>
                    <GenCover hue={r.hue} name={r.name} size={40} radius={4} />
                    <div style={{ minWidth: 0 }}>
                      <div className="st-row-name">{r.name}</div>
                      <div className="st-row-sub">via {r.via.map((v, i) => (
                        <React.Fragment key={v.name}>
                          {i > 0 ? ", " : ""}
                          <b className="st-inline-link" data-link={clickable(v.name)}
                            onClick={(e) => { if (clickable(v.name)) { e.stopPropagation(); goIf(v.name); } }}>{v.name}</b>
                        </React.Fragment>
                      ))}{r.listeners ? ` · ${fmtL(r.listeners)}` : ""}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })()}

        {/* CHAPTER II (feed re-cut 2026-09-21) — the same listening zoomed out to the calendar, era spine first then year, season, hour */}
        <div className="st-chapter"><span>II</span> Years &amp; seasons</div>

        {/* taste eras — auto-segmented chapters (Phase 3): where the genre mix actually shifted */}
        {I.TASTE_ERAS && I.TASTE_ERAS.eras && I.TASTE_ERAS.eras.length >= 3 && (() => {
          const eras = I.TASTE_ERAS.eras;
          const yr = (m) => m.slice(0, 4);
          const big = eras.slice(1).filter(e => e.shift && e.shift.up).sort((a, b) => b.shift.up.d - a.shift.up.d)[0];
          return (
            <section className="st-card st-hero">
              <div className="st-label">Chapters</div>
              <div className="st-big">
                {big
                  ? <>Around {yr(big.start)}, <em style={{ color: `oklch(0.78 0.14 ${big.shift.up.hue})` }}>{big.shift.up.fam}</em> took over — up {big.shift.up.d} points in one turn.</>
                  : <>Your taste falls into <em>{eras.length} distinct chapters</em>.</>}
              </div>
              <div className="st-sub">
                Found by watching the genre mix month by month and marking where it genuinely shifted.
              </div>
              <div style={{ display: "grid", gap: 13, marginTop: 6 }}>
                {eras.map((e, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "88px 1fr", gap: 14, alignItems: "start" }}>
                    <div className="r-mono" style={{ fontSize: 11, color: "var(--ink-soft)", paddingTop: 2, whiteSpace: "nowrap" }}>{yr(e.start)}–{yr(e.end)}</div>
                    <div style={{ minWidth: 0 }}>
                      {/* HOLLOW, NOT FILLED (Fuad 2026-09-21: "hollow fills and strokes on
                          chapters to fit the style of the rest of Rotation") — the era share
                          bars drop their solid blocks for the stroke-first skin the Lyrical
                          diet and Overview's bars draw in: 1px hue stroke over a 12% wash,
                          segments separated by a 2px seam instead of a clipped fill. */}
                      <div style={{ display: "flex", height: 11, gap: 2, marginBottom: 6 }}>
                        {e.topFams.map((f, j) => <div key={j} title={`${f.fam} ${f.share}%`} style={{ width: f.share + "%",
                          boxSizing: "border-box", borderRadius: 2, border: `1px solid oklch(0.70 0.14 ${f.hue} / 0.65)`,
                          background: `oklch(0.70 0.14 ${f.hue} / 0.12)` }} />)}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--ink-soft)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {e.topFams.map(f => f.fam).join(" · ")}
                        {e.shift && e.shift.up && <span style={{ color: `oklch(0.8 0.13 ${e.shift.up.hue})`, marginLeft: 8 }}>↑ {e.shift.up.fam}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })()}

        {/* year in review */}
        {yr && (
          <section className="st-card st-hero" ref={yirRef}>
            <div className="st-yir-head">
              <div className="st-label" style={{ marginBottom: 0 }}>A year in review</div>
              <div className="st-yir-nav">
                <button onClick={() => setYi(Math.max(0, yi - 1))} disabled={yi === 0} aria-label="previous year">‹</button>
                <span className="st-yir-y">{yr.year}</span>
                <button onClick={() => setYi(Math.min(realYears.length - 1, yi + 1))} disabled={yi === realYears.length - 1} aria-label="next year">›</button>
              </div>
            </div>
            {yr.topArtist && (
              <div className="st-big" data-link={clickable(yr.topArtist.name)} onClick={() => goIf(yr.topArtist.name)}>
                <em style={{ color: `oklch(0.78 0.14 ${yr.topArtist.hue})` }}>{yr.topArtist.name}</em>'s year.
              </div>
            )}
            <div className="st-sub">
              {yr.topArtist ? <>You played them <em>{fmt(yr.topArtist.plays)}</em> times in {yr.year} — </> : null}
              {yr.activeDays} active days, roughly <em>{fmt(yr.hours)} hours</em> of music.
            </div>

            {/* ONLY THE FIGURES MOVE (Fuad 2026-09-14: "I only meant the transitions for stuff that
                makes sense: numbers, on rotation and new this year - not everything"). The first
                pass keyed the whole card, so the headline, the caption and the biggest-jump line
                all re-animated on every arrow press — motion on text that is simply being rewritten.
                The key now covers the stat row and the two columns beneath it and stops there; the
                head, the sentence and the jump update in place, silently. */}
            {/* stats sit OUTSIDE the keyed swap so the numbers can TRAVEL between years (wave D);
                the grid and the jump strip below still cross-fade. */}
            <div className="st-yir-stats">
              <div><div className="st-yir-n"><TweenNum v={yr.plays} f={fmt} /></div><div className="st-yir-l">plays</div></div>
              <div><div className="st-yir-n"><TweenNum v={yr.artists} f={fmt} /></div><div className="st-yir-l">artists</div></div>
              <div><div className="st-yir-n"><TweenNum v={yr.distinctTracks || 0} f={fmt} /></div><div className="st-yir-l">tracks</div></div>
              {yr.peakDay && <div><div className="st-yir-n"><TweenNum v={yr.peakDay.plays} /></div><div className="st-yir-l">peak · {fmtDate(yr.peakDay.date)}</div></div>}
            </div>
            <div className="st-swap" key={yr.year}>

            <div className="st-yir-grid">
              <div>
                <div className="st-yir-h">On rotation</div>
                {yr.topTrack && (
                  <div className="st-row" data-link={clickable(yr.topTrack.artist)} onClick={() => goIf(yr.topTrack.artist)} style={{ marginBottom: 8 }}>
                    <GenCover hue={yr.topTrack.hue} name={yr.topTrack.artist} size={40} radius={4} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="st-row-name">{yr.topTrack.title}</div>
                      <div className="st-row-sub">{yr.topTrack.artist} · {yr.topTrack.plays} plays · top track</div>
                    </div>
                  </div>
                )}
                {yr.topAlbum && (
                  <div className="st-row" data-link={clickable(yr.topAlbum.artist)} onClick={() => goIf(yr.topAlbum.artist)}>
                    <GenCover hue={yr.topAlbum.hue} name={yr.topAlbum.artist} size={40} radius={4} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="st-row-name">{yr.topAlbum.title}</div>
                      <div className="st-row-sub">{yr.topAlbum.artist} · {yr.topAlbum.plays} plays · top album</div>
                    </div>
                  </div>
                )}
                {/* A THIRD ROW (Fuad 2026-09-14: "carries only two artists on Rotation, let's have
                    three"). The runner-up track, so the column keeps one album and gains depth on
                    the side that has it — `tracks` already ships 18 per year, this reads index 1.
                    Skipped when it would repeat the top track's own row. */}
                {yr.tracks && yr.tracks[1] && (!yr.topTrack || yr.tracks[1].title !== yr.topTrack.title) && (
                  <div className="st-row" data-link={clickable(yr.tracks[1].artist)} onClick={() => goIf(yr.tracks[1].artist)} style={{ marginTop: 8 }}>
                    <GenCover hue={yr.tracks[1].hue} name={yr.tracks[1].artist} size={40} radius={4} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="st-row-name">{yr.tracks[1].title}</div>
                      <div className="st-row-sub">{yr.tracks[1].artist} · {yr.tracks[1].plays} plays · 2nd track</div>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <div className="st-yir-h">New that year</div>
                {yr.discoveries.length === 0 && <div className="st-row-sub">No new artists ranked this year.</div>}
                {yr.discoveries.map(d => (
                  <div key={d.name} className="st-row" data-link={clickable(d.name)} onClick={() => goIf(d.name)} style={{ marginBottom: 6 }}>
                    <GenCover hue={d.hue} name={d.name} size={36} radius={4} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="st-row-name">{d.name}</div>
                      <div className="st-row-sub">{d.plays} plays — first heard this year</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {yr.gainer && yr.gainer.delta > 50 && (
              <div className="st-yir-jump" data-link={clickable(yr.gainer.name)} onClick={() => goIf(yr.gainer.name)}>
                <span className="r-mono" style={{ fontSize: 10, color: "var(--ink-faint)", letterSpacing: ".12em", textTransform: "uppercase" }}>Biggest jump</span>
                &nbsp;&nbsp;
                <b style={{ color: `oklch(0.78 0.14 ${yr.gainer.hue})` }}>{yr.gainer.name}</b>
                <span style={{ color: "var(--ink-soft)" }}> · {yr.gainer.prev} → <em>{yr.gainer.plays}</em> plays (+{yr.gainer.delta} YoY)</span>
              </div>
            )}
            </div>

          </section>
        )}

        {/* ── Slope graph: rank crossings year over year ── */}
        {R.ERAS && R.ERAS.length >= 2 && (() => {
          const sortedEras = R.ERAS.slice().sort((a, b) => a.year - b.year);
          // build list of valid pairs (consecutive years with real data)
          const pairs = [];
          for (let i = 1; i < sortedEras.length; i++) {
            const prev = sortedEras[i - 1], cur = sortedEras[i];
            if ((prev.top || []).length >= 3 || (cur.top || []).length >= 3) {
              pairs.push({ prev, cur });
            }
          }
          if (!pairs.length) return null;

          const [pairIdx, setPairIdx] = React.useState(pairs.length - 1);
          const sgRef = React.useRef(null);
          usePairNav(sgRef, () => setPairIdx((v) => Math.max(0, v - 1)), () => setPairIdx((v) => Math.min(pairs.length - 1, v + 1)));
          const pair = pairs[pairIdx];
          const prevEra = pair.prev, curEra = pair.cur;
          const prevYear = prevEra.year, curYear = curEra.year;

          // union of both years' top 15
          const nameSet = new Set();
          for (const a of (prevEra.top || []).slice(0, 15)) nameSet.add(a.name);
          for (const a of (curEra.top || []).slice(0, 15)) nameSet.add(a.name);

          // plays from ARTISTS[].yp
          const byName = {};
          for (const a of R.ARTISTS) byName[a.name] = a;

          const rows = [...nameSet].map(name => {
            const a = byName[name];
            const prevP = (a && a.yp && a.yp[prevYear]) || 0;
            const curP = (a && a.yp && a.yp[curYear]) || 0;
            return { name, prevP, curP, hue: a ? a.hue : (hueOfName ? hueOfName(name) : 200) };
          }).filter(r => r.prevP > 0 || r.curP > 0);

          // rank by plays in each column
          const prevRanked = rows.slice().filter(r => r.prevP > 0).sort((a, b) => b.prevP - a.prevP);
          const curRanked = rows.slice().filter(r => r.curP > 0).sort((a, b) => b.curP - a.curP);

          // cap displayed artists — top 12 from union, prefer those present in both
          const both = rows.filter(r => r.prevP > 0 && r.curP > 0);
          const prevOnly = rows.filter(r => r.prevP > 0 && r.curP === 0);
          const curOnly = rows.filter(r => r.prevP === 0 && r.curP > 0);
          // sort each group by max plays descending, then assemble up to 14
          const sortByMax = arr => arr.slice().sort((a, b) => Math.max(b.prevP, b.curP) - Math.max(a.prevP, a.curP));
          const displayed = [
            ...sortByMax(both),
            ...sortByMax(prevOnly),
            ...sortByMax(curOnly),
          ].slice(0, 14);

          const prevRankMap = new Map(prevRanked.map((r, i) => [r.name, i]));
          const curRankMap = new Map(curRanked.map((r, i) => [r.name, i]));

          // SVG layout
          const N = displayed.length;
          const W = 520, PAD_L = 140, PAD_R = 140, PAD_T = 38, PAD_B = 16;
          // Canvas height is FIXED across pairs (Fuad 2026-09-14). It used to grow and shrink with
          // the row count, so the whole viewBox jumped underneath the dots the moment they started
          // travelling. Rows spread across whatever height they are given, so a sparse pair simply
          // breathes wider instead of shortening the card.
          const H = 350;
          const X_L = PAD_L - 6, X_R = W - PAD_R + 6;

          // y position by rank index within the displayed set
          // for each side, position by their rank within the full per-year ranking
          // but constrain to displayed set positions to avoid overlap
          const prevDisplayed = displayed.filter(r => r.prevP > 0).sort((a, b) => (prevRankMap.get(a.name) ?? 999) - (prevRankMap.get(b.name) ?? 999));
          const curDisplayed = displayed.filter(r => r.curP > 0).sort((a, b) => (curRankMap.get(a.name) ?? 999) - (curRankMap.get(b.name) ?? 999));

          const prevPosMap = new Map(prevDisplayed.map((r, i) => [r.name, i]));
          const curPosMap = new Map(curDisplayed.map((r, i) => [r.name, i]));
          const prevCount = prevDisplayed.length, curCount = curDisplayed.length;

          const yOf = (posIdx, total) => PAD_T + (total <= 1 ? (H - PAD_T - PAD_B) / 2 : (posIdx / (total - 1)) * (H - PAD_T - PAD_B));

          // geometry resolved here, motion handled in SlopeRows
          const rowData = displayed.map((r) => ({
            name: r.name, hue: r.hue, prevP: r.prevP, curP: r.curP,
            y1: r.prevP > 0 ? yOf(prevPosMap.get(r.name), prevCount) : null,
            y2: r.curP > 0 ? yOf(curPosMap.get(r.name), curCount) : null,
          }));

          const pairLabel = `'${String(prevYear).slice(2)}→'${String(curYear).slice(2)}`;

          return (
            <section className="st-card st-hero" ref={sgRef}>
              <div className="st-sg-head">
                <div className="st-label" style={{ marginBottom: 0 }}>Who rose, who fell</div>
                <div className="st-yir-nav">
                  <button onClick={() => setPairIdx(Math.max(0, pairIdx - 1))} disabled={pairIdx === 0} aria-label="earlier pair">‹</button>
                  <span className="st-yir-y" style={{ fontSize: 16, minWidth: 56 }}>{pairLabel}</span>
                  <button onClick={() => setPairIdx(Math.min(pairs.length - 1, pairIdx + 1))} disabled={pairIdx === pairs.length - 1} aria-label="later pair">›</button>
                </div>
              </div>
              <div className="st-swap" key={pairLabel}>
              <div className="st-big">
                {(() => {
                  // find biggest riser: in curRanked but higher than in prevRanked (lower rank number = better)
                  const risers = displayed.filter(r => r.prevP > 0 && r.curP > 0 && (prevRankMap.get(r.name) ?? 999) > (curRankMap.get(r.name) ?? 999));
                  const fallers = displayed.filter(r => r.prevP > 0 && r.curP > 0 && (prevRankMap.get(r.name) ?? 999) < (curRankMap.get(r.name) ?? 999));
                  const topRiser = risers.sort((a, b) => ((prevRankMap.get(b.name) ?? 999) - (curRankMap.get(b.name) ?? 999)) - ((prevRankMap.get(a.name) ?? 999) - (curRankMap.get(a.name) ?? 999)))[0];
                  const topFaller = fallers.sort((a, b) => ((prevRankMap.get(b.name) ?? 999) - (curRankMap.get(b.name) ?? 999)) - ((prevRankMap.get(a.name) ?? 999) - (curRankMap.get(a.name) ?? 999)))[0];
                  if (topRiser && topFaller) {
                    return <><em style={{ color: `oklch(0.78 0.16 ${topRiser.hue})`, cursor: clickable(resolveId(topRiser.name)) ? "pointer" : "default" }}
                      onClick={() => goIf(topRiser.name)}>{topRiser.name}</em> climbed. <em style={{ color: `oklch(0.65 0.12 ${topFaller.hue})`, cursor: clickable(resolveId(topFaller.name)) ? "pointer" : "default" }}
                      onClick={() => goIf(topFaller.name)}>{topFaller.name}</em> slipped.</>;
                  }
                  if (topRiser) return <><em style={{ color: `oklch(0.78 0.16 ${topRiser.hue})` }}>{topRiser.name}</em> made the biggest move.</>;
                  return <>The lines that crossed between <em>{prevYear}</em> and <em>{curYear}</em>.</>;
                })()}
              </div>
              <div className="st-sub">
                Each line connects an artist's rank in {prevYear} to their rank in {curYear} — the steeper the cross, the bigger the shift.
              </div>
              </div>{/* /st-swap — the sentence and the caption swap; the chart below travels */}
              <div className="st-sg-wrap">
                <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", maxWidth: W, margin: "0 auto", overflow: "visible" }}>
                  {/* column year headers */}
                  <text x={X_L} y={22} fill="var(--ink-soft)" fontSize="10" fontFamily="var(--mono)"
                    textAnchor="end" letterSpacing=".1em">{prevYear}</text>
                  <text x={X_R} y={22} fill="var(--ink-soft)" fontSize="10" fontFamily="var(--mono)"
                    textAnchor="start" letterSpacing=".1em">{curYear}</text>
                  {/* center axis */}
                  <line x1={X_L + 2} x2={X_R - 2} y1={PAD_T - 6} y2={PAD_T - 6} stroke="var(--rule)" strokeWidth="1" />
                  {/* artist rows — own component so each artist keeps its node across a pair change */}
                  <SlopeRows rows={rowData} X_L={X_L} X_R={X_R} goIf={goIf}
                    isClickable={(n) => clickable(resolveId(n))} />
                </svg>
              </div>
            </section>
          );
        })()}

        {/* seasonality — artists you only reach for at one time of year (Phase 3) */}
        {I.SEASONALITY && I.SEASONALITY.top && I.SEASONALITY.top.length >= 4 && (() => {
          const S = I.SEASONALITY, top = S.top[0];
          return (
            <section className="st-card st-hero">
              <div className="st-label">Music for a season</div>
              <div className="st-big" data-link={true} onClick={() => go("artist", top.id)}>
                You play <em style={{ color: `oklch(0.78 0.14 ${top.hue})` }}>{top.name}</em> almost only in {top.window} —
                {" "}<em>{top.share}%</em> of every spin lands in those three months.
              </div>
              <div className="st-sub">
                Some artists you reach for at just one time of year — the same window, across the years.
                Your most seasonal:
              </div>
              <div className="st-ug-cuts">
                {/* 9, not 8 (Fuad 2026-09-21: full rows — at the feed's 3-column width, 8 left the
                    last row a tile short; SEASONALITY ships 12 so the 9th is free) */}
                {S.top.slice(0, 9).map(a => (
                  <div key={a.id} className="st-ug-cut" data-link={true} onClick={() => go("artist", a.id)}>
                    <GenCover hue={a.hue} name={a.name} size={40} radius={4} />
                    <div style={{ minWidth: 0 }}>
                      <div className="st-row-name">{a.name}</div>
                      <div className="st-row-sub">{a.share}% in {a.window} · {fmt(a.plays)} plays</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })()}

        {/* night owls */}
        <section className="st-card">
          <div className="st-label">After midnight</div>
          <div className="st-title-sm">What only the small hours hear.</div>
          <div className="st-list">
            {I.NIGHT_OWLS.slice(0, 6).map(n => (
              <ArtistRow key={n.artist} name={n.artist} hue={n.hue}
                right={<span className="st-num">{Math.round(n.nightShare * 100)}%<small> 12–5am</small></span>}>
                {fmt(n.plays)} plays, mostly while the rest of the city sleeps
              </ArtistRow>
            ))}
          </div>
          {/* wave F insight 4 — the sound by hour (UTC, same clock as the module itself). The
              axis with the biggest day swing tells the story; if nothing swings, THAT is the
              story: the clock does not touch this library. */}
          {I.HOUR_SOUND && I.HOUR_SOUND.hours && (() => {
            const HS = I.HOUR_SOUND.hours.filter(Boolean);
            if (HS.length < 18) return null;
            const axes = [["energy", "Energy"], ["tempo", "Tempo"], ["dance", "Danceable"]];
            const pick = axes.map(([k, name]) => {
              const hi = HS.reduce((m, x) => x[k] > m[k] ? x : m, HS[0]);
              const lo = HS.reduce((m, x) => x[k] < m[k] ? x : m, HS[0]);
              return { k, name, hi, lo, swing: hi[k] - lo[k] };
            }).sort((a, b) => b.swing - a.swing)[0];
            const hh = (h) => (h % 24) + ":00";
            const max = Math.max(...HS.map(x => x[pick.k]));
            const min = Math.min(...HS.map(x => x[pick.k]));
            return (
              <div style={{ marginTop: 16 }}>
                <div className="st-sub" style={{ marginBottom: 8 }}>
                  {pick.swing >= 5
                    ? <>The clock moves the sound: <b style={{ color: "var(--ink)" }}>{pick.name.toLowerCase()}</b> peaks
                        at {hh(pick.hi.h)} ({pick.hi[pick.k]}) and bottoms out at {hh(pick.lo.h)} ({pick.lo[pick.k]}).</>
                    : <>The clock barely touches the sound — 3am runs as hard as 3pm
                        ({pick.name.toLowerCase()} swings only {pick.swing} points all day).</>}
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 44 }}>
                  {Array.from({ length: 24 }, (_, h) => {
                    const x = I.HOUR_SOUND.hours[h];
                    const v = x ? x[pick.k] : null;
                    const norm = v === null ? 0 : (v - min) / Math.max(max - min, 1);
                    return (
                      <div key={h} title={v === null ? "" : hh(h) + " · " + pick.name.toLowerCase() + " " + v}
                        style={{ flex: 1, height: v === null ? 2 : (8 + norm * 34),
                          background: h < 5 || h >= 23 ? "var(--accent)" : "var(--rule-2)", borderRadius: 2 }} />
                    );
                  })}
                </div>
                <div className="st-arc-axis"><span>0:00</span><span>12:00</span><span>23:00</span></div>
              </div>
            );
          })()}
        </section>

        {/* CHAPTER III (feed re-cut 2026-09-21) — the anatomy of an obsession, zoomed from the month to the single day */}
        <div className="st-chapter"><span>III</span> The burn</div>

        {/* lifecycle — the shape of an obsession, and the ones burning now (Phase 3) */}
        {I.LIFECYCLE && (I.LIFECYCLE.burningNow.length >= 2 || I.LIFECYCLE.flameout.length >= 2) && (() => {
          const L = I.LIFECYCLE, hot = L.burningNow[0];
          const MO = window.MON;
          const moL = (ym) => { const p = (ym || "").split("-"); return p.length === 2 ? MO[+p[1] - 1] + " " + p[0] : ym; };
          const names = (arr) => arr.slice(0, 4).map(a => a.name).join(", ");
          return (
            <section className="st-card st-hero">
              <div className="st-label">Right now</div>
              <div className="st-big">
                {hot
                  ? <>Right now it's <em style={{ color: `oklch(0.78 0.14 ${hot.hue})` }} onClick={() => go("artist", hot.id)}>{hot.name}</em> — {fmt(hot.recentPlays)} plays since {moL(hot.since)}, <em>{hot.flarePct}%</em> of everything you've ever played by them.</>
                  : <>Every obsession has an arc — some burn fast, some never leave.</>}
              </div>
              <div className="st-sub">
                Most of these plays landed in the last four months — the shape a flameout makes, mid-flight.
              </div>
              <div className="st-ug-cuts">
                {L.burningNow.map(a => (
                  <div key={a.id} className="st-ug-cut" data-link={true} onClick={() => go("artist", a.id)}>
                    <GenCover hue={a.hue} name={a.name} size={40} radius={4} />
                    <div style={{ minWidth: 0 }}>
                      <div className="st-row-name">{a.name}</div>
                      <div className="st-row-sub">{fmt(a.recentPlays)} in 4 months · {a.flarePct}% of all-time · since {moL(a.since)}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="st-sub" style={{ marginTop: 14 }}>
                {L.flameout.length >= 2 && <>Ones that already burned out: <b style={{ color: "var(--ink)" }}>{names(L.flameout)}</b> — each 55%+ of their plays in a single six-month window, long gone quiet. </>}
                {L.perennial.length >= 2 && <>The constants that never faded: <b style={{ color: "var(--ink)" }}>{names(L.perennial)}</b>, steady across {L.perennial[0].years}+ years.</>}
              </div>
            </section>
          );
        })()}

        {/* incubation — how long from first-play to peak-week, per top artist */}
        {I.INCUBATION && I.INCUBATION.length >= 6 && (() => {
          const N = I.INCUBATION;
          const slow = N.slice(0, 5);
          const fast = N.slice().reverse().slice(0, 5);
          const maxDays = slow[0].incubDays;
          const fmtIncub = (d) => d < 30 ? `${d || 0} day${d === 1 ? "" : "s"}` :
            d < 365 ? `${Math.round(d / 30)} months` : `${(d / 365).toFixed(1)} years`;
          return (
            <section className="st-card st-hero">
              <div className="st-label">The incubation</div>
              <div className="st-big">
                <em>{slow[0].artist}</em> took <em>{(slow[0].incubDays / 365).toFixed(1)} years</em> to peak.
                <em> {fast[0].artist}</em> took <em>{fast[0].incubDays || "zero"} {fast[0].incubDays === 1 ? "day" : "days"}</em>.
              </div>
              <div className="st-sub">
                The gap between first play and peak week — some sat for years, others caught the week you found them.
              </div>
              <div className="st-incub">
                <div>
                  <div className="st-yir-h">Slow burners</div>
                  {slow.map(a => (
                    <div key={a.artist} className="st-incub-row" data-link={artistHasPage(a.artistId)} onClick={() => artistHasPage(a.artistId) && go("artist", a.artistId)}>
                      <GenCover hue={a.hue} name={a.artist} size={32} radius={3} />
                      <div className="st-incub-main">
                        <div className="st-row-name">{a.artist}</div>
                        <div className="st-incub-bar"><i style={{ width: (a.incubDays / maxDays * 100) + "%", background: `oklch(0.62 0.16 ${a.hue})` }} /></div>
                        <div className="st-row-sub">{fmtDate(a.firstHeard)} → {fmtDate(a.peakWeek)}</div>
                      </div>
                      <div className="st-incub-n">{fmtIncub(a.incubDays)}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="st-yir-h">Instant addictions</div>
                  {fast.map(a => (
                    <div key={a.artist} className="st-incub-row" data-link={artistHasPage(a.artistId)} onClick={() => artistHasPage(a.artistId) && go("artist", a.artistId)}>
                      <GenCover hue={a.hue} name={a.artist} size={32} radius={3} />
                      <div className="st-incub-main">
                        <div className="st-row-name">{a.artist}</div>
                        <div className="st-incub-bar"><i style={{ width: Math.max(2, a.incubDays / maxDays * 100) + "%", background: `oklch(0.62 0.16 ${a.hue})` }} /></div>
                        <div className="st-row-sub">discovered {fmtDate(a.firstHeard)} · peaked {fmtDate(a.peakWeek)}</div>
                      </div>
                      <div className="st-incub-n">{fmtIncub(a.incubDays)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        })()}

        {/* their era — the calendar month each top artist owned the listening (share %) */}
        {I.ARTIST_ERAS && I.ARTIST_ERAS.length >= 6 && (() => {
          const E = I.ARTIST_ERAS;
          const top = E[0];
          const monthLabel = (mk) => {
            const d = new Date(mk + "-15");
            return window.MON[d.getUTCMonth()] + " " + d.getUTCFullYear();
          };
          return (
            <section className="st-card st-hero">
              <div className="st-label">Their era</div>
              <div className="st-big">
                <em>{monthLabel(top.month)}</em> was <em>{Math.round(top.share * 100)}%</em>
                {" "}<span data-link={artistHasPage(top.artistId)} onClick={() => artistHasPage(top.artistId) && go("artist", top.artistId)}
                  style={{ color: `oklch(0.78 0.14 ${top.hue})`, cursor: R.byId[top.artistId] ? "pointer" : "default", fontStyle: "italic" }}>{top.artist}</span>.
              </div>
              <div className="st-sub">
                The single month each artist owned the highest <em>share</em> of your listening — not the most plays, the most crowding-out.
              </div>
              <div className="st-life">
                {E.slice(0, 6).map((e, i) => (
                  <div key={e.artist + e.month} className="st-life-row"
                    data-link={artistHasPage(e.artistId)} onClick={() => artistHasPage(e.artistId) && go("artist", e.artistId)}>
                    <span className="r-mono" style={{ fontSize: 11, color: "var(--ink-faint)", width: 24 }}>{String(i + 1).padStart(2, "0")}</span>
                    <GenCover hue={e.hue} name={e.artist} size={36} radius={3} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="st-row-name">{e.artist}</div>
                      <div className="st-row-sub">{monthLabel(e.month)} · {e.plays} of the {e.total} plays that month</div>
                    </div>
                    <div className="st-flame-pct" style={{ color: `oklch(0.78 0.14 ${e.hue})` }}>{Math.round(e.share * 100)}%</div>
                  </div>
                ))}
              </div>
            </section>
          );
        })()}

        {/* obsessions */}
        <section className="st-card">
          <div className="st-label">Obsessions</div>
          <div className="st-title-sm">Weeks one artist ate everything.</div>
          <div className="st-grid">
            {I.OBSESSIONS.map(o => (
              <div key={o.artist + o.weekStart} className="st-obs" data-link={clickable(o.artist)} onClick={() => goIf(o.artist)}>
                <div className="st-obs-top">
                  <GenCover hue={o.hue} name={o.artist} size={38} radius={4} />
                  <div className="st-obs-txt">
                    <div className="st-row-name">{o.artist}</div>
                    <div className="st-row-sub">{o.plays} plays · week of {fmtDate(o.weekStart)}</div>
                  </div>
                  <div className="st-obs-share" style={{ color: `oklch(0.78 0.14 ${o.hue})` }}>{Math.round(o.share * 100)}%</div>
                </div>
                <div className="st-obs-bar"><i style={{ width: (o.share * 100) + "%", background: `oklch(0.62 0.15 ${o.hue})` }} /></div>
              </div>
            ))}
          </div>
        </section>

        {/* album obsessions — the same lens, one album-deep */}
        {I.ALBUM_OBSESSIONS && I.ALBUM_OBSESSIONS.length > 0 && (
          <section className="st-card">
            <div className="st-label">Album weeks</div>
            <div className="st-title-sm">Weeks one record ate everything.</div>
            <div className="st-grid">
              {I.ALBUM_OBSESSIONS.map(o => (
                <div key={o.artist + o.album + o.weekStart} className="st-obs"
                  data-link={artistHasPage(o.artistId)} onClick={() => artistHasPage(o.artistId) && go("artist", o.artistId)}>
                  <div className="st-obs-top">
                    <GenCover hue={o.hue} name={o.album} size={38} radius={4}
                      image={albumCover[o.album + "\x00" + o.artist] || ""} thumb={albumCover[o.album + "\x00" + o.artist] || ""} />
                    <div className="st-obs-txt">
                      <div className="st-row-name st-row-name-alb">{o.album}</div>
                      <div className="st-row-sub">{o.artist} · {o.plays} plays · week of {fmtDate(o.weekStart)}</div>
                    </div>
                    <div className="st-obs-share" style={{ color: `oklch(0.78 0.14 ${o.hue})` }}>{Math.round(o.share * 100)}%</div>
                  </div>
                  <div className="st-obs-bar"><i style={{ width: (o.share * 100) + "%", background: `oklch(0.62 0.15 ${o.hue})` }} /></div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* flameouts — songs that owned a single week and were never replayed (pair with constants) */}
        {I.FLAMEOUTS && I.FLAMEOUTS.length >= 5 && (
          <section className="st-card">
            <div className="st-label">Flameouts</div>
            <div className="st-title-sm">Songs that owned one week, then vanished.</div>
            <div className="st-sub" style={{ marginBottom: 14 }}>
              Tracks where 40%+ of every play came in a single week — a one-off obsession, then silence.
            </div>
            <div className="st-life">
              {I.FLAMEOUTS.slice(0, 6).map((t, i) => (
                <div key={t.artist + t.title} className="st-life-row"
                  data-link={t.kept} onClick={() => t.kept && go("artist", t.artistId)}>
                  <span className="r-mono" style={{ fontSize: 11, color: "var(--ink-faint)", width: 24 }}>{String(i + 1).padStart(2, "0")}</span>
                  <GenCover hue={t.hue} name={t.artist} size={36} radius={3} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="st-row-name" style={{ fontStyle: "italic" }}>{t.title}</div>
                    <div className="st-row-sub">{t.artist} · {t.peakPlays} of {t.plays} plays in the week of {fmtDate(t.peakWeek)}</div>
                  </div>
                  <div className="st-flame-pct" style={{ color: `oklch(0.78 0.14 ${t.hue})` }}>{Math.round(t.peakShare * 100)}%</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* one-day wonders */}
        <section className="st-card">
          <div className="st-label">One-day wonders</div>
          <div className="st-title-sm">Burned bright. Once.</div>
          <div className="st-list">
            {I.WONDERS.slice(0, 6).map(w => (
              <ArtistRow key={w.artist} name={w.artist} hue={w.hue}
                right={<span className="st-num">{w.plays}<small> plays</small></span>}>
                everything on {fmtDate(w.date)} — then never again
              </ArtistRow>
            ))}
          </div>
        </section>

        {/* CHAPTER IV (feed re-cut 2026-09-21) — the counterweight to III: the ones that faded, returned, or never left */}
        <div className="st-chapter"><span>IV</span> What lasted</div>

        {/* revisit — favourites gone quiet */}
        {I.REVISIT && I.REVISIT.artists.length > 0 && (() => {
          const RV = I.REVISIT;
          const top = RV.artists[0];
          const MON = window.MON;
          const monthName = (ym) => { if (!ym) return ""; const [y, m] = ym.split("-"); return MON[+m - 1] + " " + y; };
          const ago = (mo) => mo >= 18 ? Math.round(mo / 12) + " years" : mo >= 11 ? "a year" : mo + " months";
          return (
            <section className="st-card st-hero">
              <div className="st-label">Gathering dust</div>
              <div className="st-big" data-link={clickable(top.name)} onClick={() => goIf(top.name)}>
                You played <em style={{ color: `oklch(0.78 0.14 ${top.hue})` }}>{top.name}</em> {fmt(top.plays)} times — and haven't pressed play in {ago(top.monthsSince)}.
              </div>
              <div className="st-sub">Artists you once lived in, now gone quiet.</div>
              <div className="st-ug-cuts">
                {RV.artists.slice(0, 6).map(a => (
                  <div key={a.name} className="st-ug-cut" data-link={clickable(a.name)} onClick={() => goIf(a.name)}>
                    <GenCover hue={a.hue} name={a.name} size={40} radius={4} />
                    <div style={{ minWidth: 0 }}>
                      <div className="st-row-name">{a.name}</div>
                      <div className="st-row-sub">{fmt(a.plays)} plays · peak {monthName(a.peakMonth)} · {ago(a.monthsSince)} ago</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })()}

        {/* comebacks */}
        <section className="st-card">
          <div className="st-label">Comebacks</div>
          <div className="st-title-sm">Gone for years. Then suddenly not.</div>
          <div className="st-list">
            {I.COMEBACKS.slice(0, 6).map(c => (
              <ArtistRow key={c.artist} name={c.artist} hue={c.hue}
                right={<span className="st-num">{yearsOf(c.gapDays)}<small> yr away</small></span>}>
                silent after {fmtDate(c.left)} — back {fmtDate(c.back)}, {fmt(c.playsAfter)} plays since
              </ArtistRow>
            ))}
          </div>
        </section>

        {/* lifetime tracks — songs that survived every era (year-span first sort, plays tiebreak) */}
        {I.LIFETIME_TRACKS && I.LIFETIME_TRACKS.length >= 5 && (() => {
          const L = I.LIFETIME_TRACKS;
          const hero = L[0];
          return (
            <section className="st-card">
              <div className="st-label">The constants</div>
              <div className="st-title-sm">Songs that survived every era.</div>
              <div className="st-sub" style={{ marginBottom: 14 }}>
                Played across <em>{hero.yearSpan} different years</em> and still in rotation — "<i>{hero.title}</i>"
                leads, {hero.plays} plays from {hero.firstYr} to {hero.lastYr}.
              </div>
              <div className="st-life">
                {L.slice(0, 6).map((t, i) => (
                  <div key={t.artist + t.title} className="st-life-row"
                    data-link={t.kept} onClick={() => t.kept && go("artist", t.artistId)}>
                    <span className="r-mono" style={{ fontSize: 11, color: "var(--ink-faint)", width: 24 }}>{String(i + 1).padStart(2, "0")}</span>
                    <GenCover hue={t.hue} name={t.artist} size={36} radius={3} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="st-row-name" style={{ fontStyle: "italic" }}>{t.title}</div>
                      <div className="st-row-sub">{t.artist} · {t.plays} plays across {t.yearSpan} years</div>
                    </div>
                    <div className="st-life-span">
                      <span className="r-mono" style={{ fontSize: 10.5, color: "var(--ink-soft)" }}>'{String(t.firstYr).slice(2)}</span>
                      <div className="st-life-bar" style={{ background: `oklch(0.6 0.16 ${t.hue})` }} />
                      <span className="r-mono" style={{ fontSize: 10.5, color: "var(--ink-soft)" }}>'{String(t.lastYr).slice(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })()}

        {/* streak */}
        <section className="st-card st-hero">
          <div className="st-label">The streak</div>
          <div className="st-big"><em>{I.STREAK.best} days</em> without missing one.</div>
          <div className="st-sub">From {fmtDate(I.STREAK.start)} to {fmtDate(I.STREAK.end)} you scrobbled
            every single day — nearly a year of unbroken listening. Current run: {I.STREAK.current} days.</div>
        </section>

        {/* CHAPTER V (feed re-cut 2026-09-21) — how the listening physically happens, and what the counter recorded */}
        <div className="st-chapter"><span>V</span> Habits &amp; landmarks</div>

        {/* sessions — how you actually listen (Phase 3): sittings, binge-vs-shuffle, album runs */}
        {I.SESSIONS && (() => {
          const S = I.SESSIONS, L = S.longest[0], topAlb = S.sittings.top[0];
          return (
            <section className="st-card st-hero">
              <div className="st-label">How you listen</div>
              <div className="st-big" data-link={L.artistId ? true : undefined} onClick={() => L.artistId && go("artist", L.artistId)}>
                Your longest sitting: <em style={{ color: `oklch(0.78 0.14 ${L.hue})` }}>{fmt(L.tracks)} tracks</em> in one go —
                {" "}{L.hours}h on {fmtDate(L.date)}{L.share >= 55 ? <>, almost all {L.artist}</> : null}.
              </div>
              <div className="st-sub">
                {fmt(S.total)} sessions, a typical one {S.median} tracks — <b style={{ color: "var(--ink)" }}>{S.bingeShare}%</b> lock onto
                a single artist{topAlb ? <>, and you've played <b style={{ color: "var(--ink)" }}>{topAlb.album}</b> front-to-back <b style={{ color: "var(--ink)" }}>{topAlb.count} times</b></> : null}.
              </div>
              <div className="st-ug-cuts">
                {S.sittings.top.slice(0, 9).map(a => (
                  <div key={a.aid} className="st-ug-cut" data-link={true} onClick={() => go("album", a.aid)}>
                    <GenCover hue={a.hue} name={a.album} size={40} radius={4} />
                    <div style={{ minWidth: 0 }}>
                      <div className="st-row-name">{a.album}</div>
                      <div className="st-row-sub">{a.artist} · {a.count}× front-to-back</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })()}

        {/* the unfinished records (wave F insight 2) — albums whose plays never reach side B,
            the mirror of the front-to-back records above. Ships once CI rebuilds. */}
        {I.ALBUM_DECAY && I.ALBUM_DECAY.albums && I.ALBUM_DECAY.albums.length >= 3 && (() => {
          const AD = I.ALBUM_DECAY;
          const top = AD.albums[0];
          return (
            <section className="st-card">
              <div className="st-label">The unfinished records</div>
              <div className="st-title-sm">Albums you never let reach side B.</div>
              <div className="st-sub" style={{ marginBottom: 12 }}>
                Across {AD.sampled} albums with known tracklists the median album keeps {AD.median}% of its plays
                on the front half — these never recover: <b style={{ color: "var(--ink)" }}>{top.album}</b> is {top.frontShare}% front-loaded.
              </div>
              <div className="st-ug-cuts">
                {AD.albums.map(a => (
                  <div key={a.artistId + a.album} className="st-ug-cut" data-link={clickable(a.artist)} onClick={() => goIf(a.artist)}>
                    <GenCover hue={a.hue} name={a.artist} size={40} radius={4} />
                    <div style={{ minWidth: 0 }}>
                      <div className="st-row-name">{a.album}</div>
                      <div className="st-row-sub">{a.artist} · {a.frontShare}% front-loaded · {fmt(a.plays)} plays</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })()}

        {/* segue graph — what you play right after what (Phase 3) */}
        {I.SESSIONS && I.SESSIONS.segues && I.SESSIONS.segues.length >= 3 && (() => {
          const segs = I.SESSIONS.segues, top = segs[0];
          return (
            <section className="st-card st-hero">
              <div className="st-label">What follows what</div>
              <div className="st-big">
                Put on <em style={{ color: `oklch(0.78 0.14 ${top.hue})`, cursor: "pointer" }} onClick={() => go("track", top.fromId)}>{top.fromTrack}</em> and,
                {" "}<em>{top.pct}%</em> of the time, <span data-link={true} onClick={() => go("track", top.toId)}>{top.toTrack}</span> comes next.
              </div>
              <div className="st-sub">
                One play, then almost always the same next one — your strongest segues, mostly crossing artists entirely.
              </div>
              <div style={{ display: "grid", gap: 9, marginTop: 4 }}>
                {segs.slice(0, 10).map((s, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, alignItems: "center" }}>
                    <div style={{ textAlign: "right", minWidth: 0 }} data-link={true} onClick={() => go("track", s.fromId)}>
                      <div className="st-row-name" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.fromTrack}</div>
                      <div className="st-row-sub" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.fromArtist}</div>
                    </div>
                    <div className="r-mono" style={{ fontSize: 10, color: `oklch(0.74 0.14 ${s.hue})`, whiteSpace: "nowrap" }}>{s.pct}% →</div>
                    <div style={{ minWidth: 0 }} data-link={true} onClick={() => go("track", s.toId)}>
                      <div className="st-row-name" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.toTrack}</div>
                      <div className="st-row-sub" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.toArtist}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })()}

        {/* year peaks + milestones — ONE RECORD BOOK (2026-09-21). Milestones was its own card
            440 lines up the feed, asking the same question this one asks — what did the tally
            land on — at a different unit: one row per YEAR here, one row per 50,000th scrobble
            there. They are folded as two blocks rather than interleaved because neither axis
            lines up: a heavy year carries two milestones and a thin one carries none, and the
            rows are different animals (a peak is four text columns, a milestone is a sleeve).
            Wave C's shape applies — one label, one title, two compact facets — and the
            "Milestones" TOC crumb left with its label. */}
        <section className="st-card">
          <div className="st-label">Heaviest days</div>
          <div className="st-title-sm">Annual single-day records — and what the counter landed on.</div>
          <div className="st-peaks">
            {I.YEAR_PEAKS.map(p => (
              <div key={p.year} className="st-peak" data-link={clickable(p.artist)} onClick={() => goIf(p.artist)}>
                <span className="st-peak-y">{p.year}</span>
                <span className="st-peak-n">{p.count}</span>
                <span className="st-peak-a" style={{ color: `oklch(0.74 0.12 ${p.hue})` }}>{p.artist}</span>
                <span className="st-peak-d">{fmtDate(p.date).slice(0, -5)}</span>
              </div>
            ))}
          </div>
          {I.MILESTONES && I.MILESTONES.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div className="st-yir-h">Milestones — every 50,000th scrobble</div>
              <div className="st-miles">
                {I.MILESTONES.map(m => (
                  <div key={m.n} className="st-mile" data-link={clickable(m.artist)} onClick={() => goIf(m.artist)}>
                    <span className="st-mile-n">{m.n / 1000}k</span>
                    <GenCover hue={m.hue} name={m.artist} size={38} radius={3} />
                    <div style={{ minWidth: 0 }}>
                      <div className="st-row-name">{m.track}</div>
                      <div className="st-row-sub">{m.artist} · {fmtDate(m.date)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* CHAPTER VI (feed re-cut 2026-09-21) — who made these records, who led you to them, and where they are from */}
        <div className="st-chapter"><span>VI</span> People &amp; places</div>

        {/* discoveries */}
        <section className="st-card">
          <div className="st-label">First contact</div>
          <div className="st-title-sm">The track that started each obsession.</div>
          <div className="st-list">
            {I.DISCOVERIES.slice(0, 6).map(d => (
              <ArtistRow key={d.artist} name={d.artist} hue={d.hue}
                right={<span className="st-num">{fmt(d.plays)}<small> since</small></span>}>
                “{d.track}” · {fmtDate(d.date)}
              </ArtistRow>
            ))}
          </div>
        </section>

        {/* WHO BROUGHT YOU HERE (2026-09-21) — the #lab GenealogyLab, graduated and sat beside
            First contact because the two are siblings: first contact is the TRACK that started
            each obsession, this is who led to whom. genealogy.js is lazy (~183 KB of slug → [the
            artist you heard just before, first play]) and the whole module is guarded on it the
            way The Reading is guarded on reading.js — nothing renders until the shard lands, and
            a 404 simply means this section never appears.
            The lab ranked gateways by how many artists they opened; this ranks by how many PLAYS
            walked through (Fuad 2026-09-21), which is a different list — one 5,000-play
            introduction outweighs six twenty-play ones. */}
        {gen && gen.gateways.length > 0 && (() => {
          const top = gen.gateways[0];
          // both the specimen chain and the tracer's ancestry draw with this: the lab's
          // arrow-and-dates line, moved off the prototype's mono into the feed's serif.
          const thread = (nodes) => (
            <div className="st-gen-chain">
              {nodes.map((c, i) => (
                <React.Fragment key={c.id}>
                  {i > 0 && <span className="st-gen-arrow">→</span>}
                  <span className="st-gen-node" data-link={hasPage(c.id)} onClick={() => hasPage(c.id) && go("artist", c.id)}>
                    {c.name}<i>{c.date ? c.date.slice(0, 7) : ""}</i>
                  </span>
                </React.Fragment>
              ))}
            </div>
          );
          return (
            <section className="st-card st-hero">
              <div className="st-label">Who brought you here</div>
              <div className="st-big" data-link={hasPage(top.id)} onClick={() => hasPage(top.id) && go("artist", top.id)}>
                <em>{top.name}</em> opened {top.n} door{top.n === 1 ? "" : "s"} — <em>{fmt(top.introduced)}</em> plays walked through.
              </div>
              <div className="st-sub">
                Reconstructed from listening sessions — the artist heard just before your first play. A guess, not a memory.
              </div>
              {gen.chain && (
                <div style={{ marginTop: 20 }}>
                  <div className="st-yir-h">The heaviest line in the library</div>
                  {thread(gen.chain)}
                  <div className="st-mi" style={{ marginTop: 7 }}>
                    {gen.chain.length} artists · {fmt(gen.chainPlays)} plays along the line
                  </div>
                </div>
              )}
              <div style={{ marginTop: 20 }}>
                <div className="st-yir-h">Your biggest gateways</div>
                <div className="st-list">
                  {gen.gateways.slice(0, 3).map(g => (
                    <ArtistRow key={g.id} name={g.name} hue={g.hue}
                      right={<span className="st-num">{fmt(g.introduced)}<small> plays in</small></span>}>
                      {g.n} artist{g.n === 1 ? "" : "s"} · heaviest: {gen.nameOf(g.kids[0])} ({fmt(gen.playsOf(g.kids[0]))})
                    </ArtistRow>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 18 }}>
                <input className="st-in" list="st-gen-artists" value={genPick} onChange={e => setGenPick(e.target.value)}
                  aria-label="trace an artist's ancestry" placeholder="trace an artist…" />
                <datalist id="st-gen-artists">{artistOptions}</datalist>
                {genTrace && genTrace.found && (
                  <div style={{ marginTop: 14 }}>
                    <div className="st-yir-h">Ancestry</div>
                    {genTrace.chain.length > 1
                      ? thread(genTrace.chain)
                      : <div className="st-sub" style={{ marginTop: 0 }}>Nobody — <b style={{ color: "var(--ink)" }}>{genTrace.name}</b> is where a thread starts. Their first play opened a session rather than continuing one.</div>}
                    {genTrace.kids.length > 0 && (
                      <>
                        <div className="st-yir-h" style={{ marginTop: 16 }}>
                          {genTrace.name} introduced {genTrace.kids.length} artist{genTrace.kids.length === 1 ? "" : "s"}
                        </div>
                        <div className="st-gen-kids">
                          {genTrace.kids.slice(0, 18).map(k => (
                            <span key={k} className="st-bandchip" data-link={hasPage(k)} onClick={() => hasPage(k) && go("artist", k)}>
                              {gen.nameOf(k)}<i className="st-gen-kidn">{fmt(gen.playsOf(k))}</i>
                            </span>
                          ))}
                          {genTrace.kids.length > 18 && (
                            <span className="st-mi" style={{ alignSelf: "center" }}>+{genTrace.kids.length - 18} more</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
                {genTrace && !genTrace.found && (
                  <div className="st-mi" style={{ marginTop: 8 }}>
                    No entry for that name — the map only reaches dated plays from artists you played at least five times.
                  </div>
                )}
              </div>
            </section>
          );
        })()}

        {/* connections — shared members / side-projects threading the library */}
        {I.CONNECTIONS && I.CONNECTIONS.links && I.CONNECTIONS.links.length > 0 && (() => {
          const C = I.CONNECTIONS;
          const top = C.links[0];
          return (
            <section className="st-card st-hero">
              <div className="st-label">Connected by blood</div>
              <div className="st-big" data-link={clickable(top.artists[0].name)} onClick={() => goIf(top.artists[0].name)}>
                <em>{top.person}</em> ties together {top.artists.length} acts you play.
              </div>
              <div className="st-sub">
                {fmt(C.totalLinks)} hidden threads run through the library — shared members, side-projects,
                the same hands on different records.
              </div>
              <div style={{ display: "grid", gap: 12, marginTop: 6 }}>
                {C.links.slice(0, 6).map(l => (
                  <div key={l.person} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span className="st-person">{l.person}</span>
                    {l.artists.map(a => (
                      <span key={a.name} className="st-bandchip" data-link={clickable(a.name)} onClick={() => goIf(a.name)}>
                        <span className="st-bandchip-dot" style={{ background: `oklch(0.62 0.16 ${a.hue})` }} />
                        {a.name}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </section>
          );
        })()}

        {/* lineups — Wikidata band-member gender (the layer MB can't give us) */}
        {I.LINEUPS && I.LINEUPS.featured && I.LINEUPS.featured.length >= 4 && (() => {
          const L = I.LINEUPS;
          return (
            <section className="st-card">
              <div className="st-label">Lineups</div>
              <div className="st-big">
                <em>{Math.round(L.womenBandShare * 100)}%</em> of your band-listening has women in the lineup.
              </div>
              <div className="st-sub">
                Of the {L.bandsAnalyzed} groups whose members Wikidata knows by name, <b style={{ color: "var(--ink)" }}>{L.bandsWithWomen}</b> have
                at least one woman on stage{L.allWomen.length > 0 ? <> — {L.allWomen.length} all-women</> : null}.
              </div>
              <div className="st-ug-cuts" style={{ marginTop: 18 }}>
                {L.featured.slice(0, 6).map(b => (
                  <div key={b.artistId} className="st-ug-cut" data-link={hasPage(b.artistId)}
                    onClick={() => hasPage(b.artistId) && go("artist", b.artistId)}>
                    <GenCover hue={b.hue} name={b.name} size={40} radius={4} />
                    <div style={{ minWidth: 0 }}>
                      <div className="st-row-name">{b.name}</div>
                      <div className="st-row-sub">{b.women.join(", ")}{b.memberCount > b.women.length ? ` · ${b.women.length}/${b.memberCount}` : ""} · {fmt(b.plays)} plays</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })()}

        {/* lifespan — bands that ended while you were listening, graves you dug up, the elders */}
        {I.LIFESPAN && I.LIFESPAN.whileListening.length > 0 && (() => {
          const L = I.LIFESPAN;
          const top = L.whileListening[0];
          const verb = (w) => w.person ? "died" : "disbanded";
          return (
            <section className="st-card st-hero">
              <div className="st-label">The ones that ended</div>
              <div className="st-big" data-link={clickable(top.name)} onClick={() => goIf(top.name)}>
                <em style={{ color: `oklch(0.78 0.14 ${top.hue})` }}>{top.name}</em> {verb(top)} in {top.end} —
                you'd already played them <em>{fmt(top.before)}</em> times.
              </div>
              <div className="st-sub">
                Of the {fmt(L.known)} artists with a documented life-span, <b style={{ color: "var(--ink)" }}>{L.endedCount} have ended</b> ({Math.round(L.endedShare * 100)}%) —
                and these ended <i>while you were listening</i>.
              </div>
              <div className="st-ug-cuts">
                {L.whileListening.map(w => (
                  <div key={w.name} className="st-ug-cut" data-link={clickable(w.name)} onClick={() => goIf(w.name)}>
                    <GenCover hue={w.hue} name={w.name} size={40} radius={4} />
                    <div style={{ minWidth: 0 }}>
                      <div className="st-row-name">{w.name}</div>
                      <div className="st-row-sub">{verb(w)} {w.end} · {fmt(w.before)} plays while alive{w.after >= 20 ? ` · ${fmt(w.after)} since` : ""}</div>
                    </div>
                  </div>
                ))}
              </div>
              {L.graves.length > 0 && (
                <div className="st-sub" style={{ marginTop: 18 }}>
                  And the graves you dug up: {L.graves.map((g, i) => (
                    <span key={g.name}>{i > 0 ? " · " : ""}<b className="st-inline-link" data-link={clickable(g.name)} onClick={() => goIf(g.name)}>{g.name}</b> ({g.gap} yrs after the end)</span>
                  ))}.
                  {L.elders.length > 0 && <> Still standing after everything: <b style={{ color: "var(--ink)" }}>{L.elders[0].name}</b>, going since {L.elders[0].begin}.</>}
                </div>
              )}
            </section>
          );
        })()}

        {/* the concert effect (wave F insight 3) — plays in the 30 days before vs after each
            attended show. Ships once CI rebuilds. */}
        {I.CONCERT_EFFECT && I.CONCERT_EFFECT.boosted && I.CONCERT_EFFECT.boosted.length >= 3 && (() => {
          const CE = I.CONCERT_EFFECT;
          const top = CE.boosted[0];
          return (
            <section className="st-card st-hero">
              <div className="st-label">The concert effect</div>
              <div className="st-big" data-link={clickable(top.artist)} onClick={() => goIf(top.artist)}>
                <em style={{ color: `oklch(0.78 0.14 ${top.hue})` }}>{top.artist}</em> went <em>{top.before} → {top.after}</em> plays
                in the month around {top.venue || top.city}.
              </div>
              <div className="st-sub">
                Each attended show, plays in the 30 days before vs after — <b style={{ color: "var(--ink)" }}>{CE.boostShare}%</b> of
                {" "}{CE.gigs} measurable gigs lifted the month that followed.
              </div>
              <div style={{ display: "grid", gap: 7, marginTop: 14, maxWidth: 560 }}>
                {CE.boosted.map(b => (
                  <div key={b.artist + b.date} className="st-row" data-link={clickable(b.artist)} onClick={() => goIf(b.artist)}>
                    <GenCover hue={b.hue} name={b.artist} size={36} radius={4} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="st-row-name" style={{ fontSize: 13.5 }}>{b.artist}</div>
                      <div className="st-row-sub">{b.city} · {b.date}</div>
                    </div>
                    <div className="st-row-right"><span className="st-num">{b.before} → {b.after}<small> plays</small></span></div>
                  </div>
                ))}
              </div>
              {CE.faded && CE.faded.length >= 2 && (
                <div className="st-sub" style={{ marginTop: 14 }}>
                  And the ones a show put to rest: {CE.faded.slice(0, 3).map((f, i) => (
                    <React.Fragment key={f.artist + f.date}>{i > 0 ? " · " : ""}
                      <b className="st-inline-link" data-link={clickable(f.artist)} onClick={() => goIf(f.artist)}>{f.artist}</b>
                      {" "}({f.before} → {f.after})</React.Fragment>
                  ))}.
                </div>
              )}
            </section>
          );
        })()}

        {/* taste geography — Origins with Map drift and Gateways folded in (wave C 2026-09-17:
            three adjacent modules cycled the same six countries, each with its own label, headline
            and sub; one label now carries three compact facets — totals, movement, first doors). */}
        {I.GEOGRAPHY && I.GEOGRAPHY.coverage > 0.3 && (() => {
          const G = I.GEOGRAPHY;
          const top = G.countries[0];
          const A = G.arc;
          const huesByCC = { US: 30, GB: 240, AU: 50, CA: 0, DE: 110, JP: 340 };
          const GW = (G.gateways || []).slice(0, 10);
          const fmtMonth = (iso) => { const d = new Date(iso); return window.MON[d.getUTCMonth()] + " " + d.getUTCFullYear(); };
          const drift = A && A.years && A.years.length >= 10 ? (() => {
            const firstYears = A.years.slice(0, 3), lastYears = A.years.slice(-3);
            const mover = A.countries.map(c => {
              const before = firstYears.reduce((s, y) => s + (y[c.code] || 0), 0) / firstYears.length;
              const after = lastYears.reduce((s, y) => s + (y[c.code] || 0), 0) / lastYears.length;
              return { ...c, delta: after - before, after };
            }).sort((a, b) => b.delta - a.delta)[0];
            const moverYear = A.years.find(y => (y[mover.code] || 0) >= mover.after * 0.4);
            return { mover, moverYear };
          })() : null;
          return (
            <section className="st-card st-hero">
              <div className="st-label">Origins</div>
              <div className="st-big">
                <em>{Math.round(top.share * 100)}%</em> {top.flag} <em>{top.name}</em>
                <span style={{ color: "var(--ink-soft)", fontSize: ".55em", fontStyle: "normal", marginLeft: 14 }}>
                  · {G.totalCountries} countries on the map
                </span>
              </div>
              <div className="st-sub">
                Of the {Math.round(G.coverage * 100)}% of plays we can place on a map, the rest scatter:&nbsp;
                {G.countries.slice(1, 6).map((c, i) => (
                  <React.Fragment key={c.code}>{i > 0 ? ", " : ""}{c.flag} <b style={{ color: "var(--ink)" }}>{c.name}</b> ({Math.round(c.share * 100)}%)</React.Fragment>
                ))}.
              </div>
              <div className="st-geo-grid">
                {G.countries.slice(0, 12).map(c => (
                  <div key={c.code} className="st-geo-c">
                    <div className="st-geo-flag">{c.flag || c.code}</div>
                    <div style={{ minWidth: 0 }}>
                      <div className="st-row-name">{c.name}</div>
                      <div className="st-row-sub">{fmt(c.plays)} plays · {c.artists} artists</div>
                    </div>
                    <div className="st-geo-pct">{Math.round(c.share * 100)}%</div>
                  </div>
                ))}
              </div>
              {drift && (
                <div style={{ marginTop: 20 }}>
                  <div className="st-yir-h">How it moved</div>
                  <div className="st-sub" style={{ marginBottom: 10 }}>
                    {drift.mover.flag} <b style={{ color: "var(--ink)" }}>{drift.mover.name}</b> crept in around
                    {" "}{drift.moverYear ? drift.moverYear.year : "—"} — now {Math.round(drift.mover.after * 100)}% of what
                    we can place; {A.years[0].year} was {Math.round(A.years[0].US * 100)}% American.
                  </div>
                  <div className="st-arc">
                    {A.countries.map(c => {
                      const series = A.years.map(y => y[c.code] || 0);
                      const now = series[series.length - 1];
                      const hue = huesByCC[c.code] || 200;
                      return (
                        <div key={c.code} className="st-arc-row">
                          <div className="st-arc-head">
                            <span className="st-arc-flag">{c.flag}</span>
                            <span className="st-arc-name">{c.name}</span>
                            <span className="st-arc-now" style={{ color: `oklch(0.7 0.16 ${hue})` }}>{Math.round(now * 100)}%</span>
                          </div>
                          <Spark data={series} w={420} h={24} run={true} labels={A.years.map(y => y.year)} fmtV={(v) => Math.round(v * 100) + "%"}
                            stroke={`oklch(0.7 0.16 ${hue})`} fill={`oklch(0.7 0.16 ${hue} / .12)`} />
                        </div>
                      );
                    })}
                  </div>
                  <div className="st-arc-axis">
                    <span>{A.years[0].year}</span>
                    <span>{A.years[Math.floor(A.years.length / 2)].year}</span>
                    <span>{A.years[A.years.length - 1].year}</span>
                  </div>
                </div>
              )}
              {GW.length >= 5 && (
                <div style={{ marginTop: 20 }}>
                  <div className="st-yir-h">Gateways — the first door into each lane</div>
                  <div className="st-gates">
                    {GW.map(g => (
                      <div key={g.code} className="st-gate" data-link={g.kept} onClick={() => g.kept && go("artist", g.artistId)}>
                        <div className="st-gate-stamp">
                          <span className="st-gate-flag">{g.flag}</span>
                          <span className="st-gate-date">{fmtMonth(g.firstHeard)}</span>
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="st-gate-country">{g.country}</div>
                          <div className="st-row-name" style={{ fontSize: 14, marginTop: 2 }}>via {g.artist}</div>
                        </div>
                        <div className="st-gate-n">{fmt(g.plays)} <small style={{ color: "var(--ink-faint)" }}>plays since</small></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {G.cities && G.cities.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div className="st-yir-h">Cities you tap into</div>
                  <div className="st-geo-cities">
                    {G.cities.slice(0, 8).map(c => (
                      <span key={c.country + c.city} className="r-chip" style={{ fontSize: 11 }}>
                        {c.flag} {c.city} <span style={{ color: "var(--ink-faint)", fontSize: 10 }}>· {c.artists}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          );
        })()}

        {/* CHAPTER VII (feed re-cut 2026-09-21) — from where they are from to what they sound like, and how that moved */}
        <div className="st-chapter"><span>VII</span> Sound &amp; style</div>

        {/* TOP OF EACH SCENE + BRIDGE ARTISTS — RETIRED (Fuad 2026-09-21: bridges measure Discogs
            tag co-occurrence, not connection, and the scene boxes are a directory the Explore page
            already provides). Both sections used to render here off I.STYLE_ATLAS.scenes/.bridges.
            The one atom worth keeping — each scene's solo artist, who exists ONLY in that scene for
            this listener — moved into Style atlas below as its opening "Carried alone" rows. */}

        {/* style atlas — discogs styles only you (or 1-2 artists) keep alive in this library */}
        {I.STYLE_ATLAS && I.STYLE_ATLAS.rarest && I.STYLE_ATLAS.rarest.length > 3 && (() => {
          const S = I.STYLE_ATLAS;
          const sole = S.rarest.filter(r => r.artists.length === 1).length;
          // solo salvage from the retired scene boxes (Fuad 2026-09-21) — CI-computed, may be
          // absent on an older payload; when no scene carries one this falls through untouched.
          // CARRIED ALONE — RETIRED IN FULL (Fuad 2026-09-21, second ruling: "Nu Metal, Hardcore,
          // Thrash and Metalcore need a phase-out... it just doesn't work here. Others are fine.")
          // The block was the salvage of the retired Top-of-each-scene module: first the umbrella
          // scenes went (Alternative Rock through Electro — tagging artifacts), and the narrow-scene
          // survivors turned out not to earn the card either. That empties the set, so the whole
          // block and its solos computation are gone; Style atlas is the rarest rows alone again,
          // which was always its good half. sc.solo still ships in the build should a better home
          // ever appear.
          return (
            <section className="st-card">
              <div className="st-label">Style atlas</div>
              <div className="st-title-sm">Only one or two artists hold these for you.</div>
              <div className="st-sub" style={{ marginBottom: 14 }}>
                Of <em>{S.uniqueStyles}</em> distinct styles across {S.artistsCovered} Discogs-indexed artists, these hang
                on the narrowest set of carriers{sole > 0 && <> — <em>{sole}</em> on a single artist</>}.
              </div>
              <div className="st-atlas">
                {S.rarest.map(r => (
                  <div key={r.style} className="st-atlas-row">
                    <div className="st-atlas-style">{r.style}</div>
                    <div className="st-atlas-via">
                      via {r.artists.map((a, i) => (
                        <React.Fragment key={a.name}>
                          {i > 0 ? <span style={{ color: "var(--ink-faint)" }}> + </span> : null}
                          <span data-link={clickable(a.name)} onClick={() => goIf(a.name)}
                            style={{ color: `oklch(0.78 0.14 ${a.hue})`, cursor: clickable(a.name) ? "pointer" : "default", fontWeight: 500 }}>
                            {a.name}
                          </span>
                        </React.Fragment>
                      ))}
                    </div>
                    <div className="st-atlas-n">{fmt(r.plays)}<small> plays</small></div>
                  </div>
                ))}
              </div>
            </section>
          );
        })()}

        {/* audio DNA drift — how the play-weighted average sound profile shifted year over year */}
        {I.AUDIO_DRIFT && I.AUDIO_DRIFT.years && I.AUDIO_DRIFT.years.length >= 12 && (() => {
          // skip pre-scrobbling synthetic years (undated remapped scrobbles)
          const Y = I.AUDIO_DRIFT.years.filter(y => y.coverage >= 1500);
          if (Y.length < 8) return null;
          const labels = {
            energy: "Energy",
            valence: "Mood",
            acoustic: "Acoustic",
            dance: "Danceable",
            tempo: "Tempo",
            instr: "Instrumental",
          };
          // deltas: last-3-year avg minus first-3-year avg, pick biggest absolute mover
          const first3 = Y.slice(0, 3), last3 = Y.slice(-3);
          const avg = (arr, ax) => arr.reduce((s, y) => s + y[ax], 0) / arr.length;
          const order = Object.keys(labels)
            .map(ax => ({ ax, delta: avg(last3, ax) - avg(first3, ax) }))
            .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
          const hue = { energy: 18, valence: 60, acoustic: 140, dance: 280, tempo: 200, instr: 340 };
          const top = order[0], second = order[1];
          const dir = d => d > 0 ? "climbed" : "dropped";
          return (
            <section className="st-card st-hero">
              <div className="st-label">Sound drift</div>
              <div className="st-big">
                <em>{labels[top.ax]}</em> {dir(top.delta)} {Math.round(Math.abs(top.delta) * 100)} pts.
                {" "}<em>{labels[second.ax]}</em> {dir(second.delta)} {Math.round(Math.abs(second.delta) * 100)}.
              </div>
              <div className="st-sub">
                The play-weighted sound profile per year, {Y[0].year}–{Y[Y.length - 1].year} — only the movers drawn.
              </div>
              <div className="st-turn">
                {order.slice(0, 2).map(({ ax }) => {
                  const series = Y.map(y => y[ax]);
                  return (
                    <div key={ax} className="st-turn-row">
                      <div className="st-turn-label">{labels[ax]}</div>
                      <Spark data={series} w={520} h={32} run={true} labels={Y.map(y => y.year)} fmtV={(v) => Math.round(v * 100)}
                        stroke={`oklch(0.7 0.16 ${hue[ax]})`} fill={`oklch(0.7 0.16 ${hue[ax]} / .12)`} />
                      <div className="st-turn-n">{Math.round(Y[Y.length - 1][ax] * 100)}</div>
                    </div>
                  );
                })}
                <div className="st-turn-axis">
                  <span>{Y[0].year}</span>
                  <span>{Y[Math.floor(Y.length / 2)].year}</span>
                  <span>{Y[Y.length - 1].year}</span>
                </div>
              </div>
              <div className="st-sub" style={{ marginTop: 10 }}>
                The rest barely moved: {order.slice(2).map((o, i) => (
                  <React.Fragment key={o.ax}>{i > 0 ? " · " : ""}{labels[o.ax]} {Math.round(Y[Y.length - 1][o.ax] * 100)}</React.Fragment>
                ))}.
              </div>
            </section>
          );
        })()}

        {/* THE COMFORT ZONE (2026-09-21) — graduated from the #lab TasteFingerprint prototype and
            parked directly under Sound drift on purpose: drift is how the sound MOVED, this is
            where it lives. The strip is the prototype's one genuinely good graphic and its
            anatomy survives intact — label · density strip · range — restyled off every LAB_*
            constant onto the site's tokens, so the density ramp follows the tweak panel's accent
            hue rather than a hard-coded pink.
            Two precomputed rows carry the story at rest; the scorer under them is the prototype's
            interaction, kept because the reader gets to aim it (Fuad: "interactivity is key,
            providing power to the audience"). */}
        {comfort && (() => {
          const C = comfort, TZ = C.tight;
          // A band pinned against the floor reads as broken in the "sits between X and Y" frame —
          // acoustic is 0–1 here, and "between 0 and 1" looks like a bug rather than a finding.
          // Same fact, phrased as a ceiling.
          const pinned = TZ.p25 === 0 && TZ.p75 <= 3;
          const ramp = (b) => "linear-gradient(90deg," + b.dens.filter((_, j) => j % 2 === 0)
            .map((d, j) => "oklch(0.74 0.13 var(--acc-h) / " + (d / (b.max || 1) * 0.9).toFixed(2) + ") " + (j * 2) + "%").join(",") + ")";
          const P = czScore && czScore.found ? czScore : null;
          return (
            <section className="st-card st-hero">
              <div className="st-label">The comfort zone</div>
              <div className="st-big">
                {pinned
                  ? <>Half of everything you play scores <em>{TZ.p75} or less</em> out of 100 on <em>{TZ.label.toLowerCase()}</em>.</>
                  : <>Half of everything you play sits between <em>{TZ.p25}</em> and <em>{TZ.p75}</em> on <em>{TZ.label.toLowerCase()}</em>.</>}
              </div>
              <div className="st-sub">
                Every play, weighted, poured onto each audio axis — the shaded mass is where they land,
                the bracket is the middle 50% that is your comfort band, and the tick is the median.
              </div>
              <div className="st-cz">
                {C.bands.map(b => {
                  const v = P ? P.vals[b.name] : null;
                  const inB = v !== null && v >= b.p25 && v <= b.p75;
                  return (
                    <div key={b.name} className="st-cz-row">
                      <div className="st-cz-lbl">{b.label}</div>
                      <div className="st-cz-strip" title={`${b.label} · comfort band ${b.p25}–${b.p75} · median ${b.p50}`}>
                        <div className="st-cz-dens" style={{ backgroundImage: ramp(b) }} />
                        <div className="st-cz-band" style={{ left: b.p25 + "%", width: Math.max(1.4, b.p75 - b.p25) + "%" }} />
                        <div className="st-cz-med" style={{ left: `calc(${b.p50}% - 1px)` }} />
                        {v !== null && <i className="st-cz-dot" data-in={inB ? "true" : "false"}
                          style={{ left: `calc(${v}% - 5.5px)` }} title={`${P.name} · ${v}`} />}
                      </div>
                      <div className="st-cz-n">{b.p25}–{b.p75}</div>
                    </div>
                  );
                })}
              </div>
              <div className="st-mi st-mi-soft" style={{ marginTop: 11 }}>
                Tightest: {C.tight.label.toLowerCase()} {C.tight.p25}–{C.tight.p75} · loosest: {C.loose.label.toLowerCase()} {C.loose.p25}–{C.loose.p75}
              </div>
              {C.inside && C.outside && (
                <div className="st-cz-pair">
                  <div style={{ minWidth: 0 }}>
                    <div className="st-yir-h">Squarely your sound</div>
                    <ArtistRow name={C.inside.name} hue={C.inside.hue}
                      right={<span className="st-num">{fmt(C.inside.plays)}<small> plays</small></span>}>
                      inside the band on {C.inside.hits} of {C.bands.length} axes
                    </ArtistRow>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="st-yir-h">The outlier you love anyway</div>
                    <ArtistRow name={C.outside.name} hue={C.outside.hue}
                      right={<span className="st-num">{fmt(C.outside.plays)}<small> plays</small></span>}>
                      outside the band on {C.outside.miss.length} of {C.bands.length} axes
                    </ArtistRow>
                    <div className="st-mi st-cz-miss">
                      {C.outside.miss.map((m, i) => (
                        <React.Fragment key={m.name}>{i > 0 ? " · " : ""}{m.label.toLowerCase()} {m.v} vs {m.p25}–{m.p75}</React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div style={{ marginTop: 18 }}>
                <input className="st-in" list="st-cz-artists" value={czPick} onChange={e => setCzPick(e.target.value)}
                  aria-label="score an artist against your comfort band"
                  placeholder="score an artist against your fingerprint…" />
                <datalist id="st-cz-artists">{artistOptions}</datalist>
                {P && (
                  <div className="st-sub" style={{ marginTop: 10 }}>
                    <b className="st-inline-link" data-link={hasPage(P.id)} onClick={() => hasPage(P.id) && go("artist", P.id)}>{P.name}</b> sits
                    inside your comfort band on <b style={{ color: "var(--ink)" }}>{P.hits.length} of {C.bands.length}</b> axes
                    {P.miss.length
                      ? <> — the outliers: {P.miss.map((b, i) => (
                          <React.Fragment key={b.name}>{i > 0 ? ", " : ""}{b.label.toLowerCase()} {P.vals[b.name]} vs your {b.p25}–{b.p75}</React.Fragment>
                        ))}.</>
                      : <> — squarely your sound.</>}
                  </div>
                )}
                {czScore && !czScore.found && (
                  <div className="st-mi" style={{ marginTop: 8 }}>
                    No measured audio row for that name — sound ships for the {fmt(Object.keys(R.AUDIO || {}).length)} artists with enough of a catalogue to average.
                  </div>
                )}
              </div>
            </section>
          );
        })()}

        {/* CHAPTER VIII (feed re-cut 2026-09-21) — from the sound to the text; the mood card is the hinge and must be read after both */}
        <div className="st-chapter"><span>VIII</span> Words &amp; moods</div>

        {/* the languages you listen in — from Genius lyrics language detection */}
        {I.LANGUAGE && I.LANGUAGE.shares.length > 1 && (() => {
          const L = I.LANGUAGE;
          const max = L.shares[0].plays;
          const top = L.shares.slice(0, 8);
          const topNon = L.topNonEn[0];
          // LANGUAGE DRIFT, FOLDED IN (2026-09-21) — it lived directly below as its own card:
          // six sparklines off the SAME I.LANGUAGE payload, answering "and how did that move"
          // for a card whose own sub already names the biggest non-English voice. Wave C's shape
          // (Map drift into Origins, Emotional weather into Sounds happy): the arithmetic is
          // unchanged, the section becomes a facet under one label, and its own st-big headline
          // demotes to the facet sub. The "Language drift" TOC crumb left with the label.
          const A = L.arc;
          const huesByLang = { pl: 15, de: 110, ja: 340, sv: 210, es: 40, fr: 260, ko: 300, fi: 190, ru: 350, pt: 60 };
          const drift = A && A.years && A.years.length >= 6 ? (() => {
            // mover: the non-English language that gained the most share, early years → last 3 avg
            const firstYears = A.years.slice(0, 3), lastYears = A.years.slice(-3);
            const mover = A.langs.map(l => {
              const before = firstYears.reduce((s, y) => s + (y.byLang[l.lang] || 0), 0) / firstYears.length;
              const after = lastYears.reduce((s, y) => s + (y.byLang[l.lang] || 0), 0) / lastYears.length;
              return { ...l, delta: after - before, after };
            }).sort((a, b) => b.delta - a.delta)[0];
            const moverYear = A.years.find(y => (y.byLang[mover.lang] || 0) >= mover.after * 0.5);
            const nonEnSeries = A.years.map(y => y.nonEnPct);
            const peakNonEn = A.years[nonEnSeries.indexOf(Math.max(...nonEnSeries))];
            return { mover, moverYear, peakNonEn };
          })() : null;
          return (
            <section className="st-card st-hero">
              <div className="st-label">Languages</div>
              <div className="st-big">
                {L.nonEnPct >= 4
                  ? <><em>{L.nonEnPct}%</em> of your listening isn't in English.</>
                  : <>You listen across <em>{L.langs}</em> languages.</>}
              </div>
              <div className="st-sub">
                Across {fmt(L.covered)} songs with detectable lyrics, {L.shares[1] ? <>the biggest non-English voice is <b style={{ color: "var(--ink)" }}>{L.shares[1].name}</b>{L.shares[2] ? <>, then {L.shares[2].name}</> : null}</> : null}{topNon ? <> — most-played: <b className="st-inline-link" data-link={clickable(topNon.artist)} onClick={() => go("track", topNon.id)}>{topNon.title}</b> ({topNon.langName}, {fmt(topNon.plays)} plays)</> : null}.
              </div>
              <div style={{ display: "grid", gap: 7, marginTop: 18, maxWidth: 520 }}>
                {top.map(s => (
                  <div key={s.lang} style={{ display: "grid", gridTemplateColumns: "84px 1fr 54px", gap: 10, alignItems: "center" }}>
                    <span style={{ fontSize: 12.5, color: s.lang === "en" ? "var(--ink-soft)" : "var(--ink)" }}>{s.name}</span>
                    <div style={{ height: 7, background: "var(--bg-3)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: (s.plays / max * 100) + "%", background: s.lang === "en" ? "var(--rule-2)" : "var(--accent)", borderRadius: 4 }} />
                    </div>
                    <span className="r-mono st-nr">{fmt(s.plays)}</span>
                  </div>
                ))}
              </div>
              {drift && (
                <div style={{ marginTop: 20 }}>
                  <div className="st-yir-h">How it moved</div>
                  <div className="st-sub" style={{ marginBottom: 10 }}>
                    <b style={{ color: "var(--ink)" }}>{drift.mover.name}</b> crept in around
                    {" "}{drift.moverYear ? drift.moverYear.year : "—"} — now {Math.round(drift.mover.after * 100)}% of a
                    year's lyrics; the most non-English year was {drift.peakNonEn.year} at {Math.round(drift.peakNonEn.nonEnPct * 100)}%.
                  </div>
                  <div className="st-arc">
                    {A.langs.map(l => {
                      const series = A.years.map(y => y.byLang[l.lang] || 0);
                      const now = series[series.length - 1];
                      const peak = Math.max(...series);
                      const peakYr = A.years[series.indexOf(peak)].year;
                      const hue = huesByLang[l.lang] || 200;
                      return (
                        <div key={l.lang} className="st-arc-row">
                          <div className="st-arc-head">
                            <span className="st-arc-name">{l.name}</span>
                            <span className="st-arc-now" style={{ color: `oklch(0.7 0.16 ${hue})` }}>{Math.round(now * 100)}%</span>
                          </div>
                          <Spark data={series} w={420} h={32} run={true} labels={A.years.map(y => y.year)} fmtV={(v) => Math.round(v * 100) + "%"}
                            stroke={`oklch(0.7 0.16 ${hue})`} fill={`oklch(0.7 0.16 ${hue} / .12)`} />
                          <div className="st-arc-peak">peak {Math.round(peak * 100)}% in '{String(peakYr).slice(2)}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="st-arc-axis">
                    <span>{A.years[0].year}</span>
                    <span>{A.years[Math.floor(A.years.length / 2)].year}</span>
                    <span>{A.years[A.years.length - 1].year}</span>
                  </div>
                </div>
              )}
              {L.topNonEn.length > 1 && (
                <div className="st-ug-cuts" style={{ marginTop: 18 }}>
                  {L.topNonEn.slice(0, 6).map(t => (
                    <div key={t.id} className="st-ug-cut" data-link={clickable(t.artist)} onClick={() => go("track", t.id)}>
                      <GenCover hue={t.hue} name={t.artist} size={40} radius={4} />
                      <div style={{ minWidth: 0 }}>
                        <div className="st-row-name">{t.title}</div>
                        <div className="st-row-sub">{t.artist} · {t.langName} · {fmt(t.plays)} plays</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })()}

        {/* mother tongues (wave F insight 6) — of the artists from non-Anglophone countries,
            who sings their own language and who trades it for English. Ships once CI rebuilds. */}
        {I.MOTHER_TONGUE && I.MOTHER_TONGUE.countries && I.MOTHER_TONGUE.countries.length >= 2 && (() => {
          const MT = I.MOTHER_TONGUE.countries;
          const keeper = MT.slice().sort((a, b) => (b.nK / Math.max(b.nK + b.nT, 1)) - (a.nK / Math.max(a.nK + a.nT, 1)))[0];
          const trader = MT.slice().sort((a, b) => (b.nT / Math.max(b.nK + b.nT, 1)) - (a.nT / Math.max(a.nK + a.nT, 1)))[0];
          const chip = (a) => (
            <b key={a.artistId} className="st-inline-link" data-link={hasPage(a.artistId)}
              onClick={() => hasPage(a.artistId) && go("artist", a.artistId)}>{a.artist}</b>
          );
          const joinChips = (arr) => arr.map((a, i) => <React.Fragment key={a.artistId}>{i > 0 ? ", " : ""}{chip(a)}</React.Fragment>);
          return (
            <section className="st-card st-hero">
              <div className="st-label">Mother tongues</div>
              <div className="st-big">
                Your {keeper.homeLang} bands keep <em>{keeper.homeLang}</em> —
                {" "}your {trader.homeLang} ones switch to <em>English</em>.
              </div>
              <div className="st-sub">
                For each non-Anglophone country, who sings the home language and who trades it away.
              </div>
              <div style={{ display: "grid", gap: 9, marginTop: 14 }}>
                {MT.map(c => (
                  <div key={c.cc} style={{ fontSize: 13 }}>
                    <span style={{ fontSize: 16, marginRight: 6 }}>{c.flag}</span>
                    <b>{c.name}</b>
                    <span className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)", marginLeft: 8 }}>
                      {c.nK} in {c.homeLang} · {c.nT} in English</span>
                    <div className="r-mono" style={{ fontSize: 10.5, color: "var(--ink-soft)", marginTop: 2 }}>
                      {c.keepers.length > 0 && <>{c.homeLang}: {joinChips(c.keepers)}</>}
                      {c.keepers.length > 0 && c.traders.length > 0 && <span style={{ color: "var(--ink-faint)" }}> — </span>}
                      {c.traders.length > 0 && <>English: {joinChips(c.traders)}</>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })()}

        {/* mood — Spotify audio valence × NRC lyric valence ("sounds happy / reads dark") */}
        {I.MOOD && (I.MOOD.happyDark.length >= 3 || I.MOOD.darkHappy.length >= 3) && (() => {
          const M = I.MOOD;
          const Cut = ({ t }) => (
            <div className="st-ug-cut" data-link={true} onClick={() => go("track", t.id)}>
              <GenCover hue={t.hue} name={t.artist} size={40} radius={4} />
              <div style={{ minWidth: 0 }}>
                <div className="st-row-name">{t.title}</div>
                <div className="st-row-sub">{t.artist} · <span style={{ color: "oklch(0.72 0.15 145)" }}>sounds {t.aud}</span> · <span style={{ color: "oklch(0.68 0.16 25)" }}>reads {t.lyr}</span></div>
              </div>
            </div>
          );
          return (
            <section className="st-card st-hero">
              <div className="st-label">Sounds happy, reads dark</div>
              <div className="st-big">
                Your library <em>sounds {M.avgAud}</em> but <em>reads {M.avgLyr}</em>
                <span style={{ color: "var(--ink-soft)", fontSize: ".5em", fontStyle: "normal", display: "block", marginTop: 6 }}>
                  0–100 — how it sounds (Spotify) vs what the words say (NRC lyric sentiment)
                </span>
              </div>
              <div className="st-sub">
                Across {fmt(M.tracks)} tracks scored on both axes, {M.happyDarkCount} are bright melodies wrapped
                around {M.happyDarkReg ? <>mostly <b style={{ color: "var(--ink)" }}>{M.happyDarkReg}</b> words</> : "bleak words"}{M.darkHappyCount ? <>, and {M.darkHappyCount} are the reverse — heavy sound, hopeful text</> : null}.
              </div>
              {M.happyDark.length >= 3 && (
                <>
                  <div className="st-title-sm" style={{ marginTop: 20, marginBottom: 10 }}>Bright sound, bleak words</div>
                  <div className="st-ug-cuts" style={{ marginTop: 0 }}>{M.happyDark.slice(0, 6).map(t => <Cut key={t.id} t={t} />)}</div>
                </>
              )}
              {M.darkHappy.length >= 3 && (
                <>
                  <div className="st-title-sm" style={{ marginTop: 20, marginBottom: 10 }}>Heavy sound, hopeful words</div>
                  <div className="st-ug-cuts" style={{ marginTop: 0 }}>{M.darkHappy.slice(0, 6).map(t => <Cut key={t.id} t={t} />)}</div>
                </>
              )}
              {M.emotions.length > 0 && (
                <div className="st-sub" style={{ marginTop: 18 }}>
                  Dominant lyric emotion across your plays: {M.emotions.slice(0, 4).map((e, i) => (
                    <React.Fragment key={e.emo}>{i > 0 ? ", " : ""}<b style={{ color: "var(--ink)" }}>{e.emo}</b></React.Fragment>
                  ))}.
                </div>
              )}
              {/* year-by-year weather — folded in from the retired Emotional weather module
                  (wave C 2026-09-17): a full card for one flat fact, and its chip row printed the
                  same register seventeen times. Now: one sentence, two compact arcs, and chips
                  ONLY for years whose register deviates from the modal one. */}
              {M.arc && M.arc.length >= 6 && (() => {
                const A = M.arc;
                const yrLabel = (y) => y.reg || y.topEmo;
                const last = A[A.length - 1];
                const modal = M.topRegister || yrLabel(last);
                const darkest = A.reduce((m, y) => (y.aud < m.aud ? y : m), A[0]);
                const dev = A.filter((y) => yrLabel(y) !== modal);
                return (
                  <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--rule)" }}>
                    <div className="st-sub" style={{ marginBottom: 10 }}>
                      Year by year it reads <b style={{ color: "var(--ink)" }}>{modal}</b> — the darkest-sounding
                      year was {darkest.year} ({darkest.aud}){last.aud > darkest.aud + 3 ? <>, brightened to {last.aud} since</> : null}.
                    </div>
                    <div className="st-arc">
                      <div className="st-arc-row">
                        <div className="st-arc-head"><span className="st-arc-name">Sounds</span>
                          <span className="st-arc-now" style={{ color: "oklch(0.72 0.15 145)" }}>{last.aud}</span></div>
                        <Spark data={A.map(y => y.aud)} w={420} h={24} run={true} labels={A.map(y => y.year)}
                          stroke="oklch(0.72 0.15 145)" fill="oklch(0.72 0.15 145 / .12)" />
                      </div>
                      <div className="st-arc-row">
                        <div className="st-arc-head"><span className="st-arc-name">Reads</span>
                          <span className="st-arc-now" style={{ color: "oklch(0.68 0.16 25)" }}>{last.lyr}</span></div>
                        <Spark data={A.map(y => y.lyr)} w={420} h={24} run={true} labels={A.map(y => y.year)}
                          stroke="oklch(0.68 0.16 25)" fill="oklch(0.68 0.16 25 / .12)" />
                      </div>
                    </div>
                    {dev.length > 0 && dev.length <= 8 && (
                      <div style={{ display: "flex", gap: 4, marginTop: 10, flexWrap: "wrap" }}>
                        {dev.map(y => (
                          <span key={y.year} className="r-mono" style={{ fontSize: 9, padding: "3px 7px", borderRadius: 999,
                            border: "1px solid var(--rule)", color: "var(--accent)" }}>
                            '{String(y.year).slice(2)} {yrLabel(y)}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="st-arc-axis"><span>{A[0].year}</span><span>{last.year}</span></div>
                  </div>
                );
              })()}
            </section>
          );
        })()}

        {/* LYRIC THEMES — MERGED AWAY 2026-09-21 ──────────────────────────────────────────────
            A second theme card lived here: the overall shares as a bar list, the top-3 themes'
            exemplar cuts, a riser/faller Spark pair, and a "Signature obsessions" artist line.
            It answered "what is it about"; Lyrical diet at the foot of the feed answered "what
            changed" off the SAME THEMES payload — two cards on one subject, a thousand lines
            apart, each forced to declare the same coverage caveat (Fuad: "I wonder if we could
            combine Lyrical Diet with Lyric Themes. It'd become a larger story but well").
            What was only here moved there: the overall claim is the merged module's headline, and
            the artist theme-profiles (THEMES.artists — the payload's only answer to WHO feeds a
            theme) are its closing block, now with their share numbers instead of a name and a
            theme in brackets. What was a second copy died here: the bar list (the chips carry the
            same percentages), the exemplar cuts (the pinned panel opens tracks for all eighteen
            themes, not three), and the riser/faller Sparks (the stacked chart IS that turn, drawn
            off the full matrix rather than the arc's six — and the merged riser can be a theme
            the arc does not even carry, which those Sparks would have drawn as a flat zero).
            The TOC rail self-registers off .st-label, so the "Lyric themes" crumb left with it. */}

        {/* CHAPTER IX (feed re-cut 2026-09-21) — the closing couplet, both placements owner-approved: the chart, then the portrait naming it */}
        <div className="st-chapter"><span>IX</span> The verdict</div>

        {/* LYRICAL DIET (2026-09-21) — the feed's last chart, and it sits here rather than up in
            the words chapter (VIII) on purpose: it is the quantitative shadow of the portrait's "the words run
            darker" line. The chart shows the drift, The Reading immediately below names it, and
            the feed closes on the naming.
            Graduated from the #lab prototype with the one thing the lab could not do (Fuad
            2026-09-21: "not just a limited selection") — THEMES.matrix carries every theme's
            per-mille share per year, so the WHOLE diet stacks and the picker reaches all of it
            rather than the arc's top six.
            RESTYLED + REWIRED 2026-09-21 on three rulings. (1) "the bars to not contain fill
            color, only strokes, a la style on overview" — every segment is an outline now, the
            register the Overview strips use, and only the ACTIVE theme takes a fill (18%). (2)
            "make the interaction hoverable" — hovering any band lights that theme across every
            year; a chip click still PINS one, and the pin beats the hover. (3) the colours are
            semantic and the stack is sorted by them (ST_DIET_HUES, top of file).
            MERGED 2026-09-21 (Fuad: "I wonder if we could combine Lyrical Diet with Lyric
            Themes. It'd become a larger story but well"). Chapter III's card read the same
            payload and answered the other half of the question, so this is now the WHOLE theme
            story, told largest first:
              THE CLAIM   the biggest theme's lifetime share — the old card's headline, and the
                          plainest thing the data says;
              THE CHANGE  the riser/fader sentence and the stacks, untouched, because the drift
                          is the half only a chart can carry;
              THE WHO     the artist theme-profiles, which only the old card ever showed, closing
                          the module on the names behind the colours.
            Label kept as "Lyrical diet": a diet is already both halves — what gets eaten and how
            that changes — and it is the crumb the TOC rail has been registering. The tombstone in
            the old words-chapter card lists what was dropped as a duplicate rather than carried across. */}
        {diet && (() => {
          const D = diet, T = I.THEMES, H = 168;
          // TWO SELECTIONS, ONE OF THEM DISPOSABLE. `sel` is PINNED (a chip click) and is the only
          // one the exemplar panel below ever reads — that panel opens tracks and artists, so it
          // must not flicker as the pointer crosses the chart. `hot` is the hover preview and
          // reaches the BARS, the CHIPS and the profile rows only. Pin wins outright: while
          // something is pinned, hot is forced null, so a hover can never move the chart out from
          // under the panel.
          const sel = D.hue[dietSel] != null ? dietSel : null;
          const hot = !sel && dietHot && D.hue[dietHot] != null ? dietHot : null;
          const act = sel || hot;
          const actJ = act ? D.names.indexOf(act) : -1;
          // a theme can be pickable without being drawn (the degraded arc stacks six but the
          // chips reach eight) — then its exemplars still open and the chart simply does not dim.
          const dim = actJ >= 0;
          const pts = (d) => (d > 0 ? "+" : "−") + Math.abs(d).toFixed(1);
          // three skins on one hue, all stroke-first: at rest a 60%-alpha outline over a 10% wash;
          // ACTIVE, a near-solid outline over 18%; QUIET (some other theme is active) a 28%
          // outline over 5%, which keeps the stack legible as a stack without competing.
          const seg = (th, state, px) => {
            const h = D.hue[th];
            if (state === "on") return { height: px, borderColor: `oklch(0.82 0.16 ${h} / 0.95)`, background: `oklch(0.74 0.17 ${h} / 0.18)` };
            if (state === "quiet") return { height: px, borderColor: `oklch(0.62 0.09 ${h} / 0.28)`, background: `oklch(0.62 0.09 ${h} / 0.05)` };
            return { height: px, borderColor: `oklch(0.68 0.13 ${h} / 0.60)`, background: `oklch(0.68 0.13 ${h} / 0.10)` };
          };
          const ex = sel ? ((T.exemplarsAll || T.exemplars || {})[sel] || []) : [];
          // FED BY, WITH THE NUMBER (2026-09-21, out of the merge). The old chapter-III card spent
          // these profiles on a flat "Signature obsessions: name (theme)" line; the share is the
          // half that means something, so the pinned panel carries it now. THEMES.artists is
          // play-ordered, so the slice is the theme's heaviest feeders and not an arbitrary six.
          const fedAll = sel ? (T.artists || []).map(a => {
            const hit = (a.themes || []).find(t => t.theme === sel);
            return hit ? { a: a, share: hit.share } : null;
          }).filter(Boolean) : [];
          const fed = fedAll.slice(0, 6);
          const chip = (s) => (
            <button key={s.theme} type="button" className="st-diet-chip" data-on={sel === s.theme ? "true" : undefined}
              data-hot={hot === s.theme ? "true" : undefined}
              onClick={() => setDietSel(sel === s.theme ? null : s.theme)}
              onMouseEnter={() => setDietHot(s.theme)}
              style={sel === s.theme
                ? { background: `oklch(0.72 0.15 ${D.hue[s.theme]})`, borderColor: `oklch(0.72 0.15 ${D.hue[s.theme]})` }
                : { borderColor: `oklch(${hot === s.theme ? "0.72 0.15" : "0.50 0.08"} ${D.hue[s.theme]})` }}>
              {s.theme} · {Math.round(s.share * 100)}%
            </button>
          );
          // THE HEADLINE, CLAIM FIRST (2026-09-21 merge). The share sentence is the old card's
          // hero; the movement sentence is this module's own, numbers untouched. The two COLLIDE
          // on today's data — the biggest theme is also the fastest riser — and naming it twice in
          // three lines reads as a stutter, so when they are the same theme the claim keeps going
          // instead of restating the name.
          const top = (T.shares && T.shares[0]) || null;
          const same = !!(top && D.riser && top.theme === D.riser.th);
          const turn = same
            ? <>— and still climbing, up <em>{pts(D.riser.d)} points</em> on your first years, while <em>{D.fader.th}</em> is down <em>{pts(D.fader.d)}</em>.</>
            : <><em>{D.riser.th}</em> is up <em>{pts(D.riser.d)} points</em> on your first years, <em>{D.fader.th}</em> down <em>{pts(D.fader.d)}</em>.</>;
          return (
            <section className="st-card st-hero">
              <div className="st-label">Lyrical diet</div>
              <div className="st-big">
                {top ? <><em>{Math.round(top.share * 100)}%</em> of what you play is about <em>{top.theme}</em>{same ? " " : ". "}</> : null}
                {turn}
              </div>
              <div className="st-sub">
                Play-weighted shares of what the words are about, year by year, over {fmt(T.covered)} theme-classified
                tracks ({Math.round(T.coveredPlays / T.totalPlays * 100)}% of plays).
                {D.full ? ` All ${D.names.length} themes stack here` : " Only the six biggest themes are in this payload"}, stacked in colour
                order — blood at the foot of each bar, rose at the crown. Every chip below carries that theme's share of
                everything you play; hover a band to follow one across the years, pick one to pull its songs and its
                feeders out of the mix.
              </div>
              {/* onMouseLeave on the CONTAINER, not on each band: moving between two touching
                  segments fires leave-then-enter, and clearing on the segment's own leave would
                  blink the whole chart between every pair. One clear at the edge of the chart. */}
              <div className="st-diet" style={{ height: H + 26 }} onMouseLeave={() => setDietHot(null)}>
                {D.years.map(y => {
                  const drawn = y.v.reduce((s, x) => s + x, 0);
                  const rem = 1 - drawn;
                  return (
                    <div key={y.year} className="st-diet-col" title={`${y.year} · ${fmt(y.plays)} themed plays`}>
                      {/* an "other" cap only where the stack genuinely leaves room: the matrix rows
                          sum to ~1000 per-mille (rounding puts them at 998–1002), so on today's
                          payload this never draws — it exists for the degraded arc, which really
                          is only six themes deep. */}
                      {rem > 0.005 && <div className="st-diet-seg" style={{ height: Math.round(rem * H), borderColor: "var(--rule)" }} title="every other theme" />}
                      {/* D.draw is the hue order REVERSED (built once in the memo): the column is
                          justify-content:flex-end, so the FIRST child sits highest and the low
                          hues have to go out last to land at the foot. Same order in every year,
                          which is what lets a theme's band be followed across the row. */}
                      {D.draw.map((j) => {
                        const th = D.names[j], v = y.v[j] || 0;
                        if (v <= 0) return null;
                        return <div key={th} className="st-diet-seg" data-on={dim && j === actJ ? "true" : undefined}
                          style={seg(th, dim ? (j === actJ ? "on" : "quiet") : "rest", Math.max(2, Math.round(v * H)))}
                          onMouseEnter={() => setDietHot(th)}
                          title={`${th} · ${(v * 100).toFixed(1)}% of ${y.year}`} />;
                      })}
                      <div className="st-diet-yr">{String(y.year).slice(2)}</div>
                    </div>
                  );
                })}
              </div>
              <div className="st-diet-chips" onMouseLeave={() => setDietHot(null)}>
                {D.chips.map(chip)}
                {D.full && D.rest.length > 0 && (
                  <button type="button" className="st-diet-chip st-diet-more" onClick={() => setDietAll(v => !v)}
                    onMouseEnter={() => setDietHot(null)} aria-expanded={dietAll}>
                    {dietAll ? "fewer" : `all ${D.names.length} themes`}
                  </button>
                )}
                {dietAll && D.rest.map(chip)}
              </div>
              {sel && (
                <div className="st-diet-pick">
                  <div className="st-yir-h">{sel} · the songs that carry it</div>
                  {ex.length > 0 ? (
                    <div className="st-list">
                      {ex.map(x => (
                        <div key={x.id} className="st-row" data-link={true} onClick={() => go("track", x.id)}>
                          <GenCover hue={x.hue} name={x.artist} size={44} radius={4} />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div className="st-row-name">{x.title}</div>
                            <div className="st-row-sub">{x.artist}</div>
                          </div>
                          <div className="st-row-right"><span className="st-num">{fmt(x.plays)}<small> plays</small></span></div>
                        </div>
                      ))}
                    </div>
                  ) : <div className="st-mi">No exemplar tracks shipped for this theme.</div>}
                  {fed.length > 0 && (
                    <div className="st-sub" style={{ marginTop: 10 }}>
                      Fed by, as a share of their own themed plays: {fed.map((f, i) => (
                        <React.Fragment key={f.a.artistId}>{i > 0 ? " · " : ""}
                          <b className="st-inline-link" data-link={hasPage(f.a.artistId)}
                            onClick={() => hasPage(f.a.artistId) && go("artist", f.a.artistId)}>{f.a.name}</b>
                          <span style={{ color: "var(--ink-faint)" }}> {Math.round(f.share * 100)}%</span>
                        </React.Fragment>
                      ))}
                      {fedAll.length > fed.length ? ` and ${fedAll.length - fed.length} more in the list below` : ""}.
                    </div>
                  )}
                </div>
              )}
              {/* THE WHO — absorbed 2026-09-21 from the old Lyric-themes card, where these fourteen were
                  a bare "Signature obsessions: name (theme)" line with no numbers. THEMES.artists
                  is the heaviest theme-classified artists with their top two themes and each
                  theme's grip on that artist's OWN plays, and it is the only place the payload
                  answers who feeds what — which is what earned it the trip across rather than the
                  tombstone. Hovering a row lights that artist's dominant theme in the chart above
                  (the same dietHot a band or a chip sets), so the block doubles as a legend: point
                  at Rammstein and party & hedonism lights up across every year at once. A pin
                  still wins, so a reader who has parked a theme can read down the list without
                  losing it — and the rows answer back instead, every line carrying the active
                  theme brightening while it is held. */}
              {(T.artists || []).length >= 5 && (
                <div className="st-diet-who">
                  <div className="st-yir-h">Who feeds which theme · share of their own themed plays</div>
                  <div className="st-thp" onMouseLeave={() => setDietHot(null)}>
                    {T.artists.map(a => (
                      <div key={a.artistId} className="st-row" data-link={hasPage(a.artistId)}
                        onClick={() => hasPage(a.artistId) && go("artist", a.artistId)}
                        onMouseEnter={() => setDietHot(a.themes && a.themes[0] ? a.themes[0].theme : null)}>
                        <GenCover hue={a.hue} name={a.name} size={34} radius={4} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="st-row-name">{a.name}</div>
                          <div className="st-thp-th">
                            {(a.themes || []).map(t => (
                              <span key={t.theme} className="st-thp-one" data-on={act === t.theme ? "true" : undefined}>
                                <i style={{ background: `oklch(0.70 0.15 ${D.hue[t.theme] != null ? D.hue[t.theme] : 0})` }} />
                                {t.theme} <b>{Math.round(t.share * 100)}%</b>
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="st-row-right"><span className="st-mi">{fmt(a.plays)}</span></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          );
        })()}

        {/* THE READING (2026-09-21) — the feed CLOSES on it (Fuad: "should go to the bottom of the
            page"; it first sat directly after Chapters). Everything above is the evidence — sound,
            years, words, places — and the portrait is the verdict, so it reads last. Deliberately
            its own section rather than rows grafted onto the auto-segmented TASTE_ERAS (those
            RE-CUT on every rebuild; a digest pinned to "era 2" would silently drift spans). The
            four eras are fixed editorial cuts, authored against the fable reads and tracked in
            reading.js; the year spans keep Chapters' 88px mono column so the rhyme still reads
            across the distance. Renders nothing until the lazy script lands. */}
        {reading && reading.portrait && reading.eras && reading.eras.length > 0 && (
          <section className="st-card st-hero st-reading">
            <div className="st-label">The Reading</div>
            <div className="st-big">{reading.portrait.title}</div>
            <div className="st-sub">
              Read across the fable reads — four era digests below, each speaking only for the artists read closely in its years.
            </div>
            <p>{reading.portrait.text}</p>
            <div style={{ display: "grid", gap: 2, marginTop: 16 }}>
              {reading.eras.map((e, i) => {
                const on = !!readingOpen[i];
                return (
                  <div key={i} style={{ minWidth: 0 }}>
                    <button type="button" aria-expanded={on}
                      onClick={() => setReadingOpen(o => ({ ...o, [i]: !o[i] }))}>
                      <span className="r-mono" style={{ fontSize: 11, color: "var(--ink-soft)", paddingTop: 4, whiteSpace: "nowrap" }}>{e.span}</span>
                      {/* no nowrap here — at 360px the title is the one thing that MUST wrap rather
                          than clip, and .st-title-sm's bottom margin is for a standalone heading */}
                      <span className="st-title-sm" style={{ marginBottom: 0, minWidth: 0 }}>{e.title}</span>
                      <i aria-hidden="true">▸</i>
                    </button>
                    {/* ALWAYS MOUNTED so the unravel can ease (Fuad 2026-09-21: "some sort of
                        transition when unraveling a chapter") — .st-rd-body is a 0fr→1fr grid
                        track, the same unfold gv-night uses, because height:auto cannot transition
                        and a mount/unmount has nothing to ease. aria-hidden keeps the closed text
                        out of the accessibility tree; nothing inside is focusable. */}
                    <div className="st-rd-body" data-open={on ? "1" : "0"} aria-hidden={!on}>
                      <div>
                        <p>{e.text}</p>
                        <div className="st-mi" style={{ marginTop: 11, marginBottom: 14 }}>read from {e.coverage}% of this era's plays</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

      </div>

      <style>{`
        /* The header tracks the FEED's width and centring, not the viewport's (Fuad 2026-08-20:
           the title sat hard left while the content column beneath it was centred, so the page
           read as two different layouts stacked). Every max-width below is mirrored from .st-feed
           at the same breakpoint — if one moves, move both. */
        .st-head { max-width: 820px; margin-left: auto; margin-right: auto; }
        @media (min-width: 1500px) { .st-head { max-width: 900px; } }
        /* ONE COLUMN, BLOCKS STACKED (Fuad 2026-09-14: "instead of having a long list of two
           columns, I'd like to stack one block on top of another to keep things clearer").
           This used to switch to a two-column magazine flow past 1150px (CSS multi-column, cards
           kept whole with break-inside, chapter rules spanning both). Multi-column reads in a
           snake — down the left, back up to the top of the right — so the chapter order the feed
           is built around was only legible if you already knew to read it that way. A single grid
           column keeps the sections in the order they are registered in, which is the point of
           the table of contents beside them.
           Width stays near the reading measure rather than filling the screen; the modest bump at
           1500px keeps a 4K screen from looking empty without stretching the rows inside the
           cards. .st-head mirrors these numbers — if one moves, move both. */
        .st-feed { max-width: 820px; margin: 0 auto; display: grid; grid-template-columns: minmax(0, 1fr); gap: calc(var(--gap) * .62); }
        @media (min-width: 1500px) { .st-feed { max-width: 900px; } }
        .st-card { background: var(--panel); border: 1px solid var(--rule); border-radius: 8px; padding: 17px 19px; }
        /* THE TOC LANDED SECTIONS UNDER THE HEADER (Fuad 2026-09-14: the breadcrumbs "do not seem to
           target correctly the modules when clicking"). scrollIntoView({block:"start"}) puts the
           section top at the VIEWPORT top, and .r-head is 64px of sticky chrome sitting over it — so
           every jump hid its own label behind the bar. Below 1420px the story rail is sticky at the
           top as well, adding its own row, so the offset is larger there. */
        .st-feed > section { scroll-margin-top: 78px; }
        /* THE YEAR SWAP. Remounted by its key, so the animation runs on arrival and needs no exit
           state — a year change is a replacement, not a transition between two things on screen at
           once. Short and small: this fires on every arrow press, so anything longer than ~260ms
           makes the arrows feel slow to answer. */
        .st-swap { animation: st-swap-in .26s cubic-bezier(.22,.61,.36,1) both; }
        @keyframes st-swap-in { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .st-swap { animation: none; } }
        @media (max-width: 1419px) { .st-feed > section { scroll-margin-top: 112px; } }
        .st-hero { padding: 22px 21px; }
        /* SHARED TYPE ROLES (Fuad 2026-09-14: "the text in a lot of the Stories modules varies a bit
           too much font-style-wise ... make sure we have a rather standardized style"). The feed
           carried 31 inline font declarations across nine sizes; these are the three that actually
           REPEAT, lifted out so the same role cannot drift apart in two modules. The rest are
           one-offs and stay inline for now — converting a size that appears once buys nothing and
           risks changing a layout nobody asked me to touch.
             .st-mi  micro mono label   .st-nr  right-aligned count   .st-tx  body value */
        .st-mi { font-family: var(--mono); font-size: 9.5px; color: var(--ink-faint); }
        .st-mi-soft { color: var(--ink-soft); }
        .st-nr { font-size: 10px; color: var(--ink-faint); text-align: right; }
        .st-tx { font-size: 12.5px; color: var(--ink); }
        /* HOVER TRANSITIONS, EVERYWHERE A ROW REACTS (Fuad 2026-09-14, reported across several
           modules: "The songs you own twice hyperlinks don't have hover transitions, same in The
           ones that ended"). An audit of the feed's hover rules found eight classes that CHANGE on
           hover — background, border or colour — while their base declared no transition, so each
           one snapped. .st-row, .st-obs and .st-ug-cut already had one, which is why some modules
           felt right and others did not. Declared once here rather than edited into eight separate
           grid/flex rules. */
        .st-yir-jump, .st-life-row, .st-gate, .st-incub-row,
        .st-atlas-row, .st-mile, .st-peak {
          transition: background .16s ease, border-color .16s ease, color .16s ease;
        }
        @media (prefers-reduced-motion: reduce) {
          .st-yir-jump, .st-life-row, .st-gate, .st-incub-row,
          .st-atlas-row, .st-mile, .st-peak { transition: none; }
        }
        .st-label { font-family: var(--mono); font-size: 9px; letter-spacing: .13em; text-transform: uppercase;
          color: var(--accent); margin-bottom: 8px; }
        .st-big { font-family: var(--serif); font-size: clamp(19px, 2.2vw, 26px); line-height: 1.16; letter-spacing: -.015em; }
        .st-big em { font-style: italic; }
        .st-big[data-link="true"] { cursor: pointer; }
        /* HOVERS FOR THE LINKS THAT HAD NONE (Fuad 2026-09-14: "a lot of the hyperlinks do not have
           a hover interaction"). Two real gaps, not many: .st-big carried cursor:pointer and nothing
           else — the largest link on every card, silent — and .st-inline-link had no rule at all
           despite being the bold in-sentence link used throughout the prose. Everything else already
           had one. The headline underlines its own <em> rather than recolouring, because that word
           carries an inline artist hue that a colour change would fight. */
        /* FADE, DO NOT WIPE (Fuad 2026-09-14: "the expandable underlines from left to right are too
           distracting, coloring and fading underline on hover would be better and fit how the rest
           of the site behaves"). The wipe was built because text-decoration cannot be animated — but
           text-decoration-COLOR can, so the underline can simply fade up from transparent while the
           text warms to the accent. No travelling edge, and it matches the colour-shift hover the
           rest of the site uses. :first-of-type keeps it on the NAME in headlines that also
           emphasise a play count. */
        .st-big[data-link="true"] em:first-of-type {
          text-decoration: underline; text-decoration-color: transparent;
          text-decoration-thickness: 1px; text-underline-offset: 4px;
          transition: text-decoration-color .2s ease, color .2s ease;
        }
        .st-big[data-link="true"]:hover em:first-of-type { text-decoration-color: currentColor; }
        @media (prefers-reduced-motion: reduce) { .st-big[data-link="true"] em:first-of-type { transition: none; } }
        /* the same treatment for the inline <a> links inside prose, which carried their underline as
           an inline borderBottom and so could never be styled or transitioned from here. */
        .st-alink {
          cursor: pointer; text-decoration: underline; text-decoration-style: dotted;
          text-decoration-color: var(--ink-faint); text-underline-offset: 3px;
          transition: color .18s ease, text-decoration-color .18s ease;
        }
        .st-alink:hover { color: var(--accent); text-decoration-color: var(--accent); }
        @media (prefers-reduced-motion: reduce) { .st-alink { transition: none; } }
        /* Fuad 2026-09-14: "'Creedence Clearwater Revival' and stuff under 'The Ones That Ended'
           do not have translated hover effects yet". The rule here was correct and had been for a
           while — but two of the four call sites (the graves line, where Creedence lives, and
           Signature obsessions) also set color inline, and an inline style beats every selector
           short of !important. The hover fired and repainted nothing. The base colour moves into
           the class where :hover can actually win it, and these links pick up the same fading
           underline as .st-alink so a link in prose reads as one before you touch it. */
        .st-inline-link { color: var(--ink); }
        .st-inline-link[data-link="true"] {
          cursor: pointer; text-decoration: underline; text-decoration-color: transparent;
          text-decoration-thickness: 1px; text-underline-offset: 3px;
          transition: color .18s ease, text-decoration-color .18s ease;
        }
        .st-inline-link[data-link="true"]:hover { color: var(--accent); text-decoration-color: var(--accent); }
        @media (prefers-reduced-motion: reduce) { .st-inline-link[data-link="true"] { transition: none; } }
        /* a catch-all so a NEW clickable is never silent: lowest specificity and declared first, so
           every rule above and below still wins where it is more specific. */
        .st-feed [data-link="true"] { cursor: pointer; }
        /* NO 560px CAP (Fuad 2026-09-14: the text "does not flow all the way to the container which
           is distracting"). A reading measure is right for a column of prose, but these are one- and
           two-line captions sitting under a headline in a 780px card — the cap left a ragged void to
           the right of every one of them, which reads as breakage rather than as rhythm. */
        .st-sub { color: var(--ink-soft); font-size: 13.5px; line-height: 1.5; margin-top: 8px; }
        .st-title-sm { font-family: var(--serif); font-style: italic; font-size: 16.5px; margin-bottom: 11px; }
        .st-list { display: grid; gap: 4px; }
        .st-row { display: flex; gap: 12px; align-items: center; padding: 6px 9px; margin: 0 -9px; border-radius: 6px;
          transition: background .15s; }
        .st-row[data-link="true"] { cursor: pointer; }
        .st-row[data-link="true"]:hover { background: var(--bg-3); }
        .st-row-name { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .st-row-sub { font-size: 12px; color: var(--ink-faint); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .st-row-right { flex: none; }
        .st-num { font-family: var(--serif); font-size: 18px; font-variant-numeric: tabular-nums; }
        .st-num small { font-family: var(--mono); font-size: 9px; letter-spacing: .1em; text-transform: uppercase;
          color: var(--ink-faint); margin-left: 5px; }
        .st-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(232px, 1fr)); gap: 9px; }
        /* ONE ROW, NOT A COLUMN WITH A FLOATED CORNER (Fuad 2026-09-14: it "should have artist name
           and plays as well as percentage as part of a rectangular block, rather than this that has
           tons of whitespace, same for albums weeks"). The 56px cover sat as a block with the
           percentage absolutely positioned into the top-right, so the card was as tall as the cover
           plus two stacked lines and carried a dead rectangle beside the artwork. Cover, text and
           percentage now share one baseline-aligned row and the bar spans underneath — the block is
           filled edge to edge and about a third shorter. */
        .st-obs { border: 1px solid var(--rule); border-radius: 6px; padding: 10px 11px; transition: border-color .15s; }
        .st-obs[data-link="true"] { cursor: pointer; }
        .st-obs[data-link="true"]:hover { border-color: var(--rule-2); }
        .st-obs-top { display: flex; align-items: center; gap: 10px; }
        .st-obs-txt { min-width: 0; flex: 1 1 auto; }
        .st-obs-share { flex: none; font-family: var(--serif); font-size: 17px; line-height: 1; }
        .st-obs .st-row-name { margin-top: 0; }
        .st-row-name-alb { font-style: italic; }
        .st-obs-bar { margin-top: 9px; }
        /* BAND CHIPS (Fuad: "do not have a hover effect. Let's keep it subtle"). They were inline
           styles with no class, which is why every earlier hover pass missed them. Subtle means the
           rule warms and the ground lifts a shade — no colour flip, no movement. A chip whose artist
           has no page keeps the flat, uninteractive look it already had. */
        .st-person { font-family: var(--serif); font-style: italic; font-size: 14px; color: var(--ink); min-width: 120px; }
        .st-bandchip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 9px; border-radius: 999px;
          border: 1px solid var(--rule); font-size: 11.5px; color: var(--ink-soft); cursor: default;
          transition: border-color .16s ease, background .16s ease, color .16s ease; }
        .st-bandchip[data-link="true"] { color: var(--ink); cursor: pointer; }
        .st-bandchip[data-link="true"]:hover { border-color: var(--accent-dim); background: var(--bg-3); }
        .st-bandchip-dot { width: 8px; height: 8px; border-radius: 2px; flex: none; }
        @media (prefers-reduced-motion: reduce) { .st-bandchip { transition: none; } }
        .st-obs-bar { height: 3px; background: var(--bg-3); border-radius: 2px; margin-top: 7px; overflow: hidden; }
        .st-obs-bar i { display: block; height: 100%; border-radius: 2px; }
        .st-ug-cuts { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 7px; margin-top: 12px; }
        .st-ug-cut { display: flex; gap: 11px; align-items: center; padding: 7px 9px; border: 1px solid var(--rule);
          border-radius: 6px; transition: border-color .15s; }
        .st-ug-cut[data-link="true"] { cursor: pointer; }
        .st-ug-cut[data-link="true"]:hover { border-color: var(--accent-dim); }
        /* "and stuff under The Ones That Ended" — the cut cards shifted a 1px border and nothing
           else, which is nearly invisible against a dark ground. The name warms on hover too. */
        .st-ug-cut .st-row-name { transition: color .15s ease; }
        .st-ug-cut[data-link="true"]:hover .st-row-name { color: var(--accent); }
        .st-yir-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
        .st-yir-nav { display: flex; align-items: center; gap: 6px; }
        .st-yir-nav button { width: 28px; height: 28px; border: 1px solid var(--line); background: transparent; color: var(--ink-soft);
          border-radius: 5px; font-size: 16px; line-height: 1; cursor: pointer; transition: .15s; }
        .st-yir-nav button:hover:not(:disabled) { border-color: var(--accent-dim); color: var(--ink); }
        .st-yir-nav button:disabled { opacity: .3; cursor: default; }
        .st-yir-y { font-family: var(--serif); font-style: italic; font-size: 18px; min-width: 64px; text-align: center; }
        .st-yir-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-top: 14px;
          padding: 11px 0; border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule); }
        .st-yir-n { font-family: var(--serif); font-size: clamp(17px, 1.7vw, 21px); line-height: 1; }
        .st-yir-l { font-family: var(--mono); font-size: 9.5px; color: var(--ink-faint); letter-spacing: .12em;
          text-transform: uppercase; margin-top: 6px; }
        .st-yir-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 13px; }
        .st-yir-h { font-family: var(--mono); font-size: 10px; color: var(--ink-faint); letter-spacing: .12em;
          text-transform: uppercase; margin-bottom: 10px; }
        /* NO RESTING BOX (Fuad 2026-09-21: "a highlight behind Biggest jump... feels distracting").
           It sat on --bg-3 permanently, and its hover swapped to var(--bg-4, --bg-3) — --bg-4 is
           not defined anywhere, so the hover resolved to the SAME colour: a highlight that never
           moved and a link that never answered. Transparent at rest, the wash arrives ON hover —
           the same grammar as .st-row beside it. */
        .st-yir-jump { margin-top: 11px; padding: 9px 12px; background: transparent; border-radius: 5px; font-size: 13.5px; cursor: default; }
        .st-yir-jump[data-link="true"] { cursor: pointer; }
        .st-yir-jump[data-link="true"]:hover { background: var(--bg-3); }
        .st-geo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 7px; margin-top: 14px; }
        .st-geo-c { display: flex; gap: 11px; align-items: center; padding: 7px 10px; border: 1px solid var(--rule); border-radius: 6px; }
        .st-geo-flag { font-size: 18px; line-height: 1; flex: none; width: 30px; text-align: center; }
        .st-geo-pct { font-family: var(--serif); font-style: italic; font-size: 15.5px; color: var(--accent); margin-left: auto; flex: none; }
        .st-geo-cities { display: flex; gap: 6px; flex-wrap: wrap; }
        .st-flame-pct { font-family: var(--serif); font-style: italic; font-size: 15.5px; flex: none; }
        .st-turn { display: grid; gap: 8px; margin-top: 14px; }
        .st-turn-row { display: grid; grid-template-columns: 160px 1fr 60px; gap: 18px; align-items: center; }
        .st-turn-label { font-family: var(--mono); font-size: 10.5px; color: var(--ink-faint); letter-spacing: .1em; text-transform: uppercase; }
        .st-turn-n { font-family: var(--serif); font-style: italic; font-size: 15px; text-align: right; }
        .st-turn-axis { display: flex; justify-content: space-between; padding-left: 178px;
          font-family: var(--mono); font-size: 10px; color: var(--ink-faint); letter-spacing: .1em; margin-top: 4px; }
        @media (max-width: 700px) {
          .st-turn-row { grid-template-columns: 1fr; gap: 2px; }
          .st-turn-n { text-align: left; }
          .st-turn-axis { padding-left: 0; }
        }
        .st-life { display: grid; gap: 2px; }
        .st-life-row { display: grid; grid-template-columns: 24px 36px 1fr 110px; gap: 12px; align-items: center;
          padding: 7px 8px; margin: 0 -8px; border-radius: 5px; }
        .st-life-row[data-link="true"] { cursor: pointer; }
        .st-life-row[data-link="true"]:hover { background: var(--bg-3); }
        .st-life-span { display: flex; align-items: center; gap: 6px; }
        .st-life-bar { flex: 1; height: 2px; border-radius: 1px; opacity: .65; }
        @media (max-width: 700px) {
          /* 4 cols on mobile: 4th col is auto so Flameouts %ages still fit. Lifetime's span moves to row 2. */
          .st-life-row { grid-template-columns: 20px 32px 1fr auto; gap: 9px; padding: 6px 6px; }
          .st-life-span { grid-column: 1 / -1; padding-left: 60px; }
          .st-flame-pct { font-size: 15px; }
          .st-row-name { font-size: 13.5px; }
          .st-row-sub { font-size: 11.5px; }
        }
        .st-gates { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 2px 18px; margin-top: 10px; }
        .st-gate { display: grid; grid-template-columns: 96px 1fr auto; gap: 12px; align-items: center; min-width: 0;
          padding: 10px 12px; margin: 0 -12px; border-radius: 5px; }
        .st-gate[data-link="true"] { cursor: pointer; }
        .st-gate[data-link="true"]:hover { background: var(--bg-3); }
        .st-gate-stamp { display: flex; align-items: center; gap: 8px; }
        .st-gate-flag { font-size: 20px; line-height: 1; }
        .st-gate-date { font-family: var(--mono); font-size: 10.5px; color: var(--ink-faint); letter-spacing: .08em; text-transform: uppercase; }
        .st-gate-country { font-family: var(--serif); font-style: italic; font-size: 16px; }
        .st-gate-n { font-family: var(--serif); font-size: 15px; flex: none; }
        @media (max-width: 700px) {
          .st-gate { grid-template-columns: auto 1fr auto; gap: 10px; }
          .st-gate-stamp { flex-direction: column; align-items: flex-start; gap: 2px; }
        }
        .st-incub { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 22px; }
        .st-incub-row { display: grid; grid-template-columns: 32px 1fr auto; gap: 10px; align-items: center;
          padding: 7px 8px; margin: 0 -8px; border-radius: 5px; }
        .st-incub-row[data-link="true"] { cursor: pointer; }
        .st-incub-row[data-link="true"]:hover { background: var(--bg-3); }
        .st-incub-main { min-width: 0; }
        .st-incub-bar { height: 3px; background: var(--bg-3); border-radius: 2px; margin: 4px 0 3px; overflow: hidden; }
        .st-incub-bar i { display: block; height: 100%; border-radius: 2px; transition: width .8s; }
        .st-incub-n { font-family: var(--serif); font-style: italic; font-size: 15px; color: var(--accent);
          white-space: nowrap; flex: none; }
        @media (max-width: 700px) { .st-incub { grid-template-columns: 1fr; gap: 18px; } }
        .st-arc { display: grid; gap: 14px; margin-top: 22px; }
        .st-arc-row { display: grid; grid-template-columns: 200px 1fr 110px; gap: 18px; align-items: center; }
        .st-arc-head { display: flex; gap: 9px; align-items: baseline; min-width: 0; }
        .st-arc-flag { font-size: 18px; line-height: 1; flex: none; }
        .st-arc-name { font-size: 13.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .st-arc-now { font-family: var(--serif); font-style: italic; font-size: 17px; margin-left: auto; }
        .st-arc-peak { font-family: var(--mono); font-size: 10.5px; color: var(--ink-faint); text-align: right; }
        .st-arc-axis { display: flex; justify-content: space-between; margin: 8px 0 0; padding-left: 218px;
          font-family: var(--mono); font-size: 10px; color: var(--ink-faint); letter-spacing: .1em; }
        @media (max-width: 760px) {
          .st-arc-row { grid-template-columns: 1fr; gap: 4px; }
          .st-arc-peak { text-align: left; }
          .st-arc-axis { padding-left: 0; }
        }
        .st-atlas { display: grid; gap: 4px; }
        .st-atlas-row { display: grid; grid-template-columns: minmax(140px, 1fr) 2fr auto; gap: 16px;
          align-items: baseline; padding: 9px 10px; margin: 0 -10px; border-radius: 5px; font-size: 13px; }
        .st-atlas-row:hover { background: var(--bg-3); }
        .st-atlas-style { font-family: var(--serif); font-style: italic; font-size: 17px; }
        .st-atlas-via { font-size: 12.5px; color: var(--ink-soft); }
        .st-atlas-n { font-family: var(--mono); font-size: 11px; color: var(--ink-faint); }
        .st-atlas-n small { font-size: 8.5px; letter-spacing: .1em; text-transform: uppercase; opacity: .7; }
        @media (max-width: 700px) {
          .st-atlas-row { grid-template-columns: 1fr auto; gap: 6px 12px; }
          .st-atlas-via { grid-column: 1 / -1; font-size: 12px; }
        }
        @media (max-width: 700px) {
          .st-yir-stats { grid-template-columns: repeat(2, 1fr); gap: 14px 18px; }
          .st-yir-grid { grid-template-columns: 1fr; gap: 18px; }
        }
        .st-miles { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 4px 16px; }
        .st-mile { display: flex; gap: 13px; align-items: center; padding: 6px 8px; margin: 0 -8px; border-radius: 6px; }
        .st-mile[data-link="true"] { cursor: pointer; }
        .st-mile[data-link="true"]:hover { background: var(--bg-3); }
        .st-mile-n { font-family: var(--serif); font-style: italic; font-size: 19px; width: 52px; flex: none;
          color: var(--accent); }
        .st-peaks { display: grid; gap: 2px; }
        .st-peak { display: grid; grid-template-columns: 48px 52px 1fr auto; gap: 12px; align-items: baseline;
          padding: 7px 10px; margin: 0 -10px; border-radius: 5px; font-size: 13px; }
        .st-peak[data-link="true"] { cursor: pointer; }
        .st-peak[data-link="true"]:hover { background: var(--bg-3); }
        .st-peak-y { font-family: var(--mono); font-size: 11px; color: var(--ink-faint); }
        .st-peak-n { font-family: var(--serif); font-size: 18px; }
        .st-peak-a { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .st-peak-d { font-family: var(--mono); font-size: 10px; color: var(--ink-faint); }
        @media (max-width: 700px) {
          .st-card { padding: 14px 13px; }
          .st-hero { padding: 24px 20px; }
          .st-grid { grid-template-columns: 1fr 1fr; }
          .st-peak { grid-template-columns: 42px 44px 1fr; }
          .st-peak-d { display: none; }
        }

        /* ── TOC + chapters (Stories overhaul v1) ── */
        .st-toc { position: sticky; top: 0; z-index: 30; display: flex; gap: 6px; overflow-x: auto;
          padding: 10px 2px; margin: -6px 0 16px; background: var(--bg);
          scrollbar-width: none; -webkit-overflow-scrolling: touch; }
        .st-toc::-webkit-scrollbar { display: none; }
        /* plain text crumbs — no pills/ellipsoids (Fuad 2026-07-05); active = accent + underbar */
        .st-toc button { flex: none; padding: 6px 4px 8px; border: none; border-radius: 0;
          background: transparent; color: var(--ink-faint); font-family: var(--mono); font-size: 9.5px;
          letter-spacing: .1em; text-transform: uppercase; cursor: pointer; white-space: nowrap;
          position: relative; transition: color .15s; }
        .st-toc button::after { content: ""; position: absolute; left: 4px; right: 4px; bottom: 3px;
          height: 2px; border-radius: 2px; background: transparent; transition: background .15s; }
        .st-toc button:hover { color: var(--ink); }
        .st-toc button[data-on="true"] { color: var(--accent); }
        .st-toc button[data-on="true"]::after { background: var(--accent-dim); }
        .st-fresh { display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: var(--accent);
          margin-right: 6px; vertical-align: 1px; }
        .st-chapter { display: flex; align-items: baseline; gap: 10px; margin: 14px 2px 0;
          font-family: var(--serif); font-style: italic; font-size: 18px; color: var(--ink); }
        .st-chapter span { font-family: var(--mono); font-style: normal; font-size: 9.5px;
          letter-spacing: .13em; color: var(--accent); }
        .st-chapter::after { content: ""; flex: 1; height: 1px; background: var(--rule); align-self: center; }

        /* ── The Reading (2026-09-21) ── the feed's only long-form prose, and the one type role it
           did not already have: .st-sub is a caption face (13.5/1.5) that goes soupy past ~150
           words, .st-tx is a table value. So ONE scoped class — a step up from .st-sub in size and
           leading, with a hard 64ch measure, because the card runs 780–900px on desktop and an
           uncapped paragraph there is a 100-character line. Everything else in the module rides
           roles that already exist (.st-big, .st-sub, .st-title-sm, .st-mi, .r-mono) plus inline
           grid, exactly as the Chapters card above does; the rules below are element selectors
           under that one class rather than five more names in the .st-* space. */
        .st-reading p { max-width: 64ch; margin: 13px 0 0; color: var(--ink); font-size: 14.5px; line-height: 1.66; }
        /* era rows: a real <button>, so keyboard, Enter/Space and aria-expanded come for free, then
           reset until it looks like the Chapters rows it rhymes with — same 88px mono column, and
           the negative margin lets the hover wash bleed out to the card's padding edge the way
           .st-row's already does. minmax(0,1fr) on the title track is the 360px fix: a grid item's
           min-width is auto, so without it a long era title pushes the row past the viewport. */
        .st-reading button { display: grid; grid-template-columns: 88px minmax(0, 1fr) auto; gap: 14px;
          align-items: start; width: calc(100% + 18px); margin: 0 -9px; padding: 9px; border: 0;
          border-radius: 6px; background: transparent; color: var(--ink); font: inherit; text-align: left;
          cursor: pointer; transition: background .16s ease; }
        .st-reading button:hover { background: var(--bg-3); }
        .st-reading button:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
        /* a caret, not a plus: ▸/▾ is already this file's expander glyph (the genre cascade uses it),
           and ONE rotating triangle can be eased where swapping two characters cannot. */
        .st-reading i { font-style: normal; font-size: 12px; line-height: 1; color: var(--ink-soft);
          padding-top: 5px; transition: transform .18s ease, color .18s ease; }
        .st-reading button[aria-expanded="true"] i { transform: rotate(90deg); color: var(--accent); }
        /* the open body indents to the title column so an era reads as one block rather than as a
           second row — but only where there is room for it; at phone widths the indent is the
           measure. The body is a 0fr-to-1fr grid track (2026-09-21, Fuad: a transition for the
           unravel): height:auto cannot transition, a fraction track can, and the inner div's
           overflow:hidden clips the text while the track grows. Vertical space rides the text's
           own margins, NOT padding on the clipped div — vertical padding there pokes out of a
           0fr track as a visible sliver. NO BACKTICKS in these comments, ever: this whole style
           block is one template literal and a nested backtick closes it early (see the views1
           "stat is not defined" crash, same day). */
        .st-rd-body { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .34s ease; }
        .st-rd-body[data-open="1"] { grid-template-rows: 1fr; }
        /* NO INDENT (Fuad 2026-09-21: "keep the same tabulation for all text and let it go from
           left to right instead of mid-way") — the 102px title-column indent made a digest start
           mid-card while the portrait above ran from the left edge; all prose now shares one left
           margin and only the row HEADERS keep the two-column rhyme. */
        .st-rd-body > div { overflow: hidden; min-height: 0; }
        @media (prefers-reduced-motion: reduce) {
          .st-reading button, .st-reading i, .st-rd-body { transition: none; }
        }

        /* Stories TOC as a vertical breadcrumb rail pinned to the left edge (wide screens).
           Dots-only by default so it never sits over content; labels reveal on hover only.
           Breakpoint 1420px (was 1240): Windows-scaled laptops (e.g. P16 at 200% ≈ 1280 CSS px)
           get the horizontal chip bar instead — the rail's hover labels were illegible there. */
        @media (min-width: 1420px) {
          /* at REST the rail sits centered as it always did; on HOVER it slides to the
             scroll-weighted anchor so the expansion opens AWAY from where you are (at the
             page bottom it grows upward; at the top, downward) — Fuad 2026-08-13, second
             pass: the always-on slide read as drift, the shift belongs to the hover. */
          .st-toc { position: fixed; left: 16px; top: 50%; transform: translateY(-50%);
            transition: top .28s ease, transform .28s ease;
            flex-direction: column; gap: 0; overflow: visible; margin: 0; padding: 0;
            background: none; backdrop-filter: none; -webkit-backdrop-filter: none;
            max-height: none; z-index: 40; width: auto; }
          .st-toc:hover { top: calc(14px + var(--stp, .5) * (100vh - 28px));
            transform: translateY(calc(var(--stp, .5) * -100%)); }
          .st-toc button { position: relative; flex: none; display: flex; align-items: center; gap: 11px;
            min-height: 24px; padding: 6px 0; border: none; border-radius: 0; background: none;
            text-align: left; color: var(--ink-faint); white-space: nowrap; }
          .st-toc button::before { content: ""; position: absolute; left: 3.25px; top: -50%; height: 100%;
            width: 1.5px; background: var(--rule); z-index: 0; }
          .st-toc button::after { display: none; }  /* the horizontal-bar underline doesn't apply to the rail */
          .st-toc button:first-child::before { display: none; }
          .st-toc button[data-reached="true"]::before { background: var(--accent-dim); }
          .st-node { position: relative; z-index: 1; width: 8px; height: 8px; flex: none; border-radius: 50%;
            border: 1.5px solid var(--rule-2); background: #0b0a0f;
            transition: transform .2s, background .2s, border-color .2s, box-shadow .2s; }
          .st-toc button[data-reached="true"] .st-node { border-color: var(--accent-dim); }
          .st-toc button[data-on="true"] .st-node { background: var(--accent); border-color: var(--accent);
            transform: scale(1.25); box-shadow: 0 0 0 4px var(--accent-bg); }
          /* label chip: hidden until you hover the rail, then floats over content readably.
             SOLID surface + real border (no rgba/backdrop tricks) so Dark Reader doesn't
             render it as a boxy table, and text stays legible at any zoom. */
          .st-toc-lbl { max-width: 0; overflow: hidden; opacity: 0; border-radius: 5px;
            transition: max-width .3s ease, opacity .2s ease, padding .3s ease; }
          .st-toc:hover .st-toc-lbl { max-width: 260px; opacity: 1; padding: 4px 10px;
            background: var(--panel); border: 1px solid var(--rule-2); font-size: 10px; }
          .st-toc button[data-on="true"] { color: var(--accent); }
          .st-toc button[data-on="true"] .st-toc-lbl { color: var(--accent); }
          .st-toc button:hover { color: var(--ink); }
        }

        /* ── mobile pass ── */
        /* the feed is capped + centred, but several rows are grids whose 1fr/2fr tracks carry an
           implicit auto min — a long name/tag can then push the track (and the card) past a ~344px
           screen. Pin every story grid + its cells to a 0 min so content ellipsises instead of
           overflowing, and hard-cap the feed to the viewport (Fuad 2026-07-16). The feed
           cap is scoped to mobile only now — desktop widths use the tiered max-widths above
           (Fuad 2026-07-17). */
        .st-feed > section { max-width: 100%; min-width: 0; overflow-wrap: anywhere; }
        @media (max-width: 700px) { .st-feed { max-width: 100%; } }
        .st-list, .st-life, .st-atlas, .st-peaks, .st-gates, .st-turn, .st-arc,
        .st-incub, .st-grid, .st-ug-cuts, .st-geo-grid { min-width: 0; }
        .st-life-row, .st-atlas-row, .st-peak, .st-gate, .st-turn-row, .st-arc-row,
        .st-incub-row, .st-life-row > *, .st-atlas-row > *, .st-peak > *, .st-gate > * { min-width: 0; }
        /* measured at 360px (probe 2026-09-17): these grid items grew to their nowrap content
           (.st-ug-cut 473px, .st-row 435px, .st-obs 398px) and clipped at the viewport edge.
           A grid item's min-width is AUTO unless pinned — the inner ellipsis rules can only
           work once the item itself is allowed to shrink. */
        .st-row, .st-ug-cut, .st-obs, .st-obs-top, .st-obs-txt, .st-mile { min-width: 0; }
        @media (max-width: 700px) {
          .st-yir-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .st-ug-cuts { grid-template-columns: 1fr 1fr; gap: 6px; }
          .st-ug-cut { padding: 8px; }
          .st-big { font-size: 19px; line-height: 1.45; }
          .st-chapter { font-size: 20px; margin-top: 18px; }
          .st-row-right { font-size: 12px; }
        }
        @media (max-width: 420px) {
          .st-ug-cuts { grid-template-columns: 1fr; }
          .st-grid { grid-template-columns: 1fr; }
        }

        /* ── slope graph ── */
        .st-sg-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
        .st-sg-wrap { margin-top: 18px; overflow-x: auto; -webkit-overflow-scrolling: touch; }
        @media (max-width: 700px) {
          /* on narrow screens allow horizontal scroll so nothing overflows */
          .st-sg-wrap svg { min-width: 320px; }
        }

        /* ── THREE LAB MODULES, RESTYLED (2026-09-21) ────────────────────────────────────────
           The comfort zone / Lyrical diet / Who brought you here arrived from rotation-lab.jsx,
           where every colour and face was a LAB_* constant on a private palette. Nothing of that
           survives below: the strips ramp on the accent via --acc-h so they follow the tweak
           panel, prose is the feed's serif, micro-labels are .st-mi's mono, and the rows reuse
           .st-row / .st-bandchip / .st-yir-h rather than minting parallel names.
           NO BACKTICKS ANYWHERE IN HERE, comments included — this whole style block is one
           template literal, a nested backtick closes it early, and the residue parses as live JS
           that only fails at runtime (the views1 "stat is not defined" crash, 2026-09-21). */

        /* the feed's only two text inputs — the comfort-zone scorer and the genealogy tracer.
           Quiet until focused; mono, because what you type is matched against data, not read. */
        .st-in { background: var(--bg-3); border: 1px solid var(--rule); color: var(--ink);
          border-radius: 6px; padding: 8px 11px; font-family: var(--mono); font-size: 11px;
          width: min(340px, 100%); outline: none; transition: border-color .16s ease; }
        .st-in::placeholder { color: var(--ink-faint); }
        .st-in:focus { border-color: var(--accent-dim); }
        @media (prefers-reduced-motion: reduce) { .st-in { transition: none; } }

        /* ── the comfort zone ── label · strip · range, the prototype's anatomy kept whole. The
           strip is a stack of absolutely positioned layers inside one clipped box: density ramp,
           middle-50% bracket, median tick, and the picked artist's dot on top. */
        .st-cz { display: grid; gap: 9px; margin-top: 18px; }
        .st-cz-row { display: grid; grid-template-columns: 96px minmax(0, 1fr) 56px; gap: 12px; align-items: center; }
        .st-cz-lbl { font-family: var(--mono); font-size: 10px; letter-spacing: .06em; color: var(--ink-soft); text-align: right; }
        .st-cz-strip { position: relative; height: 22px; background: var(--bg-3); border-radius: 4px; overflow: hidden; }
        .st-cz-dens { position: absolute; inset: 0; }
        .st-cz-band { position: absolute; top: 0; bottom: 0; border: 1px solid var(--ink); border-radius: 3px; opacity: .5; }
        .st-cz-med { position: absolute; top: 2px; bottom: 2px; width: 2px; background: var(--ink); opacity: .85; }
        /* in-band reads as a filled accent dot, out-of-band as a dark disc with a bright ring —
           the site has no semantic pass/fail colour, and inventing a green here would be the only
           green on the page. */
        .st-cz-dot { position: absolute; top: 5px; width: 11px; height: 11px; border-radius: 50%;
          background: var(--accent); border: 1.5px solid var(--bg); }
        .st-cz-dot[data-in="false"] { background: var(--bg-2); border-color: var(--ink); }
        .st-cz-n { font-family: var(--mono); font-size: 9.5px; color: var(--ink-faint); font-variant-numeric: tabular-nums; }
        .st-cz-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 20px; }
        /* .st-row-sub is nowrap-with-ellipsis by design, so the outlier's four missed axes get
           their own wrapping line under the row instead of being clipped to the first one. */
        .st-cz-miss { margin-top: 5px; line-height: 1.75; }
        @media (max-width: 700px) {
          .st-cz-row { grid-template-columns: 72px minmax(0, 1fr) 46px; gap: 8px; }
          .st-cz-lbl { font-size: 9px; }
          .st-cz-n { font-size: 9px; }
          .st-cz-pair { grid-template-columns: 1fr; gap: 16px; }
        }

        /* ── lyrical diet ── seventeen stacked year bars that must survive a 360px screen.
           Measured, not guessed: at 360 the gutter is 2 x 16px and the card 2 x 13px, so the row
           has 302px; seventeen bars at a 3px gap are 14.9px each and the two-digit year beneath
           (8px mono, about 9.6px wide) clears it. Gaps tighten to 2px under 420px. flex:1 1 0 with
           an explicit min-width:0 — a flex item's automatic minimum is its content, which is what
           pushed earlier story rows past the viewport edge. */
        .st-diet { display: flex; gap: 3px; margin-top: 18px; }
        .st-diet-col { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; justify-content: flex-end; }
        /* OUTLINED, NOT FILLED (Fuad 2026-09-21: "the bars to not contain fill color, only
           strokes, a la style on overview"). Every segment is a 1px stroke in its theme's hue over
           a ~10% wash of the same colour — the register the Overview strips keep — and the stack
           still reads as a stack because those strokes double up at every boundary. The ACTIVE
           theme (pinned by a chip, or previewed by hovering any of its bands) fills to 18% and
           brightens its stroke; every other theme drops to a whisper. All three skins are inline,
           because the hue is the theme's and comes from ST_DIET_HUES at the top of this file.
           box-sizing:border-box so the stroke rides INSIDE the height the share bought and the
           stack still sums to H. min-height:2px because a border-box shorter than its own two
           borders gets snapped up to them anyway — the JS clamps to the same 2, so the layout and
           the arithmetic agree instead of drifting a pixel per thin theme.
           flex:none on both — a column flex item shrinks by default, and these carry explicit
           pixel heights that must not be negotiated away if a stack ever rounds past the box. */
        .st-diet-seg { flex: none; box-sizing: border-box; min-height: 2px; border: 1px solid transparent;
          border-radius: 1.5px; background: transparent; transition: background .2s ease, border-color .2s ease; }
        .st-diet-yr { flex: none; font-family: var(--mono); font-size: 8px; color: var(--ink-faint); text-align: center; margin-top: 5px; }
        .st-diet-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 15px; }
        /* chip grammar borrowed from .se-modes in the search overlay — outline at rest, filled
           when on. The hue is inline (the theme's own, from ST_DIET_HUES), the geometry is here;
           the chips stay SHARE-RANKED while the bars run in hue order, because this row is a
           legend and a menu, and a reader looks up the big themes here, not the red ones. */
        .st-diet-chip { font-family: var(--mono); font-size: 9.5px; letter-spacing: .04em; padding: 5px 11px;
          border-radius: 999px; border: 1px solid var(--rule); background: transparent; color: var(--ink-soft);
          cursor: pointer; transition: color .14s ease, border-color .14s ease, background .14s ease; }
        .st-diet-chip:hover { color: var(--ink); }
        /* data-hot = the hover preview (2026-09-21), set from EITHER a chip or a band in the
           chart, so hovering a stripe in the bars also names itself down here. Only a ring and a
           brighter word: the filled state below stays the exclusive mark of a PINNED theme. */
        .st-diet-chip[data-hot="true"] { color: var(--ink); }
        .st-diet-chip[data-on="true"] { color: var(--bg); font-weight: 600; }
        .st-diet-more { border-style: dashed; border-color: var(--rule-2); color: var(--ink-faint); }
        .st-diet-pick { margin-top: 15px; border-top: 1px solid var(--rule); padding-top: 13px; }
        @media (prefers-reduced-motion: reduce) { .st-diet-seg, .st-diet-chip { transition: none; } }
        @media (max-width: 420px) { .st-diet { gap: 2px; } }

        /* ── who feeds which theme ── the artist profiles, merged in from chapter III's "Lyric
           themes" card on 2026-09-21. Fourteen rows, and .st-row already owns the cover, the
           name, the hover wash and the pointer, so the only new geometry is the pair of theme
           lines under the name and the two-column grid they sit in.
           minmax(min(320px, 100%), 1fr) is measured against the card's ~750px interior: two
           columns, and one the moment the card is narrower than about 674px — no media query
           needed, auto-fill does it. The min() is not decoration: a bare minmax(320px, 1fr) track
           REFUSES to shrink under its floor, so at 360px the 313px card grew a 320px track, and
           the rows (which bleed 9px each side for their hover wash) crossed the viewport edge by
           six. Measured at w=360 before and after.
           The play count goes away under 560px rather than the theme name: measured at 360, the
           longest label ("addiction & self-destruction 14%") was the only thing being ellipsised,
           and the count is a reading aid for an order the list already carries top to bottom.
           The rows do NOT carry their own colour beyond a 6px dot in the theme's hue: fourteen
           rows fully tinted would out-shout the chart they are a legend for. */
        /* the column gutter is wide on purpose: each row ends in a right-aligned play count, and
           at a narrow gap that number sits against the next column's cover and reads as if it
           belonged to the artist on its right. */
        .st-thp { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(320px, 100%), 1fr)); gap: 0 34px; }
        .st-thp-th { display: grid; gap: 2px; margin-top: 4px; }
        .st-thp-one { font-family: var(--mono); font-size: 9px; letter-spacing: .03em; color: var(--ink-faint);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: color .16s ease; }
        .st-thp-one i { display: inline-block; width: 6px; height: 6px; border-radius: 50%;
          margin-right: 5px; vertical-align: middle; }
        .st-thp-one b { color: var(--ink-soft); font-weight: 600; margin-left: 3px; }
        /* lit while that theme is the one pinned or hovered in the chart above — the profile rows
           answer the stack rather than repeating it. */
        .st-thp-one[data-on="true"], .st-thp-one[data-on="true"] b { color: var(--ink); }
        .st-diet-who { margin-top: 22px; border-top: 1px solid var(--rule); padding-top: 14px; }
        @media (prefers-reduced-motion: reduce) { .st-thp-one { transition: none; } }
        @media (max-width: 560px) { .st-thp .st-row-right { display: none; } }

        /* ── who brought you here ── the chain wraps rather than scrolls: a seven-name line runs
           to four rows at 360px, which reads fine, where a horizontal scroller inside a vertical
           feed does not. Dates ride each name in mono, as in the prototype. */
        .st-gen-chain { font-family: var(--serif); font-size: 15px; line-height: 2.05; margin-top: 4px; color: var(--ink-soft); }
        .st-gen-node { color: var(--ink); }
        .st-gen-node[data-link="true"] { cursor: pointer; text-decoration: underline;
          text-decoration-color: transparent; text-decoration-thickness: 1px; text-underline-offset: 4px;
          transition: color .18s ease, text-decoration-color .18s ease; }
        .st-gen-node[data-link="true"]:hover { color: var(--accent); text-decoration-color: var(--accent); }
        .st-gen-node i { font-family: var(--mono); font-style: normal; font-size: 9px; color: var(--ink-faint); margin-left: 5px; }
        .st-gen-arrow { color: var(--ink-faint); margin: 0 7px; }
        .st-gen-kids { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .st-gen-kidn { font-family: var(--mono); font-style: normal; font-size: 9px; color: var(--ink-faint); margin-left: 6px; }
        @media (prefers-reduced-motion: reduce) { .st-gen-node[data-link="true"] { transition: none; } }
          .st-sg-wrap svg { min-width: 320px; }
        }
      `}</style>
    </div>
  );
}

// ════════════════════════ GIGS ════════════════════════
// Attended concerts (setlist.fm → ROTATION.GIGS), joined to the listening data.
// ── "On tour now": cross-filtered explorer (Fuad 2026-07-06) ────────────────────────────
// Three filters over the weekly Ticketmaster pull, all composing: a GENRE CASCADE (families
// as a proportional bar; picking one unfolds its subgenres beneath), an equirectangular
// event MAP (dots = cities, sized by event count; hovering an artist row traces their tour
// path), and a D/W/M CALENDAR strip. Each vis shows the distribution within the OTHER two
// filters; the artist list underneath honours all three.

// Genre filter as legible PILLS (was a cramped proportional bar). Each artist carries a resolved
// gkey: a real library family ("f"+i, expandable to subgenres) or — when we can't place them from
// our own tags — a Ticketmaster-classification pseudo-genre ("t:Metal"), so "unplaced" shrinks to
// only the truly untagged. Picking a real family unfolds its subgenres beneath.
function GenreCascade({ R, arts, gkey, sub, setGkey, setSub }) {
  const gens = React.useMemo(() => {
    const m = new Map();
    for (const a of arts) {
      if (!m.has(a.gkey)) m.set(a.gkey, { key: a.gkey, name: a.gname, hue: a.ghue, real: a.famI >= 0, n: 0 });
      m.get(a.gkey).n++;
    }
    return [...m.values()].sort((x, y) => (x.key === "?") - (y.key === "?") || y.n - x.n);
  }, [arts]);
  const subs = React.useMemo(() => {
    if (!gkey || gkey[0] !== "f") return [];
    const fi = +gkey.slice(1);
    const m = new Map();
    for (const a of arts) {
      if (a.famI !== fi || a.prim < 0) continue;
      const s = R.SUBS[a.prim];
      if (!m.has(a.prim)) m.set(a.prim, { i: a.prim, name: s ? s.name : "?", hue: s ? s.hue : null, n: 0 });
      m.get(a.prim).n++;
    }
    return [...m.values()].sort((x, y) => y.n - x.n);
  }, [arts, gkey]);
  const Pill = ({ name, hue, n, on, dim, pick, small }) => (
    <button className="gv-gpill" data-on={on} data-dim={dim} data-sm={small} onClick={pick} style={{ "--gh": hue != null ? hue : 265 }}>
      <span className="gv-gpill-dot" />{name}<span className="gv-gpill-n">{n}</span>
    </button>
  );
  // collapsible so the pill wall doesn't shove the results down — starts open on desktop, folded
  // on phones where it's the longest thing between the map and the list (Fuad 2026-07-18). An
  // active pick is kept visible by force-opening.
  const [open, setOpen] = React.useState(() => {
    try { return !window.matchMedia("(max-width: 760px)").matches; } catch (e) { return true; }
  });
  const shown = open || gkey != null;
  if (!gens.length) return null;
  return (
    <div className="gv-casc">
      <button className="gv-casc-cap" data-open={shown} onClick={() => setOpen(o => !o)} aria-expanded={shown}>
        <span className="gv-casc-caret">{shown ? "▾" : "▸"}</span>
        Genre — {gens.length} in this slice{shown && gkey && gkey[0] === "f" ? " · pick unfolds subgenres" : gkey ? " · 1 active" : ""}
      </button>
      {shown && <>
      <div className="gv-gpills">
        {gens.map(g => <Pill key={g.key} name={g.name} hue={g.hue} n={g.n} on={gkey === g.key} dim={gkey != null && gkey !== g.key}
          pick={() => { setSub(null); setGkey(gkey === g.key ? null : g.key); }} />)}
      </div>
      {/* UNFOLDS RATHER THAN APPEARS (Fuad 2026-09-14: picking a genre "shows subgenres to filter
          through which is nice but when it does so, there is no transition"). Same idiom as the
          festival nights: the wrapper stays mounted and animates grid-template-rows 0fr -> 1fr, so
          it opens to whatever height the pills actually need — the row wraps to two lines for a
          wide family and one for a narrow one, and neither has to be measured or guessed. */}
      <div className="gv-subwrap" data-open={subs.length > 1 || undefined} aria-hidden={subs.length <= 1}>
        <div className="gv-gpills gv-gpills-sub">
          {subs.map(s => <Pill key={s.i} small name={s.name} hue={s.hue} n={s.n} on={sub === s.i} dim={sub != null && sub !== s.i}
            pick={() => setSub(sub === s.i ? null : s.i)} />)}
        </div>
      </div>
      </>}
    </div>
  );
}

function TourCal({ events, gran, setGran, selKey, setSelKey, keyOf }) {
  const MONS = window.MON;
  const buckets = React.useMemo(() => {
    const counts = new Map();
    let min = null, max = null;
    for (const x of events) {
      const k = keyOf(x.e.d);
      counts.set(k, (counts.get(k) || 0) + 1);
      if (!min || x.e.d < min) min = x.e.d;
      if (!max || x.e.d > max) max = x.e.d;
    }
    if (!min) return [];
    const out = []; const t = new Date(min + "T00:00:00Z"), end = new Date(max + "T00:00:00Z");
    let guard = 0;
    while (t <= end && guard++ < 800) {   // step by day, dedupe by bucket key → gaps stay visible
      const k = keyOf(t.toISOString().slice(0, 10));
      if (!out.length || out[out.length - 1].k !== k) out.push({ k, n: counts.get(k) || 0 });
      t.setUTCDate(t.getUTCDate() + 1);
    }
    return out;
  }, [events, gran]);
  const mx = Math.max(1, ...buckets.map(b => b.n));
  const lblOf = (k, i, arr) => {
    const mo = +k.slice(5, 7);
    if (i > 0 && k.slice(0, 7) === arr[i - 1].k.slice(0, 7)) return null;
    return (mo === 1 || i === 0) ? `${MONS[mo - 1]} '${k.slice(2, 4)}` : MONS[mo - 1];
  };
  return (
    <div className="gv-tcal">
      <div className="gv-tcal-head">
        <span className="r-mono gv-tcal-hint">
          {selKey ? <>filtering <b>{selKey}</b> · <em onClick={() => setSelKey(null)}>clear ✕</em></>
            : `when — click a ${gran === "d" ? "day" : gran === "w" ? "week" : "month"} to filter`}
        </span>
        <div className="r-seg r-seg-sm">
          {["d", "w", "m"].map(k => <button key={k} data-on={gran === k} onClick={() => { setGran(k); setSelKey(null); }}>{k}</button>)}
        </div>
      </div>
      <div className="gv-tcal-strip">
        {buckets.map((b, i) => (
          <div key={b.k} className="gv-tcal-col" data-on={selKey === b.k}
            onClick={() => b.n && setSelKey(selKey === b.k ? null : b.k)}
            title={`${b.k} · ${b.n} event${b.n !== 1 ? "s" : ""}`}>
            <i style={{ height: Math.max(b.n ? 3 : 1, Math.round(b.n / mx * 40)) }} data-z={!b.n} />
            <span className="gv-tcal-lbl">{lblOf(b.k, i, buckets)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Shared map-navigation + fisheye engine, factored so TourMap owns exactly one coherent gesture
// model. All navigation is a <g transform="translate(x,y) scale(k)"> driven imperatively (the <g>
// attribute is written directly during a gesture — no 60 Hz setState re-rendering ~150 paths);
// state (tf) is committed only on release. The engine also owns: fit() — an eased ANIMATION of the
// transform to frame a set of dots' bounding box (the exact fit/clamp/ease math ported from the old
// GigsMap, adapted from viewBox to transform units); a cursor FISHEYE that grows the nearest dots by
// writing each circle's r attribute; and a hover readout. VB is the static viewBox this projection
// lives in ("0 70 1000 315"). MINK/MAXK bound the zoom.
const TMAP_VB = { x: 0, y: 70, w: 1000, h: 315 };
// MAXK 14 -> 60 (Fuad 2026-09-13). The projection puts 360 degrees of longitude across the 1000-unit
// viewBox, so k is directly a scale on that: 14 showed ~26 degrees, about 1,800km at European
// latitude, which is continental — two cities 100km apart sat 5% of the width from each other and a
// cluster could never be separated. 60 shows ~6 degrees, about 430km, which resolves a metro area.
// Safe at that depth because every drawn thing already counter-scales by rk: dot radii, route stroke
// widths and the selection ring are all divided by it, so nothing balloons as you go in.
const TMAP_MINK = 1, TMAP_MAXK = 60;
function useTourMapNav(svgRef, gRef, dotSel, ready) {
  const [tf, setTf] = React.useState({ k: 1, x: 0, y: 0 });   // committed g transform
  const tfRef = React.useRef(tf);
  React.useEffect(() => { tfRef.current = tf; }, [tf]);
  const pending = React.useRef(null);   // last transform mid-gesture, committed to state on release
  const drag = React.useRef(null);      // {x,y,tx,ty,tk} anchor at pointerdown for a 1-pointer pan
  const moved = React.useRef(false);    // true once a gesture panned/pinched — suppresses the dot click
  const ptrs = React.useRef(new Map()); // active pointerId → {x,y} client coords (enables pinch)
  const pinch = React.useRef(null);     // last two-finger distance while pinching
  const rafRef = React.useRef(0);       // rAF handle for the fit() animation
  const fishRef = React.useRef(0);      // rAF handle for the pointermove fisheye
  const fitTf = React.useRef({ k: 1, x: 0, y: 0 });   // the transform the last fit() aimed at
  const hovRef = React.useRef(null);    // imperative hover readout element
  const [drifted, setDrifted] = React.useState(false); // panned/zoomed away from the fit target?
  React.useEffect(() => () => { cancelAnimationFrame(rafRef.current); cancelAnimationFrame(fishRef.current); cancelAnimationFrame(easeRef.current); }, []);

  const clampK = (k) => Math.min(TMAP_MAXK, Math.max(TMAP_MINK, k));
  // write the transform to the <g> attribute (imperative) and flag drift vs the last fit target
  const writeTf = (t) => {
    if (gRef.current) gRef.current.setAttribute("transform", "translate(" + t.x + " " + t.y + ") scale(" + t.k + ")");
    const f = fitTf.current;
    const same = Math.abs(t.k - f.k) < 1e-3 && Math.abs(t.x - f.x) < 0.5 && Math.abs(t.y - f.y) < 0.5;
    setDrifted(d => d === !same ? d : !same);
  };
  // zoom around a view-space point (vx,vy) so that point stays put; k clamped to [MINK,MAXK]
  const zoomAround = (vx, vy, factor, from) => {
    const t = from || tfRef.current, k1 = clampK(t.k * factor);
    if (k1 === TMAP_MINK) return { k: 1, x: 0, y: 0 };
    const px = (vx - t.x) / t.k, py = (vy - t.y) / t.k;
    return { k: k1, x: vx - px * k1, y: vy - py * k1 };
  };

  // FIT — frame a set of dots (each {x,y,r}) by easing the transform. Ported from GigsMap.fit():
  // same bbox+radius accumulation, 0.18/40 padding, aspect preservation, min-size guard, and the
  // 420 ms easeOutCubic ramp — expressed as a transform (k,x,y) instead of a viewBox.
  const fit = React.useCallback((targetDots, allDots) => {
    const ds = (targetDots && targetDots.length) ? targetDots : allDots;
    if (!ds || !ds.length) return;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    // r may be absent (region-box corner points {x,y} passed by the initial Europe fit + the market
    // chips) — treat as 0, else d.x - undefined = NaN poisons the whole transform (Fuad 2026-07-15:
    // this was the "translate(NaN NaN)" that killed pan/zoom and the Sydney/Berlin buttons).
    for (const d of ds) { const r = d.r || 0; x0 = Math.min(x0, d.x - r); y0 = Math.min(y0, d.y - r); x1 = Math.max(x1, d.x + r); y1 = Math.max(y1, d.y + r); }
    let w = x1 - x0, h = y1 - y0;
    const padX = Math.max(w * 0.18, 40), padY = Math.max(h * 0.18, 40);
    x0 -= padX; y0 -= padY; w += padX * 2; h += padY * 2;
    const aspect = TMAP_VB.w / TMAP_VB.h;
    if (w / h < aspect) { const nw = h * aspect; x0 -= (nw - w) / 2; w = nw; }
    else { const nh = w / aspect; y0 -= (nh - h) / 2; h = nh; }
    w = Math.max(w, 120); h = Math.max(h, 120 / aspect);   // don't over-zoom a single city
    // the transform that maps that bbox onto the whole viewBox: k frames the box, translate centers it
    const k1 = clampK(TMAP_VB.w / w);
    const bcx = x0 + w / 2, bcy = y0 + h / 2;
    const target = k1 === TMAP_MINK ? { k: 1, x: 0, y: 0 }
      : { k: k1, x: (TMAP_VB.x + TMAP_VB.w / 2) - bcx * k1, y: (TMAP_VB.y + TMAP_VB.h / 2) - bcy * k1 };
    fitTf.current = target; setDrifted(false);
    cancelAnimationFrame(rafRef.current);
    const from = pending.current || tfRef.current, t0 = performance.now(), dur = 420;
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);   // easeOutCubic
      const t = { k: from.k + (target.k - from.k) * e, x: from.x + (target.x - from.x) * e, y: from.y + (target.y - from.y) * e };
      pending.current = t;
      if (gRef.current) gRef.current.setAttribute("transform", "translate(" + t.x + " " + t.y + ") scale(" + t.k + ")");
      if (p < 1) rafRef.current = requestAnimationFrame(step);
      else { pending.current = null; setTf(target); }
    };
    rafRef.current = requestAnimationFrame(step);
  }, []);
  const resetView = React.useCallback((allDots) => { cancelAnimationFrame(rafRef.current); fitTf.current = { k: 1, x: 0, y: 0 }; setDrifted(false); pending.current = null; setTf({ k: 1, x: 0, y: 0 }); if (gRef.current) gRef.current.setAttribute("transform", "translate(0 0) scale(1)"); }, []);

  // client (cx,cy) → viewBox coords for this svg's static viewBox
  const toVB = (cx, cy) => { const r = svgRef.current.getBoundingClientRect(); return [TMAP_VB.x + (cx - r.left) / r.width * TMAP_VB.w, TMAP_VB.y + (cy - r.top) / r.height * TMAP_VB.h]; };

  // FISHEYE — grow the dots nearest the cursor by writing each circle's r attribute (transforms on
  // SVG <g> proved unreliable across browsers). Tuned SUBTLE (Fuad 2026-07-12): small radius,
  // gentle growth. Each hit-<g> carries data-cx/cy + data-r0 (the UNSCALED base radius); the
  // rendered r = r0/k so dots stay constant on screen — setK recomputes from r0 each time, so
  // zoom-driven re-renders never leave a stale cache.
  // Fuad 2026-07-13: (a) the bubble actually under the cursor gets a clear HOVER boost, so you
  // can always tell which one you're on despite the proximity growth around it; (b) radii EASE
  // toward their targets (lerp per frame) instead of snapping — he'll assess how it feels.
  const R_PX = 55, FISH_MAXK = 1.35, HOVER_K = 1.8, EASE = 0.28;
  const easeRef = React.useRef(0);      // rAF handle for the easing loop
  const writeR = (g, k, tk) => {
    const c = g.querySelector("circle"); if (!c) return;
    const r0 = +g.dataset.r0 || +c.getAttribute("r");
    c.setAttribute("r", ((r0 / (tk || 1)) * k).toFixed(2));
  };
  const easeTick = () => {
    easeRef.current = 0;
    const svg = svgRef.current; if (!svg) return;
    const t = pending.current || tfRef.current;
    let live = false;
    for (const g of svg.querySelectorAll(dotSel)) {
      const kt = +g.dataset.kt || 1;
      let kc = +g.dataset.kc || 1;
      kc += (kt - kc) * EASE;
      if (Math.abs(kt - kc) > 0.004) live = true; else kc = kt;
      g.dataset.kc = kc;
      writeR(g, kc, t.k);
    }
    if (live) easeRef.current = requestAnimationFrame(easeTick);
  };
  const ensureEase = () => { if (!easeRef.current) easeRef.current = requestAnimationFrame(easeTick); };
  const resetAll = (svg) => { for (const g of svg.querySelectorAll(dotSel)) g.dataset.kt = 1; ensureEase(); };
  const runFisheye = (cx, cy) => {
    const svg = svgRef.current; if (!svg) return;
    if (fishRef.current) return;
    fishRef.current = requestAnimationFrame(() => {
      fishRef.current = 0;
      const rect = svg.getBoundingClientRect();
      if (cx < rect.left || cx > rect.right || cy < rect.top || cy > rect.bottom) { resetAll(svg); return; }
      const t = pending.current || tfRef.current;
      // px → viewBox units, then ÷k for model (pre-transform) units the dots' data-cx/cy live in
      const pxToVx = TMAP_VB.w / rect.width, pxToVy = TMAP_VB.h / rect.height;
      const vx = TMAP_VB.x + (cx - rect.left) * pxToVx, vy = TMAP_VB.y + (cy - rect.top) * pxToVy;
      const mvx = (vx - t.x) / t.k, mvy = (vy - t.y) / t.k;
      const rx = R_PX * pxToVx / t.k, ry = R_PX * pxToVy / t.k;   // fisheye radius stays ~constant on screen
      // pass 1: find the dot the cursor is actually ON (screen-space hit against rendered radius)
      // A dot explicitly sized to ZERO is filtered out of the current view and still mounted only so
      // it can animate back (see dotCities). It must not be a hover or fisheye target — without this
      // the `|| 4` fallback below would treat it as a radius-4 bubble and the fisheye would pop an
      // invisible city into view under the cursor. Tested for r0 PRESENT-and-zero, never for absent,
      // because maps that set no data-r0 at all rely on that fallback.
      const hidden = (g) => g.dataset.r0 !== undefined && +g.dataset.r0 === 0;
      let hoverG = null, hoverD = Infinity;
      for (const g of svg.querySelectorAll(dotSel)) {
        if (hidden(g)) continue;
        const bx = +g.dataset.cx, by = +g.dataset.cy;
        const sx = rect.left + ((bx * t.k + t.x) - TMAP_VB.x) / pxToVx;
        const sy = rect.top + ((by * t.k + t.y) - TMAP_VB.y) / pxToVy;
        const rScreen = ((+g.dataset.r0 || 4) / t.k) / pxToVx * t.k; // r0/t.k model units → screen px
        const d = Math.hypot(sx - cx, sy - cy);
        if (d <= Math.max(rScreen + 4, 11) && d < hoverD) { hoverD = d; hoverG = g; }
      }
      // pass 2: fisheye targets, hovered dot boosted above its neighbours
      for (const g of svg.querySelectorAll(dotSel)) {
        if (hidden(g)) { g.dataset.kt = 1; continue; }   // stays at r=0; never grows under the lens
        const bx = +g.dataset.cx, by = +g.dataset.cy;
        const dnorm = Math.hypot((bx - mvx) / rx, (by - mvy) / ry);   // 0 at cursor, 1 at edge
        let k = dnorm >= 1 ? 1 : 1 + (FISH_MAXK - 1) * (1 - dnorm) * (1 - dnorm);
        if (g === hoverG) k = HOVER_K;
        g.dataset.kt = k;
      }
      ensureEase();
      // (hover readout removed — Fuad: "I don't want the full cities printed")
    });
  };

  // wheel is attached natively (React's onWheel is passive so its preventDefault no-ops and the page
  // scrolls); pan/pinch listen on window so a genuine tap still reaches the dots' onClick.
  React.useEffect(() => {
    const svg = svgRef.current; if (!svg) return;
    const onWheel = (e) => {
      e.preventDefault(); cancelAnimationFrame(rafRef.current); pending.current = null;
      const [vx, vy] = toVB(e.clientX, e.clientY);
      setTf(writeAndReturn(zoomAround(vx, vy, e.deltaY < 0 ? 1.22 : 1 / 1.22)));
    };
    const onMove = (e) => {
      if (ptrs.current.has(e.pointerId)) ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const pts = [...ptrs.current.values()];
      if (pts.length >= 2) {                    // two-finger pinch-zoom (touch)
        if (e.cancelable) e.preventDefault();
        cancelAnimationFrame(rafRef.current);
        const [a, b] = pts, dist = Math.hypot(a.x - b.x, a.y - b.y);
        const [vx, vy] = toVB((a.x + b.x) / 2, (a.y + b.y) / 2);
        if (pinch.current) {
          const t = zoomAround(vx, vy, dist / pinch.current, pending.current || tfRef.current);
          pending.current = t; moved.current = true; writeTf(t);
        }
        pinch.current = dist; drag.current = null; return;
      }
      pinch.current = null;
      const d = drag.current;
      if (!d) { runFisheye(e.clientX, e.clientY); return; }   // no drag → fisheye owns the move
      const r = svg.getBoundingClientRect();
      const dx = (e.clientX - d.x) / r.width * TMAP_VB.w, dy = (e.clientY - d.y) / r.height * TMAP_VB.h;
      if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 5) { if (!moved.current) resetAll(svg); moved.current = true; }
      if (!moved.current) return;   // under the 5px threshold: still a potential dot CLICK
      cancelAnimationFrame(rafRef.current);
      const t = { k: d.tk, x: d.tx + dx, y: d.ty + dy };
      pending.current = t; writeTf(t);
    };
    const onUp = (e) => {
      if (e && e.pointerId != null) ptrs.current.delete(e.pointerId);
      if (ptrs.current.size < 2) pinch.current = null;
      if (ptrs.current.size === 0) { if (pending.current) { setTf(pending.current); pending.current = null; } drag.current = null; }
    };
    const writeAndReturn = (t) => { writeTf(t); return t; };
    svg.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => { svg.removeEventListener("wheel", onWheel); window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); window.removeEventListener("pointercancel", onUp); };
  }, [ready]);   // must re-run once the map actually renders — on first mount the svg isn't in the DOM
                 // isn't in the DOM, the effect early-returns, and the wheel/pan listeners never attach
                 // (the +/- buttons worked because they're React onClick handlers). Fuad 2026-07-15.
  const onDown = (e) => {
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved.current = false;
    const t = pending.current || tfRef.current;
    if (ptrs.current.size === 1) drag.current = { x: e.clientX, y: e.clientY, tx: t.x, ty: t.y, tk: t.k };
    else drag.current = null;   // a second finger landed → switch from pan to pinch
  };
  const onLeave = () => { const svg = svgRef.current; if (svg) resetAll(svg); };
  const zoom = (f) => { cancelAnimationFrame(rafRef.current); pending.current = null; const nt = zoomAround(TMAP_VB.x + TMAP_VB.w / 2, TMAP_VB.y + TMAP_VB.h / 2, f, tfRef.current); writeTf(nt); setTf(nt); };
  return { tf, moved, hovRef, drifted, fit, resetView, zoom, onDown, onLeave };
}

// Equirectangular event map — pan/zoom, dots colored by the dominant genre in each city,
// sized by event count. Hovering an artist row below traces their tour path as a numbered route.
// City CHIPS toggle a city's bubble out and refit the view to what remains; a cursor fisheye grows
// the nearest event bubbles; a hover readout names the bubble under the cursor. All of that lives in
// useTourMapNav; this component supplies the dots and keeps its own city-select highlight/routes.
// map-region boxes in map coords (x = (lon+180)/360*1000, y = (90-lat)/180*500)
const TMAP_REGIONS = {
  europe: { x0: 455, y0: 75, x1: 605, y1: 160 },
  sydney: { x0: 880, y0: 320, x1: 945, y1: 365 },
  berlin: { x0: 455, y0: 75, x1: 605, y1: 160 },
  warsaw: { x0: 455, y0: 75, x1: 605, y1: 160 },
  tokyo:  { x0: 855, y0: 130, x1: 920, y1: 175 },
};
function TourMap({ events, allEvents, city, setCity, hiPath, hiHue, routes, focus }) {
  const [world, setWorld] = React.useState(window.ROTATION_WORLD || null);
  const [off, setOff] = React.useState(() => new Set());   // "cc|city" keys toggled OFF via a chip
  const svgRef = React.useRef(null);
  const gRef = React.useRef(null);       // the transformed <g>
  React.useEffect(() => {
    if (window.ROTATION_WORLD) return;
    const on = () => setWorld(window.ROTATION_WORLD);
    const ex = document.getElementById("wm-lazy");
    if (ex) { ex.addEventListener("load", on); return () => ex.removeEventListener("load", on); }
    const s = document.createElement("script"); s.id = "wm-lazy"; s.src = "world-map.js"; s.onload = on;
    document.head.appendChild(s);
  }, []);
  const cities = React.useMemo(() => {
    const m = new Map();
    for (const x of events) {
      if (!x.e.ll) continue;
      const k = x.e.cc + "|" + x.e.city;
      if (!m.has(k)) m.set(k, { k, x: (x.e.ll[1] + 180) / 360 * 1000, y: (90 - x.e.ll[0]) / 180 * 500, n: 0, city: x.e.city, cc: x.e.cc, hues: new Map() });
      const c = m.get(k); c.n++;
      if (x.a.ghue != null) c.hues.set(x.a.ghue, (c.hues.get(x.a.ghue) || 0) + 1);
    }
    const arr = [...m.values()];
    for (const c of arr) { c.hue = c.hues.size ? [...c.hues.entries()].sort((a, b) => b[1] - a[1])[0][0] : null; c.r = 2 + Math.sqrt(c.n) * 1.15; }
    return arr.sort((a, b) => b.n - a.n);
  }, [events]);
  const nav = useTourMapNav(svgRef, gRef, ".gv-tmap-hit", !!world);
  const { tf } = nav;
  // start zoomed on EUROPE (Fuad 2026-07-14: Berlin as the default vantage), and fly to a
  // market region whenever a market chip above the map is clicked (`focus` prop).
  const didInit = React.useRef(false);
  React.useEffect(() => {
    if (didInit.current || !world || !cities.length) return;
    didInit.current = true;
    const b = TMAP_REGIONS.europe;
    nav.fit([{ x: b.x0, y: b.y0 }, { x: b.x1, y: b.y1 }], cities);
  }, [world, cities]);
  React.useEffect(() => {
    if (!focus || !world) return;
    const b = TMAP_REGIONS[focus.id];
    if (b) nav.fit([{ x: b.x0, y: b.y0 }, { x: b.x1, y: b.y1 }], cities);
  }, [focus]);
  // toggling a chip excludes that city AND animates the view to fit the remaining ones (reusing the
  // exact fit/clamp/ease code). Never allow ALL off — keep the last city on.
  const toggle = (k) => setOff(s => {
    const n = new Set(s);
    n.has(k) ? n.delete(k) : n.add(k);
    if (n.size >= cities.length) n.delete(k);
    nav.fit(cities.filter(c => !n.has(c.k)), cities);
    return n;
  });
  // when the underlying event set changes (genre/time filter), drop chips for cities that vanished
  React.useEffect(() => { setOff(s => { const keys = new Set(cities.map(c => c.k)); let ch = false; const n = new Set(); for (const k of s) if (keys.has(k)) n.add(k); else ch = true; return ch ? n : s; }); }, [cities]);
  const rk = tf.k, base = 2;
  // Memoize the three layers so a pan/zoom re-render only updates the <g> transform, not the
  // ~150 land paths + dots + routes as vnodes. Land never changes; dots/routes depend on zoom
  // (rk) and selection, NOT on pan (x/y) — so dragging rebuilds nothing. (Hooks stay above the
  // early return below to satisfy the rules of hooks.)
  const landEls = React.useMemo(() => world ? world.land.map((d, i) => <path key={i} d={d} fill="var(--bg-3)" />) : null, [world]);
  const routeEls = React.useMemo(() => routes ? routes.map(r => (
    <polyline key={r.id} points={r.pts.map(p => p.join(",")).join(" ")} fill="none"
      stroke={`oklch(0.66 0.15 ${r.hue})`} strokeWidth={1 / rk} strokeLinejoin="round" opacity={hiPath ? 0.2 : 0.6} />
  )) : null, [routes, rk, hiPath]);
  // Each dot is a hit-<g> carrying the data-attrs the fisheye reads (data-cx/cy/city/count); the
  // inner circle has a FIXED r (the <g> transform handles zoom) so the fisheye's data-r cache — set
  // once on first hover — never goes stale. A chip-toggled-off city dims to 0.14 and stops filtering.
  // STABLE KEY SET FOR THE DOTS (Fuad 2026-09-14: transitions "similar to what we have on overview's
  // map when clicking other genres"). rotation-worldmap already records why this is necessary: it
  // swapped bubble arrays on a mode change, "an unmounted circle cannot transition", and the fix was
  // to keep the same keys and only move r. Same thing here — `cities` is built from the GENRE-FILTERED
  // events, so clicking a genre unmounted one set of circles and mounted another and nothing could
  // animate. Geometry now comes from the whole pool so every key survives every filter; the count and
  // hue come from the live set, and a city with nothing under the current genre stays mounted and
  // animates down to r=0 instead of disappearing between frames.
  const dotCities = React.useMemo(() => {
    const live = new Map(cities.map(c => [c.k, c]));
    const src = (allEvents && allEvents.length) ? allEvents : events;
    const m = new Map();
    for (const x of src) {
      if (!x.e.ll) continue;
      const k = x.e.cc + "|" + x.e.city;
      if (m.has(k)) continue;
      const l = live.get(k);
      m.set(k, { k, x: (x.e.ll[1] + 180) / 360 * 1000, y: (90 - x.e.ll[0]) / 180 * 500,
        city: x.e.city, cc: x.e.cc, n: l ? l.n : 0, hue: l ? l.hue : null });
    }
    // draw the small ones last so a big bubble never sits on top of a small neighbour
    return [...m.values()].sort((a, b) => b.n - a.n);
  }, [cities, events, allEvents]);
  const dotEls = React.useMemo(() => dotCities.map(c => {
    const on = !off.has(c.k) && c.n > 0;
    const col = c.hue != null ? `oklch(0.63 0.17 ${c.hue})` : "var(--accent)";
    const r0 = c.n > 0 ? base + Math.sqrt(c.n) * 1.15 : 0;
    return (
      <g key={c.k} className="gv-tmap-hit" data-cx={c.x} data-cy={c.y} data-r0={r0.toFixed(2)}
        style={{ opacity: c.n === 0 ? 0 : on ? 1 : 0.14 }}>
        {/* Overview map convention (rotation-worldmap mp-bub): family hue at oklch(0.63 0.17), a
            stroke in the SAME colour rather than an ink ring, .34 fill lifting to .72 when hovered or
            selected, stroke thickening with it. Stroke widths ride CSS vars so they counter-scale with
            zoom the way the radius does, and hover stays in CSS so panning never re-renders the dots.
            (Fuad 2026-09-13: "match Overview’s map style".) */}
        <circle className="gv-tmap-dot" data-on={city === c.k} data-empty={c.n === 0}
          cx={c.x} cy={c.y} r={r0 / rk}
          fill={col} stroke={col}
          style={{ "--sw0": (0.7 / rk).toFixed(3), "--sw1": (1.6 / rk).toFixed(3) }}
          onClick={(e) => { if (!nav.moved.current && on) setCity(city === c.k ? null : c.k); e.stopPropagation(); }}>
          <title>{c.city} ({c.cc}) · {c.n} event{c.n !== 1 ? "s" : ""} — click to filter</title>
        </circle>
      </g>
    );
  }), [dotCities, city, off, rk]);
  const hiEls = React.useMemo(() => {
    if (!hiPath) return null;
    return (<React.Fragment>
      {hiPath.length > 1 && <polyline points={hiPath.map(p => p.join(",")).join(" ")} fill="none"
        stroke={`oklch(0.8 0.16 ${hiHue})`} strokeWidth={1.6 / rk} strokeDasharray={`${5 / rk} ${3 / rk}`} opacity="0.95" />}
      {hiPath.map((p, i) => (
        <g key={"hp" + i}>
          <circle cx={p[0]} cy={p[1]} r={3.6 / rk} fill={`oklch(0.8 0.16 ${hiHue})`} stroke="#0e0c13" strokeWidth={0.9 / rk} />
          {rk >= 2 && <text x={p[0]} y={p[1] + 1.2 / rk} textAnchor="middle" fontSize={4 / rk} fill="#0e0c13" style={{ pointerEvents: "none", fontWeight: 700 }}>{i + 1}</text>}
        </g>
      ))}
    </React.Fragment>);
  }, [hiPath, hiHue, rk]);
  if (!world) return <div className="gv-tmap-empty r-mono">the map loads…</div>;
  const anyDrift = off.size > 0 || nav.drifted || tf.k > 1;
  return (
    <div className="gv-tmap-wrap">
      <div className="gv-tmap-svgwrap">
        <svg ref={svgRef} className="gv-tmap" viewBox="0 70 1000 315" role="img" aria-label="upcoming events map — scroll to zoom, drag to pan, click a city to filter"
          onPointerDown={nav.onDown} onPointerLeave={nav.onLeave}
          style={{ cursor: "grab", touchAction: "none" }}>
          <g ref={gRef} transform={`translate(${tf.x} ${tf.y}) scale(${tf.k})`}>
            {landEls}
            {/* routes for the selected city's bands — links the clicked circle to their other dates */}
            {routeEls}
            {dotEls}
            {hiEls}
          </g>
        </svg>
        <div className="gv-tmap-zoom">
          <button onClick={() => nav.zoom(1.4)} title="zoom in">+</button>
          <button onClick={() => nav.zoom(1 / 1.4)} title="zoom out">−</button>
          {tf.k > 1 && <button onClick={() => { setOff(new Set()); nav.resetView(cities); }} title="reset view">⟲</button>}
        </div>
      </div>
      {/* city chips removed (Fuad 2026-07-12) — fisheye + map reset button remain */}
    </div>
  );
}

function TourSection({ go, gigDate }) {
  const R = window.ROTATION;
  const [tour, setTour] = React.useState(window.ROTATION_TOUR || null);
  const [limit, setLimit] = React.useState(20);   // expand by +40 per click (Fuad 2026-07-18)
  const [gran, setGran] = React.useState("m");
  const [selKey, setSelKey] = React.useState(null);   // calendar bucket ("2026-08" / week-start / day)
  const [city, setCity] = React.useState(null);       // "CC|City" from a map dot
  const [gkey, setGkey] = React.useState(null);       // genre-cascade key ("f"+famI | "t:Metal" | "?")
  const [sub, setSub] = React.useState(null);         // genre-cascade subgenre index
  const [hi, setHi] = React.useState(null);           // hovered artist id → tour path on the map
  const [checked, setChecked] = React.useState(() => new Set());  // artists whose routes are mapped
  const toggleCheck = (id) => setChecked(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  React.useEffect(() => {
    if (window.ROTATION_TOUR || !R.TOUR) return;
    const prev = document.getElementById("tm-tour-lazy-js");
    if (prev) { prev.addEventListener("load", () => setTour(window.ROTATION_TOUR)); return; }
    const s = document.createElement("script"); s.id = "tm-tour-lazy-js"; s.src = "tm-tour-lazy.js";
    s.onload = () => setTour(window.ROTATION_TOUR);
    s.onerror = () => setTour({ artists: [] });   // fail-open instead of "loading tour dates…" forever
    document.head.appendChild(s);
  }, []);
  const hueOf = (s) => { let h = 0; for (const c of (s || "")) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 360; };
  const wkOf = (d) => { const t = new Date(d + "T00:00:00Z"); t.setUTCDate(t.getUTCDate() - (t.getUTCDay() + 6) % 7); return t.toISOString().slice(0, 10); };
  const keyOf = (d) => gran === "m" ? d.slice(0, 7) : gran === "w" ? wkOf(d) : d;
  // flat [artist, event] pairs; genre resolved once. Real library family → "f"+i (has subgenres);
  // else fall back to the Ticketmaster classification → "t:<genre>"; else truly unplaced → "?".
  const flat = React.useMemo(() => {
    const out = [];
    for (const a of ((tour && tour.artists) || [])) {
      const rec = R.byId[a.id] || (R.expById && R.expById[a.id]) || null;
      const prim = rec && rec.s && rec.s.length ? rec.s[0] : -1;
      // Family by the site’s own convention. `fm` is the record’s family MEMBERSHIP array and is what
      // rotation-explore’s recInFam tests FIRST, so an artist carrying no display subgenres is still
      // placed by us instead of dropping to a Ticketmaster bucket. That fallback was sending 209 of 689
      // gig artists — Megadeth, Korn, Muse, Pendulum among them — to generic "Rock"/"Metal" pills with
      // hash-derived hues, and since the map tints each city by its dominant genre hue it was colouring
      // the map from those hashes too (Fuad 2026-09-13).
      let famI = prim >= 0 && R.SUBS[prim] ? R.SUBS[prim].fam : -1;
      if (famI < 0 && rec && rec.sq && rec.sq.length && R.SUBS[rec.sq[0]]) famI = R.SUBS[rec.sq[0]].fam;
      if (famI < 0 && rec && rec.fm && rec.fm.length) famI = rec.fm[0];
      let gkey, gname, ghue;
      if (famI >= 0) { const f = R.FAMILIES.find(x => x.i === famI); gkey = "f" + famI; gname = f ? f.family : "—"; ghue = f ? f.hue : null; }
      else if (a.tmGenre) { gkey = "t:" + a.tmGenre; gname = a.tmGenre; ghue = hueOf("tm" + a.tmGenre); }
      else { gkey = "?"; gname = "genre unknown"; ghue = null; }
      const aug = { ...a, prim, famI, gkey, gname, ghue, hue: rec ? rec.hue : hueOf(a.name) };
      for (const e of a.events) out.push({ a: aug, e });
    }
    return out;
  }, [tour]);
  // SEEN FILTER (Fuad 2026-09-13): "all" or only artists never caught live. Applied to `flat`
  // itself rather than to each view, so the map, the calendar, the genre cascade and the list all
  // narrow together — a genre pill counting acts the list will not show would be its own bug.
  // R.GIGS.gigs is the attended-concert log; 182 distinct artistIds across 185 shows.
  const [seenFilt, setSeenFilt] = React.useState("all");   // all | unseen
  const seenIds = React.useMemo(() => {
    const s = new Set();
    for (const g of ((R.GIGS && R.GIGS.gigs) || [])) if (g.artistId) s.add(g.artistId);
    return s;
  }, [R]);
  const pool = React.useMemo(() => seenFilt === "unseen" ? flat.filter(x => !seenIds.has(x.a.id)) : flat,
    [flat, seenFilt, seenIds]);
  const byGenre = (x) => sub != null ? x.a.prim === sub : gkey != null ? x.a.gkey === gkey : true;
  const [mktFocus, setMktFocus] = React.useState(null);   // market chip clicked → TourMap flies there
  const byCity = (x) => city == null || (x.e.cc + "|" + x.e.city) === city;
  const byTime = (x) => selKey == null || keyOf(x.e.d) === selKey;
  // each vis sees the OTHER two filters; the list sees all three
  const calEvents = React.useMemo(() => pool.filter(x => byGenre(x) && byCity(x)), [pool, gkey, sub, city]);
  const mapEvents = React.useMemo(() => pool.filter(x => byGenre(x) && byTime(x)), [pool, gkey, sub, selKey, gran]);
  const cascArts = React.useMemo(() => {
    const seen = new Map();
    for (const x of pool) if (byCity(x) && byTime(x) && !seen.has(x.a.id)) seen.set(x.a.id, x.a);
    return [...seen.values()];
  }, [pool, city, selKey, gran]);
  const artists = React.useMemo(() => {
    const m = new Map();
    for (const x of pool) {
      if (!byGenre(x) || !byCity(x) || !byTime(x)) continue;
      if (!m.has(x.a.id)) m.set(x.a.id, Object.assign({}, x.a, { events: [] }));
      m.get(x.a.id).events.push(x.e);
    }
    const arr = [...m.values()];
    for (const r of arr) r.events.sort((p, q) => (p.d < q.d ? -1 : 1));
    return arr.sort((p, q) => q.plays - p.plays);
  }, [pool, gkey, sub, city, selKey, gran]);
  const T = R.TOUR;
  if (!T) return null;
  const hiArt = hi ? artists.find(a => a.id === hi) : null;
  const hiPath = hiArt ? hiArt.events.filter(e => e.ll).map(e => [(e.ll[1] + 180) / 360 * 1000, (90 - e.ll[0]) / 180 * 500]) : null;
  // routes are opt-in per artist via the row checkboxes (drawing every band at once was a mess —
  // Fuad). Each checked artist's FULL itinerary (within the genre/time filter, all cities) is drawn.
  const checkedRoutes = React.useMemo(() => {
    if (!checked.size) return null;
    const byA = new Map();
    for (const x of mapEvents) {
      if (!x.e.ll || !checked.has(x.a.id)) continue;
      if (!byA.has(x.a.id)) byA.set(x.a.id, { id: x.a.id, hue: x.a.hue, pts: [] });
      byA.get(x.a.id).pts.push([(x.e.ll[1] + 180) / 360 * 1000, (90 - x.e.ll[0]) / 180 * 500]);
    }
    return [...byA.values()].filter(r => r.pts.length >= 2);
  }, [mapEvents, checked]);
  const anyFilt = gkey != null || sub != null || city != null || selKey != null || seenFilt !== "all";
  React.useEffect(() => { setLimit(20); }, [gkey, sub, city, selKey, gran]);   // fresh slice → back to the first page
  const shown = artists.slice(0, limit);
  const chips = [];
  if (selKey) chips.push([selKey, () => setSelKey(null)]);
  if (city) chips.push([city.split("|")[1], () => setCity(null)]);
  if (sub != null) chips.push([(R.SUBS[sub] || {}).name, () => setSub(null)]);
  else if (gkey != null) { const g = cascArts.find(a => a.gkey === gkey); chips.push([g ? g.gname : gkey, () => { setGkey(null); setSub(null); }]); }
  return (
    <section className="gv-sec">
      <div className="gv-label">On tour now · Ticketmaster</div>
      {/* the freshness stamp rides THIS line, pushed right (Fuad 2026-09-14) — it used to sit in
          the market-chip row under the map, where it read as one more chip among the filters. It is
          not a filter, it is provenance for everything below it, so it belongs beside the headline
          count and out of the chip flow. */}
      <div className="gv-title gv-title-split">
        <span>{anyFilt ? <>{artists.length} of {T.artistCount} artists match.</> : <>{T.artistCount} artists from your rotation have upcoming dates.</>}</span>
        <span className="gv-tour-fetched">{T.warn ? <>checked {T.checked} · data from {T.fetched}</> : <>checked {T.fetched} · refreshed weekly</>}</span>
      </div>
      {T.warn && (
        <div className="gv-tour-warn" role="status">
          <b>⚠ Tour data may be stale.</b> The last pull ({T.warn.at || T.checked}) looked wrong — {T.warn.reason} Showing the last good data from {T.fetched}.
        </div>
      )}
      <div className="gv-tour-meta">
        {T.markets.map(m => (
          <span key={m.id} className="gv-tour-mkt" data-stale={!!m.stale} role="button"
            style={{ cursor: "pointer" }}
            onClick={() => setMktFocus({ id: m.id, t: Date.now() })}
            title={`fly the map to ${m.label} · ${m.scanned} events scanned within ${m.radiusKm} km${m.stale ? " — this market returned nothing on the last pull; showing last good data" : ""}${m.id === "tokyo" && !m.scanned ? " — Ticketmaster carries no Japan inventory (that circuit lives on eplus/Pia, no public API)" : ""}`}>
            {m.label} <b>{m.matched}</b>{m.stale ? " ⚠" : ""}
          </span>
        ))}
        {chips.map(([lbl, clear], i) => (
          <span key={lbl + i} className="gv-tour-chip" onClick={clear}>{lbl} ✕</span>
        ))}
        {anyFilt && <span className="gv-tour-chip gv-tour-chip-all" onClick={() => { setGkey(null); setSub(null); setCity(null); setSelKey(null); setSeenFilt("all"); }}>clear all</span>}
        {/* pinned right on this row; margin-left:auto rather than a wrapper so it still wraps with
            the rest when the market chips run long */}
        <div className="r-seg r-seg-sm gv-tour-seen">
          {[["all", "all"], ["unseen", "not seen"]].map(([k, l]) => (
            <button key={k} data-on={seenFilt === k} onClick={() => setSeenFilt(k)}
              title={k === "unseen" ? "only artists you have never caught live" : "every artist with upcoming dates"}>{l}</button>
          ))}
        </div>
      </div>
      {!tour && <div className="r-mono" style={{ color: "var(--ink-faint)", padding: 16 }}>loading tour dates…</div>}
      {tour && <>
        <div className="r-card gv-tmap-card">
          {/* allEvents is the UNFILTERED pool — the map builds its dot key set from it so a genre
              click moves radii instead of unmounting circles. See the note above dotCities. */}
          <TourMap events={mapEvents} allEvents={pool} city={city} setCity={setCity} hiPath={hiPath} hiHue={hiArt ? hiArt.hue : 40} routes={checkedRoutes} focus={mktFocus} />
          <div className="gv-tmap-foot">
            <span className="r-mono gv-tmap-hint">{hiArt ? <>tracing <b>{hiArt.name}</b>'s route — dots numbered in date order</>
              : checked.size ? <>mapping <b>{(checkedRoutes || []).length}</b> route{(checkedRoutes || []).length !== 1 ? "s" : ""} — tick artists below to add · <em style={{ cursor: "pointer", color: "var(--accent)" }} onClick={() => setChecked(new Set())}>clear ✕</em></>
              : "where — scroll to zoom · drag to pan · click a city to filter · tick artists below to draw their tour routes"}</span>
          </div>
          <TourCal events={calEvents} gran={gran} setGran={setGran} selKey={selKey} setSelKey={setSelKey} keyOf={keyOf} />
        </div>
        <GenreCascade R={R} arts={cascArts} gkey={gkey} sub={sub} setGkey={setGkey} setSub={setSub} />
        <div className="gv-tour">
          {shown.map(a => {
            const known = !!R.byId[a.id];
            const multi = a.events.filter(e => e.ll).length >= 2;   // has a route to draw
            return (
              <div key={a.id + a.name} className="gv-tour-row" data-hi={hi === a.id} data-checked={checked.has(a.id)}
                onMouseEnter={() => setHi(a.id)} onMouseLeave={() => setHi(null)}>
                <label className="gv-check" title={multi ? "map this artist's tour route on the map above" : "only one mapped date — no route to draw"} onClick={(e) => e.stopPropagation()}>
                  {multi ? <input type="checkbox" checked={checked.has(a.id)} onChange={() => toggleCheck(a.id)} /> : <span className="gv-check-dot" />}
                </label>
                <div className="gv-tour-a" data-link={known} onClick={() => known && go("artist", a.id)}>
                  <GenCover hue={a.hue} name={a.name} size={40} radius={4} />
                  <div style={{ minWidth: 0 }}>
                    {/* the microphone rides with the NAME (Fuad 2026-08-19), not down in the
                        stats line — "have I seen them" is a fact about the artist, and next to
                        the name it can be read straight down the column instead of hunting for
                        it mid-sentence. The count stays in the tooltip; the glyph says the rest. */}
                    <div className={"gv-tile-name" + (a.seen ? " has-mic" : "")}>
                      <span className="gv-tile-nametext">{a.name}</span>
                      {a.seen ? <span className="gv-seen-mic" title={a.seen === 1 ? "seen live once" : `seen live ${a.seen} times`}>🎤</span> : null}
                    </div>
                    <div className="gv-tile-sub">
                      {a.plays > 0 ? `${fmt(a.plays)} plays` : "on your radar"}
                    </div>
                  </div>
                  {a.react ? <span className="gv-react" title="listed as disbanded on MusicBrainz/Wikidata — yet here they are with fresh dates">reactivated</span> : null}
                </div>
                <div className="gv-tour-ev">
                  {a.events.slice(0, 3).map((e, i) => (
                    <a key={(e.url || e.d) + i} href={e.url || undefined} target="_blank" rel="noopener noreferrer"
                      onClick={(ev) => ev.stopPropagation()} data-dead={!e.url}>
                      <span className="gv-tour-d">{gigDate(e.d, false)}</span>
                      <span className="gv-tour-w">{e.v}{e.city ? `, ${e.city}` : ""}{e.cc ? ` (${e.cc})` : ""}{e.ev && e.ev.toLowerCase().indexOf(a.name.toLowerCase()) < 0 ? ` — ${e.ev}` : ""}</span>
                      {e.url ? <span className="gv-tour-out">↗</span> : null}
                    </a>
                  ))}
                  {a.events.length > 3 && <div className="gv-tour-more">+{a.events.length - 3} more dates</div>}
                </div>
              </div>
            );
          })}
          {!artists.length && <div className="r-mono" style={{ color: "var(--ink-faint)", padding: 18, textAlign: "center" }}>nothing matches this slice — clear a filter.</div>}
        </div>
        {artists.length > 20 && (
          <button className="gv-tour-all" onClick={() => setLimit(l => l >= artists.length ? 20 : l + 40)}>
            {limit >= artists.length ? "show fewer" : `show ${Math.min(40, artists.length - limit)} more · ${limit} of ${artists.length}`}
          </button>
        )}
      </>}
    </section>
  );
}

function GigsView({ go }) {
  const R = window.ROTATION, G = R.GIGS;
  if (!G || !G.gigs || !G.gigs.length) return (
    <div style={{ maxWidth: 720, margin: "60px auto", textAlign: "center", color: "var(--ink-soft)" }}>No attended concerts yet.</div>
  );
  // manual entries can be month-precision ("2026-03", approx:1) → "≈ Mar" instead of a fake day
  const MONS = window.MON;
  const gigDate = (d, noYear) => d.length === 7
    ? "≈ " + MONS[+d.slice(5, 7) - 1] + (noYear ? "" : " " + d.slice(0, 4))
    : noYear ? fmtDate(d).replace(/ (\d{4})$/, "") : fmtDate(d);
  const openArtist = (id) => artistHasPage(id) && go("artist", id);
  const years = [...new Set(G.gigs.map(g => g.year))].sort((a, b) => b - a);
  const span = G.firstGig.slice(0, 4) + "–" + G.lastGig.slice(0, 4);
  const maxCity = Math.max(...G.cityList.map(c => c.count));

  // the set of artistIds Fuad has actually STOOD in the crowd for — factored cleanly so a later
  // iteration can hand it to the map filters. Bucket list = his most-played artists NOT in it.
  const seenIds = React.useMemo(() => new Set(G.gigs.map(g => g.artistId)), []);
  // keep each artist's REAL rank in the overall top-artists order (index+1 in R.ARTISTS),
  // not their position within this filtered queue — TON is #5 overall even if 3rd here.
  // all vs ACTIVE (default — no point queueing for Type O Negative, Fuad 2026-07-14)
  const [bucketMode, setBucketMode] = React.useState("active");
  const [bucketShown, setBucketShown] = React.useState(12);   // expand by +12 per click (Fuad 2026-07-18)
  // YEAR SCRUB (Fuad 2026-08-06) — same control as the Overview map's year slider. null = all
  // time (rank = overall top-artists rank); a year re-ranks the queue by THAT year's plays
  // (a.yp is the sparse per-year map), so "who owned my 2013 and I still never caught them".
  const bucketYears = React.useMemo(() => (R.YEARS || []).map(y => y.year).sort((a, b) => a - b), []);
  const [yrIdx, setYrIdx] = React.useState(null);
  const [yrPlay, setYrPlay] = React.useState(false);
  const bucketYear = yrIdx == null ? null : bucketYears[yrIdx];
  React.useEffect(() => { setBucketShown(12); }, [bucketMode, bucketYear]);
  React.useEffect(() => {
    if (!yrPlay || !bucketYears.length) return;
    const t = setInterval(() => setYrIdx(i => {
      const n = i == null ? 0 : i + 1;
      if (n >= bucketYears.length) { setYrPlay(false); return bucketYears.length - 1; }
      return n;
    }), 1100);
    return () => clearInterval(t);
  }, [yrPlay, bucketYears]);
  const bucketList = React.useMemo(() => {
    const pool = (R.ARTISTS || [])
      .map((a, idx) => ({ a, rank: idx + 1, plays: a.plays }))
      .filter(e => !seenIds.has(e.a.id))
      .filter(e => bucketMode === "all" || !(e.a.life && e.a.life.ended));
    if (bucketYear == null) return pool;
    // rank within the year is the artist's place among EVERYONE played that year (seen or not) —
    // an unseen act sitting at #3 of 2013 is the point; renumbering 1..n would erase it.
    const y = String(bucketYear);
    const yrRank = new Map();
    (R.ARTISTS || []).filter(a => (a.yp || {})[y] > 0)
      .sort((a, b) => b.yp[y] - a.yp[y])
      .forEach((a, i) => yrRank.set(a.id, i + 1));
    return pool
      .filter(e => (e.a.yp || {})[y] > 0)
      .map(e => ({ a: e.a, rank: yrRank.get(e.a.id), plays: e.a.yp[y] }))
      .sort((x, z) => z.plays - x.plays);
  }, [seenIds, bucketMode, bucketYear]);

  const [seenShown, setSeenShown] = React.useState(12);   // Seen & loved: expand by +12 per click (Fuad 2026-07-18)
  const [strangeShown, setStrangeShown] = React.useState(12);   // Passed through: same +12 pager (Fuad 2026-08-20)
  // TIME AT CONCERTS — an honest back-of-envelope: songs heard live × ~4.2 min a song.
  const SONG_MIN = 4.2;
  const crowdHours = Math.round(G.songsSeen * SONG_MIN / 60);
  // ── THE TIMELINE, grouped by night ─────────────────────────────────────────────
  // Acts within a night are ordered by how much you actually play them (lifetime scrobbles),
  // falling back to set length — that's what makes Tool rather than Maple's Pet Dinosaur the
  // face of a 14-act festival day. `place` collapses the venue: one venue → its name, several
  // (stage names on one festival site) → "N stages", plus the city when it's shared.
  const [expandAll, setExpandAll] = React.useState(false);
  const [openDays, setOpenDays] = React.useState({});   // date → open?
  const nights = React.useMemo(() => {
    const m = new Map();
    for (const g of G.gigs) { if (!m.has(g.date)) m.set(g.date, []); m.get(g.date).push(g); }
    return [...m.entries()].map(([date, list]) => {
      const acts = list.slice().sort((a, b) => (b.plays - a.plays) || (b.songCount - a.songCount));
      const venues = [...new Set(acts.map(a => a.venue).filter(Boolean))];
      const cities = [...new Set(acts.map(a => a.city).filter(Boolean))];
      const where = venues.length === 1 ? venues[0] : venues.length > 1 ? `${venues.length} stages` : "";
      return {
        date, year: acts[0].year, acts,
        place: [where, cities.join(" · ")].filter(Boolean).join(" · "),
        songCount: acts.reduce((s, a) => s + a.songCount, 0),
      };
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, []);
  const GigRow = ({ g, noDate }) => (
    <div className="gv-gig" data-link={artistHasPage(g.artistId)} onClick={() => openArtist(g.artistId)}>
      <div className="gv-gig-date" title={g.approx ? "approximate — exact day unknown" : undefined}>{noDate ? "" : gigDate(g.date, true)}</div>
      <span className="gv-gig-dot" style={{ background: `oklch(0.68 0.16 ${g.hue})` }} />
      <div className="gv-gig-main">
        <div className="gv-gig-artist">{g.artist}{g.tour ? <span className="gv-gig-tour"> · {g.tour}</span> : null}</div>
        <div className="gv-gig-venue">{g.venue}{g.city ? ` · ${g.city}` : ""}</div>
        {g.knownSongs.length > 0 && (
          // Songs link to their track page exactly as the festival-night row does. knownSongs is
          // built from plays>0 only, so every title here HAS a page (id = artistId~trackSlug).
          // stopPropagation keeps the click off the row's open-artist handler.
          <div className="gv-gig-songs" onClick={(e) => e.stopPropagation()}>
            heard live, in your rotation: {g.knownSongs.map((s, j) => (
              <React.Fragment key={s.title}>{j > 0 ? ", " : ""}
                <b data-link={true} onClick={() => go("track", g.artistId + "~" + R.slug(s.title))}>{s.title}</b>
              </React.Fragment>
            ))}{g.knownCount > g.knownSongs.length ? ` +${g.knownCount - g.knownSongs.length}` : ""}
          </div>
        )}
      </div>
      <div className="gv-gig-meta">
        {g.plays > 0 ? <span className="gv-gig-plays">{fmt(g.plays)}<small>plays</small></span> : null}
        {g.songCount > 0 ? <span className="gv-gig-set">{g.songCount}<small>songs</small></span> : null}
      </div>
    </div>
  );
  const Tile = ({ a, sub }) => (
    <div className="gv-tile" data-link={artistHasPage(a.artistId)} onClick={() => openArtist(a.artistId)}>
      <GenCover hue={a.hue} name={a.artist} size={40} radius={4} />
      <div style={{ minWidth: 0 }}>
        <div className="gv-tile-name">{a.artist}</div>
        <div className="gv-tile-sub">{sub(a)}</div>
      </div>
    </div>
  );
  return (
    <div className="gv">
      <header className="gv-hero">
        <div className="gv-kicker">Attended · setlist.fm</div>
        {/* Short title, count moved down to the lede (Fuad 2026-08-20) — matching every other
            Rotation page: "Dig through.", "The record shop.", "Every day.". This was the only h1 on
            the site that was a full sentence carrying a number, which is also why its type still read
            as wrong after .gv-h1 was matched to .r-title's metrics in bfaa719. The metrics were half
            of it; the shape of the line was the rest. */}
        {/* "In the crowd." retired (Fuad 2026-09-13) — the kicker above already names the page */}
        <p className="gv-lead">
          <b>{G.total}</b> shows — {G.artists} artists across {G.cities} cities in {G.countries} countries, {span}.
          {" "}{fmt(G.songsSeen)} songs played to you live; <b>{G.inLibrary}</b> of these acts are in your rotation.
        </p>
        <div className="gv-stats">
          {[["shows", G.total], ["artists", G.artists], ["hours in crowds", crowdHours], ["songs seen", G.songsSeen]].map(([l, n]) => (
            <div key={l} className="gv-stat"><div className="gv-stat-n">{fmt(n)}</div><div className="gv-stat-l">{l}</div></div>
          ))}
        </div>
        <div className="gv-crowd-cap">≈ {fmt(crowdHours)} h in crowds · {fmt(G.songsSeen)} songs seen × ~4 min + change</div>
      </header>

      <TourSection go={go} gigDate={gigDate} />

      {/* LIVE BUCKET LIST — your most-played artists you've never stood in a crowd for. A queue,
          not a chart: numbered, plays shown, each tile opens the artist page. (seenIds is factored
          so a later pass can dim/route these on the map.) */}
      {/* guarded on ARTISTS, not bucketList — a year with nothing left to catch must still render
          the slider, or the scrub strands you on an empty page with no way back. */}
      {(R.ARTISTS || []).length > 0 && (
        <section className="gv-sec">
          <div className="gv-label">Still to catch</div>
          <div className="gv-title" style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <span>{bucketYear == null
              ? "The rotation regulars you've never seen live."
              : `Who owned your ${bucketYear} — and still got away.`}</span>
            <div className="r-seg" style={{ flex: "0 0 auto" }}>
              <button data-on={bucketMode === "active"} onClick={() => setBucketMode("active")}>active</button>
              <button data-on={bucketMode === "all"} onClick={() => setBucketMode("all")}>all</button>
            </div>
          </div>
          <div className="gv-years">
            <button className="gv-play" data-on={yrPlay}
              onClick={() => { if (!yrPlay && (yrIdx == null || yrIdx >= bucketYears.length - 1)) setYrIdx(0); setYrPlay(p => !p); }}>
              {yrPlay ? "❚❚" : "▶"}
            </button>
            <input className="gv-slider" type="range" min="0" max={bucketYears.length} value={yrIdx == null ? 0 : yrIdx + 1}
              onChange={(e) => { setYrPlay(false); const v = +e.target.value; setYrIdx(v === 0 ? null : v - 1); }} />
            <span className="gv-yrlabel">{bucketYear == null ? "all years" : bucketYear}</span>
          </div>
          <div className="gv-bucket">
            {bucketList.slice(0, bucketShown).map(({ a, rank, plays }) => (
              <div key={a.id} className="gv-bucket-row" data-link={artistHasPage(a.id)} onClick={() => openArtist(a.id)}>
                <span className="gv-bucket-n">{rank}</span>
                <GenCover hue={a.hue} name={a.name} size={34} radius={4} image={a.thumb || a.image} />
                <div style={{ minWidth: 0 }}>
                  <div className="gv-tile-name">{a.name}</div>
                  <div className="gv-tile-sub">{fmt(plays)} plays{bucketYear == null ? "" : " in " + bucketYear} · never caught</div>
                </div>
              </div>
            ))}
          </div>
          {bucketList.length === 0 && (
            <div className="gv-tile-sub" style={{ padding: "8px 2px" }}>
              You caught everyone you played in {bucketYear}.
            </div>
          )}
          {bucketList.length > 12 && (
            <button className="gv-tour-all" onClick={() => setBucketShown(n => n >= bucketList.length ? 12 : n + 12)}>
              {bucketShown >= bucketList.length ? "show fewer" : `show 12 more · ${Math.min(bucketShown, bucketList.length)} of ${bucketList.length}`}
            </button>
          )}
        </section>
      )}

      {/* the ledger — of your kept artists: seen · still possible · gone for good · second
          chances (disbanded groups back with dates). caught = seen before they ended. */}
      {G.coverage && (() => {
        const c = G.coverage;
        const openArt = (id) => artistHasPage(id) && go("artist", id);
        const Chip = ({ e, sub, accent }) => (
          <span className="gv-led-chip" data-link={artistHasPage(e[1])} onClick={() => openArt(e[1])} title={`${fmt(e[2])} plays`}>
            {e[0]}{sub ? <small style={accent ? { color: accent } : undefined}> {sub}</small> : null}
          </span>
        );
        // "'19" from a 4-char year. Reactivated chips read "back since 'YY" ONLY when the real comeback
        // year is known; otherwise the honest fallback "split 'YY · back" (the split year explicitly
        // labelled, so it never reads as a years-long reactivation). No known year at all → "reactivated".
        const yy = (y) => (y && String(y).length >= 4) ? `'${String(y).slice(2, 4)}` : "";
        const backSub = (comeback, split) => yy(comeback) ? `back since ${yy(comeback)}`
          : (yy(split) ? `split ${yy(split)} · back` : "reactivated");
        // † for deceased Persons (kind 1) AND bands ended by a member's death (kind 2); year labels it.
        const crossSub = (kind, year) => kind ? (year ? `† ${year}` : (kind === 1 ? "deceased" : "†")) : null;
        return (
          <section className="gv-sec">
            <div className="gv-label">The ledger</div>
            <div className="gv-title">Of your {c.total} rotation artists — who you've caught, and who got away.</div>
            <div className="gv-stats" style={{ maxWidth: 700, gridTemplateColumns: "repeat(4, 1fr)" }}>
              {[["seen live", c.seen, "you stood in their crowd"],
                ["still possible", c.open, "active, or at least not on record as ended"],
                ["gone for good", c.gone, "disbanded or deceased, no dates anywhere"],
                ["second chances", c.chance, "on record as done — yet back: touring now, or reformed after a breakup"]].map(([l, n, tip]) => (
                <div key={l} className="gv-stat" title={tip}><div className="gv-stat-n">{n}</div><div className="gv-stat-l">{l}</div></div>
              ))}
            </div>
            <div className="gv-led-cols">
              {c.goneList.length > 0 && (
                <div className="gv-led-col gv-led-gone">
                  <div className="gv-led-h">The ones that got away</div>
                  {c.goneList.map(e => <Chip key={e[1]} e={e} sub={e[4] ? crossSub(e[4], e[5] || e[3]) : (e[3] ? `ended ${e[3]}` : "ended")} />)}
                </div>
              )}
              {c.caughtList.length > 0 && (
                <div className="gv-led-col gv-led-caught">
                  <div className="gv-led-h" style={{ color: "oklch(0.72 0.15 150)" }}>Caught them in time</div>
                  {c.caughtList.map(e => (e[5] || e[6])
                    ? <Chip key={e[1]} e={e} accent="oklch(0.72 0.15 150)" sub={backSub(e[5], e[6])} />
                    : <Chip key={e[1]} e={e} sub={e[4] ? crossSub(e[4], e[7] || e[3]) : (e[3] ? `ended ${e[3]}` : "since ended")} />)}
                </div>
              )}
              {c.chanceList.length > 0 && (
                <div className="gv-led-col gv-led-chance">
                  <div className="gv-led-h" style={{ color: "oklch(0.75 0.16 45)" }}>Second chances — the door reopened</div>
                  {c.chanceList.map(e => <Chip key={e[1]} e={e} accent="oklch(0.75 0.16 45)"
                    sub={e[3] ? `next ${e[3]}` : backSub(e[4], e[5])} />)}
                </div>
              )}
            </div>
          </section>
        );
      })()}

      {G.seenTop.length > 0 && (
        <section className="gv-sec">
          <div className="gv-label">Seen &amp; loved</div>
          <div className="gv-title">The acts you play the most, live in the room.</div>
          <div className="gv-tiles">
            {G.seenTop.slice(0, seenShown).map(a => <Tile key={a.artistId} a={a} sub={(x) => `${fmt(x.plays)} plays`} />)}
          </div>
          {G.seenTop.length > 12 && (
            <button className="gv-tour-all" onClick={() => setSeenShown(n => n >= G.seenTop.length ? 12 : n + 12)}>
              {seenShown >= G.seenTop.length ? "show fewer" : `show 12 more · ${Math.min(seenShown, G.seenTop.length)} of ${G.seenTop.length}`}
            </button>
          )}
        </section>
      )}

      {G.preFans.length > 0 && (
        <section className="gv-sec">
          <div className="gv-label">Before you were a fan</div>
          <div className="gv-title">You saw them first — the obsession came later.</div>
          <div className="gv-tiles">
            {G.preFans.map(a => <Tile key={a.artistId} a={a} sub={(x) => `saw ${gigDate(x.date)} · now ${fmt(x.plays)} plays`} />)}
          </div>
        </section>
      )}

      {G.strangers.length > 0 && (
        <section className="gv-sec">
          <div className="gv-label">Passed through</div>
          <div className="gv-title">Caught live — festival stages, support slots — but never in rotation.</div>
          <div className="gv-tiles">
            {G.strangers.slice(0, strangeShown).map(a => (
              <div key={a.artistId} className="gv-tile" style={{ cursor: "default" }}>
                <GenCover hue={a.hue} name={a.artist} size={40} radius={4} />
                <div style={{ minWidth: 0 }}>
                  <div className="gv-tile-name">{a.artist}</div>
                  <div className="gv-tile-sub">{a.city} · {a.songCount} songs</div>
                </div>
              </div>
            ))}
          </div>
          {G.strangers.length > 12 && (
            <button className="gv-tour-all" onClick={() => setStrangeShown(n => n >= G.strangers.length ? 12 : n + 12)}>
              {strangeShown >= G.strangers.length ? "show fewer" : `show 12 more · ${Math.min(strangeShown, G.strangers.length)} of ${G.strangers.length}`}
            </button>
          )}
        </section>
      )}

      {G.cityList.length > 1 && (
        <section className="gv-sec">
          <div className="gv-label">Where</div>
          <div className="gv-title">The cities that put you in a crowd.</div>
          <div className="gv-cities">
            {G.cityList.map(c => (
              <div key={c.countryCode + c.city} id={"gv-city-" + (c.countryCode + "|" + c.city).replace(/[^a-z0-9]/gi, "")} className="gv-city">
                <span className="gv-city-name">{c.city} <small>{c.country}</small></span>
                <div className="gv-city-bar"><i style={{ width: (c.count / maxCity * 100) + "%" }} /></div>
                <span className="gv-city-n">{c.count}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* THE TIMELINE — grouped by NIGHT, not by show. 109 shows land on 34 dates; the festival
          days (14 acts across 5 stages, 11 at Saitama, the Open'er and Porto runs) were drowning
          the ordinary gigs. A multi-act night collapses to one card headlining its three
          most-played acts, the rest a click away. Single-act nights render exactly as before. */}
      <section className="gv-sec">
        <div className="gv-label">The timeline</div>
        <div className="gv-title" style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <span>Every night, newest first.</span>
          <div className="r-seg" style={{ flex: "0 0 auto" }}>
            <button data-on={!expandAll} onClick={() => { setExpandAll(false); setOpenDays({}); }}>compact</button>
            <button data-on={expandAll} onClick={() => setExpandAll(true)}>everything</button>
          </div>
        </div>
        {years.map(y => (
          <div key={y} className="gv-year-block">
            <div className="gv-year">{y}<span>{G.byYear[y]} {G.byYear[y] === 1 ? "show" : "shows"}</span></div>
            <div className="gv-gigs">
              {nights.filter(n => n.year === y).map(n => {
                const open = expandAll || !!openDays[n.date];
                // one act that night → the original row, songs and all. Nothing to compact.
                if (n.acts.length === 1) return <GigRow key={n.date} g={n.acts[0]} />;
                const top = n.acts.slice(0, 4), rest = n.acts.length - top.length;
                return (
                  <div key={n.date} className="gv-night" data-open={open}>
                    <div className="gv-gig gv-night-head" data-link={true} onClick={() => setOpenDays(o => ({ ...o, [n.date]: !open }))}>
                      <div className="gv-gig-date" title={n.acts[0].approx ? "approximate — exact day unknown" : undefined}>{gigDate(n.date, true)}</div>
                      <span className="gv-night-dots">
                        {n.acts.slice(0, 4).map((a, i) => <i key={i} style={{ background: `oklch(0.68 0.16 ${a.hue})` }} />)}
                      </span>
                      <div className="gv-gig-main">
                        <div className="gv-gig-artist">
                          {top.map((a, i) => (
                            <React.Fragment key={a.artist + i}>
                              {i > 0 ? <span className="gv-night-sep"> · </span> : null}
                              <span className="gv-night-act" data-link={artistHasPage(a.artistId)}
                                onClick={(e) => { if (artistHasPage(a.artistId)) { e.stopPropagation(); openArtist(a.artistId); } }}>{a.artist}</span>
                            </React.Fragment>
                          ))}
                          {rest > 0 ? <span className="gv-night-more"> + {rest} more</span> : null}
                        </div>
                        <div className="gv-gig-venue">{n.place}</div>
                        {(() => {
                          // across the day's acts, the songs you most live with (build-side precompute,
                          // plays≥8, top 5). No setlist-level "heard the whole festival" data exists, so
                          // this is your rotation crossed with who you stood in front of. Clicking a
                          // song jumps to its track page (artistSlug~trackSlug, the site convention).
                          const tl = G.topLiveByDate && G.topLiveByDate[n.date];
                          if (!tl || !tl.length) return null;
                          return (
                            <div className="gv-gig-songs gv-night-live" onClick={(e) => e.stopPropagation()}>
                              {/* same-artist songs stack under ONE attribution ("Narcosynthesis,
                                  Beyond Within · Nevermore") — grouped by artist in first-appearance
                                  order, since the plays-sorted list can interleave acts (Fuad 2026-08-16) */}
                              heard live, in your rotation: {(() => {
                                const order = [], byAid = {};
                                for (const row of tl) { if (!byAid[row[2]]) { byAid[row[2]] = []; order.push(row[2]); } byAid[row[2]].push(row); }
                                return order.map((aid, gi) => (
                                  <React.Fragment key={aid}>
                                    {gi > 0 ? ", " : ""}
                                    {byAid[aid].map(([title], j) => (
                                      <React.Fragment key={title}>
                                        {j > 0 ? ", " : ""}
                                        <b data-link={true} onClick={() => go("track", aid + "~" + R.slug(title))}>{title}</b>
                                      </React.Fragment>
                                    ))}
                                    <span className="gv-night-live-by"> · {byAid[aid][0][1]}</span>
                                  </React.Fragment>
                                ));
                              })()}
                            </div>
                          );
                        })()}
                      </div>
                      <div className="gv-gig-meta">
                        <span className="gv-gig-plays">{n.acts.length}<small>acts</small></span>
                        {n.songCount > 0 ? <span className="gv-gig-set">{n.songCount}<small>songs</small></span> : null}
                      </div>
                    </div>
                    {/* UNRAVEL (Fuad 2026-09-14: "a transition that unravels to all the individual
                        concerts ... right now it's a bit abrupt"). The list used to be mounted and
                        unmounted on `open`, so a 14-act festival day appeared and vanished in one
                        frame. It now stays mounted and the WRAPPER animates grid-template-rows
                        0fr -> 1fr, which transitions to the content's real height without anyone
                        having to measure it or hard-code a max-height that clips a long day.
                        Each act then fades and slides in on its own small delay, so the day unrolls
                        top to bottom instead of arriving whole. Closing plays it straight back. */}
                    <div className="gv-night-unravel" aria-hidden={!open}>
                      <div className="gv-night-acts">
                        {n.acts.map((g, i) => (
                          <div key={g.artist + i} className="gv-night-act-row" style={{ "--i": Math.min(i, 11) }}>
                            <GigRow g={g} noDate />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      <div className="gv-foot">Attended-show data from your setlist.fm profile · {G.fetched}</div>

      <style>{`
        /* GigsView renders its own root (not inside .r-view), so it carries the app gutter itself
           — otherwise the page bleeds to the screen edges on mobile (Fuad 2026-07-18). */
        .gv { max-width: 900px; margin: 0 auto; padding: 0 var(--pad); }
        /* hero bottom padding + the first section margin were stacking to ~66px under the crowd caption
           (Fuad 2026-08-20). 26 -> 10 here, and the adjacent-sibling rule below trims only the FIRST
           section so the rhythm between later sections is untouched. */
        /* top padding 12 -> var(--pad): GigsView renders its own root rather than .r-view, so it was
           missing the standard view inset and the Attended kicker sat tight under the header. Matches
           the breathing room above “On tour now” below, and scales down with --pad on mobile.
           (Fuad 2026-09-13) */
        .gv-hero { padding: var(--pad) 2px 10px; }
        .gv-hero + .gv-sec { margin-top: 18px; }
        /* margin-bottom 14px -> 0: that space stood the kicker off the h1, which is retired. The lede
           carries its own 14px top margin, so the pair still breathes. (Fuad 2026-09-13) */
        .gv-kicker { font-family: var(--mono); font-size: 9.5px; letter-spacing: .22em; text-transform: uppercase; color: var(--accent); margin-bottom: 0; }
        /* Metrics copied from .r-title, not approximated (Fuad 2026-08-20: this line read as a
           different font from the rest of Gigs). It was: an h1 with no font-weight declared
           inherits bold, and the serif's bold cut is a visibly different face — .r-title sets
           400. The size/tracking/leading were all slightly off too, so match those as well. */
        .gv-h1 { font-family: var(--serif); font-weight: 400; font-size: clamp(34px, 4.4vw, 58px);
          line-height: 1.02; letter-spacing: -.025em; margin: 0; }
        .gv-h1 em { font-style: italic; }
        /* the accent full stop is styled as .r-title .dot in core, so it needs restating here —
           .gv-h1 is Gigs' own class and inherits none of that. No backticks in this block. */
        .gv-h1 .dot { color: var(--accent); }
        .gv-lead { color: var(--ink-soft); font-size: 15px; line-height: 1.6; margin: 14px 0 0; max-width: 620px; }
        .gv-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 24px; max-width: 560px; }
        .gv-stat { border: 1px solid var(--rule); border-radius: 8px; padding: 14px 12px; }
        .gv-stat-n { font-family: var(--serif); font-size: 26px; font-variant-numeric: tabular-nums; }
        .gv-stat-l { font-family: var(--mono); font-size: 9px; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-faint); margin-top: 4px; }
        .gv-sec { margin-top: 40px; }
        .gv-label { font-family: var(--mono); font-size: 9.5px; letter-spacing: .22em; text-transform: uppercase; color: var(--accent); margin-bottom: 8px; }
        .gv-title { font-family: var(--serif); font-style: italic; font-size: 21px; margin-bottom: 16px; }
        /* headline left, freshness stamp hard right on the same baseline. A modifier rather than a
           change to .gv-title, which four other sections share. Wraps rather than crushes on narrow
           screens, and the stamp keeps its mono voice against the serif headline. */
        .gv-title-split { display: flex; align-items: baseline; justify-content: space-between; gap: 10px 16px; flex-wrap: wrap; }
        .gv-title-split > .gv-tour-fetched { margin-left: auto; font-style: normal; white-space: nowrap; }
        .gv-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 8px; }
        .gv-tile { display: flex; gap: 12px; align-items: center; padding: 8px 10px; border: 1px solid var(--rule); border-radius: 6px; transition: border-color .15s; }
        .gv-tile[data-link="true"] { cursor: pointer; }
        .gv-tile[data-link="true"]:hover { border-color: var(--rule-2); }
        .gv-tile-name { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        /* Only the row carrying a mic becomes a flex row. Three other views use .gv-tile-name with
           bare text and rely on the truncation above, so the flex treatment is opt-in rather than
           applied to the class: with ellipsis on the container the glyph sits inside the clipped
           region and disappears on long names — exactly the rows worth marking. */
        .gv-tile-name.has-mic { display: flex; align-items: baseline; gap: 6px; min-width: 0; overflow: visible; }
        .gv-tile-name.has-mic .gv-tile-nametext { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
        .gv-seen-mic { font-size: 11px; flex: none; opacity: .9; cursor: default; }
        .gv-tile-sub { font-size: 11.5px; color: var(--ink-faint); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .gv-cities { display: grid; gap: 8px; max-width: 560px; }
        .gv-city { display: grid; grid-template-columns: 150px 1fr 34px; gap: 12px; align-items: center; }
        .gv-city-name { font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .gv-city-name small { color: var(--ink-faint); font-size: 11px; }
        .gv-city-bar { height: 7px; background: var(--bg-3); border-radius: 4px; overflow: hidden; }
        .gv-city-bar i { display: block; height: 100%; background: var(--accent); border-radius: 4px; }
        .gv-city-n { font-family: var(--mono); font-size: 11px; color: var(--ink-faint); text-align: right; }
        .gv-year-block { margin-bottom: 6px; }
        .gv-year { display: flex; align-items: baseline; gap: 12px; font-family: var(--serif); font-size: 24px; margin: 22px 2px 8px; }
        .gv-year span { font-family: var(--mono); font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-faint); }
        .gv-year::after { content: ""; flex: 1; height: 1px; background: var(--rule); align-self: center; }
        .gv-gigs { display: grid; gap: 2px; }
        .gv-gig { display: grid; grid-template-columns: 88px 10px 1fr auto; gap: 12px; align-items: start; padding: 10px; margin: 0 -10px; border-radius: 6px; transition: background .15s; }
        .gv-gig[data-link="true"] { cursor: pointer; }
        .gv-gig[data-link="true"]:hover { background: var(--bg-3); }
        .gv-gig-date { font-family: var(--mono); font-size: 11px; color: var(--ink-faint); padding-top: 3px; white-space: nowrap; }
        .gv-gig-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 5px; }
        .gv-gig-artist { font-size: 14.5px; font-weight: 600; }
        .gv-gig-tour { font-weight: 400; font-style: italic; color: var(--ink-faint); font-size: 12.5px; }
        .gv-gig-venue { font-size: 12px; color: var(--ink-soft); margin-top: 1px; }
        .gv-gig-songs { font-size: 11.5px; color: var(--ink-faint); margin-top: 5px; line-height: 1.5; }
        .gv-gig-songs b { color: var(--ink-soft); font-weight: 500; }
        /* the clickable affordance keys off data-link, NOT off the festival-night container
           (Fuad 2026-08-19): it used to live on .gv-night-live b, so when single-act rows and
           expanded cluster acts got their track links the titles were clickable but looked
           completely inert — no cursor, no underline, no hover. Both paths share it now. */
        .gv-gig-songs b[data-link] { cursor: pointer; border-bottom: 1px dotted var(--ink-faint); }
        .gv-gig-songs b[data-link]:hover { color: var(--accent); border-bottom-color: var(--accent); }
        .gv-gig-meta { display: flex; gap: 12px; align-items: baseline; text-align: right; }
        .gv-gig-plays, .gv-gig-set { font-family: var(--serif); font-size: 16px; font-variant-numeric: tabular-nums; white-space: nowrap; }
        .gv-gig-set { color: var(--ink-soft); }
        .gv-gig-meta small { font-family: var(--mono); font-size: 8px; letter-spacing: .1em; text-transform: uppercase; color: var(--ink-faint); margin-left: 4px; }
        /* multi-act night: the collapsed head reads like a gig row, the expanded list nests under
           a rule so a festival stays visibly ONE night rather than dissolving back into the flow */
        .gv-night[data-open="true"] { border-left: 1px solid var(--rule); margin-left: -1px; border-radius: 0; }
        .gv-night-head { cursor: pointer; }
        .gv-night-dots { display: flex; flex-direction: column; gap: 2px; margin-top: 5px; }
        .gv-night-dots i { width: 8px; height: 8px; border-radius: 50%; display: block; }
        .gv-night-act[data-link="true"]:hover { color: var(--accent); }
        .gv-night-sep { color: var(--ink-faint); font-weight: 400; }
        .gv-night-more { font-family: var(--mono); font-size: 10.5px; letter-spacing: .06em; color: var(--accent); font-weight: 400; margin-left: 6px; }
        /* THE UNRAVEL. grid-template-rows 0fr -> 1fr animates to the content's OWN height, so a
           2-act night and a 14-act festival day both open correctly with no measuring and no
           max-height guess that would clip the long ones. The inner element must carry the
           overflow:hidden for the 0fr row to actually clip. */
        .gv-night-unravel { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .42s cubic-bezier(.22,.61,.36,1); }
        .gv-night[data-open="true"] .gv-night-unravel { grid-template-rows: 1fr; }
        .gv-night-unravel > .gv-night-acts { overflow: hidden; min-height: 0; }
        /* closed rows must not be clickable or tab-reachable while they sit at zero height */
        .gv-night-unravel[aria-hidden="true"] { pointer-events: none; }
        /* each act arrives on its own beat — that stagger is what reads as unravelling rather than
           as one block appearing. Index is capped at 11 in the JSX so a long festival day cannot
           run the tail out past the container's own transition. */
        .gv-night-act-row { opacity: 0; transform: translateY(-6px); transition: opacity .3s ease, transform .3s cubic-bezier(.22,.61,.36,1); }
        .gv-night[data-open="true"] .gv-night-act-row { opacity: 1; transform: none; transition-delay: calc(var(--i, 0) * 34ms); }
        @media (prefers-reduced-motion: reduce) {
          .gv-night-unravel, .gv-night-act-row { transition: none; }
          .gv-night[data-open="true"] .gv-night-act-row { transition-delay: 0s; }
        }
        .gv-night-acts { padding-left: 14px; margin-top: 2px; display: grid; gap: 2px; }
        .gv-night-acts .gv-gig-date { display: none; }
        .gv-night-acts .gv-gig { grid-template-columns: 10px 1fr auto; }
        /* festival day: top cross-artist songs you play — the label hedges (no setlist-wide data),
           each song clicks through to its track page */
        .gv-night-live { margin-top: 6px; }   /* link styling now shared, see .gv-gig-songs b[data-link] */
        .gv-night-live-by { color: var(--ink-faint); font-weight: 400; }
        /* year scrub on Still to catch — same control as the Overview map's year slider */
        .gv-years { display: flex; gap: 10px; align-items: center; max-width: 340px; margin: 0 0 12px; }
        .gv-play { font-family: var(--mono); font-size: 11px; letter-spacing: .08em; padding: 5px 11px; border-radius: 999px; border: 1px solid var(--accent); color: var(--accent); background: transparent; cursor: pointer; flex: none; }
        .gv-play[data-on="true"] { background: var(--accent); color: #0c0a08; }
        .gv-slider { flex: 1; min-width: 90px; height: 4px; -webkit-appearance: none; appearance: none; background: var(--bg-3); border-radius: 3px; outline: none; cursor: pointer; }
        .gv-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 15px; height: 15px; border-radius: 50%; background: var(--accent); cursor: pointer; border: 2px solid var(--bg-2); }
        .gv-slider::-moz-range-thumb { width: 15px; height: 15px; border-radius: 50%; background: var(--accent); cursor: pointer; border: 2px solid var(--bg-2); }
        .gv-yrlabel { font-family: var(--mono); font-size: 10px; color: var(--ink-soft); flex: none; min-width: 56px; text-align: right; }
        .gv-foot { margin: 40px 0 20px; font-family: var(--mono); font-size: 10px; color: var(--ink-faint); text-align: center; letter-spacing: .05em; }
        .gv-tour-meta { display: flex; gap: 10px; flex-wrap: wrap; align-items: baseline; margin: -6px 0 14px; }
        /* the row aligns on the baseline, which a segmented control has none worth sharing */
        .gv-tour-seen { margin-left: auto; align-self: center; flex: none; }
        .gv-tour-mkt { font-family: var(--mono); font-size: 10px; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-soft); border: 1px solid var(--rule); border-radius: 999px; padding: 3px 10px; cursor: help; }
        .gv-tour-mkt b { color: var(--accent); }
        .gv-tour-mkt[data-stale="true"] { border-color: oklch(0.62 0.16 45 / .6); color: oklch(0.78 0.14 55); }
        .gv-tour-warn { margin: 2px 0 12px; padding: 10px 14px; border-radius: 8px; font-size: 12.5px; line-height: 1.5;
          color: oklch(0.85 0.06 60); background: oklch(0.6 0.13 55 / .12); border: 1px solid oklch(0.62 0.16 55 / .4); }
        .gv-tour-warn b { color: oklch(0.82 0.15 60); }
        .gv-tour-fetched { font-family: var(--mono); font-size: 9.5px; color: var(--ink-faint); letter-spacing: .05em; }
        .gv-tour { display: grid; gap: 8px; }
        .gv-tour-row { display: grid; grid-template-columns: 22px minmax(190px, 260px) 1fr; gap: 6px 16px; padding: 10px 12px; border: 1px solid var(--rule); border-radius: 8px; align-items: start; }
        .gv-tour-row[data-checked="true"] { border-color: var(--accent-dim); background: var(--accent-bg); }
        .gv-check { display: flex; align-items: center; justify-content: center; padding-top: 3px; cursor: pointer; }
        .gv-check input { width: 15px; height: 15px; accent-color: var(--accent); cursor: pointer; }
        .gv-check-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--rule-2); }
        .gv-tour-a { display: flex; gap: 12px; align-items: center; min-width: 0; }
        .gv-tour-a[data-link="true"] { cursor: pointer; }
        .gv-tour-a[data-link="true"]:hover .gv-tile-name { color: var(--accent); }
        .gv-react { font-family: var(--mono); font-size: 8.5px; letter-spacing: .1em; text-transform: uppercase; color: oklch(0.75 0.16 45); border: 1px solid oklch(0.62 0.16 45 / .5); border-radius: 999px; padding: 2px 7px; margin-left: 6px; flex: none; cursor: help; }
        .gv-tour-ev { display: grid; gap: 3px; min-width: 0; padding-top: 2px; }
        .gv-tour-ev a { display: flex; gap: 10px; align-items: baseline; font-size: 12px; color: var(--ink-soft); text-decoration: none; min-width: 0; }
        .gv-tour-ev a:hover { color: var(--accent); }
        .gv-tour-ev a[data-dead="true"] { pointer-events: none; }
        .gv-tour-d { font-family: var(--mono); font-size: 10.5px; color: var(--ink-faint); white-space: nowrap; flex: none; }
        .gv-tour-w { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .gv-tour-out { flex: none; font-size: 10px; color: var(--ink-faint); }
        .gv-tour-more { font-family: var(--mono); font-size: 9.5px; color: var(--ink-faint); letter-spacing: .06em; }
        .gv-tour-all { margin-top: 12px; font-family: var(--mono); font-size: 10px; letter-spacing: .1em; text-transform: uppercase; background: none; border: 1px solid var(--rule); color: var(--ink-soft); border-radius: 999px; padding: 7px 16px; cursor: pointer; }
        .gv-tour-all:hover { border-color: var(--accent-dim); color: var(--accent); }
        .gv-tour-chip { font-family: var(--mono); font-size: 10px; letter-spacing: .06em; color: var(--accent); border: 1px solid var(--accent-dim); border-radius: 999px; padding: 3px 10px; cursor: pointer; }
        .gv-tour-chip-all { color: var(--ink-faint); border-color: var(--rule); }
        .gv-tour-row[data-hi="true"] { border-color: var(--rule-2); background: var(--bg-2); }
        /* genre filter — legible pills (sits UNDER the map); a real family unfolds its subgenres */
        .gv-casc { margin: 2px 0 12px; }
        .gv-casc-cap { display: inline-flex; align-items: center; gap: 6px; font-family: var(--mono); font-size: 8.5px;
          color: var(--ink-faint); letter-spacing: .1em; text-transform: uppercase; margin-bottom: 7px;
          background: none; border: 0; padding: 2px 0; cursor: pointer; transition: color .15s; }
        .gv-casc-cap:hover { color: var(--ink-soft); }
        .gv-casc-caret { font-size: 9px; line-height: 1; }
        .gv-gpills { display: flex; flex-wrap: wrap; gap: 6px; }
        .gv-gpills-sub { margin-top: 6px; padding-top: 8px; border-top: 1px dashed var(--rule); }
        .gv-subwrap { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .34s cubic-bezier(.22,.61,.36,1); }
        .gv-subwrap[data-open] { grid-template-rows: 1fr; }
        .gv-subwrap > .gv-gpills-sub { overflow: hidden; min-height: 0; }
        .gv-subwrap[aria-hidden="true"] { pointer-events: none; }
        /* the pills arrive in sequence — the stagger is what makes it read as unfolding rather than
           as a block being revealed. nth-child rather than a CSS var so Pill needs no new prop; past
           the tenth they share the last delay instead of trailing off the end of the container's own
           transition. */
        .gv-subwrap .gv-gpill { opacity: 0; transform: translateY(-4px);
          transition: opacity .24s ease, transform .24s cubic-bezier(.22,.61,.36,1); }
        .gv-subwrap[data-open] .gv-gpill { opacity: 1; transform: none; }
        .gv-subwrap[data-open] .gv-gpill:nth-child(1) { transition-delay: 0ms; }
        .gv-subwrap[data-open] .gv-gpill:nth-child(2) { transition-delay: 26ms; }
        .gv-subwrap[data-open] .gv-gpill:nth-child(3) { transition-delay: 52ms; }
        .gv-subwrap[data-open] .gv-gpill:nth-child(4) { transition-delay: 78ms; }
        .gv-subwrap[data-open] .gv-gpill:nth-child(5) { transition-delay: 104ms; }
        .gv-subwrap[data-open] .gv-gpill:nth-child(6) { transition-delay: 130ms; }
        .gv-subwrap[data-open] .gv-gpill:nth-child(7) { transition-delay: 156ms; }
        .gv-subwrap[data-open] .gv-gpill:nth-child(n+8) { transition-delay: 182ms; }
        @media (prefers-reduced-motion: reduce) {
          .gv-subwrap, .gv-subwrap .gv-gpill { transition: none; }
          .gv-subwrap[data-open] .gv-gpill { transition-delay: 0s; }
        }
        .gv-gpill { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px;
          border: 1px solid var(--rule); background: none; color: var(--ink-soft); cursor: pointer;
          font-size: 11.5px; transition: border-color .15s, opacity .15s, background .15s; }
        .gv-gpill-dot { width: 8px; height: 8px; border-radius: 2px; background: oklch(0.62 0.15 var(--gh)); flex: none; }
        .gv-gpill-n { font-family: var(--mono); font-size: 9px; color: var(--ink-faint); }
        .gv-gpill[data-sm="true"] { font-size: 10.5px; padding: 3px 9px; }
        .gv-gpill[data-dim="true"] { opacity: .42; }
        .gv-gpill:hover { opacity: 1; border-color: var(--rule-2); }
        .gv-gpill[data-on="true"] { border-color: oklch(0.6 0.14 var(--gh)); background: oklch(0.6 0.14 var(--gh) / .14); color: var(--ink); }
        .gv-gpill[data-on="true"] .gv-gpill-n { color: var(--ink-soft); }
        /* event map + calendar card */
        .gv-tmap-card { padding: 10px 12px 8px; margin-bottom: 10px; }
        .gv-tmap-wrap { position: relative; }
        .gv-tmap-svgwrap { position: relative; }
        .gv-tmap { display: block; width: 100%; height: auto; }
        .gv-tmap-zoom { position: absolute; top: 8px; right: 8px; display: flex; flex-direction: column; gap: 4px; }
        .gv-tmap-zoom button { width: 26px; height: 26px; border-radius: 6px; border: 1px solid var(--rule-2);
          background: var(--panel); color: var(--ink-soft); cursor: pointer; font-size: 15px; line-height: 1;
          display: flex; align-items: center; justify-content: center; }
        .gv-tmap-zoom button:hover { color: var(--accent); border-color: var(--accent-dim); }
        .gv-tmap-empty { padding: 60px 0; text-align: center; color: var(--ink-faint); font-size: 11px; }
        /* NB: no fill here — a CSS fill would override the per-dot genre color set inline */
        /* r and the group opacity join the transition (Fuad 2026-09-14). The r curve is the overview
           map's own IDLE_TR — r .6s cubic-bezier(.3,.8,.3,1) — so a genre click reads the same on
           both maps: bubbles swell and shrink to the new counts instead of cutting. The fisheye in
           useTourMapNav overrides transition inline while the cursor is engaged and restores it on
           reset, so this only governs the idle state. */
        .gv-tmap-hit { transition: opacity .42s cubic-bezier(.3,.8,.3,1); }
        .gv-tmap-dot { fill-opacity: .34; stroke-width: var(--sw0); cursor: pointer; transition: r .6s cubic-bezier(.3,.8,.3,1), fill .5s, fill-opacity .12s, stroke-width .12s; }
        .gv-tmap-dot:hover, .gv-tmap-dot[data-on="true"] { fill-opacity: .72; stroke-width: var(--sw1); }
        /* a city with nothing under the current filter stays mounted at r=0 so it can grow back */
        .gv-tmap-dot[data-empty="true"] { pointer-events: none; }
        @media (prefers-reduced-motion: reduce) {
          .gv-tmap-hit, .gv-tmap-dot { transition: none; }
        }
        .gv-tmap-foot { display: flex; align-items: center; gap: 10px; margin: 4px 2px 10px; flex-wrap: wrap; }
        .gv-tmap-hint { font-size: 8.5px; color: var(--ink-faint); letter-spacing: .05em; flex: 1; min-width: 160px; }
        .gv-routes-btn { flex: none; font-family: var(--mono); font-size: 9.5px; letter-spacing: .06em; padding: 4px 10px;
          border-radius: 999px; border: 1px solid var(--rule); background: none; color: var(--ink-soft); cursor: pointer; }
        .gv-routes-btn:hover { border-color: var(--accent-dim); color: var(--accent); }
        .gv-routes-btn[data-on="true"] { border-color: var(--accent-dim); color: var(--accent); background: var(--accent-bg); }
        .gv-tmap-hint b { color: var(--ink-soft); }
        /* calendar strip — D/W/M buckets, bottom-aligned bars */
        .gv-tcal-head { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
        .gv-tcal-hint { flex: 1; font-size: 8.5px; color: var(--ink-faint); letter-spacing: .05em; }
        .gv-tcal-hint em { font-style: normal; color: var(--accent); cursor: pointer; }
        .gv-tcal-hint b { color: var(--ink-soft); }
        .gv-tcal-strip { display: flex; align-items: flex-end; gap: 1px; overflow-x: auto; scrollbar-width: thin; padding-bottom: 2px; }
        .gv-tcal-col { flex: 1 0 8px; min-width: 8px; display: flex; flex-direction: column; align-items: stretch; justify-content: flex-end; cursor: pointer; }
        .gv-tcal-col i { display: block; background: var(--accent); opacity: .55; border-radius: 2px 2px 0 0; transition: opacity .15s; }
        .gv-tcal-col i[data-z="true"] { background: var(--bg-3); opacity: 1; }
        .gv-tcal-col:hover i { opacity: 1; }
        .gv-tcal-col[data-on="true"] i { opacity: 1; outline: 1px solid var(--ink); }
        .gv-tcal-lbl { font-family: var(--mono); font-size: 7.5px; color: var(--ink-faint); white-space: nowrap; height: 12px; overflow: visible; margin-top: 2px; }
        /* the ledger */
        .gv-led-cols { display: grid; grid-template-columns: 1fr 1fr; grid-template-areas: "gone caught" "chance chance"; gap: var(--gap); margin-top: 18px; }
        .gv-led-col.gv-led-gone { grid-area: gone; }
        .gv-led-col.gv-led-caught { grid-area: caught; }
        .gv-led-col.gv-led-chance { grid-area: chance; }
        @media (max-width: 560px) { .gv-led-cols { grid-template-columns: 1fr; grid-template-areas: "gone" "caught" "chance"; } }
        .gv-led-h { font-family: var(--mono); font-size: 9.5px; letter-spacing: .14em; text-transform: uppercase; color: var(--ink-faint); margin-bottom: 10px; }
        .gv-led-chip { display: inline-flex; align-items: baseline; gap: 5px; margin: 0 6px 7px 0; padding: 4px 10px; border: 1px solid var(--rule); border-radius: 999px; font-size: 11.5px; color: var(--ink-soft); }
        .gv-led-chip[data-link="true"] { cursor: pointer; }
        .gv-led-chip[data-link="true"]:hover { color: var(--accent); border-color: var(--accent-dim); }
        .gv-led-chip small { font-family: var(--mono); font-size: 8.5px; color: var(--ink-faint); }
        /* time-at-concerts caption */
        .gv-crowd-cap { margin-top: 10px; font-family: var(--mono); font-size: 9.5px; letter-spacing: .05em; color: var(--ink-faint); }
        /* live bucket list — a numbered queue */
        .gv-bucket { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 8px; }
        .gv-bucket-row { display: flex; gap: 10px; align-items: center; padding: 8px 10px; border: 1px solid var(--rule); border-radius: 6px; transition: border-color .15s; }
        .gv-bucket-row[data-link="true"] { cursor: pointer; }
        .gv-bucket-row[data-link="true"]:hover { border-color: var(--rule-2); }
        .gv-bucket-n { font-family: var(--serif); font-size: 15px; color: var(--ink-faint); width: 20px; flex: none; text-align: right; font-variant-numeric: tabular-nums; }
        /* concert map — city bubbles on the shared equirectangular projection */
        .gv-cmap-wrap { margin: 2px 0 16px; }
        .gv-cmap { display: block; width: 100%; height: auto; border: 1px solid var(--rule); border-radius: 8px; background: var(--panel); overflow: hidden; }
        .gv-cmap-empty { padding: 50px 0; text-align: center; color: var(--ink-faint); font-size: 11px; border: 1px solid var(--rule); border-radius: 8px; }
        .gv-cmap-dot { transition: opacity .2s; }  /* no transform transition — attr-driven transforms + transitions lag/no-op across browsers; rAF already paces it */
        .gv-cmap { cursor: crosshair; }
        .gv-cmap-c { fill-opacity: .78; transition: fill-opacity .15s; }
        .gv-cmap-c:hover { fill-opacity: 1; }
        .gv-cmap-hoverline { font-size: 9.5px; color: var(--ink-faint); letter-spacing: .08em; margin-bottom: 5px; min-height: 13px; }
        .gv-cmap-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
        .gv-cmap-chip { display: inline-flex; align-items: baseline; gap: 6px; padding: 4px 10px; border-radius: 999px;
          border: 1px solid var(--rule); background: none; color: var(--ink-soft); cursor: pointer; font-size: 11.5px; transition: border-color .15s, opacity .15s, background .15s; }
        .gv-cmap-chip span { font-family: var(--mono); font-size: 9px; color: var(--ink-faint); }
        .gv-cmap-chip:hover { border-color: var(--rule-2); }
        .gv-cmap-chip[data-on="false"] { opacity: .45; text-decoration: line-through; }
        .gv-cmap-chip[data-on="true"] { border-color: var(--accent-dim); background: var(--accent-bg); color: var(--ink); }
        .gv-cmap-reset { color: var(--accent); border-color: var(--accent-dim); }
        @media (max-width: 700px) {
          .gv-stats { grid-template-columns: 1fr 1fr; }
          .gv-tiles { grid-template-columns: 1fr; }
          .gv-city { grid-template-columns: 110px 1fr 30px; }
          .gv-gig { grid-template-columns: 64px 8px 1fr; }
          .gv-tour-row { grid-template-columns: 22px 1fr; }
          .gv-tour-row .gv-tour-ev { grid-column: 2; }
          .gv-gig-meta { grid-column: 3; justify-content: flex-start; margin-top: 4px; }
          .gv-gig-date { font-size: 10px; }
          /* nested night rows drop the (hidden) date column, so their meta wraps under col 2 */
          .gv-night-acts .gv-gig { grid-template-columns: 8px 1fr; }
          .gv-night-acts .gv-gig-meta { grid-column: 2; }
          .gv-night-acts { padding-left: 8px; }
        }
      `}</style>
    </div>
  );
}

// ════════════════════════ SEARCH ════════════════════════
function SearchOverlay({ open, onClose, go }) {
  const R = window.ROTATION;
  const [q, setQ] = React.useState("");
  const [ready, setReady] = React.useState(!!window.ROTATION_SEARCH);
  const [mediaReady, setMediaReady] = React.useState(!!window.ROTATION_MEDIA);
  const [sel, setSel] = React.useState(null);
  // mode: "names" (artists/songs/albums by title) | "theme" (songs by what they're ABOUT,
  // over the llm-about blurbs). A toggle keeps the two intents from muddling (Fuad, 2026-07-08).
  const [mode, setMode] = React.useState("names");
  // theme search no longer pulls the whole llm-about blob: it loads the inverted theme index
  // (about/index.js), matches tokens → entry keys, then lazy-loads only the GIST shards holding
  // the matched keys. `indexReady` gates the index; `shardTick` bumps as matched shards land.
  const [indexReady, setIndexReady] = React.useState(!!window.ROTATION_ABOUT_INDEX);
  const [shardTick, bumpShards] = React.useReducer(x => x + 1, 0);
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    if (!open) return;
    setQ(""); setSel(null); setMode("names");
    // NB: still fire `done` when the script is ALREADY loaded — another view (the Overview map,
    // calendar, track pages…) may have pulled media-index.js in first, and if we skip the callback
    // the ready flag never flips, leaving slugMap null and Theme search stuck on "reading your
    // library…" forever (Fuad 2026-07-19).
    const load = (src, has, done) => { if (window[has]) { done && done(); return; } const s = document.createElement("script"); s.src = src; s.onload = done; document.head.appendChild(s); };
    load("search-index.js", "ROTATION_SEARCH", () => setReady(true));
    load("media-index.js", "ROTATION_MEDIA", () => setMediaReady(true));   // albums + songs (big, lazy)
    setTimeout(() => inputRef.current && inputRef.current.focus(), 40);
  }, [open]);

  // theme mode pulls in the inverted theme INDEX (about/index.js) on demand — small, not the
  // whole reads blob. Dev fallback (index 404s) loads llm-about.js whole and R.loadAboutIndex's
  // onerror synthesises the blob; either way ROTATION_ABOUT_INDEX or ROTATION_LLM_ABOUT is present.
  React.useEffect(() => {
    if (mode !== "theme") return;
    const R = window.ROTATION;
    if (window.ROTATION_ABOUT_INDEX) { setIndexReady(true); return; }
    if (R && R.loadAboutIndex) R.loadAboutIndex(() => setIndexReady(true));
  }, [mode]);

  // slug-keyed track lookup (artistSlug~trackSlug → {title, artist, plays}) so a blurb key can be
  // resolved to a display row. Built ONCE when the media index lands. The blurb keys are ~7k, so
  // we index only what we need to join against.
  const slugMap = React.useMemo(() => {
    const M = window.ROTATION_MEDIA; if (!M) return null;
    const map = {};
    for (const t of M.tracks) {
      const k = R.slug(M.artists[t[1]]) + "~" + R.slug(t[0]);
      if (!(k in map) || t[2] > map[k].plays) map[k] = { title: t[0], artist: M.artists[t[1]], plays: t[2] };
    }
    return map;
  }, [mediaReady]);

  // accent-insensitive so "americain" finds "à l'américaine", "bjork" finds "Björk", etc.
  //
  // NFD ONLY GETS YOU HALF WAY (Fuad 2026-09-01: "rot should be searchable by just using o instead
  // of ø"). Decomposition splits a base letter from a COMBINING mark — ö becomes o + U+0308, so the
  // strip works. But ø, ł, đ, æ, þ and friends are single indivisible codepoints: the stroke or
  // ligature is part of the glyph, not a mark hung off it, so NFD leaves them untouched and they
  // survive the replace. "rot" therefore never matched "røt".
  // 34 artists were affected, and Polish ł mattered more than ø: Sokół, Słoń, Dawid Podsiadło,
  // Michał Wieczorek and Dwa Sławy were all unreachable by their plain-ASCII spelling.
  // Two-character expansions (æ→ae, ß→ss) are correct for search: the needle is folded the same
  // way, so typing either "aether" or "æther" finds Æther Realm.
  const STROKE_FOLD = { "ø": "o", "ł": "l", "đ": "d", "ð": "d", "þ": "th", "æ": "ae", "œ": "oe",
    "ß": "ss", "ħ": "h", "ŧ": "t", "ı": "i", "ĸ": "k", "ŋ": "n", "ſ": "s" };
  const deAccent = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[øłđðþæœßħŧıĸŋſ]/g, (c) => STROKE_FOLD[c] || c);

  // also match the romanised form of kana names, so "midori" finds ミドリ, "boris" finds ボリス
  const romaMatch = (name, needle) => KANA_RE.test(name) && deAccent(kanaToRomaji(name)).includes(needle);

  const results = React.useMemo(() => {
    if (!ready || !q.trim()) return [];
    const needle = deAccent(q.trim());
    const starts = [], contains = [];
    for (const row of window.ROTATION_SEARCH) {
      const lo = deAccent(row[0]);
      if (lo.startsWith(needle)) starts.push(row);
      else if (lo.includes(needle) || romaMatch(row[0], needle)) contains.push(row);
      if (starts.length > 60) break;
    }
    return starts.concat(contains).slice(0, 30);
  }, [q, ready]);

  // songs + albums by title (the lazy media index; rows = [title, artistIdx, plays], sorted by plays)
  const media = React.useMemo(() => {
    const M = window.ROTATION_MEDIA;
    if (!q.trim() || !M) return { tracks: [], albums: [] };
    const needle = deAccent(q.trim());
    const scan = (rows) => { const out = []; for (const r of rows) { if (deAccent(r[0]).includes(needle) || romaMatch(r[0], needle)) { out.push(r); if (out.length >= 10) break; } } return out; };
    return { tracks: scan(M.tracks), albums: scan(M.albums) };
  }, [q, mediaReady]);

  // THEME search — songs by what they're about. Now index-driven: the inverted index
  // (about/index.js) maps tokens → entry-key ids; we resolve the query's words to candidate keys,
  // then lazy-load ONLY the gist shards holding them (R.loadAboutFor) and rank for display. A hit
  // on a token that STARTS with the needle scores as a whole-word match. Dev fallback: if the index
  // never loaded but the whole blob did (R.loadAboutIndex synthesised it), scan the blob directly.
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // 1) resolve query → candidate entry keys via the index (or blob-scan fallback).
  const themeMatch = React.useMemo(() => {
    if (mode !== "theme" || !q.trim()) return null;
    const needle = deAccent(q.trim());
    if (needle.length < 3) return null;
    const IDX = window.ROTATION_ABOUT_INDEX;
    if (IDX && IDX.tok) {
      // words of the query (len≥3). For each word, union all index tokens that CONTAIN it (keeps
      // substring/prefix typing). Multi-word queries AND the per-word id sets. An id whose match
      // came from a token EQUAL to a word is a true whole-word hit → ranks above substring-only.
      const words = needle.split(/[^a-z0-9]+/).filter(w => w.length >= 3);
      if (!words.length) return { keys: [], needle, wbIds: new Set() };
      let acc = null;
      const wbIds = new Set();
      for (const w of words) {
        const hit = new Set();
        for (const tok in IDX.tok) {
          if (tok.indexOf(w) < 0) continue;
          const exact = tok === w;
          for (const id of IDX.tok[tok]) { hit.add(id); if (exact) wbIds.add(id); }
        }
        acc = acc === null ? hit : new Set([...acc].filter(id => hit.has(id)));
        if (!acc.size) break;
      }
      const keys = [], wbKeys = new Set();
      for (const id of (acc || [])) { const k = IDX.keys[id]; if (!k) continue; keys.push(k); if (wbIds.has(id)) wbKeys.add(k); }
      return { keys, needle, wbKeys };
    }
    // fallback: whole-blob scan (dev, no index built)
    const LLM = window.ROTATION_LLM_ABOUT;
    if (!LLM) return null;
    const keys = [];
    for (const key in LLM) {
      const e = LLM[key];
      const text = deAccent([e.haiku, e.sonnet, e.opus, e.fable, e.web].filter(Boolean).join(" · "));
      if (text.includes(needle)) keys.push(key);
    }
    return { keys, needle, wbKeys: null };   // null → per-entry whole-word test below (blob path)
  }, [q, mode, indexReady]);

  // 2) load the gist shards holding the matched keys (so their display text is available).
  React.useEffect(() => {
    const R = window.ROTATION;
    if (!themeMatch || !themeMatch.keys.length || !R || !R.loadAboutFor) return;
    R.loadAboutFor(themeMatch.keys, bumpShards);
  }, [themeMatch]);

  // 3) build ranked display rows from loaded gists (or the blob, in dev). shardTick re-runs this
  // as matched shards land. Whole-word hit ranks above a bare substring, then by plays.
  const themeResults = React.useMemo(() => {
    if (!themeMatch || !slugMap) return [];
    const R = window.ROTATION;
    const { needle, keys, wbKeys } = themeMatch;
    const wb = new RegExp("\\b" + esc(needle));
    const out = [];
    for (const key of keys) {
      const t = slugMap[key]; if (!t) continue;
      // prefer a loaded gist read for the visible blurb; fall back to the blob if that's the path.
      const g = R && R.aboutGist ? R.aboutGist(key) : null;
      const blob = window.ROTATION_LLM_ABOUT && window.ROTATION_LLM_ABOUT[key];
      const blurb = (g && (g.haiku || g.web)) || (blob && (blob.fable || blob.opus || blob.sonnet || blob.haiku || blob.web)) || "";
      // whole-word score: index path flags exact-token hits per key; blob path re-tests the text.
      let score = 0;
      if (wbKeys) score = wbKeys.has(key) ? 1 : 0;
      else if (blob) score = wb.test(deAccent([blob.haiku, blob.sonnet, blob.opus, blob.fable, blob.web].filter(Boolean).join(" · "))) ? 1 : 0;
      out.push({ key, title: t.title, artist: t.artist, plays: t.plays, blurb, score });
    }
    out.sort((a, b) => (b.score - a.score) || (b.plays - a.plays));
    return out.slice(0, 40);
  }, [themeMatch, slugMap, indexReady, shardTick]);

  if (!open) return null;

  const resolveId = (name) => { const s = R.slug(name); if (R.byId[s]) return s; const a = R.idForName && R.idForName(name); if (a) return a; if (R.expById && R.expById[s]) return s; return null; };
  const pick = (row) => {
    const id = resolveId(row[0]);   // kept OR explore (mini) page — only fall back to the blurb if neither
    if (id) { onClose(); go("artist", id); }
    else setSel(sel && sel[0] === row[0] ? null : row);
  };
  // song row → the track's own page (audio DNA + your play history), works for any song
  const pickMedia = (artist, title) => { onClose(); go("track", R.slug(artist) + "~" + R.slug(title)); };
  // album row → the album's own page (works for any album)
  const pickAlbum = (artist, title) => { onClose(); go("album", R.slug(artist) + "~" + R.slug(title)); };

  // theme mode is "ready" once the inverted index is loaded (or, in dev, the whole blob was
  // synthesised as a fallback). Either satisfies the query path.
  const themeReady = indexReady || !!window.ROTATION_ABOUT_INDEX || !!window.ROTATION_LLM_ABOUT;

  return (
    <div className="se-veil" onClick={onClose}>
      <div className="se-panel" onClick={e => e.stopPropagation()}>
        <div className="se-bar">
          <span className="se-glyph">⌕</span>
          <input ref={inputRef} value={q} onChange={e => { setQ(e.target.value); setSel(null); }}
            placeholder={mode === "theme"
              ? (themeReady ? "what are they about — grief, defiance, isolation…" : "loading the reads…")
              : (ready ? "search artists, albums & songs you've played…" : "loading your library…")}
            spellCheck={false} />
          <button className="se-x" onClick={onClose}>esc</button>
        </div>
        <div className="se-modes">
          <button data-on={mode === "names"} onClick={() => { setMode("names"); setSel(null); }}>Names</button>
          <button data-on={mode === "theme"} onClick={() => { setMode("theme"); setSel(null); }}>Themes</button>
          <span className="se-modehint">{mode === "theme" ? "songs by what they're about" : "artists · albums · songs"}</span>
        </div>
        {mode === "theme" && q.trim() && (
          <div className="se-results">
            {themeResults.length === 0 && themeReady && slugMap && q.trim().length >= 3 &&
              <div className="se-empty">No songs read as being about “{q.trim()}”.</div>}
            {q.trim().length < 3 && <div className="se-loading">keep typing…</div>}
            {(!themeReady || !slugMap) && q.trim().length >= 3 && <div className="se-loading">reading your library…</div>}
            {themeResults.length > 0 && <div className="se-group">Songs about “{q.trim()}” · {themeResults.length}</div>}
            {themeResults.map((r) => (
              <div key={"t-" + r.key} className="se-row se-themerow" onClick={() => pickMedia(r.artist, r.title)}>
                <GenCover hue={hueOfName(r.artist)} name={r.artist} size={36} radius={3} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="se-name">{r.title} <span className="se-sub" style={{ display: "inline", marginLeft: 4 }}>— {r.artist}</span></div>
                  <div className="se-blurb">{r.blurb}</div>
                </div>
                <span className="se-plays">{fmt(r.plays)}<small>plays</small></span>
              </div>
            ))}
          </div>
        )}
        {mode === "names" && q.trim() && (() => {
          const mArt = (window.ROTATION_MEDIA && window.ROTATION_MEDIA.artists) || [];
          const nothing = ready && mediaReady && results.length === 0 && media.tracks.length === 0 && media.albums.length === 0;
          return (
          <div className="se-results">
            {nothing && <div className="se-empty">Nothing. You've truly never played “{q.trim()}”.</div>}

            {results.length > 0 && <div className="se-group">Artists</div>}
            {results.map(row => {
              const [name, plays, first, last, peakYear, peakPlays] = row;
              const inLib = !!R.byId[R.slug(name)];
              const isSel = sel && sel[0] === name;
              return (
                <div key={"a-" + name}>
                  <div className="se-row" onClick={() => pick(row)}>
                    <GenCover hue={hueOfName(name)} name={name} size={36} radius={3} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="se-name">{name} {inLib && <span className="se-tag">profiled</span>}</div>
                      <div className="se-sub">{first.slice(0, 4)} — {last.slice(0, 4)} · peak {peakYear}</div>
                    </div>
                    <span className="se-plays">{fmt(plays)}<small>plays</small></span>
                  </div>
                  {isSel && (
                    <div className="se-story">
                      You first played <b>{name}</b> on {fmtDate(first)}, last on {fmtDate(last)}.
                      {" "}{fmt(plays)} plays in total — the deepest year was <b>{peakYear}</b> with {fmt(peakPlays)} of them.
                    </div>
                  )}
                </div>
              );
            })}

            {/* section order is Artists → Albums → Songs (Fuad 2026-08-13; songs used to sit second) */}
            {media.albums.length > 0 && <div className="se-group">Albums</div>}
            {media.albums.map((row, i) => { const [title, ai, plays] = row, name = mArt[ai] || "", cover = row[6] || ""; return (
              <div key={"al-" + i} className="se-row" onClick={() => pickAlbum(name, title)}>
                <GenCover hue={hueOfName(name)} name={title} image={cover} thumb={cover} size={36} radius={3} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="se-name">{title}</div>
                  <div className="se-sub">{name}</div>
                </div>
                <span className="se-plays">{fmt(plays)}<small>plays</small></span>
              </div>); })}

            {media.tracks.length > 0 && <div className="se-group">Songs</div>}
            {media.tracks.map(([title, ai, plays], i) => { const name = mArt[ai] || ""; return (
              <div key={"s-" + i} className="se-row" onClick={() => pickMedia(name, title)}>
                <GenCover hue={hueOfName(name)} name={name} size={36} radius={3} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="se-name">{title}</div>
                  <div className="se-sub">{name}</div>
                </div>
                <span className="se-plays">{fmt(plays)}<small>plays</small></span>
              </div>); })}

            {results.length > 0 && !mediaReady && <div className="se-loading">searching songs & albums…</div>}
          </div>
          );
        })()}
      </div>
      <style>{`
        .se-veil { position: fixed; inset: 0; z-index: 900; background: rgba(8,7,12,.78);
          backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
          display: flex; justify-content: center; align-items: flex-start; padding: 12vh 18px 18px;
          animation: rFade .18s ease; }
        .se-panel { width: 100%; max-width: 600px; background: var(--panel); border: 1px solid var(--rule-2);
          border-radius: 10px; overflow: hidden; box-shadow: 0 30px 80px rgba(0,0,0,.55); }
        .se-bar { display: flex; align-items: center; gap: 12px; padding: 16px 18px; }
        .se-glyph { font-size: 18px; color: var(--ink-faint); }
        .se-bar input { flex: 1; background: transparent; border: 0; outline: 0; color: var(--ink);
          font-family: var(--sans); font-size: 17px; }
        .se-bar input::placeholder { color: var(--ink-faint); }
        .se-modes { display: flex; align-items: center; gap: 6px; padding: 0 18px 12px; }
        .se-modes button { font-family: var(--mono); font-size: 9.5px; letter-spacing: .1em; text-transform: uppercase;
          padding: 5px 12px; border-radius: 999px; border: 1px solid var(--rule); background: transparent;
          color: var(--ink-faint); cursor: pointer; transition: color .12s, border-color .12s; }
        .se-modes button:hover { color: var(--ink); }
        .se-modes button[data-on="true"] { border-color: var(--accent-dim); color: var(--accent); }
        .se-modehint { margin-left: auto; font-family: var(--mono); font-size: 8.5px; letter-spacing: .06em;
          text-transform: uppercase; color: var(--ink-faint); }
        .se-blurb { font-family: var(--serif); font-size: 12px; line-height: 1.45; color: var(--ink-soft);
          margin-top: 3px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .se-themerow { align-items: flex-start; }
        .se-themerow .se-plays { margin-top: 2px; }
        .se-x { font-family: var(--mono); font-size: 9px; letter-spacing: .12em; text-transform: uppercase;
          background: var(--bg-3); color: var(--ink-faint); border: 1px solid var(--rule); border-radius: 5px;
          padding: 5px 8px; cursor: pointer; }
        .se-results { max-height: 56vh; overflow-y: auto; border-top: 1px solid var(--rule); padding: 8px; }
        .se-group { font-family: var(--mono); font-size: 8.5px; letter-spacing: .16em; text-transform: uppercase;
          color: var(--ink-faint); padding: 10px 10px 4px; }
        .se-group:first-child { padding-top: 4px; }
        .se-loading { font-family: var(--mono); font-size: 10px; color: var(--ink-faint); padding: 10px; text-align: center; }
        .se-empty { padding: 22px 14px; font-family: var(--serif); font-style: italic; color: var(--ink-soft); }
        .se-row { display: flex; gap: 12px; align-items: center; padding: 9px 10px; border-radius: 6px; cursor: pointer; }
        .se-row:hover { background: var(--bg-3); }
        .se-name { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .se-tag { font-family: var(--mono); font-size: 8px; letter-spacing: .12em; text-transform: uppercase;
          color: var(--accent); border: 1px solid var(--accent-dim); border-radius: 4px; padding: 1.5px 5px; margin-left: 7px;
          vertical-align: 2px; }
        .se-sub { font-family: var(--mono); font-size: 10px; color: var(--ink-faint); margin-top: 2px; }
        .se-plays { font-family: var(--serif); font-size: 17px; font-variant-numeric: tabular-nums; flex: none; }
        .se-plays small { font-family: var(--mono); font-size: 8px; letter-spacing: .1em; text-transform: uppercase;
          color: var(--ink-faint); margin-left: 4px; }
        .se-story { margin: 2px 10px 10px 58px; padding: 12px 14px; background: var(--accent-bg);
          border-radius: 6px; font-family: var(--serif); font-size: 13.5px; line-height: 1.55; color: var(--ink-soft); }
        .se-story b { color: var(--ink); font-weight: 600; }
      `}</style>
    </div>
  );
}

Object.assign(window, { StoriesView, SearchOverlay });
