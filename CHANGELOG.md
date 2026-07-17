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
