// MSME workspace of the Tools page: hero with a live search box and the filtered service card
// grid ("No services found" when nothing matches), beside the My Tools sidebar.
//
//   mountMsmeServiceHub(container, { onSelectTool });
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

  const MSME_SERVICES = [
    { title: 'Statutory Registrations', description: 'Register your business and stay compliant with ease.', icon: 'file-check', color: '#3b82f6', bg: '#eff6ff' },
    { title: 'Business Compliances', description: 'Manage all regulatory compliances in one place.', icon: 'clipboard-check', color: '#16a34a', bg: '#f0fdf4' },
    { title: 'IT & Digital Marketing', description: 'Boost your online presence and reach more customers.', icon: 'megaphone', color: '#f97316', bg: '#fff7ed' },
    { title: 'Industry Consultant', description: 'Get expert guidance tailored to your industry.', icon: 'briefcase', color: '#8b5cf6', bg: '#f5f3ff' },
    { title: 'Document Formats', description: 'Download ready-to-use document templates.', icon: 'file-text', color: '#2563eb', bg: '#eff6ff' },
    { title: 'Calculators', description: 'Smart calculators for your business needs.', icon: 'calculator', color: '#ec4899', bg: '#fdf2f8' },
    { title: 'Marketing Services', description: 'Promote your business with result-driven strategies.', icon: 'trending-up', color: '#22c55e', bg: '#f0fdf4' },
    { title: 'Loan Services', description: 'Explore financing options for your business growth.', icon: 'landmark', color: '#0ea5e9', bg: '#f0f9ff' },
    { title: 'Insurance Services', description: 'Secure your business with the right insurance plans.', icon: 'shield-check', color: '#a855f7', bg: '#faf5ff' },
    { title: 'Logistics Services', description: 'Reliable logistics solutions for smooth operations.', icon: 'truck', color: '#f59e0b', bg: '#fffbeb' },
    { title: 'Legal Services', description: 'Legal support for contracts, agreements & more.', icon: 'scale', color: '#eab308', bg: '#fefce8' },
    { title: 'Import & Export Services', description: 'Expand your business globally with ease.', icon: 'ship', color: '#14b8a6', bg: '#f0fdfa' },
  ];

  const ANIMATION_CLASSES = ['msme-slide-left', 'msme-slide-top', 'msme-slide-bottom', 'msme-slide-right'];

  const cardClass = (idx) => `msme-service-card ${ANIMATION_CLASSES[idx % ANIMATION_CLASSES.length]}`;

  const cardHtml = (service, idx) => html`
  <div class="${cardClass(idx)}" style="animation-delay: ${idx * 0.05}s;">
    <div class="msme-service-icon-wrap" style="background-color: ${service.bg}; color: ${service.color};">
      ${icon(service.icon, { size: 32, strokeWidth: 2 })}
    </div>
    <div class="msme-service-content">
      <h3 class="msme-service-title">${service.title}</h3>
      <p class="msme-service-desc">${service.description}</p>
    </div>
    <button class="msme-service-arrow" style="background-color: ${service.color};">
      ${icon('arrow-right', { size: 16, color: 'white', strokeWidth: 2.5 })}
    </button>
  </div>`;

  const noResultsHtml = () => html`
  <div class="msme-no-results">
    ${icon('search', { size: 48, color: '#94a3b8' })}
    <h3>No services found</h3>
    <p>Try adjusting your search query.</p>
  </div>`;

  function mountMsmeServiceHub(container, { onSelectTool } = {}) {
    const state = { searchQuery: '' };

    const filteredServices = () => {
      const q = state.searchQuery.toLowerCase();
      return MSME_SERVICES.filter((service) => service.title.toLowerCase().includes(q)
        || service.description.toLowerCase().includes(q));
    };

    render(container, html`
    <div class="msme-hub-layout">
      ${myToolsSidebarHtml('msme')}

      <div class="msme-hub-container">

        <div class="msme-hero-section">

          <div class="msme-hero-content">
            <div class="msme-hero-top-row">
              <h1 class="msme-hero-title">Empowering MSMEs</h1>
              <div class="msme-hero-pill"><span class="star-icon">★</span> One Stop Solution for Every Business</div>
            </div>

            <h2 class="msme-hero-subtitle">Building Businesses, Strengthening <span class="highlight-text">Bharat</span></h2>

            <p class="msme-hero-desc">All the essential services and tools to start, manage and grow your business</p>

            <div class="msme-search-bar">
              ${icon('search', { size: 20, className: 'msme-search-icon' })}
              <input type="text" placeholder="Search services, tools and more..." value="" />
              <button class="msme-search-btn">
                ${icon('search', { size: 18, strokeWidth: 2.5 })}
              </button>
            </div>
          </div>

          <div class="msme-hero-illustration">
            <img src="${assetUrl('images/msme_compact_illustration.avif')}" alt="MSME Business Growth" class="msme-hero-img" />
          </div>
        </div>

        <div class="msme-services-section"></div>
      </div>
    </div>`);

    const root = container.firstElementChild;
    bindMyToolsSidebar(root.querySelector('.fpo-hub-sidebar'), { onSelectTool });

    const section = root.querySelector('.msme-services-section');
    const cards = new Map();
    let grid = null;

    // The grid element stays while there are results (kept cards don't re-animate); it is swapped
    // for the "No services found" block when nothing matches.
    const drawServices = () => {
      const items = filteredServices();
      if (items.length === 0) {
        grid = null;
        cards.clear();
        render(section, noResultsHtml());
        return;
      }
      if (!grid) {
        render(section, html`<div class="msme-services-grid"></div>`);
        grid = section.firstElementChild;
      }
      syncCardList(grid, cards, items, {
        key: (s) => s.title,
        build: (s, idx) => toElement(cardHtml(s, idx)),
        update: (el, s, idx) => {
          el.className = cardClass(idx);
          el.style.animationDelay = `${idx * 0.05}s`;
        },
      });
    };

    drawServices();

    on(root, 'input', '.msme-search-bar input', (event) => {
      state.searchQuery = event.target.value;
      drawServices();
    });

    on(root, 'click', '.msme-service-card', (_event, card) => {
      const title = [...cards].find(([, el]) => el === card)?.[0];
      console.log('Navigate to:', title);
    });
  }

  FW.define('components/msme-service-hub', { mountMsmeServiceHub });
})();
