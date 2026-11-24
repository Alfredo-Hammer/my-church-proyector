// API del temporizador.
// (Separado de main.js. Lo usa iniciarServidorMultimedia() en main.js.)

module.exports = function registrar(expressApp, ctx) {
  const {
    timerEstadoServidor,
    timerIniciarIntervalServidor,
    timerEnviarAlProyector,
    timerDetenerIntervalServidor,
    createProyectorWindow,
  } = ctx;

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

      if (!ctx.proyectorWindow || ctx.proyectorWindow.isDestroyed()) {
        ctx.proyectorWindow = createProyectorWindow();
        await new Promise((resolve) => ctx.proyectorWindow.webContents.once('did-finish-load', resolve));
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
    if (ctx.proyectorWindow && !ctx.proyectorWindow.isDestroyed()) {
      ctx.proyectorWindow.webContents.send('mostrar-versiculo', {
        parrafo: '', titulo: ' ', numero: ' ', origen: 'clear',
      });
    }
    return res.json({ ok: true, estado: { ...timerEstadoServidor } });
  });
};
