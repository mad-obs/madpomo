/* ==========================================================================
   madpomo (React) — service worker

   Same job as the one at the project root: let the app open with no network,
   so an installed madpomo behaves like an installed app. The strategy has to
   differ in one way, though.

   The plain build can list its files, because they are called what they are
   called. This one is bundled: Vite writes `assets/index-Bq7xK2.js` and the
   hash changes on every build, so there is no list to write down. Instead
   every same-origin file is cached the first time it is fetched. The first
   visit needs the network; every one after that does not.

   That makes the version below the only way to clear old bundles out: bump
   CACHE on release, and the activate step drops everything from the one
   before it.
   ========================================================================== */

const CACHE = "madpomo-react-v1";

self.addEventListener("install", function (event) {
  /* The shell is one page and one manifest; the bundle names are not known
     here, so they arrive through the fetch handler instead. */
  event.waitUntil(
    caches.open(CACHE)
      .then(function (cache) {
        return Promise.all(
          ["./", "./index.html", "./manifest.webmanifest", "./favicon.ico",
           "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"]
            .map(function (url) {
              return cache.add(new Request(url, { cache: "reload" })).catch(function () {});
            })
        );
      })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (names) {
        return Promise.all(names.map(function (name) {
          return name === CACHE ? null : caches.delete(name);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  const request = event.request;

  if (request.method !== "GET") return;
  if (new URL(request.url).origin !== self.location.origin) return;

  /* The page first, always from the network when there is one: it carries the
     <script> tag that names this build's bundle, and a stale one would point
     at files this cache no longer has. */
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(function (response) {
          const copy = response.clone();
          caches.open(CACHE).then(function (cache) { cache.put(request, copy); });
          return response;
        })
        .catch(function () {
          return caches.match(request).then(function (hit) {
            // the app routes on the hash, so every URL is this one page
            return hit || caches.match("./index.html");
          });
        })
    );
    return;
  }

  /* Everything else is hashed, so a cached copy can never be the wrong
     version of anything — a new build asks for a new name. */
  event.respondWith(
    caches.match(request).then(function (hit) {
      if (hit) return hit;

      return fetch(request).then(function (response) {
        if (!response || response.status !== 200 || response.type !== "basic") return response;

        const copy = response.clone();
        caches.open(CACHE).then(function (cache) { cache.put(request, copy); });
        return response;
      });
    })
  );
});
