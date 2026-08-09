/* ============================================================
   settings.js: Settings page options, data dir, about, versions
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
  if (window.launcher && window.launcher.native) {
    try {
      if (await window.launcher.native.ready()) {
        dataDir = await window.launcher.native.getDataDir();
      }
    } catch (e) {
      dataDir = '';
    }
  }
  if (!dataDir) {
    if (window.launcher && window.launcher.getDataDir) {
      try {
        dataDir = await window.launcher.getDataDir();
      } catch (e) {
        dataDir = '';
      }
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

/* Clear downloaded APKs + extracted dirs */
document.getElementById('clear-cache').addEventListener('click', async () => {
  const btn = document.getElementById('clear-cache');
  btn.disabled = true;
  btn.textContent = 'Clearing...';
  try {
    let res = { removed: 0 };
    if (window.launcher && window.launcher.native && window.launcher.native.clearCache) {
      res = await window.launcher.native.clearCache();
    }
    localStorage.removeItem('installed-extract-dir');
    Object.keys(localStorage)
      .filter((k) => k.startsWith('mod-installed-') || k.startsWith('m-installed-'))
      .forEach((k) => localStorage.removeItem(k));
    btn.textContent = 'Cleared ' + res.removed + ' item(s)';
    updatePlayText();
  } catch (e) {
    btn.textContent = 'Failed';
  }
  setTimeout(() => {
    btn.disabled = false;
    btn.textContent = 'Clear Download Cache';
  }, 2000);
});

/* About */
(function () {
  const aboutV = document.getElementById('about-version');
  const aboutE = document.getElementById('about-electron');
  if (aboutV) aboutV.textContent = '1.0.0';
  if (aboutE && window.appInfo) aboutE.textContent = window.appInfo.version;
})();

/* Settings > Versions: fetch the real current version from Play */
document.getElementById('ver-fetch').addEventListener('click', async () => {
  const box = document.getElementById('ver-listing');
  box.innerHTML = '';
  box.textContent = 'Fetching...';
  const pkg = (document.getElementById('ver-package').value || DEFAULT_PACKAGE).trim();
  try {
    const info = JSON.parse(await window.launcher.native.appInfo(pkg));
    if (info.error) {
      box.textContent = 'Error: ' + info.error;
      return;
    }
    box.innerHTML = '';
    const row = document.createElement('div');
    row.className = 't-item ok';
    row.textContent = info.version + ' (versionCode ' + info.versionCode + ')';
    box.appendChild(row);
  } catch (e) {
    box.textContent = 'Failed to fetch: ' + (e && e.message || e);
  }
});