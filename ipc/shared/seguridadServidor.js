// Seguridad del servidor Express (puerto 3001), que escucha en 0.0.0.0
// para que la app móvil y OBS lo alcancen por la red local.
//
// Reglas:
// - Peticiones desde la misma PC (loopback): permitidas, salvo escrituras
//   que vengan de una página web ajena (Origin no permitido) — evita que un
//   sitio abierto en el navegador de la PC controle el proyector (CSRF).
// - Peticiones desde la red local a /api: requieren el PIN de emparejamiento
//   en el header X-GloryView-Pin, excepto RUTAS_PUBLICAS_LAN (solo lectura,
//   usadas por los overlays de OBS y por imágenes de la app móvil).
// - RUTAS_SOLO_LOCAL nunca se atienden desde la red (muestran el PIN,
//   diagnóstico interno o hacen peticiones salientes).
// - Intentos fallidos de PIN por IP se limitan (anti fuerza bruta).

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const HEADER_PIN = "x-gloryview-pin";

const ORIGENES_PERMITIDOS = new Set([
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
]);

// Solo GET/HEAD. Overlays de OBS (/obs, /obs/tercio-inferior) y miniaturas.
const RUTAS_PUBLICAS_LAN = [
  /^\/api\/ping$/,
  /^\/api\/proyector\/estado$/,
  /^\/api\/tercio-inferior\/estado$/,
  /^\/api\/control\/multimedia\/status$/,
  /^\/api\/multimedia\/[^/]+\/thumbnail$/,
];

const RUTAS_SOLO_LOCAL = [
  /^\/api\/movil\//,
  /^\/api\/connection-info$/,
  /^\/api\/qr\.png$/,
  /^\/api\/diagnostico$/,
  /^\/api\/biblia\/diagnostico$/,
  /^\/api\/download-pixabay-image$/,
  /^\/pixabay-proxy$/,
  /^\/debug\//,
];

const MAX_FALLOS = 10;
const VENTANA_FALLOS_MS = 10 * 60 * 1000;
const BLOQUEO_MS = 10 * 60 * 1000;

const esLoopback = (req) => {
  const ip = String(req.socket?.remoteAddress || "");
  return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
};

const coincide = (lista, ruta) => lista.some((re) => re.test(ruta));

function crearSeguridadServidor({ rutaArchivoPin, log = () => {} }) {
  let pinActual = null;
  // exigir=false: compatibilidad con APKs viejos que no mandan PIN (la iglesia
  // lo apaga mientras actualiza los celulares). Las rutas solo-locales siguen
  // bloqueadas igual.
  let exigirActual = true;
  const fallosPorIp = new Map(); // ip -> { fallos, desde, bloqueadoHasta }

  const generarPin = () => String(crypto.randomInt(0, 1000000)).padStart(6, "0");

  const guardarPin = (pin) => {
    try {
      fs.mkdirSync(path.dirname(rutaArchivoPin), { recursive: true });
      fs.writeFileSync(rutaArchivoPin, JSON.stringify({ pin, exigir: exigirActual }), { mode: 0o600 });
    } catch (e) {
      log(`⚠️ [Seguridad] No se pudo guardar el PIN: ${e.message}`);
    }
  };

  const obtenerPin = () => {
    if (pinActual) return pinActual;
    try {
      const data = JSON.parse(fs.readFileSync(rutaArchivoPin, "utf8"));
      if (/^\d{6}$/.test(String(data?.pin))) {
        pinActual = String(data.pin);
        exigirActual = data?.exigir !== false;
        return pinActual;
      }
    } catch {
      // no existe o está corrupto → generar uno nuevo
    }
    pinActual = generarPin();
    guardarPin(pinActual);
    return pinActual;
  };

  const regenerarPin = () => {
    pinActual = generarPin();
    guardarPin(pinActual);
    fallosPorIp.clear();
    log("🔐 [Seguridad] PIN de la app móvil regenerado");
    return pinActual;
  };

  const pinExigido = () => {
    obtenerPin(); // carga el archivo si todavía no se leyó
    return exigirActual;
  };

  const establecerExigirPin = (exigir) => {
    obtenerPin();
    exigirActual = Boolean(exigir);
    guardarPin(pinActual);
    log(`🔐 [Seguridad] PIN de la app móvil ${exigirActual ? "exigido" : "desactivado (modo compatibilidad)"}`);
    return exigirActual;
  };

  const pinEsValido = (recibido) => {
    const a = Buffer.from(String(recibido || ""));
    const b = Buffer.from(obtenerPin());
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  };

  const estaBloqueada = (ip) => {
    const r = fallosPorIp.get(ip);
    return Boolean(r && r.bloqueadoHasta && r.bloqueadoHasta > Date.now());
  };

  const registrarFallo = (ip) => {
    const ahora = Date.now();
    let r = fallosPorIp.get(ip);
    if (!r || ahora - r.desde > VENTANA_FALLOS_MS) r = { fallos: 0, desde: ahora, bloqueadoHasta: 0 };
    r.fallos += 1;
    if (r.fallos >= MAX_FALLOS) {
      r.bloqueadoHasta = ahora + BLOQUEO_MS;
      log(`🚫 [Seguridad] IP ${ip} bloqueada ${BLOQUEO_MS / 60000} min por PIN incorrecto`);
    }
    fallosPorIp.set(ip, r);
  };

  // ¿La petición trae un PIN correcto? (usado también por /api/ping)
  const autenticarPin = (req) => {
    const ip = String(req.socket?.remoteAddress || "");
    const recibido = req.get(HEADER_PIN);
    if (!recibido) return { ok: false, motivo: "sin-pin" };
    if (estaBloqueada(ip)) return { ok: false, motivo: "bloqueado" };
    if (pinEsValido(recibido)) {
      fallosPorIp.delete(ip);
      return { ok: true };
    }
    registrarFallo(ip);
    return { ok: false, motivo: "pin-incorrecto" };
  };

  // CORS: solo la propia app de escritorio. La app móvil nativa no envía
  // Origin, así que no necesita CORS.
  const opcionesCors = {
    origin: (origin, cb) => cb(null, !origin || ORIGENES_PERMITIDOS.has(origin)),
    allowedHeaders: ["Content-Type", "Accept", "X-GloryView-Pin"],
  };

  const middleware = (req, res, next) => {
    const ruta = req.path;
    if (!ruta.startsWith("/api/") && !ruta.startsWith("/debug/") && ruta !== "/pixabay-proxy") {
      return next(); // estáticos, /obs, index.html
    }

    const metodo = req.method.toUpperCase();
    const esLectura = metodo === "GET" || metodo === "HEAD" || metodo === "OPTIONS";

    if (esLoopback(req)) {
      const origin = req.get("origin");
      if (!esLectura && origin && !ORIGENES_PERMITIDOS.has(origin)) {
        log(`🚫 [Seguridad] Escritura bloqueada desde origen ajeno: ${origin} ${metodo} ${ruta}`);
        return res.status(403).json({ ok: false, error: "Origen no permitido" });
      }
      return next();
    }

    if (coincide(RUTAS_SOLO_LOCAL, ruta)) {
      return res.status(403).json({ ok: false, error: "Solo disponible desde la PC" });
    }

    if (metodo === "OPTIONS") return next(); // preflight CORS
    if (esLectura && coincide(RUTAS_PUBLICAS_LAN, ruta)) return next();

    if (!pinExigido()) return next();

    const auth = autenticarPin(req);
    if (auth.ok) return next();
    if (auth.motivo === "bloqueado") {
      return res.status(429).json({ ok: false, error: "Demasiados intentos. Espera unos minutos.", codigo: "bloqueado" });
    }
    return res.status(401).json({
      ok: false,
      error: auth.motivo === "sin-pin" ? "Falta el PIN de la app móvil" : "PIN incorrecto",
      codigo: auth.motivo,
    });
  };

  return { middleware, opcionesCors, obtenerPin, regenerarPin, autenticarPin, pinExigido, establecerExigirPin, esLoopback, HEADER_PIN };
}

module.exports = { crearSeguridadServidor };
