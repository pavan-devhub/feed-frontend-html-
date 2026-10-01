// Dashboard sidebar menu: a tree of up to four levels. One item per level can be open at a time
// (openMenus[depth] = id); clicking a parent toggles it and selects its first leaf, clicking a
// leaf selects it. The list elements are kept and patched in place (not re-rendered), so the
// chevron rotation and highlight transitions animate and an already-open sublist doesn't replay
// its slide-in animation on every click.
import { html, on, toElement } from '../../core/dom.js';
import { icon } from '../../core/icons.js';

export const sidebarMenu = [
  {
    category: '',
    items: [
      {
        id: 'profile', title: 'My Profile', icon: 'user',
        subItems: [
          { id: 'profile-details', title: 'My Details', icon: 'user' },
          { id: 'profile-products', title: 'My Products', icon: 'package' },
          { id: 'profile-vendors', title: 'My Vendors', icon: 'users' },
          { id: 'profile-certificates', title: 'My Certificates & Licences', icon: 'file-text' },
          { id: 'profile-testimonials', title: 'My Testimonials', icon: 'star' },
          { id: 'profile-subscriptions', title: 'Active Subscriptions', icon: 'settings' },
        ],
      },
      {
        id: 'org', title: 'MY Org', icon: 'home',
        subItems: [
          { id: 'org-about', title: 'About My Org', icon: 'info' },
          {
            id: 'org-members', title: 'My Members', icon: 'users-2',
            subItems: [
              { id: 'org-members-share-capital', title: 'Share Capital Registry - All Options', icon: 'arrow-right-left' },
              { id: 'org-members-ledger', title: 'Member Ledger', icon: 'scroll-text' },
            ],
          },
          { id: 'org-agm', title: 'AGM & BoD Meetings', icon: 'calendar' },
          { id: 'org-farm-activity', title: 'Farm Activity', icon: 'sprout' },
          { id: 'org-schemes', title: 'Schemes', icon: 'shield-check' },
          { id: 'org-loans', title: 'Loans & Finance', icon: 'banknote' },
        ],
      },
      {
        id: 'accounts', title: 'My Accounts', icon: 'book-open',
        subItems: [
          {
            id: 'accounts-registers', title: 'My Registers', icon: 'scroll-text',
            subItems: [
              { id: 'accounts-registers-purchase', title: 'Purchase Registry', icon: 'clipboard-list' },
              { id: 'accounts-registers-sales', title: 'Sales Registry', icon: 'trending-up' },
              { id: 'accounts-registers-stock', title: 'Stock Registry', icon: 'warehouse' },
            ],
          },
          {
            id: 'accounts-transactions', title: 'My Transactions', icon: 'arrow-right-left',
            subItems: [
              { id: 'accounts-transactions-cashbook', title: 'Cash Book Registry', icon: 'wallet' },
              { id: 'accounts-transactions-bank', title: 'Bank Registry', icon: 'landmark' },
              { id: 'accounts-transactions-expenses', title: 'Expenses Registry', icon: 'receipt' },
            ],
          },
        ],
      },
      {
        id: 'reports', title: 'My Reports', icon: 'bar-chart-3',
        subItems: [
          { id: 'reports-ledger', title: 'Ledger Registry', icon: 'scroll-text' },
          { id: 'reports-financial', title: 'Financial Reports', icon: 'file-text' },
        ],
      },
      { id: 'status', title: 'Status of Activities', icon: 'activity' },
      { id: 'compliances', title: 'My Compliances', icon: 'check-circle' },
      {
        id: 'other', title: 'Other Services', icon: 'more-horizontal',
        subItems: [
          { id: 'other-org-business-plan', title: 'Org Business Plan', icon: 'briefcase' },
          { id: 'other-capacity-building', title: 'Capacity Building', icon: 'graduation-cap' },
          { id: 'other-godown-storage', title: 'Godown/Storage', icon: 'warehouse' },
          { id: 'other-logistics', title: 'Logistics - Item Tracking', icon: 'truck' },
          { id: 'other-farm-advisory', title: 'Farm Advisory Services/Crop Doctor', icon: 'stethoscope' },
          { id: 'other-agri-inputs', title: 'Seeds, Fertilizers, Agri Machinery', icon: 'tractor' },
          { id: 'other-technology', title: 'Technology', icon: 'cpu' },
          { id: 'other-branding', title: 'Branding & Promotion', icon: 'palette' },
          { id: 'other-digital-marketing', title: 'Digital Marketing', icon: 'smartphone' },
        ],
      },
      {
        id: 'news', title: 'News & Alerts', icon: 'bell-ring',
        subItems: [
          { id: 'news-alerts-notifications', title: 'Alerts & Notifications', icon: 'bell' },
          { id: 'news-offers-coupons', title: 'Offers & Coupons', icon: 'tag' },
          { id: 'news-subscriptions-plans', title: 'Subscriptions & Plans', icon: 'settings' },
        ],
      },
      {
        id: 'trade', title: 'My Trade', icon: 'shopping-cart',
        subItems: [
          {
            id: 'trade-plans', title: 'My Plans', icon: 'clipboard-list',
            subItems: [
              { id: 'trade-plans-export', title: 'Export - KYJ with FEED', icon: 'ship' },
              {
                id: 'trade-plans-domestic', title: 'Domestic Trade', icon: 'store',
                subItems: [
                  { id: 'trade-plans-domestic-tenders', title: 'Tenders & Institutional Domestic Supply', icon: 'building-2' },
                  { id: 'trade-plans-domestic-ecommerce', title: 'E-commerce - My Market', icon: 'shopping-cart' },
                  { id: 'trade-plans-domestic-value-addition', title: 'Value Addition', icon: 'layers' },
                  { id: 'trade-plans-domestic-cfc', title: 'CFC - Give Place for Hire', icon: 'key' },
                  { id: 'trade-plans-domestic-animal-husbandry', title: 'Animal Husbandry', icon: 'paw-print' },
                ],
              },
            ],
          },
          {
            id: 'trade-connections', title: 'My Connections', icon: 'users-2',
            subItems: [
              { id: 'trade-connections-export', title: 'Export Connections - International Buyers', icon: 'globe-2' },
              { id: 'trade-connections-domestic', title: 'Domestic Connections - My Market Trade Buyers (Vendors)', icon: 'users' },
            ],
          },
        ],
      },
      {
        id: 'directory', title: 'Directory', icon: 'users-2',
        subItems: [
          { id: 'directory-officers', title: 'Horticulture/Agriculture Officers', icon: 'user-cog' },
          { id: 'directory-input-dealers', title: 'Input Seed / Dealers Numbers', icon: 'tractor' },
          { id: 'directory-govt-schemes', title: 'Govt. Loans & Schemes', icon: 'landmark' },
          { id: 'directory-nbfcs', title: 'NBFCs & Financial Services', icon: 'coins' },
          { id: 'directory-farm-service', title: 'Farm Service Contacts', icon: 'phone-call' },
          { id: 'directory-feed-offices', title: 'FEED Office Numbers - Dist. Wise', icon: 'map-pin' },
        ],
      },
    ],
  },
];

// Every menu item by id, so a click on <li data-id> can find its item.
const itemsById = {};
(function index(items) {
  items.forEach((item) => {
    itemsById[item.id] = item;
    if (item.subItems) index(item.subItems);
  });
}(sidebarMenu.flatMap((group) => group.items)));

const firstLeafId = (item) => (item.subItems ? firstLeafId(item.subItems[0]) : item.id);

const arrowTransform = (isOpen) => (isOpen ? 'rotate(180deg)' : 'rotate(0deg)');

// Mounts the menu into <nav class="db-nav">. onSelect(tabId) is called with the tab to show;
// call sync(activeTab) afterwards (and whenever the active tab changes) to update the menu.
export function mountSidebarNav(navEl, { onSelect }) {
  let openMenus = {};
  let activeTab = null;

  const branchContainsActive = (item) => {
    if (item.id === activeTab) return true;
    return !!item.subItems && item.subItems.some(branchContainsActive);
  };

  const itemHtml = (item, depth) => html`<li data-id="${item.id}" data-depth="${depth}">${icon(item.icon, { size: depth === 0 ? 18 : 15, className: 'db-nav-icon' })}<span class="db-nav-title">${item.title}</span>${item.subItems && icon('chevron-down', {
    size: 16,
    className: 'db-nav-arrow',
    style: `transform: ${arrowTransform(openMenus[depth] === item.id)}; transition: transform 0.2s ease;`,
  })}</li>`;

  // Brings one <ul> (and the open sublists under it) in line with openMenus / activeTab.
  function syncList(ul, items, depth) {
    items.forEach((item) => {
      const li = ul.querySelector(`:scope > li[data-id="${item.id}"]`);
      li.className = `${depth === 0 ? 'db-nav-item' : 'db-nav-subitem'} ${branchContainsActive(item) ? 'active' : ''}`;
      if (!item.subItems) return;

      const isOpen = openMenus[depth] === item.id;
      li.querySelector('.db-nav-arrow').style.transform = arrowTransform(isOpen);
      const next = li.nextElementSibling;
      const sublist = next && next.tagName === 'UL' ? next : null;
      if (isOpen && !sublist) li.after(buildList(item.subItems, depth + 1));
      else if (isOpen) syncList(sublist, item.subItems, depth + 1);
      else if (sublist) sublist.remove();
    });
  }

  function buildList(items, depth) {
    const ul = document.createElement('ul');
    ul.className = depth === 0 ? 'db-nav-list' : 'db-nav-sublist';
    items.forEach((item) => ul.appendChild(toElement(itemHtml(item, depth))));
    syncList(ul, items, depth);
    return ul;
  }

  const lists = sidebarMenu.map((group) => {
    const groupEl = document.createElement('div');
    groupEl.className = 'db-nav-group';
    if (group.category) groupEl.appendChild(toElement(html`<h3 class="db-nav-category">${group.category}</h3>`));
    const ul = buildList(group.items, 0);
    groupEl.appendChild(ul);
    navEl.appendChild(groupEl);
    return { ul, items: group.items };
  });

  const toggleMenu = (depth, id) => {
    const next = { ...openMenus };
    Object.keys(next).forEach((k) => { if (Number(k) >= depth) delete next[k]; });
    if (openMenus[depth] !== id) next[depth] = id;
    openMenus = next;
  };

  on(navEl, 'click', 'li[data-id]', (event, li) => {
    event.stopPropagation();
    const item = itemsById[li.dataset.id];
    if (item.subItems) {
      toggleMenu(Number(li.dataset.depth), item.id);
      onSelect(firstLeafId(item));
    } else {
      onSelect(item.id);
    }
  });

  return {
    sync(tab) {
      activeTab = tab;
      lists.forEach(({ ul, items }) => syncList(ul, items, 0));
    },
  };
}
