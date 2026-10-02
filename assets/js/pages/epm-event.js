// Single EPM event page (placeholder) - shows the event id from ?eventId= and links back to the
// EPM directory.
(function () {
  'use strict';

  const { initPage } = FW.require('core/page');
  const { getParam } = FW.require('core/router');

  const session = initPage({ page: 'epm-event-details' });

  if (session) {
    document.getElementById('epm-event-id').textContent = `Details for event ID: ${getParam('eventId') ?? ''}`;
  }
})();
