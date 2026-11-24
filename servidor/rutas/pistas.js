// Pistas (audio) del Himnario Adventista Miskitu.
// Vienen del Firebase Storage de la app Android "Himnario Adventista Miskitu" (audios/001.mp3, …),
// que es de lectura pública. La primera vez se bajan y se guardan en <rutaBase>/pistas/adventista;
// desde ahí suenan sin internet. No todos los himnos tienen pista.
//
//   GET  /api/pistas/adventista/:numero/estado → { ok, disponible:true|false|null, descargada, bytes }
//        (disponible:null = no se pudo consultar, p. ej. sin internet)
//   GET  /api/pistas/adventista/:numero.mp3    → el audio (lo baja si hace falta; soporta Range)
//   GET  /api/pistas/adventista/resumen        → { ok, descargadas, bytes }
//   POST /api/pistas/adventista/descargar-todas · GET …/descarga · POST …/descarga/cancelar
//   DELETE /api/pistas/adventista              → borra las descargadas (libera espacio)

const FUENTES = {
  adventista: {
    bucket: 'himnario-adventista-miskitu.firebasestorage.app',
    carpeta: 'audios',
    maximo: 236, // cantidad de himnos del himnario
  },
};

const archivoDe = (numero) => `${String(numero).padStart(3, '0')}.mp3`;

function crearPistas({ fs, path, dir, fetchImpl = globalThis.fetch }) {
  const fuente = FUENTES.adventista;
  const carpeta = path.join(dir, 'adventista');
  const urlFirebase = (numero, media) =>
    `https://firebasestorage.googleapis.com/v0/b/${fuente.bucket}/o/${encodeURIComponent(`${fuente.carpeta}/${archivoDe(numero)}`)}${media ? '?alt=media' : ''}`;

  const rutaLocal = (numero) => path.join(carpeta, archivoDe(numero));
  const descargada = (numero) => {
    try {
      const st = fs.statSync(rutaLocal(numero));
      return st.isFile() && st.size > 0 ? st.size : 0;
    } catch {
      return 0;
    }
  };

  // numero → { disponible, bytes } (solo respuestas seguras de Firebase: existe o 404)
  const cacheEstado = new Map();
  const consultar = async (numero) => {
    if (cacheEstado.has(numero)) return cacheEstado.get(numero);
    try {
      const r = await fetchImpl(urlFirebase(numero, false), { signal: AbortSignal.timeout(10000) });
      if (r.status === 404) {
        const e = { disponible: false, bytes: 0 };
        cacheEstado.set(numero, e);
        return e;
      }
      if (!r.ok) return { disponible: null, bytes: 0 };
      const j = await r.json();
      const e = { disponible: true, bytes: Number(j?.size) || 0 };
      cacheEstado.set(numero, e);
      return e;
    } catch {
      return { disponible: null, bytes: 0 };
    }
  };

  const enCurso = new Map(); // numero → Promise (evita bajar dos veces la misma)
  const bajar = (numero) => {
    if (descargada(numero)) return Promise.resolve(true);
    if (enCurso.has(numero)) return enCurso.get(numero);
    const p = (async () => {
      fs.mkdirSync(carpeta, { recursive: true });
      const tmp = `${rutaLocal(numero)}.parcial`;
      try {
        const r = await fetchImpl(urlFirebase(numero, true), { signal: AbortSignal.timeout(120000) });
        if (r.status === 404) {
          cacheEstado.set(numero, { disponible: false, bytes: 0 });
          return false;
        }
        if (!r.ok) throw new Error(`Firebase respondió ${r.status}`);
        const buf = Buffer.from(await r.arrayBuffer());
        if (!buf.length) throw new Error('Pista vacía');
        fs.writeFileSync(tmp, buf);
        fs.renameSync(tmp, rutaLocal(numero));
        cacheEstado.set(numero, { disponible: true, bytes: buf.length });
        return true;
      } finally {
        try { fs.rmSync(tmp, { force: true }); } catch { /* noop */ }
        enCurso.delete(numero);
      }
    })();
    enCurso.set(numero, p);
    return p;
  };

  const resumen = () => {
    let descargadas = 0;
    let bytes = 0;
    try {
      for (const f of fs.readdirSync(carpeta)) {
        if (!/^\d{3}\.mp3$/.test(f)) continue;
        const st = fs.statSync(path.join(carpeta, f));
        if (st.size > 0) { descargadas += 1; bytes += st.size; }
      }
    } catch { /* carpeta aún no existe */ }
    return { descargadas, bytes };
  };

  // Descarga de todas (en segundo plano, de a una para no saturar la red de la iglesia)
  let trabajo = { activa: false, revisadas: 0, total: fuente.maximo, bajadas: 0, sinPista: 0, errores: 0, cancelar: false };
  const descargarTodas = () => {
    if (trabajo.activa) return trabajo;
    trabajo = { activa: true, revisadas: 0, total: fuente.maximo, bajadas: 0, sinPista: 0, errores: 0, cancelar: false };
    (async () => {
      for (let n = 1; n <= fuente.maximo && !trabajo.cancelar; n += 1) {
        try {
          if (descargada(n)) {
            trabajo.bajadas += 1;
          } else {
            const ok = await bajar(n);
            if (ok) trabajo.bajadas += 1;
            else trabajo.sinPista += 1;
          }
        } catch {
          trabajo.errores += 1;
        }
        trabajo.revisadas += 1;
      }
      trabajo.activa = false;
    })();
    return trabajo;
  };

  const borrarTodas = () => {
    if (trabajo.activa) trabajo.cancelar = true;
    fs.rmSync(carpeta, { recursive: true, force: true });
  };

  return {
    rutaLocal,
    descargada,
    consultar,
    bajar,
    resumen,
    descargarTodas,
    borrarTodas,
    estadoDescarga: () => {
      const { cancelar, ...resto } = trabajo;
      return resto;
    },
    cancelarDescarga: () => { trabajo.cancelar = true; },
    maximo: fuente.maximo,
  };
}

function numeroValido(raw, maximo) {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= maximo ? n : null;
}

module.exports = function registrar(expressApp, ctx) {
  const { fs, path } = ctx;
  const pistas = crearPistas({ fs, path, dir: ctx.pistasDir });
  const base = '/api/pistas/adventista';

  expressApp.get(`${base}/resumen`, (req, res) => res.json({ ok: true, ...pistas.resumen() }));

  expressApp.get(`${base}/descarga`, (req, res) => res.json({ ok: true, ...pistas.estadoDescarga() }));

  expressApp.post(`${base}/descargar-todas`, (req, res) => {
    pistas.descargarTodas();
    res.json({ ok: true, ...pistas.estadoDescarga() });
  });

  expressApp.post(`${base}/descarga/cancelar`, (req, res) => {
    pistas.cancelarDescarga();
    res.json({ ok: true });
  });

  expressApp.delete(base, (req, res) => {
    try {
      pistas.borrarTodas();
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  expressApp.get(`${base}/:numero/estado`, async (req, res) => {
    const n = numeroValido(req.params.numero, pistas.maximo);
    if (!n) return res.status(400).json({ ok: false, error: 'número inválido' });
    const bytesLocal = pistas.descargada(n);
    if (bytesLocal) return res.json({ ok: true, disponible: true, descargada: true, bytes: bytesLocal });
    const e = await pistas.consultar(n);
    return res.json({ ok: true, disponible: e.disponible, descargada: false, bytes: e.bytes });
  });

  expressApp.get(`${base}/:archivo`, async (req, res) => {
    const m = /^(\d{1,3})\.mp3$/.exec(String(req.params.archivo || ''));
    const n = m ? numeroValido(m[1], pistas.maximo) : null;
    if (!n) return res.status(404).json({ ok: false, error: 'Pista no encontrada' });
    try {
      const ok = await pistas.bajar(n);
      if (!ok) return res.status(404).json({ ok: false, error: 'Este himno no tiene pista' });
      return res.sendFile(pistas.rutaLocal(n), { headers: { 'Content-Type': 'audio/mpeg' } });
    } catch (e) {
      return res.status(502).json({ ok: false, error: 'No se pudo bajar la pista. Revisa la conexión a internet.' });
    }
  });
};

module.exports.crearPistas = crearPistas;
