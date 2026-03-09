const { contextBridge, ipcRenderer } = require("electron");


contextBridge.exposeInMainWorld("electron", {
  // Proyección
  enviarHimno: (parrafo) => ipcRenderer.send("proyectar-himno", parrafo),
  cerrarProyector: () => ipcRenderer.send("cerrar-proyector"),

  // Gestión de himnos
  agregarHimno: (himno) => ipcRenderer.invoke("agregar-himno", himno),
  obtenerHimnos: () => ipcRenderer.invoke("obtener-himnos"),
  obtenerHimnoPorId: (id) => ipcRenderer.invoke("obtener-himno-por-id", id),

  // Favoritos
  marcarFavorito: (id, favorito) =>
    ipcRenderer.invoke("marcar-favorito", { id, favorito }),
  eliminarFavorito: (id) => ipcRenderer.invoke("eliminar-favorito", id),
  obtenerFavoritos: () => ipcRenderer.invoke("obtener-favoritos"),

  // Funciones de multimedia
  obtenerMultimedia: () => ipcRenderer.invoke('db-obtener-multimedia'),
  agregarMultimedia: (multimediaData) => ipcRenderer.invoke('db-agregar-multimedia', multimediaData),
  eliminarMultimedia: (id) => ipcRenderer.invoke('db-eliminar-multimedia', id),
  actualizarMultimedia: (multimediaData) => ipcRenderer.invoke('db-actualizar-multimedia', multimediaData),
  actualizarFavoritoMultimedia: (id, favorito) => ipcRenderer.invoke('db-actualizar-favorito-multimedia', id, favorito),
  incrementarReproducido: (id) => ipcRenderer.invoke('db-incrementar-reproducido', id),
  obtenerMultimediaFavoritos: () => ipcRenderer.invoke('db-obtener-multimedia-favoritos'),
  obtenerMultimediaPorTipo: (tipo) => ipcRenderer.invoke('db-obtener-multimedia-por-tipo', tipo),
  verificarArchivoDuplicado: (datos) => ipcRenderer.invoke('verificar-archivo-duplicado', datos),

  // ✨ NUEVAS FUNCIONES PARA MULTIMEDIA ACTIVA (SIGUIENDO PATRÓN DE FONDOS)
  establecerMultimediaActiva: (multimediaData) => ipcRenderer.invoke('establecer-multimedia-activa', multimediaData),
  obtenerMultimediaActiva: () => ipcRenderer.invoke('obtener-multimedia-activa'),
  limpiarMultimediaActiva: () => ipcRenderer.invoke('limpiar-multimedia-activa'),

  // ✨FUNCIÓN NECESARIA PARA PROCESAR ARCHIVOS
  procesarArchivosMultimedia: (filePaths) => ipcRenderer.invoke('procesar-archivos-multimedia', filePaths),
  // ✨ PROCESAR ARCHIVO INDIVIDUAL MULTIMEDIA (BASE64)
  procesarArchivoMultimedia: (fileData) => ipcRenderer.invoke('procesar-archivo-multimedia', fileData),
  "procesar-archivo-multimedia": (fileData) => ipcRenderer.invoke('procesar-archivo-multimedia', fileData),
  // ✨ NUEVOS MÉTODOS OPTIMIZADOS PARA ARCHIVOS GRANDES
  seleccionarArchivosMultimedia: () => ipcRenderer.invoke('seleccionar-archivos-multimedia'),
  procesarArchivosPorRuta: (filePaths) => ipcRenderer.invoke('procesar-archivos-por-ruta', filePaths),


  // Función para proyectar multimedia
  proyectarMultimedia: (mediaData) => ipcRenderer.invoke('proyectar-multimedia', mediaData),
  limpiarProyector: () => ipcRenderer.invoke('limpiar-proyector'),

  // ✨ NUEVA FUNCIÓN ESPECÍFICA PARA ENVIAR MULTIMEDIA
  enviarMultimedia: (mediaData) => ipcRenderer.send('proyectar-multimedia-directo', mediaData),

  // ✨ MÉTODO SEND GENÉRICO PARA ENVÍO DIRECTO
  send: (channel, data) => ipcRenderer.send(channel, data),

  // Fondos
  seleccionarFondo: () => ipcRenderer.invoke("seleccionar-fondo"),
  agregarFondo: (fondo) => ipcRenderer.invoke("agregar-fondo", fondo),
  obtenerFondos: () => ipcRenderer.invoke("obtener-fondos"),
  obtenerFondoActivo: () => ipcRenderer.invoke("obtener-fondo-activo"),
  establecerFondoActivo: (id) => ipcRenderer.invoke("establecer-fondo-activo", id),
  eliminarFondo: (id) => ipcRenderer.invoke("eliminar-fondo", id),
  notificarFondoActivo: (fondo) => ipcRenderer.send("fondo-activo-cambiado", fondo),
  copiarArchivoAFondos: (sourcePath) => ipcRenderer.invoke("copiarArchivoAFondos", sourcePath),
  getAppPath: () => ipcRenderer.sendSync("get-app-path"), // Obtener ruta de la aplicación
  joinPath: (...paths) => require("path").join(...paths),

  //Enviar versiculo
  enviarVersiculo: (versiculo) => ipcRenderer.send("proyectar-versiculo", versiculo),

  //Eliminar y actualizar himnos
  actualizarHimno: (himno) => ipcRenderer.invoke("actualizar-himno", himno),
  eliminarHimno: (id) => ipcRenderer.invoke("eliminar-himno", id),

  // ====================================
  // APIs DE PRESENTACIONES
  // ====================================
  agregarPresentacion: (presentacion) => ipcRenderer.invoke("agregar-presentacion", presentacion),
  obtenerPresentaciones: () => ipcRenderer.invoke("obtener-presentaciones"),
  editarPresentacion: (presentacion) => ipcRenderer.invoke("editar-presentacion", presentacion),
  eliminarPresentacion: (id) => ipcRenderer.invoke("eliminar-presentacion", id),

  // ====================================
  // APIs DE PRESENTACIONES SLIDES - NUEVAS
  // ====================================
  obtenerPresentacionesSlides: () => ipcRenderer.invoke("obtener-presentaciones-slides"),
  obtenerPresentacionSlidesPorId: (id) => ipcRenderer.invoke("obtener-presentacion-slides-por-id", id),
  agregarPresentacionSlides: (presentacionData) => ipcRenderer.invoke("agregar-presentacion-slides", presentacionData),
  actualizarPresentacionSlides: (presentacionData) => ipcRenderer.invoke("actualizar-presentacion-slides", presentacionData),
  eliminarPresentacionSlides: (id) => ipcRenderer.invoke("eliminar-presentacion-slides", id),
  duplicarPresentacionSlides: (id) => ipcRenderer.invoke("duplicar-presentacion-slides", id),
  actualizarFavoritoPresentacionSlides: (id, favorito) => ipcRenderer.invoke("actualizar-favorito-presentacion-slides", id, favorito),
  actualizarSlideActualPresentacion: (id, slideIndex) => ipcRenderer.invoke("actualizar-slide-actual-presentacion", id, slideIndex),
  exportarPresentacionSlides: (id) => ipcRenderer.invoke("exportar-presentacion-slides", id),
  importarPresentacionSlides: (datosImportar, nombreArchivo) => ipcRenderer.invoke("importar-presentacion-slides", datosImportar, nombreArchivo),
  obtenerEstadisticasPresentacionesSlides: () => ipcRenderer.invoke("obtener-estadisticas-presentaciones-slides"),

  // ====================================
  // APIs DEL PROYECTOR - NUEVAS
  // ====================================
  proyectarSlide: (slideData) => ipcRenderer.invoke("proyectar-slide", slideData),
  limpiarProyectorSlides: () => ipcRenderer.invoke("limpiar-proyector"),
  abrirProyector: () => ipcRenderer.invoke("abrir-proyector"),

  // ✨ Función genérica invoke para mayor flexibilidad
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),

  // ✨ NUEVAS FUNCIONES PARA EL MENÚ MEJORADO
  obtenerInfoApp: () => ipcRenderer.invoke("obtener-info-app"),
  controlarZoom: (accion) => ipcRenderer.invoke("controlar-zoom", accion),
  toggleFullscreen: () => ipcRenderer.invoke("toggle-fullscreen"),

  // ====================================
  // APIs DE CONFIGURACIÓN - NUEVAS
  // ====================================
  obtenerConfiguracion: () => ipcRenderer.invoke("obtener-configuracion"),
  guardarConfiguracion: (configuracion) => ipcRenderer.invoke("guardar-configuracion", configuracion),
  restaurarConfiguracionDefecto: () => ipcRenderer.invoke("restaurar-configuracion-defecto"),
  obtenerConfiguracionPorClave: (clave) => ipcRenderer.invoke("obtener-configuracion-clave", clave),
  actualizarConfiguracionPorClave: (clave, valor) => ipcRenderer.invoke("actualizar-configuracion-clave", clave, valor),
  guardarLogo: (archivoBuffer) => ipcRenderer.invoke("guardar-logo", archivoBuffer),

  // Eventos
  on: (channel, callback) => {
    const validChannels = [
      "mostrar-himno",
      "mostrar-versiculo",
      "fondo-seleccionado",
      "actualizar-fondo-activo",
      "limpiar-proyector",
      "configuracion-actualizada", // ✨ NUEVO CANAL
      "proyectar-slide-data", // ✨ Canal para slides individuales
      "navegar-a-ruta", // ✨ Canal para navegación desde menú
      "abrir-buscador-biblia", // ✨ Canal para abrir buscador de Biblia
      "seleccionar-libro-biblia", // ✨ Canal para seleccionar libro bíblico
      "control-biblia-proyectar", // ✨ Control remoto (móvil) para proyectar Biblia
      "control-biblia-preview" // ✨ Vista previa (móvil) para mostrar anterior/actual/siguiente
    ];

    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, callback);
    }
  },

  removeAllListeners: (channel) => {
    const validChannels = [
      "mostrar-himno",
      "mostrar-versiculo",
      "fondo-seleccionado",
      "actualizar-fondo-activo",
      "limpiar-proyector",
      "configuracion-actualizada", // ✨ NUEVO CANAL
      "proyectar-slide-data", // ✨ Canal para slides individuales
      "navegar-a-ruta", // ✨ Canal para navegación desde menú
      "abrir-buscador-biblia", // ✨ Canal para abrir buscador de Biblia
      "seleccionar-libro-biblia", // ✨ Canal para seleccionar libro bíblico
      "control-biblia-proyectar", // ✨ Control remoto (móvil) para proyectar Biblia
      "control-biblia-preview" // ✨ Vista previa (móvil) para mostrar anterior/actual/siguiente
    ];

    if (validChannels.includes(channel)) {
      ipcRenderer.removeAllListeners(channel);
    }
  },

  onFondoActivoCambiado: (callback) => ipcRenderer.on("actualizar-fondo-activo", (event, fondo) => callback(fondo)),
  removeFondoActivoListener: () => ipcRenderer.removeAllListeners("actualizar-fondo-activo"),

  // Funciones de archivos para presentaciones
  subirArchivoPresentacion: (formData) => ipcRenderer.invoke("subir-archivo-presentacion", formData),
  obtenerArchivosPresentacion: (presentacionId) => ipcRenderer.invoke("obtener-archivos-presentacion", presentacionId),
  eliminarArchivoPresentacion: (archivoId) => ipcRenderer.invoke("eliminar-archivo-presentacion", archivoId),

  // Abrir enlace externo
  abrirEnlaceExterno: (url) => ipcRenderer.invoke('abrir-enlace-externo', url),

  // ✨ FUNCIONES PARA PROYECCIÓN DE PRESENTACIONES
  enviarPresentacionAlProyector: (presentacionData) => ipcRenderer.invoke('enviar-presentacion-al-proyector', presentacionData),
  cambiarSlideProyector: (datos) => ipcRenderer.invoke('cambiar-slide-proyector', datos),
  detenerPresentacionProyector: () => ipcRenderer.invoke('detener-presentacion-proyector'),

  // ✨ IPC RENDERER PARA ESCUCHAR EVENTOS DEL PROYECTOR
  ipcRenderer: {
    on: (channel, func) => {
      const validChannels = [
        'mostrar-presentacion',
        'cambiar-slide',
        'detener-presentacion',
        'mostrar-multimedia',
        'limpiar-proyector',
        'proyectar-slide-data',
        'proyectar-multimedia-data',
        'actualizar-multimedia-activa',  // ✨ AGREGADO: Canal crítico para multimedia activa
        'limpiar-multimedia-activa',     // ✨ AGREGADO: Canal para limpiar multimedia activa
        'control-multimedia',            // ✨ AGREGADO: Canal para control remoto
        'navegar-a-ruta'                 // ✨ Canal para navegación desde menú
      ];
      if (validChannels.includes(channel)) {
        console.log(`🔗 [Preload] Registrando listener para canal: ${channel}`);
        ipcRenderer.on(channel, func);
      } else {
        console.warn(`⚠️ [Preload] Canal no válido: ${channel}`);
      }
    },
    removeListener: (channel, func) => {
      const validChannels = [
        'mostrar-presentacion',
        'cambiar-slide',
        'detener-presentacion',
        'mostrar-multimedia',
        'limpiar-proyector',
        'proyectar-slide-data',
        'proyectar-multimedia-data',
        'actualizar-multimedia-activa',  // ✨ AGREGADO: Canal crítico para multimedia activa
        'limpiar-multimedia-activa',     // ✨ AGREGADO: Canal para limpiar multimedia activa
        'control-multimedia',            // ✨ AGREGADO: Canal para control remoto
        'navegar-a-ruta'                 // ✨ Canal para navegación desde menú
      ];
      if (validChannels.includes(channel)) {
        console.log(`🧹 [Preload] Removiendo listener para canal: ${channel}`);
        ipcRenderer.removeListener(channel, func);
      }
    },
    // ✨ AGREGADO: Método off para compatibilidad
    off: (channel, func) => {
      const validChannels = [
        'mostrar-presentacion',
        'cambiar-slide',
        'detener-presentacion',
        'mostrar-multimedia',
        'limpiar-proyector',
        'proyectar-slide-data',
        'proyectar-multimedia-data',
        'actualizar-multimedia-activa',
        'limpiar-multimedia-activa',
        'control-multimedia',            // ✨ AGREGADO: Canal para control remoto
        'navegar-a-ruta'                 // ✨ Canal para navegación desde menú
      ];
      if (validChannels.includes(channel)) {
        console.log(`🧹 [Preload] Removiendo listener (off) para canal: ${channel}`);
        ipcRenderer.off(channel, func);
      }
    }
  }
});

// ✨ AGREGAR ALIAS PARA COMPATIBILIDAD CON electronAPI
contextBridge.exposeInMainWorld("electronAPI", {
  // Funciones de multimedia
  obtenerMultimedia: () => ipcRenderer.invoke('db-obtener-multimedia'),
  agregarMultimedia: (multimediaData) => ipcRenderer.invoke('db-agregar-multimedia', multimediaData),
  eliminarMultimedia: (id) => ipcRenderer.invoke('db-eliminar-multimedia', id),
  procesarArchivosMultimedia: (filePaths) => ipcRenderer.invoke('procesar-archivos-multimedia', filePaths),
  procesarArchivoMultimedia: (fileData) => ipcRenderer.invoke('procesar-archivo-multimedia', fileData),
  // ✨ MÉTODOS OPTIMIZADOS PARA ARCHIVOS GRANDES
  seleccionarArchivosMultimedia: () => ipcRenderer.invoke('seleccionar-archivos-multimedia'),
  procesarArchivosPorRuta: (filePaths) => ipcRenderer.invoke('procesar-archivos-por-ruta', filePaths),
  actualizarFavoritoMultimedia: (id, favorito) => ipcRenderer.invoke('db-actualizar-favorito-multimedia', id, favorito),
  incrementarReproducido: (id) => ipcRenderer.invoke('db-incrementar-reproducido', id),
  enviarLog: (mensaje) => ipcRenderer.send('log-to-terminal', mensaje),

  // ✨ NUEVA FUNCIÓN PARA VERIFICAR DUPLICADOS CON DEBUG
  verificarArchivoDuplicado: (datos) => {
    // console.log('🔗 [PRELOAD] Llamando verificar-archivo-duplicado con datos:', datos);
    const resultado = ipcRenderer.invoke('verificar-archivo-duplicado', datos);
    resultado.then(res => {
      // console.log('🔗 [PRELOAD] Respuesta del main process:', res);
    }).catch(err => {
      console.error('🔗 [PRELOAD] Error en verificar-archivo-duplicado:', err);
    });
    return resultado;
  },

  // ✨ MÉTODO DE PRUEBA PARA DEBUG IPC
  testDuplicado: (datos) => {
    // console.log('🧪 [PRELOAD] Llamando test-duplicado con datos:', datos);
    return ipcRenderer.invoke('test-duplicado', datos);
  },
});
