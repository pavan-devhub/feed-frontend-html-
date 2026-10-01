// EPM Gallery - second level: one state's district cards (pages/epm-gallery-state.html?state=<id>).
// Clicking a card opens that district's album (epm-gallery-district). The districts are managed in
// the admin panel (Page & Gallery Images > States & districts) - see EpmGalleryRegionService.
import { initPage } from '../core/page.js';
import { getParam } from '../core/router.js';
import { html, render, on, toElement } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { fetchEpmGalleryState, fetchEpmGalleryStates, getEpmGalleryImageUrl } from '../api/epm-api.js';
import { fadeImage, initFadeImages } from '../components/fade-image.js';
import {
  galleryHeroHtml, galleryHeroFootHtml, galleryHeroSkeletonHtml, initGalleryHero,
} from '../components/gallery-hero.js';
import { districtCardHtml, districtCardSkeletonHtml, updateDistrictCard } from '../components/district-card.js';
import { initReveal, syncRevealList } from '../components/reveal.js';
import {
  navAttrs, nextEpmCardHtml, sectionHeadingHtml, statusMessageHtml,
} from '../components/gallery-primitives.js';
import {
  countMeetingsBy, loadEpmMeetings, placeKey, plural, summariseMeetings,
} from '../components/gallery-utils.js';

const session = initPage({ page: 'epm' });

if (session) {
  const stateId = getParam('state');
  const main = document.querySelector('.epg-main');

  const state = {
    region: null,
    status: stateId ? 'loading' : 'error',
    query: '',
    // The other states, offered at the end of the page. Optional - on failure the row is left out.
    otherStates: [],
    // This state's EPM meetings (counts + the "next EPM" card) - null until loaded.
    stateMeetings: null,
  };
  let request = 0;
  let meetingsFor = null; // the state name the loaded/loading meetings belong to
  let districtsList = null; // the <ul> of district cards while it is on the page

  const allDistricts = () => state.region?.districts || [];
  const meetingsSummary = () => (state.stateMeetings ? summariseMeetings(state.stateMeetings) : null);

  // --- hero ----------------------------------------------------------------------------------------

  const heroStats = () => {
    const { region } = state;
    const meetings = meetingsSummary();
    return [
      { label: plural(region.districtCount, 'District'), value: region.districtCount },
      { label: plural(region.photoCount, 'Photograph'), value: region.photoCount },
      meetings?.held > 0 && { label: plural(meetings.held, 'EPM held', 'EPMs held'), value: meetings.held },
      meetings?.upcoming > 0 && { label: 'Upcoming', value: meetings.upcoming },
    ];
  };

  const heroAside = () => {
    const meetings = meetingsSummary();
    return meetings?.next && nextEpmCardHtml({ event: meetings.next, place: state.region.name });
  };

  // --- districts -----------------------------------------------------------------------------------

  const districtsSection = () => main.querySelector('section[aria-labelledby="epg-districts-title"]');

  // The result note and the cards (or the "no match" / "no districts" message) under the heading.
  const drawDistricts = () => {
    const section = districtsSection();
    if (!section) return;
    const all = allDistricts();
    const trimmedQuery = state.query.trim();
    const q = trimmedQuery.toLowerCase();
    const districts = q ? all.filter((d) => d.name.toLowerCase().includes(q)) : all;

    const note = section.querySelector('.epg-result-note');
    note.textContent = trimmedQuery && districts.length > 0
      ? `Showing ${districts.length} of ${all.length} districts`
      : '';

    const content = note.nextElementSibling;
    if (districts.length === 0) {
      districtsList = null;
      const message = toElement(statusMessageHtml({
        icon: trimmedQuery ? 'search' : 'image-off',
        title: trimmedQuery ? `No district matches “${trimmedQuery}”` : 'No districts yet',
        text: trimmedQuery ? 'Check the spelling, or clear the search to see every district.' : undefined,
        children: trimmedQuery && html`
          <button type="button" class="epg-btn epg-btn-secondary" data-action="clear-search">
            Clear search
          </button>`,
      }));
      if (content) content.replaceWith(message);
      else section.appendChild(message);
      return;
    }

    if (!districtsList) {
      districtsList = document.createElement('ul');
      districtsList.className = 'epg-district-grid';
      if (content) content.replaceWith(districtsList);
      else section.appendChild(districtsList);
    }
    const counts = countMeetingsBy(state.stateMeetings, 'district');
    const meetingsOf = (d) => counts.get(placeKey(d.name)) || 0;
    syncRevealList(districtsList, districts, {
      key: (d) => d.id,
      delay: (d, i) => Math.min(i, 8) * 60,
      render: (d) => districtCardHtml({
        district: d, index: all.indexOf(d), meetings: meetingsOf(d), stateId: state.region.id,
      }),
      update: (li, d) => updateDistrictCard(li.firstElementChild, { district: d, meetings: meetingsOf(d) }),
    });
    initFadeImages(districtsList);
  };

  // --- other states --------------------------------------------------------------------------------

  const otherStatesTitle = () => (state.otherStates.length > 0 ? 'Other states' : 'The full gallery');

  const stateLinkHtml = (s) => html`
    <button type="button" class="epg-state-link" ${navAttrs('epm-gallery-state', { state: s.id })}>
      <span class="epg-state-link-media">${fadeImage({
        src: getEpmGalleryImageUrl(s.coverUrl), alt: '', attrs: 'loading="lazy" decoding="async"',
      })}</span>
      <span class="epg-state-link-text">
        <span class="epg-state-link-name">${s.name}</span>
        <span class="epg-state-link-meta">${s.districtCount} ${plural(s.districtCount, 'district')} · ${s.photoCount} ${plural(s.photoCount, 'photograph')}</span>
      </span>
      <span class="epg-state-link-go" aria-hidden="true">${icon('arrow-right', { size: 18 })}</span>
    </button>`;

  // The row of other states (or the note pointing back to the gallery) under its heading.
  const drawOtherStates = () => {
    const section = main.querySelector('section[aria-labelledby="epg-other-states-title"]');
    if (!section) return;
    const container = section.querySelector('.epg-container');
    container.querySelector('#epg-other-states-title').textContent = otherStatesTitle();
    const content = container.querySelector('.epg-section-head').nextElementSibling;
    const { otherStates } = state;
    if (otherStates.length === 0) {
      if (!content?.matches('p.epg-section-desc')) {
        const note = toElement(html`
          <p class="epg-section-desc">
            Return to the EPM Gallery for every state, and for photographs of the meetings by theme.
          </p>`);
        if (content) content.replaceWith(note);
        else container.appendChild(note);
      }
      return;
    }
    let list = content?.matches('ul.epg-state-links') ? content : null;
    if (!list) {
      list = toElement(html`<ul class="epg-state-links"></ul>`);
      if (content) content.replaceWith(list);
      else container.appendChild(list);
    }
    syncRevealList(list, otherStates, {
      key: (s) => s.id,
      delay: (s, i) => i * 70,
      render: stateLinkHtml,
    });
    initFadeImages(list);
  };

  // --- whole page per status -----------------------------------------------------------------------

  const errorHtml = () => html`
    <div class="epg-container">
      ${statusMessageHtml({
        icon: 'image-off',
        headingLevel: 'h1',
        title: "We couldn't open this gallery",
        text: "It may have moved, or the server can't be reached right now.",
        children: html`
          ${stateId && html`
            <button type="button" class="epg-btn epg-btn-primary" data-action="retry">
              ${icon('refresh-cw', { size: 16 })} Try again
            </button>`}
          <button type="button" class="epg-btn epg-btn-secondary" ${navAttrs('epm-gallery')}>
            ${icon('arrow-left', { size: 16, className: 'epg-nudge-left' })} Back to the gallery
          </button>`,
      })}
    </div>`;

  const loadingHtml = () => html`
    <div aria-busy="true" aria-label="Loading districts">
      ${galleryHeroSkeletonHtml()}
      <section class="epg-section epg-section-lead epg-container">
        <ul class="epg-district-grid">
          ${Array.from({ length: 8 }, () => html`<li>${districtCardSkeletonHtml()}</li>`)}
        </ul>
      </section>
    </div>`;

  const readyHtml = () => {
    const { region } = state;
    return html`
      ${galleryHeroHtml({
        image: getEpmGalleryImageUrl(region.coverUrl),
        crumbs: [
          { label: 'EPM', nav: 'epm' },
          { label: 'Gallery', nav: 'epm-gallery' },
          { label: region.name },
        ],
        eyebrow: 'State gallery',
        title: region.name,
        lead: `Export Promotional Meetings across ${region.name}, told through photographs from each district. Choose a district to open its album.`,
        stats: heroStats(),
        aside: heroAside(),
      })}

      <section class="epg-section epg-section-lead epg-container" aria-labelledby="epg-districts-title">
        ${sectionHeadingHtml({
          id: 'epg-districts-title',
          eyebrow: 'Districts',
          title: 'Choose a district',
          description: `${region.districtCount} ${plural(region.districtCount, 'district')} in ${region.name}, each with its own album from the meetings held there.`,
          children: allDistricts().length > 1 && html`
            <label class="epg-search">
              ${icon('search', { size: 18 })}
              <input type="search" value="${state.query}" placeholder="Search districts" aria-label="Search districts" />
            </label>`,
        })}

        <p class="epg-result-note" aria-live="polite"></p>
      </section>

      <section class="epg-section epg-band" aria-labelledby="epg-other-states-title">
        <div class="epg-container">
          ${sectionHeadingHtml({
            id: 'epg-other-states-title',
            eyebrow: 'Continue exploring',
            title: otherStatesTitle(),
            children: html`
              <button type="button" class="epg-link" ${navAttrs('epm-gallery')}>
                Back to the gallery ${icon('arrow-right', { size: 16 })}
              </button>`,
          })}
        </div>
      </section>`;
  };

  const draw = () => {
    districtsList = null;
    if (state.status === 'error') {
      render(main, errorHtml());
    } else if (state.status === 'loading') {
      render(main, loadingHtml());
    } else if (state.status === 'ready' && state.region) {
      render(main, readyHtml());
      initGalleryHero(main);
      drawDistricts();
      drawOtherStates();
      initReveal(main);
    } else {
      render(main, '');
    }
  };

  // --- data ----------------------------------------------------------------------------------------

  // This state's meetings, fetched once its name is known (and again only if the name changes).
  const ensureMeetings = () => {
    const name = state.region?.name;
    if (!name || name === meetingsFor) return;
    meetingsFor = name;
    state.stateMeetings = null;
    loadEpmMeetings({ state: name }).then((events) => {
      if (meetingsFor !== name) return;
      state.stateMeetings = events;
      if (state.status !== 'ready' || !state.region) return;
      const foot = main.querySelector('.epg-hero-foot');
      if (foot) render(foot, galleryHeroFootHtml({ stats: heroStats(), aside: heroAside() }));
      drawDistricts();
    });
  };

  const loadRegion = () => {
    const id = ++request;
    state.status = 'loading';
    draw();
    fetchEpmGalleryState(stateId)
      .then((data) => {
        if (id !== request) return;
        state.region = data;
        state.status = 'ready';
        draw();
        ensureMeetings();
      })
      .catch(() => {
        if (id !== request) return;
        state.status = 'error';
        draw();
      });
  };

  // --- events --------------------------------------------------------------------------------------

  on(main, 'click', '[data-action="retry"]', () => loadRegion());

  on(main, 'input', '.epg-search input', (_event, input) => {
    state.query = input.value;
    drawDistricts();
  });

  on(main, 'click', '[data-action="clear-search"]', () => {
    state.query = '';
    const input = main.querySelector('.epg-search input');
    if (input) input.value = '';
    drawDistricts();
  });

  // --- start ---------------------------------------------------------------------------------------

  if (stateId) loadRegion();
  else draw();

  fetchEpmGalleryStates()
    .then((data) => {
      state.otherStates = (data || []).filter((s) => s.id !== stateId);
      drawOtherStates();
    })
    .catch(() => {
      state.otherStates = [];
      drawOtherStates();
    });
}
