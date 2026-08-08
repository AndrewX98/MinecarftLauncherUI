/* ============================================================
   profile.js: profile editor
   ============================================================ */
let profile = { name: 'default', version: 'latest', dataDir: '', dataDirChecked: false, patch: false };

function loadProfileFromStorage() {
  try {
    const raw = localStorage.getItem('profile');
    if (raw) profile = Object.assign(profile, JSON.parse(raw));
  } catch (e) { /* ignore */ }
}

function saveProfileToStorage() {
  localStorage.setItem('profile', JSON.stringify(profile));
}

function fillProfileEditor() {
  $('#profile-title').textContent = 'Edit profile';
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