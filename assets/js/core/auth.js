// Login state. The JWT lives in localStorage under "jwt" (same key the React app used, so existing
// logins carry over). The signed-in user (from GET /api/auth/me) is cached per tab in
// sessionStorage, so the navbar can show the user's name straight away on every page load instead
// of flashing "My Account" while /api/auth/me is still answering.
import { API_BASE_URL } from './config.js';

const TOKEN_KEY = 'jwt';
const USER_CACHE_KEY = 'feed_user';
// Where a login should land afterwards (e.g. a shared Feed World issue - see pages/publication-reader.html).
const RETURN_TO_KEY = 'feed_return_to';

export const USER_CHANGED_EVENT = 'feed:user-changed';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const isLoggedIn = () => Boolean(getToken());

export function authHeaders(extra = {}) {
  const token = getToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : { ...extra };
}

// The JWT payload carries the user's role (see JwtUtil#generateToken on the backend). Reading it
// up front lets an admin land in the admin panel straight away. This only steers the UI - the
// backend checks the role itself on every admin request.
export function roleFromStoredToken() {
  try {
    const payload = getToken()?.split('.')[1];
    if (!payload) return null;
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))).role || null;
  } catch {
    return null;
  }
}

export function getCachedUser() {
  try {
    const value = sessionStorage.getItem(USER_CACHE_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function cacheUser(user) {
  try {
    if (user) sessionStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    else sessionStorage.removeItem(USER_CACHE_KEY);
  } catch {
    // sessionStorage unavailable (private mode) - the name just loads a moment later
  }
}

// Stores the new user and tells everything on the page (navbar, page scripts) about it.
export function setCurrentUser(user) {
  cacheUser(user);
  window.dispatchEvent(new CustomEvent(USER_CHANGED_EVENT, { detail: { user } }));
}

export function onUserChange(callback) {
  const listener = (event) => callback(event.detail.user);
  window.addEventListener(USER_CHANGED_EVENT, listener);
  return () => window.removeEventListener(USER_CHANGED_EVENT, listener);
}

// Admin: from the loaded user when we have it, otherwise from the token.
export function isAdmin(user = getCachedUser()) {
  if (!isLoggedIn()) return false;
  return user ? user.role === 'ADMIN' : roleFromStoredToken() === 'ADMIN';
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  cacheUser(null);
}

// Checks the stored token against the backend. Resolves to the user, or null when logged out /
// the token was rejected (which also clears it). A network failure keeps the token and the
// cached user, like the React app did.
export async function validateSession() {
  const token = getToken();
  if (!token) {
    cacheUser(null);
    return null;
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const user = await res.json();
      setCurrentUser(user);
      return user;
    }
    clearSession();
    setCurrentUser(null);
    return null;
  } catch (e) {
    console.error('Failed to validate token', e);
    return getCachedUser();
  }
}

// Called by the login page with the backend's login response ({ token, role, ... }).
export function completeLogin(userData) {
  localStorage.setItem(TOKEN_KEY, userData.token);
  cacheUser(userData);
}

export async function logout() {
  try {
    const token = getToken();
    if (token) {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  } catch (e) {
    console.error('Logout error', e);
  }
  clearSession();
}

export function setReturnTo(path) {
  try {
    sessionStorage.setItem(RETURN_TO_KEY, path);
  } catch {
    // no sessionStorage - login still works, it just lands on home
  }
}

// Read-once: the stored return path, if any, cleared as it's read. Only same-origin paths
// ("/..." but not "//host") are honoured, so it can never become an open redirect.
export function takeReturnTo() {
  try {
    const path = sessionStorage.getItem(RETURN_TO_KEY);
    sessionStorage.removeItem(RETURN_TO_KEY);
    return path && /^\/(?!\/)/.test(path) ? path : null;
  } catch {
    return null;
  }
}
