#!/usr/bin/env python3
"""apply_mark.py — set a show's mark in data/concerts-tokyo.json.

Usage:  python3 scripts/apply_mark.py <want|skip|seen|new> <row-id> [--data data]

Backs the GitHub-issue mark flow (.github/workflows/gig-marks.yml): a "want" button on
the Gigs page opens a prefilled issue titled `gig: want <id>`; the workflow runs this and
commits. Exit codes: 0 applied, 2 row not found, 3 bad mark — the workflow reports both.
"""
import json, os, sys, datetime

MARKS = {"want", "skip", "seen", "new"}


def main():
    argv = sys.argv[1:]
    data = "data"
    if "--data" in argv:
        i = argv.index("--data"); data = argv[i + 1]; argv = argv[:i] + argv[i + 2:]
    args = argv
    if len(args) != 2 or args[0] not in MARKS:
        print(f"bad arguments: want|skip|seen|new + row id (got {sys.argv[1:]})"); sys.exit(3)
    mark, rid = args
    p = os.path.join(data, "concerts-tokyo.json")
    d = json.load(open(p, encoding="utf-8"))
    row = next((c for c in d["concerts"] if c.get("id") == rid), None)
    if not row:
        print(f"no row with id {rid}"); sys.exit(2)
    old = row.get("status")
    row["status"] = mark
    row["reviewedAt"] = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")
    json.dump(d, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{rid}: {old} -> {mark} ({row.get('artist')} {row.get('on')} @ {row.get('venue') or row.get('place') or ''})")


if __name__ == "__main__":
    main()
