// The EPM page's photo carousel: a centre photo flanked by two smaller ones, moving on its own
// every 1.8s (paused while hovered), with arrows, swipe and a "01 / 08" counter.
//
// The photos are repeated four times in a row and the position (`index`) starts in the middle copy,
// so the strip can keep moving one way forever: whenever it drifts into the first or last copy it
// is quietly jumped back by one copy with transitions switched off, which looks identical.
// Slides are built once per photo set and then only restyled, so their CSS transitions run.
import { html, cx, render } from '../../core/dom.js';
import { icon } from '../../core/icons.js';

const AUTO_SCROLL_MS = 1800;
const RESET_DELAY_MS = 850;
const MIN_SWIPE_DISTANCE = 50;
const SLIDE_TRANSITION = 'transform 0.8s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.8s ease';

// A flat look, not overlapping 3D: diff 0 is the centre, -1 / 1 sit left / right, the rest are
// parked out of view.
function slideLayout(diff) {
  if (diff === 0) return { translateX: 0, scale: 1, zIndex: 5, opacity: 1, isCenter: true };
  if (diff === -1) return { translateX: -95, scale: 0.75, zIndex: 4, opacity: 1, isCenter: false };
  if (diff === 1) return { translateX: 95, scale: 0.75, zIndex: 4, opacity: 1, isCenter: false };
  if (diff === -2) return { translateX: -170, scale: 0.6, zIndex: 3, opacity: 0, isCenter: false };
  if (diff === 2) return { translateX: 170, scale: 0.6, zIndex: 3, opacity: 0, isCenter: false };
  return { translateX: diff < 0 ? -200 : 200, scale: 0.5, zIndex: 1, opacity: 0, isCenter: false };
}

const slideStyle = (layout, transition) => `transform: translateX(${layout.translateX}%) scale(${layout.scale}); `
  + `z-index: ${layout.zIndex}; opacity: ${layout.opacity}; transition: ${transition ? SLIDE_TRANSITION : 'none'}; `
  + `pointer-events: ${layout.isCenter ? 'auto' : 'none'};`;

const pad2 = (n) => String(n).padStart(2, '0');

export function createGalleryCarousel(container) {
  const state = { images: [], index: 0, transition: true, hovered: false };
  let resetTimer = null;

  const count = () => state.images.length;
  const activeIdx = () => (count() > 0 ? ((state.index % count()) + count()) % count() : 0);

  function slidesHtml() {
    const images = state.images;
    const extended = [...images, ...images, ...images, ...images];
    return html`
      <span class="epm-gallery-counter">${pad2(activeIdx() + 1)} / ${pad2(count())}</span>
      <button class="epm-gallery-arrow left" data-action="gallery-prev" aria-label="Previous image">${icon('chevron-left', { size: 20 })}</button>
      <button class="epm-gallery-arrow right" data-action="gallery-next" aria-label="Next image">${icon('chevron-right', { size: 20 })}</button>
      ${extended.map((src, index) => {
        const layout = slideLayout(index - state.index);
        return html`
          <div class="${cx('epm-gallery-slide-flat', layout.isCenter && 'is-center')}" style="${slideStyle(layout, state.transition)}">
            <div class="epm-gallery-img-wrapper">
              <img src="${src}" alt="EPM Event ${index}" />
            </div>
            <div class="epm-gallery-pagination">
              ${images.map((_, dotIdx) => html`<div class="${cx('epm-gallery-dot', dotIdx === state.index % count() && 'active')}"></div>`)}
            </div>
          </div>`;
      })}`;
  }

  // Everything after the decorative glow: the empty message, or the counter/arrows/slides.
  function drawStructure() {
    container.querySelectorAll(':scope > :not(.epm-gallery-glow)').forEach((node) => node.remove());
    const holder = document.createElement('div');
    render(holder, count() === 0
      ? html`<p style="color: #64748b; text-align: center; width: 100%;">Photos from Export Promotional Meetings will appear here once they're added.</p>`
      : slidesHtml());
    container.append(...holder.childNodes);
  }

  // Restyles the existing slides for the current index/transition (no rebuild).
  function update() {
    if (count() === 0) return;
    const counter = container.querySelector('.epm-gallery-counter');
    if (counter) counter.textContent = `${pad2(activeIdx() + 1)} / ${pad2(count())}`;
    const activeDot = state.index % count();
    container.querySelectorAll('.epm-gallery-slide-flat').forEach((slide, index) => {
      const layout = slideLayout(index - state.index);
      slide.style.transform = `translateX(${layout.translateX}%) scale(${layout.scale})`;
      slide.style.zIndex = String(layout.zIndex);
      slide.style.opacity = String(layout.opacity);
      slide.style.transition = state.transition ? SLIDE_TRANSITION : 'none';
      slide.style.pointerEvents = layout.isCenter ? 'auto' : 'none';
      slide.classList.toggle('is-center', layout.isCenter);
      slide.querySelectorAll('.epm-gallery-dot').forEach((dot, dotIdx) => dot.classList.toggle('active', dotIdx === activeDot));
    });
  }

  // The invisible reset: once the strip has drifted into the first or last copy, jump it back by
  // one copy without a transition. Re-armed every time the index (or the photo set) changes.
  function scheduleReset() {
    clearTimeout(resetTimer);
    resetTimer = null;
    const length = count();
    let shift = 0;
    if (state.index <= length) shift = length;
    else if (state.index >= length * 3) shift = -length;
    else return;
    resetTimer = setTimeout(() => {
      set({ transition: false });
      requestAnimationFrame(() => set({ index: state.index + shift }));
    }, RESET_DELAY_MS);
  }

  function set({ index, transition }) {
    const indexChanged = index !== undefined && index !== state.index;
    const transitionChanged = transition !== undefined && transition !== state.transition;
    if (!indexChanged && !transitionChanged) return;
    if (indexChanged) state.index = index;
    if (transitionChanged) state.transition = transition;
    update();
    if (indexChanged) scheduleReset();
  }

  const move = (step) => set({ transition: true, index: state.index + step });

  // Auto-scroll runs from the start (like the page it came from), pausing while hovered.
  setInterval(() => {
    if (!state.hovered) move(-1);
  }, AUTO_SCROLL_MS);
  scheduleReset();

  container.addEventListener('mouseenter', () => { state.hovered = true; });
  container.addEventListener('mouseleave', () => { state.hovered = false; });
  container.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button || !container.contains(button)) return;
    if (button.dataset.action === 'gallery-prev') move(-1);
    if (button.dataset.action === 'gallery-next') move(1);
  });

  // Swipe left brings in the photo on the right (index + 1), swipe right the one on the left.
  let touchStart = null;
  let touchEnd = null;
  container.addEventListener('touchstart', (event) => {
    touchEnd = null;
    touchStart = event.targetTouches[0].clientX;
  }, { passive: true });
  container.addEventListener('touchmove', (event) => {
    touchEnd = event.targetTouches[0].clientX;
  }, { passive: true });
  container.addEventListener('touchend', () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > MIN_SWIPE_DISTANCE) move(1);
    if (distance < -MIN_SWIPE_DISTANCE) move(-1);
  });

  return {
    setImages(urls) {
      const lengthChanged = urls.length !== state.images.length;
      state.images = urls;
      drawStructure();
      if (!lengthChanged) return;
      scheduleReset();
      if (urls.length > 0) {
        // Commit the slides at the current position first (forcing a style pass), so moving to
        // the middle copy below animates exactly like the original's post-render effect did.
        void container.offsetWidth;
        set({ index: urls.length * 2 });
      }
    },
  };
}
