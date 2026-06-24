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
const _id = (name) => { const R = window.ROTATION; return (name && R.idForName(name)) || R.slug(name || ""); };
const _hue = (name) => { const R = window.ROTATION, e = R.byId[_id(name)] || (R.expById && R.expById[_id(name)]); return e && e.hue != null ? e.hue : 210; };

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

  // ── week in review (live sync) — plays vs your weekly average, this week's #1, new artists ──
  (ctx) => {
    const w = window.ROTATION_LIVE && window.ROTATION_LIVE.week; if (!w) return null;
    const delta = w.weekAvg ? Math.round((w.plays7 - w.weekAvg) / w.weekAvg * 100) : 0, up = delta >= 0;
    const ta = w.topArtists && w.topArtists[0];
    return {
      id: "week", category: "week", score: 0.74, label: "This week", meta: "journey", onClick: () => ctx.go("journey"),
      render: (
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 7, margin: "2px 0 7px" }}>
            <div className="r-stat-n" style={{ fontSize: 32 }}>{_fmtN(w.plays7)}</div>
            <span className="r-mono" style={{ fontSize: 10, color: "var(--ink-soft)" }}>plays</span>
            <span className="r-mono" style={{ fontSize: 10, color: up ? "var(--accent)" : "var(--ink-faint)", marginLeft: 2 }}>{up ? "▲" : "▼"} {Math.abs(delta)}% vs avg</span>
          </div>
          {ta && <div style={{ display: "flex", alignItems: "center", gap: 9 }} onClick={(e) => { e.stopPropagation(); ctx.go("artist", ta.artistId); }}>
            <GenCover hue={_hue(ta.name)} name={ta.name} size={28} radius={2} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ta.name}</div>
              <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)" }}>#1 this week · {ta.plays} plays</div>
            </div>
          </div>}
          {w.newArtistsThisWeek > 0 && <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", marginTop: 10, letterSpacing: ".08em", textTransform: "uppercase" }}>{w.newArtistsThisWeek} new to your library this week</div>}
        </div>
      ),
    };
  },

  // ── new this month (live sync) — fresh obsessions + the deepest dive ──
  (ctx) => {
    const mo = window.ROTATION_LIVE && window.ROTATION_LIVE.month; if (!mo) return null;
    const list = (mo.newArtists || []).slice(0, 3);
    if (!list.length && !mo.deepest) return null;
    return {
      id: "new-month", category: "new-month", score: 0.7, label: "New this month", meta: "explore", onClick: () => ctx.go("explore"),
      render: (
        <div>
          <div style={{ display: "grid", gap: 6 }}>
            {list.map(a => (
              <div key={a.name} onClick={(e) => { e.stopPropagation(); ctx.go("artist", a.artistId); }} style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
                <GenCover hue={a.hue != null ? a.hue : _hue(a.name)} name={a.name} size={24} radius={2} />
                <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</div>
                <span className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)" }}>{a.plays}</span>
              </div>
            ))}
          </div>
          {mo.deepest && <div style={{ marginTop: 9, paddingTop: 8, borderTop: "1px solid var(--rule)", cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); ctx.go("artist", mo.deepest.artistId); }}>
            <div className="r-mono" style={{ fontSize: 8.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-faint)" }}>Deepest dive</div>
            <div style={{ fontSize: 12.5 }}>{mo.deepest.name} <span style={{ color: "var(--ink-faint)" }}>· {mo.deepest.plays} plays</span></div>
          </div>}
        </div>
      ),
    };
  },

  // ── mood lately vs all-time baseline (live sync) ──
  (ctx) => {
    const m = window.ROTATION_LIVE && window.ROTATION_LIVE.mood; if (!m) return null;
    const dE = m.energy - m.baseEnergy, dV = m.valence - m.baseValence;
    const eW = dE > 0.04 ? "more intense" : dE < -0.04 ? "calmer" : "as intense";
    const vW = dV > 0.04 ? "brighter" : dV < -0.04 ? "darker" : "as bright";
    const px = (x) => 6 + Math.max(0, Math.min(1, x)) * 78, py = (y) => 84 - Math.max(0, Math.min(1, y)) * 78;
    return {
      id: "mood", category: "mood", score: 0.66, label: "Mood lately",
      render: (
        <div style={{ display: "flex", gap: 13, alignItems: "center" }}>
          <svg viewBox="0 0 90 90" style={{ width: 84, height: 84, flex: "none" }}>
            <rect x="6" y="6" width="78" height="78" fill="none" stroke="var(--rule)" strokeWidth="0.5" />
            <line x1="45" y1="6" x2="45" y2="84" stroke="var(--rule)" strokeWidth="0.4" />
            <line x1="6" y1="45" x2="84" y2="45" stroke="var(--rule)" strokeWidth="0.4" />
            <line x1={px(m.baseEnergy)} y1={py(m.baseValence)} x2={px(m.energy)} y2={py(m.valence)} stroke="var(--accent)" strokeWidth="0.8" strokeDasharray="2 2" />
            <circle cx={px(m.baseEnergy)} cy={py(m.baseValence)} r="3.2" fill="none" stroke="var(--ink-faint)" strokeWidth="1" />
            <circle cx={px(m.energy)} cy={py(m.valence)} r="4.5" fill="var(--accent)" />
          </svg>
          <div>
            <div className="r-mono" style={{ fontSize: 8.5, letterSpacing: ".06em", color: "var(--ink-faint)" }}>→ energy · ↑ mood</div>
            <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 13.5, lineHeight: 1.35, marginTop: 6 }}>Lately: {eW} & {vW} than usual.</div>
          </div>
        </div>
      ),
    };
  },

  // ── top of the current year (build data) ──
  (ctx) => {
    const ys = ctx.R.YEARS; if (!ys || !ys.length) return null;
    const cy = ctx.now.getUTCFullYear();
    const y = ys.find(x => x.year === cy) || ys[ys.length - 1];
    if (!y || !y.topArtist) return null;
    return {
      id: "top-year", category: "top-year", score: 0.6 + _jitter("top-year", ctx.now), label: `${y.year} so far`, meta: "journey", onClick: () => ctx.go("journey"),
      render: (
        <div>
          <div onClick={(e) => { e.stopPropagation(); ctx.go("artist", _id(y.topArtist.name)); }} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <GenCover hue={y.topArtist.hue} name={y.topArtist.name} size={34} radius={3} />
            <div style={{ minWidth: 0 }}>
              <div className="r-mono" style={{ fontSize: 8.5, color: "var(--ink-faint)", letterSpacing: ".1em", textTransform: "uppercase" }}>top artist</div>
              <div style={{ fontSize: 14.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{y.topArtist.name}</div>
              <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)" }}>{_fmtN(y.topArtist.plays)} plays</div>
            </div>
          </div>
          {y.topTrack && <div className="r-mono" style={{ fontSize: 9.5, color: "var(--ink-soft)", marginTop: 9, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>♪ {y.topTrack.title} — {y.topTrack.artist}</div>}
        </div>
      ),
    };
  },

  // ── last 72 hours of listening (live sync) ──
  (ctx) => {
    const c = window.ROTATION_LIVE && window.ROTATION_LIVE.clock72; if (!c || !c.bins) return null;
    const sum = c.bins.reduce((a, b) => a + b, 0); if (!sum) return null;
    const max = Math.max(...c.bins, 1);
    return {
      id: "clock72", category: "clock72", score: 0.56 + _jitter("clock72", ctx.now), label: "Last 72 hours",
      render: (
        <div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 1, height: 46, marginTop: 6 }}>
            {c.bins.map((v, i) => <div key={i} style={{ flex: 1, height: Math.max(2, v / max * 46), background: v ? "var(--accent)" : "var(--bg-3)", opacity: v ? 0.5 + 0.5 * (v / max) : 1, borderRadius: 1 }} title={v + " plays"} />)}
          </div>
          <div className="r-mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 8.5, color: "var(--ink-faint)", marginTop: 6 }}>
            <span>72h ago</span><span>{_fmtN(sum)} plays</span><span>now</span>
          </div>
        </div>
      ),
    };
  },

  // ── on this day, through the years (build data) ──
  (ctx) => {
    const otd = ctx.R.INSIGHTS && ctx.R.INSIGHTS.ON_THIS_DAY; if (!otd) return null;
    const p2 = (x) => String(x).padStart(2, "0");
    const key = (d) => p2(d.getUTCMonth() + 1) + "-" + p2(d.getUTCDate());
    let entry = otd[key(ctx.now)], used = ctx.now;
    for (let off = 1; (!entry || !(entry.byYear || []).length) && off <= 3; off++) {
      for (const s of [off, -off]) { const d = new Date(ctx.now.getTime() + s * 86400e3); const e = otd[key(d)]; if (e && (e.byYear || []).length) { entry = e; used = d; break; } }
    }
    const rows = (entry && entry.byYear) || []; if (!rows.length) return null;
    const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const sameDay = used.getUTCDate() === ctx.now.getUTCDate() && used.getUTCMonth() === ctx.now.getUTCMonth();
    const label = sameDay ? "On this day" : `On ${used.getUTCDate()} ${MON[used.getUTCMonth()]}`;
    const standout = rows.slice().sort((a, b) => b.plays - a.plays)[0];
    return {
      id: "otd", category: "on-this-day", score: 0.68, label, meta: `${_fmtN(entry.total)} plays all-time`,
      render: (
        <div>
          <div style={{ display: "grid", gap: 5 }}>
            {rows.slice(0, 4).map(r => (
              <div key={r.y} onClick={(e) => { e.stopPropagation(); ctx.go("artist", r.artistId); }} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <span className="r-mono" style={{ fontSize: 10, color: "var(--ink-faint)", width: 28 }}>{r.y}</span>
                <GenCover hue={r.hue} name={r.artist} size={20} radius={2} />
                <div style={{ flex: 1, minWidth: 0, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.artist}</div>
                <span className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)" }}>{r.plays}</span>
              </div>
            ))}
          </div>
          {standout && <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.35, marginTop: 9 }}>Biggest: {standout.y}, {standout.plays} plays — {standout.artist}.</div>}
        </div>
      ),
    };
  },

  // ── back from the dead — a historical comeback, rotating across days (build data) ──
  (ctx) => {
    const cb = ctx.R.INSIGHTS && ctx.R.INSIGHTS.COMEBACKS; if (!cb || !cb.length) return null;
    const pick = cb[_hash("cb" + _dayKey(ctx.now)) % cb.length];
    const yrs = Math.round(pick.gapDays / 365 * 10) / 10;
    return {
      id: "comeback", category: "comeback", score: 0.4 + _jitter("comeback", ctx.now),
      label: "Back from the dead", meta: pick.artist, onClick: () => ctx.go("artist", _id(pick.artist)),
      big: yrs + " yr", bigUnit: "gone, then back", sub: pick.artist.toLowerCase(),
      note: `Quiet after ${String(pick.left).slice(0, 4)}, then ${_fmtN(pick.playsAfter)} more plays.`,
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
      {ins.render ? ins.render : (<>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "4px 0 4px" }}>
        <div className="r-stat-n" style={{ fontSize: 38, color: ins.accent ? "var(--accent)" : "var(--ink)" }}>{ins.big}</div>
        {ins.bigUnit && <span className="r-mono" style={{ fontSize: 11, color: "var(--ink-soft)" }}>{ins.bigUnit}</span>}
      </div>
      {ins.sub && <div className="r-mono" style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-faint)" }}>{ins.sub}</div>}
      {ins.note && <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.4, marginTop: 9 }}>{ins.note}</div>}
      </>)}
    </div>
  );
}

// Returns N insight cards as grid children (each spans 4 of the Overview's 12-col bento).
function InsightRow({ go, n = 6 }) {
  const picks = React.useMemo(() => runInsights({ R: window.ROTATION, go, now: new Date() }, n), [go, n]);
  return picks.map(ins => <InsightCard key={ins.id} ins={ins} />);
}

Object.assign(window, { InsightRow, runInsights });
