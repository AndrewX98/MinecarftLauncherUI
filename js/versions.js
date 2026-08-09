/* ============================================================
   versions.js: version dropdown (live from Google Play)
   ============================================================ */
const DEFAULT_PACKAGE = 'com.google.android.gm';
let versionGroups = [
  { label: 'LATEST', items: [
    { id: 'latest', name: 'Latest Release' }
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

async function refreshFromPlay(pkg) {
  try {
    const raw = await window.launcher.native.appInfo(pkg);
    const info = JSON.parse(raw);
    if (!info || info.error || !info.versionCode) {
      currentVersion = versionGroups[0].items[0];
      comboLabel.textContent = currentVersion.name;
      sidebarVersion.textContent = currentVersion.name;
      return;
    }
    versionGroups = [
      { label: 'LATEST', items: [
        { id: 'latest', name: 'Latest Release' }
      ]},
      { label: 'PLAY STORE', items: [
        { id: String(info.versionCode), name: info.version + ' (' + info.versionCode + ')' }
      ]}
    ];
    setVersion(String(info.versionCode));
  } catch (e) {
    currentVersion = versionGroups[0].items[0];
    comboLabel.textContent = currentVersion.name;
    sidebarVersion.textContent = currentVersion.name;
  }
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