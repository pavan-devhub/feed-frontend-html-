import { API_BASE_URL } from '../core/config.js';

// Publications require a logged-in user (see SecurityConfig#filterChain), so every call here
// needs the same JWT the rest of the app keeps in localStorage.
const authToken = () => localStorage.getItem('jwt');

async function getJson(path) {
  const token = authToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body && body.error) message = body.error;
    } catch (_) {
      // response had no JSON body - keep the generic message
    }
    // `status` lets a caller tell "not logged in" (401/403) from "no such issue" (404).
    throw Object.assign(new Error(message), { status: res.status });
  }
  return res.json();
}

// Shared by the admin write endpoints below (POST/PUT/DELETE on /api/admin/publications/**),
// which additionally require the logged-in user to hold the ADMIN role - see SecurityConfig's
// hasRole("ADMIN") matcher. A non-admin JWT gets a 403 with this same {status, error} JSON shape.
async function authFetch(path, options = {}) {
  const token = authToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) },
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body && body.error) message = body.error;
    } catch (_) {
      // response had no JSON body - keep the generic message
    }
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json().catch(() => null);
}

// Archive sidebar: up to `count` issues after year/month, oldest first, capped at December of
// that same year.
export const fetchPublicationsWindow = (year, month, count = 12) =>
  getJson(`/api/publications/window?year=${encodeURIComponent(year)}&month=${encodeURIComponent(month)}&count=${encodeURIComponent(count)}`);

// Full detail for one issue, used to populate the viewer.
export const fetchPublicationById = (id) => getJson(`/api/publications/${id}`);

// Powers the "Find a Publication" year + month lookup.
export const fetchPublicationByYearMonth = (year, month) =>
  getJson(`/api/publications/lookup?year=${encodeURIComponent(year)}&month=${encodeURIComponent(month)}`);

// Used to open the page on the most recent issue by default.
export const fetchLatestPublication = () => getJson('/api/publications/latest');

export const searchPublications = (query) =>
  getJson(`/api/publications/search?q=${encodeURIComponent(query)}`);

// Hits /stream (not /file): /file is typed application/pdf and gets intercepted by download
// managers / "always download PDFs" browser settings before the viewer's own fetch completes.
export async function fetchPublicationPdfBlob(id) {
  const token = authToken();
  const res = await fetch(`${API_BASE_URL}/api/publications/${id}/stream`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    // Prefer the backend's own {error} message (e.g. "PDF file is missing on the server for
    // publication 2028-06-Hindi") over guessing what a status code means.
    let serverMessage = null;
    try {
      const body = await res.json();
      serverMessage = body && body.error;
    } catch (_) {
      // response had no JSON body - fall back to the generic messages below
    }
    throw Object.assign(new Error(
      serverMessage || (res.status === 404
        ? 'The publication stream endpoint was not found (HTTP 404) - the backend may need to be restarted to pick it up.'
        : `The PDF for this issue could not be loaded (HTTP ${res.status}).`)
    ), { status: res.status });
  }
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  if (contentType.includes('json') || contentType.includes('html')) {
    // An error page or a JSON body here means the request never actually reached the bytes -
    // say so, rather than handing the viewer something it will fail to parse.
    throw new Error(`Expected publication bytes but the server returned "${contentType}".`);
  }
  // Re-label as a PDF for the viewer. The bytes are unchanged; only the type the page attaches
  // to them differs, and that label never crosses the network.
  const buffer = await res.arrayBuffer();
  return new Blob([buffer], { type: 'application/pdf' });
}

// These two are consumed as plain URLs (the PDF viewer, <img src>, <a href>),
// which can't attach an Authorization header, so the JWT rides along as a query param instead -
// see JwtAuthenticationFilter's query-parameter fallback for these two routes specifically.
export const getPublicationFileUrl = (id, { download = false } = {}) => {
  const params = new URLSearchParams();
  if (download) params.set('download', 'true');
  const token = authToken();
  if (token) params.set('token', token);
  const qs = params.toString();
  return `${API_BASE_URL}/api/publications/${id}/file${qs ? `?${qs}` : ''}`;
};

export const getPublicationThumbnailUrl = (id) => {
  const token = authToken();
  return `${API_BASE_URL}/api/publications/${id}/thumbnail${token ? `?token=${encodeURIComponent(token)}` : ''}`;
};

// Every year that has at least one uploaded issue, newest first - drives the reader's "Find a
// Publication" year dropdown and the admin dashboard's year selector, so neither has to be
// hand-updated in code every January.
export const fetchPublicationYears = () => getJson('/api/publications/years');

// A whole year's worth of issues (summary shape). Without `language`: every edition, newest month
// first - the admin dashboard's publication table. With `language`: just that language's issues,
// January to December - one year's shelf on the reader's publications page.
export const fetchPublicationsByYear = (year, language) => {
  const params = new URLSearchParams({ year });
  if (language) params.set('language', language);
  return getJson(`/api/publications?${params}`);
};

// --- Admin only (requires the ADMIN role - see AdminPublicationController) -------------------

// Every issue is published separately in each of these languages - one PDF per (year, month,
// language), not one PDF per month. Listed in the sequence of the backend's `order` column
// (Telugu 1, Hindi 2, English 3 - see PublicationLanguage), which is also how the API sorts a
// month's editions, so position + 1 is each language's order. Values must match
// PublicationLanguage's exact casing (the backend enum round-trips via
// @Enumerated(EnumType.STRING), so "english" or "ENGLISH" would fail Spring's enum binding).
export const PUBLICATION_LANGUAGES = ['Telugu', 'Hindi', 'English'];

// How readers see each language named - in its own script, as it appears on the printed cover.
export const PUBLICATION_LANGUAGE_LABELS = { Telugu: 'తెలుగు', Hindi: 'हिन्दी', English: 'English' };

// A publication's `order` (1, 2 or 3) - the value the backend sent, or, when a row has none
// (e.g. a backend that predates the `order` column), the same fixed value derived from its
// language, so the admin table's Order column is never blank.
export const publicationOrder = (pub) => pub.order ?? PUBLICATION_LANGUAGES.indexOf(pub.language) + 1;

// `fields` is { file, year, month, language }. The backend sets the title (always "Feed World"),
// the feed_world_<language> filenames, order, page count and timestamps itself - none of those
// are sent here.
export const createPublication = ({ file, year, month, language }) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('year', year);
  formData.append('month', month);
  formData.append('language', language || 'English');
  return authFetch('/api/admin/publications', { method: 'POST', body: formData });
};

// Swaps the PDF (and regenerates its thumbnail/page count) without changing the issue's id or
// title.
export const replacePublicationPdf = (id, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return authFetch(`/api/admin/publications/${id}/pdf`, { method: 'PUT', body: formData });
};

// Removes the PDF, thumbnail and database row for that issue/language.
export const deletePublicationAdmin = (id) =>
  authFetch(`/api/admin/publications/${id}`, { method: 'DELETE' });
