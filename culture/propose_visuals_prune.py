#!/usr/bin/env python3
"""propose_visuals_prune.py — help shrink the over-broad 🎨 visuals badge (≈113).

visuals should mean "image-beauty is a top reason this is memorable", not "is
animation". This read-only audit lists every visuals holder with its OTHER badges +
medium, sorted so the blanket cases surface first:

  1. LONE visuals (no other badge) — the likeliest over-applications
  2. visuals + only generic partners, in animation media
  3. the rest (visuals earning its place alongside style/cinematography/etc.)

For each lone/animation case it suggests a re-home: bold/quirky -> 🕶️ style,
lenswork -> 📷 cinematography, or drop. Prints only; you decide + curate by hand.
"""
import json, os, subprocess, sys
try: sys.stdout.reconfigure(encoding='utf-8')
except Exception: pass

SD = os.path.dirname(os.path.abspath(__file__))
ANIM = {'Feature Animation', 'Animated Series'}

NODE = r'''
const fs=require('fs'),p=require('path');const C=%s;global.window={};
for(const f of ['data.js','imports.js','badges.js'])eval.call(global,fs.readFileSync(p.join(C,f),'utf8'));
const W=global.window,B=W.CULTURE_BADGES||{};
const all=(W.CULTURE.ITEMS||[]).concat(W.CULTURE_IMPORTS||[]);
const out=all.map(it=>({title:it.title,year:it.year,medium:it.medium,
  badges:[...new Set((it.highlights||[]).concat(B[it.id]||[]))]})).filter(r=>r.badges.includes('visuals'));
process.stdout.write(JSON.stringify(out));
''' % json.dumps(SD.replace('\\', '/'))

rows = json.loads(subprocess.check_output(['node', '-e', NODE]))
for r in rows:
    r['others'] = [b for b in r['badges'] if b != 'visuals']

lone   = [r for r in rows if not r['others']]
animish = [r for r in rows if r['others'] and r['medium'] in ANIM
           and not ({'cinematography', 'style'} & set(r['others']))]
rest   = [r for r in rows if r not in lone and r not in animish]

print(f'🎨 visuals holders: {len(rows)}  (target ≤ 60)\n')

print(f'1. LONE visuals — no other badge ({len(lone)}) — review first:')
for r in sorted(lone, key=lambda r: (r['medium'], r['title'])):
    print(f'   {r["medium"]:<18} {r["title"]} ({r["year"]})   → style? cinematography? drop?')

print(f'\n2. animation + only generic partners ({len(animish)}) — likely blanket:')
for r in sorted(animish, key=lambda r: (r['medium'], r['title'])):
    print(f'   {r["medium"]:<18} {r["title"]} ({r["year"]})   [has: {", ".join(r["others"])}]')

print(f'\n3. visuals earning its place (has style/cinematography, or live-action) ({len(rest)}):')
for r in sorted(rest, key=lambda r: (r['medium'], r['title'])):
    print(f'   {r["medium"]:<18} {r["title"]} ({r["year"]})   [has: {", ".join(r["others"])}]')

print(f'\nSuggested cut set = groups 1 + 2 = {len(lone) + len(animish)} '
      f'→ would bring visuals to ~{len(rows) - len(lone) - len(animish)}.')
