# Backlog & session checkpoint — 2026-07-10

Consolidated "what shipped recently + what's queued," written for a cold pickup after a context
compaction. Companion to `rotation/ROADMAP.md` (the big plan), `rotation/SPOTIFY.md`,
`rotation/ARCHITECTURE.md`. Rotation deploy = push `.jsx`/data to `main`; CI precompiles jsx and
runs `build-data.js` (needs `fuadex.csv`). Canvas/Culture golden rule: bump `?v=` in index.html.

---

## Recently shipped (this arc)

**Reads pipeline** — `rotation/llm-about.js` now ~9,864 entries (haiku ~7,763 / sonnet ~5,829 /
opus ~4,226 / web / fable). Keyed `artistSlug~trackSlug` using build-data's **hash-fallback slug**
(empty→`"a-"+_slugHash`). Waves shipped: Sonnet+Opus (500-track + 100-track), Haiku floor sweep,
LRCLIB ≥10-play (1,290 Sonnet), non-latin LRCLIB (331 Sonnet + 262 Haiku). Instrumentals marked
in `.sptmp/instrumentals.json` (skipped to save tokens). Orphan empty-sided keys pruned.

**Play data refreshed** from live `fuadex.csv` (~320k scrobbles). Rebuild workshop via
`.sptmp/refresh-ranks.py` → `gen-blurb-state.py` when the CSV changes (they don't auto-refresh).

**Taxonomy** — added Jazz, Classical/Score, Other (grey catch-all), Electronic synth gaps, trip-hop;
per-family subgenre cap 16→20 (238 bubbles).

**Explore perf/UX** — zoom via `--zk` CSS var + memoized marks + `non-scaling-stroke` (no React
reconcile on zoom); one-row filter bar (Active pinned right); filter-change fade transitions;
progressive (staggered) dimming on the **subgenre** charts only (artist charts reverted for perf).

**Bug fixes** — artist-page + MiniArtistView layout resilience; map/gigs/stories long-tail click
gates (route through `byId||expById`); mobile double-tap-zoom killed on charts+flow
(`touch-action: manipulation`); gigs pinch-zoom; gigs refreshed from setlist.fm (adds SOAD).

**Canvas** — Salon reskin replaced by 3 real Wall arrangements: Spectrum (palette hue), Timeline
(century bands), Movements (art-movement sections). `?v=8`.

**Spotify (personal export)** — recon done; PII-free aggregates + liked/engagement extracted;
**♥ liked + engagement bar** wired into all 3 track-row sites (mirrors 🎤). CJK keying bug fixed
(extraction must use hash-fallback slug — see SPOTIFY.md gotcha). Placeholder **#spotify page
built then HIDDEN** from nav (one-line uncomment in `rotation-app.jsx` NAV_FULL to restore).

---

## Open backlog (queued, with context)

### Spotify (data lives in gitignored zips in `rotation/`; IPs = PII, aggregates only)
- **Map location-blanking** — some `conn_country` periods are wrong (VPN/region: was elsewhere,
  data says X). Fix = a date-range→country/blank override table in the extraction. **Needs Fuad to
  list which periods are wrong.**
- **Engagement → Stories + artist/album contexts** — bar shipped in rows (`ROTATION_ENGAGE =
  [plays, skipPct]`). Next: fold ms_played/skip into artist/album summaries + Story cards. Best
  angles: "scrobbles lie" (top-by-hours ≠ top-by-scrobbles), "songs you keep skipping but won't
  unlike" (liked + high skip%). **Awaiting Fuad's verdict on the bar's look** (keep/thin/hover/number).
- **Spotify page further dev** (hidden): migration path lines, moving home-base centroid, an
  engagement page, liked-songs tail cleanup. `SpotifyView` + `#spotify` route + data still present.
- **Reconcile Spotify↔last.fm** — PINNED in `rotation/SPOTIFY.md`. 316k Spotify plays (2013–26) vs
  ~320k last.fm scrobbles. Open Qs: two lenses vs one timeline; track identity (URI vs name-slug);
  scrobble-vs-play thresholds; source-of-truth per era. **Do not start until Fuad decides.**

### Reads / lyrics
- **Extend LRCLIB below 10 plays (latin catalog)** — ~15,319 tracks ≥2 plays still unmatched
  (`.sptmp/targets-lrclib.json`). Same pipeline: `pick-lrclib`/`fetch-lrclib`/`build-batch-lrclib`/
  `merge-lrclib`. Non-latin already done.
- **Continue original lyric-matched reads waves** — `.sptmp/gen-targets.js` → Sonnet(+Opus) waves,
  frontier ~4 plays.
- **Surface `instrumentals.json` to the site** — read-UI could show "instrumental" instead of blank.

### Taxonomy / Explore
- **"Other" family true grey rendering** — emitted with `grey:true` but the frontend color pipeline
  still hues it; fold into a color-pipeline pass (avoid double-editing color sites).
- **Jazz kw tuning** — funk/soul-rock leakage (RHCP, Bowie, Romes, Gramatik). Taste call w/ Fuad.

### Culture (see `culture/` docs)
- Blurb batches 09–14 (~542 tail wishlist items; resume `.sptmp/wl-nonote.ndjson` row 801).
- Full badge re-audit; impact 63→50 demotions (BADGE_IDEAS).

---

## Key gotchas / invariants
- **Slug keying:** always use build-data's `slug()` with the empty→`"a-"+_slugHash(...)` fallback
  (build-data.js:56). A plain slug mis-keys ALL CJK content. Node keying scripts that replicate it:
  `.sptmp/key-spotify.js`, `.sptmp/nl-targets.js`. `R.slug` (frontend) already matches.
- **Rotation jsx has NO `?v=`** — CI precompiles. Committing `.jsx`/`build-data.js`/data files is enough.
- **New data files must be added to `apps.json` `deploy` list** or they won't ship.
- **PRIVATE, never commit:** `*.zip`/`*.gz`/`*.sqlite*`/`*.parquet`, `Spotify Extended Streaming
  History/`, `Spotify Account Data/`, dump provenance in tracked files. Inspect zips in-memory.
- Validate jsx: `node ../../.babelcheck/_chk.js <file>`. Workshop lives at GitHub root `../../.sptmp`.
