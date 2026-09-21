> Part of the fuad.au docs — start at [/GUIDE.md](/GUIDE.md)

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
full ~30k-artist tail — large, for a small accuracy gain. **→ The planned fix is the Tier-2/3
long-tail enrichment in ROADMAP Phase 4** (a compact, load-on-request `{familyIdx, country,
plays}` for the whole tail behind an opt-in) — makes these slices exact when someone wants it,
without taxing first paint.

**So, to answer directly:** date-filtered and lifetime numbers are *actual totals*; place/genre
numbers are *based on the ~4,000-artist EXPLORE set* and read a touch low. **Options if it ever
matters:** (a) show a subtle "~" / "of tagged plays" hint on slice stats so it reads as scoped,
not wrong; (b) ship a compact per-artist {country, familyIdx, plays} for the full tail to make
slices exact (heaviest cost); (c) leave as-is (recommended — 90% coverage, tiny per-artist tail).

## 2. Hash filter codes — ✅ RESOLVED 2026-07-07 (now name-based, matches Explore)

The Overview map genre filter used to serialise the **array index** (`#overview/f=5`), which
would silently break if the `FAMILIES`/`SUBS` order ever changed. **Fixed:** it now serialises
the **name** (`#overview/f=Japanese`, `s=<subgenre>`) and resolves back via a normalised match
(lowercase-alphanumeric), exactly like Explore (`#explore/f=Industrial`). Verified: `f=Japanese`
restores identically to the old `f=5`.

**Residual (shared with Explore, low risk):** a **rename** of a family/subgenre still breaks old
bookmarks (a *reorder* no longer does). Renames are rare and the norm-match tolerates
case/punctuation drift. `Explore` cell filter (`c=1.5.9`, clock cells) is still index-based but
those indices are structural (168 hour×day cells), not reorderable.

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
  comparative wording. *(Partially tightened 2026-07-07 — see ROADMAP Phase 2 item 1.)*
- ~~Sounds/Reads CJK sentiment is n-gram NRC (no context model) — some JP tracks mislabelled;
  the transformer re-score is queued.~~ — **DONE.** The whole-lyric model replaced NRC valence
  corpus-wide (2026-08-27/28, MOOD_PIPELINE §3), the Japanese gap-fill fetched CJK lyrics by
  real name, and the 2026-09-21 refetch + full runs closed the corpus at 99.07% mood / 98.64%
  themes of the lyric layer (§8 for what is left).
- Tracks/artists without audio data silently drop the radar/quadrant cards (no "no data" note).
- ~~`blurb-demo.js` still ships~~ — **retired 2026-07-18**; reads folded into `llm-about.js`.

## 6b. Design decisions to deliberate before building (Fuad, 2026-07-07)

Surfacing the deep features is wanted, but needs design thought first — don't just bolt on:
- **Surface the text layer (Phase 2 items 1–3)** — a "read of the day" on Overview + 📖 markers
  on track rows + a coverage meter. **Blocked on: how to rearrange the Overview** to fit new
  modules (it's already dense). Decide the Overview layout before adding.
- **"No audio data" honesty note (Phase 2 item 4)** — needs a deliberate implementation (where/how
  it reads as data, not an error) rather than a quick line.
- ~~**Stories is getting large** — it's fine to keep adding, but Stories itself wants a
  **restructure**, possibly into a quasi-**book** (chapters/table-of-contents/paging, a real
  reading experience) rather than one long feed. Do this thinking before piling on more cards.~~
  → **DONE 2026-09-21.** The book exists: nine chapters, 41 sections, a TOC rail, and The
  Reading as the closing verdict. The thinking that was asked for happened at the re-cut, not
  before each card — see ARCHITECTURE §8 "Stories" for the chapter inventory and the merge/
  retirement rules that came with it. **The new standing constraint is placement, not size:**
  a new module has to earn a chapter and an adjacency, and the chapter titles are the argument.
- **Artist-page Phase-3 strips (item 5)** — surfacing per-artist segues / lifecycle shape /
  seasonality on the artist page. Cool, but future — pairs with the Stories restructure.

## 7. Platform nice-to-haves (deferred from Phase 0)

- ~~PWA/offline~~ — **shipped 2026-07-18** (`manifest.webmanifest` + `sw.js` tiered cache +
  icons; cache epoch = staged-content digest); **genuinely offline since 2026-09-21** — see
  ARCHITECTURE §8 "PWA", offline v1. Residual: per-artist data is still cache-on-use, so an
  artist page never opened is not available offline, and a first-ever visit primes nothing.
- **ListenBrainz mirror** of the scrobble history (insurance) — needs Fuad's LB account/token.
- **Self-hosted fonts** — cosmetic-only failure mode; Google Fonts still a third-party request.
- **MapView pan/zoom** uses the same state-per-frame idiom TourMap had — audit for the same fix.

## 8. The lyric layer's ceilings — ✅ MEASURED 2026-09-21 (not a backlog)

The mood/themes work queue is **drained**, so what is missing is now a ceiling with a named
cause rather than an un-run batch. Against `genius-lyrics.json`'s 28,755 keys:

| still unclassified | mood | themes |
|---|---|---|
| no obtainable lyric (LRCLIB not-found, cached negative) | 110 | 73 |
| instrumental — correctly absent | 54 | 29 |
| body too short to score | 13 | 11 |
| scored, **refused by the coherence gate** | 91 | — |
| no theme above the 0.24 anchor floor | — | 277 |
| **total** | **268** | **390** |

Two of those rows are *refusals*, not gaps, and they should not be "fixed" by loosening a gate:

- **The 91** are MOOD_PIPELINE §4's *triumphant aggression* class — a bright valence over a
  dark register, on a new row with no NRC valence to fall back on. The existing-row policy
  (keep NRC, flag `2`, call it **cathartic**) has nothing to keep, so the honest answer is to
  refuse the row. Scoring them anyway would put a wrong number in a store whose whole point is
  that the number means something.
- **The 277** are tracks the 18-anchor space genuinely has no bucket for: near-wordless hooks,
  ad-libs, spoken intros. A bucket invented to absorb them would be a junk drawer that then
  shows up in the Lyrical diet as if it were a theme.

**Closed since this table was measured:** the 59 pre-Qwen straggler rows. They could not go in
through the append-only emitters (writing them mutates existing rows, which the emit proofs
forbid by construction), so mutation got its own tool with mutation-shaped proofs —
`tools/mood-update.js`, MOOD_PIPELINE §7.6. **51 were written** (row count unchanged at 28,752;
flag `1` rows 27,767 → 27,818 — a mutation, not a growth); **8 stay three-element honestly** —
3 instrumental and 4 not-found never reached the scorer, and 1 was refused by the coherence
gate. Those 8 are a separate set from the table above, which the write did not change.

**Still open:** the 10 rejected 2026-08 gap-fill reads await the owner's study.

Coverage is counted against the lyric layer, never as rows ÷ keys — both stores hold a few
rows for keys the lyric layer no longer lists (folds, retired spellings) and counting those
would flatter the number. Full method + run log: `rotation/tools/README.md`.
