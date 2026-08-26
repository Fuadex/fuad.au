#!/usr/bin/env python3
"""validate.py — fast, no-network integrity gate for the Culture dataset.

The `id` join key is load-bearing for every generated overlay, but nothing used to
check it (audit 2026-07 §4). This gate runs inside build_all.py BEFORE the cache
bump, and standalone as `python validate.py`.

ERRORS (exit 1 — a broken join key ships broken UI):
  · duplicate ids within/across data.js, imports.js, wishlist.js
  · items missing id / title / medium
  · medium not in the CULTURE.MEDIA shelf list
  · region code not in REGION_COLORS (data.js)

WARNINGS (reported, never fatal):
  · overlay keys with no matching item (orphans after renames/deletes — wasted
    bytes, not wrong UI; wishlist overlays orphan naturally when an item is watched
    and moves to imports.js under a new id)
  · overlays that fail to parse (skipped, listed)

Parsing matches the repo's own convention (update_omdb.parse_items): the three
hand-authored files keep ONE item per line, so a per-line regex is the contract.
"""
import json, os, re, sys

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

SD = os.path.dirname(os.path.abspath(__file__))
DATA_FILES = ['data.js', 'imports.js', 'wishlist.js']
OVERLAYS = [  # file → every id key must (ideally) exist in a data file
    'cast_data.js', 'omdb_data.js', 'tmdb_data.js', 'books_data.js',
    'game_imdb.js', 'notes_en.js', 'badges.js',
    'script_mood.js', 'wishlist_cast.js', 'wishlist_pred.js',
    'wishlist_blurbs.js', 'interpretations.js',
]
# filmweb_notes.js is keyed by "(film|serial|videogame)/<numeric filmweb id>" — the
# join runs through item.link (filmwebNote in culture-v2.jsx), NOT item.id, so it is
# checked against the link-derived key set instead of the id set.
FW_NOTES = 'filmweb_notes.js'

ID_RE = re.compile(r"""\bid"?\s*:\s*['"]([^'"]+)['"]""")
MEDIUM_RE = re.compile(r"""\bmedium"?\s*:\s*['"]([^'"]+)['"]""")
REGION_RE = re.compile(r"""\bregion"?\s*:\s*['"]([^'"]+)['"]""")
TITLE_RE = re.compile(r"""\btitle"?\s*:\s*['"]""")
FW_LINK_RE = re.compile(r"""filmweb\.pl/(film|serial|videogame)/[^'"]*-(\d+)""")


def data_lines(path):
    """Yield (lineno, line) for lines that look like item rows (carry an id:)."""
    for n, line in enumerate(open(path, encoding='utf-8'), 1):
        if ID_RE.search(line):
            yield n, line


def parse_meta(src):
    """MEDIA list + REGION_COLORS keys out of data.js (the app's own vocabularies)."""
    media = []
    mm = re.search(r'\bMEDIA\s*[:=]\s*\[([^\]]*)\]', src)
    if mm:
        media = re.findall(r"""['"]([^'"]+)['"]""", mm.group(1))
    regions = []
    rm = re.search(r'\bREGION_COLORS\s*[:=]\s*\{([^}]*)\}', src, re.S)
    if rm:
        regions = re.findall(r"""^\s*['"]?([A-Za-z]{2,6})['"]?\s*:""", rm.group(1), re.M)
    return set(media), set(regions)


def overlay_keys(path):
    """Top-level id keys of a generated overlay (window.X = {…};). Returns None if
    the payload doesn't parse as JSON (hand-rolled overlays get a regex fallback
    only if the strict parse fails AND the file is small enough to trust it)."""
    src = open(path, encoding='utf-8').read()
    m = re.search(r'window\.[A-Z_0-9]+\s*=\s*', src)
    if not m:
        return None
    body = src[m.end():].strip().rstrip(';').strip()
    try:
        obj = json.loads(body)
        return set(obj.keys()) if isinstance(obj, dict) else set()
    except json.JSONDecodeError:
        return None


def main():
    errors, warnings = [], []

    # ── the three hand-authored files: ids, dupes, required fields, vocab checks
    media_vocab, region_vocab = parse_meta(open(os.path.join(SD, 'data.js'), encoding='utf-8').read())
    if not media_vocab:
        warnings.append('data.js: could not parse CULTURE.MEDIA — medium checks skipped')
    if not region_vocab:
        warnings.append('data.js: could not parse REGION_COLORS — region checks skipped')

    seen = {}           # id → "file:line" of first sighting
    all_ids = set()
    fw_keys = set()     # "(film|serial|videogame)/<num>" derived from item links
    for f in DATA_FILES:
        p = os.path.join(SD, f)
        if not os.path.exists(p):
            warnings.append(f'{f}: missing file')
            continue
        for n, line in data_lines(p):
            iid = ID_RE.search(line).group(1)
            fm = FW_LINK_RE.search(line)
            if fm:
                fw_keys.add(f'{fm.group(1)}/{fm.group(2)}')
            where = f'{f}:{n}'
            if iid in seen:
                errors.append(f'duplicate id "{iid}" at {where} (first at {seen[iid]})')
            else:
                seen[iid] = where
                all_ids.add(iid)
            if not TITLE_RE.search(line):
                errors.append(f'{where}: item "{iid}" has no title')
            mm = MEDIUM_RE.search(line)
            if not mm:
                errors.append(f'{where}: item "{iid}" has no medium')
            elif media_vocab and mm.group(1) not in media_vocab:
                errors.append(f'{where}: item "{iid}" medium "{mm.group(1)}" not in CULTURE.MEDIA')
            rm = REGION_RE.search(line)
            if rm and region_vocab and rm.group(1) not in region_vocab:
                errors.append(f'{where}: item "{iid}" region "{rm.group(1)}" not in REGION_COLORS')

    # ── overlays: orphaned keys
    for f in OVERLAYS:
        p = os.path.join(SD, f)
        if not os.path.exists(p):
            warnings.append(f'{f}: missing file')
            continue
        keys = overlay_keys(p)
        if keys is None:
            warnings.append(f'{f}: payload did not parse as JSON — skipped')
            continue
        orphans = sorted(keys - all_ids)
        if orphans:
            ex = ', '.join(orphans[:5]) + (' …' if len(orphans) > 5 else '')
            warnings.append(f'{f}: {len(orphans)} orphaned key(s) with no matching item ({ex})')

    # filmweb notes join through item.link, not item.id
    p = os.path.join(SD, FW_NOTES)
    if os.path.exists(p):
        keys = overlay_keys(p)
        if keys is None:
            warnings.append(f'{FW_NOTES}: payload did not parse as JSON — skipped')
        else:
            orphans = sorted(keys - fw_keys)
            if orphans:
                ex = ', '.join(orphans[:5]) + (' …' if len(orphans) > 5 else '')
                warnings.append(f'{FW_NOTES}: {len(orphans)} note key(s) matching no item link ({ex})')

    # ── report
    print(f'validate: {len(all_ids)} items across {len(DATA_FILES)} data files; '
          f'{len(OVERLAYS)} overlays checked.')
    for w in warnings:
        print(f'  ⚠ {w}')
    for e in errors:
        print(f'  ✗ {e}')
    if errors:
        print(f'\nvalidate: {len(errors)} error(s) — FAILING (fix before the cache bump ships this).')
        sys.exit(1)
    print(f'validate: OK ({len(warnings)} warning(s)).')


if __name__ == '__main__':
    main()
