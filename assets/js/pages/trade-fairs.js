// Agri Trade Fairs - pick State, Ministry, Year and Month, then "View Trade Fairs" opens the
// selected state's trade-fair listing in a new tab. "International" opens APEDA's trade-fair page.
(function () {
  'use strict';

  const { initPage } = FW.require('core/page');
  const { html, render } = FW.require('core/dom');
  const states = FW.require('data/states-urls').default;

  const session = initPage({ page: 'trade-fairs' });

  if (session) {
    const field = (name) => document.querySelector(`[data-field="${name}"]`);
    const stateSelect = field('state');

    render(stateSelect, html`
    <option value="">Select State</option>
    ${states.map((item) => html`<option value="${item.state}">${item.state}</option>`)}`);

    const handleViewFairs = () => {
      const state = stateSelect.value;
      const ministry = field('ministry').value;
      const year = field('year').value;
      const month = field('month').value;

      if (state === '' || ministry === '' || year === '' || month === '') {
        alert('Please select State, Ministry, Year and Month.');
        return;
      }

      const selectedState = states.find((item) => item.state === state);

      if (selectedState) {
        window.open(selectedState.url, '_blank');
      } else {
        alert('Trade fair URL not available for this state.');
      }
    };

    const handleInternational = () => {
      window.open('https://apeda.gov.in/TradeFairs', '_blank');
    };

    document.querySelector('[data-action="view-fairs"]').addEventListener('click', handleViewFairs);
    document.querySelector('[data-action="international"]').addEventListener('click', handleInternational);
  }
})();
