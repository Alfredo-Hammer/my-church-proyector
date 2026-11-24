// Control del proyector desde la app móvil: himnos, partes, versículos.
// (Separado de main.js. Lo usa iniciarServidorMultimedia() en main.js.)

module.exports = function registrar(expressApp, ctx) {
  const {
    createProyectorWindow,
    actualizarObs,
    timerEstaProyectando,
    timerRestaurarEnProyector,
    solicitarBibliaPreviewAlRenderer,
  } = ctx;

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
      if (!ctx.proyectorWindow) {
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
        ctx.proyectorWindow.webContents.send('mostrar-himno', payload);
      }
      require('../../ipc/partesProyector').reiniciarPartes();
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
      if (ctx.proyectorWindow && !ctx.proyectorWindow.isDestroyed()) {
        ctx.proyectorWindow.webContents.send('limpiar-proyector');
        require('../../ipc/partesProyector').reiniciarPartes();
        actualizarObs('vacio');
        return res.json({ ok: true });
      }
      return res.status(500).json({ ok: false, error: 'Ventana del proyector no disponible' });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ✅ Modo lejos: pasar a la parte siguiente/anterior del versículo dividido
  // Body: { direccion: 1 | -1 } → { ok, movido, parte, total }
  // movido:false = ya estaba en la primera/última parte → el móvil cambia de versículo.
  expressApp.post('/api/control/parte', (req, res) => {
    const partes = require('../../ipc/partesProyector');
    const direccion = Number(req.body?.direccion) > 0 ? 1 : -1;
    const movido = partes.cambiarParte(direccion);
    return res.json({ ok: true, movido, ...partes.obtenerPartes() });
  });

  // GET → { ok, parte, total }
  expressApp.get('/api/proyector/partes', (_req, res) => {
    return res.json({ ok: true, ...require('../../ipc/partesProyector').obtenerPartes() });
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

      if (!ctx.mainWindow || ctx.mainWindow.isDestroyed()) {
        return res.status(500).json({ ok: false, error: 'Ventana principal no disponible' });
      }

      ctx.mainWindow.webContents.send('control-biblia-proyectar', {
        libroId: libroId.trim(),
        capitulo: cap,
        versiculo: ver,
        parteInicial: req.body?.parteInicial === 'ultima' ? 'ultima' : undefined,
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
};
