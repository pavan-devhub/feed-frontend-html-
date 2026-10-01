// FPO portal - dashboard with a left sidebar. Choosing a sidebar item only highlights it (with the
// chevron); the dashboard content stays the same. Nothing is selected when the page opens.
import { initPage } from '../core/page.js';
import { on } from '../core/dom.js';
import { iconSvg } from '../core/icons.js';

const session = initPage({ page: 'fpo' });

if (session) {
  const nav = document.querySelector('.fpo-nav');
  const state = { activeTab: '0' };

  const drawNav = () => {
    nav.querySelectorAll('.fpo-nav-item').forEach((item) => {
      const isActive = item.dataset.tab === state.activeTab;
      item.classList.toggle('active', isActive);
      item.querySelector('.fpo-nav-arrow')?.remove();
      if (isActive) item.insertAdjacentHTML('beforeend', iconSvg('chevron-right', { size: 16, className: 'fpo-nav-arrow' }));
    });
  };

  on(nav, 'click', '.fpo-nav-item', (_event, item) => {
    state.activeTab = item.dataset.tab;
    drawNav();
  });
}
