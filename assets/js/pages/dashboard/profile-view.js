// "My Profile" view of the dashboard: a row of coloured tabs, then My Details (the form) or a
// placeholder for the sections that aren't built yet. The tab buttons are restyled in place, so
// the row keeps its horizontal scroll position when another tab is picked.
(function () {
  'use strict';

  const { html, on, toElement } = FW.require('core/dom');
  const { icon } = FW.require('core/icons');
  const { mountMyDetailsForm } = FW.require('components/my-details-form');

  const PROFILE_TABS = [
    { id: 'profile-details', label: 'My Details', icon: 'user', bg: '#eef2ff', color: '#4f46e5', border: '#c7d2fe' },
    { id: 'profile-products', label: 'My Products', icon: 'package', bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
    { id: 'profile-vendors', label: 'My Vendors', icon: 'users', bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' },
    { id: 'profile-certificates', label: 'My Certificates & Licences', icon: 'file-text', bg: '#fdf4ff', color: '#c026d3', border: '#fbcfe8' },
    { id: 'profile-testimonials', label: 'My Testimonials', icon: 'star', bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
    { id: 'profile-subscriptions', label: 'Active Subscriptions', icon: 'settings', bg: '#f0fdfa', color: '#0d9488', border: '#ccfbf1' },
  ];

  const tabStyle = (tab, isActive) => [
    `background-color: ${tab.bg};`,
    `color: ${tab.color};`,
    `border: ${isActive ? `2px solid ${tab.color}` : `1px solid ${tab.border}`};`,
    `padding: ${isActive ? '11px 19px' : '12px 20px'};`,
    'border-radius: 12px;',
    'font-weight: 600;',
    'white-space: nowrap;',
    'cursor: pointer;',
    'display: flex;',
    'align-items: center;',
    'gap: 8px;',
    `box-shadow: ${isActive ? `0 4px 10px ${tab.border}` : '0 2px 4px rgba(0,0,0,0.05)'};`,
    'flex-shrink: 0;',
  ].join(' ');

  const PLACEHOLDER = html`
  <div style="min-height: 60vh; background-color: #fff; border-radius: 16px; border: 2px dashed #cbd5e1; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 1.125rem;">
    <p>Content will appear here</p>
  </div>`;

  // Renders the profile view into container. onSelectTab(id) is called when a tab is clicked;
  // call update(activeTab) after the active tab changes.
  function mountProfileView(container, { activeTab, onSelectTab }) {
    const root = toElement(html`
    <div style="padding: 24px;">
      <div class="hide-scrollbar" style="display: flex; gap: 12px; overflow-x: auto; padding-bottom: 16px;">
        ${PROFILE_TABS.map((tab) => html`
          <button data-tab="${tab.id}" style="${tabStyle(tab, activeTab === tab.id)}">${icon(tab.icon, { size: 18 })} ${tab.label}</button>`)}
      </div>

      <div style="margin-top: 24px; min-height: 60vh;"></div>
    </div>`);
    container.replaceChildren(root);

    const tabButtons = Array.from(root.querySelectorAll('[data-tab]'));
    const contentEl = root.lastElementChild;
    let shown = null; // 'details' | 'placeholder'
    let detailsForm = null;

    on(root, 'click', '[data-tab]', (_event, button) => onSelectTab(button.dataset.tab));

    function update(tabId) {
      tabButtons.forEach((button) => {
        const tab = PROFILE_TABS.find((t) => t.id === button.dataset.tab);
        button.setAttribute('style', tabStyle(tab, tabId === tab.id));
      });

      const next = tabId === 'profile-details' ? 'details' : 'placeholder';
      if (next === shown) return;
      shown = next;
      detailsForm?.destroy();
      detailsForm = null;
      if (next === 'details') detailsForm = mountMyDetailsForm(contentEl);
      else contentEl.replaceChildren(toElement(PLACEHOLDER));
    }

    update(activeTab);

    return {
      update,
      destroy() {
        detailsForm?.destroy();
      },
    };
  }

  FW.define('pages/dashboard/profile-view', { mountProfileView });
})();
