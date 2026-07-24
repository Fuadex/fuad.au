> Part of the fuad.au docs — start at [/GUIDE.md](/GUIDE.md)

# Study tours — writing spec (`art_inspect.js`)

The INSPECTION layer: per-work deep studies that power Study mode (`#/study/<id>`) — a
reading pane beside a zoomable image, where each `deeper` stop flies the viewer to a
region of the painting. This spec is what a drafting model (Opus subagent) receives;
the QC protocol at the bottom is what the reviewing model (Fable) runs before merge.

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

## Production pipeline (the 2026-07-24 wave, 6 works)

1. Download the work's image locally (Commons `Special:FilePath/<name>?width=1600`,
   URL-encode the filename; Commons rate-limits — space requests). The coordinates are
   fractions of whatever image the writer studies; the site displays the same art_data
   image, so fractions transfer.
2. One **Opus subagent per work**, given: this spec, the image path (agents view images
   via Read), the canon facts (venue, confidence, floored/liked, existing reads), and
   any history worth pre-flagging for verification. Output: one JSON per work.
3. **Fable QC** (mandatory — agents' self-checked coordinates drift):
   - Fact-check every claim; web-verify the load-bearing ones. Resolve or strip flags.
   - **Crop every `deeper` box out of the image (PIL) and look at it.** In the first
     wave 6 of 42 boxes were wrong despite agent self-verification (a Fuji reduced to
     a sliver, a boat that was mostly sky), and crops caught a goat-head described as
     a bird-head. Never merge un-cropped.
   - Recalibrate boxes / fix text, strip `id` + `flags`, merge into `art_inspect.js`
     (`window.CANVAS_INSPECT`), re-parse to validate, push (canvas `?v=` is auto).
