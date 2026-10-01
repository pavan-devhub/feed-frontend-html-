// The EPM page's "Testimonials" card: the admin's published reviews in a slider that moves one
// card every 4s, with prev/next buttons. Like the gallery, the reviews are repeated four times
// and the position is quietly jumped forward by one copy (no transition) whenever it drifts into
// the first copy, so the slider can keep moving forever. epm.css positions the track from the
// --current-slide custom property.
import { html, toElement } from '../../core/dom.js';
import { icon } from '../../core/icons.js';

const AUTO_SCROLL_MS = 4000;
const RESET_DELAY_MS = 600;
const TRACK_TRANSITION = 'transform 0.5s ease-in-out';

const starCount = (rating) => Math.max(0, Math.min(5, rating || 0));

const testimonialHtml = (testi) => {
  const { authorName, authorRole } = testi;
  return html`
    <div class="epm-testimonial-content">
      ${icon('quote', { size: 72, fill: 'currentColor', className: 'epm-testimonial-watermark' })}
      <div class="epm-testimonial-stars">
        ${Array.from({ length: starCount(testi.rating) }, () => icon('star', { size: 15, fill: 'currentColor', className: 'epm-star-filled' }))}
      </div>
      <p class="epm-testimonial-text">${testi.text}</p>
      <div class="epm-testimonial-footer">
        <div class="epm-testimonial-avatar">${String(authorName ?? '').charAt(0)}</div>
        <div class="epm-testimonial-author-block">
          <p class="epm-testimonial-author">${authorName}</p>
          ${authorRole && html`<p class="epm-testimonial-role">${authorRole}</p>`}
        </div>
      </div>
    </div>`;
};

// Builds the card (testimonials must be non-empty) and inserts it before `beforeEl`.
// Returns the card element so the page can attach its scroll reveal.
export function mountTestimonials(beforeEl, testimonials) {
  const length = testimonials.length;
  const state = { index: 0, transition: true };
  const extended = [...testimonials, ...testimonials, ...testimonials, ...testimonials];

  const card = toElement(html`
    <div class="epm-card testimonial-card epm-reveal dir-right">
      <div class="epm-card-header redesign-header">
        <div class="epm-header-left">
          <div class="redesign-header-icon color-amber">${icon('quote', { size: 20, fill: 'currentColor' })}</div>
          <div>
            <h2 class="epm-card-title">Testimonials</h2>
            <p class="redesign-subtitle">What our participants say about EPMs</p>
          </div>
        </div>
        <div class="epm-testimonial-nav">
          <button class="epm-nav-btn" data-action="testi-prev">${icon('chevron-left', { size: 18 })}</button>
          <button class="epm-nav-btn" data-action="testi-next">${icon('chevron-right', { size: 18 })}</button>
        </div>
      </div>
      <div class="epm-testimonial-slider">
        <div class="epm-testimonial-slide-track" style="--current-slide: ${state.index}; transition: ${TRACK_TRANSITION};">
          ${extended.map(testimonialHtml)}
        </div>
      </div>
    </div>`);
  beforeEl.before(card);
  const track = card.querySelector('.epm-testimonial-slide-track');

  let resetTimer = null;

  // Re-armed whenever the index changes: in the first copy, jump forward one copy invisibly.
  function scheduleReset() {
    clearTimeout(resetTimer);
    resetTimer = null;
    if (state.index > length) return;
    resetTimer = setTimeout(() => set({ transition: false, index: state.index + length }), RESET_DELAY_MS);
  }

  function set({ index = state.index, transition = state.transition }) {
    const indexChanged = index !== state.index;
    if (!indexChanged && transition === state.transition) return;
    state.index = index;
    state.transition = transition;
    track.style.setProperty('--current-slide', String(state.index));
    track.style.transition = state.transition ? TRACK_TRANSITION : 'none';
    if (indexChanged) scheduleReset();
  }

  // Start in the middle copies, without animating there.
  set({ transition: false, index: length * 2 });

  setInterval(() => set({ transition: true, index: state.index - 1 }), AUTO_SCROLL_MS);

  card.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    // "next" moves the track right (index - 1), "prev" moves it left (index + 1).
    if (button.dataset.action === 'testi-next') set({ transition: true, index: state.index - 1 });
    if (button.dataset.action === 'testi-prev') set({ transition: true, index: state.index + 1 });
  });

  return card;
}
