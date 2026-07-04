// Variant 2 — Shelf
// Physical bookshelf metaphor. Items stand as spines, organised by medium.
// Hover a spine → its cover blooms above the shelf with title, note, year.
// Click → external link. Spine width hints at length/heft.

const shelfStyles = `
.shelf-root {
  --paper: #1a1812;
  --shelf: #0e0c08;
  --wood: #2b251c;
  --ink: #f3eee0;
  --ink-soft: #a59a83;
  --ink-faint: #69604e;
  --rule: #3a3225;
  --accent: #e96846;
  --serif: 'Source Serif 4', 'Source Serif Pro', Georgia, serif;
  --sans: 'Inter', -apple-system, system-ui, sans-serif;
  --mono: 'JetBrains Mono', ui-monospace, Menlo, monospace;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--sans);
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
}
.shelf-head {
  padding: 28px 48px 18px;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  border-bottom: 1px solid var(--rule);
}
.shelf-head h1 {
  font-family: var(--serif);
  font-size: 36px;
  font-weight: 400;
  font-style: italic;
  margin: 0;
  letter-spacing: -0.015em;
}
.shelf-head .toggles {
  display: flex;
  gap: 4px;
}
.shelf-toggle {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  padding: 7px 12px;
  background: transparent;
  border: 1px solid var(--rule);
  color: var(--ink-soft);
  border-radius: 999px;
  cursor: pointer;
  transition: all .15s;
}
.shelf-toggle:hover { color: var(--ink); border-color: var(--ink-soft); }
.shelf-toggle.active {
  background: var(--ink);
  color: var(--paper);
  border-color: var(--ink);
}
.shelf-stack {
  flex: 1;
  padding: 16px 0 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 0;
}
.shelf-row {
  position: relative;
  padding: 24px 48px 0;
}
.shelf-label {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-faint);
  margin-bottom: 8px;
  display: flex;
  gap: 14px;
  align-items: baseline;
}
.shelf-label b { color: var(--ink); font-weight: 600; }
.shelf-label .ct { color: var(--ink-soft); }
.shelf-row .row {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 200px;
  position: relative;
  z-index: 1;
}
.shelf-board {
  height: 3px;
  background: linear-gradient(180deg, var(--wood) 0%, var(--shelf) 100%);
  margin-top: 0;
  box-shadow: 0 6px 12px -2px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.04);
  border-radius: 1px;
}
.spine {
  position: relative;
  height: 100%;
  background: var(--spine-color, #5b4a3a);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  text-decoration: none;
  color: inherit;
  transition: transform .25s cubic-bezier(.2,.7,.3,1);
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 1px 1px 0 0;
  box-shadow: inset -2px 0 4px rgba(0,0,0,.25), inset 2px 0 4px rgba(255,255,255,.06);
}
.spine::before, .spine::after {
  content: '';
  position: absolute;
  left: 0; right: 0;
  height: 6px;
  background: rgba(0,0,0,.25);
}
.spine::before { top: 14px; }
.spine::after { bottom: 14px; }
.spine .title {
  font-family: var(--serif);
  font-style: italic;
  font-size: 12px;
  font-weight: 500;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  text-align: center;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 0;
  line-height: 1;
  letter-spacing: 0.01em;
  color: rgba(255,255,255,.92);
  text-shadow: 0 1px 1px rgba(0,0,0,.3);
  overflow: hidden;
  white-space: nowrap;
}
.spine .yr {
  font-family: var(--mono);
  font-size: 8px;
  letter-spacing: 0.08em;
  padding: 4px 0 6px;
  color: rgba(255,255,255,.55);
  writing-mode: vertical-rl;
  transform: rotate(180deg);
}
.spine:hover { transform: translateY(-14px); z-index: 5; }
.spine.face {
  background: transparent !important;
  box-shadow: 0 2px 8px rgba(0,0,0,.5);
}
.spine.face::before, .spine.face::after { display: none; }
.spine.face .title, .spine.face .yr { display: none; }
.spine.face img {
  width: 100%; height: 100%; object-fit: cover;
  display: block;
  border-radius: 1px 1px 0 0;
}
.spine-end {
  height: 100%;
  width: 16px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.12em;
  color: var(--ink-faint);
  margin-left: 8px;
}
.shelf-peek {
  position: absolute;
  top: 0;
  left: var(--peek-x, 0);
  transform: translate(-50%, -100%) translateY(-10px);
  background: var(--paper);
  border: 1px solid var(--rule);
  padding: 10px;
  width: 220px;
  z-index: 20;
  display: grid;
  grid-template-columns: 60px 1fr;
  gap: 10px;
  opacity: 0;
  pointer-events: none;
  transition: opacity .15s, transform .2s;
  box-shadow: 0 16px 40px rgba(0,0,0,.6);
}
.shelf-peek.on { opacity: 1; transform: translate(-50%, -100%) translateY(-4px); }
.shelf-peek img {
  width: 60px; height: 90px;
  object-fit: cover;
  display: block;
  background: #333;
}
.shelf-peek .t {
  font-family: var(--serif);
  font-style: italic;
  font-size: 14px;
  line-height: 1.15;
  letter-spacing: -0.005em;
}
.shelf-peek .m {
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-soft);
  margin-top: 4px;
}
.shelf-peek .n {
  font-family: var(--serif);
  font-style: italic;
  font-size: 11px;
  color: var(--ink-soft);
  margin-top: 6px;
  line-height: 1.35;
  border-top: 1px solid var(--rule);
  padding-top: 6px;
}
.shelf-foot {
  padding: 16px 48px 22px;
  border-top: 1px solid var(--rule);
  display: flex;
  justify-content: space-between;
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-faint);
}
.shelf-foot a {
  color: var(--accent);
  text-decoration: none;
  border-bottom: 1px solid currentColor;
  padding-bottom: 1px;
}
`;

// Deterministic muted spine color from id.
const SPINE_PALETTE = [
  '#6b4a3a', '#3a4a5b', '#5b3a4a', '#4a5b3a',
  '#5b4a3a', '#3a5b4a', '#4a3a5b', '#704835',
  '#3b5260', '#604832', '#523a4a', '#4b5b40',
  '#6b3a2a', '#2a3b5b', '#5b2a3a',
];
function spineColor(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return SPINE_PALETTE[h % SPINE_PALETTE.length];
}
function spineWidth(item) {
  // 18 / 24 / 32 by `length`; movies default ~22.
  if (item.length === 3) return 32;
  if (item.length === 2) return 24;
  if (item.length === 1) return 18;
  // Heuristic by medium:
  if (item.medium === 'Books') return 22;
  if (item.medium === 'TV' || item.medium === 'Animated Series') return 24;
  return 20;
}

function VariantShelf() {
  const { ITEMS, MEDIA, MEDIA_SHORT } = window.CULTURE;
  const [mode, setMode] = React.useState('mixed'); // mixed | spine | face
  const [peek, setPeek] = React.useState(null);
  const peekItem = peek?.item;

  // Take first N of each medium so the shelf reads cleanly inside the artboard.
  const shelves = MEDIA.map(m => {
    const all = ITEMS.filter(i => i.medium === m);
    return { medium: m, items: all, total: all.length };
  });

  return (
    <div className="shelf-root">
      <style dangerouslySetInnerHTML={{ __html: shelfStyles }} />
      <div className="shelf-head">
        <div>
          <h1>The Stacks<span style={{ fontStyle: 'normal', color: 'var(--accent)' }}>.</span></h1>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginTop: 8 }}>
            {ITEMS.length} volumes &nbsp;·&nbsp; hover a spine to peek &nbsp;·&nbsp; click to open
          </div>
        </div>
        <div className="toggles">
          {[['mixed','Mixed'], ['spine','Spines only'], ['face','Covers only']].map(([k, l]) => (
            <button key={k} className={`shelf-toggle${mode === k ? ' active' : ''}`} onClick={() => setMode(k)}>{l}</button>
          ))}
        </div>
      </div>
      <div className="shelf-stack">
        {shelves.map((s, si) => (
          <div className="shelf-row" key={s.medium}>
            <div className="shelf-label">
              <span>{String(si+1).padStart(2,'0')}</span>
              <b>{s.medium}</b>
              <span className="ct">{s.total} entries</span>
            </div>
            <div className="row">
              {s.items.map(item => {
                const isFace = mode === 'face' || (mode === 'mixed' && item.fav);
                const isSpine = !isFace;
                const w = isFace ? 64 : spineWidth(item);
                return (
                  <a
                    key={item.id}
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`spine${isFace ? ' face' : ''}`}
                    style={{
                      width: w,
                      '--spine-color': spineColor(item.id),
                    }}
                    onMouseEnter={e => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const parent = e.currentTarget.closest('.shelf-row').getBoundingClientRect();
                      setPeek({ item, x: rect.left - parent.left + rect.width/2 });
                    }}
                    onMouseLeave={() => setPeek(null)}
                  >
                    {isFace ? (
                      <img src={item.poster} alt={item.title}/>
                    ) : (
                      <>
                        <span className="title">{item.title}</span>
                        <span className="yr">{item.year}</span>
                      </>
                    )}
                  </a>
                );
              })}
              <div className="spine-end">↘</div>
            </div>
            <div className="shelf-board"/>
            {peek && peek.item && s.items.includes(peek.item) && (
              <div className={`shelf-peek on`} style={{ '--peek-x': peek.x + 48 + 'px', left: peek.x + 48 + 'px' }}>
                <img src={peekItem.poster} alt=""/>
                <div>
                  <div className="t">{peekItem.title}</div>
                  <div className="m">{peekItem.year} · {MEDIA_SHORT[peekItem.medium]}</div>
                  {peekItem.note && <div className="n">{peekItem.note}</div>}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

window.VariantShelf = VariantShelf;
