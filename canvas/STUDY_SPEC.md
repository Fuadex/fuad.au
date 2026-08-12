> Part of the fuad.au docs — start at [/GUIDE.md](/GUIDE.md)

# Study tours — writing spec (`art_inspect.js`)

The INSPECTION layer: per-work deep studies that power Study mode (`#/study/<id>`) — a
reading pane beside a zoomable image, where each `deeper` stop flies the viewer to a
region of the painting. This spec is what a drafting model (Opus subagent) receives;
the QC protocol at the bottom is what the reviewing model runs before merge.

The brief, in Fuad's words: the deep reads should "showcase what makes them what they
are so I can also understand what got me that interested by the artwork."

## Entry format (one JSON object per work)

- `see` — what is literally on the surface and how it works on the eye (90–170 words)
- `about` — what the picture is about; the layer behind the subject (90–170 words)
- `craft` — why it sings: technique, composition, the decisions (90–170 words)
- `context` — the moment around it: history, biography, scandal; closes with the
  personal-encounter line only as the canon allows (90–170 words)
- `deeper` — the detail tour: array of stops
  `{ t, x, y, w, h, body }` — `t` a short title, `body` 80–160 words.
  Coordinates are FRACTIONS of the displayed image (0–1): x,y = top-left of the box,
  w,h = extent. A box must actually contain what its body describes.
- `flags` — (draft only, stripped at merge) any claim the writer is not fully certain
  of. Doubts go here, never into the text.

## Tour structure (settled 2026-07-24, Fuad-approved)

- **Stop count is free** — as many stops as the painting earns (3–9), no padding to a
  number. A crowded Rubens carries 8; a sparse field might earn 3.
- **Arc order**: open with the thing that pulls you in from across the room, work
  through the painting's argument region by region, close with either the smallest
  telling detail or a step-back synthesis — a wide box (up to full-frame) is allowed
  for the synthesis stop.
- Each stop must teach the eye something it would not have caught alone; no stop that
  merely names what is in the box.

## Voice and truth rules

- Literate, direct, concrete. No filler, no "masterpiece" talk, no exclamation marks.
- Facts only where confident; where scholarship on the specific work is thin, say so
  and reason from the eye (the sergel entry is the model for a thin record).
- "You" (addressing Fuad) is allowed only for canon-backed encounter facts — and only
  where `seenConfidence` is **sure**. For `probably`/`unsure` works, state the
  institutional fact ("home of X"), never "you met X". (QC lesson from the museum
  reads, 2026-07-24.)
- Where an `art-about.js` read already exists, the study must not contradict or repeat
  it — its points are taken; go deeper.

## Production pipeline (matured — as run through batch 31, 2026-08-06)

The store is at **300 tours** (batches shipped in waves of 10–25). Each batch runs a
per-work workshop dir at `.dtmp/toursNN/` holding `canon.json`, `p18.json`, the shared
`STUDY_BRIEF.md`, `cs.py`, `ids.json`, the downloaded `img_<id>.jpg`, and the drafters'
`out_tour_<id>.json`. The loop:

1. **Pick the batch.** The tour-priority signal is `seenConfidence:"sure"` + a `note` in
   the canon (there is **no** `favorite` flag). That 2D-painting pool is now exhausted, so
   batches draw from the `unsure`/`probably` marquee tier. **Screen images first:**
   sculpture / installation / gallery-room shots / b&w print repros are NOT tour-eligible —
   the fly-to-region format needs a painted surface. Some canon P18s are b&w heliogravures
   or framed gallery photos; catch these before drafting.
2. **Download each image** locally. Resolve the canon `qid`'s P18 via Wikidata
   `wbgetentities` / `Special:EntityData`, then Commons `Special:FilePath/<file>?width=1600`
   (URL-encode; Commons rate-limits — space requests). Broken qids resolve via Commons
   search or `en.wikipedia.org` pageprops `wikibase_item`. Note low-res briefs so drafters
   ask for fewer, larger stops.
3. **Draft:** one **Opus subagent per work**, in waves of ~5, each given the shared
   `STUDY_BRIEF.md`, the image path, and per-work preflags **including `seenConfidence`**
   (so the drafter uses the right framing). Output: one `out_tour_<id>.json` each. Badge the
   merged entry `by:"Opus 4.8"`.
4. **Box QC (mandatory — never merge un-cropped):** run `cs.py` to draw numbered overlays
   (`ov_<id>.jpg`) and crop every `deeper` box (`box_<id>_N.jpg`), then look at every crop.
   Recent batches run near-zero fixes because drafters are told upfront the boxes will be
   crop-checked — but the format still catches real drift.
5. **Fact QC:** batch of Sonnet web-verifiers (one per work, or grouped), each handed the
   work's `flags[]` and text, reporting `FIX: "<old>" => "<new>"` for confirmed errors only.
   Apply as minimal Python string patches (**use a real em-dash `—`, not `--`**).
6. **Merge:** insertion-only into `window.CANVAS_INSPECT` after the `window.CANVAS_INSPECT = {\n`
   anchor — strip `id` + `flags`, keep `by`. Prove the round-trip: eval before/after, assert
   every existing entry is byte-identical, the count delta equals the batch size, and no box
   exceeds `[0, 1.002]`. Commit (`git commit -F -`) and push (canvas `?v=` is auto).

## QC lessons (accumulated — read before drafting/QC)

- **Draft against the plate the SITE displays** (tours10, 2026-08-13). Box coordinates are
  fractions of the displayed image, so a tour drafted on a different Commons reproduction of
  the same painting is invalid — every box flies to the wrong region. Before drafting, read
  `art_data.artworks[id].img` (and any hand-set canon `img`) and download THAT exact file.
  Caught on Marquet's Pont Neuf: the site shows `...la nuit 02.jpg` (tight plate) while the
  P18 download was `...01.jpg` (framed gallery shot).
- **If the site's plate is the poor one, upgrade the site — don't bind the tour to it**
  (Fuad's ruling, same batch). Delaunay's P18 is a framed, grey-green-white-balanced gallery
  photograph; the Google Art Project file on Commons is flat and colour-true. Hand-set the
  better plate on the canon row, then draft against it. Search Commons via
  `action=query&generator=search&gsrnamespace=6` with `imageinfo` and sort by pixel area.
- **Never hand-build an `upload.wikimedia.org/.../thumb/x/xx/` URL.** That path segment is the
  first hex digits of the filename's MD5; a guessed one 404s silently and leaves a blank tile
  (I wrote `e/e8` for a file whose hash starts `db`). Use
  `commons.wikimedia.org/wiki/Special:FilePath/<urlencoded name>?width=N` — no hash needed —
  and HEAD-check every image URL before it enters canon.
- **Verify the drafter's flags against the text, not the flag's own claim.** A Marquet flag
  said the address was "deliberately left vague"; the text asserted a specific flat on the
  place du Pont-Neuf, which no source supports. Read the passage the flag refers to.
- **A qid typed from memory is a wrong-artwork risk.** A hand-substituted qid resolved to an
  unrelated photograph; the drafter correctly refused to write rather than invent boxes.
  Substitutions must take their qid from the canon row, never from recall.

- **Image beats web on anything visible.** Fact-verifiers work from text and are routinely
  wrong about a work's *visuals* (they've mis-called costume colour, hat shape, weapon
  count). Only apply verifier fixes to non-visual history; trust the drafter's image-read
  for what's on the surface. It also beats your own hasty text edits (the Ophelia robin: I
  moved the text per a verifier before re-checking the image, and had to move it back).
- **Reconcile the tour against the CANON entry, not just your brief.** A preflag naming the
  wrong institution sends the verifier to check the wrong *object* entirely (Goya
  Truth/Time/History: the canon `seenAt`/qid is the Stockholm finished canvas, but the brief
  said "MFA Boston sketch" — a different work with a different title). Always check
  `seenAt` + `qid` before trusting a preflag.
- **Some canon images are framed gallery photos.** Coordinates are fractions of *that*
  photo, so verify boxes don't clip onto the frame (Degas Two Dancers: two boxes had to be
  tightened off the gold frame).
- **Dark silhouettes read as empty** in both the drafted box and a brightened crop — verify
  against an *unbrightened* zoom that shows the figure's contour against a light neighbour
  (Munch's near-invisible top-hatted man). Brightening *hurts* a shadow-figure.
- **Trust the drafter when the qid image differs from your preflags** — they're reading the
  actual image and correctly adapt (Manet self-portrait = the skull-cap Artizon version, not
  the private palette one).
- **On subagent overload / session limits** (daily limit resets ~06:40 Sydney; occasional
  529s): hand-draft the affected works directly rather than stall — same quality, still
  badged honestly.
- A work with a **broken qid shows no image on the site** — worth periodic qid audits
  (P31/P18/P170). False positives: pastels/sculptures/murals (P31 ≠ "painting") and
  intentional `met-NNNNN` accession pseudo-ids.
