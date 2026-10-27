# platecheckNN/stitch.py — build workshop plates from IIIF TILES where the server refuses full-size renders
# (Nationalmuseum IIIF is level 1; the National Gallery London server clamps full renders at 800 px).
# For each id given (default: every id in ids.json with a hires `iiif` and no usable img_), read info.json, pick the
# scale factor that brings the long side nearest 3000 px, stitch the tiles. Ids with no hires row take the canon
# imgZoom (art_data) at width 2000. Updates ceiling.json.
import io, json, math, os, re, sys, time, urllib.request, subprocess
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__)) + os.sep
UA = {"User-Agent": "CanvasAudit/1.0 (https://fuad.au)"}
def get(u):
    for a in range(4):
        try: return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=120).read()
        except Exception as e:
            if a == 3: raise
            time.sleep(4 * (a + 1))
js = ("const fs=require('fs');const L=f=>{const o={};new Function('window',fs.readFileSync('C:/Users/Fuad/Documents/GitHub/fuad.au/canvas/'+f,'utf8'))(o);return Object.values(o)[0]};"
      "const H=L('art_hires.js');const AD=L('art_data.js');const ad=AD.artworks||AD;const ids=JSON.parse(process.argv[1]);const o={};"
      "for(const id of ids){const x=Array.isArray(ad)?ad.find(z=>z.id===id):ad[id];o[id]={h:H[id]||null,zoom:x&&(x.imgZoom||x.img)||null}}console.log(JSON.stringify(o))")
ids = sys.argv[1:] or json.load(io.open(D + "ids.json", encoding="utf-8"))
data = json.loads(subprocess.check_output(["node", "-e", js, json.dumps(ids)]).decode("utf-8"))
ceil = json.load(io.open(D + "ceiling.json", encoding="utf-8"))
for id in ids:
    r = data[id]; h = r["h"]
    if h and h.get("iiif"):
        base = re.sub(r"/info\.json$", "", h["iiif"])
        info = json.loads(get(base + "/info.json")); W, H = info["width"], info["height"]
        tw = (info.get("tiles") or [{"width": 256}])[0]["width"]
        sfs = (info.get("tiles") or [{"scaleFactors": [1, 2, 4, 8, 16, 32]}])[0].get("scaleFactors", [1, 2, 4, 8, 16, 32])
        s = min(sfs, key=lambda f: abs(max(W, H) / f - 3000)); R = tw * s
        out = Image.new("RGB", (math.ceil(W / s), math.ceil(H / s))); n = 0
        for y in range(0, H, R):
            for x in range(0, W, R):
                rw, rh = min(R, W - x), min(R, H - y)
                t = Image.open(io.BytesIO(get("%s/%d,%d,%d,%d/%d,/0/default.jpg" % (base, x, y, rw, rh, math.ceil(rw / s))))).convert("RGB")
                out.paste(t, (x // s, y // s)); n += 1; time.sleep(0.12)
        out.save(D + "img_" + id + ".jpg", quality=92)
        ceil[id] = {"url": base + " (stitched from tiles at scale %d)" % s, "tier": "true IIIF %dx%d (no ceiling); workshop plate %dx%d" % (W, H, out.width, out.height)}
        print("stitched", id, n, "tiles at scale", s, "->", out.size)
    elif not h and r["zoom"]:
        u = re.sub(r"\?width=\d+", "?width=2000", r["zoom"]); b = get(u)
        open(D + "img_" + id + ".jpg", "wb").write(b); im = Image.open(io.BytesIO(b))
        ceil[id] = {"url": u + " (canon imgZoom; no hires row)", "tier": "canon plate only %dx%d" % im.size}
        print("canon", id, im.size)
    else:
        print("skip", id, "(no iiif, has hires: run dl4.py)")
json.dump(ceil, io.open(D + "ceiling.json", "w", encoding="utf-8"), indent=1)
