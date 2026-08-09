const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('appInfo', {
  version: process.versions.electron
});

contextBridge.exposeInMainWorld('launcher', {
  openFolder: () => ipcRenderer.invoke('open-data-dir'),
  openPath: (p) => ipcRenderer.invoke('open-path', p),
  launchGame: (dir) => ipcRenderer.invoke('native:launchGame', dir),
  onGameLog: (cb) => ipcRenderer.on('game-log', (_e, line) => cb(line)),
  getDataDir: () => ipcRenderer.invoke('get-data-dir'),
  get: (url) => ipcRenderer.invoke('fetch-url', url),
  downloadFile: (url, destDir) => ipcRenderer.invoke('download-file', url, destDir),
  listDirs: (dir) => ipcRenderer.invoke('list-dirs', dir),
  listFiles: (dir) => ipcRenderer.invoke('list-files', dir),
  extractMod: (zip, dir) => ipcRenderer.invoke('mods:extract', zip, dir),
  deleteMod: (dir) => ipcRenderer.invoke('mods:delete', dir),
  native: {
    ready: () => ipcRenderer.invoke('native:ready'),
    getDataDir: () => ipcRenderer.invoke('native:getDataDir'),
    getAbi: () => ipcRenderer.invoke('native:getAbi'),
    setDataDir: (dir) => ipcRenderer.invoke('native:setDataDir', dir),
    checkin: () => ipcRenderer.invoke('native:checkin'),
    login: (email, password) => ipcRenderer.invoke('native:login', email, password),
    loginWithToken: (email, token) => ipcRenderer.invoke('native:loginWithToken', email, token),
    googleSignIn: () => ipcRenderer.invoke('native:googleSignIn'),
    logout: () => ipcRenderer.invoke('native:logout'),
    details: (pkg) => ipcRenderer.invoke('native:details', pkg),
    appInfo: (pkg) => ipcRenderer.invoke('native:appInfo', pkg),
    downloadStart: (pkg, vc) => ipcRenderer.invoke('native:downloadStart', pkg, vc),
    downloadStatus: () => ipcRenderer.invoke('native:downloadStatus'),
    extractApk: (apk, dir) => ipcRenderer.invoke('native:extractApk', apk, dir),
    clearCache: () => ipcRenderer.invoke('native:clearCache')
  }
});