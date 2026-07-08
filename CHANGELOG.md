# fuad.au — changelog

A running, public-facing write-up of what shipped, per version. Feature- and architecture-level
(the "what" and the "why"); the deep per-app engineering notes live in each app's own docs
(`rotation/ARCHITECTURE.md`, `culture/CLAUDE.md`, `canvas/PLAN.md`). Local build inputs and
third-party dataset provenance are deliberately kept out of the public record.

The hub is three self-contained apps sharing one launcher and one deploy pipeline:
**Rotation** (listening history), **Culture** (film / TV / games / books canon), and
**Canvas** (a personal gallery of art seen in museums).

---

## 2026-07-09

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
