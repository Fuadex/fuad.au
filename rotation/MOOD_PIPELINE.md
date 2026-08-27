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
4. **The Japanese gap-fill** (2026-08-28) — the lyric archive holds no Japanese repertoire at
   all (full-scan proven), so CJK coverage was 1.5% vs 42.6% Latin. Fetched from LRCLIB **by
   real names** (never de-slugged), exact then fuzzy-with-artist-gate: +570 rows as
   `[v,-1,0,1,regIdx]`. Residual floor: 362 tracks absent from every held source. Also swept
   in pure name-join misses (Smashing Pumpkins was 0/77 scored — an English-language miss,
   not a Japanese one).

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
