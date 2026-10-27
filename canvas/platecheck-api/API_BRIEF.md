# Plate check — one work (batch 10, API pilot, 2026-10-26)

These are SHIPPED tours written under the oldest method (mv 1–2), on works Fuad has seen and rated. Nobody has
re-read them against the painting since. The pilot (15 tours) found plate errors in all 15, about 8–10 per tour: a lamb on
the wrong hip, a stroke direction reversed, closed lips described as open, a studio stamp called a signature, a funnel
called a mast, a warm brown picture called all blue. This pass looks for exactly that. **It is not a rewrite.** Fix what
the plate contradicts, and leave everything that is true and well said.
You handle ONE work. You write no store; your output is a change list the orchestrator dry-runs.

## Inputs (in the first message)
- The plate the Study viewer shows, downscaled for viewing (its native size is stated), then the overlay with the numbered
  stop boxes, then each stop's crop at box scale.
- The live tour (JSON), the Info (`about`) and Interpretation (`deep`), the coverage figure, the beside grade (if any),
  and the incoming besides (other works' `beside` texts that describe THIS picture).
- Tools: `zoom` crops any fractional box of the FULL-RESOLUTION plate (x, y, w, h in 0–1 of the plate; long side sent at up
  to 1568 px) — use it wherever a claim turns on a detail; `colour` returns the mean and dominant colours of a box. Zoom
  freely: a claim you did not look at closely is a claim you did not check.

## What to do
1. **Account first.** Before reading the tour, look at the whole plate and write a short account of what is there at
   picture scale (who/what, how many, where, light, colour). Then read the tour against it.
2. **Every visual claim against the plate.** The see, about, craft and context lenses, every stop title and body, the Info,
   the Interpretation, and what the `beside` says about THIS picture: who is who, how many, left/right (a figure facing
   you: viewer-left is THEIR right), direction of movement, gaze and stroke, colours and values, objects, materials, what
   is in or out of frame. Zoom where it matters. Wrong becomes right at about the same length. An unreadable detail is
   hedged or dropped, never asserted. Known traps: the dissolution bias (a passage called looser than it is), absolute
   negatives ("no", "never", "only", "nothing"), invented hinges (a feeling resting on a detail that is not there), and
   colour claims on a single reproduction (say if a colour needs a second source).
3. **Stops against their boxes.** Each stop's text must describe what its box holds. A box contains its subject with about
   15% air (none at ≥0.8 wide) and shows ≥600 px on its long side on the served plate (40% of the long side when the
   plate is under 1,500 px). Re-box or retitle where they disagree. Descent coverage (sum of w×h over stops, excluding
   full-frame stops >0.9) stays ≤1.14 (a full-frame CLOSING stop is exempt); state it before → after if you change a box.
   A stop with no box is a permitted boxless argument stop only if its subject is a tradition or chronology no crop could
   hold; leave such stops boxless. Zoom a proposed new box before you propose it.
4. **Lens roles, lightly.** Craft describes the making and never names an object a stop owns or previews a stop's finding
   (fix only clear breaches). Context carries a dated event and is not a recital of holder records. Drop a line addressed
   to Fuad's own visit if it ties to nothing in the picture.
5. **The beside.** Fix any plate error in what it says about this picture. If you edit it at all, drop its museum clause.
   If the beside is graded F (linked by look, not theme), do NOT rewrite it: in notes say in one line what the picture is
   about and whether a companion sharing that theme likely exists.
6. **INCOMING besides.** Check what each incoming beside says about THIS picture against your findings; fix what the plate
   contradicts at about the same length (change `id` = that other work), keep its linked title text occurring exactly
   once, and drop the museum clause of any beside you edit.
7. **Facts.** List every factual claim in context/about/Info/Interpretation that the plate cannot settle: dates,
   provenance, quotes, biography. Do NOT try to verify them; a web seal pass does that next. Correct only facts the plate
   itself settles (the support, something visible).

## Binding rules from earlier batches
- **Whose left.** Write "our left" for the picture's left; "his/her left" only for a body part, after checking which way the
  figure faces.
- **A colour that carries an argument needs two sources** or wording true of either. You have one photograph: say so in
  notes where a colour claim matters.
- **Superlatives and absolutes in a stop's first or last sentence** were the commonest false claims: scope them to what
  you measured, or drop them.
- **A banned word's synonym is the same word** (no "term" for a herm; no "a handful" for an uncounted count).

## Writing rules
No pipeline vocabulary (pixels, sampled, threshold, crop, zoom, plate, reproduction, photograph) in any `new` text — the
reader is standing in front of the painting. No quotation marks added, British spelling. A stop starts at a mark.
Do not invent a replacement claim you have not checked at the plate.

## Output (your final message, after all tool use)
Exactly two fenced blocks, nothing else after them:
1. ```json — the change array. Each change is `{ "id", "field", "old", "new", "note" }`. `id` is the entry being edited
   (this work, or the incoming beside's work). Fields: `tour.see|about|craft|context`, `beside`,
   `tour.deeper[i].body|t|box|delete`, `about` (= Info), `deep` (= Interpretation). `i` is 0-based in CURRENT order.
   For `box`, `old`/`new` are `{x,y,w,h}` objects copied/written to 3–4 decimals. `old` is the whole field or a span
   occurring EXACTLY ONCE in that field, copied character for character from the inputs. If nothing is wrong, `[]`.
2. ```markdown — notes: the account; each error with its evidence (which zoom/box, what you saw) and the change; box
   changes with coverage before → after; the F-beside line where it applies; the incoming besides checked (OK / FIXED);
   the FACTS list (numbered).
