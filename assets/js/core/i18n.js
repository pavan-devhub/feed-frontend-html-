// Translations - the plain-JS replacement for i18next / react-i18next.
//
// The language files live in assets/locales/<lang>.json, in i18next's resource format
// ({ "translation": { "call_us": "...", "nav": { "home": "..." } } }). English is the default and the
// fallback for any key a language is missing. The chosen language is remembered in localStorage.
//
//   await initI18n();                         // load the saved (or default) language
//   t('nav.home')                             // -> "Home" (current language, then English, then the key)
//   <div data-i18n="call_us">Call us anytime</div> + applyTranslations()   // for static HTML
//   await setLanguage('hi');                  // load, remember and re-apply everywhere
//
// After a language change a "feed:language-changed" event ({ detail: { language } }) is dispatched
// on window, for scripts that render translated text themselves.

const STORAGE_KEY = 'feed_language';
const DEFAULT_LANGUAGE = 'en';
const FALLBACK_LANGUAGE = 'en';

const LANGUAGE_CHANGED_EVENT = 'feed:language-changed';

// lang -> its "translation" object (absent when the file could not be loaded)
const resources = {};
const loading = {};
let current = DEFAULT_LANGUAGE;
let initPromise = null;
let changeCounter = 0;

// Language codes like "en", "hi", "pt-BR" - anything else (e.g. a tampered localStorage value) is
// never turned into a file path.
const isValidLanguage = (lang) => typeof lang === 'string' && /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(lang);

function readSavedLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return isValidLanguage(saved) ? saved : null;
  } catch {
    return null;
  }
}

function saveLanguage(lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // localStorage unavailable (private mode) - the choice just isn't remembered
  }
}

// Fetches and caches one language file. Resolves to its translations, or null when it can't be
// loaded (t() then falls back to English, like i18next does for a missing language).
function loadLanguage(lang) {
  if (resources[lang]) return Promise.resolve(resources[lang]);
  if (!isValidLanguage(lang)) return Promise.resolve(null);
  if (!loading[lang]) {
    const url = new URL('../../locales/' + lang + '.json', import.meta.url);
    loading[lang] = fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        // The files are saved with a UTF-8 byte-order mark, which JSON.parse rejects.
        const data = JSON.parse(text.replace(/^﻿/, ''));
        resources[lang] = data && typeof data.translation === 'object' ? data.translation : data;
        return resources[lang];
      })
      .catch((err) => {
        console.error(`[i18n] could not load language "${lang}"`, err);
        delete loading[lang]; // allow a later retry
        return null;
      });
  }
  return loading[lang];
}

const own = (obj, key) => obj && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, key);

// Looks a key up in one language: an exact (flat) key first, then the dot path ('nav.home').
function lookup(lang, key) {
  const table = resources[lang];
  if (!table || key == null) return undefined;
  const k = String(key);
  let value = own(table, k) ? table[k] : undefined;
  if (value === undefined) {
    value = k.split('.').reduce((node, part) => (own(node, part) ? node[part] : undefined), table);
  }
  return typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;
}

// The key's text in the current language, falling back to English, then to the key itself.
export function t(key) {
  const value = lookup(current, key) ?? lookup(FALLBACK_LANGUAGE, key);
  return value ?? String(key);
}

export const getLanguage = () => current;

// Sets the textContent of every [data-i18n="key"] element under root (root included).
export function applyTranslations(root = document) {
  if (!root) return;
  const elements = root.querySelectorAll ? Array.from(root.querySelectorAll('[data-i18n]')) : [];
  if (root.nodeType === 1 && root.hasAttribute('data-i18n')) elements.unshift(root);
  elements.forEach((el) => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
}

// Loads English (the fallback) plus the saved language, then translates the page. Safe to call
// more than once - every call shares the same load.
export function initI18n() {
  if (!initPromise) {
    initPromise = (async () => {
      const lang = readSavedLanguage() || DEFAULT_LANGUAGE;
      await Promise.all([loadLanguage(FALLBACK_LANGUAGE), loadLanguage(lang)]);
      // A setLanguage() that started while we were loading wins.
      if (changeCounter === 0) current = lang;
      applyTranslations(document);
      return current;
    })();
  }
  return initPromise;
}

// Switches language: loads its file (and English, for fallbacks), remembers the choice and
// re-applies the translations. When calls overlap, the last one wins.
export async function setLanguage(lang) {
  const target = isValidLanguage(lang) ? lang : DEFAULT_LANGUAGE;
  changeCounter += 1;
  const ticket = changeCounter;
  await Promise.all([loadLanguage(FALLBACK_LANGUAGE), loadLanguage(target)]);
  if (ticket !== changeCounter) return current;
  current = target;
  saveLanguage(target);
  applyTranslations(document);
  window.dispatchEvent(new CustomEvent(LANGUAGE_CHANGED_EVENT, { detail: { language: target } }));
  return current;
}
