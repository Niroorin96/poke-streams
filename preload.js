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
  reportStatus: (platform, channel, status) => ipcRenderer.invoke('report-status', platform, channel, status),
  savedFav: (platform, channel, fav) => ipcRenderer.invoke('saved-fav', platform, channel, fav),
  savedRemove: (platform, channel) => ipcRenderer.invoke('saved-remove', platform, channel),
  setBadge: n => ipcRenderer.invoke('set-badge', n),
  onReloadAll: cb => ipcRenderer.on('reload-all', () => cb())
});
