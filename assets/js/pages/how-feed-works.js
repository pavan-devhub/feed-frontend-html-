// How FEED Works - category tabs above the two explainer videos.
import { initPage } from '../core/page.js';
import { on } from '../core/dom.js';

const session = initPage({ page: 'how' });

if (session) {
  const list = document.getElementById('hfw-categories');
  on(list, 'click', '[data-tab]', (_event, button) => {
    list.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('active', b === button));
  });
}
