/* ============================================================
   Config
   ============================================================ */
const wallpapers = [
  '2058x1440/MCV_SummerDropKeyArt_NetDownloadableWallpaper_2058x1440.png',
  '2058x1440/Minecraft_TheGardenAwakens_DotNet_2058x1440.png',
  '2058x1440/Minecraft_Trails&Tales_.Net_2058x1440.png',
  '2058x1440/wallpaper_minecraft_bedrock_edition_2058x1440.png',
  '2058x1440/wallpaper_minecraft_caves_cliffs(part1)_2058x1440.png',
  '2058x1440/wallpaper_minecraft_caves_cliffs(part2)_2058x1440.png',
  '2058x1440/wallpaper_minecraft_nether_update_2058x1440.png',
  '2058x1440/wallpaper_minecraft_trickytrials_2058x1440.png',
  '2058x1440/wallpaper_minecraft_world_color_2058x1440.png'
];

document.getElementById('background').style.backgroundImage =
  'url("' + wallpapers[Math.floor(Math.random() * wallpapers.length)] + '")';

/* ============================================================
   Sidebar navigation / pages
   ============================================================ */
const navButtons = document.querySelectorAll('.nav-btn');
const pageNames = ['home', 'news', 'mods', 'log', 'settings', 'folder'];

navButtons.forEach((btn) => {
  btn.textContent = '';

  const indicator = document.createElement('span');
  indicator.className = 'indicator';
  btn.appendChild(indicator);

  const wrap = document.createElement('span');
  wrap.className = 'icon-wrap';
  wrap.style.display = 'flex';
  wrap.style.alignItems = 'center';
  btn.insertBefore(wrap, btn.firstChild);

  const img = document.createElement('img');
  img.src = btn.dataset.icon;
  img.alt = '';
  wrap.appendChild(img);

  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = btn.dataset.lbl;
  wrap.appendChild(label);

  btn.addEventListener('click', () => switchPage(btn.dataset.page));
});

function switchPage(name) {
  navButtons.forEach((b) => b.classList.toggle('active', b.dataset.page === name));
  const entering = document.getElementById('page-' + name);
  const leaving = pageNames
    .map((p) => document.getElementById('page-' + p))
    .find((el) => el.classList.contains('active') && el !== entering);
  if (leaving) {
    leaving.classList.remove('active');
    leaving.classList.add('leaving');
    setTimeout(() => leaving.classList.remove('leaving'), 200);
  }
  entering.classList.add('active');
  entering.classList.remove('leaving');
  if (name === 'news' && !newsLoaded) loadNews();
  if (name === 'log') renderLog();
  if (name === 'folder') refreshFolderPage();
}

/* ============================================================
   Version dropdown (grouped)
   ============================================================ */
const versionGroups = [
  { label: 'LATEST', items: [
    { id: 'latest', name: 'Latest Release' },
    { id: 'snapshot', name: 'Latest Snapshot' }
  ]},
  { label: 'RELEASES', items: [
    { id: '1.21', name: '1.21' },
    { id: '1.20', name: '1.20' },
    { id: '1.19', name: '1.19' },
    { id: '1.18', name: '1.18' },
    { id: '1.17', name: '1.17' },
    { id: '1.16', name: '1.16' },
    { id: '1.15', name: '1.15' },
    { id: '1.14', name: '1.14' },
    { id: '1.13', name: '1.13' }
  ]},
  { label: 'ARCHIVED', items: [
    { id: '1.12', name: '1.12' },
    { id: '1.11', name: '1.11' },
    { id: '1.10', name: '1.10' },
    { id: '1.9', name: '1.9' },
    { id: '1.8', name: '1.8' },
    { id: '1.7', name: '1.7' },
    { id: '1.6', name: '1.6' },
    { id: '1.5', name: '1.5' },
    { id: '1.4', name: '1.4' }
  ]}
];

const combo = document.getElementById('version-select');
const menu = document.getElementById('version-menu');
const comboLabel = document.getElementById('version-label');
const sidebarVersion = document.querySelector('#sidebar .version-label');

let currentVersion = null;
let itemEls = [];

function setVersion(id) {
  currentVersion = versionGroups
    .flatMap((g) => g.items)
    .find((v) => v.id === id) || versionGroups[0].items[0];
  comboLabel.textContent = currentVersion.name;
  sidebarVersion.textContent = currentVersion.name;
  itemEls.forEach((it) => it.classList.toggle('selected', it.dataset.id === currentVersion.id));
  closeMenu();
  updatePlayText();
}

function buildMenu() {
  menu.innerHTML = '';
  itemEls = [];
  versionGroups.forEach((group) => {
    const header = document.createElement('div');
    header.className = 'group-label';
    header.textContent = group.label;
    menu.appendChild(header);

    group.items.forEach((v) => {
      const item = document.createElement('div');
      item.className = 'item';
      item.dataset.id = v.id;
      item.textContent = v.name;
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        setVersion(v.id);
      });
      menu.appendChild(item);
      itemEls.push(item);
    });
  });
}

function closeMenu() {
  menu.classList.remove('open');
  combo.classList.remove('open');
}

function openMenu() {
  const idx = itemEls.findIndex((el) => el.dataset.id === currentVersion.id);
  itemEls.forEach((el) => el.classList.remove('highlighted'));
  if (idx >= 0) {
    itemEls[idx].classList.add('highlighted');
    itemEls[idx].scrollIntoView({ block: 'nearest' });
  }
  menu.classList.add('open');
  combo.classList.add('open');
}

function moveHighlight(step) {
  const idx = itemEls.findIndex((el) => el.classList.contains('highlighted'));
  const next = (idx + step + itemEls.length) % itemEls.length;
  itemEls.forEach((el) => el.classList.remove('highlighted'));
  itemEls[next].classList.add('highlighted');
  itemEls[next].scrollIntoView({ block: 'nearest' });
}

combo.addEventListener('click', (e) => {
  e.stopPropagation();
  if (menu.classList.contains('open')) closeMenu();
  else openMenu();
});

combo.addEventListener('keydown', (e) => {
  if (!menu.classList.contains('open')) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      openMenu();
    }
    return;
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    moveHighlight(1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    moveHighlight(-1);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const sel = itemEls.find((el) => el.classList.contains('highlighted'));
    if (sel) setVersion(sel.dataset.id);
  } else if (e.key === 'Escape') {
    e.preventDefault();
    closeMenu();
  }
});

document.addEventListener('click', (e) => {
  if (!menu.contains(e.target)) closeMenu();
});

/* ============================================================
   Play button
   ============================================================ */
const playMain = document.getElementById('play-main');

function isDownloadable() {
  return currentVersion && currentVersion.id !== 'latest' && currentVersion.id !== 'snapshot';
}

function updatePlayText() {
  playMain.textContent = isDownloadable() ? 'DOWNLOAD AND PLAY' : 'PLAY';
}

/* ============================================================
   Progress bar
   ============================================================ */
const progress = document.getElementById('progress');
const label = document.getElementById('progress-label');
const bar = document.createElement('div');
bar.className = 'bar';
progress.insertBefore(bar, label);

function showProgress(text) {
  label.textContent = text || '';
  bar.style.width = '0%';
  progress.classList.add('show');
}

function hideProgress() {
  progress.classList.remove('show');
}

/* ============================================================
   News page
   ============================================================ */
const newsGrid = document.getElementById('news-grid');
const newsStatus = document.getElementById('news-status');
const newsMore = document.getElementById('news-more');
const NEWS_URL = 'https://www.minecraft.net/content/minecraftnet/language-masters/en-us/jcr:content/root/'
  + 'container/image_grid_a_copy_64.articles.page-$PAGE.json';

let newsLoaded = false;
let newsPage = 1;
let newsLoading = false;

function showStatus(el, text) {
  if (!el) return;
  el.textContent = text || '';
  el.style.display = text ? 'block' : 'none';
}

async function loadNews() {
  if (newsLoading) return;
  newsLoading = true;
  showStatus(newsStatus, 'Loading articles...');
  try {
    const url = NEWS_URL.replace('$PAGE', newsPage);
    let text;
    if (window.launcher && window.launcher.get) {
      try {
        text = await window.launcher.get(url);
      } catch (e) {
        text = null;
      }
    }
    if (text === null || text === undefined) {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      text = await resp.text();
    }
    renderNews(JSON.parse(text));
    newsPage += 1;
    newsLoaded = true;
    showStatus(newsStatus, '');
  } catch (err) {
    showStatus(newsStatus, 'Could not load news: ' + err.message);
  } finally {
    newsLoading = false;
  }
}

function renderNews(json) {
  const arr = json.article_grid || [];
  arr.forEach((e) => {
    const t = e.preferred_tile || e.default_tile;
    if (!t) return;
    const rawImg = (t.image && (t.image.imageURL || t.image.url)) || '';
    const src = rawImg ? 'https://www.minecraft.net' + rawImg : 'Resources/artwork0.png';
    const card = document.createElement('div');
    card.className = 'news-card';
    card.innerHTML =
      '<img alt="" src="' + src + '" loading="lazy"/>' +
      '<div class="desc"><div class="n-title"></div><div class="n-text"></div></div>';
    card.querySelector('.n-title').textContent = t.title || t.text || '';
    card.querySelector('.n-text').textContent = t.sub_header || '';
    card.addEventListener('click', () => {
      window.open('https://minecraft.net' + (e.article_url || e.url || ''), '_blank');
    });
    newsGrid.appendChild(card);
  });
}

newsMore.addEventListener('click', loadNews);

/* ============================================================
   Mods page
   ============================================================ */
let moddb = [];

function buildMods() {
  const grid = document.getElementById('mods-grid');
  const status = document.getElementById('mods-status');
  status.textContent = 'Loading mods…';
  window.launcher.get('https://github.com/minecraft-linux/mcpelauncher-moddb/raw/main/moddb.json?v=' + Math.random())
    .then((text) => {
      moddb = JSON.parse(text);
      grid.innerHTML = '';
      if (!moddb.length) {
        status.textContent = 'No mods found in the database.';
        return;
      }
      status.textContent = moddb.length + ' mods available';
      moddb.forEach((m) => {
        const card = document.createElement('div');
        card.className = 'mod-card';
        const title = document.createElement('div');
        title.className = 'mod-name';
        title.textContent = m.name || 'Untitled Mod';
        const desc = document.createElement('div');
        desc.className = 'mod-desc';
        desc.textContent = m.description || '';
        const img = document.createElement('img');
        img.alt = m.name;
        img.src = m.image || 'Resources/icon-home.png';
        card.appendChild(img);
        card.appendChild(title);
        card.appendChild(desc);
        card.addEventListener('click', () => openMod(m));
        grid.appendChild(card);
      });
    })
    .catch((e) => {
      status.textContent = 'Failed to load mods: ' + (e && e.message || e);
    });
}
buildMods();

const modPanel = document.getElementById('mod-panel');
document.getElementById('mod-close').addEventListener('click', closeMod);
modPanel.addEventListener('click', (e) => {
  if (e.target === modPanel) closeMod();
});

function openMod(m) {
  document.getElementById('mod-title').textContent = m.name || 'Untitled Mod';
  document.getElementById('mod-image').src = m.image || 'Resources/icon-home.png';
  document.getElementById('mod-desc').textContent = m.description || '';
  const rows = document.getElementById('mod-versions');
  rows.innerHTML = '';
  (m.versions || []).forEach((v) => {
    const row = document.createElement('div');
    row.className = 'mod-row';
    const ver = document.createElement('span');
    ver.className = 'mod-row-ver';
    ver.textContent = v.version;
    const extra = document.createElement('span');
    extra.className = 'mod-row-extra';
    extra.textContent = (v.assets ? Object.keys(v.assets).join(', ') : '');
    const dl = document.createElement('button');
    dl.className = 'm-btn accent';
    dl.textContent = 'Download';
    dl.addEventListener('click', () => {
      const assets = v.assets || {};
      const url = assets['x86_64'] || assets['arm64-v8a'] || assets[Object.keys(assets)[0]];
      if (url) window.open(url, '_blank');
    });
    row.appendChild(ver);
    row.appendChild(extra);
    row.appendChild(dl);
    rows.appendChild(row);
  });
  modPanel.classList.add('show');
}

function closeMod() {
  modPanel.classList.remove('show');
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modPanel.classList.contains('show')) closeMod();
});

/* Tabs (news/settings/mods) */
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    const scope = tab.closest('.page');
    scope.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    if (!tab.dataset.tab) return;
    scope.querySelectorAll('.tab-pane').forEach((p) => p.classList.remove('active'));
    const pane = scope.querySelector('#' + tab.dataset.tab);
    if (pane) pane.classList.add('active');
  });
});

/* ============================================================
   Log page
   ============================================================ */
const logLines = [];

function renderLog() {
  const view = document.getElementById('log-view');
  view.innerHTML = '';
  if (!logLines.length) {
    const p = document.createElement('div');
    p.className = 'log-placeholder';
    p.textContent = 'Run the game to generate the Game Log.';
    view.appendChild(p);
    return;
  }
  logLines.forEach((l) => {
    const div = document.createElement('div');
    if (l === null) {
      div.innerHTML = '<br/>';
    } else if (l.startsWith('[WARN')) {
      div.className = 'err';
      div.textContent = l;
    } else {
      div.className = l.startsWith('[INFO]') ? '' : 'dim';
      div.textContent = l;
    }
    view.appendChild(div);
  });
}

const copyBtn = document.getElementById('log-copy');
const copyIcon = copyBtn.querySelector('img');
let copyTimer = null;
copyBtn.addEventListener('click', async () => {
  const text = logLines.filter((l) => l !== null).join('\n');
  try {
    await navigator.clipboard.writeText(text || 'Run the game to generate the Game Log.');
  } catch (e) { /* clipboard may be unavailable */ }
  if (copyTimer) clearTimeout(copyTimer);
  copyBtn.classList.add('copied');
  if (copyIcon) copyIcon.remove();
  let label = copyBtn.querySelector('.copied-label');
  if (!label) {
    label = document.createElement('span');
    label.className = 'copied-label';
    label.textContent = 'Copied';
    copyBtn.appendChild(label);
  }
  copyTimer = setTimeout(() => {
    copyBtn.classList.remove('copied');
    if (copyBtn.querySelector('.copied-label')) copyBtn.querySelector('.copied-label').remove();
    if (copyIcon && !copyBtn.querySelector('img')) copyBtn.insertBefore(copyIcon, copyBtn.firstChild);
  }, 1400);
});

/* ============================================================
   Settings page
   ============================================================ */
const settingsOpts = ['opt-hide', 'opt-log', 'opt-updates', 'opt-banners', 'opt-exitbtn', 'opt-chromeos', 'opt-trial', 'opt-devlog'];
settingsOpts.forEach((id) => {
  const el = document.getElementById(id);
  if (!el) return;
  const stored = localStorage.getItem(id);
  if (stored !== null) el.checked = stored === '1';
  el.addEventListener('change', () => localStorage.setItem(id, el.checked ? '1' : '0'));
});

/* Game data directory + folder opening */
let dataDir = '';

async function refreshDataDir() {
  if (window.launcher && window.launcher.getDataDir) {
    try {
      dataDir = await window.launcher.getDataDir();
    } catch (e) {
      dataDir = '';
    }
  }
  if (!dataDir) {
    dataDir = localStorage.getItem('game-dir') || '~/.config/minecraft-launcher';
  }
  document.querySelectorAll('#folder-path, #game-data-dir').forEach((el) => {
    el.textContent = dataDir;
  });
}

async function openDataDir() {
  if (window.launcher && window.launcher.openFolder) {
    try {
      await window.launcher.openFolder();
      return;
    } catch (e) { /* fallthrough */ }
  }
  alert('Open folder in your file manager:\n' + dataDir);
}

function refreshFolderPage() {
  refreshDataDir();
}

document.getElementById('open-data-dir').addEventListener('click', openDataDir);
document.getElementById('open-folder-btn').addEventListener('click', openDataDir);

/* About */
(function () {
  const aboutV = document.getElementById('about-version');
  const aboutE = document.getElementById('about-electron');
  if (aboutV) aboutV.textContent = '1.0.0';
  if (aboutE && window.appInfo) aboutE.textContent = window.appInfo.version;
})();

/* ============================================================
   Boot flow: Login -> Changelog -> Main
   ============================================================ */
function showOverlay(id) {
  document.querySelectorAll('.overlay-screen, .overlay-dialog').forEach((el) => el.classList.remove('show'));
  document.getElementById(id).classList.add('show');
}

function hideOverlays() {
  document.querySelectorAll('.overlay-screen, .overlay-dialog').forEach((el) => el.classList.remove('show'));
}

document.getElementById('login-google').addEventListener('click', () => {
  localStorage.setItem('signed-in', '1');
  document.body.classList.remove('login-mode');
  if (!localStorage.getItem('account-password')) {
    openUnlock('set');
  } else {
    hideOverlays();
  }
});

document.getElementById('login-trial').addEventListener('click', () => {
  localStorage.setItem('signed-in', '1');
  localStorage.setItem('opt-trial', '1');
  document.getElementById('opt-trial').checked = true;
  document.body.classList.remove('login-mode');
  continueAfterLoginScreen();
});

document.getElementById('login-help').addEventListener('click', () => {
  window.open('https://minecraft-linux.github.io', '_blank');
});

let unlockMode = 'verify';

function continueAfterLoginScreen() {
  if (localStorage.getItem('changelog-seen') !== '1') {
    localStorage.setItem('changelog-seen', '1');
    showOverlay('changelog-screen');
  } else {
    hideOverlays();
  }
}

document.getElementById('changelog-continue').addEventListener('click', () => {
  hideOverlays();
});

document.getElementById('sign-out').addEventListener('click', () => {
  localStorage.removeItem('signed-in');
  localStorage.removeItem('unlocked');
  localStorage.removeItem('account-password');
  location.reload();
});

function bootFlow() {
  const signedIn = localStorage.getItem('signed-in') === '1';
  if (!signedIn) {
    document.body.classList.add('login-mode');
    showOverlay('login-screen');
    return;
  }
  if (localStorage.getItem('account-password')) {
    openUnlock('verify');
    return;
  }
  if (localStorage.getItem('changelog-seen') !== '1') {
    localStorage.setItem('changelog-seen', '1');
    showOverlay('changelog-screen');
  }
}
bootFlow();

/* ============================================================
   Unlock screen
   ============================================================ */
function openUnlock(mode) {
  unlockMode = mode;
  document.getElementById('unlock-pwd').value = '';
  document.getElementById('unlock-invalid').checked = false;
  document.getElementById('unlock-warning').classList.remove('show');
  document.body.classList.add('login-mode');
  showOverlay('unlock-screen');
}

function attemptUnlock() {
  const invalid = document.getElementById('unlock-invalid').checked;
  const pwd = document.getElementById('unlock-pwd').value;
  const stored = localStorage.getItem('account-password');
  const ok = invalid || (unlockMode === 'set' ? pwd.length >= 4 : pwd === stored);
  if (ok) {
    document.body.classList.remove('login-mode');
    if (unlockMode === 'set') localStorage.setItem('account-password', pwd);
    hideOverlays();
    if (unlockMode === 'verify' || unlockMode === 'set') continueAfterLoginScreen();
  } else {
    const warn = document.getElementById('unlock-warning');
    warn.classList.add('show');
    setTimeout(() => warn.classList.remove('show'), 1400);
    const field = document.getElementById('unlock-pwd');
    field.classList.remove('shake');
    void field.offsetWidth;
    field.classList.add('shake');
    setTimeout(() => field.classList.remove('shake'), 500);
  }
}

document.getElementById('unlock-continue').addEventListener('click', attemptUnlock);
document.getElementById('unlock-pwd').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') attemptUnlock();
});
document.getElementById('unlock-pwd').addEventListener('input', () => {
  document.getElementById('unlock-pwd').classList.remove('shake');
});

/* ============================================================
   Message screen (Error / Unsupported)
   ============================================================ */
function showMessageScreen(title, html) {
  document.getElementById('msg-title').textContent = title;
  document.getElementById('msg-body').innerHTML = html || '';
  showOverlay('message-screen');
}

document.getElementById('msg-ok').addEventListener('click', () => hideOverlays());

/* Dev preview buttons */
document.querySelectorAll('.m-btn[data-screen]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const which = btn.dataset.screen;
    if (which === 'info') {
      showMessageScreen('Info', '<b style="color:#f66">Not logged in</b><br/><br/>Google login is required to download Minecraft.');
    } else if (which === 'unsupported') {
      showMessageScreen('Info', '<b style="color:#f66">Sorry your Computer cannot run Minecraft with this Launcher</b><br/><br/>Details:<br/>CPU too old (no SSSE3 support).');
    } else if (which === 'changelog') {
      showOverlay('changelog-screen');
    } else if (which === 'unlock') {
      openUnlock('verify');
    }
  });
});

/* ============================================================
   Gamepad Tool dialog
   ============================================================ */
document.getElementById('gamepad-open').addEventListener('click', () => showOverlay('gamepad-tool'));
document.getElementById('gamepad-close').addEventListener('click', () => hideOverlays());

/* ============================================================
   Troubleshooter dialog
   ============================================================ */
document.getElementById('trouble-open').addEventListener('click', () => showOverlay('troubleshooter'));
document.getElementById('trouble-close').addEventListener('click', () => hideOverlays());

document.getElementById('trouble-run').addEventListener('click', () => {
  const box = document.getElementById('trouble-results');
  box.innerHTML = '<div class="t-item">Checking installation...</div>';
  setTimeout(() => {
    box.innerHTML = '';
    const items = [
      { ok: true, text: 'Version database reachable' },
      { ok: true, text: 'Game data directory writable' },
      { ok: false, text: 'No Google Play account signed in' },
      { ok: true, text: 'DRM mod up to date' },
      { ok: false, text: 'Gamepad present' }
    ];
    items.forEach((i) => {
      const d = document.createElement('div');
      d.className = 't-item ' + (i.ok ? 'ok' : 'bad');
      d.textContent = (i.ok ? '[OK] ' : '[!] ') + i.text;
      box.appendChild(d);
    });
  }, 700);
});

/* ============================================================
   Helpers
   ============================================================ */
function $(sel) {
  return document.querySelector(sel);
}

/* ============================================================
   Profile editor
   ============================================================ */
let profile = { name: 'default', version: 'latest', dataDir: '', dataDirChecked: false, patch: false, isDefault: true };

function loadProfileFromStorage() {
  profile.isDefault = true;
  try {
    const raw = localStorage.getItem('profile');
    if (raw) profile = Object.assign(profile, JSON.parse(raw));
  } catch (e) { /* ignore */ }
  profile.isDefault = true;
}

function saveProfileToStorage() {
  localStorage.setItem('profile', JSON.stringify(profile));
}

function fillProfileEditor() {
  $('#profile-title').textContent = 'Edit profile';
  $('#profile-delete').style.display = '';
  $('#profile-name').value = profile.name || '';
  $('#profile-version').value = profile.version || 'latest';
  $('#profile-datadir').checked = !!profile.dataDirChecked;
  $('#profile-dir').value = profile.dataDir || '';
  $('#profile-dir').disabled = !profile.dataDirChecked;
  $('#profile-dir-pick').disabled = !profile.dataDirChecked;
  $('#profile-patch').checked = !!profile.patch;
  $('#profile-dir-show').textContent = profile.dataDir || 'default';
}

function openProfileEditor() {
  loadProfileFromStorage();
  fillProfileEditor();
  showOverlay('profile-editor');
}

document.getElementById('edit-profile').addEventListener('click', openProfileEditor);
document.getElementById('edit-profile-btn').addEventListener('click', openProfileEditor);

document.getElementById('profile-datadir').addEventListener('change', (e) => {
  $('#profile-dir').disabled = !e.target.checked;
  $('#profile-dir-pick').disabled = !e.target.checked;
});

document.getElementById('profile-dir-pick').addEventListener('click', async () => {
  if (window.launcher && window.launcher.openFolder) {
    await window.launcher.openFolder();
  } else {
    $('#profile-dir').value = '/home/user/.minecraft/launcher';
  }
});

document.getElementById('profile-cancel').addEventListener('click', () => hideOverlays());

document.getElementById('profile-save').addEventListener('click', () => {
  profile.name = $('#profile-name').value;
  profile.version = $('#profile-version').value;
  profile.dataDir = $('#profile-dir').value;
  profile.dataDirChecked = $('#profile-datadir').checked;
  profile.patch = $('#profile-patch').checked;
  saveProfileToStorage();
  setVersion(profile.version);
  hideOverlays();
});

document.getElementById('profile-delete').addEventListener('click', () => {
  localStorage.removeItem('profile');
  profile = { name: '', version: 'latest', dataDir: '', dataDirChecked: false, patch: false };
  setVersion('latest');
  hideOverlays();
});

loadProfileFromStorage();

/* ============================================================
   Settings > Versions
   ============================================================ */
document.getElementById('ver-fetch').addEventListener('click', () => {
  const box = document.getElementById('ver-listing');
  box.innerHTML = '';
  const list = ['1.21.1', '1.21.0', '1.20.1', '1.20.0', '1.19.70', '1.19.60', '1.19.0', '1.18.0'];
  ['x86_64', 'arm64-v8a'].forEach((abi) => {
    list.forEach((v) => {
      const row = document.createElement('div');
      row.className = 't-item ok';
      row.textContent = v + ' (' + abi + ')';
      box.appendChild(row);
    });
  });
});

/* ============================================================
   Download simulation
   ============================================================ */
const downloadBtn = document.getElementById('download-btn');
let downloading = false;

downloadBtn.addEventListener('click', () => {
  if (downloading) return;
  downloading = true;
  downloadBtn.disabled = true;
  playMain.textContent = 'DOWNLOADING...';

  showProgress('Downloading Minecraft...');
  let step = 0;
  const timer = setInterval(() => {
    step += 1;
    bar.style.width = Math.min(95, (step / 7) * 100) + '%';
    if (step >= 6 && step < 9) {
      label.textContent = 'Extracting Minecraft...';
    } else if (step >= 9) {
      clearInterval(timer);
      hideProgress();
      downloadBtn.disabled = false;
      downloading = false;
      updatePlayText();
    }
  }, 140);
});

/* ============================================================
   Init
   ============================================================ */
updatePlayText();
buildMenu();
setVersion('latest');
if (profile.version && profile.version !== 'latest') setVersion(profile.version);
refreshDataDir();