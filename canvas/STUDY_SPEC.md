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

### ⛔ THE THREE DRAFTING LAWS (added 2026-08-25 after wave 2 audited 20 tours: 0 clean, 6 minor, 14 defective)

Wave 2 found one cause behind almost every defect, and one control that proves it fixable.

**LAW 1 — A STOP STARTS AT A MARK, NEVER AT A PARAGRAPH.** The failures cluster in
*craft-derived* stops: a stop written to DEMONSTRATE a handling claim already made in
`craft` ("edges dissolve", "canvas through the paint", "the bare foreground", "the scrubbed
ground"). Written outward from the claim, such a stop restates the paragraph at closer
range, and its box gets placed afterwards — sometimes on a region that ACTIVELY REFUTES the
claim. Two type specimens: Monet's *Sur la plage à Trouville* stops 5 and 7 both box the
**thickest impasto in the picture** under the heading "bare canvas showing through"; Renoir's
*Chrysanthemums* stop 5 boxes the **crispest contours in the painting** while arguing
everything is kept out of focus.
**THE MODEL IS `vincent-van-gogh-portrait-of-adeline-ravoux`** — the only near-clean tour of
the twenty. All eight boxes correct, every checkable detail confirmed, zero restates, because
**each stop begins at a specific mark and argues outward**. Same drafting model, same era,
opposite result. Read it before drafting.

**LAW 2 — THE FOUR PARAGRAPHS STAY AT WHOLE SCALE AND LEAVE THE PASSAGE UNSPENT.** If
`craft` has already spent the specific passage, the stop has nowhere to go; every RESTATES
finding has this shape. The paragraphs describe the picture; the stops describe places in it.
`craft` may name a METHOD ("he loads the lights and scrubs the darks") but must not spend the
INSTANCE ("the chemise is the thickest paint on the canvas") — that instance is a stop's only
possible content. This is a scope rule, not a length rule.
⚙ **AND THE SAME APPLIES TO `see` — RULED 2026-08-25.** The first repair batch found the
verbatim restating sits in `see` MORE OFTEN than in `craft` (15 of 26 edits). `see` is the
inventory, so it may **NAME** a thing; it may not **DESCRIBE** it, because then the stop has
nothing left to reveal. Type specimen: `see` had pre-described the Zorn bird wing by wing —
"flight feathers fanned into separate strokes, a long dark tail sweeping down the right edge"
— so its stop could only echo. Trimmed to "the canvas erupts into a bird", the stop's
full-wingspan reading lands. **`see` names, stops describe.**

**LAW 3 — NO INVENTED HINGE.** The most damaging class (wave 2A): a stop's EMOTIONAL payload
resting on a detail that is not in the painting. Renoir's *Mother and Children* calls joined
hands "the literal and emotional hinge of the painting" — the mother's hand is on the child's
SHOULDER and the child's hands are in a MUFF, and the error propagates through `see`, `craft`
and the whole stop. Rembrandt's *Simeon* builds on a gaze "lifted upward, past the child"
when the eyes are FULLY CLOSED (the true reading — a blind man SINGING, mouth open — is
better than the invented one, which is the pattern throughout: the real picture beats the
confabulation). **Rule: any claim about feeling, relation or intent must name the visible
thing it rests on, and that thing must be in the stop's own crop.**

### What the wave-1 RE-AUDIT added (2026-08-25) — 18 tours re-checked, ZERO clean

The first pass called most of these clean. Re-run at wave-2 rigour with a worked example in
the brief, every one failed. Four findings that change how drafting and QC should work:

- **⛔ THE DISSOLUTION BIAS — a DIRECTIONAL error, not scatter.** On loose-handling pictures
  the tours consistently describe the surface as MORE dissolved than it is, and never less.
  Zorn's background crowd has fully drawn faces; Boldini's head is a finished society
  portrait and his plumes are described barb by barb; Corinth's hands have separated
  fingers; Zorn's Bacon hair has flying strands. "Everything is paint" is the easy thing to
  say about a bravura surface, and it is usually wrong in the same direction. **When a
  passage looks loose, check whether it is actually loose.**
- **⛔ ABSOLUTE NEGATIVES ARE THE CHEAPEST DEFECTS TO CATCH AND WERE NEVER CHECKED.** "not a
  single strand anywhere", "no single button, seam or crease is actually drawn", "nothing
  here is closed into a clean contour", "they stop being hands at all" — every one refuted by
  its own crop. Any sentence containing never/no/only/nothing/not a single is a QC target by
  construction; grep for them.
- **BOXES DRIFT IN A CONSISTENT DIRECTION** (down and left in several works — the Degas and
  Zorn signature boxes independently, Corinth stops 1/3/4/6). This is mechanically detectable
  corpus-wide and deserves a script rather than an audit.
- **⚠ A REPAIR MUST RE-AUDIT THE WHOLE ENTRY, NOT THE FLAGGED SENTENCE.** Zorn's bird repair
  was correct and held — while the same tour's garment (a cloth coat with a fur collar, called
  "fur" four times), the sitter's expression (parted lips, teeth showing, described as
  "entirely still") and a drifted signature box all survived untouched. Worse, a point-fix
  batch corrected a Boldini stop and its box but left the identical error standing in `see`.
  **Fix the error, then re-read the entry end to end for its propagation and for anything the
  first audit missed.**

### ⚙⚙ TWO ORDERING RULES — measured on the first batch drafted under this spec (2026-08-25)

Six new tours were drafted under the revised spec and self-checked. The result is precise:
**the prose failure modes this spec names by name barely occurred** — zero craft-derived stops,
zero invented hinges, and **zero dissolution-bias errors** (the near-check pushed the other
way, into "Fuseli draws every rib", claims the drafter said they would previously have written
as "everything dissolves"). Law 2's see-names/stops-describe split held. But two failures
reproduced at full corpus rate anyway, and both are caused by the ORDER OF WORK, not by
ignorance of the rule. Fix the order and they stop.

**RULE A — BOXES ARE A SEPARATE SECOND PHASE. Draft bodies with placeholder coordinates,
then place every box FROM ITS OWN CROP, never from the whole view.**
17% of stops (8 of 47) had wrong boxes on the drafter's first pass — *while holding a decile
grid, region grids and forty inspection crops*. Their own words: "the decile-grid estimates I
drafted from were confidently wrong by 5–10 points… The drafting-time box rule tells you to
check; it does not stop you estimating coordinates off a downscaled view and believing them."
Typical misses: a stop titled "The head thrown back" boxed on a window; "The trunk" dominated
by a white door jamb when the stem sits at x 0.664–0.684, not 0.56–0.70. **Only generating the
crop and looking catches these.** Estimating from any downscaled view is not a method.

**RULE B — WRITE THE STOPS FIRST, THE PARAGRAPHS AFTERWARDS.**
`craft` pre-spent its own stops in **5 of 6 tours** — the exact corpus rate — despite Law 2
being explicit and the drafter having read it that hour. The diagnosis: "It seems to be a
property of writing the paragraphs first." A paragraph written before the stops exist has
nothing to defer to, so it spends whatever it notices. Write the stops, then write the four
paragraphs around what the stops have already taken.

⚠ And one thing Law 3 does not cover, found the same day: **a drafter's own `flags` entry is
a tell.** The one invented identification in the batch ("a bowed bass", propagated to `see`,
a stop and `context`) had ALREADY been admitted as uncertain in the draft's own flags — the
claim shipped anyway. **If it is in flags, it may not be asserted in the text.**

### THE CHECKLIST — run this, in this order, before any tour merges (2026-08-25)

Everything above is why. This is what to do. Each item is a specific trigger and a specific
action; none of it requires judgement about quality.

**⚙ CALIBRATED 2026-08-25 against a live run** (5 tours, ~210 grep hits adjudicated, hit rates
measured). Changes from that run are marked ⚙. Run the cheap structural pass (group D) FIRST —
on two of those five tours it condemned five of seven and five of six stops before a single
image was opened.

**A. Per stop, before writing a word of it — AND when auditing one**
⚙ These are the load-bearing steps in both directions. Every one of the four largest findings
in the calibration run came from doing exactly this and finding the stop's subject ABSENT:
a crop with no foot under "The bare foot at the couch edge"; a crop with no bell under "The
great bell"; a crop with no gauntlet under a stop titled for one; a crop holding a standing,
uncrowned, dominant man under a stop describing a seated, crowned, lowly king.
⚙ **When auditing, run step 1 with the body COVERED.** Naming the crop's contents after
reading the body anchors you to the body — the same failure the whole-image-account ordering
exists to prevent.
⚙ **Write the whole-image account off the HIGHEST-RESOLUTION whole view available.** In the
calibration run a small `img_` render produced an account that was wrong about the
composition, and the larger overlay only corrected it after the tour had been read. That is
the Szał false-negative lesson one level up.
1. Open `box_<id>_N.jpg`. Name aloud the three most prominent things in the crop.
2. If the thing the stop is about is not among them, the box is wrong — fix the box or
   change the stop. Do not write the stop and hope.
3. Write the body from those three things outward. If the body's subject arrived from the
   `craft` paragraph rather than from the crop, delete it and start at the crop.

**B. Per stop, after writing it — the greps, in yield order** ⚙ (rates from the calibration run)
4. **Finish claims — DO THIS ONE FIRST. ~38% hit rate, the best ratio in the protocol.**
   `loose`, `dissolve`, `blurred`, `unfinished`, `smudged`, `barely painted`, `no contour`,
   `no modelling`, `smeared`, `decaying`. THE DISSOLUTION BIAS is directional and reproduced
   perfectly in calibration: **every wrong finish claim was wrong toward more-dissolved, with
   zero counter-examples.** Assume the passage is more finished than you wrote, then check.
5. **Absolute negatives and superlatives — ~9%.** `no `, `not a single`, `nothing`, `never`,
   `only`, `the only`, `barely`, `without any`, `stops being`, `the brightest`, `the darkest`,
   `the largest`, `the most`. Prove each absence or ranking against the image — and verify
   superlatives against the PLATE, not the crop, since the counter-example usually sits
   outside the box. ⚙ These two were separate greps and are merged: they fire on the same
   sentences and yielded nothing separable. ⚙ **A previous draft of this file claimed these
   are refuted at ~100%. That did not reproduce — plenty verify as sound. Check them; do not
   convert them on sight.**
6. **Body-side, count, and uniqueness words — ~6% rate but the highest absolute yield.**
   ⚙ NARROWED, which cut the labour by about two thirds and lost nothing in calibration.
   Grep ONLY: (a) possessive body-side — `his/her left|right` + `hand`, `wrist`, `arm`,
   `shoulder`, `foot`; (b) bare numerals — `two`, `three`, `four`, `single`, `a pair`,
   `both`; (c) articles asserting uniqueness — "**the** epaulette", "**a** shackle".
   ⚙ Compositional direction words (`above`, `below`, `upper`, `on the left`) produced ZERO
   findings across 32 stops — do not grep them.
7. ⚙ **Hedges — NEW, and it fired 8 times in calibration.** Grep ` or `, `appear`, `seems`,
   `reads as`, `almost`, `nearly`, `possibly`, `treated as uncertain`. **A hedge must survive
   the zoom.** Calibration found: "eyes shut or nearly so" (fully shut), "appear bound"
   (plainly bound, hinge-pin visible), "its faint smoke would drift" (smoke visible), "a heavy
   dark band or shackle" (two unambiguous manacles), and TWO first-person doubts shipped in a
   reader-facing body ("I read the lettering as CODE…"), both resolved by their own crops.
   Resolve every hedge or move it to `flags`.
7b. ⚙ **Read the TITLE against its own body and its own crop — NEW.** Three calibration
   defects lived in titles while the bodies were sound or self-correcting: "The bare foot at
   the couch edge" (no foot), "The boy on the frame" (a bearded man — the body says so),
   "Mother and child, eye to eye" (no eye contact — the body says "very nearly"). Titles are
   short, unhedged, and apparently drafted independently of the body; nothing else here
   looks at them.

7c. ⚙ **RELATION CLAIMS — verify on the PLATE, never the crop. NEW, and it is the gap that let
   the worst defect of the calibration run through.** Any stop whose subject is a RELATION
   rather than a mark — `cut by the frame`, `runs off the edge`, `the emptiest area`,
   `diagonally opposite`, `answers the`, `above/behind the`, `the only X in the picture` — is
   invisible to every mark-local step above. Type specimen: a Monet stop titled "Cut by the
   frame" argues the boat is sliced by the canvas edge so the viewer completes it; the boat is
   a **complete closed oval** with water beyond both ends. It passes steps 1–3 (the crop does
   contain a boat) and passes the greps. **Three of five headline defects in the calibration
   run were this shape.**
7d. ⚙ **HANDEDNESS — NEW.** For any figure facing the viewer, viewer-left = the sitter's
   RIGHT. Check every `his/her left|right` against the box's x-coordinate. Calibration found a
   Renoir reversing it twice, and David's *Napoleon* putting the most famous hand-in-waistcoat
   in art on the wrong hand.

**C. Per stop, the two structural tests**
8. **The deepen test.** Cover the four paragraphs. Does the stop still say something? If its
   content survives only as an illustration of a paragraph's claim, it fails — give it a
   different mark or cut it.
9. **The hinge test.** If the stop makes ANY claim about feeling, relation, intent or
   attention ("as if", "reads as", "the emotional centre", "she is watching"), name the
   visible thing it rests on and confirm that thing is inside this stop's own crop. If it is
   not, the claim goes or the box moves.

**D. Per tour, before merge**
⚙ **RUN GROUP D FIRST, NOT LAST.** Both calibration auditors reached this independently.
Steps 10 + 12 + the box arithmetic produced about **30% of total yield at roughly 10% of the
effort**, and running them last means adjudicating stops that should not exist. Step 12 failed
in 5 of 5 tours (~17 of 37 stops); `craft` pre-spends its stops, often word for word, and one
read of `craft` grepped against the stop bodies finds it in about a minute.

10. **Diff the tour against itself.** Read `see`, `about`, `craft` and every stop looking only
    for pairs that disagree — a parasol vertical in one and diagonal in another, an object
    "dull red" in one and "the more saturated of two" in another, a tie "hot" in one and
    "cool" in another. Every such pair has a wrong half, and this finds them with no image at
    all. Cheapest check in the protocol.
10b. ⚙ **BOX ARITHMETIC — free, no image needed.** Read every box's coordinates against its
    body's stated location. A Seurat stop said "a patch of open water **just below the
    horizon**" while its own box sat at y 0.18–0.31 and the tour's own text put the horizon "a
    third down" — provably in the sky, from two numbers. This caught 3 of 9 box defects in
    calibration without opening anything. ⚙ Step 10's other real product is **the order in
    which to open crops**: in all five calibration works, the pair flagged at step 10 pointed
    at the crop that then produced the defect.
11. **Box hygiene, mechanical** (this should be a SCRIPT, not an audit step). ⚙ **NESTING IS
    ONLY A DEFECT WHEN the containing box is MID-TOUR *and* the contained stop's subject is
    one the container's own body never claims** (ruled 2026-08-25 by the first box-repair
    batch, which declined most nesting flags as legitimate). Two legitimate shapes: every
    detail stop sitting inside a wide OPENER, and region-to-detail zoom where the container
    names the thing the next stop magnifies. No two stops sharing a box; no box whose title names something outside
    its own frame; no box clipping its named subject; no box outside [0, 1.002]. ⚙ Add one
    judgement check the arithmetic misses: **does the crop's dominant content support or
    contradict the body's premise?** Three calibration boxes were correctly placed and still
    wrong — wide establishing crops whose dominant content refuted their own stop's premise
    of emptiness.
12. **Paragraph scope.** For each stop, confirm its specific instance does not already appear
    in `craft` or `see`. If it does, the paragraph spends it — cut it from the paragraph, not
    from the stop.

**D2. Per tour — no research note may ship as prose (2026-08-25)**
12b. Grep the entry for `Fuad`, `sighting`, `unfixed`, `treat the`, `almost certainly`,
    `cannot be confirmed`, `unverified`, `TBC`. A Matisse `context` shipped with *"Fuad's
    sighting was almost certainly of it on loan… so treat the encounter as real but the venue
    as unfixed"* — it names the owner, admits an unresolved lookup and breaks the register
    every other tour holds. Unresolved questions belong in `flags` (stripped at merge), never
    in the reader's text. Where `seenConfidence` is not `sure`, state the institutional fact
    and stop. A corpus grep found this one isolated; re-run it after any batch.

**E. When repairing an existing tour**
13. Fix the flagged error, then **re-read the entire entry end to end** and re-run A–D on it.
    A repair that corrects one sentence and leaves its propagation elsewhere is a defect that
    now reads as deliberate. Precedents: a bird fixed while the same tour's garment,
    expression and signature box stayed wrong; a stop and its box corrected while the
    identical error stood in `see`.

### Drafting-time box verification (MANDATORY, 2026-08-25)

Boxes were being drawn from the prose rather than checked against it — ~25 wrong across the
20 wave-2 tours, and Seurat's *Bathers* boxes appear mechanically ROTATED among each other
(stop 6's box holds stop 5's subject, stop 2's holds stop 6's). Crop-checking is therefore no
longer only a QC step: **the drafter states, per stop, that it has looked at that region**,
and the merge is refused if a body describes an object its own box excludes. Two cheap
structural checks worth running mechanically before merge: no two stops sharing a box (found
duplicated in Rembrandt's *Simeon*, where stops 2 and 3 are the same crop), and no box
clipping the subject its title names.

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
   ⚠ **CALIBRATE THE AUDITOR, NOT JUST THE TOUR (2026-08-25).** Wave 1 returned 10 clean of
   20 on the HIGHER-risk tier; wave 2 returned 0 clean of 20 on the lower one, same protocol
   and same drafting model. A five-fold gap in that direction is not a fact about the corpus
   — it is auditor variance, and it means **wave 1's clean verdicts are not trustworthy** and
   must be re-run. Give every auditor a WORKED EXAMPLE of a defect-grade finding (the Trouville
   straw-hat-that-is-black, the Railway closed-book-that-is-open) so the bar is set rather
   than discovered per-agent. Also state the plate's pixel size in the brief: a small plate
   manufactures false negatives (see the Szał lesson below).
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
- ⚠ **BUT FIRST CHECK YOU ARE LOOKING AT THE FRONT OF THE OBJECT** (2026-08-25, the Hydra
  case). The Klimt candidate costed at ×1.89 with a "7.62% aspect delta caused by the
  parchment surround" turned out to be a photograph of the panel's **VERSO** — wooden
  stretcher, tacked edges, staples, no painting. The aspect delta *was the aspect of the
  object's back*. Museum IIIF manifests carry conservation shots, raking-light shots and
  versos alongside the recto; **look at every candidate before costing it**. The same pass
  also rejected a larger Commons file that is a **halftone print scan** — visible rosette dot
  screen, mustard cast, painted-on border: more pixels, less information. A gain figure means
  nothing until someone has looked at the image.
- ⚙ **AND NEITHER DOES A FRAME OR A COLOUR TARGET** (Fuad 2026-08-25, on the Fałat and
  Axentowicz plates, whose displayed image includes the gilt frame and a photographic
  grey-scale calibration bar — roughly 13% not painting): *"The frames are insignificant but
  the quality of the photos look great. If they're upgrades compared to what we hold then we
  should use them but of course if tours exist, they'll need to adapt."* So the rule is one
  rule, not three: **image QUALITY decides adoption; geometry is a remap job.** Frame, mount,
  parchment surround and calibration bar are all the same class — measure the painting's rect
  inside the plate and transform the boxes. What DOES disqualify a plate is being the wrong
  side of the object (the Hydra verso), a halftone print scan, or fewer real pixels than we
  already hold.
  ⚠ Practical note: an existing tour drafted against a framed plate is INTERNALLY consistent —
  its boxes are fractions of that composite and they work. The remap is owed only when the
  plate CHANGES. Both named works are MNW, and round 2 cracked MNW's API on inventory number
  (Fałat's is in its own filename, `MP 563`), so frameless masters may well exist — check
  before re-touring either.
- **A MARGIN DOES NOT DISQUALIFY A BETTER PLATE — REMAP THE BOXES** (Fuad 2026-08-25:
  "if you can implement an IIIF but there's a margin, I'd still try and implement that IIIF
  because it should just simply be superior"). Box coordinates are fractions of whatever the
  deep-zoom source shows, so a candidate whose plate includes mount, parchment or frame
  margin shifts every box — which is a REASON TO TRANSFORM THEM, not a reason to keep a
  600px plate. Measure the painting's rect inside the new plate as fractions
  `(mx, my, mw, mh)`, then per box: `x' = mx + x*mw`, `y' = my + y*mh`, `w' = w*mw`,
  `h' = h*mh`. It is a clean affine remap and it is exact. Verify by re-cropping every
  remapped box off the NEW plate and looking at it — the same crop check the drafting rules
  require, which catches a mis-measured margin immediately. Type specimen: `the-hydra`
  (Klimt, Belvedere, 1512×3508 vs the canon 801×2000, aspect off by 7.6% because their scan
  keeps the parchment surround).
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
