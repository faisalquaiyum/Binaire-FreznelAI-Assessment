const SHELL_CACHE = "atlas-shell-v2";
const DATA_CACHE = "atlas-data-v2";
const CACHE_NAMES = [SHELL_CACHE, DATA_CACHE];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(["/", "/index.html"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !CACHE_NAMES.includes(key))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.pathname === "/api/models") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          return caches.open(DATA_CACHE).then((cache) => {
            cache.put(event.request, copy);
            return response;
          });
        })
        .catch(() => caches.match(event.request)),
    );
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/index.html")),
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        return caches.open(SHELL_CACHE).then((cache) => {
          cache.put(event.request, copy);
          return response;
        });
      })
      .catch(() => caches.match(event.request)),
  );
});
