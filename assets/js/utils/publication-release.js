// Feed World issues are released month by month: a reader sees an issue from the 1st of its month
// (India time) onwards, never a later month's - however far ahead the admin has uploaded. The
// backend enforces this (PublicationVisibility, feedworld.publications.release-zone); the reader
// pages apply the same rule to what they show, so they can never offer a future year or month
// even when talking to a backend that predates the rule. Admins see everything.
const RELEASE_TIME_ZONE = 'Asia/Kolkata';

// The current month in the release time zone, e.g. { year: 2026, month: 9 } until the end of
// 30 September, then { year: 2026, month: 10 } from 1 October. Read afresh on every call.
export function latestReleasedMonth() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: RELEASE_TIME_ZONE, year: 'numeric', month: 'numeric',
  }).formatToParts(new Date());
  const part = (type) => Number(parts.find((p) => p.type === type).value);
  return { year: part('year'), month: part('month') };
}

// `pub` is anything with a numeric year and month (a publication summary or detail).
export const isReleased = (pub, latest = latestReleasedMonth()) =>
  pub.year < latest.year || (pub.year === latest.year && pub.month <= latest.month);

// Whether the stored login is an admin's - admins preview issues ahead of release. The JWT
// payload carries the role (see JwtUtil#generateToken); this only steers the UI, the backend
// checks the role itself.
export function callerIsAdmin() {
  try {
    const payload = localStorage.getItem('jwt')?.split('.')[1];
    if (!payload) return false;
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))).role === 'ADMIN';
  } catch {
    return false;
  }
}
