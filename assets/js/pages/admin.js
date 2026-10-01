// The one admin panel for the whole site (pages/admin.html) - Feed World publications and every EPM
// screen share a login (the ADMIN role) and this shell. Which section is open lives in the query
// string (?section=<id>, plus that section's own params, e.g. &eventId=12), so refresh and
// back/forward keep it.
//
// Every section module exports mount(container, ctx) and may return a cleanup function:
//   ctx = { params, openSection(id, params), user, kind }
//   params - the current query params as a plain object
//   kind   - 'registrations' | 'volunteers' for the shared EPM submissions section
import { initPage } from '../core/page.js';
import { on, qs, qsa, scrollToTop } from '../core/dom.js';
import { getParams, setParams } from '../core/router.js';
import { onUserChange } from '../core/auth.js';
import { mount as mountOverview } from './admin/overview.js';
import { mount as mountPublications } from './admin/publications.js';
import { mount as mountEpmEvents } from './admin/epm-events.js';
import { mount as mountEpmSubmissions } from './admin/epm-submissions.js';
import { mount as mountEpmCategories } from './admin/epm-categories.js';
import { mount as mountEpmVenues } from './admin/epm-venues.js';
import { mount as mountEpmImages } from './admin/epm-images.js';
import { mount as mountEpmReviews } from './admin/epm-reviews.js';

// Same ids as the sidebar buttons in pages/admin.html.
const SECTIONS = {
  overview: { mount: mountOverview },
  feedworld: { mount: mountPublications },
  'epm-events': { mount: mountEpmEvents },
  'epm-registrations': { mount: mountEpmSubmissions, kind: 'registrations' },
  'epm-volunteers': { mount: mountEpmSubmissions, kind: 'volunteers' },
  'epm-categories': { mount: mountEpmCategories },
  'epm-venues': { mount: mountEpmVenues },
  'epm-images': { mount: mountEpmImages },
  'epm-reviews': { mount: mountEpmReviews },
};

const session = initPage({ page: 'admin-dashboard', access: 'admin' });

if (session) {
  // Nothing is shown until the backend has confirmed this is an ADMIN login (anyone else is sent
  // away by initPage).
  session.ready.then((user) => {
    if (session.isLoggedIn && user?.role === 'ADMIN') startAdminPanel(user);
  });
}

function startAdminPanel(initialUser) {
  const pageEl = qs('.adm-page');
  const main = qs('.adm-main', pageEl);
  const navButtons = qsa('.adm-nav-item[data-section]', pageEl);
  let user = initialUser;
  let cleanup = null;
  let mountCount = 0;

  onUserChange((next) => {
    if (next) user = next;
  });

  const runCleanup = () => {
    const fn = cleanup;
    cleanup = null;
    if (typeof fn === 'function') {
      try {
        fn();
      } catch (e) {
        console.error('[admin] section cleanup failed', e);
      }
    }
  };

  function mountCurrent() {
    const params = getParams();
    const current = SECTIONS[params.section] ? params.section : 'overview';

    navButtons.forEach((btn) => {
      const active = btn.dataset.section === current;
      btn.className = `adm-nav-item ${active ? 'active' : ''}`;
      if (active) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });

    runCleanup();
    main.replaceChildren();
    scrollToTop();

    const section = SECTIONS[current];
    const mountId = ++mountCount;
    let result;
    try {
      result = section.mount(main, { params, openSection, user, kind: section.kind });
    } catch (e) {
      console.error(`[admin] section "${current}" failed to mount`, e);
      return;
    }
    if (typeof result === 'function') {
      cleanup = result;
    } else if (result && typeof result.then === 'function') {
      // A section may also hand its cleanup back asynchronously.
      result.then((fn) => {
        if (typeof fn !== 'function') return;
        if (mountId === mountCount) cleanup = fn;
        else fn();
      }, (e) => console.error(`[admin] section "${current}" failed to mount`, e));
    }
  }

  function openSection(id, params = {}) {
    setParams({ section: id, ...params }, { push: true });
    mountCurrent();
  }

  // Back/forward between sections re-mounts whichever one the history entry points at.
  if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
  window.addEventListener('popstate', mountCurrent);

  on(pageEl, 'click', '.adm-nav-item[data-section]', (_event, btn) => openSection(btn.dataset.section));

  pageEl.removeAttribute('style');
  mountCurrent();
}
