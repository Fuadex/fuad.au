/* Rotation service worker — tiered caching (audit 2026-07-18).
 * VERSION is stamped by stage-site.js at deploy time (__BUILD__ → staged-content digest):
 * every deploy opens a fresh cache epoch and activate drops the old one, so within an
 * epoch cached responses are exact — including the unversioned lazy shards.
 * Tiers: navigations network-first (offline → cached shell) · ?v-stamped assets
 * cache-first (content-addressed = immutable) · unversioned same-origin
 * stale-while-revalidate · live-data/hub-stats network-first · cross-origin images
 * cache-first with an LRU cap. Responses over 5 MB are never cached (storage care).
 */
const APP = "rotation";
const VERSION = "__BUILD__";
const CORE = `${APP}-core-${VERSION}`;
const IMG = `${APP}-img`;
const IMG_MAX = 300;
const BIG_SKIP = 5 * 1024 * 1024;
const FRESH = [/live-data\.js$/, /hub-stats\.json$/, /pulse\.js$/];

self.addEventListener("install", (e) => {
  self.skipWaiting();   // a freshly-deployed worker becomes ready on the next visit instead of
                        // waiting for every tab to close — stale assets don't linger for days.
  e.waitUntil(caches.open(CORE).then((c) => c.add("./")).catch(() => {}));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(
    ks.filter((k) => k.startsWith(APP + "-core-") && k !== CORE).map((k) => caches.delete(k))
  )));
});

async function put(cacheName, req, resClone) {
  try {
    if (!resClone || !resClone.ok) return;
    const len = +(resClone.headers.get("content-length") || 0);
    if (len > BIG_SKIP) return;
    const c = await caches.open(cacheName);
    await c.put(req, resClone);
    if (cacheName === IMG) {
      const keys = await c.keys();
      if (keys.length > IMG_MAX) await Promise.all(keys.slice(0, keys.length - IMG_MAX).map((k) => c.delete(k)));
    }
  } catch (err) {}
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;

  if (req.mode === "navigate") {
    // cache:"reload" bypasses the browser HTTP cache so the HTML (and thus the ?v= asset hashes
    // it references) is always the freshest deployed one — no ~10-min stale window after a deploy.
    e.respondWith(fetch(new Request(req, { cache: "reload" })).then((res) => { put(CORE, "./", res.clone()); return res; })
      .catch(() => caches.match("./")));
    return;
  }
  if (sameOrigin) {
    if (FRESH.some((rx) => rx.test(url.pathname))) {
      e.respondWith(fetch(req).then((res) => { put(CORE, req, res.clone()); return res; })
        .catch(() => caches.match(req)));
    } else if (/[?&]v=/.test(url.search)) {
      e.respondWith(caches.match(req).then((hit) => hit ||
        fetch(req).then((res) => { put(CORE, req, res.clone()); return res; })));
    } else {
      e.respondWith(caches.match(req).then((hit) => {
        const net = fetch(req).then((res) => { put(CORE, req, res.clone()); return res; }).catch(() => hit);
        return hit || net;
      }));
    }
    return;
  }
  if (req.destination === "image") {
    e.respondWith(caches.match(req).then((hit) => hit ||
      fetch(req).then((res) => { put(IMG, req, res.clone()); return res; })));
  }
});
