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

    const COLOR_LIGHT = '#f9fafb';
    const COLOR_DARK = '#121212';
    const bgColor = isDark ? COLOR_DARK : COLOR_LIGHT;
    const iconColor = isDark ? COLOR_LIGHT : COLOR_DARK;

    const svgCode = `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'>
    <defs>
        <mask id='icon-mask'>
            <g transform='matrix(1,0,0,1,-64,-64)'>
                <g transform='matrix(0.6,0,0,0.8,124.4,51.2)'>
                    <rect x='166' y='176' width='320' height='320' fill='none' stroke='white' stroke-width='35.36' stroke-linecap='round' />
                </g>
                <g transform='matrix(0.942486,0,0,1,86.335672,61.639316)'>
                    <g transform='matrix(1.061024,0,0,1,-23.698673,2.360684)'>
                        <image x='78.645' y='243.645' width='356' height='28' href='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAWQAAAAcCAYAAABWHcU4AAAACXBIWXMAAA7EAAAOxAGVKw4bAAAFJ0lEQVR4nO2dz4scRRTHPzUzbmI2a2JEUARziCAGvBiEgAfxKgpevOjFP8GLB0+ePUoEPQQREQMiiKgnjfiLIEYFEYwb0SCCBN1g9lcyuzvTz0N179SW1T3Ts/Njf3w/8HhVr2vo6tne1zWvX1U5amJmLaAJFLoJWEKyXLpA1zmX1T2XEELsJ5yZNYA7gXuAB3I5DtwF3AEcBQ4Ds8BBoDHkuYzcOQOdhGzUtG1EtthedrwT9aMbSJaQ4uHi8usort/l0sA/nFrATIUcyPUtubT6SIPeAy9VbkTi+pQJ6kR2F0lIXC+zWVQuq8e63/GMrQ/5WFcd72cr/uYpHd4PVe1iHd5jsU7do0V5PZe1QBcS9iW+Z1NStDHnXPg9ix2OM7MTwBvAQ3jHK4TYOWR4p10455u53CgpV9XbQb0dHQ/rG3Lk06GFH609gh91CSF2Fg38r6sDQ3w2HlUPojtA28yWgMVcwnIo1wO94pxrD3WFYpMW/sucB05OuS9CiNFShK1aEzhX18zaeH/yb6SvB/XYtkzvgTBweGivjuBb+J8r3yCHLIQYnib+PdMs/n3UoHTphU1Wc11VvgGsmlkRXmnTC7ek9JbyTnfkhUP+GniO4V/YCSHEMDTx767qvr+KkwPil/jJRAAzW6YXholluaS+4pzrDH2FNWg55zpmdgn4HbhvEicVQohtUmQdDRNbr0sWOPI45FIlS/gBbxFuKUsL3sCnBlsRW/oD+BY5ZCGEiGkAR3K5t8bnDD8yjzNd1vL6MrAAXAbOm9mPhUP+Gx9HfhKYG8EFCCHEfsfRm3dwW0W7DLgdWGgAOOe6wAXg13H3UAghxCYZcBH4DLgcpsP8hA9bPIj36EIIIcbDOnAV+BB4HZh3ztmWKbBm9hjwDn7atBBCiNHzJ/Ap8CbwHT4dL4PEmgRm9j7w1CR7J4QQ+4A1/ID3rHPuQqpByiGfAj5H61oIIcR2WQZ+w8/1eAu45JxbKWuccsgOeBl4YVw9FEKIBs4i8BXwEd4Z/8IAU75TyyhiZoeAH4D7R9xJIYTYqxg+1/hd4DV8okSt6dplDtnh48hngWPb76cQQuxJMny2xM/41LX3gCvDTrVOOmQAMzsCvAg8z2SmJwohxG6hg3fCHwNf4kfDf2138aJShwxgZseBM8AT/doKIcQ+YBk/keMM8EVe745qFbm+TtbMHgZeAU4P0l4IIfYYC8AVfEjiA+DiuFZ/G8jBmtlp4FXg1Dg6IYQQO4wb+HS1T/DZEt8DV51zG+M86cAjXjO7GzgHPDq+7gghxFRZxI+E38bHhpeY4B6DtUIQ+Yu+l4Bn8DtVa0F7IcRuoNhlfIOtO3y38aPhf4Dz+LUl5sc9Ei6jdkzYzGbxo+RngceBo6PulBBCRIS7b4fOtNChFFs93eT/W0Gt0tsJpFhw/hpwrVhPYpoM9ZIuz1Oewy/W/DQ+Z/kkk9lMUQgxfTJ6I83YUcbldlAObVX73xWLuheyhk81yyqkG5VD2RUbo44kayJ30MeAE/iFludyOQwcAm4FDgb6IDCDz2+eiaRY0LmJD4m4QBiwTkkbEm3KbIO2j8vjsk2Tfjdy3eNV9Tptqz5rQ9qGaRPqKlu4c3I3qNcqbKHuJOphOd5PrrCV7jOHd55hu5SshzKpPeb2GzvtH3+T3Mk3I2kE0iwpu6jcTNhcYHPbtBHYGKEt1P2o83dMta1yRnXsgxwPJWVL2fvVY3tq/7JUucxW1T5L6CyodyP7Znk3jNDEdPkPoIPn7C2z/osAAAAASUVORK5CYII=' />
                    </g>
                </g>
            </g>
        </mask>
    </defs>
    <rect width='512' height='512' fill='${bgColor}' />
    <rect width='512' height='512' fill='${iconColor}' mask='url(#icon-mask)' />
</svg>`.trim().replace(/\n/g, '').replace(/"/g, "'");

    const iconDataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgCode)}`;

    const manifest = {
      name: this.app.i18n.t('title'),
      short_name: this.app.i18n.t('title'),
      description: this.app.i18n.t('desc'),
      start_url: mainUrl,
      display: "standalone",
      background_color: bgColor,
      theme_color: bgColor,
      icons: [{
        src: iconDataUri,
        sizes: "any 512x512 192x192",
        type: "image/svg+xml",
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
          const CACHE_NAME = 'v2.0';
          const MAIN_URL = '${mainUrl}';

          const ASSETS = [
              MAIN_URL,
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