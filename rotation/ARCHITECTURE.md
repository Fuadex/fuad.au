# Rotation — Architecture & Feature Inventory

> **The single source of truth for what this project is, how it works, and what it already has.**
> Read this before changing anything. When you ship a feature, update §8 (features) and, if data
> shapes changed, §6 (data model). Companion docs:
> - **ROADMAP.md** — audit findings, API catalogue, and the modular plan for what's next.
> - **CSV-OVERRIDES.md** — manual data corrections (gitignored, local only).
>
> Last full audit of this document: **2026-07-03**. Phase 0 platform work (precompile,
> self-hosted React, music-core/rest split, TourMap fix) folded in **2026-07-07** — see §2, §6.

---

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

**Tier 0 — eager (in `index.html`, blocking first paint):**
| File | Role |
|---|---|
| `react(-dom).production.min.js` | runtime — **self-hosted** (Phase 0); Babel is dev-only + CI-only, absent from prod |
| `music-core.js` (~3.3 MB / 989 KB gz) | `window.ROTATION` — everything first paint reads (see split below) |
| `music-rest.js` (~1.4 MB / 404 KB gz) | deferred dataset — **injected by `rotation-app` after first paint**, `Object.assign`s into `window.ROTATION`, flips `_restLoaded` |
| `live-data.js` (~4 KB) | `window.ROTATION_LIVE` — daily live snapshot |
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
a fallback card instead of blanking the site.

**Deploys are CI-built (since 2026-07-03):** Pages source = "GitHub Actions". The workflow builds
the dataset and uploads an explicit `_site/` staging list — generated data files are **not in
git** (`.gitignore`d; only `fuadex.csv`, caches, code, and the static `world-map.js` are
committed). `_config.yml` is a leftover from the Jekyll era, kept only as a rollback path.

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

Known enrichment fragility: name-ambiguous artists can cache the wrong entity (see the **Bleach**
pin in CSV-OVERRIDES.md — re-running photo/discogs enrichers can silently re-break it).

## 5. Identity & cross-cutting systems

- **Artist id** = `slug(name)`: lowercase, non-alphanumerics → `-`; hash fallback `a-XXXXXXX` for
  fully non-Latin names. Same function at build time and runtime.
- **Album id** = `slug(artist)~slug(title)`; **Track id** = `slug(artist)~slug(track)` (routes
  `#album/…`, `#track/…` — mirrors media-index / track-audio keys).
- **Alias resolution:** `R.idForName(name)` — direct slug, then `ALIAS_TO_ID` (MusicBrainz
  aliases), so a click on "Midori" lands on ミドリ. `R.played(name)` checks the ≥3-plays set
  including aliases.
- **Colour system 1 — artist hue:** each artist inherits its genre **family** hue
  (`build-data.js` FAMILIES: nu-metal 24 orange, thrash 4 red, metalcore 346, industrial 214 blue,
  DnB/electronic 190 cyan, prog 282 purple, Japanese 332 pink, digital-hardcore 308, hip-hop 46,
  punk 96, shoegaze 252, pop/indie 60), falling back to a name-hash hue. Consistent everywhere
  (bars, covers, radars).
- ~~Colour system 2 — track mood dots~~ removed 2026-07-04 (hue-as-scale unreadable; Fuad:
  "bloated"). Track mood now lives only in tooltips + the track page's quadrant.
- **`GenCover`:** generative cover art from name+hue, auto-upgrading to Discogs thumb (`THUMBS`)
  or Spotify image (`SPOTIMG`) when available. Real album covers exist only where the archive had
  them (`spotify-albumart.json`); otherwise generative.
- **Taste percentiles:** `AUDIO_DIST` = play-weighted CDF (permille) per audio axis over the whole
  library — powers "more energetic than 87% of what you play" phrasing and the dashed
  "your average" overlay on DNA radars.

## 6. Data model (compact formats — check before consuming)

**Core/rest split (Phase 0, 2026-07-07):** `window.ROTATION` is assembled from **`music-core.js`**
(eager) + **`music-rest.js`** (deferred, injected after Overview's first paint). Core carries
everything the Overview first paint reads (ARTISTS, TOTALS, NOW, RECENT, TREND, INSIGHTS, YEARS,
THUMBS, SPOTIMG, GIGS, TOUR, SUBS, GENRE_FLOW, FAMILIES, helpers) plus **`EXPLORE_N`** (the
EXPLORE count, since that's the only EXPLORE read on first paint). Rest carries the deferred
keys: **EXPLORE, ALBUMS, AUDIO, ARTIST_CLOCK, SUB_ARTISTS, CLOCK_BY_YEAR**. Core stubs those
empty and sets `_restLoaded=false`; rest merges them, rebuilds `expById`, flips `_restLoaded=true`,
and calls `window.__rotRest`. **Guard rule:** every non-Overview view reads a deferred key, so
`rotation-app` gates them behind `restReady` (a "loading your library…" card) and mounts them
FRESH once rest lands — so their `useMemo`s never cache empty. The Overview map band is gated the
same way. Node consumers (smoke, sync-live, extract-audio, enrich-spotify) evaluate both files in
one context to reconstitute the whole object.

**`window.ROTATION`** (music-core.js + music-rest.js) keys:
`ARTISTS` (kept = **top 400 by plays** (~100-play cutoff, raised from 200 on 2026-07-04:
206→3.5 MB, 400→4.4 MB, 1000→6.5 MB — 400 chosen) + per-year top-10 union; full records:
name/id/plays/hue/tags/country/members/bio/similar/…),
`ALBUMS` (top 120 + 4/kept-artist ≈ 1,572), `TRACKS` (top 50), `GENRES`, `FAMILIES`, `SUBS` + `SUB_ARTISTS` + `EXPLORE`
(~6,000-artist universe: `{id, name, plays, hue, s:[subIdx], co, ci, yp:{year:plays}(top 3k)}`),
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

**Artist audio row** — `R.AUDIO[artistId]` =
`[energy, valence, acoustic, tempo, dance, instr (0–1), major, popularity 0–100, followers, loudness dB, speechiness, liveness, avgTrackSec]`.

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
`R.CITIES` is empty (it currently is). The Map page was **ported wholesale into Overview**
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

### Insight engine (rotation-insights.jsx)
Providers (score-ranked, de-duped, day-jittered): first-scrobble anniversary countdown, next
round-total milestone, artist about to tip a round play count, distinct-artist milestone, week in
review (vs weekly average), new-this-month + deepest dive, mood lately vs baseline (quadrant),
top of current year, last-72h histogram, on-this-day through the years (±3-day fallback),
comeback of the day, top-artist share, discovery rate, daily intake. Failures are swallowed
per-provider.

### Stories (the long-read feed)
On this day · How deep it goes (underground index + deepest cuts) · How old the music was
(adoption lag by decade + deepest digs) · Connected by blood (shared-member web) · Blind spots
(taste-gap recommendations) · Gathering dust (revisit/decay) · **A year in review** (scrubbable
per-year deep dive) · Top of each scene (Discogs styles) · Bridge artists · Style atlas
(styles only this library keeps alive) · Gateways (first artist per country) · **The ones that
ended** (disbanded/died while you listened, graves dug up, elders — INSIGHTS.LIFESPAN) · How the
sound drifted (yearly DNA drift) · When the taste turned (underground share of discoveries) ·
How the map moved · Where the taste comes from · The streak · Milestones · Obsessions · Flameouts ·
The constants · Their era · The incubation · Album weeks · Comebacks · One-day wonders ·
After midnight · First contact · Heaviest day of every year. **Phase 3 (2026-07-07):** How you
listen (sessions/sittings/binge + album front-to-back) · What follows what (segue graph) · Music
for a season (seasonality) · The chapters of your taste (auto-segmented eras) · The shape of an
obsession (lifecycle: flameout/perennial + "burning now" flameout prediction).

### Explore (the converged digger; reflowed 2026-07-05)
One filter set — **time** (year chips + "play the decade"), **genre** (families → subgenres),
**mood quadrant** (valence×energy zones) — over one universe (~6,000 artists). Left surface
toggles **texture map** (subgenre scatter) ⇄ **mood lens** (quadrant + facts). Right: ranked
artists/albums/tracks (full-library media-index; **8/16/24/32 count buttons + a "load more" that
reveals rows *beyond* the base** — visible = base+extra; buttons set the base & reset the
expansion, load-more adds +24 and grows the media pool, works for all three tabs; unified
2026-07-07). PC fixed-height scroll window. **Below the module**: the by-sound **sort row** (plays → energy/mood/…/most obscure),
then the "mood over the years" arc, then the **genre families as a 6-column grid** (3-col ≤1250px,
1-col ≤760px; each family's subgenre list capped + scrollable). The Rhythm clock-cell filter was **removed** (clock moved to
Calendar). Subgenre spelling variants (hip hop/hip-hop, nu metal, dnb…) merge via `SUB_CANON` in
build-data. ⚠ mood-lens first paint is slow (open bug).

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

### Live (dormant)
Full UI exists (`LiveView`, `ConcertRow`, city picker, "from your library" vs "also in town")
but the tab auto-hides — `concerts-cache.json` hasn't been generated recently (Ticketmaster
enricher works; needs a refresh run + ideally automation. See ROADMAP M3).

### Search (`/`)
Overlay over search-index (artists: name/plays/span/peak-year) + media-index (songs + albums)
→ artist / album / track pages.

## 9. Dead code & dormant surfaces

**Purged 2026-07-03** (commit `06f9f1e`): `ChartsView`/`ClockView`/`SoundMapView`/`ErasView`
(absorbed into Explore long ago), `rotation-constellation.jsx`, and the unconsumed data keys
`CONSTELLATION`/`CLOCK_CUBE`/`SOUND_BY_YEAR`/`SUB_FLOW` (music-data.js 3.74 → 3.52 MB).

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
5. **Weight discipline:** new data belongs in *lazy* generated files, not in music-data.js,
   unless the Overview needs it at first paint. Watch generated-file sizes (`build-data.js`
   prints them).
6. **Insight, not mirrors:** features must derive something last.fm doesn't already show.
7. Data corrections go through `sync-csv.js fixRow()` (durable) or are logged in
   CSV-OVERRIDES.md (cache pins, fragile).
8. `archive.zip` and `spotify-audio-features.parquet` are large local-only inputs;
   never commit, keep them off the repo.
9. **Mobile/visual verification tooling** (local): headless Edge screenshots
   (`msedge --headless --screenshot --window-size=390,H <url>` — beware: this mode reserves
   scrollbar width and produces phantom right-edge clipping) and, authoritative,
   `.sptmp/overflow-audit.js` (puppeteer-core in `../../.dtmp`, real viewport emulation — lists
   every element extending past 390px). Screenshot + audit BEFORE and AFTER design changes.

## 11. External accounts / identities

last.fm `fuadex` · GitHub `Fuadex` · email fuadex@gmail.com · timezone AEST (UTC+10,
`TZ_OFFSET_HOURS = 10` in build-data.js) · location Sydney (relevant for concerts).
