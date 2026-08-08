const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('appInfo', {
  version: process.versions.electron
});

contextBridge.exposeInMainWorld('launcher', {
  openFolder: () => ipcRenderer.invoke('open-data-dir'),
  getDataDir: () => ipcRenderer.invoke('get-data-dir'),
  get: (url) => ipcRenderer.invoke('fetch-url', url)
});