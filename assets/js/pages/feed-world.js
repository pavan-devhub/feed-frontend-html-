// Feed World publications (pages/feed-world.html): a year/language finder, the archive of earlier
// years and one year's shelf of monthly issues. Members only - logged-out visitors get a login
// gate. Each issue opens in its own reader tab (pages/publication-reader.html).
(function () {
  'use strict';

  const { initPage } = FW.require('core/page');
  const { html, render, on, qs } = FW.require('core/dom');
  const { icon, hydrateIcons } = FW.require('core/icons');
  const { fadeImage, initFadeImages } = FW.require('components/fade-image');
  const { openShareDialog } = FW.require('components/share-dialog');
  const {
    fetchPublicationYears,
    fetchPublicationsByYear,
    getPublicationFileUrl,
    getPublicationThumbnailUrl,
    PUBLICATION_LANGUAGES,
    PUBLICATION_LANGUAGE_LABELS,
  } = FW.require('api/publications-api');
  const { getPublicationReaderUrl } = FW.require('utils/publication-links');
  const { isReleased, latestReleasedMonth } = FW.require('utils/publication-release');

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // The page always opens on the Telugu edition; the Language dropdown switches from there.
  const DEFAULT_LANGUAGE = 'Telugu';

  const SKELETON_CARDS = 8;

  // Editions of `language` a reader can open in that year (see YearSummaryDto#languages).
  const readableCount = (yearSummary, language) =>
    yearSummary?.languages?.find((l) => l.language === language)?.count ?? 0;

  // The year the shelf opens on until the reader picks one: the newest year with that language's
  // edition, else the newest year in any language. Only released years are ever in the catalog, so
  // "newest" is this year or an earlier one.
  function defaultYear(catalog, language) {
    const years = catalog.filter((y) => readableCount(y, language) > 0).map((y) => y.year);
    if (years.length) return Math.max(...years);
    return catalog[0]?.year ?? new Date().getFullYear();
  }

  // One year's readable issues in one language. request(null) loads nothing. The loaded result
  // remembers which year/language (and retry) it was loaded for, so "loading" is simply "what's
  // loaded isn't what was asked for" - no frame ever shows another year's issues, or an empty state,
  // while the right ones are still on their way.
  function createYearIssues(onUpdate) {
    let wanted = null;
    let loaded = { key: null, issues: [], error: false };
    return {
      request(year, language, reloadKey) {
        const key = year == null ? null : `${year}|${language}|${reloadKey}`;
        if (key === wanted) return;
        wanted = key;
        if (key == null) return;
        fetchPublicationsByYear(year, language)
          // Only released issues whose PDF is actually on disk are offered.
          .then((list) => {
            if (wanted !== key) return;
            const latest = latestReleasedMonth();
            const readable = (Array.isArray(list) ? list : []).filter((p) => p.pdfAvailable && isReleased(p, latest));
            loaded = { key, issues: readable, error: false };
            onUpdate();
          })
          .catch(() => {
            if (wanted !== key) return;
            loaded = { key, issues: [], error: true };
            onUpdate();
          });
      },
      cancel() {
        wanted = null;
      },
      get state() {
        const current = wanted != null && loaded.key === wanted;
        return {
          issues: current ? loaded.issues : [],
          loading: wanted != null && !current,
          error: current && loaded.error,
        };
      },
    };
  }

  // Replaces everything after `anchor` (inside its parent) with `content`.
  function replaceAfter(anchor, content) {
    while (anchor.nextSibling) anchor.nextSibling.remove();
    const holder = document.createElement('template');
    render(holder, content);
    anchor.after(holder.content);
  }

  // --- markup ----------------------------------------------------------------------------------

  const issueName = (pub) => `${pub.title} – ${pub.monthName} ${pub.year} (${pub.language})`;

  const coverFallbackHtml = (pub) => html`<span class="pubs-card-fallback" aria-hidden="true"><strong>FEED WORLD</strong><small>${pub.monthName} ${pub.year}</small></span>`;

  // One issue on the shelf. The cover is a real link (so middle-click / "open in new tab" work too)
  // to the issue's reader tab; Share and Download sit beside it, not inside it.
  const issueCardHtml = (pub, coverFailed) => {
    const name = issueName(pub);
    return html`
    <li class="pubs-card">
      <h3 class="pubs-card-month">${pub.monthName}</h3>
      <div class="pubs-card-cover">
        <a class="pubs-card-link" href="${getPublicationReaderUrl(pub.id)}" target="_blank" rel="noopener noreferrer"
          aria-label="Read ${name} – opens in a new tab">${coverFailed
              ? coverFallbackHtml(pub)
              : fadeImage({ src: getPublicationThumbnailUrl(pub.id), alt: '', attrs: 'loading="lazy" decoding="async"' })}<span class="pubs-card-hover" aria-hidden="true">${icon('external-link', { size: 16 })} Read issue${pub.pageCount ? html`<small>${pub.pageCount} pages</small>` : null}</span></a>
        <div class="pubs-card-actions">
          <button type="button" class="pubs-card-action" data-action="share" data-id="${pub.id}"
            aria-label="Share ${name}" aria-haspopup="dialog" title="Share">${icon('share-2', { size: 15 })}</button>
          <a class="pubs-card-action is-download" href="${getPublicationFileUrl(pub.id, { download: true })}"
            aria-label="Download ${name} PDF" title="Download PDF">${icon('download', { size: 15 })}</a>
        </div>
      </div>
    </li>`;
  };

  const issueGridHtml = (issues, coverFailed) => html`
  <ul class="pubs-grid">
    ${issues.map((pub) => issueCardHtml(pub, coverFailed.has(String(pub.id))))}
  </ul>`;

  const skeletonGridHtml = () => html`
  <ul class="pubs-grid" aria-busy="true" aria-label="Loading publications">
    ${Array.from({ length: SKELETON_CARDS }, () => html`<li class="pubs-card is-skeleton" aria-hidden="true"><span class="pubs-skeleton-line"></span><span class="pubs-card-cover"></span></li>`)}
  </ul>`;

  // One earlier year's twelve months: a month with an issue links to it (new tab), the rest say why
  // there's nothing to open.
  const archiveMonthsHtml = (year, byMonth, loading, error) => html`
  <ul id="pubs-archive-${year}" class="pubs-archive-months">
    ${error
        ? html`<li class="pubs-archive-note">${year} couldn't be loaded.<button type="button" data-action="retry">Try again</button></li>`
        : MONTH_NAMES.map((name, i) => {
          const pub = byMonth.get(i + 1);
          if (loading) {
            return html`<li><span class="pubs-archive-month is-loading">${icon('file-text', { size: 16 })} ${name}</span></li>`;
          }
          return html`<li>${pub
            ? html`<a class="pubs-archive-month" href="${getPublicationReaderUrl(pub.id)}" target="_blank" rel="noopener noreferrer" title="Open ${name} ${year} in a new tab">${icon('file-text', { size: 16 })}<span>${name}<span class="pubs-sr-only"> ${year}, opens in a new tab</span></span>${icon('chevron-right', { size: 16, className: 'pubs-archive-month-chevron' })}</a>`
            : html`<span class="pubs-archive-month is-unavailable">${icon('file-text', { size: 16 })}<span>${name}</span><em>Not published</em></span>`}</li>`;
        })}
  </ul>`;

  // One earlier year in the archive: a header that folds/unfolds it, and - once unfolded - its months.
  const archiveYearHtml = ({ year, language, count, open, slotState }) => {
    const languageLabel = PUBLICATION_LANGUAGE_LABELS[language] || language;
    const byMonth = new Map(slotState.issues.map((p) => [p.month, p]));
    return html`
    <div class="pubs-archive-year ${open ? 'is-active' : ''}">
      <button type="button" class="pubs-archive-year-btn" data-year="${year}" aria-expanded="${String(open)}" aria-controls="pubs-archive-${year}">
        <span class="pubs-archive-year-label">${year} (${languageLabel})</span>
        <span class="pubs-archive-count" title="${count} ${language} edition${count === 1 ? '' : 's'}">${count}</span>
        ${icon('chevron-down', { size: 16, className: 'pubs-archive-year-chevron' })}
      </button>
      ${open && archiveMonthsHtml(year, byMonth, slotState.loading, slotState.error)}
    </div>`;
  };

  // --- the logged-in view ----------------------------------------------------------------------

  function mountMemberView(hub) {
    const yearSelect = qs('#pubs-year', hub);
    const languageSelect = qs('#pubs-language', hub);
    const archivePanel = qs('.pubs-archive-panel', hub);
    const archiveTitle = qs('.pubs-archive-title', archivePanel);
    const shelfHead = qs('.pubs-shelf-head', hub);
    const shelfTitle = qs('#pubs-shelf-title', hub);

    const state = {
      // Every year with at least one issue, newest first, with per-language counts. null = loading.
      catalog: null,
      catalogError: false,
      language: DEFAULT_LANGUAGE,
      // null until the reader picks a year - until then the default follows the chosen language.
      pickedYear: null,
      // Archive years the reader has unfolded or folded by hand; any year not in here uses its
      // default (see isArchiveOpen). Cleared whenever the year or language changes.
      archiveToggled: {},
      reloadKey: 0,
    };
    let disposed = false;
    let catalogRequest = 0;

    // Last markup drawn into each region - a region is only re-rendered when its markup changes,
    // so focus, loaded cover images and scroll positions survive unrelated updates.
    const drawn = { yearOptions: null, archive: null, shelf: null };
    // Covers that failed to load (per card, reset whenever the shelf stops showing cards).
    const coverFailed = new Set();
    let issuesById = new Map();

    const draw = () => {
      if (!disposed) update();
    };
    const shelf = createYearIssues(draw);
    // One loader per archive year on screen (React's <ArchiveYear key={year}>).
    const archiveSlots = new Map();

    const currentYear = () => state.pickedYear ?? (state.catalog ? defaultYear(state.catalog, state.language) : null);

    // The archive: every year before the selected one that has this language's edition, newest
    // first. The selected year itself is on the shelf beside it, and a future year is never in the
    // catalog. Only the newest archive year starts unfolded; each one fetches its months only once
    // it's unfolded.
    const archiveYearsFor = (year) => (state.catalog || [])
      .filter((y) => year != null && y.year < year && readableCount(y, state.language) > 0)
      .map((y) => y.year)
      .sort((a, b) => b - a);

    const isArchiveOpen = (y, archiveYears) => state.archiveToggled[y] ?? y === archiveYears[0];

    function update() {
      const { catalog, catalogError, language } = state;
      const year = currentYear();
      const languageLabel = PUBLICATION_LANGUAGE_LABELS[language] || language;
      const summaryOf = (y) => catalog?.find((c) => c.year === y);

      // The selected year's shelf. Only thumbnails load here - a PDF is fetched only when an issue
      // is actually opened, in its own tab.
      shelf.request(year, language, state.reloadKey);
      const { issues, loading: issuesLoading, error: issuesError } = shelf.state;

      const archiveYears = archiveYearsFor(year);
      archiveSlots.forEach((slot, y) => {
        if (!archiveYears.includes(y)) {
          slot.cancel();
          archiveSlots.delete(y);
        }
      });
      archiveYears.forEach((y) => {
        let slot = archiveSlots.get(y);
        if (!slot) {
          slot = createYearIssues(draw);
          archiveSlots.set(y, slot);
        }
        slot.request(isArchiveOpen(y, archiveYears) ? y : null, language, state.reloadKey);
      });

      // --- finder ---
      const yearOptions = String(html`
      ${!catalog && html`<option value="">Loading…</option>`}
      ${catalog && catalog.length === 0 && html`<option value="${year ?? ''}">${year}</option>`}
      ${catalog && catalog.map((y) => html`<option value="${y.year}">${y.year}</option>`)}`);
      if (yearOptions !== drawn.yearOptions) {
        drawn.yearOptions = yearOptions;
        yearSelect.innerHTML = yearOptions;
      }
      yearSelect.value = String(year ?? '');
      yearSelect.disabled = !catalog || catalog.length === 0;
      languageSelect.value = language;

      // --- archive ---
      let archive = '';
      if (catalog === null) {
        archive = html`
        <div class="pubs-archive-loading" aria-hidden="true">
          ${[0, 1, 2].map(() => html`<span class="pubs-skeleton-line"></span>`)}
        </div>`;
      } else if (!catalogError && year != null) {
        archive = archiveYears.length > 0
          ? archiveYears.map((y) => archiveYearHtml({
            year: y,
            language,
            count: readableCount(summaryOf(y), language),
            open: isArchiveOpen(y, archiveYears),
            slotState: archiveSlots.get(y).state,
          }))
          : html`<p class="pubs-archive-empty">No ${languageLabel} editions before ${year}.</p>`;
      }
      const archiveMarkup = String(html`${archive}`);
      if (archiveMarkup !== drawn.archive) {
        drawn.archive = archiveMarkup;
        // Keep keyboard focus on the year header that was just toggled.
        const focused = document.activeElement;
        const focusYear = focused && archivePanel.contains(focused) && focused.matches('.pubs-archive-year-btn')
          ? focused.dataset.year : null;
        replaceAfter(archiveTitle, archive);
        if (focusYear) archivePanel.querySelector(`.pubs-archive-year-btn[data-year="${focusYear}"]`)?.focus();
      }

      // --- shelf ---
      const yearSummary = catalog?.find((y) => y.year === year);
      let shelfBody;
      let showsCards = false;
      if (catalog === null || issuesLoading) {
        shelfBody = skeletonGridHtml();
      } else if (catalogError || issuesError) {
        shelfBody = html`
        <div class="pubs-empty">
          <div class="pubs-empty-icon is-error">${icon('alert-circle', { size: 28 })}</div>
          <h3>Publications couldn't be loaded</h3>
          <p>Please check your connection and try again.</p>
          <button type="button" class="pubs-primary-btn" data-action="retry">${icon('refresh-cw', { size: 16 })} Try again</button>
        </div>`;
      } else if (catalog.length === 0) {
        shelfBody = html`
        <div class="pubs-empty">
          <div class="pubs-empty-icon">${icon('book-open', { size: 28 })}</div>
          <h3>No publications yet</h3>
          <p>Feed World issues will appear here as soon as they're published.</p>
        </div>`;
      } else if (issues.length === 0) {
        const otherLanguagesThisYear = PUBLICATION_LANGUAGES.filter(
          (l) => l !== language && readableCount(yearSummary, l) > 0,
        );
        const otherYearsThisLanguage = catalog
          .filter((y) => y.year !== year && readableCount(y, language) > 0)
          .map((y) => y.year);
        shelfBody = html`
        <div class="pubs-empty">
          <div class="pubs-empty-icon">${icon('book-open', { size: 28 })}</div>
          <h3>No ${languageLabel} editions for ${year} yet</h3>
          <p>New issues appear here as soon as they're published.</p>
          ${otherLanguagesThisYear.length > 0 && html`
            <div class="pubs-empty-row">
              <span>Read ${year} in</span>
              ${otherLanguagesThisYear.map((l) => html`<button type="button" class="pubs-chip" data-language="${l}">${PUBLICATION_LANGUAGE_LABELS[l]}</button>`)}
            </div>`}
          ${otherYearsThisLanguage.length > 0 && html`
            <div class="pubs-empty-row">
              <span>${languageLabel} editions from</span>
              ${otherYearsThisLanguage.map((y) => html`<button type="button" class="pubs-chip" data-year="${y}">${y}</button>`)}
            </div>`}
        </div>`;
      } else {
        showsCards = true;
        shelfBody = issueGridHtml(issues, coverFailed);
      }
      if (!showsCards) coverFailed.clear();
      issuesById = new Map(issues.map((pub) => [String(pub.id), pub]));

      shelfTitle.textContent = `${language} Publications${year != null ? ` – ${year}` : ''}`;
      // Hidden while loading, on error, and at zero - the empty state already says so.
      const shelfCount = catalog && !issuesLoading && !issuesError && issues.length > 0 ? issues.length : null;
      replaceAfter(shelfTitle, shelfCount !== null
        && html`<span class="pubs-shelf-count">${shelfCount} Monthly Publication${shelfCount === 1 ? '' : 's'}</span>`);

      const shelfMarkup = String(shelfBody);
      if (shelfMarkup !== drawn.shelf) {
        drawn.shelf = shelfMarkup;
        replaceAfter(shelfHead, shelfBody);
        initFadeImages(shelfHead.parentElement);
      }
    }

    const loadCatalog = () => {
      const request = ++catalogRequest;
      fetchPublicationYears()
        .then((years) => {
          if (disposed || request !== catalogRequest) return;
          // A year appears only once its January has arrived - never a future year.
          const currentReleaseYear = latestReleasedMonth().year;
          state.catalog = (Array.isArray(years) ? years : []).filter((y) => y.year <= currentReleaseYear);
          state.catalogError = false;
          update();
        })
        .catch(() => {
          if (disposed || request !== catalogRequest) return;
          state.catalog = [];
          state.catalogError = true;
          update();
        });
    };

    const retry = () => {
      if (state.catalogError) state.catalog = null;
      state.reloadKey += 1;
      loadCatalog();
      update();
    };

    const changeLanguage = (next) => {
      state.language = next;
      state.archiveToggled = {};
      update();
    };

    const changeYear = (next) => {
      state.pickedYear = next;
      state.archiveToggled = {};
      update();
    };

    const toggleArchiveYear = (y) => {
      const archiveYears = archiveYearsFor(currentYear());
      state.archiveToggled = { ...state.archiveToggled, [y]: !isArchiveOpen(y, archiveYears) };
      update();
    };

    yearSelect.addEventListener('change', () => changeYear(Number(yearSelect.value)));
    languageSelect.addEventListener('change', () => changeLanguage(languageSelect.value));

    const removers = [
      on(hub, 'click', '[data-action="retry"]', retry),
      on(hub, 'click', '.pubs-chip[data-language]', (_e, chip) => changeLanguage(chip.dataset.language)),
      on(hub, 'click', '.pubs-chip[data-year]', (_e, chip) => changeYear(Number(chip.dataset.year))),
      on(hub, 'click', '.pubs-archive-year-btn', (_e, btn) => toggleArchiveYear(Number(btn.dataset.year))),
      on(hub, 'click', '[data-action="share"]', (_e, btn) => {
        const pub = issuesById.get(btn.dataset.id);
        if (pub) openShareDialog({ publication: pub });
      }),
    ];

    // A cover that fails to load is swapped for the printed-cover fallback (errors don't bubble,
    // hence the capture listener).
    const onImageError = (event) => {
      const img = event.target;
      if (!(img instanceof HTMLImageElement) || !img.matches('.pubs-card-link img.fade-img')) return;
      const id = img.closest('.pubs-card')?.querySelector('[data-action="share"]')?.dataset.id;
      const pub = issuesById.get(id);
      if (!pub) return;
      coverFailed.add(id);
      const holder = document.createElement('template');
      render(holder, coverFallbackHtml(pub));
      img.replaceWith(holder.content);
      // Keep the "last drawn" markup in step with the page, so the shelf isn't redrawn for it.
      drawn.shelf = String(issueGridHtml([...issuesById.values()], coverFailed));
    };
    hub.addEventListener('error', onImageError, true);

    loadCatalog();
    update();

    return {
      dispose() {
        disposed = true;
        shelf.cancel();
        archiveSlots.forEach((slot) => slot.cancel());
        removers.forEach((remove) => remove());
        hub.removeEventListener('error', onImageError, true);
      },
    };
  }

  // --- page ------------------------------------------------------------------------------------

  const session = initPage({ page: 'feedworld' });

  if (session) {
    const hub = qs('.pubs-hub-container');
    const hero = qs('.pubs-hero', hub);
    let view = null;

    const show = (loggedIn) => {
      const kind = loggedIn ? 'member' : 'guest';
      if (view?.kind === kind) return;
      view?.dispose?.();
      const template = document.getElementById(loggedIn ? 'pubs-member-view' : 'pubs-guest-view');
      while (hero.nextSibling) hero.nextSibling.remove();
      hero.after(template.content.cloneNode(true));
      hydrateIcons(hub);
      view = loggedIn ? { kind, ...mountMemberView(hub) } : { kind };
    };

    show(session.isLoggedIn);
    // A stored login the backend no longer accepts turns into the login gate.
    session.ready.then(() => show(session.isLoggedIn));
  }
})();
