// Estado del proyector, overlays de OBS y página de inicio del servidor.
// (Separado de main.js. Lo usa iniciarServidorMultimedia() en main.js.)

module.exports = function registrar(expressApp, ctx) {
  const {
    obsEstado,
    generarObsHtml,
    generarTercioInferiorHtml,
    obtenerConfiguracion,
    path,
    obtenerRutaRecursos,
    fs,
  } = ctx;

  // 🏠 Ruta raíz para servir index.html
  // ✅ Estado del proyector para overlay OBS
  expressApp.get('/api/proyector/estado', (_req, res) => {
    // El temporizador sin fondo propio usa el starfield del overlay, no el
    // fondo general del proyector (que puede ser cualquier otra cosa).
    const fondoParaObs = obsEstado.tipo === 'temporizador'
      ? obsEstado.fondo
      : (obsEstado.fondo || ctx.fondoActivoObs);
    res.json({ ok: true, ...obsEstado, fondo: fondoParaObs });
  });

  // ✅ Página overlay para OBS Browser Source
  // Uso: agregar como Browser Source en OBS apuntando a http://[IP]:3001/obs
  expressApp.get('/obs', (_req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(generarObsHtml());
  });

  // ✅ Tercio inferior — fuente de Navegador propia en OBS, independiente
  // del /obs general (así queda siempre agregada en la escena sin
  // depender de si el overlay de versículos/anuncios está activo).
  // Uso: http://[IP]:3001/obs/tercio-inferior
  expressApp.get('/obs/tercio-inferior', (_req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(generarTercioInferiorHtml());
  });

  expressApp.get('/api/tercio-inferior/estado', (_req, res) => {
    const logoUrl = obtenerConfiguracion('logoUrl') || '/images/icon-256.png';
    const nombreIglesia = obtenerConfiguracion('nombreIglesia') || 'GloryView';
    res.json({ ok: true, ...obsEstado.tercioInferior, logoUrl, nombreIglesia });
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
};
