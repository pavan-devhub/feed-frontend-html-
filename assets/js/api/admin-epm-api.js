(function () {
  'use strict';

  const { API_BASE_URL } = FW.require('core/config');

  // Admin-only EPM endpoints (/api/admin/epm/**). Like the Feed World admin calls in
  // publicationsApi.js, every request carries the logged-in user's JWT, and the backend only
  // accepts it when that user holds the ADMIN role (see SecurityConfig) - one admin login for both
  // Feed World and EPM.

  const authToken = () => localStorage.getItem('jwt');

  function messageFrom(body, status) {
    if (body && typeof body === 'object') {
      if (body.error) return body.error;
      // A @Valid failure comes back as a plain {field: message} map (see GlobalExceptionHandler).
      const values = Object.values(body).filter((v) => typeof v === 'string');
      if (values.length > 0) return values.join(' · ');
    }
    if (status === 403) return 'Admin access required - please log in again with the admin account.';
    return `Request failed (${status})`;
  }

  async function request(path, { method = 'GET', json, form } = {}) {
    const token = authToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    let body;
    if (json !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(json);
    } else if (form) {
      body = form;
    }
    const res = await fetch(`${API_BASE_URL}${path}`, { method, headers, body });
    if (res.status === 204) return null;
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(messageFrom(data, res.status));
    return data;
  }

  const query = (params) => {
    const qs = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.set(k, v);
    });
    const s = qs.toString();
    return s ? `?${s}` : '';
  };

  const formWith = (file, fields = {}) => {
    const form = new FormData();
    if (file) form.append('file', file);
    Object.entries(fields).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') form.append(k, v);
    });
    return form;
  };

  // --- overview / submissions ---------------------------------------------------------------

  const fetchAdminEpmOverview = () => request('/api/admin/epm/overview');

  // Filters: { eventId, eventDate: 'yyyy-mm-dd' (the EPM's date), submittedOn: 'yyyy-mm-dd', q }
  const fetchAdminRegistrations = (filters) => request(`/api/admin/epm/registrations${query(filters)}`);
  const fetchAdminVolunteers = (filters) => request(`/api/admin/epm/volunteers${query(filters)}`);

  // --- events -------------------------------------------------------------------------------

  // Filters: { status: 'upcoming' | 'previous' | 'all', q, state, district, city, category, month, year }
  const fetchAdminEvents = (filters) => request(`/api/admin/epm/events${query(filters)}`);
  const createAdminEvent = (payload) => request('/api/admin/epm/events', { method: 'POST', json: payload });
  const updateAdminEvent = (id, payload) => request(`/api/admin/epm/events/${id}`, { method: 'PUT', json: payload });
  const deleteAdminEvent = (id) => request(`/api/admin/epm/events/${id}`, { method: 'DELETE' });

  // --- categories ---------------------------------------------------------------------------

  // Accent colours the public pages have styles for - must match EpmCategory.COLORS on the backend.
  const CATEGORY_COLORS = ['green', 'teal', 'purple', 'blue', 'orange', 'emerald', 'gray'];

  const fetchAdminCategories = () => request('/api/admin/epm/categories');
  const createAdminCategory = (payload) => request('/api/admin/epm/categories', { method: 'POST', json: payload });
  const updateAdminCategory = (id, payload) => request(`/api/admin/epm/categories/${id}`, { method: 'PUT', json: payload });
  const deleteAdminCategory = (id) => request(`/api/admin/epm/categories/${id}`, { method: 'DELETE' });

  // --- venues -------------------------------------------------------------------------------

  const fetchAdminVenues = () => request('/api/admin/epm/venues');
  const createAdminVenue = (payload) => request('/api/admin/epm/venues', { method: 'POST', json: payload });
  const updateAdminVenue = (id, payload) => request(`/api/admin/epm/venues/${id}`, { method: 'PUT', json: payload });
  const deleteAdminVenue = (id) => request(`/api/admin/epm/venues/${id}`, { method: 'DELETE' });

  // --- reviews ------------------------------------------------------------------------------

  const fetchAdminReviews = () => request('/api/admin/epm/reviews');
  const createAdminReview = (payload) => request('/api/admin/epm/reviews', { method: 'POST', json: payload });
  const updateAdminReview = (id, payload) => request(`/api/admin/epm/reviews/${id}`, { method: 'PUT', json: payload });
  const deleteAdminReview = (id) => request(`/api/admin/epm/reviews/${id}`, { method: 'DELETE' });

  // --- block images (EPM page + gallery page sections) --------------------------------------

  const fetchGalleryBlocks = () => request('/api/admin/epm/gallery/blocks');
  const fetchBlockImages = (block) => request(`/api/admin/epm/gallery/${encodeURIComponent(block)}`);
  const uploadBlockImage = (block, file, fields) =>
    request(`/api/admin/epm/gallery/${encodeURIComponent(block)}`, { method: 'POST', form: formWith(file, fields) });
  const updateBlockImage = (block, id, payload) =>
    request(`/api/admin/epm/gallery/${encodeURIComponent(block)}/${id}`, { method: 'PUT', json: payload });
  const replaceBlockImage = (block, id, file) =>
    request(`/api/admin/epm/gallery/${encodeURIComponent(block)}/${id}/file`, { method: 'PUT', form: formWith(file) });
  const reorderBlockImages = (block, orderedIds) =>
    request(`/api/admin/epm/gallery/${encodeURIComponent(block)}/order`, { method: 'PUT', json: orderedIds });
  const deleteBlockImage = (block, id) =>
    request(`/api/admin/epm/gallery/${encodeURIComponent(block)}/${id}`, { method: 'DELETE' });
  const importGalleryFromStorage = () => request('/api/admin/epm/gallery/import', { method: 'POST' });

  // --- EPM page video (the full-width one under the navbar) ---------------------------------

  // Must match EpmPageVideoServiceImpl's limit (and the backend's multipart limit).
  const VIDEO_MAX_BYTES = 50 * 1024 * 1024;

  /** null while the EPM page still plays its built-in video. */
  const fetchEpmVideoAdmin = () => request('/api/admin/epm/video');
  const deleteEpmVideo = () => request('/api/admin/epm/video', { method: 'DELETE' });

  // A video runs to tens of MB, so unlike every other upload here this one goes through
  // XMLHttpRequest - fetch can't report upload progress. `onProgress` gets 0..1.
  const uploadEpmVideo = (file, onProgress) => new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', `${API_BASE_URL}/api/admin/epm/video`);
    const token = authToken();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.responseType = 'json';
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.response);
      else reject(new Error(messageFrom(xhr.response, xhr.status)));
    };
    xhr.onerror = () => reject(new Error('The upload was interrupted - check the connection and try again.'));
    xhr.send(formWith(file));
  });

  // --- gallery page: states -> districts -> photos ------------------------------------------

  const REGIONS = '/api/admin/epm/gallery-regions';

  const fetchGalleryStatesAdmin = () => request(`${REGIONS}/states`);
  const createGalleryState = (payload) => request(`${REGIONS}/states`, { method: 'POST', json: payload });
  const updateGalleryState = (id, payload) => request(`${REGIONS}/states/${id}`, { method: 'PUT', json: payload });
  const deleteGalleryState = (id) => request(`${REGIONS}/states/${id}`, { method: 'DELETE' });
  const setGalleryStateCover = (id, file) => request(`${REGIONS}/states/${id}/cover`, { method: 'PUT', form: formWith(file) });
  const removeGalleryStateCover = (id) => request(`${REGIONS}/states/${id}/cover`, { method: 'DELETE' });

  const createGalleryDistrict = (stateId, payload) =>
    request(`${REGIONS}/states/${stateId}/districts`, { method: 'POST', json: payload });
  const updateGalleryDistrict = (id, payload) => request(`${REGIONS}/districts/${id}`, { method: 'PUT', json: payload });
  const deleteGalleryDistrict = (id) => request(`${REGIONS}/districts/${id}`, { method: 'DELETE' });

  const fetchDistrictPhotos = (districtId) => request(`${REGIONS}/districts/${districtId}/photos`);
  const uploadDistrictPhoto = (districtId, file, caption) =>
    request(`${REGIONS}/districts/${districtId}/photos`, { method: 'POST', form: formWith(file, { caption }) });
  const updateDistrictPhoto = (districtId, photoId, payload) =>
    request(`${REGIONS}/districts/${districtId}/photos/${photoId}`, { method: 'PUT', json: payload });
  const replaceDistrictPhoto = (districtId, photoId, file) =>
    request(`${REGIONS}/districts/${districtId}/photos/${photoId}/file`, { method: 'PUT', form: formWith(file) });
  const reorderDistrictPhotos = (districtId, orderedIds) =>
    request(`${REGIONS}/districts/${districtId}/photos/order`, { method: 'PUT', json: orderedIds });
  const deleteDistrictPhoto = (districtId, photoId) =>
    request(`${REGIONS}/districts/${districtId}/photos/${photoId}`, { method: 'DELETE' });

  FW.define('api/admin-epm-api', {
    fetchAdminEpmOverview,
    fetchAdminRegistrations,
    fetchAdminVolunteers,
    fetchAdminEvents,
    createAdminEvent,
    updateAdminEvent,
    deleteAdminEvent,
    CATEGORY_COLORS,
    fetchAdminCategories,
    createAdminCategory,
    updateAdminCategory,
    deleteAdminCategory,
    fetchAdminVenues,
    createAdminVenue,
    updateAdminVenue,
    deleteAdminVenue,
    fetchAdminReviews,
    createAdminReview,
    updateAdminReview,
    deleteAdminReview,
    fetchGalleryBlocks,
    fetchBlockImages,
    uploadBlockImage,
    updateBlockImage,
    replaceBlockImage,
    reorderBlockImages,
    deleteBlockImage,
    importGalleryFromStorage,
    VIDEO_MAX_BYTES,
    fetchEpmVideoAdmin,
    deleteEpmVideo,
    uploadEpmVideo,
    fetchGalleryStatesAdmin,
    createGalleryState,
    updateGalleryState,
    deleteGalleryState,
    setGalleryStateCover,
    removeGalleryStateCover,
    createGalleryDistrict,
    updateGalleryDistrict,
    deleteGalleryDistrict,
    fetchDistrictPhotos,
    uploadDistrictPhoto,
    updateDistrictPhoto,
    replaceDistrictPhoto,
    reorderDistrictPhotos,
    deleteDistrictPhoto,
  });
})();
