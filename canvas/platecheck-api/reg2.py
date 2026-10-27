# replate2/reg2.py — register the holder scan (new) inside the old plate (a framed gallery photo) with an
# axis-aligned affine: old_frac = (a + u*su, b + v*sv) for new_frac (u,v). Coarse-to-fine grid search on
# correlation over the inner window region of the old plate (inside the mat). numpy only.
import numpy as np, json, sys
from PIL import Image
old = np.asarray(Image.open(sys.argv[1]).convert('L').resize((400, int(400*1668/1425))), float)
new = np.asarray(Image.open(sys.argv[2]).convert('L').resize((500, int(500*2454/2027))), float)
H, W = old.shape; h, w = new.shape
ys, xs = np.mgrid[int(.20*H):int(.82*H):2, int(.21*W):int(.79*W):2]
O = old[ys, xs]; O = (O - O.mean()) / O.std()
def corr(a, b, su, sv):
    u = (xs / W - a) / su; v = (ys / H - b) / sv
    if u.min() < 0 or v.min() < 0 or u.max() >= 1 or v.max() >= 1: return -1
    N = new[(v * h).astype(int), (u * w).astype(int)]; N = (N - N.mean()) / N.std()
    return float((O * N).mean())
best = (-2,)
for su in np.arange(.55, .80, .01):
  for sv in np.arange(.55, .80, .01):
    for a in np.arange(.08, .30, .01):
      for b in np.arange(.08, .30, .01):
        c = corr(a, b, su, sv)
        if c > best[0]: best = (c, a, b, su, sv)
c0, a0, b0, su0, sv0 = best
for su in np.arange(su0-.012, su0+.012, .002):
  for sv in np.arange(sv0-.012, sv0+.012, .002):
    for a in np.arange(a0-.012, a0+.012, .002):
      for b in np.arange(b0-.012, b0+.012, .002):
        c = corr(a, b, su, sv)
        if c > best[0]: best = (c, a, b, su, sv)
print(json.dumps(dict(corr=round(best[0],3), a=round(best[1],4), b=round(best[2],4), su=round(best[3],4), sv=round(best[4],4))))
