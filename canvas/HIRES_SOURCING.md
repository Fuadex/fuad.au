> Part of the fuad.au docs — start at [/GUIDE.md](/GUIDE.md)

# The hi-res hunt — how art_hires.js got built, and everything that fought back

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
| **NGA Washington** | fully open, keyless (opendata CSVs + api.nga.gov/iiif) | **48 holder-verified IIIF entries, up to 1,643 MP** (White Girl, both Vermeers, Laocoön…) | The jackpot. Quietly the most open major museum. 163 further title-matches correctly REJECTED by P195 holder check — NGA owns *different* works named "The Balcony", "The Gleaners" etc. |
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

## Regeneration pointers

Workshops live outside the repo (`../../.sptmp/canvas-hires*/`): tier sweeps, dims
backfills (`backfill-dims.py` — IIIF info.json + ranged JPEG-header parsing),
`emit-pyramids.py` (measured `pyr` levels), pair-sheet builders. art_hires.js is
canonical compact format — one JSON line per entry; keep it that way, mixed formats
needed three manual repair passes. The wall's Quality chips read `w/h` client-side
(150/50/12/3/1 MP tiers + the `tiled · IIIF` tag).
