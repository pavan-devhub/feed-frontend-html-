// Export Readiness Assessment (ERS) panel shown inside the user dashboard: loads the user's latest
// attempt, runs the 7-section questionnaire, submits it and shows the score gauge, per-dimension
// bars and the priority gap list.
//
//   const panel = mountErsAssessmentPanel(containerEl, { onBack, onStatusUpdated });
//   panel.destroy();
//
// Within a phase the existing elements are patched rather than re-rendered, so the progress bar,
// option highlight, stepper and result gauge transitions animate, and keyboard focus stays put.
import { html, render, on, toElement, scrollToTop } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { authHeaders } from '../core/auth.js';
import { API_BASE_URL } from '../core/config.js';
import { sections, scoreSections, computeGaps, getTier, TOTAL_MAX } from '../data/ers-data.js';

const SECTION_ICONS = {
  landmark: 'landmark',
  award: 'award',
  package: 'package',
  sprout: 'sprout',
  rupee: 'indian-rupee',
  globe: 'globe',
  file: 'file-text',
};

const apiBase = () => `${API_BASE_URL}/api/ers`;

// Semi-circle gauge geometry.
const R = 108, CX = 140, CY = 140, STROKE = 18;
const CIRC = Math.PI * R;
const DIAL_PATH = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;
const EASE = 'cubic-bezier(.22,1,.36,1)';

export function mountErsAssessmentPanel(container, { onBack, onStatusUpdated } = {}) {
  const state = {
    phase: 'loading', // loading | quiz | results
    currentSection: 0,
    answers: {},
    submitting: false,
    submitError: '',
    resultMeta: null,
    animateIn: false,
  };
  let destroyed = false;
  let animateTimer = null;
  let shownPhase = null;
  let shownSection = null;
  let scrollKey = null;

  const root = toElement(html`
    <div class="ers-view">
      <button class="ers-back-btn" type="button">${icon('arrow-left', { size: 17 })} Back to Dashboard</button>

      <div class="ers-card">
        <header class="ers-panel-header">
          <div class="ers-header-title">
            <div class="ers-header-icon">${icon('shield-check', { size: 20 })}</div>
            <div>
              <h2>Export Readiness Assessment</h2>
              <p>For FPOs, SHGs &amp; first-time exporters · 7 dimensions · ~8 minutes</p>
            </div>
          </div>
        </header>
      </div>
    </div>`);
  container.replaceChildren(root);
  const header = root.querySelector('.ers-panel-header');

  // --- derived values --------------------------------------------------------------------------

  const section = () => sections[state.currentSection];
  const isLastSection = () => state.currentSection === sections.length - 1;
  const filledInSection = () => section().questions.filter((q) => state.answers[q.id] !== undefined).length;
  const sectionComplete = (i) => sections[i].questions.every((q) => state.answers[q.id] !== undefined);
  const overallPct = () => Math.round(
    ((state.currentSection + (filledInSection() / section().questions.length)) / sections.length) * 100,
  );

  // --- markup ----------------------------------------------------------------------------------

  const loadingHtml = () => html`
    <div class="ers-loading">
      ${icon('loader-2', { size: 22, className: 'ers-spin' })}
      <span>Loading your assessment…</span>
    </div>`;

  const sectionBodyHtml = () => {
    const s = section();
    return html`
      <div class="ers-section-header">
        <div class="ers-section-icon" style="background: ${s.iconBg}; color: ${s.iconColor};">
          ${icon(SECTION_ICONS[s.icon], { size: 20 })}
        </div>
        <div>
          <div class="ers-section-title">${s.name}</div>
          <div class="ers-section-subtitle">Max ${s.max} pts · ${s.subtitle}</div>
        </div>
      </div>

      ${s.questions.map((q) => html`
        <div class="ers-q-card">
          <div class="ers-q-top">
            <div class="ers-q-label">${q.label}</div>
            <span class="ers-q-weight" style="background: ${s.iconBg}; color: ${s.iconColor};">${q.weight} pts</span>
          </div>
          <div class="ers-q-hint">${q.hint}</div>
          <div class="ers-opts">
            ${q.options.map((opt) => {
              const selected = state.answers[q.id] === opt.value;
              return html`
                <div class="ers-opt ${selected ? 'selected' : ''}" role="radio" aria-checked="${String(selected)}" tabindex="0"
                  data-qid="${q.id}" data-value="${opt.value}">
                  <span class="ers-opt-radio">${selected && html`<span class="ers-opt-radio-dot"></span>`}</span>
                  <span class="ers-opt-text">${opt.text}</span>
                  <span class="ers-opt-pts">${opt.value}</span>
                </div>`;
            })}
          </div>
        </div>`)}`;
  };

  const stepDotClass = (i) => {
    const done = sectionComplete(i);
    const active = i === state.currentSection;
    return `ers-step-dot ${active ? 'active' : ''} ${done && !active ? 'done' : ''}`;
  };
  const stepDotContent = (i) => (sectionComplete(i) && i !== state.currentSection ? icon('check', { size: 13 }) : i + 1);

  const nextButtonContent = () => {
    if (state.submitting) return html`${icon('loader-2', { size: 16, className: 'ers-spin' })} Scoring…`;
    if (isLastSection()) return html`See my score ${icon('arrow-right', { size: 16 })}`;
    return html`Next ${icon('chevron-right', { size: 16 })}`;
  };

  const quizHtml = () => html`
    <div class="ers-progress-row">
      <div class="ers-progress-track">
        <div class="ers-progress-fill" style="width: ${overallPct()}%;"></div>
      </div>
      <div class="ers-progress-labels">
        <span>Section ${state.currentSection + 1} of ${sections.length}</span>
        <span>${overallPct()}% complete</span>
      </div>
    </div>

    <div class="ers-body">${sectionBodyHtml()}</div>

    <div class="ers-stepper">
      ${sections.map((s, i) => html`
        <button class="${stepDotClass(i)}" type="button" aria-label="Go to section ${i + 1}: ${s.name}" data-index="${i}">${stepDotContent(i)}</button>`)}
    </div>

    <footer class="ers-nav-row">
      <button class="ers-btn" style="visibility: ${state.currentSection === 0 ? 'hidden' : 'visible'};" type="button" data-action="prev">${icon('chevron-left', { size: 16 })} Previous</button>
      <span class="ers-nav-status">${filledInSection()}/${section().questions.length} answered</span>
      <button class="ers-btn primary" type="button" data-action="next" ${state.submitting ? 'disabled' : ''}>${nextButtonContent()}</button>
    </footer>`;

  const resultsHtml = () => {
    const { resultMeta, answers } = state;
    const dimScores = scoreSections(answers);
    const gaps = computeGaps(answers);
    const tier = getTier(resultMeta?.percentage ?? 0);
    const pct = Math.max(0, Math.min(100, resultMeta?.percentage ?? 0));
    const dialOffset = state.animateIn ? CIRC * (1 - pct / 100) : CIRC;
    const needleAngle = state.animateIn ? -90 + (180 * (pct / 100)) : -90;

    return html`
      <div class="ers-body ers-results">
        ${state.submitError && html`
          <div class="ers-error-banner">${icon('alert-triangle', { size: 15 })} ${state.submitError}</div>`}

        <div class="ers-dial-wrap">
          <svg class="ers-dial-svg" width="280" height="176" viewBox="0 0 280 176">
            <path d="${DIAL_PATH}" fill="none" stroke="#EDEBE3" stroke-width="${STROKE}" stroke-linecap="round" />
            <path d="${DIAL_PATH}" fill="none" stroke="url(#ersDialGrad)" stroke-width="${STROKE}" stroke-linecap="round"
              stroke-dasharray="${CIRC}" stroke-dashoffset="${dialOffset}"
              style="transition: stroke-dashoffset 1.1s ${EASE};" />
            <defs>
              <linearGradient id="ersDialGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#E24B4A" />
                <stop offset="50%" stop-color="#EF9F27" />
                <stop offset="100%" stop-color="#1D9E75" />
              </linearGradient>
            </defs>
            <line x1="${CX}" y1="${CY}" x2="${CX}" y2="${CY - R + 30}" stroke="#1E293B" stroke-width="3" stroke-linecap="round"
              style="transform-origin: ${CX}px ${CY}px; transform: rotate(${needleAngle}deg); transition: transform 1.1s ${EASE};" />
            <circle cx="${CX}" cy="${CY}" r="6" fill="#1E293B" />
            <text x="${CX}" y="${CY - 22}" text-anchor="middle" font-size="34" font-weight="800" fill="#0f172a">${Math.round(resultMeta.percentage)}%</text>
            <text x="${CX - R}" y="${CY + 22}" font-size="11" fill="#94a3b8" text-anchor="middle">0</text>
            <text x="${CX + R}" y="${CY + 22}" font-size="11" fill="#94a3b8" text-anchor="middle">100</text>
          </svg>

          <div class="ers-pass-badge ${resultMeta.passed ? 'pass' : 'fail'}">${resultMeta.passed
            ? html`${icon('circle-check', { size: 15 })} Passed`
            : html`${icon('circle-x', { size: 15 })} Not Passed`}<span class="ers-pass-sub">· ${resultMeta.totalScore}/${TOTAL_MAX} pts</span></div>
          <div class="ers-tier" style="color: ${tier.color};">${tier.tier}</div>
          <div class="ers-tier-desc">${tier.desc}</div>
        </div>

        <div class="ers-dim-grid">
          ${dimScores.map((d) => html`
            <div class="ers-dim-card">
              <div class="ers-dim-name">${d.name}</div>
              <div class="ers-dim-bar-track">
                <div class="ers-dim-bar-fill" style="width: ${state.animateIn ? `${d.pct}%` : '0%'}; background: ${d.color};"></div>
              </div>
              <div class="ers-dim-score">${d.raw}/${d.max} pts (${d.pct}%)</div>
            </div>`)}
        </div>

        <div class="ers-gap-list">
          <div class="ers-gap-title">Priority Gap List</div>
          ${gaps.length === 0
            ? html`
              <div class="ers-gap-item minor">
                <span class="ers-gap-badge minor">Excellent</span>
                <div class="ers-gap-text">No significant gaps found. You are well-prepared to export.</div>
              </div>`
            : gaps.map((g) => html`
              <div class="ers-gap-item ${g.severity}">
                <span class="ers-gap-badge ${g.severity}">${g.severity}</span>
                <div>
                  <div class="ers-gap-text">${g.label}</div>
                  <div class="ers-gap-action">${g.action}</div>
                </div>
              </div>`)}
        </div>

        <div class="ers-restart-row">
          <button class="ers-btn primary" type="button" data-action="restart">${icon('rotate-ccw', { size: 16 })} Reassess</button>
        </div>
      </div>`;
  };

  // --- drawing ---------------------------------------------------------------------------------

  // Swaps everything under the header for the given phase's markup.
  const showPhaseContent = (content) => {
    while (header.nextSibling) header.nextSibling.remove();
    if (content) header.insertAdjacentHTML('afterend', String(content));
  };

  // Quiz phase, same phase as before: patch the existing elements.
  function updateQuiz() {
    const card = root.querySelector('.ers-card');
    const bodyEl = card.querySelector('.ers-body');

    if (state.currentSection !== shownSection) {
      shownSection = state.currentSection;
      render(bodyEl, sectionBodyHtml());
    } else {
      bodyEl.querySelectorAll('.ers-opt').forEach((opt) => {
        const selected = state.answers[opt.dataset.qid] === Number(opt.dataset.value);
        if (opt.classList.contains('selected') === selected) return;
        opt.className = `ers-opt ${selected ? 'selected' : ''}`;
        opt.setAttribute('aria-checked', String(selected));
        render(opt.querySelector('.ers-opt-radio'), selected && html`<span class="ers-opt-radio-dot"></span>`);
      });
    }

    const pct = overallPct();
    card.querySelector('.ers-progress-fill').style.width = `${pct}%`;
    const [sectionLabel, pctLabel] = card.querySelectorAll('.ers-progress-labels span');
    sectionLabel.textContent = `Section ${state.currentSection + 1} of ${sections.length}`;
    pctLabel.textContent = `${pct}% complete`;

    card.querySelectorAll('.ers-step-dot').forEach((dot) => {
      const i = Number(dot.dataset.index);
      dot.className = stepDotClass(i);
      render(dot, stepDotContent(i));
    });

    card.querySelector('[data-action="prev"]').style.visibility = state.currentSection === 0 ? 'hidden' : 'visible';
    card.querySelector('.ers-nav-status').textContent = `${filledInSection()}/${section().questions.length} answered`;
    const next = card.querySelector('[data-action="next"]');
    next.disabled = state.submitting;
    render(next, nextButtonContent());
  }

  // Results: the gauge needle, arc and bars animate from empty once animateIn flips (80ms in).
  function applyAnimateIn() {
    const svg = root.querySelector('.ers-dial-svg');
    if (!svg) return;
    const pct = Math.max(0, Math.min(100, state.resultMeta?.percentage ?? 0));
    const dialOffset = state.animateIn ? CIRC * (1 - pct / 100) : CIRC;
    const needleAngle = state.animateIn ? -90 + (180 * (pct / 100)) : -90;
    svg.querySelectorAll('path')[1].setAttribute('stroke-dashoffset', String(dialOffset));
    svg.querySelector('line').style.transform = `rotate(${needleAngle}deg)`;
    const dimScores = scoreSections(state.answers);
    root.querySelectorAll('.ers-dim-bar-fill').forEach((bar, i) => {
      bar.style.width = state.animateIn ? `${dimScores[i].pct}%` : '0%';
    });
  }

  function draw() {
    if (destroyed) return;
    if (state.phase !== shownPhase) {
      shownPhase = state.phase;
      shownSection = state.currentSection;
      if (state.phase === 'loading') showPhaseContent(loadingHtml());
      else if (state.phase === 'quiz') showPhaseContent(quizHtml());
      else showPhaseContent(state.resultMeta && resultsHtml());
    } else if (state.phase === 'quiz') {
      updateQuiz();
    }

    // phase (loading/quiz/results) and currentSection (wizard step) each swap the whole panel
    // content in place, so each transition should land back at the panel's top.
    const key = `${state.phase}-${state.currentSection}`;
    if (key !== scrollKey) {
      scrollKey = key;
      scrollToTop();
    }
  }

  // Entering the results (or getting a new result) replays the gauge animation.
  function startResultsAnimation() {
    clearTimeout(animateTimer);
    state.animateIn = false;
    if (state.phase !== 'results') return;
    animateTimer = setTimeout(() => {
      state.animateIn = true;
      applyAnimateIn();
    }, 80);
  }

  // --- actions ---------------------------------------------------------------------------------

  const selectOption = (qid, value) => {
    state.answers = { ...state.answers, [qid]: value };
    draw();
  };

  const goPrev = () => {
    state.currentSection = Math.max(0, state.currentSection - 1);
    draw();
  };

  async function handleSubmit() {
    state.submitting = true;
    state.submitError = '';
    draw();
    try {
      const res = await fetch(`${apiBase()}/submit`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ answers: state.answers }),
      });
      if (!res.ok) throw new Error('Submit failed');
      const data = await res.json();
      state.resultMeta = {
        totalScore: data.totalScore,
        percentage: data.percentage,
        passed: data.passed,
        createdAt: data.createdAt,
      };
      state.phase = 'results';
      onStatusUpdated?.();
    } catch {
      state.submitError = "Couldn't save your result to the server — showing a local preview instead. Check your connection and reassess to save it.";
      const localTotal = Object.entries(state.answers).reduce((sum, [, v]) => sum + (v || 0), 0);
      const localPct = (localTotal / TOTAL_MAX) * 100;
      state.resultMeta = { totalScore: localTotal, percentage: localPct, passed: localPct > 70, createdAt: null };
      state.phase = 'results';
    } finally {
      state.submitting = false;
    }
    if (destroyed) return;
    startResultsAnimation();
    draw();
  }

  const goNext = () => {
    if (isLastSection()) {
      handleSubmit();
    } else {
      state.currentSection = Math.min(sections.length - 1, state.currentSection + 1);
      draw();
    }
  };

  const handleRestart = () => {
    state.answers = {};
    state.currentSection = 0;
    state.resultMeta = null;
    state.submitError = '';
    state.phase = 'quiz';
    startResultsAnimation();
    draw();
  };

  on(root, 'click', '.ers-back-btn', () => onBack?.());
  on(root, 'click', '.ers-opt', (_event, opt) => selectOption(opt.dataset.qid, Number(opt.dataset.value)));
  on(root, 'keydown', '.ers-opt', (event, opt) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectOption(opt.dataset.qid, Number(opt.dataset.value));
    }
  });
  on(root, 'click', '.ers-step-dot', (_event, dot) => {
    state.currentSection = Number(dot.dataset.index);
    draw();
  });
  on(root, 'click', '[data-action="prev"]', goPrev);
  on(root, 'click', '[data-action="next"]', goNext);
  on(root, 'click', '[data-action="restart"]', handleRestart);

  // Load the user's latest attempt once on mount.
  (async () => {
    try {
      const res = await fetch(`${apiBase()}/status`, { headers: authHeaders() });
      if (!res.ok) {
        if (!destroyed) {
          state.phase = 'quiz';
          draw();
        }
        return;
      }
      const data = await res.json();
      if (destroyed) return;
      if (data.attempted) {
        state.answers = data.status.answers || {};
        state.resultMeta = {
          totalScore: data.status.totalScore,
          percentage: data.status.percentage,
          passed: data.status.passed,
          createdAt: data.status.createdAt,
        };
        state.phase = 'results';
        startResultsAnimation();
      } else {
        state.phase = 'quiz';
      }
      draw();
    } catch {
      if (!destroyed) {
        state.phase = 'quiz';
        draw();
      }
    }
  })();

  draw();

  return {
    destroy() {
      destroyed = true;
      clearTimeout(animateTimer);
    },
  };
}
