// API de himnos (lista, búsqueda, favoritos, himnos personales).
// (Separado de main.js. Lo usa iniciarServidorMultimedia() en main.js.)

const RAIZ_APP = require("path").join(__dirname, "..", ".."); // = __dirname de main.js

module.exports = function registrar(expressApp, ctx) {
  const {
    path,
    buildDir,
    fs,
    obtenerConfiguracion,
    obtenerHimnos,
    actualizarFavoritoHimno,
    actualizarConfiguracion,
    crearHimno,
    actualizarHimno,
    eliminarHimno,
  } = ctx;

  // ✅ Catálogo de himnos para app móvil (siempre desde el escritorio)
  // Query: ?tipo=moravo|vida|personal  (moravo = el himnario en miskito elegido: moravo o adventista)
  // Respuesta: { ok:true, tipo, himnos:[{ id, numero, titulo, parrafos, fuente }] }
  // Nota: moravo/vida devuelve solo el catálogo base; personal devuelve solo himnos creados por el usuario.
  const leerJsonHimnosSeguro = (filename) => {
    const candidatos = [
      // Producción: build (si el archivo fue copiado desde public/)
      path.join(buildDir, 'data', filename),
      // Desarrollo: fuente del proyecto
      path.join(RAIZ_APP, 'src', 'data', filename),
      // Último recurso: carpeta data del repo
      path.join(RAIZ_APP, 'data', filename),
    ];

    for (const ruta of candidatos) {
      try {
        if (fs.existsSync(ruta)) {
          const raw = fs.readFileSync(ruta, 'utf-8');
          const json = JSON.parse(raw);
          return Array.isArray(json) ? json : [];
        }
      } catch (e) {
        console.warn('⚠️ [MAIN] No se pudo leer JSON de himnos:', ruta, e?.message);
      }
    }

    return [];
  };

  // Himnario en miskito elegido por la iglesia (Configuración → `himnario`): se muestra uno solo.
  // La app móvil (también las versiones viejas) pide `tipo=moravo` y recibe el elegido.
  const HIMNARIOS = {
    moravo: { archivo: 'himnos.json', favoritos: 'himnos_favoritos_moravo', nombre: 'Himnario Moravo' },
    adventista: { archivo: 'himnos_adventista.json', favoritos: 'himnos_favoritos_adventista', nombre: 'Himnario Adventista' },
    vida: { archivo: 'vidacristiana.json', favoritos: 'himnos_favoritos_vida', nombre: 'Vida Cristiana' },
  };
  const himnarioElegido = async () => {
    try {
      return String(await obtenerConfiguracion('himnario')) === 'adventista' ? 'adventista' : 'moravo';
    } catch {
      return 'moravo';
    }
  };
  // tipo de la petición → clave real en HIMNARIOS ('moravo' = el himnario elegido).
  const resolverTipo = async (tipo) => (tipo === 'vida' ? 'vida' : await himnarioElegido());

  expressApp.get('/api/himnos', async (req, res) => {
    try {
      const tipoRaw = String(req.query?.tipo || 'moravo').toLowerCase();
      const tipo = tipoRaw === 'vida' ? 'vida' : tipoRaw === 'personal' ? 'personal' : 'moravo';

      let baseNormalizados = [];
      let dbNormalizados = [];

      const real = tipo === 'personal' ? null : await resolverTipo(tipo);
      if (tipo !== 'personal') {
        const filename = HIMNARIOS[real].archivo;

        const keyFavoritos = HIMNARIOS[real].favoritos;
        let favoritosBaseIds = [];
        try {
          const rawFav = await obtenerConfiguracion(keyFavoritos);
          const parsedFav = rawFav ? JSON.parse(String(rawFav)) : [];
          favoritosBaseIds = Array.isArray(parsedFav) ? parsedFav.map((x) => String(x)) : [];
        } catch {
          favoritosBaseIds = [];
        }

        const base = leerJsonHimnosSeguro(filename);
        baseNormalizados = base.flatMap((h) => {
          if (!String(h?.titulo || '').trim()) return [];
          return [{
            id: `base:${real}:${h?.numero ?? ''}`,
            numero: h?.numero ?? '',
            titulo: h?.titulo ?? '',
            parrafos: Array.isArray(h?.parrafos) ? h.parrafos : [],
            fuente: real,
            favorito: favoritosBaseIds.includes(`base:${real}:${h?.numero ?? ''}`),
          }];
        });
      }

      if (tipo === 'personal') {
        const himnosDb = await obtenerHimnos();
        dbNormalizados = (Array.isArray(himnosDb) ? himnosDb : []).flatMap((h) => {
          if (!String(h?.titulo || '').trim()) return [];
          let letra = [];
          try {
            letra = JSON.parse(h?.letra || '[]');
          } catch {
            letra = [];
          }
          return [{
            id: `db:${h?.id ?? ''}`,
            numero: h?.numero ?? '',
            titulo: h?.titulo ?? '',
            parrafos: Array.isArray(letra) ? letra : [],
            fuente: 'personal',
            favorito: Boolean(h?.favorito),
          }];
        });
      }

      return res.json({
        ok: true,
        tipo,
        // Para versiones nuevas de la app móvil: qué himnario es (nombre para mostrar).
        himnario: real ? { id: real, nombre: HIMNARIOS[real].nombre } : null,
        himnos: tipo === 'personal' ? dbNormalizados : baseNormalizados,
      });
    } catch (error) {
      console.error('❌ [MAIN] (API) Error /api/himnos:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ✅ Favoritos de himnos (App móvil)
  // Query: ?tipo=moravo|vida|all
  // Respuesta: { ok:true, himnos:[{id,numero,titulo,parrafos,fuente,favorito}] }
  expressApp.get('/api/himnos/favoritos', async (req, res) => {
    try {
      const tipoRaw = String(req.query?.tipo || 'all').toLowerCase();
      const principal = await himnarioElegido();
      const tipos = tipoRaw === 'vida' ? ['vida'] : tipoRaw === 'moravo' ? [principal] : [principal, 'vida'];

      const favoritos = [];

      for (const t of tipos) {
        const filename = HIMNARIOS[t].archivo;
        const keyFavoritos = HIMNARIOS[t].favoritos;

        let favoritosBaseIds = [];
        try {
          const rawFav = await obtenerConfiguracion(keyFavoritos);
          const parsedFav = rawFav ? JSON.parse(String(rawFav)) : [];
          favoritosBaseIds = Array.isArray(parsedFav) ? parsedFav.map((x) => String(x)) : [];
        } catch {
          favoritosBaseIds = [];
        }

        if (favoritosBaseIds.length) {
          const favoritosBaseSet = new Set(favoritosBaseIds);
          const base = leerJsonHimnosSeguro(filename);
          for (const h of base) {
            const titulo = String(h?.titulo || '').trim();
            const id = `base:${t}:${h?.numero ?? ''}`;
            if (!titulo || !favoritosBaseSet.has(id)) continue;
            favoritos.push({ id, numero: h?.numero ?? '', titulo, parrafos: Array.isArray(h?.parrafos) ? h.parrafos : [], fuente: t, favorito: true });
          }
        }
      }

      const himnosDb = await obtenerHimnos();
      for (const h of (Array.isArray(himnosDb) ? himnosDb : [])) {
        if (!h?.favorito) continue;
        const titulo = String(h?.titulo || '').trim();
        if (!titulo) continue;
        let letra = [];
        try {
          letra = JSON.parse(h?.letra || '[]');
        } catch {
          letra = [];
        }
        favoritos.push({ id: `db:${h?.id ?? ''}`, numero: h?.numero ?? '', titulo, parrafos: Array.isArray(letra) ? letra : [], fuente: 'personal', favorito: true });
      }

      favoritos.sort((a, b) => {
        const na = Number(a?.numero);
        const nb = Number(b?.numero);
        if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
        return String(a?.titulo || '').localeCompare(String(b?.titulo || ''), 'es');
      });

      return res.json({ ok: true, himnos: favoritos });
    } catch (error) {
      console.error('❌ [MAIN] (API) Error /api/himnos/favoritos:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ✅ Toggle favorito himno (App móvil)
  // Body: { favorito:boolean }
  expressApp.post('/api/himnos/:id/favorito', async (req, res) => {
    try {
      const id = String(req.params?.id || '').trim();
      if (!id) return res.status(400).json({ ok: false, error: 'id inválido' });
      const favorito = Boolean(req.body?.favorito);

      if (id.startsWith('db:')) {
        const raw = id.slice(3);
        const dbId = Number(raw);
        if (!Number.isFinite(dbId)) {
          return res.status(400).json({ ok: false, error: 'id db inválido' });
        }

        const ok = await actualizarFavoritoHimno(dbId, favorito);
        if (!ok) {
          return res.status(500).json({ ok: false, error: 'No se pudo actualizar favorito' });
        }
        return res.json({ ok: true });
      }

      if (id.startsWith('base:')) {
        const parts = id.split(':');
        const tipo = HIMNARIOS[parts?.[1]] ? parts[1] : 'moravo';
        const keyFavoritos = HIMNARIOS[tipo].favoritos;

        let favoritosBaseIds = [];
        try {
          const rawFav = await obtenerConfiguracion(keyFavoritos);
          const parsedFav = rawFav ? JSON.parse(String(rawFav)) : [];
          favoritosBaseIds = Array.isArray(parsedFav) ? parsedFav.map((x) => String(x)) : [];
        } catch {
          favoritosBaseIds = [];
        }

        const set = new Set(favoritosBaseIds);
        if (favorito) set.add(id);
        else set.delete(id);

        const ok = await actualizarConfiguracion(keyFavoritos, JSON.stringify(Array.from(set)));
        if (!ok) {
          return res.status(500).json({ ok: false, error: 'No se pudo guardar favorito' });
        }

        return res.json({ ok: true });
      }

      return res.status(400).json({ ok: false, error: 'Formato de id no soportado' });
    } catch (error) {
      console.error('❌ [MAIN] (API) Error /api/himnos/:id/favorito:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ✅ CRUD Himnos Personalizados (App móvil)
  // POST /api/himnos/personal — crear himno
  expressApp.post('/api/himnos/personal', async (req, res) => {
    try {
      const { numero, titulo, letra } = req.body || {};
      if (!titulo || !String(titulo).trim()) {
        return res.status(400).json({ ok: false, error: 'El título es obligatorio' });
      }
      if (!letra || !String(letra).trim()) {
        return res.status(400).json({ ok: false, error: 'La letra es obligatoria' });
      }
      const parrafos = String(letra).split(/\n\n+/).flatMap(p => { const v = p.trim(); return v ? [v] : []; });
      const id = await crearHimno({
        numero: String(numero || '').trim(),
        titulo: String(titulo).trim(),
        letra: JSON.stringify(parrafos),
        autor: '', categoria: '', favorito: 0,
      });
      return res.json({ ok: true, id });
    } catch (error) {
      console.error('❌ [MAIN] (API) Error POST /api/himnos/personal:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  // PUT /api/himnos/personal/:id — actualizar himno
  expressApp.put('/api/himnos/personal/:id', async (req, res) => {
    try {
      const id = Number(req.params?.id);
      if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'id inválido' });
      const { numero, titulo, letra } = req.body || {};
      if (!titulo || !String(titulo).trim()) {
        return res.status(400).json({ ok: false, error: 'El título es obligatorio' });
      }
      if (!letra || !String(letra).trim()) {
        return res.status(400).json({ ok: false, error: 'La letra es obligatoria' });
      }
      const parrafos = String(letra).split(/\n\n+/).flatMap(p => { const v = p.trim(); return v ? [v] : []; });
      const ok = await actualizarHimno(id, {
        numero: String(numero || '').trim(),
        titulo: String(titulo).trim(),
        letra: JSON.stringify(parrafos),
        autor: '', categoria: '', favorito: 0,
      });
      if (!ok) return res.status(404).json({ ok: false, error: 'Himno no encontrado' });
      return res.json({ ok: true });
    } catch (error) {
      console.error('❌ [MAIN] (API) Error PUT /api/himnos/personal/:id:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  // DELETE /api/himnos/personal/:id — eliminar himno
  expressApp.delete('/api/himnos/personal/:id', async (req, res) => {
    try {
      const id = Number(req.params?.id);
      if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: 'id inválido' });
      const ok = await eliminarHimno(id);
      if (!ok) return res.status(404).json({ ok: false, error: 'Himno no encontrado' });
      return res.json({ ok: true });
    } catch (error) {
      console.error('❌ [MAIN] (API) Error DELETE /api/himnos/personal/:id:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }
  });
};
