// Small building blocks shared by every admin section. They reuse the admin-pub-* styles from
// assets/css/pages/admin-publications.css (the Feed World publications screen), so EPM and Feed World
// admin look alike.
(function () {
  'use strict';

  const { html, render, toElement } = FW.require('core/dom');
  const { icon } = FW.require('core/icons');

  /**
   * Opens a dialog appended to <body>. Escape / backdrop click / the X close it unless busy.
   * Returns a controller:
   *   modal.element              the .admin-pub-modal box (query inputs inside it)
   *   modal.setContent(html``)   replaces everything below the header (call again to re-render)
   *   modal.setBusy(bool)        while busy the dialog can't be closed
   *   modal.close()
   * Clicks on [data-action="modal-cancel"] inside the content also close it (see formActionsHtml).
   */
  function openModal({ title, icon: iconName, size, content, onClose }) {
    const sizeClass = size === 'wide' ? ' admin-pub-modal-wide'
      : size === 'narrow' ? ' admin-pub-modal-narrow'
        : size === 'medium' ? ' adm-modal-medium' : '';

    const backdrop = toElement(html`
    <div class="admin-pub-modal-backdrop">
      <div class="admin-pub-modal${sizeClass}" role="dialog" aria-modal="true" aria-label="${title}">
        <div class="admin-pub-modal-header">
          <h3>${iconName && icon(iconName, { size: 18 })} ${title}</h3>
          <button type="button" data-action="modal-close" aria-label="Close">${icon('x', { size: 18 })}</button>
        </div>
      </div>
    </div>`);
    const box = backdrop.firstElementChild;
    const header = box.firstElementChild;
    let busy = false;
    let closed = false;

    const close = () => {
      if (closed) return;
      closed = true;
      window.removeEventListener('keydown', onKey);
      backdrop.remove();
      if (onClose) onClose();
    };
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) close();
    };

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        if (!busy) close();
        return;
      }
      const btn = e.target.closest('[data-action="modal-close"], [data-action="modal-cancel"]');
      if (btn && box.contains(btn) && !busy) close();
    });
    window.addEventListener('keydown', onKey);

    const controller = {
      element: box,
      setContent(next) {
        while (header.nextSibling) header.nextSibling.remove();
        const holder = document.createElement('div');
        render(holder, next);
        box.append(...holder.childNodes);
      },
      setBusy(value) {
        busy = Boolean(value);
        header.querySelector('[data-action="modal-close"]').disabled = busy;
      },
      get busy() {
        return busy;
      },
      close,
    };

    if (content) controller.setContent(content);
    document.body.appendChild(backdrop);
    return controller;
  }

  function formErrorHtml(message) {
    if (!message) return '';
    return html`<div class="admin-pub-form-error">${icon('alert-circle', { size: 14 })} ${message}</div>`;
  }

  /**
   * Cancel + submit buttons. Cancel carries data-action="modal-cancel" (openModal closes on it).
   * submitType 'submit' (default) submits the surrounding <form>; 'button' renders a plain button
   * with data-action="modal-submit" for the caller to handle. submitLabel may be an html`` result.
   */
  function formActionsHtml({ busy = false, submitLabel, busyLabel, danger = false, submitType = 'submit' }) {
    return html`
    <div class="admin-pub-form-actions">
      <button type="button" data-action="modal-cancel" ${busy ? 'disabled' : ''}>Cancel</button>
      <button type="${submitType}" class="${danger ? 'danger' : 'primary'}" ${submitType === 'button' ? 'data-action="modal-submit"' : ''} ${busy ? 'disabled' : ''}>
        ${busy ? html`${icon('loader-2', { size: 14, className: 'admin-pub-spin' })} ${busyLabel}` : submitLabel}
      </button>
    </div>`;
  }

  /**
   * "Are you sure?" dialog for deletes. `onConfirm` may be async; if it throws, the error is shown
   * inline and the dialog stays open. Resolves true once onConfirm succeeded (dialog closed),
   * false when cancelled.
   */
  function confirmDialog({ title, content, confirmLabel = 'Delete', onConfirm }) {
    return new Promise((resolve) => {
      let error = '';
      let busy = false;
      let done = false;
      const modal = openModal({
        title,
        icon: 'trash-2',
        size: 'narrow',
        onClose: () => {
          if (!done) resolve(false);
        },
      });
      const draw = () => modal.setContent(html`
      <div class="admin-pub-form">
        ${formErrorHtml(error)}
        ${content}
        ${formActionsHtml({
            busy, danger: true, submitType: 'button', busyLabel: 'Deleting…',
            submitLabel: html`${icon('trash-2', { size: 14 })} ${confirmLabel}`,
          })}
      </div>`);
      modal.element.addEventListener('click', async (e) => {
        if (!e.target.closest('[data-action="modal-submit"]') || busy) return;
        busy = true;
        error = '';
        modal.setBusy(true);
        draw();
        try {
          await onConfirm();
          done = true;
          modal.setBusy(false);
          modal.close();
          resolve(true);
        } catch (err) {
          error = err.message || 'Something went wrong.';
          busy = false;
          modal.setBusy(false);
          draw();
        }
      });
      draw();
    });
  }

  function bannerHtml(banner) {
    if (!banner) return '';
    return html`
    <div class="admin-pub-banner ${banner.type}" role="status">
      ${icon(banner.type === 'success' ? 'check-circle-2' : 'alert-circle', { size: 16 })}
      ${banner.message}
    </div>`;
  }

  /** A dismissing success/error strip, e.g. "Category added." - rendered into `el`. */
  function createBanner(el) {
    let timer = null;
    return {
      show(type, message) {
        clearTimeout(timer);
        render(el, bannerHtml({ type, message }));
        timer = setTimeout(() => render(el, ''), 4500);
      },
      clear() {
        clearTimeout(timer);
        render(el, '');
      },
    };
  }

  /** `actions` (optional html``) goes into the header's right-hand .adm-header-actions slot. */
  function sectionHeaderHtml({ eyebrow, icon: iconName, title, description, actions }) {
    return html`
    <div class="admin-pub-header">
      <div>
        <div class="admin-pub-eyebrow">${iconName && icon(iconName, { size: 14 })} ${eyebrow}</div>
        <h1>${title}</h1>
        ${description && html`<p>${description}</p>`}
      </div>
      ${actions && html`<div class="adm-header-actions">${actions}</div>`}
    </div>`;
  }

  function loadingHtml(label = 'Loading…') {
    return html`<div class="admin-pub-empty">${icon('loader-2', { size: 18, className: 'admin-pub-spin' })} ${label}</div>`;
  }

  function emptyHtml(content) {
    return html`<div class="admin-pub-empty">${content}</div>`;
  }

  FW.define('pages/admin/admin-ui', {
    openModal,
    formErrorHtml,
    formActionsHtml,
    confirmDialog,
    bannerHtml,
    createBanner,
    sectionHeaderHtml,
    loadingHtml,
    emptyHtml,
  });
})();
