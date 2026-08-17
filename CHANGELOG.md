> Part of the fuad.au docs — start at [/GUIDE.md](/GUIDE.md)

# fuad.au — changelog

A running, public-facing write-up of what shipped, per version. Feature- and architecture-level
(the "what" and the "why"); the deep per-app engineering notes live in each app's own docs
(`rotation/ARCHITECTURE.md`, `culture/CLAUDE.md`, `canvas/PLAN.md`). Local build inputs and
third-party dataset provenance are deliberately kept out of the public record.

The hub is three self-contained apps sharing one launcher and one deploy pipeline:
**Rotation** (listening history), **Culture** (film / TV / games / books canon), and
**Canvas** (a personal gallery of art seen in museums).

---

## 2026-08-18

### Culture
- **The wishlist now knows where each wish came from.** Every entry is branded by origin —
  imported from the owner's own watchlists, hand-added, or recommended by Fable. The 54-item
  mind-bender cluster that predated the convention was settled by checking the original
  watchlist exports (under Polish and original-language titles): none were there, so all are
  recommendations. A ✦ mark now sits on recommended items' shelf tiles, and a Source filter
  (All / My list / ✦ Fable picks) joins the wishlist's bottom strip, composing with the
  existing search and year filters.

### Rotation
- **Vocalist coverage pushed deep into the tail.** Two more research waves — a thousand
  further artists, every batch independently verified before merge — grew the vocalist
  dataset from 1,299 to 2,102 artists, and cut artists with no data from 3,334 to 2,531;
  what remains is the sub-dozen-play tail. An owner-verdict lane now lets firsthand
  knowledge settle acts that research keeps nulling (six settled this wave, including a
  band three research passes couldn't crack). Classification policy hardened along the
  way: a soundtrack credit with a stable recurring vocal ensemble counts as a lineup,
  rotating game-music umbrella credits don't; cover-series scrobbles never inherit the
  covered artist's voice; synthetic-voice acts classify by their synth's register —
  including one human-screams-plus-synth duet.
- **Novelists made whole.** The band's plays were split across its two name eras, leaving
  the newer credit with no image and a bogus 0/100 popularity (its catalogue rows were
  near-empty fragments). A fold reunifies 367 plays under one artist, restoring image,
  listeners and popularity — and the vocalist entry was double-checked as correct for the
  current lineup while we were in there.

## 2026-08-17

### Rotation
- **Genre families cleaned up end to end.** Dream pop now reads as Pop, art rock and post-rock
  as Alternative, hardcore hip-hop as Hip-Hop; a canonicalization bug that mis-normalised
  hyphenated tags (and had quietly orphaned eleven family rules) is fixed, and same-name
  identity/curation slips (Bleach, HEALTH) were corrected.
- **Six new Explore sorts landed properly.** Most-mine (your plays against the world's
  listeners), newest-discovered, widest span, oldest vintage, loudest and most instrumental —
  with display fixes and multiselect listening-year chips; stacked vocalist badges align left.
- **Cover art filled in.** A catalogue sweep added 409 missing album covers.
- **Artist images reach almost everyone.** A catalogue image fallback now backs Spotify — first
  on the live feed, then corpus-wide (16,895 of 19,682 artists matched), then a same-name shard
  so near-miss spellings still resolve.
- **Gigs reactivated.** Attended-shows return with honest "back since" years, death crosses for
  members no longer living, festival days that list the songs you actually heard live from your
  rotation, and rolling background refresh of the origin/entity caches behind it all.
- **Vocalist-gender coverage widened.** A research pass over ~500 artists lifted verified
  vocalist data by 445 entries and cut artists with no data from 3,814 to 3,334.
- **Layout passes.** Sounds-like grid squared to 4×2 and aligned to the Albums width; decades
  strip promoted to its own card on the story row; header restored after the crumple experiment;
  liked page made legible on mobile (titles get the room); explore band reorders responsively;
  portrait facts refined.

### Culture / Canvas
- **Per-work medium.** Canvas works now carry their medium (painting, sculpture, print, drawing,
  photograph, and so on); a handful of unmapped types are kept honest as raw ids rather than
  guessed. A reader crash from a mis-placed style-tags hook is fixed.

## 2026-08-16

### Rotation
- **Fable album themes.** Each album with per-song flagship reads now surfaces its shared themes
  ("from the reads"), and album pages gained genre chips.
- **Fold and identity repairs.** Six Degrees of Inner Turbulence's suite is stitched back
  together with a movement-resolution bridge so its parts play as one; a most-mine noise audit
  added fold, exclude and moves ledgers plus composer intros (Taku Iwasaki, Michael Kamen,
  Nothing's Carved in Stone); NIN track folds and a verified Wargasm pin were fixed.
- **Album system tightened.** Evidence-based edition folds, and the album-kind classifier's
  root cause (a stale kinds map) fixed at the source.
- **Enrichment reached completeness.** The top-catalogue bios backfill finished (3,035 fetched,
  cache at 6,040 artists), and the weekly enrichment cron widened to keep tags, bios, stats and
  audio-DNA current; a duplicate concerts step was dropped in favour of the single weekly pull.
- **More flagship reads.** Further batches of most-played reads and footnotes shipped under the
  full pipeline, with themes/tells extended across the backlog; Koi No Yokan gained a full album
  read (liner plus coda) and a wall-to-wall pass.
- **Layout.** Sounds-like and facts refinements, mobile dossier overflow fixed, discovered-year
  anchor and span-months corrected, explore band degradation order fixed.

## 2026-08-15

### Rotation
- **Flagship reads corpus grew.** Several more batches of most-played track reads plus footnotes
  and variant-key mirrors shipped.

### Canvas
- **Close-readings expanded.** Backfill Interpretations with fused Info tiers shipped in batches
  (interp11 onward), the Web tier was retired, and hover-peek was reworked to unfold the Info
  under the label rather than over the image; a card-byline class collision and a Turner image
  leak were fixed.

## 2026-08-14

### Canvas
- **Full tour QC sweep** across the museum tours, 30 fresh Interpretations, and Info tiers
  re-distilled from the new close-readings.

## 2026-08-13

### Rotation
- **Album reads went standalone-solid.** The Fable syntheses (built from each album's
  per-song flagship reads) are now the FRONTAL portrait read on nine albums, with the earlier
  reads kept behind a flick ("via Opus · earlier read"); gists were redrafted to carry the
  record's sonic identity in concrete images plus an honest listening shape. New primaries for
  Gore, SAPPUKEI and still a Sigure virgin?; a footnote slot (✱) debuted under Around the Fur.
- **The reads corpus reached 731 (179 footnotes).** Three sweeps of the most-played unread tracks shipped
  under the full pipeline (independent drafts, overlap gate, account-first QC, web
  verification), with six verified footnotes — Wargasm's Pink Floyd/Van Halen title-lifts,
  Bambie Thug's 11/11 release ritual, Celldweller's fifty-demo shelving story among them.
- **Liked page, properly tuned.** Audio-DNA coverage jumped from 2,626 to 3,171 saved tracks
  (full feature vectors, with a name-matching second pass for recordings under different
  release ids); vocals filtering now covers liked-only artists via a dedicated sidecar plus a
  first verified classification wave (113 artists); chips finally lost the native grey button
  fill (the actual bug all along) and follow Explore's resting grammar; subtle row/search
  hover language; tighter header rhythm; back button removed.
- **Overview grew a catalogue row and a seen-live share.** Albums played (known-LP kind),
  EPs & singles, and distinct songs (post-fold) sit under the hours; 25% of all plays turn out
  to belong to artists stood in front of. Decade drill-downs now deep-link into Explore's
  release-year filter, and the drill-in return chip rides the header row.
- **Stories rail got scroll-aware.** The chapter rail rests centered and, on hover, slides to
  a scroll-weighted anchor so its expansion always opens away from where you are.
- **Scrobble hygiene.** 81 non-artist entities (news domains, trailers, dog videos,
  full-concert channel uploads) now drop at ingest; 30+ YouTube-caption live titles folded to
  their songs (including the mistitled BABYMETAL Tattoo → Kagerou family); search results
  order Artists → Albums → Songs; the nav never wraps under a long now-playing title.
- **Genre taxonomy v2 shipped.** 15 families with a weighted three-source vote replacing
  first-tag matching; new Heavy/Doom/Gothic and Score/Games & Film families; scene tags no
  longer masquerade as genres. A verified adjudication pass corrected 34 borderline artists.
- **Color follows family, everywhere.** Every classified artist's hue now derives from its
  family's anchor (with a small per-artist variation), so genre color is finally one system
  across artist pages, covers, charts, maps and tiles.
- **Filtering got honest.** Genre filters now use dominant-family membership (up to three for
  genuine hybrids) instead of any stray tag — thousands of artists no longer appear under
  families they merely brushed against.

## 2026-08-12

### Rotation
- **Track flagship reads** matured into a versioned corpus: 588 fable-tier reads with 161
  verified footnotes and 573 theme/tell annotations. A revision marker (v2.3 / v2.2) now
  records which reads were written under the newest QC methodology, so older ones can be
  selectively revisited later.
- **Vocalist dimension.** Artists carry ordered vocalist genders (a ♀♂ badge in lineup order,
  non-binary and instrumental included), with an Explore filter. Sourced conservatively:
  documented lineups and verified knowledge only — unknowns stay unknown rather than guessed.
- **Explore.** Theme filtering (must match ALL selected themes), a release-decade bar with
  per-year drill-in, and the active filters now drive the visual charts too; result count
  selectable 16/32/64; higher-resolution artist images.
- **Liked songs view.** Relationship buckets (fresh discovery → canon → drifted away),
  genre/tempo/energy filters, artist and album miniatures.
- **Artist status.** A curated "Reactivated" ledger (Linkin Park, Alice in Chains, Nevermore,
  Bleach) distinguishes bands that returned after a death or breakup from plain
  active/disbanded; wrong-entity guards fixed several same-name collisions (event listings,
  images, bios, tags — including the Japanese singer LiSA).
- **Identity hardening.** A wrongly inverted track fold (NIN's Home) fixed and a fold-audit
  tool added to rank suspect merges; "New This Month" no longer mistakes renamed or
  re-spelled artists for new ones.
- **Time page** period selection now mirrors timeline scrubbing; needle drops reach mini
  artist pages (~220 more artists); attended-shows data refreshed (153 gigs).

## 2026-07-18

### Cross-app
- **Full-project audit executed.** P1 sweep across all three apps; fixes shipped the same day.
- **PWA shell across all apps.** Every app now ships `manifest.webmanifest`, `sw.js`,
  `icon-192.png`, `icon-512.png`. Tiered service-worker caching; installable on desktop and
  mobile. No Tauri / Capacitor — deliberate: PWA + Pages keeps push-to-live instant.
- **Share / meta layer.** All three apps carry correct OG / Twitter cards and `fuad.au`
  canonical URLs. Culture gained a `favicon.svg` (was missing).
- **a11y pass.** Accessibility sweep applied across all apps.
- **CI hardening.** Two sync.yml smoke steps now carry distinct names. `stage-site.js` missing-
  file guard now fails always (was CI-only), so a local stage with gaps also aborts.

### Rotation
- **Boot no longer blocks on data.** `music-core.js` + `live-data.js` load with `defer`; the
  Spotify ♥/engagement overlays inject after first paint. First contentful paint dropped from
  ~25s to ~4s on a throttled-mobile simulation.
- **music-core artist split.** The heavy per-artist fields (bios, top tracks/albums, links)
  moved out of the eager `music-core.js` (3.5 → 2.1 MB) into the deferred `music-rest.js`,
  merged back in place before any consumer reads them.
- **`instrumentals.js` deployed.** Instrumental tracks get an honest "no words to read" slot.

### Culture
- **Lazy-loading.** ~12 MB of data overlays now load on demand; only ~830 KB eager on boot
  (was everything upfront). Shelves paint in ~0.5s. Runtime `?v=` epoch stays manual.
- **Stats filters completed.** Animation-director, production-company and composer histograms
  now filter the library like the rest.

### Canvas
- **Manual `?v=` retired** — cache-busting is stamped automatically at deploy.
- **Museum pages widened** (index rows full-window; content below the museum module full-width)
  and **"/" now summons search** like the other apps.

### Hub
- **Content-hash cache-busting auto-applied** by `stage-site.js` to every local unversioned
  script / CSS ref in the hub root `index.html` and each per-app `index.html` (including
  `hub.css`, which was previously unstamped and cached stale after changes).
- **SW cache epoch stamped** at stage time: `__BUILD__` in each `sw.js` is replaced with a
  digest of the full staged app directory.

---

## 2026-07-08

### Cross-app
- **Fable-leverage plan agreed.** Cross-app priority ranking for Fable-quality generative
  work (permanent, unique outputs): ⓪ discovery/recommendation (widest edge — Culture
  Discover, Canvas pilgrimage curation, Rotation dig-list, all unbuilt); ① Canvas artwork
  close-readings (Info + Interpretation per floored/loved work); ② Rotation hard-queue lyric
  interpretations (85 remaining in the divergence queue); ③ Culture film/show reads (zero
  currently, top ~20 films first). Mechanical work (deck-folding, data fetches, keyword
  search, stats) reserved for Sonnet subagents or scripts. Full plan in
  `notes/STATUS-2026-07.md` §3.

---

## 2026-07-10

### Canvas
- **Map zoom hardened.** Wheel is now bound non-passively (scrolling over the map zooms it instead
  of scrolling the whole page) and view changes are coalesced to one update per frame, fixing the
  occasional crash/VRAM spike on rapid zoom. The land path is memoised so it isn't rebuilt each frame.
- **Overlapping museums de-cluster.** Same-city museums that used to stack on one dot now fan out on
  a small spiral around their shared point, each tethered by a thin line so the group still reads as
  one place — and they spread further apart as you zoom in.

### Rotation
- **Explore charts get zoom + pan.** All four Explore scatters (texture/mood × subgenres/artists)
  zoom to the cursor and pan; artist-cloud dots keep a constant on-screen size so dense regions
  de-cluster as you zoom. Wheel is non-passive (no more page-scroll) and coalesced per frame.
- **Texture-by-artists fixed** to derive straight from audio features (organic↔electronic from
  acousticness, calm↔violent from energy), and both artist clouds now plot the full ~3,900-artist
  audio universe, rendered progressively.

## 2026-07-09

### Rotation
- **Explore lenses gain a subgenres ⇄ artists toggle.** Both the Texture (organic ↔ electronic)
  and Mood (valence × energy) charts can now plot either subgenres or individual artists. New
  views: artists on the texture map (placed at their primary subgenre, fanned out) and subgenres
  on the mood quadrant (bubbled at their members' mean valence × energy).
- **Faster Mood chart.** The mood lens now defaults to the lightweight subgenre view, and the
  ~1,000-dot artist cloud renders progressively (it fills in over a few frames instead of freezing
  the page on open).

### Canvas
- **Zoomable map.** The museum map now pans (drag) and zooms toward the cursor (wheel); pins,
  labels and strokes hold a constant on-screen size at any zoom, and a "reset view" appears once
  you've zoomed in.
- **Pilgrimage folded into the Map.** The separate Pilgrimage page is gone; the works you still
  want to see now pin to their holding city as ♥ markers — a shared venue fans its works out so
  they separate as you zoom in. Hovering a marker shows a preview (image, title, where to see it);
  clicking opens the work. The grouped "to see" list rides underneath the map, so nothing was lost.
  The Museums page stays separate for now.
- **Artists as portrait blobs.** The artists index is now a grid of circular artist photos
  (pulled from the web) with name, life dates and canon counts, a ★ badge for floored works, and
  a coloured monogram fallback where no photo exists — replacing the plain list.
- **Reader image capped at 80vh.** Tall/portrait artworks no longer overflow the screen; the
  image is constrained to 80% of viewport height so the story and details below stay in view.
  Panoramic and small works are unaffected.

### All apps
- **Cross-site footer nav.** Every app's footer now carries a quick switch —
  *part of fuad.au · Rotation · Canvas · Culture* — for one-click movement between the three.

---

*Earlier milestones (pre-changelog) are recorded in the per-app docs: Canvas Phases 0–5 in
`canvas/PLAN.md`; Rotation's module history in `rotation/ROADMAP.md`; Culture's taxonomy and
data pipeline in `culture/docs/`.*
