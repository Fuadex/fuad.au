// img-proxy.worker.js — Cloudflare Worker source for img.fuad.au (NOT deployed by stage-site;
// this file is the canonical copy of what lives in the Cloudflare dashboard. Paste it there.)
//
// WHY: the site hotlinks ~2,000 artwork images from Commons/Met/AIC. Every visitor paid those
// hosts' latency and outages directly, and cross-origin responses lacked CORS for deep zoom.
// This proxy fronts the known image hosts with Cloudflare's edge cache: first request fetches
// upstream once, everyone after gets the edge copy with immutable caching and open CORS.
//
// SHAPE: https://img.fuad.au/<alias>/<upstream path>[?query]
//   /upload/wikipedia/commons/7/78/File.jpg      -> upload.wikimedia.org
//   /commons/wiki/Special:FilePath/X.jpg?width=800 -> commons.wikimedia.org (redirects followed)
//   /met/CRDImages/ep/web-large/DP320086.jpg     -> images.metmuseum.org
//   /aic/iiif/2/<id>/full/1686,/0/default.jpg    -> www.artic.edu
//
// GUARANTEES:
//   - Allow-listed upstreams only — this is a mirror of four museums' image hosts, never an
//     open proxy. Anything else is a 404.
//   - GET only; cookies stripped; upstream errors pass through untouched so the app's
//     onerror fallback (proxy -> direct URL) sees the truth.
//   - Free-tier quota exhaustion degrades to exactly the pre-proxy behaviour via that same
//     app-side fallback: the worker erroring is indistinguishable from the proxy not existing.

const UPSTREAM = {
  // canvas
  upload: "https://upload.wikimedia.org",
  commons: "https://commons.wikimedia.org",
  met: "https://images.metmuseum.org",
  aic: "https://www.artic.edu",
  // canvas deep-zoom (rollout 2026-08-25, pasted to the dashboard by Fuad). Both are
  // CORS-LESS upstreams — they send no Access-Control-Allow-Origin, so OpenSeadragon cannot
  // read their tiles cross-origin and the proxy is not an optimisation here, it is the only
  // way these render at all. Tiles are 256-512px, i.e. far cheaper per request than a whole
  // plate; a zoom session just fires many of them, which is what the edge cache absorbs.
  ngl: "https://www.nationalgallery.org.uk",    // IIIF 3.0, query-string form: /ngl/server.iip?IIIF=/fronts/<ACCESSION>-...-PYR.tif/...
  cpom: "https://www.centrepompidou.fr",        // DeepZoom .dzi + its tile pyramid
  // second round, after MEASURING response headers instead of trusting a sourcing note that
  // said only the two above lacked CORS. NGV replies acao=https://content.ngv.vic.gov.au (its
  // own origin — useless cross-site); AGSA and Whitney send none. NGV matters most: Zoomify
  // fetches no descriptor, so a CORS failure there is broken tiles with no open-failed event
  // and therefore no automatic fallback to the canon plate.
  ngv: "https://content.ngv.vic.gov.au",        // Zoomify pyramid: /ngv/<path>/TileGroup0/0-0-0.jpg
  agsa: "https://agsa-prod.s3.amazonaws.com",   // plain JPEG
  whitney: "https://whitneymedia.org",          // plain JPEG
  // Guggenheim (2026-08-25 w17, pasted to the dashboard by Fuad). WordPress uploads, canonical-
  // stem originals capped ~4096px; sends NO ACAO and no `vary` at all, measured with an explicit
  // Origin on 30 assets. Flat JPEGs, not a pyramid — one ~5 MB request per work, which is why
  // the edge cache matters more here than on a tile source.
  gugg: "https://www.guggenheim.org",
  // NOT PASTED YET: `artuk` (d3d00swyhr67nd.cloudfront.net) is in canvas-app.jsx's IMG_PROXY but
  // is deliberately absent here — probed 2026-08-25, /artuk/ still returns "unknown upstream".
  // Add it when Fuad pastes it, not before; this file records what is deployed.
  // culture (rollout 2026-08-22)
  tmdb: "https://image.tmdb.org",
  amzn: "https://m.media-amazon.com",
  igdb: "https://images.igdb.com",
  olcovers: "https://covers.openlibrary.org",
  // rotation (rollout 2026-08-22). i.scdn.co is deliberately ABSENT: Spotify's CDN is faster
  // than the proxy would be, it is 35k distinct urls of quota burn, and proxying sits worse
  // with their ToS than plain hotlinking. Audio hosts are absent too — range-request streams
  // do not belong in an image cache.
  discogs: "https://i.discogs.com",
  caa: "https://coverartarchive.org",
  dzcdn: "https://cdn-images.dzcdn.net",
};

const YEAR = 31536000;

export default {
  async fetch(req, env, ctx) {
    if (req.method !== "GET") return new Response("GET only", { status: 405 });
    const url = new URL(req.url);
    const slash = url.pathname.indexOf("/", 1);
    const alias = slash < 0 ? url.pathname.slice(1) : url.pathname.slice(1, slash);
    const base = UPSTREAM[alias];
    if (!base || slash < 0) return new Response("unknown upstream", { status: 404 });

    // the whole proxied URL is the cache key (query string carries ?width= variants)
    const cache = caches.default;
    const hit = await cache.match(req.url);
    if (hit) return hit;

    const upstream = base + url.pathname.slice(slash) + url.search;
    const up = await fetch(upstream, {
      headers: { "User-Agent": "fuad.au-img-proxy/1.0 (https://fuad.au; fuadex@gmail.com)" },
      redirect: "follow",                                  // Special:FilePath is a redirect
      cf: { cacheEverything: true, cacheTtl: YEAR },
    });
    if (!up.ok) return new Response("upstream " + up.status, { status: up.status });

    const res = new Response(up.body, up);
    res.headers.set("Cache-Control", "public, max-age=" + YEAR + ", immutable");
    res.headers.set("Access-Control-Allow-Origin", "*");
    res.headers.delete("Set-Cookie");
    ctx.waitUntil(cache.put(req.url, res.clone()));
    return res;
  },
};
