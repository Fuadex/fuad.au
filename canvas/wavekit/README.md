# wavekit — the mv 6 tour-wave toolkit (tracked 2026-10-20, after wave 29)

The runners, gates and briefs that took waves 20–29 from a work id to a merged tour, Info, Interpretation and
`beside`. Until now they lived only in untracked `.dtmp/tourwaveNN/` workshops, copied forward wave to wave; this folder
is their durable home. The methodology itself is `../STUDY_SPEC.md` and `../READS_SPEC.md` (read both end to end before a
wave). The common brief is SPLIT (2026-11-05 token audit, Fuad-approved, after wave 35 ran ~35M subagent tokens at
~1.7M/work): `briefs/RULE_CARD.md` (~10KB — the binding rules plus the per-wave block) is what every agent reads;
`briefs/LESSON_LEDGER.md` (the numbered lessons, growing each wave) is read WHOLE only by the audit and the seal —
every other stage looks up cited lesson numbers and nothing more. New wave lessons append to the ledger; new RULES
(rare, Fuad-ruled) go on the card. Never recombine them: the old all-in-one BRIEF_common cost ~1.4M tokens per wave
in re-reads alone.

## The token diet (2026-11-05, binding for new waves)
- **8–10 works per wave, no more.** Twenty works made the collision block huge for every reader and the wave paused
  mid-flight anyway. Smaller waves shrink collisions, QUEUE.md and RESUME.md quadratically.
- **Vision by stage:** phase 1/2 study the full tile grid (that IS the study); the audit views the plate, every
  cited box and a 2–3 tile spot-check, never the full grid; repair views only the boxes its edits touch; reads
  re-view only crops carrying a visual claim.
- **CORPUS_INDEX.txt is grep-only** for agents (~400KB; a full read is ~100K tokens). Candidates are pre-picked into
  `beside_candidates.json` by the orchestrator.
- Stage briefs POINT at the card; they never restate its blocks (the old AUDIT_BRIEF duplicated the collision block
  verbatim — every auditor paid for it twice).

## Starting a wave

1. `mkdir .dtmp/tourwaveNN` (outside the repo). Copy every `*.js` / `*.py` here into it and change the workshop path
   constant at the top of the scripts that have one (`build-canon.js`, `build-pre.js`, `build-corpus-index.js`,
   `build-beside-candidates.js`, `crops.py`). Copy `merge-template.js` to `mergeNN.js` and fill `PLATES`,
   `REPLACE_PLATES`, `RETOUR`; list any re-tour in `build-canon.js`'s `RETOUR` too.
2. Write `ids.json`, then the briefs: copy `briefs/*` and fill every `<<WAVE-SPECIFIC …>>` placeholder in RULE_CARD.md and the stage briefs (the slate, the
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
- ⚠ `gate-label.js` and `gate-quarantine.js` take WORK IDS (`node gate-label.js <id> [<id> …]`). Run with `.` they loop
  over nothing and print CLEAN — wave 36's agents reported vacuous CLEANs that way until a reads agent noticed. Brief every
  agent with the id form; `bandgate.js`, `tonegate.js`, `coverage.js`, `count-reads.js`, `infogate.js` and `besidegate.js`
  take the workshop directory. The canvas/ counters (`bandgate`, `tonegate`, `stopvar`, `rule11-check`) are not in this
  folder: copy them into the workshop at seeding.
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

## API-eye mode (wave 37, Fuad 2026-11-09: "reading the artwork … gets billed by API … rest you'd be doing yourself")
Every LOOKING stage can run through the Anthropic Messages API instead of a subagent: `apieye.js` (copy into the workshop with
`apieye_tool.py` as `tool.py` and `briefs/ASK_BRIEF.md`). Modes: `p1 <id>` (the blind phase 1 — RULE_CARD + PHASE1/STUDY/EYE briefs,
the plate, the tile grid, `zoom`/`colour` tools on the full-resolution plate), `audit <id>` (the independent audit, its whole-image
account FORCED first by a two-turn exchange — the tour is sent only after the account comes back), `ask <id> <q.md> [--plate f]
[--tag t]` (plate questions: plate identity, every repaired visual claim, the seal's PLATE role, companion plates), `cold <LETTER>
<ids>` (the visitor cold read on Fable 5.1). The key is read from `fuad.au/.env`; spend goes to `api_spend.jsonl`. Replies are parsed
leniently (`fixjson.js` repairs an unescaped quote). The orchestrator writes research, fusion, phase 2, the repair text, the reads and
the seal's WEB/TEMPLATE roles itself, and sends every changed visual claim back to the plate (`ask`) before it ships — in wave 37
those checks refuted about twenty of the orchestrator's own repair wordings. `patch.py <id> <patches.json> [--tag repair|seal]`
applies exact-span patches (each OLD must occur once) with a backup. Wave 37 cost ≈ $33 for ten works at list prices (p1 ≈ $1,
audit ≈ $0.8, each ask ≈ $0.15–0.6, a cold packet of five ≈ $1.6).
