const { app, ipcMain, shell } = require("electron");
const { autoUpdater } = require("electron-updater");
const fs = require("fs");
const path = require("path");
const { validarArchivoUpload } = require("./shared/uploadValidation");

// deps: writeLog, obtenerRutaBase, getMainWindow y los getters/setters del
// estado del auto-updater (updateCheckManual/isDownloading son primitivos en
// main.js, no se pueden compartir por referencia) viven en main.js porque
// los listeners de autoUpdater.on(...) allá también los usan.
function registrar({
  writeLog,
  obtenerRutaBase,
  getMainWindow,
  setUpdateCheckManual,
  setIsDownloadingUpdate,
}) {
  // ====================================
  // HANDLERS DE ACTUALIZACIÓN AUTOMÁTICA
  // ====================================

  ipcMain.handle('check-for-updates', async () => {
    try {
      writeLog('🔍 Usuario solicitó verificación manual de actualizaciones');
      if (!app.isPackaged) {
        writeLog('⚠️ Actualizaciones deshabilitadas en modo desarrollo');
        return { available: false, isDev: true };
      }
      setUpdateCheckManual(true);
      await autoUpdater.checkForUpdates();
      return { checking: true };
    } catch (error) {
      writeLog(`❌ Error verificando actualizaciones: ${error.message}`);
      return { error: error.message };
    }
  });

  ipcMain.handle('download-update', async () => {
    try {
      writeLog('📥 Usuario aceptó descargar actualización');
      setIsDownloadingUpdate(true);
      await autoUpdater.downloadUpdate();
      return { downloading: true };
    } catch (error) {
      writeLog(`❌ Error descargando actualización: ${error.message}`);
      setIsDownloadingUpdate(false);
      return { error: error.message };
    }
  });

  ipcMain.handle('install-update', async () => {
    try {
      writeLog('🔄 Usuario aceptó instalar actualización - reiniciando app...');
      // Esto cerrará la app e instalará la actualización
      autoUpdater.quitAndInstall(false, true);
      return { installing: true };
    } catch (error) {
      writeLog(`❌ Error instalando actualización: ${error.message}`);
      return { error: error.message };
    }
  });

  ipcMain.handle('get-app-version', async () => {
    return app.getVersion();
  });

  ipcMain.handle('guardar-logo', async (event, archivoBuffer) => {
    try {
      console.log("🖼️ [Main] Guardando logo...");

      const buffer = Buffer.isBuffer(archivoBuffer) ? archivoBuffer : Buffer.from(archivoBuffer);
      const extension = '.jpg';
      validarArchivoUpload(buffer, extension, 'logo');

      const uploadsDir = path.join(obtenerRutaBase(), 'public', 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log("📁 [Main] Directorio uploads creado");
      }

      const fileName = `logo-${Date.now()}.jpg`;
      const filePath = path.join(uploadsDir, fileName);

      fs.writeFileSync(filePath, buffer);
      console.log(`✅ [Main] Logo guardado en: ${filePath}`);

      return `/uploads/${fileName}`;
    } catch (error) {
      console.error('❌ [Main] Error guardando logo:', error);
      return null;
    }
  });

  // Enlace externo
  ipcMain.handle('abrir-enlace-externo', async (event, url) => {
    shell.openExternal(url);
  });

  // Handler para obtener información de la aplicación
  ipcMain.handle('obtener-info-app', async () => {
    try {
      return {
        nombre: 'GloryView',
        version: '1.0.0',
        descripcion: 'Sistema de Proyección para Iglesias',
        desarrollador: 'Alfredo Hammer',
        email: 'iglesia@gmail.com',
        website: 'iglesia.com',
        caracteristicas: [
          'Proyección de himnos y versículos bíblicos',
          'Gestión completa de multimedia',
          'Presentaciones personalizadas',
          'Fondos y temas customizables',
          'Búsqueda avanzada en la Biblia',
          'Interfaz moderna y fácil de usar'
        ]
      };
    } catch (error) {
      console.error('❌ [Main] Error obteniendo info de la app:', error);
      return null;
    }
  });

  // Handler para controlar zoom de la aplicación
  ipcMain.handle('controlar-zoom', async (event, accion) => {
    try {
      const mainWindow = getMainWindow();
      if (!mainWindow) return;

      const currentZoom = mainWindow.webContents.getZoomLevel();

      switch (accion) {
        case 'in':
          mainWindow.webContents.setZoomLevel(currentZoom + 0.5);
          break;
        case 'out':
          mainWindow.webContents.setZoomLevel(currentZoom - 0.5);
          break;
        case 'reset':
          mainWindow.webContents.setZoomLevel(0);
          break;
        default:
          console.warn('❓ [Main] Acción de zoom desconocida:', accion);
      }

      return mainWindow.webContents.getZoomLevel();
    } catch (error) {
      console.error('❌ [Main] Error controlando zoom:', error);
      return 0;
    }
  });

  // Handler para gestionar pantalla completa
  ipcMain.handle('toggle-fullscreen', async () => {
    try {
      const mainWindow = getMainWindow();
      if (!mainWindow) return false;

      const isFullScreen = mainWindow.isFullScreen();
      mainWindow.setFullScreen(!isFullScreen);

      return !isFullScreen;
    } catch (error) {
      console.error('❌ [Main] Error gestionando pantalla completa:', error);
      return false;
    }
  });
}

module.exports = { registrar };
