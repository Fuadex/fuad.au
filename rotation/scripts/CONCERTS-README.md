# Tokyo concerts for Rotation

Everything the Morning Brief's concert search has produced up to **2026-11-04**, plus a script that runs the same search every day on your own Claude API key.

## data/
| File | What it is |
|---|---|
| `concerts-tokyo.json` | All 62 matched Tokyo-area shows in the brief's database, with your marks (`status`: new / want / seen / skip), tier, plays, seen-live info, venue lat/lng. |
| `listings-2026-11-04.json` | Today's raw scrape: 175 listings (Songkick pp. 1–4, Creativeman, Smash, e+ artist pages, tour searches) with every billed act. |
| `matches-2026-11-04.json` | `rotation_match.py` output for those listings: 36 shows matched against the whole library. |
| `eplus-ids.json` | Cached e+ artist ids (`null` = no e+ page), so lookups only happen once per artist. |

Known false positives: "bed" (Japanese band at WWW X, Nov 20) matched your French **Bed**; "the cabs" matched **The Cabs**, whose MusicBrainz origin says US but the plays look like the Japanese band. Fixing either in `artist-aliases.json` / `artist-origins.json` fixes future runs.

## scripts/
- `rotation_match.py` matches listings against `fuadex.csv` through aliases (kana/kanji ↔ romaji), origins and `gigs.json`, and assigns the tiers top / also / seen.
- `concert_agent.py` picks the day's artists (6 Japanese and 3 international, rotating through your top 60). It then asks Claude, with the API's built-in `web_search` and `web_fetch` tools, to collect the listings, caches new e+ ids, runs the matcher, and appends only new shows to `concerts-tokyo.json` (your existing rows and marks are never touched).

## Run it
```bash
pip install anthropic
export ANTHROPIC_API_KEY=sk-ant-...        # from console.anthropic.com
python3 scripts/concert_agent.py --rotation path/to/rotation --out data
```
`--rotation` is the folder holding `fuadex.csv`, `artist-aliases.json`, `artist-origins.json`, `gigs.json`, `gigs-manual.json`. Set `CLAUDE_MODEL` to change the model.

## Schedule it
`.github/workflows/tokyo-concerts.yml` runs the script every day at 06:17 JST on GitHub Actions and commits the results back to the repo. You set it up once:
1. Copy `scripts/` and `data/` into `rotation/` in fuad.au, and the workflow into `.github/workflows/`.
2. Add the repository secret `ANTHROPIC_API_KEY`.
3. Trigger it once from the Actions tab ("Run workflow") to check it works.

Cost: one run is one agent turn with up to ~50 web searches and fetches. Web search is billed per search on top of tokens, so check the API pricing page and set a spend limit in the Console.
