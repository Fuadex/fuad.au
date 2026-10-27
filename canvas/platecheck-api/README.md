# platecheck-api — the plate-check lane, API edition

Durable copy of the toolkit that re-checked the older Canvas tours (mv 1 / 2 / 2.1) against their plates,
2026-10-26 → 10-27. Batches 6–14 ran here (about 210 works through the API, ~$15 per 30); with batch 14
the pool was empty: **336 of the 473 older tours** are plate-checked and fact-sealed. The 137 older tours
outside the pool were touched by other lanes (merges / dataflags / auditwaves / tourwaves) and were never
plate-checked — `pool.js` excludes them by lane; widen its `lanes` list to bring them in.

Workshops live in `.dtmp/platecheckNN/` (untracked). These files are the templates: copy them into a new
workshop and replace `platecheckNN` with the folder name (`sed -i 's/platecheckNN/platecheck15/g' *`).

## Pipeline (per batch)

1. **Pool** — `node pool.js` (writes pool.json, tiered; add the previous workshops to `lanes`), then take
   `ids.json = pool.slice(0, 30)`.
2. **Plates** — `python dl4.py` downloads the plate the study viewer shows (~2400 px) plus `tour_<id>.json`.
   Failures: `node fallback.js` (no hires row → art_data imgZoom), `python stitch.py <id>` (IIIF servers that
   refuse full renders: Nationalmuseum returns 501, National Gallery London clamps at 800 px). Then
   `python crops.py` (overlay + stop crops).
3. **Checker (API)** — `node run-batch.js 0 30 6 > batch.log` runs `api-check.js` per work, 6 at a time.
   It reads `ANTHROPIC_API_KEY` from `fuad.au/.env` (gitignored; never printed). System prompt =
   `API_BRIEF.md` (cached); tools `zoom` / `colour` are served by `tool.py`. Output per work:
   `fix_<id>.json` (apply-repairs format) + `fix_<id>.notes.md` (account, errors, FACTS list).
   api-check refuses IIIF plates under 1500 px (run stitch.py first).
4. **Seal (canvas-opus subagent, one per work)** — under `SEAL_BRIEF.md`: pin the holder object (near-twins,
   two-version rows), verify every FACTS claim against the holder, read the fix as a reader, write
   `seal_<id>.json` (and edit fix `new` text in place, original kept as `orig_fix_<id>.json`).
   `node ready.js` dry-runs unsealed fixes; `--mark id,id` records dispatch. Never pass orig_fix files.
5. **Orchestrator** — simulate everything in a scratch copy of the stores (apply-repairs `--write` there),
   run `node scan-sim.js <simDir>` for apparatus / viewing / sighting words, write `zz_orch.json`
   for cross-work alignment (besides that repeat a corrected claim, colour words left over, boxes).
   Spot-check ~5 works against the plate by eye. Resolve conflicts where two seals edit one span.
6. **Verdict → apply** — `cd fuad.au/canvas && node apply-repairs.js <fix+seal pairs> zz_orch.json --write`,
   then `node ../.dtmp/tourqc-pass/validate-refs.js`, `node ../../.sptmp/check-public-dates.js`, commit, push.
   Store years / qids are line edits in artworks.js with a comment (integer convention: a range opens at its
   first year); after a qid retarget run `node fetch-art.js` (slow; only the changed entry should differ).

## Re-plating (gallery photos, small or colour-cast plates)

`reg2.py` / `reg3.py` register a faithful holder image inside the old plate (axis-aligned affine, numpy;
reg3 ties the two scales by pixel aspect, then refines). `build-replate3.js` remaps stop boxes
(`new = (old − a) / s`, clamped) into apply-repairs box changes; `add-hires.js` adds a hires row
line-level (existing rows are replaced in place, never re-emitted). Always draw the remapped boxes on the
new plate before applying, then re-run the API checker on the new plate and seal the result.

## Hard rules the briefs carry

- No text may say where or when the owner saw a work ("you saw it at …"), and no sentence may place the
  reader physically in front of it ("step back", "up close", "from across the room", "whoever stands
  before it"). Store-wide sweeps 2026-10-27: `sighting_build.js` (owner-sighting lines) and the step-back
  sweep (`.dtmp/replate3/stepback_sweep.json`).
- No apparatus in reader text: plate, crop, zoom, pixels, "the catalogue says", "the museum's file".
- British spelling in new text. Holder records (museum pages, open data, Wayback copies) outrank
  Wikipedia; hedge where the holder hedges.

## Lessons

- The API checker over-strips identifications (blurs named things into "shapes"); seals restore them from
  the holder's own description. It also misreads left/right and gaze — the seals caught several.
- Check that the plate is the painting: three plates were gallery photos of the framed work (Dalí,
  two Degas) and were re-plated from holder images.
- Duplicate keys in art-about.js make apply-repairs throw ("2 key matches"); runtime uses the later copy.
