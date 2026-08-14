> Part of the fuad.au docs — start at [/GUIDE.md](/GUIDE.md)

# Info / Interpretation reads — writing spec (`art-about.js`)

The two-tier reads on the artwork page: `about` (Info) and `deep` (Interpretation). Tours
are the layer beneath and have their own spec — **[STUDY_SPEC.md](STUDY_SPEC.md)**
(`art_inspect.js`).

Written 2026-08-13 from the surviving evidence after this methodology went undocumented for
a month and was reconstructed wrong twice in one session. Sources: the `about21` workshop
(`.dtmp/about21/build.js`, `ABOUT21-REVIEW.md`), the seven hook-first Info campaign commits,
and the A/B rulings of 2026-07-30 → 2026-08-05 (commits a67c492 → be8369a, b2d9ff3).

---

## 1. The cascade

**Study tour → Interpretation → Info.** Work flows downhill; each stage distils the one
above. Verified against the corpus: all 21 works in the about21 batch had tours first, and
the derivation is visible — Hodler's tour `craft` opens "Parallelism, in Hodler's own use of
the word, is not symmetry but repetition… Here it runs at three scales", and the
Interpretation compresses exactly that, pulling its remaining detail from the stops.

**Consequence: the Interpretation tier can never exceed the tour tier.** Tours are the
ceiling. To grow Interpretations, tour more works first. Never write a paired read from an
Info line alone — that error produced the discarded Orsay drafts of 2026-08-13.

## 2. Model split (settled by direct A/B — do not re-litigate)

| Stage | Model | Shape |
|---|---|---|
| Study tour | **Opus**, one agent per work | from the image; facts + anchored boxes |
| Interpretation | **Sonnet, ONE agent per artwork** | from the tour; interpretive voice |
| Info | distilled from the Interpretation | hook-first, facts web-verified |

Fuad's verdict, 2026-08-05, same six works through both models: *"opus feels very mechanical
compared to sonnet which I prefer."* Sonnet is the `deep` voice. Opus keeps the tour layer.

**ONE SONNET AGENT PER ARTWORK** (Fuad 2026-08-13, tightening the earlier swarm rule). The
original instruction was "do a swarm instead of just one subagent" (2026-07-30) because one
agent handling ~10 works in a row drifts into sameness — repeated openers, repeated rhythm,
thinner attention per work. Splitting 2–4 ways reduced that; **one agent per work removes it
entirely** and gives each read full attention. An N-work batch = N Sonnet agents, phased in
waves of ~5 to avoid launching a dozen at once.

**Agents still do not self-coordinate: cross-check openers across the whole batch
afterwards** (a Sonnet run repeated "What" and needed a seal). This is now the main residual
risk of the per-work model and is a mandatory QC step, not an optional one.

## 3. The unit of decision is THE READ, not the model

Triage each work before drafting:

- **Single-crux** — the models converge on one reading. Keep one tight crux-first read
  (~150–170w). Opus won these in A/B (Seurat = frozen system, Cézanne = flicker) by leading
  with the crux.
- **Multi-facet** — the models diverge, which is the signal that the work supports several
  readings. **Synthesize** them under one unifying idea, showing each as a facet. Longer is
  fine. Sonnet won the genuinely multi-facet case (Great Wave), where breadth is earned.

**⚠ Encapsulate the whole work — never cherry-pick** (Fuad 2026-08-05). The Milkmaid carries
four readings (humble subject elevated, the ultramarine wager, arrested time with only the
milk moving, the miraculous bare wall); the shipped read holds all four under "total
attention as reverence" (b2d9ff3). It took three passes: draft 1 drifted by duplicating the
Info, draft 2 over-corrected by isolating one facet, draft 3 synthesized. **This overrides
the old don't-repeat-the-Info rule** — the Info is only a compact orienting hook, so the
Interpretation MAY re-touch its angle as one facet. Capturing the work beats avoiding
overlap. (Cherry-pick risk is specific to interpretively rich works; single-crux works are
already whole with one thesis.)

## 4. Drafting brief — Sonnet voice, Opus discipline

Shared brief for the drafters. Distil from the tour's **about / craft / context** lenses
(plus stops as needed): **no new facts, no re-verification — the tour is already verified.**

**TOUR-ONLY SOURCING (Fuad 2026-08-14, explicit).** The tour is the ONLY fact source for an
Interpretation. The existing Info, the `web` field, and canon prose are NOT sources — do not
even hand them to drafters as "context": a d2 drafter laundered an existing-Info fact (the
Samson AI-study line) into a deep read that way. Job files for drafters should carry the
canon row + tour and nothing else.

- Length (Fuad 2026-08-14, superseding the earlier soft-only ruling): **target ~140–170**
  in the brief — drafts inflate past their target anyway, so aim low. At QC, measured:
  **≤200 ships as-is; 200–240 is QC's judgement call; >240 gets trimmed.** Trims must never
  cost a concrete anchor (a date, an exhibition, a named detail) — losing one is always a
  downgrade; cut restatement, not material.
- One evocative paragraph. **Lead with the unifying idea** (rich works) or **the single
  crux** (settled works) — the best line goes FIRST.
- BANNED openers: framing-fact ("Among roughly eighty…"), theory-first ("X had absorbed the
  theory…"), "What…", "This painting…", the artist's name. Vary the opener.
- No exclamation marks (corpus: 0/110). No quotation marks (corpus: 0/110). No
  masterpiece talk. Second person IS allowed — 36% of the shipped corpus uses you/your;
  an earlier ban here was unsourced and struck 2026-08-14 per Fuad.
- Do not back-load the payoff (Sonnet's habitual failure).
- **De-boilerplate recurring formulas** (Fuad 2026-08-14): when a construction keeps coming
  back across a batch ("X is the (real/whole) subject", "X is the argument"), recast those
  instances as direct statements — same anti-convergence logic as the opener seal. This is
  a QC fix on repeats, not a ban on any single natural use.

**FUSE for best-of-both** where two drafts each have something: keep the winner's spine,
graft the other's sharpest insight (Impression = Sonnet synthesis rebuilt around the prior
read's tonal trick, be8369a). A fuller synthesis that DROPS a shorter read's killer line is
a downgrade.

## 5. Info distillation

Distilled from the finished Interpretation. One sentence, or two short ones — the about21
reference batch runs **35–49 words (average 41)**; match it. It leads with a **hook** (the
fact or image that pulls a reader in — who the sitter actually was, what the place is, the
one compositional decision) and carries the identification.

**Every fact in the hook is web-verified.** This pass is where canon errors surface — the
campaign caught A Burial at Ornans 1841 → 1850 and The Painter's Studio 1850 → 1855. Fix the
canon row in the same commit.

**The Info re-words, never re-uses** (Fuad verdict 2026-08-14; measurement: the first
30-work distil wave lifted Interpretation sentences verbatim, up to 14 shared 4-grams).
Before merge, check 4-gram overlap of the Info against that work's `deep`: identification
and fixed fact-phrasings (names, dates, prices, measurements) are exempt; descriptive
sentence reuse is a redraft.

### 5b. The fused Info — CURRENT METHODOLOGY (Fuad, coined 2026-08-15)

The pipeline per work: **study tour → hook-Info (background, facts web-verified) →
Interpretation (tour-only sourcing) → distil-Info (from the Interpretation) → ONE fused
Info** replacing both. For new works, fuse at writing time — background hook + at most one
crux — instead of shipping two Infos and merging later.

The fused Info (all rulings 2026-08-14/15, tested on a 6-work sample then 33-work rollout):
- **Background/impact first** — the story is what a glancing reader wants ("what they'll be
  interested in: Background"). Every hook fact survives: anecdotes, names, dates, prices;
  quotes keep their quotation marks.
- **No visual walkthrough** — describing what's on the painting is the Interpretation's job.
- **No venue line, no title restatement** — the UI shows both. Identify via artist + year
  woven in ("Courbet's 1850 canvas…").
- **Crux line OPTIONAL** — at most one, and only a concrete, specific observation
  ("betrayal takes the shape of tenderness"; the oranges as the only saturated colour).
  Editorial commentary ("a century of unease") is the fluff class — end on facts instead.
- **Length free** — whatever the facts need (shipped batch runs ~44–74 words).
- Canon dates win over legacy hook text. No facts from outside tour/hook/Interpretation.

The `web:` tier and Web button existed for one day (2026-08-14) and were retired by this
fusion — superseded hooks live in git history, their facts inside the fused Infos.

## 6. QC and merge

1. **Fact-check every specific against the tour — including fusions and swaps.** Grep the
   tour blob for each named fact/date before commit (a fusion agent once introduced "Louis
   Leroy"; it happened to be tour-grounded, but it was not verified at the time).
2. **Cross-check openers** across the swarm's output; seal repeats.
3. `seenConfidence` governs person-address exactly as in STUDY_SPEC.md — "you saw/met this"
   only for canon-`sure`; `probably`/`unsure` get institutional phrasing.
4. **Badge honestly** — see below.
5. **Merge insertion-only** (insert `deep:` + `deepBy:` before `by:`) with a vm round-trip
   byte-identity proof: every untouched entry identical, count delta equals batch size.
6. **Print both tiers for Fuad's verdict — nothing merges unapproved.**

## 7. Badging (there is a real mechanism, not a convention)

`by` is ONE entry-level field rendered "via {by}" under BOTH tiers (canvas-app.jsx, two
render sites), so a Sonnet `deep` under an Opus Info cannot reuse it. A per-tier **`deepBy`**
field was added for this (commit a67c492); both sites resolve
`(tier === "deep" && X.deepBy) ? X.deepBy : (X.by || "Fable")`.

- Opus Info + Sonnet Interpretation → `by: "Opus 4.8"`, `deepBy: "Sonnet 4.6"`.
- Both tiers Sonnet (work had no prior Info) → `by: "Sonnet 4.6"`, no `deepBy`.
- Never launder a Sonnet read under the Opus badge.

## 8. Two production modes (do not conflate)

- **Paired production** (the cascade above) — flagship / recently-toured works, both tiers
  together. 101 works.
- **Bulk Info campaign** — seven hook-first waves shipped `Info-only entries (about +
  by:"Opus 4.8", no deep)` to reach full coverage of the imaged canon (45 → 622). Authored
  directly, hook first, facts verified; never distilled from an Interpretation because none
  existed. This is why the corpus reads 623 Info against 101 Interpretations — the coverage
  campaign simply ran ahead of the paired production.

**Backfill queue:** the 210 works that HAVE a tour but no Interpretation. Run stage 2 on
those, then decide per work whether the campaign-era Info should be re-distilled from the new
Interpretation (usually yes — it was written without one). Works with neither tour nor
Interpretation need a tour first.

## 9. Rule governance (Fuad 2026-08-14 — binding)

**New rules are PROPOSED, never imposed.** Any addition, tightening, or hardening of this
spec must be flagged to Fuad as a proposal and get his explicit verdict before it is applied
to content. Every rule in this spec must cite its source — a dated Fuad ruling or a corpus
measurement. A rule that cannot be traced to one of those is not a rule; strike it.
(History: an unsourced second-person ban and a hardened word ceiling both reached shipped
content in August 2026 before being caught. This section exists so that cannot recur.)

## Coverage (2026-08-14)

623 Info · 140 Interpretations (37 badged `deepBy: "Sonnet 4.6"`) · 39 `web` hooks
(9 tours10 recoveries + 30 superseded campaign Infos) · 309 study tours (all QC'd —
see QC_LEDGER.md). Backfill queue: 169 works with a tour but no Interpretation.
