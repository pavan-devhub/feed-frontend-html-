// EPM Gallery - third level: one district's album
// (pages/epm-gallery-district.html?state=<stateId>&district=<districtId>), in the order the admin
// arranged its photos (Page & Gallery Images > States & districts) - see EpmGalleryRegionService.
(function () {
  'use strict';

  const { initPage } = FW.require('core/page');
  const { getParam, assetUrl } = FW.require('core/router');
  const { html, render, on, toElement } = FW.require('core/dom');
  const { icon } = FW.require('core/icons');
  const {
    fetchEpmGalleryDistrict,
    fetchEpmGalleryState,
    getEpmGalleryImageUrl,
  } = FW.require('api/epm-api');
  const { initFadeImages } = FW.require('components/fade-image');
  const { openPhotoLightbox } = FW.require('components/photo-lightbox');
  const {
    galleryHeroHtml,
    galleryHeroFootHtml,
    galleryHeroSkeletonHtml,
    initGalleryHero,
  } = FW.require('components/gallery-hero');
  const {
    editorialGridHtml,
    editorialGridSkeletonHtml,
    onEditorialGridOpen,
  } = FW.require('components/editorial-grid');
  const { districtCardHtml, updateDistrictCard } = FW.require('components/district-card');
  const { initReveal, syncRevealList } = FW.require('components/reveal');
  const {
    navAttrs,
    nextEpmCardHtml,
    sectionHeadingHtml,
    statusMessageHtml,
  } = FW.require('components/gallery-primitives');
  const {
    countMeetingsBy,
    loadEpmMeetings,
    placeKey,
    plural,
    summariseMeetings,
  } = FW.require('components/gallery-utils');

  // Used until a photo's real size is known (the backend can't read every format's dimensions).
  const FALLBACK_RATIO = 4 / 3;
  const MORE_DISTRICTS = 4;

  // Each district's landscape banner is assets/images/epm-heroes/<district-id>.jpg; default.jpg
  // stands in for districts that don't have their own yet.
  const HERO_FALLBACK = assetUrl('images/epm-heroes/default.jpg');
  const heroFor = (districtId) => assetUrl(`images/epm-heroes/${encodeURIComponent((districtId || '').toLowerCase().replace(/\s+/g, '-'))}.jpg`);

  const session = initPage({ page: 'epm' });

  if (session) {
    const stateId = getParam('state');
    const districtId = getParam('district');
    const main = document.querySelector('.epg-main');

    const state = {
      district: null,
      status: stateId && districtId ? 'loading' : 'error',
      // The state's districts, for the "continue exploring" row. Optional - on failure the row is
      // simply left out.
      siblings: [],
      // The whole state's EPM meetings: this district's numbers and the neighbouring cards' badges -
      // null until loaded.
      stateMeetings: null,
    };
    let request = 0;
    let meetingsFor = null; // the state name the loaded/loading meetings belong to
    let photos = [];

    const toPhotos = (district) => (district?.photos || []).map((p, i) => ({
      id: p.id,
      src: getEpmGalleryImageUrl(p.imageUrl),
      ratio: p.width && p.height ? p.width / p.height : FALLBACK_RATIO,
      alt: p.caption || `${district.name}, ${district.stateName} - photograph ${i + 1}`,
      // Set by the admin (Page & Gallery Images > States & districts); shown under the photo in the viewer.
      caption: p.caption || undefined,
    }));

    // This district's meeting numbers, from the state's meetings.
    const meetingsSummary = () => {
      const { stateMeetings, district } = state;
      if (!stateMeetings || !district) return null;
      const key = placeKey(district.name);
      return summariseMeetings(stateMeetings.filter((e) => placeKey(e.district) === key));
    };

    // The districts after this one (wrapping round), so "next" always reads left to right.
    const moreDistricts = () => {
      const { siblings } = state;
      const at = siblings.findIndex((d) => d.id === districtId);
      const ordered = at === -1 ? siblings : [...siblings.slice(at + 1), ...siblings.slice(0, at)];
      return ordered.filter((d) => d.id !== districtId).slice(0, MORE_DISTRICTS);
    };

    // --- hero ----------------------------------------------------------------------------------------

    const heroStats = () => {
      const { district } = state;
      const meetings = meetingsSummary();
      return [
        { label: plural(district.photoCount, 'Photograph'), value: district.photoCount },
        meetings?.held > 0 && { label: plural(meetings.held, 'EPM held', 'EPMs held'), value: meetings.held },
        meetings?.upcoming > 0 && { label: 'Upcoming', value: meetings.upcoming },
      ];
    };

    const heroAside = () => {
      const meetings = meetingsSummary();
      return meetings?.next && nextEpmCardHtml({ event: meetings.next, place: state.district.name });
    };

    // --- more from this state ------------------------------------------------------------------------

    const drawMore = () => {
      const { district, siblings } = state;
      if (state.status !== 'ready' || !district) return;
      let section = main.querySelector('section[aria-labelledby="epg-more-title"]');
      const more = moreDistricts();
      if (more.length === 0) {
        section?.remove();
        return;
      }
      if (!section) {
        section = toElement(html`
        <section class="epg-section epg-band" aria-labelledby="epg-more-title">
          <div class="epg-container">
            ${sectionHeadingHtml({
                id: 'epg-more-title',
                eyebrow: 'Continue exploring',
                title: `More from ${district.stateName}`,
                children: html`
                <button type="button" class="epg-link" ${navAttrs('epm-gallery-state', { state: stateId })}>
                  All ${siblings.length} districts ${icon('arrow-right', { size: 16 })}
                </button>`,
              })}
            <ul class="epg-district-grid"></ul>
          </div>
        </section>`);
        main.querySelector('section[aria-labelledby="epg-album-title"]').after(section);
      }
      const list = section.querySelector('.epg-district-grid');
      const counts = countMeetingsBy(state.stateMeetings, 'district');
      const meetingsOf = (d) => counts.get(placeKey(d.name)) || 0;
      syncRevealList(list, more, {
        key: (d) => d.id,
        delay: (d, k) => k * 70,
        render: (d) => districtCardHtml({
          district: d, index: siblings.indexOf(d), meetings: meetingsOf(d), stateId,
        }),
        update: (li, d) => updateDistrictCard(li.firstElementChild, { district: d, meetings: meetingsOf(d) }),
      });
      initFadeImages(list);
    };

    // --- whole page per status -----------------------------------------------------------------------

    const errorHtml = () => html`
    <div class="epg-container">
      ${statusMessageHtml({
          icon: 'image-off',
          headingLevel: 'h1',
          title: "We couldn't open this album",
          text: "It may have moved, or the server can't be reached right now.",
          children: html`
          ${stateId && districtId && html`
            <button type="button" class="epg-btn epg-btn-primary" data-action="retry">
              ${icon('refresh-cw', { size: 16 })} Try again
            </button>`}
          <button type="button" class="epg-btn epg-btn-secondary" ${stateId ? navAttrs('epm-gallery-state', { state: stateId }) : navAttrs('epm-gallery')}>
            ${icon('arrow-left', { size: 16, className: 'epg-nudge-left' })} ${stateId ? 'Back to districts' : 'Back to the gallery'}
          </button>`,
        })}
    </div>`;

    const loadingHtml = () => html`
    <div aria-busy="true" aria-label="Loading album">
      ${galleryHeroSkeletonHtml()}
      <section class="epg-section epg-section-lead epg-container">
        ${editorialGridSkeletonHtml()}
      </section>
    </div>`;

    const readyHtml = () => {
      const { district } = state;
      return html`
      ${galleryHeroHtml({
          image: heroFor(districtId),
          crumbs: [
            { label: 'EPM', nav: 'epm' },
            { label: 'Gallery', nav: 'epm-gallery' },
            { label: district.stateName, nav: 'epm-gallery-state', navParams: { state: stateId } },
            { label: district.name },
          ],
          eyebrow: `District album · ${district.stateName}`,
          title: district.name,
          lead: `The farming communities, landscapes and activities of ${district.name} district, captured at FEED's Export Promotional Meetings.`,
          stats: heroStats(),
          aside: heroAside(),
        })}

      <section class="epg-section epg-section-lead epg-container" aria-labelledby="epg-album-title">
        ${sectionHeadingHtml({
            id: 'epg-album-title',
            eyebrow: 'The album',
            title: `Photographs from ${district.name}`,
            description: photos.length > 0 ? 'Select any photograph to see it full screen.' : undefined,
            children: photos.length > 1 && html`
            <button type="button" class="epg-btn epg-btn-secondary" data-action="slideshow">
              ${icon('play', { size: 16 })} View as slideshow
            </button>`,
          })}

        ${photos.length === 0
            ? statusMessageHtml({
              icon: 'image-off',
              title: 'No photographs yet',
              text: `Photographs from meetings in ${district.name} will appear here once they're added.`,
            })
            : editorialGridHtml({ photos, label: `${district.name} photograph` })}
      </section>`;
    };

    const draw = () => {
      if (state.status === 'error') {
        render(main, errorHtml());
      } else if (state.status === 'loading') {
        render(main, loadingHtml());
      } else if (state.status === 'ready' && state.district) {
        render(main, readyHtml());
        // A district without its own banner falls back to the default one. (This also fades in the
        // album's photos - initGalleryHero runs initFadeImages over everything under main.)
        initGalleryHero(main, {
          onImageError: (img) => {
            if (img.getAttribute('src') !== HERO_FALLBACK) img.setAttribute('src', HERO_FALLBACK);
          },
        });
        drawMore();
        initReveal(main);
      } else {
        render(main, '');
      }
    };

    const openViewer = (index) => {
      const { district } = state;
      openPhotoLightbox({
        photos,
        index,
        title: district?.name,
        subtitle: district ? `${district.stateName} · EPM Gallery` : '',
      });
    };

    // --- data ----------------------------------------------------------------------------------------

    // One events call for the whole state covers both this district's numbers and the badges on the
    // neighbouring district cards. Fetched once the state's name is known.
    const ensureMeetings = () => {
      const name = state.district?.stateName;
      if (!name || name === meetingsFor) return;
      meetingsFor = name;
      state.stateMeetings = null;
      loadEpmMeetings({ state: name }).then((events) => {
        if (meetingsFor !== name) return;
        state.stateMeetings = events;
        if (state.status !== 'ready' || !state.district) return;
        const foot = main.querySelector('.epg-hero-foot');
        if (foot) render(foot, galleryHeroFootHtml({ stats: heroStats(), aside: heroAside() }));
        drawMore();
      });
    };

    const loadDistrict = () => {
      const id = ++request;
      state.status = 'loading';
      draw();
      fetchEpmGalleryDistrict(stateId, districtId)
        .then((data) => {
          if (id !== request) return;
          state.district = data;
          photos = toPhotos(data);
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

    on(main, 'click', '[data-action="retry"]', () => loadDistrict());
    on(main, 'click', '[data-action="slideshow"]', () => openViewer(0));
    onEditorialGridOpen(main, openViewer);

    // --- start ---------------------------------------------------------------------------------------

    if (stateId && districtId) loadDistrict();
    else draw();

    if (stateId) {
      fetchEpmGalleryState(stateId)
        .then((data) => {
          state.siblings = data?.districts || [];
          drawMore();
        })
        .catch(() => {
          state.siblings = [];
          drawMore();
        });
    }
  }
})();
