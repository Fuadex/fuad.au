> Part of the fuad.au docs — start at [/GUIDE.md](/GUIDE.md)

# Canvas content QC ledger

What has actually been quality-controlled, by whom, and what was found. Update this file
whenever a QC pass runs — coverage claims that aren't recorded here don't count.

## ⚙ Awaiting Fuad's verdict — the open list, written to be actioned COLD

**Written 2026-08-25 as a handoff.** Every item below is blocked on a ruling, not on work. Each
carries enough context to act on without the session that produced it. ⚙ Figures marked
**verified** were re-derived from the live stores while writing this section; figures marked
**reported** came from an agent or a session note and could NOT be re-derived here.
⛔ **The brief this section was written from carried EIGHT claims that the live data
contradicted** — the `beside` count, the Redon file count, which MNW rows were adopted, how
many refusals turned on physical dimensions, the framed-plate sub-count, whether Saint Roch had
shipped, the shape of the Nationalmuseum `img` defect, and what "byte-identical" covered on the
Redon rows. Every one is corrected below, in place. **Treat an unmarked number as suspect and
re-measure it.**

**Store state at the time of writing** (⚙ all five re-counted from the files, not reported):
`art_inspect` **378** tours · `art-about` **800** reads · `art_hires` **1,152** rows ·
`artworks` canon **1,977** works · **22** `beside` paragraphs.
⛔ **The session note said 19 besides; the store says 22.** Method:
`Object.values(CANVAS_INSPECT).filter(v => v.beside !== undefined).length`. `art-about` carries
**zero** — `beside` is a tour field only.

---

### 1. ⛔ THE w17 DEFECT LEDGER — the blocking one. Ten drafted tours, ZERO clean.

Ten tours were drafted, image-QC'd by an independent pass, and **held**. Not one came back
clean. ⚙ **Verified: all ten are in `.dtmp/tourqc-pass/w17-merge/merge_plan.json` (keys
`tours` / `reads` / `notes`), and NONE of the ten is in `art_inspect` — nothing has shipped.**
The plan also carries 10 matching reads; ⚙ four of those ten works **already have** an
`art-about` entry (`christian-rohlfs-white-beeches-in-fall`, `claude-monet-le-givre`,
`pierre-bonnard-sleeping-woman-on-a-bed`, `claude-monet-la-rue-montorgueil`), so those are
REPLACEMENTS, not additions, and Method lesson 11 (a `refs` link dies with the prose that
carried it) applies to all four.

| # | tour slug | stops |
|---|---|---:|
| 1 | `peter-paul-rubens-a-view-of-het-steen-in-the-early-morning` | 7 |
| 2 | `canaletto-venice-the-feast-day-of-saint-roch` | 8 |
| 3 | `canaletto-london-interior-of-the-rotunda-at-ranelagh` | 5 |
| 4 | `christian-rohlfs-white-beeches-in-fall` | 8 |
| 5 | `claude-monet-le-givre` | 7 |
| 6 | `pierre-bonnard-sleeping-woman-on-a-bed` | 8 |
| 7 | `unknown-hoa-hakananai-a` | 8 |
| 8 | `paul-signac-femme-a-l-ombrelle` | 8 |
| 9 | `claude-monet-la-rue-montorgueil` | 8 |
| 10 | `nicholas-chevalier-the-buffalo-ranges` | 8 |

⚙ An eleventh work — the **Tiepolo** — was drafted and then dropped by the merge itself.
`merge_plan.json`'s own `notes` array says: *"read skipped (tour not shipping):
`giovanni-battista-tiepolo-die-verehrung-der-trinitat-durch-d`"*. See item 2.

**These are NOT style flags.** The load-bearing ones, each stated so it can be re-checked:

- ⛔ **There is no kingfisher in the Rubens.** The bird is a **goldfinch** — crimson mask,
  black-and-white head, short conical bill. The teal shape read as a kingfisher breaks at 5×
  into **lanceolate blades, i.e. foliage**, and is about **three times the goldfinch's size**.
  ⚙ **Verified in the drafts: `kingfisher` occurs 3×, `goldfinch` 0×** — the defect is live in
  the held text, not already repaired. Crops are in the workshop as `Q1_goldfinch.png`,
  `Q1_teal.png`, `Q1_teal_tight.png`, `Q1_teal_hard.png`, `Q1_gf_tight.png`, `Q1_box_full.png`;
  the plate they were cut from is `rubens_big.jpg`, ⚙ **measured 21,256 × 12,628**.
- ⛔ **There is no rain shaft in the Chevalier.** What the draft reads as a shaft is **low
  cloud lying in the valleys**, with **blue sky in the same zone**.
- ⛔ **Chevalier was born in St Petersburg**, not Switzerland. ⚙ **Verified in the drafts:
  `Switzerland` occurs 1×, `Petersburg` 0×.** (The birthplace itself is a web fact and was
  **not** re-verified here — treat the correction as reported, the defect in the draft as
  verified.)
- ⛔ **Bonnard's dimensions.** ⚙ **Verified the draft reads *"At 93 by 108 centimetres it is a
  large canvas, wider than it is high."*** The correction on record is **96.4 × 105.2** —
  ⚠ **reported, not re-verified here** (no local source for it). Note the correction does not
  disturb the sentence's argument: 96.4 × 105.2 is still wider than high.
- ⛔ **Signac stop 2's colour claim is flatly REVERSED.**
- ⛔ **Three boxes refute their own text** — the wave-4 class (*"The fur collar in the dark"*
  over a box holding no collar), again.

**The cost of fixing: ~60 prose edits and ~20 box moves** (⚠ reported; not re-counted here)
**over text Fuad approved.** That is why it is a verdict and not a task.

⭐ **RECOMMENDATION ON RECORD: run a SECOND-OPINION pass before spending the sixty edits.**
The reason is a live disagreement inside this very batch. The **Monet *Le Givre* boat** was
called unresolvable by one auditor and **confirmed real by another** at the full scan:
**bow, a constant-width sunlit strake, and two thole pins**, with a bramble control 20 % to
the left showing only broken dabs. ⚙ **Verified: the scan is `w17-merge/monet_c2rmf.jpg`,
measured 12,162 × 7,384** — the "12,162 px" in the session note is real. Two auditors, one
plate, opposite verdicts: that is the wave-4 lesson (*an audit's findings need verifying*)
pointing at **this** audit, and the ten-of-ten result is exactly the kind of number that
deserves a check before it authorises rewriting approved prose.

**Workshop:** `.dtmp/tourqc-pass/w17-merge/` — `merge_plan.json` (the batch),
`cropspec.json` + `zoomjobs.json` (the crop jobs), `apply.js` / `precheck.js` / `checkplan.js`
(the applier and its guards), and ~600 PNG crops named by question (`Q1_*` Rubens bird,
`Q2_*` Monet boat, `Q3_*`, `C_*`, `z_*`).

---

### 2. ⚠ TIEPOLO — one row, two different paintings. Fuad is the only witness.

⚙ **Verified in the store:** `giovanni-battista-tiepolo-die-verehrung-der-trinitat-durch-d`
carries `seenAt: "national-gallery-london"`, `qid: "Q29477853"`, `seenConfidence: "sure"`,
`year: 1737`, and an `art_hires` row titled *"Die Verehrung der Trinität durch den hl. Papst
Clemens"* at 4,106 × 6,845. ⚙ **Verified: it has NO `art_inspect` tour and NO `art-about`
read.** The qid and the plate are the **Munich altarpiece** (488 × 256 cm, Alte Pinakothek);
the National Gallery London holds a **different, smaller** work, **NG6273**.

**Fuad does not remember which he stood in front of.** It settles from the **Google Timeline
export** (`Desktop/Timeline/Timeline_update_july.json`) if the visit date can be bracketed —
Munich and London are far enough apart that a single bracketed day decides it.

⛔ **The two outcomes cost very different amounts:**
- **`seenAt` was wrong (encounter was Munich)** → change one field. **Costs nothing.**
- **The identification was wrong (encounter was NG6273)** → the qid, the plate, the title and
  the drafted tour are all pointed at the wrong object. ⚙ **The w17 draft is about the
  altarpiece**, which is why the merge dropped it rather than shipping it — **repointing costs
  a tour.**

---

### 3. ⚠ SAINT ROCH — back-edit two verified things from w9a into the w9b version?

⛔ **Correct a wording that would send someone to the wrong file: the w9b Saint Roch is NOT
shipped.** ⚙ **Verified: no Saint Roch tour exists in `art_inspect` at all.** The w9b text is
the one sitting in the **held w17 batch** (item 1 above). So this is not a back-edit into
production — it is a decision to make **before** the w17 batch ships, and it should be taken
in the same pass.

Two things the earlier **w9a** draft has and the **w9b** text does not. ⚙ Both verified by
diffing `.dtmp/tourqc-pass/w9a/out_tour_canaletto-venice-the-feast-day-of-saint-roch.json`
against `merge_plan.json`'s copy:

1. **The church of San Rocco is named** as a distinct building. ⚙ w9a: *"At the right, the
   flank of the church of San Rocco: bare brick to the roofline, putlog holes still in it, one
   window bricked up."* **w9b names only the Scuola Grande di San Rocco** — the confraternity
   next door, not the church. The detail earns its place: **the church's facade was still
   unbuilt in 1735** (rebuilt by Scalfarotto from 1732, faced only 1765–71), which is *why*
   the flank is bare brick. ⚠ The Scalfarotto dates are **reported** — ⚙ verified only that
   **neither draft contains the name "Scalfarotto"**, so if the back-edit is approved the date
   claim needs its own verification before it goes in.
2. **The altana with washing** on the left roofline. ⚙ Verified present in w9a
   (`altana`, `washing`), **absent from w9b**.

Both are concrete, both are Law-1 material (a stop that starts at a mark), and w9b is
otherwise the better text — which is exactly why this is a merge question and not a revert.

---

### 4. ⚠ REDON CANON DEDUPE — two Wikidata items, ONE physical painting.

⚙ **Verified in the store.** `odilon-redon-untitled-4` (`qid: Q83507923`) and
`odilon-redon-untitled-10` (`qid: Q132195486`) are **two duplicate Wikidata items for one
object**: *Conque marine*, Redon, Collection Bemberg Toulouse, **inv. 2138**.

⚙ **Verified, and the session note's "byte-identical **including** the palette" needs one
correction to be usable:** the *canon* rows are identical **field for field except `id` and
`qid`** — necessarily, since the whole point is that the qids differ. What **is** byte-identical
is everything derived from the pixels: the two `art_hires` rows (same 4,139 × 6,582, same
Commons file `Bemberg_Fondation_Toulouse_-_Conque_marine_-_Odilon_Redon.jpg`) and ⚙ **the
extracted palette in `palette.js`, verified character-for-character on both ids:
`["#536869", "#31454c", "#72857d", "#79a5a3"]`.**
⭐ **The palette is the strongest single piece of evidence and it is worth knowing why:** it is
computed from the image, by us, with no reference to Wikidata. Two independent extractions
landing on four identical hex values is proof **the same pixels were processed twice** — it
cannot be explained by a shared qid, a shared title, or a copy-paste of metadata. The evidence
that the
duplication is **upstream in Wikidata**, not ours (recorded in `C:/tmp/hires46/PLAN.json`
→ `job1_redon`, which is where the full working lives):

- **Q83507923** carries P217 inventory **2138**, P2048/P2049 dimensions, an RMN archive ref,
  and P195 → Collection Bemberg. Created 2020-01-24 by QuickStatements.
- **Q132195486** has **no inventory number, no dimensions, no date, no RMN ref** — same P18
  file. Created **2025-02-11** by a later QuickStatements batch that minted an item from the
  Commons template without checking for an existing one.
- SPARQL (creator = Redon, collection = Bemberg) returns exactly these two plus two unrelated
  works.
- `match_decisions.json` shows both imported as `like` matches on the same venue, with
  reference images that are downloads of the **same** P18 file.
- The apparent aspect conflict is a Wikidata error, not ours: P2048/P2049 are **transposed**
  (23 h × 37 w recorded; the object is ~37 cm high × 23 cm wide). **Our plate's aspect is
  correct.**

**The fix**: keep `-4` / Q83507923, remove `-10`. ⚙ **Verified: nothing is lost** — neither
slug is toured, neither has a read, neither has a `seenAt`. ⛔ **But it REMOVES A WORK FROM
THE CANON, so it needs Fuad's explicit verdict.**

⚙ **Scope corrected: the session note said 7 files; the actual count is 9** (plus this
ledger). Re-derived by a repo-wide grep for the id: `art_data.js`, `artworks.js`,
`art_hires.js`, `art_holders.js`, `art_medium.js`, `art_imgsize.js`, `palette.js`,
**`palette_cache.json`** (the one the 7-file list missed), and `HIRES_GALLERY.md`.

⚠⛔ **RECORD THE WRONG FIX SO IT IS NOT RE-PROPOSED: REMOVING THE `img` WOULD HAVE BEEN
WRONG.** The instinct — strip the duplicate image and let the work fall back to its canon
plate — fails here, because **the canon plate is the same file**. It would have stripped
hi-res off a real work while leaving the visible duplicate in the deck untouched. This is a
general shape: **a fallback is only a fallback if it resolves to something different.**

---

### 5. ⚠ NATIONALMUSEUM GROUP B (6 rows) + GROUP D (4 rows, opt-in).

Plan: **`C:/tmp/hires46/PLAN.json`** (⚙ verified present; **outside the repo — it is on the
`C:/tmp` mount, not in `.dtmp`, and will not survive a machine wipe**). ⚠ It is **NOT
APPLIED** and its own header says why: another agent was writing `art_hires.js` during the
session (1,108 → 1,141 records). The binding guard is **per-record** — every record must still
byte-match its `before` snapshot or the applier aborts; the whole-file sha256 is advisory only.

⚙ Verified group shape and counts, straight out of the plan:

| group | rows | what it is |
|---|---:|---|
| `A_adopt` | **33** | safe: unframed, NM IIIF ≥ master on **both** axes |
| `B_needs_verdict` | **6** | real gains, but each changes something visible |
| `C_correct_only` | **7** | no route at or above master — declared dims corrected DOWN to measured truth |
| `D_pyr_optional` | **4** | **opt-in**, supersedes C for those ids |

**Group B — why each is held** (⚙ verbatim from the plan's own `hold` field):

- ⚠ **5 of the 6 are FRAMED plates** — *"swapping puts a picture frame in the viewer; visible
  content change"*: `bruno-liljefors-autumn-landscape-with-partridges`,
  `landscape-from-bretagne`, `midsummer-dance`, `vilhelm-hammersh-i-interior`,
  `vilhelm-hammersh-i-interior-with-a-reading-lady`. **Adopting changes what the reader sees.**
- The 6th, **`en-premiar`**, is a different question: the NM IIIF (2,619 × 3,534) beats
  delivery (1,920 × 2,589) but is **under the master** (3,064 × 4,132) — it trips the
  smaller-on-an-axis rule.

**Group D is opt-in**: the same downward dim correction as C **plus** a measured Commons
render ladder (`pyr`), upgrading 4 capped rows from a single flat fetch to **progressive
zoom** via the existing legacy-image-pyramid path. ⚙ Verified rows: `carl-grabow-untitled`,
`jan-both-tradstudie`, `johan-christian-jansson-untitled`,
`johan-christian-jansson-untitled-2` — each served 3,840 wide, each with a 2-level ladder,
every level JPEG-header-measured. 3 of the 7 capped rows already carry `pyr`; these 4 did not.

⛔ **A trap the plan records and the applier depends on: do NOT omit `tiles` for this host.**
`iiif` is passed to OSD as a URL, so OSD fetches the real `info.json` and takes its declared
`tiles: 256`. **A 1024 request would come back silently downscaled to 1000.** Same family as
the NG London 78.1 % regression.

---

### 6. ⛔ THE "TWO ALREADY-ADOPTED MNW ROWS" — THE DATA CONTRADICTS THIS. READ THIS ONE.

The session note said *"two MNW rows already adopted — `unknown-s-once-majowe` and
`ferdynand-ruszczyc-stary-dom` — gain framing but zero extra detail; revert on request."*
⚙ **Only half of that survives measurement, and the wrong half is the dangerous half.**

- ✅ **`ferdynand-ruszczyc-stary-dom` is adopted and IS the zero-extra-detail case.** ⚙
  Verified: `src: "mnw"`, 3,222 × 3,629, and its own `note` says it — *"Gain is framing only —
  on the shared area this file is the same linear resolution as the plate it replaces."*
  Holder's 83 × 93 cm puts the old plate 4.2 % off and this one 0.5 % off; registered at
  **NCC 0.9976** (identity 0.8736); **no tour boxes on this work.** Revertible at no cost.
- ⛔ **`unknown-s-once-majowe` is NOT adopted.** ⚙ Verified: it is still `src: "commons"`,
  3,124 × 3,973, with **no w20 note at all**. It is one of **four TOURED works in the w20
  `MODE=toured` half, which is STAGED AND UNAPPLIED** — see item 6b. ⚙ Verified: it **has** an
  `art_inspect` tour, with **8 boxes**. Reverting it is not the question; **applying** it is.
- ⚙ **And "framing only, zero extra detail" describes exactly ONE row corpus-wide.** Method:
  scan every `art_hires.note` for `same linear resolution` / `framing only` — **1 hit**,
  `ferdynand-ruszczyc-stary-dom`. Do not generalise the phrase to the other 16 w20 adoptions;
  most of them are genuine resolution gains (up to **×5.24** linear).

#### 6b. ⛔ THE OTHER HALF OF w20 IS STAGED, COUPLED, AND UNAPPLIED — and nothing else records it

⚙ **Verified from `.dtmp/tourqc-pass/w20/STAGED.local.md` + `PLAN.json` + the live store.**
w20 ran in two halves and **only one shipped**:

- ✅ **`MODE=tourless` — APPLIED.** 17 works (11 new rows + 6 upserts), `art_hires.js`
  **1,141 → 1,152**. ⚙ Verified: the store carries exactly **17** rows whose `note` begins
  `w20 `. None of the 17 has an `art_inspect` entry, so no box coordinate depends on them.
- ⛔ **`MODE=toured` — STAGED, NOT APPLIED, AND THE FOUR ARE COUPLED.** Each gets a new plate
  row in `art_hires.js` **and** its tour boxes remapped in `art_inspect.js` **in the same
  run**. ⛔ **Swapping the plate without the remap points every stop at the wrong place, and
  the applier refuses to do one without the other.**

| work | boxes | registration NCC | crop of the new plate our old plate occupied |
|---|---:|---:|---|
| `julian-fa-at-powrot-z-polowania-na-niedzwiedzia` | 9 | 0.956 | x −0.00486 y −0.03473 w 1.0111 h 1.13846 |
| `unknown-s-once-majowe` | 8 | 0.9953 | x 0.0427 y 0.02444 w 0.91758 h 0.94971 |
| `at-the-seashore` | 8 | 0.9990 | x 0.03132 y 0.01624 w 0.93546 h 0.96205 |
| `the-hanging-of-the-sigismund-bell-…-in-krakow` | 5 | 0.9386 | x −0.01229 y −0.02167 w 1.02986 h 1.04049 |

⚙ Verified: all four are in `art_inspect` **and all four still serve the old `commons` plate**
— the stage really is unapplied. All **30** remapped boxes were cropped out of the new plate
and **looked at** beside the old crop; every one still holds the subject its title names
(sheets `viz/<id>.boxes.png`, blow-ups `viz/<id>.box<n>.png`, registration proofs
`viz/<id>.reg.png`).

**Why it stopped:** `art_inspect.js` had a **live second writer**. The guard caught it
mid-pass — the file went `2c5b222f5f42a8c1` → `286e31a359725143` at 2026-08-25T10:56Z, three
records **added** (the w19a Boldini / Renoir / Henner), nothing modified. The four target
records were untouched, **so the remap still holds** — but the pass declined to write into a
store with a live writer. ⭐ **Keep that judgement: it is the right one, and it is the same
instinct as declining a box rather than guessing it.**

**To apply** (dry-run first — it prints round-trip proof and writes nothing):
`node -e "process.env.MODE='toured';process.env.DRY='1';require('.dtmp/tourqc-pass/w20/apply.js')"`
The guard is two-level: **hard, no override** — the 4 records must be byte-identical to
`guards.art_inspect_targets` and each of the 30 boxes must still carry its exact ×1.15-padded
value, or the transform is stale and the registration must be re-run, **not forced**;
**soft** — any other change prints a record-level diff and demands `ACK_DRIFT=<sha256 prefix>`,
so it cannot be applied without someone reading the diff. Then re-run `validate-refs.js` bare.

---

### 7. ⚠ THE TWO `READS_SPEC` QUESTIONS ARE STILL OPEN — confirmed, not assumed.

⚙ **Verified both are still live in `READS_SPEC.md` §1**, and neither has been ruled:

- **May the cascade draw on the tour's `beside`?** (§1, ~line 156.) STUDY_SPEC made `beside`
  a REQUIRED closing movement the same day, so it now sits at the top of every tour a cascade
  reads. Options on record: (a) strip `beside` from job files, (b) pass it as context but
  fence it, (c) let it in.
- **Does a distilled read INHERIT its tour's `refs`, or mint its own?** (§1, ~line 167.)
  Options: (a) refs on both tiers, (b) Interpretation only, (c) neither — refs stay a
  tour-and-museum-read feature.

⛔ **They are ENTANGLED and must be ruled together**, which is the reason they are repeated
here: **if `beside` is fenced out of the cascade, most of the refs a tour carries are fenced
out with it.** Until Fuad calls it, the safe default stands — mint refs only where a read's
own prose names a work, never write prose in order to hang a link on it (Method lesson 11).

⚠ Note for whoever rules on `beside`: **the field has tripled since the question was framed.**
⚙ **22 `beside` paragraphs in the store now, against the 7 `READS_SPEC` §11 records** — so
fencing `beside` out of the cascade is now a three-times-larger decision than when it was
asked. ⚙ **Coverage is fine: all 22 carry refs** (21 as a bare array, 1 keyed `beside`), so
STUDY_SPEC 12h is satisfied and there is **no backlog**.

⛔ **AND RECORD THE MISTAKE THAT ALMOST WENT INTO THIS LEDGER, because it is Method lesson 12
firing on the person writing it.** A first draft of this bullet asserted *"only 1 of 22 carries
a ref"* and booked a 21-row backlog. The count was wrong: it walked only the **keyed**
`refs: { beside: [...] }` form and never looked at the **bare** `refs: [...]` array, which is
the shape 21 of the 22 actually use. **`refs` has two shapes; a scan that walks one of them
under-reports by 95 % and reports a crisis.** It was caught only by re-deriving the number
before writing it down — which is the whole reason this section marks its figures ⚙.

---

## QC events

| Date | Scope | Method | QC'd by | Findings |
|---|---|---|---|---|
| 2026-08-14 | interp batches b+c (20 reads) vs their tours | full fidelity trace + fact sanity | 2× Opus agents + Fable (measured) | 0 fidelity breaks; 1 tour error (Grunwald "4.5 m wide" → 426×987 cm, FIXED) |
| 2026-08-14 | tours10 stack (9 works: tour+deep+about) | coherence + facts, 2 web calls | Opus agent, Fable reviewed | Diogenes tour "twenty-five in 1873" → 1877/age 28 (FIXED); Eugène-Manet hotel window CONFIRMED ok; bergère-couchée no Thyssen bleed |
| 2026-08-14 | random 20-tour sample (seed 20260814, list in .dtmp/interp10/tourqc_sample.json) | Fable read all 20 against own knowledge; 6 flags → 2× Opus web verifiers; 1 image check by Fable | **Fable (primary)** + Opus verify | 3 real defects, all FIXED: Pellerin-II commission story was backwards (he accepted the 2nd version); L'Absinthe first shown Brighton c.1876, not 1877; Irène provenance now names Béatrice (murdered at Auschwitz) as the looting victim. 2 flags cleared (Böcklin "daughter Angela" is a real tradition — he had both a wife and a daughter named Angela; Porte-fenêtre first shown 1966). 1 web-verifier false positive overturned: Storks fiddle/hat/sash/fur-cap all present in the plate |
| 2026-08-14 | interp batch d (10 new reads) | mechanical (length/openers/scaffold/punct) | Fable | 0 dup openers, 0 punct, 1 single "argument" use (corpus-normal); lengths 210–274w — superseded by the d2 redo below |
| 2026-08-14 | interp batch d2 (10 redrafts, ~140–170 target + trim law) | mechanical | Fable | lengths 157–190, ZERO over 200 (vs 210–274 under the looser brief); 1 scaffold opener (alba) + 1 existingInfo-sourced fact (samson AI-study) to settle at verdict |
| 2026-08-14 | random 30-tour sample #2 (seed 20260815, .dtmp/interp10/tourqc_sample2.json) | Fable read all 30; 4 flags → 1 Opus web verifier | **Fable (primary)** + Opus verify | 3 tour defects FIXED: El Greco tour said "National Gallery, London" for the canon-Frick version (qid Q5108849 confirms Frick; NB the wall reliefs exist in BOTH versions, so they don't discriminate); Sunflowers F456 called a "repetition" (it's the original Aug 1888 series); Farmhouse in Provence credited to Chester Dale (actually Ailsa Mellon Bruce, 1970). 1 canon fix: title → "Carnation, Lily, Lily, Rose" (no "and"). 26/30 tours fully clean |

| 2026-08-14 | random 30-tour sample #3 (seed 20260816, .dtmp/interp10/tourqc_sample3.json; batch-d tours now in pool) | Fable read all 30; ZERO fact flags → no web verification needed | **Fable (solo)** | **0 factual defects in 30 tours.** Non-fact findings: `by` badge field missing on 3 tours (j-m-w-turner-the-parting-of-hero-and-leander, arshile-gorky-diary-of-a-seducer, leech-convent-garden — do NOT guess a badge; ask Fuad/git history); leech final stop missing box coords; canon year filled for gustave-caillebotte-untitled (?→1880, from its own tour). Burn ≈ 2.2k tokens/tour (no verifier needed) |

| 2026-08-14 | FULL SWEEP of remaining 200 tours, 6 batches (dumps .dtmp/interp10/qcrest_b1..6.txt, list tourqc_rest.json) | Fable read all 200; 3 uncertain flags → 1 Opus web verifier (2 confirmed, 1 overturned); 1 bedrock-date fix by Fable directly | **Fable (primary)** + Opus verify | **COMPLETE. 3 tour-fact defects / 200 tours (1.5%), all in context paragraphs, all FIXED**: night-in-saint-cloud father's death "that January" → November 1889 (Munch Museum timeline; fixed in context + stop body); Rousseau Forest in Winter "finished only in 1867 when friends persuaded him to release it" → actually still UNFINISHED at his death despite friends' urging (Met object 438816); Whistler's Mother "Two years later Ruskin's attack" → six years (attack 1877, trial 1878). 1 false flag overturned: Van Rysselberghe Coastal Scene IS at the National Gallery London (NG6582) — tour vindicated, my Met-Lehman recall was wrong. Canon seenAt conflicts (for Fuad, NOT silently fixed): christ-in-the-house-of-his-parents seenAt=national-gallery-london but painting is TATE BRITAIN; ophelia same error class (Tate Britain); edward-hopper-house-by-the-railroad seenAt=met-nyc but painting is MoMA's first acquisition; Signac Bonne-Mère canon title has stray "马赛" chars. Legacy note: the-milkmaid tour is an initial-era stub (no stops, no by) — same set-aside class as the 3 by-less tours. Batch contents: b3 Vermeers/Klimt/Courbets/Gioconda etc, b4 Ophelia/Cézannes/Rubens/Goyas etc, b5 Rembrandts/Hokusai/Bruegel/Manets/Starry Night etc, b6 Rodin/Strindberg/Monets/Boccionis/Klees/Van Goghs/Copley etc — everything else clean |

| 2026-08-24 | 3 tours IMAGE-audited (heiss, wystawa-1828, parasol) after Fuad flagged misreads while reading | whole-image look + per-stop System.Drawing crops from hi-res, account-first (crops in .dtmp/tourqc/) | **Fable (primary)** | **2 visual-layer defect classes found — the first ever, because this was the first image-grounded QC.** (1) UNCERTAINTY LAUNDERING: Heiss background is a BIRD (spread golden wings, long tail); see + stop 2 call it "foliage or blooms… or pure paint" and claim Zorn wants the ambiguity; the hand's object (reads as a dark folded fan) hedged the same way. (2) EMBELLISHMENT DRIFT: Wystawa "both are back views" (both faces in profile), "folded almost double" (~30°), Samaritan woman "raises both hands" (one arm), sprawler's "arm hooked over chair back / legs thrown out" (legs crossed, arm in lap). Wystawa's stop CHOICES vindicated (tilted canvas IS unframed bare stretcher; battens hook+wire real; boy's red object real; out-of-canvas gaze real). Parasol clean on its known-good reputation, but its stop 2 has NO box coords — 4 coordinate-less stops corpus-wide (szal ×2, parasol #1, leech-convent-garden #4). **DEFECTS NOT YET FIXED — await Fuad's go.** Spec reshaped same day (STUDY_SPEC: three movements, whole-first QC, both error classes named). |
| 2026-08-24 | `beside` pilot pair applied (heiss, wystawa-1828) + renderer | Fable drafted, Fuad approved verbatim; fact-QC against the STORE + 1 web check before apply | **Fable** + Sonnet (render) | Two draft errors caught pre-apply: Bacon "full length" (she's seated — the work's own tour was the verifier) and "both hang in the same museum" (Szał → Sukiennice, Kraków, arrived 1901 via Jasieński). **NEW OPEN DEFECT found by the same check: podkowinski-szal-uniesien context opens "Kraków, 1894" and stages the crowds + slashing there — the one-painting show and the 24 Apr 1894 slashing were at the ZACHĘTA, WARSAW (dzieje.pl/portalwarszawski; the tour's own "thirty-six days" matches the Zachęta run). Also check "dead within a year, at twenty-nine" — b. 1866, d. 5 Jan 1895 = 28. Await go, fix with the Heiss/Wystawa batch.** |

| 2026-08-24 | **IMAGE-QC WAVE 1 — 20 tours** (risk-scored: loose handling + dense scenes; workshop .dtmp/tourqc-pass/w1/) | whole-first protocol per STUDY_SPEC: 5 Opus agents × 4 works, account written before opening the tour, then paragraphs diffed, then every stop judged on its own crop; Fable re-verified every load-bearing flag against the plates | **5× Opus + Fable (verify/apply)** | **10 clean · 7 minor · 3 defective.** Applied (commit ac97a3f): 20 text + 11 box fixes over 8 works. Box class (crop did not contain the described object): Balcony s6 boy past the edge, Sainte-Adresse s6 + Degas s6 both aimed at bare canvas, Boldini s5 hand, Degas s4 collar. Embellishment class: Wystawa ×3, Luncheon fingers-spread, Balcony parasol, Morisot earring colour, Boldini ocellus count. Fact class: Szał Kraków→Zachęta/Warsaw ×3, age 29→28 ×2. **1 agent flag OVERTURNED by Fable** (Szał "red eye" — real at hi-res; the agent had a 600px plate) → plate upgraded to 2505×3000, Fuad-approved. **HELD FOR VERDICT (redraft-class, thesis rests on the error): Heiss bird · Sainte-Adresse s4 couple faces each other, not seaward · Grenouillère s3 notices ARE painted words · Böcklin s2 bearded triton, not a bather.** Deepening proposals logged: Grenouillère pontoon dogs, Régates bank figure, Böcklin grotto nymphs legible. |

| 2026-08-25 | **IMAGE-QC WAVE 2 — 20 tours** (next risk tier after wave 1; workshop .dtmp/tourqc-pass/w2/) | whole-first protocol, 5× Opus × 4 works; Fable spot-verified two flagship claims against the crops before trusting the batch | **5× Opus + Fable** | **0 clean · 6 minor · 14 defective.** Verified personally: The Railway's book is OPEN (tour said closed, twice) and the child's hand is open/splayed not "two hands closed"; Juan de Pareja's collar is a scalloped LACE border, not the "ragged, cheap, worn" a thesis was built on. **THE DIAGNOSIS, named independently by 3 of 4 agents: craft-derived stops are the failure locus** — a stop written to DEMONSTRATE a paragraph's handling claim restates it and gets boxed afterwards, sometimes onto a region that REFUTES it (Trouville boxes the thickest impasto in the picture under "bare canvas showing through"). Control: `vincent-van-gogh-portrait-of-adeline-ravoux`, the only near-clean tour of 20, because every stop starts at a mark and argues outward. Third failure class named: THE INVENTED HINGE (Renoir's "joined hands" — the hand is on a shoulder, the child's hands in a muff; Rembrandt's "gaze lifted past the child" — the eyes are closed). → STUDY_SPEC's three drafting laws (8093c19). |
| 2026-08-25 | **WAVE 2 REPAIR — all 20 tours** (0e5f7a7 + 9caaf54) | Opus agents re-verifying against the crops rather than trusting the audit, repairing toward the three laws; applied via JSON-driven runner with round-trip proof | **5+2× Opus + Fable (QC/apply)** | **221 text edits + 80 box fixes.** Every batch proved: entry count unchanged, untouched entries byte-identical, no superseded phrasing surviving on any repaired work. Two agent judgements worth keeping: the Courbet lay-figure was DECLINED as unsupported at plate resolution despite being handed over as approved material, and two Velázquez retitles were SKIPPED because those stop titles occur on several works and a bare-title anchor could land on the wrong entry. Mechanical lessons now in the runner: retitle anchors must be the bare quoted title (the store mixes compact and pretty-printed JSON, so `"t": ` fragments miss on whitespace), and anchors must be checked AT THEIR POINT OF APPLICATION because specs contain sequential edits. |
| 2026-08-25 | wave-1 RE-AUDIT (18 works) | same protocol + a WORKED EXAMPLE of a defect-grade finding in every brief, to set the bar rather than let each agent discover it | 4× Opus | **IN PROGRESS** — the measurement that decides the corpus sweep. Also re-checks the three repaired works (Zorn bird, Böcklin triton, Podkowiński city) for whether the repair holds and left the tour internally consistent. |

| 2026-08-25 | **WAVE-1 RE-AUDIT — 18 tours** | same protocol + a WORKED EXAMPLE of a defect-grade finding in every brief | 4× Opus | **0 clean.** The first pass had called most of these clean, so its numbers are VOID — the gap was auditor calibration, not corpus quality. Named the mechanism: the wrong details are always PLAUSIBLE ones ("a pointing finger at a piano score, a raised hand in a conversation, a crucifix in a deathbed picture — the details the subject OUGHT to have"), so a coherence read passes them and only opening the crop catches them. New failure class: THE DISSOLUTION BIAS, directional — on loose-handling pictures the tours describe surfaces as MORE dissolved than they are and never less, 13 of 13 wrong finish claims erring the same way. Also found: boxes drift in a CONSISTENT direction, and a repair that fixes one sentence leaves its propagation (the Zorn bird was fixed while the same tour's garment, expression and signature box stayed wrong). |
| 2026-08-25 | **WAVE 3 — 20 tours, RANDOM sample** (seed 20260825), run as an A/B on the checklist: 10 on the old brief, 10 following STUDY_SPEC's checklist literally and reporting on the instrument | 4× Opus | **1 clean · 4 minor · 15 defective — the base rate is ~1 clean in 20.** Checklist half found MORE (0/1/9 vs 1/3/6). First clean tour of the programme: Caillebotte's *Chrysanthemums*, verified stop by stop. Dominant class shifted to ORIENTATION — "the *thing* is real and the object named is plausible; what fails is where it is or which way it faces" (Caravaggio's light direction reversed, Van Gogh's sky where hills are, Matisse's neck where a collar is). Both checklist agents independently proposed the same fixes → the calibrated checklist (8093c19 → 105496a). Also caught a research note shipped as reader-facing prose (Matisse `context`), fixed 87de812; a corpus grep found it isolated. |
| 2026-08-25 | **CORPUS-WIDE MECHANICAL TRIAGE — all 363 tours** (.dtmp/tourqc-pass/triage.js, scope2.js) | scripted: every checklist step needing no image | Fable | 164 box problems in 104 tours · **354 verbatim-restating hits in 225 tours** (5-word runs shared between a paragraph and a stop) · 32 self-contradictions · 138 relation claims · **0 research-note leaks**. TWO SELF-CORRECTIONS, both the class this triage exists to catch: the first draft flagged **131 tours for OBEYING the spec** (a wide opener with everything nesting inside it is the prescribed arc order), and the 34% vocabulary threshold was a guess measured at only ~40-50% precision — replaced by phrase-matching, which is near-zero false positive. |
| 2026-08-25 | wave-2 REPAIR (20 tours) + Law-2 batch (26 trims/15 tours) + box batch (12 fixes/7 tours) | Opus agents drafting, Fable QC + apply via a JSON runner with round-trip proof | Opus + Fable | 221+26 text edits, 80+12 box fixes, all proved: entry count unchanged, untouched entries byte-identical, no superseded phrasing surviving. **Two rulings came out of the repairs**: `see` NAMES, stops DESCRIBE (the restating sits in `see` more often than `craft` — 15 of 26 edits); and nesting is only a defect when the container is MID-TOUR *and* the contained subject is one the container's body never claims. Agents declined work rather than guessing twice (a bare-connective false positive; Dalí's needle flagged NEEDS IMAGE) — a wrong box is worse than a flagged one. |
| 2026-08-25 | **WAVE 4 — audit + repair**, plus the mandatory whole-entry re-audit (STUDY_SPEC checklist 13 / run order 26) | Opus agents auditing from crops, then **re-verifying their own findings before apply**; Fable QC + JSON-runner apply with round-trip proof | Opus + Fable | **82 text + 27 box + 1 title fix applied across 12 works.** ⭐ **The wave REJECTED 9 of its OWN findings on verification** — i.e. roughly one in ten of what an audit proposes does not survive being checked a second time against the crop, which is the strongest argument yet for the standing rule that a repair agent re-verifies rather than trusting the audit handed to it. ⛔ **AND THE MANDATORY WHOLE-ENTRY RE-AUDIT FOUND 5 BOX ERRORS THE AUDIT HAD MISSED**, including a stop titled **"The fur collar in the dark" whose box held no collar**. The re-audit is not a formality on top of a repair — on this wave it was a **better detector than the audit that triggered it**. |
| 2026-08-25 | **PLATE PASS ROUND 6 — Guggenheim ×20 + MNW Warsaw ×48, plus the NG London viewer fix** (sheets `.dtmp/tourqc-pass/w17/`) | every candidate re-fetched in full and re-decoded after the sheets were built (0 failures); anti-downgrade gate re-run against `art_hires` as well as `art_imgsize`; CORS headers measured per-asset with an explicit `Origin`; viewer fix verified by fetching real tiles, not by reading the patch | Opus sourcing agents + Fable (QC/apply) | **68 plates adopted, +804 MP; `art_hires.js` 1,108 → 1,141** (33 new rows, 37 rewritten in place). ⛔ **The gate fired INSIDE an adopt list**: `stanczyk` scored ×1.85 only because it was compared with `art_imgsize` instead of the `art_hires` row we actually serve, against which it is smaller on **both** axes. ⛔ **A live downgrade found inside an already-shipped adoption**: `ng-london`'s `img` was a `/full/!3000,3000/` url returning 800 px — written by us — which `enrich()` feeds to `imgZoom`, so *Madonna of the Pinks*' Zoom overlay had been running at 643 × 800 against Commons' 870 × 1,080. ⚠ **35 works held, not rejected**: they fail the 2 % aspect gate, but against the holders' physical dimensions **our plate is the crop on 27 of them** — held because a re-framed plate moves every tour box. Viewer: `tiles: 256` shipped for clamped IIIF servers, restoring the NG masters from **78.1 % linear detail to 1:1**. |

| 2026-08-25 | **w19a MERGE — 3 new tours + 3 reads** (Boldini *After the Bath*, Renoir *Alphonsine Fournaise*, Henner *Églogue*; workshop `.dtmp/tourqc-pass/w19a/`) | insertion-only merge under sha256 guards on both stores (another agent was writing the same tree); full round-trip proof; `validate-refs.js` bare | Opus (merge/QC) | **Shipped: `art_inspect` 375 → 378, `art-about` 798 → 800.** Boxes asserted **byte-identical to the drafts** — the w19a boxes already carry the ×1.15 breathing room and were not re-padded. Rulings applied: Boldini **keeps `year: 1889`** (canon is qid-trusted; Wikidata's 1873 traces to a flickr credit, not the NGA — `context` states the conflict openly and the `beside` interval stays 22 years); Renoir **ships the dress as measured** (two median-cut samples, mean RGB 155/153/144, **no blue component**; hat band brick/terracotta not vermilion — the literature says blue-grey, the plate a reader sees does not, and **the tour describes the plate**). ⚠ **One cross-reference lost and NOT re-minted:** the replaced 56-word Renoir Info carried `refs` → *Luncheon of the Boating Party*; the Luncheon entry's own prose **does not name Alphonsine**, so there is no honest anchor on that side and none was invented. See the Method-lessons note. ⛔ **The word-count trap ran in reverse here** — a naive whitespace recount marked all three reads over band; the drafter was right and the recount was wrong, because a spaced hyphen-as-dash counts as a word. Use `check.js`'s `[A-Za-z0-9][A-Za-z0-9'’-]*`. |

## The 2026-08-25 session — 5 audit waves, and what they cost to learn

**Headline: ~1 tour in 20 comes back clean.** Five image-QC waves ran in one session (waves 1–4
plus the wave-1 re-audit), and the base rate held wherever it was measured on a random sample.
The per-wave rows are in the table above; three findings belong to the session as a whole.

**1. An audit's own findings need verifying.** Wave 4 applied **82 text + 27 box + 1 title fix
across 12 works** and **rejected 9 of its own findings** when the repair agent went back to the
crops rather than trusting the audit sheet. Budget for that rejection rate; an audit sheet is a
list of candidates, not a list of defects.

**2. The whole-entry re-audit out-performs the audit that triggered it.** It found **5 box errors
the audit missed**, one of them a stop titled *"The fur collar in the dark"* over a box holding
**no collar** — a title-versus-crop defect of exactly the class checklist step 7b exists to catch,
which the audit had walked past. Checklist 13 is load-bearing, not ceremonial.

**3. ⛔ THE PHRASE SCANNER NOW UNDERSTATES THE LAW-2 QUEUE, AND THE CAUSE IS OUR OWN REPAIRS.**
The corpus-wide triage detects Law-2 pre-spend by **exact 5-word runs shared between a lens and a
stop** (354 hits / 225 tours when it was built). **Factual repairs reworded the duplicated
sentences enough to break the n-grams while leaving the pre-spend itself intact** — the lens still
spends the stop's instance, it just no longer spends it in the same words. So the queue is
**larger than the scanner now reports**, and the gap grows with every repair wave.

> **Repairing the corpus degrades its own detector.** This is a general property of any
> exact-match instrument pointed at a corpus that is being edited, and it is the reason a falling
> hit count is **not** evidence of a shrinking problem. Do not read a drop in this scanner's
> output as progress; re-derive the detector (semantic or instance-level, not n-gram) or
> re-baseline it after each repair wave. Same family as the wave-1 "10 clean" that turned out to
> be auditor calibration: **the measurement moved, the corpus did not.**

## Resolved NON-defects — ruled by Fuad, do not re-open

Things an audit flagged, escalated, and was wrong about. **They are recorded here at length
because the cost of re-opening one is that somebody "fixes" correct data into being wrong.**

### ⭐ `seenAt: "artizon"` IS CORRECT. 60 rows. RULED BY FUAD 2026-08-25. CLOSED.

**The flag.** A sweep noticed that a run of canon rows carry `seenAt: artizon` while the work
itself belongs to another museum, and booked it as a data defect of the same class as the
Tate/MoMA mismatches below. The rows that triggered the suspicion, all Monets, all pointing
somewhere other than the Artizon:

| id | the work points at |
|---|---|
| `claude-monet-la-rue-montorgueil` | Orsay |
| `claude-monet-camille-sur-son-lit-de-mort` | Orsay |
| `claude-monet-gare-saint-lazare-monet-series` | Orsay |
| `claude-monet-the-luncheon` | Städel, Frankfurt |
| `claude-monet-le-givre` | Orsay |

**The ruling.** Fuad, 2026-08-25: *"many of the works at The Artizon were toured there and
borrowed from other museums."* **The rows are right.** He saw those works **on loan at the
Artizon**, and `seenAt` records **where the encounter happened**, not who owns the object. A
loan exhibition is precisely the case where the two must disagree.

⭐ **AND THE ANSWER WAS ALREADY IN THIS FILE.** The `lk1` row (2026-08-23, near the foot of this
ledger) records: *"Le Givre seenAt=loan resolution (Artizon **'Monet: A question of landscape'**
2026, **Orsay collab**)"*. **A named loan exhibition, at the Artizon, of Orsay Monets, already
logged as a resolution — and the later sweep re-flagged four of its siblings as defects anyway.**
Nobody read the ledger against the rows it governs. That is the same failure shape as the
sculpture ban in `STUDY_SPEC.md`, which "survived only because nobody read it against the data it
governs", and it is now the second time it has cost a wave. ⛔ **Before escalating a class of
rows, grep this file for the venue, the artist and one of the ids.** The resolution is often
already written down; escalating past it is more expensive than the original flag, because it
arrives carrying the authority of a systematic sweep.

**⛔ THE GENERAL LESSON, and it is the reason this entry is written out rather than struck in a
line: A VENUE THAT DISAGREES WITH THE HOLDER IS A LOAN, NOT AN ERROR — CHECK THE ENCOUNTER
BEFORE CORRECTING THE RECORD.** `seenAt` is Fuad's testimony about his own life. It is not
derivable from Wikidata, it cannot be validated against the holder, and **a mismatch is evidence
of a loan long before it is evidence of a typo.** An audit can flag the disagreement; only Fuad
can resolve it, because he is the only witness. **60 correct rows were one pass away from being
rewritten into 60 wrong ones**, and the sweep that would have done it looked rigorous the whole
way — it had a rule, it applied the rule consistently, and the rule was about the wrong thing.

⭐ **AND IT HAPPENED TWICE IN ONE DAY.** The Artizon re-flag and the sculpture ban are the same
shape — *a rule that survived because nobody read it against the data it governs* — and both
fired on 2026-08-25. Two in one session is no longer an anecdote; it is the failure mode of a
project whose institutional memory is a long file that agents do not read before acting.
⛔ **STANDING INSTRUCTION, and it is cheap: before escalating a CLASS of rows, grep this
ledger for the venue, the artist, and one of the ids.** An escalation that walks past a written
resolution is more expensive than the original flag, because it arrives wearing the authority
of a systematic sweep.

⭐ **FUAD'S CONVENTION, recorded because it turns this from a data problem into a writing rule:
NAME WHERE HE MET IT AND WHERE IT LIVES.** A loan is **a fact to state on both sides**, not a
discrepancy to reconcile away. *"Seen at the Artizon, on loan from the Orsay"* is richer than
either half alone and is the honest sentence in every case — it is also, not incidentally, the
sentence that makes the `seenAt`/holder disagreement **legible to the next audit** instead of
looking like a typo. Prose that names both sides immunises the row.

⚠ **What this ruling does NOT cover.** It settles the Artizon rows and it names the method for
all of them. It does **not** clear the individual non-Artizon mismatches still open below
(`christ-in-the-house-of-his-parents`, `ophelia`, `house-by-the-railroad`,
`nicholas-chevalier-the-buffalo-ranges`, the Tiepolo) — those await the same kind of ruling,
one at a time, from the same single witness. **The lesson is that they must be asked about, not
that they are all loans.**

## Canon data defects — OPEN, for Fuad (do not fix unilaterally)

Found 2026-08-25. None applied — these are canon/attribution calls, and two of them need a ruling
rather than an edit. ⚙ Where a claim below was checkable against the live store it is marked
**verified**; the rest are recorded as reported.

- **⛔ HELD — THE w19b BATCH DOES NOT EXIST ON DISK, AND ITS RULINGS ARE PARKED HERE SO THEY ARE
  NOT LOST.** Rulings were issued 2026-08-25 for a batch of three works — Monet *Essai de figure
  en plein air*, Prouvé *Séjour de paix et de joie : méditation*, Puech *L'Aurore* — but
  `.dtmp/tourqc-pass/w19b/` holds an entirely different wave (the w12r Law-2 repairs + the Hodler
  *Mount Niesen* stop-7 rewrite + the *Woman with a Parrot* handedness fix; see its own
  `COMMIT_MSG.txt`). ⚙ **Verified: all three works are in canon** — `claude-monet-essai-de-figure-en-plein-air`
  (seenAt `artizon`), `victor-prouve-sejour-de-paix-et-de-joie-meditation` (`petit-palais`),
  `denys-puech-l-aurore-by-denys-puech` (`orsay`) — **and none of the three has an `art_inspect`
  entry.** A full-text sweep of `.dtmp` found no tour draft, no read draft and no plan file for
  any of them. The three rulings, held verbatim for whenever the batch is actually drafted:
  - **Puech `L'Aurore` — material conflict UNRESOLVED, and it is not a sentence fix.** Wikidata
    says **bronze**; the plate shows **translucent white stone taking a mirror polish, with
    bedding veins running out of the figure and into the base**. Image-beats-web was applied and
    the drafter wrote **marble**. ⛔ **Ship as marble but carry the conflict in the entry's
    `flags` — if it is bronze, the photographed object is a DIFFERENT VERSION and the tour needs
    redrafting, not editing.** Same family as `degas-grande-arabesque-third-time` below: every
    cast is a different photographed object.
  - **Monet `Essai de figure en plein air` — restore the encounter close.** The w19b drafter
    deliberately never named where Fuad met the picture, because it distrusted `seenAt: artizon`.
    **That caution is now unnecessary** (see the Artizon ruling above), so where `context` would
    naturally close on the encounter, as the corpus convention does, **restore it** — and do not
    force it where it does not fit.
  - **The spec additions the batch earned are ALREADY APPLIED** to `STUDY_SPEC.md` (bronze-vs-carving
    split, the photograph rule extended to dust/cobweb/glass/DoF, pixel-extent **and** focal
    plane, the physical/illumination test). ⚠ **They cite the Puech reading as their evidence and
    that reading was not re-verified here, because there is no draft to verify it against** —
    they are recorded as ruled, not as measured.
    ⚙ **AND THEY ARE NOW MARKED AS SUCH AT EACH OF THE FOUR SITES IN `STUDY_SPEC.md`**
    (2026-08-25), because a drafter reads the spec, not this ledger: the **pixel-extent +
    focal-plane** second term, the **bronze/carving split** table, the **photograph rule
    extension** to dust/cobweb/glass/depth-of-field, and the **physical/illumination test**.
    ⚠ Each is still worth keeping — the reasoning stands on its own — but **none of them may
    be cited as a measured result**, and the cobweb worked example in particular describes a
    plate nobody can now re-open. See Method lesson 14.

- **`giovanni-boldini-bust-of-francesco-i-d-este` — three separate defects in one row.** The work
  is a genuine Boldini **after Bernini** (so it is correctly in canon, and the "wrong artist"
  reading is not the defect). What is wrong: (a) the `img` / `imgGrid` / `imgZoom` NGA uuid ends
  **`…bd73f` and 404s**; the correct uuid ends **`…bd730`**. (b) The `art_hires` dims were stale at
  9052 × 13496; correct is **10652 × 14204**. (c) The `year` is wrong.
  ⚙ **Verified in the live store: `art_hires` already carries the `…bd730` uuid AND 10652 × 14204**,
  so (b) and the hires half of (a) appear to be fixed already — **the 404 is in `art_data.js`'s
  own `img`/`imgGrid`/`imgZoom`, which is where it still needs checking.** The canon row reads
  `year: 1885`; the correct year is not settled here.
- **⚠ NEEDS FUAD'S RULING — Tiepolo `giovanni-battista-tiepolo-die-verehrung-der-trinitat-durch-d`
  is two different paintings in one row.** The row says `seenAt: national-gallery-london`, but its
  **qid and its plate are the Munich altarpiece** — 488 × 256 cm, **Alte Pinakothek**. The National
  Gallery London holds a **different, smaller** work (**NG6273**). ⚙ Verified: the row carries
  `seenAt: national-gallery-london`, `qid: Q29477853`, `seenConfidence: sure`, and an `art_hires`
  plate titled *"Die Verehrung der Trinität durch den hl. Papst Clemens"*. **This is not a typo
  fix** — either the encounter was with NG6273 (in which case the qid, plate, title and any tour
  are all wrong) or the encounter was in Munich (in which case only `seenAt` is wrong). Fuad is the
  only source for which.
- **⚠ NEEDS FUAD'S RULING — `degas-grande-arabesque-third-time` describes the wrong object.** The
  canon note and the Info both say *"a bronze cast"*. The plate is **NGA 1999.80.10, the original
  pigmented-BEESWAX wax** — not a bronze. And **Fuad's encounter was with the Met's bronze**, which
  the row records (`seenAt: met-nyc`, `seenConfidence: sure`). ⚙ Verified: the row is `met-nyc`
  while `art_hires` is `src: "nga"`. So the text describes the wax, the encounter was the bronze,
  and the plate is the wax — **every cast is a different photographed object** (the standing rule
  in HIRES_SOURCING's identity discipline), so this is a real split, not a wording nit.
- **`seenAt` conflicts, two more.** ⚙ Both verified in the store.
  - ~~`claude-monet-la-rue-montorgueil` reads **`seenAt: artizon`** where the work points at
    Orsay~~ ⛔ **NOT A DEFECT — RULED 2026-08-25, CLOSED. It was seen on loan at the Artizon,
    along with 59 other rows. See "Resolved NON-defects" above and DO NOT RE-OPEN IT.** The
    closing note on this bullet — *"not silently fixed, because a loan is a legitimate reason
    for the mismatch and only Fuad knows"* — was exactly right, and it is the only reason the
    row survived to be ruled on.
  - `nicholas-chevalier-the-buffalo-ranges` reads **`seenAt: aus-performing-arts`** where the
    work points at the NGV. **STILL OPEN.** Same class as the
    `christ-in-the-house-of-his-parents` / `ophelia` / `house-by-the-railroad` conflicts already
    logged in the 2026-08-14 full-sweep row — **not silently fixed**, because a loan is a
    legitimate reason for the mismatch and only Fuad knows. The Artizon ruling raises the prior
    that these are loans too; it does not settle any of them.
- **Duplicate and missing images.** ⚙ Re-measured against the store, and **one half of this
  reproduces and one half does not**:
  - **Duplicate `img` — 1 pair, not 2. VERIFIED:** `odilon-redon-untitled-4` and
    `odilon-redon-untitled-10` share the identical *Conque marine* file.
  - ~~two Degas both "Dancer"~~ ⚙ **does NOT reproduce as an image duplicate.**
    `edgar-degas-two-dancers` and `edgar-degas-two-dancers-2` share a **TITLE**, not an `img`;
    a whole-store scan returns exactly one duplicate-`img` group. Recorded corrected rather than
    deleted — **a title collision and an image collision are different defects with different
    fixes**, and the standing "stop titles are NOT unique corpus-wide" lesson says the title one
    is the more dangerous of the two for any script that anchors by name.
  - **3 records carry no `img` at all. VERIFIED:** `isson-works`, `pollock-tate`,
    `beksinski-works`.
- **11 canon works name their holder as qid `Q1191732` — literally "museum storage".** ⚙ Verified,
  full id list in HIRES_SOURCING.md round 5. A holder-gated sweep cannot run on these because
  there is no holder to gate on.
- **⛔ 46 `art_hires` rows overstate the plate the viewer actually gets.** Commons will not render
  a TIFF above 1920 px, so every row whose `img` is a `.tif` serves 1920 whatever it declares —
  `anders-zorn-mrs-veronica-heiss` (declares 3478 × 4649, serves **1920 × 2566**),
  `midsummer-dance` (2603 × 3547 → **1920 × 2616**), `the-kitchen-maid` (2823 × 3494 →
  **1920 × 2376**). ⚙ **Swept: 46 rows have a `.tif` in `img` and ALL 46 declare a long side over
  1920.** Full write-up in HIRES_SOURCING.md round 5; the drafting consequence is in STUDY_SPEC
  checklist 7e. **This is a store-accuracy defect, not a sourcing one** — the TIFF really is that
  big, we just never serve it.
- **⛔ A live regression on already-toured works: National Gallery London serves 800 px.** Both
  `ng-london` works are toured and their Study zoom runs at ~78% of available detail because the
  inline descriptor omits `tiles`. Fix is `tiles: 256`. HIRES_SOURCING.md round 5.

## Coverage

- **Tours**: **309 of 309 QC'd — full coverage** (b+c 20, tours10 9, random samples
  20 + 30 + 30, full sweep 200). Total defect rate: **11 factual defects / 309 tours
  (~3.6%)** — every single one in the CONTEXT/history paragraph (dates, provenance,
  commission stories, venue prose). The early random samples ran ~7%; the final 200-tour
  sweep ran 1.5%. ~~Zero defects found in the visual layers~~ **(claim retired
  2026-08-24: that QC was text-only and structurally could not see visual misreads —
  the first image-grounded audit found two visual defect classes in 3 tours; see the
  2026-08-24 row and STUDY_SPEC's whole-first QC step. ~~**Visual-layer coverage is 58/363**~~ —
  the 3-tour audit, wave 1 (20, re-audited), wave 2 (20) and wave 3 (20, random) ⚙ **plus wave 4
  (12 works repaired) — five waves in all as at 2026-08-25. The denominator is also stale: the
  store is at 375 tours, not 363.** Re-derive both before quoting; the waves overlap (wave 1 was
  re-audited, not re-counted) so the numerator is not a sum. ✅ **THE RATE
  IS NOW KNOWN: ~1 CLEAN IN 20**, established on a random sample and matching the risk-ranked
  waves — the ranking barely mattered, so the defect rate is roughly uniform. **Wave 1's
  original "10 clean" is VOID** (auditor calibration; the re-audit returned 0 clean of 18).
  Quote the random-sample figure, not the wave-1 one.)** The knowledge-QC findings stand
  (incl. the Storks false-positive, the El Greco reliefs, and the Van Rysselberghe
  venue where the tour beat the QC's own recall).
- **Interpretations**: the 30 pending (b+c+d) fully fidelity-traced; the 110 shipped are
  NOT yet systematically QC'd.
- **Infos**: 623 shipped; bulk-campaign hooks were web-verified at write time; no
  independent re-audit yet.

## Method lessons (binding)

1. **Never falsify an image-drafted visual detail with text sources.** Tours are drafted
   from the plate; brief web descriptions omit details. A web-only verifier called the
   Storks fiddle an invention; the plate shows it plainly. Visual claims are checked
   against the image (Wikidata P18 → Special:FilePath), period.
2. **Context paragraphs are the risk layer.** Prioritise history/provenance claims when
   sampling; visual layers can be spot-checked more lightly.
3. **Sonnet cannot count its own words** — QC measures, always.
4. **Web verification is bounded**: ~2 calls per flagged claim, flags stay flags if unresolved.
5. ⛔ **AN EXACT-MATCH DETECTOR DECAYS AS THE CORPUS IS REPAIRED** (2026-08-25). The Law-2
   phrase scanner keys on 5-word runs shared between a lens and a stop; factual repairs reworded
   those sentences enough to break the n-grams **while leaving the pre-spend intact**, so the
   scanner now **understates** its own queue and will understate it more after every wave.
   **A falling hit count is not evidence of a shrinking problem.** Re-baseline or re-derive any
   pattern-matching instrument after a repair wave, and never quote its trend as progress.
6. **Verify an audit's findings before applying them** (2026-08-25, wave 4). Re-checking against
   the crops **rejected 9 of the wave's own findings**. An audit sheet is a candidate list.
7. ⛔ **A QUALITY GATE MUST RUN AGAINST WHAT WE SERVE, NOT AGAINST THE CONVENIENT FIELD**
   (2026-08-25, plate round 6). The anti-downgrade gate compared candidates with `art_imgsize`
   (the Commons plate) while the app serves `art_hires`. On that arithmetic `stanczyk` scored
   **×1.85 and sat in an ADOPT list**; against the row actually served it is smaller on **both**
   axes. **Compare against `max(art_imgsize, art_hires)` per axis** — per-axis, because an
   area-or-long-edge test waves through a candidate that is wider and shorter, which is a
   downgrade on whichever axis the reader is zoomed into. Generalises past images: **a gate
   pointed at a field that is not the one in production measures nothing**, and it fails silently,
   because everything it passes still looks measured.
8. ⛔ **AN ADOPTION CAN REGRESS A WORK EVEN WHEN THE SOURCE IS GENUINELY LARGER** (2026-08-25,
   `ng-london`) — **if the url we CONSTRUCT is not the url we MEASURED.** The NG master is real
   and reachable; the `img` we wrote from it, `/full/!3000,3000/`, returned an 800 px file under a
   3000 px name, and because `enrich()` feeds `hires.img` to `imgZoom` it downgraded *Madonna of
   the Pinks*' zoom overlay from Commons **870 × 1,080** to **643 × 800** — inside a change scored
   as a gain, by us, for two days. Two rules: **re-decode the final string after it is written
   into the record**, and **audit the fields an adoption REPLACES, not only the ones it adds** (the
   gate watched `w`/`h`; the damage was to `img`). Same family as lesson 5 — the instrument was
   pointed slightly beside the thing it was believed to be measuring.
9. ⚠ **A GATE THAT PROTECTS COORDINATE STABILITY IS NOT A FIDELITY GATE** (2026-08-25). 35 plate
   candidates failed the 2 % aspect gate; checked against the holders' recorded physical
   dimensions, **the candidate is the truer framing on 27 of them and our plate is the crop**
   (`werki-pod-wilnem`: object 82 × 68.5 cm, our plate off **11.4 %**, the candidate off 0.3 %).
   They are still correctly HELD — **tour box coordinates are fractions of the displayed plate**,
   so a re-framing moves every box in that work's tour and the true unit of work is re-plate **+**
   box re-anchor **+**, for a toured work, a re-tour question for the owner. But record what the
   gate is doing: it cannot tell *our plate is wrong* from *the candidate is wrong*. **Read every
   aspect failure against a third, independent number — the physical object — before filing it as
   a reject**, or corrections get logged as bad candidates.
10. ⛔ **A RECORD ONLY FUAD CAN WITNESS IS NOT AUDITABLE AGAINST A SOURCE** (2026-08-25, the
   Artizon ruling — full entry under "Resolved NON-defects"). `seenAt`, `seenConfidence` and the
   canon `note` are testimony, not data. **A venue that disagrees with the holder is a loan, not
   an error**, and 60 correct rows came within one pass of being rewritten into 60 wrong ones by
   a sweep that was internally consistent the whole way. Flag the disagreement, **ask**, and do
   not carry a "fix" for it into a batch. Corollary, because this one had a receipt: **grep this
   ledger before escalating a class** — the resolution was already recorded, under the same
   venue name, two days earlier.
11. ⚠ **A `refs` LINK DIES WITH THE PROSE THAT CARRIED IT, AND IT CANNOT ALWAYS BE RE-MINTED**
   (2026-08-25, w19a). `refs` names the exact words to link, so replacing a paragraph deletes
   every cross-reference anchored in it. Replacing the Renoir *Alphonsine Fournaise* Info dropped
   its link to *Luncheon of the Boating Party*. The obvious repair — re-mint from the other side,
   where the relation arguably belongs better — **failed on the anchor**: the Luncheon entry's
   prose names Bérard, Aline Charigot, Caillebotte and Ephrussi, and the *Maison Fournaise*
   terrace, but **it never names Alphonsine**, so there is no honest span to link. ⛔ **Do not
   write a sentence in order to hang a link on it.** That inverts the relationship the store is
   for: prose earns the ref, the ref never commissions the prose. Record the loss and let the
   owner decide. *(Live near-miss, for Fuad only: `Maison Fournaise` does occur in the Luncheon
   prose and would resolve as an anchor — but it points at the restaurant, not at the woman, so
   it is a different claim and was not applied.)*
12. ⚠ **WORD-COUNT DISPUTES RUN BOTH WAYS** (2026-08-25, w19a). The standing lesson is that
   agents overstate their own counts. Here the reverse fired: a naive `split(/\s+/)` recount put
   all three reads over band and the **drafter was right**, because a spaced hyphen-as-dash is
   not a word. **A recount that disagrees with a drafter is a candidate, not a verdict** — settle
   it by naming the tokeniser. The house one is `check.js`'s `[A-Za-z0-9][A-Za-z0-9'’-]*`.
   ⚙ **Generalised 2026-08-25:** the lesson is not "drafters are right", it is that **a
   measurement asserted against a drafter is itself a measurement and can be the broken one.**
   Both directions of this have now cost a wave. **Name the instrument, or the dispute is two
   people asserting.**
13. ⛔ **A TILE SOURCE THAT FETCHES NO DESCRIPTOR CANNOT FAIL LOUDLY — SO IT MUST BE PROXIED BY
   CONSTRUCTION, NOT BY INSPECTION** (2026-08-25, the Zoomify bug). ⚙ **Verified in source:**
   `resolveOSDSource()` in `canvas/canvas-app.jsx` passed `tilesUrl: work.hires.zoomify`
   **unproxied**, while the **DZI branch immediately below it** wrapped its descriptor in
   `proxied()`. NGV tiles carry `access-control-allow-origin: https://content.ngv.vic.gov.au`
   — their own origin only — so every `crossOrigin="anonymous"` tile load from `fuad.au` was
   blocked. Through the `img.fuad.au/ngv/` alias the same tile returns `ACAO: *` and
   **byte-identical bytes (27,930 B, measured)**.
   ⛔ **Why it survived: `ZoomifyTileSource` fetches NO descriptor.** OSD therefore **opens
   successfully**, `open-failed` **never fires**, and **no fallback is ever set** — the reader
   gets blank tiles with **no error strip**, on a toured Rembrandt (`two-old-men-disputing`)
   with six anchored study chapters. ⚙ Verified fixed in source: line reads
   `tilesUrl: proxied(work.hires.zoomify)`, with the diagnosis kept as a comment beside it.
   ⚠ Fix commit reported as `ba6f2a5` — **reported, not confirmed** (git was unavailable in the
   session that wrote this; the *code* was verified directly).
   ⭐ **THE CLASS, which is the part worth keeping: our whole error-handling design assumes a
   failure announces itself.** Every other branch (IIIF, DZI, simple-image) fetches something
   first, so a CORS or 404 failure raises `open-failed` and the fallback chain runs. A branch
   that fetches nothing has **no place for a failure to appear**. ⛔ **Audit such branches by
   reading them against their siblings — a difference between two adjacent branches is the
   defect, and "it opens fine" is not evidence.** Also note the corollary that misled an
   earlier pass: **adding an `img` would NOT have fixed this**, because the fallback path is
   never reached.
14. ⛔ **AN ORCHESTRATOR'S REPORT THAT A BATCH EXISTS IS NOT EVIDENCE THAT IT EXISTS — THE MERGE
   IS THE FIRST PLACE THAT GETS CHECKED** (2026-08-25, the w19b phantom batch; full entry under
   "Canon data defects" below). Three tours — Monet *Essai de figure en plein air*, Prouvé
   *Séjour de paix et de joie*, Puech *L'Aurore* — were **reported to Fuad as drafted** and
   **were never written to disk**. ⚠ A full-text sweep of **all ~950 files under `.dtmp`**
   found no tour draft, no read draft and no plan file for any of the three. **The merge
   invented nothing and parked their rulings**, which is the correct behaviour and the only
   reason the rulings survived at all.
   ⭐ **The expensive part is downstream: the STUDY_SPEC additions those tours "earned" are
   RULED, NOT MEASURED**, because there is no draft to verify them against. They are marked as
   such **at each of the four sites in `STUDY_SPEC.md`** as well as here — a note in one file
   does not travel to a drafter reading the other. **Generalises: when a batch turns out not to
   exist, the sweep is not "delete the batch", it is "find everything the batch authorised".**

## Session totals (2026-08-25) — ⚙ re-derived, not reported

| store | count | method |
|---|---:|---|
| `art_inspect` tours | **378** | `Object.keys(CANVAS_INSPECT).length` |
| `art-about` reads | **800** | `Object.keys(CANVAS_ART_ABOUT).length` |
| `art_hires` rows | **1,152** | `Object.keys(CANVAS_HIRES).length` |
| canon works | **1,977** | `CANVAS_ARTWORKS.length` |
| `beside` paragraphs | **22** | `art_inspect` entries with `beside !== undefined` |

⛔ **The session note reported 19 besides; the store has 22.** Everything else in that note
re-derived exactly. ⚠ **Both `art_inspect` and `art_hires` moved during the session** (hires
1,108 → 1,141 → 1,152; inspect gained the three w19a records mid-pass and tripped a guard —
see "Awaiting Fuad's verdict" item 6b). **Any figure quoted against these stores needs a date
beside it**, and a count taken before a wave lands is not wrong, it is *stale* — which is the
same failure the Coverage section below already carries.

⚠ **Stale denominators elsewhere in the docs, found while re-deriving these — all four struck
in place 2026-08-25:** `STUDY_SPEC.md` quoted **375** toured works (→ **378**);
`READS_SPEC.md` §11 quoted **798** `art-about` entries (→ **800**), **7** `beside` paragraphs
(→ **22**), and a corpus `refs` total of **60** (→ **75**, of which `art_inspect` is **44**,
not the 28 recorded — that figure had already been refreshed once the same day and went stale
again before the session ended).

⭐ **THE PATTERN, and it is the one to act on: every stale number in this project is a snapshot
of a store that has more than one writer.** None of them was ever *wrong*; each was true at the
moment it was written and false within hours. ⛔ **So a bare count in a spec is a latent defect.
Write the METHOD beside the number** — the one-liner that re-derives it — and the next reader
can settle it in a second instead of inheriting it. Every figure added in this section carries
its method for that reason.

## Measured cost (for planning)

Random 20-tour sample, this method: Fable reads ~156k chars of tours (~40k tokens) +
2 Opus verifiers ~59k subagent tokens for 6 flags ≈ **~5k tokens/tour all-in**.
Final 200-tour sweep (actual): ~1.15M chars of stripped dumps (~290k tokens read) +
1 Opus verifier (24.5k) for 3 flags ≈ **~1.6k tokens/tour** — flags get rarer and
cheaper as the defect pool drains; stripped dumps (no "see"/box coords) are the big saver.

| 2026-08-15 | Backfill batches 1+2 (29 works: interp + fused Info) + Milkmaid deeper chapters | §5b pipeline: per-work fact-trace vs tours (all numbers/proper nouns), formula/opener seals, fuse-gate 4-gram + hook fact-carry ×2 rounds; Milkmaid boxes crop-verified on the live plate | Fable (primary), Sonnet drafts | 3 draft seals (2 formula constructions, 1 invented descriptor "acidic"); Turner leak class found+fixed (3 shipped Infos carried "(Job year given as…)" workshop notes); Milkmaid dating moved to Rijks c. 1660 (canon+Info+context); voice rule: reads never cite the label that supplied a fact |
| 2026-08-23 | lk1 liked-Infos trial (23 works, research-first Opus drafts) | per-work qid-first identity resolution + UNVERIFIED ledger in agent replies; Fable scaffold-grep + length check; Fuad verbatim verdict | Opus drafts, Fable QC | 0 scaffold hits, lengths 68-117w; 1 venue clause trimmed at merge (Rohlfs); canon fixes shipped: VG self-portrait-2 1888->1889 (F626), Renoir snow-covered-landscape 1872->1875 (Orangerie dating), Le Givre seenAt=loan resolution (Artizon "Monet: A question of landscape" 2026, Orsay collab); Wikidata errors found (not canon): Q5375476 wrong collection/dims, Q28809078+Q28801586 say Met but objects are Rubin Museum, Q9162658 date off by a year |
