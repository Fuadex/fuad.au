# Study-tour drafting brief — wave 29, mv 6 (the mv-5 lean recipe on Opus 5.5)

You are drafting ONE close-reading Study tour for a single artwork, from the actual plate. Fuad's
brief for the whole layer: the read should *"showcase what makes them what they are so I can also
understand what got me that interested by the artwork."*

Read `BRIEF_common.md` and `GAIT_FORECAST.md` first. Your fusion brief (`fusion_<id>.md`) is the
orchestrator's instruction for THIS work and outranks any general guidance here.

## Output: `out_tour_<id>.json`, a single JSON object

```
{
  "id": "<the exact id given>",
  "see":     "...",   // what is literally on the surface + how it works on the eye
  "about":   "...",   // what the picture is about; the layer behind the subject
  "craft":   "...",   // why it sings: technique, composition, the decisions
  "context": "...",   // the moment around it: history, biography, what happened to it
  "deeper": [ { "t":"short title", "x":0.0, "y":0.0, "w":0.0, "h":0.0, "body":"..." } ],
  "survey": [ "the mark stop 1 starts from", "the mark stop 2 starts from", ... ],
  "flags":  [ "any claim you are NOT fully certain of — doubts go HERE, never in the text" ]
}
```

No `beside` field. It is not yours and it is not written yet — it is drafted last, after the reads,
by a different pass, and that ordering is deliberate.

## THE FOUR DRAFTING LAWS — almost every defect this project has recorded is one of these

**LAW 1 — A STOP STARTS AT A MARK, NEVER AT A PARAGRAPH.** The failures cluster in stops written to
DEMONSTRATE a claim already made in `craft` ("edges dissolve", "canvas through the paint"). Written
outward from the claim, such a stop restates the paragraph at closer range and its box gets placed
afterwards — sometimes on a region that actively refutes the claim. Two real specimens: two stops
boxed on the THICKEST impasto in a picture under the heading "bare canvas showing through", and a
stop boxing the CRISPEST contours while arguing everything is kept out of focus. Start at a specific
mark on the surface and argue outward.

**LAW 2 — THE FOUR LENSES STAY AT WHOLE SCALE AND LEAVE THE PASSAGE UNSPENT.** If `craft` has
already spent the specific passage, the stop has nowhere to go. `craft` may name a METHOD ("he loads
the lights and scrubs the darks"); it may not spend the INSTANCE ("the chemise is the thickest paint
on the canvas") — that instance is a stop's only possible content. **The same applies to `see`, and
more often: `see` NAMES, stops DESCRIBE.** A `see` that pre-described a bird wing by wing left its
stop nothing to reveal; trimmed to "the canvas erupts into a bird", the stop landed.

**LAW 3 — NO INVENTED HINGE.** Any claim about feeling, relation or intent must name the visible
thing it rests on, and that thing must be inside the stop's own crop. Recorded failures: "the
literal and emotional hinge" resting on joined hands when the hand is on a shoulder and the other
hands are in a muff; a gaze "lifted upward past the child" when the eyes are fully closed. The real
picture beats the confabulation every time — the true reading there (a blind man singing, mouth
open) was better than the invented one.

**LAW 4 — EVERY PASSAGE TEACHES SOMETHING THE EYE ALONE CANNOT GET.** The test, per sentence: *if
the reader studied this crop for a minute without your text, would they still not know this?* If
they would know it, the sentence is a caption, not teaching. Replace it with the thing behind it —
the device, the method, the period convention, the decision, the fact. Description is permitted
where it AIMS the eye; it fails when description is the payload. This is a truth-compatible failure:
a tour can pass every factual gate and still be all caption.

## Write in this ORDER — it is the mechanism, not a suggestion

**RULE A — BOXES ARE A SEPARATE SECOND PHASE.** Draft bodies with placeholder coordinates, then
place every box FROM ITS OWN CROP. 17% of stops had wrong boxes on a first pass *while the drafter
held a decile grid and forty inspection crops* — their own words: "the decile-grid estimates I
drafted from were confidently wrong by 5–10 points." Estimating from a downscaled whole view is not
a method. Your boxes WILL be crop-checked at full resolution by a reviewer who does not have your
text.

**RULE B — WRITE THE STOPS FIRST, THE LENSES AFTERWARDS.** `craft` pre-spent its own stops in 5 of 6
tours despite Law 2 being explicit and the drafter having read it that hour. A lens written before
the stops exist has nothing to defer to, so it spends whatever it notices. Write the stops, then
write the four lenses around what the stops have already taken.

**RULE C — THE SURVEY.** Before writing a body: crop the plate and **list the distinct marks that
reward a stop** — each a specific place on the surface Law 1 could start from. Write one stop per
mark and return the list as `survey`, one entry per stop, in stop order. **Floor 3, ceiling 9. There
is no target and no default, and you are deliberately not being given a number.** What the survey
catches is a stop whose stated subject is not a mark on the painted surface: a signature, a zone
rather than a mark, or "the half with no story" — a stop whose content is that nothing is there.

## Bands — floor and ceiling, never a target in either direction

- **Lenses**: each of `see`/`about`/`craft`/`context` targets 90–110 words; 170 is an absolute
  ceiling. **Above 120 you must name, in `flags`, the specific finding the extra words carry** —
  "there was more to say" is not a justification, and most lens overweight is instance-spending that
  belongs in a stop. Lens TOTAL stays under 460.
- **Stops**: 80–200 words each. **The TYPICAL (median) stop sits at or below 135 words**, and the
  **longest-minus-shortest spread must be at least 50**. Both are gated mechanically. Decide while
  drafting which one or two stops carry the picture's weight and give the room to those; a stop that
  has said its one thing STOPS, because 85 honest words beat 130 padded ones. A long stop earns its
  length with MORE FINDINGS, each passing Law 4 — never with decoration.
- **Do not report your own word counts.** See `BRIEF_common.md`: aim 3–4 words inside a band and let
  the gate do the counting.

## `craft` is stated plainly (mv 5)
Every sentence in that lens names a material or a mark — paint, brush, stroke, ground, edge, glaze,
load, scrape. *"An edge is a privilege of nearness"* is a riddle the stops then have to solve; write
the rule the stops demonstrate instead.

## One home per fact (mv 5)
A fact lives in exactly ONE of: a lens, a stop, the Info, the Interpretation, the `beside`. Your
fusion brief names a claim RESERVED for the Interpretation — **you may not spend it, in any lens or
any stop, including a stop's closing sentence.** Reserving a claim from a lens does not reserve it
from seven stop closers, and that is exactly how one was lost before.

## Coordinates
- x,y = top-left of the box as FRACTIONS of the plate (0–1); w,h = width/height fractions.
- A box must CONTAIN its subject **with air around it** — a box cropped to the edges of the thing it
  names is wrong even when accurate, because the viewer fits the box to a large pane and a tight box
  arrives upscaled and mushy. Padding is already applied downstream; just do not frame tightly.
- The closing step-back synthesis stop may be up to full-frame (0,0,1,1).
- **Coverage guard**: sum `w*h` across your boxes, subtracting a full-frame closer. If that DESCENT
  total passes **1.14**, you are re-covering ground rather than deepening — merge stops. State your
  sum in `flags`.

## The four movements
1. The four lenses establish the painting at whole scale, and settle every identification there —
   an object that only resolves at distance must be named at this level or it will be misread
   piecemeal in the stops.
2. The stops descend. Each answers one question: *what does standing this close teach that the
   lenses could not?*
3. The close re-ascends — a step-back synthesis stop is the default; a smallest-telling-detail close
   is legitimate where it genuinely lands.
4. (The `beside` steps sideways, later, and is not yours.)

## Voice and truth
- Literate, direct, concrete. No filler, no "masterpiece" talk, no exclamation marks.
- Do not assert a museum, attribution or date you are not sure of — it goes in `flags`.
- The person-address rule is in `GAIT_FORECAST.md` and differs per work in this batch. Obey it.
- When a passage looks LOOSE, check whether it is actually loose. The dissolution bias is
  directional: every wrong finish claim recorded in this project was wrong toward more-dissolved,
  with zero counter-examples.
- Absolute negatives and superlatives ("nothing", "never", "only", "the brightest", "the largest")
  are the cheapest defect class there is. Prove each one against the PLATE, not your crop — the
  counter-example usually sits outside your box.

---

# WAVE-29 BLOCK — PHASE 2 (rule 6, Fuad 2026-10-06) — read with BRIEF_common's wave-29 block

**You are the phase-2 drafter.** The stops, their boxes, the `survey` and `see` were written BLIND from the plate
in `phase1_<id>.json`. You do NOT rewrite them. You write `about`, `craft` and `context` around them, with the
research (`hook_<id>.md`) and the orchestrator's `fusion_<id>.md` in hand. You may change a phase-1 stop or `see`
ONLY where research contradicts a fact in it (a date, a name, an identification) — say so in `flags`, quote the
old words and the source.

- **`about`** is what the picture is about — the layer behind the subject. Not a technique report.
- **`craft`** is why it sings: every sentence names a material or a mark; METHODS, never a stop's INSTANCE. Check
  every method you name against the phase-1 stops so you do not spend one.
- **`context` IS THE MOMENT**: at least one dated event of the artist's life or the work's making and world, and —
  where the research has them — the VOICES: what the artist or a contemporary said or wrote. A story beats a fact
  list. Never a recital of holder records.
- Measurement quarantine and never-cite-the-apparatus bind you (gates run on your draft).

Output: `out_tour_<id>.json` = the phase-1 `see`, `deeper`, `survey` carried over verbatim (except any flagged
factual correction) + your `about`, `craft`, `context` + `flags`. No `beside`.
