# wavekit — the mv 6 tour-wave toolkit (tracked 2026-10-20, after wave 29)

The runners, gates and briefs that took waves 20–29 from a work id to a merged tour, Info, Interpretation and
`beside`. Until now they lived only in untracked `.dtmp/tourwaveNN/` workshops, copied forward wave to wave; this folder
is their durable home. The methodology itself is `../STUDY_SPEC.md` and `../READS_SPEC.md` (read both end to end before a
wave); `briefs/BRIEF_common.md` carries the lesson ledger (lessons 1–72) that every agent obeys.

## Starting a wave

1. `mkdir .dtmp/tourwaveNN` (outside the repo). Copy every `*.js` / `*.py` here into it and change the workshop path
   constant at the top of the scripts that have one (`build-canon.js`, `build-pre.js`, `build-corpus-index.js`,
   `build-beside-candidates.js`, `crops.py`). Copy `merge-template.js` to `mergeNN.js` and fill `PLATES`,
   `REPLACE_PLATES`, `RETOUR`; list any re-tour in `build-canon.js`'s `RETOUR` too.
2. Write `ids.json`, then the briefs: copy `briefs/*` and fill every `<<WAVE-SPECIFIC …>>` placeholder (the slate, the
   voices, collisions, the store's spent lessons, medium blocks). A sighting in the masked window gets a ⛔ BLACKOUT
   section in the workshop copy only. Never copy that section, or any date or venue from it, into a tracked file, a
   commit message or a print.
3. Run the stages, one `canvas-opus` agent per work per stage (Opus 5.5; audit with
   `python fuad.au/rotation/tools/check-subagent-models.py --session <id>`):
   plate hunt → research ∥ blind phase 1 (`preblind_` files, so phase 1 never sees shipped text) → fusion (allocation,
   not a source: every fusion line is a claim the drafter checks) → phase 2 → `crops.py` → audit → one consolidated
   repair → reads (Info, Interpretation, `beside`, `infodisp`) → `build-cold.js` + one blind cold reader per ~8 works →
   COLD_RULINGS → seal (WEB / PLATE / TEMPLATE, one agent for a small wave, halves for a large one) → SEAL RULING →
   seal edit → gates → merge dry proof → print → Fuad's verdict → `node mergeNN.js --write` → `validate-refs.js` →
   `.sptmp/check-public-dates.js` (untracked by design) → `git commit -F` → push.
4. Record every ruling as an R-item in the workshop's `QUEUE.md` and the stage state in `DISPATCH_LOG.md`.

## Gates
- In this folder: `gate-quarantine.js`, `gate-label.js`, `besidegate.js`, `count-reads.js`, `coverage.js`,
  `crossgram.js`, `check-newrefs.js`, `unitcheck.js`, `sealscan21.js`, `tokdiff.js`, `validate-refs.js` (the corpus-wide
  refs gate; a copy of `fuad.au/.dtmp/tourqc-pass/validate-refs.js`, which is gitignored).
- In `../`: `bandgate.js`, `tonegate.js`, `stopvar.js` (the word counter of record), `rule11-check.js`, `corpus-health.js`.

## Reads dispositions (`infodisp_<id>.md`, first line `DISPOSITION: …`)
`NEW` (no entry yet) · `REPLACE` (Info rewritten from scratch; legacy claims retired with sources) · `LEAVE` (keep the
Info, add the Interpretation) · `KEEP` (re-tour only: shipped reads untouched) · `PROPOSE-REPLACE` (drafts of both tiers
that ship only on Fuad's separate verdict). The merge resolves PROPOSE-REPLACE to KEEP unless run with
`--approve-proposed=<id,…>`. It tests for PROPOSE-REPLACE first because a bare `\bREPLACE\b` matches inside it.

## Repairs after a merge (data-flag lane)
`extract-entry.js <id>` dumps a work's shipped tour, reads, hi-res row, canon row and Wikidata cache. A repair agent
writes `tour_<id>.json` (the full entry) and/or `reads_<id>.json` (`{about, deep}`). `splice-repairs.js <ids…> [--write]`
splices them in and proves that every other entry is unchanged. Canon-row fixes (`artworks.js`) are hand edits, with a
`//` comment above the row giving the source. `year` is one integer, and any range goes in the comment.

## Gotchas this kit already paid for
- `core.autocrlf=true`: `artworks.js`, `art-about.js` and the palette files can be CRLF working copies over LF blobs.
  Every splicer normalises to LF on read. Anchors written with `\n` silently fail otherwise.
- `art_inspect.js` entries come in three layouts (no indent multi-line, one-space multi-line, two-space one-liner). Match
  keys at any line-start indent and keep the entry's layout.
- The Windows filesystem is case-insensitive: an agent output named `seal_wNN.md` overwrites the brief `SEAL_WNN.md`.
  Give outputs and briefs different stems.
- Write scanners and patches with the Write/Edit tools, never heredocs. Heredocs mangle `\n` inside string literals.
- An image matcher's pick is not an identity. Pin a sighting against Fuad's own photo, and keep sister versions apart
  (plaster ≠ marble ≠ bronze cast; a replica mural ≠ the canvas).
- The app shows `w.img` from the canon row first. An `art_hires` row alone only upgrades the zoom, so swapping a wrong
  image needs the canon row's `img` / `imgGrid` / `imgZoom`, plus `art_imgsize.js` and the palette.
