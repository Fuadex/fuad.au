#!/usr/bin/env python3
"""build_predict.py — predicted-rating model for the wishlist (see PREDICT_MODEL.md).

Fits an explainable ridge regression on the ~3,000 rated items (data.js + imports.js)
and scores the wishlist, writing wishlist_pred.js:
    window.CULTURE_PREDICT = { "<id>": { pred: 8.3, why: ["director …", "tag …"] }, … }
merged into wishlist items by id at runtime; used as the default "start here" sort.

Features (all from existing overlays, no new API calls): shrunk target-encodings for
director / region / decade, medium one-hot, genre + tag + badge multi-hot, and a crowd
term (fwAvg, log voteCount). Linear on purpose — every prediction decomposes into the
top ± contributors, which become the `why` list.

Run:  python build_predict.py        (after enrichment, so wishlist tags are fresh)
"""
import json, math, os, subprocess, sys
try: sys.stdout.reconfigure(encoding='utf-8')
except Exception: pass
import numpy as np

SD = os.path.dirname(os.path.abspath(__file__))

# ── pull train + score rows via Node (native .js parse, all overlays merged) ──
NODE = r'''
const fs=require('fs'),p=require('path');const C=%s;global.window={};
const F=['data.js','imports.js','wishlist.js','badges.js','omdb_data.js','cast_data.js','wishlist_cast.js'];
for(const f of F){try{eval.call(global,fs.readFileSync(p.join(C,f),'utf8'))}catch(e){}}
const W=global.window,B=W.CULTURE_BADGES||{},O=W.CULTURE_OMDB||{},CA=W.CULTURE_CAST||{},WC=W.CULTURE_WISHLIST_CAST||{};
const splitG=s=>(s||'').split(/,\s*/).map(x=>x.trim()).filter(Boolean);
function feat(it,castMap){const c=castMap[it.id]||{};const o=O[it.id]||{};
  let genres=c.genres||splitG(o.Genre)||[];let tags=c.tags||[];
  const badges=[...new Set((it.highlights||[]).concat(B[it.id]||[]))];
  return {id:it.id,title:it.title,year:it.year||null,medium:it.medium,
    director:(c.director||it.director||'').split(',')[0].trim(),region:c.region||it.region||'',
    genres:genres,tags:tags,badges:badges,
    fwAvg:(it.fwAvg!=null?it.fwAvg:null),votes:(it.voteCount!=null?it.voteCount:(c.voteCount||null)),
    rating:(it.rating!=null&&it.rating!=='-'?parseFloat(it.rating):null)};}
const train=(W.CULTURE.ITEMS||[]).concat(W.CULTURE_IMPORTS||[]).map(it=>feat(it,CA)).filter(r=>r.rating!=null&&isFinite(r.rating));
const score=(W.CULTURE_WISHLIST||[]).map(it=>feat(it,WC));
process.stdout.write(JSON.stringify({train,score}));
''' % json.dumps(SD.replace('\\', '/'))

data = json.loads(subprocess.check_output(['node', '-e', NODE]))
train, score = data['train'], data['score']
print(f'train {len(train)} rated · score {len(score)} wishlist')

ratings = np.array([r['rating'] for r in train], float)
GLOBAL = ratings.mean()

# ── shrunk target-encodings (computed on train) ──
def shrunk_map(key_fn, k):
    agg = {}
    for r in train:
        for key in key_fn(r):
            agg.setdefault(key, []).append(r['rating'])
    return {key: (np.mean(v) - GLOBAL) * len(v) / (len(v) + k) for key, v in agg.items()}

dir_eff  = shrunk_map(lambda r: [r['director']] if r['director'] else [], k=3)
reg_eff  = shrunk_map(lambda r: [r['region']] if r['region'] else [], k=5)
dec_eff  = shrunk_map(lambda r: [r['year'] // 10 * 10] if r['year'] else [], k=8)

# ── vocab for multi-hot (cap by frequency so the matrix stays lean) ──
def top_vocab(field, n, minc=4):
    c = {}
    for r in train:
        for v in set(r[field]): c[v] = c.get(v, 0) + 1
    return [v for v, cnt in sorted(c.items(), key=lambda kv: -kv[1]) if cnt >= minc][:n]

GEN = top_vocab('genres', 40)
TAG = top_vocab('tags', 120)
BAD = top_vocab('badges', 40, minc=2)
MED = sorted({r['medium'] for r in train})

FEATS = (['b:director', 'b:region', 'b:decade', 'c:fwAvg', 'c:logvotes']
         + [f'med:{m}' for m in MED] + [f'gen:{g}' for g in GEN]
         + [f'tag:{t}' for t in TAG] + [f'bdg:{b}' for b in BAD])
FIDX = {f: i for i, f in enumerate(FEATS)}
LABEL = {**{f'med:{m}': m for m in MED}, **{f'gen:{g}': g for g in GEN},
         **{f'tag:{t}': t for t in TAG}, **{f'bdg:{b}': b for b in BAD}}

def vec(r):
    x = np.zeros(len(FEATS))
    x[FIDX['b:director']] = dir_eff.get(r['director'], 0.0)
    x[FIDX['b:region']]   = reg_eff.get(r['region'], 0.0)
    x[FIDX['b:decade']]   = dec_eff.get(r['year'] // 10 * 10, 0.0) if r['year'] else 0.0
    x[FIDX['c:fwAvg']]    = (r['fwAvg'] - 7.0) if r['fwAvg'] else 0.0
    x[FIDX['c:logvotes']] = math.log10(r['votes']) if r['votes'] else 0.0
    if f'med:{r["medium"]}' in FIDX: x[FIDX[f'med:{r["medium"]}']] = 1
    for g in set(r['genres']):
        if f'gen:{g}' in FIDX: x[FIDX[f'gen:{g}']] = 1
    for t in set(r['tags']):
        if f'tag:{t}' in FIDX: x[FIDX[f'tag:{t}']] = 1
    for b in set(r['badges']):
        if f'bdg:{b}' in FIDX: x[FIDX[f'bdg:{b}']] = 1
    return x

X = np.array([vec(r) for r in train]); y = ratings - GLOBAL

# ── ridge via normal equations (don't penalise the intercept-like scale) ──
def fit(Xtr, ytr, alpha=6.0):
    n, d = Xtr.shape
    A = Xtr.T @ Xtr + alpha * np.eye(d)
    return np.linalg.solve(A, Xtr.T @ ytr)

# 5-fold CV for MAE
idx = np.arange(len(train)); rng = np.random.default_rng(0); rng.shuffle(idx)
folds = np.array_split(idx, 5); errs = []
for i in range(5):
    te = folds[i]; tr = np.concatenate([folds[j] for j in range(5) if j != i])
    w = fit(X[tr], y[tr]); pred = np.clip(X[te] @ w + GLOBAL, 3, 10)
    errs.append(np.abs(pred - ratings[te]).mean())
print(f'5-fold CV MAE: {np.mean(errs):.3f}  (baseline predict-mean MAE: {np.abs(ratings-GLOBAL).mean():.3f})')

W = fit(X, y)  # final model on all train

# ── score wishlist with explanations ──
out = {}
for r in score:
    x = vec(r); contrib = x * W
    pred = float(np.clip(x @ W + GLOBAL, 3, 10))
    order = np.argsort(-np.abs(contrib))
    why = []
    for j in order:
        if abs(contrib[j]) < 0.06 or len(why) >= 3: break
        f = FEATS[j]; sign = '+' if contrib[j] > 0 else '−'
        if f == 'b:director' and r['director']:
            why.append(f'director {r["director"]} ({sign})')
        elif f == 'b:region' and r['region']:
            why.append(f'{r["region"]} cinema ({sign})')
        elif f == 'b:decade' and r['year']:
            why.append(f'{r["year"]//10*10}s ({sign})')
        elif f.startswith(('gen:', 'tag:', 'bdg:', 'med:')):
            why.append(f'{LABEL.get(f, f)} ({sign})')
        elif f == 'c:fwAvg':
            why.append(f'crowd score ({sign})')
    out[r['id']] = {'pred': round(pred, 1), 'why': why}

head = ('// wishlist_pred.js — generated by build_predict.py (see PREDICT_MODEL.md).\n'
        '// Predicted personal rating + reasons per wishlist id; default "start here" sort.\n'
        '// Do not hand-edit. Re-run: python build_predict.py\n'
        'window.CULTURE_PREDICT = ')
open(os.path.join(SD, 'wishlist_pred.js'), 'w', encoding='utf-8').write(
    head + json.dumps(out, ensure_ascii=False, indent=0).replace('\n', '') + ';\n')

top = sorted(out.items(), key=lambda kv: -kv[1]['pred'])
byid = {r['id']: r for r in score}
print(f'\nwishlist_pred.js written ({len(out)} scored). Top 15 predicted:')
for iid, v in top[:15]:
    print(f'  {v["pred"]}  {byid[iid]["title"]} ({byid[iid]["year"]})  · {"; ".join(v["why"])}')
