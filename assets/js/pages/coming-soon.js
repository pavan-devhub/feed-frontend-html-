// "Page Under Construction" placeholder shared by the My Business modules that are still being
// built (React: MyBusinessPlaceholder in App.jsx). Which module is open comes from ?tab=<route id>;
// the sidebar and the navbar highlight it.
(function () {
  'use strict';

  const { initPage } = FW.require('core/page');
  const { getParam } = FW.require('core/router');
  const {
    mountMyBusinessSidebar,
    NAV_ITEMS,
    PLACEHOLDER_TABS,
  } = FW.require('components/my-business-layout');

  const requested = getParam('tab');
  const tab = PLACEHOLDER_TABS.includes(requested) ? requested : '';

  const session = initPage({ page: tab });

  if (session) {
    const item = NAV_ITEMS.find((i) => i.route === tab);
    if (item) document.title = `${item.name} | Feed World`;
    mountMyBusinessSidebar(document.getElementById('mb-sidebar'), { currentTab: tab });
  }
})();
