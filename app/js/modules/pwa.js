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

    // Sync language preference on DOMContentLoaded or immediately if already loaded
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', () => this.syncLanguage());
    } else {
      this.syncLanguage();
    }
  }

  updateManifest() {
    const mainUrl = location.href.split('?')[0].split('#')[0];
    const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    const COLOR_LIGHT = '#f9fafb';
    const COLOR_DARK = '#121212';
    const bgColor = isDark ? COLOR_DARK : COLOR_LIGHT;
    const iconColor = isDark ? COLOR_LIGHT : COLOR_DARK;

    const iconUrl = new URL('./favicon.svg', location.href).href;

    const manifest = {
      name: window.I18N_DATA?.title || 'Simple Img Stitcher',
      short_name: window.I18N_DATA?.title || 'Simple Img Stitcher',
      description: window.I18N_DATA?.desc || 'Simple front-end long image stitcher',
      scope: '/',
      start_url: mainUrl,
      display: "standalone",
      background_color: bgColor,
      theme_color: bgColor,
      icons: [{
        src: iconUrl,
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
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('./sw.js').then(reg => {
        // Sync language preference immediately upon successful registration
        this.syncLanguage();

        // Listen for controllerchange and sync again
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          this.syncLanguage();
        });
      }).catch(err => {
        console.log('SW registration failed:', err);
      });
    }
  }

  syncLanguage(forcedLang) {
    const currentLang = forcedLang || (document.documentElement.lang.startsWith('zh') ? 'zh' : 'en');
    const messageData = { type: 'SET_LANG_PREF', lang: currentLang };

    // Update client-side cookie
    document.cookie = `lang_pref=${currentLang}; Path=/; Max-Age=31536000; Secure; SameSite=Lax`;

    if ('serviceWorker' in navigator) {
      // 1. Send to the active controlling Service Worker
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage(messageData);
      }

      // 2. Send to all worker instances (active, installing, waiting) in all registrations
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (const reg of registrations) {
          if (reg.active) reg.active.postMessage(messageData);
          if (reg.installing) reg.installing.postMessage(messageData);
          if (reg.waiting) reg.waiting.postMessage(messageData);
        }
      }).catch(() => {});
    }
  }
}