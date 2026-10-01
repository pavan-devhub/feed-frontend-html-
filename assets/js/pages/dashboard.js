// User dashboard (login required): sidebar menu, and a content area that shows the overview, the
// "My Profile" tabs, the ERS assessment or the membership plans.
//
// What's on screen is decided by activeTab (sidebar / profile tabs) and two panel flags, exactly
// as in the React page: the ERS panel and the plans page take over the content area until their
// "Back to Dashboard" button is pressed.
import { initPage } from '../core/page.js';
import { scrollToTop } from '../core/dom.js';
import { getToken } from '../core/auth.js';
import { API_BASE_URL } from '../core/config.js';
import { plans, CURRENT_PLAN_ID } from '../data/plans-data.js';
import { mountErsAssessmentPanel } from '../components/ers-assessment-panel.js';
import { mountPlansPage } from '../components/plans-page.js';
import { mountSidebarNav } from './dashboard/sidebar-nav.js';
import { setupOverview } from './dashboard/overview.js';
import { mountProfileView } from './dashboard/profile-view.js';

const HERO_CONTENT_DURATION = 6000;
const HERO_SERVICES_DURATION = 20000;
const KRISHI_COINS_BALANCE = 12450;

const session = initPage({ page: 'dashboard', access: 'user' });
if (session) initDashboard();

function initDashboard() {
  const state = {
    activeTab: '0',
    ersPanelOpen: false,
    plansPanelOpen: false,
    ersStatus: { attempted: false, percentage: 0, passed: false, completedOn: null },
    heroPhase: 'content',
  };

  const currentPlan = plans.find((p) => p.id === CURRENT_PLAN_ID) || plans[0];
  const contentEl = document.getElementById('db-content');

  // The overview markup lives in the HTML. Its nodes are kept while another view is shown and
  // put back afterwards (re-inserting restarts its CSS animations, like React remounting it).
  const overviewNodes = Array.from(contentEl.childNodes);
  const overview = setupOverview(contentEl, {
    currentPlan,
    onOpenErs: () => setState({ ersPanelOpen: true }),
    onOpenPlans: () => setState({ plansPanelOpen: true }),
  });

  const nav = mountSidebarNav(document.getElementById('db-nav'), {
    onSelect: (tabId) => setState({ activeTab: tabId }),
  });

  let shownView = 'overview';
  let viewInstance = null;
  let scrollKey = null;

  const currentView = () => {
    if (state.ersPanelOpen) return 'ers';
    if (state.plansPanelOpen) return 'plans';
    return !state.activeTab.startsWith('profile') ? 'overview' : 'profile';
  };

  function drawContent() {
    const view = currentView();
    if (view === shownView) {
      if (view === 'profile') viewInstance.update(state.activeTab);
      return;
    }
    viewInstance?.destroy();
    viewInstance = null;
    shownView = view;
    if (view === 'overview') {
      contentEl.replaceChildren(...overviewNodes);
    } else if (view === 'ers') {
      viewInstance = mountErsAssessmentPanel(contentEl, {
        onBack: () => setState({ ersPanelOpen: false }),
        onStatusUpdated: fetchErsStatus,
      });
    } else if (view === 'plans') {
      viewInstance = mountPlansPage(contentEl, { onBack: () => setState({ plansPanelOpen: false }) });
    } else {
      viewInstance = mountProfileView(contentEl, {
        activeTab: state.activeTab,
        onSelectTab: (tabId) => setState({ activeTab: tabId }),
      });
    }
  }

  function draw() {
    nav.sync(state.activeTab);
    drawContent();

    // activeTab/ersPanelOpen/plansPanelOpen together decide what's on screen inside the
    // dashboard, so a change of any of them starts the new view at the top of the page.
    const key = state.plansPanelOpen ? 'plans' : state.ersPanelOpen ? 'ers' : state.activeTab;
    if (key !== scrollKey) {
      scrollKey = key;
      scrollToTop();
    }
  }

  function setState(patch) {
    Object.assign(state, patch);
    draw();
  }

  // --- ERS status (the summary card) -----------------------------------------------------------

  async function fetchErsStatus() {
    try {
      const token = getToken();
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/api/ers/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.attempted) {
        state.ersStatus = {
          attempted: true,
          percentage: data.status.percentage,
          passed: data.status.passed,
          completedOn: data.status.createdAt,
        };
      } else {
        state.ersStatus = { attempted: false, percentage: 0, passed: false, completedOn: null };
      }
      overview.setErsStatus(state.ersStatus);
    } catch (e) {
      console.error('Failed to fetch ERS status', e);
    }
  }

  // --- Krishi Coins counter: counts up to the balance once, easing out ---------------------------

  function animateCoins() {
    const duration = 1100;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      overview.setCoins(Math.round(eased * KRISHI_COINS_BALANCE));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // --- Hero banner: cycles between the intro copy and the scrolling services strip, forever ----

  function scheduleHeroPhase() {
    const duration = state.heroPhase === 'content' ? HERO_CONTENT_DURATION : HERO_SERVICES_DURATION;
    const next = state.heroPhase === 'content' ? 'services' : 'content';
    setTimeout(() => {
      state.heroPhase = next;
      overview.setHeroPhase(next);
      scheduleHeroPhase();
    }, duration);
  }

  overview.setHeroPhase(state.heroPhase);
  overview.setErsStatus(state.ersStatus);
  overview.setCoins(0);
  draw();
  animateCoins();
  fetchErsStatus();
  scheduleHeroPhase();
}
