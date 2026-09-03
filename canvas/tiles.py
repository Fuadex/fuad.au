# tiles.py — pre-diced zoom tiles for agents that cannot crop (added wave 7).
# Every eye agent in wave 7 reported the same ceiling: the Read tool renders a huge plate at a few
# hundred pixels, so fine-grain claims (accessories, lettering, individual touches) are unprovable
# and get quarantined into FLAGS. Agents have no shell, so they cannot cut their own crops.
# This cuts a 3x3 overlapping grid per work at real resolution, so a drafter can actually LOOK.
import json, os
from PIL import Image
D = r"C:\Users\Fuad\Documents\GitHub\.dtmp\tourwave8-hires"
ids = json.load(open(os.path.join(D, 'ids.json')))
OVERLAP = 0.08          # tiles overlap so nothing falls in a seam
MAXPX = 1400            # per-tile cap; big enough to see, small enough to read cheaply
made = 0
for wid in ids:
    p = os.path.join(D, "img_%s.jpg" % wid)
    if not os.path.exists(p):
        print("MISSING", wid); continue
    im = Image.open(p).convert("RGB")
    W, H = im.size
    tw, th = W / 3.0, H / 3.0
    for r in range(3):
        for c in range(3):
            l = max(0, int((c - OVERLAP) * tw)); u = max(0, int((r - OVERLAP) * th))
            rt = min(W, int((c + 1 + OVERLAP) * tw)); b = min(H, int((r + 1 + OVERLAP) * th))
            t = im.crop((l, u, rt, b))
            if t.width > MAXPX:
                t.thumbnail((MAXPX, MAXPX))
            # name by grid position so an agent can ask for a region by name
            name = "tile_%s_r%dc%d.jpg" % (wid, r + 1, c + 1)
            t.save(os.path.join(D, name), quality=90)
            made += 1
# Emit the EXACT tile->plate mapping alongside the tiles.
# Without this every agent derives the geometry by eye, and they disagree. Wave 8 produced three
# different guesses — "0.40 wide at origins 0/0.3/0.6", "0.38 x 0.37", "0.30(N-1) -> +0.40" — and
# all three were wrong, because the EDGE TILES ARE CLIPPED to the frame: the bands are not equal
# width and column 3 starts at 0.640, not 0.60. An agent assuming 0.60 shifts every box taken off
# column 3 by ~0.04, which is a whole small object. One wave-8 agent caught the contradiction only
# because two tiles disagreed about the same dog.
import json as _json


def _span(k):
    return (max(0.0, (k - OVERLAP) / 3.0), min(1.0, (k + 1 + OVERLAP) / 3.0))


_map = {
    "_note": "EXACT tile->plate fractions. Do NOT derive these yourself; the edge tiles are clipped "
             "so the three bands are NOT equal width.",
    "columns": {"c%d" % (k + 1): {"x0": round(_span(k)[0], 4), "x1": round(_span(k)[1], 4)} for k in range(3)},
    "rows": {"r%d" % (k + 1): {"y0": round(_span(k)[0], 4), "y1": round(_span(k)[1], 4)} for k in range(3)},
}
_json.dump(_map, open(os.path.join(D, "TILE_MAP.json"), "w"), indent=1)
print("tiles written:", made, "(9 per work, 3x3 with 8% overlap); TILE_MAP.json emitted")
