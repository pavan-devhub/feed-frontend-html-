// Single EPM event page (placeholder) - shows the event id from ?eventId= and links back to the
// EPM directory.
import { initPage } from '../core/page.js';
import { getParam } from '../core/router.js';

const session = initPage({ page: 'epm-event-details' });

if (session) {
  document.getElementById('epm-event-id').textContent = `Details for event ID: ${getParam('eventId') ?? ''}`;
}
