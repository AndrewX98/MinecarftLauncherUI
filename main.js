const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');

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

  ipcMain.handle('get-data-dir', () => gameDataDir());

  ipcMain.handle('fetch-url', async (_e, url) => {
    const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    return resp.text();
  });

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