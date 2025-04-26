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
  obtenerFavoritos: () => ipcRenderer.invoke("obtener-favoritos"),

  // Fondos
  seleccionarFondo: () => ipcRenderer.invoke("seleccionar-fondo"),
  guardarFondos: (fondos) => ipcRenderer.invoke("guardar-fondos", fondos),
  obtenerFondos: () => ipcRenderer.invoke("obtener-fondos"),
  establecerFondoActivo: (fondo) => ipcRenderer.invoke("establecer-fondo-activo", fondo),
  obtenerFondoActivo: () => ipcRenderer.invoke("obtener-fondo-activo"),

  //Eliminar y actualizar
  actualizarHimno: (himno) => ipcRenderer.invoke("actualizar-himno", himno),
  eliminarHimno: (id) => ipcRenderer.invoke("eliminar-himno", id),

  // Eventos
  on: (channel, callback) => {
    const validChannels = ["mostrar-himno", "fondo-seleccionado", "mostrar-fondo"];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, callback);
    }
  },
});
