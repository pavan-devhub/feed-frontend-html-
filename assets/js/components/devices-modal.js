// "Logged-in devices" - an anchored popover (not a full-screen modal) opened from the navbar's
// profile menu. It has no page-dimming backdrop, so it positions and clamps itself against the
// viewport directly, and closes itself on an outside click like the other navbar dropdowns.
//
// It is appended straight to <body>: the trigger lives inside the navbar's `position: fixed`
// wrapper, which carries a `transform` for its scroll-hide animation, and any transform turns
// that ancestor into the containing block for fixed-position descendants.
(function () {
  'use strict';

  const { API_BASE_URL } = FW.require('core/config');
  const { getToken } = FW.require('core/auth');
  const { html, render, on, onClickOutside } = FW.require('core/dom');
  const { icon } = FW.require('core/icons');
  const { deviceRowHtml } = FW.require('components/device-row');

  // Minimum gap kept between the popover and every viewport edge.
  const EDGE_MARGIN = 12;
  const MAX_WIDTH = 440;
  const MIN_HEIGHT = 160;

  // Returns { close() }. onClose runs whenever the popover closes (outside click or X).
  function openDevicesModal({ anchor, onClose }) {
    const state = { sessions: [], loading: true, error: null, revokingId: null };

    const pop = document.createElement('div');
    pop.style.cssText = 'position: fixed; background: white; border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); display: flex; flex-direction: column; z-index: 2100; overflow: hidden;';
    document.body.appendChild(pop);

    const computePosition = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const rect = anchor?.getBoundingClientRect();
      const anchorBottom = rect ? rect.bottom : EDGE_MARGIN + 44;
      const anchorRight = rect ? rect.right : vw - EDGE_MARGIN;

      const width = Math.min(MAX_WIDTH, vw - EDGE_MARGIN * 2);

      // Align the popover's right edge with the trigger's right edge, but never let its left edge
      // cross the viewport's left margin (matters most on narrow/mobile widths).
      let right = Math.max(EDGE_MARGIN, vw - anchorRight);
      const maxRight = vw - width - EDGE_MARGIN;
      if (right > maxRight) right = Math.max(EDGE_MARGIN, maxRight);

      // Sit just below the trigger; if that would leave no room above the bottom edge, pin it
      // higher instead of letting it run off-screen.
      let top = anchorBottom + 10;
      if (top + MIN_HEIGHT + EDGE_MARGIN > vh) {
        top = Math.max(EDGE_MARGIN, vh - MIN_HEIGHT - EDGE_MARGIN);
      }
      const maxHeight = Math.max(MIN_HEIGHT, vh - top - EDGE_MARGIN);

      Object.assign(pop.style, { top: `${top}px`, right: `${right}px`, width: `${width}px`, maxHeight: `${maxHeight}px` });
    };

    const draw = () => {
      render(pop, html`
      <div style="padding: 20px 24px 12px; flex-shrink: 0;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
          <h3 style="margin: 0; font-size: 18px; color: #1a1a1a;">Logged-in devices</h3>
          <button type="button" data-action="close" style="background: none; border: none; cursor: pointer; color: #6b7280; padding: 4px;">
            ${icon('x', { size: 20 })}
          </button>
        </div>
        <p style="margin: 0; font-size: 13px; color: #6b7280;">
          You can be logged in on up to 3 devices at once. Log out of one below to free up a slot.
        </p>
      </div>
      <div style="padding: 0 24px 20px; overflow-y: auto; min-height: 0;">
        ${state.loading && html`<div style="padding: 24px 0; text-align: center; color: #6b7280; font-size: 14px;">Loading…</div>`}
        ${state.error && html`<div style="padding: 12px; background: #fef2f2; color: #991b1b; border-radius: 8px; font-size: 13px;">${state.error}</div>`}
        ${!state.loading && !state.error && html`
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${state.sessions.map((s) => deviceRowHtml(s, { showLogout: true, busy: state.revokingId === s.id }))}
            ${state.sessions.length === 0 && html`
              <div style="text-align: center; color: #6b7280; font-size: 13px; padding: 16px 0;">No active devices found.</div>`}
          </div>`}
      </div>`);
    };

    const fetchSessions = async () => {
      state.loading = true;
      state.error = null;
      draw();
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/sessions`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const data = await res.json().catch(() => null);
        if (res.ok) state.sessions = data?.sessions || [];
        else state.error = data?.error || 'Could not load devices.';
      } catch {
        state.error = 'Network error. Please make sure the backend is running.';
      } finally {
        state.loading = false;
        draw();
      }
    };

    const handleRevoke = async (id) => {
      state.revokingId = id;
      draw();
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/sessions/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (res.ok) state.sessions = state.sessions.filter((s) => String(s.id) !== String(id));
      } catch {
        // Leave the list as-is; the user can retry.
      } finally {
        state.revokingId = null;
        draw();
      }
    };

    let closed = false;
    const cleanups = [];
    const close = () => {
      if (closed) return;
      closed = true;
      cleanups.forEach((fn) => fn());
      pop.remove();
      if (onClose) onClose();
    };

    on(pop, 'click', '[data-action="close"]', close);
    on(pop, 'click', '[data-action="revoke-device"]', (_, btn) => handleRevoke(btn.dataset.id));
    window.addEventListener('resize', computePosition);
    cleanups.push(() => window.removeEventListener('resize', computePosition));
    cleanups.push(onClickOutside(pop, close));

    computePosition();
    fetchSessions();
    return { close, element: pop };
  }

  FW.define('components/devices-modal', { openDevicesModal });
})();
