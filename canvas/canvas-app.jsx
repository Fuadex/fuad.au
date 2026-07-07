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
  const HL = window.CANVAS_HIGHLIGHTS || {};
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
              <span className="cv-mus-count">
                {m.works ? `${m.works} in the canon · ` : ""}
                {HL[m.id] ? <a className="cv-deal" href={"#/deck/" + m.id}>deal the deck ({HL[m.id].length}) →</a> : "—"}
              </span>
              {m.note && <span className="cv-mus-note">{m.note}</span>}
            </div>
          ))}
        </React.Fragment>
      ))}
    </div>
  );
}

// ——— Phase 2: the recall deck — "did you see this?" per museum. Verdicts persist in
// localStorage (canvas-deck-<museumId>); the summary's "copy picks" JSON is what gets
// folded into artworks.js. Recognition beats recall: this is how the canon grows.
const VERDICTS = [["no", "didn't see it"], ["unsure", "not sure"], ["yes", "saw it"], ["floored", "floored me ★"]];
function Deck({ museumId, go }) {
  const HL = window.CANVAS_HIGHLIGHTS || {};
  const mus = MUS_BY_ID[museumId];
  const canonQids = useMemo(() => new Set(WORKS.map(w => (AD.artworks[w.id] || {}).qid).filter(Boolean)), []);
  const deck = useMemo(() => (HL[museumId] || []).filter(w => !canonQids.has(w.qid)), [museumId]);
  const storeKey = "canvas-deck-" + museumId;
  const [verdicts, setVerdicts] = useState(() => { try { return JSON.parse(localStorage.getItem(storeKey)) || {}; } catch (e) { return {}; } });
  const firstOpen = deck.findIndex(w => !verdicts[w.qid]);
  const [i, setI] = useState(firstOpen < 0 ? deck.length : firstOpen);
  const [copied, setCopied] = useState(false);

  const judge = (v) => {
    if (i >= deck.length) return;
    const next = { ...verdicts, [deck[i].qid]: v };
    setVerdicts(next);
    localStorage.setItem(storeKey, JSON.stringify(next));
    setI(i + 1);
  };
  useEffect(() => {
    const on = (e) => {
      if (e.key >= "1" && e.key <= "4") judge(VERDICTS[+e.key - 1][0]);
      if (e.key === "Backspace" && i > 0) setI(i - 1);
      if (e.key === "Escape") go("museums");
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [i, verdicts]);

  if (!mus || !deck.length) return <div className="cv-mus"><p>No deck for this museum (yet).</p></div>;

  if (i >= deck.length) {
    const picks = deck.filter(w => verdicts[w.qid] === "yes" || verdicts[w.qid] === "floored")
      .map(w => ({ qid: w.qid, title: w.title, artist: w.artist, year: w.year, verdict: verdicts[w.qid], museum: museumId }));
    const unsure = deck.filter(w => verdicts[w.qid] === "unsure").length;
    const json = JSON.stringify(picks, null, 1);
    return (
      <div className="cv-deck">
        <div className="cv-deck-head">{mus.name.replace(/\s*\(.*\)$/, "")} — deck complete</div>
        <p className="cv-deck-sum">{picks.length} recognised ({picks.filter(p => p.verdict === "floored").length} floored) · {unsure} unsure · {deck.length - picks.length - unsure} not seen.</p>
        {picks.length > 0 && (
          <React.Fragment>
            <ul className="cv-deck-picks">{picks.map(p => <li key={p.qid}>{p.verdict === "floored" ? "★ " : ""}{p.title}{p.artist ? " — " + p.artist : ""}</li>)}</ul>
            <button className="cv-deck-btn" onClick={() => { navigator.clipboard.writeText(json).then(() => setCopied(true)); }}>
              {copied ? "copied ✓" : "copy picks as JSON"}</button>
            <textarea className="cv-deck-json" readOnly value={json} rows={6} />
          </React.Fragment>
        )}
        <button className="cv-deck-btn" onClick={() => { setI(0); }}>re-deal from the top</button>
        <a className="cv-deal" href="#/museums">← back to museums</a>
      </div>
    );
  }

  const w = deck[i];
  return (
    <div className="cv-deck">
      <div className="cv-deck-head">{mus.name.replace(/\s*\(.*\)$/, "")} · did you see this?</div>
      <div className="cv-deck-prog">{i + 1} / {deck.length}{i > 0 ? " · Backspace = back" : ""} · keys 1–4</div>
      <div className="cv-deck-card">
        <img src={w.img} alt={w.title} loading="eager" />
        <div className="cv-deck-label">
          <div className="cv-title">{w.title}</div>
          <div className="cv-artist">{w.artist || "—"}{w.year ? " · " + w.year : ""}</div>
        </div>
      </div>
      <div className="cv-deck-btns">
        {VERDICTS.map(([v, label], k) => (
          <button key={v} data-v={v} onClick={() => judge(v)}><span className="key">{k + 1}</span>{label}</button>
        ))}
      </div>
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
          <a href="#/" data-on={view === "wall" && route.view !== "deck"}>The Wall</a>
          <a href="#/museums" data-on={view === "museums" || route.view === "deck"}>Museums</a>
        </nav>
        {view === "wall" && (
          <div className="cv-mode">
            <button data-on={!salon} onClick={() => setSalon(false)}>Collage</button>
            <button data-on={salon} onClick={() => setSalon(true)}>Salon</button>
          </div>
        )}
      </header>
      {route.view === "deck" ? <Deck museumId={route.id} go={go} key={route.id} />
        : view === "museums" ? <Museums /> : <Wall go={go} />}
      {route.view === "work" && <Reader id={route.id} go={go} />}
      <footer className="cv-foot">
        canvas · a personal gallery, reconstructed from memory · images via <a href="https://commons.wikimedia.org" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a> / <a href="https://www.wikidata.org" target="_blank" rel="noopener noreferrer">Wikidata</a> · part of <a href="/">fuad.au</a>
      </footer>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
