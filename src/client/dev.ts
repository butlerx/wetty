void caches.keys().then((cacheNames) => {
  cacheNames.forEach((cacheName) => {
    void caches.delete(cacheName);
  });
});
