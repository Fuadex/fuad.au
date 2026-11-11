# tile_iiif.py — wave 40: re-cut the 3x3 tile grid of a true-IIIF plate from IIIF REGIONS (NGA caps a full image at 4096 px,
# so tiles cut from img_ would be a downscale; region requests return native-scale detail up to 4096 px a side).
# Same band geometry and TILE_MAP as tile.py. Usage: python tile_iiif.py <id> <info.json url>
import json, os, sys, urllib.request
from PIL import Image
UA = {'User-Agent': 'CanvasAudit/1.0 (https://fuad.au)'}
D = os.path.dirname(os.path.abspath(__file__)); wid, info = sys.argv[1], sys.argv[2]
j = json.loads(urllib.request.urlopen(urllib.request.Request(info, headers=UA), timeout=60).read())
W, H = j['width'], j['height']; base = info.rsplit('/info.json', 1)[0]
OV = 0.08; span = lambda k: (max(0.0, (k - OV) / 3.0), min(1.0, (k + 1 + OV) / 3.0))
for r in range(3):
    for c in range(3):
        x0, x1 = span(c); y0, y1 = span(r)
        X, Y, RW, RH = round(x0 * W), round(y0 * H), round((x1 - x0) * W), round((y1 - y0) * H)
        s = min(1.0, 4096 / max(RW, RH)); w = round(RW * s)
        u = base + '/%d,%d,%d,%d/%d,/0/default.jpg' % (X, Y, RW, RH, w)
        out = os.path.join(D, 'tile_%s_r%dc%d.jpg' % (wid, r + 1, c + 1))
        open(out, 'wb').write(urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=180).read())
        print(out, Image.open(out).size, 'of native region', RW, RH, flush=True)
