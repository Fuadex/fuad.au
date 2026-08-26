"""fill_igdb_keywords.py — IGDB keywords+themes as the tag fallback for games Steam can't
serve (delisted/console-only: the WiC="Warfare" class, 2026-08-27). Only touches games whose
current `tags` are missing or <=3 entries; Steam tags always win where they exist.
Reuses update_igdb auth/search. Writes into cast_data.js / wishlist_cast.js like
update_steam_tags does. Resumable via igdb_kw_cache.json."""
import json, os, re, sys, time
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass
import update_igdb as ug

SD = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(SD, 'igdb_kw_cache.json')
FIELDS = 'name, first_release_date, keywords.name, themes.name, genres.name'

def http_igdb(token, cid, query):
    return ug.http_post('https://api.igdb.com/v4/games',
                        query, {'Client-ID': cid, 'Authorization': f'Bearer {token}'})

def title_year(items_line):
    return items_line

def load_store(path, gname):
    src = open(path, encoding='utf-8').read()
    m = re.match(r'^([\s\S]*?window\.' + gname + r'\s*=\s*)([\s\S]*?);?\s*$', src)
    return m.group(1), json.loads(m.group(2).strip().rstrip(';'))

def games_from(path):
    out = []
    for line in open(path, encoding='utf-8'):
        idm = re.search(r"""\bid"?\s*:\s*['"]([^'"]+)['"]""", line)
        mm = re.search(r"""\bmedium"?\s*:\s*['"]Games['"]""", line)
        if not idm or not mm:
            continue
        tm = (re.search(r"""\btitle"?\s*:\s*'((?:[^'\\]|\\.)*)'""", line)
              or re.search(r'"title":\s*"((?:[^"\\]|\\.)*)"', line))
        em = (re.search(r"""\benTitle"?\s*:\s*'((?:[^'\\]|\\.)*)'""", line)
              or re.search(r'"enTitle":\s*"((?:[^"\\]|\\.)*)"', line))
        if not (em or tm):
            continue
        ym = re.search(r'"?year"?\s*:\s*(\d{4})', line)
        out.append({'id': idm.group(1),
                    'title': re.sub(r'\\(.)', r'\1', (em or tm).group(1)),
                    'year': int(ym.group(1)) if ym else None})
    return out

env = ug.load_env()
token = ug.get_token(env['TWITCH_CLIENT_ID'], env['TWITCH_CLIENT_SECRET'])
cid = env['TWITCH_CLIENT_ID']
cache = json.load(open(CACHE, encoding='utf-8')) if os.path.exists(CACHE) else {}

for store_path, gname, sources in [
    ('cast_data.js', 'CULTURE_CAST', ['data.js', 'imports.js']),
    ('wishlist_cast.js', 'CULTURE_WISHLIST_CAST', ['wishlist.js']),
]:
    header, store = load_store(os.path.join(SD, store_path), gname)
    games = []
    for s in sources:
        games += games_from(os.path.join(SD, s))
    todo = [g for g in games if len((store.get(g['id']) or {}).get('tags') or []) <= 3]
    print(f'{store_path}: {len(games)} games · thin-tagged: {len(todo)}')
    changed = 0
    for g in todo:
        kw = cache.get(g['id'])
        if kw is None:
            esc = g['title'].replace('"', '\\"')
            try:
                res = http_igdb(token, cid, f'search "{esc}"; fields {FIELDS}; limit 5;')
            except Exception as e:
                print('  ! net', g['id'], str(e)[:60]); continue
            best = None
            for r in (res or []):
                if ug.match_score(g['title'], r.get('name', '')) >= 0.6:
                    best = r
                    if g['year'] and r.get('first_release_date'):
                        ry = time.gmtime(r['first_release_date']).tm_year
                        if abs(ry - g['year']) <= 1:
                            break
            kw = []
            if best:
                kw = ([t['name'] for t in best.get('themes', [])]
                      + [k['name'] for k in best.get('keywords', [])][:10])
                # drop junk keywords (hashes, years, platform noise)
                kw = [w.title() for w in kw if 2 < len(w) < 26 and not re.search(r'\d{3}', w)][:12]
            cache[g['id']] = kw
            json.dump(cache, open(CACHE, 'w'), indent=0)
            time.sleep(0.3)
        if not kw:
            continue
        row = store.setdefault(g['id'], {})
        have = [t.lower() for t in (row.get('tags') or [])]
        merged = (row.get('tags') or []) + [w for w in kw if w.lower() not in have]
        if merged != (row.get('tags') or []):
            row['tags'] = merged[:14]
            changed += 1
    open(os.path.join(SD, store_path), 'w', encoding='utf-8').write(header + json.dumps(store) + ';\n')
    print(f'  merged keyword tags into {changed} games')
print('done — bump ?v and check WiC')
