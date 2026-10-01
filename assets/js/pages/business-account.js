// Business Account - static module dashboard (pages/business-account.html) inside the My Business layout.
import { initPage } from '../core/page.js';
import { mountMyBusinessSidebar } from '../components/my-business-layout.js';

const session = initPage({ page: 'business-account' });

if (session) {
  mountMyBusinessSidebar(document.getElementById('mb-sidebar'), { currentTab: 'business-account' });
}
