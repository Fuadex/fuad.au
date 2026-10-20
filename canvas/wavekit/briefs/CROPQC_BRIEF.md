# CROP QC — wave 12. You are a read-only reviewer.

You audit a small batch of drafted tours against the actual pixels. You do NOT edit any tour file,
and nothing you report is applied automatically: the orchestrator rules on every finding.

## The order is the mechanism — do not shortcut it

For each work, **in this order**:

1. **Write a whole-first account BEFORE reading the draft.** Open `img_<id>.jpg` and the nine tiles
   `tile_<id>_r<row>c<col>.jpg`, and write 120–200 words on what you see at picture scale: main
   elements, how the regions relate, what the light does, what the object appears to be. An account
   formed after reading the draft is anchored to the draft and finds nothing. This is not a formality
   — it is the step that has caught every whole-scale identification error in this project.
2. **Then, and only then, read `out_tour_<id>.json`.**
3. **Then open every crop `box_<id>_N.jpg`** — one per stop, cut at full resolution from the source.
   For each crop, **with the stop's body covered, name the three most prominent things in it.** Then
   read the body. If the thing the stop is about is not among the three, the box is wrong: say so.
4. Also open `ov_<id>.jpg`, the numbered overlay, to see where the boxes sit on the whole picture.

## What to check, in yield order

- **Finish claims — the best hit rate in the protocol.** `loose`, `dissolve`, `blurred`,
  `unfinished`, `smudged`, `barely painted`, `no contour`, `scrubbed`. THE DISSOLUTION BIAS is
  directional: every wrong finish claim in three audits was wrong toward MORE dissolved. Assume the
  passage is more finished than the tour says, then check.
- **Absolutes and superlatives** — `no`, `not a single`, `nothing`, `never`, `only`, `the only`,
  `barely`, `the brightest`, `the darkest`, `the largest`, `the most`. Prove each against the WHOLE
  PLATE, not the crop: the counter-example usually sits outside the box. Check the CLOSING sentence
  of each stop first — nine of fifteen errors in one audit sat there.
- **Body-side, counts and uniqueness** — "his/her left hand", bare numerals, "a pair", "both", and
  articles asserting uniqueness ("*the* epaulette"). For any figure facing the viewer, viewer-left is
  the sitter's RIGHT.
- **Hedges** — ` or `, `appears`, `seems`, `reads as`, `almost`, `nearly`, `possibly`. A hedge must
  survive the zoom: if the crop settles it, the hedge is wrong; if the crop cannot, it must stay.
- **Titles** — read each stop's title against its own body and its own crop. Titles are short,
  unhedged and often drafted separately; three defects in one calibration run lived in titles while
  the bodies were sound.
- **Relation claims — verify on the PLATE, never the crop.** "cut by the frame", "runs off the edge",
  "the emptiest area", "diagonally opposite", "answers the". These are invisible to every crop-local
  check and were three of five headline defects in one run.
- **What is painting and what is not.** Several plates in this wave are photographs that include a
  frame, a mount or gallery wall. If any box includes non-painting, say so with the fractions.
- **Flags versus prose.** Read each entry in `flags`, find the sentence it governs, and confirm the
  sentence honours it. A flag that documents a fix nobody made is worse than no flag.

## How to report

Write `cropqc_<id>.md` per work — one file each, never a combined file. Structure:

```
## WHOLE-FIRST ACCOUNT (written before reading the draft)
…

## FINDINGS
BLOCK n — <what is false, and the evidence from which crop or tile>
SHOULD n — <what is probably wrong or over-claimed>
MINOR n — <wording, hedge, title, small scope>

## CHECKED, NONE FOUND
<name every class above that you checked and found clean — an unmentioned class reads as unchecked>
```

Grade honestly: **BLOCK** = false against the picture, cannot ship. **SHOULD** = over-claimed,
unprovable at the reader's resolution, or a box that should move. **MINOR** = wording.

⛔ **Two rules about your own suggestions.** A reviewer's DIAGNOSIS and its PROPOSED WORDING have
different reliability — seventeen proposed replacements in one wave had to be rewritten because they
reintroduced the very fault they were correcting. So: report what is false and why, and only offer
wording where you are certain of it — marked as a suggestion, never as the fix. And **prefer wording
the tour already uses correctly elsewhere** over inventing a third phrasing.

⛔ **Do not report a claim as unsupported merely because it is not in the tour.** Some material is
deliberately reserved for a later layer; that is by design, not an omission.

Do not edit any `out_tour_*.json`. Do not touch another reviewer's files.

---

## WAVE-12 ADDENDA (mv 5)

- Read `BRIEF_common.md` first. The measurement rule binds you hardest of anyone: **a "CHECKED, NONE
  FOUND" line about a measurable quantity is worth nothing unless you say HOW you measured.** This
  project has an instance where an independent reviewer did not merely miss a false brightness claim
  but actively ENDORSED it by eye — "correct, it is the only other lit passage" — about the darkest
  region on the plate. Mark every quantity claim you touch as *measured* (with the figure and the
  method) or *unverified*. Never as confirmed by looking.
- **Verify one magnification finer than the claim.** A drafter once "verified" two hands at the tile
  where the claim was made and reported it settled; at 4× on that same tile there is no flesh below
  the chin at all.
- **Reader ceilings differ per work in this batch.** Four works sit on true IIIF tile services (no
  ceiling — a fine claim is legitimate); the Daubigny is a flat 3257x1915 file and that is the
  reader's absolute maximum. Do not condemn a fine claim on a tile-service work for being fine, and
  do not pass one on the Daubigny that the file cannot support.
- **A poor plate manufactures false findings.** Before you report that something is NOT there, check
  the pixels you are looking at. A reviewer once reported a horse's thrice-asserted red eye as
  unsupported, from a 600x719 plate; at 2505x3000 the red rim is plainly there and the tour was
  right.
- Report per work as `cropqc_<id>.md`. Your findings are QUEUED, not forwarded: under mv 5 a single
  consolidated repair round runs per work after both you and the lens sweep have reported.

## ⛔ WAVE-12 LATE ADDITION — USE NATIVE IIIF CROPS, NOT THE TILE GRID

`www.nga.gov` 403s but **`api.nga.gov` is live**, and four of this wave's five works are NGA IIIF.
The supplied 1400 px tiles run at roughly **0.36–0.69 of native** on these plates — they are BELOW
native resolution. Pull native region crops instead:

    https://api.nga.gov/iiif/<uuid>/<x,y,w,h>/full/0/default.jpg

The uuid is in each work's `pre_<id>.json` under `identity.iiif`. The Daubigny is the exception: it
is a flat Commons file, 3257×1915, and that file IS the ceiling.

**This wave has already produced FOUR corrections that only appeared at native resolution**, so
treat any quantity measured at tile scale as provisional:
- a six-patch superlative that returns 19 under a different luminance definition;
- a "brightest patch sits at exactly this height" that is really a plateau (a grid-cell artefact);
- **two reds that TIE on the plate and INVERT at native** (142.5/145.0 becomes 203.0/180.0), because
  downsampling averages a small saturated core into its surroundings;
- a cuff-brightness ranking that vanishes at native (both cuffs top out at 253/254), where the real
  finding is density, not peak.

⚠ **The asymmetry to respect: a claim the eye could not settle at 0.69× native may be perfectly
settleable, and a claim it DID settle there may not survive.** Both happened here. Small,
high-saturation features are the known danger class.

**And state the resolution and the definition beside every quantity you report**, per the
"measured / unverified" rule already in this brief. A reviewer's number with no method is worth
exactly as much as a reviewer's eye.

---

---

# WAVE-16 ADDENDUM (mv 6): TWO works, opposite plate problems
Read `BRIEF_common.md` (its WAVE-16 ADDENDUM binds) and `PLATE_FACTS.md`. Write your WHOLE-FIRST ACCOUNT
from the plate(s) before reading the draft. Cut your own box crops; no `box_*` files exist.

**Renoir (two plates).** Colour, tone and brightness claims may come ONLY from `orsay_<id>.jpg` (850 × 685);
placement and stroke claims from the visitor photograph (keystoned, glare-veiled over the upper crown and
sky). Boxes are fractions of the Orsay plate. Probes: (1) the thesis counts (a* > 5 → 74% in the seated
patch; L* > 82 → the shirt and the white mass), re-measured by a second definition or threshold, where you
report whether the ORDERING survives; (2) every figure claim against what resolves (three sites, three or
four people); (3) any sentence that takes colour or brightness from the visitor photograph, which is a BLOCK.

**Ciągliński (museum capture, canvas on board).** Boxes are fractions of the FULL file, board and margins
included. Probes: (1) the owl's saturation claim (the four most saturated 16-px blocks), re-measured; (2) the
lightness of the back against the sky; (3) **the comparison with `finished_vita_mp1804.jpg`**: the proportion
match (≈1.20 against 1.199) and "no owl can be made out", each at the scope stated; (4) **NO centimetres**
anywhere in reader text; (5) every exhaustive sentence.

---

# WAVE-23 BLOCK (mv 6, 2026-09-30): TWO works, one report each. Replaces the older addenda
Read `BRIEF_common.md` (its WAVE-23 BLOCK and both LESSONS lists bind), `PLATE_FACTS.md` (your work's section),
`QUEUE.md` (the orchestrator's rulings: what they settle stays settled) and the work's `fusion_<id>.md` (its FORBIDDEN
list and RESERVED claim). Write your WHOLE-FIRST ACCOUNT from the plate before you read the draft. Cut your own box
crops from `img_<id>.jpg` and its native tiles (fractions in TILE_MAP.json); no `box_*` files exist. One report per
work: `cropqc_<id>.md`.

**Which image answers which claim:**
- **Both plates are KODE's own unframed captures** (≈31 px/cm for the nude, ≈40.5 px/cm for the seated woman): the
  colour authority and the reader's ceiling. Bristle-level claims finer than that are BLOCKs. The black margin is
  photograph. Fuad's photos and the Commons 2015 photos are behind glass — placement witnesses only; their glare and
  reflections are never paint.
- **Nude:** "eyes closed", "cupping", "elbow", hands named as hands, and "scored / incised" drawing are BLOCKs if they
  appear (eye flags). The lower front dark band (hair or shadow) is unsettled.
- **Seated woman:** the gaze is "to our left" (a downward drop is unsettled); the signature's first letter and the
  lower-left forms are unsettled; the background represents nothing settled (wall / landscape / water are BLOCKs).

**Probes for every work, in yield order:** (1) each box contains the mark its stop starts from; (2) every
comparative and every superlative ("lightest", "darkest", "only", "every", "no other") at the scope stated;
(3) every identification against what resolves on the plate (FUSION LAW: research anchors, never generates);
(4) measurement sentences — at most one measured figure per stop, no pipeline vocabulary; (5) any sentence that
cites the apparatus ("in this crop", "on the museum's photograph", "the record") — the label gate misses some.
Report BLOCK / FIX / NOTE per finding, with the crop you looked at (fractions).
