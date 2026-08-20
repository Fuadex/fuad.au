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

// ── SUBJECT CARD (Fuad 2026-08-20) ──────────────────────────────────────────────────────────────
// Every insight that is ABOUT an artist, album or track renders the same way: the number and its
// unit on the first line, the name under it, one quiet line of context, and the cover at the RIGHT
// edge. Three things drove this:
//   · "if it's relative to an artist, an album or song, there should be a thumbnail somewhere".
//     GenCover already resolves a real photo from the name alone, so the thumbnail is free — these
//     cards simply never asked for one.
//   · The old shape said the name THREE times: `meta` in the header, `sub` under the number, and
//     again inside `note`. Once, next to its own picture, is enough.
//   · COVER RIGHT, NOT LEFT (Fuad 2026-08-20: "the blocks need to align vertically, the widths are
//     uneven"). The first pass put the cover first, which pushed the number ~48px in from the card's
//     padding edge — so in a row of four cards, three had their big number on the left margin and
//     this one did not. Nothing else in the row is indented, so the card was the odd one out. Moving
//     the cover to the trailing edge puts every number on the same vertical line and still leaves
//     the picture beside the thing it belongs to.
// Callers pass `name` for the cover lookup and `title` for what to print, because a track card
// looks the artist up but shows the song.
function SubjectStat({ name, title, big, unit, foot, size }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <div className="r-stat-n ov-ins-fig" style={{ fontSize: 23, lineHeight: 1.05, color: "var(--accent)" }}>{big}</div>
          {unit && <span className="r-mono" style={{ fontSize: 10, color: "var(--ink-soft)" }}>{unit}</span>}
        </div>
        <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 3 }}>{title || name}</div>
        {foot && <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{foot}</div>}
      </div>
      <GenCover hue={_hue(name)} name={name} size={size || 38} radius={2} style={{ flex: "none" }} />
    </div>
  );
}

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
    const MON = window.MON;
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
    const pct = Math.round((5000 - away) / 5000 * 100);
    return {
      id: "scrob-mile", category: "milestone", score: 0.5 + 0.46 * (1 - away / 5000), accent: true,
      label: "Next milestone", meta: pct + "%",
      // A bar, not a note (Fuad 2026-08-20: "kinda okay but there's heaps of white space"). This is
      // the one card here with no artist to show, so it had a number and two lines of text to fill a
      // full-height cell. How far through the current 5,000 you are is the whole point of the card
      // and it was only ever implied by the number — drawing it uses the room rather than padding it.
      render: (
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
            <div className="r-stat-n ov-ins-fig" style={{ fontSize: 23, lineHeight: 1.05, color: "var(--accent)" }}>{_fmtN(away)}</div>
            <span className="r-mono" style={{ fontSize: 10, color: "var(--ink-soft)" }}>from {_fmtN(next)}</span>
          </div>
          {/* Hollow fill, vivid rim — the emotional-weather bar idiom (Fuad 2026-08-20). Alpha lives
              in the background colour only, never as `opacity` on the element, or the border fades
              along with the wash it is meant to enclose. */}
          <div style={{ height: 7, borderRadius: 4, background: "var(--bg-3)", margin: "8px 0 6px", position: "relative" }}>
            <div style={{ position: "absolute", inset: "0 auto 0 0", width: pct + "%",
              background: "oklch(0.72 0.17 350 / 0.26)", border: "1px solid oklch(0.80 0.21 350)",
              boxSizing: "border-box", borderRadius: 4 }} />
          </div>
          <div className="r-mono" style={{ fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-faint)" }}>
            {_fmtN(total)} scrobbles and counting
          </div>
          {away < 200 && <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 12, color: "var(--ink-soft)", marginTop: 4 }}>You'll cross it any day now.</div>}
        </div>
      ),
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
      label: "About to tip over", onClick: () => ctx.go("artist", best.a.id),
      render: <SubjectStat name={best.a.name} big={_fmtN(best.away)} unit={`plays to ${_fmtN(best.thr)}`}
        foot={`${_fmtN(best.a.plays)} so far`} />,
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

  // ── week in review (live sync) — PROMOTED to the Overview pulse row (Fuad 2026-07-05);
  // returns null here so the deck doesn't duplicate it. Kept for reference/rollback.
  (ctx) => {
    if (true) return null;
    const w = window.ROTATION_LIVE && window.ROTATION_LIVE.week; if (!w) return null;
    const delta = w.weekAvg ? Math.round((w.plays7 - w.weekAvg) / w.weekAvg * 100) : 0, up = delta >= 0;
    const ta = w.topArtists && w.topArtists[0];
    return {
      id: "week", category: "week", score: 0.74, label: "This week", meta: "map", onClick: () => ctx.go("map"),
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

  // ── on repeat (live sync) — the tracks you can't stop playing this week ──
  (ctx) => {
    const w = window.ROTATION_LIVE && window.ROTATION_LIVE.week;
    const tt = w && w.topTracks && w.topTracks.filter(t => t.plays >= 3);
    if (!tt || !tt.length) return null;
    const R = ctx.R;
    return {
      id: "on-repeat", category: "on-repeat", score: 0.78, label: "On repeat", meta: "this week",
      render: (
        <div style={{ display: "grid", gap: 6 }}>
          {/* two rows, not three (Fuad 2026-08-20): the third made this the tallest card on its
              row, and in a grid the tallest card sets the height for every card beside it.
              ROWS ARE IDENTICAL (Fuad 2026-08-20: "need to be aligned vertically, same with the
              text next to them"). The #1 row used to run a 30px cover against the runner-up's 22px,
              which pushed its text 8px further right — so neither the covers nor the two text
              columns lined up. Rank is carried by the accent on the play count instead, which costs
              no width. */}
          {tt.slice(0, 2).map((t, i) => (
            <div key={t.name + t.artist} onClick={(e) => { e.stopPropagation(); ctx.go("track", R.slug(t.artist) + "~" + R.slug(t.name)); }}
              style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
              <GenCover hue={_hue(t.artist)} name={t.artist} size={28} radius={2} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: i === 0 ? 600 : 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</div>
                <div className="r-mono" style={{ fontSize: 9, color: "var(--ink-faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.artist}</div>
              </div>
              <span className="r-mono" style={{ fontSize: 9.5, color: i === 0 ? "var(--accent)" : "var(--ink-faint)", flex: "none" }}>{t.plays}×</span>
            </div>
          ))}
        </div>
      ),
    };
  },

  // ── new this month (live sync) — fresh obsessions + the deepest dive ──
  (ctx) => {
    const mo = window.ROTATION_LIVE && window.ROTATION_LIVE.month; if (!mo) return null;
    // TWO, not three (Fuad 2026-08-20: "currently overflowing"). Three rows plus the Deepest-dive
    // footer overran the deck's 104px cap, and the card clips rather than growing — the cap is what
    // stops one tall card setting the height for every card beside it. Same trade On repeat took.
    const list = (mo.newArtists || []).slice(0, 2);
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
      id: "top-year", category: "top-year", score: 0.6 + _jitter("top-year", ctx.now), label: `${y.year} so far`, meta: "map", onClick: () => ctx.go("map"),
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
    const MON = window.MON;
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

  // ── riser of the week — this week's plays vs the artist's own lifetime weekly pace ──
  (ctx) => {
    const w = window.ROTATION_LIVE && window.ROTATION_LIVE.week;
    if (!w || !w.topArtists) return null;
    const cy = ctx.now.getUTCFullYear();
    let best = null;
    for (const ta of w.topArtists) {
      if (ta.plays < 15) continue;
      const a = ctx.R.byId[ta.artistId]; if (!a || !a.firstYear) continue;
      const weeks = Math.max(26, (cy - a.firstYear + 1) * 52);
      const pace = a.plays / weeks;                       // lifetime plays-per-week
      const ratio = pace > 0 ? ta.plays / pace : 0;
      if (ratio >= 2.5 && (!best || ratio > best.ratio)) best = { ...ta, ratio, pace };
    }
    if (!best) return null;
    return {
      id: "riser", category: "riser", score: 0.72, accent: true,
      label: "Riser of the week", onClick: () => ctx.go("artist", best.artistId),
      render: <SubjectStat name={best.name}
        big={"×" + (best.ratio >= 10 ? Math.round(best.ratio) : best.ratio.toFixed(1))} unit="usual pace"
        foot={`${best.plays} this week · ~${Math.max(1, Math.round(best.pace))}/wk lifetime`} />,
    };
  },

];

// ── story of the day — promotes one Stories card, deep-linked, rotating daily ──
// NOT in the PROVIDERS array: Overview renders this in a DEDICATED slot (window.storyOfDay) rather
// than leaving it to the top-N insight lottery, where higher-scoring milestone / on-repeat / week
// cards were pushing it out of the 4 shown, so no story surfaced at all (Fuad 2026-07-18).
function storyOfDayProvider(ctx) {
    const I = ctx.R.INSIGHTS; if (!I) return null;
    const cands = [];
    if (I.UNDERGROUND) cands.push({ id: "how-deep-it-goes", t: "How deep it goes",
      teaser: `${Math.round(I.UNDERGROUND.artistShare50k * 100)}% of the artists you play sit under 50k listeners.` });
    if (I.LIFESPAN && I.LIFESPAN.whileListening[0]) cands.push({ id: "the-ones-that-ended", t: "The ones that ended",
      teaser: `${I.LIFESPAN.whileListening[0].name} ended in ${I.LIFESPAN.whileListening[0].end} — you'd played them ${_fmtN(I.LIFESPAN.whileListening[0].before)} times.` });
    if (I.ADOPTION) cands.push({ id: "how-old-the-music-was", t: "How old the music was",
      teaser: `The median artist was ${I.ADOPTION.medianLag} years past their debut when you found them.` });
    if (I.RECOMMENDATIONS && I.RECOMMENDATIONS.artists[0]) cands.push({ id: "blind-spots", t: "Blind spots",
      teaser: `${I.RECOMMENDATIONS.artists[0].name} — you'd love them, and you've never pressed play.` });
    if (I.REVISIT && I.REVISIT.artists[0]) cands.push({ id: "gathering-dust", t: "Gathering dust",
      teaser: `${I.REVISIT.artists[0].name}: ${_fmtN(I.REVISIT.artists[0].plays)} plays, quiet for ${Math.round(I.REVISIT.artists[0].monthsSince)} months.` });
    if (I.STYLE_ATLAS && I.STYLE_ATLAS.rarest && I.STYLE_ATLAS.rarest[1]) cands.push({ id: "style-atlas", t: "Style atlas",
      teaser: `Some styles survive in this library through a single artist.` });
    if (I.GEOGRAPHY && I.GEOGRAPHY.gateways && I.GEOGRAPHY.gateways[0]) cands.push({ id: "gateways", t: "Gateways",
      teaser: `Every country in your library had a first artist who opened the door.` });
    if (!cands.length) return null;
    const pick = cands[_hash("story" + _dayKey(ctx.now)) % cands.length];
    return {
      id: "story-day", category: "story", score: 0.76, _pick: pick,
      label: "Story of the day", meta: "stories ↗", onClick: () => ctx.go("stories", pick.id),
      render: (
        <div>
          <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 17, lineHeight: 1.3, marginBottom: 7 }}>{pick.t}</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.5 }}>{pick.teaser}</div>
          <div className="r-mono" style={{ fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ink-faint)", marginTop: 10 }}>read the story →</div>
        </div>
      ),
    };
}

// Keep the story OUT of the ranked InsightRow (it has a dedicated Overview slot now), so it never
// competes with milestone/on-repeat/week cards for a top-N seat and never double-renders.
// opts.only — take these provider ids, in THIS order, ignoring score. Used by Overview's pulse row,
//   which needs two named cards in two fixed slots rather than whatever ranks highest today.
// opts.omit — never return these ids. A card promoted into a fixed slot must be omitted here or it
//   renders twice on the same page.
// A provider can return null (no riser this week, milestone too far off), so `only` backfills from
// the ranked remainder: the pulse row is a 4-up grid and a missing child would leave a hole in it.
function runInsights(ctx, n, opts) {
  const o = opts || {};
  const omit = new Set(o.omit || []);
  const out = [];
  for (const p of PROVIDERS) { try { const r = p(ctx); if (r && !omit.has(r.id)) out.push(r); } catch (e) { /* a bad provider never breaks the row */ } }
  out.sort((a, b) => b.score - a.score);
  const byId = {}; for (const r of out) byId[r.id] = r;
  const seen = new Set(), picks = [];
  const take = (r) => { if (!r || seen.has(r.category)) return; seen.add(r.category); picks.push(r); };
  for (const id of (o.only || [])) take(byId[id]);
  for (const r of out) { if (picks.length >= n) break; take(r); }
  return picks.slice(0, n);
}

function InsightCard({ ins, span }) {
  return (
    /* Column layout with the body CENTRED in whatever space is left (Fuad 2026-08-20: "tons of
       whitespace"). Grid stretches every card to the tallest in the row, and the body used to stack
       from the top — so a card with just a number and a label left all its slack pooled in a block
       at the bottom. Centring spreads that slack above and below instead, which reads as deliberate
       rather than as a card that ran out of things to say. The ↗ on meta goes for the same reason it
       went from the stat strip: every one of these cards is clickable, so it marked nothing. */
    <div className={"r-card ov-inscard" + (ins.onClick ? " ov-stat-link" : "")}
      style={{ gridColumn: span || "span 4", padding: "8px 12px", cursor: ins.onClick ? "pointer" : "default",
        display: "flex", flexDirection: "column", minWidth: 0 }}
      onClick={ins.onClick || undefined}>
      <div className="r-card-h" style={{ padding: 0, marginBottom: 3, flex: "none" }}>
        <span className="lbl"><b>{ins.label}</b></span>
        {ins.meta && <span className="meta" style={{ maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ins.meta}</span>}
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {ins.render ? ins.render : (<>
        <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
          <div className="r-stat-n" style={{ fontSize: 23, lineHeight: 1.05, color: ins.accent ? "var(--accent)" : "var(--ink)" }}>{ins.big}</div>
          {ins.bigUnit && <span className="r-mono" style={{ fontSize: 10, color: "var(--ink-soft)" }}>{ins.bigUnit}</span>}
        </div>
        {ins.sub && <div className="r-mono" style={{ fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-faint)", marginTop: 2 }}>{ins.sub}</div>}
        {ins.note && <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.3, marginTop: 3 }}>{ins.note}</div>}
        </>)}
      </div>
    </div>
  );
}

// Returns N insight cards as grid children (each spans 4 of the Overview's 12-col bento by default).
// `span` overrides that for hosts on a different grid — the pulse row is a plain 4-up, not 12 cols.
function InsightRow({ go, n = 6, only, omit, span }) {
  const oKey = (only || []).join(",") + "|" + (omit || []).join(",");
  const picks = React.useMemo(
    () => runInsights({ R: window.ROTATION, go, now: new Date() }, n, { only, omit }),
    [go, n, oKey]);  // eslint-disable-line react-hooks/exhaustive-deps
  return picks.map(ins => <InsightCard key={ins.id} ins={ins} span={span} />);
}

// storyOfDay(go) → the day's story descriptor (or null if no story data), for Overview's dedicated
// "Story of the day" slot. Deterministic per UTC day (same _dayKey seed as the rest of the engine).
function storyOfDay(go) {
  try { return storyOfDayProvider({ R: window.ROTATION, go, now: new Date() }); } catch (e) { return null; }
}

Object.assign(window, { InsightRow, runInsights, storyOfDay });
