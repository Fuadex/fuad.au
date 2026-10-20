# Crop QC + lens + fact audit — wave 29 (three NEW tours + one re-tour, 2026-10-20)

Cut from STUDY_SPEC.md: pipeline step 4 (whole-first QC), step 5 (box QC), the checklist (run order 4–20), the
four drafting laws, the defect classes from the audit waves, rule 7 (overscan) and 7e (reader's ceiling). You do
not read the spec; this is it. **Do not use the Agent tool. You write no store** — findings only.

These tours were drafted this week in two phases: the stops and `see` BLIND from the plate, then `about`, `craft`
and `context` with research in hand. Your job is the independent check before repair: every box against its crop,
every visual claim against the plate, every lens against its role, and every fact in `about`/`craft`/`context`
against the research file `hook_<id>.md` (a fact not in the research and not common knowledge is UNSUPPORTED).
An audit sheet is a list of CANDIDATES; verify each before you write it down.

**Measured claims to re-check:** every measurement the drafters name in the tour's `flags` (phase 1 and phase 2) —
re-check each at the plate. **Tone gate LOOKs** are listed in `QUEUE.md` — judge them, do not just repeat them.
**Rule 9 (2026-10-07):** `craft` describes the MAKING and names no object a stop owns; a craft lens that previews the
stops' finds is `ROLE`, MID.

## Files, per work, in this directory
- `img_<id>.jpg` — the plate the study viewer shows (box coordinates are fractions of it).
- `ov_<id>.jpg` — numbered box overlay. `box_<id>_<n>.jpg` — stop n's crop.
- `out_tour_<id>.json` — the DRAFT tour: `see`, `about`, `craft`, `context`, `deeper[]` stops, `flags`.
- `hook_<id>.md` (research — every fact in about/craft/context is checked against it), `fusion_<id>.md` (the
  allocation and its cautions), `phase1_<id>.json` / `eye_<id>.md` (the blind pass).
- `coverage.js`: run `node coverage.js .` for the coverage guard (descent Σw·h, leaving out a full-frame closer;
  over 1.14 means the stops re-cover ground — say which stops to merge).
You may cut further crops from `img_<id>.jpg` with Python/PIL at any magnification; name them
`scratch_<id>_*.jpg`.

## THE ORDER IS THE MECHANISM — do it in this order, per work
1. **Whole-image account FIRST, before reading a word of the tour.** Open `img_<id>.jpg` and write
   5–8 lines: what is in the picture at whole scale, how regions relate, which way figures face and
   look, light direction, what is finished and what is loose. An account written after reading the
   tour is anchored to it and finds nothing.
2. **Diff the account against `see`/`about`/`craft`/`context`.** Whole-scale identification errors
   live here and every stop inherits them.
3. **Per stop, body COVERED first:** open `box_<id>_<n>.jpg`, name the three most prominent things in
   the crop. Then read the stop. If its subject is not among them, the box is wrong (or the stop is).
4. **Then the greps, in yield order, on every lens and stop:**
   - **Finish claims (best hit rate):** loose, dissolve, blurred, unfinished, smudged, barely
     painted, no contour, smeared. THE DISSOLUTION BIAS is directional: every wrong finish claim in
     past audits erred toward MORE dissolved, never less. Assume the passage is more finished than
     the text says, then check.
   - **Absolute negatives and superlatives:** no, not a single, nothing, never, only, the brightest,
     the darkest, the largest, the most. Prove each against the WHOLE plate, not the crop — the
     counter-example usually sits outside the box. Many are sound; check, don't convert on sight.
   - **Body-side, counts, uniqueness:** his/her left/right + hand/arm/foot; two/three/four/single/
     both/a pair; "the X" asserting uniqueness. **Handedness:** for a figure facing us, viewer-left
     is the sitter's RIGHT.
   - **Hedges:** or, appears, seems, reads as, almost, nearly, possibly. A hedge must survive the
     zoom — if the crop settles it, the hedge is a defect either way.
   - **Titles:** read each stop TITLE against its own crop and body ("The bare foot" over no foot).
   - **Relation claims — verify on the PLATE, never the crop:** cut by the frame, runs off the
     edge, the emptiest area, answers the, above/behind, the only X in the picture. Past type case:
     "Cut by the frame" over a boat that is a complete oval with water beyond both ends.
5. **Two structural tests per stop.** *Deepen:* cover the four lenses — does the stop still teach
   something? A stop that only illustrates a lens claim fails. *Hinge:* any claim about feeling,
   relation, intent or attention must name the visible thing it rests on, inside the stop's crop.
6a. **Lens roles (Fuad 2026-10-07: "check the what you see, about, sing and moment so these bits actually adhere
   to what they're supposed to be doing").** `see` NAMES what is on the surface (never describes a stop's
   instance, never argues meaning); `about` is the layer behind the subject (not technique); `craft` is why
   it sings — method, marks, decisions, stated plainly; `context` is the moment — dated events of the life,
   the making, the world (never a holder-record recital). Report a muddy lens as verdict `ROLE`.
6b. **Depth.** Note whether `context` carries the artist's or a contemporary's own words, and whether it
   carries a story (an event, not a fact). Report as `depth: {voice, story}` in the audit file.
6. **Law 4 (nutrition):** mark any passage that is true but pure caption — a minute of unaided
   looking would give the reader the same. Report it, lower severity than a factual error.

## The failure classes you are hunting (all real, all from these files' era)
- **Embellishment drift** — invented detail at the margin of a right reading: "both are back
  views" (both in profile), "folded almost double" (bent ~30°), "raises both hands" (one arm).
- **The invented hinge** — an emotional payload on a detail that is not there: "joined hands" when
  the hand is on a shoulder and the child's hands are in a muff; "gaze lifted past the child" when
  the eyes are closed.
- **Orientation** — the thing is real, but where it is or which way it faces is wrong (light
  direction reversed, sky where hills are).
- **Boxes** that miss their subject, clip it, or drift (past audits found boxes drifting down-left).
- **Uncertainty laundering** — a failure to identify turned into a thesis ("the artist wants this
  ambiguous"). If it resolves at the zoom, say what it is.
- **Worked examples of defect grade:** a "straw hat" that is black; a "closed book" that is open.

## The reader's ceiling
Every plate in this wave is a FLAT file; the file is the reader's ceiling. Only the Constable Cloud Study and the Cézanne
jug have a COLOUR AUTHORITY (`colour_<id>.jpg`, which wins). Elsewhere a colour claim that carries an argument rests on
one image and must be worded so a second reproduction would not refute it. Your work's plate note is in `pre_<id>.json`
(`identity.plateNote`) — frames, margins and pads in shot are named there; boxes must sit inside the paint.
- Read your work's PLATE NOTE in pre_<id>.json (framed visitor photos, small plates with the 40% floor, prints, Japanese paintings, the relief). Prints, Japanese paintings and the relief: BRIEF_common's PRINTS / JAPANESE PAINTINGS / SCULPTURE blocks — vocabulary from the wrong medium is a defect. No colour authority anywhere: a colour claim that carries an argument rests on one photograph and is worded so.
Every box must show at least 600 real pixels on its long side and contain its subject with air around it (rule 7).
**Batch and store collisions (BRIEF_common WAVE-NN BLOCK):** <<WAVE-SPECIFIC — written per wave by the brief generator; see the latest .dtmp/tourwaveNN/ for a filled example>>

## Output — `audit_<id>.json`, one per work
    { "id": "...", "account": "<your whole-image account, written first>",
      "findings": [ { "where": "see|about|craft|context|stop N|stop N title|stop N box",
                      "claim": "<the exact words in the tour>",
                      "verdict": "WRONG|UNSUPPORTED|BOX|CAPTION|COVERAGE|ROLE|TONE",
                      "evidence": "<what the plate/crop actually shows, and which file you looked at>",
                      "severity": "LOW|MID|BIG|CRITICAL", "plateLimited": false,
                      "fix": "<the minimal correction you would propose, or a box suggestion as x,y,w,h>" } ],
      "deepening": "<anything real the tour never uses that a repair could — optional>",
      "clean": true|false }
Severity: CRITICAL = a stop or lens whose thesis rests on the error; BIG = a wrong fact about the
picture a visitor would check and find false; MID = embellishment or a box that misses; LOW = a
hedge, caption passage, or minor imprecision. Reply with only: per work, finding counts by severity.
