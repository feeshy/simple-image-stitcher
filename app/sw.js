const CACHE_NAME = 'v2.1';

const ASSETS = [
  './',
  './css/styles.css',
  './js/app.js',
  './js/modules/state.js',
  './js/modules/i18n.js',
  './js/modules/pwa.js',
  './js/modules/loader.js',
  './js/modules/studio.js'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) return;
  event.respondWith(
    caches.match(event.request).then(cachedRes => {
      if (cachedRes) {
        fetch(event.request).then(netRes => {
          if (netRes && netRes.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, netRes));
          }
        }).catch(() => { });
        return cachedRes;
      }
      return fetch(event.request).then(netRes => {
        if (netRes && netRes.status === 200) {
          const resClone = netRes.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
        }
        return netRes;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./');
        }
      });
    })
  );
});