#!/usr/bin/env python3
"""discover.py — taste-adjacent acts the library matcher can't surface.

Usage:  python3 scripts/discover.py [listings.json ...] [--data rotation-dir] [--out data]

Scans listing files (default: every data/listings-*.json) for acts that are NOT in the
library but keep appearing on bills WITH library artists — the "opens for Paledusk,
shares nights with yeti let you notice" signal. Pure heuristics, no LLM:

  anchor     a billed act that resolves to a library artist with >= 10 plays
  candidate  an unresolved act co-billed with >= 1 anchor
  score      sum over its distinct future events of (1 + log10(best anchor plays)),
             kept when it has >= 2 such events, or one event with a >= 100-play anchor

Acts in data/discover-skip.json (plain array of names) are suppressed — mark an act
there when a suggestion misses. Output: data/discoveries.json {generated, picks:[...]},
which build-data.js rides into the Gigs page's "worth a look" shelf.
"""
import argparse, datetime, glob, json, math, os, re, sys, unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from rotation_match import keys_for, norm_any  # noqa: E402  (same contract as the matcher)

JUNK = re.compile(r"(and more|他|ほか|出演者|後日発表|^(dj|live|guest|o\.?a\.?)[：:]?$|^(vo|gt|ba|dr|key)[：:.])", re.I)


def main():
    import csv, collections
    ap = argparse.ArgumentParser()
    ap.add_argument("listings", nargs="*")
    ap.add_argument("--data", default=os.path.dirname(HERE))
    ap.add_argument("--out", default=os.path.join(os.path.dirname(HERE), "data"))
    a = ap.parse_args()
    dirn, out = a.data, a.out
    files = a.listings or sorted(glob.glob(os.path.join(out, "listings-*.json")))
    today = str(datetime.date.today())

    plays = collections.Counter()
    with open(os.path.join(dirn, "fuadex.csv"), encoding="utf-8", errors="ignore") as fh:
        for row in csv.reader(fh):
            if len(row) >= 4 and row[0]:
                plays[row[0]] += 1
    aliases = json.load(open(os.path.join(dirn, "artist-aliases.json"), encoding="utf-8"))
    origins = json.load(open(os.path.join(dirn, "artist-origins.json"), encoding="utf-8"))
    index = {}
    def put(k, n):
        if k and (k not in index or plays[n] > plays[index[k]]): index[k] = n
    for name in plays:
        for k in keys_for(name): put(k, name)
        jp = (origins.get(name) or {}).get("country", "") == "JP"
        for al in (aliases.get(name) or {}).get("aliases", []) or []:
            if len(norm_any(al)) <= 4 and not jp: continue
            for k in keys_for(al): put(k, name)
    def resolve(act):
        for k in keys_for(act):
            if k in index: return index[k]
        return None

    skip_p = os.path.join(out, "discover-skip.json")
    skipped = {norm_any(s) for s in (json.load(open(skip_p, encoding="utf-8")) if os.path.exists(skip_p) else [])}

    cand = {}
    seen_ev = set()
    for f in files:
        try:
            arr = json.load(open(f, encoding="utf-8"))
        except Exception:
            continue
        for L in arr if isinstance(arr, list) else []:
            date = L.get("date") or ""
            if not isinstance(L, dict) or date < today: continue
            acts = [a for a in (L.get("acts") or []) if isinstance(a, str)]
            ek = (norm_any(L.get("title")), date, norm_any(L.get("venue")))
            if ek in seen_ev: continue
            seen_ev.add(ek)
            anchors = [(a, resolve(a)) for a in acts]
            best = max((plays[n] for _, n in anchors if n and plays[n] >= 10), default=0)
            if not best: continue
            withs = [n for _, n in anchors if n and plays[n] >= 10]
            for a in acts:
                if resolve(a) or len(norm_any(a)) < 3 or len(a) > 40 or JUNK.search(a): continue
                if norm_any(a) in skipped: continue
                c = cand.setdefault(norm_any(a), {"act": a, "events": [], "with": collections.Counter(), "score": 0.0})
                c["events"].append({"d": date, "title": (L.get("title") or "")[:80], "venue": L.get("venue") or "",
                                    "city": L.get("city") or "", "url": L.get("url") or ""})
                for w in withs: c["with"][w] = max(c["with"][w], plays[w])
                c["score"] += 1 + math.log10(best)

    picks = [c for c in cand.values()
             if len(c["events"]) >= 2 or max(c["with"].values(), default=0) >= 100]
    for c in picks:
        c["events"].sort(key=lambda e: e["d"])
        c["with"] = [w for w, _ in c["with"].most_common(4)]
        c["score"] = round(c["score"], 1)
    picks.sort(key=lambda c: -c["score"])
    picks = picks[:15]
    json.dump({"generated": today, "picks": picks},
              open(os.path.join(out, "discoveries.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{len(cand)} candidates -> {len(picks)} picks")
    for c in picks:
        print(f'  {c["score"]:6.1f} {c["act"]} — with {", ".join(c["with"][:3])} · {len(c["events"])} events (next {c["events"][0]["d"]})')


if __name__ == "__main__":
    main()
