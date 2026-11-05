# Japan concerts for Rotation

The upcoming-shows pipeline for the Gigs page's Japan lane. Started as the Morning Brief's
Tokyo-area search; as of **2026-11-05** it is a country-wide database feeding `build-data.js`'s
TOUR block (Ticketmaster covers Sydney/Berlin; it has no Japan inventory, so this is the Japan
source). Four lanes keep it fresh:

| Lane | Cadence | What it does |
|---|---|---|
| `jp-sweep.yml` + `scripts/sweep_listings.py` | weekly (Thu) | **no-LLM scrape** of Songkick JP metros, Creativeman, SMASH, Udo, LN HIP and 12 Tokyo livehouses (`sweep_src_*.py` parser modules) → match → merge → refresh `data/discoveries.json`. No secrets. A source printing FAILED/0 in the run log = parser rot, fix that module. |
| `tokyo-concerts.yml` (`concert_agent.py`) | daily | Claude-API agent, 6 JP + 3 intl artists rotating through the top 60 — catches artist-specific news between sweeps. |
| "Japan gigs deep re-sweep" scheduled task (claude.ai) | monthly (12th) | Claude cloud session: festival lineups, top-40 JP artists' official pages, and the venues whose sites block scraping (Koenji HIGH, Earthdom, CLUB GOODMAN). |
| `gig-marks.yml` + `scripts/apply_mark.py` | on demand | the Gigs page's want/skip buttons open a prefilled issue `gig: want <row-id>`; the workflow applies the mark, commits, closes the issue. Owner-authored issues only. |

**Marks → calendar:** `build-data.js` emits `gigs.ics` (want-marked upcoming shows) into the
deploy, so subscribing Google Calendar to `https://fuad.au/rotation/gigs.ics` once makes marks
flow to the calendar automatically. The Gigs page shows ★ on want rows and ⚡ when two
want-shows share a night.

**Discovery:** `scripts/discover.py` scores non-library acts by co-billing with library
artists across all `data/listings-*.json` (≥2 shared bills, or one with a ≥100-play anchor)
→ `data/discoveries.json` → the Gigs page's capped "worth a look" shelf. Suppress a bad
suggestion by adding its name to `data/discover-skip.json` (plain JSON array).

## data/
| File | What it is |
|---|---|
| `concerts-tokyo.json` | The database: 600+ matched Japan shows (Tokyo-area and nationwide), with your marks (`status`: new / want / seen / skip), tier, plays, seen-live info, venue/city lat/lng. Name kept for continuity — contents are country-wide. |
| `listings-YYYY-MM-DD.json` | The daily agent's raw scrape for that day, with every billed act. |
| `matches-YYYY-MM-DD.json` | `rotation_match.py` output for those listings. |
| `listings-research-*.json` / `matches-research-*.json` | The deep-research passes' aggregated listings and matches (see below). |
| `eplus-ids.json` | Cached e+ artist ids (`null` = no e+ page), so lookups only happen once per artist. |

## scripts/
- `rotation_match.py` matches listings against `fuadex.csv` through aliases (kana/kanji ↔
  romaji), origins and `gigs.json`, and assigns the tiers top / also / seen. Short aliases
  (≤4 normalised chars) only index Japanese artists, so "LUV" can't hand a Japanese club act
  to Lil Uzi Vert.
- `merge_listings.py` folds researched listing files (same schema as the agent's) into
  `concerts-tokyo.json`: dedupes on (artist, date) — including the older `from`/`until` range
  rows — matches, and writes one row per matched library artist per show (a festival day with
  four library acts lands as four rows, so each keeps its tour badge and map dot). It stamps
  city-level lat/lng from `city-coords.json` + a built-in JP gazetteer, carries a wrong-entity
  `REJECT` list (the Japanese band "bed" never matches the French **Bed**), and never touches
  existing rows or marks.
- `concert_agent.py` is the daily top-up: picks 6 Japanese + 3 international artists rotating
  through your top 60, collects listings with the API's built-in `web_search`/`web_fetch`,
  runs the matcher, appends only new shows.

## The 2026-11-05 deep-research pass (coverage baseline)
Three waves of Claude subagents populated the database properly; re-run the same recipe when
coverage decays (Japanese acts announce 1–3 months out):
1. **Per-artist**: all 168 Japanese library artists with ≥15 plays or 2-year activity, plus
   the 5–14-play tail — full tour itineraries from official /live pages (MWAM, sigure, MUCC,
   AKG, 9mm, ORANGE RANGE, aiko, the cabs… every announced stop, nationwide).
2. **Festivals**: COUNTDOWN JAPAN per-day lineups from the official artist API (179 acts),
   rockin'on sonic, FUKUOKA MUSIC FES, MAGIC HOUR, dates-only placeholders for SYNCHRONICITY /
   JAPAN JAM / VIVA LA ROCK / GREENROOM / FUJI ROCK / RISING SUN / GMO SONIC. Summer Sonic,
   RIJ, Knotfest etc. had announced nothing — re-check Dec 2026/Jan 2027 (JAPAN JAM lineup
   lands mid-December).
3. **International catalog sweep**: instead of per-artist checks, dump the full calendars of
   Creativeman, SMASH, Udo, Live Nation H.I.P. and Songkick's Tokyo/Osaka/Nagoya metros, then
   match everything — catches library artists at any play count (Fleshwater, Puscifer,
   Cancer Bats, Gurriers…). Sydney/Berlin need none of this: the weekly Ticketmaster pull is
   already location-first over the whole library.

To merge a new research file: `python3 scripts/merge_listings.py listings.json [...]`
(listings schema: `{"acts": [...], "title", "date", "until", "venue", "city", "area", "url",
"note"}` — one object per event, every billed act, full tours one row per date).

**Cloud-session gotcha**: in Claude Code cloud sessions the WebFetch tool bypasses the session
proxy and fails DNS on every host — subagents must fetch with Bash `curl` (which uses the
proxy). Some hosts 403 the proxy (mwamjapan.info, alexandros.jp, l-tike.com…); fall back to
e+ / LiveFans / music-news pages for those.

Known false positives: "the cabs" matched **The Cabs**, whose MusicBrainz origin says US but
the plays look like the Japanese band (harmless — same shows either way). The "bed"/**Bed**
collision is now rejected in `merge_listings.py`.

## Run the daily agent
```bash
pip install anthropic
export ANTHROPIC_API_KEY=sk-ant-...        # from console.anthropic.com
python3 scripts/concert_agent.py --rotation path/to/rotation --out data
```
`--rotation` is the folder holding `fuadex.csv`, `artist-aliases.json`, `artist-origins.json`,
`gigs.json`, `gigs-manual.json`. Set `CLAUDE_MODEL` to change the model.

## Schedule it
`.github/workflows/tokyo-concerts.yml` runs the script every day at 06:17 JST on GitHub
Actions and commits the results back to the repo. You set it up once:
1. Copy `scripts/` and `data/` into `rotation/` in fuad.au, and the workflow into `.github/workflows/`.
2. Add the repository secret `ANTHROPIC_API_KEY`.
3. Trigger it once from the Actions tab ("Run workflow") to check it works.

Cost: one run is one agent turn with up to ~50 web searches and fetches. Web search is billed
per search on top of tokens, so check the API pricing page and set a spend limit in the Console.
