// About Us section of the home page (src/pages/AboutUs.jsx) - the markup is static in index.html;
// this only runs the scroll reveal: every .scroll-fade block gets .animate-reveal while it is on
// screen and loses it again when it scrolls away.
(function () {
  'use strict';

  function initAboutUs() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-reveal');
          } else {
            entry.target.classList.remove('animate-reveal');
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );

    document.querySelectorAll('#about-us .scroll-fade').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }

  FW.define('pages/home/about-us', { initAboutUs });
})();
