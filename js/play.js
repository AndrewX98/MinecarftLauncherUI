/* ============================================================
   play.js: play button + progress bar + download simulation
   ============================================================ */
const playMain = document.getElementById('play-main');

function isDownloadable() {
  return currentVersion && currentVersion.id !== 'latest' && currentVersion.id !== 'snapshot';
}

function installedDir() {
  return localStorage.getItem('installed-extract-dir') || '';
}

function updatePlayText() {
  playMain.textContent = installedDir() ? 'PLAY' : 'DOWNLOAD';
}

const progress = document.getElementById('progress');
const label = document.getElementById('progress-label');
const bar = document.createElement('div');
bar.className = 'bar';
progress.insertBefore(bar, label);

function showProgress(text) {
  label.textContent = text || '';
  bar.style.width = '0%';
  progress.classList.add('show');
}

function hideProgress() {
  progress.classList.remove('show');
}

const downloadBtn = document.getElementById('download-btn');
let downloading = false;

function simulateDownload() {
  let step = 0;
  const timer = setInterval(() => {
    step += 1;
    bar.style.width = Math.min(95, (step / 7) * 100) + '%';
    if (step >= 6 && step < 9) {
      label.textContent = 'Extracting...';
    } else if (step >= 9) {
      clearInterval(timer);
      hideProgress();
      downloadBtn.disabled = false;
      downloading = false;
      updatePlayText();
    }
  }, 140);
}

async function nativeDownload() {
  if (!currentVersion || currentVersion.id === 'latest' || currentVersion.id === 'snapshot') {
    // no explicit version selected; native will use the latest
  }
  const pkg = DEFAULT_PACKAGE;
  const vc = currentVersion && /^\d+$/.test(String(currentVersion.id)) ? Number(currentVersion.id) : 0;

  const res = await window.launcher.native.downloadStart(pkg, vc);
  let j = {};
  try { j = JSON.parse(res); } catch (e) { /* ignore */ }
  if (j.error) {
    label.textContent = 'Download failed: ' + j.error;
    bar.style.width = '100%';
    setTimeout(() => {
      hideProgress();
      downloadBtn.disabled = false;
      downloading = false;
      updatePlayText();
    }, 2000);
    return;
  }

  const poll = setInterval(async () => {
    let st = {};
    try { st = JSON.parse(await window.launcher.native.downloadStatus()); } catch (e) { /* ignore */ }
    const pct = Math.max(0, Math.min(100, Math.round(st.progress * 100)));
    bar.style.width = pct + '%';
    const fmt = (b) => {
      const n = Number(b) || 0;
      if (n >= 1048576) return (n / 1048576).toFixed(1) + ' MB';
      if (n >= 1024) return (n / 1024).toFixed(1) + ' kB';
      return n + ' B';
    };
    if (st.done && st.ok) {
      clearInterval(poll);
      label.textContent = 'Download finished, extracting...';
      bar.style.width = '100%';
      try {
        let files = [];
        try {
          const r = typeof st.result === 'string' ? JSON.parse(st.result) : st.result;
          files = (r && r.files) || [];
        } catch (e) { /* ignore */ }
        const base = files.find((f) => /\.apk$/.test(f) && !f.includes('.config.')) || (files[0] || '');
        const dir = base.replace(/\.apk$/, '');
        if (base) {
          await window.launcher.native.extractApk(base, dir);
          localStorage.setItem('installed-extract-dir', dir);
        }
        label.textContent = 'Download finished and installed (' + fmt(st.bytesTotal) + ')';
      } catch (e) {
        label.textContent = 'Download finished, extract failed: ' + (e.message || e);
      }
      setTimeout(hideProgress, 1500);
      downloadBtn.disabled = false;
      downloading = false;
      updatePlayText();
    } else if (st.done) {
      clearInterval(poll);
      label.textContent = 'Download failed: ' + (st.error || 'unknown');
      bar.style.width = '100%';
      setTimeout(hideProgress, 1500);
      downloadBtn.disabled = false;
      downloading = false;
      updatePlayText();
    } else if (st.bytesTotal > 0) {
      label.textContent = `${pct}% · ${fmt(st.bytesDone)} / ${fmt(st.bytesTotal)}`;
    } else {
      label.textContent = 'Downloading...';
    }
  }, 200);
}

downloadBtn.addEventListener('click', async () => {
  if (downloading) return;
  const dir = installedDir();
  if (dir) {
    showProgress('Starting game...');
    const res = await window.launcher.launchGame(dir);
    setTimeout(hideProgress, 1200);
    if (res && res.error) {
      label.textContent = 'Failed to start: ' + res.error;
      bar.style.width = '100%';
      setTimeout(hideProgress, 2000);
    }
    return;
  }
  downloading = true;
  downloadBtn.disabled = true;
  playMain.textContent = 'DOWNLOADING...';
  showProgress('Downloading...');

  if (window.launcher && window.launcher.native && window.launcher.native.downloadStart) {
    window.launcher.native.ready().then((ok) => {
      if (ok === true) {
        nativeDownload().catch((e) => {
          label.textContent = 'Download failed: ' + e.message;
          bar.style.width = '100%';
          setTimeout(() => {
            hideProgress();
            downloadBtn.disabled = false;
            downloading = false;
            updatePlayText();
          }, 2000);
        });
        return;
      }
      simulateDownload();
    });
    return;
  }
  simulateDownload();
});