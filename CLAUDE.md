# Claude session bootstrap — fuad.au (Rotation)

**Before doing anything in this repo, read `ARCHITECTURE.md`** — it is the canonical inventory
of the architecture, data model, and every shipped feature. Do not assume a feature is missing
(or present) without checking it. **`ROADMAP.md`** holds audit findings, the evaluated
API catalogue (including rejected sources — don't re-propose those), and the modular plan;
work from it unless the user redirects. `CSV-OVERRIDES.md` (gitignored) logs manual data fixes.

Hard rules (full list in ARCHITECTURE.md §10):
- Secrets are env-only (`Fuad-Soudah/Culture_2/.env`); never print or commit them.
- `node_modules` is NOT gitignored here — never `npm install` in this repo; use `../.dtmp`,
  `../.sptmp`, `../.babelcheck` at the GitHub root.
- Ship to `main`; production is the test environment. Rebuild data with `node build-data.js`.
- New bulky data goes in lazy generated files, not music-data.js.
- When you ship or remove a feature, update ARCHITECTURE.md §8/§9 and tick ROADMAP.md.
