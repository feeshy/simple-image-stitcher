export class LoaderModule {
  constructor(app) {
    this.app = app;
    this.grid = document.getElementById('image-grid');
    this.emptyState = document.getElementById('empty-state');
    this.btnNext = document.getElementById('btn-next-1');
    this.btnClear = document.getElementById('btn-clear-all');
  }

  handleFiles(files) {
    const validFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (validFiles.length === 0) return;

    let loadedCount = 0;
    validFiles.forEach(file => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        this.app.state.images.push({
          id: Math.random().toString(36).substr(2, 9),
          file, url, imgEl: img,
          naturalW: img.naturalWidth, naturalH: img.naturalHeight
        });
        loadedCount++;
        if (loadedCount === validFiles.length) this.renderThumbnails();
      };
      img.src = url;
    });
  }

  removeImage(index) {
    URL.revokeObjectURL(this.app.state.images[index].url);
    this.app.state.images.splice(index, 1);
    this.renderThumbnails();
  }

  renderThumbnails() {
    this.grid.innerHTML = '';
    const images = this.app.state.images;

    if (images.length > 0) {
      this.grid.classList.remove('hidden');
      this.emptyState.classList.add('hidden');
    } else {
      this.grid.classList.add('hidden');
      this.emptyState.classList.remove('hidden');
    }

    images.forEach((imgObj, index) => {
      const div = document.createElement('div');
      div.className = 'thumbnail-container';
      div.draggable = true;
      div.dataset.index = index;

      div.innerHTML = `
        <img src="${imgObj.url}" class="thumbnail-img">
        <div class="delete-btn" title="${this.app.i18n.t('delete')}">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </div>
      `;

      div.querySelector('.delete-btn').onclick = (e) => { e.stopPropagation(); this.removeImage(index); };

      div.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', div.dataset.index);
        setTimeout(() => div.style.opacity = '0.5', 0);
      });
      div.addEventListener('dragend', () => div.style.opacity = '1');
      div.addEventListener('dragover', e => { e.preventDefault(); div.classList.add('drag-over'); });
      div.addEventListener('dragleave', () => div.classList.remove('drag-over'));
      div.addEventListener('drop', e => {
        e.preventDefault();
        e.stopPropagation();
        div.classList.remove('drag-over');

        const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
        const targetIndex = parseInt(div.dataset.index);

        if (dragIndex !== targetIndex && !isNaN(dragIndex) && !isNaN(targetIndex)) {
          const [draggedImg] = images.splice(dragIndex, 1);
          images.splice(targetIndex, 0, draggedImg);
          this.renderThumbnails();
        }
      });

      div.addEventListener('touchstart', e => {
        if (e.target.closest('.delete-btn')) return;
        const touch = e.touches[0];
        const rect = div.getBoundingClientRect();
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        this.touchOffsetX = touch.clientX - rect.left;
        this.touchOffsetY = touch.clientY - rect.top;
        this.touchDragDiv = div;
        this.touchDragIndex = index;
        this.isTouchDragging = false;

        if (this.touchClone) {
          this.touchClone.remove();
          this.touchClone = null;
        }
      }, { passive: true });

      div.addEventListener('touchmove', e => {
        if (!this.touchDragDiv) return;
        const touch = e.touches[0];

        if (!this.isTouchDragging) {
          if (Math.hypot(touch.clientX - this.touchStartX, touch.clientY - this.touchStartY) > 10) {
            this.isTouchDragging = true;

            this.touchClone = div.cloneNode(true);
            const rect = div.getBoundingClientRect();
            this.touchClone.style.position = 'fixed';
            this.touchClone.style.zIndex = '9999';
            this.touchClone.style.pointerEvents = 'none';
            this.touchClone.style.opacity = '0.9';
            this.touchClone.style.transform = 'scale(1.05)';
            this.touchClone.style.margin = '0';
            this.touchClone.style.width = rect.width + 'px';
            this.touchClone.style.height = rect.height + 'px';
            this.touchClone.style.left = (touch.clientX - this.touchOffsetX) + 'px';
            this.touchClone.style.top = (touch.clientY - this.touchOffsetY) + 'px';

            const delBtn = this.touchClone.querySelector('.delete-btn');
            if (delBtn) delBtn.style.display = 'none';

            document.body.appendChild(this.touchClone);
            div.style.opacity = '0.3';
          }
        }

        if (this.isTouchDragging) {
          if (e.cancelable) e.preventDefault();

          this.touchClone.style.left = (touch.clientX - this.touchOffsetX) + 'px';
          this.touchClone.style.top = (touch.clientY - this.touchOffsetY) + 'px';

          const elUnder = document.elementFromPoint(touch.clientX, touch.clientY);
          const targetContainer = elUnder ? elUnder.closest('.thumbnail-container') : null;

          if (this.touchTargetDiv && this.touchTargetDiv !== targetContainer) {
            this.touchTargetDiv.classList.remove('drag-over');
          }

          if (targetContainer && targetContainer !== this.touchDragDiv) {
            targetContainer.classList.add('drag-over');
            this.touchTargetDiv = targetContainer;
          } else {
            this.touchTargetDiv = null;
          }
        }
      }, { passive: false });

      const endTouchDrag = () => {
        if (!this.touchDragDiv) return;
        if (this.isTouchDragging) {
          if (this.touchClone) {
            this.touchClone.remove();
            this.touchClone = null;
          }
          this.touchDragDiv.style.opacity = '1';

          if (this.touchTargetDiv) {
            this.touchTargetDiv.classList.remove('drag-over');
            const targetIndex = parseInt(this.touchTargetDiv.dataset.index);

            if (this.touchDragIndex !== targetIndex && !isNaN(this.touchDragIndex) && !isNaN(targetIndex)) {
              const imagesList = this.app.state.images;
              const [draggedImg] = imagesList.splice(this.touchDragIndex, 1);
              imagesList.splice(targetIndex, 0, draggedImg);
              this.renderThumbnails();
            }
            this.touchTargetDiv = null;
          }
        }
        this.touchDragDiv = null;
        this.isTouchDragging = false;
      };

      div.addEventListener('touchend', endTouchDrag);
      div.addEventListener('touchcancel', endTouchDrag);

      this.grid.appendChild(div);
    });

    const hasImages = images.length > 0;
    this.btnClear.disabled = !hasImages;
    this.btnClear.classList.toggle('opacity-50', !hasImages);
    this.btnClear.classList.toggle('cursor-not-allowed', !hasImages);

    const canProceed = images.length >= 2;
    this.btnNext.disabled = !canProceed;
    this.btnNext.classList.toggle('opacity-50', !canProceed);
    this.btnNext.classList.toggle('cursor-not-allowed', !canProceed);
  }
}