#!/usr/bin/env python3
"""sweep_listings.py — the weekly no-LLM Japan concert sweep.

Usage:  python3 scripts/sweep_listings.py [--data rotation-dir] [--out data] [--only src1,src2]

Runs every parser registered by the sweep_src_*.py modules beside this file (Songkick
metros, Creativeman, SMASH, Udo, Live Nation HIP, and the Tokyo livehouse calendars),
collects one combined listings file, then hands it to the existing chain:
rotation_match.py → merge_listings.py (append-only; marks untouched) → discover.py.

Sources are isolated: one raising kills only itself and is reported as FAILED in the
summary (the scraper-rot alarm — a source at 0 events needs its parser looked at).
Scheduled by .github/workflows/jp-sweep.yml; fine to run locally too (honours the
HTTPS_PROXY environment the cloud session sets).
"""
import datetime, importlib, json, os, subprocess, sys, time, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

UA = "fuad.au-rotation-sweep/1.0 (personal concert tracker)"


def fetch(url, tries=3):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "ja,en;q=0.8"})
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read().decode("utf-8", "replace")
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, OSError) as e:
            last = e
            if isinstance(e, urllib.error.HTTPError) and e.code in (403, 404, 410):
                raise      # not transient — let the parser decide
            time.sleep(2 * (i + 1))
    raise last


def main():
    out = sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else os.path.join(os.path.dirname(HERE), "data")
    data = sys.argv[sys.argv.index("--data") + 1] if "--data" in sys.argv else os.path.dirname(HERE)
    only = set(sys.argv[sys.argv.index("--only") + 1].split(",")) if "--only" in sys.argv else None
    today = datetime.date.today()

    sources = {}
    for mod in ("sweep_src_agg", "sweep_src_promo", "sweep_src_live"):
        try:
            sources.update(importlib.import_module(mod).SOURCES)
        except Exception as e:
            print(f"module {mod} not loaded: {e}", file=sys.stderr)

    listings, stats = [], {}
    for name, collect in sources.items():
        if only and name not in only:
            continue
        try:
            rows = collect(fetch, today)
            stats[name] = len(rows)
            listings.extend(rows)
        except Exception as e:
            stats[name] = f"FAILED: {type(e).__name__}: {e}"
    print("sweep:", json.dumps(stats, ensure_ascii=False))

    lp = os.path.join(out, f"listings-sweep-{today}.json")
    json.dump(listings, open(lp, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    if listings:
        subprocess.run([sys.executable, os.path.join(HERE, "merge_listings.py"), lp,
                        "--data", data, "--out", out, "--added", str(today)], check=True)
        subprocess.run([sys.executable, os.path.join(HERE, "discover.py"), "--data", data, "--out", out], check=True)
    failed = [k for k, v in stats.items() if not isinstance(v, int)]
    zeroed = [k for k, v in stats.items() if v == 0]
    if failed or zeroed:
        print(f"ATTENTION — failed: {failed or '-'} · zero events: {zeroed or '-'} (parser rot?)", file=sys.stderr)
    # non-zero exit only when EVERYTHING failed; partial rot is a warning, not an outage
    sys.exit(1 if stats and not any(isinstance(v, int) and v > 0 for v in stats.values()) else 0)


if __name__ == "__main__":
    main()
