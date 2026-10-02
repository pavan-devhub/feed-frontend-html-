// Reveal-on-scroll for the EPM gallery: an element with class "epg-reveal" fades up into place the
// first time it scrolls into view (see .epg-reveal in assets/css/components/epm-gallery-common.css,
// which also turns this off for prefers-reduced-motion). A delay (ms) staggers the cards of a grid
// through the --epg-reveal-delay custom property.
//
//   html`<div class="${revealClass('epg-programme-copy')}" ${revealStyle(120)}>...</div>`
//   ... then, after the markup is in the page: initReveal(container)
//
// For lists that re-render (search results, counts arriving later) use syncRevealList(), which keeps
// the items that stay in the list - so they don't fade in again or reload their photos.
(function () {
  'use strict';

  const { html, render } = FW.require('core/dom');

  // One IntersectionObserver shared by every reveal on the page, rather than one per card.
  let sharedObserver = null;
  const observed = new Set();

  function getObserver() {
    if (!sharedObserver) {
      sharedObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          sharedObserver.unobserve(entry.target);
          observed.delete(entry.target);
          entry.target.classList.add('is-shown');
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    }
    return sharedObserver;
  }

  // class="" value of a reveal wrapper: "epg-reveal" plus the wrapper's own classes.
  const revealClass = (className = '') => `epg-reveal${className ? ` ${className}` : ''}`;

  // style="" attribute for a reveal delay - nothing at all when there is no delay.
  const revealStyle = (delay = 0) => (delay ? html`style="--epg-reveal-delay: ${delay}ms;"` : '');

  function setRevealDelay(el, delay) {
    if (delay) {
      el.style.setProperty('--epg-reveal-delay', `${delay}ms`);
    } else {
      el.style.removeProperty('--epg-reveal-delay');
      if (!el.getAttribute('style')) el.removeAttribute('style');
    }
  }

  // Starts watching every not-yet-shown .epg-reveal under root (root included). Safe to call again
  // after re-rendering; elements that have left the page stop being watched.
  function initReveal(root = document) {
    const targets = Array.from(root.querySelectorAll('.epg-reveal:not(.is-shown)'));
    if (root instanceof Element && root.matches('.epg-reveal:not(.is-shown)')) targets.unshift(root);
    if (typeof IntersectionObserver === 'undefined') {
      targets.forEach((el) => el.classList.add('is-shown'));
      return;
    }
    const observer = getObserver();
    observed.forEach((el) => {
      if (!el.isConnected) {
        observer.unobserve(el);
        observed.delete(el);
      }
    });
    targets.forEach((el) => {
      if (observed.has(el)) return;
      observed.add(el);
      observer.observe(el);
    });
  }

  // list element -> Map(key -> item element) of what syncRevealList last rendered into it.
  const listItems = new WeakMap();

  // Renders `items` into `list` as reveal-wrapped children (<li class="epg-reveal ..."> by default),
  // matching items by key the way React's keyed lists do: an item already on screen keeps its element
  // (only its delay is updated and `update(el, item, i)` is called), new keys get a fresh element
  // built from `render(item, i)`, and keys no longer present are removed.
  function syncRevealList(list, items, {
    key, render: renderItem, update, delay = () => 0, tag = 'li', className = '',
  }) {
    const previous = listItems.get(list) || new Map();
    const next = new Map();
    items.forEach((item) => next.set(key(item), null));

    // Remove first, so the elements that stay never have to be moved (moving would restart their
    // image fade-in).
    previous.forEach((el, k) => {
      if (!next.has(k)) el.remove();
    });

    items.forEach((item, i) => {
      const k = key(item);
      const d = delay(item, i);
      let el = previous.get(k);
      if (el) {
        setRevealDelay(el, d);
        if (update) update(el, item, i);
      } else {
        el = document.createElement(tag);
        el.className = revealClass(className);
        setRevealDelay(el, d);
        render(el, renderItem(item, i));
      }
      next.set(k, el);
      const at = list.children[i];
      if (at !== el) list.insertBefore(el, at || null);
    });

    listItems.set(list, next);
    initReveal(list);
  }

  FW.define('components/reveal', { revealClass, revealStyle, initReveal, syncRevealList });
})();
