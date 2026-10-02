// Home page (index.html) - converted from src/pages/Home.jsx (+ AboutUs.jsx, see home/about-us.js).
// The markup is static in index.html; this script runs the hero image/video slider, the language
// picker, the Services grid (the shared mega-menu tiles, flying in while the block is on screen),
// the Events & Updates image carousel and the small hover effects of the two update lists.
(function () {
  'use strict';

  const { initPage } = FW.require('core/page');
  const { html, render, on, qsa } = FW.require('core/dom');
  const { navigate, assetUrl } = FW.require('core/router');
  const { initI18n, setLanguage, getLanguage } = FW.require('core/i18n');
  const { servicesMegaMenu } = FW.require('components/navbar');
  const { initAboutUs } = FW.require('pages/home/about-us');

  // Services grid tiles that open a page (the other tiles are inert, as on the React home page).
  const SERVICE_ROUTES = {
    'PRODUCT 360': 'product360',
    'MY EXPORTS': 'exports',
    'MY TOOLS': 'tools',
    'MY BUSINESS': 'mybusiness',
  };

  const SERVICE_ANIMATIONS = ['flyInLeft', 'flyInTop', 'flyInBottom', 'flyInRight'];

  const IMAGE_SLIDE_MS = 4000; // hero: time on the image before the video plays
  const EVENTS_SLIDE_MS = 5000; // events carousel: auto-advance interval

  const session = initPage({ page: 'home' });

  if (session) {
    initLanguagePicker();
    initHeroSlider();
    initAboutUs();
    initServicesGrid();
    initEventsSlider();
    initUpdateListHovers();
  }

  // --- Language selector (top right of the hero) ------------------------------------------------

  function initLanguagePicker() {
    const select = document.getElementById('home-language-select');
    initI18n().then((lang) => {
      select.value = lang;
    });
    select.addEventListener('change', (event) => {
      setLanguage(event.target.value).then(() => {
        select.value = getLanguage();
      });
    });
  }

  // --- Hero slider: image for 4s, then the video, back to the image when the video ends ---------

  function initHeroSlider() {
    const track = document.getElementById('home-hero-track');
    const video = document.getElementById('home-hero-video');
    let timer = null;

    const showSlide = (index) => {
      clearTimeout(timer);
      track.style.transform = `translateX(-${index * 100}vw)`;
      if (index === 0) {
        timer = setTimeout(() => showSlide(1), IMAGE_SLIDE_MS);
      } else if (index === 1) {
        // Ensure video plays from start
        video.currentTime = 0;
        video.play().catch((e) => console.log('Autoplay prevented', e));
      }
    };

    video.addEventListener('ended', () => showSlide(0));
    showSlide(0);
  }

  // --- Services (ecosystem) grid ----------------------------------------------------------------

  function initServicesGrid() {
    const block = document.getElementById('services-block');
    const grid = document.getElementById('home-services-grid');

    const animationFor = (index, visible) => (visible
      ? `${SERVICE_ANIMATIONS[index % 4]} 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 0.05}s forwards`
      : 'none');

    render(grid, html`${servicesMegaMenu.map((service, sIdx) => html`
    <div class="srv-card service-btn-animated" data-name="${service.name}"
      style="animation: ${animationFor(sIdx, false)};${SERVICE_ROUTES[service.name] ? ' cursor: pointer;' : ''}">
      <div class="srv-card-badge color-${service.color}">${service.num}</div>
      <div class="srv-card-content">
        <div class="srv-icon-circle color-${service.color}">
          <img src="${assetUrl(service.img)}" alt="${service.name}" class="srv-card-image" />
        </div>
        <div class="srv-card-text-area">
          <h3>${service.name}</h3>
        </div>
      </div>
    </div>`)}`);

    on(grid, 'click', '.srv-card', (_event, card) => {
      const page = SERVICE_ROUTES[card.dataset.name];
      if (page) navigate(page);
    });

    // The tiles fly in each time the block scrolls into view (and reset when it leaves).
    let visible = false;
    const cards = qsa('.srv-card', grid);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting === visible) return;
        visible = entry.isIntersecting;
        cards.forEach((card, index) => {
          card.style.animation = animationFor(index, visible);
        });
      },
      { threshold: 0.2 },
    );
    observer.observe(block);
  }

  // --- Events & Updates: image carousel ---------------------------------------------------------

  function initEventsSlider() {
    const slider = document.getElementById('home-events-slider');
    const slides = qsa('[data-role="events-slide"]', slider);
    const dots = qsa('[data-role="events-dot"]', slider);
    const count = slides.length;
    let current = 0;

    const show = (index) => {
      current = index;
      slides.forEach((slide, i) => {
        slide.style.opacity = i === current ? '1' : '0';
        slide.style.zIndex = i === current ? '1' : '0';
      });
      dots.forEach((dot, i) => {
        dot.style.width = i === current ? '24px' : '8px';
        dot.style.backgroundColor = i === current ? '#fff' : 'rgba(255,255,255,0.5)';
      });
    };

    // Auto-advance; like the React page, manual navigation does not restart the interval.
    setInterval(() => show((current + 1) % count), EVENTS_SLIDE_MS);

    on(slider, 'click', '[data-role="events-prev"]', () => show(current === 0 ? count - 1 : current - 1));
    on(slider, 'click', '[data-role="events-next"]', () => show((current + 1) % count));
    on(slider, 'click', '[data-role="events-dot"]', (_event, dot) => show(Number(dot.dataset.index)));
  }

  // --- Events & Updates: hover colours of the "Read More" pills and the FEED Services arrows ----

  function initUpdateListHovers() {
    const section = document.getElementById('events-updates');

    on(section, 'mouseover', '[data-role="read-more"]', (_event, link) => {
      link.style.background = '#dbeafe';
    });
    on(section, 'mouseout', '[data-role="read-more"]', (_event, link) => {
      link.style.background = '#eff6ff';
    });

    on(section, 'mouseover', '[data-role="feed-service-btn"]', (_event, button) => {
      button.style.backgroundColor = '#16a34a';
      if (button.children[0]) button.children[0].style.color = '#fff';
    });
    on(section, 'mouseout', '[data-role="feed-service-btn"]', (_event, button) => {
      button.style.backgroundColor = '#f1f5f9';
      if (button.children[0]) button.children[0].style.color = '#166534';
    });
  }
})();
