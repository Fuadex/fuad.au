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
// _nextThreshold went with the last provider that used it (2026-09-19) — the artist-milestone
// card, which now lives on the artist page (rotation-artist.jsx) and computes its own next round.
// stable per-day jitter so evergreen cards rotate across days without flickering within a day
const _hash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = (((h << 5) + h) ^ s.charCodeAt(i)) >>> 0; return h; };
const _dayKey = (now) => `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}`;
const _jitter = (id, now) => (_hash(id + _dayKey(now)) % 1000) / 1000 * 0.06;
const _id = (name) => { const R = window.ROTATION; return (name && R.idForName(name)) || R.slug(name || ""); };
const _hue = (name) => { const R = window.ROTATION, e = R.byId[_id(name)] || (R.expById && R.expById[_id(name)]); return e && e.hue != null ? e.hue : 210; };

// SubjectStat — the shared "number, name, cover at the right edge" card — was DELETED on
// 2026-09-19. It rendered the artist/album/track insights (Fuad 2026-08-20: "if it's relative to
// an artist, an album or song, there should be a thumbnail somewhere"), and the last two callers
// left on the same day: the artist milestone moved to the artist page and the scrobble milestone
// folded into the Overview's Scrobbles card. The rule it wore, .ov-ins-fig, went with it — the
// pulse row's numeral face is .ov-n in rotation-views1.jsx now. If a subject card comes back it
// comes back on the type roles, not on its own inline set.

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

  // ── next round scrobble total — FOLDED INTO THE SCROBBLES CARD (2026-09-19) ──
  // It printed the same live total the Scrobbles card prints, one cell along, so the pulse row
  // spent two of its four seats on one number. The progress bar, the end-cap target and the last
  // crossing now ride under that card's sparkline (rotation-views1.jsx); this returns null so the
  // deck cannot resurrect it. The freed seat went to "On this day", which never won on score.
  () => null,

  // ── a top artist about to tip over a round play count — MOVED TO THE ARTIST PAGE (2026-09-19) ──
  // The fact was never about the library: it picked whichever of the top 80 artists happened to be
  // nearest a round total and gave them a seat in a row that is otherwise about the last seven
  // days, so the card changed subject every few weeks and told you nothing about the one you were
  // looking at. It is a footnote under an artist's OWN play count, and that is where it went — a
  // slim rail in the artist header (rotation-artist.jsx), same "within 40" bar, thresholds every
  // 500 to 5k and every 1,000 above. Null here so the deck cannot resurrect it; the freed pulse
  // seat went to "In season" below.
  () => null,

  // ── IN SEASON — the artists this library only plays at this time of year ──
  // INSIGHTS.SEASONALITY.top ranks artists by how much of their listening falls inside one
  // three-month window. The card keeps only the windows the CURRENT month sits inside, so it
  // answers "who belongs to right now" rather than "who is seasonal in general" — which is the
  // only version of the fact that earns a seat in the pulse row. An off-season month would leave
  // that row a hole, so it falls back to whoever's window opens soonest and says so.
  (ctx) => {
    const top = (ctx.R.INSIGHTS && ctx.R.INSIGHTS.SEASONALITY && ctx.R.INSIGHTS.SEASONALITY.top) || [];
    if (!top.length) return null;
    const MON = window.MON, cur = ctx.now.getUTCMonth();
    // windows ship as "Feb–Apr" (en dash), and they WRAP ("Dec–Feb"), so the containment test
    // cannot be a plain range compare.
    const ends = (w) => String(w || "").split(/[–—-]/).map(s => MON.indexOf(s.trim()));
    const inWin = (w) => { const [a, b] = ends(w); return a >= 0 && b >= 0 && (b >= a ? (cur >= a && cur <= b) : (cur >= a || cur <= b)); };
    const untilStart = (w) => { const a = ends(w)[0]; return a < 0 ? 99 : (a - cur + 12) % 12; };
    let rows = top.filter(t => inWin(t.window)), soon = false;
    if (!rows.length) { soon = true; rows = top.slice().sort((a, b) => untilStart(a.window) - untilStart(b.window)); }
    rows = rows.slice(0, 2);
    if (!rows.length) return null;
    return {
      id: "in-season", category: "seasonality", score: 0.64,
      label: "In season", meta: soon ? "coming up" : MON[cur],
      render: (
        <div style={{ display: "grid", gap: 6, gridTemplateColumns: "minmax(0, 1fr)" }}>
          {rows.map(t => (
            <div key={t.id} className="ov-hovrow" onClick={(e) => { e.stopPropagation(); ctx.go("artist", t.id); }}
              title={`${t.name} — ${t.share}% of their plays fall in ${t.window} →`}
              style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "3px 0", borderRadius: 4, minWidth: 0 }}>
              <GenCover hue={t.hue} name={t.name} size={22} radius={2} style={{ flex: "none" }} />
              <div style={{ flex: "1 1 0", minWidth: 0 }}>
                <div className="ov-tx">{t.name}</div>
                {/* the play count sits at the trailing edge, not in this line: "98% in Sep–Nov ·
                    162 plays" wants 140px and a pulse card's sub-line has 128, so the count was
                    the half that got ellipsised. On repeat's rows already park their figure out
                    there (37×), so the row keeps both numbers and the family's shape. */}
                <div className="ov-mi" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.share}% in {t.window}</div>
              </div>
              <span className="ov-mi" style={{ flex: "none" }}>{_fmtN(t.plays)}</span>
            </div>
          ))}
        </div>
      ),
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
  // returns null here so the deck doesn't duplicate it. Kept for reference/rollback — and left on
  // its own inline type declarations for the same reason: a rollback wants the card it was, not a
  // half-migrated one.
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
      // gridTemplateColumns:minmax(0,1fr) is load-bearing — an implicit grid column sizes to
      // max-content, so the track grew to the longest title and took the whole row with it.
      // A {/* */} comment cannot sit inside `render: (` — there the braces parse as an object
      // literal rather than a JSX comment, which is exactly what broke the precompile once.
      render: (
        <div style={{ display: "grid", gap: 6, gridTemplateColumns: "minmax(0, 1fr)" }}>
          {/* two rows, not three (Fuad 2026-08-20): the third made this the tallest card on its
              row, and in a grid the tallest card sets the height for every card beside it.
              ROWS ARE IDENTICAL (Fuad 2026-08-20: "need to be aligned vertically, same with the
              text next to them"). The #1 row used to run a 30px cover against the runner-up's 22px,
              which pushed its text 8px further right — so neither the covers nor the two text
              columns lined up. Rank is carried by the accent on the play count instead, which costs
              no width. */}
          {tt.slice(0, 2).map((t, i) => (
            // row hover MATCHES the Overview Recently-played rows (Fuad 2026-08-27 #11):
            // same padding/radius + bg-3 swap, so the two pulse cards read as one family.
            // .ov-hovrow (rotation-views1.jsx) IS that swap now (2026-09-19) — four rows across
            // two files were each doing it by hand in JS, which no transition could ever reach.
            <div key={t.name + t.artist} className="ov-hovrow" onClick={(e) => { e.stopPropagation(); ctx.go("track", R.slug(t.artist) + "~" + R.slug(t.name)); }}
              style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "3px 0", borderRadius: 4, minWidth: 0 }}>
              <GenCover hue={_hue(t.artist)} name={t.artist} size={22} radius={2} style={{ flex: "none" }} />
              <div className="ov-rep-txt" style={{ flex: "1 1 0", minWidth: 0 }}>
                <div className="ov-tx">{t.name}</div>
                <div className="ov-mi" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.artist}</div>
              </div>
              <span className="ov-mi" style={{ flex: "none" }}>{t.plays}×</span>
            </div>
          ))}
        </div>
      ),
    };
  },

  // ── THIS WEEK — Movement (Fuad 2026-08-27 #10) and Riser of the week, MERGED (2026-09-19) ──
  // Two cards stood side by side in the deck framed on the same seven days: Riser carried the ▲
  // line, Movement carried NEW and BACK, and between them they usually printed three rows across
  // two headers, two frames and two lots of padding. One card, one header, three tagged rows.
  // EVERY row is still EARNED (the bullet discipline Movement was built on): a row that doesn't
  // clear its bar doesn't render, and a card with no rows doesn't exist — so this stands at one
  // or two rows without stretching, since the deck's min-height does the equalising.
  //   ▲    — this week's plays against the artist's own lifetime weekly pace.
  //   BACK — a known artist back after a year-grain silence.
  // NEW IS GONE (Fuad 2026-09-21: "Let's remove NEW from This Week module, this also blows up the
  // height of the row"). It was the third row on the tallest card of the pulse row, and a grid row
  // is as tall as its tallest card — so one arrival's "first 4 plays" was setting the height of
  // three cards that had nothing to do with it. The month's arrivals are still in the live feed
  // for whatever wants them; they are not worth 40px of this row. The lazy genealogy warm-up went
  // with it — the "via X" tag was NEW's alone (rotation-lab.jsx loads the same file for itself).
  (ctx) => {
    const LV = window.ROTATION_LIVE; if (!LV) return null;
    const R = ctx.R;
    const wk = LV.week || {};
    const cy = ctx.now.getUTCFullYear();
    const lines = [];
    // ▲ — the steepest riser. The old card listed two; beside BACK one is the row, and a second ▲
    // would push the other tag off the card.
    let riser = null;
    for (const ta of (wk.topArtists || [])) {
      if (ta.plays < 15) continue;
      const a = R.byId[ta.artistId]; if (!a || !a.firstYear) continue;
      const pace = a.plays / Math.max(26, (cy - a.firstYear + 1) * 52);
      const ratio = pace > 0 ? ta.plays / pace : 0;
      if (ratio < 2.5 || (riser && ratio <= riser.ratio)) continue;
      // "50 this week · ~1/wk lifetime" wanted 157px and this row has ~102 once the tag and the
      // cover are in front of it, so it ellipsised mid-phrase — as it did on the old Riser card,
      // which had no tag and still ran over. Compressed to the comparison itself; the full
      // sentence rides in the row's title.
      const wkly = Math.max(1, Math.round(pace));
      riser = { tag: "▲", id: ta.artistId, name: ta.name, ratio,
        detail: `${ta.plays} vs ~${wkly}/wk`,
        title: `${ta.name} — ${ta.plays} plays this week against a lifetime pace of ~${wkly} a week →` };
    }
    if (riser) lines.push(riser);
    // BACK — a known artist in this week's top whose yearly plays go quiet for >=2 years
    // before now (year-grain dormancy; the current year is excluded since this week is in it).
    let back = null;
    for (const t of (wk.topArtists || [])) {
      const a = R.byId[t.artistId]; if (!a || !a.yp || (a.plays || 0) < 60) continue;
      let last = 0;
      for (const y in a.yp) { const yy = +y; if (yy < cy && a.yp[y] > 0 && yy > last) last = yy; }
      const gap = last ? cy - last : 0;
      if (gap >= 2 && (!back || gap > back.gap)) back = { tag: "BACK", id: t.artistId, name: t.name, gap,
        detail: gap + " years quiet", title: `${t.name} — back this week after ${gap} quiet years →` };
    }
    if (back) lines.push(back);
    if (!lines.length) return null;
    return {
      // Riser's score, not Movement's — this is the card Riser was, with another kind of row.
      id: "this-week", category: "this-week", score: 0.72, label: "This week",
      render: (
        <div style={{ display: "grid", gap: 4, gridTemplateColumns: "minmax(0, 1fr)" }}>
          {/* the Riser row, tagged: the tag leads, then the cover and the name/detail column the
              other deck rows use. TWO of these now (2026-09-21) — the slice tracks the tags that
              are left, so a future third tag has to be added here deliberately rather than
              arriving and quietly growing the card again. */}
          {lines.slice(0, 2).map(l => (
            <div key={l.tag + l.id} className="ov-hovrow" title={l.title} onClick={(e) => { e.stopPropagation(); ctx.go("artist", l.id); }}
              style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "2px 0", borderRadius: 4, minWidth: 0 }}>
              {/* 8px, half a step under .ov-eb: BACK at .12em has to clear a 23px column, and the
                  footnote grade puts it over. The column is what is fixed here, not the type. */}
              <span className="r-mono" style={{ fontSize: 8, letterSpacing: ".12em", color: "var(--accent)", flex: "none", width: 23 }}>{l.tag}</span>
              <GenCover hue={_hue(l.name)} name={l.name} size={20} radius={2} style={{ flex: "none" }} />
              <div style={{ flex: "1 1 0", minWidth: 0 }}>
                <div className="ov-tx">{l.name}</div>
                <div className="ov-mi" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.detail}</div>
              </div>
            </div>
          ))}
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
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <svg viewBox="0 0 90 90" style={{ width: 84, height: 84, flex: "none" }}>
            <rect x="6" y="6" width="78" height="78" fill="none" stroke="var(--rule)" strokeWidth="0.5" />
            <line x1="45" y1="6" x2="45" y2="84" stroke="var(--rule)" strokeWidth="0.4" />
            <line x1="6" y1="45" x2="84" y2="45" stroke="var(--rule)" strokeWidth="0.4" />
            <line x1={px(m.baseEnergy)} y1={py(m.baseValence)} x2={px(m.energy)} y2={py(m.valence)} stroke="var(--accent)" strokeWidth="0.8" strokeDasharray="2 2" />
            <circle cx={px(m.baseEnergy)} cy={py(m.baseValence)} r="3.2" fill="none" stroke="var(--ink-faint)" strokeWidth="1" />
            <circle cx={px(m.energy)} cy={py(m.valence)} r="4.5" fill="var(--accent)" />
          </svg>
          <div>
            <div className="ov-eb" style={{ letterSpacing: ".06em" }}>→ energy · ↑ mood</div>
            {/* not .ov-quote: this line is the card's whole statement and carries full ink, where
                the role is the aside under something else, in --ink-soft. */}
            <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 13.5, lineHeight: 1.35, marginTop: 6 }}>Lately: {eW} & {vW} than usual.</div>
          </div>
        </div>
      ),
    };
  },

  // ── LAST 12 MONTHS — the rolling year's top artist and top track (build data) ──
  // This was "2026 so far" (Fuad 2026-09-21: "For 2026 so far, let's keep the convention of Recent
  // and On Repeat modules, so then most played song gets a proper row inside it. Instead of 'For
  // 2026 so far', let's have a rolling last 12 months instead."). Two faults in one card: a
  // calendar year is a week old every January and says nothing much until March, and the song was
  // a ♪-prefixed footer line — the only thing on this card you could not click, in a deck where
  // every other row is a page. Both rows are the deck's standard row now: 22px cover, name, sub,
  // figure at the trailing edge, exactly as Recent / On repeat / In season print theirs.
  // INSIGHTS.ROLLING_12M (build-data.js, same date) is the window, and it ends at the newest
  // DATED SCROBBLE rather than at today — a stale build then shows a slightly old year instead of
  // walking its window off the end of the data and going blank.
  (ctx) => {
    const R = ctx.R, rl = R.INSIGHTS && R.INSIGHTS.ROLLING_12M;
    let label = "Last 12 months", top = rl && rl.topArtist, trk = rl && rl.topTrack;
    if (!rl) {
      // CI-GATE: the export arrives with the next rebuild. Until it does this is the card it
      // replaced, figures and label both — a card one build behind beats an empty cell.
      const ys = R.YEARS; if (!ys || !ys.length) return null;
      const cy = ctx.now.getUTCFullYear();
      const y = ys.find(x => x.year === cy) || ys[ys.length - 1];
      if (!y || !y.topArtist) return null;
      label = `${y.year} so far`;
      top = { name: y.topArtist.name, artistId: _id(y.topArtist.name), hue: y.topArtist.hue, plays: y.topArtist.plays };
      trk = y.topTrack ? { title: y.topTrack.title, artist: y.topTrack.artist, hue: y.topTrack.hue,
        plays: y.topTrack.plays, id: R.slug(y.topTrack.artist) + "~" + R.slug(y.topTrack.title) } : null;
    }
    if (!top) return null;
    // The artist row's sub says what the row IS; the track row's sub is its artist, which is what
    // a track row's second line is everywhere else on this page.
    const rows = [{ k: "a", hue: top.hue != null ? top.hue : _hue(top.name), cover: top.name,
      name: top.name, sub: "top artist", fig: _fmtN(top.plays),
      title: `${top.name} — ${_fmtN(top.plays)} plays in the last 12 months →`,
      hit: () => ctx.go("artist", top.artistId || _id(top.name)) }];
    if (trk) rows.push({ k: "t", hue: trk.hue != null ? trk.hue : _hue(trk.artist), cover: trk.artist,
      name: trk.title, sub: trk.artist, fig: _fmtN(trk.plays),
      title: `${trk.title} — ${_fmtN(trk.plays)} plays in the last 12 months →`,
      hit: () => ctx.go("track", trk.id) });
    return {
      id: "last12", category: "last12", score: 0.6 + _jitter("last12", ctx.now), label, meta: "map", onClick: () => ctx.go("map"),
      render: (
        <div style={{ display: "grid", gap: 6, gridTemplateColumns: "minmax(0, 1fr)" }}>
          {rows.map(r => (
            <div key={r.k} className="ov-hovrow" title={r.title} onClick={(e) => { e.stopPropagation(); r.hit(); }}
              style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "3px 0", borderRadius: 4, minWidth: 0 }}>
              <GenCover hue={r.hue} name={r.cover} size={22} radius={2} style={{ flex: "none" }} />
              <div style={{ flex: "1 1 0", minWidth: 0 }}>
                <div className="ov-tx">{r.name}</div>
                <div className="ov-mi" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.sub}</div>
              </div>
              <span className="ov-mi" style={{ flex: "none" }}>{r.fig}</span>
            </div>
          ))}
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
          <div className="ov-eb" style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
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
    // `standout` — the biggest of this date's years — went with the line it fed (Fuad 2026-09-21:
    // "Remove 'Biggest: 2024, 148 plays — Four Year Strong.' ... it blows up the height of the
    // entire row"). It was a fourth line restating a row already printed two lines above it.
    return {
      id: "otd", category: "on-this-day", score: 0.68, label, meta: `${_fmtN(entry.total)} plays all-time`,
      render: (
        <div>
          {/* THREE YEARS, NOT FOUR (2026-09-19). This card won its pulse seat in wave 1 and
              immediately set the row's height: four year-rows plus the Biggest line ran to 186px
              against neighbours that had nothing like that much to say, so the whole rank stretched
              to fit one card. The fourth year is the least interesting line on it — the rows are
              already sorted newest-first, not biggest-first.
              THE BIGGEST LINE WENT TOO (2026-09-21), for the same reason one step further: three
              rows plus an italic still set the row's height, and the italic was the least of them —
              it named a year that is usually already in the three rows, in a sentence, under a card
              whose whole point is the rank. Rows only now; the row levels at ~118px.
              TWO ROWS NOW (2026-09-21, later the same day): restyled to read like In season's rows
              — cover · name · an .ov-mi sub-line carrying the metric · a trailing count — which
              spends the row's second line on the year instead of the old leading rank column. Two
              is what that shape holds at the settled ~118px without the row growing again the
              moment it gained a line back; rows stay newest-first. Cover moved to 22px to match
              In season's size (was 20). */}
          <div style={{ display: "grid", gap: 6, gridTemplateColumns: "minmax(0, 1fr)" }}>
            {/* .ov-hovrow (2026-09-19… see above): these rows were the one clickable rank on the
                pulse row with no hover at all — every sibling module's rows ease to --bg-3. */}
            {rows.slice(0, 2).map(r => (
              <div key={r.y} className="ov-hovrow" onClick={(e) => { e.stopPropagation(); ctx.go("artist", r.artistId); }}
                title={`${r.artist} — ${r.y}, ${_fmtN(r.plays)} plays →`}
                style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "3px 0", borderRadius: 4, minWidth: 0 }}>
                <GenCover hue={r.hue} name={r.artist} size={22} radius={2} style={{ flex: "none" }} />
                <div style={{ flex: "1 1 0", minWidth: 0 }}>
                  <div className="ov-tx">{r.artist}</div>
                  <div className="ov-mi" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.y} · {sameDay ? "on this day" : `on ${used.getUTCDate()} ${MON[used.getUTCMonth()]}`}</div>
                </div>
                <span className="ov-mi" style={{ flex: "none" }}>{_fmtN(r.plays)}</span>
              </div>
            ))}
          </div>
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

  // ── riser of the week — FOLDED INTO "This week" above (2026-09-19). Its ▲ row, its 2.5×-pace
  // bar and its row markup all live there now, beside NEW and BACK; it was a whole card for one
  // line. Nothing returns here: a second riser card on the same row is exactly what the merge
  // removed.

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
          <div className="ov-tx-soft" style={{ lineHeight: 1.5 }}>{pick.teaser}</div>
          <div className="ov-mi" style={{ letterSpacing: ".12em", textTransform: "uppercase", marginTop: 10 }}>read the story →</div>
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
// opts.last — ids that render at the TRAILING edge of the row when they appear at all. Score decides
//   WHETHER a card shows; it has no opinion about where in the row it lands, and until now the two
//   were the same knob, so a card's position drifted a cell left or right as other providers came
//   and went. Applied after selection so it never changes which cards were chosen.
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
  const chosen = picks.slice(0, n);
  const last = new Set(o.last || []);
  return last.size ? chosen.filter(r => !last.has(r.id)).concat(chosen.filter(r => last.has(r.id))) : chosen;
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
      {/* The LABEL holds the line, the meta gives way (2026-09-19). The meta already ellipsised,
          but nothing stopped it claiming its full 130px first, so in a ~185px pulse-row card a
          three-word label ("On this day") broke across two lines to make room for a footnote.
          Names before annotations: the label refuses to wrap and the meta shrinks to what's left. */}
      <div className="r-card-h" style={{ padding: 0, marginBottom: 3, flex: "none", flexWrap: "nowrap" }}>
        <span className="lbl" style={{ whiteSpace: "nowrap", flex: "none" }}><b>{ins.label}</b></span>
        {ins.meta && <span className="meta" style={{ minWidth: 0, maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ins.meta}</span>}
      </div>
      {/* minWidth:0 matters as much as minHeight (Fuad 2026-08-21): without it this column refuses
          to go below the width of its widest child, so a long song title in On repeat pushed the
          play count clean out of the card instead of being truncated. */}
      <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {ins.render ? ins.render : (<>
        {/* stays on .r-stat-n, not .ov-n: this figure is a step down from the pulse numerals, and
            .ov-pulseslot overrides the class by name when the card rides that row. */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <div className="r-stat-n" style={{ fontSize: 23, lineHeight: 1.05, color: ins.accent ? "var(--accent)" : "var(--ink)" }}>{ins.big}</div>
          {ins.bigUnit && <span className="ov-nr" style={{ color: "var(--ink-soft)" }}>{ins.bigUnit}</span>}
        </div>
        {ins.sub && <div className="ov-mi" style={{ letterSpacing: ".1em", textTransform: "uppercase", marginTop: 2 }}>{ins.sub}</div>}
        {ins.note && <div className="ov-quote" style={{ marginTop: 4 }}>{ins.note}</div>}
        </>)}
      </div>
    </div>
  );
}

// Returns N insight cards as grid children (each spans 4 of the Overview's 12-col bento by default).
// `span` overrides that for hosts on a different grid — the pulse row is a plain 4-up, not 12 cols.
function InsightRow({ go, n = 6, only, omit, last, span }) {
  const oKey = (only || []).join(",") + "|" + (omit || []).join(",") + "|" + (last || []).join(",");
  const picks = React.useMemo(
    () => runInsights({ R: window.ROTATION, go, now: new Date() }, n, { only, omit, last }),
    [go, n, oKey]);  // eslint-disable-line react-hooks/exhaustive-deps
  return picks.map(ins => <InsightCard key={ins.id} ins={ins} span={span} />);
}

// storyOfDay(go) → the day's story descriptor (or null if no story data), for Overview's dedicated
// "Story of the day" slot. Deterministic per UTC day (same _dayKey seed as the rest of the engine).
function storyOfDay(go) {
  try { return storyOfDayProvider({ R: window.ROTATION, go, now: new Date() }); } catch (e) { return null; }
}

Object.assign(window, { InsightRow, runInsights, storyOfDay });
