// Variant 3 — Detail / Reader
// Editorial lightbox. What you see after clicking an item in the wall.
// Big poster, personal note as pulled-quote, "from the same shelf" strip,
// prev/next/shuffle navigation. Gallery-card aesthetic.

const detailStyles = `
.detail {
  --paper: #ebe6dc;
  --card: #f6f3ec;
  --ink: #181410;
  --ink-soft: #4a443c;
  --ink-faint: #8a8175;
  --rule: #b8b0a3;
  --accent: #c63b1c;
  --serif: 'Source Serif 4', 'Source Serif Pro', Georgia, serif;
  --sans: 'Inter', -apple-system, system-ui, sans-serif;
  --mono: 'JetBrains Mono', ui-monospace, Menlo, monospace;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--sans);
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
}
.detail-state {
  position: absolute;
  top: 14px; left: 14px;
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-faint);
  display: flex;
  gap: 10px;
  align-items: center;
}
.detail-state .pip {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--accent);
  animation: dot-blink 1.4s infinite;
}
@keyframes dot-blink { 0%,100%{opacity:1;} 50%{opacity:.25;} }
.detail-close {
  position: absolute;
  top: 12px; right: 14px;
  width: 28px; height: 28px;
  border-radius: 50%;
  border: 1px solid var(--rule);
  background: var(--card);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-soft);
}
.detail-close:hover { color: var(--ink); border-color: var(--ink); }
.detail-grid {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 56px;
  padding: 64px 64px 0;
  height: calc(100% - 220px);
  align-items: start;
}
.detail-poster {
  position: relative;
  aspect-ratio: 2/3;
  background: #222;
  box-shadow: 0 24px 60px -10px rgba(0,0,0,.35), 0 6px 16px rgba(0,0,0,.18);
}
.detail-poster img {
  width: 100%; height: 100%; object-fit: cover; display: block;
}
.detail-poster .stamp {
  position: absolute;
  top: 14px; left: 14px;
  background: var(--accent);
  color: #fff;
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.18em;
  padding: 5px 9px;
  text-transform: uppercase;
}
.detail-body {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.detail-meta {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-soft);
  margin-bottom: 18px;
  display: flex;
  gap: 14px;
  align-items: center;
}
.detail-meta .sep {
  width: 24px;
  height: 1px;
  background: var(--ink-soft);
}
.detail-title {
  font-family: var(--serif);
  font-size: 84px;
  font-weight: 400;
  line-height: 0.95;
  letter-spacing: -0.025em;
  margin: 0 0 12px;
  font-style: italic;
}
.detail-title .punct { font-style: normal; color: var(--accent); }
.detail-pos {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-faint);
  margin-bottom: 28px;
}
.detail-quote {
  font-family: var(--serif);
  font-style: italic;
  font-size: 22px;
  line-height: 1.4;
  letter-spacing: -0.005em;
  color: var(--ink);
  border-left: 2px solid var(--accent);
  padding: 6px 0 6px 22px;
  margin: 0 0 24px;
  max-width: 620px;
}
.detail-quote .open {
  font-family: var(--serif);
  font-size: 48px;
  line-height: 0;
  color: var(--accent);
  vertical-align: -14px;
  margin-right: 6px;
}
.detail-actions {
  display: flex;
  gap: 8px;
  margin-top: auto;
  padding-top: 24px;
}
.detail-btn {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  padding: 11px 18px;
  border: 1px solid var(--ink);
  background: transparent;
  color: var(--ink);
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all .15s;
}
.detail-btn:hover { background: var(--ink); color: var(--paper); }
.detail-btn.primary {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}
.detail-btn.primary:hover { background: var(--ink); border-color: var(--ink); }
.detail-nav {
  position: absolute;
  bottom: 198px;
  right: 64px;
  display: flex;
  gap: 6px;
  align-items: center;
}
.detail-nav button {
  width: 36px; height: 36px;
  border-radius: 50%;
  border: 1px solid var(--rule);
  background: var(--card);
  cursor: pointer;
  color: var(--ink-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all .15s;
}
.detail-nav button:hover {
  background: var(--ink);
  color: var(--paper);
  border-color: var(--ink);
}
.detail-nav .count {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-faint);
  padding: 0 10px;
  font-variant-numeric: tabular-nums;
}
.detail-strip {
  position: absolute;
  left: 0; right: 0; bottom: 0;
  background: var(--card);
  border-top: 1px solid var(--rule);
  padding: 18px 64px 24px;
}
.detail-strip .label {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-faint);
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
}
.detail-strip .row {
  display: flex;
  gap: 10px;
}
.detail-strip .row a {
  position: relative;
  width: 84px;
  aspect-ratio: 2/3;
  flex-shrink: 0;
  display: block;
  overflow: hidden;
  cursor: pointer;
  transition: transform .2s;
}
.detail-strip .row a:hover { transform: translateY(-3px); }
.detail-strip .row img {
  width: 100%; height: 100%; object-fit: cover; display: block;
  transition: filter .2s;
}
.detail-strip .row a:hover img { filter: brightness(1.1); }
.detail-strip .row a.current::after {
  content: '';
  position: absolute;
  inset: 0;
  border: 2px solid var(--accent);
}
.detail-strip .row a .cap {
  position: absolute;
  left: 0; right: 0; bottom: 0;
  padding: 14px 6px 4px;
  background: linear-gradient(180deg, transparent, rgba(0,0,0,.85));
  color: #fff;
  font-family: var(--mono);
  font-size: 8px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  opacity: 0;
  transition: opacity .2s;
}
.detail-strip .row a:hover .cap { opacity: 1; }
`;

function VariantDetail() {
  const { ITEMS, MEDIA, MEDIA_SHORT } = window.CULTURE;
  // Items that have personal notes — those are the showpieces.
  const noted = ITEMS.filter(i => i.note);
  const [idx, setIdx] = React.useState(noted.findIndex(i => i.id === 'come-and-see'));
  const item = noted[idx];
  const prev = () => setIdx(i => (i - 1 + noted.length) % noted.length);
  const next = () => setIdx(i => (i + 1) % noted.length);
  const shuffle = () => setIdx(Math.floor(Math.random() * noted.length));

  // "From the same shelf" — same medium, exclude current. Pick 9 nearest by year.
  const adjacent = React.useMemo(() => {
    return ITEMS
      .filter(i => i.medium === item.medium && i.id !== item.id)
      .sort((a, b) => Math.abs((a.year||0) - (item.year||0)) - Math.abs((b.year||0) - (item.year||0)))
      .slice(0, 9);
  }, [item]);

  // Position in medium
  const inMedium = ITEMS.filter(i => i.medium === item.medium);
  const posInMedium = inMedium.findIndex(i => i.id === item.id) + 1;

  return (
    <div className="detail">
      <style dangerouslySetInnerHTML={{ __html: detailStyles }} />
      <div className="detail-state">
        <span className="pip"/>
        Detail · Lightbox · Reader
      </div>
      <button className="detail-close" title="Back to wall">
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeLinecap="round"/>
        </svg>
      </button>

      <div className="detail-grid">
        <div className="detail-poster">
          <img src={item.poster} alt={item.title}/>
          {item.fav && <div className="stamp">★ Standout</div>}
        </div>
        <div className="detail-body">
          <div className="detail-meta">
            <span>{MEDIA_SHORT[item.medium]}</span>
            <span className="sep"/>
            <span>{item.year}</span>
            <span className="sep"/>
            <span>№ {String(posInMedium).padStart(3, '0')} / {String(inMedium.length).padStart(3, '0')}</span>
          </div>
          <h1 className="detail-title">
            {item.title}
            <span className="punct">.</span>
          </h1>
          <div className="detail-pos">Fuad's Library &nbsp;/&nbsp; {item.medium}</div>

          {item.note && (
            <blockquote className="detail-quote">
              <span className="open">"</span>{item.note}
            </blockquote>
          )}

          <div className="detail-actions">
            <a className="detail-btn primary" href={item.link} target="_blank" rel="noopener noreferrer">
              Open on {item.link.includes('goodreads') ? 'Goodreads' : item.link.includes('imdb') ? 'IMDb' : 'Filmweb'}
              <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                <path d="M3 3h6v6M3 9l6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
            <button className="detail-btn" onClick={shuffle}>
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="1" width="9" height="9" rx="1.5" stroke="currentColor"/>
                <rect x="6" y="6" width="9" height="9" rx="1.5" stroke="currentColor"/>
                <circle cx="3.5" cy="3.5" r="1" fill="currentColor"/>
                <circle cx="8.5" cy="8.5" r="1" fill="currentColor"/>
                <circle cx="12.5" cy="12.5" r="1" fill="currentColor"/>
              </svg>
              Surprise me
            </button>
          </div>
        </div>
      </div>

      <div className="detail-nav">
        <button onClick={prev} title="Previous">
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M8 2l-4 4 4 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <span className="count">{String(idx+1).padStart(2,'0')} / {String(noted.length).padStart(2,'0')}</span>
        <button onClick={next} title="Next">
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>

      <div className="detail-strip">
        <div className="label">
          <span>From the same shelf · {item.medium}</span>
          <span>Hover to preview · click to jump</span>
        </div>
        <div className="row">
          {adjacent.map(a => (
            <a key={a.id}
               onClick={() => {
                 const ni = noted.findIndex(n => n.id === a.id);
                 if (ni >= 0) setIdx(ni);
               }}
               href={a.link}
               target="_blank"
               rel="noopener noreferrer">
              <img src={a.poster} alt={a.title}/>
              <div className="cap">{a.title} · {a.year}</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

window.VariantDetail = VariantDetail;
