// API de presentaciones (diapositivas) desde la app móvil.
// (Separado de main.js. Lo usa iniciarServidorMultimedia() en main.js.)

module.exports = function registrar(expressApp, ctx) {
  const {
    obtenerPresentaciones,
    createProyectorWindow,
    timerEstaProyectando,
    timerRestaurarEnProyector,
  } = ctx;

  // ==================================================
  // ✅ Diapositivas / Presentaciones de imágenes (App móvil)
  // ==================================================
  const enviarSlideDiapositiva = (presentacion, indice) => {
    const img = presentacion.imagenes[indice];
    if (!img) return false;
    const slideData = {
      tipo: 'slide',
      slide: {
        id: `pres-${presentacion.id}-${indice}`,
        backgroundImage: img.url,
        renderMode: 'pptx',
      },
      presentation: {
        currentIndex: indice,
        totalSlides: presentacion.imagenes.length,
      },
    };
    ctx.proyectorWindow.webContents.send('proyectar-slide-data', slideData);
    ctx.diapositivaActiva = {
      presentacionId: presentacion.id,
      indice,
      totalSlides: presentacion.imagenes.length,
    };
    return true;
  };

  expressApp.get('/api/presentaciones', (req, res) => {
    try {
      const lista = obtenerPresentaciones();
      return res.json({ ok: true, presentaciones: Array.isArray(lista) ? lista : [] });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  expressApp.get('/api/presentaciones/activa', (req, res) => {
    return res.json({ ok: true, activa: ctx.diapositivaActiva });
  });

  expressApp.post('/api/control/presentaciones/proyectar', async (req, res) => {
    try {
      const { id, indice } = req.body || {};
      if (!id) return res.status(400).json({ ok: false, error: 'id requerido' });
      const lista = obtenerPresentaciones();
      const presentacion = lista.find((p) => String(p.id) === String(id));
      if (!presentacion) return res.status(404).json({ ok: false, error: 'Presentación no encontrada' });
      const idx = Number.isFinite(indice) ? indice : 0;
      if (!presentacion.imagenes?.[idx]) {
        return res.status(400).json({ ok: false, error: 'Índice de diapositiva inválido' });
      }

      if (!ctx.proyectorWindow || ctx.proyectorWindow.isDestroyed()) {
        ctx.proyectorWindow = createProyectorWindow();
        await new Promise((resolve) => ctx.proyectorWindow.webContents.once('did-finish-load', resolve));
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      enviarSlideDiapositiva(presentacion, idx);
      return res.json({ ok: true, activa: ctx.diapositivaActiva });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  expressApp.post('/api/control/presentaciones/navegar', (req, res) => {
    try {
      const { id, direccion } = req.body || {};
      if (!ctx.diapositivaActiva || String(ctx.diapositivaActiva.presentacionId) !== String(id)) {
        return res.status(409).json({ ok: false, error: 'Esa presentación no está activa' });
      }
      const lista = obtenerPresentaciones();
      const presentacion = lista.find((p) => String(p.id) === String(id));
      if (!presentacion || !presentacion.imagenes?.length) {
        return res.status(404).json({ ok: false, error: 'Presentación no encontrada' });
      }
      if (!ctx.proyectorWindow || ctx.proyectorWindow.isDestroyed()) {
        return res.status(409).json({ ok: false, error: 'Proyector no disponible' });
      }
      const total = presentacion.imagenes.length;
      const paso = direccion < 0 ? -1 : 1;
      const nuevoIndice = ((ctx.diapositivaActiva.indice + paso) % total + total) % total;
      enviarSlideDiapositiva(presentacion, nuevoIndice);
      return res.json({ ok: true, activa: ctx.diapositivaActiva });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  expressApp.post('/api/control/presentaciones/limpiar', (req, res) => {
    try {
      if (timerEstaProyectando()) {
        timerRestaurarEnProyector();
        return res.json({ ok: true, timerActivo: true });
      }
      if (ctx.proyectorWindow && !ctx.proyectorWindow.isDestroyed()) {
        ctx.proyectorWindow.webContents.send('mostrar-versiculo', {
          parrafo: '', titulo: ' ', numero: ' ', origen: 'clear',
        });
      }
      ctx.diapositivaActiva = null;
      return res.json({ ok: true });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  });
};
