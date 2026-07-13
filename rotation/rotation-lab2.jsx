// rotation-lab2.jsx — Overview Makeover Prototype (#lab2)
// A legible fact-derivation system: FACT_RULES declare exactly what each
// insight does. Every rule is a plain object the owner can read and audit.
// Route: #lab2 — hidden, not in NAV.

// ─────────────────────────────────────────────────────────────────
//  FACT RULES ENGINE
//  Each rule: { id, source, label, derive(R) => null | { text, detail?, link? } }
//  R = window.ROTATION (plus window.ROTATION_MB, ROTATION_TRACKBIO, GIGS… if loaded)
//  Rules must return null when data is absent — no crashes allowed.
// ─────────────────────────────────────────────────────────────────

const FACT_RULES = [
  // ── 1. Genre momentum: biggest family share-shift between the two most recent GENRE_FLOW years ──
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
        // normalise raw play counts → share 0–100 within each year
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
        const dir   = delta > 0 ? "up" : "down";
        const pp    = Math.abs(Math.round(delta));
        return {
          text: `${fam.family} is your fastest-shifting genre — ${dir} ${pp} percentage-points between ${prev.year} and ${recent.year}`,
          detail: `${prev.year}: ${Math.round(shareP[maxIdx])}% → ${recent.year}: ${Math.round(shareR[maxIdx])}% of plays`,
          link: { view: "explore", id: null },
        };
      } catch (e) { return null; }
    },
  },

  // ── 2. Complete discography: artist in top-400 with the most albums represented in ALBUMS list ──
  {
    id: "complete-discog",
    source: "mb",
    label: "Counts how many distinct album entries exist per artist in R.ALBUMS (the top-120 + 4/kept-artist list). The artist with the most album entries relative to their rank has the broadest library representation. Needs ≥5 albums to filter out catalogue-single artists",
    derive(R) {
      try {
        if (!R || !R.ARTISTS || !R.ALBUMS) return null;
        // count albums per artist in the ALBUMS list
        const albumsPerArtist = new Map(); // artistId → count
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
          text: `${a.name} has the broadest album footprint in your library — ${count} distinct records all with meaningful play counts`,
          detail: `${a.plays.toLocaleString("en-US")} total plays; ${albumPlays.toLocaleString("en-US")} across those ${count} albums`,
          link: { view: "artist", id: a.id },
        };
      } catch (e) { return null; }
    },
  },

  // ── 3. Peak day: the all-time heaviest single listening day (from TOTALS.topDay) ──
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
          text: `Your all-time heaviest day was ${label} — ${day.count.toLocaleString("en-US")} plays`,
          detail: day.note || null,
          link: { view: "calendar", id: day.date },
        };
      } catch (e) { return null; }
    },
  },

  // ── 4. One-song artist: artist in top-50 tracks where a single track dominates their play count ──
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
          text: `"${tk.title}" accounts for ${pct}% of all your ${artistName} plays — a one-song obsession`,
          detail: `${tk.plays.toLocaleString("en-US")} plays for that track out of ${(R.byId[artistId] && R.byId[artistId].plays || 0).toLocaleString("en-US")} total`,
          link: { view: "artist", id: artistId },
        };
      } catch (e) { return null; }
    },
  },

  // ── 5. Newest entry in the all-time top 50: the most recently discovered artist that cracked it ──
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
          text: `${a.name} is the newest face in your all-time top 50 — you first played them in ${firstYear}, only ${age} year${age !== 1 ? "s" : ""} ago`,
          detail: `${a.plays.toLocaleString("en-US")} plays since ${firstYear}`,
          link: { view: "artist", id: a.id },
        };
      } catch (e) { return null; }
    },
  },

  // ── 6. Streak vs best: current streak and how far from the all-time record ──
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
            text: `You're on a ${current}-day listening streak — that IS the all-time record`,
            detail: "Keep it going",
            link: { view: "calendar", id: null },
          };
        }
        const gap = best - current;
        return {
          text: `Current streak: ${current} days. The all-time record is ${best} days — ${gap} to go`,
          detail: `At your average rate you'd need ${gap} consecutive days of listening`,
          link: { view: "calendar", id: null },
        };
      } catch (e) { return null; }
    },
  },

  // ── 7. Fastest-growing decade: decade whose share of plays is climbing fastest across ERAS ──
  {
    id: "decade-growth",
    source: "genres",
    label: "Uses INSIGHTS.ADOPTION.decades to find the release decade whose share-of-plays grew the most between the oldest ERAS year and the newest. Compares the decade's share as recorded in adoption vs a baseline of uniform distribution",
    derive(R) {
      try {
        const ad = R && R.INSIGHTS && R.INSIGHTS.ADOPTION;
        if (!ad || !ad.decades || ad.decades.length < 2) return null;
        // ADOPTION.decades is sorted by share — find the one labelled with the highest share
        const decades = ad.decades.slice().filter(d => d.plays > 0);
        if (!decades.length) return null;
        // find the decade with highest share that's not the obvious dominant one
        const sorted = decades.slice().sort((a, b) => b.share - a.share);
        // the runner-up is interesting: dominated but growing
        const top     = sorted[0];
        const runner  = sorted[1];
        if (!runner) return null;
        const topPct  = Math.round(top.share * 100);
        const runPct  = Math.round(runner.share * 100);
        return {
          text: `The ${top.decade}s dominate with ${topPct}% of plays by release decade; the ${runner.decade}s are close behind at ${runPct}%`,
          detail: `By artist debut year across your ${R.TOTALS.artists.toLocaleString("en-US")}-artist library`,
          link: { view: "stories", id: null },
        };
      } catch (e) { return null; }
    },
  },

  // ── 8. Comeback: an artist you ignored for years then returned to (INSIGHTS.COMEBACKS) ──
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
        const gapYrs = c.gapDays ? Math.round(c.gapDays / 365) : null;
        const backYear = c.back ? c.back.slice(0, 4) : null;
        return {
          text: `${c.artist} went quiet for ${gapYrs ? gapYrs + " years" : "a long stretch"} then came roaring back${backYear ? " in " + backYear : ""}`,
          detail: c.playsAfter ? `${c.playsAfter.toLocaleString("en-US")} plays since the return` : null,
          link: { view: "artist", id: R.slug ? R.slug(c.artist) : c.artist },
        };
      } catch (e) { return null; }
    },
  },

  // ── 9. Session binge: album played front-to-back the most times (INSIGHTS.SESSIONS) ──
  {
    id: "binge-album",
    source: "calendar",
    label: "Reads INSIGHTS.SESSIONS.sittings.byAlbum — an object keyed by 'artistSlug~albumSlug' → sitting-count. Sorts by count descending and reports the top entry. Resolves the album name from R.ALBUMS or splits the slug",
    derive(R) {
      try {
        const sess = R && R.INSIGHTS && R.INSIGHTS.SESSIONS;
        const byAlbum = sess && sess.sittings && sess.sittings.byAlbum;
        if (!byAlbum || typeof byAlbum !== "object") return null;
        const entries = Object.entries(byAlbum).sort((a, b) => b[1] - a[1]);
        if (!entries.length) return null;
        const [key, count] = entries[0];
        // Try to resolve album name from R.ALBUMS
        let albumTitle = null, artistName = null;
        if (R.ALBUMS) {
          for (const al of R.ALBUMS) {
            if (!al || !al.artistId || !al.title) continue;
            const k = (R.slug ? R.slug(al.artist || "") : al.artistId) + "~" + (R.slug ? R.slug(al.title) : al.title.toLowerCase().replace(/[^a-z0-9]/g, "-"));
            if (k === key) { albumTitle = al.title; artistName = al.artist; break; }
          }
        }
        // Fallback: parse the slug
        if (!albumTitle) {
          const parts = key.split("~");
          albumTitle = parts[1] ? parts[1].replace(/-/g, " ") : key;
        }
        return {
          text: `You've listened to "${albumTitle}" front-to-back ${count} time${count !== 1 ? "s" : ""} in a single uninterrupted session`,
          detail: artistName ? `by ${artistName}` : null,
          link: { view: "stories", id: "sessions" },
        };
      } catch (e) { return null; }
    },
  },

  // ── 10. Underground depth: share of library under 50k global listeners (INSIGHTS.UNDERGROUND) ──
  {
    id: "underground",
    source: "mb",
    label: "Reads INSIGHTS.UNDERGROUND.artistShare50k — the fraction of played artists with fewer than 50,000 last.fm listeners worldwide. Compares to the median listener count",
    derive(R) {
      try {
        const U = R && R.INSIGHTS && R.INSIGHTS.UNDERGROUND;
        if (!U || U.artistShare50k == null) return null;
        const pct     = Math.round(U.artistShare50k * 100);
        const median  = U.medianArtistListeners;
        return {
          text: `${pct}% of the artists you play have fewer than 50,000 listeners worldwide — genuinely underground taste`,
          detail: median ? `Median artist: ${median.toLocaleString("en-US")} listeners globally` : null,
          link: { view: "stories", id: null },
        };
      } catch (e) { return null; }
    },
  },

  // ── 11. Segue machine: the most-repeated X→Y track transition (INSIGHTS.SESSIONS.segues) ──
  {
    id: "segue",
    source: "calendar",
    label: "Reads INSIGHTS.SESSIONS.segues — each entry has fromArtist, fromTrack, toArtist, toTrack, n (count), pct (percentage). Cross-artist segues are ranked first. Reports the top entry as a named ritual",
    derive(R) {
      try {
        const segs = R && R.INSIGHTS && R.INSIGHTS.SESSIONS && R.INSIGHTS.SESSIONS.segues;
        if (!segs || !segs.length) return null;
        // Cross-artist segues are more interesting; they're sorted first already
        const top = segs[0];
        if (!top || !top.fromTrack || !top.toTrack) return null;
        const crossArtist = !top.sameArtist;
        const desc = crossArtist
          ? `"${top.fromTrack}" (${top.fromArtist}) → "${top.toTrack}" (${top.toArtist})`
          : `"${top.fromTrack}" → "${top.toTrack}" by ${top.fromArtist}`;
        return {
          text: `Your most automatic track transition: ${desc}`,
          detail: `Happened ${top.n} time${top.n !== 1 ? "s" : ""} (${top.pct}% of the time after that first track)`,
          link: { view: "stories", id: "segues" },
        };
      } catch (e) { return null; }
    },
  },

  // ── 12. Obsession week: the artist whose one-week binge was the most concentrated ──
  {
    id: "obsession-peak",
    source: "reads",
    label: "Reads INSIGHTS.OBSESSIONS — each entry is a week where one artist ate ≥50% of all plays and total was ≥70. Shape: { artist, weekStart, total, plays, share, hue }. The top entry (by plays) represents the most intense single-week obsession",
    derive(R) {
      try {
        const obs = R && R.INSIGHTS && R.INSIGHTS.OBSESSIONS;
        if (!obs || !obs.length) return null;
        const o = obs[0]; // already sorted by plays desc
        if (!o || !o.artist) return null;
        const pct  = o.share != null ? Math.round(o.share * 100) : null;
        const week = o.weekStart ? o.weekStart.slice(0, 7) : null;
        const a    = R.byId && R.byId[R.slug ? R.slug(o.artist) : o.artist];
        return {
          text: `Your most intense single-week binge: ${o.artist}${week ? ` in ${week}` : ""} — ${pct != null ? pct + "% of that week's plays" : o.plays + " plays"}`,
          detail: o.total ? `Out of ${o.total} total plays that week` : null,
          link: { view: "artist", id: (a && a.id) || (R.slug && R.slug(o.artist)) || o.artist },
        };
      } catch (e) { return null; }
    },
  },

  // ── 13. Lifespan — disbanded while you listened (INSIGHTS.LIFESPAN) ──
  {
    id: "disbanded",
    source: "mb",
    label: "Reads INSIGHTS.LIFESPAN.whileListening (sorted by plays before end-year). Each entry: name, end (year number), plays, before, after, found (first-play year), artistId. Reports the artist you played most before their disbandment",
    derive(R) {
      try {
        const LS = R && R.INSIGHTS && R.INSIGHTS.LIFESPAN;
        const ewl = LS && LS.whileListening;
        if (!ewl || !ewl.length) return null;
        const e = ewl[0];
        if (!e || !e.name) return null;
        const before = e.before ? e.before.toLocaleString("en-US") : null;
        const after  = e.after  ? e.after.toLocaleString("en-US")  : null;
        return {
          text: `${e.name} ended in ${e.end || "??"} while you were still actively listening — you were there until the curtain came down`,
          detail: before ? `${before} plays while they were active${after ? `, ${after} after` : ""}` : null,
          link: { view: "artist", id: e.artistId || (R.slug && R.slug(e.name)) || e.name },
        };
      } catch (e2) { return null; }
    },
  },

  // ── 14. Taste chapter: the most distinct era of listening style (INSIGHTS.TASTE_ERAS) ──
  {
    id: "taste-era",
    source: "genres",
    label: "Reads INSIGHTS.TASTE_ERAS.eras — each chapter has start/end (YYYY-MM strings), topFams[{fam, hue, share}], and shift {up, down} for chapters after the first. Finds the era with the largest named genre pivot (shift.up.d or shift.down.d, each 0–100)",
    derive(R) {
      try {
        const TE = R && R.INSIGHTS && R.INSIGHTS.TASTE_ERAS;
        const eras = TE && TE.eras;
        if (!eras || eras.length < 2) return null;
        // find the era with the strongest shift
        let pivot = null, maxD = 0;
        for (const era of eras) {
          if (!era.shift) continue;
          const d = Math.max(era.shift.up ? era.shift.up.d || 0 : 0, era.shift.down ? era.shift.down.d || 0 : 0);
          if (d > maxD) { maxD = d; pivot = era; }
        }
        if (!pivot) {
          // fallback: report current chapter
          const last = eras[eras.length - 1];
          const top = last.topFams && last.topFams[0];
          if (!top) return null;
          return {
            text: `Your current listening chapter (from ${last.start.slice(0, 4)}) is defined by ${top.fam}`,
            detail: `${top.share}% family share in this period`,
            link: { view: "stories", id: "taste-chapters" },
          };
        }
        const up   = pivot.shift.up;
        const down = pivot.shift.down;
        const yearStr = pivot.start ? pivot.start.slice(0, 4) : "?";
        let changeDesc = "";
        if (up && down) changeDesc = `${up.fam} rose ${up.d}pp as ${down.fam} fell`;
        else if (up) changeDesc = `${up.fam} surged ${up.d} percentage-points`;
        else if (down) changeDesc = `${down.fam} dropped sharply`;
        return {
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
  const live = window.ROTATION_LIVE;
  const total = (live && live.total) || T.scrobbles;
  const w = live && live.week;

  const V = ({ n, sub, onClick }) => (
    <div onClick={onClick} style={{ cursor: onClick ? "pointer" : "default",
      padding: "14px 18px", flex: "1 1 120px" }}>
      <div style={{ fontFamily: "var(--serif)", fontStyle: "italic",
        fontSize: "clamp(24px,3vw,36px)", fontWeight: 600, lineHeight: 1 }}>
        {typeof n === "number" ? n.toLocaleString("en-US") : n}
      </div>
      <div style={{ fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: ".13em",
        textTransform: "uppercase", color: "var(--ink-faint)", marginTop: 7 }}>
        {sub}{onClick ? " ↗" : ""}
      </div>
    </div>
  );

  return (
    <div className="r-card" style={{ display: "flex", flexWrap: "wrap", gap: 0,
      borderRadius: 10, overflow: "hidden", marginBottom: 28 }}>
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
      fontFamily: "var(--mono)", fontSize: 8.5, letterSpacing: ".12em",
      textTransform: "uppercase", padding: "2px 8px", borderRadius: 999,
      background: `oklch(0.72 0.14 ${def.hue} / 0.15)`,
      color: `oklch(0.74 0.13 ${def.hue})`,
      border: `1px solid oklch(0.72 0.14 ${def.hue} / 0.3)`,
      flexShrink: 0,
    }}>{def.label}</span>
  );
}

// ─────────────────────────────────────────────────────────────────
//  FACT CARD
// ─────────────────────────────────────────────────────────────────
function FactCard({ rule, result, go }) {
  const [expanded, setExpanded] = React.useState(false);

  const handleLink = () => {
    if (!result.link) return;
    go(result.link.view, result.link.id || undefined);
  };

  return (
    <div className="r-card" style={{
      padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10,
      cursor: result.link ? "pointer" : "default",
    }}
    onClick={result.link ? handleLink : undefined}>
      {/* header row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <SourceChip src={rule.source} />
        {result.link && (
          <span style={{ marginLeft: "auto", fontFamily: "var(--mono)", fontSize: 9,
            color: "var(--accent)", flexShrink: 0 }}>→</span>
        )}
      </div>

      {/* main text */}
      <div style={{ fontFamily: "var(--serif)", fontStyle: "italic",
        fontSize: "clamp(14px,1.5vw,17px)", lineHeight: 1.55, color: "var(--ink)" }}>
        {result.text}
      </div>

      {/* detail */}
      {result.detail && (
        <div style={{ fontFamily: "var(--mono)", fontSize: 10.5,
          color: "var(--ink-soft)", lineHeight: 1.4 }}>
          {result.detail}
        </div>
      )}

      {/* expandable "how" line */}
      <div style={{ marginTop: 4, borderTop: "1px solid var(--rule)", paddingTop: 8 }}>
        <button
          onClick={e => { e.stopPropagation(); setExpanded(x => !x); }}
          style={{
            background: "none", border: "none", padding: 0, cursor: "pointer",
            fontFamily: "var(--mono)", fontSize: 9, letterSpacing: ".1em",
            textTransform: "uppercase", color: "var(--ink-faint)",
            display: "flex", alignItems: "center", gap: 6,
          }}>
          <span style={{ color: "var(--accent-dim)" }}>{expanded ? "▾" : "▸"}</span>
          how this was derived
        </button>
        {expanded && (
          <div style={{
            marginTop: 8, fontFamily: "var(--mono)", fontSize: 10,
            color: "var(--ink-soft)", lineHeight: 1.55,
            background: "var(--bg-3)", borderRadius: 6, padding: "10px 12px",
          }}>
            <span style={{ color: "var(--ink-faint)", fontSize: 9, letterSpacing: ".08em",
              textTransform: "uppercase" }}>rule id: </span>
            <span style={{ color: "var(--accent-dim)" }}>{rule.id}</span>
            <br />
            <span style={{ color: "var(--ink-faint)", fontSize: 9, letterSpacing: ".08em",
              textTransform: "uppercase" }}>source: </span>
            <span>{rule.source}</span>
            <br /><br />
            {rule.label}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  NULL CARD (when a rule returns null — shown in audit mode only)
// ─────────────────────────────────────────────────────────────────
function NullCard({ rule }) {
  const [show, setShow] = React.useState(false);
  return (
    <div style={{
      padding: "10px 14px", borderRadius: 8,
      border: "1px dashed var(--rule)", opacity: 0.5,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <SourceChip src={rule.source} />
        <span style={{ fontFamily: "var(--mono)", fontSize: 9.5, color: "var(--ink-faint)" }}>
          {rule.id} — no data
        </span>
        <button onClick={() => setShow(x => !x)} style={{
          marginLeft: "auto", background: "none", border: "none", cursor: "pointer",
          fontFamily: "var(--mono)", fontSize: 8.5, color: "var(--ink-faint)",
        }}>{show ? "hide" : "why?"}</button>
      </div>
      {show && (
        <div style={{ marginTop: 8, fontFamily: "var(--mono)", fontSize: 9.5,
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

  // Run all rules — guarded so one crash never kills the page
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
    <div className="r-view" style={{ maxWidth: 800, margin: "0 auto" }}>
      {/* header */}
      <div style={{ marginBottom: 28 }}>
        <div className="r-kicker">Lab 2</div>
        <h1 className="r-title">Overview Makeover<span className="dot">.</span></h1>
        <p className="r-lede" style={{ marginTop: 8 }}>
          A prototype driven by a legible fact-derivation system. Each card tells
          you what it found and how it found it — every rule is readable in{" "}
          <code style={{ fontFamily: "var(--mono)", fontSize: 12,
            color: "var(--accent-dim)", background: "var(--bg-3)",
            padding: "1px 5px", borderRadius: 4 }}>rotation-lab2.jsx</code>.
        </p>
        <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-faint)",
          marginTop: 10, letterSpacing: ".14em", textTransform: "uppercase",
          display: "flex", alignItems: "center", gap: 16 }}>
          <a href="#overview" style={{ color: "var(--accent)", textDecoration: "none" }}>← back to overview</a>
          <span style={{ color: "var(--rule-2)" }}>|</span>
          <span>{fired.length} fact{fired.length !== 1 ? "s" : ""} derived · {missed.length} rule{missed.length !== 1 ? "s" : ""} returned null</span>
        </div>
      </div>

      {/* vitals row */}
      {R && <Lab2Vitals R={R} go={window.__lab2Go || (() => {})} />}

      {/* section header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 16 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: ".18em",
          textTransform: "uppercase", color: "var(--ink-faint)" }}>
          What the site learned
        </div>
        <button
          onClick={() => setShowNulls(x => !x)}
          style={{ background: "none", border: "1px solid var(--rule)", borderRadius: 999,
            padding: "4px 12px", fontFamily: "var(--mono)", fontSize: 8.5, letterSpacing: ".1em",
            textTransform: "uppercase", color: "var(--ink-faint)", cursor: "pointer" }}>
          {showNulls ? "hide nulls" : "audit all rules"}
        </button>
      </div>

      {/* fact cards grid */}
      {!R && (
        <div className="r-card" style={{ padding: 32, textAlign: "center",
          fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-faint)" }}>
          waiting for window.ROTATION…
        </div>
      )}

      {fired.length > 0 && (
        <div style={{ display: "grid", gap: 16,
          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}>
          {fired.map(({ rule, result }) => (
            <FactCard key={rule.id} rule={rule} result={result}
              go={window.__lab2Go || (() => {})} />
          ))}
        </div>
      )}

      {fired.length === 0 && R && (
        <div className="r-card" style={{ padding: 32, textAlign: "center",
          fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-faint)" }}>
          no facts fired — check that music-core.js loaded
        </div>
      )}

      {/* null cards (audit mode) */}
      {showNulls && missed.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: ".16em",
            textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: 12 }}>
            Rules that returned null (data absent or guard triggered)
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {missed.map(({ rule }) => <NullCard key={rule.id} rule={rule} />)}
          </div>
        </div>
      )}

      {/* footer */}
      <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid var(--rule)",
        fontFamily: "var(--mono)", fontSize: 9.5, color: "var(--ink-faint)",
        letterSpacing: ".1em", lineHeight: 1.8 }}>
        <div>prototype — rules in <span style={{ color: "var(--accent-dim)" }}>rotation-lab2.jsx</span></div>
        <div style={{ marginTop: 4 }}>
          {FACT_RULES.length} rules · {fired.length} fired · {missed.length} null ·
          sources: {[...new Set(FACT_RULES.map(r => r.source))].join(", ")}
        </div>
      </div>

      <style>{`
        .lab2-go-link { color: var(--accent); text-decoration: none; cursor: pointer; }
        .lab2-go-link:hover { text-decoration: underline; }
      `}</style>
    </div>
  );
}

// Wire up go() — the Lab2View needs it but receives it indirectly. Since Lab2View
// is rendered by RotationApp (which owns go), we expose it via a global that the
// view reads. RotationApp calls Object.assign(window, { __lab2Go: go }) after
// mounting (see rotation-app.jsx patch). Fallback: no-op.
