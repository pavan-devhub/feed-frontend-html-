// Farmer workspace of the Tools page: hero, the primary tool cards (6 across), the secondary
// service cards (4 across) and the benefits bar, beside the My Tools sidebar. No interactive state.
//
//   mountFarmerHub(container, { onSelectTool });
(function () {
  'use strict';

  const { html, render } = FW.require('core/dom');
  const { icon } = FW.require('core/icons');
  const { assetUrl } = FW.require('core/router');
  const { myToolsSidebarHtml, bindMyToolsSidebar } = FW.require('components/my-tools-sidebar');

  const PRIMARY_TOOLS = [
    { title: 'Crop Expenditure Tool', description: 'Plan and track your crop expenses effectively.', image: 'images/farmer/crop_expenditure.svg' },
    { title: 'Crop Advisory', description: 'Get expert advice for better crop health and yield.', image: 'images/farmer/crop_advisory.svg' },
    { title: 'Farm Equipment', description: 'Find and compare the best equipment for your farm.', image: 'images/farmer/farm_equipment.svg' },
    { title: 'Find Dealers', description: 'Connect with trusted dealers near your location.', image: 'images/farmer/find_dealers.svg' },
    { title: 'Value Addition Units', description: 'Explore nearby value addition units.', image: 'images/farmer/value_addition.svg' },
    { title: 'Fertilizer Calculator', description: 'Calculate the right amount of fertilizers.', image: 'images/farmer/fertilizer_calculator.svg' },
  ];

  const SECONDARY_TOOLS = [
    { title: 'Marketing Services', description: 'Promote and sell your produce easily.', image: 'images/marketing_services.avif' },
    { title: 'Loan Services', description: 'Access easy loans for your agricultural needs.', image: 'images/loan_services.avif' },
    { title: 'Insurance Services', description: 'Protect your crops and secure your future.', image: 'images/insurance_services.avif' },
    { title: 'Logistics Services', description: 'Reliable logistics solutions for your produce.', image: 'images/logistics_services.avif' },
  ];

  const BENEFITS = [
    { title: 'Trusted & Secure', desc: '100% safe and reliable services', icon: 'shield-check', color: '#16a34a', bg: '#dcfce7' },
    { title: 'Expert Support', desc: 'Get guidance from industry experts', icon: 'users', color: '#a855f7', bg: '#f3e8ff' },
    { title: 'Time Saving', desc: 'Smart tools to save your time', icon: 'clock', color: '#3b82f6', bg: '#dbeafe' },
    { title: 'Grow Better', desc: 'Make informed decisions and grow', icon: 'trending-up', color: '#f97316', bg: '#ffedd5' },
  ];

  const ANIMATION_CLASSES = ['farmer-slide-left', 'farmer-slide-top', 'farmer-slide-bottom', 'farmer-slide-right'];

  const arrowHtml = () => html`
  <span class="farmer-card-arrow">
    ${icon('arrow-right', { size: 15, strokeWidth: 2.5 })}
  </span>`;

  function mountFarmerHub(container, { onSelectTool } = {}) {
    render(container, html`
    <div class="fpo-hub-layout">
      ${myToolsSidebarHtml('farmer')}

      <div class="farmer-hub">
        <div class="farmer-hero">
          <div class="farmer-hero-bg"></div>
          <div class="farmer-hero-fade"></div>

          <div class="farmer-hero-inner">
            <div class="farmer-badge">
              ${icon('leaf', { size: 15, strokeWidth: 2.5, color: '#16a34a' })}
              <span>Welcome, <strong>Farmer</strong></span>
            </div>

            <h1 class="farmer-heading">Smart Tools for<span>Better Farming</span></h1>

            <p class="farmer-subtext">
              Get expert tools and services to improve productivity, reduce costs and grow your business.
            </p>

            <div class="farmer-divider">
              <span class="farmer-divider-line"></span>
              <span class="farmer-divider-dot"></span>
              <span class="farmer-divider-dot"></span>
            </div>
          </div>
        </div>

        <div class="farmer-grid-6">
          ${PRIMARY_TOOLS.map((tool, idx) => html`
            <div class="farmer-card ${ANIMATION_CLASSES[idx % ANIMATION_CLASSES.length]}" style="animation-delay: ${idx * 0.05}s;">
              <div class="farmer-card-media">
                <img src="${assetUrl(tool.image)}" alt="${tool.title}" />
              </div>
              <h3>${tool.title}</h3>
              <p>${tool.description}</p>
              ${arrowHtml()}
            </div>`)}
        </div>

        <div class="farmer-grid-4">
          ${SECONDARY_TOOLS.map((tool, idx) => html`
            <div class="farmer-card wide ${ANIMATION_CLASSES[(idx + 6) % ANIMATION_CLASSES.length]}" style="animation-delay: ${(idx + 6) * 0.05}s;">
              <div class="farmer-card-left">
                <div class="farmer-card-media">
                  <img src="${assetUrl(tool.image)}" alt="${tool.title}" />
                </div>
                ${arrowHtml()}
              </div>
              <div class="farmer-card-right">
                <h3>${tool.title}</h3>
                <p>${tool.description}</p>
              </div>
            </div>`)}
        </div>

        <div class="farmer-benefits">
          ${BENEFITS.map((item, idx) => html`
            <div class="farmer-benefit">
              <span class="farmer-benefit-icon" style="background-color: ${item.bg}; color: ${item.color};">
                ${icon(item.icon, { size: 19, strokeWidth: 2.5 })}
              </span>
              <div class="farmer-benefit-text">
                <h4>${item.title}</h4>
                <p>${item.desc}</p>
              </div>
            </div>
            ${idx < BENEFITS.length - 1 && html`<span class="farmer-benefit-sep"></span>`}`)}
        </div>
      </div>
    </div>`);

    const root = container.firstElementChild;
    bindMyToolsSidebar(root.querySelector('.fpo-hub-sidebar'), { onSelectTool });
  }

  FW.define('components/farmer-hub', { mountFarmerHub });
})();
