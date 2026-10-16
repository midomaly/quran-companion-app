/**
 * Noor Al-Islam — minimal service worker.
 *
 * Registered in production only (see src/main.tsx), so the dev preview and
 * its HMR websocket are never affected. Its job is twofold:
 *  1. give the browser a fetch handler, which full PWA installability
 *     ("Install app" / "Add to Home screen" → standalone window) requires;
 *  2. keep the app shell usable offline — navigations are network-first with
 *     a cached fallback, and static assets are cached as they are used.
 * Qur'an text offline reading is handled separately, on-device (localStorage).
 */

const CACHE = "noor-shell-v1";
const SHELL = "/";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([SHELL]))
      .catch(() => {
        /* offline install — the shell will cache on first online load */
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // App shell: try the network, fall back to the cached shell when offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(SHELL, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(SHELL).then((r) => r || Response.error())),
    );
    return;
  }

  // Static assets (hashed in production): stale-while-revalidate.
  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fresh = fetch(req)
          .then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
            }
            return res;
          })
          .catch(() => cached || Response.error());
        return cached || fresh;
      }),
    );
  }
  // Everything else (API calls, fonts, audio) goes straight to the network.
});
