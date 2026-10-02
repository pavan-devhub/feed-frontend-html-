// Central place for the backend origin so it's never hardcoded in more than one spot.
// The backend (Spring Boot) runs on the same host as this site, on API_PORT. To point the UI at a
// backend on another port, change API_PORT here.
(function () {
  'use strict';

  const API_PORT = '8080';

  // Opened straight from disk (file://) there is no hostname - fall back to localhost.
  const API_HOST = window.location.hostname || 'localhost';

  const API_BASE_URL = `http://${API_HOST}:${API_PORT}`;

  FW.define('core/config', { API_PORT, API_BASE_URL });
})();
