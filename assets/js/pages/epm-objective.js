// EPM Objective - a static information page (pages/epm-objective.html). Its links (back to EPM, breadcrumb,
// "View Upcoming EPMs") are data-nav attributes wired by initPage; the navbar highlights EPM.
(function () {
  'use strict';

  const { initPage } = FW.require('core/page');

  initPage({ page: 'epm' });
})();
