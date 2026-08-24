> Part of the fuad.au docs — start at [/GUIDE.md](/GUIDE.md)

# Study tours — writing spec (`art_inspect.js`)

The INSPECTION layer: per-work deep studies that power Study mode (`#/study/<id>`) — a
reading pane beside a zoomable image, where each `deeper` stop flies the viewer to a
region of the painting. This spec is what a drafting model (Opus subagent) receives;
the QC protocol at the bottom is what the reviewing model runs before merge.

The brief, in Fuad's words: the deep reads should "showcase what makes them what they
are so I can also understand what got me that interested by the artwork."

## Entry format (one JSON object per work)

- `see` — what is literally on the surface and how it works on the eye (90–170 words)
- `about` — what the picture is about; the layer behind the subject (90–170 words)
- `craft` — why it sings: technique, composition, the decisions (90–170 words)
- `context` — the moment around it: history, biography, scandal; closes with the
  personal-encounter line only as the canon allows (90–170 words)
- `deeper` — the detail tour: array of stops
  `{ t, x, y, w, h, body }` — `t` a short title, `body` 80–160 words.
  Coordinates are FRACTIONS of the displayed image (0–1): x,y = top-left of the box,
  w,h = extent. A box must actually contain what its body describes.
- `flags` — (draft only, stripped at merge) any claim the writer is not fully certain
  of. Doubts go here, never into the text.

## Tour structure (settled 2026-07-24; deepened 2026-08-24, Fuad-approved)

The tour is three movements (Fuad 2026-08-24 — "the objective is to understand the
painting better at the end of the day"):

1. **The four paragraphs establish the painting at whole scale** — what it shows, what
   it's about, how it's made, where it sits. All identification questions are settled
   HERE, at picture scale, before any stop is written: an object that only resolves at
   distance (a bird in loose handling, a gaze network, a light direction) must be named
   at this level or it will be mis-read piecemeal in the stops.
2. **The stops descend.** Each stop answers one question: *what does standing this
   close teach that the paragraphs couldn't?* Close-range handling (visible decisions,
   corrections, refusals to correct), objects that reward identification — and then what
   the painter is DOING with them, not just that they are there — and relationships the
   whole view compresses. **A stop that restates a paragraph's claim at closer range is
   a failure even when it is accurate** (the Heiss type case: stop 2 re-ran the see
   paragraph's ambiguity with more words). The old floor stands: no stop that merely
   names what is in the box.
3. **The close re-ascends.** Default close = a step-back synthesis STOP (full-frame box
   allowed) — what the painting adds up to *after* the descent, which is a different
   paragraph than one written before the walk. The smallest-telling-detail close stays
   legitimate where it genuinely lands (a signature stop that carries the work's
   afterlife earns its place; one that just reads the signature does not). Census
   2026-08-24: 100/363 tours closed full-frame, 49 on a signature, the rest stopped on
   whatever detail came last — the re-ascent is now the default, not the exception.

- **Stop count is free** — as many stops as the painting earns (3–9), no padding to a
  number. A crowded Rubens carries 8; a sparse field might earn 3.
- **Arc order**: open with the thing that pulls you in from across the room, then the
  descent region by region, then the re-ascent above.

### Closing-paragraph experiments (2026-08-22 — settled, do not re-pilot)

Two candidate "extra paragraph after the last stop" shapes were piloted on five marquee tours
and REJECTED by Fuad:
- **Synthesis coda** ("what it adds up to") — "doesn't add really to anything"; complete tours
  leave it nothing un-said, and it drifts into recap, the outlawed padding class.
- **Afterimage** ("what stays with you") — "creates assumptions of what impression to take from
  each painting; it shouldn't be suggestive like this." Same boundary as the earlier ruling
  against synthesizing "what stopped you": the viewer's interior is not ours to script.

**SETTLED 2026-08-24 — REGISTER APPROVED, STILL GATED ON DENSITY.** Fuad confirmed the slot
(an ending PARAGRAPH after the last stop, distinct from the re-ascent stop: "the thing I
rejected just didn't seem right content-wise") and approved the content register on two
specimens: the paragraph points **OUTWARD** — where the work sits on his own wall; the same
artist solving a different problem elsewhere in the collection, a different artist solving
the same problem, the thread through the rooms. It cannot recap (its material isn't in the
tour) and cannot script the viewer (its claims are relations between paintings, fact-class,
normal fact QC). Field name `beside`; named works link; deletability both ways (tour loses
nothing without it, it loses nothing without the tour). **His ruling: "for the last paragraph
we'll need lots more tours written first — without the last paragraph I'm afraid."** So:
tours ship WITHOUT `beside` for now; the register below is the model for when the store is
dense enough. Do not re-pilot the rejected shapes; do not draft `beside` before his go.
**EXCEPTION, Fuad same day: "approved those two, though" — the two specimens SHIP** on
heiss + wystawa-1828 (applied to art_inspect.js as the field's pilot pair). Fact-QC on the
drafts caught two errors before apply, both instructive for future `beside` writing:
"full length" for the seated Bacon portrait (checked against that work's OWN tour — the
store is the first verifier), and "both now hang in the same museum" (Szał hangs in the
Sukiennice in Kraków, only arriving there in 1901 via Jasieński; web-verified). The same
check found the szal tour's own context misplacing the 1894 Zachęta scandal in Kraków —
logged in QC_LEDGER as an open defect.

Approved register models (as shipped):

> *Heiss:* Zorn hangs twice in this collection, and the two portraits are the same wager
> placed at opposite stakes. Six years after this, Mrs. Walter Rathbone Bacon took the
> handful-of-strokes manner to the American market at showpiece scale — a seated grandee
> on a very tall canvas, her collie against her side, a likeness as public performance
> where this one stays close, a picture the sitter kept in the family for thirty-six
> years. And the background's eruption here is a whole genre elsewhere on this wall: in
> his sea studies the same loaded wet-into-wet speed runs edge to edge with no face to
> anchor it — what is scaffolding in a portrait is, there, the entire picture.

> *Wystawa 1828:* The room this picture documents has a descendant in this collection.
> Sixty-six years after these tailcoats filed past the flower pieces, Warsaw's art
> public — the very institution this canvas shows being born in a borrowed university
> hall — mobbed a single painting at the Zachęta: Podkowiński's Szał uniesień, which its
> own maker attacked with a knife thirty-six days into the show. The two works bracket
> the same story from either end: here, looking at pictures is still a decorous novelty
> being learned; there, it has become a public passion strong enough to destroy what it
> looks at. This canvas stayed in Warsaw; Szał, restored, hangs in the Sukiennice in
> Kraków.

## Voice and truth rules

- Literate, direct, concrete. No filler, no "masterpiece" talk, no exclamation marks.
- Facts only where confident; where scholarship on the specific work is thin, say so
  and reason from the eye (the sergel entry is the model for a thin record).
- **⛔ UNCERTAINTY LAUNDERING (named 2026-08-24, the Heiss bird case).** Never convert a
  failure to identify into an interpretive thesis. The Zorn background is a bird —
  spread golden wings, long tail — and the shipped tour called it "foliage or blooms…
  or pure paint," then claimed *"Zorn seems to want that ambiguity."* Zorn didn't want
  it; the writer had it. The rule: **a hedge must survive the hi-res zoom.** If after a
  real zoom the object still won't resolve, the ambiguity may be described honestly —
  but "the artist wants this unreadable" is a claim about the artist and needs the same
  grounding as any other fact. Unresolved identifications go to `flags`, never into the
  text as a thesis.
- **Embellishment drift (named 2026-08-24, the Wystawa case).** Invented detail at the
  margin of a correct observation: "both are back views" (both faces are in profile),
  "folded almost double" (bent ~30°), "raises both hands" (one arm). The core reading
  was right; the novelistic finish wasn't. QC checks the finish, not just the claim —
  every posture, garment, gaze and count in a stop is a checkable assertion.
- "You" (addressing Fuad) is allowed only for canon-backed encounter facts — and only
  where `seenConfidence` is **sure**. For `probably`/`unsure` works, state the
  institutional fact ("home of X"), never "you met X". (QC lesson from the museum
  reads, 2026-07-24.)
- Where an `art-about.js` read already exists, the study must not contradict or repeat
  it — its points are taken; go deeper.

## Production pipeline (matured — as run through batch 31, 2026-08-06)

The store is at **300 tours** (batches shipped in waves of 10–25). Each batch runs a
per-work workshop dir at `.dtmp/toursNN/` holding `canon.json`, `p18.json`, the shared
`STUDY_BRIEF.md`, `cs.py`, `ids.json`, the downloaded `img_<id>.jpg`, and the drafters'
`out_tour_<id>.json`. The loop:

1. **Pick the batch.** The tour-priority signal is `seenConfidence:"sure"` + a `note` in
   the canon (there is **no** `favorite` flag). That 2D-painting pool is now exhausted, so
   batches draw from the `unsure`/`probably` marquee tier. **Screen images first:**
   sculpture / installation / gallery-room shots / b&w print repros are NOT tour-eligible —
   the fly-to-region format needs a painted surface. Some canon P18s are b&w heliogravures
   or framed gallery photos; catch these before drafting.
2. **Download each image** locally. Resolve the canon `qid`'s P18 via Wikidata
   `wbgetentities` / `Special:EntityData`, then Commons `Special:FilePath/<file>?width=1600`
   (URL-encode; Commons rate-limits — space requests). Broken qids resolve via Commons
   search or `en.wikipedia.org` pageprops `wikibase_item`. Note low-res briefs so drafters
   ask for fewer, larger stops.
3. **Draft:** one **Opus subagent per work**, in waves of ~5, each given the shared
   `STUDY_BRIEF.md`, the image path, and per-work preflags **including `seenConfidence`**
   (so the drafter uses the right framing). Output: one `out_tour_<id>.json` each. Badge the
   merged entry `by:"Opus 4.8"`.
4. **Whole-first image QC (mandatory, 2026-08-24 — THE ORDER IS THE MECHANISM, same as
   the reads pipeline's account-first check):** the reviewer looks at the FULL image and
   writes a short account of what it sees at picture scale — main elements, how regions
   relate, deploying real knowledge of the artist and work — **BEFORE reading the draft**.
   An account formed after reading is anchored to the draft and finds nothing. Then:
   (a) diff the account against see/about/craft/context — whole-scale identification
   errors live here and every stop downstream inherits them; (b) judge each stop against
   the deepen bar (does this zoom teach something the paragraphs didn't?); (c) findings
   that the draft never used (an unnamed object, a spatial rhyme, a background figure
   doing quiet work) are DEEPENING MATERIAL, not just defects — route them as proposals
   for the stop rewrite or the re-ascent close, printed for Fuad's verdict like fnotes.
   Priority classes: painterly/loose handling (the Zorn class — suggestion invites
   misreading) and dense multi-object scenes (gallery interiors, still lifes).
5. **Box QC (mandatory — never merge un-cropped):** run `cs.py` to draw numbered overlays
   (`ov_<id>.jpg`) and crop every `deeper` box (`box_<id>_N.jpg`), then look at every crop
   WITH the whole-image account in hand — crops verify local detail (posture, garment,
   count: the embellishment class); identification was settled a level up, because a
   crop of a bird's tail is just gold streaks (cropping defeats manners built on
   suggestion-at-distance). Recent batches run near-zero fixes because drafters are told
   upfront the boxes will be crop-checked — but the format still catches real drift.
6. **Fact QC:** batch of Sonnet web-verifiers (one per work, or grouped), each handed the
   work's `flags[]` and text, reporting `FIX: "<old>" => "<new>"` for confirmed errors only.
   Apply as minimal Python string patches (**use a real em-dash `—`, not `--`**).
7. **Merge:** insertion-only into `window.CANVAS_INSPECT` after the `window.CANVAS_INSPECT = {\n`
   anchor — strip `id` + `flags`, keep `by`. Prove the round-trip: eval before/after, assert
   every existing entry is byte-identical, the count delta equals the batch size, and no box
   exceeds `[0, 1.002]`. Commit (`git commit -F -`) and push (canvas `?v=` is auto).

## QC lessons (accumulated — read before drafting/QC)

- **Text-only QC cannot catch visual misreads** (2026-08-24 — the audit that reshaped
  this spec). The 309/309 tour QC read every tour against knowledge and web sources and
  recorded "zero defects in the visual layers." Then a three-tour image audit found the
  Heiss bird misidentified in see + a stop, and four embellished details in Wystawa
  1828. The earlier zero was an artifact of method: knowledge-QC checks history; only
  the whole-first image account (pipeline step 4) checks what's on the canvas. QC_LEDGER
  coverage claims for the visual layers date from before this instrument existed.
- **A poor plate manufactures false QC findings** (wave 1, 2026-08-24). The Szał QC agent
  reported the horse's thrice-asserted "red eye" as unsupported — from a 600×719 plate. At
  2505×3000 the red rim is plainly there; the tour was right and the flag was overturned.
  So: **check the plate's pixel size BEFORE trusting a negative visual finding**, and where
  the plate is poor, upgrade the site (rule below) rather than "fixing" the tour to match a
  bad image. Standing gap: **71 of 363 toured works have no `art_hires` record**, so their
  Study zoom is capped at the 900px canon plate — a backfill campaign worth its own batch.
- **Stop titles are NOT unique corpus-wide.** A fix script that locates a stop by
  `indexOf(title)` will silently edit a different painting ("The white collar" exists on two
  works; caught by a round-trip assert in wave 1). Always scope edits to the entry key's span.
- **Draft against the plate the SITE displays** (tours10, 2026-08-13). Box coordinates are
  fractions of the displayed image, so a tour drafted on a different Commons reproduction of
  the same painting is invalid — every box flies to the wrong region. Before drafting, read
  `art_data.artworks[id].img` (and any hand-set canon `img`) and download THAT exact file.
  Caught on Marquet's Pont Neuf: the site shows `...la nuit 02.jpg` (tight plate) while the
  P18 download was `...01.jpg` (framed gallery shot).
- **If the site's plate is the poor one, upgrade the site — don't bind the tour to it**
  (Fuad's ruling, same batch). Delaunay's P18 is a framed, grey-green-white-balanced gallery
  photograph; the Google Art Project file on Commons is flat and colour-true. Hand-set the
  better plate on the canon row, then draft against it. Search Commons via
  `action=query&generator=search&gsrnamespace=6` with `imageinfo` and sort by pixel area.
- **Never hand-build an `upload.wikimedia.org/.../thumb/x/xx/` URL.** That path segment is the
  first hex digits of the filename's MD5; a guessed one 404s silently and leaves a blank tile
  (I wrote `e/e8` for a file whose hash starts `db`). Use
  `commons.wikimedia.org/wiki/Special:FilePath/<urlencoded name>?width=N` — no hash needed —
  and HEAD-check every image URL before it enters canon.
- **Verify the drafter's flags against the text, not the flag's own claim.** A Marquet flag
  said the address was "deliberately left vague"; the text asserted a specific flat on the
  place du Pont-Neuf, which no source supports. Read the passage the flag refers to.
- **A qid typed from memory is a wrong-artwork risk.** A hand-substituted qid resolved to an
  unrelated photograph; the drafter correctly refused to write rather than invent boxes.
  Substitutions must take their qid from the canon row, never from recall.

- **Image beats web on anything visible.** Fact-verifiers work from text and are routinely
  wrong about a work's *visuals* (they've mis-called costume colour, hat shape, weapon
  count). Only apply verifier fixes to non-visual history; trust the drafter's image-read
  for what's on the surface. It also beats your own hasty text edits (the Ophelia robin: I
  moved the text per a verifier before re-checking the image, and had to move it back).
- **Reconcile the tour against the CANON entry, not just your brief.** A preflag naming the
  wrong institution sends the verifier to check the wrong *object* entirely (Goya
  Truth/Time/History: the canon `seenAt`/qid is the Stockholm finished canvas, but the brief
  said "MFA Boston sketch" — a different work with a different title). Always check
  `seenAt` + `qid` before trusting a preflag.
- **Some canon images are framed gallery photos.** Coordinates are fractions of *that*
  photo, so verify boxes don't clip onto the frame (Degas Two Dancers: two boxes had to be
  tightened off the gold frame).
- **Dark silhouettes read as empty** in both the drafted box and a brightened crop — verify
  against an *unbrightened* zoom that shows the figure's contour against a light neighbour
  (Munch's near-invisible top-hatted man). Brightening *hurts* a shadow-figure.
- **Trust the drafter when the qid image differs from your preflags** — they're reading the
  actual image and correctly adapt (Manet self-portrait = the skull-cap Artizon version, not
  the private palette one).
- **On subagent overload / session limits** (daily limit resets ~06:40 Sydney; occasional
  529s): hand-draft the affected works directly rather than stall — same quality, still
  badged honestly.
- A work with a **broken qid shows no image on the site** — worth periodic qid audits
  (P31/P18/P170). False positives: pastels/sculptures/murals (P31 ≠ "painting") and
  intentional `met-NNNNN` accession pseudo-ids.
