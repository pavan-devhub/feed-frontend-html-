// Contact Us (pages/contact.html) - converted from src/pages/ContactUs.jsx.
// The markup is static; this script resolves the branch office address from the map coordinates
// (OpenStreetMap reverse geocoding) and handles the "Get in Touch" form, which - as in the React
// page - is not sent anywhere: it shows a thank-you note and clears the fields.
import { initPage } from '../core/page.js';
import { toElement, html } from '../core/dom.js';

const MAP_EMBED_URL = 'https://www.google.com/maps?q=16.5388453,80.634379&z=17&output=embed';

const session = initPage({ page: 'contact' });

if (session) {
  loadAddress();
  initContactForm();
}

function loadAddress() {
  const addressEl = document.getElementById('contact-address');
  const setAddress = (text) => {
    addressEl.textContent = text;
  };

  const match = MAP_EMBED_URL.match(/q=([0-9.]+),([0-9.]+)/);
  if (!match) return;
  const lat = match[1];
  const lon = match[2];
  fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
    .then((res) => res.json())
    .then((data) => {
      if (data && data.display_name) {
        setAddress(data.display_name);
      } else {
        setAddress('Address could not be resolved from coordinates.');
      }
    })
    .catch((err) => {
      console.error('Geocoding failed:', err);
      setAddress('Address could not be fetched (Network Error).');
    });
}

function initContactForm() {
  const form = document.getElementById('contact-form');
  const privacyNote = form.parentElement.querySelector('.privacy-note');

  // The browser's own required-field validation runs before this (same as the React form).
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.parentElement.querySelector('.form-success')) {
      privacyNote.after(toElement(html`<p class="form-success">Thanks! Your message has been received.</p>`));
    }
    form.reset();
  });
}
