// API de plantillas animadas (GSAP).
// (Separado de main.js. Lo usa iniciarServidorMultimedia() en main.js.)

module.exports = function registrar(expressApp, ctx) {
  const {
    obtenerConfiguracion,
    PLANTILLAS_GSAP_META,
    actualizarConfiguracion,
  } = ctx;

  // ==================================================
  // ✅ Plantillas GSAP (App móvil)
  // ==================================================
  expressApp.get('/api/plantillas', async (req, res) => {
    try {
      const claves = ['plantillaGsapActiva', 'plantillaGsapVelocidad'];
      const cfgValues = await Promise.all(claves.map(c => obtenerConfiguracion(c)));
      const cfg = Object.fromEntries(claves.map((c, i) => [c, cfgValues[i]]));
      const activa = (cfg.plantillaGsapActiva && cfg.plantillaGsapActiva !== 'ninguna') ? cfg.plantillaGsapActiva : null;
      const plantillas = Object.entries(PLANTILLAS_GSAP_META).map(([id, meta]) => ({
        id, ...meta, activa: id === activa,
      }));
      return res.json({
        ok: true, plantillas, activa,
        config: {
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
      const velocidad = (await obtenerConfiguracion('plantillaGsapVelocidad')) || 'media';
      // Mismo shape/clave que sincronizarLocalStorage() en Plantillas.jsx —
      // las 4 plantillas curadas actuales usan paletas fijas, ya no colores
      // configurables, así que solo se manda plantillaId + velocidad.
      const lsData = JSON.stringify({
        plantillaId: id,
        config: { velocidad },
      });
      // Escribir solo en mainWindow → el evento "storage" se dispara en proyectorWindow
      const jsSet = `localStorage.setItem("gsap-plantilla-global:v1", ${JSON.stringify(lsData)})`;
      if (ctx.mainWindow && !ctx.mainWindow.isDestroyed()) await ctx.mainWindow.webContents.executeJavaScript(jsSet).catch(() => { });
      return res.json({ ok: true, activa: id });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  expressApp.post('/api/control/plantillas/desactivar', async (req, res) => {
    try {
      await actualizarConfiguracion('plantillaGsapActiva', 'ninguna');
      // Escribir solo en mainWindow → el evento "storage" se dispara en proyectorWindow
      const jsRemove = `localStorage.removeItem("gsap-plantilla-global:v1")`;
      if (ctx.mainWindow && !ctx.mainWindow.isDestroyed()) await ctx.mainWindow.webContents.executeJavaScript(jsRemove).catch(() => { });
      return res.json({ ok: true, activa: null });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  });
};
