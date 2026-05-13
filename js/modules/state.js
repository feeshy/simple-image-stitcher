export const UI_MODE = {
  STEP1: 'step1',
  STEP2_GLOBAL: 'step2_global',
  STEP2_SEAM: 'step2_seam',
  STEP3_CROP: 'step3_crop'
};

export class StateModule {
  constructor() {
    this.mode = UI_MODE.STEP1;
    this.direction = 'vertical';
    this.images = [];
    this.overlaps = [];
    this.camera = { x: 0, y: 0, zoom: 1 };
    this.baseDimension = 0;
    this.totalBounds = { w: 0, h: 0 };
    this.activeSeamIndex = -1;
    this.tempOverlapDeltaPrev = 0;
    this.tempOverlapDeltaNext = 0;
    this.seamMode = 'independent';
    this.cropBox = { x: 0, y: 0, w: 0, h: 0 };
  }

  calculateBaseLayout() {
    if (this.images.length === 0) return;
    if (this.direction === 'vertical') {
      this.baseDimension = this.images[0].naturalW;
      this.images.forEach(img => {
        img.scale = this.baseDimension / img.naturalW;
        img.logicalW = this.baseDimension;
        img.logicalH = img.naturalH * img.scale;
      });
    } else {
      this.baseDimension = this.images[0].naturalH;
      this.images.forEach(img => {
        img.scale = this.baseDimension / img.naturalH;
        img.logicalH = this.baseDimension;
        img.logicalW = img.naturalW * img.scale;
      });
    }
  }

  updateLayoutPositions() {
    let currentPos = 0;
    let maxCross = this.baseDimension;
    for (let i = 0; i < this.images.length; i++) {
      const img = this.images[i];
      if (this.direction === 'vertical') {
        img.logicalX = 0; img.logicalY = currentPos;
        currentPos += img.logicalH;
      } else {
        img.logicalY = 0; img.logicalX = currentPos;
        currentPos += img.logicalW;
      }
      if (i < this.overlaps.length) currentPos -= (this.overlaps[i].prev + this.overlaps[i].next);
    }
    this.totalBounds = {
      w: this.direction === 'vertical' ? maxCross : currentPos,
      h: this.direction === 'vertical' ? currentPos : maxCross
    };
  }
}