// canvas-app.jsx — Canvas Phase 1: the wall (collage + salon toggle), Reader, Museums.
// Data: museums.js + artworks.js (hand canon) ⊕ art_data.js (Wikidata/Commons overlay, by id).
// Routes: #/ (wall) · #/museums · #/work/<id>. Confidence renders honestly: "?" = probably,
// "??" = unsure, faded card. No-image works (copyright/TBC) are text-forward cards by design.
const { useState, useEffect, useMemo } = React;

const MUSEUMS = window.CANVAS_MUSEUMS || [];
const WORKS = window.CANVAS_ARTWORKS || [];
const AD = window.CANVAS_ART_DATA || { museums: {}, artworks: {}, artists: {} };

const MUS_BY_ID = {}; for (const m of MUSEUMS) MUS_BY_ID[m.id] = m;
const COUNTRY = { jp: "Japan", us: "United States", fr: "France", ie: "Ireland", gb: "United Kingdom", at: "Austria", pl: "Poland", se: "Sweden", au: "Australia", nl: "Netherlands", ch: "Switzerland", de: "Germany", ca: "Canada", it: "Italy", gr: "Greece", kr: "South Korea" };

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
      {(w.favorite || w.floored) ? <span className="cv-fav">★</span> : w.liked ? <span className="cv-fav">♡</span> : null}
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

// ——— the Wall: filter chips × museum select × sort, capped at 48 with reversible load-more.
// Sorts: "hang" (floored → loved → the rest, images first) · year · artist · museum.
const CAP = 48;
const FILTERS = [["all", "all"], ["floored", "★ floored"], ["loved", "♥ loved"], ["sure", "seen — sure"], ["unsure", "unsure"], ["wish", "pilgrimage"]];
const weight = (w) => (w.floored || w.favorite) ? 0 : (w.liked ? 1 : 2);
function Wall({ go }) {
  const all = useMemo(() => WORKS.map(enrich), []);
  const [filt, setFilt] = useState("all");
  const [mus, setMus] = useState("");
  const [sort, setSort] = useState("hang");
  const [extra, setExtra] = useState(0);
  useEffect(() => { setExtra(0); }, [filt, mus, sort]);

  const shown = useMemo(() => {
    let list = all;
    if (filt === "floored") list = list.filter(w => w.floored || w.favorite);
    if (filt === "loved") list = list.filter(w => w.floored || w.favorite || w.liked);
    if (filt === "sure") list = list.filter(w => w.seenConfidence === "sure");
    if (filt === "unsure") list = list.filter(w => w.seenConfidence !== "sure");
    if (filt === "wish") list = list.filter(w => w.wish);
    if (mus) list = list.filter(w => (Array.isArray(w.seenAt) ? w.seenAt : [w.seenAt || w.at]).includes(mus));
    const arr = [...list];
    if (sort === "hang") arr.sort((a, b) => (b.imgGrid ? 1 : 0) - (a.imgGrid ? 1 : 0) || weight(a) - weight(b));
    if (sort === "year") arr.sort((a, b) => (a.year || 9999) - (b.year || 9999));
    if (sort === "artist") arr.sort((a, b) => a.artist.localeCompare(b.artist) || (a.year || 0) - (b.year || 0));
    if (sort === "museum") arr.sort((a, b) => String(a.seenAt).localeCompare(String(b.seenAt)) || weight(a) - weight(b));
    return arr;
  }, [all, filt, mus, sort]);
  const visN = CAP + extra;
  const musOpts = useMemo(() => {
    const counts = {};
    for (const w of all) for (const id of (Array.isArray(w.seenAt) ? w.seenAt : [w.seenAt || w.at])) if (id) counts[id] = (counts[id] || 0) + 1;
    return MUSEUMS.filter(m => counts[m.id]).map(m => ({ id: m.id, label: m.name.replace(/\s*\(.*\)$/, "") + " (" + counts[m.id] + ")" }));
  }, [all]);

  return (
    <React.Fragment>
      <div className="cv-filters">
        {FILTERS.map(([v, label]) => (
          <button key={v} data-on={filt === v} onClick={() => setFilt(v)}>{label}</button>
        ))}
        <select value={mus} onChange={e => setMus(e.target.value)}>
          <option value="">every museum</option>
          {musOpts.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)}>
          <option value="hang">hang order</option>
          <option value="year">by year</option>
          <option value="artist">by artist</option>
          <option value="museum">by museum</option>
        </select>
        <span className="cv-count">{Math.min(visN, shown.length)} of {shown.length}</span>
      </div>
      <div className="cv-wall">{shown.slice(0, visN).map(w => <Card key={w.id} w={w} go={go} />)}</div>
      {shown.length > visN && (
        <div className="cv-more"><button onClick={() => setExtra(e => e + CAP)}>hang {Math.min(CAP, shown.length - visN)} more</button></div>
      )}
    </React.Fragment>
  );
}

// ——— Pilgrimage: deck-derived wishes (artworks.js wish:true) grouped by holding museum,
// plus hand-authored places (pilgrimage.js) the decks can't know — the trip planner seed.
function Pilgrimage({ go }) {
  const PL = window.CANVAS_PILGRIMAGE || [];
  const groups = useMemo(() => {
    const wishes = WORKS.map(enrich).filter(w => w.wish);
    const by = {};
    for (const w of wishes) {
      const mid = (Array.isArray(w.seenAt) ? w.seenAt[0] : w.seenAt) || w.at;
      const m = MUS_BY_ID[mid];
      const key = m ? m.city + " — " + m.name.replace(/\s*\(.*\)$/, "") : "location TBC";
      (by[key] = by[key] || []).push(w);
    }
    return Object.entries(by).sort((a, b) => b[1].length - a[1].length);
  }, []);
  const total = groups.reduce((s, [, l]) => s + l.length, 0);
  return (
    <div className="cv-mus">
      <p className="cv-deck-sum">{total} works you'd love to stand in front of (deliberately, this time) · grows with every deck you deal.</p>
      {groups.map(([key, list]) => (
        <React.Fragment key={key}>
          <div className="cv-mus-country">{key}</div>
          {list.map(w => (
            <div className="cv-mus-row" key={w.id}>
              {w.imgGrid && <img className="cv-pil-thumb" src={w.imgGrid} alt="" loading="lazy" onClick={() => go("work", w.id)} />}
              <span className="cv-mus-name" style={{ cursor: "pointer" }} onClick={() => go("work", w.id)}>{w.floored || (w.liked && w.wish) ? "♥ " : "♡ "}{w.title}</span>
              <span className="cv-mus-city">{w.artist.replace(/\s*\(.*\)$/, "")}{w.year ? " · " + w.year : ""}</span>
            </div>
          ))}
        </React.Fragment>
      ))}
      {PL.length > 0 && (
        <React.Fragment>
          <div className="cv-mus-country">Places</div>
          {PL.map(p => (
            <div className="cv-mus-row" key={p.id}>
              <span className="cv-mus-name">{p.title}</span>
              <span className="cv-mus-city">{p.city}</span>
              {p.note && <span className="cv-mus-note">{p.note}</span>}
            </div>
          ))}
        </React.Fragment>
      )}
    </div>
  );
}

// full-screen pan/zoom (Phase 5 "stand close to the brushwork" mode) — dependency-free:
// scroll to zoom (1–8×), drag to pan, double-click resets, Esc closes. Uses a 3200px thumb.
function Zoom({ src, onClose }) {
  const [t, setT] = useState({ s: 1.6, x: 0, y: 0 });
  const drag = React.useRef(null);
  useEffect(() => {
    const on = (e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", on, true);
    return () => window.removeEventListener("keydown", on, true);
  }, []);
  return (
    <div className="cv-zoom"
      onWheel={e => { e.preventDefault(); setT(v => ({ ...v, s: Math.min(8, Math.max(1, v.s * (e.deltaY < 0 ? 1.15 : 0.87))) })); }}
      onMouseDown={e => { drag.current = { mx: e.clientX, my: e.clientY, x: t.x, y: t.y }; }}
      onMouseMove={e => { if (drag.current) setT(v => ({ ...v, x: drag.current.x + e.clientX - drag.current.mx, y: drag.current.y + e.clientY - drag.current.my })); }}
      onMouseUp={() => { drag.current = null; }}
      onDoubleClick={() => setT({ s: 1.6, x: 0, y: 0 })}>
      <img src={src.replace(/width=\d+/, "width=3200")} alt=""
        style={{ transform: `translate(${t.x}px,${t.y}px) scale(${t.s})` }} draggable="false" />
      <button className="cv-r-close cv-zoom-close" onClick={onClose}>✕</button>
      <div className="cv-zoom-hint">scroll to zoom · drag to pan · double-click resets · Esc closes</div>
    </div>
  );
}

function Reader({ id, go }) {
  const w = useMemo(() => { const x = WORKS.find(x => x.id === id); return x ? enrich(x) : null; }, [id]);
  const [zoom, setZoom] = useState(false);
  const [tier, setTier] = useState("about");
  useEffect(() => { setZoom(false); setTier("about"); }, [id]);
  useEffect(() => {
    const on = (e) => { if (e.key === "Escape" && !zoom) go("wall"); };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [zoom]);
  if (!w) return null;
  const a = w.artistData;
  const life = a.born ? `${a.born}–${a.died || ""}` : null;
  const pal = (window.CANVAS_PALETTE || {})[id];
  const read = (window.CANVAS_ART_ABOUT || {})[id];
  return (
    <React.Fragment>
      <div className="cv-reader-bg" onClick={() => go("wall")} />
      <div className="cv-reader">
        <button className="cv-r-close" onClick={() => go("wall")}>✕</button>
        {w.img && <img className="hero" src={w.img} alt={w.title} title="click to zoom" style={{ cursor: "zoom-in" }} onClick={() => setZoom(true)} />}
        <div className="cv-r-body">
          <h1 className="cv-r-title">{w.title.replace(/^TBC — /, "")}</h1>
          <div className="cv-r-meta"><b style={{ cursor: "pointer" }} title="artist page" onClick={() => go("artist", w.artistId)}>{w.artist.replace(/\s*\(.*\)$/, "")}</b>{life ? ` · ${life}` : ""}{w.year ? ` · ${w.year}` : ""}{a.desc ? ` · ${a.desc}` : ""}</div>
          <div className="cv-chips">
            <ConfChip conf={w.seenConfidence} />
            {w.floored && <span className="cv-chip" data-k="floored">★ floored me</span>}
            {w.favorite && <span className="cv-chip" data-k="floored">★ favorite</span>}
            {w.liked && !w.floored && <span className="cv-chip" data-k="floored">♡ liked</span>}
            {w.wish && <span className="cv-chip">pilgrimage — not yet seen</span>}
            {w.via === "exhibition" && <span className="cv-chip">temporary exhibition</span>}
          </div>
          {w.venues.length > 0 && (
            <div className="cv-r-sec"><span className="lbl">Where I saw it{w.venues.length > 1 ? " — an impression at each" : ""}</span>
              {w.venues.map(v => `${v.name.replace(/\s*\(.*\)$/, "")}, ${v.city}`).join(" · ")}
              {w.exhibition ? ` — ${w.exhibition}` : ""}
            </div>
          )}
          {read && (
            <div className="cv-r-read">
              <div className="cv-r-read-head">
                <span className="lbl">The read</span>
                <div className="cv-r-tiers">
                  <button data-on={tier === "about"} onClick={() => setTier("about")}>Info</button>
                  <button data-on={tier === "deep"} onClick={() => setTier("deep")}>Interpretation</button>
                </div>
              </div>
              <div className="cv-r-read-txt">{tier === "deep" ? read.deep : read.about}</div>
            </div>
          )}
          {pal && (
            <div className="cv-r-sec"><span className="lbl">Palette</span>
              <span className="cv-pal">{pal.map(c => <i key={c} style={{ background: c }} title={c} />)}</span>
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
      {zoom && w.imgZoom && <Zoom src={w.imgZoom} onClose={() => setZoom(false)} />}
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

// ——— Phase 2: the recall deck — a core Canvas instrument. Two independent axes per card:
// SEEN (memory: didn't see / not sure / saw it — the tap that advances) and FEELING
// (♡ like / ♥ love — optional toggle, set before the seen-tap). Floored = saw it + ♥.
// "Didn't see it + ♥" is the most valuable answer of all: it builds the Pilgrimage list.
// Verdicts persist in localStorage as {seen, love}; the summary exports JSON for folding
// into artworks.js / pilgrimage.js. Old-format string verdicts are migrated on load.
const SEEN_OPTS = [["no", "didn't see it"], ["unsure", "not sure"], ["yes", "saw it"]];
const LOVE_OPTS = [[0, "○ nothing special"], [1, "♡ like it"], [2, "♥ love it"]];
const migrateVerdict = (v) => typeof v === "string"
  ? { seen: v === "floored" ? "yes" : v, love: v === "floored" ? 2 : 0 } : v;
function Deck({ museumId, go }) {
  const HL = window.CANVAS_HIGHLIGHTS || {};
  const mus = MUS_BY_ID[museumId];
  const canonQids = useMemo(() => new Set(WORKS.map(w => (AD.artworks[w.id] || {}).qid).filter(Boolean)), []);
  const deck = useMemo(() => (HL[museumId] || []).filter(w => !canonQids.has(w.qid)), [museumId]);
  const storeKey = "canvas-deck-" + museumId;
  const [verdicts, setVerdicts] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(storeKey)) || {};
      const out = {}; for (const q of Object.keys(raw)) out[q] = migrateVerdict(raw[q]);
      return out;
    } catch (e) { return {}; }
  });
  const firstOpen = deck.findIndex(w => !verdicts[w.qid]);
  const [i, setI] = useState(firstOpen < 0 ? deck.length : firstOpen);
  const [love, setLove] = useState(0);
  const [copied, setCopied] = useState(false);
  useEffect(() => {   // returning to an answered card (Backspace) restores its feeling
    const w = deck[i]; setLove(w && verdicts[w.qid] ? verdicts[w.qid].love : 0);
  }, [i]);

  const judge = (seenV) => {
    if (i >= deck.length) return;
    const next = { ...verdicts, [deck[i].qid]: { seen: seenV, love } };
    setVerdicts(next);
    localStorage.setItem(storeKey, JSON.stringify(next));
    setI(i + 1);
  };
  useEffect(() => {
    const on = (e) => {
      if (e.key >= "1" && e.key <= "3") judge(SEEN_OPTS[+e.key - 1][0]);
      if (e.key === "4") setLove(love === 1 ? 0 : 1);
      if (e.key === "5") setLove(love === 2 ? 0 : 2);
      if (e.key === "Backspace" && i > 0) setI(i - 1);
      if (e.key === "Escape") go("museums");
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [i, verdicts, love]);

  if (!mus || !deck.length) return <div className="cv-mus"><p>No deck for this museum (yet).</p></div>;

  if (i >= deck.length) {
    const rows = deck.filter(w => verdicts[w.qid] && (verdicts[w.qid].seen !== "no" || verdicts[w.qid].love > 0))
      .map(w => ({ qid: w.qid, title: w.title, artist: w.artist, year: w.year, museum: museumId, ...verdicts[w.qid] }));
    const seen = rows.filter(r => r.seen === "yes");
    const discoveries = rows.filter(r => r.seen !== "yes" && r.love > 0);
    const json = JSON.stringify(rows, null, 1);
    return (
      <div className="cv-deck">
        <div className="cv-deck-head">{mus.name.replace(/\s*\(.*\)$/, "")} — deck complete</div>
        <p className="cv-deck-sum">{seen.length} recognised ({seen.filter(r => r.love === 2).length} floored) · {rows.filter(r => r.seen === "unsure").length} unsure · {discoveries.length} discoveries you'd love to see.</p>
        {seen.length > 0 && (
          <React.Fragment>
            <div className="cv-deck-secl">Seen</div>
            <ul className="cv-deck-picks">{seen.map(p => <li key={p.qid}>{p.love === 2 ? "★ " : p.love === 1 ? "♡ " : ""}{p.title}{p.artist ? " — " + p.artist : ""}</li>)}</ul>
          </React.Fragment>
        )}
        {discoveries.length > 0 && (
          <React.Fragment>
            <div className="cv-deck-secl">Discoveries → pilgrimage</div>
            <ul className="cv-deck-picks">{discoveries.map(p => <li key={p.qid}>{p.love === 2 ? "♥ " : "♡ "}{p.title}{p.artist ? " — " + p.artist : ""}</li>)}</ul>
          </React.Fragment>
        )}
        {rows.length > 0 && (
          <React.Fragment>
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
      <div className="cv-deck-prog">{i + 1} / {deck.length} · 1–3 seen · 4 ♡ · 5 ♥{i > 0 ? " · Backspace = back" : ""}</div>
      <div className="cv-deck-card" key={w.qid}>{/* remount per card: stale image must not linger under the next label */}
        <img src={w.img} alt={w.title} loading="eager" />
        <div className="cv-deck-label">
          <div className="cv-title">{w.title}</div>
          <div className="cv-artist">{w.artist || "—"}{w.year ? " · " + w.year : ""}</div>
        </div>
      </div>
      <div className="cv-deck-love">
        {LOVE_OPTS.map(([v, label]) => (
          <button key={v} data-on={love === v} data-love={v} onClick={() => setLove(v)}>{label}</button>
        ))}
      </div>
      <div className="cv-deck-btns">
        {SEEN_OPTS.map(([v, label], k) => (
          <button key={v} data-v={v} onClick={() => judge(v)}><span className="key">{k + 1}</span>{label}</button>
        ))}
      </div>
      <div className="cv-deck-hint">feeling first (optional), then the seen answer deals the next card — "didn't see it" + ♥ builds your pilgrimage list</div>
    </div>
  );
}

// ——— Phase 3: artist pages (charcoal-editorial per mockup 1c) + an artists index.
// Page = your history with them (canon works, floored/liked, venues) + their majors you
// haven't met (fame-ranked notable works minus the canon) — the artist-direction seeder.
function ArtistView({ artistId, go }) {
  const AD2 = AD.artists[artistId] || {};
  const works = useMemo(() => WORKS.map(enrich).filter(w => w.artistId === artistId), [artistId]);
  if (!works.length && !AD2.qid) return <div className="cv-mus"><p>No artist here (yet).</p></div>;
  const name = (works[0] && works[0].artist.replace(/\s*\(.*\)$/, "")) || AD2.label;
  const canonQids = new Set(works.map(w => w.qid).filter(Boolean));
  const unmet = (AD2.notable || []).filter(n => !canonQids.has(n.qid));
  const movements = (AD2.movementQids || []).map(q => (AD.movements || {})[q]).filter(Boolean);
  const venues = [...new Set(works.flatMap(w => (Array.isArray(w.seenAt) ? w.seenAt : [w.seenAt || w.at]).filter(Boolean)))]
    .map(id => MUS_BY_ID[id]).filter(Boolean);
  const floored = works.filter(w => w.floored || w.favorite).length;
  const liked = works.filter(w => w.liked).length;
  return (
    <div className="cv-artist">
      <div className="cv-a-head">
        {AD2.image && <img className="cv-a-face" src={AD2.image} alt={name} />}
        <div>
          <h1 className="cv-a-name">{name}</h1>
          <div className="cv-a-meta">{AD2.born ? `${AD2.born}–${AD2.died || ""}` : ""}{AD2.desc ? ` · ${AD2.desc.replace(/\s*\(\d{4}[–-]?\d{0,4}\)$/, "")}` : ""}</div>
          {movements.length > 0 && <div className="cv-a-mov">{movements.join(" · ")}</div>}
          <div className="cv-a-stats">{works.length} in your canon{floored ? ` · ★ ${floored} floored` : ""}{liked ? ` · ♡ ${liked} liked` : ""}
            {venues.length ? ` · met at ${venues.map(v => v.name.replace(/\s*\(.*\)$/, "")).join(", ")}` : ""}</div>
        </div>
      </div>
      <div className="cv-a-secl">In your canon</div>
      <div className="cv-wall cv-a-wall">{works.map(w => <Card key={w.id} w={w} go={go} />)}</div>
      {unmet.length > 0 && (
        <React.Fragment>
          <div className="cv-a-secl">Their majors you haven't met</div>
          <div className="cv-a-unmet">
            {unmet.map(n => (
              <a key={n.qid} href={`https://www.wikidata.org/wiki/${n.qid}`} target="_blank" rel="noopener noreferrer" title={n.title}>
                <img src={n.img} alt={n.title} loading="lazy" />
                <span>{n.title}{n.year ? ` · ${n.year}` : ""}</span>
              </a>
            ))}
          </div>
        </React.Fragment>
      )}
      {(AD2.similar || []).length > 0 && (
        <React.Fragment>
          <div className="cv-a-secl">Who's next — kin, teachers, students</div>
          <div className="cv-a-kin">
            {AD2.similar.slice(0, 8).map(s2 => {
              const inCanon = Object.entries(AD.artists).find(([k, v]) => v.qid === s2.qid);
              return inCanon
                ? <a key={s2.qid} className="cv-a-kin-chip" data-in="true" href={"#/artist/" + inCanon[0]}>{s2.label}<i>in your canon</i></a>
                : <a key={s2.qid} className="cv-a-kin-chip" href={"https://www.wikidata.org/wiki/" + s2.qid} target="_blank" rel="noopener noreferrer">{s2.label}{s2.desc ? <i>{s2.desc.slice(0, 40)}</i> : null}</a>;
            })}
          </div>
        </React.Fragment>
      )}
      {AD2.qid && <div className="cv-r-links" style={{ padding: "18px 0 0" }}>
        <a href={`https://www.wikidata.org/wiki/${AD2.qid}`} target="_blank" rel="noopener noreferrer">Wikidata ↗</a>
      </div>}
    </div>
  );
}

function Artists({ go }) {
  const rows = useMemo(() => {
    const by = {};
    for (const w of WORKS.map(enrich)) {
      if (!w.artistId) continue;
      const r = (by[w.artistId] = by[w.artistId] || { id: w.artistId, name: w.artist.replace(/\s*\(.*\)$/, ""), n: 0, fl: 0, lk: 0 });
      r.n++; if (w.floored || w.favorite) r.fl++; if (w.liked) r.lk++;
    }
    return Object.values(by).sort((a, b) => (b.fl * 3 + b.lk) - (a.fl * 3 + a.lk) || b.n - a.n);
  }, []);
  return (
    <div className="cv-mus">
      <p className="cv-deck-sum">{rows.length} artists in the canon, ranked by how hard they hit.</p>
      {rows.map(r => (
        <div className="cv-mus-row" key={r.id} style={{ cursor: "pointer" }} onClick={() => go("artist", r.id)}>
          <span className="cv-mus-name">{r.name}</span>
          <span className="cv-mus-city">{(AD.artists[r.id] || {}).desc || ""}</span>
          <span className="cv-mus-count">{r.n} work{r.n > 1 ? "s" : ""}{r.fl ? ` · ★${r.fl}` : ""}{r.lk ? ` · ♡${r.lk}` : ""}</span>
        </div>
      ))}
    </div>
  );
}

// ——— Phase 4a: the painterly map (mockup 2b) — every museum pinned where it stands,
// sized by canon works; the trip strip below groups dated visits by year. Land geometry
// is rotation's simplified equirect world, copied (apps stay self-contained).
function MapView({ go }) {
  const world = window.CANVAS_WORLD || null;
  const P = (lat, lng) => [(lng + 180) / 360 * 1000, (90 - lat) / 180 * 500];
  const pins = useMemo(() => {
    const counts = {};
    for (const w of WORKS) for (const id of (Array.isArray(w.seenAt) ? w.seenAt : [w.seenAt || w.at])) if (id) counts[id] = (counts[id] || 0) + 1;
    return MUSEUMS.map(m => {
      const d = AD.museums[m.id] || {};
      if (d.lat == null) return null;
      const [x, y] = P(d.lat, d.lng);
      return { id: m.id, name: m.name.replace(/\s*\(.*\)$/, ""), city: m.city, x, y, n: counts[m.id] || 0, kind: m.kind, visits: m.visits || [] };
    }).filter(Boolean);
  }, []);
  const trips = useMemo(() => {
    const by = {};
    for (const m of MUSEUMS) for (const v of (m.visits || [])) {
      const y = String(v).match(/^(~?)(\d{4})/); if (!y) continue;
      (by[y[2]] = by[y[2]] || new Set()).add(m.city);
    }
    return Object.entries(by).map(([y, s]) => [y, [...s]]).sort((a, b) => b[0] - a[0]);
  }, []);
  return (
    <div className="cv-map">
      <p className="cv-deck-sum">Every museum, pinned where it stands — sized by how much of the canon it gave you.</p>
      <svg viewBox="60 40 880 380">
        {world && <path d={world.land.join(" ")} fill="#d3c4ab" stroke="none" />}
        {pins.map(p => (
          <g key={p.id} className="cv-pin" onClick={() => go("museums")}>
            <circle cx={p.x} cy={p.y} r={p.n ? 3 + Math.sqrt(p.n) * 1.9 : 2.2}
              fill={p.n ? "oklch(0.55 0.13 46 / .82)" : "rgba(58,47,34,.45)"} stroke="#f4ecdf" strokeWidth="0.8" />
            <title>{p.name}, {p.city} — {p.n ? p.n + " work" + (p.n > 1 ? "s" : "") + " in the canon" : "visited"}</title>
            {p.n >= 4 && <text x={p.x} y={p.y - (4 + Math.sqrt(p.n) * 1.9)} textAnchor="middle">{p.city}</text>}
          </g>
        ))}
      </svg>
      <div className="cv-trips">
        {trips.map(([y, cities]) => (
          <div className="cv-trip-row" key={y}>
            <span className="cv-trip-year">{y}</span>
            <span className="cv-trip-cities">{cities.join(" · ")}</span>
          </div>
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
          <a href="#/artists" data-on={view === "artists" || route.view === "artist"}>Artists</a>
          <a href="#/map" data-on={view === "map"}>Map</a>
          <a href="#/pilgrimage" data-on={view === "pilgrimage"}>Pilgrimage</a>
        </nav>
        {view === "wall" && (
          <div className="cv-mode">
            <button data-on={!salon} onClick={() => setSalon(false)}>Collage</button>
            <button data-on={salon} onClick={() => setSalon(true)}>Salon</button>
          </div>
        )}
      </header>
      {route.view === "deck" ? <Deck museumId={route.id} go={go} key={route.id} />
        : view === "museums" ? <Museums />
        : view === "pilgrimage" ? <Pilgrimage go={go} />
        : route.view === "artist" ? <ArtistView artistId={route.id} go={go} key={route.id} />
        : view === "map" ? <MapView go={go} />
        : view === "artists" ? <Artists go={go} /> : <Wall go={go} />}
      {route.view === "work" && <Reader id={route.id} go={go} />}
      <footer className="cv-foot">
        canvas · a personal gallery, reconstructed from memory · images via <a href="https://commons.wikimedia.org" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a> / <a href="https://www.wikidata.org" target="_blank" rel="noopener noreferrer">Wikidata</a> · part of <a href="/">fuad.au</a>
      </footer>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
