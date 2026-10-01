// Full-bleed photographic header for a place (a state or a district): breadcrumb trail, title,
// short lead, the place's numbers along the bottom, and an optional card beside them (`aside`).
// Styles: .epg-hero* in assets/css/components/epm-gallery-common.css.
//
//   render(el, galleryHeroHtml({ image, crumbs, eyebrow, title, lead, stats, aside }));
//   initGalleryHero(el, { onImageError });       // fade-in + optional image fallback
//   // numbers that arrive later: render(el.querySelector('.epg-hero-foot'), galleryHeroFootHtml({ stats, aside }))
import { html } from '../core/dom.js';
import { fadeImage, initFadeImages } from './fade-image.js';
import { crumbsHtml, statsHtml } from './gallery-primitives.js';

// The content of .epg-hero-foot: the stats list, then the aside card.
export function galleryHeroFootHtml({ stats, aside }) {
  return html`${stats && statsHtml({ items: stats, light: true })}${aside}`;
}

// crumbs: see crumbsHtml; stats: [{ label, value }] with falsy entries skipped; aside: html``.
export function galleryHeroHtml({ image, crumbs, eyebrow, title, lead, stats, aside }) {
  return html`
    <header class="epg-hero epg-container">
      <div class="epg-hero-frame">
        <div class="epg-hero-media" aria-hidden="true">
          ${image && fadeImage({ src: image, alt: '', className: 'epg-hero-img', attrs: 'fetchpriority="high"' })}
        </div>
        <div class="epg-hero-inner">
          ${crumbsHtml({ items: crumbs, light: true })}
          <div class="epg-hero-copy">
            ${eyebrow && html`<span class="epg-eyebrow is-light">${eyebrow}</span>`}
            <h1 class="epg-hero-title">${title}</h1>
            ${lead && html`<p class="epg-hero-lead">${lead}</p>`}
          </div>
          ${(stats || aside) && html`<div class="epg-hero-foot">${galleryHeroFootHtml({ stats, aside })}</div>`}
        </div>
      </div>
    </header>`;
}

export function galleryHeroSkeletonHtml() {
  return html`
    <div class="epg-hero epg-container" aria-hidden="true">
      <div class="epg-hero-frame epg-skeleton"></div>
    </div>`;
}

// Fades the hero photo in once loaded. onImageError(img) runs if the photo fails to load (the
// district page swaps in a fallback banner there).
export function initGalleryHero(root, { onImageError } = {}) {
  const img = root.querySelector('.epg-hero-img');
  if (img && onImageError) img.addEventListener('error', () => onImageError(img));
  initFadeImages(root);
}
