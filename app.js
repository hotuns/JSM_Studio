const REPO = 'https://github.com/hotuns/JSM_Studio';
const releaseLink = document.querySelector('#download-link');
const releaseInfo = document.querySelector('#release-info');
const list = document.querySelector('#community-list');
const search = document.querySelector('#profile-search');
let profiles = [];
const make = (tag, text, className) => { const el = document.createElement(tag); if (text) el.textContent = text; if (className) el.className = className; return el; };
function renderProfiles() {
  list.replaceChildren();
  const query = search.value.trim().toLocaleLowerCase();
  const filtered = profiles.filter(p => [p.name, p.game, p.controller, ...p.tags].join(' ').toLocaleLowerCase().includes(query));
  if (!filtered.length) { list.append(make('p', '没有匹配的配置，试试其他关键词。', 'subtle')); return; }
  for (const p of filtered) {
    const card = make('article', '', 'community-card');
    card.append(make('small', p.game), make('h3', p.name), make('p', p.description));
    const tags = make('div', '', 'tags');
    [p.verified ? '维护者标记已验证' : '示例 · 待核对', ...p.tags].forEach(t => tags.append(make('span', t)));
    card.append(tags, make('p', p.controller));
    const footer = make('footer');
    footer.append(make('span', `${p.author} · ${p.updatedAt}`));
    const link = make('a', '查看 / 下载 TXT ↗');
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
    renderProfiles();
  } catch {
    list.replaceChildren(make('p', '暂时无法获取配置列表。你仍可在 GitHub 配置仓库查看和下载。', 'subtle'));
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
    releaseLink.href = installer.browser_download_url;
    releaseLink.replaceChildren(document.createTextNode(`下载 ${release.tag_name} 正式版 `), make('span', '↓'));
    releaseInfo.textContent = `${release.tag_name} · Windows x64 · ${(installer.size / 1024 / 1024).toFixed(1)} MB · GitHub Releases`;
  } catch { /* The latest-release page remains a working fallback. */ }
}
void loadCatalog(); void loadRelease();
