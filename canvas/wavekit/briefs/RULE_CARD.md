# RULE CARD — the rules every agent obeys (split from BRIEF_common 2026-11-05 for token diet)

Cut from `canvas/STUDY_SPEC.md` and `canvas/READS_SPEC.md`. **You will not be given those files**
and must not go looking for them — the orchestrator holds the spec and every stage gets a brief.
This card is the part that is the same for all of us: the binding RULES and this wave's block.
The historical lesson ledger (numbered lessons, one per past defect) lives in `LESSON_LEDGER.md`:
the AUDITOR and the SEAL read it whole; everyone else looks up only the lessons their own brief
cites by number. Do not read the ledger end to end unless your brief says so.


## Scratch paths
**Every temporary file you write carries your work's id.** `notes_<id>.txt`, never `notes.txt`. The
scratch directory is shared with up to three other agents working on other works at the same
moment, and a collision has already cost this project a lost draft and a paragraph that landed in
the wrong painting's file. Write your real output only to the exact filename your task names.

## Word counts — you may not report one from your own tokeniser
`bandgate.js` is the designated counter and it is the only count that exists. A `\w+` tokeniser
splits hyphenated compounds in two and counts a spaced em dash as a word, which has three times now
sent an agent to trim a paragraph that was already inside its band. So: **aim 3–4 words inside any
band you are given, and never report a count as a fact.** If a count matters to something you are
arguing, write "count not verified" and let the orchestrator run the gate.

## Measurable quantities are measured, never agreed
Where a claim is about a SIZE, COUNT, RATIO, ORDER, PROPORTION, BRIGHTNESS or ANGLE, the agreement
of several careful observers is not evidence. This is not hypothetical: three independent
readers — a blind eye pass, a drafter at the tiles, and a reviewer writing before it opened the
draft — once all reported that the touches at a figure were the largest on a canvas, and measurement
showed they were among the smallest. Convergence remains good evidence about IDENTITY and RELATION.
It is specifically quantities where eyes agree and err together.

**And verify one magnification FINER than the claim.** Confirming a fine detail at the zoom level
where you first saw it reproduces the conditions that produced the error; it is not verification. A
claim made at 1× is checked at 4×.

## A precise claim degrades one layer at a time
A research finding that is exactly right in the hook becomes a defensible paraphrase in the fusion
and a falsehood in the read, each step a reasonable reading of the one above. Two consequences:
**distinguish a work's `id` from its TITLE** — this collection has slug ids that do not match the
titles they carry, and one of this wave's own works is such a case — and **when a correction
invalidates a count, recount from the list; never decrement.**

## Doubts live in `flags`, never in the prose
If you are not certain, it goes in `flags`. A hedge that has to survive into reader-facing text is
usually a claim that should not be there at all. And **if a claim is in your own flags, you may not
assert it in your text** — that exact contradiction has shipped before.

## Tics this project has already paid for
- The **mental-deletion move** in all its wordings ("cover it and it dies", "mask it and the picture
  collapses", "take it away and it is only…"). Assume another tour in this batch has used it.
- **"across the room"** — once in a whole batch, at most.
- **Templated stop openers**: "Start where", "This is", "Here is", "Notice how".
- **`rather than`** — the most repeated hinge in the store at 4.48 uses per tour. The calibration
  specimen uses it zero times in 1,118 words. Vary the construction; do not merely delete it.
- **Serial `no X, no Y` lists stop at two terms** unless the third refuses a different KIND of thing.

## The governing test, which outranks every band in every brief
**Every sentence must earn its place, and length is an outcome, never a target, in either
direction.** A paragraph that has said what it has to say in 96 words is finished at 96. A paragraph
whose every sentence is justified may sit at the top of its band or past it. No repair is ever
booked on the ground that it makes something shorter.

And above even that: **conveying the artwork outranks the batch law.** A repeated construction is a
blemish; a paragraph that has stopped showing the reader a painting is a failure. The test on any
proposed edit is *does this make the reader see the painting more clearly?* If the honest answer is
"no, but it removes a repetition", do not make it.

---

# WAVE-NN BLOCK
<<WAVE-SPECIFIC — written per wave by the brief generator; see the latest .dtmp/tourwaveNN/ for a filled example>>
(Each wave writes here: the slate table with the voice each work takes; a ⛔ BLACKOUT section if any sighting falls in
the masked window — stated in the workshop only, never copied into a tracked file; THE BATCH COLLISIONS; THE STORE —
shipped tours whose lessons are spent; medium blocks such as SCULPTURE, PRINTS, JAPANESE PAINTINGS.)

## THE 2026-10 RULES — binding
- **Two-phase drafting (rule 6).** The stops, their boxes, the survey and `see` are written BLIND from the plate
  (phase 1). `about`, `craft`, `context` and the thesis are written AFTER research, around the phase-1 stops
  (phase 2), which are then changed only to correct a fact research contradicts.
- **Overscan (rule 7).** Every box contains its subject with air around it (about 15% on a detail, none on a
  box 0.8 or wider), and **no stop may show fewer than 600 real plate pixels on its long side**. Render every
  box before you commit it; padding must not pull a more prominent object into a stop titled for another.
- **Visitor cold pass (rule 5).** Every tour is read cold before merge; the reader asks whether any passage is a
  lab note or a catalogue card, whether each stop puts the eye somewhere findable first, whether lenses repeat
  each other, and whether the tour has a one-line argument. Write for that reader.
- **Old-era failure patterns this week's audits found (do not repeat):** a signature called red that is dark;
  roofs called red that are under snow; a working boat that is a holiday skiff; a scene read back to front
  (figures walking toward us called walking away); "no X here" over a box containing X; a surface called
  unfinished that is fully painted; an Interpretation that only retells the stops.

## THE COUNTERWEIGHT (Fuad 2026-09-26 — read this twice)
**The reader is a person standing in front of a painting, and the record is scaffolding.** Every rule
in these briefs about verification exists to keep what you say TRUE; none of them asks you to say
LESS about the picture or MORE about the paperwork. When the verified pool is thin, the answer is
wider research or honest brevity — never a recitation of the file. The last Opus 5.5 batch obeyed
every verification rule and still failed: contexts became accession-number lists, lenses became
pixel reports, Infos lost their hook. Do not repeat it.

## The 2026-09-26 rules (all binding, all checked mechanically or at the seal)
1. **CONTEXT IS THE MOMENT.** `context` carries at least one dated event of the artist's life or of
   the work's making and world. A context whose every sentence is a holder-record field (accession,
   dimensions, raisonné number, provenance chain, exhibition list) FAILS, however verified. Type
   specimen: Tiepolo's commission told through its dated letters.
2. **MEASUREMENT QUARANTINE.** Probe and eye-report numbers VERIFY claims; they are not prose.
   Reader-facing text carries **at most one measured figure per stop, none in the four lenses unless
   the figure itself is the finding**, and the pipeline's vocabulary never reaches the reader:
   pixels, threshold, sampled, luma, luminance, chroma, b*, percentile, lightness scale, median colour,
   colour-and-tone test. Write what the finding means for the eye. `gate-quarantine.js` greps this.
3. **NEVER CITE THE APPARATUS.** No "the register calls it", "its catalogue entry ties", "the record
   gives", "the museum catalogues it as", "curatorial prose", "the indexes". State the fact, or tell
   the story in which the institution ACTS (a purchase, a sale, a loss). `gate-label.js` greps this.
4. **HOOK PRECEDENCE — TIGHTENED 2026-10-22 (the Info-drift rulings).** A claim may be reserved for the
   Interpretation only when the Info's own remaining hook is a REAL one under the hook test: an event with an actor
   and stakes (making, the artist's life at that moment, technique, the subject's stakes, reception). Dating opinions
   and disputes, attribution/identification debates, catalogue matching, version/series membership as bare fact, and
   commission/exhibition paperwork are NEVER that hook on their own (at most a clause; exception: an apparatus story
   that itself carries actor and stakes — the Hobbema burgomaster is the model). A one-story work gives its story to
   the Info. A collision or store-owns ban that would strip the only passing hook ESCALATES to the orchestrator.
5. **ONE HOME PER FACT** across lens, stop, Interpretation, `beside` — **the Info is EXEMPT (2026-10-22): it is an
   ENCAPSULATED HOOK and may compress the reserved claim, tour material, or verified material that survived in
   neither; the Interpretation then deepens, never re-names.** A cold "apparatus" flag on an Info is BINDING: the fix
   is a different hook, never a re-wording; a KEEP needs a written line naming the hook class. `infogate.js` trips on
   two or more year tokens or the catalogue lexicon — a trip is cleared only by that written line.

## Standing rules carried from waves 13–16
- **Source over summary**: my briefs have carried an error in every wave, and every one was caught by
  an agent going to the source. Check the numbers; prefer sources; report brief errors out loud.
- **The sentence fails, not the measurement**: only / all / every / confined to / nothing else over a
  correct observation, clustered in a stop's first and last sentences.
- **Killed findings stay killed; a false flag is worse than none.**
- **No asterisk markup**: titles stay roman in every artifact; the renderer would print asterisks.
- **id is not title.** Slug ids do not always match the titles they carry. If you say anything about
  "our record", name WHICH FIELD you mean.

## Scratch files
The session scratchpad is SHARED with parallel agents: prefix every scratch script and file with your work id.
