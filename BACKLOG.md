> Part of the fuad.au docs — start at [/GUIDE.md](/GUIDE.md)

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
- **LRCLIB ≥2 fetch DONE (2026-07-11)** — full sweep of the unmatched ≥2-play catalog: 12,756
  attempted, 39% hit; lyrics store now 15,319 keys. **Usable new lyric-matched tracks: 6,201**
  (132 short/instrumental-ish auto-excluded). Wave queue by floor, descending value:
  **Wave A ≥5 plays: 2,387 · Wave B 3–4: 1,576 · Wave C =2: 2,238.** Each wave is a spend
  checkpoint (Fuad's go per floor); Sonnet standard + Haiku bulk split, phased 3–5 subagents.
  Sharding shipped first (R1) so llm-about can absorb the growth.
- **Continue original lyric-matched reads waves** — `.sptmp/gen-targets.js` → Sonnet(+Opus) waves,
  frontier ~4 plays.
- **Surface `instrumentals.json` to the site** — read-UI could show "instrumental" instead of blank.

### Taxonomy / Explore
- **"Other" family true grey rendering** — emitted with `grey:true` but the frontend color pipeline
  still hues it; fold into a color-pipeline pass (avoid double-editing color sites).
- **Jazz kw tuning** — funk/soul-rock leakage (RHCP, Bowie, Romes, Gramatik). Taste call w/ Fuad.

### Culture

**Open badge-taxonomy decisions (NOT yet applied — need Fuad's call)**

- **Split `gem` into two axes.** 💎 currently means "Hidden gem — floored me", which conflates
  two things. Plan: new `floored` badge = the in-the-moment knockout (emoji UNDECIDED — rejected
  ⭐/😮/🏆/💫; open candidates 🤩/😲/😵/🎆/👏). Relabel 💎 `gem` → "Hidden gem" (drop "floored
  me"); walk the ~36 current gems and sort each into hidden / floored / both / neither. Famous
  titles (Fight Club, Se7en, The Wire, Black Mirror, …) move off `gem` → `floored`; obscure
  discoveries stay `gem`. Done already: removed `gem` from Memento + Gone Girl (neither).
- **The "impact family" model** (agreed in principle, labels pending): ⭐ `floored` (up/awe,
  during) · 💔 `devastating` (grief, during) · 💥 `impact` (lingering, after). Relabel 💥
  `impact` from "Impactful" to a lingering word (e.g. "Stays with you" / "Lingers"). UNDECIDED.
  `bittersweet` 🥲 moved OUT of this family → tone badge (with funny/horrifying/satire).
- **Settled (for reference):** `cognitive` 🪞 fully curated (~19 seen + wishlist bench).
- Full badge re-audit; impact 63→50 demotions (see `culture/BADGE_IDEAS.md`).

**Translations (PL → EN Reader-note redrafts)**

- **Status: 260 redrafted, ~723 remaining.** Style: plain register, faithful wording, keep
  emoticons. Workflow: `python list_untranslated.py 50` → review PL/EN pairs → add to
  `notes_en_source.json` → `python build_notes_en.py` → bump `?v=`.
- Blurb batches 09–14 (~542 tail wishlist items; resume `.sptmp/wl-nonote.ndjson` row 801).

**Content / data passes**

- **OMDb coverage** — many film/TV still un-fetched (older bulk imports). Rerun
  `python update_omdb.py --limit N` over days; targeted `--force` re-check on false-misses.
- **Poster gap** — ~291 items still show the glyph fallback (niche early-cinema shorts +
  obscure bulk movies TMDB/OMDb don't index).
- **Wishlist badge pass** — wishlist items largely un-badged; a knowledge pass would surface
  them in the Explorer.
- **OMDb short plots** — `PlotShort` backfill for the Reader's crisp IMDb synopsis.
- **Books gaps** — some Polish titles lack summary / tags / cover.
- **Worldbuilding / visuals re-curation** — standouts-only passes still partly unconfirmed
  (see `culture/notes/funny_taxonomy.md`).

**Features (bigger)**

- **Insight expansions / narrative layer** — full proposal in `culture/docs/AUDIT_2026-07.md` §8
  (2026-07-07): Stories for Culture (watching eras, director-binge obsession curves, on-this-day)
  · the notes corpus as data ("your critical voice") · mood & impact diet (script_mood × ratings;
  badge impact-family timeline) · hub-level Rotation × Culture joins (soundtrack bridge, binge ×
  listening) · cross-medium thematic twins.
- **Cover-colour sort + palette features** — full proposal in `culture/notes/color_sort_ideas.md`
  (gradient stack, colour-wheel stat, ambient tint, colour filter). MVP = precompute overlay.
- **Outward Discovery tab** — Library / Wishlist / Discover, from TMDB recommendations minus
  dupes → review file. Deferred until enrichment settles.
- **Explorer / Taste polish** — faint total line on growth chart; "Signature tags" insight;
  chord/bubble viz (stretch from `culture/notes/taste_profile_plan.md`).
- **Last.fm music variation** — separate site variation (top albums by lifetime playtime).

**Housekeeping / future**

- **Script naming pass** — standardize `fetch_*` / `build_*` / `edit_*` / `audit_*`. Update
  `culture/docs/SCRIPTS.md`.
- **De-dup the TMDB resolver** — `update_cast.py` + `update_tmdb_overview.py` both resolve
  the same TMDB id per title; could share one resolver/cache.
- **Self-host React/Babel/d3** instead of CDN, for offline/longevity.
- **Wikidata structured awards** — richer per-award lists vs the current parsed-sentence chips.

---

## Pathways under consideration (2026-07-11)

- **JSDoc + `// @ts-check` adoption** — editor-level type checking without a build step. Apply
  opportunistically starting with `lib-slug`-adjacent and data-join code in rotation. Zero
  tooling overhead: drop a `@ts-check` comment + JSDoc annotations, and editors (VS Code) give
  inline type errors immediately.
- **Tauri desktop packaging** — Rust-shelled webview (~5 MB binaries vs Electron ~100 MB) as
  the deliverable format if the hub is ever packaged as a local app for other people's data.
  PWA comes first; Tauri is the follow-on if a packaged install is needed.
- **Essentia as the open-source audio-features base** — if Rotation is ever open-sourced,
  per-track audio features must come from Essentia (open-source audio analysis; needs actual
  audio files) instead of the current non-redistributable sources. Mark as the designated
  replacement for redistribution-safe builds.

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
