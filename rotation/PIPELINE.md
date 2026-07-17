> Part of the fuad.au docs — start at [/GUIDE.md](/GUIDE.md)

# PIPELINE.md — the reads / blurb wave process

How Rotation's editorial layer (`llm-about.js`, 15,018 per-song reads as of 2026-07-18) is produced, and the
process any future wave — for Rotation, Culture blurbs, or Canvas artwork reads — should
follow. The workshop scripts themselves live OUTSIDE the repo (untracked, at the GitHub root
`../.sptmp/`); this file is the committed record of the *shape* of the process, so it can be
audited and re-run cold.

## The five stages

```
 1. LEDGER      one JSON state file, one row per unit of work (track/title/artwork),
                idempotent — records what exists, what's done, what's excluded and why.
                Rotation: blurb-state.json (keyed artistSlug~trackSlug via lib-slug.js).
 2. TARGETS     a driver script reads the ledger + a FLOOR rule (e.g. plays ≥ N, has lyrics,
                not instrumental) and emits numbered batch files (~50–100 units each):
                batch-NN.json — everything a worker needs, nothing it must look up.
 3. WAVES       batches are dispatched to model workers IN PHASES, never all at once
                (3–5 parallel, wait, next phase). Model tiering: Haiku = bulk gist,
                Sonnet = standard read, Opus/Fable = deep or difficult units only.
                Culture wishlist blurbs were the exception: single-voice, authored inline.
 4. MERGE       one merge script folds out-*.json / batch outputs into the shipped data
                file, stamping the ledger. Idempotent: re-runs skip stamped rows; curated
                human content ALWAYS wins over generated (note beats blurb, Genius beats
                Haiku). Strip BOM before JSON.parse (subagent files often carry one).
 5. VERIFY      count coverage (merged X / eligible Y), spot-check on-site, run
                smoke-test.js (key shape, entry-count floor), THEN commit + push.
```

## Invariants (the audit checklist)

- **Keys**: always `require("./lib-slug")` — never a hand-copied slug (the 2026-07 CJK
  incident: a re-typed plain slug collapsed all non-latin artists onto one key).
- **Provenance tags**: every generated entry carries its source (`haiku`/`sonnet`/`opus`/
  `web`/`fable`), rendered as a visible brand in the UI. Human sources always outrank.
- **Exclusions are data**: instrumentals, gibberish, no-lyrics units get recorded as
  excluded in the ledger (not silently skipped) so the next wave doesn't re-spend on them.
- **Waves are resumable**: any interruption loses at most one un-merged batch; the ledger +
  numbered batch files mean "resume from batch N" is always well-defined.
- **Cost control is phasing**: the checkpoint between phases is where volume is approved.
  Nothing runs unattended past a phase boundary.
- **Coverage claim at the end**: a wave isn't done until the merge prints `X / Y eligible`
  and the number is explained (Y − X = exclusions, not mystery).

## Current state (2026-07-18)

- Rotation reads: **15,018 entries** in `llm-about.js` (one entry per line — this format is
  mandatory; merge scripts must preserve it). `blurb-demo.js` retired: all reads folded in.
  `instrumentals.js` (351 keys) deployed: TrackView shows "Instrumental — no words to read" for
  these tracks instead of an empty read slot.
- Wave A (≥5 plays) effectively done. Wave B (3–4 plays, ~2.2k) and Wave C (=2 plays, ~3.5k)
  remain gated pending corpus scale decisions. Liner-notes redo and C→B taxonomy consolidation
  also remain open.
- Culture wishlist blurbs: COMPLETE — 1,340/1,340 no-note items (batches 01–15).

**Caching note:** rotation's `?v` stamps are automatic (content hash at stage via `stage-site.js
stampHashes`); canvas is now the same. Culture's runtime script injection reuses the SW epoch
but its data files remain manually cache-busted via the epoch on each deploy.
