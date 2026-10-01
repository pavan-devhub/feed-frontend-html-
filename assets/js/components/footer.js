// Site-wide footer, mounted by core/page.js into <div id="site-footer"></div>.
import { html, raw, render } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { assetUrl } from '../core/router.js';

const FACEBOOK_ICON = raw(`<svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>`);
const TWITTER_ICON = raw(`<svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>`);
const LINKEDIN_ICON = raw(`<svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M4.98 3.5c0 1.381-1.11 2.5-2.48 2.5s-2.48-1.119-2.48-2.5c0-1.38 1.11-2.5 2.48-2.5s2.48 1.12 2.48 2.5zm.02 4.5h-5v16h5v-16zm7.982 0h-4.968v16h4.969v-8.399c0-4.67 6.029-5.052 6.029 0v8.399h4.988v-10.131c0-7.88-8.922-7.593-11.018-3.714v-2.155z"/></svg>`);
const INSTAGRAM_ICON = raw(`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>`);
const YOUTUBE_ICON = raw(`<svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`);

const BACKGROUND = raw(`
  <div class="footer-premium-bg" aria-hidden="true">
    <div class="f-mesh-1"></div>
    <div class="f-mesh-2"></div>
    <div class="f-mesh-3"></div>
    <div class="f-ambient-glow"></div>
    <div class="f-newsletter-glow"></div>
    <div class="f-world-map"></div>
    <div class="f-planet-green">
      <div class="f-planet-core"></div>
      <div class="f-planet-ring f-planet-ring-1"></div>
      <div class="f-planet-ring f-planet-ring-2"></div>
    </div>
    <div class="f-planet-orange"></div>
    <svg class="f-leaf-tl" viewBox="0 0 100 100"><path d="M0,0 C50,0 100,50 100,100 C50,100 0,50 0,0 Z" fill="rgba(34,197,94,0.04)" /></svg>
    <svg class="f-leaf-br" viewBox="0 0 100 100"><path d="M100,100 C50,100 0,50 0,0 C50,0 100,50 100,100 Z" fill="rgba(34,197,94,0.04)" /></svg>
    <div class="f-stars">
      <div class="f-star f-star-1"></div><div class="f-star f-star-2"></div><div class="f-star f-star-3"></div><div class="f-star f-star-4"></div>
      <div class="f-star f-star-5"></div><div class="f-star f-star-6"></div><div class="f-star f-star-7"></div><div class="f-star f-star-8"></div>
    </div>
    <div class="f-vignette"></div>
    <svg width="0" height="0">
      <defs>
        <linearGradient id="f-wave-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#2563eb" />
          <stop offset="100%" stop-color="#16a34a" />
        </linearGradient>
        <linearGradient id="f-line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="transparent" />
          <stop offset="50%" stop-color="#38bdf8" />
          <stop offset="100%" stop-color="transparent" />
        </linearGradient>
      </defs>
    </svg>
  </div>`);

const link = (label, className = '') => html`<li><a href="#"${className ? raw(` class="${className}"`) : ''}>${icon('chevron-right', { size: 12 })} ${label}</a></li>`;

export function mountFooter(root) {
  const logo = assetUrl('images/logo.avif');

  render(root, html`
    <footer class="new-footer">
      ${BACKGROUND}
      <div class="footer-container">

        <div class="footer-top-banner">
          <div class="banner-left">
            <div class="banner-logo-placeholder">
              <img src="${logo}" alt="FEED Logo" class="banner-logo" />
            </div>
            <div class="banner-text-content">
              <h2>Together We Empower.<br/><span class="text-green">Together We Grow.</span></h2>
              <p>FEED is a multi-state cooperative society working for the uplift of exports from all corners of <span class="text-green">India</span>.</p>
            </div>
          </div>
          <div class="banner-right">
            <div class="subscribe-card">
              <h3>Stay updated with<br/><span class="text-green">latest insights</span> &amp; opportunities</h3>
              <div class="subscribe-input-group">
                ${icon('mail', { size: 16, className: 'input-icon' })}
                <input type="email" placeholder="Enter your email address" />
                <button type="button" class="subscribe-btn">Subscribe ${icon('send', { size: 12 })}</button>
              </div>
              <p class="privacy-note">${icon('lock', { size: 10 })} We respect your privacy. Unsubscribe at any time.</p>
            </div>
          </div>
        </div>

        <div class="footer-links-section">
          <div class="footer-column">
            <h4 class="column-title"><div class="icon-bg green-bg">${icon('link', { size: 14 })}</div> Quick Links</h4>
            <ul class="footer-list">
              ${['Sitemap', 'Pricing', 'Join us', 'Contact us'].map((l) => link(l))}
            </ul>
            <div class="info-card light-green-card">
              <p>Empowering<br/>Communities.<br/>Strengthening<br/>Exports.</p>
              <div class="card-icon-placeholder globe-sprout"></div>
            </div>
          </div>

          <div class="footer-column">
            <h4 class="column-title"><div class="icon-bg purple-bg">${icon('briefcase', { size: 14 })}</div> Services</h4>
            <ul class="footer-list">
              ${['My Fpo', 'My Farm', 'My Business', 'My Products', 'My Exports', 'My Market', 'My Education', 'My Tools'].map((l) => link(l))}
            </ul>
          </div>

          <div class="footer-column">
            <h4 class="column-title"><div class="icon-bg blue-bg">${icon('bar-chart-2', { size: 14 })}</div> FEED Insights</h4>
            <ul class="footer-list">
              ${['Suggestions', 'Sample works', 'Queries', 'Complaints'].map((l) => link(l))}
            </ul>
            <div class="info-card light-blue-card">
              <div class="card-content-flex">
                <div class="doc-icon-wrapper">${icon('file-text', { size: 18 })}</div>
                <div><p>Insights that inspire.<br/>Knowledge that<br/>creates impact.</p></div>
              </div>
              <a href="#" class="explore-link">Explore Insights &rarr;</a>
            </div>
          </div>

          <div class="footer-column">
            <h4 class="column-title"><div class="icon-bg orange-bg">${icon('headphones', { size: 14 })}</div> Help</h4>
            <ul class="footer-list">
              ${link('FAQs')}
              ${link('Reporting')}
              ${link('Documentation')}
              ${link('Support Policy')}
              ${link('Terms & conditions')}
              ${link('Privacy Policy', 'text-orange')}
              ${link('Disclaimer')}
            </ul>
          </div>

          <div class="footer-column">
            <h4 class="column-title"><div class="icon-bg pink-bg">${icon('users', { size: 14 })}</div> Connect with us</h4>
            <p class="connect-text">Stay connected with our latest insights, services, and opportunities.</p>
            <div class="social-icons-row">
              <a href="#" class="social-circle fb">${FACEBOOK_ICON}</a>
              <a href="#" class="social-circle tw">${TWITTER_ICON}</a>
              <a href="#" class="social-circle li">${LINKEDIN_ICON}</a>
              <a href="#" class="social-circle ig">${INSTAGRAM_ICON}</a>
              <a href="#" class="social-circle yt">${YOUTUBE_ICON}</a>
            </div>
            <div class="info-card green-gradient-card">
              <p><strong>Let's build a<br/>stronger tomorrow,<br/>together.</strong></p>
              <button type="button" class="join-btn">Join FEED Community &rarr;</button>
              <div class="card-bg-image"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="footer-bottom-bar">
        <div class="footer-bottom-container">
          <div class="bottom-left">
            <img src="${logo}" alt="Company Logo" class="bottom-logo" />
            <div class="copyright-text">
              <p>&copy; 2026 FEED Organization.</p>
              <p>All rights reserved.</p>
            </div>
          </div>
          <div class="bottom-right">
            <a href="#" class="bottom-link">${icon('shield-check', { size: 14 })} Privacy Policy</a>
            <span class="divider">|</span>
            <a href="#" class="bottom-link">${icon('file-text', { size: 14 })} Terms &amp; Conditions</a>
            <span class="divider">|</span>
            <a href="#" class="bottom-link">${icon('lock', { size: 14 })} Disclaimer</a>
            <button type="button" class="scroll-top-btn" data-action="scroll-top">
              ${icon('arrow-up', { size: 16, color: '#0f2b3e' })}
            </button>
          </div>
        </div>
      </div>
    </footer>`);

  root.querySelector('[data-action="scroll-top"]').addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}
