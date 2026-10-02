// The three-step flow shared by the EPM "Register" and "Become a Volunteer" pages:
//   1. browse - the hero and the list of upcoming EPMs (static markup in the page),
//   2. form   - the chosen EPM plus the form (<template id="epm-form-view">),
//   3. success - the confirmation (<template id="epm-success-view">).
// The steps are swapped in place between the navbar and the footer, and the window scrolls back to
// the top on every step change. What was typed into the form (and any messages) is kept when the
// visitor goes back to pick another location, like the original page did.
//
//   initEventSignup({
//     actionLabel: 'Register for this EPM',           // link text on each EPM card
//     emptyMessage: 'There are no upcoming EPMs ...',  // when nothing is scheduled
//     initialData: { fullName: '', ... },              // form field values, keyed by input name
//     validate: (data) => ({ fullName: 'Full Name is required', ... }),  // {} when valid
//     submit: (epm, data) => promise,                  // sends the form for the chosen EPM
//   });
(function () {
  'use strict';

  const { html, toElement, on, scrollToTop } = FW.require('core/dom');
  const { icon, hydrateIcons } = FW.require('core/icons');
  const { fetchEpmEvents } = FW.require('api/epm-api');
  const { formatEventDateLong, formatEventDateParts } = FW.require('utils/epm-date');

  function initEventSignup({ actionLabel, emptyMessage, initialData, validate, submit }) {
    const container = document.querySelector('.epm-premium-container');
    const navbarEl = document.getElementById('site-navbar');
    const footerEl = document.getElementById('site-footer');
    const browseNodes = [
      container.querySelector('.epm-premium-nav'),
      container.querySelector('.epm-hero-split'),
      container.querySelector('.epm-events-section'),
    ];
    const [premiumNav, , eventsSection] = browseNodes;
    const formTemplate = document.getElementById('epm-form-view');
    const successTemplate = document.getElementById('epm-success-view');

    const state = {
      events: [],
      loadingEvents: true,
      loadError: '',
      selected: null, // the chosen EPM
      data: { ...initialData },
      errors: {},
      submitError: '',
      isSubmitting: false,
    };
    let formView = null; // the form step's element while it is showing

    const fromTemplate = (template) => {
      const fragment = template.content.cloneNode(true);
      hydrateIcons(fragment);
      return fragment.firstElementChild;
    };

    // Replaces everything between the navbar and the footer with the given nodes.
    function showNodes(nodes) {
      let node = navbarEl.nextSibling;
      while (node && node !== footerEl) {
        const next = node.nextSibling;
        node.remove();
        node = next;
      }
      nodes.forEach((n) => container.insertBefore(n, footerEl));
      scrollToTop();
    }

    // ---- Step 1: browse ------------------------------------------------------------------------
    const eventCardHtml = (epm, index) => {
      const { day, month, year } = formatEventDateParts(epm.eventDate);
      return html`
      <div class="epm-event-card" data-index="${index}">
        <div class="epm-event-date-block">
          <span class="epm-date-day">${day}</span>
          <span class="epm-date-month">${month}</span>
          <span class="epm-date-year">${year}</span>
        </div>
        <div class="epm-event-details">
          <h3 class="epm-event-city">${epm.city}</h3>
          <p class="epm-event-state">${epm.state}</p>
          <div class="epm-event-venue">${icon('map-pin', { size: 14 })} ${epm.venue}</div>
        </div>
        <div class="epm-event-action">
          <span class="epm-text-btn">${actionLabel} ${icon('arrow-right', { size: 16 })}</span>
        </div>
      </div>`;
    };

    function drawEvents() {
      const heading = eventsSection.querySelector('.epm-section-heading');
      while (heading.nextSibling) heading.nextSibling.remove();
      let content;
      if (state.loadingEvents) {
        content = html`<p style="color: #64748b;">Loading upcoming EPMs…</p>`;
      } else if (state.loadError) {
        content = html`<p class="epm-form-error" style="font-size: 0.95rem;">${state.loadError}</p>`;
      } else if (state.events.length === 0) {
        content = html`<p style="color: #64748b;">${emptyMessage}</p>`;
      } else {
        content = html`<div class="epm-events-timeline">${state.events.map(eventCardHtml)}</div>`;
      }
      heading.after(toElement(content));
    }

    function showBrowse() {
      state.selected = null;
      formView = null;
      showNodes(browseNodes);
    }

    on(eventsSection, 'click', '.epm-event-card', (_event, card) => {
      const epm = state.events[Number(card.dataset.index)];
      if (epm) showForm(epm);
    });

    // ---- Step 2: form --------------------------------------------------------------------------
    const formOf = () => formView?.querySelector('form');

    function drawFieldError(name) {
      const group = formOf()?.elements[name]?.closest?.('.epm-form-group');
      if (!group) return;
      group.querySelector('.epm-form-error')?.remove();
      if (state.errors[name]) group.append(toElement(html`<span class="epm-form-error">${state.errors[name]}</span>`));
    }

    const drawAllFieldErrors = () => Object.keys(state.data).forEach(drawFieldError);

    function drawSubmitError() {
      if (!formView) return;
      const main = formView.querySelector('.epm-form-main');
      main.querySelector(':scope > .epm-form-error')?.remove();
      if (!state.submitError) return;
      main.querySelector('.epm-form-title').after(toElement(html`
      <div class="epm-form-error" style="display: flex; align-items: center; gap: 8px; margin-bottom: 20px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px 16px;">
        ${icon('alert-circle', { size: 16 })} ${state.submitError}
      </div>`));
    }

    function drawSubmitButton() {
      const button = formView?.querySelector('[type="submit"]');
      if (!button) return;
      button.disabled = state.isSubmitting;
      // The first child is the label text, followed by the arrow icon.
      if (!button.dataset.label) button.dataset.label = button.firstChild.nodeValue.trim();
      button.firstChild.nodeValue = `${state.isSubmitting ? 'Submitting...' : button.dataset.label} `;
    }

    function handleInput(event) {
      const { name, value, type, checked } = event.target;
      if (!name || !(name in state.data)) return;
      state.data[name] = type === 'checkbox' ? checked : value;
      if (state.errors[name]) {
        state.errors[name] = '';
        drawFieldError(name);
      }
    }

    async function handleSubmit(event) {
      event.preventDefault();
      state.errors = validate(state.data);
      drawAllFieldErrors();
      if (Object.keys(state.errors).length > 0) return;

      state.isSubmitting = true;
      state.submitError = '';
      drawSubmitButton();
      drawSubmitError();
      try {
        await submit(state.selected, state.data);
        showSuccess();
      } catch (err) {
        state.submitError = err.message || 'Something went wrong. Please try again.';
        drawSubmitError();
      } finally {
        state.isSubmitting = false;
        drawSubmitButton();
      }
    }

    function showForm(epm) {
      state.selected = epm;
      formView = fromTemplate(formTemplate);
      formView.querySelector('[data-slot="city"]').textContent = epm.city ?? '';
      formView.querySelector('[data-slot="state"]').textContent = epm.state ?? '';
      formView.querySelector('[data-slot="date"]').textContent = formatEventDateLong(epm.eventDate);
      formView.querySelector('[data-slot="venue"]').textContent = epm.venue ?? '';

      const form = formView.querySelector('form');
      Object.entries(state.data).forEach(([name, value]) => {
        const field = form.elements[name];
        if (!field) return;
        if (field.type === 'checkbox') field.checked = Boolean(value);
        else field.value = value;
      });
      drawAllFieldErrors();
      drawSubmitError();
      drawSubmitButton();

      form.addEventListener('input', handleInput);
      form.addEventListener('change', handleInput);
      form.addEventListener('submit', handleSubmit);
      on(formView, 'click', '[data-action="change-location"]', showBrowse);

      showNodes([premiumNav, formView]);
    }

    // ---- Step 3: success -----------------------------------------------------------------------
    function showSuccess() {
      const view = fromTemplate(successTemplate);
      const epm = state.selected;
      view.querySelector('[data-slot="meta"]').textContent = `${epm?.city ?? ''} EPM · ${formatEventDateLong(epm?.eventDate)}`;
      formView = null;
      showNodes([view]);
    }

    // ---- Load the upcoming EPMs ----------------------------------------------------------------
    fetchEpmEvents({ status: 'upcoming' })
      .then((data) => {
        state.events = data || [];
      })
      .catch((err) => {
        state.loadError = err.message || 'Failed to load upcoming EPMs.';
      })
      .finally(() => {
        state.loadingEvents = false;
        drawEvents();
      });
  }

  FW.define('pages/epm/event-signup', { initEventSignup });
})();
