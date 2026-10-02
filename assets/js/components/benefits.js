// Benefits section of the Safe Mission page (markup in pages/safe-mission.html). Adds
// benefits-in-view when the section scrolls in (cards fade up), and runs the endless card
// carousel: the track is duplicated, then scrolled 0.7px per frame and wrapped back by half its
// width, pausing while hovered or for 500ms after a touch.
//
//   initBenefits(document.querySelector('.benefits-section'));
(function () {
  'use strict';

  function initBenefits(section) {
    if (!section) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        section.classList.add('benefits-in-view');
        observer.disconnect();
      }
    }, { threshold: 0.12 });
    observer.observe(section);

    const wrapper = section.querySelector('.benefits-carousel-wrapper');
    const carousel = wrapper.querySelector('.benefits-carousel');

    // Second copy of the track for the seamless loop - hidden from assistive tech, with its own
    // gradient id for the connector line.
    const track = carousel.querySelector('.carousel-track');
    const copy = track.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    copy.querySelectorAll('.benefit-card').forEach((card) => card.setAttribute('aria-hidden', 'true'));
    copy.querySelector('linearGradient').id = 'connector-gradient-2';
    copy.querySelector('.benefits-connector path').setAttribute('stroke', 'url(#connector-gradient-2)');
    carousel.appendChild(copy);

    let isHovered = false;
    let isDragging = false;

    const scroll = () => {
      if (!isHovered && !isDragging) {
        wrapper.scrollLeft += 0.7;
        if (wrapper.scrollLeft >= wrapper.scrollWidth / 2) {
          wrapper.scrollLeft -= wrapper.scrollWidth / 2;
        }
      }
      requestAnimationFrame(scroll);
    };
    requestAnimationFrame(scroll);

    wrapper.addEventListener('mouseenter', () => { isHovered = true; });
    wrapper.addEventListener('mouseleave', () => { isHovered = false; });
    wrapper.addEventListener('touchstart', () => { isDragging = true; }, { passive: true });
    wrapper.addEventListener('touchend', () => setTimeout(() => { isDragging = false; }, 500));
  }

  FW.define('components/benefits', { initBenefits });
})();
