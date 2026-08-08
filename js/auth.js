/* ============================================================
   auth.js: login -> password -> changelog boot flow
   ============================================================ */
/* Login screen */
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