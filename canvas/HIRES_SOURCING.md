> Part of the fuad.au docs — start at [/GUIDE.md](/GUIDE.md)

# The hi-res hunt — how art_hires.js got built, and everything that fought back

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

## ⛔ FOUR TRAPS THAT LOOK LIKE WINS (round 3, 2026-08-25)

Each passes a naive check and ships a regression. Test for them by name.

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

Also keep in mind the **flat-render downgrade** (Nationalmuseum's render caps at 1000px while
its pyramid reaches 11,016 — adopting the render as `img` silently downgrades works currently
at 2,800–4,300px; tile source only) and **Zoomify's silent failure** (no descriptor fetch, so
a CORS failure gives broken tiles with no `open-failed` event and therefore no fallback).

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
| **Rijksmuseum** | dead | 0 | The old API is gone (HTTP 410) and the Rijksstudio key portal no longer exists; new data platform has no self-service signup. Moot anyway: their open images were donated to Commons and swept via P18. |
| **Getty / Yale / Brooklyn** | blocked or down | 0 | Getty endpoints network-blocked; both Yale APIs dead/403; Brooklyn 429s without a key. |
| **SMK Copenhagen** | open API (recovered from 500s) | 1 match → 0 emits | Swept 21 Nordic canon works. Sole hit — *Interior. Artificial Light*, 118.8 MP — was a same-title different Hammershøi: canon Q18600052 is the Stockholm Nationalmuseum *Interior* (P195 Q842858), not SMK's. Holder gate rejection #21. |
| **Nasjonalmuseet Oslo** | no public API | 0 | All 8 plausible endpoint patterns dead (timeouts / NXDOMAIN). Their IIIF exists but has no discoverable search front door. |
| **Wikidata P6108/P4765** | open | 0 | No IIIF manifests exist for any canon work. The sweep's value was P18 dims + conflation discovery. |
| **National Gallery, London** | open, keyless — **IIIF Image 3.0**, previously listed here as unchecked | **2 emits** (Rysselberghe *Coastal Scene* 28,641×23,726 = 680 MP; Raphael *Madonna of the Pinks* 6,909×8,585) | The discovery of the 2026-08-25 pass. Endpoint shape: `www.nationalgallery.org.uk/server.iip?IIIF=/fronts/<ACCESSION>-…-PYR.tif/info.json` — an IIPImage server, and the pyramid TIFF is **named by accession** (`N-6582-…` = NG6582), so identity is holder-owned, not title-matched. Two gotchas: (a) **no ACAO** — see the CORS note below; (b) it is IIIF **3**, where the Ultra-HQ size keyword is `max`, not the `full/full` the reader assumed for our IIIF-2 sources (hence the `full` override field). |
| **Nationalmuseum Stockholm** | open, keyless (`api.nationalmuseum.se/api/objects/<id>` → `iiif` field on iiifhosting.com, IIIF 2 level1) | **3 emits** (both Fjæstads, Rembrandt *Simeon in the Temple*) | Object-id lookup is perfect; **search is broken** — every `query`/`q`/`title`/`filter` param is ignored and returns the whole 208k-row corpus. Only usable when you already hold the object id, which Wikidata's *Nationalmuseum Sweden artwork ID* supplies. Records also carry `inventory_number` (NM 1628 / NM 1703 / NM 4567 — all three matched the canon notes exactly), dating, dimensions and an explicit `iiif_license`. Worth a corpus-wide Nordic sweep later. `page` currently points at the API record, not a human catalogue page — no public object-page URL pattern found. |
| **NGV Melbourne** | partial, keyless — **Zoomify**, not IIIF | **1 emit** (Rembrandt *Two Old Men Disputing*, 4,105×5,000 from a 498×600 plate) | No JSON API, no IIIF (`api.`/`iiif.` subdomains NXDOMAIN). The object page `/explore/collection/work/<vernonID>/` inlines `imgWidth`/`imgHeight` and a Zoomify base under `content.ngv.vic.gov.au/col-images/zooms/<imgid>/`, driven by OpenLayers; `ImageProperties.xml` confirms it. `retrieve.php?size=xl` is only 694×845, so the **pyramid is the whole prize**. Cost of adoption: a third tile flavour in the viewer (see below). |
| **Centre Pompidou / MNAM** | partial, keyless — **DeepZoom (.dzi)** | **2 emits** (Matisse *Auguste Pellerin II*, *Tête blanche et rose*) | `api.centrepompidou.fr` does not resolve; object pages do, and inline `/media/picture/<hash>/dzi/uhd.dzi`. Hard-capped at **4,000 px long side** — a fixed "uhd" render tier, not the archival master — but still ×4 linear on works that were 1,000 px uploader-capped. **No ACAO.** Wikidata's Centre Pompidou IDs go stale (`5dq7dfI` 404s), so verify the id resolves before adopting; one candidate was dropped for exactly this. Rights: Matisse d. 1954 → French PD from 2025-01-01. |
| **AGSA / Whitney** | partial, keyless — plain JPEG keyed by the holder's object id | **2 emits** (Pissarro *Prairie à Éragny* 3,543×2,849; Stettheimer *New York/Liberty* 1,537×2,048) | Not sweepable — one asset per object page — but identity is safe because the asset path carries the object id (`/assets/artwork/47209/`, AGSA work 27081). Whitney's ceiling is 2,048 px and its filename says `_cropped`; adopted at `conf: "med"` on the strength of a 0.07 % aspect match with the current plate, which a real crop could not produce. |
| **Belvedere** | open, keyless (eMuseum JSON + IIIF Presentation v2 + Image v2 level2) | 1 candidate → **0 emits** | Works fine technically — object-id lookup only, and the manifest carries 8 canvases (raking light, details) so the canvas must be picked deliberately. Rejected on aspect, not access: see the ledger below. |

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

DZI needs none of that — proxy the descriptor and you are done.

Worker aliases `nglondon` and `pompidou` must be added by hand in the Cloudflare dashboard
(`.dtmp/tourqc-pass/WORKER_CHANGES.local.md`). Until they are, the alias 404s, `open-failed` fires
and `useOSDViewer`'s `fallbackUrl` retry drops to the canon plate — never worse than before. Per
the standing rule every proxied URL here is paired with that direct fallback.

### Adopted — 10

| Work | Source | Tech | Was → now | Linear gain |
|---|---|---|---|---|
| Rysselberghe, *Coastal Scene* | ng-london | IIIF 3 (proxied) | 800×665 → 28,641×23,726 | ×35.8 |
| Raphael, *Madonna of the Pinks* | ng-london | IIIF 3 (proxied) | 870×1,080 → 6,909×8,585 | ×7.9 |
| Rembrandt, *Two Old Men Disputing* | ngv | **Zoomify** | 498×600 → 4,105×5,000 | ×8.2 |
| Pissarro, *Prairie à Éragny* | agsa | JPEG | 796×640 → 3,543×2,849 | ×4.5 |
| Fjæstad, *Winter Moonlight* | nationalmuseum-se | IIIF 2 | 1,000×810 → 3,791×3,070 | ×3.8 |
| Fjæstad, *Winter Evening by a River* | nationalmuseum-se | IIIF 2 | 1,000×813 → 3,531×2,869 | ×3.5 |
| Matisse, *Auguste Pellerin II* | centre-pompidou | **DZI** (proxied) | 643×1,000 → 2,573×4,000 | ×4.0 |
| Matisse, *Tête blanche et rose* | centre-pompidou | **DZI** (proxied) | 609×1,000 → 2,436×4,000 | ×4.0 |
| Rembrandt, *Simeon in the Temple* | nationalmuseum-se | IIIF 2 | 1,000×1,228 → 2,828×3,513 | ×2.8 |
| Stettheimer, *New York/Liberty* | whitney | JPEG | 600×800 → 1,537×2,048 | ×2.6 |

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
  l'herbe*). Cloudflare 403 to every programmatic client. Orsay ids **are** in Wikidata (1177,
  25651) — **parked, not dead**: a human browser could finish this in minutes.
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
  the worst plates in the canon.** NGA Canberra (Munch *Man with Horse*) — Angular app, every
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
