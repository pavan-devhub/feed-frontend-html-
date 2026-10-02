// One Feed World issue, full-window, in its own browser tab (pages/publication-reader.html?id=<id>) -
// what a cover or an archive month on the publications page opens (see utils/publication-links.js).
// The PDF comes through the same authenticated /stream request as the admin viewer and is rendered
// with pdf.js, so the tab's address never carries the JWT and is safe to share.
(function () {
  'use strict';

  const { initPage } = FW.require('core/page');
  const { html, render, on, qs } = FW.require('core/dom');
  const { icon } = FW.require('core/icons');
  const { getToken } = FW.require('core/auth');
  const {
    fetchPublicationById,
    fetchPublicationPdfBlob,
    getPublicationFileUrl,
    PUBLICATION_LANGUAGE_LABELS,
  } = FW.require('api/publications-api');
  const {
    loginAndReturnHere,
    openAppPage,
    readerIdFromLocation,
  } = FW.require('utils/publication-links');
  const { callerIsAdmin, isReleased } = FW.require('utils/publication-release');
  const { createPdfViewer } = FW.require('components/pdf-viewer');
  const { openShareDialog } = FW.require('components/share-dialog');

  const isAuthError = (e) => e?.status === 401 || e?.status === 403;

  const NOT_AVAILABLE = "This publication isn't available. It may not be published yet, or the link is incomplete.";

  // Resolves (never rejects) to what the tab should show.
  async function loadIssue(id) {
    // No ?id= at all - nothing to look up.
    if (!id) return { failure: NOT_AVAILABLE };
    let detail;
    try {
      detail = await fetchPublicationById(id);
    } catch (e) {
      if (isAuthError(e)) return { needsLogin: true };
      // A 404 won't change on retry; anything else (server down, network blip) might. It's also
      // what the backend answers for an issue that isn't released yet.
      return e?.status === 404
        ? { failure: NOT_AVAILABLE }
        : { failure: 'This publication could not be loaded right now. Please check your connection and try again.', retryable: true };
    }
    // Same release rule as the backend, checked here too - see utils/publication-release.js. Stops
    // before the PDF is ever requested.
    if (!isReleased(detail) && !callerIsAdmin()) {
      return { failure: NOT_AVAILABLE };
    }
    if (!detail.pdfAvailable) {
      return { detail, pdfError: "This issue's PDF hasn't been uploaded yet. Please check back soon." };
    }
    try {
      return { detail, blob: await fetchPublicationPdfBlob(id) };
    } catch (e) {
      if (isAuthError(e)) return { needsLogin: true };
      return { detail, pdfError: e.message || 'The PDF for this issue could not be loaded.' };
    }
  }

  const session = initPage({ page: 'publication-reader', access: 'shared' });

  if (session) {
    const id = readerIdFromLocation();
    const downloadUrl = getPublicationFileUrl(id, { download: true });

    const readerEl = qs('.pub-reader');
    const barEl = qs('.pub-reader-bar');
    const headingEl = qs('.pub-reader-heading');
    const stageEl = qs('.pub-reader-stage');

    const state = {
      needsLogin: !getToken(),
      issue: null,
      failure: '',
      retryable: false,
      pdfUrl: null,
      pdfError: '',
      attempt: 0,
    };

    let viewer = null;
    let actionsIssue; // the issue the action buttons were last drawn for

    const drawHeading = () => {
      const { issue } = state;
      render(headingEl, issue
        ? html`
        <h1>${issue.title} – ${issue.monthName} ${issue.year}</h1>
        <div class="pub-reader-meta">
          <span class="pub-reader-lang">${PUBLICATION_LANGUAGE_LABELS[issue.language] || issue.language}</span>
          ${issue.pageCount ? html`<span>${icon('file-text', { size: 13 })} ${issue.pageCount} pages</span>` : null}
        </div>`
        : !state.needsLogin && !state.failure && html`<div class="pub-reader-heading-skeleton" aria-hidden="true"></div>`);
      document.title = issue
        ? `${issue.title} – ${issue.monthName} ${issue.year} (${issue.language})`
        : 'Feed World Publication';
    };

    // Redrawn only when the issue itself changes, so the Share button keeps its focus (the share
    // dialog hands focus back to it on close).
    const drawActions = () => {
      const { issue } = state;
      if (issue === actionsIssue) return;
      actionsIssue = issue;
      qs('.pub-reader-actions', barEl)?.remove();
      if (!issue) return;
      const holder = document.createElement('template');
      render(holder, html`
      <div class="pub-reader-actions">
        <button type="button" class="pub-reader-btn" data-action="share" aria-haspopup="dialog">${icon('share-2', { size: 16 })} <span>Share</span></button>
        ${issue.pdfAvailable && html`<a class="pub-reader-btn is-primary" href="${downloadUrl}">${icon('download', { size: 16 })} <span>Download</span></a>`}
      </div>`);
      barEl.appendChild(holder.content);
    };

    const drawStage = () => {
      if (state.pdfUrl) {
        if (!viewer) {
          stageEl.replaceChildren();
          viewer = createPdfViewer(stageEl, {
            fileUrl: state.pdfUrl,
            downloadUrl,
            initialPageCount: state.issue?.pageCount,
          });
        }
        return;
      }
      if (viewer) {
        viewer.destroy();
        viewer = null;
      }
      const loading = !state.needsLogin && !state.failure && !state.pdfUrl && !state.pdfError;
      render(stageEl, html`
      ${state.needsLogin && html`
        <div class="pub-reader-panel">
          <div class="pub-reader-panel-icon">${icon('lock', { size: 26 })}</div>
          <h2>Log in to read this issue</h2>
          <p>Feed World publications are available to logged-in members. You'll come straight back here after logging in.</p>
          <button type="button" class="pub-reader-btn is-primary" data-action="login">Log In</button>
        </div>`}

      ${state.failure && html`
        <div class="pub-reader-panel">
          <div class="pub-reader-panel-icon is-error">${icon('alert-circle', { size: 26 })}</div>
          <h2>Publication unavailable</h2>
          <p>${state.failure}</p>
          <div class="pub-reader-panel-actions">
            ${state.retryable && html`<button type="button" class="pub-reader-btn" data-action="retry">${icon('refresh-cw', { size: 15 })} Try again</button>`}
            <button type="button" class="pub-reader-btn is-primary" data-action="all-publications">All publications</button>
          </div>
        </div>`}

      ${loading && html`
        <div class="pub-reader-panel is-quiet" role="status">
          ${icon('loader-2', { size: 28, className: 'pub-reader-spin' })}
          <p>Opening publication…</p>
        </div>`}

      ${state.pdfError && html`
        <div class="pub-reader-panel">
          <div class="pub-reader-panel-icon is-error">${icon('alert-circle', { size: 26 })}</div>
          <h2>This PDF couldn't be opened</h2>
          <p>${state.pdfError}</p>
          <div class="pub-reader-panel-actions">
            <button type="button" class="pub-reader-btn" data-action="retry">${icon('refresh-cw', { size: 15 })} Try again</button>
            ${state.issue?.pdfAvailable && html`<a class="pub-reader-btn is-primary" href="${downloadUrl}">${icon('download', { size: 15 })} Download instead</a>`}
          </div>
        </div>`}`);
    };

    const draw = () => {
      drawHeading();
      drawActions();
      drawStage();
    };

    // One load per attempt; a result that arrives after a retry started is dropped, and the object
    // URL (which pins the PDF bytes in memory) is released when the next attempt begins.
    let objectUrl = null;
    const releaseObjectUrl = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    };

    const load = () => {
      if (state.needsLogin) return;
      const attempt = state.attempt;
      loadIssue(id).then((result) => {
        if (attempt !== state.attempt) return;
        if (result.needsLogin) {
          state.needsLogin = true;
          draw();
          return;
        }
        state.failure = result.failure || '';
        state.retryable = !!result.retryable;
        state.issue = result.detail || null;
        state.pdfError = result.pdfError || '';
        if (result.blob) {
          objectUrl = URL.createObjectURL(result.blob);
          state.pdfUrl = objectUrl;
        }
        draw();
      });
    };

    const retry = () => {
      if (viewer) {
        viewer.destroy();
        viewer = null;
      }
      releaseObjectUrl();
      state.failure = '';
      state.pdfError = '';
      state.pdfUrl = null;
      state.attempt += 1;
      draw();
      load();
    };

    on(readerEl, 'click', '[data-action]', (_event, el) => {
      switch (el.dataset.action) {
        case 'all-publications':
          openAppPage('feedworld');
          break;
        case 'login':
          loginAndReturnHere();
          break;
        case 'retry':
          retry();
          break;
        case 'share':
          if (state.issue) openShareDialog({ publication: state.issue });
          break;
        default:
      }
    });

    draw();
    load();
  }
})();
