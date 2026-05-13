export class I18nModule {
  constructor() {
    this.lang = navigator.language.startsWith('zh') ? 'zh' : 'en';
    this.data = null;
  }

  async init() {
    try {
      const response = await fetch('./locales/i18n.json');
      this.data = await response.json();
      this.updateDOM();
    } catch (e) {
      console.error('Failed to load i18n data', e);
    }
  }

  t(key) {
    if (!this.data) return key;
    return this.data[this.lang][key] || key;
  }

  updateDOM() {
    document.title = this.t('title');
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = this.t(el.getAttribute('data-i18n'));
    });
  }
}