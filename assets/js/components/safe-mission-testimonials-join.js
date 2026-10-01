// Testimonials + "Join S.A.F.E. Mission" panels of the Safe Mission page. The static parts
// (headers, impact stats, mission benefits) are markup in pages/safe-mission.html; this renders
// the rotating testimonial card (every 6s, dots jump and restart the timer) and the 4-step join
// form (stepper, step panel, Back / Continue / Join buttons). Both panels fade in on scroll-in.
//
//   initSafeMissionTestimonialsJoin(document.querySelector('.sm-combined-section'));
import { html, render, toElement, cx, on } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { assetUrl } from '../core/router.js';

const TESTIMONIALS = [
  {
    name: 'Ramesh Naidu',
    role: 'Farmer, Vijayawada, AP',
    text: 'With multi-layer farming, my 14 acres now give year-round income. My earnings have 4x in just two years!',
    impactTitle: 'Income',
    impactValue: '4x',
    imageSrc: 'images/safe-mission/farmer_1.avif',
    icon: 'indian-rupee',
  },
  {
    name: 'Lakshmi Devi',
    role: 'FPO Member, Guntur, AP',
    text: 'The packhouse and value-addition support helped us get better prices and direct market access. S.A.F.E. Mission really stands with farmers.',
    impactTitle: 'Prices',
    impactValue: 'Better',
    imageSrc: 'images/safe-mission/farmer_2.avif',
    icon: 'sprout',
  },
  {
    name: 'Kiran Reddy',
    role: 'Cooperative Member, Krishna, AP',
    text: 'Export opportunities through S.A.F.E. Mission opened global markets for our produce. Our cooperative is now financially stronger than ever.',
    impactTitle: 'Opportunities',
    impactValue: 'Global',
    imageSrc: 'images/safe-mission/farmer_3.avif',
    icon: 'globe',
  },
];

const ROTATE_MS = 6000;

const STEPS = [
  { title: 'Basic Information', subtitle: 'Tell us about yourself', icon: 'users' },
  { title: 'Additional Details', subtitle: 'Share details about your farming', icon: 'sprout' },
  { title: 'Area & Membership', subtitle: 'Help us understand your interests', icon: 'target' },
  { title: 'Review & Submit', subtitle: 'Your data is safe with us', icon: 'shield-check' },
];

const INITIAL_FORM_DATA = {
  fullName: '',
  mobileNumber: '',
  village: '',
  state: '',
  landOwned: '',
  landOwnershipType: '',
  primaryCrops: '',
  interestedObjective: '',
  membershipStatus: '',
  agreeToTerms: false,
  aadhaarNumber: '',
};

// Adds className once the element is 15% visible (one-shot).
function revealOnScroll(el, className) {
  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      el.classList.add(className);
      observer.disconnect();
    }
  }, { threshold: 0.15 });
  observer.observe(el);
}

/* ---------------------------------------------------------------- testimonials */

const testimonialCardHtml = (t) => html`
  <div class="sm-testimonial-card">
    ${icon('quote', { size: 20, className: 'sm-quote-mark' })}
    <p class="sm-testimonial-text">${t.text}</p>
    <div class="sm-testimonial-author-row">
      <div class="sm-testimonial-author-left">
        <img src="${assetUrl(t.imageSrc)}" alt="${t.name}" class="sm-testimonial-avatar" />
        <div class="sm-testimonial-author-info">
          <strong>${t.name}</strong>
          <span>${t.role}</span>
          <div class="sm-stars" aria-hidden="true">
            ${Array.from({ length: 5 }, () => icon('star', { size: 13, fill: 'currentColor', strokeWidth: 0 }))}
          </div>
        </div>
      </div>
      <span class="sm-testimonial-badge">${icon(t.icon, { size: 13 })} ${t.impactValue} ${t.impactTitle}</span>
    </div>
  </div>`;

function initTestimonials(section) {
  revealOnScroll(section, 'sm-in-view');

  const dots = section.querySelector('.sm-testimonial-dots');
  let active = 0;
  let card = null;

  render(dots, TESTIMONIALS.map((item, i) => html`
    <button type="button" role="tab" aria-selected="${String(i === active)}" aria-label="Show testimonial from ${item.name}"
      class="${cx('sm-dot', i === active && 'sm-dot-active')}" data-index="${i}"></button>`));

  // The card is a fresh element per testimonial (its fade-in replays); the dots update in place.
  const draw = () => {
    const next = toElement(testimonialCardHtml(TESTIMONIALS[active]));
    if (card) card.replaceWith(next);
    else dots.before(next);
    card = next;
    Array.from(dots.children).forEach((dot, i) => {
      dot.classList.toggle('sm-dot-active', i === active);
      dot.setAttribute('aria-selected', String(i === active));
    });
  };

  const setActive = (index) => {
    if (index === active) return;
    active = index;
    draw();
  };

  const advance = () => setActive((active + 1) % TESTIMONIALS.length);
  let timer = setInterval(advance, ROTATE_MS);

  on(dots, 'click', '.sm-dot', (_event, dot) => {
    clearInterval(timer);
    setActive(Number(dot.dataset.index));
    timer = setInterval(advance, ROTATE_MS);
  });

  draw();
}

/* ---------------------------------------------------------------- join form */

const inputIcon = (name) => icon(name, { size: 18, className: 'sm-input-icon' });

const fieldHtml = (label, iconName, control) => html`
  <div class="sm-form-group">
    <label>${label}</label>
    <div class="sm-input-wrapper">
      ${inputIcon(iconName)}
      ${control}
    </div>
  </div>`;

// Selected options are applied after rendering (see applyValues), like React's controlled select.
const selectHtml = (name, placeholder, options) => html`
  <select name="${name}" required>
    <option value="" disabled>${placeholder}</option>
    ${options.map(([value, label]) => html`<option value="${value}">${label}</option>`)}
  </select>`;

function stepFieldsHtml(step, data) {
  if (step === 0) {
    return html`
      <div class="sm-form-grid">
        ${fieldHtml('Full Name *', 'users', html`<input type="text" name="fullName" value="${data.fullName}" placeholder="Enter your full name" required />`)}
        ${fieldHtml('Mobile Number *', 'phone', html`<input type="tel" name="mobileNumber" value="${data.mobileNumber}" placeholder="Enter 10-digit mobile number" pattern="[0-9]{10}" required />`)}
        ${fieldHtml('Village / District *', 'map-pin', html`<input type="text" name="village" value="${data.village}" placeholder="Enter your village or district" required />`)}
        ${fieldHtml('State *', 'globe', selectHtml('state', 'Select state', [
          ['Andhra Pradesh', 'Andhra Pradesh'],
          ['Telangana', 'Telangana'],
          ['Karnataka', 'Karnataka'],
          ['Maharashtra', 'Maharashtra'],
          ['Other', 'Other'],
        ]))}
      </div>`;
  }
  if (step === 1) {
    return html`
      <div class="sm-form-grid sm-grid-3">
        ${fieldHtml('Land Owned (in acres) *', 'map-pin', html`<input type="number" name="landOwned" value="${data.landOwned}" placeholder="Enter land size" required min="0" step="0.1" />`)}
        ${fieldHtml('Land Ownership Type *', 'file-text', selectHtml('landOwnershipType', 'Select type', [
          ['Owned', 'Owned'],
          ['Leased', 'Leased'],
          ['Shared', 'Shared'],
        ]))}
        ${fieldHtml('Primary Crop(s) *', 'sprout', html`<input type="text" name="primaryCrops" value="${data.primaryCrops}" placeholder="e.g. Paddy, Mango, Chilli" required />`)}
      </div>`;
  }
  if (step === 2) {
    return html`
      <div class="sm-form-grid sm-grid-2">
        ${fieldHtml('Interested Objective *', 'target', selectHtml('interestedObjective', 'Select objective', [
          ['Increase Income', 'Increase Income'],
          ['Market Access', 'Better Market Access'],
          ['Export', 'Export Opportunities'],
          ['Technology', 'Farming Technology'],
        ]))}
        ${fieldHtml('FPO/Cooperative Membership *', 'users', selectHtml('membershipStatus', 'Select membership status', [
          ['Member', 'Currently a Member'],
          ['Not Member', 'Not a Member'],
          ['Interested', 'Interested in Joining'],
        ]))}
      </div>`;
  }
  return html`
    <div class="sm-checkbox-group">
      <input type="checkbox" id="agreeToTerms" name="agreeToTerms" required />
      <label for="agreeToTerms">I agree to the use of my data for S.A.F.E. Mission programs and accept the <a href="#terms">terms &amp; conditions</a>. *</label>
    </div>

    <div class="sm-form-group sm-aadhaar-group">
      <label>Aadhaar Number (Optional)</label>
      <div class="sm-aadhaar-wrapper">
        <div class="sm-input-wrapper">
          ${inputIcon('credit-card')}
          <input type="text" name="aadhaarNumber" value="${data.aadhaarNumber}" placeholder="Enter 12-digit Aadhaar number" pattern="[0-9]{12}" />
        </div>
        <span class="sm-aadhaar-hint">Only if KYC-grade signup is needed</span>
      </div>
    </div>`;
}

const stepPanelHtml = (step, data) => html`
  <div class="sm-step-panel">
    <div class="sm-step-panel-header">
      <div class="sm-step-panel-icon">
        ${icon(STEPS[step].icon, { size: 20 })}
      </div>
      <div>
        <h3 class="sm-step-title">${STEPS[step].title}</h3>
        <p class="sm-step-subtitle">${STEPS[step].subtitle}</p>
      </div>
      <span class="sm-step-panel-tag">${icon('sprout', { size: 13 })} Small steps. A bigger future.</span>
    </div>

    ${stepFieldsHtml(step, data)}
  </div>`;

const backSlotHtml = (step) => (step > 0
  ? html`<button type="button" class="sm-btn-back">${icon('chevron-left', { size: 18 })} Back</button>`
  : html`<span></span>`);

const nextLabel = (isLast) => (isLast ? 'Join S.A.F.E. Mission ' : 'Continue ');

function initJoin(section) {
  revealOnScroll(section, 'sm-in-view');

  const lastStep = STEPS.length - 1;
  const state = { step: 0, formData: { ...INITIAL_FORM_DATA } };

  const stepperItemClass = (i) => cx('sm-stepper-item', i === state.step && 'sm-stepper-active', i < state.step && 'sm-stepper-done');
  const stepperCircleHtml = (i) => (i < state.step ? icon('check', { size: 14 }) : i + 1);

  const stepper = section.querySelector('.sm-stepper');
  render(stepper, html`
    <div class="sm-stepper-track">
      <div class="sm-stepper-track-fill" style="width: ${(state.step / lastStep) * 100}%;"></div>
    </div>
    ${STEPS.map((s, i) => html`
      <div class="${stepperItemClass(i)}">
        <div class="sm-stepper-circle">${stepperCircleHtml(i)}</div>
        <span class="sm-stepper-label">${s.title}</span>
      </div>`)}`);
  const fill = stepper.querySelector('.sm-stepper-track-fill');
  const stepperItems = Array.from(stepper.querySelectorAll('.sm-stepper-item'));

  const progress = section.querySelector('.sm-stepper-progress-text');

  const form = section.querySelector('.sm-join-form');
  render(form, html`
    ${stepPanelHtml(state.step, state.formData)}

    <div class="sm-step-actions">
      ${backSlotHtml(state.step)}
      <button type="submit" class="sm-btn-next">${nextLabel(false)}${icon('chevron-right', { size: 18, className: 'sm-btn-arrow' })}</button>
    </div>`);
  const actions = form.querySelector('.sm-step-actions');
  const nextButton = actions.lastElementChild;

  // Selects and the checkbox take their value from state (text inputs carry it in the markup).
  const applyValues = (panel) => {
    panel.querySelectorAll('select, input[type="checkbox"]').forEach((el) => {
      if (el.type === 'checkbox') el.checked = state.formData[el.name];
      else el.value = state.formData[el.name];
    });
  };
  applyValues(form.querySelector('.sm-step-panel'));

  const drawProgress = () => {
    progress.textContent = `Step ${state.step + 1} of ${STEPS.length} · ${STEPS[state.step].subtitle}`;
  };
  drawProgress();

  // Stepper, progress text and buttons update in place (their CSS transitions run); the step
  // panel is a fresh element per step (its fade-in replays).
  const setStep = (step) => {
    if (step === state.step) return;
    state.step = step;

    fill.style.width = `${(step / lastStep) * 100}%`;
    stepperItems.forEach((item, i) => {
      item.className = stepperItemClass(i);
      const circle = item.querySelector('.sm-stepper-circle');
      const done = i < step;
      if (done !== Boolean(circle.querySelector('svg'))) render(circle, stepperCircleHtml(i));
    });
    drawProgress();

    const panel = toElement(stepPanelHtml(step, state.formData));
    form.querySelector('.sm-step-panel').replaceWith(panel);
    applyValues(panel);

    const backSlot = actions.firstElementChild;
    if ((step > 0) !== (backSlot.tagName === 'BUTTON')) backSlot.replaceWith(toElement(backSlotHtml(step)));

    const isLast = step === lastStep;
    nextButton.className = isLast ? 'sm-submit-btn' : 'sm-btn-next';
    nextButton.firstChild.nodeValue = nextLabel(isLast);
  };

  const handleChange = (event) => {
    const { name, type, checked, value } = event.target;
    if (!(name in state.formData)) return;
    state.formData[name] = type === 'checkbox' ? checked : value;
  };
  form.addEventListener('input', handleChange);
  form.addEventListener('change', handleChange);

  on(form, 'click', '.sm-btn-back', () => setStep(Math.max(0, state.step - 1)));

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (state.step < lastStep) {
      setStep(state.step + 1);
      return;
    }
    console.log('Form Submitted:', state.formData);
    alert('Thank you for your interest! Your application has been submitted successfully.');
    state.formData = { ...INITIAL_FORM_DATA };
    setStep(0);
  });
}

export function initSafeMissionTestimonialsJoin(section) {
  if (!section) return;
  initTestimonials(section.querySelector('.sm-testimonials-section'));
  initJoin(section.querySelector('.sm-join-section'));
}
