// EPM Gallery - the landing page of the gallery journey (gallery -> state -> district): intro with a
// photo collage and the programme's numbers, one card per gallery state, the programme statement,
// and the photo themes (one tab per image block) with the full-screen viewer.
//
// Each photo section is one image block managed from the admin panel (Page & Gallery Images - see
// EpmGalleryBlock on the backend): the database holds each photo's name, caption and order, and the
// server streams the file itself. The `epm-gallery` block is the page's own imagery - its first
// three photos sit beside the intro text.
import { initPage } from '../core/page.js';
import { html, render, on, cx, toElement } from '../core/dom.js';
import { icon } from '../core/icons.js';
import {
  fetchEpmGalleryImagesByBlock,
  fetchEpmGalleryStates,
  fetchEpmStats,
  getEpmGalleryImageUrl,
} from '../api/epm-api.js';
import { fadeImage, initFadeImages } from '../components/fade-image.js';
import { openPhotoLightbox } from '../components/photo-lightbox.js';
import { editorialGridHtml, onEditorialGridOpen } from '../components/editorial-grid.js';
import { initReveal, syncRevealList } from '../components/reveal.js';
import {
  navAttrs, sectionHeadingHtml, statsItemsHtml, statsHtml, statusMessageHtml,
} from '../components/gallery-primitives.js';
import {
  countMeetingsBy, loadEpmMeetings, pad2, placeKey, plural,
} from '../components/gallery-utils.js';

const INTRO_BLOCK = 'epm-gallery';
const STORY_BLOCKS = [
  { id: 'epm-moments', label: 'Moments', title: 'EPM Moments', description: 'Scenes from meetings that bring exporters and industry participants together.' },
  { id: 'epm-across-cities', label: 'Across cities', title: 'EPM Across Cities', description: 'Meetings held in towns and cities across the country.' },
  { id: 'inside-the-epm', label: 'Inside the EPM', title: 'Inside the EPM', description: 'The stage, the sessions and the work that goes into every meeting.' },
  { id: 'people-at-epm', label: 'People', title: 'People at EPM', description: 'Speakers, exporters, buyers, delegates and the FEED team.' },
  { id: 'connections-at-epm', label: 'Connections', title: 'Connections at EPM', description: 'The conversations and partnerships that begin at the meetings.' },
  { id: 'event-details', label: 'Event details', title: 'Event Details', description: 'The smaller details that make up each meeting.' },
  { id: 'the-epm-experience', label: 'The experience', title: 'The EPM Experience', description: 'The EPM experience, from arrival to the closing session.' },
];

// A block photo as the viewer and grid expect it; captions and places come from the upload.
function toPhoto(img, block) {
  const place = [img.city, img.state].filter(Boolean).join(', ');
  return {
    id: img.id,
    src: getEpmGalleryImageUrl(img.imageUrl),
    alt: img.caption || `${block.title} photograph`,
    caption: [img.caption, place].filter(Boolean).join(' - ') || undefined,
  };
}

// --- State card ------------------------------------------------------------------------------------
// A state's entry point: cover photograph with a peek at its districts, the state's numbers, and the
// call to explore. The whole card is one button.

function stateCardSummary(state, meetings) {
  return [
    `${state.districtCount} ${plural(state.districtCount, 'district')}`,
    `${state.photoCount} ${plural(state.photoCount, 'photograph')}`,
    meetings > 0 && `${meetings} ${plural(meetings, 'EPM')}`,
  ].filter(Boolean).join(', ');
}

function stateCardStatsHtml(state, meetings) {
  return html`<span><strong>${state.districtCount}</strong>${plural(state.districtCount, 'District')}</span><span><strong>${state.photoCount}</strong>${plural(state.photoCount, 'Photograph')}</span>${meetings > 0
    && html`<span><strong>${meetings}</strong>${plural(meetings, 'EPM')}</span>`}`;
}

function stateCardHtml({ state, index, meetings }) {
  const preview = (state.districts || []).slice(0, 3);
  const more = state.districtCount - preview.length;
  const names = preview.map((d) => d.name).join(', ');

  return html`
    <button type="button" class="epg-scard" ${navAttrs('epm-gallery-state', { state: state.id })}
      aria-label="${`${state.name}: ${stateCardSummary(state, meetings)}`}">
      <span class="epg-scard-media">${fadeImage({
        src: getEpmGalleryImageUrl(state.coverUrl), alt: '', className: 'epg-scard-img', attrs: 'decoding="async"',
      })}<span class="epg-scard-index">${pad2(index + 1)}</span>${preview.length > 0 && html`<span class="epg-scard-avatars">${preview.map((d) => html`<span class="epg-scard-avatar">${fadeImage({
        src: getEpmGalleryImageUrl(d.coverUrl), alt: '', attrs: 'loading="lazy" decoding="async"',
      })}</span>`)}${more > 0 && html`<span class="epg-scard-avatar is-more">+${more}</span>`}</span>`}</span>

      <span class="epg-scard-body">
        <span class="epg-scard-name">${state.name}</span>
        <span class="epg-scard-stats">${stateCardStatsHtml(state, meetings)}</span>
        ${names && html`<span class="epg-scard-districts">${names}${more > 0 ? ` and ${more} more` : ''}</span>`}
        <span class="epg-scard-cta">Explore ${state.name}<span class="epg-scard-go" aria-hidden="true">${icon('arrow-right', { size: 18 })}</span></span>
      </span>
    </button>`;
}

// The meeting counts arrive after the cards: update the label and numbers in place, so the card
// (and its photos) stay as they are.
function updateStateCard(card, { state, meetings }) {
  card.setAttribute('aria-label', `${state.name}: ${stateCardSummary(state, meetings)}`);
  render(card.querySelector('.epg-scard-stats'), stateCardStatsHtml(state, meetings));
}

// --- Page ------------------------------------------------------------------------------------------

const session = initPage({ page: 'epm' });

if (session) {
  const main = document.querySelector('.epg-main');
  const intro = main.querySelector('.epg-intro');
  const introCopy = intro.querySelector('.epg-intro-copy');
  const introVisual = intro.querySelector('.epg-intro-visual');
  const exploreBtn = intro.querySelector('[data-action="explore"]');
  const statesSection = main.querySelector('.epg-states');
  const programmeSection = main.querySelector('.epg-programme');

  const state = {
    loading: true,
    blockImages: {},
    // One card per gallery state added in the admin panel (see EpmGalleryRegionService).
    states: [],
    programmeStats: null,
    query: '',
    activeStoryId: null,
    // EPM meetings for the per-state counts - null until loaded.
    meetings: null,
  };
  let stories = [];
  let statesList = null; // the <ul> of state cards while it is on the page
  let storiesSection = null;

  const meetingsByState = () => countMeetingsBy(state.meetings, 'state');

  const totals = () => ({
    districts: state.states.reduce((sum, s) => sum + (s.districtCount || 0), 0),
    photos: state.states.reduce((sum, s) => sum + (s.photoCount || 0), 0)
      + Object.values(state.blockImages).reduce((sum, list) => sum + (list?.length || 0), 0),
  });

  const isEmpty = () => !state.loading && state.states.length === 0 && totals().photos === 0;

  const activeStory = () => stories.find((s) => s.id === state.activeStoryId) || stories[0];

  // --- intro -------------------------------------------------------------------------------------

  // The programme's numbers under the intro text. Replaces the placeholder once loaded; numbers
  // that arrive later (the EPMs-held figure) are added to the same list.
  const drawIntroStats = () => {
    if (state.loading) return;
    const { districts, photos } = totals();
    const { states, programmeStats } = state;
    const items = [
      states.length > 0 && { label: plural(states.length, 'State'), value: states.length },
      districts > 0 && { label: plural(districts, 'District'), value: districts },
      photos > 0 && { label: plural(photos, 'Photograph'), value: photos },
      programmeStats?.epmsConducted > 0 && { label: 'EPMs held', value: programmeStats.epmsConducted },
    ];
    const current = introCopy.querySelector(':scope > .epg-intro-stats, :scope > .epg-intro-stats-placeholder');
    if (items.filter(Boolean).length === 0) {
      current?.remove();
    } else if (current?.matches('.epg-intro-stats')) {
      render(current, statsItemsHtml(items));
    } else {
      const dl = toElement(statsHtml({ items, className: 'epg-intro-stats' }));
      if (current) current.replaceWith(dl);
      else introCopy.appendChild(dl);
    }
  };

  const drawIntro = () => {
    // The intro collage is the first three photographs of the `epm-gallery` block, in the admin's order.
    const collage = (state.blockImages[INTRO_BLOCK] || []).slice(0, 3).map((img) => getEpmGalleryImageUrl(img.imageUrl));
    intro.classList.toggle('is-text-only', collage.length === 0);
    introVisual.className = `epg-intro-visual is-count-${collage.length}`;
    render(introVisual, html`${collage.map((src) => html`<span class="epg-intro-frame">${fadeImage({ src, alt: '', attrs: 'fetchpriority="high"' })}</span>`)}`);
    initFadeImages(introVisual);
    exploreBtn.disabled = isEmpty();
    drawIntroStats();
  };

  // --- states ------------------------------------------------------------------------------------

  const statesHeadingHtml = () => sectionHeadingHtml({
    id: 'epg-states-title',
    eyebrow: 'Explore by state',
    title: 'Where the meetings happened',
    description: 'Each state opens onto its districts, and each district onto the photographs from its meetings.',
    children: state.states.length > 6 && html`
      <label class="epg-search">
        ${icon('search', { size: 18 })}
        <input type="search" value="${state.query}" placeholder="Search states" aria-label="Search states" />
      </label>`,
  });

  // The cards (or the "no match" message) under the states heading.
  const drawStatesList = () => {
    if (state.loading || !statesSection.isConnected) return;
    const header = statesSection.querySelector('.epg-section-head');
    const content = header.nextElementSibling;
    const trimmedQuery = state.query.trim().toLowerCase();
    const visibleStates = trimmedQuery
      ? state.states.filter((s) => s.name.toLowerCase().includes(trimmedQuery))
      : state.states;

    if (visibleStates.length === 0) {
      statesList = null;
      content.replaceWith(toElement(statusMessageHtml({
        icon: 'search',
        title: `No state matches “${state.query.trim()}”`,
        children: html`<button type="button" class="epg-btn epg-btn-secondary" data-action="clear-search">Clear search</button>`,
      })));
      return;
    }

    if (!statesList) {
      statesList = document.createElement('ul');
      content.replaceWith(statesList);
    }
    statesList.className = cx('epg-state-grid', visibleStates.length === 1 && 'is-single');
    const counts = meetingsByState();
    const meetingsOf = (s) => counts.get(placeKey(s.name)) || 0;
    syncRevealList(statesList, visibleStates, {
      key: (s) => s.id,
      delay: (s, i) => Math.min(i, 5) * 90,
      render: (s) => stateCardHtml({ state: s, index: state.states.indexOf(s), meetings: meetingsOf(s) }),
      update: (li, s) => updateStateCard(li.firstElementChild, { state: s, meetings: meetingsOf(s) }),
    });
    initFadeImages(statesList);
  };

  // --- photo themes ------------------------------------------------------------------------------

  const storyPanelHtml = (story) => html`
    <div class="epg-story-panel" role="tabpanel" id="${`epg-story-panel-${story.id}`}" aria-labelledby="${`epg-story-tab-${story.id}`}">
      <div class="epg-story-head">
        <div>
          <h3 class="epg-story-title">${story.title}</h3>
          <p class="epg-story-desc">${story.description}</p>
        </div>
        ${story.photos.length > 1 && html`
          <button type="button" class="epg-btn epg-btn-secondary epg-btn-sm" data-action="slideshow">
            ${icon('play', { size: 15 })} View as slideshow
          </button>`}
      </div>
      ${editorialGridHtml({ photos: story.photos, label: `${story.title} photograph` })}
    </div>`;

  const storyIdOf = (tab) => tab.id.slice('epg-story-tab-'.length);

  // Theme tabs for the photo section: arrow keys / Home / End move between them (WAI-ARIA tabs).
  const storyTabsHtml = (activeId) => html`
    <div class="epg-tabs" role="tablist" aria-label="Photo themes">
      ${stories.map((story) => {
        const selected = story.id === activeId;
        return html`
          <button type="button" role="tab" id="${`epg-story-tab-${story.id}`}" aria-selected="${String(selected)}"
            ${selected ? html`aria-controls="${`epg-story-panel-${story.id}`}"` : ''} tabindex="${selected ? 0 : -1}"
            class="${cx('epg-tab', selected && 'is-active')}">${story.label}<span class="epg-tab-count">${story.photos.length}</span></button>`;
      })}
    </div>`;

  const drawStories = () => {
    const story = activeStory();
    if (!story) return;
    storiesSection = toElement(html`
      <section class="epg-section epg-stories" aria-labelledby="epg-stories-title">
        <div class="epg-container">
          ${sectionHeadingHtml({
            id: 'epg-stories-title',
            eyebrow: 'From the meetings',
            title: 'Scenes from the meetings',
            description: 'Browse by theme, from the opening sessions to the conversations that carry on afterwards.',
          })}
          ${storyTabsHtml(story.id)}
          ${storyPanelHtml(story)}
        </div>
      </section>`);
    main.appendChild(storiesSection);
    initReveal(storiesSection);
    initFadeImages(storiesSection);
  };

  // Switching theme updates the tabs in place (so keyboard focus stays on them) and swaps in a
  // fresh panel, which fades in.
  const selectStory = (id) => {
    const before = activeStory();
    state.activeStoryId = id;
    const story = activeStory();
    if (!storiesSection || story === before) return;
    storiesSection.querySelectorAll('[role="tab"]').forEach((tab) => {
      const selected = storyIdOf(tab) === story.id;
      tab.setAttribute('aria-selected', String(selected));
      if (selected) tab.setAttribute('aria-controls', `epg-story-panel-${story.id}`);
      else tab.removeAttribute('aria-controls');
      tab.tabIndex = selected ? 0 : -1;
      tab.className = cx('epg-tab', selected && 'is-active');
    });
    const panel = toElement(storyPanelHtml(story));
    storiesSection.querySelector('.epg-story-panel').replaceWith(panel);
    initReveal(panel);
    initFadeImages(panel);
  };

  const openViewer = (index) => {
    const story = activeStory();
    if (!story) return;
    openPhotoLightbox({ photos: story.photos, index, title: story.title, subtitle: 'EPM Gallery' });
  };

  // --- after loading -----------------------------------------------------------------------------

  const drawLoaded = () => {
    stories = STORY_BLOCKS
      .map((block) => ({ ...block, photos: (state.blockImages[block.id] || []).map((img) => toPhoto(img, block)) }))
      .filter((block) => block.photos.length > 0);

    drawIntro();

    if (isEmpty()) {
      statesSection.remove();
      programmeSection.remove();
      intro.after(toElement(html`
        <div class="epg-container">
          ${statusMessageHtml({
            icon: 'image-off',
            title: 'No photographs yet',
            text: "Photographs from Export Promotional Meetings will appear here once they're added.",
          })}
        </div>`));
      return;
    }

    if (state.states.length === 0) {
      statesSection.remove();
    } else {
      statesSection.querySelector('.epg-section-head').replaceWith(toElement(statesHeadingHtml()));
      drawStatesList();
    }
    drawStories();
  };

  // --- events ------------------------------------------------------------------------------------

  exploreBtn.addEventListener('click', () => {
    document.getElementById('epg-states')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  on(statesSection, 'input', '.epg-search input', (_event, input) => {
    state.query = input.value;
    drawStatesList();
  });

  on(statesSection, 'click', '[data-action="clear-search"]', () => {
    state.query = '';
    const input = statesSection.querySelector('.epg-search input');
    if (input) input.value = '';
    drawStatesList();
  });

  on(main, 'click', '.epg-tabs [role="tab"]', (_event, tab) => selectStory(storyIdOf(tab)));

  on(main, 'keydown', '.epg-tabs', (event, list) => {
    const at = stories.findIndex((s) => s.id === activeStory()?.id);
    const next = {
      ArrowRight: (at + 1) % stories.length,
      ArrowLeft: (at - 1 + stories.length) % stories.length,
      Home: 0,
      End: stories.length - 1,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    selectStory(stories[next].id);
    list.querySelectorAll('[role="tab"]')[next]?.focus();
  });

  on(main, 'click', '[data-action="slideshow"]', () => openViewer(0));

  onEditorialGridOpen(main, openViewer);

  // --- data --------------------------------------------------------------------------------------

  initReveal(main);

  // Every photo below comes from the backend - see EpmGalleryController#listByBlock. Each block is
  // fetched independently, so a failed/empty block just leaves its section out.
  const blockIds = [INTRO_BLOCK, ...STORY_BLOCKS.map((b) => b.id)];
  Promise.all([
    Promise.all(blockIds.map((id) => fetchEpmGalleryImagesByBlock(id).then((data) => [id, data]).catch(() => [id, []]))),
    fetchEpmGalleryStates().catch(() => []),
  ]).then(([blocks, stateCards]) => {
    state.blockImages = Object.fromEntries(blocks);
    state.states = stateCards || [];
  }).finally(() => {
    state.loading = false;
    drawLoaded();
  });

  // Programme-wide numbers for the intro - optional, so a failure just leaves that figure out.
  fetchEpmStats().then((data) => {
    state.programmeStats = data;
    drawIntroStats();
  }).catch(() => {});

  loadEpmMeetings().then((events) => {
    state.meetings = events;
    drawStatesList();
  });
}
