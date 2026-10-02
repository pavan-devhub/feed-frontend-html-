// How FEED Works - category tabs above the two explainer videos.
(function () {
  'use strict';

  const { initPage } = FW.require('core/page');
  const { html, on, toElement } = FW.require('core/dom');

  // YouTube refuses to play embedded videos on pages opened straight from disk (file://): it needs
  // the embedding page's web address and gets none, so it shows "Error 153". There each video is
  // shown as its thumbnail with a play button that opens it on YouTube instead. Served over
  // http(s), the normal embedded player stays.
  function useVideoLinksOnFilePages() {
    if (window.location.protocol !== 'file:') return;
    document.querySelectorAll('.hfw-video-wrapper iframe[src*="youtube.com/embed/"]').forEach((frame) => {
      const id = new URL(frame.src).pathname.split('/').pop();
      frame.replaceWith(toElement(html`
        <a class="hfw-video-link" href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener"
          aria-label="Watch ${frame.title} on YouTube">
          <img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" />
          <span class="hfw-video-title">${frame.title}</span>
          <span class="hfw-video-play" aria-hidden="true"></span>
        </a>`));
    });
  }

  const session = initPage({ page: 'how' });

  if (session) {
    useVideoLinksOnFilePages();

    const list = document.getElementById('hfw-categories');
    on(list, 'click', '[data-tab]', (_event, button) => {
      list.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('active', b === button));
    });
  }
})();
