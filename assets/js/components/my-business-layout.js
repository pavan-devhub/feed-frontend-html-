// The My Business sidebar (React: components/MyBusinessLayout.jsx). Every My Business page has the
// layout markup in its HTML:
//
//   <div id="site-navbar"></div>
//   <div class="mb-layout">
//     <aside class="mb-sidebar" id="mb-sidebar"></aside>     <- this module renders into here
//     <div style="flex: 1;"> ...page content... </div>
//   </div>
//   <div id="site-footer"></div>
//
// and calls mountMyBusinessSidebar(document.getElementById('mb-sidebar'), { currentTab }).
// Pages using the layout must link assets/css/pages/my-business.css.
import { html, render, on, cx } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { navigate } from '../core/router.js';

export const NAV_ITEMS = [
  { name: 'Business Profile', icon: 'user', route: 'business-profile' },
  { name: 'Business Account', icon: 'wallet', route: 'business-account' },
  { name: 'Compliances & Registration', icon: 'file-check', route: 'compliances' },
  { name: 'Agm & Board', icon: 'users', route: 'agm-board' },
  { name: 'Business Plan', icon: 'target', route: 'business-plan' },
  { name: 'Loans & Schemes', icon: 'piggy-bank', route: 'loans-schemes' },
  { name: 'Marketing Support', icon: 'megaphone', route: 'marketing' },
  { name: 'Reports', icon: 'bar-chart-3', route: 'reports' },
  { name: 'Business Connect', icon: 'handshake', route: 'connect' },
];

// Route ids of the modules that share the "under construction" page (pages/coming-soon.html?tab=<id>).
export const PLACEHOLDER_TABS = ['business-profile', 'compliances', 'loans-schemes', 'marketing', 'reports', 'connect'];

export function mountMyBusinessSidebar(root, { currentTab } = {}) {
  if (!root) return;

  render(root, html`
    <div class="mb-sidebar-top">
      <div class="mb-sidebar-menu">
        <div class="${cx('mb-menu-item-main', currentTab === 'mybusiness' && 'active')}" data-route="mybusiness" style="cursor: pointer;">
          <div class="mb-menu-item-left">
            ${icon('store', { size: 20 })}
            <span>My Business</span>
          </div>
          ${icon('chevron-right', { size: 16 })}
        </div>

        <div class="mb-nav-list">
          ${NAV_ITEMS.map((item) => html`
            <div class="${cx('mb-nav-item', currentTab === item.route && 'active')}" data-route="${item.route}">
              <div class="mb-nav-icon-wrapper">
                ${icon(item.icon, { size: 18 })}
              </div>
              <span class="mb-nav-text">${item.name}</span>
            </div>`)}
        </div>
      </div>
    </div>`);

  // In the React app, picking the tab that is already open re-rendered the same page (no visible
  // change), so only a different tab loads a new page here.
  on(root, 'click', '[data-route]', (_event, item) => {
    const { route } = item.dataset;
    if (route !== currentTab) navigate(route);
  });
}
