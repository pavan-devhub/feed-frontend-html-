// Small helpers shared by the three EPM gallery pages (gallery -> state -> district).
import { fetchEpmEvents } from '../api/epm-api.js';

export const plural = (count, one, many = `${one}s`) => (count === 1 ? one : many);

export const pad2 = (n) => String(n).padStart(2, '0');

// Event rows name their state/district in free text ("Andhra Pradesh", "Krishna") while the gallery
// states/districts carry their own display names, so both sides are compared case- and space-insensitively.
export const placeKey = (name) => (name || '').trim().toLowerCase().replace(/\s+/g, ' ');

const liveEvents = (events) => (events || []).filter((e) => !e.cancelled);

// { total, held, upcoming, next } for a list of EPM events - `next` is the soonest upcoming one.
export function summariseMeetings(events) {
  const live = liveEvents(events);
  const upcoming = live
    .filter((e) => e.upcoming)
    .sort((a, b) => (a.eventDate || '').localeCompare(b.eventDate || ''));
  return {
    total: live.length,
    held: live.length - upcoming.length,
    upcoming: upcoming.length,
    next: upcoming[0] || null,
  };
}

// Map of placeKey(event[field]) -> number of (non-cancelled) events, e.g. meetings per district.
export function countMeetingsBy(events, field) {
  const counts = new Map();
  liveEvents(events).forEach((e) => {
    const key = placeKey(e[field]);
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return counts;
}

// The EPM meetings matching `filter` (see fetchEpmEvents), across past and upcoming. The gallery
// only uses these for counts and the "next EPM" card, so a failed call quietly resolves to [] and
// the pages simply leave those details out. (Replaces the React useEpmMeetings hook: the pages keep
// the result as `null` until this resolves.)
export function loadEpmMeetings(filter = {}) {
  return fetchEpmEvents({ status: 'all', ...filter })
    .then((data) => (Array.isArray(data) ? data : []))
    .catch(() => []);
}
