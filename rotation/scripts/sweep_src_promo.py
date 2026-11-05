# sweep_src_promo.py — parsers for Udo Music Office, Live Nation H.I.P., LIQUIDROOM, WWW / WWW X
#
# Sources
#   udo          https://udo.jp/shows            paginated card list (?page=N) carries only titles;
#                                                dates + venues live on each /shows/<slug> page
#                                                (schedule cards: year / month / day spans + venue).
#   lnhip        https://livenationhip.co.jp/    homepage SCHEDULE section only (~22 cards, server-rendered).
#                                                LIMITATION: the full list (/event/allevents) is built in
#                                                the browser by JS, and event detail pages carry no venue,
#                                                so these listings have date (+until) and acts but no venue/city.
#   liquidroom   https://www.liquidroom.net/schedule/YYYY/MM   one <article> per day; acts = headline + LINE UP.
#   www-shibuya  https://www-shibuya.jp/schedule/YYYYMM.php    one <article> per event; hall = WWW or WWW X.
#
# The harness supplies fetch(url) -> str; this module never touches the network itself.
import datetime
import html
import re
import urllib.parse

HORIZON_DAYS = 120


# --------------------------------------------------------------------------- helpers
def _txt(s):
    """HTML fragment -> single-line-ish plain text (tags dropped, entities decoded)."""
    s = re.sub(r"<br\s*/?>|</p>|</li>|</div>", "\n", s, flags=re.I)
    s = re.sub(r"<[^>]+>", "", s)
    s = html.unescape(s).replace("\xa0", " ")
    s = re.sub(r"[ \t　]+", " ", s)
    return re.sub(r"\n\s*\n+", "\n", s).strip()


def _one(s):
    return re.sub(r"\s+", " ", _txt(s)).strip()


def _window(today):
    return today, today + datetime.timedelta(days=HORIZON_DAYS)


def _month_starts(today, end):
    y, m = today.year, today.month
    while (y, m) <= (end.year, end.month):
        yield y, m
        m += 1
        if m > 12:
            y, m = y + 1, 1


_PREFIX_RE = re.compile(
    r"^\s*(?:[〈<【\[（(]\s*)?"
    r"(?:LIVE|DJ|VJ|GUEST|SPECIAL GUEST|SPECIAL DIVA GUEST|DIVA LIVE|O\.?A\.?|OPENING ACT|ACT|"
    r"BAND|LIVE ACT|SUPPORT|ゲスト|出演|w/)"
    r"(?:\s*[〉>】\]）)])?\s*(?:[:：]|\s(?=\S)|$)",
    re.I,
)
_NOISE_ACT_RE = re.compile(
    r"^(?:and more|＆more|&more|\+ ?more|more|etc\.?|他|ほか|and others|tba|tbd|guest|special guest|"
    r"ゲスト|live|dj|hair show|-+|…+|\.+)[.…]*$",
    re.I,
)
_ROLE_RE = re.compile(r"^(?:Vo|Gt|Ba|Dr|Key|Kb|Cho|Sax|Tp|Tb|Vn|Vc|Pf|Per|Mp)\.?\s*[:：]", re.I)


def _clean_act(a):
    a = html.unescape(a).replace("\xa0", " ").strip()
    for _ in range(3):  # prefixes can stack: "GUEST : DJ : x"
        b = _PREFIX_RE.sub("", a).strip()
        if b == a:
            break
        a = b
    a = re.sub(r"^[〈<【\[]\s*(?:LIVE|DJ|VJ|GUEST|HAIR SHOW)\s*[〉>】\]]\s*", "", a, flags=re.I)
    a = re.sub(r"\s*[（(]\s*(?:from|feat|guest|special)[^)）]*[)）]\s*$", "", a, flags=re.I)
    a = a.strip(" 　:：-–—/／・,，、")
    if _ROLE_RE.match(a):
        return ""
    if _NOISE_ACT_RE.match(a):
        return ""
    return a


def _split_acts(s, seps=r"\n|\s/\s|／|、|，|\s×\s|\s＋\s|\s\+\s|\sand\s"):
    out = []
    for part in re.split(seps, s):
        for sub in re.split(r"\s*[,，]\s+", part):
            a = _clean_act(sub)
            if a:
                out.append(a)
    return out


def _dedupe(seq):
    seen, out = set(), []
    for x in seq:
        k = x.casefold()
        if k not in seen:
            seen.add(k)
            out.append(x)
    return out


# Japanese venue keyword -> (city, area-or-None).  First match wins, most specific first.
_VENUE_CITY = [
    ("東京ドーム", "Tokyo", "Bunkyo"), ("有明", "Tokyo", "Koto"), ("日本武道館", "Tokyo", "Chiyoda"),
    ("武道館", "Tokyo", "Chiyoda"), ("国立代々木", "Tokyo", "Shibuya"), ("代々木", "Tokyo", "Shibuya"),
    ("東京国際フォーラム", "Tokyo", "Chiyoda"), ("NHKホール", "Tokyo", "Shibuya"), ("渋谷", "Tokyo", "Shibuya"),
    ("Zepp Haneda", "Tokyo", "Ota"), ("Zepp DiverCity", "Tokyo", "Koto"), ("Zepp Shinjuku", "Tokyo", "Shinjuku"),
    ("新宿", "Tokyo", "Shinjuku"), ("恵比寿", "Tokyo", "Ebisu"), ("LIQUIDROOM", "Tokyo", "Ebisu"),
    ("豊洲", "Tokyo", "Koto"), ("TOYOSU", "Tokyo", "Koto"), ("品川", "Tokyo", "Minato"), ("六本木", "Tokyo", "Minato"),
    ("赤坂", "Tokyo", "Minato"), ("EX THEATER", "Tokyo", "Minato"), ("TOKYO DOME CITY", "Tokyo", "Bunkyo"),
    ("Kanadevia Hall", "Tokyo", "Shibuya"), ("渋谷公会堂", "Tokyo", "Shibuya"), ("オーチャードホール", "Tokyo", "Shibuya"),
    ("サントリーホール", "Tokyo", "Minato"), ("東京文化会館", "Tokyo", "Taito"), ("上野", "Tokyo", "Taito"),
    ("浅草", "Tokyo", "Taito"), ("池袋", "Tokyo", "Toshima"), ("中野", "Tokyo", "Nakano"), ("立川", "Tokyo", "Tachikawa"),
    ("昭和女子大", "Tokyo", "Setagaya"), ("人見記念", "Tokyo", "Setagaya"), ("下北沢", "Tokyo", "Setagaya"),
    ("お台場", "Tokyo", "Koto"), ("TACHIKAWA", "Tokyo", "Tachikawa"), ("東京", "Tokyo", None),
    ("横浜", "Yokohama", None), ("Kアリーナ", "Yokohama", None), ("みなとみらい", "Yokohama", None),
    ("幕張", "Chiba", None), ("千葉", "Chiba", None), ("さいたま", "Saitama", None), ("埼玉", "Saitama", None),
    ("川崎", "Kawasaki", None), ("大阪", "Osaka", None), ("インテックス", "Osaka", None), ("Asue", "Osaka", None),
    ("グランキューブ", "Osaka", None), ("フェスティバルホール", "Osaka", None), ("京セラ", "Osaka", None),
    ("名古屋", "Nagoya", None), ("Niterra", "Nagoya", None), ("ガイシ", "Nagoya", None), ("IGアリーナ", "Nagoya", None),
    ("福岡", "Fukuoka", None), ("マリンメッセ", "Fukuoka", None), ("札幌", "Sapporo", None), ("仙台", "Sendai", None),
    ("神戸", "Kobe", None), ("京都", "Kyoto", None), ("広島", "Hiroshima", None), ("岡山", "Okayama", None),
    ("金沢", "Kanazawa", None), ("新潟", "Niigata", None), ("静岡", "Shizuoka", None), ("浜松", "Hamamatsu", None),
    ("熊本", "Kumamoto", None), ("鹿児島", "Kagoshima", None), ("沖縄", "Okinawa", None), ("松山", "Matsuyama", None),
    ("高松", "Takamatsu", None), ("長野", "Nagano", None), ("宇都宮", "Utsunomiya", None), ("盛岡", "Morioka", None),
    ("秋田", "Akita", None), ("青森", "Aomori", None), ("福島", "Fukushima", None), ("郡山", "Koriyama", None),
    ("北九州", "Kitakyushu", None), ("長崎", "Nagasaki", None), ("大分", "Oita", None), ("宮崎", "Miyazaki", None),
    ("岐阜", "Gifu", None), ("富山", "Toyama", None), ("三重", "Tsu", None), ("姫路", "Himeji", None),
    ("梅田", "Osaka", None), ("なんば", "Osaka", None), ("BIGCAT", "Osaka", None), ("OSAKA", "Osaka", None),
    ("JANUS", "Osaka", None), ("NAGOYA", "Nagoya", None), ("COMTEC PORTBASE", "Nagoya", None),
    ("YOKOHAMA", "Yokohama", None), ("KOBE", "Kobe", None), ("KYOTO", "Kyoto", None), ("FUKUOKA", "Fukuoka", None),
    ("SAPPORO", "Sapporo", None), ("SENDAI", "Sendai", None), ("文京", "Tokyo", "Bunkyo"), ("ARIAKE", "Tokyo", "Koto"),
    ("かつしか", "Tokyo", "Katsushika"), ("吉祥寺", "Tokyo", "Musashino"), ("Hakuju", "Tokyo", "Shibuya"),
    ("音楽の友ホール", "Tokyo", "Shinjuku"), ("滋賀", "Otsu", None), ("SHIBUYA", "Tokyo", "Shibuya"),
    ("堺", "Sakai", None), ("豊田", "Toyota", None), ("所沢", "Tokorozawa", None), ("神奈川", "Yokohama", None),
]


def _venue_geo(venue):
    venue = re.sub(r"^[〜~].*?[)）]\s*", "", venue)
    for kw, city, area in _VENUE_CITY:
        if kw.lower() in venue.lower():
            return city, area
    return "", None


def _listing(acts, title, date, venue, city, area, url, note=""):
    d = {"acts": acts, "title": title, "date": date.isoformat(), "venue": venue, "city": city}
    if area:
        d["area"] = area
    d["url"] = url
    d["note"] = note
    return d


# --------------------------------------------------------------------------- udo
_UDO_SUFFIX = re.compile(r"\s*[｜|]\s*ウドー音楽事務所.*$")


def _udo_page(page_html, url, today, end):
    out = []
    tm = re.search(r"<title>(.*?)</title>", page_html, re.S)
    title = _UDO_SUFFIX.sub("", _one(tm.group(1))) if tm else ""
    h1 = re.search(r"<h1[^>]*>(.*?)</h1>", page_html, re.S)
    act = ""
    if h1:
        ps = [x for x in (_one(p) for p in re.findall(r"<p[^>]*>(.*?)</p>", h1.group(1), re.S)) if x]
        if not ps:
            ps = [_one(h1.group(1))]
        # "DIANA" / "KRALL" are split over lines of one name; long multi-line blocks are event copy
        act = " ".join(ps) if len(ps) <= 2 and sum(len(p) for p in ps) <= 40 else ps[0]
    act = _clean_act(act) or title
    if not act:
        return out
    sub = re.search(r'(?:infoSubTitle|showsDetail__subTitle)[^>]*>(.*?)</div>', page_html, re.S)
    note = _one(sub.group(1)) if sub else ""
    for blk in re.split(r'(?=<li class="[^"]*scheduleItem")', page_html)[1:]:
        dm = re.search(
            r'scheduleDateYear">(\d{4})</span>\s*年\s*<span[^>]*>(\d{1,2})</span>\s*月\s*<span[^>]*>(\d{1,2})</span>', blk)
        vm = re.search(r'scheduleVenue">(.*?)</p>', blk, re.S)
        if not dm:
            continue
        try:
            d = datetime.date(int(dm.group(1)), int(dm.group(2)), int(dm.group(3)))
        except ValueError:
            continue
        if d < today or d > end:
            continue
        venue = re.sub(r"^[〜~].*?[)）]\s*", "", _one(vm.group(1))) if vm else ""
        city, area = _venue_geo(venue)
        out.append(_listing([act], title, d, venue, city, area, url, note))
    return out


def collect_udo(fetch, today):
    _, end = _window(today)
    slugs, out, seen_dates = [], [], set()
    for page in range(1, 41):
        try:
            h = fetch("https://udo.jp/shows" + ("" if page == 1 else "?page=%d" % page))
        except Exception:
            if page == 1:
                raise
            continue
        found = [s for s in re.findall(r'href="/shows/([^"/?#]+)"', h) if s not in slugs]
        if not found and page > 1:
            break
        slugs.extend(dict.fromkeys(found))
    if not slugs:
        raise RuntimeError("udo: no show links found")
    for slug in slugs:
        url = "https://udo.jp/shows/" + slug
        try:
            page_html = fetch(url)
        except Exception:
            continue
        for item in _udo_page(page_html, url, today, end):
            key = (item["acts"][0], item["date"], item["venue"])
            if key not in seen_dates:
                seen_dates.add(key)
                out.append(item)
    return out


# --------------------------------------------------------------------------- lnhip
def _hip_date(tok, ref_year=None):
    m = re.fullmatch(r"(?:(\d{2})\.)?(\d{1,2})\.(\d{1,2})", tok.strip())
    if not m:
        return None
    yy = int(m.group(1)) + 2000 if m.group(1) else None
    return yy, int(m.group(2)), int(m.group(3))


def _hip_range(txt, today):
    """'11.3' | '27.1.4 - 1.28' | '10.24 - 27.1.17' -> (start_date, end_date_or_None)"""
    parts = [p.strip() for p in re.split(r"\s+-\s+", txt.strip())]
    toks = [_hip_date(p) for p in parts]
    if not toks or any(t is None for t in toks) or len(toks) > 2:
        return None
    def mk(y, m, d):
        return datetime.date(y, m, d)
    try:
        if len(toks) == 1:
            y, m, d = toks[0]
            if y is None:
                y = today.year
                if mk(y, m, d) < today - datetime.timedelta(days=30):
                    y += 1
            return mk(y, m, d), None
        (y1, m1, d1), (y2, m2, d2) = toks
        if y2 is None:
            y2 = y1 if y1 else today.year
        if y1 is None:
            y1 = y2
        end = mk(y2, m2, d2)
        if y1 == y2 and (m1, d1) > (m2, d2):  # un-yeared end that wrapped past year-end
            if toks[1][0] is None:
                end = mk(y2 + 1, m2, d2)
            else:
                y1 -= 1
        start = mk(y1, m1, d1)
        if start > end:
            start = mk(end.year - 1, m1, d1)
        return start, end
    except ValueError:
        return None


def collect_lnhip(fetch, today):
    _, horizon = _window(today)
    h = fetch("https://www.livenationhip.co.jp/")
    out, seen = [], set()
    for card in re.findall(r'<li class="[^"]*yv46ao0[^"]*"[^>]*>(.*?)</li>', h, re.S):
        href = re.search(r'href="([^"]+)"', card)
        tags = [_one(t) for t in re.findall(r"<(?:p|small|h\d)[^>]*>(.*?)</(?:p|small|h\d)>", card, re.S)]
        tags = [t for t in tags if t]
        if not href or len(tags) < 2:
            continue
        rng = _hip_range(tags[0], today)
        if not rng:
            continue
        start, end = rng
        last = end or start
        if last < today or start > horizon:
            continue
        url = urllib.parse.quote(html.unescape(href.group(1)), safe=":/%?=&#")
        if url in seen:
            continue
        seen.add(url)
        names = [n.strip() for n in tags[1].split(" | ")]
        acts = _dedupe(a for n in names for a in [_clean_act(n)] if a)
        # "超特急・DISH//" style joint billing
        title = tags[2] if len(tags) > 2 else tags[1]
        d = _listing(acts or [tags[1]], title, start, "", "", None, url,
                     "Live Nation H.I.P. homepage card; venue/city not server-rendered")
        if end and end != start:
            d["until"] = end.isoformat()
        out.append(d)
    if not out:
        raise RuntimeError("lnhip: no schedule cards found")
    return out


# --------------------------------------------------------------------------- liquidroom
_LR_EVENTNAME = re.compile(r"presents|[『「“”〜～]|tour|ツアー|anniversary|vol\.|festival|fes\b|pre\b|day\d", re.I)


def _lr_month(h, y, m, today, end):
    out = []
    for art in re.findall(r"<article\b[^>]*>(.*?)</article>", h, re.S):
        href = re.search(r'class="s_link"\s+href="([^"]+)"', art)
        if not href:
            continue
        dm = re.search(r"_(\d{4})(\d{2})(\d{2})(?:\D|$)", href.group(1))
        try:
            if dm:
                d = datetime.date(int(dm.group(1)), int(dm.group(2)), int(dm.group(3)))
            else:
                day = re.search(r"<time[^>]*>\s*(\d{1,2})", art)
                d = datetime.date(y, m, int(day.group(1)))
        except (ValueError, AttributeError):
            continue
        if d < today or d > end:
            continue
        h2 = re.search(r"<h2[^>]*>(.*?)</h2>", art, re.S)
        head = _one(h2.group(1)) if h2 else ""
        sub = re.search(r'class="subtitle"[^>]*>(.*?)</p>', art, re.S)
        subtitle = _one(sub.group(1)) if sub else ""
        lu = ""
        for dt, dd in re.findall(r"<dt[^>]*>(.*?)</dt>\s*<dd[^>]*>(.*?)</dd>", art, re.S):
            if _one(dt).upper().replace(" ", "") == "LINEUP":
                lu = _txt(dd)
        lineup = _dedupe(_split_acts(lu))
        acts = []
        if head and not (lineup and _LR_EVENTNAME.search(head)):
            acts.append(_clean_act(head) or head)
        acts += lineup
        acts = _dedupe(a for a in acts if a)
        if not acts:
            continue
        title = head + (" " + subtitle if subtitle else "")
        out.append(_listing(acts, title.strip(), d, "LIQUIDROOM", "Tokyo", "Ebisu", href.group(1),
                            "sold out" if "SOLD OUT" in art else ""))
    return out


def collect_liquidroom(fetch, today):
    _, end = _window(today)
    out, errs, ok = [], 0, 0
    for y, m in _month_starts(today, end):
        try:
            h = fetch("https://www.liquidroom.net/schedule/%d/%02d" % (y, m))
            out += _lr_month(h, y, m, today, end)
            ok += 1
        except Exception:
            errs += 1
    if not ok:
        raise RuntimeError("liquidroom: every month failed")
    return out


# --------------------------------------------------------------------------- www-shibuya
def _www_month(h, y, m, today, end):
    out = []
    ym = re.search(r'class="month"><div class="year">(\d{4})</div><a[^>]*>(\d{1,2})</a>', h)
    if ym:
        y, m = int(ym.group(1)), int(ym.group(2))
    seen = set()
    for art in re.findall(r"<article class=\"column[^>]*event-id=.*?</article>", h, re.S):
        eid = re.search(r'event-id="([^"]+)"', art).group(1)
        if eid in seen:
            continue
        seen.add(eid)
        day = re.search(r'class="day">\s*(\d{1,2})', art)
        t = re.search(r'class="title">(.*?)</h3>', art, re.S)
        if not day or not t:
            continue
        try:
            d = datetime.date(y, m, int(day.group(1)))
        except ValueError:
            continue
        if d < today or d > end:
            continue
        title = _one(t.group(1))
        exp = re.search(r'class="exp">(.*?)</p>', art, re.S)
        exp = _one(exp.group(1)) if exp else ""
        hall = re.search(r'class="placeLabel">.*?<span>(.*?)</span>', art, re.S)
        hall = _one(hall.group(1)) if hall else ("WWW X" if 'data-place="www_x"' in art else "WWW")
        link = re.search(r'href="(https://www-shibuya\.jp/schedule/\d+\.php)"', art)
        acts = _dedupe(_split_acts(title, seps=r"\s/\s|／|\s×\s|\s＋\s"))
        if not acts:
            continue
        out.append(_listing(acts, title + (" — " + exp if exp and exp != title else ""), d,
                            "Shibuya " + hall, "Tokyo", "Shibuya",
                            link.group(1) if link else "https://www-shibuya.jp/schedule/", exp if exp != title else ""))
    return out


def collect_www_shibuya(fetch, today):
    _, end = _window(today)
    out, ok = [], 0
    for i, (y, m) in enumerate(_month_starts(today, end)):
        url = "https://www-shibuya.jp/schedule/" if i == 0 else "https://www-shibuya.jp/schedule/%d%02d.php" % (y, m)
        try:
            out += _www_month(fetch(url), y, m, today, end)
            ok += 1
        except Exception:
            pass
    if not ok:
        raise RuntimeError("www-shibuya: every month failed")
    return out


SOURCES = {
    "udo": collect_udo,
    "lnhip": collect_lnhip,
    "liquidroom": collect_liquidroom,
    "www-shibuya": collect_www_shibuya,
}


if __name__ == "__main__":
    # self-test.  usage: sweep_src_promo.py [--live] [source-id ...]
    #   --live      fetch real pages with urllib (test convenience only; the harness normally fetches)
    #   [source-id] restrict to these sources
    import json
    import sys
    import urllib.request

    def _fetch(url):
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (rotation-sweep)"})
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.read().decode("utf-8", "replace")

    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    for sid, fn in SOURCES.items():
        if args and sid not in args:
            continue
        try:
            res = fn(_fetch, datetime.date.today())
        except Exception as e:
            print(sid, "FAILED", repr(e))
            continue
        print("%s: %d listings" % (sid, len(res)))
        for r in res[:3]:
            print("  ", json.dumps(r, ensure_ascii=False))
