#!/usr/bin/env python3
"""audit_gems.py — make the 💎 gem badge computable.

gem should mean "underseen relative to quality": a high personal rating AND low
popular reach. This read-only audit uses the reach signals already in the overlays
(OMDb imdbVotes, Filmweb voteCount) to:

  (A) FLAG current gem holders whose reach is NOT low  -> demotion candidates
      (Sopranos / Se7en / The Wire aren't hidden by any measure);
  (B) SURFACE unbadged high-rating / low-reach items    -> gem candidates.

Thresholds are tunable constants below. Prints only; writes nothing.
Data is read via Node so the .js overlays are parsed natively (no brittle regex).
"""
import json, os, subprocess, sys
try: sys.stdout.reconfigure(encoding='utf-8')
except Exception: pass

SD = os.path.dirname(os.path.abspath(__file__))

# reach thresholds: "hidden" = below BOTH of these (or missing data)
IMDB_HIDDEN = 25000      # imdbVotes below this = plausibly underseen
FW_HIDDEN   = 5000       # Filmweb voteCount below this = underseen locally
MIN_RATING  = 8          # personal rating at/above this qualifies for gem

NODE = r'''
const fs=require('fs'),p=require('path');const C=%s;global.window={};
for(const f of ['data.js','imports.js','badges.js','omdb_data.js'])eval.call(global,fs.readFileSync(p.join(C,f),'utf8'));
const W=global.window,B=W.CULTURE_BADGES||{},O=W.CULTURE_OMDB||{};
const all=(W.CULTURE.ITEMS||[]).concat(W.CULTURE_IMPORTS||[]);
// Filmweb community voteCount lives in the CSV, not in imports.js — map movieId->voteCount.
function parseCSV(t){const R=[];for(const ln of t.split(/\r?\n/)){if(!ln)continue;const f=[];let c='',q=false;
  for(let i=0;i<ln.length;i++){const ch=ln[i];if(q){if(ch==='"'){if(ln[i+1]==='"'){c+='"';i++}else q=false}else c+=ch}
  else{if(ch===',')  {f.push(c);c=''}else if(ch==='"')q=true;else c+=ch}}f.push(c);R.push(f)}return R}
const fwv={};
try{const R=parseCSV(fs.readFileSync(p.join(C,'Filmweb_watched_film.csv'),'utf8'));
  for(let i=1;i<R.length;i++){const id=R[i][0],vc=parseFloat(R[i][5]);if(id&&isFinite(vc))fwv[id]=Math.round(vc)}}catch(e){}
const fwid=it=>{const m=(it.link||'').match(/-(\d+)(?:\?|$)/);return m?m[1]:null};
const votes=s=>{if(!s)return null;const n=parseInt(String(s).replace(/[^0-9]/g,''));return isFinite(n)?n:null};
const out=all.map(it=>{const badges=[...new Set((it.highlights||[]).concat(B[it.id]||[]))];
  const o=O[it.id]||{};const fid=fwid(it);
  return{id:it.id,title:it.title,year:it.year,medium:it.medium,
  rating:parseFloat(it.rating),fwAvg:it.fwAvg||null,
  fwVotes:(it.voteCount!=null?it.voteCount:(fid&&fwv[fid]!=null?fwv[fid]:null)),
  imdbVotes:votes(o.imdbVotes),badges};});
process.stdout.write(JSON.stringify(out));
''' % json.dumps(SD.replace('\\', '/'))

rows = json.loads(subprocess.check_output(['node', '-e', NODE]))

def hidden(r):
    iv, fv = r['imdbVotes'], r['fwVotes']
    # unknown reach counts as "possibly hidden" only if we have no signal at all
    if iv is None and fv is None:
        return True
    return (iv is None or iv < IMDB_HIDDEN) and (fv is None or fv < FW_HIDDEN)

def reach_str(r):
    iv = f'{r["imdbVotes"]:,}' if r['imdbVotes'] is not None else '—'
    fv = f'{r["fwVotes"]:,}' if r['fwVotes'] is not None else '—'
    return f'imdb {iv:>10} · fw {fv:>7}'

gems = [r for r in rows if 'gem' in r['badges']]
print(f'Current 💎 gem holders: {len(gems)}\n')

demote = [r for r in gems if not hidden(r)]
demote.sort(key=lambda r: -(r['imdbVotes'] or 0))
print(f'(A) NOT hidden — demotion candidates ({len(demote)}):')
for r in demote:
    print(f'   {reach_str(r)}   {r["title"]} ({r["year"]}, {r["medium"]})')

keep = [r for r in gems if hidden(r)]
print(f'\n    …still legitimately hidden: {len(keep)}')

print(f'\n(B) gem CANDIDATES — rating>={MIN_RATING}, low reach, not yet 💎 '
      f'(imdb<{IMDB_HIDDEN:,} & fw<{FW_HIDDEN:,}):')
# require a Filmweb voteCount — the reliable reach signal — and exclude Shorts:
# a short film being under-seen is the norm, not a distinction, so it's just noise here.
cand = [r for r in rows if 'gem' not in r['badges'] and r['rating'] is not None
        and r['rating'] >= MIN_RATING and hidden(r) and r['fwVotes'] is not None
        and r['medium'] != 'Shorts']
cand.sort(key=lambda r: r['fwVotes'])
for r in cand:
    print(f'   r{r["rating"]:>2.0f}  {reach_str(r)}   {r["title"]} ({r["year"]}, {r["medium"]})')
print(f'\n   ({len(cand)} candidates total)')
