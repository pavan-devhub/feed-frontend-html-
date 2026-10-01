// "EPM Directory" - every upcoming / previous EPM, with a search + month/state/district/place
// filter bar (applied on submit), a category sidebar with counts, and list/grid views.
import { initPage } from '../core/page.js';
import { html, render, cx, on } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { navigate } from '../core/router.js';
import { fetchEpmEvents, fetchEpmCategories } from '../api/epm-api.js';
import { formatEventDateLong, formatEventDateParts } from '../utils/epm-date.js';
import { getCategoryMeta } from '../utils/epm-category.js';

const ALL_CATEGORIES = 'All Categories';
const EMPTY_FILTERS = { query: '', month: '', state: '', district: '', city: '' };

const monthOf = (isoDate) => Number(isoDate.split('-')[1]);
const uniqueSorted = (values) => Array.from(new Set(values)).sort();

const session = initPage({ page: 'epm' });

if (session) {
  const state = {
    activeTab: 'upcoming', // 'upcoming' | 'previous'
    events: [],
    loading: true,
    loadError: '',
    viewMode: 'list', // 'list' | 'grid'
    activeCategory: ALL_CATEGORIES,
    categories: [{ name: ALL_CATEGORIES, id: ALL_CATEGORIES, color: 'gray' }],
    draft: { ...EMPTY_FILTERS }, // what the filter bar shows
    applied: { ...EMPTY_FILTERS }, // what the list is filtered by (set on "Apply Filters")
  };

  const form = document.getElementById('ed-filters-form');
  const fields = {
    query: form.elements.query,
    month: form.elements.month,
    state: form.elements.state,
    district: form.elements.district,
    city: form.elements.city,
  };
  const categoriesEl = document.getElementById('ed-categories');
  const tabsEl = document.getElementById('ed-tabs');
  const viewToggleEl = document.getElementById('ed-view-toggle');
  const listEl = document.getElementById('ed-event-list');

  // ---- Derived data --------------------------------------------------------------------------
  const stateOptions = () => uniqueSorted(state.events.map((e) => e.state));
  const districtOptions = () => uniqueSorted(state.events
    .filter((e) => !state.draft.state || e.state === state.draft.state)
    .map((e) => e.district));
  const cityOptions = () => uniqueSorted(state.events
    .filter((e) => (!state.draft.state || e.state === state.draft.state)
      && (!state.draft.district || e.district === state.draft.district))
    .map((e) => e.city));

  const categoryCounts = () => {
    const counts = { [ALL_CATEGORIES]: state.events.length };
    state.events.forEach((e) => {
      if (e.category) counts[e.category] = (counts[e.category] || 0) + 1;
    });
    return counts;
  };

  const filteredEvents = () => {
    const f = state.applied;
    const query = f.query.toLowerCase();
    return state.events.filter((e) => {
      const searchMatch = !f.query
        || e.title?.toLowerCase().includes(query)
        || e.city?.toLowerCase().includes(query)
        || e.state?.toLowerCase().includes(query);
      const monthMatch = !f.month || String(monthOf(e.eventDate)) === f.month;
      const stateMatch = !f.state || e.state === f.state;
      const districtMatch = !f.district || e.district === f.district;
      const cityMatch = !f.city || e.city === f.city;
      const categoryMatch = state.activeCategory === ALL_CATEGORIES || e.category === state.activeCategory;
      return searchMatch && monthMatch && stateMatch && districtMatch && cityMatch && categoryMatch;
    });
  };

  // The admin picks each category's colour; categories the built-in map doesn't know (added in
  // the admin panel) take that colour for their badge.
  const getCategoryStyle = (category) => {
    const meta = getCategoryMeta(category);
    const color = state.categories.find((c) => c.id === category)?.color;
    return color && color !== 'gray' ? { ...meta, badge: `tag-${color}` } : meta;
  };

  // ---- Drawing -------------------------------------------------------------------------------
  function drawCategories() {
    const counts = categoryCounts();
    render(categoriesEl, state.categories.map((cat, index) => html`
      <button class="${cx('ed-cat-btn', state.activeCategory === cat.id && 'active')}" data-index="${index}">
        <div class="ed-cat-label">
          <span class="ed-cat-icon color-${cat.color}">${icon('layout-grid', { size: 14 })}</span>${cat.name}
        </div>
        <span class="ed-cat-count">${counts[cat.id] || 0}</span>
      </button>`));
  }

  // The state/district/place dropdowns only offer values present in the loaded EPMs, each
  // narrowed by the choices to its left.
  function drawFilterOptions() {
    const optionsHtml = (placeholder, values) => html`
      <option value="">${placeholder}</option>
      ${values.map((v) => html`<option value="${v}">${v}</option>`)}`;
    render(fields.state, optionsHtml('All States', stateOptions()));
    render(fields.district, optionsHtml('All Districts', districtOptions()));
    render(fields.city, optionsHtml('All Places', cityOptions()));
    syncFilterInputs();
  }

  function syncFilterInputs() {
    Object.entries(fields).forEach(([key, field]) => {
      if (field.value !== state.draft[key]) field.value = state.draft[key];
    });
  }

  function drawToolbar() {
    document.getElementById('ed-list-title').textContent = state.activeTab === 'upcoming' ? 'Upcoming EPMs' : 'Previous EPMs';
    document.getElementById('ed-list-count').textContent = `${filteredEvents().length} events found`;
    tabsEl.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === state.activeTab));
    viewToggleEl.querySelectorAll('[data-view]').forEach((b) => b.classList.toggle('active', b.dataset.view === state.viewMode));
  }

  const eventCardHtml = (event) => {
    const dateParts = formatEventDateParts(event.eventDate);
    const styleData = getCategoryStyle(event.category);
    const registeredCount = event.registrationCount ?? 0;
    const description = event.description || `Learn about export compliance, documentation, and international certification processes for ${event.category || 'agriculture'}.`;

    return html`
      <div class="ed-card ${state.viewMode} style-${styleData.badge}">
        <div class="ed-card-date">
          <span class="ed-month">${dateParts.month}</span>
          <span class="ed-day">${dateParts.day}</span>
          <span class="ed-dow">${dateParts.weekday.substring(0, 3).toUpperCase()}</span>
        </div>

        <div class="ed-card-info">
          <span class="ed-badge ${styleData.badge}">${event.category ? event.category.toUpperCase() : 'EPM EVENT'}</span>
          <h3 class="ed-event-title">${event.title}</h3>
          <div class="ed-event-meta-grid">
            <span>${icon('map-pin', { size: 14 })} ${event.city}, ${event.state}</span>
            <span>${icon('calendar', { size: 14 })} ${formatEventDateLong(event.eventDate)}</span>
            ${event.timeRange && html`<span>${icon('clock', { size: 14 })} ${event.timeRange}</span>`}
            ${event.venue && html`<span>${icon('building-2', { size: 14 })} ${event.venue}</span>`}
          </div>
        </div>

        <div class="ed-card-desc">
          <p>${description}</p>
          <div class="ed-attendees">
            <div class="ed-avatars">
              <img src="https://i.pravatar.cc/100?img=1" alt="user" />
              <img src="https://i.pravatar.cc/100?img=2" alt="user" />
              <img src="https://i.pravatar.cc/100?img=3" alt="user" />
            </div>
            <span>${registeredCount} Registered</span>
          </div>
        </div>

        <div class="ed-card-actions">
          <span class="ed-status-pill upcoming">Upcoming</span>
          <div class="ed-action-btns">
            <button class="ed-btn-details" data-event-id="${event.id}">View Details ${icon('arrow-left', { size: 14, style: 'transform: rotate(180deg);' })}</button>
            <button class="ed-btn-bookmark">${icon('bookmark', { size: 16 })}</button>
          </div>
        </div>

        ${state.viewMode === 'list' && html`<div class="ed-card-bg-art" style="background-image: url(${styleData.img});"></div>`}
      </div>`;
  };

  function drawList() {
    if (state.loading) {
      render(listEl, html`<div class="ed-state-msg">${icon('loader-2', { size: 24, className: 'spin' })} Loading Events...</div>`);
      return;
    }
    if (state.loadError) {
      render(listEl, html`<div class="ed-state-msg text-red-500">${icon('alert-triangle', { size: 24 })} ${state.loadError}</div>`);
      return;
    }
    const events = filteredEvents();
    if (events.length === 0) {
      render(listEl, html`<div class="ed-state-msg">No events match your criteria.</div>`);
      return;
    }
    render(listEl, html`
      <div class="${state.viewMode === 'list' ? 'ed-cards-list' : 'ed-cards-grid'}">
        ${events.map(eventCardHtml)}
      </div>`);
  }

  // Everything that depends on the events, the applied filters or the category.
  function drawResults() {
    drawCategories();
    drawToolbar();
    drawList();
  }

  // ---- Loading -------------------------------------------------------------------------------
  // Category list is driven entirely by the backend so it stays in sync without a frontend
  // redeploy; the "All Categories" entry stays as the fallback if this fails.
  fetchEpmCategories()
    .then((data) => {
      const mapped = data.map((c) => ({ name: c.label, id: c.id, color: c.color || getCategoryMeta(c.id).accent }));
      state.categories = [{ name: ALL_CATEGORIES, id: ALL_CATEGORIES, color: 'gray' }, ...mapped];
      drawCategories();
      drawList();
    })
    .catch(() => {});

  let requestId = 0;
  // Runs for the first load and whenever the Upcoming/Previous tab changes; clears the filters.
  function loadEvents() {
    const id = ++requestId;
    state.loading = true;
    state.loadError = '';
    state.draft = { ...EMPTY_FILTERS };
    state.applied = { ...EMPTY_FILTERS };
    drawFilterOptions();
    drawResults();

    fetchEpmEvents({ status: state.activeTab })
      .then((data) => {
        if (id === requestId) state.events = data || [];
      })
      .catch((err) => {
        if (id === requestId) state.loadError = err.message || 'Failed to load EPMs.';
      })
      .finally(() => {
        if (id !== requestId) return;
        state.loading = false;
        drawFilterOptions();
        drawResults();
      });
  }

  // ---- Interaction ---------------------------------------------------------------------------
  fields.query.addEventListener('input', () => {
    state.draft = { ...state.draft, query: fields.query.value };
  });
  fields.month.addEventListener('change', () => {
    state.draft = { ...state.draft, month: fields.month.value };
  });
  fields.state.addEventListener('change', () => {
    state.draft = { ...state.draft, state: fields.state.value, district: '', city: '' };
    drawFilterOptions();
  });
  fields.district.addEventListener('change', () => {
    state.draft = { ...state.draft, district: fields.district.value, city: '' };
    drawFilterOptions();
  });
  fields.city.addEventListener('change', () => {
    state.draft = { ...state.draft, city: fields.city.value };
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    state.applied = { ...state.draft };
    drawToolbar();
    drawList();
  });

  document.getElementById('ed-reset-filters').addEventListener('click', () => {
    state.draft = { ...EMPTY_FILTERS };
    state.applied = { ...EMPTY_FILTERS };
    drawFilterOptions();
    drawToolbar();
    drawList();
  });

  on(categoriesEl, 'click', '[data-index]', (_event, button) => {
    const category = state.categories[Number(button.dataset.index)];
    if (!category || category.id === state.activeCategory) return;
    state.activeCategory = category.id;
    drawResults();
  });

  on(tabsEl, 'click', '[data-tab]', (_event, button) => {
    if (button.dataset.tab === state.activeTab) return;
    state.activeTab = button.dataset.tab;
    loadEvents();
  });

  on(viewToggleEl, 'click', '[data-view]', (_event, button) => {
    if (button.dataset.view === state.viewMode) return;
    state.viewMode = button.dataset.view;
    drawToolbar();
    drawList();
  });

  on(listEl, 'click', '.ed-btn-details', (_event, button) => {
    navigate('epm-event-details', { eventId: button.dataset.eventId });
  });

  loadEvents();
}
