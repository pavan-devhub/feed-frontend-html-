// Every page script starts with initPage(). It applies the site-wide access rules (the ones the
// React App.jsx used to apply), mounts the shared navbar/footer, turns static <i data-icon> tags
// into SVG icons, wires [data-nav] links, and checks the login with the backend.
//
//   const session = initPage({ page: 'epm' });
//   if (session) { ...page code... }          // null means the page is redirecting away
//
// access:
//   'public' (default) - anyone; an ADMIN account is sent to the admin panel instead
//   'user'             - login required (dashboard, product 360); admins sent to the admin panel
//   'admin'            - ADMIN accounts only
//   'shared'           - anyone, admins included (the stand-alone Feed World reader)
(function () {
  'use strict';

  const { ADMIN_PAGES, navigate, setNavigationGuard, bindNavLinks } = FW.require('core/router');
  const {
    isLoggedIn,
    isAdmin,
    getCachedUser,
    validateSession,
    onUserChange,
    logout,
  } = FW.require('core/auth');
  const { hydrateIcons } = FW.require('core/icons');
  const { mountNavbar } = FW.require('components/navbar');
  const { mountFooter } = FW.require('components/footer');

  function initPage({ page, access = 'public' } = {}) {
    // An ADMIN account only ever sees the admin panel - no public pages, no user dashboard.
    if (access !== 'admin' && access !== 'shared' && isAdmin()) {
      navigate('admin-dashboard', {}, { replace: true });
      return null;
    }
    if ((access === 'user' || access === 'admin') && !isLoggedIn()) {
      navigate('login', {}, { replace: true });
      return null;
    }

    // Any link that would take an admin out of the admin panel (a stray footer or page link)
    // simply does nothing - same as the React app.
    setNavigationGuard((target) => !isAdmin() || ADMIN_PAGES.includes(target));

    const session = {
      page,
      isLoggedIn: isLoggedIn(),
      user: getCachedUser(),
      get isAdmin() {
        return isAdmin(this.user);
      },
      logout: handleLogout,
      // Resolves to the user (or null) once the backend has confirmed the login.
      ready: null,
    };

    const navbarEl = document.getElementById('site-navbar');
    if (navbarEl) mountNavbar(navbarEl, { currentPage: page, onLogout: handleLogout });
    const footerEl = document.getElementById('site-footer');
    if (footerEl) mountFooter(footerEl);

    hydrateIcons(document);
    bindNavLinks(document);

    onUserChange((user) => {
      session.user = user;
      session.isLoggedIn = isLoggedIn();
    });

    session.ready = validateSession().then((user) => {
      session.user = user;
      session.isLoggedIn = isLoggedIn();
      if ((access === 'user' || access === 'admin') && !session.isLoggedIn) {
        navigate('login', {}, { replace: true });
      } else if (access === 'admin' && user && user.role !== 'ADMIN') {
        // Defense in depth only - the real enforcement is server-side (hasRole("ADMIN")).
        navigate('home', {}, { replace: true });
      } else if (access !== 'admin' && access !== 'shared' && user?.role === 'ADMIN') {
        navigate('admin-dashboard', {}, { replace: true });
      }
      return user;
    });

    return session;
  }

  async function handleLogout() {
    await logout();
    navigate('home');
  }

  FW.define('core/page', { initPage });
})();
