// EPM (Export Promotional Meetings) landing page: hero video, info cards, overview stats, the
// "Upcoming EPMs" calendar, the photo carousel, testimonials and the membership actions.
// Each major block slides in from its own direction the first time it scrolls into view.
import { initPage } from '../core/page.js';
import { assetUrl, pageUrl } from '../core/router.js';
import {
  fetchEpmGalleryImages, fetchEpmGalleryImagesByBlock, fetchEpmReviews, fetchEpmStats,
  getEpmGalleryImageUrl, fetchEpmVideo, getEpmVideoUrl,
} from '../api/epm-api.js';
import { observeReveal, createCountUp } from './epm/scroll-effects.js';
import { createGalleryCarousel } from './epm/gallery-carousel.js';
import { mountTestimonials } from './epm/testimonials-slider.js';
import { initUpcomingCalendar } from './epm/upcoming-calendar.js';

const session = initPage({ page: 'epm' });

if (session) {
  // ---- Hero video ----------------------------------------------------------------------------
  // The admin's upload (Admin panel > EPM > Page & Gallery Images), or else the built-in video.
  // Nothing plays until the lookup answers, so the built-in one never starts and then swaps.
  const heroEl = document.getElementById('epm-video-hero');
  const showHeroVideo = (src) => {
    const video = document.createElement('video');
    video.className = 'epm-video-hero-media';
    video.muted = true;
    video.autoplay = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute('aria-hidden', 'true');
    video.src = src;
    heroEl.prepend(video);
  };
  const builtInVideo = assetUrl('videos/vid.mp4');
  fetchEpmVideo()
    .then((video) => showHeroVideo(video ? getEpmVideoUrl(video.videoUrl) : builtInVideo))
    .catch(() => showHeroVideo(builtInVideo));

  // ---- Scroll reveals + overview numbers -----------------------------------------------------
  // The stats start at the site's existing marketing figures (already in the markup) so the card
  // never flashes "0" while the real numbers load; they count up once the card is on screen.
  const conducted = createCountUp(document.getElementById('epm-stat-conducted'), { target: 25, suffix: '+' });
  const districts = createCountUp(document.getElementById('epm-stat-districts'), { target: 10 });
  const participants = createCountUp(document.getElementById('epm-stat-participants'), { target: 500, suffix: '+' });
  const statsCard = document.getElementById('epm-stats-card');

  document.querySelectorAll('.epm-reveal').forEach((el) => {
    observeReveal(el, el === statsCard ? () => {
      conducted.activate();
      districts.activate();
      participants.activate();
    } : undefined);
  });

  fetchEpmStats()
    .then((stats) => {
      if (!stats) return;
      conducted.setTarget(stats.epmsConducted);
      districts.setTarget(stats.districtsCovered);
      participants.setTarget(stats.totalParticipants);
    })
    .catch(() => {});

  // ---- Admin-managed pictures for the page's fixed spots ---------------------------------------
  // Until one is uploaded, each spot keeps its built-in picture from the markup.
  const urlsOf = (data) => (data || []).map((img) => getEpmGalleryImageUrl(img.imageUrl));
  const block = (id) => fetchEpmGalleryImagesByBlock(id).then(urlsOf).catch(() => []);

  Promise.all([block('epm-stats'), block('epm-calendar')]).then(([statImages, calendar]) => {
    document.querySelectorAll('[data-stat-image]').forEach((img) => {
      const src = statImages[Number(img.dataset.statImage)];
      if (src) img.src = src;
    });
    if (calendar[0]) document.getElementById('epm-cal-image').src = calendar[0];
  });

  // ---- Gallery carousel ----------------------------------------------------------------------
  // Its own "epm-carousel" photos when the admin has added any, else the first gallery-page photos.
  const carousel = createGalleryCarousel(document.getElementById('epm-gallery'));
  block('epm-carousel')
    .then((own) => (own.length > 0
      ? own
      : fetchEpmGalleryImages().then((data) => urlsOf(data).slice(0, 8)).catch(() => [])))
    .then((urls) => carousel.setImages(urls));

  // ---- Testimonials --------------------------------------------------------------------------
  // Written by the admin (Admin panel > EPM > Reviews); the card only appears once at least one
  // is published.
  fetchEpmReviews()
    .then((data) => (data || []).map((r) => ({
      id: r.id, text: r.content, authorName: r.authorName, authorRole: r.authorRole, rating: r.rating,
    })))
    .catch(() => [])
    .then((testimonials) => {
      if (testimonials.length === 0) return;
      const card = mountTestimonials(document.getElementById('epm-membership-card'), testimonials);
      observeReveal(card);
    });

  // ---- Upcoming EPMs calendar ----------------------------------------------------------------
  initUpcomingCalendar();

  // ---- Membership: "Explore our services" opens the home page at its services block ----------
  document.getElementById('epm-explore-services').addEventListener('click', () => {
    window.location.assign(`${pageUrl('home')}#services-block`);
  });
}
