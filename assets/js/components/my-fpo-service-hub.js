// My FPO workspace of the Tools page: category filter chips, the service card grid (click selects a
// card) and the benefits strip, beside the My Tools sidebar.
//
//   mountMyFpoServiceHub(container, { onSelectTool });
import { html, render, toElement, cx, on } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { assetUrl } from '../core/router.js';
import { myToolsSidebarHtml, bindMyToolsSidebar, syncCardList } from './my-tools-sidebar.js';

const FPO_SERVICES = [
  { title: 'Statutory Registrations', description: 'Easy and fast registration for your FPO', image: 'images/statutory_registrations.avif', accent: 'green', icon: 'file-check', category: 'Compliance' },
  { title: 'Business Compliances', description: 'Stay compliant with all regulatory requirements', image: 'images/business_compliances.avif', accent: 'blue', icon: 'shield-check', category: 'Compliance' },
  { title: 'Legal Services', description: 'Legal guidance and documentation support', image: 'images/legal_services.avif', accent: 'orange', icon: 'scale', category: 'Compliance' },
  { title: 'Document Formats', description: 'Professional templates ready to use', image: 'images/document_formats.avif', accent: 'pink', icon: 'file-text', category: 'Compliance' },
  { title: 'Loan Services', description: 'Easy access to loans and financial support', image: 'images/loan_services.avif', accent: 'green', icon: 'piggy-bank', category: 'Finance' },
  { title: 'Insurance Services', description: 'Secure your business and your future', image: 'images/insurance_services.avif', accent: 'blue', icon: 'umbrella', category: 'Finance' },
  { title: 'Calculators', description: 'Smart tools for quick business calculations', image: 'images/calculators.avif', accent: 'cyan', icon: 'calculator', category: 'Finance' },
  { title: 'IT & Digital Marketing', description: 'Grow your reach with smart digital solutions', image: 'images/it_digital_marketing.avif', accent: 'purple', icon: 'laptop', category: 'Growth' },
  { title: 'Marketing Services', description: 'Boost brand presence and market reach', image: 'images/marketing_services.avif', accent: 'yellow', icon: 'megaphone', category: 'Growth' },
  { title: 'Industry Consultant', description: 'Expert advice for sustainable business growth', image: 'images/industry_consultant.avif', accent: 'orange', icon: 'briefcase', category: 'Growth' },
  { title: 'Logistics Services', description: 'Efficient supply chain and logistics support', image: 'images/logistics_services.avif', accent: 'cyan', icon: 'truck', category: 'Operations' },
  { title: 'Import & Export Services', description: 'Expand globally with import-export solutions', image: 'images/import_export_services.avif', accent: 'blue', icon: 'globe-2', category: 'Operations' },
];

const CATEGORIES = ['All', 'Compliance', 'Finance', 'Growth', 'Operations'];

const BENEFITS = [
  { title: 'Trusted & Secure', desc: '100% secure and reliable services', icon: 'shield-check', color: '#16a34a', bg: '#dcfce7' },
  { title: 'Expert Support', desc: 'Professional guidance at every step', icon: 'users', color: '#a855f7', bg: '#f3e8ff' },
  { title: 'Fast & Efficient', desc: 'Quick solutions for your business', icon: 'zap', color: '#3b82f6', bg: '#dbeafe' },
  { title: 'Grow Your Business', desc: 'Tools and services to scale higher', icon: 'trending-up', color: '#eab308', bg: '#fef9c3' },
];

export function mountMyFpoServiceHub(container, { onSelectTool } = {}) {
  const state = { selected: null, activeCategory: 'All' };

  const visibleServices = () => (state.activeCategory === 'All'
    ? FPO_SERVICES
    : FPO_SERVICES.filter((s) => s.category === state.activeCategory));

  const cardClass = (service) => `fpo-service-card accent-${service.accent}${state.selected === service.title ? ' selected' : ''}`;

  const cardHtml = (service, idx) => html`
    <div class="${cardClass(service)}" style="animation-delay: ${idx * 0.045}s;">
      <div class="fpo-service-media">
        <img src="${assetUrl(service.image)}" alt="${service.title}" class="fpo-service-image" />
        <span class="fpo-service-tag">${service.category}</span>
        <span class="fpo-service-badge">
          ${icon(service.icon, { size: 18, strokeWidth: 2.25 })}
        </span>
      </div>

      <div class="fpo-service-content">
        <h3 class="fpo-service-title">${service.title}</h3>
        <p class="fpo-service-desc">${service.description}</p>
        <div class="fpo-service-foot">
          <span class="fpo-service-action">Explore</span>
          <span class="fpo-service-arrow">
            ${icon('arrow-right', { size: 15, strokeWidth: 2.5 })}
          </span>
        </div>
      </div>
    </div>`;

  render(container, html`
    <div class="fpo-hub-layout">
      ${myToolsSidebarHtml('fpo')}

      <div class="fpo-hub-container">
        <div class="fpo-hub-content-wrap">

          <div class="fpo-filters">
            ${CATEGORIES.map((cat) => html`
              <button class="${cx('fpo-chip', state.activeCategory === cat && 'active')}" data-category="${cat}">${cat}</button>`)}
          </div>

          <div class="fpo-hub-grid">
            ${visibleServices().map(cardHtml)}
          </div>

          <div class="fpo-hub-benefits">
            ${BENEFITS.map((item) => html`
              <div class="fpo-benefit-item">
                <div class="fpo-benefit-icon" style="background-color: ${item.bg}; color: ${item.color};">
                  ${icon(item.icon, { size: 20, strokeWidth: 2.5 })}
                </div>
                <div class="fpo-benefit-text">
                  <h4>${item.title}</h4>
                  <p>${item.desc}</p>
                </div>
              </div>`)}
          </div>

        </div>
      </div>
    </div>`);

  const root = container.firstElementChild;
  bindMyToolsSidebar(root.querySelector('.fpo-hub-sidebar'), { onSelectTool });

  const grid = root.querySelector('.fpo-hub-grid');
  const cards = new Map();
  Array.from(grid.children).forEach((el, idx) => cards.set(visibleServices()[idx].title, el));

  const drawGrid = () => syncCardList(grid, cards, visibleServices(), {
    key: (s) => s.title,
    build: (s, idx) => toElement(cardHtml(s, idx)),
    update: (el, s, idx) => {
      el.className = cardClass(s);
      el.style.animationDelay = `${idx * 0.045}s`;
    },
  });

  on(root, 'click', '.fpo-chip', (_event, chip) => {
    state.activeCategory = chip.dataset.category;
    root.querySelectorAll('.fpo-chip').forEach((c) => c.classList.toggle('active', c === chip));
    drawGrid();
  });

  on(root, 'click', '.fpo-service-card', (_event, card) => {
    const title = [...cards].find(([, el]) => el === card)?.[0];
    if (!title) return;
    state.selected = state.selected === title ? null : title;
    const byTitle = Object.fromEntries(FPO_SERVICES.map((s) => [s.title, s]));
    cards.forEach((el, key) => { el.className = cardClass(byTitle[key]); });
  });
}
