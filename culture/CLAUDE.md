> Part of the fuad.au docs — start at [/GUIDE.md](/GUIDE.md)

# Culture_2 — architecture & working notes

A single-page, in-browser React app (Babel-in-the-browser, no build step) that renders
Fuad's personal media library — films, TV, games, animation, books — as browsable
"stacks" (cover art) and "spines", with a Reader detail view, stats, and a wishlist.

**If you only read one thing:** data lives in a few hand-authored `.js` files; everything
else (`*_data.js`, `badges.js`, `notes_en.js`, …) is a **generated overlay keyed by item
`id`**, merged at runtime. After ANY data change, **bump `?v=` in `index.html`** or the
browser serves stale files. See `docs/DATA_PIPELINE.md` for the update runbook and
`docs/SCRIPTS.md` for what every Python script does.

**PWA (2026-07-18):** `manifest.webmanifest` + `sw.js` (tiered cache, epoch-stamped at
deploy) + icons — the app is installable. `index.html` has description/favicon/OG/Twitter
meta; title is "Culture · fuad.au".

## Data model

Three **hand-authored** datasets (you edit these directly):

| File | `window.` global | Role | Renders as |
|---|---|---|---|
| `data.js` | `CULTURE.ITEMS` (+ `REGION_NAMES/COLORS`, `HIGHLIGHTS`, `MEDIA`, …) | curated canon | **stacks** (covers) |
| `imports.js` | `CULTURE_IMPORTS` | bulk Filmweb "seen" history | **spines** |
| `wishlist.js` | `CULTURE_WISHLIST` | unseen / to-watch | wishlist view |

An item is a flat object: `{ id, title, year, medium, region, rating, director, runtime,
highlights:[…], favorite, watchedDate, poster?, note?, … }`. `id` is the join key for
every overlay. `medium ∈ {Movies, TV, Games, Animated Series, Feature Animation, Books,
Shorts}` drives shelf grouping.

### Generated overlays (DO NOT hand-edit — regenerate)

All keyed by `id`, all merged at runtime. See the table in `docs/DATA_PIPELINE.md` for
which script + API produces each.

`cast_data.js` · `wishlist_cast.js` · `omdb_data.js` · `tmdb_data.js` · `books_data.js`
· `game_imdb.js` · `filmweb_notes.js` · `notes_en.js` · `badges.js` · `script_mood.js`

`script_mood.js` (`item.scriptMood = {v,e,m}`) = per-film **dialogue** mood from the local
transcript dataset, NRC-scored. Built by `build_script_mood.py` (reads the gitignored local
`archive_transcripts.zip` + `.film-index.json` from `node dump_films.js`; needs the NRC lexicon
in `../../.sptmp/nrc/`). Local-only build, committed output. `v` = valence 0–100 (low = reads
dark); it measures what characters *say*, not the film's tone (Requiem reads ~60), so label it
"dialogue reads", not "how dark the film is".

Two of these compile from **hand-edited source JSON**: `badges.js ← badges_source.json`
(via `build_badges.py`) and `notes_en.js ← notes_en_source.json` (via `build_notes_en.py`).

## Lazy loading (2026-07-18 — major architecture change)

`index.html` now eagerly loads **only** `data.js`, `imports.js`, and `badges.js` (~830 KB).
The heavy id-keyed overlays are split into two lazy sets and injected at runtime by
`loadLazySet()` in `culture-v2.jsx`:

- **reader set** (`cast_data`, `omdb_data`, `books_data`, `game_imdb`, `filmweb_notes`,
  `notes_en`, `tmdb_data`, `script_mood`, `interpretations`) — loaded on first Reader open.
- **wishlist set** (`wishlist`, `wishlist_cast`, `wishlist_pred`, `wishlist_blurbs`) —
  loaded on first Wishlist or Tonight entry.

Both sets are also preloaded by a 2.5-second idle timer after boot, so they are usually
resident before the first click. A `dataTick` state counter triggers a re-run of
`seenItems`/`wishlistItems` enrichment whenever a lazy set lands. Deep-linked `?open=`
URLs wait for their pool before resolving; the Reader re-resolves its item by id after
each tick.

## Runtime assembly (`culture-v2.jsx`)

```
seenItems     = (data.js + imports.js)
                  ⊕ cast_data.js        (spread in: cast, crew, tmdbPoster, igdb fields)
                  ⊕ enrichExtras(item)  (attaches omdb, books, game_imdb, filmweb note,
                                         notes_en, tmdb synopsis, badges; poster fallback)
wishlistItems = wishlist.js ⊕ wishlist_cast.js ⊕ enrichExtras
```

`enrichExtras()` is the single merge point for the id-keyed overlays.

### Cover / poster resolution (order)
`item.poster` (hand-picked `POSTER('x.jpg')` in data.js) → `item.tmdbPoster` (from
`cast_data.js`, all `image.tmdb.org`) → **OMDb `Poster`** (fallback added in `enrichExtras`
when no hand/cast art) → `igdbCover` / `bookCover`. There is **no** separate omdb-poster
field; OMDb art is folded into `tmdbPoster` at enrich time.

### Stack vs spine
An item renders as a **cover/stack** iff `favorite === true || item.poster` (see
`coverWorthy`); otherwise it's a **spine**. So data.js favorites are stacks; imports/wishlist
are spines unless promoted with a hand-picked poster. Moving an item between data.js and
imports.js, or toggling `favorite`, changes this.

## Stats filters (2026-07-18)

The Stats modal now includes **animation-director**, **production-company**, and
**composer** histograms as filter pills, wired to the library the same way directors,
actors, and regions are. Clicking a bar or pill narrows the main shelf; a "clear all"
resets all active stat filters.

## A11y / mobile (2026-07-18)

Shelf items and badge-explorer covers are keyboard-reachable (`role=button`, `tabIndex`,
`Enter`/Space handlers). At `<768px`, header controls collapse into a single horizontally-
scrollable strip.

## Conventions

- **Badges/highlights**: base highlights live INLINE in the data files
  (`highlights: ['visuals', …]`); curated ADDITIONS live in `badges_source.json` →
  compiled to `badges.js`, merged additively at runtime. To audit a badge you must UNION
  inline + curated (auditing only `badges_source.json` undercounts). Badge key→{emoji,label}
  is the `HIGHLIGHTS` map in `culture-v2.jsx`.
- **Regions**: `REGION_NAMES` + `REGION_COLORS` in `data.js`/`culture-v2.jsx` (2-letter
  codes, e.g. `jp`, `cn`, `ge`; `eu`/`other` are catch-alls). Add a code in BOTH maps.
- **Notes**: Polish inline `note:` is the original; `notes_en_source.json` holds the EN
  redraft (→ `notes_en.js`, shown click-to-translate in the Reader).
- **Cache-busting**: every `<script>`/`<link>` in `index.html` has `?v=N`. **Bump N on any
  data/code change** or browsers serve cached files. `build_all.py` automates the bump.

## Golden rules

1. **Bump `?v=` — but keep the epoch MANUAL and SHARED.** The lazy loader in
   `culture-v2.jsx` reuses the page's manual `?v=` epoch when injecting overlay URLs at
   runtime — per-file auto-hashing would break it. `build_all.py` automates the bump of
   the *shared* epoch across all files in `index.html`. Do not switch to per-file hashes
   here (Canvas uses auto-hashing; Culture must not).
2. Generated overlays are machine-owned — change the SOURCE (script or `*_source.json`)
   and regenerate, never hand-edit `*_data.js` / `badges.js` / `notes_en.js`.
3. **Source-mutator scripts rewrite your hand-authored files in place** — review the diff.
   See the ⚠ list in `docs/SCRIPTS.md`.
4. OMDb/TMDB usually carry the same poster art — "IMDb poster" you see is likely TMDB via
   `cast_data.js`.
5. Push to `master` is fine; safe to test in production.

## Map of docs
- `docs/DATA_PIPELINE.md` — overlay table, **update runbook** (run order), mutator warnings.
- `docs/SCRIPTS.md` — every Python script: purpose, I/O, status.
- `badge_proposal.md`, `badge_fishout.md`, `funny_taxonomy.md`, `taste_profile_plan.md` —
  thematic taxonomy working docs. `backlog.md` — open data-coverage TODOs.
