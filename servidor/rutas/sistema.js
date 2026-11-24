// Rutas de sistema: ping, PIN de la app móvil, diagnóstico, datos de conexión y QR.
// (Separado de main.js. Lo usa iniciarServidorMultimedia() en main.js.)

const RAIZ_APP = require("path").join(__dirname, "..", ".."); // = __dirname de main.js

module.exports = function registrar(expressApp, ctx) {
  const {
    fs,
    multimediaDir,
    buildMultimediaDir,
    seguridad,
    app,
    path,
    obtenerRutaRecursos,
    obtenerIpsLocalesV4,
    PORT,
    obtenerUrlPreferidaParaMovil,
    QRCode,
  } = ctx;

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
  // Público en la red local; si se envía el PIN, informa si es correcto
  // (cuenta como intento para el límite anti fuerza bruta).
  expressApp.get('/api/ping', (req, res) => {
    const local = seguridad.esLoopback(req);
    const exigido = !local && seguridad.pinExigido();
    const auth = exigido ? seguridad.autenticarPin(req) : { ok: true };
    res.json({
      ok: true,
      app: 'GloryView',
      version: app.getVersion(),
      serverTime: new Date().toISOString(),
      requierePin: exigido,
      autenticado: auth.ok,
      motivo: auth.ok ? undefined : auth.motivo,
    });
  });

  // 🔐 PIN de emparejamiento (solo desde la PC — ver RUTAS_SOLO_LOCAL)
  expressApp.get('/api/movil/pin', (req, res) => {
    res.json({ ok: true, pin: seguridad.obtenerPin(), exigir: seguridad.pinExigido() });
  });

  expressApp.post('/api/movil/pin/regenerar', (req, res) => {
    res.json({ ok: true, pin: seguridad.regenerarPin(), exigir: seguridad.pinExigido() });
  });

  // Body: { exigir: boolean } — apagarlo deja usar APKs viejos sin PIN
  expressApp.post('/api/movil/pin/exigir', (req, res) => {
    if (typeof req.body?.exigir !== 'boolean') {
      return res.status(400).json({ ok: false, error: 'exigir debe ser boolean' });
    }
    res.json({ ok: true, pin: seguridad.obtenerPin(), exigir: seguridad.establecerExigirPin(req.body.exigir) });
  });

  const urlConPin = (url) => {
    try {
      const u = new URL(url);
      u.searchParams.set('pin', seguridad.obtenerPin());
      return u.toString();
    } catch {
      return url;
    }
  };

  // ✅ Endpoint de diagnóstico para verificar rutas y archivos
  expressApp.get('/api/diagnostico', (req, res) => {
    const buildDir = path.join(obtenerRutaRecursos(), "build");
    const indexExists = fs.existsSync(path.join(buildDir, 'index.html'));
    const buildExists = fs.existsSync(buildDir);
    const buildFiles = buildExists ? fs.readdirSync(buildDir) : [];

    res.json({
      ok: true,
      __dirname: RAIZ_APP,
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
        pin: seguridad.obtenerPin(),
        exigirPin: seguridad.pinExigido(),
        qrValue: urlConPin(preferredUrl),
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
      // El QR lleva la URL + ?pin=XXXXXX para emparejar en un solo paso.
      const value = urlConPin(raw && /^https?:\/\//i.test(raw) ? raw : obtenerUrlPreferidaParaMovil());

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
};
