> Part of the fuad.au docs — start at [/GUIDE.md](/GUIDE.md)

# fuad.au — status snapshot (2026-08-26)

Cross-app status, refreshed at the 2026-08 grounding audit. Per-app detail lives in each
app's own docs (`rotation/ROADMAP.md` + `ARCHITECTURE.md`, `culture/docs/AUDIT_2026-07.md`,
`canvas/PLAN.md` + the canvas ledgers). Raw scale numbers: [STATS.md](STATS.md).
Earlier snapshot preserved in git history (`STATUS-2026-07.md`, 2026-07-18).

---

## Hub / infrastructure

- **All three apps are installable PWAs** with tiered service-worker caching, content-hash
  cache-busting (Rotation + Canvas automatic via `stage-site.js`; Culture manual `?v=` epoch,
  currently 139), and per-app SW cache epochs stamped at deploy.
- **One deploy pipeline** (`.github/workflows/sync.yml`): CSV sync → data build → smoke gates
  → manifest-driven staging (`apps.json` → `_site/`) → Pages deploy → CSV persist. Two more
  workflows: `enrich.yml` (weekly metadata refresh), `tour.yml` (weekly tour-date pull).
- **Edge image proxy live** (`img.fuad.au`, Cloudflare Worker) across all three apps —
  allow-listed hosts, proxy-first with direct-URL fallback by construction (see HUB.md).
- **App icons redrawn 2026-08-22** (SVG source → rasterised 192/512).

## Rotation

- Reads corpus at **15,019 track entries** (multi-tier: haiku/sonnet/opus/web + ~1.4k
  Fable-tier close reads with footnotes); album liners/arcs + artist portraits in
  `portraits.js` (155 entries). Campaign log: `rotation/ALBUM_READS.md`.
- Genre taxonomy v2 (15 families) live; vocals dimension at 2,205 verified artists;
  liked-songs layer, gigs ledger, tour explorer, sessions/eras/lifecycle story layer all
  shipped (ARCHITECTURE.md §8).
- Open: see ROADMAP.md §⓪ — long-tail tiers, Stories restructure, wrapped/share cards
  (parked), template extraction (Phase 5).

## Culture

- Library ~3,280 seen + ~1,530 wishlist; wishlist blurbs complete (1,340); EN note
  redrafts at 360; badge taxonomy + predicted-rating model + Tonight picker live.
- Lazy-overlay architecture (eager ~830 KB); manual `?v=` epoch discipline unchanged.
- Open: audit §6–8 roadmap (discovery tab, people dossiers, year-in-review, notes-corpus
  mining, hub-level joins) — largely unbuilt; taxonomy decisions in BADGE_IDEAS.md.

## Canvas

- Canon at **2,049 works across 80 venues**; reads on 807 works; **389 Study tours**
  (deep-zoom close readings); **1,228 hi-res plates** (IIIF-first sourcing, ledgered).
- Recall decks (incl. By Your Artists) are the live cataloguing instrument; Wall
  arrangements, Map, Portrait, Pilgrimage shipped.
- Open: image-QC waves (wave 2 findings pending application), IIIF plate campaign
  remainder, own-museum leader pages; PLAN.md carries the architecture, the ledgers
  carry live state.
