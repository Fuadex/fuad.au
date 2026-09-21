> Part of the fuad.au docs — start at [/GUIDE.md](/GUIDE.md)

# Rotation — Architecture & Feature Inventory

> **The single source of truth for what this project is, how it works, and what it already has.**
> Read this before changing anything. When you ship a feature, update §8 (features) and, if data
> shapes changed, §6 (data model). Companion docs:
> - **ROADMAP.md** — audit findings, API catalogue, and the modular plan for what's next.
> - **CSV-OVERRIDES.md** — manual data corrections (gitignored, local only).
>
> Last full audit of this document: **2026-07-18**. Phase 0 platform work (precompile,
> self-hosted React, music-core/rest split, TourMap fix) folded in **2026-07-07** — see §2, §6.
> PWA shell, boot path, attributes-lens dot fixes, and Gigs pagers updated **2026-07-18**.
> **Documentation sweep 2026-09-21** — the pin architecture + answerless-body law (§4), the
> songs-anchor identity law + mb-lineups as primary source (§5), THEMES matrix/exemplarsAll +
> `mc` + the lineup shard (§6), the nine-chapter Stories re-cut + the Overview stat strip + PWA
> offline v1 (§8), and three new conventions (§10 items 12-14).

---

> Visual-language contracts (hue wheel, badge tones, glyphs, control idioms) live in
> **DESIGN.md** — the design system of record since 2026-08-13. Structure and data live here.

## 1. What this is

**Rotation** (fuad.au) is a personal listening-history observatory built on Fuad's real last.fm
scrobbles (**~319,000 plays, 2006 → today**, user `fuadex`). It is *not* a last.fm chart mirror —
the design brief is **derived narrative insight**: correlations, patterns, portraits, and stories
the raw data doesn't state directly. Mobile-first. The site doubles as a design playground
(tweakable accents/typography) and is a companion piece to *Culture* (`Culture v2.html`).

- **Hosting:** GitHub Pages (repo `Fuadex/fuad.au`, custom domain `fuad.au` via CNAME).
- **Philosophy:** buildless, no bundler, no server. Everything the browser runs is static files.
- **Testing:** in production. Push to `main` is the deploy pipeline. This is deliberate.

## 2. Runtime architecture

Buildless **authoring**, precompiled **deploy** (Phase 0, 2026-07-07). React 18.3.1 UMD is
**self-hosted** (`react(-dom).production.min.js` in `rotation/`, byte-identical to unpkg,
SRI-pinned) — production has **no third-party runtime dependency**. Locally, every `.jsx` still
loads as `<script type="text/babel">` and compiles in-browser via `@babel/standalone` (dev-only,
still from unpkg); the CI staging step (`stage-site.js`, gated on `apps.json` `"precompile":true`)
**Babel-transforms each `.jsx` → `.js` in the staged `_site/` only** and rewrites `index.html`
to drop the Babel tag and load `defer` compiled scripts. So prod ships finished JS — no ~700 KB
Babel download, no per-load compile — while the local workflow stays 100% buildless. No router
library — hash routing (`#view/id`) in `rotation-app.jsx` with `pushState` +
`popstate`/`hashchange` sync. Components communicate via `window` globals
(`Object.assign(window, {...})` at the bottom of each file).

### Script tiers

**Tier 0 — eager (in `index.html`, with `defer`; first paint is the boot placeholder):**
| File | Role |
|---|---|
| `react(-dom).production.min.js` | runtime — **self-hosted** (Phase 0); Babel is dev-only + CI-only, absent from prod |
| `music-core.js` (~2.1 MB raw) | `window.ROTATION` — light ARTISTS records + everything first paint reads; loaded with `defer` |
| `music-rest.js` | 11 heavy per-artist fields (bio, wd, members, topTracks, topAlbums, similar, similarNames, styles, discogsGenres, spotGenres, origin) in an id-keyed `ARTIST_X` map — **injected by `rotation-app` after first mount**, folds fields back onto the same ARTISTS record objects via `Object.assign`, flips `_restLoaded` |
| `live-data.js` (~4 KB) | `window.ROTATION_LIVE` — daily live snapshot; loaded with `defer` |
| `rotation-live.jsx` | `useLiveNow()` — now-playing from the snapshot (no client API calls, ever) |
| `tweaks-panel.jsx` | design-tweaks drawer (accent hue, font, chart style, layout, density) |
| `rotation-core.jsx` | CSS + shared primitives: `GenCover`, `Spark`, `Bars`, `Radar`, hooks, `fmt` |
| `rotation-insights.jsx` | insight-engine (PROVIDERS array) + `InsightRow` |
| `rotation-views1.jsx` | `OverviewView`, `Popover`, `WallGrid`/`BubbleField` |
| `rotation-views2.jsx` | `ArtistView`, `AlbumView`, `TrackView`, `LiveView`, shared audio widgets |
| `rotation-worldmap.jsx` | `MapView` + `MapFlow` |
| `rotation-views3.jsx` | `StoriesView`, `SearchOverlay` |
| `rotation-explore.jsx` | `ExploreView` + filter machinery |
| `rotation-journey.jsx` | `StreamGraph` (shared by MapFlow / ArtistFlow) |
| `rotation-calendar.jsx` | `CalendarView` |
| `rotation-app.jsx` | shell: nav, routing, popover/search layers, tweaks wiring |

**Tier 1 — lazy (injected `<script>` on first need):**
| File | Global | Size | Loaded when |
|---|---|---|---|
| `day-series.js` | `ROTATION_DAYS` | ~18 KB / 7 KB gz | Overview mount — flat per-day play counts; powers the filter-reactive stat strip |
| `search-index.js` | `ROTATION_SEARCH` | ~360 KB | search overlay opens (`/`) |
| `media-index.js` | `ROTATION_MEDIA` | ~6.8 MB | Explore albums/tracks tab, Album/Track view, song search |
| `track-audio.js` | `ROTATION_TRACKAUDIO` | ~2.7 MB | TrackView |
| `track-previews.js` | `ROTATION_PREVIEWS` | ~2.4 MB | TrackView (30-s Spotify preview hashes; `PreviewBtn` rebuilds `p.scdn.co/mp3-preview/<hash>?cid=…`, constant cid) |
| `artist-flow.js` | `ROTATION_FLOW` | ~2.8 MB | first artist page ("How they played out") |
| `artist-detail.js` | `ROTATION_ADETAIL` | ~1.9 MB | long-tail mini artist page, Map lists |
| `world-map.js` | (topology + centroids) | ~98 KB | Map view |
| `geo-detail.js` | `ROTATION_GEO` | ~480 KB | first country/city selection on Map |
| `calendar.js` | `ROTATION_CAL` | ~128 KB | Calendar view |
| `calendar-detail.js` | `ROTATION_CAL_DETAIL` | ~2.1 MB | first day/week/month click |

Every routed view is wrapped in a `<Boundary>` (rotation-core) — a crash inside one page renders
a fallback card instead of blanking the site. Unknown hashes render a not-found card. The
`spotify-liked`/`spotify-engagement` overlays are **not** in `<head>` — `rotation-app` lazy-injects
them post-mount via `<script>` tags with `onerror` fail-opens (absent files just mean no hearts/bars).
The book vendor (`vendor-page-flip.js`) failure shows a message instead of crashing.

**Deploys are CI-built (since 2026-07-03):** Pages source = "GitHub Actions". The workflow builds
the dataset and uploads an explicit `_site/` staging list — generated data files are **not in
git** (`.gitignore`d; only `fuadex.csv`, caches, code, and the static `world-map.js` are
committed). `_config.yml` is a leftover from the Jekyll era, kept only as a rollback path.

**`stage-site.js` hard-fails on any missing file** (always, not only in CI — a local stage with
gaps is a broken bundle). `build-data.js` prints a readable `FATAL` if `fuadex.csv` is absent.
Hub root `index.html` is content-hash stamped (including `hub.css`) by `stage-site`'s `stampHashes`.

## 3. Data pipeline

```
last.fm API ──sync-csv.js──▶ fuadex.csv (20 MB, one row per scrobble, durable overrides applied)
                                   │
   enrichment caches (*.json) ─────┤
                                   ▼
                            build-data.js  (~11 s, local Node or GitHub Action)
                                   │
        ┌──────────────────────────┼─────────────────────────────┐
        ▼                          ▼                             ▼
  music-core.js +          9 lazy data files              console stats
  music-rest.js       (media-index, track-audio, …)
 (window.ROTATION)

last.fm API ──sync-live.js──▶ live-data.js (now playing, week/month windows, mood-lately, 72h clock)
```

- **Daily automation:** `.github/workflows/sync.yml` (cron 06:17 UTC + every push to main),
  three jobs: **build** (`sync-csv` → `build-data` → `sync-live` → `smoke.js` gate → stage
  `_site/`) → **deploy** (`deploy-pages`) → **persist** (commits the CSV delta *after* deploy —
  committing mid-build advanced HEAD and made Pages reject the deployment; fixed 2026-07-03).
  Secrets: `LASTFM_API_KEY`.
- **Weekly enrichment:** `.github/workflows/enrich.yml` (Mondays 07:40 UTC) incrementally
  refreshes last.fm tags/stats/bios + MusicBrainz origins/aliases for artists new to the
  library, committing the caches. Archive-based and Discogs enrichment stay local.
- **`sync-csv.js` `fixRow()`** applies durable manual corrections on every pull (see
  CSV-OVERRIDES.md): `<Unknown>`-artist recovery, Linkin Park "Mój Album" remap, bracket-tag /
  disc-number album merging.
- Local rebuild: `node build-data.js` from the repo root. No npm dependencies (stdlib only).

## 4. Enrichment layer

Each `enrich-*.js` is a standalone Node script that fills a JSON cache; `build-data.js` reads
whatever caches exist (all optional, graceful fallback). Keys live in env vars — **never in code,
never committed** (last.fm + Spotify keys live in `culture/.env`).

| Script | Source | Output cache | What it holds |
|---|---|---|---|
| `enrich-tags.js` | last.fm | `tag-cache.json` | artist → weighted tags (drives GENRES/families) |
| `enrich-stats.js` | last.fm | `artist-stats.json` | global listeners/playcount (underground index) |
| `enrich-bios.js` | last.fm | `artist-bios.json` | bios + **real** similar-artists lists |
| `enrich-mb.js` | MusicBrainz | `artist-mb.json` | mbid, relations (member-of), release-groups |
| `enrich-aliases.js` | MusicBrainz | `artist-aliases.json` | aliases (cross-script: ミドリ ↔ Midori) |
| `enrich-origins.js` | MusicBrainz | `artist-origins.json` | origin country/city, type Group/Person, **gender** (928), **life-span/ended** (358 disbanded) — 4,764 artists |
| — (manual) | — | `city-coords.json` | city → lat/lng for the map |
| `enrich-discogs.js` | Discogs | `discogs-cache.json` | weighted styles/genres per artist |
| `enrich-discogs-artist.js` | Discogs | `discogs-artist.json` | profile, members, URLs, images |
| `enrich-images.js` | Discogs | `artist-images.json` | primary artist images |
| `enrich-spotify.js` | Spotify API | `spotify-cache.json` | artist id/img/genres (post-2026 API gives little more) |
| `enrich-spotify-archive.js` | **local catalogue dataset** (`archive.zip`, local-only) | `spotify-albumart.json` (17,726 covers), `spotify-albummeta.json`, `spotify-artist-img.json`, `spotify-genres.json` | album covers, release year/type/label, artist imgs, genres |
| `.sptmp/cover-audit.js` + `caa-probe.js` (local) | dump raw join + MusicBrainz/CAA | `spotify-albumart-extra.json`, `spotify-albummeta-extra.json` | conservative fuzzy + Cover-Art-Archive cover fills; merged additively (base wins), safe from `--rematch` |
| `.sptmp/stage1-query.js` + `stage2-query.js` (local, archive pass 2) | dump parquets | `spotify-ids-derived.json` (462 name+title-corroborated artist ids), `spotify-albtracks.json` (total_tracks → media `[9]`), `spotify-genres-extra.json`, `spotify-track-links.json` (**39k ISRCs** + preview hashes + disc), `spotify-track-extra.json`, `spotify-collabs.json` (5,730 credit edges, unfiltered — play-filter at build when the feature ships) |
| `enrich-coverage.js` | (local caches + CSV) | console report | per-cache coverage by play-band + head-gap offenders — run before deciding any enrichment expansion |
| `enrich-spotify-tracks.js` | local catalogue dataset | `spotify-track-data.json` | per-track audio features (36.9k tracks; §6) |
| `extract-audio.js` | (aggregates track data) | `audio-features.json` | artist-level Sound DNA |
| `enrich-concerts.js` | Ticketmaster Discovery | `concerts-cache.json` | upcoming events, top-200 artists — **cache currently absent → Live tab hidden** |

**Archive workflow (heavy, local-only):** parquets are streamed out of `archive.zip` one at a time
into `../../.sptmp` (outside the repo), queried with DuckDB (`../../.dtmp/node_modules`, via NODE_PATH,
`PRAGMA memory_limit='48GB'`), then deleted. `archive.zip` + `*.parquet` are gitignored.
⚠ `node_modules` is **NOT** gitignored in this repo — never `npm install` here; use `../../.dtmp` /
`../../.sptmp` / `../../.babelcheck` at the GitHub root.

**`mb-lineups.json`** (crawl script local; see §5 "Lineups") — **1,061 bands / 4,919 member
entries** as of 2026-09-21, `{mbid, fetched, members:[{name, mbid, gender, roles[], begin, end,
current}]}`. It is the **primary** lineup/gender source (§5). *(The in-code comments quoting
1,001 / 4,633 predate the 2026-09-21 crawl extension — measure the file, don't quote them.)*

### The pin architecture (2026-09-21) — read this before touching any enricher

Known enrichment fragility: name-ambiguous artists cache the **wrong entity**, and because
every downstream store is fetched *under an mbid*, one poisoned id quietly poisons a whole
column of the payload. The durable fix is a three-layer model:

```
  artist-stats.json  ← the RAW last.fm layer. Whatever last.fm resolved. Never corrected in place.
        ↓ (beaten by)
  pins.json          ← the DURABLE CORRECTION LEDGER. Hand-audited, songs-verified, tracked.
        ↓ (both read by)
  every enricher + build-data's two mbid-as-identity sites
```

- **`enrich-stats.js` stays the raw layer *by design*** — it never fetches under an mbid, so it
  has nothing to correct; its write site says so in a comment (`enrich-stats.js:39`) and points
  at pins as the layer that wins downstream. **Do not "fix" a wrong id there.** A future last.fm
  scrape is expected to rewrite it, and that must not be able to re-poison anything.
- **Every enricher that FETCHES OR JOINS under an artist mbid takes the pin first**, via one
  identical helper — `const mbidFor = (stats, name) => (PINS[name] && PINS[name].mbid) ||
  (stats[name] && stats[name].mbid) || ""`. Six scripts carry it: `enrich-mb.js:62`,
  `enrich-origins.js:54`, `enrich-members.js:71`, `enrich-aliases.js:31`,
  `enrich-wikidata.js:55` (the Wikidata P434 MBID→entity join), `enrich-tm.js:60` (the `byMbid`
  Ticketmaster join). A **pinned name is also never blind name-searched again**
  (`enrich-origins.js:111`). That set is the complete re-poisoning surface — if you add an
  enricher that touches an mbid, it joins this list.
- **`build-data.js` consults pins at read time** (`:357`, `pinOf` at `:358`, 17 consumption
  sites) and, critically, at its **two mbid-as-identity sites**: the **CANON grouping key**
  (`:1164` — `mb ? "mb:"+mb : "nm:"+normName`, which decides which scrobble spellings are one
  artist; it uses raw `PINS[name]` rather than `pinOf` because ALIAS_NAMES isn't built yet at
  that point) and **`mbidOf`** in the CONNECTIONS block (`:3462`, used at `:3470` to collapse
  name variants into one graph node). **That first guard is what makes an un-merge permanent** —
  see the Eville/Evile case in §5.

**Ledger state 2026-09-21: 126 artist entries (plus a `_doc` key), 93 of them carrying an
`mbid`.** Every entry carries a `note` saying what was verified and what the stats-side id had
resolved to. Field inventory (counts measured 2026-09-21; the 2026-08-12 semantics below still
hold):

`note` 126 · `mbid` 93 · `clearImage` 25 · `origin` 20 · `clearStyles` 16 · `spotify` 15 ·
`tags` 15 · `bio` 14 · `react` 5 · `life` 5 · `died` 4 · `dropTags` 3 · `fam` 2 · `clearLife` 2 ·
`gender` 2 · `tmExclude` 1.

Pins field semantics (2026-08-12): `mbid`/`spotify`/`discogs` canonical ids ·
`clearStyles`/`clearLife` drop a wrong joined dataset · `origin`/`life`/`gender` hard overrides ·
`react` force the Reactivated badge (hand-curated ledger) · `tmExclude` skip a wrong-entity
Ticketmaster name-match (Bleach vs. an Italian tribute act) · `bio`/`tags`/`dropTags` override the
shipped bio/tag chips (Bleach multi-band last.fm text; LiSA collision tags) · `clearImage` skip a
wrong-entity Discogs/last.fm image and fall through to Spotify, whose cache entry can itself be
repointed by pinned id (the LiSA case: Discogs held an American Lisa, Spotify held BLACKPINK's —
cache repointed to the real LiSA by JP-market exact-casing search). *(No entry currently uses `discogs`.)*

### The answerless-body law (2026-09-21) — a parseable body is not proof of an answer

MusicBrainz returns **parseable JSON for its own failures** (`{"error":"Not Found"}` on a dead
mbid, the 503 rate-limit body, maintenance pages). The old guards accepted those and wrote an
**all-empty record**, which then **blocked its own retry** — `todo` skips cached names, so a
transient failure froze as permanent. That is the origin of the ~10.7% blank-stub class in both
`artist-mb.json` and `artist-origins.json` (the 594 + 661 entries).

The rule now: **an artist document without its own `id` is a FAILURE.** `enrich-mb.js:67-72` and
`enrich-origins.js:73-78` return `null` on `!json || !json.id`; every caller skips the write,
leaves the name **uncached** so the next run retries it, and **never clobbers a good record with
a blank** (`enrich-mb.js:124`; `enrich-origins.js:122/136/171`). Repair run: 1,328 rate-limited
refetches reclaimed 317 + 359 records with real data.

**`checkedEmpty: true` is a DATA-ONLY provenance tag, not a mechanism.** It marks records a
repair pass re-checked against MusicBrainz and confirmed genuinely empty at source — "this blank
is real, not a transient-failure stub". It currently sits on **262 rows in `artist-origins.json`
and 222 in `artist-mb.json`**, and **no code writes or reads it** (it entered via an ad-hoc
repair pass). It gates nothing; those records are skipped simply because they are in cache. It
was safe to add because every consumer reads named fields defensively — which was verified
before the marker went in. Treat it as a note to the next human, and don't build logic on it
without writing that logic first.

## 5. Identity & cross-cutting systems

- **THE slug contract (load-bearing — read this before writing any keying script).** Every
  dataset in Rotation joins on `slug()` from **`lib-slug.js`** (extracted 2026-07-11; build-data
  requires it, the frontend mirror is `R.slug` in rotation-core.jsx, and `smoke-test.js` freezes
  the contract in CI — e.g. `slug("ミドリ") === "a-2yw9ix"`). The empty→`"a-"+hash` fallback is
  what keeps CJK/non-Latin names apart: a plain ascii slug maps ALL of them to `""` and every
  key collides (this exact bug broke Spotify hearts/engagement for ミドリ in 2026-07). Rule:
  **never re-type the slug into a new script — `require("./lib-slug")`** (workshop scripts under
  `.sptmp/` included). Track/album keys are `artistSlug~titleSlug`; both halves must be non-empty
  (smoke-tested).
- **Artist id** = `slug(name)`: lowercase, non-alphanumerics → `-`; hash fallback `a-XXXXXXX` for
  fully non-Latin names. Same function at build time and runtime.
- **Album id** = `slug(artist)~slug(title)`; **Track id** = `slug(artist)~slug(track)` (routes
  `#album/…`, `#track/…` — mirrors media-index / track-audio keys).
- **Alias resolution:** `R.idForName(name)` — direct slug, then `ALIAS_TO_ID` (MusicBrainz
  aliases), then the **`CANON_MK` fuzzy tier** (2026-08-12): a `matchKey`-keyed map seeded from
  kept artists + their MB aliases + all HAND_MERGE folds (kept artists registered first so a fold
  can never shadow a real artist), plus leading-"the"-stripped keys. Catches source renames
  ("Wargasm (UK)") and spelling drift ("The Smashing Pumpkins") that the exact tiers miss — the
  New This Month ghost-new/dead-redirect fix. `R.played(name)` checks the ≥3-plays set through
  the same tiers.
- **Resolution layer (raw scrobbles → what you see).** One intermediary bridge sits between the
  raw last.fm rows and every display, so views never re-invent matching per card. Four stages,
  earliest to latest:
  1. **`folds.json` (identity, build-time merge).** Hand-auditable ledger of known artist/album/
     track spelling variants (`build-data.js` folds them at ingest — HAND_MERGE / ALBUM_FOLD /
     TRACK_MERGE). The variant name never survives into any Map; it's genuinely the same entity.
  2. **absorb / variant sidecars (aggregation links, rows preserved).** `album-absorb.js`
     (`ROTATION_ALBUM_ABSORB`, single→LP) and `variant-of.js` (`ROTATION_VARIANT_OF`). LINK not
     MERGE — the single/variant keeps its own browsable row; only aggregations + track→album nav
     resolve *through* the link. `R.resolveAlbum(key)` follows the absorb map (identity if unlinked
     or the sidecar hasn't loaded).
  3. **display-time match keys (`R.matchKey` / `R.matchKeyLoose`).** The last mile: when two data
     sources spell the same title differently at *render* time (a play row vs. an MB spine or an
     MB-kinds map), these give the shared normal form. `R.matchKey` = entity-decode (`R.decEnt`) +
     lowercase-alnum squash — the strict join key. `R.matchKeyLoose` additionally strips bracketed
     `feat.`/`ft.`/`featuring`/`with`/`w/` credits, `[Explicit]`/`(Explicit)`, and a trailing
     `- Single`, for when a play row carries a credit the canonical title omits (e.g. spine
     "Kingslayer" ↔ media "Kingslayer (feat. BABYMETAL)"). Defined in **build-data.js's emitted core
     IIFE** next to `slug()` (so it rides on `ROTATION` exactly like `R.slug`) — **never re-inline a
     `.toLowerCase().replace(/[^a-z0-9]+/g…)` title matcher in a view; call `R.matchKey`.**

  **Where new work belongs:** a new duplicate-spelling *class* → `folds.json` (identity). A new
  single that should feed its LP → an `absorb` entry (aggregation link, row kept). A view that needs
  to match a title from one source against another → `R.matchKey`/`matchKeyLoose` (the core API),
  never a fresh inline regex. **Auditing the ledger:** `../../.sptmp/fold-audit/audit-folds.js`
  (2026-08-12) mechanically ranks suspect spelling folds — title-core dissimilarity + interleaved
  independent play histories + local MB release-group evidence — born from the inverted NIN
  "Home" fold (a bulk-wave entry that renamed the canonical title INTO its bonus-track variant).
  Run it after any bulk fold wave; its only standing high scorers are the two deliberate
  LP-under-song-name exceptions (Nutronic, Daedric).
- **THE SONGS-ANCHOR IDENTITY LAW (hard, 2026-09-21 — Fuad: *"we should include a song-based
  test to follow-through"*).** Before **any** per-artist factual verdict — gender, vocals,
  origin, lifespan, lineup, mbid, similar — you must first establish **which real-world act the
  library artist IS**, by matching the owner's **scrobbled titles/albums** against the candidate
  entity's MusicBrainz catalogue. The bar: **≥2 title matches, or 1 plus strong corroboration.**
  Only then research that entity. A verdict whose identity step is missing is PLAUSIBLE at best,
  never CONFIRMED, and must not be applied.

  This is not a style preference; it is the lesson of a measured failure. The 2026-09 gender/vx
  audit confirmed its verdicts against whatever entity the **stored** mbid named — and when the
  songs test was applied retroactively, **9 of 12 applied vocals flips had to be reverted**: the
  library's *Eville* is a Brighton band, not UK-thrash *Evile*; *Bish* is the Japanese idol group
  BiSH (3 of 4 scrobbled titles), not a male UK DJ; *Aviana* is the metalcore band (12 of 16
  titles), not a female US Person. **Short and common artist names routinely resolve to the wrong
  real act, and research about the wrong act is worse than no research.**

  **The canonical case — EVILLE/EVILE, un-merged.** The poisoned id on the library's Eville was
  the *real Evile's* mbid, so CANON's `mb:` grouping key had been folding **two genuinely
  different bands into one row**. The songs test named it, the pin fixed it, and the pin-first
  guard at the CANON grouping site (§4) is what makes the split **permanent** against any future
  scrape. Note also what the law *saves*: in the lineup crawl, the name-must-match rule refused
  to attribute the Trent Reznor & Atticus Ross duo to solo Reznor, reporting no-match instead of
  an attractive wrong answer. Verified corrections land in `pins.json` with a `note` recording
  both the evidence and what the bad id had pointed at.

- **Lineups — `mb-lineups.json` is the PRIMARY lineup/gender source (2026-09-21).** Loaded at
  `build-data.js:405`; resolver ladder `mblOf` (`:421`): exact name → fold-alias → slug → a
  **last-resort normalised hop** (`_mblNorm`, `:419` — NFKD fold + strip combining marks, drop a
  trailing parenthetical, strip leading `the-`, both sides, tried **only** after the exact/alias
  misses). That last arm is what lifts dump matching to 999/1,001; the residual misses are
  correct rejections, not gaps. It feeds four things, each **ahead of** Wikidata / Discogs /
  `artist-members`:
  - the **LINEUPS insight** (`:3377-3431`; MB wins over Wikidata when it has ≥2 gendered members
    or simply more — `useMb`, `:3399`). Now **670 bands judged, 156 with women, women-band share
    0.31**, up from 223 / 43 / 0.21 before the integration.
  - **artist `members`, current lineup first** (`mblMembersOf`, `:424-429`; emitted `:2105` core
    and `:5451` long-tail). 318 lists reordered, none shortened.
  - the **`vx` vocals fallback** (`mblVoxCode`, `:461-467`) — verified `vocals.json` still wins.
  - **`genderOf`'s lead-vocalist rule** (`:470-477`), with `mblVoxGender` (`:469`) inserted
    between the artist's own MB gender and the legacy `mb-artists` path.

  **The vocalist ladder breaks ties by TENURE, not array order** (`_mblVox`, `:448-458`): four
  credit tiers (current+lead vocals → any lead vocals → current+vocals → any vocals), and within
  a tier the longest stint wins (an open-ended stint counts to this year). That one change flips
  the Cranberries' glyph to Female with **no data edit** — two "lead vocals" members, neither
  current, and array position had been picking Niall Quinn (one year) over Dolores O'Riordan
  (28). The legacy `mb-artists` path (`:371-392`) still has no tiebreak; it is the fallback, and
  fixing it is only worth doing if something still falls through to it.

- **Colour system 1 — artist hue:** each artist inherits its genre **family** hue from the
  v2 wheel (15 families, 2026-08-13 — the full hue + Sound-Map position table is DESIGN.md
  §1.3; anchors: Thrash 4 red, Heavy/Doom 24, Hip-Hop 46, Alt/Indie 60, Jazz 40, Punk 96,
  Classical 150, Electronic 190, Industrial 214, Shoegaze 252, Prog 282, Score 308, Pop 332,
  Metalcore/Nu 346, Other grey), falling back to a name-hash hue. Consistent everywhere
  (bars, covers, radars).
- ~~Colour system 2 — track mood dots~~ removed 2026-07-04 (hue-as-scale unreadable; Fuad:
  "bloated"). Track mood now lives only in tooltips + the track page's quadrant.
- **`GenCover`:** generative cover art from name+hue, auto-upgrading to Discogs thumb (`THUMBS`)
  or Spotify image (`SPOTIMG`) when available. Real album covers exist only where the archive had
  them (`spotify-albumart.json`); otherwise generative.
- **`imgProxied` (core export, 2026-08-22):** rewrites Discogs/coverartarchive/Deezer/Wikimedia
  image urls through the img.fuad.au Cloudflare edge proxy (source `/img-proxy.worker.js`, rules
  in `/HUB.md`). Always pair it with a fallback step to the DIRECT url — GenCover's chain and the
  shelves covers do this — so proxy failure degrades to pre-proxy behaviour. `i.scdn.co` is
  deliberately NOT proxied; don't add it.
- **Taste percentiles:** `AUDIO_DIST` = play-weighted CDF (permille) per audio axis over the whole
  library — powers "more energetic than 87% of what you play" phrasing and the dashed
  "your average" overlay on DNA radars.

## 6. Data model (compact formats — check before consuming)

> **2026-08-13 additions:** `liked-meta.js` now also ships `ROTATION_LIKED_AUDIO_X`
> (liked-key → TA-shaped extended audio row, parquet-derived — the Liked tuner's fallback for
> unscrobbled saves) and `ROTATION_LIKED_VX` (liked artist slug → vocals code — liked-only
> artists have no byId/expById record, so vx must ride here). `portraits.js` field model:
> `gist`/`by`/`liner`/`arc` are the FRONTAL read (Fable syntheses where approved);
> `linerPrev`/`arcPrev` hold a superseded read for the flick face; `note2` is a footnote
> rendered under the open full read. `liner2`/`arc2` are retired. Scrobble ingest drops
> `NON_ARTISTS` (build-data.js) — news domains / trailers / video noise — before any counting.

> **2026-09-21 additions.**
>
> **`INSIGHTS.THEMES`** (built `build-data.js:3291-3375`) now ships the full grid, additively —
> existing consumers are untouched:
> `{ names[18], covered, coveredPlays, totalPlays, shares[], exemplars, exemplarsAll, arc,
> matrix, artists[14] }`.
> - **`matrix` = `{ years[], plays[], rows[] }`**, parallel arrays: `rows[i][j]` is year
>   `years[i]`'s **per-mille** share (an int — no float dance) of `names[j]`, for **every**
>   theme, under the same `tot >= 400` year filter as the arc and folded into the arc's own walk
>   (no extra pass). On the 2026-09-21 build: **17 qualifying years × 18 themes.** The arc stays
>   the top-6 view; the matrix exists because the Lyrical diet must let the audience stack **any**
>   theme across years, and a top-6 arc cannot feed that.
> - **`exemplarsAll`** = the same row shape as `exemplars` (top-3 played tracks per theme) but
>   for **every theme that has at least one** — 18 of 18 currently, against `exemplars`' top-8 —
>   so a stacked year can be clicked through to real tracks whichever theme it names.
> - Cost, measured on a real build: **+9.5 KB raw / +1.5 KB gzip** on `music-core.js` (most of
>   the raw bytes are repeated key names and artist strings, which gzip already eats).
> - **`covered` / `coveredPlays` / `totalPlays` are the honesty line** — 28,253 tracks carrying
>   236,194 of 322,927 plays (**73.1%**) on that build. Any "what the words are about" copy that
>   states a share must divide through these, not through the whole library.
>
> **Artist field `mc`** (`mcOf`, `build-data.js:441`; emitted `:2106` core and `:5452` long-tail;
> in `ARTIST_HEAVY` `:6540`, so it rides the **deferred** shards — +0 bytes on first paint,
> ~6.6 KB raw across rest/detail). It is the length of the **leading run** of `members[]` whose
> names are in mb-lineups' `current:true` set — a prefix count rather than `cur.length`, so it
> survives the Set de-dupe with the other member sources and the slice cap, and stays honest when
> one person holds both a current and an ended membership row. **Absent = the dump has never
> heard of this artist (unknown); `mc: 0` = the dump knows the band and says none of these are
> current.** ⚠ Emitted but **not yet read by any client** — the artist card decides currency from
> the lineup shard's per-member `c` flag instead (`rotation-artist.jsx:788`, `:2073`:
> `m.c == null ? !m.t : !!m.c`).
>
> **`mb-lineup.js` shard** (built `build-data.js:4728-4803`; a **gitignored CI artifact**, so
> never census it for counts you intend to publish). Key = canonical artist slug →
> `{type, area, from, to, aka?, members:[{ n, g:"M"|"F"|"X"|"", i:[roles ≤4], f, t, c:1|0 }]}`.
> Sourced **mb-lineups first, mb-artists as fallback** — a strict **superset** of the old shape
> (adds `c` and the `X` gender), deliberately, so a stale cached shard renders exactly as before.
> Roles are filtered of MB relationship *attributes* (`additional`/`original`/`eponymous`/…),
> ranked vocals-first, backing/other vocals dropped when `lead vocals` is present, capped at the
> card's own 4 chips. As of the local build: 927 artists, 849 with a roster.
>
> **`INSIGHTS.ROLLING_12M`** — top artist + top track over the 365 days ending at the **newest
> dated scrobble** (data-relative on purpose, so a stale build stays honest). Feeds the Overview
> card that used to say "2026 so far".

**Core/rest split (Phase 0, 2026-07-07; artist-field split 2026-07-18):** `window.ROTATION` is
assembled from **`music-core.js`** (loaded with `defer`, ~2.1 MB raw) + **`music-rest.js`**
(injected by `rotation-app` after first mount). Core carries light ARTISTS records (without the 11
heavy prose/relationship fields) plus everything the Overview first paint reads (TOTALS, NOW,
RECENT, TREND, INSIGHTS, YEARS, THUMBS, SPOTIMG, GIGS, TOUR, SUBS, GENRE_FLOW, FAMILIES, helpers)
and **`EXPLORE_N`**. Rest carries: **EXPLORE, ALBUMS, AUDIO, ARTIST_CLOCK, SUB_ARTISTS,
CLOCK_BY_YEAR**, plus **`ARTIST_X`** (an id-keyed map of the 11 heavy fields — bio, wd, members,
topTracks, topAlbums, similar, similarNames, styles, discogsGenres, spotGenres, origin — that the
rest file folds back onto the same ARTISTS record objects before `_restLoaded` flips). Core stubs
deferred keys empty and sets `_restLoaded=false`; rest merges them, rebuilds `expById`, flips
`_restLoaded=true`, and calls `window.__rotRest`. **Guard rule:** every non-Overview view reads a
deferred key, so `rotation-app` gates them behind `restReady` (a "loading your library…" card) and
mounts them FRESH once rest lands — so their `useMemo`s never cache empty. The Overview map band is
gated the same way. Node consumers (smoke, sync-live, extract-audio, enrich-spotify) evaluate both
files in one context to reconstitute the whole object.

**`window.ROTATION`** (music-core.js + music-rest.js) keys:
`ARTISTS` (kept = **top 400 by plays** (~100-play cutoff, raised from 200 on 2026-07-04:
206→3.5 MB, 400→4.4 MB, 1000→6.5 MB — 400 chosen) + per-year top-10 union; full records:
name/id/plays/hue/tags/country/members/bio/similar/…, `vx` = ordered vocalist genders from
`vocals.json` ("fm" = female+male in lineup order, "" = instrumental, absent = unknown),
`life` = {type, ended, end, react} with `react` from the pins Reactivated ledger),
`ALBUMS` (top 120 + 4/kept-artist ≈ 1,572), `TRACKS` (top 50), `GENRES`, `FAMILIES`, `SUBS` + `SUB_ARTISTS` + `EXPLORE`
(~6,000-artist universe: `{id, name, plays, hue, s:[subIdx], co, ci, g, vx, ty, yp:{year:plays}(top 3k)}`),
`CLOCK` + `CLOCK_BY_YEAR` + `ARTIST_CLOCK`, `YEARS` (per-year top artists/albums/tracks),
`ERAS`, `TREND` (26 wk), `TOTALS` (incl. `exactHours`, `explicitPct`, `avgTrackSec`,
`discoveryRate`, `perDay`, `streak`, `topDay`), `NOW`/`RECENT`, `INSIGHTS` (see below),
`CONCERTS`/`CITIES` (empty unless concerts cache exists), `GENRE_FLOW`, `THUMBS`, `SPOTIMG`,
`AUDIO`, `AUDIO_DIST`, plus runtime helpers `slug`, `byId`, `expById`, `idForName`, `played`.

**`INSIGHTS`** sub-keys: `MILESTONES`, `OBSESSIONS`, `ALBUM_OBSESSIONS`, `FLAMEOUTS`,
`LIFETIME_TRACKS`, `ARTIST_ERAS`, `INCUBATION`, `COMEBACKS`, `WONDERS`, `NIGHT_OWLS`,
`DISCOVERIES`, `YEAR_PEAKS`, `ON_THIS_DAY`, `UNDERGROUND`, `GEOGRAPHY`, `STYLE_ATLAS`,
`ADOPTION`, `CONNECTIONS`, `RECOMMENDATIONS`, `REVISIT`, `LIFESPAN` (MB life-spans × your
timeline: ended-while-listening, graves, elders, median band life, worst year), plus the
**Phase 3 (2026-07-07) sessions layer**: `SESSIONS` (total/median/longest sittings/bingeShare +
`sittings`{top,byAlbum} album front-to-back + `segues` X→Y), `SEASONALITY` (monthly + top
seasonal artists), `TASTE_ERAS` (auto-segmented chapters w/ topFams + shift diffs),
`LIFECYCLE` (flameout/perennial/slow-burn classes + `burningNow` w/ flare%).
**Missing from the list above and shipping since (audited 2026-09-21, `build-data.js:3924-3930`):**
`LANGUAGE`, `MOTHER_TONGUE`, `MOOD`, `THEMES`, `LINEUPS`, `AUDIO_DRIFT`, `HOUR_SOUND`,
`CONCERT_EFFECT`, `ALBUM_DECAY`, `ROLLING_12M`, `STREAK`.

**Artist audio row** — `R.AUDIO[artistId]` =
`[energy, valence, acoustic, tempo, dance, instr (0–1), major, popularity 0–100, followers, loudness dB, speechiness, liveness, avgTrackSec]`.
**Two popularity signals coexist — don't conflate them (clarified 2026-08-18):** the Explore
*attributes axis* named "popularity" plots **last.fm listeners** (`row.listeners`, log scale —
wide dynamic range, all-time reach), while the Explore *sort chip* "popularity" and the artist
pane read **the 0–100 index at `AUDIO[7]`** (recency-weighted, catalogue-snapshot, quantized —
the deep tail all sits 0–20). `pop === 0` can be a source null coerced to 0, not a real score
(26 artists affected as of 2026-08-18; the one confirmed-wrong case is a split-entity fragment,
fixed by an artist fold — see Novelists in folds.json — not by touching the axis).

**Track audio row** — `ROTATION_TRACKAUDIO["art~track"]` =
`[durSec, popularity, explicit, trackNo]` + when features exist
`[energy, valence, acoustic, tempo, dance, instr (0–100), loud dB×10, live, speech, key 0–11|-1, mode 1maj/0min/-1, timeSig]`
(tempo remapped: `(bpm−50)/140` clamped).

**Media index** — `ROTATION_MEDIA`:
`albums = [title, artistIdx, plays, firstYear, lastYear, yearTail, coverUrl, [relYear,typeChar,label], dna?]`
(dna `[8]` = play-weighted `[energy, valence, dance, acoustic, instr, tempo]` 0–100);
`tracks = [title, artistIdx, plays, albumIdx, yearTail, trackNo?, energy?, valence?]`.
`yearTail`: single year number, or flat `[year, plays, …]`.

**`window.ROTATION_LIVE`** (live-data.js): `total`, `now`, `recent[20]`, `week`
(plays7/weekAvg/topArtists/topTracks/newArtistsThisWeek), `month` (newArtists/deepest), `mood`
(energy/valence vs base), `clock72` (72 hourly bins), `updated`.

## 7. Views & navigation

Nav: **Overview · Stories · Explore · Shelves · Calendar · (Live)** — Live auto-hides when
`R.CITIES` is empty (it currently is). The **Spotify** tab is hidden from the nav but routable
at `#spotify` (hidden again 2026-07-18 by Fuad). The Map page was **ported wholesale into Overview**
(2026-07-05, `OvMapBand` lazy-mounts the full `MapView embedded` on scroll; `#map`/`#journey`
legacy-route to Overview). `#calendar/YYYY-MM-DD` deep-opens a specific day. Detail routes: `#artist/id`, `#album/id`, `#track/id`,
`#explore/tag` (seeds a genre filter). **Explore also serializes its full active slice into the
hash** (`#explore/y=2019;s=Industrial;m=dark-intense;c=1.5.9;k=albums`) — bookmarkable and
refresh-proof; `;`-separated because parseHash url-decodes once. Legacy routes
(charts/clock/sound/eras/mood → explore, journey → map) still resolve. **The Overview date +
map genre/mode filter (`#overview/y=2019`, `p=month~2019-06`, `f=Japanese`, `s=<subgenre>`,
`md=country`) and the Shelves mode/lens (`#shelves/l=mood`, `m=wrap`) also serialize into the
hash** (Phase 1) — genre by NAME (reorder-proof, matches Explore). (Map place-selection isn't
serialized yet.)
Global: `/` opens search;
popover layer; tweaks drawer.

## 8. Feature inventory (what is SHIPPED today)

### Overview (the command centre — bento + full Map, redesigned 2026-07-04)
- ≥981px pulse (ONE row): **scrobbles(3) · streak(2) · Recently played (3, capped scroll
  well, 6/12/18 selector) · now-playing(4, top-right)** — streak+recent squeezed centrally.
  Fixed the 981–1099px break (the old `.ov-calslot` had no base grid-column and collapsed
  to a 1/12 sliver; slot removed).
- **Top artists** module is dissolved — lives on as the map Results' grid display.
  (`TopArtistsPeek` in rotation-views1 is currently dead code.)
- **THE MAP BAND** (`OvMapBand`, lazy-mounts on scroll): the **full MapView** as a
  **3:3:2 height-matched row — map | taste-flow | Results**; **row 2 = deepest places
  stretched under map+flow, calendar rail (`OvCalRail`, slotted via `calSlot`) squeezed to
  its right under the Results**. Results is a flexed scroll well (can't inflate the row;
  list default, list⇄grid toggle, 2-col cover grid) with a **"✕ place" clear chip** in its
  header; clicking a selected city bubble again also deselects. MapFlow's interactive legend
  is the only genre legend (static FAMILIES strip removed 2026-07-04; metric gradient still
  shows for by-sound colouring). Global "clear filters" button stays in the band head.
  MapView reports filtered totals up (`fStats`, incl. a `slice` flag) so the **stat strip
  reacts to the active filter**: hours + distinct artists, and **avg/day + share-of-history
  follow the place/genre slice as well as the date filter** (Phase 1 — `fStats.plays` folded
  with `day-series.js`); **heaviest-day** recomputes for a date window but stays lifetime under
  a place/genre-only filter (per-slice heaviest needs a heavier export); the "Right now" insight
  feed runs full-width below, 4 cards across. Calendar year-scrub still drives the map;
  day/week click filters Results via calendar-detail. ⚠ day-level map *dots* filtering
  still needs a per-day geography export.
- **"Where to dig"** chip strip · **"Your portrait"** prose verdict.

**THE STAT STRIP — every tile follows every filter (2026-09-21).** The strip is `statSlot`,
passed into `OvMapBand` from `rotation-views1.jsx:786-866`. Ten tiles in source order: hours ·
artists · albums · **since** · songs · seen live · avg/day · **plays / artist** · **peak year** ·
of plays. Three rules it now obeys:

1. **No time-only impostors.** "days played" and "peak day" read the *day-series* time window
   only — and day-series carries no place and no genre, so under a place/genre filter they
   silently kept showing unsliced lifetime numbers next to sliced ones. They are now **SINCE**
   (the earliest year the current slice has plays in, `:825`) and **PEAK YEAR** (the slice's
   heaviest year, exact count in the tooltip, `:857-858`). Both come off a `year → plays`
   aggregate the worldmap's `onStats` pass builds from each Results row's already-resident `yp`
   (`rotation-worldmap.jsx:642-657`), **clamped to the picked window** under a year or calendar
   pick (`calWindowYears`, `:415-421`) — so a 2013 pick can never report a lifetime 2017 peak.
   `peakYear`/`sinceYear` ride the payload in all three report branches (`:661`, `:666`, `:669`).
2. **One slot, one quantity.** The tile that used to shape-shift between depth / share% /
   of-history is always **PLAYS / ARTIST** now (`:830-832`, `:847-849`). Unfiltered it reads
   **lifetime over lifetime** (`T.scrobbles / T.artists`) on purpose — so the number is
   rebuildable from the ARTISTS tile two cells over, which shows the whole library rather than
   the Explore-eligible set; filtered it reads the slice over the slice's own artist count. The
   caption is fitted (`.ov-stat-fit`) rather than amputated. *(Note: the tile the code's own
   comment calls the "Tenth stat" is a different one — "of plays", the Results-list share at
   `:859-864`.)*
3. **Years are strings, and they cross-fade.** A year deliberately never tweens — counting
   through intermediate years reads as a date glitch — but a hard swap snapped while every
   numeric neighbour eased. `Stat` (`:535`) takes the non-numeric branch for a `String(...)`
   value and remounts a keyed `.ov-yrswap` span with a ~.28s fade; reduced-motion turns it off.

Albums and songs genuinely filter too (the Results machinery already computes the slice's
albums/songs via `resultMedia`, so those counts ride the `onStats` payload), and "7 / sitting"
became active **days** in the current slice.

**The strip never actually tweened until 2026-09-21.** `Stat` was declared *inside*
`OverviewView`, so every render minted a new component type, React remounted the whole strip,
and a remounted `TweenNum` starts at its target — measured over CDP as a one-frame 7,800 → 23
swap. Hoisting it to module scope is what finally delivered what the earlier TweenNum migration
was for. `TweenNum`'s rAF step also gained a zero clamp (a first frame timestamped before the
effect's `performance.now()` extrapolated backwards into negative millions).

**Scrobbles card — pace + milestone ETA (2026-09-21).** Under the live total, one
Streak-grammar line: `'26 pace 20.5k · 325k in ~54d` (memo `rotation-views1.jsx:707-721`,
render `:883-886`, exact figures in the title tooltip). Year-to-date is summed off the baked
day-series with the live delta added on top; **day-of-year clamps to 7** so early January
can't project one wild afternoon into a 60k year; the ETA targets the **next round
five-thousand via `ceil()` from the live total**, so it can never name a milestone already
crossed. It looks *forward* — which is the whole point, because the milestone **progress bar**
and the backward-looking "last crossing" line are both gone (`:890-894`; `INSIGHTS.MILESTONES`
still ships and Stories' record book still reads it). The artist page's own milestone progress
bar went the same way for the same objection (`rotation-artist.jsx:1736-1742`).

**Other 2026-09-21 Overview rulings:** On this day dropped its "Biggest:" line and This week
dropped the NEW row (both were stretching their pulse row, 161px → 126px, four cards level
again); On-this-day year rows wear the eased `.ov-hovrow` wash like every sibling module's
clickable rank, and compressed 3 rows → 2 in In-season's row grammar (22px cover, `.ov-tx` name
over an `.ov-mi` "YYYY — on this day" sub, trailing count) so the pulse row reads as one family;
"2026 so far" became **LAST 12 MONTHS** off a small `ROLLING_12M` insight (the 365 days ending
at the newest dated scrobble — data-relative, so a stale build stays honest), rendering top
artist *and* top track in the Recent/On-repeat row convention; `.xp-carditem` in Explore
finally answers hover (a cover tile has no background box to wash, so a 2px lift plus a gentle
sleeve brightness stands in).

### Insight engine (rotation-insights.jsx)
Providers (score-ranked, de-duped, day-jittered): first-scrobble anniversary countdown, next
round-total milestone, artist about to tip a round play count, distinct-artist milestone, week in
review (vs weekly average), new-this-month + deepest dive, mood lately vs baseline (quadrant),
top of current year, last-72h histogram, on-this-day through the years (±3-day fallback),
comeback of the day, top-artist share, discovery rate, daily intake. Failures are swallowed
per-provider.

### Stories — the long-read feed, RESTRUCTURED into nine chapters 2026-09-21

The 2026-07 flat feed (and the four-chapter re-cut after it) is history: chapter IV had
swallowed 29 of 43 sections and 60% of the feed under a title about geography. The feed now
rides a **story** — what the library is made of, when it happened, what burned, what lasted,
the habits, the people, the sound, the words, the verdict. **41 sections** (`rotation-views3.jsx`,
`StoriesView` from line 257; the nine dividers are inline `.st-chapter` literals, not a list —
lines 606 / 786 / 1151 / 1364 / 1452 / 1584 / 1950 / 2164 / 2418, each with a dated comment).

| | chapter | sections |
|---|---|---|
| — | *(hero)* | On this day |
| I | **Depth & discovery** | How deep it goes · When the taste turned · Music age · The songs you own twice · Blind spots |
| II | **Years & seasons** | Chapters · A year in review · Who rose, who fell · Music for a season · After midnight |
| III | **The burn** | Right now · The incubation · Their era · Obsessions · Album weeks · Flameouts · One-day wonders |
| IV | **What lasted** | Gathering dust · Comebacks · The constants · The streak |
| V | **Habits & landmarks** | How you listen · The unfinished records · What follows what · Heaviest days *(record book: year peaks + Milestones as its second facet)* |
| VI | **People & places** | First contact · Who brought you here · Connected by blood · Lineups · The ones that ended · The concert effect · Origins |
| VII | **Sound & style** | Style atlas · Sound drift · The comfort zone |
| VIII | **Words & moods** | Languages *(Language drift folded in)* · Mother tongues · Sounds happy, reads dark |
| IX | **The verdict** | Lyrical diet · **The Reading** |

The order is the argument: everything above chapter IX is the evidence — sound, years, words,
places — and **The Reading is the verdict, so it reads last.**

**The TOC rail is DOM-derived, not declared** (`rotation-views3.jsx:482-507`): it walks
`feed.querySelectorAll("section")`, takes each `.st-label`'s text, cuts at `·` and slugifies to
`st-<slug>`. So the crumb list is *whatever actually rendered* — nearly every section sits
behind a data guard, and the rail only mounts at all above three crumbs. Two consequences that
are load-bearing: **a retired module's crumb disappears by construction** (delete the label,
the crumb goes), and **a lazily-mounted section must be an effect dependency** or it never
registers — which is why `reading` is one.

**Merged / retired 2026-09-21** (each carries a tombstone comment at its old site):
- **Milestones → a facet of Heaviest days** (`:1543`) — one record book. Not interleaved,
  because the units don't align (one row per year vs one row per 50,000th scrobble).
- **Language drift → folded into Languages** (`:2172`), the wave-C Origins precedent verbatim.
- **Lyric themes → absorbed by Lyrical diet** (`:2400`, receiving tombstone `:2437-2450`).
  Everything duplicated was *deleted with verification*, not repeated: the shares bar list (the
  chips already say it), the hard-wired exemplars (`exemplarsAll` is a superset), the arc-only
  riser/faller (the matrix computes them better — an off-arc riser was invisible to the old
  code). What survived is the card's one unique asset, upgraded: all 14 artist theme-profiles.
- **Top of each scene + Bridge artists → retired** (`:1952`) — bridges measured Discogs tag
  co-occurrence, not connection (a big catalogue spans styles trivially), and the scene boxes
  were a directory Explore already provides.
- **Carried alone → retired in full** (`:1964`) — the surviving set was four broad-style solo
  carriers, which is a tagging artifact rather than a biography. `sc.solo` still ships in the
  build should a better home appear; Style atlas is the rarest rows alone again.

Stale deep links (`#stories/milestones`, `/language-drift`) degrade to a silent no-scroll.

**THE READING** (`rotation-views3.jsx:2641`, chapter IX) is the one **authored** module in the
feed: a 115-word listening portrait plus four fixed editorial era digests (2006-2012, 2012-2015,
2015-2018, 2018-2026), each expanded body closing on its own read-coverage margin. Its content
lives in **`reading.js`** — a tracked, hand-edited content file (`window.ROTATION_READING =
{portrait, eras[]}`), **not** a build artifact: edit it and the change ships with no rebuild.
It is lazy-loaded on Stories mount via the house `loadScript` idiom
(`rotation-views3.jsx:293`, `loadScript` at `rotation-core.jsx:568`), so `index.html` carries
nothing. It is deliberately its own section rather than rows grafted onto `TASTE_ERAS` — those
re-cut on every rebuild; these four cuts are fixed. **`reading.js` is in `apps.json`'s rotation
`deploy` list (`apps.json:76`)** — committed is not shipped without it — and in the SW prime
list (`index.html:122`).

**Digest collapse idiom:** bodies are **always mounted** inside a `0fr → 1fr` grid track so
opening eases (~.34s) instead of popping — `height:auto` cannot transition and a mount/unmount
has nothing to ease. Vertical space rides the text's own margins, never padding on the clipped
div (padding pokes out of a 0fr track as a sliver); `aria-hidden` keeps closed text out of the
accessibility tree.

### Explore (the converged digger; reflowed 2026-07-05)
One filter set — **time** (year chips + "play the decade"), **genre** (families → subgenres),
**mood quadrant** (valence×energy zones) — over one universe (~6,000 artists). Left surface
toggles **texture map** (subgenre scatter) ⇄ **mood lens** (quadrant + facts) ⇄ **attributes
lens** (dot scatter by audio axes). Right: ranked artists/albums/tracks (full-library media-index;
**8/16/24/32 count buttons + a "load more" that reveals rows *beyond* the base** — visible =
base+extra; buttons set the base & reset the expansion, load-more adds +24 and grows the media
pool, works for all three tabs; unified 2026-07-07). PC fixed-height scroll window. **Below the
module**: the by-sound **sort row** (plays → energy/mood/…/most obscure), then the "mood over the
years" arc, then the **genre families as a 6-column grid** (3-col ≤1250px, 1-col ≤760px; each
family's subgenre list capped + scrollable). The Rhythm clock-cell filter was **removed** (clock
moved to Calendar). Subgenre spelling variants (hip hop/hip-hop, nu metal, dnb…) merge via
`SUB_CANON` in build-data.
**Attributes-lens dot interaction (2026-07-18):** hover shows an overlay ring (a single separate
element outside the memoised dot layer — no per-mousemove full layer rebuild); dots are
**click-to-pick** artists (click again to remove). **Subgenre single-click filter fixed
(2026-07-18):** a click on a subgenre row correctly scopes the scatter; singleSel state is now
separate from the drag-brush path. ⚠ mood-lens first paint is slow (open bug).

### Calendar (heatmap + vertical Rhythm clock)
GitHub-style **every-day heatmap** for 20 years (calendar.js), click any day/week/month → lazy
period summary (calendar-detail.js). Beside it (sticky right rail) the **Rhythm clock** — a
**vertical hour-of-day histogram** (all-time or per-year, moved here from Explore 2026-07-05).
Selecting hours on the clock **re-weights the heatmap** to just those hours (from the per-day
`Y.hours` histograms in calendar.js) — the clock↔heatmap tandem is live.

### Map (Geography — lives INSIDE Overview since 2026-07-05; defaults to cities)
World map (countries ⇄ city dots) sized by plays; colour by dominant genre / top artist's
genre / **sonic gradient** (energy/mood/debut-era). Year scrubber animates the geography.
**MapFlow**: a streamgraph that doubles as genre filter AND drill-path (families → subgenres →
artists), rescoped by map selection. Click a country/city → detail blob (top artists/albums/
songs + Sound DNA for that place, lazy geo-detail.js). Breakdown list with flags.

### Artist page (kept top-400; PC composition 2026-07-04)
Rank/est/origin header with **gender glyph + active/disbanded/deceased badge** (`ArtistMeta`) +
a **Needle Drop button** (2026-07-07 — plays the artist's most-played track that has a preview
hash, falling through to the next; reuses `ShNeedle` + lazy `track-previews.js`);
on PC: **bio full-width** → **row 2: Sound DNA (narrow 224px — radar with the tempo→followers
list stacked BENEATH at radar width) · Sounds-like (fills the freed slot) · Top tracks ·
Albums** → **bottom row: How-they-played-out + family tree at their ~⅓ widths, CENTERED
(not stretched; `av-endrow` flex)**. **Albums** = covers⇄list toggle (covers default, plays shown,
all ~40 listed). **Sounds-like**: last.fm default 8 (⇄16), by-sound 8/16/24 (SoundSimilar's own
selector). Mobile stacks. **How they played out** = album/song streamgraph (lazy artist-flow.js).
Long-tail artists get **MiniArtistView** (explore record + Sound DNA + similar + lazy detail).

**2026-09-21 — the roster card runs on mb-lineups.** The Family-tree card's lineup shard now
sources `mb-lineups.json` first (`build-data.js:4728-4803`): **395 → 927 artists**, real rosters
316 → 849, 517 artists gaining a roster outright (Judas Priest went from one line to the full
family history). The **current lineup shows by default** under the shares-members-with lines —
chips, gender glyphs and open tenures visible with no click — while **FORMERLY** stays behind an
"N former members" toggle with its 10-cap; a **zero-current band** (disbanded, e.g. Led Zeppelin)
keeps the old fully-collapsed card so a wall of past members never unfolds on load.

The current/past split uses the dump's **`c` flag**, not an inference from end dates: **81
members ended with no end date recorded**, and every one of them rendered as CURRENT under the
old rule — Soundgarden, disbanded 2017, showed a live lineup. Open-arrow tenure is now only for
the genuinely current (`rotation-artist.jsx:788`, `:2073` — `m.c == null ? !m.t : !!m.c`, which
is also the fallback that keeps an mb-artists-only roster rendering). The header's **milestone
progress bar is gone** (`rotation-artist.jsx:1736-1742`), and **On this day** compressed 3 rows
→ 2 into In-season's row grammar so the pulse row reads as one family.

### Album page
Cover (real or generative), release year/type/label (Spotify archive), stats (plays, ~hours,
library rank), **Album Audio DNA** radar (dashed = your average) + bars, **Where it sits**
(mood MiniQuadrant + taste percentiles), **Your history** (year sparkline), tracklist ordered by
real track numbers with ★ standout + play bars (per-track mood dots removed 2026-07-04 —
energy/positivity live in the row tooltip); sibling albums. Stats also show **"N× front-to-back"**
(sessions layer, `SESSIONS.sittings.byAlbum`). The **back button goes UP to the album's artist**
("← <artist>"), not out to Explore (2026-07-07).

### Track page
Header (track no, duration, explicit), **Audio DNA** radar (6 axes + dashed library average) +
bars, 7-attribute grid mirroring the artist pane (tempo/key/loudness/speech/live/popularity/
followers), key + mode spelled out, **Where it sits** (quadrant + percentiles), **Your history**
(sparkline + narrative + #rank within artist and all-time), sibling tracks. Mobile-responsive
grid. Entry points: album tracklists, artist top-tracks, Explore tracks tab, search songs,
Recently-played rows.

### Shelves (the record shop — V1+V2+V3 all live, rotation-shelves.jsx)
Positioning: **Explore is the database, Shelves is the record shop.**
- **Spines**: every album ≥3 plays (~11.5k) as flat single-tone spines (deeper/richer palette
  after the pastel round was rejected); wear = lighter tone + glow at 25/100/300 plays.
  Collapsed spines are pure divs; hover/first-tap fans open a **progressive cover** (64px CDN
  variant instantly → 300px swap). Rows **drag-to-pan** (Culture-style, hidden scrollbar) with
  a progress line + % underneath; caps 540/+720 per dig; `content-visibility` on rows.
- **Reader** bottom-sheet: big cover, stats (incl. n/N completeness), **needle drop** (vinyl
  slides out *behind* the text and spins while playing; guarded **iTunes fallback** covers
  unplayed/preview-less records), last.fm/Spotify links, → AlbumView.
- **Lenses** ("shelve by"): genre (subgenre split) · decade (**5-year split**) · when-you-found
  -them · mood quadrant (**depth split**: deepest vs on-the-edge) · completeness. Splits
  animate (staggered reveal).
- **Shrinkwrapped mode**: 6,565 unplayed LPs by 20+-play artists (archive diff,
  `spotify-unplayed.json` → lazy `shelves-unplayed.js`), sheen on spines, adapted Reader,
  crate-dig digs the sealed wall.
- Mobile grammar: tap=fan, tap again=Reader. Still open: deep links, tag-source filter, dust
  (REVISIT), artist-page shrinkwrap strip, comp-noise flag.

### Live — RETIRED (Fuad, 2026-08-27)
`LiveView` is deleted. Its data source (`concerts-cache.json`, the pre-tour per-artist
Ticketmaster keyword pull) died long ago, and the weekly location-first `tm-events` pull
strictly supersedes the library-matched half — which the Gigs "On tour now" explorer already
serves with map/calendar/genre. The tab's one differentiator ("also in town", non-library
events) has no data behind it in the current design, so retirement beat repointing.
`ConcertRow` survives inside `rotation-artist.jsx` (the artist page's upcoming-shows list is
its only consumer). `rotation-views2.jsx`'s post-split transition copy was removed in the
same commit (its stale-HTML window had passed).

### Search (`/`)
Overlay over search-index (artists: name/plays/span/peak-year) + media-index (songs + albums)
→ artist / album / track pages.

### PWA (Progressive Web App)
`rotation/manifest.webmanifest` + `sw.js` (tiered cache strategy, stamped at deploy time by
`stage-site.js` replacing `__BUILD__` with a content-digest epoch) + `icon-192.png`/`icon-512.png`.
Cache tiers: navigations network-first with offline shell fallback → `?v`-hashed assets
cache-first (content-addressed = immutable) → unversioned same-origin shard files
stale-while-revalidate → `live-data.js`/`hub-stats.json`/`pulse.js` network-first → cross-origin
images LRU (cap 300). Responses over 5 MB are never cached. Cache epoch = staged-content
MD5 digest stamped by `stage-site`; every deploy opens a fresh epoch and the `activate`
handler drops the old one. SW registration is HTTPS-only (localhost excluded in browsers).
`?v`-hash stamping of JS/CSS references in `index.html` is automatic via `stage-site.js`'s
`stampHashes`; this covers rotation, canvas (both have `sw.js`), and the hub root.

**Offline v1 (2026-09-21) — the epoch problem, and the two messages that solve it.** The
tiered cache above was never actually offline-capable, for a structural reason: the worker
precached only the shell, so a tab that never opened *this* epoch had nothing offline — and
the epoch rotates on most days, because `VERSION` is a whole-tree content digest and the sync
cron runs daily. Every deploy orphaned yesterday's coverage wholesale. Three pieces fix it:

- **`persist()`** — `index.html` calls `navigator.storage.persist()` right after registration
  (`index.html:133`, inside `swWarm`): best effort, fire-and-forget, never blocks. It asks the
  browser not to evict Cache Storage under general storage pressure.
- **`EPOCH_HANDOFF`** (`sw.js:109-127`) — at idle the page posts the `?v=` asset URLs *this
  document is actually running on* (`index.html:140-157`; it walks `script[src]`/`link[href]`
  and appends `music-rest.js?v=` + `R.REST_V`, which is injected post-mount and not in the DOM
  yet). The worker copies those entries out of the surviving previous epoch into the current
  one, then drops every older epoch. Only **same-origin URLs carrying `?v=`** are carried —
  an unversioned shard's URL doesn't change when its bytes do, so carrying it would let stale
  bytes answer forever. Net effect: a byte-identical bundle stops re-downloading after every
  deploy.
- **`PRIME`** (`sw.js:134-149`) — the page then posts the per-view **route-shard list**
  (`SW_PRIME`, `index.html:115-128`, 27 entries grouped by view — calendar/day-series, the
  world map, filter-index, search-index, `reading.js`, the Records/Liked/Spotify/album/track
  shards). The worker fetches only what this epoch lacks, one at a time at low priority,
  storing (never executing). Idempotent: a second prime in the same epoch fetches nothing.
  **~9.0 MB gzip / ~24.6 MB decompressed once per epoch** (the figure lives in the comment at
  `index.html:111-114`). Skipped on a first-ever visit (`!navigator.serviceWorker.controller`
  — everything is being downloaded anyway) and under Data Saver. Priming runs **in the worker**
  on purpose: right after a deploy the page is still controlled by the *outgoing* worker (no
  `clients.claim()`), so a page-side fetch would land in the cache about to be dropped.

**The two-epoch invariant.** Cache names carry a content digest, so they have **no ordering** —
`install` therefore writes a per-cache timestamp (`__sw-epoch`, `sw.js:25/32`) and `epochs()`
(`sw.js:52-61`) splits the caches into `mine` / `older` / `newer`. `activate` deletes
`older.slice(1)` — it keeps **exactly one** previous epoch rather than sweeping all, because
that survivor is what `EPOCH_HANDOFF` reads from. If the handoff message never arrives, exactly
one stale epoch lingers until the next `activate` bounds it again; it can never grow unbounded.
A `newer` cache means a newer worker has already installed, and is neither ours to read nor to
delete — `prime()` refuses outright when `newer.length` (`sw.js:137`), since warming a
superseded epoch only fills a cache that is about to be thrown away.

**Also load-bearing:** every cache lookup is **scoped by name** (`matchCore`/`matchImg`,
`sw.js:92-93`) and never the origin-wide `caches.match()` — otherwise a surviving previous
epoch could answer for an unversioned shard. The `IMG` cache is **deliberately unversioned**
(`sw.js:18-19`) with a 300-entry LRU, so covers survive every deploy. Responses over 5 MB are
never cached (`sw.js:21/80-81`) — which is also why `llm-about.js` is not in the prime list.
Message handling is serialized through one promise chain (`sw.js:96`) so two messages can't
interleave on the same cache. Every new path fails open to the network. Verified against a
mock-CacheStorage harness driving the real `sw.js` through install/activate/message/fetch:
fresh visit, same-epoch revisit (second prime = 0 fetches), deploy with and without handoff,
superseded worker, offline serving, Data Saver, malformed messages, the 5 MB guard.

**Still cache-on-use, on purpose:** per-artist data (`artist-flow`, `artist-detail`, the
`about/*` buckets, the `mb-*` / `genius-*` stores). An artist page never opened is not
available offline.

### Gigs
The **Gigs** tab (`rotation-views3.jsx`) shows attended shows joined to the listening history,
"on tour now" explorer, and coverage ledger. Incremental pagers (2026-07-18): tour artists
expand in **+40** increments; the "still to catch" and "seen & loved" buckets each expand in
**+12** increments. `seenTop` is built from up to 60 artists. Genre cascade, event map,
D/W/M calendar cross-filters remain as shipped 2026-07-06.

### 2026-08 wave (vocals · filters · status · reads plumbing)
- **Vocals dimension.** `vocals.json` = ordered multi-value vocalist genders per artist
  (never-guess pipeline: MB lineup extraction → high-confidence knowledge only → web
  verification of the rest; low-confidence ships as ABSENT, not guessed). Ships as `vx`.
  **Glyph-first `VocalsBadge`**: mic + ♀♂⚧ in lineup order (words in the tooltip), MB-gender
  fallback for solo acts — the old standalone gender glyph folded in, not replaced. Explore
  gains a vocals chip row (Any/Male/Female/Mixed/Non-binary/Instrumental; rows without data
  are excluded only while the filter is active). Vocalist selection in build prefers
  lead-vocals in ANY era over current backing credits (the ミドリ fix: departed lead
  Mariko Goto vs. a male backing credit).
  **Research-wave campaign (waves 2-4, 2026-08 → 2,102 artists; without-data 3,814 → 2,531).**
  Recipe per 500-artist wave: batches of 35 carrying each artist's top library track titles
  (the disambiguation unlock for same-named acts), parallel research agents under hard rules
  (null over guess; no gender from first names or band context alone; producer projects with
  guest-only vocals = instrumental; umbrella/OST/brand credits = unknown — EXCEPT stable
  recurring soundtrack ensembles, which count as a lineup; cover-series keys never emitted
  under the covered artist; Vocaloid acts classify by the synth's register, human+synth duets
  get both), then an independent verification pass that resolves flagged rows with evidence
  before anything merges. An **owner-verdicts file** (src `"owner"`) is applied last and
  beats research — Fuad's firsthand calls for acts the pipeline keeps nulling. Arrays are
  one entry per REGULAR vocalist in lineup order; that shape is the contract end-to-end
  (research output → verified file → vocals.json → `vx` code).
- **Explore filters.** 28-theme bitmask chips with AND semantics + release-decade bar with
  year drill-in (Sort module); vocals/theme/decade all ALSO drive the mood/attribute charts
  via `sliceArtists` (fail-open when inactive, exclude-no-data when active); result-count
  segmented control 16/32/64 (default 16); hi-res artist images.
- **Liked songs view.** Derived buckets (fresh/doorway/canon/lived/left/mid) + genre/tempo/
  energy filters + artist/album miniatures; `liked-meta.js` 9-field rows joined truth-first
  via the track's media albIdx (never name-slug).
- **Artist status.** Reactivated badge = pins ledger (`react:true` — Linkin Park 2017→2024,
  Alice in Chains 2002→2005, Nevermore 2011→2025, Bleach ~2009→performing again) OR the
  derived path (disbanded group + upcoming TM dates); `tmExclude` guards wrong-entity TM
  matches; Deceased Persons keep their badge (tribute billings are not comebacks).
- **Time page.** Day/week/month heatmap selection mirrors timeline scrubbing — both resolve
  to the same `selRange`, so the Rhythm rail follows either. Touch drag handles.
- **Reads plumbing.** `fvr` revision field on fable-tier reads ("2.3" = current methodology
  era; absent = v2.2 — the future depth-revisit target list), surfaced as a tooltip on the
  Fable source button; `fnote2` second footnote slot; needle drops on mini artist pages with
  hash → vetted-fallback → legacy resolution (~220 explore artists gained needles).
- **New This Month** module filters through canonical name resolution (see CANON_MK, §5).

## 9. Dead code & dormant surfaces

**Purged 2026-07-03** (commit `06f9f1e`): `ChartsView`/`ClockView`/`SoundMapView`/`ErasView`
(absorbed into Explore long ago), `rotation-constellation.jsx`, and the unconsumed data keys
`CONSTELLATION`/`CLOCK_CUBE`/`SOUND_BY_YEAR`/`SUB_FLOW` (music-data.js 3.74 → 3.52 MB).

**`blurb-demo.js` retired** — its reads are folded into `llm-about.js` (now 15,018 entries,
one entry per line). `instrumentals.js` is a deployed data file (351 keys); TrackView shows
"Instrumental — no words to read" for entries in `window.ROTATION_INSTRUMENTALS`.

**`genius-mood.json`** (**28,752 rows** as of 2026-09-21, 99.07% of the lyric layer) is the
lyric-mood store behind the Reads bars, the calibrated/cathartic chips, the Explore register row
and the emotional weather; **`genius-themes.json`** (**28,375 rows** + a `_themes` names key,
98.64%) is its sibling behind `INSIGHTS.THEMES` and the Lyrical diet. Schema, the
valence/register taxonomy, provenance flags and the coherence gate are documented end-to-end in
**`MOOD_PIPELINE.md`** — read that before touching anything mood-driven, and
**`tools/README.md`** before *running* anything (both pipelines are tracked tools at
`rotation/tools/` since 2026-09-21; the model, prompt and quantisation are the reproduction of
record and are not a maintenance decision to change).

**Opus reads are lyric-independent (invariant, enforced 2026-07-24):** every `opus` read
must DISTIL the song, never quote or closely paraphrase its lyrics. Detector = shared
content-word bigrams between read and lyric (STOP-filtered); the corpus is held at bigram
overlap ≤3, no quote marks (~4,660 reads rewritten across 3 lyric sources, 99.8% coverage,
independently QC'd). New/edited reads should pass the same gate; workshop tooling lives in
the untracked GitHub-root `.sptmp/` (detector, batch builders, `apply-redrafts.js` which
preserves the one-entry-per-line format). Lyric lookups must join keys back to REAL names
via `media-index.js` + `lib-slug.js` — never de-slug a key to guess a title.

Still around, intentionally: `design-canvas.jsx`, `variant-*.jsx`, `Shader Wallpapers.html`
(design-tool artifacts, not deployed — the CI staging list skips them); `run-spotify-daily.ps1`
(pre-archive local Spotify loop); `_config.yml` (Jekyll-era, rollback path only). The Live tab
remains dormant until a concerts cache exists (ROADMAP M2).

## 10. Conventions & constraints (do not violate)

1. **Secrets:** `LASTFM_API_KEY`, `SPOTIFY`/`SPOTIFY_SECRET` (in `culture/.env`),
   `TICKETMASTER_API_KEY`, `DISCOGS_TOKEN` — env-only. Never print, never commit.
2. **`node_modules` is not gitignored** — never install packages inside the repo. Temp/dep dirs
   live at the GitHub root: `../../.dtmp` (duckdb), `../../.sptmp` (archive extraction), `../../.babelcheck`.
3. **Ship to main.** Production is the test environment; don't block on local verification.
4. **Commit trailer:** `Co-Authored-By: Claude <model> <noreply@anthropic.com>`.
5. **Weight discipline:** new data belongs in *lazy* generated files, not in `music-core.js`,
   unless the Overview needs it at first paint. Heavy per-artist prose goes in `music-rest.js`
   via the `ARTIST_X` map. Watch generated-file sizes (`build-data.js` prints them).
6. **Insight, not mirrors:** features must derive something last.fm doesn't already show.
7. **Data corrections have three lanes — pick the right one (clarified 2026-09-21).**
   (a) **`folds.json`** = identity: two spellings are the same entity (§5, stage 1). This is
   the fold mechanism; diff it against the spine and re-check `track-merge.json` after any title
   change. (b) **`pins.json`** = entity correction: the right entity was named but the wrong
   *id* was joined — a tracked, durable, hand-audited ledger that every enricher and build-data
   now consult (§4). Not "fragile" any more; it is the answer. (c) **`sync-csv.js`'s
   `ARTIST_ALBUM_REMAP` / `TRACK_REMAP` / `fixRow()`** = **damaged source rows only** — rows
   last.fm recorded wrong at scrobble time, applied on every pull and to the existing CSV via
   `--fixcsv`. The canonical case is alt-J (`sync-csv.js:236-244`): a hyphen split the name at
   scrobble time into ARTIST `"ALT"` / TRACK `"J (deltas) Breezeblocks"`, and the `ALT → Alt.`
   spelling fold then dragged those plays into an unrelated Australian metalcore band as a
   phantom 2013 debut. A remap is only safe when the raw string occurs on exactly the rows you
   mean — check that first. CSV-OVERRIDES.md (local-only) stays the log.
8. `archive.zip` and `spotify-audio-features.parquet` are large local-only inputs;
   never commit, keep them off the repo.
9. **Mobile/visual verification tooling** (local): headless Edge screenshots
   (`msedge --headless --screenshot --window-size=390,H <url>` — beware: this mode reserves
   scrollbar width and produces phantom right-edge clipping) and, authoritative,
   `.sptmp/overflow-audit.js` (puppeteer-core in `../../.dtmp`, real viewport emulation — lists
   every element extending past 390px). Screenshot + audit BEFORE and AFTER design changes.
   **Run it from PowerShell** — the Bash sandbox blocks the browser process and the failure looks
   like a puppeteer config error rather than a permissions one. Reasoning about CSS instead of
   running this cost three attempts on one mobile row (2026-08-21/22); the two ways a horizontal
   rail silently refuses to scroll are written up in DESIGN.md §3.5.
10. **Phone labels are a second map, not a tighter first one.** `FAM_SHORT`/`famShort` in
   rotation-core is a desktop truncation that still reads as the genre ("Metalcore", "Electronic");
   `FAM_TINY`/`famTiny` is the phone form, as short as a chip can go before it stops being a word
   ("Nu", "DnB", "Rap"). Both fall through to the full name for anything unmapped. Merging them
   would either bloat the phone chips or shrink the desktop labels past what they need.
11. **Both labels ship; CSS picks one.** Genre chips, the tune-DNA pill and Canvas's mark filters
   all render the full and short forms and swap with `display` at the breakpoint. Nothing measures
   width in JS, and the full text stays reachable via `title`.
12. **Correct an id in `pins.json`, never in `artist-stats.json`** (§4). Stats is the raw
   last.fm layer; the next scrape is expected to rewrite it. Any new script that fetches or
   joins under an artist mbid must take the pin first via the `mbidFor` pattern, or it becomes a
   fresh re-poisoning vector.
13. **Anchor identity on the songs before any per-artist verdict** (§5). No exceptions for
   "obvious" acts — short and common names are exactly where this fails.
14. **Bare rows resolve through `recOf` — every field, every time.** Calendar-period rows on the
   Overview are the skeletal calendar-detail shape `{id, name, hue}` and carry **no `yp`, no
   `d`, nothing else**. So **every per-row field read in the map band's `onStats` pass must go
   through `recOf()`** (`rotation-worldmap.jsx:411`), never off `e.a` directly. The Decades
   outage (a calendar pick emptied the `debutYears` histogram and unmounted the card) was the
   **third** instance of this exact class — the peak-year aggregate got the resolution at birth,
   `debutYears` had to be retrofitted (`:601-604`). Treat a new read off `e.a` as a bug until
   you have checked it against the bare shape.

## 11. External accounts / identities

last.fm `fuadex` · GitHub `Fuadex` · email fuadex@gmail.com · timezone AEST (UTC+10,
`TZ_OFFSET_HOURS = 10` in build-data.js) · location Sydney (relevant for concerts).
