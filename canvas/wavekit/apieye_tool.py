# platecheckNN/tool.py — image helper for the API plate-check runner (api-check.js).
#   python tool.py zoom <plate.jpg> <x> <y> <w> <h> <out.jpg>     crop a fractional box, long side capped at 1568
#   python tool.py colour <plate.jpg> <x> <y> <w> <h>             mean colour + 5 dominant colours (JSON)
#   python tool.py fit <in.jpg> <out.jpg> [max]                   downscale a file for upload (long side <= max)
import json, sys
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
def box(im, x, y, w, h):
    W, H = im.size
    l, u = max(0, int(x * W)), max(0, int(y * H)); r, d = min(W, int((x + w) * W)), min(H, int((y + h) * H))
    if r - l < 4 or d - u < 4: raise SystemExit("box too small or off the plate")
    return im.crop((l, u, r, d))
cmd = sys.argv[1]
if cmd == "zoom":
    im = Image.open(sys.argv[2]).convert("RGB"); c = box(im, *map(float, sys.argv[3:7]))
    native = c.size; c.thumbnail((1568, 1568)); c.save(sys.argv[7], quality=88)
    print(json.dumps({"native_px": native, "sent_px": c.size}))
elif cmd == "colour":
    im = Image.open(sys.argv[2]).convert("RGB"); c = box(im, *map(float, sys.argv[3:7])); c.thumbnail((400, 400))
    px = list(c.getdata()); n = len(px); m = tuple(round(sum(p[i] for p in px) / n) for i in range(3))
    q = c.quantize(colors=5, method=Image.Quantize.MEDIANCUT); pal = q.getpalette()[:15]; counts = sorted(q.getcolors(), reverse=True)
    dom = [{"rgb": pal[i * 3:i * 3 + 3], "hex": "#%02x%02x%02x" % tuple(pal[i * 3:i * 3 + 3]), "share": round(k / n, 3)} for k, i in counts]
    print(json.dumps({"mean_rgb": m, "mean_hex": "#%02x%02x%02x" % m, "dominant": dom}))
elif cmd == "fit":
    im = Image.open(sys.argv[2]).convert("RGB"); mx = int(sys.argv[4]) if len(sys.argv) > 4 else 1568
    im.thumbnail((mx, mx)); im.save(sys.argv[3], quality=88); print(json.dumps({"sent_px": im.size}))
