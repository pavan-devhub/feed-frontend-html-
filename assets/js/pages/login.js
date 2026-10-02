// Login - email/password sign-in. When /api/login answers 409 (the 3-device cap) the form is
// replaced by a "Maximum 3 devices reached" screen listing the active sessions; logging one of them
// out retries the login straight away.
(function () {
  'use strict';

  const { initPage } = FW.require('core/page');
  const { html, render, on, toElement } = FW.require('core/dom');
  const { icon } = FW.require('core/icons');
  const { navigate } = FW.require('core/router');
  const { completeLogin, takeReturnTo } = FW.require('core/auth');
  const { API_BASE_URL } = FW.require('core/config');
  const { deviceRowHtml } = FW.require('components/device-row');

  // Main brand color
  const brandGreen = '#3e6b36';
  const textLight = '#6b7280';
  const inputBorder = '#e5e7eb';

  const session = initPage({ page: 'login', access: 'public' });
  if (session) initLogin();

  // App.jsx handleLogin: store the login, then go back to a pending shared link or to the landing page.
  function handleLogin(userData) {
    if (userData && userData.token) {
      completeLogin(userData);
      const returnTo = takeReturnTo();
      if (returnTo && userData.role !== 'ADMIN') {
        window.location.assign(returnTo);
        return;
      }
      navigate(userData.role === 'ADMIN' ? 'admin-dashboard' : 'home');
    }
  }

  function notificationHtml(notification) {
    const success = notification.type === 'success';
    return html`
    <div style="position: fixed; top: 24px; right: 24px; background: ${success ? '#ecfdf5' : '#fef2f2'}; color: ${success ? '#065f46' : '#991b1b'}; padding: 14px 20px; border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.15); display: flex; align-items: center; gap: 12px; z-index: 2000; border: 1px solid ${success ? '#6ee7b7' : '#fecaca'}; animation: slideInRight 0.3s ease-out; max-width: 360px;">
      ${success ? icon('check', { size: 20, color: '#059669' }) : icon('alert-circle', { size: 20, color: '#dc2626' })}
      <span style="font-size: 14px; font-weight: 500;">${notification.message}</span>
      <button data-action="close-notification" style="background: none; border: none; cursor: pointer; padding: 0; display: flex; align-items: center; color: inherit; margin-left: 8px;">
        ${icon('x', { size: 16 })}
      </button>
    </div>`;
  }

  // "Maximum devices reached" screen, shown instead of the form after a 409. The message and the
  // device list are filled in by drawBlocked().
  function blockedScreenHtml() {
    return html`
    <div style="width: 100%; display: flex; flex-direction: column; gap: 16px;">
      <div style="text-align: center;">
        <div style="font-size: 15px; font-weight: 700; color: #1a1a1a; margin-bottom: 4px;">Maximum 3 devices reached</div>
        <div style="font-size: 13px; color: #6b7280;" data-role="blocked-message"></div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 10px;" data-role="device-list"></div>

      <button type="button" data-action="use-different-account" style="align-self: center; display: flex; align-items: center; gap: 6px; background: none; border: none; color: #6b7280; font-size: 13px; font-weight: 600; cursor: pointer; padding: 4px;">
        ${icon('arrow-left', { size: 16 })}
        Use a different account
      </button>
    </div>`;
  }

  function initLogin() {
    const panel = document.getElementById('login-panel');
    const logo = document.getElementById('login-logo');

    const state = {
      email: '',
      password: '',
      showPassword: false,
      rememberMe: true,
      notification: null,
      isSubmitting: false,
      // Set when /login is blocked by the 3-device cap - holds the active sessions the
      // "log out a device to continue" screen lets the user pick from.
      blockedSessions: null,
      blockedMessage: '',
      revokingId: null,
    };

    // The form, the OR divider and the register box are taken out of the page while the device
    // screen shows and come back fresh afterwards (as React re-mounted them) - cloned from these
    // pristine copies. The values typed so far are kept in state and put back.
    let formParts = ['login-form', 'login-or', 'login-register-section'].map((id) => document.getElementById(id));
    const formTemplates = formParts.map((el) => el.cloneNode(true));
    // Anything typed before this module ran.
    state.email = formParts[0].querySelector('[data-field="email"]').value;
    state.password = formParts[0].querySelector('[data-field="password"]').value;
    // What the form currently shows (the static HTML is the initial state).
    let formRendered = { showPassword: false, isSubmitting: false };

    let notificationEl = null;
    let renderedNotification = null;
    let blockedEl = null;
    let blockedRendered = {};

    function drawNotification() {
      if (state.notification === renderedNotification) return;
      renderedNotification = state.notification;
      if (!state.notification) {
        notificationEl?.remove();
        notificationEl = null;
        return;
      }
      const fresh = toElement(notificationHtml(state.notification));
      if (notificationEl) {
        // Same popup, new content - updating it in place keeps the slide-in from replaying.
        notificationEl.setAttribute('style', fresh.getAttribute('style'));
        notificationEl.innerHTML = fresh.innerHTML;
      } else {
        notificationEl = fresh;
        panel.prepend(fresh);
      }
    }

    function drawForm() {
      const form = formParts[0];
      if (formRendered.showPassword !== state.showPassword) {
        form.querySelector('[data-field="password"]').type = state.showPassword ? 'text' : 'password';
        render(
          form.querySelector('[data-action="toggle-password"]'),
          state.showPassword ? icon('eye', { size: 18, strokeWidth: 2 }) : icon('eye-off', { size: 18, strokeWidth: 2 }),
        );
      }
      if (formRendered.isSubmitting !== state.isSubmitting) {
        const submit = form.querySelector('button[type="submit"]');
        submit.disabled = state.isSubmitting;
        submit.style.cursor = state.isSubmitting ? 'not-allowed' : 'pointer';
        submit.style.opacity = state.isSubmitting ? '0.7' : '1';
        render(submit, html`<span style="flex: 1; text-align: center;">${state.isSubmitting ? 'Logging in...' : 'Login'}</span>${!state.isSubmitting && icon('arrow-right', { size: 20 })}`);
      }
      formRendered = { showPassword: state.showPassword, isSubmitting: state.isSubmitting };
    }

    function drawBlocked() {
      if (blockedRendered.message !== state.blockedMessage) {
        blockedEl.querySelector('[data-role="blocked-message"]').textContent = state.blockedMessage;
      }
      if (blockedRendered.sessions !== state.blockedSessions || blockedRendered.revokingId !== state.revokingId) {
        render(
          blockedEl.querySelector('[data-role="device-list"]'),
          state.blockedSessions.map((s) => deviceRowHtml(s, { showLogout: true, busy: state.revokingId === s.id })),
        );
      }
      blockedRendered = { message: state.blockedMessage, sessions: state.blockedSessions, revokingId: state.revokingId };
    }

    function draw() {
      drawNotification();

      if (state.blockedSessions) {
        if (formParts) {
          formParts.forEach((el) => el.remove());
          formParts = null;
        }
        if (!blockedEl) {
          blockedEl = toElement(blockedScreenHtml());
          blockedRendered = {};
          logo.after(blockedEl);
        }
        drawBlocked();
        return;
      }

      if (blockedEl) {
        blockedEl.remove();
        blockedEl = null;
      }
      if (!formParts) {
        formParts = formTemplates.map((el) => el.cloneNode(true));
        panel.append(...formParts);
        const form = formParts[0];
        form.querySelector('[data-field="email"]').value = state.email;
        form.querySelector('[data-field="password"]').value = state.password;
        form.querySelector('[data-field="remember-me"]').checked = state.rememberMe;
        // The pristine copy shows the initial state - redraw everything that differs from it.
        formRendered = { showPassword: false, isSubmitting: false };
      }
      drawForm();
    }

    // Shared by the initial submit and by the auto-retry that fires right after a device
    // is logged out, so freeing a slot takes the user straight into the app.
    async function attemptLogin() {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: state.email, password: state.password }),
      });

      const data = await response.json().catch(() => null);

      if (response.ok) {
        state.blockedSessions = null;
        state.notification = { type: 'success', message: data?.message || 'Login successful!' };
        draw();
        setTimeout(() => {
          handleLogin(data);
        }, 1200);
        return;
      }

      if (response.status === 409 && Array.isArray(data?.activeSessions)) {
        state.blockedSessions = data.activeSessions;
        state.blockedMessage = data?.error || 'You are already logged in on 3 devices. Log out from one device to continue on this device.';
        draw();
        return;
      }

      state.blockedSessions = null;
      state.notification = { type: 'error', message: data?.error || 'User not found' };
      draw();
    }

    async function handleSubmit(e) {
      e.preventDefault();
      state.isSubmitting = true;
      state.notification = null;
      draw();

      try {
        await attemptLogin();
      } catch (error) {
        console.error('Login error:', error);
        state.notification = { type: 'error', message: 'Network error. Please make sure the backend is running.' };
      } finally {
        state.isSubmitting = false;
        draw();
      }
    }

    async function handleRevokeDevice(sessionId) {
      state.revokingId = sessionId;
      draw();
      try {
        const res = await fetch(`${API_BASE_URL}/api/login/sessions/${sessionId}/revoke`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: state.email, password: state.password }),
        });
        const data = await res.json().catch(() => null);

        if (res.ok) {
          // Drop it from the list right away, then continue the login this device was
          // originally trying to do - only that one device's session is touched.
          state.blockedSessions = state.blockedSessions ? state.blockedSessions.filter((s) => s.id !== sessionId) : state.blockedSessions;
          state.notification = { type: 'success', message: 'Logged out from that device. Logging you in…' };
          state.isSubmitting = true;
          draw();
          await attemptLogin();
          state.isSubmitting = false;
          draw();
        } else {
          state.notification = { type: 'error', message: data?.error || 'Could not log out that device.' };
        }
      } catch (error) {
        console.error('Revoke session error:', error);
        state.notification = { type: 'error', message: 'Network error. Please make sure the backend is running.' };
      } finally {
        state.revokingId = null;
        draw();
      }
    }

    // --- events (delegated on the panel, so they survive the form being re-mounted) ------------
    on(panel, 'submit', '#login-form', handleSubmit);

    on(panel, 'input', '[data-field="email"]', (_e, input) => { state.email = input.value; });
    on(panel, 'input', '[data-field="password"]', (_e, input) => { state.password = input.value; });
    on(panel, 'change', '[data-field="remember-me"]', () => { state.rememberMe = !state.rememberMe; });

    on(panel, 'click', '[data-action="toggle-password"]', () => {
      state.showPassword = !state.showPassword;
      draw();
    });

    on(panel, 'click', '[data-action="close-notification"]', () => {
      state.notification = null;
      draw();
    });

    on(panel, 'click', '[data-action="use-different-account"]', () => {
      state.blockedSessions = null;
      state.notification = null;
      draw();
    });

    on(panel, 'click', '[data-action="revoke-device"]', (_e, button) => {
      const target = (state.blockedSessions || []).find((s) => String(s.id) === button.dataset.id);
      if (target) handleRevokeDevice(target.id);
    });

    // Input borders turn brand green while focused.
    on(panel, 'focusin', '[data-field="email"], [data-field="password"]', (e) => { e.target.style.borderColor = brandGreen; });
    on(panel, 'focusout', '[data-field="email"], [data-field="password"]', (e) => { e.target.style.borderColor = inputBorder; });

    // Hover colours (the React page set these from onMouseOver / onMouseOut).
    on(panel, 'mouseover', '[data-hover="back"]', (_e, el) => { el.style.color = brandGreen; });
    on(panel, 'mouseout', '[data-hover="back"]', (_e, el) => { el.style.color = textLight; });
    on(panel, 'mouseover', '[data-hover="submit"]', (_e, el) => { if (!state.isSubmitting) el.style.background = '#2c5225'; });
    on(panel, 'mouseout', '[data-hover="submit"]', (_e, el) => { if (!state.isSubmitting) el.style.background = brandGreen; });
    on(panel, 'mouseover', '[data-hover="register"]', (_e, el) => {
      el.style.background = brandGreen;
      el.style.color = 'white';
    });
    on(panel, 'mouseout', '[data-hover="register"]', (_e, el) => {
      el.style.background = 'transparent';
      el.style.color = brandGreen;
    });
  }
})();
