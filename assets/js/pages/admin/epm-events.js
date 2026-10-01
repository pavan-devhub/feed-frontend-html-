// Admin panel -> EPM -> EPM Events. Converted from src/pages/admin/epm/EpmEventsAdmin.jsx.
// mount(container, ctx) renders the section into <main class="adm-main"> and returns a cleanup.
import { html, render, on } from '../../core/dom.js';
import { icon } from '../../core/icons.js';
import {
  fetchAdminEvents, createAdminEvent, updateAdminEvent, deleteAdminEvent,
  fetchAdminCategories, fetchAdminVenues, createAdminVenue,
} from '../../api/admin-epm-api.js';
import {
  openModal, confirmDialog, formErrorHtml, formActionsHtml, createBanner, sectionHeaderHtml, loadingHtml, emptyHtml,
} from './admin-ui.js';
import { MONTH_NAMES, formatDate, todayIso } from './admin-utils.js';

const EMPTY_FILTERS = { q: '', month: '', state: '', district: '', city: '', category: '' };

// "10:00 AM - 02:00 PM" <-> { start: "10:00", end: "14:00" }. Events store the display text only
// (see EpmEvent#timeRange); the form edits it with two time pickers.
function parseTimeRange(text) {
  const m = /^\s*(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)\s*$/i.exec(text || '');
  if (!m) return { start: '', end: '' };
  const to24 = (h, min, ap) => {
    let hour = Number(h) % 12;
    if (ap.toUpperCase() === 'PM') hour += 12;
    return `${String(hour).padStart(2, '0')}:${min}`;
  };
  return { start: to24(m[1], m[2], m[3]), end: to24(m[4], m[5], m[6]) };
}

function formatTime(hhmm) {
  const [h, min] = hhmm.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')} ${ap}`;
}

function formatTimeRange(start, end) {
  if (start && end) return `${formatTime(start)} - ${formatTime(end)}`;
  if (start) return formatTime(start);
  return '';
}

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

export function mount(container, ctx) {
  const state = {
    tab: 'upcoming',
    events: [],
    loading: true,
    loadError: '',
    categories: [],
    venues: [],
    filters: { ...EMPTY_FILTERS },
  };
  let disposed = false;
  const modals = new Set();
  let activeForm = null; // the open add/edit dialog - refreshed when categories, venues or events load

  const addLabel = () => html`${icon('plus', { size: 16 })} ${state.tab === 'upcoming' ? 'Add upcoming EPM' : 'Add previous EPM'}`;

  render(container, html`
    ${sectionHeaderHtml({
      eyebrow: 'EPM',
      icon: 'calendar-days',
      title: 'EPM Events',
      description: 'Add, edit, cancel or remove upcoming and previous Export Promotional Meetings. An EPM moves to Previous on its own once its date has passed.',
      actions: html`<button type="button" class="admin-pub-btn primary" data-action="add">${addLabel()}</button>`,
    })}
    <div data-slot="banner" style="display: contents;"></div>
    <div class="adm-tabs" role="tablist">
      <button type="button" role="tab" aria-selected="true" class="adm-tab active" data-tab="upcoming">
        ${icon('calendar-days', { size: 15 })} Upcoming
      </button>
      <button type="button" role="tab" aria-selected="false" class="adm-tab " data-tab="previous">
        ${icon('history', { size: 15 })} Previous
      </button>
    </div>
    <div class="adm-filters">
      <label class="adm-filter adm-filter-search">
        <span>Search EPMs</span>
        <div class="adm-input-icon">
          ${icon('search', { size: 15 })}
          <input type="search" placeholder="Title, place, venue or category…" value="" data-filter="q" />
        </div>
      </label>
      <label class="adm-filter">
        <span>Month</span>
        <select data-filter="month"></select>
      </label>
      <label class="adm-filter">
        <span>State</span>
        <select data-filter="state"></select>
      </label>
      <label class="adm-filter">
        <span>District</span>
        <select data-filter="district"></select>
      </label>
      <label class="adm-filter">
        <span>Place</span>
        <select data-filter="city"></select>
      </label>
      <label class="adm-filter">
        <span>Category</span>
        <select data-filter="category"></select>
      </label>
    </div>
    <div class="admin-pub-table-wrap"></div>`);
  const addButton = container.querySelector('[data-action="add"]');
  const bannerSlot = container.querySelector('[data-slot="banner"]');
  const banner = createBanner(bannerSlot);
  const tabsEl = container.querySelector('.adm-tabs');
  const filtersEl = container.querySelector('.adm-filters');
  const filterEl = (name) => filtersEl.querySelector(`[data-filter="${name}"]`);
  const tableWrap = container.querySelector('.admin-pub-table-wrap');

  // --- derived data (React's useMemo values) ---

  const filtersActive = () => Object.values(state.filters).some(Boolean);
  const categoryColor = (name) => state.categories.find((c) => c.name === name)?.color || 'gray';

  const visible = () => {
    const { filters, events } = state;
    const q = filters.q.trim().toLowerCase();
    return events.filter((e) => {
      if (q && ![e.title, e.city, e.district, e.state, e.venue, e.category].some((v) => v && v.toLowerCase().includes(q))) return false;
      if (filters.month && Number(e.eventDate.slice(5, 7)) !== Number(filters.month)) return false;
      if (filters.state && e.state !== filters.state) return false;
      if (filters.district && e.district !== filters.district) return false;
      if (filters.city && e.city !== filters.city) return false;
      if (filters.category && e.category !== filters.category) return false;
      return true;
    });
  };

  // --- drawing ---

  const drawTabs = () => {
    render(addButton, addLabel());
    tabsEl.querySelectorAll('[data-tab]').forEach((b) => {
      const active = b.dataset.tab === state.tab;
      b.className = `adm-tab ${active ? 'active' : ''}`;
      b.setAttribute('aria-selected', String(active));
    });
  };

  // The selects are re-filled in place (never replaced), so a focused one keeps focus.
  const drawFilters = () => {
    const { filters, events } = state;
    const inState = (e) => !filters.state || e.state === filters.state;
    render(filterEl('month'), html`
      <option value="" ${filters.month === '' ? 'selected' : ''}>All Months</option>
      ${MONTH_NAMES.map((m, i) => html`<option value="${i + 1}" ${String(i + 1) === filters.month ? 'selected' : ''}>${m}</option>`)}`);
    render(filterEl('state'), html`
      <option value="" ${filters.state === '' ? 'selected' : ''}>All States</option>
      ${optionsHtml(uniqueSorted(events.map((e) => e.state)), filters.state)}`);
    render(filterEl('district'), html`
      <option value="" ${filters.district === '' ? 'selected' : ''}>All Districts</option>
      ${optionsHtml(uniqueSorted(events.filter(inState).map((e) => e.district)), filters.district)}`);
    render(filterEl('city'), html`
      <option value="" ${filters.city === '' ? 'selected' : ''}>All Places</option>
      ${optionsHtml(uniqueSorted(events
        .filter((e) => inState(e) && (!filters.district || e.district === filters.district))
        .map((e) => e.city)), filters.city)}`);
    render(filterEl('category'), html`
      <option value="" ${filters.category === '' ? 'selected' : ''}>All Categories</option>
      ${state.categories.map((c) => html`<option value="${c.name}" ${c.name === filters.category ? 'selected' : ''}>${c.name}</option>`)}`);

    const clear = filtersEl.querySelector(':scope > .adm-link-btn');
    if (filtersActive() && !clear) {
      filtersEl.insertAdjacentHTML('beforeend', String(html`<button type="button" class="adm-link-btn" data-action="clear">${icon('x', { size: 14 })} Clear</button>`));
    } else if (!filtersActive() && clear) {
      clear.remove();
    }
  };

  const rowHtml = (e) => html`
    <tr ${e.cancelled ? html`class="adm-row-muted"` : ''}>
      <td data-label="Date" class="adm-nowrap"><strong>${formatDate(e.eventDate)}</strong></td>
      <td data-label="EPM">
        <div class="adm-cell-title">${e.title}</div>
        <div class="adm-cell-tags">
          <span class="adm-tag adm-tag-${categoryColor(e.category)}">${e.category || 'No category'}</span>
          ${e.cancelled && html`<span class="adm-tag adm-tag-red">${icon('ban', { size: 11 })} Cancelled</span>`}
        </div>
      </td>
      <td data-label="Place">
        <div>${e.city}</div>
        <div class="adm-cell-sub">${e.district}, ${e.state}</div>
      </td>
      <td data-label="Venue &amp; time">
        <div>${e.venue}</div>
        <div class="adm-cell-sub">${e.timeRange || 'Time to be announced'}</div>
      </td>
      <td data-label="Registered" class="adm-num">
        <button type="button" class="adm-count-btn" title="View registrations" data-action="registrations" data-id="${e.id}">
          ${icon('users', { size: 13 })} ${e.registrationCount ?? 0}
        </button>
      </td>
      <td data-label="Volunteers" class="adm-num">
        <button type="button" class="adm-count-btn" title="View volunteers" data-action="volunteers" data-id="${e.id}">
          ${icon('heart-handshake', { size: 13 })} ${e.volunteerCount ?? 0}
        </button>
      </td>
      <td class="admin-pub-actions" data-label="Actions">
        <button type="button" class="admin-pub-icon-btn" title="Edit" data-action="edit" data-id="${e.id}">
          ${icon('pencil', { size: 15 })}
        </button>
        <button type="button" class="admin-pub-icon-btn danger" title="Delete" data-action="delete" data-id="${e.id}">
          ${icon('trash-2', { size: 15 })}
        </button>
      </td>
    </tr>`;

  const drawTable = () => {
    renderBetween(filtersEl, tableWrap, state.loadError && html`<div class="admin-pub-banner error">${state.loadError}</div>`);
    const rows = visible();
    const active = filtersActive();
    let content;
    if (state.loading) {
      content = loadingHtml('Loading EPMs…');
    } else if (rows.length === 0) {
      content = emptyHtml(active ? 'No EPMs match these filters.'
        : state.tab === 'upcoming' ? 'No upcoming EPMs yet - add the next one.' : 'No previous EPMs recorded.');
    } else {
      content = html`
        <div class="adm-table-caption">${rows.length} ${rows.length === 1 ? 'EPM' : 'EPMs'}${active ? ` of ${state.events.length}` : ''}</div>
        <table class="admin-pub-table adm-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>EPM</th>
              <th>Place</th>
              <th>Venue &amp; time</th>
              <th class="adm-num">Registered</th>
              <th class="adm-num">Volunteers</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>${rows.map(rowHtml)}</tbody>
        </table>`;
    }
    render(tableWrap, content);
  };

  const draw = () => {
    if (disposed) return;
    drawTabs();
    drawFilters();
    drawTable();
  };

  // --- data ---

  const load = async () => {
    const { tab } = state;
    state.loading = true;
    state.loadError = '';
    drawTable();
    try {
      const data = await fetchAdminEvents({ status: tab });
      if (disposed) return;
      state.events = data;
    } catch (e) {
      if (disposed) return;
      state.loadError = e.message;
      state.events = [];
    } finally {
      if (!disposed) {
        state.loading = false;
        draw();
        activeForm?.refresh();
      }
    }
  };

  const loadLookups = () => {
    const done = () => {
      if (disposed) return;
      drawFilters();
      drawTable();
      activeForm?.refresh();
    };
    fetchAdminCategories().then((data) => { state.categories = data; }).catch(() => { state.categories = []; }).then(done);
    fetchAdminVenues().then((data) => { state.venues = data; }).catch(() => { state.venues = []; }).then(done);
  };

  const setFilters = (patch) => {
    state.filters = { ...state.filters, ...patch };
    drawFilters();
    drawTable();
  };

  const resetFilters = () => {
    state.filters = { ...EMPTY_FILTERS };
    filterEl('q').value = '';
    drawFilters();
    drawTable();
  };

  const afterSave = (saved, mode) => {
    if (disposed) return;
    const movedTab = saved.upcoming ? 'upcoming' : 'previous';
    banner.show('success', `${mode === 'create' ? 'Added' : 'Saved'} "${saved.title}" on ${formatDate(saved.eventDate)}${movedTab !== state.tab ? ` - it is listed under ${movedTab === 'upcoming' ? 'Upcoming' : 'Previous'} EPMs` : ''}.`);
    load();
    loadLookups();
  };

  // --- dialogs ---

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

  const askDelete = (ev) => confirmTracked({
    title: 'Delete EPM?',
    content: html`
      <p>Delete <strong>${ev.title}</strong> on ${formatDate(ev.eventDate)} in ${ev.city}?</p>
      ${(ev.registrationCount > 0 || ev.volunteerCount > 0) && html`
        <p class="admin-pub-hint">Its ${ev.registrationCount} registration(s) and ${ev.volunteerCount} volunteer(s) are kept and stay visible under Registrations / Volunteers.</p>`}
      ${!ev.cancelled && ev.upcoming && html`
        <p class="admin-pub-hint">To call off a meeting but keep it on record, edit it and tick “Cancelled” instead.</p>`}`,
    onConfirm: async () => {
      await deleteAdminEvent(ev.id);
      if (disposed) return;
      banner.show('success', `Deleted "${ev.title}".`);
      load();
    },
  });

  const openEventForm = (mode, event) => {
    const initialTimes = parseTimeRange(event?.timeRange);
    const form = {
      title: event?.title || '',
      category: event?.category || state.categories[0]?.name || '',
      state: event?.state || '',
      district: event?.district || '',
      city: event?.city || '',
      venue: event?.venue || '',
      eventDate: event?.eventDate || (state.tab === 'previous' ? '' : todayIso()),
      startTime: initialTimes.start,
      endTime: initialTimes.end,
      description: event?.description || '',
      cancelled: Boolean(event?.cancelled),
    };
    let saveVenue = true;
    let busy = false;
    const submitLabel = mode === 'create' ? 'Add EPM' : 'Save changes';
    const keptTimeText = event?.timeRange && !initialTimes.start ? event.timeRange : '';

    const matchingVenue = () => state.venues.find((v) => [['name', 'venue'], ['city', 'city'], ['district', 'district'], ['state', 'state']]
      .every(([a, b]) => (v[a] || '').trim().toLowerCase() === (form[b] || '').trim().toLowerCase()));
    const venueComplete = () => form.state.trim() && form.district.trim() && form.city.trim() && form.venue.trim();
    const isPast = () => Boolean(form.eventDate && form.eventDate < todayIso());

    // Suggestions for the free-text place fields: everything already in the venue list or used by an EPM.
    const placeLists = () => {
      const places = [...state.venues.map((v) => ({ ...v, venue: v.name })), ...state.events];
      return {
        states: uniqueSorted(places.map((p) => p.state)),
        districts: uniqueSorted(places.filter((p) => !form.state || p.state === form.state).map((p) => p.district)),
        cities: uniqueSorted(places.filter((p) => !form.district || p.district === form.district).map((p) => p.city)),
      };
    };

    const categoryOptionsHtml = () => html`
      ${state.categories.length === 0 && html`<option value="" ${form.category === '' ? 'selected' : ''}>No categories yet</option>`}
      ${state.categories.map((c) => html`<option value="${c.name}" ${c.name === form.category ? 'selected' : ''}>${c.name}</option>`)}`;
    const hintHtml = () => html`${icon('tags', { size: 13 })} Categories are managed under <button type="button" class="adm-inline-link" data-action="open-categories">Categories</button>.${isPast() && html` This date has passed, so the EPM will be listed under <strong>Previous</strong>.`}`;
    const venuePickerHtml = () => {
      if (state.venues.length === 0) return '';
      const selected = matchingVenue() ? String(matchingVenue().id) : '';
      return html`
        <select class="adm-venue-picker" data-action="pick-venue">
          <option value="" ${selected === '' ? 'selected' : ''}>Pick from venue list…</option>
          ${state.venues.map((v) => html`<option value="${v.id}" ${String(v.id) === selected ? 'selected' : ''}>${v.name} — ${v.city}, ${v.state}</option>`)}
        </select>`;
    };
    const saveVenueHtml = () => html`
      <label class="adm-check">
        <input type="checkbox" data-field="saveVenue" ${saveVenue ? 'checked' : ''} />
        Also add this venue to the venue list
      </label>`;
    const keptTimeHtml = () => html`<p class="admin-pub-hint adm-hint-tight">Current time text “${keptTimeText}” is kept unless you pick new times.</p>`;

    const lists = placeLists();
    const controller = {};
    const modal = openModal({
      title: mode === 'create' ? 'Add EPM' : 'Edit EPM',
      icon: mode === 'create' ? 'plus' : 'pencil',
      size: 'medium',
      onClose: () => {
        modals.delete(modal);
        if (activeForm === controller) activeForm = null;
      },
    });
    modals.add(modal);
    modal.setContent(html`
      <form class="admin-pub-form">
        <label>
          Title
          <input type="text" data-field="title" value="${form.title}" required maxlength="255" placeholder="e.g. Buyer-Seller Meet" />
        </label>

        <div class="admin-pub-form-row">
          <label>
            Category
            <select data-field="category" required>${categoryOptionsHtml()}</select>
          </label>
          <label>
            Date
            <input type="date" data-field="eventDate" value="${form.eventDate}" required />
          </label>
        </div>
        <p class="admin-pub-hint adm-hint-tight" data-part="date-hint">${hintHtml()}</p>

        <div class="adm-fieldset">
          <div class="adm-fieldset-head">
            <span>${icon('map-pin', { size: 14 })} Location</span>
            ${venuePickerHtml()}
          </div>
          <div class="admin-pub-form-row">
            <label>
              State
              <input type="text" list="adm-ev-states" data-field="state" value="${form.state}" required />
            </label>
            <label>
              District
              <input type="text" list="adm-ev-districts" data-field="district" value="${form.district}" required />
            </label>
          </div>
          <div class="admin-pub-form-row" data-part="place-row">
            <label>
              Place
              <input type="text" list="adm-ev-cities" data-field="city" value="${form.city}" required />
            </label>
            <label>
              Venue
              <input type="text" data-field="venue" value="${form.venue}" required placeholder="e.g. Convention Centre" />
            </label>
          </div>
          ${venueComplete() && !matchingVenue() && saveVenueHtml()}
          <datalist id="adm-ev-states">${datalistHtml(lists.states)}</datalist>
          <datalist id="adm-ev-districts">${datalistHtml(lists.districts)}</datalist>
          <datalist id="adm-ev-cities">${datalistHtml(lists.cities)}</datalist>
        </div>

        <div class="admin-pub-form-row" data-part="time-row">
          <label>
            Starts <span class="optional">(optional)</span>
            <input type="time" data-field="startTime" value="${form.startTime}" />
          </label>
          <label>
            Ends <span class="optional">(optional)</span>
            <input type="time" data-field="endTime" value="${form.endTime}" />
          </label>
        </div>
        ${keptTimeText && !form.startTime && keptTimeHtml()}

        <label>
          Description <span class="optional">(optional, shown on the EPM directory card)</span>
          <textarea rows="3" maxlength="2000" data-field="description"></textarea>
        </label>

        ${mode === 'edit' && html`
          <label class="adm-check">
            <input type="checkbox" data-field="cancelled" ${form.cancelled ? 'checked' : ''} />
            Cancelled — hide from the public EPM pages but keep it (and its registrations) on record
          </label>`}

        ${formActionsHtml({ busy, submitLabel, busyLabel: 'Saving…' })}
      </form>`);
    const formEl = modal.element.querySelector('form');
    formEl.querySelector('textarea').value = form.description;
    const fieldset = formEl.querySelector('.adm-fieldset');
    const fieldsetHead = fieldset.querySelector('.adm-fieldset-head');
    const placeRow = fieldset.querySelector('[data-part="place-row"]');
    const timeRow = formEl.querySelector('[data-part="time-row"]');
    const dateHint = formEl.querySelector('[data-part="date-hint"]');
    let shownPast = isPast();

    // --- partial updates (inputs being typed in are never re-rendered) ---

    const setError = (message) => {
      formEl.querySelector(':scope > .admin-pub-form-error')?.remove();
      if (message) formEl.insertAdjacentHTML('afterbegin', String(formErrorHtml(message)));
    };
    const setBusy = (value) => {
      busy = value;
      modal.setBusy(value);
      formEl.querySelector(':scope > .admin-pub-form-actions').outerHTML = String(formActionsHtml({ busy, submitLabel, busyLabel: 'Saving…' }));
    };
    const syncDateHint = () => {
      if (isPast() === shownPast) return;
      shownPast = isPast();
      render(dateHint, hintHtml());
    };
    const syncVenuePicker = () => {
      const picker = fieldsetHead.querySelector('.adm-venue-picker');
      if (picker) picker.value = matchingVenue() ? String(matchingVenue().id) : '';
    };
    const syncSaveVenue = () => {
      const show = Boolean(venueComplete() && !matchingVenue());
      const check = fieldset.querySelector(':scope > .adm-check');
      if (show && !check) placeRow.insertAdjacentHTML('afterend', String(saveVenueHtml()));
      if (!show && check) check.remove();
    };
    const syncDatalists = () => {
      const next = placeLists();
      render(fieldset.querySelector('#adm-ev-states'), datalistHtml(next.states));
      render(fieldset.querySelector('#adm-ev-districts'), datalistHtml(next.districts));
      render(fieldset.querySelector('#adm-ev-cities'), datalistHtml(next.cities));
    };
    const syncKeptTime = () => {
      if (!keptTimeText) return;
      const hint = timeRow.nextElementSibling?.matches('.admin-pub-hint') ? timeRow.nextElementSibling : null;
      if (!form.startTime && !hint) timeRow.insertAdjacentHTML('afterend', String(keptTimeHtml()));
      if (form.startTime && hint) hint.remove();
    };
    const syncPlace = () => {
      syncVenuePicker();
      syncSaveVenue();
      syncDatalists();
    };

    // Categories, venues and EPMs are live props in React - redraw what depends on them.
    Object.assign(controller, {
      refresh() {
        render(formEl.querySelector('[data-field="category"]'), categoryOptionsHtml());
        fieldsetHead.querySelector('.adm-venue-picker')?.remove();
        fieldsetHead.insertAdjacentHTML('beforeend', String(venuePickerHtml()));
        syncPlace();
      },
    });
    activeForm = controller;

    formEl.addEventListener('input', (e) => {
      const field = e.target.dataset.field;
      if (!field) return;
      if (field === 'saveVenue') {
        saveVenue = e.target.checked;
        return;
      }
      form[field] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      if (field === 'eventDate') syncDateHint();
      else if (field === 'startTime') syncKeptTime();
      else if (['state', 'district', 'city', 'venue'].includes(field)) syncPlace();
    });
    formEl.addEventListener('change', (e) => {
      if (!e.target.matches('[data-action="pick-venue"]')) return;
      const v = state.venues.find((x) => String(x.id) === e.target.value);
      if (v) {
        Object.assign(form, { state: v.state, district: v.district, city: v.city, venue: v.name });
        ['state', 'district', 'city', 'venue'].forEach((f) => { formEl.querySelector(`[data-field="${f}"]`).value = form[f]; });
      }
      syncPlace();
    });
    formEl.addEventListener('click', (e) => {
      if (!e.target.closest('[data-action="open-categories"]')) return;
      modal.close();
      ctx.openSection('epm-categories');
    });
    formEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (form.startTime && form.endTime && form.endTime <= form.startTime) {
        setError('The end time must be after the start time.');
        return;
      }
      const venueToSave = saveVenue && !matchingVenue() && venueComplete();
      setBusy(true);
      setError('');
      const payload = {
        title: form.title,
        category: form.category,
        state: form.state,
        district: form.district,
        city: form.city,
        venue: form.venue,
        eventDate: form.eventDate,
        timeRange: formatTimeRange(form.startTime, form.endTime) || keptTimeText,
        description: form.description,
        cancelled: form.cancelled,
      };
      try {
        const saved = mode === 'create' ? await createAdminEvent(payload) : await updateAdminEvent(event.id, payload);
        if (venueToSave) {
          // Best effort - the EPM itself is already saved.
          await createAdminVenue({ name: form.venue, state: form.state, district: form.district, city: form.city }).catch(() => {});
        }
        modal.close();
        afterSave(saved, mode);
      } catch (err) {
        setError(err.message);
        setBusy(false);
      }
    });
  };

  // --- events ---

  const eventById = (id) => state.events.find((ev) => String(ev.id) === id);

  const offs = [
    on(container, 'click', '[data-tab]', (e, btn) => {
      if (btn.dataset.tab === state.tab) return;
      state.tab = btn.dataset.tab;
      state.filters = { ...EMPTY_FILTERS };
      filterEl('q').value = '';
      draw();
      load();
    }),
    on(container, 'click', '[data-action]', (e, btn) => {
      const { action } = btn.dataset;
      if (action === 'add') openEventForm('create', undefined);
      else if (action === 'clear') resetFilters();
      else {
        const ev = eventById(btn.dataset.id);
        if (!ev) return;
        if (action === 'registrations') ctx.openSection('epm-registrations', { eventId: ev.id });
        else if (action === 'volunteers') ctx.openSection('epm-volunteers', { eventId: ev.id });
        else if (action === 'edit') openEventForm('edit', ev);
        else if (action === 'delete') askDelete(ev);
      }
    }),
    on(container, 'input', '[data-filter="q"]', (e, input) => setFilters({ q: input.value })),
    on(container, 'change', 'select[data-filter]', (e, select) => {
      const name = select.dataset.filter;
      if (name === 'state') setFilters({ state: select.value, district: '', city: '' });
      else if (name === 'district') setFilters({ district: select.value, city: '' });
      else setFilters({ [name]: select.value });
    }),
  ];

  draw();
  load();
  loadLookups();

  return () => {
    disposed = true;
    banner.clear();
    offs.forEach((off) => off());
    [...modals].forEach((m) => m.close());
    activeForm = null;
  };
}
