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
