// API de fondos del proyector y descargas de Pixabay.
// (Separado de main.js. Lo usa iniciarServidorMultimedia() en main.js.)

const RAIZ_APP = require("path").join(__dirname, "..", ".."); // = __dirname de main.js

module.exports = function registrar(expressApp, ctx) {
  const {
    obtenerFondos,
    path,
    establecerFondoActivo,
    sincronizarFondoObs,
    BrowserWindow,
    fs,
    fondosDir,
    buildFondosDir,
    PORT,
    https,
    http,
  } = ctx;

  // ==================================================
  // ✅ Fondos (App móvil)
  // ==================================================

  // ✅ Listar fondos
  // Respuesta: { ok:true, fondos:[{id,url,tipo,nombre,activo,created_at}] }
  expressApp.get('/api/fondos', async (req, res) => {
    try {
      const fondos = await obtenerFondos();
      const base = ctx.getRequestBaseUrl(req);

      const normalizados = (Array.isArray(fondos) ? fondos : []).map((f) => {
        // Los fondos animados no tienen archivo — su url ya es el
        // identificador final ("animado:estrellas"), no se reescribe.
        if (f.tipo === 'animado') {
          return {
            id: f.id,
            url: f.url,
            url_localhost: f.url,
            tipo: f.tipo,
            nombre: f.nombre || `Fondo ${f.id}`,
            activo: Boolean(f.activo),
            created_at: f.created_at || new Date().toISOString(),
          };
        }
        const rawUrl = String(f?.url || '').trim();
        let urlPublica = rawUrl;
        if (urlPublica && !/^https?:\/\//i.test(urlPublica)) {
          if (urlPublica.startsWith('/')) {
            urlPublica = `${base}${urlPublica}`;
          } else {
            urlPublica = `${base}/fondos/${path.basename(urlPublica)}`;
          }
        }

        return {
          id: f.id,
          url: urlPublica,
          url_localhost: rawUrl ? ctx.toLocalhostUrl(rawUrl.startsWith('/') ? rawUrl : `/fondos/${path.basename(rawUrl)}`) : '',
          tipo: f.tipo || 'imagen',
          nombre: f.nombre || `Fondo ${f.id}`,
          activo: Boolean(f.activo),
          created_at: f.created_at || new Date().toISOString(),
        };
      });

      return res.json({ ok: true, fondos: normalizados });
    } catch (error) {
      console.error('❌ [MAIN] (API) Error /api/fondos:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ✅ Fondo activo
  expressApp.get('/api/fondos/activo', async (req, res) => {
    try {
      const fondos = await obtenerFondos();
      const activo = (Array.isArray(fondos) ? fondos : []).find((f) => f.activo);
      if (!activo) return res.json({ ok: true, fondo: null });

      // Los fondos animados no tienen archivo — su url ya es el
      // identificador final ("animado:estrellas"), no se reescribe.
      if (activo.tipo === 'animado') {
        return res.json({
          ok: true,
          fondo: { ...activo, url_localhost: activo.url },
        });
      }

      const base = ctx.getRequestBaseUrl(req);
      const rawUrl = String(activo?.url || '').trim();
      let urlPublica = rawUrl;
      if (urlPublica && !/^https?:\/\//i.test(urlPublica)) {
        if (urlPublica.startsWith('/')) {
          urlPublica = `${base}${urlPublica}`;
        } else {
          urlPublica = `${base}/fondos/${path.basename(urlPublica)}`;
        }
      }

      return res.json({
        ok: true,
        fondo: {
          ...activo,
          url: urlPublica,
          url_localhost: rawUrl ? ctx.toLocalhostUrl(rawUrl.startsWith('/') ? rawUrl : `/fondos/${path.basename(rawUrl)}`) : '',
        },
      });
    } catch (error) {
      console.error('❌ [MAIN] (API) Error /api/fondos/activo:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ✅ Establecer fondo activo
  // Body: { id:number }
  expressApp.post('/api/fondos/activo', async (req, res) => {
    try {
      const id = Number(req.body?.id);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ ok: false, error: 'id inválido' });
      }

      const ok = await establecerFondoActivo(id);
      if (!ok) {
        return res.status(500).json({ ok: false, error: 'No se pudo activar el fondo' });
      }

      const fondos = await obtenerFondos();
      const fondoActivo = (Array.isArray(fondos) ? fondos : []).find((f) => f.activo) || null;

      // Sincronizar fondo para overlay OBS
      sincronizarFondoObs(fondoActivo);

      // Notificar a todas las ventanas (incluye proyector)
      const todasLasVentanas = BrowserWindow.getAllWindows();
      todasLasVentanas.forEach((ventana) => {
        if (!ventana.isDestroyed()) {
          if (fondoActivo && fondoActivo.tipo !== 'animado' && fondoActivo.url && !String(fondoActivo.url).startsWith('http')) {
            ventana.webContents.send('actualizar-fondo-activo', {
              ...fondoActivo,
              url: ctx.toLocalhostUrl(fondoActivo.url),
            });
          } else {
            ventana.webContents.send('actualizar-fondo-activo', fondoActivo);
          }
        }
      });

      return res.json({ ok: true, fondo: fondoActivo });
    } catch (error) {
      console.error('❌ [MAIN] (API) Error POST /api/fondos/activo:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ✨ ENDPOINT PARA DEBUGGEAR FONDOS DISPONIBLES
  expressApp.get('/debug/fondos', (req, res) => {
    const publicFiles = fs.existsSync(fondosDir) ? fs.readdirSync(fondosDir) : [];
    const buildFiles = fs.existsSync(buildFondosDir) ? fs.readdirSync(buildFondosDir) : [];

    res.json({
      publicDir: fondosDir,
      buildDir: buildFondosDir,
      publicFiles,
      buildFiles,
      totalFiles: [...new Set([...publicFiles, ...buildFiles])],
      serverUrls: {
        public: publicFiles.map(f => `http://localhost:3001/fondos/${f}`),
        build: buildFiles.map(f => `http://localhost:3001/fondos/${f}`)
      }
    });
  });

  // ✨ Proxy para imágenes de Pixabay
  expressApp.get('/pixabay-proxy', async (req, res) => {
    const imageUrl = req.query.url;

    if (!imageUrl) {
      console.error('❌ [Pixabay Proxy] URL no proporcionada');
      return res.status(400).json({ error: 'URL de imagen requerida' });
    }

    console.log('🔄 [Pixabay Proxy] Intentando cargar:', imageUrl);

    try {
      const fetch = (await import('node-fetch')).default;

      // Mejorar headers para simular un navegador real
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': 'https://pixabay.com/',
          'Origin': 'https://pixabay.com',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Sec-Fetch-Dest': 'image',
          'Sec-Fetch-Mode': 'no-cors',
          'Sec-Fetch-Site': 'cross-site'
        },
        redirect: 'follow',
        timeout: 15000 // 15 segundos timeout
      });

      if (!response.ok) {
        console.error(`❌ [Pixabay Proxy] HTTP ${response.status}: ${response.statusText}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      } else {
        res.setHeader('Content-Type', 'image/jpeg'); // Default para Pixabay
      }

      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache por 1 hora
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');

      console.log('✅ [Pixabay Proxy] Imagen cargada exitosamente');
      response.body.pipe(res);
    } catch (error) {
      console.error('❌ [Pixabay Proxy] Error completo:', error.message);
      console.error('❌ URL que falló:', imageUrl);
      res.status(500).json({
        error: 'Error al cargar imagen de Pixabay',
        details: error.message,
        url: imageUrl
      });
    }
  });

  // 📥 Endpoint para descargar imágenes de Pixabay localmente
  expressApp.post('/api/download-pixabay-image', async (req, res) => {
    console.log('\n📥 ========================================');
    console.log('📥 [Pixabay Download] Request recibido');
    console.log('📥 Body:', JSON.stringify(req.body, null, 2));

    try {
      const { imageUrl, imageId, tags } = req.body;

      if (!imageUrl) {
        console.error('❌ URL de imagen no proporcionada');
        return res.status(400).json({
          error: 'URL de imagen requerida',
          received: req.body
        });
      }

      console.log('📥 URL a descargar:', imageUrl);
      console.log('📥 ID:', imageId);

      const crypto = require('crypto');

      // Crear carpeta para imágenes de Pixabay en userData (fuera del .asar)
      const { app: electronApp } = require('electron');
      const isDev = !electronApp.isPackaged;
      const pixabayFolder = isDev
        ? path.join(RAIZ_APP, 'build', 'images', 'pixabay')
        : path.join(electronApp.getPath('userData'), 'build', 'images', 'pixabay');

      console.log('📁 Carpeta destino:', pixabayFolder);
      console.log('📁 App empaquetada:', !isDev);
      console.log('📁 userData path:', electronApp.getPath('userData'));

      try {
        if (!fs.existsSync(pixabayFolder)) {
          console.log('📁 Carpeta no existe, creando...');
          fs.mkdirSync(pixabayFolder, { recursive: true });
          console.log('✅ Carpeta creada exitosamente');
        } else {
          console.log('✅ Carpeta ya existe');
        }

        // Verificar permisos de escritura
        const testPath = path.join(pixabayFolder, '.test');
        fs.writeFileSync(testPath, 'test');
        fs.unlinkSync(testPath);
        console.log('✅ Permisos de escritura verificados');

      } catch (dirError) {
        console.error('❌ Error creando/verificando carpeta:', dirError.message);
        throw new Error(`No se puede crear carpeta: ${dirError.message}`);
      }

      // Evitar volver a descargar la misma imagen/video de Pixabay: el
      // nombre de archivo ya codifica el imageId (pixabay_<id>_<hash>.ext),
      // así que basta con buscar un archivo existente con ese prefijo.
      if (imageId) {
        const prefijo = `pixabay_${imageId}_`;
        const existente = fs.readdirSync(pixabayFolder)
          .find((nombre) => nombre.startsWith(prefijo));
        if (existente) {
          const statsExistente = fs.statSync(path.join(pixabayFolder, existente));
          console.log('♻️  [Pixabay Download] Ya descargado antes, reutilizando:', existente);
          return res.json({
            success: true,
            localPath: `http://localhost:${PORT}/images/pixabay/${existente}`,
            filename: existente,
            size: statsExistente.size,
            duplicado: true,
          });
        }
      }

      // Generar nombre único para la imagen
      const extension = imageUrl.split('.').pop().split('?')[0] || 'jpg';
      const filename = `pixabay_${imageId || Date.now()}_${crypto.randomBytes(4).toString('hex')}.${extension}`;
      const filepath = path.join(pixabayFolder, filename);

      console.log('💾 Guardando como:', filename);
      console.log('📂 Ruta completa:', filepath);

      // Descargar usando https/http nativo de Node.js
      const downloadPromise = new Promise((resolve, reject) => {
        const protocol = imageUrl.startsWith('https') ? https : http;

        const downloadFile = (url) => {
          console.log('⬇️  Descargando desde:', url);

          protocol.get(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'image/*,*/*;q=0.8',
            },
            timeout: 30000
          }, (response) => {
            console.log('📡 Response status:', response.statusCode);
            console.log('📡 Response headers:', response.headers);

            // Manejar redirecciones
            if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307) {
              const redirectUrl = response.headers.location;
              console.log('↪️  Redirigiendo a:', redirectUrl);
              response.resume(); // Consumir response antes de nueva petición
              downloadFile(redirectUrl); // Recursión para seguir redirección
              return;
            }

            if (response.statusCode !== 200) {
              const errorMsg = `HTTP ${response.statusCode}: ${response.statusMessage}`;
              console.error('❌ Error en respuesta HTTP:', errorMsg);
              reject(new Error(errorMsg));
              return;
            }

            console.log('📥 Creando stream de escritura...');
            const fileStream = fs.createWriteStream(filepath);
            let downloadedBytes = 0;

            fileStream.on('open', () => {
              console.log('✅ Stream de archivo abierto');
            });

            response.on('data', (chunk) => {
              downloadedBytes += chunk.length;
              if (downloadedBytes % 100000 === 0) { // Log cada 100KB
                console.log(`📊 Descargados: ${(downloadedBytes / 1024).toFixed(0)} KB`);
              }
            });

            response.pipe(fileStream);

            fileStream.on('finish', () => {
              fileStream.close();
              console.log('✅ Stream cerrado');
              console.log('✅ Descarga completada:', downloadedBytes, 'bytes');
              resolve(downloadedBytes);
            });

            fileStream.on('error', (err) => {
              console.error('❌ Error en stream de archivo:', err.message);
              console.error('❌ Código de error:', err.code);
              fs.unlink(filepath, (unlinkErr) => {
                if (unlinkErr) console.error('❌ Error eliminando archivo parcial:', unlinkErr.message);
              });
              reject(new Error(`Error escribiendo archivo: ${err.message}`));
            });
          }).on('error', reject).on('timeout', () => {
            reject(new Error('Timeout: descarga tardó más de 30 segundos'));
          });
        };

        downloadFile(imageUrl);
      });

      await downloadPromise;

      // Verificar archivo
      const stats = fs.statSync(filepath);
      console.log('✅ Archivo guardado exitosamente');
      console.log('✅ Tamaño:', (stats.size / 1024).toFixed(2), 'KB');

      const localPath = `http://localhost:${PORT}/images/pixabay/${filename}`;
      console.log('✅ URL local:', localPath);
      console.log('✅ ========================================\n');

      res.json({
        success: true,
        localPath: localPath,
        filename: filename,
        size: stats.size
      });

    } catch (error) {
      console.error('❌ [Pixabay Download] ERROR:', error.message);
      console.error('❌ Stack:', error.stack);
      console.error('❌ ========================================\n');

      res.status(500).json({
        error: 'Error al descargar imagen',
        details: error.message,
        stack: error.stack
      });
    }
  });
};
