const VERSION = 'BUILD_TIME_PLACEHOLDER';
const CACHE_NAME = 'site-cache-v' + VERSION;

const ASSETS = [
  './',
  './index.html',
  './en.html',
  './css/styles.css',
  './css/tailwind.css',
  './js/app.js',
  './js/modules/state.js',
  './js/modules/pwa.js',
  './js/modules/loader.js',
  './js/modules/studio.js',
  './fonts/Inter.woff2'
];

let memoryLang = null;

// Helper to retrieve language preference from persistent SW cache storage or navigator
async function getPreferredLang() {
  if (memoryLang) {
    return memoryLang;
  }
  try {
    const cache = await caches.open('lang-pref-cache');
    const response = await cache.match('/lang_pref');
    if (response) {
      const text = await response.text();
      memoryLang = text;
      return text;
    }
  } catch (e) {}

  // Fallback to browser language
  const navLang = (self.navigator.language || 'zh').toLowerCase();
  return navLang.startsWith('zh') ? 'zh' : 'en';
}

// 1. Install stage: pre-cache assets using sw-bypass=1 and clean redirect headers
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        ASSETS.map((url) => {
          let fetchUrl = url;
          const isHtml = url === './' || url === './index.html' || url === './en.html' || url.endsWith('.html');
          if (isHtml) {
            const u = new URL(url, self.location.href);
            u.searchParams.set('sw-bypass', '1');
            fetchUrl = u.toString();
          }

          return fetch(fetchUrl).then(async (response) => {
            // Precache defense: strictly verify response is OK and NOT redirected
            if (!response.ok || response.redirected) {
              throw new Error(`Request failed or was redirected for URL: ${url}`);
            }

            // Extract blob to re-create the Response, removing redirected: true or opaqueredirect flags
            const blob = await response.blob();
            const cleanResponse = new Response(blob, {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers
            });

            return cache.put(url, cleanResponse);
          }).catch((err) => {
            console.warn('Precache failed:', url, err);
          });
        })
      );
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate stage: clean up old caches (preserving the 'lang-pref-cache' language preference cache)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME && key !== 'lang-pref-cache').map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Message listener to receive and persist language preference from client DOM / switcher events
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SET_LANG_PREF') {
    const lang = event.data.lang;
    memoryLang = lang;
    event.waitUntil(
      caches.open('lang-pref-cache').then((cache) => {
        return cache.put('/lang_pref', new Response(lang));
      })
    );
  }
});

// 3. Fetch strategy: SW-level navigation redirect, bypass hook, and Stale-While-Revalidate
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  const url = new URL(event.request.url);
  const pathname = url.pathname;

  // A. SW Bypass check: direct pass-through if sw-bypass=1 is in query parameters
  if (url.searchParams.get('sw-bypass') === '1') {
    return;
  }

  // B. SW-Level Navigation Redirection
  if (event.request.mode === 'navigate') {
    const isRoot = pathname === '/' || pathname === '/index.html';
    if (isRoot) {
      event.respondWith((async () => {
        const preferredLang = await getPreferredLang();
        
        // If preferred language is English, perform local redirect to /en
        if (preferredLang === 'en') {
          return Response.redirect(new URL('/en' + url.search, self.location.href).toString(), 302);
        }
        
        // Otherwise, serve default Chinese index.html
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match('./index.html');
        if (cachedResponse) {
          return cachedResponse;
        }

        // Network fallback with redirect transformation defense
        const networkResponse = await fetch(event.request);
        if (networkResponse.redirected) {
          return Response.redirect(networkResponse.url, 302);
        }
        return networkResponse;
      })());
      return;
    }

    // Serve English version subpath (/en or /en.html) directly from cache
    const isEn = pathname === '/en' || pathname === '/en.html';
    if (isEn) {
      event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match('./en.html');
        if (cachedResponse) {
          return cachedResponse;
        }

        // Network fallback with redirect transformation defense
        const networkResponse = await fetch(event.request);
        if (networkResponse.redirected) {
          return Response.redirect(networkResponse.url, 302);
        }
        return networkResponse;
      })());
      return;
    }
  }

  // C. Stale-While-Revalidate caching for static assets
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(event.request);

      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (!networkResponse) return networkResponse;

        // Redirect transformation defense: if network response is redirected,
        // convert it to a standard, explicit redirect Response to prevent ERR_FAILED
        if (networkResponse.redirected) {
          return Response.redirect(networkResponse.url, 302);
        }

        if (networkResponse.status === 200) {
          // Clean responses only: skip caching if response is an opaque redirect
          if (networkResponse.type !== 'opaqueredirect') {
            cache.put(event.request, networkResponse.clone());
          }
        }
        return networkResponse;
      }).catch(() => {});

      return cachedResponse || fetchPromise;
    })
  );
});