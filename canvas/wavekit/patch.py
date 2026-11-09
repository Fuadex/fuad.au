# patch.py <id> <patches.json> — apply a repair/seal patch list to out_tour_<id>.json (or a reads file) with proof.
# patches.json: [{"where": "see|about|craft|context|survey N|stop N|title N|box N|flag+", "old": "...", "new": "..."}, ...]
#   stop/title/box/survey numbers are 1-BASED. "box N": new is "x,y,w,h". "flag+": appends new to flags.
#   Every old span must occur EXACTLY ONCE in its field (else the whole patch aborts and nothing is written).
# Backs up the tour once as bak_<id>.json before the first patch of a stage tag (--tag repair|seal).
import json, io, sys, os
wid, pf = sys.argv[1], sys.argv[2]
tag = sys.argv[sys.argv.index('--tag') + 1] if '--tag' in sys.argv else 'repair'
f = 'out_tour_%s.json' % wid
t = json.load(io.open(f, encoding='utf-8'))
bak = 'bak_%s_%s.json' % (tag, wid)
if not os.path.exists(bak): io.open(bak, 'w', encoding='utf-8').write(json.dumps(t, ensure_ascii=False, indent=1))
P = json.load(io.open(pf, encoding='utf-8'))
log = []
for p in P:
    w = p['where']; kind = w.split()[0]
    if kind == 'flag+':
        t['flags'].append(p['new']); log.append('flag+'); continue
    if kind in ('see', 'about', 'craft', 'context'):
        holder, key = t, kind
    else:
        n = int(w.split()[1]) - 1
        if kind == 'survey': holder, key = t['survey'], n
        elif kind == 'stop': holder, key = t['deeper'][n], 'body'
        elif kind == 'title': holder, key = t['deeper'][n], 't'
        elif kind == 'box':
            x, y, ww, h = [float(v) for v in p['new'].split(',')]
            s = t['deeper'][n]; old = (s['x'], s['y'], s['w'], s['h'])
            s['x'], s['y'], s['w'], s['h'] = x, y, ww, h
            log.append('box %d %s -> %s' % (n + 1, old, (x, y, ww, h))); continue
        elif kind == 'delstop':
            removed = t['deeper'].pop(n)
            if len(t['survey']) > n: t['survey'].pop(n)
            log.append('DELETED stop %d (%s)' % (n + 1, removed['t'])); continue
        else: raise SystemExit('bad where: ' + w)
    cur = holder[key]
    if p['old'] == '*':
        holder[key] = p['new']; log.append('%s replaced whole' % w); continue
    c = cur.count(p['old'])
    if c != 1: raise SystemExit('ABORT %s: old span occurs %d times: %r' % (w, c, p['old'][:80]))
    holder[key] = cur.replace(p['old'], p['new']); log.append(w)
io.open(f, 'w', encoding='utf-8').write(json.dumps(t, ensure_ascii=False, indent=1))
print('%s: %d patches applied (%s)' % (wid, len(P), '; '.join(log)))
