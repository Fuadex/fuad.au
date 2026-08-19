> Part of the fuad.au docs — start at [/GUIDE.md](/GUIDE.md)

# Canvas — the noise log

A record of what the data actually looked like underneath the tidy numbers, written during the
2026-08-19 import (645 → 1,894 works). It is kept because the failures are more instructive than
the successes: every rule in the pipeline exists because something specific went wrong, and
without the story the rules look arbitrary and get "simplified" away by the next person.

The theme throughout: **an identifier that nothing consumes is an identifier that silently rots**,
and **a match that passes an automated check can still be the wrong object.**

---

## 1. Twelve museum qids pointed at unrelated things

The import matches venues by Wikidata qid. That immediately failed, and the reason was that
`museums.js` qids had never been used for anything:

| museum | its stored qid actually was |
|---|---|
| `pergamon` | **Museo del Prado** |
| `tokyo-met` | **Erwin Glod**, a German footballer (1936–2003) |
| `pompidou` | **persona non grata** (the diplomatic concept) |
| `altes-museum` | **the Fall of Constantinople** |
| `royal-castle-warsaw` | a **main-belt asteroid** |
| `npg-canberra` | the **National Museum** of Australia, a different institution |
| `hokusai-museum` | the Obuse museum, while the record describes the **Sumida** one |
| `sukiennice`, `orangerie`, `marmottan`, `rodin`, `artizon` | disambiguation pages, a Greek potter, a hunger-strike art project |

They survived because `fetch-museum-data.js` resolved museums **by name search** and never read
`m.qid`. Nothing consumed the field, so nothing revealed it was garbage. The enriched output was
correct all along, which is what made it invisible.

Two lessons went into the code. `museums.js` qids are now authoritative — the fetcher prefers a
stored qid and only falls back to search. And name search is not a safe fallback in either
direction: it matched the **generic concept "science museum"** instead of the London institution,
and matched **nothing at all** for `Zamek Królewski w Warszawie (Royal Castle)`.

A single artwork qid was wrong too — `monet-woman-with-a-parasol` pointed at a **Wikimedia list
article**. An audit of all 638 canon artwork qids found that one and no others, so it was a stray
rather than a pattern. Worth checking before assuming.

## 2. Venue inference put artworks inside artworks

Venues come from photo GPS, so they latch onto whatever carries coordinates nearby. The "venues"
in the import included:

- **the equestrian statue of Louis XIV** (6 picks) — a statue, not a museum
- **the V&A Rotunda Chandelier** — an object hanging inside the museum it was standing in for
- **Man Controlling Trade**, **Larry La Trobe**, **The Fruit**, **Mother and Child: Block Seat** —
  all public sculptures
- **the Museum of Primitive Art** — closed in **1976**

Title-matching would never have caught these; they are perfectly real Wikidata entities. What
resolved them was **same-day co-location**: what *else* that day's photos place Fuad at. The Louis
XIV statue sits in the Louvre's courtyard and the day's other photos are Louvre works. The
chandelier day is a V&A day.

The defunct museum is the sharpest case. July's pass had remapped it to **the Met**, reasoning that
the Rockefeller primitive-art collection went there — true of the collection, and wrong here. All
five picks are **MoMA-held works** (Nadelman's *Man in the Open Air*, Hopper's *House by the
Railroad*) shot on a day spent at MoMA. The old museum's building stood next door on W 54th. A
correct fact about the collection produced a wrong answer about the photograph.

## 3. "Loved" did not mean what the importer assumed

The decisions file carries 1,382 love/like marks. The importer filed every unmatched one as an
`unsure` **sighting**. At the six rows that existed in July this was harmless. At **1,037** it would
have redefined what the canon means by "seen" — two-thirds of it works Fuad had never stood in
front of.

The marks come from a candidate picker: while identifying a photo you can like anything on screen.
One Artizon photo of Monet's *Weeping Willow* produced likes on five other Monet water-lily
variants sitting in the same result list. That is browsing, not testimony.

Fuad's rule settled it — *"the matched ones are the ones that I have seen in real life"* — and
unmatched loves now become `wish: true` with **no `seenAt` and no `seenConfidence`**.

Which then broke two things downstream, both worth recording:

- The Wall's **"unsure" chip** was `seenConfidence !== "sure"`. Rows with *no* confidence at all
  satisfy that, so every never-seen work appeared as an uncertain sighting: 1,472 results instead
  of 465.
- The **pilgrimage map** grouped by `seenAt`, which a wish work does not have. 1,007 of 1,094 fell
  into a single "location TBC" bucket and drew **zero markers**. The fix was to stop asking where
  Fuad stood and start asking where the work *lives* (Wikidata P195) — a different question that
  needed a different field.

## 4. Same title, same artist, same aspect ratio, different object

Tour anchors are normalised 0–1 fractions, so a bigger scan of the **same framing** needs no rework
while a differently-cropped one silently moves every box. An aspect-ratio gate (≤2% drift) sorts
those apart mechanically.

It is necessary and nowhere near sufficient. Candidates that **passed** the gate:

- **The Thinker** — the offered scan is the **Dresden Albertinum** cast. The canon row is the Musée
  Rodin cast and its tour was authored against that photograph.
- **The Age of Bronze** — the **Burrell** cast. **Sakuntala** — the **Cambrai** marble.
  **Nebuchadnezzar** — the **Minneapolis** impression.
- **Elgin Marbles** — an **etching *of*** the horses' heads, by a 19th-century printmaker.
- **Cypresse** — "digitally enhanced by rawpixel", a colour-altered derivative. Sharper is not truer.
- **The Tiger** — filename `PA291038`. A gallery snapshot; the aspect matched only because it was
  cropped to the canvas.

So the gate is now backed by rules with art-historical reasons. **Sculpture is never auto-swapped**
(a bronze is cast many times). **Works on paper likewise** (impressions and states differ between
institutions). **Camera filenames** mean a snapshot, not a flat reproduction. Paintings are unique
objects, which is why they are the only category swapped automatically.

## 5. Sources that promise more than they deliver

- **Commons never upscales.** `?width=2000` against a 700px original returns 700px, stretched by
  the browser. Nothing in the data recorded true size, so 844 works — 44% — were silently
  upscaling in zoom, and a "Full resolution ↗" link opened a **363px** Monet.
- **Musée d'Orsay's public IIIF caps at 649×850** — *smaller* than what the site already served.
  Wiring it up on the assumption that a museum IIIF beats a Commons file would have been a
  downgrade across four works.
- **Europeana** (key already in `.env`) returned, for these works, a **Gallica book scan** and two
  **Bildindex** photo-archive records. Broad metadata aggregation, not museum reproductions.
- Three works read as low-resolution but tour off a museum hires source the audit does not measure
  (**Szał uniesień** among them, at MNK). Measuring the Commons file said nothing about them.

## 6. Rows that were not artworks

Wikidata's P31 flagged canon entries whose "artwork" was a **museum** (the Clockmakers' Museum,
a gallery inside the Science Museum), two **exhibition titles** (*Renoir et l'amour*, *Delacroix
1798–1863*) and a **collection** (the Borghese). All four had artist "(unknown)" — the tell was
there, but only a type check surfaced it.

Ten more are flagged and legitimate, just vaguely typed upstream: the Elgin Marbles are an "art
collection", the Portland Vase a "work of art". They stay unbucketed rather than guessed at.

## 7. Administrative geography is not where things are

Wikidata's P131 gives the administrative unit a building sits in. Museum stubs arrived filed under
**City of Westminster**, **Royal Borough of Kensington and Chelsea**, **South Kensington**,
**Saint-Germain-l'Auxerrois**, **Ueno-kōen**, **Kitanomaru Park**, **Manhattan**, **Victoria** (a
state), and one bare **`?`** where it did not resolve at all. Correct data, useless sentences —
nobody says a Tate work is in the City of Westminster.

## 8. Prose mentions a thing; the picture may not contain it

Subject search needed a source. Two free ones were built and measured before spending anything.

**Wikidata `depicts` + `genre` is precise and sparse.** 1,100 of 1,868 works (59%) carry something;
genre is the cleaner half — 293 landscapes, 167 portraits, 117 genre scenes, 30 marine. Depicted
objects are trustworthy where present: the dogs it finds in *A Burial at Ornans*, *The Painter's
Studio* and *The Balcony* are all really there.

**Mining the reads is broad and unreliable.** The repo already holds 623 reads, 309 studies and
1,894 descriptions, so a controlled vocabulary of 58 tags over 369 surface forms was matched against
them: 848 works tagged. Then it was scored — for works carrying *both* layers, how often does a
mined tag find any support in that work's Wikidata subjects?

**30%.** And the failures cluster exactly where you would fear:

| tag | corroborated |
|---|---|
| interior | 4% |
| field | 8% |
| city | 13% |
| mountain | 15% |
| … | |
| woman | 52% |
| portrait | 63% |

The tags that survive are the ones where the read's subject *is* the painting's subject. The rest
are prose artefacts. Two specimens make the mechanism plain:

- **Whistler's Mother** came back tagged `bigcat` — because the etching hanging on her wall is
  titled ***Black Lion Wharf***. The word was in the text; the animal was never in the room.
- **Klimt's The Kiss** came back tagged `sea`, from figurative language about a wave of gold.

Reads describe, digress and name other artworks. Matching words in them finds what the writing
*mentions*, not what the canvas *shows*.

**And the decisive gap:** across 1,655 distinct Wikidata subject terms in this corpus there are
**zero** time-of-day terms — no morning, dawn, dusk, sunset, twilight, night. Wikidata encodes
objects and genres, never conditions. So the free layers answer "dogs" and "the ocean" well and
cannot answer "morning" at all, which is precisely the half a vision pass would exist to supply.

`art_keywords.js` is generated but **not loaded by the app**. It is kept because the miner is the
cheapest way to re-measure this if the vocabulary changes — not because its output is fit to search.

---

## What the noise taught the pipeline

1. **An unused identifier rots.** Twelve wrong qids survived because nothing read them.
2. **Corroborate across sources.** Same-day co-location resolved venue errors that no amount of
   title-matching could.
3. **A passing check is not a verdict.** Aspect ratio proves framing and nothing about identity.
4. **Never guess a category.** Unmapped P31s keep their label and get a null bucket; a wrong medium
   is worse than an absent one.
5. **Ask the right question.** "Where did he stand" and "where does it live" are different fields,
   and conflating them cost the map its markers.
6. **Report what you actually have.** Measure the file, then label the link with its real size.
