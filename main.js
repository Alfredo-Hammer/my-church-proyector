// ✨ IMPORTACIONES PRIMERO
const { app, BrowserWindow, ipcMain, screen, Menu, dialog, shell, globalShortcut } = require("electron");
const path = require("path");
const fs = require("fs");

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
      "Error Crítico - GloryView Proyector",
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
const { spawn, spawnSync } = require("child_process");
const express = require("express");
const cors = require("cors");
const https = require("https");
const http = require("http");
const QRCode = require("qrcode");

let FFMPEG_BIN = "ffmpeg";
try {
  // `ffmpeg-static` expone la ruta completa al binario.
  const maybe = require("ffmpeg-static");
  if (maybe && typeof maybe === "string") {
    FFMPEG_BIN = maybe;
  }
} catch {
  // Si no está instalado, usamos ffmpeg del sistema (si existe).
}
// Importar la nueva base de datos
const dbNew = require("./db-new");

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

// ==================================================
// Bridge: Express -> Renderer (Biblia preview)
// ==================================================
const pendingBibliaPreview = new Map();
let bibliaPreviewListenerRegistered = false;

// Importar funciones específicas que aún se necesitan de la base de datos antigua
const {
  // Funciones de fondos que aún se usan
  agregarFondo,
  obtenerFondos,
  eliminarFondo,
  establecerFondoActivo,
  obtenerFondoActivo,
  inicializarFondosPorDefecto,

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

  // Funciones de presentaciones slides
  agregarPresentacionSlides,
  obtenerPresentacionesSlides,
  obtenerPresentacionSlidesPorId,
  actualizarPresentacionSlides,
  eliminarPresentacionSlides,
  duplicarPresentacionSlides,
  actualizarFavoritoPresentacionSlides,
  actualizarSlideActualPresentacion,
  exportarPresentacionSlides,
  importarPresentacionSlides,
  obtenerEstadisticasPresentacionesSlides,
} = require("./db");

// Crear aliases para las funciones de presentaciones de la nueva base de datos
const agregarPresentacion = dbNew.agregarPresentacion;
const obtenerPresentaciones = dbNew.obtenerPresentaciones;
const eliminarPresentacion = dbNew.eliminarPresentacion;
const editarPresentacion = dbNew.editarPresentacion;

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
  // Para recursos estáticos (build, assets) siempre usar __dirname
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
    ipcMain.removeHandler("proyectar-slide");
    ipcMain.removeHandler("limpiar-proyector");

    // ✨ PowerPoint (conversión fiel a imágenes)
    ipcMain.removeHandler("convertir-pptx-a-imagenes");
    ipcMain.removeHandler("convertir-pptx-buffer-a-imagenes");

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

// ==================================================
// PowerPoint -> Imágenes (preserva diseño)
// ==================================================
function encontrarLibreOfficeBin() {
  // Importante: NO devolver "soffice" sin comprobar.
  // En apps GUI de macOS el PATH suele ser limitado y `spawn('soffice')` puede quedarse fallando.
  const candidatosAbsolutos = [
    "/Applications/LibreOffice.app/Contents/MacOS/soffice",
    "/Applications/LibreOffice.app/Contents/MacOS/soffice.bin",

    // Homebrew (Apple Silicon / Intel)
    "/opt/homebrew/bin/soffice",
    "/usr/local/bin/soffice",
  ];

  for (const candidato of candidatosAbsolutos) {
    try {
      if (fs.existsSync(candidato)) return candidato;
    } catch {
      // ignorar
    }
  }

  // Intentar resolver por PATH
  try {
    const res = spawnSync("which", ["soffice"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const salida = String(res.stdout || "").trim();
    const candidato = salida.split("\n").map((s) => s.trim()).filter(Boolean)[0];
    if (res.status === 0 && candidato && fs.existsSync(candidato)) {
      return candidato;
    }
  } catch {
    // ignorar
  }

  return null;
}

function spawnConPromise(cmd, args, opts = {}) {
  const timeoutMs = Number.isFinite(opts.timeoutMs) ? opts.timeoutMs : 120000;
  const cwd = opts.cwd || undefined;

  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      try {
        child.kill("SIGKILL");
      } catch {
        // ignore
      }
      reject(new Error(`Timeout ejecutando ${cmd}`));
    }, timeoutMs);

    child.stdout.on("data", (d) => {
      stdout += String(d);
    });
    child.stderr.on("data", (d) => {
      stderr += String(d);
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve({ code, stdout, stderr });
      } else {
        const msg = (stderr || stdout || "").trim();
        reject(new Error(msg || `Proceso ${cmd} terminó con código ${code}`));
      }
    });
  });
}

function ordenarPngPorSlide(files) {
  // Orden natural por sufijo numérico si existe.
  const parse = (name) => {
    const m = String(name).match(/(\d+)(?=\.png$)/i);
    return m ? Number(m[1]) : Number.POSITIVE_INFINITY;
  };

  return [...files].sort((a, b) => {
    const na = parse(a);
    const nb = parse(b);
    if (na !== nb) return na - nb;
    return String(a).localeCompare(String(b));
  });
}

async function convertirPptxAImagenesEnDirectorio({ libreOfficeBin, sourcePath, outDir }) {
  const args = [
    "--headless",
    "--nologo",
    "--nolockcheck",
    "--nodefault",
    "--norestore",
    "--convert-to",
    "png",
    "--outdir",
    outDir,
    sourcePath,
  ];

  await spawnConPromise(libreOfficeBin, args, { timeoutMs: 120000 });

  const archivos = fs
    .readdirSync(outDir)
    .filter((f) => String(f).toLowerCase().endsWith(".png"));

  return ordenarPngPorSlide(archivos);
}

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
    // PRODUCCIÓN: sin 'unsafe-eval' (bundles webpack no usan eval)
    // NOTA: 'unsafe-inline' se mantiene en script-src porque TinyMCE/Quill inyectan scripts inline
    return "default-src 'self' http://localhost:3001 https://*.youtube.com https://*.google.com; " +
      "script-src 'self' 'unsafe-inline' https://*.youtube.com https://*.ytimg.com https://*.googlevideo.com https://*.google.com https://www.google.com https://*.ggpht.com https://*.doubleclick.net https://*.gstatic.com; " +
      "style-src 'self' 'unsafe-inline' https://*.youtube.com https://*.ytimg.com https://*.google.com https://*.ggpht.com https://*.gstatic.com; " +
      "img-src 'self' data: blob: file: http://localhost:3001 https://*.youtube.com https://*.ytimg.com https://*.googlevideo.com https://*.google.com https://*.ggpht.com https://*.gstatic.com https://pixabay.com https://*.pixabay.com; " +
      "media-src 'self' data: blob: file: http://localhost:3001 https://*.youtube.com https://*.ytimg.com https://*.googlevideo.com https://*.ggpht.com https://pixabay.com https://*.pixabay.com blob:; " +
      "font-src 'self' data: https://*.youtube.com https://*.ytimg.com https://*.gstatic.com; " +
      "connect-src 'self' http://localhost:3001 https://*.youtube.com https://*.ytimg.com https://*.googlevideo.com https://*.google.com https://*.ggpht.com https://*.doubleclick.net https://*.gstatic.com https://pixabay.com https://*.pixabay.com; " +
      "frame-src 'self' https://*.youtube.com https://www.youtube.com https://youtube.com https://*.google.com;";
  }
}


// ✨ FUNCIÓN HELPER PARA APLICAR CSP
function aplicarCSP(ventana) {
  ventana.webContents.session.webRequest.onHeadersReceived((details, callback) => {
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

// ✨ CREAR SERVIDOR PARA ARCHIVOS MULTIMEDIA
function iniciarServidorMultimedia() {
  const expressApp = express();
  const PORT = 3001;

  if (!bibliaPreviewListenerRegistered) {
    bibliaPreviewListenerRegistered = true;
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
  }

  const solicitarBibliaPreviewAlRenderer = ({ libroId, capitulo, versiculo }) => {
    return new Promise((resolve, reject) => {
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
  };

  const obtenerIpsLocalesV4 = () => {
    const nets = os.networkInterfaces();
    const ips = [];

    for (const nombre of Object.keys(nets || {})) {
      for (const net of nets[nombre] || []) {
        const family = typeof net.family === 'string' ? net.family : String(net.family);
        const isV4 = family === 'IPv4' || family === '4';
        if (!isV4) continue;
        if (net.internal) continue;
        if (!net.address) continue;
        ips.push(net.address);
      }
    }

    const uniqueIps = Array.from(new Set(ips));

    // Priorizar IPs de red real (Wi-Fi / Ethernet) sobre adaptadores virtuales.
    // Windows retorna VMware/Hyper-V/WSL antes que el Wi-Fi, rompiendo el QR en producción.
    const score = (ip) => {
      // Rangos típicos de red local → mayor prioridad
      if (/^192\.168\./.test(ip)) return 0;
      if (/^10\./.test(ip)) return 1;
      if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return 2;
      // Rangos típicos de adaptadores virtuales → menor prioridad
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

  // Habilitar CORS para React
  expressApp.use(cors());

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

  // Endpoint para debuggear archivos disponibles
  expressApp.get('/debug/multimedia', (req, res) => {
    const publicFiles = fs.existsSync(multimediaDir) ? fs.readdirSync(multimediaDir) : [];
    const buildFiles = fs.existsSync(buildMultimediaDir) ? fs.readdirSync(buildMultimediaDir) : [];

    res.json({
      publicDir: multimediaDir,
      buildDir: buildMultimediaDir,
      publicFiles,
      buildFiles,
      totalFiles: [...new Set([...publicFiles, ...buildFiles])]
    });
  });

  // ✅ Endpoint mínimo para apps externas (móvil) - prueba de conectividad
  expressApp.get('/api/ping', (req, res) => {
    res.json({
      ok: true,
      app: 'GloryView Proyector',
      version: app.getVersion(),
      serverTime: new Date().toISOString(),
    });
  });

  // ✅ Info de conexión para emparejar app móvil (LAN)
  // Respuesta: { ok:true, port, urls, preferredUrl, qrValue }
  expressApp.get('/api/connection-info', (req, res) => {
    try {
      const ips = obtenerIpsLocalesV4();
      const urls = ips.map((ip) => `http://${ip}:${PORT}`);
      const preferredUrl = obtenerUrlPreferidaParaMovil();

      res.json({
        ok: true,
        app: 'GloryView Proyector',
        version: app.getVersion(),
        port: PORT,
        urls,
        preferredUrl,
        qrValue: preferredUrl,
        serverTime: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ [MAIN] (API) Error /api/connection-info:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ✅ QR PNG para emparejar (contenido = URL preferida)
  // Query opcional: ?url=http://ip:3001
  expressApp.get('/api/qr.png', async (req, res) => {
    try {
      const raw = String(req.query?.url || '').trim();
      const value = raw && /^https?:\/\//i.test(raw) ? raw : obtenerUrlPreferidaParaMovil();

      const png = await QRCode.toBuffer(value, {
        type: 'png',
        width: 360,
        margin: 1,
        errorCorrectionLevel: 'M',
      });

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'no-store');
      res.end(png);
    } catch (error) {
      console.error('❌ [MAIN] (API) Error /api/qr.png:', error);
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ✅ Catálogo de himnos para app móvil (siempre desde el escritorio)
  // Query: ?tipo=moravo|vida|personal
  // Respuesta: { ok:true, tipo, himnos:[{ id, numero, titulo, parrafos, fuente }] }
  // Nota: moravo/vida devuelve solo el catálogo base; personal devuelve solo himnos creados por el usuario.
  const leerJsonHimnosSeguro = (filename) => {
    const candidatos = [
      // Producción: build (si el archivo fue copiado desde public/)
      path.join(buildDir, 'data', filename),
      // Desarrollo: fuente del proyecto
      path.join(__dirname, 'src', 'data', filename),
      // Último recurso: carpeta data del repo
      path.join(__dirname, 'data', filename),
    ];

    for (const ruta of candidatos) {
      try {
        if (fs.existsSync(ruta)) {
          const raw = fs.readFileSync(ruta, 'utf-8');
          const json = JSON.parse(raw);
          return Array.isArray(json) ? json : [];
        }
      } catch (e) {
        console.warn('⚠️ [MAIN] No se pudo leer JSON de himnos:', ruta, e?.message);
      }
    }

    return [];
  };

  expressApp.get('/api/himnos', async (req, res) => {
    try {
      const tipoRaw = String(req.query?.tipo || 'moravo').toLowerCase();
      const tipo = tipoRaw === 'vida' ? 'vida' : tipoRaw === 'personal' ? 'personal' : 'moravo';

      let baseNormalizados = [];
      let dbNormalizados = [];

      if (tipo !== 'personal') {
        const filename = tipo === 'vida' ? 'vidacristiana.json' : 'himnos.json';

        const keyFavoritos = tipo === 'vida' ? 'himnos_favoritos_vida' : 'himnos_favoritos_moravo';
        let favoritosBaseIds = [];
        try {
          const rawFav = await dbNew.obtenerConfiguracion(keyFavoritos);
          const parsedFav = rawFav ? JSON.parse(String(rawFav)) : [];
          favoritosBaseIds = Array.isArray(parsedFav) ? parsedFav.map((x) => String(x)) : [];
        } catch {
          favoritosBaseIds = [];
        }

        const base = leerJsonHimnosSeguro(filename);
        baseNormalizados = base
          .map((h) => ({
            id: `base:${tipo}:${h?.numero ?? ''}`,
            numero: h?.numero ?? '',
            titulo: h?.titulo ?? '',
            parrafos: Array.isArray(h?.parrafos) ? h.parrafos : [],
            fuente: tipo,
            favorito: favoritosBaseIds.includes(`base:${tipo}:${h?.numero ?? ''}`),
          }))
          .filter((h) => String(h.titulo || '').trim());
      }

      if (tipo === 'personal') {
        const himnosDb = await dbNew.obtenerHimnos();
        dbNormalizados = (Array.isArray(himnosDb) ? himnosDb : [])
          .map((h) => {
            let letra = [];
            try {
              letra = JSON.parse(h?.letra || '[]');
            } catch {
              letra = [];
            }

            return {
              id: `db:${h?.id ?? ''}`,
              numero: h?.numero ?? '',
              titulo: h?.titulo ?? '',
              parrafos: Array.isArray(letra) ? letra : [],
              fuente: 'personal',
              favorito: Boolean(h?.favorito),
            };
          })
          .filter((h) => String(h.titulo || '').trim());
      }

      return res.json({
        ok: true,
        tipo,
        himnos: tipo === 'personal' ? dbNormalizados : baseNormalizados,
      });
    } catch (error) {
      console.error('❌ [MAIN] (API) Error /api/himnos:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ✅ Favoritos de himnos (App móvil)
  // Query: ?tipo=moravo|vida|all
  // Respuesta: { ok:true, himnos:[{id,numero,titulo,parrafos,fuente,favorito}] }
  expressApp.get('/api/himnos/favoritos', async (req, res) => {
    try {
      const tipoRaw = String(req.query?.tipo || 'all').toLowerCase();
      const tipos = tipoRaw === 'vida' ? ['vida'] : tipoRaw === 'moravo' ? ['moravo'] : ['moravo', 'vida'];

      const favoritos = [];

      for (const t of tipos) {
        const filename = t === 'vida' ? 'vidacristiana.json' : 'himnos.json';
        const keyFavoritos = t === 'vida' ? 'himnos_favoritos_vida' : 'himnos_favoritos_moravo';

        let favoritosBaseIds = [];
        try {
          const rawFav = await dbNew.obtenerConfiguracion(keyFavoritos);
          const parsedFav = rawFav ? JSON.parse(String(rawFav)) : [];
          favoritosBaseIds = Array.isArray(parsedFav) ? parsedFav.map((x) => String(x)) : [];
        } catch {
          favoritosBaseIds = [];
        }

        if (favoritosBaseIds.length) {
          const base = leerJsonHimnosSeguro(filename);
          base
            .map((h) => ({
              id: `base:${t}:${h?.numero ?? ''}`,
              numero: h?.numero ?? '',
              titulo: h?.titulo ?? '',
              parrafos: Array.isArray(h?.parrafos) ? h.parrafos : [],
              fuente: t,
              favorito: favoritosBaseIds.includes(`base:${t}:${h?.numero ?? ''}`),
            }))
            .filter((h) => h.favorito && String(h.titulo || '').trim())
            .forEach((h) => favoritos.push(h));
        }
      }

      const himnosDb = await dbNew.obtenerHimnos();
      (Array.isArray(himnosDb) ? himnosDb : [])
        .filter((h) => Boolean(h?.favorito))
        .map((h) => {
          let letra = [];
          try {
            letra = JSON.parse(h?.letra || '[]');
          } catch {
            letra = [];
          }

          return {
            id: `db:${h?.id ?? ''}`,
            numero: h?.numero ?? '',
            titulo: h?.titulo ?? '',
            parrafos: Array.isArray(letra) ? letra : [],
            fuente: 'personal',
            favorito: true,
          };
        })
        .filter((h) => String(h.titulo || '').trim())
        .forEach((h) => favoritos.push(h));

      favoritos.sort((a, b) => {
        const na = Number(a?.numero);
        const nb = Number(b?.numero);
        if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
        return String(a?.titulo || '').localeCompare(String(b?.titulo || ''), 'es');
      });

      return res.json({ ok: true, himnos: favoritos });
    } catch (error) {
      console.error('❌ [MAIN] (API) Error /api/himnos/favoritos:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ✅ Toggle favorito himno (App móvil)
  // Body: { favorito:boolean }
  expressApp.post('/api/himnos/:id/favorito', async (req, res) => {
    try {
      const id = String(req.params?.id || '').trim();
      if (!id) return res.status(400).json({ ok: false, error: 'id inválido' });
      const favorito = Boolean(req.body?.favorito);

      if (id.startsWith('db:')) {
        const raw = id.slice(3);
        const dbId = Number(raw);
        if (!Number.isFinite(dbId)) {
          return res.status(400).json({ ok: false, error: 'id db inválido' });
        }

        const ok = await dbNew.actualizarFavoritoHimno(dbId, favorito);
        if (!ok) {
          return res.status(500).json({ ok: false, error: 'No se pudo actualizar favorito' });
        }
        return res.json({ ok: true });
      }

      if (id.startsWith('base:')) {
        const parts = id.split(':');
        const tipo = parts?.[1] === 'vida' ? 'vida' : 'moravo';
        const keyFavoritos = tipo === 'vida' ? 'himnos_favoritos_vida' : 'himnos_favoritos_moravo';

        let favoritosBaseIds = [];
        try {
          const rawFav = await dbNew.obtenerConfiguracion(keyFavoritos);
          const parsedFav = rawFav ? JSON.parse(String(rawFav)) : [];
          favoritosBaseIds = Array.isArray(parsedFav) ? parsedFav.map((x) => String(x)) : [];
        } catch {
          favoritosBaseIds = [];
        }

        const set = new Set(favoritosBaseIds);
        if (favorito) set.add(id);
        else set.delete(id);

        const ok = await dbNew.actualizarConfiguracion(keyFavoritos, JSON.stringify(Array.from(set)));
        if (!ok) {
          return res.status(500).json({ ok: false, error: 'No se pudo guardar favorito' });
        }

        return res.json({ ok: true });
      }

      return res.status(400).json({ ok: false, error: 'Formato de id no soportado' });
    } catch (error) {
      console.error('❌ [MAIN] (API) Error /api/himnos/:id/favorito:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ✅ Favoritos de Biblia (RV1960)
  // Respuesta: { ok:true, favoritos:[{ id, libroId, libroNombre, capitulo, versiculo, texto, creadoEn }] }
  const BIBLIA_FAVORITOS_KEY = 'biblia_favoritos_rv1960';

  const normalizarFavoritoBiblia = (raw) => {
    if (!raw) return null;

    // Compat: lista antigua de strings (ids)
    if (typeof raw === 'string') {
      const id = raw.trim();
      if (!id) return null;
      return {
        id,
        libroId: '',
        libroNombre: '',
        capitulo: null,
        versiculo: null,
        texto: '',
        creadoEn: null,
      };
    }

    if (typeof raw !== 'object') return null;

    const id = String(raw.id || '').trim();
    if (!id) return null;

    const libroId = String(raw.libroId || '').trim();
    const libroNombre = String(raw.libroNombre || '').trim();

    const capituloNum = Number(raw.capitulo);
    const versiculoNum = Number(raw.versiculo);

    const capitulo = Number.isFinite(capituloNum) && capituloNum > 0 ? capituloNum : null;
    const versiculo = Number.isFinite(versiculoNum) && versiculoNum > 0 ? versiculoNum : null;

    const texto = typeof raw.texto === 'string' ? raw.texto : '';

    const creadoEnNum = Number(raw.creadoEn);
    const creadoEn = Number.isFinite(creadoEnNum) && creadoEnNum > 0 ? creadoEnNum : null;

    return { id, libroId, libroNombre, capitulo, versiculo, texto, creadoEn };
  };

  const leerFavoritosBiblia = async () => {
    try {
      const raw = await dbNew.obtenerConfiguracion(BIBLIA_FAVORITOS_KEY);
      const parsed = raw ? JSON.parse(String(raw)) : [];
      const arr = Array.isArray(parsed) ? parsed : [];
      const normalizados = arr.map(normalizarFavoritoBiblia).filter(Boolean);

      // De-dup por id (último gana)
      const map = new Map();
      for (const f of normalizados) map.set(f.id, f);
      return Array.from(map.values());
    } catch {
      return [];
    }
  };

  const guardarFavoritosBiblia = async (favoritos) => {
    return dbNew.actualizarConfiguracion(BIBLIA_FAVORITOS_KEY, JSON.stringify(favoritos));
  };

  expressApp.get('/api/biblia/favoritos', async (_req, res) => {
    try {
      const favoritos = await leerFavoritosBiblia();

      favoritos.sort((a, b) => {
        const ln = String(a?.libroNombre || '').localeCompare(String(b?.libroNombre || ''), 'es');
        if (ln !== 0) return ln;
        const ca = Number(a?.capitulo || 0);
        const cb = Number(b?.capitulo || 0);
        if (ca !== cb) return ca - cb;
        const va = Number(a?.versiculo || 0);
        const vb = Number(b?.versiculo || 0);
        return va - vb;
      });

      return res.json({ ok: true, favoritos });
    } catch (error) {
      console.error('❌ [MAIN] (API) Error /api/biblia/favoritos:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ✅ Estructura de un libro: número de capítulos y versículos por capítulo
  // Respuesta: { ok:true, libroId, capitulos:number, versiculosPorCapitulo:number[] }
  // Usado por la app móvil para renderizar la grilla de capítulos/versículos correctamente.
  expressApp.get('/api/biblia/estructura/:libroId', (req, res) => {
    try {
      const libroId = String(req.params?.libroId || '').trim();
      // Validar: solo letras minúsculas, dígitos y guión bajo (evita path traversal)
      if (!libroId || !/^[a-z0-9_]+$/.test(libroId)) {
        return res.status(400).json({ ok: false, error: 'libroId inválido' });
      }

      const candidatos = [
        path.join(buildDir, 'data', 'biblia', `${libroId}.js`),
        path.join(__dirname, 'src', 'data', 'biblia', `${libroId}.js`),
      ];

      let ruta = null;
      for (const c of candidatos) {
        if (fs.existsSync(c)) { ruta = c; break; }
      }

      if (!ruta) {
        return res.status(404).json({ ok: false, error: `Libro "${libroId}" no encontrado` });
      }

      // Leer como texto y evaluar con vm (evita problemas con import() de ESM en main process)
      const vm = require('vm');
      const contenido = fs.readFileSync(ruta, 'utf8');
      // Quitar "export default" y evaluar el array literal JavaScript
      const arrayStr = contenido.replace(/^\s*export\s+default\s+/, '').trim();
      const data = vm.runInNewContext(`(${arrayStr})`, Object.create(null));

      if (!Array.isArray(data) || data.length === 0) {
        return res.status(404).json({ ok: false, error: `Libro "${libroId}" vacío o inválido` });
      }

      const versiculosPorCapitulo = data.map((cap) => (Array.isArray(cap) ? cap.length : 0));

      return res.json({
        ok: true,
        libroId,
        capitulos: data.length,
        versiculosPorCapitulo,
      });
    } catch (error) {
      console.error('❌ [MAIN] (API) Error /api/biblia/estructura:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ✅ Toggle favorito de versículo
  // Body: { favorito:boolean, libroId, libroNombre, capitulo:number, versiculo:number, texto:string }
  expressApp.post('/api/biblia/:id/favorito', async (req, res) => {
    try {
      const id = String(req.params?.id || '').trim();
      if (!id) return res.status(400).json({ ok: false, error: 'id inválido' });

      const favorito = Boolean(req.body?.favorito);

      const favoritos = await leerFavoritosBiblia();
      const map = new Map(favoritos.map((f) => [f.id, f]));

      if (favorito) {
        const libroId = String(req.body?.libroId || '').trim();
        const libroNombre = String(req.body?.libroNombre || '').trim();
        const capituloNum = Number(req.body?.capitulo);
        const versiculoNum = Number(req.body?.versiculo);
        const texto = typeof req.body?.texto === 'string' ? req.body.texto : '';

        const capitulo = Number.isFinite(capituloNum) && capituloNum > 0 ? capituloNum : null;
        const versiculo = Number.isFinite(versiculoNum) && versiculoNum > 0 ? versiculoNum : null;

        const previo = map.get(id);
        map.set(id, {
          id,
          libroId,
          libroNombre,
          capitulo,
          versiculo,
          texto,
          creadoEn: previo?.creadoEn || Date.now(),
        });
      } else {
        map.delete(id);
      }

      const ok = await guardarFavoritosBiblia(Array.from(map.values()));
      if (!ok) return res.status(500).json({ ok: false, error: 'No se pudo guardar favorito' });

      return res.json({ ok: true });
    } catch (error) {
      console.error('❌ [MAIN] (API) Error /api/biblia/:id/favorito:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ✅ Proyectar himno desde app móvil
  // Body esperado: { parrafo: string, titulo: string, numero: string|number, origen?: string }
  expressApp.post('/api/proyector/himno', async (req, res) => {
    try {
      const himno = req.body;

      if (!himno || typeof himno !== 'object') {
        return res.status(400).json({ ok: false, error: 'Body inválido' });
      }

      const parrafo = typeof himno.parrafo === 'string' ? himno.parrafo : '';
      const titulo = typeof himno.titulo === 'string' ? himno.titulo : '';
      const numero = himno.numero ?? '';
      const origen = typeof himno.origen === 'string' ? himno.origen : 'himno';

      if (!parrafo.trim() || !titulo.trim()) {
        return res
          .status(400)
          .json({ ok: false, error: 'Faltan parrafo/titulo' });
      }

      const payload = { parrafo, titulo, numero, origen };

      // Reutilizar la misma lógica que ipcMain.on("proyectar-himno")
      if (!proyectorWindow) {
        const nuevaVentana = createProyectorWindow();
        if (!nuevaVentana) {
          return res.status(500).json({ ok: false, error: 'No se pudo abrir proyector' });
        }

        nuevaVentana.webContents.once('did-finish-load', () => {
          setTimeout(() => {
            if (nuevaVentana && !nuevaVentana.isDestroyed()) {
              console.log('📤 [MAIN] (API) Enviando himno a nuevo proyector:', payload.titulo);
              nuevaVentana.webContents.send('mostrar-himno', payload);
            }
          }, 1000);
        });
      } else {
        console.log('📤 [MAIN] (API) Enviando himno a proyector existente:', payload.titulo);
        proyectorWindow.webContents.send('mostrar-himno', payload);
      }

      return res.json({ ok: true });
    } catch (error) {
      console.error('❌ [MAIN] (API) Error proyectando himno:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ✅ Limpiar proyector desde app móvil
  // Respuesta: { ok:true }
  expressApp.post('/api/proyector/limpiar', async (req, res) => {
    try {
      if (proyectorWindow && !proyectorWindow.isDestroyed()) {
        proyectorWindow.webContents.send('limpiar-proyector');
        console.log('🧹 [MAIN] (API) Comando limpiar enviado al proyector');
        return res.json({ ok: true });
      }

      return res
        .status(500)
        .json({ ok: false, error: 'Ventana del proyector no disponible' });
    } catch (error) {
      console.error('❌ [MAIN] (API) Error /api/proyector/limpiar:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ✅ Control Biblia desde app móvil (sin duplicar texto en el móvil)
  // Body esperado: { libroId: string, capitulo: number, versiculo: number }
  // Nota: el renderer (React) resuelve el texto y llama a window.electron.enviarVersiculo.
  expressApp.post('/api/control/biblia/proyectar', (req, res) => {
    try {
      const { libroId, capitulo, versiculo } = req.body || {};

      if (!libroId || typeof libroId !== 'string') {
        return res.status(400).json({ ok: false, error: 'libroId inválido' });
      }

      const cap = Number(capitulo);
      const ver = Number(versiculo);

      if (!Number.isFinite(cap) || cap <= 0) {
        return res.status(400).json({ ok: false, error: 'capitulo inválido' });
      }

      if (!Number.isFinite(ver) || ver <= 0) {
        return res.status(400).json({ ok: false, error: 'versiculo inválido' });
      }

      if (!mainWindow || mainWindow.isDestroyed()) {
        return res.status(500).json({ ok: false, error: 'Ventana principal no disponible' });
      }

      mainWindow.webContents.send('control-biblia-proyectar', {
        libroId: libroId.trim(),
        capitulo: cap,
        versiculo: ver,
      });

      return res.json({ ok: true });
    } catch (error) {
      console.error('❌ [MAIN] (API) Error control Biblia:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ✅ Vista previa Biblia (para mostrar anterior/actual/siguiente en la app móvil)
  // Body esperado: { libroId: string, capitulo: number, versiculo: number }
  // Respuesta: { ok:true, data:{ libroId, nombreLibro, capitulo, versiculo, prev, current, next } }
  expressApp.post('/api/control/biblia/preview', async (req, res) => {
    try {
      const { libroId, capitulo, versiculo } = req.body || {};

      if (!libroId || typeof libroId !== 'string') {
        return res.status(400).json({ ok: false, error: 'libroId inválido' });
      }

      const cap = Number(capitulo);
      const ver = Number(versiculo);

      if (!Number.isFinite(cap) || cap <= 0) {
        return res.status(400).json({ ok: false, error: 'capitulo inválido' });
      }

      if (!Number.isFinite(ver) || ver <= 0) {
        return res.status(400).json({ ok: false, error: 'versiculo inválido' });
      }

      const payload = await solicitarBibliaPreviewAlRenderer({
        libroId: libroId.trim(),
        capitulo: cap,
        versiculo: ver,
      });

      if (!payload?.ok) {
        return res.status(500).json({ ok: false, error: payload?.error || 'Error obteniendo vista previa' });
      }

      return res.json({ ok: true, data: payload.data });
    } catch (error) {
      console.error('❌ [MAIN] (API) Error /api/control/biblia/preview:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ==================================================
  // ✅ Multimedia (App móvil)
  // ==================================================

  const getRequestBaseUrl = (req) => `${req.protocol}://${req.get('host')}`;

  const absolutizarUrl = (req, url) => {
    const raw = String(url || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    const base = getRequestBaseUrl(req);
    if (raw.startsWith('/')) return `${base}${raw}`;
    return `${base}/${raw}`;
  };

  const toLocalhostUrl = (url) => {
    const raw = String(url || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith('/')) return `http://localhost:${PORT}${raw}`;
    return `http://localhost:${PORT}/${raw}`;
  };

  const asegurarProyectorListo = async () => {
    if (!proyectorWindow || proyectorWindow.isDestroyed()) {
      proyectorWindow = createProyectorWindow();
      if (!proyectorWindow) {
        throw new Error('No se pudo crear la ventana del proyector');
      }

      await new Promise((resolve) => {
        proyectorWindow.webContents.once('did-finish-load', resolve);
      });

      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    if (proyectorWindow.webContents.isLoading()) {
      await new Promise((resolve) => {
        proyectorWindow.webContents.once('did-finish-load', resolve);
      });
    }

    try {
      proyectorWindow.focus();
    } catch {
      // Ignorar
    }

    return proyectorWindow;
  };

  // ✅ Listar multimedia
  // Respuesta: { ok:true, multimedia:[...] }
  expressApp.get('/api/multimedia', async (req, res) => {
    try {
      const multimedia = await obtenerMultimedia();
      const normalizados = (Array.isArray(multimedia) ? multimedia : []).map((m) => {
        const urlRel = String(m?.url || '').trim();
        return {
          ...m,
          url: urlRel ? absolutizarUrl(req, urlRel) : '',
          url_localhost: urlRel ? toLocalhostUrl(urlRel) : '',
        };
      });
      return res.json({ ok: true, multimedia: normalizados });
    } catch (error) {
      console.error('❌ [MAIN] (API) Error /api/multimedia:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ✅ Listar multimedia favoritos
  expressApp.get('/api/multimedia/favoritos', async (req, res) => {
    try {
      const multimedia = await obtenerMultimediaFavoritos();
      const normalizados = (Array.isArray(multimedia) ? multimedia : []).map((m) => {
        const urlRel = String(m?.url || '').trim();
        return {
          ...m,
          url: urlRel ? absolutizarUrl(req, urlRel) : '',
          url_localhost: urlRel ? toLocalhostUrl(urlRel) : '',
        };
      });
      return res.json({ ok: true, multimedia: normalizados });
    } catch (error) {
      console.error('❌ [MAIN] (API) Error /api/multimedia/favoritos:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ✅ Proyectar multimedia desde app móvil
  // Body esperado: { id?: number|string, url?: string, tipo?: 'video'|'audio'|'imagen', nombre?: string }
  expressApp.post('/api/control/multimedia/proyectar', async (req, res) => {
    try {
      const { id, url, tipo, nombre } = req.body || {};

      let media = null;
      if (id !== undefined && id !== null && String(id).trim() !== '') {
        const all = await obtenerMultimedia();
        const found = (Array.isArray(all) ? all : []).find((m) => String(m?.id) === String(id));
        if (found) {
          media = found;
        }
      }

      const finalTipo = String(tipo || media?.tipo || '').trim();
      const finalNombre = String(nombre || media?.nombre || '').trim();
      const finalUrl = String(url || media?.url || '').trim();

      if (!finalTipo || !finalUrl) {
        return res.status(400).json({ ok: false, error: 'Faltan tipo/url (o id inválido)' });
      }

      const proyector = await asegurarProyectorListo();
      const payload = {
        tipo: finalTipo,
        url: toLocalhostUrl(finalUrl),
        nombre: finalNombre || finalUrl.split('/').pop() || 'Multimedia',
      };

      proyector.webContents.send('mostrar-multimedia', payload);

      // Guardar id/nombre inmediatamente para que todos los clientes puedan
      // ver el estado sin esperar al IPC de playback-status del renderer.
      const numericId = (id !== undefined && id !== null && String(id).trim() !== '')
        ? id
        : null;
      multimediaPlaybackStatus['proyector'].id = numericId;
      multimediaPlaybackStatus['proyector'].nombre = payload.nombre || null;
      multimediaPlaybackStatus['proyector'].paused = false;
      multimediaPlaybackStatus['proyector'].updatedAt = Date.now();

      return res.json({ ok: true });
    } catch (error) {
      console.error('❌ [MAIN] (API) Error /api/control/multimedia/proyectar:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ✅ Controlar reproducción multimedia desde app móvil
  // Body: { action: 'play'|'pause'|'stop'|'limpiar'|'seek'|'volume', time?: number, volume?: number }
  expressApp.post('/api/control/multimedia/control', async (req, res) => {
    try {
      const { action, time, volume } = req.body || {};
      const finalAction = String(action || '').trim();

      const allowed = new Set(['play', 'pause', 'stop', 'limpiar', 'seek', 'volume']);
      if (!allowed.has(finalAction)) {
        return res.status(400).json({ ok: false, error: 'Acción inválida' });
      }

      const payload = { action: finalAction };

      if (finalAction === 'seek') {
        const t = Number(time);
        if (!Number.isFinite(t) || t < 0) {
          return res.status(400).json({ ok: false, error: 'time inválido' });
        }
        payload.time = t;
      }

      if (finalAction === 'volume') {
        const v = Number(volume);
        if (!Number.isFinite(v) || v < 0 || v > 1) {
          return res.status(400).json({ ok: false, error: 'volume inválido (0..1)' });
        }
        payload.volume = v;
      }

      const proyector = await asegurarProyectorListo();
      proyector.webContents.send('control-multimedia', payload);
      return res.json({ ok: true });
    } catch (error) {
      console.error('❌ [MAIN] (API) Error /api/control/multimedia/control:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ✅ Estado de reproducción multimedia (para app móvil)
  // Query: ?destino=proyector|pc
  // Respuesta: { ok:true, destino, status:{ updatedAt, currentTime, duration, paused, volume, tipo } }
  expressApp.get('/api/control/multimedia/status', async (req, res) => {
    try {
      const destinoRaw = String(req.query?.destino || 'proyector').toLowerCase();
      const destino = destinoRaw === 'pc' ? 'pc' : 'proyector';
      const status = multimediaPlaybackStatus?.[destino] || null;
      return res.json({ ok: true, destino, status });
    } catch (error) {
      console.error('❌ [MAIN] (API) Error /api/control/multimedia/status:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ✅ Reproducir multimedia como "solo audio" (en la app de escritorio, sin proyectar)
  // Útil para música de fondo mientras se sigue mostrando texto en el proyector.
  // Body esperado: { id?: number|string, url?: string, tipo?: 'youtube'|'video'|'audio', nombre?: string }
  expressApp.post('/api/control/multimedia/solo-audio/play', async (req, res) => {
    try {
      const { id, url, tipo, nombre } = req.body || {};

      let media = null;
      if (id !== undefined && id !== null && String(id).trim() !== '') {
        const all = await obtenerMultimedia();
        const found = (Array.isArray(all) ? all : []).find((m) => String(m?.id) === String(id));
        if (found) {
          media = found;
        }
      }

      const finalTipo = String(tipo || media?.tipo || '').trim();
      const finalNombre = String(nombre || media?.nombre || '').trim();
      const finalUrl = String(url || media?.url || '').trim();

      if (!finalTipo || !finalUrl) {
        return res.status(400).json({ ok: false, error: 'Faltan tipo/url (o id inválido)' });
      }

      if (!mainWindow || mainWindow.isDestroyed()) {
        return res.status(409).json({ ok: false, error: 'Ventana principal no disponible' });
      }

      const numericId = (id !== undefined && id !== null && String(id).trim() !== '')
        ? id
        : (media?.id ?? null);

      const payload = {
        id: numericId,
        tipo: finalTipo,
        url: toLocalhostUrl(finalUrl),
        nombre: finalNombre || finalUrl.split('/').pop() || 'Multimedia',
        soloAudio: true,
      };

      mainWindow.webContents.send('solo-audio-play', payload);

      // Guardar id/nombre inmediatamente para que todos los clientes puedan
      // ver el estado sin esperar al IPC de playback-status del renderer.
      multimediaPlaybackStatus['pc'].id = numericId;
      multimediaPlaybackStatus['pc'].nombre = payload.nombre;
      multimediaPlaybackStatus['pc'].paused = false;
      multimediaPlaybackStatus['pc'].updatedAt = Date.now();

      return res.json({ ok: true });
    } catch (error) {
      console.error('❌ [MAIN] (API) Error /api/control/multimedia/solo-audio/play:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ✅ Controlar "solo audio" (en la app de escritorio, sin proyectar)
  // Body: { action: 'play'|'pause'|'stop'|'limpiar'|'seek'|'volume', time?: number, volume?: number }
  expressApp.post('/api/control/multimedia/solo-audio/control', async (req, res) => {
    try {
      const { action, volume, time } = req.body || {};
      const finalAction = String(action || '').trim();

      const allowed = new Set(['play', 'pause', 'stop', 'limpiar', 'seek', 'volume']);
      if (!allowed.has(finalAction)) {
        return res.status(400).json({ ok: false, error: 'Acción inválida' });
      }

      if (!mainWindow || mainWindow.isDestroyed()) {
        return res.status(409).json({ ok: false, error: 'Ventana principal no disponible' });
      }

      const payload = { action: finalAction };

      if (finalAction === 'seek') {
        const t = Number(time);
        if (!Number.isFinite(t) || t < 0) {
          return res.status(400).json({ ok: false, error: 'time inválido' });
        }
        payload.time = t;
      }

      if (finalAction === 'volume') {
        const v = Number(volume);
        if (!Number.isFinite(v) || v < 0 || v > 1) {
          return res.status(400).json({ ok: false, error: 'volume inválido (0..1)' });
        }
        payload.volume = v;
      }

      mainWindow.webContents.send('solo-audio-control', payload);
      return res.json({ ok: true });
    } catch (error) {
      console.error('❌ [MAIN] (API) Error /api/control/multimedia/solo-audio/control:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ✅ Favorito multimedia
  // Body: { favorito: boolean }
  expressApp.post('/api/multimedia/:id/favorito', async (req, res) => {
    try {
      const id = Number(req.params?.id);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ ok: false, error: 'id inválido' });
      }
      const favorito = Boolean(req.body?.favorito);
      const result = await actualizarFavoritoMultimedia(id, favorito);
      if (!result?.success) {
        return res.status(500).json({ ok: false, error: result?.error || 'No se pudo actualizar favorito' });
      }
      return res.json({ ok: true });
    } catch (error) {
      console.error('❌ [MAIN] (API) Error /api/multimedia/:id/favorito:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ==================================================
  // ✅ Presentaciones Slides (App móvil)
  // ==================================================

  // ✅ Listado (ligero)
  // Respuesta: { ok:true, presentaciones:[{id,nombre,descripcion,total_slides,slide_actual,favorito,updated_at,created_at}] }
  expressApp.get('/api/presentaciones-slides', async (req, res) => {
    try {
      const presentaciones = await obtenerPresentacionesSlides();
      const lista = (Array.isArray(presentaciones) ? presentaciones : []).map((p) => ({
        id: p.id,
        nombre: p.nombre,
        descripcion: p.descripcion,
        total_slides: p.total_slides,
        slide_actual: p.slide_actual,
        favorito: Boolean(p.favorito),
        created_at: p.created_at,
        updated_at: p.updated_at,
      }));
      return res.json({ ok: true, presentaciones: lista });
    } catch (error) {
      console.error('❌ [MAIN] (API) Error /api/presentaciones-slides:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ✅ Detalle (incluye slides)
  expressApp.get('/api/presentaciones-slides/:id', async (req, res) => {
    try {
      const id = Number(req.params?.id);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ ok: false, error: 'id inválido' });
      }

      const presentacion = await obtenerPresentacionSlidesPorId(id);
      if (!presentacion) {
        return res.status(404).json({ ok: false, error: 'No encontrada' });
      }

      return res.json({ ok: true, presentacion });
    } catch (error) {
      console.error('❌ [MAIN] (API) Error /api/presentaciones-slides/:id:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  const proyectarPresentacionSlide = async ({ presentacionId, slideIndex }) => {
    const presentacion = await obtenerPresentacionSlidesPorId(presentacionId);
    if (!presentacion) {
      throw new Error('Presentación no encontrada');
    }
    const slides = Array.isArray(presentacion.slides) ? presentacion.slides : [];
    if (slides.length === 0) {
      throw new Error('Presentación sin slides');
    }

    const index = Number(slideIndex);
    if (!Number.isFinite(index) || index < 0 || index >= slides.length) {
      throw new Error('slideIndex inválido');
    }

    const slideData = {
      tipo: 'slide',
      slide: slides[index],
      presentation: {
        name: presentacion.nombre,
        currentIndex: index,
        totalSlides: slides.length,
      },
    };

    const proyector = await asegurarProyectorListo();
    proyector.webContents.send('proyectar-slide-data', slideData);

    try {
      await actualizarSlideActualPresentacion(presentacionId, index);
    } catch {
      // No bloquear si falla actualizar en BD
    }

    return { presentacionId, slideIndex: index, totalSlides: slides.length };
  };

  // ✅ Proyectar slide (por id y slideIndex opcional)
  // Body: { id:number, slideIndex?:number }
  expressApp.post('/api/control/presentaciones-slides/proyectar', async (req, res) => {
    try {
      const id = Number(req.body?.id);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ ok: false, error: 'id inválido' });
      }

      const presentacion = await obtenerPresentacionSlidesPorId(id);
      if (!presentacion) {
        return res.status(404).json({ ok: false, error: 'No encontrada' });
      }

      const slideIndex =
        req.body?.slideIndex !== undefined && req.body?.slideIndex !== null
          ? Number(req.body.slideIndex)
          : Number(presentacion.slide_actual || 0);

      const result = await proyectarPresentacionSlide({ presentacionId: id, slideIndex });
      return res.json({ ok: true, ...result });
    } catch (error) {
      console.error('❌ [MAIN] (API) Error /api/control/presentaciones-slides/proyectar:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ✅ Siguiente slide
  // Body: { id:number }
  expressApp.post('/api/control/presentaciones-slides/siguiente', async (req, res) => {
    try {
      const id = Number(req.body?.id);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ ok: false, error: 'id inválido' });
      }

      const presentacion = await obtenerPresentacionSlidesPorId(id);
      if (!presentacion) {
        return res.status(404).json({ ok: false, error: 'No encontrada' });
      }

      const total = Array.isArray(presentacion.slides) ? presentacion.slides.length : 0;
      if (total <= 0) {
        return res.status(400).json({ ok: false, error: 'Presentación sin slides' });
      }

      const current = Number(presentacion.slide_actual || 0);
      const next = Math.min(total - 1, current + 1);

      const result = await proyectarPresentacionSlide({ presentacionId: id, slideIndex: next });
      return res.json({ ok: true, ...result });
    } catch (error) {
      console.error('❌ [MAIN] (API) Error /api/control/presentaciones-slides/siguiente:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ✅ Slide anterior
  // Body: { id:number }
  expressApp.post('/api/control/presentaciones-slides/anterior', async (req, res) => {
    try {
      const id = Number(req.body?.id);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ ok: false, error: 'id inválido' });
      }

      const presentacion = await obtenerPresentacionSlidesPorId(id);
      if (!presentacion) {
        return res.status(404).json({ ok: false, error: 'No encontrada' });
      }

      const total = Array.isArray(presentacion.slides) ? presentacion.slides.length : 0;
      if (total <= 0) {
        return res.status(400).json({ ok: false, error: 'Presentación sin slides' });
      }

      const current = Number(presentacion.slide_actual || 0);
      const prev = Math.max(0, current - 1);

      const result = await proyectarPresentacionSlide({ presentacionId: id, slideIndex: prev });
      return res.json({ ok: true, ...result });
    } catch (error) {
      console.error('❌ [MAIN] (API) Error /api/control/presentaciones-slides/anterior:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ✅ Favorito presentación slides
  // Body: { favorito: boolean }
  expressApp.post('/api/presentaciones-slides/:id/favorito', async (req, res) => {
    try {
      const id = Number(req.params?.id);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ ok: false, error: 'id inválido' });
      }
      const favorito = Boolean(req.body?.favorito);
      const result = await actualizarFavoritoPresentacionSlides(id, favorito);
      if (!result?.success) {
        return res.status(500).json({ ok: false, error: result?.error || 'No se pudo actualizar favorito' });
      }
      return res.json({ ok: true });
    } catch (error) {
      console.error('❌ [MAIN] (API) Error /api/presentaciones-slides/:id/favorito:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ==================================================
  // ✅ Fondos (App móvil)
  // ==================================================

  // ✅ Listar fondos
  // Respuesta: { ok:true, fondos:[{id,url,tipo,nombre,activo,created_at}] }
  expressApp.get('/api/fondos', async (req, res) => {
    try {
      const fondos = await dbNew.obtenerFondos();
      const base = getRequestBaseUrl(req);

      const normalizados = (Array.isArray(fondos) ? fondos : []).map((f) => {
        const rawUrl = String(f?.url || '').trim();
        let urlPublica = rawUrl;
        if (urlPublica && !/^https?:\/\//i.test(urlPublica)) {
          if (urlPublica.startsWith('/')) {
            urlPublica = `${base}${urlPublica}`;
          } else {
            urlPublica = `${base}/fondos/${path.basename(urlPublica)}`;
          }
        }

        return {
          id: f.id,
          url: urlPublica,
          url_localhost: rawUrl ? toLocalhostUrl(rawUrl.startsWith('/') ? rawUrl : `/fondos/${path.basename(rawUrl)}`) : '',
          tipo: f.tipo || 'imagen',
          nombre: f.nombre || `Fondo ${f.id}`,
          activo: Boolean(f.activo),
          created_at: f.created_at || new Date().toISOString(),
        };
      });

      return res.json({ ok: true, fondos: normalizados });
    } catch (error) {
      console.error('❌ [MAIN] (API) Error /api/fondos:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ✅ Fondo activo
  expressApp.get('/api/fondos/activo', async (req, res) => {
    try {
      const fondos = await dbNew.obtenerFondos();
      const activo = (Array.isArray(fondos) ? fondos : []).find((f) => f.activo);
      if (!activo) return res.json({ ok: true, fondo: null });

      const base = getRequestBaseUrl(req);
      const rawUrl = String(activo?.url || '').trim();
      let urlPublica = rawUrl;
      if (urlPublica && !/^https?:\/\//i.test(urlPublica)) {
        if (urlPublica.startsWith('/')) {
          urlPublica = `${base}${urlPublica}`;
        } else {
          urlPublica = `${base}/fondos/${path.basename(urlPublica)}`;
        }
      }

      return res.json({
        ok: true,
        fondo: {
          ...activo,
          url: urlPublica,
          url_localhost: rawUrl ? toLocalhostUrl(rawUrl.startsWith('/') ? rawUrl : `/fondos/${path.basename(rawUrl)}`) : '',
        },
      });
    } catch (error) {
      console.error('❌ [MAIN] (API) Error /api/fondos/activo:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ✅ Establecer fondo activo
  // Body: { id:number }
  expressApp.post('/api/fondos/activo', async (req, res) => {
    try {
      const id = Number(req.body?.id);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ ok: false, error: 'id inválido' });
      }

      const ok = await dbNew.activarFondo(id);
      if (!ok) {
        return res.status(500).json({ ok: false, error: 'No se pudo activar el fondo' });
      }

      const fondos = await dbNew.obtenerFondos();
      const fondoActivo = (Array.isArray(fondos) ? fondos : []).find((f) => f.activo) || null;

      // Notificar a todas las ventanas (incluye proyector)
      const todasLasVentanas = BrowserWindow.getAllWindows();
      todasLasVentanas.forEach((ventana) => {
        if (!ventana.isDestroyed()) {
          if (fondoActivo && fondoActivo.url && !String(fondoActivo.url).startsWith('http')) {
            ventana.webContents.send('actualizar-fondo-activo', {
              ...fondoActivo,
              url: toLocalhostUrl(fondoActivo.url),
            });
          } else {
            ventana.webContents.send('actualizar-fondo-activo', fondoActivo);
          }
        }
      });

      return res.json({ ok: true, fondo: fondoActivo });
    } catch (error) {
      console.error('❌ [MAIN] (API) Error POST /api/fondos/activo:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ✨ ENDPOINT PARA DEBUGGEAR FONDOS DISPONIBLES
  expressApp.get('/debug/fondos', (req, res) => {
    const publicFiles = fs.existsSync(fondosDir) ? fs.readdirSync(fondosDir) : [];
    const buildFiles = fs.existsSync(buildFondosDir) ? fs.readdirSync(buildFondosDir) : [];

    res.json({
      publicDir: fondosDir,
      buildDir: buildFondosDir,
      publicFiles,
      buildFiles,
      totalFiles: [...new Set([...publicFiles, ...buildFiles])],
      serverUrls: {
        public: publicFiles.map(f => `http://localhost:3001/fondos/${f}`),
        build: buildFiles.map(f => `http://localhost:3001/fondos/${f}`)
      }
    });
  });

  // Endpoint para servir archivos con corrección de extensión
  expressApp.get('/multimedia-fixed/:filename', (req, res) => {
    const filename = req.params.filename;

    // Buscar el archivo en ambos directorios
    const directorios = [multimediaDir, buildMultimediaDir];

    for (const dir of directorios) {
      if (fs.existsSync(dir)) {
        const archivos = fs.readdirSync(dir);

        // Buscar coincidencia exacta
        let archivo = archivos.find(f => f === filename);

        // Si no hay coincidencia exacta, buscar sin extensión
        if (!archivo) {
          archivo = archivos.find(f => f.startsWith(filename));
        }

        if (archivo) {
          const rutaCompleta = path.join(dir, archivo);

          // Configurar headers
          if (archivo.includes('mp3') || archivo.includes('wav')) {
            res.setHeader('Content-Type', 'audio/mpeg');
          } else if (archivo.includes('mp4') || archivo.includes('webm')) {
            res.setHeader('Content-Type', 'video/mp4');
          } else if (archivo.includes('jpg') || archivo.includes('png')) {
            res.setHeader('Content-Type', 'image/jpeg');
          }
          res.setHeader('Accept-Ranges', 'bytes');

          return res.sendFile(rutaCompleta);
        }
      }
    }

    res.status(404).json({ error: 'Archivo no encontrado', filename, searchedIn: directorios });
  });

  // ✅ Miniatura estática para videos (para la app móvil)
  // Genera y cachea un JPG con ffmpeg (si existe en el sistema).
  // GET /api/multimedia/:id/thumbnail
  expressApp.get('/api/multimedia/:id/thumbnail', async (req, res) => {
    try {
      const id = String(req.params?.id || '').trim();
      if (!id) return res.status(400).json({ ok: false, error: 'id requerido' });

      const all = await obtenerMultimedia();
      const item = (Array.isArray(all) ? all : []).find((m) => String(m?.id) === id);
      if (!item) return res.status(404).json({ ok: false, error: 'multimedia no encontrada' });

      const tipo = String(item?.tipo || '').toLowerCase();
      if (!tipo.includes('video')) {
        return res.status(400).json({ ok: false, error: 'no es un video' });
      }

      const filenameRaw =
        String(item?.ruta_archivo || '').trim() ||
        String(item?.url || '').trim().split('/').pop() ||
        '';
      const filename = String(filenameRaw || '').split('?')[0].trim();
      if (!filename) {
        return res.status(404).json({ ok: false, error: 'archivo no encontrado (sin nombre)' });
      }

      const directorios = [multimediaDir, buildMultimediaDir];
      let sourcePath = '';
      for (const dir of directorios) {
        try {
          if (!fs.existsSync(dir)) continue;
          const exact = path.join(dir, filename);
          if (fs.existsSync(exact)) {
            sourcePath = exact;
            break;
          }

          // Si no hay coincidencia exacta, intentar por prefijo (casos sin extensión bien formada)
          const archivos = fs.readdirSync(dir);
          const found = archivos.find((f) => f === filename) || archivos.find((f) => f.startsWith(filename));
          if (found) {
            sourcePath = path.join(dir, found);
            break;
          }
        } catch {
          // ignore
        }
      }

      if (!sourcePath || !fs.existsSync(sourcePath)) {
        return res.status(404).json({ ok: false, error: 'archivo no encontrado', filename });
      }

      const thumbsDir = path.join(rutaBase, 'public', 'multimedia_thumbs');
      try {
        if (!fs.existsSync(thumbsDir)) fs.mkdirSync(thumbsDir, { recursive: true });
      } catch {
        // noop
      }

      const thumbPath = path.join(thumbsDir, `thumb_${id}.jpg`);

      // Cache: si existe y es más nuevo que el video, servir
      try {
        if (fs.existsSync(thumbPath)) {
          const thumbStat = fs.statSync(thumbPath);
          const srcStat = fs.statSync(sourcePath);
          if (thumbStat.mtimeMs >= srcStat.mtimeMs) {
            res.setHeader('Content-Type', 'image/jpeg');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            res.setHeader('Access-Control-Allow-Origin', '*');
            return res.sendFile(thumbPath);
          }
        }
      } catch {
        // ignore
      }

      // Generar miniatura con ffmpeg
      const args = [
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
        // mover un poco el tiempo para evitar frames negros iniciales
        '-ss',
        '00:00:01',
        '-i',
        sourcePath,
        '-vframes',
        '1',
        '-vf',
        'scale=640:-2',
        thumbPath,
      ];

      await new Promise((resolve, reject) => {
        const proc = spawn(FFMPEG_BIN, args, { stdio: 'ignore' });
        proc.on('error', (err) => reject(err));
        proc.on('close', (code) => {
          if (code === 0) return resolve();
          reject(new Error(`ffmpeg exit ${code}`));
        });
      });

      if (!fs.existsSync(thumbPath)) {
        return res.status(500).json({ ok: false, error: 'no se pudo generar miniatura' });
      }

      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.sendFile(thumbPath);
    } catch (error) {
      const msg = String(error?.message || error || 'error');
      // ffmpeg puede no estar instalado: devolver 501 y dejar que el móvil caiga a placeholder.
      const status = msg.includes('ENOENT') ? 501 : 500;
      return res.status(status).json({ ok: false, error: msg });
    }
  });

  // ✨ Proxy para imágenes de Pixabay
  expressApp.get('/pixabay-proxy', async (req, res) => {
    const imageUrl = req.query.url;

    if (!imageUrl) {
      console.error('❌ [Pixabay Proxy] URL no proporcionada');
      return res.status(400).json({ error: 'URL de imagen requerida' });
    }

    console.log('🔄 [Pixabay Proxy] Intentando cargar:', imageUrl);

    try {
      const fetch = (await import('node-fetch')).default;

      // Mejorar headers para simular un navegador real
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': 'https://pixabay.com/',
          'Origin': 'https://pixabay.com',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Sec-Fetch-Dest': 'image',
          'Sec-Fetch-Mode': 'no-cors',
          'Sec-Fetch-Site': 'cross-site'
        },
        redirect: 'follow',
        timeout: 15000 // 15 segundos timeout
      });

      if (!response.ok) {
        console.error(`❌ [Pixabay Proxy] HTTP ${response.status}: ${response.statusText}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      } else {
        res.setHeader('Content-Type', 'image/jpeg'); // Default para Pixabay
      }

      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache por 1 hora
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');

      console.log('✅ [Pixabay Proxy] Imagen cargada exitosamente');
      response.body.pipe(res);
    } catch (error) {
      console.error('❌ [Pixabay Proxy] Error completo:', error.message);
      console.error('❌ URL que falló:', imageUrl);
      res.status(500).json({
        error: 'Error al cargar imagen de Pixabay',
        details: error.message,
        url: imageUrl
      });
    }
  });

  // 📥 Endpoint para descargar imágenes de Pixabay localmente
  expressApp.post('/api/download-pixabay-image', async (req, res) => {
    console.log('\n📥 ========================================');
    console.log('📥 [Pixabay Download] Request recibido');
    console.log('📥 Body:', JSON.stringify(req.body, null, 2));

    try {
      const { imageUrl, imageId, tags } = req.body;

      if (!imageUrl) {
        console.error('❌ URL de imagen no proporcionada');
        return res.status(400).json({
          error: 'URL de imagen requerida',
          received: req.body
        });
      }

      console.log('📥 URL a descargar:', imageUrl);
      console.log('📥 ID:', imageId);

      const crypto = require('crypto');

      // Crear carpeta para imágenes de Pixabay en userData (fuera del .asar)
      const { app: electronApp } = require('electron');
      const isDev = !electronApp.isPackaged;
      const pixabayFolder = isDev
        ? path.join(__dirname, 'build', 'images', 'pixabay')
        : path.join(electronApp.getPath('userData'), 'build', 'images', 'pixabay');

      console.log('📁 Carpeta destino:', pixabayFolder);
      console.log('📁 App empaquetada:', !isDev);
      console.log('📁 userData path:', electronApp.getPath('userData'));

      try {
        if (!fs.existsSync(pixabayFolder)) {
          console.log('📁 Carpeta no existe, creando...');
          fs.mkdirSync(pixabayFolder, { recursive: true });
          console.log('✅ Carpeta creada exitosamente');
        } else {
          console.log('✅ Carpeta ya existe');
        }

        // Verificar permisos de escritura
        const testPath = path.join(pixabayFolder, '.test');
        fs.writeFileSync(testPath, 'test');
        fs.unlinkSync(testPath);
        console.log('✅ Permisos de escritura verificados');

      } catch (dirError) {
        console.error('❌ Error creando/verificando carpeta:', dirError.message);
        throw new Error(`No se puede crear carpeta: ${dirError.message}`);
      }

      // Generar nombre único para la imagen
      const extension = imageUrl.split('.').pop().split('?')[0] || 'jpg';
      const filename = `pixabay_${imageId || Date.now()}_${crypto.randomBytes(4).toString('hex')}.${extension}`;
      const filepath = path.join(pixabayFolder, filename);

      console.log('💾 Guardando como:', filename);
      console.log('📂 Ruta completa:', filepath);

      // Descargar usando https/http nativo de Node.js
      const downloadPromise = new Promise((resolve, reject) => {
        const protocol = imageUrl.startsWith('https') ? https : http;

        const downloadFile = (url) => {
          console.log('⬇️  Descargando desde:', url);

          protocol.get(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'image/*,*/*;q=0.8',
            },
            timeout: 30000
          }, (response) => {
            console.log('📡 Response status:', response.statusCode);
            console.log('📡 Response headers:', response.headers);

            // Manejar redirecciones
            if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307) {
              const redirectUrl = response.headers.location;
              console.log('↪️  Redirigiendo a:', redirectUrl);
              response.resume(); // Consumir response antes de nueva petición
              downloadFile(redirectUrl); // Recursión para seguir redirección
              return;
            }

            if (response.statusCode !== 200) {
              const errorMsg = `HTTP ${response.statusCode}: ${response.statusMessage}`;
              console.error('❌ Error en respuesta HTTP:', errorMsg);
              reject(new Error(errorMsg));
              return;
            }

            console.log('📥 Creando stream de escritura...');
            const fileStream = fs.createWriteStream(filepath);
            let downloadedBytes = 0;

            fileStream.on('open', () => {
              console.log('✅ Stream de archivo abierto');
            });

            response.on('data', (chunk) => {
              downloadedBytes += chunk.length;
              if (downloadedBytes % 100000 === 0) { // Log cada 100KB
                console.log(`📊 Descargados: ${(downloadedBytes / 1024).toFixed(0)} KB`);
              }
            });

            response.pipe(fileStream);

            fileStream.on('finish', () => {
              fileStream.close();
              console.log('✅ Stream cerrado');
              console.log('✅ Descarga completada:', downloadedBytes, 'bytes');
              resolve(downloadedBytes);
            });

            fileStream.on('error', (err) => {
              console.error('❌ Error en stream de archivo:', err.message);
              console.error('❌ Código de error:', err.code);
              fs.unlink(filepath, (unlinkErr) => {
                if (unlinkErr) console.error('❌ Error eliminando archivo parcial:', unlinkErr.message);
              });
              reject(new Error(`Error escribiendo archivo: ${err.message}`));
            });
          }).on('error', reject).on('timeout', () => {
            reject(new Error('Timeout: descarga tardó más de 30 segundos'));
          });
        };

        downloadFile(imageUrl);
      });

      await downloadPromise;

      // Verificar archivo
      const stats = fs.statSync(filepath);
      console.log('✅ Archivo guardado exitosamente');
      console.log('✅ Tamaño:', (stats.size / 1024).toFixed(2), 'KB');

      const localPath = `http://localhost:${PORT}/images/pixabay/${filename}`;
      console.log('✅ URL local:', localPath);
      console.log('✅ ========================================\n');

      res.json({
        success: true,
        localPath: localPath,
        filename: filename,
        size: stats.size
      });

    } catch (error) {
      console.error('❌ [Pixabay Download] ERROR:', error.message);
      console.error('❌ Stack:', error.stack);
      console.error('❌ ========================================\n');

      res.status(500).json({
        error: 'Error al descargar imagen',
        details: error.message,
        stack: error.stack
      });
    }
  });

  // 🏠 Ruta raíz para servir index.html
  expressApp.get('/', (req, res) => {
    const buildDir = path.join(obtenerRutaRecursos(), "build");
    const indexPath = path.join(buildDir, 'index.html');

    console.log('🏠 Ruta raíz solicitada');
    console.log('📁 Sirviendo index.html desde:', indexPath);

    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      console.error('❌ index.html no encontrado en:', indexPath);
      res.status(404).send('index.html no encontrado');
    }
  });

  // Escuchar en 0.0.0.0 explícitamente para aceptar conexiones de la red local (app móvil).
  // Sin host explícito, en Windows con IPv6 preferido puede quedar solo en '::' y rechazar IPv4.
  const servidor = expressApp.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ [Servidor] Escuchando en 0.0.0.0:${PORT} (LAN + localhost)`);
  });

  servidor.on('error', (err) => {
    console.error(`❌ [Servidor] Error al iniciar en puerto ${PORT}:`, err.message);
    const { dialog } = require('electron');
    dialog.showErrorBox(
      'Error de servidor',
      `GloryView no pudo iniciar el servidor en el puerto ${PORT}.\n\nPosible causa: el puerto ya está en uso por otra aplicación.\n\nDetalle: ${err.message}`
    );
  });

  // Windows: agregar regla de Firewall para que la app móvil pueda conectarse.
  // En producción, el .exe empaquetado no hereda la excepción de node.exe en desarrollo.
  if (app.isPackaged && process.platform === 'win32') {
    const { exec } = require('child_process');
    const ruleName = 'GloryView Proyector - Puerto 3001';
    const addRule = `netsh advfirewall firewall add rule name="${ruleName}" dir=in action=allow protocol=TCP localport=${PORT} program="${process.execPath}" enable=yes`;
    exec(addRule, (err) => {
      if (err) {
        console.warn('[Firewall] No se pudo agregar regla automáticamente (puede requerir admin):', err.message);
      } else {
        console.log(`[Firewall] Regla creada: "${ruleName}"`);
      }
    });
  }
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
      sandbox: false, // Revertido: sandbox:true bloquea media API (new Audio) en app empaquetada
    },
  });

  // ✨ APLICAR CSP Y BLOQUEADOR DE ANUNCIOS
  aplicarCSP(mainWindow);
  bloquearAnuncios(mainWindow);

  // ✨ CARGAR URL SEGÚN ENTORNO
  const isDev = !app.isPackaged;
  console.log(`🔧 NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`📦 app.isPackaged: ${app.isPackaged}`);
  console.log(`🚀 isDev: ${isDev}`);

  if (isDev) {
    console.log("📍 Cargando desde servidor de desarrollo");
    mainWindow.loadURL("http://localhost:3000");
  } else {
    console.log("📍 Cargando desde servidor Express de producción");
    mainWindow.loadURL("http://localhost:3001");
  }

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
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[RENDERER] ${message}`);
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
            {
              label: "Nueva Presentación",
              accelerator: "CmdOrCtrl+Shift+N",
              click: () => {
                if (mainWindow) {
                  mainWindow.webContents.send('navegar-a-ruta', '/presentacion-manager');
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
          label: "Presentaciones",
          accelerator: "CmdOrCtrl+P",
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('navegar-a-ruta', '/presentacion-manager');
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
          label: "Guía de Inicio Rápido",
          click: () => {
            shell.openExternal("https://github.com/Alfredo-Hammer/my-church-proyector/wiki");
          },
        },
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
• Ctrl/Cmd + P: Presentaciones
• Ctrl/Cmd + M: Multimedia
• Ctrl/Cmd + F: Favoritos

📽️ PROYECCIÓN:
• F11: Abrir/Cerrar Proyector
• Escape: Cerrar Proyector
• Ctrl/Cmd + L: Limpiar Pantalla

✨ CREACIÓN:
• Ctrl/Cmd + N: Nuevo Himno
• Ctrl/Cmd + Shift + N: Nueva Presentación
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
        {
          label: "Reportar Problema",
          click: () => {
            shell.openExternal("https://github.com/Alfredo-Hammer/my-church-proyector/issues");
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
  const externalDisplay = displays.find(
    (d) => d.bounds.x !== 0 || d.bounds.y !== 0
  );

  // ✨ Usar pantalla externa si está disponible, sino usar la principal
  let displayBounds;
  if (externalDisplay) {
    displayBounds = externalDisplay.bounds;
    console.log("✅ [MAIN] Usando pantalla externa para proyector");
  } else {
    displayBounds = displays[0].bounds;
    console.log("⚠️ [MAIN] No se encontró pantalla externa, usando pantalla principal");
  }

  proyectorWindow = new BrowserWindow({
    x: displayBounds.x,
    y: displayBounds.y,
    width: displayBounds.width,
    height: displayBounds.height,
    icon: path.join(obtenerRutaRecursos(), 'assets', 'icon-256.png'), // ✨ ICONO HD PERSONALIZADO
    fullscreen: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      webSecurity: true,
      contextIsolation: true,
      nodeIntegration: false,
      allowRunningInsecureContent: false,
      sandbox: false, // Revertido: sandbox:true bloquea media API en ventana proyector empaquetada
      // ✨ MEJORAS PARA ALTA CALIDAD
      hardwareAcceleration: true, // Acelerar hardware para mejor rendimiento
      enableBlinkFeatures: 'CSSBackdropFilter', // Mejor soporte para filtros CSS
      experimentalFeatures: false,
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

// --- App Ready ---
app.whenReady().then(async () => {
  try {
    writeLog("✅ Electron app ready - Iniciando GloryView Proyector");

    // ✨ CONFIGURAR NOMBRE DE LA APLICACIÓN
    app.setName('GloryView');
    writeLog("✅ Nombre de aplicación configurado");

    // Inicializar la nueva base de datos
    try {
      writeLog("Inicializando base de datos...");
      await dbNew.initializeDatabase();
      writeLog('✅ Base de datos inicializada correctamente');
      console.log('Base de datos inicializada correctamente');
    } catch (error) {
      writeLog(`❌ Error al inicializar la base de datos: ${error.message}`);
      console.error('Error al inicializar la base de datos:', error);
      // No bloquear la app, continuar
    }

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

    // ✨ LIMPIAR HANDLERS ANTES DE CREAR VENTANAS
    try {
      writeLog("Limpiando handlers IPC...");
      limpiarHandlers();
      writeLog("✅ Handlers limpiados");
    } catch (error) {
      writeLog(`❌ Error limpiando handlers: ${error.message}`);
      console.error("Error limpiando handlers:", error);
    }

    // ✨ REGISTRAR TODOS LOS HANDLERS DESPUÉS DE LIMPIAR
    try {
      writeLog("Registrando handlers IPC...");
      registrarHandlers();
      writeLog("✅ Handlers registrados");
    } catch (error) {
      writeLog(`❌ Error registrando handlers: ${error.message}`);
      console.error("Error registrando handlers:", error);
      // Mostrar diálogo de error crítico
      dialog.showErrorBox(
        "Error Crítico - GloryView",
        `No se pudieron registrar los handlers IPC:\n\n${error.message}\n\nLa aplicación puede no funcionar correctamente.`
      );
    }

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

    writeLog("✅ GloryView Proyector iniciado exitosamente");

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
        // No crear proyector automáticamente en activate
      }
    });

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

    // ✨ INICIAR SERVIDOR DE MULTIMEDIA
    iniciarServidorMultimedia();

  } catch (error) {
    // ✨ CAPTURA DE ERRORES GLOBAL DEL APP.WHENREADY
    const errorMsg = `❌ ERROR FATAL en app.whenReady(): ${error.message}\n${error.stack}`;
    writeLog(errorMsg);
    console.error(errorMsg);

    dialog.showErrorBox(
      "Error Fatal - GloryView Proyector",
      `La aplicación no pudo iniciar correctamente:\n\n${error.message}\n\nDetalles en:\n${logFilePath}\n\nPresione OK para cerrar.`
    );

    app.quit();
  }
});

// ✨ Cerrar proyector cuando se cierra la ventana principal
app.on("window-all-closed", () => {
  console.log("🚪 [MAIN] Todas las ventanas cerradas");

  // Cerrar la base de datos
  dbNew.cerrarDB();

  // ✨ IMPORTANTE: Cerrar el proyector si existe
  if (proyectorWindow && !proyectorWindow.isDestroyed()) {
    console.log("🔴 [MAIN] Cerrando ventana del proyector");
    proyectorWindow.close();
    proyectorWindow = null;
  }

  if (process.platform !== "darwin") {
    console.log("👋 [MAIN] Saliendo de la aplicación");
    app.quit();
  }
});

// ✨ NUEVO: Cerrar proyector cuando se cierra la ventana principal
app.on("before-quit", () => {
  console.log("⚠️ [MAIN] before-quit: Cerrando proyector");
  if (proyectorWindow && !proyectorWindow.isDestroyed()) {
    proyectorWindow.close();
    proyectorWindow = null;
  }
});

// ✨ FUNCIÓN COMPLETA PARA REGISTRAR TODOS LOS HANDLERS
function registrarHandlers() {
  console.log("🔧 [Main] Registrando handlers...");

  // ====================================
  // HANDLERS DE FONDOS
  // ====================================

  // Handler para obtener todos los fondos
  ipcMain.handle("obtener-fondos", async () => {
    try {
      console.log("📋 [Main] Obteniendo fondos...");
      const fondos = await dbNew.obtenerFondos();

      // Transformar los datos para que sean compatibles con el frontend
      const fondosTransformados = fondos.map(fondo => {
        // Convertir la ruta de archivo local a URL del servidor Express
        let rutaURL = fondo.url;

        // 1) Si ya es absoluta, dejarla tal cual
        // 2) Si es una ruta relativa tipo "/fondos/..." o "/images/...", solo prefijar host
        // 3) Si es una ruta local (filesystem) u otra forma, fallback a /fondos/<basename>
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

        return {
          id: fondo.id,
          url: rutaURL, // ✨ Usar 'url' en lugar de 'ruta' para compatibilidad con frontend
          tipo: fondo.tipo || 'imagen',
          nombre: fondo.nombre || `Fondo ${fondo.id}`,
          activo: Boolean(fondo.activo),
          created_at: fondo.created_at || new Date().toISOString()
        };
      });

      console.log("✅ [Main] Fondos transformados:", fondosTransformados?.length || 0);
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

      const ok = await dbNew.actualizarFondo(fondoData);
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
      const fondos = await dbNew.obtenerFondos();
      const fondo = fondos.find(f => f.activo);
      console.log("✅ [Main] Fondo activo obtenido:", fondo);
      return fondo || null;
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
      const resultado = await dbNew.crearFondo({
        url,
        tipo,
        activo: activo ? 1 : 0
      });

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
      const resultado = await dbNew.activarFondo(id);

      if (resultado) {
        const fondos = await dbNew.obtenerFondos();
        const fondoActivo = fondos.find(f => f.activo);

        // Notificar a todas las ventanas sobre el cambio
        const todasLasVentanas = BrowserWindow.getAllWindows();
        todasLasVentanas.forEach(ventana => {
          if (!ventana.isDestroyed()) {
            ventana.webContents.send("actualizar-fondo-activo", fondoActivo);
          }
        });

        console.log("✅ [Main] Fondo activo establecido:", fondoActivo);
      }

      return resultado;
    } catch (error) {
      console.error("❌ [Main] Error estableciendo fondo activo:", error);
      return false;
    }
  });

  // Handler ÚNICO para eliminar fondo
  ipcMain.handle("eliminar-fondo", async (event, id) => {
    try {
      console.log("🗑️ [Main] Eliminando fondo:", id);
      const resultado = await dbNew.eliminarFondo(id);
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

      const result = await dialog.showOpenDialog(mainWindow, {
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

      const fileName = path.basename(sourcePath);
      const uniqueName = `${Date.now()}-${fileName}`;
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

      const fileName = path.basename(sourcePath);
      const uniqueName = `${Date.now()}-${fileName}`;
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

      const result = await dialog.showOpenDialog(mainWindow, {
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
      const extensionesImagen = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
      const extensionesVideo = ['.mp4', '.avi', '.mov', '.wmv', '.webm', '.mkv'];
      const extensionesSoportadas = [...extensionesImagen, ...extensionesVideo];

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
          const tipo = extensionesImagen.includes(extension) ? 'imagen' : 'video';

          // Generar nombre único para el archivo
          const nombreUnico = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${archivo}`;
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
      const extensionesImagen = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
      const extensionesVideo = ['.mp4', '.avi', '.mov', '.wmv', '.webm', '.mkv'];
      const extensionesSoportadas = [...extensionesImagen, ...extensionesVideo];

      const archivosValidos = archivos.filter(archivo => {
        const extension = path.extname(archivo).toLowerCase();
        return extensionesSoportadas.includes(extension);
      });

      console.log(`🔍 [Main] Archivos en carpeta fondos: ${archivos.length}, válidos: ${archivosValidos.length}`);

      // Obtener fondos ya existentes en BD
      const fondosExistentes = obtenerFondos();
      const urlsExistentes = fondosExistentes.map(f => f.url);

      let agregados = 0;
      let yaExistentes = 0;

      for (const archivo of archivosValidos) {
        try {
          const rutaRelativa = `/fondos/${archivo}`;

          // Verificar si ya existe en BD
          if (urlsExistentes.includes(rutaRelativa)) {
            yaExistentes++;
            console.log(`ℹ️ [Main] Ya existe en BD: ${archivo}`);
            continue;
          }

          const extension = path.extname(archivo).toLowerCase();
          const tipo = extensionesImagen.includes(extension) ? 'imagen' : 'video';
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

  // ====================================
  // HANDLERS IPC COMUNICACIÓN
  // ====================================

  // Proyectar himno
  ipcMain.on("proyectar-himno", (event, himno) => {
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
  });

  // Cerrar el proyector
  ipcMain.on("cerrar-proyector", () => {
    if (proyectorWindow) {
      proyectorWindow.close();
      proyectorWindow = null;
    }
  });

  // Abrir el proyector manualmente
  ipcMain.on("abrir-proyector", () => {
    if (!proyectorWindow) {
      createProyectorWindow();
    }
  });

  // ✨ Handler para abrir proyector como invoke (para async/await)
  ipcMain.handle("abrir-proyector", async () => {
    try {
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
    if (proyectorWindow) {
      const rutaConProtocolo = `file://${filePath}`;
      proyectorWindow.webContents.send("fondo-seleccionado", { ruta: rutaConProtocolo, tipo });
    }
  });

  // Handler para notificar cambio de fondo activo
  ipcMain.on("fondo-activo-cambiado", (event, fondo) => {
    console.log("📡 [Main] Notificando cambio de fondo activo:", fondo);

    // Enviar a proyector si existe
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

  // ====================================
  // ✨ HANDLERS DE MULTIMEDIA ACTIVA
  // ====================================

  // Establecer multimedia como activa
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

  // Obtener multimedia activa
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

  // Limpiar multimedia activa
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

  // ✨ HANDLERS PARA CONTROL REMOTO DEL PROYECTOR
  ipcMain.on("proyector-play", (event) => {
    console.warn("🎮 [Main] Comando play recibido para proyector");
    if (proyectorWindow && !proyectorWindow.isDestroyed()) {
      proyectorWindow.webContents.send("control-multimedia", { action: "play" });
      console.warn("▶️ [Main] Comando play enviado al proyector");
    } else {
      console.warn("⚠️ [Main] No hay proyectorWindow activo para enviar PLAY");
    }
  });

  ipcMain.on("proyector-pause", (event) => {
    console.warn("🎮 [Main] Comando pause recibido para proyector");
    if (proyectorWindow && !proyectorWindow.isDestroyed()) {
      proyectorWindow.webContents.send("control-multimedia", { action: "pause" });
      console.warn("⏸️ [Main] Comando pause enviado al proyector");
    } else {
      console.warn("⚠️ [Main] No hay proyectorWindow activo para enviar PAUSE");
    }
  });

  ipcMain.on("proyector-stop", (event) => {
    console.warn("🎮 [Main] Comando stop recibido para proyector");
    if (proyectorWindow && !proyectorWindow.isDestroyed()) {
      proyectorWindow.webContents.send("control-multimedia", { action: "stop" });
      console.warn("⏹️ [Main] Comando stop enviado al proyector");
    } else {
      console.warn("⚠️ [Main] No hay proyectorWindow activo para enviar STOP");
    }
  });

  ipcMain.on("proyector-limpiar", (event) => {
    console.warn("🎮 [Main] Comando limpiar recibido para proyector");
    if (proyectorWindow && !proyectorWindow.isDestroyed()) {
      proyectorWindow.webContents.send("control-multimedia", { action: "limpiar" });
      console.warn("🧹 [Main] Comando limpiar enviado al proyector");
    } else {
      console.warn("⚠️ [Main] No hay proyectorWindow activo para enviar LIMPIAR");
    }
  });

  // ✨ Handler genérico para controles adicionales (volumen/seek, etc.)
  ipcMain.on("proyector-control-multimedia", (event, payload) => {
    console.warn("🎮 [Main] Control multimedia genérico recibido:", payload);
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
    console.warn("📩 [Main] Proyector ACK control:", {
      senderId: event?.sender?.id,
      ...data,
    });
  });

  // ✨ Estado de reproducción (para barra de progreso móvil)
  ipcMain.on("multimedia-playback-status", (_event, payload) => {
    try {
      const destinoRaw = String(payload?.destino || payload?.target || 'proyector').toLowerCase();
      const destino = destinoRaw === 'pc' ? 'pc' : 'proyector';

      const currentTimeNum = Number(payload?.currentTime);
      const durationNum = Number(payload?.duration);
      const volumeNum = payload?.volume === null || payload?.volume === undefined ? null : Number(payload?.volume);

      multimediaPlaybackStatus[destino] = {
        updatedAt: Date.now(),
        id: ('id' in payload) ? payload.id : (multimediaPlaybackStatus[destino]?.id ?? null),
        nombre: ('nombre' in payload) ? (payload.nombre ? String(payload.nombre) : null) : (multimediaPlaybackStatus[destino]?.nombre ?? null),
        currentTime: Number.isFinite(currentTimeNum) && currentTimeNum >= 0 ? currentTimeNum : 0,
        duration: Number.isFinite(durationNum) && durationNum >= 0 ? durationNum : 0,
        paused: Boolean(payload?.paused),
        volume: Number.isFinite(volumeNum) && volumeNum >= 0 ? Math.min(1, Math.max(0, volumeNum)) : null,
        tipo: payload?.tipo ? String(payload.tipo) : null,
      };
    } catch {
      // noop
    }
  });

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

  ipcMain.handle("agregar-himno", async (event, nuevoHimno) => {
    try {
      const { numero, titulo, letra, favorito } = nuevoHimno;
      const id = await dbNew.crearHimno({
        numero,
        titulo,
        letra: JSON.stringify(letra),
        favorito: favorito ? 1 : 0
      });
      return { success: true, id };
    } catch (error) {
      console.error("Error en agregar-himno:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("obtener-himnos", async () => {
    try {
      const himnos = await dbNew.obtenerHimnos();
      return himnos.map(himno => ({
        ...himno,
        letra: JSON.parse(himno.letra || '[]'),
        favorito: Boolean(himno.favorito)
      }));
    } catch (error) {
      console.error("Error al obtener los himnos:", error);
      throw error;
    }
  });

  ipcMain.handle("obtener-himno-por-id", async (event, id) => {
    try {
      const himno = await dbNew.obtenerHimnoPorId(id);
      if (!himno) {
        throw new Error("Himno no encontrado");
      }
      return {
        ...himno,
        letra: JSON.parse(himno.letra || '[]'),
        favorito: Boolean(himno.favorito)
      };
    } catch (error) {
      console.error("Error al obtener el himno:", error);
      throw error;
    }
  });

  ipcMain.handle("actualizar-himno", async (event, himno) => {
    try {
      const { id, numero, titulo, letra } = himno;
      const success = await dbNew.actualizarHimno(id, {
        numero,
        titulo,
        letra: JSON.stringify(letra),
        favorito: himno.favorito ? 1 : 0
      });
      return { success };
    } catch (error) {
      console.error("Error al actualizar el himno:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("eliminar-himno", async (event, id) => {
    try {
      const success = await dbNew.eliminarHimno(id);
      return { success };
    } catch (error) {
      console.error("Error al eliminar el himno:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("obtener-favoritos", async () => {
    try {
      const himnos = await dbNew.obtenerHimnos();
      const favoritos = himnos.filter(himno => himno.favorito);
      return favoritos.map(himno => ({
        ...himno,
        letra: JSON.parse(himno.letra || '[]'),
        favorito: Boolean(himno.favorito)
      }));
    } catch (error) {
      console.error("Error al obtener favoritos:", error);
      throw error;
    }
  });

  ipcMain.handle("marcar-favorito", async (event, { id, favorito }) => {
    try {
      const himno = await dbNew.obtenerHimnoPorId(id);
      if (!himno) {
        throw new Error("Himno no encontrado");
      }

      const success = await dbNew.actualizarHimno(id, {
        ...himno,
        favorito: favorito ? 1 : 0
      });
      return success;
    } catch (error) {
      console.error("Error al marcar favorito:", error);
      throw error;
    }
  });

  ipcMain.handle("eliminar-favorito", async (event, id) => {
    try {
      const himno = await dbNew.obtenerHimnoPorId(id);
      if (!himno) {
        throw new Error("Himno no encontrado");
      }

      const success = await dbNew.actualizarHimno(id, {
        ...himno,
        favorito: 0
      });
      console.log(`Himno con ID ${id} marcado como no favorito.`);
      return success;
    } catch (error) {
      console.error("Error al marcar el himno como no favorito:", error);
      throw error;
    }
  });

  //Mostrar versículo
  ipcMain.on("proyectar-versiculo", (event, versiculo) => {
    if (!proyectorWindow) {
      const nuevaVentana = createProyectorWindow();
      if (!nuevaVentana) return;

      nuevaVentana.webContents.once("did-finish-load", () => {
        // ✨ Dar tiempo para que React monte los componentes (1 segundo)
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
  });

  // ====================================
  // HANDLERS DE PRESENTACIONES
  // ====================================

  ipcMain.handle("agregar-presentacion", (event, presentacion) => {
    try {
      agregarPresentacion(presentacion);
      return { success: true };
    } catch (error) {
      console.error("Error al guardar la presentación:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("obtener-presentaciones", async () => {
    try {
      const presentaciones = obtenerPresentaciones();
      return presentaciones.map((row) => ({
        ...row,
        fecha: row.fecha ? new Date(row.fecha).toISOString().split("T")[0] : null,
      }));
    } catch (error) {
      console.error("Error al obtener las presentaciones:", error);
      throw error;
    }
  });

  ipcMain.handle("editar-presentacion", async (event, presentacion) => {
    try {
      // La función editarPresentacion espera el objeto completo con el id incluido
      editarPresentacion(presentacion);
      return { success: true };
    } catch (error) {
      console.error("Error al editar la presentación:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("eliminar-presentacion", async (event, id) => {
    try {
      eliminarPresentacion(id);
      return { success: true };
    } catch (error) {
      console.error("Error al eliminar la presentación:", error);
      return { success: false, error: error.message };
    }
  });

  // ====================================
  // HANDLERS DE PRESENTACIONES SLIDES
  // ====================================

  // Obtener todas las presentaciones de slides
  ipcMain.handle("obtener-presentaciones-slides", async () => {
    try {
      return obtenerPresentacionesSlides();
    } catch (error) {
      console.error("❌ [MAIN] Error obteniendo presentaciones slides:", error);
      return [];
    }
  });

  // Obtener presentación slides por ID
  ipcMain.handle("obtener-presentacion-slides-por-id", async (event, id) => {
    try {
      return obtenerPresentacionSlidesPorId(id);
    } catch (error) {
      console.error("❌ [MAIN] Error obteniendo presentación slides por ID:", error);
      return null;
    }
  });

  // Agregar nueva presentación slides
  ipcMain.handle("agregar-presentacion-slides", async (event, presentacionData) => {
    try {
      console.log("📥 [MAIN] Recibiendo datos para agregar presentación slides:", presentacionData.nombre);
      const result = agregarPresentacionSlides(presentacionData);
      console.log("📤 [MAIN] Resultado de agregarPresentacionSlides:", result);
      return result;
    } catch (error) {
      console.error("❌ [MAIN] Error agregando presentación slides:", error);
      return { success: false, error: error.message };
    }
  });

  // Actualizar presentación slides
  ipcMain.handle("actualizar-presentacion-slides", async (event, presentacionData) => {
    try {
      return actualizarPresentacionSlides(presentacionData);
    } catch (error) {
      console.error("❌ [MAIN] Error actualizando presentación slides:", error);
      return { success: false, error: error.message };
    }
  });

  // Eliminar presentación slides
  ipcMain.handle("eliminar-presentacion-slides", async (event, id) => {
    try {
      return eliminarPresentacionSlides(id);
    } catch (error) {
      console.error("❌ [MAIN] Error eliminando presentación slides:", error);
      return { success: false, error: error.message };
    }
  });

  // Duplicar presentación slides
  ipcMain.handle("duplicar-presentacion-slides", async (event, id) => {
    try {
      return duplicarPresentacionSlides(id);
    } catch (error) {
      console.error("❌ [MAIN] Error duplicando presentación slides:", error);
      return { success: false, error: error.message };
    }
  });

  // Actualizar favorito de presentación slides
  ipcMain.handle("actualizar-favorito-presentacion-slides", async (event, id, favorito) => {
    try {
      return actualizarFavoritoPresentacionSlides(id, favorito);
    } catch (error) {
      console.error("❌ [MAIN] Error actualizando favorito:", error);
      return { success: false, error: error.message };
    }
  });

  // Actualizar slide actual de presentación
  ipcMain.handle("actualizar-slide-actual-presentacion", async (event, id, slideIndex) => {
    try {
      return actualizarSlideActualPresentacion(id, slideIndex);
    } catch (error) {
      console.error("❌ [MAIN] Error actualizando slide actual:", error);
      return { success: false, error: error.message };
    }
  });

  // Exportar presentación slides
  ipcMain.handle("exportar-presentacion-slides", async (event, id) => {
    try {
      return exportarPresentacionSlides(id);
    } catch (error) {
      console.error("❌ [MAIN] Error exportando presentación slides:", error);
      return { success: false, error: error.message };
    }
  });

  // Importar presentación slides desde JSON
  ipcMain.handle("importar-presentacion-slides", async (event, datosImportar, nombreArchivo) => {
    try {
      return importarPresentacionSlides(datosImportar, nombreArchivo);
    } catch (error) {
      console.error("❌ [MAIN] Error importando presentación slides:", error);
      return { success: false, error: error.message };
    }
  });

  // Obtener estadísticas de presentaciones slides
  ipcMain.handle("obtener-estadisticas-presentaciones-slides", async () => {
    try {
      return obtenerEstadisticasPresentacionesSlides();
    } catch (error) {
      console.error("❌ [MAIN] Error obteniendo estadísticas:", error);
      return {
        total: 0,
        favoritas: 0,
        powerpoint: 0,
        imagenes: 0,
        personalizadas: 0,
        total_slides: 0,
        promedio_slides: 0
      };
    }
  });

  // ====================================
  // HANDLER: PowerPoint -> PNG (preservar diseño)
  // ====================================

  ipcMain.handle("convertir-pptx-a-imagenes", async (event, sourcePath) => {
    try {
      if (!sourcePath || typeof sourcePath !== "string") {
        return { success: false, error: "Ruta de archivo inválida" };
      }

      const ext = path.extname(sourcePath).toLowerCase();
      if (ext !== ".pptx" && ext !== ".ppt") {
        return { success: false, error: "El archivo debe ser .ppt o .pptx" };
      }

      if (!fs.existsSync(sourcePath)) {
        return { success: false, error: "El archivo no existe" };
      }

      const libreOfficeBin = encontrarLibreOfficeBin();
      if (!libreOfficeBin) {
        return {
          success: false,
          error:
            "LibreOffice no está disponible. Instálalo para importar PowerPoint conservando el diseño.",
        };
      }

      const rutaBase = obtenerRutaBase();
      const uploadsBaseDir = path.join(rutaBase, "public", "uploads");
      const jobId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const outDir = path.join(uploadsBaseDir, "pptx", jobId);
      fs.mkdirSync(outDir, { recursive: true });

      // Convertir a PNG (una imagen por slide)
      const ordenados = await convertirPptxAImagenesEnDirectorio({
        libreOfficeBin,
        sourcePath,
        outDir,
      });
      if (ordenados.length === 0) {
        return {
          success: false,
          error:
            "No se generaron imágenes. Verifica que el PPTX no esté protegido o dañado.",
        };
      }

      // Construir URLs servidas por el servidor local (puerto 3001)
      const baseUrl = "http://localhost:3001/uploads";
      const imageUrls = ordenados.map(
        (fileName) => `${baseUrl}/pptx/${jobId}/${encodeURIComponent(fileName)}`,
      );

      return {
        success: true,
        jobId,
        imageUrls,
      };
    } catch (error) {
      console.error("❌ [MAIN] Error convertir-pptx-a-imagenes:", error);
      return { success: false, error: error.message };
    }
  });

  // Alternativa: convertir PPTX desde buffer (cuando File.path no está disponible)
  ipcMain.handle(
    "convertir-pptx-buffer-a-imagenes",
    async (event, payload) => {
      try {
        const fileName = String(payload?.fileName || "Presentacion.pptx");
        const data = payload?.data;

        const ext = path.extname(fileName).toLowerCase();
        if (ext !== ".pptx" && ext !== ".ppt") {
          return { success: false, error: "El archivo debe ser .ppt o .pptx" };
        }

        if (!data) {
          return { success: false, error: "No se recibió contenido del archivo" };
        }

        const libreOfficeBin = encontrarLibreOfficeBin();
        if (!libreOfficeBin) {
          return {
            success: false,
            error:
              "LibreOffice no está disponible. Instálalo para importar PowerPoint conservando el diseño.",
          };
        }

        const rutaBase = obtenerRutaBase();
        const uploadsBaseDir = path.join(rutaBase, "public", "uploads");
        const jobId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const outDir = path.join(uploadsBaseDir, "pptx", jobId);
        fs.mkdirSync(outDir, { recursive: true });

        const safeInputName = `__input${ext}`;
        const inputPath = path.join(outDir, safeInputName);
        const buffer = Buffer.isBuffer(data)
          ? data
          : data instanceof ArrayBuffer
            ? Buffer.from(new Uint8Array(data))
            : Buffer.from(data);
        fs.writeFileSync(inputPath, buffer);

        const ordenados = await convertirPptxAImagenesEnDirectorio({
          libreOfficeBin,
          sourcePath: inputPath,
          outDir,
        });

        if (ordenados.length === 0) {
          return {
            success: false,
            error:
              "No se generaron imágenes. Verifica que el PPTX no esté protegido o dañado.",
          };
        }

        const baseUrl = "http://localhost:3001/uploads";
        const imageUrls = ordenados.map(
          (pngName) => `${baseUrl}/pptx/${jobId}/${encodeURIComponent(pngName)}`,
        );

        return { success: true, jobId, imageUrls };
      } catch (error) {
        console.error(
          "❌ [MAIN] Error convertir-pptx-buffer-a-imagenes:",
          error,
        );
        return { success: false, error: error.message };
      }
    },
  );

  // ====================================
  // HANDLERS DEL PROYECTOR
  // ====================================

  // Abrir proyector con slide específico
  ipcMain.handle("proyectar-slide", async (event, slideData) => {
    try {
      console.log("📺 [MAIN] Iniciando proyección de slide:", slideData);

      // Verificar si existe ventana del proyector
      if (!proyectorWindow || proyectorWindow.isDestroyed()) {
        console.log("🆕 [MAIN] Creando nueva ventana del proyector");
        proyectorWindow = createProyectorWindow();
        if (!proyectorWindow) {
          return { success: false, error: "No se pudo crear la ventana del proyector" };
        }

        // Esperar a que la página se cargue completamente
        await new Promise((resolve) => {
          proyectorWindow.webContents.once('did-finish-load', resolve);
        });

        // Dar tiempo adicional para que React se inicialice
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Enfocar y maximizar la ventana del proyector
      proyectorWindow.focus();
      proyectorWindow.setFullScreen(true);

      // Verificar que el contenido web esté listo
      if (proyectorWindow.webContents.isLoading()) {
        console.log("⏳ [MAIN] Esperando que la página termine de cargar...");
        await new Promise((resolve) => {
          proyectorWindow.webContents.once('did-finish-load', resolve);
        });
      }

      // Enviar datos del slide al proyector
      console.log("📤 [MAIN] Enviando datos del slide al proyector");
      proyectorWindow.webContents.send("proyectar-slide-data", slideData);

      console.log("✅ [MAIN] Slide proyectado correctamente");
      return { success: true };
    } catch (error) {
      console.error("❌ [MAIN] Error proyectando slide:", error);
      return { success: false, error: error.message };
    }
  });

  // Limpiar proyector
  ipcMain.handle("limpiar-proyector", async () => {
    try {
      if (proyectorWindow && !proyectorWindow.isDestroyed()) {
        proyectorWindow.webContents.send("limpiar-proyector");
        console.log("✅ [MAIN] Proyector limpiado");
        return { success: true };
      }
      return { success: false, error: "Ventana del proyector no disponible" };
    } catch (error) {
      console.error("❌ [MAIN] Error limpiando proyector:", error);
      return { success: false, error: error.message };
    }
  });

  // ====================================
  // HANDLERS DE CONFIGURACIÓN
  // ====================================

  ipcMain.handle('obtener-configuracion', async () => {
    try {
      console.log("🔍 [Main] Obteniendo configuración...");
      const config = {};

      // Obtener todas las configuraciones disponibles
      const claves = [
        'nombreIglesia', 'eslogan', 'pastor', 'telefono', 'email',
        'direccion', 'sitioWeb', 'horarioCultos', 'logoUrl',
        'colorPrimario', 'colorSecundario',
        // ✨ Claves de fontSize
        'fontSizeTitulo', 'fontSizeParrafo', 'fontSizeEslogan',
        // ✨ NUEVAS CLAVES DE VISIBILIDAD
        'mostrarLogo', 'mostrarNombreIglesia', 'mostrarEslogan'
      ];

      for (const clave of claves) {
        const valor = await dbNew.obtenerConfiguracion(clave);
        if (valor !== null) {
          // ✨ Convertir valores booleanos
          if (valor === 'true' || valor === 'false') {
            config[clave] = valor === 'true';
          } else {
            config[clave] = valor;
          }
        }
      }

      console.log("📋 [Main] Configuración obtenida:", config);
      return config;
    } catch (error) {
      console.error('❌ [Main] Error obteniendo configuración:', error);
      return null;
    }
  });

  ipcMain.handle('guardar-configuracion', async (event, configuracion) => {
    try {
      console.log("💾 [Main] Guardando configuración:", configuracion);
      let resultado = true;

      for (const [clave, valor] of Object.entries(configuracion)) {
        const success = await dbNew.actualizarConfiguracion(clave, valor);
        if (!success) {
          resultado = false;
        }
      }

      if (resultado) {
        const todasLasVentanas = BrowserWindow.getAllWindows();
        todasLasVentanas.forEach(ventana => {
          if (!ventana.isDestroyed()) {
            console.log("📡 [Main] Notificando configuración actualizada");
            ventana.webContents.send("configuracion-actualizada", configuracion);
          }
        });
      }

      console.log("✅ [Main] Resultado guardado:", resultado);
      return resultado;
    } catch (error) {
      console.error('❌ [Main] Error guardando configuración:', error);
      return false;
    }
  });

  ipcMain.handle('restaurar-configuracion-defecto', async () => {
    try {
      console.log("🔄 [Main] Restaurando configuración por defecto...");
      // Usar la nueva función que limpia y restaura los valores
      const resultado = await dbNew.restaurarConfiguracionDefecto();

      if (resultado) {
        console.log("✅ [Main] Configuración restaurada exitosamente");

        // Notificar a todas las ventanas sobre la restauración
        const todasLasVentanas = BrowserWindow.getAllWindows();
        todasLasVentanas.forEach(ventana => {
          if (!ventana.isDestroyed()) {
            console.log("📡 [Main] Notificando configuración restaurada");
            ventana.webContents.send("configuracion-actualizada", {});
          }
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ [Main] Error restaurando configuración:', error);
      return false;
    }
  });

  ipcMain.handle('obtener-configuracion-clave', async (event, clave) => {
    try {
      console.log(`🔍 [Main] Obteniendo configuración por clave: ${clave}`);
      const valor = await dbNew.obtenerConfiguracion(clave);
      console.log(`📋 [Main] Valor obtenido para ${clave}:`, valor);
      return valor;
    } catch (error) {
      console.error('❌ [Main] Error obteniendo configuración por clave:', error);
      return null;
    }
  });

  ipcMain.handle('actualizar-configuracion-clave', async (event, clave, valor) => {
    try {
      console.log(`💾 [Main] Actualizando ${clave} con valor:`, valor);
      const resultado = await dbNew.actualizarConfiguracion(clave, valor);
      console.log(`✅ [Main] Resultado actualización ${clave}:`, resultado);
      return resultado;
    } catch (error) {
      console.error('❌ [Main] Error actualizando configuración:', error);
      return false;
    }
  });

  // ============================================================
  // VALIDACIÓN DE ARCHIVOS: magic numbers + tamaño + extensión
  // ============================================================
  const LIMITES_MB = {
    logo:      10,
    imagen:    50,
    audio:    500,
    video:   2048,
    documento: 100,
  };

  const EXTENSIONES_PERMITIDAS = {
    logo:      ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
    imagen:    ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'],
    audio:     ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'],
    video:     ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v'],
    documento: ['.pdf', '.pptx', '.ppt', '.key'],
  };

  // Devuelve true si el buffer corresponde al tipo indicado por la extensión
  function verificarMagicNumber(buffer, ext) {
    const e = ext.toLowerCase().replace('.', '');
    if (buffer.length < 12) return false;
    switch (e) {
      case 'jpg': case 'jpeg':
        return buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
      case 'png':
        return buffer.slice(0, 8).equals(Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]));
      case 'gif':
        return buffer.slice(0, 6).equals(Buffer.from('GIF87a')) ||
               buffer.slice(0, 6).equals(Buffer.from('GIF89a'));
      case 'webp':
        return buffer.slice(0, 4).equals(Buffer.from('RIFF')) &&
               buffer.slice(8, 12).equals(Buffer.from('WEBP'));
      case 'pdf':
        return buffer.slice(0, 4).equals(Buffer.from('%PDF'));
      case 'mp3':
        return (buffer[0] === 0xFF && (buffer[1] & 0xE0) === 0xE0) || // sync frame
               buffer.slice(0, 3).equals(Buffer.from('ID3'));
      case 'wav':
        return buffer.slice(0, 4).equals(Buffer.from('RIFF')) &&
               buffer.slice(8, 12).equals(Buffer.from('WAVE'));
      case 'ogg':
        return buffer.slice(0, 4).equals(Buffer.from('OggS'));
      case 'mp4': case 'mov': case 'm4a': case 'm4v':
        return buffer.slice(4, 8).equals(Buffer.from('ftyp'));
      case 'webm':
        return buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3;
      case 'pptx': case 'ppt':
        return buffer.slice(0, 4).equals(Buffer.from([0x50,0x4B,0x03,0x04])); // ZIP
      default:
        return true; // Sin firma definida → validación por extensión es suficiente
    }
  }

  function validarArchivoUpload(buffer, extension, categoria) {
    const limiteMB = LIMITES_MB[categoria] ?? LIMITES_MB.documento;
    const limiteBytes = limiteMB * 1024 * 1024;
    if (buffer.length > limiteBytes) {
      throw new Error(`Archivo demasiado grande (${Math.round(buffer.length/1024/1024)} MB). Límite: ${limiteMB} MB`);
    }
    const extsPermitidas = EXTENSIONES_PERMITIDAS[categoria];
    if (extsPermitidas && !extsPermitidas.includes(extension.toLowerCase())) {
      throw new Error(`Extensión "${extension}" no permitida para ${categoria}`);
    }
    if (!verificarMagicNumber(buffer, extension)) {
      throw new Error(`El contenido del archivo no corresponde a la extensión "${extension}"`);
    }
  }
  // ============================================================

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

  // Función para subir archivos de presentación
  ipcMain.handle('subir-archivo-presentacion', async (event, archivoData) => {
    try {
      console.log('📤 [MAIN] Subiendo archivo:', archivoData.nombre);

      // Crear carpeta de archivos si no existe
      const archivosDir = path.join(__dirname, 'data', 'archivos');
      if (!fs.existsSync(archivosDir)) {
        fs.mkdirSync(archivosDir, { recursive: true });
      }

      // Crear subcarpetas por tipo
      const tiposDir = {
        imagen: path.join(archivosDir, 'imagenes'),
        video: path.join(archivosDir, 'videos'),
        audio: path.join(archivosDir, 'audios'),
        documento: path.join(archivosDir, 'documentos')
      };

      Object.values(tiposDir).forEach(dir => {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      });

      // Determinar la carpeta según el tipo
      const carpetaDestino = tiposDir[archivoData.tipo] || tiposDir.documento;

      // Generar nombre único para el archivo
      const timestamp = Date.now();
      const extension = path.extname(archivoData.nombre);
      const nombreBase = path.basename(archivoData.nombre, extension);
      const nombreUnico = `${nombreBase}_${timestamp}${extension}`;
      const rutaCompleta = path.join(carpetaDestino, nombreUnico);

      // Convertir base64 a buffer, validar y guardar archivo
      const buffer = Buffer.from(archivoData.data, 'base64');
      const categoriaMap = { imagen: 'imagen', video: 'video', audio: 'audio', documento: 'documento' };
      const categoria = categoriaMap[archivoData.tipo] || 'documento';
      validarArchivoUpload(buffer, extension, categoria);
      fs.writeFileSync(rutaCompleta, buffer);

      // Ruta relativa para almacenar en la base de datos
      const rutaRelativa = path.relative(path.join(__dirname, 'data'), rutaCompleta).replace(/\\/g, '/');

      console.log('✅ [MAIN] Archivo guardado en:', rutaCompleta);

      return {
        success: true,
        ruta: rutaRelativa,
        mensaje: 'Archivo subido exitosamente'
      };

    } catch (error) {
      console.error('❌ [MAIN] Error subiendo archivo:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Función para obtener archivos
  ipcMain.handle('obtener-archivos-presentacion', async (event, presentacionId) => {
    try {
      // Aquí implementarías la lógica para obtener archivos de una presentación específica
      return [];
    } catch (error) {
      console.error('❌ [MAIN] Error obteniendo archivos:', error);
      return [];
    }
  });

  // Función para eliminar archivos
  ipcMain.handle('eliminar-archivo-presentacion', async (event, archivoId) => {
    try {
      // Aquí implementarías la lógica para eliminar un archivo específico
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Enlace externo
  ipcMain.handle('abrir-enlace-externo', async (event, url) => {
    shell.openExternal(url);
  });

  // ==================================== FUNCIONES DE MULTIMEDIA 

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

  // Agregar nuevo archivo multimedia
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

  // Eliminar archivo multimedia
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

  // ✨ AGREGAR HANDLERS ADICIONALES PARA EL MENÚ MEJORADO:

  // Handler para abrir el buscador de la Biblia desde el menú
  ipcMain.on('abrir-buscador-biblia', (event) => {
    try {
      console.log('🔍 [Main] Abriendo buscador de Biblia desde menú...');
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
      if (mainWindow) {
        mainWindow.webContents.send('seleccionar-libro-biblia', libroId);
      }
    } catch (error) {
      console.error('❌ [Main] Error seleccionando libro bíblico:', error);
    }
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
      if (!mainWindow) return false;

      const isFullScreen = mainWindow.isFullScreen();
      mainWindow.setFullScreen(!isFullScreen);

      return !isFullScreen;
    } catch (error) {
      console.error('❌ [Main] Error gestionando pantalla completa:', error);
      return false;
    }
  });

  // Incrementar contador de reproducido
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

  // Actualizar favorito multimedia
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

  // Actualizar multimedia
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

  // Obtener multimedia favoritos
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

  // Obtener multimedia por tipo
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

  // ✨ VERIFICAR ARCHIVOS DUPLICADOS - COMENTADO PARA EVITAR DUPLICACIÓN
  // console.log('🔧 [MAIN] Registrando handler verificar-archivo-duplicado...');

  // Primero remover cualquier handler existente
  try {
    // ipcMain.removeHandler('verificar-archivo-duplicado');
    console.log('🧹 [MAIN] Handler anterior removido');
  } catch (e) {
    console.log('🧹 [MAIN] No había handler anterior');
  }

  // COMENTADO: Handler duplicado - el real está en registrarHandlers()
  /* ipcMain.handle('verificar-archivo-duplicado', async (event, datos) => {
    console.log('🚨 [IPC] *** HANDLER VERIFICAR-ARCHIVO-DUPLICADO EJECUTADO ***');
    console.log('🚨 [IPC] Datos completos recibidos:', datos);
    console.log('🚨 [IPC] Tipo de datos:', typeof datos);

    // VERSIÓN SIMPLIFICADA PARA DEBUGGING
    try {
      console.log('🔍 [IPC] VERSIÓN SIMPLIFICADA DE VERIFICACIÓN');

      // Por ahora, siempre devolver que NO existe
      console.log('� [IPC] Devolviendo resultado de prueba: NO existe');
      return {
        existe: false,
        debug: 'Handler ejecutado correctamente'
      };

    } catch (error) {
      console.error('❌ [IPC] Error en verificación simplificada:', error);
      return {
        existe: false,
        error: error.message
      };
    }
  });
  console.log('✅ [MAIN] Handler verificar-archivo-duplicado registrado exitosamente');
  */

  // ✨ HANDLER DE PRUEBA SIMPLE
  // console.log('🔧 [MAIN] Registrando handler de prueba test-duplicado...');
  ipcMain.handle('test-duplicado', async (event, datos) => {
    console.log('🧪 [TEST] Handler de prueba ejecutado con datos:', datos);
    return { teste: true, datos: datos };
  });
  // console.log('✅ [MAIN] Handler de prueba test-duplicado registrado');

  // ✨ NUEVO: Abrir diálogo para seleccionar archivos multimedia
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

  // ✨ NUEVO: Procesar archivos por ruta (sin base64)
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
          const extensionesVideo = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm'];
          const extensionesAudio = ['.mp3', '.wav', '.ogg', '.aac', '.flac', '.m4a'];
          const extensionesImagen = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];

          if (extensionesVideo.includes(extension)) {
            tipo = 'video';
          } else if (extensionesAudio.includes(extension)) {
            tipo = 'audio';
          } else if (extensionesImagen.includes(extension)) {
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

  // ✨ PROCESAR ARCHIVOS MULTIMEDIA SUBIDOS
  ipcMain.handle('procesar-archivo-multimedia', async (event, fileData) => {
    try {
      console.log('📁 [IPC] Procesando archivo multimedia:', fileData?.nombre);
      // console.log('📁 [IPC] fileData.tipo:', fileData?.tipo);
      // console.log('📁 [IPC] fileData.tamaño:', fileData?.tamaño);
      // console.log('📁 [IPC] fileData.extension:', fileData?.extension);

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

      // console.log('📁 [IPC] Nombre único generado:', nombreUnico);

      // Ruta completa del archivo
      const rutaArchivo = path.join(multimediaDir, nombreUnico);
      // console.log('📁 [IPC] Ruta archivo completa:', rutaArchivo);

      // Convertir base64 a buffer, validar y escribir el archivo
      const base64Data = fileData.data.replace(/^data:.*,/, ''); // Remover prefijo data:
      const buffer = Buffer.from(base64Data, 'base64');
      const categoriaMultimedia = ['imagen','video','audio'].includes(fileData.tipo) ? fileData.tipo : 'documento';
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

      // console.log('💾 [IPC] Datos para base de datos:', multimediaData);

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

  // HANDLER MEJORADO PARA PROYECTAR MULTIMEDIA
  ipcMain.handle('proyectar-multimedia', async (event, mediaData) => {
    try {
      console.log('📺 [IPC] Proyectando multimedia:', mediaData);

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

  // ✨ HANDLERS PARA COMUNICACIÓN CON PROYECTOR - PRESENTACIONES
  ipcMain.handle('enviar-presentacion-al-proyector', async (event, presentacionData) => {
    try {
      console.log('📊 [IPC] Enviando presentación al proyector:', presentacionData.name);

      if (proyectorWindow && !proyectorWindow.isDestroyed()) {
        proyectorWindow.webContents.send('mostrar-presentacion', presentacionData);
        proyectorWindow.focus();
        return { success: true };
      } else {
        const nuevaVentana = createProyectorWindow();
        if (nuevaVentana) {
          nuevaVentana.webContents.once('did-finish-load', () => {
            nuevaVentana.webContents.send('mostrar-presentacion', presentacionData);
            nuevaVentana.focus();
          });
          return { success: true };
        }
        return { success: false, error: 'No se pudo crear ventana del proyector' };
      }
    } catch (error) {
      console.error('❌ [IPC] Error enviando presentación al proyector:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('cambiar-slide-proyector', async (event, { presentacionId, slideIndex }) => {
    try {
      console.log(`🎯 [IPC] Cambiando slide del proyector: ${presentacionId} -> ${slideIndex}`);

      if (proyectorWindow && !proyectorWindow.isDestroyed()) {
        proyectorWindow.webContents.send('cambiar-slide', { presentacionId, slideIndex });
        return { success: true };
      }
      return { success: false, error: 'Proyector no disponible' };
    } catch (error) {
      console.error('❌ [IPC] Error cambiando slide:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('detener-presentacion-proyector', async () => {
    try {
      console.log('🛑 [IPC] Deteniendo presentación en proyector');

      if (proyectorWindow && !proyectorWindow.isDestroyed()) {
        proyectorWindow.webContents.send('detener-presentacion');
        return { success: true };
      }
      return { success: false, error: 'Proyector no disponible' };
    } catch (error) {
      console.error('❌ [IPC] Error deteniendo presentación:', error);
      return { success: false, error: error.message };
    }
  });

  // ✨ VERIFICAR ARCHIVOS DUPLICADOS
  console.log('🔧 [MAIN] Registrando handler verificar-archivo-duplicado...');

  // Primero remover cualquier handler existente
  try {
    ipcMain.removeHandler('verificar-archivo-duplicado');
    console.log('🧹 [MAIN] Handler anterior removido');
  } catch (e) {
    console.log('🧹 [MAIN] No había handler anterior');
  }

  ipcMain.handle('verificar-archivo-duplicado', async (event, datos) => {
    console.log('� [IPC] Verificando duplicado:', datos?.nombre);

    // VERSIÓN SIMPLIFICADA PARA DEBUGGING
    try {
      console.log('🔍 [IPC] VERSIÓN SIMPLIFICADA DE VERIFICACIÓN');

      // *** IMPLEMENTAR LÓGICA REAL DE DUPLICADOS ***
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
  console.log('✅ [MAIN] Handler verificar-archivo-duplicado registrado exitosamente');

  console.log("✅ [Main] Todos los handlers registrados exitosamente");
}