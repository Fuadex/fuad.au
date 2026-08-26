> Part of the fuad.au docs — start at [/GUIDE.md](/GUIDE.md)

# fuad.au — the numbers

Raw scale of what the three apps hold, measured 2026-08-26. Everything below ships on the
public site (or is derivable from it); figures move with every sync/campaign, so treat them
as a dated snapshot. Cross-app status: [STATUS.md](STATUS.md).

## Rotation — the listening observatory

| Layer | Scale |
|---|---|
| Scrobbles (last.fm, 2006 → today) | **322,640** plays |
| Artist universe (Explore) | ~6,000 artists with genre/geo/audio metadata |
| Full artist records (kept tier) | top 400 by plays + per-year top-10 union |
| Albums on the Shelves | ~11,500 spines (≥3 plays) + 6,565 unplayed "shrinkwrapped" LPs |
| Track reads ("what it's about") | **15,019 tracks** with at least one read |
| — multi-model tiers | 13.7k haiku · 14.3k sonnet · 14.7k opus · 231 web-researched |
| — Fable close reads | ~1,400 (plus 136 deep interpretations, 351 footnotes) |
| Album liners / arcs / artist portraits | 155 entries |
| Lyric language layer | 25,740 tracks matched, 37 languages |
| Lyric mood + theme layers | 25,286 mood-scored · 25,472 theme-classified |
| Per-track audio features | ~36,900 tracks |
| Track identity / preview layer | 39k ISRCs · 34.5k 30-second preview hashes |
| Album covers | ~20,600 real covers (generative fallback beyond) |
| Vocalist lineups verified | 2,205 artists |
| Gigs ledger | 154 sets across 39 show-dates in 14 cities |
| Collaboration graph | 5,730 credit edges |
| Spotify behavioral layer | 316k-play aggregates (2013 → 2026) · 3,592 liked tracks |

## Culture — the personal canon

| Layer | Scale |
|---|---|
| Seen library | **3,277 items** (206 curated + 3,071 imported history) |
| — by medium | ≈1,160 movies · 1,000 shorts · 360 games · 260 feature animation · 190 animated series · 180 TV · 115 books |
| Wishlist | 1,525 items, **all 1,340 originals carry a written blurb** |
| Predicted ratings | model-scored wishlist (`wishlist_pred.js`) |
| Reader notes | ~980 original Polish notes · 360 English redrafts |
| Badge taxonomy | curated highlight/badge system with charter + exemplars |
| External metadata | 3,680 OMDb records · TMDB/IGDB/OpenLibrary overlays · per-film dialogue-mood scores |

## Canvas — the personal gallery

| Layer | Scale |
|---|---|
| Works in the canon | **2,049 artworks** |
| Venues | 80 museums/galleries |
| Works with reads (Info / Interpretation) | 807 |
| Study tours (guided deep-zoom close readings) | **389** |
| Hi-res plates (IIIF-first sourcing) | 1,228 |
| Per-work palette | dominant-colour data across the canon |
| Recall decks | the app's own cataloguing instrument (museum + artist decks) |

## The hub

- Three self-contained apps, one static deploy (GitHub Pages, manifest-driven staging),
  zero servers, zero third-party runtime dependencies in production.
- All three installable as PWAs with tiered offline caching.
- ~94 MB of deployed data/code across the apps, heavily lazy-loaded (Rotation boots on
  ~2.5 MB, Culture on ~830 KB).
- A Cloudflare edge worker (`img.fuad.au`) fronts external image hosts with proxy-first,
  direct-fallback wiring.
