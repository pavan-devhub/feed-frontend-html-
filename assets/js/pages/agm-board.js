// AGM & Board - static governance modules (pages/agm-board.html) inside the My Business layout.
import { initPage } from '../core/page.js';
import { mountMyBusinessSidebar } from '../components/my-business-layout.js';

const session = initPage({ page: 'agm-board' });

if (session) {
  mountMyBusinessSidebar(document.getElementById('mb-sidebar'), { currentTab: 'agm-board' });
}
