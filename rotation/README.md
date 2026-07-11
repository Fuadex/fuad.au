> Part of the fuad.au docs — start at [/GUIDE.md](/GUIDE.md)

# Rotation

**A personal listening observatory.** Twenty years and ~319,000 real last.fm scrobbles
(2006 → today), mined for the things the raw data doesn't say out loud: obsessions and
flameouts, taste geography, sound DNA, band mortality, what the songs are actually about,
and a record shop of 11,000 spines you can dig through.

**Live at [fuad.au](https://fuad.au/rotation/).**

> The design brief, enforced everywhere: **derived insight, not chart mirrors.** If last.fm
> already shows it, Rotation doesn't. Every surface answers a question the play-log alone
> can't — *when did my taste actually change? which bands ended while I was still listening?
> what do I play after this song? what are these lyrics about, in a language I don't speak?*

---

## The numbers

| | |
|---|---|
| Scrobbles | ~319,000 plays, 2006 → today, synced daily |
| Artist universe | ~6,000 explorable · top 400 with full pages |
| Albums | 33,700 known · 11,500 shelved · 17,700+ real covers |
| Lyrics analysed | 25,900 tracks matched · 37 languages · sentiment + 18-theme taxonomy |
| Song interpretations | 7,000+ tracks with AI reads (tiered: gist → deep → web-researched) |
| Concerts | ~130 attended shows with setlists, cross-joined to the play history |
| Enrichment layers | 20+ caches: MusicBrainz, Discogs, Wikidata, Ticketmaster, setlist.fm |
| Deployed payload | ~34 MB total, ~11.6 MB gzipped — lazy-loaded so first paint pays ~2 MB |
| Build | one Node script, ~11 s, zero npm dependencies |

## What's inside

**Overview** — the command centre. Live now-playing, streaks, weekly pulse, and a full
interactive world map of where the music comes from: country/city dots sized by plays,
coloured by genre or sonic gradient, a taste-flow streamgraph that doubles as a drill-down
filter, and a year scrubber that animates two decades of geography.

**Stories** — the long-read feed. ~30 generated chapters: *The ones that ended* (bands that
disbanded or died while you listened), *How deep it goes* (an underground index), *Sounds
happy, reads dark* (audio valence × lyric sentiment), *What it's all about* (theme drift over
20 years), obsessions, flameouts, comebacks, one-day wonders, first contacts, adoption lag,
a scrubbable year-in-review.

**Explore** — the database. One filter set — years, genre families → subgenres, mood
quadrant — over the whole ~6,000-artist universe, with a subgenre texture map, a mood lens,
ranked artists/albums/tracks, and by-sound sorting (energy, mood, tempo, obscurity…).
Every filter state serializes into the URL.

**Shelves** — the record shop. Every album with ≥3 plays as a spine on a wall; wear shows as
fading at 25/100/300 plays. Fan a spine open, drop the needle (30-second preview on a
spinning vinyl), re-shelve by genre, decade, mood, completeness, or when-you-found-them.
A separate *shrinkwrapped* wall holds 6,500 unplayed records by artists you already love.

**Calendar** — a GitHub-style heatmap of every day for 20 years, plus an hour-of-day rhythm
clock. Click any day, week, or month for a full period summary.

**Gigs** — attended shows joined to the listening history: setlist × your-top-tracks overlap,
"caught them before they ended", pre-fan catches, and an *on tour now* explorer with
cross-filtering genre cascade, event map, and calendar.

**Artist / album / track pages** — sound-DNA radars against your library's average, family
trees (members, formation, dissolution — MusicBrainz × Wikidata), "sounds like" by
listening-graph and by raw audio similarity, play-history sparklines, and on track pages a
**"what it's about" switcher**: tiered AI interpretations (quick gist → deeper reads →
web-researched for songs whose lyrics are findable nowhere else) alongside the human-written
Genius account where one exists.

## How it works

**Buildless authoring, precompiled deploy.** React 18 UMD is self-hosted; in development every
`.jsx` compiles in-browser via Babel standalone. CI precompiles `.jsx → .js` in the staged
`_site/` only, so production ships finished JS with no Babel download and no per-load compile.
No bundler, no router library, no framework churn — `git push` is the deploy, and every file
is view-source-debuggable in production.

```
last.fm API ──sync-csv.js──▶ fuadex.csv  (one row per scrobble — the single source of truth)
                                  │
     20+ enrichment caches ───────┤   (each optional; the build degrades gracefully)
                                  ▼
                           build-data.js  (~11 s, stdlib only)
                                  │
              ┌───────────────────┴───────────────────┐
              ▼                                       ▼
  music-core.js + music-rest.js             ~12 lazy data files
  (eager then deferred; window.ROTATION)    loaded on first need per view
```

- **Daily CI** (GitHub Actions): pull new scrobbles → rebuild → smoke-test gate → deploy to
  Pages. **Weekly CI**: incremental enrichment for artists new to the library.
- **Two-tier loading**: the Overview pays for ~2 MB gzipped; everything else — media index,
  per-track audio, geography detail, calendar drill-downs, interpretations — injects on
  demand. Each routed view is wrapped in an error boundary, so one page crashing never
  blanks the site.
- **Identity plumbing**: one slug function shared by build and runtime, MusicBrainz alias
  resolution (a click on "Midori" lands on ミドリ), canonical subgenre merging, and a genre →
  hue system that keeps every artist's colour consistent across every chart.
- **Graceful degradation as a design rule**: no cover → generative cover art from name+hue;
  no Spotify preview → iTunes fallback; no audio features → the card simply doesn't render;
  an enrichment cache missing → the build skips that layer.

## The data layers

| Layer | Source | What it adds |
|---|---|---|
| Scrobbles | last.fm export CSV | the spine — every play since 2006 |
| Genres & bios | last.fm API, Discogs | weighted tags → genre families, artist profiles |
| Identity & origins | MusicBrainz, Wikidata | aliases, members, gender, formation/dissolution, city coordinates |
| Audio DNA | per-track audio features (pluggable; [Essentia](https://essentia.upf.edu/) for redistribution-safe builds) | energy/valence/tempo/acousticness/… per track → artist Sound DNA radars and taste percentiles |
| Album art & metadata | Discogs, Cover Art Archive | release year/type/label, album covers, artist images |
| Lyrics analysis | personal lyrics corpus | language detection, NRC sentiment (multilingual), 18-anchor theme embeddings — **derived stats only, no lyric text is ever republished** |
| Interpretations | LLM pipeline + web research | tiered "what it's about" reads for 7,000+ songs |
| Live music | setlist.fm, Ticketmaster | attended-gig history with setlists; who's on tour now |
| Covers (fallback tiers) | Cover Art Archive, iTunes | fills where the primary source had none |

Large source datasets are processed locally and reduced to compact JSON caches; only the
caches ship.

## Philosophy

1. **Insight, not mirrors.** Derive something the source doesn't already show, or don't build it.
2. **One CSV of truth.** Every feature is a pure function of the scrobble log + optional caches.
3. **Weight discipline.** New data goes in lazy files; first paint is sacred.
4. **Personal software.** Built for one listener's real data, which is exactly why it can go
   deep — no averaging across users, no lowest-common-denominator features.
5. **Testing in production.** One author, static files, error boundaries, a smoke-test gate —
   push to main and look at it.

## Can I run this on my data?

Not yet — but that's the plan. The architecture is already template-shaped: CI builds
everything from a CSV + optional caches, secrets live in Actions, and every enrichment layer
degrades gracefully when absent. An open-source template (fork → add your last.fm username +
API key → Actions builds your own site) is on the roadmap; personal data (the CSV, caches,
gigs, interpretations) would stay out of the template, and each enrichment tier would be
opt-in, from "just a last.fm key" to "bring your own local datasets".

## Repo docs

- **ARCHITECTURE.md** — full technical inventory: runtime, data model, every shipped feature.
- **ROADMAP.md** — the build queue, evaluated API/data-source catalogue, module plan.
- **AUDIT-2026-07.md** — honest self-assessment: performance, resilience, content quality,
  copyright posture, and where this goes next.

---

*Data: [last.fm](https://www.last.fm/user/fuadex) · enriched via MusicBrainz, Wikidata,
Discogs, Cover Art Archive, setlist.fm, Ticketmaster, LRCLIB. Song "About" excerpts where
shown are attributed and linked to Genius. No lyric text is redistributed.*
