#!/usr/bin/env python3
"""rotation_match.py — match Tokyo concert listings against Fuad's whole Rotation library.

Usage:  python3 rotation_match.py listings.json matches.json [--data DIR]

listings.json: [{"acts": ["MONO", "Envy"], "title": "THE ARGUMENT 2026", "date": "2026-10-25",
                 "until": "2026-10-25", "venue": "Spotify O-EAST", "url": "https://..."}, ...]
  Write every billed act you can see (headliners AND support), in whatever script the
  listing uses — カタカナ / 漢字 names match through Rotation's MusicBrainz aliases.

Data (downloaded from github.com/Fuadex/fuad.au/rotation into DIR, default ./rotation):
  fuadex.csv           scrobbles (artist, album, track, "DD Mon YYYY HH:MM")
  artist-aliases.json  {artist: {aliases: [...]}}   cross-script names (ミドリ ↔ Midori)
  artist-origins.json  {artist: {country: "JP", ...}}
  gigs.json            {gigs: [{artist, date, ...}]}   attended shows (setlist.fm)
  gigs-manual.json     {add: [{artist, date}], ...}     hand-added attended shows

Matching follows Rotation's own enrich-tm.js idea (normalised-name join) but also keeps
non-Latin names, which enrich-tm's ascii norm drops, and joins through aliases.
Output: one row per (listing, matched act), best act first, with a priority tier:
  "top"   not seen live, and (plays >= 30, or Japanese with plays >= 8, or 10+ plays in 2 yrs)
  "seen"  already seen live (any plays) — kept, but ranked low and labelled
  "also"  everything else with plays >= 5
Short or generic names (<= 4 normalised chars) need plays >= 30 to count, to avoid
"Castle"/"Rude"/"Satan" style collisions — unless MusicBrainz says the act is Japanese.
"""
import csv, json, sys, os, re, unicodedata, datetime, collections

def norm_latin(s):
    s = unicodedata.normalize("NFKD", s or "").lower()
    return re.sub(r"[^a-z0-9]", "", s)

def norm_any(s):
    """Script-preserving key: NFKC, lowercase, drop spaces/punctuation, keep kana/kanji."""
    s = unicodedata.normalize("NFKC", s or "").lower()
    s = re.sub(r"^the\s+", "", s)
    return "".join(ch for ch in s if ch.isalnum())

def keys_for(name):
    out = set()
    a = norm_any(name); l = norm_latin(name)
    if a: out.add(a)
    if l: out.add(l)
    return out

def load(dirn, f, default):
    try:
        with open(os.path.join(dirn, f), encoding="utf-8") as fh: return json.load(fh)
    except Exception: return default

def main():
    args = sys.argv[1:]
    if len(args) < 2: sys.exit(__doc__)
    dirn = "rotation"
    if "--data" in args: dirn = args[args.index("--data") + 1]
    listings = json.load(open(args[0], encoding="utf-8"))
    today = datetime.date.today()
    cutoff = today.replace(year=today.year - 2)

    plays = collections.Counter(); recent = collections.Counter(); last = {}
    with open(os.path.join(dirn, "fuadex.csv"), encoding="utf-8", errors="ignore") as fh:
        for row in csv.reader(fh):
            if len(row) < 4 or not row[0]: continue
            a = row[0]; plays[a] += 1
            try:
                d = datetime.datetime.strptime(row[3].strip(), "%d %b %Y %H:%M").date()
                if d >= cutoff: recent[a] += 1
                if a not in last or d > last[a]: last[a] = d
            except Exception: pass

    aliases = load(dirn, "artist-aliases.json", {})
    origins = load(dirn, "artist-origins.json", {})
    gigs = load(dirn, "gigs.json", {}).get("gigs", []) + load(dirn, "gigs-manual.json", {}).get("add", [])
    seen = collections.defaultdict(list)
    for g in gigs:
        for k in keys_for(g.get("artist", "")): seen[k].append(g.get("date", ""))

    index = {}  # key -> canonical artist (highest plays wins)
    def put(k, name):
        if not k: return
        if k not in index or plays[name] > plays[index[k]]: index[k] = name
    for name in plays:
        for k in keys_for(name): put(k, name)
        for al in (aliases.get(name) or {}).get("aliases", []) or []:
            for k in keys_for(al): put(k, name)

    out = []
    for L in listings:
        acts = L.get("acts") or ([L["title"]] if L.get("title") else [])
        hits = []
        for act in acts:
            name = None
            for k in keys_for(act):
                if k in index: name = index[k]; break
            if not name: continue
            p = plays[name]; short = len(norm_any(name)) <= 4
            cc = (origins.get(name) or {}).get("country", "")
            if p < 5 or (short and p < 30 and cc != "JP"): continue
            sdates = sorted(set(seen.get(norm_any(name), []) + seen.get(norm_latin(name), [])))
            jp = cc == "JP"
            if sdates: tier = "seen"
            elif p >= 30 or (jp and p >= 8) or recent[name] >= 10: tier = "top"
            else: tier = "also"
            score = p + 3 * recent[name] + (150 if jp else 0) - (10000 if sdates else 0)
            hits.append({"act": act, "artist": name, "plays": p, "recentPlays": recent[name],
                         "lastPlayed": last.get(name, "").isoformat() if last.get(name) else "",
                         "country": cc, "japanese": jp, "seenLive": len(sdates),
                         "lastSeen": sdates[-1] if sdates else "", "tier": tier, "score": score})
        if not hits: continue
        hits.sort(key=lambda h: -h["score"])
        best = hits[0]
        out.append({**{k: L.get(k) for k in ("title", "date", "until", "venue", "url") if L.get(k)},
                    "acts": acts, "matches": hits, "tier": best["tier"], "score": best["score"]})
    order = {"top": 0, "also": 1, "seen": 2}
    out.sort(key=lambda r: (order[r["tier"]], -r["score"]))
    json.dump(out, open(args[1], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    for r in out:
        b = r["matches"][0]
        print(f'{r["tier"]:4} {r.get("date","?")} {b["artist"]} ({b["plays"]} plays{", JP" if b["japanese"] else ""}{", seen "+str(b["seenLive"])+"x" if b["seenLive"] else ""}) — {r.get("title") or ", ".join(r["acts"])} @ {r.get("venue","")}')
    print(f"{len(out)} listings matched of {len(listings)}", file=sys.stderr)

if __name__ == "__main__":
    main()
