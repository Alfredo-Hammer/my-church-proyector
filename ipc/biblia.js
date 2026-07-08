const { ipcMain } = require("electron");

// Bridge: Express -> Renderer (vista previa de Biblia para control remoto/app móvil).
// El estado vive a nivel de módulo porque registrar() solo se llama una vez,
// pero solicitarBibliaPreviewAlRenderer() la invocan las rutas Express de main.js
// en cada request — necesitan compartir el mismo Map de solicitudes pendientes.
const pendingBibliaPreview = new Map();

function solicitarBibliaPreviewAlRenderer(getMainWindow, { libroId, capitulo, versiculo }) {
  return new Promise((resolve, reject) => {
    const mainWindow = getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) {
      reject(new Error('Ventana principal no disponible'));
      return;
    }

    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const timeout = setTimeout(() => {
      pendingBibliaPreview.delete(id);
      reject(new Error('Timeout obteniendo vista previa de Biblia'));
    }, 2500);

    pendingBibliaPreview.set(id, {
      resolve: (payload) => {
        clearTimeout(timeout);
        resolve(payload);
      },
    });

    mainWindow.webContents.send('control-biblia-preview', {
      id,
      libroId,
      capitulo,
      versiculo,
    });
  });
}

function registrar({ getMainWindow }) {
  ipcMain.on('control-biblia-preview-response', (event, payload) => {
    try {
      const id = payload?.id;
      if (!id) return;
      const pending = pendingBibliaPreview.get(id);
      if (!pending) return;
      pendingBibliaPreview.delete(id);
      pending.resolve(payload);
    } catch (error) {
      console.error('❌ [MAIN] Error procesando control-biblia-preview-response:', error);
    }
  });

  // Handler para abrir el buscador de la Biblia desde el menú
  ipcMain.on('abrir-buscador-biblia', (event) => {
    try {
      console.log('🔍 [Main] Abriendo buscador de Biblia desde menú...');
      const mainWindow = getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.send('abrir-buscador-biblia');
      }
    } catch (error) {
      console.error('❌ [Main] Error abriendo buscador de Biblia:', error);
    }
  });

  // Handler para seleccionar libro específico de la Biblia desde el menú
  ipcMain.on('seleccionar-libro-biblia', (event, libroId) => {
    try {
      console.log('📖 [Main] Seleccionando libro bíblico desde menú:', libroId);
      const mainWindow = getMainWindow();
      if (mainWindow) {
        mainWindow.webContents.send('seleccionar-libro-biblia', libroId);
      }
    } catch (error) {
      console.error('❌ [Main] Error seleccionando libro bíblico:', error);
    }
  });
}

module.exports = { registrar, solicitarBibliaPreviewAlRenderer };
