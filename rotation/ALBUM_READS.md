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
content-word pair with the lyric). **The gate polices OPUS ONLY** (Fuad 2026-07-26):
sonnet and haiku are deliberately left on their original rules — do not rewrite a sonnet
for lyric echo; that is its register. Lyrics come from the local sets first, then LRCLIB by
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
   Running rate so far: ~60% of albums earn one. **⚠ Instrumental closers count**
   (Fuad 2026-07-26): exempt tracks vanish from the read dossier but still shape the
   record's ending — the coda judgment must look at instrumental positions too
   (Hesitation Marks' softened plea is followed by the bleak wordless Black Noise;
   the coda carries that, the read couldn't).
4. Owner approves each batch inline before apply.

## Rendering

`PortraitCard` linkifies mentioned track titles inside album reads (gist, liner, arc):
case-sensitive exact-title matches with non-letter boundaries, longest-first, so
common-word titles (Only, Wish, Stone) only hit their capitalized mentions. Links are
invisible at rest; hover = dotted underline + accent (`.pv-tracklink`); click routes to
the track page. The `arc` coda renders italic. Album pages already gate on media-index,
which supplies the title list.

## Artist level (approved 2026-07-26)

One level up again: ARTIST reads synthesize from the artist's ALBUM reads (release-ordered
dossier with plays/years and any arc codas). Qualifying rule: an artist qualifies when
every major album (by play threshold) carries a read. Brief: 3–5 sentences, 90–150 words;
the obsession OR the two-three threads the records keep returning to and how they MOVE
across the discography — era-drift is the subject at this level, but never
chronology-walked; 2–3 anchor ALBUMS; album-read grounding, career knowledge
frames-never-contradicts. **Briefs stay CLEAN** (Fuad 2026-07-26): factual context only
(formation, disbandment, era facts) — never thematic pointers ("the X structure is in
the reads") and never a demand for ONE thesis; both were tried and both steered the
prose (the emphasis-becomes-subject law, third confirmation). Stored as the artist
entry's `portrait` (substituting the old pilot portraits); the gist keeps the stats/sound
duty; there is no artist arc coda (the discography arc IS the read).

**Dossier completeness** (Fuad 2026-07-26): the artist dossier includes EVERY significant
record — full read where coverage allows, a gist-only DESCRIPTOR where not (soundtracks,
live documents, wordless works, sub-threshold records get their one-line gist first).
An artist read can only echo what its dossier contains (Massive Attack's film score was
invisible until its descriptor entered). **Emphasis may follow the listening**: album
plays ride in the dossier, and where the listening concentrates, the read may weight
accordingly — this is a personal library, not an encyclopedia. Both rules are generic —
they apply to every artist identically; per-artist steering stays banned.

**Fable note tier**: after drafting, Fable audits the read's claims against its own
knowledge of the world (quick web verification where unsure) and may append a `note` —
rendered in the same italic coda grammar — adding context the album reads structurally
could not surface (band mythology, biographical engines, the instrumentation half of a
duo's method). A note never rewrites; if a read is factually wrong it goes back for a
redraft instead. First three: Tool (interpretation boobytraps), Serj Tankian (Armenia as
source code), Midori (the deadpan jazz quartet under the shrieking).

## Apply

Batch apply scripts live at the GitHub root `../.sptmp/album-batch/` (untracked
workshop, per PIPELINE.md convention): dossier builders, `gap-resolve.js` (the variant
folder/classifier), tier-fill QC, and per-batch apply scripts that rewrite
`portraits.js` (single-line JSON body, header comment preserved). Gap fills go into
`llm-about.js` under its ONE-ENTRY-PER-LINE contract (merge existing lines in place,
append new keys before the closing brace), then verify the full entry-count parse.
Cache-busting is automatic (CI content-hash) — commit and push is enough.

**Variant album pages**: when a read was written on plays merged across library
variants (edition spellings, promo pressings, mojibake titles), the finished entry
is MIRRORED under every variant's album key so each album page shows it (e.g. both
Random Album Title keys); the gist says "across editions" where the count is merged.
