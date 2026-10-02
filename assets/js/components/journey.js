// "One connected journey" section of the Safe Mission page (markup in pages/safe-mission.html).
// Each step gets a staggered --stagger delay and fades up (animate-reveal) as it scrolls in.
//
//   initJourney(document.querySelector('.journey-section'));
(function () {
  'use strict';

  function initJourney(section) {
    if (!section) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-reveal');
        }
      });
    }, { threshold: 0.1 });

    section.querySelectorAll('.journey-step').forEach((step, index) => {
      step.style.setProperty('--stagger', `${index * 0.15}s`);
      observer.observe(step);
    });
  }

  FW.define('components/journey', { initJourney });
})();
