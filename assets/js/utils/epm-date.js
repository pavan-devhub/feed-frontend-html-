// Shared helpers for formatting the ISO "yyyy-MM-dd" eventDate that EpmEventDto sends down.

export function formatEventDateLong(isoDate) {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// Powers the day/month/year date-block used on the event timeline cards, e.g. { day: '18',
// month: 'OCT', weekday: 'Sun', year: '2026' }.
export function formatEventDateParts(isoDate) {
  if (!isoDate) return { day: '', month: '', weekday: '', year: '' };
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return {
    day: String(day),
    month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
    year: String(year),
  };
}
