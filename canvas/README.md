> Part of the fuad.au docs — start at [/GUIDE.md](/GUIDE.md)

# Canvas

**A museum wall built from memory.** Every painting, sculpture, and print I've stood in
front of — reconstructed museum by museum, confidence-graded (sure / probably / unsure),
and presented the way a gallery should feel: the work large, unhurried, beautifully typeset;
the story of it one tap away. About 313 works across 52 museums, with a pilgrimage list of
what to see next and a map of where everything lives.

**Live at [fuad.au](https://fuad.au/canvas/).**

---

## What's inside

- **Collage wall** — favorites packed edge-to-edge, no chrome; the wall is the navigation.
  Click any work to open the Reader. Toggleable into alternate hangs: **Spectrum** (sorted
  by dominant palette hue), **Timeline** (grouped into century bands), and **Movements**
  (grouped by labelled art-movement sections).
- **Reader** — per-work detail: image large (deep-zoom where IIIF tiles are available),
  movement and materials from Wikidata, where it hangs now (best-effort, with a
  "verify before pilgrimage" note since loans and rotations drift), personal note,
  seen-at museum, and confidence level.
- **Artist pages** — charcoal editorial header, canon works I've seen vs major works I
  haven't (completion view), movement context, teacher/student lineage, "who's next"
  (similar artists not yet explored).
- **Museums** — the 52 visited institutions, each with its contribution to the canon,
  approximate visit dates, and a link to the recall deck.
- **Recall decks** — per-museum flash-card sessions: famous works from a collection
  presented one at a time, *did you see this?* The deck builds the canon faster than
  free recall by an order of magnitude. Verdicts are two axes: SEEN (didn't / not sure /
  saw it) × FEELING (like / love, optional), so "didn't see it + love" builds the
  Pilgrimage list while "saw it" answers build the canon.
- **Pilgrimage** — the wishlist turned trip planner: works to see, grouped by holding
  city, with estimated works-per-trip counts ("Vienna: 7 works across KHM, Belvedere,
  Albertina").
- **Map** — the painterly world map: each museum pinned sized by canon works, trip
  timeline underneath.
- **Memory confidence as data** — unsure works render honestly (faded or pencil-marked),
  not silently promoted to certainties.

---

## Architecture

**Buildless React + Babel-in-browser, precompiled for deploy.** Same pattern as the sibling
apps: `.jsx` compiles in the browser in development; CI precompiles `.jsx → .js` in the
staged `_site/` for production (no Babel download, no per-load compile). Declared
`"precompile": true` in `apps.json` from day one.

**Data model: hand-authored canon + generated overlays** (Culture's proven pattern).

```
museums.js     hand-authored  ─┐
artworks.js    hand-authored  ─┤──▶ runtime merge ──▶ walls / reader / map
pilgrimage.js  hand-authored  ─┘

art_images.js      generated overlay (Wikidata P18 + museum open-image APIs)
art_data.js        generated overlay (Wikidata: movement, materials, dimensions, location)
artist_data.js     generated overlay (Wikidata: life dates, movement, notable works)
museum_data.js     generated overlay (Wikidata + museum APIs: highlights, coordinates)
similar.js         generated overlay (movement/teacher/student graph co-occurrence)
```

Generated overlays are keyed by item `id`, machine-owned, and never hand-edited. Scripts
are cache-backed and resumable — quota and progress survive machine moves. `?v=` in
`index.html` must be bumped on every change (same golden rule as Culture).

---

## Data flow

```
Enrichment scripts (Python, local or CI)
  fetch_wikidata.py         ──▶  art_data.js, artist_data.js (Wikidata SPARQL — keyless)
  fetch_images.py           ──▶  art_images.js               (Wikidata/Commons — keyless)
  fetch_museum_highlights.py ──▶ museum_data.js              (museum APIs — mostly keyless)
  fold-deck.js              ──▶  artworks.js                 (merges recall-deck verdicts)
```

Public data sources used — all open-access:
**Wikidata SPARQL** (artwork metadata, artist graphs, movement taxonomy, image links),
**Wikimedia Commons** (public-domain high-res images for pre-1930 works),
**The Met** (CC0 API, highlights flag, open images),
**Art Institute of Chicago** (JSON API + IIIF deep-zoom tiles),
**Cleveland Museum of Art** (CC0 open access),
**Rijksmuseum** (collection API, toppieces flag — free key),
**Europeana** (aggregator for European institutions without their own API — free key).

The copyright boundary is a first-class design element: public-domain art (roughly pre-1930)
gets full-bleed images; in-copyright work (most of the 20th century onward) renders as a
text-forward card — title, story, movement, link out to the museum's own page. No copyrighted
images are hotlinked.

---

## Run your own

The architecture is fully data-agnostic. Swap in your own `museums.js` and `artworks.js`,
run `fetch_wikidata.py` to populate the overlays (no API key needed for Wikidata/Commons/Met),
and the site builds. Most of the enrichment stack runs keyless. A Rijksmuseum or Europeana key
unlocks additional image sources; Harvard Art Museums adds exhibition history. The recall-deck
workflow (`fold-deck.js`) is the fastest way to seed `artworks.js` for a museum you've visited.

---

## Repo docs

- **PLAN.md** — full architecture, data model, phase log, open questions, and the north star.
- **memory-seed.md** — the raw memory reconstruction log: recollections → resolved Wikidata
  entities, session by session.
