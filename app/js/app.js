import { UI_MODE, StateModule } from './modules/state.js';
import { I18nModule } from './modules/i18n.js';
import { PWAModule } from './modules/pwa.js';
import { LoaderModule } from './modules/loader.js';
import { StudioModule } from './modules/studio.js';

class AppController {
  constructor() { }

  async init() {
    this.i18n = new I18nModule();
    await this.i18n.init();

    this.state = new StateModule();
    this.pwa = new PWAModule(this);

    // 更新实例化的类名
    this.loader = new LoaderModule(this);
    this.studio = new StudioModule(this);

    this.bindUIEvents();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);

    window.addEventListener('resize', () => { this.studio.resize(); this.fitCamera(); });
    window.addEventListener('offline', () => this.showToast(this.i18n.t("offline")));
    window.addEventListener('online', () => this.showToast(this.i18n.t("online")));
  }

  showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg; toast.style.opacity = '1';
    setTimeout(() => toast.style.opacity = '0', 2000);
  }

  setUIMode(mode) {
    this.state.mode = mode;
    document.getElementById('step-1').className = mode === UI_MODE.STEP1 ? 'step-container active-step p-4 sm:p-6 w-full h-full flex flex-col' : 'step-container hidden-step';
    document.getElementById('step-2-3').className = mode !== UI_MODE.STEP1 ? 'step-container active-step bg-gray-100 dark:bg-gray-950' : 'step-container hidden-step';

    document.getElementById('ui-step2-global').classList.toggle('hidden', mode !== UI_MODE.STEP2_GLOBAL);
    document.getElementById('ui-step2-seam').classList.toggle('hidden', mode !== UI_MODE.STEP2_SEAM);
    document.getElementById('ui-step3-crop').classList.toggle('hidden', mode !== UI_MODE.STEP3_CROP);
    this.studio.resize();
  }

  fitCamera() {
    const canvas = this.studio.canvas;
    const pad = 40;
    const scaleX = (canvas.clientWidth - pad * 2) / this.state.totalBounds.w;
    const scaleY = (canvas.clientHeight - pad * 2) / this.state.totalBounds.h;
    this.state.camera.zoom = Math.max(0.05, Math.min(10, Math.min(scaleX, scaleY)));
    this.state.camera.x = this.state.totalBounds.w / 2;
    this.state.camera.y = this.state.totalBounds.h / 2;
  }

  startSeamAdjust(index) {
    this.state.activeSeamIndex = index;
    this.state.tempOverlapDeltaPrev = 0;
    this.state.tempOverlapDeltaNext = 0;
    this.setUIMode(UI_MODE.STEP2_SEAM);

    const img1 = this.state.images[index];
    const img2 = this.state.images[index + 1];
    let seamX, seamY, tZoom;
    const cw = this.studio.canvas.clientWidth; const ch = this.studio.canvas.clientHeight;

    if (this.state.direction === 'vertical') {
      seamX = this.state.baseDimension / 2;
      seamY = img1.logicalY + img1.logicalH - this.state.overlaps[index].prev;
      tZoom = Math.min(cw / this.state.baseDimension, ch / (img1.logicalH + img2.logicalH) * 2);
    } else {
      seamY = this.state.baseDimension / 2;
      seamX = img1.logicalX + img1.logicalW - this.state.overlaps[index].prev;
      tZoom = Math.min(ch / this.state.baseDimension, cw / (img1.logicalW + img2.logicalW) * 2);
    }
    this.state.camera.x = seamX; this.state.camera.y = seamY; this.state.camera.zoom = tZoom;
  }

  bindUIEvents() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');

    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('border-blue-500'); });
    dropZone.addEventListener('dragleave', e => { e.preventDefault(); dropZone.classList.remove('border-blue-500'); });
    dropZone.addEventListener('drop', e => { e.preventDefault(); dropZone.classList.remove('border-blue-500'); this.loader.handleFiles(e.dataTransfer.files); });
    dropZone.addEventListener('click', e => {
      if (!e.target.closest('.thumbnail-container')) {
        fileInput.click();
      }
    });
    fileInput.addEventListener('change', e => this.loader.handleFiles(e.target.files));
    window.addEventListener('paste', e => {
      if (this.state.mode === UI_MODE.STEP1 && e.clipboardData && e.clipboardData.files.length > 0) {
        e.preventDefault();
        this.loader.handleFiles(e.clipboardData.files);
      }
    });

    document.getElementById('btn-clear-all').onclick = () => {
      this.state.images.forEach(img => URL.revokeObjectURL(img.url));
      this.state.images = [];
      this.loader.renderThumbnails();
      fileInput.value = '';
    };

    document.getElementById('btn-next-1').onclick = () => {
      this.state.direction = Array.from(document.getElementsByName('direction')).find(r => r.checked).value;
      this.state.calculateBaseLayout();
      if (this.state.overlaps.length !== this.state.images.length - 1) {
        this.state.overlaps = Array.from({ length: this.state.images.length - 1 }, () => ({ prev: 0, next: 0 }));
      }
      this.state.updateLayoutPositions(); this.fitCamera();
      this.setUIMode(UI_MODE.STEP2_GLOBAL);
    };

    const seamModeToggle = document.getElementById('seam-mode-toggle');
    const seamModeText = document.getElementById('seam-mode-text');
    if (seamModeToggle) {
      seamModeToggle.addEventListener('change', (e) => {
        this.state.seamMode = e.target.checked ? 'symmetric' : 'independent';
        seamModeText.textContent = e.target.checked ? this.i18n.t('symCrop') : this.i18n.t('indepCrop');
      });
    }

    document.getElementById('btn-global-prev').onclick = () => this.setUIMode(UI_MODE.STEP1);
    document.getElementById('btn-global-next').onclick = () => {
      this.state.updateLayoutPositions();
      this.state.cropBox = { x: 0, y: 0, w: this.state.totalBounds.w, h: this.state.totalBounds.h };
      this.fitCamera(); this.setUIMode(UI_MODE.STEP3_CROP);
    };

    document.getElementById('btn-seam-cancel').onclick = () => {
      this.state.tempOverlapDeltaPrev = 0;
      this.state.tempOverlapDeltaNext = 0;
      this.state.updateLayoutPositions(); this.fitCamera(); this.setUIMode(UI_MODE.STEP2_GLOBAL);
    };
    document.getElementById('btn-seam-confirm').onclick = () => {
      this.state.overlaps[this.state.activeSeamIndex].prev += this.state.tempOverlapDeltaPrev;
      this.state.overlaps[this.state.activeSeamIndex].next += this.state.tempOverlapDeltaNext;
      this.state.tempOverlapDeltaPrev = 0;
      this.state.tempOverlapDeltaNext = 0;
      this.state.updateLayoutPositions(); this.fitCamera(); this.setUIMode(UI_MODE.STEP2_GLOBAL);
    };

    document.getElementById('btn-crop-prev').onclick = () => { this.state.updateLayoutPositions(); this.fitCamera(); this.setUIMode(UI_MODE.STEP2_GLOBAL); };
    document.getElementById('btn-crop-save').onclick = async () => {
      this.showToast(this.i18n.t("generating"));
      await new Promise(r => setTimeout(r, 50));

      const exportCanvas = document.createElement('canvas');
      let outW = this.state.cropBox.w; let outH = this.state.cropBox.h;

      const maxDim = 16384; let scale = 1;
      if (outW > maxDim || outH > maxDim) {
        scale = maxDim / Math.max(outW, outH);
        outW *= scale; outH *= scale;
        this.showToast(this.i18n.t("tooLarge"));
      }

      exportCanvas.width = outW; exportCanvas.height = outH;
      const eCtx = exportCanvas.getContext('2d');

      eCtx.imageSmoothingEnabled = true;
      eCtx.imageSmoothingQuality = 'high';

      eCtx.scale(scale, scale); eCtx.translate(-this.state.cropBox.x, -this.state.cropBox.y);

      this.studio.renderClippedImages(eCtx, this.state.cropBox);

      exportCanvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `stitched_image_${Date.now()}.png`; a.click();
        URL.revokeObjectURL(url); this.showToast(this.i18n.t("downloaded"));
      }, 'image/png', 1.0);
    };
    document.getElementById('btn-crop-restart').onclick = () => this.setUIMode(UI_MODE.STEP1);
  }

  loop() {
    requestAnimationFrame(this.loop);
    if (this.studio) this.studio.renderFrame();
  }
}

const app = new AppController();
app.init();