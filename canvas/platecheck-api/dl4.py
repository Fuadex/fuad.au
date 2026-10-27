# platecheckNN/dl4.py — the plate the STUDY VIEWER shows, per work, at about 2400 px (box coords are fractions of it).
# Sources in order: IIIF info.json -> /full/!2400,2400/; NGA iiif img -> /full/!2400,2400/; Commons (upload or FilePath)
# -> Special:FilePath?width=2400; any other direct img (Met) -> as is; no hires -> canon plate at width=2000.
# Also writes tour_<id>.json, ceiling.json, ids.json and groupD.json (coverage guard per tour).
import json, io, os, re, time, urllib.request, urllib.parse, subprocess, sys
D = os.path.dirname(os.path.abspath(__file__)) + "/"
UA = {"User-Agent": "CanvasAudit/1.0 (https://fuad.au)"}
IDS = json.load(io.open(D + "ids.json", encoding="utf-8"))
js = ("const fs=require('fs');const L=f=>{const o={};new Function('window',fs.readFileSync('C:/Users/Fuad/Documents/GitHub/fuad.au/canvas/'+f,'utf8'))(o);return Object.values(o)[0]};"
      "const I=L('art_inspect.js'),H=L('art_hires.js'),A=L('artworks.js');const arr=Array.isArray(A)?A:Object.entries(A).map(([id,v])=>Object.assign({id},v));"
      "const ids=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));const o={};for(const id of ids){const w=arr.find(x=>x.id===id)||{};o[id]={tour:I[id],h:H[id]||null,img:w.img||null}}console.log(JSON.stringify(o))")
data = json.loads(subprocess.check_output(["node", "-e", js, D + "ids.json"]).decode("utf-8"))
ceil, gd = {}, {}
for id in IDS:
    r = data[id]; h = r["h"]
    if h and h.get("iiif"):
        url, tier = re.sub(r"/info\.json$", "", h["iiif"]) + "/full/!2400,2400/0/default.jpg", "true IIIF %dx%d (no ceiling)" % (h["w"], h["h"])
    elif h and h.get("src") == "nga" and h.get("img"):
        url, tier = re.sub(r"/full/.*$", "", h["img"]) + "/full/!2400,2400/0/default.jpg", "true IIIF (no ceiling)"
    elif h and h.get("img") and ("wikimedia.org" in h["img"]):
        m = re.search(r"FilePath/([^?]+)", h["img"])
        fn = urllib.parse.unquote(m.group(1)) if m else urllib.parse.unquote(h["img"].rsplit("/", 1)[1])
        url = "https://commons.wikimedia.org/wiki/Special:FilePath/" + urllib.parse.quote(fn) + "?width=2400"
        tier = "flat img %dx%d" % (h["w"], h["h"])
    elif h and h.get("img"):
        url, tier = h["img"], "flat img %dx%d (holder file)" % (h["w"], h["h"])
    else:
        url, tier = re.sub(r"\?width=\d+", "?width=2000", r["img"] or ""), "canon plate only (imgZoom ~2000)"
    ceil[id] = {"url": url, "tier": tier}
    t = r["tour"]; json.dump(t, io.open(D + "tour_" + id + ".json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    st = t.get("deeper", []); full = [i for i, s in enumerate(st) if s.get("w") is not None and s["w"] * s["h"] > 0.9]
    cov = sum(s["w"] * s["h"] for i, s in enumerate(st) if s.get("w") is not None and i not in full)
    gd[id] = {"stops": len(st), "coverage_ex_full": round(cov, 3), "over_guard": cov > 1.14, "full_frame_stops": [i + 1 for i in full],
              "box_flags": [("stop %d: box leaves the plate" % (i + 1)) for i, s in enumerate(st) if s.get("w") is not None and (s["x"] < 0 or s["y"] < 0 or s["x"] + s["w"] > 1.001 or s["y"] + s["h"] > 1.001)]}
    path = D + "img_" + id + ".jpg"
    if os.path.exists(path) and os.path.getsize(path) > 10000: print("have", id); continue
    for attempt in range(4):
        try:
            b = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=180).read()
            open(path, "wb").write(b); print("ok  ", id, len(b) // 1024, "KB", tier); break
        except Exception as e:
            print("retry" if attempt < 3 else "FAIL", id, e)
            if attempt < 3: time.sleep(8 * (attempt + 1))
    time.sleep(3)
json.dump(ceil, io.open(D + "ceiling.json", "w", encoding="utf-8"), indent=1)
json.dump(gd, io.open(D + "groupD.json", "w", encoding="utf-8"), indent=1)
print("done")
