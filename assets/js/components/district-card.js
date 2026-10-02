// One district of a state's gallery: its cover photo, name, photo count and - when the events data
// has any - how many EPMs were held there. The whole card opens the district's album.
// Styles: assets/css/components/district-card.css (needs fade-image.css + epm-gallery-common.css).
//
//   html`<li>${districtCardHtml({ district, index, meetings, stateId })}</li>`  then initFadeImages(list)
//   updateDistrictCard(cardButton, { district, meetings })   // when the meeting counts arrive later
(function () {
  'use strict';

  const { html, render, toElement } = FW.require('core/dom');
  const { icon } = FW.require('core/icons');
  const { getEpmGalleryImageUrl } = FW.require('api/epm-api');
  const { fadeImage } = FW.require('components/fade-image');
  const { navAttrs } = FW.require('components/gallery-primitives');
  const { pad2, plural } = FW.require('components/gallery-utils');

  const summaryOf = (district) => `${district.photoCount} ${plural(district.photoCount, 'photograph')}`;

  const ariaLabelOf = (district, meetings) => {
    const summary = summaryOf(district);
    const label = meetings > 0 ? `${summary}, ${meetings} ${plural(meetings, 'EPM')}` : summary;
    return `${district.name}: ${label}`;
  };

  const badgeContent = (meetings) => html`<i aria-hidden="true"></i>${meetings} ${plural(meetings, 'EPM')}`;

  // stateId: the state the album belongs to - the card opens
  // pages/epm-gallery-district.html?state=<stateId>&district=<district.id>.
  function districtCardHtml({ district, index, meetings = 0, stateId }) {
    return html`
    <button type="button" class="epg-dcard" ${navAttrs('epm-gallery-district', { state: stateId, district: district.id })}
      aria-label="${ariaLabelOf(district, meetings)}">
      <span class="epg-dcard-media">${fadeImage({
          src: getEpmGalleryImageUrl(district.coverUrl),
          alt: '',
          className: 'epg-dcard-img',
          attrs: 'loading="lazy" decoding="async"',
        })}${index !== undefined && html`<span class="epg-dcard-index">${pad2(index + 1)}</span>`}${meetings > 0
          && html`<span class="epg-dcard-badge">${badgeContent(meetings)}</span>`}</span>
      <span class="epg-dcard-body">
        <span class="epg-dcard-text">
          <span class="epg-dcard-name">${district.name}</span>
          <span class="epg-dcard-meta">${summaryOf(district)}</span>
        </span>
        <span class="epg-dcard-go" aria-hidden="true">${icon('arrow-up-right', { size: 18 })}</span>
      </span>
    </button>`;
  }

  // Brings an already-rendered card up to date with a new meeting count (label + "N EPMs" badge),
  // leaving its photo in place.
  function updateDistrictCard(card, { district, meetings = 0 }) {
    if (!card) return;
    card.setAttribute('aria-label', ariaLabelOf(district, meetings));
    const media = card.querySelector('.epg-dcard-media');
    let badge = media.querySelector('.epg-dcard-badge');
    if (meetings > 0) {
      if (!badge) {
        badge = toElement(html`<span class="epg-dcard-badge"></span>`);
        media.appendChild(badge);
      }
      render(badge, badgeContent(meetings));
    } else if (badge) {
      badge.remove();
    }
  }

  function districtCardSkeletonHtml() {
    return html`
    <span class="epg-dcard is-skeleton" aria-hidden="true">
      <span class="epg-dcard-media epg-skeleton"></span>
      <span class="epg-dcard-body">
        <span class="epg-dcard-text">
          <span class="epg-skeleton-line" style="width: 62%;"></span>
          <span class="epg-skeleton-line is-thin" style="width: 40%;"></span>
        </span>
      </span>
    </span>`;
  }

  FW.define('components/district-card', {
    districtCardHtml,
    updateDistrictCard,
    districtCardSkeletonHtml,
  });
})();
