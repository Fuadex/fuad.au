// canvas-app.jsx — Canvas Phase 1: the wall (collage + salon toggle), Reader, Museums.
// Data: museums.js + artworks.js (hand canon) ⊕ art_data.js (Wikidata/Commons overlay, by id).
// Routes: #/ (wall) · #/museums · #/work/<id>. Confidence renders honestly: "?" = probably,
// "??" = unsure, faded card. No-image works (copyright/TBC) are text-forward cards by design.
const { useState, useEffect, useMemo, useRef, useCallback } = React;

const MUSEUMS = window.CANVAS_MUSEUMS || [];
// Anonymous / institutional works (artifact decks — British Museum, NMK Seoul) carry a null
// artist; coerce to "" once here so the many downstream `.artist.replace/.split/.localeCompare`
// sites don't throw. Falsy-guards elsewhere (`w.artist || "—"`, `p.artist ? …`) still hold.
const WORKS = (window.CANVAS_ARTWORKS || []).map(w => (w.artist == null ? { ...w, artist: "" } : w));
const AD = window.CANVAS_ART_DATA || { museums: {}, artworks: {}, artists: {} };

const MUS_BY_ID = {}; for (const m of MUSEUMS) MUS_BY_ID[m.id] = m;
const COUNTRY = { jp: "Japan", us: "United States", fr: "France", ie: "Ireland", gb: "United Kingdom", at: "Austria", pl: "Poland", se: "Sweden", au: "Australia", nl: "Netherlands", ch: "Switzerland", de: "Germany", ca: "Canada", it: "Italy", gr: "Greece", kr: "South Korea" };

// merged view of one work: hand canon ⊕ overlay
const HIRES = window.CANVAS_HIRES || {};
function enrich(w) {
  const d = AD.artworks[w.id] || {};
  const artist = AD.artists[w.artistId] || {};
  const venues = (Array.isArray(w.seenAt) ? w.seenAt : w.seenAt ? [w.seenAt] : []).map(id => MUS_BY_ID[id]).filter(Boolean);
  // hand-set images on the canon row (in-copyright works Wikidata can't supply) beat the overlay.
  // Machine img resolves first (thumbnails: grid stays lightweight); a hi-res overlay (Met/AIC/CMA
  // full-res, keyed by id) is layered BETWEEN hand and machine: it only upgrades the zoom/large
  // context, never the grid thumbnail — unless the machine has no image at all, then it fills in.
  const hires = HIRES[w.id] || null;
  const mImg = d.img || null, mGrid = d.imgGrid || null, mZoom = d.imgZoom || null;
  const hi = hires && hires.img ? hires.img : null;
  return { ...w, ...d, artistData: artist, venues, year: w.year || d.year || null, hires,
    img: w.img || mImg || hi || null,
    imgGrid: w.imgGrid || mGrid || (mImg ? null : hi) || null,
    imgZoom: w.imgZoom || hi || mZoom || null };
}

function useRoute() {
  const parse = () => {
    const h = (location.hash || "#/").replace(/^#\/?/, "");
    const segs = h.split("/");
    return { view: segs[0] || "wall", id: segs[1] || null, part: segs[2] ? (parseInt(segs[2], 10) || 1) : 1 };
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
// arrangement helpers — dominant-hue of a work (grey/no-palette sort last), primary movement,
// and century band. All from data already loaded (CANVAS_PALETTE, AD.artists movementQids, year).
const palHueOf = (w) => { const p = (window.CANVAS_PALETTE || {})[w.id]; if (!p || !p[0]) return 999; const h = hexHue(p[0]); return h < 0 ? 998 : h; };
const movOf = (w) => { const a = AD.artists[w.artistId]; const q = a && a.movementQids && a.movementQids[0]; return (q && (AD.movements || {})[q]) || null; };
const centuryOf = (w) => w.year ? Math.floor(w.year / 100) * 100 : null;

function Wall({ go, mode = "collage" }) {
  const all = useMemo(() => WORKS.map(enrich), []);
  const [filt, setFilt] = useState("all");
  const [mus, setMus] = useState("");
  const [sort, setSort] = useState("hang");
  const [extra, setExtra] = useState(0);
  useEffect(() => { setExtra(0); }, [filt, mus, sort, mode]);

  const shown = useMemo(() => {
    let list = all;
    if (filt === "floored") list = list.filter(w => w.floored || w.favorite);
    if (filt === "loved") list = list.filter(w => w.floored || w.favorite || w.liked);
    if (filt === "sure") list = list.filter(w => w.seenConfidence === "sure");
    if (filt === "unsure") list = list.filter(w => w.seenConfidence !== "sure");
    if (filt === "wish") list = list.filter(w => w.wish);
    if (mus) list = list.filter(w => (Array.isArray(w.seenAt) ? w.seenAt : [w.seenAt || w.at]).includes(mus));
    const arr = [...list];
    if (mode === "spectrum") arr.sort((a, b) => palHueOf(a) - palHueOf(b) || weight(a) - weight(b));
    else if (mode === "timeline") arr.sort((a, b) => (a.year || 9999) - (b.year || 9999) || weight(a) - weight(b));
    else if (mode === "movements") arr.sort((a, b) => { const ma = movOf(a), mb = movOf(b); return (ma ? 0 : 1) - (mb ? 0 : 1) || String(ma).localeCompare(String(mb)) || (a.year || 0) - (b.year || 0); });
    else { // collage — respect the sort dropdown
      if (sort === "hang") arr.sort((a, b) => (b.imgGrid ? 1 : 0) - (a.imgGrid ? 1 : 0) || weight(a) - weight(b));
      if (sort === "year") arr.sort((a, b) => (a.year || 9999) - (b.year || 9999));
      if (sort === "artist") arr.sort((a, b) => a.artist.localeCompare(b.artist) || (a.year || 0) - (b.year || 0));
      if (sort === "museum") arr.sort((a, b) => String(a.seenAt).localeCompare(String(b.seenAt)) || weight(a) - weight(b));
    }
    return arr;
  }, [all, filt, mus, sort, mode]);
  const visN = CAP + extra;
  const musOpts = useMemo(() => {
    const counts = {};
    for (const w of all) for (const id of (Array.isArray(w.seenAt) ? w.seenAt : [w.seenAt || w.at])) if (id) counts[id] = (counts[id] || 0) + 1;
    return MUSEUMS.filter(m => counts[m.id]).map(m => ({ id: m.id, label: m.name.replace(/\s*\(.*\)$/, "") + " (" + counts[m.id] + ")" }));
  }, [all]);

  // grouped modes (timeline/movements) break the visible slice into labelled sections; collage
  // and spectrum are one continuous masonry.
  const vis = shown.slice(0, visN);
  const grouped = (mode === "timeline" || mode === "movements") && vis.length > 0;
  const sections = useMemo(() => {
    if (!grouped) return null;
    const keyOf = mode === "timeline" ? centuryOf : movOf;
    const labelOf = mode === "timeline"
      ? (k) => k == null ? "Undated" : k + "s"
      : (k) => k || "Other movements";
    const out = []; let cur = null;
    for (const w of vis) { const k = keyOf(w); if (!cur || cur.k !== k) { cur = { k: k == null ? "∅" : k, label: labelOf(k), items: [] }; out.push(cur); } cur.items.push(w); }
    return out;
  }, [vis, mode, grouped]);

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
        {mode === "collage" && (
          <select value={sort} onChange={e => setSort(e.target.value)}>
            <option value="hang">hang order</option>
            <option value="year">by year</option>
            <option value="artist">by artist</option>
            <option value="museum">by museum</option>
          </select>
        )}
        <span className="cv-count">{Math.min(visN, shown.length)} of {shown.length}</span>
      </div>
      {grouped
        ? sections.map(g => (
          <section className="cv-section" key={g.k}>
            <h3 className="cv-section-h">{g.label}<span className="cv-section-n">{g.items.length}</span></h3>
            <div className="cv-wall">{g.items.map(w => <Card key={w.id} w={w} go={go} />)}</div>
          </section>
        ))
        : <div className="cv-wall">{vis.map(w => <Card key={w.id} w={w} go={go} />)}</div>}
      {shown.length > visN && (
        <div className="cv-more"><button onClick={() => setExtra(e => e + CAP)}>hang {Math.min(CAP, shown.length - visN)} more</button></div>
      )}
    </React.Fragment>
  );
}

// ——— Pilgrimage: deck-derived wishes (artworks.js wish:true) grouped by holding museum,
// plus hand-authored places (pilgrimage.js) the decks can't know — the trip planner seed.
// (The standalone Pilgrimage view was folded into the Map — the "to see" works now pin to
//  their holding city on the map, with the grouped list beneath it. See MapView.)

// full-screen pan/zoom (Phase 5 "stand close to the brushwork" mode) — dependency-free:
// scroll to zoom (1–8×), drag to pan, double-click resets, Esc closes. Uses a 3200px thumb.
//
// CRASH FIX (was: onMouseMove → setT → React re-render on every mousemove pixel → jank/crash):
//   • Transform is written directly to img.style.transform via a ref on every pointermove event
//     (no React re-render mid-drag).
//   • State (scale+pan) is committed to React only on pointerup so React is only involved twice
//     (mount + release). This eliminates the re-render storm that caused the jank/crash.
//   • Pointer capture (setPointerCapture) keeps events coming even when the pointer leaves the
//     div — previously drag would silently stall on a fast swipe out-of-bounds.
//   • All listeners are on the overlay div (not window), cleaned up on unmount via the ref guard.
//   • Pan is clamped to avoid runaway offsets at low zoom.
function Zoom({ src, onClose }) {
  const imgRef = useRef(null);
  const overlayRef = useRef(null);
  // committed state: only updated on release so React never re-renders mid-drag
  const [committed, setCommitted] = useState({ s: 1.6, x: 0, y: 0 });
  // live state kept in a ref so pointermove reads it without stale closures
  const live = useRef({ s: 1.6, x: 0, y: 0 });
  const drag = useRef(null); // { pointerId, startX, startY, baseX, baseY }
  const raf = useRef(0);

  const applyTransform = useCallback((s, x, y) => {
    if (!imgRef.current) return;
    imgRef.current.style.transform = `translate(${x}px,${y}px) scale(${s})`;
  }, []);

  // keep live ref in sync with committed (e.g. on double-click reset)
  useEffect(() => {
    live.current = { ...committed };
    applyTransform(committed.s, committed.x, committed.y);
  }, [committed]);

  useEffect(() => {
    const on = (e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", on, true);
    return () => {
      window.removeEventListener("keydown", on, true);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [onClose]);

  // wheel handler — bound non-passively so we can preventDefault
  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      const { s, x, y } = live.current;
      const ns = Math.min(8, Math.max(1, s * (e.deltaY < 0 ? 1.15 : 0.87)));
      // scale around cursor position
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left - rect.width / 2;
      const cy = e.clientY - rect.top - rect.height / 2;
      const nx = cx + (x - cx) * (ns / s);
      const ny = cy + (y - cy) * (ns / s);
      live.current = { s: ns, x: nx, y: ny };
      if (!raf.current) raf.current = requestAnimationFrame(() => {
        raf.current = 0;
        applyTransform(live.current.s, live.current.x, live.current.y);
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [applyTransform]);

  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    // Don't capture/start pan when pressing the close button or hint — let their click fire normally.
    if (e.target.closest(".cv-zoom-close") || e.target.closest(".cv-zoom-hint")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, baseX: live.current.x, baseY: live.current.y };
  };

  const onPointerMove = (e) => {
    if (!drag.current || drag.current.pointerId !== e.pointerId) return;
    const nx = drag.current.baseX + (e.clientX - drag.current.startX);
    const ny = drag.current.baseY + (e.clientY - drag.current.startY);
    live.current = { ...live.current, x: nx, y: ny };
    if (!raf.current) raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      if (!imgRef.current) return;
      imgRef.current.style.transform = `translate(${live.current.x}px,${live.current.y}px) scale(${live.current.s})`;
    });
  };

  const onPointerUp = (e) => {
    if (!drag.current || drag.current.pointerId !== e.pointerId) return;
    drag.current = null;
    // commit to React state so a future double-click reset sees the right base
    setCommitted({ ...live.current });
  };

  const onDoubleClick = () => {
    drag.current = null;
    setCommitted({ s: 1.6, x: 0, y: 0 });
  };

  return (
    <div className="cv-zoom" ref={overlayRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={onDoubleClick}>
      <img ref={imgRef} src={src.replace(/width=\d+/, "width=3200")} alt=""
        style={{ transform: `translate(${committed.x}px,${committed.y}px) scale(${committed.s})` }}
        draggable="false" />
      <button className="cv-r-close cv-zoom-close" onClick={onClose}>✕</button>
      <div className="cv-zoom-hint">scroll to zoom · drag to pan · double-click resets · Esc closes</div>
    </div>
  );
}

// ——— Deep zoom: full-screen OpenSeadragon — three source tiers:
//   1. IIIF (AIC/Met/CMA tiled): work.hires.iiif — full tile pyramid, best quality
//   2. hires simple image: work.hires.img — OSD simple-image source, whole file fetched
//   3. fallback simple image: work.imgZoom || work.img — same simple-image path, no hires entry
// The OSD script is vendored (never CDN) and lazy-loaded ONCE via a shared #osd-js tag; the
// viewer mounts into its own dark layer above the Reader and is destroyed on close.
// osdFailed: module-level flag set when the OSD script itself fails to load, so we can skip
// the OSD path entirely and tell the Reader to fall back to the plain Zoom overlay.
let osdLoad = null; // shared promise so the script is fetched a single time across opens
let osdFailed = false; // true after a hard script-load error
function loadOSD() {
  if (window.OpenSeadragon) return Promise.resolve();
  if (osdFailed) return Promise.reject(new Error("osd previously failed"));
  if (osdLoad) return osdLoad;
  osdLoad = new Promise((resolve, reject) => {
    let s = document.getElementById("osd-js");
    if (!s) {
      s = document.createElement("script");
      s.id = "osd-js";
      s.src = "vendor/openseadragon/openseadragon.min.js";
      document.body.appendChild(s);
    }
    s.addEventListener("load", () => resolve());
    s.addEventListener("error", () => { osdLoad = null; osdFailed = true; reject(new Error("osd load failed")); });
  });
  return osdLoad;
}

// Derive the OSD tileSource and caption label for any work.
// Returns { tileSource, label } or null if no usable image exists.
function resolveOSDSource(work) {
  if (!work) return null;
  // cors: only claim Anonymous where the host actually sends ACAO (museum APIs, wikimedia);
  // for arbitrary hosts (reddit etc.) crossOriginPolicy must be FALSE or the tile load errors.
  if (work.hires && work.hires.iiif) {
    const src = (work.hires.src || "").toUpperCase();
    return { tileSource: work.hires.iiif, cors: "Anonymous", label: src ? `deep zoom via ${src}` : "deep zoom" };
  }
  if (work.hires && work.hires.img) {
    const src = (work.hires.src || "").toUpperCase();
    return { tileSource: { type: "image", url: work.hires.img }, cors: "Anonymous", label: src ? `deep zoom via ${src}` : "deep zoom" };
  }
  const simpleUrl = work.imgZoom || work.img;
  if (simpleUrl) {
    // ALWAYS cors:false for canon images — Commons Special:FilePath REDIRECT hops send no
    // ACAO header, so a crossorigin=anonymous load fails the whole chain (found 2026-07-12
    // via the Murillo). We never need pixel access for viewing; plain loads are strictly better.
    return { tileSource: { type: "image", url: simpleUrl }, cors: false, label: work.title.replace(/^TBC — /, "") };
  }
  return null;
}

// Fly an OSD viewer to a normalized-image region {x,y,w,h} (all 0..1 fractions of the image).
// immediately=false gives the gentle animated spring flight; true snaps. Shared by DeepZoom's
// detail tour and Study mode's anchored zoom so the imageToViewportRectangle math lives once.
function flyToAnchor(viewer, a, immediately) {
  if (!viewer || !a) return;
  try {
    const item = viewer.world.getItemAt(0);
    if (!item) return;
    const size = item.getContentSize();
    const rect = viewer.viewport.imageToViewportRectangle(
      a.x * size.x, a.y * size.y, a.w * size.x, a.h * size.y
    );
    viewer.viewport.fitBounds(rect, !!immediately);
  } catch (e) {}
}

// Mount an OpenSeadragon viewer for `work` into elRef, reusing loadOSD + resolveOSDSource.
// Returns { viewerRef, err, ready }. onOsdFail (optional) fires if the OSD *script* won't load
// (so callers can fall back to the plain Zoom overlay); otherwise a source/open failure sets err.
// The viewer is created once and destroyed on unmount. `ready` flips true once world is loaded,
// which is when imageToViewportRectangle math becomes valid (anchors can fly).
function useOSDViewer(work, onOsdFail) {
  const elRef = useRef(null);
  const viewerRef = useRef(null);
  const [err, setErr] = useState(false);
  const [ready, setReady] = useState(false);
  const osdSrc = useMemo(() => resolveOSDSource(work), [work]);
  useEffect(() => {
    let cancelled = false;
    if (!osdSrc) { setErr(true); return; }
    loadOSD().then(() => {
      if (cancelled || !elRef.current || !window.OpenSeadragon) return;
      try {
        const viewer = window.OpenSeadragon({
          element: elRef.current,
          prefixUrl: "vendor/openseadragon/images/",
          tileSources: osdSrc.tileSource,
          showNavigator: true,
          navigatorPosition: "BOTTOM_RIGHT",
          showNavigationControl: false,
          maxZoomPixelRatio: 2,
          gestureSettingsMouse: { clickToZoom: false, dblClickToZoom: true },
          crossOriginPolicy: osdSrc.cors,
          ajaxWithCredentials: false,
        });
        viewer.addHandler("open-failed", () => { if (!cancelled) setErr(true); });
        viewer.addHandler("open", () => { if (!cancelled) setReady(true); });
        viewerRef.current = viewer;
      } catch (e) { if (!cancelled) setErr(true); }
    }).catch(() => {
      if (!cancelled) { if (onOsdFail) onOsdFail(); else setErr(true); }
    });
    return () => {
      cancelled = true;
      if (viewerRef.current) { try { viewerRef.current.destroy(); } catch (e) {} viewerRef.current = null; }
    };
  }, [osdSrc]);
  return { elRef, viewerRef, err, ready, osdSrc };
}

// Site-styled zoom controls — the default OSD chrome (image-sprite + − home fullscreen
// buttons) is disabled in useOSDViewer; these are the only viewer buttons.
function OSDControls({ viewerRef }) {
  const zoom = (f) => { const v = viewerRef.current; if (v) { v.viewport.zoomBy(f); v.viewport.applyConstraints(); } };
  const home = () => { const v = viewerRef.current; if (v) v.viewport.goHome(false); };
  return (
    <div className="cv-osd-ctl">
      <button type="button" onClick={() => zoom(1.5)} title="Zoom in">+</button>
      <button type="button" onClick={() => zoom(1 / 1.5)} title="Zoom out">−</button>
      <button type="button" onClick={home} title="Full view">⌂</button>
    </div>
  );
}

function DeepZoom({ work, onClose, onOsdFail }) {
  const { elRef, viewerRef, err, osdSrc } = useOSDViewer(work, onOsdFail);
  const details = (work.hires && work.hires.details) || [];
  // activeDetail: null = full view; number = index into details
  const [activeDetail, setActiveDetail] = useState(null);

  // Navigate to a detail via OSD viewport, or go home
  const goToDetail = useCallback((idx) => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    if (idx === null) {
      setActiveDetail(null);
      viewer.viewport.goHome(false);
      return;
    }
    const d = details[idx];
    if (!d) return;
    setActiveDetail(idx);
    flyToAnchor(viewer, d, false);
  }, [details]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); return; }
      if (!details.length) return;
      if (e.key === "ArrowRight") {
        e.stopPropagation();
        setActiveDetail(prev => {
          const next = prev === null ? 0 : Math.min(prev + 1, details.length - 1);
          // defer so goToDetail sees the viewer
          setTimeout(() => goToDetail(next), 0);
          return next;
        });
      }
      if (e.key === "ArrowLeft") {
        e.stopPropagation();
        setActiveDetail(prev => {
          if (prev === null || prev === 0) { setTimeout(() => goToDetail(null), 0); return null; }
          const next = prev - 1;
          setTimeout(() => goToDetail(next), 0);
          return next;
        });
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [goToDetail, onClose]);

  const activeDet = activeDetail !== null ? details[activeDetail] : null;
  const capLabel = osdSrc ? osdSrc.label : work.title.replace(/^TBC — /, "");

  return (
    <div className="cv-osd">
      <div className="cv-osd-view" ref={elRef} />
      <OSDControls viewerRef={viewerRef} />
      {err && <div className="cv-osd-err">zoom unavailable — the tile source didn't load</div>}
      <button className="cv-r-close cv-osd-close" onClick={onClose}>✕</button>

      {/* Annotation tour strip — only when details exist */}
      {details.length > 0 && (
        <div className="cv-osd-tour">
          <button
            className={"cv-osd-chip" + (activeDetail === null ? " cv-osd-chip-home" : "")}
            onClick={() => goToDetail(null)}
            title="Return to full view">
            ⌂ full view
          </button>
          {details.map((d, i) => (
            <button
              key={i}
              className={"cv-osd-chip" + (activeDetail === i ? " cv-osd-chip-on" : "")}
              onClick={() => goToDetail(i)}
              title={d.t}>
              <span className="cv-osd-chip-n">{i + 1}</span>
              <span className="cv-osd-chip-t">{d.t}</span>
            </button>
          ))}
          {details.length > 1 && <span className="cv-osd-tour-hint">← → to step</span>}
        </div>
      )}

      {/* Active detail caption card — bottom-left, replaces plain cap while a detail is active */}
      {activeDet ? (
        <div className="cv-osd-det-cap">
          <span className="cv-osd-det-n">{activeDetail + 1}/{details.length}</span>
          <span className="cv-osd-det-title">{activeDet.t}</span>
          <span className="cv-osd-det-note">{activeDet.n}</span>
        </div>
      ) : (
        <div className="cv-osd-cap">{capLabel}{details.length ? " · click a detail below to explore" : ""}</div>
      )}
    </div>
  );
}

// ——— Study mode (#/study/<id>): the flagship "tour guide who can talk for minutes, plus prose
// bound to pixels". Full-screen two-pane: LEFT a persistent OSD viewer (reusing useOSDViewer +
// the detail-tour chip strip), RIGHT a scrollable reading pane — the four lenses as sections,
// then the long-form `deeper` study chapters. Any lens/chapter with an {x,y,w,h} anchor gets a
// "⌖ look" button that flies the viewer there; when an anchored section scrolls into view (and
// auto-follow is on) the viewer GENTLY flies there on its own — reading IS the tour.
const STUDY_LENS_LABELS = { see: "What you see", about: "What it's about", craft: "Why it sings", context: "The moment" };
const STUDY_LENS_ORDER = ["see", "about", "craft", "context"];

function StudyView({ id, go }) {
  const work = useMemo(() => { const x = WORKS.find(x => x.id === id); return x ? enrich(x) : null; }, [id]);
  const inspect = (window.CANVAS_INSPECT || {})[id] || null;
  const { elRef, viewerRef, err, ready } = useOSDViewer(work, null);
  const details = (work && work.hires && work.hires.details) || [];
  const [activeDetail, setActiveDetail] = useState(null);
  const [autoFollow, setAutoFollow] = useState(true);
  const autoRef = useRef(true); autoRef.current = autoFollow;
  const paneRef = useRef(null);

  // Build the ordered list of reading sections. Each: {key, label, body, anchor?}. Lenses first,
  // then the `deeper` chapters. Only sections with an anchor participate in scroll-follow / look.
  const sections = useMemo(() => {
    if (!inspect) return [];
    const out = [];
    for (const k of STUDY_LENS_ORDER) {
      if (inspect[k]) out.push({ key: "lens-" + k, label: STUDY_LENS_LABELS[k], body: inspect[k], anchor: null });
    }
    (inspect.deeper || []).forEach((c, i) => {
      const anchor = (typeof c.x === "number" && typeof c.y === "number" && typeof c.w === "number" && typeof c.h === "number")
        ? { x: c.x, y: c.y, w: c.w, h: c.h } : null;
      out.push({ key: "deep-" + i, label: c.t, body: c.body, anchor, chapter: true });
    });
    return out;
  }, [inspect]);
  const firstDeep = sections.findIndex(s => s.chapter);

  const flyTo = useCallback((anchor, immediately) => {
    const viewer = viewerRef.current;
    if (!viewer || !anchor) return;
    flyToAnchor(viewer, anchor, immediately);
  }, []);
  const goHome = useCallback(() => {
    setActiveDetail(null);
    const viewer = viewerRef.current;
    if (viewer) { try { viewer.viewport.goHome(false); } catch (e) {} }
  }, []);
  const goToDetail = useCallback((idx) => {
    if (idx === null) { goHome(); return; }
    setActiveDetail(idx);
    flyTo(details[idx], false);
  }, [details, flyTo, goHome]);

  // ESC leaves study back to the previous hash.
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); history.back(); } };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  // Bad/unknown artwork id: leave study (done in an effect so render stays side-effect-free).
  useEffect(() => { if (!work) history.back(); }, [work]);

  // Scroll-follow: observe every anchored section's heading; when one crosses ~0.6 visibility and
  // auto-follow is on, gently fly there. Only (re)wired once the viewer is ready and sections exist.
  useEffect(() => {
    if (!ready || !paneRef.current) return;
    const anchored = sections.filter(s => s.anchor);
    if (!anchored.length) return;
    const byKey = {};
    for (const s of anchored) byKey[s.key] = s.anchor;
    const obs = new IntersectionObserver((entries) => {
      if (!autoRef.current) return;
      // choose the most-visible anchored heading currently intersecting
      let best = null;
      for (const en of entries) {
        if (en.isIntersecting && en.intersectionRatio >= 0.6) {
          if (!best || en.intersectionRatio > best.intersectionRatio) best = en;
        }
      }
      if (best) {
        const key = best.target.getAttribute("data-skey");
        if (byKey[key]) flyTo(byKey[key], false);
      }
    }, { root: paneRef.current, threshold: [0, 0.6, 1] });
    for (const s of anchored) {
      const el = paneRef.current.querySelector(`[data-skey="${s.key}"]`);
      if (el) obs.observe(el);
    }
    return () => obs.disconnect();
  }, [ready, sections, flyTo]);

  if (!work) return null;
  const a = work.artistData || {};
  const life = a.born ? `${a.born}–${a.died || ""}` : null;

  return (
    <div className="cv-study">
      <div className="cv-study-viewer">
        <div className="cv-osd-view" ref={elRef} />
        <OSDControls viewerRef={viewerRef} />
        {err && <div className="cv-osd-err">zoom unavailable — the tile source didn't load</div>}
        {details.length > 0 && (
          <div className="cv-osd-tour cv-study-tour">
            <button className={"cv-osd-chip" + (activeDetail === null ? " cv-osd-chip-home" : "")}
              onClick={goHome} title="Return to full view">⌂ full view</button>
            {details.map((d, i) => (
              <button key={i} className={"cv-osd-chip" + (activeDetail === i ? " cv-osd-chip-on" : "")}
                onClick={() => goToDetail(i)} title={d.t}>
                <span className="cv-osd-chip-n">{i + 1}</span>
                <span className="cv-osd-chip-t">{d.t}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="cv-study-pane" ref={paneRef}>
        <div className="cv-study-panehead">
          <button className="cv-study-back" onClick={() => history.back()} title="Leave the study (Esc)">✕ close</button>
          <label className="cv-study-follow" title="Let the viewer follow your reading">
            <input type="checkbox" checked={autoFollow} onChange={e => setAutoFollow(e.target.checked)} />
            auto-follow
          </label>
        </div>
        <div className="cv-study-body">
          <h1 className="cv-study-title">{work.title.replace(/^TBC — /, "")}</h1>
          <div className="cv-study-meta">
            <b onClick={() => go("artist", work.artistId)} style={{ cursor: "pointer" }}>{work.artist.replace(/\s*\(.*\)$/, "")}</b>
            {life ? ` · ${life}` : ""}{work.year ? ` · ${work.year}` : ""}
          </div>
          {!inspect && <p className="cv-study-empty">No study written for this work yet.</p>}
          {sections.map((s, i) => (
            <React.Fragment key={s.key}>
              {s.chapter && i === firstDeep && (
                <div className="cv-study-chaprule"><span>The study</span></div>
              )}
              <section className={"cv-study-sec" + (s.chapter ? " cv-study-chapter" : "")}>
                <h2 className="cv-study-sec-h" data-skey={s.key}>
                  <span>{s.label}</span>
                  {s.anchor && (
                    <button className="cv-study-look" onClick={() => flyTo(s.anchor, false)}
                      title="Fly the viewer to this detail">⌖ look</button>
                  )}
                </h2>
                <p className="cv-study-sec-txt">{s.body}</p>
              </section>
            </React.Fragment>
          ))}
          <div className="cv-study-foot">
            <button className="cv-study-home" onClick={goHome}>⌂ full view</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Reader({ id, go }) {
  const w = useMemo(() => { const x = WORKS.find(x => x.id === id); return x ? enrich(x) : null; }, [id]);
  const [zoom, setZoom] = useState(false);       // plain Zoom overlay (fallback when OSD fails)
  const [deep, setDeep] = useState(false);       // DeepZoom (OSD) overlay
  const [tier, setTier] = useState("about");
  const [inspOpen, setInspOpen] = useState(false);
  // close returns to the previous history entry (home or wall, depending where the card was clicked)
  const close = () => { history.back(); };
  useEffect(() => { setZoom(false); setDeep(false); setTier("about"); setInspOpen(false); }, [id]);
  useEffect(() => {
    const on = (e) => { if (e.key === "Escape" && !zoom && !deep) close(); };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [zoom, deep]);
  if (!w) return null;
  const a = w.artistData;
  const life = a.born ? `${a.born}–${a.died || ""}` : null;
  const pal = (window.CANVAS_PALETTE || {})[id];
  const read = (window.CANVAS_ART_ABOUT || {})[id];
  const inspect = (window.CANVAS_INSPECT || {})[id] || null;

  // Does this work have a usable OSD source? (IIIF, hires.img, or fallback imgZoom/img)
  const hasDeepZoom = !!resolveOSDSource(w);
  // Clicking the hero image opens DeepZoom when available; falls back to plain Zoom only if
  // OSD script failed to load (osdFailed flag) and we have a imgZoom/img to show.
  const openZoom = () => {
    if (hasDeepZoom && !osdFailed) { setDeep(true); return; }
    // OSD unavailable — fall back to plain overlay if we have a zoom-worthy URL
    const fallbackSrc = w.imgZoom || w.img;
    if (fallbackSrc) setZoom(true);
  };
  // Called by DeepZoom when the OSD script itself fails to load; switches to plain overlay.
  const handleOsdFail = () => {
    setDeep(false);
    const fallbackSrc = w.imgZoom || w.img;
    if (fallbackSrc) setZoom(true);
  };

  return (
    <React.Fragment>
      <div className="cv-reader-bg" onClick={close} />
      <div className="cv-reader">
        <button className="cv-r-close" onClick={close}>✕</button>
        {w.img && <img className="hero" src={w.img} alt={w.title} title="click to zoom" style={{ cursor: "zoom-in" }} onClick={openZoom} />}
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
            {/* the full study is the flagship — promoted up here (Fuad: at the bottom it hides) */}
            {inspect && <button type="button" className="cv-chip cv-chip-study" onClick={() => go("study", w.id)}>Open the full study →</button>}
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
          {inspect && (
            <div className="cv-r-inspect">
              <div className="cv-r-inspect-rule" />
              <div className="cv-r-inspect-kicker">Inspection — a close reading by Fable</div>
              <div className="cv-r-inspect-lens">
                <span className="lbl">What you see</span>
                <p className="cv-r-inspect-txt">{inspect.see}</p>
              </div>
              {inspOpen && (
                <React.Fragment>
                  <div className="cv-r-inspect-lens">
                    <span className="lbl">What it's about</span>
                    <p className="cv-r-inspect-txt">{inspect.about}</p>
                  </div>
                  <div className="cv-r-inspect-lens">
                    <span className="lbl">Why it sings</span>
                    <p className="cv-r-inspect-txt">{inspect.craft}</p>
                  </div>
                  <div className="cv-r-inspect-lens">
                    <span className="lbl">The moment</span>
                    <p className="cv-r-inspect-txt">{inspect.context}</p>
                  </div>
                  {w.hires && w.hires.details && w.hires.details.length > 0 && (
                    <button type="button" className="cv-r-inspect-zoom" onClick={() => setDeep(true)}>⤢ walk the details in deep zoom</button>
                  )}
                  <button type="button" className="cv-r-inspect-study" onClick={() => go("study", w.id)}>Open the full study →</button>
                </React.Fragment>
              )}
              {!inspOpen && (
                <React.Fragment>
                  <button type="button" className="cv-r-inspect-more" onClick={() => setInspOpen(true)}>continue the inspection ▾</button>
                  {/* the study entry must be visible WITHOUT expanding (Fuad: "I don't see the button") */}
                  <button type="button" className="cv-r-inspect-study" onClick={() => go("study", w.id)}>Open the full study →</button>
                </React.Fragment>
              )}
            </div>
          )}
          <div className="cv-r-links">
            {hasDeepZoom && <button type="button" className="cv-r-deep" onClick={() => setDeep(true)}>⤢ Deep zoom</button>}
            {w.qid && <a href={`https://www.wikidata.org/wiki/${w.qid}`} target="_blank" rel="noopener noreferrer">Wikidata ↗</a>}
            {w.imgZoom && <a href={w.imgZoom} target="_blank" rel="noopener noreferrer">Full resolution ↗</a>}
            {a.qid && <a href={`https://www.wikidata.org/wiki/${a.qid}`} target="_blank" rel="noopener noreferrer">{w.artist.split(" ").pop()} on Wikidata ↗</a>}
          </div>
        </div>
      </div>
      {zoom && (w.imgZoom || w.img) && <Zoom src={w.imgZoom || w.img} onClose={() => setZoom(false)} />}
      {deep && <DeepZoom work={w} onClose={() => setDeep(false)} onOsdFail={handleOsdFail} />}
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
// Decks > 40 cards are split into sequential parts of 40 (last part = remainder).
// Part routing: #/deck/<museumId>/2 — part 1 is the default (no suffix needed).
// Verdicts and the export are deck-wide (all parts share one storeKey); the part split
// is presentation-only slicing so already-graded items work exactly as before.
const DECK_PART_SIZE = 40;
const SEEN_OPTS = [["no", "didn't see it"], ["unsure", "not sure"], ["yes", "saw it"]];
const LOVE_OPTS = [[0, "○ nothing special"], [1, "♡ like it"], [2, "♥ love it"]];
const migrateVerdict = (v) => typeof v === "string"
  ? { seen: v === "floored" ? "yes" : v, love: v === "floored" ? 2 : 0 } : v;
function Deck({ museumId, part, go }) {
  const HL = window.CANVAS_HIGHLIGHTS || {};
  // the "by-artists" virtual deck: discovery works by artists you love, tied to no single venue
  const VIRTUAL = museumId === "by-artists";
  const mus = VIRTUAL ? { name: "Works by artists you love" } : MUS_BY_ID[museumId];
  const canonQids = useMemo(() => new Set(WORKS.map(w => (AD.artworks[w.id] || {}).qid).filter(Boolean)), []);
  // full deck (all parts) — verdicts are stored here across parts
  const fullDeck = useMemo(() => {
    const src = VIRTUAL ? (window.CANVAS_BY_ARTISTS || []) : (HL[museumId] || []);
    return src.filter(w => !canonQids.has(w.qid));
  }, [museumId]);
  // part splitting: 40-card pages (last page = remainder); part is 1-based
  const numParts = Math.max(1, Math.ceil(fullDeck.length / DECK_PART_SIZE));
  const safePart = Math.min(Math.max(part || 1, 1), numParts);
  const partStart = (safePart - 1) * DECK_PART_SIZE;
  const deck = fullDeck.slice(partStart, partStart + DECK_PART_SIZE);
  const partHref = (p) => "#/deck/" + museumId + (p > 1 ? "/" + p : "");

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
  // reset card index when part changes (key on Deck in App handles full remount, but guard here too)
  useEffect(() => {
    const fo = deck.findIndex(w => !verdicts[w.qid]);
    setI(fo < 0 ? deck.length : fo);
    setCopied(false);
  }, [safePart, museumId]);
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

  if (!mus || !fullDeck.length) return <div className="cv-mus"><p>No deck for this museum (yet).</p></div>;

  // Part nav strip (only shown when there are multiple parts)
  const partNav = numParts > 1 ? (
    <div className="cv-deck-parts">
      {Array.from({ length: numParts }, (_, pi) => {
        const pn = pi + 1;
        const pStart = pi * DECK_PART_SIZE;
        const pSlice = fullDeck.slice(pStart, pStart + DECK_PART_SIZE);
        const pCount = pSlice.length;
        return (
          <a key={pn} className={"cv-deck-part" + (pn === safePart ? " cv-deck-part-on" : "")}
            href={partHref(pn)}>Part {pn} <span className="cv-deck-part-n">·{pCount}</span></a>
        );
      })}
    </div>
  ) : null;

  if (i >= deck.length) {
    // summary is for ALL parts combined (full-deck verdicts)
    const rows = fullDeck.filter(w => verdicts[w.qid] && (verdicts[w.qid].seen !== "no" || verdicts[w.qid].love > 0))
      .map(w => ({ qid: w.qid, title: w.title, artist: w.artist, year: w.year, museum: VIRTUAL ? null : museumId, ...verdicts[w.qid] }));
    const seen = rows.filter(r => r.seen === "yes");
    const discoveries = rows.filter(r => r.seen !== "yes" && r.love > 0);
    const json = JSON.stringify(rows, null, 1);
    const nextPart = safePart < numParts ? safePart + 1 : null;
    return (
      <div className="cv-deck">
        {partNav}
        <div className="cv-deck-head">{mus.name.replace(/\s*\(.*\)$/, "")} — Part {safePart} done</div>
        <p className="cv-deck-sum">{seen.length} recognised across all parts ({seen.filter(r => r.love === 2).length} floored) · {rows.filter(r => r.seen === "unsure").length} unsure · {discoveries.length} discoveries you'd love to see.</p>
        {nextPart && (
          <a className="cv-deck-btn cv-deck-btn-next" href={partHref(nextPart)}>Continue to Part {nextPart} →</a>
        )}
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
        <button className="cv-deck-btn" onClick={() => { setI(0); setCopied(false); }}>re-deal this part</button>
        <a className="cv-deal" href="#/museums">← back to museums</a>
      </div>
    );
  }

  const w = deck[i];
  return (
    <div className="cv-deck">
      {partNav}
      <div className="cv-deck-head">{mus.name.replace(/\s*\(.*\)$/, "")}{numParts > 1 ? " · Part " + safePart : ""} · did you see this?</div>
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
  // "Majors you haven't met" filters the notable list against the canon. Matching on qid alone
  // misses the common case where the canon holds a SPECIFIC painting (e.g. Haystacks, midday) but
  // the notable list carries the SERIES / generic qid (Haystacks). So also match by normalised
  // title: exact, prefix (canon specifies a base title), or series-stem containment. women→woman
  // so "Woman/Women in the Garden" unify. Kept strict enough that e.g. Irises ≠ Vase with Irises.
  const normT = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\bwomen\b/g, "woman").replace(/\bmen\b/g, "man")
    .replace(/\b(series|study|no\s*\d+)\b/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  const canonQids = new Set(works.map(w => w.qid).filter(Boolean));
  const canonT = works.map(w => normT(w.title)).filter(Boolean);
  const isMet = (n) => {
    if (canonQids.has(n.qid)) return true;
    const nt = normT(n.title); if (nt.length < 4) return false;
    const series = /\bseries\b/i.test(n.title);
    return canonT.some(ct => ct === nt
      || (nt.length >= 5 && (ct.startsWith(nt + " ") || nt.startsWith(ct + " ")))
      || (series && (ct.includes(nt) || nt.includes(ct))));
  };
  const unmet = (AD2.notable || []).filter(n => !isMet(n));
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

// deterministic hue from a string, for the fallback avatar when an artist has no web photo
const strHue = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; };
const initialsOf = (name) => name.split(/\s+/).map(s => s[0]).filter(c => /[A-Za-zÀ-ÿ]/.test(c || "")).slice(0, 2).join("").toUpperCase();

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
    <div className="cv-artists">
      <p className="cv-deck-sum">{rows.length} artists in the canon, ranked by how hard they hit.</p>
      <div className="cv-artgrid">
        {rows.map(r => {
          const a = AD.artists[r.id] || {};
          const life = a.born ? `${a.born}–${a.died || ""}` : (a.desc ? a.desc.replace(/\s*\(\d{4}[–-]?\d{0,4}\)$/, "") : "");
          return (
            <button className="cv-artblob" key={r.id} onClick={() => go("artist", r.id)} title={r.name}>
              <span className="cv-artblob-face" data-empty={a.image ? "false" : "true"}
                style={a.image ? { backgroundImage: `url("${a.image}")` } : { background: `hsl(${strHue(r.id)} 34% 52%)` }}>
                {!a.image && <i>{initialsOf(r.name)}</i>}
                {r.fl > 0 && <b className="cv-artblob-star">★{r.fl}</b>}
              </span>
              <span className="cv-artblob-name">{r.name}</span>
              {life && <span className="cv-artblob-life">{life}</span>}
              <span className="cv-artblob-n">{r.n} work{r.n > 1 ? "s" : ""}{r.lk ? ` · ♡${r.lk}` : ""}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ——— Phase 4a: the painterly map (mockup 2b) — every museum pinned where it stands,
// sized by canon works; the trip strip below groups dated visits by year. Land geometry
// is rotation's simplified equirect world, copied (apps stay self-contained).
function MapView({ go }) {
  const world = window.CANVAS_WORLD || null;
  const P = (lat, lng) => [(lng + 180) / 360 * 1000, (90 - lat) / 180 * 500];
  const coordOf = (id) => { const d = AD.museums[id] || {}; return d.lat == null ? null : P(d.lat, d.lng); };
  const landPath = useMemo(() => (world && world.land ? world.land.join(" ") : ""), []);
  // ONE bubble per CITY at its true location (Fuad 2026-07-14). Per-museum pins overlapped badly,
  // and any anti-overlap relaxation that separated a city's 5–6 museums dragged them off the real
  // city (capitals "didn't match"). A city sits exactly where it is (cities are far apart → no
  // overlap) and BRANCHES to its museums → loved/liked works on click. Works are aggregated so the
  // bubble is sized by the whole city's canon, and each city keeps its museum list for the branch.
  const cities = useMemo(() => {
    const counts = {};
    for (const w of WORKS) for (const id of (Array.isArray(w.seenAt) ? w.seenAt : [w.seenAt || w.at])) if (id) counts[id] = (counts[id] || 0) + 1;
    const byCity = {};
    for (const m of MUSEUMS) {
      const d = AD.museums[m.id] || {}; if (d.lat == null) continue;
      const [x, y] = P(d.lat, d.lng);
      const c = (byCity[m.city] = byCity[m.city] || { city: m.city, xs: 0, ys: 0, k: 0, n: 0, museums: [] });
      const n = counts[m.id] || 0; c.xs += x; c.ys += y; c.k++; c.n += n;
      c.museums.push({ id: m.id, name: m.name.replace(/\s*\(.*\)$/, ""), x, y, n });
    }
    const arr = Object.values(byCity).map(c => ({ ...c, x: c.xs / c.k, y: c.ys / c.k }));
    // light relaxation only — cities rarely collide; radii are small and drift is hard-clamped to
    // 5 units so a city can never leave its spot even where two are close (e.g. European neighbours).
    for (const c of arr) { c.ox = c.x; c.oy = c.y; }
    const rOf = c => 1.4 + Math.sqrt(c.n) * 0.8;
    for (let it = 0; it < 30; it++) {
      let moved = false;
      for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) {
        const a = arr[i], b = arr[j], min = rOf(a) + rOf(b) + 0.6;
        let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
        if (d >= min) continue; if (d < 0.01) { dx = 0.5; dy = 0.3; d = Math.hypot(dx, dy); }
        const push = (min - d) / d / 2; a.x -= dx * push; a.y -= dy * push; b.x += dx * push; b.y += dy * push; moved = true;
      }
      for (const c of arr) { c.x += (c.ox - c.x) * 0.3; c.y += (c.oy - c.y) * 0.3; const ex = c.x - c.ox, ey = c.y - c.oy, e = Math.hypot(ex, ey); if (e > 5) { c.x = c.ox + ex / e * 5; c.y = c.oy + ey / e * 5; } }
      if (!moved) break;
    }
    const map = {}; for (const c of arr) map[c.city] = c;
    return { list: arr, byCity: map };
  }, []);
  // pilgrimage layer: wish works placed at their holding museum, fanned out so a shared venue spreads
  const { wishMarkers, wishList } = useMemo(() => {
    const wishes = WORKS.map(enrich).filter(w => w.wish);
    const byMus = {};
    for (const w of wishes) { const mid = (Array.isArray(w.seenAt) ? w.seenAt[0] : w.seenAt) || w.at; (byMus[mid || "_tbc"] = byMus[mid || "_tbc"] || []).push(w); }
    const markers = [], groups = {};
    for (const [mid, list] of Object.entries(byMus)) {
      const m = MUS_BY_ID[mid], base = mid !== "_tbc" ? coordOf(mid) : null;
      groups[m ? m.city + " — " + m.name.replace(/\s*\(.*\)$/, "") : "location TBC"] = list;
      if (!base) continue;
      const venue = m ? m.name.replace(/\s*\(.*\)$/, "") : "";
      list.forEach((w, i) => {
        const ang = i * 2.399, rad = list.length === 1 ? 0 : 2 + 1.5 * Math.sqrt(i);
        markers.push({ w, x: base[0] + rad * Math.cos(ang), y: base[1] + rad * Math.sin(ang), bx: base[0], by: base[1], city: m ? m.city : "", venue });
      });
    }
    return { wishMarkers: markers, wishList: Object.entries(groups).sort((a, b) => b[1].length - a[1].length) };
  }, []);
  const trips = useMemo(() => {
    const by = {};
    for (const m of MUSEUMS) for (const v of (m.visits || [])) {
      const y = String(v).match(/^(~?)(\d{4})/); if (!y) continue;
      (by[y[2]] = by[y[2]] || new Set()).add(m.city);
    }
    return Object.entries(by).map(([y, s]) => [y, [...s]]).sort((a, b) => b[0] - a[0]);
  }, []);

  // zoom + pan: the viewBox is state; wheel zooms toward the cursor, drag pans. Marker/label sizes
  // are multiplied by k = vb.w/880 so they stay a constant size on screen at any zoom. The wheel is
  // bound NON-passively via the DOM (React's onWheel is passive → the page used to scroll instead)
  // and every view change is coalesced to ONE state commit per animation frame (a wheel burst can't
  // trigger a re-render storm on the big land path — the earlier crash/VRAM spike).
  const AR = 380 / 880;
  const HOME = { x: 60, y: 40, w: 880, h: 380 };
  const svgRef = React.useRef(null);
  const drag = React.useRef(null);
  const raf = React.useRef(0);
  const [vb, setVb] = useState(HOME);
  const vbRef = React.useRef(vb); vbRef.current = vb;
  const [hover, setHover] = useState(null);
  const k = vb.w / 880;
  const commit = (next) => { vbRef.current = next; if (!raf.current) raf.current = requestAnimationFrame(() => { raf.current = 0; setVb(vbRef.current); }); };
  // ——— branching: click a city → it fans out to its museums, and each museum to the loved/liked
  // works you saw there (hover a work for a preview, click to open). Pure geometry in map units;
  // focusing auto-zooms the viewBox to frame the branch. (Fuad 2026-07-14)
  const [focus, setFocus] = useState(null);
  const branch = useMemo(() => {
    if (!focus) return null;
    const c = cities.byCity[focus]; if (!c) return null;
    const museums = c.museums.filter(m => m.n > 0);
    const nm = museums.length || 1;
    const RM = 10 + nm * 1.7;                                   // museum-ring radius (map units)
    const nodes = museums.map((m, i) => {
      const ang = -Math.PI / 2 + (i / nm) * 2 * Math.PI;
      const mx = c.x + RM * Math.cos(ang), my = c.y + RM * Math.sin(ang);
      const works = WORKS.map(enrich).filter(w => !w.wish && (w.floored || w.liked) &&
        (Array.isArray(w.seenAt) ? w.seenAt : [w.seenAt]).includes(m.id));
      const nw = works.length, RW = Math.min(3 + nw * 0.32, 8);
      const wnodes = works.map((w, j) => {
        const wa = (j / Math.max(nw, 1)) * 2 * Math.PI + ang;   // ring the works around the museum
        const rr = RW + (j % 2) * 1.4;                          // 2-row stagger to reduce touching
        return { w, x: mx + rr * Math.cos(wa), y: my + rr * Math.sin(wa) };
      });
      return { m, x: mx, y: my, wnodes, nw };
    });
    return { c, nodes };
  }, [focus]);
  const focusCity = (c) => {
    setFocus(c.city);
    const nm = c.museums.filter(m => m.n > 0).length || 1;
    const half = Math.max(34, 10 + nm * 1.7 + 13);             // frame museum ring + works + margin
    const w = half * 2, h = w * AR;
    commit({ x: c.x - half, y: c.y - h / 2, w, h });
  };
  const clearFocus = () => { setFocus(null); setHover(null); commit(HOME); };
  React.useEffect(() => {
    const el = svgRef.current; if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const mx = (e.clientX - r.left) / r.width, my = (e.clientY - r.top) / r.height;
      const f = e.deltaY < 0 ? 1 / 1.18 : 1.18, v = vbRef.current;
      const w = Math.min(880, Math.max(70, v.w * f)), h = w * AR;
      commit({ x: v.x + mx * v.w - mx * w, y: v.y + my * v.h - my * h, w, h });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => { el.removeEventListener("wheel", onWheel); if (raf.current) cancelAnimationFrame(raf.current); };
  }, []);
  const onDown = (e) => { if (e.button !== 0) return; drag.current = { mx: e.clientX, my: e.clientY, v: vbRef.current }; };
  const onMove = (e) => { if (!drag.current || !svgRef.current) return; const r = svgRef.current.getBoundingClientRect(), d = drag.current; commit({ ...d.v, x: d.v.x - (e.clientX - d.mx) / r.width * d.v.w, y: d.v.y - (e.clientY - d.my) / r.height * d.v.h }); };
  const stop = () => { drag.current = null; };

  return (
    <div className="cv-map">
      <p className="cv-deck-sum">Every city where a work entered your canon, sized by how much it gave you — <b>click a city</b> to branch out to its museums and the works you loved there (hover a work for a look). The <b style={{ color: "oklch(0.55 0.19 18)" }}>♥ markers</b> are works you're still chasing. Scroll to zoom, drag to pan.</p>
      <div className="cv-map-wrap" onMouseLeave={stop}>
        <svg ref={svgRef} viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
          onMouseDown={onDown} onMouseMove={onMove} onMouseUp={stop}>
          {landPath && <path d={landPath} fill="#d3c4ab" stroke="none" />}
          {/* DEFAULT: one bubble per city (click to branch) + the ♥ works you're still chasing */}
          {!focus && cities.list.map(c => (
            <g key={c.city} className="cv-pin" onClick={() => focusCity(c)} style={{ cursor: "pointer" }}>
              <circle cx={c.x} cy={c.y} r={(c.n ? 1.4 + Math.sqrt(c.n) * 0.8 : 1.1) * k}
                fill={c.n ? "oklch(0.55 0.13 46 / .82)" : "rgba(58,47,34,.45)"} stroke="#f4ecdf" strokeWidth={0.6 * k} />
              <title>{c.city} — {c.n} work{c.n !== 1 ? "s" : ""} · {c.museums.length} museum{c.museums.length !== 1 ? "s" : ""}{c.n ? " · click to open" : ""}</title>
              {c.n >= 8 && <text x={c.x} y={c.y - (2.4 + Math.sqrt(c.n) * 0.8) * k} textAnchor="middle" style={{ fontSize: 8 * k }}>{c.city}</text>}
            </g>
          ))}
          {!focus && wishMarkers.map((mk, i) => (
            <g key={mk.w.id + "-" + i} className="cv-wishpin" onClick={() => go("work", mk.w.id)}
              onMouseEnter={e => setHover({ w: mk.w, mx: e.clientX, my: e.clientY, venue: mk.venue, city: mk.city })}
              onMouseMove={e => setHover(h => h && h.w === mk.w ? { ...h, mx: e.clientX, my: e.clientY } : h)}
              onMouseLeave={() => setHover(null)}>
              {(mk.x !== mk.bx || mk.y !== mk.by) && <line x1={mk.bx} y1={mk.by} x2={mk.x} y2={mk.y} stroke="oklch(0.55 0.19 18 / .4)" strokeWidth={0.5 * k} />}
              <circle cx={mk.x} cy={mk.y} r={2 * k} fill="oklch(0.55 0.19 18 / .9)" stroke="#f7efe2" strokeWidth={0.6 * k} />
            </g>
          ))}
          {/* FOCUSED: the branch — city → museums → the loved/liked works you saw at each */}
          {branch && (
            <g className="cv-branch">
              {branch.nodes.map(nd => <line key={"cm" + nd.m.id} x1={branch.c.x} y1={branch.c.y} x2={nd.x} y2={nd.y} stroke="rgba(58,47,34,.5)" strokeWidth={0.5 * k} />)}
              {branch.nodes.map(nd => nd.wnodes.map((wn, j) => (
                <g key={nd.m.id + "-w" + j} className="cv-wishpin" onClick={() => go("work", wn.w.id)}
                  onMouseEnter={e => setHover({ w: wn.w, mx: e.clientX, my: e.clientY, venue: nd.m.name, city: branch.c.city, seen: true })}
                  onMouseMove={e => setHover(h => h && h.w === wn.w ? { ...h, mx: e.clientX, my: e.clientY } : h)}
                  onMouseLeave={() => setHover(null)}>
                  <line x1={nd.x} y1={nd.y} x2={wn.x} y2={wn.y} stroke="rgba(58,47,34,.26)" strokeWidth={0.3 * k} />
                  <circle cx={wn.x} cy={wn.y} r={(wn.w.floored ? 1.5 : 1.1) * k}
                    fill={wn.w.floored ? "oklch(0.55 0.19 18 / .92)" : "oklch(0.62 0.12 52 / .9)"} stroke="#f7efe2" strokeWidth={0.4 * k} />
                </g>
              )))}
              {branch.nodes.map(nd => (
                <g key={"m" + nd.m.id} onClick={() => go("deck", nd.m.id)} style={{ cursor: "pointer" }}>
                  <circle cx={nd.x} cy={nd.y} r={2.4 * k} fill="oklch(0.5 0.14 46 / .95)" stroke="#f4ecdf" strokeWidth={0.7 * k} />
                  <text x={nd.x} y={nd.y - 3.4 * k} textAnchor="middle" style={{ fontSize: 6.2 * k, fontWeight: 600 }}>{nd.m.name}</text>
                </g>
              ))}
              <circle cx={branch.c.x} cy={branch.c.y} r={3.2 * k} fill="oklch(0.42 0.15 30 / .96)" stroke="#f4ecdf" strokeWidth={0.9 * k} />
              <text x={branch.c.x} y={branch.c.y + 1.5 * k} textAnchor="middle" style={{ fontSize: 5.6 * k, fontWeight: 700, fill: "#f4ecdf" }}>{branch.c.city}</text>
            </g>
          )}
        </svg>
        {hover && (
          <div className="cv-map-preview" style={{ left: hover.mx + 16, top: hover.my + 16 }}>
            {hover.w.imgGrid && <img src={hover.w.imgGrid} alt="" />}
            <div className="cv-map-preview-t">{hover.w.title}</div>
            <div className="cv-map-preview-s">{hover.w.artist.replace(/\s*\(.*\)$/, "")}{hover.w.year ? " · " + hover.w.year : ""}</div>
            {hover.venue && <div className="cv-map-preview-s">{hover.seen ? "seen at " : "to see at "}{hover.venue}, {hover.city}</div>}
          </div>
        )}
        {(focus || vb.w < 880) && <button className="cv-map-reset" onClick={clearFocus}>{focus ? "← all cities" : "reset view"}</button>}
      </div>
      <div className="cv-map-legend"><span><i className="lg-seen" /> museums you've walked</span><span><i className="lg-wish" /> works you're chasing</span></div>
      <div className="cv-trips">
        {trips.map(([y, cities]) => (
          <div className="cv-trip-row" key={y}>
            <span className="cv-trip-year">{y}</span>
            <span className="cv-trip-cities">{cities.join(" · ")}</span>
          </div>
        ))}
      </div>
      {wishList.length > 0 && (
        <div className="cv-map-tosee">
          <div className="cv-a-secl">To see — the pilgrimage</div>
          {wishList.map(([key, list]) => (
            <React.Fragment key={key}>
              <div className="cv-mus-country">{key} <span style={{ opacity: .55, fontWeight: 400 }}>· {list.length}</span></div>
              {list.map(w => (
                <div className="cv-mus-row" key={w.id} style={{ cursor: "pointer" }} onClick={() => go("work", w.id)}>
                  {w.imgGrid && <img className="cv-pil-thumb" src={w.imgGrid} alt="" loading="lazy" />}
                  <span className="cv-mus-name">{w.floored || (w.liked && w.wish) ? "♥ " : "♡ "}{w.title}</span>
                  <span className="cv-mus-city">{w.artist.replace(/\s*\(.*\)$/, "")}{w.year ? " · " + w.year : ""}</span>
                </div>
              ))}
            </React.Fragment>
          ))}
          {(window.CANVAS_PILGRIMAGE || []).length > 0 && (
            <React.Fragment>
              <div className="cv-mus-country">Places</div>
              {(window.CANVAS_PILGRIMAGE || []).map(p => (
                <div className="cv-mus-row" key={p.id}>
                  <span className="cv-mus-name">{p.title}</span>
                  <span className="cv-mus-city">{p.city}</span>
                  {p.note && <span className="cv-mus-note">{p.note}</span>}
                </div>
              ))}
            </React.Fragment>
          )}
        </div>
      )}
    </div>
  );
}

// ——— Portrait: reads your taste back to you (Canvas's answer to Rotation's Stories).
// Everything computed client-side from the loaded canon + overlays — no new data.
const hexHue = (hex) => {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex); if (!m) return 0;
  const r = parseInt(m[1], 16) / 255, g = parseInt(m[2], 16) / 255, b = parseInt(m[3], 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (!d) return -1;   // grey → sorts to the end
  let h; if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
  return (h * 60 + 360) % 360;
};
const AFFINITY = new Set(window.CANVAS_AFFINITY || []);

function Portrait({ go }) {
  const PAL = window.CANVAS_PALETTE || {};
  const data = useMemo(() => {
    const works = WORKS.map(enrich);
    const loved = works.filter(w => w.floored || w.favorite || w.liked);
    const museums = new Set(), countries = new Set();
    for (const w of works) for (const id of (Array.isArray(w.seenAt) ? w.seenAt : [w.seenAt || w.at])) { const m = MUS_BY_ID[id]; if (m) { museums.add(m.id); countries.add(m.country); } }
    // artists ranked by impact
    const byArtist = {};
    for (const w of works) { if (!w.artistId) continue; const r = byArtist[w.artistId] = byArtist[w.artistId] || { id: w.artistId, name: w.artist.replace(/\s*\(.*\)$/, ""), n: 0, love: 0 }; r.n++; if (w.floored || w.favorite) r.love += 3; if (w.liked) r.love += 1; }
    const artists = Object.values(byArtist).sort((a, b) => b.love - a.love || b.n - a.n);
    const found = artists.filter(a => !AFFINITY.has(a.id) && a.love >= 4).slice(0, 8);
    // movements (loved)
    const movCount = {};
    for (const w of loved) { const a = AD.artists[w.artistId]; if (!a) continue; for (const q of (a.movementQids || [])) { const m = (AD.movements || {})[q]; if (m) movCount[m] = (movCount[m] || 0) + 1; } }
    const movements = Object.entries(movCount).sort((a, b) => b[1] - a[1]).slice(0, 8);
    // centuries
    const cent = {};
    for (const w of works) { if (!w.year) continue; const c = Math.floor((w.year - 1) / 100) + 1; cent[c] = (cent[c] || 0) + 1; }
    const centuries = Object.entries(cent).map(([c, n]) => ({ c: +c, n })).sort((a, b) => a.c - b.c);
    // palette spectrum — dominant swatch of every work that has one, sorted by hue
    const swatches = [];
    for (const w of works) { const p = PAL[w.qid ? w.id : w.id]; if (p && p[0]) swatches.push(p[0]); }
    swatches.sort((a, b) => hexHue(a) - hexHue(b));
    return {
      total: works.length, loved: loved.length,
      floored: works.filter(w => w.floored || w.favorite).length,
      museums: museums.size, countries: countries.size,
      artists, found, movements, centuries, swatches,
      topMovement: movements[0], favArtist: artists[0],
    };
  }, []);

  const cy = (c) => c >= 1 ? c + (["th", "st", "nd", "rd"][((c % 100 - c % 10 !== 10) && c % 10 < 4) ? c % 10 : 0] || "th") : "";
  const maxCent = Math.max(...data.centuries.map(c => c.n), 1);
  const maxMov = data.movements.length ? data.movements[0][1] : 1;

  return (
    <div className="cv-portrait">
      <p className="cv-p-read">
        You've stood in front of <b>{data.total}</b> works across <b>{data.museums}</b> museums in <b>{data.countries}</b> countries —
        {" "}<b>{data.loved}</b> of them moved you, <b>{data.floored}</b> stopped you cold.
        {data.favArtist && <> The artist you return to most is <b onClick={() => go("artist", data.favArtist.id)} style={{ cursor: "pointer", color: "var(--accent)" }}>{data.favArtist.name}</b>.</>}
        {data.topMovement && <> Your eye lives in <b>{data.topMovement[0]}</b> — it accounts for more of what you love than any other movement, by far.</>}
      </p>

      <div className="cv-p-sec">
        <div className="cv-p-lbl">The palette of your taste</div>
        <div className="cv-p-spectrum">{data.swatches.map((c, i) => <i key={i} style={{ background: c }} />)}</div>
        <div className="cv-p-note">every work's dominant colour, {data.swatches.length} of them, sorted across the spectrum</div>
      </div>

      <div className="cv-p-cols">
        <div className="cv-p-sec">
          <div className="cv-p-lbl">Where your love lives — movements</div>
          {data.movements.map(([m, n]) => (
            <div className="cv-p-bar" key={m}>
              <span className="cv-p-barlbl">{m}</span>
              <span className="cv-p-bartrack"><i style={{ width: (n / maxMov * 100) + "%" }} /></span>
              <span className="cv-p-barn">{n}</span>
            </div>
          ))}
        </div>

        <div className="cv-p-sec">
          <div className="cv-p-lbl">Across the centuries</div>
          <div className="cv-p-cent">
            {data.centuries.map(({ c, n }) => (
              <div className="cv-p-centcol" key={c} title={`${cy(c)} century — ${n} works`}>
                <span className="cv-p-centbar" style={{ height: (n / maxCent * 100) + "%" }} />
                <span className="cv-p-centlbl">{c}00s</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {data.found.length > 0 && (
        <div className="cv-p-sec">
          <div className="cv-p-lbl">Who your eye chose</div>
          <div className="cv-p-note" style={{ marginTop: 0, marginBottom: 12 }}>your most-loved artists beyond the handful you walked in naming — ranked by how hard they hit</div>
          <div className="cv-p-found">
            {data.found.map(a => (
              <div className="cv-p-foundchip" key={a.id} onClick={() => go("artist", a.id)}>
                {AD.artists[a.id] && AD.artists[a.id].image && <img src={AD.artists[a.id].image} alt="" />}
                <div><b>{a.name}</b><span>{a.n} work{a.n > 1 ? "s" : ""} · {a.love} pts</span></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ——— Home: one uniform grid — curated lead sequence followed by a deterministic
// day-seeded round-robin spread of liked/loved works, one per artist, images required.
// Lead order: two hand-pinned works, then impressionist/post-impressionist liked/floored
// works (best-per-artist, quality-sorted), with the two Leech paintings spliced in at
// ~position 6.  The seed rotates daily so the spread shifts without random flicker.
// No latest-skew: recency plays no role; the spread is artist-diversity + quality-gated.
const HOME_LEAD_IDS = ["monet-woman-with-a-parasol", "podkowinski-szal-uniesien"];
const HOME_LEECH_IDS = ["leech-the-sunshade", "leech-convent-garden"];
const IMPRESSIONIST_RE = /impressionis/i;   // matches "Impressionism" + "Post-impressionism"
const HOME_SPREAD_CAP = 24;   // spread cards (after lead); total wall ~28 max

function HomeView({ go }) {
  const all = useMemo(() => WORKS.map(enrich), []);

  const wall = useMemo(() => {
    const placed = new Set();

    // helper: resolve the primary movement label for a work
    const movLabel = (w) => {
      const a = AD.artists[w.artistId];
      const q = a && a.movementQids && a.movementQids[0];
      return (q && (AD.movements || {})[q]) || null;
    };

    // 1. resolve the two explicit lead works (must have an id match in canon)
    const byId = {};
    for (const w of all) byId[w.id] = w;
    const leadExplicit = HOME_LEAD_IDS.map(id => byId[id]).filter(Boolean);
    for (const w of leadExplicit) placed.add(w.id);

    // 2. impressionist / post-impressionist liked/floored works with images, best per artist
    const impPool = all.filter(w =>
      !placed.has(w.id) &&
      (w.floored || w.favorite || w.liked) &&
      (w.imgGrid || w.img) &&
      IMPRESSIONIST_RE.test(movLabel(w))
    );
    // sort: floored/favorite first, then liked; within tier by year ascending
    impPool.sort((a, b) => weight(a) - weight(b) || (a.year || 9999) - (b.year || 9999));
    // one best work per artist
    const impByArtist = {};
    for (const w of impPool) {
      const key = w.artistId || w.id;
      if (!impByArtist[key]) impByArtist[key] = w;
    }
    // up to 5 impressionist leads (positions 3–7ish); already sorted by quality
    const impLeads = Object.values(impByArtist).slice(0, 5);
    for (const w of impLeads) placed.add(w.id);

    // 3. Leech works — leech has no movementQids so splice them in explicitly at ~position 6
    //    (after lead[0..1] + 3 impressionists, i.e. after index 4 in the assembled sequence)
    const leechWorks = HOME_LEECH_IDS.map(id => byId[id]).filter(w => w && (w.imgGrid || w.img));
    for (const w of leechWorks) placed.add(w.id);

    // assemble lead: explicit[0..1] + impLeads[0..2] + leechs + impLeads[3..4]
    const lead = [
      ...leadExplicit,
      ...impLeads.slice(0, 3),
      ...leechWorks,
      ...impLeads.slice(3),
    ];

    // 4. spread pool: liked or floored/favorite, must have an image, not already placed
    const pool = all.filter(w =>
      !placed.has(w.id) &&
      (w.floored || w.favorite || w.liked) &&
      (w.imgGrid || w.img)
    );

    // 5. group by artistId, sort each bucket by quality
    const byArtist = {};
    for (const w of pool) {
      const key = w.artistId || w.id;
      (byArtist[key] = byArtist[key] || []).push(w);
    }
    for (const key of Object.keys(byArtist)) {
      byArtist[key].sort((a, b) => weight(a) - weight(b));
    }

    // 6. stable daily seed: day-of-year (resets Jan 1 — slow, non-flickery rotation)
    const now = new Date();
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
    const artistKeys = Object.keys(byArtist).sort();
    const offset = dayOfYear % Math.max(artistKeys.length, 1);
    const rotated = [...artistKeys.slice(offset), ...artistKeys.slice(0, offset)];

    // 7. round-robin fill up to HOME_SPREAD_CAP
    const picks = [];
    let round = 0;
    outer: while (picks.length < HOME_SPREAD_CAP) {
      let any = false;
      for (const key of rotated) {
        if (byArtist[key][round]) {
          picks.push(byArtist[key][round]);
          any = true;
          if (picks.length >= HOME_SPREAD_CAP) break outer;
        }
      }
      if (!any) break;
      round++;
    }

    return [...lead, ...picks];
  }, [all]);

  const artistCount = useMemo(() =>
    new Set(wall.map(w => w.artistId || w.id)).size, [wall]);

  return (
    <React.Fragment>
      <div className="cv-home-intro">
        <p>Works I've stood in front of — a selection across {artistCount} artists. <a href="#/wall">See the full wall →</a></p>
      </div>
      <div className="cv-wall">{wall.map(w => <Card key={w.id} w={w} go={go} />)}</div>
    </React.Fragment>
  );
}

// ——— Search: live-filter across all enriched works (title + artist + museum name).
// Results appear as a dropdown (max 12). Clicking a work opens its Reader directly.
// Museum-name hits navigate to the museums view. ESC / click-outside closes.
// Keyboard: Arrow up/down moves selection; Enter opens the highlighted hit.
// Mobile: icon-only button expands to a full-width input.

// fold: NFD + strip combining marks → case-insensitive diacritic-insensitive substring match
const fold = (s) => (s || "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

// build the search index once at module level (enriched canon + museum name lookup)
const SEARCH_INDEX = (() => {
  const enriched = WORKS.map(enrich);
  return enriched.map(w => {
    const musNames = w.venues.map(v => v.name.replace(/\s*\(.*\)$/, "")).join(" ");
    return {
      id: w.id,
      title: w.title.replace(/^TBC — /, ""),
      artist: w.artist.replace(/\s*\(.*\)$/, ""),
      musNames,
      musIds: w.venues.map(v => v.id),
      imgGrid: w.imgGrid || null,
      // pre-folded haystack for fast matching
      hay: fold(w.title + " " + w.artist + " " + musNames),
    };
  });
})();

function SearchBar({ go }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef(null);
  const wrapRef = useRef(null);

  const results = useMemo(() => {
    const needle = fold(q);
    if (!needle || needle.length < 1) return [];
    const hits = [];
    const musHits = new Map(); // museumId → museum name (deduped)
    for (const it of SEARCH_INDEX) {
      if (!it.hay.includes(needle)) continue;
      // mark whether the match came from museum-name only
      const inTitle = fold(it.title).includes(needle) || fold(it.artist).includes(needle);
      const inMus = fold(it.musNames).includes(needle);
      if (inTitle || inMus) {
        hits.push({ kind: "work", ...it });
        if (inMus && !inTitle) {
          // surface museum as a dedicated result too
          for (let i = 0; i < it.musIds.length; i++) {
            const mid = it.musIds[i];
            if (!musHits.has(mid)) musHits.set(mid, true);
          }
        }
      }
      if (hits.length >= 20) break;
    }
    // deduplicate museum hits and prepend them when search term matches a museum name directly
    const musResults = [];
    for (const [mid] of musHits) {
      const mn = MUS_BY_ID[mid];
      if (mn && fold(mn.name).includes(needle)) {
        musResults.push({ kind: "museum", id: mid, title: mn.name.replace(/\s*\(.*\)$/, ""), artist: mn.city, imgGrid: null });
      }
    }
    return [...musResults, ...hits].slice(0, 12);
  }, [q]);

  // reset selection when results change
  useEffect(() => { setSel(0); }, [results]);

  // close on click-outside
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false); setQ("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const openResult = (r) => {
    if (r.kind === "museum") { go("museums"); }
    else { go("work", r.id); }
    setOpen(false); setQ("");
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") { setOpen(false); setQ(""); return; }
    if (results.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setSel(s => Math.min(s + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel(s => Math.max(s - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (results[sel]) openResult(results[sel]); }
  };

  const expand = () => { setOpen(true); setTimeout(() => inputRef.current && inputRef.current.focus(), 0); };

  return (
    <div className="cv-search" ref={wrapRef}>
      {!open
        ? <button className="cv-search-icon" onClick={expand} aria-label="Search artworks">🔍</button>
        : (
          <div className="cv-search-box">
            <input
              ref={inputRef}
              className="cv-search-input"
              type="search"
              placeholder="title, artist, museum…"
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={onKeyDown}
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
            />
            <button className="cv-search-dismiss" onClick={() => { setOpen(false); setQ(""); }}>✕</button>
          </div>
        )
      }
      {open && results.length > 0 && (
        <div className="cv-search-drop">
          {results.map((r, i) => (
            <div key={r.kind + r.id} className={"cv-search-hit" + (i === sel ? " cv-search-hit-sel" : "")}
              onMouseEnter={() => setSel(i)}
              onMouseDown={e => { e.preventDefault(); openResult(r); }}>
              {r.imgGrid
                ? <img className="cv-search-thumb" src={r.imgGrid} alt="" />
                : <span className="cv-search-thumb cv-search-thumb-empty" />}
              <span className="cv-search-hit-text">
                <span className="cv-search-hit-title">{r.title}</span>
                <span className="cv-search-hit-sub">{r.kind === "museum" ? "Museum · " : ""}{r.artist}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function App() {
  const route = useRoute();
  const [mode, setMode] = useState("collage");   // wall arrangement: collage | spectrum | timeline | movements
  const go = (view, id) => { location.hash = id ? "/" + view + "/" + id : view === "home" ? "/" : "/" + view; };
  // useRoute parses "#/" as view="wall"; we treat "wall" with no id AND hash="#/" as home.
  // "#/wall" is the explicit full wall. Reader (#/work/<id>) overlays whatever is beneath.
  const isHome = route.view === "wall" && !route.id && (location.hash === "#/" || location.hash === "#" || location.hash === "");
  const view = route.view === "work" ? "work" : isHome ? "home" : route.view;
  return (
    <React.Fragment>
      <header className="cv-head">
        <a className="cv-brand" href="#/">Canvas<i>.</i></a>
        <nav className="cv-nav">
          <a href="#/" data-on={view === "home"}>Home</a>
          <a href="#/wall" data-on={view === "wall"}>The Wall</a>
          <a href="#/portrait" data-on={view === "portrait"}>Portrait</a>
          <a href="#/museums" data-on={view === "museums" || (route.view === "deck" && route.id !== "by-artists")}>Museums</a>
          <a href="#/artists" data-on={view === "artists" || route.view === "artist"}>Artists</a>
          <a href="#/deck/by-artists" data-on={route.view === "deck" && route.id === "by-artists"}>By Your Artists</a>
          <a href="#/map" data-on={view === "map" || view === "pilgrimage"}>Map</a>
        </nav>
        {view === "wall" && (
          <div className="cv-mode">
            {[["collage", "Collage"], ["spectrum", "Spectrum"], ["timeline", "Timeline"], ["movements", "Movements"]].map(([m, lbl]) =>
              <button key={m} data-on={mode === m} onClick={() => setMode(m)}>{lbl}</button>)}
          </div>
        )}
        <SearchBar go={go} />
      </header>
      {route.view === "deck" ? <Deck museumId={route.id} part={route.part} go={go} key={route.id + "-" + route.part} />
        : view === "museums" ? <Museums />
        : view === "portrait" ? <Portrait go={go} />
        : (view === "map" || view === "pilgrimage") ? <MapView go={go} />
        : route.view === "artist" ? <ArtistView artistId={route.id} go={go} key={route.id} />
        : view === "artists" ? <Artists go={go} />
        : view === "wall" ? <Wall go={go} mode={mode} />
        : <HomeView go={go} />}
      {route.view === "work" && <Reader id={route.id} go={go} />}
      {route.view === "study" && <StudyView id={route.id} go={go} key={route.id} />}
      <footer className="cv-foot">
        <span className="cv-foot-main">canvas · a personal gallery, reconstructed from memory · images via <a href="https://commons.wikimedia.org" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a> / <a href="https://www.wikidata.org" target="_blank" rel="noopener noreferrer">Wikidata</a></span>
        <nav className="site-switch">part of <a href="/">fuad.au</a> · <a href="/rotation/">Rotation</a> · <a href="/canvas/">Canvas</a> · <a href="/culture/">Culture</a></nav>
      </footer>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
