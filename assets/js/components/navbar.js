// Site-wide top navigation, mounted by core/page.js into <div id="site-navbar"></div>.
// Brand, page links, the Services mega menu, search, the account button/profile menu (profile
// photo upload, Dashboard, Devices, Logout), the mobile drawer, and hide-on-scroll.
(function () {
  'use strict';

  const { API_BASE_URL } = FW.require('core/config');
  const { html, render, on, cx } = FW.require('core/dom');
  const { icon } = FW.require('core/icons');
  const { navigate, assetUrl } = FW.require('core/router');
  const {
    getToken,
    isLoggedIn: hasToken,
    getCachedUser,
    setCurrentUser,
    onUserChange,
  } = FW.require('core/auth');
  const { openDevicesModal } = FW.require('components/devices-modal');

  // Above this length the full name no longer fits the pill comfortably, so only the first word
  // (the first name) is shown instead.
  const ACCOUNT_LABEL_MAX_LENGTH = 12;

  const getAccountLabel = (user) => {
    const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
    if (!fullName) return 'My Account';
    return fullName.length > ACCOUNT_LABEL_MAX_LENGTH ? fullName.split(/\s+/)[0] : fullName;
  };

  const servicesMegaMenu = [
    { name: 'KRUSHI YEVA JAYATE', num: '01', color: 'green', img: 'icons/icon-krushi-yeva-jayate.png' },
    { name: 'YUVA KRUSHI', num: '02', color: 'green-light', img: 'icons/icon-yuva-krushi.svg' },
    { name: 'MY ORG', num: '03', color: 'blue', img: 'icons/icon-buyers-connection.avif' },
    { name: 'MY EXPORTS', num: '04', color: 'teal', img: 'icons/icon-country-selection.avif' },
    { name: 'LOANS & FINANCE', num: '05', color: 'yellow', img: 'icons/icon-finance.avif' },
    { name: 'PRODUCT 360', num: '06', color: 'orange', img: 'icons/icon-product-selection.avif' },
    { name: 'MY BUSINESS', num: '07', color: 'purple', img: 'icons/icon-process-order.avif' },
    { name: 'MY EDUCATION', num: '08', color: 'pink', img: 'icons/icon-documentation.avif' },
    { name: 'FEED WORLD', num: '09', color: 'blue-light', img: 'icons/icon-why-exports.avif' },
    { name: 'EPM', num: '10', color: 'green-light', img: 'icons/icon-start-exports.avif' },
    { name: 'TRADE FAIRS', num: '11', color: 'orange-light', img: 'icons/icon-trade-updates.avif' },
    { name: 'SAFE MISSION', num: '12', color: 'teal', img: 'icons/icon-policies.avif' },
    { name: 'MY TOOLS', num: '13', color: 'purple-light', img: 'icons/icon-tools-services.avif' },
    { name: 'KNOW YOUR SCHEMES', num: '14', color: 'yellow', img: 'icons/icon-policies.avif' },
    { name: 'MY MARKET', num: '15', color: 'orange', img: 'icons/icon-product-selection.avif' },
    { name: 'FEED CARD', num: '16', color: 'blue', img: 'icons/icon-tariffs.avif' },
  ];

  // Maps a mega-menu tile to the page it should open; tiles with no entry are inert.
  const SERVICE_ROUTES = {
    'PRODUCT 360': 'product360',
    'MY EXPORTS': 'exports',
    'MY TOOLS': 'tools',
    'MY BUSINESS': 'mybusiness',
    'FEED WORLD': 'feedworld',
    EPM: 'epm',
    'TRADE FAIRS': 'trade-fairs',
    'SAFE MISSION': 'safe-mission',
  };

  // `route` links a nav item to the page id that should light it up; items without one (About Us,
  // Services, Events & Updates, Export Road Map) are same-page actions rather than distinct pages.
  const NAV_ITEMS = [
    { id: 'home', label: 'Home', icon: 'home', route: 'home' },
    { id: 'about', label: 'About Us', icon: 'building-2', hasDropdown: true },
    { id: 'services', label: 'Services', icon: 'settings', hasDropdown: true },
    { id: 'events', label: 'Events & Updates', icon: 'calendar' },
    { id: 'roadmap', label: 'Export Road Map', icon: 'map' },
    { id: 'how', label: 'How Feed Works', icon: 'activity', route: 'how' },
    { id: 'fpo', label: 'FPO', icon: 'users', route: 'fpo' },
    { id: 'exports', label: 'Exports', icon: 'package', route: 'exports' },
    { id: 'contact', label: 'Contact Us', icon: 'phone-call', route: 'contact' },
  ];

  const MOBILE_ICON_STYLE = [
    { bg: '#fff7ed', fg: '#ea580c' }, // home
    { bg: '#fff7ed', fg: '#ea580c' }, // about
    { bg: '#fef9c3', fg: '#ca8a04' }, // services
    { bg: '#fef9c3', fg: '#ca8a04' }, // events
    { bg: '#ecfccb', fg: '#65a30d' }, // roadmap
    { bg: '#f0fdf4', fg: '#16a34a' }, // how
    { bg: '#f0fdf4', fg: '#16a34a' }, // fpo
    { bg: '#f0fdf4', fg: '#15803d' }, // exports
    { bg: '#f0fdf4', fg: '#15803d' }, // contact
  ];

  const ANIMATIONS = ['flyInLeft', 'flyInTop', 'flyInBottom', 'flyInRight'];

  const PROFILE_BTN_STYLE = 'width: 100%; padding: 10px 12px; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 8px; font-size: 13px; justify-content: center;';

  function mountNavbar(root, { currentPage = '', onLogout } = {}) {
    const state = {
      user: getCachedUser(),
      isLoggedIn: hasToken(),
      servicesOpen: false,
      profileOpen: false,
      devicesOpen: false,
      mobileOpen: false,
      mobileServicesOpen: false,
      avatarPath: null,
      avatarVersion: 0,
      avatarBusy: false,
      avatarError: '',
    };
    state.avatarPath = state.user?.profileImageUrl || null;
    let devices = null;
    let bodyLocked = false;

    // An ADMIN account only uses the admin panel, so its navbar is just the brand and the profile
    // button (with Logout) - no page links, search or mobile menu.
    const adminMode = () => Boolean(state.isLoggedIn && state.user?.role === 'ADMIN');

    // Cache-busted so re-uploading a new photo doesn't keep showing the old one from the browser
    // cache - the URL path itself never changes across uploads.
    const avatarSrc = () => (state.avatarPath
      ? `${API_BASE_URL}${state.avatarPath}${state.avatarPath.includes('?') ? '&' : '?'}v=${state.avatarVersion}`
      : null);

    const logoBadge = html`<span class="fw-navbar-logo-badge"><img src="${assetUrl('images/dashboard-logo.avif')}" alt="Feed World" /></span>`;

    const servicesMenuHtml = () => html`
    <div class="fw-services-dropdown fw-services-mega">
      <div style="height: 32%; width: 100%;"></div>
      <div class="srv-cards-grid" style="flex: 1; padding: 0 5% 4% 5%;">
        ${servicesMegaMenu.map((service, sIdx) => {
            const clickable = Boolean(SERVICE_ROUTES[service.name]);
            return html`
            <div class="srv-card service-btn-animated" data-action="service" data-name="${service.name}"
              style="animation: ${ANIMATIONS[sIdx % 4]} 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${sIdx * 0.05}s forwards;${clickable ? ' cursor: pointer;' : ''}">
              <div class="srv-card-badge color-${service.color}">${service.num}</div>
              <div class="srv-card-content">
                <div class="srv-icon-circle color-${service.color}">
                  <img src="${assetUrl(service.img)}" alt="${service.name}" class="srv-card-image" />
                </div>
                <div class="srv-card-text-area"><h3>${service.name}</h3></div>
              </div>
            </div>`;
          })}
      </div>
    </div>`;

    const profileMenuHtml = () => {
      const src = avatarSrc();
      const { user } = state;
      return html`
      <div class="fw-account-dropdown">
        <div style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; margin-bottom: 8px; display: flex; align-items: center; gap: 10px;">
          <div class="fw-account-avatar-edit" data-action="pick-avatar" title="Change profile picture">
            ${src ? html`<img src="${src}" alt="" />`
                : html`<span>${user?.firstName ? user.firstName.charAt(0).toUpperCase() : icon('user', { size: 16 })}</span>`}
            <span class="fw-account-avatar-edit-badge">${icon('camera', { size: 11 })}</span>
          </div>
          <div style="min-width: 0; flex: 1;">
            <div style="font-weight: 600; color: #1e293b; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${user?.firstName} ${user?.lastName}
            </div>
            <div style="color: #64748b; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${user?.email}
            </div>
          </div>
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden data-role="avatar-input" />
        </div>

        ${state.avatarBusy && html`<div style="font-size: 11px; color: #64748b; padding: 0 12px 8px;">Updating photo…</div>`}
        ${state.avatarError && html`<div style="font-size: 11px; color: #ef4444; padding: 0 12px 8px;">${state.avatarError}</div>`}
        ${src && !state.avatarBusy && html`
          <button type="button" data-action="remove-avatar"
            style="width: 100%; padding: 6px 12px; background: none; color: #94a3b8; border: none; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 6px; font-size: 12px; justify-content: center; margin-bottom: 4px;">
            ${icon('trash-2', { size: 12 })} Remove photo
          </button>`}

        ${!adminMode() && html`
          <button type="button" data-action="dashboard" style="${PROFILE_BTN_STYLE} background-color: #ffedd5; color: #ea580c; margin-bottom: 8px;">
            ${icon('layout-dashboard', { size: 14 })} Dashboard
          </button>
          <button type="button" data-action="devices" style="${PROFILE_BTN_STYLE} background-color: #f1f5f9; color: #334155; margin-bottom: 8px;">
            ${icon('laptop', { size: 14 })} Devices
          </button>`}

        <button type="button" data-action="logout" style="${PROFILE_BTN_STYLE} background-color: #fee2e2; color: #ef4444;">
          ${icon('log-out', { size: 14 })} Logout
        </button>
      </div>`;
    };

    const mobileDrawerHtml = () => html`
    <div class="fw-mobile-backdrop" data-action="close-mobile"></div>
    <div class="fw-mobile-panel" role="dialog" aria-modal="true" aria-label="Mobile navigation">
      <div class="fw-mobile-header">
        <div class="fw-mobile-header-brand">
          <span class="fw-mobile-logo-badge"><img src="${assetUrl('images/dashboard-logo.avif')}" alt="Feed World" /></span>
          <span class="fw-mobile-header-title">FEED WORLD</span>
        </div>
        <button type="button" class="fw-mobile-close" aria-label="Close menu" data-action="close-mobile">${icon('x', { size: 18 })}</button>
      </div>

      <ul class="fw-mobile-nav">
        ${NAV_ITEMS.map((item, idx) => {
            const active = Boolean(item.route) && currentPage === item.route;
            const isServicesItem = item.id === 'services';
            const open = isServicesItem && state.mobileServicesOpen;
            const iconStyle = MOBILE_ICON_STYLE[idx];
            return html`
            <li class="${cx('fw-mobile-nav-item', active && 'active', open && 'open')}">
              <button type="button" class="fw-mobile-nav-btn" data-action="mobile-item" data-id="${item.id}"
                ${active ? 'aria-current="page"' : ''} ${isServicesItem ? `aria-expanded="${state.mobileServicesOpen}"` : ''}>
                <span class="fw-mobile-nav-icon-chip" style="background: ${iconStyle.bg}; color: ${iconStyle.fg};">
                  ${icon(item.icon, { size: 16, strokeWidth: 2 })}
                </span>
                <span class="fw-mobile-nav-label">${item.label}</span>
                ${item.hasDropdown && icon('chevron-down', { size: 14, strokeWidth: 2.5, className: 'fw-mobile-chevron' })}
              </button>
              ${open && html`
                <div class="fw-mobile-submenu">
                  ${servicesMegaMenu.map((service) => html`
                    <button type="button" class="fw-mobile-submenu-item" data-action="service" data-name="${service.name}"
                      ${SERVICE_ROUTES[service.name] ? '' : 'disabled'}>
                      <img src="${assetUrl(service.img)}" alt="" />
                      ${service.name}
                    </button>`)}
                </div>`}
            </li>`;
          })}
      </ul>

      <div class="fw-mobile-footer">
        <button type="button" class="fw-mobile-search" aria-label="Search">${icon('search', { size: 15 })} Search</button>
        ${!state.isLoggedIn
            ? html`
            <button type="button" class="fw-mobile-login" data-action="go" data-page="login">Login</button>
            <button type="button" class="fw-mobile-register" data-action="go" data-page="register">Register</button>`
            : html`<button type="button" class="fw-mobile-login" data-action="go" data-page="dashboard">Dashboard</button>`}
      </div>
    </div>`;

    const draw = () => {
      const admin = adminMode();
      const src = avatarSrc();
      const { user } = state;
      const nav = root.querySelector('.fw-nav-root');
      const hidden = nav ? nav.classList.contains('fw-nav-hidden') : false;

      render(root, html`
      ${state.servicesOpen && html`<div class="fw-services-overlay" data-action="close-services"></div>`}

      <nav class="${cx('fw-nav-root', hidden && 'fw-nav-hidden', admin && 'fw-nav-admin')}" aria-label="Main navigation">
        <div class="fw-navbar">
          ${admin
              ? html`
              <div class="fw-navbar-logo fw-navbar-logo--static">
                ${logoBadge}
                <span class="fw-navbar-logo-text">
                  <span class="fw-navbar-logo-title">FEED WORLD</span>
                  <span class="fw-navbar-logo-tagline">Admin panel</span>
                </span>
              </div>`
              : html`
              <button type="button" class="fw-navbar-logo" data-action="go" data-page="home" aria-label="Feed World home">
                ${logoBadge}
                <span class="fw-navbar-logo-text">
                  <span class="fw-navbar-logo-title">FEED WORLD</span>
                  <span class="fw-navbar-logo-tagline">Empowering Farmers, Enriching Futures</span>
                </span>
              </button>`}

          ${!admin && html`
            <span class="fw-navbar-divider" aria-hidden="true"></span>
            <ul class="fw-navbar-links">
              ${NAV_ITEMS.map((item) => {
                  const active = Boolean(item.route) && currentPage === item.route;
                  const isServicesItem = item.id === 'services';
                  return html`
                  <li class="${cx('fw-nav-item', active && 'active', isServicesItem && state.servicesOpen && 'open')}"
                    ${isServicesItem ? 'data-role="services-item"' : ''}>
                    <button type="button" class="fw-nav-btn" data-action="nav-item" data-id="${item.id}"
                      ${active ? 'aria-current="page"' : ''}
                      ${isServicesItem ? `aria-haspopup="true" aria-expanded="${state.servicesOpen}"` : ''}>
                      ${icon(item.icon, { size: 16, strokeWidth: 1.75, className: 'fw-nav-icon' })}
                      <span class="fw-nav-label-row">
                        <span class="fw-nav-label">${item.label}</span>
                        ${item.hasDropdown && icon('chevron-down', { size: 10, strokeWidth: 3, className: 'fw-nav-chevron' })}
                      </span>
                    </button>
                    ${isServicesItem && state.servicesOpen && servicesMenuHtml()}
                  </li>`;
                })}
            </ul>
            <span class="fw-navbar-divider fw-navbar-divider--actions" aria-hidden="true"></span>`}

          <div class="fw-navbar-actions">
            ${!admin && html`
              <button type="button" class="fw-search-btn" aria-label="Search">${icon('search', { size: 15, strokeWidth: 2.25 })}</button>`}

            <div class="fw-account-wrap" data-role="account-wrap">
              <button type="button" class="fw-account-btn" data-action="account"
                ${state.isLoggedIn ? `aria-haspopup="true" aria-expanded="${state.profileOpen}"` : ''}>
                <span class="fw-account-icon">
                  ${state.isLoggedIn && src ? html`<img src="${src}" alt="" class="fw-account-avatar-img" />`
                      : state.isLoggedIn && user?.firstName ? user.firstName.charAt(0).toUpperCase()
                        : icon('user', { size: 13, strokeWidth: 2.5 })}
                </span>
                <span class="fw-account-label">${state.isLoggedIn ? getAccountLabel(user) : 'My Account'}</span>
              </button>
              ${state.isLoggedIn && state.profileOpen && profileMenuHtml()}
            </div>
          </div>
        </div>

        ${!admin && html`
          <button type="button" class="fw-hamburger" data-action="toggle-mobile"
            aria-label="${state.mobileOpen ? 'Close menu' : 'Open menu'}" aria-expanded="${state.mobileOpen}">
            ${icon(state.mobileOpen ? 'x' : 'menu', { size: 20 })}
          </button>`}
      </nav>

      ${state.mobileOpen && !admin && mobileDrawerHtml()}`);

      // Lock page scroll only while the drawer is open - and only touch it when that changes, so a
      // page's own modal that locked scrolling isn't undone by a navbar redraw.
      if (state.mobileOpen !== bodyLocked) {
        bodyLocked = state.mobileOpen;
        document.body.style.overflow = bodyLocked ? 'hidden' : '';
      }
    };

    const set = (patch) => {
      Object.assign(state, patch);
      draw();
    };

    // --- profile photo -------------------------------------------------------------------------

    const notifyProfileImageUpdated = (profileImageUrl) => {
      if (state.user) setCurrentUser({ ...state.user, profileImageUrl });
    };

    const uploadAvatar = async (file) => {
      const token = getToken();
      if (!token) return;
      set({ avatarBusy: true, avatarError: '' });
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${API_BASE_URL}/api/users/me/profile-image`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || 'Failed to update profile picture');
        state.avatarPath = data.profileImageUrl;
        state.avatarVersion += 1;
        notifyProfileImageUpdated(data.profileImageUrl);
      } catch (err) {
        state.avatarError = err.message || 'Failed to update profile picture';
      } finally {
        set({ avatarBusy: false });
      }
    };

    const removeAvatar = async () => {
      const token = getToken();
      if (!token) return;
      set({ avatarBusy: true, avatarError: '' });
      try {
        const res = await fetch(`${API_BASE_URL}/api/users/me/profile-image`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || 'Failed to remove profile picture');
        }
        state.avatarPath = null;
        notifyProfileImageUpdated(null);
      } catch (err) {
        state.avatarError = err.message || 'Failed to remove profile picture';
      } finally {
        set({ avatarBusy: false });
      }
    };

    // --- actions -------------------------------------------------------------------------------

    const scrollToAboutUs = () => {
      const el = document.getElementById('about-us');
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 100;
        window.scrollTo({ top: y, behavior: 'smooth' });
      } else {
        navigate('home');
      }
    };

    const go = (page) => {
      state.mobileOpen = false;
      state.servicesOpen = false;
      draw();
      navigate(page);
    };

    on(root, 'click', '[data-action]', (_event, el) => {
      const { action } = el.dataset;
      switch (action) {
        case 'go':
          go(el.dataset.page);
          break;
        case 'nav-item': {
          const item = NAV_ITEMS.find((i) => i.id === el.dataset.id);
          if (item.id === 'services') set({ servicesOpen: !state.servicesOpen });
          else if (item.id === 'about') scrollToAboutUs();
          else if (item.route) navigate(item.route);
          break;
        }
        case 'mobile-item': {
          const item = NAV_ITEMS.find((i) => i.id === el.dataset.id);
          if (item.id === 'services') set({ mobileServicesOpen: !state.mobileServicesOpen });
          else if (item.id === 'about') {
            set({ mobileOpen: false });
            scrollToAboutUs();
          } else if (item.route) go(item.route);
          break;
        }
        case 'service': {
          const target = SERVICE_ROUTES[el.dataset.name];
          if (target) go(target);
          break;
        }
        case 'close-services':
          set({ servicesOpen: false });
          break;
        case 'toggle-mobile':
          set({ mobileOpen: !state.mobileOpen });
          break;
        case 'close-mobile':
          set({ mobileOpen: false });
          break;
        case 'account':
          if (!state.isLoggedIn) {
            navigate('login');
          } else if (state.devicesOpen) {
            devices?.close();
          } else {
            set({ profileOpen: !state.profileOpen });
          }
          break;
        case 'pick-avatar':
          if (!state.avatarBusy) root.querySelector('[data-role="avatar-input"]')?.click();
          break;
        case 'remove-avatar':
          removeAvatar();
          break;
        case 'dashboard':
          set({ profileOpen: false });
          navigate('dashboard');
          break;
        case 'devices': {
          set({ profileOpen: false, devicesOpen: true });
          devices = openDevicesModal({
            anchor: root.querySelector('[data-role="account-wrap"]'),
            onClose: () => {
              devices = null;
              state.devicesOpen = false;
            },
          });
          break;
        }
        case 'logout':
          set({ profileOpen: false });
          if (onLogout) onLogout();
          break;
        default:
          break;
      }
    });

    root.addEventListener('change', (event) => {
      if (event.target.matches('[data-role="avatar-input"]')) {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (file) uploadAvatar(file);
      }
    });

    // Outside clicks close the services menu / profile menu.
    document.addEventListener('mousedown', (event) => {
      const servicesItem = root.querySelector('[data-role="services-item"]');
      const accountWrap = root.querySelector('[data-role="account-wrap"]');
      const patch = {};
      if (state.servicesOpen && servicesItem && !servicesItem.contains(event.target)) patch.servicesOpen = false;
      if (state.profileOpen && accountWrap && !accountWrap.contains(event.target)) patch.profileOpen = false;
      if (Object.keys(patch).length) set(patch);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && (state.servicesOpen || state.profileOpen || state.mobileOpen)) {
        set({ servicesOpen: false, profileOpen: false, mobileOpen: false });
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 1024 && state.mobileOpen) set({ mobileOpen: false });
    });

    // Auto-hide navbar on scroll down, show on scroll up. Only meaningful scrolls (>10px) count,
    // to avoid jitter.
    let lastScrollY = window.scrollY;
    window.addEventListener('scroll', () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY;
      const nav = root.querySelector('.fw-nav-root');
      if (delta > 10 && currentY > 80) {
        nav?.classList.add('fw-nav-hidden');
        if (state.servicesOpen) set({ servicesOpen: false });
      } else if (delta < -10) {
        nav?.classList.remove('fw-nav-hidden');
      }
      lastScrollY = currentY;
    }, { passive: true });

    onUserChange((user) => {
      state.user = user;
      state.isLoggedIn = hasToken();
      state.avatarPath = user?.profileImageUrl || null;
      draw();
    });

    draw();
  }

  FW.define('components/navbar', { servicesMegaMenu, mountNavbar });
})();
