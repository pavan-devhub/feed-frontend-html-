// Small DOM + templating helpers shared by every page.
//
// html`` is a tagged template that HTML-escapes every interpolated value, so data from the API can
// be dropped into markup safely. Nested html`` results, icon() output and raw() strings are
// trusted and inserted as-is; arrays are joined; null / undefined / false / true render nothing.
//
//   render(el, html`<li class="${cls}">${item.name}</li>`);
//   render(el, html`<ul>${items.map((i) => html`<li>${i}</li>`)}</ul>`);

export class SafeHtml {
  constructor(value) {
    this.value = value;
  }

  toString() {
    return this.value;
  }
}

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

// Marks a string as trusted HTML. Never pass user/API data through this.
export const raw = (value) => new SafeHtml(String(value ?? ''));

function renderValue(value) {
  if (value == null || value === false || value === true) return '';
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(renderValue).join('');
  return escapeHtml(value);
}

export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i += 1) {
    out += renderValue(values[i]) + strings[i + 1];
  }
  return new SafeHtml(out);
}

// Replaces el's content with the given html`` result (or trusted string).
export function render(el, content) {
  if (!el) return;
  el.innerHTML = renderValue(content);
}

// Builds a DOM element from an html`` result - for things appended to <body> (modals, popovers).
export function toElement(content) {
  const tpl = document.createElement('template');
  tpl.innerHTML = renderValue(content).trim();
  return tpl.content.firstElementChild;
}

// Joins class names, skipping falsy ones: cx('card', active && 'active') -> "card active"
export const cx = (...names) => names.filter(Boolean).join(' ');

export const qs = (selector, root = document) => root.querySelector(selector);
export const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));

// Delegated listener: on(list, 'click', '[data-action="remove"]', (event, target) => ...)
// Works for elements rendered later, so re-rendering with innerHTML never loses handlers.
export function on(root, type, selector, handler, options) {
  const listener = (event) => {
    const target = event.target.closest(selector);
    if (target && root.contains(target)) handler(event, target);
  };
  root.addEventListener(type, listener, options);
  return () => root.removeEventListener(type, listener, options);
}

// Calls handler when a pointer goes down outside every given element (dropdowns, popovers).
export function onClickOutside(elements, handler) {
  const listener = (event) => {
    const els = (Array.isArray(elements) ? elements : [elements]).filter(Boolean);
    if (!els.some((el) => el.contains(event.target))) handler(event);
  };
  document.addEventListener('mousedown', listener);
  return () => document.removeEventListener('mousedown', listener);
}

export const scrollToTop = () => window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
