const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ps', {
  getState: () => ipcRenderer.invoke('get-state'),
  setSlot: (i, data) => ipcRenderer.invoke('set-slot', i, data),
  setOption: (key, value) => ipcRenderer.invoke('set-option', key, value),
  login: platform => ipcRenderer.invoke('login', platform),
  logout: () => ipcRenderer.invoke('logout'),
  toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),
  openExternal: url => ipcRenderer.invoke('open-external', url),
  onLogin: cb => ipcRenderer.on('login', (_e, u) => cb(u)),
  onReloadAll: cb => ipcRenderer.on('reload-all', () => cb())
});
