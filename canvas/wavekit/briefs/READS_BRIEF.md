# The reads — wave 12, mv 5. Interpretation + Info + `beside`, ONE agent per work

Under mv 5 these three artifacts are written by one agent from one reading of the merged tour and
the research hook, in this order: **Interpretation → Info → `beside`**. The order matters. The
Interpretation cuts the tour's argument to its crux; the Info is written knowing what the
Interpretation took; the `beside` points at the relation the two of them have already isolated
instead of re-deriving it in parallel.

Read `BRIEF_common.md` first.

## Read, in this order
1. `out_tour_<id>.json` — the finished, gated, repaired tour. This is the verified layer beneath you.
2. `fusion_<id>.md` — **find the LAYER ALLOCATION block. It names a claim RESERVED FOR THE
   INTERPRETATION, and the tour has deliberately spent none of it.** That is not a suggestion; it is
   what the tour gave up so you would have somewhere to stand.
3. `hook_<id>.md` — the research. VERIFIED facts are usable. Anything in DOUBTS may be hedged and
   never stated flat. **A hook's VERIFIED quotations outrank its own HOOKS and ANSWERS prose** — where
   a hook's summary and its quoted source disagree, the quotation wins; where two of its sections
   disagree with each other, the claim is unsettled and you say so rather than picking the convenient
   half.
4. `pre_<id>.json` — carries `existingInfo` where one already ships on the site.
5. For the `beside` only: `beside_candidates.json` (your entry holds `self` plus `sameArtist`,
   `crossArtist` and `periodToured` pools, each row carrying the companion's own shipped Info where
   it has one) and `CORPUS_INDEX.txt` (`id | artist | title | year | museum | TOURED | INFO` for the
   whole canon).

---

# 1. THE INTERPRETATION → `interp_<id>.md`

The paragraph and nothing else. No heading, no title, no count, no notes.

- **Target 95–115 words.** It may run over when you can NAME what the extra carries — an anchor, a
  date, a named detail. Restatement and scaffolding get cut instead.
- **One paragraph, and the best line goes FIRST.** The unifying idea for a rich work, the single crux
  for a settled one. Do not back-load the payoff; that is this layer's habitual failure.
- **Encapsulate the whole work; never cherry-pick.** Where a picture carries several readings, hold
  them under one idea and show each as a facet. Where it has one, say it and cash it out.
- **DEEPEN, NEVER RE-NAME.** If the tour owns a fact, you return to it only by going further into it.
  The failure specimen: an Info gave "the clock past four, the candle burnt to nothing, a document
  lettered CODE" and the Interpretation opened by naming all three again. The pass: both tiers carry
  the light-off-the-grass fact and the deep cashes it out — *"there is almost no actual white."*
- **Two shared four-grams with your own tour is the cap.** Not because overlap is wrong in itself,
  but because a read that reuses the tour's wording has not thought again.
- **You inherit the tour's hedges.** A claim the tour flagged as uncertain may not harden here. A
  hedge that gets firmer as it travels toward the reader is the single most common defect at this
  layer, and it blocks a merge.
- **Banned openers**: a framing fact ("Among roughly eighty…"), theory-first, "What…", "This
  painting…", and the artist's name.
- **Never write the location** — no venue, no "hangs in", no "its home is". The viewer already shows
  where the work lives. A museum survives only inside a genuine event-story.
- No exclamation marks. No quotation marks except around words genuinely quoted from a document. No
  masterpiece talk. Second person is allowed.

---

# 2. THE INFO → `info_<id>.md`

The paragraph and nothing else. It is the doorway: the first thing a stranger reads, above the
Interpretation.

- **32–38 words, and the band is a CONSTRAINT that substance does not relax.** A work with eight
  verified facts needs the discipline more than a thin one, not less: the Info's value is that it is
  ONE BREATH, and more facts do not buy more doorway. What will not fit belongs in the tour, which is
  where this wave's surplus has already gone.
- **It must answer *what am I looking at*** to someone who knows nothing. That is the doorway's own
  job and it outranks everything else here.
- **Background first** — the making, the circumstance, the documented act. Anecdotes, names, dates
  and prices are the material.
- **One crux line is optional**, at most one, and only if concrete and specific. Editorial commentary
  ("a century of unease") is the fluff class; end on a fact instead.
- Identify through artist + date woven in ("Courbet's 1850 canvas…"). **No title restatement** — the
  page already shows it. A fragment with an em dash is the house form.
- **THE WORK IS THE SUBJECT — the paste test.** An Info that could sit under a different picture by
  the same artist FAILS. At least one load-bearing sentence must be about THIS object: its subject,
  scale, medium, series membership, making or cataloguing circumstance.
- Where two facts are both doorway-worthy and only one fits: **the fact about the object beats the
  fact about the artist.**
- **Stays out**: the location in any form (venue, "hangs in", acquisition, bequest, gift, fund); any
  provenance or dealer-chain opening, which is the weakest hook class there is; any visual
  walkthrough, which is the tour's job and the Interpretation's; any fact from outside the hook's
  VERIFIED list.
- **Where an Info already ships** (one work in this wave does), write the replacement from scratch.
  Do not repair the old sentence and do not reinstate a claim the research retired. Your file is
  diffed against the shipped text and the differences are reported.

---

# 3. THE `beside` → `beside_<id>.json`

    { "beside": "<the paragraph>",
      "refs": [{ "id": "<canon id, COPIED from CORPUS_INDEX.txt>", "text": "<verbatim span>" }],
      "companion": { "id": "...", "title": "...", "museum": "...", "year": 0, "interval": "..." },
      "notes": "how you chose, what you verified, what you refused" }

One paragraph that leaves this picture and sets it against ANOTHER WORK THAT IS ALSO IN THIS
COLLECTION.

**Choosing.** Preferably a TOURED companion, because then its own entry is your first verifier;
toured beats same-artist, and a cross-artist toured work with a real rhyme is better than a
same-artist row with none. **The failure mode to refuse by name is "same artist and nothing else."**
Two canvases sharing a surname is not a rhyme; neither is a shared century, a shared genre, a
general influence claim, or "both are landscapes". The test: strike out *same artist* and *was
influenced by* and see what is left. What IS a rhyme: the same device, the same bargain, the same
wager taken twice, one motif in two roles, the same problem solved opposite ways.

**The four parts, in order.** (1) **The pointer**, one sentence, first — state the relation before
any detail. (2) **The companion, named** — title, museum, interval, all three; the interval is
ARITHMETIC, the delta of two canon `year` fields, not recall, and it may run either direction or be
zero when zero is the point. (3) **The structural rhyme** — the middle, spent describing the
companion concretely enough **that the rhyme is visible**, which is the whole standard, not
"concretely enough to picture". (4) **The reversal, stated flatly, last** — opposite stakes, scale
or vantage; default to `here … ; there …`. It must be STATED, not implied: a paragraph that
describes two pictures and leaves the reader to notice the rhyme has not done the job.

**Band 90–120 words, and the two levers that keep you off the ceiling.** A `beside` describes a
painting the reader cannot see — every other paragraph in a tour is read with its plate in view.
That is why these run long, and the answer is not to describe less but to spend the description
differently. **Lever 1: lean on the reversal, not the description** — the model specimen is 92 words
and builds its entire account of the companion out of what the plate HAS and the companion has not,
so the description and the reversal are the same sentences; not one descriptive word is inventory.
**Lever 2: the companion's title is a live link, one click away** — so you do not need to make the
reader SEE the companion, only to make them WANT TO LOOK.

**A `beside` NEVER COUNTS THE COLLECTION.** Prohibited outright: counts of holdings ("hangs twice in
this collection", "one of three here"); rankings and absolutes over holdings ("the only night scene
here", "the earliest work here") — *the only X* breaks the moment an X is added; and **implied
counts** ("his other portrait here", "both of his works here", "the pair of them"). **POINT, don't
count**: "also in this collection", "elsewhere in this collection", "its companion is here too",
plus the plain naming of the companion and its museum. This governs counts of the COLLECTION, not
counts inside a painting.

**The two shapes a weak `beside` decays into.** The **recap** — grep your own nouns against the four
lenses and every stop; if the material is already in the tour you have written a synthesis coda. The
**afterimage** — any sentence about what the viewer feels, takes away or should notice comes out.
The test is deletability both ways: cut the `beside` and the tour loses nothing; cut the tour and the
`beside` still stands.

**Verify before you write the file.** The companion resolves to a real canon id **copied from
`CORPUS_INDEX.txt`, never typed from a title** — the live precedent is `teodor-axentowicz-kolomyjka`
written for a work whose real id is `teodor-axentowicz-ko-omyjka`, and a hand-typed identifier that
once resolved to an unrelated photograph. Every date, museum and interval is verified in this order:
the companion's own shipped Info, then its canon row, then the wider record. A companion that ships
no Info is hard-flagged by the gate — prefer one that does, and if you name one that does not, you
may assert only what its canon row states.

**⛔ The `refs` contract, which two of five drafters got wrong last wave.** `text` is **not a
label** — it is the ANCHOR PHRASE that must occur in your `beside` prose **exactly once**, matched
literally by `indexOf`. Zero occurrences fail and two occurrences fail. Copy the span out of your own
paragraph character for character, including every apostrophe, accent and any leading article your
sentence does or does not carry — last wave one anchor carried a leading "The" its sentence did not,
and another `beside` never named its companion at all. **The prose string is NEVER modified to suit
the link**; the target lives only in the sibling `refs` field, never as markup inside the sentence.

**A second companion** is permitted only where it makes the reversal two-sided, never as a second
example of the same point: if the paragraph argues the same thing without it, it is padding. Same
verification standard, its own `refs` entry, the same 90–120 words. One companion is the normal case.

**Where there is no real rhyme**, write `{"beside": null, "notes": "<specifically what you looked at
and what failed>"}`. An omission is a decision, not a failure, and it is revisited as the store
grows. A forced `beside` is worse than none — that is precisely what got the first batch rejected.

**Banned openers**: "Set this beside", "Compare this with", "Elsewhere in this collection" as the
first two words, and the artist's name. An earlier wave had five of ten opening *"Set this beside"*.

---

## The batch law, across all three artifacts
Five of these are written at once by five agents who cannot see each other. Assume another work has
already used any general move you reach for. Banned across this batch: the mental-deletion move in
every wording; "across the room"; opening on a bare indefinite noun phrase; the didactic closer ("X
is showing that a painter…"); "doing structural work"; "near-monochrome"; and the argument that *one
small saturated accent governs a uniform field*. `rather than` is the corpus's most worn hinge — use
it at most once across your three paragraphs. **`GAIT_FORECAST.md` names your work's allocated
argumentative shape and four collisions this particular five is at risk of. Read it, and never write
the shape's name.**

---

---

# WAVE-16 ADDENDUM (mv 6): TWO works. Overrides the core where they differ
- **Two agents, one per work**, who cannot see each other: the Renoir (*Le Poirier d'Angleterre*) and the
  Ciągliński (sketch I for *Vita*). Both already ship an Info, so the disposition is **REPLACE or LEAVE**,
  with each failing shipped claim named with its source. There is no AUGMENT.
- **Voice**: the Renoir is SEEN (`sure`), so second person is allowed, sparingly. The Ciągliński is a wish
  row: no "you", no encounter.
- **Reserved claims (in each fusion under "RESERVED FOR THE INTERPRETATION")**: Renoir, the 1951 Monument
  historique classing while in private hands and the 2012 dation; Ciągliński, the double title *Vita* /
  "Topielica", as a fact about the record, never a folklore gloss. ⛔ **A reserved fact appears in the
  Interpretation ONLY, never also in the Info or the `beside`** (wave 15's seal caught exactly that). ⛔
  **The Interpretation must not re-name a stop's closing observation**: deepen it or leave it to the tour.
- **Ciągliński: NO centimetres for the sketch** (the record's 41 × 55 fits no rectangle on the plate). The
  finished *Vita*'s 178 × 213.5 cm may be quoted as the finished picture's. The finished picture is NOT in
  our canon, so it cannot be the `beside` companion.
- **Renoir: the French title**, never "The England pear". Colour or brightness claims come only from
  `orsay_<id>.jpg`.
- Read `repair_<id>.md` and `QUEUE.md` first: what was refuted stays dead. The orchestrator stamps
  `by: "Opus 5.5"` after checking the transcripts.

---

# WAVE-29 BLOCK (mv 6, 2026-10-20): FOUR works, ONE agent per work. Replaces the older addenda AND amends the core's
# `beside` form (STUDY_SPEC rules 10–12, Fuad 2026-10-08 / 10-09 / 10-10)
- **Read first:** `BRIEF_common.md` (WAVE-29 BLOCK, the BLACKOUT, the COLLISIONS, the SCULPTURE block, and ALL lessons 1–72), your `fusion_<id>.md`,
  `GAIT_FORECAST.md` (your Interpretation SHAPE; its label word is BANNED from your prose), `hook_<id>.md` (DOUBTS bind),
  the REPAIRED `out_tour_<id>.json` and `repair_<id>.md`, and `QUEUE.md` (every R-item naming your work; later revise earlier).
- **Disposition:** REPLACE for works 1–3 — each ships a legacy Info (59–71 words, over the band, no Interpretation):
  write the Info from scratch in band (core: *Where an Info already ships*), name every shipped claim the research
  retires with its source in `infodisp_<id>.md`, and never reinstate one. The Interpretation is NEW. <<per-work disposition notes — e.g. PROPOSE-REPLACE for a re-tour whose shipped reads fail: draft both tiers, list each failing claim with its source in infodisp; they ship only on Fuad's separate verdict>>
- **HOOK PRECEDENCE (TIGHTENED 2026-10-22):** the Info takes the fusion's INFO hook, and that hook must be an EVENT
  WITH AN ACTOR AND STAKES — if the fusion's INFO line is dating, attribution/identification, catalogue matching,
  bare version/series membership or commission/exhibition paperwork, STOP and report it to the orchestrator as a
  brief defect instead of drafting it. The Info is an ENCAPSULATED HOOK: it may compress the reserved claim (the
  Interpretation then deepens, never re-names) and is exempt from one-home-per-fact. The reserved claim still never
  enters the `beside`.
- **INFO HOOK CLASS (READS_SPEC §5b + the 2026-10-22 Info-drift rulings):** making, biography-at-that-moment,
  technique, the subject's stakes, or reception. Apparatus (dates, catalogues, identifications, paperwork) at most a
  subordinate clause — unless the apparatus story itself has actor and stakes. No ownership, sale, collection,
  gift or bequest line; no venue. A date conflict lives in the context (lesson 44), never here. A full sentence or
  the house em-dash fragment. `infogate.js` trips on two or more year tokens or catalogue lexicon.
- **Bands:** Info 32–38 words (HARD); Interpretation 95–115 (flexes only where you can name what the extra words carry).
- **THE `beside` — rules 10–12 OVERRIDE the core's form section:**
  - **Rule 10 — chosen by THEME.** The companion shares or mirrors what this picture is ABOUT (the theme its `about`
    lens and Interpretation state), not a shared motif or look. A motif match is the fallback only when no thematic
    companion exists, and your notes say what was weighed. The rhyme must still be VISIBLE on both canvases, and the
    companion is described only as its own plate shows (check it at `fuad.au/canvas/art_hires.js` / its plate) and its
    shipped Info (lesson 42: an old tour's description of a companion can be wrong).
  - **Rule 11 — the four parts are CONTENT, not a sentence plan.** Pointer, companion (title + painter + interval),
    visible thematic rhyme, stated reversal — all required, but ORDER and SHAPE are free. Band **70–130 words**. Banned as
    defaults: imperative openers (Start at, Find, Follow, Look at, Measure); the semicolon-pair close ("there…; here…",
    "X does A; Y does B"); the pet verbs spend / pay / hand / ration. Read the finished `beside_*.json` in THIS workshop and the twenty-five in
    `C:/Users/Fuad/Documents/GitHub/.dtmp/tourwave28/` and make your shape differ. No companion is a wave-28 or wave-29 work,
    no two wave-29 besides share a companion, and no companion already used by a wave-28 beside.
  - **Rule 12 — NO MUSEUM.** Name the companion by title and painter, with the interval; never where it hangs. A place
    appears only when the place itself is the rhyme. (The JSON `companion.museum` field stays for the record.)
  - Never count the collection; `refs [{id,text}]`, each ref text occurring exactly once; ids read from
    `CORPUS_INDEX.txt` / `beside_candidates.json`, never typed from a title; the companion's facts are verified (lessons
    10, 17, 42). Lesson 53: no year-gap counted in words unless the gap is the point; no return-to-home close.
- **Voice:** `sure` — the encounter voice only under rule 8 (expect none).
- **Lessons 8, 9, 13, 14, 22, 28, 54, 58, 59:** no new unverified visual claim in the reads; no closing epigram; hedges
  travel intact; no researcher's voice; one photograph is not a colour authority; no apparatus words; every term set up
  before it is turned on; no Interpretation opening on a quoted letter.
- **Cross-batch:** no Info opens on a month-and-year or on the artist's possessive name; no two wave-29 Interpretations
  share an opening move or a closer form, nor the wave-28 shape lesson 69 names. Read the finished `interp_*.md` and `info_*.md` in THIS workshop before writing.
  <<per-work medium notes and BLACKOUT works, if any>>
- **Measurement quarantine and NEVER CITE THE APPARATUS** apply to all three artifacts.
- Outputs: `interp_<id>.md`, `info_<id>.md` (the paragraph ONLY), `infodisp_<id>.md`, `beside_<id>.json`. The
  orchestrator stamps `by: "Opus 5.5"`. Scratch files prefixed with the work id and the word "reads".
