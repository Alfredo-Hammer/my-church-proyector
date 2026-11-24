// API de la Biblia (favoritos, estructura, capítulos, versiones RV1960/RV1909).
// (Separado de main.js. Lo usa iniciarServidorMultimedia() en main.js.)

const RAIZ_APP = require("path").join(__dirname, "..", ".."); // = __dirname de main.js

module.exports = function registrar(expressApp, ctx) {
  const {
    obtenerConfiguracion,
    actualizarConfiguracion,
    path,
    buildDir,
    obtenerRutaBase,
    writeLog,
    fs,
    obtenerRutaRecursos,
  } = ctx;

  // ✅ Favoritos de Biblia (RV1960)
  // Respuesta: { ok:true, favoritos:[{ id, libroId, libroNombre, capitulo, versiculo, texto, creadoEn }] }
  const BIBLIA_FAVORITOS_KEY = 'biblia_favoritos_rv1960';

  const normalizarFavoritoBiblia = (raw) => {
    if (!raw) return null;

    // Compat: lista antigua de strings (ids)
    if (typeof raw === 'string') {
      const id = raw.trim();
      if (!id) return null;
      return {
        id,
        libroId: '',
        libroNombre: '',
        capitulo: null,
        versiculo: null,
        texto: '',
        creadoEn: null,
      };
    }

    if (typeof raw !== 'object') return null;

    const id = String(raw.id || '').trim();
    if (!id) return null;

    const libroId = String(raw.libroId || '').trim();
    const libroNombre = String(raw.libroNombre || '').trim();

    const capituloNum = Number(raw.capitulo);
    const versiculoNum = Number(raw.versiculo);

    const capitulo = Number.isFinite(capituloNum) && capituloNum > 0 ? capituloNum : null;
    const versiculo = Number.isFinite(versiculoNum) && versiculoNum > 0 ? versiculoNum : null;

    const texto = typeof raw.texto === 'string' ? raw.texto : '';

    const creadoEnNum = Number(raw.creadoEn);
    const creadoEn = Number.isFinite(creadoEnNum) && creadoEnNum > 0 ? creadoEnNum : null;

    return { id, libroId, libroNombre, capitulo, versiculo, texto, creadoEn };
  };

  const leerFavoritosBiblia = async () => {
    try {
      const raw = await obtenerConfiguracion(BIBLIA_FAVORITOS_KEY);
      const parsed = raw ? JSON.parse(String(raw)) : [];
      const arr = Array.isArray(parsed) ? parsed : [];
      const normalizados = arr.flatMap(f => { const v = normalizarFavoritoBiblia(f); return v ? [v] : []; });

      // De-dup por id (último gana)
      const map = new Map();
      for (const f of normalizados) map.set(f.id, f);
      return Array.from(map.values());
    } catch {
      return [];
    }
  };

  const guardarFavoritosBiblia = async (favoritos) => {
    return actualizarConfiguracion(BIBLIA_FAVORITOS_KEY, JSON.stringify(favoritos));
  };

  expressApp.get('/api/biblia/favoritos', async (_req, res) => {
    try {
      const favoritos = await leerFavoritosBiblia();

      favoritos.sort((a, b) => {
        const ln = String(a?.libroNombre || '').localeCompare(String(b?.libroNombre || ''), 'es');
        if (ln !== 0) return ln;
        const ca = Number(a?.capitulo || 0);
        const cb = Number(b?.capitulo || 0);
        if (ca !== cb) return ca - cb;
        const va = Number(a?.versiculo || 0);
        const vb = Number(b?.versiculo || 0);
        return va - vb;
      });

      return res.json({ ok: true, favoritos });
    } catch (error) {
      console.error('❌ [MAIN] (API) Error /api/biblia/favoritos:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ✅ Estructura de un libro: número de capítulos y versículos por capítulo
  // Respuesta: { ok:true, libroId, capitulos:number, versiculosPorCapitulo:number[] }
  // Usado por la app móvil para renderizar la grilla de capítulos/versículos correctamente.
  // Versión de la Biblia para la API (app móvil): ?version=rv1909|rv1960, o la
  // elegida en la compu (configuración `bibliaVersion`). Los APK viejos no
  // mandan ?version y reciben la versión que se use en la compu.
  const VERSIONES_BIBLIA = { rv1960: 'biblia', rv1909: 'biblia_rv1909' };

  const versionBibliaDe = (req) => {
    const pedida = String(req.query?.version || '').trim();
    if (VERSIONES_BIBLIA[pedida]) return pedida;
    try {
      const elegida = obtenerConfiguracion('bibliaVersion');
      if (VERSIONES_BIBLIA[elegida]) return elegida;
    } catch (_) { /* sin configuración: RV1960 */ }
    return 'rv1960';
  };

  const candidatosLibroBiblia = (libroId, version = 'rv1960') => {
    const carpeta = VERSIONES_BIBLIA[version] || 'biblia';
    const lista = [
      path.join(buildDir, 'data', carpeta, `${libroId}.js`),
      path.join(RAIZ_APP, 'build', 'data', carpeta, `${libroId}.js`),
    ];
    if (carpeta === 'biblia') lista.push(path.join(RAIZ_APP, 'src', 'data', 'biblia', `${libroId}.js`));
    lista.push(path.join(RAIZ_APP, 'public', 'data', carpeta, `${libroId}.js`));
    lista.push(path.join(obtenerRutaBase(), 'public', 'data', carpeta, `${libroId}.js`));
    return lista;
  };

  expressApp.get('/api/biblia/estructura/:libroId', (req, res) => {
    try {
      const libroId = String(req.params?.libroId || '').trim();
      // Validar: solo letras minúsculas, dígitos y guión bajo (evita path traversal)
      if (!libroId || !/^[a-z0-9_]+$/.test(libroId)) {
        writeLog(`⚠️ [API] /api/biblia/estructura - libroId inválido: "${libroId}"`);
        return res.status(400).json({ ok: false, error: 'libroId inválido' });
      }

      // Ampliar candidatos para cubrir más casos en producción
      const candidatos = candidatosLibroBiblia(libroId, versionBibliaDe(req));

      let ruta = null;
      let intentos = [];
      for (const c of candidatos) {
        intentos.push(c);
        if (fs.existsSync(c)) {
          ruta = c;
          break;
        }
      }

      if (!ruta) {
        writeLog(`❌ [API] /api/biblia/estructura - Libro "${libroId}" no encontrado en ningún candidato`);
        writeLog(`   Intentos: ${JSON.stringify(intentos, null, 2)}`);
        return res.status(404).json({
          ok: false,
          error: `Libro "${libroId}" no encontrado`,
          debug: { intentos }
        });
      }

      writeLog(`✅ [API] /api/biblia/estructura - Leyendo: ${ruta}`);

      // Leer como texto y evaluar con vm (evita problemas con import() de ESM en main process)
      const vm = require('vm');
      const contenido = fs.readFileSync(ruta, 'utf8');

      // Quitar "export default" y evaluar el array literal JavaScript
      let arrayStr = contenido.replace(/^\s*(export\s+default|module\.exports\s*=)\s*/, '').trim();
      // Remover punto y coma final si existe
      arrayStr = arrayStr.replace(/;+\s*$/, '').trim();

      let data;
      try {
        data = vm.runInNewContext(`(${arrayStr})`, Object.create(null));
      } catch (vmError) {
        writeLog(`❌ [API] Error evaluando contenido con vm: ${vmError.message}`);
        throw vmError;
      }

      if (!Array.isArray(data) || data.length === 0) {
        writeLog(`❌ [API] Libro "${libroId}" vacío o inválido (no es array o length=0)`);
        return res.status(404).json({ ok: false, error: `Libro "${libroId}" vacío o inválido` });
      }

      const versiculosPorCapitulo = data.map((cap) => (Array.isArray(cap) ? cap.length : 0));

      writeLog(`✅ [API] /api/biblia/estructura - ${libroId}: ${data.length} caps, ${versiculosPorCapitulo.reduce((a, b) => a + b, 0)} vers`);

      return res.json({
        ok: true,
        libroId,
        capitulos: data.length,
        versiculosPorCapitulo,
      });
    } catch (error) {
      writeLog(`❌ [API] Error /api/biblia/estructura: ${error.message}`);
      writeLog(`❌ Stack: ${error.stack}`);
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ✅ Endpoint de diagnóstico para la Biblia (testing desde app móvil)
  expressApp.get('/api/biblia/diagnostico', (req, res) => {
    try {
      const diagnostico = {
        ok: true,
        timestamp: new Date().toISOString(),
        paths: {
          __dirname: RAIZ_APP,
          buildDir: path.join(obtenerRutaRecursos(), "build"),
          userData: obtenerRutaBase(),
        },
        bibliaFiles: {
          found: [],
          notFound: []
        }
      };

      // Probar 3 libros de muestra
      const muestras = ['genesis', 'juan', 'apocalipsis'];
      for (const libroId of muestras) {
        const candidatos = [
          path.join(path.join(obtenerRutaRecursos(), "build"), 'data', 'biblia', `${libroId}.js`),
          path.join(RAIZ_APP, 'build', 'data', 'biblia', `${libroId}.js`),
          path.join(RAIZ_APP, 'src', 'data', 'biblia', `${libroId}.js`),
          path.join(obtenerRutaBase(), 'public', 'data', 'biblia', `${libroId}.js`),
        ];

        let encontrado = null;
        for (const c of candidatos) {
          if (fs.existsSync(c)) {
            encontrado = c;
            break;
          }
        }

        if (encontrado) {
          diagnostico.bibliaFiles.found.push({ libro: libroId, path: encontrado });
        } else {
          diagnostico.bibliaFiles.notFound.push({ libro: libroId, intentos: candidatos });
        }
      }

      // Listar todos los archivos en build/data/biblia si existe
      const buildBibliaDir = path.join(path.join(obtenerRutaRecursos(), "build"), 'data', 'biblia');
      if (fs.existsSync(buildBibliaDir)) {
        const archivos = fs.readdirSync(buildBibliaDir);
        diagnostico.bibliaFiles.enBuildDir = {
          path: buildBibliaDir,
          count: archivos.length,
          sample: archivos.slice(0, 10)
        };
      }

      writeLog(`✅ [API] Diagnóstico Biblia ejecutado - ${diagnostico.bibliaFiles.found.length} found, ${diagnostico.bibliaFiles.notFound.length} not found`);

      return res.json(diagnostico);
    } catch (error) {
      writeLog(`❌ [API] Error en diagnóstico Biblia: ${error.message}`);
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ✅ Toggle favorito de versículo
  // Body: { favorito:boolean, libroId, libroNombre, capitulo:number, versiculo:number, texto:string }
  expressApp.post('/api/biblia/:id/favorito', async (req, res) => {
    try {
      const id = String(req.params?.id || '').trim();
      if (!id) return res.status(400).json({ ok: false, error: 'id inválido' });

      const favorito = Boolean(req.body?.favorito);

      const favoritos = await leerFavoritosBiblia();
      const map = new Map(favoritos.map((f) => [f.id, f]));

      if (favorito) {
        const libroId = String(req.body?.libroId || '').trim();
        const libroNombre = String(req.body?.libroNombre || '').trim();
        const capituloNum = Number(req.body?.capitulo);
        const versiculoNum = Number(req.body?.versiculo);
        const texto = typeof req.body?.texto === 'string' ? req.body.texto : '';

        const capitulo = Number.isFinite(capituloNum) && capituloNum > 0 ? capituloNum : null;
        const versiculo = Number.isFinite(versiculoNum) && versiculoNum > 0 ? versiculoNum : null;

        const previo = map.get(id);
        map.set(id, {
          id,
          libroId,
          libroNombre,
          capitulo,
          versiculo,
          texto,
          creadoEn: previo?.creadoEn || Date.now(),
        });
      } else {
        map.delete(id);
      }

      const ok = await guardarFavoritosBiblia(Array.from(map.values()));
      if (!ok) return res.status(500).json({ ok: false, error: 'No se pudo guardar favorito' });

      return res.json({ ok: true });
    } catch (error) {
      console.error('❌ [MAIN] (API) Error /api/biblia/:id/favorito:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  // GET /api/biblia/capitulo/:libroId/:cap — versículos de un capítulo
  expressApp.get('/api/biblia/capitulo/:libroId/:cap', (req, res) => {
    try {
      const libroId = String(req.params?.libroId || '').trim();
      const cap = parseInt(req.params?.cap, 10);
      if (!libroId || !/^[a-z0-9_]+$/.test(libroId)) {
        return res.status(400).json({ ok: false, error: 'libroId inválido' });
      }
      if (!Number.isFinite(cap) || cap < 1) {
        return res.status(400).json({ ok: false, error: 'cap inválido' });
      }

      const candidatos = candidatosLibroBiblia(libroId, versionBibliaDe(req));

      let ruta = null;
      for (const c of candidatos) {
        if (fs.existsSync(c)) { ruta = c; break; }
      }

      if (!ruta) {
        return res.status(404).json({ ok: false, error: `Libro "${libroId}" no encontrado` });
      }

      const vm = require('vm');
      const contenido = fs.readFileSync(ruta, 'utf8');
      let arrayStr = contenido.replace(/^\s*(export\s+default|module\.exports\s*=)\s*/, '').trim().replace(/;+\s*$/, '').trim();

      let data;
      try {
        data = vm.runInNewContext(`(${arrayStr})`, Object.create(null));
      } catch (vmError) {
        throw vmError;
      }

      if (!Array.isArray(data) || data.length === 0) {
        return res.status(404).json({ ok: false, error: `Libro "${libroId}" vacío o inválido` });
      }

      const capIdx = cap - 1;
      if (capIdx < 0 || capIdx >= data.length) {
        return res.status(404).json({ ok: false, error: `Capítulo ${cap} no existe en "${libroId}"` });
      }

      const versos = Array.isArray(data[capIdx]) ? data[capIdx] : [];
      return res.json({ ok: true, libroId, capitulo: cap, versos });
    } catch (error) {
      console.error('❌ [MAIN] (API) Error /api/biblia/capitulo:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  });
};
