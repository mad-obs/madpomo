/* ==========================================================================
   madpomo — service worker

   The one thing that turns an installed web app into something that behaves
   like an installed app: it opens with no network. The tasks, sessions and
   settings were always in localStorage, so the data never needed a server —
   only the four pages and their scripts did, and this caches those.

   Two strategies, chosen by what the request is for:

     - pages (navigations): network first, cache as the fallback. A page is
       the thing most likely to have changed, and serving a stale one means
       serving stale script tags. Offline, the cached copy is served instead.
     - everything else: cache first. The CSS, the scripts, the fonts and the
       icons are all versioned by CACHE below, so a cached copy is never
       wrong — it is replaced wholesale when the version changes.

   Bump CACHE on every release. Nothing else makes an old shell go away.
   ========================================================================== */

const CACHE = "madpomo-v1";

/* The app shell: everything needed to draw any of the four pages before the
   network is asked for anything. Relative to this file, so the same worker
   serves the app at a domain root or in a subfolder. */
const SHELL = [
  "./",
  "./index.html",
  "./report.html",
  "./settings.html",
  "./about.html",
  "./tokens.css",
  "./style.css",
  "./mobile.css",
  "./storage.js",
  "./stats.js",
  "./timer.js",
  "./noise.js",
  "./shell.js",
  "./app.js",
  "./report.js",
  "./settings-ui.js",
  "./tutorial.js",
  "./mobile.js",
  "./i18n-data.js",
  "./i18n.js",
  "./fonts/space-mono-400.woff2",
  "./fonts/space-mono-700.woff2",
  "./favicon.ico",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
  "./manifest.webmanifest"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE)
      /* One missing file would reject addAll and leave the app with no
         worker at all, so each is added on its own and a failure is only
         that file going uncached. */
      .then(function (cache) {
        return Promise.all(SHELL.map(function (url) {
          return cache.add(new Request(url, { cache: "reload" })).catch(function () {});
        }));
      })
      /* Take over as soon as the new shell is stored rather than waiting for
         every tab to close. Paired with clients.claim below, a reload is
         enough to pick up a release. */
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

  // never touch anything but plain reads of this origin
  if (request.method !== "GET") return;
  if (new URL(request.url).origin !== self.location.origin) return;

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
            // a URL never visited online falls back to the board
            return hit || caches.match("./index.html");
          });
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(function (hit) {
      if (hit) return hit;

      return fetch(request).then(function (response) {
        /* Opaque and error responses are not worth storing: an opaque one
           cannot be read back usefully and an error would be served as if
           it were the file. */
        if (!response || response.status !== 200 || response.type !== "basic") return response;

        const copy = response.clone();
        caches.open(CACHE).then(function (cache) { cache.put(request, copy); });
        return response;
      });
    })
  );
});
