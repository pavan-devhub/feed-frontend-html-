// Admin panel -> EPM -> Reviews. Converted from src/pages/admin/epm/EpmReviewsAdmin.jsx.
// mount(container, ctx) renders the section into <main class="adm-main"> and returns a cleanup.
import { html, render, on } from '../../core/dom.js';
import { icon } from '../../core/icons.js';
import { fetchAdminReviews, createAdminReview, updateAdminReview, deleteAdminReview } from '../../api/admin-epm-api.js';
import {
  openModal, confirmDialog, formErrorHtml, formActionsHtml, createBanner, sectionHeaderHtml, loadingHtml, emptyHtml,
} from './admin-ui.js';

const toPayload = (r, overrides = {}) => ({
  authorName: r.authorName,
  authorRole: r.authorRole,
  content: r.content,
  rating: r.rating,
  published: r.published,
  displayOrder: r.displayOrder,
  ...overrides,
});

// Replaces the nodes between `start` and `end` (exclusive; end null = to the last child), so a
// block that React rendered conditionally can come and go without an extra wrapper element.
function renderBetween(start, end, content) {
  while (start.nextSibling && start.nextSibling !== end) start.nextSibling.remove();
  const tpl = document.createElement('template');
  render(tpl, content);
  start.parentNode.insertBefore(tpl.content, end);
}

const starIcon = (n, rating, size) => icon('star', {
  size, className: n <= rating ? 'on' : '', fill: n <= rating ? 'currentColor' : 'none',
});

export function mount(container) {
  const state = { reviews: [], loading: true, error: '', busyId: null };
  let disposed = false;
  const modals = new Set();

  render(container, html`
    ${sectionHeaderHtml({
      eyebrow: 'EPM',
      icon: 'quote',
      title: 'Reviews',
      description: "Testimonials shown in the Testimonials slider on the EPM page. Hidden reviews stay here but aren't shown publicly.",
      actions: html`<button type="button" class="admin-pub-btn primary" data-action="add">${icon('plus', { size: 16 })} Add review</button>`,
    })}
    <div data-slot="banner" style="display: contents;"></div>`);
  const bannerSlot = container.querySelector('[data-slot="banner"]');
  const banner = createBanner(bannerSlot);

  const listHtml = () => {
    const { reviews, busyId } = state;
    const publishedCount = reviews.filter((r) => r.published).length;
    return html`
      <div class="adm-table-caption">${publishedCount} of ${reviews.length} shown on the EPM page, in this order</div>
      <ul class="adm-review-list">
        ${reviews.map((r, i) => html`
          <li class="adm-review ${r.published ? '' : 'is-hidden'}">
            <div class="adm-review-order">
              <button type="button" class="admin-pub-icon-btn" title="Move up" data-action="move-up" data-index="${i}" ${i === 0 || busyId !== null ? 'disabled' : ''}>${icon('arrow-up', { size: 14 })}</button>
              <button type="button" class="admin-pub-icon-btn" title="Move down" data-action="move-down" data-index="${i}" ${i === reviews.length - 1 || busyId !== null ? 'disabled' : ''}>${icon('arrow-down', { size: 14 })}</button>
            </div>
            <div class="adm-review-body">
              <div class="adm-stars" aria-label="${`${r.rating} out of 5`}">
                ${[1, 2, 3, 4, 5].map((n) => starIcon(n, r.rating, 14))}
                ${!r.published && html`<span class="adm-tag adm-tag-gray">Hidden</span>`}
              </div>
              <p class="adm-review-text">“${r.content}”</p>
              <div class="adm-review-author">
                <span class="adm-avatar">${r.authorName.charAt(0).toUpperCase()}</span>
                <div>
                  <strong>${r.authorName}</strong>
                  ${r.authorRole && html`<div class="adm-cell-sub">${r.authorRole}</div>`}
                </div>
              </div>
            </div>
            <div class="adm-review-actions">
              <button type="button" class="admin-pub-icon-btn" title="${r.published ? 'Hide from EPM page' : 'Show on EPM page'}" data-action="toggle" data-index="${i}" ${busyId !== null ? 'disabled' : ''}>
                ${r.published ? icon('eye-off', { size: 15 }) : icon('eye', { size: 15 })}
              </button>
              <button type="button" class="admin-pub-icon-btn" title="Edit" data-action="edit" data-index="${i}">${icon('pencil', { size: 15 })}</button>
              <button type="button" class="admin-pub-icon-btn danger" title="Delete" data-action="delete" data-index="${i}">${icon('trash-2', { size: 15 })}</button>
            </div>
          </li>`)}
      </ul>`;
  };

  // Everything below the banner.
  const draw = () => {
    if (disposed) return;
    renderBetween(bannerSlot, null, html`
      ${state.error && html`<div class="admin-pub-banner error">${state.error}</div>`}
      ${state.loading
        ? html`<div class="admin-pub-table-wrap">${loadingHtml('Loading reviews…')}</div>`
        : state.reviews.length === 0
          ? html`<div class="admin-pub-table-wrap">${emptyHtml('No reviews yet - the EPM page hides its Testimonials section until one is published.')}</div>`
          : listHtml()}`);
  };

  const load = async () => {
    try {
      const data = await fetchAdminReviews();
      if (disposed) return;
      state.reviews = data;
      state.error = '';
    } catch (e) {
      if (disposed) return;
      state.error = e.message;
    } finally {
      if (!disposed) {
        state.loading = false;
        draw();
      }
    }
  };

  const run = async (id, action, message) => {
    state.busyId = id;
    draw();
    try {
      await action();
      if (disposed) return;
      if (message) banner.show('success', message);
      await load();
    } catch (e) {
      if (disposed) return;
      banner.show('error', e.message);
    } finally {
      if (!disposed) {
        state.busyId = null;
        draw();
      }
    }
  };

  // Swap positions with the neighbour; order values are rewritten as 0..n-1 so ties can't stick.
  const move = (index, delta) => {
    const next = [...state.reviews];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    run(item.id, () => Promise.all(next.map((r, i) => (r.displayOrder === i ? null : updateAdminReview(r.id, toPayload(r, { displayOrder: i }))))));
  };

  const confirmTracked = (options) => {
    const promise = confirmDialog(options);
    const backdrop = document.body.lastElementChild;
    const handle = {
      close() {
        const x = backdrop.querySelector('[data-action="modal-close"]');
        if (x && !x.disabled) x.click();
        else backdrop.remove();
      },
    };
    modals.add(handle);
    promise.finally(() => modals.delete(handle));
    return promise;
  };

  const askDelete = (r) => confirmTracked({
    title: 'Delete review?',
    content: html`<p>Delete the review by <strong>${r.authorName}</strong>? To take it off the EPM page but keep it, hide it instead.</p>`,
    onConfirm: async () => {
      await deleteAdminReview(r.id);
      if (disposed) return;
      banner.show('success', `Deleted ${r.authorName}'s review.`);
      load();
    },
  });

  const openReviewForm = (review) => {
    const form = {
      authorName: review?.authorName || '',
      authorRole: review?.authorRole || '',
      content: review?.content || '',
      rating: review?.rating || 5,
      published: review ? review.published : true,
    };
    let busy = false;
    const submitLabel = review ? 'Save changes' : 'Add review';
    const starButtonsHtml = () => [1, 2, 3, 4, 5].map((n) => html`
      <button type="button" role="radio" aria-checked="${String(form.rating === n)}" aria-label="${`${n} star${n > 1 ? 's' : ''}`}"
        class="${n <= form.rating ? 'on' : ''}" data-rating="${n}">${starIcon(n, form.rating, 22)}</button>`);

    const modal = openModal({ title: review ? 'Edit review' : 'Add review', icon: 'quote', onClose: () => modals.delete(modal) });
    modals.add(modal);
    modal.setContent(html`
      <form class="admin-pub-form">
        <div class="admin-pub-form-row">
          <label>
            Name
            <input type="text" data-field="authorName" value="${form.authorName}" maxlength="255" required placeholder="e.g. Ramesh" />
          </label>
          <label>
            Role <span class="optional">(optional)</span>
            <input type="text" data-field="authorRole" value="${form.authorRole}" maxlength="255" placeholder="e.g. Farmer, FPO Member" />
          </label>
        </div>
        <label>
          Review
          <textarea rows="4" maxlength="2000" required data-field="content"></textarea>
        </label>
        <div class="admin-pub-field-block">
          <span class="admin-pub-field-label">Rating</span>
          <div class="adm-star-picker" role="radiogroup" aria-label="Rating">${starButtonsHtml()}</div>
        </div>
        <label class="adm-check">
          <input type="checkbox" data-field="published" ${form.published ? 'checked' : ''} />
          Show on the EPM page
        </label>
        ${formActionsHtml({ busy, submitLabel, busyLabel: 'Saving…' })}
      </form>`);
    const formEl = modal.element.querySelector('form');
    formEl.querySelector('textarea').value = form.content;

    const setError = (message) => {
      formEl.querySelector(':scope > .admin-pub-form-error')?.remove();
      if (message) formEl.insertAdjacentHTML('afterbegin', String(formErrorHtml(message)));
    };
    const setBusy = (value) => {
      busy = value;
      modal.setBusy(value);
      formEl.querySelector(':scope > .admin-pub-form-actions').outerHTML = String(formActionsHtml({ busy, submitLabel, busyLabel: 'Saving…' }));
    };

    formEl.addEventListener('input', (e) => {
      const field = e.target.dataset.field;
      if (!field) return;
      form[field] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    });
    formEl.addEventListener('click', (e) => {
      const star = e.target.closest('[data-rating]');
      if (!star) return;
      form.rating = Number(star.dataset.rating);
      // Update the buttons in place so the clicked one keeps keyboard focus.
      formEl.querySelectorAll('[data-rating]').forEach((b) => {
        const n = Number(b.dataset.rating);
        b.className = n <= form.rating ? 'on' : '';
        b.setAttribute('aria-checked', String(form.rating === n));
        render(b, starIcon(n, form.rating, 22));
      });
    });
    formEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      setBusy(true);
      setError('');
      try {
        const payload = { ...form, displayOrder: review?.displayOrder };
        const saved = review ? await updateAdminReview(review.id, payload) : await createAdminReview(payload);
        modal.close();
        if (disposed) return;
        banner.show('success', `Saved ${saved.authorName}'s review.`);
        load();
      } catch (err) {
        setError(err.message);
        setBusy(false);
      }
    });
  };

  const offs = [
    on(container, 'click', '[data-action]', (e, btn) => {
      const { action } = btn.dataset;
      if (action === 'add') {
        openReviewForm(undefined);
        return;
      }
      const index = Number(btn.dataset.index);
      const r = state.reviews[index];
      if (!r) return;
      if (action === 'move-up') move(index, -1);
      else if (action === 'move-down') move(index, 1);
      else if (action === 'toggle') {
        run(r.id, () => updateAdminReview(r.id, toPayload(r, { published: !r.published })),
          r.published ? `Hid ${r.authorName}'s review.` : `${r.authorName}'s review is now on the EPM page.`);
      } else if (action === 'edit') openReviewForm(r);
      else if (action === 'delete') askDelete(r);
    }),
  ];

  draw();
  load();

  return () => {
    disposed = true;
    banner.clear();
    offs.forEach((off) => off());
    [...modals].forEach((m) => m.close());
  };
}
