# sweep_src_agg.py — parsers for songkick-tokyo, songkick-osaka, songkick-nagoya, creativeman, smash
# Python 3.11+, stdlib only. The harness supplies fetch(url) -> str.
import datetime
import html
import json
import re
import sys

HORIZON_DAYS = 120

TOKYO_WARDS = {
    "Chiyoda": "千代田", "Chuo": "中央", "Minato": "港", "Shinjuku": "新宿", "Bunkyo": "文京",
    "Taito": "台東", "Sumida": "墨田", "Koto": "江東", "Shinagawa": "品川", "Meguro": "目黒",
    "Ota": "大田", "Setagaya": "世田谷", "Shibuya": "渋谷", "Nakano": "中野", "Suginami": "杉並",
    "Toshima": "豊島", "Kita": "北", "Arakawa": "荒川", "Itabashi": "板橋", "Nerima": "練馬",
    "Adachi": "足立", "Katsushika": "葛飾", "Edogawa": "江戸川",
}
_WARD_JA = {v + "区": k for k, v in TOKYO_WARDS.items()}
# Songkick localities that are sub-city / ward-ish names -> (city, area)
_SK_ALIAS = {"Umeda": ("Osaka", ""), "Tokai City": ("Tokai", "")}


def _clean(s):
    return re.sub(r"\s+", " ", html.unescape(s or "")).strip()


def _window(today):
    return today, today + datetime.timedelta(days=HORIZON_DAYS)


def _in_window(d, today):
    lo, hi = _window(today)
    return lo <= d <= hi


_ACT_PREFIX = re.compile(r"^\s*(?:LIVE|DJ|GUEST|LIVE\s*ACT|SPECIAL\s*GUEST|SUPPORT|OPENING\s*ACT|O\.?A\.?|w/|with)\s*[:：]?\s+", re.I)
_ACT_PREFIX2 = re.compile(r"^\s*(?:LIVE|DJ|GUEST|O\.A\.?|OA)\s*[:：]\s*", re.I)


def _clean_act(a):
    a = _clean(a)
    a = _ACT_PREFIX2.sub("", a)
    a = re.sub(r"^w/\s*", "", a, flags=re.I)
    return a.strip()


# --------------------------------------------------------------------------- Songkick

def _ward_from_address(addr):
    """Return romaji ward name if the address pins one down."""
    street = addr.get("streetAddress") or ""
    loc = addr.get("addressLocality") or ""
    if loc in TOKYO_WARDS:
        return loc
    for w in TOKYO_WARDS:
        if re.search(r"\b%s[- ]ku\b|\b%s City\b" % (w, w), street, re.I):
            return w
    for ja, w in _WARD_JA.items():
        if ja in street:
            return w
    return ""


def parse_songkick(text, default_city, today):
    out = []
    for blob in re.findall(r'<script[^>]*ld\+json[^>]*>(.*?)</script>', text, flags=re.S):
        try:
            data = json.loads(blob)
        except ValueError:
            continue
        for e in data if isinstance(data, list) else [data]:
            if not isinstance(e, dict) or e.get("@type") != "MusicEvent":
                continue
            start = (e.get("startDate") or "")[:10]
            try:
                d = datetime.date.fromisoformat(start)
            except ValueError:
                continue
            if d < today:
                continue
            loc = e.get("location") or {}
            addr = loc.get("address") or {}
            locality = _clean(addr.get("addressLocality"))
            area = ""
            ward = _ward_from_address(addr) if default_city == "Tokyo" else ""
            if default_city == "Tokyo" and (locality in TOKYO_WARDS or ward or locality == "Tokyo"):
                city, area = "Tokyo", ward
            elif locality in _SK_ALIAS:
                city, area = _SK_ALIAS[locality]
            else:
                city = locality or default_city
            acts, seen = [], set()
            for p in e.get("performer") or []:
                n = _clean_act(p.get("name") if isinstance(p, dict) else p)
                if n and n.lower() not in seen:
                    seen.add(n.lower())
                    acts.append(n)
            if not acts:
                continue
            venue = _clean(loc.get("name"))
            title = _clean(e.get("name"))
            url = (e.get("url") or "").split("?")[0]
            rec = {"acts": acts, "title": title, "date": d.isoformat(), "venue": venue,
                   "city": city, "area": area, "url": url, "note": ""}
            end = (e.get("endDate") or "")[:10]
            if len(end) == 10 and end > rec["date"]:
                rec["until"] = end
            out.append(rec)
    return out


def _collect_songkick(fetch, today, metro, default_city):
    base = "https://www.songkick.com/metro-areas/" + metro
    out, seen = [], set()
    ok_pages = 0
    last_err = None
    for page in range(1, 6):
        url = base if page == 1 else "%s?page=%d" % (base, page)
        try:
            text = fetch(url)
        except Exception as ex:  # noqa: BLE001
            last_err = ex
            if page == 1:
                raise
            break
        ok_pages += 1
        recs = parse_songkick(text, default_city, today)
        if not re.search(r'"@type"\s*:\s*"MusicEvent"', text):
            break  # empty page: stop
        new = 0
        for r in recs:
            key = r["url"] or (r["date"], r["venue"], tuple(r["acts"]))
            if key in seen:
                continue
            seen.add(key)
            out.append(r)
            new += 1
        if not new and not recs:
            continue
    return out


def collect_songkick_tokyo(fetch, today):
    """Songkick Tokyo metro, pages 1..5."""
    return _collect_songkick(fetch, today, "30717-japan-tokyo", "Tokyo")


def collect_songkick_osaka(fetch, today):
    """Songkick Osaka metro, pages 1..5."""
    return _collect_songkick(fetch, today, "30647-japan-osaka", "Osaka")


def collect_songkick_nagoya(fetch, today):
    """Songkick Nagoya metro, pages 1..5."""
    return _collect_songkick(fetch, today, "30611-japan-nagoya", "Nagoya")


# --------------------------------------------------------------------------- Creativeman

# calendar area label (Japanese) / css slug -> romaji city. "" = can't tell (no guessing).
_CM_CITY = {
    "東京": "Tokyo", "神奈川": "Yokohama", "大阪": "Osaka", "愛知": "Nagoya", "京都": "Kyoto",
    "兵庫": "Kobe", "千葉": "Chiba", "埼玉": "Saitama", "福岡": "Fukuoka", "九州": "Fukuoka",
    "北海道": "Sapporo", "宮城": "Sendai", "仙台": "Sendai", "広島": "Hiroshima",
    "新潟": "Niigata", "石川": "Kanazawa", "静岡": "Shizuoka", "岡山": "Okayama",
    "熊本": "Kumamoto", "沖縄": "Naha", "岐阜": "Gifu", "富山": "Toyama", "山形": "Yamagata",
    "岩手": "Morioka", "愛媛": "Matsuyama", "山口": "Yamaguchi", "島根": "Matsue",
    "大分": "Oita", "宮崎": "Miyazaki", "奈良": "Nara", "栃木": "Utsunomiya",
    "山梨": "Kofu", "長野": "Nagano", "香川": "Takamatsu", "四国": "",
    "三重": "", "群馬": "",  # prefecture only, city not stated
}
_CM_SKIP_AREAS = ("海外", "オンライン", "ONLINE", "海外公演", "バンコク", "ハワイ")
_CM_SKIP_SLUGS = ("bangkok", "hawaii", "online", "kaigaikouen")


def _month_starts(today):
    lo, hi = _window(today)
    y, m = lo.year, lo.month
    out = []
    while datetime.date(y, m, 1) <= hi:
        out.append((y, m))
        m += 1
        if m > 12:
            y, m = y + 1, 1
    return out


def parse_creativeman_month(text, y, m, today):
    out = []
    i = text.find('<table class="p-calendar"')
    if i < 0:
        return out
    j = text.find("</table>", i)
    body = text[i:j if j > 0 else len(text)]
    for td in re.findall(r"<td\b[^>]*>.*?</td>", body, flags=re.S):
        dm = re.search(r'p-calendar__label">\s*(\d+)\s*<', td)
        if not dm:
            continue
        try:
            d = datetime.date(y, m, int(dm.group(1)))
        except ValueError:
            continue
        if not _in_window(d, today):
            continue
        for blk in re.split(r'(?=<div class="p-calendar__live)', td)[1:]:
            am = re.search(r'<a href="([^"]+)"[^>]*>(.*?)</a>', blk, flags=re.S)
            if not am:
                continue
            url = html.unescape(am.group(1))
            inner = am.group(2)
            lab = re.search(r'p-calendar__areaLabel--([\w-]+)">([^<]*)<', inner)
            slug, label = (lab.group(1), _clean(lab.group(2))) if lab else ("", "")
            title = _clean(re.sub(r"<[^>]+>", " ", inner.replace(lab.group(0) if lab else "", "")))
            title = title.replace("\xa0", " ").strip()
            if not title:
                continue
            blk_text = _clean(re.sub(r"<[^>]+>", " ", blk))
            if re.search(r"公演中止|中止|CANCEL", blk_text, re.I):
                continue
            if slug in _CM_SKIP_SLUGS or any(k in label for k in _CM_SKIP_AREAS):
                continue
            city = _CM_CITY.get(label)
            note = ""
            if city is None:
                city, note = "", "area: " + label if label else ""
            elif city == "" and label:
                note = "prefecture: " + label
            out.append({"acts": [title], "title": title, "date": d.isoformat(), "venue": "",
                        "city": city, "area": "", "url": url, "note": note})
    return out


def collect_creativeman(fetch, today):
    out, seen = [], set()
    errs, ok = [], 0
    for y, m in _month_starts(today):
        url = "https://www.creativeman.co.jp/event/?cmy=%d&cmm=%d" % (y, m)
        try:
            text = fetch(url)
            recs = parse_creativeman_month(text, y, m, today)
            ok += 1
        except Exception as ex:  # noqa: BLE001
            errs.append(ex)
            continue
        for r in recs:
            key = (r["date"], r["url"], r["city"])
            if key not in seen:
                seen.add(key)
                out.append(r)
    if not ok and errs:
        raise errs[0]
    return out


# --------------------------------------------------------------------------- SMASH

_SM_VENUE_CITY = [
    # (substring, city, area)  — checked in order, case-insensitive
    ("(TOKYO)", "Tokyo", ""), ("(OSAKA)", "Osaka", ""), ("(NAGOYA)", "Nagoya", ""),
    ("(YOKOHAMA)", "Yokohama", ""), ("(FUKUOKA)", "Fukuoka", ""), ("(SAPPORO)", "Sapporo", ""),
    ("shibuya", "Tokyo", "Shibuya"), ("渋谷", "Tokyo", "Shibuya"), ("LINE CUBE", "Tokyo", "Shibuya"),
    ("WWW", "Tokyo", "Shibuya"), ("O-EAST", "Tokyo", "Shibuya"), ("O-WEST", "Tokyo", "Shibuya"),
    ("O-NEST", "Tokyo", "Shibuya"), ("O-Crest", "Tokyo", "Shibuya"), ("duo MUSIC", "Tokyo", "Shibuya"),
    ("代官山", "Tokyo", "Shibuya"), ("UNIT", "Tokyo", "Shibuya"), ("Yebisu", "Tokyo", "Shibuya"),
    ("恵比寿", "Tokyo", "Shibuya"), ("LIQUIDROOM", "Tokyo", "Shibuya"), ("代々木", "Tokyo", "Shibuya"),
    ("PLEASURE PLEASURE", "Tokyo", "Shibuya"), ("WOMB", "Tokyo", "Shibuya"),
    ("Shangri-La", "Tokyo", "Koto"), ("東京ガーデンシアター", "Tokyo", "Koto"), ("SGC HALL ARIAKE", "Tokyo", "Koto"),
    ("Zepp Haneda", "Tokyo", "Ota"), ("Zepp DiverCity", "Tokyo", "Koto"),
    ("EX THEATER", "Tokyo", "Minato"), ("新代田", "Tokyo", "Setagaya"), ("Fever", "Tokyo", "Setagaya"),
    ("日本武道館", "Tokyo", "Chiyoda"), ("KANDA", "Tokyo", "Chiyoda"), ("日本橋", "Tokyo", "Chuo"),
    ("大手町", "Tokyo", "Chiyoda"), ("すみだ", "Tokyo", "Sumida"), ("東京キネマ", "Tokyo", "Chiyoda"),
    ("新宿", "Tokyo", "Shinjuku"), ("SHINJUKU", "Tokyo", "Shinjuku"),
    ("UMEDA", "Osaka", ""), ("BIGCAT", "Osaka", ""), ("CIRCUS OSAKA", "Osaka", ""), ("なんば", "Osaka", ""),
    ("Namba", "Osaka", ""), ("フェスティバルホール", "Osaka", ""), ("ブリーゼ", "Osaka", ""),
    ("大阪", "Osaka", ""), ("CLUB JOULE", "Osaka", ""), ("Music Club JANUS", "Osaka", ""),
    ("NAGOYA", "Nagoya", ""), ("名古屋", "Nagoya", ""), ("DIAMOND HALL", "Nagoya", ""),
    ("ダイアモンドホール", "Nagoya", ""),
    ("YOKOHAMA", "Yokohama", ""), ("横浜", "Yokohama", ""),
    ("KYOTO", "Kyoto", ""), ("京都", "Kyoto", ""), ("磔磔", "Kyoto", ""),
    ("千葉", "Chiba", ""), ("札幌", "Sapporo", ""), ("新潟", "Niigata", ""), ("NIIGATA", "Niigata", ""),
    ("西川口", "Kawaguchi", ""), ("盛岡", "Morioka", ""), ("尾道", "Onomichi", ""), ("福岡", "Fukuoka", ""),
    ("仙台", "Sendai", ""), ("広島", "Hiroshima", ""), ("神戸", "Kobe", ""), ("金沢", "Kanazawa", ""),
    ("mito", "Mito", ""), ("ATSUGI", "Atsugi", ""),
]
_SM_REGION_CITY = {
    "東京": "Tokyo", "神奈川": "Yokohama", "大阪": "Osaka", "愛知": "Nagoya", "京都": "Kyoto",
    "兵庫": "Kobe", "千葉": "Chiba", "埼玉": "Saitama", "福岡": "Fukuoka", "北海道": "Sapporo",
    "宮城": "Sendai", "広島": "Hiroshima", "新潟": "Niigata", "石川": "Kanazawa", "静岡": "Shizuoka",
    "岡山": "Okayama", "熊本": "Kumamoto", "沖縄": "Naha", "長野": "Nagano", "岩手": "Morioka",
    "茨城": "Mito", "香川": "Takamatsu", "愛媛": "Matsuyama", "鹿児島": "Kagoshima",
    "長崎": "Nagasaki", "大分": "Oita", "石川県": "Kanazawa",
}


def _sm_city(venue):
    v = venue.lower()
    for sub, city, area in _SM_VENUE_CITY:
        if sub.lower() in v:
            return city, area
    return None


def _sm_page_city(text, d, venue):
    """Look up the region label on an event page for date d (YYYY-MM-DD) -> romaji city or None."""
    s = re.sub(r"<script.*?</script>|<style.*?</style>", "", text, flags=re.S)
    s = re.sub(r"<[^>]+>", "|", s)
    s = html.unescape(s)
    s = re.sub(r"[\s|]*\|[\s|]*", "|", s)
    ds = d.replace("-", "/")
    for m in re.finditer(r"\|([^|]{1,6})\|%s\s*\(\w+\)\s*([^|]*)" % re.escape(ds), s):
        region, ven = m.group(1), m.group(2).strip()
        if not venue or venue.lower()[:6] in ven.lower() or ven.lower()[:6] in venue.lower():
            return _SM_REGION_CITY.get(region)
    return None


def parse_smash_month(text, y, m, today):
    out = []
    for td in re.findall(r'<td[^>]*><p class="day">.*?</td>', text, flags=re.S):
        dm = re.search(r"<br>(\d+)</p>", td)
        if not dm:
            continue
        try:
            d = datetime.date(y, m, int(dm.group(1)))
        except ValueError:
            continue
        if not _in_window(d, today):
            continue
        for u, name, det in re.findall(r'<li><a href="([^"]+)"[^>]*>(.*?)</a><span>(.*?)</span></li>', td, flags=re.S):
            name = _clean(re.sub(r"<[^>]+>", "", name))
            if not name:
                continue
            parts = [x for x in re.sub(r"<img[^>]*>", "", det).split("<br>")]
            parts = [html.unescape(x) for x in parts]
            ven = next((x.split(":", 1)[1].strip() for x in parts if x.startswith("会場")), "")
            ven = re.sub(r"^[:：]", "", ven)
            if re.search(r"中止|CANCEL", " ".join(parts), re.I):
                continue
            url = u if u.startswith("http") else "https://smash-jpn.com" + u
            out.append({"acts": [_clean_act(name)], "title": name, "date": d.isoformat(),
                        "venue": _clean(ven), "city": "", "area": "", "url": url, "note": ""})
    return out


def collect_smash(fetch, today):
    out, errs, ok = [], [], 0
    for y, m in _month_starts(today):
        url = "https://smash-jpn.com/calendar/?year=%d&month=%d" % (y, m)
        try:
            text = fetch(url)
            recs = parse_smash_month(text, y, m, today)
            ok += 1
        except Exception as ex:  # noqa: BLE001
            errs.append(ex)
            continue
        out.extend(recs)
    if not ok and errs:
        raise errs[0]
    # resolve cities: venue keywords first, else the event page's region label
    page_cache = {}
    for r in out:
        hit = _sm_city(r["venue"])
        if hit:
            r["city"], r["area"] = hit
            continue
        if "smash-jpn.com/live" not in r["url"]:
            continue
        try:
            if r["url"] not in page_cache:
                page_cache[r["url"]] = fetch(r["url"])
            c = _sm_page_city(page_cache[r["url"]], r["date"], r["venue"])
        except Exception:  # noqa: BLE001
            c = None
        if c:
            r["city"] = c
            if c == "Tokyo":
                r["area"] = ""
        else:
            r["note"] = "city unknown"
    return out


SOURCES = {
    "songkick-tokyo": collect_songkick_tokyo,
    "songkick-osaka": collect_songkick_osaka,
    "songkick-nagoya": collect_songkick_nagoya,
    "creativeman": collect_creativeman,
    "smash": collect_smash,
}


if __name__ == "__main__":
    # self-test: python3 sweep_src_agg.py sk:FILE... cm:YYYY-MM:FILE... sm:YYYY-MM:FILE...
    # (or "live" to run every collector through urllib)
    today = datetime.date.today()
    if len(sys.argv) == 2 and sys.argv[1] == "live":
        import urllib.request

        def _fetch(url):
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (rotation-sweep)"})
            with urllib.request.urlopen(req, timeout=25) as r:
                return r.read().decode("utf-8", "replace")
        for sid, fn in SOURCES.items():
            try:
                res = fn(_fetch, today)
            except Exception as ex:  # noqa: BLE001
                print(sid, "FAILED", ex)
                continue
            print(sid, len(res))
            for r in res[:3]:
                print("  ", json.dumps(r, ensure_ascii=False))
        sys.exit(0)
    for arg in sys.argv[1:]:
        kind, _, rest = arg.partition(":")
        if kind == "sk":
            res = parse_songkick(open(rest, encoding="utf-8", errors="ignore").read(), "Tokyo", today)
        elif kind in ("cm", "sm"):
            ym, _, path = rest.partition(":")
            y, m = map(int, ym.split("-"))
            txt = open(path, encoding="utf-8", errors="ignore").read()
            res = (parse_creativeman_month if kind == "cm" else parse_smash_month)(txt, y, m, today)
        else:
            continue
        print(arg, len(res))
        for r in res[:3]:
            print("  ", json.dumps(r, ensure_ascii=False))
