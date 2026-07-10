> Part of the fuad.au docs — start at [/GUIDE.md](/GUIDE.md)

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

## v2 — the behavioral layer (2026-07-11, Fuad's verdicts in)

The extended history carries more than ms_played/conn_country: `reason_start`/`reason_end`
(clickrow, fwdbtn, trackdone…), `shuffle`, `offline`, `incognito_mode`, platform — a
*behavioral* dataset. Feature slate, with Fuad's dispositions:

1. **Intentionality index** (chosen vs happened-to-you: shuffle/clickrow ratios per artist) —
   APPROVED: artist pages once computed dynamically, plus a Story.
2. **Attention vital-sign** (completion-ratio trend over 13 yrs + skip taxonomy) — APPROVED
   as a Story. Caveat: Spotify data is more fragmented than last.fm, but it was the primary
   listening engine for years.
3. **Chronotype ledger** (true sessions, 3am history, sleep-boundary drift) — viable:
   conn_country approximates timezone.
4. **Comfort fingerprint** (first-48h-abroad reach: familiarity regression vs novelty spike)
   — Fuad: "amazing idea".
5. **Time-to-love latency** + **open-earedness curve** — Fuad predicts he knows the answers;
   the goal is to surprise. Frame as hypothesis-vs-data.
6. **Dissonance ledger** (liked-but-skipped etc.) — generalizes the pinned Stories angle.
7. **External joins**: MusicBrainz recording MBIDs (unifies Spotify URIs ↔ last.fm slugs,
   dedupes remasters — also the reconcile key), age-at-first-listen, the 106-gig concert
   effect (play-rate 90d before/after), features energy-by-hour + valence seasonality.

**Travel timeline fished (2026-07-11)**: per-day dominant conn_country → 145 episodes,
classified trips / VPN noise / ambiguous. Details + the VPN-vs-travel classifier live in
`TRAVEL.local.md` (local-only — date-level travel history stays out of the public repo).
Its ambiguous list is the pending input for the map location-blanking override table.

## v3 — the Account Data layer (2026-07-11 recon; beyond the extended history)
The second zip carries far more than YourLibrary. Inventory (all local-only; extract
aggregates the same way as v1/v2 — never raw rows, never account attributes):

- **Marquee.json** — 2,599 artists × Spotify's own label-marketing segment for Fuad:
  Super (21) / Moderate (69) / Light (86) / Previously Active (2,423). This is Spotify's
  *external* judgement of his engagement — join it against our internal scrobble ranks for a
  "do they know me?" dissonance read. The 21 Super Listeners list is instantly story-worthy.
- **Inferences.json** — 236 ad-targeting segments (ArtistAffinity hashes + human-readable
  interest/advertiser audiences). "What the ad machine thinks I am" is a page/Story of its
  own: the profile is amusingly wrong in places (US-market lookalike audiences dominate).
- **Wrapped2025.json** — structured Wrapped: topArtistRace (per-month rank trails — a real
  bump-chart dataset), topFanLeaderboard (minutes + percentile vs other listeners), clubs,
  party stats (skip %, multilinguist score), listeningAge (44, window from 1990, "late" phase).
- **YourSoundCapsule.json** — recent daily stats + highlights incl. FIRST_TO_DISCOVER
  (country-level early-listener position) and proportion-listening spikes.
- **SearchQueries.json** — 1,487 queries (rolling ~3-month window) w/ platform + clicked URIs.
- **Playlist1.json** — 15 playlists w/ items + lastModifiedDate (incl. 2013-era Moodagent
  relics — playlist archaeology).
- **Follow.json** — 254 followed artists/users. StreamingHistory_music_*.json — last-year
  simplified history (~65k rows); podcast (42) + audiobook (125) rows.
- **UserAttributes / Identifiers / Payments / MessageData** — pure account PII. Never read
  beyond existence; never extract.

Feature slate v3 (proposed, awaiting Fuad's picks): (a) "Spotify's picture of me" page —
Marquee segments vs our scrobble ranks + the Inferences absurdities; (b) Wrapped cross-check —
their topArtistRace vs our monthly ranks; (c) playlist archaeology; (d) search-intent vs
listening (did searching lead to love?).

## PINNED — reconcile Spotify history with the last.fm core (needs deliberation)
Spotify has 316k plays 2013→2026; last.fm core has ~320k scrobbles. They overlap but differ:
different track identity (Spotify URI vs last.fm name-slug), different thresholds (last.fm scrobbles
at ~50% play; Spotify logs every play incl. skips), and different date coverage. Open questions before
merging: which is the source of truth per era? dedupe strategy? keep them as two lenses vs one unified
timeline? Do NOT start until Fuad decides. Deferred 2026-07-09.
