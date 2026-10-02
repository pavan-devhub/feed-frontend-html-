// Renders a PDF entirely in the browser with pdf.js - the React app's components/PdfViewer.jsx
// (react-pdf) rebuilt on pdf.js directly. The backend only ever streams the raw PDF bytes; every
// page image seen here is rasterized client-side from that stream, so the server never has to
// pre-render or store an image per page.
//
//   const viewer = createPdfViewer(containerEl, { fileUrl, downloadUrl, initialPageCount, onPageChange });
//   viewer.destroy();
//
// fileUrl is a URL string (e.g. a blob: URL) or a Blob. The viewer's root (.pdf-viewer) is appended
// to containerEl. It keeps react-pdf's DOM and class names (react-pdf__Document, react-pdf__Page,
// react-pdf__Page__canvas, react-pdf__message ...) so the stylesheets written for it still apply.
// Needs assets/css/components/pdf-viewer.css (+ the vendor/pdf-*-layer.css files react-pdf shipped).
(function () {
  'use strict';

  const pdfjsLib = window.pdfjsLib; // assets/js/vendor/pdfjs/pdf.min.js
  const { html, render, toElement } = FW.require('core/dom');
  const { icon } = FW.require('core/icons');
  // this script's own URL - relative paths are resolved against it
  const SCRIPT_URL = document.currentScript.src;

  const PDFJS_DIR = new URL('../vendor/pdfjs/', SCRIPT_URL);

  // Served over http(s), pdf.js parses PDFs in a background worker (pdf.worker.min.mjs). Browsers
  // won't start workers for pages opened from disk (file://), so there the worker code is loaded as
  // a classic script instead (pdf.worker.min.js sets window.pdfjsWorker) and pdf.js runs it on the
  // main thread - it picks that up by itself.
  let workerReady = null;
  function ensurePdfWorker() {
    if (!workerReady) {
      if (window.location.protocol === 'file:') {
        workerReady = window.pdfjsWorker ? Promise.resolve() : new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = new URL('pdf.worker.min.js', PDFJS_DIR).href;
          script.onload = () => resolve();
          script.onerror = () => {
            workerReady = null;
            reject(new Error('The PDF reader could not be loaded.'));
          };
          document.head.appendChild(script);
        });
      } else {
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdf.worker.min.mjs', PDFJS_DIR).href;
        workerReady = Promise.resolve();
      }
    }
    return workerReady;
  }

  // Left to itself pdf.js probes the file with a plain GET and then re-fetches it in byte ranges, so
  // a single "View Publication" click shows up as two hits on /{id}/file (and leaves an aborted
  // request behind on the server). One streamed request per publication is what this viewer needs.
  const PDF_OPTIONS = { disableRange: true };

  // Low enough that fit-to-width (below) can fit a landscape page on a phone.
  const MIN_SCALE = 0.25;
  const MAX_SCALE = 2.5;
  const SCALE_STEP = 0.1;

  const isAbortException = (error) => error?.name === 'RenderingCancelledException' || error?.name === 'AbortException';

  // react-pdf's <Message>: the wrapper it puts around the loading / error / no-data content.
  const messageHtml = (type, content) => html`<div class="react-pdf__message react-pdf__message--${type}">${content}</div>`;

  // react-pdf's <Page> root. `--user-unit` is the page's scale ("null" until the page has loaded,
  // exactly as react-pdf writes it).
  const pageStyle = (scale) => `--scale-round-x: 1px; --scale-round-y: 1px; --scale-factor: 1; --user-unit: ${scale}; --total-scale-factor: calc(var(--scale-factor) * var(--user-unit)); background-color: white; position: relative; min-width: min-content; min-height: min-content;`;

  function createPdfViewer(container, { fileUrl, downloadUrl, initialPageCount, onPageChange } = {}) {
    const state = {
      numPages: initialPageCount || null,
      pageNumber: 1,
      scale: 1,
      rotation: 0,
    };
    // The zoom at which page 1 exactly fits the viewer's width, capped at 100% - see
    // onDocumentLoadSuccess. What "Fit to page" returns to.
    let fitScale = 1;
    let destroyed = false;
    let loadingTask = null;
    let observer = null;
    let canvasArea = null;
    let printUrl = null;
    // page number -> { frame, pageEl, page, canvas, task }
    const pages = new Map();

    const root = toElement(html`
    <div class="pdf-viewer">
      <div class="pdf-toolbar">
        <div class="pdf-toolbar-group">
          <button type="button" class="pdf-tool-btn" title="Pages" aria-label="Pages">${icon('menu', { size: 18 })}</button>
          <span class="pdf-page-indicator">
            <input type="number" min="1" max="${state.numPages || 1}" value="${state.pageNumber}" />
            <span class="pdf-page-total">/ ${state.numPages || '-'}</span>
          </span>
        </div>

        <div class="pdf-toolbar-group">
          <button type="button" class="pdf-tool-btn" title="Zoom out" data-action="zoom-out">${icon('minus', { size: 16 })}</button>
          <button type="button" class="pdf-zoom-value" title="Reset zoom" data-action="reset-zoom">${Math.round(state.scale * 100)}%</button>
          <button type="button" class="pdf-tool-btn" title="Zoom in" data-action="zoom-in">${icon('plus', { size: 16 })}</button>
          <button type="button" class="pdf-tool-btn" title="Fit to page" data-action="fit">${icon('maximize', { size: 16 })}</button>
          <button type="button" class="pdf-tool-btn" title="Rotate" data-action="rotate">${icon('rotate-cw', { size: 16 })}</button>
        </div>

        <div class="pdf-toolbar-group">
          <a class="pdf-tool-btn" href="${downloadUrl}" title="Download">${icon('download', { size: 16 })}</a>
          <button type="button" class="pdf-tool-btn" title="Print" data-action="print">${icon('printer', { size: 16 })}</button>
        </div>
      </div>

      <div class="react-pdf__Document">${fileUrl
          ? messageHtml('loading', html`<div class="pdf-status">Loading publication…</div>`)
          : messageHtml('no-data', 'No PDF file specified.')}</div>
    </div>`);

    const pageInput = root.querySelector('.pdf-page-indicator input');
    const pageTotal = root.querySelector('.pdf-page-total');
    const zoomValue = root.querySelector('.pdf-zoom-value');
    const documentEl = root.querySelector('.react-pdf__Document');

    // --- toolbar -------------------------------------------------------------------------------

    // The page box is a controlled number input: like React's, it is only rewritten when its number
    // differs from the current page (so "01" stays as typed, an emptied box snaps back).
    const syncPageInput = () => {
      // eslint-disable-next-line eqeqeq
      if (pageInput.value != state.pageNumber) pageInput.value = String(state.pageNumber);
    };

    const drawToolbar = () => {
      pageInput.max = String(state.numPages || 1);
      syncPageInput();
      pageTotal.textContent = `/ ${state.numPages || '-'}`;
      zoomValue.textContent = `${Math.round(state.scale * 100)}%`;
    };

    const setPageNumber = (next) => {
      if (next === state.pageNumber) return;
      state.pageNumber = next;
      drawToolbar();
      if (onPageChange) onPageChange(next);
    };

    const goToPage = (target) => {
      const clamped = Math.min(Math.max(target, 1), state.numPages || target);
      setPageNumber(clamped);
      pages.get(clamped)?.frame.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // --- pages ---------------------------------------------------------------------------------

    // Draws one page onto a fresh canvas (react-pdf re-keys the canvas on every scale/rotation
    // change). The canvas stays hidden until pdf.js has finished painting it.
    const drawPage = (entry) => {
      const { page } = entry;
      if (!page || destroyed) return;
      if (entry.task) entry.task.cancel();

      const { scale, rotation } = state;
      const devicePixelRatio = window.devicePixelRatio || 1;
      const renderViewport = page.getViewport({ scale: scale * devicePixelRatio, rotation });
      const viewport = page.getViewport({ scale, rotation });

      entry.pageEl.setAttribute('style', pageStyle(scale));
      page.cleanup();

      const canvas = document.createElement('canvas');
      canvas.className = 'react-pdf__Page__canvas';
      canvas.dir = 'ltr';
      canvas.style.display = 'block';
      canvas.style.userSelect = 'none';
      canvas.width = renderViewport.width;
      canvas.height = renderViewport.height;
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      canvas.style.visibility = 'hidden';

      if (entry.canvas) {
        // Zeroing the size makes most browsers release the old canvas's memory straight away.
        entry.canvas.width = 0;
        entry.canvas.height = 0;
        entry.canvas.replaceWith(canvas);
      } else {
        entry.pageEl.replaceChildren(canvas);
      }
      entry.canvas = canvas;

      const task = page.render({
        annotationMode: pdfjsLib.AnnotationMode.ENABLE,
        canvas,
        canvasContext: canvas.getContext('2d', { alpha: false }),
        viewport: renderViewport,
      });
      entry.task = task;
      task.promise
        .then(() => {
          if (entry.task === task) entry.task = null;
          canvas.style.visibility = '';
        })
        .catch((error) => {
          if (entry.task === task) entry.task = null;
          if (!isAbortException(error)) console.warn('[PdfViewer] page render failed:', error);
        });
    };

    const redrawAllPages = () => pages.forEach(drawPage);

    // Tracks which page is most in view, for the page box - rebuilt whenever the layout changes
    // (zoom / rotation), like the React effect, so the box updates straight after a zoom too.
    const observePages = () => {
      if (observer) observer.disconnect();
      observer = null;
      if (!canvasArea || !state.numPages || typeof IntersectionObserver === 'undefined') return;
      observer = new IntersectionObserver(
        (entries) => {
          const visiblePage = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
          if (visiblePage) {
            const nextPage = Number(visiblePage.target.dataset.pageNumber);
            if (nextPage && nextPage !== state.pageNumber) setPageNumber(nextPage);
          }
        },
        { root: canvasArea, threshold: [0.25, 0.5, 0.75] },
      );
      pages.forEach((entry) => observer.observe(entry.frame));
    };

    const setScale = (next) => {
      if (next === state.scale) return;
      state.scale = next;
      drawToolbar();
      redrawAllPages();
      observePages();
    };

    const setRotation = (next) => {
      if (next === state.rotation) return;
      state.rotation = next;
      redrawAllPages();
      observePages();
    };

    // --- document ------------------------------------------------------------------------------

    const onDocumentLoadSuccess = (pdf) => {
      state.numPages = pdf.numPages;

      canvasArea = document.createElement('div');
      canvasArea.className = 'pdf-canvas-area';
      for (let n = 1; n <= pdf.numPages; n += 1) {
        const frame = toElement(html`
        <div class="pdf-page-frame" data-page-number="${n}">
          <div class="react-pdf__Page" data-page-number="${n}" style="${pageStyle(null)}">${messageHtml('loading', html`<div class="pdf-page-loading">Loading page ${n}…</div>`)}</div>
        </div>`);
        pages.set(n, { frame, pageEl: frame.firstElementChild, page: null, canvas: null, task: null });
        canvasArea.appendChild(frame);
      }
      documentEl.replaceChildren(canvasArea);
      canvasArea.scrollTop = 0;
      canvasArea.scrollLeft = 0;
      drawToolbar();
      observePages();

      // Open narrow screens (phones, a slim admin pane) at fit-to-width rather than 100%, which
      // would leave the page wider than the viewer. Wide screens still open at 100%. The pages are
      // painted once that zoom is known.
      const fitReady = pdf.getPage(1).then((page) => {
        if (destroyed || !canvasArea) return;
        const style = getComputedStyle(canvasArea);
        const available = canvasArea.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
        const natural = page.getViewport({ scale: 1 }).width;
        if (!(available > 0 && natural > 0)) return;
        fitScale = Math.max(MIN_SCALE, Math.min(1, Math.floor((available / natural) * 100) / 100));
        setScale(fitScale);
      }).catch(() => {
        // page 1 unreadable - its own frame shows the error; just stay at 100%
      });

      pages.forEach((entry, n) => {
        Promise.all([pdf.getPage(n), fitReady])
          .then(([page]) => {
            if (destroyed) return;
            entry.page = page;
            drawPage(entry);
          })
          .catch((error) => {
            if (destroyed) return;
            console.warn(`[PdfViewer] page ${n} could not be loaded:`, error);
            render(entry.pageEl, messageHtml('error', 'Failed to load the page.'));
          });
      });
    };

    // Keep the actual pdf.js failure (HTTP status, CORS rejection, worker mismatch, corrupt file...)
    // instead of swallowing it behind a generic panel.
    const onDocumentLoadError = (error) => {
      console.error('[PdfViewer] pdf.js could not load the document:', error);
      render(documentEl, messageHtml('error', html`<div class="pdf-status pdf-status-error">This PDF could not be loaded.${error && error.message && html`<div class="pdf-status-detail">${error.message}</div>`}</div>`));
    };

    const load = async () => {
      let source;
      try {
        await ensurePdfWorker();
        source = typeof fileUrl === 'string'
          ? { url: fileUrl }
          : { data: new Uint8Array(await fileUrl.arrayBuffer()) };
      } catch (error) {
        if (!destroyed) onDocumentLoadError(error);
        return;
      }
      if (destroyed) return;
      const task = pdfjsLib.getDocument({ ...source, ...PDF_OPTIONS });
      loadingTask = task;
      let pdf;
      try {
        pdf = await task.promise;
      } catch (error) {
        if (!destroyed && !task.destroyed) onDocumentLoadError(error);
        return;
      }
      if (destroyed || task.destroyed) return;
      onDocumentLoadSuccess(pdf);
    };

    // --- events --------------------------------------------------------------------------------

    const handlePrint = () => {
      let url = fileUrl;
      if (fileUrl && typeof fileUrl !== 'string') {
        if (!printUrl) printUrl = URL.createObjectURL(fileUrl);
        url = printUrl;
      }
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.addEventListener('load', () => printWindow.print());
      }
    };

    pageInput.addEventListener('input', () => {
      goToPage(Number(pageInput.value) || 1);
      syncPageInput();
    });

    root.querySelector('.pdf-toolbar').addEventListener('click', (e) => {
      const button = e.target.closest('[data-action]');
      if (!button) return;
      switch (button.dataset.action) {
        case 'zoom-in':
          setScale(Math.min(MAX_SCALE, +(state.scale + SCALE_STEP).toFixed(2)));
          break;
        case 'zoom-out':
          setScale(Math.max(MIN_SCALE, +(state.scale - SCALE_STEP).toFixed(2)));
          break;
        case 'reset-zoom':
          setScale(1);
          break;
        case 'fit':
          setScale(fitScale);
          break;
        case 'rotate':
          setRotation((state.rotation + 90) % 360);
          break;
        case 'print':
          handlePrint();
          break;
        default:
      }
    });

    container.appendChild(root);
    if (onPageChange) onPageChange(state.pageNumber);
    if (fileUrl) load();

    return {
      destroy() {
        if (destroyed) return;
        destroyed = true;
        if (observer) observer.disconnect();
        pages.forEach((entry) => {
          if (entry.task) entry.task.cancel();
          if (entry.canvas) {
            entry.canvas.width = 0;
            entry.canvas.height = 0;
          }
        });
        pages.clear();
        if (loadingTask) loadingTask.destroy();
        if (printUrl) URL.revokeObjectURL(printUrl);
        root.remove();
      },
    };
  }

  FW.define('components/pdf-viewer', { createPdfViewer });
})();
