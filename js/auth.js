/* ============================================================
   auth.js: login -> password -> changelog boot flow
   ============================================================ */
/* Login screen */
let loginNativeReady = false;

function showBusy(label) {
  const btn = document.getElementById('login-google');
  btn.disabled = true;
  btn.querySelector('.btn-main').textContent = label || 'SIGNING IN...';
}

function clearBusy() {
  const btn = document.getElementById('login-google');
  btn.disabled = false;
  btn.querySelector('.btn-main').textContent = 'SIGN IN';
}

function showLoginError(msg) {
  const box = document.getElementById('login-error');
  box.textContent = msg;
  box.style.display = 'block';
}

async function performLogin() {
  if (loginNativeReady) {
    showBusy();
    let res = {};
    try {
      res = JSON.parse(await window.launcher.native.googleSignIn());
    } catch (err) {
      res = { error: String(err) };
    }
    clearBusy();
    if (!res.ok) {
      showLoginError(res.errormsg || res.error || 'Login failed.');
      return;
    }
    localStorage.setItem('signed-in', '1');
    if (res.email) localStorage.setItem('account-email', res.email);
    document.body.classList.remove('login-mode');
    refreshFromPlay(DEFAULT_PACKAGE);
    if (!localStorage.getItem('account-password')) {
      openUnlock('set');
    } else {
      hideOverlays();
    }
    return;
  }

  // No native addon: keep the old local-only sign in.
  localStorage.setItem('signed-in', '1');
  document.body.classList.remove('login-mode');
  if (!localStorage.getItem('account-password')) {
    openUnlock('set');
  } else {
    hideOverlays();
  }
}

document.getElementById('login-google').addEventListener('click', performLogin);

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
  if (loginNativeReady && localStorage.getItem('signed-in') === '1') {
    // Restore the saved Google session (token from "gplay.account").
    window.launcher.native.login('', '').then((res) => {
      try {
        const r = JSON.parse(res);
        if (r.email) localStorage.setItem('account-email', r.email);
      } catch (e) { /* ignore */ }
    }).catch(() => { /* ignore */ });
  }
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

document.getElementById('sign-out').addEventListener('click', async () => {
  localStorage.removeItem('signed-in');
  localStorage.removeItem('unlocked');
  localStorage.removeItem('account-password');
  localStorage.removeItem('account-email');
  if (loginNativeReady) {
    try {
      await window.launcher.native.logout();
    } catch (e) { /* ignore */ }
  }
  location.reload();
});

async function bootFlow() {
  try {
    loginNativeReady = (await window.launcher.native.ready()) === true;
  } catch (e) {
    loginNativeReady = false;
  }
  const signedIn = localStorage.getItem('signed-in') === '1';
  if (!signedIn) {
    document.body.classList.add('login-mode');
    showOverlay('login-screen');
    return;
  }
  refreshFromPlay(DEFAULT_PACKAGE);
  if (loginNativeReady) {
    try {
      const res = await window.launcher.native.login('', '');
      const r = JSON.parse(res);
      if (r.ok && r.email) localStorage.setItem('account-email', r.email);
      refreshFromPlay(DEFAULT_PACKAGE);
    } catch (e) { /* ignore */ }
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