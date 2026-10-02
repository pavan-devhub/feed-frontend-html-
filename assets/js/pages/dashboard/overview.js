// The dashboard overview (hero banner, ERS / Krishi Coins / Plan cards, quick access, widgets).
// Its markup is static in pages/dashboard.html; this module fills in the data-driven bits and
// patches the parts that follow page state (hero phase, coin counter, ERS status) in place, so
// CSS transitions run the same way they did in React (e.g. the ERS ring filling up once the
// status arrives).
(function () {
  'use strict';

  const { html, render } = FW.require('core/dom');
  const { icon } = FW.require('core/icons');
  const { assetUrl } = FW.require('core/router');
  const { servicesMegaMenu } = FW.require('components/navbar');

  const ERS_RING_RADIUS = 36;
  const ERS_RING_CIRCUMFERENCE = 2 * Math.PI * ERS_RING_RADIUS;

  // root: the element holding the overview sections. Returns setters for the stateful parts.
  function setupOverview(root, { currentPlan, onOpenErs, onOpenPlans }) {
    const q = (selector) => root.querySelector(selector);

    // Hero: the scrolling services strip (the navbar's services list, twice for a seamless loop).
    render(q('.db-hero-services-track'), [...servicesMegaMenu, ...servicesMegaMenu].map((service) => html`
    <div class="db-hero-service-chip">
      <div class="srv-icon-circle color-${service.color}">
        <img src="${assetUrl(service.img)}" alt="${service.name}" class="srv-card-image" />
      </div>
      <span class="db-hero-service-chip-label">${service.name}</span>
    </div>`));

    // Plan card.
    q('.db-plan-corner-ribbon').textContent = currentPlan.name;
    q('.db-summary-subtitle').textContent = currentPlan.duration;
    render(q('.db-plan-tier-badge'), html`${icon('crown', { size: 12, fill: 'currentColor' })} ${currentPlan.name}`);

    // ERS card opens the assessment (click, Enter or Space); "Manage Plan" opens the plans page.
    const ersCard = q('.db-ers-card');
    ersCard.addEventListener('click', () => onOpenErs());
    ersCard.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onOpenErs();
      }
    });
    q('.db-upgrade-btn').addEventListener('click', () => onOpenPlans());

    const heroContent = q('.db-hero-content');
    const heroServices = q('.db-hero-services');
    const coinsValue = q('.db-coins2-balance-value');
    const ringFill = q('.db-ers-ring-fill');
    const ringCenter = q('.db-ers-ring-center');
    const encourageTitle = q('.db-ers-encourage-title');
    const encourageText = q('.db-ers-encourage-text');
    const statusPanel = q('.db-ers-status-panel');
    const ctaLabel = q('.db-ers-cta-text strong');
    const ctaSubtext = q('.db-ers-cta-text small');

    return {
      setHeroPhase(heroPhase) {
        heroContent.className = `db-hero-content ${heroPhase === 'content' ? 'is-active' : 'is-hidden'}`;
        heroServices.className = `db-hero-services ${heroPhase === 'services' ? 'is-active' : 'is-hidden'}`;
      },

      setCoins(coinsDisplay) {
        coinsValue.textContent = coinsDisplay.toLocaleString();
      },

      setErsStatus(ersStatus) {
        const ersRingOffset = ERS_RING_CIRCUMFERENCE * (1 - (ersStatus.attempted ? ersStatus.percentage : 0) / 100);
        const ersStatusTone = !ersStatus.attempted ? 'pending' : ersStatus.passed ? 'pass' : 'fail';
        const ersCtaLabel = !ersStatus.attempted ? 'Start Assessment' : ersStatus.passed ? 'View Results' : 'Retake Assessment';
        const ersCtaSubtext = !ersStatus.attempted ? 'Begin your empowerment journey' : ersStatus.passed ? 'See your certificate & score' : 'Track your progress and improve';
        const ersEncourageTitle = !ersStatus.attempted ? "Let's\nBegin!" : ersStatus.passed ? 'Great\nProgress!' : 'Keep\nGoing!';
        const ersEncourageText = !ersStatus.attempted
          ? 'Take the test'
          : ersStatus.passed
            ? 'Keep it up!'
            : "You're close";
        const ersCompletedOnLabel = ersStatus.completedOn
          ? new Date(ersStatus.completedOn).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
          : null;

        // Patched on the existing circle so the stroke-dashoffset transition animates the ring.
        ringFill.style.strokeDasharray = String(ERS_RING_CIRCUMFERENCE);
        ringFill.style.strokeDashoffset = String(ersRingOffset);

        render(ringCenter, ersStatus.attempted
          ? html`<span class="db-ers-ring-value">${Math.round(ersStatus.percentage)}%</span>`
          : html`${icon('play', { size: 16, className: 'db-ers-ring-play', fill: 'currentColor' })}<span class="db-ers-ring-caption">Get Started</span>`);

        render(encourageTitle, ersEncourageTitle.split('\n').map((line, i) => html`${line}${i === 0 && html`<br />`}`));
        encourageText.textContent = ersEncourageText;

        statusPanel.className = `db-ers-status-panel db-ers-status-${ersStatusTone}`;
        render(statusPanel, html`
        <div class="db-ers-status-badge" aria-hidden="true">${icon('shield-check', { size: 12 })}</div>
        <span class="db-ers-status-eyebrow">Assessment Status</span>
        <span class="db-ers-status-value">${ersStatus.attempted ? (ersStatus.passed ? 'Passed' : 'Not Passed') : 'Not Started'}</span>
        <span class="db-ers-status-sub">${!ersStatus.attempted
            ? 'Take the assessment to get started'
            : ersStatus.passed
              ? 'Completed successfully'
              : html`Review your answers and <span class="db-ers-status-retake">retake</span>`}</span>
        ${ersCompletedOnLabel && html`
          <div class="db-ers-status-meta">
            ${icon('calendar', { size: 11 })}
            <span class="db-ers-status-meta-text"><span class="db-ers-status-meta-label">Completed On</span><span class="db-ers-status-meta-date">${ersCompletedOnLabel}</span></span>
          </div>`}`);

        ctaLabel.textContent = ersCtaLabel;
        ctaSubtext.textContent = ersCtaSubtext;
      },
    };
  }

  FW.define('pages/dashboard/overview', { setupOverview });
})();
