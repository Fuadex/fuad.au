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
  upload: "https://upload.wikimedia.org",
  commons: "https://commons.wikimedia.org",
  met: "https://images.metmuseum.org",
  aic: "https://www.artic.edu",
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
