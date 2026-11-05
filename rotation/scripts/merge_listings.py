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

# City-level coordinates for Japanese tour stops. build-data.js anchors only ~16 big
# cities and drops everything else at the Tokyo fallback, which would put a Kofu or
# Beppu tour date in the wrong place on the map — so rows get coords here instead.
# rotation/city-coords.json ("JP|City" keys) is consulted first; this covers the rest.
JP_CITY = {
    "akita": (39.72, 140.10), "aomori": (40.82, 140.74), "asahikawa": (43.77, 142.37),
    "beppu": (33.28, 131.49), "chigasaki": (35.33, 139.40), "ebina": (35.45, 139.39),
    "enoshima": (35.30, 139.48), "fuchu": (35.67, 139.48), "fujisawa": (35.34, 139.49),
    "fukui": (36.06, 136.22), "funabashi": (35.69, 139.98), "hakodate": (41.77, 140.73),
    "hakusan": (36.51, 136.56), "hiroshima": (34.39, 132.46), "kanazawa": (36.56, 136.66),
    "naha": (26.21, 127.68), "tatebayashi": (36.25, 139.54),
    "hamamatsu": (34.71, 137.73), "himeji": (34.82, 134.69), "hirosaki": (40.60, 140.46),
    "hyuga": (32.42, 131.62), "ichikawa": (35.72, 139.93), "iizuka": (33.65, 130.69),
    "inage": (35.64, 140.09), "isahaya": (32.84, 130.05), "kagoshima": (31.60, 130.56),
    "kashiwa": (35.86, 139.97), "kawaguchi": (35.81, 139.72), "kawasaki": (35.53, 139.70),
    "kochi": (33.56, 133.53), "kofu": (35.66, 138.57), "koriyama": (37.40, 140.36),
    "kumagaya": (36.15, 139.39), "kumamoto": (32.80, 130.71), "kure": (34.25, 132.57),
    "kurume": (33.32, 130.51), "machida": (35.55, 139.45), "maebashi": (36.39, 139.06),
    "matsumoto": (36.24, 137.97), "matsuyama": (33.84, 132.77), "mito": (36.37, 140.47),
    "miyazaki": (31.91, 131.42), "morioka": (39.70, 141.15), "nagano": (36.65, 138.18),
    "nagasaki": (32.75, 129.88), "nara": (34.69, 135.80), "oita": (33.24, 131.61),
    "ofunato": (39.08, 141.71), "okayama": (34.66, 133.92), "omiya": (35.91, 139.62),
    "onagawa": (38.44, 141.45), "otaru": (43.19, 141.00), "otsu": (35.00, 135.87),
    "sagamihara": (35.57, 139.37), "sakai": (34.57, 135.48), "shimonoseki": (33.96, 130.94),
    "shizuoka": (34.98, 138.38), "shunan": (34.05, 131.81), "takamatsu": (34.34, 134.05),
    "takasaki": (36.32, 139.00), "tokushima": (34.07, 134.55), "toyama": (36.70, 137.21),
    "toyohashi": (34.77, 137.39), "tsu": (34.72, 136.51), "ube": (33.95, 131.25),
    "utsunomiya": (36.56, 139.88), "wakayama": (34.23, 135.17), "yamagata": (38.26, 140.34),
    "yokkaichi": (34.97, 136.62), "yokosuka": (35.28, 139.67), "yonago": (35.43, 133.33),
    "gifu": (35.42, 136.76), "gobo": (33.89, 135.15), "hokuto": (35.78, 138.42),
    "iga": (34.77, 136.13), "iwanuma": (38.10, 140.87), "kurashiki": (34.60, 133.77),
    "marugame": (34.29, 133.80), "masuda": (34.67, 131.84), "nanyo": (38.06, 140.14),
    "nayoro": (44.36, 142.46), "obihiro": (42.92, 143.20), "oyabe": (36.68, 136.87),
    "saga": (33.26, 130.30), "togane": (35.56, 140.37), "tsuruoka": (38.73, 139.83),
    "yaizu": (34.87, 138.32),
}


def city_ll(city, data_dir):
    """(lat, lng) for a Japanese city, from city-coords.json or the table above."""
    if not city:
        return None
    if not hasattr(city_ll, "_cc"):
        try:
            cc = json.load(open(os.path.join(data_dir, "city-coords.json"), encoding="utf-8"))
            city_ll._cc = {k.split("|", 1)[1].lower(): tuple(v) for k, v in cc.items()
                           if k.startswith("JP|")}
        except Exception:
            city_ll._cc = {}
    key = city.strip().lower()
    return city_ll._cc.get(key) or JP_CITY.get(key)


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
            ll = vll.get(norm(m.get("venue"))) or city_ll(row["city"], args.data)
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
