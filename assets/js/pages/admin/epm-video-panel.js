// The "Hero video" panel at the top of the images section's EPM page tab - the full-width video
// under the navbar at the top of the EPM page. "Edit video" uploads a new one (stored in the
// server's EPM storage folder, replacing any earlier upload); "Remove" goes back to the page's
// built-in video. Converted from src/pages/admin/epm/EpmVideoPanel.jsx.
//
//   const panel = mountVideoPanel({ showBanner });  container.append(panel.el);  ...  panel.destroy();
import { html, render, on, toElement } from '../../core/dom.js';
import { icon } from '../../core/icons.js';
import { assetUrl } from '../../core/router.js';
import { deleteEpmVideo, fetchEpmVideoAdmin, uploadEpmVideo, VIDEO_MAX_BYTES } from '../../api/admin-epm-api.js';
import { getEpmVideoUrl } from '../../api/epm-api.js';
import { confirmDialog, loadingHtml } from './admin-ui.js';
import { formatDateTime, formatSize } from './admin-utils.js';

const VIDEO_ACCEPT = 'video/mp4,video/webm';

const MAX_LABEL = `${VIDEO_MAX_BYTES / (1024 * 1024)} MB`;

// What the public EPM page plays until a video is uploaded (see pages/epm.html).
const BUILT_IN_VIDEO = assetUrl('videos/vid.mp4');

// Replaces the nodes between `start` and `end` (exclusive; end null = to the last child), so a
// block that React rendered conditionally can come and go without an extra wrapper element.
function renderBetween(start, end, content) {
  while (start.nextSibling && start.nextSibling !== end) start.nextSibling.remove();
  const tpl = document.createElement('template');
  render(tpl, content);
  start.parentNode.insertBefore(tpl.content, end);
}

export function mountVideoPanel({ showBanner }) {
  // video: undefined = still loading, null = none uploaded (built-in video playing)
  const state = { video: undefined, error: '', progress: null };
  let disposed = false;
  let confirmBackdrop = null;
  const uploading = () => state.progress !== null;

  const el = toElement(html`
    <section class="adm-block">
      <div class="adm-block-head">
        <div>
          <h3>Hero video</h3>
          <p>The full-width video right under the navbar at the top of the EPM page. It plays muted and on a loop, so a short clip works best. MP4 or WebM, up to ${MAX_LABEL}.</p>
        </div>
        <div class="adm-inline-actions"></div>
        <input type="file" accept="${VIDEO_ACCEPT}" hidden data-video="input" />
      </div>
      <!--video-->
    </section>`);
  const head = el.querySelector('.adm-block-head');
  const actionsEl = head.querySelector('.adm-inline-actions');
  const fileInput = head.querySelector('[data-video="input"]');
  const videoMarker = Array.from(el.childNodes).find((n) => n.nodeType === Node.COMMENT_NODE);

  const drawActions = () => render(actionsEl, html`
    <button type="button" class="admin-pub-btn primary adm-btn-sm" data-video="edit" ${uploading() || state.video === undefined ? 'disabled' : ''}>
      ${uploading() ? icon('loader-2', { size: 15, className: 'admin-pub-spin' }) : icon('pencil', { size: 15 })} Edit video
    </button>
    ${state.video && html`
      <button type="button" class="admin-pub-btn adm-btn-danger adm-btn-sm" data-video="remove" ${uploading() ? 'disabled' : ''}>
        ${icon('trash-2', { size: 15 })} Remove
      </button>`}`);

  const drawStatus = () => renderBetween(head, videoMarker, html`
    ${uploading() && html`<p class="admin-pub-hint adm-hint-tight">Uploading… ${Math.round(state.progress * 100)}%</p>`}
    ${state.error && html`<div class="admin-pub-form-error">${state.error}</div>`}`);

  // The <video> is only rebuilt when its source changes (React keyed it by URL), so playback isn't
  // reset by unrelated redraws.
  let videoKey;
  const drawVideo = () => {
    const { video } = state;
    if (video === undefined) {
      videoKey = undefined;
      renderBetween(videoMarker, null, loadingHtml('Loading video…'));
      return;
    }
    const src = video ? getEpmVideoUrl(video.videoUrl) : BUILT_IN_VIDEO;
    const caption = video
      ? [formatSize(video.fileSize), `updated ${formatDateTime(video.updatedAt)}`].filter(Boolean).join(' · ')
      : 'Built-in video - shown until you upload one';
    const box = el.querySelector(':scope > .adm-video');
    if (box && videoKey === src) {
      box.className = `adm-video ${video ? '' : 'is-default'}`;
      box.querySelector(':scope > .adm-cell-sub').textContent = caption;
      return;
    }
    videoKey = src;
    renderBetween(videoMarker, null, html`
      <div class="adm-video ${video ? '' : 'is-default'}">
        <div class="adm-video-media">
          <video src="${src}" controls muted playsinline preload="metadata"></video>
        </div>
        <div class="adm-cell-sub">${caption}</div>
      </div>`);
  };

  const draw = () => {
    if (disposed) return;
    drawActions();
    drawStatus();
    drawVideo();
  };

  const load = () => {
    fetchEpmVideoAdmin()
      .then((data) => {
        state.video = data;
        state.error = '';
      })
      .catch((e) => {
        state.error = e.message;
        state.video = null;
      })
      .then(draw);
  };

  const upload = async (file) => {
    if (file.size > VIDEO_MAX_BYTES) {
      showBanner('error', `“${file.name}” is ${formatSize(file.size)} - videos must be ${MAX_LABEL} or smaller.`);
      return;
    }
    state.progress = 0;
    draw();
    try {
      const video = await uploadEpmVideo(file, (p) => {
        state.progress = p;
        if (!disposed) drawStatus();
      });
      state.video = video;
      showBanner('success', 'Video updated - the EPM page now plays it.');
    } catch (e) {
      showBanner('error', e.message);
    } finally {
      state.progress = null;
      draw();
    }
  };

  const askRemove = () => {
    const promise = confirmDialog({
      title: 'Remove video?',
      confirmLabel: 'Remove',
      content: html`
        <p>Remove the uploaded video from the EPM page? The file is deleted from the server too.</p>
        <p class="admin-pub-hint">The page goes back to its built-in video.</p>`,
      onConfirm: async () => {
        await deleteEpmVideo();
        state.video = null;
        draw();
        showBanner('success', 'Video removed - the EPM page is back to its built-in video.');
      },
    });
    confirmBackdrop = document.body.lastElementChild;
    promise.finally(() => { confirmBackdrop = null; });
  };

  const offs = [
    on(el, 'click', '[data-video="edit"]', () => fileInput.click()),
    on(el, 'click', '[data-video="remove"]', askRemove),
    on(el, 'change', '[data-video="input"]', (e, input) => {
      const file = input.files?.[0];
      input.value = '';
      if (file) upload(file);
    }),
  ];

  draw();
  load();

  return {
    el,
    destroy() {
      disposed = true;
      offs.forEach((off) => off());
      if (confirmBackdrop) {
        const x = confirmBackdrop.querySelector('[data-action="modal-close"]');
        if (x && !x.disabled) x.click();
        else confirmBackdrop.remove();
      }
    },
  };
}
