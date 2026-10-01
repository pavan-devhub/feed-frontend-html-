// Admin panel -> EPM -> Page & Gallery Images. Converted from src/pages/admin/epm/EpmImagesAdmin.jsx.
// The video and every picture on the EPM page, every picture section of the EPM gallery page, and
// (third tab) the gallery's states -> districts -> photos.
// mount(container, ctx) renders the section into <main class="adm-main"> and returns a cleanup.
import { html, render, on, toElement } from '../../core/dom.js';
import { icon } from '../../core/icons.js';
import { assetUrl } from '../../core/router.js';
import {
  fetchGalleryBlocks, fetchBlockImages, uploadBlockImage, updateBlockImage, replaceBlockImage,
  reorderBlockImages, deleteBlockImage, importGalleryFromStorage,
} from '../../api/admin-epm-api.js';
import { confirmDialog, createBanner, sectionHeaderHtml, loadingHtml } from './admin-ui.js';
import {
  imageGridHtml, wireImageGrid, openImageDetailsModal, uploadButtonHtml, updateUploadButton, wireUploadButtons,
} from './epm-image-grid.js';
import { mountGalleryRegions } from './epm-gallery-regions.js';
import { mountVideoPanel } from './epm-video-panel.js';

// What the public EPM page shows for a block the admin hasn't uploaded anything to yet
// (see pages/epm.html) - previewed here so it's clear what an upload will replace.
const BUILT_IN = {
  'epm-stats': {
    defaults: [assetUrl('images/epm_stat_1.avif'), assetUrl('images/epm_stat_2.avif'), assetUrl('images/epm_stat_3.avif')],
    slots: ['EPMs Conducted', 'Districts Covered', 'Total Attendees'],
  },
  'epm-calendar': { defaults: [assetUrl('images/epm_calendar.avif')] },
};

const TABS = [
  { id: 'EPM_PAGE', label: 'EPM page', icon: 'layout-template' },
  { id: 'GALLERY_PAGE', label: 'Gallery page sections', icon: 'gallery-horizontal-end' },
  { id: 'REGIONS', label: 'States & districts', icon: 'map' },
];

// Replaces the nodes between `start` and `end` (exclusive; end null = to the last child), so a
// block that React rendered conditionally can come and go without an extra wrapper element.
function renderBetween(start, end, content) {
  while (start.nextSibling && start.nextSibling !== end) start.nextSibling.remove();
  const tpl = document.createElement('template');
  render(tpl, content);
  start.parentNode.insertBefore(tpl.content, end);
}

export function mount(container) {
  const state = {
    tab: 'EPM_PAGE',
    blocks: [],
    loading: true,
    error: '',
    scanning: false,
    refreshKey: 0,
  };
  let disposed = false;
  // Mounted children of the current tab: the gallery regions, or the video panel + block panels.
  let regions = null;
  let blockList = null;
  let videoPanel = null;
  let panels = new Map(); // `${block.id}-${refreshKey}` -> block panel (React's keys)

  const scanButtonContent = () => html`${icon('scan-search', { size: 16 })} ${state.scanning ? 'Scanning…' : 'Scan storage folder'}`;

  render(container, html`
    ${sectionHeaderHtml({
      eyebrow: 'EPM',
      icon: 'images',
      title: 'Page & Gallery Images',
      description: 'The video and every picture on the EPM page, and every picture on the EPM gallery page. Files are stored on the server; their names, captions and order are kept in the database.',
      actions: html`
        <button type="button" class="admin-pub-btn adm-btn-secondary" data-action="scan"
          title="Register image files that were copied straight into the server's storage folder">
          ${scanButtonContent()}
        </button>`,
    })}
    <div data-slot="banner" style="display: contents;"></div>
    <div class="adm-tabs" role="tablist">
      ${TABS.map((t) => html`
        <button type="button" role="tab" aria-selected="${String(state.tab === t.id)}" class="adm-tab ${state.tab === t.id ? 'active' : ''}" data-tab="${t.id}">
          ${icon(t.icon, { size: 15 })} ${t.label}
        </button>`)}
    </div>`);
  const scanButton = container.querySelector('[data-action="scan"]');
  const bannerSlot = container.querySelector('[data-slot="banner"]');
  const banner = createBanner(bannerSlot);
  const showBanner = (type, message) => {
    if (!disposed) banner.show(type, message);
  };
  const tabsEl = container.querySelector('.adm-tabs');

  // --- drawing ---

  const drawHeader = () => {
    scanButton.disabled = state.scanning;
    render(scanButton, scanButtonContent());
  };

  const drawError = () => renderBetween(bannerSlot, tabsEl, state.error && html`<div class="admin-pub-banner error">${state.error}</div>`);

  const drawTabs = () => {
    tabsEl.querySelectorAll('[data-tab]').forEach((b) => {
      const active = b.dataset.tab === state.tab;
      b.className = `adm-tab ${active ? 'active' : ''}`;
      b.setAttribute('aria-selected', String(active));
    });
  };

  const unmountContent = () => {
    regions?.destroy();
    regions = null;
    videoPanel?.destroy();
    videoPanel = null;
    panels.forEach((p) => p.destroy());
    panels = new Map();
    blockList = null;
    renderBetween(tabsEl, null, '');
  };

  // React reconciles <BlockPanel key={`${b.id}-${refreshKey}`}>: panels whose key survives keep
  // their state and get the new block; the rest are unmounted / mounted.
  const syncBlocks = () => {
    const wanted = state.blocks.filter((b) => b.page === state.tab);
    const next = new Map();
    wanted.forEach((b) => {
      const key = `${b.id}-${state.refreshKey}`;
      const existing = panels.get(key);
      if (existing) existing.setBlock(b);
      next.set(key, existing || mountBlockPanel(b, { showBanner, onCountChange: loadBlocks }));
    });
    panels.forEach((p, key) => { if (!next.has(key)) p.destroy(); });
    panels = next;
    // Put the panel elements in order after the video panel, moving only what is out of place.
    let prev = videoPanel ? videoPanel.el : null;
    panels.forEach((p) => {
      const expected = prev ? prev.nextElementSibling : blockList.firstElementChild;
      if (p.el !== expected) {
        if (prev) prev.after(p.el);
        else blockList.prepend(p.el);
      }
      prev = p.el;
    });
    Array.from(blockList.children).forEach((child) => {
      if (child !== videoPanel?.el && ![...panels.values()].some((p) => p.el === child)) child.remove();
    });
  };

  // The content under the tabs: regions, the loading line, or the block list.
  const drawContent = () => {
    if (disposed) return;
    if (state.tab === 'REGIONS') {
      if (!regions) {
        unmountContent();
        regions = mountGalleryRegions({ showBanner });
        container.append(regions.el);
      }
      return;
    }
    if (state.loading) {
      unmountContent();
      renderBetween(tabsEl, null, loadingHtml('Loading image sections…'));
      return;
    }
    if (!blockList) {
      unmountContent();
      blockList = toElement(html`<div class="adm-block-list"></div>`);
      container.append(blockList);
      if (state.tab === 'EPM_PAGE') {
        videoPanel = mountVideoPanel({ showBanner });
        blockList.append(videoPanel.el);
      }
    }
    syncBlocks();
  };

  // --- data ---

  const loadBlocks = () => {
    fetchGalleryBlocks()
      .then((data) => {
        state.blocks = data;
        state.error = '';
      })
      .catch((e) => { state.error = e.message; })
      .finally(() => {
        state.loading = false;
        if (disposed) return;
        drawError();
        drawContent();
      });
  };

  const scan = async () => {
    state.scanning = true;
    drawHeader();
    try {
      const r = await importGalleryFromStorage();
      if (disposed) return;
      const added = r.imagesImported + r.statesCreated + r.districtsCreated;
      showBanner('success', added === 0
        ? 'No new files found in the storage folder.'
        : `Added ${r.imagesImported} image(s), ${r.statesCreated} state(s) and ${r.districtsCreated} district(s) found in the storage folder.`);
      loadBlocks();
      // A new refreshKey remounts every block panel and the regions tab (React's key change).
      state.refreshKey += 1;
      if (state.tab === 'REGIONS') {
        regions?.destroy();
        regions = null;
      }
      drawContent();
    } catch (e) {
      showBanner('error', e.message);
    } finally {
      state.scanning = false;
      if (!disposed) drawHeader();
    }
  };

  const offs = [
    on(container, 'click', '[data-action="scan"]', scan),
    on(container, 'click', '[data-tab]', (e, button) => {
      if (button.dataset.tab === state.tab) return;
      state.tab = button.dataset.tab;
      drawTabs();
      unmountContent();
      drawContent();
    }),
  ];

  drawHeader();
  drawError();
  drawContent();
  loadBlocks();

  return () => {
    disposed = true;
    banner.clear();
    offs.forEach((off) => off());
    regions?.destroy();
    videoPanel?.destroy();
    panels.forEach((p) => p.destroy());
  };
}

// --- BlockPanel: one picture block of the EPM page or the gallery page -------------------

function mountBlockPanel(initialBlock, { showBanner, onCountChange }) {
  let block = initialBlock;
  const state = { images: null, error: '', uploading: '', busyId: null };
  let disposed = false;
  const openDialogs = new Set();

  const builtIn = () => BUILT_IN[block.id] || {};
  const max = () => block.maxImages;
  const full = () => max() != null && (state.images?.length || 0) >= max();
  const isGalleryPage = () => block.page === 'GALLERY_PAGE';
  const uploadButtonProps = () => ({
    label: full() ? (max() === 1 ? 'Use Replace on the image' : 'Section full') : max() === 1 ? 'Upload image' : 'Upload images',
    multiple: max() !== 1,
    disabled: full(),
    busy: Boolean(state.uploading),
  });

  const el = toElement(html`
    <section class="adm-block">
      <div class="adm-block-head">
        <div></div>
        ${uploadButtonHtml(uploadButtonProps())}
      </div>
      <!--images-->
    </section>`);
  const head = el.querySelector('.adm-block-head');
  const headText = head.firstElementChild;
  const uploadButton = head.querySelector('[data-upload="button"]');
  const imagesMarker = Array.from(el.childNodes).find((n) => n.nodeType === Node.COMMENT_NODE);

  const drawHead = () => {
    const count = state.images ? state.images.length : block.imageCount;
    render(headText, html`
      <h3>${block.label} <span class="adm-block-count">${count}${max() != null ? ` / ${max()}` : ''}</span></h3>
      ${block.description && html`<p>${block.description}</p>`}`);
    updateUploadButton(uploadButton, uploadButtonProps());
  };

  const drawStatus = () => renderBetween(head, imagesMarker, html`
    ${state.uploading && html`<p class="admin-pub-hint adm-hint-tight">${state.uploading}</p>`}
    ${state.error && html`<div class="admin-pub-form-error">${state.error}</div>`}`);

  const drawImages = () => {
    const { images } = state;
    const { defaults, slots } = builtIn();
    let content;
    if (images === null) {
      content = loadingHtml();
    } else if (images.length === 0 && !defaults) {
      content = html`
        <div class="adm-block-empty">
          ${block.id === 'epm-carousel'
            ? 'No carousel photos yet - the EPM page shows the first photos from the gallery page instead.'
            : isGalleryPage() ? 'No photos yet - this section is hidden on the gallery page until it has one.' : 'No images yet.'}
        </div>`;
    } else {
      content = imageGridHtml({
        images,
        slotLabels: slots,
        defaults,
        busyId: state.busyId,
        showMeta: isGalleryPage() || block.id === 'epm-carousel',
        canMove: images.length > 1,
      });
    }
    renderBetween(imagesMarker, null, content);
  };

  const draw = () => {
    if (disposed) return;
    drawHead();
    drawStatus();
    drawImages();
  };

  const load = () => {
    if (disposed) return;
    fetchBlockImages(block.id)
      .then((data) => {
        state.images = data;
        state.error = '';
      })
      .catch((e) => {
        state.error = e.message;
        state.images = [];
      })
      .then(draw);
  };

  const upload = async (files) => {
    const room = max() == null ? files.length : Math.max(0, max() - (state.images?.length || 0));
    const batch = files.slice(0, room);
    const { label } = block;
    const limit = max();
    let done = 0;
    const failures = [];
    for (const file of batch) {
      state.uploading = `Uploading ${done + 1} of ${batch.length}…`;
      draw();
      try {
        await uploadBlockImage(block.id, file);
        done += 1;
      } catch (e) {
        failures.push(`${file.name}: ${e.message}`);
      }
    }
    state.uploading = '';
    draw();
    load();
    onCountChange();
    if (failures.length) showBanner('error', failures.join(' · '));
    else showBanner('success', `Added ${done} image${done === 1 ? '' : 's'} to “${label}”.`);
    if (files.length > batch.length) showBanner('error', `“${label}” holds at most ${limit} - ${files.length - batch.length} file(s) were skipped.`);
  };

  const withBusy = async (id, action, success) => {
    state.busyId = id;
    draw();
    try {
      await action();
      if (success) showBanner('success', success);
      load();
    } catch (e) {
      showBanner('error', e.message);
    } finally {
      state.busyId = null;
      draw();
    }
  };

  const move = (index, delta) => {
    const ids = state.images.map((i) => i.id);
    const [id] = ids.splice(index, 1);
    ids.splice(index + delta, 0, id);
    withBusy(id, async () => {
      state.images = await reorderBlockImages(block.id, ids);
      draw();
    });
  };

  const askDelete = (image) => {
    const { label, id: blockId } = block;
    const hasDefaults = Boolean(builtIn().defaults);
    const promise = confirmDialog({
      title: 'Delete image?',
      content: html`
        <p>Delete this image from <strong>${label}</strong>? The file is removed from the server too.</p>
        ${hasDefaults && html`<p class="admin-pub-hint">The EPM page goes back to its built-in picture for this spot.</p>`}`,
      onConfirm: async () => {
        await deleteBlockImage(blockId, image.id);
        showBanner('success', `Image removed from “${label}”.`);
        load();
        onCountChange();
      },
    });
    const backdrop = document.body.lastElementChild;
    const handle = {
      close() {
        const x = backdrop.querySelector('[data-action="modal-close"]');
        if (x && !x.disabled) x.click();
        else backdrop.remove();
      },
    };
    openDialogs.add(handle);
    promise.finally(() => openDialogs.delete(handle));
  };

  const offs = [
    wireUploadButtons(el, upload),
    wireImageGrid(el, {
      getImages: () => state.images,
      onMove: move,
      onEdit: (image) => {
        const blockId = block.id;
        const modal = openImageDetailsModal({
          image,
          showPlace: isGalleryPage() || block.id === 'epm-carousel',
          onClose: () => openDialogs.delete(modal),
          onSave: async (payload) => {
            await updateBlockImage(blockId, image.id, payload);
            showBanner('success', 'Image details saved.');
            load();
          },
        });
        openDialogs.add(modal);
      },
      onReplace: (image, file) => withBusy(image.id, () => replaceBlockImage(block.id, image.id, file), 'Picture replaced.'),
      onDelete: askDelete,
    }),
  ];

  draw();
  load();

  return {
    el,
    setBlock(next) {
      block = next;
      if (!disposed) {
        drawHead();
        drawImages();
      }
    },
    destroy() {
      disposed = true;
      offs.forEach((off) => off());
      [...openDialogs].forEach((d) => d.close());
    },
  };
}
