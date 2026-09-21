"""themes-embed.py - the THEMES classifier of record, rebuilt as a tracked tool.

What genius-themes.json is: for every track, up to three [themeIdx, score] pairs drawn from
an 18-bucket chart. The chart itself lives in the tracked file under "_themes" and this
script asserts against it - if the two ever disagree the run aborts rather than silently
re-index the corpus.

METHOD (verbatim from the 2026-07-05 workshop script `genius-themes.py`, which produced
every row now in the file):

  embedder   sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
             multilingual on purpose: the corpus is EN + PL + JP + ~35 more
  anchors    two hand-written sentences per theme, embedded and L2-normalised
  score      cosine(track, anchor), taken as the MAX over that theme's anchors
             (max-sim, not a centroid: two anchors per bucket deliberately cover
             two different faces of a theme, and averaging them blurs both)
  truncation text[:2200]; bodies under 80 chars are not themed at all
  emit       top 3 themes with score >= FLOOR 0.24, score stored as round(cos * 100)

A NOTE ON CENTROIDS. A centroid built from the *existing labels* was considered and not
used: the labels are this same anchor space's output, so label-centroids would inherit its
decisions while losing the two-faces-per-theme resolution - a copy with worse edges. The
anchor space IS the vocabulary anchor, and --calibrate measures how faithfully it is
reproduced against the labels already in the chart.

CALIBRATION GATE
  python themes-embed.py --in <holdout.jsonl> --calibrate
  Classifies tracks that ALREADY have rows, blind, and reports top-1 agreement plus a
  compact confusion summary. The bar is ~80% top-1. Below it, do not run the corpus:
  the documented fallback is Qwen classifying into the 18 NAMED buckets directly
  (same scorer stack as mood-score.py), which is the owner's call to authorise.

PRIVACY: lyric text in, numbers out. Nothing is logged or written outside the scratch tree.

Usage
  python themes-embed.py --in <sptmp>/themes-work/holdout.jsonl --calibrate
  python themes-embed.py --in <sptmp>/themes-work/new.jsonl \
                         --store <sptmp>/themes-work/themes.jsonl
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from collections import Counter, defaultdict

sys.stdout.reconfigure(encoding="utf-8")

TOOLS = os.path.dirname(os.path.abspath(__file__))
ROTATION = os.path.dirname(TOOLS)
REPO = os.path.dirname(ROTATION)
WORKSPACE = os.path.dirname(REPO)
SPTMP = os.environ.get("ROTATION_SPTMP") or os.path.join(WORKSPACE, ".sptmp")

GENIUS_THEMES = os.path.join(ROTATION, "genius-themes.json")

EMBEDDER = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
FLOOR = 0.24      # below this a track simply does not get that theme
TOP_K = 3
MAX_CHARS = 2200
MIN_BODY = 80
AGREEMENT_BAR = 0.80

# ---------------------------------------------------------------------------
# VERBATIM anchor space. Dict order defines themeIdx and MUST match the tracked
# "_themes" array - asserted at startup.
# ---------------------------------------------------------------------------
THEMES = {
    "war & battle": [
        "soldiers at war, battlefield combat, armies fighting and dying in battle",
        "military invasion, guns and artillery, brothers in arms marching to the front"],
    "death & grief": [
        "death, mourning, funerals, losing someone forever, grief",
        "graves, corpses, the dead, saying goodbye to the departed"],
    "heartbreak & loss": [
        "a broken heart, being left by a lover, the end of a relationship",
        "missing someone who is gone, crying over lost love, betrayal by a lover"],
    "love & desire": [
        "being deeply in love, desire and devotion for a lover",
        "passion, kissing, wanting someone, tenderness between lovers"],
    "addiction & self-destruction": [
        "drug addiction, needles, substance abuse, spiralling down",
        "hurting yourself, self-hatred, drowning in alcohol, losing control of your life"],
    "alienation & emptiness": [
        "feeling numb, empty and disconnected, unable to feel anything",
        "being an outsider nobody understands, pressure to conform, losing yourself"],
    "anger & defiance": [
        "fury and rage against those who wronged you, refusing to obey",
        "standing up against authority, fighting back, revenge"],
    "violence & murder": [
        "killing, murder, blood, brutal violence against people",
        "torture, massacre, cruelty, a killer stalking victims"],
    "faith & the occult": [
        "god, prayer, religion, heaven and salvation",
        "the devil, satan, occult ritual, demons, black magic worship"],
    "money & the street": [
        "cash, hustling, poverty, dealing, surviving on the streets",
        "gangs, the block, getting rich, street credibility and survival"],
    "party & hedonism": [
        "dancing all night, drinking, celebration, wild parties",
        "having fun, sweets and silliness, living for pleasure tonight"],
    "night & the city": [
        "neon streets at night, driving through the city after dark",
        "city lights, urban loneliness, wandering the streets at midnight"],
    "nature & the elements": [
        "forests, mountains, oceans, storms and the wild earth",
        "winter cold, fire and ice, the moon and stars, ancient landscapes"],
    "politics & society": [
        "corrupt politicians, war machines, propaganda and the system",
        "social injustice, inequality, the media, revolution in society"],
    "madness & the mind": [
        "losing your mind, insanity, voices in your head, paranoia",
        "nightmares, hallucinations, a mind falling apart"],
    "freedom & escape": [
        "breaking free, running away, leaving everything behind",
        "the open road, escaping a cage, finally being free"],
    "nostalgia & memory": [
        "remembering childhood, the good old days, looking back on the past",
        "old photographs, memories of home, how things used to be"],
    "identity & becoming": [
        "who am I, becoming yourself, self-discovery and transformation",
        "growing up, finding your own path, refusing to be what others made you"],
}


def assert_chart():
    with open(GENIUS_THEMES, encoding="utf-8") as fh:
        tracked = json.load(fh)
    chart = tracked.get("_themes")
    mine = list(THEMES.keys())
    if chart != mine:
        print("ABORT: the anchor chart in this script has drifted from genius-themes.json.")
        print("  tracked:", chart)
        print("  here   :", mine)
        sys.exit(2)
    print(f"chart OK - {len(mine)} buckets, order matches the tracked file")
    return tracked


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--in", dest="inp", required=True, help="JSONL from lyric-extract.py")
    ap.add_argument("--store", help="output JSONL of {key, picks} (scratch only)")
    ap.add_argument("--calibrate", action="store_true",
                    help="compare against the labels already in genius-themes.json")
    ap.add_argument("--batch-size", type=int, default=64)
    ap.add_argument("--model", default=EMBEDDER,
                    help="DO NOT CHANGE without the owner ruling - see module docstring")
    args = ap.parse_args()

    tracked = assert_chart()
    th_names = list(THEMES.keys())

    rows = []
    with open(args.inp, encoding="utf-8") as fh:
        for ln in fh:
            ln = ln.strip()
            if not ln:
                continue
            r = json.loads(ln)
            if len((r.get("text") or "")) >= MIN_BODY:
                rows.append(r)
    print(f"input rows with enough text: {len(rows)}")
    if not rows:
        return

    import numpy as np
    from sentence_transformers import SentenceTransformer

    print(f"loading {args.model} ...", flush=True)
    model = SentenceTransformer(args.model)

    anchor_texts, anchor_theme = [], []
    for i, k in enumerate(th_names):
        for a in THEMES[k]:
            anchor_texts.append(a)
            anchor_theme.append(i)
    A = model.encode(anchor_texts, normalize_embeddings=True)
    anchor_theme = np.array(anchor_theme)

    keys = [r["key"] for r in rows]
    texts = [r["text"][:MAX_CHARS] for r in rows]
    import time
    t0 = time.time()
    E = model.encode(texts, batch_size=args.batch_size, normalize_embeddings=True,
                     show_progress_bar=False)
    el = time.time() - t0
    print(f"embedded {len(keys)} tracks in {el:.1f}s "
          f"({len(keys) / max(el, 1e-9):.1f} tracks/s)")

    S = E @ A.T
    out = {}
    for ti in range(len(keys)):
        per_theme = np.full(len(th_names), -1.0)
        row = S[ti]
        for ai in range(len(anchor_theme)):
            t = anchor_theme[ai]
            if row[ai] > per_theme[t]:
                per_theme[t] = row[ai]
        order = np.argsort(-per_theme)[:TOP_K]
        picks = [[int(t), int(round(per_theme[t] * 100))]
                 for t in order if per_theme[t] >= FLOOR]
        if picks:
            out[keys[ti]] = picks

    print(f"themed {len(out)}/{len(keys)} "
          f"({len(keys) - len(out)} fell below the {FLOOR} floor on every bucket)")

    if args.store:
        store = os.path.abspath(args.store)
        if not store.startswith(os.path.abspath(SPTMP)):
            print(f"REFUSING: --store must live under the scratch tree {SPTMP}")
            sys.exit(2)
        os.makedirs(os.path.dirname(store), exist_ok=True)
        with open(store, "w", encoding="utf-8") as fh:
            for k, picks in out.items():
                fh.write(json.dumps({"key": k, "picks": picks}) + "\n")
        print(f"wrote -> {store}")

    # ---- primary-theme distribution ---------------------------------------
    dist = Counter(th_names[v[0][0]] for v in out.values())
    print("\nprimary-theme distribution (this run):")
    for name, c in dist.most_common():
        print(f"  {name:32s} {c:5d}  {c * 100.0 / max(len(out), 1):5.1f}%")

    # ---- CALIBRATION GATE --------------------------------------------------
    if args.calibrate:
        print("\n=== CALIBRATION GATE ===")
        pairs = [(k, tracked[k], out[k]) for k in out if k in tracked and k != "_themes"]
        print(f"holdout tracks with an existing label: {len(pairs)}")
        if not pairs:
            print("nothing to compare against")
            return

        top1 = 0
        top1_in_old_top3 = 0
        old_top1_in_new_top3 = 0
        jacc_sum = 0.0
        score_delta = []
        confusion = defaultdict(Counter)
        for k, old, new in pairs:
            o1, n1 = old[0][0], new[0][0]
            if o1 == n1:
                top1 += 1
            else:
                confusion[th_names[o1]][th_names[n1]] += 1
            if n1 in [p[0] for p in old]:
                top1_in_old_top3 += 1
            if o1 in [p[0] for p in new]:
                old_top1_in_new_top3 += 1
            so, sn = {p[0] for p in old}, {p[0] for p in new}
            jacc_sum += len(so & sn) / max(len(so | sn), 1)
            om = {p[0]: p[1] for p in old}
            for t, s in new:
                if t in om:
                    score_delta.append(abs(s - om[t]))

        n = len(pairs)
        agree = top1 / n
        print(f"\ntop-1 agreement          : {top1}/{n} = {agree * 100:.1f}%"
              f"   (bar {AGREEMENT_BAR * 100:.0f}%)  "
              f"{'PASS' if agree >= AGREEMENT_BAR else 'BELOW BAR'}")
        print(f"new top-1 inside old top-3: {top1_in_old_top3}/{n} = "
              f"{top1_in_old_top3 * 100.0 / n:.1f}%")
        print(f"old top-1 inside new top-3: {old_top1_in_new_top3}/{n} = "
              f"{old_top1_in_new_top3 * 100.0 / n:.1f}%")
        print(f"top-3 set Jaccard (mean)  : {jacc_sum / n:.3f}")
        if score_delta:
            sd = sorted(score_delta)
            print(f"score delta on shared themes: mean "
                  f"{sum(sd) / len(sd):.2f} pts · median {sd[len(sd) // 2]} · max {sd[-1]}")

        if confusion:
            print("\nconfusion (existing top-1 -> this run's top-1), most common:")
            flat = [(o, nn, c) for o, cc in confusion.items() for nn, c in cc.items()]
            flat.sort(key=lambda x: -x[2])
            for o, nn, c in flat[:12]:
                print(f"  {c:3d}  {o}  ->  {nn}")
            rest = sum(c for _, _, c in flat[12:])
            if rest:
                print(f"  {rest:3d}  (other pairs, {len(flat) - 12} of them)")

        if agree < AGREEMENT_BAR:
            print(f"\nBELOW THE {AGREEMENT_BAR * 100:.0f}% BAR - do not run the corpus. "
                  "Documented fallback: Qwen2.5-7B-Instruct classifying into the 18 named "
                  "buckets directly (same stack as mood-score.py). That substitution is "
                  "the owner's call.")


if __name__ == "__main__":
    main()
