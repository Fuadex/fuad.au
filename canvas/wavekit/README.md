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
   repair → reads (Info, Interpretation, `beside`, `infodisp`) → `build-cold.js` + one blind cold reader per ~5 works ON FABLE 5.0 (see below) →
   COLD_RULINGS → seal (WEB / PLATE / TEMPLATE, one agent for a small wave, halves for a large one) → SEAL RULING →
   seal edit → gates → merge dry proof → print → Fuad's verdict → `node mergeNN.js --write` → `validate-refs.js` →
   `.sptmp/check-public-dates.js` (untracked by design) → `git commit -F` → push.
4. Record every ruling as an R-item in the workshop's `QUEUE.md` and the stage state in `DISPATCH_LOG.md`.

## Subagent mode (waves 39–41, Fuad 2026-11-11: "don't use API") — the current default
Every drafting and looking stage is a `canvas-opus` subagent; the orchestrator writes the fusions and rules every finding as
an R-item. Per wave: plates (look at every candidate whole on contact sheets; `tile.py` for flat files, `tile_iiif.py <id>
<info.json>` re-cuts the 3x3 grid from IIIF regions at native scale where a server caps full images, e.g. the NGA's 4096 px)
→ `build-canon.js`, `build-pre.js`, `mkpreblind.js`, `build-corpus-index.js`, `build-beside-candidates.js`,
`build-used-companions.js` → `_blockNN.md` + `_mkbriefsNN.py` (stage briefs cut from the wave-36 set, RULE_CARD frame +
LESSON_LEDGER from the previous wave) → research ∥ phase 1 in waves of five → fusion → phase 2 (`mkp2.py` assembles `out_tour_` from phase 1 + the drafter's `p2_` lenses) → crops → audit
→ repair → reads → cold → seal (WEB h1/h2, PLATE, TEMPLATE) → SEAL EDIT h1/h2 → cold edit → gates → dry proof → print →
verdict → merge. Wave 40/41 workshops (`.dtmp/tourwave40`, `.dtmp/tourwave41`) hold the full working set to copy from.
- **Cold readers run on FABLE 5.0** (Fuad 2026-11-11), never `model:"fable"` (that is Fable 5.1). Preferred:
  `subagent_type: "canvas-cold"` (`.claude/agents/canvas-cold.md`, pinned `claude-fable-5`; agent types load at session start).
  If it is not loaded, the working route is the headless CLI bundled with the VS Code extension, run from inside `cold/` with
  `COLD_BRIEF.md` copied in and the prompt on stdin:
  `~/.vscode/extensions/anthropic.claude-code-<latest>-win32-x64/resources/native-binary/claude.exe -p --model claude-fable-5
  --allowedTools "Read,Write,Glob" --output-format json < promptA.txt > runA.json` — `modelUsage` in the JSON confirms
  `claude-fable-5`. (`claude` is not on PATH.)
- Rebuild the `cold/` packets AFTER the seal edits (`build-cold.js` reads the current files), so readers see sealed text.
- Ruling patterns that held: the drafter's refusals of fusion lines are usually right (about 25 a wave) — accept them in the
  R-item and carry the correction forward; every "Step back / Seen whole / From a step back" closer falls (lessons 55/57) —
  rebuild as a detail closer on what no stop boxes, or cut; the PLATE seal checks every new visual claim in Info/Interp/
  beside and every companion claim at the companion's own plate.

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
- An `art_hires` zoom row can point at a DIFFERENT PAINTING from the canon row (wave 41: the Sower's zoomed the
  Kröller-Müller's June 1888 canvas under the Van Gogh Museum's November one). Check the hi-res row's inventory against the
  canon qid at plate time and fix it through the merge's `REPLACE_PLATES`.
- The app shows `w.img` from the canon row first. An `art_hires` row alone only upgrades the zoom, so swapping a wrong
  image needs the canon row's `img` / `imgGrid` / `imgZoom`, plus `art_imgsize.js` and the palette.

## API-eye mode (wave 37, Fuad 2026-11-09: "reading the artwork … gets billed by API … rest you'd be doing yourself")
Every LOOKING stage can run through the Anthropic Messages API instead of a subagent: `apieye.js` (copy into the workshop with
`apieye_tool.py` as `tool.py` and `briefs/ASK_BRIEF.md`). Modes: `p1 <id>` (the blind phase 1 — RULE_CARD + PHASE1/STUDY/EYE briefs,
the plate, the tile grid, `zoom`/`colour` tools on the full-resolution plate), `audit <id>` (the independent audit, its whole-image
account FORCED first by a two-turn exchange — the tour is sent only after the account comes back), `ask <id> <q.md> [--plate f]
[--tag t]` (plate questions: plate identity, every repaired visual claim, the seal's PLATE role, companion plates), `cold <LETTER>
<ids>` (the visitor cold read on Fable 5.1 — API mode only; cold readers are Fable 5.0 since wave 41, see Subagent mode). The key is read from `fuad.au/.env`; spend goes to `api_spend.jsonl`. Replies are parsed
leniently (`fixjson.js` repairs an unescaped quote). The orchestrator writes research, fusion, phase 2, the repair text, the reads and
the seal's WEB/TEMPLATE roles itself, and sends every changed visual claim back to the plate (`ask`) before it ships — in wave 37
those checks refuted about twenty of the orchestrator's own repair wordings. `patch.py <id> <patches.json> [--tag repair|seal]`
applies exact-span patches (each OLD must occur once) with a backup. Wave 37 cost ≈ $33 for ten works at list prices (p1 ≈ $1,
audit ≈ $0.8, each ask ≈ $0.15–0.6, a cold packet of five ≈ $1.6).

## Wave 44 notes (2026-11-14)
- `merge-template.js` accepts keyed refs: a tour lens may carry `refs` keyed by field in `out_tour_<id>.json`
  (`{about: [...]}`); the merge combines it with the beside's as `{about: [...], beside: [...]}` and the final proof checks each
  ref's text once in ITS field (`validate-refs.js` already understood the keyed shape).
- `briefs/COLD_EDIT.md` is the cold-edit brief (rename NN per wave). Its BATCH step defers wholly to COLD_RULINGS ## BATCH —
  wave 43's quota line had survived into wave 44's copy and two agents asked whether it was a standing rule.
- The SEAL / SEAL EDIT briefs' KNOWN lists are wave-specific: write them fresh from the R-items' SEAL WATCH lines once all reads
  are in (wave 44: SEAL_BRIEF44 written from R40–R56).
- `briefs/LESSON_LEDGER.md` now runs to lesson 108 (101–108 were added in waves 42–44 but lived only in the workshops).
- `../tonegate.js` knows works on paper (graphite, pencil, gouache, pastel, paper count as concrete craft nouns).
- A plate that is not on Commons (wave 44's Guercino: the holder's own photograph via its Wayback capture) needs the canon row's
  hand-set `img` to point at the SAME plate, because the tour boxes are fractions of the displayed image; keep a light
  `imgGrid` thumbnail, and set `art_imgsize.js` to the plate's true size.
