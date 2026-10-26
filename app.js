import { initializeLanguage, translate as t, localizeProfile, getLanguage } from './i18n.js?v=20261026-2';
const REPO = 'https://github.com/hotuns/JSM_Studio';
const releaseLink = document.querySelector('#download-link');
const releaseInfo = document.querySelector('#release-info');
const list = document.querySelector('#community-list');
const search = document.querySelector('#profile-search');
let profiles = [];
let catalogStatus = 'loading';
let currentRelease = null;
const make = (tag, text, className) => { const el = document.createElement(tag); if (text) el.textContent = text; if (className) el.className = className; return el; };
function renderProfiles() {
  list.replaceChildren();
  if (catalogStatus !== 'ready') {
    list.append(make('p', t(catalogStatus === 'loading' ? '正在获取社区配置…' : '暂时无法获取配置列表。你仍可在 GitHub 配置仓库查看和下载。'), 'subtle'));
    return;
  }
  const query = search.value.trim().toLocaleLowerCase();
  const filtered = profiles.filter(p => { const translated = localizeProfile(p); return [p.name, p.game, p.controller, ...p.tags, translated.name, translated.game, translated.controller, ...translated.tags].join(' ').toLocaleLowerCase().includes(query); }).map(localizeProfile);
  if (!filtered.length) { list.append(make('p', t('没有匹配的配置，试试其他关键词。'), 'subtle')); return; }
  for (const p of filtered) {
    const card = make('article', '', 'community-card');
    card.append(make('small', p.game), make('h3', p.name), make('p', p.description));
    const tags = make('div', '', 'tags');
    [t(p.verified ? '维护者标记已验证' : '示例 · 待核对'), ...p.tags].forEach(t => tags.append(make('span', t)));
    card.append(tags, make('p', p.controller));
    const footer = make('footer');
    footer.append(make('span', `${p.author} · ${p.updatedAt}`));
    const link = make('a', t('查看 / 下载 TXT ↗'));
    link.href = `${REPO}/blob/gh-pages/community-configs/${p.file}`;
    link.target = '_blank'; link.rel = 'noopener noreferrer';
    footer.append(link); card.append(footer); list.append(card);
  }
}
search.addEventListener('input', renderProfiles);
async function loadCatalog() {
  try {
    const response = await fetch('./community-configs/index.json', { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw Error('catalog unavailable');
    const data = await response.json();
    if (data.version !== 1 || !Array.isArray(data.profiles)) throw Error('unsupported catalog');
    profiles = data.profiles.filter(p => typeof p.name === 'string' && typeof p.game === 'string' && typeof p.controller === 'string' && Array.isArray(p.tags) && /^(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.txt$/.test(p.file));
    catalogStatus = 'ready';
    renderProfiles();
  } catch {
    catalogStatus = 'error';
    renderProfiles();
  }
}
async function loadRelease() {
  try {
    const response = await fetch('https://api.github.com/repos/hotuns/JSM_Studio/releases/latest', { signal: AbortSignal.timeout(10000), headers: { Accept: 'application/vnd.github+json' } });
    if (!response.ok) return;
    const release = await response.json();
    if (release.draft || release.prerelease) return;
    const installer = release.assets?.find(a => /(?:x64|windows-x64).*setup\.exe$/i.test(a.name));
    if (!installer || !installer.browser_download_url.startsWith(`${REPO}/releases/download/`)) return;
    currentRelease = { release, installer };
    renderRelease();
  } catch { /* The latest-release page remains a working fallback. */ }
}
function renderRelease() {
  if (!currentRelease) {
    releaseLink.replaceChildren(document.createTextNode(t('下载最新正式版') + ' '), make('span', '↓'));
    releaseInfo.textContent = t('Windows x64 · 安装包由 GitHub Releases 提供');
    return;
  }
  const { release, installer } = currentRelease;
  releaseLink.href = installer.browser_download_url;
  const label = getLanguage() === 'en' ? `Download ${release.tag_name}` : `下载 ${release.tag_name} 正式版`;
  releaseLink.replaceChildren(document.createTextNode(label + ' '), make('span', '↓'));
  releaseInfo.textContent = `${release.tag_name} · Windows x64 · ${(installer.size / 1024 / 1024).toFixed(1)} MB · GitHub Releases`;
}
initializeLanguage(() => { renderProfiles(); renderRelease(); });
void loadCatalog(); void loadRelease();
