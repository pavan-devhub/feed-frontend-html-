// Country Selection view of the exports page: search box filtering the country tiles by name, and
// the region pills (they only highlight - the list is filtered by name alone).
import { html, on, toElement } from '../../core/dom.js';
import { icon } from '../../core/icons.js';

const countries = [
  { name: 'Algeria', code: 'dz' },
  { name: 'Angola', code: 'ao' },
  { name: 'Argentina', code: 'ar' },
  { name: 'Australia', code: 'au' },
  { name: 'Bangladesh', code: 'bd' },
  { name: 'Belgium', code: 'be' },
  { name: 'Brazil', code: 'br' },
  { name: 'Canada', code: 'ca' },
  { name: 'China', code: 'cn' },
  { name: 'Egypt', code: 'eg' },
  { name: 'France', code: 'fr' },
  { name: 'Germany', code: 'de' },
  { name: 'Ghana', code: 'gh' },
  { name: 'Hong Kong', code: 'hk' },
  { name: 'Indonesia', code: 'id' },
  { name: 'Iran', code: 'ir' },
  { name: 'Iraq', code: 'iq' },
  { name: 'Israel', code: 'il' },
  { name: 'Italy', code: 'it' },
  { name: 'Japan', code: 'jp' },
  { name: 'Kazakhstan', code: 'kz' },
  { name: 'Kuwait', code: 'kw' },
  { name: 'Malaysia', code: 'my' },
  { name: 'Mexico', code: 'mx' },
  { name: 'Mozambique', code: 'mz' },
  { name: 'Nepal', code: 'np' },
  { name: 'Netherlands', code: 'nl' },
  { name: 'Nigeria', code: 'ng' },
  { name: 'Oman', code: 'om' },
  { name: 'Pakistan', code: 'pk' },
  { name: 'Poland', code: 'pl' },
  { name: 'Qatar', code: 'qa' },
  { name: 'Russia', code: 'ru' },
  { name: 'Saudi Arabia', code: 'sa' },
  { name: 'Singapore', code: 'sg' },
  { name: 'South Africa', code: 'za' },
  { name: 'South Korea', code: 'kr' },
  { name: 'Spain', code: 'es' },
  { name: 'Sri Lanka', code: 'lk' },
  { name: 'Switzerland', code: 'ch' },
  { name: 'Taiwan', code: 'tw' },
  { name: 'Tanzania', code: 'tz' },
  { name: 'Thailand', code: 'th' },
  { name: 'Turkey', code: 'tr' },
  { name: 'UAE', code: 'ae' },
  { name: 'Ukraine', code: 'ua' },
  { name: 'United Kingdom', code: 'gb' },
  { name: 'USA', code: 'us' },
  { name: 'Venezuela', code: 've' },
  { name: 'Vietnam', code: 'vn' },
];

const tileHtml = (country) => html`
  <div class="cs-country-tile">
    <div class="cs-tile-header">
      <div class="cs-flag-circle">
        <img src="${`https://flagcdn.com/w320/${country.code}.png`}" alt="${country.name}" class="cs-flag-img" />
      </div>
      <span class="cs-country-code">${country.code.toUpperCase()}</span>
    </div>
    <div class="cs-tile-body">
      <h3 class="cs-country-name">${country.name}</h3>
      <div class="cs-explore-link">
        <span>Explore Market</span>
        ${icon('arrow-right', { size: 16, className: 'cs-explore-arrow' })}
      </div>
    </div>
  </div>`;

export function mountCountrySelection(view) {
  const state = {
    activeCategory: 'ALL COUNTRIES',
    searchQuery: '',
  };

  const input = view.querySelector('.cs-search-input');
  const pills = view.querySelector('.cs-filter-scroll');
  const count = view.querySelector('.cs-country-count');
  const grid = view.querySelector('.cs-country-grid');

  // One tile element per country, reused across searches (like React's keyed list) so the flags
  // aren't reloaded on every keystroke.
  const tiles = new Map(countries.map((country) => [country.code, toElement(tileHtml(country))]));
  let noResults = null;

  const draw = () => {
    const query = state.searchQuery.toLowerCase();
    const filteredCountries = countries.filter((country) => country.name.toLowerCase().includes(query));

    pills.querySelectorAll('.cs-filter-pill').forEach((pill) => {
      pill.classList.toggle('active', pill.dataset.category === state.activeCategory);
    });
    count.textContent = `Explore ${filteredCountries.length} Countries`;
    grid.replaceChildren(...filteredCountries.map((country) => tiles.get(country.code)));

    if (filteredCountries.length === 0 && !noResults) {
      noResults = toElement(html`<div class="cs-no-results"><p>No countries found matching your search.</p></div>`);
      grid.after(noResults);
    } else if (filteredCountries.length > 0 && noResults) {
      noResults.remove();
      noResults = null;
    }
  };

  input.addEventListener('input', () => {
    state.searchQuery = input.value;
    draw();
  });

  on(pills, 'click', '.cs-filter-pill', (_event, pill) => {
    state.activeCategory = pill.dataset.category;
    draw();
  });

  draw();
}
