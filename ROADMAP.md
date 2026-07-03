# Rotation — Audit & Roadmap

> Companion to **ARCHITECTURE.md** (read that first — it defines what already exists).
> This file = ① audit findings, ② evaluated API/data-source catalogue, ③ the modular build plan.
> When a module ships: mark it, move its feature description into ARCHITECTURE.md §8.
> Absorbed and replaced the old IDEAS.md on 2026-07-03. Audit date: **2026-07-03**.

---

## ① Audit findings

### A1 · Performance (high impact, low effort)
- **Shipping React *development* builds.** `react.development.js` + `react-dom.development.js`
  are ~5× the size of production builds and much slower (extra checks, no minification).
  Swap to `react.production.min.js` / `react-dom.production.min.js` (~140 KB total). Single-line
  change, biggest single perf win available.
- **In-browser Babel compiles ~450 KB of JSX on every load** (phones pay ~1–3 s). Option worth
  prototyping: a `precompile.js` step (Babel via `../.dtmp`) emitting `*.compiled.js`, with
  index.html loading those and a `?dev=1` flag keeping the buildless path for editing. Keeps the
  no-bundler philosophy; deploys stay plain static files.
- **music-data.js (3.7 MB) blocks first paint** and contains provably dead keys
  (`CONSTELLATION`, `CLOCK_CUBE`, `SOUND_BY_YEAR`, `SUB_FLOW` — ARCHITECTURE §9). Dropping them
  + auditing `EXPLORE`/`INSIGHTS` fat could plausibly cut 20–30%.
- No `defer` on data scripts; boot screen masks this but Time-to-Interactive is real.

### A2 · Repo & operations
- **Daily commits rewrite ~19 MB of generated single-line JS** (media-index 6.8 MB + music-data
  3.7 + artist-flow 2.8 + track-audio 2.7 + calendar-detail 2.1 + …). Single-line JSON diffs
  poorly → git history will balloon over months. Industry fix: **stop committing generated
  files** — switch Pages source to "GitHub Actions", have the daily workflow build and deploy
  the artifact directly. Generated files leave git entirely; CSV history stays. (Local `.git` is
  ~55 MB already with only weeks of dailies.)
- **Enrichment staleness:** the daily action rebuilds from caches but never *refreshes* them —
  new artists appear with no tags/origin/images until a manual enrich run. Add a weekly
  `enrich-tags/-stats/-origins --missing-only` job (last.fm + MB are keyless/free-keyed).
- `enrich-discogs.js` is untracked (now committed); `concerts-cache.json` was never committed —
  Live tab has silently disappeared. Concert data is time-sensitive: it *needs* automation
  (see M3) or it will always rot.
- No smoke test. An 8-line `node --check` + "build-data runs + music-data.js parses + required
  keys exist" script in the workflow would catch the classic "site boots to a black screen"
  class of regression before deploy.

### A3 · Resilience & correctness
- **No React error boundary** — one throw in any view = blank site (test-in-prod makes this
  likelier). A tiny boundary per-view with a "this card broke" fallback matches the insight
  engine's swallow-per-provider philosophy.
- **Explore/Map filter state isn't in the URL** — deep links share only view/id; a year+genre+
  mood slice is unshareable and lost on refresh. Serialize chips into the hash
  (`#explore/y=2019&f=industrial`).
- **unpkg is a single point of failure** (SRI-pinned, good, but if unpkg is down the site is
  down). Consider self-hosting the three runtime files in-repo.
- Name-ambiguity pins (Bleach-class bugs) are manual and fragile — a `pins.json` the enrichers
  consult (name → forced mbid/spotify id) would make them durable instead of tribal knowledge.

### A4 · UX / product
- **Overview ≠ mobile-cheap:** it renders fine but pulls the full 3.7 MB dataset for what is
  mostly TOTALS + live snapshot. (Solved by A1/A2 payload work rather than redesign.)
- **The Stories feed is now ~27 cards long** — brilliant content, but it's one giant scroll with
  no index. A sticky mini-TOC (chip per story) would make it a destination rather than a scroll.
- Tracks without Spotify features (~0.5%) and artists without AUDIO rows silently lose radar/
  quadrant cards — consider a subtle "no audio data" note instead of missing sections, so absence
  reads as data, not bugs.
- Generative covers are lovely but **real album art exists for only part of the library** —
  Cover Art Archive fills the rest (M2).
- No favicon/social meta/OG image — trivially shareable site that unfurls as nothing.

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
| MusicBrainz | ✅ integrated | origins, aliases, relations, release-groups. **Unstored freebies in responses we already fetch: `gender` (Person artists), `life-span.ended/end` (disbanded!), release-group secondary types (live/comp/remix), release-group IDs (→ CAA covers)** |
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

### M0 · Foundations (protect the platform) — ~1 session
1. Production React builds; self-host runtime files.
2. Error boundary around each routed view.
3. Drop dead data keys + dead view files; split views2 opportunistically.
4. Smoke-test step in sync.yml; commit `enrich-discogs.js` ✅ (done with this doc).
5. Decide the generated-files strategy (Actions-built Pages artifact vs keep committing).
6. Explore/Map filter state → URL hash.
7. OG/social meta + favicon.

### M1 · Use what we already have (zero new API calls) — ~1–2 sessions
1. **Real album covers**: store release-group ids in `enrich-mb.js`, batch-fetch CAA covers →
   `album-art` cache → media-index `[6]`. Transforms Album pages + Explore instantly.
2. **Official URLs** on artist pages (Bandcamp/site/Wikipedia from discogs-artist.json).
3. **Band status**: store `life-span`/`gender` from responses enrich-origins already fetches →
   "disbanded 2011" badges, solo-artist gender glyphs, sets up M3's centrepiece.
4. **Loved tracks** (`user.getLovedTracks`) → ★ layer on tracklists/TrackView + "loved but
   never played lately" insight.
5. Discogs bios as fallback where last.fm bio is empty.

### M2 · Gigs & live module (the concert thread) — ~2–3 sessions
*Spine:* mark attended shows on **setlist.fm** (fastest structured entry; covers setlists too) +
a manual `gigs.json` for festivals/shows setlist.fm lacks
(`{artist|festival, date, venue, city, rating, favorite, note}`).
1. `enrich-gigs.js`: pull attended shows + setlists (setlist.fm), merge gigs.json.
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

### M5 · Platform polish — opportunistic
- PWA manifest + service-worker caching of data files (instant repeat visits, offline).
- Shareable story cards (SVG → PNG export of a stat card).
- Year-in-review "wrapped" mode (December auto-feature).
- Stories mini-TOC; per-story deep links (`#stories/adoption`).

---

## Parking lot (unranked)
Vinyl/format breakdown (Discogs release formats) · supergroup detection (MB rels) · festival
lineup auto-pull (setlist.fm/Wikipedia) · Discogs collection value tracker · listening-goal
widgets (streak defense) · "十年前 today" push-style digest page.
