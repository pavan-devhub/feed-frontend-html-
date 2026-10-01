// My Tools (Tools & Services) - welcome header + tool cards. Choosing My FPO, Farmer, MSME or
// Exports swaps the cards for that workspace hub in-page (no reload); the hub's sidebar switches
// between hubs the same way. Student links to the home page (data-nav in the HTML).
import { initPage } from '../core/page.js';
import { onUserChange } from '../core/auth.js';
import { on } from '../core/dom.js';
import { mountMyFpoServiceHub } from '../components/my-fpo-service-hub.js';
import { mountFarmerHub } from '../components/farmer-hub.js';
import { mountMsmeServiceHub } from '../components/msme-service-hub.js';
import { mountExportsHub } from '../components/exports-hub.js';

const HUBS = {
  fpo: mountMyFpoServiceHub,
  farmer: mountFarmerHub,
  msme: mountMsmeServiceHub,
  exports: mountExportsHub,
};

const displayName = (user) => (user?.firstName
  ? `${user.firstName} ${user.lastName || ''}`.trim()
  : 'Valued Guest');

const session = initPage({ page: 'tools' });

if (session) {
  window.scrollTo(0, 0);

  const main = document.querySelector('.tools-main-section');

  // "Welcome back, <name>" - the name is the h1's leading text node, before the leaf decoration.
  const nameEl = main.querySelector('.tools-welcome-name');
  const showName = (user) => {
    if (nameEl.isConnected) nameEl.firstChild.nodeValue = displayName(user);
  };
  showName(session.user);
  onUserChange(showName);

  // Once a workspace is chosen the welcome header and cards are replaced by a wrapper holding the
  // hub; switching hubs re-renders inside that wrapper and scrolls it into view.
  let hubWrapper = null;
  const selectTool = (id) => {
    if (!hubWrapper) {
      hubWrapper = document.createElement('div');
      hubWrapper.style.width = '100%';
      main.replaceChildren(hubWrapper);
    }
    HUBS[id](hubWrapper, { onSelectTool: selectTool });
    hubWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  on(main, 'click', '.tool-card[data-tool]', (_event, card) => selectTool(card.dataset.tool));
}
