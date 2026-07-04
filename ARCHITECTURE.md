# Rotation — Architecture & Feature Inventory

> **The single source of truth for what this project is, how it works, and what it already has.**
> Read this before changing anything. When you ship a feature, update §8 (features) and, if data
> shapes changed, §6 (data model). Companion docs:
> - **ROADMAP.md** — audit findings, API catalogue, and the modular plan for what's next.
> - **CSV-OVERRIDES.md** — manual data corrections (gitignored, local only).
>
> Last full audit of this document: **2026-07-03**.

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

Buildless **React 18.3.1 UMD + @babel/standalone** from unpkg (SRI-pinned in `index.html`).
Every `.jsx` file is loaded as `<script type="text/babel">` and compiled *in the visitor's
browser* on every page load. No router library — hash routing (`#view/id`) in `rotation-app.jsx`
with `pushState` + `popstate`/`hashchange` sync. Components communicate via `window` globals
(`Object.assign(window, {...})` at the bottom of each file).

### Script tiers

**Tier 0 — eager (in `index.html`, blocking first paint):**
| File | Role |
|---|---|
| `react(-dom).production.min.js`, `babel.min.js` | runtime (production React since 2026-07-03; JSX still compiles in-browser by design) |
| `music-data.js` (~4.4 MB) | `window.ROTATION` — the core dataset |
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
  music-data.js            9 lazy data files              console stats
 (window.ROTATION)   (media-index, track-audio, …)

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
never committed** (last.fm + Spotify keys live in `Fuad-Soudah/Culture_2/.env`).

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
| `enrich-spotify-archive.js` | **local catalogue dataset** (`archive.zip`, large local, local-only) | `spotify-albumart.json` (17,726 covers), `spotify-albummeta.json`, `spotify-artist-img.json`, `spotify-genres.json` | album covers, release year/type/label, artist imgs, genres |
| `.sptmp/cover-audit.js` + `caa-probe.js` (local) | dump raw join + MusicBrainz/CAA | `spotify-albumart-extra.json`, `spotify-albummeta-extra.json` | conservative fuzzy + Cover-Art-Archive cover fills; merged additively (base wins), safe from `--rematch` |
| `.sptmp/stage1-query.js` + `stage2-query.js` (local, archive pass 2) | dump parquets | `spotify-ids-derived.json` (462 name+title-corroborated artist ids), `spotify-albtracks.json` (total_tracks → media `[9]`), `spotify-genres-extra.json`, `spotify-track-links.json` (**39k ISRCs** + preview hashes + disc), `spotify-track-extra.json`, `spotify-collabs.json` (5,730 credit edges, unfiltered — play-filter at build when the feature ships) |
| `enrich-coverage.js` | (local caches + CSV) | console report | per-cache coverage by play-band + head-gap offenders — run before deciding any enrichment expansion |
| `enrich-spotify-tracks.js` | local catalogue dataset | `spotify-track-data.json` | per-track audio features (36.9k tracks; §6) |
| `extract-audio.js` | (aggregates track data) | `audio-features.json` | artist-level Sound DNA |
| `enrich-concerts.js` | Ticketmaster Discovery | `concerts-cache.json` | upcoming events, top-200 artists — **cache currently absent → Live tab hidden** |

**Archive workflow (heavy, local-only):** parquets are streamed out of `archive.zip` one at a time
into `../.sptmp` (outside the repo), queried with DuckDB (`../.dtmp/node_modules`, via NODE_PATH,
`PRAGMA memory_limit='48GB'`), then deleted. `archive.zip` + `*.parquet` are gitignored.
⚠ `node_modules` is **NOT** gitignored in this repo — never `npm install` here; use `../.dtmp` /
`../.sptmp` / `../.babelcheck` at the GitHub root.

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

**`window.ROTATION`** (music-data.js) keys:
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
timeline: ended-while-listening, graves, elders, median band life, worst year).

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
(charts/clock/sound/eras/mood → explore, journey → map) still resolve. Global: `/` opens search;
popover layer; tweaks drawer.

## 8. Feature inventory (what is SHIPPED today)

### Overview (PC bento redesigned 2026-07-05, Fuad-approved)
- ≥1100px: now-playing(4) · scrobbles(2) · streak(2) top row with **Recently played as a
  right rail** (spans 3 rows); 2×2 stat strip + heaviest day; stat numbers halved.
- **Top artists**: 8×3 wall of 24 covers (grid on PC, x-scroll on mobile), all-time ⇄
  current-year toggle.
- **Insight row**: daily-rotating provider cards incl. Story of the day (deep-links a Stories
  card) and Riser of the week (live plays vs lifetime weekly pace).
- **"Where to dig"**: compressed to a chip strip (was six teaser cards).
- **"Your portrait"**: generated prose verdict with inline links.

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
After midnight · First contact · Heaviest day of every year.

### Explore (the converged digger)
One filter set — **time** (year chips + "play the decade" animation), **genre**
(families → subgenres, stable grouping), **mood quadrant** (valence×energy zones), **clock cells**
(7×24 rhythm grid, per-year) — over one universe (~6,000 artists). Left surface toggles
**texture map** (subgenre bubble scatter) ⇄ **mood lens** (1,000-artist quadrant + contextual
facts + "mood over the years" arc). Right: ranked artists/albums/tracks (albums/tracks rank the
full library via lazy media-index, load-more paging). Artists can also be ranked **by sound**
(energy/valence/acoustic/tempo/dance/pop). Explore search box jumps to artist/subgenre/year/clock
slices. Everything cross-filters; active-chip row with clear-all.

### Calendar
GitHub-style **every-day heatmap** for 20 years (calendar.js), click any day/week/month → lazy
period summary (top artists/albums/tracks for that slice, calendar-detail.js).

### Map (Geography — lives INSIDE Overview since 2026-07-05; defaults to cities)
World map (countries ⇄ city dots) sized by plays; colour by dominant genre / top artist's
genre / **sonic gradient** (energy/mood/debut-era). Year scrubber animates the geography.
**MapFlow**: a streamgraph that doubles as genre filter AND drill-path (families → subgenres →
artists), rescoped by map selection. Click a country/city → detail blob (top artists/albums/
songs + Sound DNA for that place, lazy geo-detail.js). Breakdown list with flags.

### Artist page (kept top-400; PC order reworked 2026-07-05)
Rank/est/origin header with **gender glyph (solo artists) + active/disbanded/deceased badge**
(`ArtistMeta`, MusicBrainz); on PC **bio + Sound DNA share the first row**, top tracks/albums
sit above the timeline, and "How they played out" is **collapsed to 300px with an
expand-timeline toggle** (full height on mobile). Details: **Sound DNA radar**
(vs library average, + key/loudness/speech/liveness/popularity/followers attribute grid);
**How they played out** (album/song streamgraph, lazy artist-flow.js); **Sounds like** (real
last.fm similar + by-sound neighbours, alias-aware, in-library badges); **Family tree** (members,
shares-members-with); top tracks (→ TrackView) + top albums (→ AlbumView); listening clock;
**live near you** block when concert data exists. Long-tail artists get **MiniArtistView**
(explore record + Sound DNA + similar + lazy top tracks/albums via artist-detail.js).

### Album page
Cover (real or generative), release year/type/label (Spotify archive), stats (plays, ~hours,
library rank), **Album Audio DNA** radar (dashed = your average) + bars, **Where it sits**
(mood MiniQuadrant + taste percentiles), **Your history** (year sparkline), tracklist ordered by
real track numbers with ★ standout + play bars (per-track mood dots removed 2026-07-04 —
energy/positivity live in the row tooltip); sibling albums.

### Track page
Header (track no, duration, explicit), **Audio DNA** radar (6 axes + dashed library average) +
bars, 7-attribute grid mirroring the artist pane (tempo/key/loudness/speech/live/popularity/
followers), key + mode spelled out, **Where it sits** (quadrant + percentiles), **Your history**
(sparkline + narrative + #rank within artist and all-time), sibling tracks. Mobile-responsive
grid. Entry points: album tracklists, artist top-tracks, Explore tracks tab, search songs,
Recently-played rows.

### Shelves (the record shop — shipped 2026-07-04, rotation-shelves.jsx)
Positioning: **Explore is the database, Shelves is the record shop.** Every album ≥3 plays
(~11.5k) racked as thin colored **spines** on genre shelves (family rows, Misc last); hover /
first tap **fans a spine open** into its cover (300px CDN variant; collapsed spines are pure
divs — images mount only when fanned; rows use `content-visibility`); click opens the
**Reader** bottom-sheet (big cover, stats incl. n/N track completeness, **needle drop** = the
album's top track's 30-s preview with a **vinyl that slides out and spins while playing**,
→ full AlbumView). Per-shelf "dig deeper" pagination (90 + 120 steps), **split into
subgenres** per family row, 🎲 **crate dig** random pull. Wear tiers brighten heavy-play
spines. Zero own data files — derives from media-index + track-previews + EXPLORE at runtime.
Queued V2/V3: re-shelving lenses (decade/era/mood/label/completeness), tag-source filter,
dust from REVISIT, the Unplayed Shelf (archive export). Mobile grammar: tap=fan, tap again=Reader.

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

1. **Secrets:** `LASTFM_API_KEY`, `SPOTIFY`/`SPOTIFY_SECRET` (in `Fuad-Soudah/Culture_2/.env`),
   `TICKETMASTER_API_KEY`, `DISCOGS_TOKEN` — env-only. Never print, never commit.
2. **`node_modules` is not gitignored** — never install packages inside the repo. Temp/dep dirs
   live at the GitHub root: `../.dtmp` (duckdb), `../.sptmp` (archive extraction), `../.babelcheck`.
3. **Ship to main.** Production is the test environment; don't block on local verification.
4. **Commit trailer:** `Co-Authored-By: Claude <model> <noreply@anthropic.com>`.
5. **Weight discipline:** new data belongs in *lazy* generated files, not in music-data.js,
   unless the Overview needs it at first paint. Watch generated-file sizes (`build-data.js`
   prints them).
6. **Insight, not mirrors:** features must derive something last.fm doesn't already show.
7. Data corrections go through `sync-csv.js fixRow()` (durable) or are logged in
   CSV-OVERRIDES.md (cache pins, fragile).
8. `archive.zip` (large local) and `spotify-audio-features.parquet` (a large) are local-only;
   never commit, never re-download casually.
9. **Mobile/visual verification tooling** (local): headless Edge screenshots
   (`msedge --headless --screenshot --window-size=390,H <url>` — beware: this mode reserves
   scrollbar width and produces phantom right-edge clipping) and, authoritative,
   `.sptmp/overflow-audit.js` (puppeteer-core in `../.dtmp`, real viewport emulation — lists
   every element extending past 390px). Screenshot + audit BEFORE and AFTER design changes.

## 11. External accounts / identities

last.fm `fuadex` · GitHub `Fuadex` · email fuadex@gmail.com · timezone AEST (UTC+10,
`TZ_OFFSET_HOURS = 10` in build-data.js) · location Sydney (relevant for concerts).
