/* Offline cache for the Attendance Scanner. After the first online visit the app opens with no internet.
   Bump CACHE when you publish a new index.html so phones pick up the update. */
const CACHE = "attendance-scanner-v9";
const FILES = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "icon-maskable-512.png"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => {
      const net = fetch(e.request).then(r => {
        if (r && r.ok && new URL(e.request.url).origin === location.origin) {
          const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return r;
      }).catch(() => hit || (e.request.mode === "navigate" ? caches.match("index.html") : undefined));
      return hit || net;     // cached copy first (fast, works offline); refreshed in the background when online
    })
  );
});
