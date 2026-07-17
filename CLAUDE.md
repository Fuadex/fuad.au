> Part of the fuad.au docs — start at [/GUIDE.md](/GUIDE.md)

# Claude session bootstrap — fuad.au (hub)

fuad.au is a **hub** of self-contained personal apps. Each app is a top-level folder that owns
its own relative-pathed `index.html` and every asset it needs; apps never reach into each
other. Current apps:

- **`rotation/`** — music listening observatory (React-buildless + Babel-in-browser). Its own
  docs: `rotation/ARCHITECTURE.md` + `rotation/ROADMAP.md`. **Read those before touching
  rotation/.** Deploys `instrumentals.js`.
- **`culture/`** — film / TV / games / books canon (React-buildless; Python enrichment
  workshop lives alongside). Its own docs: `culture/CLAUDE.md` + `culture/docs/`. **Read those
  before touching culture/.** Lazy-loads ~12 MB of overlays (only ~830 KB eager); runtime
  `?v=` epoch is manual.
- **`canvas/`** — personal art gallery (React-buildless). Its own docs: `canvas/PLAN.md`. Each
  app now ships a PWA shell: `manifest.webmanifest`, `sw.js`, `icon-192.png`, `icon-512.png`.

The repo root is just the launcher: `index.html` (static app chooser) + `hub.css` + `apps.json`
(the deploy manifest — also the intended data source for a future dynamic launcher). See
`HUB.md` for the architecture and the "add a new app" contract, and `MIGRATION.md` for how the
hub was assembled from the former standalone Rotation + Culture_2 repos.

## Deploy
One pipeline (`.github/workflows/sync.yml`): build Rotation's data **inside rotation/**
(`working-directory: rotation`), then `node stage-site.js`, which reads `apps.json` and
assembles `_site/` — root launcher files at the top, each app under `_site/<id>/`. Only files
in an app's `deploy` list are shipped (never the workshop/caches). **Adding an app = an
apps.json entry + a launcher card; no workflow edit.** Pages Source = "GitHub Actions".
Ship to `main`; production is the test environment.

`stage-site.js` stamps **content-hash `?v=` params** on all local script/CSS refs in both the
hub root `index.html` and each app's `index.html` (any ref without a manual version token gets
an 8-char MD5 of the staged file). It also replaces `__BUILD__` in each `sw.js` with a digest
of the full staged app directory, so the service-worker cache epoch tracks every deployed byte.
Missing deploy-list files **always fail** the stage (not just in CI).

## Hard rules
- Secrets are env-only (**`culture/.env`**, gitignored); never print or commit them. CI injects
  keys via GitHub Actions secrets, so the `.env` is a local-dev convenience only.
- Each app owns its ignore rules (nested `.gitignore`). `_site/` is a build artifact (ignored).
- `node_modules` is **NOT** gitignored in `rotation/` — never `npm install` there; use
  `../../.dtmp`, `../../.sptmp`, `../../.babelcheck` at the GitHub root (two levels up from
  `rotation/`).
- Follow each app's own cache-busting conventions — they differ by app:
  - **Rotation and Canvas**: auto-stamped by `stage-site.js` (content-hash `?v=`). No manual
    version bump needed; committing files is enough.
  - **Culture**: keeps a **manual shared `?v=` epoch** in `culture/index.html`
    because it injects data scripts at runtime rather than at parse time. **Bump `?v=` on any
    `culture/` data or code change.**

## Workspace caveat (this mount)
The whole worktree shows as "modified" vs git purely from **CRLF↔LF line-ending flips** — not
real edits. Before committing, normalize deliberately (e.g. add a `.gitattributes` with
`* text=auto eol=lf` and renormalize) rather than folding a repo-wide EOL churn into a feature
commit. The bash mount can also return **corrupted reads (stray NUL bytes)** for a file whose
basename collides with another recently-written file (seen with the two `index.html`s); the
**Read tool** and **git HEAD** reflect true on-disk content — trust those when a bash read
looks wrong.
