const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  // Proyección
  enviarHimno: (parrafo) => ipcRenderer.send("proyectar-himno", parrafo),
  cerrarProyector: () => ipcRenderer.send("cerrar-proyector"),
  abrirProyector: () => ipcRenderer.send("abrir-proyector"),

  // Gestión de himnos
  agregarHimno: (himno) => ipcRenderer.invoke("agregar-himno", himno),
  obtenerHimnos: () => ipcRenderer.invoke("obtener-himnos"),
  obtenerHimnoPorId: (id) => ipcRenderer.invoke("obtener-himno-por-id", id),

  // Favoritos
  marcarFavorito: (id, favorito) =>
    ipcRenderer.invoke("marcar-favorito", { id, favorito }),
  eliminarFavorito: (id) => ipcRenderer.invoke("eliminar-favorito", id),
  obtenerFavoritos: () => ipcRenderer.invoke("obtener-favoritos"),

  // Fondos
  seleccionarFondo: () => ipcRenderer.invoke("seleccionar-fondo"),
  agregarFondo: (fondo) => ipcRenderer.invoke("agregar-fondo", fondo),
  obtenerFondos: () => ipcRenderer.invoke("obtener-fondos"),
  obtenerFondoActivo: () => ipcRenderer.invoke("obtener-fondo-activo"),
  establecerFondoActivo: (id) => ipcRenderer.invoke("establecer-fondo-activo", id),
  eliminarFondo: (id) => ipcRenderer.invoke("eliminar-fondo", id),
  notificarFondoActivo: (fondo) => ipcRenderer.send("fondo-activo-cambiado", fondo),

  //Eliminar y actualizar
  actualizarHimno: (himno) => ipcRenderer.invoke("actualizar-himno", himno),
  eliminarHimno: (id) => ipcRenderer.invoke("eliminar-himno", id),

  // Eventos
  on: (channel, callback) => ipcRenderer.on(channel, callback),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  onFondoActivoCambiado: (callback) => ipcRenderer.on("actualizar-fondo-activo", (event, fondo) => callback(fondo)),
  removeFondoActivoListener: () => ipcRenderer.removeAllListeners("actualizar-fondo-activo"),
});
