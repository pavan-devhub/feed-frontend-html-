// Every page of the site, keyed by the same page ids the old React app used for navigation, so a
// link is always navigate('epm-details') rather than a hand-written relative path. Extra state
// (which EPM, which gallery state/district, which admin section) travels as query parameters,
// which means refresh, back/forward and bookmarks all keep it.
//
// Paths are resolved against the site root (the folder holding index.html), worked out from this
// file's own URL (assets/js/core/router.js) - so the site works from any host path, not only "/".

const SITE_ROOT = new URL('../../../', import.meta.url);

export const ROUTES = {
  home: 'index.html',

  login: 'pages/login.html',
  register: 'pages/register.html',
  contact: 'pages/contact.html',
  how: 'pages/how-feed-works.html',

  fpo: 'pages/fpo.html',
  exports: 'pages/exports.html',
  tools: 'pages/tools.html',
  product360: 'pages/product-360.html',
  'safe-mission': 'pages/safe-mission.html',
  'trade-fairs': 'pages/trade-fairs.html',
  TradeFairs: 'pages/trade-fairs.html',

  dashboard: 'pages/dashboard.html',

  mybusiness: 'pages/my-business.html',
  'business-account': 'pages/business-account.html',
  'agm-board': 'pages/agm-board.html',
  'business-plan': 'pages/business-plan.html',
  // My Business modules that are still being built share one placeholder page (?tab=<id>)
  'business-profile': 'pages/coming-soon.html?tab=business-profile',
  compliances: 'pages/coming-soon.html?tab=compliances',
  'loans-schemes': 'pages/coming-soon.html?tab=loans-schemes',
  marketing: 'pages/coming-soon.html?tab=marketing',
  reports: 'pages/coming-soon.html?tab=reports',
  connect: 'pages/coming-soon.html?tab=connect',

  feedworld: 'pages/feed-world.html',
  'publication-reader': 'pages/publication-reader.html', // ?id=<publicationId>

  epm: 'pages/epm.html',
  'epm-details': 'pages/epm-directory.html',
  'epm-event-details': 'pages/epm-event.html', // ?eventId=
  'epm-gallery': 'pages/epm-gallery.html',
  'epm-gallery-state': 'pages/epm-gallery-state.html', // ?state=
  'epm-gallery-district': 'pages/epm-gallery-district.html', // ?state=&district=
  'epm-objective': 'pages/epm-objective.html',
  'epm-content-coverage': 'pages/epm-content-coverage.html',
  'epm-benefits': 'pages/epm-benefits.html',
  'epm-invitees': 'pages/epm-invitees.html',
  'epm-register': 'pages/epm-register.html',
  'epm-volunteer': 'pages/epm-volunteer.html',

  'admin-dashboard': 'pages/admin.html', // ?section=
};

// The only page an ADMIN account may use (see core/page.js).
export const ADMIN_PAGES = ['admin-dashboard'];

// Absolute URL of a page, with params added as the query string (null/undefined/'' skipped).
export function pageUrl(page, params = {}) {
  const path = ROUTES[page];
  if (!path) throw new Error(`Unknown page "${page}"`);
  const url = new URL(path, SITE_ROOT);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  });
  return url.href;
}

// Absolute URL of a file under assets/, e.g. assetUrl('images/epm/epm-msme.avif').
export function assetUrl(path) {
  return new URL(`assets/${String(path).replace(/^\/+/, '')}`, SITE_ROOT).href;
}

let navigationGuard = null;

// core/page.js installs this so an admin can't navigate out of the admin panel.
export function setNavigationGuard(guard) {
  navigationGuard = guard;
}

// Goes to another page. Returns false (and does nothing) when the guard blocks it.
export function navigate(page, params = {}, { replace = false } = {}) {
  if (navigationGuard && !navigationGuard(page)) return false;
  const url = pageUrl(page, params);
  if (replace) window.location.replace(url);
  else window.location.assign(url);
  return true;
}

// Current page's query parameters as a plain object.
export function getParams() {
  return Object.fromEntries(new URLSearchParams(window.location.search));
}

export const getParam = (name) => new URLSearchParams(window.location.search).get(name);

// Updates the query string without reloading - for in-page state such as a selected tab.
// push=true adds a history entry (so back returns to the previous state), otherwise replaces.
export function setParams(params, { push = false } = {}) {
  const url = new URL(window.location.href);
  url.search = '';
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  });
  if (push) window.history.pushState(null, '', url);
  else window.history.replaceState(null, '', url);
}

// Wires every [data-nav="page-id"] element under root to navigate(); optional
// data-nav-params='{"state":"andhra-pradesh"}' supplies query params. Lets static HTML link
// between pages by id instead of by relative path.
export function bindNavLinks(root = document) {
  root.addEventListener('click', (event) => {
    const el = event.target.closest('[data-nav]');
    if (!el || !root.contains(el)) return;
    event.preventDefault();
    let params = {};
    if (el.dataset.navParams) {
      try {
        params = JSON.parse(el.dataset.navParams);
      } catch {
        params = {};
      }
    }
    navigate(el.dataset.nav, params);
  });
}
