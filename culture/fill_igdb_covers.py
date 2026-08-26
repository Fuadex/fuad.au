"""fill_igdb_covers.py — one-shot: the 10 games with no igdbCover (2026-08-27 amazon-rot
audit) get a real IGDB cover so nothing rides amazon-hosted OMDb art. Same store surgery
as fill_igdb_keywords."""
import json, os, re, sys, time
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass
import update_igdb as ug

SD = os.path.dirname(os.path.abspath(__file__))

# id → hand-curated (IGDB search title, release year); Minesweeper left alone on purpose —
# generic title, wrong-match risk beats a missing cover
PLAN = {
    'twd-game': ('The Walking Dead: Season One', 2012),
    'imp-g-615292': ('Osmos', 2009),
    'imp-g-614464': ('Arma 2', 2009),
    'imp-g-617650': ('Project Freedom', 2004),
    'imp-g-612146': ('Neighbours from Hell 2', 2004),
    'wl-g-798966': ('The Gardens Between', 2018),
    'wl-g-768397': ('ECHO', 2017),
    'wl-g-immortality': ('Immortality', 2022),
    'wl-g-752485': ('The Park', 2015),
}

env = ug.load_env()
token = ug.get_token(env['TWITCH_CLIENT_ID'], env['TWITCH_CLIENT_SECRET'])
cid = env['TWITCH_CLIENT_ID']

def igdb(query):
    return ug.http_post('https://api.igdb.com/v4/games', query,
                        {'Client-ID': cid, 'Authorization': f'Bearer {token}'})

found = {}
for gid, (title, year) in PLAN.items():
    esc = title.replace('"', '\\"')
    res = igdb(f'search "{esc}"; fields name, first_release_date, cover.url; limit 5;')
    best = None
    for r in (res or []):
        if not r.get('cover', {}).get('url'):
            continue
        if ug.match_score(title, r.get('name', '')) < 0.55:
            continue
        ry = time.gmtime(r['first_release_date']).tm_year if r.get('first_release_date') else None
        if year and ry and abs(ry - year) > 2:
            continue
        best = r
        break
    if best:
        u = best['cover']['url']
        u = 'https:' + u if u.startswith('//') else u
        u = u.replace('t_thumb', 't_cover_big')
        found[gid] = u
        print(f'{gid}: {best["name"]} → {u}')
    else:
        print(f'{gid}: NO MATCH ({title})')
    time.sleep(0.3)

for store_path, gname in [('cast_data.js', 'CULTURE_CAST'),
                          ('wishlist_cast.js', 'CULTURE_WISHLIST_CAST')]:
    p = os.path.join(SD, store_path)
    src = open(p, encoding='utf-8').read()
    m = re.match(r'^([\s\S]*?window\.' + gname + r'\s*=\s*)([\s\S]*?);?\s*$', src)
    header, store = m.group(1), json.loads(m.group(2).strip().rstrip(';'))
    n = 0
    for gid, u in found.items():
        if gid in store and not store[gid].get('igdbCover'):
            store[gid]['igdbCover'] = u; n += 1
        elif gid not in store and ((gid.startswith('wl-') ) == (gname == 'CULTURE_WISHLIST_CAST')):
            store[gid] = {'igdbCover': u}; n += 1
    open(p, 'w', encoding='utf-8').write(header + json.dumps(store) + ';\n')
    print(f'{store_path}: +{n} covers')
