"""lyric-refetch.py - stage 0 of both pipelines: turn KEYS WITH NO TEXT into text on disk.

`lyric-extract.py` can only resolve a key that some store already holds. Everything else -
never fetched, a cached fetch error, a not-found, a body too short to score - is simply
absent from the work queue, and the pipelines can never reach it. This script is the one
that goes and gets it.

SOURCE OF RECORD: LRCLIB (lrclib.net), the same source the 2026-08-28 Japanese gap-fill and
the 2026-09-19 backfill used, and the only live one - the lyric dump caps at 2022.

  by REAL NAMES, never de-slugged    the standing rule (MOOD_PIPELINE.md section 3.4). Names
                                     come from lyric-names.js, which rebuilds them from the
                                     scrobble CSV through the coherency ledger.
  /api/get first, /api/search second exact match, then fuzzy behind an ARTIST GATE - a fuzzy
                                     title alone must never attach another song's lyric.
  SHORTEST qualifying text wins      the 2026-09-19 correction. LRCLIB hosts an English fan
                                     translation and the original under one title; the older
                                     longest-text selection preferred the translation, and
                                     eleven entries (the whole Midori catalogue among them)
                                     came back mis-tagged as English. Shortest-qualifying
                                     picks the original. The fuzzy pass always ranks that
                                     way; the exact pass escalates to it when the text it
                                     got does not detect as the language the corpus expects.
  langdetect                         the detector of record since 2026-09-19 (NOT the older
                                     cld3/fasttext pair), seeded for determinism.

CACHED NEGATIVES. Anything that genuinely has no lyric is written back as a negative so it
never costs another request: {ok:false} not-found, {ok:false, short:n} too short to score,
{ok:false, instrumental:true} instrumental. Transport failures are recorded as
{ok:false, err:<code>} instead, which stays RETRYABLE - a 429 is not evidence of absence.

PRIVACY. Lyric text lands only in the untracked scratch stores, and only ever as a length in
a log line. The tool is tracked; the text never is. Both output paths are refused if they
resolve outside the scratch tree.

Crash-safe: every fetch appends to a JSONL journal (flushed + fsynced), and the journal is
merged into the store at the end. Re-running skips everything the journal already holds, so
a killed run resumes. `--merge-only` replays a journal without touching the network.

Runs on ANY python - stdlib plus langdetect. It needs no CUDA and no ML venv.

Usage
  node   rotation/tools/lyric-names.js --out <sptmp>/refetch-work/name-index.json
  python rotation/tools/lyric-refetch.py --plan
  python rotation/tools/lyric-refetch.py --limit 25
  python rotation/tools/lyric-refetch.py
  python rotation/tools/lyric-refetch.py --merge-only
"""
from __future__ import annotations

import argparse
import json
import os
import random
import re
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from concurrent.futures import ThreadPoolExecutor

sys.stdout.reconfigure(encoding="utf-8")

TOOLS = os.path.dirname(os.path.abspath(__file__))
ROTATION = os.path.dirname(TOOLS)
REPO = os.path.dirname(ROTATION)
WORKSPACE = os.path.dirname(REPO)
SPTMP = os.environ.get("ROTATION_SPTMP") or os.path.join(WORKSPACE, ".sptmp")
NRC = os.path.join(SPTMP, "nrc-audit")

GENIUS_LYRICS = os.path.join(ROTATION, "genius-lyrics.json")
GENIUS_MOOD = os.path.join(ROTATION, "genius-mood.json")
GENIUS_THEMES = os.path.join(ROTATION, "genius-themes.json")

LRCLIB_STORE = os.path.join(SPTMP, "lrclib-lyrics.json")
GENIUS_TEXT = os.path.join(SPTMP, "genius-text.json")
WORK_DIR = os.path.join(SPTMP, "refetch-work")
NAME_INDEX = os.path.join(WORK_DIR, "name-index.json")
JOURNAL = os.path.join(WORK_DIR, "refetch.jsonl")

UA = "fuad.au-rotation/0.1 (https://fuad.au)"
API_GET = "https://lrclib.net/api/get"
API_SEARCH = "https://lrclib.net/api/search"

MIN_BODY = 40          # the floor lyric-extract.py applies to a cleaned body
TIMEOUT = 20
RETRY_STATUS = (429, 500, 502, 503, 504)

# reasons a key can have no text; `instrumental` is never retried
RETRYABLE = ("never-fetched", "fetch-error", "not-found", "too-short")

_SECTION = re.compile(r"\[.*?\]")


def clean(raw):
    """Same hygiene lyric-extract.py applies before its length floor."""
    return _SECTION.sub(" ", raw or "").strip()


def load_json(path, dflt=None):
    if not os.path.exists(path):
        return {} if dflt is None else dflt
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


# ---------------------------------------------------------------------------
# language detection
# ---------------------------------------------------------------------------
_detect = None


def detect_lang(text):
    """ISO-639-1-ish code, or '' when the detector is unavailable or unsure."""
    global _detect
    if _detect is None:
        try:
            from langdetect import DetectorFactory, detect
            DetectorFactory.seed = 0            # deterministic
            _detect = detect
        except Exception:
            _detect = False
    if not _detect:
        return ""
    try:
        return (_detect(text[:4000]) or "")[:2]
    except Exception:
        return ""


# ---------------------------------------------------------------------------
# the work queue - which keys have no text, and why
# ---------------------------------------------------------------------------
def load_workshop_keys():
    keys = set()
    for name in ("rest_lyrics.jsonl", "surgical_lyrics.jsonl",
                 "calib_lyrics.jsonl", "gap-lyrics.jsonl"):
        p = os.path.join(NRC, name)
        if not os.path.exists(p):
            continue
        with open(p, encoding="utf-8") as fh:
            for ln in fh:
                ln = ln.strip()
                if not ln:
                    continue
                try:
                    r = json.loads(ln)
                except ValueError:
                    continue
                t = r.get("text") or r.get("lyrics")
                if r.get("key") and t and len(clean(t)) >= MIN_BODY:
                    keys.add(r["key"])
    return keys


class Queue:
    def __init__(self):
        self.meta = load_json(GENIUS_LYRICS)
        self.mood = load_json(GENIUS_MOOD)
        self.themes = load_json(GENIUS_THEMES)
        self.lrclib = load_json(LRCLIB_STORE)
        self.genius = load_json(GENIUS_TEXT)
        self.workshop = load_workshop_keys()

    def has_text(self, key):
        v = self.lrclib.get(key)
        if isinstance(v, dict) and isinstance(v.get("lyrics"), str) \
                and len(clean(v["lyrics"])) >= MIN_BODY:
            return "lrclib"
        g = self.genius.get(key)
        if isinstance(g, str) and len(clean(g)) >= MIN_BODY:
            return "genius"
        if key in self.workshop:
            return "workshop"
        return None

    def reason(self, key):
        v = self.lrclib.get(key)
        if v is None:
            return "never-fetched"
        if v.get("instrumental"):
            return "instrumental"
        if v.get("err"):
            return "fetch-error"
        if v.get("ok") is False:
            return "not-found"
        return "too-short"

    def targets(self, want):
        want_mood = want in ("mood", "both")
        want_themes = want in ("themes", "both")
        out = []
        for k in self.meta:
            if want_mood and k not in self.mood:
                pass
            elif want_themes and k not in self.themes:
                pass
            else:
                continue
            if self.has_text(k):
                continue
            out.append(k)
        return sorted(out)


# ---------------------------------------------------------------------------
# LRCLIB
# ---------------------------------------------------------------------------
# One global pacer, however many workers are running. LRCLIB answers most calls in ~0.4s
# but occasionally takes 15s+, so a single serial worker spends its life waiting on the tail
# rather than on the rate limit. Workers overlap that wait; the pacer is what keeps the
# REQUEST RATE polite, and it is enforced across every thread.
_pace_lock = threading.Lock()
_next_slot = [0.0]
_status_counts = Counter()


def pace(min_interval):
    with _pace_lock:
        now = time.time()
        slot = max(now, _next_slot[0])
        _next_slot[0] = slot + min_interval
    wait = slot - now
    if wait > 0:
        time.sleep(wait)


def http_json(url, min_interval):
    """GET -> (status, parsed json or None). Backs off and retries the polite statuses."""
    delay = 5.0
    for attempt in range(4):
        pace(min_interval)
        req = urllib.request.Request(url, headers={"User-Agent": UA,
                                                   "Accept": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT) as res:
                body = res.read().decode("utf-8", "replace")
                _status_counts[res.status] += 1
                return res.status, json.loads(body) if body.strip() else None
        except urllib.error.HTTPError as e:
            _status_counts[e.code] += 1
            if e.code in RETRY_STATUS and attempt < 3:
                time.sleep(delay + random.random())
                delay *= 2
                continue
            return e.code, None
        except json.JSONDecodeError:
            _status_counts["badjson"] += 1
            return 200, None
        except Exception as e:
            _status_counts["x:" + type(e).__name__] += 1
            if attempt < 3:
                time.sleep(delay + random.random())
                delay *= 2
                continue
            return 0, None
    return 0, None


def fold(s):
    return re.sub(r"\s+", "", str(s or "").lower())


def qualifies(rec):
    """A candidate with a usable plain lyric -> (text, cleaned length), else None."""
    if not isinstance(rec, dict):
        return None
    t = rec.get("plainLyrics")
    if not isinstance(t, str):
        return None
    t = t.strip()
    n = len(clean(t))
    if n < MIN_BODY:
        return None
    return t, n


def search_candidates(artist, title, sleep_base):
    """Fuzzy /api/search behind the ARTIST GATE, shortest qualifying text first."""
    q = urllib.parse.urlencode({"q": f"{artist} {title}"})
    status, arr = http_json(f"{API_SEARCH}?{q}", sleep_base)
    if status != 200 or not isinstance(arr, list):
        return [], status
    fa = fold(artist)
    out = []
    for c in arr:
        ca = fold(c.get("artistName"))
        if not ca or not fa:
            continue
        if not (ca in fa or fa in ca):        # ARTIST GATE - non-negotiable
            continue
        if c.get("instrumental"):
            continue
        qq = qualifies(c)
        if qq:
            out.append((qq[1], qq[0], c))     # (length, text, record)
    out.sort(key=lambda x: x[0])              # SHORTEST qualifying first
    return out, status


def fetch_one(key, artist, title, want_lang, sleep_base):
    """-> a journal row. Never returns text in any field but `lyrics`."""
    row = {"key": key, "artist": artist, "title": title}
    q = urllib.parse.urlencode({"artist_name": artist, "track_name": title})
    status, rec = http_json(f"{API_GET}?{q}", sleep_base)

    if status == 200 and isinstance(rec, dict) and rec.get("instrumental"):
        row.update(result="instrumental", via="get")
        return row

    exact = qualifies(rec) if status == 200 else None
    if exact:
        text, n = exact
        lang = detect_lang(text)
        # the translation-mistag escalation: the corpus says one language, the text
        # detects as another -> re-rank the fuzzy pool by SHORTEST qualifying text and
        # prefer a candidate that detects as the language the corpus expects.
        if want_lang and lang and lang != want_lang:
            cands, _ = search_candidates(artist, title, sleep_base)
            picked = None
            for ln, t, c in cands:
                if detect_lang(t) == want_lang:
                    picked = (ln, t, c)
                    break
            if picked is None and cands:
                shortest = cands[0]
                if shortest[0] < n:
                    picked = shortest
            if picked:
                ln, t, c = picked
                row.update(result="hit", via="get+shortest", lyrics=t, chars=ln,
                           lang=detect_lang(t), lang_was=lang, lrc_id=c.get("id"),
                           lrc_name=c.get("trackName"), lrc_artist=c.get("artistName"))
                return row
        row.update(result="hit", via="get", lyrics=text, chars=n, lang=lang,
                   lrc_id=rec.get("id"), lrc_name=rec.get("trackName"),
                   lrc_artist=rec.get("artistName"))
        return row

    if status not in (200, 404):
        row.update(result="error", err=status, via="get")
        return row

    # short body on an exact hit still deserves the fuzzy pass before it is cached off
    cands, sstatus = search_candidates(artist, title, sleep_base)
    if cands:
        ln, t, c = cands[0]                   # SHORTEST qualifying
        if want_lang:
            for cl, ct, cc in cands:
                if detect_lang(ct) == want_lang:
                    ln, t, c = cl, ct, cc
                    break
        row.update(result="hit", via="search", lyrics=t, chars=ln, lang=detect_lang(t),
                   lrc_id=c.get("id"), lrc_name=c.get("trackName"),
                   lrc_artist=c.get("artistName"))
        return row
    if sstatus not in (200, 404):
        row.update(result="error", err=sstatus, via="search")
        return row
    if status == 200 and isinstance(rec, dict) and isinstance(rec.get("plainLyrics"), str):
        row.update(result="short", chars=len(clean(rec["plainLyrics"])), via="get")
        return row
    row.update(result="miss", via="search")
    return row


# ---------------------------------------------------------------------------
# journal + store
# ---------------------------------------------------------------------------
def read_journal(path):
    rows = {}
    if not os.path.exists(path):
        return rows
    with open(path, encoding="utf-8") as fh:
        for ln in fh:
            ln = ln.strip()
            if not ln:
                continue
            try:
                r = json.loads(ln)
            except ValueError:
                continue                       # torn last line from a crash
            if r.get("key"):
                rows[r["key"]] = r
    return rows


def merge_journal(store_path, rows, apply=True):
    """Fold journal rows into the LRCLIB store. Returns a per-result counter."""
    store = load_json(store_path)
    stat = Counter()
    for key, r in rows.items():
        res = r.get("result")
        stat[res] += 1
        if not apply:
            continue
        if res == "hit":
            rec = {"ok": True, "lyrics": r["lyrics"]}
            if r.get("lrc_id") is not None:
                rec["id"] = r["lrc_id"]
            if r.get("lrc_name"):
                rec["name"] = r["lrc_name"]
            if r.get("lrc_artist"):
                rec["artist"] = r["lrc_artist"]
            if r.get("lang"):
                rec["lang"] = r["lang"]
            rec["via"] = r.get("via") or "get"
            store[key] = rec
        elif res == "instrumental":
            store[key] = {"ok": False, "instrumental": True}
        elif res == "short":
            store[key] = {"ok": False, "short": r.get("chars", 0)}
        elif res == "miss":
            store[key] = {"ok": False}
        elif res == "error":
            store[key] = {"ok": False, "err": r.get("err", 0)}
    if apply:
        bak = store_path + ".bak"
        if os.path.exists(store_path) and not os.path.exists(bak):
            with open(store_path, "rb") as a, open(bak, "wb") as b:
                b.write(a.read())
        tmp = store_path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as fh:
            json.dump(store, fh, ensure_ascii=False)
        os.replace(tmp, store_path)
    return stat, len(store)


# ---------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--targets", choices=["mood", "themes", "both"], default="both")
    ap.add_argument("--keys-file",
                    help="explicit newline-separated key list instead of --targets. Use it "
                         "for keys that already HAVE a row and so are invisible to the "
                         "unclassified queue - the pre-Qwen straggler rows, for instance")
    ap.add_argument("--name-index", default=NAME_INDEX)
    ap.add_argument("--journal", default=JOURNAL)
    ap.add_argument("--store", default=LRCLIB_STORE)
    ap.add_argument("--include", default=",".join(RETRYABLE),
                    help="comma list of miss reasons to retry; `instrumental` is never one")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--sleep", type=float, default=0.4,
                    help="minimum gap between REQUEST STARTS, enforced across all workers")
    ap.add_argument("--workers", type=int, default=1,
                    help="parallel fetchers. The pacer still caps the request rate; workers "
                         "only stop one slow LRCLIB response from stalling the queue")
    ap.add_argument("--progress-every", type=int, default=25)
    ap.add_argument("--plan", action="store_true", help="report the queue and exit")
    ap.add_argument("--merge-only", action="store_true",
                    help="fold an existing journal into the store, no network")
    ap.add_argument("--no-merge", action="store_true", help="fetch but leave the store alone")
    args = ap.parse_args()

    for p, what in ((args.journal, "--journal"), (args.store, "--store")):
        if not os.path.abspath(p).startswith(os.path.abspath(SPTMP)):
            print(f"REFUSING: {what} must live under the scratch tree {SPTMP} "
                  f"(lyric text is never written outside it)")
            sys.exit(2)
    os.makedirs(os.path.dirname(os.path.abspath(args.journal)), exist_ok=True)

    if args.merge_only:
        rows = read_journal(args.journal)
        stat, total = merge_journal(args.store, rows, apply=True)
        print(f"merged {len(rows)} journal rows -> {args.store} ({total} keys)")
        print("by result:", dict(stat))
        return

    q = Queue()
    if args.keys_file:
        with open(args.keys_file, encoding="utf-8") as fh:
            wanted = [ln.strip() for ln in fh if ln.strip()]
        targets = [k for k in wanted if not q.has_text(k)]
        label = f"keys-file {os.path.basename(args.keys_file)} ({len(wanted)} keys)"
    else:
        targets = q.targets(args.targets)
        label = args.targets
    by_reason = Counter(q.reason(k) for k in targets)
    include = {s.strip() for s in args.include.split(",") if s.strip()} - {"instrumental"}

    print(f"genius-lyrics keys        : {len(q.meta)}")
    print(f"queue with NO text        : {len(targets)}  ({label})")
    print("  by reason               :", dict(by_reason))
    print(f"  retrying                : {sorted(include)}")

    if not os.path.exists(args.name_index):
        print(f"\nREFUSING: no name index at {args.name_index}\n"
              f"  build it first:  node rotation/tools/lyric-names.js --out {args.name_index}\n"
              f"  (fetching by de-slugged keys is forbidden - MOOD_PIPELINE.md section 3.4)")
        sys.exit(2)
    names = load_json(args.name_index)

    journal = read_journal(args.journal)
    queue = []
    unnamed = []
    for k in targets:
        if q.reason(k) not in include:
            continue
        if k in journal:
            continue
        n = names.get(k)
        if not n:
            unnamed.append(k)
            continue
        queue.append((k, n[0], n[1], (q.meta.get(k) or [""])[0] or ""))

    print(f"\nalready in the journal    : {len(journal)}")
    print(f"unnamed (cannot fetch)    : {len(unnamed)}")
    print(f"TO FETCH                  : {len(queue)}")
    if unnamed:
        print("  unnamed keys:", ", ".join(unnamed[:20]),
              f"... +{len(unnamed) - 20}" if len(unnamed) > 20 else "")
    if args.plan:
        want = Counter(l for _, _, _, l in queue)
        print("  expected languages      :", dict(want.most_common(12)))
        return
    if args.limit:
        queue = queue[:args.limit]
    if not queue:
        print("nothing to fetch")
    else:
        fh = open(args.journal, "a", encoding="utf-8")
        t0 = time.time()
        stat = Counter()
        write_lock = threading.Lock()
        seen = [0]

        def run_one(job):
            k, artist, title, want_lang = job
            row = fetch_one(k, artist, title, want_lang, args.sleep)
            # the journal is the crash-safe record: one line, flushed and fsynced, under a
            # lock so concurrent workers can never interleave a half-written line.
            with write_lock:
                stat[row.get("result")] += 1
                fh.write(json.dumps(row, ensure_ascii=False) + "\n")
                fh.flush()
                os.fsync(fh.fileno())
                seen[0] += 1
                i = seen[0]
                if i % args.progress_every == 0:
                    el = time.time() - t0
                    eta = el / i * (len(queue) - i)
                    print(f"  {i}/{len(queue)} · {el / i:.2f}s/key · eta {eta / 60:.1f}m · "
                          f"{dict(stat)}", flush=True)

        try:
            if args.workers > 1:
                with ThreadPoolExecutor(max_workers=args.workers) as pool:
                    list(pool.map(run_one, queue))
            else:
                for job in queue:
                    run_one(job)
        finally:
            fh.close()
        el = time.time() - t0
        print(f"\nfetched {sum(stat.values())} in {el / 60:.1f}m · {dict(stat)}")
        print("  HTTP statuses:", dict(_status_counts.most_common()))

    journal = read_journal(args.journal)
    hits = [r for r in journal.values() if r.get("result") == "hit"]
    print(f"\njournal total: {len(journal)} rows · {len(hits)} with text")
    if hits:
        langs = Counter(r.get("lang") or "??" for r in hits)
        print("  detected languages:", dict(langs.most_common(15)))
        vias = Counter(r.get("via") for r in hits)
        print("  via               :", dict(vias))
        flips = [r for r in hits if r.get("lang_was")]
        if flips:
            print(f"  translation-mistag escalations that changed the pick: {len(flips)}")
            for r in flips[:10]:
                print(f"    {r['key']}: {r['lang_was']} -> {r.get('lang')}")

    if not args.no_merge:
        stat, total = merge_journal(args.store, journal, apply=True)
        print(f"\nmerged into {args.store} ({total} keys) · {dict(stat)}")
        q2 = Queue()
        still = [k for k in targets if not q2.has_text(k)]
        print(f"RECLAIMED: {len(targets)} keys had no text -> {len(still)} still do "
              f"(+{len(targets) - len(still)} now scoreable)")
        print("  remaining by reason:", dict(Counter(q2.reason(k) for k in still)))


if __name__ == "__main__":
    main()
