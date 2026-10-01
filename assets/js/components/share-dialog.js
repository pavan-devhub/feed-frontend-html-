// "Share this issue" dialog for a Feed World publication: WhatsApp, Instagram and Gmail, plus Copy
// link and - on devices that have one - the device's own share sheet ("More"). What gets shared is
// the issue's reader link (see utils/publication-links.js), which carries no login token: whoever
// opens it reads through their own login. Appended to <body> so a card's hover transform or
// overflow can never clip it. Needs assets/css/components/share-dialog.css.
//
//   const dialog = openShareDialog({ publication, onClose: () => {} });   // dialog.close()
//
// `publication` is a summary or detail DTO (id, title, monthName, year, language, pageCount).
import { html, raw, render, toElement } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { getPublicationThumbnailUrl, PUBLICATION_LANGUAGE_LABELS } from '../api/publications-api.js';
import { copyText, getPublicationReaderUrl } from '../utils/publication-links.js';

// Where Instagram's "Share" goes once the link is copied - its web inbox, which a phone hands
// straight to the Instagram app.
const INSTAGRAM_URL = 'https://www.instagram.com/direct/inbox/';

// Simplified brand marks, drawn in-house (the icon set has no brand logos).
const WHATSAPP_GLYPH = raw(`<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M7.9 20A9 9 0 1 0 4 16.1L2.5 21.5Z" fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"></path><path transform="translate(7.2 7.2) scale(0.4)" fill="#fff" d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>`);

const INSTAGRAM_GLYPH = raw(`<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="#fff" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4"></circle><circle cx="17.5" cy="6.5" r="0.6" fill="#fff"></circle></svg>`);

const GMAIL_GLYPH = raw(`<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path fill="#4285F4" d="M3.5 19H6.5V10.6L2 7.4v10.1A1.5 1.5 0 0 0 3.5 19z"></path><path fill="#34A853" d="M17.5 19h3a1.5 1.5 0 0 0 1.5-1.5V7.4l-4.5 3.2z"></path><path fill="#FBBC04" d="M17.5 5.2v5.4L22 7.4V6.2c0-1.6-1.8-2.5-3.1-1.6z"></path><path fill="#EA4335" d="M6.5 10.6V5.2L12 9.1l5.5-3.9v5.4L12 14.5z"></path><path fill="#C5221F" d="M2 6.2v1.2l4.5 3.2V5.2L5.1 4.6C3.8 3.7 2 4.6 2 6.2z"></path></svg>`);

export function openShareDialog({ publication, onClose } = {}) {
  let copied = false;
  let note = '';
  let closed = false;
  let copiedTimer = null;

  const languageLabel = PUBLICATION_LANGUAGE_LABELS[publication.language] || publication.language;
  const title = `${publication.title} – ${publication.monthName} ${publication.year}`;
  const url = getPublicationReaderUrl(publication.id);
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${title} (${languageLabel})\n${url}`)}`;
  const gmailUrl = 'https://mail.google.com/mail/?view=cm&fs=1'
    + `&su=${encodeURIComponent(`${title} (${languageLabel})`)}`
    + `&body=${encodeURIComponent(`${title} (${languageLabel})\n\nRead it here: ${url}`)}`;
  const canShareNatively = typeof navigator.share === 'function';

  const copyTargetInner = () => html`<span class="share-icon is-copy ${copied ? 'is-done' : ''}">${icon(copied ? 'check' : 'link-2', { size: 22 })}</span>${copied ? 'Copied!' : 'Copy link'}`;
  const copyButtonInner = () => html`${icon(copied ? 'check' : 'copy', { size: 15 })} ${copied ? 'Copied' : 'Copy'}`;

  const backdrop = toElement(html`
    <div class="share-backdrop">
      <div class="share-dialog" role="dialog" aria-modal="true" aria-labelledby="share-dialog-title" tabindex="-1">
        <header class="share-head">
          <h2 id="share-dialog-title">Share this issue</h2>
          <button type="button" class="share-close" data-action="close" aria-label="Close">${icon('x', { size: 18 })}</button>
        </header>

        <div class="share-issue">
          <span class="share-issue-cover"><img src="${getPublicationThumbnailUrl(publication.id)}" alt="" /></span>
          <span class="share-issue-text">
            <strong>${title}</strong>
            <span>${languageLabel}${publication.pageCount ? ` · ${publication.pageCount} pages` : ''}</span>
          </span>
        </div>

        <ul class="share-targets">
          <li>
            <a class="share-target" href="${whatsappUrl}" target="_blank" rel="noopener noreferrer"><span class="share-icon is-whatsapp">${WHATSAPP_GLYPH}</span>WhatsApp</a>
          </li>
          <li>
            <button type="button" class="share-target" data-action="instagram"><span class="share-icon is-instagram">${INSTAGRAM_GLYPH}</span>Instagram</button>
          </li>
          <li>
            <a class="share-target" href="${gmailUrl}" target="_blank" rel="noopener noreferrer"><span class="share-icon is-gmail">${GMAIL_GLYPH}</span>Gmail</a>
          </li>
          <li>
            <button type="button" class="share-target" data-action="copy" data-role="copy-target">${copyTargetInner()}</button>
          </li>
          ${canShareNatively && html`
            <li>
              <button type="button" class="share-target" data-action="native"><span class="share-icon is-more">${icon('ellipsis', { size: 22 })}</span>More</button>
            </li>`}
        </ul>

        <div class="share-link">
          <input type="text" readonly value="${url}" aria-label="Link to this issue" />
          <button type="button" data-action="copy" data-role="copy-button">${copyButtonInner()}</button>
        </div>

        <p class="share-hint">People you share with sign in to Feed World to read it.</p>
      </div>
    </div>`);

  const dialog = backdrop.querySelector('.share-dialog');
  const linkInput = backdrop.querySelector('.share-link input');
  const hint = backdrop.querySelector('.share-hint');

  // Only the bits that change are touched, so focus stays on whichever button was used.
  const drawCopied = () => {
    render(backdrop.querySelector('[data-role="copy-target"]'), copyTargetInner());
    render(backdrop.querySelector('[data-role="copy-button"]'), copyButtonInner());
  };

  const drawNote = () => {
    let noteEl = backdrop.querySelector('.share-note');
    if (!note) {
      noteEl?.remove();
      return;
    }
    if (!noteEl) {
      noteEl = document.createElement('p');
      noteEl.className = 'share-note';
      noteEl.setAttribute('role', 'status');
      hint.before(noteEl);
    }
    noteEl.textContent = note;
  };

  const setNote = (value) => {
    note = value;
    drawNote();
  };

  // A cover that fails to load is simply left out.
  backdrop.querySelector('.share-issue-cover img').addEventListener('error', (e) => e.target.remove(), { once: true });

  const copyLink = async () => {
    try {
      await copyText(url);
      if (closed) return true;
      copied = true;
      drawCopied();
      clearTimeout(copiedTimer);
      copiedTimer = setTimeout(() => {
        copied = false;
        drawCopied();
      }, 2000);
      return true;
    } catch {
      if (closed) return false;
      setNote("Couldn't copy automatically - the link below is selected, copy it from there.");
      linkInput.select();
      return false;
    }
  };

  // Instagram has no way for a website to pre-fill a message, so: copy the link, open Instagram,
  // and say where to paste it.
  const shareToInstagram = async () => {
    const copiedOk = await copyLink();
    window.open(INSTAGRAM_URL, '_blank', 'noopener,noreferrer');
    if (closed) return;
    setNote(copiedOk
      ? 'Link copied - paste it into your Instagram chat or story.'
      : 'Copy the link below, then paste it into your Instagram chat or story.');
  };

  const shareNatively = async () => {
    try {
      await navigator.share({ title, text: `${title} (${languageLabel})`, url });
      close();
    } catch {
      // cancelled by the user, or the share sheet failed - the dialog stays open either way
    }
  };

  // Modal behaviour: lock the page behind it, take focus, and hand focus back on close. Esc and
  // Tab are handled on the whole document, so they work wherever focus has ended up - Esc closes,
  // Tab cycles within the dialog rather than escaping to the page behind it.
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== 'Tab') return;
    const focusable = [...dialog.querySelectorAll('a[href], button, input')];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    const outside = !dialog.contains(active) || active === dialog;
    if (e.shiftKey && (outside || active === first)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (outside || active === last)) {
      e.preventDefault();
      first.focus();
    }
  };

  backdrop.addEventListener('mousedown', (e) => {
    if (e.target === backdrop) close();
  });
  backdrop.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target || !backdrop.contains(target)) return;
    const { action } = target.dataset;
    if (action === 'close') close();
    else if (action === 'copy') copyLink();
    else if (action === 'instagram') shareToInstagram();
    else if (action === 'native') shareNatively();
  });
  linkInput.addEventListener('focus', (e) => e.target.select());

  const previousFocus = document.activeElement;
  const previousOverflow = document.body.style.overflow;
  document.body.appendChild(backdrop);
  document.body.style.overflow = 'hidden';
  dialog.focus();
  document.addEventListener('keydown', handleKeyDown);

  function close() {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', handleKeyDown);
    document.body.style.overflow = previousOverflow;
    clearTimeout(copiedTimer);
    backdrop.remove();
    previousFocus?.focus?.();
    if (onClose) onClose();
  }

  return { close };
}
