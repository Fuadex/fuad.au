// Variant 1 — Wall
// Refined archival aesthetic. One dense unified grid with filter chips,
// search, sort, shuffle. Hover lifts the poster and reveals a typewriter
// caption — favourites carry a personal note. Click → external link.

const wallStyles = `
.wall {
  --paper: #f6f3ec;
  --ink: #1a1612;
  --ink-soft: #56504a;
  --ink-faint: #98908a;
  --rule: #c4bdb2;
  --accent: #c63b1c;
  --paper-tint: #efeae0;
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
.wall-head {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: end;
  gap: 24px;
  padding: 36px 48px 18px;
  border-bottom: 1px solid var(--rule);
}
.wall-head h1 {
  font-family: var(--serif);
  font-weight: 400;
  font-size: 64px;
  letter-spacing: -0.02em;
  line-height: 1;
  margin: 0;
  font-style: italic;
}
.wall-head .sub {
  font-family: var(--mono);
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.14em;
  color: var(--ink-soft);
  margin-top: 14px;
}
.wall-head .sub b { color: var(--ink); font-weight: 600; }
.wall-head .tagline {
  font-family: var(--serif);
  font-style: italic;
  font-size: 16px;
  color: var(--ink-soft);
  max-width: 340px;
  text-align: right;
  line-height: 1.4;
}
.wall-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 48px;
  border-bottom: 1px solid var(--rule);
  background: var(--paper);
  flex-wrap: wrap;
}
.wall-chips {
  display: flex;
  gap: 4px;
  flex: 1;
  flex-wrap: wrap;
}
.wall-chip {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 7px 12px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--ink-soft);
  cursor: pointer;
  border-radius: 999px;
  transition: all .15s;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}
.wall-chip:hover { color: var(--ink); background: var(--paper-tint); }
.wall-chip.active {
  background: var(--ink);
  color: var(--paper);
  border-color: var(--ink);
}
.wall-chip .ct {
  font-size: 9px;
  opacity: .65;
  font-variant-numeric: tabular-nums;
}
.wall-chip.active .ct { opacity: .85; }
.wall-search {
  display: flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: 1px solid var(--rule);
  border-radius: 999px;
  padding: 6px 14px;
  width: 200px;
  transition: border-color .15s;
}
.wall-search:focus-within { border-color: var(--ink); }
.wall-search svg { color: var(--ink-faint); flex-shrink: 0; }
.wall-search input {
  border: 0; outline: 0; background: transparent;
  font: 13px var(--sans);
  color: var(--ink);
  width: 100%;
}
.wall-search input::placeholder { color: var(--ink-faint); }
.wall-sort {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  border: 1px solid var(--rule);
  background: transparent;
  color: var(--ink-soft);
  padding: 7px 12px 7px 14px;
  border-radius: 999px;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='6' viewBox='0 0 8 6'%3E%3Cpath fill='%2356504a' d='M0 0h8L4 6z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 28px;
}
.wall-shuffle {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  background: var(--accent);
  color: #fff;
  border: 0;
  padding: 8px 14px;
  border-radius: 999px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: filter .15s;
}
.wall-shuffle:hover { filter: brightness(1.1); }
.wall-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 10px;
  padding: 26px 48px 48px;
  overflow: hidden;
  align-content: start;
  flex: 1;
}
.wall-cell {
  position: relative;
  aspect-ratio: 2 / 3;
  background: var(--paper-tint);
  cursor: pointer;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition: transform .25s cubic-bezier(.2,.7,.3,1), filter .2s;
}
.wall-cell img {
  width: 100%; height: 100%; object-fit: cover;
  display: block;
  transition: transform .35s cubic-bezier(.2,.7,.3,1);
}
.wall-cell:hover { transform: translateY(-3px); }
.wall-cell:hover img { transform: scale(1.04); filter: contrast(1.05); }
.wall-cell.dim { filter: grayscale(.7) opacity(.35); }
.wall-cell .star {
  position: absolute; top: 6px; right: 6px;
  width: 14px; height: 14px;
  background: var(--accent);
  border-radius: 50%;
  box-shadow: 0 0 0 2px var(--paper);
  opacity: 0;
  transition: opacity .2s;
}
.wall-cell.fav .star { opacity: 1; }
.wall-cell .meta {
  position: absolute; left: 0; right: 0; bottom: 0;
  padding: 28px 10px 8px;
  background: linear-gradient(180deg, transparent, rgba(0,0,0,.85));
  color: #fff;
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0;
  transform: translateY(8px);
  transition: opacity .2s, transform .2s;
  pointer-events: none;
}
.wall-cell:hover .meta { opacity: 1; transform: translateY(0); }
.wall-cell .meta .t {
  font-family: var(--serif);
  font-style: italic;
  font-size: 13px;
  text-transform: none;
  letter-spacing: 0;
  line-height: 1.2;
  margin-bottom: 3px;
}
.wall-cell .pulse {
  position: absolute;
  inset: 0;
  border: 2px solid var(--accent);
  pointer-events: none;
  opacity: 0;
  animation: wall-pulse 1.4s ease-out;
}
@keyframes wall-pulse {
  0%   { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(1.15); }
}
.wall-spotlight {
  position: absolute;
  left: 48px; right: 48px;
  bottom: 18px;
  background: var(--ink);
  color: var(--paper);
  padding: 14px 18px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 14px;
  align-items: center;
  font-family: var(--serif);
  font-style: italic;
  font-size: 14px;
  line-height: 1.4;
  opacity: 0;
  transform: translateY(10px);
  transition: opacity .25s, transform .25s;
  pointer-events: none;
}
.wall-spotlight.on { opacity: 1; transform: translateY(0); }
.wall-spotlight .label {
  font-family: var(--mono);
  font-style: normal;
  font-size: 9px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--accent);
}
`;

function VariantWall() {
  const { ITEMS, MEDIA } = window.CULTURE;
  const [filter, setFilter] = React.useState('All');
  const [query, setQuery] = React.useState('');
  const [sort, setSort] = React.useState('default');
  const [pulse, setPulse] = React.useState(null);
  const [spotlight, setSpotlight] = React.useState(null);
  const counts = React.useMemo(() => {
    const c = { All: ITEMS.length };
    for (const m of MEDIA) c[m] = ITEMS.filter(i => i.medium === m).length;
    return c;
  }, []);

  const items = React.useMemo(() => {
    let arr = ITEMS.slice();
    if (filter !== 'All') arr = arr.filter(i => i.medium === filter);
    if (query) {
      const q = query.toLowerCase();
      arr = arr.filter(i => i.title.toLowerCase().includes(q));
    }
    if (sort === 'year-desc') arr.sort((a, b) => (b.year || 0) - (a.year || 0));
    else if (sort === 'year-asc') arr.sort((a, b) => (a.year || 9999) - (b.year || 9999));
    else if (sort === 'title') arr.sort((a, b) => a.title.localeCompare(b.title));
    return arr;
  }, [filter, query, sort]);

  const shuffle = () => {
    const favs = items.filter(i => i.fav && i.note);
    const pool = favs.length ? favs : items;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setPulse(pick.id);
    setSpotlight(pick);
    setTimeout(() => setPulse(null), 1500);
    setTimeout(() => setSpotlight(null), 4500);
    // scroll item into view-ish — within artboard we don't scroll
  };

  return (
    <div className="wall">
      <style dangerouslySetInnerHTML={{ __html: wallStyles }} />
      <div className="wall-head">
        <div>
          <h1>Culture<span style={{ fontStyle:'normal', color: 'var(--accent)' }}>.</span></h1>
          <div className="sub">
            A library of what shaped me &nbsp;·&nbsp;
            <b>{counts.All}</b> entries &nbsp;·&nbsp;
            updated weekly
          </div>
        </div>
        <div className="tagline">
          Things I watched, read, played, and could not<br/>
          stop thinking about afterward.
        </div>
      </div>
      <div className="wall-toolbar">
        <div className="wall-chips">
          {['All', ...MEDIA].map(m => (
            <button
              key={m}
              className={`wall-chip${filter === m ? ' active' : ''}`}
              onClick={() => setFilter(m)}
            >
              {m} <span className="ct">{counts[m]}</span>
            </button>
          ))}
        </div>
        <div className="wall-search">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="5" cy="5" r="3.5" stroke="currentColor"/>
            <path d="M8 8l3 3" stroke="currentColor" strokeLinecap="round"/>
          </svg>
          <input
            placeholder="Search the library…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <select className="wall-sort" value={sort} onChange={e => setSort(e.target.value)}>
          <option value="default">Sort · Curated</option>
          <option value="year-desc">Year ↓</option>
          <option value="year-asc">Year ↑</option>
          <option value="title">A → Z</option>
        </select>
        <button className="wall-shuffle" onClick={shuffle}>
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="1" width="9" height="9" rx="1.5" stroke="currentColor"/>
            <rect x="6" y="6" width="9" height="9" rx="1.5" stroke="currentColor" fill="currentColor" fillOpacity=".0"/>
            <circle cx="3.5" cy="3.5" r="1" fill="currentColor"/>
            <circle cx="8.5" cy="8.5" r="1" fill="currentColor"/>
            <circle cx="12.5" cy="12.5" r="1" fill="currentColor"/>
          </svg>
          Pick one for me
        </button>
      </div>
      <div className="wall-grid">
        {items.map(item => (
          <a
            key={item.id}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className={`wall-cell${item.fav ? ' fav' : ''}${spotlight && spotlight.id !== item.id ? ' dim' : ''}`}
            title={item.title}
          >
            <img src={item.poster} alt={item.title} loading="lazy"/>
            <span className="star"/>
            <div className="meta">
              <div className="t">{item.title}</div>
              <div>{item.year} · {window.CULTURE.MEDIA_SHORT[item.medium]}</div>
            </div>
            {pulse === item.id && <span className="pulse"/>}
          </a>
        ))}
      </div>
      <div className={`wall-spotlight${spotlight ? ' on' : ''}`}>
        <div className="label">Picked for you</div>
        <div>
          {spotlight && (
            <>
              <b style={{ fontStyle: 'normal', fontFamily: 'var(--serif)' }}>{spotlight.title}</b>
              {spotlight.note && <> &nbsp;— &nbsp;{spotlight.note}</>}
            </>
          )}
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontStyle:'normal', fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', opacity: .7 }}>
          {spotlight && `${spotlight.year} · ${window.CULTURE.MEDIA_SHORT[spotlight.medium]}`}
        </div>
      </div>
    </div>
  );
}

window.VariantWall = VariantWall;
