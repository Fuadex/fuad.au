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
  139 at the time of this snapshot — **171 as of 2026-09-21**), and per-app SW cache epochs
  stamped at deploy. **Rotation's PWA became genuinely offline-capable on 2026-09-21** (see the
  addendum at the foot of this file).
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

---

## Addendum — 2026-09-21 (the data-integrity + Stories wave)

The 2026-08-26 snapshot above stands; this is what changed since, in Rotation and Culture.
Full detail: `rotation/ROADMAP.md` §⓪ (2026-09-21), `rotation/ARCHITECTURE.md` §4/§5/§8,
`rotation/MOOD_PIPELINE.md` §7.

**Rotation — data integrity.** `pins.json` became the **durable correction ledger** (126
entries / 93 mbid pins) and every enricher that fetches or joins under an mbid now consults it
first, as do build-data's two mbid-as-identity sites — closing the re-poisoning vector. 87
poisoned MBIDs repaired, all **songs-verified** against the owner's own scrobbled titles (the
new hard rule: establish which real act an artist IS before any per-artist verdict); one
two-bands-in-one-row merge un-done. The enricher "answerless body is a failure" fix closed the
~10.7% blank-stub class in both MusicBrainz stores, lifting GEOGRAPHY 0.86 → 0.90 and ADOPTION
0.77 → 0.83. `mb-lineups.json` (1,061 bands / 4,919 members) became the primary lineup/gender
source: LINEUPS 223 → 670 bands judged, lineup cards 395 → 927 artists, current-vs-past truth
from the dump's own flag.

**Rotation — the lyric corpus closed.** Both local-model pipelines are now **tracked tools**
(`rotation/tools/`) rather than workshop scratch; a refetch stage reclaimed 806 of 984 textless
keys; mood reached 28,752 rows (99.07% of the lyric layer) and themes 28,375 (98.64%), with the
corpus distribution unmoved.

**Rotation — product.** Stories restructured into **nine chapters / 41 sections** with The
Reading closing the feed (authored, tracked content); the Overview stat strip now follows every
filter and gained a pace + milestone-ETA line; **PWA offline v1** shipped (epoch carry-forward,
route-shard warm-up, `persist()`), so coverage survives the daily cache-epoch rotation instead
of being orphaned by it.

**Culture.** Reader open now demand-loads both lazy sets (the wishlist crossover row was blank
from the Library); covers warm their row neighbours ahead of a scroll. Manual `?v=` epoch is at
**171** — note the stylesheet still trails at 165 and should be brought along on the next bump.

**Canvas.** Unchanged in this wave.
