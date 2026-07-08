# Rotation — Audit & Roadmap

> Companion to **ARCHITECTURE.md** (read that first — it defines what already exists).
> This file = ⓪ status snapshot, ① audit findings, ② evaluated API/data-source catalogue,
> ③ the modular build plan. When a module ships: mark it, move its feature description into
> ARCHITECTURE.md §8. Absorbed and replaced the old IDEAS.md on 2026-07-03.

---

## ⓪ ROLLOUT PHASES — 2026-07-07 (the current master plan)

> Distilled from AUDIT-2026-07.md Part II. This supersedes all earlier orderings in this file
> (the M-modules and section §③ remain as reference detail for individual items). Rule:
> phases 0–2 before new weight; the template (phase 5) is the destination, so every phase
> is built template-aware (no new hardcoded `fuadex`/TZ/paths).

### Phase 0 · Platform hardening — perf + resilience — ✅ MOSTLY SHIPPED 2026-07-07
The site's biggest UX cost and its only critical SPOF, plus cheap de-bloat. All of it is
also template prep. **Net cold-first-paint win: −700 KB gz (Babel gone) − ~445 KB gz
(music-data split) + no in-browser compile.**
1. ✅ **CI precompile** — `stage-site.js` babel-transforms `.jsx` → `.js` in `_site/` only,
   gated on `apps.json "precompile":true`; local authoring stays buildless. Verified: staged
   site renders full Overview in headless Edge. Babel gone from prod (~700 KB gz + compile).
2. ✅ **Self-host runtime** — react + react-dom vendored (byte-identical to unpkg, SRI-verified);
   prod has no third-party runtime dependency. Babel is dev-only. React 18.3.1 UMD is the final
   UMD release (19 dropped UMD) → pin is permanent.
3. ✅ **music-data split** — `music-core.js` (989 KB gz) eager + `music-rest.js` (404 KB gz)
   injected after first paint, merges into `window.ROTATION`. Defensive: deferred keys stubbed
   empty, `EXPLORE_N` in core, non-Overview views gated behind `restReady` (mount fresh once
   ready), map band gated too, Node consumers load both. Smoke green; Overview + cold
   `#explore` deep-link both verified in headless Edge.
4. ✅ **TourMap render fix** — imperative pan (no setState/frame) + memoized land/dots/routes;
   a pan now only updates the `<g>` transform. *(MapView same-idiom audit still open — it uses
   a similar pattern; do when Map is next touched.)*
5. ⏸ **De-bloat — measured, mostly not worth it:** the cover-URL prefix table saves only
   **~10 KB gz** (gzip already dedupes the repeated `https://i.scdn.co/image/` prefixes — the
   audit's "~500 KB" was a raw-byte miscalc), so **skipped**. Retiring blurb-demo.js would strip
   reads from **22 tracks** not in llm-about (Rammstein/Amenra/The HU/Karel Kryl…) → **deferred
   to Phase 2** as a proper content fold (schema differs: fable vs sonnet), not a de-bloat.
6. **Resilience:** ✅ last.fm bio attribution line · ✅ global `prefers-reduced-motion` block.
   ⏳ **ListenBrainz mirror — needs Fuad** (his LB account + token; one-time import). ⏳ **Vendor
   fonts — deferred** (cosmetic-only failure mode, ~15 woff2 files; low priority vs the SPOF,
   which is already fixed).

### Phase 1 · Dynamism kernel — ✅ SHIPPED 2026-07-07 (two small remainders)
1. ✅ **`day-series.js`** (7 KB gz — flat per-day play counts): the Overview stat strip's
   avg/day, heaviest-day and share-of-history recompute for the active date filter (year scrub
   or calendar day/week/month). Verified: window math matches TOTALS.topDay; `#overview/y=2019`
   → avg/day 50.4, 5.8% of plays, heaviest 464.
2. ✅ **avg/day + share follow the map place/genre filter too** — the map already reports the
   fully place×genre×year-filtered count (`fStats.plays`), folded with day-series via a `slice`
   flag (a pure time filter keeps the exact day-series total; a place/genre slice uses the map's
   count). Verified: `#overview/f=5` (Japanese) → avg/day 3.9, 6.3% of all plays. **This closes
   the gap Fuad flagged** — no `day × family` matrix needed after all (fStats already carries
   the slice count for place, family AND subgenre).
4. ✅ **URL state** — Overview date filter + **map genre/mode** (`#overview/y=2019`,
   `p=month~2019-06`, `f=5`, `s=<sub>`, `md=country`) and Shelves mode/lens (`#shelves/l=mood`,
   `m=wrap`) serialize into the hash and restore on load, like Explore.
3b. ✅ **Per-day-hour → heatmap** tandem was **already live** (stale note corrected).

**Two small remainders (lower value now that the headline stats react — deferred, not blocking):**
- **Heaviest-day per slice** — the one stat still time-scoped only (reads lifetime under a
  place/genre-only filter). Making it place/genre-specific needs a per-day × place/family export
  (heavy, days×places ≈ 300 KB gz) for one stat — not worth it yet.
- **Map *dots* re-weight by a calendar day** (per-day geography export) + **place-selection URL
  state** (needs geo-load coordination). Both nice-to-haves; neither blocks the dynamism goal.

### Phase 2 · Content quality pass (~1–2 sessions) — IN PROGRESS
1. ✅ **Taste-standouts tightened** (2026-07-07): "In your rotation, this track is…" → "Next to
   everything you play, it's…" with gate ≥85/≤15 (from 72/28), comparative wording ("more
   danceable than 96%"), capped at 3, hides when nothing clears the bar. Also fixed the adjacent
   **"Where it sits"** module — it now flips direction below the median ("more mellow than 90%"
   instead of the misleading "more intense than 10%"). Verified on deadmau5 – Maths.
2. **llm-about ops**:
   - ✅ **Promotion queue automated** (`llm-about-promotions.js`, 2026-07-07): lists the top-N
     played tracks missing the Sonnet/Opus tier and diffs a snapshot to show which tracks
     NEWLY climbed in ("promotions that happened"). Writes `../../.sptmp/llm-promo-queue.json`
     (backlog + haiku context) for the **local Claude read pass** — the read *text* can't be
     scripted, but the work list now is. First run: 728/1000 covered, **272 backlog**.
     Re-run after scrobbles accrue; process the queue locally; the snapshot advances.
   - Still to do: run the backlog through Claude on real lyrics · 5% spot-check-vs-lyrics as
     the batch norm · style gate (no "explores themes of…") · shard the file when it next grows.
   - **⏳ FABLE INTERPRETATION ANALYSIS — IN PROGRESS, circle back (Fuad, 2026-07-07).** Fuad wants
     to generate lyric "what-it's-about" reads with **Fable 5** and weigh it against Opus.
     **Token finding (measured on the existing bake-off):** token use is a **wash** — the task is
     input-dominated (~253 tok/track of lyrics, *identical* for both models) and outputs are
     near-equal (Opus ~34 vs Fable ~35 tok/read on the 9-track overlap; input:output ≈ 7:1, ~88%
     input). So it's a **pricing + quality** call, NOT an efficiency one. Caveat: the bake-off
     Fable run used **direct generation, no extended thinking** — turning thinking on would add
     output tokens for harder lyrics.
     **Assets already in `../../.sptmp`:** `bakeoff-batch.json` (40 tracks + lyrics),
     `bakeoff-out-{fable,opus,sonnet,haiku}.json`, `gen-fable.js` (Fable gen script),
     `blurb-fable-candidates.md`, `compare-bakeoff.py`.
     **Next step when we circle back:** run a fresh Fable pass on a slice of the 270-track
     promotion backlog (real, Fuad-relevant tracks) for a head-to-head QUALITY comparison vs
     Opus/Sonnet, then decide the model for the pipeline going forward. (Quality on the bake-off
     sample looked comparable to Opus — concise, faithful.)
   - **✅ Fable dual-tier reads SHIPPING (2026-07-07):** 52 tracks with fable / 50 dual-tier —
     the top-30 played lyric tracks + the 20 hardest from the gen-fable divergence queue
     (`.sptmp/fable-hard20.json`, commit 5d462f4; Dear Diary gained a lockdown-journal layer
     in e32f7b4). Remaining queue: `blurb-fable-candidates.md` ranks ~85 more with mean ≤0.06.
     Original note: top-30 played lyric tracks carry
     `fable` (plain what-it's-about) + `fableDeep` (close-reading) in `llm-about.js`, rendered
     on TrackView as a Fable flick button + an **Info / Interpretation toggle** at the
     What-it's-about module's top right (`BlurbSwitcher`, commits 1d6a0a3 + 407f50a). Fuad's
     verdict on the reads: keep both tiers — the deep read is the differentiator.
     **Convention going forward: a "Fable promotion" = both tiers.** Instrumentals and
     tracks without archive lyrics are skipped (4 Ghosts I, Maths, Tsunami (11:11), Xen…).
     Also **unshadowed the bake-off reads**: llm-about entries used to hide blurb-demo's
     richer sets — the 8 affected tracks (incl. La Mer + Intimate Alien Fable one-liners)
     are folded into llm-about now. Workshop lists: `.sptmp/fable-top10.json`,
     `.sptmp/fable-next20.json` (+ `verify-lamer2.js` cache-proof pane check harness).

**⏸ PARKED — rest of Phase 2 (2026-07-07). Items 3–5 are GATED on the design deliberations
below (LIMITATIONS §6b) — decide the layout/structure BEFORE building:**
3. **Surface the text layer**: "read of the day" insight provider on Overview + 📖 marker on
   track rows that have reads; blurb coverage meter. *(Highest-visibility of the parked lot —
   the reads are invisible until you open a track page.)* **⚠ GATED on rearranging the Overview**
   (it's already dense — decide where the module goes first).
4. Honesty notes: "no audio data" line where radar/quadrant cards silently vanish. **⚠ needs a
   deliberate implementation** (reads as data, not an error), not a quick line.
5. Rework "Where to dig" + "Your portrait" (greenlit A4) — or hold for the era card (Phase 3.4,
   which is designed to absorb "Your portrait").
6. **Fold blurb-demo's 22 non-llm-about tracks into llm-about**, then retire blurb-demo.js
   (the Phase 0 de-bloat that was deferred because it would drop those reads). *(Not gated.)*
7. Run the 270-track actionable promotion backlog locally through Claude. *(Not gated.)*

### ✎ Design deliberations — DECIDE BEFORE BUILDING (Fuad, 2026-07-07; full text in LIMITATIONS §6b)
- **Overview rearrangement** — it's dense; decide the layout before adding the read-of-the-day /
  surfacing modules (Phase 2 items 3–5 wait on this).
- **Stories → a "quasi-book"** — Stories is getting large (~30 cards). It's fine to keep adding,
  but it wants a **restructure** (chapters / table-of-contents / paging, a real reading
  experience) rather than one long feed. Do this thinking before piling on more cards — and the
  Phase-3 artist-page strips (below) pair with it.

### 🔧 Loose UX fixes shipped this session (2026-07-07, not tied to a phase)
- ✅ **Lyric-gap fill (2026-07-08)** — read coverage to 80%/78% of top-500/1000 (7,156).
  Symmetric archive rematch (fixed asymmetric-parenthetical bug) recovered 54 vs 7; **33** dug
  reads processed via haiku/sonnet/opus subagents (multi-tier), **28** src:web reads for
  post-archive modern tracks, **3** classics upgraded web→multi-tier (Wolf Moon, Be Quiet and
  Drive, NIN Burning Bright). Rule: archive lyrics → 3-model tiers; recent → web research.
- ✅ **Thematic song search (2026-07-08)** — SearchOverlay gained a **Names / Themes** toggle;
  Themes mode scans the llm-about blurbs (~7k tracks, already deployed) for what songs are
  ABOUT, matching the query, ranking a whole-word hit over a substring then by plays, joining
  to a slug→track map for display. Zero new data/backend — pure client-side over shipped
  reads. "betrayal" → Hit the Floor/In the End; "isolation" → Wish/Dear Diary; "defiance" →
  Let Me Hear You Scream. (This was the "screams power" ask — the keyword tier; semantic/
  embeddings tier remains a future upgrade.)
- ✅ **Artist-page flow drill now scopes Top tracks + Sound DNA** — clicking an album in
  "How they played out" filters the track list to that album (with a ✕ to clear) and
  recomputes the DNA radar as the mean of the album's per-track features (track-audio
  lazy-loads; honest "n/m tracks measured"; solid = album, dashed = artist). This was
  Fuad's actual flowmap-reactivity ask — the Overview-level reactivity list stays PROPOSED.
- ✅ Album back-button now goes UP to the album's artist ("← Nine Inch Nails"), not out to Explore.
- ✅ Artist page gained a **Needle Drop** button (plays the most-played track that has a preview).
- ✅ Fixed the **Overview map-band row-shift on genre filter** — the taste-flow streamgraph grew
  with its series count (families vs a genre's subgenres), inflating grid row 1 and shoving the
  deepest-places/stats/calendar row down. Pinned the flow height (`fixedH`) in the map band.
- ✅ **Explore "load more" unified with the 8/16/24/32 count buttons** — visible count = base
  (button) + extra (load-more, +24/click, can exceed 32); buttons set the base and reset the
  expansion (reversible); now works for artists too; pool fetches `visN + 40` lookahead. *(Load-
  more step is +24 — trivially tunable if Fuad wants bigger/smaller jumps.)*

### Phase 3 · The sessions layer — ✅ COMPLETE 2026-07-07 (pure CSV, all live)
1. ✅ **Session reconstruction** (>30-min gap) + **album front-to-back** → INSIGHTS.SESSIONS
   (25,496 sessions, median 7; 437-track/13.6h longest; Machine Head *Blackening* 68× front-to-
   back). Stories "How you listen" + album-page "N× front-to-back" badge (byAlbum, 733 albums).
2. ✅ **Segue graph** — within-session X→Y, cross-artist rituals ranked first (Spider-Verse
   soundtrack chains, Trent Reznor→Santaolalla). Stories "What follows what".
3. ✅ **Personal seasonality** — month-of-year, ≥2-yr artists (Viagra Boys 92% May–Jul, Aimer
   86% Dec–Feb). Stories "Music for a season". *(Shelves lens still open — see below.)*
4. ✅ **Era auto-segmentation** — change-point (binary segmentation) on monthly genre-family mix
   → 5 chapters w/ boundaries + shift diffs (thrash→electronic pivot→metalcore takeover). Stories
   "The chapters of your taste". *(Absorbing "Your portrait" on Overview still open.)*
5. ✅ **Obsession lifecycle** — trajectory classes (flameout/perennial/slow-burn) + predictive
   "burning now" (flare% = recent share of all-time plays; Ninajirachi 88%, Chalk 100%). Stories
   "The shape of an obsession".

**Phase 3 follow-ups (small, deferred):** seasonality Shelves lens · move the era timeline into
the Overview "Your portrait" slot · a per-artist-page segue/lifecycle strip · surface these on
the artist page (currently Stories-only).

### Phase 4 · External enrichment expansions (data-PC / API sessions, cherry-pick order)
MB full dump: cover-of + work language via 39k ISRCs (approved) · Wikipedia pageviews
momentum join ("you were early") · ListenBrainz Fresh-Releases feed ("new records from
artists you play") · dig-list generator (weekly five-records card) · collab-graph shipping
(5.7k edges cached) · lyrical twins (embeddings cached) · JP lyric-DB retry for the 8
offline NONEs · "Mood over the years" into Stories (parked candidate) · wrapped mode +
share cards (parked, Fuad's call).

**◆ Tier-2/3 long-tail enrichment (Fuad idea 2026-07-07) — make the tail first-class.**
Today only the EXPLORE universe (~4,064 artists = 90.3% of plays) carries genre/geo metadata,
so place/genre slice stats undercount and the long tail is invisible in filters (LIMITATIONS
§1). Idea: derive **tiered, load-on-request** data for the *full* played tail (every artist ≥3
plays, ~30k):
- **Tier 2** — a compact per-artist `{familyIdx, country, plays}` for the whole tail
  (~30k × a few bytes ≈ 150–250 KB gz), lazy-loaded only when a filter needs exactness or the
  user opts into "include the long tail". Makes place/genre avg/day + share + heaviest **exact**,
  and lets the tail appear in Explore/map results. This is the direct fix for LIMITATIONS §1.
- **Tier 3** — richer per-tail-artist detail (top tracks/albums, tags, similar) fetched
  per-artist on demand (like `artist-detail.js` already does for long-tail artist pages) —
  extend that pattern so ANY played artist has a real page, not just the top 400.
Design notes: keep it **behind a toggle/opt-in** so first paint never pays for it; build it
from data already in the CSV + tag caches (no new API); size-gate each tier (build-data prints
sizes). Sequence after the Phase 3 sessions layer. A neat "richer on request" win, not urgent.

**◆ Phase 4+ · INSIGHT EXPANSIONS (Fable proposal, accepted for the roadmap 2026-07-07).**
The market gap Rotation already owns is *derived narrative* (sessions, eras, obsessions, reads)
vs. everyone else's mirrored charts. These deepen that moat; ranked by insight-per-effort, and
the top three run **entirely on data already in the repo** (no new API risk):
1. **Discovery genealogy** — *"how did I get here?"* Every artist has a first-play date and
   SESSIONS knows what surrounded it → infer who introduced whom ("found Ocean Grove 3/2021,
   in a session that started with Northlane"), chainable into a family tree of taste. Gives
   the eras story its missing *causal* layer. No platform on the market derives this. (cheap)
2. **Lyrical diet** — *"what do I listen ABOUT?"* Aggregate the interpretive corpus (~7k haiku
   gists + 52 Fable reads) into theme shares — self-liberation vs broken trust vs grief vs
   defiance — and track the mix across eras/calendar (did the trust-betrayal cluster spike in
   a given year?). Uniquely possible here: nobody else has interpretations. (cheap)
3. **Taste fingerprint** — *"why do I like what I like?"* Distill audio features into explicit
   sweet-spot bands (energy/valence/tempo/keys/modes), show it as a fingerprint, then score
   any album page against it ("89% inside your comfort zone; the outliers are…"). Obscurify
   gestures at this; 315k scrobbles can do it properly. (cheap-ish)
4. **Time features** (one data pass covers all): **On this day** (what you were obsessed with
   on this date in 2013/2017/2021 — a daily reason to return) · **Dormant favorites / time
   capsule** (>200 plays, zero in 3 years → "worth a revisit"; seasonality can *predict*
   returns: "Type O is a November artist for you — it's October") · **Year permalinks**
   (`#/year/2019` as a full wrapped page, shareable any day of the year). (cheap)
5. **Gig effect** (needs setlist.fm): join GIGS × scrobbles — how a concert bends the
   play-curve before/after; which songs you heard live before you loved them.
6. **Share cards** — any insight rendered to PNG (canvas/SVG). Wrapped's genius was the cards,
   not the stats; portability is how better insights actually beat incumbents. (moderate;
   overlaps the parked "wrapped mode" above.)
**Anti-goals (deliberate):** no social/accounts (breaks static architecture, little insight),
no general rec engine (post-2026 Spotify API too fragile — recommend from the user's OWN
dormant/adjacent catalogue instead = dig-list done right), no real-time anything.


**◆ PROPOSED — flowmap-reactive modules + page expansions (Fable analysis 2026-07-07; Fuad to pick):**
*What else could react to the map/genre/place selection* (today: avg/day, share, heaviest-day-time,
dots, flow, subgenres, places react): **(a) Top artists strip** — cheap (EXPLORE carries family/place
per artist; client-side filter). **(b) Sound DNA radar** — cheap for genre/place (mean AUDIO features
over the filtered artist set); date slices only at year granularity. **(c) Top tracks** — moderate
(tracks inherit the artist's family/place via media-index join; honest label needed: 'tracks BY
artists in this slice'); per-track date filtering limited to the year series. **(d) Hour heatmap /
(e) discovery timeline per slice** — need new day x family exports (heavy; defer). Recommend a+b
first, c behind the inheritance caveat. All inherit the EXPLORE-universe caveat (90.3% of plays).
*Artist-page candidates:* segue partners strip ('what follows this artist') · seasonality chip ·
lifecycle sparkline + class · discovery genealogy line ('found via X, led to Y') · era membership ·
gig effect · dormancy status. *Album-page:* aggregate sound DNA from track features · lyrical-theme
chips rolled up from track reads · listening-arc sparkline (first->peak->now) · front-to-back score
(shipped) context · similar albums. *Track-page:* segue neighbours · first-heard story (date + what
surrounded it) · time-of-day bias · era membership.
*Upward convergence (tracks -> albums -> artists):* NOT crazy — it's a build-data rollup, the data
already exists (track-audio features, llm-about/genius themes). Moderate difficulty: the cost is
page real estate + honest denominators ('7/12 tracks have reads'), not computation. Phase it:
album DNA + theme chips first, artist lyrical diet second (pairs with Phase 4+ item 2).

**◆ Fable difficult-queue status (2026-07-07):** near-disjoint tier (mean ≤0.03) **cleared**
(14/14). Strong-disagreement tier (≤0.06): 24/109 done → **85 remaining** (next up: Why Try,
Sky is Over, Delete Rewind, Blood for Blood, Hacker, Angry Inch, Dystopia…). Broader ≤0.10
band: 378 more. Caveat: divergence is only measurable on the ~1,005 batch-pool songs with all
three reads — the 270-track promotion backlog is separate, unscored material.

### Phase 5 · THE TEMPLATE — "Rotation for anyone" (open-source, ~3–4 sessions)
The packaging plan (expands M6; every earlier phase feeds it):
1. **Extract `rotation-template`** (new public repo): code only — build-data.js, sync
   scripts, enrichers, JSX, workflows, stage-site. **Excluded**: fuadex.csv, every cache,
   gigs*, llm-about/genius-*/blurb data, tweaks state. License: MIT.
2. **`config.json`**: `{ lastfmUser, displayName, tz, timezoneOffsetHours, markets[],
   families{} (hue taxonomy, shipped as overridable default), accent }` — de-hardcode
   build-data.js / sync-csv.js / sync-live.js / enrich-* against it. CI reads the username
   from config, the key from a repo secret.
3. **Capability levels, documented honestly** (the fork works at every level):
   - **L0 — last.fm key only**: full core site (scrobbles, genres, bios, insights, stories,
     explore, calendar, shelves w/ generative covers).
   - **L1 — free keyless**: MusicBrainz, Wikidata, Cover Art Archive, iTunes fallback
     (origins, family trees, lifespans, real covers).
   - **L2 — keyed APIs**: Discogs, Ticketmaster, setlist.fm (styles, tours, gigs).
   - **L3 — bring your own local datasets**: Spotify catalogue data + lyrics data (audio DNA,
     previews, lyrics-derived layers) — power users only; everything degrades without.
   - **Blurb pipeline ships as scripts** (bring-your-own-LLM-key), never as data.
4. **Setup path** (the README of the template): fork → add `LASTFM_API_KEY` secret → edit
   config.json → enable Actions + Pages → first build backfills the full scrobble history
   (sync-csv full mode) → site live. Plus `node setup.js` interactive wizard (writes config,
   validates the key, kicks the first workflow) as the friendly front door.
5. **Verification**: create a throwaway last.fm account / borrow a friend's, run the fork
   end-to-end, fix what breaks (the real test of every hardcode found).
6. **Legal hygiene baked in**: no Genius excerpts in the template · lyric text never stored ·
   attribution lines required · data-source ToS summary in the docs.
7. Distribution: GitHub topic tags, a screenshots-heavy README (reuse rotation/README.md),
   optionally a Show HN / r/lastfm post when stable. Monetization stays as judged (M6):
   Sponsors link at most.

**Decision points for Fuad along the way:** PWA (still open) · wrapped mode/share cards
(parked) · template repo name + go-public timing · whether fuad.au itself converts to
consume config.json (recommended — it makes the personal site the template's first tester).

---

## ⓪ Status snapshot — 2026-07-05 (END OF SESSION — read §1g for the open queue)

> **2026-07-05 (late) shipped, in order:** Genius language layer · pins.json · Wikidata
> (cache + LINEUPS + artist-page Family-tree) · language arc · Gigs page (+ gigs-manual.json
> corrections layer, 132 shows) · seen-live (artist card + 🎤 track rows + purple header badge) ·
> NRC sentiment ("sounds happy / reads dark" + track mood badge + emotional weather arc & NOW
> module) · THEMES layer ("what it's about", 18-anchor multilingual embeddings + Stories card +
> album roll-ups) · Genius About blurbs (meaning-only excerpts, top-2000) · two QoL rounds
> (pulse row + This-week/Streak/On-repeat, breadcrumbs, calendar bottom-sheet, calendar×map
> month filter, artist page width 1540). **ML env** lives in `../../.sptmp/mlenv`
> (torch/transformers/sentence-transformers); Genius pipeline scripts in `../../.sptmp/`.

## (superseded) Status snapshot — 2026-07-05 (evening)

> **2026-07-04 update:** second layout pass shipped (one-row Overview pulse, 3:3:2 map band
> w/ places+calendar row 2, Explore 6-col genre grid, artist page: metrics-under-radar +
> Sounds-like in row 2, centered bottom pair). Full grounding audit + forward plan written to
> **AUDIT-2026-07.md** (perf priorities: CI precompile → music-data split; API deltas:
> Spotify Feb-2026 tightening, ListenBrainz/Odesli/Wikimedia-pageviews adopted as candidates).

**Latest PC/layout pass shipped:** Overview command centre finalised (compact calendar in the
pulse row; full map band at 2:3, height-matched, one legend, clear-filters button, results
list⇄grid; stats under the flow & **filter-reactive** hours/artists). Artist page recomposed
(bio → DNA-left-half+tracks+albums → sounds-like/timeline/family-tree; albums covers⇄list;
sounds-like 8/16 + by-sound 8/16/24). Calendar gained a **vertical Rhythm clock** (moved from
Explore). Explore reflowed (sort row + mood-arc below the module; **2×6 genre grid**,
scrollable). **Subgenre spelling variants merged** (`SUB_CANON`). Lyrics dataset (`archive_genius.zip`)
is local + gitignored, ready to ingest.

---

## (earlier) Status snapshot — 2026-07-05

### Shipped (see ARCHITECTURE §8 for details)
Platform: prod React · error boundary · CI-built Pages deploys w/ smoke gate + auto-retry +
post-deploy CSV persist · weekly enrichment (build-first fix) · headless screenshot + overflow
audit tooling. **Data**: kept artists 200→400 · covers 17.7k base + ~2.9k recovered (fuzzy +
CAA + iTunes + 462 name-corroborated artists) · total_tracks (19k albums) · **39k ISRCs** ·
34.5k preview hashes · 5.7k collab edges · unplayed-LP diff (6.5k) · LIFESPAN insights ·
MB origins search-fallback. **Features**: Shelves V1+V2+V3 complete (spines/lenses/needle
drop/shrinkwrap/drag-pan) · 30-s previews on TrackView w/ iTunes fallback · Stories chapters +
scrollspy TOC + deep links + fresh dots + 2-col PC magazine · Overview command centre (bento,
12-artist wall, calendar rail, FULL map in 3:2 grid, Map tab retired) · Artist PC 3-col
composition · Explore 10/20/40 window · mini-page track/album links · `#calendar/day` +
`#stories/x` deep links.

### Open — build queue (rough order)
0. ~~Rhythm clock Explore → Calendar~~ ✅ DONE — now a `ClockCard` (all-time + per-year) at the
   bottom of Calendar; the clock-cell *filter* was retired from Explore.
0b. Overview command centre finalised: calendar in the pulse row's top-right (cross-filters the
   full-width map band below); lifetime stats one row under the map; Top Artists dissolved into
   the map Results (list⇄grid). Calendar day/week filters the *Results* (calendar-detail); the
   map *dots* still need a per-day geography export (item 5).
1. ~~Genius lyrics ingest — language layer~~ ✅ **SHIPPED** (`.sptmp/genius-match.py` streams the
   local lyrics dataset → `rotation/genius-lyrics.json`, 25,904 tracks matched, 37 languages;
   `INSIGHTS.LANGUAGE` play-weighted shares/per-year/top-non-EN; "What you listen in" Stories
   card). **Next Genius passes:** per-year language *arc* (streamgraph), themes/sentiment vs
   audio-valence ("sounds happy / reads dark"), lyric stats on the track page, the embeddings
   companion for semantic clustering.

1e. **Language arc + "sounds happy / reads dark" — data-weight assessment (2026-07-05).**
   *Language arc:* ~~~free, needs a card~~ ✅ **SHIPPED** — `LANGUAGE.arc` (per-year non-EN share +
   top-5 non-EN languages' slice) → "How the languages moved" Stories card (reuses `<Spark>`).
   Surfaces the 2015 German spike, 2018 Polish peak, Japanese climbing to ~9.5% by 2025.
   *Sentiment ("sounds happy / reads dark"):* ✅ **SHIPPED** — decided NRC + multilingual.
   `.sptmp/genius-sentiment.py` streams the local lyrics corpus, scores each lyric in its own
   language's NRC EmoLex (space-token for Latin scripts, char n-gram for JA/ZH — no word
   boundaries), emits `genius-mood.json` (25,286 tracks, committed). `INSIGHTS.MOOD` crosses it
   with Spotify per-track valence (`TRACKDATA[5]`) over 18,991 tracks: library sounds 34 / reads
   44; 222 bright-sound/bleak-words (How to Destroy Angels, Rammstein, SOAD), 746 reverse.
   "Sounds happy, reads dark" Stories card. **CJK caveat:** n-gram lexicon match, no context
   model, so JA/ZH are best-effort. **Follow-up:** per-track mood badge on TrackView (data's in
   `genius-mood.json`, just needs a lazy export + render). Original weight note below still holds:
     • *audio valence* ("sounds happy"): already have it **per-artist** (`audio-features.json`,
       3,905 artists, `valence` 0–1). Per-*track* lives in the local
       `spotify-audio-features.parquet` — extractable exactly like `extract-audio.js` does now.
     • *lyric valence* ("reads dark"): **new pass needed.** `genius-lyrics.json` stored only
       `[lang, tag, year, wc, uniq]`, not sentiment. Score the matched lyrics from the local
       `song_lyrics.csv` (a VADER / NRC-VAD lexicon pass in `.sptmp`, English-only to start), emit
       one 0–100 int per track.
   *Weight:* ~25.7 k matched tracks × two small ints → a single lazy file `track-mood.js`
   (~150–400 KB, same pattern as `track-audio.js`). **Well under any need to "dice" the data
   files.** Dicing only becomes relevant if we go per-track *embeddings* or store full lyric text.
   *Insight:* cross the two — high audio valence × low lyric valence = "sounds happy / reads dark"
   (and the inverse); surface the sharpest divergences as a Stories card + a badge on the track
   page. **Open design choices for Fuad:** which lyric-sentiment lexicon (VADER vs NRC-VAD vs a
   small model), and English-only v1 vs multilingual (Polish/German/Japanese need per-lang
   lexicons). Recommend: ship the language arc first (free), then v1 sentiment English-only.

1f. **Deep text layer — status 2026-07-05 (evening).** Also shipped since: per-track mood badge
   (TrackView Sounds-vs-Reads strip, `genius-mood-lazy.js`), 🎤 seen-live on track rows, and
   **MOOD.arc "Emotional weather"** (per-year sounds/reads + dominant lyric emotion — fear ruled
   2010–2025, 2026 flips to trust). **Wikiquote: PINNED by Fuad** — probe verdict: good for
   canonical EN films (Apocalypse Now 37 / Clockwork 36 / Shining 30 quote lines), no page or
   empty for art-house/non-EN (Come and See, Possession, La Haine mis-resolves to "Laraine Day"),
   so it needs strict year/director validation if ever revived. **ML env now local**:
   `../../.sptmp/mlenv` (torch 2.12 CPU + transformers 5.13 + sentence-transformers 5.6);
   emotion transformer validated on transcripts (fixes NRC's Requiem-reads-hopeful failure;
   0.6 s/film). **Direction per Fuad: emotion arcs alone read superficial — go deeper: themes
   ("what it's about"), semantic structure, cross-corpus (lyrics × scripts) correlations.**
   → **SHIPPED same evening:** (a) **THEMES layer** — `.sptmp/genius-themes.py` multilingual
   embeddings × 18-anchor taxonomy → `genius-themes.json` (25,472 tracks) → `INSIGHTS.THEMES`
   + "What it's all about" Stories card (madness&mind 22% and rising, anger/occult fading;
   embeddings cached in `.sptmp/lyric-embs.npy` for lyrical-twins / cross-corpus next).
   (b) **Track blurbs** — `.sptmp/fetch-abouts.py` harvests Genius "About" by song id
   (public endpoint, play-ranked +1000/batch chain) → `genius-about.json` (top 1000: 656
   blurbs, 66%) → lazy `genius-about-lazy.js` → TrackView blurb w/ via-Genius link.
   (c) **Album roll-ups** — lazy `genius-themes-lazy.js`; AlbumView "Mostly about X, with Y".
   Taxonomy rule per Fuad: coarse labels ONLY under graphs/aggregates; per-song = specific text.
   Local-LLM gap-filler (Qwen 1.5B) tested: agrees w/ ground truth on EN, weak PL, hallucinates
   on garbled lyrics — parked as gated EN-only v2 until the Genius chain's real gap is known.
   **NEXT enrichment chain: `python fetch-abouts.py 1000` (needs `.sptmp/genius-ids.json` +
   `track-ranks.json`, both present) then rebuild + commit genius-about.json.**
1g. **OPEN QUEUE — handoff snapshot (2026-07-05 end of session).** Everything below is designed
   and unblocked; ordered roughly by closeness-to-done:
   • **Genius About chain** — top 3,000 fetched as of 2026-07-05 evening (full texts cached in
     `../../.sptmp/genius-about-full.json` so excerpt logic re-derives offline free,
     `python fetch-abouts.py 0`). Continue: `python ../../.sptmp/fetch-abouts.py 1000` →
     rebuild → commit `genius-about.json`. 681 meaning-blurbs shipped / 1,041 context-only
     cached-but-hidden / 1,274 no About. Next per Fuad: once populated, figure out how to
     navigate the trivia-only entries and drill deeper (LLM gap-filler still parked).
   • **Gig corrections awaiting Fuad**: Coaltar of the Deepers correct date+venue (setlist.fm
     a marking may be a stand-in); NO WORDS NEEDED exact May-2025 day; was the
     Haru Nemuri 2026-06-06 ANTIKNOCK show ALSO attended (if so: two entries, drop override);
     venues for Mariko Goto/DHMHTHP/Bleach/Zinchikurandan (≈-dated Tokyo shows). All go in
     `gigs-manual.json` (add/override; month-precision + approx:1 + copySongsFrom supported).
   • **Lyrical twins** — embeddings ALREADY CACHED (`../../.sptmp/lyric-embs.npy` + `lyric-keys.json`,
     25,741 tracks): same-theme/different-sound pairs = cosine-near lyrics × distant audio DNA.
     Pure computation, no re-streaming.
   • **Film themes from synopses + film↔music cross-corpus kinship** — designed: embed Culture's
     OMDb/TMDB plot texts in the SAME anchor space as lyrics (transcripts proven WRONG for themes —
     dialogue ≠ theme); then cross-domain neighbours ("Come and See ↔ your war-metal shelf").
   • **Transformer upgrades** (mlenv ready, validated): re-score lyric mood (v2 genius-mood, fixes
     NRC bag-of-words) ~40 min CPU; film emotional-arc sparklines 20-segment (~1 h) + story-shape
     clustering — was Fable's #1; Fuad called plain arcs superficial, so ship WITH themes, not alone.
   • **Culture texture bundle** (proposed, liked): one pass → `script_texture.js` = per-film arc +
     TF-IDF vocab fingerprint + texture stats (questions/exclaim/profanity/first-F-bomb). Also
     parked ideas: title drops, cliché census (7+-word shared lines), language-of-decades essay.
     LLM blurb gap-filler parked (EN-only + gates); Wikiquote PINNED (needs year/director validation).
   • **Per-day geography export** — the real fix for calendar×map (current: period top-5-artist
     origins only). New build export: per-period place plays → full dot re-weight.
   • **Module reader pattern** (Fuad idea, liked): pulse-row modules click-open an overlay reader
     (Recently played → history, This week → risers, Streak → streak history). Do as ONE component.
   • **Gigs map layer** (coords in gigs.json); **Wikidata follow-ups**: exact formation coords →
     GEOGRAPHY.cityPoints, dissolved/inception → LIFESPAN backfill, P737 influenced-by graph.

1b. ~~**pins.json**~~ ✅ **SHIPPED** — name→forced `{mbid, spotify, discogs}` + `clearStyles`/
   `clearLife` override map, consulted by build-data at read time (and by enrichers going
   forward). Seeded **Bleach** (JP punk ids), **daine** (`clearStyles` → out of the Baroque/Organ
   Style-Atlas row), **Brutus** (`clearLife` → out of the 1966 elders). NOTE the gotcha: pins had
   to be wired at the *actual* read-points — STYLE_ATLAS read `DISCOGS[name]` and LIFESPAN read
   `ORIGINS[name]` directly, bypassing the `stylesOf`/`lifeOf` helpers. Add new offenders here.
1c. ~~**Wikidata**~~ ✅ **SHIPPED** — `enrich-wikidata.js` (keyless batched SPARQL, MBID via P434).
   2,443 mbids → 1,474 matched → `wikidata-cache.json` (committed like the other build caches):
   formation city+coords (P740/P625, 816 artists), country (P495), dissolution (P576), band
   members+gender (P527/P21, 497 artists). **`INSIGHTS.LINEUPS`** = the layer MB can't give (its
   `gender` is null for Groups): 22% of band-listening has women in the lineup, 40/213 bands,
   all-women set + biggest lineups; "Who's in the bands" Stories card. **Unused so far** (cheap
   follow-ups): formation-city coords could sharpen `GEOGRAPHY.cityPoints` (exact vs gazetteer);
   `dissolved`/`inception` could backfill LIFESPAN; `P737 influenced-by` → a future lineage graph.
   **NEW: Wikidata now also on artist pages** — the Family-tree card shows "Formed in {city},
   {year}(–{diss})" + gender-dotted member chips (accent = woman) + Wikidata-only members merged
   in (`wdOf` in build-data; 217/400 kept artists carry it).
1d. ~~**setlist.fm Gigs page**~~ ✅ **SHIPPED** — key `SETLIST_FM_API` in `fuad.au/.env`, user
   `fuadex`. `enrich-gigs.js` → `gigs.json` (88 attended shows, committed like other caches);
   build-data joins → `ROTATION.GIGS` (in-library depth, setlist×rotation overlap, "pre-fan"
   catches). New **Gigs** nav tab (gated on `ROTATION.GIGS`) + GigsView: hero stats, Seen&loved,
   Before-you-were-a-fan, Passed-through, city breakdown, newest-first timeline. **Follow-ups:**
   a proper gigs map layer (coords are in `gigs.json`; only ~7 cities so a bar list ships for now);
   re-run `enrich-gigs.js` to refresh after new shows (not in the daily CI job — manual).
2. **Wrapped mode** — **PARKED by Fuad** (keep for later). share-card PNG test still open.
3. Explore **mood-lens slowness** (bug) · **pins.json enforcement** (Brutus-1966 elder + daine's
   classical Discogs styles still live) · canon-aware coverage census re-run
4. Shelves follow-ups: deep links, tag-source filter, dust (REVISIT), artist-page shrinkwrap
   strip, comp-noise flag (archive query)
5. **Per-day geography export** → calendar rail filters the map/results for real
6. MusicBrainz full-dump stage: cover-of + work language (ISRC joins) · `enrich-wikidata.js`
7. iTunes probe residue ~880 albums · Discogs-dump formats lens · M6 template extraction

### Known data-limited tandems (need a new export)
- Overview calendar day/week filters the map **Results** but not the map **dots** — per-day
  geography export needed.
- Calendar vertical hour-clock: selecting an hour can't yet filter the heatmap (no per-day
  hour-of-day data; only all-time/per-year `CLOCK`/`CLOCK_BY_YEAR` exist). A per-day hourly
  export would unlock both.

### Waiting on Fuad
setlist.fm account + gigs (M2) · Spotify extended-history request (M3) · `residences.json`
(M4 location features) · responsiveness re-test verdicts · PWA yes/no.

---

## ① Audit findings

### A1 · Performance — ✅ largely RESOLVED 2026-07-03 (`06f9f1e`)
- ~~Shipping React development builds~~ → production builds, SRI-pinned (−1.4 MB runtime).
- ~~Dead keys in music-data.js~~ → CONSTELLATION/CLOCK_CUBE/SOUND_BY_YEAR/SUB_FLOW dropped
  (3.74 → 3.52 MB). Further `EXPLORE`/`INSIGHTS` fat-trimming still possible.
- **Open:** in-browser Babel still compiles ~450 KB of JSX per load — *by explicit choice*
  (buildless philosophy; Fuad opted to keep it, 2026-07-03). A `precompile.js` option remains
  on the table if phones ever feel it. No `defer` on data scripts either.

### A2 · Repo & operations — ✅ RESOLVED 2026-07-03
- ~~Daily commits of ~19 MB generated JS~~ → **CI-built deploys**: Pages source = "GitHub
  Actions", generated files gitignored, workflow commits only the CSV delta and ships `_site/`
  as an artifact. `smoke.js` gates every deploy.
- ~~Enrichment staleness~~ → `enrich.yml` weekly incremental refresh (last.fm + MusicBrainz).
- **Open:** concert data still needs its own automation once M2 lands.

### A3 · Resilience & correctness — mostly resolved
- ~~No error boundary~~ → `<Boundary>` wraps every routed view.
- ~~Explore state unshareable~~ → full slice serialized into the hash. **Map filter state is
  still not in the URL** (mode/focus/year/genre) — do when Map is next touched.
- **Open:** unpkg is a single point of failure (SRI-pinned but availability-coupled). Consider
  self-hosting the three runtime files.
- **Open:** name-ambiguity pins (Bleach-class) are manual — a `pins.json` the enrichers consult
  (name → forced mbid/spotify/discogs id) would make them durable. **Required before the CAA
  cover run** (Fuad explicitly wants no Bleach repeats).

### A4 · UX / product
- ~~No favicon/social meta/OG image~~ → shipped 2026-07-03 (favicon.svg + og.png + OG/twitter meta).
- **Overview overhaul — GREENLIT** (Fuad, 2026-07-03) with constraints: **keep current features
  as they are**, except "Where to dig" and "Your portrait" which may be changed/reworked.
  Approved direction: expand/dynamize (risers–fallers strip vs baseline, lately⇄all-time toggle
  on the top wall, story-of-the-day big bento card, live count-up). Any *substantial* change or
  purge of other existing cards → ask first, Fuad reviews.
- **Stories overhaul — GREENLIT**: chapters (Depth&Taste / Time&Rhythm / Geography&Scenes /
  Life&Death) + sticky TOC + per-story deep links, freshness-based ordering, more interactive
  cards (Their Era / Flameouts / Constants get controls like Year-in-Review).
- **Design overhaul wanted**: mobile responsiveness still patchy, desktop needs a real pass.
- **Bug:** literal `[object Object]` — Fuad reports it near **Daine**. Hunted 2026-07-03 without
  a hit: comebacks, style-atlas, gateways, search overlay, ArtistMeta, artist-flow, adetail all
  render clean; her record fields are sane (React would throw on object children, so it must be
  string/attribute coercion). **Need a screenshot/page pointer.** Side-catch: daine's Discogs
  match is a wrong classical "Daine" (styles Baroque/Organ — she leads the Style-Atlas "Organ"
  row) → pins.json case.
- Tracks without Spotify features (~0.5%) and artists without AUDIO rows silently lose radar/
  quadrant cards — a subtle "no audio data" note would read as data, not bugs.
- Real album art exists for ~17.7k albums; the rest render generative — CAA fills the gap (M1).

### A5 · Code health
- Dead views (Charts/Clock/SoundMap/Eras/Constellation) — delete or archive; they confuse every
  future session (this audit exists partly because features kept getting "lost").
- `rotation-views2.jsx` is 107 KB and holds four unrelated pages; when next touched, split into
  `rotation-artist.jsx` / `rotation-media.jsx` (album+track) / `rotation-live-view.jsx`.
- Design-tool artifacts (`design-canvas.jsx`, `variant-*.jsx`, `Shader Wallpapers.html`) sit in
  the deploy root — move to a `/lab` folder or exclude from Pages.

---

## ② API & data-source catalogue (evaluated)

### Verified working / already integrated
| Source | Status | Notes |
|---|---|---|
| last.fm API | ✅ core | scrobbles, tags, bios, similar, global stats. **Unused freebies: `user.getLovedTracks` (a "loved" signal!), `track.getTopTags`** |
| MusicBrainz | ✅ integrated | origins, aliases, relations, release-groups, gender + life-span (stored since 06-30, shown via `ArtistMeta`). **Still-unstored freebies: release-group secondary types (live/comp/remix), release-group IDs (→ CAA covers)** |
| Cover Art Archive | ✅ verified 07-01 | `coverartarchive.org/release-group/{id}/front` — free, keyed by the release-group ids we currently discard. THE album-art unlock |
| Discogs | ✅ integrated | styles, members, profiles, images, **official URLs (2,937 artists, stored but unused)** |
| Spotify Web API | ⚠ limited | post-2026: id/photos/genres only for catalogue; **user-scoped endpoints still alive: /me/tracks (liked), /me/top, recently-played, playlists** — dev-mode app on own account is fine |
| Spotify catalogue dataset (local) | ✅ local | large local input; per-track features + album art + meta already extracted. Re-query locally for anything track-level |
| Ticketmaster Discovery | ✅ LIVE weekly | 5k req/day free. `enrich-tm.js` + tour.yml (Mondays) → TOUR block. Attraction `externalLinks.musicbrainz` = exact library join; `attractions?id=a,b,c` batching verified. `enrich-concerts.js` is the older dormant per-artist keyword variant |
| setlist.fm | ✅ verified 07-03 | free key; `GET /user/{userId}/attended` returns concerts you marked attended (paginated) + full setlists → **the gig-history spine** |

### Evaluated & rejected (don't re-litigate without new evidence)
| Source | Verdict |
|---|---|
| AcousticBrainz | ❌ tested 2026-06: ~40% coverage, gender classifier is a coin-flip, genre_dortmund degenerate. Dead project |
| Bandsintown API | ❌ keyless API killed (403); partner-only now |
| Songkick API | ❌ partner-only since ~2020 |
| Bulk metadata SQLite source | ❌ cover URLs locked in a single very large file; wrong tool (CAA wins) |
| Spotify audio-features/recommendations API | ❌ deprecated Nov 2024 for new apps (local dataset replaces it) |
| Generic third-party cover dumps | ❌ no join key to our library |

### Candidates — triaged 2026-07-03 (Fuad's calls)
- **Spotify "Download your data" export** — unchanged, waiting on Fuad's request.
- **Wikidata — APPROVED for a planned pull** (batch SPARQL, NOT scraping: one query covers
  100s of artists via the MB→Wikidata links we hold; whole library ≈ a dozen requests).
  **Pull plan (next enrichment stage):** per artist QID (from MB relations): ① band **member
  genders** (P527 members → P21 gender) → band-level vocal/gender approximation; ② **hiatus /
  reunion** (P2032 work-period end + start again); ③ precise **origin city** (P740 formation
  location) where MB beginArea is empty (daine's Melbourne case); ④ awards (P166, low priority).
  Output: `wikidata-cache.json` keyed by artist name, enricher `enrich-wikidata.js`.
- **MusicBrainz "cover of" + work language — APPROVED** ("fantastic addition"): now unblocked
  by ISRC (stage 2) — recording-level lookups become exact. Plan with the Wikidata stage.
- **iTunes Search — APPROVED as tier-3 cover fallback** (keyless, high-res art). Deezer —
  dropped ("very niche").
- **ListenBrainz** — interesting, unscheduled.
- **Genius lyrics — PROMOTED to the build queue (Fuad, 2026-07-05)**: a local lyrics
  dataset (**language column included**); companion local embeddings dataset for
  semantic/mood clustering without local NLP. Pipeline: match our 60k tracks
  (normalizers + artist) → language layer first, themes/sentiment after. Not the API
  (no lyrics in it) — the local dataset. (Dataset provenance kept local.)
- **Other dumps catalogued 2026-07-05**: MusicBrainz weekly full dump (~6 GB, bulk cover-of/
  language via our 39k ISRCs), Discogs monthly XML (credits/formats), ListenBrainz dumps
  (percentile context + name→MBID mapping), Spotify Million Playlist (optional co-occurrence
  similarity). All fit the ≤30–40 GB one-at-a-time processing budget.
- **Open-Meteo** — backburner until residences.json exists.

---

## ③ The plan — modular, ordered by leverage

Each module is independently shippable. Suggested order: **M0 → M1 → M2 → M3 → M4 → M5** —
foundations first, then the two big new data domains (gigs, personal Spotify), then the
correlation layer that feeds on all of it.

### M0 · Foundations — ✅ SHIPPED 2026-07-03 (`06f9f1e`)
Production React · error boundary · dead-code purge · smoke.js gate · CI-built Pages deploys
(generated files out of git) · weekly enrich.yml · Explore→URL state · OG meta + favicon.
Left open, deliberately: Babel stays in-browser (Fuad's call); runtime files still on unpkg;
Map URL state pending; views2 split opportunistic.

### M1 · Use what we already have — IN PROGRESS (audit run 2026-07-03)
1. **Cover-art gap — audited.** Numbers: 33.7k albums, 53% covered raw but **84.5%
   play-weighted** (misses are the 1–2-play tail). Fuzzy tiers (id-anchored, conservative)
   added +183. Residue: **13.8k albums whose artists lack a pinned Spotify id** (→ archive
   pass 2 below) and **1.8k title-mismatches** → CAA probe (per-artist MB release-group browse
   + front-250 HEAD) completed: 735 covers; then **iTunes tier-3 probe** added 775 more and
   the stage-1 **name-corroboration pass** (462 recovered artists) another 1,461. Extra cache
   now **~2,940 covers** on top of the 17.7k base; residue ≥3 plays ≈ 880 albums (mostly
   bootlegs/fan-club). Fills live in `spotify-album*(art|meta)-extra.json` (additive; base
   wins). **`pins.json` still to build** before more name-keyed enrichment (Brutus-1966 elder
   and daine's classical Discogs styles = live offenders).
2. **Official URLs** on artist pages (Bandcamp/site/Wikipedia from discogs-artist.json —
   2,937 stored, unused).
3. ~~Exploit `ended`~~ → ✅ **INSIGHTS.LIFESPAN + "The ones that ended" Stories card shipped**
   (2026-07-03): ended-while-listening with plays before/after, graves dug up, elders, median
   band life, worst year. Still open: origins backfill 4,764 → full universe; feed M2's
   "caught them in time"; an insight-engine provider.
4. Discogs bios as fallback where last.fm bio is empty.
   *(last.fm loved tracks: dropped — Fuad's loved data is uncurated/unreliable; the real
   "liked" signal arrives with Spotify in M3.)*
5. **Local-dataset pass 2 — APPROVED 2026-07-03, staged within the local disk budget**:
   - **Stage 1 (running)**: artists + artist_albums + albums + album_images + artist_genres
     → name+title-corroborated artist matching (≥2 title agreements) for the 13.8k
     cover-less albums / missing Spotify ids (Hyper, Bowie, Stones), `total_tracks` → per-album
     completeness ("played 7 of 12" — approved), artist_genres re-pull (PRO8L3M/Gorillaz gaps).
   - **Stage 2**: the tracks + track_artists tables → **ISRC** (exact MB
     recording joins — approved), **`preview_url`** (30-s hover-preview per song — approved,
     "killer feature"), disc numbers, **collaboration graph** from full multi-artist credits
     (approved). Delete the local tables after each stage.
   - ~~playlists crowd-context~~ — **dropped** (Fuad: "global playlists is meaningless to me").
   - `spotify_artist_redirects.json` → feed pins.json.
6. **NEW — enrichment bug classes** (from enrich-coverage.js, 2026-07-03):
   - **comma-in-name artists get ZERO enrichment** ("Time, The Valuator" 228 plays / 0 caches;
     "Fear, and Loathing in Las Vegas") — enricher artist-list CSV parsing splits on commas;
   - **variant names not canonicalized for enrichment** (Motorhead vs Motörhead, "Trent Reznor,
     Atticus Ross" vs "…and…", Smashing Pumpkins ±The) — share build-data's CANON with enrichers;
   - **origins/MB missing when last.fm has no mbid** (Ling Tosite Sigure 2,681 plays!, Haru
     Nemuri, Melt-Banana) — add MB *search* fallback;
   - bios cap historicaly 250 → weekly job now backfills to 3000.
7. **Undated scrobbles (3,134) — DECIDED 2026-07-03**: keep the current behaviour — smear them
   across 2006 → the first dated scrobble (2010-04-11). No exclusion, no recovery attempt.
   (Cards that must not be polluted by the synthetic era already filter on
   `UNDATED_REMAP_START`; keep doing that for new year-sensitive insights.)

### M2 · Gigs & live module (the concert thread) — ~2–3 sessions
*Spine:* **setlist.fm attended list** — Fuad decided (2026-07-03) to create a setlist.fm
account and mark his concerts there (`GET /user/{id}/attended`, free key, setlists included) —
plus a manual **`gigs.json`** for festivals/shows setlist.fm lacks
(`{artist|festival, date, venue, city, rating, favorite, note}`).
1. `enrich-gigs.js`: pull attended shows + setlists from setlist.fm, merge gigs.json,
   venue/city geo. **Blocked on: Fuad's setlist.fm username + populated attendance.**
2. **Gigs tab**: timeline + map (reuse world-map + streamgraph infra), per-gig cards.
3. Correlations: gig ↔ scrobble history ("you played them 3× more the month after"),
   **seen vs never-seen coverage** of top artists, setlist ↔ your-top-tracks overlap
   ("they played 7 of your top 10").
4. **"Caught them in time"** (emotional centrepiece): MB end-dates × gig dates — bands you saw
   before they ended vs ones that got away.
5b. ✅ SHIPPED 2026-07-06 on top of 5: **tour explorer + ledger.** Gigs "On tour now" gained
   three composing cross-filters — GENRE CASCADE (families as a proportional flex bar;
   picking one unfolds its subgenres; primary-subgenre semantics so segment sizes = filter
   results), event MAP (equirectangular SVG reusing world-map.js land paths; city dots sized
   by event count, click = city filter; hovering an artist row traces their tour path as a
   dashed polyline), and D/W/M CALENDAR strip (gap-preserving buckets). Each vis shows the
   distribution within the other two filters. Events carry `ll` [lat,lng] in tm-tour-lazy.
   Plus GIGS.coverage ledger (seen / still-possible / gone-for-good / second-chances over
   kept ARTISTS + caught-in-time, goneList/caughtList/chanceList chips section) and the
   artist-page "Reactivated" badge (replaces Disbanded when a group has fresh dates; deceased
   Persons keep Died — tribute billings). Sound DNA moved to the artist page's bottom row
   (flow + albums breathe). Refinement queue: genre cross-check on name-only TM joins
   (Bleach/Verviers is probably a different Bleach than the Okinawa one Fuad saw — right
   badge, possibly wrong evidence).
5. ✅ SHIPPED 2026-07-05 (superseding the old Live-tab idea): **location-first tour pull** —
   `enrich-tm.js` (Sydney/Tokyo/Warsaw, 1200 km, longest window, date-cursor past the
   1000-item paging cap) → `tm-events.json` (committed, matched events only; joins lineup
   `attractions[]` to the library by MusicBrainz id first, normalized name second) →
   build-data `TOUR` block → Gigs "On tour now" section (reactivated badge for disbanded-yet-
   touring GROUPS, per-event outlet links) + amber "On tour" badge in ArtistMeta (`a.onTour`)
   + `tm-tour-lazy.js` (in apps.json deploy[]). Weekly `.github/workflows/tour.yml`
   (TICKETMASTER_API secret set). Known limits: TM has zero Japan inventory (Tokyo market kept
   as a canary); name-only joins can collide (Bill Evans case) — genre cross-check is the
   open refinement; artist-first batched `upcomingEvents` sweep (attractions?id=a,b,c — verified
   working) is the future "on tour anywhere, not just near your markets" extension.

### M3 · Personal Spotify module — ~2 sessions + waiting on export
1. **Request the extended streaming history export now** (up to 30 days' wait).
2. Fast tier meanwhile: Liked Songs via API (`/me/tracks`, dev-mode app) → `spotify-liked.json`.
3. **Liked × played quadrant**: guilty pleasures (high-play/unliked) vs aspirational backlog
   (liked/unplayed); liked-set DNA vs played-set DNA ("you *like* darker than you *play*").
4. Extended history ingest → parallel play-log in build-data: fills last.fm gaps, adds
   **skip-rate per artist/track**, platform split, `ms_played` true listening time vs scrobble
   counts. Reconciliation story ("the mobile era last.fm missed").

### M4 · Correlation lab (the "learn about myself" engine) — ongoing
**Prerequisite: `residences.json`** — Fuad has lived all over the world, so any
location-dependent correlation (weather, local time-of-day before ~2016, "local scene" effects)
needs a simple personal timeline: `[{from, to, city, country, tz}]`. Ten minutes of manual
entry unlocks a whole lens: *eras by home city* ("what Warsaw sounded like vs Sydney"),
correct local-time clocks per era, gig proximity. Build this first.

The payoff layer; each item is a build-data export + a Story/insight card:
- **Sound × time**: energy by hour-of-day/day-of-week; tempo of 3 AM vs 3 PM; season × valence
  (do Sydney winters darken the palette?); year × key/mode drift.
- **Weather × listening** (Open-Meteo backfill, keyless).
- **Lifecycle models**: artist half-life (discovery → peak → decay curves, per genre); binge
  signature (do you binge albums or shuffle artists?); repeat-gap distribution (same track twice
  in a day/hour).
- **Language over time** (MB work language / script detection): the JP-music arc quantified.
- **Covers**: MB "cover of" rels — share of covers, favourite covered-artist.
- **Network centrality**: which member-connection actually gates the most plays.
- Insight-engine expansion: providers for gigs (M2), liked (M3), weather, language —
  the Overview feed gets deeper automatically.

### M5 · Platform polish — partially approved 2026-07-03
- **Wrapped mode — APPROVED**: per **year and month**, likely integrated with/entered from the
  Calendar (click a year/month → full-screen swipeable card-by-card reveal built from
  YEARS/calendar-detail data). Prototype and see where it takes us.
- **Shareable stat cards — APPROVED as a test**: one story card → PNG export first, judge, then
  generalize.
- PWA/offline: explained to Fuad, awaiting his verdict.
- Stories mini-TOC; per-story deep links (`#stories/adoption`) — folds into the Stories overhaul (A4).

### M7 · SHELVES — the record shop (Fuad's flagship; V1+V2+V3 SHIPPED 2026-07-04/05)
Live: flat-tone spines (pastel + gradient rounds rejected) with wear tiers · drag-to-pan rows
+ progress % · progressive covers (64→300px) · caps 540/+720 · lenses (genre/decade+5yr/
found/mood+depth/completeness) with animated splits · Reader (vinyl spins behind text, iTunes
needle fallback, lastfm/Spotify links) · shrinkwrapped mode (6.5k unplayed LPs) · crate dig.
- **Still open**: deep links (#shelves/<lens>), tag-source filter (last.fm ⇄ Discogs ⇄ Spotify
  genres — needs client exports), dust (REVISIT), artist-page shrinkwrap strip, comp-noise
  flag, "rack everything" perf toggle.
- ~~V3: the Unplayed Shelf~~ → ✅ **SHIPPED 2026-07-04**: "shrinkwrapped" mode — 6,565 LPs by
  20+-play artists never pressed play on (archive diff, junk-filtered; `spotify-unplayed.json`
  cache → lazy `shelves-unplayed.js`). Sheen on spines, adapted Reader, crate-dig digs the wall.
  Known noise: multi-artist comps (WWF/Chef Aid class) survive — killing them needs a per-album
  "artist owns ≥half the tracks" flag from a future archive query.
- Spines: flat uniform tone (Fuad 2026-07-04) — no gradients/bands, wear = lighter tone + glow.

### M6 · Open-source "build your own Rotation" — exploratory (Fuad, 2026-07-03)
Friends showed interest; nothing this deep exists as a product. Direction: keep fuad.au as the
personal instance, extract a template repo (`rotation-template`): fork → add your last.fm
username + API key secret → Actions builds your CSV + caches → your own Pages site. Needs:
config file instead of hard-coded fuadex/TZ/genre-families, secrets-only keys, personal data
(CSV/caches/gigs) split from code, docs. Monetization judged flaky (hosted SaaS = API ToS +
infra + support burden); realistic paths are GitHub Sponsors / donations, or a paid "set it up
for me" concierge. Decision pending — design new features template-aware from now on.

---

## Parking lot (unranked)
Vinyl/format breakdown (Discogs release formats) · supergroup detection (MB rels) · festival
lineup auto-pull (setlist.fm/Wikipedia) · Discogs collection value tracker · listening-goal
widgets (streak defense) · "十年前 today" push-style digest page.
