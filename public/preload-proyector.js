// preload-proyector.js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  on: (channel, callback) => {
    if (channel === "mostrar-himno") {
      ipcRenderer.on(channel, (_, data) => callback(data));
    }
  },
});
