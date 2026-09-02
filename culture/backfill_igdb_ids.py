#!/usr/bin/env python3
"""backfill_igdb_ids.py — recover the IGDB match identity for game rows enriched before
update_igdb.py persisted it.

WHY RECOVERY AND NOT RE-SEARCH: re-running the fuzzy search would just re-derive whatever match
the original run made, including the wrong ones, and we would have no way to tell which rows had
changed hands. Instead we work backwards from the payload already on disk: every igdbCover URL
embeds IGDB's own cover image_id, and IGDB can be queried by it. That returns the EXACT game whose
cover we are shipping — the real match, right or wrong — which is precisely what an audit needs.

Cost is ~4 batched API calls, not one per row: IGDB accepts `where image_id = (a,b,c)` lists.

Writes igdbId + igdbName into cast_data.js. Run with --dry to see the plan without writing.
"""
import json, os, re, sys, time
import update_igdb as ug

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CAST_JS = os.path.join(SCRIPT_DIR, 'cast_data.js')
DRY = '--dry' in sys.argv
CHUNK = 200

IGDB_COVERS = 'https://api.igdb.com/v4/covers'
IGDB_GAMES = 'https://api.igdb.com/v4/games'


def load_js_obj(path, var):
    content = open(path, encoding='utf-8').read()
    m = re.search(r'window\.' + var + r'\s*=\s*(\{[\s\S]*\});', content)
    return json.loads(m.group(1)) if m else {}


def game_ids_from_data():
    """Ids of every row with medium Games, from data.js and imports.js."""
    ids = []
    for fn in ('data.js', 'imports.js'):
        for line in open(os.path.join(SCRIPT_DIR, fn), encoding='utf-8'):
            if '"Games"' not in line and "'Games'" not in line:
                continue
            m = re.search(r'"?id"?\s*:\s*[\'"]([^\'"]+)[\'"]', line)
            if m:
                ids.append(m.group(1))
    return ids


def chunked(seq, n):
    for i in range(0, len(seq), n):
        yield seq[i:i + n]


def main():
    env = ug.load_env()
    cid = env.get('TWITCH_CLIENT_ID', '')
    secret = env.get('TWITCH_CLIENT_SECRET', '')
    if not cid or not secret:
        print('ERROR: TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET missing from .env')
        sys.exit(1)

    cast = load_js_obj(CAST_JS, 'CULTURE_CAST')
    game_ids = game_ids_from_data()

    # image_id -> [item ids]  (a cover can legitimately be shared by two rows of the same game)
    by_image = {}
    no_cover = []
    already = 0
    for iid in game_ids:
        e = cast.get(iid)
        if not e:
            continue
        if e.get('igdbId'):
            already += 1
            continue
        cover = e.get('igdbCover') or ''
        m = re.search(r'/([a-z0-9]+)\.jpg', cover)
        if m:
            by_image.setdefault(m.group(1), []).append(iid)
        else:
            no_cover.append(iid)

    print(f'game rows: {len(game_ids)} | already identified: {already} | '
          f'recoverable by cover: {sum(len(v) for v in by_image.values())} '
          f'({len(by_image)} distinct covers) | no cover: {len(no_cover)}')
    if no_cover:
        print('  no cover (needs manual identification): ' + ', '.join(no_cover))
    if DRY:
        print('\n--dry: no API calls made, nothing written.')
        return

    token = ug.get_token(cid, secret)
    headers = {'Client-ID': cid, 'Authorization': f'Bearer {token}'}

    # 1. covers -> game id
    image_to_game = {}
    keys = sorted(by_image)
    for batch in chunked(keys, CHUNK):
        lst = ','.join('"%s"' % k for k in batch)
        q = f'fields game, image_id; where image_id = ({lst}); limit {CHUNK};'
        res = ug.http_post(IGDB_COVERS, q, headers) or []
        for r in res:
            if r.get('image_id') and r.get('game'):
                image_to_game[r['image_id']] = r['game']
        print(f'  covers batch {len(batch)} -> {len(res)} resolved')
        time.sleep(0.3)

    # 2. game id -> name
    gids = sorted(set(image_to_game.values()))
    id_to_name = {}
    for batch in chunked(gids, CHUNK):
        lst = ','.join(str(g) for g in batch)
        q = f'fields id, name; where id = ({lst}); limit {CHUNK};'
        res = ug.http_post(IGDB_GAMES, q, headers) or []
        for r in res:
            if r.get('id') and r.get('name'):
                id_to_name[r['id']] = r['name']
        print(f'  games batch {len(batch)} -> {len(res)} named')
        time.sleep(0.3)

    # 3. write back
    written, unresolved = 0, []
    report = []
    for image_id, item_ids in by_image.items():
        gid = image_to_game.get(image_id)
        if not gid:
            unresolved.extend(item_ids)
            continue
        name = id_to_name.get(gid)
        for iid in item_ids:
            cast[iid]['igdbId'] = gid
            if name:
                cast[iid]['igdbName'] = name
            written += 1
            report.append((iid, gid, name))

    print(f'\nidentified {written} rows | unresolved {len(unresolved)}')
    if unresolved:
        print('  unresolved: ' + ', '.join(unresolved[:20]))

    if not DRY:
        with open(CAST_JS, 'w', encoding='utf-8') as f:
            f.write('// cast_data.js — generated by update_cast.py / update_igdb.py. Do not edit by hand.\n')
            f.write('// Re-run: python update_cast.py  /  python update_igdb.py\n')
            f.write('window.CULTURE_CAST = ')
            f.write(json.dumps(cast, indent=2, ensure_ascii=False))
            f.write(';\n')
        print(f'wrote {CAST_JS}')

    with open(os.path.join(SCRIPT_DIR, 'igdb_identity_report.txt'), 'w', encoding='utf-8') as f:
        for iid, gid, name in sorted(report):
            f.write(f'{iid}\t{gid}\t{name}\n')
    print('wrote igdb_identity_report.txt')


if __name__ == '__main__':
    main()
