# Rotation — known limitations & nice-to-haves

> A running list of things that are approximate, brittle, or deferred — written down so they
> can be reviewed and prioritised, not lost. Companion to ROADMAP.md (the build queue) and
> AUDIT-2026-07.md (the assessment). Add to this whenever a corner is cut deliberately.

---

## 1. Filtered stats are EXPLORE-scoped (~90% of plays), not full totals

**What.** On the Overview, when you filter the map by **place or genre**, the reactive stats
(hours, distinct artists, **avg/day, share-of-history**) are computed over the **EXPLORE
universe = 4,064 artists = 90.3% of all scrobbles**. The long-tail ~9.7% (artists too small to
enter EXPLORE) are **not counted** in a place/genre slice.

- **Date filter** (year / calendar day-week-month) and **lifetime** stats use the **full
  scrobble total** (`day-series.js` / `TOTALS`) — those are exact.
- **Place/genre slice** stats use the map's count (`fStats.plays`) — a slight **undercount**
  (up to ~10%, usually less, since the missing artists are individually tiny).

**Why.** EXPLORE is the tagged/kept universe the map is built from; the long tail has no
genre/geo metadata to filter on. Fixing it would mean shipping per-artist geo+genre for the
full ~30k-artist tail — large, for a small accuracy gain.

**So, to answer directly:** date-filtered and lifetime numbers are *actual totals*; place/genre
numbers are *based on the ~4,000-artist EXPLORE set* and read a touch low. **Options if it ever
matters:** (a) show a subtle "~" / "of tagged plays" hint on slice stats so it reads as scoped,
not wrong; (b) ship a compact per-artist {country, familyIdx, plays} for the full tail to make
slices exact (heaviest cost); (c) leave as-is (recommended — 90% coverage, tiny per-artist tail).

## 2. Hash filter codes are index-based and terse (`f=5`, `s=<n>`, `c=1.5.9`)

**What.** The Overview map genre filter serialises the **family/subgenre array index**
(`#overview/f=5` = "Japanese" = `FAMILIES[5]`). Explore's cell filter (`c=1.5.9`) is likewise
index-based.

**The risk you flagged — it's real.** These indices come from the `FAMILIES` / `SUBS` arrays in
`build-data.js`. If that order ever changes (add / remove / reorder a family or subgenre), **old
bookmarks silently point at a different genre** — `f=5` might become "Hip-hop". There's no
version guard.

**Inconsistency to note:** Explore's *family* filter already uses the **name**
(`#explore/f=Industrial`, stable) while the Overview map uses the **index** (`f=5`, brittle).
So the codebase is of two minds.

**Options (for a later call — not fixed yet):**
- **(a) Use names everywhere** — `#overview/g=japanese` (family) / `g=japanese.shoegaze`
  (sub). Stable across reorders, human-readable, matches Explore. Restore = look up by name.
  *Recommended.* Cost: a small name↔index map on read; slightly longer URLs.
- **(b) Keep indices but freeze the order** — pin `FAMILIES`/`SUBS` order in build-data with a
  "never reorder, only append" rule + a comment. Cheap, but a landmine for future edits.
- **(c) Version the hash** — prefix a schema version and migrate. Overkill for a personal site.

**Current family index map (for reference, 2026-07-07):**
`0 Nu-metal/alt-metal · 1 Metalcore/-core · 2 Industrial · 3 Thrash/heavy · 4 Prog/alt rock ·
5 Japanese · 6 Electronic/DnB · 7 Digital hardcore/hyperpop · 8 Hip-hop · 9 Punk/garage ·
10 Shoegaze/noise · 11 Pop/indie`

## 3. Heaviest-day doesn't react to a place/genre slice

Under a **place/genre-only** filter, "heaviest day" shows your **lifetime** heaviest, not the
slice's (e.g. not "your heaviest *Japanese* day"). It reacts correctly to **date** filters
(via `day-series`). A per-slice heaviest needs a per-day × place/family export (~300 KB gz for
one stat) — deferred as not worth it. **Option:** ship a `day×family` matrix (~40 KB) to at
least cover genre-family slices, if per-genre heaviest is wanted.

## 4. Map *dots* don't re-weight by a calendar day/week

Selecting a calendar day/week on the Overview rail filters the **Results** and the **stats**,
but the map **dots** stay all-time (they'd need a per-day × place export). The year scrubber
*does* re-weight the dots. Deferred (ROADMAP "known data-limited tandem").

## 5. Map place-selection isn't in the URL

`#overview/f=…` (genre) and `y=/p=` (date) serialise, but clicking a **city/country** on the
map doesn't (it needs the geo data loaded to restore a selection cleanly). So a place-filtered
map view isn't bookmarkable yet. Deferred.

## 6. Content-quality nice-to-haves (see ROADMAP Phase 2)

- "In your rotation, this track is…" gate is loose (weak outliers slip in); wants ≥85/≤15 +
  comparative wording.
- Sounds/Reads CJK sentiment is n-gram NRC (no context model) — some JP tracks mislabelled;
  the transformer re-score is queued.
- `blurb-demo.js` still ships (22 tracks' reads not yet folded into `llm-about`).
- Tracks/artists without audio data silently drop the radar/quadrant cards (no "no data" note).

## 7. Platform nice-to-haves (deferred from Phase 0)

- **ListenBrainz mirror** of the scrobble history (insurance) — needs Fuad's LB account/token.
- **Self-hosted fonts** — cosmetic-only failure mode; Google Fonts still a third-party request.
- **MapView pan/zoom** uses the same state-per-frame idiom TourMap had — audit for the same fix.
