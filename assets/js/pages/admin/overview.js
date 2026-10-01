// Admin panel - Overview: the landing section, with headline numbers for Feed World and EPM and
// shortcuts into the other sections. mount(container, ctx) renders into <main class="adm-main">
// and returns a cleanup.
import { html, render, on } from '../../core/dom.js';
import { icon } from '../../core/icons.js';
import { fetchAdminEpmOverview, fetchAdminEvents } from '../../api/admin-epm-api.js';
import { fetchLatestPublication, fetchPublicationYears } from '../../api/publications-api.js';
import { emptyHtml, loadingHtml, sectionHeaderHtml } from './admin-ui.js';
import { formatDate } from './admin-utils.js';

export function mount(container, { user, openSection }) {
  const state = {
    overview: null,
    nextEvents: null,
    feedWorld: null,
    error: '',
  };
  let disposed = false;

  const statCards = (overview) => (overview ? [
    { label: 'Upcoming EPMs', value: overview.upcomingEvents, icon: 'calendar-days', section: 'epm-events', tone: 'green' },
    {
      label: 'Previous EPMs', value: overview.previousEvents, icon: 'history', section: 'epm-events', tone: 'slate',
      note: overview.cancelledEvents ? `${overview.cancelledEvents} cancelled` : null,
    },
    {
      label: 'Registrations', value: overview.registrations, icon: 'users', section: 'epm-registrations', tone: 'blue',
      note: `${overview.registrationsToday} today`,
    },
    {
      label: 'Volunteers', value: overview.volunteers, icon: 'heart-handshake', section: 'epm-volunteers', tone: 'orange',
      note: `${overview.volunteersToday} today`,
    },
    { label: 'Images', value: overview.galleryImages, icon: 'images', section: 'epm-images', tone: 'purple' },
    { label: 'Reviews', value: overview.reviews, icon: 'quote', section: 'epm-reviews', tone: 'amber' },
    { label: 'Categories', value: overview.categories, icon: 'tags', section: 'epm-categories', tone: 'teal' },
    { label: 'Venues', value: overview.venues, icon: 'map-pin', section: 'epm-venues', tone: 'slate' },
  ] : []);

  const draw = () => {
    if (disposed) return;
    const { overview, nextEvents, feedWorld, error } = state;
    render(container, html`
      ${sectionHeaderHtml({
        eyebrow: 'ADMIN',
        icon: 'layout-dashboard',
        title: `Welcome${user?.firstName ? `, ${user.firstName}` : ''}`,
        description: 'One place to manage Feed World publications and Export Promotional Meetings.',
      })}

      ${error && html`<div class="admin-pub-banner error">${error}</div>`}

      <h2 class="adm-subhead">EPM</h2>
      ${!overview && !error ? loadingHtml() : html`
        <div class="adm-stat-grid">
          ${statCards(overview).map((c) => html`
            <button type="button" class="adm-stat adm-tone-${c.tone}" data-section="${c.section}">
              <span class="adm-stat-icon">${icon(c.icon, { size: 18 })}</span>
              <span class="adm-stat-value">${c.value}</span>
              <span class="adm-stat-label">${c.label}</span>
              ${c.note && html`<span class="adm-stat-note">${c.note}</span>`}
            </button>`)}
        </div>`}

      <div class="adm-overview-cols">
        <section class="adm-block">
          <div class="adm-block-head">
            <div><h3>Next EPMs</h3><p>The soonest upcoming meetings and who has signed up.</p></div>
            <button type="button" class="adm-link-btn" data-section="epm-events">All EPMs ${icon('arrow-right', { size: 14 })}</button>
          </div>
          ${nextEvents === null ? loadingHtml() : nextEvents.length === 0 ? emptyHtml('No upcoming EPMs scheduled.') : html`
            <ul class="adm-next-list">
              ${nextEvents.map((e) => html`
                <li>
                  <span class="adm-next-date">${formatDate(e.eventDate)}</span>
                  <span class="adm-next-title">
                    <strong>${e.title}</strong>
                    <span class="adm-cell-sub">${e.venue}, ${e.city}</span>
                  </span>
                  <button type="button" class="adm-count-btn" title="Registrations" data-section="epm-registrations" data-event-id="${e.id}">
                    ${icon('users', { size: 13 })} ${e.registrationCount ?? 0}
                  </button>
                  <button type="button" class="adm-count-btn" title="Volunteers" data-section="epm-volunteers" data-event-id="${e.id}">
                    ${icon('heart-handshake', { size: 13 })} ${e.volunteerCount ?? 0}
                  </button>
                </li>`)}
            </ul>`}
        </section>

        <section class="adm-block">
          <div class="adm-block-head">
            <div><h3>${icon('book-open', { size: 16 })} Feed World</h3><p>Monthly publication issues.</p></div>
            <button type="button" class="adm-link-btn" data-section="feedworld">Manage ${icon('arrow-right', { size: 14 })}</button>
          </div>
          ${!feedWorld ? loadingHtml() : html`
            <div class="adm-fw-summary">
              <div><span class="adm-stat-value">${feedWorld.issues}</span><span class="adm-stat-label">issues across ${feedWorld.years} year${feedWorld.years === 1 ? '' : 's'}</span></div>
              <div class="adm-cell-sub">
                ${feedWorld.latest
                  ? html`Latest: <strong>${feedWorld.latest.monthName} ${feedWorld.latest.year}</strong> (${feedWorld.latest.language})`
                  : 'No issues uploaded yet.'}
              </div>
            </div>`}
        </section>
      </div>`);
  };

  const removeClick = on(container, 'click', '[data-section]', (_event, el) => {
    const { section, eventId } = el.dataset;
    openSection(section, eventId !== undefined ? { eventId } : {});
  });

  fetchAdminEpmOverview()
    .then((overview) => {
      state.overview = overview;
      draw();
    })
    .catch((e) => {
      state.error = e.message;
      draw();
    });
  fetchAdminEvents({ status: 'upcoming' })
    .then((data) => {
      state.nextEvents = data.filter((e) => !e.cancelled).slice(0, 5);
      draw();
    })
    .catch(() => {
      state.nextEvents = [];
      draw();
    });
  Promise.all([fetchPublicationYears().catch(() => []), fetchLatestPublication().catch(() => null)])
    .then(([years, latest]) => {
      state.feedWorld = {
        issues: years.reduce((sum, y) => sum + (y.count || 0), 0),
        years: years.length,
        latest,
      };
      draw();
    });

  draw();

  return () => {
    disposed = true;
    removeClick();
  };
}
