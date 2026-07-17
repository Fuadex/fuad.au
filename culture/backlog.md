Merged into root BACKLOG.md on 2026-07-11 (under the Culture section).

The original content is preserved in `culture/notes/backlog-absorbed-2026-07-11.md` (gitignored).
Active open items live in the root `BACKLOG.md` → Culture section.

## Items verified DONE as of 2026-07-18

- **DONE** Lazy loading: `index.html` now eagerly loads only data/imports/badges (~830 KB);
  heavy overlays injected on demand by `loadLazySet()` — first Reader open / Wishlist entry
  / 2.5s idle preload. `dataTick` re-runs enrichment when a set lands.
- **DONE** Stats filters: animation-director, production-company, and composer histograms
  now filter the library (pills + clear-all wired).
- **DONE** PWA: `manifest.webmanifest` + `sw.js` (tiered, epoch-stamped) + icons. App is
  installable. `index.html` has full meta (description, favicon, OG, Twitter).
- **DONE** A11y/mobile: shelf items + badge-explorer covers keyboard-reachable (role=button /
  tabIndex / Enter). Header controls at `<768px` are a horizontally-scrollable strip.
- **DONE** Stats backdrop fade and empty-note popup copy (visitor-neutral).
