# Plate check — web seal for one work (batch 10, 2026-10-26)

The plate check wrote `fix_<id>.json` and `fix_<id>.notes.md` for the work named in your prompt, in
C:/Users/Fuad/Documents/GitHub/.dtmp/platecheckNN/. The notes end with a FACTS list of claims the plate cannot settle. Read
each claim AS IT WILL STAND AFTER the fix file applies. User-Agent `CanvasAudit/1.0 (https://fuad.au)`, with no email or
personal identifier in any header. Holder or scholarly sources first; a Wikipedia line is acceptable when it cites one.
**Do not use the Agent tool. You write no store.** Live stores (read-only):
C:/Users/Fuad/Documents/GitHub/fuad.au/canvas/art_inspect.js and art-about.js (Info = `about`, Interpretation = `deep`),
loaded with `new Function('window', src)`.

## FACTS: triage, then check
Check, at about two fetches per claim: dates (painting and exhibition), provenance that appears in the text, quotations
and attributed opinions, biography, anything a reader would repeat. SKIP measurements and dimensions and claims that are
only interpretation. Wrong becomes right; anything unverifiable gets hedged or cut. Keep at least one dated event in the
context. Two-version pin: where near-twin versions exist, every exhibition/provenance claim must attach to THIS object.
Prefer the boring explanation; a correction is a new claim and needs a source too. Reader-facing text never cites the
apparatus (no "the museum's catalogue calls it").

## Also read the fix file once as a reader
If a fix's new wording introduces a claim the notes do not support, or breaks a sentence, say so and correct it.

## Output
Write corrections as `seal_<id>.json` (same change format as the fix file). `old` must match the post-fix text exactly
once, or the live store for fields the fix file does not touch. If a span sits inside a fix change's `new`, edit that
`new` directly in fix_<id>.json, tag its note `[seal 2026-10-26]`, and first copy the original fix file to
`orig_fix_<id>.json` in the same directory. Write `seal_<id>.notes.md` listing VERIFIED / CORRECTED / CUT per claim with
its source. Then dry-run:
`cd C:/Users/Fuad/Documents/GitHub/fuad.au/canvas && node apply-repairs.js ../../.dtmp/platecheckNN/fix_<id>.json ../../.dtmp/platecheckNN/seal_<id>.json`
(no --write; if you write no seal file, dry-run the fix file alone). Reply with the counts, every CORRECTED/CUT line, and
the dry-run line.
