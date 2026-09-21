> Part of the fuad.au docs — start at [/GUIDE.md](/GUIDE.md)

# The mood pipeline — how every lyric got a valence, a register, and sometimes a confession

The methodology behind `genius-mood.json` and everything that reads it: the track mood card,
the calibrated/cathartic chips, the Explore register row, the emotional weather and its
Stories. Written 2026-08-28, after the recalibration arc completed.

## 1. Two instruments, one axis

**NRC (the first instrument, 2026-08).** A word-count lexicon: every lyric word looked up in
an emotion dictionary, valence = the balance of bright vs dark words, plus a dominant emotion
category (trust/fear/joy…). Cheap, corpus-wide, and blind to meaning — "love, light, heaven"
at a funeral scores happy. The canonical failure: Idioteque at valence 100.

**The whole-lyric model (the second instrument, 2026-08-27).** A local 7B language model
(4-bit, on the house GPU — no lyric ever leaves the machine) reads the ENTIRE lyric and
answers one strict-JSON question. The system prompt, verbatim — this paragraph IS the
methodology:

> You are a precise analyst of song lyrics. Given a lyric, output STRICT JSON only:
> {"valence": <0-100 integer, the emotional darkness/brightness of what the lyric MEANS
> (0=devastating/bleak, 50=neutral/ambivalent, 100=joyful/tender), judged by meaning, not by
> surface vocabulary>, "register": <one of "bleak","anguished","angry","defiant",
> "bittersweet","neutral","tender","joyful">, "mask": <true if the lyric wears a
> bright/playful/childlike surface over dark content, else false>}. Irony, sarcasm and masks
> must be scored by the underlying meaning. No other text.

Three judgments per track: **valence** (how bright the *meaning* is), **register** (what
*kind* of feeling — a fixed nine-word taxonomy; stray outputs like "satanic"/"corrosive" map
back into it), **mask** (bright surface over dark content — the Take On Me / Rosenrot class).
Valence and register are INDEPENDENT reads of the same lyric, and their disagreement is
informative — see §4.

## 2. The row schema

`genius-mood.json` maps `artistslug~trackslug` (via lib-slug; non-Latin names hash) to:

```
[valence, emoIdx, words, flag?, regIdx?]
```

- `valence` 0-100 — NRC's originally; the model's where replaced.
- `emoIdx` — NRC's dominant emotion category (kept even where valence was replaced; -1 on
  rows that never had an NRC pass).
- `words` — NRC's matched-word count (0 on model-only rows).
- `flag` — provenance: absent = plain NRC · `1` = valence IS the model's ·
  `2` = **cathartic** (NRC valence KEPT, see §4).
- `regIdx` — index into `['anguished','bittersweet','bleak','tender','angry','defiant',
  'joyful','neutral','bitter']` (order is load-bearing — the UI hard-codes it, and REG_HUES
  in rotation-media.jsx assigns each a hue: anguished 290 · bleak 250 · bitter 110 ·
  angry 25 · bittersweet 320 · tender 350 · neutral grey · defiant 45 · joyful 85).

## 3. The replacement was gated, not blind

Chronology, each step approved before shipping:

1. **Surgical pass** — only NRC-bright rows (≥55) re-read; replaced only when the model said
   ≤40. Caught 4,416 false-brights (51% of the bright side!) — masks like Idioteque 100→20.
2. **Full-corpus pass** — everything scored (~5.7h GPU). Finding: the model doesn't darken
   the corpus, it UN-HEDGES it — means equal, but NRC's mushy 41-60 middle (31.7% of tracks)
   collapsed to 8.9%, mass moving to both tails. Median 40→30.
3. **Gated full replacement** — the model's valence everywhere it agrees with itself:
   24,300 rows flagged `1`. The 926 self-contradicting rows kept NRC and became flag `2`.
4. **The Japanese gap-fill** (2026-08-28) — the earlier passes had almost no Japanese lyrics
   to read (CJK coverage 1.5% vs 42.6% Latin). Fetched from LRCLIB **by real names** (never
   de-slugged), exact then fuzzy-with-artist-gate: +570 rows as `[v,-1,0,1,regIdx]`.
   Residual floor: 362 tracks with no obtainable lyric. The same sweep caught a few
   English-language artists the earlier passes had missed entirely (Smashing Pumpkins was
   0/77 scored).

## 4. The coherence gate, and why "cathartic" exists

The two judgments can contradict: **a bright valence (≥60) over a dark register**. Nearly
always the same phenomenon — *triumphant aggression* (thrash catharsis, hip-hop bravado,
electro-punk swagger): the lyric MEANS fury but FEELS like victory. One number cannot hold
both, and the honest policies differ by situation:

- **Existing rows**: keep NRC's valence (the axis is defined meaning-first, and fury is
  dark-side under that definition), set flag `2`, and NAME the tension — the "cathartic"
  chip: *reads furious, feels triumphant*. 926 rows.
- **New rows** (gap-fill, no NRC fallback): refuse to create the row. The 10 refusals live
  in `REJECTED_READS.md` (local workshop) with per-case analysis. The failure pattern is a
  vocabulary-selection miss: the taxonomy HAS the right word for bright-aggressive
  ("defiant", a bright register) and the model reaches for "angry" while its valence follows
  the swagger.
- The reverse direction (dark value over bright register) occurred ZERO times corpus-wide —
  the model's confusion is one-directional.

Mask turned out weaker than it looks: it fires on 64.5% of the corpus, so it's a disposition
of the model, not a diagnostic; it played no role in the final gates.

## 5. Where it surfaces

- **Track mood card**: Sounds (Spotify audio valence) and Reads (this pipeline) bars on ONE
  moving colour ramp (violet 0 → gold 100), so divergence reads as colour contrast; the note
  names the register on flagged rows; renders on a lyric read ALONE when audio features are
  missing. Chips: `calibrated` / `cathartic` (quiet ink-faint meta).
- **Explore**: a Register filter row under Themes — artists by play-weighted dominant
  register (`rec.rg`), REG_HUES swatches.
- **Emotional weather + Stories**: divergence gates recentred to the post-recalibration
  distribution (reads-dark ≤22, reads-bright ≥45; the old 38/58 gates had flooded to 64%/24%);
  cathartic rows classify as dark-reads; copy names the dominant register with NRC-emotion
  fallback.
- **Registers as filters, not badges** — "anguished" covers 50.5% of the corpus, so as a
  badge it would be wallpaper; as a filter, the scarce classes (joyful 1.9%) become the
  interesting queries.

## 6. Workshop and limits

> **Superseded in part on 2026-09-21 — see §7.** The pipeline is now a set of TRACKED tools at
> `rotation/tools/` (README there), and the "no obtainable lyric" floor below was re-tested by
> a new refetch stage. `.sptmp/nrc-audit/` still exists and is still precious — it holds the
> raw model outputs for 25,583 keys, the only record of what the instrument said before the
> emit gates touched it — but it is no longer where the pipeline lives.

The pipeline lives in the local (untracked) workshop `.sptmp/nrc-audit/`: the scorer and its
resumable store, the emit scripts (v2 surgical → v6 gap-fill, each with dry-run proofs:
byte-preservation of untouched elements, count assertions, sample prints), the gap-fill
fetchers, and `REJECTED_READS.md`. Lyrics stay in the workshop, never tracked, never in
agent prompts.

Known limits, accepted: 362 tracks with no obtainable lyric (cached as negatives so nothing
refetches them); instrumental artists correctly absent; the parked artist "register
signature" pilot (8 artists computed and printed, awaiting more reads); the 10 rejected
reads awaiting the owner's study; and valence remains one number — the register and the
flags exist precisely because one number was never going to be enough.

---

## 7. 2026-09-21 — the tools become tracked, and the corpus closes

Two things happened on this date, and neither of them changed the **instrument**. Everything
in §1–§5 still describes what the numbers mean; this section records where the machinery now
lives and how far it now reaches.

### 7.1 The pipeline is tracked (`rotation/tools/`)

The scorer, the themes classifier, their prompts, taxonomies, gates and emitters used to live
in the untracked workshop this document's §6 describes. They are now **tracked tools** at
[`rotation/tools/`](tools/README.md) — owner rule 2026-09-21, *"we can't have tools like these
disposable."*

**Read `rotation/tools/README.md` before running anything mood- or themes-related.** It is the
operational document (stack of record, quick start, per-file reference, write discipline, the
run logs); this file stays the *methodology* document — what valence, register, mask and the
coherence gate mean. They are deliberately not duplicates.

What is tracked: scripts, prompts, taxonomies, requirements + lockfile, the setup script.
What is still never tracked: the venv, the model weights, **lyric text in any form**, the work
JSONLs and score stores. The tools reference those by path.

The reproduction is character-for-character — same model (`Qwen2.5-7B-Instruct`, bitsandbytes
nf4), same prompt, same truncation, same decoding — because new rows have to be comparable
with the ~25k already in the store. **There is no llama.cpp / GGUF path and adding one is not
a maintenance decision:** a different quantisation is a different instrument and would have to
be re-gated against the corpus the way §3 describes. Before the full runs, a fidelity re-score
of 50 already-classified tracks measured valence MAD 1.02 overall — **0.54 with byte-identical
text, at 100% register match** — and the themes holdout hit 99.1% top-1 against an 80% bar.

### 7.2 The refetch stage (new, ahead of scoring)

The old pipeline could only score keys whose lyric text was already on disk, so the backlog had
a silent floor: keys whose one fetch attempt had failed. Two new tools sit ahead of the scorer:

- **`lyric-names.js`** resolves a lyric KEY back to the REAL artist/track name by replaying the
  scrobble CSV through the coherency ledger (`folds.json` + `track-merge.json`) and keying it
  with `lib-slug`. This is the prerequisite for any fetch — **de-slugging a key to guess a title
  is forbidden** (§3's Japanese gap-fill rule, now enforced by a tool). It named 949 of 949 of
  the queue, including **119 keys the raw CSV alone could not resolve** because their titles
  were folded *after* the lyric key was minted.
- **`lyric-refetch.py`** fetches what no store holds and caches an honest negative for anything
  that genuinely has none.

Result: **806 of 984 textless keys reclaimed (81.9%)**. The finding that justifies the stage —
**93.5% of the 2026-07 cached fetch-errors were rate-limit scars, not missing lyrics.** A
shortest-qualifying-text rule caught **21 translation mispicks** where the exact hit came back
in the wrong language (`megitsune` en→ja and friends). What remains is cached as a real
negative: 114 absent, 51 instrumental, 13 too short.

### 7.3 `hard` → `defiant` (taxonomy, owner-ruled)

Across 3,048 generations the model emitted exactly one register outside the fixed taxonomy —
`hard`, echoing a song title. Owner ruling: **a "hard" register is swagger, not rage**, so it
maps to `defiant` (the bright-aggressive slot §4 says the model under-reaches for), not to
`angry`. The mapping lives in the scorer's remap table; the nine-word taxonomy in §1 is
unchanged.

### 7.4 The corpus as it now stands

| | before | after |
|---|---|---|
| `genius-mood.json` rows | 25,847 | **28,752** |
| `genius-themes.json` rows | 25,466 | **28,375** (+ the `_themes` names key) |
| mood coverage of the lyric layer | 88.97% | **99.07%** |
| themes coverage of the lyric layer | 88.53% | **98.64%** |

Coverage is counted against `genius-lyrics.json`'s 28,755 keys, **not** as rows ÷ keys — both
stores hold some rows for keys the lyric layer no longer lists (folds, retired spellings), and
counting those would flatter the number.

3,048 generations produced **zero unparseable replies and zero unmapped registers**. The point
of a 12% enlargement is that it should not move the distribution, and it does not: median
valence 30 → 30, the mushy middle 9.84% → 9.87%, every register share moving by under a third
of a point, and the largest of eighteen theme shifts **+0.97 pts** (`madness & the mind`). The
§5 reference gates hold on the new rows read alone. **The enlargement confirms the instrument
rather than bending it.**

Downstream, the change that matters is the **denominator**: the Lyrical diet and everything
else reading `THEMES` now rests on 28,375 themed tracks instead of 25,466. On the 2026-09-21
build that is `THEMES.covered` = 28,253 tracks carrying **236,194 of 322,927 plays — 73.1% of
the library by plays** (`THEMES.coveredPlays` / `THEMES.totalPlays`, both shipped for exactly
this honesty line).

### 7.5 What is left is a ceiling, not a backlog

The work queue is drained. Of `genius-lyrics.json`'s 28,755 keys:

| still unclassified | mood | themes |
|---|---|---|
| no obtainable lyric | 110 | 73 |
| instrumental (correctly absent) | 54 | 29 |
| body too short to score | 13 | 11 |
| scored, **refused by the coherence gate** | 91 | — |
| no theme above the 0.24 floor | — | 277 |
| **total** | **268** | **390** |

The two refusal classes are not gaps in the data. The **91** are §4's *triumphant aggression*
exactly: a bright valence over a dark register on a row with no NRC valence to fall back on,
so it is refused rather than flagged `2` — the new-row policy working as designed, at scale.
The **277** are tracks the anchor space genuinely has no bucket for: near-wordless hooks,
ad-libs, spoken intros. Both are documented as limits in LIMITATIONS.md §8.

### 7.6 The straggler rows, and the in-place path — CLOSED 2026-09-21

**59 pre-Qwen rows were scored but unwritten.** They were three-element rows from before the
model pass (49 with a null valence, 10 with an NRC valence and no register); 52 had obtainable
lyrics and were scored on this instrument, and 51 cleared both gates.

They could not go in through the emitters, because writing them means **mutating existing
rows** — and every emit proof in the pipeline exists to forbid exactly that. `mood-emit.js`'s
proofs 1 and 2 fail *by construction* on an in-place update, which is the guarantee that a
maintenance run can never silently rewrite scored history. **That guarantee was kept rather
than weakened:** mutation got its own tool with **mutation-shaped proofs** instead.

**`tools/mood-update.js`** (owner-approved) takes an explicit **allowlist** derived from the
straggler scores, and proves itself differently: **proof A is a masked serialisation showing
every non-allowlisted row byte-identical** — the in-place equivalent of the emitter's
byte-prefix check — plus schema, round-trip and fault-injection covering nine named refusal
classes. It is **idempotent**: a second run refuses all 51 as already-full-read.

**51 rows now carry the instrument of record** (`[v, emoIdx, words, 1, regIdx]`, with NRC's
`emoIdx`/`words` preserved verbatim — 42 had been NULL-valence, 9 NRC-only). The store stayed
at **28,752 rows, +120 bytes** (flag `1` rows 27,767 → 27,818): a mutation, not a growth.
**8 remain three-element honestly** — 3 instrumentals and 4 not-found that never reached the
scorer, and 1 refused by the coherence gate (the triumphant-aggression class again). The §7.5
ceiling table is unchanged by this write.

**The rule that came out of it, and the one to keep:** mutation is legitimate only for a
**superseding first read** — a row that never had a real answer. It is **never** a re-run over
an already-read row. The append-only emitter stays the default path; `tools/README.md` carries
the contract.
