// API de anuncios.
// (Separado de main.js. Lo usa iniciarServidorMultimedia() en main.js.)

module.exports = function registrar(expressApp, ctx) {
  const {
    obtenerAnuncios,
    createProyectorWindow,
    actualizarObs,
    timerEstaProyectando,
    timerRestaurarEnProyector,
  } = ctx;

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

      if (!ctx.proyectorWindow || ctx.proyectorWindow.isDestroyed()) {
        ctx.proyectorWindow = createProyectorWindow();
        await new Promise((resolve) => ctx.proyectorWindow.webContents.once('did-finish-load', resolve));
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      ctx.proyectorWindow.webContents.send('mostrar-versiculo', {
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
      if (ctx.proyectorWindow && !ctx.proyectorWindow.isDestroyed()) {
        ctx.proyectorWindow.webContents.send('mostrar-versiculo', {
          parrafo: '', titulo: ' ', numero: ' ', origen: 'clear',
        });
      }
      return res.json({ ok: true });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  });
};
