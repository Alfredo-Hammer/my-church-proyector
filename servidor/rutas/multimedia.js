// API de multimedia: lista, favoritos, control de reproducción, solo audio, miniaturas.
// (Separado de main.js. Lo usa iniciarServidorMultimedia() en main.js.)

module.exports = function registrar(expressApp, ctx) {
  const {
    createProyectorWindow,
    obtenerMultimedia,
    obtenerMultimediaFavoritos,
    actualizarObs,
    multimediaPlaybackStatus,
    actualizarFavoritoMultimedia,
    multimediaDir,
    buildMultimediaDir,
    fs,
    path,
    rutaBase,
    spawn,
  } = ctx;

  const absolutizarUrl = (req, url) => {
    const raw = String(url || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    const base = ctx.getRequestBaseUrl(req);
    if (raw.startsWith('/')) return `${base}${raw}`;
    return `${base}/${raw}`;
  };

  const asegurarProyectorListo = async () => {
    if (!ctx.proyectorWindow || ctx.proyectorWindow.isDestroyed()) {
      ctx.proyectorWindow = createProyectorWindow();
      if (!ctx.proyectorWindow) {
        throw new Error('No se pudo crear la ventana del proyector');
      }

      await new Promise((resolve) => {
        ctx.proyectorWindow.webContents.once('did-finish-load', resolve);
      });

      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    if (ctx.proyectorWindow.webContents.isLoading()) {
      await new Promise((resolve) => {
        ctx.proyectorWindow.webContents.once('did-finish-load', resolve);
      });
    }

    try {
      ctx.proyectorWindow.focus();
    } catch {
      // Ignorar
    }

    return ctx.proyectorWindow;
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
          url_localhost: urlRel ? ctx.toLocalhostUrl(urlRel) : '',
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
          url_localhost: urlRel ? ctx.toLocalhostUrl(urlRel) : '',
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
        url: ctx.toLocalhostUrl(finalUrl),
        nombre: finalNombre || finalUrl.split('/').pop() || 'Multimedia',
      };

      proyector.webContents.send('mostrar-multimedia', payload);
      actualizarObs('multimedia', {
        media: {url: payload.url, tipo: payload.tipo, nombre: payload.nombre},
      });

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
        actualizarObs('vacio');
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

      if (!ctx.mainWindow || ctx.mainWindow.isDestroyed()) {
        return res.status(409).json({ ok: false, error: 'Ventana principal no disponible' });
      }

      const numericId = (id !== undefined && id !== null && String(id).trim() !== '')
        ? id
        : (media?.id ?? null);

      const payload = {
        id: numericId,
        tipo: finalTipo,
        url: ctx.toLocalhostUrl(finalUrl),
        nombre: finalNombre || finalUrl.split('/').pop() || 'Multimedia',
        soloAudio: true,
      };

      ctx.mainWindow.webContents.send('solo-audio-play', payload);

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

      if (!ctx.mainWindow || ctx.mainWindow.isDestroyed()) {
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

      ctx.mainWindow.webContents.send('solo-audio-control', payload);

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

      const correrFfmpeg = (argumentos) => new Promise((resolve, reject) => {
        const proc = spawn(ctx.FFMPEG_BIN, argumentos, { stdio: 'ignore' });
        proc.on('error', (err) => reject(err));
        proc.on('close', (code) => {
          if (code === 0) return resolve();
          reject(new Error(`ffmpeg exit ${code}`));
        });
      });
      await correrFfmpeg(args);
      // Videos de 1 s o menos: en el segundo 1 no hay cuadro y ffmpeg sale
      // bien sin escribir nada. Reintentar con el primer cuadro.
      if (!fs.existsSync(thumbPath)) {
        await correrFfmpeg(args.map((a) => (a === '00:00:01' ? '00:00:00' : a)));
      }

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
};
