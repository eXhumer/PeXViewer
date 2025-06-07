import { contextBridge, ipcRenderer } from 'electron'

// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

contextBridge.exposeInMainWorld('f1tv', {
  login: async () => await ipcRenderer.invoke('f1tv:login'),
  logout: async () => await ipcRenderer.invoke('f1tv:logout'),
});
