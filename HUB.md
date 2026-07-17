> Part of the fuad.au docs — start at [/GUIDE.md](/GUIDE.md)

# fuad.au — the hub

fuad.au is a launcher over a set of **self-contained personal apps**. The root is a static
chooser; each app lives at its own path and is fully isolated from the others.

## Why folders, not one big app
Each app is its own HTML document under its own path (`/rotation/`, `/culture/`, …). That means
their `window` globals (`window.ROTATION` vs `window.CULTURE`) and their global CSS can never
collide — no namespacing, no scoping. Isolation is structural and free. It's also the agility
guarantee: a new app can't destabilise an existing one.

## Layout
```
/                 launcher: index.html + hub.css + apps.json (+ favicon.svg, og.png, CNAME)
/rotation/        music app — own index.html, jsx, data, build pipeline, ARCHITECTURE/ROADMAP
/culture/         film/games/books app — own index.html, jsx, css, data + Python workshop
/canvas/          art-gallery app — own index.html, jsx, css, data
.github/workflows build + deploy (sync.yml), weekly enrichment (enrich.yml)
stage-site.js     manifest-driven deploy stager (reads apps.json → _site/)
```

## The "app" contract
An app is a top-level folder that:
1. owns a relative-pathed `index.html` and every asset it references,
2. never reaches into another app's folder (no shared globals, no shared CSS),
3. declares what to deploy via its entry in `apps.json` (`deploy` = explicit file list, so
   workshop/caches are never shipped),
4. ships a PWA shell: `manifest.webmanifest`, `sw.js`, `icon-192.png`, `icon-512.png` (all
   listed in `deploy`; `sw.js` gets its `__BUILD__` token replaced with a content-digest of
   the staged app directory at stage time),
5. may bring its own build step and its own nested `.gitignore`.

## apps.json
Single source of truth for what exists and what ships:
```json
{ "hubFiles": ["index.html","hub.css","apps.json","hub-stats.json","favicon.svg","og.png","CNAME"],
  "apps": [ { "id","name","tagline","accent","path","precompile":true,"deploy":[…] }, … ] }
```
`hubFiles` land at `_site/` root; each app's `deploy` files land at `_site/<id>/`.
The `precompile` flag tells `stage-site.js` to Babel-compile the app's `.jsx` → `.js` in the
staged copy only (authoring stays buildless locally). All three apps currently carry
`"precompile": true`.

## Deploy
`node stage-site.js` (run from repo root, after any per-app build) rebuilds `_site/` from
`apps.json`. CI runs Rotation's `build-data.js`/`sync-live.js` inside `rotation/` first, then
the stager, then uploads `_site/` as the Pages artifact. **A missing deploy-list file always
fails the stage** (locally and in CI alike — the CI-only guard was removed 2026-07-18).

`stage-site.js` also:
- Content-hash stamps every local unversioned `<script>`/`<link>` ref in the hub root
  `index.html` and each per-app `index.html` (8-char MD5 of the staged file appended as `?v=`).
  Manual `?v=` params (Culture's runtime epoch) are left untouched.
- Replaces `__BUILD__` in each app's `sw.js` with a digest of the full staged app directory,
  so the service-worker cache epoch updates whenever any deployed byte changes.

## Adding a new app (e.g. Museums, Travel)
1. `mkdir <app>/`, drop in its `index.html` + relative assets (any stack).
2. Add a PWA shell: `manifest.webmanifest`, `sw.js` (with `__BUILD__` placeholder),
   `icon-192.png`, `icon-512.png`.
3. Add an object to `apps.json` (`id`, `name`, `tagline`, `accent`, `path`, `deploy` list
   including the four PWA files, and `"precompile": true` if the app uses `.jsx`).
4. Add a card to the root `index.html` launcher (until the launcher goes data-driven).
5. Deploy — `stage-site.js` picks it up automatically; the workflow needs no edit.
6. If the app has its own data pipeline, give it its own build step; it stays inside the folder.

## PWA
All three apps are installable as PWAs (desktop + mobile). The pattern is: HTTPS-only
service-worker registration in `index.html`, tiered caching in `sw.js` (shell/data/lazy
layers), icons at 192 and 512 px, OG/Twitter cards with correct `fuad.au` canonical URLs.
No Tauri or Capacitor — deliberate: PWA + Pages keeps push-to-live instant with no native
build step.

## Roadmap notes
- **Dynamic launcher** (wanted): replace the hardcoded cards in `index.html` with a
  `fetch('apps.json')` render — the data shape already matches, so this is a drop-in upgrade.
- **Shared top nav** (deferred): an optional `shared/` module injecting a small "← all apps"
  link into each app, for hopping between apps without returning to root.

See `MIGRATION.md` for the full migration record and the ordered runbook.
