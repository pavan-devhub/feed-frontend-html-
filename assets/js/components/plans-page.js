// Membership plans (Basic / Gold / Platinum) shown inside the user dashboard. "Upgrade" only
// simulates sending a request (a short spinner, then "Request Sent") - there is no backend call.
//
//   const page = mountPlansPage(containerEl, { onBack });
//   page.destroy();
import { html, render, on, toElement } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { plans, CURRENT_PLAN_ID, formatINR } from '../data/plans-data.js';

const PLAN_ICONS = {
  basic: 'sprout',
  gold: 'crown',
  platinum: 'gem',
};

export function mountPlansPage(container, { onBack } = {}) {
  let upgradingId = null;
  let requestedId = null;
  let upgradeTimer = null;

  const ctaContent = (plan) => {
    const isCurrent = plan.id === CURRENT_PLAN_ID;
    if (isCurrent) return html`${icon('check-circle-2', { size: 16 })} Current Plan`;
    if (upgradingId === plan.id) return html`${icon('loader-2', { size: 16, className: 'plan-spin' })} Sending request…`;
    if (requestedId === plan.id) return html`${icon('check-circle-2', { size: 16 })} Request Sent`;
    return html`Upgrade to ${plan.name} ${icon('arrow-right', { size: 16 })}`;
  };

  const ctaDisabled = (plan) => plan.id === CURRENT_PLAN_ID || upgradingId === plan.id || requestedId === plan.id;

  const root = toElement(html`
    <div class="plans-view">
      <button class="plans-back-btn">${icon('arrow-left', { size: 16 })} Back to Dashboard</button>

      <div class="plans-header-row">
        <div class="plans-title">
          <div class="plans-eyebrow">${icon('sparkles', { size: 14 })} Membership Plans</div>
          <h1>Choose the plan that grows with you</h1>
          <p>Unlock more tools, higher limits and priority support for your organisation.</p>
        </div>
      </div>

      <div class="plans-grid">
        ${plans.map((plan) => {
          const isCurrent = plan.id === CURRENT_PLAN_ID;
          const displayTotal = plan.totalPrice ?? plan.price;
          return html`
            <div class="plan-card plan-${plan.id} ${plan.popular ? 'plan-popular' : ''} ${plan.bestChoice ? 'plan-best' : ''} ${isCurrent ? 'plan-current' : ''}">
              ${plan.popular && html`
                <div class="plan-ribbon">${icon('star', { size: 12, fill: 'currentColor' })} Most Popular</div>`}
              ${plan.bestChoice && html`<div class="plan-corner-ribbon">Best Choice</div>`}

              <div class="plan-card-header">
                <div class="plan-icon-badge">
                  ${icon(PLAN_ICONS[plan.id], { size: 26 })}
                </div>
                <h3 class="plan-name">${plan.name}</h3>
                <p class="plan-tagline">${plan.tagline}</p>
              </div>

              <div class="plan-duration-chip">${icon('calendar', { size: 13 })} ${plan.duration}</div>

              <div class="plan-pricing">
                <span class="plan-pricing-label">${plan.months > 1 ? 'Total you pay' : 'You pay'}</span>
                <div class="plan-total-price"><span class="plan-currency">₹</span>${formatINR(displayTotal)}</div>
                ${plan.months > 1 && html`<div class="plan-monthly-price">₹${formatINR(plan.price)} / month</div>`}
                ${plan.saveBadge && html`<div class="plan-save-badge">${plan.saveBadge}</div>`}
              </div>

              <div class="plan-services-count">${plan.serviceCount} Services Included</div>

              <ul class="plan-feature-list">
                ${plan.features.map((f) => html`
                  <li>
                    ${icon('check-circle-2', { size: 16, className: 'plan-feature-check' })}
                    <span class="plan-feature-name">${f.name}</span>
                    <span class="plan-feature-tag ${f.tag === 'Full' ? 'tag-full' : 'tag-limit'}">${f.tag}</span>
                  </li>`)}
              </ul>

              <button class="plan-cta-btn" data-plan="${plan.id}" ${ctaDisabled(plan) ? 'disabled' : ''}>${ctaContent(plan)}</button>
            </div>`;
        })}
      </div>

      <div class="plans-footer-note">
        ${icon('info', { size: 16 })}
        <span>Subscriptions are activated after admin approval. You'll receive an in-app notification once your access is activated.</span>
      </div>
    </div>`);
  container.replaceChildren(root);

  // The buttons are updated in place (the cards keep their hover state and transitions).
  const drawButtons = () => {
    plans.forEach((plan) => {
      const button = root.querySelector(`.plan-cta-btn[data-plan="${plan.id}"]`);
      button.disabled = ctaDisabled(plan);
      render(button, ctaContent(plan));
    });
  };

  const handleUpgrade = (planId) => {
    if (upgradingId || requestedId === planId) return;
    upgradingId = planId;
    drawButtons();
    upgradeTimer = setTimeout(() => {
      upgradingId = null;
      requestedId = planId;
      drawButtons();
    }, 900);
  };

  on(root, 'click', '.plans-back-btn', () => onBack?.());
  on(root, 'click', '.plan-cta-btn', (_event, button) => handleUpgrade(button.dataset.plan));

  return {
    destroy() {
      clearTimeout(upgradeTimer);
    },
  };
}
