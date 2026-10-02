# Feed World - Frontend (HTML / CSS / JavaScript)

The Feed World website - exports hub, FPO portal, MSME services, EPM events and gallery, Feed World
publications, My Business, Product 360, the user dashboard and the admin panel - built with plain
**HTML, CSS and JavaScript**. There is no framework and no build step: the files in this folder are
exactly what the browser loads.

It talks to the existing Spring Boot backend (`/api/...`) on port 8080 of the same host.

---

## Project structure

```
feed-frontend/
├── index.html          Home page (entry point)
├── pages/              All other HTML pages
├── assets/
│   ├── css/            All stylesheets   (global.css, components/, pages/, vendor/)
│   ├── js/             All JavaScript    (core/, api/, utils/, data/, components/, pages/, vendor/)
│   ├── images/         Images and favicon
│   ├── icons/          Icons
│   ├── videos/         Videos
│   └── locales/        Translations (one .js file per language)
├── docs/               Developer guide
└── README.md
```

Each page has three files with the same name: `pages/epm.html`, `assets/js/pages/epm.js`,
`assets/css/pages/epm.css`. Shared pieces (navbar, footer, dialogs, viewers) live in
`assets/js/components/` and `assets/css/components/`. See
**[docs/DEVELOPER-GUIDE.md](docs/DEVELOPER-GUIDE.md)** for the conventions, the shared modules and
how to add a page.

---

## Running locally

**Just open `index.html` in a browser** (double-click it). Every page works straight from disk -
no web server, no Live Server, no install. The pages link to each other with relative paths, so
navigation, login and the backend calls all work from `file://` too.

Serving the folder over http works the same way, if preferred (for example `npx serve .`,
`python -m http.server 5500` or VS Code's Live Server).

**Backend:** start the Spring Boot backend on port 8080. If it runs on another port, change
`API_PORT` in `assets/js/core/config.js`. The backend's CORS configuration must allow the page's
origin - `null` for pages opened from disk (already allowed), or e.g. `http://localhost:5500` when
the folder is served over http.

**Embedded YouTube videos** (How FEED Works) only play on pages served over http(s) - YouTube refuses
to play embeds on pages opened from disk. There each video shows its thumbnail and opens on YouTube.

## Deploying

Copy the whole folder to any static host - Nginx, Apache, IIS, S3/CloudFront, or the backend's
`src/main/resources/static/` folder. No build or install step is needed. All internal links are
relative, so the site also works from a sub-path (e.g. `https://example.com/feed/`).

---

## Pages

| Page | File | Notes |
|---|---|---|
| Home | `index.html` | |
| Login / Register | `pages/login.html`, `pages/register.html` | |
| Contact Us | `pages/contact.html` | |
| How FEED Works | `pages/how-feed-works.html` | |
| Exports | `pages/exports.html` | |
| FPO | `pages/fpo.html` | |
| My Tools | `pages/tools.html` | |
| Product 360 | `pages/product-360.html` 
| Safe Mission | `pages/safe-mission.html` | |
| Trade Fairs | `pages/trade-fairs.html` | |
| Dashboard | `pages/dashboard.html` | 
| My Business | `pages/my-business.html`, `business-account.html`, `agm-board.html`, `business-plan.html` | |
| My Business  | `pages/coming-soon.html?tab=…` | |
| Feed World publications | `pages/feed-world.html` | login required |
| Publication reader | `pages/publication-reader.html?id=…` | shareable link to one issue|
| EPM | `pages/epm.html` | login required | 
| All EPMs | `pages/epm-directory.html` | |
| EPM event | `pages/epm-event.html?eventId=…` | |
| EPM register / volunteer | `pages/epm-register.html`, `pages/epm-volunteer.html` | |
| EPM objective, content coverage, benefits, invitees | `pages/epm-objective.html`, `epm-content-coverage.html`, `epm-benefits.html`, `epm-invitees.html` | |
| EPM gallery | `pages/epm-gallery.html`, `epm-gallery-state.html?state=…`, `epm-gallery-district.html?state=…&district=…` | |
| Admin panel | `pages/admin.html?section=…` | ADMIN accounts only login required | 

## Login and access rules

* The login token is kept in `localStorage` (`jwt`).
* Dashboard and Product 360 require a login; other visitors are sent to the login page.
* An ADMIN account only uses the admin panel - any other page sends it there.
* These rules only steer the UI; the backend enforces access on every request.

## Third-party code

* **pdf.js** (Apache-2.0) - `assets/js/vendor/pdfjs/`, renders Feed World PDFs in the browser
  (`pdf.min.js` / `pdf.worker.min.js` are the official ES-module builds wrapped as classic scripts).
* **Lucide icons** (ISC) - the icon shapes in `assets/js/core/icons.js`.
* Fonts from Google Fonts (Inter, Outfit and others).
