import { UI_MODE } from './state.js';

export class StudioModule {
  constructor(app) {
    this.app = app;
    // 渲染相关初始化
    this.canvas = document.getElementById('main-canvas');
    this.ctx = this.canvas.getContext('2d');

    // 交互相关初始化
    this.pointers = new Map();
    this.isSpaceDown = false;
    this.dragState = { active: false, type: null, startX: 0, startY: 0, startCamX: 0, startCamY: 0, startCrop: null, activeImageIndex: -1, lastDist: 0, lastCenter: null };

    this.bindEvents();
  }

  // --- 视图渲染方法 ---

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.canvas.clientWidth * dpr;
    this.canvas.height = this.canvas.clientHeight * dpr;
  }

  drawGrid(w, h) {
    const ctx = this.ctx;
    const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    ctx.fillStyle = isDark ? '#1e1e1e' : '#e5e7eb';
    ctx.fillRect(0, 0, w, h);

    const s = 40;
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = (w / 2) % s; x < w; x += s) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    for (let y = (h / 2) % s; y < h; y += s) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
    ctx.stroke();
  }

  renderClippedImages(ctxToDraw, customCropBox = null) {
    const state = this.app.state;
    state.images.forEach((img, i) => {
      let cropStart = i > 0 ? Math.max(0, state.overlaps[i - 1].next) : 0;
      let cropEnd = i < state.images.length - 1 ? Math.max(0, state.overlaps[i].prev) : 0;

      let sx = 0, sy = 0, sw = img.naturalW, sh = img.naturalH;
      let dx = img.logicalX, dy = img.logicalY, dw = img.logicalW, dh = img.logicalH;

      if (state.direction === 'vertical') {
        sy = cropStart / img.scale;
        sh = (img.logicalH - cropStart - cropEnd) / img.scale;
        dy += cropStart; dh -= (cropStart + cropEnd);
      } else {
        sx = cropStart / img.scale;
        sw = (img.logicalW - cropStart - cropEnd) / img.scale;
        dx += cropStart; dw -= (cropStart + cropEnd);
      }

      if (sw <= 0 || sh <= 0 || dw <= 0 || dh <= 0) return;

      if (customCropBox) {
        if (dx + dw < customCropBox.x || dx > customCropBox.x + customCropBox.w) return;
        if (dy + dh < customCropBox.y || dy > customCropBox.y + customCropBox.h) return;
      }
      ctxToDraw.drawImage(img.imgEl, sx, sy, sw, sh, dx, dy, dw, dh);
    });
  }

  renderSeamsGlobal() {
    const ctx = this.ctx;
    const state = this.app.state;
    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3 / state.camera.zoom;
    ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 10 / state.camera.zoom;

    state.overlaps.forEach((overlap, i) => {
      const img = state.images[i];
      ctx.beginPath();
      if (state.direction === 'vertical') {
        const y = img.logicalY + img.logicalH - overlap.prev;
        ctx.moveTo(0, y); ctx.lineTo(state.baseDimension, y);
      } else {
        const x = img.logicalX + img.logicalW - overlap.prev;
        ctx.moveTo(x, 0); ctx.lineTo(x, state.baseDimension);
      }
      ctx.stroke();
    });
    ctx.shadowBlur = 0;
  }

  renderSeamAdjust() {
    const ctx = this.ctx;
    const state = this.app.state;
    const idx = state.activeSeamIndex;
    const img1 = state.images[idx];
    const img2 = state.images[idx + 1];
    const deltaPrev = state.tempOverlapDeltaPrev;
    const deltaNext = state.tempOverlapDeltaNext;

    // 原本为 this.app.gesture.dragState，现已合并
    const ds = this.dragState;

    let x1 = img1.logicalX, y1 = img1.logicalY;
    let x2 = img2.logicalX, y2 = img2.logicalY;

    if (state.direction === 'vertical') { y1 += deltaPrev; y2 -= deltaNext; }
    else { x1 += deltaPrev; x2 -= deltaNext; }

    let cx = 0, cy = 0;
    if (state.direction === 'vertical') {
      cy = img1.logicalY + img1.logicalH - state.overlaps[idx].prev;
    } else {
      cx = img1.logicalX + img1.logicalW - state.overlaps[idx].prev;
    }

    const isDragging = ds.active && ds.type === 'seam';

    if (isDragging) {
      const draggingImg1 = ds.activeImageIndex === idx;
      if (draggingImg1) {
        ctx.globalAlpha = 1.0; ctx.drawImage(img2.imgEl, x2, y2, img2.logicalW, img2.logicalH);
        ctx.globalAlpha = 0.5; ctx.drawImage(img1.imgEl, x1, y1, img1.logicalW, img1.logicalH);
      } else {
        ctx.globalAlpha = 1.0; ctx.drawImage(img1.imgEl, x1, y1, img1.logicalW, img1.logicalH);
        ctx.globalAlpha = 0.5; ctx.drawImage(img2.imgEl, x2, y2, img2.logicalW, img2.logicalH);
      }
      ctx.globalAlpha = 1.0;
    } else {
      ctx.save();
      ctx.beginPath();
      if (state.direction === 'vertical') {
        ctx.rect(-100000, -100000, 200000, cy + 100000);
      } else {
        ctx.rect(-100000, -100000, cx + 100000, 200000);
      }
      ctx.clip();
      ctx.drawImage(img1.imgEl, x1, y1, img1.logicalW, img1.logicalH);
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      if (state.direction === 'vertical') {
        ctx.rect(-100000, cy, 200000, 200000);
      } else {
        ctx.rect(cx, -100000, 200000, 200000);
      }
      ctx.clip();
      ctx.drawImage(img2.imgEl, x2, y2, img2.logicalW, img2.logicalH);
      ctx.restore();
    }

    ctx.strokeStyle = '#10b981'; ctx.setLineDash([5 / state.camera.zoom, 5 / state.camera.zoom]);
    ctx.lineWidth = 1.5 / state.camera.zoom; ctx.beginPath();
    if (state.direction === 'vertical') {
      ctx.moveTo(-100000, cy); ctx.lineTo(100000, cy);
    } else {
      ctx.moveTo(cx, -100000); ctx.lineTo(cx, 100000);
    }
    ctx.stroke(); ctx.setLineDash([]);
  }

  renderCropBox() {
    const ctx = this.ctx;
    const state = this.app.state;
    const { x, y, w, h } = state.cropBox;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; ctx.beginPath();
    ctx.rect(-100000, -100000, 200000, 200000);
    ctx.rect(x + w, y, -w, h); ctx.fill('evenodd');

    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2 / state.camera.zoom; ctx.strokeRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1 / state.camera.zoom; ctx.beginPath();
    ctx.moveTo(x + w / 3, y); ctx.lineTo(x + w / 3, y + h);
    ctx.moveTo(x + 2 * w / 3, y); ctx.lineTo(x + 2 * w / 3, y + h);
    ctx.moveTo(x, y + h / 3); ctx.lineTo(x + w, y + h / 3);
    ctx.moveTo(x, y + 2 * h / 3); ctx.lineTo(x + w, y + 2 * h / 3);
    ctx.stroke();

    ctx.fillStyle = '#3b82f6'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2 / state.camera.zoom;
    const hs = 8 / state.camera.zoom;
    const handles = [
      [x, y], [x + w / 2, y], [x + w, y], [x, y + h / 2], [x + w, y + h / 2],
      [x, y + h], [x + w / 2, y + h], [x + w, y + h]
    ];
    handles.forEach(([hx, hy]) => {
      ctx.beginPath(); ctx.arc(hx, hy, hs, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });
  }

  renderFrame() {
    if (this.app.state.mode === UI_MODE.STEP1) return;
    const dpr = window.devicePixelRatio || 1;
    const cw = this.canvas.width; const ch = this.canvas.height;
    const cam = this.app.state.camera;

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, cw, ch);
    this.drawGrid(cw, ch);

    this.ctx.setTransform(
      cam.zoom * dpr, 0, 0, cam.zoom * dpr,
      cw / 2 - cam.x * cam.zoom * dpr, ch / 2 - cam.y * cam.zoom * dpr
    );

    if (this.app.state.mode === UI_MODE.STEP2_GLOBAL) {
      this.renderClippedImages(this.ctx); this.renderSeamsGlobal();
    } else if (this.app.state.mode === UI_MODE.STEP2_SEAM) {
      this.renderSeamAdjust();
    } else if (this.app.state.mode === UI_MODE.STEP3_CROP) {
      this.renderClippedImages(this.ctx); this.renderCropBox();
    }
  }


  // --- 手势交互方法 ---

  screenToLogical(sx, sy) {
    const cam = this.app.state.camera;
    const cx = this.canvas.clientWidth / 2; const cy = this.canvas.clientHeight / 2;
    return { x: ((sx - cx) / cam.zoom) + cam.x, y: ((sy - cy) / cam.zoom) + cam.y };
  }

  bindEvents() {
    this.canvas.addEventListener('pointerdown', e => {
      this.canvas.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 1) this.handleSingleDown(e);
      else if (this.pointers.size === 2) this.handleDoubleDown();
    });

    this.canvas.addEventListener('pointermove', e => {
      if (!this.pointers.has(e.pointerId)) return;
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 1) this.handleSingleMove(e);
      else if (this.pointers.size === 2) this.handleDoubleMove();
    });

    const upHandler = e => {
      this.pointers.delete(e.pointerId);
      this.canvas.releasePointerCapture(e.pointerId);
      if (this.pointers.size === 0) {
        if (this.dragState.active && this.dragState.type && this.dragState.type.startsWith('crop_')) {
          this.app.centerCropBox();
        }
        this.dragState.active = false;
        this.dragState.type = null;
      } else if (this.pointers.size === 1) {
        const pt = this.pointers.get(Array.from(this.pointers.keys())[0]);
        this.handleSingleDown({ clientX: pt.x, clientY: pt.y });
      }
    };
    this.canvas.addEventListener('pointerup', upHandler);
    this.canvas.addEventListener('pointercancel', upHandler);

    window.addEventListener('keydown', e => { if (e.code === 'Space') this.isSpaceDown = true; });
    window.addEventListener('keyup', e => { if (e.code === 'Space') this.isSpaceDown = false; });

    this.canvas.addEventListener('wheel', e => {
      if (this.app.state.mode === UI_MODE.STEP1) return;
      e.preventDefault();
      const pt = this.screenToLogical(e.clientX, e.clientY);
      const cam = this.app.state.camera;
      let newZoom = Math.max(0.05, Math.min(10, cam.zoom * Math.exp(-e.deltaY * 0.001)));
      cam.x = pt.x - (e.clientX - this.canvas.clientWidth / 2) / newZoom;
      cam.y = pt.y - (e.clientY - this.canvas.clientHeight / 2) / newZoom;
      cam.zoom = newZoom;
    }, { passive: false });
  }

  handleSingleDown(e) {
    const state = this.app.state;
    const logical = this.screenToLogical(e.clientX, e.clientY);
    this.dragState = {
      active: true, startX: e.clientX, startY: e.clientY,
      startLogicalX: logical.x, startLogicalY: logical.y,
      startCamX: state.camera.x, startCamY: state.camera.y,
      startCrop: { ...state.cropBox },
      startTempPrev: state.tempOverlapDeltaPrev,
      startTempNext: state.tempOverlapDeltaNext
    };

    if (this.isSpaceDown) { this.dragState.type = 'pan'; return; }

    if (state.mode === UI_MODE.STEP2_GLOBAL) {
      const threshold = 20 / state.camera.zoom;
      for (let i = 0; i < state.overlaps.length; i++) {
        const img = state.images[i];
        let seamV = state.direction === 'vertical' ?
          img.logicalY + img.logicalH - state.overlaps[i].prev : img.logicalX + img.logicalW - state.overlaps[i].prev;
        let hit = state.direction === 'vertical' ?
          (Math.abs(logical.y - seamV) < threshold && logical.x > 0 && logical.x < state.baseDimension) :
          (Math.abs(logical.x - seamV) < threshold && logical.y > 0 && logical.y < state.baseDimension);

        if (hit) return this.app.startSeamAdjust(i);
      }
      this.dragState.type = 'pan';
    }
    else if (state.mode === UI_MODE.STEP2_SEAM) {
      const img = state.images[state.activeSeamIndex];
      const seamVal = state.direction === 'vertical' ?
        img.logicalY + img.logicalH - state.overlaps[state.activeSeamIndex].prev : img.logicalX + img.logicalW - state.overlaps[state.activeSeamIndex].prev;
      this.dragState.type = 'seam';
      const isFirst = state.direction === 'vertical' ? (logical.y < seamVal) : (logical.x < seamVal);
      this.dragState.activeImageIndex = isFirst ? state.activeSeamIndex : state.activeSeamIndex + 1;
    }
    else if (state.mode === UI_MODE.STEP3_CROP) {
      const hr = 15 / state.camera.zoom;
      const { x, y, w, h } = state.cropBox;
      const pts = [
        { type: 'crop_nw', px: x, py: y }, { type: 'crop_n', px: x + w / 2, py: y }, { type: 'crop_ne', px: x + w, py: y },
        { type: 'crop_w', px: x, py: y + h / 2 }, { type: 'crop_e', px: x + w, py: y + h / 2 },
        { type: 'crop_sw', px: x, py: y + h }, { type: 'crop_s', px: x + w / 2, py: y + h }, { type: 'crop_se', px: x + w, py: y + h }
      ];
      for (const p of pts) if (Math.hypot(logical.x - p.px, logical.y - p.py) < hr) return this.dragState.type = p.type;
      this.dragState.type = 'pan';
    }
  }

  handleSingleMove(e) {
    if (!this.dragState.active) return;
    const ds = this.dragState;
    const state = this.app.state;

    if (ds.type === 'pan') {
      state.camera.x = ds.startCamX - (e.clientX - ds.startX) / state.camera.zoom;
      state.camera.y = ds.startCamY - (e.clientY - ds.startY) / state.camera.zoom;
    } else if (ds.type === 'seam') {
      const logical = this.screenToLogical(e.clientX, e.clientY);
      const deltaLogic = state.direction === 'vertical' ? logical.y - ds.startLogicalY : logical.x - ds.startLogicalX;

      if (state.seamMode === 'symmetric') {
        const amt = ds.activeImageIndex === state.activeSeamIndex ? deltaLogic : -deltaLogic;
        state.tempOverlapDeltaPrev = ds.startTempPrev + amt;
        state.tempOverlapDeltaNext = ds.startTempNext + amt;
      } else {
        if (ds.activeImageIndex === state.activeSeamIndex) {
          state.tempOverlapDeltaPrev = ds.startTempPrev + deltaLogic;
          state.tempOverlapDeltaNext = ds.startTempNext;
        } else {
          state.tempOverlapDeltaPrev = ds.startTempPrev;
          state.tempOverlapDeltaNext = ds.startTempNext - deltaLogic;
        }
      }
    } else if (ds.type && ds.type.startsWith('crop_')) {
      const logical = this.screenToLogical(e.clientX, e.clientY);
      const dx = logical.x - ds.startLogicalX; const dy = logical.y - ds.startLogicalY;
      let { x, y, w, h } = ds.startCrop;
      
      const bounds = state.totalBounds;

      if (ds.type.includes('n')) { y += dy; h -= dy; }
      if (ds.type.includes('s')) { h += dy; }
      if (ds.type.includes('w')) { x += dx; w -= dx; }
      if (ds.type.includes('e')) { w += dx; }

      const minSize = 10 / state.camera.zoom;
      if (w < minSize) { w = minSize; x = state.cropBox.x; }
      if (h < minSize) { h = minSize; y = state.cropBox.y; }

      if (x < 0) { w += x; x = 0; }
      if (y < 0) { h += y; y = 0; }
      if (x + w > bounds.w) { w = bounds.w - x; }
      if (y + h > bounds.h) { h = bounds.h - y; }

      w = Math.max(minSize, w);
      h = Math.max(minSize, h);

      state.cropBox = { x, y, w, h };
    }
  }

  handleDoubleDown() {
    const pts = Array.from(this.pointers.values());
    this.dragState = {
      ...this.dragState, active: true, type: 'pan_zoom',
      lastCenter: { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 },
      lastDist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
      startCamX: this.app.state.camera.x, startCamY: this.app.state.camera.y
    };
  }

  handleDoubleMove() {
    if (this.dragState.type !== 'pan_zoom') return;
    const pts = Array.from(this.pointers.values());
    const center = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
    const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    const ds = this.dragState; const state = this.app.state;

    state.camera.x -= (center.x - ds.lastCenter.x) / state.camera.zoom;
    state.camera.y -= (center.y - ds.lastCenter.y) / state.camera.zoom;
    ds.lastCenter = center;

    if (ds.lastDist > 0) {
      const newZoom = Math.max(0.05, Math.min(10, state.camera.zoom * (dist / ds.lastDist)));
      const logicalCenter = this.screenToLogical(center.x, center.y);
      state.camera.zoom = newZoom;
      const newLogicalCenter = this.screenToLogical(center.x, center.y);
      state.camera.x -= (newLogicalCenter.x - logicalCenter.x);
      state.camera.y -= (newLogicalCenter.y - logicalCenter.y);
    }
    ds.lastDist = dist;
  }
}