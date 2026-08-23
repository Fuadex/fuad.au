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

**~~TOUR-ONLY SOURCING~~ — SUPERSEDED 2026-08-24. THE FENCE IS DOWN.** The deep tier MAY carry
story, biography, scandal, what happened to the picture afterwards. Tour-only sourcing is what
starved it: the Info above had already spent the story, so the deep was left with
thesis-and-proof prose. Job files now carry canon row + tour + the current Info + current deep.
The 2026-08-14 laundering worry is answered by the caption-Info rule instead — a 35-word Info has
almost nothing to launder. The superseded rule read: The tour is the ONLY fact source for an
Interpretation. The existing Info, the `web` field, and canon prose are NOT sources — do not
even hand them to drafters as "context": a d2 drafter laundered an existing-Info fact (the
Samson AI-study line) into a deep read that way. Job files for drafters should carry the
canon row + tour and nothing else.

- **Length — SUPERSEDED 2026-08-24. Target 95–115 words, against an Info of 32–38: roughly 3:1.**
  Sourced to Fuad naming *Woman with a Parasol* and *Szał Uniesień* as the bar. Measured: those
  two run 32w/95w at 3.0×; the corpus had drifted to 90w/168w at 1.9×, at which point the tiers
  read as two essays about one painting rather than a hook and a reading. **The count is a
  TARGET, not a gate** — QC judges whether an overrun buys anything; cut restatement and
  scaffolding, keep material, never pad up to it. The superseded band read:
- Length (Fuad 2026-08-14; tightened 2026-08-23 — "a bit elongated... not all but many"):
  **target ~130–150** in the brief — drafts inflate past any target, so aim low. At QC:
  **<180 ships as-is; ≥180 gets a trim-first look; >240 always trimmed.** Trims must never
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
- **No home-collection, acquisition or bequest lines** (Fuad 2026-08-22 ×2: '"Its home is
  Stockholm's Nationalmuseum" — we already include location', and '"came to France with the
  Walter-Guillaume collection" and bequest stuff shouldn't cut through either'). The UI carries
  the venue; ownership mechanics — who bequeathed, what fund bought, what inventory number —
  never earn their words. Provenance survives ONLY as a genuine event-story (the Cartoon's 1962
  public appeal and 1987 shotgun attack). The Turner Bequest register is read as the works'
  BIOGRAPHY (unexhibited, found in the studio, given to the nation), not ownership — it stays.
- **A short honest read beats a padded one** (Fuad 2026-08-22, wave-1 QC: three Nordic reads
  shipped generic artist-bio filler because no work-specific fact had surfaced). When research
  yields no distinguishing fact, write two tight sentences — never inflate with genre boilerplate.
- **THE WORK IS THE SUBJECT — the paste test** (Fuad 2026-08-22, wave-2 QC: a Boldini read
  "says everything but anything about the artwork itself"). A read that could be pasted under a
  different work by the same artist FAILS. At least one load-bearing sentence must be about THIS
  object — its subject, scale, medium, series membership, making or cataloguing circumstances.
  Artist biography is scaffolding around that anchor, never the building. When nothing
  work-specific verifies beyond subject + date, the short form anchors on exactly those.
- **The image-look economics** (Fuad 2026-08-22: "OCR is expensive — if you're looking at the
  image, you should move onto doing the tour and deep reads; otherwise it makes no sense to
  spend the tokens on an info paragraph. But first Opus should work extra hard to find publicly
  existing information"). The ladder is: (1) research HARD — the per-painting agent's fetch
  budget rises and multiple languages/museum catalogues are in scope; (2) if work-specific facts
  surface, the Info ships on them, no image needed; (3) if research genuinely exhausts, do NOT
  view the image for an Info alone — route the work into PAIRED PRODUCTION (§8): the one
  image-look then feeds tour + Interpretation + fused Info together, amortised. Viewing an
  image to write only an Info paragraph is a spec violation on cost grounds.
- **Batch-production note** (Fuad 2026-08-22): scale waves run **one research subagent per
  painting**, not per slice — ten works per agent produced template-feel: six near-identical
  Bequest backstories and dimension-line tails on eight of ten reads. Per-work agents cannot
  converge on a template; the assembly QC still cross-checks openers corpus-wide.

The `web:` tier and Web button existed for one day (2026-08-14) and were retired by this
fusion — superseded hooks live in git history, their facts inside the fused Infos.

## 5c. The caption Info and the two-tier contract — CURRENT (Fuad, 2026-08-24)

Measured against the two reads Fuad names as the bar, *Woman with a Parasol* and *Szał
Uniesień*: **Info 32w / deep 95w, a 3:1 ratio.** The corpus had drifted to 90w/168w at 1.9:1.
223 pairs were re-cut to the proportion and 142 Interpretations written fresh from existing
tours; the working instrument is `.dtmp/recut-sweep/BRIEF.md`, kept current.

**The Info is one breath — 32–38 words.** Who or what is in front of you, the date, and the ONE
fact that makes a stranger want to look. Everything else moves down into the deep. A fragment
with an em-dash is the house form; both exemplars are exactly that.

**Infos of 40 words or fewer are left alone — but read and fact-checked, not copied blind.** A
pilot passed through an Info dating L'Absinthe to 1876 against a canon row saying 1875, and a
Turner Info saying 1834 against a row saying 1837. Flag conflicts in a `note`, never pass them.

**NEVER WRITE THE LOCATION**, in either tier. No venue, no "its home is", no "you saw it at X"
— the viewer already shows where the work lives. **This beats the leave-alone rule**: a short
Info that names a museum gets the clause struck (Arlequin, ruled 2026-08-24). A venue survives
only when it carries an observation that is not the address — a genuine event-story (the 1914
suffragette attack on the Rokeby Venus), where a painter studied, or the work's own subject.
NOTE the trap: the brief once permitted "you saw it at X" for `sure` works while also banning
locations. Opus resolved the contradiction correctly by instinct; Sonnet took it literally and
**7 of 18 reads in one wave ended on a venue**. A known contradiction in an instruction is a
defect with a delay on it.

**THE TIERS MUST NOT COVER THE SAME GROUND — DEEPEN, NEVER RE-NAME.** If the Info owns a fact,
the deep may return to it only by going further into it. The failure: David's *Napoleon*, whose
Info gave "the clock past four, the candle burnt to nothing, a document lettered CODE" and whose
deep opened by naming all three again. The pass: *Woman with a Parasol*, where both tiers carry
the light-off-the-grass fact and the deep cashes it out — "there is almost no actual white."

**The measure, and why it is NOT a gate.** Share of the Info's distinctive words reappearing in
the deep: corpus mean 19%, healthy under 25%. But the highest score in the entire corpus, **58%,
belongs to *Woman with a Parasol*** — the exemplar. A threshold would condemn the best pair we
have. Treat a high score as a prompt to look, then judge the only question that matters: does
the deep deepen the shared fact or merely repeat it? **The §5 4-gram test cannot see this at
all** — it flagged 0 of the 8 works the word-share measure caught, because re-telling in fresh
wording shares no 4-grams.

**Model (Fuad 2026-08-24): Sonnet drafts Interpretations, Opus trims afterwards where they
overrun.** Badge `deepBy: "Sonnet 4.6"` — the read stays substantially Sonnet's. Where Opus
re-cut both tiers wholesale, the pair carries `by: "Opus 4.8"` and no `deepBy`.

### TESTED AND REJECTED 2026-08-24 — the making quota. Do not re-run.

A pass read Fuad's note that "the interpretations at times get into very descriptive motions" as
*every read owes a technique layer*, measured the legacy reads at 52% making-content, set that as
a bar and rewrote 15 reads to it. **All 15 rejected.** They bought technique by spending
anecdotes — the 'degas' scratched in the marble, the Cézanne its owner had already swapped for a
snow scene, the university shut three years later — and each grew ~15 words. Fuad: *"I don't
think the new ones are actually better - I did like the background stories and anecdotes and I
preferred the tighter versions."* Evidence kept at
`.dtmp/_rejected/making-patch-REJECTED-2026-08-24/`. **Do not reintroduce a making-share target.**

What the note actually meant is narrower: cut aimless description of **what is depicted** — this
at the left, that behind it — which never says why we are being shown it. Technique earns its
place when it IS the point (the Milkmaid's ultramarine, a pigment dearer than gold spent on a
servant's apron), not as a quota.

### A structural finding, not a rule

38% of swept reads ended on the same material as their tour's LAST STOP. The tour is organised
by region and flies the eye from area to area; the Interpretation is organised by an idea.
Choose the last line because it is the hardest thing you have, not because it is where the tour
stopped.

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

## Coverage (2026-08-24, post reshape + Interpretation backfill)

**792 Infos · 365 Interpretations · 363 study tours**, against 1,956 canon works. Every
Interpretation has an Info; all but two have a tour (`monet-nympheas-orangerie` and
`leech-the-sunshade` predate the tour-first rule and are recorded exceptions). **"Tour but no
Interpretation" is 0** — the backfill queue is empty.

Info lengths after the reshape: 60% are captions (≤40w), 29% sit at 41–70w, 11% above, 3 over
110w. Re-cut pairs average 36w/111w at 3.1×; 51 shipped Interpretations still carry the old
shape (deeps averaging 135w) — the mild tail, jobs built at `.dtmp/recut-sweep/batch5.json`,
never run.

## Coverage (2026-08-23, post floored batches fl1–fl3 + liked trial lk1) — SUPERSEDED

772 Info (23 from the lk1 liked-works trial, research-first Opus drafts `by: "Opus 4.8"` —
approved as the template for larger liked batches) · 205 Interpretations (111 badged
`deepBy: "Sonnet 4.6"`) · 345 study tours
· floored depth: 30 of 174 fully cascaded (tour + Interpretation + fused Info); 91 floored
  works still tourless
· **192 artist reads (§10) — the eligible gap is ZERO** · **53 museum reads** (`museum_about.js`,
see PIPELINE.md; every museum with a met work is covered, 28 unvisited ones deferred)
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

### Attribution is upstream of the gate (2026-08-21)

The gate counts works per `artistId`, so a broken attribution silently changes who qualifies.
Auditing it found three faults worth re-checking after any canon import:

- **The slug generator keys on the LAST TOKEN of a name.** Every "the Elder" collapsed to
  `elder` and every "the Younger" to `younger`, merging unrelated painters onto one page —
  Frans van Mieris sat on Bruegel's. `artists`, `lepaute` and `iii` are known surviving
  orphans (that last one slugged from a TITLE, because the work has no artist field).
- **The `unknown` catch-all collects named artists.** 51 works sat there; querying each work's
  own Wikidata qid for **P170 (creator)** recovered 33 of them. Klee's page had been showing 2 of
  his 11. Do this by query, never by reading the title.
- **Wikidata has migrated many labels from `en` to `mul`.** A label fetch with
  `languages=en` returns EMPTY while descriptions still resolve, which tempts you into naming
  the artist from the dates in the description. Q164720 reads "French painter (1900–1955)" and is
  Yves Tanguy, not who those dates suggest. Always fall back to `mul`.

An artist record may legitimately carry `qid: null` — Howard Thain has no Wikidata entity at
all. The UI guards on `a.qid` before drawing the Wikidata link, so null degrades cleanly and is
preferable to inventing a pseudo-qid.

### Coverage gate

Not all 554 artists. Write one where there is something to say: **≥3 works, OR a floored
work, OR an existing read**. Everything else keeps the bare Wikidata descriptor already shown
in the sub line.

### QC — runs by DEFAULT, as part of generating (Fuad 2026-08-19, binding)

**A batch of drafts is not finished until the fact-check has run.** Do not present drafts and
then offer to verify them — verification is a step in producing them, not a service afterwards.
Nothing goes to Fuad with "shall I QC these?" attached.

**Also disallowed: the unverifiable assertion.** Not every bad claim is a wrong fact. Chełmoński
"went home to a village, which cost him the market and suited him" contains no checkable error —
it contains a commercial claim nobody measured and an inner state nobody recorded. A sentence
that cannot in principle be verified cannot survive QC either, and it slips past a fact-checker
precisely because there is no fact to check. Motive, satisfaction, regret and "what it cost him"
are off limits unless the artist wrote it down.



These make confident factual claims about real people — attributions, dates, bequest terms,
illnesses, causes of death — and the hook rule in step 3 actively *rewards* the striking claim,
which is precisely where fluent prose invents. **No artist read merges unverified.**

**Procedure**

1. **Atomise.** Split each draft into its individual assertions. "Sold almost nothing while
   alive, wrote over 800 letters, and most of what you'd recognise came from the final two
   years" is three claims, not one, and they fail independently.
2. **Swarm.** Sonnet verifiers, batched by artist, one verdict per claim against the open web:
   CONFIRMED / WRONG / UNVERIFIABLE, with a correction where it is wrong.
3. **Second pass: check the claims yourself** (Fuad 2026-08-19, binding). Not "adjudicate the
   verifier" — go and look. Read the swarm's findings, then independently verify the ones that
   are load-bearing, surprising, or numeric. The verifier's confidence is not evidence, in
   either direction: one arguing from general knowledge loses to a specific source, and one
   that found no source has not proven a negative. This pass is where the Monet UV claim would
   have died before reaching Fuad instead of after.
4. **Loop if the pass changed anything** (Fuad 2026-08-19). A correction is new text, and new
   text has not been checked. So step 3 runs again over whatever step 3 just altered, and again
   after that, until a pass produces no changes. Two rounds is normal; a claim still moving on
   the third is telling you it is contested, and contested claims get cut rather than settled
   by another lap.

   This is not theoretical. Round one corrected Monet's cataracts to a UV story that collapsed
   under Fuad's question. Round two — checking the corrections rather than the drafts —
   overturned two more that the swarm had produced: Turner's bequest condition was "a gallery
   be built to house them", not "they stay together", and attributing the Schloss Immendorf
   fire to the SS is "believed", not established. Three of the bad facts in this batch came out
   of the FACT-CHECKING, not the drafting.

5. **Print only the genuine unsures.** Confirmations do not need Fuad's attention.

**Known limit of this pass.** It is only as good as the choice of what to re-check — the
load-bearing, the surprising and the numeric get looked at. A claim that is both wrong and
boring can still survive. Round-tripping every sentence is the only complete answer and is not
worth its cost; knowing that is the point of writing the limit down.

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

**A CUT LEAVES A HOLE — GO AND FILL IT** (Fuad approved 2026-08-20). The resolution rule above
has a bias that took a whole batch to notice. Hooks *are* the striking claims, so they are
disproportionately what fails verification — which means a heavily-QC'd batch drifts towards
safe and flat, and the drift is invisible because every surviving sentence is true. Two reads in
batch 3 shipped with only two of the three moves: van Rysselberghe lost his 1904 break from
pointillism and Le Sidaner lost a motive claim, and in both cases the read simply stopped after
"how" and "why". **A read that comes out of QC with no third move is not finished.** Go and find
a different hook and put it through the same loop, rather than shipping the gap. Both were
fixable in one search each: van Rysselberghe is one of very few who took the dot into
portraiture, and Le Sidaner founded a rose festival that still runs.

Related, and cheaper to catch: the same batch shipped "came back with the palette he then kept",
an unfalsifiable claim about influence that survived because it is *dull*. §10's own pass looks
at what is load-bearing, surprising or numeric. Nothing in the procedure catches a claim that is
quietly unverifiable and also boring — so the collection-statistic tie-back ("all three of yours
floored you") slipped through for the same reason, despite being exactly what killed the first
pilot. **When trimming, re-read the flat sentences too.**

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
