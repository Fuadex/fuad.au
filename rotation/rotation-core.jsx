// rotation-core.jsx — design system + shared primitives for Rotation.
// Exports to window: cssRotation, fmt, GenCover, Spark, Bars, Radar,
//   Donut, RisoTexture, useInView, useCountUp, hashInt.

// ─────────────────────────────────────────────────────────────────
//  THE SYSTEM (sibling of Culture, own identity)
//  · Warm-charcoal archive ground, paper popovers — shared DNA.
//  · Signature accent is COOL by default (sodium-cyan) to set music
//    apart from Culture's coral; fully tweakable.
//  · Type: editorial serif display + grotesk/mono labels.
//  · Covers are generative duotone "sleeves" — waveform / concentric /
//    strata / split — deterministic per artist hue.
// ─────────────────────────────────────────────────────────────────

const cssRotation = `
:root {
  --bg:       #0b0a0f;
  --bg-2:     #131119;
  --bg-3:     #1b1824;
  --panel:    #110f17;
  --ink:      #f1eef6;
  --ink-soft: #a09bb0;
  --ink-faint:#665f78;
  --rule:     #272235;
  --rule-2:   #37314a;
  --paper:    #f4f1ea;
  --paper-ink:#16131c;
  --paper-rule:#cbc4ba;

  /* accent — overridden by tweak */
  --acc-h: 330;
  --accent:    oklch(0.74 0.13 var(--acc-h));
  --accent-dim:oklch(0.62 0.11 var(--acc-h));
  --accent-ink:oklch(0.92 0.05 var(--acc-h));
  --accent-bg: oklch(0.74 0.13 var(--acc-h) / 0.14);

  --serif: 'Source Serif 4','Source Serif Pro',Georgia,serif;
  --sans:  'Space Grotesk','Inter',-apple-system,system-ui,sans-serif;
  --mono:  'JetBrains Mono',ui-monospace,Menlo,monospace;

  --pad: 34px;       /* density-controlled outer gutter */
  --gap: 20px;
  --row: 1;          /* density scalar */
}
[data-density="compact"] { --pad: 26px; --gap: 13px; --row: .9; }
[data-density="comfy"]   { --pad: 48px; --gap: 28px; --row: 1.12; }
[data-font="editorial"]  { --sans: 'Inter',-apple-system,system-ui,sans-serif; }

* { box-sizing: border-box; }
html, body { margin: 0; background: var(--bg); color: var(--ink); }
body { font-family: var(--sans); -webkit-font-smoothing: antialiased; }
::selection { background: var(--accent-bg); }

.r-app { min-height: 100vh; position: relative; overflow-x: hidden; }

/* scrollbar */
.r-app *::-webkit-scrollbar { height: 8px; width: 8px; }
.r-app *::-webkit-scrollbar-thumb { background: var(--rule-2); border-radius: 4px; }
.r-app *::-webkit-scrollbar-track { background: transparent; }

/* ───── shell header ───── */
.r-head {
  position: sticky; top: 0; z-index: 40;
  display: flex; align-items: center; gap: 22px;
  padding: 0 var(--pad); height: 64px;
  background: color-mix(in oklab, var(--bg) 86%, transparent);
  backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--rule);
}
.r-wordmark { font-family: var(--serif); font-style: italic; font-weight: 600;
  font-size: 26px; letter-spacing: -.02em; line-height: 1; white-space: nowrap; }
.r-wordmark .dot { font-style: normal; color: var(--accent); }
.r-sub { font-family: var(--mono); font-size: 9.5px; letter-spacing: .2em;
  text-transform: uppercase; color: var(--ink-faint); }

.r-nav { display: flex; gap: 2px; margin-left: 8px; align-items: center; flex-wrap: wrap; }
.r-nav button {
  font-family: var(--mono); font-size: 10.5px; letter-spacing: .14em; text-transform: uppercase;
  background: transparent; border: 0; color: var(--ink-faint);
  padding: 9px 13px; border-radius: 999px; cursor: pointer; white-space: nowrap;
  display: inline-flex; align-items: center; gap: 7px;
  transition: color .16s, background .16s;
}
.r-nav button:hover { color: var(--ink); }
.r-nav button[data-on="true"] { color: var(--bg); background: var(--ink); }
.r-nav button .gl { width: 5px; height: 5px; border-radius: 50%; background: currentColor; opacity: .5; }
.r-nav button[data-on="true"] .gl { background: var(--accent); opacity: 1; }

.r-head .right { margin-left: auto; display: flex; align-items: center; gap: 14px; }
.r-live { font-family: var(--mono); font-size: 10px; letter-spacing: .1em; color: var(--ink-soft);
  display: flex; align-items: center; gap: 8px; }
.r-live .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent);
  box-shadow: 0 0 0 0 var(--accent); animation: rpulse 2.4s infinite; }
@keyframes rpulse { 0%{box-shadow:0 0 0 0 var(--accent-bg)} 70%{box-shadow:0 0 0 7px transparent} 100%{box-shadow:0 0 0 0 transparent} }
.r-live b { color: var(--ink); font-weight: 600; }

/* ───── view scaffolding ───── */
.r-view { padding: calc(var(--pad) * 1.1) var(--pad) 120px; animation: rViewIn .5s cubic-bezier(.2,.7,.3,1); }
@keyframes rViewIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.r-viewhead { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px 40px;
  flex-wrap: wrap; margin-bottom: calc(var(--pad)*1.35); }
.r-viewhead > div:first-child { flex: 1 1 auto; min-width: 0; }
.r-kicker { font-family: var(--mono); font-size: 10px; letter-spacing: .22em; text-transform: uppercase;
  color: var(--accent); margin-bottom: 12px; }
.r-title { font-family: var(--serif); font-weight: 400; font-size: clamp(34px, 4.4vw, 58px);
  letter-spacing: -.025em; line-height: 1.02; margin: 0; }
.r-title em { font-style: italic; }
.r-title .dot { color: var(--accent); }
.r-lede { font-family: var(--serif); font-style: italic; color: var(--ink-soft);
  font-size: 16px; line-height: 1.5; max-width: 460px; }
.r-lede b { color: var(--ink); font-style: normal; }

/* segmented control */
.r-seg { display: inline-flex; border: 1px solid var(--rule); border-radius: 999px; padding: 3px;
  background: rgba(255,255,255,.02); }
.r-seg button { font-family: var(--mono); font-size: 9.5px; letter-spacing: .12em; text-transform: uppercase;
  background: transparent; border: 0; color: var(--ink-soft); padding: 7px 12px; border-radius: 999px;
  cursor: pointer; transition: .15s; white-space: nowrap; }
.r-seg button:hover { color: var(--ink); }
.r-seg button[data-on="true"] { background: var(--accent); color: #0c0a08; }
.r-seg-sm button { font-size: 9px; padding: 3px 7px; }

/* card */
.r-card { background: var(--panel); border: 1px solid var(--rule); border-radius: 6px; position: relative; }
.r-card-h { display: flex; align-items: baseline; gap: 10px; padding: 16px 18px 0; }
.r-card-h .lbl { font-family: var(--mono); font-size: 10px; letter-spacing: .16em; text-transform: uppercase;
  color: var(--ink-soft); }
.r-card-h .lbl b { color: var(--ink); font-weight: 600; }
.r-card-h .meta { margin-left: auto; font-family: var(--mono); font-size: 10px; color: var(--ink-faint);
  letter-spacing: .1em; }

/* stat numerals */
.r-stat-n { font-family: var(--serif); font-weight: 400; letter-spacing: -.02em; font-variant-numeric: tabular-nums; line-height: 1; }
.r-mono { font-family: var(--mono); font-variant-numeric: tabular-nums; }

/* ───── generative cover ───── */
.gc { position: relative; overflow: hidden; border-radius: 3px; background: #0c0a08;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.05), 0 2px 10px rgba(0,0,0,.4); flex: none; }
.gc .gc-fill { position: absolute; inset: 0; }
.gc .gc-grain { position: absolute; inset: 0; mix-blend-mode: overlay; opacity: .5;
  background-image: repeating-linear-gradient(0deg, rgba(255,255,255,.06) 0 1px, transparent 1px 3px); pointer-events: none; }
.gc .gc-wave { position: absolute; inset: 0; display: flex; align-items: flex-end; gap: 6%; padding: 22% 12%; }
.gc .gc-wave i { flex: 1; background: currentColor; border-radius: 1px; opacity: .85; }
.gc .gc-rings { position: absolute; inset: -20%; }
.gc .gc-init { position: absolute; left: 8%; bottom: 7%; font-family: var(--mono); font-weight: 600;
  letter-spacing: .02em; color: rgba(255,255,255,.92); text-shadow: 0 1px 3px rgba(0,0,0,.5);
  line-height: .9; }
.gc .gc-tag { position: absolute; right: 7%; top: 7%; width: 18%; aspect-ratio: 1; border-radius: 50%;
  border: 1.5px solid rgba(255,255,255,.6); }

/* ───── popover (paper, like Culture) ───── */
.r-pop { position: fixed; z-index: 1000; width: 252px; background: var(--paper); color: var(--paper-ink);
  border-radius: 5px; padding: 14px 15px 15px; pointer-events: none;
  box-shadow: 0 24px 60px rgba(0,0,0,.5), 0 0 0 1px rgba(0,0,0,.08);
  transform: translate(-50%, -100%) translateY(-12px) scale(1); opacity: 0;
  transition: opacity .16s, transform .2s cubic-bezier(.2,.7,.3,1); transform-origin: bottom center; }
.r-pop.on { opacity: 1; transform: translate(-50%,-100%) translateY(-16px) scale(1); }
.r-pop::after { content:''; position:absolute; bottom:-6px; left:50%; transform:translateX(-50%) rotate(45deg);
  width:12px; height:12px; background: var(--paper); }
.r-pop .pm { font-family: var(--mono); font-size: 9px; letter-spacing: .16em; text-transform: uppercase;
  color: #8a8175; display: flex; gap: 8px; align-items: center; margin-bottom: 6px; }
.r-pop .pm .pip { width: 6px; height: 6px; border-radius: 50%; }
.r-pop .pt { font-family: var(--serif); font-style: italic; font-size: 19px; line-height: 1.04; }
.r-pop .pr { margin-top: 9px; padding-top: 9px; border-top: 1px solid var(--paper-rule);
  font-family: var(--mono); font-size: 10px; color: #4a443c; display: grid; gap: 5px; }
.r-pop .pr .kv { display: flex; justify-content: space-between; gap: 12px; }
.r-pop .pr .kv b { color: var(--paper-ink); }
.r-pop .phint { margin-top: 10px; font-family: var(--mono); font-size: 8.5px; letter-spacing: .16em;
  text-transform: uppercase; color: var(--accent-dim); }

/* generic chips */
.r-chip { font-family: var(--mono); font-size: 9.5px; letter-spacing: .08em; text-transform: lowercase;
  color: var(--ink-soft); border: 1px solid var(--rule-2); border-radius: 999px; padding: 4px 9px;
  white-space: nowrap; transition: .15s; cursor: default; }
.r-chip:hover { color: var(--ink); border-color: var(--accent-dim); }
.r-chip.solid { background: var(--accent-bg); color: var(--accent-ink); border-color: transparent; }
.r-chip.link { cursor: pointer; }
.r-chip.link:hover { color: var(--accent-ink); background: var(--accent-bg); border-color: transparent; }

/* back button + external links — shared across artist / album / mini pages */
.r-back { font-family: var(--mono); font-size: 10.5px; letter-spacing: .12em; text-transform: uppercase;
  background: transparent; border: 1px solid var(--rule-2); color: var(--ink-soft); padding: 8px 14px;
  border-radius: 999px; cursor: pointer; margin-bottom: 22px; transition: .15s; }
.r-back:hover { color: var(--ink); border-color: var(--accent-dim); }
.r-extlink { display: inline-flex; align-items: center; gap: 5px; font-family: var(--mono); font-size: 10px; letter-spacing: .08em;
  text-transform: uppercase; padding: 6px 11px; border-radius: 999px; border: 1px solid var(--rule); color: var(--ink-soft);
  text-decoration: none; transition: .15s; }
.r-extlink:hover { color: var(--ink); border-color: var(--ink-faint); }
.r-extlink-sp:hover { color: oklch(0.72 0.17 150); border-color: oklch(0.72 0.17 150); }
.r-extlink-lf:hover { color: oklch(0.62 0.21 25); border-color: oklch(0.62 0.21 25); }
/* "seen live" pill on TrackView (song is in a setlist from a show Fuad attended) */
.tv-seen { display: inline-flex; align-items: center; gap: 5px; font-family: var(--mono); font-size: 10px; letter-spacing: .08em;
  text-transform: uppercase; padding: 6px 11px; border-radius: 999px; border: 1px solid var(--accent-dim);
  color: var(--accent); background: var(--accent-bg); }
/* per-row "seen live" marker in track lists (🎤) — small, inline, doesn't shift layout */
.r-livemark { font-size: 11px; line-height: 1; flex: none; cursor: help; filter: saturate(.9); }
/* blurb + mood row on TrackView: description left, sounds/reads right (stacks < 860px) */
.tv-subrow { margin: 0 0 var(--gap); }
.tv-subrow[data-both="true"] { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); gap: var(--gap); align-items: start; }
.tv-subrow .tv-about, .tv-subrow .tv-mood, .tv-subrow .tv-taste { margin: 0; max-width: none; }
@media (max-width: 860px) { .tv-subrow[data-both="true"] { grid-template-columns: 1fr; } }
/* "In your rotation, this track is…" — audio-feature outliers vs YOUR library (percentiles) */
.tv-taste { max-width: 680px; margin: 0 0 var(--gap); padding: 14px 18px; border-left: 2px solid var(--rule-2); background: var(--panel); border-radius: 0 8px 8px 0; }
.tv-taste-h { font-family: var(--mono); font-size: 9.5px; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-faint); margin-bottom: 12px; }
.tv-taste-list { display: grid; gap: 9px; }
.tv-taste-row { display: grid; grid-template-columns: 88px 1fr 50px; gap: 10px; align-items: center; }
.tv-taste-adj { font-size: 13.5px; color: var(--ink); text-transform: capitalize; }
.tv-taste-bar { height: 5px; background: var(--bg-3); border-radius: 3px; overflow: hidden; }
.tv-taste-bar i { display: block; height: 100%; border-radius: 3px; }
.tv-taste-pct { font-family: var(--mono); font-size: 10px; color: var(--ink-soft); text-align: right; }
/* "what it's about" blurb on TrackView — Genius About excerpt, community-written */
.tv-about { max-width: 680px; margin: 0 0 var(--gap); padding: 14px 18px; border-left: 2px solid var(--accent-dim);
  background: var(--panel); border-radius: 0 8px 8px 0; }
.tv-about-txt { font-family: var(--serif); font-size: 14.5px; line-height: 1.6; color: var(--ink-soft); }
.tv-about-src { display: inline-block; margin-left: 10px; font-family: var(--mono); font-size: 9px;
  letter-spacing: .1em; text-transform: uppercase; color: var(--ink-faint); text-decoration: none; white-space: nowrap; }
.tv-about-src:hover { color: var(--accent); }
/* mood strip: how it SOUNDS (Spotify valence) vs how it READS (NRC lyric sentiment) */
.tv-mood { display: grid; gap: 8px; max-width: 520px; margin: 0 0 var(--gap); padding: 14px 16px;
  border: 1px solid var(--rule); border-radius: 8px; }
.tv-mood-axis { display: grid; grid-template-columns: 58px 1fr 30px; gap: 12px; align-items: center; }
.tv-mood-k { font-family: var(--mono); font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: var(--ink-soft); }
.tv-mood-bar { height: 7px; background: var(--bg-3); border-radius: 4px; overflow: hidden; }
.tv-mood-bar i { display: block; height: 100%; border-radius: 4px; }
.tv-mood-v { font-family: var(--mono); font-size: 11px; color: var(--ink-faint); text-align: right; }
.tv-mood-note { font-size: 12px; color: var(--ink-soft); margin-top: 2px; display: flex; align-items: center; gap: 8px; }
.tv-mood-note b { color: var(--ink); }
.tv-mood-note .txt { flex: 1; }
/* hover-? explaining the two axes (Fuad 2026-07-05) — works on tap too via tabIndex focus */
.tv-mood-help { position: relative; flex: none; }
.tv-mood-help > i { display: inline-flex; align-items: center; justify-content: center; width: 15px; height: 15px;
  border-radius: 50%; border: 1px solid var(--rule); font-family: var(--mono); font-style: normal; font-size: 9.5px;
  color: var(--ink-faint); cursor: help; user-select: none; }
.tv-mood-help:hover > i, .tv-mood-help:focus-within > i { color: var(--accent); border-color: var(--accent-dim); }
.tv-mood-tip { position: absolute; bottom: calc(100% + 9px); right: -6px; width: 252px; padding: 11px 13px;
  background: var(--panel); border: 1px solid var(--rule); border-radius: 8px; font-size: 11.5px; line-height: 1.55;
  color: var(--ink-soft); box-shadow: 0 8px 24px rgba(0,0,0,.4); opacity: 0; pointer-events: none;
  transform: translateY(3px); transition: opacity .12s ease, transform .12s ease; z-index: 30; }
.tv-mood-help:hover .tv-mood-tip, .tv-mood-help:focus-within .tv-mood-tip { opacity: 1; pointer-events: auto; transform: none; }
.tv-mood-tip b { color: var(--ink); }

/* skinny scroller utility */
.r-xscroll { display: flex; gap: var(--gap); overflow-x: auto; scrollbar-width: none; padding-bottom: 6px; }
.r-xscroll::-webkit-scrollbar { display: none; }

a.r-link { color: var(--accent); text-decoration: none; }
a.r-link:hover { color: var(--ink); }

/* entrance animations — resting state is ALWAYS the visible base style.
   No fill-mode: if timers are frozen (preview capture / print / export)
   the element simply shows its base (visible) style. */
@media (prefers-reduced-motion: no-preference) {
  .r-grow { transform-origin: left center; animation: rGrowX .85s cubic-bezier(.3,.8,.3,1); }
  .r-spark-line { animation: rDash 1.15s cubic-bezier(.4,0,.2,1); }
  .r-spark-fill { animation: rFade .8s ease; }
}
@keyframes rGrowX { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes rDash  { from { stroke-dashoffset: var(--len, 1200); } to { stroke-dashoffset: 0; } }
@keyframes rFade  { from { opacity: 0; } to { opacity: 1; } }

@media (max-width: 760px) {
  /* reclaim the gutter — 34px eats ~19% of a 360px screen */
  :root, [data-density="compact"], [data-density="comfy"] { --pad: 16px; --gap: 12px; }

  .r-head { height: auto; flex-wrap: wrap; padding: 9px var(--pad); gap: 9px; }
  .r-nav { order: 3; width: 100%; overflow-x: auto; flex-wrap: nowrap;
    margin-left: 0; -webkit-overflow-scrolling: touch;
    -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 12px, #000 calc(100% - 18px), transparent 100%);
            mask-image: linear-gradient(90deg, transparent 0, #000 12px, #000 calc(100% - 18px), transparent 100%); }
  .r-nav button { padding: 9px 11px; }
  .r-head .right { flex: 1; justify-content: flex-end; min-width: 0; }
  .r-head .r-live { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
  .r-wordmark { font-size: 22px; }

  .r-view { padding-top: 22px; padding-bottom: 88px; }
  .r-viewhead { margin-bottom: 22px; gap: 12px 20px; align-items: flex-start; }
  .r-title { font-size: clamp(30px, 8.5vw, 42px); }
  .r-lede { font-size: 14.5px; max-width: none; }
  .r-seg button { padding: 7px 10px; }
}

/* mobile grid utilities — inline grid styles win over plain rules, so !important */
@media (max-width: 860px) {
  .m-stack { display: grid; grid-template-columns: 1fr !important; }
  .m-stack > * { grid-column: auto !important; grid-row: auto !important; }
  .m-2col { grid-template-columns: 1fr 1fr !important; }
  .m-2col > * { grid-column: auto !important; }
}

/* Album/Track page rules — GLOBAL (these pages are deep-linkable; component-scoped styles in
   Explore never load unless Explore mounts, which made the sidebar column clip on mobile). */
.tv-page { max-width: 1150px; margin: 0 auto; }   /* detail pages read as a sheet, not a smear, on wide screens */
.av-page { max-width: 1540px; }                   /* artist pages: +⅓ wider — 3-col composition needs the room (Fuad) */
/* DEMO — multi-model "what it's about" switcher on TrackView */
.tv-switch { margin: 0 0 var(--gap); padding: 14px 16px; border: 1px solid var(--rule); border-radius: 10px; background: var(--panel); }
.tv-switch-head { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 10px; }
.tv-switch-lbl { font-family: var(--mono); font-size: 9.5px; letter-spacing: .14em; text-transform: uppercase; color: var(--ink-faint); }
.tv-switch-btns { display: flex; gap: 6px; flex-wrap: wrap; }
.tv-switch-btns button { font-family: var(--mono); font-size: 10px; letter-spacing: .06em; padding: 4px 11px; border-radius: 999px; border: 1px solid var(--rule); background: none; color: var(--ink-soft); cursor: pointer; transition: color .12s, border-color .12s; }
.tv-switch-btns button:hover { border-color: var(--rule-2); color: var(--ink); }
.tv-switch-btns button[data-on="true"] { border-color: currentColor; }
.tv-switch-btns button[data-m="genius"][data-on="true"] { color: oklch(0.74 0.13 330); }
.tv-switch-btns button[data-m="haiku"][data-on="true"] { color: oklch(0.75 0.14 145); }
.tv-switch-btns button[data-m="sonnet"][data-on="true"] { color: oklch(0.72 0.15 235); }
.tv-switch-btns button[data-m="opus"][data-on="true"] { color: oklch(0.73 0.16 295); }
.tv-switch-btns button[data-m="fable"][data-on="true"] { color: oklch(0.78 0.14 60); }
.tv-switch-body { position: relative; padding-bottom: 20px; }
.tv-switch-txt { font-family: var(--serif); font-size: 15.5px; line-height: 1.6; color: var(--ink-soft); }
.tv-switch-brand { position: absolute; right: 0; bottom: 0; font-family: var(--mono); font-size: 9px; letter-spacing: .1em; text-transform: uppercase; color: var(--ink-faint); }
.tv-switch-brand[data-m="genius"] { color: oklch(0.7 0.12 330); }
.tv-switch-brand[data-m="fable"] { color: oklch(0.73 0.12 60); }
.tv-switch-note { font-size: 8.5px; color: var(--ink-faint); margin-top: 8px; letter-spacing: .05em; }
/* needle-drop preview button (Shelves + Album pages) — global so it's styled off the Shelves view too */
.sh-needle { padding: 7px 12px; border-radius: 999px; cursor: pointer; font-family: var(--mono); font-size: 10px;
  letter-spacing: .1em; text-transform: uppercase; text-align: center; border: 1px solid var(--rule-2);
  background: none; color: var(--ink-soft); white-space: nowrap; }
.sh-needle:hover { color: var(--ink); }
.sh-needle[data-on="true"] { color: oklch(0.82 0.12 var(--h)); border-color: oklch(0.6 0.14 var(--h) / .7); background: oklch(0.6 0.14 var(--h) / .13); }
.clk-scroll > div { min-width: 0; }
@media (max-width: 560px) {
  .clk-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; padding-bottom: 4px; }
  .clk-scroll::-webkit-scrollbar { display: none; }
  .clk-scroll > div { min-width: 430px; }
}
.r-track-row { transition: background .15s; } .r-track-row:hover { background: var(--bg-3); }
@media (max-width: 760px) { .tv-grid { grid-template-columns: 1fr !important; } }
@media (max-width: 600px) {
  .tv-head { gap: 16px !important; }
  .tv-head .r-stat-n { font-size: 26px !important; }
  .tv-head > div:last-child { gap: 16px !important; width: 100%; }
  /* radar above, bars below — the side-by-side row clips at phone width */
  .tv-dna-row { flex-direction: column; align-items: stretch !important; }
  .tv-dna-row > div:first-child { margin: 0 auto; }
  .tv-dna-row > div:last-child { min-width: 0 !important; }
  /* card-header meta labels ("8 more you've played") ellipsise instead of clipping */
  .r-card-h .meta { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 45%; }
}
`;

// ─────────── helpers ───────────
function hashInt(str, seed) {
  let h = (seed || 0) | 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}
const fmt = (n) => n == null ? "—" : n.toLocaleString("en-US");
const fmtK = (n) => n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + "M"
  : n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "k" : "" + n;

// ── romaji transliteration so Latin typing finds kana names (e.g. "midori" → ミドリ) ──
// Hepburn-ish; katakana is folded to hiragana first (codepoint −0x60). Handles yōon (small や/ゆ/よ),
// foreign small-vowel combos (フ＋ァ→fa), sokuon (っ → doubled consonant) and the long mark ー.
// Kanji can't be romanised without a dictionary, so kanji names stay Latin-unsearchable (honest gap).
const KANA_RE = /[぀-ヿｦ-ﾟ]/;
const _KMAP = {
  "あ": "a", "い": "i", "う": "u", "え": "e", "お": "o",
  "か": "ka", "き": "ki", "く": "ku", "け": "ke", "こ": "ko", "が": "ga", "ぎ": "gi", "ぐ": "gu", "げ": "ge", "ご": "go",
  "さ": "sa", "し": "shi", "す": "su", "せ": "se", "そ": "so", "ざ": "za", "じ": "ji", "ず": "zu", "ぜ": "ze", "ぞ": "zo",
  "た": "ta", "ち": "chi", "つ": "tsu", "て": "te", "と": "to", "だ": "da", "ぢ": "ji", "づ": "zu", "で": "de", "ど": "do",
  "な": "na", "に": "ni", "ぬ": "nu", "ね": "ne", "の": "no",
  "は": "ha", "ひ": "hi", "ふ": "fu", "へ": "he", "ほ": "ho", "ば": "ba", "び": "bi", "ぶ": "bu", "べ": "be", "ぼ": "bo",
  "ぱ": "pa", "ぴ": "pi", "ぷ": "pu", "ぺ": "pe", "ぽ": "po",
  "ま": "ma", "み": "mi", "む": "mu", "め": "me", "も": "mo", "や": "ya", "ゆ": "yu", "よ": "yo",
  "ら": "ra", "り": "ri", "る": "ru", "れ": "re", "ろ": "ro", "わ": "wa", "ゐ": "wi", "ゑ": "we", "を": "wo", "ん": "n",
  "ゔ": "vu", "ぁ": "a", "ぃ": "i", "ぅ": "u", "ぇ": "e", "ぉ": "o", "ゃ": "ya", "ゅ": "yu", "ょ": "yo",
};
const _smallY = { "ゃ": "ya", "ゅ": "yu", "ょ": "yo" };
const _smallV = { "ぁ": "a", "ぃ": "i", "ぅ": "u", "ぇ": "e", "ぉ": "o" };
function kanaToRomaji(str) {
  const toH = (ch) => { const c = ch.codePointAt(0); return (c >= 0x30A1 && c <= 0x30FA) ? String.fromCodePoint(c - 0x60) : ch; };
  const chars = [...str];
  let out = "", lastVowel = "", sokuon = false;
  const emit = (rom) => { if (sokuon && rom && /^[a-z]/.test(rom)) { out += rom[0]; sokuon = false; } out += rom; if (rom) lastVowel = rom.slice(-1); };
  for (let i = 0; i < chars.length; i++) {
    const raw = chars[i];
    if (raw === "ー" || raw === "ｰ") { out += lastVowel; continue; }
    const h = toH(raw);
    if (h === "っ") { sokuon = true; continue; }
    const next = chars[i + 1] ? toH(chars[i + 1]) : "";
    const base = _KMAP[h];
    if (base && _smallY[next] && /i$/.test(base)) {            // yōon: きゃ→kya, しゃ→sha …
      const y = _smallY[next], cons = base.slice(0, -1);
      emit(base === "shi" ? "sh" + y.slice(1) : base === "chi" ? "ch" + y.slice(1) : base === "ji" ? "j" + y.slice(1) : cons + y);
      i++; continue;
    }
    if (base && base.length >= 2 && _smallV[next]) {           // foreign combo: フ＋ァ→fa, テ＋ィ→ti …
      emit(base.slice(0, -1) + _smallV[next]); i++; continue;
    }
    emit(base !== undefined ? base : (KANA_RE.test(raw) ? "" : raw.toLowerCase()));
  }
  return out;
}

// Count-up: animates from 0→target via CSS-less rAF in the foreground, but
// the RESTING value is always `target`, so a frozen/hidden iframe (preview
// capture, PDF export, reduced-motion) shows the correct final number.
function useCountUp(target, dur, run) {
  const [v, setV] = React.useState(target);
  React.useEffect(() => {
    if (!run || document.hidden) { setV(target); return; }
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setV(target); return; }
    let raf; const start = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - start) / (dur || 1100));
      if (p > 0.015) setV(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick); else setV(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run]);
  return v;
}

// Always-visible resting state. We return seen=true so content is never
// gated to opacity:0; entrance flair is done with CSS keyframes that end
// in the visible base style (robust under frozen timers / print / export).
function useInView() {
  const ref = React.useRef(null);
  return [ref, true];
}

// ─────────── generative cover ───────────
function GenCover({ hue, name, size, radius, style, image, thumb }) {
  // Auto-resolve: if no image passed, try looking up the artist in window.ROTATION.
  // This lights up every existing GenCover usage automatically once artist-images.json exists.
  if (!image && name && typeof window !== "undefined" && window.ROTATION) {
    const R = window.ROTATION;
    if (R.byId && R.slug) {
      const id = R.slug(name);
      const a = R.byId[id];
      if (a && a.image) { image = a.image; thumb = a.thumb; }
      // explorable (non-kept) artists carry only a Discogs thumbnail in R.THUMBS
      else if (R.THUMBS && R.THUMBS[id]) { image = R.THUMBS[id]; thumb = R.THUMBS[id]; }
    }
  }
  const h = hashInt(name || "x", 7);
  const variant = h % 4; // 0 wave · 1 rings · 2 strata · 3 split
  const hue2 = (hue + 30 + (h % 40)) % 360;
  const L1 = 0.42, L2 = 0.20;
  const c1 = `oklch(${L1} 0.11 ${hue})`;
  const c2 = `oklch(${L2} 0.07 ${hue2})`;
  const accent = `oklch(0.82 0.13 ${hue})`;
  const initials = (name || "?").split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();

  let fill, extra = null;
  if (variant === 0) {
    fill = { background: `linear-gradient(160deg, ${c1}, ${c2})` };
    const bars = Array.from({ length: 9 }, (_, i) => 28 + ((hashInt(name + i, 3) % 70)));
    extra = (
      <div className="gc-wave" style={{ color: accent }}>
        {bars.map((b, i) => <i key={i} style={{ height: b + "%" }} />)}
      </div>
    );
  } else if (variant === 1) {
    fill = { background: `radial-gradient(circle at 38% 36%, ${c1}, ${c2} 72%)` };
    extra = (
      <div className="gc-rings" style={{
        background: `repeating-radial-gradient(circle at 38% 36%, transparent 0 ${5 + h % 5}%, ${accent}22 ${5 + h % 5}% ${6 + h % 5}%)`
      }} />
    );
  } else if (variant === 2) {
    fill = { background: `repeating-linear-gradient(${20 + h % 90}deg, ${c1} 0 14%, ${c2} 14% 26%)` };
    extra = <div className="gc-fill" style={{ background: `linear-gradient(180deg, transparent, ${c2}cc)` }} />;
  } else {
    fill = { background: `conic-gradient(from ${h % 360}deg at 50% 120%, ${c1}, ${c2}, ${c1})` };
    extra = <div className="gc-tag" />;
  }
  const px = size || 96;
  const npx = typeof px === "number" ? px : 96;
  // Real image when available: small sizes use the 150x thumb, large use the full uri.
  // The generated gradient stays underneath as a load-fallback (and shows if the img 404s).
  const imgUrl = (npx <= 100 ? (thumb || image) : (image || thumb)) || "";
  // backup image source: the Spotify alternate (R.SPOTIMG) — tried if the primary fails, before falling
  // back to the generated cover. Lets a dead Discogs/last.fm hotlink recover automatically.
  const R0 = (typeof window !== "undefined" && window.ROTATION) || null;
  const spotAlt = (R0 && R0.SPOTIMG && name && R0.slug) ? (R0.SPOTIMG[R0.slug(name)] || "") : "";
  const chain = [imgUrl, spotAlt].filter((u, i, a) => u && a.indexOf(u) === i);
  const [srcIdx, setSrcIdx] = React.useState(0);
  React.useEffect(() => { setSrcIdx(0); }, [imgUrl, spotAlt]);
  const cur = chain[srcIdx] || "";
  const showImg = !!cur;
  return (
    <div className="gc" style={{ width: px, height: px, borderRadius: radius != null ? radius : 3, ...style }}>
      <div className="gc-fill" style={fill} />
      {extra}
      <div className="gc-grain" />
      {!showImg && <span className="gc-init" style={{ fontSize: Math.max(9, npx * 0.16) }}>{initials}</span>}
      {showImg && (
        <img src={cur} alt="" loading="lazy" onError={() => setSrcIdx(i => i + 1)}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%",
            objectFit: "cover", borderRadius: "inherit", display: "block" }} />
      )}
    </div>
  );
}

// ─────────── sparkline ───────────
function Spark({ data, w, h, run, stroke, fill }) {
  const W = w || 120, H = h || 32;
  const max = Math.max(...data, 1), min = Math.min(...data, 0);
  const pts = data.map((d, i) => [
    (i / (data.length - 1)) * W,
    H - ((d - min) / (max - min || 1)) * (H - 4) - 2,
  ]);
  const dPath = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const area = dPath + ` L${W} ${H} L0 ${H} Z`;
  const len = 1200;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}
      style={{ display: "block", overflow: "visible", maxWidth: "100%", height: "auto" }}>
      {fill && <path d={area} fill={fill} className="r-spark-fill" />}
      <path d={dPath} fill="none" stroke={stroke || "var(--accent)"} strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round" className="r-spark-line"
        style={{ strokeDasharray: len, strokeDashoffset: 0, "--len": len }} />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.4" fill={stroke || "var(--accent)"} />
    </svg>
  );
}

// ─────────── horizontal bar ───────────
function Bars({ items, run, expressive, max, onHover, onClick }) {
  const mx = max || Math.max(...items.map(i => i.value), 1);
  return (
    <div style={{ display: "grid", gap: "calc(9px * var(--row))" }}>
      {items.map((it, i) => {
        const pct = (it.value / mx) * 100;
        const col = expressive ? `oklch(0.66 0.13 ${it.hue})` : "var(--accent)";
        return (
          <div key={it.id || i} className="r-barrow"
            onMouseEnter={onHover ? (e) => onHover(it, e.currentTarget) : undefined}
            onMouseLeave={onHover ? () => onHover(null) : undefined}
            onClick={onClick ? () => onClick(it) : undefined}
            style={{ display: "grid", gridTemplateColumns: "20px 1fr auto", gap: 12, alignItems: "center",
              cursor: onClick ? "pointer" : "default" }}>
            <span className="r-mono" style={{ fontSize: 10, color: "var(--ink-faint)" }}>{String(i + 1).padStart(2, "0")}</span>
            <div style={{ position: "relative" }}>
              <div style={{ position: "relative", height: 26, borderRadius: 3, overflow: "hidden",
                background: "var(--bg-3)" }}>
                <div className="r-grow" style={{ position: "absolute", inset: 0, width: pct + "%", background: col, opacity: .9,
                  animationDelay: (i * 0.035) + "s", borderRadius: 3 }} />
                <span style={{ position: "absolute", left: 10, top: 0, height: 26, display: "flex", alignItems: "center",
                  fontSize: 12.5, fontWeight: 600, color: "var(--ink)", letterSpacing: ".005em", mixBlendMode: "normal",
                  textShadow: "0 1px 4px rgba(0,0,0,.5)" }}>{it.label}</span>
              </div>
            </div>
            <span className="r-mono" style={{ fontSize: 11, color: "var(--ink-soft)" }}>{fmt(it.value)}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─────────── radar (sound DNA) ───────────
function Radar({ axes, values, values2, run, size }) {
  const S = size || 200, c = S / 2, r = S / 2 - 26;
  const n = axes.length;
  const pt = (i, v) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return [c + Math.cos(a) * r * v, c + Math.sin(a) * r * v];
  };
  const poly = (vals) => vals.map((v, i) => pt(i, run ? v : 0).map(x => x.toFixed(1)).join(",")).join(" ");
  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`}>
      {[0.25, 0.5, 0.75, 1].map((g, i) => (
        <polygon key={i} points={axes.map((_, j) => pt(j, g).join(",")).join(" ")}
          fill="none" stroke="var(--rule-2)" strokeWidth="1" opacity={0.6 - i * 0.1} />
      ))}
      {axes.map((_, j) => { const p = pt(j, 1); return <line key={j} x1={c} y1={c} x2={p[0]} y2={p[1]} stroke="var(--rule)" strokeWidth="1" />; })}
      {values2 && <polygon points={poly(values2)} fill="none" stroke="var(--ink-faint)" strokeWidth="1.3"
        strokeDasharray="3 3" style={{ transition: "all .9s cubic-bezier(.3,.8,.3,1)" }} />}
      <polygon points={poly(values)} fill="var(--accent-bg)" stroke="var(--accent)" strokeWidth="1.8"
        style={{ transition: "all .9s cubic-bezier(.3,.8,.3,1)" }} />
      {axes.map((ax, j) => { const p = pt(j, 1.18);
        return <text key={j} x={p[0]} y={p[1]} fill="var(--ink-soft)" fontSize="8.5" fontFamily="var(--mono)"
          textAnchor="middle" dominantBaseline="middle" style={{ letterSpacing: ".06em", textTransform: "uppercase" }}>{ax}</text>; })}
    </svg>
  );
}

// Boundary — catches a crash inside one routed view so the shell (nav/search/other tabs)
// survives. Essential with test-in-production: a bad record breaks a card, not the site.
class Boundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { try { console.error("[rotation] view crashed:", err, info); } catch (e) {} }
  componentDidUpdate(prev) { if (prev.resetKey !== this.props.resetKey && this.state.err) this.setState({ err: null }); }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="r-view" style={{ padding: "60px var(--pad)" }}>
        <div className="r-card" style={{ padding: 26, maxWidth: 560 }}>
          <div className="r-mono" style={{ fontSize: 10, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: 10 }}>Something broke</div>
          <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 19, lineHeight: 1.45 }}>
            This page hit an error — the rest of the site is fine.
          </div>
          <div className="r-mono" style={{ fontSize: 10, color: "var(--ink-faint)", margin: "12px 0 16px", wordBreak: "break-all" }}>{String(this.state.err && this.state.err.message || this.state.err)}</div>
          <button className="r-search-btn" onClick={() => { this.setState({ err: null }); window.location.hash = ""; }}>← back to overview</button>
        </div>
      </div>
    );
  }
}

Object.assign(window, { cssRotation, fmt, fmtK, hashInt, useCountUp, useInView, GenCover, Spark, Bars, Radar, kanaToRomaji, KANA_RE, Boundary });
