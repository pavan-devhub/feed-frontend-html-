// The images section's "States & districts" tab: the gallery page's "Explore by state" cards,
// state -> district -> photos. A state or district only appears on the public page once it has at
// least one photo. Converted from src/pages/admin/epm/EpmGalleryRegionsAdmin.jsx.
//
//   const regions = mountGalleryRegions({ showBanner });  container.append(regions.el);
//   ...  regions.destroy();
// `regions.el` is the current root: a loading line first, then <div class="adm-regions"> (the
// widget swaps one for the other in place).
(function () {
  'use strict';

  const { html, render, on, toElement } = FW.require('core/dom');
  const { icon } = FW.require('core/icons');
  const {
    fetchGalleryStatesAdmin,
    createGalleryState,
    updateGalleryState,
    deleteGalleryState,
    setGalleryStateCover,
    removeGalleryStateCover,
    createGalleryDistrict,
    updateGalleryDistrict,
    deleteGalleryDistrict,
    fetchDistrictPhotos,
    uploadDistrictPhoto,
    updateDistrictPhoto,
    replaceDistrictPhoto,
    reorderDistrictPhotos,
    deleteDistrictPhoto,
  } = FW.require('api/admin-epm-api');
  const { getEpmGalleryImageUrl } = FW.require('api/epm-api');
  const {
    openModal,
    confirmDialog,
    formErrorHtml,
    formActionsHtml,
    loadingHtml,
    emptyHtml,
  } = FW.require('pages/admin/admin-ui');
  const {
    IMAGE_ACCEPT,
    imageGridHtml,
    wireImageGrid,
    openImageDetailsModal,
    uploadButtonHtml,
    updateUploadButton,
    wireUploadButtons,
  } = FW.require('pages/admin/epm-image-grid');

  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

  // Replaces the nodes between `start` and `end` (exclusive; end null = to the last child), so a
  // block that React rendered conditionally can come and go without an extra wrapper element.
  function renderBetween(start, end, content) {
    while (start.nextSibling && start.nextSibling !== end) start.nextSibling.remove();
    const tpl = document.createElement('template');
    render(tpl, content);
    start.parentNode.insertBefore(tpl.content, end);
  }

  // Re-renders `el` only when its markup changed (so e.g. the cover <img> isn't rebuilt when just
  // another district is picked) and puts keyboard focus back on the matching button, as React (which
  // patches the DOM instead of replacing it) would have kept it.
  const lastMarkup = new WeakMap();
  function update(el, content) {
    const markup = String(html`${content}`);
    if (lastMarkup.get(el) === markup) return;
    lastMarkup.set(el, markup);
    const active = document.activeElement;
    let selector = null;
    if (active && el.contains(active)) {
      const attr = ['data-state-id', 'data-district-id', 'data-action'].find((a) => active.hasAttribute(a));
      if (attr) selector = `[${attr}="${CSS.escape(active.getAttribute(attr))}"]`;
    }
    el.innerHTML = markup;
    if (selector) el.querySelector(selector)?.focus();
  }

  // Small tracker so destroy() can close whatever dialog is still open.
  function createModalTracker() {
    const open = new Set();
    return {
      add(modal) {
        open.add(modal);
        return modal;
      },
      remove(modal) {
        open.delete(modal);
      },
      confirm(options) {
        const promise = confirmDialog(options);
        const backdrop = document.body.lastElementChild;
        const handle = {
          close() {
            const x = backdrop.querySelector('[data-action="modal-close"]');
            if (x && !x.disabled) x.click();
            else backdrop.remove();
          },
        };
        open.add(handle);
        promise.finally(() => open.delete(handle));
        return promise;
      },
      closeAll() {
        [...open].forEach((m) => m.close());
      },
    };
  }

  function mountGalleryRegions({ showBanner }) {
    const state = {
      states: null,
      error: '',
      stateId: null,
      districtId: null,
      coverBusy: false,
    };
    let disposed = false;
    const modals = createModalTracker();
    let districtPanel = null; // the mounted DistrictPhotos for the open district
    let offs = [];

    let el = toElement(loadingHtml('Loading states…'));
    let root = null;

    const currentState = () => state.states?.find((s) => s.id === state.stateId) || null;
    const currentDistrict = () => currentState()?.districts.find((d) => d.id === state.districtId) || null;

    // Keep the open district valid when switching state or after a delete.
    const syncDistrict = () => {
      const st = currentState();
      if (st && !st.districts.some((d) => d.id === state.districtId)) state.districtId = st.districts[0]?.id ?? null;
    };

    // --- drawing ---

    const pillsHtml = () => state.states.map((s) => html`
    <button type="button" role="tab" aria-selected="${String(s.id === state.stateId)}"
      class="adm-pill ${s.id === state.stateId ? 'active' : ''} ${s.photoCount === 0 ? 'is-empty' : ''}" data-state-id="${s.id}">
      ${s.name} <span>${s.districts.length} · ${s.photoCount}</span>
    </button>`);

    const statePanelHtml = (st) => html`
    <div class="adm-state-cover">
      ${st.coverUrl
          ? html`<img src="${getEpmGalleryImageUrl(st.coverUrl)}" alt="${`${st.name} cover`}" />`
          : html`<span class="adm-state-cover-empty">${icon('image-off', { size: 22 })}</span>`}
    </div>
    <div class="adm-state-info">
      <h3>${st.name}</h3>
      <p class="adm-cell-sub">${plural(st.districts.length, 'district')} · ${plural(st.photoCount, 'photo')}${st.photoCount === 0 && ' · hidden on the gallery page until it has a photo'}</p>
      <p class="adm-cell-sub">Card picture: ${st.hasCustomCover ? 'its own cover' : st.coverUrl ? 'first photo of its first district' : 'none yet'}</p>
      <div class="adm-inline-actions">
        <button type="button" class="admin-pub-btn adm-btn-secondary adm-btn-sm" data-action="cover-upload" ${state.coverBusy ? 'disabled' : ''}>
          ${icon('image-plus', { size: 14 })} ${st.hasCustomCover ? 'Change cover' : 'Upload cover'}
        </button>
        ${st.hasCustomCover && html`
          <button type="button" class="admin-pub-btn adm-btn-secondary adm-btn-sm" data-action="cover-reset" ${state.coverBusy ? 'disabled' : ''}>
            Use first photo instead
          </button>`}
        <button type="button" class="admin-pub-btn adm-btn-secondary adm-btn-sm" data-action="state-rename">
          ${icon('pencil', { size: 14 })} Rename / reorder
        </button>
        <button type="button" class="admin-pub-btn adm-btn-danger adm-btn-sm" data-action="state-delete">
          ${icon('trash-2', { size: 14 })} Delete state
        </button>
      </div>
      <input type="file" accept="${IMAGE_ACCEPT}" hidden data-action="cover-input" />
    </div>`;

    const districtListHtml = (st) => html`
    <div class="adm-district-list-head">
      <span>Districts</span>
      <button type="button" class="adm-link-btn" data-action="district-add">${icon('folder-plus', { size: 14 })} Add</button>
    </div>
    ${st.districts.length === 0 ? html`<p class="adm-cell-sub adm-pad">No districts yet.</p>` : html`
      <ul>
        ${st.districts.map((d) => html`
          <li>
            <button type="button" class="adm-district ${d.id === state.districtId ? 'active' : ''}" data-district-id="${d.id}">
              <span class="adm-district-thumb">${d.coverUrl ? html`<img src="${getEpmGalleryImageUrl(d.coverUrl)}" alt="" loading="lazy" />` : icon('map', { size: 14 })}</span>
              <span class="adm-district-name">${d.name}</span>
              <span class="adm-district-count">${d.photoCount}</span>
            </button>
          </li>`)}
      </ul>`}`;

    const drawDistrictPhotos = (photosEl) => {
      const district = currentDistrict();
      if (district && districtPanel && districtPanel.districtId === district.id) {
        districtPanel.setDistrict(district);
        return;
      }
      districtPanel?.destroy();
      districtPanel = null;
      if (district) {
        districtPanel = mountDistrictPhotos(district, {
          showBanner,
          onChanged: () => load(),
          onRename: () => openNameModal('district', currentDistrict()),
          onDelete: () => askDelete('district', currentDistrict()),
        });
        render(photosEl, '');
        photosEl.append(districtPanel.el);
      } else {
        render(photosEl, emptyHtml('Add a district to start uploading its photos.'));
      }
    };

    const draw = () => {
      if (disposed || state.states === null) return;
      syncDistrict();
      if (!root) {
        root = toElement(html`
        <div class="adm-regions">
          <div class="adm-region-bar">
            <div class="adm-pills" role="tablist" aria-label="States"></div>
            <button type="button" class="admin-pub-btn primary adm-btn-sm" data-action="state-add">
              ${icon('plus', { size: 15 })} Add state
            </button>
          </div>
        </div>`);
        el.replaceWith(root);
        el = root;
        wire();
      }
      const bar = root.querySelector('.adm-region-bar');

      root.querySelector(':scope > .admin-pub-banner')?.remove();
      if (state.error) bar.insertAdjacentHTML('beforebegin', String(html`<div class="admin-pub-banner error">${state.error}</div>`));

      const pills = bar.querySelector('.adm-pills');
      update(pills, pillsHtml());

      const st = currentState();
      if (!st) {
        districtPanel?.destroy();
        districtPanel = null;
        renderBetween(bar, null, emptyHtml('No states yet. Add one, then add its districts and their photos.'));
        return;
      }
      if (!root.querySelector(':scope > .adm-state-panel')) {
        renderBetween(bar, null, html`
        <section class="adm-block adm-state-panel"></section>
        <div class="adm-district-layout">
          <aside class="adm-district-list"></aside>
          <div class="adm-district-photos"></div>
        </div>`);
      }
      const panel = root.querySelector(':scope > .adm-state-panel');
      update(panel, statePanelHtml(st));
      const aside = root.querySelector('.adm-district-list');
      update(aside, districtListHtml(st));
      drawDistrictPhotos(root.querySelector('.adm-district-photos'));
    };

    // --- data ---

    const load = async () => {
      try {
        const data = await fetchGalleryStatesAdmin();
        state.states = data;
        state.error = '';
        state.stateId = data.some((s) => s.id === state.stateId) ? state.stateId : data[0]?.id ?? null;
        draw();
        return data;
      } catch (e) {
        state.error = e.message;
        state.states = [];
        draw();
        return [];
      }
    };

    const changeCover = async (file) => {
      const st = currentState();
      state.coverBusy = true;
      draw();
      try {
        await setGalleryStateCover(st.id, file);
        showBanner('success', `New cover picture for ${st.name}.`);
        await load();
      } catch (e) {
        showBanner('error', e.message);
      } finally {
        state.coverBusy = false;
        draw();
      }
    };

    const resetCover = async () => {
      const st = currentState();
      state.coverBusy = true;
      draw();
      try {
        await removeGalleryStateCover(st.id);
        showBanner('success', `${st.name} now uses its first district photo as the cover.`);
        await load();
      } catch (e) {
        showBanner('error', e.message);
      } finally {
        state.coverBusy = false;
        draw();
      }
    };

    // --- dialogs ---

    // NameModal: add or edit (name + position) a state or a district.
    const openNameModal = (kind, item) => {
      const parent = currentState();
      let name = item?.name || '';
      let order = item ? String(item.displayOrder) : '';
      let busy = false;
      const submitLabel = item ? 'Save' : `Add ${kind}`;
      const title = `${item ? 'Edit' : 'Add'} ${kind}${kind === 'district' && parent?.name ? ` in ${parent.name}` : ''}`;

      const modal = modals.add(openModal({
        title,
        icon: kind === 'state' ? 'map' : 'folder-plus',
        size: 'narrow',
        onClose: () => modals.remove(modal),
      }));
      modal.setContent(html`
      <form class="admin-pub-form">
        <label>
          Name
          <input type="text" data-field="name" value="${name}" maxlength="100" required placeholder="${kind === 'state' ? 'e.g. Karnataka' : 'e.g. Mysuru'}" />
        </label>
        <label>
          Position <span class="optional">(lower comes first${item ? '' : '; blank = last'})</span>
          <input type="number" data-field="order" min="0" value="${order}" />
        </label>
        ${item && html`<p class="admin-pub-hint adm-hint-tight">Renaming changes the page's web address but keeps every photo.</p>`}
        ${formActionsHtml({ busy, submitLabel, busyLabel: 'Saving…' })}
      </form>`);
      const formEl = modal.element.querySelector('form');
      formEl.querySelector('[data-field="name"]').focus();

      const setError = (message) => {
        formEl.querySelector(':scope > .admin-pub-form-error')?.remove();
        if (message) formEl.insertAdjacentHTML('afterbegin', String(formErrorHtml(message)));
      };
      const setBusy = (value) => {
        busy = value;
        modal.setBusy(value);
        formEl.querySelector(':scope > .admin-pub-form-actions').outerHTML = String(formActionsHtml({ busy, submitLabel, busyLabel: 'Saving…' }));
      };

      formEl.addEventListener('input', (e) => {
        if (e.target.dataset.field === 'name') name = e.target.value;
        else if (e.target.dataset.field === 'order') order = e.target.value;
      });
      formEl.addEventListener('submit', async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        const payload = { name, displayOrder: order === '' ? null : Number(order) };
        let saved;
        try {
          if (kind === 'state') {
            saved = item ? await updateGalleryState(item.id, payload) : await createGalleryState(payload);
          } else {
            saved = item ? await updateGalleryDistrict(item.id, payload) : await createGalleryDistrict(parent.id, payload);
          }
        } catch (err) {
          setError(err.message);
          setBusy(false);
          return;
        }
        modal.close();
        showBanner('success', `${item ? 'Saved' : 'Added'} ${saved.name}.`);
        await load();
        if (kind === 'state' && !item) state.stateId = saved.id;
        if (kind === 'district' && !item) state.districtId = saved.id;
        draw();
      });
    };

    const askDelete = (kind, item) => {
      if (!item) return;
      modals.confirm({
        title: `Delete ${kind}?`,
        content: html`
        <p>Delete <strong>${item.name}</strong>${kind === 'state'
            ? ` with its ${plural(item.districts.length, 'district')} and ${plural(item.photoCount, 'photo')}?`
            : ` and its ${plural(item.photoCount, 'photo')}?`}</p>
        <p class="admin-pub-hint">The photo files are removed from the server as well. This can't be undone.</p>`,
        onConfirm: async () => {
          if (kind === 'state') await deleteGalleryState(item.id);
          else await deleteGalleryDistrict(item.id);
          showBanner('success', `Deleted ${item.name}.`);
          load();
        },
      });
    };

    // --- events (attached once the .adm-regions root exists) ---

    function wire() {
      offs = [
        on(root, 'click', '[data-state-id]', (e, pill) => {
          state.stateId = Number(pill.dataset.stateId);
          draw();
        }),
        on(root, 'click', '[data-district-id]', (e, button) => {
          state.districtId = Number(button.dataset.districtId);
          draw();
        }),
        on(root, 'click', '[data-action]', (e, button) => {
          const { action } = button.dataset;
          if (action === 'state-add') openNameModal('state', undefined);
          else if (action === 'state-rename') openNameModal('state', currentState());
          else if (action === 'state-delete') askDelete('state', currentState());
          else if (action === 'district-add') openNameModal('district', undefined);
          else if (action === 'cover-upload') root.querySelector('[data-action="cover-input"]')?.click();
          else if (action === 'cover-reset') resetCover();
        }),
        on(root, 'change', '[data-action="cover-input"]', (e, input) => {
          const file = input.files?.[0];
          input.value = '';
          if (file) changeCover(file);
        }),
      ];
    }

    load();

    return {
      get el() {
        return el;
      },
      destroy() {
        disposed = true;
        offs.forEach((off) => off());
        districtPanel?.destroy();
        districtPanel = null;
        modals.closeAll();
      },
    };
  }

  // --- DistrictPhotos: the photos of one district (React keyed it by district id) ---------

  function mountDistrictPhotos(initialDistrict, { showBanner, onChanged, onRename, onDelete }) {
    let district = initialDistrict;
    const state = { photos: null, uploading: '', busyId: null };
    let disposed = false;
    const modals = createModalTracker();

    const el = toElement(html`
    <section class="adm-block">
      <div class="adm-block-head">
        <div>
          <h3></h3>
          <p>The first photo is the district card's picture. Photos are shown in this order.</p>
        </div>
        <div class="adm-inline-actions">
          <button type="button" class="admin-pub-icon-btn" title="Rename / reorder district" data-district-action="rename">${icon('pencil', { size: 15 })}</button>
          <button type="button" class="admin-pub-icon-btn danger" title="Delete district" data-district-action="delete">${icon('trash-2', { size: 15 })}</button>
          ${uploadButtonHtml({ label: 'Upload photos', multiple: true, busy: false })}
        </div>
      </div>
      <!--photos-->
    </section>`);
    const head = el.querySelector('.adm-block-head');
    const title = head.querySelector('h3');
    const uploadButton = head.querySelector('[data-upload="button"]');
    const photosMarker = Array.from(el.childNodes).find((n) => n.nodeType === Node.COMMENT_NODE);

    const drawHead = () => {
      render(title, html`${district.name} <span class="adm-block-count">${state.photos ? state.photos.length : district.photoCount}</span>`);
      updateUploadButton(uploadButton, { label: 'Upload photos', multiple: true, busy: Boolean(state.uploading) });
    };
    const drawStatus = () => renderBetween(head, photosMarker, state.uploading && html`<p class="admin-pub-hint adm-hint-tight">${state.uploading}</p>`);
    const drawPhotos = () => {
      const { photos } = state;
      renderBetween(photosMarker, null, photos === null ? loadingHtml() : photos.length === 0
        ? html`<div class="adm-block-empty">No photos yet - this district is hidden on the gallery page until it has one.</div>`
        : imageGridHtml({ images: photos, busyId: state.busyId, canMove: photos.length > 1 }));
    };
    const draw = () => {
      if (disposed) return;
      drawHead();
      drawStatus();
      drawPhotos();
    };

    const load = () => {
      const id = district.id;
      fetchDistrictPhotos(id)
        .then((data) => { state.photos = data; })
        .catch((e) => {
          showBanner('error', e.message);
          state.photos = [];
        })
        .then(draw);
    };

    const upload = async (files) => {
      const failures = [];
      let done = 0;
      for (const file of files) {
        state.uploading = `Uploading ${done + failures.length + 1} of ${files.length}…`;
        draw();
        try {
          await uploadDistrictPhoto(district.id, file);
          done += 1;
        } catch (e) {
          failures.push(`${file.name}: ${e.message}`);
        }
      }
      state.uploading = '';
      draw();
      if (!disposed) load();
      onChanged();
      showBanner(failures.length ? 'error' : 'success',
        failures.length ? failures.join(' · ') : `Added ${plural(done, 'photo')} to ${district.name}.`);
    };

    const withBusy = async (id, action, success) => {
      state.busyId = id;
      draw();
      try {
        await action();
        if (success) showBanner('success', success);
        if (!disposed) load();
        onChanged();
      } catch (e) {
        showBanner('error', e.message);
      } finally {
        state.busyId = null;
        draw();
      }
    };

    const move = (index, delta) => {
      const ids = state.photos.map((p) => p.id);
      const [id] = ids.splice(index, 1);
      ids.splice(index + delta, 0, id);
      withBusy(id, async () => {
        state.photos = await reorderDistrictPhotos(district.id, ids);
        draw();
      });
    };

    const offs = [
      on(el, 'click', '[data-district-action]', (e, button) => {
        if (button.dataset.districtAction === 'rename') onRename();
        else onDelete();
      }),
      wireUploadButtons(el, upload),
      wireImageGrid(el, {
        getImages: () => state.photos,
        onMove: move,
        onEdit: (photo) => {
          const modal = modals.add(openImageDetailsModal({
            image: photo,
            showPlace: false,
            onClose: () => modals.remove(modal),
            onSave: async (payload) => {
              await updateDistrictPhoto(district.id, photo.id, payload);
              showBanner('success', 'Caption saved.');
              if (!disposed) load();
            },
          }));
        },
        onReplace: (photo, file) => withBusy(photo.id, () => replaceDistrictPhoto(district.id, photo.id, file), 'Photo replaced.'),
        onDelete: (photo) => modals.confirm({
          title: 'Delete photo?',
          content: html`<p>Delete this photo from <strong>${district.name}</strong>? The file is removed from the server too.</p>`,
          onConfirm: async () => {
            await deleteDistrictPhoto(district.id, photo.id);
            showBanner('success', `Photo removed from ${district.name}.`);
            if (!disposed) load();
            onChanged();
          },
        }),
      }),
    ];

    draw();
    load();

    return {
      el,
      districtId: initialDistrict.id,
      setDistrict(next) {
        district = next;
        if (!disposed) drawHead();
      },
      destroy() {
        disposed = true;
        offs.forEach((off) => off());
        modals.closeAll();
      },
    };
  }

  FW.define('pages/admin/epm-gallery-regions', { mountGalleryRegions });
})();
