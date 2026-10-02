// Business Plan - enquiry form (message character counter) and the two-slide image carousel, which
// flips every 4 seconds and can also be flipped with the arrows or picked with the dots.
(function () {
  'use strict';

  const { initPage } = FW.require('core/page');
  const { on, qsa } = FW.require('core/dom');
  const { mountMyBusinessSidebar } = FW.require('components/my-business-layout');

  const session = initPage({ page: 'business-plan' });

  if (session) {
    mountMyBusinessSidebar(document.getElementById('mb-sidebar'), { currentTab: 'business-plan' });

    // --- Message counter --------------------------------------------------------------------------
    const message = document.getElementById('bp-message');
    const counter = document.getElementById('bp-char-counter');
    const updateCounter = () => {
      counter.textContent = `${message.value.length} / 500`;
    };
    message.addEventListener('input', updateCounter);
    // The browser may restore a typed message on back/forward - keep the counter in step with it.
    updateCounter();

    // --- Carousel ---------------------------------------------------------------------------------
    const state = { currentSlide: 0 };
    const track = document.getElementById('bp-slider-track');
    const dots = qsa('.bp-dot', document.getElementById('bp-carousel-dots'));

    const draw = () => {
      track.style.transform = `translateX(-${state.currentSlide * 100}%)`;
      dots.forEach((dot) => dot.classList.toggle('active', Number(dot.dataset.slide) === state.currentSlide));
    };

    const toggleSlide = () => {
      state.currentSlide = state.currentSlide === 0 ? 1 : 0;
      draw();
    };

    // Change slide every 4 seconds (the timer is not reset by manual navigation, same as before).
    setInterval(toggleSlide, 4000);

    on(document, 'click', '[data-action="toggle-slide"]', toggleSlide);
    on(document.getElementById('bp-carousel-dots'), 'click', '.bp-dot', (_event, dot) => {
      state.currentSlide = Number(dot.dataset.slide);
      draw();
    });
  }
})();
