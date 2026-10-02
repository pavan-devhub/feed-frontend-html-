// A Feed World issue has an address of its own - pages/publication-reader.html?id=<id> - so it can
// be opened in a new tab or shared. The link carries only the issue id, never the JWT, so it is
// safe to share: whoever opens it reads through their own login, like the rest of the site.
(function () {
  'use strict';

  const { pageUrl, navigate } = FW.require('core/router');
  const { setReturnTo } = FW.require('core/auth');

  const getPublicationReaderUrl = (id) => pageUrl('publication-reader', { id });

  const readerIdFromLocation = () => new URLSearchParams(window.location.search).get('id');

  // Leaves the reader tab for a page of the main site (e.g. 'feedworld', 'login'). An admin may only
  // use the admin panel, so when the navigation guard refuses the page, the admin lands there instead.
  function openAppPage(page) {
    if (!navigate(page)) navigate('admin-dashboard');
  }

  // Sends the reader to the login page, then back to this issue afterwards.
  function loginAndReturnHere() {
    setReturnTo(window.location.pathname + window.location.search);
    navigate('login');
  }

  // navigator.clipboard only exists in secure contexts - the site is also opened over plain http
  // on a LAN IP (see core/config.js) - and can still refuse a write, so the legacy copy command
  // backs it up. Rejects if neither worked. Used by the share dialog (components/share-dialog.js).
  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch {
        // permission denied / document not focused - try the legacy path below
      }
    }
    // Selecting the hidden field moves focus to it, so focus is put back afterwards - otherwise
    // it would be left on <body>, outside whatever dialog the copy was made from.
    const previousFocus = document.activeElement;
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(field);
    previousFocus?.focus?.();
    if (!copied) throw new Error('Copy failed');
  }

  FW.define('utils/publication-links', {
    getPublicationReaderUrl,
    readerIdFromLocation,
    openAppPage,
    loginAndReturnHere,
    copyText,
  });
})();
