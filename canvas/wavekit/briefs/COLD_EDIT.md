# COLD EDIT — wave NN. TWO agents, five works each (h1 = ids 1–5, h2 = ids 6–10 in ids.json order; your prompt names your
# group): apply COLD_RULINGS.md for your works, then re-read.

Do not use the Agent tool. Do not use the web. Read: `RULE_CARD.md` (WAVE-NN BLOCK, BATCH COLLISIONS, the medium blocks) and
`LESSON_LEDGER.md` IN FULL, `QUEUE.md` (all R-items — binding; the COLD RULINGS R-items are the latest), `COLD_RULINGS.md` (THE input), the cold
readers' verdicts `cold/verdict_A.json` / `cold/verdict_B.json` (for the exact spans), and per work fusion_<id>.md and hook_<id>.md
(the only sources for any FACT check). Back up your works' reader files (out_tour_<id>.json, info_<id>.md, interp_<id>.md,
beside_<id>.json) into your session scratchpad folder `coldNNedit_<your group>/` BEFORE the first edit (NEVER into the workshop
root — stray .json/.bak files there trip the gates).

## Apply
1. Every ACCEPT, ACCEPT LIGHT, PARTIAL, FACT and PLATE ruling for your works. PLATE = look first: box_<id>_<n>.jpg, the tiles
   (tile_<id>_r?c?.jpg) and img_<id>.jpg crops at native scale (write scratch crops to your scratchpad, not the workshop); then write
   what the plate shows, plainly. FACT = hook_/fusion only.
2. NOT TAKEN items: leave them.
3. BATCH items: exactly as COLD_RULINGS.md ## BATCH says — nothing more (wave 44: a wave-43 BATCH quota left in this line was
   read as a standing rule; the BATCH section is the only source).

## Rules for every edit
Each edit is a script asserting the OLD string occurs exactly once in its field; JSON re-parsed after each write; each
`refs[].text` still occurs exactly once in its beside. No new fact, no new visual claim beyond the PLATE checks, no "rather than",
no measurement words, no apparatus citation, no quotation marks added to an Interpretation (R43), British spelling, no closing
aphorism. Reserved claims stay in the Interpretation (hook precedence) — never move one into a lens, stop or beside. Reader text
never names the work's holder, loan venue or location (companions by TITLE only). Info stays 32–38 words (HARD) with
exactly one year token (infogate). Interp 95–115, beside 70–130, lenses ≤120 unless a seal ruling kept them over (the SEAL RULING list).
Do not touch any box. Keep each flag honest: rewrite any flag the edit makes false, and append one line per tour: "COLD (wave NN,
Fable 5.0): <what changed>".

## Then
Re-read each of your five entries end to end as a visitor; fix any seam (≤10 words, reported). Run in the workshop
`node gate-quarantine.js <id>` and `node gate-label.js <id>` per work, `node besidegate.js`, `node count-reads.js`,
`node infogate.js .`, `node crossgram.js`, `node tonegate.js .`, `node bandgate.js .`, `node stopvar.js .`, `node coverage.js .`
— report only your works' lines. Write `cold_edit_<your group>.md`: per work, every ruling applied (one line each, with the new
text for MIDs), every one skipped with the reason, each PLATE finding, seams fixed, gate lines. Reply with counts per work and any
gate failure left.
