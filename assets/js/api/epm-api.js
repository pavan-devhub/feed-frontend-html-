import { API_BASE_URL } from '../core/config.js';

// EPM endpoints are all public (no login required - see SecurityConfig's permitAll fallback),
// so unlike publicationsApi.js none of these calls carry a JWT.

function messageFrom(body) {
  if (!body) return null;
  if (body.error) return body.error;
  // A @Valid failure that never reaches the controller's own try/catch comes back from
  // GlobalExceptionHandler as a plain {field: message} map instead - see EpmSubmissionController.
  const keys = Object.keys(body);
  if (keys.length > 0) return `${keys[0]}: ${body[keys[0]]}`;
  return null;
}

async function getJson(path) {
  const res = await fetch(`${API_BASE_URL}${path}`);
  if (res.status === 204) return null;
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      message = messageFrom(await res.json()) || message;
    } catch (_) {
      // response had no JSON body - keep the generic message
    }
    throw new Error(message);
  }
  return res.json();
}

async function postJson(path, payload) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(messageFrom(data) || `Request failed (${res.status})`);
  }
  return data;
}

// status: 'upcoming' (default) | 'previous' | 'all'
// `year` only matters paired with `month` (e.g. the homepage calendar widget asking for a specific
// month of a specific year) - a bare `month` still matches that month across every year in the data.
export const fetchEpmEvents = ({ status = 'upcoming', state, district, city, category, month, year } = {}) => {
  const params = new URLSearchParams({ status });
  if (state) params.set('state', state);
  if (district) params.set('district', district);
  if (city) params.set('city', city);
  if (category) params.set('category', category);
  if (month) params.set('month', month);
  if (year) params.set('year', year);
  return getJson(`/api/epm/events?${params.toString()}`);
};

export const fetchEpmEventById = (id) => getJson(`/api/epm/events/${id}`);

export const fetchEpmStats = () => getJson('/api/epm/events/stats');

// The fixed list of event categories (id + display label), driven entirely by the backend's
// EpmCategory enum - so the "Filter by Category" sidebar never has to be hand-updated in the UI.
export const fetchEpmCategories = () => getJson('/api/epm/events/categories');

// Every photo in the gallery page's sections - the EPM page's carousel falls back to these when
// the admin hasn't put any photos in its own "epm-carousel" block.
export const fetchEpmGalleryImages = () => getJson('/api/epm/gallery');

// One image section's own images, in the admin's display order - e.g. "epm-stats" or "epm-calendar"
// on the EPM page, "epm-moments" or "the-epm-experience" on the gallery page (see
// EpmGalleryBlock). The backend reads each image's name from the database, then streams its file.
export const fetchEpmGalleryImagesByBlock = (block) => getJson(`/api/epm/gallery/${encodeURIComponent(block)}`);

// The gallery's state -> district -> photo tree (see EpmGalleryRegionService), managed from the
// admin panel's Images section. Every state, each with its district cards (name, cover, photo count).
export const fetchEpmGalleryStates = () => getJson('/api/epm/gallery/states');

export const fetchEpmGalleryState = (state) => getJson(`/api/epm/gallery/states/${encodeURIComponent(state)}`);

// One district's photos, plus the state/district names the page's breadcrumb needs.
export const fetchEpmGalleryDistrict = (state, district) =>
  getJson(`/api/epm/gallery/states/${encodeURIComponent(state)}/districts/${encodeURIComponent(district)}`);

// EpmGalleryImageDto#imageUrl is already a server-relative path (e.g. "/api/epm/gallery/epm-stats/3/file?v=...");
// this just prefixes it with the backend origin so it can be dropped straight into an <img src>.
export const getEpmGalleryImageUrl = (relativeUrl) => `${API_BASE_URL}${relativeUrl}`;

// The video under the navbar at the top of the EPM page, uploaded by the admin (see
// AdminEpmVideoController) - null until one is, and the page then plays its built-in assets/videos/vid.mp4.
export const fetchEpmVideo = () => getJson('/api/epm/video');

// Same as getEpmGalleryImageUrl, for EpmPageVideoDto#videoUrl ("/api/epm/video/file?v=...").
export const getEpmVideoUrl = (relativeUrl) => `${API_BASE_URL}${relativeUrl}`;

// Published testimonials for the EPM page's slider - written by the admin (see AdminEpmReviewController).
export const fetchEpmReviews = () => getJson('/api/epm/reviews');

export const submitEpmRegistration = (payload) => postJson('/api/epm/registrations', payload);

export const submitEpmVolunteer = (payload) => postJson('/api/epm/volunteers', payload);
