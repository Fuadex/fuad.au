#!/usr/bin/env python3
"""Resolve the correct IGDB game for rows whose recorded match is a different product.

Searches by the row's OWN title (never enTitle — enTitle is downstream of the bad match and is how
the error propagated), rejects candidates whose name carries a different-product token, and scores
what is left on name similarity plus release-year proximity. Prints candidates for review; writes
igdb_overrides.json only with --write.
"""
import json, os, re, sys, time, difflib
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fuad.au', 'culture'))
import update_igdb as ug

HERE = os.path.dirname(os.path.abspath(__file__))
CULT = os.path.join(HERE, 'fuad.au', 'culture')
WRONG = os.path.join(HERE, '.dtmp', 'igdb_wrong.json')
OUT = os.path.join(CULT, 'igdb_overrides.json')
WRITE = '--write' in sys.argv

# false positives from the token scan: the match name equals the row title
SKIP = {'imp-g-607374', 'imp-g-738244'}

PRODUCT = re.compile(
    r'\b(dlc|expansion|pack|bundle|season pass|skin|add[- ]?on|override|demo|beta|pachi|slot|'
    r'pinball machine|jade|batuu|ultimate team|road to fifa|uefa|euro \d|episode \d|'
    r'goty|game of the year|soundtrack|artbook|pre-?order|'
    # ANY edition, not just deluxe — "Biohazard 5: Limited Edition" outscored "Resident Evil 5"
    # on the Japanese row title and would have shipped as the match.
    r'(deluxe|limited|collector\'?s|special|complete|definitive|anniversary|gold|premium) edition|'
    r'hd remaster|remastered)\b', re.I)

# Rows the search cannot reach on the row title alone, resolved by hand against the museum-grade
# source (the row's own filmweb link and the corrected enTitle). Kept explicit so they are auditable.
MANUAL = {
    'imp-g-606961': (847, 'Resident Evil 5'),          # row is the Japanese title "Biohazard 5"
    # the SEASON, not "Episode 1: A New Day". VERIFIED against the API — my first hand-picked id
    # (1717) turned out to be Mega Man 4, so every manual id here is checked before it ships.
    'twd-game': (1871, 'The Walking Dead'),
}

def norm(s):
    s = (s or '').lower()
    s = s.replace('&', 'and')
    s = re.sub(r"[''`]", "'", s)
    s = re.sub(r'\b(the|a|an)\b', ' ', s)
    s = re.sub(r'[^a-z0-9]+', ' ', s)
    return ' '.join(s.split())

ROM = {'i': '1', 'ii': '2', 'iii': '3', 'iv': '4', 'v': '5', 'vi': '6',
       'vii': '7', 'viii': '8', 'ix': '9', 'x': '10'}
def key(s):
    return ' '.join(ROM.get(w, w) for w in norm(s).split())

def main():
    env = ug.load_env()
    cid, secret = env.get('TWITCH_CLIENT_ID', ''), env.get('TWITCH_CLIENT_SECRET', '')
    if not cid or not secret:
        print('ERROR: twitch credentials missing'); sys.exit(1)
    token = ug.get_token(cid, secret)
    headers = {'Client-ID': cid, 'Authorization': 'Bearer ' + token}

    rows = [r for r in json.load(open(WRONG, encoding='utf-8')) if r['id'] not in SKIP]
    print('resolving %d rows\n' % len(rows))

    overrides, unresolved = {}, []
    for r in rows:
        if r['id'] in MANUAL:
            gid, name = MANUAL[r['id']]
            overrides[r['id']] = gid
            print('%s  %s (%s)\n    was: %s [%s]\n    -> MANUAL %s  %s\n' %
                  (r['id'], r['title'], r.get('year'), r.get('was'), r.get('wasId'), gid, name))
            continue
        q = 'search "%s"; fields id,name,first_release_date,category,parent_game; limit 25;' % \
            r['title'].replace('"', '\\"')
        res = ug.http_post('https://api.igdb.com/v4/games', q, headers) or []
        want, wy = key(r['title']), r.get('year')
        best, scored = None, []
        for c in res:
            name = c.get('name') or ''
            if PRODUCT.search(name):
                continue
            # category 0 = main game; anything else is dlc/expansion/bundle/port etc.
            if c.get('category') not in (0, None):
                continue
            s = difflib.SequenceMatcher(None, want, key(name)).ratio()
            yr = None
            if c.get('first_release_date'):
                yr = time.gmtime(int(c['first_release_date'])).tm_year
                if wy:
                    d = abs(yr - int(wy))
                    s += 0.18 if d == 0 else (0.08 if d == 1 else (-0.30 if d > 3 else 0))
            if key(name) == want:
                s += 0.35
            scored.append((s, c.get('id'), name, yr))
        scored.sort(reverse=True)
        print('%s  %s (%s)' % (r['id'], r['title'], r.get('year')))
        print('    was: %s [%s]' % (r.get('was'), r.get('wasId')))
        if not scored:
            print('    -> NO ACCEPTABLE CANDIDATE'); unresolved.append(r['id']); print(); continue
        for s, gid, name, yr in scored[:3]:
            print('      %.2f  %-8s %s (%s)' % (s, gid, name, yr))
        s, gid, name, yr = scored[0]
        if s < 0.60:
            print('    -> TOO WEAK (%.2f), leaving for manual' % s); unresolved.append(r['id'])
        else:
            overrides[r['id']] = gid
            print('    -> CHOSE %s  %s' % (gid, name))
        print()
        time.sleep(0.25)

    print('resolved %d | unresolved %d %s' % (len(overrides), len(unresolved), unresolved))
    if WRITE:
        existing = {}
        if os.path.exists(OUT):
            existing = json.load(open(OUT, encoding='utf-8'))
        existing.update({k: v for k, v in overrides.items()})
        json.dump(existing, open(OUT, 'w', encoding='utf-8'), indent=2, ensure_ascii=False)
        print('wrote %s (%d entries)' % (OUT, len(existing)))
    else:
        print('(dry run — pass --write to create igdb_overrides.json)')

if __name__ == '__main__':
    main()
