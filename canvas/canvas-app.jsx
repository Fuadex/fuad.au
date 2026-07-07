// canvas-app.jsx — Canvas Phase 1: the wall (collage + salon toggle), Reader, Museums.
// Data: museums.js + artworks.js (hand canon) ⊕ art_data.js (Wikidata/Commons overlay, by id).
// Routes: #/ (wall) · #/museums · #/work/<id>. Confidence renders honestly: "?" = probably,
// "??" = unsure, faded card. No-image works (copyright/TBC) are text-forward cards by design.
const { useState, useEffect, useMemo } = React;

const MUSEUMS = window.CANVAS_MUSEUMS || [];
const WORKS = window.CANVAS_ARTWORKS || [];
const AD = window.CANVAS_ART_DATA || { museums: {}, artworks: {}, artists: {} };

const MUS_BY_ID = {}; for (const m of MUSEUMS) MUS_BY_ID[m.id] = m;
const COUNTRY = { jp: "Japan", us: "United States", fr: "France", ie: "Ireland", gb: "United Kingdom", at: "Austria", pl: "Poland", se: "Sweden", au: "Australia" };

// merged view of one work: hand canon ⊕ overlay
function enrich(w) {
  const d = AD.artworks[w.id] || {};
  const artist = AD.artists[w.artistId] || {};
  const venues = (Array.isArray(w.seenAt) ? w.seenAt : w.seenAt ? [w.seenAt] : []).map(id => MUS_BY_ID[id]).filter(Boolean);
  return { ...w, ...d, artistData: artist, venues, year: w.year || d.year || null };
}

function useRoute() {
  const parse = () => {
    const h = (location.hash || "#/").replace(/^#\/?/, "");
    const [view, id] = h.split("/");
    return { view: view || "wall", id: id || null };
  };
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => setRoute(parse());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

function ConfChip({ conf }) {
  const label = conf === "sure" ? "seen — sure" : conf === "probably" ? "seen — probably" : "seen — unsure";
  return <span className="cv-chip" data-k={"conf-" + conf}>{label}</span>;
}

function Card({ w, go }) {
  const img = w.imgGrid;
  return (
    <div className={"cv-card" + (img ? "" : " cv-text")} data-conf={w.seenConfidence}
      onClick={() => go("work", w.id)} title={w.title}>
      {w.favorite && <span className="cv-fav">★</span>}
      {img && <img src={img} alt={w.title} loading="lazy" />}
      <div className="cv-label">
        <div className="cv-title">{w.label && !/^TBC/.test(w.title) ? w.title : w.title.replace(/^TBC — /, "")}</div>
        <div className="cv-artist">{w.artist.replace(/\s*\(.*\)$/, "")}{w.year ? " · " + w.year : ""}</div>
        {!img && w.note && <div className="cv-note">{w.note.split(" NOTE:")[0].split(" Attribution")[0]}</div>}
        {!img && <div className="cv-why">{/TBC/.test(w.title) ? "awaiting the recall deck" : "image withheld — in-copyright artist"}</div>}
      </div>
    </div>
  );
}

function Wall({ go }) {
  const works = useMemo(() => {
    const all = WORKS.map(enrich);
    // hang order: images first (favorites up top), then the text-forward cards
    return [...all.filter(w => w.imgGrid).sort((a, b) => (b.favorite || 0) - (a.favorite || 0)),
            ...all.filter(w => !w.imgGrid)];
  }, []);
  return (
    <React.Fragment>
      <div className="cv-sub">The art I've stood in front of — {works.length} works and counting, reconstructed from memory. ? marks the uncertain ones; that's honest.</div>
      <div className="cv-wall">{works.map(w => <Card key={w.id} w={w} go={go} />)}</div>
    </React.Fragment>
  );
}

function Reader({ id, go }) {
  const w = useMemo(() => { const x = WORKS.find(x => x.id === id); return x ? enrich(x) : null; }, [id]);
  useEffect(() => {
    const on = (e) => { if (e.key === "Escape") go("wall"); };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);
  if (!w) return null;
  const a = w.artistData;
  const life = a.born ? `${a.born}–${a.died || ""}` : null;
  return (
    <React.Fragment>
      <div className="cv-reader-bg" onClick={() => go("wall")} />
      <div className="cv-reader">
        <button className="cv-r-close" onClick={() => go("wall")}>✕</button>
        {w.img && <img className="hero" src={w.img} alt={w.title} />}
        <div className="cv-r-body">
          <h1 className="cv-r-title">{w.title.replace(/^TBC — /, "")}</h1>
          <div className="cv-r-meta"><b>{w.artist.replace(/\s*\(.*\)$/, "")}</b>{life ? ` · ${life}` : ""}{w.year ? ` · ${w.year}` : ""}{a.desc ? ` · ${a.desc}` : ""}</div>
          <div className="cv-chips">
            <ConfChip conf={w.seenConfidence} />
            {w.floored && <span className="cv-chip" data-k="floored">★ floored me</span>}
            {w.favorite && <span className="cv-chip" data-k="floored">★ favorite</span>}
            {w.via === "exhibition" && <span className="cv-chip">temporary exhibition</span>}
          </div>
          {w.venues.length > 0 && (
            <div className="cv-r-sec"><span className="lbl">Where I saw it</span>
              {w.venues.map(v => `${v.name.replace(/\s*\(.*\)$/, "")}, ${v.city}`).join(" · ")}
              {w.exhibition ? ` — ${w.exhibition}` : ""}
            </div>
          )}
          {w.note && <div className="cv-r-note">{w.note}</div>}
          <div className="cv-r-links">
            {w.qid && <a href={`https://www.wikidata.org/wiki/${w.qid}`} target="_blank" rel="noopener noreferrer">Wikidata ↗</a>}
            {w.imgZoom && <a href={w.imgZoom} target="_blank" rel="noopener noreferrer">Full resolution ↗</a>}
            {a.qid && <a href={`https://www.wikidata.org/wiki/${a.qid}`} target="_blank" rel="noopener noreferrer">{w.artist.split(" ").pop()} on Wikidata ↗</a>}
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}

function Museums() {
  const rows = useMemo(() => {
    const counts = {};
    for (const w of WORKS) for (const id of (Array.isArray(w.seenAt) ? w.seenAt : [w.seenAt])) if (id) counts[id] = (counts[id] || 0) + 1;
    const by = {};
    for (const m of MUSEUMS) (by[m.country] = by[m.country] || []).push({ ...m, ...( AD.museums[m.id] || {}), works: counts[m.id] || 0 });
    return Object.entries(by).sort((a, b) => b[1].length - a[1].length);
  }, []);
  return (
    <div className="cv-mus">
      {rows.map(([cc, list]) => (
        <React.Fragment key={cc}>
          <div className="cv-mus-country">{COUNTRY[cc] || cc}</div>
          {list.map(m => (
            <div className="cv-mus-row" key={m.id} data-kind={m.kind}>
              <span className="cv-mus-name">{m.name.replace(/\s*\(.*\)$/, "")}</span>
              <span className="cv-mus-city">{m.city}{m.visits && m.visits[0] !== "TBC" ? ` · ${m.visits.join(", ")}` : ""}</span>
              <span className="cv-mus-count">{m.works ? `${m.works} work${m.works > 1 ? "s" : ""} in the canon` : "—"}</span>
              {m.note && <span className="cv-mus-note">{m.note}</span>}
            </div>
          ))}
        </React.Fragment>
      ))}
    </div>
  );
}

function App() {
  const route = useRoute();
  const [salon, setSalon] = useState(false);
  useEffect(() => { document.body.dataset.salon = salon; }, [salon]);
  const go = (view, id) => { location.hash = view === "wall" ? "/" : "/" + view + (id ? "/" + id : ""); };
  const view = route.view === "work" ? "wall" : route.view;   // reader overlays the wall
  return (
    <React.Fragment>
      <header className="cv-head">
        <a className="cv-brand" href="#/">Canvas<i>.</i></a>
        <nav className="cv-nav">
          <a href="#/" data-on={view === "wall"}>The Wall</a>
          <a href="#/museums" data-on={view === "museums"}>Museums</a>
        </nav>
        {view === "wall" && (
          <div className="cv-mode">
            <button data-on={!salon} onClick={() => setSalon(false)}>Collage</button>
            <button data-on={salon} onClick={() => setSalon(true)}>Salon</button>
          </div>
        )}
      </header>
      {view === "museums" ? <Museums /> : <Wall go={go} />}
      {route.view === "work" && <Reader id={route.id} go={go} />}
      <footer className="cv-foot">
        canvas · a personal gallery, reconstructed from memory · images via <a href="https://commons.wikimedia.org" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a> / <a href="https://www.wikidata.org" target="_blank" rel="noopener noreferrer">Wikidata</a> · part of <a href="/">fuad.au</a>
      </footer>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
