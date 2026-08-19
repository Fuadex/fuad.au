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

## Coverage (2026-08-15)

623 Info · 169 Interpretations (66 badged `deepBy: "Sonnet 4.6"`) · 309 study tours
(all QC'd — see QC_LEDGER.md). The `web` tier is retired (§5b). Backfill batches 1+2
(29 works) ran the full §5b pipeline with fused Infos `by: "Fable 5"`. Backfill queue:
142 works with a tour but no Interpretation. The Milkmaid pilot study gained its 6
anchored `deeper` chapters (Rijks provenance in the synthesis stop; c. 1660 dating
adopted museum-wide — canon, Info, tour context). Voice rule reaffirmed the hard way:
reads state facts, they never cite the label/source that supplied them (Fuad,
2026-08-15, on "the Rijksmuseum's own label makes the point exactly").

---

## 10. Artist reads (`art_artists.js`) — approved 2026-08-19

A third tier, sitting on the artist page under the compressed header. Two or three
sentences. **Not** a biography and **not** a summary of the collection.

### What killed the first pilot

The first eight drafts were collection statistics rewritten as prose — "152 works, 83 met,
across eleven museums". Fuad's verdict was exact: *"The texts do not contain the style, how
or why those artists painted and they don't contain any hook whatsoever that would make them
interesting."* The numbers were already on screen as chips; restating them in sentences added
nothing and displaced the only thing prose can do.

### The shape that was approved

Three moves, in this order:

1. **How the work is made.** The physical fact — broken colour and no black; paint laid thick
   enough to catch raking light; separate dots left for the eye to combine. Something you
   could verify by standing in front of it.
2. **Why it is made that way.** The intent behind the method. Monet chasing the *envelope* of
   air rather than the haystack; Seurat putting painting on a scientific footing; Dahl
   refusing to idealise a landscape.
3. **A hook that reframes.** One concrete, verifiable fact that changes how the work reads —
   the late water lilies painted half-blind with cataracts; Rembrandt bankrupt in 1656 and
   painting better afterwards; Vermeer leaving thirty-four pictures and being forgotten for
   two centuries.

### The collection tie-back — only when it is real

A closing line connecting to Fuad's canon is **optional and evidence-gated**. Use it when the
connection explains something:

- Turner's bequest condition explains why nearly every Turner he has met is at Tate Britain.
- Dahl's cloud studies being private research explains why eight of his fifteen are drawings.
- Knud Baade trained under Dahl in Dresden — **the two Norwegians in the collection are
  teacher and student**, a link nothing in the metadata surfaces.

Do not manufacture one. An artist with three works and no star has no tie-back worth writing,
and padding is worse than silence.

### Rules carried over

- **Numbers only when they explain.** "Eight of your fifteen are drawings" earns its place
  because it follows from the biography; "42 works, 20 met" does not.
- Reads state facts, they never cite the label or source that supplied them (§9).
- Second person, matching the site's existing "works you haven't met".
- No title/venue restating — the chips above already carry both.

### Coverage gate

Not all 554 artists. Write one where there is something to say: **≥3 works, OR a floored
work, OR an existing read**. Everything else keeps the bare Wikidata descriptor already shown
in the sub line.

### QC — a mandatory fact-check pass (Fuad 2026-08-19, binding)

These make confident factual claims about real people — attributions, dates, bequest terms,
illnesses, causes of death — and the hook rule in step 3 actively *rewards* the striking claim,
which is precisely where fluent prose invents. **No artist read merges unverified.**

**Procedure**

1. **Atomise.** Split each draft into its individual assertions. "Sold almost nothing while
   alive, wrote over 800 letters, and most of what you'd recognise came from the final two
   years" is three claims, not one, and they fail independently.
2. **Swarm.** Sonnet verifiers, batched by artist, one verdict per claim against the open web:
   CONFIRMED / WRONG / UNVERIFIABLE, with a correction where it is wrong.
3. **Opus adjudication.** The verifier's confidence is not the verdict — assume overconfidence
   in both directions (`feedback_qc_print_protocol`). A verifier arguing from general knowledge
   loses to a specific source; a verifier that found no source has not proven a negative.
4. **Print only the genuine unsures.** Confirmations do not need Fuad's attention.

**Failure modes, ranked by how plausible they look**

- **Numbers that sound right.** "About eighty self-portraits", "over 800 letters", "thirty-four
  paintings" — round, quotable, and exactly the shape of a half-remembered figure.
- **Attractive anecdotes.** Turner lashed to a mast; Rodin accused of casting from life. Some
  are documented, some are studio legend repeated until it hardened. Legend is usable only if
  the read says it is legend.
- **Causal claims.** "Cataracts explain the late colour"; "arthritis meant the brush was
  strapped to his hand". The condition is often documented while the causal link is contested.
- **Turning-point dates.** Bankruptcy years, first exhibitions, rejections.

**Resolution rule.** Cut rather than soften. A hook that has to be hedged into "is said to
have" was not a hook worth having — hedging is how an unverified claim survives QC.

**VERIFY THE CORRECTION TOO (Fuad 2026-08-19, learned the hard way).** A verifier that finds
a real error will often hand back a replacement claim, and that replacement arrives with all
the authority of having just caught you out — which is exactly why it gets adopted unchecked.
It happened on the first run: the draft said cataracts explained Monet's late violets, the
verifier corrected it to "his lens-less eye could reach into ultraviolet", and that went
straight into the revision. Fuad queried it and it collapsed. The UV story is circular — the
only evidence is that the post-1923 paintings turned bluer, which is then explained by
inferring UV vision from those same paintings — and a mundane explanation covers it entirely:
removing a yellowed cataractous lens restores cool-tone perception.

A correction is a new claim. It gets the same treatment as the claim it replaces, and
**prefer the boring explanation** — the exotic one is what makes a good story, which is
precisely the pressure this pass exists to resist.
