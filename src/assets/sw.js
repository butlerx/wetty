const CACHE = 'wetty-v1';

globalThis.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.addAll(['./', './client/wetty.js', './client/wetty.css']),
      ),
  );
  event.waitUntil(globalThis.skipWaiting());
});

globalThis.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      ),
  );
  event.waitUntil(globalThis.clients.claim());
});

globalThis.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() =>
        caches
          .match(event.request)
          .then((cached) => cached ?? new Response('Offline', { status: 503 })),
      ),
  );
});
