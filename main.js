// ✨ IMPORTACIONES PRIMERO
const { app, BrowserWindow, ipcMain, screen, Menu, dialog, shell, globalShortcut } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");
const fs = require("fs");

// Desde Electron 43 los diálogos de abrir/guardar ya no recuerdan la última
// carpeta (abren en Descargas). Se recuerda acá para todos los diálogos de la
// app (ipc/* usan este mismo objeto `dialog`), salvo que pasen defaultPath.
{
  let ultimaCarpeta = null;
  const recordar = (rutas) => {
    const r = Array.isArray(rutas) ? rutas[0] : rutas;
    if (r) ultimaCarpeta = path.dirname(r);
  };
  const conCarpeta = (args) => {
    const i = args.length > 0 && args[0] && typeof args[0].isDestroyed === "function" ? 1 : 0;
    const opciones = { ...(args[i] || {}) };
    if (ultimaCarpeta && !opciones.defaultPath) opciones.defaultPath = ultimaCarpeta;
    // Solo un nombre de archivo (ej. "respaldo.zip"): ponerlo en la última carpeta
    else if (ultimaCarpeta && !path.isAbsolute(opciones.defaultPath)) {
      opciones.defaultPath = path.join(ultimaCarpeta, opciones.defaultPath);
    }
    const copia = [...args];
    copia[i] = opciones;
    return copia;
  };
  const abrir = dialog.showOpenDialog.bind(dialog);
  dialog.showOpenDialog = async (...args) => {
    const r = await abrir(...conCarpeta(args));
    if (!r.canceled) recordar(r.filePaths);
    return r;
  };
  const guardar = dialog.showSaveDialog.bind(dialog);
  dialog.showSaveDialog = async (...args) => {
    const r = await guardar(...conCarpeta(args));
    if (!r.canceled) recordar(r.filePath);
    return r;
  };
}

// ✨ SISTEMA DE LOGS MEJORADO - Escribir errores en archivo para debugging
const logFilePath = path.join(app.getPath("userData"), "gloryview-error.log");
const writeLog = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  try {
    fs.appendFileSync(logFilePath, logMessage);
  } catch (e) {
    // Si falla escribir el log, intentar mostrar en consola
    console.error("Error escribiendo log:", e);
  }
};

// Capturar errores no manejados
process.on("uncaughtException", (error) => {
  const errorMsg = `UNCAUGHT EXCEPTION: ${error.stack || error.message || error}`;
  writeLog(errorMsg);
  console.error(errorMsg);

  // Mostrar diálogo de error al usuario
  if (app.isReady()) {
    dialog.showErrorBox(
      "Error Crítico - GloryView",
      `La aplicación encontró un error crítico:\n\n${error.message}\n\nRevise el archivo de log en:\n${logFilePath}`
    );
  }
});

process.on("unhandledRejection", (reason, promise) => {
  const errorMsg = `UNHANDLED REJECTION: ${reason}`;
  writeLog(errorMsg);
  console.error(errorMsg);
});

// Silenciar logs verbosos por defecto (mantiene warn/error)
// Para reactivar: DEBUG_LOGS=1
const DEBUG_LOGS = process.env.DEBUG_LOGS === "1";
if (!DEBUG_LOGS) {
  console.log = () => { };
  console.info = () => { };
  console.debug = () => { };
}

// Permitir reproducción sin gesto del usuario (necesario para controlar play/pause por IPC en el proyector).
// No fuerza autoplay por sí mismo; solo evita que Chromium rechace `media.play()`.
try {
  app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
} catch (error) {
  // No bloquear la app si Electron cambia esta API.
}
const os = require("os");
const { spawn } = require("child_process");
const express = require("express");
const cors = require("cors");
const https = require("https");
const http = require("http");
const QRCode = require("qrcode");
const { crearSeguridadServidor } = require("./ipc/shared/seguridadServidor");

let FFMPEG_BIN = "ffmpeg";
try {
  // `ffmpeg-static` expone la ruta completa al binario.
  const maybe = require("ffmpeg-static");
  if (maybe && typeof maybe === "string") {
    // Empaquetado, require() devuelve una ruta DENTRO de app.asar y un
    // binario ahí no se puede ejecutar (spawn ENOTDIR): las miniaturas de
    // video fallaban siempre en la app instalada. electron-builder lo copia
    // a app.asar.unpacked (asarUnpack en electron-builder.yml).
    FFMPEG_BIN = maybe.replace(/app\.asar([\\/])/, "app.asar.unpacked$1");
  }
} catch {
  // Si no está instalado, usamos ffmpeg del sistema (si existe).
}

// ==================================================
// Estado de reproducción multimedia (para app móvil)
// ==================================================
// Se actualiza desde el Proyector.jsx y el reproductor (solo-audio) vía IPC.
const multimediaPlaybackStatus = {
  proyector: {
    updatedAt: 0,
    id: null,
    nombre: null,
    currentTime: 0,
    duration: 0,
    paused: true,
    volume: null,
    tipo: null,
  },
  pc: {
    updatedAt: 0,
    id: null,
    nombre: null,
    currentTime: 0,
    duration: 0,
    paused: true,
    volume: null,
    tipo: null,
  },
};

// Importar funciones de la base de datos (db.js es la única fuente de verdad)
const {
  cerrarDB,
  reabrirDB,
  dbPath,

  // Funciones de himnos
  obtenerHimnos,
  obtenerHimnoPorId,
  buscarHimnos,
  crearHimno,
  actualizarHimno,
  actualizarFavoritoHimno,
  eliminarHimno,

  // Funciones de configuración
  obtenerConfiguracion,
  actualizarConfiguracion,
  restaurarConfiguracionDefecto,

  // Funciones de fondos
  agregarFondo,
  obtenerFondos,
  actualizarFondo,
  eliminarFondo,
  establecerFondoActivo,
  obtenerFondoActivo,
  inicializarFondosPorDefecto,
  inicializarFondosAnimadosPorDefecto,

  // Funciones de multimedia
  obtenerMultimedia,
  agregarMultimedia,
  eliminarMultimedia,
  actualizarMultimedia,
  actualizarFavoritoMultimedia,
  incrementarReproducido,
  obtenerMultimediaFavoritos,
  obtenerMultimediaPorTipo,

  // Funciones de multimedia activa
  establecerMultimediaActiva,
  obtenerMultimediaActiva,
  limpiarMultimediaActiva,

  // Órdenes de servicio
  obtenerOrdenesServicio,
  obtenerOrdenServicioPorId,
  agregarOrdenServicio,
  actualizarOrdenServicio,
  eliminarOrdenServicio,
  // Anuncios
  obtenerAnuncios,
  agregarAnuncio,
  actualizarAnuncio,
  eliminarAnuncio,
  reordenarAnuncios,
  // Oradores (Tercio Inferior)
  obtenerOradores,
  agregarOrador,
  actualizarOrador,
  eliminarOrador,
  // Presentaciones
  obtenerPresentaciones,
  agregarPresentacion,
  actualizarPresentacion,
  eliminarPresentacion,
} = require("./db");

// ✨ FUNCIÓN HELPER PARA RUTAS EN PRODUCCIÓN
function obtenerRutaBase() {
  const isDev = !app.isPackaged;
  if (isDev) {
    return __dirname;
  } else {
    // En producción, usar userData para archivos escribibles
    return app.getPath("userData");
  }
}

function obtenerRutaRecursos() {
  // En producción el build/ vive como extraResource fuera del .asar,
  // por lo que process.resourcesPath apunta a la carpeta real en disco.
  // __dirname dentro del .asar causa ENOTDIR con express.static().
  if (app.isPackaged) {
    return process.resourcesPath;
  }
  return __dirname;
}

// ✨ LIMPIAR HANDLERS EXISTENTES AL INICIO - CORREGIDO
const limpiarHandlers = () => {
  try {
    // Limpiar handlers de fondos que pueden estar duplicados
    ipcMain.removeHandler("agregar-fondo");
    ipcMain.removeHandler("obtener-fondos");
    ipcMain.removeHandler("eliminar-fondo");
    ipcMain.removeHandler("eliminarFondo");
    ipcMain.removeHandler("establecer-fondo-activo");
    ipcMain.removeHandler("obtener-fondo-activo");
    ipcMain.removeHandler("establecer-fondo-espera");
    ipcMain.removeHandler("obtener-fondo-espera");
    ipcMain.removeHandler("quitar-fondo-espera");
    ipcMain.removeHandler("seleccionar-fondo");
    ipcMain.removeHandler("copiar-archivo-a-fondos");
    ipcMain.removeHandler("copiarArchivoAFondos"); // ✨ AGREGADO: camelCase

    // ✨ AGREGADO: Nuevos handlers de importación
    ipcMain.removeHandler("importar-fondos-desde-carpeta");
    ipcMain.removeHandler("importarFondosDesdeCarpeta");
    ipcMain.removeHandler("escanear-carpeta-fondos");
    ipcMain.removeHandler("escanearCarpetaFondos");

    // Limpiar otros handlers
    ipcMain.removeHandler("agregar-himno");
    ipcMain.removeHandler("obtener-himnos");
    ipcMain.removeHandler("obtener-himno-por-id");
    ipcMain.removeHandler("actualizar-himno");
    ipcMain.removeHandler("eliminar-himno");
    ipcMain.removeHandler("obtener-favoritos");
    ipcMain.removeHandler("marcar-favorito");
    ipcMain.removeHandler("eliminar-favorito");

    // ✨ Limpiar handlers del proyector
    ipcMain.removeHandler("limpiar-proyector");

    // ✨ Limpiar handlers multimedia
    ipcMain.removeHandler("procesar-archivo-multimedia");
    ipcMain.removeHandler("db-obtener-multimedia");
    ipcMain.removeHandler("db-agregar-multimedia");
    ipcMain.removeHandler("proyectar-multimedia");
    ipcMain.removeHandler("verificar-archivo-duplicado");

    console.log("🧹 [Main] Handlers limpiados correctamente");
  } catch (error) {
    // Los handlers no existían, está bien
  }
};

// ✨ FUNCIÓN CSP ACTUALIZADA PARA YOUTUBE Y PIXABAY
function obtenerCSP() {
  const isDevelopment = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDevelopment) {
    return "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: file: http://localhost:3000 http://localhost:3001 ws://localhost:3000 https://*.youtube.com https://*.google.com; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:3000 https://*.youtube.com https://*.ytimg.com https://*.googlevideo.com https://*.google.com https://www.google.com https://*.ggpht.com https://*.doubleclick.net https://*.gstatic.com; " +
      "style-src 'self' 'unsafe-inline' http://localhost:3000 https://*.youtube.com https://*.ytimg.com https://*.google.com https://*.ggpht.com https://*.gstatic.com; " +
      "img-src 'self' data: blob: file: http://localhost:3001 http://localhost:3000 https://*.youtube.com https://*.ytimg.com https://*.googlevideo.com https://*.google.com https://*.ggpht.com https://*.gstatic.com https://pixabay.com https://*.pixabay.com; " +
      "media-src 'self' data: blob: file: http://localhost:3001 https://*.youtube.com https://*.ytimg.com https://*.googlevideo.com https://*.ggpht.com https://pixabay.com https://*.pixabay.com; " +
      "font-src 'self' data: http://localhost:3000 https://*.youtube.com https://*.ytimg.com https://*.gstatic.com; " +
      "connect-src 'self' http://localhost:3000 http://localhost:3001 ws://localhost:3000 https://*.youtube.com https://*.ytimg.com https://*.googlevideo.com https://*.google.com https://*.ggpht.com https://*.doubleclick.net https://*.gstatic.com https://pixabay.com https://*.pixabay.com; " +
      "frame-src 'self' https://*.youtube.com https://www.youtube.com https://youtube.com https://*.google.com;";
  } else {
    // PRODUCCIÓN: sin 'unsafe-inline' ni 'unsafe-eval' en script-src.
    // - El bundle de CRA no usa eval() (no hay source maps eval en producción).
    // - El único script inline de CRA es el runtime chunk; .env.production
    //   define INLINE_RUNTIME_CHUNK=false para que salga como archivo aparte.
    // - executeJavaScript() desde main no está sujeto al CSP de la página.
    // Si algo nuevo necesita eval/inline, buscar otra forma antes de relajar esto.
    return "default-src 'self' http://localhost:3001 https://*.youtube.com https://*.google.com; " +
      "script-src 'self' http://localhost:3001 https://*.youtube.com https://*.ytimg.com https://*.googlevideo.com https://*.google.com https://www.google.com https://*.ggpht.com https://*.doubleclick.net https://*.gstatic.com; " +
      "style-src 'self' 'unsafe-inline' http://localhost:3001 https://*.youtube.com https://*.ytimg.com https://*.google.com https://*.ggpht.com https://*.gstatic.com; " +
      "img-src 'self' data: blob: file: http://localhost:3001 https://*.youtube.com https://*.ytimg.com https://*.googlevideo.com https://*.google.com https://*.ggpht.com https://*.gstatic.com https://pixabay.com https://*.pixabay.com; " +
      "media-src 'self' data: blob: file: http://localhost:3001 https://*.youtube.com https://*.ytimg.com https://*.googlevideo.com https://*.ggpht.com https://pixabay.com https://*.pixabay.com blob:; " +
      "font-src 'self' data: http://localhost:3001 https://*.youtube.com https://*.ytimg.com https://*.gstatic.com; " +
      "connect-src 'self' http://localhost:3001 https://*.youtube.com https://*.ytimg.com https://*.googlevideo.com https://*.google.com https://*.ggpht.com https://*.doubleclick.net https://*.gstatic.com https://pixabay.com https://*.pixabay.com; " +
      "frame-src 'self' https://*.youtube.com https://www.youtube.com https://youtube.com https://*.google.com;";
  }
}

// ✨ FUNCIÓN HELPER PARA APLICAR CSP
// Solo se aplica a nuestro propio origen (localhost:3000/3001) — sin filtro
// esto sobreescribía también el CSP de respuestas de terceros (ej. el iframe
// de YouTube), y al quedar dos headers CSP con distinto casing el navegador
// aplica la intersección más restrictiva, rompiendo las conexiones internas
// de YouTube (pantalla negra al proyectar video).
function aplicarCSP(ventana) {
  const filtro = { urls: ['http://localhost:3000/*', 'http://localhost:3001/*'] };
  ventana.webContents.session.webRequest.onHeadersReceived(filtro, (details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [obtenerCSP()]
      }
    });
  });
}

// ✨ BLOQUEADOR DE ANUNCIOS - Bloquea Google Ads y otros rastreadores
function bloquearAnuncios(ventana) {
  const filtroAnuncios = {
    urls: [
      '*://*.doubleclick.net/*',
      '*://*.googlesyndication.com/*',
      '*://*.googleadservices.com/*',
      '*://googleads.g.doubleclick.net/*',
      '*://*.google-analytics.com/*',
      '*://*.analytics.google.com/*',
      '*://*.googletagmanager.com/*',
      '*://*.googletag.com/*'
    ]
  };

  ventana.webContents.session.webRequest.onBeforeRequest(filtroAnuncios, (details, callback) => {
    console.log('🚫 Bloqueado:', details.url);
    callback({ cancel: true }); // Bloquear la petición
  });
}

const { generarObsHtml, TERCIO_DISENOS, generarTercioInferiorHtml } = require("./servidor/obsHtml");

// ✨ CREAR SERVIDOR PARA ARCHIVOS MULTIMEDIA
function iniciarServidorMultimedia() {
  return new Promise((resolve, reject) => {
    const expressApp = express();
    const PORT = 3001;

    const solicitarBibliaPreviewAlRenderer = (payload) =>
      require("./ipc/biblia").solicitarBibliaPreviewAlRenderer(() => mainWindow, payload);

    const obtenerIpsLocalesV4 = () => {
      const nets = os.networkInterfaces();

      // Patrones de nombres de adaptadores virtuales conocidos en Windows/Linux/macOS.
      // Se comparan contra el nombre de la interfaz (no la IP), por eso son más confiables.
      const VIRTUAL_NAME_RE = /vmware|virtualbox|vbox|docker|hyper.?v|vethernet|tap|wsl|bluetooth|hamachi|tunnelbear|nordvpn|expressvpn|pvpn|openvpn|zerotier/i;

      const realIps = [];   // adaptadores reales (Wi-Fi, Ethernet)
      const virtualIps = []; // adaptadores virtuales (fallback si no hay reales)

      for (const nombre of Object.keys(nets || {})) {
        const esVirtual = VIRTUAL_NAME_RE.test(nombre);
        for (const net of nets[nombre] || []) {
          const family = typeof net.family === 'string' ? net.family : String(net.family);
          const isV4 = family === 'IPv4' || family === '4';
          if (!isV4) continue;
          if (net.internal) continue;
          if (!net.address) continue;
          if (esVirtual) {
            virtualIps.push(net.address);
          } else {
            realIps.push(net.address);
          }
        }
      }

      // Usar adaptadores reales primero; si no hay, caer a virtuales.
      const pool = realIps.length > 0 ? realIps : virtualIps;
      const uniqueIps = Array.from(new Set(pool));

      // Priorizar IPs de red local (Wi-Fi / Ethernet) sobre cualquier otro rango.
      const score = (ip) => {
        if (/^192\.168\./.test(ip)) return 0;
        if (/^10\./.test(ip)) return 1;
        if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return 2;
        if (/^172\./.test(ip)) return 10;
        if (/^169\.254\./.test(ip)) return 20; // APIPA / link-local
        return 5;
      };

      return uniqueIps.sort((a, b) => score(a) - score(b));
    };

    const obtenerUrlPreferidaParaMovil = () => {
      const ips = obtenerIpsLocalesV4();
      const ip = ips[0] || '127.0.0.1';
      return `http://${ip}:${PORT}`;
    };

    // 🔐 Seguridad: CORS restringido + PIN para peticiones desde la red local
    // (ver ipc/shared/seguridadServidor.js para las reglas).
    const seguridad = crearSeguridadServidor({
      rutaArchivoPin: path.join(app.getPath("userData"), "pin-movil.json"),
      log: writeLog,
    });
    expressApp.use(cors(seguridad.opcionesCors));
    expressApp.use(seguridad.middleware);

    // Parsear JSON en el body de las peticiones
    // ✨ Aumentar límites para videos grandes (500MB)
    expressApp.use(express.json({ limit: '500mb' }));
    expressApp.use(express.urlencoded({ extended: true, limit: '500mb' }));

    // ✨ Rutas para archivos escribibles (userData en producción)
    const rutaBase = obtenerRutaBase();
    const rutaRecursos = obtenerRutaRecursos();

    // Servir archivos desde multimedia (userData en producción)
    const multimediaDir = path.join(rutaBase, "public", "multimedia");
    const buildMultimediaDir = path.join(rutaRecursos, "build", "multimedia");

    // ✨ AGREGAR SERVIDOR PARA FONDOS (userData en producción)
    const fondosDir = path.join(rutaBase, "public", "fondos");
    const buildFondosDir = path.join(rutaRecursos, "build", "fondos");

    expressApp.use("/multimedia", express.static(multimediaDir, {
      setHeaders: (res, filePath) => {
        // Configurar headers según el tipo de archivo.
        // Nota: algunos archivos históricos se guardaron sin ".ext" (ej: ...video4mp4).
        const name = String(path.basename(filePath || '')).toLowerCase();

        if (name.endsWith('.mp3') || name.endsWith('mp3')) {
          res.setHeader('Content-Type', 'audio/mpeg');
        } else if (name.endsWith('.wav') || name.endsWith('wav')) {
          res.setHeader('Content-Type', 'audio/wav');
        } else if (name.endsWith('.webm') || name.endsWith('webm')) {
          res.setHeader('Content-Type', 'video/webm');
        } else if (name.endsWith('.mp4') || name.endsWith('mp4') || name.endsWith('.m4v') || name.endsWith('m4v')) {
          res.setHeader('Content-Type', 'video/mp4');
        } else if (name.endsWith('.png') || name.endsWith('png')) {
          res.setHeader('Content-Type', 'image/png');
        } else if (name.endsWith('.jpg') || name.endsWith('jpg') || name.endsWith('.jpeg') || name.endsWith('jpeg')) {
          res.setHeader('Content-Type', 'image/jpeg');
        }
        res.setHeader('Accept-Ranges', 'bytes');
      }
    }));

    // ✨ SERVIR ARCHIVOS DE FONDOS
    expressApp.use("/fondos", express.static(fondosDir, {
      setHeaders: (res, filePath) => {
        // Configurar headers según el tipo de archivo.
        const name = String(path.basename(filePath || '')).toLowerCase();

        if (name.endsWith('.mp3') || name.endsWith('mp3')) {
          res.setHeader('Content-Type', 'audio/mpeg');
        } else if (name.endsWith('.wav') || name.endsWith('wav')) {
          res.setHeader('Content-Type', 'audio/wav');
        } else if (name.endsWith('.webm') || name.endsWith('webm')) {
          res.setHeader('Content-Type', 'video/webm');
        } else if (name.endsWith('.mp4') || name.endsWith('mp4') || name.endsWith('.m4v') || name.endsWith('m4v')) {
          res.setHeader('Content-Type', 'video/mp4');
        } else if (name.endsWith('.png') || name.endsWith('png')) {
          res.setHeader('Content-Type', 'image/png');
        } else if (name.endsWith('.jpg') || name.endsWith('jpg') || name.endsWith('.jpeg') || name.endsWith('jpeg')) {
          res.setHeader('Content-Type', 'image/jpeg');
        }
        res.setHeader('Accept-Ranges', 'bytes');
      }
    }));

    // También servir desde build/multimedia (modo producción)
    expressApp.use("/multimedia", express.static(buildMultimediaDir, {
      setHeaders: (res, filePath) => {
        // Configurar headers según el tipo de archivo.
        const name = String(path.basename(filePath || '')).toLowerCase();

        if (name.endsWith('.mp3') || name.endsWith('mp3')) {
          res.setHeader('Content-Type', 'audio/mpeg');
        } else if (name.endsWith('.wav') || name.endsWith('wav')) {
          res.setHeader('Content-Type', 'audio/wav');
        } else if (name.endsWith('.webm') || name.endsWith('webm')) {
          res.setHeader('Content-Type', 'video/webm');
        } else if (name.endsWith('.mp4') || name.endsWith('mp4') || name.endsWith('.m4v') || name.endsWith('m4v')) {
          res.setHeader('Content-Type', 'video/mp4');
        } else if (name.endsWith('.png') || name.endsWith('png')) {
          res.setHeader('Content-Type', 'image/png');
        } else if (name.endsWith('.jpg') || name.endsWith('jpg') || name.endsWith('.jpeg') || name.endsWith('jpeg')) {
          res.setHeader('Content-Type', 'image/jpeg');
        }
        res.setHeader('Accept-Ranges', 'bytes');
      }
    }));

    // ✨ TAMBIÉN SERVIR FONDOS DESDE BUILD (MODO PRODUCCIÓN)
    expressApp.use("/fondos", express.static(buildFondosDir, {
      setHeaders: (res, filePath) => {
        // Configurar headers según el tipo de archivo.
        const name = String(path.basename(filePath || '')).toLowerCase();

        if (name.endsWith('.mp3') || name.endsWith('mp3')) {
          res.setHeader('Content-Type', 'audio/mpeg');
        } else if (name.endsWith('.wav') || name.endsWith('wav')) {
          res.setHeader('Content-Type', 'audio/wav');
        } else if (name.endsWith('.webm') || name.endsWith('webm')) {
          res.setHeader('Content-Type', 'video/webm');
        } else if (name.endsWith('.mp4') || name.endsWith('mp4') || name.endsWith('.m4v') || name.endsWith('m4v')) {
          res.setHeader('Content-Type', 'video/mp4');
        } else if (name.endsWith('.png') || name.endsWith('png')) {
          res.setHeader('Content-Type', 'image/png');
        } else if (name.endsWith('.jpg') || name.endsWith('jpg') || name.endsWith('.jpeg') || name.endsWith('jpeg')) {
          res.setHeader('Content-Type', 'image/jpeg');
        }
        res.setHeader('Accept-Ranges', 'bytes');
      }
    }));

    // 📥 Servir todas las imágenes estáticas desde build/images (incluye icon-256.png)
    const imagesDir = path.join(obtenerRutaRecursos(), "build", "images");
    expressApp.use("/images", express.static(imagesDir, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.jpg') || filePath.endsWith('.png') || filePath.endsWith('.jpeg') || filePath.endsWith('.webp')) {
          res.setHeader('Content-Type', 'image/jpeg');
        }
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache por 24 horas
        res.setHeader('Access-Control-Allow-Origin', '*');
      }
    }));

    // 📥 Servir imágenes de Pixabay descargadas localmente (ruta específica para prioridad)
    const { app: electronApp } = require('electron');
    const isDev = !electronApp.isPackaged;
    const pixabayImagesDir = isDev
      ? path.join(obtenerRutaRecursos(), "build", "images", "pixabay")
      : path.join(electronApp.getPath('userData'), 'build', 'images', 'pixabay');

    expressApp.use("/images/pixabay", express.static(pixabayImagesDir, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.jpg') || filePath.endsWith('.png') || filePath.endsWith('.jpeg') || filePath.endsWith('.webp')) {
          res.setHeader('Content-Type', 'image/jpeg');
        }
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache por 24 horas
        res.setHeader('Access-Control-Allow-Origin', '*');
      }
    }));

    // 📥 Servir archivos de uploads (logos, etc.) desde userData en producción
    const uploadsDir = path.join(obtenerRutaBase(), "public", "uploads");
    expressApp.use("/uploads", express.static(uploadsDir, {
      setHeaders: (res, filePath) => {
        const name = String(path.basename(filePath || '')).toLowerCase();

        if (name.endsWith('.png') || name.endsWith('png')) {
          res.setHeader('Content-Type', 'image/png');
        } else if (name.endsWith('.jpg') || name.endsWith('jpg') || name.endsWith('.jpeg') || name.endsWith('jpeg')) {
          res.setHeader('Content-Type', 'image/jpeg');
        } else if (name.endsWith('.webp') || name.endsWith('webp')) {
          res.setHeader('Content-Type', 'image/webp');
        }
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.setHeader('Access-Control-Allow-Origin', '*');
      }
    }));

    // 📦 Servir archivos estáticos de build (HTML, JS, CSS) - CRÍTICO PARA PRODUCCIÓN
    const buildDir = path.join(obtenerRutaRecursos(), "build");

    // ✨ LOGGING DE DIAGNÓSTICO
    writeLog(`📁 Directorio build: ${buildDir}`);
    writeLog(`📁 __dirname: ${__dirname}`);
    writeLog(`📁 app.isPackaged: ${app.isPackaged}`);
    writeLog(`📁 process.resourcesPath: ${process.resourcesPath}`);

    if (fs.existsSync(buildDir)) {
      const buildFiles = fs.readdirSync(buildDir);
      writeLog(`📁 Archivos en build: ${buildFiles.slice(0, 10).join(', ')}${buildFiles.length > 10 ? '...' : ''}`);
    } else {
      writeLog(`❌ Directorio build NO existe: ${buildDir}`);
    }

    expressApp.use(express.static(buildDir, {
      setHeaders: (res, filePath) => {
        // Cache apropiado según tipo de archivo
        if (filePath.endsWith('.html')) {
          res.setHeader('Content-Type', 'text/html');
          res.setHeader('Cache-Control', 'no-cache');
        } else if (filePath.endsWith('.js')) {
          res.setHeader('Content-Type', 'application/javascript');
          res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 año
        } else if (filePath.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css');
          res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 año
        }
      }
    }));

    // Verificar que las carpetas existan
    if (!fs.existsSync(multimediaDir)) {
      fs.mkdirSync(multimediaDir, { recursive: true });
    }

    if (!fs.existsSync(buildMultimediaDir)) {
      fs.mkdirSync(buildMultimediaDir, { recursive: true });
    }

    // ✨ VERIFICAR QUE LAS CARPETAS DE FONDOS EXISTAN
    if (!fs.existsSync(fondosDir)) {
      fs.mkdirSync(fondosDir, { recursive: true });
    }

    if (!fs.existsSync(buildFondosDir)) {
      fs.mkdirSync(buildFondosDir, { recursive: true });
    }

    // Contexto que reciben los módulos de servidor/rutas: getters en vivo (y
    // setters para las variables que cambian) de lo que comparten con main.js.
    const ctxServidor = {
      get BrowserWindow() { return BrowserWindow; },
      get FFMPEG_BIN() { return FFMPEG_BIN; }, set FFMPEG_BIN(v) { FFMPEG_BIN = v; },
      get PLANTILLAS_GSAP_META() { return PLANTILLAS_GSAP_META; },
      get PORT() { return PORT; },
      get QRCode() { return QRCode; },
      get actualizarConfiguracion() { return actualizarConfiguracion; },
      get actualizarFavoritoHimno() { return actualizarFavoritoHimno; },
      get actualizarFavoritoMultimedia() { return actualizarFavoritoMultimedia; },
      get actualizarHimno() { return actualizarHimno; },
      get actualizarObs() { return actualizarObs; },
      get actualizarOrdenServicio() { return actualizarOrdenServicio; },
      get agregarOrdenServicio() { return agregarOrdenServicio; },
      get app() { return app; },
      get buildDir() { return buildDir; },
      get buildFondosDir() { return buildFondosDir; },
      get buildMultimediaDir() { return buildMultimediaDir; },
      get crearHimno() { return crearHimno; },
      get createProyectorWindow() { return createProyectorWindow; },
      get diapositivaActiva() { return diapositivaActiva; }, set diapositivaActiva(v) { diapositivaActiva = v; },
      get eliminarHimno() { return eliminarHimno; },
      get eliminarOrdenServicio() { return eliminarOrdenServicio; },
      get establecerFondoActivo() { return establecerFondoActivo; },
      get fondoActivoObs() { return fondoActivoObs; }, set fondoActivoObs(v) { fondoActivoObs = v; },
      get fondosDir() { return fondosDir; },
      get fs() { return fs; },
      get generarObsHtml() { return generarObsHtml; },
      get generarTercioInferiorHtml() { return generarTercioInferiorHtml; },
      get getRequestBaseUrl() { return getRequestBaseUrl; },
      get http() { return http; },
      get https() { return https; },
      get mainWindow() { return mainWindow; }, set mainWindow(v) { mainWindow = v; },
      get multimediaDir() { return multimediaDir; },
      get multimediaPlaybackStatus() { return multimediaPlaybackStatus; },
      get obsEstado() { return obsEstado; },
      get obtenerAnuncios() { return obtenerAnuncios; },
      get obtenerConfiguracion() { return obtenerConfiguracion; },
      get obtenerFondos() { return obtenerFondos; },
      get obtenerHimnos() { return obtenerHimnos; },
      get obtenerIpsLocalesV4() { return obtenerIpsLocalesV4; },
      get obtenerMultimedia() { return obtenerMultimedia; },
      get obtenerMultimediaFavoritos() { return obtenerMultimediaFavoritos; },
      get obtenerOrdenServicioPorId() { return obtenerOrdenServicioPorId; },
      get obtenerOrdenesServicio() { return obtenerOrdenesServicio; },
      get obtenerPresentaciones() { return obtenerPresentaciones; },
      get obtenerRutaBase() { return obtenerRutaBase; },
      get obtenerRutaRecursos() { return obtenerRutaRecursos; },
      get obtenerUrlPreferidaParaMovil() { return obtenerUrlPreferidaParaMovil; },
      get path() { return path; },
      get proyectorWindow() { return proyectorWindow; }, set proyectorWindow(v) { proyectorWindow = v; },
      get rutaBase() { return rutaBase; },
      get seguridad() { return seguridad; },
      get sincronizarFondoObs() { return sincronizarFondoObs; },
      get solicitarBibliaPreviewAlRenderer() { return solicitarBibliaPreviewAlRenderer; },
      get spawn() { return spawn; },
      get timerDetenerIntervalServidor() { return timerDetenerIntervalServidor; },
      get timerEnviarAlProyector() { return timerEnviarAlProyector; },
      get timerEstaProyectando() { return timerEstaProyectando; },
      get timerEstadoServidor() { return timerEstadoServidor; },
      get timerIniciarIntervalServidor() { return timerIniciarIntervalServidor; },
      get timerRestaurarEnProyector() { return timerRestaurarEnProyector; },
      get toLocalhostUrl() { return toLocalhostUrl; },
      get writeLog() { return writeLog; },
    };

    require("./servidor/rutas/sistema")(expressApp, ctxServidor);

    require("./servidor/rutas/himnos")(expressApp, ctxServidor);

    require("./servidor/rutas/biblia")(expressApp, ctxServidor);

    require("./servidor/rutas/proyector")(expressApp, ctxServidor);

    // ==================================================
    // ✅ Multimedia (App móvil)
    // ==================================================

    const getRequestBaseUrl = (req) => `${req.protocol}://${req.get('host')}`;

    require("./servidor/rutas/multimedia")(expressApp, ctxServidor);

    const toLocalhostUrl = (url) => {
      const raw = String(url || '').trim();
      if (!raw) return '';
      if (/^https?:\/\//i.test(raw)) return raw;
      if (raw.startsWith('/')) return `http://localhost:${PORT}${raw}`;
      return `http://localhost:${PORT}/${raw}`;
    };

    require("./servidor/rutas/fondos")(expressApp, ctxServidor);

    require("./servidor/rutas/ordenesServicio")(expressApp, ctxServidor);

    require("./servidor/rutas/anuncios")(expressApp, ctxServidor);

    require("./servidor/rutas/presentaciones")(expressApp, ctxServidor);

    require("./servidor/rutas/temporizador")(expressApp, ctxServidor);

    require("./servidor/rutas/plantillas")(expressApp, ctxServidor);

    require("./servidor/rutas/obs")(expressApp, ctxServidor);

    // Escuchar en 0.0.0.0 explícitamente para aceptar conexiones de la red local (app móvil).
    // Sin host explícito, en Windows con IPv6 preferido puede quedar solo en '::' y rechazar IPv4.
    const servidor = expressApp.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ [Servidor] Escuchando en 0.0.0.0:${PORT} (LAN + localhost)`);
      writeLog(`✅ [Servidor] Express escuchando en puerto ${PORT}`);
      inicializarFondoObs();
      resolve(); // ✨ Resolver la promesa cuando el servidor esté listo
    });

    servidor.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`⚠️ [Servidor] Puerto ${PORT} ocupado. Intentando liberar proceso anterior...`);
        writeLog(`⚠️ [Servidor] Puerto ${PORT} ocupado, intentando liberar...`);
        const { exec } = require('child_process');

        // En Windows: obtener el PID con netstat y matarlo con taskkill.
        // La sintaxis "FOR /F ... %P" funciona en cmd.exe directo (no en batch file).
        const killCmd = process.platform === 'win32'
          ? `for /f "tokens=5" %P in ('netstat -ano ^| findstr LISTENING ^| findstr :${PORT}') do taskkill /PID %P /F`
          : `lsof -ti:${PORT} | xargs kill -9`;

        exec(killCmd, { shell: true }, (killErr) => {
          if (killErr) {
            console.warn('[Servidor] No se pudo liberar el puerto:', killErr.message);
            writeLog(`⚠️ [Servidor] No se pudo liberar puerto: ${killErr.message}`);
          } else {
            console.log(`[Servidor] Puerto ${PORT} liberado. Reintentando en 1.5s...`);
            writeLog(`[Servidor] Puerto ${PORT} liberado, reintentando...`);
          }
          setTimeout(() => {
            servidor.close();
            const nuevoServidor = expressApp.listen(PORT, '0.0.0.0', () => {
              console.log(`✅ [Servidor] Reintento exitoso en 0.0.0.0:${PORT}`);
              writeLog(`✅ [Servidor] Reintento exitoso en puerto ${PORT}`);
              resolve(); // ✨ Resolver la promesa en el reintento exitoso
            });
            nuevoServidor.on('error', (err2) => {
              console.error(`❌ [Servidor] Fallo en reintento:`, err2.message);
              writeLog(`❌ [Servidor] Fallo en reintento: ${err2.message}`);
              const { dialog } = require('electron');
              dialog.showErrorBox(
                'Error de servidor',
                `GloryView no pudo iniciar en el puerto ${PORT}.\n\nCierra cualquier instancia anterior de GloryView e inténtalo de nuevo.\n\nDetalle: ${err2.message}`
              );
              reject(err2); // ✨ Rechazar la promesa si falla el reintento
            });
          }, 1500);
        });
      } else {
        console.error(`❌ [Servidor] Error inesperado:`, err.message);
        writeLog(`❌ [Servidor] Error inesperado: ${err.message}`);
        const { dialog } = require('electron');
        dialog.showErrorBox(
          'Error de servidor',
          `GloryView no pudo iniciar el servidor en el puerto ${PORT}.\n\nDetalle: ${err.message}`
        );
        reject(err); // ✨ Rechazar la promesa en error inesperado
      }
    });

    // Windows: agregar regla de Firewall para que la app móvil pueda conectarse.
    // Se ejecuta siempre (dev y producción) porque node.exe en dev tampoco tiene excepción.
    // La regla es solo por puerto (sin "program=") para que funcione tanto en dev como empaquetado.
    if (process.platform === 'win32') {
      const { exec } = require('child_process');
      const ruleName = 'GloryView - Puerto 3001';
      // Primero eliminar regla anterior para evitar duplicados, luego agregar la nueva.
      const deleteRule = `netsh advfirewall firewall delete rule name="${ruleName}" >nul 2>&1`;
      const addRule = `netsh advfirewall firewall add rule name="${ruleName}" dir=in action=allow protocol=TCP localport=${PORT} enable=yes`;
      exec(`${deleteRule} & ${addRule}`, (err) => {
        if (err) {
          console.warn('[Firewall] No se pudo agregar regla (requiere permisos de admin):', err.message);
          writeLog(`⚠️ [Firewall] No se pudo agregar regla: ${err.message}`);
        } else {
          console.log(`[Firewall] Regla activa: "${ruleName}" (TCP in puerto ${PORT})`);
          writeLog(`✅ [Firewall] Regla activa para puerto ${PORT}`);
        }
      });
    }

  }); // ✨ Cierre de la promesa
}

// Crear la carpeta "assets/fondos" si no existe (solo desarrollo)
const carpetaFondos = path.join(obtenerRutaBase(), "assets", "fondos");
if (!fs.existsSync(carpetaFondos)) {
  try {
    fs.mkdirSync(carpetaFondos, { recursive: true });
    console.log(`Carpeta creada: ${carpetaFondos}`);
  } catch (error) {
    console.error("Error al crear la carpeta 'assets/fondos':", error);
  }
}

// ✨ CREAR CARPETA PARA FONDOS EN PUBLIC (userData en producción)
const fondosPublicDir = path.join(obtenerRutaBase(), "public", "fondos");
if (!fs.existsSync(fondosPublicDir)) {
  try {
    fs.mkdirSync(fondosPublicDir, { recursive: true });
    console.log(`✅ [Main] Carpeta creada: ${fondosPublicDir}`);
  } catch (error) {
    console.error("❌ [Main] Error al crear la carpeta 'public/fondos':", error);
  }
}

// ✨ CREAR CARPETA PARA MULTIMEDIA EN PUBLIC (userData en producción)
const multimediaPublicDir = path.join(obtenerRutaBase(), "public", "multimedia");
if (!fs.existsSync(multimediaPublicDir)) {
  try {
    fs.mkdirSync(multimediaPublicDir, { recursive: true });
    console.log(`✅ [Main] Carpeta multimedia creada: ${multimediaPublicDir}`);
  } catch (error) {
    console.error("❌ [Main] Error al crear la carpeta 'public/multimedia':", error);
  }
}

let mainWindow;
let proyectorWindow;
const setProyectorWindow = (win) => { proyectorWindow = win; };

// Diapositiva actualmente en pantalla (para que la app móvil sepa qué
// presentación/índice está en vivo al abrir el módulo) — se actualiza desde
// Diapositivas.jsx (IPC) y desde el propio control remoto móvil (REST).
let diapositivaActiva = null; // { presentacionId, indice, totalSlides } | null

// ── Temporizador servidor ──────────────────────────────────────────────────
const timerEstadoServidor = {
  corriendo: false,
  segundosRestantes: 600,
  total: 600,
  mensaje: 'El culto comienza en',
  proyectando: false,
  terminado: false,
  fondo: null, // {url, tipo} | null
};
let timerIntervalServidor = null;

// ── Estado compartido para el overlay OBS ─────────────────────────────────
// Se actualiza cada vez que el proyector muestra contenido nuevo.
// GET /api/proyector/estado lo expone para que la página /obs pueda leerlo.
const obsEstado = {
  tipo: 'vacio', // 'vacio' | 'himno' | 'biblia' | 'anuncio' | 'temporizador' | 'multimedia'
  parrafo: '', titulo: '', numero: '', origen: '',
  segundos: 0, total: 0, mensaje: '', terminado: false,
  fondo: null, // {url, tipo} | null — fondo específico del contenido actual (ej. temporizador)
  media: null, // {url, tipo, nombre} | null — multimedia proyectada (tipo: 'imagen'|'video'|'youtube')
  // Tercio inferior (lower third) — capa independiente de 'tipo': se
  // muestra/oculta por su cuenta, sin que actualizarObs() la toque.
  tercioInferior: {
    activo: false, nombre: '', cargo: '', tema: '', plantilla: 'dorado', diseno: 'clasico',
    duracionEntrada: 700, duracionSalida: 600, // ms — velocidad de la animación
  },
  updatedAt: Date.now(),
};
const actualizarObs = (tipo, datos = {}) => {
  Object.assign(obsEstado, {
    tipo,
    parrafo: '', titulo: '', numero: '', origen: '',
    segundos: 0, total: 0, mensaje: '', terminado: false,
    fondo: null,
    media: null,
    ...datos,
    updatedAt: Date.now(),
  });
};
const actualizarTercioInferior = (datos = {}) => {
  Object.assign(obsEstado.tercioInferior, datos);
};
// Auto-ocultar: vive en main.js (no en la página de control) para que siga
// funcionando aunque el usuario navegue a otra pestaña de la app mientras
// espera — un setTimeout en el renderer se perdería al desmontar la página.
let tercioAutoOcultarTimeout = null;
const cancelarAutoOcultarTercio = () => {
  if (tercioAutoOcultarTimeout) { clearTimeout(tercioAutoOcultarTimeout); tercioAutoOcultarTimeout = null; }
};
const programarAutoOcultarTercio = (ms) => {
  cancelarAutoOcultarTercio();
  if (ms && ms > 0) {
    tercioAutoOcultarTimeout = setTimeout(() => {
      actualizarTercioInferior({ activo: false });
      tercioAutoOcultarTimeout = null;
    }, ms);
  }
};

// Fondo activo del proyector — se sincroniza con la BD y con cambios en tiempo real
let fondoActivoObs = null; // { url: '/fondos/...', tipo: 'imagen'|'video' } o null
const toFondoRelUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('/fondos/')) return url;
  try { const u = new URL(url); if (u.pathname.startsWith('/fondos/')) return u.pathname; } catch {}
  return null;
};
const inicializarFondoObs = async () => {
  try {
    const fondos = await obtenerFondos();
    const activo = (Array.isArray(fondos) ? fondos : []).find(f => f.activo);
    if (activo?.url) {
      // Los fondos animados no son un archivo — su url ya es el identificador
      // final ("animado:estrellas"), no pasa por toFondoRelUrl.
      if (activo.tipo === 'animado') {
        fondoActivoObs = { url: activo.url, tipo: 'animado' };
        return;
      }
      const rel = toFondoRelUrl(activo.url) || (activo.url.startsWith('/') ? activo.url : null);
      if (rel) fondoActivoObs = { url: rel, tipo: activo.tipo || 'imagen' };
    }
  } catch {}
};
const sincronizarFondoObs = (fondoRaw) => {
  if (!fondoRaw?.url) { fondoActivoObs = null; return; }
  if (fondoRaw.tipo === 'animado') { fondoActivoObs = { url: fondoRaw.url, tipo: 'animado' }; return; }
  const rel = toFondoRelUrl(fondoRaw.url) || (fondoRaw.url.startsWith('/') ? fondoRaw.url : null);
  fondoActivoObs = rel ? { url: rel, tipo: fondoRaw.tipo || 'imagen' } : null;
};

const timerGetData = () => ({
  segundos: timerEstadoServidor.segundosRestantes,
  total: timerEstadoServidor.total,
  mensaje: timerEstadoServidor.mensaje,
  terminado: timerEstadoServidor.terminado,
  corriendo: timerEstadoServidor.corriendo,
  proyectando: timerEstadoServidor.proyectando,
  fondo: timerEstadoServidor.fondo,
});

const timerEnviarAlProyector = () => {
  if (!timerEstadoServidor.proyectando) return;
  const td = timerGetData();
  if (proyectorWindow && !proyectorWindow.isDestroyed()) {
    proyectorWindow.webContents.send('mostrar-temporizador', td);
  }
  actualizarObs('temporizador', {
    segundos: td.segundos, total: td.total,
    mensaje: td.mensaje, terminado: td.terminado,
    fondo: td.fondo || null,
  });
};

// Notifica al mainWindow (desktop UI) para que el componente Temporizador
// pueda actualizarse aunque haya navegado a otra página
const timerNotificarDesktop = () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('timer-tick', timerGetData());
  }
};

const timerDetenerIntervalServidor = () => {
  if (timerIntervalServidor) {
    clearInterval(timerIntervalServidor);
    timerIntervalServidor = null;
  }
};

const timerIniciarIntervalServidor = () => {
  timerDetenerIntervalServidor();
  timerIntervalServidor = setInterval(() => {
    if (!timerEstadoServidor.corriendo) {
      timerNotificarDesktop();
      return;
    }
    timerEstadoServidor.segundosRestantes = Math.max(0, timerEstadoServidor.segundosRestantes - 1);
    timerEnviarAlProyector();
    timerNotificarDesktop();
    if (timerEstadoServidor.segundosRestantes <= 0) {
      timerEstadoServidor.corriendo = false;
      timerEstadoServidor.terminado = true;
      timerDetenerIntervalServidor();
      timerEnviarAlProyector(); // muestra "¡Ya!" en el proyector
      timerNotificarDesktop();
      if (timerEstadoServidor.proyectando) {
        setTimeout(() => {
          timerEstadoServidor.proyectando = false;
          actualizarObs('vacio');
          timerNotificarDesktop();
          if (proyectorWindow && !proyectorWindow.isDestroyed()) {
            // limpiarProyector() → modo BIENVENIDA (muestra ModernWelcomeScreen)
            proyectorWindow.webContents.send('mostrar-versiculo', {
              parrafo: '', titulo: ' ', numero: ' ', origen: 'clear',
            });
          }
        }, 4000);
      }
    }
  }, 1000);
};

// Devuelve true si el timer del servidor está proyectando activamente
const timerEstaProyectando = () =>
  Boolean(timerEstadoServidor.proyectando && timerEstadoServidor.corriendo && !timerEstadoServidor.terminado);

// Re-envía el estado del timer al proyector (para recuperación después de un clear)
const timerRestaurarEnProyector = () => {
  if (!timerEstaProyectando()) return;
  if (proyectorWindow && !proyectorWindow.isDestroyed()) {
    proyectorWindow.webContents.send('mostrar-temporizador', timerGetData());
  }
};

// ── Plantillas GSAP metadata ───────────────────────────────────────────────
// Debe reflejar exactamente src/components/PlantillasConfig.js (META_PLANTILLAS)
// — son las 4 plantillas GSAP curadas vigentes (reemplazaron a las 10 genéricas
// de antes). Si se agregan/renombran plantillas ahí, actualizar acá también.
const PLANTILLAS_GSAP_META = {
  alabanza: { nombre: 'Alabanza', icono: '🔥', desc: 'Audaz y enérgico — cantos, celebración' },
  reflexion: { nombre: 'Reflexión', icono: '🕊', desc: 'Serif cálido y quieto — comunión, oración' },
  ensenanza: { nombre: 'Enseñanza', icono: '📖', desc: 'Limpio y directo — máxima legibilidad para la prédica' },
  especial: { nombre: 'Especial', icono: '✨', desc: 'Marco dorado — Navidad, Semana Santa, eventos' },
  vibra: { nombre: 'Vibra', icono: '⚡', desc: 'Neón de escenario — cultos de jóvenes, energía' },
  gozo: { nombre: 'Gozo', icono: '🎉', desc: 'Fiesta y celebración — rayos de luz, jóvenes' },
};

// ✨ CREAR VENTANA PRINCIPAL CON CSP CONFIGURADA
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(obtenerRutaRecursos(), 'assets', 'icon-256.png'), // ✨ ICONO HD PERSONALIZADO
    fullscreenable: true,
    show: false, // ✨ No mostrar hasta que esté listo
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: !app.isPackaged, // ✅ Solo en desarrollo
      webSecurity: true, // ✨ CAMBIAR A TRUE para seguridad
      allowRunningInsecureContent: false, // ✨ AGREGAR seguridad adicional
      experimentalFeatures: false, // ✨ AGREGAR seguridad adicional
      sandbox: true,
    },
  });

  // ✨ APLICAR CSP Y BLOQUEADOR DE ANUNCIOS
  aplicarCSP(mainWindow);
  bloquearAnuncios(mainWindow);

  // Remover "Electron/xx" del User-Agent para que YouTube y otros servicios no lo bloqueen
  mainWindow.webContents.setUserAgent(
    mainWindow.webContents.getUserAgent().replace(/\s*Electron\/[\d.]+/, '')
  );

  // ✨ CARGAR URL SEGÚN ENTORNO
  const isDev = !app.isPackaged;
  console.log(`🔧 NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`📦 app.isPackaged: ${app.isPackaged}`);
  console.log(`🚀 isDev: ${isDev}`);
  writeLog(`Modo de ejecución: ${isDev ? 'desarrollo' : 'producción'}`);

  let targetUrl;
  if (isDev) {
    targetUrl = "http://localhost:3000";
    console.log("📍 Cargando desde servidor de desarrollo");
    writeLog("📍 Cargando desde servidor de desarrollo (React dev server)");
  } else {
    targetUrl = "http://localhost:3001";
    console.log("📍 Cargando desde servidor Express de producción");
    writeLog("📍 Cargando desde servidor Express de producción");
  }

  writeLog(`Intentando cargar URL: ${targetUrl}`);

  // Cargar URL con manejo de errores
  mainWindow.loadURL(targetUrl).catch(err => {
    const errorMsg = `❌ Error cargando URL ${targetUrl}: ${err.message}`;
    console.error(errorMsg);
    writeLog(errorMsg);

    dialog.showErrorBox(
      "Error Crítico - No se puede cargar la aplicación",
      `No se pudo cargar la interfaz de la aplicación.\n\nURL: ${targetUrl}\nError: ${err.message}\n\nVerifique que el servidor esté funcionando.\n\nLog: ${logFilePath}`
    );
  });

  // Log cuando la página comienza a cargar
  mainWindow.webContents.on('did-start-loading', () => {
    writeLog(`✅ Inicio de carga de página detectado`);
  });

  // Log cuando la página termina de cargar
  mainWindow.webContents.on('did-finish-load', () => {
    writeLog(`✅ Página cargada completamente`);
    console.log("✅ Página cargada completamente");
  });

  // Log si hay error de carga
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    // Ignorar fallos de subframes (iframes de YouTube, etc.) — solo reportar el frame principal
    if (!isMainFrame) return;

    const errorMsg = `❌ Error al cargar página: ${errorDescription} (código: ${errorCode}) - URL: ${validatedURL}`;
    writeLog(errorMsg);
    console.error(errorMsg);

    // -3 = ERR_ABORTED (navegación cancelada, normal); -100 = ERR_CONNECTION_CLOSED (red)
    if (errorCode !== -3) {
      dialog.showErrorBox(
        "Error de Carga",
        `No se pudo cargar la aplicación.\n\nURL: ${validatedURL}\nError: ${errorDescription}\nCódigo: ${errorCode}\n\nLog: ${logFilePath}`
      );
    }
  });

  // ✨ MAXIMIZAR VENTANA CUANDO ESTÉ LISTA
  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  // ✨ ABRIR DEVTOOLS SOLO EN DESARROLLO
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  // ✨ REDIRIGIR CONSOLE.LOG DEL RENDERER A LA TERMINAL
  // Electron 35+: los datos vienen en el objeto del evento (los argumentos
  // posicionales level/message/line están deprecados).
  mainWindow.webContents.on('console-message', (event) => {
    console.log(`[RENDERER] ${event.message}`);
  });

  const menuTemplate = [
    // ✨ MENÚ ARCHIVO - Gestión general de archivos y aplicación
    {
      label: "Archivo",
      submenu: [
        {
          label: "Nuevo",
          submenu: [
            {
              label: "Nuevo Himno",
              accelerator: "CmdOrCtrl+N",
              click: () => {
                if (mainWindow) {
                  mainWindow.webContents.send('navegar-a-ruta', '/agregar-himno');
                  mainWindow.focus();
                }
              },
            },
            { type: "separator" },
            {
              label: "Importar Multimedia",
              click: () => {
                if (mainWindow) {
                  mainWindow.webContents.send('navegar-a-ruta', '/multimedia');
                  mainWindow.focus();
                }
              },
            },
          ],
        },
        { type: "separator" },
        {
          label: "Configuración",
          accelerator: "CmdOrCtrl+,",
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('navegar-a-ruta', '/configuracion');
              mainWindow.focus();
            }
          },
        },
        { type: "separator" },
        {
          label: "Salir",
          accelerator: process.platform === "darwin" ? "Cmd+Q" : "Ctrl+Q",
          click: () => {
            dialog
              .showMessageBox(mainWindow, {
                type: "question",
                buttons: ["Cancelar", "Salir"],
                defaultId: 0,
                title: "Confirmar salida",
                message: "¿Estás seguro de que quieres salir de GloryView?",
                detail: "Todos los cambios no guardados se perderán."
              })
              .then((result) => {
                if (result.response === 1) {
                  if (proyectorWindow) {
                    proyectorWindow.close();
                    proyectorWindow = null;
                  }
                  app.quit();
                }
              });
          },
        },
      ],
    },

    // ✨ MENÚ EDITAR - Necesario para habilitar copiar/pegar en macOS (Cmd+C / Cmd+V)
    {
      label: "Editar",
      submenu: [
        { role: "undo", label: "Deshacer" },
        { role: "redo", label: "Rehacer" },
        { type: "separator" },
        { role: "cut", label: "Cortar" },
        { role: "copy", label: "Copiar" },
        { role: "paste", label: "Pegar" },
        { role: "pasteAndMatchStyle", label: "Pegar y adaptar estilo" },
        { role: "delete", label: "Eliminar" },
        { type: "separator" },
        { role: "selectAll", label: "Seleccionar todo" },
      ],
    },

    // ✨ MENÚ NAVEGACIÓN - Acceso rápido a todas las secciones
    {
      label: "Navegación",
      submenu: [
        {
          label: "Inicio",
          accelerator: "CmdOrCtrl+Home",
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('navegar-a-ruta', '/');
              mainWindow.focus();
            }
          },
        },
        { type: "separator" },
        {
          label: "Himnario Moravo",
          accelerator: "CmdOrCtrl+1",
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('navegar-a-ruta', '/himnos');
              mainWindow.focus();
            }
          },
        },
        {
          label: "Vida Cristiana",
          accelerator: "CmdOrCtrl+2",
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('navegar-a-ruta', '/vida-cristiana');
              mainWindow.focus();
            }
          },
        },
        { type: "separator" },
        {
          label: "Biblia",
          accelerator: "CmdOrCtrl+B",
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('navegar-a-ruta', '/biblia');
              mainWindow.focus();
            }
          },
        },
        {
          label: "Multimedia",
          accelerator: "CmdOrCtrl+M",
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('navegar-a-ruta', '/multimedia');
              mainWindow.focus();
            }
          },
        },
        { type: "separator" },
        {
          label: "Favoritos",
          accelerator: "CmdOrCtrl+F",
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('navegar-a-ruta', '/favoritos');
              mainWindow.focus();
            }
          },
        },
      ],
    },

    // 📱 MENÚ APP MÓVIL - Emparejamiento por QR
    {
      label: "App móvil",
      submenu: [
        {
          label: "Abrir",
          accelerator: "CmdOrCtrl+Shift+M",
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('navegar-a-ruta', '/app-movil');
              mainWindow.focus();
            }
          },
        },
      ],
    },

    // ✨ MENÚ BIBLIA - Navegación bíblica
    {
      label: "Biblia",
      submenu: [
        {
          label: "Buscar Versículo",
          accelerator: "CmdOrCtrl+K",
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('navegar-a-ruta', '/biblia');
              mainWindow.focus();
              // Simular apertura del buscador
              setTimeout(() => {
                mainWindow.webContents.send('abrir-buscador-biblia');
              }, 500);
            }
          },
        },
        { type: "separator" },
        {
          label: "Antiguo Testamento",
          submenu: [
            { label: "Génesis", click: () => navegarLibroBiblia("gen") },
            { label: "Éxodo", click: () => navegarLibroBiblia("exo") },
            { label: "Levítico", click: () => navegarLibroBiblia("lev") },
            { label: "Números", click: () => navegarLibroBiblia("num") },
            { label: "Deuteronomio", click: () => navegarLibroBiblia("deu") },
            { type: "separator" },
            { label: "Salmos", click: () => navegarLibroBiblia("sal") },
            { label: "Proverbios", click: () => navegarLibroBiblia("pro") },
            { label: "Eclesiastés", click: () => navegarLibroBiblia("ecl") },
            { label: "Isaías", click: () => navegarLibroBiblia("isa") },
            { label: "Jeremías", click: () => navegarLibroBiblia("jer") },
          ],
        },
        {
          label: "Nuevo Testamento",
          submenu: [
            { label: "Mateo", click: () => navegarLibroBiblia("mat") },
            { label: "Marcos", click: () => navegarLibroBiblia("mar") },
            { label: "Lucas", click: () => navegarLibroBiblia("luc") },
            { label: "Juan", click: () => navegarLibroBiblia("jua") },
            { type: "separator" },
            { label: "Hechos", click: () => navegarLibroBiblia("hec") },
            { label: "Romanos", click: () => navegarLibroBiblia("rom") },
            { label: "1 Corintios", click: () => navegarLibroBiblia("1co") },
            { label: "2 Corintios", click: () => navegarLibroBiblia("2co") },
            { label: "Gálatas", click: () => navegarLibroBiblia("gal") },
            { label: "Efesios", click: () => navegarLibroBiblia("efe") },
            { type: "separator" },
            { label: "Apocalipsis", click: () => navegarLibroBiblia("apo") },
          ],
        },
        { type: "separator" },
        {
          label: "Textos Favoritos",
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('navegar-a-ruta', '/favoritos');
              mainWindow.focus();
            }
          },
        },
      ],
    },

    // ✨ MENÚ HERRAMIENTAS - Utilidades y gestión
    {
      label: "Herramientas",
      submenu: [
        {
          label: "Gestión de Contenido",
          submenu: [
            {
              label: "Agregar Himno",
              click: () => {
                if (mainWindow) {
                  mainWindow.webContents.send('navegar-a-ruta', '/agregar-himno');
                  mainWindow.focus();
                }
              },
            },
            {
              label: "Gestionar Multimedia",
              click: () => {
                if (mainWindow) {
                  mainWindow.webContents.send('navegar-a-ruta', '/multimedia');
                  mainWindow.focus();
                }
              },
            },
            {
              label: "Presentaciones",
              click: () => {
                if (mainWindow) {
                  mainWindow.webContents.send('navegar-a-ruta', '/presentaciones');
                  mainWindow.focus();
                }
              },
            },
          ],
        },
        { type: "separator" },
        {
          label: "Personalización",
          submenu: [
            {
              label: "Configurar Iglesia",
              click: () => {
                if (mainWindow) {
                  mainWindow.webContents.send('navegar-a-ruta', '/configuracion');
                  mainWindow.focus();
                }
              },
            },
            {
              label: "Gestionar Fondos",
              click: () => {
                if (mainWindow) {
                  mainWindow.webContents.send('navegar-a-ruta', '/gestion-fondos');
                  mainWindow.focus();
                }
              },
            },
          ],
        },
      ],
    },

    // ✨ MENÚ VENTANA - Gestión de ventanas
    {
      label: "Ventana",
      submenu: [
        {
          label: "Minimizar",
          accelerator: "CmdOrCtrl+M",
          role: "minimize",
        },
        {
          label: "Cerrar",
          accelerator: "CmdOrCtrl+W",
          role: "close",
        },
        { type: "separator" },
        {
          label: "Zoom In",
          accelerator: "CmdOrCtrl+Plus",
          click: () => {
            if (mainWindow) {
              const currentZoom = mainWindow.webContents.getZoomLevel();
              mainWindow.webContents.setZoomLevel(currentZoom + 0.5);
            }
          },
        },
        {
          label: "Zoom Out",
          accelerator: "CmdOrCtrl+-",
          click: () => {
            if (mainWindow) {
              const currentZoom = mainWindow.webContents.getZoomLevel();
              mainWindow.webContents.setZoomLevel(currentZoom - 0.5);
            }
          },
        },
        {
          label: "Zoom Normal",
          accelerator: "CmdOrCtrl+0",
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.setZoomLevel(0);
            }
          },
        },
        { type: "separator" },
        {
          label: "Pantalla Completa",
          accelerator: "F11",
          click: () => {
            if (mainWindow) {
              mainWindow.setFullScreen(!mainWindow.isFullScreen());
            }
          },
        },
      ],
    },

    // ✨ MENÚ AYUDA - Soporte e información
    {
      label: "Ayuda",
      submenu: [
        {
          label: "Buscar Actualizaciones...",
          click: () => {
            updateCheckManual = true;
            if (mainWindow) {
              mainWindow.webContents.send('check-updates-manual');
            }
          },
        },
        { type: "separator" },
        {
          label: "Atajos de Teclado",
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "Atajos de Teclado",
              message: "Atajos de Teclado Principales",
              detail: `
🎹 NAVEGACIÓN:
• Ctrl/Cmd + Home: Ir al Inicio
• Ctrl/Cmd + 1: Himnario Moravo
• Ctrl/Cmd + 2: Vida Cristiana
• Ctrl/Cmd + B: Biblia
• Ctrl/Cmd + M: Multimedia
• Ctrl/Cmd + F: Favoritos

📽️ PROYECCIÓN:
• F11: Abrir/Cerrar Proyector
• Escape: Cerrar Proyector
• Ctrl/Cmd + L: Limpiar Pantalla

✨ CREACIÓN:
• Ctrl/Cmd + N: Nuevo Himno
• Ctrl/Cmd + K: Buscar en Biblia

⚙️ GENERAL:
• Ctrl/Cmd + ,: Configuración
• F12: DevTools
• Ctrl/Cmd + R: Recargar
• Ctrl/Cmd + Q: Salir
              `,
            });
          },
        },
        { type: "separator" },
        {
          label: "Contactar Soporte",
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('navegar-a-ruta', '/contactos');
              mainWindow.focus();
            }
          },
        },
        { type: "separator" },
        {
          label: "Acerca de GloryView",
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "Acerca de GloryView",
              message: "GloryView - Sistema de Proyección para Iglesias",
              detail: `
🎵 Versión: 1.0.0
👨‍💻 Desarrollado por: Alfredo Hammer
🏛️ Diseñado para: Iglesias y Congregaciones

✨ CARACTERÍSTICAS:
• Proyección de himnos y versículos bíblicos
• Gestión completa de multimedia
• Presentaciones personalizadas
• Fondos y temas customizables
• Búsqueda avanzada en la Biblia
• Interfaz moderna y fácil de usar

📧 Soporte: coderhammer70@gmail.com
🌐 Web: appshammer.com

© 2025 GloryView. Todos los derechos reservados.
              `,
            });
          },
        },
      ],
    },
  ];

  // ✨ FUNCIÓN AUXILIAR PARA NAVEGACIÓN BÍBLICA
  function navegarLibroBiblia(libroId) {
    if (mainWindow) {
      mainWindow.webContents.send('navegar-a-ruta', '/biblia');
      mainWindow.focus();
      // Enviar evento para seleccionar libro específico
      setTimeout(() => {
        mainWindow.webContents.send('seleccionar-libro-biblia', libroId);
      }, 500);
    }
  }

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  // ✨ IMPORTANTE: Cerrar proyector cuando se cierra la ventana principal
  mainWindow.on('close', () => {
    console.log("🔴 [MAIN] Ventana principal cerrándose, cerrando proyector...");
    if (proyectorWindow && !proyectorWindow.isDestroyed()) {
      proyectorWindow.close();
      proyectorWindow = null;
    }
  });
}

// ✨ CREAR VENTANA DEL PROYECTOR CON CSP
function createProyectorWindow() {
  const displays = screen.getAllDisplays();
  const primaryDisplay = screen.getPrimaryDisplay();
  const externalDisplay = displays.find((d) => d.id !== primaryDisplay.id);
  const soloUnMonitor = displays.length === 1;

  let displayBounds;
  let fullscreen;
  let alwaysOnTop;

  if (externalDisplay) {
    // Dos o más monitores: proyector en pantalla secundaria, pantalla completa
    displayBounds = externalDisplay.bounds;
    fullscreen = true;
    alwaysOnTop = true;
    writeLog("✅ [MAIN] Proyector en pantalla externa (modo presentación)");
  } else {
    // Un solo monitor: ventana flotante redimensionable en la misma pantalla
    const w = Math.round(primaryDisplay.workAreaSize.width * 0.55);
    const h = Math.round(w * 9 / 16);
    const x = primaryDisplay.bounds.x + Math.round((primaryDisplay.workAreaSize.width - w) / 2);
    const y = primaryDisplay.bounds.y + 60;
    displayBounds = { x, y, width: w, height: h };
    fullscreen = false;
    alwaysOnTop = false;
    writeLog("⚠️ [MAIN] Un solo monitor: proyector en ventana flotante");

    // Avisar a la ventana principal para mostrar un banner informativo
    if (mainWindow && !mainWindow.isDestroyed()) {
      setTimeout(() => {
        mainWindow.webContents.send('proyector-modo-unico-monitor');
      }, 500);
    }
  }

  proyectorWindow = new BrowserWindow({
    x: displayBounds.x,
    y: displayBounds.y,
    width: displayBounds.width,
    height: displayBounds.height,
    icon: path.join(obtenerRutaRecursos(), 'assets', 'icon-256.png'),
    fullscreen,
    alwaysOnTop,
    skipTaskbar: soloUnMonitor ? false : true,
    resizable: soloUnMonitor,
    minimizable: soloUnMonitor,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      webSecurity: true,
      contextIsolation: true,
      nodeIntegration: false,
      allowRunningInsecureContent: false,
      sandbox: true,
      // ✨ MEJORAS PARA ALTA CALIDAD
      hardwareAcceleration: true, // Acelerar hardware para mejor rendimiento
      enableBlinkFeatures: 'CSSBackdropFilter', // Mejor soporte para filtros CSS
      experimentalFeatures: false,
      // El proyector nunca tiene el foco (el operador trabaja en mainWindow
      // mientras esta ventana corre sola en la pantalla externa). Sin esto,
      // Chromium throttlea rendering/timers/decodificación de video de
      // ventanas sin foco a los pocos segundos — se ve como que el video de
      // fondo (y cualquier animación) "se traba" tras un rato en uso real,
      // aunque en desarrollo no se note porque uno suele interactuar con
      // esta ventana al probar (lo cual la mantiene con foco).
      backgroundThrottling: false,
    },
    // ✨ CONFIGURACIONES ADICIONALES PARA CALIDAD
    show: false, // No mostrar hasta estar completamente cargado
    backgroundColor: '#000000', // Fondo negro para mejor contraste
  });

  // ✨ APLICAR CSP Y BLOQUEADOR DE ANUNCIOS AL PROYECTOR
  aplicarCSP(proyectorWindow);
  bloquearAnuncios(proyectorWindow);

  proyectorWindow.setMenuBarVisibility(false);

  // ✨ CARGAR URL SEGÚN ENTORNO
  const isDev = !app.isPackaged;
  if (isDev) {
    console.log("🔄 [MAIN] Cargando proyector en modo desarrollo: http://localhost:3000/#/proyector");
    proyectorWindow.loadURL("http://localhost:3000/#/proyector");
  } else {
    console.log("🔄 [MAIN] Cargando proyector en modo producción: http://localhost:3001/#/proyector");
    proyectorWindow.loadURL("http://localhost:3001/#/proyector");
  }

  // ✨ MOSTRAR VENTANA SOLO CUANDO ESTÉ COMPLETAMENTE CARGADA PARA MEJOR CALIDAD
  proyectorWindow.webContents.once('did-finish-load', () => {
    console.log("✅ [MAIN] Proyector cargado, mostrando ventana");
    proyectorWindow.show();
    proyectorWindow.focus();

    // ✨ Enviar información sobre monitores al proyector
    const numMonitores = screen.getAllDisplays().length;
    proyectorWindow.webContents.send("configurar-monitores", {
      tieneMultiplesMonitores: numMonitores > 1,
      numeroMonitores: numMonitores
    });
    console.log(`📺 [MAIN] Enviando info de monitores: ${numMonitores} monitor(es)`);

    // ✨ Dar tiempo para que React monte los componentes antes de enviar eventos
    setTimeout(() => {
      console.log("✅ [MAIN] Proyector listo para recibir eventos IPC");
    }, 1000);    // ✨ FORZAR APERTURA DE DEVTOOLS PARA DEBUGGING CON DELAY (DESHABILITADO)
    setTimeout(() => {
      try {
        console.log("🔧 [MAIN] DevTools del proyector deshabilitado para producción");
        // proyectorWindow.webContents.openDevTools({
        //   mode: 'detach',
        //   activate: true
        // });
        // console.log("✅ [MAIN] DevTools del proyector abierto");

        // Hacer que DevTools aparezca al frente después de un momento
        setTimeout(() => {
          const devTools = proyectorWindow.webContents.devToolsWebContents;
          if (devTools) {
            devTools.focus();
            console.log("🔧 [MAIN] DevTools del proyector enfocado");
          }
        }, 1000);

      } catch (error) {
        console.error("❌ [MAIN] Error abriendo DevTools del proyector:", error);
      }
    }, 2000); // Esperar 2 segundos para que la ventana se cargue completamente

    // ✨ OPTIMIZACIONES ADICIONALES PARA CALIDAD
    proyectorWindow.webContents.executeJavaScript(`
      // Deshabilitar suavizado de imágenes para texto más nítido
      document.body.style.imageRendering = 'crisp-edges';
      document.body.style.textRendering = 'optimizeLegibility';
      document.body.style.fontSmooth = 'always';
      document.body.style.webkitFontSmoothing = 'antialiased';
      document.body.style.mozOsxFontSmoothing = 'grayscale';
      
      // Optimizar rendering
      document.body.style.backfaceVisibility = 'hidden';
      document.body.style.perspective = '1000px';
      
      console.log("✅ [Proyector] Optimizaciones de calidad aplicadas");
    `);
  });

  proyectorWindow.on("closed", () => {
    console.log("🔄 [MAIN] La ventana del proyector se cerró");
    proyectorWindow = null;
  });

  return proyectorWindow;
}

// ═══════════════════════════════════════════════════════════════════
// ✨ SISTEMA DE ACTUALIZACIONES AUTOMÁTICAS
// ═══════════════════════════════════════════════════════════════════

// Configurar autoUpdater
autoUpdater.autoDownload = false; // No descargar automáticamente, preguntar primero
autoUpdater.autoInstallOnAppQuit = true; // Instalar al cerrar la app

// true = verificación pedida manualmente por el usuario
let updateCheckManual = false;
// true = descarga en curso (errores siempre se muestran durante descarga)
let isDownloading = false;
// setters porque son primitivos (no se pueden inyectar "por referencia" como
// timerEstadoServidor) — los usan los handlers IPC de ipc/sistema.js; las
// lecturas siguen siendo directas acá abajo, en los listeners de autoUpdater.
const setUpdateCheckManual = (v) => { updateCheckManual = v; };
const setIsDownloadingUpdate = (v) => { isDownloading = v; };

// Eventos del autoUpdater
autoUpdater.on('checking-for-update', () => {
  writeLog('🔍 Verificando actualizaciones...');
  if (mainWindow && updateCheckManual) {
    mainWindow.webContents.send('update-checking');
  }
});

autoUpdater.on('update-available', (info) => {
  writeLog(`✅ Nueva actualización disponible: v${info.version}`);
  if (mainWindow) {
    const fileSize = info.files?.[0]?.size ?? null;
    mainWindow.webContents.send('update-available', {
      version: info.version,
      releaseNotes: info.releaseNotes,
      releaseDate: info.releaseDate,
      fileSize,
    });
  }
  updateCheckManual = false;
});

autoUpdater.on('update-not-available', (info) => {
  writeLog('ℹ️ No hay actualizaciones disponibles');
  if (mainWindow && updateCheckManual) {
    mainWindow.webContents.send('update-not-available', info);
  }
  updateCheckManual = false;
});

autoUpdater.on('error', (err) => {
  const errorMsg = `❌ Error en autoUpdater: ${err.message}`;
  writeLog(errorMsg);
  // Mostrar al usuario si: verificación manual O durante descarga activa
  if (mainWindow && (updateCheckManual || isDownloading)) {
    mainWindow.webContents.send('update-error', { message: err.message });
  }
  updateCheckManual = false;
  isDownloading = false;
});

autoUpdater.on('download-progress', (progressObj) => {
  writeLog(`📥 Descargando: ${Math.round(progressObj.percent)}% (${Math.round(progressObj.bytesPerSecond / 1024)}KB/s)`);
  if (mainWindow) {
    mainWindow.webContents.send('update-download-progress', {
      percent: progressObj.percent,
      transferred: progressObj.transferred,
      total: progressObj.total,
      bytesPerSecond: progressObj.bytesPerSecond,
    });
  }
});

autoUpdater.on('update-downloaded', (info) => {
  writeLog(`✅ Actualización descargada: v${info.version}`);
  isDownloading = false;
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded', {
      version: info.version,
      releaseNotes: info.releaseNotes,
    });
  }
});

// --- App Ready ---
app.whenReady().then(async () => {
  try {
    writeLog("✅ Electron app ready - Iniciando GloryView");

    // ✨ CONFIGURAR NOMBRE DE LA APLICACIÓN
    app.setName('GloryView');
    writeLog("✅ Nombre de aplicación configurado");

    // La base de datos (db.js) ya se inicializa de forma síncrona al cargar el módulo
    // (conexión, tablas, migraciones y datos por defecto) — nada que esperar aquí.
    writeLog('✅ Base de datos inicializada correctamente');
    console.log('Base de datos inicializada correctamente');

    // ✨ INICIALIZAR FONDOS POR DEFECTO
    try {
      writeLog("Inicializando fondos por defecto...");
      inicializarFondosPorDefecto();
      writeLog('✅ Fondos por defecto inicializados');
      console.log('✅ Fondos por defecto inicializados');
    } catch (error) {
      writeLog(`❌ Error al inicializar fondos por defecto: ${error.message}`);
      console.error('❌ Error al inicializar fondos por defecto:', error);
      // No bloquear la app, continuar
    }

    // ✨ INICIALIZAR FONDOS ANIMADOS POR DEFECTO (independiente, no toca los de arriba)
    try {
      inicializarFondosAnimadosPorDefecto();
      writeLog('✅ Fondos animados por defecto inicializados');
    } catch (error) {
      writeLog(`❌ Error al inicializar fondos animados por defecto: ${error.message}`);
      console.error('❌ Error al inicializar fondos animados por defecto:', error);
    }

    // ✨ LIMPIAR HANDLERS ANTES DE CREAR VENTANAS
    try {
      writeLog("Limpiando handlers IPC...");
      limpiarHandlers();
      writeLog("✅ Handlers limpiados");
    } catch (error) {
      writeLog(`❌ Error limpiando handlers: ${error.message}`);
      console.error("Error limpiando handlers:", error);
    }

    // ✨ VERIFICAR ARCHIVOS ESENCIALES DEL BUILD EN PRODUCCIÓN
    if (app.isPackaged) {
      try {
        writeLog("Verificando integridad de archivos del build...");
        const buildDir = path.join(obtenerRutaRecursos(), "build");
        const indexPath = path.join(buildDir, "index.html");
        const manifestPath = path.join(buildDir, "manifest.json");

        writeLog(`Build directory: ${buildDir}`);
        writeLog(`Verificando index.html en: ${indexPath}`);

        if (!fs.existsSync(buildDir)) {
          throw new Error(`Directorio build no encontrado: ${buildDir}`);
        }

        if (!fs.existsSync(indexPath)) {
          throw new Error(`index.html no encontrado en: ${indexPath}`);
        }

        // Listar archivos en build para diagnóstico
        const buildFiles = fs.readdirSync(buildDir);
        writeLog(`Archivos en build: ${buildFiles.join(', ')}`);

        writeLog("✅ Archivos esenciales del build verificados correctamente");
      } catch (error) {
        writeLog(`❌ ERROR CRÍTICO: Archivos del build no encontrados: ${error.message}`);
        console.error("ERROR CRÍTICO: Archivos del build no encontrados:", error);
        dialog.showErrorBox(
          "Error Crítico - Archivos Faltantes",
          `La aplicación no puede iniciar porque faltan archivos esenciales:\n\n${error.message}\n\nPor favor, reinstale la aplicación.\n\nLog: ${logFilePath}`
        );
        app.quit();
        return;
      }
    }

    // ✨ REGISTRAR TODOS LOS HANDLERS DESPUÉS DE LIMPIAR
    try {
      writeLog("Registrando handlers IPC...");
      registrarHandlers();
      writeLog("✅ Handlers registrados");
    } catch (error) {
      writeLog(`❌ Error registrando handlers: ${error.message}`);
      console.error("Error registrando handlers:", error);
      dialog.showErrorBox(
        "Error Crítico - GloryView",
        `No se pudieron registrar los handlers IPC:\n\n${error.message}\n\nLa aplicación puede no funcionar correctamente.`
      );
    }

    // ====================================
    // HANDLERS: ORDENES DE SERVICIO
    // (registrados aquí para garantizar que siempre se cargan)
    // ====================================
    const safeHandle = (channel, fn) => {
      try { ipcMain.removeHandler(channel); } catch { }
      ipcMain.handle(channel, fn);
    };
    safeHandle("obtener-ordenes-servicio", () => { try { return obtenerOrdenesServicio(); } catch (e) { console.error(e); return []; } });
    safeHandle("obtener-orden-servicio", (_, id) => { try { return obtenerOrdenServicioPorId(id); } catch (e) { return null; } });
    safeHandle("agregar-orden-servicio", (_, data) => { try { return agregarOrdenServicio(data); } catch (e) { return { success: false, error: e.message }; } });
    safeHandle("actualizar-orden-servicio", (_, data) => { try { return actualizarOrdenServicio(data); } catch (e) { return { success: false, error: e.message }; } });
    safeHandle("eliminar-orden-servicio", (_, id) => { try { return eliminarOrdenServicio(id); } catch (e) { return { success: false, error: e.message }; } });
    // ====================================
    // HANDLERS: ANUNCIOS
    // ====================================
    safeHandle("obtener-anuncios", () => { try { return obtenerAnuncios(); } catch (e) { return []; } });
    safeHandle("agregar-anuncio", (_, data) => { try { return agregarAnuncio(data); } catch (e) { return { success: false, error: e.message }; } });
    safeHandle("actualizar-anuncio", (_, data) => { try { return actualizarAnuncio(data); } catch (e) { return { success: false, error: e.message }; } });
    safeHandle("eliminar-anuncio", (_, id) => { try { return eliminarAnuncio(id); } catch (e) { return { success: false, error: e.message }; } });
    safeHandle("reordenar-anuncios", (_, ids) => { try { return reordenarAnuncios(ids); } catch (e) { return { success: false, error: e.message }; } });

    // ====================================
    // HANDLERS: TERCIO INFERIOR (lower third para OBS)
    // ====================================
    safeHandle("obtener-oradores", () => { try { return obtenerOradores(); } catch (e) { return []; } });
    safeHandle("agregar-orador", (_, data) => { try { return agregarOrador(data); } catch (e) { return { success: false, error: e.message }; } });
    safeHandle("actualizar-orador", (_, data) => { try { return actualizarOrador(data); } catch (e) { return { success: false, error: e.message }; } });
    safeHandle("eliminar-orador", (_, id) => { try { return eliminarOrador(id); } catch (e) { return { success: false, error: e.message }; } });
    // Mostrar/ocultar y actualizar texto del tercio inferior en el overlay
    // de OBS. No pasa por el proyector ni por obsEstado.tipo — es una capa
    // independiente (ver actualizarTercioInferior() y obsEstado arriba).
    safeHandle("mostrar-tercio-inferior", (_, { nombre, cargo, tema, plantilla, diseno, duracionEntrada, duracionSalida, autoOcultarMs }) => {
      try {
        actualizarTercioInferior({
          activo: true,
          nombre: nombre || '',
          cargo: cargo || '',
          tema: tema || '',
          ...(plantilla ? { plantilla } : {}),
          ...(diseno && TERCIO_DISENOS[diseno] ? { diseno } : {}),
          ...(duracionEntrada ? { duracionEntrada } : {}),
          ...(duracionSalida ? { duracionSalida } : {}),
        });
        programarAutoOcultarTercio(autoOcultarMs);
        return { success: true };
      } catch (e) { return { success: false, error: e.message }; }
    });
    safeHandle("cambiar-plantilla-tercio-inferior", (_, plantilla) => {
      try {
        actualizarTercioInferior({ plantilla });
        return { success: true };
      } catch (e) { return { success: false, error: e.message }; }
    });
    safeHandle("cambiar-diseno-tercio-inferior", (_, diseno) => {
      try {
        if (!TERCIO_DISENOS[diseno]) return { success: false, error: 'Diseño no válido' };
        actualizarTercioInferior({ diseno });
        return { success: true };
      } catch (e) { return { success: false, error: e.message }; }
    });
    safeHandle("ocultar-tercio-inferior", () => {
      try {
        cancelarAutoOcultarTercio();
        actualizarTercioInferior({ activo: false });
        return { success: true };
      } catch (e) { return { success: false, error: e.message }; }
    });

    // ====================================
    // HANDLERS: PRESENTACIONES (secuencias de imágenes navegables)
    // ====================================
    safeHandle("seleccionar-imagenes", async () => {
      try {
        const result = await dialog.showOpenDialog({
          title: "Seleccionar imágenes",
          properties: ["openFile", "multiSelections"],
          filters: [
            { name: "Imágenes", extensions: ["jpg", "jpeg", "png", "gif", "bmp", "webp"] },
          ],
        });
        if (result.canceled || result.filePaths.length === 0) {
          return { success: false, canceled: true };
        }
        return { success: true, filePaths: result.filePaths };
      } catch (e) {
        return { success: false, error: e.message };
      }
    });
    // Copia las imágenes al disco para una Diapositiva SIN registrarlas en la
    // tabla `multimedia` — antes reusaba el pipeline de Multimedia entero y
    // las imágenes terminaban apareciendo también en esa sección.
    safeHandle("procesar-imagenes-diapositiva", async (_, filePaths) => {
      try {
        const multimediaDir = path.join(obtenerRutaBase(), "public", "multimedia");
        if (!fs.existsSync(multimediaDir)) {
          fs.mkdirSync(multimediaDir, { recursive: true });
        }

        const extensionesImagen = new Set(['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']);
        const resultados = [];

        for (const filePath of filePaths || []) {
          try {
            const fileName = path.basename(filePath);
            const extension = path.extname(filePath).toLowerCase();
            if (!extensionesImagen.has(extension)) {
              throw new Error(`Tipo de archivo no soportado: ${extension}`);
            }

            const nombreSinExtension = path.basename(filePath, extension);
            const nombreOriginal = nombreSinExtension.replace(/[^a-zA-Z0-9.-]/g, '_');
            const nombreUnico = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}-${nombreOriginal}${extension}`;
            const rutaDestino = path.join(multimediaDir, nombreUnico);

            fs.copyFileSync(filePath, rutaDestino);

            resultados.push({
              success: true,
              nombre: fileName,
              tipo: 'imagen',
              url: `/multimedia/${nombreUnico}`,
            });
          } catch (e) {
            resultados.push({ success: false, nombre: path.basename(filePath), error: e.message });
          }
        }

        return { success: true, resultados };
      } catch (e) {
        return { success: false, error: e.message };
      }
    });
    // Importar PDF en Diapositivas: el renderer dibuja cada página con pdf.js y
    // manda los bytes de la imagen (JPEG o PNG). Acá solo se valida y se guarda.
    safeHandle("guardar-imagen-diapositiva", async (_, nombre, bytes) => {
      try {
        const buffer = Buffer.from(bytes || []);
        if (buffer.length === 0 || buffer.length > 25 * 1024 * 1024) {
          throw new Error("Imagen vacía o demasiado grande");
        }
        const esJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
        const esPng = buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
        if (!esJpeg && !esPng) throw new Error("Formato de imagen no válido");

        const multimediaDir = path.join(obtenerRutaBase(), "public", "multimedia");
        fs.mkdirSync(multimediaDir, { recursive: true });
        const extension = esJpeg ? ".jpg" : ".png";
        const base = String(nombre || "diapositiva").replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9.-]/g, "_").slice(0, 80);
        const nombreUnico = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}-${base}${extension}`;
        fs.writeFileSync(path.join(multimediaDir, nombreUnico), buffer);
        return { success: true, nombre: `${base}${extension}`, tipo: "imagen", url: `/multimedia/${nombreUnico}` };
      } catch (e) {
        return { success: false, error: e.message };
      }
    });
    safeHandle("obtener-presentaciones", () => { try { return obtenerPresentaciones(); } catch (e) { return []; } });
    safeHandle("agregar-presentacion", (_, data) => { try { return agregarPresentacion(data); } catch (e) { return { success: false, error: e.message }; } });
    safeHandle("actualizar-presentacion", (_, data) => { try { return actualizarPresentacion(data); } catch (e) { return { success: false, error: e.message }; } });
    safeHandle("eliminar-presentacion", (_, id) => { try { return eliminarPresentacion(id); } catch (e) { return { success: false, error: e.message }; } });
    // El control de Diapositivas.jsx (clics/teclado en la compu) avisa acá
    // cuál diapositiva quedó en pantalla, para que la app móvil sepa el
    // estado real al abrir el módulo o al usar sus propios botones ◀▶.
    safeHandle("actualizar-diapositiva-activa", (_, data) => {
      diapositivaActiva = data && data.presentacionId != null ? data : null;
      return true;
    });
    console.log("✅ [Main] Handlers de órdenes y anuncios registrados");

    // ✨ INICIAR SERVIDOR DE MULTIMEDIA PRIMERO (ANTES DE CREAR VENTANAS EN PRODUCCIÓN)
    // Liberar puerto 3001 si hay una instancia anterior colgada antes de iniciar
    writeLog("Iniciando servidor Express en puerto 3001...");

    const iniciarServidorYVentanas = async () => {
      try {
        // En Windows, intentar liberar el puerto primero
        if (process.platform === 'win32') {
          const { exec } = require('child_process');
          writeLog("Windows detectado - intentando liberar puerto 3001...");
          await new Promise((resolve) => {
            exec(`FOR /F "tokens=5" %P IN ('netstat -ano ^| findstr :3001') DO taskkill /PID %P /F`, () => {
              // Ignorar errores (si no hay proceso ocupando el puerto, el comando falla normalmente)
              setTimeout(resolve, 500);
            });
          });
        }

        // Iniciar servidor Express
        await iniciarServidorMultimedia();
        writeLog("✅ Servidor Express iniciado");

        // Esperar 2 segundos adicionales para asegurar que el servidor esté completamente listo
        await new Promise(resolve => setTimeout(resolve, 2000));
        writeLog("✅ Servidor Express completamente listo");

        // Ahora sí, crear las ventanas
        try {
          writeLog("Creando ventana principal...");
          createMainWindow();
          writeLog("✅ Ventana principal creada");
        } catch (error) {
          writeLog(`❌ ERROR CRÍTICO creando ventana principal: ${error.message}\n${error.stack}`);
          console.error("ERROR CRÍTICO:", error);
          dialog.showErrorBox(
            "Error Crítico - GloryView",
            `No se pudo crear la ventana principal:\n\n${error.message}\n\nRevise el archivo de log en:\n${logFilePath}`
          );
          app.quit();
          return;
        }

        // ✨ Solo crear proyector automáticamente si hay segunda pantalla
        try {
          const displays = screen.getAllDisplays();
          const externalDisplay = displays.find((d) => d.bounds.x !== 0 || d.bounds.y !== 0);

          if (externalDisplay) {
            writeLog("✅ Segunda pantalla detectada, creando proyector automáticamente");
            console.log("✅ [MAIN] Segunda pantalla detectada, creando proyector automáticamente");
            createProyectorWindow();
          } else {
            writeLog("⚠️ Solo una pantalla detectada, proyector se creará manualmente");
            console.log("⚠️ [MAIN] Solo una pantalla detectada, proyector se creará manualmente");
          }
        } catch (error) {
          writeLog(`⚠️ Error verificando pantallas: ${error.message}`);
          console.warn("Error verificando pantallas:", error);
          // No es crítico, continuar
        }

        // ✨ Verificar actualizaciones automáticamente (solo en producción)
        if (app.isPackaged) {
          setTimeout(() => {
            try {
              writeLog('🔍 Verificando actualizaciones automáticamente...');
              autoUpdater.checkForUpdates();
            } catch (error) {
              writeLog(`⚠️ Error verificando actualizaciones: ${error.message}`);
            }
          }, 5000); // Esperar 5 segundos después de que la ventana esté lista
        } else {
          writeLog('ℹ️ Actualizaciones automáticas deshabilitadas en modo desarrollo');
        }

      } catch (error) {
        writeLog(`❌ Error fatal en iniciarServidorYVentanas: ${error.message}`);
        console.error("Error fatal en iniciarServidorYVentanas:", error);
        dialog.showErrorBox(
          "Error Fatal - GloryView",
          `No se pudo iniciar el servidor Express:\n\n${error.message}\n\nLa aplicación no puede funcionar sin el servidor.`
        );
        app.quit();
      }
    };

    // Llamar a la función async
    await iniciarServidorYVentanas();

    // ✨ AGREGAR ATAJO PARA DEVTOOLS
    globalShortcut.register('F12', () => {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) {
        focusedWindow.webContents.toggleDevTools();
      }
    });

    // También puedes usar Ctrl+Shift+I
    globalShortcut.register('CommandOrControl+Shift+I', () => {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) {
        focusedWindow.webContents.toggleDevTools();
      }
    });

    // ✨ ATAJO ESPECÍFICO PARA CONSOLA DEL PROYECTOR
    globalShortcut.register('CommandOrControl+Shift+P', () => {
      console.log("🔧 [MAIN] Atajo para consola del proyector activado");
      if (proyectorWindow && !proyectorWindow.isDestroyed()) {
        console.log("🔧 [MAIN] Abriendo/cerrando DevTools del proyector...");
        proyectorWindow.webContents.toggleDevTools();
        proyectorWindow.focus();

        // Si se está abriendo, enfocar después de un momento
        setTimeout(() => {
          const devTools = proyectorWindow.webContents.devToolsWebContents;
          if (devTools) {
            devTools.focus();
            console.log("✅ [MAIN] DevTools del proyector enfocado");
          }
        }, 500);
      } else {
        console.log("⚠️ [MAIN] Proyector no disponible para abrir DevTools");
      }
    });

    writeLog("✅ GloryView iniciado exitosamente");

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
        // No crear proyector automáticamente en activate
      }
    });

  } catch (error) {
    // ✨ CAPTURA DE ERRORES GLOBAL DEL APP.WHENREADY
    const errorMsg = `❌ ERROR FATAL en app.whenReady(): ${error.message}\n${error.stack}`;
    writeLog(errorMsg);
    console.error(errorMsg);

    dialog.showErrorBox(
      "Error Fatal - GloryView",
      `La aplicación no pudo iniciar correctamente:\n\n${error.message}\n\nDetalles en:\n${logFilePath}\n\nPresione OK para cerrar.`
    );

    app.quit();
  }
});

// ✨ Cerrar proyector cuando se cierra la ventana principal
app.on("window-all-closed", () => {
  console.log("🚪 [MAIN] Todas las ventanas cerradas");

  // ✨ IMPORTANTE: Cerrar el proyector si existe
  if (proyectorWindow && !proyectorWindow.isDestroyed()) {
    console.log("🔴 [MAIN] Cerrando ventana del proyector");
    proyectorWindow.close();
    proyectorWindow = null;
  }

  if (process.platform !== "darwin") {
    // En Windows/Linux la app termina aquí — cerrar la DB antes de salir
    cerrarDB();
    console.log("👋 [MAIN] Saliendo de la aplicación");
    app.quit();
  }
  // En macOS la app sigue viva en el dock → no cerrar la DB
});

app.on("before-quit", () => {
  console.log("⚠️ [MAIN] before-quit: Cerrando proyector y base de datos");
  if (proyectorWindow && !proyectorWindow.isDestroyed()) {
    proyectorWindow.close();
    proyectorWindow = null;
  }
  cerrarDB();
});

// ✨ FUNCIÓN COMPLETA PARA REGISTRAR TODOS LOS HANDLERS
function registrarHandlers() {
  console.log("🔧 [Main] Registrando handlers...");

  // ====================================
  // HANDLERS DE BIBLIA
  // ====================================
  require("./ipc/biblia").registrar({
    getMainWindow: () => mainWindow,
  });

  // ====================================
  // HANDLERS DE FONDOS
  // ====================================
  require("./ipc/fondos").registrar({
    getMainWindow: () => mainWindow,
    obtenerRutaBase,
    obtenerRutaRecursos,
    fondosPublicDir,
    sincronizarFondoObs,
  });

  // ====================================
  // HANDLERS DE CONTROL DEL PROYECTOR (proyectar himno/versículo/multimedia,
  // abrir/cerrar ventana, fondos, controles remotos, OBS)
  // ====================================
  require("./ipc/proyectorControl").registrar({
    getProyectorWindow: () => proyectorWindow,
    setProyectorWindow,
    createProyectorWindow,
    actualizarObs,
    sincronizarFondoObs,
    timerEstaProyectando,
    timerRestaurarEnProyector,
    multimediaPlaybackStatus,
  });

  // ====================================
  // MODO LEJOS: partes de un texto dividido por el proyector
  // ====================================
  require("./ipc/partesProyector").registrar({
    getProyectorWindow: () => proyectorWindow,
    getMainWindow: () => mainWindow,
  });

  // ====================================
  // ✨ HANDLERS DE MULTIMEDIA (activa, CRUD, archivos)
  // ====================================
  require("./ipc/multimedia").registrar({ obtenerRutaBase, actualizarObs });

  ipcMain.on("debug-log", (_event, payload) => {
    try {
      console.warn("🧪 [Renderer]", payload?.message || "(sin mensaje)", payload);
    } catch (error) {
      console.warn("🧪 [Renderer] (error imprimiendo debug-log)", error);
    }
  });

  // ====================================
  // HANDLERS DE HIMNOS
  // ====================================
  require("./ipc/himnos").registrar();

  // ====================================
  // HANDLERS DEL TEMPORIZADOR (DESKTOP)
  // El timer corre en main process para persistir entre navegaciones.
  // El estado (timerEstadoServidor) y sus helpers se quedan en main.js
  // porque las rutas Express de la app móvil también los usan.
  // ====================================
  require("./ipc/timer").registrar({
    getProyectorWindow: () => proyectorWindow,
    createProyectorWindow,
    actualizarObs,
    timerEstadoServidor,
    timerGetData,
    timerIniciarIntervalServidor,
    timerDetenerIntervalServidor,
    timerEnviarAlProyector,
    timerNotificarDesktop,
  });

  // ====================================
  // HANDLERS DE CONFIGURACIÓN
  // ====================================
  require("./ipc/configuracion").registrar();

  // ====================================
  // HANDLERS DE SISTEMA (updates, logo, enlace externo, info de la app,
  // zoom, fullscreen)
  // ====================================
  require("./ipc/sistema").registrar({
    writeLog,
    obtenerRutaBase,
    getMainWindow: () => mainWindow,
    setUpdateCheckManual,
    setIsDownloadingUpdate,
  });

  // ====================================
  // HANDLERS DE RESPALDO Y RESTAURACIÓN
  // ====================================
  require("./ipc/backup").registrar({
    writeLog,
    obtenerRutaBase,
    getMainWindow: () => mainWindow,
    getProyectorWindow: () => proyectorWindow,
    dbPath,
    cerrarDB,
    reabrirDB,
  });

  console.log("✅ [Main] Todos los handlers registrados exitosamente");
}