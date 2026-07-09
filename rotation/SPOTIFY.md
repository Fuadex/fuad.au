# Spotify export — integration plan

Personal Spotify export (two gitignored zips in `rotation/`, **local-only, contain IP addresses**):
Extended Streaming History (316k plays, 2013→2026, `ms_played` + per-play `conn_country` + skips)
and Account Data (`YourLibrary.json` = 3,512 liked tracks after dedup, 73 albums, 7 artists).

**Privacy rule (hard):** never emit `ip_addr` or raw per-play rows. Only PII-free aggregates and
liked-track keys get committed. Extraction runs locally (`.sptmp/extract-spotify.py`, untracked);
outputs `spotify-insights.js` (aggregates) + `spotify-liked.js` (matched keys), both committed.

## Shipped
- **Placeholder page** (`rotation-spotify.jsx`, `#spotify` tab): migration map (land + country
  bubbles sized by plays, year scrubber), headline stats (plays / hours / % skipped / countries),
  plays-per-year with skip %, top artists by real hours, "you skip them most". A sandbox to feel the
  data before wiring it into the main modules.
- **`spotify-liked.js`** — `window.ROTATION_LIKED` (`artist~track` slug → 1), plus liked albums/artists.
- **`spotify-engagement.js`** — `window.ROTATION_ENGAGE` (`artist~track` → `[plays, skipPct]`, ≥3 plays).
- **♥ + engagement bar** wired into all three track-row sites (artist top-tracks, album tracklist,
  track-page siblings), mirroring the 🎤 seen-live marker.

> **KEYING GOTCHA:** keys MUST use build-data's `slug()` — the one with the empty→`"a-"+_slugHash`
> fallback (build-data.js:56). A plain slug mis-keys all CJK/non-latin content (ミドリ→`""` instead of
> `a-2yw9ix`) and nothing matches the frontend's `R.slug`. Canonical pipeline: `.sptmp/emit-raw-spotify.py`
> (raw names) → `.sptmp/key-spotify.js` (exact JS slug) → `spotify-liked.js` + `spotify-engagement.js`.

## Next (agreed direction, not yet built)
- **♥ liked attribute** — mirror the live-gig microphone: a ♥ on liked tracks wherever track rows
  render (artist top-tracks, album track lists, track pages). Data file already exists; just wire the
  glyph via `ROTATION_LIKED[key]`.
- **Engagement in context** — surface `ms_played` signals per artist/album/song: finished vs skipped,
  real minutes, "liked but barely played / abandoned". Seed **Stories** ("songs you keep skipping but
  won't unlike", "your real top artist by hours ≠ by scrobbles").

## PINNED — reconcile Spotify history with the last.fm core (needs deliberation)
Spotify has 316k plays 2013→2026; last.fm core has ~320k scrobbles. They overlap but differ:
different track identity (Spotify URI vs last.fm name-slug), different thresholds (last.fm scrobbles
at ~50% play; Spotify logs every play incl. skips), and different date coverage. Open questions before
merging: which is the source of truth per era? dedupe strategy? keep them as two lenses vs one unified
timeline? Do NOT start until Fuad decides. Deferred 2026-07-09.
