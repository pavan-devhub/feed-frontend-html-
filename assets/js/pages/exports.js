// My Exports portal - a sidebar of 13 sections next to the selected view. The views switch in place
// (no reload): the My Exports hub is the <main> already in the page, the others are the
// <template id="ep-view-N"> blocks at the end of pages/exports.html. Sections without a view
// (Product Selection, Buyers Connection, ...) show the sidebar only.
//
// A view is rebuilt from its markup every time it is opened, so its entry animations replay and its
// state (Country Selection search, Why Exports reveal) starts fresh - as when React remounted it.
import { initPage } from '../core/page.js';
import { on, scrollToTop } from '../core/dom.js';
import { iconSvg, hydrateIcons } from '../core/icons.js';
import { mountWhyExports } from './exports/why-exports.js';
import { mountCountrySelection } from './exports/country-selection.js';

// Views with behaviour: mount(viewEl) wires it up and may return a cleanup function.
const VIEW_SETUP = {
  1: mountWhyExports,
  10: mountCountrySelection,
};

const session = initPage({ page: 'exports' });

if (session) {
  const layout = document.querySelector('.ep-layout');
  const nav = layout.querySelector('.ep-nav-list');
  const hubView = layout.querySelector('.ep-main-content');
  const hubMarkup = hubView.cloneNode(true);

  const state = {
    activeTab: '0',
    view: hubView,
    cleanup: null,
  };

  const buildView = (tab) => {
    if (tab === '0') return hubMarkup.cloneNode(true);
    const tpl = document.getElementById(`ep-view-${tab}`);
    return tpl ? tpl.content.firstElementChild.cloneNode(true) : null;
  };

  const drawNav = () => {
    nav.querySelectorAll('.ep-nav-item').forEach((item) => {
      const isActive = item.dataset.tab === state.activeTab;
      item.classList.toggle('active', isActive);
      item.querySelector('.ep-nav-arrow')?.remove();
      if (isActive) item.insertAdjacentHTML('beforeend', iconSvg('chevron-right', { size: 16, className: 'ep-nav-arrow' }));
    });
  };

  const setActiveTab = (tab) => {
    if (tab === state.activeTab) return;
    state.cleanup?.();
    state.cleanup = null;
    state.view?.remove();
    state.view = null;

    state.activeTab = tab;
    drawNav();

    const view = buildView(tab);
    if (view) {
      layout.appendChild(view);
      hydrateIcons(view);
      state.view = view;
      state.cleanup = VIEW_SETUP[tab]?.(view) || null;
    }
    scrollToTop();
  };

  // Sidebar items and the hub's cards both carry the section they open.
  on(layout, 'click', '[data-tab]', (_event, el) => setActiveTab(el.dataset.tab));
}
