"""fix_thin_game_tags.py — closes the thin-tag residue after the steam+igdb passes
(2026-08-27, 70 games). Three moves, all HAND-CURATED by title (no fuzzy search —
that is what produced the pachinko-Biohazard and otome-Paradise-Lost junk):
  1. APPID: games that ARE on Steam but the IGDB appid hop missed (Polish titles,
     delisted search quirks) → SteamSpy tags via the known appid.
  2. CURATED: never-on-Steam titles (FIFA/PES/console/PS1-era) → a sensible tag set.
  3. STRIP: junk tags from earlier wrong fuzzy matches.
Expansions inherit the base game's appid tags (W3 DLCs, L4D2 The Passing)."""
import json, os, re, sys, time, urllib.request
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

SD = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SD)
from update_steam_tags import steamspy_tags, parse_games, load_castjs, save_castjs

# title (as in the source rows) → Steam appid
APPID = {
    'Call of Duty 4: Modern Warfare': 7940,
    'Call of Duty 2': 2630,
    'Wiedźmin 3: Dziki Gon': 292030,
    'Wiedźmin 3: Dziki Gon - Serca z kamienia': 292030,   # expansions wear the base coat
    'Wiedźmin 3: Dziki Gon - Krew i wino': 292030,
    'Wiedźmin 2: Zabójcy królów': 20920,
    'Civilization V': 8930,
    'Civilization VI': 289070,
    'Left 4 Dead 2: The Passing': 550,
    'Worms Armageddon': 217200,
    'Duke Nukem 3D': 434050,                              # 20th Anniversary World Tour
    'To the Moon': 206440,
    'Rime': 493200,
    'Red Faction Guerrilla': 667720,                      # Re-Mars-tered
    'The Walking Dead: S1': 207610,
    'ArmA II': 33900,
    'Biohazard 5': 21690,                                 # Resident Evil 5
    'Half-Life: Counter-Strike': 10,
    'Böse Nachbarn': 260750,                              # Neighbours from Hell Compilation
    'The Gardens Between': 600990,
    'The Park': 402310,
    'Osmos': 29180,
    'Grand Theft Auto 2': 12180,
    'Alpha Protocol: The Espionage RPG': 34010,
    'Need for Speed Shift': 24870,
}

FIFA = ['Sports', 'Football', 'Soccer', 'Simulation', 'Multiplayer', 'Competitive']
PES = ['Sports', 'Football', 'Soccer', 'Simulation', 'Multiplayer']
CURATED = {
    'FIFA 18': FIFA, 'FIFA 17': FIFA, 'FIFA 15': FIFA, 'FIFA 12': FIFA,
    'FIFA 10': FIFA, 'FIFA 09': FIFA, 'FIFA 07': FIFA,
    'Pro Evolution Soccer 2011': PES, 'Pro Evolution Soccer 2010': PES,
    'Pro Evolution Soccer 2009': PES,
    'Tekken 4': ['Fighting', 'Arcade', '3D Fighter', 'Multiplayer', 'Martial Arts'],
    'Tekken 5': ['Fighting', 'Arcade', '3D Fighter', 'Multiplayer', 'Martial Arts'],
    'Need for Speed Most Wanted': ['Racing', 'Open World', 'Arcade', 'Driving', 'Street Racing'],
    'Need for Speed: Undercover': ['Racing', 'Arcade', 'Driving', 'Street Racing', 'Open World'],
    'Need for Speed: ProStreet': ['Racing', 'Driving', 'Street Racing', 'Simulation'],
    'Harry Potter and the Prisoner of Azkaban': ['Adventure', 'Action', 'Magic', 'Based On - Book', 'Third Person', 'Kids'],
    'The Incredibles': ['Action', 'Adventure', 'Superhero', 'Based On - Movie', 'Kids'],
    'TOCA Race Driver 2': ['Racing', 'Simulation', 'Motorsport', 'Driving'],
    'Maluch Racer': ['Racing', 'Arcade', 'Comedy', 'Kids'],
    'Kurka Wodna 3: Popłoch w kurniku': ['Arcade', 'Casual', 'Shooter', 'Comedy', 'Kids'],
    'Hooligans: Storm over Europe': ['Strategy', 'Real Time Tactics', 'Action'],
    'Emergency 2: The Ultimate Fight For Life': ['Strategy', 'Simulation', 'Real Time Tactics', 'Management'],
    'Die Stämme': ['Strategy', 'MMO', 'Browser', 'Medieval', 'Multiplayer'],
    'Jazz Jackrabbit': ['Platformer', 'Retro', 'Fast-Paced'],
    'Jazz Jackrabbit 2: The Christmas Chronicles': ['Platformer', 'Retro', 'Christmas'],
    'Deluxe Ski Jump 2': ['Sports', 'Simulation', 'Winter Sports'],
    'Deluxe Ski Jump 4': ['Sports', 'Simulation', 'Winter Sports'],
    'Croc 2: Kingdom of the Gobbo': ['Platformer', '3D Platformer', 'Adventure', 'Kids'],
    'Casper': ['Adventure', 'Kids', 'Based On - Movie'],
    'Legaia Densetsu': ['JRPG', 'RPG', 'Turn-Based Combat', 'Fantasy'],
    'Pocket Monsters Blue': ['JRPG', 'RPG', 'Turn-Based Combat', 'Creature Collector', 'Kids'],
    'Solitaire': ['Card Game', 'Casual', 'Classic'],
    'Minesweeper': ['Puzzle', 'Casual', 'Classic', 'Logic'],
    'Full Tilt! Pinball': ['Pinball', 'Arcade', 'Casual', 'Classic'],
    'Space Interceptor: Project Freedom': ['Space', 'Combat', 'Flight', 'Arcade', 'Sci-fi'],
    'Sniper: Path of Vengeance': ['FPS', 'Shooter', 'Retro'],
    'Driver': ['Driving', 'Open World', 'Crime', 'Retro'],
    'Tony Hawk': ['Sports', 'Skateboarding', 'Arcade', 'Extreme Sports'],
    'Conflict: Desert Storm II - Back to Baghdad': ['Tactical', 'Third-Person Shooter', 'Military', 'Squad-Based'],
    'Rain': ['Adventure', 'Atmospheric', 'Story Rich', 'Puzzle'],
    'Grand Theft Auto 2': ['Open World', 'Crime', 'Top-Down', 'Retro'],   # under the appid tags if SteamSpy is dead
}

# junk from earlier wrong fuzzy matches
STRIP = {
    'Biohazard 5': ['Gambling', 'Pachinko'],
    'Sniper: Path of Vengeance': ['Rat', 'Sniping'],
    'To the Moon': ['Action'],
    'Casper': ['Handheld Electronic Game'],
    'Rain': ['invisibility'],
    'Paradise Lost': ['otome', 'Romance'],
}
# deliberately untouched: 'Mirror', 'Tom Clancy', 'Takeda 3', 'Paradise Lost' adds —
# row identity unclear; wrong tags are worse than thin tags.

seen = parse_games(os.path.join(SD, 'imports.js'), False) + parse_games(os.path.join(SD, 'data.js'), False)
wish = parse_games(os.path.join(SD, 'wishlist.js'), True)
title2id = {}
for iid, title, year in seen + wish:
    title2id.setdefault(title, iid)

spy_cache = {}
def tags_for(title):
    out = []
    aid = APPID.get(title)
    if aid:
        if aid not in spy_cache:
            spy_cache[aid] = steamspy_tags(aid)
            time.sleep(0.4)
        out += spy_cache[aid]
    for t in CURATED.get(title, []):
        if t not in out:
            out.append(t)
    return out

CAST_HDR = '// Cast / crew / tags enrichment. Steam tags appended by update_steam_tags.py.\n'
WL_HDR = '// Wishlist enrichment — machine-owned. Steam tags appended by update_steam_tags.py.\n'
for path, var, hdr, ids in [
    (os.path.join(SD, 'cast_data.js'), 'window.CULTURE_CAST', CAST_HDR, {i for i, _, _ in seen}),
    (os.path.join(SD, 'wishlist_cast.js'), 'window.CULTURE_WISHLIST_CAST', WL_HDR, {i for i, _, _ in wish}),
]:
    cast = load_castjs(path, var)
    changed = 0
    for title in list(APPID) + list(CURATED) + list(STRIP):
        iid = title2id.get(title)
        if not iid or iid not in ids:
            continue
        cur = cast.setdefault(iid, {})
        tags = [t for t in (cur.get('tags') or []) if t not in STRIP.get(title, [])]
        add = tags_for(title)
        merged = tags + [t for t in add if t not in tags]
        if merged != (cur.get('tags') or []):
            cur['tags'] = merged[:14]
            changed += 1
            print(f'  {title}: {json.dumps(cur["tags"], ensure_ascii=False)}')
    save_castjs(path, var, cast, hdr)
    print(f'{os.path.basename(path)}: updated {changed}\n')
