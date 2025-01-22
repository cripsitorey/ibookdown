const { contextBridge, ipcRenderer } = require('electron');

// Exponer funciones seguras al renderer
contextBridge.exposeInMainWorld('api', {
  send: (channel, data) => ipcRenderer.send(channel, data),
  receive: (channel, callback) => ipcRenderer.on(channel, (event, ...args) => callback(...args)),
});
