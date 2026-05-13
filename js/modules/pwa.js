export class PWAModule {
  constructor(app) {
    this.app = app;
    this.manifestLink = document.createElement('link');
    this.manifestLink.rel = 'manifest';
    document.head.appendChild(this.manifestLink);

    this.lastManifestUrl = null;
    this.updateManifest();

    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        this.updateManifest();
      });
    }

    this.initSW();
  }

  updateManifest() {
    const mainUrl = location.href.split('?')[0].split('#')[0];
    const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    const manifest = {
      name: this.app.i18n.t('title'),
      short_name: this.app.i18n.t('title'),
      description: this.app.i18n.t('desc'),
      start_url: mainUrl,
      display: "standalone",
      background_color: isDark ? "#121212" : "#f9fafb",
      theme_color: isDark ? "#121212" : "#f9fafb",
      icons: [{
        src: isDark ? "./icon-dark.png" : "./icon-light.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable"
      }]
    };

    if (this.lastManifestUrl) {
      URL.revokeObjectURL(this.lastManifestUrl);
    }
    this.lastManifestUrl = URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' }));
    this.manifestLink.href = this.lastManifestUrl;
  }

  initSW() {
    const mainUrl = location.href.split('?')[0].split('#')[0];
    if ('serviceWorker' in navigator) {
      const swCode = `
          const CACHE_NAME = 'img-stitcher-v2';
          const MAIN_URL = '${mainUrl}';
          
          const ASSETS = [
              MAIN_URL,
              './icon-light.png',
              './icon-dark.png',
              './css/styles.css',
              './locales/i18n.json',
              './js/app.js',
              './js/modules/state.js',
              './js/modules/i18n.js',
              './js/modules/pwa.js',
              './js/modules/loader.js',
              './js/modules/studio.js'
          ];
          
          self.addEventListener('install', event => {
              self.skipWaiting();
              event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
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
                              if (netRes && netRes.status === 200) caches.open(CACHE_NAME).then(cache => cache.put(event.request, netRes));
                          }).catch(()=>{});
                          return cachedRes;
                      }
                      return fetch(event.request).then(netRes => {
                          if (netRes && netRes.status === 200) {
                              const resClone = netRes.clone();
                              caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
                          }
                          return netRes;
                      }).catch(() => { if (event.request.mode === 'navigate') return caches.match(MAIN_URL); });
                  })
              );
          });
      `;
      const swUrl = URL.createObjectURL(new Blob([swCode], { type: 'application/javascript' }));
      navigator.serviceWorker.register(swUrl).catch(err => console.log('SW Error:', err));
    }
  }
}