const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

app.disableHardwareAcceleration();

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  let win = null;

  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  function gameDataDir() {
    return path.join(app.getPath('userData'), 'launcher');
  }

  ipcMain.handle('open-data-dir', () => {
    const dir = gameDataDir();
    shell.openPath(dir);
    return dir;
  });

  ipcMain.handle('open-path', (_e, p) => {
    if (typeof p === 'string' && p) shell.openPath(p);
    return p;
  });

  /* Delete downloaded APKs and extracted game dirs from the data dir. */
  ipcMain.handle('native:clearCache', async () => {
    const dir = native.getDataDir();
    let removed = 0;
    for (const entry of await fs.promises.readdir(dir)) {
      const full = path.join(dir, entry);
      if (/\.apk$/i.test(entry)) {
        try { await fs.promises.rm(full, { force: true }); removed++; } catch (e) { /* ignore */ }
      } else {
        try {
          const st = await fs.promises.stat(full);
          if (st.isDirectory() && entry.includes('.') && entry.match(/^\d+$/)) {
            await fs.promises.rm(full, { recursive: true, force: true });
            removed++;
          }
        } catch (e) { /* ignore */ }
      }
    }
    return { ok: true, removed };
  });

  /* Launch the game: mcpelauncher-client -dg <extracted game dir> -dd <data dir> */
  let gameChild = null;
  const sendGameLog = (line) => {
    if (win && !win.isDestroyed()) win.webContents.send('game-log', line);
  };
  ipcMain.handle('native:launchGame', async (_e, gameDir) => {
    if (gameChild) return { ok: true, pid: gameChild.pid };
    const bin = path.join(__dirname, 'bin', 'mcpelauncher-client');
    const dataDir = native && native.getDataDir
      ? native.getDataDir()
      : path.join(app.getPath('home'), '.local', 'share', 'mcpelauncher');
    const args = ['-dg', gameDir, '-dd', dataDir];
    return new Promise((resolve) => {
      const child = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      gameChild = child;
      child.on('error', (err) => resolve({ error: err.message }));
      const forward = (stream) => {
        stream.on('data', (d) => {
          const text = String(d).replace(/(\r?\n)+$/, '');
          text.split(/\r?\n/).forEach((l) => { if (l) sendGameLog(l); });
        });
      };
      forward(child.stdout);
      forward(child.stderr);
      child.on('spawn', () => resolve({ ok: true, pid: child.pid }));
      child.on('exit', (code) => {
        console.log('[game] exited', code);
        sendGameLog(null);
        gameChild = null;
      });
    });
  });

  ipcMain.handle('get-data-dir', () => gameDataDir());

  ipcMain.handle('fetch-url', async (_e, url) => {
    const resp = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000)
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    return resp.text();
  });

  /* Download a file to disk (used for mods). Returns the saved path. */
  ipcMain.handle('download-file', async (_e, url, destDir) => {
    const u = new URL(url);
    const out = path.join(destDir, path.basename(u.pathname) || 'download.bin');
    await fs.promises.mkdir(destDir, { recursive: true });
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const buf = Buffer.from(await resp.arrayBuffer());
    await fs.promises.writeFile(out, buf);
    return out;
  });

  /* List immediate subdirectory names of a folder (for the Installed mods tab). */
  ipcMain.handle('list-dirs', async (_e, dir) => {
    await fs.promises.mkdir(dir, { recursive: true });
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  });

  /* List file names in a folder (mods installed listing). */
  ipcMain.handle('list-files', async (_e, dir) => {
    await fs.promises.mkdir(dir, { recursive: true });
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    return entries.filter((e) => e.isFile()).map((e) => e.name);
  });

  /* Delete a mod folder (recursive), then prune empty parents. */
  ipcMain.handle('mods:delete', async (_e, dir) => {
    await fs.promises.rm(dir, { recursive: true, force: true });
    let parent = path.dirname(dir);
    for (let i = 0; i < 3; i++) {
      try {
        const rest = await fs.promises.readdir(parent);
        if (rest.length) break;
        await fs.promises.rmdir(parent);
      } catch (e) { break; }
      parent = path.dirname(parent);
    }
    return { ok: true };
  });

  /* Extract a downloaded mod zip into the mods folder. */
  ipcMain.handle('mods:extract', async (_e, zipPath, destDir) => {
    if (native && native.extractApk) {
      native.extractApk(zipPath, destDir);  // synchronous; async variant not required for mods
      while (true) {
        let st = {};
        try { st = JSON.parse(native.extractStatus()); } catch (e) { st = { done: true }; }
        if (st.done) {
          try { await fs.promises.rm(zipPath, { force: true }); } catch (e) { /* ignore */ }
          try { await fs.promises.rm(path.dirname(zipPath), { recursive: true, force: true }); } catch (e) { /* ignore */ }
          // Flatten .so files to the destination root so the game's ModLoader finds them.
          try {
            await flattenSoFiles(destDir);
          } catch (e) { /* ignore */ }
          return st;
        }
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    return { done: true, ok: false, error: 'native extract missing' };
  });

  /* Move every .so found anywhere under root to root itself, keeping other files/dirs. */
  async function flattenSoFiles(root) {
    const walk = async (dir) => {
      let entries;
      try { entries = await fs.promises.readdir(dir, { withFileTypes: true }); } catch (e) { return; }
      for (const ent of entries) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) {
          await walk(full);
        } else if (ent.name.endsWith('.so') && path.dirname(full) !== root) {
          const target = path.join(root, ent.name);
          try { await fs.promises.rename(full, target); } catch (e) {
            try { await fs.promises.copyFile(full, target); await fs.promises.rm(full, { force: true }); } catch (e2) { /* ignore */ }
          }
        }
      }
    };
    await walk(root);
  }

  /* Native C++ bridge (launcher.node) */
  let native = null;
  try {
    native = require('./native/build/launcher.node');
  } catch (e) {
    console.error('Failed to load native addon:', e);
  }

  ipcMain.handle('native:ready', () => native !== null);
  ipcMain.handle('native:getDataDir', () => native.getDataDir());
  ipcMain.handle('native:getAbi', () => native.getAbi());
  ipcMain.handle('native:setDataDir', (_e, dir) => native.setDataDir(dir));
  ipcMain.handle('native:checkin', () => native.checkin());

  if (native && native.playSetDataDir) {
    const dataDir = native.getDataDir();
    native.playSetDataDir(dataDir);
    ipcMain.handle('native:login', (_e, email, password) => native.login(email, password));
    ipcMain.handle('native:loginWithToken', (_e, email, token) => native.loginWithToken(email, token));
    ipcMain.handle('native:logout', () => native.logout());
    ipcMain.handle('native:details', (_e, pkg) => native.details(pkg));
    ipcMain.handle('native:appInfo', (_e, pkg) => native.appInfo(pkg));
    ipcMain.handle('native:downloadStart', (_e, pkg, vc) => native.downloadStart(pkg, vc, dataDir));
    ipcMain.handle('native:downloadStatus', () => native.downloadStatus());
    ipcMain.handle('native:extractApk', (_e, apk, dir) => native.extractApk(apk, dir));
    ipcMain.handle('native:googleSignIn', () => googleSignIn());
  }

  const GOOGLE_LOGIN_URL =
      'https://accounts.google.com/embedded/setup/v2/android?source=com.android.settings' +
      '&xoauth_display_name=Android%20Phone&canFrp=1&canSk=1&lang=en&langCountry=en_us&hl=en-US&cc=us';

  function googleSignIn() {
    return new Promise((resolve) => {
      let authWin = null;
      let finished = false;
      let pollTimer = null;

      const done = (json) => {
        if (finished) return;
        finished = true;
        if (pollTimer) clearInterval(pollTimer);
        try {
          if (authWin && !authWin.isDestroyed()) authWin.close();
        } catch (e) { /* ignore */ }
        resolve(json);
      };

      const tryComplete = async () => {
        let token = '';
        let userId = '';
        try {
          const all = await authWin.webContents.session.cookies.get({});
          for (const c of all) {
            if (c.name === 'oauth_token') token = c.value;
            else if (c.name === 'user_id') userId = c.value;
          }
        } catch (e) { /* ignore */ }
        if (!token) return;
        const res = native.loginWithToken('', token);
        let j = {};
        try { j = JSON.parse(res); } catch (e) { j = { error: res }; }
        j.userId = userId;
        done(JSON.stringify(j));
      };

      authWin = new BrowserWindow({
        width: 520,
        height: 700,
        frame: true,
        parent: win,
        backgroundColor: '#333333',
        autoHideMenuBar: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });
      authWin.setMenuBarVisibility(false);

      authWin.webContents.on('did-fail-load', (_e, code) => {
        if (code !== -3) done('{"error":"failed-to-load"}');
      });
      authWin.on('closed', () => {
        if (!finished) done('{"error":"cancelled"}');
      });

      authWin.webContents.session.clearStorageData();
      authWin.webContents.session.cookies.on('changed', () => tryComplete());
      authWin.webContents.on('did-finish-load', () => {
        pollTimer = setInterval(tryComplete, 800);
      });

      authWin.loadURL(GOOGLE_LOGIN_URL);
    });
  }

  function createWindow() {
    win = new BrowserWindow({
      width: 1000,
      height: 640,
      frame: false,
      backgroundColor: '#2C2C2C',
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    win.webContents.on('did-fail-load', (_e, code, desc, url) => {
      console.error('Page failed to load:', code, desc, url);
    });
    win.webContents.on('render-process-gone', (_e, details) => {
      console.error('Renderer gone:', details.reason);
    });

    win.loadFile('index.html');
  }

  app.whenReady().then(() => {
    createWindow();
  });
}