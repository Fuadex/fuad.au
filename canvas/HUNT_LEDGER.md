> Part of the fuad.au docs — start at [/GUIDE.md](/GUIDE.md)

# HUNT_LEDGER — per-work hi-res hunt history

**What this is.** One line per work, one section per verdict class. Grep by slug to learn
everything this project knows about a work's image hunt history before starting another one.

**What this is NOT.** It is not the story of the sourcing arc. The narrative — the rounds,
the trap taxonomy, the rulings, the side doors — lives in [`HIRES_SOURCING.md`](HIRES_SOURCING.md).
Per-work text errors and plate decisions live in [`WORKS_LEDGER.md`](WORKS_LEDGER.md). **This
file is a tally: cheap to update, cheap to scan.** If you find yourself writing a paragraph, it
belongs in HIRES_SOURCING.md and this file gets the one-line residue plus a round reference.

## How to use it

- **Grep by slug first.** Every row is keyed on the canon slug exactly as it appears in `artworks.js`.
  `grep -n '<slug>' canvas/HUNT_LEDGER.md` tells you whether this work was ever properly hunted.
- **Check §1 before hunting.** If a slug appears in §1, the dead end is recorded — don't re-walk it.
- **Check §3 before adopting.** Named traps prevent re-shipping a known regression.
- **⚠ marks a field taken from a working sheet** rather than verified against the live store.

---

## §1 HUNTED, NO RESULT — closed out, do not re-hunt

Works searched in the toured-plates pass (`HIRES_SOURCING.md` §"The toured-plates pass") or in
a named round, with a confirmed negative result. The 51-work IIIF hunt (`.dtmp/tourqc-pass/iiif-candidates.json`)
closed out 38 of the 51 as "holder has no reachable image service."

| slug | best MP ⚠ | where looked | when | why closed | round ref |
|---|---|---|---|---|---|
| `jean-baptiste-camille-corot-diogenes` ⚠ | — | Musée Marmottan Monet | 2026-08-25 | No API, no IIIF, no open-image programme; Wikidata carries no external museum ID — no anchor even if a service appeared | toured-plates pass |
| `berthe-morisot-bergere-couchee` ⚠ | — | Musée Marmottan Monet | 2026-08-25 | Same as above | toured-plates pass |
| `berthe-morisot-au-bal` ⚠ | — | Musée Marmottan Monet | 2026-08-25 | Same as above | toured-plates pass |
| `berthe-morisot-julie-manet-and-her-greyhound-laertes` ⚠ | — | Musée Marmottan Monet | 2026-08-25 | Same as above | toured-plates pass |
| `autoportrait` ⚠ | — | Musée Marmottan Monet | 2026-08-25 | Same as above | toured-plates pass |
| `berthe-morisot-eugene-manet-et-sa-fille-dans-le-jardin-de-bou` ⚠ | — | Musée Marmottan Monet | 2026-08-25 | Same as above | toured-plates pass |
| `nympheas-effect-in-the-evening` ⚠ | — | Musée Marmottan Monet | 2026-08-25 | Marmottan block — 17-work closed block | toured-plates pass |
| `vetheuil-in-the-fog` | 0.107 MP | Musée Marmottan Monet | 2026-08-25 | No API, no IIIF, no open-image programme; Wikidata carries no external museum ID | toured-plates pass |
| `nympheas` ⚠ | — | Musée Marmottan Monet | 2026-08-25 | Marmottan block | toured-plates pass |
| `walk-near-argenteuil` ⚠ | — | Musée Marmottan Monet | 2026-08-25 | Marmottan block | toured-plates pass |
| `saule-pleureur-et-bassin-aux-nympheas` ⚠ | — | Musée Marmottan Monet | 2026-08-25 | Marmottan block | toured-plates pass |
| `the-tuileries-study` ⚠ | — | Musée Marmottan Monet | 2026-08-25 | Marmottan block | toured-plates pass |
| `water-lilies` | 0.225 MP | Musée Marmottan Monet | 2026-08-25 | Marmottan block | toured-plates pass |
| `water-lilies-reflection-of-a-weeping-willow` ⚠ | — | Musée Marmottan Monet | 2026-08-25 | Marmottan block | toured-plates pass |
| `the-water-lily-pond` ⚠ | — | Musée Marmottan Monet | 2026-08-25 | Marmottan block | toured-plates pass |
| `claude-monet-train-in-the-snow` ⚠ | — | Musée Marmottan Monet | 2026-08-25 | Marmottan block | toured-plates pass |
| `white-and-yellow-chrysanthemums` ⚠ | — | Musée Marmottan Monet | 2026-08-25 | Marmottan block | toured-plates pass |
| `edward-hopper-new-york-movie` ⚠ | — | MoMA | 2026-08-25 | Cloudflare 403 to non-browser; open collection data (GitHub) is metadata only; in-copyright | toured-plates pass |
| `klee-mask-of-fear` ⚠ | — | MoMA | 2026-08-25 | Same MoMA block; in-copyright | toured-plates pass |
| `boccioni-states-of-mind-i-the-farewells` ⚠ | — | MoMA | 2026-08-25 | Same MoMA block; in-copyright | toured-plates pass |
| `arshile-gorky-diary-of-a-seducer` ⚠ | — | MoMA | 2026-08-25 | Same MoMA block; in-copyright | toured-plates pass |
| `a-wreck-with-fishing-boats` ⚠ | — | Tate | 2026-08-25 | Tate ceiling 1,536 px, no IIIF (`iiif.tate.org.uk` NXDOMAIN); owner ruling: not better than existing Commons scans | toured-plates pass |
| `venetian-scene` ⚠ | — | Tate | 2026-08-25 | Same Tate ruling | toured-plates pass |
| `london-the-houses-of-parliament-sunlight-opening-in-fog` ⚠ | — | Musée d'Orsay | 2026-08-25 | `iiif.musee-orsay.fr` open IIIF 3 level2 but every master caps at **850 px** — adopting would downgrade. Do not re-hunt Orsay | toured-plates pass |
| `claude-monet-le-dejeuner-sur-l-herbe` ⚠ | — | Musée d'Orsay | 2026-08-25 | Same Orsay ruling — 850 px ceiling | toured-plates pass |
| `blumen-und-tochter-wilhelmine` ⚠ | — | Kunstmuseum Basel | 2026-08-25 | Next.js SPA, no `/api/`, no eMuseumPlus, no IIIF; Wikidata id 1541 present — browser-only | toured-plates pass |
| `vesuv-ausbruch` ⚠ | — | Kunstmuseum Basel | 2026-08-25 | Same Basel block | toured-plates pass |
| `giovanni-boldini-symphony-in-gray` ⚠ | — | Holder unknown | 2026-08-25 | No collection in art_data/art_holders, no external ID — cannot name a museum to ask | toured-plates pass |
| `caillebotte-boulevard-haussmann-effet-de-neige` ⚠ | — | Holder unknown | 2026-08-25 | Same — no identifiable holder | toured-plates pass |
| `edgar-degas-two-dancers` ⚠ | — | Tel Aviv Museum of Art | 2026-08-25 | No API; search 404s | toured-plates pass |
| `sargent-auguste-rodin` ⚠ | — | Musée Rodin | 2026-08-25 | No API, no IIIF, no open-image programme | toured-plates pass |
| `odilon-redon-fantasia` ⚠ | — | Joslyn Art Museum | 2026-08-25 | JSON endpoint 401s | toured-plates pass |
| `young-man-playing-the-piano` ⚠ | — | Artizon | 2026-08-25 | No public API | toured-plates pass |
| `diaz-flower-piece` ⚠ | — | Glasgow Museums | 2026-08-25 | Only external id is Art UK, licence-capped at ~800 px | toured-plates pass |
| `der-rote-christus` ⚠ | — | Alte Pinakothek | 2026-08-25 | Both URL shapes from Wikidata id 404; bpk-licensed | toured-plates pass |
| `el-sueno` | 0.211 MP | National Gallery of Ireland | 2026-08-25 | NGI eMuseum: descriptor-less IIIF (info.json 400s), no ACAO, ceiling 3000 px — needs inline descriptor + proxy alias. ⛔ **Trap 10 paid here** (Leech search returned 3 wrong objects all passing holder gate). Browser visit + proxy alias could reach 3000 px. **Named worst-plate candidate** | toured-plates pass / round 5 |
| `munch-man-with-horse` ⚠ | — | NGA Canberra | 2026-08-25 | Angular app, every `/stcapi/` path 500s | toured-plates pass |
| `kirchner-five-women-on-the-street` ⚠ | — | Museum Ludwig | 2026-08-25 | Proof-of-work interstitial on every programmatic request; anti-bot, not policy | toured-plates pass |
| `camille-pissarro-route-de-versailles-louveciennes-rain-effec` | ~17.8 MP ⚠ | Clark Art Institute | 2026-08-25 | `clarkart.edu` open (no CF challenge — prior note was false); no IIIF on either side; `media.clarkart.edu/hires/1955.825.tif` byte-identical to the Commons file we serve. Gain: ×1.00. **Do not re-hunt** | round 7 (WORKS_LEDGER §1) |
| `jan-both-tradstudie` | 18.1 MP ⚠ | Nationalmuseum Stockholm | 2026-08-25 | NM IIIF measured; NM's 3,822×3,278 is smaller than our 18.1 MP plate — do not adopt. Identity settled: same painting (matching foxing + fold). | round 7 (WORKS_LEDGER §1) |

---

## §2 STILL LOW-RES, NEVER PROPERLY HUNTED — candidates for next campaign

Works under 1 MP (or lacking a proper hunt record) sorted: toured works first by MP ascending,
then liked/floored by MP ascending. Flags: **T**=toured, **L**=liked, **F**=floored.

⭐ **SEED ROWS** — Fuad named these specifically:

| slug | best MP | dims | flags | any lead |
|---|---|---|---|---|
| `anders-zorn-nude-woman-combing-her-hair` | 0.484 MP | 569×850 (imgsize) | L | No art_hires row. qid Q133861172. NM Stockholm holds Zorn works — check Nationalmuseum IIIF for this slug via `api.nationalmuseum.se`. The 569×850 imgsize is the Commons plate. |
| `giovanni-boldini-henri-rochefort` | ⚠ ~0.27 MP | img at 515px wide (Commons) | — (wish) | No art_hires row. img/imgGrid/imgZoom all point at the same 515px Commons file. The Boldini ingest (commit f6cbb98) added 21 NGA works; this one is **not** an NGA Boldini — it's held elsewhere (check Wikidata Q17491648 for holder). Earlier Boldini pass description mentioned finding IIIF for some Boldinis — this work was not among those adopted. |
| `monet-nympheas-orangerie` | 19.97 MP ⚠ | 5472×3648 (imgsize, but that's a photo of the room) | — (favorite, seenAt orangerie) | No img, no art_hires row. qid null. The Orangerie cycle is **8 panoramic canvases in 2 oval rooms** — no single image exists. This is not a standard plate hunt: the "image" is architecturally impossible. The imgsize value likely comes from a room photograph, not a painting scan. **A plate for this work would require either (a) a single-panel extract or (b) accepting a room-photo for the card view.** |

**Toured works (T flag) under 1 MP — automatic includes:**

| slug | best MP | dims | flags | any lead |
|---|---|---|---|---|
| `vetheuil-in-the-fog` | 0.107 MP | 363×295 (imgsize) | T,L | CLOSED (§1): Marmottan, no API. Worst toured plate in the corpus. Re-open only if Marmottan opens an image programme. |
| `el-sueno` | 0.211 MP | 604×350 (imgsize) | T,L | PARTIALLY-HUNTED (§1): NGI eMuseum with Frick anatomy — 3000 px ceiling reachable with inline descriptor + proxy alias. Named as "hurts" in the close-out note. Worth a browser visit. |
| `water-lilies` | 0.225 MP | 448×503 (imgsize) | T,F | CLOSED (§1): Marmottan block. |
| `nympheas` | 0.341 MP | 676×505 (imgsize) | T,L | CLOSED (§1): Marmottan block. |
| `london-the-houses-of-parliament-sunlight-opening-in-fog` | ⚠ low | — | T,F,L | CLOSED (§1): Orsay IIIF 850 px ceiling — downgrade. |
| `anders-zorn-nude-woman-combing-her-hair` | 0.484 MP | 569×850 (imgsize) | L | ⭐ SEED — see above. No art_hires row. NM Stockholm IIIF lead. |
| `water-lilies-reflection-of-a-weeping-willow` | ⚠ low | — | T,F,L | CLOSED (§1): Marmottan block. |
| `saule-pleureur-et-bassin-aux-nympheas` | ⚠ low | — | T,F | CLOSED (§1): Marmottan block. |
| `the-tuileries-study` | ⚠ low | — | T,F | CLOSED (§1): Marmottan block. |
| `walk-near-argenteuil` | ⚠ low | — | T,F | CLOSED (§1): Marmottan block. |

**Other toured works under 2 MP (best candidates after the seed rows and Marmottan-closed ones):**

| slug | best MP | dims | flags | any lead |
|---|---|---|---|---|
| `vinterafton-vid-en-alv` ⚠ | 0.813 MP | 1000×813 (hires, NM flat) | T | NM IIIF serves native pixels by region — the flat render caps at 1000 px but regions should be bigger. Check PLAN.json or re-probe the NM IIIF endpoint. This is a group-B NM row (framed plate issue). |
| `vintermanken` ⚠ | 0.810 MP | 1000×810 (hires, NM flat) | T | Same NM flat-render trap as above. |
| `simeon-in-the-temple` ⚠ | 0.805 MP | 805×1000 (hires, NM flat) | T | Same NM flat-render trap — adopted in the toured-plates pass at this level, but NM regions serve native. |
| `giovanni-boldini-henri-rochefort` | ⚠ ~0.27 MP | 515px wide (artworks.js) | — (wish) | ⭐ SEED — see above. |
| `red-oval` | 0.244 MP | 500×488 (imgsize) | — | No art_hires row. Guggenheim ×7.77 available (3,844×3,829), candidate is the truer frame. **BLOCKED: needs Fuad's go-ahead** (WORKS_LEDGER §2). Untoured — cheap (no boxes). |
| `nude-study-sad-young-man-on-a-train` | 1.003 MP | 869×1155 (imgsize) | — | No art_hires row. Guggenheim candidate 2,980×4,096 = ×3.49, our plate is the crop. **BLOCKED: Fuad's go-ahead** (WORKS_LEDGER §2). Untoured — cheap. |
| `claude-monet-arm-of-the-seine-near-giverny` ⚠ | low | — | F | Orsay holder → CLOSED (Orsay 850 px ceiling). |
| `claude-monet-sur-la-falaise-de-dieppe` ⚠ | low | — | L | Artizon loan from Orsay → Orsay CLOSED. |

**Liked/floored works under 1 MP, never hunted:**

| slug | best MP | dims | flags | any lead |
|---|---|---|---|---|
| `giovanni-boldini-henri-rochefort` | ⚠ ~0.27 MP | 515px | — (wish) | ⭐ SEED — see above |
| `el-sueno` | 0.211 MP | 604×350 | T,L | ⭐ See toured table — NGI partial lead |
| `claude-monet-water-lilies` | ⚠ low | — | F | Holder unknown/wish — needs research |
| `bassin-aux-nympheas` | ⚠ low | — | L | Marmottan (likely) → check art_data for holder |
| `nympheas-monet` | ⚠ low | — | L | Marmottan (likely) → check art_data |
| `nympheas-monet-3` | ⚠ low | — | L | Marmottan (likely) → check art_data |
| `nympheas-monet-4` | ⚠ low | — | L | Artizon (loan) → Orsay 850 px ceiling |
| `vetheuil-in-the-fog` | 0.107 MP | 363×295 | T,L | CLOSED §1 (Marmottan) |

**§2 TOP-10 by (toured × lowest MP)** — toured works, sorted by MP ascending:

| # | slug | best MP | flags | status |
|---|---|---|---|---|
| 1 | `vetheuil-in-the-fog` | 0.107 MP | T,L | CLOSED — Marmottan; record for awareness |
| 2 | `el-sueno` | 0.211 MP | T,L | PARTIAL LEAD — NGI descriptor-less IIIF, 3000 px ceiling reachable |
| 3 | `water-lilies` | 0.225 MP | T,F | CLOSED — Marmottan |
| 4 | `nympheas` | 0.341 MP | T,L | CLOSED — Marmottan |
| 5 | `anders-zorn-nude-woman-combing-her-hair` | 0.484 MP (not toured) | L | ⭐ SEED — NM Stockholm IIIF lead, never hunted |
| 6 | `simeon-in-the-temple` | 0.805 MP | T | NM IIIF — flat render only; regions serve native |
| 7 | `vintermanken` ⚠ | 0.810 MP | T | NM IIIF — flat render trap |
| 8 | `vinterafton-vid-en-alv` ⚠ | 0.813 MP | T | NM IIIF — flat render trap (group B framed) |
| 9 | `giovanni-boldini-henri-rochefort` | ⚠ ~0.27 MP (not toured) | — (wish) | ⭐ SEED — Commons 515 px, no art_hires row |
| 10 | `monet-nympheas-orangerie` | — (no img) | — (favorite) | ⭐ SEED — structurally impossible as single plate; note open |

---

## §3 KNOWN MINES — per-work traps

Traps confirmed in rounds 3–7. Numbered to match the trap taxonomy in `HIRES_SOURCING.md §"THIRTEEN TRAPS"`.

| slug / source | trap | description |
|---|---|---|
| `paris-musees` / Petit Palais | **Trap 1: MANIFEST-WITHOUT-A-SERVICE** | Real IIIF manifests, no image service behind them — canvas points at a 6.97 MP Drupal render. Adopting on "they have IIIF" would downgrade 17 works. Always resolve manifest to a real `info.json`. |
| `vgm-raising-of-lazarus` / VGM Micrio | **Trap 2: REAL PYRAMID SMALLER THAN OURS** | VGM *Raising of Lazarus*: Micrio 4,000×3,059 vs our 7,336×5,611 (−28.9 MP). A pyramid is not a licence to skip the measurement. Same class: Belvedere (caps 1,772 px below our plates), Kröller-Müller Van Gogh self-portrait (−13.9 MP). |
| `colbase-tokyo-national` | **Trap 3: HTTP 200 FROM AN SPA CATCH-ALL** | ColBase returns 200 for every path including `/iiif/` — the front-end serves its shell to anything. Check content-type and body size. |
| `mnw-p6108` | **Trap 4: MIS-TYPED WIKIDATA PROPERTY** | MNK's P6108 ("IIIF manifest") points at a plain object-record JSON API. P6108 is not self-validating — fetch and inspect. |
| `frick-challenge` | **Trap 5: A 200 THAT IS STILL A BLOCK** | Frick challenge shell answers 200 with 182 bytes; real page is 200 with 86,108 bytes. Score on byte count, not status. Also: 418 ≠ IP-blocked (cost the Frick a whole round). |
| `frick-dzi` | **Trap 6: SUBSTRING INSIDE HUMAN PROSE READ AS TECHNOLOGY** | Grep for `dzi` hit *Dzí*ków Castle and Z*dzi*sław Tarnowski. Frick is IIIF 2.0 with no descriptor, not DeepZoom. Match on path/filename shape, never bare substring. |
| `frick-size-keys` | **Trap 7: ALTERNATE SIZE KEY = DEFAULT DERIVATIVE RENAMED** | Six eMuseum keys (`original`, `download`, `large`, `zoom`, `resize:format=full`, `resize:format=original`) all return the byte-identical 800×694 default. Compare hashes or decoded dims. Also: Google Arts & Culture `=s0`/`=s4000`/`=w4000` same file. |
| `british-museum` | **Trap 8: CERT-CHAIN FAILURE READS AS DEAD HOST** | `media.britishmuseum.org` was recorded as non-existent. It resolves — open Apache — but serves wildcard cert without its intermediate. Separate NXDOMAIN, connection refused, and TLS before recording a host as gone. |
| `ngv-filename-as-dimension` ⚠ | **Trap 9: FILENAME-AS-DIMENSION** | A filename containing `W1500` served an image at 2405 px. Decode bytes; never trust URL dimensions. MNW's `multimedia_big` is a **1,024 px fit box** — "big" is a lie (the path-swap to `multimedia/` gets the 6,000 px master). |
| `ngi-leech-search` | **Trap 10: NAME COLLISION IN HOLDER SEARCH** | NGI "Leech" search returned: a John Leech (Punch illustrator, different artist), a Stanley Royle (wrong artist), and a work where Leech is the SITTER. All three passed the P195 holder check. A surname is not an identity. Anchor on accession. |
| `mnw-p9061` | **Trap 11: HOLDER-ISSUED ID POINTING AT WRONG OBJECT** | `battle-of-grunwald`'s P9061 (MNW object id) resolves to a Chinese bronze ritual vessel — passes holder gate. `stanczyk`'s P9061 404s. Anchor on inventory/accession number and cross-check the returned record's own accession. |
| `guggenheim-media-api` / `improvisation-28` | **Trap 12: MEDIA API REPORTS ITS OWN INDEX AS CEILING** | Guggenheim `wp/v2/media/<id>` returned only the 1,280 px derivative for *Improvisation 28* — the 4,075 px original was on disk, unregistered. A CMS's media table describes what the CMS was told about. Probe the path. |
| `ng-london-img-field` | **Trap 13: OUR OWN RECORD LYING ABOUT WHAT IT FETCHES** | `ng-london`'s `img` was `/full/!3000,3000/0/default.jpg`, delivering 800 px — filename-as-dimension we wrote ourselves. Downgraded *Madonna of the Pinks* zoom from Commons 870×1,080 to 643×800 inside an adoption scored as a gain. Re-decode the final URL after writing it; audit fields the adoption REPLACES not just what it adds. |
| `theo-van-rysselberghe-coastal-scene` | **SERVER CLAMP** (NG London, trap 13 family) | `maxWidth`/`maxHeight: 800` enforced with a 200, not a 400. `/full/max/`, `/full/full/`, `/full/3000,/` all byte-identical 800 px. Tile fix (`tiles: 256`) is the complete win — now shipped. See WORKS_LEDGER §1. |
| `the-hydra` | **UPGRADE IS THE BACK OF THE PANEL** | The Belvedere IIIF candidate for *Water Serpents I* was a photograph of the back of the panel. Rejected. Row left on correct plate. WORKS_LEDGER §1. |
| `stanczyk` | **GATE RUN AGAINST WRONG BASELINE** | Candidate scored ×1.85 because gate compared to `art_imgsize` (3,118×2,313) not `art_hires` (5,766×4,289). Candidate was smaller on both axes. Gate must compare against `max(art_imgsize, art_hires)` per axis. |
| `mnw-flat-render` (all three pre-existing `nationalmuseum-se` rows) | **FLAT-RENDER CLAMP ≠ SERVER CEILING** | `/full/3000,/0/default.jpg` → 501 "height above server limit 1000 px". Regions serve native pixels. Keep working Commons plate as `img`; put NM route in `iiif` only. |
| `musee-orsay` (all ~150–176 Orsay works) | **OPEN IIIF THAT CAPS BELOW WHAT WE SERVE** | `iiif.musee-orsay.fr` open IIIF 3 level2, ACAO `*`. Every master caps at 850 px across 4 objects / 29 canvases verified. Adoption would downgrade all Orsay works. Do not re-hunt. |
| `frick` (17 works) | **IIIF WITH 2000 PX VERTICAL CAP** | Every Frick zoom master hard-capped at exactly 2000 px vertical (2.56–6.49 MP vs our 24.94–45.55 MP). 17 of 17 are downgrades. Do not re-hunt unless Frick lifts the 2000 px cap. |
| `british-museum` (6 works) | **MAX_ TIER CAPS AT 2500 PX** | `max_` derivatives cap at 2500 px long side (~4–5 MP) against our 13.5–51.7 MP. 6 of 6 are downgrades. Headers cannot beat the Cloudflare wall (full Chrome set with sec-ch-ua still 403s). |

---

## §4 UPGRADE FOUND, NOT YET ADOPTED — awaiting verdict or blocked

Works with a confirmed better image source not yet applied. All are blocked on Fuad's verdict
or on a coupled operation (remap). Full details in WORKS_LEDGER.md §2.

| slug | current MP | candidate MP | gain | what is blocking |
|---|---|---|---|---|
| `red-oval` | 0.244 MP (500×488) | ~14.7 MP (3,844×3,829) | ×7.77 | Fuad's go-ahead. Guggenheim, candidate is truer frame (our plate is the crop). Untoured — no boxes to remap. Cheapest, biggest win. |
| `nude-study-sad-young-man-on-a-train` | 1.003 MP (869×1155) | ~12.2 MP (2,980×4,096) | ×3.49 | Fuad's go-ahead. Guggenheim visitor photo vs museum scan. Untoured. |
| `peasant-woman-seated-in-the-grass` | 4.785 MP (2,436×1,964) | ~13.7 MP (4,077×3,367) | ×1.69 | Fuad's go-ahead. Guggenheim, our plate is the crop. Untoured. |
| `birsk` | 6.126 MP (2,042×3,000) | ~10.9 MP (2,654×4,096) | ×1.33 | Fuad's go-ahead. Guggenheim, aspect Δ 4.807% — our plate is the crop. Untoured. |
| `yellow-cow` | 4.223 MP (2,390×1,767) | ~7.14 MP (2,390×1,767→ Gugg) | ×1.69 | Fuad's go-ahead. Guggenheim candidate is the crop (our plate is truer). art_hires w/h are [null, null] — fill null dims regardless. Untoured. |
| `black-lines` | 6.508 MP (2,578×2,524) | ~10.4 MP (Gugg) | ×1.60 | Fuad's go-ahead. Guggenheim candidate is the crop (our plate is truer). Untoured. |
| `blue-mountain` | 6.671 MP (2,484×2,685) | ~15.2 MP (Gugg) | ×1.51 | Fuad's go-ahead + registration + box remap (7 boxes). Guggenheim, candidate is truer frame (×2.25% narrower per unit height). Toured — expensive. |
| `composition-viii` | 11.137 MP (3,911×2,849) | ~11.4 MP (Gugg) | ×1.024 (nil) | Fuad's go-ahead. Fidelity-only remap (our plate 4.38% off object, candidate 0.03%). Lowest priority. |
| `bruno-liljefors-autumn-landscape-with-partridges` | ⚠ | NM 7,860×5,902 = ~46.4 MP | ×4.1 linear | Fuad's eye — framed plate (swapping puts a picture frame in the viewer). NM group B. |
| `landscape-from-bretagne` | ⚠ | NM 8,875×7,344 = ~65.2 MP | ⚠ | Fuad's eye — framed plate. NM group B. Aspect Δ −4.01%. |
| `vilhelm-hammersh-i-interior` | ⚠ | NM 6,013×6,999 = ~42.1 MP | ⚠ | Fuad's eye — framed plate. NM group B. Aspect Δ +4.07%. |
| `vilhelm-hammersh-i-interior-with-a-reading-lady` | ⚠ | NM 5,945×6,937 = ~41.2 MP | ⚠ | Fuad's eye — framed plate. NM group B. Aspect Δ +3.48%. |
| `midsummer-dance` | ⚠ | NM 3,325×4,169 = ~13.9 MP | ⚠ | Fuad's eye — framed plate, Δ +8.68%; once frame cropped is effectively no gain. WORKS_LEDGER §2: "same as stary-dom position — truer to object, no real detail bought." NM group B. |
| `en-premiar` | ⚠ | NM 2,619×3,534 = ~9.25 MP | ⚠ | Fuad — NM IIIF beats delivery (1,920×2,589) but is under master (3,064×4,132). Trips smaller-on-any-axis rule. NM group B. |
| `carl-grabow-untitled` | ~6.591 MP declared / ~4.78 MP delivered ⚠ | — | — | Fuad opt-in — dims correction + pyr ladder `[1920×1242, 3840×2485]`. NM group D. |
| `jan-both-tradstudie` | 18.1 MP (art_hires declares 4,602×3,936, url delivers 3,840×3,284) | — | — | Dims correction only (no verdict needed). Group-D pyr opt-in needs Fuad. WORKS_LEDGER §2. |
| `johan-christian-jansson-untitled` | ⚠ | — | — | Fuad opt-in — dims correction + pyr `[1920×1505, 3840×3010]`. NM group D. |
| `johan-christian-jansson-untitled-2` | ⚠ | — | — | Fuad opt-in — dims correction + pyr `[1920×1371, 3840×2741]`. NM group D. |
| `julian-fa-at-powrot-z-polowania-na-niedzwiedzia` | ⚠ | MNW (staged) | ⚠ | STAGED, NOT APPLIED. New plate + 9 box remap coupled. NCC 0.956. Art_inspect has live writer guard. w20 MODE=toured. |
| `unknown-s-once-majowe` | ⚠ | MNW (staged) | ⚠ | STAGED, NOT APPLIED. New plate + 8 box remap. NCC 0.9953. w20 MODE=toured. |
| `at-the-seashore` | ⚠ | MNW (staged) | ⚠ | STAGED, NOT APPLIED. New plate + 8 box remap. NCC 0.9990. w20 MODE=toured. |
| `the-hanging-of-the-sigismund-bell-…-in-krakow` | ⚠ | MNW (staged) | ⚠ | STAGED, NOT APPLIED. New plate + 5 box remap. NCC 0.9386 (lowest). w20 MODE=toured. |

---

## Counts

| section | rows |
|---|---:|
| §1 HUNTED, NO RESULT | 41 |
| §2 STILL LOW-RES, NEVER PROPERLY HUNTED (seed rows) | 3 |
| §2 toured under 1 MP (inc. closed) | 10 |
| §2 other candidates | 8 |
| §3 KNOWN MINES | 20 |
| §4 UPGRADE FOUND, NOT YET ADOPTED | 22 |

Last updated **2026-08-25**. Sourcing anatomy and trap taxonomy: [`HIRES_SOURCING.md`](HIRES_SOURCING.md).
Per-work text + plate history: [`WORKS_LEDGER.md`](WORKS_LEDGER.md). QC narrative: [`QC_LEDGER.md`](QC_LEDGER.md).
