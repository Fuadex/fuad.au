# PLATE HUNT — wave 29 (2026-10-20). A data job: find the best image of THIS object; recommend, never rule.

The Canvas site shows each artwork with a zoomable image (the "plate"). A study tour draws boxes on that plate, so the plate
must be (1) THIS object — this version, this holder, the recto — and (2) as large and faithful as can be found. The site's
current file for each of your works is small (shown in the table you are given). Your job: find better.

## Where to look, in order
1. The HOLDER's own collection page and its IIIF manifest or download (many museums serve 3000–8000 px). Orsay's site
   blocks robots: try the Wayback Machine (web.archive.org) snapshot of the collection page, and Orsay images on Commons.
   British Museum: media.britishmuseum.org serves larger renditions than the "preview" — check the collection page's image
   links. NGV, Pola, Art Institute etc.: their own pages.
2. Wikimedia Commons: search `action=query&generator=search&gsrnamespace=6&gsrsearch=<terms>&prop=imageinfo&iiprop=url|size`
   and sort by pixel area. Google Art Project files are often the largest. Check every file's category and description.
3. Wikidata: the work's P18 image and its holder (P195) and inventory number (P217).

## For every candidate, record
URL (a direct file URL, never a hand-built thumb path — use `Special:FilePath/<name>` for Commons), pixel size, whether
frame / mount / wall / colour target is in shot, the source and what it says the object is (holder, inventory, date),
and whether it is THIS version (a sister version of the same motif is a DIFFERENT object — say so). Look at each candidate
(download a small version and view it) before recommending it: reject a verso, a halftone print scan, a black-and-white
photo, a crop that cuts the picture, or one with fewer pixels than the current file.

## Rules
- Every web request you script carries the header `User-Agent: CanvasAudit/1.0 (https://fuad.au)` and NEVER an email.
- Space Commons requests (rate limits). Never hand-build `upload.wikimedia.org/.../thumb/x/xx/` paths.
- Save the best candidate's ORIGINAL bytes as `cand_<id>.jpg` in the workshop (one per work; skip if the current file wins).
- Do not use the Agent tool. Do not edit any other file.

## Output — append one block per work to `hunt_<LETTER>.md` (your prompt names the letter)
```
## <id>
HOLDER: <museum, inventory if found> | THIS VERSION: yes/no/unsure (why)
BEST: <url> | <w>x<h> | frame/mount: <none / where> | source: <...>
OTHERS: <url> <w>x<h> <why not>
VERDICT: UPGRADE (cand_<id>.jpg saved) | KEEP CURRENT | DROP (no image of this object above ~1300 px; or identity unsettled — why)
NOTES: <identity problems, date or title conflicts, anything the tour should know>
```

## WAVE NN — the works (current site file in brackets)
<<WAVE-SPECIFIC — written per wave by the brief generator; see the latest .dtmp/tourwaveNN/ for a filled example>>
