// Safe Mission - hero video, Benefits carousel, the connected Journey, testimonials and the
// multi-step join form. The markup is static in pages/safe-mission.html; the components below add
// the scroll reveals, the carousel loop, the testimonial rotation and the form steps.
import { initPage } from '../core/page.js';
import { initBenefits } from '../components/benefits.js';
import { initJourney } from '../components/journey.js';
import { initSafeMissionTestimonialsJoin } from '../components/safe-mission-testimonials-join.js';

const session = initPage({ page: 'safe-mission' });

if (session) {
  initBenefits(document.querySelector('.benefits-section'));
  initJourney(document.querySelector('.journey-section'));
  initSafeMissionTestimonialsJoin(document.querySelector('.sm-combined-section'));
}
