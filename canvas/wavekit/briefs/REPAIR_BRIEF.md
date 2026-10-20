# THE CONSOLIDATED REPAIR ROUND — wave 12, mv 5. One round per work, and this is it.

Under mv 5 there is **exactly one repair round per work**, dispatched only after crop QC and the
lens sweep have BOTH reported. You receive every finding for your work in one brief. An earlier wave
ran twenty rounds and the difference was re-reads, not checks.

You own ONE work. You may edit only `out_tour_<id>.json` for that id. Read `BRIEF_common.md` first.

## The protocol, which has caught real reviewer errors every time it has run

**1. VERIFY EVERY FINDING AT THE PLATE BEFORE CHANGING A WORD.** A finding is a claim and it gets
the same treatment as the claim it accuses. Reviewers in this project have been reliably right about
WHAT is wrong and unreliable about WHAT TO PUT INSTEAD. Repairs have accepted a finding while
correcting the reviewer's own measurement — a ruled stroke misdescribed, a chroma relation stated
backwards — and one repair correctly refuted the ORCHESTRATOR's brief, on a torn-versus-cut
distinction that the plate's resolution cannot settle either way.

**2. REFUTE WHAT DOES NOT HOLD, IN WRITING.** A refusal is a result. Say which crop or tile you
looked at and what it shows. Do not quietly apply a finding you could not confirm, and do not
quietly drop one either.

**3. NEVER PASTE A SUGGESTED SENTENCE IN. RE-DERIVE IT FROM THE PLATE.** Seventeen proposed wordings
in one wave had to be rewritten, most of them re-introducing in new words the very fault they were
correcting: a lens accused of a false "only" was handed a replacement containing a fresh false
"only"; a scoping fix for one exclusivity named a region that contained the counter-example. Two of
one sweep's three HEADLINE fixes were self-defeating.

**4. PREFER WORDING THE TOUR ALREADY USES CORRECTLY.** In seven findings of one wave the true,
properly scoped sentence was ALREADY WRITTEN in a stop of the same tour and only the lens had been
left on the old claim. Bringing the lens into line with its own stop keeps the tour coherent;
inventing a third phrasing gives you two things to verify instead of one.

**5. WHEN A LENS AND A STOP DISAGREE, THE LENS IS WRONG.** The stops did the looking. And where both
hold the same instance, **cut it from the lens, never from the stop** — the stop is the only place
the reader is actually looking at the thing.

**6. THEN RE-READ THE WHOLE ENTRY, END TO END.** This is not a formality and it keeps paying: a
mandatory whole-entry re-audit once found five box errors the audit that triggered the repair had
missed, including a stop titled "The fur collar in the dark" whose box held no collar. A repair that
corrects one sentence and leaves its propagation elsewhere is a defect that now reads as deliberate.
Precedents: a bird corrected while the same tour's garment, expression and signature box stayed
wrong; a stop and its box corrected while the identical error stood in `see`.

**7. READ EVERY `flags` ENTRY AGAINST THE SENTENCE IT GOVERNS.** Flags in these waves have
repeatedly documented fixes nobody made — two found at one seal, twenty-two at the next. A false
flag is worse than no flag: it tells the next reviewer the ground is covered. And **if a claim is in
your flags, it may not be asserted flat in your text.**

**8. IF YOU MOVE A BOX, SAY SO EXPLICITLY** in your report, listing the id, stop index, old and new
coordinates. Only a moved box gets its crop re-cut; a prose-only repair does not re-read the tiles.

## What blocks a merge and what does not

**Blocks:** a claim false against its own tour; a hedge that hardens as it travels toward the
reader; a flag that lies about the prose it governs; a factual error; a box whose body describes
something the box excludes.

**Does not block:** repeated syntax, repeated title shapes, a construction used too often across the
batch. Those are logged as gait debt and paid down deliberately, never inside a correctness pass.

⛔ **The operative test on any edit you are considering: does this make the reader see the painting
more clearly?** If the honest answer is "no, but it removes a repetition", DO NOT MAKE IT — log it
instead. A de-tic pass in one wave introduced eight sentences false against their own tours and
twenty new false flags, drove the batch's dominant construction the wrong way, and dissolved real
writing into prose that survives every gate and tells a reader nothing. **Conveying the artwork
outranks the batch law.**

⛔ **No repair may be booked on the ground that it makes a paragraph shorter.** A word count is
evidence that something may be worth reading for, never the finding itself and never the remedy.

## The gates, after you finish

Re-run them once — a repair can introduce the defect it was fixing. One rebuilt stop in an earlier
wave pushed six of eight stops into a 139–146 cluster, which is the metronome the proportion rules
exist to kill, and it had to be re-spread. The orchestrator runs `bandgate.js`, `tonegate.js` and
`stopvar.js`; you do not report word counts from your own tokeniser (see `BRIEF_common.md`).

## Your report

Write `repair_<id>.md`: every finding you received, one line each, marked **APPLIED** (with what you
changed and why), **REFUTED** (with the evidence from the plate), or **DEFERRED** (with the reason).
Then a short paragraph on what the whole-entry re-read found that nobody had reported.

---

---

# WAVE-16 ADDENDUM (mv 6): TWO works
Your findings arrive as the reviewers' own files: `cropqc_<id>.md` and the four `lenssweep_<field>.md`
files, where each sweep covers BOTH works, so read the sections naming yours. `QUEUE.md` carries the
orchestrator's rulings. The protocol binds unchanged. Tours are drafted on Opus 5.5 and ship at mv 6.

---

# WAVE-29 BLOCK (mv 6, 2026-10-20): FOUR works, one consolidated repair agent per work
Your findings arrive in ONE file: `audit_<id>.json` (the independent auditor's account, findings with verdict,
severity, evidence and a proposed fix). The orchestrator's rulings for your work are the R-items in `QUEUE.md` that name
it — they are INSTRUCTIONS, not findings: apply them unless the plate refutes one, and then say so with the crop you
looked at. A reviewer's proposed wording is a NEW claim (rule 7): never paste it in; re-derive every replacement from the
plate. Prefer wording the tour already uses correctly elsewhere (rule 8). `BRIEF_common.md` (WAVE-29 BLOCK, the
BLACKOUT, the COLLISIONS, the SCULPTURE block and every lesson list) and your `fusion_<id>.md` (allocation, RESERVED
claim, cautions) bind. Edit `out_tour_<id>.json` in place; keep box fractions unless a finding moves one (then re-place it
from its own crop, padded per rule 7, at least the plate's floor in real pixels). Write `repair_<id>.md`. Run the gates
named in your dispatch before you finish. Tours ship at mv 6. A short lens is acceptable where the rulings leave it short —
never pad to reach a band (the governing test). Scratch files carry your id AND the word "repair" so no drafter's or
auditor's crop is overwritten.
