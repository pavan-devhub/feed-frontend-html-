// Safe Mission - hero video, Benefits carousel, the connected Journey, testimonials and the
// multi-step join form. The markup is static in pages/safe-mission.html; the components below add
// the scroll reveals, the carousel loop, the testimonial rotation and the form steps.
(function () {
  'use strict';

  const { initPage } = FW.require('core/page');
  const { initBenefits } = FW.require('components/benefits');
  const { initJourney } = FW.require('components/journey');
  const { initSafeMissionTestimonialsJoin } = FW.require('components/safe-mission-testimonials-join');

  const session = initPage({ page: 'safe-mission' });

  if (session) {
    initBenefits(document.querySelector('.benefits-section'));
    initJourney(document.querySelector('.journey-section'));
    initSafeMissionTestimonialsJoin(document.querySelector('.sm-combined-section'));
  }
})();
