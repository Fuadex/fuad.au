# sweep_src_live.py — parsers for FEVER, Shibuya O (4 halls), LOFT/SHELTER, CLUB Que, TOOS (BASEMENTBAR + THREE)
import datetime
import html as _html
import re
import sys
from urllib.parse import quote, urljoin

# ----------------------------------------------------------------- helpers

_TAG = re.compile(r"<[^>]+>")
_WS = re.compile(r"[ \t　\xa0]+")

# prefix noise on an act string
_PREFIX = re.compile(
    r"^\s*(?:special\s+guest|opening\s+guest|open\s+act|guest|live|dj|vj|o\.?\s?a|act|w/)\s*[:：＞>/]\s*",
    re.I)
# instrument label in front of a member name: "Gt.JOHN", "Vo:KIRITO"
_INSTR_LEAD = re.compile(
    r"^\s*(?:Vo|Gt|Gu|Ba|Dr|Key|Cho|Sax|Tp|Tb|Pf|Vn|Per|Mani)\s*[.:：]\s*(?=\S)", re.I)
# trailing member-of-band annotation: "(Dr / LOSALIOS)", "(drums)", "（Gt）"
_INSTR_TRAIL = re.compile(
    r"\s*[（(]\s*(?:Vo|Gt|Gu|Ba|Dr|Key|Cho|Sax|Tp|Tb|Pf|Vn|Per|drums?|bass|guitar|vocals?|keys?|"
    r"keyboards?|piano|sax)\b[^)）]*[)）]\s*$", re.I)
_NOISE_TAIL = re.compile(
    r"\s*(?:-\s*one\s*man\s*-|-oneman-|[\[（(]\s*BAND(?:\s*SET)?\s*[\]）)])\s*$", re.I)
_JUNK = re.compile(
    r"^(?:and\s+more.*|and\s+tba|tba|etc\.?|他|ほか|and\s+others|\.{2,}|…+|\.\.\.)$", re.I)


def _clean(s):
    s = re.sub(r"<br\s*/?>", " ", s or "", flags=re.I)
    s = _TAG.sub("", s)
    s = _html.unescape(s)
    return _WS.sub(" ", s).strip()


def _act(s):
    """Normalise one act string; returns '' when it should be dropped."""
    s = _clean(s)
    for _ in range(2):
        s = _PREFIX.sub("", s)
    s = _INSTR_LEAD.sub("", s)
    s = _INSTR_TRAIL.sub("", s)
    s = _NOISE_TAIL.sub("", s)
    s = re.sub(r"\s*\[[^\]]*\]\s*$", "", s)  # trailing [member, member] list
    s = s.strip(" /／｜|,、")
    if not s or _JUNK.match(s):
        return ""
    return s


def _acts(items):
    out, seen = [], set()
    for it in items:
        a = _act(it)
        if a and a not in seen:
            seen.add(a)
            out.append(a)
    return out


def _months(today, days=120):
    end = today + datetime.timedelta(days=days)
    y, m = today.year, today.month
    while (y, m) <= (end.year, end.month):
        yield y, m
        m += 1
        if m > 12:
            y, m = y + 1, 1


def _in_window(d, today, days=120):
    return today <= d <= today + datetime.timedelta(days=days)


def _split_depth(s, seps=",、"):
    """Split on separators that are outside any brackets."""
    out, buf, depth = [], [], 0
    for ch in s:
        if ch in "([（［【":
            depth += 1
        elif ch in ")]）］】":
            depth = max(0, depth - 1)
        if ch in seps and depth == 0:
            out.append("".join(buf))
            buf = []
        else:
            buf.append(ch)
    out.append("".join(buf))
    return [x.strip() for x in out if x.strip()]


def _mk(acts, title, d, venue, area, url, note="", until=None):
    row = {"acts": acts, "title": title, "date": d.isoformat(), "venue": venue,
           "city": "Tokyo", "area": area, "url": url, "note": note}
    if until and until != d:
        row["until"] = until.isoformat()
    return row


# ----------------------------------------------------------------- FEVER

_FV_SKIP_HDR = re.compile(
    r"sound|light|draw|print|flyer|design|photo|pa\b|照明|音響|映像|写真|装花|フード|food|mc\b|illust|イラスト|"
    r"band\s*member|member|support|サポート", re.I)


def _fever_acts(h3):
    paras = re.findall(r"<p[^>]*>(.*?)</p>", h3, re.S)
    items = []
    for idx, p in enumerate(paras):
        lines = [_clean(x) for x in re.split(r"<br\s*/?>", p)]
        lines = [x for x in lines if x]
        if not lines:
            continue
        hdr = re.match(r"^[＜<](.*?)[＞>]\s*(.*)$", lines[0])
        if hdr:
            if _FV_SKIP_HDR.search(hdr.group(1)):
                continue
            rest = [hdr.group(2)] if hdr.group(2) else []
            lines = rest + lines[1:]
        elif idx > 0:
            continue  # unlabeled later paragraphs are credits / member lists
        items.extend(lines)
    return _acts(items)


def collect_fever(fetch, today):
    out, seen = [], set()
    for y, m in _months(today):
        url = f"https://www.fever-popo.com/schedule/{y}/{m:02d}/"
        try:
            t = fetch(url)
        except Exception as e:  # noqa: BLE001
            print(f"fever {y}-{m:02d}: {e}", file=sys.stderr)
            continue
        out.extend(_parse_fever(t, today, seen))
    return out


def _parse_fever(t, today, seen=None):
    seen = seen if seen is not None else set()
    out = []
    for blk in re.split(r'<div id="entry-\d+"', t)[1:]:
        h2 = re.search(r'<h2 class="eventtitle">(.*?)</h2>', blk, re.S)
        if not h2:
            continue
        head = _clean(h2.group(1))
        dm = re.match(r"(\d{2})\.(\d{2})\.(\d{2})\s*(?:\([^)]*\))?\s*(.*)$", head)
        if not dm:
            continue
        try:
            d = datetime.date(2000 + int(dm.group(1)), int(dm.group(2)), int(dm.group(3)))
        except ValueError:
            continue
        if not _in_window(d, today):
            continue
        title = dm.group(4).strip()
        h3 = re.search(r"<h3>(.*?)</h3>", blk, re.S)
        acts = _fever_acts(h3.group(1)) if h3 else []
        if not acts and title:
            acts = [title]
        if not acts:
            continue
        u = re.search(r'property="og:url" content="([^"]+)"', blk)
        url = u.group(1) if u else f"https://www.fever-popo.com/schedule/{d.year}/{d.month:02d}/"
        op = re.search(r"OPEN\s*[\d:]+\s*/\s*START\s*[\d:]+", blk)
        key = (d, url, title)
        if key in seen:
            continue
        seen.add(key)
        out.append(_mk(acts, title, d, "Shindaita FEVER", "Shindaita", url, op.group(0) if op else ""))
    return out


# ----------------------------------------------------------------- Shibuya O

_O_HALLS = [("east", "Spotify O-EAST"), ("west", "Spotify O-WEST"),
            ("nest", "Spotify O-nest"), ("crest", "Spotify O-Crest")]


_CREDIT = re.compile(r"^(?:sound|light|lighting|coffee|graphic|paint|food|design|photo|pa|visual|vj|flyer)\s*[:：]", re.I)


def _o_items(raw):
    """One artist <li> may hold several ' / '-joined acts (split outside brackets only)."""
    s = _clean(raw)
    parts = _split_depth(s, "／") if "／" in s else [s]
    out = []
    for p in parts:
        out.extend(_split_depth_str(p, " / "))
    return [p for p in out if not p.lstrip().startswith("【") and not _CREDIT.match(p.strip())]


def _split_depth_str(s, sep):
    out, buf, depth, i = [], [], 0, 0
    while i < len(s):
        ch = s[i]
        if ch in "([（［":
            depth += 1
        elif ch in ")]）］":
            depth = max(0, depth - 1)
        if depth == 0 and s.startswith(sep, i):
            out.append("".join(buf))
            buf = []
            i += len(sep)
            continue
        buf.append(ch)
        i += 1
    out.append("".join(buf))
    return [x.strip() for x in out if x.strip()]


def _parse_shibuya_o(t, y, m, venue, today):
    out = []
    for c in t.split('<div class="p-scheduled-card ')[1:]:
        dm = re.search(r'date-item">\s*(\d{1,2})\s*/\s*(\d{1,2})', c)
        if not dm:
            continue
        mo, da = int(dm.group(1)), int(dm.group(2))
        yy = y + 1 if (mo < m - 6) else (y - 1 if mo > m + 6 else y)
        try:
            d = datetime.date(yy, mo, da)
        except ValueError:
            continue
        if not _in_window(d, today):
            continue
        parts = [_clean(x) for x in re.findall(
            r'class="p-scheduled-card__title-(?:top|main|bottom)">(.*?)</span>', c, re.S)]
        title = " ".join(p for p in parts if p)
        items = []
        for li in re.findall(r'p-scheduled-card__artist-item">(.*?)</li>', c, re.S):
            items.extend(_o_items(li))
        acts = _acts(items) or ([title] if title else [])
        if not acts:
            continue
        u = re.search(r'<a href="([^"]+)"', c)
        url = u.group(1) if u else ""
        op = re.search(r'date-open">\s*(.*?)\s*</span>', c, re.S)
        note = _clean(op.group(1)) if op else ""
        if "p-scheduled-card__soldout" in c:
            note = (note + " SOLD OUT").strip()
        out.append(_mk(acts, title, d, venue, "Shibuya", url, note))
    return out


def collect_shibuya_o(fetch, today):
    out, seen, errs, ok = [], set(), 0, 0
    for hall, venue in _O_HALLS:
        for y, m in _months(today):
            url = f"https://shibuya-o.com/{hall}/schedule/?y={y}&m={m}"
            try:
                t = fetch(url)
            except Exception as e:  # noqa: BLE001
                errs += 1
                print(f"shibuya-o {hall} {y}-{m:02d}: {e}", file=sys.stderr)
                continue
            ok += 1
            for r in _parse_shibuya_o(t, y, m, venue, today):
                k = (r["date"], r["venue"], r["url"], r["title"])
                if k not in seen:
                    seen.add(k)
                    out.append(r)
    if not ok:
        raise RuntimeError("shibuya-o: no page fetched")
    return out


# ----------------------------------------------------------------- LOFT / SHELTER

_LOFT_TRUNC = re.compile(r"^(?:\.{2,}|…+|and\s+more.*|ほか.*|他)$", re.I)
_LOFT_HDR = re.compile(
    r"^(?:DJ|LIVE|GUEST|SPECIAL\s*GUEST|O\.?A\.?|OPEN\s*ACT|VJ|ACT|FOOD|BAND|出演|and\s+more.*)\s*[:：]?$", re.I)
_LOFT_BAD_LINE = re.compile(
    r"^(?:[【■●▼◆※★☆▲▽◇□\[]|OPEN\b|START\b|ADV|DOOR|TICKET|前売|当日|チケット|開場|開演|料金|"
    r"会場|主催|お問い?合わ?せ|出演者|NEW|\d{1,2}[/月]\d)|https?:|[¥￥]", re.I)


def _loft_detail_acts(t):
    m = re.search(r'<div class="entry">(.*)', t, re.S)
    if not m:
        return []
    body = m.group(1)
    body = re.sub(r"<div class='wp_social_bookmarking_light'>.*?</div></div>", "", body, flags=re.S)
    cut = re.search(r"<dl>|<ul class=\"tag\">|<div class=\"share\">", body)
    if cut:
        body = body[:cut.start()]
    items = []
    for p in re.findall(r"<p[^>]*>(.*?)</p>", body, re.S):
        for line in re.split(r"<br\s*/?>|\n", p):
            line = _clean(line)
            if not line or _LOFT_HDR.match(line) or _LOFT_BAD_LINE.match(line) or len(line) > 60:
                continue
            items.append(line)
    return _acts(items)


def _parse_loft_list(t, base, venue, area, today):
    out = []
    for c in t.split('<div class="column')[1:]:
        dm = re.search(r'class="year">(\d{4})</div>\s*<div class="month">(\d+)</div>\s*<div class="day">(\d+)</div>', c)
        if not dm:
            continue
        try:
            d = datetime.date(int(dm.group(1)), int(dm.group(2)), int(dm.group(3)))
        except ValueError:
            continue
        if not _in_window(d, today):
            continue
        u = re.search(r'<a href="([^"]+)"', c)
        url = u.group(1) if u else base
        tt = re.search(r'class="c_title"><span>(.*?)</span>', c, re.S)
        title = _clean(tt.group(1)) if tt else ""
        lis = [_clean(x) for x in re.findall(r"<li>(.*?)</li>", re.search(r'<ul class="artist_tag">(.*?)</ul>', c, re.S).group(1), re.S)] \
            if re.search(r'<ul class="artist_tag">', c) else []
        truncated = bool(lis) and (bool(_LOFT_TRUNC.match(lis[-1])) or any("ほか" in x for x in lis))
        acts = _acts(lis)
        op = re.search(r'class="open">\s*(.*?)\s*</div>', c, re.S)
        row = _mk(acts, title, d, venue, area, url, _clean(op.group(1)) if op else "")
        row["_trunc"] = truncated
        out.append(row)
    return out


def collect_loft_shelter(fetch, today):
    halls = [("loft", "Shinjuku LOFT", "Shinjuku"), ("shelter", "Shimokitazawa SHELTER", "Shimokitazawa")]
    rows, ok = [], 0
    for slug, venue, area in halls:
        for y, m in _months(today):
            url = f"https://www.loft-prj.co.jp/schedule/{slug}/schedule?scheduleyear={y}&schedulemonth={m}"
            try:
                t = fetch(url)
            except Exception as e:  # noqa: BLE001
                print(f"loft-shelter {slug} {y}-{m:02d}: {e}", file=sys.stderr)
                continue
            ok += 1
            rows.extend(_parse_loft_list(t, url, venue, area, today))
    if not ok:
        raise RuntimeError("loft-shelter: no page fetched")
    # detail fetches for truncated bills: cap 15, prefer bills already showing >=3 acts
    cand = [r for r in rows if r.pop("_trunc", False) and "/schedule/" in r["url"]]
    cand.sort(key=lambda r: (len(r["acts"]) < 3, -len(r["acts"]), r["date"]))
    for r in cand[:15]:
        try:
            full = _loft_detail_acts(fetch(r["url"]))
        except Exception as e:  # noqa: BLE001
            print(f"loft detail {r['url']}: {e}", file=sys.stderr)
            continue
        if len(full) > len(r["acts"]):
            r["acts"] = full
    for r in rows:
        r.pop("_trunc", None)
        if not r["acts"]:
            r["acts"] = [r["title"]] if r["title"] else []
    rows = [r for r in rows if r["acts"]]
    seen, out = set(), []
    for r in rows:
        k = (r["date"], r["venue"], r["url"])
        if k not in seen:
            seen.add(k)
            out.append(r)
    return out


# ----------------------------------------------------------------- CLUB Que

_QUE_LABEL = re.compile(
    r"^\s*(?:special\s*guest|opening\s*guest|guest|live|dj|vj|o\.?\s?a|open\s*act|food)\s*[＞>:：]\s*(.*)$", re.I)


def _parse_que(t, today):
    out = []
    for aid, a in re.findall(r'<article id="entry(\d+)">(.*?)</article>', t, re.S):
        try:
            d = datetime.date(int(aid[0:4]), int(aid[4:6]), int(aid[6:8]))
            until = None
            if len(aid) == 10:  # multi-day entry: entryYYYYMMDDDD (last two = end day)
                until = d.replace(day=int(aid[8:10]))
        except ValueError:
            continue
        end = until or d
        if end < today or d > today + datetime.timedelta(days=120):
            continue
        txt = re.search(r'<div class="text">(.*?)</div>', a, re.S)
        if not txt:
            continue
        tx = txt.group(1)
        h2 = re.search(r"<h2[^>]*>(.*?)</h2>", tx, re.S)
        ps = [(_html.unescape(_TAG.sub("", re.sub(r"<br\s*/?>", "\n", p)))).strip()
              for p in re.findall(r"<p[^>]*>(.*?)</p>", tx, re.S)]
        title = ""
        if ps:
            title = re.sub(r"^[“\"]|[”\"]$", "", _clean(ps[0]).strip())
        items = []
        if h2:
            h = _clean(h2.group(1))
            h = re.sub(r"【SOLD OUT】|\[SOLD OUT\]", "", h, flags=re.I)
            items.extend(re.split(r"[｜|]", h))
        for p in ps[1:]:
            for line in p.split("\n"):
                m = _QUE_LABEL.match(line)
                if m:
                    items.extend(_split_depth(m.group(1)))
        acts = [x for x in _acts(items) if x not in ("あり",)]
        if not acts and title:
            acts = [title]
        if not acts:
            continue
        u = re.search(r'<a href="([^"]+)"', a)
        url = u.group(1) if u else "https://clubque.net/schedule/"
        note = "SOLD OUT" if re.search(r"SOLD OUT", a, re.I) else ""
        out.append(_mk(acts, title, d, "Shimokitazawa CLUB Que", "Shimokitazawa", url, note, until))
    return out


def collect_clubque(fetch, today):
    out, seen, ok = [], set(), 0
    for y, m in _months(today):
        url = f"https://clubque.net/schedule/date/{y}/{m:02d}"
        try:
            t = fetch(url)
        except Exception as e:  # noqa: BLE001
            print(f"clubque {y}-{m:02d}: {e}", file=sys.stderr)
            continue
        ok += 1
        for r in _parse_que(t, today):
            k = (r["date"], r["url"])
            if k not in seen:
                seen.add(k)
                out.append(r)
    if not ok:
        raise RuntimeError("clubque: no page fetched")
    return out


# ----------------------------------------------------------------- TOOS

_TOOS_VENUES = [("basementbar", "Shimokitazawa BASEMENTBAR"), ("3", "Shimokitazawa THREE")]
_TOOS_LABEL_SKIP = re.compile(r"^(?:OPEN|START|ADV|DOOR|TICKET|チケット)", re.I)


def _toos_performers(block):
    """Lines of <p> entries (labels like ACT / LIVE / DJ are <strong> paragraphs)."""
    items = []
    for p in re.findall(r"<p[^>]*>(.*?)</p>", block, re.S):
        if re.fullmatch(r"\s*<strong>.*?</strong>\s*", p, re.S):
            continue
        for line in re.split(r"<br\s*/?>", p):
            line = _clean(line)
            if line and not _TOOS_LABEL_SKIP.match(line):
                items.append(line)
    return items


def _toos_cards(t):
    """Cards on a venue home page / day page: {url: row-ish dict}."""
    res = []
    for c in re.findall(r'<article class="cb-card[^"]*"[^>]*>.*?</article>', t, re.S):
        u = re.search(r'class="cb-card-link" href="([^"]+)"', c)
        dm = re.search(r'datetime="(\d{4}-\d{2}-\d{2})"', c)
        pf = re.search(r'<div class="cb-card-performers">(.*?)</div>', c, re.S)
        if not (u and dm):
            continue
        tb = re.search(r'cb-card-title_before">(.*?)</div>', c, re.S)
        dt = re.search(r'cb-card-(?:display_title|title)">(.*?)</div>', c, re.S)
        title = " ".join(x for x in [_clean(tb.group(1)) if tb else "", _clean(dt.group(1)) if dt else ""] if x)
        res.append({"url": _html.unescape(u.group(1)), "date": dm.group(1), "title": title,
                    "perf": _toos_performers(pf.group(1)) if pf else []})
    return res


def _toos_event_page(t):
    h1 = re.search(r'<h1 id="toos-event-title">(.*?)</h1>', t, re.S)
    dm = re.search(r'toos-event__date-mark" datetime="(\d{4}-\d{2}-\d{2})"', t)
    pf = re.search(r'<section class="toos-event__performers"[^>]*>(.*?)</section>', t, re.S)
    op = re.search(r"OPEN\s*[\d:]+\s*[／/]\s*START\s*[\d:]+", t)
    return {"title": _clean(h1.group(1)) if h1 else "",
            "date": dm.group(1) if dm else "",
            "perf": _toos_performers(pf.group(1)) if pf else [],
            "note": op.group(0) if op else ""}


def _toos_row(card, venue, today):
    try:
        d = datetime.date.fromisoformat(card["date"])
    except ValueError:
        return None
    if not _in_window(d, today):
        return None
    acts = _acts(card["perf"])
    title = card["title"]
    if not acts and title:
        acts = [title]
    if not acts:
        return None
    if not title:
        title = " / ".join(acts[:3])
    return _mk(acts, title, d, venue, "Shimokitazawa", card["url"], card.get("note", ""))


def collect_toos(fetch, today):
    out, seen, ok = [], set(), 0
    for slug, venue in _TOOS_VENUES:
        base = f"https://toos.co.jp/{slug}/"
        known = {}
        todo = []  # (url, fallback-date)

        def absorb(t):
            for c in _toos_cards(t):
                known.setdefault(c["url"], c)

        try:
            home = fetch(base)
            ok += 1
            absorb(home)
        except Exception as e:  # noqa: BLE001
            print(f"toos {slug} home: {e}", file=sys.stderr)
        for y, m in _months(today):
            try:
                t = fetch(f"{base}?cb_month={y}-{m:02d}")
            except Exception as e:  # noqa: BLE001
                print(f"toos {slug} {y}-{m:02d}: {e}", file=sys.stderr)
                continue
            ok += 1
            absorb(t)
            for label, href in re.findall(r'<a class="has-events" aria-label="([^"]*)" href="([^"]+)"', t):
                dm = re.match(r"(\d{4})年(\d+)月(\d+)日", label)
                if not dm or (int(dm.group(1)), int(dm.group(2))) != (y, m):
                    continue  # calendar clamped to another month
                try:
                    d = datetime.date(y, m, int(dm.group(3)))
                except ValueError:
                    continue
                if _in_window(d, today):
                    todo.append((_html.unescape(href), d))
        fetched = set()
        for href, d in todo:
            if href in fetched:
                continue
            fetched.add(href)
            if "calabash_day=" in href:
                try:
                    absorb(fetch(href))
                except Exception as e:  # noqa: BLE001
                    print(f"toos day {href}: {e}", file=sys.stderr)
            elif href not in known:
                try:
                    ev = _toos_event_page(fetch(href))
                except Exception as e:  # noqa: BLE001
                    print(f"toos event {href}: {e}", file=sys.stderr)
                    continue
                ev["url"] = href
                ev["date"] = ev["date"] or d.isoformat()
                known[href] = ev
        for c in known.values():
            r = _toos_row(c, venue, today)
            if r:
                k = (r["date"], r["url"])
                if k not in seen:
                    seen.add(k)
                    out.append(r)
    if not ok:
        raise RuntimeError("toos: no page fetched")
    return out


SOURCES = {
    "fever": collect_fever,
    "shibuya-o": collect_shibuya_o,
    "loft-shelter": collect_loft_shelter,
    "clubque": collect_clubque,
    "toos": collect_toos,
}


if __name__ == "__main__":
    # self-test: argv = file paths; the parser is chosen by content. Use "--live" to run all
    # collectors over the network with urllib (self-test only; the harness supplies fetch in prod).
    import json
    import subprocess

    def _show(name, rows):
        print(f"{name}: {len(rows)} listings")
        for r in rows[:3]:
            print("  ", json.dumps(r, ensure_ascii=False)[:400])

    args = sys.argv[1:]
    if args and args[0] == "--live":
        def fetch(url):
            p = subprocess.run(["curl", "-sL", "--max-time", "25", "-f", url],
                               capture_output=True)
            if p.returncode:
                raise RuntimeError(f"curl {p.returncode} {url}")
            return p.stdout.decode("utf-8", "replace")
        today = datetime.date.today()
        for sid in (args[1:] or SOURCES):
            try:
                _show(sid, SOURCES[sid](fetch, today))
            except Exception as e:  # noqa: BLE001
                print(sid, "FAILED", e)
    else:
        today = datetime.date(2026, 11, 5)
        for pth in args:
            t = open(pth, encoding="utf-8", errors="replace").read()
            if "fever-popo" in t and "eventtitle" in t:
                _show(pth, _parse_fever(t, today))
            elif "p-scheduled-card" in t:
                _show(pth, _parse_shibuya_o(t, 2026, 12, "Spotify O-?", today))
            elif 'class="artist_tag"' in t:
                _show(pth, _parse_loft_list(t, pth, "LOFT-ish", "?", today))
            elif "schedule-list__list" in t:
                _show(pth, _parse_que(t, today))
            elif "cb-card" in t:
                print(pth, [ _toos_row(c, "BB", today) for c in _toos_cards(t)][:3])
