// rotation-shelves.jsx — THE RECORD SHOP. Explore is the database; this is the wall.
// Every album you've played (≥3 plays) as a thin SPINE on genre shelves; hover (desktop) or
// first tap (mobile) fans a spine open into its cover; click again opens the Reader — a
// bottom-sheet with the big cover, your stats, and a 30-second needle-drop (the vinyl spins
// while it plays). Genre rows split into subgenre rows on demand.
//
// Architecture notes (evolution-friendly, deliberately self-contained):
//  · zero new data files — everything derives client-side from media-index (lazy),
//    track-previews (lazy) and the core EXPLORE records (family/subgenres/hue).
//  · collapsed spines are pure colored divs (no <img>, no text nodes beyond one span) —
//    a shelf of 100 spines costs ~100 cheap elements; covers mount ONLY when fanned open.
//  · rows use content-visibility so off-screen shelves don't layout at all.
//  · cover URLs are downscaled via CDN variants (Spotify hash swap · CAA front-250 · iTunes size swap).

const SH_MIN_PLAYS = 3;
const SH_CAP = 90;            // spines initially visible per shelf ("dig deeper" reveals more)

// — CDN size variants: small for the fan-open (≈300px), big for the Reader —
const shSmall = (url) => !url ? "" :
  url.includes("i.scdn.co/image/ab67616d0000b273") ? url.replace("ab67616d0000b273", "ab67616d00001e02")
  : url.includes("600x600") ? url.replace("600x600", "300x300") : url;
const shBig = (url) => !url ? "" :
  url.includes("front-250") ? url.replace("front-250", "front-500") : url;

// — needle drop: plays the album's top track's 30s preview; reports state so the vinyl spins —
function ShNeedle({ trackKey, hue, onState }) {
  const [playing, setPlaying] = React.useState(false);
  const ref = React.useRef(null);
  const set = (p) => { setPlaying(p); onState && onState(p); };
  React.useEffect(() => () => { if (ref.current) { ref.current.pause(); ref.current = null; } onState && onState(false); }, [trackKey]);
  const hash = trackKey && window.ROTATION_PREVIEWS && window.ROTATION_PREVIEWS[trackKey];
  if (!hash) return null;
  const toggle = (e) => {
    e.stopPropagation();
    if (ref.current && !ref.current.paused) { ref.current.pause(); set(false); return; }
    if (!ref.current) {
      ref.current = new Audio(`https://p.scdn.co/mp3-preview/${hash}?cid=65b708073fc0480ea92a077233ca87bd`);
      ref.current.addEventListener("ended", () => set(false));
      ref.current.addEventListener("error", () => set(false));
    }
    ref.current.play().catch(() => set(false));
    set(true);
  };
  return (
    <button className="sh-needle" data-on={playing} onClick={toggle} style={{ "--h": hue }}>
      {playing ? "❚❚ lift the needle" : "▶ needle drop"}
    </button>
  );
}

// — the Reader: bottom sheet with cover + spinning vinyl + your stats —
function ShReader({ al, onClose, go }) {
  const R = window.ROTATION;
  const [spin, setSpin] = React.useState(false);
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  if (!al) return null;
  const key = R.slug(al.artist) + "~" + R.slug(al.title);
  const meta = al.meta || 0;
  const typeName = meta && meta[1] === "s" ? "Single" : meta && meta[1] === "c" ? "Compilation" : "Album";
  return (
    <div className="sh-veil" onClick={onClose}>
      <div className="sh-reader" onClick={(e) => e.stopPropagation()}>
        <div className="sh-sleeve" data-spin={spin}>
          <div className="sh-vinyl" />
          {al.cover
            ? <img className="sh-reader-cover" src={shBig(al.cover)} alt="" onError={(e) => { e.target.src = al.cover; }} />
            : <GenCover hue={al.hue} name={al.title} size={168} radius={4} />}
        </div>
        <div className="sh-reader-body">
          <div className="r-kicker">{typeName}{meta && meta[0] ? ` · ${meta[0]}` : ""}{meta && meta[2] ? ` · ${meta[2]}` : ""}</div>
          <div className="sh-reader-title">{al.title}</div>
          <div className="sh-reader-artist" onClick={() => { onClose(); go("artist", al.artistId); }}>{al.artist} →</div>
          <div className="sh-reader-stats">
            <span><b>{fmt(al.plays)}</b> plays</span>
            {al.firstYear ? <span>first <b>{al.firstYear}</b></span> : null}
            {al.lastYear && al.lastYear !== al.firstYear ? <span>last <b>{al.lastYear}</b></span> : null}
            {al.tt ? <span><b>{Math.min(al.played || 0, al.tt) || "?"}/{al.tt}</b> tracks</span> : null}
          </div>
          <div className="sh-reader-actions">
            <ShNeedle trackKey={al.topTrackKey} hue={al.hue} onState={setSpin} />
            <button className="sh-open" onClick={() => { onClose(); go("album", key); }}>full page →</button>
          </div>
        </div>
        <button className="sh-x" onClick={onClose}>✕</button>
      </div>
    </div>
  );
}

// — one spine. Collapsed: a colored slab. Expanded: the cover slides out. —
function ShSpine({ al, expanded, onExpand, onOpen }) {
  const worn = al.plays >= 300 ? 3 : al.plays >= 100 ? 2 : al.plays >= 25 ? 1 : 0;
  return (
    <div className={"sh-spine" + (expanded ? " on" : "")} data-worn={worn}
      style={{ "--h": al.hue }}
      onMouseEnter={() => onExpand(al.key)}
      onClick={(e) => { e.stopPropagation(); expanded ? onOpen(al) : onExpand(al.key); }}
      title={`${al.title} — ${al.artist} · ${al.plays} plays`}>
      {expanded
        ? (al.cover
          ? <img className="sh-cover" src={shSmall(al.cover)} alt="" loading="lazy" onError={(e) => { if (al.cover && e.target.src !== al.cover) e.target.src = al.cover; }} />
          : <GenCover hue={al.hue} name={al.title} size={"100%"} radius={2} style={{ width: "100%", height: "100%" }} />)
        : <span className="sh-label">{al.title}</span>}
    </div>
  );
}

function ShelvesView({ go }) {
  const R = window.ROTATION;
  const [ready, setReady] = React.useState(!!(window.ROTATION_MEDIA && window.ROTATION_PREVIEWS));
  const [expanded, setExpanded] = React.useState(null);   // fanned-open spine key
  const [reader, setReader] = React.useState(null);       // album in the Reader
  const [caps, setCaps] = React.useState({});             // shelfKey → extra visibility
  const [split, setSplit] = React.useState({});           // famIdx → split into subgenre rows
  React.useEffect(() => {
    let need = 0; const done = () => { if (--need <= 0) setReady(true); };
    const load = (src, glob) => { if (window[glob]) return; need++; const s = document.createElement("script"); s.src = src; s.onload = done; document.head.appendChild(s); };
    load("media-index.js", "ROTATION_MEDIA"); load("track-previews.js", "ROTATION_PREVIEWS");
    if (need === 0) setReady(true);
  }, []);

  // one pass over the media index → album records with family/sub + top-track preview key
  const data = React.useMemo(() => {
    const M = window.ROTATION_MEDIA; if (!M) return null;
    // artist meta (resolved once per artist name)
    const meta = M.artists.map(name => {
      const id = (R.idForName && R.idForName(name)) || R.slug(name);
      const rec = (R.expById && R.expById[id]) || R.byId[id];
      return { name, id, rec, hue: rec ? rec.hue : 210, fam: rec && rec.fam != null ? rec.fam : (rec && rec.s && rec.s.length ? (R.SUBS[rec.s[0]] || {}).fam : null), sub: rec && rec.s && rec.s.length ? rec.s[0] : null };
    });
    // per-album top track (for the needle drop) + played-track count (for completeness)
    const top = new Map(), cnt = new Map();
    for (const t of M.tracks) {
      const ai = t[3]; if (ai < 0) continue;
      cnt.set(ai, (cnt.get(ai) || 0) + 1);
      const cur = top.get(ai);
      if (!cur || t[2] > cur[1]) top.set(ai, [t[0], t[2]]);
    }
    const albums = [];
    for (let i = 0; i < M.albums.length; i++) {
      const a = M.albums[i];
      if (a[2] < SH_MIN_PLAYS || !a[0]) continue;
      const m = meta[a[1]];
      const tt = top.get(i);
      albums.push({
        key: "a" + i, title: a[0], artist: m.name, artistId: m.id, plays: a[2],
        firstYear: a[3], lastYear: a[4], cover: a[6] || "", meta: a[7] || 0, dna: a[8] || 0, tt: a[9] || 0,
        played: cnt.get(i) || 0, hue: m.hue, fam: m.fam, sub: m.sub,
        topTrackKey: tt ? R.slug(m.name) + "~" + R.slug(tt[0]) : null,
      });
    }
    albums.sort((x, y) => y.plays - x.plays);
    // genre shelves (family rows), Misc last
    const byFam = new Map();
    for (const al of albums) {
      const f = al.fam != null ? al.fam : -1;
      if (!byFam.has(f)) byFam.set(f, { fam: f, albums: [], plays: 0 });
      const g = byFam.get(f); g.albums.push(al); g.plays += al.plays;
    }
    const famName = (f) => f === -1 ? "Misc / uncharted" : ((R.FAMILIES.find(x => x.i === f) || {}).family || "—");
    const famHue = (f) => f === -1 ? 260 : ((R.FAMILIES.find(x => x.i === f) || {}).hue || 260);
    const shelves = [...byFam.values()].sort((a, b) => (a.fam === -1) - (b.fam === -1) || b.plays - a.plays)
      .map(g => ({ ...g, name: famName(g.fam), hue: famHue(g.fam) }));
    return { albums, shelves };
  }, [ready, R]);

  if (!ready || !data) return <div className="r-view"><div className="r-mono" style={{ color: "var(--ink-faint)", padding: 40 }}>stocking the shelves…</div></div>;

  // split a family shelf into its subgenre rows (albums keyed by their artist's primary sub)
  const subRows = (g) => {
    const by = new Map();
    for (const al of g.albums) {
      const s = al.sub != null && R.SUBS[al.sub] && R.SUBS[al.sub].fam === g.fam ? R.SUBS[al.sub].name : "other";
      if (!by.has(s)) by.set(s, []);
      by.get(s).push(al);
    }
    return [...by.entries()].sort((a, b) => (a[0] === "other") - (b[0] === "other") ||
      b[1].reduce((s2, x) => s2 + x.plays, 0) - a[1].reduce((s2, x) => s2 + x.plays, 0));
  };

  const Shelf = ({ id, name, hue, albums, depth }) => {
    const cap = SH_CAP + (caps[id] || 0);
    const visible = albums.slice(0, cap);
    return (
      <section className="sh-shelf" data-depth={depth || 0}>
        <div className="sh-shelf-h">
          <span className="sh-shelf-name" style={{ "--h": hue }}>{name}</span>
          <span className="sh-shelf-n">{fmt(albums.length)} records · {fmt(albums.reduce((s, a) => s + a.plays, 0))} plays</span>
          {!depth && albums.length > 6 && (
            <button className="sh-split" onClick={() => setSplit(p => ({ ...p, [id]: !p[id] }))}>
              {split[id] ? "merge ▴" : "split into subgenres ▾"}
            </button>
          )}
        </div>
        <div className="sh-row" onMouseLeave={() => setExpanded(null)}>
          {visible.map(al => (
            <ShSpine key={al.key} al={al} expanded={expanded === al.key}
              onExpand={setExpanded} onOpen={setReader} />
          ))}
          {albums.length > cap && (
            <button className="sh-more" onClick={() => setCaps(p => ({ ...p, [id]: (p[id] || 0) + 120 }))}>
              +{fmt(albums.length - cap)}<br />dig<br />deeper
            </button>
          )}
        </div>
      </section>
    );
  };

  const dig = () => {
    const pool = data.albums.filter(a => a.plays >= 20);
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (pick) setReader(pick);
  };

  return (
    <div className="r-view">
      <div className="r-viewhead">
        <div>
          <div className="r-kicker">Shelves · {fmt(data.albums.length)} records racked</div>
          <h1 className="r-title">The record <em>shop</em><span className="dot">.</span></h1>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button className="sh-dig" onClick={dig}>🎲 crate dig</button>
        </div>
      </div>
      <p className="r-lede" style={{ marginTop: -8, marginBottom: 22 }}>Every album you've played, racked by genre.
        Brush a spine to fan it open{" "}<span className="r-mono" style={{ fontSize: 10 }}>(tap once on touch)</span> — click the cover for the counter.</p>

      {data.shelves.map(g => split[String(g.fam)] || split[g.fam]
        ? (
          <div key={g.fam} className="sh-famgroup">
            <div className="sh-shelf-h" style={{ marginBottom: 2 }}>
              <span className="sh-shelf-name" style={{ "--h": g.hue, fontSize: 17 }}>{g.name}</span>
              <button className="sh-split" onClick={() => setSplit(p => ({ ...p, [g.fam]: false }))}>merge ▴</button>
            </div>
            {subRows(g).map(([sname, arr]) => (
              <Shelf key={g.fam + sname} id={g.fam + ":" + sname} name={sname} hue={g.hue} albums={arr} depth={1} />
            ))}
          </div>
        )
        : <Shelf key={g.fam} id={g.fam} name={g.name} hue={g.hue} albums={g.albums} />)}

      {reader && <ShReader al={reader} onClose={() => setReader(null)} go={go} />}

      <style>{`
        .sh-shelf { margin-bottom: 26px; content-visibility: auto; contain-intrinsic-size: auto 190px; }
        .sh-shelf[data-depth="1"] { margin: 0 0 16px 14px; }
        .sh-famgroup { margin-bottom: 30px; }
        .sh-shelf-h { display: flex; align-items: baseline; gap: 12px; margin-bottom: 8px; flex-wrap: wrap; }
        .sh-shelf-name { font-family: var(--serif); font-style: italic; font-size: 20px;
          color: oklch(0.82 0.12 var(--h)); }
        .sh-shelf-n { font-family: var(--mono); font-size: 9px; letter-spacing: .1em; text-transform: uppercase; color: var(--ink-faint); }
        .sh-split { margin-left: auto; background: none; border: none; color: var(--ink-faint); cursor: pointer;
          font-family: var(--mono); font-size: 9px; letter-spacing: .1em; text-transform: uppercase; }
        .sh-split:hover { color: var(--accent); }
        .sh-row { display: flex; align-items: flex-end; gap: 2px; overflow-x: auto; padding: 6px 2px 0;
          border-bottom: 3px solid var(--rule-2); scrollbar-width: thin; -webkit-overflow-scrolling: touch; }
        .sh-spine { flex: none; width: 17px; height: 128px; border-radius: 2px 2px 0 0; cursor: pointer;
          position: relative; overflow: hidden;
          background: linear-gradient(180deg, oklch(0.46 0.11 var(--h)), oklch(0.3 0.08 var(--h)));
          box-shadow: inset -2px 0 3px rgba(0,0,0,.35);
          transition: width .22s cubic-bezier(.3,.8,.3,1), box-shadow .22s; }
        .sh-spine[data-worn="2"] { filter: saturate(1.15) brightness(1.06); }
        .sh-spine[data-worn="3"] { filter: saturate(1.3) brightness(1.14); }
        .sh-spine:hover { box-shadow: inset -2px 0 3px rgba(0,0,0,.35), 0 -3px 14px oklch(0.6 0.14 var(--h) / .35); }
        .sh-spine.on { width: 128px; }
        .sh-label { position: absolute; inset: 6px 0 6px; writing-mode: vertical-rl; font-family: var(--mono);
          font-size: 8.2px; letter-spacing: .04em; color: rgba(255,255,255,.82); white-space: nowrap;
          overflow: hidden; text-overflow: ellipsis; text-align: left; pointer-events: none; }
        .sh-cover { width: 128px; height: 128px; object-fit: cover; display: block; }
        .sh-more { flex: none; width: 44px; height: 128px; border: 1px dashed var(--rule-2); border-bottom: none;
          border-radius: 2px 2px 0 0; background: none; color: var(--ink-faint); cursor: pointer;
          font-family: var(--mono); font-size: 8.5px; letter-spacing: .06em; text-transform: uppercase; line-height: 1.7; }
        .sh-more:hover { color: var(--accent); border-color: var(--accent-dim); }
        .sh-dig { padding: 8px 16px; border-radius: 999px; border: 1px solid var(--rule-2); background: none;
          color: var(--ink-soft); cursor: pointer; font-family: var(--mono); font-size: 10px; letter-spacing: .12em; text-transform: uppercase; }
        .sh-dig:hover { color: var(--accent); border-color: var(--accent-dim); }

        /* Reader — bottom sheet */
        .sh-veil { position: fixed; inset: 0; background: rgba(5,4,8,.6); backdrop-filter: blur(3px); z-index: 80;
          display: flex; align-items: flex-end; justify-content: center; animation: shIn .18s ease-out; }
        @keyframes shIn { from { opacity: 0; } }
        .sh-reader { position: relative; width: min(680px, 100%); background: var(--panel);
          border: 1px solid var(--rule-2); border-bottom: none; border-radius: 14px 14px 0 0;
          padding: 22px 24px calc(22px + env(safe-area-inset-bottom, 0px)); display: flex; gap: 22px; align-items: center;
          animation: shUp .24s cubic-bezier(.2,.8,.3,1); }
        @keyframes shUp { from { transform: translateY(40px); opacity: 0; } }
        .sh-sleeve { position: relative; flex: none; width: 168px; height: 168px; }
        .sh-vinyl { position: absolute; top: 6px; left: 26px; width: 156px; height: 156px; border-radius: 50%;
          background: repeating-radial-gradient(circle, #0c0b0e 0 2px, #17161b 2px 4px);
          box-shadow: 0 0 0 1px #000; transition: transform .5s ease, left .4s ease; }
        .sh-vinyl::after { content: ""; position: absolute; inset: 38%; border-radius: 50%;
          background: oklch(0.55 0.13 330); }
        .sh-reader [data-spin] { }
        .sh-sleeve[data-spin="true"] .sh-vinyl { left: 74px; animation: shSpinV 1.8s linear infinite; }
        @keyframes shSpinV { to { transform: rotate(360deg); } }
        .sh-reader-cover { position: relative; width: 168px; height: 168px; object-fit: cover; border-radius: 4px;
          box-shadow: 4px 0 18px rgba(0,0,0,.5); }
        .sh-reader-body { min-width: 0; flex: 1; }
        .sh-reader-title { font-family: var(--serif); font-style: italic; font-size: 24px; line-height: 1.15; margin: 4px 0 2px; }
        .sh-reader-artist { color: var(--ink-soft); cursor: pointer; font-size: 14px; margin-bottom: 10px; }
        .sh-reader-artist:hover { color: var(--accent); }
        .sh-reader-stats { display: flex; gap: 14px; flex-wrap: wrap; font-family: var(--mono); font-size: 10px;
          letter-spacing: .06em; text-transform: uppercase; color: var(--ink-faint); margin-bottom: 14px; }
        .sh-reader-stats b { color: var(--ink); font-size: 12px; }
        .sh-reader-actions { display: flex; gap: 10px; flex-wrap: wrap; }
        .sh-needle { padding: 7px 14px; border-radius: 999px; cursor: pointer; font-family: var(--mono);
          font-size: 10px; letter-spacing: .1em; text-transform: uppercase;
          border: 1px solid var(--rule-2); background: none; color: var(--ink-soft); }
        .sh-needle[data-on="true"] { color: oklch(0.82 0.12 var(--h)); border-color: oklch(0.6 0.14 var(--h) / .7);
          background: oklch(0.6 0.14 var(--h) / .13); }
        .sh-open { padding: 7px 14px; border-radius: 999px; cursor: pointer; font-family: var(--mono);
          font-size: 10px; letter-spacing: .1em; text-transform: uppercase; border: 1px solid var(--rule-2);
          background: none; color: var(--ink-soft); }
        .sh-open:hover { color: var(--ink); }
        .sh-x { position: absolute; top: 10px; right: 12px; background: none; border: none; color: var(--ink-faint);
          cursor: pointer; font-size: 14px; }
        @media (max-width: 620px) {
          .sh-reader { flex-direction: column; align-items: flex-start; gap: 14px; }
          .sh-sleeve { width: 132px; height: 132px; }
          .sh-reader-cover { width: 132px; height: 132px; }
          .sh-vinyl { width: 122px; height: 122px; left: 20px; }
          .sh-sleeve[data-spin="true"] .sh-vinyl { left: 54px; }
          .sh-spine { height: 108px; }
          .sh-spine.on { width: 108px; }
          .sh-cover { width: 108px; height: 108px; }
          .sh-more { height: 108px; }
        }
      `}</style>
    </div>
  );
}

Object.assign(window, { ShelvesView });
