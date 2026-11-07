#!/usr/bin/env python3
"""merge_rows_export.py — fold an exported, reviewed copy of the concert rows back into data/concerts-tokyo.json.

Usage:  python scripts/merge_rows_export.py export.json [--write]

The export is a JSON array of concerts-tokyo.json rows as Fuad reviewed and researched them elsewhere (rows carry
`doc_id` instead of `id`, plus `reviewedAt` where a mark was set). Unlike merge_listings.py (raw listings in, existing
rows never touched), the export IS the reviewed state, so it wins (except `added`, the first-found date, kept live):
  - a row whose doc_id matches a live id: every field in the export overwrites the live field (marks, research text,
    venue, link, dates); fields only the live row has are kept;
  - no id match but the same (artist, date) as a live row: that live row is updated the same way and keeps its id;
  - otherwise the row is appended with id = doc_id.
Without --write it prints what would change and touches nothing.
"""
import json, os, re, sys, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data", "concerts-tokyo.json")


def norm(s):
    return re.sub(r"\W+", "", (s or "").lower())


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        sys.exit(__doc__)
    write = "--write" in sys.argv
    export = json.load(open(args[0], encoding="utf-8"))
    raw = open(DATA, encoding="utf-8").read()
    coll = json.loads(raw)
    rows = coll["concerts"]
    by_id = {r["id"]: r for r in rows}
    by_key = {(norm(r.get("artist")), r.get("on") or r.get("from")): r for r in rows}
    updated, added, unchanged = [], [], 0
    for x in export:
        x = dict(x)
        rid = x.pop("doc_id", None) or x.get("id")
        live = by_id.get(rid) or by_key.get((norm(x.get("artist")), x.get("on") or x.get("from")))
        if live is None:
            x["id"] = rid
            rows.append(x)
            added.append(rid)
            continue
        # the live row keeps its id and its first-found "added" date (the RSS feed reads it as "first found")
        diff = [k for k, v in x.items() if k not in ("id", "added") and live.get(k) != v]
        if not diff:
            unchanged += 1
            continue
        for k in diff:
            live[k] = x[k]
        updated.append((live["id"], diff))
    print(f"export rows {len(export)}: updated {len(updated)}, added {len(added)}, unchanged {unchanged}")
    for rid, diff in updated:
        print(f"  ~ {rid}: {', '.join(diff)}")
    for rid in added:
        print(f"  + {rid}")
    if write:
        coll["count"] = len(rows)
        coll["generated"] = datetime.date.today().isoformat()
        indent = 1 if '\n "' in raw[:200] else 2
        out = json.dumps(coll, ensure_ascii=False, indent=indent) + ("\n" if raw.endswith("\n") else "")
        open(DATA, "w", encoding="utf-8", newline="\n").write(out)
        print("written:", DATA, "rows", len(rows))
    else:
        print("dry run — pass --write to apply")


if __name__ == "__main__":
    main()
