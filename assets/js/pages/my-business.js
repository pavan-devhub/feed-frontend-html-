// My Business landing page - the service cards are static markup (pages/my-business.html); the three
// cards that lead somewhere carry data-nav. This script mounts the shared My Business sidebar.
(function () {
  'use strict';

  const { initPage } = FW.require('core/page');
  const { mountMyBusinessSidebar } = FW.require('components/my-business-layout');

  const session = initPage({ page: 'mybusiness' });

  if (session) {
    mountMyBusinessSidebar(document.getElementById('mb-sidebar'), { currentTab: 'mybusiness' });
  }
})();
