// "Page Under Construction" placeholder shared by the My Business modules that are still being
// built (React: MyBusinessPlaceholder in App.jsx). Which module is open comes from ?tab=<route id>;
// the sidebar and the navbar highlight it.
import { initPage } from '../core/page.js';
import { getParam } from '../core/router.js';
import { mountMyBusinessSidebar, NAV_ITEMS, PLACEHOLDER_TABS } from '../components/my-business-layout.js';

const requested = getParam('tab');
const tab = PLACEHOLDER_TABS.includes(requested) ? requested : '';

const session = initPage({ page: tab });

if (session) {
  const item = NAV_ITEMS.find((i) => i.route === tab);
  if (item) document.title = `${item.name} | Feed World`;
  mountMyBusinessSidebar(document.getElementById('mb-sidebar'), { currentTab: tab });
}
