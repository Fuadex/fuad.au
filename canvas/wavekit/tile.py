# tile.py — wave 17: install a RULED plate for one work and cut its 3x3 native tile grid.
# Usage: python tile.py <id> <source-image-path>
# Copies the source to img_<id>.jpg (original bytes when already JPEG), cuts 9 native tiles with 8%
# overlap (band k = [max(0,(k-.08)/3), min(1,(k+1+.08)/3)]), and merges TILE_MAP.json. No resampling,
# no analysis — the orchestrator rules the plate; this only installs it.
import json, os, shutil, sys
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
D = os.path.dirname(os.path.abspath(__file__))
wid, src = sys.argv[1], sys.argv[2]
dst = os.path.join(D, "img_%s.jpg" % wid)
im = Image.open(src)
if im.format == "JPEG":
    shutil.copyfile(src, dst)
else:
    im.convert("RGB").save(dst, "JPEG", quality=95)
im = Image.open(dst); W, H = im.size
OV = 0.08
span = lambda k: (max(0.0, (k - OV) / 3.0), min(1.0, (k + 1 + OV) / 3.0))
tiles = {}
for r in range(3):
    for c in range(3):
        x0, x1 = span(c); y0, y1 = span(r)
        box = (round(x0 * W), round(y0 * H), round(x1 * W), round(y1 * H))
        im.crop(box).save(os.path.join(D, "tile_%s_r%dc%d.jpg" % (wid, r + 1, c + 1)), "JPEG", quality=95, icc_profile=im.info.get("icc_profile"))
        tiles["r%dc%d" % (r + 1, c + 1)] = {"x0": round(x0, 4), "y0": round(y0, 4), "x1": round(x1, 4), "y1": round(y1, 4)}
mp = os.path.join(D, "TILE_MAP.json")
tm = json.load(open(mp, encoding="utf-8")) if os.path.exists(mp) else {}
tm[wid] = {"plate": [W, H], "tiles": tiles}
json.dump(tm, open(mp, "w", encoding="utf-8"), indent=1)
print(wid, "plate", W, "x", H, "— 9 native tiles written")
