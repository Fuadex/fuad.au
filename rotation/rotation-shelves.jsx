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
const SH_CAP = 540;           // spines initially visible per shelf ("dig deeper" reveals more)
const SH_STEP = 720;          // per dig

// — CDN size variants: tiny (instant, 64px) → small (sharp, ≈300px) for the fan-open; big for the Reader —
const shTiny = (url) => !url ? "" :
  url.includes("i.scdn.co/image/ab67616d0000b273") ? url.replace("ab67616d0000b273", "ab67616d00004851")
  : url.includes("600x600") ? url.replace("600x600", "100x100") : url;
const shSmall = (url) => !url ? "" :
  url.includes("i.scdn.co/image/ab67616d0000b273") ? url.replace("ab67616d0000b273", "ab67616d00001e02")
  : url.includes("600x600") ? url.replace("600x600", "300x300") : url;
const shBig = (url) => !url ? "" :
  url.includes("front-250") ? url.replace("front-250", "front-500") : url;

// — needle drop: plays the album's top track's 30s preview; reports state so the vinyl spins.
// Unplayed (shrinkwrapped) records have no track in our library → fall back to the keyless
// iTunes Search API (guarded: normalized album title must match exactly + artist must match).
const _shItCache = new Map();   // "artist~album" → previewUrl | null
function ShNeedle({ trackKey, artist, album, hue, onState }) {
  const [playing, setPlaying] = React.useState(false);
  const ck = (artist || "") + "~" + (album || "");
  const [itUrl, setItUrl] = React.useState(() => _shItCache.has(ck) ? _shItCache.get(ck) : undefined);
  const ref = React.useRef(null);
  const set = (p) => { setPlaying(p); onState && onState(p); };
  React.useEffect(() => () => { if (ref.current) { ref.current.pause(); ref.current = null; } onState && onState(false); }, [trackKey, ck]);
  const hash = trackKey && window.ROTATION_PREVIEWS && window.ROTATION_PREVIEWS[trackKey];
  React.useEffect(() => {
    if (hash || !artist || !album || _shItCache.has(ck)) return;
    const nrm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\(.*?\)|\[.*?\]/g, "").replace(/[^a-z0-9ぁ-んァ-ヶ一-龠]/gu, "");
    fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(artist + " " + album)}&media=music&entity=song&limit=8`)
      .then(r => r.json())
      .then(j => {
        const aN = nrm(artist), cN = nrm(album);
        const hit = (j.results || []).find(r => r.previewUrl && nrm(r.collectionName) === cN &&
          (nrm(r.artistName).includes(aN) || aN.includes(nrm(r.artistName))));
        const url = hit ? hit.previewUrl : null;
        _shItCache.set(ck, url); setItUrl(url);
      })
      .catch(() => { _shItCache.set(ck, null); setItUrl(null); });
  }, [ck, hash]);
  const src = hash ? `https://p.scdn.co/mp3-preview/${hash}?cid=65b708073fc0480ea92a077233ca87bd` : itUrl;
  if (!src) return null;
  const toggle = (e) => {
    e.stopPropagation();
    if (ref.current && !ref.current.paused) { ref.current.pause(); set(false); return; }
    if (!ref.current) {
      ref.current = new Audio(src);
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
          {al.unplayed ? (
            <div className="sh-reader-stats">
              <span style={{ color: "var(--accent)" }}><b>still in shrinkwrap</b></span>
              {al.year ? <span>released <b>{al.year}</b></span> : null}
              {al.artistPlays ? <span>you've played {al.artist.split(" ")[0]} <b>{fmt(al.artistPlays)}</b>×</span> : null}
            </div>
          ) : (
            <div className="sh-reader-stats">
              <span><b>{fmt(al.plays)}</b> plays</span>
              {al.firstYear ? <span>first <b>{al.firstYear}</b></span> : null}
              {al.lastYear && al.lastYear !== al.firstYear ? <span>last <b>{al.lastYear}</b></span> : null}
              {al.tt ? <span><b>{Math.min(al.played || 0, al.tt) || "?"}/{al.tt}</b> tracks</span> : null}
            </div>
          )}
          <div className="sh-reader-actions">
            <ShNeedle trackKey={al.topTrackKey} artist={al.artist} album={al.title} hue={al.hue} onState={setSpin} />
            {!al.unplayed && <button className="sh-open" onClick={() => { onClose(); go("album", key); }}>full page →</button>}
            <a className="r-extlink r-extlink-lf" target="_blank" rel="noopener noreferrer"
              href={`https://www.last.fm/music/${encodeURIComponent(al.artist)}/${encodeURIComponent(al.title)}`}>last.fm ↗</a>
            <a className="r-extlink r-extlink-sp" target="_blank" rel="noopener noreferrer"
              href={`https://open.spotify.com/search/${encodeURIComponent(al.artist + " " + al.title)}`}>Spotify ↗</a>
          </div>
        </div>
        <button className="sh-x" onClick={onClose}>✕</button>
      </div>
    </div>
  );
}

// progressive fan-open cover: the 64px CDN variant paints near-instantly (blurry for a beat),
// the 300px version swaps in as soon as it's downloaded — kills the "hover then wait" feel.
function ShFanCover({ cover }) {
  const [src, setSrc] = React.useState(() => shTiny(cover));
  React.useEffect(() => {
    let dead = false;
    const im = new Image();
    im.src = shSmall(cover);
    im.onload = () => { if (!dead) setSrc(im.src); };
    return () => { dead = true; };
  }, [cover]);
  return <img className="sh-cover" src={src} alt="" draggable={false} onError={(e) => { if (cover && e.target.src !== cover) e.target.src = cover; }} />;
}

// — one spine. Collapsed: a colored slab. Expanded: the cover slides out. —
function ShSpine({ al, expanded, onExpand, onOpen }) {
  const worn = al.plays >= 300 ? 3 : al.plays >= 100 ? 2 : al.plays >= 25 ? 1 : 0;
  return (
    <div className={"sh-spine" + (expanded ? " on" : "")} data-worn={worn} data-wrap={al.unplayed ? 1 : 0}
      style={{ "--h": al.hue }}
      onMouseEnter={() => onExpand(al.key)}
      onClick={(e) => { e.stopPropagation(); expanded ? onOpen(al) : onExpand(al.key); }}
      title={`${al.title} — ${al.artist} · ${al.plays} plays`}>
      {expanded
        ? (al.cover
          ? <ShFanCover cover={al.cover} />
          : <GenCover hue={al.hue} name={al.title} size={"100%"} radius={2} style={{ width: "100%", height: "100%" }} />)
        : <span className="sh-label">{al.title}</span>}
    </div>
  );
}

// ── RE-SHELVING LENSES — same records, different walls ──
const SH_LENSES = [["genre", "genre"], ["decade", "decade"], ["found", "when you found them"], ["mood", "mood"], ["done", "completeness"]];
function shGroupBy(lens, albums, R) {
  if (lens === "genre" || !lens) return shGroupShelves(albums, R);
  const groups = new Map();
  const put = (k, name, hue, order, al) => {
    if (!groups.has(k)) groups.set(k, { fam: "L" + k, name, hue, order, albums: [], plays: 0 });
    const g = groups.get(k); g.albums.push(al); g.plays += al.plays;
  };
  for (const al of albums) {
    if (lens === "decade") {
      const y = (al.meta && al.meta[0]) || 0;
      if (!y) put("zz", "year unknown", 260, -1, al);
      else { const d = Math.floor(y / 10) * 10; put(String(d), `${d}s`, (200 + (d / 10) * 37) % 360, d, al); }
    } else if (lens === "found") {
      const y = al.firstYear || 0;
      if (!y) put("zz", "undated", 260, -1, al);
      else put(String(y), `${y} — when you found them`, (120 + (y - 2006) * 17) % 360, y, al);
    } else if (lens === "mood") {
      const d = al.dna;
      if (!d || !d.length) put("zz", "unmeasured", 260, -1, al);
      else {
        const e = d[0], v = d[1];
        const z = e >= 50 ? (v < 50 ? ["di", "dark · intense", 8, 4] : ["bi", "bright · intense", 60, 3])
          : (v < 50 ? ["dc", "dark · calm", 250, 2] : ["bc", "bright · calm", 150, 1]);
        put(z[0], z[1], z[2], z[3], al);
      }
    } else if (lens === "done") {
      if (!al.tt) put("zz", "length unknown", 260, -1, al);
      else {
        const pct = Math.min(1, (al.played || 0) / al.tt);
        const z = pct >= 0.9 ? ["a", "finished — every track", 150, 3] : pct >= 0.34 ? ["b", "half-heard", 60, 2] : ["c", "barely opened", 8, 1];
        put(z[0], z[1], z[2], z[3], al);
      }
    }
  }
  return [...groups.values()].sort((a, b) => b.order - a.order);
}

// group album records into genre shelves (family rows), Misc last — shared by both modes
function shGroupShelves(albums, R) {
  const byFam = new Map();
  for (const al of albums) {
    const f = al.fam != null ? al.fam : -1;
    if (!byFam.has(f)) byFam.set(f, { fam: f, albums: [], plays: 0 });
    const g = byFam.get(f); g.albums.push(al); g.plays += al.plays;
  }
  const famName = (f) => f === -1 ? "Misc / uncharted" : ((R.FAMILIES.find(x => x.i === f) || {}).family || "—");
  const famHue = (f) => f === -1 ? 260 : ((R.FAMILIES.find(x => x.i === f) || {}).hue || 260);
  return [...byFam.values()].sort((a, b) => (a.fam === -1) - (b.fam === -1) || b.plays - a.plays)
    .map(g => ({ ...g, name: famName(g.fam), hue: famHue(g.fam) }));
}

// ShShelf — TOP-LEVEL component on purpose: defining it inside ShelvesView gave it a new
// identity every render, so any tap remounted the row and reset its horizontal scroll (the
// mobile "position jumps back" bug). Stable identity = React keeps the DOM (and scrollLeft).
// Desktop rows drag-to-pan (Culture-style); the scrollbar is replaced by a progress line + %.
// Progress updates go straight to the DOM (refs) — a 500-spine row must not re-render per frame.
function ShShelf({ id, name, hue, albums, depth, cap, onMore, splittable, splitLabel, splitOn, onSplit, expanded, setExpanded, setReader }) {
  const visible = albums.slice(0, cap);
  const rowRef = React.useRef(null), barRef = React.useRef(null), pctRef = React.useRef(null), progRef = React.useRef(null);
  const drag = React.useRef({ down: false, moved: false });
  const syncProg = () => {
    const el = rowRef.current; if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    if (progRef.current) progRef.current.style.display = max > 4 ? "" : "none";
    if (max <= 4) return;
    const pct = el.scrollLeft / max;
    const thumb = Math.max(8, (el.clientWidth / el.scrollWidth) * 100);
    if (barRef.current) { barRef.current.style.width = thumb + "%"; barRef.current.style.marginLeft = (pct * (100 - thumb)) + "%"; }
    if (pctRef.current) pctRef.current.textContent = String(Math.round(pct * 100)).padStart(2, "0") + "%";
  };
  React.useEffect(() => { syncProg(); }, [cap, albums.length]);
  const onDown = (e) => { if (e.button !== 0) return; drag.current = { down: true, x: e.clientX, sl: rowRef.current.scrollLeft, moved: false }; };
  React.useEffect(() => {
    const onMove = (e) => {
      const d = drag.current; if (!d.down) return;
      const el = rowRef.current; if (!el) return;
      const dx = e.clientX - d.x;
      if (!d.moved && Math.abs(dx) > 4) { d.moved = true; el.classList.add("dragging"); setExpanded(null); }
      if (d.moved) el.scrollLeft = d.sl - dx;
    };
    const onUp = () => {
      const d = drag.current; if (!d.down) return;
      if (rowRef.current) rowRef.current.classList.remove("dragging");
      d.down = false;
      if (d.moved) setTimeout(() => { d.moved = false; }, 0);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);
  const onClickCapture = (e) => { if (drag.current && drag.current.moved) { e.stopPropagation(); e.preventDefault(); } };
  return (
    <section className="sh-shelf" data-depth={depth || 0}>
      <div className="sh-shelf-h">
        <span className="sh-shelf-name" style={{ "--h": hue }}>{name}</span>
        <span className="sh-shelf-n">{fmt(albums.length)} records · {fmt(albums.reduce((s, a) => s + a.plays, 0))} plays</span>
        {splittable && (
          <button className="sh-split" onClick={onSplit}>{splitOn ? "merge ▴" : `${splitLabel || "split"} ▾`}</button>
        )}
      </div>
      <div className="sh-row" ref={rowRef} onScroll={syncProg} onMouseLeave={() => setExpanded(null)}
        onMouseDown={onDown} onClickCapture={onClickCapture}>
        {visible.map(al => (
          <ShSpine key={al.key} al={al} expanded={expanded === al.key}
            onExpand={setExpanded} onOpen={setReader} />
        ))}
        {albums.length > cap && (
          <button className="sh-more" onClick={onMore}>+{fmt(albums.length - cap)}<br />dig<br />deeper</button>
        )}
      </div>
      <div className="sh-prog" ref={progRef}><div className="sh-prog-track"><i ref={barRef} style={{ "--h": hue }} /></div><span ref={pctRef} className="r-mono">0%</span></div>
    </section>
  );
}

function ShelvesView({ go }) {
  const R = window.ROTATION;
  const [ready, setReady] = React.useState(!!(window.ROTATION_MEDIA && window.ROTATION_PREVIEWS));
  const [expanded, setExpanded] = React.useState(null);   // fanned-open spine key
  const [reader, setReader] = React.useState(null);       // album in the Reader
  const [caps, setCaps] = React.useState({});             // shelfKey → extra visibility
  const [split, setSplit] = React.useState({});           // famIdx → split into subgenre rows
  const [mode, setMode] = React.useState("racks");        // racks | wrap (the Unplayed Shelf)
  const [lens, setLens] = React.useState("genre");        // re-shelving lens (racks mode)
  const [unReady, setUnReady] = React.useState(!!window.ROTATION_UNPLAYED);
  React.useEffect(() => {
    let need = 0; const done = () => { if (--need <= 0) setReady(true); };
    const load = (src, glob) => { if (window[glob]) return; need++; const s = document.createElement("script"); s.src = src; s.onload = done; document.head.appendChild(s); };
    load("media-index.js", "ROTATION_MEDIA"); load("track-previews.js", "ROTATION_PREVIEWS");
    if (need === 0) setReady(true);
  }, []);
  React.useEffect(() => {   // shrinkwrap data loads only when the mode is first opened
    if (mode !== "wrap" || window.ROTATION_UNPLAYED) { if (window.ROTATION_UNPLAYED && !unReady) setUnReady(true); return; }
    const s = document.createElement("script"); s.src = "shelves-unplayed.js"; s.onload = () => setUnReady(true); document.head.appendChild(s);
  }, [mode]);

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
    return { albums };
  }, [ready, R]);
  const rackShelves = React.useMemo(() => data ? shGroupBy(lens, data.albums, R) : null, [data, lens, R]);

  // the shrinkwrap wall — LPs by well-played artists that were never pressed play on
  const unData = React.useMemo(() => {
    const UN = window.ROTATION_UNPLAYED; if (!UN) return null;
    const albums = [];
    let i = 0;
    for (const [artist, list] of Object.entries(UN)) {
      const id = (R.idForName && R.idForName(artist)) || R.slug(artist);
      const rec = (R.expById && R.expById[id]) || R.byId[id];
      const hue = rec ? rec.hue : 210;
      const fam = rec && rec.fam != null ? rec.fam : (rec && rec.s && rec.s.length ? (R.SUBS[rec.s[0]] || {}).fam : null);
      const sub = rec && rec.s && rec.s.length ? rec.s[0] : null;
      const aPlays = rec ? rec.plays : 0;
      for (const [title, year, cover] of list) {
        albums.push({ key: "u" + (i++), title, artist, artistId: id, plays: aPlays, artistPlays: aPlays,
          unplayed: true, year, cover, hue, fam, sub, meta: [year, "a", ""], firstYear: 0, lastYear: 0, tt: 0, played: 0, topTrackKey: null });
      }
    }
    albums.sort((x, y) => y.artistPlays - x.artistPlays || (y.year || 0) - (x.year || 0));
    return { albums, shelves: shGroupShelves(albums, R) };
  }, [unReady, R]);

  if (!ready || !data) return <div className="r-view"><div className="r-mono" style={{ color: "var(--ink-faint)", padding: 40 }}>stocking the shelves…</div></div>;

  // lens-aware shelf splitting: genre → subgenre rows · decade → 5-year bins · mood → by depth
  const SPLIT_LABELS = { genre: "split into subgenres", decade: "split into 5-year bins", mood: "split by depth" };
  const subRows = (g) => {
    const by = new Map();
    const push = (k, al) => { if (!by.has(k)) by.set(k, []); by.get(k).push(al); };
    if (lens === "decade") {
      for (const al of g.albums) {
        const y = (al.meta && al.meta[0]) || 0;
        push(y ? `${Math.floor(y / 5) * 5}–${Math.floor(y / 5) * 5 + 4}` : "year unknown", al);
      }
      return [...by.entries()].sort((a, b) => b[0].localeCompare(a[0]));
    }
    if (lens === "mood") {
      for (const al of g.albums) {
        const d = al.dna || [50, 50];
        const depth = Math.max(Math.abs((d[0] || 50) - 50), Math.abs((d[1] || 50) - 50));
        push(depth >= 30 ? `deepest ${g.name.replace(" · ", "-")}` : `${g.name.replace(" · ", "-")} — on the edge`, al);
      }
      return [...by.entries()].sort((a, b) => a[0].startsWith("deepest") ? -1 : 1);
    }
    // genre: albums keyed by their artist's primary sub within this family
    for (const al of g.albums)
      push(al.sub != null && R.SUBS[al.sub] && R.SUBS[al.sub].fam === g.fam ? R.SUBS[al.sub].name : "other", al);
    return [...by.entries()].sort((a, b) => (a[0] === "other") - (b[0] === "other") ||
      b[1].reduce((s2, x) => s2 + x.plays, 0) - a[1].reduce((s2, x) => s2 + x.plays, 0));
  };

  const dig = () => {
    const pool = mode === "wrap" && unData ? unData.albums : data.albums.filter(a => a.plays >= 20);
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (pick) setReader(pick);
  };

  return (
    <div className="r-view">
      <div className="r-viewhead">
        <div>
          <div className="r-kicker">Shelves · {mode === "wrap"
            ? (unData ? `${fmt(unData.albums.length)} LPs still in shrinkwrap` : "…")
            : `${fmt(data.albums.length)} records racked`}</div>
          <h1 className="r-title">{mode === "wrap" ? <>Still <em>sealed</em></> : <>The record <em>shop</em></>}<span className="dot">.</span></h1>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span className="r-seg">
            <button data-on={mode === "racks"} onClick={() => setMode("racks")}>the racks</button>
            <button data-on={mode === "wrap"} onClick={() => setMode("wrap")}>shrinkwrapped</button>
          </span>
          <button className="sh-dig" onClick={dig}>🎲 crate dig</button>
        </div>
      </div>
      <p className="r-lede" style={{ marginTop: -8, marginBottom: 22 }}>
        {mode === "wrap"
          ? <>Records by artists you love (20+ plays) that you've <b>never pressed play on</b>. The blind-spot wall.</>
          : <>Every album you've played, racked by genre. Brush a spine to fan it open{" "}
            <span className="r-mono" style={{ fontSize: 10 }}>(tap once on touch)</span> — click the cover for the counter.</>}
      </p>

      {mode === "racks" && (
        <div className="sh-lensbar">
          <span className="r-mono" style={{ fontSize: 9, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--ink-faint)" }}>shelve by</span>
          {SH_LENSES.map(([k, lbl]) => (
            <button key={k} className="sh-lens" data-on={lens === k} onClick={() => { setLens(k); setSplit({}); }}>{lbl}</button>
          ))}
        </div>
      )}

      {mode === "wrap" && !unData && <div className="r-mono" style={{ color: "var(--ink-faint)", padding: 30 }}>unwrapping…</div>}

      {(mode === "wrap" ? (unData ? unData.shelves : []) : rackShelves).map(g => split[g.fam] && mode === "racks" && SPLIT_LABELS[lens]
        ? (
          <div key={g.fam} className="sh-famgroup">
            <div className="sh-shelf-h" style={{ marginBottom: 2 }}>
              <span className="sh-shelf-name" style={{ "--h": g.hue, fontSize: 17 }}>{g.name}</span>
              <button className="sh-split" onClick={() => setSplit(p => ({ ...p, [g.fam]: false }))}>merge ▴</button>
            </div>
            {subRows(g).map(([sname, arr], si) => (
              <div key={g.fam + sname} className="sh-reveal" style={{ animationDelay: (si * 45) + "ms" }}>
                <ShShelf id={g.fam + ":" + sname} name={sname} hue={g.hue} albums={arr} depth={1}
                  cap={SH_CAP + (caps[g.fam + ":" + sname] || 0)}
                  onMore={() => setCaps(p => ({ ...p, [g.fam + ":" + sname]: (p[g.fam + ":" + sname] || 0) + SH_STEP }))}
                  expanded={expanded} setExpanded={setExpanded} setReader={setReader} />
              </div>
            ))}
          </div>
        )
        : <ShShelf key={mode + lens + g.fam} id={mode + lens + g.fam} name={g.name} hue={g.hue} albums={g.albums}
            cap={SH_CAP + (caps[mode + lens + g.fam] || 0)}
            onMore={() => setCaps(p => ({ ...p, [mode + lens + g.fam]: (p[mode + lens + g.fam] || 0) + SH_STEP }))}
            splittable={mode === "racks" && !!SPLIT_LABELS[lens] && g.albums.length > 6 && g.fam !== "Lzz"}
            splitLabel={SPLIT_LABELS[lens]} splitOn={!!split[g.fam]}
            onSplit={() => setSplit(p => ({ ...p, [g.fam]: !p[g.fam] }))}
            expanded={expanded} setExpanded={setExpanded} setReader={setReader} />)}

      {reader && <ShReader al={reader} onClose={() => setReader(null)} go={go} />}

      <style>{`
        .sh-lensbar { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; margin: -6px 0 20px; }
        .sh-lens { padding: 5px 12px; border-radius: 999px; border: 1px solid var(--rule); background: none;
          color: var(--ink-faint); cursor: pointer; font-family: var(--mono); font-size: 9px;
          letter-spacing: .1em; text-transform: uppercase; transition: color .15s, border-color .15s; }
        .sh-lens:hover { color: var(--ink); }
        .sh-lens[data-on="true"] { color: var(--accent); border-color: var(--accent-dim); }
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
          border-bottom: 3px solid var(--rule-2); -webkit-overflow-scrolling: touch;
          scrollbar-width: none; cursor: grab; user-select: none; }
        .sh-row::-webkit-scrollbar { display: none; }
        .sh-row:active, .sh-row.dragging { cursor: grabbing; }
        .sh-cover { -webkit-user-drag: none; user-drag: none; }
        .sh-prog { display: flex; align-items: center; gap: 8px; margin-top: 5px; }
        .sh-prog-track { flex: 1; height: 2px; background: var(--bg-3); border-radius: 2px; overflow: hidden; }
        .sh-prog-track i { display: block; height: 100%; width: 0; background: oklch(0.55 0.11 var(--h, 260) / .8); border-radius: 2px; }
        .sh-prog > span { font-size: 8.5px; color: var(--ink-faint); width: 30px; text-align: right; }
        .sh-reveal { animation: shReveal .32s cubic-bezier(.25,.8,.35,1) both; }
        @keyframes shReveal { from { opacity: 0; transform: translateY(-10px); } }
        /* spine = ONE flat tone of the artist's genre hue, tuned DEEPER + RICHER to sit in the
           site's palette (the earlier lighter mix read pastel/detached — Fuad). */
        .sh-spine { flex: none; width: 18px; height: 128px; border-radius: 2px 2px 0 0; cursor: pointer;
          position: relative; overflow: hidden;
          background: oklch(0.31 0.075 var(--h));
          box-shadow: inset -2px 0 3px rgba(0,0,0,.4);
          transition: width .22s cubic-bezier(.3,.8,.3,1), box-shadow .22s; }
        .sh-spine[data-worn="1"] { background: oklch(0.35 0.095 var(--h)); }
        .sh-spine[data-worn="2"] { background: oklch(0.4 0.115 var(--h)); }
        .sh-spine[data-worn="3"] { background: oklch(0.46 0.135 var(--h));
          box-shadow: inset -2px 0 3px rgba(0,0,0,.4), 0 -2px 12px oklch(0.6 0.14 var(--h) / .45); }
        .sh-spine:hover { box-shadow: inset -2px 0 3px rgba(0,0,0,.35), 0 -3px 14px oklch(0.6 0.14 var(--h) / .35); }
        .sh-spine.on { width: 128px; }
        .sh-label { position: absolute; inset: 8px 0 6px; writing-mode: vertical-rl; font-family: var(--sans, Inter, sans-serif);
          font-size: 9px; font-weight: 500; letter-spacing: .02em; color: rgba(255,255,255,.72); white-space: nowrap;
          overflow: hidden; text-overflow: ellipsis; text-align: left; pointer-events: none; }
        .sh-spine[data-worn="3"] .sh-label { color: rgba(255,255,255,.9); }
        /* shrinkwrap gloss — a diagonal sheen on never-played records */
        .sh-spine[data-wrap="1"]::after { content: ""; position: absolute; inset: 0; pointer-events: none;
          background: linear-gradient(115deg, transparent 32%, rgba(255,255,255,.16) 46%, transparent 58%); }
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
        .sh-sleeve { position: relative; flex: none; width: 168px; height: 168px; z-index: 0; }
        .sh-reader-body { position: relative; z-index: 1; }
        .sh-x { z-index: 2; }
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
