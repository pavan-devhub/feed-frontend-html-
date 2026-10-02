// AGM & Board - static governance modules (pages/agm-board.html) inside the My Business layout.
(function () {
  'use strict';

  const { initPage } = FW.require('core/page');
  const { mountMyBusinessSidebar } = FW.require('components/my-business-layout');

  const session = initPage({ page: 'agm-board' });

  if (session) {
    mountMyBusinessSidebar(document.getElementById('mb-sidebar'), { currentTab: 'agm-board' });
  }
})();
