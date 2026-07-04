# fuad.au — Hub migration plan (Rotation + Culture, and beyond)

> **Goal.** Turn `fuad.au` from a single app (Rotation) into a **hub** that hosts several
> self-contained personal apps. First two: **Rotation** (music) and **Culture** (film / TV /
> games / books). The design must stay *agile* — adding a future app (e.g. **Museums/paintings**
> or **Travel/location history**) should be a folder + one manifest line, not a refactor.
>
> Status: **PLAN ONLY** — no files moved yet. Decisions confirmed 2026-07-04:
> 1. Chooser lives at **root**; apps live under subpaths (`/rotation/`, `/culture/`).
> 2. **Everything** of Culture_2 moves into `fuad.au/culture/` (workshop + data), caches gitignored.
> 3. This document is the deliverable; implementation follows separately.

---

## 1. Why this is clean (and where the sharp edges are)

Both apps are the **same buildless stack**: React 18.3.1 UMD + `@babel/standalone` compiled in the
browser, no bundler, `window`-global module wiring, deployed as static files to GitHub Pages.
That symmetry is what makes a hub trivial. Two structural differences drive every decision below:

| | **Rotation** | **Culture** |
|---|---|---|
| Data origin | last.fm scrobbles, **CI-rebuildable** (`node build-data.js`, ~11 s) | hand-curated + slow API enrichment (OMDb daily quota, 3.8 MB Filmweb scrape) — **not** CI-friendly |
| Data in git? | **No** — generated files gitignored, built in CI, shipped as a Pages artifact | **Yes** — ~13 MB of overlays committed (`omdb_data.js` 5.8 MB, `cast_data.js` 2.8 MB, `wishlist_cast.js` 1.6 MB, …) |
| Cache-busting | fresh artifact each deploy (no `?v=`) | manual `?v=N` bump in `index.html` |
| Vendor libs | React/Babel only | React/Babel **+ d3 + topojson** (CDN) |
| Enrichment | Node `enrich-*.js` | Python `update_*.py` + `*_cache.json` |

**Consequence:** the two apps keep their *own* data lifecycles. Rotation stays CI-built; Culture
stays committed-and-manually-refreshed. The hub does not try to unify them — it just gives each a
home under one domain and one deploy.

### The isolation win
Because each app is its own HTML document under its own path, their `window` globals
(`window.ROTATION` vs `window.CULTURE`) and their **global CSS** (`rotation-core.jsx` styles vs the
57 KB `culture.css`) **cannot collide**. This is the single biggest reason to use *path subfolders*
rather than one mega-index that swaps script sets. No namespacing work, no CSS scoping — free.

---

## 2. Target structure

```
fuad.au/                         ← repo root = the HUB
├── index.html                   ← NEW launcher (static, ~0 JS) — the app chooser
├── hub.css                      ← NEW launcher styles (small, shared design tokens)
├── apps.json                    ← NEW manifest: the list of apps (drives launcher + deploy)
├── favicon.svg  og.png  CNAME   ← hub-level site assets
├── HUB.md                       ← NEW: hub overview + "how to add an app" contract
├── MIGRATION.md                 ← this file
│
├── rotation/                    ← Rotation app (moved from repo root)
│   ├── index.html               ← Rotation's own doc (relative paths unchanged)
│   ├── rotation-*.jsx           ← all view/app modules
│   ├── build-data.js  sync-*.js  enrich-*.js  smoke.js   ← its pipeline
│   ├── *.json  fuadex.csv  world-map.js                  ← its caches + committed inputs
│   └── ARCHITECTURE.md  ROADMAP.md                       ← Rotation's own docs (moved)
│
├── culture/                     ← Culture app (moved wholesale from Culture_2 repo)
│   ├── index.html               ← Culture's own doc (keeps ?v= convention)
│   ├── culture-v2.jsx  culture.css
│   ├── data.js imports.js wishlist.js                    ← hand-authored (committed)
│   ├── cast_data.js omdb_data.js tmdb_data.js …          ← generated overlays (committed)
│   ├── update_*.py build_*.py audit_*.py                 ← Python workshop (committed, NOT deployed)
│   ├── *_cache.json  *.csv  www.filmweb.pl.txt           ← caches/inputs (gitignored per Culture rules)
│   ├── CLAUDE.md  docs/                                  ← Culture's own docs (moved)
│   └── .env  →  (see §6 — secrets relocate here or to a shared spot)
│
├── shared/            (OPTIONAL, future) ← cross-app design tokens / a common top nav
│
├── .github/workflows/
│   ├── sync.yml       ← updated: builds Rotation, stages hub + all app folders into _site/
│   └── enrich.yml     ← updated: paths now point into rotation/
└── .gitignore         ← merged: Rotation's rules (rotation/…) + Culture's cache rules (culture/…)
```

**Contract for "an app":** a self-contained folder directly under the repo root that owns a
relative-pathed `index.html` and every asset it needs. It may or may not have a build step. It never
reaches into another app's folder. That's the whole contract — everything else is convention.

---

## 3. The launcher (root `index.html`)

Deliberately **not** React — a chooser doesn't need a 300 KB runtime. Plain HTML + `hub.css`, dark
aesthetic consistent with both apps (same font stack: Space Grotesk / Source Serif 4 / JetBrains
Mono already loaded by both). It renders one **card per app**, read from `apps.json` (a tiny inline
`fetch` or, simpler, hand-written cards — see trade-off below).

Each card: app name, one-line tagline, accent colour, a representative thumbnail/gradient, links to
`/<app>/`. Layout is a responsive grid so 2 apps today and 6 apps later both look intentional.

**`apps.json`** (source of truth for what exists):
```json
[
  { "id": "rotation", "name": "Rotation", "tagline": "20 years of listening, mapped.",
    "accent": "oklch(0.74 0.13 330)", "path": "/rotation/", "deploy": ["*.jsx","*.js","*.json","*.csv","index.html","world-map.js"] },
  { "id": "culture",  "name": "Culture",  "tagline": "Films, games, books — a personal canon.",
    "accent": "#c8a24a", "path": "/culture/", "deploy": ["index.html","culture-v2.jsx","culture.css","data.js","imports.js","wishlist.js","cast_data.js","wishlist_cast.js","omdb_data.js","books_data.js","game_imdb.js","filmweb_notes.js","notes_en.js","tmdb_data.js","badges.js"] }
]
```
The `deploy` globs let the CI stager copy *only* web files (skipping each app's workshop — Python,
caches, CSVs). Adding an app = append one object here + drop the folder. **No workflow edit.**

**Trade-off — data-driven vs hardcoded launcher cards.** Fetching `apps.json` at runtime keeps the
launcher and deploy in perfect sync from one file, but adds a fetch + a flash-of-empty. For 2–6
static personal apps, hand-writing the cards in `index.html` and keeping `apps.json` purely for the
*deploy* stager is simpler and faster to paint. **Recommendation:** hardcode the cards, keep
`apps.json` as the deploy manifest. One file to touch when adding an app either way.

### Old-link preservation (Rotation moving off root)
Rotation's hash routes (`fuad.au/#artist/x`, `#explore/…`) and its OG URL currently assume root.
After the move, a **6-line script in the root launcher** detects a Rotation-style hash and
transparently forwards: `if (/^#(artist|album|track|explore|calendar|map|journey|stories)\b/.test(location.hash)) location.replace('/rotation/' + location.hash)`. Bookmarks keep working. Update
`rotation/index.html` OG `og:url` → `https://fuad.au/rotation/`.

---

## 4. Moving Rotation into `rotation/`

Rotation's `index.html` references every asset **relatively** (`src="music-data.js"`,
`src="rotation-app.jsx"`, …). Moving the *entire* bundle into `rotation/` keeps all those relative
references valid — nothing inside the app changes. What must change lives *outside* the HTML:

1. **`build-data.js` output location.** It writes generated files to its CWD. Run it from within
   `rotation/` (CI: `working-directory: rotation` or `cd rotation && node build-data.js`) so
   outputs land beside the app. No code change if invoked from the folder.
2. **`enrich.yml`** — same: run the `enrich-*.js` steps with `working-directory: rotation`; the
   `git add tag-cache.json …` line becomes `git add rotation/tag-cache.json …`.
3. **Temp/dep dirs.** ARCHITECTURE §10 says `node_modules` is NOT gitignored and temp dirs live at
   the *GitHub root* (`../.dtmp`, `../.sptmp`, `../.babelcheck`). Relative to `fuad.au/rotation/`
   those are now **`../../.dtmp`** etc. Update that note in ARCHITECTURE.md (the dirs themselves
   don't move — they're outside both repos already).
4. **`.gitignore`** — prefix Rotation's generated-file rules with `rotation/`
   (`rotation/music-data.js`, `rotation/media-index.js`, …).
5. **Docs** — `ARCHITECTURE.md` + `ROADMAP.md` move into `rotation/`; their intro lines note they
   describe the Rotation app, one tenant of the fuad.au hub.

Everything else (React CDN pins, SRI, hash router, `window` wiring) is untouched.

---

## 5. Moving Culture into `culture/`

Culture is already a self-contained relative-path bundle, so the move is mostly mechanical: copy the
Culture_2 repo contents into `fuad.au/culture/`. Because you chose "move everything," the Python
workshop comes too. Keeping the folder **flat** (web files + Python + caches all in `culture/`, as
they are today in Culture_2) means **zero Python-script path changes** — every `update_*.py` still
finds `omdb_data.js`, `*_cache.json`, etc. beside it. The deploy stager (not the folder layout) is
what separates "ship" from "workshop."

Steps:
1. Copy all of Culture_2 → `fuad.au/culture/` (preserve `docs/`, `CLAUDE.md`, `.env`).
2. Merge Culture's `.gitignore` rules into fuad.au's, prefixed with `culture/`
   (`culture/*_cache.json`, keep the `!culture/omdb_cache.json` exception, `culture/.env`,
   `culture/*.har`, `culture/www.filmweb.pl.txt`).
3. Keep Culture's **`?v=` cache-busting** exactly as-is inside `culture/index.html` — it's still a
   committed, manually-refreshed app, so golden-rule #1 ("bump `?v=`") still applies within Culture.
4. Culture's CLAUDE.md stays in `culture/` (nested project instructions); its "bump ?v=" and
   "regenerate overlays, don't hand-edit" rules are unchanged.
5. The Python enrichment runbook (`docs/DATA_PIPELINE.md`) is unaffected — it runs locally from
   inside `culture/` just as it ran from Culture_2 root.

**Retiring the Culture_2 repo.** After the copy is verified, Culture_2 becomes archival (or is
deleted). Its only external tie is the shared `.env` (see §6).

---

## 6. Secrets (the one shared dependency)

Today **both** repos point at `Fuad-Soudah/Culture_2/.env` for keys (Rotation's ARCHITECTURE §10
and CLAUDE.md say so; Culture keeps TMDB/Twitch/OMDb keys there too). If Culture_2 is retired, that
path dies. Options:

- **Recommended:** move the `.env` to `fuad.au/culture/.env` (it's gitignored) and update the two
  fuad.au references. Locally, Rotation's Node scripts and Culture's Python scripts both read it via
  an absolute/`../` path. In **CI**, secrets already come from GitHub Actions secrets
  (`LASTFM_API_KEY`, etc.) — the `.env` file is only a *local* convenience, so this is a docs +
  local-path change, not a pipeline change.
- Alternative: keep a bare `Fuad-Soudah/Culture_2/` repo alive solely as the secrets/temp home.
  Uglier; avoid unless git history there matters.

Action items: update `fuad.au/CLAUDE.md`, `rotation/ARCHITECTURE.md §10`, and any `enrich-*.js`
dotenv path from `Fuad-Soudah/Culture_2/.env` → `fuad.au/culture/.env` (or a chosen shared path).

---

## 7. Deploy pipeline changes (`sync.yml`)

Rotation's workflow already stages an **explicit file list** into `_site/`. The migration generalises
the "Stage site" step into three parts:

```yaml
- name: Build Rotation dataset
  working-directory: rotation
  run: node build-data.js && node sync-live.js   # (live step keeps its LASTFM_API_KEY env)

- name: Stage site
  run: |
    mkdir -p _site _site/rotation _site/culture
    # hub shell
    cp index.html hub.css apps.json favicon.svg og.png CNAME _site/
    # rotation (built + source), same list as today but sourced from rotation/
    cp rotation/index.html rotation/rotation-*.jsx rotation/tweaks-panel.jsx _site/rotation/
    cp rotation/music-data.js rotation/live-data.js rotation/search-index.js \
       rotation/media-index.js rotation/track-audio.js rotation/track-previews.js \
       rotation/shelves-unplayed.js rotation/artist-flow.js rotation/artist-detail.js \
       rotation/calendar.js rotation/calendar-detail.js rotation/geo-detail.js \
       rotation/world-map.js _site/rotation/
    # culture (committed web files only — NOT the Python workshop / caches)
    cp culture/index.html culture/culture-v2.jsx culture/culture.css \
       culture/data.js culture/imports.js culture/wishlist.js culture/cast_data.js \
       culture/wishlist_cast.js culture/omdb_data.js culture/books_data.js \
       culture/game_imdb.js culture/filmweb_notes.js culture/notes_en.js \
       culture/tmdb_data.js culture/badges.js _site/culture/
    du -sh _site _site/rotation _site/culture
```

- The daily **cron** still only benefits Rotation (new scrobbles). Culture has no CI build — its
  committed files ship as-is; a push that touches `culture/*` redeploys them.
- **Optional agility upgrade:** replace the two hand-written `cp` blocks with a small
  `stage-site.sh` that loops over `apps.json`, copying each app's `deploy` globs into
  `_site/<id>/`. Then *adding an app never edits the workflow* — you touch only `apps.json` + the
  launcher card. Worth doing once a third app appears; the explicit `cp` list is fine for two.
- `enrich.yml` gains `working-directory: rotation` and `rotation/`-prefixed `git add` paths (§4).

CNAME + custom domain, Pages "Source = GitHub Actions", the deploy/persist/retry jobs — all unchanged.

---

## 8. Adding a future app (the payoff)

To add **Museums** (paintings you've seen) or **Travel** (location-history journeys):

1. `mkdir fuad.au/museums/`, drop in its `index.html` + relative assets (any stack — React-buildless
   like the others, or even plain HTML). It owns its globals and CSS; nothing else is affected.
2. Add one object to `apps.json` (`id`, `name`, `tagline`, `accent`, `path`, `deploy` globs).
3. Add a card to the root launcher (or, if you adopt the `apps.json`-driven launcher, this is free).
4. If using `stage-site.sh` (§7), deploy just works. Otherwise add a 1-line `cp` block.
5. If the app has its own data pipeline, give it its own build step / workflow — it lives entirely
   inside the app folder, so it can't destabilise Rotation or Culture.

That's the agility guarantee: **apps are tenants, isolated by folder + document boundary.** No shared
runtime, no shared globals, no cross-app CSS. The hub only knows their names and URLs.

---

## 9. Migration runbook (ordered, each step verifiable)

Production is the test environment (both apps' convention), but this reshuffle touches URLs, so do it
in small verifiable commits — ideally on a short-lived branch merged once `/rotation/` and
`/culture/` both load.

1. **Rotation → `rotation/`.** `git mv` all Rotation files into `rotation/`. Update `enrich.yml`
   (`working-directory`, `git add` paths), `.gitignore` (`rotation/` prefixes), and the `sync.yml`
   staging to emit `_site/rotation/`. **Temporarily** ship a root `index.html` that redirects to
   `/rotation/` so nothing 404s. Deploy → verify `fuad.au/rotation/` fully works (all lazy files,
   map, search).
2. **Launcher.** Replace the temporary root redirect with the real launcher (`index.html`, `hub.css`,
   `apps.json`) + the hash-forward shim (§3). Deploy → verify `fuad.au/` shows the chooser and old
   `fuad.au/#artist/…` links forward into `/rotation/`.
3. **Culture → `culture/`.** Copy Culture_2 in, merge `.gitignore`, relocate `.env` (§6), add the
   Culture card + Culture staging block. Bump Culture's `?v=` once after landing. Deploy → verify
   `fuad.au/culture/` (covers, Reader, stats, wishlist).
4. **Docs.** Update `fuad.au/CLAUDE.md` (hub overview, culture subfolder, shared `.env` path), write
   `HUB.md` (the app contract from §2/§8), move Rotation's `ARCHITECTURE.md`/`ROADMAP.md` into
   `rotation/` and add the "one tenant of the hub" framing + the `../../.dtmp` path fix.
5. **Retire Culture_2** (archive or delete) once §6 secrets are relocated and everything is green.

**Rollback:** each step is a commit; revert to reinstate the prior root. Because generated Rotation
data isn't in git, a revert can't corrupt data — worst case is a stale deploy re-run.

---

## 10. Open questions / things to decide before coding

- **Launcher: React or static?** Recommended static (§3). Confirm before build.
- **`stage-site.sh` now or later?** Recommended: explicit `cp` for two apps, switch to the manifest
  loop when app #3 lands. Confirm appetite.
- **Culture data weight in git.** Moving Culture adds ~13 MB of committed `.js` to fuad.au. Fine for
  a personal Pages repo, but note it inflates clone size. (Rotation's big data stays out of git, so
  the repo won't balloon further from Rotation.)
- **Shared top nav?** Optional `shared/` with a tiny "← all apps" corner link injected into each
  app, so you can hop between apps without going back to root. Nice-to-have, not required for v1.
