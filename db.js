const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const { app } = require("electron");

// Ruta y verificación de carpeta
// En producción (empaquetado), usar la carpeta userData de Electron
// En desarrollo, usar la carpeta data del proyecto
const isDev = !app.isPackaged;
const dataDir = isDev
  ? path.join(__dirname, "data")
  : path.join(app.getPath("userData"), "data");
const dbPath = path.join(dataDir, "himnos.db");

// Verificar y crear carpeta "data" si no existe
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Conectar a la base de datos
const db = new Database(dbPath);

// Crear tabla 'himnos' si no existe
db.prepare(`
  CREATE TABLE IF NOT EXISTS himnos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero TEXT,
    titulo TEXT,
    letra TEXT,
    favorito INTEGER DEFAULT 0
  )
`).run();

// Migración: agregar columnas de himnos que no forman parte del esquema original
// (antes vivía en db-new.js, portado aquí en la consolidación de julio 2026)
for (const sql of [
  "ALTER TABLE himnos ADD COLUMN autor TEXT",
  "ALTER TABLE himnos ADD COLUMN categoria TEXT",
  "ALTER TABLE himnos ADD COLUMN fuente TEXT DEFAULT 'personal'",
]) {
  try { db.prepare(sql).run(); } catch (error) { /* columna ya existe */ }
}

// Crear tabla 'configuracion' si no existe
db.prepare(`
  CREATE TABLE IF NOT EXISTS configuracion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clave TEXT UNIQUE NOT NULL,
    valor TEXT NOT NULL,
    tipo TEXT DEFAULT 'string',
    descripcion TEXT,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

// Verificar si la tabla 'fondos' existe
const tablaFondosExiste = db.prepare(`
  SELECT name FROM sqlite_master WHERE type='table' AND name='fondos';
`).get();

if (!tablaFondosExiste) {
  console.log("Creando la tabla 'fondos'...");
  db.prepare(`
    CREATE TABLE fondos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      tipo TEXT NOT NULL,
      activo INTEGER DEFAULT 0
    )
  `).run();
} else {
  try {
    const columnasFondos = db.prepare("PRAGMA table_info(fondos)").all();
    const columnaTipoExiste = columnasFondos.some((columna) => columna.name === "tipo");

    if (!columnaTipoExiste) {
      console.log("Añadiendo la columna 'tipo' a la tabla 'fondos'...");
      db.prepare("ALTER TABLE fondos ADD COLUMN tipo TEXT NOT NULL DEFAULT 'imagen'").run();
    }
  } catch (error) {
    console.error("Error al modificar la tabla 'fondos':", error);
  }
}

// ====================================
// FUNCIONES DE CONFIGURACIÓN
// ====================================

// Valores por defecto de configuración
const configuracionPorDefecto = {
  nombreIglesia: {
    valor: "GloryView",
    tipo: "string",
    descripcion: "Nombre de la iglesia u organización"
  },
  eslogan: {
    valor: "Bienvenidos",
    tipo: "string",
    descripcion: "Eslogan o mensaje de bienvenida"
  },
  pastor: {
    valor: "",
    tipo: "string",
    descripcion: "Nombre del pastor o líder"
  },
  direccion: {
    valor: "",
    tipo: "string",
    descripcion: "Dirección física de la iglesia"
  },
  telefono: {
    valor: "",
    tipo: "string",
    descripcion: "Número de teléfono de contacto"
  },
  email: {
    valor: "",
    tipo: "string",
    descripcion: "Correo electrónico de contacto"
  },
  website: {
    valor: "",
    tipo: "string",
    descripcion: "Sitio web de la iglesia"
  },
  sitioWeb: {
    valor: "",
    tipo: "string",
    descripcion: "Sitio web de la iglesia"
  },
  horarioCultos: {
    valor: "",
    tipo: "string",
    descripcion: "Horarios de cultos"
  },
  logo: {
    valor: "/logo.jpg",
    tipo: "string",
    descripcion: "Ruta del logo de la iglesia"
  },
  logoUrl: {
    valor: "/images/icon-256.png",
    tipo: "string",
    descripcion: "URL del logo de la iglesia"
  },
  colorPrimario: {
    valor: "#ffffff",
    tipo: "color",
    descripcion: "Color primario del tema"
  },
  colorSecundario: {
    valor: "#d1d5db",
    tipo: "color",
    descripcion: "Color secundario del tema"
  },
  fontSizeTitulo: {
    valor: "text-5xl",
    tipo: "string",
    descripcion: "Tamaño de fuente para títulos"
  },
  fontSizeParrafo: {
    valor: "text-6xl",
    tipo: "string",
    descripcion: "Tamaño de fuente para párrafos"
  },
  fontSizeEslogan: {
    valor: "text-2xl",
    tipo: "string",
    descripcion: "Tamaño de fuente para eslogan"
  },
  videosFondo: {
    valor: JSON.stringify(["/videos/fondo.mp4", "/videos/video1.mp4", "/videos/video2.mp4", "/videos/video3.mp4"]),
    tipo: "json",
    descripcion: "Lista de videos de fondo"
  },
  intervaloCambioVideo: {
    valor: "120",
    tipo: "number",
    descripcion: "Intervalo en minutos para cambio de video"
  },
  // ✨ NUEVAS OPCIONES DE VISIBILIDAD
  mostrarLogo: {
    valor: "true",
    tipo: "boolean",
    descripcion: "Mostrar logo en la pantalla de bienvenida"
  },
  mostrarNombreIglesia: {
    valor: "true",
    tipo: "boolean",
    descripcion: "Mostrar nombre de la iglesia en la pantalla de bienvenida"
  },
  mostrarEslogan: {
    valor: "true",
    tipo: "boolean",
    descripcion: "Mostrar eslogan en la pantalla de bienvenida"
  },
  // ── Plantillas GSAP ──
  plantillaGsapActiva: {
    valor: "ninguna",
    tipo: "string",
    descripcion: "Plantilla GSAP activa para anuncios (ninguna | revelar | neon | iglesia | cinematica | particulas)"
  },
  plantillaGsapColor1: {
    valor: "#e2e8f0",
    tipo: "string",
    descripcion: "Color primario/texto de la plantilla GSAP"
  },
  plantillaGsapColor2: {
    valor: "#0f172a",
    tipo: "string",
    descripcion: "Color de fondo de la plantilla GSAP"
  },
  plantillaGsapColorAcc: {
    valor: "#34d399",
    tipo: "string",
    descripcion: "Color de acento de la plantilla GSAP"
  },
  plantillaGsapVelocidad: {
    valor: "media",
    tipo: "string",
    descripcion: "Velocidad de animación GSAP (lenta | media | rapida)"
  }
};

// Insertar configuración por defecto si no existe
function insertarConfiguracionPorDefecto() {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO configuracion (clave, valor, tipo, descripcion)
    VALUES (?, ?, ?, ?)
  `);

  for (const [clave, config] of Object.entries(configuracionPorDefecto)) {
    stmt.run(clave, config.valor, config.tipo, config.descripcion);
  }
}

// Obtener valor específico de configuración (portado de db-new.js — única versión usada en producción)
function obtenerConfiguracion(clave) {
  try {
    const row = db.prepare('SELECT valor, tipo FROM configuracion WHERE clave = ?').get(clave);
    if (!row) return null;
    switch (row.tipo) {
      case 'json':
        return JSON.parse(row.valor);
      case 'number':
        return parseInt(row.valor);
      case 'boolean':
        return row.valor === 'true';
      default:
        return row.valor;
    }
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    return null;
  }
}

// Actualizar valor específico (UPSERT — inserta si no existe, actualiza si existe)
function actualizarConfiguracion(clave, valor) {
  try {
    const valorFinal =
      valor === null || valor === undefined
        ? ""
        : typeof valor === "string"
          ? valor
          : typeof valor === "number" || typeof valor === "boolean"
            ? String(valor)
            : JSON.stringify(valor);

    const result = db.prepare(`
      INSERT INTO configuracion (clave, valor, fecha_actualizacion)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(clave) DO UPDATE SET
        valor = excluded.valor,
        fecha_actualizacion = CURRENT_TIMESTAMP
    `).run(clave, valorFinal);

    return result.changes > 0;
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    return false;
  }
}

// Restaurar configuración a valores por defecto
function restaurarConfiguracionDefecto() {
  try {
    console.log('🔄 [DB] Restaurando configuración a valores por defecto...');
    db.prepare('DELETE FROM configuracion').run();

    const stmt = db.prepare(
      'INSERT INTO configuracion (clave, valor, tipo, descripcion) VALUES (?, ?, ?, ?)'
    );
    for (const [clave, config] of Object.entries(configuracionPorDefecto)) {
      stmt.run(clave, config.valor, config.tipo, config.descripcion);
    }

    console.log('✅ [DB] Configuración restaurada con valores por defecto');
    return true;
  } catch (error) {
    console.error('❌ [DB] Error al restaurar configuración:', error);
    return false;
  }
}

// Insertar configuración por defecto al inicializar
insertarConfiguracionPorDefecto();

// ====================================
// FUNCIONES DE HIMNOS
// ====================================

// Obtener todos los himnos (portado de db-new.js — única versión usada en producción)
function obtenerHimnos() {
  try {
    return db.prepare('SELECT * FROM himnos ORDER BY numero ASC').all();
  } catch (error) {
    console.error('Error al obtener himnos:', error);
    return [];
  }
}

// Obtener un himno por ID
function obtenerHimnoPorId(id) {
  try {
    return db.prepare('SELECT * FROM himnos WHERE id = ?').get(id) || null;
  } catch (error) {
    console.error('Error al obtener himno por ID:', error);
    return null;
  }
}

// Buscar himnos por texto
function buscarHimnos(termino) {
  try {
    const query = `
      SELECT * FROM himnos
      WHERE titulo LIKE ? OR letra LIKE ? OR numero LIKE ?
      ORDER BY numero ASC
    `;
    const params = [`%${termino}%`, `%${termino}%`, `%${termino}%`];
    return db.prepare(query).all(...params);
  } catch (error) {
    console.error('Error al buscar himnos:', error);
    return [];
  }
}

// Crear un himno (nota: `letra` se guarda tal cual, sin JSON.stringify interno —
// el stringify/parse ya ocurre en la capa de main.js)
function crearHimno(himno) {
  try {
    const result = db.prepare(
      'INSERT INTO himnos (numero, titulo, letra, autor, categoria, favorito, fuente) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(himno.numero, himno.titulo, himno.letra, himno.autor || '', himno.categoria || '', himno.favorito || 0, himno.fuente || 'personal');
    return Number(result.lastInsertRowid);
  } catch (error) {
    console.error('Error al crear himno:', error);
    throw error;
  }
}

// Actualizar un himno
function actualizarHimno(id, himno) {
  try {
    const result = db.prepare(
      'UPDATE himnos SET numero = ?, titulo = ?, letra = ?, autor = ?, categoria = ?, favorito = ?, fuente = ? WHERE id = ?'
    ).run(himno.numero, himno.titulo, himno.letra, himno.autor || '', himno.categoria || '', himno.favorito, himno.fuente || 'personal', id);
    return result.changes > 0;
  } catch (error) {
    console.error('Error al actualizar himno:', error);
    return false;
  }
}

// Eliminar un himno
function eliminarHimno(id) {
  try {
    const result = db.prepare('DELETE FROM himnos WHERE id = ?').run(id);
    return result.changes > 0;
  } catch (error) {
    console.error('Error al eliminar himno:', error);
    return false;
  }
}

// Marcar/desmarcar favorito (rápido, sin actualizar todo el himno)
function actualizarFavoritoHimno(id, favorito) {
  try {
    const result = db.prepare('UPDATE himnos SET favorito = ? WHERE id = ?').run(favorito ? 1 : 0, id);
    return result.changes > 0;
  } catch (error) {
    console.error('Error al actualizar favorito de himno:', error);
    return false;
  }
}

// ====================================
// FUNCIONES DE FONDOS - COMPLETAS Y CORREGIDAS
// ====================================

// ✨ FUNCIÓN PARA MIGRAR TABLA FONDOS (mantener al inicio)
function migrarTablaFondos() {
  try {
    console.log("🔧 [DB] Verificando estructura de tabla fondos...");

    // Verificar si la tabla existe
    const tablaExiste = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='fondos'
    `).get();

    if (!tablaExiste) {
      // Crear tabla nueva con estructura completa
      console.log("📋 [DB] Creando tabla fondos nueva...");
      const createTable = db.prepare(`
        CREATE TABLE fondos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          url TEXT NOT NULL,
          tipo TEXT DEFAULT 'imagen',
          nombre TEXT,
          activo INTEGER DEFAULT 0,
          es_defecto INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      createTable.run();
      console.log("✅ [DB] Tabla fondos creada con estructura completa");
      return;
    }

    // Verificar columnas existentes
    const columnas = db.prepare("PRAGMA table_info(fondos)").all();
    const nombresColumnas = new Set(columnas.map(col => col.name));
    console.log("📋 [DB] Columnas existentes:", nombresColumnas);

    // Agregar columnas faltantes
    const columnasRequeridas = [
      { nombre: 'nombre', tipo: 'TEXT' },
      { nombre: 'created_at', tipo: 'DATETIME' },
      { nombre: 'es_defecto', tipo: 'INTEGER DEFAULT 0' }
    ];

    for (const columna of columnasRequeridas) {
      if (!nombresColumnas.has(columna.nombre)) {
        console.log(`➕ [DB] Agregando columna: ${columna.nombre}`);
        try {
          const alterTable = db.prepare(`
            ALTER TABLE fondos 
            ADD COLUMN ${columna.nombre} ${columna.tipo}
          `);
          alterTable.run();
          console.log(`✅ [DB] Columna ${columna.nombre} agregada`);
        } catch (error) {
          console.error(`❌ [DB] Error agregando columna ${columna.nombre}:`, error);
        }
      }
    }

    // Verificar estructura final
    const columnasFinales = db.prepare("PRAGMA table_info(fondos)").all();
    console.log("✅ [DB] Estructura final de tabla fondos:", columnasFinales);

  } catch (error) {
    console.error("❌ [DB] Error migrando tabla fondos:", error);
  }
}

// Obtener todos los fondos - FUNCIÓN ÚNICA Y CORREGIDA
function obtenerFondos() {
  try {
    console.log("📋 [DB] Obteniendo fondos...");

    // Verificar columnas disponibles
    const columnas = db.prepare("PRAGMA table_info(fondos)").all();
    const nombresColumnas = new Set(columnas.map(col => col.name));

    // Construir query según columnas disponibles
    let selectFields = "id, url";

    if (nombresColumnas.has('tipo')) selectFields += ", tipo";
    if (nombresColumnas.has('nombre')) selectFields += ", nombre";
    if (nombresColumnas.has('activo')) selectFields += ", activo";
    if (nombresColumnas.has('es_defecto')) selectFields += ", es_defecto";
    if (nombresColumnas.has('created_at')) selectFields += ", created_at";

    // activo DESC, id ASC (no id DESC): GestionFondos.jsx asume que el ÚLTIMO
    // elemento del array es el fondo recién agregado (para auto-activarlo tras
    // descargar de Pixabay) — ver plan de consolidación de DB.
    const query = `SELECT ${selectFields} FROM fondos ORDER BY activo DESC, id ASC`;
    console.log("📋 [DB] Query fondos:", query);

    const stmt = db.prepare(query);
    const fondos = stmt.all();

    // Normalizar fondos con valores por defecto
    const fondosNormalizados = fondos.map(fondo => ({
      id: fondo.id,
      url: fondo.url,
      tipo: fondo.tipo || 'imagen',
      nombre: fondo.nombre || `Fondo ${fondo.id}`,
      activo: fondo.activo || 0,
      es_defecto: fondo.es_defecto || 0,
      created_at: fondo.created_at || null
    }));

    console.log("✅ [DB] Fondos obtenidos:", fondosNormalizados.length);
    return fondosNormalizados;

  } catch (error) {
    console.error("❌ [DB] Error obteniendo fondos:", error);
    return [];
  }
}

// Agregar nuevo fondo
function agregarFondo(url, tipo = 'imagen', nombre = null, activo = false) {
  try {
    console.log("💾 [DB] Agregando fondo:", { url, tipo, nombre, activo });

    // Validar parámetros
    if (!url) {
      throw new Error("URL del fondo es requerida");
    }

    // Generar nombre automático si no se proporciona
    if (!nombre) {
      const timestamp = Date.now();
      nombre = tipo === 'video' ? `Video ${timestamp}` : `Imagen ${timestamp}`;
    }

    // Si este fondo se marca como activo, desactivar todos los demás
    if (activo) {
      console.log("🔄 [DB] Desactivando fondos anteriores...");
      const stmtDesactivar = db.prepare("UPDATE fondos SET activo = 0");
      stmtDesactivar.run();
    }

    // Verificar que las columnas existen
    const columnas = db.prepare("PRAGMA table_info(fondos)").all();
    const nombresColumnas = new Set(columnas.map(col => col.name));
    console.log("📋 [DB] Columnas disponibles:", nombresColumnas);

    // Insertar el nuevo fondo con las columnas disponibles
    let query, params;

    if (nombresColumnas.has('nombre')) {
      // Estructura completa
      query = `INSERT INTO fondos (url, tipo, nombre, activo) VALUES (?, ?, ?, ?)`;
      params = [url, tipo, nombre, activo ? 1 : 0];
    } else {
      // Estructura mínima (compatibilidad hacia atrás)
      query = `INSERT INTO fondos (url, tipo, activo) VALUES (?, ?, ?)`;
      params = [url, tipo, activo ? 1 : 0];
    }

    console.log("📋 [DB] Ejecutando query:", query);
    console.log("📋 [DB] Con parámetros:", params);

    const stmt = db.prepare(query);
    const info = stmt.run(...params);

    console.log("✅ [DB] Fondo agregado:", {
      id: info.lastInsertRowid,
      url,
      tipo,
      nombre: nombresColumnas.has('nombre') ? nombre : 'Sin nombre',
      activo
    });

    // Retornar el fondo completo
    const fondoCompleto = {
      id: info.lastInsertRowid,
      url,
      tipo,
      nombre: nombresColumnas.has('nombre') ? nombre : 'Sin nombre',
      activo: activo ? 1 : 0
    };

    return fondoCompleto;

  } catch (error) {
    console.error("❌ [DB] Error agregando fondo:", error);
    throw error;
  }
}

// Eliminar fondo por ID
function eliminarFondo(id) {
  try {
    console.log("🗑️ [DB] Eliminando fondo:", id);

    // Proteger fondos por defecto
    const fondo = db.prepare("SELECT es_defecto, activo FROM fondos WHERE id = ?").get(id);
    if (fondo && fondo.es_defecto === 1) {
      console.warn("⚠️ [DB] Intento de eliminar fondo por defecto bloqueado, id:", id);
      return false;
    }

    // Proteger fondo activo — el usuario debe quitarlo de activo antes de poder eliminarlo
    if (fondo && fondo.activo === 1) {
      console.warn("⚠️ [DB] Intento de eliminar fondo activo bloqueado, id:", id);
      return false;
    }

    const stmt = db.prepare("DELETE FROM fondos WHERE id = ?");
    const info = stmt.run(id);

    console.log("✅ [DB] Fondo eliminado, filas afectadas:", info.changes);
    return info.changes > 0;

  } catch (error) {
    console.error("❌ [DB] Error eliminando fondo:", error);
    return false;
  }
}

// Actualizar un fondo (parcial — solo los campos presentes; portado de db-new.js,
// única implementación de update parcial de fondos)
function actualizarFondo(fondoData) {
  try {
    if (!fondoData || !fondoData.id) {
      throw new Error('ID del fondo es requerido');
    }

    const fields = [];
    const params = [];

    if (fondoData.url !== undefined) {
      fields.push('url = ?');
      params.push(fondoData.url);
    }
    if (fondoData.tipo !== undefined) {
      fields.push('tipo = ?');
      params.push(fondoData.tipo);
    }
    if (fondoData.activo !== undefined) {
      fields.push('activo = ?');
      params.push(fondoData.activo ? 1 : 0);
    }

    if (fields.length === 0) {
      return false;
    }

    params.push(fondoData.id);
    const result = db.prepare(`UPDATE fondos SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    return result.changes > 0;
  } catch (error) {
    console.error('Error al actualizar fondo:', error);
    return false;
  }
}

// Establecer fondo como activo
function establecerFondoActivo(id) {
  try {
    // Verificar que el fondo existe
    const fondoAActivar = db.prepare("SELECT * FROM fondos WHERE id = ?").get(id);

    if (!fondoAActivar) {
      console.error("❌ [DB] No se encontró el fondo con id:", id);
      return false;
    }

    // Desactivar todos los fondos
    const stmtDesactivar = db.prepare("UPDATE fondos SET activo = 0");
    stmtDesactivar.run();

    // Activar el fondo específico
    const stmtActivar = db.prepare("UPDATE fondos SET activo = 1 WHERE id = ?");
    const info = stmtActivar.run(id);

    return info.changes > 0;

  } catch (error) {
    console.error("❌ [DB] Error estableciendo fondo activo:", error);
    return false;
  }
}

// Obtener fondo activo
function obtenerFondoActivo() {
  try {
    // Verificar columnas disponibles
    const columnas = db.prepare("PRAGMA table_info(fondos)").all();
    const nombresColumnas = new Set(columnas.map(col => col.name));

    // Construir query según columnas disponibles
    let selectFields = "id, url";

    if (nombresColumnas.has('tipo')) selectFields += ", tipo";
    if (nombresColumnas.has('nombre')) selectFields += ", nombre";
    if (nombresColumnas.has('activo')) selectFields += ", activo";
    if (nombresColumnas.has('created_at')) selectFields += ", created_at";

    const query = `SELECT ${selectFields} FROM fondos WHERE activo = 1 LIMIT 1`;

    const stmt = db.prepare(query);
    const fondo = stmt.get();

    if (fondo) {
      // Normalizar fondo
      const fondoNormalizado = {
        id: fondo.id,
        url: fondo.url,
        tipo: fondo.tipo || 'imagen',
        nombre: fondo.nombre || `Fondo ${fondo.id}`,
        activo: fondo.activo || 0,
        created_at: fondo.created_at || null
      };

      return fondoNormalizado;
    } else {
      return null;
    }

  } catch (error) {
    console.error("❌ [DB] Error obteniendo fondo activo:", error);
    return null;
  }
}

// ✨ FUNCIÓN PARA LIMPIAR DUPLICADOS EN FONDOS
function limpiarDuplicadosFondos() {
  try {
    console.log("🧹 [DB] Limpiando fondos duplicados...");

    let eliminados = 0;

    // 🔧 PASO 0: Normalizar URLs absolutas locales a rutas relativas
    // Ej: http://localhost:3001/fondos/imagen1.jpg -> /fondos/imagen1.jpg
    // Esto evita duplicados "idénticos" en UI pero distintos en BD.
    const fondosAbsolutos = db.prepare(`
      SELECT id, url FROM fondos
      WHERE url LIKE 'http://localhost:3001/%'
         OR url LIKE 'https://localhost:3001/%'
    `).all();

    if (fondosAbsolutos.length > 0) {
      const updateStmt = db.prepare('UPDATE fondos SET url = ? WHERE id = ?');
      for (const fondo of fondosAbsolutos) {
        try {
          const pathname = new URL(fondo.url).pathname;
          if (pathname && pathname.startsWith('/')) {
            updateStmt.run(pathname, fondo.id);
            console.log(`  🔄 Normalizada URL: ${fondo.url} -> ${pathname}`);
          }
        } catch (e) {
          // Ignorar URLs inválidas
        }
      }
    }

    // 🔥 PASO 1: Eliminar fondos con rutas incorrectas (migraciones antiguas)
    // Solo mantener fondos que empiezan con /fondos/ para los archivos "de carpeta fondos"
    const fondosIncorrectos = db.prepare(`
      SELECT id, url FROM fondos 
      WHERE url NOT LIKE '/fondos/%' 
      AND (url LIKE '/images/%' OR url LIKE '/videos/%')
      AND (url LIKE '%imagen%.jpg' OR url LIKE '%imagen%.png' OR url LIKE '%video%.mp4')
    `).all();

    if (fondosIncorrectos.length > 0) {
      console.log(`  🗑️ Eliminando ${fondosIncorrectos.length} fondos con rutas incorrectas...`);
      fondosIncorrectos.forEach(fondo => {
        console.log(`    - ID ${fondo.id}: ${fondo.url}`);
        db.prepare('DELETE FROM fondos WHERE id = ?').run(fondo.id);
        eliminados++;
      });
    }

    // 🔥 PASO 2: Limpiar duplicados exactos por URL
    const urlsStmt = db.prepare("SELECT DISTINCT url FROM fondos");
    const urls = urlsStmt.all();

    for (const { url } of urls) {
      // Obtener todos los fondos con esta URL ordenados por id (conservar el primero)
      const fondosStmt = db.prepare("SELECT id FROM fondos WHERE url = ? ORDER BY id ASC");
      const fondos = fondosStmt.all(url);

      // Si hay más de uno, eliminar los duplicados (conservar el primero)
      if (fondos.length > 1) {
        const idsAEliminar = fondos.slice(1).map(f => f.id);
        const placeholders = idsAEliminar.map(() => '?').join(',');
        const deleteStmt = db.prepare(`DELETE FROM fondos WHERE id IN (${placeholders})`);
        deleteStmt.run(...idsAEliminar);
        eliminados += idsAEliminar.length;
        console.log(`  🗑️ Eliminados ${idsAEliminar.length} duplicados de: ${url}`);
      }
    }

    if (eliminados > 0) {
      console.log(`✅ [DB] ${eliminados} fondos problemáticos eliminados`);
    } else {
      console.log("✅ [DB] No se encontraron fondos duplicados o incorrectos");
    }

  } catch (error) {
    console.error("❌ [DB] Error limpiando duplicados:", error);
  }
}

// ✨ FUNCIÓN PARA INICIALIZAR FONDOS POR DEFECTO
function inicializarFondosPorDefecto() {
  try {
    console.log("🎨 [DB] Verificando fondos por defecto...");

    // Rutas en disco donde buscar los archivos de fondos
    const fondosPublicDir = isDev
      ? path.join(__dirname, 'public', 'fondos')
      : path.join(app.getPath('userData'), 'public', 'fondos');
    const fondosBuildDir = path.join(__dirname, 'build', 'fondos');

    // Resolver ruta relativa "/fondos/X" a disco
    const existeEnDisco = (relativeUrl) => {
      if (!relativeUrl || relativeUrl.startsWith('http')) return true;
      const fileName = relativeUrl.replace(/^\/fondos\//, '');
      return fs.existsSync(path.join(fondosPublicDir, fileName)) ||
        fs.existsSync(path.join(fondosBuildDir, fileName));
    };

    // Primero, limpiar duplicados existentes
    limpiarDuplicadosFondos();

    // Eliminar de la DB registros de fondos por defecto cuyos archivos no existen
    const todosLosFondos = db.prepare("SELECT id, url FROM fondos WHERE url LIKE '/fondos/%'").all();
    for (const fondo of todosLosFondos) {
      if (!existeEnDisco(fondo.url)) {
        db.prepare('DELETE FROM fondos WHERE id = ?').run(fondo.id);
        console.log(`  🗑️ [DB] Eliminado registro de fondo sin archivo: ${fondo.url}`);
      }
    }

    // Fondos requeridos — solo los que existen físicamente en disco
    const fondosCandidatos = [
      { url: "/fondos/video1.mp4", tipo: "video", nombre: "Video 1", activo: 1 },
      { url: "/fondos/video2.mp4", tipo: "video", nombre: "Video 2", activo: 0 },
      { url: "/fondos/video3.mp4", tipo: "video", nombre: "Video 3", activo: 0 },
      { url: "/fondos/video4.mp4", tipo: "video", nombre: "Video 4", activo: 0 },
      { url: "/fondos/imagen1.jpg", tipo: "imagen", nombre: "Imagen 1", activo: 0 },
      { url: "/fondos/imagen2.png", tipo: "imagen", nombre: "Imagen 2", activo: 0 },
      { url: "/fondos/imagen3.jpg", tipo: "imagen", nombre: "Imagen 3", activo: 0 },
      { url: "/fondos/imagen4.png", tipo: "imagen", nombre: "Imagen 4", activo: 0 },
    ];

    // Filtrar solo los que tienen archivo en disco
    const fondosDisponibles = fondosCandidatos.filter(f => existeEnDisco(f.url));
    console.log(`📊 [DB] Fondos por defecto con archivo en disco: ${fondosDisponibles.length}/${fondosCandidatos.length}`);

    if (fondosDisponibles.length === 0) {
      console.log("ℹ️ [DB] Sin archivos de fondos por defecto disponibles");
      return;
    }

    const fondosRequeridos = fondosDisponibles.map(f => f.url);

    // Verificar cuántos ya están en la DB
    const placeholders = fondosRequeridos.map(() => '?').join(',');
    const checkStmt = db.prepare(`SELECT url FROM fondos WHERE url IN (${placeholders})`);
    const existingFondos = checkStmt.all(...fondosRequeridos);
    const existingCount = existingFondos.length;

    console.log(`📊 [DB] Fondos por defecto en DB: ${existingCount}/${fondosRequeridos.length}`);

    // Si ya existen todos, asegurar que tengan es_defecto = 1 (migración retroactiva)
    if (existingCount === fondosRequeridos.length) {
      console.log("✅ [DB] Todos los fondos por defecto ya existen en DB");
      const updatePlaceholders = fondosRequeridos.map(() => '?').join(',');
      db.prepare(`UPDATE fondos SET es_defecto = 1 WHERE url IN (${updatePlaceholders}) AND (es_defecto IS NULL OR es_defecto = 0)`).run(...fondosRequeridos);

      const activoResult = db.prepare("SELECT COUNT(*) as count FROM fondos WHERE activo = 1").get();
      if (activoResult.count === 0) {
        const primerFondo = db.prepare("SELECT id FROM fondos WHERE url = ?").get(fondosDisponibles[0].url);
        if (primerFondo) {
          establecerFondoActivo(primerFondo.id);
          console.log(`✅ [DB] Fondo activo establecido: ${fondosDisponibles[0].url}`);
        }
      }

      return;
    }

    // Eliminar incompletos y reinsertar
    if (existingCount > 0) {
      const deletePlaceholders = fondosRequeridos.map(() => '?').join(',');
      db.prepare(`DELETE FROM fondos WHERE url IN (${deletePlaceholders})`).run(...fondosRequeridos);
      console.log("🗑️ [DB] Fondos por defecto incompletos eliminados para reinserción");
    }

    const fondosPorDefecto = fondosDisponibles;

    const insertStmt = db.prepare(`
      INSERT INTO fondos (url, tipo, nombre, activo, es_defecto, created_at)
      VALUES (?, ?, ?, ?, 1, datetime('now'))
    `);

    const insertMany = db.transaction((fondos) => {
      let insertados = 0;
      for (const fondo of fondos) {
        try {
          insertStmt.run(fondo.url, fondo.tipo, fondo.nombre, fondo.activo);
          insertados++;
          console.log(`  ✅ Insertado: ${fondo.url}`);
        } catch (err) {
          console.log(`  ⚠️ Error insertando ${fondo.url}:`, err.message);
        }
      }
      return insertados;
    });

    const insertados = insertMany(fondosPorDefecto);

    console.log(`✅ [DB] ${insertados} fondos por defecto insertados correctamente`);

    // Asegurar que haya un fondo activo
    const activoCheck = db.prepare("SELECT COUNT(*) as count FROM fondos WHERE activo = 1").get();
    if (activoCheck.count === 0 && fondosDisponibles.length > 0) {
      const primerFondoInsertado = db.prepare("SELECT id FROM fondos WHERE url = ?").get(fondosDisponibles[0].url);
      if (primerFondoInsertado) {
        establecerFondoActivo(primerFondoInsertado.id);
        console.log(`✅ [DB] Fondo activo establecido: ${fondosDisponibles[0].url}`);
      }
    }

  } catch (error) {
    console.error("❌ [DB] Error inicializando fondos por defecto:", error);
  }
}

// ✨ EJECUTAR MIGRACIÓN AL INICIALIZAR
console.log("🔧 [DB] Iniciando migración de tabla fondos...");
migrarTablaFondos();

// ============================================
// ✨ FUNCIONES PARA MULTIMEDIA ACTIVA
// ============================================

// Variable para almacenar multimedia activa en memoria (temporal)
let multimediaActiva = null;

// Establecer multimedia como activa
function establecerMultimediaActiva(multimediaData) {
  try {
    console.log("🎬 [DB] Estableciendo multimedia activa:", multimediaData);

    // Validar datos mínimos
    if (!multimediaData || !multimediaData.tipo || !multimediaData.url) {
      console.error("❌ [DB] Datos de multimedia incompletos:", multimediaData);
      return false;
    }

    // Guardar en memoria
    multimediaActiva = {
      ...multimediaData,
      timestamp: new Date().toISOString()
    };

    console.log("✅ [DB] Multimedia activa establecida:", multimediaActiva);
    return true;

  } catch (error) {
    console.error("❌ [DB] Error estableciendo multimedia activa:", error);
    return false;
  }
}

// Obtener multimedia activa
function obtenerMultimediaActiva() {
  try {
    console.log("🎬 [DB] Obteniendo multimedia activa...");

    if (multimediaActiva) {
      console.log("✅ [DB] Multimedia activa encontrada:", multimediaActiva);
      return multimediaActiva;
    } else {
      console.log("ℹ️ [DB] No hay multimedia activa");
      return null;
    }

  } catch (error) {
    console.error("❌ [DB] Error obteniendo multimedia activa:", error);
    return null;
  }
}

// Limpiar multimedia activa
function limpiarMultimediaActiva() {
  try {
    console.log("🧹 [DB] Limpiando multimedia activa...");
    multimediaActiva = null;
    console.log("✅ [DB] Multimedia activa limpiada");
    return true;

  } catch (error) {
    console.error("❌ [DB] Error limpiando multimedia activa:", error);
    return false;
  }
}

// ==================================================
// Helpers Multimedia (URLs / YouTube)
// ==================================================

function extraerYouTubeId(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";

  // watch?v=, youtu.be/, embed/, shorts/
  const match = raw.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/,
  );
  return match ? match[1] : "";
}

function normalizarUrlBasica(url) {
  return String(url || "")
    .trim()
    .replace(/\/+$/, "")
    .toLowerCase();
}

function obtenerClaveDedupeMultimedia(media) {
  const tipo = String(media?.tipo || media?.type || "").trim().toLowerCase();
  const url = String(media?.url || "").trim();
  const ruta = String(media?.ruta_archivo || media?.rutaArchivo || "").trim();

  const ytId = extraerYouTubeId(ruta) || extraerYouTubeId(url);
  if (ytId || tipo === "youtube") return `yt:${ytId || normalizarUrlBasica(ruta || url)}`;

  const candidate = url || ruta;
  if (/^https?:\/\//i.test(candidate)) return `url:${normalizarUrlBasica(candidate)}`;

  return `file:${String(ruta || url || "").trim()}`;
}

function asegurarIntegridadTablaMultimedia() {
  try {
    const tablaExiste = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='multimedia'",
    ).get();
    if (!tablaExiste) return;

    const columnas = db.prepare("PRAGMA table_info(multimedia)").all();
    const nombresColumnas = new Set(columnas.map((col) => col.name));
    const tieneRuta = nombresColumnas.has("ruta_archivo");
    const tieneUrl = nombresColumnas.has("url");
    if (!tieneRuta) return;

    // 1) Si ruta_archivo está vacía pero hay url, rellenar ruta_archivo = url
    if (tieneUrl) {
      db.prepare(`
        UPDATE multimedia
        SET ruta_archivo = url
        WHERE (ruta_archivo IS NULL OR TRIM(ruta_archivo) = '')
          AND url IS NOT NULL AND TRIM(url) <> ''
      `).run();
    }

    // 2) Eliminar filas inválidas (sin ruta)
    db.prepare(`
      DELETE FROM multimedia
      WHERE ruta_archivo IS NULL OR TRIM(ruta_archivo) = ''
    `).run();

    // 3) Eliminar duplicados exactos por ruta_archivo (conservar el id más alto)
    db.prepare(`
      DELETE FROM multimedia
      WHERE id NOT IN (
        SELECT MAX(id)
        FROM multimedia
        GROUP BY TRIM(ruta_archivo)
      )
    `).run();

    // 4) Crear índice único para evitar duplicados futuros
    // Si aún existieran duplicados en instalaciones viejas, este CREATE puede fallar; no bloqueamos la app.
    try {
      db.prepare(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_multimedia_ruta_archivo_unique ON multimedia(ruta_archivo)",
      ).run();
    } catch (indexErr) {
      console.warn(
        "⚠️ [DB] No se pudo crear índice UNIQUE en multimedia(ruta_archivo):",
        indexErr?.message || indexErr,
      );
    }
  } catch (error) {
    console.warn(
      "⚠️ [DB] asegurarIntegridadTablaMultimedia falló:",
      error?.message || error,
    );
  }
}

// ✨ FUNCIÓN PARA MIGRAR TABLA MULTIMEDIA
function migrarTablaMultimedia() {
  try {
    console.log("🔧 [DB] Verificando estructura de tabla multimedia...");

    // Verificar si la tabla existe
    const tablaExiste = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='multimedia'
    `).get();

    if (!tablaExiste) {
      // Crear tabla nueva con estructura completa
      console.log("📋 [DB] Creando tabla multimedia nueva...");
      const createTable = db.prepare(`
        CREATE TABLE multimedia (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT NOT NULL,
          tipo TEXT NOT NULL,
          tamaño INTEGER,
          ruta_archivo TEXT NOT NULL,
          url TEXT,
          extension TEXT,
          duracion TEXT,
          resolucion TEXT,
          miniatura TEXT,
          descripcion TEXT,
          tags TEXT DEFAULT '[]',
          favorito INTEGER DEFAULT 0,
          activo INTEGER DEFAULT 0,
          reproducido INTEGER DEFAULT 0,
          fecha_subida DATETIME DEFAULT CURRENT_TIMESTAMP,
          fecha_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      createTable.run();
      console.log("✅ [DB] Tabla multimedia creada con estructura completa");
      return;
    }

    // Verificar columnas existentes
    const columnas = db.prepare("PRAGMA table_info(multimedia)").all();
    const nombresColumnas = new Set(columnas.map(col => col.name));
    console.log("📋 [DB] Columnas existentes en multimedia:", nombresColumnas);

    // Agregar columnas faltantes
    const columnasRequeridas = [
      { nombre: 'extension', tipo: 'TEXT' },
      { nombre: 'duracion', tipo: 'TEXT' },
      { nombre: 'resolucion', tipo: 'TEXT' },
      { nombre: 'miniatura', tipo: 'TEXT' },
      { nombre: 'descripcion', tipo: 'TEXT' },
      { nombre: 'tags', tipo: 'TEXT DEFAULT "[]"' },
      { nombre: 'favorito', tipo: 'INTEGER DEFAULT 0' },
      { nombre: 'activo', tipo: 'INTEGER DEFAULT 0' },
      { nombre: 'reproducido', tipo: 'INTEGER DEFAULT 0' },
      { nombre: 'fecha_subida', tipo: 'DATETIME DEFAULT CURRENT_TIMESTAMP' },
      { nombre: 'fecha_modificacion', tipo: 'DATETIME DEFAULT CURRENT_TIMESTAMP' }
    ];

    for (const columna of columnasRequeridas) {
      if (!nombresColumnas.has(columna.nombre)) {
        console.log(`➕ [DB] Agregando columna: ${columna.nombre}`);
        try {
          const alterTable = db.prepare(`
            ALTER TABLE multimedia 
            ADD COLUMN ${columna.nombre} ${columna.tipo}
          `);
          alterTable.run();
          console.log(`✅ [DB] Columna ${columna.nombre} agregada`);
        } catch (error) {
          console.error(`❌ [DB] Error agregando columna ${columna.nombre}:`, error);
        }
      }
    }

    // Verificar estructura final
    const columnasFinales = db.prepare("PRAGMA table_info(multimedia)").all();
    console.log("✅ [DB] Estructura final de tabla multimedia:", columnasFinales);

  } catch (error) {
    console.error("❌ [DB] Error migrando tabla multimedia:", error);
  }
}

// Agregar nuevo archivo multimedia (archivos o URLs)
function agregarMultimedia(multimediaData) {
  try {
    console.log("💾 [DB] Agregando archivo multimedia:", multimediaData);

    const nombre = String(multimediaData?.nombre || "").trim();
    const tipo = String(multimediaData?.tipo || multimediaData?.type || "").trim();
    const urlFinal = String(multimediaData?.url || "").trim();
    const rutaArchivo = String(
      multimediaData?.ruta_archivo ||
      multimediaData?.rutaArchivo ||
      multimediaData?.originalUrl ||
      multimediaData?.url ||
      "",
    ).trim();

    if (!nombre || !tipo || !urlFinal) {
      throw new Error("Nombre, tipo y url son requeridos");
    }

    // Deduplicación: si ya existe por url/ruta (o por videoId si es YouTube), reutilizar.
    const clave = obtenerClaveDedupeMultimedia({ tipo, url: urlFinal, ruta_archivo: rutaArchivo });
    const ytId = clave.startsWith("yt:") ? clave.slice(3) : "";

    let existente = null;
    try {
      existente = db
        .prepare("SELECT id FROM multimedia WHERE url = ? LIMIT 1")
        .get(urlFinal);
      if (!existente && rutaArchivo) {
        existente = db
          .prepare("SELECT id FROM multimedia WHERE ruta_archivo = ? LIMIT 1")
          .get(rutaArchivo);
      }
      if (!existente && ytId && ytId.length === 11) {
        const like = `%${ytId}%`;
        existente = db
          .prepare(
            "SELECT id FROM multimedia WHERE (url LIKE ? OR ruta_archivo LIKE ?) AND tipo = 'youtube' LIMIT 1",
          )
          .get(like, like);
      }
    } catch (e) {
      console.warn("⚠️ [DB] No se pudo verificar duplicados:", e?.message);
    }

    if (existente?.id) {
      return { success: true, id: existente.id, deduplicated: true };
    }

    const tamaño =
      multimediaData?.tamaño ??
      multimediaData?.size ??
      null;

    // Insert completo (la migración crea todas las columnas)
    const stmt = db.prepare(`
      INSERT INTO multimedia(
        nombre, tipo, tamaño, ruta_archivo, url, extension, duracion,
        resolucion, miniatura, descripcion, tags, favorito, activo, reproducido
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const rutaFinal = rutaArchivo || urlFinal;
    let info;
    try {
      info = stmt.run(
        nombre,
        tipo,
        tamaño,
        rutaFinal,
        urlFinal,
        multimediaData?.extension || "",
        multimediaData?.duracion || "",
        multimediaData?.resolucion || "",
        multimediaData?.miniatura || "",
        multimediaData?.descripcion || "",
        JSON.stringify(multimediaData?.tags || []),
        multimediaData?.favorito ? 1 : 0,
        multimediaData?.activo ? 1 : 0,
        0,
      );
    } catch (insertErr) {
      const msg = String(insertErr?.message || "");
      if (
        msg.includes("UNIQUE") &&
        (msg.includes("multimedia.ruta_archivo") || msg.includes("idx_multimedia_ruta_archivo_unique"))
      ) {
        const existentePorRuta = db
          .prepare("SELECT id FROM multimedia WHERE ruta_archivo = ? LIMIT 1")
          .get(rutaFinal);
        if (existentePorRuta?.id) {
          return { success: true, id: existentePorRuta.id, deduplicated: true };
        }

        const existentePorUrl = db
          .prepare("SELECT id FROM multimedia WHERE url = ? LIMIT 1")
          .get(urlFinal);
        if (existentePorUrl?.id) {
          return { success: true, id: existentePorUrl.id, deduplicated: true };
        }
      }

      throw insertErr;
    }

    console.log("✅ [DB] Archivo multimedia agregado con ID:", info.lastInsertRowid);
    return { success: true, id: info.lastInsertRowid };
  } catch (error) {
    console.error("❌ [DB] Error agregando archivo multimedia:", error);
    return { success: false, error: error.message };
  }
}

// Obtener todos los archivos multimedia
function obtenerMultimedia() {
  try {
    console.log("📋 [DB] Obteniendo archivos multimedia...");

    // Verificar columnas disponibles
    const columnas = db.prepare("PRAGMA table_info(multimedia)").all();
    const nombresColumnas = new Set(columnas.map(col => col.name));

    // Construir query según columnas disponibles
    let selectFields = "id, nombre, tipo, tamaño, ruta_archivo, url";

    const columnasOpcionales = [
      'extension', 'duracion', 'resolucion', 'miniatura', 'descripcion',
      'tags', 'favorito', 'activo', 'reproducido', 'fecha_subida', 'fecha_modificacion'
    ];

    for (const columna of columnasOpcionales) {
      if (nombresColumnas.has(columna)) {
        selectFields += `, ${columna} `;
      }
    }

    const query = `SELECT ${selectFields} FROM multimedia ORDER BY fecha_subida DESC`;
    const stmt = db.prepare(query);
    const archivos = stmt.all();

    // Normalizar archivos
    const archivosNormalizados = archivos.map(archivo => ({
      id: archivo.id,
      nombre: archivo.nombre,
      tipo: archivo.tipo,
      size: archivo.tamaño || 0, // Para compatibilidad con el frontend
      tamaño: archivo.tamaño || 0,
      ruta_archivo: archivo.ruta_archivo,
      url: archivo.url || archivo.ruta_archivo,
      extension: archivo.extension || '',
      duracion: archivo.duracion || '',
      resolucion: archivo.resolucion || '',
      miniatura: archivo.miniatura || '',
      descripcion: archivo.descripcion || '',
      tags: archivo.tags ? JSON.parse(archivo.tags) : [],
      favorito: archivo.favorito !== undefined ? Boolean(archivo.favorito) : false,
      activo: archivo.activo !== undefined ? Boolean(archivo.activo) : false,
      reproducido: archivo.reproducido || 0,
      fecha_subida: archivo.fecha_subida || null,
      fecha_modificacion: archivo.fecha_modificacion || null
    }));

    // Deduplicar (mantener el más reciente por clave)
    const seen = new Set();
    const deduped = [];
    for (const item of archivosNormalizados) {
      const key = obtenerClaveDedupeMultimedia(item);
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(item);
    }

    console.log("✅ [DB] Archivos multimedia obtenidos:", deduped.length);
    return deduped;

  } catch (error) {
    console.error("❌ [DB] Error obteniendo archivos multimedia:", error);
    return [];
  }
}

// Obtener archivo multimedia por ID
function obtenerMultimediaPorId(id) {
  try {
    console.log("🔍 [DB] Obteniendo archivo multimedia por ID:", id);

    // Verificar columnas disponibles
    const columnas = db.prepare("PRAGMA table_info(multimedia)").all();
    const nombresColumnas = new Set(columnas.map(col => col.name));

    // Construir query según columnas disponibles
    let selectFields = "id, nombre, tipo, tamaño, ruta_archivo, url";

    const columnasOpcionales = [
      'extension', 'duracion', 'resolucion', 'miniatura', 'descripcion',
      'tags', 'favorito', 'activo', 'reproducido', 'fecha_subida', 'fecha_modificacion'
    ];

    for (const columna of columnasOpcionales) {
      if (nombresColumnas.has(columna)) {
        selectFields += `, ${columna} `;
      }
    }

    const query = `SELECT ${selectFields} FROM multimedia WHERE id = ? `;
    const stmt = db.prepare(query);
    const archivo = stmt.get(id);

    if (archivo) {
      const archivoNormalizado = {
        id: archivo.id,
        nombre: archivo.nombre,
        tipo: archivo.tipo,
        size: archivo.tamaño || 0,
        tamaño: archivo.tamaño || 0,
        ruta_archivo: archivo.ruta_archivo,
        url: archivo.url || archivo.ruta_archivo,
        extension: archivo.extension || '',
        duracion: archivo.duracion || '',
        resolucion: archivo.resolucion || '',
        miniatura: archivo.miniatura || '',
        descripcion: archivo.descripcion || '',
        tags: archivo.tags ? JSON.parse(archivo.tags) : [],
        favorito: archivo.favorito !== undefined ? Boolean(archivo.favorito) : false,
        activo: archivo.activo !== undefined ? Boolean(archivo.activo) : false,
        reproducido: archivo.reproducido || 0,
        fecha_subida: archivo.fecha_subida || null,
        fecha_modificacion: archivo.fecha_modificacion || null
      };

      console.log("✅ [DB] Archivo multimedia encontrado:", archivoNormalizado);
      return archivoNormalizado;
    } else {
      console.log("ℹ️ [DB] Archivo multimedia no encontrado");
      return null;
    }

  } catch (error) {
    console.error("❌ [DB] Error obteniendo archivo multimedia por ID:", error);
    return null;
  }
}

// Actualizar archivo multimedia
function actualizarMultimedia(multimediaData) {
  try {
    console.log("✏️ [DB] Actualizando archivo multimedia:", multimediaData);

    // Verificar columnas disponibles
    const columnas = db.prepare("PRAGMA table_info(multimedia)").all();
    const nombresColumnas = new Set(columnas.map(col => col.name));

    // Si las nuevas columnas no existen, usar estructura básica
    if (!nombresColumnas.has('extension')) {
      console.log("📋 [DB] Usando estructura básica para actualización");
      const stmt = db.prepare(`
        UPDATE multimedia SET
      nombre = ?, tipo = ?, tamaño = ?, url = ?
        WHERE id = ?
          `);
      const info = stmt.run(
        multimediaData.nombre,
        multimediaData.tipo,
        multimediaData.tamaño || null,
        multimediaData.url || null,
        multimediaData.id
      );
      return { success: true, changes: info.changes };
    }

    // Usar estructura completa
    const stmt = db.prepare(`
      UPDATE multimedia SET
      nombre = ?, tipo = ?, tamaño = ?, url = ?, extension = ?,
        duracion = ?, resolucion = ?, miniatura = ?, descripcion = ?,
        tags = ?, favorito = ?, activo = ?, fecha_modificacion = CURRENT_TIMESTAMP
      WHERE id = ?
        `);

    const info = stmt.run(
      multimediaData.nombre,
      multimediaData.tipo,
      multimediaData.tamaño || null,
      multimediaData.url || null,
      multimediaData.extension || '',
      multimediaData.duracion || '',
      multimediaData.resolucion || '',
      multimediaData.miniatura || '',
      multimediaData.descripcion || '',
      JSON.stringify(multimediaData.tags || []),
      multimediaData.favorito ? 1 : 0,
      multimediaData.activo ? 1 : 0,
      multimediaData.id
    );

    console.log("✅ [DB] Archivo multimedia actualizado, filas afectadas:", info.changes);
    return { success: true, changes: info.changes };

  } catch (error) {
    console.error("❌ [DB] Error actualizando archivo multimedia:", error);
    return { success: false, error: error.message };
  }
}

// Eliminar archivo multimedia
function eliminarMultimedia(id) {
  try {
    console.log("🗑️ [DB] Eliminando archivo multimedia:", id);

    // Primero obtener la información del archivo antes de eliminarlo de la BD
    const multimedia = db.prepare("SELECT * FROM multimedia WHERE id = ?").get(id);

    if (!multimedia) {
      console.error("❌ [DB] No se encontró el archivo multimedia con ID:", id);
      return { success: false, error: "Archivo no encontrado" };
    }

    console.log("📄 [DB] Archivo encontrado:", multimedia);

    // Eliminar de la base de datos
    const stmt = db.prepare("DELETE FROM multimedia WHERE id = ?");
    const info = stmt.run(id);

    console.log("✅ [DB] Archivo eliminado de la BD, filas afectadas:", info.changes);

    // Eliminar archivo físico
    if (multimedia.ruta_archivo) {
      const fs = require("fs");
      const path = require("path");

      try {
        // Construir la ruta completa del archivo
        let rutaArchivo = multimedia.ruta_archivo;

        // Si la ruta no es absoluta, construir la ruta relativa a la carpeta multimedia
        if (!path.isAbsolute(rutaArchivo)) {
          const multimediaDir = path.join(__dirname, "public", "multimedia");
          const buildMultimediaDir = path.join(__dirname, "build", "multimedia");

          // Intentar en public/multimedia primero
          const rutaPublic = path.join(multimediaDir, path.basename(rutaArchivo));
          const rutaBuild = path.join(buildMultimediaDir, path.basename(rutaArchivo));

          if (fs.existsSync(rutaPublic)) {
            rutaArchivo = rutaPublic;
          } else if (fs.existsSync(rutaBuild)) {
            rutaArchivo = rutaBuild;
          }
        }

        if (fs.existsSync(rutaArchivo)) {
          fs.unlinkSync(rutaArchivo);
          console.log("🗑️ [DB] Archivo físico eliminado:", rutaArchivo);
        } else {
          console.warn("⚠️ [DB] Archivo físico no encontrado:", rutaArchivo);
        }
      } catch (fileError) {
        console.error("❌ [DB] Error eliminando archivo físico:", fileError);
        // No fallar la operación completa si solo falla la eliminación del archivo
      }
    }

    return { success: true, changes: info.changes };

  } catch (error) {
    console.error("❌ [DB] Error eliminando archivo multimedia:", error);
    return { success: false, error: error.message };
  }
}

// Marcar como favorito
function actualizarFavoritoMultimedia(id, favorito) {
  try {
    console.log("⭐ [DB] Actualizando favorito multimedia:", { id, favorito });

    const stmt = db.prepare("UPDATE multimedia SET favorito = ?, fecha_modificacion = CURRENT_TIMESTAMP WHERE id = ?");
    const info = stmt.run(favorito ? 1 : 0, id);

    console.log("✅ [DB] Favorito multimedia actualizado, filas afectadas:", info.changes);
    return { success: true, changes: info.changes };

  } catch (error) {
    console.error("❌ [DB] Error actualizando favorito multimedia:", error);
    return { success: false, error: error.message };
  }
}

// Obtener archivos multimedia favoritos
function obtenerMultimediaFavoritos() {
  try {
    console.log("⭐ [DB] Obteniendo archivos multimedia favoritos...");

    const multimedia = obtenerMultimedia();
    const favoritos = multimedia.filter(item => item.favorito);

    console.log("✅ [DB] Archivos multimedia favoritos obtenidos:", favoritos.length);
    return favoritos;

  } catch (error) {
    console.error("❌ [DB] Error obteniendo archivos multimedia favoritos:", error);
    return [];
  }
}

// Obtener archivos multimedia por tipo
function obtenerMultimediaPorTipo(tipo) {
  try {
    console.log("🎵 [DB] Obteniendo archivos multimedia por tipo:", tipo);

    const multimedia = obtenerMultimedia();
    const archivosPorTipo = multimedia.filter(item => item.tipo === tipo);

    console.log(`✅[DB] Archivos multimedia de tipo ${tipo} obtenidos: `, archivosPorTipo.length);
    return archivosPorTipo;

  } catch (error) {
    console.error("❌ [DB] Error obteniendo archivos multimedia por tipo:", error);
    return [];
  }
}

// Incrementar contador de reproducción
function incrementarReproducido(id) {
  try {
    console.log("▶️ [DB] Incrementando contador de reproducción:", id);

    // Verificar si la columna reproducido existe
    const columnas = db.prepare("PRAGMA table_info(multimedia)").all();
    const nombresColumnas = new Set(columnas.map(col => col.name));

    if (!nombresColumnas.has('reproducido')) {
      console.log("ℹ️ [DB] Columna reproducido no existe, saltando incremento");
      return { success: true, changes: 0 };
    }

    const stmt = db.prepare(`
      UPDATE multimedia 
      SET reproducido = reproducido + 1, fecha_modificacion = CURRENT_TIMESTAMP 
      WHERE id = ?
        `);
    const info = stmt.run(id);

    console.log("✅ [DB] Contador de reproducción incrementado, filas afectadas:", info.changes);
    return { success: true, changes: info.changes };

  } catch (error) {
    console.error("❌ [DB] Error incrementando contador de reproducción:", error);
    return { success: false, error: error.message };
  }
}

// ✨ EJECUTAR MIGRACIÓN AL INICIALIZAR
console.log("🔧 [DB] Iniciando migración de tabla multimedia...");
migrarTablaMultimedia();
asegurarIntegridadTablaMultimedia();

// ✨ NUEVA FUNCIÓN: Verificar si un archivo ya existe
function verificarArchivoDuplicado(nombre, tamaño, tipo) {
  try {
    console.log("🔍 [DB] Verificando archivo duplicado:", { nombre, tamaño, tipo });

    const stmt = db.prepare(`
      SELECT id, nombre, tamaño, tipo, url 
      FROM multimedia 
      WHERE nombre = ? AND tamaño = ? AND tipo = ?
        `);

    const resultado = stmt.get(nombre, tamaño, tipo);

    if (resultado) {
      console.log("⚠️ [DB] Archivo duplicado encontrado:", resultado);
      return {
        existe: true,
        archivo: resultado
      };
    }

    console.log("✅ [DB] Archivo no duplicado");
    return { existe: false };

  } catch (error) {
    console.error("❌ [DB] Error verificando duplicado:", error);
    return { existe: false, error: error.message };
  }
}

// ====================================
// EXPORTAR TODAS LAS FUNCIONES - ACTUALIZADAS
// ====================================

// ====================================
// TABLA Y FUNCIONES: ORDENES DE SERVICIO
// ====================================

db.prepare(`
  CREATE TABLE IF NOT EXISTS ordenes_servicio (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    fecha TEXT DEFAULT '',
    items TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

function obtenerOrdenesServicio() {
  try {
    const rows = db.prepare("SELECT * FROM ordenes_servicio ORDER BY updated_at DESC").all();
    return rows.map((r) => ({ ...r, items: JSON.parse(r.items || "[]") }));
  } catch (e) {
    console.error("[DB] Error obtenerOrdenesServicio:", e);
    return [];
  }
}

function obtenerOrdenServicioPorId(id) {
  try {
    const row = db.prepare("SELECT * FROM ordenes_servicio WHERE id = ?").get(id);
    if (!row) return null;
    return { ...row, items: JSON.parse(row.items || "[]") };
  } catch (e) {
    return null;
  }
}

function agregarOrdenServicio({ titulo, fecha, items }) {
  try {
    const info = db.prepare(
      "INSERT INTO ordenes_servicio (titulo, fecha, items) VALUES (?, ?, ?)"
    ).run(titulo, fecha || "", JSON.stringify(items || []));
    return { success: true, id: info.lastInsertRowid };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function actualizarOrdenServicio({ id, titulo, fecha, items }) {
  try {
    db.prepare(
      "UPDATE ordenes_servicio SET titulo = ?, fecha = ?, items = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).run(titulo, fecha || "", JSON.stringify(items || []), id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function eliminarOrdenServicio(id) {
  try {
    db.prepare("DELETE FROM ordenes_servicio WHERE id = ?").run(id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ====================================
// TABLA Y FUNCIONES: ANUNCIOS
// ====================================

db.prepare(`
  CREATE TABLE IF NOT EXISTS anuncios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    texto TEXT NOT NULL,
    titulo TEXT DEFAULT '',
    plantilla TEXT DEFAULT 'moderno',
    activo INTEGER DEFAULT 1,
    orden INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

// Migración: agregar columnas nuevas si no existen
["ALTER TABLE anuncios ADD COLUMN titulo TEXT DEFAULT ''",
  "ALTER TABLE anuncios ADD COLUMN plantilla TEXT DEFAULT 'moderno'",
].forEach(sql => { try { db.prepare(sql).run(); } catch { } });

function obtenerAnuncios() {
  try {
    return db.prepare("SELECT * FROM anuncios ORDER BY orden ASC, id ASC").all().map(
      (r) => ({ ...r, activo: Boolean(r.activo), titulo: r.titulo || "", plantilla: r.plantilla || "moderno" })
    );
  } catch (e) {
    return [];
  }
}

function agregarAnuncio({ texto, titulo = "", plantilla = "moderno", activo = true, orden = 0 }) {
  try {
    const maxOrden = db.prepare("SELECT MAX(orden) AS m FROM anuncios").get()?.m ?? 0;
    const info = db.prepare(
      "INSERT INTO anuncios (texto, titulo, plantilla, activo, orden) VALUES (?, ?, ?, ?, ?)"
    ).run(texto, titulo, plantilla, activo ? 1 : 0, maxOrden + 1);
    return { success: true, id: info.lastInsertRowid };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function actualizarAnuncio({ id, texto, titulo = "", plantilla = "moderno", activo, orden }) {
  try {
    db.prepare(
      "UPDATE anuncios SET texto = ?, titulo = ?, plantilla = ?, activo = ?, orden = ? WHERE id = ?"
    ).run(texto, titulo, plantilla, activo ? 1 : 0, orden ?? 0, id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function eliminarAnuncio(id) {
  try {
    db.prepare("DELETE FROM anuncios WHERE id = ?").run(id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function reordenarAnuncios(ids) {
  try {
    const stmt = db.prepare("UPDATE anuncios SET orden = ? WHERE id = ?");
    ids.forEach((id, idx) => stmt.run(idx, id));
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Cerrar la conexión a la base de datos (llamado al salir de la app)
function cerrarDB() {
  try {
    if (db.open) {
      db.close();
      console.log('Base de datos cerrada');
    }
  } catch (err) {
    console.error('Error al cerrar la base de datos:', err);
  }
}

module.exports = {
  db,
  cerrarDB,
  // Funciones de himnos
  obtenerHimnos,
  obtenerHimnoPorId,
  buscarHimnos,
  crearHimno,
  actualizarHimno,
  actualizarFavoritoHimno,
  eliminarHimno,
  // Funciones de fondos - CORREGIDAS
  obtenerFondos,
  agregarFondo,
  actualizarFondo,
  eliminarFondo,
  establecerFondoActivo,
  obtenerFondoActivo,
  inicializarFondosPorDefecto,
  migrarTablaFondos,
  // ✨ Funciones de multimedia activa - NUEVAS
  establecerMultimediaActiva,
  obtenerMultimediaActiva,
  limpiarMultimediaActiva,
  // Funciones de configuración
  obtenerConfiguracion,
  actualizarConfiguracion,
  restaurarConfiguracionDefecto,
  // Funciones de multimedia - NUEVAS
  agregarMultimedia,
  obtenerMultimedia,
  obtenerMultimediaPorId,
  actualizarMultimedia,
  eliminarMultimedia,
  actualizarFavoritoMultimedia,
  obtenerMultimediaFavoritos,
  obtenerMultimediaPorTipo,
  incrementarReproducido,
  migrarTablaMultimedia,
  verificarArchivoDuplicado,
  // Órdenes de servicio
  obtenerOrdenesServicio,
  obtenerOrdenServicioPorId,
  agregarOrdenServicio,
  actualizarOrdenServicio,
  eliminarOrdenServicio,
  // Anuncios
  obtenerAnuncios,
  agregarAnuncio,
  actualizarAnuncio,
  eliminarAnuncio,
  reordenarAnuncios,
};


