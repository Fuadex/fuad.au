> Part of the fuad.au docs — start at [/GUIDE.md](/GUIDE.md)

# Rotation — Design System

The visual language as a **system**: where each token lives, what owns it, and the rules for
extending it. ARCHITECTURE.md owns structure and data; this file owns look-and-feel contracts.
Created 2026-08-13, on the eve of the genre-v2 hue migration, so color moves happen inside a
system rather than as scattered magic numbers.

## 1. Color

### 1.1 Ink & rule tokens (CSS variables)
Neutral chrome comes from CSS custom properties (defined with the app shell styles):
`--ink-faint`, `--ink-soft` (text tiers), `--rule-2` (hairlines/borders). All secondary
labels, pills, and hairlines reference these — never hardcode a grey.

### 1.2 The genre hue wheel — ONE source
**`FAMILIES` in `build-data.js` is the single source of genre color.** Each family =
`{ family, hue, cx, cy }`. Every classified artist's record hue = **its family's anchor hue
± a deterministic ≤10° per-artist jitter** (`famAnchorHue`, enforced 2026-08-13 — variety
inside the family band, still reads as the family); untagged/Other artists fall back to the
legacy curated/name-hash hue. The record hue flows to **every surface at once**: artist-page
accent, GenCover gradients, chart bars, map dots, MapFlow stacks, Gigs tiles, Explore cards,
liked rows. There is deliberately **no
per-genre CSS** — color renders inline as `oklch()`/`hsl()` from the data hue — so a family
recolor is a data change with atomic, site-wide effect.

Rules:
- A genre color exists **only** as a `FAMILIES[].hue` entry. Never inline a hue for a genre
  in a view.
- **Color follows family.** An artist that changes family changes color everywhere in one
  deploy. Never grandfather an old hue for a moved artist — everywhere color is used *as a
  key* (legends, cascades) would go inconsistent.
- Hue continuity across taxonomy changes: **surviving families keep their anchor hues**;
  only freed hues are reassigned. Hand overrides ride `pins.json` (`fam` pin, genre-v2+).

### 1.3 The v2 wheel (approved 2026-08-12, rolling out from 2026-08-13)
Chosen so the color circle reads musically: the metal continuum sits contiguous across the
wheel wrap (346 → 4 → 24), electronic holds 190–214, and the two new families take exactly
the two freed hues (332 from the dissolved Japanese family, 308 from digital-hardcore
merging into Industrial). `cx/cy` = Sound-Map position (x ≈ organic→electronic,
y ≈ light→heavy).

| Family | hue | cx, cy |
|---|---|---|
| Thrash / Death | 4 | .22, .90 |
| Heavy / Doom / Gothic | 24 | .18, .80 |
| Hip-Hop / Rap | 46 | .62, .42 |
| Alternative / Indie | 60 | .40, .50 |
| Jazz/Funk (+ soul/R&B/blues) | 40 | .40, .32 |
| Punk / Hardcore | 96 | .26, .80 |
| Classical | 150 | .18, .22 |
| Electronic / DnB | 190 | .84, .60 |
| Industrial / DH / Hyperpop / Noise | 214 | .68, .80 |
| Shoegaze / Grunge | 252 | .50, .60 |
| Prog Metal / Rock | 282 | .30, .54 |
| Score / Games & Film | 308 | .50, .22 |
| Pop | 332 | .72, .38 |
| Metalcore / Nu | 346 | .38, .88 |
| Other | 72 (grey) | .50, .50 |

### 1.4 Status badge tones
Badge accents are fixed oklch tones, not genre hues: **Active** green (`oklch(.72 .15 150)`
text / `.6 .13 150 /.5` border), **Reactivated** amber-orange (hue 45), **On tour** amber
(hue 75), **Seen live** purple (hue 305), neutral badges = ink/rule tokens. A new badge
state picks an unused tone hue and follows the same pill chrome (§3.1).

## 2. Glyph language

- **Gender/vocals**: ♀ ♂ ⚧ glyphs are the primary visual (owner rule 2026-08-12: glyphs are
  preserved, never replaced by words). The vocals badge = mic + glyph sequence **in lineup
  order** ("♀♂" = female + male vocalists); spelled-out words live in the tooltip;
  "instrumental" renders as a word (no glyph exists). Solo acts without lineup data fall
  back to their single MusicBrainz gender glyph inside the same badge.
- Member rosters keep per-member glyphs (MbRow).
- 🎤 marks vocals/live contexts; needle-drop and play affordances keep their established
  icons — reuse before inventing.

## 3. Control idioms

### 3.1 Pills & chips
The universal chip: `r-mono`, fontSize 9–9.5, letterSpacing .06–.1em, uppercase,
`borderRadius 999`, `1px solid var(--rule-2)`, `color var(--ink-faint)`; tone borders/colors
only for status badges (§1.4). Filter chips get a `✕` clear affordance in the owning header.

### 3.2 Segmented buttons
One idiom everywhere: a `.r-seg`-class group of `<button data-on={active}>` — used for
artists/albums/tracks, list⇄grid, granularity (Day/Week/Month), count selectors. New
toggles reuse it; never a new control style for an existing decision shape.

### 3.3 Count selectors (per-view bases, one behavior)
- Explore results: **16 / 32 / 64**, default 16, "+ load more" extends.
- Time period panel: **10 / 25 / 50**, default 10, "show N more" extends by the base;
  the base persists, the extension resets when the selection changes.
- Overview Recently played: **6 / 12 / 18**.
- Gigs: tour artists **+40**, catch/loved buckets **+12**.
The behavior contract: a segmented **base** + an additive **more** button; changing scope
resets the extension, never the chosen base.

## 4. Typography accents
`r-mono` is the metadata voice (labels, credits, badges, tooltips-made-visible). Body prose
stays in the app serif/sans stack. Attribution lines ("via Opus · Fable", "an alternative
album read…") are 9.5px `r-mono` in `--ink-faint`.

## 5. Extending the system (the as-we-move rules)
1. New genre/family → `FAMILIES` entry (hue + cx/cy + patterns). Nothing else.
2. New artist-level dimension → data field on the record (like `vx`), rendered through an
   existing idiom (badge/chip), glyphs first, words in tooltips.
3. New status → pins-style ledger + §1.4 tone + pill chrome.
4. New list → count-selector contract (§3.3) if it can grow.
5. If a view needs a color/control that feels new, check this file first; extend the system
   here (one commit: token + doc) rather than inlining a one-off.
