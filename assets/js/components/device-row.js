// One row in a device list, shared by the navbar's "Logged-in devices" popover and the login
// page's "too many devices" screen - keeps both surfaces visually consistent.
(function () {
  'use strict';

  const { html } = FW.require('core/dom');
  const { icon } = FW.require('core/icons');

  const brandGreen = '#3e6b36';

  function timeAgo(isoString) {
    if (!isoString) return '';
    const diffMs = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  // showLogout: render the "Log out" button (wire clicks on [data-action="revoke-device"],
  // which carries data-id). busy: that row's logout is in progress.
  function deviceRowHtml(session, { showLogout = false, busy = false } = {}) {
    const isMobile = session.os === 'Android' || session.os === 'iOS';
    const isCurrent = session.status === 'current' || session.current;

    return html`
    <div style="display: flex; align-items: center; gap: 12px; padding: 12px; border: 1px solid ${isCurrent ? brandGreen : '#e5e7eb'}; border-radius: 10px; background: ${isCurrent ? '#f1f4ed' : '#fff'};">
      ${icon(isMobile ? 'smartphone' : 'laptop', { size: 20, color: isCurrent ? brandGreen : '#6b7280' })}
      <div style="flex: 1; min-width: 0;">
        <div style="display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: #1a1a1a;">
          ${session.deviceName || 'Unknown device'}
          ${isCurrent && html`
            <span style="display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; color: ${brandGreen};">
              ${icon('shield-check', { size: 12 })} This device
            </span>`}
        </div>
        <div style="font-size: 12px; color: #6b7280;">
          ${session.browser && session.os ? `${session.browser} · ${session.os}` : ''}${session.ipAddress ? ` · ${session.ipAddress}` : ''} · Last active ${timeAgo(session.lastActiveAt)}
        </div>
      </div>
      ${showLogout && !isCurrent && html`
        <button type="button" data-action="revoke-device" data-id="${session.id}" ${busy ? 'disabled' : ''}
          style="display: flex; align-items: center; gap: 6px; padding: 8px 12px; background: #fee2e2; color: #ef4444; border: none; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: ${busy ? 'not-allowed' : 'pointer'}; opacity: ${busy ? 0.6 : 1};">
          ${icon('log-out', { size: 14 })}
          ${busy ? 'Logging out…' : 'Log out'}
        </button>`}
    </div>`;
  }

  FW.define('components/device-row', { timeAgo, deviceRowHtml });
})();
