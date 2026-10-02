// Exports workspace of the Tools page: header with a live search box and the filtered export
// service card grid (empty-state message when nothing matches), beside the My Tools sidebar.
//
//   mountExportsHub(container, { onSelectTool });
(function () {
  'use strict';

  const { html, render, toElement, on } = FW.require('core/dom');
  const { icon } = FW.require('core/icons');
  const { assetUrl } = FW.require('core/router');
  const {
    myToolsSidebarHtml,
    bindMyToolsSidebar,
    syncCardList,
  } = FW.require('components/my-tools-sidebar');

  const EXPORT_SERVICES = [
    { id: 1, title: 'HSN Code Search', description: 'Search and find the right HSN codes for your products instantly.', icon: 'qr-code', accent: 'red' },
    { id: 2, title: 'CHA', description: 'Connect with trusted Custom House Agents for smooth clearance.', icon: 'user-check', accent: 'teal' },
    { id: 3, title: 'Freight Forward', description: 'Reliable freight forwarding services to move your goods across the globe.', icon: 'plane', accent: 'blue' },
    { id: 4, title: 'Logistics Services', description: 'End-to-end logistics solutions tailored to your business needs.', icon: 'truck', accent: 'purple' },
    { id: 5, title: 'Loan Services', description: 'Access export financing and working capital for your business growth.', icon: 'banknote', accent: 'orange' },
    { id: 6, title: 'Insurance Services', description: 'Protect your shipments with comprehensive insurance solutions.', icon: 'shield-check', accent: 'cyan' },
    { id: 7, title: 'Document Formats', description: 'Download commonly used export document formats and templates.', icon: 'file-down', accent: 'blue-alt' },
    { id: 8, title: 'Calculators', description: 'Use smart calculators for duties, taxes, margins and more.', icon: 'calculator', accent: 'pink' },
    { id: 9, title: 'Statutory Registrations', description: 'Get guidance on required registrations for export business.', icon: 'clipboard-check', accent: 'orange-alt' },
    { id: 10, title: 'Business Compliances', description: 'Stay compliant with every export regulation and requirement.', icon: 'list-checks', accent: 'blue-dark' },
    { id: 11, title: 'Industry Consultant', description: 'Get expert advice from industry specialists for your export journey.', icon: 'briefcase', accent: 'coral' },
    { id: 12, title: 'IT & Digital Marketing', description: 'Boost your global presence with digital marketing solutions.', icon: 'megaphone', accent: 'green' },
    { id: 13, title: 'Legal Services', description: 'Legal support for contracts, agreements and dispute resolutions.', icon: 'scale', accent: 'purple-alt' },
  ];

  const ANIM_DIRECTIONS = ['slideInTop', 'slideInRight', 'slideInBottom', 'slideInLeft'];

  const cardAnimation = (idx) => `${ANIM_DIRECTIONS[idx % 4]} 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${(idx * 0.05) + 's'} both`;

  const cardHtml = (service, idx) => html`
  <div class="exports-service-card color-${service.accent}" style="animation: ${cardAnimation(idx)};">
    <div class="exports-card-icon-wrapper">
      ${icon(service.icon, { size: 32, className: 'exports-card-icon' })}
    </div>
    <h3 class="exports-card-title">${service.title}</h3>
    <p class="exports-card-desc">${service.description}</p>
    <button class="exports-card-arrow-btn">
      ${icon('arrow-right', { size: 18 })}
    </button>
  </div>`;

  function mountExportsHub(container, { onSelectTool } = {}) {
    const state = { searchQuery: '' };

    const filteredServices = () => {
      const q = state.searchQuery.toLowerCase();
      return EXPORT_SERVICES.filter((s) => s.title.toLowerCase().includes(q)
        || s.description.toLowerCase().includes(q));
    };

    render(container, html`
    <div class="exports-hub-layout">
      ${myToolsSidebarHtml('exports')}

      <div class="exports-hub-container">

        <div class="exports-header-section">

          <div class="exports-header-content">
            <div class="exports-badge">
              ${icon('ship', { size: 14, className: 'exports-badge-icon' })}
              <span>EXPORTS</span>
            </div>

            <h1 class="exports-main-title">Simplifying <span class="text-highlight">Global Exports</span></h1>

            <p class="exports-subtitle">All the tools and services you need to expand your business worldwide</p>
            <div class="exports-header-underline"></div>

            <div class="exports-search-wrapper">
              ${icon('search', { size: 18, className: 'exports-search-icon' })}
              <input type="text" placeholder="Search export services, tools and more..." value="" />
            </div>
          </div>

          <div class="exports-header-illustration">
            <img src="${assetUrl('images/exports_header_illustration.avif')}" alt="Global Exports illustration" />
          </div>

        </div>

        <div class="exports-services-wrapper"></div>

      </div>
    </div>`);

    const root = container.firstElementChild;
    bindMyToolsSidebar(root.querySelector('.fpo-hub-sidebar'), { onSelectTool });

    const wrapper = root.querySelector('.exports-services-wrapper');
    const cards = new Map();
    let grid = null;

    // The grid element stays while there are results (kept cards only re-animate when their
    // animation changes, as in React); it is swapped for the empty-state message otherwise.
    const drawServices = () => {
      const items = filteredServices();
      if (items.length === 0) {
        grid = null;
        cards.clear();
        render(wrapper, html`
        <div class="exports-empty-state">
          <p>No services found matching "${state.searchQuery}"</p>
        </div>`);
        return;
      }
      if (!grid) {
        render(wrapper, html`<div class="exports-services-grid"></div>`);
        grid = wrapper.firstElementChild;
      }
      syncCardList(grid, cards, items, {
        key: (s) => s.id,
        build: (s, idx) => toElement(cardHtml(s, idx)),
        update: (el, _s, idx) => { el.style.animation = cardAnimation(idx); },
      });
    };

    drawServices();

    on(root, 'input', '.exports-search-wrapper input', (event) => {
      state.searchQuery = event.target.value;
      drawServices();
    });

    on(root, 'click', '.exports-service-card', (_event, card) => {
      const id = [...cards].find(([, el]) => el === card)?.[0];
      console.log('Clicked', EXPORT_SERVICES.find((s) => s.id === id)?.title);
    });
  }

  FW.define('components/exports-hub', { mountExportsHub });
})();
