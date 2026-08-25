> Part of the fuad.au docs — start at [/GUIDE.md](/GUIDE.md)

# Info / Interpretation reads — writing spec (`art-about.js`)

The two-tier reads on the artwork page: `about` (Info) and `deep` (Interpretation). Tours
are the layer beneath and have their own spec — **[STUDY_SPEC.md](STUDY_SPEC.md)**
(`art_inspect.js`).

Written 2026-08-13 from the surviving evidence after this methodology went undocumented for
a month and was reconstructed wrong twice in one session. Sources: the `about21` workshop
(`.dtmp/about21/build.js`, `ABOUT21-REVIEW.md`), the seven hook-first Info campaign commits,
and the A/B rulings of 2026-07-30 → 2026-08-05 (commits a67c492 → be8369a, b2d9ff3).

---

## 1. The cascade

### ⚙ THREE RULINGS — Fuad, 2026-08-25, after two cascade pilots

**1. §5c GOVERNS THE BANDS. The Interpretation runs 95–115 words with a soft margin, ~3× the
Info.** This settles the §5b/§5c conflict — both pilots wrote to different bands because §5b
still asked 140–190. ~~The RATIO is the rule (Interpretation ≈ 3× Info); the counts follow.~~
⚙ **NARROWED — DO NOT READ THAT FLAT.** *(Second narrowing, 2026-08-25.)* With the Info pinned at
32–38 the ratio and the 95–115 band say the same thing, so nothing rides on it — and whether the
*Interpretation* flexes with substance is OPEN, not ruled.

⛔ **THIS RULING IS REASSESSED ~240 LINES BELOW, AND THAT REASSESSMENT WINS.** See
**§1 *RULED 2026-08-25 — SPACE IS PROPORTIONAL TO SUBSTANCE. THE SPACE IS IN THE STUDY, NOT THE
INFO***. Read the two together before drafting; this is the contradiction in this file most
likely to change a draft, because *"the RATIO is the rule"* reads as **a licence to grow the
Interpretation whenever the Info grows** — and the later ruling says the Info **does not grow at
all**: *"I'd still prefer infos tight"*, 32–38 words is **a CONSTRAINT that substance does not
relax**, and the room a rich work earns goes to the **STUDY**, not to either read.
⚠ Also void by that ruling: any brief or draft carrying a **flexible-Info** rule (an intermediate
pass mis-transmitted it as one). A ratio anchored to a fixed numerator is not a scaling law — it
is two fixed bands stated twice.

**2. THE CHAIN IS FOUR STEPS, NOT FIVE. The distil-Info is DROPPED:**
**study tour → hook-Info (background, facts web-verified) → Interpretation (tour-only
sourcing) → ONE fused Info.**
Fuad: *"we're already doing an info synthesis at the last stop anyway."* Both pilots reached
this independently — all three distil-Infos were written, measured at zero 4-gram overlap, and
then **discarded**, because 32–38 words cannot hold both a background hook and a distilled
crux, and background wins under background-first. **The hook-Info stays and earns its keep:**
researching BEFORE the Interpretation caught two facts the tour had already got wrong (a
Trübner on panel not canvas, with a handling claim built on the weave; Monet sixty-seven not
sixty-eight). It is a verification pass wearing an Info's clothes. The **tour-only fence** on
the Interpretation also stays — because the drafters had nothing else, their gap logs are
trustworthy, and that is how a hole in the TOUR is told apart from a hole in the WORLD.
(⇄ The four content steps are unchanged, but a **back-edit of the tour** now sits between the
hook-Info and the Interpretation — see *THE INFO SELECTS, THE TOUR KEEPS* below.)

**3. THE TOUR MUST SETTLE THE IDENTIFICATION A STRANGER ASKS FIRST.** Where it cannot be
verified, **FLAG it and decide per work** — the flag is the mechanism, not silence. Type
specimen: an honest, fully crop-checked de Neuville tour from which **no usable Info could be
written**, because it had scrupulously declined to say whose army was whose. The Info is not a
compression of the tour, it is **the doorway**, and a doorway must answer *what am I looking
at* to someone who knows nothing.

### ⚙ RULED 2026-08-25 — THE INFO SELECTS, THE TOUR KEEPS

*(Closes the "every hook fact survives" open item; the retired wording is quoted at the foot
of this block. Type specimen and fact-by-fact audit:
`.dtmp/tourqc-pass/adler-backedit-STAGED-2026-08-25.json`.)*

Fuad, on the Adler cascade: *"I think Adler info works, as long as we have the facts covered
in the study or something, I think we good"*

**The Info is a doorway, not an archive.** At 32–38 words it SELECTS, and §5b's *every hook
fact survives* is **retired as a requirement on the Info** — marked superseded in place at
§5b rather than deleted, because this project keeps the wrong turn as part of the record.

**It survives as a requirement on the CASCADE AS A WHOLE.** A verified fact that hook
research surfaced may be dropped from the Info but may not be **lost**. It has to be
**somewhere**, and the somewhere is the **study tour**.

#### ⇄ STEP 2b — THE BACK-EDIT (new, mandatory)

The chain is written out of order: the **tour is drafted before the hook research runs**, so a
fact the research surfaces has, until now, nowhere to live — the Info is free to drop it and
the tour never knew about it. One step closes that:

> **study tour → hook-Info (background, facts web-verified) → ⇄ BACK-EDIT THE TOUR →
> Interpretation (tour-only sourcing) → ONE fused Info.**

After the hook-Info is written and **before the Interpretation is briefed**, every verified
fact in the hook is checked against the whole tour blob and dispositioned exactly once:

- **RESTORE** — it belongs to this work and the tour does not hold it. It goes back into the
  tour, normally **`context`**, which is the outward-facing lens. A whole-scale identification
  that the tour *flagged* and the research then *answered* goes there by ruling 3 above: the
  flag is the mechanism, and an answered flag that never reaches the text is the mechanism
  failing silently. Stay inside `context`'s **90–170w band** (STUDY_SPEC) — the band is not
  relaxed for a back-edit. Where it is already full the new fact competes on merit with what
  is there, and losing that competition sends it to LOG, never to the bin.
- **CORRECT** — it contradicts the tour. The tour is wrong until shown otherwise and gets
  fixed. This loop already existed in practice and is only now written down: w8 caught a
  **Trübner on panel, not canvas, with a handling claim built on the weave**, and **Monet
  sixty-seven on arrival, not sixty-eight**. w7 ran the same loop one step later, off the
  Interpretation drafter's gap log — de Neuville's `context` gained *"The blindfolded men are
  German envoys, the escort is the French garrison, and the town is Belfort"*, Gainsborough's
  `about` gained *"painted around 1760"*. Step 2b moves that loop earlier, to where the
  research already is.
- **LOG** — it fits nowhere: artist biography the tour has no room for, a fact that lost the
  band competition, or one that failed re-verification. It is written into the draft's
  **`flags` with its source**, and the workshop file keeps `flags` even though merge strips
  them. **A fact is never silently dropped.** "No room" is a recorded decision, not an
  omission, and a logged fact stays available to a later re-tour.

**The disposition list is an artefact, not a scratchpad.** It is kept in the workshop file
alongside the hook-Info. See the fence note below for why that is load-bearing.

#### The preference rule, for when the Info must still choose

Two facts are both doorway-worthy and only one fits 35 words: **the fact about the object
beats the fact about the artist.** Sourced to the w8 pilot's reading of the shipped corpus and
consistent with §5b's paste test — the load-bearing sentence must be about THIS object.
**Adler is the type specimen**: the hook's March 1944 denunciation, the internment at Picpus
and the prison portraits are by far the better story, and are correctly *not* in the Info.

#### Does step 2b compromise the tour-only fence? Partly — and the trade is stated, not hidden

The fence exists so a gap in the TOUR can be told apart from a gap in the WORLD (ruling 2).
Back-editing before the Interpretation touches it in two different ways and they do not
cancel out:

- **The fence's mechanism is untouched.** The drafter still receives the tour and nothing
  else — no Info, no hook, no web, no canon prose — and still logs every reach beyond it.
  Nothing enters the job file except *through* the tour, and everything the tour now carries
  is verified. Sourcing discipline is exactly as strict as before.
- **One diagnostic is genuinely lost.** After 2b a gap log can no longer distinguish *the tour
  never looked* from *the tour looked and the world has nothing*, because 2b has already
  filled the first category. w8's own log is the proof: of eight logged moments three were
  real, and they split three ways — Monet's palace name (research had it, the tour did not),
  Monet's campaign facts (the tour had cut an unverified claim, research supplied a verified
  replacement), and Adler's kitchen (**no institution is named in any record anywhere**). The
  first two are exactly what 2b now absorbs; only the third would still appear.
- **Read the other way, that is the fence working harder.** The log gets shorter and every
  surviving entry is a world-gap, which is the entry class the fence was built to isolate.
- **The cost is real and is a bookkeeping cost.** What stops being visible is *which facts the
  tour lacked* — the diagnostic changes owner rather than disappearing, moving from the gap
  log to the **2b disposition list**. Drop the disposition list and the cost becomes a genuine
  loss, which is why it is required above rather than suggested.

⚠ **Under §9:** the ruling and the preference rule are Fuad's. The RESTORE / CORRECT / LOG
trichotomy, the `context`-by-default placement and the band-competition tie-break are the
consequence worked out from it, not separately ruled — they are proposals until he says
otherwise, and the honest summary of them is *the tour absorbs the research, the Info stays a
doorway*.

⚠ Superseded, kept for the record — the open item this closes: *§5b's "every hook fact
survives" is unachievable at these bands — an Adler hook carried eight verified facts and the
shipped Info holds two. Needs a preference rule for when the fusion must choose; the pilot's
reading of the corpus is the fact about the object beats the fact about the artist.*

⚠ Open, not ruled (2026-08-25): **may the cascade draw on the tour's `beside`?**
STUDY_SPEC made `beside` a REQUIRED closing movement that day, so from now on the top of the
cascade carries a paragraph that is *about a different painting*. This is not a no-op: §4's
job files hand drafters the whole tour entry, so drafters will see it by default and nothing
currently tells them not to use it. Both readings are defensible — it is verified fact-class
material and sometimes holds the crux framing; but it is sourced from OUTSIDE the frame, and a
95–115w Interpretation that spends words on a second painting stops being a read of this one.
**Needs Fuad's verdict**, one of: (a) strip `beside` from job files, (b) pass it as context but
fence it out of the text, (c) let it in where it earns the space. Nothing is ruled here; the
reversible option is (b), and no cascade batch should ship on the question until he calls it.

⚠ Open, not ruled (2026-08-25): **does a distilled read INHERIT its tour's `refs`, or mint its
own?** The cross-reference field shipped that day (§11) and both tiers can carry it, but the
cascade is a distillation: the Interpretation re-words the tour rather than quoting it, so a
`ref.text` that matched the tour's sentence will usually NOT occur in the Interpretation, and
where it does occur it may sit in a sentence about something else. Mechanical inheritance is
therefore wrong — the validator would throw NOT FOUND on most of it, and the cases that *pass*
are the dangerous ones, because a coincidental text match links a phrase the drafter never
meant as a pointer. But the alternative, minting refs fresh per tier, means the same companion
is looked up two or three times and the id can drift between tiers. **What actually needs
ruling is narrower than the mechanics: should a 32–38w Info spend a link on a second painting
at all?** The Info is one breath and a doorway (§5c); a link out of it is an invitation to
leave before entering. The Interpretation at 95–115w plausibly can. Note this compounds with
the `beside` question above — if `beside` is fenced out of the cascade, most of the refs a
tour carries are fenced out with it. **Needs Fuad's verdict**, one of: (a) refs on both tiers,
(b) Interpretation only, (c) neither — refs stay a tour-and-museum-read feature. Until he
calls it, the safe default is to mint refs only where a read's own prose names a work, never
to copy a tour's ref list down. Nothing is ruled here.

⚙ **BOTH OF THE ABOVE ARE ON THE HANDOFF LIST — `QC_LEDGER.md` → "Awaiting Fuad's verdict",
item 7** (2026-08-25). Confirmed still open there, and recorded with the point this section
already makes but which is easy to lose when the two are asked separately: ⛔ **they are
ENTANGLED and should be ruled together** — fence `beside` out of the cascade and most of a
tour's refs go with it, so a `refs` ruling taken first would be answering a question whose
inputs the `beside` ruling can still change.

⚠ **And one measurement that bears on the `beside` question, taken 2026-08-25:** the store now
holds **22** `beside` paragraphs, up from the **7** §11 records — so the field this ruling
governs has **tripled** since the question was framed, and a decision to fence `beside` out of
the cascade now costs three times what it would have. ⚙ **The field is still fully
ref-covered: all 22 entries carry refs** (21 as a bare array, 1 keyed `beside`), so STUDY_SPEC
12h's *a `beside` without a ref is incomplete* is satisfied — there is **no backlog**.
⛔ **A first draft of this note claimed a 21-row backlog, from a count that only looked at the
KEYED form and missed the bare arrays. Corrected before it shipped, and left here as the
warning: `refs` has two shapes, and a scan that walks one of them under-reports by 95 %.**

### ⚙ RULED 2026-08-25 — SPACE IS PROPORTIONAL TO SUBSTANCE. THE SPACE IS IN THE STUDY, NOT THE INFO

*(Closes the open item "is §5c's 32–38w Info band too tight when the work carries real
substance?" — the retired wording is quoted at the foot of this block. ⚠ An intermediate pass
transmitted this ruling as a licence to make the Info band FLEXIBLE. That was a
mis-transmission, not a ruling; it is corrected here, and any brief or draft still carrying a
flexible-Info rule is void.)*

Fuad, in sequence on the same day. First, on the Adler:

> *"you can expand the info to feature more and feature the rest of the facts elsewhere in the
> study. If there's more meat to work with, we can fit it in."*

Then, clarifying, when that was read as a general loosening:

> **_"I'd still prefer infos tight, though but we can delve deeper in the study to explore more
> angles etc."_**

**The principle is real and it is ruled: a work carrying more that is VERIFIED and worth
unpacking earns more room. The room is in the STUDY.** His earlier *"it can be as long as it
gets"* was about the study, not the Info.

⛔ **THE INFO STAYS TIGHT. §5c's 32–38 words is a CONSTRAINT, and substance does NOT relax it.**
Not a target, not guidance, not a default a rich work may argue its way past. The reason, stated
so this is not re-litigated: the Info's job is to answer *what am I looking at* to someone who
knows nothing (§1 ruling 3), and its value comes from being **ONE BREATH**. **More facts do not
buy more doorway.** A doorway that grows to accommodate substance stops being a doorway and
becomes the first paragraph of the essay it was meant to open. Brevity is what the Info trades
for being read at all — and a work with eight verified facts needs that trade MORE than a thin
one does, not less, because it is the work most able to talk itself out of the door.

✅ **PROPORTIONALITY LANDS ON THE STUDY — the tour's four lenses and its stops.** That is where a
rich work explores more angles. STUDY_SPEC already carries the mechanism, so nothing is invented
here: its governing test is that **every sentence in a lens must earn its place and length is an
outcome, never a target, in either direction** — with Fuad's caveat *"sometimes more space may be
needed"* travelling with it, and *"for more difficult paintings, more stops can be warranted and
vice versa"*. This ruling does not change those — it names them as the destination.
⚙ *(That test replaced STUDY_SPEC's earlier "a floor and a ceiling, never a target to fill" note
on 2026-08-25, because the old wording was being read as "make the lenses shorter". Cite the new
one; the two say the same thing about filling a band and the new one also refuses the reverse.)*

#### The claim test — how a drafter knows the study has earned the room

Proportionality is a CLAIM, and a claim needs a test, or *"lots to unpack"* becomes a mood.
**Count the verified, non-redundant things this work gives you that a reader could not get by
looking at it.** *Non-redundant* is the load-bearing word: three facts about one Salon showing
are ONE thing, and anything plainly visible in the plate counts ZERO, because the reader already
has it.

**The count already exists — this is a reading of an artefact, not a new step.** The hook-Info
research pass produces exactly that list, and ⇄ step 2b then dispositions it fact by fact: the
RESTORE and LOG entries ARE the things that would not fit in 38 words, and their number is the
measure of how much this work has. ⚠ Note the ordering honestly — the tour is drafted BEFORE the
hook research runs, so on a first pass the list arrives at the back-edit and the room is claimed
there; on a re-tour, or on a work already researched, it is in hand before drafting.

Then, per unit of extra room: **name what it carries, and say which question it answers.** If the
answer is *"there was more available"*, that is the count and not a justification, and the room
is not earned. **Fuad's caveat is the EXPECTED outcome, not an edge case** — *"not every painting
will"* — so most works return a short list and keep the length they already had.

⇄ **THIS PROMOTES STEP 2b FROM FALLBACK TO PRIMARY MECHANISM.** *THE INFO SELECTS, THE TOUR KEEPS*
and the back-edit above were written to answer *what happens to the facts the Info drops*. With
the band fixed rather than negotiable, they stop being a consolation route for surplus — **they
are the only route, and the one the ruling intends.** A verified fact that will not fit in 38
words is never a reason to reconsider the 38 words; it is a RESTORE, a CORRECT or a LOG, every
time. Read 2b as load-bearing, not as bookkeeping.

⚠ **Do not over-read this as a general tightening.** The Info is the ONE place a hard band is
re-affirmed. Everywhere else the governing test is **justification, not length** — Fuad on the
stops the same day: they *"were actually pretty nice and tight"*, and §4's count is *"a TARGET,
not a gate"*. Length elsewhere remains an output of what is being communicated.

#### The Adler is an authorised EXCEPTION, not a precedent

`jules-adler-la-soupe-des-pauvres` shipped at **52 words**, expanded from 36 on Fuad's explicit
approval. **It stands — do not revert it and do not stage a revert.** It sits ABOVE the band and
is recorded as sitting above it.

Why it was allowed, so it is not generalised by analogy: the appended sentence — *"No soup
appears in it — no counter, no server, nothing but the line and the waiting"* — is **doorway
content**. It is the single most useful thing a stranger needs, and the Info without it was
answering *who painted this and how big is it* while never answering *what am I looking at*. The
overrun bought the doorway's OWN job. It did not buy a second background fact, and it is not
exhibition bookkeeping. **An Info that runs long to fit more material is the opposite case and is
refused by the rule above.**

⚠ **Open, for Fuad only:** keep the Adler at 52 as a one-off, or trim it back into band now that
the band is affirmed? Trimming means cutting either the added sentence or something he had
already approved, so it is his call and is deliberately not decided here.

#### ⚠ Open — does the Interpretation still ride the ratio? Reassessed, and it needs Fuad

With the Info pinned at 32–38, the ratio stops being an independent constraint: **3× of 32–38 is
96–114, which is §5c's 95–115 band.** The two rules now say the same thing, so nothing is at
stake between them. The live question is only whether the *Interpretation* flexes with substance.

- **For flexing.** The argument that pins the Info does NOT transfer. The Info is bounded by its
  JOB — a doorway is one breath — whereas nothing about "a reading" implies 115 words; that band
  was measured off two exemplars, not derived from function. §3 already rules that a multi-facet
  work synthesises several readings and *"Longer is fine"* (Fuad 2026-08-05, never retired), and
  §4 makes the count *"a TARGET, not a gate."* On that reading the Interpretation belongs to the
  depth layer and inherits the proportionality.
- **Against flexing.** The 3:1 was measured against the two reads Fuad NAMES as the bar, and 223
  pairs were re-cut to it. The defect it fixed was the tiers reading as *"two essays about one
  painting rather than a hook and a reading"* — which is precisely what substance-driven flex
  reintroduces. And his clarification names **the study** as where we delve deeper; the
  Interpretation renders on the artwork page, not in the tour, so a strict reading excludes it.
- **What needs deciding is one word:** whether *"the study"* means the tour only, or the whole
  depth layer beneath the Info. Nothing on record settles that, which is why this is not ruled.

⚙ **The measured fact, correctly re-read.** On the Adler the ratio fell **3.14 → 2.17** when the
Info grew 36 → 52 and `deep` stayed at 113w. Under the corrected rule that is **not evidence
against the ratio** — it is the arithmetic of the exception. The Info left the band; the
Interpretation did nothing wrong. Recompute against an in-band Info and the pair sits at 3.14,
i.e. normal. **The Adler is the only corpus point where the ratio looks broken, and it looks
broken for a reason that is now closed.**

**Until Fuad calls it, the default is the reversible one:** hold the Interpretation at 95–115 —
where the ratio and the band coincide anyway — and let §4's target-not-gate absorb a genuinely
multi-facet overrun case by case. **Do not write a second, wider Interpretation band.**

⚠ Superseded, kept for the record — the open item this closes: *is §5c's 32–38w Info band too
tight when the work carries real substance? … Needs Fuad's verdict, one of: (a) the band holds
and overruns are per-work authorisations only, (b) a second, wider band for works that carry
substance, with the ratio recomputed, (c) the ratio is retired as a rule and the bands stand
alone.* **Answered (a).** Consequently the *"40 words or fewer are left alone"* line at §5c is
calibrated to a band that did not move, and so it does **not** move either. The disposition of
the Adler's remaining facts is at
`.dtmp/tourqc-pass/adler-backedit-STAGED-2026-08-25-v2.json`.

**Study tour → Interpretation → Info.** Work flows downhill; each stage distils the one
above. Verified against the corpus: all 21 works in the about21 batch had tours first, and
the derivation is visible — Hodler's tour `craft` opens "Parallelism, in Hodler's own use of
the word, is not symmetry but repetition… Here it runs at three scales", and the
Interpretation compresses exactly that, pulling its remaining detail from the stops.

**Consequence: the Interpretation tier can never exceed the tour tier.** Tours are the
ceiling. To grow Interpretations, tour more works first. Never write a paired read from an
Info line alone — that error produced the discarded Orsay drafts of 2026-08-13.

## 2. Model split (settled by direct A/B — do not re-litigate)

| Stage | Model | Shape |
|---|---|---|
| Study tour | **Opus**, one agent per work | from the image; facts + anchored boxes |
| Interpretation | **Sonnet, ONE agent per artwork** | from the tour; interpretive voice |
| Info | distilled from the Interpretation | hook-first, facts web-verified |

Fuad's verdict, 2026-08-05, same six works through both models: *"opus feels very mechanical
compared to sonnet which I prefer."* Sonnet is the `deep` voice. Opus keeps the tour layer.

**ONE SONNET AGENT PER ARTWORK** (Fuad 2026-08-13, tightening the earlier swarm rule). The
original instruction was "do a swarm instead of just one subagent" (2026-07-30) because one
agent handling ~10 works in a row drifts into sameness — repeated openers, repeated rhythm,
thinner attention per work. Splitting 2–4 ways reduced that; **one agent per work removes it
entirely** and gives each read full attention. An N-work batch = N Sonnet agents, phased in
waves of ~5 to avoid launching a dozen at once.

**Agents still do not self-coordinate: cross-check openers across the whole batch
afterwards** (a Sonnet run repeated "What" and needed a seal). This is now the main residual
risk of the per-work model and is a mandatory QC step, not an optional one.

## 3. The unit of decision is THE READ, not the model

Triage each work before drafting:

- **Single-crux** — the models converge on one reading. Keep one tight crux-first read
  (~150–170w). Opus won these in A/B (Seurat = frozen system, Cézanne = flicker) by leading
  with the crux.
- **Multi-facet** — the models diverge, which is the signal that the work supports several
  readings. **Synthesize** them under one unifying idea, showing each as a facet. Longer is
  fine. Sonnet won the genuinely multi-facet case (Great Wave), where breadth is earned.

**⚠ Encapsulate the whole work — never cherry-pick** (Fuad 2026-08-05). The Milkmaid carries
four readings (humble subject elevated, the ultramarine wager, arrested time with only the
milk moving, the miraculous bare wall); the shipped read holds all four under "total
attention as reverence" (b2d9ff3). It took three passes: draft 1 drifted by duplicating the
Info, draft 2 over-corrected by isolating one facet, draft 3 synthesized. **This overrides
the old don't-repeat-the-Info rule** — the Info is only a compact orienting hook, so the
Interpretation MAY re-touch its angle as one facet. Capturing the work beats avoiding
overlap. (Cherry-pick risk is specific to interpretively rich works; single-crux works are
already whole with one thesis.)

## 4. Drafting brief — Sonnet voice, Opus discipline

Shared brief for the drafters. Distil from the tour's **about / craft / context** lenses
(plus stops as needed): **no new facts, no re-verification — the tour is already verified.**

**~~TOUR-ONLY SOURCING~~ — SUPERSEDED 2026-08-24. THE FENCE IS DOWN.** The deep tier MAY carry
story, biography, scandal, what happened to the picture afterwards. Tour-only sourcing is what
starved it: the Info above had already spent the story, so the deep was left with
thesis-and-proof prose. Job files now carry canon row + tour + the current Info + current deep.
The 2026-08-14 laundering worry is answered by the caption-Info rule instead — a 35-word Info has
almost nothing to launder. The superseded rule read: The tour is the ONLY fact source for an
Interpretation. The existing Info, the `web` field, and canon prose are NOT sources — do not
even hand them to drafters as "context": a d2 drafter laundered an existing-Info fact (the
Samson AI-study line) into a deep read that way. Job files for drafters should carry the
canon row + tour and nothing else.

- **Length — SUPERSEDED 2026-08-24. Target 95–115 words, against an Info of 32–38: roughly 3:1.**
  Sourced to Fuad naming *Woman with a Parasol* and *Szał Uniesień* as the bar. Measured: those
  two run 32w/95w at 3.0×; the corpus had drifted to 90w/168w at 1.9×, at which point the tiers
  read as two essays about one painting rather than a hook and a reading. **The count is a
  TARGET, not a gate** — QC judges whether an overrun buys anything; cut restatement and
  scaffolding, keep material, never pad up to it. The superseded band read:
- Length (Fuad 2026-08-14; tightened 2026-08-23 — "a bit elongated... not all but many"):
  **target ~130–150** in the brief — drafts inflate past any target, so aim low. At QC:
  **<180 ships as-is; ≥180 gets a trim-first look; >240 always trimmed.** Trims must never
  cost a concrete anchor (a date, an exhibition, a named detail) — losing one is always a
  downgrade; cut restatement, not material.
- One evocative paragraph. **Lead with the unifying idea** (rich works) or **the single
  crux** (settled works) — the best line goes FIRST.
- BANNED openers: framing-fact ("Among roughly eighty…"), theory-first ("X had absorbed the
  theory…"), "What…", "This painting…", the artist's name. Vary the opener.
- No exclamation marks (corpus: 0/110). No quotation marks (corpus: 0/110). No
  masterpiece talk. Second person IS allowed — 36% of the shipped corpus uses you/your;
  an earlier ban here was unsourced and struck 2026-08-14 per Fuad.
- Do not back-load the payoff (Sonnet's habitual failure).
- **De-boilerplate recurring formulas** (Fuad 2026-08-14): when a construction keeps coming
  back across a batch ("X is the (real/whole) subject", "X is the argument"), recast those
  instances as direct statements — same anti-convergence logic as the opener seal. This is
  a QC fix on repeats, not a ban on any single natural use.

**FUSE for best-of-both** where two drafts each have something: keep the winner's spine,
graft the other's sharpest insight (Impression = Sonnet synthesis rebuilt around the prior
read's tonal trick, be8369a). A fuller synthesis that DROPS a shorter read's killer line is
a downgrade.

## 5. Info distillation

Distilled from the finished Interpretation. One sentence, or two short ones — ~~the about21
reference batch runs **35–49 words (average 41)**; match it.~~ **⛔ The count here is SUPERSEDED
2026-08-25 — §5c's 32–38w is the band, affirmed as a constraint.** It leads with a **hook** (the
fact or image that pulls a reader in — who the sitter actually was, what the place is, the
one compositional decision) and carries the identification.

**Every fact in the hook is web-verified.** This pass is where canon errors surface — the
campaign caught A Burial at Ornans 1841 → 1850 and The Painter's Studio 1850 → 1855. Fix the
canon row in the same commit.

**The Info re-words, never re-uses** (Fuad verdict 2026-08-14; measurement: the first
30-work distil wave lifted Interpretation sentences verbatim, up to 14 shared 4-grams).
Before merge, check 4-gram overlap of the Info against that work's `deep`: identification
and fixed fact-phrasings (names, dates, prices, measurements) are exempt; descriptive
sentence reuse is a redraft.

### 5b. The fused Info — CURRENT METHODOLOGY (Fuad, coined 2026-08-15)

The pipeline per work: ~~**study tour → hook-Info (background, facts web-verified) →
Interpretation (tour-only sourcing) → distil-Info (from the Interpretation) → ONE fused
Info** replacing both.~~ **SUPERSEDED — the distil-Info is dropped (§1 ruling 2) and a
back-edit of the tour is inserted after the hook-Info (§1, 2026-08-25). Current chain:
study tour → hook-Info → ⇄ back-edit the tour → Interpretation → ONE fused Info.** For new
works, fuse at writing time — background hook + at most one crux — instead of shipping two
Infos and merging later.

The fused Info (all rulings 2026-08-14/15, tested on a 6-work sample then 33-work rollout):
- **Background/impact first** — the story is what a glancing reader wants ("what they'll be
  interested in: Background"). Anecdotes, names, dates, prices are the material; quotes keep
  their quotation marks.
  **~~Every hook fact survives~~ — SUPERSEDED 2026-08-25 (Fuad, §1 *THE INFO SELECTS, THE
  TOUR KEEPS*).** Kept here because the wrong turn is part of the record. It was written when
  the Info ran 44–74 words; §5c's 32–38w caption made it arithmetically impossible, and the
  w8 Adler cascade is the specimen — a hook carrying eight verified facts against a shipped
  Info holding two. **The Info now SELECTS**, and what it drops is carried by the study tour
  via the step-2b back-edit. Where two facts are both doorway-worthy and only one fits:
  **the fact about the object beats the fact about the artist.**
- **No visual walkthrough** — describing what's on the painting is the Interpretation's job.
- **No venue line, no title restatement** — the UI shows both. Identify via artist + year
  woven in ("Courbet's 1850 canvas…").
- **Crux line OPTIONAL** — at most one, and only a concrete, specific observation
  ("betrayal takes the shape of tenderness"; the oranges as the only saturated colour).
  Editorial commentary ("a century of unease") is the fluff class — end on facts instead.
- **~~Length free — whatever the facts need~~ (shipped batch runs ~44–74 words). ⛔ SUPERSEDED
  2026-08-25 — §5c's 32–38w band governs and is a CONSTRAINT that substance does not relax**
  (§1, *SPACE IS PROPORTIONAL TO SUBSTANCE*). Kept struck because this line is the one a drafter
  reaches for when the facts overflow, and it says the opposite of the rule. What the facts need
  beyond 38 words goes into the tour via ⇄ step 2b.
- Canon dates win over legacy hook text. No facts from outside tour/hook/Interpretation.
- **No home-collection, acquisition or bequest lines** (Fuad 2026-08-22 ×2: '"Its home is
  Stockholm's Nationalmuseum" — we already include location', and '"came to France with the
  Walter-Guillaume collection" and bequest stuff shouldn't cut through either'). The UI carries
  the venue; ownership mechanics — who bequeathed, what fund bought, what inventory number —
  never earn their words. Provenance survives ONLY as a genuine event-story (the Cartoon's 1962
  public appeal and 1987 shotgun attack). The Turner Bequest register is read as the works'
  BIOGRAPHY (unexhibited, found in the studio, given to the nation), not ownership — it stays.
- **A short honest read beats a padded one** (Fuad 2026-08-22, wave-1 QC: three Nordic reads
  shipped generic artist-bio filler because no work-specific fact had surfaced). When research
  yields no distinguishing fact, write two tight sentences — never inflate with genre boilerplate.
- **THE WORK IS THE SUBJECT — the paste test** (Fuad 2026-08-22, wave-2 QC: a Boldini read
  "says everything but anything about the artwork itself"). A read that could be pasted under a
  different work by the same artist FAILS. At least one load-bearing sentence must be about THIS
  object — its subject, scale, medium, series membership, making or cataloguing circumstances.
  Artist biography is scaffolding around that anchor, never the building. When nothing
  work-specific verifies beyond subject + date, the short form anchors on exactly those.
- **The image-look economics** (Fuad 2026-08-22: "OCR is expensive — if you're looking at the
  image, you should move onto doing the tour and deep reads; otherwise it makes no sense to
  spend the tokens on an info paragraph. But first Opus should work extra hard to find publicly
  existing information"). The ladder is: (1) research HARD — the per-painting agent's fetch
  budget rises and multiple languages/museum catalogues are in scope; (2) if work-specific facts
  surface, the Info ships on them, no image needed; (3) if research genuinely exhausts, do NOT
  view the image for an Info alone — route the work into PAIRED PRODUCTION (§8): the one
  image-look then feeds tour + Interpretation + fused Info together, amortised. Viewing an
  image to write only an Info paragraph is a spec violation on cost grounds.
- **Batch-production note** (Fuad 2026-08-22): scale waves run **one research subagent per
  painting**, not per slice — ten works per agent produced template-feel: six near-identical
  Bequest backstories and dimension-line tails on eight of ten reads. Per-work agents cannot
  converge on a template; the assembly QC still cross-checks openers corpus-wide.

The `web:` tier and Web button existed for one day (2026-08-14) and were retired by this
fusion — superseded hooks live in git history, their facts inside the fused Infos.

## 5c. The caption Info and the two-tier contract — CURRENT (Fuad, 2026-08-24)

Measured against the two reads Fuad names as the bar, *Woman with a Parasol* and *Szał
Uniesień*: **Info 32w / deep 95w, a 3:1 ratio.** The corpus had drifted to 90w/168w at 1.9:1.
223 pairs were re-cut to the proportion and 142 Interpretations written fresh from existing
tours; the working instrument is `.dtmp/recut-sweep/BRIEF.md`, kept current.

**The Info is one breath — 32–38 words.** Who or what is in front of you, the date, and the ONE
fact that makes a stranger want to look. Everything else moves down into the deep. A fragment
with an em-dash is the house form; both exemplars are exactly that.

⛔ **THE BAND IS A CONSTRAINT, AND SUBSTANCE DOES NOT RELAX IT — AFFIRMED 2026-08-25** (Fuad:
*"I'd still prefer infos tight, though but we can delve deeper in the study to explore more
angles etc."*). A work that carries more verified, unpackable material does **not** earn a wider
Info. The reason, recorded here so it is not re-litigated: **the Info's job is to answer *what am
I looking at* to someone who knows nothing, and its value comes from being one breath. More facts
do not buy more doorway.** A doorway that grows to accommodate substance stops being a doorway.
The surplus has somewhere to go and it is not here — it goes into the study tour via the §1
back-edit (⇄ step 2b), which that ruling makes the PRIMARY route, not a fallback. **Space is
proportional to substance everywhere else in the system; the Info is the exception, by design.**
Full ruling, the Adler exception and the reassessment of the 3× ratio: §1, *SPACE IS PROPORTIONAL
TO SUBSTANCE*.

**Infos of 40 words or fewer are left alone — but read and fact-checked, not copied blind.** A
pilot passed through an Info dating L'Absinthe to 1876 against a canon row saying 1875, and a
Turner Info saying 1834 against a row saying 1837. Flag conflicts in a `note`, never pass them.

**NEVER WRITE THE LOCATION**, in either tier. No venue, no "its home is", no "you saw it at X"
— the viewer already shows where the work lives. **This beats the leave-alone rule**: a short
Info that names a museum gets the clause struck (Arlequin, ruled 2026-08-24). A venue survives
only when it carries an observation that is not the address — a genuine event-story (the 1914
suffragette attack on the Rokeby Venus), where a painter studied, or the work's own subject.
NOTE the trap: the brief once permitted "you saw it at X" for `sure` works while also banning
locations. Opus resolved the contradiction correctly by instinct; Sonnet took it literally and
**7 of 18 reads in one wave ended on a venue**. A known contradiction in an instruction is a
defect with a delay on it.

**THE TIERS MUST NOT COVER THE SAME GROUND — DEEPEN, NEVER RE-NAME.** If the Info owns a fact,
the deep may return to it only by going further into it. The failure: David's *Napoleon*, whose
Info gave "the clock past four, the candle burnt to nothing, a document lettered CODE" and whose
deep opened by naming all three again. The pass: *Woman with a Parasol*, where both tiers carry
the light-off-the-grass fact and the deep cashes it out — "there is almost no actual white."

**The measure, and why it is NOT a gate.** Share of the Info's distinctive words reappearing in
the deep: corpus mean 19%, healthy under 25%. But the highest score in the entire corpus, **58%,
belongs to *Woman with a Parasol*** — the exemplar. A threshold would condemn the best pair we
have. Treat a high score as a prompt to look, then judge the only question that matters: does
the deep deepen the shared fact or merely repeat it? **The §5 4-gram test cannot see this at
all** — it flagged 0 of the 8 works the word-share measure caught, because re-telling in fresh
wording shares no 4-grams.

**Model (Fuad 2026-08-24): Sonnet drafts Interpretations, Opus trims afterwards where they
overrun.** Badge `deepBy: "Sonnet 4.6"` — the read stays substantially Sonnet's. Where Opus
re-cut both tiers wholesale, the pair carries `by: "Opus 4.8"` and no `deepBy`.

### TESTED AND REJECTED 2026-08-24 — the making quota. Do not re-run.

A pass read Fuad's note that "the interpretations at times get into very descriptive motions" as
*every read owes a technique layer*, measured the legacy reads at 52% making-content, set that as
a bar and rewrote 15 reads to it. **All 15 rejected.** They bought technique by spending
anecdotes — the 'degas' scratched in the marble, the Cézanne its owner had already swapped for a
snow scene, the university shut three years later — and each grew ~15 words. Fuad: *"I don't
think the new ones are actually better - I did like the background stories and anecdotes and I
preferred the tighter versions."* Evidence kept at
`.dtmp/_rejected/making-patch-REJECTED-2026-08-24/`. **Do not reintroduce a making-share target.**

What the note actually meant is narrower: cut aimless description of **what is depicted** — this
at the left, that behind it — which never says why we are being shown it. Technique earns its
place when it IS the point (the Milkmaid's ultramarine, a pigment dearer than gold spent on a
servant's apron), not as a quota.

### A structural finding, not a rule

38% of swept reads ended on the same material as their tour's LAST STOP. The tour is organised
by region and flies the eye from area to area; the Interpretation is organised by an idea.
Choose the last line because it is the hardest thing you have, not because it is where the tour
stopped.

## 6. QC and merge

1. **Fact-check every specific against the tour — including fusions and swaps.** Grep the
   tour blob for each named fact/date before commit (a fusion agent once introduced "Louis
   Leroy"; it happened to be tour-grounded, but it was not verified at the time).
2. **Cross-check openers** across the swarm's output; seal repeats.
3. `seenConfidence` governs person-address exactly as in STUDY_SPEC.md — "you saw/met this"
   only for canon-`sure`; `probably`/`unsure` get institutional phrasing.
4. **Badge honestly** — see below.
5. **Merge insertion-only** (insert `deep:` + `deepBy:` before `by:`) with a vm round-trip
   byte-identity proof: every untouched entry identical, count delta equals batch size.
5b. **If anything in the batch carries `refs`, run `node .dtmp/tourqc-pass/validate-refs.js`**
   — before apply against the plan file, and again after merge. It exits non-zero on
   BAD ID / NOT FOUND / AMBIGUOUS / SELF / SHAPE and **gates the batch**. See §11.
6. **Print both tiers for Fuad's verdict — nothing merges unapproved.**

## 7. Badging (there is a real mechanism, not a convention)

`by` is ONE entry-level field rendered "via {by}" under BOTH tiers (canvas-app.jsx, two
render sites), so a Sonnet `deep` under an Opus Info cannot reuse it. A per-tier **`deepBy`**
field was added for this (commit a67c492); both sites resolve
`(tier === "deep" && X.deepBy) ? X.deepBy : (X.by || "Fable")`.

- Opus Info + Sonnet Interpretation → `by: "Opus 4.8"`, `deepBy: "Sonnet 4.6"`.
- Both tiers Sonnet (work had no prior Info) → `by: "Sonnet 4.6"`, no `deepBy`.
- Never launder a Sonnet read under the Opus badge.

## 8. Two production modes (do not conflate)

- **Paired production** (the cascade above) — flagship / recently-toured works, both tiers
  together. 101 works.
- **Bulk Info campaign** — seven hook-first waves shipped `Info-only entries (about +
  by:"Opus 4.8", no deep)` to reach full coverage of the imaged canon (45 → 622). Authored
  directly, hook first, facts verified; never distilled from an Interpretation because none
  existed. This is why the corpus reads 623 Info against 101 Interpretations — the coverage
  campaign simply ran ahead of the paired production.

**Backfill queue:** the 210 works that HAVE a tour but no Interpretation. Run stage 2 on
those, then decide per work whether the campaign-era Info should be re-distilled from the new
Interpretation (usually yes — it was written without one). Works with neither tour nor
Interpretation need a tour first.

## 9. Rule governance (Fuad 2026-08-14 — binding)

**New rules are PROPOSED, never imposed.** Any addition, tightening, or hardening of this
spec must be flagged to Fuad as a proposal and get his explicit verdict before it is applied
to content. Every rule in this spec must cite its source — a dated Fuad ruling or a corpus
measurement. A rule that cannot be traced to one of those is not a rule; strike it.
(History: an unsourced second-person ban and a hardened word ceiling both reached shipped
content in August 2026 before being caught. This section exists so that cannot recur.)

## Coverage (2026-08-24, post reshape + Interpretation backfill)

**792 Infos · 365 Interpretations · 363 study tours**, against 1,956 canon works. Every
Interpretation has an Info; all but two have a tour (`monet-nympheas-orangerie` and
`leech-the-sunshade` predate the tour-first rule and are recorded exceptions). **"Tour but no
Interpretation" is 0** — the backfill queue is empty.

Info lengths after the reshape: 60% are captions (≤40w), 29% sit at 41–70w, 11% above, 3 over
110w. Re-cut pairs average 36w/111w at 3.1×; 51 shipped Interpretations still carry the old
shape (deeps averaging 135w) — the mild tail, jobs built at `.dtmp/recut-sweep/batch5.json`,
never run.

## Coverage (2026-08-23, post floored batches fl1–fl3 + liked trial lk1) — SUPERSEDED

772 Info (23 from the lk1 liked-works trial, research-first Opus drafts `by: "Opus 4.8"` —
approved as the template for larger liked batches) · 205 Interpretations (111 badged
`deepBy: "Sonnet 4.6"`) · 345 study tours
· floored depth: 30 of 174 fully cascaded (tour + Interpretation + fused Info); 91 floored
  works still tourless
· **192 artist reads (§10) — the eligible gap is ZERO** · **53 museum reads** (`museum_about.js`,
see PIPELINE.md; every museum with a met work is covered, 28 unvisited ones deferred)
(all QC'd — see QC_LEDGER.md). The `web` tier is retired (§5b). Backfill batches 1+2
(29 works) ran the full §5b pipeline with fused Infos `by: "Fable 5"`. Backfill queue:
142 works with a tour but no Interpretation. The Milkmaid pilot study gained its 6
anchored `deeper` chapters (Rijks provenance in the synthesis stop; c. 1660 dating
adopted museum-wide — canon, Info, tour context). Voice rule reaffirmed the hard way:
reads state facts, they never cite the label/source that supplied them (Fuad,
2026-08-15, on "the Rijksmuseum's own label makes the point exactly").

---

## 10. Artist reads (`art_artists.js`) — approved 2026-08-19

A third tier, sitting on the artist page under the compressed header. Two or three
sentences. **Not** a biography and **not** a summary of the collection.

**No cross-references here.** `art_artists.js` is `id → string`, so there is no object to hang
a sibling `refs` field on and §11 does not reach this tier. An artist read that names a work
names it as plain prose. (Changing that means changing the store's shape, which is a proposal
under §9, not a drafting decision.)

### What killed the first pilot

The first eight drafts were collection statistics rewritten as prose — "152 works, 83 met,
across eleven museums". Fuad's verdict was exact: *"The texts do not contain the style, how
or why those artists painted and they don't contain any hook whatsoever that would make them
interesting."* The numbers were already on screen as chips; restating them in sentences added
nothing and displaced the only thing prose can do.

### The shape that was approved

Three moves, in this order:

1. **How the work is made.** The physical fact — broken colour and no black; paint laid thick
   enough to catch raking light; separate dots left for the eye to combine. Something you
   could verify by standing in front of it.
2. **Why it is made that way.** The intent behind the method. Monet chasing the *envelope* of
   air rather than the haystack; Seurat putting painting on a scientific footing; Dahl
   refusing to idealise a landscape.
3. **A hook that reframes.** One concrete, verifiable fact that changes how the work reads —
   the late water lilies painted half-blind with cataracts; Rembrandt bankrupt in 1656 and
   painting better afterwards; Vermeer leaving thirty-four pictures and being forgotten for
   two centuries.

### The collection tie-back — only when it is real

A closing line connecting to Fuad's canon is **optional and evidence-gated**. Use it when the
connection explains something:

- Turner's bequest condition explains why nearly every Turner he has met is at Tate Britain.
- Dahl's cloud studies being private research explains why eight of his fifteen are drawings.
- Knud Baade trained under Dahl in Dresden — **the two Norwegians in the collection are
  teacher and student**, a link nothing in the metadata surfaces.

Do not manufacture one. An artist with three works and no star has no tie-back worth writing,
and padding is worse than silence.

### Rules carried over

- **Numbers only when they explain.** "Eight of your fifteen are drawings" earns its place
  because it follows from the biography; "42 works, 20 met" does not.
- Reads state facts, they never cite the label or source that supplied them (§9).
- Second person, matching the site's existing "works you haven't met".
- No title/venue restating — the chips above already carry both.

### Attribution is upstream of the gate (2026-08-21)

The gate counts works per `artistId`, so a broken attribution silently changes who qualifies.
Auditing it found three faults worth re-checking after any canon import:

- **The slug generator keys on the LAST TOKEN of a name.** Every "the Elder" collapsed to
  `elder` and every "the Younger" to `younger`, merging unrelated painters onto one page —
  Frans van Mieris sat on Bruegel's. `artists`, `lepaute` and `iii` are known surviving
  orphans (that last one slugged from a TITLE, because the work has no artist field).
- **The `unknown` catch-all collects named artists.** 51 works sat there; querying each work's
  own Wikidata qid for **P170 (creator)** recovered 33 of them. Klee's page had been showing 2 of
  his 11. Do this by query, never by reading the title.
- **Wikidata has migrated many labels from `en` to `mul`.** A label fetch with
  `languages=en` returns EMPTY while descriptions still resolve, which tempts you into naming
  the artist from the dates in the description. Q164720 reads "French painter (1900–1955)" and is
  Yves Tanguy, not who those dates suggest. Always fall back to `mul`.

An artist record may legitimately carry `qid: null` — Howard Thain has no Wikidata entity at
all. The UI guards on `a.qid` before drawing the Wikidata link, so null degrades cleanly and is
preferable to inventing a pseudo-qid.

### Coverage gate

Not all 554 artists. Write one where there is something to say: **≥3 works, OR a floored
work, OR an existing read**. Everything else keeps the bare Wikidata descriptor already shown
in the sub line.

### QC — runs by DEFAULT, as part of generating (Fuad 2026-08-19, binding)

**A batch of drafts is not finished until the fact-check has run.** Do not present drafts and
then offer to verify them — verification is a step in producing them, not a service afterwards.
Nothing goes to Fuad with "shall I QC these?" attached.

**Also disallowed: the unverifiable assertion.** Not every bad claim is a wrong fact. Chełmoński
"went home to a village, which cost him the market and suited him" contains no checkable error —
it contains a commercial claim nobody measured and an inner state nobody recorded. A sentence
that cannot in principle be verified cannot survive QC either, and it slips past a fact-checker
precisely because there is no fact to check. Motive, satisfaction, regret and "what it cost him"
are off limits unless the artist wrote it down.



These make confident factual claims about real people — attributions, dates, bequest terms,
illnesses, causes of death — and the hook rule in step 3 actively *rewards* the striking claim,
which is precisely where fluent prose invents. **No artist read merges unverified.**

**Procedure**

1. **Atomise.** Split each draft into its individual assertions. "Sold almost nothing while
   alive, wrote over 800 letters, and most of what you'd recognise came from the final two
   years" is three claims, not one, and they fail independently.
2. **Swarm.** Sonnet verifiers, batched by artist, one verdict per claim against the open web:
   CONFIRMED / WRONG / UNVERIFIABLE, with a correction where it is wrong.
3. **Second pass: check the claims yourself** (Fuad 2026-08-19, binding). Not "adjudicate the
   verifier" — go and look. Read the swarm's findings, then independently verify the ones that
   are load-bearing, surprising, or numeric. The verifier's confidence is not evidence, in
   either direction: one arguing from general knowledge loses to a specific source, and one
   that found no source has not proven a negative. This pass is where the Monet UV claim would
   have died before reaching Fuad instead of after.
4. **Loop if the pass changed anything** (Fuad 2026-08-19). A correction is new text, and new
   text has not been checked. So step 3 runs again over whatever step 3 just altered, and again
   after that, until a pass produces no changes. Two rounds is normal; a claim still moving on
   the third is telling you it is contested, and contested claims get cut rather than settled
   by another lap.

   This is not theoretical. Round one corrected Monet's cataracts to a UV story that collapsed
   under Fuad's question. Round two — checking the corrections rather than the drafts —
   overturned two more that the swarm had produced: Turner's bequest condition was "a gallery
   be built to house them", not "they stay together", and attributing the Schloss Immendorf
   fire to the SS is "believed", not established. Three of the bad facts in this batch came out
   of the FACT-CHECKING, not the drafting.

5. **Print only the genuine unsures.** Confirmations do not need Fuad's attention.

**Known limit of this pass.** It is only as good as the choice of what to re-check — the
load-bearing, the surprising and the numeric get looked at. A claim that is both wrong and
boring can still survive. Round-tripping every sentence is the only complete answer and is not
worth its cost; knowing that is the point of writing the limit down.

**Failure modes, ranked by how plausible they look**

- **Numbers that sound right.** "About eighty self-portraits", "over 800 letters", "thirty-four
  paintings" — round, quotable, and exactly the shape of a half-remembered figure.
- **Attractive anecdotes.** Turner lashed to a mast; Rodin accused of casting from life. Some
  are documented, some are studio legend repeated until it hardened. Legend is usable only if
  the read says it is legend.
- **Causal claims.** "Cataracts explain the late colour"; "arthritis meant the brush was
  strapped to his hand". The condition is often documented while the causal link is contested.
- **Turning-point dates.** Bankruptcy years, first exhibitions, rejections.

**Resolution rule.** Cut rather than soften. A hook that has to be hedged into "is said to
have" was not a hook worth having — hedging is how an unverified claim survives QC.

**A CUT LEAVES A HOLE — GO AND FILL IT** (Fuad approved 2026-08-20). The resolution rule above
has a bias that took a whole batch to notice. Hooks *are* the striking claims, so they are
disproportionately what fails verification — which means a heavily-QC'd batch drifts towards
safe and flat, and the drift is invisible because every surviving sentence is true. Two reads in
batch 3 shipped with only two of the three moves: van Rysselberghe lost his 1904 break from
pointillism and Le Sidaner lost a motive claim, and in both cases the read simply stopped after
"how" and "why". **A read that comes out of QC with no third move is not finished.** Go and find
a different hook and put it through the same loop, rather than shipping the gap. Both were
fixable in one search each: van Rysselberghe is one of very few who took the dot into
portraiture, and Le Sidaner founded a rose festival that still runs.

Related, and cheaper to catch: the same batch shipped "came back with the palette he then kept",
an unfalsifiable claim about influence that survived because it is *dull*. §10's own pass looks
at what is load-bearing, surprising or numeric. Nothing in the procedure catches a claim that is
quietly unverifiable and also boring — so the collection-statistic tie-back ("all three of yours
floored you") slipped through for the same reason, despite being exactly what killed the first
pilot. **When trimming, re-read the flat sentences too.**

**VERIFY THE CORRECTION TOO (Fuad 2026-08-19, learned the hard way).** A verifier that finds
a real error will often hand back a replacement claim, and that replacement arrives with all
the authority of having just caught you out — which is exactly why it gets adopted unchecked.
It happened on the first run: the draft said cataracts explained Monet's late violets, the
verifier corrected it to "his lens-less eye could reach into ultraviolet", and that went
straight into the revision. Fuad queried it and it collapsed. The UV story is circular — the
only evidence is that the post-1923 paintings turned bluer, which is then explained by
inferring UV vision from those same paintings — and a mundane explanation covers it entirely:
removing a yellowed cataractous lens restores cool-tone perception.

A correction is a new claim. It gets the same treatment as the claim it replaces, and
**prefer the boring explanation** — the exotic one is what makes a good story, which is
precisely the pressure this pass exists to resist.

---

## 11. Corpus cross-references (`refs`) — shipped 2026-08-25, Fuad's design

When a read names another work that is also in this collection, that name is clickable. The
full rules live in **[STUDY_SPEC.md § *Corpus cross-references*](STUDY_SPEC.md)** — one copy,
because the renderer and the validator are shared. What matters on this side:

**⛔ THE PROSE STRING IS NEVER MODIFIED.** The target lives in a sibling `refs` field, never as
inline markup inside the sentence:

```js
about: "…",
deep:  "The version he made outdoors is in this collection too — Wheat Field with Cypresses …",
refs:  { deep: [{ id: "vincent-van-gogh-wheat-field-with-cypresses", text: "Wheat Field with Cypresses" }] }
```

Inline `[[id|text]]` was rejected for reasons this spec owns directly: the **word bands are
enforced against these strings** (§5c's 32–38w Info, the 95–115w Interpretation, the 3:1 ratio),
the **4-gram overlap test of §5 and the word-share measure of §5c both read them as prose**, and
the tour paragraphs upstream are grepped by STUDY_SPEC's 13-step checklist. Brackets inside the
string would corrupt every one of those counts. Concatenating the renderer's output reproduces
the string exactly; a read with no refs renders byte-for-byte as before.

**Shapes and scope.** A bare `refs: [ … ]` array attaches to the entry's DEFAULT paragraph,
which for a read is `about`; use the keyed form `refs: { about: [ … ], deep: [ … ] }` as soon as
both tiers refer out. Applies to `art-about.js` (`about` and `deep`) and to `museum_about.js`,
whose read pane renders through the same helper — so a museum paragraph naming a work it holds
links too. **Not** artist reads (§10). Links go to the Reader (`#/work/<id>`), not the study
view, because only 375 of 1,956 canon works have a tour. Styling is deliberately subtle: no
colour at rest, a hairline that strengthens on hover.

**Three drafting rules, all enforced by the renderer, so a violation silently drops the link:**

1. **`ref.id` is read from the store, never typed from a title.** A plausible id is a real
   failure mode here: `teodor-axentowicz-kolomyjka` was written for a work whose real id is
   `teodor-axentowicz-ko-omyjka`. Look it up in `artworks.js`.
2. **`ref.text` occurs in that paragraph exactly once.** Zero or two-plus and the ref is
   skipped — the renderer will not guess an occurrence. This bites hardest at Info length,
   where a 35-word paragraph may repeat a short title fragment.
3. **No self-reference**, and the ref must point at the work the sentence is actually about.

**It gates the batch.** `node .dtmp/tourqc-pass/validate-refs.js [plan.json]` walks the shipped
stores (and a proposed backfill before apply, reading paragraphs from the LIVE store so a
drifted plan fails there rather than in the browser). BAD ID / NOT FOUND / AMBIGUOUS / SELF /
SHAPE, non-zero exit. QC step 5b in §6.

⚠ **Whether the cascade's tiers should carry refs at all is OPEN — see §1.** Do not copy a
tour's ref list down into an Interpretation or Info; mint one only where the read's own prose
names a work, and only pending Fuad's verdict.

**State as at 2026-08-25:** renderer, styling and validator shipped, and **the first refs are
live — ~~32~~ ⚙ 60 of them**, on Fuad's ruling *"we do high-confidence references for now, don't do weak
ones for now"*:

⚙ **REFRESHED 2026-08-25 — the staged plans were APPLIED and this table was stale by 28 refs.**
It said `art_inspect.js` carried **0** because the file was held by another pass; it now carries
**28**. Counted against the live store, not the plan files
(`Object.values(CANVAS_INSPECT)` walking both the top-level `refs` and every `deeper[].refs`):

| store | refs | plan |
|---|---|---|
| `art-about.js` | ~~**14** across 14 reads (12 `about`, 2 `deep`)~~ ⚙ **13 — 11 bare (`about`) + 2 `deep`** | `.dtmp/tourqc-pass/refs-reads-2026-08-25.json` |
| `museum_about.js` | **18** across 13 museums | `.dtmp/tourqc-pass/refs-museums-2026-08-25.json` |
| `art_inspect.js` | ~~0 — the file was held by another pass that day~~ ~~⚙ **28 — APPLIED: 7 on `beside`, 19 on `context`, 2 on `deeper[].body`**~~ ⚙ **44 — 22 bare + 19 `context` + 1 keyed `beside` + 2 `deeper[].refs`** | applied: `refs-tours-STAGED-2026-08-25.json` (21) + `refs-backfill-2026-08-25.json` (6) |
| **corpus-wide** | ~~⚙ **60**~~ ⚙ **75** | — |

⛔ **RE-DERIVED 2026-08-25 (second refresh) — THIS TABLE WENT STALE AGAIN INSIDE THE SAME DAY.**
It has now been wrong twice, in the same direction, for the same reason: **it is a snapshot of
a store with more than one writer.** The `art_inspect` figure moved 0 → 28 → 44 in one session.
⭐ **Stop treating it as a fact and treat it as a worked example of the method** — the numbers
above are `Object.values(<store>)` walking **both** ref shapes (bare array **and** keyed
object) at **both** depths (entry-level and `deeper[]`). ⚠ **The bare/keyed split is the
trap**: a scan that walks only the keyed form returns **1** beside-ref instead of 22.

⚠ **The tour figure is the one to re-derive, not to cite** — it is the only store of the three
whose refs live at two depths (entry-level and stop-level), so a count that walks only the top
level under-reports it by the 2 `deeper` refs, which is exactly the blind spot `validate-refs.js`
had before plan mode learned to walk stops.
⚙ Note ~~**7 `beside` refs against 7 `beside` paragraphs**~~ ⚙ **22 against 22** (re-counted
2026-08-25) in the store — the field is **still** fully ref-covered, which is what *a `beside`
without a ref is incomplete* (STUDY_SPEC 12h) requires. ⚠ 21 of the 22 carry it as a **bare**
array, not as `refs: { beside: [...] }`; count both shapes or the coverage looks like 1/22.

Both were applied mechanically by `apply-store-refs.js` — one applier for both stores, because
they share the `{about, deep, by}` shape and the `about` default — with the house round-trip
proof: entry count unchanged, every untouched entry byte-identical, targets differing **only** by
the gained `refs`, and every `about`/`deep` string across all ~~798~~ ⚙ **800 (re-counted
2026-08-25)** + 53 entries byte-identical.

**How the band was chosen, and the failure class the re-read exists to catch.** `scan-refs.js`
proposed 46 high-confidence hits; **7 were dropped on a hit-by-hit re-read**, every one for the
same reason — *the phrase names the thing the painting is named after, not the painting.*
"Gabriele Münter" is the painter, not Kandinsky's portrait of her; "La Grenouillère" is the
bathing raft; "Gare Saint-Lazare" is the station Monet is standing inside; "A Midsummer Night's
Dream" is Shakespeare's play. A scan cannot make this distinction — **a title is also just a
phrase** — so the human re-read is a required step of the band, not a courtesy. A missed link
costs nothing; a wrong one is a visible error. The 168 lower-confidence candidates were not
touched. The verdict ledger, one reason per drop, is the `dropped` block in the head of every
plan file.

⚠ **`scan-refs.js` does not walk `museum_about.js`** — it covers `art_inspect.js` and
`art-about.js` only, though STUDY_SPEC has always had museum reads in scope.
`scan-refs-museums.js` closes that gap and is where the 18 museum refs came from. Re-run **both**
scanners when the band is next widened.
