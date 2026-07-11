> Part of the fuad.au docs — start at [/GUIDE.md](/GUIDE.md)

# Culture

**A personal canon, honestly rendered.** Films, TV series, animation, games, and books —
everything I've actually seen or played, filed not as a star-rating dump but as a browsable
library with real opinions: cover stacks for the works worth displaying, spine rows for the
rest, a Reader that opens the human note alongside the machine-enriched context. The wishlist
is there too, predicted and taste-ranked. About 3,300 seen entries and 1,340 still to get to.

**Live at [fuad.au](https://fuad.au/culture/).**

---

## What's inside

- **Cover stacks** — favorites and hand-picked posters rendered as grid tiles; click to open
  the Reader detail view.
- **Spine shelves** — everything else as flat single-tone spines in a draggable shelf row,
  fannable on hover.
- **Reader** — per-item detail: large poster, plot synopsis (TMDB), OMDb ratings, full cast
  and crew, personal note in Polish with an English re-draft toggle, and a badge strip for
  thematic tags (visuals, atmosphere, rewatchable, …).
- **Badge taxonomy** — a hand-curated system of ~30 thematic and craft tags compiled into
  each item's entry; frequency charts and co-occurrence audits built in.
- **Stats** — play counts by medium, region, decade, director frequency, and badge heat maps.
- **Wishlist** — the unseen canon sorted by a predicted-rating model (genre priors × rating
  curve × tag overlap with what I already love), each entry enriched with cast, runtime, and
  a TMDB poster.
- **Dialogue mood** — for matched films, a "dialogue reads" score derived from screenplay
  sentiment (NRC-scored; distinct from the film's emotional tone — it measures what characters
  *say*).
- **Region colour coding** — a two-letter region taxonomy colour-keyed across every view.
- **Explorer** — filter the library by medium, decade, region, and badge to find patterns in
  twenty years of watching.

---

## Architecture

**Buildless React + Babel-in-browser.** A single `culture-v2.jsx` compiles in the visitor's
browser via `@babel/standalone`; no bundler, no server. Production ships the same files with
a `?v=` cache-bust bump on every change.

**Data model: hand-authored canon + generated overlays.**

```
data.js         hand-authored  ─┐
imports.js      hand-authored  ─┤──▶ runtime merge (enrichExtras()) ──▶ seenItems
wishlist.js     hand-authored  ─┘                                       wishlistItems

cast_data.js       generated overlay (keyed by item id)
omdb_data.js       generated overlay
tmdb_data.js       generated overlay
books_data.js      generated overlay
badges.js          generated overlay (compiled from badges_source.json)
notes_en.js        generated overlay (compiled from notes_en_source.json)
script_mood.js     generated overlay (NRC sentiment from screenplay transcripts)
```

Three hand-edited files carry the canon directly: `data.js` (curated favourites with inline
notes and highlights), `imports.js` (bulk Filmweb viewing history), `wishlist.js`. Everything
else is a machine-owned overlay keyed by item `id`, merged at runtime in `enrichExtras()` and
never hand-edited — regenerate from the source script instead.

An item renders as a **cover** if `favorite === true` or it has a poster; otherwise it renders
as a **spine**. Moving an item between files or toggling `favorite` changes this.

---

## Data flow

```
Python workshop scripts (local)
  update_cast.py     ──▶  cast_data.js      (TMDB cast, crew, poster)
  update_omdb.py     ──▶  omdb_data.js      (OMDb plot, ratings, RT score)
  update_tmdb_*.py   ──▶  tmdb_data.js      (synopsis)
  update_books.py    ──▶  books_data.js     (OpenLibrary)
  update_igdb.py     ──▶  cast_data.js      (IGDB game cover + tags)
  build_badges.py    ──▶  badges.js         (compiled from badges_source.json)
  build_notes_en.py  ──▶  notes_en.js       (compiled from notes_en_source.json)
  build_script_mood.py ──▶ script_mood.js   (screenplay NRC sentiment, local-only input)
```

Public APIs used: **TMDB** (cast, crew, synopsis, posters), **OMDb** (ratings, plot), **OpenLibrary**
(books metadata), **IGDB** (game covers, tags). Keys live in `culture/.env` (gitignored); CI
injects them via GitHub Actions secrets. Generated overlays are committed; large source inputs
(Filmweb export CSVs, transcript archives) are local-only and gitignored.

---

## Run your own

The architecture is data-agnostic: swap in your own `data.js`, `imports.js`, and `wishlist.js`
with your library, add your API keys to `.env`, and the Python enrichment scripts rebuild every
overlay. Minimum viable build needs only TMDB and OMDb keys; the dialogue-mood layer requires a
local screenplay corpus and the NRC lexicon, both optional.

---

## Repo docs

- **CLAUDE.md** — architecture, data model, golden rules, and the overlay merge contract.
- **docs/DATA_PIPELINE.md** — overlay table, update runbook (run order per change type), mutator warnings.
- **docs/SCRIPTS.md** — every Python script: purpose, inputs, outputs, and status.
- **BADGE_CHARTER.md** — settled badge definitions, tests, and canonical exemplars.
