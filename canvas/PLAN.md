# Canvas — architecture & plan (draft, 2026-07-07)

> The third app of the hub: a **personal gallery** of the art Fuad loves and has stood in
> front of — organized by the museums he's been to, presentation-first, with a learning
> layer (the story of each work, similar artists, where things hang now). The design
> exploration already exists in this folder: `Canvas.dc.html` (three directions: Salon
> wall-hang / dark Observatory / charcoal Artist page) and `Canvas App.dc.html` (turn 2:
> **collage home as the default, Salon as a toggle, warm painterly map**). This doc is the
> data/architecture plan underneath that design.

## 0. North star

A museum wall of your own memory. Two jobs, in priority order:
1. **Presentation** — the artworks themselves, large, unhurried, beautifully typeset;
   a place that feels like a gallery, not a database.
2. **Learning** — every work opens into context: the artist, the movement, what else
   they made, where it hangs today, what to see next and where.

Not jobs: social features, completionism for its own sake, cataloguing every work in
every visited museum (the canon is *what moved you*, not an inventory).

## 1. The core problem — and the workflow that solves it

**Nothing was ever written down.** The record of what Fuad has seen exists only as memory.
That kills any import-based bootstrap (there is no Filmweb/last.fm equivalent) — but memory
science offers the fix: **recognition beats recall by an order of magnitude**. You can't
list what you saw at the Prado; you *can* instantly say "yes, I stood in front of that."

So the seeding workflow is a **recall deck**, built per museum:

1. **List the museums** (Phase 0, a conversation): people remember buildings and trips far
   better than individual works. "Vienna 2018: KHM, Belvedere, Albertina" is recoverable;
   the full contents aren't. Output: `museums.js` with rough visit dates.
2. **For each museum, fetch its highlights** — the permanent-collection masterpieces,
   ranked by fame (Wikidata sitelink count works as a fame proxy; museum APIs have their
   own "highlights" flags). Present as a deck: *did you see this?* → *no / yes / yes-and-
   it-floored-me*. Fifteen minutes per museum reconstructs years.
3. **Seed from artists too** (the reverse direction): "you love Klimt — here is every major
   Klimt and where it hangs; which have you stood in front of?" Catches works whose museum
   you've forgotten.
4. **Embrace fuzzy memory as data.** `seenConfidence: sure | probably | unsure` is a
   first-class field, rendered honestly in the UI (an unsure work hangs slightly faded, or
   carries a pencil-mark chip). Memory is the dataset; pretending it's exact would be false.

Caveat to design around: museums rotate and loan works — the fact that a painting is *in*
a museum's collection doesn't prove it was *on the wall* the year of the visit. The deck
asks "did you see it", never asserts "you saw it". (Display-location volatility also
affects the "where it hangs now" feature — see §4.)

## 2. Data model (culture's overlay-by-id pattern — proven, keep it)

Hand-authored (the canon, edited directly):

| File | Contents |
|---|---|
| `museums.js` | `{ id, name, city, country, lat, lng, qid, visits: ["2018-05", "~2022"], note }` — visited museums; approximate dates are fine and marked as such |
| `artworks.js` | `{ id, title, artist, artistId, qid, year, medium, seenAt: museumId\|null, seenConfidence, favorite, floored, note, poster? }` — the canon: works seen + works loved |
| `pilgrimage.js` | the wishlist: works to see, each resolving to a holding museum → feeds the trip planner |

Generated overlays (machine-owned, keyed by `id`, regenerated never hand-edited —
exactly culture's contract):

| Overlay | Source | Carries |
|---|---|---|
| `art_images.js` | Wikidata P18 → Commons / museum APIs / IIIF | image URLs at grid + reader + zoom sizes |
| `art_data.js` | Wikidata SPARQL | movement, genre, materials, dimensions, current location (P276) + collection (P195), inception |
| `artist_data.js` | Wikidata | life dates, movement, notable works list, where their works hang (museum → count) |
| `similar.js` | Wikidata movement/teacher/student graph + shared-collection co-occurrence | "if this, then…" per artist and per work |
| `museum_data.js` | Wikidata + museum APIs | collection highlights (the recall-deck source), coordinates, official links |

Same golden rules as culture: bump `?v=` on any change; generated files are never
hand-edited; scripts are resumable with committed caches (`wikidata_cache.json` etc.)
so quota/progress survives machine moves.

## 3. Data sources — what's actually open (checked July 2026)

The good news: art is the **best-served open-data domain of the three apps** — far better
than music or film — because the core corpus is old enough to be public domain and the
museum world went open-access hard in 2017–2020.

| Source | Key? | What it gives Canvas |
|---|---|---|
| **Wikidata SPARQL** | none | THE backbone. Artworks with artist/collection/location/movement/image; museums with coordinates; artist relation graphs (teacher/student/movement). One query = "every notable work in the Uffizi with images, by fame". |
| **Wikimedia Commons** | none | High-res public-domain images for essentially every pre-1930 masterpiece. Direct URL patterns, no quota worth worrying about. |
| **The Met** | none | CC0 API, 470k+ objects, `isHighlight` flag (recall decks!), open images. |
| **Art Institute of Chicago** | none | Clean JSON API + **IIIF images** (deep zoom). |
| **Cleveland Museum of Art** | none | CC0 open access, similar shape. |
| **Rijksmuseum** | free key | Superb images + collection API (`toppieces` flag). |
| **Harvard Art Museums** | free key | Rich metadata incl. exhibition history. |
| **Europeana** | free key | Aggregator across European institutions — the fallback for museums with no API of their own (incl. Polish institutions via FBC). |
| **National Gallery DC** | none | Full open-data dump on GitHub (images + data). |
| **Louvre** | none (unofficial) | `collections.louvre.fr` serves stable per-work JSON; treat as scrape-lite with a cache. |
| **MoMA / Tate** | none | GitHub metadata dumps — **no images** (copyright), metadata only. |
| **IIIF + OpenSeadragon** | n/a | The presentation superpower: any IIIF-serving museum (AIC, Bodleian, many EU) gives free **deep-zoom** — stand-inches-from-the-brushwork mode. |
| WikiArt | unofficial | Grey area; skip — Wikidata+Commons covers the same ground legitimately. |

**The copyright wall, stated honestly:** public-domain art (roughly pre-1930 — old masters
through Impressionism/early modernism) gets glorious full-bleed images. In-copyright art
(Picasso, Dalí, Rothko, Bacon, most of the 20th century, Beksiński) gets **metadata-only**
from open sources: those works render as **text-forward cards** (title, story, where it
hangs, link out to the museum's own page) — a deliberate design element, not a bug; the
mockups' editorial/charcoal direction suits them. Never hotlink copyrighted images.

**Polish collections:** Wikidata coverage of MNW/MNK (Muzeum Narodowe) is decent
(Malczewski, Matejko, Wyspiański, Chełmoński are all well-represented with Commons
images); Europeana/FBC fills gaps. This matters because the personal canon will not be
Louvre-only.

## 4. Views (mapping the .dc mockup directions onto the data)

- **Collage** *(default home, per mockup 2a)* — favorites packed edge-to-edge, no chrome;
  the wall IS the navigation. Click → Reader.
- **Salon** *(toggle, mockup 1a)* — the wall-hang mode: warm plaster, frames, museum-label
  typography. Same data, more painterly hang.
- **Map / Observatory** *(mockup 2b + 1b)* — the painterly map: each museum a pin sized by
  works seen there, each work pinned to *where it found you*; trip timeline underneath.
  (Rotation's worldmap idiom, re-skinned warm.)
- **Artist pages** *(mockup 1c, charcoal editorial)* — the works you've seen vs their major
  works you haven't (completion, like culture's people dossiers), movement context,
  teacher/student lineage, "who's next" (similar artists you haven't explored).
- **Reader** (per artwork — culture's Reader idiom): the image large (deep-zoom where
  IIIF exists), the story of the work, technique/materials, movement, **where it hangs
  now** (best-effort: P276 with a "location drifts — verify before pilgrimage" note),
  personal note + seen-at + confidence.
- **Pilgrimage** — the wishlist inverted into a trip planner: "a trip to Vienna gets you
  7 works: KHM holds 4, Belvedere 2, Albertina 1." Grouped by city, the single most
  actionable view in the app.
- **Insights** (later, the Rotation muscle): movements over time · your century
  distribution · the palette of your taste (dominant colours across favorites — culture's
  color_sort_ideas machinery applies directly to paintings, where it's even more at home) ·
  geography of where your taste lives vs where you've been.
- **Fable reads** (later): the Rotation llm-about convention ports beautifully — a
  dual-tier "what you're looking at" (Info) / "how the painting works — composition, light,
  what to stand close to" (Interpretation) per artwork. Same Info/Interpretation toggle UI.

## 5. Architecture (hub contract)

- New top-level **`canvas/`** app per HUB.md: self-contained, own `index.html`, relative
  paths, own nested `.gitignore` for caches. Added to `apps.json` (deploy list + launcher
  card) when it first ships — no workflow edits needed.
- **Buildless React** like the siblings, with rotation's **CI precompile** pattern from day
  one (`"precompile": true` in apps.json — the stage-site machinery is already generic).
- Enrichment scripts in Python (culture's pattern): `fetch_wikidata.py`,
  `fetch_images.py`, `fetch_museum_highlights.py`, each cache-backed and resumable;
  a `build_all.py` orchestrator with auto `?v=` bump from the start (learn from culture's
  footgun). Wikidata/Commons/Met/AIC need **no keys** → most enrichment runs on ANY machine.
- Reuse, not rewrite: culture's Reader + overlay merge idiom · rotation's worldmap +
  StreamGraph (movements-over-time) · the generative-cover fallback for imageless works.
- OpenSeadragon vendored (self-host, per the Phase-0 lesson — no CDN SPOF).

## 6. Phases

| Phase | What | Needs |
|---|---|---|
| **0 · Memory seed** ✅ 2026-07-07 | DONE (sessions 1–2, ongoing): 23 museums, 14 works, memory-seed.md log. More trips to mine. | nothing |
| **1 · The wall** ✅ 2026-07-07 | SHIPPED (commit 278c223, live at fuad.au/canvas/): Collage+Salon wall, Reader, Museums view, fetch-art.js (name-resolving, cache-committed), hub pane + precompile. | no keys |
| **2 · Recall decks** | `fetch_museum_highlights.py` → per-museum decks → grow the canon museum by museum. The app becomes the tool that builds its own data. | no keys |
| **3 · Learning layer** | Artist pages, similar artists, movement context, where-it-hangs. | no keys |
| **4 · Map + Pilgrimage** | The painterly map, trips, wishlist → trip planner. | no keys |
| **5 · Deep polish** | IIIF deep zoom, palette insights, movements-over-time, Fable artwork reads, Salon mode refinements. | free keys (Rijks/Harvard/Europeana) at most |

Phase 2 is the special one: unlike rotation/culture, **the app itself is the data-entry
instrument** — the recall deck turns browsing into cataloguing. Every phase through 4 runs
without a single API key.

**Deck v2 (2026-07-07, Fuad: "one of the core functionalities… an amazing tool to discover
new art"):** verdicts are TWO independent axes — SEEN (didn't see / not sure / saw it; the
tap that advances) × FEELING (♡ like / ♥ love, optional toggle). Floored = saw it + ♥.
The key insight: **"didn't see it + ♥" is the discovery answer — it builds the Pilgrimage
list** while the seen answers build the canon. A 0–100 slider was considered and rejected:
it kills dealing rhythm and produces pseudo-precision; two axes × three levels captures
everything actionable. Old string verdicts migrate on load.

## 7. Risks & mitigations

- **Memory is incomplete** → recognition decks + confidence field + the canon framing
  ("what moved you", not "everything you saw"). Missing works surface later organically —
  the deck can be re-dealt per museum any time.
- **Copyright for 20th-c+ works** → text-forward cards + link-outs, designed as a
  first-class card type from Phase 1 (not retrofitted).
- **"Where it hangs" drifts** (loans, rotation, storage) → always render as best-effort
  with a fetch date; Pilgrimage links to the museum's own collection page for verification.
- **Fame-ranking bias** (recall decks show the famous; you may have loved something
  obscure) → decks are seeded by fame but the artist-direction path (§1.3) and free-text
  add cover the tail.
- **Scope creep toward inventory** → the north star line: presentation of what you love.
  The deck's "no" answers are never stored as data; only yeses enter the canon.

> 2026-07-07 (later): **Phase 3 artist pages + Artists index SHIPPED** (charcoal header, canon works, majors-you-have-not-met via fame-ranked notable-works fetch, movement labels; Reader artist name links through). **Phase 4b Pilgrimage + wall filters/cap/sorts SHIPPED** the same day (chips x museum x 4 sorts, cap 48 + hang-more; pilgrimage.js hand file seeded with Sanok). Remaining: similar-artists graph, painterly Map + trip timeline (4a), Phase 5 polish (IIIF zoom, palette, Fable reads, Paris Musees depth).

> 2026-07-07 (later still): **Phase 4a painterly Map SHIPPED** (#/map — equirect land from rotation geometry, museum pins sized by canon contribution, trip strip by year from Timeline-matched dates). **Matte fix**: unsure-card dimming moved off the artwork onto the label. **?v= cache-bust convention adopted** (culture golden rule; stage-site carries the query through jsx→js rewrite) — bump on every change.

> 2026-07-07: **Multi-venue works** (prints, casts, loans seen at several museums) — fold-deck.js now MERGES a duplicate qid instead of dropping it: appends the new museum to seenAt (array), upgrades confidence (unsure→sure on a firm sighting) and floored, marks multiVenue:true, prints a merge report. Reader shows "Where I saw it — an impression at each". Fixed retroactively: The Great Wave (NGV+Met) and Melencolia I (NGV+NGA-DC+Met). seenAt-as-array was already handled everywhere (wall/museums/map/pilgrimage).
