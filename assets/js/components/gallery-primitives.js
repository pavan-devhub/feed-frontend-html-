// Small building blocks shared by the three EPM gallery pages, as html`` builders.
// Styles: assets/css/components/epm-gallery-common.css.
(function () {
  'use strict';

  const { html, raw } = FW.require('core/dom');
  const { icon } = FW.require('core/icons');
  const { formatEventDateLong, formatEventDateParts } = FW.require('utils/epm-date');

  // data-nav attributes (see bindNavLinks in core/router.js) for a button that opens another page.
  function navAttrs(page, params) {
    return html`data-nav="${page}"${params ? html` data-nav-params="${JSON.stringify(params)}"` : ''}`;
  }

  // items: [{ label, nav?, navParams? }] - the last item is the current page; earlier items with a
  // `nav` page id are buttons that open that page.
  function crumbsHtml({ items, light = false }) {
    return html`
    <nav class="epg-crumbs${light ? ' is-light' : ''}" aria-label="Breadcrumb">
      <ol>
        ${items.map((item, i) => html`<li>${i < items.length - 1 && item.nav
            ? html`<button type="button" ${navAttrs(item.nav, item.navParams)}>${item.label}</button>`
            : html`<span${i === items.length - 1 ? raw(' aria-current="page"') : ''}>${item.label}</span>`}</li>`)}
      </ol>
    </nav>`;
  }

  // With actions (children) the description sits under the title and the actions take the right;
  // without them, the description itself balances the title on the right.
  function sectionHeadingHtml({ id, eyebrow, title, description, children }) {
    const desc = description && html`<p class="epg-section-desc">${description}</p>`;
    return html`
    <header class="epg-section-head">
      <div class="epg-section-head-main">
        ${eyebrow && html`<span class="epg-eyebrow">${eyebrow}</span>`}
        <h2${id ? html` id="${id}"` : ''} class="epg-h2">${title}</h2>
        ${children && desc}
      </div>
      ${(children || desc) && html`<div class="epg-section-head-side">${children || desc}</div>`}
    </header>`;
  }

  // The <dt>/<dd> pairs of a stats list - falsy entries are skipped so callers can list optional
  // stats inline.
  function statsItemsHtml(items) {
    return items.filter(Boolean).map((item) => html`
    <div class="epg-stat">
      <dt>${item.label}</dt>
      <dd>${item.value}</dd>
    </div>`);
  }

  // items: [{ label, value }] - renders nothing when every entry is falsy.
  function statsHtml({ items, light = false, className = '' }) {
    if (items.filter(Boolean).length === 0) return '';
    return html`<dl class="epg-stats${light ? ' is-light' : ''}${className ? ` ${className}` : ''}">${statsItemsHtml(items)}</dl>`;
  }

  // iconName: an icon from core/icons.js (e.g. 'image-off'); children: html`` for the action row.
  function statusMessageHtml({ icon: iconName, title, text, children, headingLevel = 'h2' }) {
    const tag = raw(/^h[1-6]$/.test(headingLevel) ? headingLevel : 'h2');
    return html`
    <div class="epg-message">
      ${iconName && html`<span class="epg-message-icon">${icon(iconName, { size: 26, strokeWidth: 1.6 })}</span>`}
      <${tag} class="epg-message-title">${title}</${tag}>
      ${text && html`<p class="epg-message-text">${text}</p>`}
      ${children && html`<div class="epg-message-actions">${children}</div>`}
    </div>`;
  }

  // The soonest upcoming EPM for a place, shown on the state and district heroes. Opens the EPM
  // directory (`nav`) like the React card's onOpen did.
  function nextEpmCardHtml({ event, place, nav = 'epm-details' }) {
    const { day, month } = formatEventDateParts(event.eventDate);
    const meta = [event.city, event.timeRange].filter(Boolean).join(' · ');
    return html`
    <button type="button" class="epg-next" ${navAttrs(nav)}
      aria-label="${`Next EPM in ${place}: ${event.title}, ${formatEventDateLong(event.eventDate)}. See all upcoming EPMs`}">
      <span class="epg-next-date" aria-hidden="true">
        <span>${month}</span>
        <strong>${day}</strong>
      </span>
      <span class="epg-next-body">
        <span class="epg-next-label">Next EPM in ${place}</span>
        <span class="epg-next-title">${event.title}</span>
        ${meta && html`<span class="epg-next-meta">${meta}</span>`}
      </span>
      <span class="epg-next-go" aria-hidden="true">${icon('arrow-right', { size: 18 })}</span>
    </button>`;
  }

  FW.define('components/gallery-primitives', {
    navAttrs,
    crumbsHtml,
    sectionHeadingHtml,
    statsItemsHtml,
    statsHtml,
    statusMessageHtml,
    nextEpmCardHtml,
  });
})();
