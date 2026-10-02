// <img> that stays invisible until it has loaded, then fades in - so a card's placeholder gradient
// shows while the photo downloads instead of a half-painted image. Needs assets/css/components/fade-image.css.
//
//   html`${fadeImage({ src, alt: 'x', className: 'card-photo', attrs: 'loading="lazy"' })}`
//   ... then, after the markup is in the page: initFadeImages(container)
(function () {
  'use strict';

  const { html, raw } = FW.require('core/dom');

  function fadeImage({ src, alt = '', className = '', attrs = '' } = {}) {
    return html`<img class="fade-img ${className}" src="${src}" alt="${alt}" ${raw(attrs)} />`;
  }

  // Marks every .fade-img under root as loaded once it has loaded (or straight away when it was
  // already cached). Safe to call again after re-rendering.
  function initFadeImages(root = document) {
    root.querySelectorAll('img.fade-img:not(.is-loaded)').forEach((img) => {
      if (img.complete && img.naturalWidth > 0) {
        img.classList.add('is-loaded');
      } else if (!img.dataset.fadeBound) {
        img.dataset.fadeBound = '1';
        img.addEventListener('load', () => img.classList.add('is-loaded'), { once: true });
      }
    });
  }

  FW.define('components/fade-image', { fadeImage, initFadeImages });
})();
