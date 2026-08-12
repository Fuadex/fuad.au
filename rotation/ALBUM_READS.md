> Part of the fuad.au docs — start at [/GUIDE.md](/GUIDE.md)

# Album "What's it about?" reads — methodology

Album-level reads live in `portraits.js` (`ROTATION_PORTRAITS`, album keys =
`artistSlug~albumSlug` via `lib-slug.js` — non-Latin names hash, e.g. Midori's debut is
`a-2yw9ix~a-1ue2pqe`). They REPLACED the portrait-pilot album liners (2026-07-25). Entry
shape: `{ gist, liner, arc?, by }` — `gist` is the collapsed headline (description + the
owner's listening SHAPE), `liner` is the album read, `arc` is an optional one-sentence
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

**Song-read budgets (Fuad 2026-07-27):**
- Length is a difficulty-scaled budget, not a fixed cap: **1–3 sentences for most songs,
  up to 5 where the song's structure earns it** (multi-part builds, POV shifts, dense
  allusion). Length must buy new content, never rephrasing.
- Opus's one-borrowed-image rule keeps its default, with an **image-system escape hatch**:
  when a song's meaning lives in the relation BETWEEN image families, the read may map
  the system — name its two-three image families in its own words. The bigram gate stays
  the hard constraint either way.
- **Resists-reading songs** (form-is-the-difficulty: cut-up, dada, deliberate semantic
  void) are NOT a register and get no special brief — Fable fishes them out at QC. The
  interesting artifact is the pair: the opus read stands, and Fable appends a counter
  (stored as the track's `fable` tier) saying the meaning-hunt is the trap — the Tool
  boobytrap note is the model. Rare by design; confabulated meaning is the one failure
  the pyramid cannot tolerate.

## The write

Dossier per album: tracks deduped by normalized title (keep highest-play variant), sorted
by true tracklist order — `ROTATION_MEDIA.tracks[5]` is trackNo (Spotify-sourced, sparse;
schema comment in build-data.js). Compilation caveat: trackNo may reference the tracks'
SOURCE albums, not the compilation — verify before any order-based claim.

Brief (Opus subagent): 2–4 sentences, 60–110 words, glanceable; the throughline or the
two-three threads the track reads keep circling; name 2–3 anchor tracks; ground every
claim in the supplied reads (own knowledge frames, never contradicts); no lyric quoting,
no quotation marks, no track-by-track inventory, no sequence narration. Special cases:
- **Collaborative releases** (Fuad 2026-07-27): a two-artist record is read as a MEETING
  of voices, never a solo statement (Haru Nemuri × Frost Children's Soul Kiss is the
  model). The library may credit it to one artist; the read must not.
- **Grab-bags** (compilations): say what KIND of grab-bag — what the tracks taken
  together reveal — rather than forcing false unity (Soundgarden A-Sides is the model).
- **Instrumental-majority records**: lead with the architecture honestly; treat the few
  vocal tracks as recurring flickers, not a thesis (deadmau5 ATGH is the model).
- **Covers albums**: the meaning lives in the SELECTION and the recasting, not
  authorship — never attribute the songwriting to the performer (APC eMOTIVe is the
  model: the curation does the accusing).
- **Single releases** (Fuad 2026-07-26): a played single can carry a full release read —
  coverage is trivially complete — but the read must work at RELEASE scale (what the
  single is as a statement, 40-80 words) and never re-summarize the track read or claim
  a wider catalog (Showing Teeth's Labyrinth is the model). Sub-threshold singles get
  gist-only entries. Artist reads over singles-only catalogs run SHORT (50-100 words)
  and say the scale plainly — a beginning is not an arc; the health script will flag
  the under-length, which is correct behaviour, not a fault.
- **Live releases** (Fuad 2026-07-25): no read — they get a GIST-ONLY entry describing
  what the release is (NIN Beside You In Time is the model); their songs keep their reads
  on the studio records.
- **Unplayed tracks** (Fuad 2026-07-25): albums may contain songs never scrobbled here
  (unplayed, or lost to last.fm limits). PERMITTED — the read is written from the played
  tracks' reads — but FLAGGED: holes in the trackNo sequence reveal them; note the gap
  lightly in the gist (PRO8L3M s/t is the model: "three album cuts never scrobbled
  here"). The read itself must not claim totality it doesn't have. Rollout intent is
  decent coverage of the MOST-played albums, not completeness of every album played.

## The emergence question (tested 2026-08-10 — NOT adopted; under consideration)

A diagnosed weakness of the settled brief, found on Fear of a Blank Planet: asking for
"the throughline the track reads keep circling" yields the INTERSECTION of the reads,
and the common denominator of six sharp readings is a blunt one. The resulting liner was
accurate but semi-clinical — every clause a compressed citation of a track read's
conclusion ("X sets, Y builds, Z rehearses": role-assignment, which is inventory wearing
a thesis). Three structural causes: the writer never touches primary material (reads of
reads); the anchor-track requirement plus the grounding rule pushes citation; and no
album-level image budget exists, so liners are categorically imageless.

A one-change redraft swapped the question: not the shared throughline, but what the reads
TOGETHER reveal that no single read states — the claim only visible at album scale — with
the Midori debut liner as register model (its opening claim is a relation BETWEEN songs;
its anchors re-discover with concrete objects; its close is an album-level finding).
Result: a clearly stronger liner ("every door it opens onto relief turns out to be the
same door as erasure"; "even the two moments of tenderness are traps" — a genuinely
emergent find), at the cost of one surviving essay-tic clause. Both versions ship on the
FoaBP portrait — v1 as `liner`, v2 as `liner2` (the flickable face) — so the pair is
inspectable in place.

Status: Fuad is considering whether the emergence question replaces the intersection
question for future albums. Until he rules, the settled brief stands. The Midori debut
observation worth keeping either way: language distance (Japanese titles, hashed keys)
FORCED re-rendering there — emergence appeared without being asked for, which suggests
the question, not the writer, is the lever.

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
4. **Gists are STATS-FREE** (Fuad 2026-07-26): never bake a raw play count into gist
   prose — every page that renders a PortraitCard already shows live plays in its header,
   and baked numbers rot as the library keeps scrobbling. The gist keeps listening-SHAPE
   judgments only: relative claims ("far ahead of everything else", "the deepest-played of
   their early records"), spans/discovery years, and unplayed-cut flags. Writing the gist
   stays a Fable QC step after the Opus read. (87 legacy gists migrated 2026-07-26.)
5. Owner approves each batch inline before apply.

## Rendering

`PortraitCard` linkifies mentioned track titles inside album reads (gist, liner, arc):
case-sensitive exact-title matches with non-letter boundaries, longest-first, so
common-word titles (Only, Wish, Stone) only hit their capitalized mentions. Links are
invisible at rest; hover = dotted underline + accent (`.pv-tracklink`); click routes to
the track page. The `arc` coda renders italic. Album pages already gate on media-index,
which supplies the title list.

Artist portraits linkify too (2026-07-26): the artist's ALBUM titles route to album
pages, and their track titles route to track pages where no album shares the name —
albums win title ties, because artist reads anchor albums (a "Toxicity" mention links
the record, not the title track). Applies to gist, portrait and `note`. If media-index
isn't resident on an artist page the read simply renders unlinked.

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

**Future depth pass (Fuad 2026-07-27, pinned):** the album/artist reads are solid, but
some early entries may be leaving insight on the table — SOAD, Tool and NIN felt like
they were hitting limits. Revisit selectively later to see how much more can be
extracted; also run limited tests of the new song budgets on the hardest already-covered
songs. Not now — pinned.

## Track-level flagship reads (the fable tier, 2026-07-27+)

Songs carry a flagship "what's it about?" read as the `fable` field in llm-about.js
(`"fv":2` marks the fable tier; UI shows "via Opus · Fable" — Opus authors,
Fable QCs). Written one solo agent per song under a frozen minimal brief; mechanical
anti-quoting gate + fact/placement verification at QC; verified extra layers ride as
`fnote` (an italic line under the read; `fnote2` = a second, perspective-class slot).
**Revision marker (2026-08-12):** `fvr:"2.3"` = written under the full current QC
(an independent account-first cross-check before each read is judged, plus a whole-batch
final sweep after verification); `fv:2` entries without `fvr` are **v2.2** (frozen-pipeline
era) — the natural target list for the pinned future depth pass. The Fable source button's
tooltip surfaces the revision. Every new apply ships 2.3. Albums whose songs are fully fable-covered may
carry an ALTERNATE album read synthesized from those flagship reads (`liner2`/`arc2`,
flickable via Fable on the PortraitCard). Operational details live in the untracked
workshop docs.

## Album reads — the STANDALONE-SOLID doctrine (Fuad 2026-08-12; supersedes the same-day "tight spec", which over-corrected)

Album reads are NOT one canonical shape. Each entry should be standalone solid — a
satisfying multi-register piece — with tightness a non-goal. The REGISTER CHECKLIST
(coverage guidance, order flexible, never a template):

1. **The album in the world — AND in the ear** — era, place in the catalog, one line of
   real lore or reception where it earns its place, AND the record's sonic identity (what
   it actually sounds like: Shinsekai's rawness, Gore's vaporous drift). Fuad 2026-08-12:
   a gist that gives only context/meta without the sound "doesn't reflect the album
   itself" — the GIST especially must carry the sonic identity.
2. **What it's about** — the emergent thesis, from the fable reads where coverage exists.
3. **Its shine** — where the record is best. The EXPANDED WALK IS WELCOME here when every
   station earns its stop (Downward Spiral's station-walk is the positive model; a walk
   only fails when it substitutes for having a thesis).
4. **The personal layer** — honest listening-shape from real play data: dominance
   patterns, first-heard, how the deep cuts behave (the gist may carry this instead).
5. **A close that lands** — the arc.

**arc**: ONE resonant sentence that may draw on the album's structure, the artist's
story, its fame, or the owner's history — any register, as long as it lands (Shinsekai's
arc = structural fact + the band's end, the fullest model; Fear Inoculum's Pneuma line =
the pure-structural variant). A compressed multi-song walk is still not an arc.

**Synthesis mechanics** (unchanged): thesis register sourced from the album's fable
reads + fnotes; lore lines must be verification-grade; personal-layer lines from real
data only. Albums WITH an existing primary liner keep it — synthesis lands as
liner2/arc2 (the flick face). Albums WITHOUT an entry get the full register treatment as
a new primary. Print everything for the owner's verdict before applying.

**Remediation plan (marked down 2026-08-12; phases await go):**
- Phase 1: arc backfill — 68 of 101 album entries lack any arc.
- Phase 2: register audit of thin entries (entries missing the world/personal registers —
  the new Gore entry is itself the type specimen of thesis-only thinness; fix it first).
- Phase 3: the 3 gist-only stubs + the one liner2-without-arc2 entry.
- Phase 4: replication — the 12 fully-fable-covered albums lacking syntheses.

**Variant album pages**: when a read was written on plays merged across library
variants (edition spellings, promo pressings, mojibake titles), the finished entry
is MIRRORED under every variant's album key so each album page shows it (e.g. both
Random Album Title keys); the gist says "across editions" where the count is merged.
