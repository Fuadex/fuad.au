/* Rotation service worker — tiered caching (audit 2026-07-18; epoch carry-forward 2026-09-19).
 * VERSION is stamped by stage-site.js at deploy time (__BUILD__ → staged-content digest):
 * every deploy opens a fresh cache epoch. Within an epoch cached responses are exact —
 * including the unversioned lazy shards — so every lookup below is scoped BY NAME to this
 * epoch's cache, never the origin-wide caches.match() (two CORE caches can now coexist).
 * Tiers: navigations network-first (offline → cached shell) · ?v-stamped assets
 * cache-first (content-addressed = immutable) · unversioned same-origin
 * stale-while-revalidate · live-data/hub-stats network-first · cross-origin images
 * cache-first with an LRU cap. Responses over 5 MB are never cached (storage care).
 * Two messages from the page drive the rest: EPOCH_HANDOFF (carry the immutable ?v= assets the
 * document is running on out of the one surviving previous epoch, then drop that epoch) and
 * PRIME (warm this epoch's per-view route shards so a tab never opened still works offline).
 * Every added path is fail-open: a throw falls through to the network, never to a broken tab.
 */
const APP = "rotation";
const VERSION = "__BUILD__";
const CORE = `${APP}-core-${VERSION}`;
const IMG = `${APP}-img`;   // deliberately UNVERSIONED: image URLs are content-stable and the
                            // 300-entry LRU already bounds it, so covers survive every deploy.
const IMG_MAX = 300;
const BIG_SKIP = 5 * 1024 * 1024;
const FRESH = [/live-data\.js$/, /hub-stats\.json$/, /pulse\.js$/];
// Per-cache creation stamp. Cache NAMES carry no ordering (the digest is content, not time), so
// activate and the handoff need this to tell which of two CORE caches is the older one.
const META = new URL("./__sw-epoch", self.location.href).href;

self.addEventListener("install", (e) => {
  self.skipWaiting();   // a freshly-deployed worker becomes ready on the next visit instead of
                        // waiting for every tab to close — stale assets don't linger for days.
  e.waitUntil(caches.open(CORE).then((c) => Promise.all([
    c.add("./").catch(() => {}),
    c.put(new Request(META), new Response(String(Date.now()), { headers: { "content-type": "text/plain" } })).catch(() => {}),
  ])).catch(() => {}));
});

// [{ name, t }] for every CORE-epoch cache; t = its install stamp (0 = unstamped, i.e. a legacy
// cache or one re-created by a put() after its owner was deleted — both sort as oldest).
async function coreStamps() {
  const out = [];
  try {
    for (const name of await caches.keys()) {
      if (!name.startsWith(APP + "-core-")) continue;   // never touches the stable IMG cache
      let t = 0;
      try { const r = await (await caches.open(name)).match(META); if (r) t = +(await r.text()) || 0; } catch (err) {}
      out.push({ name, t });
    }
  } catch (err) {}
  return out;
}
// This epoch's own entry, the epochs strictly OLDER than it (newest first), and any NEWER ones —
// a newer cache means a newer worker has already installed, and it is not ours to read or delete.
async function epochs() {
  const all = await coreStamps();
  const mine = all.find((c) => c.name === CORE);
  if (!mine) return { mine: null, older: [], newer: [] };
  return {
    mine,
    older: all.filter((c) => c.name !== CORE && c.t <= mine.t).sort((a, b) => b.t - a.t),
    newer: all.filter((c) => c.name !== CORE && c.t > mine.t),
  };
}

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    try {
      const { older } = await epochs();
      // Keep exactly ONE survivor — the most recent previous epoch — so the document still
      // running on it can hand its immutable ?v= assets forward (EPOCH_HANDOFF below), and drop
      // every other one. INVARIANT: if that message never arrives (old client, crash, tab closed
      // early) exactly one stale epoch lingers until the next activate bounds it again — no
      // unbounded growth, no stranded caches.
      await Promise.all(older.slice(1).map((c) => caches.delete(c.name)));
    } catch (err) {}
  })());
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
// Scoped lookups — THIS epoch's cache only, so a surviving previous epoch can never answer for an
// unversioned shard (those change without their URL changing). Fail open: undefined → network.
async function matchCore(req) { try { return await (await caches.open(CORE)).match(req); } catch (err) { return undefined; } }
async function matchImg(req) { try { return await (await caches.open(IMG)).match(req); } catch (err) { return undefined; } }

// ── page-driven maintenance (index.html posts both, in this order, once per load) ─────────────
let chain = Promise.resolve();   // one at a time, in arrival order
self.addEventListener("message", (e) => {
  const d = e.data || {};
  if (d.type !== "EPOCH_HANDOFF" && d.type !== "PRIME") return;
  const assets = Array.isArray(d.assets) ? d.assets : [];
  chain = chain.then(() => (d.type === "EPOCH_HANDOFF" ? handoff(assets) : prime(assets))).catch(() => {});
  e.waitUntil(chain);
});

// EPOCH CARRY-FORWARD. The ?v= URLs the page hands us are content-addressed, so an entry copied
// out of the previous epoch is exact by construction — a byte-identical bundle survives a deploy
// instead of being re-downloaded. Unversioned shards are NEVER carried: their URL does not change
// when their bytes do, and within-epoch exactness is this design's guarantee.
async function handoff(assets) {
  try {
    const { mine, older } = await epochs();
    if (!mine || !older.length) return;
    const prev = await caches.open(older[0].name);
    const cur = await caches.open(CORE);
    for (const u of assets) {
      try {
        const url = new URL(u, self.location.href);
        if (url.origin !== self.location.origin || !/[?&]v=/.test(url.search)) continue;
        const req = new Request(url.href);
        if (await cur.match(req)) continue;
        const hit = await prev.match(req);
        if (hit) await cur.put(req, hit);
      } catch (err) {}
    }
    await Promise.all(older.map((c) => caches.delete(c.name)));
  } catch (err) {}
}

// ROUTE-SHARD WARM-UP. The per-view shard list is policy and lives in index.html; this only
// fetches what THIS epoch does not hold yet, one at a time, and caches it through the normal
// put() guards — nothing is executed, only stored. Done here rather than with page-side fetch()es
// because the load right after a deploy is still controlled by the OUTGOING worker (there is no
// clients.claim()), so its fetches would land in the cache that is about to be dropped.
async function prime(assets) {
  try {
    const { mine, newer } = await epochs();
    if (!mine || newer.length) return;   // superseded epoch — warming it would be thrown away
    const cur = await caches.open(CORE);
    for (const u of assets) {
      try {
        const url = new URL(u, self.location.href);
        if (url.origin !== self.location.origin) continue;
        const req = new Request(url.href);
        if (await cur.match(req)) continue;   // idempotent: a later run is free
        await put(CORE, req, await fetch(req, { priority: "low" }));
      } catch (err) {}
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
      .catch(() => matchCore("./")));
    return;
  }
  if (sameOrigin) {
    if (FRESH.some((rx) => rx.test(url.pathname))) {
      e.respondWith(fetch(req).then((res) => { put(CORE, req, res.clone()); return res; })
        .catch(() => matchCore(req)));
    } else if (/[?&]v=/.test(url.search)) {
      e.respondWith(matchCore(req).then((hit) => hit ||
        fetch(req).then((res) => { put(CORE, req, res.clone()); return res; })));
    } else {
      e.respondWith(matchCore(req).then((hit) => {
        const net = fetch(req).then((res) => { put(CORE, req, res.clone()); return res; }).catch(() => hit);
        return hit || net;
      }));
    }
    return;
  }
  if (req.destination === "image") {
    e.respondWith(matchImg(req).then((hit) => hit ||
      fetch(req).then((res) => { put(IMG, req, res.clone()); return res; })));
  }
});
