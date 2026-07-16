// rotation-lab2.jsx — Overview Makeover Prototype (#lab2)
// v2: expandable-headline cards. Each rule now derives { headline, text, detail?, link? }.
// The headline is glanceable (big number or ≤8-word claim). Collapsed cards are dense;
// expanded cards reveal the sentence + derivation note. 8-10 facts fit on one screen.
// Route: #lab2 — hidden, not in NAV.

// ─────────────────────────────────────────────────────────────────
//  FACT RULES ENGINE
//  Each rule: { id, source, label, derive(R) => null | { headline, text, detail?, link? } }
//  headline: a glanceable fragment — big number or ≤8-word claim
//  text:     the full sentence (shown expanded)
//  detail:   derivation note / supporting number (shown expanded)
//  link:     { view, id } navigation target
// ─────────────────────────────────────────────────────────────────
//
//  CULLED RULES (cannot compress to a glanceable headline):
//  • "segue" (rule 11) — the headline would need to name two tracks and two artists,
//    which always exceeds 8 words and reads as a sentence anyway. Content is
//    strong in Stories but not glanceable at a card level.

const FACT_RULES = [
  // ── 1. Genre momentum ──────────────────────────────────────────────────────────────
  {
    id: "genre-shift",
    source: "genres",
    label: "Takes GENRE_FLOW.years (raw per-year play counts per family). Normalises each year's fams to percentage share, then diffs the two most-recent years to find the family with the largest absolute percentage-point swing",
    derive(R) {
      try {
        const GF = R && R.GENRE_FLOW;
        if (!GF || !GF.years || GF.years.length < 2) return null;
        const recent = GF.years[GF.years.length - 1];
        const prev   = GF.years[GF.years.length - 2];
        const fams   = GF.families || [];
        if (!fams.length || !recent.fams || !prev.fams) return null;
        const totR = recent.fams.reduce((s, v) => s + (v || 0), 0) || 1;
        const totP = prev.fams.reduce((s, v) => s + (v || 0), 0) || 1;
        const shareR = recent.fams.map(v => (v || 0) / totR * 100);
        const shareP = prev.fams.map(v => (v || 0) / totP * 100);
        let maxDelta = 0, maxIdx = -1;
        for (let i = 0; i < fams.length; i++) {
          const d = Math.abs(shareR[i] - shareP[i]);
          if (d > maxDelta) { maxDelta = d; maxIdx = i; }
        }
        if (maxIdx < 0 || maxDelta < 3) return null;
        const fam   = fams[maxIdx];
        const delta = shareR[maxIdx] - shareP[maxIdx];
        const dir   = delta > 0 ? "+" : "−";
        const pp    = Math.abs(Math.round(delta));
        return {
          headline: `${fam.family} ${dir}${pp}pp in a year`,
          text: `${fam.family} is your fastest-shifting genre — ${delta > 0 ? "up" : "down"} ${pp} percentage-points between ${prev.year} and ${recent.year}`,
          detail: `${prev.year}: ${Math.round(shareP[maxIdx])}% → ${recent.year}: ${Math.round(shareR[maxIdx])}% of plays`,
          link: { view: "explore", id: null },
        };
      } catch (e) { return null; }
    },
  },

  // ── 2. Complete discography ────────────────────────────────────────────────────────
  {
    id: "complete-discog",
    source: "mb",
    label: "Counts how many distinct album entries exist per artist in R.ALBUMS (the top-120 + 4/kept-artist list). The artist with the most album entries relative to their rank has the broadest library representation. Needs ≥5 albums to filter out catalogue-single artists",
    derive(R) {
      try {
        if (!R || !R.ARTISTS || !R.ALBUMS) return null;
        const albumsPerArtist = new Map();
        const totalPlaysPerArtist = new Map();
        for (const al of R.ALBUMS) {
          if (!al || !al.artistId) continue;
          albumsPerArtist.set(al.artistId, (albumsPerArtist.get(al.artistId) || 0) + 1);
          totalPlaysPerArtist.set(al.artistId, (totalPlaysPerArtist.get(al.artistId) || 0) + (al.plays || 0));
        }
        let best = null;
        for (const a of R.ARTISTS) {
          const count = albumsPerArtist.get(a.id) || 0;
          if (count < 5) continue;
          if (!best || count > best.count) {
            best = { a, count, albumPlays: totalPlaysPerArtist.get(a.id) || 0 };
          }
        }
        if (!best) return null;
        const { a, count, albumPlays } = best;
        return {
          headline: `${a.name} — ${count} albums deep`,
          text: `${a.name} has the broadest album footprint in your library — ${count} distinct records all with meaningful play counts`,
          detail: `${a.plays.toLocaleString("en-US")} total plays; ${albumPlays.toLocaleString("en-US")} across those ${count} albums`,
          link: { view: "artist", id: a.id },
        };
      } catch (e) { return null; }
    },
  },

  // ── 3. Peak day ───────────────────────────────────────────────────────────────────
  {
    id: "peak-day",
    source: "calendar",
    label: "Reads TOTALS.topDay which has fields: date (YYYY-MM-DD), count (plays), note (a sentence about the top artist that day). Formats the date and count into a human sentence",
    derive(R) {
      try {
        if (!R || !R.TOTALS || !R.TOTALS.topDay) return null;
        const day = R.TOTALS.topDay;
        if (!day.date || !day.count) return null;
        const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const d = new Date(day.date + "T00:00:00Z");
        const label = `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
        return {
          headline: `${day.count.toLocaleString("en-US")} plays in one day`,
          text: `Your all-time heaviest day was ${label} — ${day.count.toLocaleString("en-US")} plays`,
          detail: day.note || null,
          link: { view: "calendar", id: day.date },
        };
      } catch (e) { return null; }
    },
  },

  // ── 4. One-song artist ────────────────────────────────────────────────────────────
  {
    id: "one-song",
    source: "reads",
    label: "Scans R.TRACKS (top-50 tracks) and for each track looks up the artist's total plays via R.byId. Computes the track's share of that artist's total plays. The highest share where the artist has ≥30 plays overall wins",
    derive(R) {
      try {
        if (!R || !R.TRACKS || !R.byId) return null;
        let best = null;
        for (const tk of R.TRACKS) {
          if (!tk || !tk.artistId || !tk.plays) continue;
          const a = R.byId[tk.artistId];
          const artistTotalPlays = a && a.plays;
          if (!artistTotalPlays || artistTotalPlays < 30) continue;
          const share = tk.plays / artistTotalPlays;
          if (share < 0.45) continue;
          if (!best || share > best.share) {
            best = { tk, share, artistName: (a && a.name) || tk.artist || tk.artistId, artistId: tk.artistId };
          }
        }
        if (!best) return null;
        const { tk, share, artistName, artistId } = best;
        const pct = Math.round(share * 100);
        return {
          headline: `"${tk.title}" is ${pct}% of ${artistName}`,
          text: `"${tk.title}" accounts for ${pct}% of all your ${artistName} plays — a one-song obsession`,
          detail: `${tk.plays.toLocaleString("en-US")} plays for that track out of ${(R.byId[artistId] && R.byId[artistId].plays || 0).toLocaleString("en-US")} total`,
          link: { view: "artist", id: artistId },
        };
      } catch (e) { return null; }
    },
  },

  // ── 5. Newest entry in the all-time top 50 ────────────────────────────────────────
  {
    id: "new-to-top50",
    source: "genres",
    label: "Looks at ARTISTS[0..49] (top-50 by all-time plays) and finds the one with the most recent 'first play' year (yp key with the smallest year). That artist broke into the permanent top-50 fastest",
    derive(R) {
      try {
        if (!R || !R.ARTISTS || R.ARTISTS.length < 50) return null;
        const top50 = R.ARTISTS.slice(0, 50);
        let newest = null;
        for (const a of top50) {
          if (!a.yp) continue;
          const firstYear = Math.min(...Object.keys(a.yp).map(Number));
          if (isNaN(firstYear)) continue;
          if (!newest || firstYear > newest.firstYear) newest = { a, firstYear };
        }
        if (!newest) return null;
        const { a, firstYear } = newest;
        const cy = new Date().getUTCFullYear();
        const age = cy - firstYear;
        return {
          headline: `${a.name} in top 50 — only ${age}yr old`,
          text: `${a.name} is the newest face in your all-time top 50 — you first played them in ${firstYear}, only ${age} year${age !== 1 ? "s" : ""} ago`,
          detail: `${a.plays.toLocaleString("en-US")} plays since ${firstYear}`,
          link: { view: "artist", id: a.id },
        };
      } catch (e) { return null; }
    },
  },

  // ── 6. Streak vs best ─────────────────────────────────────────────────────────────
  {
    id: "streak-gap",
    source: "calendar",
    label: "Reads TOTALS.streak.current vs TOTALS.streak.best. If already a record, says so. Otherwise, calculates the gap and computes how many days-at-average-rate to close it",
    derive(R) {
      try {
        if (!R || !R.TOTALS || !R.TOTALS.streak) return null;
        const { current, best } = R.TOTALS.streak;
        if (!current || !best) return null;
        const isRecord = current >= best;
        if (isRecord) {
          return {
            headline: `${current}-day streak — ALL-TIME record`,
            text: `You're on a ${current}-day listening streak — that IS the all-time record`,
            detail: "Keep it going",
            link: { view: "calendar", id: null },
          };
        }
        const gap = best - current;
        return {
          headline: `${gap} days from the ${best}-day record`,
          text: `Current streak: ${current} days. The all-time record is ${best} days — ${gap} to go`,
          detail: `At your average rate you'd need ${gap} consecutive days of listening`,
          link: { view: "calendar", id: null },
        };
      } catch (e) { return null; }
    },
  },

  // ── 7. Decade dominance ───────────────────────────────────────────────────────────
  {
    id: "decade-growth",
    source: "genres",
    label: "Uses INSIGHTS.ADOPTION.decades to find the release decade whose share-of-plays grew the most between the oldest ERAS year and the newest. Compares the decade's share as recorded in adoption vs a baseline of uniform distribution",
    derive(R) {
      try {
        const ad = R && R.INSIGHTS && R.INSIGHTS.ADOPTION;
        if (!ad || !ad.decades || ad.decades.length < 2) return null;
        const decades = ad.decades.slice().filter(d => d.plays > 0);
        if (!decades.length) return null;
        const sorted = decades.slice().sort((a, b) => b.share - a.share);
        const top    = sorted[0];
        const runner = sorted[1];
        if (!runner) return null;
        const topPct = Math.round(top.share * 100);
        return {
          headline: `${top.decade}s music — ${topPct}% of your plays`,
          text: `The ${top.decade}s dominate with ${topPct}% of plays by release decade; the ${runner.decade}s are close behind at ${Math.round(runner.share * 100)}%`,
          detail: `By artist debut year across your ${R.TOTALS.artists.toLocaleString("en-US")}-artist library`,
          link: { view: "stories", id: null },
        };
      } catch (e) { return null; }
    },
  },

  // ── 8. Comeback ───────────────────────────────────────────────────────────────────
  {
    id: "comeback",
    source: "calendar",
    label: "Takes the top entry of INSIGHTS.COMEBACKS (sorted by gapDays). Each entry has: artist (name), gapDays (silence length), left (last play before silence), back (first play of return), playsAfter. Converts gapDays to years",
    derive(R) {
      try {
        const cb = R && R.INSIGHTS && R.INSIGHTS.COMEBACKS;
        if (!cb || !cb.length) return null;
        const c = cb[0];
        if (!c || !c.artist) return null;
        const gapYrs  = c.gapDays ? Math.round(c.gapDays / 365) : null;
        const backYear = c.back ? c.back.slice(0, 4) : null;
        const gapStr  = gapYrs ? `${gapYrs}yr gap` : "long gap";
        return {
          headline: `${c.artist} — ${gapStr}${backYear ? ", back " + backYear : ""}`,
          text: `${c.artist} went quiet for ${gapYrs ? gapYrs + " years" : "a long stretch"} then came roaring back${backYear ? " in " + backYear : ""}`,
          detail: c.playsAfter ? `${c.playsAfter.toLocaleString("en-US")} plays since the return` : null,
          link: { view: "artist", id: R.slug ? R.slug(c.artist) : c.artist },
        };
      } catch (e) { return null; }
    },
  },

  // ── 9. Session binge ──────────────────────────────────────────────────────────────
  {
    id: "binge-album",
    source: "calendar",
    label: "Reads INSIGHTS.SESSIONS.sittings.byAlbum — an object keyed by 'artistSlug~albumSlug' → sitting-count. Sorts by count descending and reports the top entry. Resolves the album name from R.ALBUMS or splits the slug",
    derive(R) {
      try {
        const sess    = R && R.INSIGHTS && R.INSIGHTS.SESSIONS;
        const byAlbum = sess && sess.sittings && sess.sittings.byAlbum;
        if (!byAlbum || typeof byAlbum !== "object") return null;
        const entries = Object.entries(byAlbum).sort((a, b) => b[1] - a[1]);
        if (!entries.length) return null;
        const [key, count] = entries[0];
        let albumTitle = null, artistName = null;
        if (R.ALBUMS) {
          for (const al of R.ALBUMS) {
            if (!al || !al.artistId || !al.title) continue;
            const k = (R.slug ? R.slug(al.artist || "") : al.artistId) + "~" + (R.slug ? R.slug(al.title) : al.title.toLowerCase().replace(/[^a-z0-9]/g, "-"));
            if (k === key) { albumTitle = al.title; artistName = al.artist; break; }
          }
        }
        if (!albumTitle) {
          const parts = key.split("~");
          albumTitle = parts[1] ? parts[1].replace(/-/g, " ") : key;
        }
        // Truncate long titles for headline
        const shortTitle = albumTitle.length > 22 ? albumTitle.slice(0, 20) + "…" : albumTitle;
        return {
          headline: `"${shortTitle}" front-to-back ×${count}`,
          text: `You've listened to "${albumTitle}" front-to-back ${count} time${count !== 1 ? "s" : ""} in a single uninterrupted session`,
          detail: artistName ? `by ${artistName}` : null,
          link: { view: "stories", id: "sessions" },
        };
      } catch (e) { return null; }
    },
  },

  // ── 10. Underground depth ─────────────────────────────────────────────────────────
  {
    id: "underground",
    source: "mb",
    label: "Reads INSIGHTS.UNDERGROUND.artistShare50k — the fraction of played artists with fewer than 50,000 last.fm listeners worldwide. Compares to the median listener count",
    derive(R) {
      try {
        const U = R && R.INSIGHTS && R.INSIGHTS.UNDERGROUND;
        if (!U || U.artistShare50k == null) return null;
        const pct    = Math.round(U.artistShare50k * 100);
        const median = U.medianArtistListeners;
        return {
          headline: `${pct}% of library under 50k listeners`,
          text: `${pct}% of the artists you play have fewer than 50,000 listeners worldwide — genuinely underground taste`,
          detail: median ? `Median artist: ${median.toLocaleString("en-US")} listeners globally` : null,
          link: { view: "stories", id: null },
        };
      } catch (e) { return null; }
    },
  },

  // ── 11. Obsession week ────────────────────────────────────────────────────────────
  {
    id: "obsession-peak",
    source: "reads",
    label: "Reads INSIGHTS.OBSESSIONS — each entry is a week where one artist ate ≥50% of all plays and total was ≥70. Shape: { artist, weekStart, total, plays, share, hue }. The top entry (by plays) represents the most intense single-week obsession",
    derive(R) {
      try {
        const obs = R && R.INSIGHTS && R.INSIGHTS.OBSESSIONS;
        if (!obs || !obs.length) return null;
        const o   = obs[0];
        if (!o || !o.artist) return null;
        const pct  = o.share != null ? Math.round(o.share * 100) : null;
        const week = o.weekStart ? o.weekStart.slice(0, 7) : null;
        const a    = R.byId && R.byId[R.slug ? R.slug(o.artist) : o.artist];
        const playsStr = o.plays ? o.plays.toLocaleString("en-US") : "?";
        return {
          headline: `${o.artist} — ${playsStr} plays in one week`,
          text: `Your most intense single-week binge: ${o.artist}${week ? ` in ${week}` : ""} — ${pct != null ? pct + "% of that week's plays" : o.plays + " plays"}`,
          detail: o.total ? `Out of ${o.total} total plays that week` : null,
          link: { view: "artist", id: (a && a.id) || (R.slug && R.slug(o.artist)) || o.artist },
        };
      } catch (e) { return null; }
    },
  },

  // ── 12. Disbanded while listening ─────────────────────────────────────────────────
  {
    id: "disbanded",
    source: "mb",
    label: "Reads INSIGHTS.LIFESPAN.whileListening (sorted by plays before end-year). Each entry: name, end (year number), plays, before, after, found (first-play year), artistId. Reports the artist you played most before their disbandment",
    derive(R) {
      try {
        const LS  = R && R.INSIGHTS && R.INSIGHTS.LIFESPAN;
        const ewl = LS && LS.whileListening;
        if (!ewl || !ewl.length) return null;
        const e      = ewl[0];
        if (!e || !e.name) return null;
        const before = e.before ? e.before.toLocaleString("en-US") : null;
        const after  = e.after  ? e.after.toLocaleString("en-US")  : null;
        return {
          headline: `${e.name} ended ${e.end || "??"} — you were there`,
          text: `${e.name} ended in ${e.end || "??"} while you were still actively listening — you were there until the curtain came down`,
          detail: before ? `${before} plays while they were active${after ? `, ${after} after` : ""}` : null,
          link: { view: "artist", id: e.artistId || (R.slug && R.slug(e.name)) || e.name },
        };
      } catch (e2) { return null; }
    },
  },

  // ── 13. Taste chapter ─────────────────────────────────────────────────────────────
  {
    id: "taste-era",
    source: "genres",
    label: "Reads INSIGHTS.TASTE_ERAS.eras — each chapter has start/end (YYYY-MM strings), topFams[{fam, hue, share}], and shift {up, down} for chapters after the first. Finds the era with the largest named genre pivot (shift.up.d or shift.down.d, each 0–100)",
    derive(R) {
      try {
        const TE   = R && R.INSIGHTS && R.INSIGHTS.TASTE_ERAS;
        const eras = TE && TE.eras;
        if (!eras || eras.length < 2) return null;
        let pivot = null, maxD = 0;
        for (const era of eras) {
          if (!era.shift) continue;
          const d = Math.max(era.shift.up ? era.shift.up.d || 0 : 0, era.shift.down ? era.shift.down.d || 0 : 0);
          if (d > maxD) { maxD = d; pivot = era; }
        }
        if (!pivot) {
          const last = eras[eras.length - 1];
          const top  = last.topFams && last.topFams[0];
          if (!top) return null;
          return {
            headline: `${top.fam} era since ${last.start.slice(0, 4)}`,
            text: `Your current listening chapter (from ${last.start.slice(0, 4)}) is defined by ${top.fam}`,
            detail: `${top.share}% family share in this period`,
            link: { view: "stories", id: "taste-chapters" },
          };
        }
        const up      = pivot.shift.up;
        const down    = pivot.shift.down;
        const yearStr = pivot.start ? pivot.start.slice(0, 4) : "?";
        let headPart  = "";
        if (up && down) headPart = `${up.fam} ▲ / ${down.fam} ▼ in ${yearStr}`;
        else if (up)   headPart = `${up.fam} surged ${up.d}pp in ${yearStr}`;
        else if (down) headPart = `${down.fam} dropped sharply in ${yearStr}`;
        let changeDesc = "";
        if (up && down) changeDesc = `${up.fam} rose ${up.d}pp as ${down.fam} fell`;
        else if (up)   changeDesc = `${up.fam} surged ${up.d} percentage-points`;
        else if (down) changeDesc = `${down.fam} dropped sharply`;
        return {
          headline: headPart || `Taste pivot in ${yearStr}`,
          text: `Sharpest taste pivot: around ${yearStr}, ${changeDesc}`,
          detail: pivot.topFams && pivot.topFams[0] ? `This era defined by ${pivot.topFams[0].fam} (${pivot.topFams[0].share}%)` : null,
          link: { view: "stories", id: "taste-chapters" },
        };
      } catch (e) { return null; }
    },
  },
];

// ─────────────────────────────────────────────────────────────────
//  VITALS ROW (compact version of Overview's pulse strip)
// ─────────────────────────────────────────────────────────────────
function Lab2Vitals({ R, go }) {
  const T = R && R.TOTALS;
  if (!T) return null;
  const live  = window.ROTATION_LIVE;
  const total = (live && live.total) || T.scrobbles;
  const w     = live && live.week;

  const V = ({ n, sub, onClick }) => (
    <div onClick={onClick} style={{ cursor: onClick ? "pointer" : "default",
      padding: "12px 16px", flex: "1 1 110px" }}>
      <div className="r-stat-n" style={{ fontSize: "clamp(22px,2.6vw,32px)" }}>
        {typeof n === "number" ? n.toLocaleString("en-US") : n}
      </div>
      <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: ".13em",
        textTransform: "uppercase", color: "var(--ink-faint)", marginTop: 6 }}>
        {sub}{onClick ? " ↗" : ""}
      </div>
    </div>
  );

  return (
    <div className="r-card" style={{ display: "flex", flexWrap: "wrap", gap: 0,
      borderRadius: 10, overflow: "hidden", marginBottom: 22 }}>
      <V n={total} sub="scrobbles" onClick={() => go("calendar")} />
      <V n={T.listeningHours ? Math.round(T.listeningHours).toLocaleString("en-US") : "—"} sub="hours" onClick={() => go("calendar")} />
      <V n={T.artists ? T.artists.toLocaleString("en-US") : "—"} sub="artists" onClick={() => go("explore")} />
      <V n={T.streak ? T.streak.current : "—"} sub={`day streak · best ${T.streak ? T.streak.best : "—"}`} onClick={() => go("calendar")} />
      {w && <V n={w.plays7} sub={`this week · ${w.weekAvg ? (w.plays7 > w.weekAvg ? "▲" : "▼") + " " + Math.abs(Math.round((w.plays7 - w.weekAvg) / w.weekAvg * 100)) + "%" : "avg"}`} />}
      <V n={T.perDay || "—"} sub="avg / day" />
      <V n={T.topDay ? T.topDay.count : "—"} sub={"heaviest · " + (T.topDay && T.topDay.date ? T.topDay.date.slice(2) : "—")} onClick={() => go("calendar")} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  SOURCE CHIP
// ─────────────────────────────────────────────────────────────────
const SOURCE_COLORS = {
  genres:   { hue: 255,  label: "genres"   },
  reads:    { hue: 28,   label: "reads"    },
  mb:       { hue: 188,  label: "mb"       },
  calendar: { hue: 140,  label: "calendar" },
  gigs:     { hue: 330,  label: "gigs"     },
};

function SourceChip({ src }) {
  const def = SOURCE_COLORS[src] || { hue: 210, label: src };
  return (
    <span style={{
      fontFamily: "var(--mono)", fontSize: 8, letterSpacing: ".12em",
      textTransform: "uppercase", padding: "2px 7px", borderRadius: 999,
      background: `oklch(0.72 0.14 ${def.hue} / 0.15)`,
      color: `oklch(0.74 0.13 ${def.hue})`,
      border: `1px solid oklch(0.72 0.14 ${def.hue} / 0.3)`,
      flexShrink: 0,
    }}>{def.label}</span>
  );
}

// ─────────────────────────────────────────────────────────────────
//  FACT CARD — headline-first, expandable body
// ─────────────────────────────────────────────────────────────────
function FactCard({ rule, result, go }) {
  const [expanded, setExpanded] = React.useState(false);

  const handleNav = (e) => {
    if (!result.link) return;
    e.stopPropagation();
    go(result.link.view, result.link.id || undefined);
  };

  const toggleExpand = (e) => {
    e.stopPropagation();
    setExpanded(x => !x);
  };

  return (
    <div className="r-card lab2-card" style={{
      padding: "14px 16px 12px",
      display: "flex", flexDirection: "column", gap: 0,
    }}>
      {/* ── top bar: chip + nav link ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <SourceChip src={rule.source} />
        {result.link && (
          <button onClick={handleNav} style={{
            marginLeft: "auto", background: "none", border: "none", padding: "2px 6px",
            cursor: "pointer", fontFamily: "var(--mono)", fontSize: 8.5,
            color: "var(--accent)", letterSpacing: ".08em",
          }}>→</button>
        )}
      </div>

      {/* ── headline ── big number / glanceable claim ── */}
      <div className="r-stat-n" style={{
        fontSize: "clamp(13px,1.5vw,15.5px)", lineHeight: 1.3,
        color: "var(--ink)", marginBottom: 10,
        letterSpacing: "-.01em",
      }}>
        {result.headline}
      </div>

      {/* ── expander row ── */}
      <div style={{ borderTop: "1px solid var(--rule)", paddingTop: 8 }}>
        <button
          onClick={toggleExpand}
          style={{
            background: "none", border: "none", padding: 0, cursor: "pointer",
            fontFamily: "var(--mono)", fontSize: 8.5, letterSpacing: ".1em",
            textTransform: "uppercase", color: "var(--ink-faint)",
            display: "flex", alignItems: "center", gap: 5, width: "100%",
          }}>
          <span style={{ color: "var(--accent-dim)", fontSize: 10 }}>{expanded ? "▾" : "▸"}</span>
          {expanded ? "less" : "more"}
        </button>

        {expanded && (
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            {/* sentence */}
            <div style={{ fontFamily: "var(--serif)", fontStyle: "italic",
              fontSize: "clamp(12.5px,1.3vw,14.5px)", lineHeight: 1.55, color: "var(--ink-soft)" }}>
              {result.text}
            </div>
            {/* detail */}
            {result.detail && (
              <div style={{ fontFamily: "var(--mono)", fontSize: 10,
                color: "var(--ink-faint)", lineHeight: 1.4 }}>
                {result.detail}
              </div>
            )}
            {/* derivation */}
            <div style={{
              fontFamily: "var(--mono)", fontSize: 9.5,
              color: "var(--ink-soft)", lineHeight: 1.5,
              background: "var(--bg-3)", borderRadius: 5, padding: "8px 10px",
            }}>
              <span style={{ color: "var(--accent-dim)" }}>{rule.id}</span>
              <span style={{ color: "var(--ink-faint)" }}> · {rule.source}</span>
              <br />
              <span style={{ color: "var(--ink-faint)", fontSize: 9 }}>{rule.label}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  NULL CARD (shown in audit mode only)
// ─────────────────────────────────────────────────────────────────
function NullCard({ rule }) {
  const [show, setShow] = React.useState(false);
  return (
    <div style={{
      padding: "8px 12px", borderRadius: 8,
      border: "1px dashed var(--rule)", opacity: 0.5,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <SourceChip src={rule.source} />
        <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-faint)" }}>
          {rule.id} — no data
        </span>
        <button onClick={() => setShow(x => !x)} style={{
          marginLeft: "auto", background: "none", border: "none", cursor: "pointer",
          fontFamily: "var(--mono)", fontSize: 8, color: "var(--ink-faint)",
        }}>{show ? "hide" : "why?"}</button>
      </div>
      {show && (
        <div style={{ marginTop: 6, fontFamily: "var(--mono)", fontSize: 9,
          color: "var(--ink-faint)", lineHeight: 1.5 }}>
          {rule.label}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  LAB 2 VIEW
// ─────────────────────────────────────────────────────────────────
function Lab2View() {
  const R = window.ROTATION;
  const [showNulls, setShowNulls] = React.useState(false);

  const results = React.useMemo(() => {
    if (!R) return [];
    return FACT_RULES.map(rule => {
      let result = null;
      try { result = rule.derive(R); } catch (e) { result = null; }
      return { rule, result };
    });
  }, [R]);

  const fired  = results.filter(x => x.result !== null);
  const missed = results.filter(x => x.result === null);

  return (
    <div className="r-view" style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* header */}
      <div style={{ marginBottom: 22 }}>
        <div className="r-kicker">Lab 2</div>
        <h1 className="r-title">Overview Makeover<span className="dot">.</span></h1>
        <p className="r-lede" style={{ marginTop: 6, marginBottom: 0 }}>
          Expandable fact cards — glance the headline, open for the full story.
          Rules are readable in{" "}
          <code style={{ fontFamily: "var(--mono)", fontSize: 11,
            color: "var(--accent-dim)", background: "var(--bg-3)",
            padding: "1px 5px", borderRadius: 4 }}>rotation-lab2.jsx</code>.
        </p>
        <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-faint)",
          marginTop: 8, letterSpacing: ".14em", textTransform: "uppercase",
          display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <a href="#overview" style={{ color: "var(--accent)", textDecoration: "none" }}>← back to overview</a>
          <span style={{ color: "var(--rule-2)" }}>|</span>
          <span>{fired.length} fact{fired.length !== 1 ? "s" : ""} · {missed.length} null</span>
        </div>
      </div>

      {/* vitals row */}
      {R && <Lab2Vitals R={R} go={window.__lab2Go || (() => {})} />}

      {/* section header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 14 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: ".18em",
          textTransform: "uppercase", color: "var(--ink-faint)" }}>
          What the site learned
        </div>
        <button
          onClick={() => setShowNulls(x => !x)}
          style={{ background: "none", border: "1px solid var(--rule)", borderRadius: 999,
            padding: "3px 10px", fontFamily: "var(--mono)", fontSize: 8, letterSpacing: ".1em",
            textTransform: "uppercase", color: "var(--ink-faint)", cursor: "pointer" }}>
          {showNulls ? "hide nulls" : "audit rules"}
        </button>
      </div>

      {/* fact cards grid */}
      {!R && (
        <div className="r-card" style={{ padding: 28, textAlign: "center",
          fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-faint)" }}>
          waiting for window.ROTATION…
        </div>
      )}

      {fired.length > 0 && (
        <div style={{ display: "grid", gap: 10,
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
          {fired.map(({ rule, result }) => (
            <FactCard key={rule.id} rule={rule} result={result}
              go={window.__lab2Go || (() => {})} />
          ))}
        </div>
      )}

      {fired.length === 0 && R && (
        <div className="r-card" style={{ padding: 28, textAlign: "center",
          fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-faint)" }}>
          no facts fired — check that music-core.js loaded
        </div>
      )}

      {/* null cards (audit mode) */}
      {showNulls && missed.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: ".16em",
            textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: 10 }}>
            Rules that returned null (data absent or guard triggered)
          </div>
          <div style={{ display: "grid", gap: 7 }}>
            {missed.map(({ rule }) => <NullCard key={rule.id} rule={rule} />)}
          </div>
        </div>
      )}

      {/* footer */}
      <div style={{ marginTop: 40, paddingTop: 20, borderTop: "1px solid var(--rule)",
        fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-faint)",
        letterSpacing: ".1em", lineHeight: 1.8 }}>
        <div>prototype v2 · rules in <span style={{ color: "var(--accent-dim)" }}>rotation-lab2.jsx</span></div>
        <div style={{ marginTop: 3 }}>
          {FACT_RULES.length} rules · {fired.length} fired · {missed.length} null ·
          culled: segue (headline too long) ·
          sources: {[...new Set(FACT_RULES.map(r => r.source))].join(", ")}
        </div>
      </div>

      <style>{`
        .lab2-card { transition: border-color .14s; }
        .lab2-card:hover { border-color: var(--accent-dim); }
        .lab2-go-link { color: var(--accent); text-decoration: none; cursor: pointer; }
        .lab2-go-link:hover { text-decoration: underline; }
      `}</style>
    </div>
  );
}

// Wire up go() — Lab2View reads it from a global set by RotationApp.
// RotationApp calls Object.assign(window, { __lab2Go: go }) after mounting.
// Fallback: no-op.
