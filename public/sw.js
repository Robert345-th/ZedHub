const CACHE = "nexus-v44";

// Everything users need offline after installing Nexus once.
const PRECACHE = [
  "/",
  "/index.html",
  "/home.css",
  "/home.js",
  "/no-ptr.js",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/savanna-splash.png",
  "/icons/zedmarket.png",
  "/icons/zedevents.png",
  "/icons/fruits.png",
  "/icons/words.png",
  // Events
  "/events/",
  "/events/index.html",
  "/events/app-manifest.json",
  "/events/css/site.css",
  "/events/css/extra.css",
  "/events/js/api.js",
  "/events/js/auth.js",
  "/events/js/ui.js",
  "/events/js/bottom-nav.js",
  "/events/js/location.js",
  "/events/login.html",
  "/events/signup.html",
  "/events/account.html",
  "/events/favorites.html",
  "/events/chats.html",
  // Fruits
  "/games/fruits/",
  "/games/fruits/index.html",
  "/games/fruits/play.html",
  "/games/fruits/fruits.css",
  "/games/fruits/fruits.js",
  "/games/fruits/stages.js",
  "/games/fruits/manifest.json",
  // Words
  "/games/words/",
  "/games/words/index.html",
  "/games/words/game.css",
  "/games/words/game.js",
  "/games/words/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(async (cache) => {
        // Cache one-by-one so one missing file doesn't fail the whole install
        await Promise.all(
          PRECACHE.map(async (url) => {
            try {
              await cache.add(url);
            } catch (_) {
              /* ignore missing optional assets */
            }
          })
        );
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.pathname.startsWith("/api/") || url.hostname.includes("zedevents-production")) {
    return;
  }

  const isPageAsset =
    req.mode === "navigate" ||
    url.pathname === "/" ||
    url.pathname.endsWith(".html") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".json");

  if (isPageAsset) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const fetched = fetch(req)
        .then((res) => {
          if (res && res.ok && url.origin === self.location.origin) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetched;
    })
  );
});
