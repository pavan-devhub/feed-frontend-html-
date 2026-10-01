# Feed World Frontend - Developer Guide

Plain HTML + CSS + JavaScript (ES modules). No framework, no build step, no `npm install`.
This guide explains how the site is organised and how to add or change a page.

---

## 1. Project structure

```
feed-frontend/
├── index.html                    Home page - the site entry point
├── pages/                        Every other page (one flat folder)
│   ├── login.html
│   ├── register.html
│   ├── contact.html
│   ├── epm.html
│   ├── epm-gallery.html
│   ├── admin.html
│   └── ...
├── assets/
│   ├── css/
│   │   ├── global.css            Site-wide styles - first stylesheet on every page
│   │   ├── components/           Shared UI pieces (navbar, footer, dialogs, viewers, hubs ...)
│   │   ├── pages/                One stylesheet per page (named after the page)
│   │   └── vendor/               Third-party CSS (pdf.js layers)
│   ├── js/
│   │   ├── core/                 Foundation: config, router, auth, page bootstrap, DOM helpers, icons, i18n
│   │   ├── api/                  Backend API clients
│   │   ├── utils/                Small pure helpers (dates, categories, links)
│   │   ├── data/                 Static data (Product 360 tree, ERS questions, plans)
│   │   ├── components/           Reusable UI pieces (navbar, footer, dialogs, viewers ...)
│   │   ├── pages/                One entry script per page, named after the page
│   │   │   └── <page>/           Optional: extra modules of a large page (e.g. pages/admin/)
│   │   └── vendor/               Third-party JS (pdf.js)
│   ├── images/                   Photos, illustrations, favicon
│   ├── icons/                    Service tile icons
│   ├── videos/                   Hero videos
│   └── locales/                  Translation files (en.json, hi.json, te.json, ...)
├── docs/                         This guide
└── README.md
```

**Naming convention** - files are `kebab-case`, and a page's three files share its name:

| Page | HTML | Script | Styles |
|---|---|---|---|
| Home | `index.html` | `assets/js/pages/home.js` | `assets/css/pages/home.css` |
| EPM gallery | `pages/epm-gallery.html` | `assets/js/pages/epm-gallery.js` | `assets/css/pages/epm-gallery.css` |

---

## 2. Anatomy of a page

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>EPM | Feed World</title>
  <link rel="icon" type="image/svg+xml" href="../assets/images/favicon.svg" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />

  <!-- 1. global  2. navbar + footer  3. shared components used here  4. this page -->
  <link rel="stylesheet" href="../assets/css/global.css" />
  <link rel="stylesheet" href="../assets/css/components/navbar.css" />
  <link rel="stylesheet" href="../assets/css/components/footer.css" />
  <link rel="stylesheet" href="../assets/css/pages/epm.css" />

  <script src="../assets/js/core/file-protocol-check.js"></script>
  <script type="module" src="../assets/js/pages/epm.js"></script>
</head>
<body>
  <div class="app-container is-home">
    <div class="main-content-bg">
      <div class="epm-page">
        <div id="site-navbar"></div>      <!-- navbar is rendered here -->
        ... page markup ...
        <div id="site-footer"></div>      <!-- footer is rendered here -->
      </div>
    </div>
  </div>
</body>
</html>
```

* Paths are **relative**: `assets/...` from `index.html`, `../assets/...` from `pages/*.html`.
  Never use root-absolute paths like `/assets/x.avif` - the site must also work from a sub-folder.
* Module scripts are deferred automatically, so the markup is ready when the script runs.
* The `app-container` / `main-content-bg` wrappers are referenced by `global.css`. Most pages use
  `class="app-container is-home"`; Trade Fairs and the EPM event page use `class="app-container"`;
  login, register, contact, product 360 and the publication reader have no wrapper.

### The page script

```js
// assets/js/pages/epm.js
import { initPage } from '../core/page.js';

const session = initPage({ page: 'epm' });   // page id from assets/js/core/router.js
if (session) {
  // page code - only runs when the visitor is allowed on this page
}
```

`initPage({ page, access })` - `access` is one of:

| access     | who may open the page                                                    |
|------------|---------------------------------------------------------------------------|
| `'public'` | everyone (default). An ADMIN account is sent to the admin panel instead.  |
| `'user'`   | logged-in users only (others go to login). Dashboard, Product 360.        |
| `'admin'`  | ADMIN accounts only. The admin panel.                                     |
| `'shared'` | everyone including admins. The stand-alone publication reader.            |

It mounts the navbar/footer, converts `<i data-icon>` tags to SVG icons, wires `data-nav` links
and validates the login with `GET /api/auth/me`. The returned `session` has `isLoggedIn`, `user`
(cached user or `null`), `isAdmin`, `logout()` and `ready` - a promise resolving to the confirmed
user. Use `onUserChange(cb)` from `core/auth.js` to react when the user loads or changes.

---

## 3. Navigation

Pages are addressed by **id**, never by hand-written paths. The ids and files live in
`assets/js/core/router.js` (`ROUTES`).

```js
import { navigate, pageUrl, getParam, setParams, assetUrl } from '../core/router.js';

navigate('epm-details');                                   // go to a page
navigate('epm-gallery-state', { state: 'andhra-pradesh' }); // with query params
const stateId = getParam('state');                         // read a query param
const href = pageUrl('feedworld');                         // URL string (for <a href>, window.open)
setParams({ tab: 'plans' }, { push: true });               // in-page state, no reload
```

In static HTML: `<button data-nav="contact">Contact Us</button>` (optional
`data-nav-params='{"state":"ap"}'`). `initPage` wires these automatically.

Page state that should survive refresh / back / bookmarks (which EPM, which gallery state, which
admin section) lives in the query string.

---

## 4. Assets

* HTML: relative path - `<img src="../assets/images/epm/epm-msme.avif">`
* JS: `assetUrl('images/epm/epm-msme.avif')` (correct from any page)
* CSS: relative to the CSS file - from `assets/css/pages/x.css` use `url('../../images/hero_bg.avif')`

---

## 5. Rendering dynamic content

Static content is written directly in the HTML file. JavaScript only renders what depends on data
or interaction (API results, tabs, forms, dialogs). Helpers in `assets/js/core/dom.js`:

```js
import { html, raw, render, on, cx, qs, qsa, toElement, scrollToTop } from '../core/dom.js';
import { icon } from '../core/icons.js';

render(listEl, html`
  <ul>
    ${events.map((e) => html`
      <li class="${cx('event-card', e.featured && 'featured')}" data-id="${e.id}">
        ${icon('calendar', { size: 16 })} ${e.title}
      </li>`)}
  </ul>`);

on(listEl, 'click', '.event-card', (event, card) => openEvent(card.dataset.id));
```

* `html`...`` **escapes every interpolated value** - API data is safe by default. Nested
  `html`` `, `icon()` and `raw()` values are inserted as markup. `null`, `undefined`, `false`
  and `true` render nothing, arrays are joined (so `${cond && html`...`}` works).
* Always quote attribute values: `class="${x}"`.
* `raw(string)` marks trusted markup - never pass user/API data through it.
* `on(root, type, selector, handler)` is a delegated listener: it keeps working after `render()`
  replaces the content, so attach it once.
* Pattern for interactive widgets: keep a `state` object, write a `draw()` that renders from it,
  and call `draw()` after every change.

### Icons

`icon(name, { size, strokeWidth, color, className, fill, style })` returns an inline SVG (lucide
icons). Names are kebab-case: `'chevron-right'`, `'bar-chart-3'`. In static HTML:
`<i data-icon="chevron-right" data-size="16" data-stroke-width="2.5" class="my-class"></i>`.
The full list is in `assets/js/core/icons.js`.

---

## 6. Shared modules (`assets/js/`)

| Module | Exports |
|---|---|
| `core/config.js` | `API_BASE_URL` (backend on the same host, port 8080) |
| `core/router.js` | `ROUTES`, `navigate`, `pageUrl`, `assetUrl`, `getParam`, `getParams`, `setParams`, `bindNavLinks` |
| `core/auth.js` | `getToken`, `isLoggedIn`, `authHeaders`, `isAdmin`, `getCachedUser`, `setCurrentUser`, `onUserChange`, `completeLogin`, `logout`, `clearSession`, `setReturnTo`, `takeReturnTo`, `roleFromStoredToken` |
| `core/page.js` | `initPage` |
| `core/dom.js` | `html`, `raw`, `render`, `escapeHtml`, `toElement`, `cx`, `qs`, `qsa`, `on`, `onClickOutside`, `scrollToTop`, `SafeHtml` |
| `core/icons.js` | `icon`, `iconSvg`, `hydrateIcons`, `hasIcon` |
| `core/i18n.js` | `initI18n`, `t`, `setLanguage`, `getLanguage`, `applyTranslations` |
| `api/epm-api.js` | public EPM endpoints (events, stats, categories, gallery, video, reviews, registration, volunteer) |
| `api/admin-epm-api.js` | admin EPM endpoints |
| `api/publications-api.js` | Feed World publications (reader + admin) |
| `utils/*.js` | `epm-date`, `epm-category`, `publication-date`, `publication-release`, `publication-links` |
| `components/navbar.js`, `footer.js` | mounted by `initPage` - pages don't call them |
| `components/device-row.js` | `deviceRowHtml(session, { showLogout, busy })`, `timeAgo` |
| `components/fade-image.js` | `fadeImage({ src, alt, className, attrs })`, `initFadeImages(root)` |
| `components/pdf-viewer.js` | `createPdfViewer(container, { fileUrl, downloadUrl, initialPageCount, onPageChange })` → `{ destroy() }` (pdf.js) |
| `components/share-dialog.js` | `openShareDialog({ publication, onClose })` → `{ close }` |
| `components/photo-lightbox.js` | `openPhotoLightbox({ photos, index, title, subtitle, onClose, onIndexChange })` |
| `pages/admin/admin-ui.js` | `openModal`, `confirmDialog`, `formErrorHtml`, `formActionsHtml`, `createBanner`, `bannerHtml`, `sectionHeaderHtml`, `loadingHtml`, `emptyHtml` |
| `pages/admin/admin-utils.js` | `formatDate`, `formatDateTime`, `formatSize`, `todayIso`, `downloadCsv`, `MONTH_NAMES` |

---

## 7. Coming from the React code (reference for maintainers)

The site was converted 1:1 from a React app. Mappings, for reading the old code:

| React | Here |
|---|---|
| `<Navbar/>`, `<Footer/>` | `<div id="site-navbar"></div>`, `<div id="site-footer"></div>` |
| `onNavigate('page', {a: 1})` | `navigate('page', { a: 1 })` / `data-nav="page"` |
| `className` / `htmlFor` | `class` / `for` |
| `style={{ marginTop: 8, flexDirection: 'column' }}` | `style="margin-top: 8px; flex-direction: column;"` |
| SVG `strokeWidth`, `stopColor`, `fillRule` | `stroke-width`, `stop-color`, `fill-rule` |
| `<Icon size={16} />` | `icon('icon', { size: 16 })` or `<i data-icon="icon" data-size="16"></i>` |
| `useState` + JSX | `state` object + `draw()` with `render(el, html`...`)` |
| `useEffect(() => load(), [])` | call `load()` at startup |
| `useRef` | `querySelector` |
| `createPortal(x, document.body)` | `document.body.appendChild(toElement(html`...`))` |
| `useScrollToTop(tab)` | `scrollToTop()` when the tab changes |
| `import img from '../assets/x.avif'` | `assets/images/x.avif` (`assetUrl('images/x.avif')` in JS) |
| `/images/...`, `/icons/...`, `/vid.mp4` | `assets/images/...`, `assets/icons/...`, `assets/videos/vid.mp4` |

**CSS note:** in the React app every CSS file was loaded on every page. Here each page links only
what it needs - if a page uses a class defined in another stylesheet, link that file too.

---

## 8. Running locally

ES modules do not load from `file://`, so serve the folder over HTTP (any static server works):

```bash
npx serve .
```

```bash
python -m http.server 5500
```

The backend must be running on the same host at port 8080 (change `API_PORT` in
`assets/js/core/config.js` if it differs) and must allow this site's origin in its CORS settings.
After changing a `.js` file, hard-refresh (Ctrl+F5) if the browser keeps an old copy cached.
