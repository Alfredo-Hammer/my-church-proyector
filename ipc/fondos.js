const { ipcMain, BrowserWindow, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const {
  obtenerFondos,
  agregarFondo,
  actualizarFondo,
  eliminarFondo,
  establecerFondoActivo,
  establecerFondoEspera,
  quitarFondoEspera,
} = require("../db");

// deps: dependencias que viven en main.js y no se pueden reimplementar
// tal cual (dependen de __dirname del proceso principal, de la ventana
// activa, o mutan estado compartido con el overlay OBS).
function registrar({ getMainWindow, obtenerRutaBase, obtenerRutaRecursos, fondosPublicDir, sincronizarFondoObs }) {
  // Verifica si un archivo local existe en disco. Compartida por todos los
  // handlers de este módulo (antes vivía solo dentro de "obtener-fondos",
  // así que "obtener-fondo-espera" no la aplicaba y podía devolver un fondo
  // cuyo archivo ya no existe).
  const archivoExisteEnDisco = (rawUrl) => {
    if (!rawUrl || rawUrl.startsWith('http')) return true;
    const relativePath = rawUrl.startsWith('/') ? rawUrl.slice(1) : rawUrl;
    const publicPath = path.join(obtenerRutaBase(), 'public', relativePath);
    const buildPath = path.join(obtenerRutaRecursos(), 'build', relativePath);
    // Las imágenes/videos de Pixabay descargados se guardan en
    // userData/build/images/pixabay (ver 'download-pixabay-image' en
    // main.js) — no en el build empaquetado de solo lectura
    // (obtenerRutaRecursos()) ni en public/. Sin este tercer candidato,
    // cualquier fondo bajado de Pixabay se consideraba "no existe" y
    // desaparecía de Gestión de Fondos aunque el archivo sí estuviera
    // en disco y el servidor lo sirviera bien (por eso la app móvil,
    // que no aplica este filtro, sí los mostraba).
    const userDataBuildPath = path.join(obtenerRutaBase(), 'build', relativePath);
    return fs.existsSync(publicPath) || fs.existsSync(buildPath) || fs.existsSync(userDataBuildPath);
  };

  // Handler para obtener todos los fondos
  ipcMain.handle("obtener-fondos", async () => {
    try {
      console.log("📋 [Main] Obteniendo fondos...");
      const fondos = await obtenerFondos();

      const fondosTransformados = fondos.flatMap(fondo => {
        // Los fondos animados (CSS/JS) no tienen archivo real — su url es un
        // identificador ("animado:estrellas"), no una ruta de disco.
        if (fondo.tipo === 'animado') {
          return [{
            id: fondo.id,
            url: fondo.url,
            tipo: fondo.tipo,
            nombre: fondo.nombre || `Fondo ${fondo.id}`,
            activo: Boolean(fondo.activo),
            es_defecto: Boolean(fondo.es_defecto),
            es_espera: Boolean(fondo.es_espera),
            created_at: fondo.created_at || new Date().toISOString()
          }];
        }

        const existe = archivoExisteEnDisco(fondo.url);
        if (!existe) {
          return [];
        }
        let rutaURL = fondo.url;
        if (typeof rutaURL === 'string') {
          if (rutaURL.startsWith('http')) {
            // noop
          } else if (rutaURL.startsWith('/')) {
            rutaURL = `http://localhost:3001${rutaURL}`;
          } else {
            const fileName = path.basename(rutaURL);
            rutaURL = `http://localhost:3001/fondos/${fileName}`;
          }
        }
        return [{
          id: fondo.id,
          url: rutaURL,
          tipo: fondo.tipo || 'imagen',
          nombre: fondo.nombre || `Fondo ${fondo.id}`,
          activo: Boolean(fondo.activo),
          es_defecto: Boolean(fondo.es_defecto),
          es_espera: Boolean(fondo.es_espera),
          created_at: fondo.created_at || new Date().toISOString()
        }];
      });

      console.log(`✅ [Main] Fondos con archivo: ${fondosTransformados.length} / ${fondos.length} total`);
      return fondosTransformados;
    } catch (error) {
      console.error("❌ [Main] Error obteniendo fondos:", error);
      return [];
    }
  });

  // Handler para actualizar fondo (persistir migraciones/correcciones)
  ipcMain.handle("actualizar-fondo", async (event, fondoData) => {
    try {
      if (!fondoData || !fondoData.id) {
        throw new Error('ID del fondo es requerido');
      }

      const ok = await actualizarFondo(fondoData);
      return ok;
    } catch (error) {
      console.error("❌ [Main] Error actualizando fondo:", error);
      return false;
    }
  });

  // Handler para obtener fondo activo
  ipcMain.handle("obtener-fondo-activo", async () => {
    try {
      console.log("🖼️ [Main] Obteniendo fondo activo...");
      const fondos = await obtenerFondos();
      const fondo = fondos.find(f => f.activo);
      if (!fondo) return null;
      // Los fondos animados no tienen archivo — su url ya es el identificador final
      if (fondo.tipo === 'animado') {
        console.log("✅ [Main] Fondo activo obtenido (animado):", fondo.url);
        return fondo;
      }
      // Devolver siempre URL completa para que el proyector no tenga que transformar
      const url = fondo.url && !fondo.url.startsWith('http')
        ? `http://localhost:3001${fondo.url}`
        : fondo.url;
      console.log("✅ [Main] Fondo activo obtenido:", fondo.url, '->', url);
      return { ...fondo, url };
    } catch (error) {
      console.error("❌ [Main] Error obteniendo fondo activo:", error);
      return null;
    }
  });

  // Handler MEJORADO para agregar fondo
  ipcMain.handle("agregar-fondo", async (event, fondoData) => {
    try {
      console.log("➕ [Main] Agregando fondo - Datos recibidos:", fondoData);

      // Validar que se recibieron datos
      if (!fondoData) {
        throw new Error("No se recibieron datos del fondo");
      }

      let url, tipo, nombre, activo;

      // Verificar el formato de datos
      if (typeof fondoData === 'string') {
        // Formato simple: solo URL
        console.log("🔄 [Main] Formato simple detectado");
        url = fondoData;
        tipo = 'imagen'; // Por defecto
        nombre = null;
        activo = false;
      } else if (fondoData && typeof fondoData === 'object') {
        // Formato objeto
        console.log("🔄 [Main] Formato objeto detectado");
        url = fondoData.url;
        tipo = fondoData.tipo || 'imagen';
        nombre = fondoData.nombre || null;
        activo = fondoData.activo || false;
      } else {
        throw new Error("Formato de datos de fondo inválido");
      }

      // Validar URL
      if (!url) {
        throw new Error("URL del fondo es requerida");
      }

      console.log("📋 [Main] Parámetros procesados:", { url, tipo, nombre, activo });

      // Llamar función de DB
      const resultado = await agregarFondo(url, tipo, nombre || null, activo ? 1 : 0);

      if (!resultado) {
        throw new Error("Error en la base de datos al agregar fondo");
      }

      console.log("✅ [Main] Fondo agregado exitosamente:", resultado);
      return resultado;

    } catch (error) {
      console.error("❌ [Main] Error agregando fondo:", error.message);
      console.error("❌ [Main] Stack trace:", error.stack);

      // Retornar false en lugar de lanzar error para evitar crashes
      return false;
    }
  });

  // Handler para establecer fondo activo
  ipcMain.handle("establecer-fondo-activo", async (event, id) => {
    try {
      console.log("🖼️ [Main] Estableciendo fondo activo:", id);
      const resultado = await establecerFondoActivo(id);

      if (resultado) {
        const fondos = await obtenerFondos();
        const fondoRaw = fondos.find(f => f.activo);

        // Transformar a URL completa antes de enviar al proyector (los fondos
        // animados no tienen archivo — su url ya es el identificador final)
        const fondoActivo = !fondoRaw ? null : fondoRaw.tipo === 'animado' ? { ...fondoRaw } : {
          ...fondoRaw,
          url: fondoRaw.url && !fondoRaw.url.startsWith('http')
            ? `http://localhost:3001${fondoRaw.url}`
            : fondoRaw.url
        };

        // Sincronizar fondo para overlay OBS
        sincronizarFondoObs(fondoRaw);

        // Notificar a todas las ventanas sobre el cambio
        const todasLasVentanas = BrowserWindow.getAllWindows();
        todasLasVentanas.forEach(ventana => {
          if (!ventana.isDestroyed()) {
            ventana.webContents.send("actualizar-fondo-activo", fondoActivo);
          }
        });

        console.log("✅ [Main] Fondo activo establecido:", fondoActivo?.url);
      }

      return resultado;
    } catch (error) {
      console.error("❌ [Main] Error estableciendo fondo activo:", error);
      return false;
    }
  });

  // Handler para obtener fondo de espera (pantalla de bienvenida / sin nada
  // proyectándose) — independiente del fondo activo.
  ipcMain.handle("obtener-fondo-espera", async () => {
    try {
      const fondos = await obtenerFondos();
      const fondo = fondos.find(f => f.es_espera);
      if (!fondo) return null;
      if (fondo.tipo === 'animado') return fondo;
      if (!archivoExisteEnDisco(fondo.url)) {
        console.warn("⚠️ [Main] Fondo de espera configurado pero el archivo no existe en disco:", fondo.url);
        return null;
      }
      const url = fondo.url && !fondo.url.startsWith('http')
        ? `http://localhost:3001${fondo.url}`
        : fondo.url;
      return { ...fondo, url };
    } catch (error) {
      console.error("❌ [Main] Error obteniendo fondo de espera:", error);
      return null;
    }
  });

  // Handler para establecer fondo de espera
  ipcMain.handle("establecer-fondo-espera", async (event, id) => {
    try {
      console.log("🖼️ [Main] Estableciendo fondo de espera:", id);
      const resultado = await establecerFondoEspera(id);

      if (resultado) {
        const fondos = await obtenerFondos();
        const fondoRaw = fondos.find(f => f.es_espera);

        const fondoEspera = !fondoRaw ? null : fondoRaw.tipo === 'animado' ? { ...fondoRaw } : {
          ...fondoRaw,
          url: fondoRaw.url && !fondoRaw.url.startsWith('http')
            ? `http://localhost:3001${fondoRaw.url}`
            : fondoRaw.url
        };

        const todasLasVentanas = BrowserWindow.getAllWindows();
        todasLasVentanas.forEach(ventana => {
          if (!ventana.isDestroyed()) {
            ventana.webContents.send("actualizar-fondo-espera", fondoEspera);
          }
        });

        console.log("✅ [Main] Fondo de espera establecido:", fondoEspera?.url);
      }

      return resultado;
    } catch (error) {
      console.error("❌ [Main] Error estableciendo fondo de espera:", error);
      return false;
    }
  });

  // Handler para quitar el fondo de espera (volver a no tener ninguno)
  ipcMain.handle("quitar-fondo-espera", async () => {
    try {
      const resultado = await quitarFondoEspera();

      if (resultado) {
        const todasLasVentanas = BrowserWindow.getAllWindows();
        todasLasVentanas.forEach(ventana => {
          if (!ventana.isDestroyed()) {
            ventana.webContents.send("actualizar-fondo-espera", null);
          }
        });
      }

      return resultado;
    } catch (error) {
      console.error("❌ [Main] Error quitando fondo de espera:", error);
      return false;
    }
  });

  // Handler ÚNICO para eliminar fondo
  ipcMain.handle("eliminar-fondo", async (event, id) => {
    try {
      console.log("🗑️ [Main] Eliminando fondo:", id);
      const resultado = await eliminarFondo(id);
      console.log("✅ [Main] Fondo eliminado:", resultado);
      return resultado;
    } catch (error) {
      console.error("❌ [Main] Error eliminando fondo:", error);
      return false;
    }
  });

  // Handler para seleccionar archivo de fondo desde dispositivo
  ipcMain.handle("seleccionar-fondo", async () => {
    try {
      console.log("📁 [Main] Abriendo dialog para seleccionar fondo...");

      const result = await dialog.showOpenDialog(getMainWindow(), {
        title: "Seleccionar fondo",
        filters: [
          {
            name: "Archivos de imagen y video",
            extensions: ["jpg", "jpeg", "png", "gif", "bmp", "mp4", "avi", "mov", "wmv", "webm"]
          },
          {
            name: "Imágenes",
            extensions: ["jpg", "jpeg", "png", "gif", "bmp"]
          },
          {
            name: "Videos",
            extensions: ["mp4", "avi", "mov", "wmv", "webm"]
          }
        ],
        properties: ["openFile"]
      });

      if (result.canceled || !result.filePaths.length) {
        console.log("❌ [Main] Selección cancelada");
        return null;
      }

      const filePath = result.filePaths[0];
      const fileName = path.basename(filePath);
      const extension = path.extname(filePath).toLowerCase();

      // Determinar tipo de archivo
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp'];
      const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.webm'];

      let tipo;
      if (imageExtensions.includes(extension)) {
        tipo = "imagen";
      } else if (videoExtensions.includes(extension)) {
        tipo = "video";
      } else {
        throw new Error("Tipo de archivo no soportado");
      }

      console.log("✅ [Main] Archivo seleccionado:", { filePath, fileName, tipo });

      return {
        filePath,
        nombre: fileName,
        tipo
      };

    } catch (error) {
      console.error("❌ [Main] Error seleccionando fondo:", error);
      return null;
    }
  });

  // ✨ HANDLER CORREGIDO: copiar archivo (ambos nombres para compatibilidad)
  ipcMain.handle("copiar-archivo-a-fondos", async (event, sourcePath) => {
    try {
      console.log("📁 [Main] Copiando archivo a fondos:", sourcePath);

      const extension = path.extname(sourcePath);
      const nombreSinExtension = path.basename(sourcePath, extension).replace(/[^a-zA-Z0-9.-]/g, "_");
      const uniqueName = `${Date.now()}-${nombreSinExtension}${extension}`;
      const destPath = path.join(fondosPublicDir, uniqueName);

      // Copiar archivo
      fs.copyFileSync(sourcePath, destPath);

      const relativePath = `/fondos/${uniqueName}`;
      console.log("✅ [Main] Archivo copiado a:", relativePath);

      return relativePath;

    } catch (error) {
      console.error("❌ [Main] Error copiando archivo:", error);
      return null;
    }
  });

  // ✨ HANDLER DUPLICADO en camelCase para compatibilidad
  ipcMain.handle("copiarArchivoAFondos", async (event, sourcePath) => {
    try {
      console.log("📁 [Main] Copiando archivo a fondos (camelCase):", sourcePath);

      // Evitar copiar el mismo archivo dos veces: comparamos primero por
      // tamaño (barato) y solo calculamos hash de contenido para los
      // candidatos que ya coinciden en tamaño — así no hay que hashear
      // toda la carpeta de fondos en cada subida.
      const crypto = require("crypto");
      const tamañoOrigen = fs.statSync(sourcePath).size;
      const hashArchivo = (ruta) => {
        const hash = crypto.createHash("md5");
        hash.update(fs.readFileSync(ruta));
        return hash.digest("hex");
      };

      const existentes = fs.existsSync(fondosPublicDir) ? fs.readdirSync(fondosPublicDir) : [];
      const candidatos = existentes.filter((nombre) => {
        try {
          return fs.statSync(path.join(fondosPublicDir, nombre)).size === tamañoOrigen;
        } catch {
          return false;
        }
      });

      if (candidatos.length > 0) {
        const hashOrigen = hashArchivo(sourcePath);
        const duplicado = candidatos.find(
          (nombre) => hashArchivo(path.join(fondosPublicDir, nombre)) === hashOrigen,
        );
        if (duplicado) {
          console.log("♻️ [Main] Archivo ya existe (mismo contenido), reutilizando:", duplicado);
          return `/fondos/${duplicado}`;
        }
      }

      const extension = path.extname(sourcePath);
      const nombreSinExtension = path.basename(sourcePath, extension).replace(/[^a-zA-Z0-9.-]/g, "_");
      const uniqueName = `${Date.now()}-${nombreSinExtension}${extension}`;
      const destPath = path.join(fondosPublicDir, uniqueName);

      // Copiar archivo
      fs.copyFileSync(sourcePath, destPath);

      const relativePath = `/fondos/${uniqueName}`;
      console.log("✅ [Main] Archivo copiado a:", relativePath);

      return relativePath;

    } catch (error) {
      console.error("❌ [Main] Error copiando archivo:", error);
      return null;
    }
  });

  // ✨ NUEVO HANDLER: Importar fondos desde carpeta
  ipcMain.handle("importar-fondos-desde-carpeta", async () => {
    try {
      console.log("📁 [Main] Abriendo dialog para seleccionar carpeta...");

      const result = await dialog.showOpenDialog(getMainWindow(), {
        title: "Seleccionar carpeta con fondos",
        properties: ["openDirectory"]
      });

      if (result.canceled || !result.filePaths.length) {
        console.log("❌ [Main] Selección de carpeta cancelada");
        return { success: false, message: "Selección cancelada" };
      }

      const carpetaSeleccionada = result.filePaths[0];
      console.log("📁 [Main] Carpeta seleccionada:", carpetaSeleccionada);

      // Extensiones soportadas
      const extensionesImagen = new Set(['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']);
      const extensionesVideo = new Set(['.mp4', '.avi', '.mov', '.wmv', '.webm', '.mkv']);
      const extensionesSoportadas = new Set([...extensionesImagen, ...extensionesVideo]);

      // Leer archivos de la carpeta
      const archivos = fs.readdirSync(carpetaSeleccionada);
      const archivosValidos = archivos.filter(archivo => {
        const extension = path.extname(archivo).toLowerCase();
        return extensionesSoportadas.includes(extension);
      });

      console.log(`📁 [Main] Archivos encontrados: ${archivos.length}, válidos: ${archivosValidos.length}`);

      if (archivosValidos.length === 0) {
        return {
          success: false,
          message: "No se encontraron archivos de imagen o video en la carpeta seleccionada"
        };
      }

      let importados = 0;
      let errores = 0;

      for (const archivo of archivosValidos) {
        try {
          const rutaCompleta = path.join(carpetaSeleccionada, archivo);
          const extension = path.extname(archivo).toLowerCase();

          // Determinar tipo
          const tipo = extensionesImagen.has(extension) ? 'imagen' : 'video';

          // Generar nombre único para el archivo (sanitizado — un nombre con
          // espacios o paréntesis rompe el `url()` de CSS al proyectarlo)
          const nombreSinExtensionSano = path.basename(archivo, extension).replace(/[^a-zA-Z0-9.-]/g, "_");
          const nombreUnico = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${nombreSinExtensionSano}${extension}`;
          const rutaDestino = path.join(fondosPublicDir, nombreUnico);

          // Copiar archivo a la carpeta de fondos
          fs.copyFileSync(rutaCompleta, rutaDestino);

          // Guardar en base de datos
          const rutaRelativa = `/fondos/${nombreUnico}`;
          const nombreSinExtension = path.basename(archivo, extension);

          const resultado = agregarFondo(
            rutaRelativa,
            tipo,
            nombreSinExtension,
            false
          );

          if (resultado) {
            importados++;
            console.log(`✅ [Main] Importado: ${archivo}`);
          } else {
            errores++;
            console.error(`❌ [Main] Error importando: ${archivo}`);
          }

        } catch (error) {
          errores++;
          console.error(`❌ [Main] Error procesando ${archivo}:`, error);
        }
      }

      console.log(`✅ [Main] Importación completada: ${importados} importados, ${errores} errores`);

      return {
        success: true,
        message: `Importación completada: ${importados} fondos importados${errores > 0 ? `, ${errores} errores` : ''}`,
        importados,
        errores
      };

    } catch (error) {
      console.error("❌ [Main] Error en importación masiva:", error);
      return {
        success: false,
        message: `Error durante la importación: ${error.message}`
      };
    }
  });

  // ✨ NUEVO HANDLER: Escanear carpeta de fondos existente
  ipcMain.handle("escanear-carpeta-fondos", async () => {
    try {
      console.log("🔍 [Main] Escaneando carpeta de fondos existente...");

      // Verificar si existe la carpeta de fondos
      if (!fs.existsSync(fondosPublicDir)) {
        return { success: false, message: "La carpeta de fondos no existe" };
      }

      const archivos = fs.readdirSync(fondosPublicDir);
      const extensionesImagen = new Set(['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']);
      const extensionesVideo = new Set(['.mp4', '.avi', '.mov', '.wmv', '.webm', '.mkv']);
      const extensionesSoportadas = new Set([...extensionesImagen, ...extensionesVideo]);

      const archivosValidos = archivos.filter(archivo => {
        const extension = path.extname(archivo).toLowerCase();
        return extensionesSoportadas.includes(extension);
      });

      console.log(`🔍 [Main] Archivos en carpeta fondos: ${archivos.length}, válidos: ${archivosValidos.length}`);

      // Obtener fondos ya existentes en BD
      const fondosExistentes = obtenerFondos();
      const urlsExistentes = new Set(fondosExistentes.map(f => f.url));

      let agregados = 0;
      let yaExistentes = 0;

      for (const archivo of archivosValidos) {
        try {
          const rutaRelativa = `/fondos/${archivo}`;

          // Verificar si ya existe en BD
          if (urlsExistentes.has(rutaRelativa)) {
            yaExistentes++;
            console.log(`ℹ️ [Main] Ya existe en BD: ${archivo}`);
            continue;
          }

          const extension = path.extname(archivo).toLowerCase();
          const tipo = extensionesImagen.has(extension) ? 'imagen' : 'video';
          const nombreSinExtension = path.basename(archivo, extension);

          const resultado = agregarFondo(rutaRelativa, tipo, nombreSinExtension, false);

          if (resultado) {
            agregados++;
            console.log(`✅ [Main] Agregado a BD: ${archivo}`);
          }

        } catch (error) {
          console.error(`❌ [Main] Error procesando ${archivo}:`, error);
        }
      }

      console.log(`✅ [Main] Escaneo completado: ${agregados} agregados, ${yaExistentes} ya existían`);

      return {
        success: true,
        message: `Escaneo completado: ${agregados} fondos agregados a la base de datos${yaExistentes > 0 ? `, ${yaExistentes} ya existían` : ''}`,
        agregados,
        yaExistentes
      };

    } catch (error) {
      console.error("❌ [Main] Error escaneando carpeta:", error);
      return {
        success: false,
        message: `Error durante el escaneo: ${error.message}`
      };
    }
  });
}

module.exports = { registrar };
