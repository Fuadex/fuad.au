> Part of the fuad.au docs — start at [/GUIDE.md](/GUIDE.md)

# Info / Interpretation reads — writing spec (`art-about.js`)

The two-tier reads that sit on the artwork page: `about` (Info) and `deep`
(Interpretation). Tours are a different layer with its own spec —
**[STUDY_SPEC.md](STUDY_SPEC.md)** covers `art_inspect.js`.

This file was written 2026-08-13, **after** the methodology went undocumented for a month
and got reconstructed wrong twice in one session. The method itself is not new: it is the
one run in the `about21` batch and the seven hook-first Info waves (art-about 45 → 622).
Reference set: `.dtmp/about21/ABOUT21-REVIEW.md` — read a few pairs before drafting.

## The cascade (this is the part that gets forgotten)

**Study tour -> Interpretation -> Info.** Each stage distils the one above it; the work
flows downhill, never up.

Verified against the corpus 2026-08-13: all 21 works in the about21 batch already had study
tours, and the reads derive from them visibly. Hodler's tour `craft` opens "Parallelism, in
Hodler's own use of the word, is not symmetry but repetition: like forms set beside like
forms until the repeating itself becomes the subject. Here it runs at three scales." Its
Interpretation compresses precisely that, and pulls its remaining detail from the tour's
stops ("The apex, and its flaw" -> the off-centre apex; "The shoulder that pays for the
symmetry" -> the stepped right shoulder).

1. **Tour first** — `art_inspect.js`, per STUDY_SPEC.md. This is the deep, image-verified
   layer: four lenses (see/about/craft/context) plus the anchored `deeper` stops. A work
   with no tour is not ready for a paired read.
2. **Interpretation** (~110-160 words), **one subagent per painting**, distilled from that
   work's tour and everything else written for it. It is the standalone argument, not a
   summary of the fly-through: take the tour's thesis and its most telling verifiable
   observations, and compress. Close on a **looking instruction** tied to the actual room
   where possible. Never "the viewer"; no flattery; no masterpiece talk. It must not
   contradict the tour, and should not simply restate the stop list.
3. **Info** (~40-70 words), distilled from the Interpretation. Leads with a **hook** — the
   fact or image that pulls a reader in: who the sitter actually was, what the place is, the
   one crowding decision — then the identifying facts. **Every fact in the hook is
   web-verified**; this pass is where canon errors surface (the campaign caught A Burial at
   Ornans 1841 -> 1850 and The Painter's Studio 1850 -> 1855 this way; fix the canon row in
   the same commit).
4. **QC** (main agent, never a subagent): check both tiers against the tour and the image,
   verify every proper noun and date. Print both tiers for Fuad's verdict; nothing merges
   unapproved.

Consequence worth stating plainly: **the Interpretation tier can never exceed the tour
tier.** Tours are the ceiling. To grow Interpretations, tour more works first.

## Two production modes (do not conflate them)

The order above describes **paired production** — the about21 mode, used for flagship and
recently-toured works, where both tiers are written together.

There is also a **bulk Info campaign** mode, which is what built most of the corpus: the
seven hook-first waves shipped `Info-only entries (about + by:"Opus 4.8", no deep)` to reach
full coverage of the imaged canon (45 -> 622). Those Info reads were authored directly —
hook first, facts web-verified — and were never distilled from an Interpretation, because
none existed. This is why the corpus reads 623 Info against 101 Interpretations: not damage,
just the coverage campaign running ahead of the paired production.

**Backfill rule:** the standing queue is the 210 works that HAVE a tour but no
Interpretation — run the cascade's stage 2 on those, then decide per work whether the
existing hook-first Info should be re-distilled from the new Interpretation (it usually
should; the campaign Info was written without one). Works with neither a tour nor an
Interpretation need a tour first — do not write a paired read from the Info alone, which
is the error that produced the discarded Orsay drafts of 2026-08-13.

## Truth rules

- A study tour must go deeper than, and never contradict, the Info read (PIPELINE.md). Where
  a tour already exists, the Interpretation must not contradict it either, and should not
  simply restate its stops: the tour is a fly-through of regions, the Interpretation is the
  standalone argument.
- `seenConfidence` governs person-address exactly as in STUDY_SPEC.md: "you saw/met this"
  only for canon-`sure` works; `probably`/`unsure` get institutional phrasing.
- Facts only where confident. Where scholarship is thin, say so and reason from the eye.
- Redrafting an existing read: bump `by` to reflect joint authorship (e.g. Opus·Fable).

## Entry shape

```js
"<id>": { about: "<Info, hook-first>", deep: "<Interpretation>", by: "Opus 4.8" }
```

`deepBy` exists on a handful of entries where the Interpretation had a different author
than the Info; leave it off when one pass wrote both.

## Coverage (2026-08-13)

623 Info reads (full imaged-canon coverage) · 101 Interpretations · 308 study tours.
The standing queue is the **210 works that have a tour but no Interpretation**.
