/* Attendance Scanner service worker
   - Works fully offline after the first visit (the app is one page, everything is cached).
   - Pages: network first (so an update shows up as soon as you are online), cached copy when offline.
   - Other files (icons, manifest): cached copy first, refreshed quietly in the background.
   - Student data and scans live in localStorage / IndexedDB, which this file never touches.
   When you change index.html, bump VERSION below so phones drop the old cache. */
const VERSION = "v10b";
const CACHE = "attendance-" + VERSION;
const SHELL = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png"];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // add each file on its own so one missing file (e.g. no icon-512.png) cannot break the install
    await Promise.all(SHELL.map(url => cache.add(new Request(url, { cache: "reload" })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith("attendance-") && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;           // never touch other sites

  // opening / reloading the app
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) cache.put("index.html", fresh.clone());
        return fresh;
      } catch (e) {
        return (await cache.match("index.html")) || (await cache.match("./")) || Response.error();
      }
    })());
    return;
  }

  // everything else: cached copy first, refresh in the background
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    const refresh = fetch(req).then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
    return cached || (await refresh) || Response.error();
  })());
});
