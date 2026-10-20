# PHASE 1 — the blind plate pass (rule 6, Fuad 2026-10-06) — wave 29

You write the half of a Study tour that comes from looking: the `survey`, the `deeper` stops with their boxes,
and the `see` lens, for ONE artwork. **You work BLIND**: the plate, its tiles, the identity block in
`canon.json` (title, artist, year, museum) and these briefs are your whole world. No web, no other workshop files,
no research, no existing Info or tour. Your trained knowledge may inform HOW you look (period, technique
vocabulary); every claim must be anchored in what is visibly on THIS plate. A knowledge claim you cannot see
goes in QUESTIONS, never in the text. Read `BRIEF_common.md` first (its rules bind you), then the four drafting
laws and rules A–C in `STUDY_BRIEF.md` (read the laws and the ORDER section; ignore its phase-2 block — that is
the next agent's job), then `EYE_BRIEF.md` for how to use the tiles.

Your plate: `img_<id>.jpg`; tiles `tile_<id>_r<row>c<col>.jpg`, mapped in `TILE_MAP.json`. Your job file
`pre_<id>.json` states the plate's pixel size, its reader ceiling and a PLATE NOTE — read it: it says whether frame,
wall, mount or colour target is in shot (then say in FLAGS where the paint or print begins, in fractions, and box only
inside it), whether the plate is SMALL (then every box shows at least 40% of the plate's long side), whether it is a sculpture
(read BRIEF_common's SCULPTURE block before you look). No plate has a second colour photograph: a colour word that carries an argument is FLAGGED as
one-photograph, and a bright patch that could be gallery glare is checked before it is called paint.
- Water, ice, snow, sky and foliage pictures: **dissolution is the trap** — check what is drawn before calling a surface
  loose, and call a firm edge firm.
- Light direction is a finding (lesson 24): say which side, and how the plate shows it — in the picture's own terms (62).
- Read every signature at 4× and write "dated" only if a date is legibly there (lesson 64); on prints, cartouches and seals
  go to QUESTIONS for research.

## The order (it is the mechanism)
1. **Survey**: crop the plate, list the distinct marks that reward a stop (Rule C). No target count; 3 is valid,
   so is 9. Each entry is a specific place on the surface a stop can start from.
2. **Stops first**: one per mark, each starting AT the mark and arguing outward (Law 1); each teaches what the
   eye alone would miss (Law 4); any claim about feeling, relation or intent names the visible thing inside the
   stop's own crop (Law 3). 80–200 words each, median at or under 135, spread of at least 50. Arc: open with
   what pulls the eye from across the room, descend region by region, close by re-ascending (a step-back
   synthesis stop may be full-frame).
3. **Boxes second (Rule A)**: place every box FROM ITS OWN CROP — cut it, look at it, name its three most
   prominent things; the stop's subject must be among them. Overscan per rule 7 (air around the subject; at
   least 600 real pixels on the long side). Coverage guard: the sum of w×h over your boxes, leaving out only a
   full-frame CLOSING stop, must stay at or under 1.14 — a wide opener counts. Save every box cut as
   `scratch_<id>_box<n>.jpg`.
4. **`see` last**: 90–110 words that NAME what is on the surface at whole scale and how it works on the eye. It
   settles identifications; it never describes a stop's instance (that is the stop's only content) and never
   argues meaning.
5. Hunt your own draft for this week's failure patterns (BRIEF_common): colours of signatures and roofs,
   which way figures face and walk, "no X" absolutes, looser-than-it-is surfaces.

## Output
- `phase1_<id>.json`: `{ "id", "see", "deeper": [ {t, x, y, w, h, body} ], "survey": [...], "flags": [...],
  "coverage": <your descent sum> }`
- `eye_<id>.md`: `### SEEN` (your full visual read, 300–600 words), `### QUESTIONS` (everything you wish you
  knew — identity, dates, the sitter, versions, technique history — the research agent answers these),
  `### LENS SEEDS` (raw notes for `about` and `craft`: the methods you can observe, your blind guess at what the
  picture is about), `### FLAGS`.
Write everything yourself; do not use the Agent tool. Reply only: stop count, coverage, and the one or two stops
you believe carry the picture's weight.
