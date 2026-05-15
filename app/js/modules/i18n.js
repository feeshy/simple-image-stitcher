export class I18nModule {
  constructor() {
    this.lang = navigator.language.startsWith('zh') ? 'zh' : 'en';
    this.data = {
      "zh": {
        "title": "简单拼图",
        "vertical": "纵向拼接",
        "horizontal": "横向拼接",
        "emptyTitle": "添加图片以开始",
        "emptySub": "拖动缩略图重新排序",
        "clear": "清空",
        "nextStep": "下一步",
        "prevStep": "上一步",
        "clickSeam": "点击高亮微调接缝",
        "cancel": "取消",
        "indepCrop": "独立裁切",
        "symCrop": "对称裁切",
        "done": "完成",
        "export": "导出",
        "restart": "首页",
        "offline": "您已离线，应用可在离线模式下继续使用",
        "online": "网络已恢复",
        "generating": "正在生成...",
        "tooLarge": "图片过大，已自动缩放以防崩溃",
        "downloaded": "下载完成",
        "delete": "删除",
        "desc": "极简纯前端长图拼接应用，支持离线本地使用"
      },
      "en": {
        "title": "Simple Image Stitcher",
        "vertical": "Vert.",
        "horizontal": "Horiz.",
        "emptyTitle": "Import images here",
        "emptySub": "Drag thumbnails to reorder",
        "clear": "Clear",
        "nextStep": "Next",
        "prevStep": "Back",
        "clickSeam": "Tap seam to tune",
        "cancel": "Cancel",
        "indepCrop": "Indep.",
        "symCrop": "Symm.",
        "done": "Done",
        "export": "Export",
        "restart": "Restart",
        "offline": "You are offline. App continues to work.",
        "online": "Network restored",
        "generating": "Generating...",
        "tooLarge": "Image too large, auto-scaled to prevent crash.",
        "downloaded": "Downloaded",
        "delete": "Delete",
        "desc": "Simple front-end long image stitcher, PWA offline ready."
      }
    };
  }

  async init() {
    this.updateDOM();
    return Promise.resolve();
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