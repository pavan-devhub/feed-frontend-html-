// Non-UI helpers shared by the admin sections.

// --- formatting ---------------------------------------------------------------------------

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** "2026-10-15" -> "15 Oct 2026" without any timezone shifting. */
export function formatDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS_SHORT[m - 1]} ${y}`;
}

/** "2026-09-26T17:42:00.77" -> "26 Sep 2026, 17:42". */
export function formatDateTime(iso) {
  if (!iso) return '—';
  const time = String(iso).slice(11, 16);
  return time ? `${formatDate(iso)}, ${time}` : formatDate(iso);
}

/** 16455069 -> "15.7 MB", 5120 -> "5 KB"; null for no size. */
export const formatSize = (bytes) => {
  if (!bytes) return null;
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

export const todayIso = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

/** Saves `rows` as a CSV file. `columns` is [{ label, value: (row) => any }]. */
export function downloadCsv(filename, columns, rows) {
  const escape = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [columns.map((c) => escape(c.label)).join(',')]
    .concat(rows.map((r) => columns.map((c) => escape(c.value(r))).join(',')));
  // BOM so Excel opens non-ASCII names (e.g. Telugu) correctly.
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
