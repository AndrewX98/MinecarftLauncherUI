/* ============================================================
   play.js: play button + progress bar + download simulation
   ============================================================ */
const playMain = document.getElementById('play-main');

function isDownloadable() {
  return currentVersion && currentVersion.id !== 'latest' && currentVersion.id !== 'snapshot';
}

function updatePlayText() {
  playMain.textContent = isDownloadable() ? 'DOWNLOAD AND PLAY' : 'PLAY';
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

downloadBtn.addEventListener('click', () => {
  if (downloading) return;
  downloading = true;
  downloadBtn.disabled = true;
  playMain.textContent = 'DOWNLOADING...';

  showProgress('Downloading Minecraft...');
  let step = 0;
  const timer = setInterval(() => {
    step += 1;
    bar.style.width = Math.min(95, (step / 7) * 100) + '%';
    if (step >= 6 && step < 9) {
      label.textContent = 'Extracting Minecraft...';
    } else if (step >= 9) {
      clearInterval(timer);
      hideProgress();
      downloadBtn.disabled = false;
      downloading = false;
      updatePlayText();
    }
  }, 140);
});