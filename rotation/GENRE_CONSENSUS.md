# Genre consensus row — findings and proposal

**Status: PROPOSED, not built.** Fuad asked for the idea and the numbers on 2026-08-30 and
parked implementation. Nothing in the app changed. This note exists so the measurement does
not have to be redone.

## The idea

Artist pages currently carry three genre rails — last.fm, Discogs, Spotify — one per source
(`rotation-artist.jsx`, the three `av-tagrow` blocks; the one-rail-per-source decision is
Fuad's, 2026-08-21, and the reasoning is in `rotation.css` near the `GENRE TAGS` comment: you
should be able to see which service said what). The proposal is to collapse them into a single
`GENRE` row of up to five genres the sources agree on, with a button at the end that expands
the three original rows back with a transition.

## What the data actually supports

Measured over the 115 artists that carry all three lists (sampled from the top of
`ROTATION.ARTISTS`, joined to `spotify-genres.json` and `discogs-cache.json` by normalised
name). Normalisation for the count was lowercase + punctuation-stripped only, no aliases.

**Strict three-way agreement almost never reaches five.**

| exact 3-of-3 matches | artists |
|---|---|
| 0 | 22 |
| 1 | 61 |
| 2 | 28 |
| 3 | 4 |
| 4+ | 0 |

93 of 115 artists have at least one three-way match; the median is one; nothing reached four.
So "up to five they all agree on" is **not reachable by intersection**. Part of this is
structural — the last.fm rail is the raw cache top-4 (`a.tagsLf`), so it caps any intersection
at four before the other two are even consulted.

Worked examples (lists truncated to what the rails show):

| Artist | 3-of-3 | adding 2-of-3 |
|---|---|---|
| Nine Inch Nails | industrial | + industrial rock |
| Linkin Park | nu metal | + rock, alternative rock |
| Machine Head | groove metal, heavy metal | + thrash metal, metal, nu metal, hard rock |
| Limp Bizkit | nu metal | + alternative metal |
| Type O Negative | gothic metal, doom metal | — |
| deadmau5 | progressive house | + house, electro house, dubstep |

**Near-misses are costing real agreements.** The three vocabularies are close but not
identical, and several pairs fail only on naming:

- Discogs `Thrash` vs last.fm/Spotify `thrash metal`
- Discogs `Goth Rock` vs last.fm `gothic rock`
- Discogs `Synth-pop` vs the usual `synthpop`
- hyphenation generally (`hip hop` / `hip-hop`, `nu metal` / `nu-metal`)

Vocabulary character, for the record: last.fm is folksonomy (and carries non-genre tags like
"seen live" in the unfiltered cache — `a.tagsLf` is already the filtered top-4); Discogs is a
controlled *style* list in Title Case; Spotify is micro-genre and will happily return
"brooklyn drill" or "escape room".

## Proposal

1. **Vote, don't intersect.** Score each genre by how many sources back it. 3-of-3 sorts above
   2-of-3; ties break on average position within each source's list (all three are
   relevance-ordered), then on specificity so a narrow genre outranks a broad one at equal
   support. Take the top five. This fills the row honestly — Machine Head yields six
   candidates, deadmau5 four — while still meaning *agreed*, at two strengths rather than one
   unreachable one.
2. **Normalise, with a small hand-built alias map.** Lowercase, strip punctuation, then ~40
   alias pairs for the near-misses above. The alias list is an editorial artifact — it decides
   that two names mean the same thing — so it should be printed for Fuad's approval before it
   ships, never applied silently.
3. **Show the strength.** 3-of-3 chips at full weight, 2-of-3 slightly lighter. One glance,
   and it does not pass off a two-source genre as a three-source one.
4. **Expand button ends the row**: `3 sources ⌄`. It opens the three existing rails underneath,
   unchanged — same chips, same Explore links, same source labels. The 2026-08-21 decision is
   preserved, it just costs a click instead of three permanent rows.
5. **Transition**: CSS grid `grid-template-rows: 0fr → 1fr`, which animates variable content
   height without measuring in JS. Branch on `prefers-reduced-motion` to snap.
6. **Never fake agreement.** If fewer than two genres clear the bar, render the three rows as
   today with no consensus row and no button. Roughly a fifth of artists have no three-way
   match at all, and a `GENRE` row holding one chip is worse than what ships now.
7. **Render-time first, build-time later.** A helper in the JSX needs no rebuild and no data
   migration. If the consensus proves good it belongs in `build-data.js` so Explore and the
   affinity sort share the vocabulary — a second step, not a prerequisite.

## Open decisions (Fuad's)

- **Does 2-of-3 count as agreed?** Recommended yes. Without it the row is usually a single
  chip and does not earn its space.
- **Show the strength, or keep five uniform chips?** Recommended showing it.
- **How far should aliasing go?** Merging `Thrash` into `thrash metal` is safe; merging
  `alternative metal` into `nu metal` is an opinion. The line needs drawing by hand and
  reviewing before it ships.

## Reproducing the measurement

Join `ROTATION.ARTISTS` (from `music-core.js`) to `spotify-genres.json` and the `styles` array
of `discogs-cache.json` by normalised artist name; the last.fm side is `a.tagsLf` falling back
to `a.tags`. Normalise with `s.toLowerCase().replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim()`
and count set intersections. Note `a.styles` / `a.spotGenres` are hydrated onto the artist
object at render — they are not on the `ARTISTS` records themselves, which is why the join has
to go back to the enrichment JSONs.
