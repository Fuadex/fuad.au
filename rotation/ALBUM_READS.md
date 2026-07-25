> Part of the fuad.au docs — start at [/GUIDE.md](/GUIDE.md)

# Album "What's it about?" reads — methodology

Album-level reads live in `portraits.js` (`ROTATION_PORTRAITS`, album keys =
`artistSlug~albumSlug` via `lib-slug.js` — non-Latin names hash, e.g. Midori's debut is
`a-2yw9ix~a-1ue2pqe`). They REPLACED the portrait-pilot album liners (2026-07-25). Entry
shape: `{ gist, liner, arc?, by }` — `gist` is the collapsed headline (description + the
owner's listening stats), `liner` is the album read, `arc` is an optional one-sentence
Fable coda rendered as an *italic* line by `PortraitCard` (rotation-views2.jsx), `by` is
`"Opus"` or `"Opus · Fable"` when a coda rides. Artist `portrait` entries are a separate,
older pilot — untouched by this pipeline.

## The design (settled over four test rounds)

**One Opus subagent read per album, synthesized from the album's existing track reads,
plus a Fable QC pass that may add a single reframing coda.** Two rejected alternatives,
kept here as warnings:

- *Commit-and-compress track rewrites* — rejected; the incumbent track reads stand.
- *Order-narrated album reads* — order-emphasized briefs produced itinerary prose
  ("opens… descends… closes") that displaced substance. **General law: whatever a brief
  emphasizes becomes the subject of the prose. State corrections as boundary conditions,
  never as themes.** The tracklist order goes IN the dossier so the writer can check
  itself; the brief forbids narrating it. Where the order genuinely changes the reading,
  that goes into the Fable coda — one italic sentence, a labeled lens, never a rewrite.

## Coverage rule (hard prerequisite)

**An album read requires every LYRIC track of the standard tracklist covered
haiku → sonnet → opus.** Audit first; classify gaps:

| Class | Rule |
|---|---|
| Variants (live / demo / mix / typo / mojibake scrobbles) | FOLD into the canonical track's reads; never counted as gaps |
| Deluxe-edition extras | Out of scope — coverage is measured against the standard tracklist |
| Instrumentals / interludes / cues | EXEMPT (reads require lyrics — see PIPELINE.md floor rules) |
| No lyrics findable anywhere | Flagged lyric-less residue; the album read simply doesn't mention them |
| Instrumental WITH a lyric source | ⚠ Verify the source — LRCLIB community entries can be MISATTRIBUTED (the-four-of-us-are-dying carried someone else's lyrics; all three tiers then faithfully described the wrong song and had to be purged). If a track is known-instrumental, distrust any lyric that appears for it |
| Real gaps | FILL before writing the album read |

Gap fills are authored by the tier's **namesake model** (Haiku/Sonnet/Opus subagents),
each tier written INDEPENDENTLY (no sight of other tiers), sonnet under the original
register rules, opus under the non-quoting rules + the mechanical bigram gate (≤1 shared
content-word pair with the lyric). Lyrics come from the local sets first, then LRCLIB by
REAL artist/track names (works for Japanese; note LRCLIB sometimes serves English
*translations* — the gate applies to whatever text grounded the read).

## The write

Dossier per album: tracks deduped by normalized title (keep highest-play variant), sorted
by true tracklist order — `ROTATION_MEDIA.tracks[5]` is trackNo (Spotify-sourced, sparse;
schema comment in build-data.js). Compilation caveat: trackNo may reference the tracks'
SOURCE albums, not the compilation — verify before any order-based claim.

Brief (Opus subagent): 2–4 sentences, 60–110 words, glanceable; the throughline or the
two-three threads the track reads keep circling; name 2–3 anchor tracks; ground every
claim in the supplied reads (own knowledge frames, never contradicts); no lyric quoting,
no quotation marks, no track-by-track inventory, no sequence narration. Special cases:
- **Grab-bags** (compilations): say what KIND of grab-bag — what the tracks taken
  together reveal — rather than forcing false unity (Soundgarden A-Sides is the model).
- **Instrumental-majority records**: lead with the architecture honestly; treat the few
  vocal tracks as recurring flickers, not a thesis (deadmau5 ATGH is the model).
- **Covers albums**: the meaning lives in the SELECTION and the recasting, not
  authorship — never attribute the songwriting to the performer (APC eMOTIVe is the
  model: the curation does the accusing).
- **Live releases** (Fuad 2026-07-25): no read — they get a GIST-ONLY entry describing
  what the release is (NIN Beside You In Time is the model); their songs keep their reads
  on the studio records.
- **Unplayed tracks** (Fuad 2026-07-25): albums may contain songs never scrobbled here
  (unplayed, or lost to last.fm limits). PERMITTED — the read is written from the played
  tracks' reads — but FLAGGED: holes in the trackNo sequence reveal them; note the gap
  lightly in the gist (PRO8L3M s/t is the model: "three album cuts never scrobbled
  here"). The read itself must not claim totality it doesn't have. Rollout intent is
  decent coverage of the MOST-played albums, not completeness of every album played.

## Fable QC

1. Every track NAMED in the read must exist in its dossier (an agent once cited an
   uncovered track from memory — correctly, but ungoverned).
2. Spot-check factual frames (dates, personnel, album lore) like any read QC.
3. **Coda judgment**: read the ordered dossier; does the sequence CHANGE the reading
   (wrong timescale, wrong ending, wrong hierarchy of threads)? If yes — one italic
   sentence appended as `arc`, written in the read's register. If the record's subject
   IS its arc (concept albums — The Downward Spiral), the read absorbs it and no coda.
   Running rate so far: ~60% of albums earn one.
4. Owner approves each batch inline before apply.

## Rendering

`PortraitCard` linkifies mentioned track titles inside album reads (gist, liner, arc):
case-sensitive exact-title matches with non-letter boundaries, longest-first, so
common-word titles (Only, Wish, Stone) only hit their capitalized mentions. Links are
invisible at rest; hover = dotted underline + accent (`.pv-tracklink`); click routes to
the track page. The `arc` coda renders italic. Album pages already gate on media-index,
which supplies the title list.

## Apply

Batch apply scripts live at the GitHub root `../.sptmp/album-batch/` (untracked
workshop, per PIPELINE.md convention): dossier builders, `gap-resolve.js` (the variant
folder/classifier), tier-fill QC, and per-batch apply scripts that rewrite
`portraits.js` (single-line JSON body, header comment preserved). Gap fills go into
`llm-about.js` under its ONE-ENTRY-PER-LINE contract (merge existing lines in place,
append new keys before the closing brace), then verify the full entry-count parse.
Cache-busting is automatic (CI content-hash) — commit and push is enough.
