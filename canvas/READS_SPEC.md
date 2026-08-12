> Part of the fuad.au docs — start at [/GUIDE.md](/GUIDE.md)

# Info / Interpretation reads — writing spec (`art-about.js`)

The two-tier reads that sit on the artwork page: `about` (Info) and `deep`
(Interpretation). Tours are a different layer with its own spec —
**[STUDY_SPEC.md](STUDY_SPEC.md)** covers `art_inspect.js`.

This file was written 2026-08-13, **after** the methodology went undocumented for a month
and got reconstructed wrong twice in one session. The method itself is not new: it is the
one run in the `about21` batch and the seven hook-first Info waves (art-about 45 → 622).
Reference set: `.dtmp/about21/ABOUT21-REVIEW.md` — read a few pairs before drafting.

## The order (this is the part that gets forgotten)

**Interpretation is written FIRST. Info is distilled FROM it, and leads with a hook.**

Not the reverse. An Info read written first produces a thin Interpretation that merely
elaborates it; distilling the other way produces an Info line that already knows what the
picture's argument is, which is why the hook lands.

1. **One subagent per painting** — Opus, working from the actual image (download the plate
   the site displays; see STUDY_SPEC.md's plate rules, they apply here too).
2. **Interpretation** (~110-160 words). How the picture works: composition, palette,
   technique, a structural decision verifiable by looking — a diagonal, a colour that is
   not the colour you think, a missing horizon, an edge left rough. At most one piece of
   verification-grade lore, and only where it changes the seeing. Close on a **looking
   instruction** tied to the actual room where possible (step back, come close, walk
   side to side, look from below). Never "the viewer"; no flattery; no masterpiece talk.
3. **Info** (~40-70 words), distilled from the Interpretation. Leads with a **hook** — the
   fact or image that pulls a reader in: who the sitter actually was, what the place is,
   the one crowding decision. Then the identifying facts (artist, date, what it depicts).
   **Every fact in the hook is web-verified** — this pass is where canon errors surface
   (the campaign caught A Burial at Ornans 1841 → 1850 and The Painter's Studio 1850 →
   1855 this way; fix the canon row in the same commit).
4. **QC** (main agent, never a subagent): check the Interpretation against the image, verify
   every proper noun and date, and check both tiers against any existing study tour — see
   the truth rule below. Print both tiers for Fuad's verdict; nothing merges unapproved.

## Two production modes (do not conflate them)

The order above describes **paired production** — the about21 mode, used for flagship and
recently-toured works, where both tiers are written together.

There is also a **bulk Info campaign** mode, which is what built most of the corpus: the
seven hook-first waves shipped `Info-only entries (about + by:"Opus 4.8", no deep)` to reach
full coverage of the imaged canon (45 -> 622). Those Info reads were authored directly —
hook first, facts web-verified — and were never distilled from an Interpretation, because
none existed. This is why the corpus reads 623 Info against 101 Interpretations: not damage,
just the coverage campaign running ahead of the paired production.

**Backfill rule (Fuad's call, pending):** when adding an Interpretation to a work that
already has hook-first Info, the Interpretation-first order cannot apply literally. Two
options, decided per tier of work rather than drifting:
- (a) Write the Interpretation fresh from the image, ignoring the existing Info, then
  re-distil the Info so the pair matches. Truer to the method; also upgrades older Info
  lines. Recommended where a study tour exists.
- (b) Write the Interpretation to sit under the existing Info, leaving Info untouched.
  Cheaper, non-destructive, but inverts the order.

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
