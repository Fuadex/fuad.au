# tourqc-pass w1: numbered overlay + per-stop crops from the SHIPPED tours (tour_<id>.json).
# Stops without coords are skipped and reported (known corpus bug, 4 corpus-wide).
import json, os
from PIL import Image, ImageDraw, ImageFont
D = r"C:\Users\Fuad\Documents\GitHub\.dtmp\platecheckNN"
try: font = ImageFont.truetype("arialbd.ttf", 34)
except: font = ImageFont.load_default()
ids = json.load(open(os.path.join(D, 'ids.json')))
for id in ids:
    p = os.path.join(D, f"img_{id}.jpg")
    if not os.path.exists(p):
        print("NO IMG", id); continue
    im = Image.open(p).convert("RGB"); W, H = im.size
    stops = json.load(open(os.path.join(D, f"tour_{id}.json"), encoding="utf-8")).get("deeper", [])
    ov = im.copy(); dr = ImageDraw.Draw(ov)
    for n, b in enumerate(stops, 1):
        if b.get("x") is None or b.get("w") is None:
            print("NOCOORD", id, n, b.get("t")); continue
        l, u, r, d = b["x"]*W, b["y"]*H, (b["x"]+b["w"])*W, (b["y"]+b["h"])*H
        dr.rectangle([l, u, r, d], outline=(255, 30, 30), width=max(3, W//350))
        dr.rectangle([l, u, l+46, u+46], fill=(255, 30, 30)); dr.text((l+8, u+2), str(n), fill=(255, 255, 255), font=font)
        c = im.crop((int(l), int(u), int(r), int(d)))
        if c.width < 380: c = c.resize((c.width*2, c.height*2))
        c.save(os.path.join(D, f"box_{id}_{n}.jpg"))
    ov.thumbnail((900, 900)); ov.save(os.path.join(D, f"ov_{id}.jpg"))
print("crops done")

