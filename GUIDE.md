# fuad.au — start here

Part of the fuad.au docs — this IS the entry point.

fuad.au is a hub of three self-contained personal apps sharing one domain and one deploy
pipeline. Each app is a top-level folder that owns its own `index.html` and every asset it
needs; apps never reach into each other.

| App | Path | What it is |
|---|---|---|
| **Rotation** | `/rotation/` | 20 years of last.fm listening (~319k scrobbles), mined for derived narrative insight: obsessions, flameouts, taste geography, sound DNA, song readings, gigs. |
| **Culture** | `/culture/` | A personal film / TV / games / books canon (~3,300 seen + 1,340 wishlist), with a Python enrichment workshop alongside. |
| **Canvas** | `/canvas/` | A personal gallery of art seen in museums, built from memory reconstruction + Wikidata; ~313 works, ~52 museums, 45 recall decks. |

---

## Deploy pipeline

Push to `main` → `.github/workflows/sync.yml` triggers. Three jobs:

1. **Build** — runs `node build-data.js` + `node sync-live.js` inside `rotation/` (needs
   `LASTFM_API_KEY`), then `node stage-site.js` from the repo root, which reads `apps.json`
   and assembles `_site/`: hub launcher files at root, each app at `_site/<id>/`.
2. **Deploy** — uploads `_site/` to GitHub Pages as a workflow artifact.
3. **Persist** — commits the CSV delta *after* deploy (committing before makes Pages reject
   the artifact; fixed 2026-07-03). Pages Source = "GitHub Actions".

A smoke-test (`smoke-test.js`) gates every deploy. Push to `main` is the test environment.

---

## Golden rules

1. **Rotation jsx has NO `?v=`** — CI precompiles each `.jsx` → `.js` in `_site/` only
   (gated on `"precompile":true` in `apps.json`). Committing `.jsx`/`build-data.js`/data
   files is enough; never add cache-busting params.

2. **Canvas and Culture bump `?v=` on every change** — their data files are committed and
   served as-is; the browser will not see changes without a version bump in `index.html`.

3. **New shipped files must be in `apps.json` `deploy` list** — `stage-site.js` copies
   only what is listed; an unlisted file will not reach `_site/` or production.

4. **The slug contract lives in `rotation/lib-slug.js` — never re-type it.** Every dataset
   in Rotation joins on `slug()` from that file. The empty → `"a-"+hash` fallback keeps CJK
   names apart (re-typing a plain slug mis-keys all non-Latin content). Workshop scripts
   under `.sptmp/` must `require("./lib-slug")` too. Smoke-test freezes the contract in CI.

5. **Secrets are env-only.** `LASTFM_API_KEY`, `SPOTIFY`/`SPOTIFY_SECRET`, `TMDB_API_KEY`,
   `OMDB_API_KEY`, `DISCOGS_TOKEN`, `TICKETMASTER_API_KEY` all live in `culture/.env`
   (gitignored). CI injects them via GitHub Actions secrets. Never print or commit them.

6. **Large source datasets are never committed.** Zips, parquets, sqlite, Spotify export
   zips, the Genius lyrics archive, and any external data dump live outside the repo
   (at `../../.sptmp` / `../../.dtmp`) or are gitignored. Only compact derived caches ship.

7. **`node_modules` is NOT gitignored in `rotation/`** — never `npm install` there. Temp
   dirs live at the GitHub root: `../../.dtmp`, `../../.sptmp`, `../../.babelcheck`.

8. **Dataset/dump provenance is never named in tracked files or commits.** Keep references
   to external data sources in local-only files (gitignored) or in your own notes.

---

## Doc map — what to read and when

### Hub-level
| Doc | Read when |
|---|---|
| **GUIDE.md** ← you are here | Starting any session cold |
| **CLAUDE.md** | Hub architecture details, deploy rules, workspace caveats (CRLF, NUL bytes) |
| **HUB.md** | "App contract," `apps.json` format, and how to add a new app |
| **BACKLOG.md** | Open items, session checkpoints, key gotchas, pathways under consideration |
| **CHANGELOG.md** | Feature/architecture milestones (public-safe; no provenance) |
| **README.md** | Public-facing one-pager about the site |
| `PROJECT-AUDIT-2026-07-10.local.md` | Local-only deep audit (gitignored); never tracked |

### Rotation
| Doc | Read when |
|---|---|
| **rotation/ARCHITECTURE.md** | Touching any Rotation code — the full technical inventory |
| **rotation/ROADMAP.md** | Planning Rotation features — build queue, API catalogue, module plan |
| **rotation/PIPELINE.md** | Running a reads/blurb wave (llm-about, canvas art reads, etc.) |
| **rotation/LIMITATIONS.md** | Understanding known approximations and deferred fixes |
| **rotation/SPOTIFY.md** | Working with the personal Spotify export integration |
| **rotation/CSV-OVERRIDES.md** | Manual data corrections (local-only, gitignored) |
| **rotation/README.md** | Public-facing description of what Rotation is |

### Culture
| Doc | Read when |
|---|---|
| **culture/CLAUDE.md** | Touching any Culture code — architecture, data model, golden rules |
| **culture/docs/DATA_PIPELINE.md** | Running the enrichment runbook |
| **culture/docs/SCRIPTS.md** | Looking up what a specific Python script does |
| **culture/docs/AUDIT_2026-07.md** | Architecture/performance deep-dive and §8 insight-layer proposals |
| **culture/BADGE_CHARTER.md** | Settled badge definitions, tests, and exemplars |
| **culture/BADGE_IDEAS.md** | Open badge questions and the new taste-layer build roadmap |
| **culture/PREDICT_MODEL.md** | Predicted-rating model design for the wishlist |

### Canvas
| Doc | Read when |
|---|---|
| **canvas/PLAN.md** | Touching Canvas — full architecture, data model, phases, open questions |
| **canvas/memory-seed.md** | The memory reconstruction log (raw recollections → resolved entities) |

### Archive (gitignored — local only)
| Doc | What it is |
|---|---|
| **notes/STATUS-2026-07.md** | Cross-app status snapshot + Fable-leverage plan (2026-07-08) |
| **notes/MIGRATION.md** | Hub migration plan — how Rotation + Culture were assembled |
| **notes/AUDIT-2026-07.md** | Rotation grounding audit (2026-07-04) — now absorbed into ARCHITECTURE.md |
| **culture/notes/** | Badge proposals, taxonomy working docs, taste-profile plan, colour ideas, absorbed backlog |
