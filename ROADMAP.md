# Rotation — Audit & Roadmap

> Companion to **ARCHITECTURE.md** (read that first — it defines what already exists).
> This file = ① audit findings, ② evaluated API/data-source catalogue, ③ the modular build plan.
> When a module ships: mark it, move its feature description into ARCHITECTURE.md §8.
> Absorbed and replaced the old IDEAS.md on 2026-07-03. Audit date: **2026-07-03**.

---

## ① Audit findings

### A1 · Performance — ✅ largely RESOLVED 2026-07-03 (`06f9f1e`)
- ~~Shipping React development builds~~ → production builds, SRI-pinned (−1.4 MB runtime).
- ~~Dead keys in music-data.js~~ → CONSTELLATION/CLOCK_CUBE/SOUND_BY_YEAR/SUB_FLOW dropped
  (3.74 → 3.52 MB). Further `EXPLORE`/`INSIGHTS` fat-trimming still possible.
- **Open:** in-browser Babel still compiles ~450 KB of JSX per load — *by explicit choice*
  (buildless philosophy; Fuad opted to keep it, 2026-07-03). A `precompile.js` option remains
  on the table if phones ever feel it. No `defer` on data scripts either.

### A2 · Repo & operations — ✅ RESOLVED 2026-07-03
- ~~Daily commits of ~19 MB generated JS~~ → **CI-built deploys**: Pages source = "GitHub
  Actions", generated files gitignored, workflow commits only the CSV delta and ships `_site/`
  as an artifact. `smoke.js` gates every deploy.
- ~~Enrichment staleness~~ → `enrich.yml` weekly incremental refresh (last.fm + MusicBrainz).
- **Open:** concert data still needs its own automation once M2 lands.

### A3 · Resilience & correctness — mostly resolved
- ~~No error boundary~~ → `<Boundary>` wraps every routed view.
- ~~Explore state unshareable~~ → full slice serialized into the hash. **Map filter state is
  still not in the URL** (mode/focus/year/genre) — do when Map is next touched.
- **Open:** unpkg is a single point of failure (SRI-pinned but availability-coupled). Consider
  self-hosting the three runtime files.
- **Open:** name-ambiguity pins (Bleach-class) are manual — a `pins.json` the enrichers consult
  (name → forced mbid/spotify/discogs id) would make them durable. **Required before the CAA
  cover run** (Fuad explicitly wants no Bleach repeats).

### A4 · UX / product
- ~~No favicon/social meta/OG image~~ → shipped 2026-07-03 (favicon.svg + og.png + OG/twitter meta).
- **Stories + Overview overhaul wanted** (Fuad, 2026-07-03): both could be "much more dynamic
  and more interesting" — future iterations welcome *pending approval per iteration*. Stories
  is ~27 cards of strong content in one giant scroll: sticky mini-TOC / per-story deep links /
  more live rotation of which cards surface.
- **Design overhaul wanted** (Fuad, 2026-07-03): built mobile-first via phone sessions, but
  mobile responsiveness is still patchy in places and **desktop "doesn't look that great"** —
  a dedicated desktop-layout pass is on the table.
- **Bug:** Stories renders a literal `[object Object]` somewhere (Fuad saw it; not yet
  reproduced — hunt it during the Stories pass).
- Tracks without Spotify features (~0.5%) and artists without AUDIO rows silently lose radar/
  quadrant cards — a subtle "no audio data" note would read as data, not bugs.
- Real album art exists for ~17.7k albums; the rest render generative — CAA fills the gap (M1).

### A5 · Code health
- Dead views (Charts/Clock/SoundMap/Eras/Constellation) — delete or archive; they confuse every
  future session (this audit exists partly because features kept getting "lost").
- `rotation-views2.jsx` is 107 KB and holds four unrelated pages; when next touched, split into
  `rotation-artist.jsx` / `rotation-media.jsx` (album+track) / `rotation-live-view.jsx`.
- Design-tool artifacts (`design-canvas.jsx`, `variant-*.jsx`, `Shader Wallpapers.html`) sit in
  the deploy root — move to a `/lab` folder or exclude from Pages.

---

## ② API & data-source catalogue (evaluated)

### Verified working / already integrated
| Source | Status | Notes |
|---|---|---|
| last.fm API | ✅ core | scrobbles, tags, bios, similar, global stats. **Unused freebies: `user.getLovedTracks` (a "loved" signal!), `track.getTopTags`** |
| MusicBrainz | ✅ integrated | origins, aliases, relations, release-groups, gender + life-span (stored since 06-30, shown via `ArtistMeta`). **Still-unstored freebies: release-group secondary types (live/comp/remix), release-group IDs (→ CAA covers)** |
| Cover Art Archive | ✅ verified 07-01 | `coverartarchive.org/release-group/{id}/front` — free, keyed by the release-group ids we currently discard. THE album-art unlock |
| Discogs | ✅ integrated | styles, members, profiles, images, **official URLs (2,937 artists, stored but unused)** |
| Spotify Web API | ⚠ limited | post-2026: id/photos/genres only for catalogue; **user-scoped endpoints still alive: /me/tracks (liked), /me/top, recently-played, playlists** — dev-mode app on own account is fine |
| local Spotify catalogue dataset | ✅ local | large local zip; per-track features + album art + meta already extracted. Re-query for anything track-level |
| Ticketmaster Discovery | ✅ works, dormant | 5k req/day free. `enrich-concerts.js` ready; needs a scheduled run |
| setlist.fm | ✅ verified 07-03 | free key; `GET /user/{userId}/attended` returns concerts you marked attended (paginated) + full setlists → **the gig-history spine** |

### Evaluated & rejected (don't re-litigate without new evidence)
| Source | Verdict |
|---|---|
| AcousticBrainz | ❌ tested 2026-06: ~40% coverage, gender classifier is a coin-flip, genre_dortmund degenerate. Dead project |
| Bandsintown API | ❌ keyless API killed (403); partner-only now |
| Songkick API | ❌ partner-only since ~2020 |
| a local dataset **metadata** SQLite | ❌ cover URLs locked in a single a large file; wrong tool (CAA wins) |
| Spotify audio-features/recommendations API | ❌ deprecated Nov 2024 for new apps (archive dump replaces it) |
| Generic third-party cover dumps | ❌ no join key to our library |

### Candidates worth a spike (not yet committed to)
- **Spotify "Download your data" export** — account data (~days): Liked Songs, playlists, follows;
  **extended streaming history** (~weeks): complete play log with `ms_played`, platform, skips →
  reconciles last.fm gaps, adds *skip behaviour* nobody else has. Request early; it's slow.
- **Wikidata** (via MB links): hiatus/reunion dates, awards, band member genders at scale.
- **ListenBrainz**: open scrobble mirror + their stats/similar-users API; also a hedge against
  last.fm API mortality (import once, sync forever).
- **Open-Meteo historical weather** (Sydney, keyless): plays × weather/temperature correlations —
  gimmicky but genuinely novel insight material ("your DnB days are 3° hotter").
- **MusicBrainz recording rels**: "cover of" → how much of the library is covers; work language
  → singing-language over time (formalizes the Japanese-music thread).
- **Genius API**: writers/producers per song (session-musician web beyond band members).

---

## ③ The plan — modular, ordered by leverage

Each module is independently shippable. Suggested order: **M0 → M1 → M2 → M3 → M4 → M5** —
foundations first, then the two big new data domains (gigs, personal Spotify), then the
correlation layer that feeds on all of it.

### M0 · Foundations — ✅ SHIPPED 2026-07-03 (`06f9f1e`)
Production React · error boundary · dead-code purge · smoke.js gate · CI-built Pages deploys
(generated files out of git) · weekly enrich.yml · Explore→URL state · OG meta + favicon.
Left open, deliberately: Babel stays in-browser (Fuad's call); runtime files still on unpkg;
Map URL state pending; views2 split opportunistic.

### M1 · Use what we already have (zero new-source integrations) — ~1–2 sessions — **NEXT UP**
1. **Fill the cover-art gap** (approved as *fallback + audit run*, 2026-07-03): the Spotify
   archive supplies 17,726 covers; ~half the album library renders generative. Store
   release-group ids from `enrich-mb.js` data, build **`pins.json`** first (ambiguity guard —
   no Bleach repeats), batch-probe **Cover Art Archive** for the misses only, then produce a
   **hit-rate report vs what we have** before wiring into media-index `[6]`.
2. **Official URLs** on artist pages (Bandcamp/site/Wikipedia from discogs-artist.json —
   2,937 stored, unused).
3. **Deepen band status** (glyphs + disbanded badges already shipped 06-30): backfill origins
   coverage (4,764 → full explore universe), and *exploit* `ended` — a "bands that ended while
   you were listening" story, disbanded-share stat, feeds M2's "caught them in time".
4. Discogs bios as fallback where last.fm bio is empty.
   *(last.fm loved tracks: dropped — Fuad's loved data is uncurated/unreliable; the real
   "liked" signal arrives with Spotify in M3.)*

### M2 · Gigs & live module (the concert thread) — ~2–3 sessions
*Spine:* **setlist.fm attended list** — Fuad decided (2026-07-03) to create a setlist.fm
account and mark his concerts there (`GET /user/{id}/attended`, free key, setlists included) —
plus a manual **`gigs.json`** for festivals/shows setlist.fm lacks
(`{artist|festival, date, venue, city, rating, favorite, note}`).
1. `enrich-gigs.js`: pull attended shows + setlists from setlist.fm, merge gigs.json,
   venue/city geo. **Blocked on: Fuad's setlist.fm username + populated attendance.**
2. **Gigs tab**: timeline + map (reuse world-map + streamgraph infra), per-gig cards.
3. Correlations: gig ↔ scrobble history ("you played them 3× more the month after"),
   **seen vs never-seen coverage** of top artists, setlist ↔ your-top-tracks overlap
   ("they played 7 of your top 10").
4. **"Caught them in time"** (emotional centrepiece): MB end-dates × gig dates — bands you saw
   before they ended vs ones that got away.
5. Revive Ticketmaster upcoming-events on a weekly schedule → Live tab returns, now with
   "never seen, playing near you" framing.

### M3 · Personal Spotify module — ~2 sessions + waiting on export
1. **Request the extended streaming history export now** (up to 30 days' wait).
2. Fast tier meanwhile: Liked Songs via API (`/me/tracks`, dev-mode app) → `spotify-liked.json`.
3. **Liked × played quadrant**: guilty pleasures (high-play/unliked) vs aspirational backlog
   (liked/unplayed); liked-set DNA vs played-set DNA ("you *like* darker than you *play*").
4. Extended history ingest → parallel play-log in build-data: fills last.fm gaps, adds
   **skip-rate per artist/track**, platform split, `ms_played` true listening time vs scrobble
   counts. Reconciliation story ("the mobile era last.fm missed").

### M4 · Correlation lab (the "learn about myself" engine) — ongoing
**Prerequisite: `residences.json`** — Fuad has lived all over the world, so any
location-dependent correlation (weather, local time-of-day before ~2016, "local scene" effects)
needs a simple personal timeline: `[{from, to, city, country, tz}]`. Ten minutes of manual
entry unlocks a whole lens: *eras by home city* ("what Warsaw sounded like vs Sydney"),
correct local-time clocks per era, gig proximity. Build this first.

The payoff layer; each item is a build-data export + a Story/insight card:
- **Sound × time**: energy by hour-of-day/day-of-week; tempo of 3 AM vs 3 PM; season × valence
  (do Sydney winters darken the palette?); year × key/mode drift.
- **Weather × listening** (Open-Meteo backfill, keyless).
- **Lifecycle models**: artist half-life (discovery → peak → decay curves, per genre); binge
  signature (do you binge albums or shuffle artists?); repeat-gap distribution (same track twice
  in a day/hour).
- **Language over time** (MB work language / script detection): the JP-music arc quantified.
- **Covers**: MB "cover of" rels — share of covers, favourite covered-artist.
- **Network centrality**: which member-connection actually gates the most plays.
- Insight-engine expansion: providers for gigs (M2), liked (M3), weather, language —
  the Overview feed gets deeper automatically.

### M5 · Platform polish — partially approved 2026-07-03
- **Wrapped mode — APPROVED**: per **year and month**, likely integrated with/entered from the
  Calendar (click a year/month → full-screen swipeable card-by-card reveal built from
  YEARS/calendar-detail data). Prototype and see where it takes us.
- **Shareable stat cards — APPROVED as a test**: one story card → PNG export first, judge, then
  generalize.
- PWA/offline: explained to Fuad, awaiting his verdict.
- Stories mini-TOC; per-story deep links (`#stories/adoption`) — folds into the Stories overhaul (A4).

### M6 · Open-source "build your own Rotation" — exploratory (Fuad, 2026-07-03)
Friends showed interest; nothing this deep exists as a product. Direction: keep fuad.au as the
personal instance, extract a template repo (`rotation-template`): fork → add your last.fm
username + API key secret → Actions builds your CSV + caches → your own Pages site. Needs:
config file instead of hard-coded fuadex/TZ/genre-families, secrets-only keys, personal data
(CSV/caches/gigs) split from code, docs. Monetization judged flaky (hosted SaaS = API ToS +
infra + support burden); realistic paths are GitHub Sponsors / donations, or a paid "set it up
for me" concierge. Decision pending — design new features template-aware from now on.

---

## Parking lot (unranked)
Vinyl/format breakdown (Discogs release formats) · supergroup detection (MB rels) · festival
lineup auto-pull (setlist.fm/Wikipedia) · Discogs collection value tracker · listening-goal
widgets (streak defense) · "十年前 today" push-style digest page.
