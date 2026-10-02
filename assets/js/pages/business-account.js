// Business Account - static module dashboard (pages/business-account.html) inside the My Business layout.
(function () {
  'use strict';

  const { initPage } = FW.require('core/page');
  const { mountMyBusinessSidebar } = FW.require('components/my-business-layout');

  const session = initPage({ page: 'business-account' });

  if (session) {
    mountMyBusinessSidebar(document.getElementById('mb-sidebar'), { currentTab: 'business-account' });
  }
})();
