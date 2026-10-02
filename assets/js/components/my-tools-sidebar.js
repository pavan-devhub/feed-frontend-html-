// "My Tools" workspace sidebar shown beside each hub on the Tools page (My FPO, Farmer, MSME,
// Exports). Hub workspaces switch in-page through onSelectTool; the others are separate pages.
// Also exports syncCardList(), the keyed list update the hubs use for their filtered card grids.
//
//   render(el, html`<div class="fpo-hub-layout">${myToolsSidebarHtml('fpo')} ...</div>`);
//   bindMyToolsSidebar(el.querySelector('.fpo-hub-sidebar'), { onSelectTool });
(function () {
  'use strict';

  const { html, cx, on } = FW.require('core/dom');
  const { icon } = FW.require('core/icons');
  const { navigate } = FW.require('core/router');

  const SIDEBAR_ITEMS = [
    { id: 'fpo', title: 'My FPO', icon: 'users', color: '#16a34a', internal: true },
    { id: 'farmer', title: 'Farmer', icon: 'user', color: '#65a30d', internal: true },
    { id: 'msme', title: 'MSME', icon: 'store', color: '#f59e0b', internal: true },
    { id: 'student', title: 'Student', icon: 'graduation-cap', color: '#3b82f6', route: 'home' },
    { id: 'exports', title: 'Exports', icon: 'ship', color: '#0ea5e9', internal: true },
  ];

  function myToolsSidebarHtml(activeId) {
    return html`
    <aside class="fpo-hub-sidebar">
      <div class="fpo-sidebar-header">
        <div class="fpo-sidebar-brand-icon">
          ${icon('layout-grid', { size: 20, strokeWidth: 2.5 })}
        </div>
        <div class="fpo-sidebar-brand-text">
          <h2>My Tools</h2>
          <span>5 workspaces</span>
        </div>
      </div>

      <p class="fpo-sidebar-section">Workspaces</p>

      <nav class="fpo-sidebar-nav">
        ${SIDEBAR_ITEMS.map((item) => {
            const isActive = item.id === activeId;
            return html`
            <div class="${cx('fpo-sidebar-item', isActive && 'active')}" style="--item-color: ${item.color};" data-tool="${item.id}">
              <span class="fpo-sidebar-icon">
                ${icon(item.icon, { size: 17, strokeWidth: 2.25 })}
              </span>
              <span class="fpo-sidebar-text">${item.title}</span>
              ${isActive && icon('chevron-right', { size: 15, className: 'fpo-sidebar-arrow' })}
            </div>`;
          })}
      </nav>

      <div class="fpo-sidebar-cta">
        <div class="fpo-sidebar-cta-icon">
          ${icon('headphones', { size: 18, strokeWidth: 2.25 })}
        </div>
        <h4>Need Help?</h4>
        <p>Get expert guidance to register, run and grow your business.</p>
        <button class="fpo-sidebar-cta-btn" data-nav="contact">
          Contact Us
          ${icon('arrow-right', { size: 14, strokeWidth: 2.5 })}
        </button>
      </div>
    </aside>`;
  }

  // Clicking the active workspace does nothing; hub workspaces call onSelectTool(id), the rest
  // navigate to their page. (The Contact Us button is a data-nav link, wired by initPage.)
  function bindMyToolsSidebar(sidebarEl, { onSelectTool } = {}) {
    on(sidebarEl, 'click', '.fpo-sidebar-item', (_event, el) => {
      const item = SIDEBAR_ITEMS.find((i) => i.id === el.dataset.tool);
      if (!item || el.classList.contains('active')) return;
      if (item.internal) onSelectTool?.(item.id);
      else navigate(item.route);
    });
  }

  // Updates a filtered card grid in place the way React's keyed lists do, so cards that stay keep
  // their element (their entry animation doesn't replay) - only new cards animate in.
  //   cards  - Map key -> element of the cards currently in `parent` (kept up to date)
  //   items  - the visible items, in the same relative order as the full list (filtering only)
  //   build(item, idx)       -> a new card element
  //   update(el, item, idx)  -> refresh the index-dependent attributes of a card that stays
  function syncCardList(parent, cards, items, { key, build, update }) {
    const wanted = new Set(items.map(key));
    cards.forEach((el, k) => {
      if (!wanted.has(k)) {
        el.remove();
        cards.delete(k);
      }
    });
    let cursor = parent.firstElementChild;
    items.forEach((item, idx) => {
      const k = key(item);
      const existing = cards.get(k);
      if (existing) {
        update(existing, item, idx);
        cursor = existing.nextElementSibling;
      } else {
        const el = build(item, idx);
        parent.insertBefore(el, cursor);
        cards.set(k, el);
      }
    });
  }

  FW.define('components/my-tools-sidebar', { myToolsSidebarHtml, bindMyToolsSidebar, syncCardList });
})();
