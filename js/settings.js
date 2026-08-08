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

/* Settings > Versions */
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