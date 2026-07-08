const { ipcMain } = require("electron");

// deps: el estado del temporizador y sus helpers (timerGetData, timerIniciar/
// DetenerIntervalServidor, timerEnviarAlProyector, timerNotificarDesktop) se
// quedan definidos en main.js porque las rutas Express de la app móvil
// (/api/control/temporizador/*) también los usan y comparten el mismo estado
// en memoria — se inyectan por referencia, no se duplican acá.
// getProyectorWindow/createProyectorWindow se inyectan porque el handler
// timer-proyectar puede necesitar crear la ventana del proyector si no existe.
function registrar({
  getProyectorWindow,
  createProyectorWindow,
  actualizarObs,
  timerEstadoServidor,
  timerGetData,
  timerIniciarIntervalServidor,
  timerDetenerIntervalServidor,
  timerEnviarAlProyector,
  timerNotificarDesktop,
}) {
  // ====================================
  // HANDLERS DEL TEMPORIZADOR (DESKTOP)
  // El timer corre en main process para persistir entre navegaciones
  // ====================================
  ipcMain.handle('timer-estado', () => ({ ...timerEstadoServidor }));

  ipcMain.handle('timer-iniciar', (_, { minutos, mensaje, fondo } = {}) => {
    if (minutos !== undefined) {
      const total = Math.max(1, Number(minutos)) * 60;
      timerEstadoServidor.total = total;
      timerEstadoServidor.segundosRestantes = total;
    }
    if (mensaje !== undefined) timerEstadoServidor.mensaje = String(mensaje);
    if (fondo !== undefined) timerEstadoServidor.fondo = fondo || null;
    timerEstadoServidor.corriendo = true;
    timerEstadoServidor.terminado = false;
    timerIniciarIntervalServidor();
    timerNotificarDesktop();
    return timerGetData();
  });

  ipcMain.handle('timer-pausar', () => {
    timerEstadoServidor.corriendo = false;
    timerNotificarDesktop();
    return timerGetData();
  });

  ipcMain.handle('timer-reiniciar', (_, { minutos } = {}) => {
    timerDetenerIntervalServidor();
    timerEstadoServidor.corriendo = false;
    timerEstadoServidor.terminado = false;
    if (minutos !== undefined) {
      const total = Math.max(1, Number(minutos)) * 60;
      timerEstadoServidor.total = total;
    }
    timerEstadoServidor.segundosRestantes = timerEstadoServidor.total;
    timerEnviarAlProyector();
    timerNotificarDesktop();
    return timerGetData();
  });

  ipcMain.handle('timer-proyectar', async (_, { minutos, mensaje, fondo } = {}) => {
    if (minutos !== undefined) {
      const total = Math.max(1, Number(minutos)) * 60;
      timerEstadoServidor.total = total;
      timerEstadoServidor.segundosRestantes = total;
    }
    if (mensaje !== undefined) timerEstadoServidor.mensaje = String(mensaje);
    if (fondo !== undefined) timerEstadoServidor.fondo = fondo || null;
    timerEstadoServidor.proyectando = true;
    timerEstadoServidor.corriendo = true;
    timerEstadoServidor.terminado = false;
    let proyectorWindow = getProyectorWindow();
    if (!proyectorWindow || proyectorWindow.isDestroyed()) {
      proyectorWindow = createProyectorWindow();
      await new Promise((r) => proyectorWindow.webContents.once('did-finish-load', r));
      await new Promise((r) => setTimeout(r, 1500));
    }
    timerIniciarIntervalServidor();
    timerEnviarAlProyector();
    timerNotificarDesktop();
    return timerGetData();
  });

  ipcMain.handle('timer-detener', () => {
    timerDetenerIntervalServidor();
    timerEstadoServidor.corriendo = false;
    timerEstadoServidor.proyectando = false;
    actualizarObs('vacio');
    timerNotificarDesktop();
    const proyectorWindow = getProyectorWindow();
    if (proyectorWindow && !proyectorWindow.isDestroyed()) {
      proyectorWindow.webContents.send('mostrar-versiculo', {
        parrafo: '', titulo: ' ', numero: ' ', origen: 'clear',
      });
    }
    return timerGetData();
  });

  ipcMain.handle('timer-set-mensaje', (_, { mensaje } = {}) => {
    if (mensaje !== undefined) timerEstadoServidor.mensaje = String(mensaje);
    return timerGetData();
  });

  ipcMain.handle('timer-set-fondo', (_, { fondo } = {}) => {
    timerEstadoServidor.fondo = fondo || null;
    timerEnviarAlProyector();
    return timerGetData();
  });
}

module.exports = { registrar };
