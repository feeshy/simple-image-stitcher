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

// 1. 安装阶段
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        ASSETS.map((url) =>
          cache.add(url).catch((err) => console.warn('Precache failed:', url, err))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// 2. 激活阶段：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// 3. 运行时策略：适配 SPA 的 StaleWhileRevalidate
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      // 1. 尝试从缓存获取
      const cachedResponse = await cache.match(event.request);

      // 2. 后台更新逻辑
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(() => { });

      // 3. 如果是导航请求且缓存中没找到，回退到 index.html
      if (event.request.mode === 'navigate' && !cachedResponse) {
        return cache.match('./index.html').then(res => res || fetchPromise);
      }

      // 4. 返回缓存或等待网络结果
      return cachedResponse || fetchPromise;
    })
  );
});