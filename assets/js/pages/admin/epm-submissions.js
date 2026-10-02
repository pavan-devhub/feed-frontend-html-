// Admin panel -> EPM -> Registrations / Volunteers. Converted from
// src/pages/admin/epm/EpmSubmissionsAdmin.jsx - one screen for both submission types (ctx.kind);
// they share filters and layout and differ only in the columns each form collects.
// mount(container, ctx) renders the section into <main class="adm-main"> and returns a cleanup.
(function () {
  'use strict';

  const { html, render, on } = FW.require('core/dom');
  const { icon } = FW.require('core/icons');
  const {
    fetchAdminEvents,
    fetchAdminRegistrations,
    fetchAdminVolunteers,
  } = FW.require('api/admin-epm-api');
  const { sectionHeaderHtml, loadingHtml, emptyHtml } = FW.require('pages/admin/admin-ui');
  const { downloadCsv, formatDate, formatDateTime, todayIso } = FW.require('pages/admin/admin-utils');

  const KINDS = {
    registrations: {
      eyebrow: 'EPM',
      icon: 'users',
      title: 'EPM Registrations',
      noun: 'registration',
      description: 'People who registered to attend an EPM. Pick a date to see everyone registered for the EPMs held that day, or the people who signed up on that day.',
      fetch: fetchAdminRegistrations,
      extraColumns: [
        { label: 'Participant type', value: (r) => r.participantType },
        { label: 'Consent', value: (r) => (r.consent ? 'Yes' : 'No') },
      ],
    },
    volunteers: {
      eyebrow: 'EPM',
      icon: 'heart-handshake',
      title: 'EPM Volunteers',
      noun: 'volunteer',
      description: 'People who offered to volunteer at an EPM. Pick a date to see the volunteers for the EPMs held that day, or the people who applied on that day.',
      fetch: fetchAdminVolunteers,
      extraColumns: [
        { label: 'Background', value: (r) => r.experience },
        { label: 'Why they want to volunteer', value: (r) => r.reason },
      ],
    },
  };

  // Replaces the nodes between `start` and `end` (exclusive; end null = to the last child), so a
  // block that React rendered conditionally can come and go without an extra wrapper element.
  function renderBetween(start, end, content) {
    while (start.nextSibling && start.nextSibling !== end) start.nextSibling.remove();
    const tpl = document.createElement('template');
    render(tpl, content);
    start.parentNode.insertBefore(tpl.content, end);
  }

  function mount(container, ctx) {
    const kind = ctx.kind;
    const config = KINDS[kind];
    const params = ctx.params || {};
    const state = {
      events: [],
      rows: [],
      loading: true,
      error: '',
      eventId: params.eventId ? String(params.eventId) : '',
      dateMode: 'eventDate', // 'eventDate' | 'submittedOn'
      date: '',
      query: '',
      debouncedQuery: '',
    };
    let disposed = false;
    let debounceTimer = null;
    let requestId = 0;

    render(container, html`
    ${sectionHeaderHtml({
        eyebrow: config.eyebrow,
        icon: config.icon,
        title: config.title,
        description: config.description,
        actions: html`
        <button type="button" class="admin-pub-btn adm-btn-secondary" data-action="export" disabled>
          ${icon('download', { size: 16 })} Export CSV
        </button>`,
      })}
    <div class="adm-filters">
      <div class="adm-filter adm-filter-auto">
        <span>Date is the…</span>
        <div class="adm-segmented" role="radiogroup">
          <button type="button" role="radio" aria-checked="true" class="active" data-mode="eventDate">${icon('calendar-days', { size: 13 })} EPM date</button>
          <button type="button" role="radio" aria-checked="false" class="" data-mode="submittedOn">${icon('clock', { size: 13 })} Signed-up date</button>
        </div>
      </div>
      <label class="adm-filter">
        <span>Date</span>
        <input type="date" value="" data-filter="date" />
      </label>
      <label class="adm-filter adm-filter-wide">
        <span>EPM</span>
        <select data-filter="event"></select>
      </label>
      <label class="adm-filter adm-filter-search">
        <span>Search</span>
        <div class="adm-input-icon">
          ${icon('search', { size: 15 })}
          <input type="search" placeholder="Name, mobile, email, district…" value="" data-filter="query" />
        </div>
      </label>
    </div>
    <!--chips-->
    <div class="admin-pub-table-wrap"></div>`);
    const exportButton = container.querySelector('[data-action="export"]');
    const filtersEl = container.querySelector('.adm-filters');
    const dateInput = filtersEl.querySelector('[data-filter="date"]');
    const eventSelect = filtersEl.querySelector('[data-filter="event"]');
    const queryInput = filtersEl.querySelector('[data-filter="query"]');
    const chipsEnd = Array.from(container.childNodes).find((n) => n.nodeType === Node.COMMENT_NODE);
    const tableWrap = container.querySelector('.admin-pub-table-wrap');

    // --- derived data (React's useMemo values) ---

    const eventsById = () => new Map(state.events.map((e) => [e.id, e]));

    // The event dropdown follows the date filter, so picking a date narrows it to that day's EPMs.
    const eventChoices = () => {
      const list = state.dateMode === 'eventDate' && state.date ? state.events.filter((e) => e.eventDate === state.date) : state.events;
      return [...list].sort((a, b) => b.eventDate.localeCompare(a.eventDate));
    };

    // Dates that actually have an EPM, for the quick-pick chips (nearest first).
    const eventDates = () => {
      const today = todayIso();
      const dates = Array.from(new Set(state.events.filter((e) => !e.cancelled).map((e) => e.eventDate)));
      const upcoming = dates.filter((d) => d >= today).sort();
      const past = dates.filter((d) => d < today).sort().reverse();
      return [...upcoming.slice(0, 4), ...past.slice(0, 3)];
    };

    const describeEvent = (r, byId = eventsById()) => {
      const e = byId.get(r.epmEventId);
      return e ? `${e.title} — ${e.city}` : `${r.eventCity}, ${r.eventState} (EPM removed)`;
    };

    const selectedEvent = () => (state.eventId ? eventsById().get(Number(state.eventId)) : null);
    const filtersActive = () => Boolean(state.eventId || state.date || state.query);

    const summary = () => {
      const { rows, date, dateMode } = state;
      const n = `${rows.length} ${config.noun}${rows.length === 1 ? '' : 's'}`;
      const sel = selectedEvent();
      if (sel) return `${n} for ${sel.title} in ${sel.city} on ${formatDate(sel.eventDate)}`;
      if (date && dateMode === 'eventDate') return `${n} for EPMs held on ${formatDate(date)}`;
      if (date) return `${n} submitted on ${formatDate(date)}`;
      return `${n} in total`;
    };

    // --- drawing ---

    const drawFilters = () => {
      filtersEl.querySelectorAll('[data-mode]').forEach((b) => {
        const active = b.dataset.mode === state.dateMode;
        b.className = active ? 'active' : '';
        b.setAttribute('aria-checked', String(active));
      });
      if (dateInput.value !== state.date) dateInput.value = state.date;
      if (queryInput.value !== state.query) queryInput.value = state.query;
      render(eventSelect, html`
      <option value="" ${state.eventId === '' ? 'selected' : ''}>${state.dateMode === 'eventDate' && state.date ? `All EPMs on ${formatDate(state.date)}` : 'All EPMs'}</option>
      ${eventChoices().map((e) => html`
        <option value="${e.id}" ${String(e.id) === state.eventId ? 'selected' : ''}>${formatDate(e.eventDate)} · ${e.title} — ${e.city}${e.cancelled ? ' (cancelled)' : ''}</option>`)}`);

      const clear = filtersEl.querySelector(':scope > .adm-link-btn');
      if (filtersActive() && !clear) {
        filtersEl.insertAdjacentHTML('beforeend', String(html`
        <button type="button" class="adm-link-btn" data-action="clear">
          ${icon('x', { size: 14 })} Clear
        </button>`));
      } else if (!filtersActive() && clear) {
        clear.remove();
      }
    };

    // The chips are only rebuilt when the set of dates changes; otherwise the active one is updated
    // in place so a clicked chip keeps keyboard focus.
    let chipsKey = null;
    const drawChips = () => {
      const dates = state.dateMode === 'eventDate' ? eventDates() : [];
      const key = dates.join(',');
      if (key !== chipsKey) {
        chipsKey = key;
        const today = todayIso();
        renderBetween(filtersEl, chipsEnd, dates.length > 0 && html`
        <div class="adm-chips" aria-label="Dates with EPMs">
          <span class="adm-chips-label">EPM dates:</span>
          ${dates.map((d) => html`
            <button type="button" class="adm-chip ${state.date === d ? 'active' : ''}" data-date="${d}">${formatDate(d)}${d === today ? ' (today)' : ''}</button>`)}
        </div>`);
      } else {
        container.querySelectorAll('.adm-chip[data-date]').forEach((b) => {
          b.className = `adm-chip ${state.date === b.dataset.date ? 'active' : ''}`;
        });
      }
    };

    const tableHtml = () => {
      const byId = eventsById();
      return html`
      <div class="adm-table-caption">${summary()}</div>
      <table class="admin-pub-table adm-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Contact</th>
            <th>From</th>
            ${kind === 'registrations' ? html`<th>Participant</th>` : html`<th>Background</th>`}
            <th>EPM</th>
            <th>Signed up</th>
          </tr>
        </thead>
        <tbody>
          ${state.rows.map((r) => html`
            <tr>
              <td data-label="Name"><strong>${r.fullName}</strong></td>
              <td data-label="Contact">
                <div><a href="${`tel:${r.mobileNumber}`}" class="adm-plain-link">${r.mobileNumber}</a></div>
                ${r.email && html`<div class="adm-cell-sub"><a href="${`mailto:${r.email}`}" class="adm-plain-link">${r.email}</a></div>`}
              </td>
              <td data-label="From">
                <div>${r.district}</div>
                <div class="adm-cell-sub">${r.state}</div>
              </td>
              ${kind === 'registrations' ? html`
                <td data-label="Participant">${r.participantType}</td>` : html`
                <td data-label="Background">
                  <div>${r.experience}</div>
                  ${r.reason && html`<div class="adm-cell-sub adm-clamp" title="${r.reason}">${r.reason}</div>`}
                </td>`}
              <td data-label="EPM">
                <button type="button" class="adm-inline-link adm-left" data-event-id="${r.epmEventId}"
                  title="Show everyone for this EPM" ${byId.get(r.epmEventId) ? '' : 'disabled'}>${describeEvent(r, byId)}</button>
                <div class="adm-cell-sub">${formatDate(r.eventDate)}</div>
              </td>
              <td data-label="Signed up" class="adm-nowrap">${formatDateTime(r.createdAt)}</td>
            </tr>`)}
        </tbody>
      </table>`;
    };

    const drawResults = () => {
      exportButton.disabled = state.rows.length === 0;
      renderBetween(chipsEnd, tableWrap, state.error && html`<div class="admin-pub-banner error">${state.error}</div>`);
      render(tableWrap, state.loading ? loadingHtml(`Loading ${config.noun}s…`) : state.rows.length === 0
        ? emptyHtml(filtersActive() ? `No ${config.noun}s match these filters.` : `No ${config.noun}s yet.`)
        : tableHtml());
      const sel = selectedEvent();
      renderBetween(tableWrap, null, sel && html`
      <p class="admin-pub-hint adm-footnote">
        Viewing one EPM. <button type="button" class="adm-inline-link" data-action="back">Back to EPM events</button>
      </p>`);
    };

    const draw = () => {
      if (disposed) return;
      drawFilters();
      drawChips();
      drawResults();
    };

    // --- data ---

    const fetchRows = () => {
      const id = ++requestId;
      state.loading = true;
      state.error = '';
      config.fetch({
        eventId: state.eventId || undefined,
        eventDate: state.dateMode === 'eventDate' ? state.date : undefined,
        submittedOn: state.dateMode === 'submittedOn' ? state.date : undefined,
        q: state.debouncedQuery,
      })
        .then((data) => { if (id === requestId && !disposed) state.rows = data; })
        .catch((e) => {
          if (id === requestId && !disposed) {
            state.error = e.message;
            state.rows = [];
          }
        })
        .finally(() => {
          if (id === requestId && !disposed) {
            state.loading = false;
            draw();
          }
        });
    };

    // Applies a state change; like the React effect, the list is re-fetched when one of its inputs changed.
    const update = (patch) => {
      const before = [state.eventId, state.dateMode, state.date, state.debouncedQuery].join('\u0000');
      Object.assign(state, patch);
      const after = [state.eventId, state.dateMode, state.date, state.debouncedQuery].join('\u0000');
      if (before !== after) fetchRows();
      draw();
    };

    const setQuery = (value) => {
      state.query = value;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (state.query.trim() !== state.debouncedQuery) update({ debouncedQuery: state.query.trim() });
      }, 300);
    };

    const exportCsv = () => {
      const byId = eventsById();
      const sel = selectedEvent();
      const columns = [
        { label: 'Name', value: (r) => r.fullName },
        { label: 'Mobile', value: (r) => r.mobileNumber },
        { label: 'Email', value: (r) => r.email },
        { label: 'District', value: (r) => r.district },
        { label: 'State', value: (r) => r.state },
        ...config.extraColumns,
        { label: 'EPM', value: (r) => describeEvent(r, byId) },
        { label: 'EPM date', value: (r) => r.eventDate },
        { label: 'Submitted at', value: (r) => (r.createdAt || '').replace('T', ' ').slice(0, 16) },
      ];
      const suffix = sel ? `-epm-${sel.id}` : state.date ? `-${state.dateMode === 'eventDate' ? 'epm' : 'submitted'}-${state.date}` : '';
      downloadCsv(`epm-${kind}${suffix}.csv`, columns, state.rows);
    };

    // --- events ---

    const offs = [
      on(container, 'click', '[data-mode]', (e, btn) => update({ dateMode: btn.dataset.mode })),
      on(container, 'click', '[data-date]', (e, chip) => update({ date: state.date === chip.dataset.date ? '' : chip.dataset.date, eventId: '' })),
      on(container, 'click', '[data-event-id]', (e, btn) => update({ eventId: btn.dataset.eventId })),
      on(container, 'click', '[data-action]', (e, btn) => {
        const { action } = btn.dataset;
        if (action === 'export') exportCsv();
        else if (action === 'back') ctx.openSection('epm-events');
        else if (action === 'clear') {
          setQuery('');
          update({ eventId: '', date: '' });
        }
      }),
      on(container, 'input', '[data-filter="date"]', (e, input) => update({ date: input.value, eventId: '' })),
      on(container, 'change', '[data-filter="event"]', (e, select) => update({ eventId: select.value })),
      on(container, 'input', '[data-filter="query"]', (e, input) => {
        setQuery(input.value);
        drawFilters();
        drawResults();
      }),
    ];

    draw();
    fetchRows();
    fetchAdminEvents({ status: 'all' })
      .then((data) => { state.events = data; })
      .catch(() => { state.events = []; })
      .then(draw);

    return () => {
      disposed = true;
      clearTimeout(debounceTimer);
      offs.forEach((off) => off());
    };
  }

  FW.define('pages/admin/epm-submissions', { mount });
})();
