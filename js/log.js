/* ============================================================
   log.js: Game Log page + copy button
   ============================================================ */
const logLines = [];

function renderLog() {
  const view = document.getElementById('log-view');
  view.innerHTML = '';
  if (!logLines.length) {
    const p = document.createElement('div');
    p.className = 'log-placeholder';
    p.textContent = 'Run the game to generate the Game Log.';
    view.appendChild(p);
    return;
  }
  logLines.forEach((l) => {
    const div = document.createElement('div');
    if (l === null) {
      div.innerHTML = '<br/>';
    } else if (l.startsWith('[WARN')) {
      div.className = 'err';
      div.textContent = l;
    } else {
      div.className = l.startsWith('[INFO]') || l.startsWith('[') ? '' : 'dim';
      div.textContent = l;
    }
    view.appendChild(div);
  });
  view.scrollTop = view.scrollHeight;
}

if (window.launcher && window.launcher.native && window.launcher.onGameLog) {
  window.launcher.onGameLog((line) => {
    if (!logLines.length) document.getElementById('log-view').innerHTML = ''; // clear placeholder
    logLines.push(line);
    if (logLines.length > 400) logLines.splice(0, logLines.length - 400);
    renderLog();
  });
}

const copyBtn = document.getElementById('log-copy');
const copyIcon = copyBtn.querySelector('img');
let copyTimer = null;
copyBtn.addEventListener('click', async () => {
  const text = logLines.filter((l) => l !== null).join('\n');
  try {
    await navigator.clipboard.writeText(text || 'Run the game to generate the Game Log.');
  } catch (e) { /* clipboard may be unavailable */ }
  if (copyTimer) clearTimeout(copyTimer);
  copyBtn.classList.add('copied');
  if (copyIcon) copyIcon.remove();
  let label = copyBtn.querySelector('.copied-label');
  if (!label) {
    label = document.createElement('span');
    label.className = 'copied-label';
    label.textContent = 'Copied';
    copyBtn.appendChild(label);
  }
  copyTimer = setTimeout(() => {
    copyBtn.classList.remove('copied');
    if (copyBtn.querySelector('.copied-label')) copyBtn.querySelector('.copied-label').remove();
    if (copyIcon && !copyBtn.querySelector('img')) copyBtn.insertBefore(copyIcon, copyBtn.firstChild);
  }, 1400);
});