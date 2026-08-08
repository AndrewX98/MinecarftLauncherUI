/* ============================================================
   navigation.js: sidebar nav + page switching + tabs
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