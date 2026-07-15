const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('backupAPI', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getState: () => ipcRenderer.invoke('get-state'),
  runBackup: (payload) => ipcRenderer.invoke('run-backup', payload),
  saveSchedule: (payload) => ipcRenderer.invoke('save-schedule', payload),
  deleteHistory: (id) => ipcRenderer.invoke('delete-history', id),
  onBackupUpdated: (callback) => ipcRenderer.on('backup-updated', callback)
});
