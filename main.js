// ✨ IMPORTACIONES PRIMERO
const { app, BrowserWindow, ipcMain, screen, Menu, dialog, shell, globalShortcut } = require("electron");
const { autoUpdater } = require("electron-updater");
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
    // PRODUCCIÓN: Agregar 'unsafe-eval' temporalmente para React
    // Algunos bundlers modernos pueden requerir eval() para source maps o dynamic imports
    return "default-src 'self' http://localhost:3001 https://*.youtube.com https://*.google.com; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:3001 https://*.youtube.com https://*.ytimg.com https://*.googlevideo.com https://*.google.com https://www.google.com https://*.ggpht.com https://*.doubleclick.net https://*.gstatic.com; " +
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

// ── Genera el HTML del overlay OBS ────────────────────────────────────────
function generarObsHtml() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>GloryView · OBS Overlay</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:transparent}
body{font-family:'EB Garamond','Georgia',serif}
#fondo-media{
  position:fixed;inset:0;z-index:0;pointer-events:none;
  opacity:0;transition:opacity .7s ease;
}
#fondo-media.show{opacity:1}
#fondo-media img,#fondo-media video{
  width:100%;height:100%;object-fit:cover;display:block;
}
#fondo-overlay{
  position:fixed;inset:0;z-index:1;pointer-events:none;
  background:linear-gradient(to bottom,rgba(0,0,0,.35) 0%,rgba(0,0,0,.55) 100%);
  opacity:0;transition:opacity .7s ease;
}
#fondo-overlay.show{opacity:1}
body.fondo-oscuro{background:#02050d}
#wrap{
  position:relative;z-index:2;
  width:100%;height:100%;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  padding:5vw 9vw;text-align:center;
  opacity:0;transition:opacity 0.55s ease;
}
#wrap.show{opacity:1}
.ref{
  font-family:'Cinzel','Georgia',serif;
  font-size:clamp(12px,1.9vw,36px);
  font-weight:600;letter-spacing:.22em;text-transform:uppercase;
  color:rgba(220,230,255,.72);
  text-shadow:0 1px 18px rgba(0,0,0,.95),0 0 30px rgba(120,130,255,.4);
  display:flex;align-items:center;justify-content:center;gap:.6em;flex-wrap:wrap;
  margin-bottom:2.2vh;
}
.ref-sep{opacity:0.3;font-weight:400;letter-spacing:0}
.parrafo{
  font-family:'EB Garamond','Georgia',serif;
  font-size:clamp(26px,5.4vw,95px);font-weight:500;line-height:1.38;
  font-style:italic;
  color:#ffffff;word-spacing:.12em;
  text-shadow:0 2px 28px rgba(0,0,0,.92),0 0 50px rgba(80,100,200,.2);
  white-space:pre-line;
}
.timer-msg{
  font-family:'Cinzel',serif;
  font-size:clamp(14px,2.6vw,48px);font-weight:400;letter-spacing:.28em;
  text-transform:uppercase;color:rgba(220,230,255,.65);
  margin:0 auto 2.5vh;width:fit-content;max-width:100%;
  text-shadow:0 2px 20px rgba(0,0,0,.9);
}
/* ── Fondo animado de estrellas (default del temporizador sin fondo propio) ── */
#starfield{
  position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none;
  opacity:0;transition:opacity .7s ease;background:#02050d;
}
#starfield.show{opacity:1}
#starfield .nebula{
  position:absolute;inset:0;
  background:radial-gradient(ellipse 120% 120% at 50% 50%,#0d1f42 0%,#010306 75%);
  animation:_nebula 9s ease-in-out infinite;
}
#starfield .core{
  position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
  width:30vmin;height:30vmin;border-radius:50%;
  background:radial-gradient(circle,rgba(100,130,255,.12) 0%,transparent 70%);
}
.streak{position:absolute;left:50%;top:50%;border-radius:50%;transform-origin:left center}
@keyframes _hyper{
  0%{transform:translate(0,0) scaleX(.04);opacity:0}
  8%{opacity:var(--hop)}
  85%{opacity:var(--hop)}
  100%{transform:translate(var(--hdx),var(--hdy)) scaleX(1);opacity:0}
}
@keyframes _nebula{0%,100%{opacity:.6;transform:scale(1)}50%{opacity:.85;transform:scale(1.04)}}
/* ── Anillo de progreso del temporizador ── */
.timer-ring-wrap{position:relative;width:50vmin;height:50vmin;margin:0 auto}
.timer-ring-svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.timer-ring-content{
  position:absolute;inset:0;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
}
.timer-ring-num{
  font-family:'Cinzel',serif;font-weight:900;font-size:10vmin;letter-spacing:.04em;
  line-height:1;font-variant-numeric:tabular-nums;color:#e0e7ff;
  transition:color .5s ease;
}
.timer-ring-num .sep{opacity:.85}
.timer-ring-label{
  font-size:1.4vmin;font-weight:600;text-transform:uppercase;letter-spacing:.3em;
  margin-top:2vmin;opacity:.35;color:#e0e7ff;
}
.timer-ring-ya{font-family:'Cinzel',serif;font-weight:900;font-size:9vmin;line-height:1}
</style>
</head>
<body>
<div id="starfield"><div class="nebula"></div><div class="core"></div></div>
<div id="fondo-media"></div>
<div id="fondo-overlay"></div>
<div id="wrap"><div id="content"></div></div>
<script>
const params=new URLSearchParams(location.search);
if(params.get('fondo')==='oscuro')document.body.classList.add('fondo-oscuro');
const SOLO_TEXTO=params.get('solo-texto')==='1';
const BASE=location.origin;
let lastTs=0,lastFondoUrl='',lastTipo='';
const wrap=document.getElementById('wrap');
const content=document.getElementById('content');
const fondoMedia=document.getElementById('fondo-media');
const fondoOverlay=document.getElementById('fondo-overlay');
const starfield=document.getElementById('starfield');
function pad(n){return String(n).padStart(2,'0')}
function fmt(s){const v=Math.max(0,Math.floor(s));return pad(Math.floor(v/60))+':'+pad(v%60)}
function timerColor(s,fin){
  if(fin)return'#10b981';
  if(s<=30)return'#ef4444';
  if(s<=60)return'#f59e0b';
  return'#6366f1';
}
function esc(t){return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
let starfieldBuilt=false;
function buildStarfield(){
  if(starfieldBuilt)return;
  starfieldBuilt=true;
  const frag=document.createDocumentFragment();
  for(let i=0;i<90;i++){
    const angle=(i/90)*360+(Math.random()-0.5)*4;
    const rad=angle*Math.PI/180;
    const dist=65+Math.random()*55;
    const dx=(Math.cos(rad)*dist).toFixed(2);
    const dy=(Math.sin(rad)*dist).toFixed(2);
    const length=2+Math.random()*14;
    const width=.6+Math.random()*1.1;
    const dur=(0.8+Math.random()*1.6).toFixed(2);
    const delay=(-(Math.random()*3)).toFixed(2);
    const opacity=(0.35+Math.random()*0.55).toFixed(2);
    const warm=Math.random()<0.12;
    const color=warm?'255,210,170':'200,215,255';
    const el=document.createElement('div');
    el.className='streak';
    el.style.cssText='width:'+length+'px;height:'+width+'px;'+
      'margin-left:-'+(length/2)+'px;margin-top:-'+(width/2)+'px;'+
      'background:rgba('+color+','+opacity+');'+
      'box-shadow:0 0 '+(width*3)+'px rgba('+color+',.4);'+
      'transform:rotate('+angle+'deg);'+
      '--hdx:'+dx+'vw;--hdy:'+dy+'vh;--hop:'+opacity+';'+
      'animation:_hyper '+dur+'s '+delay+'s linear infinite';
    frag.appendChild(el);
  }
  starfield.appendChild(frag);
}
function toggleStarfield(show){
  if(show){buildStarfield();starfield.classList.add('show');}
  else{starfield.classList.remove('show');}
}
function actualizarFondo(fondo){
  if(SOLO_TEXTO)return; // modo solo texto: fondo siempre transparente
  const url=fondo?.url?BASE+fondo.url:'';
  if(url===lastFondoUrl)return;
  lastFondoUrl=url;
  if(!url){
    fondoMedia.innerHTML='';
    fondoMedia.classList.remove('show');
    fondoOverlay.classList.remove('show');
    return;
  }
  if(fondo.tipo==='video'){
    fondoMedia.innerHTML='<video src="'+url+'" autoplay loop muted playsinline></video>';
  } else {
    fondoMedia.innerHTML='<img src="'+url+'" alt="">';
  }
  fondoMedia.classList.add('show');
  fondoOverlay.classList.add('show');
}
function render(d){
  actualizarFondo(d.fondo||null);
  toggleStarfield(d.tipo==='temporizador'&&!d.fondo&&!SOLO_TEXTO);
  if(d.tipo==='vacio'||(!d.parrafo&&d.tipo!=='temporizador')){
    wrap.classList.remove('show');return;
  }
  let html='';
  if(d.tipo==='temporizador'){
    const c=timerColor(d.segundos,d.terminado);
    const total=Number(d.total)||0;
    const progress=total>0?Math.max(0,Math.min(1,d.segundos/total)):0;
    const R=100,CIRC=2*Math.PI*R;
    const dashOffset=(CIRC*(1-progress)).toFixed(2);
    const centro=d.terminado
      ?'<span class="timer-ring-ya" style="color:'+c+'">¡Ya!</span>'
      :'<span class="timer-ring-num">'+pad(Math.floor(d.segundos/60))+
        '<span class="sep" style="color:'+c+'">:</span>'+pad(d.segundos%60)+'</span>'+
       '<span class="timer-ring-label">'+(Math.floor(d.segundos/60)>0?'min : seg':'segundos')+'</span>';
    html=(d.mensaje?'<div class="timer-msg">'+esc(d.mensaje)+'</div>':'')+
      '<div class="timer-ring-wrap">'+
        '<svg class="timer-ring-svg" viewBox="0 0 220 220" style="filter:drop-shadow(0 0 60px '+c+'80)">'+
          '<circle cx="110" cy="110" r="'+R+'" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="6"/>'+
          '<circle cx="110" cy="110" r="'+R+'" fill="none" stroke="'+c+'" stroke-width="6" stroke-linecap="round" '+
            'stroke-dasharray="'+CIRC.toFixed(2)+'" stroke-dashoffset="'+dashOffset+'" '+
            'transform="rotate(-90 110 110)" style="transition:stroke-dashoffset 1s linear,stroke .5s ease"/>'+
        '</svg>'+
        '<div class="timer-ring-content">'+centro+'</div>'+
      '</div>';
  } else {
    // Referencia ARRIBA, texto del versículo/himno debajo
    const libro=d.titulo?'<span>'+esc(d.titulo)+'</span>':'';
    const num=d.numero?'<span>'+esc(d.numero)+'</span>':'';
    const sep=(libro&&num)?'<span class="ref-sep">·</span>':'';
    const refHtml=(libro||num)?'<div class="ref">'+libro+sep+num+'</div>':'';
    html=refHtml+'<div class="parrafo">'+esc(d.parrafo).replace(/\\n/g,'<br>')+'</div>';
  }
  content.innerHTML=html;
  wrap.classList.add('show');
}
async function poll(){
  try{
    const r=await fetch(BASE+'/api/proyector/estado');
    if(!r.ok)return;
    const d=await r.json();
    // Actualizar fondo siempre (puede cambiar sin cambiar el contenido)
    actualizarFondo(d.fondo||null);
    if(d.updatedAt!==lastTs){
      lastTs=d.updatedAt;
      // Los ticks del temporizador (mismo tipo, solo cambia el segundo) se
      // actualizan en el lugar sin fade — si no, parpadea cada segundo.
      const esTickTemporizador=d.tipo==='temporizador'&&lastTipo==='temporizador';
      lastTipo=d.tipo;
      if(esTickTemporizador){
        render(d);
      } else {
        wrap.classList.remove('show');
        setTimeout(()=>render(d),480);
      }
    }
  }catch(e){}
}
setInterval(poll,800);poll();
</script>
</body>
</html>`;
}

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
        app: 'GloryView',
        version: app.getVersion(),
        serverTime: new Date().toISOString(),
      });
    });

    // ✅ Endpoint de diagnóstico para verificar rutas y archivos
    expressApp.get('/api/diagnostico', (req, res) => {
      const buildDir = path.join(obtenerRutaRecursos(), "build");
      const indexExists = fs.existsSync(path.join(buildDir, 'index.html'));
      const buildExists = fs.existsSync(buildDir);
      const buildFiles = buildExists ? fs.readdirSync(buildDir) : [];

      res.json({
        ok: true,
        __dirname: __dirname,
        buildDir: buildDir,
        buildExists: buildExists,
        indexExists: indexExists,
        filesCount: buildFiles.length,
        files: buildFiles.slice(0, 20),
        isPackaged: app.isPackaged,
        resourcesPath: process.resourcesPath
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
          app: 'GloryView',
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
            const rawFav = await obtenerConfiguracion(keyFavoritos);
            const parsedFav = rawFav ? JSON.parse(String(rawFav)) : [];
            favoritosBaseIds = Array.isArray(parsedFav) ? parsedFav.map((x) => String(x)) : [];
          } catch {
            favoritosBaseIds = [];
          }

          const base = leerJsonHimnosSeguro(filename);
          baseNormalizados = base.flatMap((h) => {
            if (!String(h?.titulo || '').trim()) return [];
            return [{
              id: `base:${tipo}:${h?.numero ?? ''}`,
              numero: h?.numero ?? '',
              titulo: h?.titulo ?? '',
              parrafos: Array.isArray(h?.parrafos) ? h.parrafos : [],
              fuente: tipo,
              favorito: favoritosBaseIds.includes(`base:${tipo}:${h?.numero ?? ''}`),
            }];
          });
        }

        if (tipo === 'personal') {
          const himnosDb = await obtenerHimnos();
          dbNormalizados = (Array.isArray(himnosDb) ? himnosDb : []).flatMap((h) => {
            if (!String(h?.titulo || '').trim()) return [];
            let letra = [];
            try {
              letra = JSON.parse(h?.letra || '[]');
            } catch {
              letra = [];
            }
            return [{
              id: `db:${h?.id ?? ''}`,
              numero: h?.numero ?? '',
              titulo: h?.titulo ?? '',
              parrafos: Array.isArray(letra) ? letra : [],
              fuente: 'personal',
              favorito: Boolean(h?.favorito),
            }];
          });
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
            const rawFav = await obtenerConfiguracion(keyFavoritos);
            const parsedFav = rawFav ? JSON.parse(String(rawFav)) : [];
            favoritosBaseIds = Array.isArray(parsedFav) ? parsedFav.map((x) => String(x)) : [];
          } catch {
            favoritosBaseIds = [];
          }

          if (favoritosBaseIds.length) {
            const favoritosBaseSet = new Set(favoritosBaseIds);
            const base = leerJsonHimnosSeguro(filename);
            for (const h of base) {
              const titulo = String(h?.titulo || '').trim();
              const id = `base:${t}:${h?.numero ?? ''}`;
              if (!titulo || !favoritosBaseSet.has(id)) continue;
              favoritos.push({ id, numero: h?.numero ?? '', titulo, parrafos: Array.isArray(h?.parrafos) ? h.parrafos : [], fuente: t, favorito: true });
            }
          }
        }

        const himnosDb = await obtenerHimnos();
        for (const h of (Array.isArray(himnosDb) ? himnosDb : [])) {
          if (!h?.favorito) continue;
          const titulo = String(h?.titulo || '').trim();
          if (!titulo) continue;
          let letra = [];
          try {
            letra = JSON.parse(h?.letra || '[]');
          } catch {
            letra = [];
          }
          favoritos.push({ id: `db:${h?.id ?? ''}`, numero: h?.numero ?? '', titulo, parrafos: Array.isArray(letra) ? letra : [], fuente: 'personal', favorito: true });
        }

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

          const ok = await actualizarFavoritoHimno(dbId, favorito);
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
            const rawFav = await obtenerConfiguracion(keyFavoritos);
            const parsedFav = rawFav ? JSON.parse(String(rawFav)) : [];
            favoritosBaseIds = Array.isArray(parsedFav) ? parsedFav.map((x) => String(x)) : [];
          } catch {
            favoritosBaseIds = [];
          }

          const set = new Set(favoritosBaseIds);
          if (favorito) set.add(id);
          else set.delete(id);

          const ok = await actualizarConfiguracion(keyFavoritos, JSON.stringify(Array.from(set)));
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

    // ✅ CRUD Himnos Personalizados (App móvil)
    // POST /api/himnos/personal — crear himno
    expressApp.post('/api/himnos/personal', async (req, res) => {
      try {
        const { numero, titulo, letra } = req.body || {};
        if (!titulo || !String(titulo).trim()) {
          return res.status(400).json({ ok: false, error: 'El título es obligatorio' });
        }
        if (!letra || !String(letra).trim()) {
          return res.status(400).json({ ok: false, error: 'La letra es obligatoria' });
        }
        const parrafos = String(letra).split(/\n\n+/).flatMap(p => { const v = p.trim(); return v ? [v] : []; });
        const id = await crearHimno({
          numero: String(numero || '').trim(),
          titulo: String(titulo).trim(),
          letra: JSON.stringify(parrafos),
          autor: '', categoria: '', favorito: 0,
        });
        return res.json({ ok: true, id });
      } catch (error) {
        console.error('❌ [MAIN] (API) Error POST /api/himnos/personal:', error);
        return res.status(500).json({ ok: false, error: error.message });
      }
    });

    // PUT /api/himnos/personal/:id — actualizar himno
    expressApp.put('/api/himnos/personal/:id', async (req, res) => {
      try {
        const id = Number(req.params?.id);
        if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'id inválido' });
        const { numero, titulo, letra } = req.body || {};
        if (!titulo || !String(titulo).trim()) {
          return res.status(400).json({ ok: false, error: 'El título es obligatorio' });
        }
        if (!letra || !String(letra).trim()) {
          return res.status(400).json({ ok: false, error: 'La letra es obligatoria' });
        }
        const parrafos = String(letra).split(/\n\n+/).flatMap(p => { const v = p.trim(); return v ? [v] : []; });
        const ok = await actualizarHimno(id, {
          numero: String(numero || '').trim(),
          titulo: String(titulo).trim(),
          letra: JSON.stringify(parrafos),
          autor: '', categoria: '', favorito: 0,
        });
        if (!ok) return res.status(404).json({ ok: false, error: 'Himno no encontrado' });
        return res.json({ ok: true });
      } catch (error) {
        console.error('❌ [MAIN] (API) Error PUT /api/himnos/personal/:id:', error);
        return res.status(500).json({ ok: false, error: error.message });
      }
    });

    // DELETE /api/himnos/personal/:id — eliminar himno
    expressApp.delete('/api/himnos/personal/:id', async (req, res) => {
      try {
        const id = Number(req.params?.id);
        if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'id inválido' });
        const ok = await eliminarHimno(id);
        if (!ok) return res.status(404).json({ ok: false, error: 'Himno no encontrado' });
        return res.json({ ok: true });
      } catch (error) {
        console.error('❌ [MAIN] (API) Error DELETE /api/himnos/personal/:id:', error);
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
        const raw = await obtenerConfiguracion(BIBLIA_FAVORITOS_KEY);
        const parsed = raw ? JSON.parse(String(raw)) : [];
        const arr = Array.isArray(parsed) ? parsed : [];
        const normalizados = arr.flatMap(f => { const v = normalizarFavoritoBiblia(f); return v ? [v] : []; });

        // De-dup por id (último gana)
        const map = new Map();
        for (const f of normalizados) map.set(f.id, f);
        return Array.from(map.values());
      } catch {
        return [];
      }
    };

    const guardarFavoritosBiblia = async (favoritos) => {
      return actualizarConfiguracion(BIBLIA_FAVORITOS_KEY, JSON.stringify(favoritos));
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
          writeLog(`⚠️ [API] /api/biblia/estructura - libroId inválido: "${libroId}"`);
          return res.status(400).json({ ok: false, error: 'libroId inválido' });
        }

        // Ampliar candidatos para cubrir más casos en producción
        const candidatos = [
          path.join(buildDir, 'data', 'biblia', `${libroId}.js`),
          path.join(__dirname, 'build', 'data', 'biblia', `${libroId}.js`),
          path.join(__dirname, 'src', 'data', 'biblia', `${libroId}.js`),
          path.join(obtenerRutaBase(), 'public', 'data', 'biblia', `${libroId}.js`),
        ];

        let ruta = null;
        let intentos = [];
        for (const c of candidatos) {
          intentos.push(c);
          if (fs.existsSync(c)) {
            ruta = c;
            break;
          }
        }

        if (!ruta) {
          writeLog(`❌ [API] /api/biblia/estructura - Libro "${libroId}" no encontrado en ningún candidato`);
          writeLog(`   Intentos: ${JSON.stringify(intentos, null, 2)}`);
          return res.status(404).json({
            ok: false,
            error: `Libro "${libroId}" no encontrado`,
            debug: { intentos }
          });
        }

        writeLog(`✅ [API] /api/biblia/estructura - Leyendo: ${ruta}`);

        // Leer como texto y evaluar con vm (evita problemas con import() de ESM en main process)
        const vm = require('vm');
        const contenido = fs.readFileSync(ruta, 'utf8');

        // Quitar "export default" y evaluar el array literal JavaScript
        let arrayStr = contenido.replace(/^\s*export\s+default\s+/, '').trim();
        // Remover punto y coma final si existe
        arrayStr = arrayStr.replace(/;+\s*$/, '').trim();

        let data;
        try {
          data = vm.runInNewContext(`(${arrayStr})`, Object.create(null));
        } catch (vmError) {
          writeLog(`❌ [API] Error evaluando contenido con vm: ${vmError.message}`);
          throw vmError;
        }

        if (!Array.isArray(data) || data.length === 0) {
          writeLog(`❌ [API] Libro "${libroId}" vacío o inválido (no es array o length=0)`);
          return res.status(404).json({ ok: false, error: `Libro "${libroId}" vacío o inválido` });
        }

        const versiculosPorCapitulo = data.map((cap) => (Array.isArray(cap) ? cap.length : 0));

        writeLog(`✅ [API] /api/biblia/estructura - ${libroId}: ${data.length} caps, ${versiculosPorCapitulo.reduce((a, b) => a + b, 0)} vers`);

        return res.json({
          ok: true,
          libroId,
          capitulos: data.length,
          versiculosPorCapitulo,
        });
      } catch (error) {
        writeLog(`❌ [API] Error /api/biblia/estructura: ${error.message}`);
        writeLog(`❌ Stack: ${error.stack}`);
        return res.status(500).json({ ok: false, error: error.message });
      }
    });

    // ✅ Endpoint de diagnóstico para la Biblia (testing desde app móvil)
    expressApp.get('/api/biblia/diagnostico', (req, res) => {
      try {
        const diagnostico = {
          ok: true,
          timestamp: new Date().toISOString(),
          paths: {
            __dirname,
            buildDir: path.join(obtenerRutaRecursos(), "build"),
            userData: obtenerRutaBase(),
          },
          bibliaFiles: {
            found: [],
            notFound: []
          }
        };

        // Probar 3 libros de muestra
        const muestras = ['genesis', 'juan', 'apocalipsis'];
        for (const libroId of muestras) {
          const candidatos = [
            path.join(path.join(obtenerRutaRecursos(), "build"), 'data', 'biblia', `${libroId}.js`),
            path.join(__dirname, 'build', 'data', 'biblia', `${libroId}.js`),
            path.join(__dirname, 'src', 'data', 'biblia', `${libroId}.js`),
            path.join(obtenerRutaBase(), 'public', 'data', 'biblia', `${libroId}.js`),
          ];

          let encontrado = null;
          for (const c of candidatos) {
            if (fs.existsSync(c)) {
              encontrado = c;
              break;
            }
          }

          if (encontrado) {
            diagnostico.bibliaFiles.found.push({ libro: libroId, path: encontrado });
          } else {
            diagnostico.bibliaFiles.notFound.push({ libro: libroId, intentos: candidatos });
          }
        }

        // Listar todos los archivos en build/data/biblia si existe
        const buildBibliaDir = path.join(path.join(obtenerRutaRecursos(), "build"), 'data', 'biblia');
        if (fs.existsSync(buildBibliaDir)) {
          const archivos = fs.readdirSync(buildBibliaDir);
          diagnostico.bibliaFiles.enBuildDir = {
            path: buildBibliaDir,
            count: archivos.length,
            sample: archivos.slice(0, 10)
          };
        }

        writeLog(`✅ [API] Diagnóstico Biblia ejecutado - ${diagnostico.bibliaFiles.found.length} found, ${diagnostico.bibliaFiles.notFound.length} not found`);

        return res.json(diagnostico);
      } catch (error) {
        writeLog(`❌ [API] Error en diagnóstico Biblia: ${error.message}`);
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
        actualizarObs('himno', payload);
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
        if (timerEstaProyectando()) {
          timerRestaurarEnProyector();
          return res.json({ ok: true, timerActivo: true });
        }
        if (proyectorWindow && !proyectorWindow.isDestroyed()) {
          proyectorWindow.webContents.send('limpiar-proyector');
          actualizarObs('vacio');
          return res.json({ ok: true });
        }
        return res.status(500).json({ ok: false, error: 'Ventana del proyector no disponible' });
      } catch (error) {
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

        // Actualizar estado del servidor inmediatamente para que la siguiente consulta
        // de la app móvil ya vea el nuevo estado (sin esperar IPC de vuelta del proyector).
        if (finalAction === 'play') {
          multimediaPlaybackStatus['proyector'].paused = false;
          multimediaPlaybackStatus['proyector'].updatedAt = Date.now();
        } else if (finalAction === 'pause') {
          multimediaPlaybackStatus['proyector'].paused = true;
          multimediaPlaybackStatus['proyector'].updatedAt = Date.now();
        } else if (finalAction === 'stop' || finalAction === 'limpiar') {
          multimediaPlaybackStatus['proyector'].paused = true;
          multimediaPlaybackStatus['proyector'].id = null;
          multimediaPlaybackStatus['proyector'].currentTime = 0;
          multimediaPlaybackStatus['proyector'].updatedAt = Date.now();
        }

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

        // Actualizar estado del servidor inmediatamente para que la siguiente consulta
        // de la app móvil ya vea el nuevo estado (sin esperar IPC de vuelta del renderer).
        if (finalAction === 'play') {
          multimediaPlaybackStatus['pc'].paused = false;
          multimediaPlaybackStatus['pc'].updatedAt = Date.now();
        } else if (finalAction === 'pause') {
          multimediaPlaybackStatus['pc'].paused = true;
          multimediaPlaybackStatus['pc'].updatedAt = Date.now();
        } else if (finalAction === 'stop' || finalAction === 'limpiar') {
          multimediaPlaybackStatus['pc'].paused = true;
          multimediaPlaybackStatus['pc'].id = null;
          multimediaPlaybackStatus['pc'].currentTime = 0;
          multimediaPlaybackStatus['pc'].updatedAt = Date.now();
        }

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
    // ✅ Fondos (App móvil)
    // ==================================================

    // ✅ Listar fondos
    // Respuesta: { ok:true, fondos:[{id,url,tipo,nombre,activo,created_at}] }
    expressApp.get('/api/fondos', async (req, res) => {
      try {
        const fondos = await obtenerFondos();
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
        const fondos = await obtenerFondos();
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

        const ok = await establecerFondoActivo(id);
        if (!ok) {
          return res.status(500).json({ ok: false, error: 'No se pudo activar el fondo' });
        }

        const fondos = await obtenerFondos();
        const fondoActivo = (Array.isArray(fondos) ? fondos : []).find((f) => f.activo) || null;

        // Sincronizar fondo para overlay OBS
        sincronizarFondoObs(fondoActivo);

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

    // ==================================================
    // ✅ Órdenes de Servicio (App móvil)
    // ==================================================

    // GET /api/ordenes-servicio — lista con items completos
    expressApp.get('/api/ordenes-servicio', async (req, res) => {
      try {
        const ordenes = await obtenerOrdenesServicio();
        return res.json({ ok: true, ordenes: Array.isArray(ordenes) ? ordenes : [] });
      } catch (error) {
        console.error('❌ [MAIN] (API) Error /api/ordenes-servicio:', error);
        return res.status(500).json({ ok: false, error: error.message });
      }
    });

    // GET /api/ordenes-servicio/:id — detalle con items
    expressApp.get('/api/ordenes-servicio/:id', async (req, res) => {
      try {
        const id = Number(req.params?.id);
        if (!Number.isFinite(id)) {
          return res.status(400).json({ ok: false, error: 'id inválido' });
        }
        const orden = await obtenerOrdenServicioPorId(id);
        if (!orden) return res.status(404).json({ ok: false, error: 'No encontrada' });
        return res.json({ ok: true, orden });
      } catch (error) {
        console.error('❌ [MAIN] (API) Error /api/ordenes-servicio/:id:', error);
        return res.status(500).json({ ok: false, error: error.message });
      }
    });

    // POST /api/ordenes-servicio — crear nueva orden
    expressApp.post('/api/ordenes-servicio', async (req, res) => {
      try {
        const { titulo, fecha, items } = req.body || {};
        if (!titulo) return res.status(400).json({ ok: false, error: 'titulo requerido' });
        const result = agregarOrdenServicio({ titulo, fecha: fecha || '', items: Array.isArray(items) ? items : [] });
        if (!result?.success) return res.status(500).json({ ok: false, error: 'Error al crear orden' });
        return res.json({ ok: true, id: result.id });
      } catch (error) {
        console.error('❌ [MAIN] (API) Error POST /api/ordenes-servicio:', error);
        return res.status(500).json({ ok: false, error: error.message });
      }
    });

    // PUT /api/ordenes-servicio/:id — actualizar orden
    expressApp.put('/api/ordenes-servicio/:id', async (req, res) => {
      try {
        const id = Number(req.params?.id);
        if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'id inválido' });
        const { titulo, fecha, items } = req.body || {};
        if (!titulo) return res.status(400).json({ ok: false, error: 'titulo requerido' });
        actualizarOrdenServicio({ id, titulo, fecha: fecha || '', items: Array.isArray(items) ? items : [] });
        return res.json({ ok: true });
      } catch (error) {
        console.error('❌ [MAIN] (API) Error PUT /api/ordenes-servicio/:id:', error);
        return res.status(500).json({ ok: false, error: error.message });
      }
    });

    // DELETE /api/ordenes-servicio/:id — eliminar orden
    expressApp.delete('/api/ordenes-servicio/:id', async (req, res) => {
      try {
        const id = Number(req.params?.id);
        if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'id inválido' });
        eliminarOrdenServicio(id);
        return res.json({ ok: true });
      } catch (error) {
        console.error('❌ [MAIN] (API) Error DELETE /api/ordenes-servicio/:id:', error);
        return res.status(500).json({ ok: false, error: error.message });
      }
    });

    // GET /api/biblia/capitulo/:libroId/:cap — versículos de un capítulo
    expressApp.get('/api/biblia/capitulo/:libroId/:cap', (req, res) => {
      try {
        const libroId = String(req.params?.libroId || '').trim();
        const cap = parseInt(req.params?.cap, 10);
        if (!libroId || !/^[a-z0-9_]+$/.test(libroId)) {
          return res.status(400).json({ ok: false, error: 'libroId inválido' });
        }
        if (!Number.isFinite(cap) || cap < 1) {
          return res.status(400).json({ ok: false, error: 'cap inválido' });
        }

        const candidatos = [
          path.join(buildDir, 'data', 'biblia', `${libroId}.js`),
          path.join(__dirname, 'build', 'data', 'biblia', `${libroId}.js`),
          path.join(__dirname, 'src', 'data', 'biblia', `${libroId}.js`),
          path.join(obtenerRutaBase(), 'public', 'data', 'biblia', `${libroId}.js`),
        ];

        let ruta = null;
        for (const c of candidatos) {
          if (fs.existsSync(c)) { ruta = c; break; }
        }

        if (!ruta) {
          return res.status(404).json({ ok: false, error: `Libro "${libroId}" no encontrado` });
        }

        const vm = require('vm');
        const contenido = fs.readFileSync(ruta, 'utf8');
        let arrayStr = contenido.replace(/^\s*export\s+default\s+/, '').trim().replace(/;+\s*$/, '').trim();

        let data;
        try {
          data = vm.runInNewContext(`(${arrayStr})`, Object.create(null));
        } catch (vmError) {
          throw vmError;
        }

        if (!Array.isArray(data) || data.length === 0) {
          return res.status(404).json({ ok: false, error: `Libro "${libroId}" vacío o inválido` });
        }

        const capIdx = cap - 1;
        if (capIdx < 0 || capIdx >= data.length) {
          return res.status(404).json({ ok: false, error: `Capítulo ${cap} no existe en "${libroId}"` });
        }

        const versos = Array.isArray(data[capIdx]) ? data[capIdx] : [];
        return res.json({ ok: true, libroId, capitulo: cap, versos });
      } catch (error) {
        console.error('❌ [MAIN] (API) Error /api/biblia/capitulo:', error);
        return res.status(500).json({ ok: false, error: error.message });
      }
    });

    // POST /api/control/ordenes-servicio/proyectar-item
    // Body: { ordenId, itemIdx, parrafoIdx? }
    expressApp.post('/api/control/ordenes-servicio/proyectar-item', async (req, res) => {
      try {
        const { ordenId, itemIdx, parrafoIdx } = req.body || {};
        const id = Number(ordenId);
        const idx = Number(itemIdx);
        const parIdx = Number.isFinite(Number(parrafoIdx)) ? Number(parrafoIdx) : 0;

        if (!Number.isFinite(id) || !Number.isFinite(idx) || idx < 0) {
          return res.status(400).json({ ok: false, error: 'ordenId/itemIdx inválidos' });
        }

        const orden = await obtenerOrdenServicioPorId(id);
        if (!orden) return res.status(404).json({ ok: false, error: 'Orden no encontrada' });

        const items = Array.isArray(orden.items) ? orden.items : [];
        if (idx >= items.length) {
          return res.status(400).json({ ok: false, error: 'itemIdx fuera de rango' });
        }
        const item = items[idx];

        let payload;
        let canal;

        if (item.tipo === 'himno') {
          const parrafos = Array.isArray(item.parrafos) ? item.parrafos : [];
          const safeParIdx = parIdx >= 0 && parIdx < parrafos.length ? parIdx : 0;
          payload = {
            parrafo: parrafos[safeParIdx] || '',
            titulo: item.tituloHimno || '',
            numero: item.numeroHimno ?? '',
            origen: 'himno',
          };
          canal = 'mostrar-himno';
        } else {
          payload = {
            parrafo: item.texto || '',
            titulo: item.tipo === 'versiculo' ? (item.libroNombre || '') : '',
            numero: item.tipo === 'versiculo' ? `${item.capitulo}:${item.versiculo}` : '',
            origen: item.tipo === 'versiculo' ? 'biblia' : 'himno',
          };
          canal = 'mostrar-versiculo';
        }

        const totalParrafos = item.tipo === 'himno' && Array.isArray(item.parrafos) ? item.parrafos.length : 1;

        if (!proyectorWindow || proyectorWindow.isDestroyed()) {
          const nuevaVentana = createProyectorWindow();
          if (!nuevaVentana) {
            return res.status(500).json({ ok: false, error: 'No se pudo abrir proyector' });
          }
          nuevaVentana.webContents.once('did-finish-load', () => {
            setTimeout(() => {
              if (nuevaVentana && !nuevaVentana.isDestroyed()) {
                nuevaVentana.webContents.send(canal, payload);
              }
            }, 1000);
          });
        } else {
          proyectorWindow.webContents.send(canal, payload);
        }

        return res.json({ ok: true, itemIdx: idx, parrafoIdx: parIdx, totalItems: items.length, totalParrafos });
      } catch (error) {
        console.error('❌ [MAIN] (API) Error /api/control/ordenes-servicio/proyectar-item:', error);
        return res.status(500).json({ ok: false, error: error.message });
      }
    });

    // ==================================================
    // ✅ Anuncios (App móvil)
    // ==================================================
    expressApp.get('/api/anuncios', (req, res) => {
      try {
        const lista = obtenerAnuncios();
        return res.json({ ok: true, anuncios: Array.isArray(lista) ? lista : [] });
      } catch (error) {
        return res.status(500).json({ ok: false, error: error.message });
      }
    });

    expressApp.post('/api/control/anuncios/proyectar', async (req, res) => {
      try {
        const { id } = req.body || {};
        if (!id) return res.status(400).json({ ok: false, error: 'id requerido' });
        const lista = obtenerAnuncios();
        const anuncio = lista.find((a) => String(a.id) === String(id));
        if (!anuncio) return res.status(404).json({ ok: false, error: 'Anuncio no encontrado' });

        if (!proyectorWindow || proyectorWindow.isDestroyed()) {
          proyectorWindow = createProyectorWindow();
          await new Promise((resolve) => proyectorWindow.webContents.once('did-finish-load', resolve));
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
        proyectorWindow.webContents.send('mostrar-versiculo', {
          parrafo: anuncio.texto,
          titulo: anuncio.titulo || '',
          numero: '',
          origen: 'anuncio',
          anuncio: { ...anuncio, plantilla: anuncio.plantilla || 'moderno' },
        });
        actualizarObs('anuncio', {parrafo: anuncio.texto, titulo: anuncio.titulo || ''});
        return res.json({ ok: true });
      } catch (error) {
        return res.status(500).json({ ok: false, error: error.message });
      }
    });

    expressApp.post('/api/control/anuncios/limpiar', (req, res) => {
      try {
        if (timerEstaProyectando()) {
          // El timer está activo — no limpiar, restaurar el timer en su lugar
          timerRestaurarEnProyector();
          return res.json({ ok: true, timerActivo: true });
        }
        if (proyectorWindow && !proyectorWindow.isDestroyed()) {
          proyectorWindow.webContents.send('mostrar-versiculo', {
            parrafo: '', titulo: ' ', numero: ' ', origen: 'clear',
          });
        }
        return res.json({ ok: true });
      } catch (error) {
        return res.status(500).json({ ok: false, error: error.message });
      }
    });

    // ==================================================
    // ✅ Temporizador (App móvil) — estado servidor
    // ==================================================
    expressApp.get('/api/temporizador/estado', (req, res) => {
      return res.json({ ok: true, estado: { ...timerEstadoServidor } });
    });

    expressApp.post('/api/control/temporizador/iniciar', (req, res) => {
      try {
        const { minutos, mensaje } = req.body || {};
        if (minutos !== undefined) {
          const total = Math.max(1, Number(minutos)) * 60;
          timerEstadoServidor.total = total;
          timerEstadoServidor.segundosRestantes = total;
          timerEstadoServidor.terminado = false;
        }
        if (mensaje !== undefined) timerEstadoServidor.mensaje = String(mensaje);
        timerEstadoServidor.corriendo = true;
        timerEstadoServidor.terminado = false;
        timerIniciarIntervalServidor();
        timerEnviarAlProyector();
        return res.json({ ok: true, estado: { ...timerEstadoServidor } });
      } catch (error) {
        return res.status(500).json({ ok: false, error: error.message });
      }
    });

    expressApp.post('/api/control/temporizador/pausar', (req, res) => {
      timerEstadoServidor.corriendo = false;
      return res.json({ ok: true, estado: { ...timerEstadoServidor } });
    });

    expressApp.post('/api/control/temporizador/reiniciar', (req, res) => {
      timerDetenerIntervalServidor();
      timerEstadoServidor.corriendo = false;
      timerEstadoServidor.segundosRestantes = timerEstadoServidor.total;
      timerEstadoServidor.terminado = false;
      timerEnviarAlProyector();
      return res.json({ ok: true, estado: { ...timerEstadoServidor } });
    });

    // Actualizar duración sin iniciar — sincroniza la PC con la app móvil
    expressApp.post('/api/control/temporizador/configurar', (req, res) => {
      try {
        const { minutos, mensaje } = req.body || {};
        if (timerEstadoServidor.corriendo) {
          return res.status(400).json({ ok: false, error: 'No se puede cambiar la duración mientras corre' });
        }
        if (minutos !== undefined) {
          const total = Math.max(1, Number(minutos)) * 60;
          timerEstadoServidor.total = total;
          timerEstadoServidor.segundosRestantes = total;
          timerEstadoServidor.terminado = false;
        }
        if (mensaje !== undefined) timerEstadoServidor.mensaje = String(mensaje);
        return res.json({ ok: true, estado: { ...timerEstadoServidor } });
      } catch (error) {
        return res.status(500).json({ ok: false, error: error.message });
      }
    });

    expressApp.post('/api/control/temporizador/proyectar', async (req, res) => {
      try {
        const { minutos, mensaje } = req.body || {};
        if (minutos !== undefined) {
          const total = Math.max(1, Number(minutos)) * 60;
          timerEstadoServidor.total = total;
          timerEstadoServidor.segundosRestantes = total;
          timerEstadoServidor.terminado = false;
        }
        if (mensaje !== undefined) timerEstadoServidor.mensaje = String(mensaje);
        timerEstadoServidor.proyectando = true;
        timerEstadoServidor.corriendo = true;
        timerEstadoServidor.terminado = false;

        if (!proyectorWindow || proyectorWindow.isDestroyed()) {
          proyectorWindow = createProyectorWindow();
          await new Promise((resolve) => proyectorWindow.webContents.once('did-finish-load', resolve));
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
        timerIniciarIntervalServidor();
        timerEnviarAlProyector();
        return res.json({ ok: true, estado: { ...timerEstadoServidor } });
      } catch (error) {
        return res.status(500).json({ ok: false, error: error.message });
      }
    });

    expressApp.post('/api/control/temporizador/detener', (req, res) => {
      timerDetenerIntervalServidor();
      timerEstadoServidor.corriendo = false;
      timerEstadoServidor.proyectando = false;
      if (proyectorWindow && !proyectorWindow.isDestroyed()) {
        proyectorWindow.webContents.send('mostrar-versiculo', {
          parrafo: '', titulo: ' ', numero: ' ', origen: 'clear',
        });
      }
      return res.json({ ok: true, estado: { ...timerEstadoServidor } });
    });

    // ==================================================
    // ✅ Plantillas GSAP (App móvil)
    // ==================================================
    expressApp.get('/api/plantillas', async (req, res) => {
      try {
        const claves = ['plantillaGsapActiva', 'plantillaGsapColor1', 'plantillaGsapColor2', 'plantillaGsapColorAcc', 'plantillaGsapVelocidad'];
        const cfgValues = await Promise.all(claves.map(c => obtenerConfiguracion(c)));
        const cfg = Object.fromEntries(claves.map((c, i) => [c, cfgValues[i]]));
        const activa = (cfg.plantillaGsapActiva && cfg.plantillaGsapActiva !== 'ninguna') ? cfg.plantillaGsapActiva : null;
        const plantillas = Object.entries(PLANTILLAS_GSAP_META).map(([id, meta]) => ({
          id, ...meta, activa: id === activa,
        }));
        return res.json({
          ok: true, plantillas, activa,
          config: {
            color1: cfg.plantillaGsapColor1 || '#e2e8f0',
            color2: cfg.plantillaGsapColor2 || '#0f172a',
            colorAcc: cfg.plantillaGsapColorAcc || '#34d399',
            velocidad: cfg.plantillaGsapVelocidad || 'media',
          },
        });
      } catch (error) {
        return res.status(500).json({ ok: false, error: error.message });
      }
    });

    expressApp.post('/api/control/plantillas/activar', async (req, res) => {
      try {
        const { id } = req.body || {};
        if (!id || !PLANTILLAS_GSAP_META[id]) return res.status(400).json({ ok: false, error: 'Plantilla no válida' });
        await actualizarConfiguracion('plantillaGsapActiva', id);
        const claves = ['plantillaGsapColor1', 'plantillaGsapColor2', 'plantillaGsapColorAcc', 'plantillaGsapVelocidad'];
        const cfg = {};
        for (const c of claves) cfg[c] = await obtenerConfiguracion(c);
        const lsData = JSON.stringify({
          plantillaId: id,
          config: {
            colorPrimario: cfg.plantillaGsapColor1 || '#e2e8f0',
            colorFondo: cfg.plantillaGsapColor2 || '#0f172a',
            colorAccento: cfg.plantillaGsapColorAcc || '#34d399',
            velocidad: cfg.plantillaGsapVelocidad || 'media',
          },
        });
        // Escribir solo en mainWindow → el evento "storage" se dispara en proyectorWindow
        const jsSet = `localStorage.setItem("gsap-plantilla-global", ${JSON.stringify(lsData)})`;
        if (mainWindow && !mainWindow.isDestroyed()) await mainWindow.webContents.executeJavaScript(jsSet).catch(() => { });
        return res.json({ ok: true, activa: id });
      } catch (error) {
        return res.status(500).json({ ok: false, error: error.message });
      }
    });

    expressApp.post('/api/control/plantillas/desactivar', async (req, res) => {
      try {
        await actualizarConfiguracion('plantillaGsapActiva', 'ninguna');
        // Escribir solo en mainWindow → el evento "storage" se dispara en proyectorWindow
        const jsRemove = `localStorage.removeItem("gsap-plantilla-global")`;
        if (mainWindow && !mainWindow.isDestroyed()) await mainWindow.webContents.executeJavaScript(jsRemove).catch(() => { });
        return res.json({ ok: true, activa: null });
      } catch (error) {
        return res.status(500).json({ ok: false, error: error.message });
      }
    });

    // Endpoint para servir archivos con corrección de extensión
    expressApp.get('/multimedia-fixed/:filename', (req, res) => {
      const filename = req.params.filename;

      // Buscar el archivo en ambos directorios
      const directorios = [multimediaDir, buildMultimediaDir];

      for (const dir of directorios) {
        if (fs.existsSync(dir)) {
          const archivos = fs.readdirSync(dir);

          let archivo;
          for (const f of archivos) {
            if (f === filename) { archivo = f; break; }
            if (!archivo && f.startsWith(filename)) archivo = f;
          }

          if (archivo) {
            const rutaCompleta = path.join(dir, archivo);

            // Configurar headers
            const _ext = path.extname(archivo).toLowerCase();
            if (_ext === '.mp3' || _ext === '.wav') {
              res.setHeader('Content-Type', 'audio/mpeg');
            } else if (_ext === '.mp4' || _ext === '.webm') {
              res.setHeader('Content-Type', 'video/mp4');
            } else if (_ext === '.jpg' || _ext === '.png') {
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
            let found;
            for (const f of archivos) {
              if (f === filename) { found = f; break; }
              if (!found && f.startsWith(filename)) found = f;
            }
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
    // ✅ Estado del proyector para overlay OBS
    expressApp.get('/api/proyector/estado', (_req, res) => {
      // El temporizador sin fondo propio usa el starfield del overlay, no el
      // fondo general del proyector (que puede ser cualquier otra cosa).
      const fondoParaObs = obsEstado.tipo === 'temporizador'
        ? obsEstado.fondo
        : (obsEstado.fondo || fondoActivoObs);
      res.json({ ok: true, ...obsEstado, fondo: fondoParaObs });
    });

    // ✅ Página overlay para OBS Browser Source
    // Uso: agregar como Browser Source en OBS apuntando a http://[IP]:3001/obs
    expressApp.get('/obs', (_req, res) => {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(generarObsHtml());
    });

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
  tipo: 'vacio', // 'vacio' | 'himno' | 'biblia' | 'anuncio' | 'temporizador'
  parrafo: '', titulo: '', numero: '', origen: '',
  segundos: 0, total: 0, mensaje: '', terminado: false,
  fondo: null, // {url, tipo} | null — fondo específico del contenido actual (ej. temporizador)
  updatedAt: Date.now(),
};
const actualizarObs = (tipo, datos = {}) => {
  Object.assign(obsEstado, {
    tipo,
    parrafo: '', titulo: '', numero: '', origen: '',
    segundos: 0, total: 0, mensaje: '', terminado: false,
    fondo: null,
    ...datos,
    updatedAt: Date.now(),
  });
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
      const rel = toFondoRelUrl(activo.url) || (activo.url.startsWith('/') ? activo.url : null);
      if (rel) fondoActivoObs = { url: rel, tipo: activo.tipo || 'imagen' };
    }
  } catch {}
};
const sincronizarFondoObs = (fondoRaw) => {
  if (!fondoRaw?.url) { fondoActivoObs = null; return; }
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
const PLANTILLAS_GSAP_META = {
  revelar: { nombre: 'Revelar', icono: '◈', desc: 'Marco que se dibuja desde las esquinas' },
  neon: { nombre: 'Neón', icono: '⬡', desc: 'Borde luminoso con efecto flicker' },
  iglesia: { nombre: 'Iglesia', icono: '✝', desc: 'Clásico con ornamentos y cruz' },
  cinematica: { nombre: 'Cinemática', icono: '▶', desc: 'Barras de cine + texto con barrido' },
  particulas: { nombre: 'Partículas', icono: '✦', desc: 'Partículas flotantes con halo' },
  gloria: { nombre: 'Gloria', icono: '☀', desc: 'Rayos de luz desde el centro con halos' },
  aurora: { nombre: 'Aurora', icono: '◉', desc: 'Bandas de aurora boreal flotando' },
  minimal: { nombre: 'Minimal', icono: '—', desc: 'Ultra limpio con barrido de línea' },
  majestad: { nombre: 'Majestad', icono: '◆', desc: 'Ornamentos reales púrpura y dorado' },
  olas: { nombre: 'Olas', icono: '〜', desc: 'Líneas de onda en los bordes' },
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
  // ✨ HANDLERS DE MULTIMEDIA (activa, CRUD, archivos)
  // ====================================
  require("./ipc/multimedia").registrar({ obtenerRutaBase });

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

  console.log("✅ [Main] Todos los handlers registrados exitosamente");
}