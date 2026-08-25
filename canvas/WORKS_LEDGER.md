> Part of the fuad.au docs — start at [/GUIDE.md](/GUIDE.md)

# WORKS_LEDGER — the per-work tally

**What this is.** One line per artwork. What was wrong with it, what was done, which commit did
it — or, if it is still open, what would settle it and who is waiting.

**What this is NOT.** It is not the story of a session. The narrative — the waves, the audits, the
method lessons, the base rates, the rulings and the arguments behind them — lives in
[`QC_LEDGER.md`](QC_LEDGER.md), and the sourcing anatomy lives in
[`HIRES_SOURCING.md`](HIRES_SOURCING.md). **This file is a tally, so it has to stay cheap to
update and cheap to scan.** If you find yourself writing a paragraph, it belongs in QC_LEDGER and
this file gets the one-line residue plus a pointer.

## How to use it

- **Grep by work id.** Every row is keyed on the canon slug exactly as it appears in
  `artworks.js`. `grep -n '<slug>' canvas/WORKS_LEDGER.md` should be the fastest way to learn
  everything the project knows about a work's history.
- **Add rows, don't rewrite them.** When something in NEEDS ANOTHER LOOK is settled, move the row
  to FIXED and fill in the commit. Keep the original "what was wrong" wording — the point of a
  tally is that you can see what a work has already cost.
- **One work, one row per defect.** A work that was fixed twice gets two FIXED rows. A work that
  is both fixed and still open appears in both tables; that is normal and not a contradiction.
- **Batch fixes** (a wave of trims, a plate-adoption sweep) get a row in **§1b**, not 40 rows in
  §1. The per-work slugs for those live in the plan file named in the row.
- ⚠ marks a field taken from a working sheet or a subject line rather than verified against the
  store. Verify before you rely on it.

---

## 1. FIXED

| work id | what was wrong | what was done | commit | date |
|---|---|---|---|---|
| `giovanni-battista-tiepolo-die-verehrung-der-trinitat-durch-d` | Row was two paintings: `seenAt: national-gallery-london` but qid + plate were the Munich altarpiece (488 × 256 cm, Alte Pinakothek) | Repointed at NG6273, the London picture — qid now `Q26689432`, title *A Vision of the Trinity* | `36a1f18` | 2026-08-25 |
| `odilon-redon-untitled-10` | Duplicate canon row — two Wikidata items (`Q132195486` / `Q83507923`) for one physical painting, *Conque marine*, Collection Bemberg inv. 2138 | Row removed across the canon stores; `odilon-redon-untitled-4` / `Q83507923` kept. Verified gone from `artworks.js`, `art_data.js`, `art_hires.js`, `art_imgsize.js`, `art_medium.js`, `art_subjects.js` | `0bfb373` | 2026-08-25 |
| `ferdynand-ruszczyc-stary-dom` | MNW candidate was truer to the object (gained framing) but gained no real resolution | **Ruled by Fuad**: kept the cropped Commons plate. *Truer to the object* and *the better picture to look at* are different tests; where a re-frame gains no detail, the second one decides | `9b3d5aa` | 2026-08-25 |
| `two-old-men-disputing` | Zoomify tile base passed **unproxied**; NGV serves `ACAO: content.ngv.vic.gov.au`, so every `crossOrigin` tile was blocked. `ZoomifyTileSource` fetches no descriptor, so `open-failed` never fired — blank tiles, no error, on a toured Rembrandt with 6 study chapters | `tilesUrl: proxied(work.hires.zoomify)` in `canvas-app.jsx` | `ba6f2a5` | 2026-08-25 |
| `theo-van-rysselberghe-coastal-scene` | Record declared 28,641 × 23,726; the server clamps every flat render at 800 px and silently upscaled 1024-px tile requests (≈78 % of available detail) | `tiles: 256` in the inline descriptor (server's own advice, which we had thrown away) + honest `hires.flat: [800, 662]` in the footer | `bf57964` | 2026-08-25 |
| `madonna-of-the-pinks` | Same NG London clamp; **and** `hires.img` pointed at `/full/!3000,3000/`, a filename-as-dimension of our own making, which silently downgraded the plain Zoom overlay from the Commons 870 × 1,080 to NG's 643 × 800 | `tiles: 256`, `hires.flat: [643, 800]`, `img` repointed to the Commons plate | `bf57964` | 2026-08-25 |
| `stanczyk` | MNW candidate scored ×1.85 — but only because the gate ran against `art_imgsize` (3,118 × 2,313) instead of the row actually served. Candidate 5,759 × 4,277 is **smaller on both axes** than the live `art_hires` 5,766 × 4,289 | Not adopted. Gate rule corrected to `max(art_imgsize, art_hires)` per axis | `ddbb1df` | 2026-08-25 |
| `ferdinand-hodler-mount-niesen-seen-from-heustrich` | Stop 7: three of six clauses false, **including the payoff**. The lower-right corner is one of the lightest passages below the skyline, not shadow; the fir shapes it denied are present; the signature is dark-on-pale | Stop rewritten (not repaired); box kept and re-verified against the crop | `796ab42` | 2026-08-25 |
| `woman-with-a-parrot` | The raised hand was called her right; it is her left | Settled on a larger plate that resolves the white cuff on the lower hand and the crossing forearm behind it | `796ab42` | 2026-08-25 |
| `pierre-auguste-renoir-alphonsine-fournaise` | 56-word Info, outside the 32–38 band, closing on a fact about a different painting | Info replaced. The `refs` link to *Luncheon of the Boating Party* was **not** re-minted — that entry's prose never names Alphonsine, so there was no honest anchor | `808621d` | 2026-08-25 |
| `giovanni-boldini-after-the-bath` | No tour | 9-stop tour added; year kept at 1889 with the Wikidata 1873 conflict stated in `context` | `808621d` | 2026-08-25 |
| `jean-jacques-henner-eglogue` | No tour | 8-stop tour + read added | `808621d` | 2026-08-25 |
| `the-spanish-singer` | `beside` recapped the plate's own tour and dragged in a third work not in the collection | Beside revised, 118 → 99 words | `8955f81` | 2026-08-25 |
| `several-circles` | `beside` argued one point with one companion | Second companion added (`composition-viii`); reversal made two-sided, 116 → 120 | `8955f81` | 2026-08-25 |
| `haystacks-midday` | `beside` restated the craft lens and stops 2–3 nearly word for word | Recap cut, room given to the reversal, 116 → 105 | `8955f81` | 2026-08-25 |
| `les-raboteurs-de-parquet` | `beside` repeated the about lens verbatim and its own first sentence | 116 → 105 | `8955f81` | 2026-08-25 |
| `pierre-auguste-renoir-by-the-seashore` | `beside` carried off-canvas reception in the research-note register + a shadow claim this plate does not make | Two clauses cut, nothing added, 115 → 94 | `8955f81` | 2026-08-25 |
| `bauerngarten-mit-sonnenblumen` | Already carried a `context` ref, so the bare-array `beside` form would have overwritten it | `refs` object gains a `beside` key instead | `3bdec1c` | 2026-08-25 |
| `fjaestad-winter-moonlight` | `img` was a dead `/full/3000,/0/default.jpg` — 501, *"height is above server limit 1000 px"*. It was the row's only fallback **and** the target of the footer's link | Repaired to `/full/full/` (the one flat spelling this host honours) + `flat` records the measured 1000 px size, so the footer stops advertising a master it cannot deliver | `277babb` | 2026-08-25 |
| `the-hydra` | The "upgrade" was a photograph of **the back of the panel** | Rejected; row left on the correct plate | `3f5467b` | 2026-08-25 |
| `salvador-dali-the-great-masturbator` ⚠ | Stop box coordinates wrong | Boxes fixed | `3f5467b` | 2026-08-25 |
| `paul-cezanne-arlequin` | Venue was wrong | `seenAt` struck; two dates resolved by research in the same pass | `b77fbfe` | 2026-08-24 |
| `jules-adler-la-soupe-des-pauvres` | Shipped text needed a back-edit after the wave-4 verdict | Back-edit applied with the wave-4 factual repairs | `ffaf6af` | 2026-08-25 |
| `podkowinski-szal-uniesien` ⚠ | Plate below the reader floor | Plate upgraded in the wave-1 image-QC pass | `ac97a3f` | 2026-08-24 |
| `camille-pissarro-route-de-versailles-louveciennes-rain-effec` | Recorded as unsettled — *"plate source behind a Cloudflare challenge, no IIIF at any subdomain"* | **Closed, negative.** `clarkart.edu` is **open** (200, 55,170 B real markup, no `cf-mitigated`) — the challenge note was false. No IIIF exists on either side; `media.clarkart.edu/hires/1955.825.tif` is **byte-identical** (94,699,620 B) to the Commons file we already serve. Gain available ×1.00. **Do not re-hunt.** Working sheet `.dtmp/tourqc-pass/w22/CLARK_PISSARRO.json` (local workshop artifact, not deployed) | *(research only — no data change)* | 2026-08-25 |
| `jan-both-tradstudie` | Identity recorded as unsettled — *"NM measures smaller AND NM titles object 95937 differently"* | **Closed. One object, nothing mis-titled.** NM's record for 95937 carries **both** titles (`sv: Trädstudie`, `en: Landscape with Mercury and Argus`); inventory `NMH 56/1876` matches P217 exactly. Decided **on the pictures** — same foxing stains in the same places, same central vertical fold. NM's 3,822 × 3,278 is smaller than our 18.1 MP plate: do not adopt. Sheet `.dtmp/tourqc-pass/w22/JAN_BOTH.json` | *(research only — no data change)* | 2026-08-25 |

### 1b. Batch fixes — counted here, slugs in the linked plan

| batch | works / units | what | commit | date |
|---|---:|---|---|---|
| w17 plate adoptions (Guggenheim + MNW) | 68 | plates adopted, NG London measured; sheets `.dtmp/tourqc-pass/w17/{gugg,mnw}/RESULTS.json` | `ddbb1df` | 2026-08-25 |
| w20 MNW re-framings, `MODE=tourless` | 17 | better-framed plates adopted (11 new rows + 6 upserts), `art_hires` 1,141 → 1,152; plan `.dtmp/tourqc-pass/w20/` | `e4a5d8d` | 2026-08-25 |
| Nationalmuseum Stockholm IIIF | 23 + 3 | 23 tile pyramids adopted at 0.0000 % aspect delta (124.5 → 271.3 MP of reachable master); 3 pre-existing NM rows repaired; plan `C:/tmp/hires46/PLAN.json` group A | `277babb` | 2026-08-25 |
| Micrio + Art UK | 27 + 9 | tile pyramids adopted / resolution floors raised | `794aa50` | 2026-08-25 |
| Micrio revert | 4 | records that lost pixels on an axis, reverted | `89893e1` | 2026-08-25 |
| deep-zoom adoption | 10 | higher-res sources + Zoomify and DZI support | `1b3b9d6` | 2026-08-25 |
| Law-2 trims, batch 1 | 26 trims / 15 tours | text an adjoining stop already spent | `da54daa` | 2026-08-25 |
| Law-2 trims, batch 2 | 29 trims / 15 tours | same | `d16e612` | 2026-08-25 |
| Law-2 trims, w12r re-review | 38 trims / 12 tours | 41 staged, 3 dropped as unjustified | `796ab42` | 2026-08-25 |
| box repairs, batch 1 | 12 boxes / 7 tours | coordinate fixes | `c238bfc` | 2026-08-25 |
| wave-2 tour repairs | 20 tours | image-QC point fixes | `0e5f7a7`, `9caaf54` | 2026-08-25 |
| wave-3 tour repairs | 6 tours | visual-class repairs | `bf0110f` | 2026-08-25 |
| wave-4 tour repairs | 82 text + 27 box + 1 title | factual repairs + approved besides + refs data | `ffaf6af` | 2026-08-25 |
| redraft-class tours | 4 | whole-tour redrafts | `4636b6d` | 2026-08-25 |
| wave-1 image-QC point fixes | 20 tours | first image-QC wave | `ac97a3f` | 2026-08-24 |
| box padding | all tours | stop boxes padded ×1.15 for close-ups; coverage guard recalibrated | `b3e1d9b` | 2026-08-25 |
| Interpretations from tours | 142 | Interpretation tier written from existing tours | `ac0b975` | 2026-08-24 |
| Interpretation/Info overlap | 7 | reads whose Interpretation re-told its Info | `522ae33` | 2026-08-24 |
| read pairs re-cut | 142 | to the Parasol/Szal proportion | `a5636cc`, `04bd755`, `1dc2021`, `6e96ee0` | 2026-08-24 |
| `beside` paragraphs, wave 1 | 12 | first beside wave; `beside` 7 → 19 | `3bdec1c` | 2026-08-25 |
| lk2 study tours | 18 | tours added, plus a wrong-painting fix | `8a19ce4` | 2026-08-24 |
| Boldini ingest | 21 | new works ingested | `f6cbb98` | 2026-08-25 |
| w19a merge | 3 tours + 3 reads | `art_inspect` 375 → 378, `art-about` 798 → 800 | `808621d` | 2026-08-25 |
| research-note leak | 1 | a research note had shipped as reader-facing prose | `87de812` | 2026-08-25 |
| w17 ten held tours + reads (apply-with-fixes, w21 repair) | 10 tours + 10 reads | RULED apply-with-fixes; w21 A 13 + B 17 edits; Rohlfs + Ranelagh clean; San Rocco edit → DO-NOT-APPLY. `art_inspect` 379 → 389, `art-about` 801 → 807 | `43a882e` | 2026-08-25 |
| NM group B (6) + 2 Dürer GAP upgrades | 6 + 2 | RULED adopt all six; Bretagne 7-box + Midsummer 4-box remaps; en-premiar keeps its Commons TIFF as the flat download; Dürer same-impression Commons masters | `a7d6316` | 2026-08-25 |
| NM group D pyr ladders + Guggenheim five | 4 + 5 | RULED adopt; 4 Commons render ladders (dims down to served bucket + `pyr`); Guggenheim red-oval/nude-study/peasant-woman/birsk/blue-mountain (7-box remap on blue-mountain; round-6 url was a 1168px derivative, master at `uploads/1908/01/`) | `0eb7787` | 2026-08-25 |
| Tiepolo NG6273 cascade | 1 tour + reads | plate adopted (5.3 → 28.6 MP NG IIIF master), palette regenerated, 9-stop tour + beside + reads drafted and APPROVED | `d5941d3`, `09d07f2` | 2026-08-25 |

---

## 2. NEEDS ANOTHER LOOK

| work id | what is open | what would settle it | blocked on / who is waiting |
|---|---|---|---|
| ~~`giovanni-battista-tiepolo-die-verehrung-der-trinitat-durch-d`~~ | ✅ **CLOSED 2026-08-25 (`d5941d3`, `09d07f2`).** NG London IIIF master adopted (5.3 → 28.6 MP), palette regenerated, 9-stop tour + beside + reads drafted, APPROVED and applied. The Munich-altarpiece residue is resolved — the plate and prose are NG6273 now | — | — |
| `degas-grande-arabesque-third-time` | Canon note and Info say *"a bronze cast"*; the plate is **NGA 1999.80.10, the pigmented-beeswax wax**; `seenAt: met-nyc` records an encounter with the **Met's bronze**. Three different objects in one row | **Fuad's ruling** on which object the row is. Every cast is a different photographed object, so this is a split, not a wording nit | Fuad. Then a re-plate or a redraft, not an edit |
| `denys-puech-l-aurore-by-denys-puech` | Wikidata says **bronze**; the plate shows translucent white stone taking a mirror polish, with bedding veins running out of the figure into the base | The Orsay holder record, or a second plate of the same object | Fuad. **And STUDY_SPEC's four carving additions cite this reading as their evidence** — if the material call is wrong, the spec rules built on it are too |
| `woman-with-a-parrot` | Stop 7's **"sealed interior" absolute is measurably overstated** — the pale field behind her measures real but reads as curtain or window either way. The handedness fix landed; this was deliberately left alone. **The same claim also sits in the work's Interpretation** | Redraft stop 7 **and** the Interpretation together — fixing one leaves the other contradicting it | Nobody. A drafting pass |
| `odilon-redon-untitled-4` | Dedupe applied downstream, but (a) `Q132195486` → `Q83507923` has **not** been reported upstream for merge, (b) Wikidata's **P2048/P2049 are transposed** (23 h × 37 w records a portrait canvas as landscape), (c) `HIRES_GALLERY.md` and `QC_LEDGER.md` still name the removed `-10` slug | An upstream merge request + a P2048/P2049 swap + a doc sweep for the dead slug | Nobody. Cheap |
| `jan-both-tradstudie` | Identity settled; dims correction + group-D `pyr` ladder **APPLIED 2026-08-25 (`0eb7787`)** — declared dims taken down to the served 3,840 × 3,284. Residue: Wikidata's P2048/P2049 are transposed here (holder types it `h × b`, 290 × 339 mm) | Report the P-swap upstream | Nobody. Cheap |
| `camille-pissarro-route-de-versailles-louveciennes-rain-effec` | Plate hunt **closed negative** (§1) — but the plate we serve is **dirty**: a ColorChecker target strip, Clark copyright text and the burnt-in accession sit in the margins, 4.8 % of aspect. And `art_hires` declares 6,817 × 4,629 while the url delivers **3,840 × 2,608** | Fuad's call on cropping (client-side, or at the `img.fuad.au` Worker — there is no IIIF on either side to crop with) + a dims correction. ⚠ Same margin furniture is on sibling `1955.828`, so this may be **holder-wide across the Clark's Commons batch** — worth a corpus sweep | Fuad, for the crop. The dims correction needs no verdict |
| ~~ten held w17 tours (Rubens Het Steen, Saint Roch, Ranelagh, Rohlfs, Le Givre, Bonnard, Hoa Hakananai'a, Signac ombrelle, Rue Montorgueil, Chevalier Buffalo Ranges)~~ | ✅ **RULED apply-with-fixes and APPLIED 2026-08-25 (`43a882e`)** after the w21 second-opinion. Moved to §1b. Residues that stayed open: the w9a/w9b Saint Roch back-edit → DO-NOT-APPLY register; `nicholas-chevalier-the-buffalo-ranges` `seenAt: aus-performing-arts` vs NGV holder still needs Fuad (loan?) | — | — |
| `nicholas-chevalier-the-buffalo-ranges` | Tour SHIPPED (`43a882e`). Residue: `seenAt: aus-performing-arts` conflicts with the work's NGV holder | **Fuad** — the Artizon ruling raises the prior that this is a loan too, but it does not settle it | Fuad |
| `julian-fa-at-powrot-z-polowania-na-niedzwiedzia` | **w20 `MODE=toured`, STAGED AND UNAPPLIED.** New MNW plate + **9 box** remap are one coupled change; registration NCC 0.956 | Apply the staged plan (dry-run first) once `art_inspect.js` has no live writer. Guard is hard, no override — if the 4 records or the 30 padded boxes have drifted, **re-run the registration, do not force it** | A clear `art_inspect.js`. The pass declined to write into a store with a second writer — keep that judgement |
| `unknown-s-once-majowe` | **w20 `MODE=toured`, STAGED AND UNAPPLIED.** New plate + **8 box** remap; NCC 0.9953 | as above | as above |
| `at-the-seashore` | **w20 `MODE=toured`, STAGED AND UNAPPLIED.** New plate + **8 box** remap; NCC 0.9990 | as above | as above |
| `the-hanging-of-the-sigismund-bell-…-in-krakow` | **w20 `MODE=toured`, STAGED AND UNAPPLIED.** New plate + **5 box** remap; NCC 0.9386 (lowest of the four) | as above | as above |
| `saint-anne` | MNW: our plate is **landscape**, the candidate **portrait**, the physical object **square**. Neither capture matches | A third capture, or a holder photograph | Nobody — but leave it alone until one exists |
| **46 `art_hires` rows with a `.tif` in `img`** | **All 46 declare a long side over 1,920 and none of them can deliver it.** Commons buckets TIFF renders (13 of the 46 actually reach 3,840, one gets only 1,280) — so `w`/`h` describe the master, not the delivery, and the viewer is overstated on every one. The footer's Ultra HQ link stays honest; the viewer does not | A mechanical dims-correction sweep against the measured bucket, per `C:/tmp/hires46/PLAN.json` groups C (7 correct-only) and D (4 opt-in) | Nobody for group C. Fuad for group D. ⚠ Also sharpens STUDY_SPEC's pixel-extent rule: for these rows the reader's real ceiling is 1,920 |
| ~~`carl-grabow-untitled`, `johan-christian-jansson-untitled`, `johan-christian-jansson-untitled-2`, `jan-both-tradstudie`~~ | ✅ **RULED adopt; four pyr ladders APPLIED 2026-08-25 (`0eb7787`).** Dims corrected down to the served 3,840 bucket + measured `pyr` ladders. Moved to §1b (NM group D pyr ladders) | `0eb7787` | 2026-08-25 |
| ~~six NM group B (`bruno-liljefors-autumn-landscape-with-partridges`, `landscape-from-bretagne`, `vilhelm-hammersh-i-interior`, `vilhelm-hammersh-i-interior-with-a-reading-lady`, `midsummer-dance`, `en-premiar`)~~ | ✅ **RULED adopt all six; APPLIED 2026-08-25 (`a7d6316`).** Bretagne 7-box + Midsummer 4-box remaps; en-premiar keeps its Commons TIFF as the flat download. Moved to §1b | `a7d6316` | 2026-08-25 |
| ~~five Guggenheim (`red-oval`, `nude-study-sad-young-man-on-a-train`, `peasant-woman-seated-in-the-grass`, `birsk`, `blue-mountain`)~~ | ✅ **RULED adopt; APPLIED 2026-08-25 (`0eb7787`).** blue-mountain 7-box remap; round-6 url was a 1168px derivative, master found at `uploads/1908/01/`. Moved to §1b | `0eb7787` | 2026-08-25 |
| `yellow-cow` | ⛔ **RULED-REFUSED 2026-08-25.** The candidate is the crop (our plate 0.44 % off the object, the candidate 3.11 %); ×1.69 pixels are not worth a worse frame. ⚠ `art_hires` `w`/`h` are still `[null, null]` — url decodes 2,390 × 1,767; fill the null dims regardless | Fill the null dims (no verdict needed); do not adopt the Guggenheim plate | Nobody — refusal stands |
| `black-lines` | ⛔ **RULED-REFUSED 2026-08-25.** Candidate is the crop (0.81 % vs 2.57 %); the ×1.60 gain does not justify a worse frame | — | Nobody — refusal stands |
| `composition-viii` | ⛔ **RULED-REFUSED 2026-08-25.** Pixel gain ×1.024 — essentially nil; fidelity-only argument does not justify remapping 8 boxes plus a re-tour | — | Nobody — refusal stands |
| `isson-works`, `pollock-tate`, `beksinski-works` | Three canon records carry **no `img` at all** | Source a plate, or confirm the record is intentional | Nobody |
| **11 works with holder `Q1191732`** | The qid is literally *"museum storage"*, not an institution, so a holder-gated sweep cannot run on them. Full list in HIRES_SOURCING round 5 | Resolve each to a real holder qid | Nobody |
| **15 MNW works, UNRESOLVED not absent** | 9 have no cyfrowe record under their P217; 3 carry **Royal Castle** (`ZKW …`) inventory numbers while P195 says MNW — a census/Wikidata conflict; 3 have no P217 at all | The 3 ZKW rows deserve their own look; the other 12 need a P217 | Nobody |

---

## Counts

| table | rows |
|---|---:|
| §1 FIXED (per work) | 26 |
| §1b Batch fixes | 28 batches |
| §2 NEEDS ANOTHER LOOK (per work) | 24 |

Of §2 (⚙ re-counted pass 2, 2026-08-25 after the day's applies): **4** staged w20 toured remaps ·
**3** Guggenheim RULED-refused · **9** singletons and classes · the balance singleton residues.
Closed this pass and moved to §1b: the **10** held w17 tours (`43a882e`), **6** NM group B
(`a7d6316`), **4** NM group D (`0eb7787`), **5** adopted Guggenheim (`0eb7787`), and the Tiepolo
(`d5941d3`/`09d07f2`).

Last updated **2026-08-25** (pass 2). Narrative and rulings: [`QC_LEDGER.md`](QC_LEDGER.md). Sourcing
anatomy and the trap list: [`HIRES_SOURCING.md`](HIRES_SOURCING.md).
