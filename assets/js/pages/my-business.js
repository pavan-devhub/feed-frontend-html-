// My Business landing page - the service cards are static markup (pages/my-business.html); the three
// cards that lead somewhere carry data-nav. This script mounts the shared My Business sidebar.
import { initPage } from '../core/page.js';
import { mountMyBusinessSidebar } from '../components/my-business-layout.js';

const session = initPage({ page: 'mybusiness' });

if (session) {
  mountMyBusinessSidebar(document.getElementById('mb-sidebar'), { currentTab: 'mybusiness' });
}
