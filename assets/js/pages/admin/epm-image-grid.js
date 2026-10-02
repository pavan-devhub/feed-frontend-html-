// Thumbnail grid, upload button and "Image details" dialog shared by the EPM images section's
// block panels (epm-images.js) and the gallery districts (epm-gallery-regions.js).
// Converted from src/pages/admin/epm/ImageGrid.jsx.
(function () {
  'use strict';

  const { html, render, on } = FW.require('core/dom');
  const { icon } = FW.require('core/icons');
  const { getEpmGalleryImageUrl } = FW.require('api/epm-api');
  const { openModal, formErrorHtml, formActionsHtml } = FW.require('pages/admin/admin-ui');
  const { formatSize } = FW.require('pages/admin/admin-utils');

  const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/avif';

  // --- UploadButton -------------------------------------------------------------------------

  const uploadButtonContent = (busy, label) => html`${busy ? icon('loader-2', { size: 15, className: 'admin-pub-spin' }) : icon('image-plus', { size: 15 })} ${label}`;

  /**
   * A button that opens the file picker, followed by its hidden file input (React's <UploadButton>).
   * Wire it once with wireUploadButtons(); change it later with updateUploadButton().
   */
  function uploadButtonHtml({ label = 'Upload', multiple = false, disabled, busy, className = 'admin-pub-btn primary adm-btn-sm' }) {
    return html`<button type="button" class="${className}" data-upload="button" ${disabled || busy ? 'disabled' : ''}>${uploadButtonContent(busy, label)}</button><input type="file" accept="${IMAGE_ACCEPT}" ${multiple ? 'multiple' : ''} hidden data-upload="input" />`;
  }

  /** Updates a button from uploadButtonHtml() in place - its file input is kept. */
  function updateUploadButton(button, { label = 'Upload', multiple = false, disabled, busy }) {
    button.disabled = Boolean(disabled || busy);
    render(button, uploadButtonContent(busy, label));
    const input = button.nextElementSibling;
    if (input) input.multiple = Boolean(multiple);
  }

  /** Opens the picker on click and hands the chosen file(s) to onFiles. Returns an unsubscribe. */
  function wireUploadButtons(root, onFiles) {
    const offs = [
      on(root, 'click', '[data-upload="button"]', (e, button) => button.nextElementSibling?.click()),
      on(root, 'change', '[data-upload="input"]', (e, input) => {
        const files = Array.from(input.files || []);
        input.value = '';
        if (files.length) onFiles(files);
      }),
    ];
    return () => offs.forEach((off) => off());
  }

  // --- ImageGrid ----------------------------------------------------------------------------

  function thumbHtml({ image, index, count, slotLabel, busy, showMeta, canMove, canEdit }) {
    const place = [image.city, image.state].filter(Boolean).join(', ');
    const details = [image.width && image.height ? `${image.width}×${image.height}` : null, formatSize(image.fileSize)].filter(Boolean).join(' · ');
    return html`
    <li class="adm-thumb ${busy ? 'is-busy' : ''}" data-index="${index}" data-id="${image.id}">
      ${slotLabel && html`<span class="adm-thumb-slot">${slotLabel}</span>`}
      <div class="adm-thumb-media"><img src="${getEpmGalleryImageUrl(image.imageUrl)}" alt="${image.caption || ''}" loading="lazy" />${busy && html`<span class="adm-thumb-busy">${icon('loader-2', { size: 20, className: 'admin-pub-spin' })}</span>`}</div>
      <div class="adm-thumb-body">
        ${showMeta && html`
          <div class="adm-thumb-caption ${image.caption ? '' : 'is-empty'}" title="${image.caption || ''}">${image.caption || 'No caption'}</div>
          ${place && html`<div class="adm-cell-sub">${place}</div>`}`}
        <div class="adm-cell-sub">${details}</div>
      </div>
      <div class="adm-thumb-actions">
        ${canMove && html`
          <button type="button" class="admin-pub-icon-btn" title="Move earlier" data-thumb-action="move-earlier" ${busy || index === 0 ? 'disabled' : ''}>${icon('arrow-left', { size: 14 })}</button>
          <button type="button" class="admin-pub-icon-btn" title="Move later" data-thumb-action="move-later" ${busy || index === count - 1 ? 'disabled' : ''}>${icon('arrow-right', { size: 14 })}</button>`}
        ${canEdit && html`<button type="button" class="admin-pub-icon-btn" title="Edit details" data-thumb-action="edit" ${busy ? 'disabled' : ''}>${icon('pencil', { size: 14 })}</button>`}
        <button type="button" class="admin-pub-icon-btn" title="Replace picture" data-thumb-action="replace" ${busy ? 'disabled' : ''}>${icon('refresh-cw', { size: 14 })}</button>
        <button type="button" class="admin-pub-icon-btn danger" title="Delete" data-thumb-action="delete" ${busy ? 'disabled' : ''}>${icon('trash-2', { size: 14 })}</button>
      </div>
      <input type="file" accept="${IMAGE_ACCEPT}" hidden data-thumb-action="replace-input" />
    </li>`;
  }

  /**
   * Thumbnails with move / edit / replace / delete actions (React's <ImageGrid>). `defaults` are
   * built-in pictures that the public page falls back to for positions nothing has been uploaded for
   * yet (e.g. the three stat cards), shown greyed out after the uploaded images. `canMove` / `canEdit`
   * stand for React's optional onMove / onEdit props. Wire the buttons once with wireImageGrid().
   */
  function imageGridHtml({ images, slotLabels, defaults = [], busyId, showMeta = true, canMove = false, canEdit = true }) {
    const fallbackSlots = defaults.slice(images.length);
    return html`
    <ul class="adm-thumb-grid">
      ${images.map((image, i) => thumbHtml({
          image, index: i, count: images.length, slotLabel: slotLabels?.[i], busy: busyId === image.id, showMeta, canMove, canEdit,
        }))}
      ${fallbackSlots.map((src, i) => html`
        <li class="adm-thumb is-default">
          ${slotLabels?.[images.length + i] && html`<span class="adm-thumb-slot">${slotLabels[images.length + i]}</span>`}
          <div class="adm-thumb-media"><img src="${src}" alt="" loading="lazy" /></div>
          <div class="adm-thumb-body"><div class="adm-cell-sub">Built-in picture - shown until you upload one</div></div>
        </li>`)}
    </ul>`;
  }

  /**
   * Delegated handlers for the grid's buttons under `root`. `getImages()` returns the images the grid
   * was drawn from; onMove(index, delta), onEdit(image), onReplace(image, file), onDelete(image).
   */
  function wireImageGrid(root, { getImages, onMove, onEdit, onReplace, onDelete }) {
    const hit = (el) => {
      const li = el.closest('li[data-id]');
      if (!li || !root.contains(li)) return null;
      const image = (getImages() || []).find((img) => String(img.id) === li.dataset.id);
      return image ? { li, image, index: Number(li.dataset.index) } : null;
    };
    const offs = [
      on(root, 'click', '[data-thumb-action]', (e, button) => {
        const action = button.dataset.thumbAction;
        if (action === 'replace-input') return;
        const target = hit(button);
        if (!target) return;
        if (action === 'move-earlier') onMove?.(target.index, -1);
        else if (action === 'move-later') onMove?.(target.index, 1);
        else if (action === 'edit') onEdit?.(target.image);
        else if (action === 'replace') target.li.querySelector('[data-thumb-action="replace-input"]').click();
        else if (action === 'delete') onDelete(target.image);
      }),
      on(root, 'change', '[data-thumb-action="replace-input"]', (e, input) => {
        const file = input.files?.[0];
        input.value = '';
        const target = hit(input);
        if (file && target) onReplace(target.image, file);
      }),
    ];
    return () => offs.forEach((off) => off());
  }

  // --- ImageDetailsModal --------------------------------------------------------------------

  /**
   * Caption (and, for page sections, where it was taken) for one image. `onSave(payload)` is awaited;
   * the dialog closes when it resolves and shows the error when it throws. Returns the modal controller.
   */
  function openImageDetailsModal({ image, showPlace = true, onSave, onClose }) {
    const form = {
      caption: image.caption || '',
      city: image.city || '',
      state: image.state || '',
    };
    let busy = false;
    const modal = openModal({ title: 'Image details', icon: 'pencil', onClose });
    modal.setContent(html`
    <form class="admin-pub-form">
      <label>
        Caption <span class="optional">(optional)</span>
        <input type="text" maxlength="500" data-field="caption" value="${form.caption}" placeholder="e.g. Opening session with exporters" />
      </label>
      ${showPlace && html`
        <div class="admin-pub-form-row">
          <label>
            Place <span class="optional">(optional)</span>
            <input type="text" data-field="city" value="${form.city}" />
          </label>
          <label>
            State <span class="optional">(optional)</span>
            <input type="text" data-field="state" value="${form.state}" />
          </label>
        </div>`}
      ${formActionsHtml({ busy, submitLabel: 'Save', busyLabel: 'Saving…' })}
    </form>`);
    const formEl = modal.element.querySelector('form');

    const setError = (message) => {
      formEl.querySelector(':scope > .admin-pub-form-error')?.remove();
      if (message) formEl.insertAdjacentHTML('afterbegin', String(formErrorHtml(message)));
    };
    const setBusy = (value) => {
      busy = value;
      modal.setBusy(value);
      formEl.querySelector(':scope > .admin-pub-form-actions').outerHTML = String(formActionsHtml({ busy, submitLabel: 'Save', busyLabel: 'Saving…' }));
    };

    formEl.addEventListener('input', (e) => {
      const field = e.target.dataset.field;
      if (field) form[field] = e.target.value;
    });
    formEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      setBusy(true);
      setError('');
      try {
        await onSave(showPlace ? form : { caption: form.caption });
        modal.close();
      } catch (err) {
        setError(err.message);
        setBusy(false);
      }
    });
    return modal;
  }

  FW.define('pages/admin/epm-image-grid', {
    IMAGE_ACCEPT,
    uploadButtonHtml,
    updateUploadButton,
    wireUploadButtons,
    imageGridHtml,
    wireImageGrid,
    openImageDetailsModal,
  });
})();
