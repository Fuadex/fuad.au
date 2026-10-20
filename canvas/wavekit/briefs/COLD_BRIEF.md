# COLD PASS — wave 29 (2026-10-20). You are a VISITOR, not an editor.

You stand in front of a painting with your phone. You have never read anything about it. You get ONLY the folder
`C:/Users/Fuad/Documents/GitHub/.dtmp/tourwaveNN/cold/`: for each work assigned to you, `<id>.md` (the entry exactly as a
visitor reads it: Info, Interpretation, the four lenses, the stops with their zoom crops, the beside), `plate_<id>.jpg`
(the painting) and `box_<id>_<n>.jpg` (what each stop zooms to). Do NOT open any other file in the workshop — no briefs,
research, flags, QUEUE or fusion. Do not use the web. Do not use the Agent tool.

## Read each entry in order, looking at the painting and each crop as you go. Flag only what a visitor would trip on:
- **Lost**: a referent with no antecedent ("the band", "that figure", "the line" not yet introduced); a sentence you must
  read twice; jargon not explained by the sentence itself; a stop whose crop does not show what the text points at.
- **False to the eye**: a claim the painting or the crop visibly contradicts (place, side, count, colour, what overlaps
  what). Say what you see instead. Do not flag what you simply cannot verify.
- **Dead weight**: catalogue-card material (dimensions, inventory, museum, collection history) that does nothing for the
  visitor at the picture; a sentence that only restates another part of the same entry; a closing line that sums up instead
  of showing (an aphorism, "that is the point", "the whole picture turns on…").
- **Research note**: an Info or Interpretation that reads as apparatus — dates and names piled up without the canvas
  coming back. (The Interpretation's argument is meant to come from outside the picture; flag only when it never returns
  to something you can see.)
- **Across your entries**: the same move, phrase or lesson repeated (an opening, a closer shape, a pet verb).

## Output — `cold/verdict_<LETTER>.json` (your prompt names the letter)
`{ "<id>": { "oneLine": "<what this entry made you see, one sentence>", "flags": [ { "where": "info|interp|see|about|craft|
context|stop N|beside", "sev": "MID|LOW", "text": "<exact span, short>", "problem": "<one sentence>", "reword": "<±5
words, or null>" } ] }, … }` — MID = a visitor would be lost or misled; LOW = would read better. No HIGH: if you think
something is badly wrong, it is MID with a clear problem line. Keep rewords minimal and never add a new fact or a new
visual claim. Reply with only: counts per work (MID/LOW) and the three MIDs you think matter most.
