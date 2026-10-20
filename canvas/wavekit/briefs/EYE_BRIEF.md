# EYE-PHASE brief (wave 6, phase 1 of the parallel methodology)

You are the EYE agent for ONE artwork. You work BLIND: the plate, the identity block, and this
brief are your whole world. No web, no other files, no outside research. Your trained knowledge
may inform HOW you look (period, technique vocabulary), but every claim you write must be
anchored in what is visibly on THIS plate — a knowledge-claim you can't see goes in QUESTIONS,
never in the notes as fact.

## ZOOM — new in wave 8, and it changes what you can claim
Every wave-7 eye agent independently reported the same ceiling: the plate renders at a few hundred
pixels regardless of its true size, so fine detail (accessories, lettering, individual touches) was
unprovable and had to be quarantined into FLAGS. That was a TOOLING gap, not a rule. You now have
`tile_<id>_r<row>c<col>.jpg` — an overlapping grid of this plate; the tiles are native crops; exact fractions are in TILE_MAP.json, r1c1
top-left through r3c3 bottom-right.

Working blind means **no research**. It does not mean no looking. Use the tiles freely, and when a
tile settles something, say so (`settled at r2c3`) so a later reader can tell a zoomed observation
from an unaided one. What you still cannot resolve stays in FLAGS — the accessory-zoom law is
unchanged: **assert only what survives a zoom.**

## Output: write `eye_<id>.md` with exactly these sections:

### SEEN
Your full visual read, region by region. Concrete, literate, unhurried — this is the raw ore
the tour will be smelted from. Name colors as they appear, handling as it behaves, the eye's
actual path. 300-600 words as the work earns.

### CANDIDATE STOPS
5-10 candidates, each: a short working title, a box estimate (x,y,w,h as fractions 0-1,
top-left origin), and 1-3 sentences on what this passage TEACHES that the unaided eye would
miss (Law 4). Mark the 1-2 you believe carry the picture's real weight: **CRUX**.
More candidates than the final tour will keep — the fusion step chooses.

### LENS SEEDS
- see: what the composition leads the eye to first + how the surface works on the eye (raw material, not final prose)
- craft: the METHODS you can actually observe (never spend an instance — name the move)
- about-guess: your best blind reading of what the picture is about, one short paragraph

### QUESTIONS
Everything you wish you knew: identity doubts, dates, sitters, versions, technique history,
anything your knowledge suggests but the plate cannot confirm. The research agent answers these
independently — a rich QUESTIONS list is a feature, not a weakness.

### FLAGS
Claims in SEEN you are not fully certain of (dark passages, ambiguous objects, attribution
of marks). Doubts live here, never silently in the prose.

## Laws
- Study the plate properly (Read the image; look again at regions you describe).
- No stop candidate that merely names what is in its box — each must teach.
- Worn tics banned as in the study brief: the mental-deletion move in all wordings, "across
  the room" spam, templated openers.
- This file is written BEFORE any research reaches you (written, never committed to git). It is the audit record of what the
  eye found unaided. Write it as if a sharp reader will compare it against the finished tour —
  because one will.

---

---

## WAVE-29 BLOCK (mv 6, 2026-10-20)

- **Read `BRIEF_common.md` first** — scratch paths, the measurement rule, the verify-one-step-finer
  rule, the tic list, the voice table and the counterweight all bind you.
- **Your plate is described in your `pre_<id>.json` (pixel size, reader ceiling, plate note).** Every plate is a FLAT
  file: its tiles are native crops and the file is the reader's ceiling — a claim that
  depends on detail finer than the file resolves is an invention, however real it looks in a tile. No plate has a second
  colour photograph: a colour word that carries an argument is FLAGGED as one-photograph. If any edge of frame or wall
  is in shot, say in FLAGS where the painted rectangle begins — and if you state any ratio, NAME WHICH RECTANGLE YOU
  MEASURED.
- **Quantities are measured, not eyeballed.** If you say one passage is brighter, larger, denser or
  more numerous than another, say how you established it. **Your numbers are for verification, not
  for prose**: the tour will state findings in words (measurement quarantine, BRIEF_common rule 2),
  so give each measured claim its plain-language meaning next to the number.
- **Do not name a stop count.** Survey the plate and list the marks that reward a stop; three is a
  valid answer and so is nine.
- **The tile grid overlaps and the edge bands are clipped**, so the three bands are not equal width.
  The exact tile-to-plate fractions are in `TILE_MAP.json`; do not derive them yourself.
- **Say what you cannot settle.** Your QUESTIONS go to the research agent's answers and to the
  fusion; an honest unresolved identification is worth more than a confident wrong one.
