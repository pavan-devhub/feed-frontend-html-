// "Upcoming EPMs" card: a month calendar (starting on the live current month, never a hardcoded
// one) that marks the days with an EPM, and next to it the first three upcoming EPMs of that same
// month. Both come from one status='upcoming' query for the month/year on show, so they never
// disagree. The backend's "upcoming" filter is eventDate >= today, so today itself is included
// whenever the calendar is on the current month.
import { fetchEpmEvents } from '../../api/epm-api.js';
import { html, render } from '../../core/dom.js';
import { formatEventDateParts } from '../../utils/epm-date.js';

const EVENT_COLORS = ['r-event-green', 'r-event-blue', 'r-event-orange'];

// .r-event-timeline-dot is the timeline node connection outside the card box on the left.
const eventCardHtml = (event, idx) => {
  const { day, month, weekday } = formatEventDateParts(event.eventDate);
  return html`
    <div class="redesign-event-card ${EVENT_COLORS[idx % 3]}">
      <div class="r-event-timeline-dot"></div>

      <div class="r-event-datebox">
        <span class="r-event-month">${month}</span>
        <span class="r-event-date">${day}</span>
        <span class="r-event-day-rule"></span>
        <span class="r-event-day">${weekday}</span>
      </div>

      <div class="r-event-details">
        <div class="r-event-category"><span>${event.category || 'EPM Event'}</span></div>
        <h4 class="r-event-title">${event.title}</h4>
        <div class="r-event-meta">
          <span class="r-meta-item">${event.city}, ${event.state}</span>
          <span class="r-meta-sep"></span>
          <span class="r-meta-item">${event.timeRange || 'Time to be announced'}</span>
        </div>
      </div>

      <div class="r-event-accent"></div>
    </div>`;
};

export function initUpcomingCalendar() {
  const labelEl = document.getElementById('epm-cal-label');
  const gridEl = document.getElementById('epm-cal-grid');
  const listEl = document.getElementById('epm-upcoming-list');

  const today = new Date();
  const state = {
    year: today.getFullYear(),
    month: today.getMonth() + 1, // 1-indexed
    eventDays: [],
    events: [],
    loading: true,
  };
  let requestId = 0;

  function drawCalendar() {
    labelEl.textContent = new Date(state.year, state.month - 1, 1)
      .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const daysInMonth = new Date(state.year, state.month, 0).getDate();
    // The grid runs Mon..Sun, so shift JS's Sun=0..Sat=6 to Mon=0..Sun=6 to know how many
    // leading blank cells the 1st of the month needs.
    const leadingBlanks = (new Date(state.year, state.month - 1, 1).getDay() + 6) % 7;

    gridEl.querySelectorAll('.epm-cal-day').forEach((cell) => cell.remove());
    const cells = html`
      ${Array.from({ length: leadingBlanks }, () => html`<div class="epm-cal-day empty"></div>`)}
      ${Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => html`
        <div class="epm-cal-day"><span class="${state.eventDays.includes(day) ? 'epm-cal-circle' : ''}">${day}</span></div>`)}`;
    gridEl.insertAdjacentHTML('beforeend', cells.toString());
  }

  function drawList() {
    if (state.loading) {
      render(listEl, html`<p style="color: #64748b;">Loading upcoming EPMs…</p>`);
    } else if (state.events.length === 0) {
      render(listEl, html`<p style="color: #64748b;">No upcoming EPMs scheduled right now. Please check back soon.</p>`);
    } else {
      render(listEl, state.events.map(eventCardHtml));
    }
  }

  function load() {
    const id = ++requestId;
    state.loading = true;
    drawList();
    fetchEpmEvents({ status: 'upcoming', year: state.year, month: state.month })
      .then((data) => {
        if (id !== requestId) return;
        state.eventDays = Array.from(new Set(data.map((e) => Number(e.eventDate.split('-')[2]))));
        state.events = data.slice(0, 3);
      })
      .catch(() => {
        if (id !== requestId) return;
        state.eventDays = [];
        state.events = [];
      })
      .finally(() => {
        if (id !== requestId) return;
        state.loading = false;
        drawCalendar();
        drawList();
      });
  }

  function changeMonth(step) {
    if (step < 0 && state.month === 1) {
      state.month = 12;
      state.year -= 1;
    } else if (step > 0 && state.month === 12) {
      state.month = 1;
      state.year += 1;
    } else {
      state.month += step;
    }
    drawCalendar();
    load();
  }

  document.getElementById('epm-cal-prev').addEventListener('click', () => changeMonth(-1));
  document.getElementById('epm-cal-next').addEventListener('click', () => changeMonth(1));

  drawCalendar();
  load();
}
