# mkp2.py <id> <p2.json> — phase 2 assembly: carry phase1 see/deeper/survey VERBATIM, add the orchestrator's about/craft/context
# and flags (phase-1 flags kept, phase-2 flags appended). Writes out_tour_<id>.json.
import json, io, sys
wid, p2f = sys.argv[1], sys.argv[2]
p1 = json.load(io.open('phase1_%s.json' % wid, encoding='utf-8'))
p2 = json.load(io.open(p2f, encoding='utf-8'))
out = {'id': wid, 'see': p2.get('see', p1['see']), 'about': p2['about'], 'craft': p2['craft'], 'context': p2['context'],
       'deeper': p2.get('deeper', p1['deeper']), 'survey': p1['survey'],
       'flags': ['PHASE 1: ' + f for f in p1['flags']] + ['PHASE 2: ' + f for f in p2.get('flags', [])]}
if 'see' in p2 or 'deeper' in p2: out['flags'].append('PHASE 2: phase-1 text changed — see the PHASE 2 flags naming each change.')
io.open('out_tour_%s.json' % wid, 'w', encoding='utf-8').write(json.dumps(out, ensure_ascii=False, indent=1))
print('wrote out_tour_%s.json' % wid)
