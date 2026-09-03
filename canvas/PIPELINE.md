> Part of the fuad.au docs — start at [/GUIDE.md](/GUIDE.md)

# Canvas — data refresh runbook

How to enrich data after a museum visit, run and grade recall decks, fold verdicts into
the canon, and deploy. All enrichment scripts are **Node.js**, **keyless**, and
**cache-backed** — they skip already-fetched entities and are safe to re-run.

## Scripts at a glance

| Script | Purpose | Inputs | Output |
|---|---|---|---|
| `fetch-art.js` | Wikidata/Commons enricher: resolves artworks, artists, and museums by qid (verified, not trusted); pulls images (P18), coordinates, life dates, movements. | `museums.js`, `artworks.js`; Wikidata action API (no key) | `art_data.js` (`CANVAS_ART_DATA`) |
| `fetch-museum-data.js` | Museum pages enricher: façade + interior images (P18/P5775), founding year, architect, collection size, visitor count, official site. | `museums.js`; Wikidata (no key) | `museum_data.js` (`CANVAS_MUSEUM_DATA`) |
| `fetch-highlights.js` | Recall-deck source: for each museum (via its Wikidata qid from `art_data.js`), fetches the most famous collection works ranked by sitelink count. Up to 100 works per museum. | `museums.js`, `art_data.js`; Wikidata SPARQL (no key) | `museum_highlights.js` (`CANVAS_HIGHLIGHTS`) |
| `fold-deck.js` | Folds completed recall-deck JSON exports into `artworks.js` (the hand-authored canon). | `<deck.json>` files (output of the in-app deck export), `artworks.js` | patches `artworks.js` in place |
| `import-art.js` | Photo-detection importer, step 1: turns the (gitignored, local-only) `match_decisions.json` verdicts into a review proposal — resolves picks by qid, derives `seenAt`/`seenConfidence` (committed pick ⇒ `sure`), maps love→`floored` / like→`liked`, disambiguates versioned works by capture-time + venue. Never writes the canon. | `match_decisions.json`, `artworks.js`, `museums.js`; Wikidata (no key) | `../../.sptmp/import-proposal.json` |
| `apply-import.js` | Photo-detection importer, step 2: applies a reviewed proposal — stubs new museums (visit dates from photo EXIF), appends new artworks (`qidTrusted: true`), merges marks onto existing qids. Dry-run by default; `--write` to commit. Insert regex must absorb the trailing comma (`,?\n\];`) and target the FIRST `];` (artworks.js ends with a second `CANVAS_AFFINITY` array). ⚠ Dedupe by qid alone is not enough: Met-deck entries carry `met-XXXXXX` pseudo-qids that can never qid-match a real Wikidata entry — audit new imports by normalized title+artist too (three such dupes merged 2026-07-24; venue inference can also mis-assign a museum that sits near the real one, so cross-check odd venues against the Timeline). | `.sptmp/import-proposal.json`, `artworks.js`, `museums.js` | patches both in place |
| `fix-labels.js` | Post-import label polish: backfills `(untitled)` titles from the best non-English Wikidata label (fr/de/…), fixes unresolved creators. Anchored by qid; `--write` to commit. | `artworks.js`; Wikidata (no key) | patches `artworks.js` in place |
| `fetch-holders.js` | Where an UNSEEN work hangs (P195 → institution with coords), so the map/pilgrimage can place it. Carries a **DENY_HOLDERS** list with fall-through: P195 lists every collection a work ever passed through, and taking the first claim blindly once routed the Makart to the Führermuseum — a historic looting label, not an address (the pilgrimage grew a country called "German Reich"). Historic-country P17 claims are a sibling trap (Perm Art Museum arrived as `su` with a district for a city). | `artworks.js`, `art_data.js`; Wikidata (no key) | `art_holders.js` (`CANVAS_HOLDERS`) |
| `extract-palette.py` | Dominant colours per work (4 hex swatches, PIL mediancut on the 240px grid thumb) — feeds colour search, the tier + hue sort, and the salon's hue passages. Incremental via committed `palette_cache.json`; a work with no fetchable image simply never gets an entry (`palHueOf` treats that as hue-unknown). Run with a Python that has PIL (the `.sptmp/vlm-env` interpreter is the known-good). | `art_data.js` imgGrid + `artworks.js` img fallback; Commons/museum image hosts | `palette.js` (`CANVAS_PALETTE`) |
| `../../.sptmp/canvas-hires.py` → `emit-art-hires.py` | Hi-res pipeline, two local workshop steps: recon queries the keyless Met/AIC/CMA APIs for every canon work (cache per work under `.sptmp/canvas-hires/`), then the emitter ships only **holder-verified** matches (work qid's P195 must contain the matching museum — same-title-different-work rejection) into `art_hires.js`. The emitter preserves hand-authored `details` zoom tours AND whole `src:"commons"` entries (hand-added Commons upgrades, 2026-08-22). **Image quality rule from that sweep: pixels do not outrank identity or framing** — candidates were rejected for being framed gallery photos, saturation-boosted repros, or a *different physical copy* of the same title (the Bristol vs Glasgow Díaz). Eyeball every candidate before adoption; the Reader's `open-failed` fallback to the Wikidata-derived image is the safety net. | `artworks.js`; Met/AIC/CMA open APIs, `collections.json` (P195 per work) | `art_hires.js` (`CANVAS_HIRES`) |

### Map layer rules (hard-won, 2026-08-22)

- **Geography is verbatim.** Far-city bubbles (never-walked cities holding wanted works) render at
  their true coordinates with NO collision relaxation — no eviction, no mutual push, no spring, no
  clamp. Two rounds of "gentler" relaxation both shipped coastal cities into the sea (Helsinki,
  Bordeaux, then Genoa): at deep zoom even a 1.2-unit clamp is ~6px of displacement and the sea
  starts at 0. Overlapping 3-4px bubbles are cosmetically harmless and factually true; density is
  handled by z-order, the fisheye lens, and zoom. Do not reintroduce a relaxation.
- **Colour register splits by DISCOVERY, not seen-state.** Warm (sienna bubbles, loved-red /
  liked-amber dots) = ground already walked, including the chase dots orbiting a walked city.
  Green = undiscovered: far bubbles, their venue nodes, their halo dots, their opened branches.
  The first green pass painted every chase dot green and — since at rest ALL dots are chase dots —
  "everything went green" (owner report). The legend swatches are the literal fills.
- **Placement is name-match first, then a ~40 km proximity fold**: Wikidata P131 often names a
  district ("Quartier Saint-Merri" = the Pompidou's corner of Paris), and taking it literally
  ghosts a second bubble on top of the visited city. A small `CITY_ALIAS` map covers admin
  entities with no nearby fold target (Khamovniki District → Moscow).

## Study tours & reads (LLM content, not script-generated)

Three hand-QC'd content overlays sit beside the script pipeline, all keyed by canvas id:

- **`art_inspect.js`** (`CANVAS_INSPECT`) — full studies: four lenses + the anchored
  `deeper` detail tour that Study mode (`#/study/<id>`) flies through. Production and QC
  protocol: **[STUDY_SPEC.md](STUDY_SPEC.md)** (Opus subagent drafts from the actual
  image → fact-checked every claim and crop-verified every anchor box before merge).
  **539 works covered as of 2026-09-04.** Entries also carry `beside` — a companion
  paragraph setting the work against one other picture in the catalogue — plus `refs`,
  the link that makes the companion's name clickable. 183 tours have one; every
  methodology band from mv 2 onward is complete. Two things about `refs` that are not
  obvious and have both drawn blood: a bare `refs` array belongs to the `beside`
  paragraph by default, and `linkRefs` **silently drops** a ref whose `text` is absent
  from that paragraph or occurs in it more than once. Prove the anchor before merging.
  Each entry records the methodology version it was made under as `mv` — integers for a
  change to the cascade's shape, decimals for a refinement within it.
- **`art-about.js`** (`CANVAS_ART_ABOUT`) — shorter two-tier reads (about/deep) for
  flagship works. Production and QC protocol: **[READS_SPEC.md](READS_SPEC.md)** — one
  Opus subagent per painting, **Interpretation written first and Info distilled from it
  with a web-verified hook** (not the reverse). A study entry must go deeper than, and
  never contradict, an existing about read.
- **`museum_about.js`** (`CANVAS_MUSEUM_ABOUT`) — institution reads (about = what the
  place is, deep = how it works as a visit), **53 museums**. Same truth rule as studies:
  personal "you met X here" claims only for canon-`sure` works; `probably`/`unsure`
  works get the institutional phrasing ("home of X"). First 32 independently fact-checked
  2026-07-24; +21 on 2026-08-22, which covered every museum where at least one work has
  been met. The 28 remaining have no met works — a "how it works as a visit" tier for a
  place you have not been is a different proposition and was deliberately deferred.
  Two failure modes worth knowing before the next batch:
  · **Dossier vocabulary leaks into the prose.** Three drafts shipped the phrase "the two
    sure works", i.e. the data model showing through the page. The apply script now hard-
    fails on that pattern rather than trusting a reader to catch it.
  · **A visit tier goes stale.** The Neue Pinakothek has been closed since 2019 with no
    reopening before 2029 and its collection dispersed; a read describing a walk through
    it would have been actively wrong. Check current status before writing `deep`.

These are content, not generated artifacts — edit them directly (with QC), never
regenerate them from a script.

### Local cache note

`wikidata_cache.json` (large, gitignored) is a local-only rebuildable API cache. A fresh
clone rebuilds it on the first `fetch-art.js` run. All enriched output files (`art_data.js`,
`museum_data.js`, `museum_highlights.js`) are committed — nothing needed from the cache to
serve the site.

### Environment variables

None. The whole pipeline runs keyless — Wikidata, Wikimedia Commons, and Wikidata SPARQL
are all open endpoints.

---

## Runbook — I visited a museum (or remembered more works)

1. Edit `museums.js` if the museum is new (add an entry with `id`, `name`, `city`,
   `country`, `qid`, `visits`). QIDs can be looked up at wikidata.org.

   **A venue is an institution you can go to, not an event you went to.** A temporary show is
   recorded on the WORK — `via: "exhibition"` plus an `exhibition` name — with `seenAt` pointing
   at whatever building hosted it. Giving a one-off show its own `museums.js` row puts a place on
   the Museums index that nobody can visit; that is what happened to a Beksiński show in
   Warsaw-Praga, removed 2026-08-22. If the host building is not itself worth an entry, the
   encounter lives in the work's `note` and `seenAt` simply omits it.

   **Placeholder rows are debt with a deadline.** Entries named `"… (venue TBC)"` with a
   `confirm` note are guesses awaiting Fuad. They render on the Museums page looking exactly like
   confirmed venues, so resolve them when he answers rather than leaving the question in the data
   — and when removing one, re-check that no `seenAt` (which may be an ARRAY) is left dangling.

2. Edit `artworks.js` directly for any works you are certain about (free-recall
   additions). Fields: `id`, `title`, `artist`, `artistId`, `qid`, `year`,
   `seenAt`, `seenConfidence` (`sure` / `probably` / `unsure`), optionally `floored`,
   `liked`, `note`.

3. **Run the recall deck** in the app (`#/deck/<museumId>`) to jog recognition memory.
   Grade each card: 1–3 = seen answer, 4 = ♡ liked, 5 = ♥ floored. The deck is built
   from `museum_highlights.js`; if it is empty for this museum, run step 4 first.

4. **Fetch highlights** for the new museum (if not yet in `museum_highlights.js`):
   ```
   node fetch-highlights.js <museumId>
   ```
   Then return to step 3 and grade the deck in the app.

5. **Export + fold the deck verdicts** into `artworks.js`:
   - In the app, after finishing the deck, use the "copy picks as JSON" button to copy
     the verdicts to the clipboard. Save that JSON as `<museumId>-deck.json`.
   - Run:
     ```
     node fold-deck.js <museumId>-deck.json
     ```
   - Review `git diff artworks.js`. Confirm new entries look right (confidence, floored,
     pilgrimage `wish: true` for "didn't see + love" verdicts).

6. **Re-run the Wikidata enricher** to resolve any new artworks/artists from step 2
   or the fold:
   ```
   node fetch-art.js
   ```
   This is incremental — only new qids are fetched.

7. **(Optional) Refresh museum data** (façade/interior images, visitor count, etc.):
   ```
   node fetch-museum-data.js <museumId>
   ```

8. **Deploy** — push to `main`. CI stages and auto-stamps cache hashes; no manual
   version bump needed.

---

## Runbook — after ANY works enter the canon (the derived-store chain)

Every path that adds works — free recall, deck folds, photo import, or a catalogue/IIIF
ingest wave — MUST finish with this chain, in order. Instituted 2026-08-28 after the NGA/
Getty/Yale ingest arc stopped at "append + gate + commit" and left 818 works palette-less
and 24 holder-less for a day; every store below silently degrades rather than erroring, so
nothing complains until someone notices colour search can't see a third of the wall.

1. `node fetch-art.js` — enrich new qids (images, years, collections). Incremental.
2. `node fetch-holders.js` — re-derive where unseen works hang. Reads step 1's
   `collectionQids`, so order matters. Pseudo-qid works (`met-*`, `nga-*`) are stamped by
   prefix rule inside the script — the holder is in the id, they never enter the P195 flow.
   A work left holder-less after this is usually HONEST: P195 snaktype "somevalue" means a
   private collection, and placeholder rows have no qid at all. Don't chase those.
3. `..\..\.sptmp\vlm-env\Scripts\python.exe extract-palette.py` — palettes for the new
   works (incremental via the committed cache). Without this the whole ingest wave is
   invisible to colour search and hue-aware sorts.
4. **New artists?** They need registry entries + images (the artist enrichment pass) or
   they render as bare names.
4b. **New museum row?** (visited OR unvisited holder) — `node fetch-museum-data.js <id>` +
   `node fetch-highlights.js <id>`, or the page is a name with nothing behind it: no facade,
   no facts, no "still in the building". The 7 holder museums shipped registry-only on
   2026-08-27 and sat empty for a day. Held works render via the holders join (the
   "Held here" section) — that part needs no per-museum step, just step 2.
5. Commit the regenerated stores (`art_data.js`, `art_holders.js`, `palette.js` +
   `palette_cache.json`, `wikidata_cache.json`) alongside or right after the canon change.

## Runbook — grade a deck and fold verdicts

This is the short path when the museum is already in the system and the deck has been
graded before.

1. Open `#/deck/<museumId>` in the app. Grade all unseen cards.
2. Copy the deck export JSON (app button). Save as `<museumId>-deck.json`.
3. Run:
   ```
   node fold-deck.js <museumId>-deck.json
   ```
   Multi-venue works (prints, casts, loans seen at multiple museums) are merged, not
   duplicated — `fold-deck.js` appends the new venue and upgrades confidence.
4. Review `git diff artworks.js`. Push to main.

---

## Deploy

Push to `main`. No extra steps.

`stage-site.js` runs in CI and handles everything: precompiles `.jsx → .js` (drops the
Babel download from production), content-hash stamps every local script/CSS reference in
`index.html`, and injects the service-worker epoch from a digest of all deployed files.
Canvas refs ship **unversioned** in source; the hash stamp is added at deploy time —
no manual `?v=` is ever needed.

> Note: Culture works differently. Its lazy-loader reuses the page's shared `?v=` epoch
> when injecting overlay URLs at runtime, so Culture's epoch must stay manual. Do not
> apply Canvas's auto-hash model to Culture.
