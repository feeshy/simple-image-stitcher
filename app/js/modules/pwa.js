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

    const iconUrl = new URL('./favicon.svg', location.href).href;

    const manifest = {
      name: this.app.i18n.t('title'),
      short_name: this.app.i18n.t('title'),
      description: this.app.i18n.t('desc'),
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
      navigator.serviceWorker.register('./sw.js').catch(err => {
        console.log('SW registration failed:', err);
      });
    }
  }
}