// Admin panel - Feed World publications: add, replace or remove the monthly issues, one PDF per
// (year, month, language). Admin-only on the backend too (AdminPublicationController /
// SecurityConfig's hasRole("ADMIN") on /api/admin/**) - every write here would be rejected with 403
// for anyone else regardless of what this page shows. mount(container, ctx) renders into
// <main class="adm-main"> and returns a cleanup. Its dialogs are rendered inside the section, after
// its content, like the React screen did.
import { html, render, on, qs, qsa, toElement, scrollToTop } from '../../core/dom.js';
import { icon } from '../../core/icons.js';
import {
  fetchPublicationYears, fetchPublicationsByYear,
  createPublication, replacePublicationPdf, deletePublicationAdmin,
  fetchPublicationPdfBlob, getPublicationFileUrl, PUBLICATION_LANGUAGES,
  publicationOrder,
} from '../../api/publications-api.js';
import { formatPublishedDate } from '../../utils/publication-date.js';
import { createPdfViewer } from '../../components/pdf-viewer.js';
import { MONTH_NAMES } from './admin-utils.js';

const LANGUAGE_BADGES = { English: 'EN', Telugu: 'TE', Hindi: 'HI' };

const languageBadgeHtml = (language) => html`<span class="admin-pub-lang-badge admin-pub-lang-badge-${(language || '').toLowerCase()}"><span class="admin-pub-lang-badge-code">${LANGUAGE_BADGES[language] || language}</span>${language}</span>`;

// A row only counts as uploaded when the backend found its PDF on disk (pdfAvailable) - a row can
// outlive its file, and uploading that edition again fills the row back in. Anything but an
// explicit false (e.g. a backend that predates the flag) is treated as uploaded.
const isUploaded = (pub) => pub.pdfAvailable !== false;

const statusBadgeHtml = (published) => html`<span class="admin-pub-status-badge ${published ? 'published' : 'not-uploaded'}"><span class="admin-pub-status-dot"></span>${published ? 'Published' : 'Not uploaded'}</span>`;

const spinnerLabel = (label) => html`${icon('loader-2', { size: 14, className: 'admin-pub-spin' })} ${label}`;

const emptyAddForm = (year, month, language) => ({
  year: year || new Date().getFullYear(),
  month: month || '',
  language: language || 'English',
  languageLocked: Boolean(language),
  file: null,
});

// The dialog frame shared by the four dialogs: backdrop, box, header with title and close button.
const modalHtml = ({ sizeClass = '', iconName, title, body }) => html`
  <div class="admin-pub-modal-backdrop">
    <div class="admin-pub-modal${sizeClass}">
      <div class="admin-pub-modal-header">
        <h3>${icon(iconName, { size: 18 })} ${title}</h3>
        <button type="button" data-role="modal-close">${icon('x', { size: 18 })}</button>
      </div>
      ${body}
    </div>
  </div>`;

// Inserts `content` right after `start`, replacing whatever sat between `start` and `end`.
function renderBetween(start, end, content) {
  while (start.nextSibling && start.nextSibling !== end) start.nextSibling.remove();
  const holder = document.createElement('template');
  render(holder, content);
  end.before(holder.content);
}

// The form's error line is its first child, present only while there is an error.
function drawFormError(form, message) {
  qs(':scope > .admin-pub-form-error', form)?.remove();
  if (message) form.prepend(toElement(html`<div class="admin-pub-form-error">${icon('alert-circle', { size: 14 })} ${message}</div>`));
}

export function mount(container) {
  const state = {
    years: [],
    selectedYear: null,
    publications: [],
    loading: true,
    loadError: '',
    banner: null,
  };
  let disposed = false;
  const timers = new Set();

  render(container, html`
    <div>
      <div class="admin-pub-header">
        <div>
          <div class="admin-pub-eyebrow">${icon('book-open', { size: 14 })} FEED WORLD</div>
          <h1>Publication Management</h1>
          <p>Add, replace or remove Feed World's monthly issues.</p>
        </div>
        <button type="button" class="admin-pub-btn primary" data-action="add">${icon('plus', { size: 16 })} Add Publication</button>
      </div>

      <div class="admin-pub-toolbar">
        <label for="admin-pub-year">Year</label>
        <select id="admin-pub-year"></select>
      </div>

      <div class="admin-pub-table-wrap"></div>
    </div>`);

  const content = container.firstElementChild;
  const header = qs('.admin-pub-header', content);
  const toolbar = qs('.admin-pub-toolbar', content);
  const yearSelect = qs('#admin-pub-year', content);
  const tableWrap = qs('.admin-pub-table-wrap', content);

  const later = (fn, ms) => {
    const id = setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
  };

  // --- derived data ----------------------------------------------------------------------------

  // One group per month, each holding whichever of the three language editions are uploaded - the
  // table always renders all three PUBLICATION_LANGUAGES rows per month (missing ones render as
  // "Not uploaded"), with the Year/Month cells spanning all three. A database row whose PDF isn't
  // on the server counts as missing too (see isUploaded).
  const monthGroups = () => {
    const byMonth = new Map();
    state.publications.forEach((pub) => {
      if (!byMonth.has(pub.month)) byMonth.set(pub.month, {});
      if (isUploaded(pub)) byMonth.get(pub.month)[pub.language] = pub;
    });
    return Array.from(byMonth.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([month, byLanguage]) => ({ month, byLanguage }));
  };

  // Which languages already have an uploaded edition for a given year/month, so the Add dialog can
  // grey those out - only known for the currently-loaded year (selectedYear); for any other year
  // typed into the dialog this simply allows all three and leaves the duplicate check to the
  // backend, which enforces it regardless.
  const languagesTakenFor = (year, month) => {
    if (!month || Number(year) !== state.selectedYear) return [];
    const group = monthGroups().find((g) => g.month === Number(month));
    return group ? PUBLICATION_LANGUAGES.filter((lang) => group.byLanguage[lang]) : [];
  };

  const publicationById = (id) => state.publications.find((p) => String(p.id) === String(id));

  // --- drawing ---------------------------------------------------------------------------------

  let drawnBanners = null;
  const drawBanners = () => {
    const { banner, loadError } = state;
    const markup = html`
      ${banner && html`<div class="admin-pub-banner ${banner.type}">${icon(banner.type === 'success' ? 'check-circle-2' : 'alert-circle', { size: 16 })}${banner.message}</div>`}
      ${loadError && html`<div class="admin-pub-banner error">${icon('alert-circle', { size: 16 })} ${loadError}</div>`}`;
    if (String(markup) === drawnBanners) return;
    drawnBanners = String(markup);
    renderBetween(header, toolbar, markup);
  };

  let drawnOptions = null;
  const drawToolbar = () => {
    const options = String(html`
      ${state.years.length === 0 && html`<option value="">No publications yet</option>`}
      ${state.years.map((y) => html`<option value="${y}">${y}</option>`)}`);
    if (options !== drawnOptions) {
      drawnOptions = options;
      yearSelect.innerHTML = options;
    }
    yearSelect.value = String(state.selectedYear || '');
  };

  let drawnTable = null;
  const drawTable = () => {
    const { selectedYear } = state;
    const groups = monthGroups();
    let markup;
    if (state.loading) {
      markup = html`<div class="admin-pub-empty">${icon('loader-2', { size: 18, className: 'admin-pub-spin' })} Loading publications…</div>`;
    } else if (groups.length === 0) {
      markup = html`<div class="admin-pub-empty">No publications for ${selectedYear || 'this year'} yet.</div>`;
    } else {
      // Three rows per month - one per PUBLICATION_LANGUAGES entry, always in the same order - with
      // Year/Month spanning all three via rowspan. Below 560px every cell stacks into its own
      // block, which would leave rows 2-3 with no visible year/month, so a mobile-only header row
      // (hidden on desktop) carries that context instead.
      markup = html`
        <table class="admin-pub-table admin-pub-table-grouped">
          <thead>
            <tr>
              <th>Year</th>
              <th>Month</th>
              <th>Language</th>
              <th>Order</th>
              <th>Title</th>
              <th>Published</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${groups.map(({ month, byLanguage }) => html`
              <tr class="admin-pub-mobile-group-header">
                <td colspan="8">${selectedYear} — ${MONTH_NAMES[month - 1]}</td>
              </tr>
              ${PUBLICATION_LANGUAGES.map((lang, i) => {
                const pub = byLanguage[lang];
                return html`
                  <tr${i === 0 ? html` class="admin-pub-group-start"` : ''}>
                    ${i === 0 && html`
                      <td rowspan="3" class="admin-pub-group-cell" data-label="Year">${selectedYear}</td>
                      <td rowspan="3" class="admin-pub-group-cell" data-label="Month">${MONTH_NAMES[month - 1]}</td>`}
                    <td data-label="Language">${languageBadgeHtml(lang)}</td>
                    <td data-label="Order">${pub ? publicationOrder(pub) : i + 1}</td>
                    ${pub ? html`
                      <td data-label="Title">${pub.title}</td>
                      <td data-label="Published">${pub.publishedDate ? formatPublishedDate(pub.publishedDate) : '—'}</td>
                      <td data-label="Status">${statusBadgeHtml(true)}</td>
                      <td class="admin-pub-actions" data-label="Actions">
                        <button type="button" class="admin-pub-icon-btn" title="View PDF" data-action="view" data-id="${pub.id}">${icon('eye', { size: 15 })}</button>
                        <a class="admin-pub-icon-btn" href="${getPublicationFileUrl(pub.id, { download: true })}" title="Download PDF">${icon('download', { size: 15 })}</a>
                        <button type="button" class="admin-pub-icon-btn" title="Replace PDF" data-action="replace" data-id="${pub.id}">${icon('refresh-cw', { size: 15 })}</button>
                        <button type="button" class="admin-pub-icon-btn danger" title="Delete" data-action="delete" data-id="${pub.id}">${icon('trash-2', { size: 15 })}</button>
                      </td>` : html`
                      <td colspan="2" class="admin-pub-empty-slot" data-label="Title">—</td>
                      <td data-label="Status">${statusBadgeHtml(false)}</td>
                      <td class="admin-pub-actions" data-label="Actions">
                        <button type="button" class="admin-pub-btn small" data-action="upload" data-month="${month}" data-language="${lang}">${icon('plus', { size: 13 })} Upload ${lang}</button>
                      </td>`}
                  </tr>`;
              })}`)}
          </tbody>
        </table>`;
    }
    if (String(markup) === drawnTable) return;
    drawnTable = String(markup);
    render(tableWrap, markup);
  };

  const drawAll = () => {
    if (disposed) return;
    drawBanners();
    drawToolbar();
    drawTable();
  };

  const showBanner = (type, message) => {
    state.banner = { type, message };
    drawBanners();
    later(() => {
      if (state.banner && state.banner.message === message) {
        state.banner = null;
        drawBanners();
      }
    }, 4000);
  };

  // --- loading ---------------------------------------------------------------------------------

  // A year's publications come back already sorted by the database - newest month first, then
  // each month's editions by their `order` (Telugu 1, Hindi 2, English 3) - so they're used as-is.
  const loadPublications = async (year) => {
    if (!year) {
      state.publications = [];
      state.loading = false;
      drawAll();
      onPublicationsChanged();
      return;
    }
    state.loading = true;
    state.loadError = '';
    drawAll();
    try {
      const list = await fetchPublicationsByYear(year);
      if (disposed) return;
      state.publications = Array.isArray(list) ? list : [];
    } catch (e) {
      if (disposed) return;
      state.loadError = e.message || 'Failed to load publications.';
      state.publications = [];
    }
    state.loading = false;
    drawAll();
    onPublicationsChanged();
  };

  // The selected year - changing it scrolls to the top and loads that year's issues.
  const setSelectedYear = (year) => {
    if (year === state.selectedYear) return;
    state.selectedYear = year;
    scrollToTop();
    drawAll();
    loadPublications(year);
  };

  const loadYears = async () => {
    try {
      const data = await fetchPublicationYears();
      if (disposed) return [];
      const sorted = (data || []).map((y) => y.year).sort((a, b) => b - a);
      state.years = sorted;
      const prev = state.selectedYear;
      drawToolbar();
      setSelectedYear(prev && sorted.includes(prev) ? prev : sorted[0] || new Date().getFullYear());
      return sorted;
    } catch (e) {
      if (disposed) return [];
      state.loadError = e.message || 'Failed to load publication years.';
      drawBanners();
      return [];
    }
  };

  const refreshAfterChange = async (landOnYear) => {
    const yearBefore = state.selectedYear;
    const sorted = await loadYears();
    if (disposed) return;
    const yearToShow = landOnYear && sorted.includes(landOnYear) ? landOnYear : yearBefore;
    setSelectedYear(yearToShow);
    loadPublications(yearToShow);
  };

  // --- Add -------------------------------------------------------------------------------------

  let addModal = null; // { el, form, f (the form values), submitting, error }

  const closeAdd = () => {
    if (!addModal) return;
    addModal.el.remove();
    addModal = null;
  };

  // Whenever the dialog's year/month lands on a combination where the currently-picked language is
  // already taken, jump to the first still-available language, so the admin is never left with a
  // disabled option selected. Skipped once a preset has locked the language (the
  // "+ Upload {Language}" entry point) - that choice is fixed on purpose.
  const syncAddLanguage = () => {
    if (!addModal || addModal.f.languageLocked) return;
    const { f } = addModal;
    const taken = languagesTakenFor(f.year, f.month);
    if (taken.includes(f.language)) {
      const nextAvailable = PUBLICATION_LANGUAGES.find((lang) => !taken.includes(lang));
      if (nextAvailable) f.language = nextAvailable;
    }
  };

  // Updated in place, so the button that was just clicked keeps its focus.
  const drawAddLanguages = () => {
    if (!addModal || addModal.f.languageLocked) return;
    const { f } = addModal;
    const taken = languagesTakenFor(f.year, f.month);
    qsa('.admin-pub-lang-option', addModal.el).forEach((btn) => {
      const lang = btn.dataset.language;
      const isTaken = taken.includes(lang);
      const isSelected = f.language === lang;
      btn.className = `admin-pub-lang-option ${isSelected ? 'selected' : ''} ${isTaken ? 'taken' : ''}`;
      btn.disabled = isTaken;
      qs('.admin-pub-lang-option-note', btn).textContent = isTaken ? '✓ Already uploaded' : '○ Available';
    });
  };

  const drawAddBusy = () => {
    const { el, submitting } = addModal;
    qs('[data-role="modal-close"]', el).disabled = submitting;
    qs('[data-role="cancel"]', el).disabled = submitting;
    const submit = qs('button[type="submit"]', el);
    submit.disabled = submitting;
    render(submit, submitting ? spinnerLabel('Adding…') : 'Add Publication');
  };

  // `preset` lets the inline "Upload {language}" action (shown in a month row when that edition is
  // missing) open this same dialog pre-filled with the row's year/month/language.
  const openAdd = (preset) => {
    closeAdd();
    const f = emptyAddForm(preset?.year ?? state.selectedYear, preset?.month, preset?.language);
    const el = toElement(modalHtml({
      iconName: 'upload-cloud',
      title: 'Add Publication',
      body: html`
        <form class="admin-pub-form">
          <label>Title<input type="text" value="Feed World" disabled readonly /></label>
          <div class="admin-pub-form-row">
            <label>Year<input type="number" name="year" value="${f.year}" ${f.languageLocked ? 'disabled' : ''} required /></label>
            <label>Month<select name="month" ${f.languageLocked ? 'disabled' : ''} required>
              <option value="">Select month</option>
              ${MONTH_NAMES.map((m, idx) => html`<option value="${idx + 1}">${m}</option>`)}
            </select></label>
          </div>
          <div class="admin-pub-field-block">
            <span class="admin-pub-field-label">Language</span>
            ${f.languageLocked
              ? html`<div class="admin-pub-lang-locked">${languageBadgeHtml(f.language)}<span class="admin-pub-hint">Preselected from the row you opened this from.</span></div>`
              : html`<div class="admin-pub-lang-picker">${PUBLICATION_LANGUAGES.map((lang) => html`<button type="button" class="admin-pub-lang-option" data-language="${lang}">${languageBadgeHtml(lang)}<span class="admin-pub-lang-option-note"></span></button>`)}</div>`}
          </div>
          <label>PDF File<input type="file" name="file" accept="application/pdf" required /></label>
          <div class="admin-pub-form-actions">
            <button type="button" data-role="cancel">Cancel</button>
            <button type="submit" class="primary">Add Publication</button>
          </div>
        </form>`,
    }));
    const form = qs('form', el);
    form.elements.month.value = String(f.month);
    addModal = { el, form, f, submitting: false, error: '' };
    const modal = addModal;

    el.addEventListener('click', (e) => {
      if (e.target === el) {
        if (!modal.submitting) closeAdd();
        return;
      }
      if (e.target.closest('[data-role="modal-close"], [data-role="cancel"]')) {
        closeAdd();
        return;
      }
      const option = e.target.closest('.admin-pub-lang-option');
      if (option && !option.disabled) {
        f.language = option.dataset.language;
        syncAddLanguage();
        drawAddLanguages();
      }
    });
    form.elements.year.addEventListener('input', (e) => {
      f.year = e.target.value;
      syncAddLanguage();
      drawAddLanguages();
    });
    form.elements.month.addEventListener('change', (e) => {
      f.month = e.target.value;
      syncAddLanguage();
      drawAddLanguages();
    });
    form.elements.file.addEventListener('change', (e) => {
      f.file = e.target.files?.[0] || null;
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!f.file) {
        modal.error = 'Please choose a PDF file.';
        drawFormError(form, modal.error);
        return;
      }
      if (!f.month) {
        modal.error = 'Please select a month.';
        drawFormError(form, modal.error);
        return;
      }
      modal.submitting = true;
      modal.error = '';
      drawFormError(form, '');
      drawAddBusy();
      try {
        await createPublication(f);
        if (disposed) return;
        closeAdd();
        showBanner('success', `${f.language} publication for ${MONTH_NAMES[f.month - 1]} ${f.year} added.`);
        await refreshAfterChange(Number(f.year));
      } catch (err) {
        modal.error = err.message || 'Failed to add publication.';
        if (addModal === modal) drawFormError(form, modal.error);
      } finally {
        modal.submitting = false;
        if (addModal === modal) drawAddBusy();
      }
    });

    container.appendChild(el);
    syncAddLanguage();
    drawAddLanguages();
  };

  // --- Replace PDF -----------------------------------------------------------------------------

  let replaceModal = null;

  const closeReplace = () => {
    if (!replaceModal) return;
    replaceModal.el.remove();
    replaceModal = null;
  };

  const openReplace = (pub) => {
    closeReplace();
    const el = toElement(modalHtml({
      iconName: 'refresh-cw',
      title: 'Replace PDF',
      body: html`
        <form class="admin-pub-form">
          <div class="admin-pub-replace-summary">
            <div><span>Current Publication</span><strong>${pub.language} — ${pub.monthName} ${pub.year}</strong></div>
            <div><span>Current PDF</span><strong>Available</strong></div>
          </div>
          <label>New PDF<input type="file" name="file" accept="application/pdf" required /></label>
          <p class="admin-pub-hint">
            ${icon('alert-circle', { size: 13 })} This replaces the existing PDF and regenerates its cover thumbnail. This cannot be undone.
          </p>
          <div class="admin-pub-form-actions">
            <button type="button" data-role="cancel">Cancel</button>
            <button type="submit" class="primary">Replace PDF</button>
          </div>
        </form>`,
    }));
    const form = qs('form', el);
    const modal = { el, form, pub, file: null, submitting: false, error: '' };
    replaceModal = modal;

    const drawBusy = () => {
      qs('[data-role="modal-close"]', el).disabled = modal.submitting;
      qs('[data-role="cancel"]', el).disabled = modal.submitting;
      const submit = qs('button[type="submit"]', el);
      submit.disabled = modal.submitting;
      render(submit, modal.submitting ? spinnerLabel('Replacing…') : 'Replace PDF');
    };

    el.addEventListener('click', (e) => {
      if (e.target === el) {
        if (!modal.submitting) closeReplace();
        return;
      }
      if (e.target.closest('[data-role="modal-close"], [data-role="cancel"]')) closeReplace();
    });
    form.elements.file.addEventListener('change', (e) => {
      modal.file = e.target.files?.[0] || null;
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!modal.file) {
        modal.error = 'Please choose a new PDF file.';
        drawFormError(form, modal.error);
        return;
      }
      modal.submitting = true;
      modal.error = '';
      drawFormError(form, '');
      drawBusy();
      try {
        await replacePublicationPdf(pub.id, modal.file);
        if (disposed) return;
        showBanner('success', `PDF replaced for the ${pub.language} edition of ${pub.monthName} ${pub.year}.`);
        closeReplace();
        await refreshAfterChange();
      } catch (err) {
        modal.error = err.message || 'Failed to replace the PDF.';
        if (replaceModal === modal) drawFormError(form, modal.error);
      } finally {
        modal.submitting = false;
        if (replaceModal === modal) drawBusy();
      }
    });

    container.appendChild(el);
  };

  // --- Delete ----------------------------------------------------------------------------------

  let deleteModal = null;

  const closeDelete = () => {
    if (!deleteModal) return;
    deleteModal.el.remove();
    deleteModal = null;
  };

  const openDelete = (pub) => {
    closeDelete();
    const el = toElement(modalHtml({
      sizeClass: ' admin-pub-modal-narrow',
      iconName: 'trash-2',
      title: 'Delete Publication?',
      body: html`
        <div class="admin-pub-form">
          <p>Delete the <strong>${pub.language} edition of ${pub.monthName} ${pub.year}</strong>?</p>
          <p class="admin-pub-hint">This will permanently delete:</p>
          <ul class="admin-pub-delete-list">
            <li>${icon('file-text', { size: 13 })} PDF</li>
            <li>${icon('file-text', { size: 13 })} Thumbnail</li>
            <li>${icon('file-text', { size: 13 })} Metadata</li>
          </ul>
          <div class="admin-pub-form-actions">
            <button type="button" data-role="cancel">Cancel</button>
            <button type="button" class="danger" data-role="confirm">${icon('trash-2', { size: 14 })} Delete</button>
          </div>
        </div>`,
    }));
    const modal = { el, pub, submitting: false };
    deleteModal = modal;

    const drawBusy = () => {
      qs('[data-role="modal-close"]', el).disabled = modal.submitting;
      qs('[data-role="cancel"]', el).disabled = modal.submitting;
      const confirm = qs('[data-role="confirm"]', el);
      confirm.disabled = modal.submitting;
      render(confirm, modal.submitting ? spinnerLabel('Deleting…') : html`${icon('trash-2', { size: 14 })} Delete`);
    };

    // Whatever happens, the dialog closes and the outcome shows in the banner.
    const handleDeleteConfirm = async () => {
      const publicationsAtClick = state.publications;
      modal.submitting = true;
      drawBusy();
      try {
        await deletePublicationAdmin(pub.id);
        if (disposed) return;
        showBanner('success', `${pub.language} edition of ${pub.monthName} ${pub.year} deleted.`);
        const removedYear = pub.year;
        closeDelete();
        await refreshAfterChange(publicationsAtClick.length === 1 ? undefined : removedYear);
      } catch (err) {
        if (disposed) return;
        showBanner('error', err.message || 'Failed to delete publication.');
        closeDelete();
      } finally {
        modal.submitting = false;
      }
    };

    el.addEventListener('click', (e) => {
      if (e.target === el) {
        if (!modal.submitting) closeDelete();
        return;
      }
      if (e.target.closest('[data-role="modal-close"], [data-role="cancel"]')) closeDelete();
      else if (e.target.closest('[data-role="confirm"]')) handleDeleteConfirm();
    });

    container.appendChild(el);
  };

  // --- View ------------------------------------------------------------------------------------

  // Fetches the PDF into an in-memory blob and hands the viewer that blob URL instead of linking
  // straight to /file - opening /file directly leaves viewing at the mercy of the browser's own
  // "always download PDFs" setting.
  let viewModal = null; // { el, body, viewer, pdfUrl }
  let viewRequest = 0;

  const closeView = () => {
    viewRequest += 1;
    if (!viewModal) return;
    viewModal.viewer?.destroy();
    if (viewModal.pdfUrl) URL.revokeObjectURL(viewModal.pdfUrl);
    viewModal.el.remove();
    viewModal = null;
  };

  const openView = async (pub) => {
    closeView();
    const el = toElement(modalHtml({
      sizeClass: ' admin-pub-modal-wide',
      iconName: 'eye',
      title: `${pub.language} — ${pub.monthName} ${pub.year}`,
      body: html`
        <div class="admin-pub-view-body">
          <div class="admin-pub-empty">${icon('loader-2', { size: 18, className: 'admin-pub-spin' })} Loading PDF…</div>
        </div>`,
    }));
    const body = qs('.admin-pub-view-body', el);
    const modal = { el, body, viewer: null, pdfUrl: null };
    viewModal = modal;
    el.addEventListener('click', (e) => {
      if (e.target === el || e.target.closest('[data-role="modal-close"]')) closeView();
    });
    container.appendChild(el);

    const request = ++viewRequest;
    try {
      const blob = await fetchPublicationPdfBlob(pub.id);
      if (request !== viewRequest || disposed) return;
      modal.pdfUrl = URL.createObjectURL(blob);
      body.replaceChildren();
      modal.viewer = createPdfViewer(body, {
        fileUrl: modal.pdfUrl,
        downloadUrl: getPublicationFileUrl(pub.id, { download: true }),
        initialPageCount: pub.pageCount,
      });
    } catch (err) {
      if (request !== viewRequest || disposed) return;
      render(body, html`<div class="admin-pub-form-error">${icon('alert-circle', { size: 14 })} ${err.message || 'The PDF for this issue could not be loaded.'}</div>`);
    }
  };

  // While the Add dialog is open, a reload of the table can change which languages are taken.
  function onPublicationsChanged() {
    if (!addModal) return;
    syncAddLanguage();
    drawAddLanguages();
  }

  // --- events ----------------------------------------------------------------------------------

  on(content, 'click', '[data-action]', (_event, el) => {
    const { action } = el.dataset;
    if (action === 'add') {
      openAdd();
      return;
    }
    if (action === 'upload') {
      openAdd({ year: state.selectedYear, month: Number(el.dataset.month), language: el.dataset.language });
      return;
    }
    const pub = publicationById(el.dataset.id);
    if (!pub) return;
    if (action === 'view') openView(pub);
    else if (action === 'replace') openReplace(pub);
    else if (action === 'delete') openDelete(pub);
  });

  yearSelect.addEventListener('change', () => setSelectedYear(Number(yearSelect.value)));

  // --- start -----------------------------------------------------------------------------------

  drawAll();
  scrollToTop();
  loadYears();
  loadPublications(state.selectedYear);

  return () => {
    disposed = true;
    timers.forEach((id) => clearTimeout(id));
    timers.clear();
    closeView();
    closeAdd();
    closeReplace();
    closeDelete();
  };
}
