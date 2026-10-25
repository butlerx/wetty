const CACHE_PREFIX = 'wetty-';
const CACHE = `${CACHE_PREFIX}v2`;
const STATIC_ASSETS = [
  './',
  './client/wetty.js',
  './client/wetty.css',
  './client/favicon.svg',
  './client/favicon-alert.svg',
  './client/manifest.json',
  './client/wetty.svg',
  './client/xterm_config/functionality.js',
  './client/xterm_config/index.html',
  './client/xterm_config/style.css',
];
const STATIC_URLS = new Set(
  STATIC_ASSETS.map(
    (asset) => new URL(asset, globalThis.registration.scope).href,
  ),
);

globalThis.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE).then((cache) => cache.addAll(STATIC_ASSETS)),
      globalThis.skipWaiting(),
    ]),
  );
});

globalThis.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE)
              .map((key) => caches.delete(key)),
          ),
        ),
      globalThis.clients.claim(),
    ]),
  );
});

globalThis.addEventListener('fetch', (event) => {
  let requestUrl;
  try {
    requestUrl = new URL(event.request.url);
  } catch {
    return;
  }
  if (
    event.request.method !== 'GET' ||
    requestUrl.search !== '' ||
    !STATIC_URLS.has(requestUrl.href)
  ) {
    return;
  }

  const response = fetch(event.request);
  event.waitUntil(
    response
      .then((networkResponse) => {
        if (!networkResponse.ok) return undefined;
        return caches
          .open(CACHE)
          .then((cache) => cache.put(event.request, networkResponse.clone()));
      })
      .catch(() => undefined),
  );
  event.respondWith(
    response.catch(() =>
      caches
        .open(CACHE)
        .then((cache) => cache.match(event.request))
        .then((cached) => cached ?? new Response('Offline', { status: 503 })),
    ),
  );
});
