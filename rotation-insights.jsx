// rotation-insights.jsx — a small dynamic-insight engine for the Overview.
//
// Each provider inspects the data (build history in window.ROTATION + the daily live snapshot in
// window.ROTATION_LIVE) and either returns null (nothing interesting today) or a scored insight
// descriptor. The engine ranks every provider's output, de-dupes by category, and the Overview
// renders the top few — so the feed shifts day to day on its own (a milestone surfaces as it nears,
// an anniversary climbs as it approaches, otherwise gentle evergreen facts fill the slots).
//
// A descriptor is data-only so every card renders consistently:
//   { id, category, score 0–1, label, meta?, big, bigUnit?, sub?, note?, accent?, onClick? }
// Richer providers (on-this-day, week-in-review, mood, top-of-year) plug into the same PROVIDERS
// array later, fed by an expanded live sync + a couple of build exports.

const _fmtN = (n) => (typeof fmt === "function" ? fmt(n) : Number(n).toLocaleString("en-US"));
const _liveTotal = () => (window.ROTATION_LIVE && window.ROTATION_LIVE.total) || (window.ROTATION.TOTALS.scrobbles);
const _nextThreshold = (n, steps) => { for (const s of steps) if (s > n) return s; const top = steps[steps.length - 1]; return Math.ceil((n + 1) / top) * top; };
// stable per-day jitter so evergreen cards rotate across days without flickering within a day
const _hash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = (((h << 5) + h) ^ s.charCodeAt(i)) >>> 0; return h; };
const _dayKey = (now) => `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}`;
const _jitter = (id, now) => (_hash(id + _dayKey(now)) % 1000) / 1000 * 0.06;

const PROVIDERS = [
  // ── anniversary of your first scrobble — climbs as it nears, hidden the rest of the year ──
  (ctx) => {
    const since = ctx.R.TOTALS.since; if (!since) return null;
    const start = new Date(since + "T00:00:00Z");
    const m = start.getUTCMonth(), d = start.getUTCDate(), y0 = start.getUTCFullYear();
    const today = Date.UTC(ctx.now.getUTCFullYear(), ctx.now.getUTCMonth(), ctx.now.getUTCDate());
    let anniv = Date.UTC(ctx.now.getUTCFullYear(), m, d);
    if (anniv < today) anniv = Date.UTC(ctx.now.getUTCFullYear() + 1, m, d);
    const days = Math.round((anniv - today) / 86400e3);
    if (days > 50) return null;
    const years = new Date(anniv).getUTCFullYear() - y0;
    const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return {
      id: "anniv", category: "anniversary", score: 0.6 + 0.38 * (1 - days / 50), accent: true,
      label: "Anniversary", big: years + " yr" + (years !== 1 ? "s" : ""),
      bigUnit: days === 0 ? "— today" : `in ${days} day${days !== 1 ? "s" : ""}`,
      sub: `scrobbling since ${d} ${MON[m]} ${y0}`,
      note: days === 0 ? "Happy listening-day." : `${years} years of this, almost to the day.`,
    };
  },

  // ── next round scrobble total ──
  (ctx) => {
    const total = _liveTotal();
    const next = Math.ceil((total + 1) / 5000) * 5000, away = next - total;
    if (away > 5000) return null;
    return {
      id: "scrob-mile", category: "milestone", score: 0.5 + 0.46 * (1 - away / 5000), accent: true,
      label: "Next milestone", big: _fmtN(away), bigUnit: `from ${_fmtN(next)}`,
      sub: `${_fmtN(total)} scrobbles and counting`,
      note: away < 200 ? "You'll cross it any day now." : null,
    };
  },

  // ── a top artist about to tip over a round play count ──
  (ctx) => {
    const steps = [50, 100, 250, 500, 1000, 1500, 2000, 3000, 5000, 7500, 10000, 15000];
    let best = null;
    for (const a of ctx.R.ARTISTS.slice(0, 80)) {
      const thr = _nextThreshold(a.plays, steps), away = thr - a.plays;
      if (away <= 0) continue;
      if (!best || away < best.away) best = { a, thr, away };
    }
    if (!best || best.away > 40) return null;
    return {
      id: "artist-mile", category: "artist-milestone", score: 0.5 + 0.46 * (1 - best.away / 40), accent: true,
      label: "About to tip over", meta: best.a.name, onClick: () => ctx.go("artist", best.a.id),
      big: _fmtN(best.away), bigUnit: `from ${_fmtN(best.thr)}`, sub: best.a.name.toLowerCase(),
      note: `${best.a.name} is closing in on ${_fmtN(best.thr)} plays.`,
    };
  },

  // ── distinct-artist count nearing a round number ──
  (ctx) => {
    const n = ctx.R.TOTALS.artists, next = Math.ceil((n + 1) / 500) * 500, away = next - n;
    if (away > 60) return null;
    return {
      id: "distinct-mile", category: "milestone2", score: 0.44 + 0.4 * (1 - away / 60),
      label: "Distinct artists", meta: "explore", onClick: () => ctx.go("explore"),
      big: _fmtN(away), bigUnit: `from ${_fmtN(next)}`, sub: `${_fmtN(n)} artists in rotation`,
    };
  },

  // ── evergreen: how much of everything is your #1 ──
  (ctx) => {
    const a = ctx.R.ARTISTS[0]; if (!a) return null;
    const share = a.plays / ctx.R.TOTALS.scrobbles * 100;
    return {
      id: "top-share", category: "funfact", score: 0.34 + _jitter("top-share", ctx.now),
      label: "Most played", meta: a.name, onClick: () => ctx.go("artist", a.id),
      big: share.toFixed(1) + "%", bigUnit: "of all plays", sub: a.name.toLowerCase(),
      note: `${a.name} alone — ${_fmtN(a.plays)} plays.`,
    };
  },

  // ── evergreen: are you exploring or settling in ──
  (ctx) => {
    const dr = ctx.R.TOTALS.discoveryRate; if (dr == null) return null;
    const pct = Math.round(dr * 100);
    return {
      id: "disc-rate", category: "funfact2", score: 0.32 + _jitter("disc-rate", ctx.now),
      label: "Discovery", big: pct + "%", bigUnit: "recently new",
      sub: "share of plays from new artists",
      note: pct > 15 ? "You're in a discovery phase." : "Deep in the comfort zone lately.",
    };
  },

  // ── evergreen: average daily intake ──
  (ctx) => {
    const pd = ctx.R.TOTALS.perDay; if (pd == null) return null;
    return {
      id: "per-day", category: "funfact3", score: 0.3 + _jitter("per-day", ctx.now),
      label: "Daily intake", big: pd, bigUnit: "plays / day",
      sub: "lifetime average", note: `That's roughly ${Math.round(pd * 3.6 / 60 * 10) / 10} hours of music a day.`,
    };
  },
];

function runInsights(ctx, n) {
  const out = [];
  for (const p of PROVIDERS) { try { const r = p(ctx); if (r) out.push(r); } catch (e) { /* a bad provider never breaks the row */ } }
  out.sort((a, b) => b.score - a.score);
  const seen = new Set(), picks = [];
  for (const r of out) { if (seen.has(r.category)) continue; seen.add(r.category); picks.push(r); if (picks.length >= n) break; }
  return picks;
}

function InsightCard({ ins }) {
  return (
    <div className={"r-card" + (ins.onClick ? " ov-stat-link" : "")} style={{ gridColumn: "span 4", padding: 18, cursor: ins.onClick ? "pointer" : "default" }}
      onClick={ins.onClick || undefined}>
      <div className="r-card-h" style={{ padding: 0, marginBottom: 8 }}>
        <span className="lbl"><b>{ins.label}</b></span>
        {ins.meta && <span className="meta" style={{ maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ins.meta}{ins.onClick ? " ↗" : ""}</span>}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "4px 0 4px" }}>
        <div className="r-stat-n" style={{ fontSize: 38, color: ins.accent ? "var(--accent)" : "var(--ink)" }}>{ins.big}</div>
        {ins.bigUnit && <span className="r-mono" style={{ fontSize: 11, color: "var(--ink-soft)" }}>{ins.bigUnit}</span>}
      </div>
      {ins.sub && <div className="r-mono" style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-faint)" }}>{ins.sub}</div>}
      {ins.note && <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.4, marginTop: 9 }}>{ins.note}</div>}
    </div>
  );
}

// Returns N insight cards as grid children (each spans 4 of the Overview's 12-col bento).
function InsightRow({ go, n = 3 }) {
  const picks = React.useMemo(() => runInsights({ R: window.ROTATION, go, now: new Date() }, n), [go, n]);
  return picks.map(ins => <InsightCard key={ins.id} ins={ins} />);
}

Object.assign(window, { InsightRow, runInsights });
