// API de órdenes de servicio y proyección de sus ítems.
// (Separado de main.js. Lo usa iniciarServidorMultimedia() en main.js.)

module.exports = function registrar(expressApp, ctx) {
  const {
    obtenerOrdenesServicio,
    obtenerOrdenServicioPorId,
    agregarOrdenServicio,
    actualizarOrdenServicio,
    eliminarOrdenServicio,
    createProyectorWindow,
  } = ctx;

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

      if (!ctx.proyectorWindow || ctx.proyectorWindow.isDestroyed()) {
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
        ctx.proyectorWindow.webContents.send(canal, payload);
      }

      return res.json({ ok: true, itemIdx: idx, parrafoIdx: parIdx, totalItems: items.length, totalParrafos });
    } catch (error) {
      console.error('❌ [MAIN] (API) Error /api/control/ordenes-servicio/proyectar-item:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  });
};
