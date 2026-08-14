> Part of the fuad.au docs — start at [/GUIDE.md](/GUIDE.md)

# Canvas content QC ledger

What has actually been quality-controlled, by whom, and what was found. Update this file
whenever a QC pass runs — coverage claims that aren't recorded here don't count.

## QC events

| Date | Scope | Method | QC'd by | Findings |
|---|---|---|---|---|
| 2026-08-14 | interp batches b+c (20 reads) vs their tours | full fidelity trace + fact sanity | 2× Opus agents + Fable (measured) | 0 fidelity breaks; 1 tour error (Grunwald "4.5 m wide" → 426×987 cm, FIXED) |
| 2026-08-14 | tours10 stack (9 works: tour+deep+about) | coherence + facts, 2 web calls | Opus agent, Fable reviewed | Diogenes tour "twenty-five in 1873" → 1877/age 28 (FIXED); Eugène-Manet hotel window CONFIRMED ok; bergère-couchée no Thyssen bleed |
| 2026-08-14 | random 20-tour sample (seed 20260814, list in .dtmp/interp10/tourqc_sample.json) | Fable read all 20 against own knowledge; 6 flags → 2× Opus web verifiers; 1 image check by Fable | **Fable (primary)** + Opus verify | 3 real defects, all FIXED: Pellerin-II commission story was backwards (he accepted the 2nd version); L'Absinthe first shown Brighton c.1876, not 1877; Irène provenance now names Béatrice (murdered at Auschwitz) as the looting victim. 2 flags cleared (Böcklin "daughter Angela" is a real tradition — he had both a wife and a daughter named Angela; Porte-fenêtre first shown 1966). 1 web-verifier false positive overturned: Storks fiddle/hat/sash/fur-cap all present in the plate |
| 2026-08-14 | interp batch d (10 new reads) | mechanical (length/openers/scaffold/punct) | Fable | 0 dup openers, 0 punct, 1 single "argument" use (corpus-normal); lengths 210–274w — superseded by the d2 redo below |
| 2026-08-14 | interp batch d2 (10 redrafts, ~140–170 target + trim law) | mechanical | Fable | lengths 157–190, ZERO over 200 (vs 210–274 under the looser brief); 1 scaffold opener (alba) + 1 existingInfo-sourced fact (samson AI-study) to settle at verdict |
| 2026-08-14 | random 30-tour sample #2 (seed 20260815, .dtmp/interp10/tourqc_sample2.json) | Fable read all 30; 4 flags → 1 Opus web verifier | **Fable (primary)** + Opus verify | 3 tour defects FIXED: El Greco tour said "National Gallery, London" for the canon-Frick version (qid Q5108849 confirms Frick; NB the wall reliefs exist in BOTH versions, so they don't discriminate); Sunflowers F456 called a "repetition" (it's the original Aug 1888 series); Farmhouse in Provence credited to Chester Dale (actually Ailsa Mellon Bruce, 1970). 1 canon fix: title → "Carnation, Lily, Lily, Rose" (no "and"). 26/30 tours fully clean |

| 2026-08-14 | random 30-tour sample #3 (seed 20260816, .dtmp/interp10/tourqc_sample3.json; batch-d tours now in pool) | Fable read all 30; ZERO fact flags → no web verification needed | **Fable (solo)** | **0 factual defects in 30 tours.** Non-fact findings: `by` badge field missing on 3 tours (j-m-w-turner-the-parting-of-hero-and-leander, arshile-gorky-diary-of-a-seducer, leech-convent-garden — do NOT guess a badge; ask Fuad/git history); leech final stop missing box coords; canon year filled for gustave-caillebotte-untitled (?→1880, from its own tour). Burn ≈ 2.2k tokens/tour (no verifier needed) |

| 2026-08-14 | FULL SWEEP of remaining 200 tours, 6 batches (dumps .dtmp/interp10/qcrest_b1..6.txt, list tourqc_rest.json) | Fable read all 200; 3 uncertain flags → 1 Opus web verifier (2 confirmed, 1 overturned); 1 bedrock-date fix by Fable directly | **Fable (primary)** + Opus verify | **COMPLETE. 3 tour-fact defects / 200 tours (1.5%), all in context paragraphs, all FIXED**: night-in-saint-cloud father's death "that January" → November 1889 (Munch Museum timeline; fixed in context + stop body); Rousseau Forest in Winter "finished only in 1867 when friends persuaded him to release it" → actually still UNFINISHED at his death despite friends' urging (Met object 438816); Whistler's Mother "Two years later Ruskin's attack" → six years (attack 1877, trial 1878). 1 false flag overturned: Van Rysselberghe Coastal Scene IS at the National Gallery London (NG6582) — tour vindicated, my Met-Lehman recall was wrong. Canon seenAt conflicts (for Fuad, NOT silently fixed): christ-in-the-house-of-his-parents seenAt=national-gallery-london but painting is TATE BRITAIN; ophelia same error class (Tate Britain); edward-hopper-house-by-the-railroad seenAt=met-nyc but painting is MoMA's first acquisition; Signac Bonne-Mère canon title has stray "马赛" chars. Legacy note: the-milkmaid tour is an initial-era stub (no stops, no by) — same set-aside class as the 3 by-less tours. Batch contents: b3 Vermeers/Klimt/Courbets/Gioconda etc, b4 Ophelia/Cézannes/Rubens/Goyas etc, b5 Rembrandts/Hokusai/Bruegel/Manets/Starry Night etc, b6 Rodin/Strindberg/Monets/Boccionis/Klees/Van Goghs/Copley etc — everything else clean |

## Coverage

- **Tours**: **309 of 309 QC'd — full coverage** (b+c 20, tours10 9, random samples
  20 + 30 + 30, full sweep 200). Total defect rate: **11 factual defects / 309 tours
  (~3.6%)** — every single one in the CONTEXT/history paragraph (dates, provenance,
  commission stories, venue prose). The early random samples ran ~7%; the final 200-tour
  sweep ran 1.5%. **Zero defects found in the visual layers** (see/craft/deeper) —
  image-grounded, held up every time (incl. the Storks false-positive, the El Greco
  reliefs, and the Van Rysselberghe venue where the tour beat the QC's own recall).
- **Interpretations**: the 30 pending (b+c+d) fully fidelity-traced; the 110 shipped are
  NOT yet systematically QC'd.
- **Infos**: 623 shipped; bulk-campaign hooks were web-verified at write time; no
  independent re-audit yet.

## Method lessons (binding)

1. **Never falsify an image-drafted visual detail with text sources.** Tours are drafted
   from the plate; brief web descriptions omit details. A web-only verifier called the
   Storks fiddle an invention; the plate shows it plainly. Visual claims are checked
   against the image (Wikidata P18 → Special:FilePath), period.
2. **Context paragraphs are the risk layer.** Prioritise history/provenance claims when
   sampling; visual layers can be spot-checked more lightly.
3. **Sonnet cannot count its own words** — QC measures, always.
4. **Web verification is bounded**: ~2 calls per flagged claim, flags stay flags if unresolved.

## Measured cost (for planning)

Random 20-tour sample, this method: Fable reads ~156k chars of tours (~40k tokens) +
2 Opus verifiers ~59k subagent tokens for 6 flags ≈ **~5k tokens/tour all-in**.
Final 200-tour sweep (actual): ~1.15M chars of stripped dumps (~290k tokens read) +
1 Opus verifier (24.5k) for 3 flags ≈ **~1.6k tokens/tour** — flags get rarer and
cheaper as the defect pool drains; stripped dumps (no "see"/box coords) are the big saver.

| 2026-08-15 | Backfill batches 1+2 (29 works: interp + fused Info) + Milkmaid deeper chapters | §5b pipeline: per-work fact-trace vs tours (all numbers/proper nouns), formula/opener seals, fuse-gate 4-gram + hook fact-carry ×2 rounds; Milkmaid boxes crop-verified on the live plate | Fable (primary), Sonnet drafts | 3 draft seals (2 formula constructions, 1 invented descriptor "acidic"); Turner leak class found+fixed (3 shipped Infos carried "(Job year given as…)" workshop notes); Milkmaid dating moved to Rijks c. 1660 (canon+Info+context); voice rule: reads never cite the label that supplied a fact |
