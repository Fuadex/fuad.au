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
  ⚙ **And it must contain it with AIR AROUND IT — see *Boxes are drawn with breathing room*
  (2026-08-25).** A box cropped tight to its subject is wrong even when it is accurate. Every
  box in the store was padded ×1.15 linear, tapered to zero at `max(w,h) ≥ 0.80`.
  **`body` is ONE paragraph.** It is a plain string, the renderer wraps it in a single `<p>`
  (`canvas-app.jsx:1713`), and no body in the corpus contains a break. Two paragraphs on a
  stop do not exist and would not render.
  ⭐ **The box may be OMITTED — at most once per tour, under the four conditions at checklist
  10c(a).** A stop with no `x`/`y`/`w`/`h` renders as a reading-pane paragraph with nothing to
  fly to; it exists to carry an argument no crop could hold. Four in the corpus. See *THE
  CALIBRATION SPECIMEN*.
- `beside` — the closing paragraph, after the last stop: this work set against ANOTHER
  WORK IN THIS COLLECTION (90–120 words, soft). **Required on every new tour**
  (Fuad 2026-08-25) — see *The `beside`* below for the form and the one legitimate
  omission.
- `refs` — cross-references to OTHER works in this collection named in the prose, carried
  as a sibling field so the paragraph itself is untouched. Applies to `context`, `beside`
  and each `deeper[].body`. Full rules in *Corpus cross-references* below.
- `flags` — (draft only, stripped at merge) any claim the writer is not fully certain
  of. Doubts go here, never into the text.
- `survey` — (draft only, stripped at merge; added 2026-08-25) the list of distinct marks the
  drafter found worth a stop, one per stop, in stop order. ⚙ **Revised 2026-08-25:** it is what
  makes every stop's STARTING MARK auditable — a Law-1 gate, not a count check (the count it
  produces reproduces what was already being shipped) — see **RULE C** and checklist 10c.

⛔ **THE GOVERNING TEST — EVERY SENTENCE IN A LENS MUST EARN ITS PLACE. LENGTH IS AN OUTCOME,
NEVER A TARGET, IN EITHER DIRECTION** (ruled 2026-08-25; this supersedes the earlier
floor-and-ceiling note, which was being read as "make the lenses shorter").

**It cuts both ways, and the second way is the one that gets forgotten.**
- A band is **not a quota to fill**. A `see` that has said what it has to say in 96 words is
  finished at 96; nothing may be added to reach 137. Fuad's caveat travels with it —
  *"sometimes more space may be needed"* — so the ceiling is soft in the same way.
- A band is **not a quota to empty**, and the specimen below is **not a length to shrink to**.
  A lens whose every sentence is justified may sit at the top of its band or past it. Fuad,
  ruling this: *"it can be tighter like the woman with the parasol, it can be as long as it
  gets — but the content needs to be justified."*

⛔ **A LONG LENS IS NOT A DEFECT. AN UNJUSTIFIED LENS IS — AT ANY LENGTH.** No repair may be
booked on the ground that it shortens a paragraph. A word count is evidence that something may
be worth reading for, never the finding itself, and never the remedy. See *THE CALIBRATION
SPECIMEN*, *NEGATIONS* and checklist 10d.

⚙ **AND THE SAME TEST READ FROM THE OTHER SIDE — SPACE IS PROPORTIONAL TO SUBSTANCE** (Fuad,
2026-08-25, completing the ruling above): *"the amount of space is justified by what's
communicated. So, by that example: the one artist you kept telling me had like 8-13 verified
stuff, could by that law take much more space by account because there is lots to unpack there
- not every painting will, though"*

**These are ONE principle, not two rules.** Justification says every sentence must earn its
place. Proportionality says a work with more that is verified and worth unpacking earns more
sentences — and a work with little earns fewer. **Length is an OUTPUT of how much there is to
say, never a target in either direction.** ⚙ **And this is where the ruling LANDS.** The Info
band next door was affirmed as a hard constraint the same day — *"I'd still prefer infos tight,
though but we can delve deeper in the study to explore more angles etc."* (READS_SPEC §5c) — so
the STUDY is the "deeper" Fuad names. The four lenses and the stops are where a rich work gets
its room; the doorway upstairs does not widen.

⛔ **IT DOES NOT LICENSE EXPANSION BY DEFAULT — *"not every painting will"* IS LOAD-BEARING.**
The expected outcome of applying this rule is that almost nothing changes length. Room is
CLAIMED, never assumed: **a drafter who cannot NAME what the extra room is carrying does not get
it.** The test is one line — *count the verified, non-redundant things this work gives you that
a reader could not get from looking at it*, where three facts about one exhibition are ONE thing
and anything plainly visible in the plate is ZERO — then, per unit of extra room, name what it
carries and which question it answers. ***"There was more available"* is a count, not a
justification.** Full form, and why it costs no new step, at READS_SPEC §1 *The claim test*.

⚙ **The stops already have this instrument; the four lenses do not.** RULE C's `survey` is
proportionality in mechanical form — list the marks that reward a stop, write one stop per mark,
floor 3, ceiling 9, **the count is an output**. Read it with its measured caveat intact: blind
surveys reproduce the shipped counts, so **do not expect the survey to move the number, and do
not treat an unmoved number as a failed survey.** What has no such instrument is the lenses, and
that is where the claim test does its work.

⭐ **THE STOPS ARE NOT IN SCOPE.** Fuad, same ruling: *"tours were actually pretty nice and
tight."* No stop needs shortening, and none of the material below is a licence to rebalance a
tour by taking words off a stop.

## Tour structure (settled 2026-07-24; deepened 2026-08-24, Fuad-approved; fourth movement added 2026-08-25)

The tour is four movements (Fuad 2026-08-24 — "the objective is to understand the
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
4. **The `beside` steps sideways.** After the last stop, one paragraph that leaves this
   painting and sets it against another work in the collection — the same device or the
   same bargain, at opposite stakes or opposite scale. The tour has spent the picture; this
   spends the room. It is not a recap and not an afterlife: its material is a RELATION
   between two paintings, and it is the only part of the entry sourced from outside the
   frame. **Every new tour ships with one.** A tour without a `beside` is incomplete, not
   finished differently. Full form in *The `beside`* below.

- **Every stop starts at a mark the survey names** (ruled 2026-08-25, corrected the same day) —
  the drafter crops the plate, lists the marks that reward a stop, and writes one stop per mark.
  Floor 3, ceiling 9, **no target and no default**. ⚙ The survey is a **Law-1 gate, not a
  counter**: measured against twelve blind surveys it reproduces the counts already being
  shipped. Method, coverage guard and the measurements — including the two that were falsified:
  **RULE C** below.
  ~~Stop count is free — as many stops as the painting earns (3–9), no padding to a number. A
  crowded Rubens carries 8; a sparse field might earn 3.~~ **SUPERSEDED 2026-08-25, and its
  replacement was corrected the same day.** ~~Kept because the wrong turn is the argument: written
  as a range it was read as a range, and the corpus put 84% of tours on 5–8 with a mean of 6.57.
  The freedom was never exercised.~~ ⚙ The distribution is real; **that reading of it is WRONG.**
  Surveyors shown only an image folder — no title, no artist, no tour, no shipped count — land in
  the same place (mode 7, SD 0.80). 5–8 is convergence, not an unexercised freedom.
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

### ⭐ THE CALIBRATION SPECIMEN — `monet-woman-with-a-parasol` (named by Fuad, 2026-08-25)

Law 1's model (`…adeline-ravoux`) is the model for how a STOP is built. This is the model for
what CLEAN COMMUNICATION looks like across a whole tour. Fuad: *"I think Woman with a Parasol —
Madame Monet and Her Son is still a very good standard. At times it even allowed a second
paragraph on a second stop to add more to the text. The stops in fact are even fatter than the
see, about, craft and context which is interesting but they all work."* Read it before
drafting, alongside the Ravoux.

⛔ **READ THIS BEFORE THE NUMBERS. THE SPECIMEN IS A PROOF OF POSSIBILITY, NOT A TARGET.** What
it demonstrates is that a lens *can* be this tight and still communicate completely — that the
space can be spent well. It does not make 74 words the goal for a `context`, or 361 the goal
for four lenses, and **nobody may trim toward these figures**. Fuad, on exactly this reading:
*"it can be tighter like the woman with the parasol, it can be as long as it gets — but the
content needs to be justified."* The measurements below are EVIDENCE that restraint is
available. They are not a ruler. The governing test is the one at the top of this file: every
sentence earns its place, and length is the outcome.

⚠ **THERE ARE TWO MONET PARASOLS IN THIS STORE AND ONLY ONE OF THEM IS THE SPECIMEN.**
The id is **`monet-woman-with-a-parasol`** — the 1875 Argenteuil canvas at the National Gallery
of Art, Washington. `claude-monet-la-femme-a-l-ombrelle` is a DIFFERENT painting: the 1886
Suzanne Hoschedé version at the Musée d'Orsay, which this tour's own `context` refers to.
Reading the id off the title picks the wrong one; this was caught mid-measurement on
2026-08-25 and is the live proof of 12c/12h(a).

Measured against the corpus the same day (375 tours, 2,465 stops; working at
`.dtmp/tourqc-pass/w10/MEASURES.md`):

| | Parasol | corpus median | |
|---|---:|---:|---|
| `see` | 97 | 139 | −42 |
| `about` | 90 | 138 | −48, exactly on the floor |
| `craft` | 100 | 140 | −40 |
| `context` | **74** | 132 | **−58, UNDER the 90-word floor** |
| four lenses | 361 | ~549 | **−34%** |
| stops | 5 | 6 | below median |
| words per stop | 168, 138, 149, 142, 160 → mean **151** | 120 | **+26%** |
| all stops | 757 | ~788 | par |
| mean stop ÷ mean lens | **1.68** | 0.88 | **inverted** |
| stops' share of the tour | **67.7%** | 59.4% | +8 points |
| descent coverage Σw·h | 0.364, no full-frame closer | ~~0.53~~ **0.693** (**0.850** since the padding) | below median |
| negations per 100 words | **1.25** | 1.73 | **−28%** |
| `rather than` | **0** | 4.48 per tour | **zero** |

**⭐ THE PILOT-VERSUS-PRODUCTION DRIFT — AND WHAT IT ACTUALLY FINDS.** Every one of the
specimen's five stops is at least 138 words — the corpus LENS median — and only **164 of 2,465
stops (6.7%)** reach that length. Meanwhile all four of its lenses sit at or below 100 words.
This is not a Parasol quirk: **the whole 2026-07-12 pilot batch has this shape** —
`leech-convent-garden` runs lenses 95/82/84/73 against stops 141/153/164/167/199,
`podkowinski-szal-uniesien` lenses 102/96/108/82 against stops 142/125/115/120/119. Between the
pilot and the production corpus **the lens grew about 49% and the stop shrank about 15%**.

⛔ **READ THAT FINDING CORRECTLY. IT IS NOT "THE LENSES HAVE GROWN TOO LONG."** ⚙ **Reframed
2026-08-25 — the earlier wording here was a framing error.** Growth is not the defect. The
defect is that **the growth was not accompanied by justification**: measured against the
specimen, the added words are disproportionately negation lists, deferred positives, and
INSTANCES that belong to a stop — not new findings. A production lens that ran 49% longer
because it had 49% more to say would be a better lens, and nothing here says otherwise.
**A long lens is not a defect. An unjustified lens is, at any length.** The number is the
symptom that sent us looking; the pre-spend and the padding are the finding.

⭐ **THE STOPS ARE NOT IN SCOPE.** The stop side of that ratio ("shrank about 15%") is NOT a
call to lengthen stops, and nothing in this section licenses shortening one. Fuad, 2026-08-25:
*"tours were actually pretty nice and tight."* Where a lens and a stop hold the same instance,
**the settled direction is unchanged: cut the paragraph, never the stop** — because the stop is
the only place a reader is looking at the thing being described. That is Law 2 and checklist
12, and it is a rule about WHERE a finding lives, not about how many words either may have.

⚠ **And note what the specimen does to the bands.** Its `context` is 74 words, sixteen under the
floor; two of its stops (168, 160) are at or over the ceiling. Fuad's verdict on the whole
entry is *"they all work"*. **That is the clearest statement available that the bands are not
targets and not gates** — they are a description of where most good paragraphs land. A
paragraph that has finished may stop wherever it finishes, and a paragraph that has not
finished may run on. Neither figure is a destination.

⚙ **IT IS ALSO THE CALIBRATION SPECIMEN FOR PROPORTIONALITY — READ THE RIGHT WAY ROUND.** The
74-word `context` is **not a failure to earn room; it is a spare work well served.** The picture
is a wife and son on a slope on one afternoon, the record around it is thin, and the
outward-facing lens therefore has little that is verified and non-redundant to carry — so it
stops at 74 because it is FINISHED at 74. Fuad names this very work inside the ruling — *"it can
be tighter like the woman with the parasol, it can be as long as it gets"* — which makes the
specimen **the tight end of the same rule, not an exception to it.**
⛔ **What it demonstrates is clean communication, NEVER a target length.** Nobody may cite 74 as
licence to end a `context` early, exactly as nobody may cite the 8-to-13-verified-facts work as
licence to run one long. And the real lesson is the proportionality INSIDE the entry: this
work's substance is on its surface, so its weight sits in the stops (mean 151 against a corpus
120) while its lenses sit at or under 100. **The room went where the substance was.**

**⭐ THE "SECOND PARAGRAPH ON A SECOND STOP" IS A BOXLESS STOP — AND THE SPEC CURRENTLY CALLS IT
A DEFECT.** There is no two-paragraph body anywhere and there cannot be: `deeper[].body` is a
plain string, zero bodies contain a break, and the renderer wraps one in a single `<p>`
(`canvas-app.jsx:1713`). What Parasol actually has is **stop 2, "Looking up at her", with no
`x`, `y`, `w` or `h`** — an argument paragraph sitting in the stop sequence with nothing to fly
to. It is close to unique: of 2,465 stops, **2,461 carry a box and only FOUR do not**, and all
four are pilot-batch — Szał twice, Parasol once, Leech once. Every one is an art-historical or
biographical argument rather than a mark on the surface.
**Checklist 10c(a) presently lists "a stop with no box at all (Szał, twice)" as a Law-1 defect.
Two of its four cited defects are the same device Fuad is here praising in the third.** See the
ruling at 10c(a) — the device is **PERMITTED, once per tour, under four conditions**.

Why Parasol's works, and it is the model for any other: it earns its place by carrying an
argument the four lenses are too small to hold and no crop can show —

> *(stop 2, "Looking up at her")* This is the viewpoint European painting reserved for
> altarpieces and equestrian monuments — the hero on the ridge, the saint against heaven. Monet
> spends it on his wife on an afternoon walk. … The Impressionists said this in manifestos;
> this canvas says it with a slope.

That claim is about a TRADITION, not about a region of canvas. Boxing it would have been a lie
about what the reader is being asked to look at. And note the close: Parasol ends on the
signature stop, not on a full-frame synthesis, and that stop carries the 1875 dating, the
second Impressionist exhibition under the title *La Promenade*, the Mellon provenance and the
NGA — which is exactly the "signature stop that carries the work's afterlife" that movement 3
already licenses.

⚠ **Two things the specimen is NOT a licence for.** It carries no `beside` and no `by` — it
predates both, and `beside` is required on every new tour regardless (2026-08-25). And its
prose has not been re-audited at wave-2 rigour; it is the model for WEIGHT, PROPORTION and
RESTRAINT, and every factual claim in a new tour still goes through groups A–D.

### NEGATIONS — a negation must NAME AN ABSENCE, not DEFER A STATEMENT (2026-08-25)

Fuad: *"one of the remaining smaller problems is including many negations that don't add to
the text within the see, about, craft and context — which points to the text allowing a bit of
tightening as the agent attempts to pad the text. Sometimes more space may be needed, though."*

**Measured over all 375 tours (2,465 stops); negation set and method at
`.dtmp/tourqc-pass/w10/MEASURES.md`. The verdict is SUPPORTED — but not by the mechanism the
diagnosis names, so read all four results before acting on it.**

- **⭐ THE SPECIMEN TEST — SUPPORTED, and it is the decisive one.** The tour Fuad calls the
  standard runs **1.25 negations per 100 words against a corpus 1.73 — 28% below**. Its LENSES
  run **1.11 against a corpus lens 1.63 (−32%)** and its stops **1.32 against 1.79 (−26%)**;
  its entire negation inventory is fourteen words (`no` ×10, `nothing` ×2, `refuses`,
  `Without`). **It uses `rather than` ZERO times** against a corpus mean of 4.48 per tour, and
  it has no serial `no X, no Y` list at all. The tour Fuad reads as un-padded is, on
  measurement, markedly the least negated. That is the loop closing.
- **⚠ BUT THE LENS-VERSUS-STOP PREDICTION IS REFUTED.** Corpus-wide the lenses are the LEAST
  negated part of an entry, not the most: lenses **1.63**, stops **1.79**. If the four
  paragraphs were being padded to a band with negation, they would be the dense ones and they
  are not. **Do not run this as a lens-only rule** — it applies to stops at least as hard.
- **Density tracks the JOB, not the band.** `about` 2.54, `craft` 1.86, `see` 1.24,
  `context` 0.84 — a threefold spread across four fields whose mean lengths differ by 5%.
  Negation is heaviest exactly where the writing is interpretive and lightest where it is
  documentary. That is a property of the argument, not of a word count.
- **Length moves it a little, in the lenses only.** Split at the median: long stops 1.84 vs
  short 1.76 (+5%, noise); long lenses 1.73 vs short 1.53 (**+13%**). A real gradient, and
  smaller than a fill-to-the-band habit would produce. The honest reading: **it is not
  primarily padding, it is a HABIT** — and the specimen shows the habit is optional.

**So the rule is NOT a quota and NOT a word cut.** ⛔ **What makes a deferring negation padding
is that IT COMMUNICATES NOTHING — not that it costs words.** A clause that only postpones the
positive statement has told the reader nothing they did not already have; that is the whole of
the offence, and it would still be the offence if it were free. The remedy is **deleting an
unearning clause**. The paragraph being shorter afterwards is a **side effect, not the goal**,
and a shorter paragraph is not evidence that the pass was done correctly. A fully justified
paragraph with twelve negations in it is fine; a 90-word paragraph with one deferring negation
is not.

⚠ **Corollary: this rule may never be run as a length reduction.** Fuad's caveat is part of the
ruling — *"sometimes more space may be needed"* — and it generalises: **the bands (90–170,
80–160, 90–120) are a floor and a ceiling, never a target in either direction.** A paragraph
that says what it has to say in 96 words is finished at 96. The specimen's `context` finishes at
74, and Fuad's verdict on the entry is *"they all work"* — but *"it can be as long as it gets"*
is the same ruling, and the specimen is a proof that restraint is possible, not a length to
converge on.

⛔ **THE TEST, applied per sentence.** *Delete the negative clause. Does the sentence still
communicate everything it did before?*
- If **yes**, it was deferring — it delayed the positive statement without adding one, which
  means it was carrying no content. Cut it. (Note the test is about CONTENT, not grammar: a
  clause whose removal leaves a sentence that still parses but says less is load-bearing.)
- If **no** — if deleting it removes the finding — it is load-bearing. **Keep it, and land on
  it rather than passing through it.** An absence that is itself the finding is some of the
  best writing in this corpus, and all four of these are the specimen's own:
  *"It isn't a portrait — her face is the least finished thing in it"*;
  *"white rendered with nearly no white, because Impressionism's core discovery is that local
  colour is a lie"*; *"a second isn't long enough to read a face"*;
  *"The blur isn't a failure of likeness. It's the truth of the timespan."*
  Note the last one: the negation is the sentence the stop was built to reach, not a detour on
  the way to one.

**What the measurement DID find, and it is a different defect: a house tic and a padded list.**

- **`rather than` appears 1,680 times — 4.48 per tour**, the single most repeated hinge in the
  corpus. Sampled in context it is usually correct and load-bearing (it corrects a default
  expectation: *"the weapon hangs below the hand rather than above it"*). The defect is
  **monotony, not falsehood**. ⭐ **The specimen uses it ZERO times in 1,118 words** — the
  construction is not necessary and its rate is a drafting habit.
- ~~**The serial `no X, no Y` list runs 371 times, and 206 of those — 55% — run to THREE terms
  or more.**~~ ⚙ **THE PAIR 371/206 DOES NOT REPRODUCE AND MATCHES NO RECORDED MEASUREMENT —
  struck 2026-08-25.** No stated pattern in this file or its workshops returns it. **Re-measured
  the same day, with the method stated inline as this file now requires:** over all
  `see`/`about`/`craft`/`context`/`beside` strings and every `deeper[].body` in
  `art_inspect.js`, matching `/\b[Nn]o\s+[^,;.]{1,40},\s*[Nn]o\s+[^,;.]{1,40}(,…)*/`, the corpus
  returns **387 serial lists, 241 of them (62%) at three terms or more.** ⚠ **That figure is
  pattern-dependent and must be quoted with its regex** — a stricter or looser bound moves it by
  tens. The FINDING is unchanged and does not rest on the scalar: **most serial lists in this
  corpus run past two terms, and that is where the padding lives.** Two terms carry the finding;
  the third and fourth are cadence. Type specimens to shorten, not to defend: *"no counter, no
  server, no vat, nothing to say"*, *"No father, no wreckage, no sun, no wound, no…"*.
  ⚙ **Cap: two terms unless a third refuses a different KIND of thing.** ⭐ The specimen uses
  the construction three times and **stops at two every time**: *"no reworking, no studio
  finish"*, *"no perspective lines, no path winding back"*, *"no commission, no buyer
  waiting"*. In each, the second term is a different kind of absence from the first and there
  is no third.
- ~~**`Nothing here…` / `Nothing in the picture…` opens 79 sentences.**~~ ⚙ **WRONG — corrected
  2026-08-25. It is 54.** Method, stated inline: match
  `/(^|[.!?—]\s+|“)Nothing (here|in the picture)/` across `art_inspect.js` — all five lenses plus
  every stop body. That returns **54**, and the case-sensitive substring **anywhere** in a
  sentence returns 54 as well, so the two readings of the claim agree. ⚠ **No pattern tried
  returns 79.** The loosest reasonable one — case-INSENSITIVE, position-free — returns **70**,
  and that is the nearest approach; the origin of 79 is unrecovered and it is struck rather than
  re-derived. Same treatment either way: fine once, a verbal tic across a corpus. ⛔ **Quote 54
  with the pattern attached, or do not quote a number** — the spread 54 / 70 / 79 across three
  readings of one sentence is the whole argument for this file's own rule about stating what a
  measurement structurally includes.

**⚠ This is a prose rule. It does not replace checklist step 5**, which is a TRUTH check on the
same words: an absolute negative must also be true against the plate. A negation can be
perfectly load-bearing prose and still be factually wrong, which is the whole of the wave-1
re-audit finding.

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

### ⚙⚙ THREE ORDERING RULES — A and B measured on the first batch drafted under this spec, C on the whole corpus and then DEMOTED by a controlled experiment the same day (2026-08-25)

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

**RULE C — THE SURVEY IS A LAW-1 GATE, NOT A COUNTER. EVERY STOP MUST START AT A REAL MARK.**
(Fuad, 2026-08-25: *"for more difficult paintings, more stops can be warranted and vice versa"* —
that principle stands.) Rule A already makes boxes a separate second phase, placed from crops.
**That same phase surveys the plate.** Before writing a word of body text: crop the plate, and
**list the distinct marks that reward a stop** — each one a specific place on the surface that
Law 1 could start from and argue outward. Write one stop per mark, and hand the list back with
the draft (`survey`, pipeline step 3). Floor 3, ceiling 9. **There is no target and no default.**

⚙ **DEMOTED 2026-08-25, THE SAME DAY IT WAS WRITTEN, ON EVIDENCE.** ~~The survey DECIDES how many
stops there are; the length of that list IS the number of stops; the count is an output, never a
target. A dense Canaletto feast day earns eight and should have eight; a near-empty field earns
three and must not be padded to look like a normal tour.~~ **The survey is not a source of a
different number.** Twelve blind surveys — surveyors handed only an image folder and told
explicitly that "3 is a valid answer" — reproduced the shipped counts: mode 7, SD 0.80, mean
absolute delta 1.00, and a delta that correlates with **nothing in the painting** (r = −0.073
against log plate MP) but **r = −0.856 against the shipped count itself**, i.e. pure regression
toward 7. **Do not run the survey expecting the count to move. It usually will not, and a count
that does not move is not a failed survey.**

**What the survey IS for — and it earns its minutes there.** The blind surveys caught real
defects, all one class: **a stop whose stated subject is not a mark on the painted surface.**
Four live specimens —

- Fałat, stop 9 *"Signed into the snow"* — a **signature**, not a pictorial mark;
- Fałat, stop 8 *"The half with no story"* — a stop whose stated content is that **nothing is
  there**;
- Rembrandt, stop 5 *"Faces dissolving into the dark"* — a **zone**, not a mark;
- ~~Szał — **two stops carrying no box at all.**~~ ⛔ **STRUCK 2026-08-25 — THIS WAS A LIVE
  CONTRADICTION INSIDE THIS FILE.** 10c(a) had already un-struck the boxless stop and
  **PERMITTED** it under four conditions, on Fuad's reading of the calibration specimen — and the
  specimen section praises the same device in Parasol's stop 2. So RULE C was listing as a
  defect the exact thing the two sections either side of it hold up as a model. **A boxless stop
  is not a RULE C finding.** It is an exemption from Law 1, granted once per tour under
  10c(a)(i)–(iv); what remains a defect is a boxless stop that was never DECLARED as one.

**That is RULE C's value: it forces every stop to name the mark it starts from (Law 1), and a
stop that cannot name one is the defect — whatever the count is.** A filter, not a counter.
⚠ **Read "cannot name a mark" precisely, since one of the four specimens above just moved:** a
stop that has no mark *because its subject is a tradition or a chronology* is the permitted
boxless stop; a stop that has no mark because nobody looked is the defect. The difference is
whether it is declared, and 10c(a)(iv) is where it gets declared.

The floor and ceiling still hold, and they hold on Law 1 rather than on any claim about counts.
If the survey returns fewer than three marks, re-survey off a larger plate before concluding
anything — a poor plate hides marks (the Szał lesson) — but do not invent marks to reach the
floor. And **no argument from plate size in either direction**: the plate/count correlation an
earlier draft of this section leaned on does not reproduce (r = 0.143, ~2% of variance), so a
big-plate work is not thereby over-stopped and a small-plate work is not thereby under-stopped.

**THE COVERAGE GUARD — the mechanical check, free, no image needed.** Sum `w * h` across the
stops' boxes, **subtracting the closing step-back synthesis stop when its box is full-frame.**
That total is the fraction of the plate the DESCENT visits, counted WITH overlaps. **If it passes
~1.14 the tour is re-covering ground rather than deepening: merge stops until it does not.** Both a
drafter and a QC pass run the same one line of arithmetic and get the same answer, which is the
point — it needs no judgement and no crop. Nothing except the full-frame closer is exempt; a wide
opener counts in full, because a wide opener is where genuine double-covering starts.

⚙ **RECALIBRATED 1.0 → 1.14 ON 2026-08-25, THE DAY THE BOXES WERE PADDED.** Padding every box
×1.15 linear grows its AREA by 32%, so every tour's `sum(w*h)` grew with it and the guard would
have started firing on a third of the corpus — it would have stopped being what this section says
it is. **The threshold is not a round number and never was: it is *the value that keeps the guard
as rare as it was*.** At `1.14`, exactly the same **71 of 375** tours exceed it as exceeded `1.0`
before the padding. (The rarity-preserving band is `[1.1373, 1.1449)`; `1.14` sits inside it.)
The guard's MEANING is unchanged: over it, the tour is re-covering ground rather than deepening —
merge stops.
⛔ **Do not re-derive this from 1.0 × 1.15 or × 1.32.** The padding TAPERS with box size, so the
growth is non-uniform and the correct threshold is empirical, not arithmetic. Re-measure it if the
padding is ever re-tuned; the script is `.dtmp/tourqc-pass/w11/statsJ.js`.

⚙ **THE EXEMPTION IS THE WHOLE GUARD, NOT A FOOTNOTE (measured 2026-08-25).** Movement 3 of this
spec PRESCRIBES a wide/full-frame closing box and 109 of 375 tours take it, so a sum that includes
the closer is measuring the spec, not the tour. A previous pass added the exemption on its own
judgement, before the measurement existed — **that instinct was correct, and it is now the
load-bearing part: the guard is only meaningful on the DESCENT.** On the descent alone the corpus
median is ~~**0.53**~~ **0.693 pre-padding, 0.850 as the store now stands**, flat across 3–10
stops, and only **71 of 375** tours exceed the guard at all. So the
guard is **rare-firing by design — an outlier detector, not a sizing rule — and ~1.14 is a ceiling,
not an elbow.** Do not read a tour approaching it as normal.

⚙ **CORRECTION — THE DESCENT MEDIAN WAS NEVER 0.53. It is 0.693** (and 0.850 since the padding).
This matters more than the digits, because **0.53 sat in the very paragraph memorialising two
earlier errors of exactly this shape.**

> **0.53 is inconsistent with this file's own table three lines below it.** The per-stop-count
> descent medians recorded there run **0.48 / 0.64 / 0.66 / 0.71 / 0.69 / 0.71 / 0.66 / 0.75** —
> only the 3-stop bucket (4 tours) is anywhere near 0.53, so a corpus median of 0.53 cannot be
> produced by those buckets. 0.53 sits at the **22nd percentile** of the real distribution.
>
> **The definition is not in doubt; the scalar is.** Summing `w*h` per tour and subtracting the
> last stop iff `w ≥ 0.95 ∧ h ≥ 0.95` reproduces this file's *other* published numbers exactly —
> the struck un-exempted medians (7 → 1.11 and 8 → 1.39, both exact), the descent table above,
> `70` tours over 1.0 (now 118 post-padding), `108` full-frame closers (now **109**), `123`
> carrying one anywhere (now **124**). **0.53 is the only figure that does not reproduce**, and
> its likeliest origin is the **drop-largest-box control quoted in the same bullet, which
> measures 0.496** — a scalar copied across from a neighbouring experiment.
>
> ⛔ **This is a THIRD instance of this file's own standing lesson** — *state what the sum
> structurally includes* — in its mildest form: not a wrong join, just a number that came from
> the wrong column. The correction changes nothing about the guard's design. It makes the guard
> **rarer relative to the median** than the file claimed, which strengthens the outlier-detector
> reading.

#### Stop counts — measurement snapshot as at 2026-08-25 (this ages; re-measure, don't cite)

Measured across all 375 tours in the store. This was the argument for RULE C, so it is recorded
rather than summarised — **including the two bullets a controlled experiment falsified the same
day** (12 stratified tours, blind surveys, plus corpus-wide correlations; the first was
independently reproduced). Struck text is kept with its numbers visible, because the wrong turn is
the lesson.

- **Distribution — the MEASUREMENT stands; the READING of it was wrong.** 3 stops: 4 tours ·
  4: 15 · 5: 54 · 6: 97 · **7: 116** · 8: 73 · 9: 15 · 10: 1. Mean **6.57**, a bell curve centred
  on 7, ~~**84% on 5–8**~~ ⚙ **— WRONG, corrected 2026-08-25: this file's own histogram sums to
  90.7% on 5–8** (54 + 97 + 116 + 73 = 340 of 375). Method: add the four buckets printed in this
  same sentence and divide by 375. **The error was checkable without leaving the line it sits
  on**, which is the cheapest class of all and the reason step 10's diff-the-entry-against-itself
  exists. ~~A judgement exercised per work does not produce a bell curve; a habit
  does. The 3–9 range was on the page the whole time and was never actually used.~~ **WRONG —
  falsified 2026-08-25.** Twelve blind surveys — surveyors given **only an image folder**: no
  title, no artist, no tour, no shipped count, and told explicitly that *"3 is a valid answer"* —
  produced their own histogram of 5 → 1 · 6 → 2 · **7 → 7** · 8 → 2. **Mode 7, SD 0.80, against
  the shipped SD of ~~1.55~~ ⚙ 1.25** *(corrected 2026-08-25; method: population SD over the
  375-tour histogram printed above — mean 6.573, Σx² = 16,789, variance 1.563, **SD 1.250**. Like
  the 84% it is derivable from the same sentence, and 1.55 is not producible from any weighting of
  those buckets.)* Mean absolute delta from the shipped count **1.00**, mean signed delta
  **+0.50**, and the delta correlates with **nothing in the painting**: r = **−0.073** against
  log₁₀ plate MP, and r = **−0.856** against the shipped count itself — the delta is pure
  regression toward 7. **Seven is not a drafting habit. It appears to be what you get whenever
  anything looks carefully at a painting and lists what rewards a stop.**
- ~~**Coverage stops growing, then goes redundant.** Median summed box area by stop count:
  3 → 0.48 · 4 → 0.66 · 5 → 0.75 · 6 → 0.80 · 7 → **1.11** · 8 → **1.39**. Past six, the boxes
  total more than the whole plate, so they overlap: the extra stops re-cover ground already
  visited. Median stop length stays flat at ~120 words throughout — more stops is simply more
  words on the same surface. This is where the ~1.0 guard comes from; it is the elbow, not a
  round number.~~ **⛔ WRONG — falsified 2026-08-25. It is an artefact.** The rise is caused
  entirely by the **step-back synthesis stop, which this spec's own movement 3 prescribes as a
  wide/full-frame closing box**: **108 of 375 tours close full-frame** (box ≥0.95 on both axes)
  and 123 carry a full-frame box somewhere. Remove the full-frame closer and the medians by stop
  count (3→10) become **0.48 / 0.64 / 0.66 / 0.71 / 0.69 / 0.71 / 0.66 / 0.75** — **flat, and
  never approaching 1.0.** Descent-only median coverage corpus-wide is ~~**0.53**~~ ⚙ **0.693
  (corrected 2026-08-25 — see the guard above; 0.850 since the boxes were padded)**, with only
  **71 of 375** tours above the guard. The experiment reached the same conclusion by a different route
  (dropping the single largest box per tour): 0.26 / 0.40 / 0.41 / 0.50 / 0.51 / 0.57 / 0.55,
  **median 0.496** — rising gently, never near 1.0. ⚠ **That 0.496 is where the phantom 0.53 most
  likely came from**; the two numbers describe different experiments and only one of them was ever
  the guard's baseline. **Extra stops add new small boxes; they do not re-cover ground.**
  Median stop length is indeed flat at ~120 words, but that no longer buys the "more words on the
  same surface" reading. ⚙ **This vindicates the full-frame-close exemption a previous pass added
  to the guard on its own judgement — that instinct was correct, and the guard is only meaningful
  on the DESCENT.**
- ~~**⛔ THE COUNT CURRENTLY TRACKS THE PLATE, NOT THE PAINTING — the core finding.** Median plate
  size by stop count: 4 stops → 7 MP · 5 → 13 MP · 6 → 12 MP · 7 → **21 MP**. The number of
  stops is being driven by how many pixels we happen to hold, which is an accident of who
  digitised the work, rather than by how much is going on in it. A big plate invites more
  zooming and the tour obliges. That correlation is the defect RULE C exists to break: the
  survey looks at the painting's marks, and a plate that affords more magnification does not
  thereby contain more of them.~~ **⛔ WRONG — falsified 2026-08-25. It does not reproduce, and it
  was this section's headline finding.** Re-measured across the corpus using `art_hires` **and**
  `art_imgsize` together, median plate MP by stop count (3→10) is
  **13.8 / 7.1 / 13.3 / 12.4 / 12.7 / 12.3 / 6.2 / 9.9** — flat. Corpus
  **r(stops, log₁₀ MP) = 0.143**, about **2% of variance**, and absent in both the hi-res-only and
  the Commons-only subsets. The original figure came from a **partial join that silently dropped
  every work with no `art_hires` record** — the 8-stop bucket literally computed NaN. It was an
  artefact of missing data, not a signal. **There is no plate effect to break, and nothing in this
  spec may argue that big-plate works are over-stopped or small-plate works under-stopped.**

**⛔ THE DURABLE LESSON — BOTH ERRORS HAVE THE SAME SHAPE.** The coverage bullet summed box areas
without asking what the spec itself puts into that sum; the megapixel bullet joined two tables
without asking which rows the join drops. **Both came from summing or joining without asking what
the data structurally contains.** Before any aggregate is cited in this file: state what the sum
structurally includes, and state what the join silently excludes.

⚠ **And record the caveat on the surveys honestly.** The surveyors worked from ~1920px
derivatives, so they could not find detail visible only at 100+ MP; their agreement with the
shipped counts is therefore not, by itself, evidence against a pixels effect. **The load-bearing
evidence against the pixels hypothesis is the corpus correlation (r = 0.143), not the surveys.**

### THE CHECKLIST — run this, in this order, before any tour merges (2026-08-25)

Everything above is why. This is what to do. Each item is a specific trigger and a specific
action; none of it requires judgement about quality.

**⚙ CALIBRATED 2026-08-25 against a live run** (5 tours, ~210 grep hits adjudicated, hit rates
measured). Changes from that run are marked ⚙. Run the cheap structural pass (group D) FIRST —
on two of those five tours it condemned five of seven and five of six stops before a single
image was opened.

### ⚙ RESHAPED 2026-08-25 — THE NUMBER IS NOW THE RUN ORDER

**The problem this fixes.** The checklist had grown to ~24 operations numbered in the order they
were *discovered* — `1, 2, 3, 4, 5, 6, 7, 7b, 7c, 7d, 7e, 8, 9, 10, 10b, 10c, 10d, 11, 12, 12b,
12c…12h, 13` — and then carried a note at the top saying **run group D first**. A list whose
numbering contradicts its own instructions gets run in list order. **The numbers below ARE the
run order.** Lowest number first, no exceptions, and the expensive image work does not start
until everything free has been done.

⚠ **The section headings and prose below are UNCHANGED and still carry their original labels**,
because ~50 cross-references in this file and in READS_SPEC point at them by the old number. The
map is authoritative in both directions; **cite the new number and put the old one in brackets**
until the cross-references are swept.

| run | operation | was | cost |
|---:|---|---|---|
| **1** | Box hygiene — no shared boxes, no out-of-range, nesting rule | 11 | ⚙ **SCRIPT** |
| **2** | Box arithmetic — coordinates vs the body's stated location | 10b | ⚙ **SCRIPT** |
| **3** | The coverage guard — descent `sum(w*h)` vs ~1.14 | 10c(b) | ⚙ **SCRIPT** |
| **4** | Diff the tour against itself — **including paragraph scope** | 10 **+ 12 folded in** | free |
| **5** | The survey — every stop names its starting mark (Law-1 gate) | 10c(a) | free |
| **6** | The negation pass | 10d | free |
| **6b** | ⚙ The proportion pass — the same read the other way (NEW) | 10e | free |
| **7** | No research note ships as prose | 12b | free |
| **8** | Open the crop; name the three most prominent things | 1 | image |
| **9** | Is the stop's subject among them? If not, the box is wrong | 2 | image |
| **10** | Write/judge the body from those three outward | 3 | image |
| **11** | Finish claims — best hit rate in the protocol | 4 | image |
| **12** | Absolute negatives + superlatives — **including the `beside`** | 5 **+ 12g folded in** | image |
| **13** | Body-side, count and uniqueness words | 6 | image |
| **14** | Hedges — a hedge must survive the zoom | 7 | image |
| **15** | The title against its own body and its own crop | 7b | image |
| **16** | Relation claims — verify on the PLATE, never the crop | 7c | image |
| **17** | Handedness | 7d | image |
| **18** | The reader's resolution ceiling — **per work** | 7e | image |
| **19** | The deepen test | 8 | free |
| **20** | The hinge test | 9 | free |
| **21** | The `beside`'s companion resolves to a real canon id | 12c | free |
| **22** | Every date, museum and interval about the companion verified | 12d | web |
| **23** | The reversal is STATED, not implied | 12e | free |
| **24** | Recap test and scripting test | 12f | free |
| **25** | Cross-references — every named in-collection work carries a ref | 12h | ⚙ **SCRIPT** (`validate-refs.js`) |
| **26** | *(repairs only)* re-audit the WHOLE entry, not the flagged sentence | 13 | full re-run |

⚙ **THE THREE SCRIPTABLE STEPS — 1, 2 and 3 — NEED NO IMAGE, NO CROP AND NO JUDGEMENT.** They are
pure arithmetic over coordinates and should run as a script before a human opens anything; step 25
already has one (`validate-refs.js`) and is the model. In the calibration run these plus step 4
produced about **30% of total yield at roughly 10% of the effort**. Running them last means
adjudicating stops that should not exist.

⚙ **TWO FOLDS, both because the steps were doing one job in two places:**
- **old 12 (paragraph scope) folded into 4 (diff the tour against itself).** Both are entry-internal
  text diffs needing no image, both read `craft`/`see` against the stops, and both were being run
  as separate reads of the same material. One read now answers both questions: *do any two
  statements disagree*, and *does a paragraph already spend a stop's instance*.
- **old 12g (the `beside` inherits the greps) folded into 12.** 12g said only *"steps 4, 5 and 7
  apply to `beside` too"* — a pointer, not an operation. The `beside`'s field name now sits inside
  the grep steps' own scope, which is where a runner will actually see it.

**A. Per stop, before writing a word of it — AND when auditing one** *(run order **8–10**)*
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

**B. Per stop, after writing it — the greps, in yield order** *(run order **11–18**)* ⚙ (rates from the calibration run)
4. **Finish claims — DO THIS ONE FIRST. ~38% hit rate, the best ratio in the protocol.**
   `loose`, `dissolve`, `blurred`, `unfinished`, `smudged`, `barely painted`, `no contour`,
   `no modelling`, `smeared`, `decaying`. THE DISSOLUTION BIAS is directional and reproduced
   perfectly in calibration: **every wrong finish claim was wrong toward more-dissolved, with
   zero counter-examples.** Assume the passage is more finished than you wrote, then check.
5. **Absolute negatives and superlatives — ~9%.** ⚙ *(run order **12**. **Old step 12g is folded
   in here**: this grep runs over the four lenses, every stop body **and the `beside`**.)*
   `no `, `not a single`, `nothing`, `never`,
   `only`, `the only`, `barely`, `without any`, `stops being`, `the brightest`, `the darkest`,
   `the largest`, `the most`. Prove each absence or ranking against the image — and verify
   superlatives against the PLATE, not the crop, since the counter-example usually sits
   outside the box. ⚙ These two were separate greps and are merged: they fire on the same
   sentences and yielded nothing separable. ⚙ **A previous draft of this file claimed these
   are refuted at ~100%. That did not reproduce — plenty verify as sound. Check them; do not
   convert them on sight.**
   ⚙ **On a `beside`, add the collection-scope terms** — `the only`, `hangs twice`, `the whole
   picture`, `the entire picture` — and remember that on that field *the only X in the
   collection* fails under **12g's own prohibition** (a count with an expiry date), not merely
   as an unproven superlative. The finish-claim grep (step 4 / run 11) and the hedge grep
   (step 7 / run 14) apply to the `beside` on the same terms.
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
7e. ⛔ **THE READER'S RESOLUTION CEILING — NO CLAIM MAY DEPEND ON DETAIL THE READER CANNOT
   REACH. The ceiling is PER WORK, and the job file states it.** *(Ruled 2026-08-25 at a flat
   3840; **the constant was replaced by a per-work figure the same day, because 3840 was wrong
   in both directions.**)*

   ~~NO CLAIM MAY DEPEND ON DETAIL FINER THAN 3840 px … the rule is written at 3840 for everyone,
   because a tour is drafted before anyone checks which source it will get.~~ ⚙ **STRUCK. 3840
   is the COMMONS LEGACY-PYRAMID LADDER AND NOTHING ELSE**, and as a corpus-wide constant it
   fails twice over:

   - **It is already mis-stated for the works it describes.** The old text said `art_hires.js`
     carries `pyr` for 37 works and *"every one of them tops out at 3840 px on the long side"*.
     Re-measured: **15 of those 37 top out at 4290–5841 on the long side.** 3840 caps the
     **width**; a portrait-format plate reaches it at 3840 wide and keeps going down the long
     axis. Distinct top long-sides in the store: 3840, 3853, 4290, 4323, 4366, 4774, 4789, 4971,
     5021, 5283, 5373, 5667, 5671, 5733, 5812, 5841.
   - **It is FICTIONAL for the toured works on real tile pyramids**, which have no ceiling at
     all. Measured against the live store: of 375 toured works, **34 sit on a true tile service**
     (31 `iiif` + 2 `iiifId` + 2 `dzi` + 1 `zoomify`, 2 overlapping), **18 on a Commons `pyr`
     ladder**, **263 on a flat `img` only**, and **61 have no `art_hires` row at all**. Writing
     one number across those four populations describes none of them.
     ⚠ **A session note put the tile-pyramid figure at 70; the store returns 34.** Quote 34 with
     its method (`iiif || iiifId || dzi || zoomify` over `art_hires` keys ∩ `art_inspect` keys),
     or re-measure — do not quote 70.

   ⭐ **THE RULE, RESTATED: a claim may go as fine as THAT WORK'S OWN PLATE RESOLVES, and the job
   file states the ceiling per work.** Not a constant, not a guess, not a default. Four cases:

   | source | reader's ceiling | consequence for a claim |
   |---|---|---|
   | true IIIF / DZI / Zoomify | **none** — full pyramid | brushstroke-level `craft` is legitimate |
   | Commons `pyr` ladder | the ladder's **top level**, per work (3840–5841 long side) | check the box's extent at that level |
   | flat `img` | the file's own `w`/`h` | usually the tightest ceiling in the store |
   | **`.tif`-backed `img`** | **1920, whatever the row declares** | ⛔ see below — 46 rows |

   ⛔ **THE TIFF TRAP, and it is the strictest ceiling we have.** Commons **will not render a
   TIFF above 1920 px**: `Special:FilePath/…?width=N` for `N > 1920` redirects to a
   `lossy-page1-1920px-…` render and direct thumb requests at the declared width **400**. So
   `anders-zorn-mrs-veronica-heiss` declares 3478 × 4649 and serves **1920 × 2566**;
   `midsummer-dance` declares 2603 × 3547 and serves **1920 × 2616**; `the-kitchen-maid` declares
   2823 × 3494 and serves **1920 × 2376**. ⚙ **Swept 2026-08-25: 46 `art_hires` rows have a `.tif`
   in `img` and ALL 46 declare a long side over 1920.** For those works the ceiling is **half**
   what the old constant assumed, so the rule is **twice as strict in practice** — and this is
   the concrete reason Fuad's *"considering the resolution"* complaint landed on the Zorn first.
   Full ledger entry: HIRES_SOURCING.md, round 5.

   ✅ **AND THIS IS WHAT RESOLVES FUAD'S BRUSHSTROKE-LEVEL `craft` WISH.** A flat constant made
   his request unwritable everywhere. Per work, it is simply **legitimate on a true IIIF and
   forbidden on a 900 px Commons plate** — the same sentence is a fine reading in one entry and
   an invention in another, and the job file is what tells the drafter which.

   **The check, unchanged in shape:** for every stop, compute the box's pixel extent **at that
   work's stated ceiling** (`w × ceilingW` by `h × ceilingH`) and ask whether the named subject
   survives it. Under roughly **40 px** in its long dimension, the reader sees a smudge: move the
   box, change the subject, or cut the stop. **This applies to `see` and `craft` too.**
   ⚙ Two things this still does NOT say. It does not forbid working at high resolution —
   identifying a mark correctly at 21,100 px and then describing it at a scale the reader can
   reach is exactly right, and it is how the dissolution bias gets caught. And where the job file
   fails to state a ceiling, **assume the flat-`img` case** (the tightest), rather than assuming
   3840. Type specimen for the ladder case remains
   `peter-paul-rubens-a-view-of-het-steen-in-the-early-morning`: `"w": 21100, "h": 12384,
   "pyr": [[1920, 1127], [3840, 2254]]` — the 21,100 px original is a **footer link only, never
   the viewer**, and `maxZoomPixelRatio: 2` magnifies without adding a pixel of detail, so a
   drafter working from `orig` is at 5.5× the reader's maximum. Verified on rendered ladder steps
   (`.dtmp/tourqc-pass/w9verify/`): a gun lock occupying **31 × 16 px** at 3840, and a kingfisher
   legible only ABOVE the ceiling — both had been written up as things to look at.
   ⚠ **One live case where the stated ceiling is a lie:** the two `ng-london` works are recorded
   as unbounded IIIF and the server clamps at **800 px** (HIRES_SOURCING round 5). Until that is
   fixed, treat them as the flat-`img` case.

**C. Per stop, the two structural tests** *(run order **19–20**)*
8. **The deepen test.** Cover the four paragraphs. Does the stop still say something? If its
   content survives only as an illustration of a paragraph's claim, it fails — give it a
   different mark or cut it.
9. **The hinge test.** If the stop makes ANY claim about feeling, relation, intent or
   attention ("as if", "reads as", "the emotional centre", "she is watching"), name the
   visible thing it rests on and confirm that thing is inside this stop's own crop. If it is
   not, the claim goes or the box moves.

**D. Per tour, before merge** *(run order **1–7** — this group goes FIRST, and the numbers in the
map above now say so)*
⚙ **RUN GROUP D FIRST, NOT LAST.** Both calibration auditors reached this independently.
Steps 10 + 12 + the box arithmetic produced about **30% of total yield at roughly 10% of the
effort**, and running them last means adjudicating stops that should not exist. Step 12 failed
in 5 of 5 tours (~17 of 37 stops); `craft` pre-spends its stops, often word for word, and one
read of `craft` grepped against the stop bodies finds it in about a minute.
⚙ **That instruction is now encoded in the numbering rather than asserted against it** — see the
run-order map above. It is also why the old *"run group D first"* note kept being ignored: it sat
under a list numbered the other way round.

10. **Diff the tour against itself.** ⚙ *(run order **4**. **Old step 12 — paragraph scope — is
    FOLDED IN HERE**; it was a second read of the same material.)* Read `see`, `about`, `craft` and every stop looking only
    for pairs that disagree — a parasol vertical in one and diagonal in another, an object
    "dull red" in one and "the more saturated of two" in another, a tie "hot" in one and
    "cool" in another. Every such pair has a wrong half, and this finds them with no image at
    all. Cheapest check in the protocol.
    ⚙ **In the same read, answer the scope question (old 12): for each stop, does its specific
    INSTANCE already appear in `craft` or `see`?** If it does, the paragraph spends it — **cut it
    from the paragraph, not from the stop** (Law 2; the stop is the only place the reader is
    looking at the thing). This failed in **5 of 5** calibration tours, ~17 of 37 stops, and one
    read of `craft` grepped against the stop bodies finds it in about a minute. Two questions,
    one pass over the entry: *do any two statements disagree*, and *does a lens pre-spend a stop*.
10b. ⚙ **BOX ARITHMETIC — SCRIPTABLE ARITHMETIC, no image, no judgement** *(run order **2**)*. Read every box's coordinates against its
    body's stated location. A Seurat stop said "a patch of open water **just below the
    horizon**" while its own box sat at y 0.18–0.31 and the tour's own text put the horizon "a
    third down" — provably in the sky, from two numbers. This caught 3 of 9 box defects in
    calibration without opening anything. ⚙ Step 10's other real product is **the order in
    which to open crops**: in all five calibration works, the pair flagged at step 10 pointed
    at the crop that then produced the defect.
10c. ⚙ **THE SURVEY AND THE COVERAGE GUARD — NEW 2026-08-25 (corrected the same day), free, no
    image needed.** Two checks that run before anyone audits a stop. ⚙ *(run order: **(a) = 5**,
    a judgement read; **(b) = 3**, pure arithmetic and part of the script block. They were paired
    here because they arrived together, not because they are the same kind of work — (b) runs
    two steps earlier than (a).)*
    (a) **Every stop names the mark it starts from.** The draft returns the survey — the list of
    distinct marks that reward a stop — one entry per stop, in stop order (RULE C). ⚙ **This is a
    LAW-1 GATE, not a count check.** What it catches is an entry that is not a mark on the painted
    surface: a **signature** (Fałat stop 9, *"Signed into the snow"*), an **absence** (Fałat stop
    8, *"The half with no story"* — the stated content is that nothing is there), a **zone rather
    than a mark** (Rembrandt stop 5, *"Faces dissolving into the dark"*), ~~or a stop **with no box
    at all** (Szał, twice)~~. Any of those is the defect whatever the count is. ~~A list that does
    not match the count means the number was picked.~~ ⚙ No list at all still means the number was
    taken on trust — send it back to the survey — but **do not expect the survey to change the
    count, and do not treat an unchanged count as a failed survey** (blind surveys reproduce the
    shipped counts; see RULE C). On an existing tour being repaired, reconstruct the list from the
    stops: if two entries name the same mark at different magnifications, that is the merge.
    ⭐ **THE BOXLESS STOP IS UN-STRUCK AND NOW PERMITTED — ruled 2026-08-25 on Fuad's reading of
    the calibration specimen** (*"it even allowed a second paragraph on a second stop to add more
    to the text"*). The two Szał stops cited above as defects are the same device he is praising
    in Parasol's stop 2, *"Looking up at her"*. It is genuinely rare — **2,461 of 2,465 stops
    carry an `x`; the four that do not are all pilot-batch** (Szał ×2, Parasol, Leech) — and it
    stays rare, because it is an exemption from Law 1, not a hole in it. **Four conditions, all
    required:**
    (i) **At most ONE per tour**, and never the opener or the close.
    (ii) **Its subject must be one no crop could hold** — a tradition, a chronology, a
    biographical arc, the picture's place in a lineage. Parasol's argues that Monet spends the
    altarpiece viewpoint on his wife on a walk; Szał's two are the 1894 European fever and the
    painter's death at twenty-eight. If a box COULD be drawn for it, draw one — a boxless stop
    is not a licence to skip the crop-check, and Law 1 still governs every other stop.
    (iii) **It must not be reachable from the four lenses.** If `context` could carry it, it
    belongs in `context`; the boxless stop exists because the argument is longer than a lens can
    hold, which is why the specimen's `context` is 74 words and this stop is 138.
    (iv) **It goes in the survey as an argument, explicitly flagged as boxless**, so nobody
    later audits it as a missing box. A boxless stop that is NOT declared is still the old
    defect: an unmarked hole where a crop-check should have happened.
    (b) **The coverage guard.** ⚙ **SCRIPTABLE ARITHMETIC — this is not an audit step; it needs
    no judgement, no crop and no image, and it should run as a script alongside 10b and 11.**
    Sum `w * h` over the boxes, subtracting a full-frame closing
    synthesis stop, and judge the **DESCENT**. **Over ~1.14, merge stops** ⚙ *(recalibrated from
    ~1.0 on 2026-08-25 when every box was padded — 1.14 is the value that keeps the same 71 of
    375 tours firing; do not re-derive it from 1.15 or 1.32, the padding tapers)*. ⚙ Expect this
    to fire rarely: descent-only corpus median is ~~**0.53**~~ **0.693 pre-padding / 0.850 as the
    store now stands** (corrected 2026-08-25), flat across 3–10 stops, and only **71 of 375**
    tours exceed the guard. ⚙ ~~The corpus medians are 0.80 at six stops and 1.39 at eight, with stop
    length flat at ~120 words, so the extra stops bought words, not depth.~~ **WRONG — struck
    2026-08-25**: that sum included the spec's own prescribed full-frame closer. With the closer
    removed the medians are flat at ~0.7 and extra stops add new small boxes rather than re-covering
    ground. Treat a tour over ~~1.0~~ **1.14** as an **outlier to look at**, not as a routine sizing failure.
10d. ⚙ **THE NEGATION PASS — NEW 2026-08-25, free, no image needed** *(run order **6**)*. Runs over the four
    lenses, every stop body and the `beside`. Full rule and the corpus measurement in
    *NEGATIONS* above; this is the mechanical version. ⛔ **It is a CONTENT pass, not a length
    pass.** The only thing it is allowed to remove is a clause that communicates nothing.
    (a) Grep the entry for `rather than`, `instead of`, `not so much`, `less a`, `nothing but`,
    `Nothing here`, `Nothing in the picture`, and the serial `no X, no Y`.
    (b) On each hit, **delete the negative clause and re-read the sentence. Does it still
    communicate everything it did?** Yes → the clause was deferring, it carried no content;
    cut it. No → it is load-bearing; keep it, and check the sentence LANDS on it rather than
    passing through it. ⚠ Judge by CONTENT, not by whether the remainder still parses — and
    never book a cut on the ground that the paragraph gets shorter.
    (c) **Two caps, both set by the calibration specimen.** A serial `no X, no Y` list stops at
    TWO terms unless a third refuses a different KIND of thing — corpus-wide ~~206 of 371 lists
    (55%)~~ ⚙ **241 of 387 (62%), re-measured 2026-08-25 with the pattern stated in *NEGATIONS*;
    the struck pair reproduces under no method** — run to three or more; the specimen uses the
    construction three times and stops at two
    every time. And `rather than` more than about four times in one entry is monotony — the
    corpus mean is 4.48 per tour and it is the most repeated hinge in the store, while the
    specimen uses it **zero** times in 1,118 words. Vary the construction; do not just cut it.
    ⛔ **This step NEVER produces a word cut as its goal, and a word count is never its
    evidence.** Bands are a floor and a ceiling, never a target in either direction: a lens
    finished at 96 words is finished, and a lens whose every sentence earns its place may run
    to the top of the band or past it. Fuad, ruling this: *"sometimes more space may be
    needed"* and *"it can be as long as it gets — but the content needs to be justified."*
    If the pass shortens a paragraph below the floor, the paragraph was under-reported, not
    over-negated — send it back to the plate, do not re-pad it. And **if a proposed cut removes
    something the entry does not say anywhere else, it is not a negation fix — it is a trim.
    Drop it.**
10e. ⚙ **THE PROPORTION PASS — NEW 2026-08-25, free, no image needed** *(run order **6b**, with
    10d — it is the same read in the other direction)*. ⚠ *Merged from `w15/STUDY_SPEC_PATCH.md`
    pair 3, whose anchor no longer existed; **re-derived from its stated intent**, which was: a QC
    step that adjudicates CLAIMED room, over the lenses and the `beside` only.*
    **Scope: the four lenses and the `beside`. Stops are OUT of scope by ruling**
    (*⭐ THE STOPS ARE NOT IN SCOPE*; the calibration specimen's stops average 151 words and are
    the model), so this step never looks at one.
    For any lens in the upper half of its band or above it, and any `beside` over ~115 words:
    **name what the extra room is carrying, one clause per unit.** A verified, non-redundant
    thing a reader could not get from looking at the picture → **it is earned; leave it, whatever
    the count says.** *"There was more available"*, a third and fourth term of a list, a
    restatement of another lens, or a fact about the artist where the lens is about this object
    → it is not earned, and it comes out under the governing test — **as an unjustified sentence,
    not as a long paragraph.**
    ⚙ Where the draft returned a claim in `flags` (pipeline step 3), **adjudicate the stated
    claim rather than re-deriving one** — that is the whole reason the brief asks for it.
    ⛔ **NEVER RUN THIS IN REVERSE.** A short paragraph is not a finding and this step may not be
    used to argue one up. A `context` at 74 words is the calibration specimen.
11. **Box hygiene — ⚙ SCRIPTABLE ARITHMETIC. This IS a script, not an audit step** *(run order
    **1** — the first thing that happens to a tour)*. ⚙ **NESTING IS
    ONLY A DEFECT WHEN the containing box is MID-TOUR *and* the contained stop's subject is
    one the container's own body never claims** (ruled 2026-08-25 by the first box-repair
    batch, which declined most nesting flags as legitimate). Two legitimate shapes: every
    detail stop sitting inside a wide OPENER, and region-to-detail zoom where the container
    names the thing the next stop magnifies. No two stops sharing a box; no box whose title names something outside
    its own frame; no box clipping its named subject; no box outside [0, 1.002].
    ⚙ **And no box drawn tight to its subject** — see *Boxes are drawn with breathing room*
    (2026-08-25): a box CONTAINS its subject with air around it. Note the two rules meet here —
    *no box clipping its named subject* is the failure padding was introduced to repair (the Heiss
    stop 1 head-crop), so a clipping flag and a tightness flag are the same finding twice.
    ⚙ Add one
    judgement check the arithmetic misses: **does the crop's dominant content support or
    contradict the body's premise?** Three calibration boxes were correctly placed and still
    wrong — wide establishing crops whose dominant content refuted their own stop's premise
    of emptiness.
12. ⚙ **FOLDED INTO STEP 10 (run order 4) on 2026-08-25 — kept in place so the reference
    resolves.** ~~**Paragraph scope.** For each stop, confirm its specific instance does not
    already appear in `craft` or `see`. If it does, the paragraph spends it — cut it from the
    paragraph, not from the stop.~~ The rule is unchanged and is **not** retired; only its
    position moved. It was a second free, image-less read of exactly the material step 10 already
    has open, and splitting it across two numbers is why it kept being run last — after the crops
    had been adjudicated, which is precisely too late. **Run it inside step 10.**

**D2. Per tour — no research note may ship as prose (2026-08-25)** *(run order **7**)*
12b. Grep the entry for `Fuad`, `sighting`, `unfixed`, `treat the`, `almost certainly`,
    `cannot be confirmed`, `unverified`, `TBC`. A Matisse `context` shipped with *"Fuad's
    sighting was almost certainly of it on loan… so treat the encounter as real but the venue
    as unfixed"* — it names the owner, admits an unresolved lookup and breaks the register
    every other tour holds. Unresolved questions belong in `flags` (stripped at merge), never
    in the reader's text. Where `seenConfidence` is not `sure`, state the institutional fact
    and stop. A corpus grep found this one isolated; re-run it after any batch.

**D3. Per tour — the `beside` (2026-08-25)** *(run order **21–24**)*
Its claims are fact-class and every one of them is about a DIFFERENT painting, so none of
groups A–C touches it. Run these ~~five~~ **four** in order (12g folded into step 5 — see the
run-order map); 12c and 12d are cheap and refuse the whole
paragraph before anyone argues about its prose.

⚙ **12c AND 12d RUN ONCE PER COMPANION, NOT ONCE PER PARAGRAPH** (2026-08-25, when more than one
companion was permitted — see *More than one companion is permitted*). Where these two steps say
"the companion", read "each companion". The verification bar does not soften for the second one;
that softening is exactly what the Heiss second pointer was.

12c. **The companion must resolve to a real canon id.** Look the named work up in
    `art_data.js` / `artworks.js` and write the id down. A plausible id typed from a title is
    a live failure mode in this project, not a hypothetical — the precedent is the
    hand-substituted qid that resolved to an unrelated photograph (*A qid typed from memory is
    a wrong-artwork risk*, below), and a `beside` is the easiest place in the store to commit
    it, because the writer is naming a work they are not looking at. **No id, no paragraph.**
    ⚙ All six shipped specimens point at works that are themselves TOURED, not merely in
    canon — hold that as the bar, because it is what makes 12d cheap. ⚙ **The id you write
    down here is not scratch work — it becomes the `beside`'s `refs` entry** (step 12h), so
    the paragraph and the id are checkable against each other from then on. Until refs
    shipped (2026-08-25) nothing in the app looked at the name at all and this step was the
    only check there was; `validate-refs.js` now re-checks the id at merge, but only for a
    `beside` that carries a ref — a paragraph with no ref is still unguarded.
12d. **Every date, museum and interval about the companion is verified, never inferred.**
    Read the companion's OWN entry first — **the store is the first verifier** (that caught
    "full length" on the seated Bacon portrait before apply); then its canon row for the
    museum; then the web, which caught "both now hang in the same museum" when Szał hangs in
    the Sukiennice. ⚙ The interval is arithmetic, not recall — the delta of the two canon
    `year` fields, checkable in seconds. All six specimens are exact: 1891→1897 = six,
    1828→1894 = sixty-six, 1869→1892 = twenty-three, 1872→1917 = forty-five, 1888→1883 =
    five *before*, 1867→1867 = the same summer.
12e. **The reversal must be STATED, not implied.** Point at the clause that says it. A
    paragraph that describes two paintings and leaves the reader to notice the rhyme has not
    done the job. Then the refusal test: **strike out "same artist" and "was influenced by"
    and see what is left.** If nothing is left there is no rhyme — omit the field per the rule
    above rather than dressing a shared surname up as a relation.
12f. **Recap test and scripting test** — the two shapes Fuad rejected on 2026-08-22, which a
    weak `beside` decays back into. (a) Grep its nouns against the four paragraphs and the
    stops: if the material is already in the tour, it is a synthesis coda. (b) Any sentence
    about what the viewer feels, takes away or should notice is the afterimage shape and comes
    out. Then deletability both ways: cut the `beside` and the tour loses nothing; cut the
    tour and the `beside` still stands.
12g. ⚙ **FOLDED INTO STEP 5 (run order 12) on 2026-08-25 — kept in place so the reference
    resolves.** ~~**The existing greps apply to `beside` too** — step 4 (finish claims), step 5
    (absolute negatives and superlatives: `the only`, `hangs twice`, `the whole picture`, `the
    entire picture`) and step 7 (hedges), plus 12b's research-note grep.~~ It was a POINTER, not
    an operation — a numbered step whose entire content was *"three other steps also apply here"*,
    which is how the `beside` ended up outside the scope statement of the steps that govern it.
    The field name now sits in **step 5's own scope**, and steps 4, 7 and 12b likewise run over
    `beside` by their own terms. ⚠ **Do not confuse this 12g with the ⛔ *A `beside` NEVER COUNTS
    THE COLLECTION* rule below**, which is also called 12g throughout this file and is a live,
    unfolded prohibition.

⛔ **AND ONE RULE OF ITS OWN — A `beside` NEVER COUNTS THE COLLECTION.** Fuad, 2026-08-25:
*"let's avoid naming exact amount in the besides part, as the collection may grow."* This
**supersedes** the earlier form of this step, which allowed a count so long as it named which set
it counted. Qualifying does not save it. The rule is simply **don't count**. Prohibited outright
in a `beside`:

- **counts of holdings** — "hangs twice in this collection", "one of three Zorns here", "the six
  Monets on this wall";
- **rankings, superlatives and absolutes over holdings** — "the only night scene in the
  collection", "the earliest work here", "the largest canvas we hold". **These decay the same way
  and for the same reason**: *the only X* breaks the moment an X is added. They fall under this
  rule, not merely under step 5;
- **implied counts** — "his *other* portrait here", "*both* of his works here", "the *pair* of
  them in this collection". An implied count expires exactly like a stated one.

**Why qualifying is not enough.** The shipped Heiss `beside` opens *"Zorn hangs twice in this
collection."* That one clause has now been measured three times and answered differently: an early
pass recorded 10 Zorns in canon and 6 seen; a later measurement against `artworks.js` found 13
rows under `artistId:"zorn"`, 7 `seenConfidence:"sure"`, 3 toured; the re-measurement of
2026-08-25 confirms **13 / 7 / 3** (the toured three: heiss, `midsummer-dance`, the Bacon
portrait). So "twice" is wrong on the canon reading, wrong on the seen reading and wrong on the
toured reading — and the figure MOVED between two audits weeks apart with nothing done wrong in
between, because works kept being added. **A count is a fact with an expiry date, and these
paragraphs are meant to last.**

**The replacement move: POINT, don't count.** Five of the six shipped specimens already do it and
they are the model — *"has a descendant in this collection"*, *"The far end of this bargain hangs
at the Musée Marmottan Monet"*, *"Five years before this, the pairing in this foreground water had
a whole canvas to itself"*, *"Monet painted its companion from sea level"* — as does the seventh,
approved 2026-08-25: *"The version he made outdoors is in this collection too."* Durable:
**"also in this collection"**, **"elsewhere in this collection"**, **"hangs elsewhere here"**,
**"its companion is here too"**, plus the plain naming of the companion and its museum, which
parts 2–4 of the form already require. Not durable: *twice*, *the only*, *one of three*, *his
other*. The membership is the premise of the paragraph; the arithmetic never was. (One piece of
arithmetic stays: 12d's **interval**, the delta of two canon `year` fields. That is a fact about
two objects and does not move when the collection grows.)

**Scope.** This governs counts of the COLLECTION, not counts inside a painting — *"the same pair
of cypresses on the right"* counts objects on two canvases, cannot expire, and stays governed by
step 6. ⚙ **Recommended extension, adopt unless Fuad rules otherwise: the same prohibition should
cover `context` and the `art-about` / `museum_about` reads.** Those are the other
outward-pointing paragraphs — the only other places in the corpus that can count holdings at all —
the decay argument is word for word identical there, and a rule that stops at one field only
invites the same sentence to be written one field over. `see`, `about` and `craft` stay inside
the frame by Law 2, so they cannot commit this error.

Grep, mechanically: `hangs twice`, `the only`, `one of (two|three|four|\d)`, `\bboth\b` near
*in this collection*, `\bother\b` near *here|in this collection*, `\d+ works`. The worked example
is the shipped Heiss `beside` — recorded in full under *Open items* below with its redraft,
because it is still unfixed.

**D4. Per tour — the cross-references (2026-08-25)** *(run order **25** — ⚙ **SCRIPTABLE**, and
it already has its script: `validate-refs.js`. It is the model the other three scripted steps
should follow.)*
12h. **Every in-collection work the prose names carries a `refs` entry, and every `refs` entry
    is verified three ways.** Run it on `context`, on every `deeper[].body`, and on the
    `beside` — the `beside` names one by definition, so **a `beside` without a ref is
    incomplete**, the same class of unfinished as a tour without a `beside`.
    (a) **The id is READ FROM THE STORE, never typed from a title.** Look it up in
    `artworks.js` and copy it. This is the failure this step exists for: the plausible id
    `teodor-axentowicz-kolomyjka` was written for a work whose real id is
    `teodor-axentowicz-ko-omyjka`, and the same class already cost this project a
    hand-substituted qid that resolved to an unrelated photograph.
    (b) **The link text occurs in the paragraph EXACTLY ONCE.** Zero occurrences and two
    occurrences both fail — with two there is no honest way to choose one, so the renderer
    refuses rather than guesses. Worked example in the data: the Kasprzycki `beside` says
    *Szał uniesień* once and a bare *Szał* later, so the full form is the only valid ref text.
    (c) **The ref points at the work actually being discussed** — the one the sentence is
    about, not merely a work whose title the words happen to match.
    Then run `node .dtmp/tourqc-pass/validate-refs.js` (optionally with the batch's plan file
    as an argument, which checks it BEFORE it is applied). It exits non-zero on BAD ID /
    NOT FOUND / AMBIGUOUS / SELF / SHAPE, and **it gates the batch**: a merge does not proceed
    over a failure.

**E. When repairing an existing tour** *(run order **26**)*
13. Fix the flagged error, then **re-read the entire entry end to end** and re-run A–D on it.
    A repair that corrects one sentence and leaves its propagation elsewhere is a defect that
    now reads as deliberate. Precedents: a bird fixed while the same tour's garment,
    expression and signature box stayed wrong; a stop and its box corrected while the
    identical error stood in `see`.
    ⚙ **THIS IS NOT OPTIONAL AND IT KEEPS PAYING (measured 2026-08-25, wave 4).** The mandatory
    whole-entry re-audit found **5 box errors the audit that triggered the repair had missed** —
    including a stop titled *"The fur collar in the dark"* whose box held **no collar**. The
    re-audit is not a formality on top of a repair; on that wave it was a better detector than
    the audit.

### Drafting-time box verification (MANDATORY, 2026-08-25)

Boxes were being drawn from the prose rather than checked against it — ~25 wrong across the
20 wave-2 tours, and Seurat's *Bathers* boxes appear mechanically ROTATED among each other
(stop 6's box holds stop 5's subject, stop 2's holds stop 6's). Crop-checking is therefore no
longer only a QC step: **the drafter states, per stop, that it has looked at that region**,
and the merge is refused if a body describes an object its own box excludes. Two cheap
structural checks worth running mechanically before merge: no two stops sharing a box (found
duplicated in Rembrandt's *Simeon*, where stops 2 and 3 are the same crop), and no box
clipping the subject its title names.

### Boxes are drawn with breathing room, not tight to the subject (Fuad, 2026-08-25)

**Fuad, on the Zorn:** *"the zoomed stop can also use a bit of padding, ie. just me zoomed out a
bit more by about 15%… considering the resolution, the stops would be clearer if they were a bit
zoomed out."*

**The rule: a box CONTAINS its subject with air around it. It does not frame the subject.** A box
cropped to the edges of the thing it names is wrong even when it is accurate — and "accurate but
unreadable" is the exact failure Fuad reported.

**Why, and it is a resolution argument, not a taste one.** The viewer fits the box to the pane
(`flyToAnchor` → `viewport.fitBounds`), so the reader's sharpness is
`pixels-in-crop ÷ pane-pixels`. The pane is `.cv-study-viewer`, 57% of the viewport by full
height — about **2188 × 2160 device pixels** on a 1920×1080 screen at DPR 2. Against that, the
plate ceilings are low (checklist 7e: per work, and for the `.tif`-backed works only 1920).
**A tight box is therefore always shown upscaled**, and the tighter it is the mushier it gets.
Padding adds no pixels — it lowers the upscale, and it gives the mush a context the eye can
resolve it against.

Measured on `anders-zorn-mrs-veronica-heiss`, the tour Fuad was looking at (plate served at
**1920 × 2566**, not the 3478 × 4649 the store declares — see 7e's TIFF trap): stop 1 *"The one
lit point"* crops 576 × 642 real pixels into that pane, an upscale of **3.36×**; stop 6 *"Zorn
1891"* crops 538 × 308, an upscale of **4.07×**. Both are soft on arrival. And stop 1's box, at
its shipped coordinates, **cut the top of the sitter's head off and put her chin on the bottom
edge** — already a violation of step 11's *no box clipping its named subject*. Padding it 15%
linear contains the head with air to spare. **The padding rule repairs an existing defect class;
it is not only a comfort change.**

**The figure: 15% LINEAR — `w × 1.15` and `h × 1.15`, about the box's own centre.** Linear is the
natural reading of "zoomed out 15%" and it is what the viewer's zoom control does; it grows AREA
by 32%, which is why the coverage guard had to move with it (**1.0 → 1.14**). 25% was rendered and
rejected: on `heiss` stop 3 *"The fur as a black mass"* it pulls the sitter's jaw into frame — a
second and more prominent object under a title that names fur — and on stop 2 *"The bird in the
black"* everything it adds is empty background, so the bird just gets smaller. **15% is the
ceiling, not the starting point.**

**It tapers with box size, because large boxes gain nothing and lose the zoom.** With
`m = max(w, h)`:
- `m ≤ 0.40` — a DETAIL. Full 15%. This is where the mush is and where the padding does its work.
- `0.40 < m < 0.80` — linear ramp down.
- `m ≥ 0.80` — a REGION. **No padding at all.** Padding an 0.8-wide box toward 0.92 costs the
  reader the zoom, which is the whole point of the stop, and buys no sharpness — a box that big
  is at or past native scale on any decent plate.

**A full-frame closing box is untouched by construction, not by a special case. So is the wide
opener.** Nothing the coverage guard's full-frame exemption depends on can move — measured: zero
boxes newly reach `w ≥ 0.95 ∧ h ≥ 0.95`, and zero tours change exemption status.

**A box on an edge keeps its full padded SIZE and shifts inward** rather than being clipped. This
provably still contains the original (if `x < d` the clamped box is `[0, w+2d]` and
`x + w ≤ w + 2d`), so the subject is never left behind; it only moves off centre.

⛔ **PADDING DOES NOT RESCUE A BOX THAT IS TOO SMALL FOR ITS PLATE, AND MUST NOT BE USED TO TRY.**
The justification above is **framing and context, plus a modest sharpness gain — it is NOT a fix
for plate-limited crops**, and the two must not be conflated, because the boxes that most look
like they need help are exactly the ones this cannot help. The pixel-extent rule (checklist 7e,
now per work) is unaffected and still binds. Type specimen:
`edouard-manet-young-lady-in-1866` stop 9 *"Shoe-toe beneath the hem"*, `w 0.10 h 0.06`, crops
**261 × 228 px** into a 2188 px pane — an upscale of **8.4×**. 15% takes that to 7.3×. **It is
still a smudge.** At the small end the answer is a bigger plate or a different stop, never more
padding. The seven smallest boxes in the corpus are all in this class, and
`salvador-dali-the-great-masturbator` owns five of them.

#### Box padding — APPLIED 2026-08-25 (this ages; re-measure, don't cite)

Every stop box in the store was padded outward on Fuad's instruction. Transform, applier and full
before/after table: `.dtmp/tourqc-pass/w11/` (`pad.js`, `apply-pad.js`, `table_applied.tsv`,
`pre_pad_snapshot.json`).

- Parameters: `P = 0.15, M0 = 0.40, M1 = 0.80, CAP = 0.96`, coordinates at 4 dp.
- **2,174 of 2,461 boxed stops changed, across 374 of 375 tours.** 287 boxes untouched (138 at or
  above the taper's ceiling on both axes, 149 tapered to zero). 4 stops carry no box and were
  skipped.
- Descent coverage **0.6926 → 0.8498**; tours over 1.0 **71 → 118**; **guard moved to 1.14**,
  which holds the firing set at the same 71 tours. *(All four figures re-verified against the live
  store 2026-08-25: median 0.8498, over-1.0 = 118, over-1.14 = 71, full-frame closers 109.)*
- Full-frame / exemption churn: **zero**.
- **New neighbour collisions: 33 pairs cross a threshold that did not before** — 9 cross IoU 0.5,
  1 crosses IoU 0.7, **0 cross IoU 0.9**, 25 cross containment 0.9. Against a baseline of 7,147
  within-tour pairs, of which **1,048 already sat at containment ≥ 0.9**.
  ⚙ **Most of the 25 are the shape step 11 already rules LEGITIMATE** — a detail stop sitting
  inside a wide opener (`the-kitchen-maid` #0+#6, `the-hermitage-at-pontoise` #0+#1,
  `study-for-le-bec-du-hoc-grandcamp` #0+#3, `white-and-yellow-chrysanthemums…` #0+#2 all have the
  opener as the container). The ones worth a look are the **mid-tour-to-mid-tour** pairs, where
  step 11's defect condition can actually be met:
  **`peter-paul-rubens-self-portrait` #3 + #4** (*The living beard* / *Lace and the glint of gold*,
  IoU .533 → .570 — the largest, and it was already over 0.5 before the padding),
  `ophelia` #1 + #5, `the-kitchen-maid` #1 + #4, `j-m-w-turner-the-parting-of-hero-and-leander`
  #1 + #2, `vincent-van-gogh-roses` #1 + #5, `henri-matisse-auguste-pellerin-ii` #0 + #2.
  Full list with geometry: `w11/collisions_J.json`.
- **Title spot-check: 12 stops across 12 works, rendered before/after and looked at. No case found
  where padding imported a second, more prominent object** under a title naming the first. That
  was the failure mode 25% produced and 15% does not.
- The transform is **reversible and was proved so**: apply → revert reproduced the file byte for
  byte, and the revert was executed against the real file and left an empty `git diff`.

### Closing-paragraph experiments (2026-08-22 — settled, do not re-pilot)

Two candidate "extra paragraph after the last stop" shapes were piloted on five marquee tours
and REJECTED by Fuad:
- **Synthesis coda** ("what it adds up to") — "doesn't add really to anything"; complete tours
  leave it nothing un-said, and it drifts into recap, the outlawed padding class.
- **Afterimage** ("what stays with you") — "creates assumptions of what impression to take from
  each painting; it shouldn't be suggestive like this." Same boundary as the earlier ruling
  against synthesizing "what stopped you": the viewer's interior is not ours to script.

**SETTLED 2026-08-24 — REGISTER APPROVED, GATED ON DENSITY. ⚙ THE GATE WAS LIFTED
2026-08-25 — see *The `beside`* below; this paragraph is kept for the history, which is the
reason the form rules are strict.** Fuad confirmed the slot
(an ending PARAGRAPH after the last stop, distinct from the re-ascent stop: "the thing I
rejected just didn't seem right content-wise") and approved the content register on two
specimens: the paragraph points **OUTWARD** — where the work sits on his own wall; the same
artist solving a different problem elsewhere in the collection, a different artist solving
the same problem, the thread through the rooms. It cannot recap (its material isn't in the
tour) and cannot script the viewer (its claims are relations between paintings, fact-class,
normal fact QC). Field name `beside`; named works link; deletability both ways (tour loses
nothing without it, it loses nothing without the tour). **His ruling: "for the last paragraph
we'll need lots more tours written first — without the last paragraph I'm afraid."** ~~So:
tours ship WITHOUT `beside` for now; the register below is the model for when the store is
dense enough.~~ **SUPERSEDED 2026-08-25 — the deferral is reversed, the field is required.**
Do not re-pilot the rejected shapes.
**EXCEPTION, Fuad same day: "approved those two, though" — the two specimens SHIP** on
heiss + wystawa-1828 (applied to art_inspect.js as the field's pilot pair). Fact-QC on the
drafts caught two errors before apply, both instructive for future `beside` writing:
"full length" for the seated Bacon portrait (checked against that work's OWN tour — the
store is the first verifier), and "both now hang in the same museum" (Szał hangs in the
Sukiennice in Kraków, only arriving there in 1901 via Jasieński; web-verified). The same
check found the szal tour's own context misplacing the 1894 Zachęta scandal in Kraków —
logged in QC_LEDGER as an open defect.

Approved register models (as shipped):

⚠ **The Heiss specimen carried two things that are now prohibited** — the opening COUNT (12g,
ruled 2026-08-25) and the second pointer at the end (*one pointer, not two*) — and was **repaired
in place on 2026-08-25**, minimally: `twice` → `elsewhere`, the sea-studies pointer cut, and the
companion's museum named. The full redraft that had been prepared was **rejected by Fuad** (*"was
good before"*); he took the minimal fix instead (*"Yup, do it for Zorn"*). The text below is the
repaired paragraph as shipped — see *Open items* for the three changes and what they cost.

> *Heiss:* Zorn hangs elsewhere in this collection, and the two portraits are the same
> wager placed at opposite stakes. Six years after this, Mrs. Walter Rathbone Bacon, now
> at the Metropolitan Museum, took the handful-of-strokes manner to the American market
> at showpiece scale — a seated grandee on a very tall canvas, her collie against her
> side, a likeness as public performance where this one stays close, a picture the sitter
> kept in the family for thirty-six years. There the wager is placed in public, at full
> scale; here it is placed close and small — and the strokes are exactly as few.

> *Wystawa 1828:* The room this picture documents has a descendant in this collection.
> Sixty-six years after these tailcoats filed past the flower pieces, Warsaw's art
> public — the very institution this canvas shows being born in a borrowed university
> hall — mobbed a single painting at the Zachęta: Podkowiński's Szał uniesień, which its
> own maker attacked with a knife thirty-six days into the show. The two works bracket
> the same story from either end: here, looking at pictures is still a decorous novelty
> being learned; there, it has become a public passion strong enough to destroy what it
> looks at. This canvas stayed in Warsaw; Szał, restored, hangs in the Sukiennice in
> Kraków.

### The `beside` — the closing movement (REQUIRED, ruled 2026-08-25)

**Fuad, lifting the density gate:** *"The beside needs to be part of the methodology, even if
we don't have enough works yet I think. We can rework them in the future anyway."*

**Every new tour ships with a `beside`.** A tour without one is incomplete, not finished
differently. There is exactly one legitimate absence and it is a recorded decision, not a
default — the rule is at the bottom of this section.

The form below is **derived from the six shipped specimens, not proposed**. They are the only
approved text in existence, and a loose brief is what produced the first rejection ("the thing
I rejected just didn't seem right content-wise"), so the form is strict and the exceptions are
named. The six: `anders-zorn-mrs-veronica-heiss`,
`wincenty-kasprzycki-wystawa-sztuk-pieknych-w-warszawie-w-182`, `garden-at-sainte-adresse`,
`arnold-bocklin-the-island-of-life`, `la-grenouillere-renoir`, `regates-a-argenteuil`. Read
all six before drafting one — and the seventh, below.

⚙ **A SEVENTH APPROVED SPECIMEN, 2026-08-25** — Fuad: *"besides on cypresses is good"*. It belongs
to `vincent-van-gogh-korenveld-met-cipressen` and points at
`vincent-van-gogh-wheat-field-with-cypresses` (Metropolitan Museum, toured, both 1889). It was
prepared with its `refs` entry at `.dtmp/tourqc-pass/beside-approved-2026-08-25.json` while
another pass held `art_inspect.js`. ⚙ ~~**not yet applied**~~ — **APPLIED, confirmed against the
live store 2026-08-25**: the entry carries its `beside` and its ref, and the corpus is at **seven**
`beside` paragraphs, not six. Three things it models: the pointer
states membership WITHOUT counting (*"is in this collection too"* — 12g); the interval may be
**zero and still be the whole point** (the outdoor version and the September studio repetition of
one motif in one year); and the reversal is the default `here … ; there …` close turned on
opposite VANTAGE rather than stakes or scale.

> *Korenveld met cipressen:* The version he made outdoors is in this collection too. Wheat Field
> with Cypresses hangs at the Metropolitan Museum — the same pair of cypresses on the right, the
> same olive scrub, the same high crest of wheat, on a canvas all but the same size — painted in
> the field in early summer 1889 and counted by him among the best work of that season. This one
> is the September repetition, worked up in the studio from a drawing. There the field was in
> front of him; here it was not, and every curl of that sky is a decision taken a second time.

**THE PREMISE — IT POINTS AT ANOTHER WORK THAT IS IN THIS COLLECTION.** That is the whole
thing: *"The version he made outdoors is in this collection too"*, *"has a descendant in this
collection"*, *"The far end of this bargain hangs at the Musée Marmottan Monet"*. ⚙ **The pointer
NAMES the companion; it never COUNTS the collection** — the shipped Heiss opener *"Zorn hangs
twice in this collection"* was the model here until 2026-08-25 and is now prohibited by 12g. It is **not** a legacy paragraph,
an influence paragraph or an afterlife paragraph — those name works we do not hold, and they
were never the approved register. ⚙ In all six, the companion is itself a **toured** work, not
merely a canon row; keep that as the bar (it is what makes the companion's own entry the first
verifier). ⚙ But only two of six say "in this collection" out loud — the other four just name
the work and its museum, which is enough. The membership is a REQUIREMENT, not a phrase.

**THE FOUR PARTS, in this order:**

1. **The pointer — one sentence, first.** All six open by stating the relation before any
   detail: *"Monet painted its companion from sea level"*, *"Five years before this, the
   pairing in this foreground water had a whole canvas to itself"*, *"The room this picture
   documents has a descendant in this collection."* The reader learns what kind of paragraph
   this is in one line.
2. **The companion, named — title, museum, interval.** Title in all six. Museum in five;
   ⚙ **Heiss names none** (the Bacon portrait is at the Met) — a gap, not a licence: name it.
   The interval runs in either direction and may be zero — *"Twenty-three years after this"*,
   *"Six years after this"*, *"Forty-five years on"*, *"Five years before this"*, and
   ⚙ *"comes out of the same summer of 1867"* for a companion painted the same year. It is
   the delta of the two canon `year` fields (checklist 12d), so it is arithmetic, not memory.
3. **The structural rhyme.** The same device, or the same bargain, seen twice: the same wager,
   the same dissolving contour, the same reflection with and without its referent, the same
   encounter. The middle of the paragraph is spent describing the COMPANION concretely enough
   that the rhyme is visible — this is the part that carries the facts, and every one of them
   is checkable. ⚙ **And "concretely enough that the rhyme is visible" is the WHOLE standard, not
   "concretely enough to picture"** (2026-08-25): describe the companion through what the plate
   answers, then stop — *Why a `beside` runs long* below. ⚙ **A second companion, where there is
   one, lives here too** — same verification, and only where it makes the reversal two-sided.
4. **The reversal, stated flatly, last.** Opposite stakes, opposite scale, or opposite
   vantage. Usually a `here … ; there …` construction. **The model:**

   > *(la-grenouillere-renoir)* Here the readable thing is a commercial notice on a café
   > flank, off to one side; there it is what the painting is for.

   Four of six close this way (Renoir, Böcklin, Zorn, and Regates across two sentences).
   ⚙ Two do not, and the divergence is instructive rather than licensing: **Wystawa 1828**
   states the reversal one sentence early and closes on a fate coda (*"This canvas stayed in
   Warsaw; Szał, restored, hangs in the Sukiennice in Kraków"*), which works because the coda
   is still a fact about the two objects; **garden-at-sainte-adresse** never uses here/there
   at all and closes on a bare statement of the difference (*"The same water, painted from the
   beach rather than the wall above it, with the crowd turned toward it"*) — it is the
   loosest of the six and the one whose reversal is opposite VANTAGE rather than stakes or
   scale. Default to the `here … ; there …` close; departing from it needs the reversal
   stated somewhere else, unmissably.

**Band: 90–120 words, margin soft** — same treatment as every other band in this spec. The six
measure 92–116 words in 3–4 sentences. Overrun is judged, not gated; cut scaffolding, never
a verified detail.
⚙ **Referent check, 2026-08-25: "same treatment as every other band in this spec" now points at
THE GOVERNING TEST** (*every sentence in a lens must earn its place; length is an outcome, never a
target, in either direction*), which replaced the *"a floor and a ceiling, never a target to
fill"* note this sentence was written against. The sentence is still true — **its referent moved,
and the new one also refuses the reverse**, so a `beside` may not be argued UP toward 120 any more
than it may be trimmed toward 90. A `beside` over ~115 words is where checklist **10e** asks what
the extra room is carrying.

### ⚙ WHY A `beside` RUNS LONG, AND THE TWO LEVERS — 2026-08-25

Fuad, on wave 1: *"if comparing against an artwork - this gets a bit wordy and so more difficult to
image."* The twelve measured **106–120 words** — all inside the band, eleven of them in its top
quarter.

⛔ **THE CAUSE IS STRUCTURAL, AND IT IS THE REASON FOR EVERYTHING BELOW: A `beside` DESCRIBES A
PAINTING THE READER CANNOT SEE.** Every other paragraph in a tour is read with its plate in view,
and a stop even flies the viewer to the region under discussion; **this one builds a picture from
nothing.** That is why a stop does its job in ~120 words *with the image present* and a `beside`
reaches for the same figure without one. **The description is load-bearing and it is also the
cost.** So the answer is not to describe less — it is to spend the description differently.

⛔ **NO NEW LOWER BAND, AND NOTHING HERE MAY BE RUN AS A TRIM.** The band stays **90–120**. The
governing test at the top of this file is justification, not length, in either direction; this file
has already been corrected once for drifting toward a length rule, and *"the content needs to be
justified"* has been ruled twice in one day. **What changes is what the words are spent on.**

**LEVER 1 — LEAN ON THE REVERSAL, NOT ON THE DESCRIPTION.** ⭐ **The model is
`regates-a-argenteuil`** — the shortest of the seven at **92 words**, and the hardest landing. Its
entire account of the companion is built out of what the plate HAS and the companion has not:

> In Water-Lilies, Reflection of a Weeping Willow, painted at Giverny around 1917, the tree is out
> of frame altogether: no bank, no sky, no horizon, only the willow arriving already upside down as
> a vertical rain of blue and violet, with a few lily pads left at the margin to say it is water at
> all. Here the reflection still has something above the line to answer to. Forty-five years on it
> has nothing, and it is the whole picture.

**Not one descriptive word there is inventory.** Every item is present because the plate answers
it, so the description and the reversal are the same sentences — and the close lands on a
difference the reader has already been handed. A middle that catalogues a companion feature by
feature costs more, images worse, **and leaves the reversal to be asserted at the end from
scratch.** ⚠ Distinguish this from the spec's other named model: `la-grenouillere-renoir` is the
model for the reversal CLAUSE (*"Here the readable thing is a commercial notice on a café flank,
off to one side; there it is what the painting is for"*) and stays so. This is the model for the
paragraph's MIDDLE.

**LEVER 2 — THE `refs` LINK IS ALREADY DOING WORK THE PROSE IS DUPLICATING.** Since 2026-08-25 the
companion's title is a live link to its Reader entry: the other painting is **one click away**. So
**a `beside` does not need to make the reader SEE the companion — only to make them WANT TO LOOK.**
That is a genuinely different writing target, and it is stated here because it changes a drafting
decision: describe enough that the rhyme is visible and the reversal lands, then let the link carry
the rest. **A paragraph written as though it were the reader's only access to the companion will
always run to the top of the band.**

**It carries a `refs` entry.** The companion is named, it is in this collection, and its id was
already written down at checklist 12c — so it links. **A `beside` without a ref is incomplete.**
See *Corpus cross-references* below for the field's rules; step 12h is where it is checked.

### ⚙ MORE THAN ONE COMPANION IS PERMITTED — RELAXED 2026-08-25 (Fuad), AND THE OLD RULE WAS NOT WRONG

~~**One pointer, not two.** … **One named companion per `beside`.**~~ Fuad, on reading wave 1:
*"make them tighter or allow inclusion of multiple paintings even at that paragraph."* Both ways
out are open; this is the second one, and the first is the section above.

⚠ **READ THE STRUCK RULE'S HISTORY BEFORE USING THE LATITUDE, BECAUSE IT IS THE GUARD — this is a
relaxation, not the overturning of a considered judgement.** *One pointer, not two* was written off
ONE failure, and **the failure was not that there were two pointers.** The shipped Heiss `beside`
adds a vaguer second pointer after its reversal (*"a whole genre elsewhere on this wall: in his sea
studies…"*), pointing at `anders-zorn-b-lgeskvulp` and `anders-zorn-marin-studie-fran-atlanten` —
both `wish: true`, **neither seen nor toured**. **The defect was that the second pointer was
FALSE**: it gestured at works that are not there in the sense the sentence implies. (It also
contradicted its own opening count, which is 12g's business, not this rule's.) That sentence is
still not a model and was cut in the minimal repair; do not copy it.

**THE RULE AS IT NOW STANDS.**

- ⛔ **EVERY COMPANION NAMED IS VERIFIED TO THE SAME STANDARD AS THE FIRST.** Steps **21–22
  (12c–12d) run once PER COMPANION, not once per paragraph**: the id **read from the store, never
  typed from a title**; the museum from its canon row; the interval as the delta of two canon
  `year` fields; and **preferably toured, because then its own entry is the first verifier**. A
  second companion that cannot clear 12c and 12d is not a lighter kind of companion — it is the
  Heiss defect exactly.
- ⛔ **A SECOND COMPANION EARNS ITS PLACE BY SHARPENING THE REVERSAL, NEVER BY ADDING A SECOND
  EXAMPLE OF THE SAME POINT.** The test is the one 12e already applies to the whole field: **if
  the paragraph argues the same thing without it, it is padding.** Three works that make one point
  are one companion and two decorations. Three works that make the point two-sided — a route the
  plate had to get past, a bracket the plate sits inside, one term appearing in three different
  roles — are a paragraph the single-companion form could not have written.
- **It never becomes a survey.** Two is a latitude, not a target, and **one companion remains the
  normal case** — the specimens that name one are not thereby weaker. No third slot is promised
  here.
- **The no-count rule is untouched and bites harder, not less.** 12g prohibits *both*, *the pair of
  them*, *his other work here* — and a two-companion `beside` is precisely where those words want
  to appear. **Name the companions in sequence; never total them.**
- **Each companion carries its own `refs` entry** (12h), each `ref.text` occurring in the paragraph
  exactly once.

⚠ **THE COMPOUNDING COST, and it is the real reason the latitude is narrow.** A second companion
doubles the verification, doubles the picture the reader must build with no plate in front of them,
and spends the same 90–120 words. **If two companions cannot both be handled inside the band, that
is the signal that the second is not earning its place** — not a signal that the band should give
way. Cut the second companion before cutting the reversal.

**⛔ WHEN THERE IS NO REAL RHYME, OMIT THE FIELD AND RECORD WHY.** A forced `beside` is worse
than none — that is precisely what got rejected on content grounds. If no work in the
collection supports a REAL rhyme, leave the field out and log the reason in the batch notes
(and in `flags` at draft time). **The failure mode to refuse by name is "same artist and
nothing else."** Two canvases sharing a surname is not a rhyme; neither is a general influence
claim, a shared century, a shared genre, or "both are landscapes". The test is checklist 12e:
strike out *same artist* and *was influenced by*, and see whether anything is left.
**An omission is a decision, not an absence** — it is recorded, and it is revisited. The
omissions should shrink as the store grows, which is Fuad's *"we can rework them in the future
anyway."*

#### Coverage — snapshot as at 2026-08-25 (this ages; re-measure, don't cite)

A feasibility scan of the store, run the day the gate lifted:

- ~~**6 of 375 tours carry a `beside`** (the pilot pair plus four).~~ ⚙ **STALE — corrected
  2026-08-25: it is 7, and the seventh is APPLIED.** Verified against the live store, not
  inferred. The seventh is `vincent-van-gogh-korenveld-met-cipressen` — the specimen the section
  above described as *"prepared… not yet applied"*, which it now is, with its `refs` entry. Read
  all **seven** before drafting one. ⚠ Two notes in this file recorded the same fact at two
  different moments and only one of them was updated; that is what a "this ages, re-measure"
  header is for, and it is why the count is now given with the method: `Object.values(CANVAS_INSPECT).filter(e => e.beside).length`.
- Of the remaining 369: **~150 could carry a strong one today**; **~90 more are workable with
  effort**; realistic ceiling **240–280**. The residue is not a drafting problem, it is a
  corpus problem.
- **13 works are genuinely companionless** — no same-artist read anywhere in the canon, and no
  cross-artist toured work sharing ≥5 subject terms: `henry-fuseli-thor-battering-the-midgard-serpent`,
  `maximilien-luce-morning-interior`, `bruno-liljefors-eider-ducks`, `teodor-axentowicz-ko-omyjka`,
  `jozef-pankiewicz-dorozka-w-deszczu`, `unknown-s-once-majowe`, `jules-adler-la-soupe-des-pauvres`,
  `wilhelm-trubner-ave-caesar-morituri-te-salutant`, `harada-naojiro-guanyin-riding-the-dragon`,
  `herbert-james-draper-the-lament-for-icarus`, `julian-fa-at-powrot-z-polowania-na-niedzwiedzia`,
  `salvador-dali-the-great-masturbator`, `stanhope-forbes-the-munitions-girls`. These are the
  legitimate omissions; do not force them.
- **30 tours are by an artist with only that one work in the whole canon**; **72 are the only
  toured work by their artist** — the second number is the one that moves, and it moves by
  touring more works, not by writing harder.
- The scan's proxy was validated against the shipped six: it recovers five as same-artist
  matches and the sixth (Kasprzycki → Podkowiński) as a cross-artist match, **with no false
  negatives**. Treat its candidate lists as sound and its ceiling as a floor.

## Corpus cross-references — the `refs` field (shipped 2026-08-25, Fuad's design)

Prose across the corpus names OTHER works that are also in this collection. Those names are
now clickable. A `beside` names one by definition; so do plenty of `context` paragraphs and
stop bodies.

### ⛔ THE PROSE STRING IS NEVER MODIFIED

This is the inviolable rule of the feature, and it is why the design is what it is. The link
target lives in a **sibling `refs` field**, never inside the sentence:

```js
beside: "The version he made outdoors is in this collection too. Wheat Field with Cypresses
         hangs at the Metropolitan Museum — …",
refs:   [{ id: "vincent-van-gogh-wheat-field-with-cypresses", text: "Wheat Field with Cypresses" }]
```

Inline `[[id|text]]` markup was considered and **rejected deliberately**, for three concrete
reasons that all live in this file: the checklist above **greps these paragraphs** (steps 4–7,
12b, 12f all pattern-match the prose), the **word bands are enforced against them** (90–170 for
the lenses, 80–160 per stop, 90–120 for the `beside`), and the **reads cascade distils
Interpretations out of them** (READS_SPEC §1). Markup inside the string corrupts all three at
once — a grep for ` or ` hits a target id, a word count counts brackets, and a drafter
downstream reads syntax as prose. Keeping the string clean keeps every existing instrument
working unchanged.

The renderer's guarantee matches: concatenating its output reproduces the paragraph **exactly**,
because every run is sliced out of the string itself and nothing is re-typed. An entry with no
refs renders byte-for-byte as it did before.

### The two accepted shapes

Both are implemented; use whichever fits the entry.

- **Bare array** — `refs: [ … ]` attaches to the object's DEFAULT paragraph. The default is
  named explicitly at each call site, so it is never ambiguous: a tour entry's default is
  `beside`, a `deeper` stop's is `body`, an `art-about` or museum read's is `about`.
- **Keyed object** — `refs: { context: [ … ], beside: [ … ] }`, for an entry with several
  referencing paragraphs. Required as soon as more than one paragraph refers out, and it is
  what stops a `beside` ref leaking into `context`.

### Scope — where refs may appear

Tour `context`, `beside` and `deeper[].body`; the Info (`about`) and Interpretation (`deep`)
reads in `art-about.js`; and museum reads in `museum_about.js`, which render through the same
helper, so a museum paragraph naming a work it holds links too. `see`, `about` and `craft` are
in the validator's field list for completeness, but the outward-pointing paragraphs are
`context` and `beside` — the other lenses stay inside the frame by Law 2.

**Not artist reads.** `ARTIST_READ` (`art_artists.js`) is `id → string`; there is no object to
hang a sibling field on, so an artist read cannot carry refs without changing the store shape.

### The rules the renderer enforces — so the drafter must satisfy them

1. **`ref.id` must exist in the canon.** An id outside `artworks.js` is refused outright.
   **Ids are read from the store, never typed from a title.** This project has a live history
   of the opposite: `teodor-axentowicz-kolomyjka` was written for a work whose real id is
   `teodor-axentowicz-ko-omyjka`, and a hand-typed qid once resolved to an unrelated
   photograph. A title-derived id is plausible-looking and wrong.
2. **`ref.text` must occur in the paragraph exactly once.** Matching is literal `indexOf`,
   never a built regex — these paragraphs are full of straight apostrophes, em-dashes,
   parentheses and diacritics that a pattern would reinterpret. Zero or two-plus occurrences
   → the ref is **skipped**, with a dev-console warning (localhost / file: only; silent in
   production). The data's own worked example: the Kasprzycki `beside` carries *Szał uniesień*
   once and a bare *Szał* later, so `text: "Szał"` is ambiguous and only the full form links.
3. **No self-reference.** A ref pointing at the work whose paragraph it sits in is a defect.
4. **Overlaps link longest-first and never nest** — a title containing a shorter title links
   as the fuller phrase; anything overlapping a kept span is dropped with a warning.

### The validator gates the batch

`node .dtmp/tourqc-pass/validate-refs.js [plan.json …]` walks every `refs` in `art_inspect.js`,
`art-about.js` and `museum_about.js`, and — given a plan file — a proposed backfill **before it
is applied**, reading the paragraphs from the LIVE store so a plan whose text has drifted out
from under it fails there rather than in the browser. It reports **BAD ID / NOT FOUND /
AMBIGUOUS / SELF / SHAPE** and **exits non-zero**. It runs as checklist step 12h and as part of
the merge proof (pipeline step 7). A failing run is a blocked batch, not a warning.

### Where the links go, and how they look

- **To the Reader (`#/work/<id>`), not the study view.** Only 375 of 1,956 canon works have a
  tour, so a study-view link would be dead more often than not. A plain hash anchor, like the
  museum/artist "open ours in the Reader" links: it re-renders in place and leaves a real
  history entry, so Back returns the reader to the paragraph they left.
- **Subtle** — Fuad's word. No colour at rest: the text keeps the paragraph's own ink and
  weight, marked only by a hairline rule at under a quarter alpha, which strengthens to the
  accent on hover and focus. The browser's default underline is switched off deliberately —
  it is the exact thing that would turn a paragraph naming three works into a page of links.
  Someone who never clicks reads unchanged prose.

### The drafting consequence

**When a paragraph names a work that is in this collection, it should carry a ref.** The
membership is the whole premise of the `beside` (see above), so **a `beside` without a ref is
incomplete** — the same class of unfinished as a tour without a `beside`. The id is already
being looked up at checklist 12c; writing it into `refs` costs nothing more than not throwing
it away.

Two notes so this is not over-read. ⚙ **The *one pointer, not two* rule was RELAXED 2026-08-25** —
a `beside` may name more than one companion where the second sharpens the reversal, and each one
carries its own ref (see *More than one companion is permitted*). It was never a cap on refs
anyway: a `context` paragraph that legitimately names three in-collection works carries three. And
a ref is still not a licence to name more works; **it links what the prose already earned**, and
the prose earns a second companion only by the 12e test.

### State as at 2026-08-25 (this ages; re-measure)

Renderer, styling and validator are **shipped**, and so are the first refs: **60 across the three
stores** — 28 in `art_inspect.js` (7 on `beside`, 19 on `context`, 2 on `deeper[].body`), 14 in
`art-about.js`, 18 in `museum_about.js`. Only high-confidence links were taken; on Fuad's ruling
(*"we do high-confidence references for now, don't do weak ones for now"*) the 168 lower-confidence
candidates from the scan are untouched, and 7 high-band hits were dropped on re-read as
place-or-thing rather than work (the *La Grenouillère* raft, the Gare Saint-Lazare building,
Gabriele Münter the painter).

Two properties of that apply are worth keeping. **Every applier refuses to run if the live entry's
JSON no longer hashes to the value recorded in its plan**, which is what made it safe to stage
these against a file another pass was editing — and the guards did fire, on the cypresses entry
and on Heiss. **And plan mode of `validate-refs.js` walks stop-level refs**, not just the
top-level entry: before 2026-08-25 a `deeper: { "<i>": { refs, body } }` bucket was invisible to
it and would have been applied unchecked.

Order is load-bearing where two plans touch one entry: `refs-backfill-2026-08-25.json`
(`apply-refs.js`) before `refs-tours-STAGED-2026-08-25.json` (`apply-tour-refs.js`); the second
excludes the five `beside` entries the first writes. Validate with `validate-refs.js <plan>`
BEFORE apply and bare afterwards.

## Open items — recorded, awaiting Fuad's verdict (do not fix unilaterally)

- **CLOSED 2026-08-25 — the Heiss `beside` broke 12g; the MINIMAL repair shipped, the full
  redraft was rejected.** The record below is kept because the reasoning is the 12g type case.
  `anders-zorn-mrs-veronica-heiss` opened *"Zorn hangs twice in this collection"*. Under 12g as
  rewritten on Fuad's ruling that day, that is **simply a prohibited count** — the question is no
  longer whether it names which set it counts. It also happens to be wrong on every reading:
  re-measured against the store 2026-08-25, the canon holds **13 works under `artistId: "zorn"`,
  7 of them seen** (`seenConfidence: "sure"`, not `wish`) and **3 of them toured** (heiss,
  `midsummer-dance`, the Bacon portrait). That reproduces the second of two earlier measurements
  exactly and refutes the first, which said ten and six; **the drift between them is the argument
  for the rule, not a separate defect.** Three sentences later the same paragraph adds a second,
  unnamed pointer — *"his sea studies… elsewhere on this wall"* — which is
  **`anders-zorn-b-lgeskvulp`** and **`anders-zorn-marin-studie-fran-atlanten`**, both
  `wish: true`, **neither seen nor toured**: it gestures at works that are not there in the sense
  the sentence implies, and it breaks *one pointer, not two*. And the companion's museum is never
  named (the Bacon portrait is at the Met).
  **This pass argued the repair had to be a FULL REDRAFT, not a clause swap** — striking the count
  and the second pointer removes 55 of the paragraph's 116 words and leaves 61, under the 90–120
  band with no museum and no reversal clause — and drafted one at 112 words.
  **Fuad rejected it**: *"was good before"*. Offered a minimal fix instead, he took it:
  *"Yup, do it for Zorn"*. The lesson is the ruling: a defect in two clauses does not license
  rewriting the sentences around them, and the band is met by *replacing* what the cut removed,
  not by re-deriving the paragraph.

  **What shipped (`zorn-heiss-beside-MINIMAL-2026-08-25.json`, 114w → 100w), three changes:**

  1. `twice` → `elsewhere`. One word. The clause Fuad approved — *"and the two portraits are the
     same wager placed at opposite stakes"* — is carried verbatim, and *"the two portraits"* is
     now resolved forward by the companion named next instead of backward by a count.
  2. The sea-studies sentence is **cut** (42 words): it was the false second pointer *and* the
     paragraph's closing reversal, so one new 24-word sentence replaces it, built only from
     material already in the paragraph — *"There the wager is placed in public, at full scale;
     here it is placed close and small — and the strokes are exactly as few."*
  3. *", now at the Metropolitan Museum,"* inserted as an apposition (part 2: *Museum in five*).
     Six words; the ref span *"Mrs. Walter Rathbone Bacon"* is not broken and still occurs once.

  Everything else is byte-identical to the paragraph Fuad approved. It still says nothing about
  the sitter's garment, because the tour's unfixed "fur" error would otherwise propagate into it.
  The rejected 112-word redraft remains in `.dtmp/tourqc-pass/beside-approved-2026-08-25.json`
  with status `proposed` and **must not be applied**; `apply-beside-approved.js` holds it back
  unless `--include-proposed` is passed, and there is no longer any reason to pass it.

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
   ~~sculpture /~~ installation / gallery-room shots / b&w print repros are NOT tour-eligible —
   the fly-to-region format needs a painted surface. Some canon P18s are b&w heliogravures
   or framed gallery photos; catch these before drafting.

   ⛔ **THE SCULPTURE BAN WAS FALSE AND IS REMOVED — 2026-08-25.** It was written as a
   prediction about the format and the store had already refuted it: **`the-thinker` (7 stops),
   `the-kiss` (5) and `the-gates-of-hell` (7) are toured**, plus two more drafted this session.
   The ban survived only because nobody read it against the data it governs — the same shape as
   every other correction in this file.

   ⭐ **THE THREE RODIN TOURS ARE THE SCULPTURE MODEL, exactly as
   `vincent-van-gogh-portrait-of-adeline-ravoux` is the model named for Law 1. Read them before
   drafting one.** Their `craft` paragraphs are strong sculpture criticism and they show what the
   four lenses do when there is no paint: **armature and enlargement** (the studio process, and
   what scaling does to a form), **closed versus open silhouette**, **weighted proportion**,
   the **finished-figure against raw-base contrast**, and **patina** — surface as a decision
   about light rather than about colour. Those are the sculptural equivalents of handling, and
   they are stop-sized: each is a mark on a real surface that Law 1 can start from.

   ⛔ **AND THE RULE THAT WAS GENUINELY MISSING — A SCULPTURE TOUR DESCRIBES A PHOTOGRAPH OF THE
   OBJECT, AND MUST SAY SO ONCE, IN THE CLOSING STOP.** This is the one real difference and the
   ban was standing where it should have been.
   **Light direction, viewing angle, and what the view excludes are the PHOTOGRAPHER's decisions.
   No stop may attribute any of them to the maker.** A raking shadow across a shoulder, a
   three-quarter view that hides an arm, a dark ground that silhouettes a profile — none of that
   is Rodin. Saying it once, in the close, is what lets the rest of the tour describe the
   photographed surface honestly without hedging every sentence.
   ⚙ **The dissolution bias has no analogue in stone** — there is nothing to describe as more
   dissolved than it is. **Its analogue is attributing a raking shadow or a low camera angle to
   the carver**, and it will be directional in the same way, because the dramatic reading is the
   easy one. Check whether a "decision" is in the bronze or in the lighting.
   ⚠ The rest of the screen still applies, and applies harder: a **gallery-room shot** of a
   sculpture is still not tour-eligible (it is a photograph of a room), and a cast is a different
   photographed object from every other cast — the identity-discipline rule in HIRES_SOURCING is
   not relaxed here.
2. **Download each image** locally. Resolve the canon `qid`'s P18 via Wikidata
   `wbgetentities` / `Special:EntityData`, then Commons `Special:FilePath/<file>?width=1600`
   (URL-encode; Commons rate-limits — space requests). Broken qids resolve via Commons
   search or `en.wikipedia.org` pageprops `wikibase_item`.
   ⚙ ~~Note low-res briefs so drafters ask for fewer, larger stops.~~ **SUPERSEDED 2026-08-25 —
   but NOT for the reason first given.** ~~This is the instruction that made the count track the
   PLATE: the census under RULE C found median plate size rising with stop count (4 stops → 7 MP,
   7 → 21 MP), i.e. the tours are sized by who digitised the work.~~ ⚠ **That justification is
   WRONG — falsified the same day. The plate/count correlation does not reproduce** (r = 0.143,
   ~2% of variance; the original figure came from a partial `art_hires` join that dropped works
   with no record). **The strike stands on two grounds that never depended on it:** it hands the
   drafter a DIRECTION on the count, which is exactly what step 3 forbids and for the same Law-1
   reason; and a poor plate HIDES marks rather than removing them (the Szał lesson), so the honest
   response is to upgrade the plate, not to ask for fewer stops. Still **state the plate's pixel
   size in the brief** — step 4 needs it to calibrate false negatives — but it does not set the
   count and it does not argue for a larger or smaller one. A poor plate limits how SMALL a box can
   usefully be, not how many marks the painting has, and where it genuinely blocks the survey the
   answer is to upgrade the plate.
3. **Draft:** one **Opus subagent per work**, in waves of ~5, each given the shared
   `STUDY_BRIEF.md`, the image path, and per-work preflags **including `seenConfidence`**
   (so the drafter uses the right framing). Output: one `out_tour_<id>.json` each. Badge the
   merged entry `by:"Opus 4.8"`.
   ⚙ **The draft must include a `beside` (2026-08-25)**, so the job file has to carry
   candidate companions — the drafter cannot search the store. Hand it the same-artist canon
   rows and the nearest cross-artist toured works, flagging which are toured, and require
   either a `beside` naming one of them **with its id**, or an explicit one-line reason for
   omitting the field. Silence is not an omission.
   ⚙ **That id is returned as a `refs` entry (2026-08-25)**, not as a note — `refs: [{ id, text }]`
   where `text` is the exact words the drafter used in the paragraph. Because the job file is
   also the only place the drafter sees canon ids, the same applies to any other in-collection
   work named in `context` or a stop body. See *Corpus cross-references*.
   ⚙ **THE JOB FILE MUST NOT NAME A STOP COUNT (2026-08-25).** No number, no range, no "aim
   for", and no count implied from the plate's size. ⚙ ~~A drafter handed a number lands on it,
   which is how the corpus acquired a bell curve at 7.~~ **That justification is struck — the bell
   curve at 7 is CONVERGENT, not handed**: blind surveyors given only an image land there too
   (mode 7, SD 0.80). **The rule survives on Law 1** — a number in the brief lets a drafter reach
   the number by writing a stop that starts at a paragraph rather than at a mark, which is the
   defect class this whole spec exists to stop. What the job file asks for instead is the SURVEY:
   *crop the plate, list the distinct marks that reward a stop, then write one stop per mark*
   (RULE C). The draft returns that list alongside the stops — a `survey` array of short mark
   descriptions, one per stop, in stop order — so **every stop's starting mark is auditable** at
   checklist 10c instead of being taken on trust. Require the coverage sum in the same breath: the
   drafter states `sum(w*h)` for its own boxes, minus a full-frame closer, and merges stops if the
   DESCENT passes **~1.14** (was ~~1.0~~, recalibrated 2026-08-25 with the box padding).
   ⚙ **AND IT MUST NOT NAME A LENGTH EITHER, IN EITHER DIRECTION (2026-08-25).** The bands go in
   the brief as floor and ceiling; **space is proportional to substance** goes in beside them
   with Fuad's caveat attached — *"not every painting will"*. A brief that says *this one is
   rich, go long* hands the drafter a target exactly as a stop count does, and buys length before
   anyone has counted what there is to say; a brief that says *keep it tight* buys the reverse
   defect. Ask for the CLAIM instead: **where a lens sits in the upper half of its band or above
   it, the draft names what the extra room carries**, one clause per unit, returned in `flags`
   (draft-only, stripped at merge) so checklist 10e adjudicates a stated claim rather than
   re-deriving one.
   ⚙ **The job file also states the work's READER CEILING (checklist 7e), per work** — the plate's
   pixel size AND which tier it is on (true tile pyramid / `pyr` ladder top level / flat `img` /
   `.tif`-backed and therefore capped at 1920). That is a fact about the source, not a direction
   on the count or the length, and it is what makes a brushstroke-level `craft` claim adjudicable
   instead of guessed at.
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
   anchor — strip `id` + `flags` + ⚙ `survey` (draft-only, 2026-08-25), **keep `refs`**, keep
   `by`. Prove the round-trip: eval
   before/after, assert every existing entry is byte-identical, the count delta equals the
   batch size, and no box exceeds `[0, 1.002]`. ⚙ **Assert the coverage guard while the boxes
   are already in hand**: `sum(w*h)` per entry, minus a full-frame closing box, must not pass
   **~1.14** (was ~~1.0~~; checklist 10c(b) / run order 3, recalibrated 2026-08-25 with the padding —
   **this assertion and the drafter's in step 3 must always carry the same number**). ⚙ **Then run
   `node .dtmp/tourqc-pass/validate-refs.js` — it exits non-zero and the batch does not ship
   on a failure** (run it against the plan file first, before apply, to fail early). Commit
   (`git commit -F -`) and push (canvas `?v=` is auto).

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
  bad image. Standing gap: ~~**71 of 363 toured works have no `art_hires` record**~~ ⚙ **stale —
  re-measured 2026-08-25: 61 of 375** (method: `art_inspect` keys with no `art_hires` key), so
  their Study zoom is capped at the ~900px canon plate — a backfill campaign worth its own batch.
  ⚙ **The whole-corpus version of that gap is far larger and is now measured**: **848 canon works
  have no `art_hires` row**, of which **258 are works Fuad has actually seen** (`!wish`) and
  **152 of those are under 1,600 px**. Figures, method and the holders that would close them:
  HIRES_SOURCING.md, round 5.
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
