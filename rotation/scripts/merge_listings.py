#!/usr/bin/env python3
"""merge_listings.py — fold researched concert listings into data/concerts-tokyo.json.

Usage:  python3 scripts/merge_listings.py listings1.json [listings2.json ...] \
            [--data rotation-dir] [--out data-dir] [--added YYYY-MM-DD]

Same contract as concert_agent.py's merge step, but sourced from files instead of a
live agent turn: each input is a JSON array of listing objects
  {"acts": [...], "title", "date", "until", "venue", "city", "area", "url", "note"}
(the schema rotation_match.py takes). All inputs are concatenated, deduped on
(title, date, venue), matched against the library with rotation_match.py, and each
matched LIBRARY ARTIST becomes one row in concerts-tokyo.json — a festival day with
four library acts on the bill lands as four rows sharing the same title/venue/url, so
every artist keeps their own tour badge and map dot. Existing rows and their marks
(status: new/want/seen/skip) are never touched; a (artist, date) pair already in the
collection is skipped. Venue coordinates are inherited from existing rows that name
the same venue; unknown venues are left for build-data.js's city anchors.
"""
import argparse, datetime, json, os, re, subprocess, sys, unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))


def norm(s):
    s = unicodedata.normalize("NFKC", s or "").lower()
    return re.sub(r"\W+", "", s, flags=re.UNICODE)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("listings", nargs="+")
    ap.add_argument("--data", default=os.path.dirname(HERE), help="rotation dir (fuadex.csv etc.)")
    ap.add_argument("--out", default=os.path.join(os.path.dirname(HERE), "data"))
    ap.add_argument("--added", default=str(datetime.date.today()))
    args = ap.parse_args()

    today = str(datetime.date.today())
    rows, seen_l = [], set()
    for p in args.listings:
        try:
            arr = json.load(open(p, encoding="utf-8"))
        except Exception as e:
            print(f"skip {p}: {e}", file=sys.stderr); continue
        if not isinstance(arr, list):
            print(f"skip {p}: not a list", file=sys.stderr); continue
        for L in arr:
            if not isinstance(L, dict) or not L.get("date"):
                continue
            if (L.get("until") or L["date"]) < today:
                continue
            k = (norm(L.get("title")), L["date"], norm(L.get("venue")))
            if k in seen_l:
                continue
            seen_l.add(k); rows.append(L)
    print(f"{len(rows)} listings after window/dedupe filter")

    lp = os.path.join(args.out, f"listings-research-{args.added}.json")
    mp = os.path.join(args.out, f"matches-research-{args.added}.json")
    json.dump(rows, open(lp, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    subprocess.run([sys.executable, "-I", os.path.join(HERE, "rotation_match.py"), lp, mp,
                    "--data", args.data], check=True)

    cp = os.path.join(args.out, "concerts-tokyo.json")
    coll = json.load(open(cp, encoding="utf-8")) if os.path.exists(cp) else {"concerts": []}
    have = {(norm(c.get("artist")), c.get("on") or c.get("from")) for c in coll["concerts"]}
    # older brief rows span a run of nights with from/until and no single `on`:
    # any date inside such a range counts as already covered for that artist
    ranges = [(norm(c.get("artist")), c.get("from") or c.get("on"), c.get("until"))
              for c in coll["concerts"] if c.get("until") and (c.get("from") or c.get("on"))]

    def dup(nart, date):
        return (nart, date) in have or any(a == nart and f <= date <= u for a, f, u in ranges)
    # venue -> (lat,lng) from rows that already carry coordinates
    vll = {}
    for c in coll["concerts"]:
        v = norm(c.get("venue") or c.get("place"))
        if v and c.get("lat") is not None and c.get("lng") is not None:
            vll.setdefault(v, (c["lat"], c["lng"]))

    # listing-key -> original listing, to carry area/note through the matcher
    orig = {(norm(L.get("title")), L.get("date"), norm(L.get("venue"))): L for L in rows}
    added = []
    for m in json.load(open(mp, encoding="utf-8")):
        L = orig.get((norm(m.get("title")), m.get("date"), norm(m.get("venue")))) or {}
        for b in m["matches"]:          # one row PER matched library artist on the bill
            key = (norm(b["artist"]), m.get("date"))
            if dup(*key):
                continue
            slugged = re.sub(r"[^a-z0-9]+", "-", unicodedata.normalize("NFKD", b["artist"].lower())
                             .encode("ascii", "ignore").decode()).strip("-") or norm(b["artist"])[:12]
            row = {"id": f'{args.added}-{slugged}-{m.get("date")}',
                   "added": args.added, "status": "new",
                   "title": m.get("title") or ", ".join(m["acts"]),
                   "venue": m.get("venue"), "city": m.get("city") or "Tokyo",
                   "href": m.get("url"), "on": m.get("date"),
                   "until": m.get("until") or m.get("date"),
                   "acts": m["acts"], "artist": b["artist"], "plays": b["plays"],
                   "japanese": b["japanese"], "tier": b["tier"],
                   "seenLive": b["seenLive"], "lastSeen": b["lastSeen"],
                   "rotation": True, "cat": "music"}
            if L.get("area"):
                row["area"] = L["area"]
            if L.get("note"):
                row["text"] = L["note"]
            ll = vll.get(norm(m.get("venue")))
            if ll:
                row["lat"], row["lng"] = ll
            coll["concerts"].append(row); have.add(key); added.append(row)

    coll.update(generated=args.added, count=len(coll["concerts"]))
    json.dump(coll, open(cp, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{len(added)} new rows -> {cp} (total {coll['count']})")
    for r in sorted(added, key=lambda r: (r["on"], r["artist"])):
        print(f'  {r["tier"]:4} {r["on"]} {r["artist"]} ({r["plays"]} plays'
              f'{", JP" if r["japanese"] else ""}) @ {r.get("venue") or r.get("city")}')


if __name__ == "__main__":
    main()
