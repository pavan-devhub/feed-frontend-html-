// Admin panel -> EPM -> Venues. Converted from src/pages/admin/epm/EpmVenuesAdmin.jsx.
// mount(container, ctx) renders the section into <main class="adm-main"> and returns a cleanup.
import { html, render, on } from '../../core/dom.js';
import { icon } from '../../core/icons.js';
import { fetchAdminVenues, createAdminVenue, updateAdminVenue, deleteAdminVenue } from '../../api/admin-epm-api.js';
import {
  openModal, confirmDialog, formErrorHtml, formActionsHtml, createBanner, sectionHeaderHtml, loadingHtml, emptyHtml,
} from './admin-ui.js';

const uniqueSorted = (values) => Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));

// Replaces the nodes between `start` and `end` (exclusive), so a block that React rendered
// conditionally can come and go without an extra wrapper element.
function renderBetween(start, end, content) {
  while (start.nextSibling && start.nextSibling !== end) start.nextSibling.remove();
  const tpl = document.createElement('template');
  render(tpl, content);
  start.parentNode.insertBefore(tpl.content, end);
}

const optionsHtml = (values, selected) => values.map((v) => html`<option value="${v}" ${v === selected ? 'selected' : ''}>${v}</option>`);
const datalistHtml = (values) => values.map((v) => html`<option value="${v}"></option>`);

export function mount(container) {
  const state = { venues: [], loading: true, error: '', query: '', stateFilter: '' };
  let disposed = false;
  const modals = new Set();

  render(container, html`
    ${sectionHeaderHtml({
      eyebrow: 'EPM',
      icon: 'map-pin',
      title: 'Venues',
      description: "Reusable list of places where EPMs are held - state, district, place and venue. Pick one when adding an EPM to fill in its location. Editing a venue here doesn't change EPMs already scheduled.",
      actions: html`<button type="button" class="admin-pub-btn primary" data-action="add">${icon('plus', { size: 16 })} Add venue</button>`,
    })}
    <div data-slot="banner" style="display: contents;"></div>
    <div class="adm-filters">
      <label class="adm-filter adm-filter-search">
        <span>Search venues</span>
        <div class="adm-input-icon">
          ${icon('search', { size: 15 })}
          <input type="search" placeholder="Venue, place, district…" value="" data-filter="query" />
        </div>
      </label>
      <label class="adm-filter">
        <span>State</span>
        <select data-filter="state"></select>
      </label>
    </div>
    <div class="admin-pub-table-wrap"></div>`);
  const bannerSlot = container.querySelector('[data-slot="banner"]');
  const banner = createBanner(bannerSlot);
  const filtersEl = container.querySelector('.adm-filters');
  const queryInput = filtersEl.querySelector('[data-filter="query"]');
  const stateSelect = filtersEl.querySelector('[data-filter="state"]');
  const tableWrap = container.querySelector('.admin-pub-table-wrap');

  const visible = () => {
    const q = state.query.trim().toLowerCase();
    return state.venues.filter((v) => (!state.stateFilter || v.state === state.stateFilter)
      && (!q || [v.name, v.city, v.district, v.state, v.address].some((x) => x && x.toLowerCase().includes(q))));
  };

  const drawError = () => renderBetween(bannerSlot, filtersEl, state.error && html`<div class="admin-pub-banner error">${state.error}</div>`);

  const drawFilters = () => {
    render(stateSelect, html`
      <option value="" ${state.stateFilter === '' ? 'selected' : ''}>All States</option>
      ${optionsHtml(uniqueSorted(state.venues.map((v) => v.state)), state.stateFilter)}`);
    const clear = filtersEl.querySelector(':scope > .adm-link-btn');
    const active = Boolean(state.query || state.stateFilter);
    if (active && !clear) {
      filtersEl.insertAdjacentHTML('beforeend', String(html`<button type="button" class="adm-link-btn" data-action="clear">${icon('x', { size: 14 })} Clear</button>`));
    } else if (!active && clear) {
      clear.remove();
    }
  };

  const drawTable = () => {
    const rows = visible();
    render(tableWrap, state.loading ? loadingHtml('Loading venues…') : rows.length === 0
      ? emptyHtml(state.venues.length === 0 ? 'No venues yet.' : 'No venues match.')
      : html`
        <div class="adm-table-caption">${rows.length} ${rows.length === 1 ? 'venue' : 'venues'}</div>
        <table class="admin-pub-table adm-table">
          <thead>
            <tr>
              <th>Venue</th>
              <th>Place</th>
              <th>District</th>
              <th>State</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((v) => html`
              <tr>
                <td data-label="Venue">
                  <div class="adm-cell-title">${v.name}</div>
                  ${v.address && html`<div class="adm-cell-sub">${v.address}</div>`}
                </td>
                <td data-label="Place">${v.city}</td>
                <td data-label="District">${v.district}</td>
                <td data-label="State">${v.state}</td>
                <td class="admin-pub-actions" data-label="Actions">
                  <button type="button" class="admin-pub-icon-btn" title="Edit" data-action="edit" data-id="${v.id}">${icon('pencil', { size: 15 })}</button>
                  <button type="button" class="admin-pub-icon-btn danger" title="Delete" data-action="delete" data-id="${v.id}">${icon('trash-2', { size: 15 })}</button>
                </td>
              </tr>`)}
          </tbody>
        </table>`);
  };

  const draw = () => {
    if (disposed) return;
    drawError();
    drawFilters();
    drawTable();
  };

  const load = async () => {
    state.loading = true;
    drawTable();
    try {
      const data = await fetchAdminVenues();
      if (disposed) return;
      state.venues = data;
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

  const askDelete = (v) => confirmTracked({
    title: 'Delete venue?',
    content: html`
      <p>Remove <strong>${v.name}, ${v.city}</strong> from the venue list?</p>
      <p class="admin-pub-hint">EPMs already held or scheduled there keep their location.</p>`,
    onConfirm: async () => {
      await deleteAdminVenue(v.id);
      if (disposed) return;
      banner.show('success', `Removed ${v.name}, ${v.city} from the venue list.`);
      load();
    },
  });

  const openVenueForm = (venue) => {
    const form = {
      name: venue?.name || '',
      state: venue?.state || '',
      district: venue?.district || '',
      city: venue?.city || '',
      address: venue?.address || '',
    };
    let busy = false;
    const submitLabel = venue ? 'Save changes' : 'Add venue';
    // Suggestions come from the venue list as it was when the dialog opened (React's `venues` prop).
    const venues = state.venues;
    const lists = () => ({
      states: uniqueSorted(venues.map((v) => v.state)),
      districts: uniqueSorted(venues.filter((v) => !form.state || v.state === form.state).map((v) => v.district)),
      cities: uniqueSorted(venues.filter((v) => !form.district || v.district === form.district).map((v) => v.city)),
    });

    const modal = openModal({ title: venue ? 'Edit venue' : 'Add venue', icon: 'map-pin', onClose: () => modals.delete(modal) });
    modals.add(modal);
    const initial = lists();
    modal.setContent(html`
      <form class="admin-pub-form">
        <label>
          Venue name
          <input type="text" data-field="name" value="${form.name}" required placeholder="e.g. Convention Centre" />
        </label>
        <div class="admin-pub-form-row">
          <label>
            State
            <input type="text" list="adm-vn-states" data-field="state" value="${form.state}" required />
          </label>
          <label>
            District
            <input type="text" list="adm-vn-districts" data-field="district" value="${form.district}" required />
          </label>
        </div>
        <label>
          Place
          <input type="text" list="adm-vn-cities" data-field="city" value="${form.city}" required />
        </label>
        <label>
          Address <span class="optional">(optional)</span>
          <textarea rows="2" maxlength="500" data-field="address"></textarea>
        </label>
        <datalist id="adm-vn-states">${datalistHtml(initial.states)}</datalist>
        <datalist id="adm-vn-districts">${datalistHtml(initial.districts)}</datalist>
        <datalist id="adm-vn-cities">${datalistHtml(initial.cities)}</datalist>
        ${formActionsHtml({ busy, submitLabel, busyLabel: 'Saving…' })}
      </form>`);
    const formEl = modal.element.querySelector('form');
    formEl.querySelector('textarea').value = form.address;

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
      const field = e.target.dataset.field;
      if (!field) return;
      form[field] = e.target.value;
      if (field === 'state' || field === 'district') {
        const next = lists();
        render(formEl.querySelector('#adm-vn-districts'), datalistHtml(next.districts));
        render(formEl.querySelector('#adm-vn-cities'), datalistHtml(next.cities));
      }
    });
    formEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      setBusy(true);
      setError('');
      try {
        const saved = venue ? await updateAdminVenue(venue.id, form) : await createAdminVenue(form);
        modal.close();
        if (disposed) return;
        banner.show('success', `Saved ${saved.name}, ${saved.city}.`);
        load();
      } catch (err) {
        setError(err.message);
        setBusy(false);
      }
    });
  };

  const offs = [
    on(container, 'click', '[data-action]', (e, btn) => {
      const { action } = btn.dataset;
      if (action === 'add') openVenueForm(undefined);
      else if (action === 'clear') {
        state.query = '';
        state.stateFilter = '';
        queryInput.value = '';
        drawFilters();
        drawTable();
      } else if (action === 'edit' || action === 'delete') {
        const venue = state.venues.find((v) => String(v.id) === btn.dataset.id);
        if (!venue) return;
        if (action === 'edit') openVenueForm(venue);
        else askDelete(venue);
      }
    }),
    on(container, 'input', '[data-filter="query"]', (e, input) => {
      state.query = input.value;
      drawFilters();
      drawTable();
    }),
    on(container, 'change', '[data-filter="state"]', (e, select) => {
      state.stateFilter = select.value;
      drawFilters();
      drawTable();
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
