/* ============================================================
   mods.js: Mods page + slide-in details panel
   ============================================================ */
let moddb = [];
let modsDir = null;

async function modsTargetDir() {
  if (modsDir) return modsDir;
  try {
    const base = await window.launcher.native.getDataDir();
    modsDir = base.replace(/\/$/, '') + '/mods';
  } catch (e) {
    modsDir = null;
  }
  return modsDir;
}

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

let installedMods = new Set();   // .so file names in the mods dir

async function refreshInstalled() {
  const dir = await modsTargetDir();
  if (!dir) return;
  installedMods.clear();
  try {
    const entries = await window.launcher.listFiles(dir);
    entries.forEach((f) => {
      if (f.endsWith('.so') && !f.startsWith('.')) installedMods.add(f);
    });
  } catch (e) { /* ignore */ }
  renderInstalled();
}

function renderInstalled() {
  const pane = document.getElementById('mods-installed');
  const status = pane.querySelector('.page-status');
  if (!installedMods.size) {
    status.textContent = 'No mods installed. Installed mods appear here after downloading.';
    return;
  }
  status.textContent = installedMods.size + ' mod(s) installed';
  pane.querySelectorAll('.t-item').forEach((el) => el.remove());
  [...installedMods].sort().forEach((file) => {
    const row = document.createElement('div');
    row.className = 't-item ok';
    const label = document.createElement('span');
    label.textContent = file;
    const openBtn = document.createElement('button');
    openBtn.className = 'm-btn';
    openBtn.textContent = 'Open';
    openBtn.addEventListener('click', async () => {
      const dir = await modsTargetDir();
      window.launcher.openPath(dir + '/' + file);
    });
    const delBtn = document.createElement('button');
    delBtn.className = 'm-btn';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', async () => {
      const dir = await modsTargetDir();
      await window.launcher.deleteMod(dir + '/' + file);
      refreshInstalled();
    });
    row.appendChild(label);
    row.appendChild(openBtn);
    row.appendChild(delBtn);
    status.insertAdjacentElement('afterend', row);
  });
}
refreshInstalled();

async function openMod(m) {
  document.getElementById('mod-title').textContent = m.name || 'Untitled Mod';
  document.getElementById('mod-image').src = m.image || 'Resources/icon-home.png';
  document.getElementById('mod-desc').textContent = m.description || '';
  const rows = document.getElementById('mod-versions');
  rows.innerHTML = '';
  await refreshInstalled();
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
    const isInstalled = installedMods.has(m.name);
    if (isInstalled) {
      dl.textContent = 'Installed';
      dl.disabled = true;
    } else {
      dl.textContent = 'Download';
    }
    dl.addEventListener('click', async () => {
      if (installedMods.has(m.name)) {
        const dir = await modsTargetDir();
        window.launcher.openPath(dir);
        return;
      }
      const assets = v.assets || {};
      const url = assets['x86_64'] || assets['arm64-v8a'] || assets[Object.keys(assets)[0]];
      if (!url) {
        dl.textContent = 'No file';
        return;
      }
      dl.disabled = true;
      dl.textContent = 'Downloading...';
      try {
        const base = await modsTargetDir();
        const zip = await window.launcher.downloadFile(url, base + '/.tmp');
        dl.textContent = 'Extracting...';
        const dest = base;
        const res = await window.launcher.extractMod(zip, dest);
        if (!(res && res.ok)) throw new Error((res && res.error) || 'extract failed');
        dl.textContent = 'Installed';
        dl.disabled = true;
        await refreshInstalled();
      } catch (e) {
        dl.textContent = 'Failed';
        dl.disabled = false;
        dl.title = (e && e.message) || String(e);
      }
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