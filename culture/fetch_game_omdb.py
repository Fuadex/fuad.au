"""fetch_game_omdb.py — OMDb payloads for GAMES (Fuad 2026-08-26: IMDb game plots read far
better than IGDB database-ese; Reader source order already prefers IMDb when present).
update_omdb.py excludes the Games medium by design, so this companion fills the same
omdb_cache.json keyed by item id, via the tt ids in game_imdb.js. Then rebuild the overlay:
`python update_omdb.py --emit-only`. Resumable; respects the shared daily quota."""
import json, os, re, sys, time, urllib.request

sys.stdout.reconfigure(encoding='utf-8')
SD = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(SD, 'omdb_cache.json')
key = [l.split('=', 1)[1].strip() for l in open(os.path.join(SD, '.env')) if l.startswith('OMDB_API_KEY')][0]

gi = open(os.path.join(SD, 'game_imdb.js'), encoding='utf-8').read()
tts = dict(re.findall(r'"([^"]+)":\s*"(tt\d+)"', gi))
cache = json.load(open(CACHE, encoding='utf-8'))

todo = [(gid, tt) for gid, tt in tts.items() if gid not in cache]
print(f'games with tt: {len(tts)} · cached: {len(tts) - len(todo)} · to fetch: {len(todo)}')

ok = miss = 0
for n, (gid, tt) in enumerate(todo, 1):
    try:
        d = json.load(urllib.request.urlopen(
            f'https://www.omdbapi.com/?apikey={key}&i={tt}&plot=full', timeout=20))
    except Exception:
        d = None
    if d and d.get('Response') == 'True':
        cache[gid] = d
        ok += 1
    else:
        cache[gid] = {'Response': 'False', '_q': tt, '_game': True}
        miss += 1
    if n % 25 == 0:
        json.dump(cache, open(CACHE, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print(f'  {n}/{len(todo)} ok={ok} miss={miss}', flush=True)
    time.sleep(0.15)

json.dump(cache, open(CACHE, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
plots = sum(1 for gid in tts if isinstance(cache.get(gid), dict)
            and cache[gid].get('Response') == 'True'
            and (cache[gid].get('Plot') or 'N/A') != 'N/A')
print(f'DONE: ok={ok} miss={miss} · games now holding a real OMDb plot: {plots}')
print('Next: python update_omdb.py --emit-only  (then bump ?v)')
