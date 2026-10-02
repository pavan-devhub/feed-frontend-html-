// An art-directed photo grid (the EPM gallery's theme panels and district albums).
// Styles: assets/css/components/editorial-grid.css (needs fade-image.css + epm-gallery-common.css).
//
//   render(el, editorialGridHtml({ photos, label: 'Guntur photograph' }));
//   initReveal(el); initFadeImages(el);
//   onEditorialGridOpen(el, (index) => openViewer(index));   // once - a delegated listener
(function () {
  'use strict';

  const { html } = FW.require('core/dom');
  const { icon } = FW.require('core/icons');
  const { fadeImage } = FW.require('components/fade-image');
  const { revealClass } = FW.require('components/reveal');
  const { pad2 } = FW.require('components/gallery-utils');

  // Rows of three cycle through these compositions and rows of two alternate their wide side, so a
  // long album keeps changing rhythm instead of repeating one grid.
  const TRIO_LAYOUTS = ['feature-left', 'trio', 'feature-right', 'trio'];
  const DUO_LAYOUTS = ['duo-left', 'duo-right'];

  // Splits `count` photos into rows of 3 and 2 - never a lone photo on a row unless the whole album
  // is one photo (4 left over becomes 2 + 2) - and gives each row its layout.
  function planRows(count) {
    if (count <= 0) return [];
    if (count === 1) return [{ start: 0, size: 1, layout: 'single' }];
    const rows = [];
    let start = 0;
    let trios = 0;
    let duos = 0;
    while (start < count) {
      const left = count - start;
      const size = left === 2 || left === 4 ? 2 : 3;
      const layout = size === 3
        ? TRIO_LAYOUTS[trios++ % TRIO_LAYOUTS.length]
        : DUO_LAYOUTS[duos++ % DUO_LAYOUTS.length];
      rows.push({ start, size, layout });
      start += size;
    }
    return rows;
  }

  // photos: [{ id, src, ratio? }]. `label` names a photo for screen readers, e.g. "Guntur photograph"
  // -> "View Guntur photograph 3 of 7". Each row is a reveal (see reveal.js) - call initReveal().
  function editorialGridHtml({ photos, label = 'photo' }) {
    const rows = planRows(photos.length);
    return html`
    <div class="epg-mosaic">
      ${rows.map((row) => html`
        <div class="${revealClass(`epg-mosaic-row is-${row.layout}`)}">
          ${photos.slice(row.start, row.start + row.size).map((photo, k) => {
              const i = row.start + k;
              return html`
              <button type="button" class="epg-tile"${row.layout === 'single' && photo.ratio ? html` style="--epg-ratio: ${photo.ratio};"` : ''}
                aria-label="${`View ${label} ${i + 1} of ${photos.length}`}">${fadeImage({
                    src: photo.src,
                    alt: '',
                    className: 'epg-tile-img',
                    attrs: i < 3 ? 'loading="eager" decoding="async"' : 'loading="lazy" decoding="async"',
                  })}<span class="epg-tile-meta" aria-hidden="true"><span class="epg-tile-num">${pad2(i + 1)}</span><span class="epg-tile-zoom">${icon('maximize-2', { size: 16 })}</span></span></button>`;
            })}
        </div>`)}
    </div>`;
  }

  function editorialGridSkeletonHtml() {
    return html`
    <div class="epg-mosaic" aria-hidden="true">
      <div class="epg-mosaic-row is-feature-left">
        <span class="epg-tile epg-skeleton"></span>
        <span class="epg-tile epg-skeleton"></span>
        <span class="epg-tile epg-skeleton"></span>
      </div>
    </div>`;
  }

  // Calls handler(index) when a photo tile under root is clicked (index = its place in the grid).
  function onEditorialGridOpen(root, handler) {
    root.addEventListener('click', (event) => {
      const tile = event.target.closest('button.epg-tile');
      if (!tile || !root.contains(tile)) return;
      const mosaic = tile.closest('.epg-mosaic');
      const index = Array.from(mosaic.querySelectorAll('button.epg-tile')).indexOf(tile);
      if (index !== -1) handler(index);
    });
  }

  FW.define('components/editorial-grid', {
    editorialGridHtml,
    editorialGridSkeletonHtml,
    onEditorialGridOpen,
  });
})();
