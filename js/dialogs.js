/* ============================================================
   dialogs.js: message/error, dev preview, gamepad, troubleshooter
   ============================================================ */
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

/* Gamepad Tool dialog */
document.getElementById('gamepad-open').addEventListener('click', () => showOverlay('gamepad-tool'));
document.getElementById('gamepad-close').addEventListener('click', () => hideOverlays());

/* Troubleshooter dialog */
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