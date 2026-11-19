'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  saveImage: (dataUrl, format, name) => ipcRenderer.invoke('save-image', { dataUrl, format, name }),
  openImage: () => ipcRenderer.invoke('open-image'),
  printImage: (dataUrl) => ipcRenderer.invoke('print-image', { dataUrl }),
  readClipboardImage: () => ipcRenderer.invoke('clipboard-read-image'),
  writeClipboardImage: (dataUrl) => ipcRenderer.invoke('clipboard-write-image', dataUrl),
  reveal: (p) => ipcRenderer.invoke('reveal', p),
  info: () => ipcRenderer.invoke('app-info'),
  onMenu: (cb) => {
    const handler = (_e, action) => cb(action);
    ipcRenderer.on('menu-action', handler);
    return () => ipcRenderer.removeListener('menu-action', handler);
  }
});
