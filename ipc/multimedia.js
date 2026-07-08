const { ipcMain, BrowserWindow, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const {
  obtenerMultimedia,
  agregarMultimedia,
  eliminarMultimedia,
  actualizarMultimedia,
  actualizarFavoritoMultimedia,
  obtenerMultimediaFavoritos,
  obtenerMultimediaPorTipo,
  incrementarReproducido,
  establecerMultimediaActiva,
  obtenerMultimediaActiva,
  limpiarMultimediaActiva,
} = require("../db");
const { validarArchivoUpload } = require("./shared/uploadValidation");

// deps.obtenerRutaBase: main.js resuelve rutas distinto en dev vs. empaquetado
// (usa su propio __dirname/userData) — no se puede reimplementar acá.
function registrar({ obtenerRutaBase }) {
  // ====================================
  // HANDLERS DE MULTIMEDIA ACTIVA
  // ====================================

  ipcMain.handle("establecer-multimedia-activa", async (event, multimediaData) => {
    try {
      const logMessage = "🎬 [Main] =============== ESTABLECER MULTIMEDIA ACTIVA ===============";
      console.log(logMessage);

      // Enviar logs también a las ventanas para mejor debugging
      const todasLasVentanas = BrowserWindow.getAllWindows();
      todasLasVentanas.forEach(ventana => {
        if (!ventana.isDestroyed()) {
          ventana.webContents.executeJavaScript(`console.log(${JSON.stringify(logMessage)})`);
          ventana.webContents.executeJavaScript(`console.log("🎬 [Main] Datos recibidos:", ${JSON.stringify(multimediaData)})`);
        }
      });

      console.log("🎬 [Main] Datos recibidos:", multimediaData);

      const resultado = await establecerMultimediaActiva(multimediaData);
      console.log("🎬 [Main] Resultado de establecerMultimediaActiva:", resultado);

      if (resultado) {
        // Notificar a todas las ventanas (especialmente el proyector)
        console.log("🎬 [Main] Total de ventanas encontradas:", todasLasVentanas.length);

        // Enviar a consolas también
        todasLasVentanas.forEach(ventana => {
          if (!ventana.isDestroyed()) {
            ventana.webContents.executeJavaScript(`console.log("🎬 [Main] Total de ventanas encontradas: ${todasLasVentanas.length}")`);
          }
        });

        let ventanasNotificadas = 0;
        todasLasVentanas.forEach((ventana, index) => {
          if (!ventana.isDestroyed()) {
            const titulo = ventana.getTitle();
            console.log(`🎬 [Main] Notificando ventana ${index + 1}:`, titulo);

            // Enviar a consola también
            ventana.webContents.executeJavaScript(`console.log("🎬 [Main] Notificando ventana ${index + 1}:", ${JSON.stringify(titulo)})`);

            ventana.webContents.send("actualizar-multimedia-activa", multimediaData);
            ventanasNotificadas++;
          } else {
            console.log(`⚠️ [Main] Ventana ${index + 1} está destruida, omitiendo`);
          }
        });

        console.log("✅ [Main] Multimedia activa establecida");
        console.log(`✅ [Main] ${ventanasNotificadas} ventanas notificadas del evento actualizar-multimedia-activa`);
        console.log("🎬 [Main] ============================================================");

        // Enviar logs finales a consolas
        todasLasVentanas.forEach(ventana => {
          if (!ventana.isDestroyed()) {
            ventana.webContents.executeJavaScript(`console.log("✅ [Main] Multimedia activa establecida")`);
            ventana.webContents.executeJavaScript(`console.log("✅ [Main] ${ventanasNotificadas} ventanas notificadas del evento actualizar-multimedia-activa")`);
            ventana.webContents.executeJavaScript(`console.log("🎬 [Main] ============================================================")`);
          }
        });
      } else {
        console.error("❌ [Main] Error: establecerMultimediaActiva retornó false");

        // Enviar error a consolas también
        todasLasVentanas.forEach(ventana => {
          if (!ventana.isDestroyed()) {
            ventana.webContents.executeJavaScript(`console.error("❌ [Main] Error: establecerMultimediaActiva retornó false")`);
          }
        });
      }

      return resultado;
    } catch (error) {
      console.error("❌ [Main] Error estableciendo multimedia activa:", error);

      // Enviar error a consolas también
      const todasLasVentanas = BrowserWindow.getAllWindows();
      todasLasVentanas.forEach(ventana => {
        if (!ventana.isDestroyed()) {
          ventana.webContents.executeJavaScript(`console.error("❌ [Main] Error estableciendo multimedia activa:", ${JSON.stringify(error.message)})`);
        }
      });

      return false;
    }
  });

  ipcMain.handle("obtener-multimedia-activa", async (event) => {
    try {
      console.log("🎬 [Main] Obteniendo multimedia activa...");
      const multimedia = await obtenerMultimediaActiva();
      console.log("✅ [Main] Multimedia activa obtenida:", multimedia);
      return multimedia;
    } catch (error) {
      console.error("❌ [Main] Error obteniendo multimedia activa:", error);
      return null;
    }
  });

  ipcMain.handle("limpiar-multimedia-activa", async (event) => {
    try {
      console.log("🧹 [Main] Limpiando multimedia activa...");
      const resultado = await limpiarMultimediaActiva();

      if (resultado) {
        // Notificar a todas las ventanas
        const todasLasVentanas = BrowserWindow.getAllWindows();
        todasLasVentanas.forEach(ventana => {
          if (!ventana.isDestroyed()) {
            ventana.webContents.send("limpiar-multimedia-activa");
          }
        });

        console.log("✅ [Main] Multimedia activa limpiada y notificada");
      }

      return resultado;
    } catch (error) {
      console.error("❌ [Main] Error limpiando multimedia activa:", error);
      return false;
    }
  });

  // ====================================
  // HANDLERS CRUD DE MULTIMEDIA
  // ====================================

  ipcMain.handle('db-obtener-multimedia', async () => {
    try {
      console.log('🎵 [IPC] Obteniendo archivos multimedia...');
      const multimedia = await obtenerMultimedia();
      console.log('✅ [IPC] Archivos multimedia obtenidos:', multimedia?.length || 0);
      return multimedia;
    } catch (error) {
      console.error('❌ [IPC] Error obteniendo multimedia:', error);
      return [];
    }
  });

  ipcMain.handle('db-agregar-multimedia', async (event, multimediaData) => {
    try {
      console.log('💾 [IPC] Agregando archivo multimedia:', multimediaData);
      const resultado = await agregarMultimedia(multimediaData);
      console.log('✅ [IPC] Archivo multimedia agregado:', resultado);
      return resultado;
    } catch (error) {
      console.error('❌ [IPC] Error agregando multimedia:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db-eliminar-multimedia', async (event, id) => {
    try {
      console.log('🗑️ [IPC] Eliminando archivo multimedia:', id);
      const resultado = await eliminarMultimedia(id);
      console.log('✅ [IPC] Archivo multimedia eliminado:', resultado);
      return resultado;
    } catch (error) {
      console.error('❌ [IPC] Error eliminando multimedia:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db-incrementar-reproducido', async (event, id) => {
    try {
      console.log('📈 [IPC] Incrementando contador de reproducido:', id);
      const resultado = await incrementarReproducido(id);
      console.log('✅ [IPC] Contador incrementado:', resultado);
      return resultado;
    } catch (error) {
      console.error('❌ [IPC] Error incrementando reproducido:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db-actualizar-favorito-multimedia', async (event, id, favorito) => {
    try {
      console.log('⭐ [IPC] Actualizando favorito multimedia:', { id, favorito });
      const resultado = await actualizarFavoritoMultimedia(id, favorito);
      console.log('✅ [IPC] Favorito actualizado:', resultado);
      return resultado;
    } catch (error) {
      console.error('❌ [IPC] Error actualizando favorito:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db-actualizar-multimedia', async (event, multimediaData) => {
    try {
      console.log('📝 [IPC] Actualizando multimedia:', multimediaData);
      const resultado = await actualizarMultimedia(multimediaData);
      console.log('✅ [IPC] Multimedia actualizada:', resultado);
      return resultado;
    } catch (error) {
      console.error('❌ [IPC] Error actualizando multimedia:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db-obtener-multimedia-favoritos', async () => {
    try {
      console.log('⭐ [IPC] Obteniendo multimedia favoritos...');
      const multimedia = await obtenerMultimediaFavoritos();
      console.log('✅ [IPC] Multimedia favoritos obtenidos:', multimedia?.length || 0);
      return multimedia;
    } catch (error) {
      console.error('❌ [IPC] Error obteniendo multimedia favoritos:', error);
      return [];
    }
  });

  ipcMain.handle('db-obtener-multimedia-por-tipo', async (event, tipo) => {
    try {
      console.log('🎯 [IPC] Obteniendo multimedia por tipo:', tipo);
      const multimedia = await obtenerMultimediaPorTipo(tipo);
      console.log('✅ [IPC] Multimedia por tipo obtenidos:', multimedia?.length || 0);
      return multimedia;
    } catch (error) {
      console.error('❌ [IPC] Error obteniendo multimedia por tipo:', error);
      return [];
    }
  });

  // ====================================
  // HANDLERS DE ARCHIVOS (subida, procesamiento, duplicados)
  // ====================================

  ipcMain.handle('test-duplicado', async (event, datos) => {
    console.log('🧪 [TEST] Handler de prueba ejecutado con datos:', datos);
    return { teste: true, datos: datos };
  });

  ipcMain.handle('seleccionar-archivos-multimedia', async (event) => {
    try {
      console.log('📂 [IPC] Abriendo selector de archivos multimedia...');

      const result = await dialog.showOpenDialog({
        title: 'Seleccionar archivos multimedia',
        properties: ['openFile', 'multiSelections'],
        filters: [
          { name: 'Videos', extensions: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'] },
          { name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'] },
          { name: 'Imágenes', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'] },
          { name: 'Todos los archivos', extensions: ['*'] }
        ]
      });

      if (result.canceled || result.filePaths.length === 0) {
        console.log('❌ [IPC] Selección cancelada o sin archivos');
        return { success: false, canceled: true };
      }

      console.log('✅ [IPC] Archivos seleccionados:', result.filePaths.length);
      return { success: true, filePaths: result.filePaths };

    } catch (error) {
      console.error('❌ [IPC] Error abriendo selector de archivos:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('procesar-archivos-por-ruta', async (event, filePaths) => {
    try {
      console.log('📦 [IPC] Procesando archivos por ruta:', filePaths.length);

      const resultados = [];
      // ✨ USAR obtenerRutaBase() para producción
      const multimediaDir = path.join(obtenerRutaBase(), "public", "multimedia");

      // Crear directorio si no existe
      if (!fs.existsSync(multimediaDir)) {
        fs.mkdirSync(multimediaDir, { recursive: true });
      }

      for (const filePath of filePaths) {
        try {
          console.log('📁 [IPC] Procesando archivo:', filePath);

          // Obtener información del archivo
          const stats = fs.statSync(filePath);
          const fileName = path.basename(filePath);
          const extension = path.extname(filePath).toLowerCase();
          const nombreSinExtension = path.basename(filePath, extension);

          // Determinar tipo
          let tipo;
          const extensionesVideo = new Set(['.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm']);
          const extensionesAudio = new Set(['.mp3', '.wav', '.ogg', '.aac', '.flac', '.m4a']);
          const extensionesImagen = new Set(['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']);

          if (extensionesVideo.has(extension)) {
            tipo = 'video';
          } else if (extensionesAudio.has(extension)) {
            tipo = 'audio';
          } else if (extensionesImagen.has(extension)) {
            tipo = 'imagen';
          } else {
            throw new Error(`Tipo de archivo no soportado: ${extension}`);
          }

          // Generar nombre único
          const timestamp = Date.now();
          const randomString = Math.random().toString(36).substring(2, 11);
          const nombreOriginal = nombreSinExtension.replace(/[^a-zA-Z0-9.-]/g, '_');
          const nombreUnico = `${timestamp}-${randomString}-${nombreOriginal}${extension}`;

          // Ruta destino
          const rutaDestino = path.join(multimediaDir, nombreUnico);

          // Copiar archivo (mucho más rápido que base64)
          console.log('📋 [IPC] Copiando archivo a:', rutaDestino);
          fs.copyFileSync(filePath, rutaDestino);
          console.log('✅ [IPC] Archivo copiado exitosamente');

          // Preparar datos para la base de datos
          const multimediaData = {
            nombre: fileName,
            tipo: tipo,
            tamaño: stats.size,
            ruta_archivo: nombreUnico,
            url: `/multimedia/${nombreUnico}`,
            extension: extension,
            favorito: false,
            reproducido: 0,
            fecha_agregado: new Date().toISOString()
          };

          console.log('💾 [IPC] Agregando a base de datos...');
          const resultadoDB = await agregarMultimedia(multimediaData);
          console.log('✅ [IPC] Agregado a BD con ID:', resultadoDB?.id);

          resultados.push({
            success: true,
            id: resultadoDB?.id,
            nombre: fileName,
            tipo: tipo,
            url: multimediaData.url
          });

        } catch (error) {
          console.error('❌ [IPC] Error procesando archivo:', error);
          resultados.push({
            success: false,
            nombre: path.basename(filePath),
            error: error.message
          });
        }
      }

      console.log('✅ [IPC] Procesamiento completado:', resultados);
      return { success: true, resultados: resultados };

    } catch (error) {
      console.error('❌ [IPC] Error general procesando archivos:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('procesar-archivo-multimedia', async (event, fileData) => {
    try {
      console.log('📁 [IPC] Procesando archivo multimedia:', fileData?.nombre);

      // Validar que fileData tiene las propiedades necesarias
      if (!fileData || !fileData.nombre || !fileData.data) {
        throw new Error('Datos de archivo incompletos. Se requiere nombre y data.');
      }

      // Crear directorio multimedia si no existe (userData en producción)
      const multimediaDir = path.join(obtenerRutaBase(), "public", "multimedia");
      if (!fs.existsSync(multimediaDir)) {
        fs.mkdirSync(multimediaDir, { recursive: true });
      }

      // Generar nombre único para el archivo
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 11);
      const nombreOriginal = fileData.nombre.replace(/[^a-zA-Z0-9.-]/g, '_');
      const extension = fileData.extension || '';
      const nombreUnico = `${timestamp}-${randomString}-${nombreOriginal}${extension}`;

      // Ruta completa del archivo
      const rutaArchivo = path.join(multimediaDir, nombreUnico);

      // Convertir base64 a buffer, validar y escribir el archivo
      const base64Data = fileData.data.replace(/^data:.*,/, ''); // Remover prefijo data:
      const buffer = Buffer.from(base64Data, 'base64');
      const categoriaMultimedia = ['imagen', 'video', 'audio'].includes(fileData.tipo) ? fileData.tipo : 'documento';
      validarArchivoUpload(buffer, fileData.extension || '', categoriaMultimedia);
      fs.writeFileSync(rutaArchivo, buffer);

      console.log('✅ [IPC] Archivo guardado exitosamente');

      // Preparar datos para la base de datos
      const multimediaData = {
        nombre: `${fileData.nombre}${extension}`, // Nombre completo con extensión
        tipo: fileData.tipo,
        tamaño: fileData.tamaño,
        ruta_archivo: nombreUnico, // Solo el nombre único, no la ruta completa
        url: `/multimedia/${nombreUnico}`, // URL relativa para el servidor
        favorito: false,
        reproducido: 0,
        fecha_agregado: new Date().toISOString()
      };

      // Agregar a la base de datos
      console.log('💾 [IPC] Agregando a base de datos...');
      const resultado = await agregarMultimedia(multimediaData);

      console.log('✅ [IPC] Resultado de agregar a BD:', resultado);

      // Retornar un objeto simple sin datos binarios grandes
      return {
        success: true,
        id: resultado?.id || resultado,
        multimedia: {
          id: resultado?.id || resultado,
          nombre: multimediaData.nombre,
          tipo: multimediaData.tipo,
          url: multimediaData.url
        },
        mensaje: `Archivo ${fileData.nombre}${extension} procesado correctamente`
      };

    } catch (error) {
      console.error('❌ [IPC] Error procesando archivo multimedia:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  ipcMain.handle('verificar-archivo-duplicado', async (event, datos) => {
    console.log('🔍 [IPC] Verificando duplicado:', datos?.nombre);

    try {
      console.log('🔍 [IPC] Datos recibidos:', { nombre: datos?.nombre, tipo: datos?.tipo, tamaño: datos?.tamaño });

      // Obtener todos los archivos multimedia de la base de datos
      const multimedia = obtenerMultimedia();
      console.log(`📊 [IPC] Total archivos en BD: ${multimedia?.length || 0}`);

      if (!multimedia || multimedia.length === 0) {
        console.log('📭 [IPC] No hay archivos en BD - archivo es único');
        return { existe: false };
      }

      // Buscar archivo con el mismo nombre (sin extensión)
      const nombreBuscado = datos?.nombre || '';
      console.log(`🔍 [IPC] Buscando duplicado de: "${nombreBuscado}"`);

      for (const item of multimedia) {
        const nombreExistente = item.nombre || '';
        // Remover extensión de ambos nombres para comparar
        const nombreExistenteSinExt = nombreExistente.replace(/\.[^/.]+$/, '');
        const nombreBuscadoSinExt = nombreBuscado.replace(/\.[^/.]+$/, '');

        console.log(`🔍 [IPC] Comparando: BD="${nombreExistenteSinExt}" vs Nuevo="${nombreBuscadoSinExt}"`);

        // Comparar nombres sin extensión (case insensitive)
        const nombreCoincide = nombreExistenteSinExt.toLowerCase() === nombreBuscadoSinExt.toLowerCase();
        const tipoCoincide = item.tipo === datos?.tipo;

        if (nombreCoincide && tipoCoincide) {
          console.log('⚠️ [IPC] *** DUPLICADO ENCONTRADO ***');
          console.log(`⚠️ [IPC] Archivo existente: "${nombreExistente}" (ID: ${item.id})`);
          return {
            existe: true,
            archivo: item
          };
        }
      }

      console.log('✅ [IPC] No se encontró duplicado - archivo es único');
      return { existe: false };

    } catch (error) {
      console.error('❌ [IPC] Error en verificación simplificada:', error);
      return {
        existe: false,
        error: error.message
      };
    }
  });
}

module.exports = { registrar };
