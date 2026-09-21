"""mood-score.py - the whole-lyric scorer of record (MOOD_PIPELINE.md section 1).

Rebuild of the 2026-08 workshop scorer (`llm_score_rest.py`), promoted from disposable
scratch to a tracked tool. EVERYTHING that touches the model is verbatim from the original
run, because the scores have to stay comparable with the ~25k rows already in
genius-mood.json:

  model          Qwen/Qwen2.5-7B-Instruct
  quantisation   bitsandbytes nf4, fp16 compute, double-quant, device_map='cuda'
  prompt         SYS below - byte-identical to MOOD_PIPELINE.md section 1
  user turn      'Language: {lang or "unknown"}\\n\\nLYRIC:\\n{text}'
  truncation     text[:6000]
  decoding       greedy, do_sample=False, max_new_tokens=64
  parse          first {...} block, valence clamped 0-100, register kept RAW

Do not "improve" any of the above. A better prompt is a different instrument and would
have to be re-gated against the corpus the way section 3 describes.

PRIVACY. Lyric text enters this process from a scratch JSONL and leaves only as three
numbers. It is never logged, never echoed, never written outside the scratch tree. The
store rows carry keys and scores only.

Input   a JSONL of {"key","lang","text"} produced by lyric-extract.py
Store   a JSONL of {"key","v","reg","regNorm","mask","ms"} - append-only, crash-safe,
        resumable (re-running skips every key already in the store)

Usage
  python mood-score.py --in  <sptmp>/mood-work/pilot-new.jsonl \
                       --store <sptmp>/mood-work/scores.jsonl
  python mood-score.py --in ... --store ... --limit 50
  python mood-score.py --store ... --stats          # no model load, just report the store
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from collections import Counter

sys.stdout.reconfigure(encoding="utf-8")

TOOLS = os.path.dirname(os.path.abspath(__file__))
ROTATION = os.path.dirname(TOOLS)
REPO = os.path.dirname(ROTATION)
WORKSPACE = os.path.dirname(REPO)
SPTMP = os.environ.get("ROTATION_SPTMP") or os.path.join(WORKSPACE, ".sptmp")

MODEL_ID = "Qwen/Qwen2.5-7B-Instruct"
MAX_CHARS = 6000
MAX_NEW_TOKENS = 64

# ---------------------------------------------------------------------------
# VERBATIM. This string is the methodology (MOOD_PIPELINE.md section 1) and is
# reproduced character for character from the 2026-08 run. Changing it invalidates
# comparability with every existing row.
# ---------------------------------------------------------------------------
SYS = ('You are a precise analyst of song lyrics. Given a lyric, output STRICT JSON only: '
       '{"valence": <0-100 integer, the emotional darkness/brightness of what the lyric MEANS '
       '(0=devastating/bleak, 50=neutral/ambivalent, 100=joyful/tender), judged by meaning, '
       'not by surface vocabulary>, "register": <one of "bleak","anguished","angry","defiant",'
       '"bittersweet","neutral","tender","joyful">, "mask": <true if the lyric wears a bright/'
       'playful/childlike surface over dark content, else false>}. '
       'Irony, sarcasm and masks must be scored by the underlying meaning. No other text.')

# ---- register taxonomy + remap (MOOD_PIPELINE.md section 2; emit_v5/v6 verbatim) ----
# Order is LOAD-BEARING: the UI hard-codes these indices and REG_HUES keys off them.
REG_VOCAB = ['anguished', 'bittersweet', 'bleak', 'tender', 'angry', 'defiant',
             'joyful', 'neutral', 'bitter']
REG_IDX = {r: i for i, r in enumerate(REG_VOCAB)}

# The model reaches outside its own eight-word taxonomy; these are the strays the
# 2026-08 corpus pass actually produced, mapped back in.
STRAY_MAP = {
    'confident':   'defiant',
    'resilient':   'defiant',
    'optimistic':  'joyful',
    'ambiguous':   'neutral',
    'melancholic': 'bittersweet',
    'pessimistic': 'bleak',
    'dark':        'bleak',
    'serious':     'bleak',
    'evil':        'angry',
    'satanic':     'angry',
    'sinister':    'angry',
    'corrosive':   'angry',
    'dominant':    'angry',
    'belligerent': 'angry',
    # owner ruling 2026-09-21: a "hard" register is swagger, not rage. The model reached
    # for it once in the 09-21 pilot; the scorer flagged it and the emitter refused the
    # row, as designed. It maps to defiant, not angry - and defiant, unlike angry, is not
    # in the coherence gate's DARK set, so a bright valence over it is not a refusal.
    'hard':        'defiant',
}


def normalise_register(raw):
    """raw model register -> a REG_VOCAB word, or None if we have never seen it.

    Unknown strays are NOT guessed at: the row keeps its raw register, the scorer
    counts it, and the emitter refuses to index it until a human adds the mapping.
    That is the same discipline emit_v6.js enforced with its throw."""
    r = (raw or '').strip().lower()
    r = STRAY_MAP.get(r, r)
    return r if r in REG_IDX else None


_JSON_BLOCK = re.compile(r'\{[\s\S]*?\}')


def parse_reply(reply):
    m = _JSON_BLOCK.search(reply)
    if not m:
        return None
    try:
        j = json.loads(m.group(0))
    except ValueError:
        return None
    try:
        v = max(0, min(100, int(j.get('valence', -1))))
    except (TypeError, ValueError):
        return None
    return {'v': v, 'reg': str(j.get('register', '')), 'mask': bool(j.get('mask', False))}


# ---- store ----------------------------------------------------------------
def read_store(path):
    rows = {}
    if not os.path.exists(path):
        return rows
    with open(path, encoding='utf-8') as fh:
        for ln in fh:
            ln = ln.strip()
            if not ln:
                continue
            try:
                r = json.loads(ln)
            except ValueError:
                continue          # a torn last line from a crash - skipped, not fatal
            if r.get('key'):
                rows[r['key']] = r
    return rows


def store_stats(rows):
    if not rows:
        print('store is empty')
        return
    vs = [r['v'] for r in rows.values() if isinstance(r.get('v'), int)]
    vs.sort()
    n = len(vs)
    reg = Counter(r.get('regNorm') or ('RAW:' + str(r.get('reg'))) for r in rows.values())
    print(f'rows      : {len(rows)}')
    print(f'valence   : median {vs[n // 2]} · mean {sum(vs) / n:.1f} · '
          f'p10 {vs[n // 10]} · p90 {vs[(n * 9) // 10]}')
    band = Counter('0-20' if v <= 20 else '21-40' if v <= 40 else '41-60' if v <= 60
                   else '61-80' if v <= 80 else '81-100' for v in vs)
    print('bands     :', {k: f'{band[k]} ({band[k] * 100.0 / n:.1f}%)'
                          for k in ['0-20', '21-40', '41-60', '61-80', '81-100']})
    print('registers :', dict(reg.most_common()))
    mk = sum(1 for r in rows.values() if r.get('mask'))
    print(f'mask fires: {mk} ({mk * 100.0 / len(rows):.1f}%)')


# ---- main -----------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--in', dest='inp', help='JSONL from lyric-extract.py')
    ap.add_argument('--store', required=True, help='append-only JSONL score store (scratch)')
    ap.add_argument('--limit', type=int, default=0)
    ap.add_argument('--progress-every', type=int, default=10)
    ap.add_argument('--stats', action='store_true', help='report the store and exit')
    ap.add_argument('--model', default=MODEL_ID,
                    help='DO NOT CHANGE without the owner ruling - see module docstring')
    args = ap.parse_args()

    store_path = os.path.abspath(args.store)
    if not store_path.startswith(os.path.abspath(SPTMP)):
        print(f'REFUSING: --store must live under the scratch tree {SPTMP}')
        sys.exit(2)
    os.makedirs(os.path.dirname(store_path), exist_ok=True)

    done = read_store(store_path)

    if args.stats:
        store_stats(done)
        return

    if not args.inp:
        ap.error('--in is required unless --stats')

    rows = []
    with open(args.inp, encoding='utf-8') as fh:
        for ln in fh:
            ln = ln.strip()
            if ln:
                rows.append(json.loads(ln))
    pending = [r for r in rows if r['key'] not in done]
    todo = pending[:args.limit] if args.limit else pending
    # `already scored` counts the STORE, not the limit - reporting it as len(rows)-len(todo)
    # made every chunked run look as though the store already held the tracks --limit had
    # merely deferred.
    print(f'input rows: {len(rows)} · already scored: {len(rows) - len(pending)} · '
          f'pending: {len(pending)} · this chunk: {len(todo)}', flush=True)
    if not todo:
        store_stats(done)
        return

    # ---- model (imported late so --stats needs no torch) -------------------
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

    if not torch.cuda.is_available():
        print('REFUSING: no CUDA device. This pipeline is the 4-bit GPU model of record; '
              'a CPU run would take days and bitsandbytes nf4 needs CUDA.')
        sys.exit(3)

    bnb = BitsAndBytesConfig(load_in_4bit=True,
                             bnb_4bit_compute_dtype=torch.float16,
                             bnb_4bit_quant_type='nf4',
                             bnb_4bit_use_double_quant=True)
    print(f'loading {args.model} (4-bit nf4) ...', flush=True)
    t_load = time.time()
    tok = AutoTokenizer.from_pretrained(args.model)
    mdl = AutoModelForCausalLM.from_pretrained(args.model, quantization_config=bnb,
                                               device_map='cuda')
    mdl.eval()
    print(f'model loaded in {time.time() - t_load:.0f}s · '
          f'VRAM {torch.cuda.memory_allocated() / 2**30:.2f} GiB', flush=True)

    def score(text, lang):
        text = text[:MAX_CHARS]
        msgs = [{'role': 'system', 'content': SYS},
                {'role': 'user', 'content': f'Language: {lang or "unknown"}\n\nLYRIC:\n{text}'}]
        enc = tok.apply_chat_template(msgs, tokenize=True, add_generation_prompt=True,
                                      return_tensors='pt', return_dict=True).to('cuda')
        with torch.no_grad():
            out = mdl.generate(**enc, max_new_tokens=MAX_NEW_TOKENS, do_sample=False,
                               pad_token_id=tok.eos_token_id)
        reply = tok.decode(out[0][enc['input_ids'].shape[1]:], skip_special_tokens=True)
        return parse_reply(reply)

    fh = open(store_path, 'a', encoding='utf-8')
    t0 = time.time()
    n = ok = bad = 0
    strays = Counter()
    try:
        for r in todo:
            t1 = time.time()
            s = score(r['text'], r.get('lang'))
            n += 1
            if s is None:
                bad += 1
                # unparseable reply: record the miss by KEY so a rerun retries nothing blindly
                fh.write(json.dumps({'key': r['key'], 'v': None, 'reg': None,
                                     'regNorm': None, 'mask': None,
                                     'ms': int((time.time() - t1) * 1000),
                                     'err': 'unparseable'}) + '\n')
            else:
                rn = normalise_register(s['reg'])
                if rn is None:
                    strays[s['reg']] += 1
                ok += 1
                fh.write(json.dumps({'key': r['key'], 'v': s['v'], 'reg': s['reg'],
                                     'regNorm': rn, 'mask': s['mask'],
                                     'ms': int((time.time() - t1) * 1000)}) + '\n')
            fh.flush()
            os.fsync(fh.fileno())     # crash-safe: the store is correct after any kill
            if n % args.progress_every == 0:
                el = time.time() - t0
                eta = el / n * (len(todo) - n)
                print(f'  {n}/{len(todo)} · {el / n:.2f}s/track · '
                      f'{60 * n / el:.1f} tracks/min · eta {eta / 60:.1f}m', flush=True)
    finally:
        fh.close()

    el = time.time() - t0
    print(f'\nDONE: {n} scored ({ok} ok, {bad} unparseable) in {el:.0f}s · '
          f'{el / max(n, 1):.2f}s/track · {60 * n / max(el, 1e-9):.1f} tracks/min')
    if strays:
        print('UNMAPPED registers (add to STRAY_MAP before emitting):', dict(strays))
    print()
    store_stats(read_store(store_path))


if __name__ == '__main__':
    main()
