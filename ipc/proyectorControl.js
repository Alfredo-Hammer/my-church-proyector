const { ipcMain, BrowserWindow } = require("electron");

// deps: mainWindow/proyectorWindow, la fábrica de la ventana del proyector,
// el estado del overlay OBS (actualizarObs/sincronizarFondoObs) y el estado
// de reproducción multimedia viven en main.js porque también los usan las
// rutas Express de la app móvil y otros dominios (timer). Se inyectan por
// referencia en vez de duplicarse acá.
function registrar({
  getProyectorWindow,
  setProyectorWindow,
  createProyectorWindow,
  actualizarObs,
  sincronizarFondoObs,
  timerEstaProyectando,
  timerRestaurarEnProyector,
  multimediaPlaybackStatus,
}) {
  // Proyectar himno
  ipcMain.on("proyectar-himno", (event, himno) => {
    const proyectorWindow = getProyectorWindow();
    if (!proyectorWindow) {
      const nuevaVentana = createProyectorWindow();
      if (!nuevaVentana) return;

      nuevaVentana.webContents.once("did-finish-load", () => {
        // ✨ Dar tiempo para que React monte los componentes (1 segundo)
        setTimeout(() => {
          if (nuevaVentana && !nuevaVentana.isDestroyed()) {
            console.log("📤 [MAIN] Enviando himno a nuevo proyector:", himno.titulo);
            nuevaVentana.webContents.send("mostrar-himno", himno);
          }
        }, 1000);
      });
    } else {
      console.log("📤 [MAIN] Enviando himno a proyector existente:", himno.titulo);
      proyectorWindow.webContents.send("mostrar-himno", himno);
    }
    actualizarObs('himno', {parrafo: himno.parrafo, titulo: himno.titulo, numero: himno.numero || '', origen: himno.origen || 'himno'});
  });

  // Cerrar el proyector
  ipcMain.on("cerrar-proyector", () => {
    const proyectorWindow = getProyectorWindow();
    if (proyectorWindow) {
      proyectorWindow.close();
      setProyectorWindow(null);
    }
  });

  // Abrir el proyector manualmente
  ipcMain.on("abrir-proyector", () => {
    if (!getProyectorWindow()) {
      createProyectorWindow();
    }
  });

  // ✨ Handler para abrir proyector como invoke (para async/await)
  ipcMain.handle("abrir-proyector", async () => {
    try {
      let proyectorWindow = getProyectorWindow();
      if (!proyectorWindow || proyectorWindow.isDestroyed()) {
        proyectorWindow = createProyectorWindow();
        if (proyectorWindow) {
          await new Promise((resolve) => {
            proyectorWindow.webContents.once('did-finish-load', resolve);
          });
          return { success: true };
        }
        return { success: false, error: "No se pudo crear la ventana del proyector" };
      }
      proyectorWindow.focus();
      return { success: true };
    } catch (error) {
      console.error("❌ [Main] Error abriendo proyector:", error);
      return { success: false, error: error.message };
    }
  });

  // Cuando se selecciona un fondo y se envía al proyector
  ipcMain.on("fondo-seleccionado", (event, { filePath, tipo }) => {
    const proyectorWindow = getProyectorWindow();
    if (proyectorWindow) {
      const rutaConProtocolo = `file://${filePath}`;
      proyectorWindow.webContents.send("fondo-seleccionado", { ruta: rutaConProtocolo, tipo });
    }
  });

  // Handler para notificar cambio de fondo activo
  ipcMain.on("fondo-activo-cambiado", (event, fondo) => {
    console.log("📡 [Main] Notificando cambio de fondo activo:", fondo);

    // Sincronizar fondo para el overlay OBS
    sincronizarFondoObs(fondo);

    // Enviar a proyector si existe
    const proyectorWindow = getProyectorWindow();
    if (proyectorWindow && !proyectorWindow.isDestroyed()) {
      proyectorWindow.webContents.send("actualizar-fondo-activo", fondo);
    }

    // Enviar a todas las ventanas
    const todasLasVentanas = BrowserWindow.getAllWindows();
    todasLasVentanas.forEach(ventana => {
      if (!ventana.isDestroyed() && ventana !== event.sender) {
        ventana.webContents.send("actualizar-fondo-activo", fondo);
      }
    });
  });

  // ✨ HANDLERS PARA CONTROL REMOTO DEL PROYECTOR
  ipcMain.on("proyector-play", (event) => {
    console.warn("🎮 [Main] Comando play recibido para proyector");
    const proyectorWindow = getProyectorWindow();
    if (proyectorWindow && !proyectorWindow.isDestroyed()) {
      proyectorWindow.webContents.send("control-multimedia", { action: "play" });
      console.warn("▶️ [Main] Comando play enviado al proyector");
    } else {
      console.warn("⚠️ [Main] No hay proyectorWindow activo para enviar PLAY");
    }
  });

  ipcMain.on("proyector-pause", (event) => {
    console.warn("🎮 [Main] Comando pause recibido para proyector");
    const proyectorWindow = getProyectorWindow();
    if (proyectorWindow && !proyectorWindow.isDestroyed()) {
      proyectorWindow.webContents.send("control-multimedia", { action: "pause" });
      console.warn("⏸️ [Main] Comando pause enviado al proyector");
    } else {
      console.warn("⚠️ [Main] No hay proyectorWindow activo para enviar PAUSE");
    }
  });

  ipcMain.on("proyector-stop", (event) => {
    console.warn("🎮 [Main] Comando stop recibido para proyector");
    const proyectorWindow = getProyectorWindow();
    if (proyectorWindow && !proyectorWindow.isDestroyed()) {
      proyectorWindow.webContents.send("control-multimedia", { action: "stop" });
      console.warn("⏹️ [Main] Comando stop enviado al proyector");
    } else {
      console.warn("⚠️ [Main] No hay proyectorWindow activo para enviar STOP");
    }
  });

  ipcMain.on("proyector-limpiar", (event) => {
    const proyectorWindow = getProyectorWindow();
    if (proyectorWindow && !proyectorWindow.isDestroyed()) {
      proyectorWindow.webContents.send("control-multimedia", { action: "limpiar" });
    }
    // Si el timer estaba proyectando, restaurarlo tras el clear (200ms de margen)
    if (timerEstaProyectando()) {
      setTimeout(timerRestaurarEnProyector, 250);
    }
  });

  // ✨ Handler genérico para controles adicionales (volumen/seek, etc.)
  ipcMain.on("proyector-control-multimedia", (event, payload) => {
    const proyectorWindow = getProyectorWindow();
    if (proyectorWindow && !proyectorWindow.isDestroyed()) {
      proyectorWindow.webContents.send("control-multimedia", payload);
    } else {
      console.warn(
        "⚠️ [Main] No hay proyectorWindow activo para enviar control genérico:",
        payload,
      );
    }
  });

  // ✨ Debug cableado: handshake y ACK desde proyector
  ipcMain.on("proyector-ready", (event, data) => {
    console.warn("✅ [Main] Proyector READY:", {
      senderId: event?.sender?.id,
      ...data,
    });
  });

  ipcMain.on("proyector-control-ack", (event, data) => {
    // ACK recibido del proyector
  });

  // ✨ Estado de reproducción (para barra de progreso móvil)
  ipcMain.on("multimedia-playback-status", (_event, payload) => {
    try {
      const destinoRaw = String(payload?.destino || payload?.target || 'proyector').toLowerCase();
      const destino = destinoRaw === 'pc' ? 'pc' : 'proyector';

      const currentTimeNum = Number(payload?.currentTime);
      const durationNum = Number(payload?.duration);
      const volumeNum = payload?.volume === null || payload?.volume === undefined ? null : Number(payload?.volume);

      const cur = Number.isFinite(currentTimeNum) && currentTimeNum >= 0 ? currentTimeNum : 0;
      const dur = Number.isFinite(durationNum) && durationNum >= 0 ? durationNum : 0;

      // Si el video llegó al final, limpiar el id para que la app móvil lo detecte como terminado
      const llego_al_final = dur > 1 && cur > 0 && cur >= dur - 0.5;

      multimediaPlaybackStatus[destino] = {
        updatedAt: Date.now(),
        id: llego_al_final ? null : (('id' in payload) ? payload.id : (multimediaPlaybackStatus[destino]?.id ?? null)),
        nombre: llego_al_final ? null : (('nombre' in payload) ? (payload.nombre ? String(payload.nombre) : null) : (multimediaPlaybackStatus[destino]?.nombre ?? null)),
        currentTime: cur,
        duration: dur,
        paused: Boolean(payload?.paused),
        volume: Number.isFinite(volumeNum) && volumeNum >= 0 ? Math.min(1, Math.max(0, volumeNum)) : null,
        tipo: llego_al_final ? null : (payload?.tipo ? String(payload.tipo) : null),
      };
    } catch {
      // noop
    }
  });

  //Mostrar versículo
  ipcMain.on("proyectar-versiculo", (event, versiculo) => {
    const proyectorWindow = getProyectorWindow();
    if (!proyectorWindow) {
      const nuevaVentana = createProyectorWindow();
      if (!nuevaVentana) return;

      nuevaVentana.webContents.once("did-finish-load", () => {
        setTimeout(() => {
          if (nuevaVentana && !nuevaVentana.isDestroyed()) {
            console.log("📤 [MAIN] Enviando versículo a nuevo proyector:", versiculo.titulo);
            nuevaVentana.webContents.send("mostrar-versiculo", versiculo);
          }
        }, 1000);
      });
    } else {
      console.log("📤 [MAIN] Enviando versículo a proyector existente:", versiculo.titulo);
      proyectorWindow.webContents.send("mostrar-versiculo", versiculo);
    }
    if (versiculo.origen !== 'clear') {
      const tipo = versiculo.origen === 'anuncio' ? 'anuncio' : 'biblia';
      actualizarObs(tipo, {parrafo: versiculo.parrafo, titulo: versiculo.titulo, numero: versiculo.numero || '', origen: versiculo.origen || ''});
    } else {
      actualizarObs('vacio');
    }
  });

  // Temporizador dedicado — canal separado para evitar animaciones de himno
  ipcMain.on("proyectar-temporizador", (event, data) => {
    const proyectorWindow = getProyectorWindow();
    if (proyectorWindow && !proyectorWindow.isDestroyed()) {
      proyectorWindow.webContents.send("mostrar-temporizador", data);
    }
  });

  // Limpiar proyector
  ipcMain.handle("limpiar-proyector", async () => {
    try {
      const proyectorWindow = getProyectorWindow();
      if (proyectorWindow && !proyectorWindow.isDestroyed()) {
        proyectorWindow.webContents.send("limpiar-proyector");
        actualizarObs('vacio');
        console.log("✅ [MAIN] Proyector limpiado");
        return { success: true };
      }
      return { success: false, error: "Ventana del proyector no disponible" };
    } catch (error) {
      console.error("❌ [MAIN] Error limpiando proyector:", error);
      return { success: false, error: error.message };
    }
  });

  // HANDLER MEJORADO PARA PROYECTAR MULTIMEDIA
  ipcMain.handle('proyectar-multimedia', async (event, mediaData) => {
    try {
      console.log('📺 [IPC] Proyectando multimedia:', mediaData);

      const proyectorWindow = getProyectorWindow();
      if (proyectorWindow && !proyectorWindow.isDestroyed()) {
        // Enviar datos al proyector
        proyectorWindow.webContents.send('mostrar-multimedia', {
          tipo: mediaData.tipo,
          url: mediaData.url,
          nombre: mediaData.nombre
        });

        // Enfocar ventana del proyector
        proyectorWindow.focus();

        console.log('✅ [IPC] Multimedia enviada al proyector');
        return { success: true };
      } else {
        console.log('⚠️ [IPC] Proyector no disponible, creando ventana...');

        // Crear ventana del proyector si no existe
        const nuevaVentana = createProyectorWindow();

        if (nuevaVentana) {
          // Esperar a que se cargue la ventana
          nuevaVentana.webContents.once('did-finish-load', () => {
            nuevaVentana.webContents.send('mostrar-multimedia', {
              tipo: mediaData.tipo,
              url: mediaData.url,
              nombre: mediaData.nombre
            });
            nuevaVentana.focus();
          });
        }

        return { success: true };
      }
    } catch (error) {
      console.error('❌ [IPC] Error proyectando multimedia:', error);
      return { success: false, error: error.message };
    }
  });

  // ✨ HANDLER DIRECTO PARA MULTIMEDIA
  ipcMain.on('proyectar-multimedia-directo', (event, mediaData) => {
    console.log('📺 [IPC] Proyección directa de multimedia:', mediaData);

    const proyectorWindow = getProyectorWindow();
    if (proyectorWindow && !proyectorWindow.isDestroyed()) {
      proyectorWindow.webContents.send('mostrar-multimedia', mediaData);
      proyectorWindow.focus();
    } else {
      const nuevaVentana = createProyectorWindow();
      if (nuevaVentana) {
        nuevaVentana.webContents.once('did-finish-load', () => {
          nuevaVentana.webContents.send('mostrar-multimedia', mediaData);
          nuevaVentana.focus();
        });
      }
    }
  });

  // ✨ HANDLER PARA PROYECTAR-MULTIMEDIA-DATA (MEJORADO)
  ipcMain.on('proyectar-multimedia-data', (event, mediaData) => {
    console.log('📺 [IPC] Proyección multimedia mejorada:', mediaData);

    const proyectorWindow = getProyectorWindow();
    if (proyectorWindow && !proyectorWindow.isDestroyed()) {
      proyectorWindow.webContents.send('proyectar-multimedia-data', mediaData);
      proyectorWindow.focus();
      console.log('✅ [IPC] Multimedia enviada a proyector existente con canal proyectar-multimedia-data');
    } else {
      console.log('🔄 [IPC] Creando nuevo proyector para multimedia');
      const nuevaVentana = createProyectorWindow();
      if (nuevaVentana) {
        nuevaVentana.webContents.once('did-finish-load', () => {
          nuevaVentana.webContents.send('proyectar-multimedia-data', mediaData);
          nuevaVentana.focus();
          console.log('✅ [IPC] Multimedia enviada a nuevo proyector con canal proyectar-multimedia-data');
        });
      }
    }
  });
}

module.exports = { registrar };
