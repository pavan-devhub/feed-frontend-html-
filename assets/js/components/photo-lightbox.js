// Full-screen photo viewer, appended to <body>. Styles: assets/css/components/photo-lightbox.css.
//
//   const viewer = openPhotoLightbox({ photos, index: 2, title: 'Guntur', subtitle: 'Andhra Pradesh', onClose });
//   viewer.close();
//
// `photos` is [{ id, src, alt?, caption? }]; `index` is the photo to open on. `title`/`subtitle` head
// the viewer. Arrow keys / swipe / thumbnails move between photos (Home/End jump to the ends), Esc or
// a click outside the photo closes it. While open it locks page scrolling, keeps keyboard focus
// inside, and hands focus back to whatever opened it when it closes.
(function () {
  'use strict';

  const { html, render, toElement } = FW.require('core/dom');
  const { icon } = FW.require('core/icons');

  const SWIPE_THRESHOLD = 50;
  const pad2 = (n) => String(n).padStart(2, '0');

  function openPhotoLightbox({
    photos = [], index, title, subtitle, onIndexChange, onClose,
  } = {}) {
    const closed = { close() {}, setIndex() {}, isOpen: false };
    if (index === null || index === undefined || photos[index] === undefined) return closed;

    const heading = [title, subtitle].filter(Boolean).join(', ');
    const multiple = photos.length > 1;
    let current = index;
    let loadedSrc = null;
    let swipeStartX = null;
    let img = null;
    let spinner = null;
    let caption = null;
    let open = true;
    // Restored on close: whatever had focus when the viewer opened, and the page's own overflow.
    const opener = document.activeElement;
    const previousOverflow = document.body.style.overflow;

    const overlay = toElement(html`
    <div class="pl-overlay" role="dialog" aria-modal="true"
      aria-label="${heading ? `${heading} photo viewer` : 'Photo viewer'}">
      <div class="pl-top">
        <div class="pl-heading">
          ${title && html`<span class="pl-title">${title}</span>`}
          ${subtitle && html`<span class="pl-subtitle">${subtitle}</span>`}
        </div>
        <div class="pl-counter" aria-live="polite">
          <span></span>
          <span class="pl-progress" aria-hidden="true"><span></span></span>
        </div>
        <button type="button" class="pl-btn pl-close" aria-label="Close viewer">${icon('x', { size: 20 })}</button>
      </div>

      <div class="pl-stage">
        ${multiple && html`
          <button type="button" class="pl-btn pl-nav pl-prev" aria-label="Previous photo">${icon('chevron-left', { size: 24 })}</button>`}
        ${multiple && html`
          <button type="button" class="pl-btn pl-nav pl-next" aria-label="Next photo">${icon('chevron-right', { size: 24 })}</button>`}
      </div>

      ${multiple && html`
        <div class="pl-thumbs">
          ${photos.map((p, i) => html`
            <button type="button" class="pl-thumb" aria-current="false" aria-label="${`Show photo ${i + 1}`}"><img src="${p.src}" alt="" loading="lazy" draggable="false" /></button>`)}
        </div>`}
    </div>`);

    const counterText = overlay.querySelector('.pl-counter > span:first-child');
    const progressBar = overlay.querySelector('.pl-progress > span');
    const closeBtn = overlay.querySelector('.pl-close');
    const stage = overlay.querySelector('.pl-stage');
    const nextBtn = overlay.querySelector('.pl-next');
    const thumbs = overlay.querySelector('.pl-thumbs');
    const thumbButtons = thumbs ? Array.from(thumbs.querySelectorAll('.pl-thumb')) : [];

    // Brings the open photo's parts up to date; elements that don't change (the thumbnails strip,
    // the buttons) stay in place so focus and scroll positions survive.
    const draw = () => {
      const photo = photos[current];
      const loaded = loadedSrc === photo.src;

      render(counterText, html`<strong>${pad2(current + 1)}</strong> / ${pad2(photos.length)}`);
      progressBar.style.transform = `scaleX(${(current + 1) / photos.length})`;

      // A new photo gets a new <img> (hidden until it has loaded, with the spinner showing meanwhile).
      if (!img || img.getAttribute('src') !== photo.src) {
        if (img) img.remove();
        const el = document.createElement('img');
        el.className = 'pl-img';
        el.draggable = false;
        el.addEventListener('load', () => {
          if (img !== el) return;
          loadedSrc = photo.src;
          draw();
        });
        el.setAttribute('src', photo.src);
        stage.insertBefore(el, nextBtn);
        img = el;
      }
      img.className = `pl-img${loaded ? ' is-loaded' : ''}`;
      img.alt = photo.alt || `${heading || 'Gallery'} photo ${current + 1} of ${photos.length}`;

      if (!loaded && !spinner) {
        spinner = toElement(html`<span class="pl-spinner" aria-hidden="true"></span>`);
        stage.insertBefore(spinner, img);
      } else if (loaded && spinner) {
        spinner.remove();
        spinner = null;
      }

      if (photo.caption) {
        if (!caption) {
          caption = toElement(html`<p class="pl-caption"></p>`);
          stage.after(caption);
        }
        caption.textContent = photo.caption;
      } else if (caption) {
        caption.remove();
        caption = null;
      }

      thumbButtons.forEach((button, i) => {
        button.classList.toggle('is-active', i === current);
        button.setAttribute('aria-current', String(i === current));
      });
    };

    // Warm the cache for the neighbours so next/previous feels instant.
    const preloadNeighbours = () => {
      [current - 1, current + 1].forEach((i) => {
        const photo = photos[(i + photos.length) % photos.length];
        if (photo) new Image().src = photo.src;
      });
    };

    // Keep the active thumbnail in view.
    const scrollThumbIntoView = () => {
      const active = thumbs?.querySelector('[aria-current="true"]');
      active?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    };

    const setIndex = (next) => {
      if (!open || next === current || photos[next] === undefined) return;
      current = next;
      draw();
      preloadNeighbours();
      scrollThumbIntoView();
      if (onIndexChange) onIndexChange(current);
    };

    const go = (delta) => setIndex((current + delta + photos.length) % photos.length);

    const onKeyDown = (e) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'Home') setIndex(0);
      else if (e.key === 'End') setIndex(photos.length - 1);
      else if (e.key === 'Tab') {
        // keep keyboard focus inside the viewer while it is open
        const focusable = overlay.querySelectorAll('button');
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    closeBtn.addEventListener('click', () => close());
    overlay.querySelector('.pl-prev')?.addEventListener('click', () => go(-1));
    nextBtn?.addEventListener('click', () => go(1));
    thumbButtons.forEach((button, i) => button.addEventListener('click', () => setIndex(i)));

    stage.addEventListener('click', (e) => {
      if (e.target === stage) close();
    });
    stage.addEventListener('pointerdown', (e) => {
      swipeStartX = e.clientX;
    });
    stage.addEventListener('pointerup', (e) => {
      if (swipeStartX === null) return;
      const dx = e.clientX - swipeStartX;
      swipeStartX = null;
      if (Math.abs(dx) > SWIPE_THRESHOLD) go(dx < 0 ? 1 : -1);
    });
    stage.addEventListener('pointercancel', () => {
      swipeStartX = null;
    });

    function close() {
      if (!open) return;
      open = false;
      window.removeEventListener('keydown', onKeyDown);
      overlay.remove();
      document.body.style.overflow = previousOverflow;
      if (opener instanceof HTMLElement) opener.focus({ preventScroll: true });
      if (onClose) onClose();
    }

    draw();
    document.body.appendChild(overlay);

    // Scroll lock + keyboard, with focus on the close button.
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
    window.addEventListener('keydown', onKeyDown);
    preloadNeighbours();
    scrollThumbIntoView();

    return {
      close,
      setIndex,
      get isOpen() {
        return open;
      },
      get index() {
        return current;
      },
    };
  }

  FW.define('components/photo-lightbox', { openPhotoLightbox });
})();
