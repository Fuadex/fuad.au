> Part of the fuad.au docs — start at [/GUIDE.md](/GUIDE.md)

# The hi-res hunt — how art_hires.js got built, and everything that fought back

## ROUND 6 (2026-08-25) — the NG London regression is FIXED, and two holders adopted

`art_hires.js` **1,108 → 1,141 entries** (33 new rows, 37 rewritten in place). Working sheets,
with every hash and every reject: `.dtmp/tourqc-pass/w17/{gugg,mnw}/RESULTS.json`,
`.dtmp/tourqc-pass/w17/VERIFY.json`. **Nothing here was adopted on a reported number** — all 68
candidate urls were re-fetched in full and re-decoded after the sheets were built (0 failures),
and the anti-downgrade gate was re-run against `art_hires` as well as `art_imgsize`, which is
where it caught one.

### ✅ National Gallery London — the round-5 bug report, closed. The tile fix is the WHOLE win.

Round 5's diagnosis was right and its prescription was right. Measured here end to end:

| Request | Status | Decoded |
|---|---|---|
| `/full/max/`, `/full/full/`, `/full/3000,/`, `/full/!3000,3000/` | 200 | **800 × 662, all four byte-identical** (sha1 `772a293de82f…`) |
| raw IIP `?FIF=…&WID=5000&CVT=jpeg` | 200 | **800 × 663** |
| `/10240,10240,1024,1024/1024,1024/` — *what OSD asks for today* | 200 | **800 × 800** (upscaled into a 1024 tile → **78.1 % of linear detail**) |
| `/2560,2560,256,256/256,256/` — *what OSD asks for with `tile: 256`* | 200 | **256 × 256, native** |
| `/0,0,512,512/full/` · `/0,0,800,800/full/` | 200 | 512 × 512 · 799 × 799, native |

⚙ **The distinction, stated plainly, because it is NOT the Oslo case.** Region requests here
*do* serve native pixels off the full master — that is why the tile fix works at all. But the
clamp is on the **output size of every single response**, including the raw IIP `CVT` route, so
**there is no larger flat file to adopt and never was.** Oslo's regions open a bigger *file*;
NG London's regions open a bigger *zoom* and nothing else. **The tile fix is the entire win, and
it is a complete one:** the deep zoom now reaches 28,641 × 23,726 and 6,909 × 8,585 at 1:1.

⚠ **Do not read a clamp off `sizes` either.** Both NG descriptors *already publish*
`tiles: [{width: 256, scaleFactors: […]}]` — the server was telling us the answer the whole
time. Our inline descriptor threw it away. **When you hand OSD an inline descriptor you are
overriding the server's own advice; copy its `tiles`, do not omit them, unless you have read
`maxWidth`/`maxHeight` and there is no clamp.**

Also measured and worth not re-deriving: OSD's `IIIFTileSource` with no `tiles` takes the
`canBeTiled` branch and picks `tileSize = max([256,512,1024] ≤ min(w,h))` — **1024** for any
work over 1024 px on the short side — and, with no `scale_factors`, sets
`maxLevel = Math.round(Math.log(max(w,h)))` (that second argument to `Math.log` is a no-op in
JS, so it is the *natural* log — a real OSD quirk, self-consistent but not base 2).

**Both records corrected**, and the correction is not the one that was expected:
- `w`/`h` **stay** 28,641 × 23,726 / 6,909 × 8,585. Those are the true tile-source dimensions
  and, with `tile: 256`, they are now genuinely reachable — downgrading them would break the
  tile source and *understate* the zoom.
- New `flat: [800, 662]` / `[643, 800]` — the measured ceiling of any single flat render. The
  reader footer was labelling an 800 px link `Ultra HQ ↗ 28641×23726`. **That was the actual
  dishonest field, not `w`/`h`.**
- `img` repointed from `/full/!3000,3000/` (which delivers 800 px under a 3000 px name — a
  filename-as-dimension trap **of our own making**) to the Commons plate, per the Micrio
  precedent: `enrich()` feeds `hires.img` into `imgZoom`, so on *Madonna of the Pinks* our own
  record was silently downgrading the plain Zoom overlay from the Commons **870 × 1,080** to
  NG's **643 × 800**. A live per-axis downgrade, inside an adoption, for two days.
- Aspect re-verified against the holder's physical dimensions (Wikidata P2048/P2049): NG6582
  61 × 51 cm → 1.196 vs master 1.2072 (**0.94 %**); NG6596 22.4 × 27.9 cm → 0.8029 vs master
  0.8048 (**0.24 %**). Identity is holder-owned either way — the pyramid TIFF is *named* by
  accession (`N-6582…`, `N-6596…`) and both match P217 exactly.
- ⚠ `physicalScale` in these descriptors is **scan DPI, not object size** (0.00846667 cm/px =
  exactly 300 dpi; 0.00374631 = 678 dpi). It would "prove" *Coastal Scene* is 2.4 m wide.
  **Do not use a IIIF physdim service as a physical-dimension check.**

~~The viewer change is a two-hunk exact-match patch in `.dtmp/tourqc-pass/w17/NG_PATCH.md`
(`canvas-app.jsx` was held by another agent); `hires.tile` and `hires.flat` are inert until it
lands, so the data is safe to ship first.~~ **LANDED 2026-08-25.** All three hunks applied to
`canvas-app.jsx` (tile fix, footer honesty, holder labels), Babel-clean, and re-measured against
the live server after the edit — not read off the patch:

| Work | `hires.tile` | scaleFactors the patched code computes | what the server publishes |
|---|---|---|---|
| `theo-van-rysselberghe-coastal-scene` (28,641 × 23,726) | 256 | `[1,2,4,8,16,32,64,128]` | `[1,2,4,8,16,32,64,128]` — **identical** |
| `madonna-of-the-pinks` (6,909 × 8,585) | 256 | `[1,2,4,8,16,32,64]` | `[1,2,4,8,16,32,64]` — **identical** |

and the tiles themselves, fetched through the `ngl` proxy alias: `/0,0,256,256/256,256/` →
**256 × 256 native** on both, top-level region → 256 × 256 (215 × 256 on the Raphael, where the
region overruns the image, which is correct). The old level-10 request
`/10240,10240,1024,1024/1024,1024/` still answers **800 × 800** — the regression is real, it is
measurable on demand, and it is now not what OSD asks for. `maxWidth`/`maxHeight` re-read as 800
on both descriptors; `/full/max/` re-measured at 800 × 662, which is what the footer now says.

### ✅ Guggenheim — 20 adopted, and the reported rule was wrong in a way that mattered

**`www.guggenheim.org` is open nginx** — no Cloudflare, no challenge. The reported trick
("delete the trailing `-1`") is **not the rule**: `-1` is WordPress's *upload-collision counter*,
not a size tier. The rule is **strip every WP variant suffix back to the canonical stem
`<ACCESSION>_ph_web.jpg`, in the same `uploads/<YYYY>/<MM>/` directory** — tested on 31 anchored
works, and **2 would have failed a literal `-1` delete** (*Woman in a Striped Dress* is served by
the museum's own page at 246 × 512 and the canonical stem gives **1,936 × 4,096**; *Blue
Mountain* needed a different upload directory entirely).

Ceiling is a **~4,096 px fit box** and it is the ceiling: `-scaled`, `-2048x1386`, `_ph.jpg`,
`_ph_print.jpg`, bare `<accession>.jpg` all 404, and `?w=8000` returns the **byte-identical**
4,096 file (trap 7, caught by hash). **No ACAO on any asset** (measured on 30 with
`Origin: https://fuad.au`, re-measured on 8 independently; no `vary` header at all). ~~Alias in
`.dtmp/tourqc-pass/w17/WORKER_GUGG.local.md`, **not pasted**~~ — **PASTED AND LIVE 2026-08-25**;
`IMG_PROXY` now maps `https://www.guggenheim.org/` → `https://img.fuad.au/gugg/`.

⚙ **How the alias was verified, and the method to reuse.** An unknown alias does not error — the
worker answers `unknown upstream` with a **404 of exactly 16 bytes**, and the app then degrades
silently, which is how `/nglondon/` once shipped against a deployed `ngl` and cost a
679-megapixel scan while looking like nothing had happened. So the check is a three-way probe,
not a reading of the alias string: a **live row through the proxy** (`/gugg/wp-content/uploads/
1916/01/49.1229_ph_web.jpg` → **200, `image/jpeg`, 5,364,087 bytes, `access-control-allow-origin:
*`**), the **same file direct** (200, `image/jpeg`, same 5,364,087 bytes, **ACAO absent** — the
no-CORS finding re-confirmed on a live row, not just on the sourcing sheet), and a **deliberately
bogus alias** (404, 16 bytes). Identical byte counts prove the proxy is serving the same file and
not a derivative; the ACAO delta is the whole reason the alias exists. The same probe run against
`artuk` returns the 16-byte 404 — **`artuk` is still unpasted**, and `img-proxy.worker.js` now
says so in place rather than silently lacking the line.

The alias remains **optional for correctness**: a `type: "image"` source that fails CORS lands in
`open-failed` and is rebuilt on the direct url with `cors: false`, which is a plain image load.
What it buys is that the first open succeeds instead of costing a guaranteed failed request —
never a better image, just not a wasted round-trip on all 20 works.

⛔ **The one work the reported claim was verified on is one of the rejects.** "Verified
4096 × 2852" is *Composition VIII* (37.262): **×1.02 linear** over our 3,911 × 2,849 plate with a
**4.62 % aspect delta**. A sample of one proved the host and nothing about the corpus.

✅ **The round-4 Kandinsky decline is overturned.** *Improvisation 28 (second version)* was
closed as "a 1,280 px web-tier JPEG, ×1.4". That 1,280 file is the WP-*registered* derivative —
`wp-json/wp/v2/media/119149` knows about nothing else — while the canonical stem serves
**4,075 × 2,758, ×4.52, 0.55 → 11.24 MP**. ⚠ **A media API that reports a ceiling is reporting
its own index, not the disk.**

13 rejected: **8 on aspect > 2 %**, 3 anti-downgrade, 1 zero-gain, 2 unanchored (reported as
unmeasured, not as absent).

### ✅ MNW Warsaw — 48 adopted, +~620 MP, the largest single win in the arc so far

The path rewrite generalises. Full shape, which the report understated —
**`cyfrowe-cdn.mnw.art.pl/upload/cache/multimedia_big/<aa>/<bb>/<hash>.jpg` →
`…/upload/multimedia/<aa>/<bb>/<hash>.jpg`** (the report omitted `upload/` and the CDN host).
Tested on 16 objects, never byte-identical, 20–60× the bytes. Invented tiers
(`multimedia_small`/`_medium`/`_xl`/`_full`, `cache/multimedia`) **404 honestly** — exactly four
rungs exist, and `multimedia/` sits on a different backend (Hitachi HCP) from the nginx cache
tiers. **`ACAO: *` measured on all 48** with `Origin: https://fuad.au` — no proxy, no worker.

⚠ **`multimedia_big` is a 1,024 px fit box.** Trap 9 living inside the word "big".

⚠ **6000 is an ingest target, not a cap and not "the original."** Of 85 masters, 15 land on
exactly 6000, 69 fall below (down to 2,633) and **one exceeds it** (6,620). Best real gain
**×7.74**, not the reported ×7.96.

**Enumeration.** `cyfrowe.mnw.art.pl/oai-pmh` and `/oai` both return **200 with the identical
3,416-byte Angular shell** — trap 3, twice. The real OAI lives on a separate host,
`cyfrowe-oaipmh.mnw.art.pl`. But the door that actually worked is **`cyfrowe-api.mnw.art.pl`**,
keyless, `ACAO: *`, 109,893 objects, keyed by **`filter[inventoryNumber]=<number>`** against
Wikidata P217. All 85 hits returned exactly one object and `noEvidence` matched P217
character-for-character **85/85**. ⚠ **An unrecognised filter key is silently ignored and returns
the whole corpus with a 200** — check `totalItemsCount`.

⛔ **NEW TRAP — Wikidata P9061 (MNW object id) is NOT a safe anchor**, and the holder gate
cannot see it. `battle-of-grunwald`'s P9061 resolves to a clean MNW-owned record **for a Chinese
bronze ritual vessel**; `stanczyk`'s P9061 404s. This is trap 10 wearing an **id** instead of a
surname: the object is genuinely held by the right museum, so P195 passes. **Anchor on the
inventory number (P217) and cross-check the returned record's own accession.**

⚠ **15 of the 48 originals are served `content-type: application/octet-stream` with `nosniff`**
(the cache tiers are always `image/jpeg`). Bytes are genuine JPEG and the `image` destination is
not subject to nosniff blocking, but it is the exact shape that fails silently in a crossorigin
fetch — **open `garden-in-kissingen` in a real browser once.** `open-failed` rebuilds with
`cors: false` if it does fail, so the fallback is benign.

### ⛔ The anti-downgrade gate caught one — and it was inside an ADOPT list

`stanczyk`: candidate **5,759 × 4,277**, existing `art_hires` row **5,766 × 4,289**. Smaller on
**both** axes, and it scored ×1.85 only because the comparison was run against `art_imgsize`
(3,118 × 2,313) instead of the row we actually serve. **Run the gate against
`max(art_imgsize, art_hires)` per axis, not against the plate.** Two further MNW rows were
dropped as no-ops (`jewess-with-oranges` pixel-identical, `eugeniusz-wrzeszcz…` ×1.002): a flat
JPEG with no gain is not the Micrio case — **there is no pyramid to buy.**

### ⚠ HELD, NOT REJECTED — 35 works where OUR plate is the cropped one

8 Guggenheim + 27 MNW candidates exceed the 2 % aspect gate, so they were **not adopted** (a
re-plate would invalidate existing tour box coordinates). But both sweeps cross-checked the
candidates against the **holder's recorded physical dimensions**, and the result inverts the
usual reading: on **6 of the 8** Guggenheim and **21 of the 27** MNW conflicts the *candidate* is
the truer framing and **our current plate is the crop**. Examples: `werki-pod-wilnem` (physical
82 × 68.5 cm — our plate off **11.4 %**, MNW off **0.3 %**); `red-oval` (a 500 × 488 plate with
×7.77 available); `nude-study-sad-young-man-on-a-train` (our plate is a visitor's gallery photo).
These are **remap candidates needing Fuad's call plus a tour-box re-anchor**, not discards — the
same shape as the Klimt *Water Serpents I* hold in the toured-plates pass. ⚠ `saint-anne` is the
one to leave alone: plate landscape, candidate portrait, physical object square — neither capture
matches, identity uncertain.

⚙ **Why these are HELD and not simply adopted — the rule, since "the candidate is truer" reads
like an obvious yes.** A re-framed plate is not a swap of one image for another. **Tour box
coordinates are fractions of the DISPLAYED plate**, so changing the framing moves every box in
that work's tour: a box that sat over a face at `x: 0.41` on a plate cropped 11.4 % tighter than
the object does not sit over that face on the true framing. So the unit of work here is not a
re-plate, it is **a re-plate PLUS a box re-anchor for every stop**, and for a toured work it is a
**re-tour question** — whether the stops still say what they were written to say once the frame
they were composed against has changed. That is an owner's call and a drafting pass, not a data
edit, which is exactly why an aspect delta over the 2 % gate is a HOLD and never an auto-adopt.

The corollary is uncomfortable and worth stating: **on 27 of these the gate is protecting a
crop.** `werki-pod-wilnem` is the clean example — physical object 82 × 68.5 cm, our plate off
**11.4 %**, the MNW candidate off **0.3 %**. The gate is still right to fire, because what it
guards is *coordinate stability*, not fidelity; it simply cannot tell "our plate is wrong" from
"the candidate is wrong". **Read every aspect failure against the holder's recorded physical
dimensions before calling it a reject** — that third number is the only thing that breaks the
tie, and without it 27 corrections would have been filed as 27 bad candidates.

⚠ Untoured works in this set are cheap (re-plate only, no boxes to move) and toured ones are
expensive. **Split the list by toured/untoured before taking it to Fuad**, so the cheap half is
not held hostage by the expensive half.

15 MNW works are **UNRESOLVED, not absent**: 9 have no cyfrowe record under their P217, 3 carry
**Royal Castle** inventory numbers (ZKW …) while their P195 says MNW — a census/Wikidata conflict
worth its own look — and 3 have no P217 at all.

### 📎 Side doors worth keeping

`www.guggenheim.org/wp-json/wp/v2/artwork?slug=<objectId>`, `wp/v2/media/<id>` and
`wp-json/guggenheim/v1/search?s=<title>` are open and keyless — but the custom search does **not**
index accession numbers (search by title, *verify* by accession), and `wp/v2/media` only ever
knows the 1,280 derivative.

## ROUND 5 (2026-08-25) — **corrections to already-adopted sources come first**

This round's most valuable output is not the new holders. It is that **four entries in this
document are wrong about sources we have already acted on**, and one of them is a live
regression on works that are already toured. Read the corrections before the wins.

### ⛔ REGRESSION — National Gallery London serves 800 px and silently upscales

**This is a bug report, not a note.** ✅ **CLOSED in round 6 and shipped in `canvas-app.jsx`
2026-08-25** — kept unedited below because the diagnosis is the reusable part; only read the
verdict lines as history. Our records advertise Rysselberghe *Coastal Scene* at
**28,641 × 23,726** (the adopted table below still says ×35.8). What the server actually
delivers ~~is **800 × 662**~~ **delivered, while `tiles` was omitted, was 800 × 662 — it now
delivers the full master 256 px at a time, and the flat-render ceiling of 800 × 662 is recorded
in `hires.flat` and labelled honestly in the footer.**

- The `info.json` carries `maxWidth: 800` / `maxHeight: 800` and **clamps with a 200, not a
  400** — so nothing fails, it just shrinks.
- **`/full/max/`, `/full/full/` and `/full/3000,/` all return the byte-identical 800 × 662
  file.** (Trap 7's shape, on a source we adopted: statuses and content-types agree, bytes do
  not lie.)
- Worse, and this is the part that costs the reader: **the inline descriptor omits `tiles`.**
  That was deliberate — the IIIF-CORS note below argues for omitting `tiles`/`sizes` so OSD
  picks its own 1024 and asks for arbitrary regions. On a level2 server with no clamp that is
  right. **Here every 1024-px tile request is answered at 800 and upscaled**, so the deep zoom
  runs at roughly **78% of the detail the server would give** if asked correctly.

⚙ **THE FIX: declare `tiles: 256` in the inline descriptor** for `ng-london`. That makes OSD
request 256-px regions, which the server returns at native scale instead of clamping. The
general rule the CORS note states is unchanged; **it now carries an exception: omit `tiles`
only where the descriptor declares no `maxWidth`/`maxHeight`.** Check the clamp first.

⚠ Both NG London works (`ng-london` src, 2 entries) are affected, and both are **toured**, so
their Study stops are being read at 800 px against a store that claims 28k. This also
interacts with the per-work reader ceiling now ruled in STUDY_SPEC — a drafter told "this work
is on a true IIIF, go as fine as the plate resolves" would be reading detail that no reader
can reach.

### ⛔ Musée d'Orsay — CLOSED as a downgrade engine. This corrects TWO wrong notes.

The ledger's closed-out list below says Orsay is *"Cloudflare 403 to every programmatic
client… parked, not dead"*. A mid-session claim went the other way and said its IIIF opens
**5,235 works**. **Both are wrong, and they are wrong about different machines.**

- The 403 was **`www.musee-orsay.fr`** — the public site. A different host.
- **`iiif.musee-orsay.fr` is wide open**: textbook IIIF **3, level2**, `ACAO: *`, no headers
  needed, no proxy needed.
- **And every master caps at 850 px.** Verified across **4 objects / 29 canvases**. Not one
  reaches a megapixel.

We hold **150–176 Orsay works**. Adopting any of them would be a downgrade on all of them.
⛔ **Do not re-hunt Orsay.** It is not blocked, it is not unexplored, and it is not worth a
call. This is trap 2 (a real pyramid whose master is smaller than ours) at collection scale —
and note it took the *open* door to discover that, which is why "blocked" and "useless" must
never be recorded as the same verdict.

### ❌ CORRECTION — Getty and Yale are recorded as dead and are OPEN

The per-source row below reads *"Getty / Yale / Brooklyn | blocked or down | 0 | Getty
endpoints network-blocked; both Yale APIs dead/403"*. Two thirds of that is wrong:

- **Getty is OPEN** — IIIF **3, level2**, `maxWidth 30000`. Not network-blocked.
- **Yale YCBA is OPEN** — IIIF **2, level2**, **no clamp**, a **27.2 MP** sample measured.
- Brooklyn is untouched by this correction (still 429s without a key).

Neither was swept for canon matches this round — **they are re-opened as unexplored, not
adopted.** The correction is that the reason they were closed never existed.

### ⚠ `/full/max/` IS NOT UNIVERSALLY SAFE — record it as a trap

The round-3 record treats `/full/max/` as the portable "give me everything" size keyword. It
is not, and the failure is a **400, not a downgrade**, so it takes a whole source out:

- **Nationalmuseum Stockholm** — IIIF 2 **level1**, capped 1000 px: `/full/max/` **400s**.
- **Smithsonian** — same shape, same 400.
- **Micrio** is the reverse case: IIIF 3, where `full` is not a legal size and **`max` is the
  only correct keyword** (which is why the round-3 records write `full` out explicitly).

**So the size keyword is a property of the level and the version, not of IIIF.** Level1
servers advertise their `sizes` array and mean it; ask for a listed size. Read the profile
before choosing the keyword.

### ❌ CORRECTION — the Frick UA + `Accept` trick GENERALISES TO NOTHING

Round 4 solved the Frick's 418 with `User-Agent` + `Accept` + `Accept-Language` and recorded
the finding that the wall *"reads headers, not a TLS fingerprint"*. That is true of **that
wall**. It has since been read as a general opener, and it is not one.

**Cloudflare *challenge* responses are a different class and are not header-solvable.** The
tell is `cf-mitigated: challenge` or an "Attention Required!" / "Just a moment…" body. The
British Museum row already records a full Chrome header set with `sec-ch-ua` and the
`sec-fetch-*` family still 403ing; NYHS the same. **Two walls, two classes:**

| Wall | Tell | Header-solvable? |
|---|---|---|
| eMuseum bot-challenge shell | 418, or 200 with a tiny body | **Yes** — UA + `Accept` pair |
| Cloudflare challenge / WAF | `cf-mitigated: challenge`, "Just a moment…", 403 | **No.** Stop. |

Anything in this file implying otherwise is corrected here. Budget one probe, read the tell,
and move on.

### ❌ CORRECTION — NGI has NEVER worked for us, and it is the Frick anatomy

Any note reading as though National Gallery of Ireland IIIF has served us is wrong. Measured:
**descriptor-less IIIF** — `info.json` **400s**, region syntax works, **ceiling 3000**, **no
ACAO**. That is the Frick's exact anatomy (real IIIF that refuses to introduce itself), with
the Frick's exact consequence: an inline descriptor is mandatory, and with no ACAO it needs a
proxy alias before anything can be adopted. The closed-out list's *"ships zero image URLs
(client-rendered eMuseum)"* was a correct observation of the **page**; it said nothing about
the image service, and the two must not be conflated again.

### ✅ New wins, all measured

- **MNW Warsaw — 85 works, 34 of them plateless.** The gain is a path swap:
  **`cache/multimedia_big/` → `multimedia/`** returns the **6000 px original** instead of the
  cached derivative. `ACAO: *`, so no proxy alias. Best gain measured **×7.96**.
- **Guggenheim — 14 plateless works, 13 of them SEEN.** The gain is a filename edit:
  **delete the trailing `-1`**. Verified at **4096 × 2852**. (Note this is the same holder
  whose Kandinsky was declined at 1,280 px in the toured-plates pass — that was the web tier;
  this is not.)
- **Scottish National Gallery** — a public **DeepZoom** at **43.8 MP**. `hires.dzi`, which the
  viewer already supports; proxy the descriptor and the tiles follow.
- **Nasjonalmuseet Oslo — the flat render clamps at 4000, but REGION REQUESTS SERVE NATIVE
  PIXELS.** The master measures **59,171 × 73,171**. ⚙ **Both halves of this are recorded on
  purpose:** one agent measured the 4000-px clamp on `/full/…` and reported Oslo as capped,
  and **was corrected** — asking for a region instead of the full frame returns native pixels.
  This corrects the row below (*"no public API… no discoverable search front door"*): there is
  a service, and **a clamp measured on `/full/` is not a clamp on the server.** Re-measure any
  holder this file records as capped, by region, before believing the ceiling.

### 📊 Corrected census figures — the old ones were badly out

Re-measured against the live stores 2026-08-25 (method stated so it can be re-run):

| Figure | Recorded | **Correct** | Method |
|---|---:|---:|---|
| canon works with no `art_hires` row | ~1,800 | **848** | `1,956 canon − 1,108 hires rows` |
| **seen**-but-plateless | 105 | **258** | canon rows with `!wish` and no `art_hires` |
| …of those under 1,600 px | — | **152** | above, joined to `art_imgsize` (20 have no size row) |

⚠ **`!wish` is the load-bearing predicate** — "has a `seenAt`" gives **247**, because 11 works
carry a venue without being marked seen. State which one you used; that difference is exactly
the join-discipline lesson STUDY_SPEC records twice.

### ⛔ Commons refuses to render a TIFF above 1920 — and it is not three rows, it is 46

`Special:FilePath/…?width=N` for `N > 1920` on a `.tif` redirects to a
`lossy-page1-1920px-…` render, and direct `upload.wikimedia.org` thumbs at the declared width
return **400**. So the row's `w`/`h` describe the master, not the delivery:

| id | `art_hires` declares | actually served |
|---|---|---|
| `anders-zorn-mrs-veronica-heiss` | 3478 × 4649 | **1920 × 2566** |
| `midsummer-dance` | 2603 × 3547 | **1920 × 2616** |
| `the-kitchen-maid` | 2823 × 3494 | **1920 × 2376** |

⚙ **The sweep was run and the scope is worse than the three named rows: 46 `art_hires` rows
have a `.tif` in `img`, and ALL 46 declare a long side over 1920.** Every one is overstated.
The reader footer's Ultra HQ link is still honest (the TIFF really is that big); the **viewer**
is not. This is the counterpart to the TIFF-upscale trap already recorded above — there
MediaWiki inflates a TIFF thumb, here it refuses one.

⚠ And it sharpens STUDY_SPEC's pixel-extent check: for these 46 works the reader's real
ceiling is **1920**, so a rule written at 3840 is twice as strict in practice.

### Also logged

**11 canon works name their holder as qid `Q1191732`** — which is literally *"museum
storage"*, not an institution. They are `teodor-axentowicz-ko-omyjka`,
`jozef-szermentowski-odpoczynek-oracza`, `w-adys-aw-podkowinski-sza-szkic`, `pyotr-nilus-ulica`,
`wincenty-kasprzycki-widok-pa-acu-w-natolinie-od-strony-parku`,
`jozef-pankiewicz-nokturn-abedzie-w-ogrodzie-saskim-w-warszaw`,
`konstanty-mankowski-szarytka-w-ogrodzie-szpitalnym`, `jan-ciaglinski-poca-unek-s-onca`,
`wac-aw-szymanowski-trzy-nimfy-nad-jeziorem-koncert`, `ferdynand-ruszczyc-pejzaz-rzeczny`,
`michael-willmann-untitled`. A holder-gated sweep (the P195 gate above) cannot work on these,
because there is no holder to gate on. Most are MNW works — which is where the MNW win lands.

## ROUND 4 (2026-08-25) — three walled holders opened, **zero adoptions**

The most expensive round in the arc and the only one that emits nothing. Three holders that the
round-3 ledger listed as "blocked rather than measured" were pushed until they either opened or
proved themselves hard: **the Frick opened and turned out to be a downgrade engine; the British
Museum opened by two side doors and is also a downgrade engine; New-York Historical stayed shut,
and the prize behind it turned out to be a quarter of what we'd recorded.** The value of the round
is entirely in the anatomy — four new named traps, two of our own earlier notes disproven, and
three holders that never need hunting again.

**Two of the corrections below are corrections to *this document*.** That is the point of writing
them down: a wrong note in a ledger costs more than no note, because the next pass trusts it.

### ⛔ The Frick — CLOSED. 17 works measured, 17 downgrades, 0 gains.

**Getting in.** `collections.frick.org` answers **HTTP 418** to a default client — a bot-challenge
code, and Fuad saw the same 418 from his own browser, which made it look like an IP block. It is
not. The wall is **header-based**, and it takes two steps to clear:

- bare UA, no `Accept` headers → **200 with a 182-byte stub** (the challenge shell)
- UA **plus** `Accept: text/html,application/xhtml+xml` **plus** `Accept-Language` → **200,
  86,108 bytes, the real page**

~45 requests at 3–6 s spacing drew no IP block at all. Reproduced in node's own `https` module,
where the defaults get 418 and adding the `Accept` pair fixes it — which **proves the wall reads
headers, not a TLS fingerprint**, and therefore that curl-vs-node is not the variable. See trap 5.

**❌ CORRECTION — the DeepZoom reading was wrong.** `FRICK.local.md` recorded "`dzi` appears in the
markup — so the pyramid is most likely DeepZoom". It is not, and the sighting was **a substring
inside human prose**: the provenance paragraphs name **Dzí**ków Castle and Z**dzi**sław Tarnowski.
Machine-checked across all 17 fetched pages: `hasDziString = false`, `hasIiifString = false` on
**every one**. See trap 6 — this is the cheapest possible way to invent a technology that isn't
there.

**What it actually is: IIIF Image API 2.0 with NO descriptor.** The trace, end to end:

> page tail `["emuseum/MediaZoom:init", W, H, "/internal/media/zoomdispatcher/<mediaId>", 256]`
> → `/modules.gz/emuseum/MediaZoom.js`
> → `new ol.source.IIIF({ resolutions:[8,4,2,1], size:[w,h], tileSize:[256,256], version: VERSION2 })`

OpenLayers is handed a **fully inline config** and never fetches a descriptor — and `info.json`
returns **400** if you ask for one anyway. The tile pattern is
`…/zoomdispatcher/<mediaId>/{x},{y},{w},{h}/{tw},/0/default.jpg`, verified live: 200, 256×256, edge
tile 256×208, and one pixel past the edge → **500 "negative or zero width"**. So it is real IIIF,
it just refuses to introduce itself.

⚠ **This is the sharpest form of the silent-failure warning already in this doc.** With an
inline-descriptor viewer there is **no metadata request at all**, so a CORS block or a 418 shows up
as **blank tiles with no `open-failed` event and therefore no fallback**. Zoomify at least fails
visibly as broken tiles; this fails as nothing.

**And it was all for nothing, because of the ceiling.** **Every Frick zoom master is hard-capped at
exactly 2000 px vertical.** All 17 measured heights = 2000; widths 1280–3246. That is **2.56–6.49
MP against our current plates at 24.94–45.55 MP**:

- worst: `general-john-burgoyne` **45.55 → 3.20 MP (−42.35)**
- least bad: `officer-and-laughing-girl` **−21.27**
- median: **−25.28**
- the Frick's own best, `regatta-in-venice` at 6.49 MP, is **23 % of our plate** — not one of the
  17 reaches a quarter

**No hidden larger surface, and this is where trap 7 was paid for.** The flat derivative
`/dispatcher/<id>/full` is 800×694. Six alternate size keys — `original`, `download`, `large`,
`zoom`, `resize:format=full`, `resize:format=original` — all return 200 and all return the
**byte-identical** 800×694 file. eMuseum silently falls back to its default derivative for any key
it doesn't know. Asking for `full/6474,` clamps to native. **The declared size is the true
ceiling.**

**ACAO absent**, measured on real tiles with `Origin: https://fuad.au` — two media ids plus the
flat derivative, all 200, none carrying ACAO. They send `vary: Accept`, **not** `vary: Origin`,
which is itself the tell that origin was never considered.

⛔ The `frick` worker alias was written out to `.dtmp/tourqc-pass/WORKER_FRICK.local.md` and is
flagged **DO NOT PASTE**. There is nothing to adopt; the file exists so the measurement isn't lost.

**The anchoring method that worked** (worth reusing on any eMuseum holder): **double-key on
Wikidata P217 accession + eMuseum object id, then cross-check against the accession printed on the
fetched page.** 16 of 17 agreed exactly. The one disagreement is a data point about *us*:
`perseus-and-andromeda` — our P217 says **1918.1.114**, the Frick page says **1916.1.114**. Right
painting either way; **our P217 is probably stale.**

### ⛔ British Museum — CLOSED. 6 works, all downgrades. Two side doors, one bad diagnosis.

**A different wall, and the Frick trick does not work on it.** UA + `Accept` **fails**: the response
carries `cf-mitigated: challenge` and a Turnstile "Just a moment…" page. A full Chrome header set
with `sec-ch-ua` and the `sec-fetch-*` family **also 403s**. **This class is not solvable by
headers** — do not spend another hour on it.

It opened by two routes that had nothing to do with the front door:

1. **Wayback returns the object pages intact** — 192,807 B, with **every media URL present in the
   markup**. An archive snapshot of a page is a perfectly good source of *URLs* even when it is a
   poor source of *pixels*.
2. **❌ CORRECTION — `media.britishmuseum.org` DOES resolve.** The round-3a note saying it "does not
   resolve at all" was **wrong**. It is an open Apache. What actually failed was **TLS: a valid
   `*.britishmuseum.org` wildcard certificate served without its intermediate**, so the chain
   couldn't be built and the client error read like a dead host. See trap 8.

**The ladder, and its ceiling.** Derivatives are `preview_` / `mid_` / `large_` / `max_`. There is
**no bare form, no `original_`, no `full_`, no `zoom_`** — those were all tried. **`max_` caps at
2500 px on the long side, ~4–5 MP**, verified on three separate images. Our 6 BM works hold
**13.5–51.7 MP**, so adoption would be a **−8.5 to −46.6 MP** downgrade on every one.

No ACAO either — and note that **the broken cert chain would defeat a Worker proxy anyway**, so
even a wanted image here would have needed the cert fixed at their end first.

### ⚠ New-York Historical — STILL WALLED, and we had overstated the prize

**It is a Cloudflare WAF hard block, not a challenge and not UA sniffing.** "Attention Required!",
403 to the Safari set, 403 to the full Chrome set, and — the part that kills every workaround —
**403 on the image paths too**: `/internal/media/dispatcher/93546/full` and `/preview` both.

Mapping the blast radius: `www.nyhistory.org` answers **200**, so only the *emuseum* subdomain is
walled. `digitalcollections.nyhistory.org` sits on the **same Cloudflare IP**, so it is behind the
same rule and is not an alternate door. `iiif.nyhistory.org` does not exist.

**❌ CORRECTION — "26 works at ×4" was always optimistic.** Re-reading
`.dtmp/tourqc-pass/r2/nyhs_dims.json`: only **10 of 26** works were ever measured, **all of them
via Wayback** (the other 14 attempts were **Wayback 404s**), and of those 10 only **6** actually
show the ~×4 gain. The remaining 16 have never been measured at all and need the live host. The
honest headline is **6 confirmed ×4 upgrades and 16 unknown**, not "26 works at ×4".

**Recommendation stands and is unchanged: Fuad's own browser, or a different egress IP.** There is
no header, no archive and no sibling host that gets past this one.

## COMMONS IIIF IS DEAD — and one correction in our favour (round 3a, 2026-08-25)

**There is no IIIF service for Wikimedia Commons in 2026.** Measured, not assumed:
`iiif.wikimedia.org` DNS-fails; `commons.wikimedia.org/iiif/2/…` 404s; `iiif.toolforge.org` is
a tool-down page; **`zoomviewer.toolforge.org/proxy.php?iiif=…` — the endpoint every guide and
every current search result still points at — 404s on every shape, including the exact example
URL Commons' own documentation gives.** Phabricator **T187872** ("Support IIIF Image API for
thumbnailing & tiling") is open, unassigned, needs-triage, filed **2018-02-21**, and its only
recent activity is people subscribing. **Re-open this question only if that ticket gets an
assignee.** This was the highest-leverage unknown in the whole hunt; it is closed.

**LEDGER CORRECTION, in our favour.** `Special:FilePath?width=N` **rounds UP to the next
materialised bucket** — measured buckets are **500 / 960 / 1920 / 3840**. So `imgGrid` is
really 500px, `img` is really 960, and **`imgZoom` (`?width=2000`) has been serving 3840 all
along.** The Commons render ceiling is exactly 3840: 3840 → 200, **3841 → 400**. Also
`upload.wikimedia.org/thumb/` refuses non-bucket widths outright (2777 and 3333 both 400), so
any hand-built `pyr` level list must use real buckets.

⛔ **COMMONS TIFF MASTERS ARE CLOSED, AND CARRY A FAKE-GAIN TRAP.** All 49 TIFF-backed entries
are pixel-identical to the JPEG already in `img`. Worse: asking for a 3840 thumb of a
3478×4649 TIFF returns 3840×**5133** — **MediaWiki UPSCALES TIFFs**, so a naive sweep logs a
gain on all 49 that does not exist.

## ⛔ THIRTEEN TRAPS THAT LOOK LIKE WINS (rounds 3–6, 2026-08-25)

Each passes a naive check and ships a regression — or, in the round-4 four, writes a *false line
into this ledger*, which is worse, because the next pass inherits it as fact. Test for them by
name. **1–4 are round 3 (they cost us adoptions); 5–8 are round 4 (they cost us diagnoses);
9–10 are round 5 (they would have shipped WRONG OBJECTS and wrong numbers); 11–13 are round 6 —
and 13 is the first one we did to ourselves, inside an already-adopted record.**

1. **MANIFEST-WITHOUT-A-SERVICE.** Petit Palais / Paris Musées publishes *real IIIF manifests*
   — and no image service behind them. The canvas points at a 6.97MP Drupal render against our
   20.37MP plate. Adopting on the reputation of "they have IIIF" would have downgraded 17
   works. **Always resolve a manifest to an actual `info.json` and measure it.**
2. **A REAL PYRAMID WHOSE MASTER IS SMALLER THAN OURS.** Micrio is a genuine IIIF 3 level2
   service, and two of its ids still lose: Van Gogh Museum's *Raising of Lazarus* at 4000×3059
   against our 7336×5611 (−28.9MP), and a Kröller-Müller Van Gogh self-portrait (−13.9MP).
   Tiling is not a licence to skip the measurement — **every id individually.** Same class as
   Belvedere, whose clean IIIF caps at 1772px, below our plates.
3. **HTTP 200 FROM AN SPA CATCH-ALL.** ColBase (Tokyo National) returns 200 for *every* path
   including `/iiif/`, because the front end serves its shell to anything. Status alone scores
   it a live IIIF holder; **only content-type exposes it.**
4. **A MIS-TYPED WIKIDATA PROPERTY.** MNK's P6108 ("IIIF manifest") points at a plain
   object-record JSON API. **P6108 is not self-validating** — fetch and inspect it.
5. **A 200 THAT IS STILL A BLOCK — BYTE COUNT IS THE TELL, NOT STATUS.** The Frick's challenge
   shell answers **200 with 182 bytes**; the same URL with browser `Accept` + `Accept-Language`
   answers **200 with 86,108 bytes** and the real page. A sweep that scores on status alone marks
   the holder live and then finds "no image URLs in the markup" — because there is no markup.
   **Log a body size on every fetch, and treat a suspiciously round tiny body as a wall.** (Sibling
   of trap 3: there, 200 meant an SPA shell; here, 200 means a bot challenge. Status is never
   evidence.) Corollary in our favour: **418 does not mean IP-blocked.** It cost the Frick a whole
   round of being listed as unreachable.
6. **A SUBSTRING INSIDE HUMAN PROSE, READ AS A TECHNOLOGY SIGNAL.** Grepping Frick object pages for
   `dzi` hit — and the hits were **Dzí**ków Castle and Z**dzi**sław Tarnowski in the *provenance
   paragraphs*. That one false positive put "the Frick is DeepZoom" into a working note, where it
   sat as fact. The real stack is IIIF 2.0 with no descriptor. **Short lowercase tech tokens
   (`dzi`, `iiif`, `tif`, `zoom`) will collide with names, places and ordinary words in
   catalogue prose. Match on a path or a filename shape (`/dzi/`, `.dzi`, `_files/`), never on a
   bare substring — and confirm against the viewer's init call, not the page text.**
7. **AN ALTERNATE SIZE KEY THAT IS JUST THE DEFAULT DERIVATIVE RENAMED.** Six eMuseum size keys —
   `original`, `download`, `large`, `zoom`, `resize:format=full`, `resize:format=original` — all
   returned **200 with plausible image bytes**, and all six were the **byte-identical** 800×694
   default. eMuseum falls back silently for any key it doesn't recognise, so an "is there a bigger
   one?" sweep reports six live endpoints and zero of them are real. **Compare hashes or decoded
   dimensions, never statuses or content-types.** (Google Arts & Culture fails the same way with
   `=s0`/`=s4000`/`=w4000`; Art UK is the honest opposite, where every wrong key 404s.)
8. **A CERT-CHAIN FAILURE THAT READS AS A DEAD HOST.** `media.britishmuseum.org` was written into
   the round-3a ledger as "does not resolve at all". It resolves fine — it is an open Apache
   serving the whole derivative ladder. It serves a **valid `*.britishmuseum.org` wildcard without
   its intermediate certificate**, so the chain can't be built and the client raises an error that,
   read casually, looks like DNS or a downed host. **Before recording a host as non-existent,
   separate the three failures: NXDOMAIN, connection refused, and TLS. Read the actual error
   string.** ⚠ And when it *is* TLS, note the second-order consequence: **a broken chain defeats a
   Worker proxy too**, so a discovery here is not automatically adoptable.
9. **FILENAME-AS-DIMENSION.** A filename containing `W1500` served an image measured at
   **2405 px**. Holders name derivatives after the *request* that first generated them, after
   the tier they belong to, or after nothing at all — and the name is never re-written when the
   file is re-rendered. A sweep that reads a size out of a URL is reading a label, not a
   measurement, and it fails in **both** directions: it discards real gains as too small and
   logs fake ones as big. **Decode every candidate's actual dimensions.** (Same family as trap
   7 — there the *key* lied, here the *name* does; in both cases only the bytes are evidence.
   Art UK's `w1200h1200` is the honest exception, and it is honest because it 404s on every
   other value.)
10. **A NAME COLLISION INSIDE A HOLDER SEARCH — the holder gate does NOT catch this.** Searching
   NGI for "Leech" returned three objects that all **pass the P195 holder check** and all
   **measured cleanly**, and none of them is the work: a **John Leech** the *Punch* illustrator
   (a different artist with the same surname), a **Stanley Royle** (a wrong-artist hit
   altogether), and one work where **Leech is the SITTER, not the painter**. All three would
   have shipped. The identity discipline below is built on the holder gate, and the holder gate
   is exactly what this defeats — the holder is right in all three cases. **A surname is not an
   identity.** Anchor on a holder-issued accession or object id (the round-3 method), and where
   a search is the only door, check the *role*: artist-of, sitter-in and namesake-of all come
   back from the same query. ⚠ This is the sibling of the P195 gate's own recorded blind spot
   (163 NGA works correctly rejected as same-title-different-object) — same lesson one field
   over: **title and name are both just strings.**

11. **A HOLDER-ISSUED ID THAT POINTS AT THE WRONG OBJECT — and the holder gate PASSES it.**
   Wikidata **P9061** (MNW object id) on `battle-of-grunwald` resolves to a clean, live,
   MNW-owned catalogue record **for a Chinese bronze ritual vessel**; `stanczyk`'s P9061 404s.
   Trap 10 said "a surname is not an identity"; this is the same lesson wearing an **id**, and it
   is worse, because an id *looks* like the anchor the whole discipline asks for. The holder is
   correct, the id is live, the record is real, and the object is wrong. **Anchor on the
   inventory/accession number and then cross-check the returned record's OWN accession against
   it.** Any external-id property is a claim, not a key — same family as trap 4 (P6108 pointing
   at a non-manifest).
12. **A MEDIA API THAT REPORTS ITS OWN INDEX AS THE CEILING.** The Guggenheim's
   `wp-json/wp/v2/media/<id>` knows only the 1,280 px derivative for
   *Improvisation 28* — so round 4 closed it as "a 1,280 px web tier". The 4,075 px original was
   on disk the whole time, simply **unregistered**. A CMS's media table describes what the CMS
   was told about, not what the filesystem serves. **Probe the path, do not believe the index.**
13. **OUR OWN RECORD LYING ABOUT WHAT IT FETCHES.** `ng-london`'s `img` was
   `/full/!3000,3000/0/default.jpg` and delivered **800 px** — filename-as-dimension (trap 9),
   except we wrote it ourselves, and because `enrich()` feeds `hires.img` into `imgZoom` it
   quietly downgraded *Madonna of the Pinks*' Zoom overlay from the Commons 870 × 1,080 to
   643 × 800 **inside an adoption that was scored as a gain**. **A url that names a size is a
   request, never a receipt — and audit the fields an adoption REPLACES, not just the ones it
   adds.** Corollary: run the anti-downgrade gate against `max(art_imgsize, art_hires)` per axis
   (it caught `stanczyk` in round 6, inside an ADOPT list, for exactly this reason).
   **The class, stated so the next pass tests for it by name: an adoption can regress a work even
   when the source is genuinely larger, if the url we construct is not the url we measured.** The
   NG London master is real — 28,641 × 23,726, reachable, now reached. Nothing about the sourcing
   was wrong. The regression lived entirely in the gap between the file that was measured and the
   string that was written into the record, and no amount of care about the *holder* closes that
   gap; only re-decoding the final field does. **Closed 2026-08-25**: `img` now points at the
   Commons plate, `flat` carries the measured 800 × 662 / 643 × 800 ceiling beside the master
   dims, and the reader footer reads `Museum render ↗ 800×662` instead of promising 28,641.
   Rules now standing as a gate of their own — see *The anti-downgrade gate* below.

Also keep in mind the **flat-render downgrade** (Nationalmuseum's render caps at 1000px while
its pyramid reaches 11,016 — adopting the render as `img` silently downgrades works currently
at 2,800–4,300px; tile source only) and **Zoomify's silent failure** (no descriptor fetch, so
a CORS failure gives broken tiles with no `open-failed` event and therefore no fallback).

## ✅ ROUND 3 ADOPTED (2026-08-25) — 36 records: Micrio ×27, Art UK ×9

`art_hires.js` **1,099 → 1,108 entries**: 9 genuinely new Art UK rows, plus 27 existing Commons
rows upgraded in place. Net **+294 MP**, and — more to the point — 27 works that were flat JPEGs
now have a real tile pyramid.

### Micrio — 27 works, three holders, ONE service, no worker change

Van Gogh Museum **24**, Kröller-Müller **2**, Rijksmuseum **1** (*The Milkmaid*) all serve their
collections through **Micrio** (`iiif.micr.io`, IIIF Image API **3.0**, `profile: level2`,
tileSize 1024, scaleFactors 1/2/4/8, jpg+png+webp). One integration closes three holders — and it
retires the "Rijksmuseum is dead" line in the ledger below, which was true only of their *API*.

**`Access-Control-Allow-Origin: *` measured** with `Origin: https://fuad.au` on the descriptor, on
`/full/max/` and on a real 1024 tile. **No proxy alias, no worker change, no dashboard re-paste.**

**Identity is proven by the service, not by us.** For VGM and Kröller-Müller the `info.json`'s own
`title` field carries the **holder's inventory number** — `s0030V1962_gb_z.jpg` for *Harvest at La
Crau*, `KM 106.399` for *The Sower* — and `organisation.name` names the museum. Nothing here rests
on title similarity; the descriptor and Wikidata P217 agree character-for-character. Two stale
P217 values were caught this way and corrected against the object page (*Wheatfield with Crows*
`s0149V19558` → `s0149V1962`; *View of the Sea at Scheveningen* `s0416M1990` → `s0416N1990`).
⚠ **Rijksmuseum is the exception**: its Micrio titles are opaque GUIDs, so *The Milkmaid* is
anchored on the object-number URL (`/nl/collectie/SK-A-2344`) plus `og:image`, and that weaker
anchor is why only 1 of our 4 Rijksmuseum works was adoptable — see the three unanchored prints in
`.dtmp/tourqc-pass/hires-round3-tail.json` (`unanchoredWithinLiveHolders`).

**13 of the 24 VGM works are pixel-identical to the plate we already served, and were adopted
anyway. The win is tiles, not pixels** — a pyramid fetches small tiles for the visible region
instead of hauling one enormous file through a single WebGL texture. Five are real gains
(+82.8, +90.9, +23.0, +22.0, +21.3 MP); four are the same capture re-cropped and lose 19–28 px on
a single axis (≤0.1 MP, aspect ≤1.3%) — those **fail a strict per-axis `w/h ≥` test** and are
adopted on intent, flagged in each record's `note` rather than hidden.

⛔ **Two ids rejected as downgrades** and must not be re-proposed: VGM *Raising of Lazarus*
(4000×3059 vs our 7336×5611, −28.9 MP) and the Kröller-Müller Van Gogh self-portrait
(2800×3842 vs 4248×5808, −13.9 MP). Both keep their flat plate.

**Record shape.** `iiif` = the `info.json`; `full` = `/full/max/0/default.jpg` **written
explicitly**, because IIIF 3.0 has no `full` size and the reader footer's fallback guess
(`…/full/full/…`) would 400; `img` = **the Commons plate, unchanged**. That last one is
deliberate: `enrich()` feeds `hires.img` into `imgZoom`, which is what `open-failed` rebuilds on,
so a Micrio outage lands exactly where it landed before this batch. *Café Terrace at Night* also
keeps its `orig`/`pyr` Commons giga-file; note the reader footer labels an `orig` link with the
record's `w/h`, which are now the larger Micrio master (the same shape as the 17 NGA entries
already carrying `iiif` + `orig`).

New `src` codes: `vgm`, `kroller-muller`, `rijksmuseum`. ⚠ They are **not** in
`HIRES_SOURCE_LABEL` (canvas-app.jsx) yet, so the footer citation reads the generic
"Museum page ↗" — truthful, just unnamed. Same for `artuk`.

### Art UK — 9 floor-raisers, and a hard ceiling at `w1200h1200`

**Floor-raiser only, never where something better exists.** 73 canvas works under 1,200 px carry a
Wikidata **P1679**; all 73 resolved to a CloudFront asset; **53 were pixel-identical to what we
already serve** and 10 fell under the gain threshold, leaving **9**. Best is Turner *Margate Jetty*
at 300×424 → 835×1200 (×2.83). All 9 are aspect-safe (≤1.66%).

**The ceiling is exactly `/w1200h1200/`, and it is a FIT BOX, not a width.** Measured on
`ACNMW_ACNMW_NMWA5186-001.jpg`: `w1200h1200` → 200 (835×1200); `w1600h1600`, `w2000h2000`,
`w4000h4000`, `w1200`, `w2400`, `full`, `original` → **404, every one**. The derivatives are
pre-generated, not resized on demand — there is no parameter to push. Do not re-hunt for a bigger
Art UK file; there isn't one.

**Trap: never read the size off the page.** Art UK hero `<img>` tags are often `w944h944` or
`w800h800`. A first pass that grepped for `/w1200h1200/` declared 28 of 73 works image-less; all
28 in fact have a `w1200h1200` derivative that simply isn't linked. **Always request the size
prefix.**

**Identity is in the URL.** The path is
`<collectionCode>/<venueCode>/<COLL>_<VENUE>_<ACCESSION>-001.jpg`, so every asset carries the
holder's own accession; all 9 matched P217 character-for-character. ⚠ **A P1679 on a work held
outside the UK is a red flag, not an anchor** — Art UK indexes UK collections only, so
`leonardo-da-vinci-st-john-the-baptist`'s P1679 resolves to the *Ashmolean* WA1937.102, a
different picture from the Louvre panel. It failed the gain threshold anyway; the pattern is what
matters.

⚠ **`d3d00swyhr67nd.cloudfront.net` sends NO ACAO** (measured on both a 200 and a 404), and
`resolveOSDSource()` hands `hires.img` to OSD with `crossOriginPolicy: "Anonymous"` — so these need
the proxy. `IMG_PROXY` in canvas-app.jsx now maps it to **`https://img.fuad.au/artuk/`**;
`img-proxy.worker.js` is **not** edited here — the two lines Fuad pastes in the Cloudflare
dashboard are in `.dtmp/tourqc-pass/WORKER_ARTUK.local.md`. Until he pastes, the alias 404s,
`open-failed` fires and the viewer rebuilds on the **direct** url with `cors:false` (a plain image
load needs no CORS), so the degradation is benign and never worse than the pre-adoption plate.

### ⛔ Google Arts & Culture — CLOSED, and it is a downgrade engine

320 canvas works carry a **P4701**; all 110 that were ≤12 MP were swept, `og:image` resolved and
**measured**. Result: **90 of 110 are STRICTLY SMALLER than the plate we already serve**, 14 are
pixel-identical, 2 404, and exactly **1** gains ≥×1.5. Worst case *woman-with-a-parrot*: ours
4000×2691, theirs 1905×1264 — **×0.48**.

The reachable asset is a **fixed 1,200 px derivative** on `lh3.googleusercontent.com`; `=s0`,
`=s4000` and `=w4000` all return the *same bytes*, so there is one size and it cannot be pushed.
The 22 works above 1,200 px are all **Met** objects where GA&C is re-serving the Met's own
open-access file that we already hold — and the pixel-identical cases are the tell: several of our
Commons plates simply *are* the Google Art Project scans, absorbed years ago.

The gigapixel tile service is **not usable and not ours to point at**: the zoom tiles come from a
separate per-asset endpoint behind a client-generated token, and every third-party tool that reads
them works by reverse-engineering that token — which this project's rules forbid. Reported as
**unusable, not unexplored.** This is the Nationalmuseum 1000-px-render trap wearing a famous
brand: **any future GA&C look must compare against `art_imgsize` before it compares against
anything else.**

### Also declined this round

**Commons TIFF masters** (all 49 pixel-identical, and MediaWiki *upscales* TIFFs so a sweep logs
fake gains — see the trap at the top). **DDB Degas** — ×1.54 but **11.4 % aspect delta**, so it is
NEEDS REMAP, not adopt; low priority. **SMK** — ×1.22, under the bar.

Companion to [HIRES_GALLERY.md](HIRES_GALLERY.md) (the ranked results). This is the
methodology and the incident log: two days of sourcing (2026-08-22/23) that took the store
from **89 entries to 1,029**, and the surprisingly long list of ways a "just get the big
image" task can fail. Every rule below was paid for.

## The display hierarchy (what "high quality" actually means in a browser)

A browser cannot show arbitrarily large images. The working hierarchy, best first:

1. **IIIF tile pyramids** (museum-served) — unbounded zoom, tiles fetched per viewport.
   The only tech with no ceiling. 55+ works, almost all NGA.
2. **Embedded originals ≤ ~16k px** — a single JPEG loads whole and renders at full
   resolution. Most of the 12–50 MP tier. Ceiling: WebGL max texture size (~16,384 px;
   `INVALID_VALUE: texImage2D` beyond it — discovered live on Ginevra and the Van Goghs).
   Practical cap set at **12,800 px long side** (~140 MP decoded ≈ 0.5–1 GB RAM).
3. **Commons server renders** — for giga files (>12.8k), request a resized render.
   Discovered limit: **Wikimedia buckets thumb widths (1600→1920, 3200→3840) and
   hard-caps renders at 3,840 px wide.** Our "6000px plates" were silently serving 3,840
   all along. Giga works therefore display at 3,840 max, via a measured 2-level pyramid
   (1920 + 3840) for progressive first-paint.
4. **The archival original** — reader-footer **Ultra HQ ↗** + **⭳ save** links
   (`?download` makes Wikimedia send `Content-Disposition: attachment`). Browsers
   *display* giant files silently downsampled — a 1.57-gigapixel Starry Night in a tab
   shows ~3% of its pixels — so the link is honest as a file, not as a view.

Two in-viewer approaches were built and killed (do not rebuild): an OSD source-SWAP
button (texture ceiling + unreliable substitution) and an on-the-fly guessed-dims
pyramid (OSD legacy pyramids wobble unless declared level dims match the served files
pixel-perfectly — and Commons rounds its own way; only measured `pyr` levels render).

## Per-source ledger

| Source | Access | Yield | Fate / lesson |
|---|---|---|---|
| **NGA Washington** | fully open, keyless (opendata CSVs + api.nga.gov/iiif) | **98 holder-verified IIIF entries, up to 1,643 MP** (White Girl, both Vermeers, Laocoön…) | The jackpot. Quietly the most open major museum. 163 further title-matches correctly REJECTED by P195 holder check — NGA owns *different* works named "The Balcony", "The Gleaners" etc. **Adoption mode (Fuad 2026-08-23):** NGA_IIIF_CANDIDATES.md lists NGA works by canon artists that are *not yet* in the canon; picking from it adds a canon row + IIIF entry in one step. First run took all 23 Monets — 22 new (`seenAt: nga-dc`, `seenConfidence: unsure` since the gallery was visited but the individual works aren't recalled; 7 floored, 15 liked), the 23rd already held. Batches 2–5 (37 more, all **unseen → `wish: true`**) run through `.dtmp/nga-monet/resolve.py` + `ingest-pending.js`, which resolve requested titles against the opendata catalogue rather than the .md — the .md lists **paintings only**, so works on paper (two Boldini sheets) are invisible there. Two traps found: (a) NGA's own `openaccess=0` flag blocks the in-copyright moderns — Klee, Mondrian, Kandinsky and Gleizes are listed in the .md but cannot be adopted; (b) a work with no Wikidata item must carry `noResolve: true` + a hand `img`, because the title search hung **Bernini's marble** on Boldini's drawing after it. Every `src:"nga"` entry now carries `page`, the holder's object page, cited in the reader footer. |
| **Commons P18 originals** | open | **922 entries** (stage A) | Identity-safe by construction — the original of the file the site already shows. TIFF masters must never go in `img` (49 broke OSD); `img`=JPEG render, `orig`=TIFF. |
| **Wikipedia lead images** | open (`pageimages&piprop=original`, 11 wikis) | **38 verified + 20 upgrades** (stage B) | The articles sometimes use a better file than P18. 9 of 47 pair-verified candidates were WRONG: other casts (Rodin ×3), other autograph versions (Caravaggio Longhi, Canova Hermitage, Monet Pushkin), a crop, a wrong statue. Three of those became new *unseen* canon works instead. |
| **Met** | open API | 40 (tier 1) | Full-res simple images, no public IIIF. Stable. |
| **AIC Chicago** | was open | 7 → **0** | Their image server started returning 403 to everyone (even browser navigation) mid-arc. All 7 repointed to Commons. Re-adopt if their WAF reopens. |
| **Cleveland (CMA)** | open API | 5 Dürer prints | Their masters are TIFFs; the same prints ride NGA IIIF anyway. CMA TIFFs kept as Ultra HQ links. |
| **V&A** | keyless API + IIIF | 9 | Modest sizes (~1.9–5.4k) — tiled ≠ big. |
| **Harvard Art Museums** | key (.env) | 74 matches → **1 emit** | The great masquerade: title matches are mostly reproductive PRINTS and engravings filed under the painting's name (Goya's Capricho etching as "El sueño", engraved Piazza San Marco, an odalisque print vs the Matisse). Pair verification rejected 11 of 12 finalists. Sole survivor: Monet, Charing Cross Bridge (fog), 2550×2018. |
| **Europeana** | key (.env) | 126 matches → 0 emits | Same masquerade problem plus thin image metadata. |
| **Paris Musées** | key (.env), GraphQL | **1 emit** (Dinet, Femmes arabes à la promenade, 6807×5319, Petit Palais, open-content) | A saga: WAF blocks non-browser UAs; `title LIKE` queries 504 their gateway *every time* (a failed sweep looked like ~850 of the 1,000-call quota, though the dashboard later showed the quota unbilled); exact-title match is indexed and fast; image fields are `publicUrl` + `fieldImageLibre` (no dims served). Policy: **never bulk-sweep; spend calls surgically with exact French catalogue titles.** Homonyms abound (twelve "Ophélie"s — all Galliera costumes, none of them Steck's painting). |
| **Rijksmuseum** | API dead — but **Micrio IIIF is open** (2026-08-25) | **1 emit** (*The Milkmaid*, 4,000×4,485 → 4,649×5,177, +6.1 MP **and tiled**) | The old API is gone (HTTP 410) and the Rijksstudio key portal no longer exists — that closed the *API*, not the *images*. The whole collection is served through Micrio; anchor by loading `/nl/collectie/<objectNumber>` and reading `og:image`. ⚠ Unlike VGM/KMM, **Rijks Micrio `info.json` titles are opaque GUIDs** and carry no inventory number, so the descriptor cannot self-prove — 3 of our 4 Rijks works are high-impression prints (*Great Wave*, *Hundred Guilder Print*, *Claudius Civilis*) with no Rijks object number in P217 and were left unanchored rather than title-matched. |
| **Van Gogh Museum** | open, keyless — **Micrio** (`iiif.micr.io`, IIIF Image 3.0 level2), ACAO `*` | **24 emits** (5 real gains up to +90.9 MP; 13 pixel-identical, adopted for the pyramid) | Every object page embeds a Micrio id, and the `info.json` `title` is `<inventoryNumber>_<plate>.jpg` with `organisation.name = Van Gogh Museum` — **identity is self-proving from the descriptor.** Caught two stale P217s that way. 1 id rejected as a −28.9 MP downgrade (*Raising of Lazarus*); 4 more are re-crops losing ≤28 px on one axis, adopted with a flag. |
| **Kröller-Müller** | open, keyless — **Micrio**, same service as VGM | **2 emits** (*The Sower* +21.8 MP, *Café Terrace at Night* +20.0 MP, both tiled) | `info.json` title = the inventory number printed on the object page (KM 106.399 / KM 108.565). Their Van Gogh **self-portrait was rejected** at 2800×3842 against our 4248×5808 — a real pyramid whose master is smaller than ours. |
| **Art UK** | open pages, CloudFront assets, **no ACAO** | **9 emits**, floor-raiser only (best ×2.83) | Ceiling is exactly **`/w1200h1200/` as a fit box** — every larger parameter 404s, derivatives are pre-generated. Identity is in the asset filename (`<COLL>_<VENUE>_<ACCESSION>-001.jpg`), all 9 matched P217 exactly. Of 73 works swept, 53 were pixel-identical to what we already serve. ⚠ Needs the `img.fuad.au/artuk/` worker alias; a P1679 on a non-UK-held work points at a *different* object. |
| **Google Arts & Culture** | open pages, **fixed 1,200 px derivative** | 110 swept → **0 emits** | ⛔ **Closed as a downgrade engine.** 90 of 110 measured *strictly smaller* than our plate, 14 pixel-identical, 1 gain. `=s0`/`=s4000`/`=w4000` all return the same bytes — there is one size. The gigapixel tiles sit behind a client-generated token and Google's viewing-only terms: unusable, not unexplored. |
| **The Frick Collection** | opened 2026-08-25 (UA + `Accept` + `Accept-Language`); eMuseum + **IIIF Image 2.0 with no descriptor**, **no ACAO** | 17 measured → **0 emits** | ⛔ **Closed as a downgrade engine.** **Every zoom master is hard-capped at exactly 2000 px vertical** (widths 1280–3246, so 2.56–6.49 MP) against our plates at 24.94–45.55 MP: 17 of 17 lose, median **−25.28 MP**, worst *General John Burgoyne* **−42.35**. The 418 was a header wall, not an IP block (traps 5–6 were both paid for here). No hidden surface — six alternate size keys all return the byte-identical 800×694 default (trap 7). Tile pattern `…/zoomdispatcher/<mediaId>/{x},{y},{w},{h}/{tw},/0/default.jpg`; `info.json` **400s**, and because OpenLayers is handed an inline config there is no descriptor fetch and therefore **no `open-failed` and no fallback**. `frick` worker alias written but **DO NOT PASTE**. Re-open only if the Frick lifts the 2000 px cap. |
| **British Museum** | Cloudflare Turnstile (`cf-mitigated: challenge`) on the front door; object pages readable **via Wayback**; `media.britishmuseum.org` open but **broken cert chain**, no ACAO | 6 measured → **0 emits** | ⛔ **Closed as a downgrade engine.** Ladder is `preview_`/`mid_`/`large_`/`max_` (no bare, no `original_`/`full_`/`zoom_`); **`max_` caps at 2500 px long side, ~4–5 MP**, verified on three images, against our 13.5–51.7 MP — **−8.5 to −46.6 MP** on all six. **Headers cannot beat this wall** (full Chrome set with `sec-ch-ua`/`sec-fetch-*` still 403s) — do not retry the Frick trick. Corrects the round-3a note "`media.britishmuseum.org` does not resolve": it does; the failure was **TLS, not DNS** (trap 8), and that same broken chain would defeat a Worker proxy. |
| **New-York Historical** | **Cloudflare WAF hard block** on `emuseum.nyhistory.org` — 403 to every header set **and on the image paths** | 10 of 26 measured (Wayback) → **0 emits**, still walled | ⚠ **Parked, browser-only.** Not a challenge and not UA sniffing: "Attention Required!", 403 to Safari and full-Chrome sets, and 403 on `/internal/media/dispatcher/<id>/full` *and* `/preview`, so there is no asset-only door. `www.nyhistory.org` is 200 (subdomain-scoped rule); `digitalcollections.nyhistory.org` shares the **same Cloudflare IP** so it is behind the same rule; `iiif.nyhistory.org` NXDOMAIN. **Ledger correction against us:** the earlier "26 works at ×4" was optimistic — `r2/nyhs_dims.json` shows only **10 of 26** were ever measured, all via Wayback (the other **14 attempts were Wayback 404s**), and only **6** show the real ~×4 gain. **6 confirmed, 16 still need the live host.** Needs Fuad's own browser or a different egress IP. |
| **Getty / Yale / Brooklyn** | ❌ **this row was WRONG — corrected 2026-08-25 (round 5)** | 0 so far, **but two of the three are OPEN** | ~~Getty endpoints network-blocked; both Yale APIs dead/403~~ — **both measured open**: **Getty = IIIF 3 level2, `maxWidth 30000`**; **Yale YCBA = IIIF 2 level2, NO clamp, 27.2 MP sample.** Brooklyn stands (429s without a key). Neither Getty nor Yale has been swept for canon matches yet — they are **unexplored, not adopted**, and the reason they were ever closed did not exist. This is the ledger-cost lesson in its purest form: two of the most open image programmes in the world sat in this table as "blocked or down" for two rounds. |
| **SMK Copenhagen** | open API (recovered from 500s) | 1 match → 0 emits | Swept 21 Nordic canon works. Sole hit — *Interior. Artificial Light*, 118.8 MP — was a same-title different Hammershøi: canon Q18600052 is the Stockholm Nationalmuseum *Interior* (P195 Q842858), not SMK's. Holder gate rejection #21. |
| **Nasjonalmuseet Oslo** | ⚙ **corrected 2026-08-25 (round 5) — the image service IS reachable** | 0 emits yet | ~~All 8 plausible endpoint patterns dead (timeouts / NXDOMAIN). Their IIIF exists but has no discoverable search front door.~~ The *search* front door is still missing; the *images* are not. **The flat render clamps at 4000 px — but REGION requests serve native pixels**, off a master measured at **59,171 × 73,171**. ⚙ **Recorded with the wrong turn intact:** one agent measured the 4000 clamp on `/full/…`, reported Oslo as capped, and was corrected. **A clamp measured on `/full/` is not a clamp on the server** — re-measure by region before believing any ceiling in this table. |
| **Wikidata P6108/P4765** | open | 0 | No IIIF manifests exist for any canon work. The sweep's value was P18 dims + conflation discovery. |
| **Solomon R. Guggenheim** | open **nginx** (no Cloudflare), WordPress uploads, **NO ACAO** on any asset | **20 emits** (best ×4.54, 73.1 → 254.4 MP; 19 of 20 seen) | Round 6. Rule is **strip WP variant suffixes back to `<ACCESSION>_ph_web.jpg`** in the same `uploads/<YYYY>/<MM>/` — *not* "delete the trailing `-1`", which is the upload-collision counter and fails on 2 of 20. Ceiling is a **~4,096 px fit box**: `-scaled`, `-2048x1386`, `_ph.jpg`, `_ph_print.jpg`, bare accession all 404, `?w=8000` is byte-identical. Identity is the **accession in the filename**, matched to P217 (it kept Kandinsky 37.262 and Mondrian 49.1227 apart — two canon works with near-identical titles). Overturns the round-4 decline of *Improvisation 28*: the 1,280 px seen then was the WP-**registered** derivative; the disk has 4,075 × 2,758. Alias `img.fuad.au/gugg/` written to `.dtmp/tourqc-pass/w17/WORKER_GUGG.local.md`, **not pasted, and optional** (a CORS-failed `type:"image"` source is rebuilt direct with `cors:false`). 13 rejects: 8 aspect > 2 %, 3 anti-downgrade, 1 zero-gain, 2 unanchored. |
| **MNW Warsaw** | open, keyless — CDN path rewrite + `cyfrowe-api.mnw.art.pl`, **`ACAO: *` measured on all 48** | **48 emits, ~+620 MP** (best ×7.74; 21 previously plateless, 11 of those seen) | Round 6, the biggest single win in the arc. **`…/upload/cache/multimedia_big/<aa>/<bb>/<hash>.jpg` → `…/upload/multimedia/<aa>/<bb>/<hash>.jpg`**; the `_big` tier is a **1,024 px fit box** (trap 9 inside the word "big"). Exactly four rungs exist — invented tiers 404 honestly. **6000 is an ingest target, not a cap**: 15 masters at exactly 6000, 69 below, one at 6,620. Anchor via **P217 → `filter[inventoryNumber]`**, 85/85 exact; ⛔ **P9061 is NOT a safe anchor** — `battle-of-grunwald`'s resolves to a Chinese bronze vessel that the holder gate happily passes. `oai-pmh`/`oai` on the main host are the **Angular shell with a 200** (trap 3, twice); the real OAI is `cyfrowe-oaipmh.mnw.art.pl`, and was never needed. ⚠ 15 of 48 come back `application/octet-stream` + `nosniff`. 34 rejects (27 of them aspect > 2 %, and on 21 of those our plate is the crop), 15 unresolved. |
| **National Gallery, London** | open, keyless — **IIIF Image 3.0**, clamped at 800 on every flat render. ✅ **FIXED round 6 — the zoom now reaches the master** | **2 emits** (Rysselberghe *Coastal Scene* 28,641×23,726 = 680 MP; Raphael *Madonna of the Pinks* 6,909×8,585) — **reachable tile by tile only; any single file is 800 px** | ✅ **Round 6: `tile: 256` added to both rows, and it is the WHOLE win** — regions whose output size is ≤ 800 serve **native** pixels off the master (256-px tiles measured at 256 × 256), so the deep zoom went from **78.1 % of linear detail to 100 %**. There is **no bigger flat file at any spelling**, including the raw IIP `?FIF=…&WID=5000&CVT=jpeg` route — so this is *not* the Oslo case. New `flat` field records the measured 800-px ceiling so the footer stops labelling an 800 px link "Ultra HQ ↗ 28641×23726"; `img` repointed to the Commons plate (it was `/full/!3000,3000/`, an 800 px file under a 3000 px name, and it was downgrading *Madonna*'s Zoom overlay from 870×1,080 to 643×800). Viewer hunk: `.dtmp/tourqc-pass/w17/NG_PATCH.md`. ⚠ Both descriptors **already published `tiles: 256`** — our inline descriptor discarded the server's own advice. ⛔ **LIVE REGRESSION as diagnosed in round 5:** `maxWidth/maxHeight: 800`, clamped with a **200** not a 400, and `/full/max/`, `/full/full/` and `/full/3000,/` all return the **byte-identical 800 px file**. Because our inline descriptor omits `tiles`, OSD picks 1024 and every tile is served at 800 and upscaled — the deep zoom runs at **~78% of available detail** on two **toured** works. **Fix: declare `tiles: 256`.** Everything below this line is still true about the endpoint; it was never true about the delivered size. The discovery of the 2026-08-25 pass. Endpoint shape: `www.nationalgallery.org.uk/server.iip?IIIF=/fronts/<ACCESSION>-…-PYR.tif/info.json` — an IIPImage server, and the pyramid TIFF is **named by accession** (`N-6582-…` = NG6582), so identity is holder-owned, not title-matched. Two gotchas: (a) **no ACAO** — see the CORS note below; (b) it is IIIF **3**, where the Ultra-HQ size keyword is `max`, not the `full/full` the reader assumed for our IIIF-2 sources (hence the `full` override field). |
| **Nationalmuseum Stockholm** | open, keyless (`api.nationalmuseum.se/api/objects/<id>` → `iiif` field on iiifhosting.com, IIIF 2 **level1**). ⚠ **level1 = capped 1000 px, and `/full/max/` 400s here** (round 5; Smithsonian is the same shape — ask for a listed `sizes` value, not `max`) | **3 emits** (both Fjæstads, Rembrandt *Simeon in the Temple*) | Object-id lookup is perfect; **search is broken** — every `query`/`q`/`title`/`filter` param is ignored and returns the whole 208k-row corpus. Only usable when you already hold the object id, which Wikidata's *Nationalmuseum Sweden artwork ID* supplies. Records also carry `inventory_number` (NM 1628 / NM 1703 / NM 4567 — all three matched the canon notes exactly), dating, dimensions and an explicit `iiif_license`. Worth a corpus-wide Nordic sweep later. `page` currently points at the API record, not a human catalogue page — no public object-page URL pattern found. |
| **NGV Melbourne** | partial, keyless — **Zoomify**, not IIIF | **1 emit** (Rembrandt *Two Old Men Disputing*, 4,105×5,000 from a 498×600 plate) | No JSON API, no IIIF (`api.`/`iiif.` subdomains NXDOMAIN). The object page `/explore/collection/work/<vernonID>/` inlines `imgWidth`/`imgHeight` and a Zoomify base under `content.ngv.vic.gov.au/col-images/zooms/<imgid>/`, driven by OpenLayers; `ImageProperties.xml` confirms it. `retrieve.php?size=xl` is only 694×845, so the **pyramid is the whole prize**. Cost of adoption: a third tile flavour in the viewer (see below). |
| **Centre Pompidou / MNAM** | partial, keyless — **DeepZoom (.dzi)** | **2 emits** (Matisse *Auguste Pellerin II*, *Tête blanche et rose*) | `api.centrepompidou.fr` does not resolve; object pages do, and inline `/media/picture/<hash>/dzi/uhd.dzi`. Hard-capped at **4,000 px long side** — a fixed "uhd" render tier, not the archival master — but still ×4 linear on works that were 1,000 px uploader-capped. **No ACAO.** Wikidata's Centre Pompidou IDs go stale (`5dq7dfI` 404s), so verify the id resolves before adopting; one candidate was dropped for exactly this. Rights: Matisse d. 1954 → French PD from 2025-01-01. |
| **AGSA / Whitney** | partial, keyless — plain JPEG keyed by the holder's object id | **2 emits** (Pissarro *Prairie à Éragny* 3,543×2,849; Stettheimer *New York/Liberty* 1,537×2,048) | Not sweepable — one asset per object page — but identity is safe because the asset path carries the object id (`/assets/artwork/47209/`, AGSA work 27081). Whitney's ceiling is 2,048 px and its filename says `_cropped`; adopted at `conf: "med"` on the strength of a 0.07 % aspect match with the current plate, which a real crop could not produce. |
| **Belvedere** | open, keyless (eMuseum JSON + IIIF Presentation v2 + Image v2 level2) | 1 candidate → **0 emits** | Works fine technically — object-id lookup only, and the manifest carries 8 canvases (raking light, details) so the canvas must be picked deliberately. Rejected on aspect, not access: see the ledger below. |

## The anti-downgrade gate (binding — state of the rule, 2026-08-25)

Identity is not the only thing a gate has to protect. Three rules, each written because it was
broken inside an **ADOPT** list, not in theory:

1. **Compare against `max(art_imgsize, art_hires)` PER AXIS — never against the plate alone.**
   `art_imgsize` records the Commons plate; `art_hires` records what we actually serve. Scoring a
   candidate against the plate answers a question nobody asked. `stanczyk` scored **×1.85** and
   sat in an adopt list on that arithmetic: candidate 5,759 × 4,277 against `art_imgsize`
   3,118 × 2,313. Against the `art_hires` row we serve — **5,766 × 4,289** — it is smaller on
   **both** axes. Per-axis matters as much as which source: an area or long-edge comparison will
   wave through a candidate that is wider and shorter, which is a downgrade on the axis a reader
   is zoomed into.
2. **Score the URL you will WRITE, not a URL you merely measured.** These come apart whenever the
   adopted url is constructed rather than copied — a size-bearing IIIF path, a template, a tier
   name. `ng-london` is the case: a genuinely larger source, correctly measured, and the `img` we
   then wrote (`/full/!3000,3000/`) returned 800 px. **An adoption can regress a work even when
   the source is genuinely larger, if the url we construct is not the url we measured.** Re-fetch
   and re-decode the final string, after it is written, from the record.
3. **Audit the fields an adoption REPLACES, not only the ones it adds.** The gate is usually
   pointed at `w`/`h`; the damage on `ng-london` was to `img`, which `enrich()` feeds to
   `imgZoom`, so the plain Zoom overlay lost *Madonna of the Pinks* from Commons **870 × 1,080**
   to **643 × 800** while the row's headline numbers looked like a win. Every field an adoption
   overwrites is its own possible downgrade.

⚠ And a no-op is not a win: a flat JPEG at ×1.002 (`eugeniusz-wrzeszcz…`) or pixel-identical
(`jewess-with-oranges`) buys nothing. **This is not the Micrio case — there is no pyramid behind
a flat file**, so gain-in-pixels is the entire value on offer. Drop it.

## The identity discipline (why the gates exist)

Everything not identity-safe by construction goes through two gates:

1. **Holder verification** — the canon work's Wikidata P195 must list the matching
   museum. Kills same-title-different-work matches wholesale (163 at NGA alone).
2. **Pair-sheet visual verification** — side-by-side current-vs-candidate thumbs judged
   by an agent briefed on the trap taxonomy. The taxonomy, as actually encountered:
   - reproductive **prints/engravings** filed under the painting's title (the #1 killer)
   - multiple **autograph versions** (Boy Bitten ×2, Canova ×2, Grenouillère ×2, Déjeuner)
   - **sculpture casts** — every cast is a different photographed object
   - **crops / gallery photos** of the same canvas (the Boccioni "portrait" crop)
   - **accession-year-as-inception** on Wikidata (van der Velden "1975")
   - **conflated qids** — one entity fusing two works (L'Été: Berlin labels + Copenhagen
     collection; Boccioni's mother-portrait; Turner Saint-Maurice claiming oil at the
     Musée de l'Armée for a Tate watercolour)
   - **serial-motif false positives** — visual verification itself fails on artists who
     painted the same motif many times in the same palette: a verifier passed NGA's
     path-to-Château-Noir as Fuad's *Rocks near the caves above Château Noir* (caught by
     the owner, reverted b2ec0bd). For Cézanne Sainte-Victoire/Château Noir, Sisley's
     Loing views and kin, similarity is NOT evidence — require a positive inventory-level
     match or the owner's eye, and default to REJECT

Score to date: the gates rejected **20 wrong objects** that title/qid matching alone
would have shipped into canon.

## The Tate cluster — CLOSED, no emits (Fuad 2026-08-23)

Verdict by owner's eye on a Norham Castle pair: **Tate's own render is not better** than the
existing Commons scans, and their public ceiling is 1,536 px anyway (`_10`; no IIIF at all —
iiif.tate.org.uk NXDOMAIN, artwork pages serve only 420–600 px wagtail thumbs, zero zoom tech).
Do not revisit unless Tate ships a real image service. Original scoping notes kept below.

## Original scoping (superseded)

The single richest remaining vein is **Tate**: a large block of floored Turners (Norham
Castle Sunrise, Queen Mab's Cave, the Deluge pair, the late sunrise/seascape group…) plus
Constables sit at 800–1,540 px — postcard resolution for exactly the works that would repay
zoom most. Tate's public site serves ~1,600 px renders; the job is to find whether their
IIIF (used by their own viewer) or Art UK routes expose more, and substitute wholesale.
Overall census (2026-08-23): 172 floored works have no IIIF, ~45 of them under 1,600 px;
worst offenders Boldini *Scena galante* 294 px, *Female Figure* 364 px, van der Velden
*Stormcloud* 480 px, two ~500 px *Water-Lilies* studies, Renoir *On the Shore of the
Seine* 574 px. Among liked works the Sisley Loing group and several Boldinis are 280–300 px
thumbs. Census script: `../../.sptmp/lowres-census.py`.

## The toured-plates pass (2026-08-25) — 51 works, 10 adopted, 38 closed

Scope: the **51 toured works whose Study deep-zoom was still falling back to the ~900 px canon
plate** and whose native Commons file is under 1,600 px. Sheet:
`.dtmp/tourqc-pass/iiif-candidates.json`.

The method that made this pass work where the previous one failed: **never resolve by title.**
Holder comes from `art_data.js` `collectionQids`/`locationQid` (P195) — *not* from `seenAt`, which
records where Fuad stood and is often an exhibition loan (both Fjæstads, all three Matisses).
Object ids then came from a single Wikidata SPARQL over every ExternalId-typed property on the 51
qids, so each candidate hangs off a **holder-issued id** (NG accession, NGV vernon id,
Nationalmuseum object id, Pompidou oeuvre id, AGSA/Whitney work id). Finally each candidate's
aspect ratio was compared with the current plate: **≤2 % delta means the existing tour box
coordinates stay valid**, which is the whole reason a work can be re-plated at all.

### Two new tile flavours in the viewer

The chain in `canvas-app.jsx` `resolveOSDSource()` previously branched only on `hires.iiif`. It now
carries four tiled branches; both new ones are OSD built-ins, so this is configuration, not code:

- **Zoomify** (`hires.zoomify`) — `{ type: "zoomifytileservice", tilesUrl, width, height }`. OSD
  computes the grid itself and there is **no metadata fetch**, which also means a Zoomify tile
  failure does *not* raise `open-failed` and therefore has **no automatic fallback** — it shows as
  broken tiles. Eyeball NGV first if anything looks wrong.
- **DeepZoom** (`hires.dzi`) — the `.dzi` URL passed straight through as a tileSource. OSD derives
  `<name>_files/<level>/<x>_<y>.<fmt>` from **the URL it fetched**, so proxying the descriptor
  proxies the tiles for free.

Both get a `HIRES_SOURCE_LABEL` entry, so the reader footer still names the holder that serves
the tiles rather than falling back to a generic "Museum page".

### The IIIF-CORS trap (paid for on National Gallery London)

NG London and Centre Pompidou send no `Access-Control-Allow-Origin`, and OSD reads IIIF `info.json`
and DZI descriptors by **XHR** — which CORS blocks outright. Routing them through the img.fuad.au
worker is the fix, but for IIIF **proxying the info.json url is not enough**:

> `IIIFTileSource` sets `this._id = this["@id"] || this.id || this.identifier` — the tile base comes
> out of the **response body**, not the URL that was fetched. Proxy only the info.json and every
> tile still goes to the direct host, still blocked.

So CORS-less IIIF sources carry `hires.iiifId` (the service base, no `/info.json`) and the viewer
hands OSD an **inline descriptor** with that base already proxied — no round-trip, tiles proxied by
construction. It must include `protocol: "http://iiif.io/api/image"`, because
`IIIFTileSource.supports()` does not recognise a bare IIIF 3 `@context`. `tiles`/`sizes` are
deliberately omitted: OSD then picks a 1024 tile and asks for arbitrary regions, which any level2
server honours — better than guessing someone else's pyramid grid (cf. the Commons legacy-pyramid
lesson: declared dims that miss by a pixel make OSD wobble).

⛔ **THE OMISSION HAS AN EXCEPTION, AND IT COST US NG LONDON (found round 5, 2026-08-25).** "Any
level2 server honours an arbitrary region" is true only where the server declares no size clamp.
NG London declares **`maxWidth`/`maxHeight` 800** and enforces it with a **200, not a 400** — so
OSD's 1024-px tile requests come back at 800 and get **upscaled, silently, on two toured works**
(~78% of available detail). **Read the descriptor's `maxWidth`/`maxHeight` BEFORE omitting
`tiles`. Where a clamp exists, declare a tile size at or under it — `tiles: 256` for NG London.**
Omission stays correct for the unclamped sources (Pompidou DZI needs none of this at all).
✅ **SHIPPED round 6 (2026-08-25)**: `resolveOSDSource()` now emits `ts.tiles` whenever the record
carries `hires.tile`, deriving `scaleFactors` from `w`/`h`/`tile` — verified against both NG
descriptors' own published lists, which it reproduces exactly. Records without `hires.tile` take
the unchanged path, so Micrio, NGA, Pompidou and the rest cannot regress. ⚠ **Both NG descriptors
had been publishing `tiles: [{width: 256, …}]` the whole time** — the inline descriptor discarded
the server's own advice. When you override a server's metadata, you own every field you drop.

DZI needs none of that — proxy the descriptor and you are done.

~~Worker aliases `nglondon` and `pompidou` must be added by hand in the Cloudflare dashboard~~
(`.dtmp/tourqc-pass/WORKER_CHANGES.local.md`). **WRONG NAMES, AND THAT IS THE POINT — the
deployed aliases are `ngl` and `cpom`, and both are live.** This sentence is left struck rather
than deleted because the mismatch it records is the whole trap: an agent wrote `/nglondon/`
against a deployed `ngl`, the worker answered its 16-byte `unknown upstream` 404, `open-failed`
fired, the viewer fell back to the low-res plate, and **nothing anywhere reported an error** — a
679-megapixel scan lost to a typo that looked like normal operation. **The alias in `IMG_PROXY`
must match the deployed `UPSTREAM` key character for character, and the only proof is a live
probe** (200 + `access-control-allow-origin: *` through the alias, versus the 16-byte 404 a
bogus alias returns). Never a reading of a note like this one. Until an alias is pasted the
degradation is benign — `open-failed` fires and `useOSDViewer`'s `fallbackUrl` retry drops to the
canon plate, never worse than before — which is exactly why it goes unnoticed. Per the standing
rule every proxied URL here is paired with that direct fallback.

### Adopted — 10

| Work | Source | Tech | Was → now | Linear gain |
|---|---|---|---|---|
| Rysselberghe, *Coastal Scene* | ng-london | IIIF 3 (proxied) | ~~800×665 → 28,641×23,726~~ ~~**→ 800×662 as delivered**~~ ✅ **28,641×23,726 in the zoom, round 6** | ~~×35.8~~ ~~**×1.0**~~ ✅ **×35.8, tile by tile** |
| Raphael, *Madonna of the Pinks* | ng-london | IIIF 3 (proxied) | ~~870×1,080 → 6,909×8,585~~ ~~**→ 800 px long side as delivered**~~ ✅ **6,909×8,585 in the zoom, round 6** | ~~×7.9~~ ~~**<×1**~~ ✅ **×7.9, tile by tile** |
| Rembrandt, *Two Old Men Disputing* | ngv | **Zoomify** | 498×600 → 4,105×5,000 | ×8.2 |
| Pissarro, *Prairie à Éragny* | agsa | JPEG | 796×640 → 3,543×2,849 | ×4.5 |
| Fjæstad, *Winter Moonlight* | nationalmuseum-se | IIIF 2 | 1,000×810 → 3,791×3,070 | ×3.8 |
| Fjæstad, *Winter Evening by a River* | nationalmuseum-se | IIIF 2 | 1,000×813 → 3,531×2,869 | ×3.5 |
| Matisse, *Auguste Pellerin II* | centre-pompidou | **DZI** (proxied) | 643×1,000 → 2,573×4,000 | ×4.0 |
| Matisse, *Tête blanche et rose* | centre-pompidou | **DZI** (proxied) | 609×1,000 → 2,436×4,000 | ×4.0 |
| Rembrandt, *Simeon in the Temple* | nationalmuseum-se | IIIF 2 | 1,000×1,228 → 2,828×3,513 | ×2.8 |
| Stettheimer, *New York/Liberty* | whitney | JPEG | 600×800 → 1,537×2,048 | ×2.6 |

⛔ **The two `ng-london` rows are struck above: round 5 measured what the server actually
delivers.** The master dimensions in the store are real and the Ultra HQ footer link is honest;
the **viewer** was getting 800 px and upscaling it. The other eight rows are unaffected — but the
lesson generalises and is why the round-5 census was re-run: **an adopted row records what we
asked for, not what arrives.** Re-measure delivery, not metadata.

### Verified but NOT adopted — 3

- **Klimt, *Water Serpents I*** (`the-hydra`, Belvedere object 3828, IIIF v2 level2, 1,512×3,508).
  The one **aspect MISMATCH in the sheet: 7.62 %** — the Belvedere plate includes the parchment
  margin the canon plate crops away. Adopting it would silently invalidate that tour's box
  coordinates, which is the one thing this pass exists to protect. Recorded here as a candidate,
  not emitted. It only buys ×1.9 anyway. Re-open **only** together with a re-anchor of the tour
  boxes against the new framing.
- **Kandinsky, *Improvisation 28 (second version)*** (Guggenheim 1861). Accession-keyed and clean,
  but it is a 1,280 px web-tier JPEG — **×1.4 linear**, below the threshold where a re-plate is
  worth the churn. Skipped.
- **Matisse, *Porte-fenêtre à Collioure*** (Centre Pompidou). The weakest identity link in the
  sheet: Wikidata's Pompidou ID `5dq7dfI` is **stale (404)** and the candidate `cxzdLX` was
  re-resolved by exact French catalogue title — the one title-resolved row in an otherwise
  id-anchored set. Its two sibling Matisses both carry live Wikidata Pompidou IDs and were adopted;
  this one is held back until the id is re-verified against the holder's own catalogue.

### Closed out — 38 works, do not re-hunt

Recorded so this ground is never walked again. Verdict for all: *holder has no reachable image
service.*

- **Musée Marmottan Monet — 17 (the single largest block, and the hardest closed).** No API, no
  IIIF, no open-image programme, and Wikidata carries **no external museum ID for any of the 17**
  (14 have no external identifier of any kind) — there is no id to anchor on even if a service
  appeared. Works: *Diogenes* (Bastien-Lepage); Morisot *Bergère couchée*, *Au bal*, *Julie Manet
  and her Greyhound Laertes*, *Autoportrait*, *Eugène Manet et sa fille dans le jardin de
  Bougival*; Monet *Nymphéas effect in the evening*, *Vetheuil in the Fog*, *Nymphéas*, *Walk near
  Argenteuil*, *Saule pleureur et bassin aux nymphéas*, *The Tuileries (Study)*, *Water-Lilies*,
  *Water-Lilies Reflection of a Weeping Willow*, *The Water-Lily Pond*, *Train in the Snow*;
  Caillebotte *White and yellow chrysanthemums*.
- **MoMA — all 4.** `moma.org` returns Cloudflare 403 to non-browser clients; their open collection
  data on GitHub is metadata only, no images; and all four are in copyright regardless. Works:
  Hopper *New York Movie*, Klee *Mask of Fear*, Boccioni *States of Mind I: The Farewells*, Gorky
  *Diary of a Seducer*.
- **Tate — 2** (Turner *A Wreck, with Fishing Boats*; *Venetian Scene*). Already closed by owner
  ruling above; listed again so the census does not resurrect them.
- **Musée d'Orsay — 2** (Monet *Houses of Parliament, Sunlight Opening in Fog*; *Le Déjeuner sur
  l'herbe*). ~~Cloudflare 403 to every programmatic client. Orsay ids **are** in Wikidata (1177,
  25651) — **parked, not dead**: a human browser could finish this in minutes.~~
  ⛔ **BOTH HALVES OF THAT WERE WRONG — closed 2026-08-25 (round 5), and it is now DEAD, not
  parked.** The 403 was **`www.musee-orsay.fr`**, a different machine. **`iiif.musee-orsay.fr`
  is wide open** — IIIF 3 level2, `ACAO: *`, no headers, no proxy. And a mid-session claim that
  it opens **5,235 works** is equally wrong in the other direction: **every master caps at
  850 px**, verified across **4 objects / 29 canvases**. We hold **150–176 Orsay works** and it
  would downgrade all of them. **Do not re-hunt Orsay, and do not send a browser at it.**
- **Kunstmuseum Basel — 2** (Corinth *Blumen und Tochter Wilhelmine*; Wutky *Versuv-Ausbruch*).
  Next.js SPA serving the same 43 KB shell for every path; no `/api/`, no eMuseumPlus passthrough,
  no IIIF string anywhere. Wikidata has the Basel id (1541 for the Corinth) — browser-only.
- **Holder unknown — 2** (Boldini *Symphony in gray*; Caillebotte *Boulevard Haussmann, effet de
  neige*). No collection in `art_data`/`art_holders`, no external ID — we cannot even name a museum
  to ask.
- **One each:** Tel Aviv Museum of Art (Degas *Two Dancers*) — no API, search 404s. Musée Rodin
  (Sargent *Auguste Rodin*) — no API/IIIF/open-image programme. Joslyn (Redon *Fantasia*) — JSON
  endpoint 401s. Artizon (Caillebotte *Young Man Playing the Piano*) — no public API. Glasgow
  Museums (Díaz *Flower Piece*) — only external id is Art UK, licence-capped at ~800 px.
  Pinakothek (Corinth *Der rote Christus*) — both URL shapes from the Wikidata id 404, images are
  bpk-licensed.
- **Blocked rather than absent — 3** (worth one browser visit if ever bored, but not a re-hunt):
  National Gallery of Ireland (Goya *El Sueño*) — object page 4684 is the right object but ships
  zero image URLs (client-rendered eMuseum) and `/json` 404s; **this one hurts, 604×350 is among
  the worst plates in the canon.** ⚙ **Anatomy added 2026-08-25 (round 5), and one thing
  corrected: NGI IIIF HAS NEVER WORKED FOR US** — anything reading otherwise is wrong. It is
  **the Frick anatomy exactly**: descriptor-less IIIF, `info.json` **400s**, region syntax
  works, **ceiling 3000**, **no ACAO**. So it needs an inline descriptor *and* a proxy alias
  before a single pixel is adoptable, and 3000 px is the most it will ever give. The "ships zero
  image URLs" note above described the **page**; it never described the image service, and the
  two must not be conflated again. ⚠ NGI is also where **trap 10** was paid for — a "Leech"
  search returned three holder-verified, cleanly-measured objects and **not one of them was the
  work**. NGA Canberra (Munch *Man with Horse*) — Angular app, every
  `/stcapi/` path 500s. Museum Ludwig (Kirchner *Five Women on the Street*) — a proof-of-work
  interstitial on every programmatic request; blocked by anti-bot, not by policy.

**Signal worth keeping:** 19 of the 51 sit at *exactly* 1,000 or 1,500 px on one side. That is an
uploader cap, not a small painting — those Commons files arrived already downsized — and it
correctly predicted where an upstream master existed. Every Nationalmuseum and Pompidou win in
this pass is one of the 19. So are 12 Marmottans, which is precisely where no upstream exists.

## Regeneration pointers

Workshops live outside the repo (`../../.sptmp/canvas-hires*/`): tier sweeps, dims
backfills (`backfill-dims.py` — IIIF info.json + ranged JPEG-header parsing),
`emit-pyramids.py` (measured `pyr` levels), pair-sheet builders. art_hires.js is
canonical compact format — one JSON line per entry; keep it that way, mixed formats
needed three manual repair passes. The wall's Quality chips read `w/h` client-side
(150/50/12/3/1 MP tiers + the `tiled · IIIF` tag).
