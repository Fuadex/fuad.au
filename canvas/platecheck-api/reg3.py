# replate2/reg3.py — register a faithful holder image (new) inside an old plate that is a gallery photo of the framed
# work: old_frac = (a + u*su, b + v*sv) for new_frac (u,v). Correlation over a chosen region of the OLD plate (the
# unoccluded part of the picture), coarse grid with sv tied to su by the images' pixel aspects, then a local refine
# with sv free. numpy only. usage: python reg3.py old.jpg new.jpg rx0 rx1 ry0 ry1
import numpy as np, json, sys
from PIL import Image
oi, ni = Image.open(sys.argv[1]).convert('L'), Image.open(sys.argv[2]).convert('L')
rx0, rx1, ry0, ry1 = map(float, sys.argv[3:7])
OW = 500; old = np.asarray(oi.resize((OW, int(OW * oi.height / oi.width))), float)
NW = 400; new = np.asarray(ni.resize((NW, int(NW * ni.height / ni.width))), float)
H, W = old.shape; h, w = new.shape
ys, xs = np.mgrid[int(ry0*H):int(ry1*H):2, int(rx0*W):int(rx1*W):2]
O = old[ys, xs]; O = (O - O.mean()) / O.std()
k = (ni.height / ni.width) / (oi.height / oi.width)   # sv = su * k when the photo is undistorted
def corr(a, b, su, sv):
    u = (xs / W - a) / su; v = (ys / H - b) / sv
    if u.min() < 0 or v.min() < 0 or u.max() >= 1 or v.max() >= 1: return -1
    N = new[(v * h).astype(int), (u * w).astype(int)]; N = (N - N.mean()) / N.std()
    return float((O * N).mean())
best = (-2,)
for su in np.arange(.08, 1.0, .01):
  sv = su * k
  for a in np.arange(max(0, rx1 - su) - .01, min(rx0, 1 - su) + .01, .005):
    for b in np.arange(max(0, ry1 - sv) - .01, min(ry0, 1 - sv) + .01, .005):
      c = corr(a, b, su, sv)
      if c > best[0]: best = (c, a, b, su, sv)
c0, a0, b0, su0, sv0 = best
for su in np.arange(su0 - .01, su0 + .01, .001):
  for sv in np.arange(sv0 - .01, sv0 + .01, .001):
    for a in np.arange(a0 - .006, a0 + .006, .001):
      for b in np.arange(b0 - .006, b0 + .006, .001):
        c = corr(a, b, su, sv)
        if c > best[0]: best = (c, a, b, su, sv)
print(json.dumps(dict(corr=round(best[0], 3), a=round(best[1], 4), b=round(best[2], 4), su=round(best[3], 4), sv=round(best[4], 4))))
