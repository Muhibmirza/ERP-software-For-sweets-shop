const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getNetworkInfo: () => ipcRenderer.invoke('get-network-info'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  silentPrintHtml: (htmlContent) => ipcRenderer.invoke('silent-print-html', htmlContent),
  isElectron: true,
  onStartupStatus: (callback) => ipcRenderer.on('startup-status', (_event, message) => callback(message))
});
