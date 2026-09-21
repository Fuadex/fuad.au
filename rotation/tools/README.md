> Part of the fuad.au docs — start at [/GUIDE.md](/GUIDE.md) · methodology in
> [rotation/MOOD_PIPELINE.md](../MOOD_PIPELINE.md)

# rotation/tools — the lyric mood + themes pipelines

The two local-model pipelines that produce `rotation/genius-mood.json` and
`rotation/genius-themes.json`, rebuilt as **tracked, durable tools**.

They used to live in untracked scratch workshops (`.sptmp/nrc-audit/`, loose scripts in
`.sptmp/`) and a `.sptmp` cleanup came close to taking them with it. The rule now: *the
things that rebuild an environment are tracked; the environment itself is not.*

**What is tracked** — everything in this directory. Scripts, prompts, taxonomies, gates,
requirements, this README.

**What is never tracked** — the venv (`.sptmp/mlenv/`), the model weights
(`.sptmp/models/`), lyric text in any form, the work JSONLs, the score stores. All of it is
reproducible from what is tracked, and none of it may enter the repository.

---

## The stack of record

Both pipelines are *reproductions*, not reimplementations. The corpus already holds ~25k
mood rows and ~25k themes rows scored by a specific instrument, and new rows have to be
comparable with them. Model, quantisation, prompt, truncation and decoding are copied
character for character from the runs that built those rows.

| | mood | themes |
|---|---|---|
| model | `Qwen/Qwen2.5-7B-Instruct` | `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` |
| precision | bitsandbytes **nf4** 4-bit, fp16 compute, double-quant | fp32 |
| driver | python `transformers`, `AutoModelForCausalLM` + `apply_chat_template` | `sentence-transformers` |
| device | CUDA (RTX 3070, 8 GB) | CUDA |
| original run | 2026-08-27 (`.sptmp/nrc-audit/llm_score_rest.py`) | 2026-07-05 (`.sptmp/genius-themes.py`) |

**There is no llama.cpp / GGUF path, and adding one is not a maintenance decision.** A
different quantisation is a different instrument and would have to be re-gated against the
corpus the way MOOD_PIPELINE.md §3 describes. If the transformers stack ever stops
installing, stop and raise it.

### Environment as measured 2026-09-21

Python 3.14 (the only interpreter on PATH) **cannot** run this: there are no cp314 wheels
for CUDA torch or bitsandbytes, and the old 3.14 venv had silently resolved to
`torch 2.12.1+cpu` — a CPU-only wheel that cannot load an nf4 model at all. The fix is a
second interpreter, not a substitute model:

```powershell
winget install --id Python.Python.3.12 --scope user --silent
```

The resolved set that works (`requirements-mlenv.lock.txt` holds the exact freeze):

```
python 3.12.10 · torch 2.14.0+cu126 · bitsandbytes 0.50.2 · transformers 4.57.6
accelerate 1.15.0 · sentence-transformers 5.7.0 · tokenizers 0.22.2 · numpy 2.5.3
driver 560.94 / CUDA 12.6 · NVIDIA GeForce RTX 3070, 8 GiB
```

---

## Quick start

```powershell
# 1. build the venv + pull both models (~16 GB into .sptmp/models, untracked)
powershell -ExecutionPolicy Bypass -File rotation\tools\setup-mlenv.ps1 -Force -Freeze

# from here on
$VPY  = 'C:\Users\Fuad\Documents\GitHub\.sptmp\mlenv\Scripts\python.exe'
$env:HF_HOME = 'C:\Users\Fuad\Documents\GitHub\.sptmp\models'
$S    = 'C:\Users\Fuad\Documents\GitHub\.sptmp'

# 2. resolve the work queue to lyric text (scratch only)
& $VPY rotation\tools\lyric-extract.py --missing-from mood --out $S\mood-work\todo.jsonl

# 3. score (resumable — re-run after any crash, it picks up where it stopped)
& $VPY rotation\tools\mood-score.py --in $S\mood-work\todo.jsonl --store $S\mood-work\scores.jsonl

# 4. prove, then (only on the owner's verdict) write
node rotation\tools\mood-emit.js --store $S\mood-work\scores.jsonl
node rotation\tools\mood-emit.js --store $S\mood-work\scores.jsonl --write

# themes: same shape
& $VPY rotation\tools\lyric-extract.py --missing-from themes --out $S\themes-work\todo.jsonl
& $VPY rotation\tools\themes-embed.py --in $S\themes-work\todo.jsonl --store $S\themes-work\themes.jsonl
node rotation\tools\themes-emit.js --store $S\themes-work\themes.jsonl
```

`setup-mlenv.ps1` is ASCII-only on purpose: Windows PowerShell 5.1 reads `.ps1` as ANSI and
turns UTF-8 punctuation into parse errors. Keep it that way.

---

## The files

| file | does |
|---|---|
| `setup-mlenv.ps1` | rebuilds the untracked venv at `.sptmp/mlenv`, installs CUDA torch from the cu126 index, verifies, pulls weights, optionally freezes the lock file |
| `requirements-mlenv.txt` | everything except torch (torch comes from the CUDA index; pinning it here would pull the CPU wheel) |
| `requirements-mlenv.lock.txt` | exact freeze of a known-good build |
| `probe-mlenv.py` | refuses the environment unless CUDA is live, VRAM is sufficient, and bitsandbytes / transformers / sentence-transformers all import. Setup aborts on failure |
| `fetch-models.py` | pulls both models into `HF_HOME` (= `.sptmp/models`) |
| `lyric-extract.py` | **the only script that opens a lyric store.** Resolves keys → text from the on-disk stores, writes a scratch JSONL. Target modes: `--missing-from`, `--scored-sample`, `--themed-sample`, `--keys-file` |
| `mood-score.py` | the scorer. Verbatim prompt + decoding, strict-JSON parse, register remap, append-only crash-safe resumable store |
| `mood-emit.js` | merges scores into `genius-mood.json` with four proofs. Dry-run by default |
| `mood-fidelity.js` | re-score vs the 2026-08 raw outputs: valence MAD, register top-1, mask agreement |
| `themes-embed.py` | the themes classifier + the calibration gate (`--calibrate`) |
| `themes-emit.js` | merges themes into `genius-themes.json` with four proofs. Dry-run by default |

---

## Where lyric text actually lives

`rotation/genius-lyrics.json` is **metadata only** — `key → [lang, tag, year, wc, uniq]`.
It has no lyric text in it. The text lives in the untracked scratch tree, in four places,
and `lyric-extract.py` searches them in this order:

| store | rows | what it is |
|---|---|---|
| `.sptmp/lrclib-lyrics.json` | 36,111 keys, 14,260 with text | the LRCLIB fetch cache. Also caches negatives (`{ok:false}`), fetch errors (`{err}`) and instrumentals (`{instrumental:true}`) so nothing refetches them |
| `.sptmp/genius-text.json` | 7,220 | extracted dump text |
| `.sptmp/nrc-audit/*.jsonl` | ~26k across four files | the 2026-08 extractions (`rest_`, `surgical_`, `calib_`, `gap-`). These carry text for keys that are *already* scored — they are what the fidelity re-score runs on |
| `rotation/archive_genius.zip` | 3.26 GB | the original dump stream. Opt-in (`--sources ...,zip`), minutes per run, needs `.sptmp/our-tracks.json` for its artist/title index |

**The 2026-08 workshop survived.** `.sptmp/nrc-audit/` still holds the original scorers,
all six emitters, `REJECTED_READS.md`, and `llm_scores.json` — the raw model outputs for
25,583 keys. That store is the fidelity baseline and should be preserved; it is the only
record of what the instrument said before the emit gates touched it.

---

## The mood pipeline

Row schema (MOOD_PIPELINE.md §2), keyed `artistslug~trackslug`:

```
[valence, emoIdx, words, flag?, regIdx?]
```

A row this pipeline creates is always `[v, -1, 0, 1, regIdx]` — no NRC pass behind it, so
emoIdx `-1`, words `0`, flag `1` ("valence IS the model's").

**Register taxonomy.** `regIdx` indexes
`['anguished','bittersweet','bleak','tender','angry','defiant','joyful','neutral','bitter']`
and **the order is load-bearing** — the UI hard-codes it and `REG_HUES` in
`rotation-media.jsx` assigns hues by index. The model answers outside its own eight-word
taxonomy often enough that a remap is part of the method; `STRAY_MAP` (identical in
`mood-score.py` and `mood-emit.js`) carries the strays the 2026-08 corpus pass actually
produced. An unmapped stray is **never guessed at**: the scorer counts it and the emitter
refuses the row until a human adds the mapping.

**The coherence gate** (MOOD_PIPELINE.md §4). A bright valence over a dark register is the
*triumphant aggression* failure — the lyric means fury but feels like victory. Existing
rows keep NRC's valence and become flag `2` ("cathartic"). A **new** row has no NRC
fallback, so it is refused outright:

```
incoherent = (v >= 60 && DARK.has(rawReg)) || (v <= 40 && BRIGHT.has(rawReg))
```

The gate reads the **raw** register, before the remap — same as `emit_v3`/`emit_v6`.

### Reference gates (MOOD_PIPELINE.md §5)

A batch that lands far from these wants explaining before it is emitted:

- median valence ≈ 30 after the model pass (NRC's was 40)
- the mushy 41–60 middle should be ~9% of rows, not NRC's 31.7%
- `anguished` ≈ 50% of the corpus, `joyful` ≈ 1.9%
- `mask` fires on ~64.5% of tracks — a disposition of the model, not a diagnostic

---

## The themes pipeline

`genius-themes.json` holds `key → [[themeIdx, score], ...]`, up to three, plus the
18-bucket chart under `_themes`. The chart order is load-bearing the same way the register
order is; `themes-embed.py` asserts its own anchor list against the tracked `_themes` at
startup and aborts on drift.

Method: two hand-written anchor sentences per bucket, embedded and L2-normalised; a track's
score for a bucket is the **max** cosine over that bucket's anchors (not a centroid — the
two anchors deliberately cover two different faces of each theme, and averaging blurs
both); top 3 above a **0.24 floor**, stored as `round(cos * 100)`; lyric truncated to 2,200
chars; bodies under 80 chars are not themed at all.

**Why not centroids from the existing labels.** The brief suggested deriving centroids from
the labels already in `genius-themes.json`. Those labels *are* this anchor space's output,
so label-centroids would inherit its decisions while losing the two-faces-per-bucket
resolution — a copy with worse edges. The anchor space is the vocabulary anchor. The
`--calibrate` gate is what measures whether it has been reproduced faithfully.

### The calibration gate

```powershell
& $VPY rotation\tools\lyric-extract.py --themed-sample 2547 --out $S\themes-work\holdout.jsonl
& $VPY rotation\tools\themes-embed.py  --in $S\themes-work\holdout.jsonl --calibrate
```

Holds out 10% of already-labelled tracks, classifies them blind, and reports top-1
agreement, top-3 containment both ways, mean Jaccard over the top-3 sets, score delta on
shared themes, and a confusion summary.

**The bar is ~80% top-1.** Below it, do not run the corpus — the documented fallback is
Qwen2.5-7B-Instruct classifying into the 18 **named** buckets directly (the same scorer
stack as `mood-score.py`), and that substitution is the owner's call, not a maintenance
decision.

---

## Privacy rules (hard)

- No lyric text in any tracked file, report, log line, commit message, or agent prompt.
  Keys and numbers only.
- Lyric text is written **only** under the scratch tree. `lyric-extract.py`,
  `mood-score.py` and `themes-embed.py` each refuse an output path outside it.
- No dataset-provenance names in tracked files.
- The venv and the weights stay untracked; the scripts that rebuild them are the artefact.

## Write discipline

`mood-emit.js` and `themes-emit.js` are **dry-run by default** and `--write` is the only
path to the tracked file. Both print four proofs before the gate and both **refuse to
write** if any proof fails:

1. the chart / vocabulary is untouched (themes: `_themes` byte-identical and still first)
2. no pre-existing row mutated or deleted — deep equality over every pre-existing key
3. **byte prefix** — the new serialisation must begin with the old file's exact bytes minus
   its closing brace, so new keys can only ever be appended
4. counts reconcile — `created + every skip reason == examined`, and
   `keysAfter - keysBefore == created`

Both files are single-line minified JSON on disk (`JSON.stringify`, no indent). Keep it.

---

## Pilot of record — 2026-09-21

The rebuild's acceptance run. Nothing was written to either tracked file; every emit below
is a dry run.

### Fidelity — does the rebuilt scorer still score like the original?

50 tracks that already had scores, re-scored blind and compared to the raw 2026-08 model
outputs in `llm_scores.json`:

| | |
|---|---|
| valence MAD | **1.02 points** |
| valence exactly equal | 42/50 (84.0%) · within ±5: 96.0% |
| register top-1 match | **49/50 (98.0%)** |
| mask agreement | 49/50 (98.0%) |
| vs the shipped `flag=1` rows | MAD 1.04, register 98.0% |

Broken down by which store the lyric text came from, the residual is **lyric-source
variance, not library drift**:

| text source | n | valence MAD | exact | register |
|---|---|---|---|---|
| workshop JSONL (byte-identical to the 2026-08 input) | 28 | **0.54** | 89% | **100%** |
| genius-text | 19 | 1.21 | 84% | 95% |
| lrclib (a *different transcription* of the same song) | 3 | 4.33 | 33% | 100% |

The single register disagreement was `bleak → anguished` — adjacent on the dark side.

### Mood distribution vs the MOOD_PIPELINE §5 reference gates

| | corpus reference | fidelity 50 | pilot, natural sample | pilot, language-stratified |
|---|---|---|---|---|
| median valence | 30 | 30 | **30** | 50 |
| 41–60 "mushy middle" | 8.9% | 6.0% | **4.0%** | 12.0% |
| `anguished` share | ~50.5% | 56% | **60%** | 30% |
| `mask` fires | 64.5% | 62.0% | **58.0%** | 56.0% |

The natural sample sits on the gates. The language-stratified sample deliberately over-
weights non-English (3 EN of 50 against a queue that is 87% EN) and reads markedly brighter
and more `tender` — worth a look before the corpus run, but on ~47 tracks it is soft.

### Throughput

| | |
|---|---|
| this rebuild | **0.98–1.02 s/track ≈ 60 tracks/min**, model load 9–11 s, VRAM 5.19 GiB |
| the 2026-08 original | 1.30 s/track (from `rest_run.log`, 15,700 tracks in 5h41m) |
| projected full mood run | **2,231 scoreable keys ≈ 37 minutes** |
| themes, embedding | 1,032 tracks/s on GPU (612/s CPU) — the whole queue in seconds |

### Themes calibration gate

10% holdout, 2,546 already-labelled tracks classified blind:

| | |
|---|---|
| **top-1 agreement** | **2,522/2,546 = 99.1%** (bar 80%) — PASS |
| new top-1 inside old top-3 | 99.8% · old top-1 inside new top-3: 99.7% |
| top-3 set Jaccard (mean) | 0.989 |
| score delta on shared themes | mean 0.08 pts · median 0 · max 12 |

And the same source breakdown, which is the real result:

| text source | n | disagreement |
|---|---|---|
| workshop JSONL (byte-identical input) | 1,642 | **0.00%** |
| genius-text | 728 | 0.14% |
| lrclib (different transcription) | 176 | 13.07% |

**Zero disagreements wherever the lyric text is the same.** The classifier is an exact
reproduction; every miss is a different transcription of the same song.

### Emit dry-runs

| | mood | themes |
|---|---|---|
| rows staged | 95 created from 99 scored | 2,416 created from 2,637 |
| refused | 3 incoherent (v≥60 over a DARK register), 1 unmapped register | 221 below the 0.24 floor on every bucket |
| proofs | 4/4 PASS | 4/4 PASS |
| appended bytes | 3,959 | 126,668 |
| distribution | median 32, mean 45.6 | picks/track 2.95 vs 2.95; score mean 41.2 vs 41.1 |

The emitters were also fault-injected with synthetic stores (out-of-range theme index,
sub-floor score, four picks, the reserved `_themes` key, an unmapped register, an
already-present key, a null score). Every bad row was refused by name and the proofs still
passed.

### Open rulings

- **`"hard"` is a new stray register** — the model produced it once in the pilot and it is
  not in `STRAY_MAP`. The scorer flagged it and the emitter refused the row, as designed.
  It wants a mapping (`angry`? `defiant`?) before the corpus run. Owner's call.
- The language-stratified brightness skew above.
- The 974 keys with no lyric text on disk (below).

## Known limits

- **The work queue, measured 2026-09-21.** `genius-lyrics.json` holds 28,755 keys;
  `genius-mood.json` 25,847 and `genius-themes.json` 25,466 (+`_themes`).

  | | unclassified | lyric text on disk | needs a refetch |
  |---|---|---|---|
  | mood | 3,173 | **2,231** | 942 |
  | themes | 3,299 | **2,661** | 638 |

  The mood shortfall breaks down as 594 never fetched, 243 cached fetch-errors, 79
  not-found, 20 too short to score, 6 instrumental. **The refetch stage is not built** —
  LRCLIB fetchers exist in `.sptmp/nrc-audit/fetch-lrclib*.js` and fetch **by real names,
  never de-slugged**; whether to run one is the owner's call.
- 362 corpus tracks were already accepted as having no obtainable lyric (MOOD_PIPELINE.md
  §6) and are cached as negatives.
- The ten rejected gap-fill reads from 2026-08 still sit in
  `.sptmp/nrc-audit/REJECTED_READS.md` awaiting the owner's study.
