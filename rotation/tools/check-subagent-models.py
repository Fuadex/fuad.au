#!/usr/bin/env python3
"""check-subagent-models.py — which model did each subagent actually run on?

The reads and Canvas methodologies require drafting subagents on Opus 5.5
(`claude-opus-5-5`), dispatched as the `reads-opus` / `canvas-opus` agent types.
An alias can resolve to a different version than intended, and a run can land on
another model without any visible sign, so every batch is audited from the
transcripts before its output is applied.

Usage:
  python check-subagent-models.py                 # newest session, all subagents
  python check-subagent-models.py --since 2h      # only subagents active in the last 2 hours
  python check-subagent-models.py --session <id>  # a specific session id
  python check-subagent-models.py --expect claude-opus-5-5

Exit code 1 if any subagent's model differs from --expect (default claude-opus-5-5);
Haiku runs are listed but not counted, since the harness uses Haiku for its own helpers.
"""
import argparse, collections, glob, json, os, re, sys, time

try: sys.stdout.reconfigure(encoding='utf-8')
except Exception: pass

PROJECTS = os.path.join(os.path.expanduser('~'), '.claude', 'projects')

ap = argparse.ArgumentParser()
ap.add_argument('--session')
ap.add_argument('--since', help='e.g. 90m, 2h, 1d')
ap.add_argument('--expect', default='claude-opus-5-5')
a = ap.parse_args()

def since_seconds(s):
    m = re.fullmatch(r'(\d+)([mhd])', s or '')
    return int(m.group(1)) * {'m': 60, 'h': 3600, 'd': 86400}[m.group(2)] if m else None

sessions = [d for d in glob.glob(os.path.join(PROJECTS, '*', '*')) if os.path.isdir(os.path.join(d, 'subagents'))]
if a.session:
    sessions = [d for d in sessions if os.path.basename(d) == a.session]
elif sessions:
    sessions = [max(sessions, key=lambda d: os.path.getmtime(os.path.join(d, 'subagents')))]
if not sessions:
    sys.exit('no session with subagents found')

cut = since_seconds(a.since)
bad = 0
for sdir in sessions:
    print('session', os.path.basename(sdir))
    files = sorted(glob.glob(os.path.join(sdir, 'subagents', '*.jsonl')), key=os.path.getmtime)
    for f in files:
        if cut and time.time() - os.path.getmtime(f) > cut:
            continue
        txt = open(f, encoding='utf-8', errors='ignore').read()
        models = collections.Counter(re.findall(r'"model":"(claude-[^"]+)"', txt))
        if not models:
            continue
        meta = {}
        mp = f[:-len('.jsonl')] + '.meta.json'
        if os.path.exists(mp):
            try: meta = json.load(open(mp, encoding='utf-8'))
            except Exception: pass
        helper = all('haiku' in m for m in models)
        ok = helper or set(models) == {a.expect}
        if not ok:
            bad += 1
        mark = 'ok ' if ok else 'BAD'
        print(f"  {mark} {meta.get('agentType', '?')[:16]:16} {meta.get('description', os.path.basename(f))[:34]:34} "
              f"asked={meta.get('model', '-'):8} ran={', '.join(f'{m}×{n}' for m, n in models.most_common())}"
              f"{'  (helper)' if helper else ''}")
print(f'\n{bad} subagent(s) off {a.expect}.' if bad else f'\nall drafting subagents on {a.expect}.')
sys.exit(1 if bad else 0)
