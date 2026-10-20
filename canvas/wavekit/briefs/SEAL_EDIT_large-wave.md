# SEAL EDIT — wave 28. FIVE agents, five works each (your prompt lists them): apply every accepted change, then re-read.

Do not use the Agent tool. Read: `BRIEF_common.md` (WAVE-28 BLOCK, BATCH COLLISIONS, PRINTS, JAPANESE PAINTINGS and SCULPTURE blocks, every lesson list),
`QUEUE.md` (all R-items — orchestrator rulings, binding; the R-items headed "SEAL RULING" rule on the seal reports), then the
inputs: `seal_web_h1.md`, `seal_web_h2.md`, `seal_plate_h1.md`, `seal_plate_h2.md`, `seal_template.md` (each ends in a
replacement table) and `COLD_RULINGS.md` (rulings on the cold readers' flags in `cold/verdict_A–C.json`). Apply ONLY rows and
rulings for YOUR five works. Back up your works' reader files (out_tour_<id>.json, info_<id>.md, interp_<id>.md,
beside_<id>.json) into your session scratchpad folder `seal28edit_<your group>/` BEFORE the first edit.

## Apply, in this order (a later source may find its OLD span already changed — then re-derive the INTENT on the current
## text, never force the old wording back)
1. **seal_web_h1/h2** rows for your works — ACCEPTED unless a SEAL RULING records otherwise (and with whatever a SEAL RULING adds).
2. **seal_plate_h1/h2** rows for your works — ACCEPTED unless a SEAL RULING records otherwise.
3. **seal_template.md** rows for your works — ACCEPTED, except a row that would remove a fact with no other home, re-open a
   reserved claim, or contradict a ruled caution (say which, and why, in your report).
4. **COLD_RULINGS.md** for your works — every MID it accepts (written by you, re-derived, about as long as what it replaces)
   and the LOWs you judge worth taking under its principles. Do NOT apply per-entry LOW batch-tic flags (the template table
   owns them) or false-to-the-eye flags (the plate seal decides).
5. **Cross-work items** named in a SEAL RULING or COLD_RULINGS. Lenses over 120 named in SEAL_W28 (Cézanne about 122; Osny context
   125; Tōkaidō context 127; Maillol craft 123 and context 123) — trim honest slack to ≤120 if the template table has not already.
   ⛔ <<BLACKOUT works, if any: nothing about their showing, venue, dates or loan, anywhere.>>

## Rules for every edit
Each edit is a script asserting the OLD string occurs exactly once in its field; JSON re-parsed after each write; each
`refs[].text` still occurs exactly once in its beside. No new visual claim beyond the plate checks above, no "rather than", no
measurement words, no apparatus citation, no quotation marks added, British spelling, no closing aphorism. Reader text never
names the work's holder, loan venue or location. Info stays 32–38 words (HARD). Interp 95–115, beside 70–130. Do not touch any
box. Keep each flag honest: rewrite any flag the edit makes false, and append one line per tour: "SEAL (wave 28): <what
changed>".

## Then
Re-read each of your five entries end to end as a visitor (Info → Interp → see → about → craft → context → stops → beside);
fix any seam (≤10 words, reported). Run in the workshop `node gate-quarantine.js <id>` and `node gate-label.js <id>` per work,
`node besidegate.js`, `node count-reads.js`, and from the repo root `node fuad.au/canvas/tonegate.js .dtmp/tourwaveNN`,
`node fuad.au/canvas/bandgate.js .dtmp/tourwaveNN`, `node fuad.au/canvas/stopvar.js .dtmp/tourwaveNN` — report only your
works' lines. Write `seal_edit_<your group>.md`: per work, every applied row/ruling (source + one line), every skipped one with
the reason, the seams fixed, and the gate lines. Reply with counts per work and any gate failure left.
