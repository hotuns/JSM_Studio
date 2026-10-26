import { english, englishProfiles } from './translations.js?v=20261026-2';
const STORAGE_KEY = 'jsm-studio-website-language';
let language = 'zh-CN';
export const getLanguage = () => language;
export const translate = text => language === 'en' ? (english[text] ?? text) : text;
export const localizeProfile = profile => language === 'en' ? { ...profile, ...englishProfiles[profile.id] } : profile;
export function normalizeLanguage(value) {
  if (typeof value !== 'string') return null;
  if (/^zh(?:-|$)/i.test(value)) return 'zh-CN';
  if (/^en(?:-|$)/i.test(value)) return 'en';
  return null;
}
export function chooseLanguage(query, saved, browser) {
  return normalizeLanguage(query) ?? normalizeLanguage(saved) ?? normalizeLanguage(browser) ?? 'en';
}
export function initializeLanguage(onChange) {
  const select = document.querySelector('#language-select');
  const texts = [], attributes = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.parentElement?.closest('script, style, [data-no-translate]')) continue;
    if (Object.hasOwn(english, node.textContent.trim())) texts.push([node, node.textContent]);
  }
  for (const element of document.querySelectorAll('[aria-label], [alt], [placeholder], meta[content]')) {
    for (const name of ['aria-label', 'alt', 'placeholder', 'content']) {
      const original = element.getAttribute(name);
      if (Object.hasOwn(english, original)) attributes.push([element, name, original]);
    }
  }
  const title = document.title;
  let saved;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch { /* Storage is optional. */ }
  function apply(next, persist = false) {
    language = normalizeLanguage(next) ?? 'en';
    document.documentElement.lang = language;
    document.title = translate(title);
    select.value = language;
    for (const [node, original] of texts) {
      node.textContent = original.replace(original.trim(), translate(original.trim()))
        + (language === 'en' && node.nextSibling?.nodeName === 'BR' ? ' ' : '');
    }
    for (const [element, name, original] of attributes) element.setAttribute(name, translate(original));
    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, language); } catch { /* Private browsing still works. */ }
      const url = new URL(location.href);
      url.searchParams.set('lang', language);
      try { history.replaceState(null, '', url); } catch { /* Keep switching if the URL cannot change. */ }
    }
    onChange();
  }
  select.addEventListener('change', () => apply(select.value, true));
  apply(chooseLanguage(new URL(location.href).searchParams.get('lang'), saved, navigator.languages?.[0] ?? navigator.language));
}
