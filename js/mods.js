/* ============================================================
   mods.js: Mods page + slide-in details panel
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