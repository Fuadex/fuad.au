"""lyric-extract.py — stage 1 of both pipelines: resolve KEYS to lyric TEXT on disk.

The pipelines never carry lyric text in their own code, their arguments or their logs.
They carry KEYS. This script is the one place that opens a lyric store, and everything
it writes lands in the untracked scratch tree. Reproduces the shape the 2026-08 workshop
used (`extract_rest_lyrics.py` -> `rest_lyrics.jsonl`): one JSON object per line,

    {"key": "artistslug~trackslug", "lang": "en", "src": "lrclib", "text": "..."}

Stores searched, first hit wins (--sources to reorder / restrict):

  lrclib   <sptmp>/lrclib-lyrics.json    {key: {ok, lyrics, artist, name, id}}  — the
                                          LRCLIB-era fetch cache; also caches negatives
                                          ({ok:false}), fetch errors ({err}) and
                                          instrumentals ({instrumental:true})
  genius   <sptmp>/genius-text.json      {key: text}
  workshop <sptmp>/nrc-audit/*.jsonl     the 2026-08 extractions (rest/surgical/calib/gap)
                                          — these hold text for ALREADY-scored keys and are
                                          what the fidelity re-score runs on
  zip      <rotation>/archive_genius.zip the original dump stream (~3 GB, minutes per run;
                                          opt-in, never in the default source list)

Target selection:
  --missing-from mood|themes|both   keys in genius-lyrics.json with no row in the
                                    corresponding tracked store (the work queue)
  --scored-sample N                 N keys that ALREADY have both a genius-mood row and an
                                    llm_scores entry — the fidelity baseline set
  --themed-sample N                 N keys that ALREADY have a genius-themes row — the
                                    themes calibration holdout
  --keys-file PATH                  explicit newline-separated key list

Sampling is deterministic (--seed, default 20260921) so a pilot can be re-run.

Usage
  python lyric-extract.py --missing-from mood --limit 50 --stratify-lang \
      --out <sptmp>/mood-work/pilot-new.jsonl
  python lyric-extract.py --scored-sample 50 --out <sptmp>/mood-work/pilot-fidelity.jsonl
"""
from __future__ import annotations

import argparse
import io
import json
import os
import random
import re
import sys
import zipfile
from collections import Counter

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
LLM_SCORES = os.path.join(NRC, "llm_scores.json")

MIN_BODY = 40  # same floor the 2026-08 extractions used

# ── text hygiene, verbatim from extract_rest_lyrics.py ───────────────────────
_SECTION = re.compile(r"\[.*?\]")


def clean(raw: str) -> str:
    return _SECTION.sub(" ", raw or "").strip()


def load_json(path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


# ── stores ───────────────────────────────────────────────────────────────────
class Stores:
    def __init__(self, wanted):
        self.wanted = wanted
        self.lrclib = None
        self.genius = None
        self.workshop = None

    def _lrclib(self):
        if self.lrclib is None:
            p = os.path.join(SPTMP, "lrclib-lyrics.json")
            self.lrclib = load_json(p) if os.path.exists(p) else {}
        return self.lrclib

    def _genius(self):
        if self.genius is None:
            p = os.path.join(SPTMP, "genius-text.json")
            self.genius = load_json(p) if os.path.exists(p) else {}
        return self.genius

    def _workshop(self):
        if self.workshop is None:
            self.workshop = {}
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
                        k, t = r.get("key"), r.get("text") or r.get("lyrics")
                        if k and t and k not in self.workshop:
                            self.workshop[k] = (t, (r.get("lang") or "")[:2])
        return self.workshop

    def get(self, key, source):
        if source == "lrclib":
            v = self._lrclib().get(key)
            if isinstance(v, dict) and isinstance(v.get("lyrics"), str):
                body = clean(v["lyrics"])
                if len(body) >= MIN_BODY:
                    # rows written by lyric-refetch.py carry the language langdetect saw in
                    # THIS transcription, which can differ from genius-lyrics.json's note on
                    # the song. Every pre-2026-09-21 row has no `lang` field and falls back
                    # to the metadata exactly as before.
                    return body, (v.get("lang") or "")[:2]
        elif source == "genius":
            v = self._genius().get(key)
            if isinstance(v, str):
                body = clean(v)
                if len(body) >= MIN_BODY:
                    return body, ""
        elif source == "workshop":
            v = self._workshop().get(key)
            if v:
                body = clean(v[0])
                if len(body) >= MIN_BODY:
                    return body, v[1]
        return None

    def miss_reason(self, key):
        """Why a key has no text — for the report. Keys + reasons only, never text."""
        v = self._lrclib().get(key)
        if v is None:
            return "never-fetched"
        if v.get("instrumental"):
            return "instrumental"
        if v.get("err"):
            return "fetch-error"
        if v.get("ok") is False:
            return "not-found"
        return "too-short"


def stream_zip(keys_wanted, meta):
    """Last-resort source: the dump stream. Matches on the normalised artist/title index
    the 2026-08 scripts built from our-tracks.json; here we match on the slug key directly
    because genius-lyrics.json is already keyed that way."""
    zpath = os.path.join(ROTATION, "archive_genius.zip")
    if not os.path.exists(zpath):
        print(f"  zip source unavailable at {zpath}", flush=True)
        return {}
    pairs = os.path.join(SPTMP, "our-tracks.json")
    if not os.path.exists(pairs):
        print("  zip source needs our-tracks.json for the artist/title index — skipping",
              flush=True)
        return {}
    csv_mod = __import__("csv")
    csv_mod.field_size_limit(1 << 24)
    CJK = "぀-ヿ一-鿿"
    _nz = re.compile(r"[^a-z0-9" + CJK + r"]+")

    def norm(s):
        s = (s or "").lower()
        s = re.sub(r"\(.*?\)|\[.*?\]", "", s)
        s = re.sub(r"\s+-\s+.*$", "", s)
        return _nz.sub("", s)

    def slug(s):
        t = re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")
        return t or "x"

    idx = {}
    for artist, title in load_json(pairs):
        na, nt = norm(artist), norm(title)
        if not na or not nt:
            continue
        k = slug(artist) + "~" + slug(title)
        if k in keys_wanted:
            idx.setdefault(na, {}).setdefault(nt, k)
    found = {}
    z = zipfile.ZipFile(zpath)
    with z.open("song_lyrics.csv") as raw:
        reader = csv_mod.DictReader(io.TextIOWrapper(raw, encoding="utf-8", errors="replace"))
        for r in reader:
            na = norm(r.get("artist"))
            if na not in idx:
                continue
            k = idx[na].get(norm(r.get("title")))
            if not k or k in found:
                continue
            body = clean(r.get("lyrics"))
            if len(body) < MIN_BODY:
                continue
            found[k] = (body, (r.get("language") or "").strip().lower()[:2])
            if len(found) == len(keys_wanted):
                break
    return found


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--missing-from", choices=["mood", "themes", "both"])
    g.add_argument("--scored-sample", type=int, metavar="N")
    g.add_argument("--themed-sample", type=int, metavar="N")
    g.add_argument("--keys-file")
    ap.add_argument("--out", required=True)
    ap.add_argument("--limit", type=int, default=0, help="0 = no limit")
    ap.add_argument("--stratify-lang", action="store_true",
                    help="spread --limit across the languages present, not just the head")
    ap.add_argument("--seed", type=int, default=20260921)
    ap.add_argument("--sources", default="lrclib,genius,workshop",
                    help="comma list, in priority order; add 'zip' to stream the dump")
    args = ap.parse_args()

    meta = load_json(GENIUS_LYRICS)          # key -> [lang, tag, year, wc, uniq]
    mood = load_json(GENIUS_MOOD)
    themes = load_json(GENIUS_THEMES)
    rng = random.Random(args.seed)

    # ── target selection ─────────────────────────────────────────────────────
    if args.keys_file:
        with open(args.keys_file, encoding="utf-8") as fh:
            targets = [ln.strip() for ln in fh if ln.strip()]
        label = f"keys-file {os.path.basename(args.keys_file)}"
    elif args.scored_sample:
        scored = load_json(LLM_SCORES) if os.path.exists(LLM_SCORES) else {}
        pool = sorted(k for k in scored if k in mood and isinstance(mood[k], list))
        rng.shuffle(pool)
        targets = pool[: args.scored_sample * 4]   # over-draw; text lookup thins it
        label = f"scored-sample (pool {len(pool)})"
    elif args.themed_sample:
        pool = sorted(k for k in themes if k != "_themes" and isinstance(themes[k], list))
        rng.shuffle(pool)
        targets = pool[: args.themed_sample * 4]   # over-draw; text lookup thins it
        label = f"themed-sample (pool {len(pool)})"
    else:
        want_mood = args.missing_from in ("mood", "both")
        want_themes = args.missing_from in ("themes", "both")
        targets = sorted(
            k for k in meta
            if (want_mood and k not in mood) or (want_themes and k not in themes)
        )
        label = f"missing-from {args.missing_from}"

    print(f"targets: {len(targets)}  ({label})", flush=True)

    # ── resolve text ─────────────────────────────────────────────────────────
    order = [s.strip() for s in args.sources.split(",") if s.strip()]
    use_zip = "zip" in order
    order = [s for s in order if s != "zip"]
    stores = Stores(set(targets))

    resolved = []        # (key, lang, src, text)
    missing = []
    for k in targets:
        hit = None
        for src in order:
            hit = stores.get(k, src)
            if hit:
                text, lang = hit
                resolved.append((k, lang or (meta.get(k, [""])[0] or ""), src, text))
                break
        if not hit:
            missing.append(k)

    if use_zip and missing:
        print(f"  streaming the dump for {len(missing)} unresolved keys…", flush=True)
        found = stream_zip(set(missing), meta)
        still = []
        for k in missing:
            if k in found:
                text, lang = found[k]
                resolved.append((k, lang or (meta.get(k, [""])[0] or ""), "zip", text))
            else:
                still.append(k)
        missing = still

    # ── limit / stratify ─────────────────────────────────────────────────────
    cap = args.scored_sample or args.themed_sample
    if cap:
        rng.shuffle(resolved)
        resolved = resolved[:cap]
    elif args.limit and len(resolved) > args.limit:
        if args.stratify_lang:
            by_lang = {}
            for row in resolved:
                by_lang.setdefault(row[1] or "??", []).append(row)
            for v in by_lang.values():
                rng.shuffle(v)
            picked, langs = [], sorted(by_lang, key=lambda L: -len(by_lang[L]))
            i = 0
            while len(picked) < args.limit and any(by_lang.values()):
                L = langs[i % len(langs)]
                if by_lang[L]:
                    picked.append(by_lang[L].pop())
                i += 1
            resolved = picked
        else:
            rng.shuffle(resolved)
            resolved = resolved[: args.limit]

    # ── write (scratch only) ─────────────────────────────────────────────────
    outdir = os.path.dirname(os.path.abspath(args.out))
    if outdir and not os.path.exists(outdir):
        os.makedirs(outdir, exist_ok=True)
    if not os.path.abspath(args.out).startswith(os.path.abspath(SPTMP)):
        print(f"REFUSING: --out must live under the scratch tree {SPTMP} "
              f"(lyric text is never written outside it)", flush=True)
        sys.exit(2)
    with open(args.out, "w", encoding="utf-8") as fh:
        for k, lang, src, text in resolved:
            fh.write(json.dumps({"key": k, "lang": lang, "src": src, "text": text},
                                ensure_ascii=False) + "\n")

    # ── report: counts and keys only ─────────────────────────────────────────
    print(f"\nresolved : {len(resolved)}")
    print(f"missing  : {len(missing)}")
    print("by source:", dict(Counter(r[2] for r in resolved)))
    print("by lang  :", dict(Counter((r[1] or "??") for r in resolved).most_common(12)))
    if missing:
        print("miss reasons:", dict(Counter(stores.miss_reason(k) for k in missing)))
    print(f"\nwrote -> {args.out}")


if __name__ == "__main__":
    main()
