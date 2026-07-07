# Predicted-rating model — design

Goal: predict Fuad's personal rating for each **unseen wishlist** item, and use it to order
the wishlist "start here". Becomes the **default sort** of the wishlist page (toggle back to
date/manual). Tuned by Fable 5. Must be **explainable** — every prediction ships with its
top reasons, not just a number.

## Training data
~3,000 rated items (`data.js` + `imports.js`, `rating` present). Predict on the ~1,340-item
`wishlist.js`. Buildless repo → produce an overlay `wishlist_pred.js` keyed by id:
`{ pred: 8.3, why: ["director Bong Joon-ho — your avg 8.0 (n=6)", "tag: dystopia +0.4", …] }`
merged in `enrichExtras()` like every other overlay.

## Features (all derivable from existing overlays — no new API calls)
- **director effect** — Fuad's mean rating for that director, **shrunk** toward the medium mean:
  `eff = (dirMean - mean) * n/(n+k)`, k≈3. The single strongest signal; the whole canon is
  director-anchored.
- **region effect** — shrunk (kr/jp/pl run hot; us-blockbuster runs to the mean).
- **decade effect** — shrunk (Fuad rates 50s–80s classics and their execution higher).
- **genre multi-hot** — from `igdbGenres` / tmdb / omdb `Genre`.
- **tag multi-hot** — `item.tags` (TMDb keywords): the richest axis (one-location,
  existentialism, bleak, dystopia…). Ridge-regularized.
- **badge-affinity** — mean Fuad rating of items carrying each badge. Usable for wishlist items
  that *have* badges — and the new Fable-5 recommendations are being added **with** badges, so
  this term is live for them (a title tagged `cognitive`+`social-xray` inherits those cohorts'
  high means).
- **crowd term** — small weight on `(fwAvg - fwMean)` and `log(voteCount)`. Expect near-zero or
  slightly **negative** in the prestige band (Fuad is canon-skeptical); let the model learn it.
- **runtime** — mild positive (tolerance for long, exhausted-format works).

## Model
Regularized linear regression (Ridge). If scikit-learn is available use it; else a hand-rolled
ridge (numpy normal equations). Linear keeps it explainable — each prediction decomposes into
additive contributions → that's the `why` list. 5-fold CV to report MAE and to keep
single-film directors from overfitting (shrinkage already guards this).

Predicted score is clamped to [3,10] and the `why` list is the top ±contributors by |weight×value|.

## Why linear, not a tree/boosting
Trees would edge out MAE slightly but kill the per-item explanation, which is the point (the
wishlist needs "start here **because**"). Revisit only if MAE is unacceptable.

## Fable-5 tuning surface
- hand priors: boost tags that encode the taste walls (one-location/bottle, existentialism,
  bleak, cognitive-adjacent), damp prestige-crowd pull.
- rewrite `why` phrases into natural language.
- optionally a small "discovery bonus" for low-reach titles so the sort isn't all safe canon.

## Build
`build_predict.py` → reads data/imports (train) + wishlist (score) + overlays (features) →
writes `wishlist_pred.js`. Add `?v=` bump. Wishlist UI: default sort = `pred` desc, show
`predicted N.N★` + a one-line reason; toggle to date/manual.

## Open (Fable)
Calibrate k/shrinkage, ridge α, crowd-term sign, and whether to expose the reason list inline
or on hover. Validate that the top-20 predicted feels right against a holdout of Fuad's known 9–10s.
