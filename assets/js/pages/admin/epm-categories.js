// Admin panel -> EPM -> Categories. Converted from src/pages/admin/epm/EpmCategoriesAdmin.jsx.
// mount(container, ctx) renders the section into <main class="adm-main"> and returns a cleanup.
import { html, render, on } from '../../core/dom.js';
import { icon } from '../../core/icons.js';
import {
  fetchAdminCategories, createAdminCategory, updateAdminCategory, deleteAdminCategory, CATEGORY_COLORS,
} from '../../api/admin-epm-api.js';
import {
  openModal, confirmDialog, formErrorHtml, formActionsHtml, createBanner, sectionHeaderHtml, loadingHtml, emptyHtml,
} from './admin-ui.js';

// Replaces the nodes between `start` and `end` (exclusive; end null = to the last child), so a
// block that React rendered conditionally can come and go without an extra wrapper element.
function renderBetween(start, end, content) {
  while (start.nextSibling && start.nextSibling !== end) start.nextSibling.remove();
  const tpl = document.createElement('template');
  render(tpl, content);
  start.parentNode.insertBefore(tpl.content, end);
}

export function mount(container, ctx) {
  const state = { categories: [], loading: true, error: '' };
  let disposed = false;
  const modals = new Set();

  render(container, html`
    ${sectionHeaderHtml({
      eyebrow: 'EPM',
      icon: 'tags',
      title: 'Categories',
      description: 'The categories an EPM can belong to. They power the “Filter by Category” list on the public EPM directory and the category chosen for each upcoming EPM.',
      actions: html`<button type="button" class="admin-pub-btn primary" data-action="add">${icon('plus', { size: 16 })} Add category</button>`,
    })}
    <div data-slot="banner" style="display: contents;"></div>`);
  const bannerSlot = container.querySelector('[data-slot="banner"]');
  const banner = createBanner(bannerSlot);

  const tableHtml = () => html`
    <table class="admin-pub-table adm-table">
      <thead>
        <tr>
          <th>Order</th>
          <th>Category</th>
          <th>Shown on the directory as</th>
          <th class="adm-num">Upcoming EPMs</th>
          <th class="adm-num">All EPMs</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${state.categories.map((c) => html`
          <tr>
            <td data-label="Order" class="adm-muted">${c.displayOrder}</td>
            <td data-label="Category"><span class="adm-tag adm-tag-${c.color}">${c.name}</span></td>
            <td data-label="Shown as">${c.label}</td>
            <td data-label="Upcoming EPMs" class="adm-num">${c.upcomingEventCount}</td>
            <td data-label="All EPMs" class="adm-num">
              <button type="button" class="adm-count-btn" data-action="open-events" title="Open EPM events">${c.eventCount}</button>
            </td>
            <td class="admin-pub-actions" data-label="Actions">
              <button type="button" class="admin-pub-icon-btn" title="Edit" data-action="edit" data-id="${c.id}">
                ${icon('pencil', { size: 15 })}
              </button>
              <button type="button" class="admin-pub-icon-btn danger" title="${c.eventCount > 0 ? 'In use - move its EPMs first' : 'Delete'}" data-action="delete" data-id="${c.id}">
                ${icon('trash-2', { size: 15 })}
              </button>
            </td>
          </tr>`)}
      </tbody>
    </table>`;

  // Everything below the banner: the load error and the table.
  const draw = () => {
    if (disposed) return;
    renderBetween(bannerSlot, null, html`
      ${state.error && html`<div class="admin-pub-banner error">${state.error}</div>`}
      <div class="admin-pub-table-wrap">
        ${state.loading ? loadingHtml('Loading categories…') : state.categories.length === 0
          ? emptyHtml('No categories yet - add one so EPMs can be filed under it.')
          : tableHtml()}
      </div>`);
  };

  const load = async () => {
    state.loading = true;
    draw();
    try {
      const data = await fetchAdminCategories();
      if (disposed) return;
      state.categories = data;
      state.error = '';
    } catch (e) {
      if (disposed) return;
      state.error = e.message;
    } finally {
      if (!disposed) {
        state.loading = false;
        draw();
      }
    }
  };

  const confirmTracked = (options) => {
    const promise = confirmDialog(options);
    const backdrop = document.body.lastElementChild;
    const handle = {
      close() {
        const x = backdrop.querySelector('[data-action="modal-close"]');
        if (x && !x.disabled) x.click();
        else backdrop.remove();
      },
    };
    modals.add(handle);
    promise.finally(() => modals.delete(handle));
    return promise;
  };

  const askDelete = (c) => confirmTracked({
    title: 'Delete category?',
    content: html`
      <p>Delete the category <strong>${c.name}</strong>?</p>
      ${c.eventCount > 0 && html`
        <p class="admin-pub-hint">${c.eventCount} EPM(s) still use it, so it can't be deleted until they are moved to another category.</p>`}`,
    onConfirm: async () => {
      await deleteAdminCategory(c.id);
      if (disposed) return;
      banner.show('success', `Deleted “${c.name}”.`);
      load();
    },
  });

  const onSaved = (saved, renamedFrom) => {
    if (disposed) return;
    banner.show('success', renamedFrom && renamedFrom !== saved.name
      ? `Renamed “${renamedFrom}” to “${saved.name}” - its ${saved.eventCount} EPM(s) were updated too.`
      : `Saved “${saved.name}”.`);
    load();
  };

  const openCategoryForm = (category) => {
    const form = {
      name: category?.name || '',
      label: category?.label || '',
      color: category?.color || 'green',
      displayOrder: category?.displayOrder ?? state.categories.length,
    };
    let busy = false;
    const submitLabel = category ? 'Save changes' : 'Add category';
    const showRenameHint = () => Boolean(category && form.name.trim() !== category.name && category.eventCount > 0);
    const renameHintHtml = () => html`<p class="admin-pub-hint adm-hint-tight">Renaming also updates the ${category.eventCount} EPM(s) in this category.</p>`;
    const swatchesHtml = () => CATEGORY_COLORS.map((c) => html`
      <button type="button" role="radio" aria-checked="${String(form.color === c)}" aria-label="${c}"
        class="adm-swatch adm-tag-${c} ${form.color === c ? 'selected' : ''}" data-color="${c}">${c}</button>`);

    const modal = openModal({
      title: category ? 'Edit category' : 'Add category',
      icon: 'tags',
      onClose: () => modals.delete(modal),
    });
    modals.add(modal);
    modal.setContent(html`
      <form class="admin-pub-form">
        <label>
          Name
          <input type="text" data-field="name" value="${form.name}" maxlength="100" required placeholder="e.g. Buyer-Seller Meet" />
        </label>
        ${showRenameHint() && renameHintHtml()}
        <label>
          Longer label <span class="optional">(optional - shown in the directory's category list)</span>
          <input type="text" data-field="label" value="${form.label}" maxlength="200" placeholder="${form.name || 'Defaults to the name'}" />
        </label>
        <div class="admin-pub-field-block">
          <span class="admin-pub-field-label">Colour</span>
          <div class="adm-swatches" role="radiogroup">${swatchesHtml()}</div>
        </div>
        <label>
          Position in lists
          <input type="number" data-field="displayOrder" min="0" value="${form.displayOrder}" />
        </label>
        ${formActionsHtml({ busy, submitLabel, busyLabel: 'Saving…' })}
      </form>`);
    const formEl = modal.element.querySelector('form');
    const nameLabel = formEl.querySelector('[data-field="name"]').closest('label');
    const labelInput = formEl.querySelector('[data-field="label"]');

    const setError = (message) => {
      formEl.querySelector(':scope > .admin-pub-form-error')?.remove();
      if (message) formEl.insertAdjacentHTML('afterbegin', String(formErrorHtml(message)));
    };
    const setBusy = (value) => {
      busy = value;
      modal.setBusy(value);
      formEl.querySelector(':scope > .admin-pub-form-actions').outerHTML = String(formActionsHtml({ busy, submitLabel, busyLabel: 'Saving…' }));
    };
    const syncRenameHint = () => {
      const hint = nameLabel.nextElementSibling?.matches('.admin-pub-hint') ? nameLabel.nextElementSibling : null;
      if (showRenameHint() && !hint) nameLabel.insertAdjacentHTML('afterend', String(renameHintHtml()));
      if (!showRenameHint() && hint) hint.remove();
    };

    formEl.addEventListener('input', (e) => {
      const field = e.target.dataset.field;
      if (!field) return;
      form[field] = e.target.value;
      if (field === 'name') {
        syncRenameHint();
        labelInput.placeholder = form.name || 'Defaults to the name';
      }
    });
    formEl.addEventListener('click', (e) => {
      const swatch = e.target.closest('[data-color]');
      if (!swatch) return;
      form.color = swatch.dataset.color;
      formEl.querySelectorAll('[data-color]').forEach((b) => {
        const selected = b.dataset.color === form.color;
        b.className = `adm-swatch adm-tag-${b.dataset.color} ${selected ? 'selected' : ''}`;
        b.setAttribute('aria-checked', String(selected));
      });
    });
    formEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      setBusy(true);
      setError('');
      const payload = { ...form, displayOrder: form.displayOrder === '' ? null : Number(form.displayOrder) };
      try {
        const saved = category ? await updateAdminCategory(category.id, payload) : await createAdminCategory(payload);
        modal.close();
        onSaved(saved, category?.name);
      } catch (err) {
        setError(err.message);
        setBusy(false);
      }
    });
  };

  const offs = [
    on(container, 'click', '[data-action]', (e, btn) => {
      const { action } = btn.dataset;
      if (action === 'add') openCategoryForm(undefined);
      else if (action === 'open-events') ctx.openSection('epm-events');
      else if (action === 'edit' || action === 'delete') {
        const category = state.categories.find((c) => String(c.id) === btn.dataset.id);
        if (!category) return;
        if (action === 'edit') openCategoryForm(category);
        else askDelete(category);
      }
    }),
  ];

  draw();
  load();

  return () => {
    disposed = true;
    banner.clear();
    offs.forEach((off) => off());
    [...modals].forEach((m) => m.close());
  };
}
