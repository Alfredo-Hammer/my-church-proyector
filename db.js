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

// Crear tabla 'presentaciones' si no existe
db.prepare(`
  CREATE TABLE IF NOT EXISTS presentaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    fecha TEXT NOT NULL,
    hora TEXT NOT NULL,
    lugar TEXT,
    responsable TEXT,
    estado TEXT NOT NULL
  )
`).run();

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
    valor: "Casa de Dios",
    tipo: "string",
    descripcion: "Nombre de la iglesia u organización"
  },
  eslogan: {
    valor: "Bienvenidos a la Casa de Dios",
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
  logo: {
    valor: "/logo.jpg",
    tipo: "string",
    descripcion: "Ruta del logo de la iglesia"
  },
  colorPrimario: {
    valor: "#fb923c",
    tipo: "color",
    descripcion: "Color primario del tema"
  },
  colorSecundario: {
    valor: "#ffffff",
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

// Obtener toda la configuración
function obtenerConfiguracion() {
  try {
    const stmt = db.prepare('SELECT clave, valor, tipo FROM configuracion');
    const rows = stmt.all();

    const config = {};
    rows.forEach(row => {
      switch (row.tipo) {
        case 'json':
          config[row.clave] = JSON.parse(row.valor);
          break;
        case 'number':
          config[row.clave] = parseInt(row.valor);
          break;
        case 'boolean':
          config[row.clave] = row.valor === 'true';
          break;
        default:
          config[row.clave] = row.valor;
      }
    });

    // Convertir fontSize de formato plano a objeto
    const fontSize = {
      titulo: config.fontSizeTitulo || "text-5xl",
      parrafo: config.fontSizeParrafo || "text-6xl",
      eslogan: config.fontSizeEslogan || "text-2xl"
    };

    return {
      nombreIglesia: config.nombreIglesia,
      eslogan: config.eslogan,
      pastor: config.pastor,
      direccion: config.direccion,
      telefono: config.telefono,
      email: config.email,
      website: config.website,
      logo: config.logo,
      colorPrimario: config.colorPrimario,
      colorSecundario: config.colorSecundario,
      fontSize,
      videosFondo: config.videosFondo,
      intervaloCambioVideo: config.intervaloCambioVideo,
      // ✨ NUEVOS CAMPOS DE VISIBILIDAD
      mostrarLogo: config.mostrarLogo !== undefined ? config.mostrarLogo : true,
      mostrarNombreIglesia: config.mostrarNombreIglesia !== undefined ? config.mostrarNombreIglesia : true,
      mostrarEslogan: config.mostrarEslogan !== undefined ? config.mostrarEslogan : true
    };
  } catch (error) {
    console.error('Error obteniendo configuración:', error);
    return null;
  }
}

// Guardar configuración
function guardarConfiguracion(configuracion) {
  try {
    console.log('💾 [DB] Guardando configuración:', JSON.stringify(configuracion, null, 2));

    // Validar que configuracion tiene los datos necesarios
    if (!configuracion) {
      throw new Error('Configuración es null o undefined');
    }

    if (!configuracion.fontSize) {
      console.warn('⚠️ [DB] fontSize no está definido, usando valores por defecto');
      configuracion.fontSize = {
        titulo: 'text-5xl',
        parrafo: 'text-6xl',
        eslogan: 'text-2xl'
      };
    }

    // ✨ Usar INSERT con ON CONFLICT para actualizar si existe o insertar si no existe
    const stmt = db.prepare(`
      INSERT INTO configuracion (clave, valor, tipo, descripcion, fecha_actualizacion)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(clave) DO UPDATE SET 
        valor = excluded.valor,
        fecha_actualizacion = CURRENT_TIMESTAMP
    `);

    // Mapear objeto de configuración a claves individuales con sus tipos
    const updates = [
      ['nombreIglesia', configuracion.nombreIglesia || '', 'string', 'Nombre de la iglesia'],
      ['eslogan', configuracion.eslogan || '', 'string', 'Eslogan o mensaje de bienvenida'],
      ['pastor', configuracion.pastor || '', 'string', 'Nombre del pastor'],
      ['direccion', configuracion.direccion || '', 'string', 'Dirección'],
      ['telefono', configuracion.telefono || '', 'string', 'Teléfono'],
      ['email', configuracion.email || '', 'string', 'Email'],
      ['website', configuracion.website || '', 'string', 'Website'],
      ['logo', configuracion.logo || '', 'string', 'Logo'],
      ['colorPrimario', configuracion.colorPrimario || '#fb923c', 'string', 'Color primario'],
      ['colorSecundario', configuracion.colorSecundario || '#ffffff', 'string', 'Color secundario'],
      ['fontSizeTitulo', configuracion.fontSize.titulo || 'text-5xl', 'string', 'Tamaño de fuente título'],
      ['fontSizeParrafo', configuracion.fontSize.parrafo || 'text-6xl', 'string', 'Tamaño de fuente párrafo'],
      ['fontSizeEslogan', configuracion.fontSize.eslogan || 'text-2xl', 'string', 'Tamaño de fuente eslogan'],
      ['videosFondo', JSON.stringify(configuracion.videosFondo || []), 'json', 'Videos de fondo'],
      ['intervaloCambioVideo', (configuracion.intervaloCambioVideo || 120).toString(), 'number', 'Intervalo cambio video'],
      // ✨ NUEVOS CAMPOS DE VISIBILIDAD
      ['mostrarLogo', configuracion.mostrarLogo !== undefined ? configuracion.mostrarLogo.toString() : 'true', 'boolean', 'Mostrar logo en proyector'],
      ['mostrarNombreIglesia', configuracion.mostrarNombreIglesia !== undefined ? configuracion.mostrarNombreIglesia.toString() : 'true', 'boolean', 'Mostrar nombre de iglesia'],
      ['mostrarEslogan', configuracion.mostrarEslogan !== undefined ? configuracion.mostrarEslogan.toString() : 'true', 'boolean', 'Mostrar eslogan']
    ];

    let successCount = 0;
    for (const [clave, valor, tipo, descripcion] of updates) {
      try {
        stmt.run(clave, valor, tipo, descripcion);
        successCount++;
      } catch (updateError) {
        console.error(`❌ [DB] Error actualizando clave "${clave}":`, updateError.message);
        throw updateError;
      }
    }

    console.log(`✅ [DB] Configuración guardada exitosamente (${successCount}/${updates.length} campos)`);
    return true;
  } catch (error) {
    console.error('Error guardando configuración:', error);
    return false;
  }
}

// Obtener valor específico de configuración
function obtenerConfiguracionPorClave(clave) {
  try {
    const stmt = db.prepare('SELECT valor, tipo FROM configuracion WHERE clave = ?');
    const row = stmt.get(clave);

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
    console.error('Error obteniendo configuración por clave:', error);
    return null;
  }
}

// Actualizar valor específico
function actualizarConfiguracionPorClave(clave, valor) {
  try {
    const stmt = db.prepare(`
      UPDATE configuracion 
      SET valor = ?, fecha_actualizacion = CURRENT_TIMESTAMP 
      WHERE clave = ?
    `);

    let valorFormateado = valor;
    if (typeof valor === 'object') {
      valorFormateado = JSON.stringify(valor);
    } else if (typeof valor === 'number') {
      valorFormateado = valor.toString();
    } else if (typeof valor === 'boolean') {
      valorFormateado = valor.toString();
    }

    stmt.run(valorFormateado, clave);
    return true;
  } catch (error) {
    console.error('Error actualizando configuración:', error);
    return false;
  }
}

// Restaurar configuración por defecto
function restaurarConfiguracionPorDefecto() {
  try {
    const stmt = db.prepare(`
      UPDATE configuracion 
      SET valor = ?, fecha_actualizacion = CURRENT_TIMESTAMP 
      WHERE clave = ?
    `);

    for (const [clave, config] of Object.entries(configuracionPorDefecto)) {
      stmt.run(config.valor, clave);
    }

    return true;
  } catch (error) {
    console.error('Error restaurando configuración:', error);
    return false;
  }
}

// Insertar configuración por defecto al inicializar
insertarConfiguracionPorDefecto();

// ====================================
// FUNCIONES EXISTENTES DE HIMNOS
// ====================================

// Agregar nuevo himno
function agregarHimno(numero, titulo, letra, favorito = false) {
  if (!numero || !titulo || !letra) {
    throw new Error("Todos los campos (numero, titulo, letra) son obligatorios.");
  }

  const stmt = db.prepare(`
    INSERT INTO himnos (numero, titulo, letra, favorito)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(numero, titulo, JSON.stringify(letra), favorito ? 1 : 0);
}

// Obtener todos los himnos
function obtenerHimnos() {
  const stmt = db.prepare("SELECT * FROM himnos ORDER BY numero");
  const rows = stmt.all();
  return rows.map(row => ({
    ...row,
    letra: JSON.parse(row.letra),
    favorito: Boolean(row.favorito),
  }));
}

// Obtener himnos favoritos
function obtenerFavoritos() {
  const stmt = db.prepare("SELECT * FROM himnos WHERE favorito = 1 ORDER BY numero");
  const rows = stmt.all();
  return rows.map((row) => ({
    ...row,
    letra: JSON.parse(row.letra),
    favorito: Boolean(row.favorito),
  }));
}

// Actualizar himno completo
function actualizarHimno({ id, numero, titulo, letra, favorito }) {
  const stmt = db.prepare(`
    UPDATE himnos
    SET numero = ?, titulo = ?, letra = ?, favorito = ?
    WHERE id = ?
  `);
  stmt.run(numero, titulo, JSON.stringify(letra), favorito ? 1 : 0, id);
}

// Eliminar himno por ID
function eliminarHimno(id) {
  const stmt = db.prepare("DELETE FROM himnos WHERE id = ?");
  stmt.run(id);
}

function agregarFavorito(id) {
  const stmt = db.prepare("UPDATE himnos SET favorito = 1 WHERE id = ? AND favorito = 0");
  stmt.run(id);
}

// Marcar o desmarcar como favorito
function actualizarFavorito(id, favorito) {
  const stmt = db.prepare("UPDATE himnos SET favorito = ? WHERE id = ?");
  stmt.run(favorito ? 1 : 0, id);
}

//Eliminar himno por ID de favoritos
function eliminarFavorito(id) {
  const stmt = db.prepare("DELETE FROM himnos WHERE id = ?");
  stmt.run(id);
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
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      createTable.run();
      console.log("✅ [DB] Tabla fondos creada con estructura completa");
      return;
    }

    // Verificar columnas existentes
    const columnas = db.prepare("PRAGMA table_info(fondos)").all();
    const nombresColumnas = columnas.map(col => col.name);
    console.log("📋 [DB] Columnas existentes:", nombresColumnas);

    // Agregar columnas faltantes
    const columnasRequeridas = [
      { nombre: 'nombre', tipo: 'TEXT' },
      { nombre: 'created_at', tipo: 'DATETIME' } // ✨ Sin DEFAULT en ALTER TABLE
    ];

    for (const columna of columnasRequeridas) {
      if (!nombresColumnas.includes(columna.nombre)) {
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
    const nombresColumnas = columnas.map(col => col.name);

    // Construir query según columnas disponibles
    let selectFields = "id, url";

    if (nombresColumnas.includes('tipo')) selectFields += ", tipo";
    if (nombresColumnas.includes('nombre')) selectFields += ", nombre";
    if (nombresColumnas.includes('activo')) selectFields += ", activo";
    if (nombresColumnas.includes('created_at')) selectFields += ", created_at";

    const query = `SELECT ${selectFields} FROM fondos ORDER BY id DESC`;
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
    const nombresColumnas = columnas.map(col => col.name);
    console.log("📋 [DB] Columnas disponibles:", nombresColumnas);

    // Insertar el nuevo fondo con las columnas disponibles
    let query, params;

    if (nombresColumnas.includes('nombre')) {
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
      nombre: nombresColumnas.includes('nombre') ? nombre : 'Sin nombre',
      activo
    });

    // Retornar el fondo completo
    const fondoCompleto = {
      id: info.lastInsertRowid,
      url,
      tipo,
      nombre: nombresColumnas.includes('nombre') ? nombre : 'Sin nombre',
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

    const stmt = db.prepare("DELETE FROM fondos WHERE id = ?");
    const info = stmt.run(id);

    console.log("✅ [DB] Fondo eliminado, filas afectadas:", info.changes);
    return info.changes > 0;

  } catch (error) {
    console.error("❌ [DB] Error eliminando fondo:", error);
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
    const nombresColumnas = columnas.map(col => col.name);

    // Construir query según columnas disponibles
    let selectFields = "id, url";

    if (nombresColumnas.includes('tipo')) selectFields += ", tipo";
    if (nombresColumnas.includes('nombre')) selectFields += ", nombre";
    if (nombresColumnas.includes('activo')) selectFields += ", activo";
    if (nombresColumnas.includes('created_at')) selectFields += ", created_at";

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

    // 🔥 PASO 1: Eliminar fondos con rutas incorrectas (migraciones antiguas)
    // Solo mantener fondos que empiezan con /fondos/
    const fondosIncorrectos = db.prepare(`
      SELECT id, url FROM fondos 
      WHERE url NOT LIKE '/fondos/%' 
      AND (url LIKE '/images/%' OR url LIKE '/videos/%')
      AND (url LIKE '%imagen%.jpg' OR url LIKE '%video%.mp4')
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

    // Primero, limpiar duplicados existentes
    limpiarDuplicadosFondos();

    // Fondos requeridos que deben existir
    const fondosRequeridos = [
      "/fondos/video1.mp4",
      "/fondos/video2.mp4",
      "/fondos/video3.mp4",
      "/fondos/imagen1.jpg",
      "/fondos/imagen2.jpg",
      "/fondos/imagen3.jpg"
    ];

    // Verificar cuántos de los fondos por defecto ya existen
    const placeholders = fondosRequeridos.map(() => '?').join(',');
    const checkStmt = db.prepare(`SELECT url FROM fondos WHERE url IN (${placeholders})`);
    const existingFondos = checkStmt.all(...fondosRequeridos);
    const existingCount = existingFondos.length;

    console.log(`📊 [DB] Fondos por defecto existentes: ${existingCount}/${fondosRequeridos.length}`);

    // Si ya existen TODOS los fondos, solo verificar que haya uno activo
    if (existingCount === fondosRequeridos.length) {
      console.log("✅ [DB] Todos los fondos por defecto ya existen");

      // 🧹 CRÍTICO: Volver a limpiar duplicados después del conteo
      // porque pueden haberse creado en ejecuciones anteriores
      console.log("🔄 [DB] Re-verificando duplicados después del conteo inicial...");
      limpiarDuplicadosFondos();

      // Verificar si hay al menos un fondo activo
      const activoStmt = db.prepare("SELECT COUNT(*) as count FROM fondos WHERE activo = 1");
      const activoResult = activoStmt.get();

      if (activoResult.count === 0) {
        console.log("⚠️ [DB] No hay fondos activos, activando video1.mp4...");
        const video1Stmt = db.prepare("SELECT id FROM fondos WHERE url = ?");
        const video1 = video1Stmt.get("/fondos/video1.mp4");

        if (video1) {
          establecerFondoActivo(video1.id);
          console.log(`✅ [DB] video1.mp4 activado por defecto`);
        }
      }

      return;
    }

    // 🔥 ESTRATEGIA NUEVA: Si faltan fondos, eliminar TODOS los por defecto y reinsertar
    // Esto asegura que nunca haya duplicados
    if (existingCount > 0 && existingCount < fondosRequeridos.length) {
      console.log("⚠️ [DB] Fondos por defecto incompletos, eliminando todos para reinsertar...");
      const deletePlaceholders = fondosRequeridos.map(() => '?').join(',');
      const deleteStmt = db.prepare(`DELETE FROM fondos WHERE url IN (${deletePlaceholders})`);
      deleteStmt.run(...fondosRequeridos);
      console.log("🗑️ [DB] Fondos por defecto eliminados para reinserción limpia");
    }

    console.log(`🆕 [DB] Insertando fondos por defecto (${fondosRequeridos.length} fondos)...`);

    // Fondos por defecto de la aplicación - 3 videos y 3 imágenes
    const fondosPorDefecto = [
      // Videos
      {
        url: "/fondos/video1.mp4",
        tipo: "video",
        nombre: "Video 1",
        activo: 1 // Este será el fondo activo inicial
      },
      {
        url: "/fondos/video2.mp4",
        tipo: "video",
        nombre: "Video 2",
        activo: 0
      },
      {
        url: "/fondos/video3.mp4",
        tipo: "video",
        nombre: "Video 3",
        activo: 0
      },
      // Imágenes
      {
        url: "/fondos/imagen1.jpg",
        tipo: "imagen",
        nombre: "Imagen 1",
        activo: 0
      },
      {
        url: "/fondos/imagen2.jpg",
        tipo: "imagen",
        nombre: "Imagen 2",
        activo: 0
      },
      {
        url: "/fondos/imagen3.jpg",
        tipo: "imagen",
        nombre: "Imagen 3",
        activo: 0
      }
    ];

    // Insertar solo los fondos que no existen
    const insertStmt = db.prepare(`
      INSERT INTO fondos (url, tipo, nombre, activo, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
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

    // Asegurar que video1.mp4 sea el activo si no hay ningún fondo activo
    const activoCheck = db.prepare("SELECT COUNT(*) as count FROM fondos WHERE activo = 1").get();
    if (activoCheck.count === 0) {
      const video1 = db.prepare("SELECT id FROM fondos WHERE url = ?").get("/fondos/video1.mp4");
      if (video1) {
        establecerFondoActivo(video1.id);
        console.log("✅ [DB] Fondo activo establecido: /fondos/video1.mp4");
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

// ✨ FUNCIÓN PARA MIGRAR TABLA PRESENTACIONES
function migrarTablaPresentaciones() {
  try {
    console.log("🔧 [DB] Verificando estructura de tabla presentaciones...");

    // Verificar si la tabla existe
    const tablaExiste = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='presentaciones'
    `).get();

    if (!tablaExiste) {
      // Crear tabla nueva con estructura completa
      console.log("📋 [DB] Creando tabla presentaciones nueva...");
      const createTable = db.prepare(`
        CREATE TABLE presentaciones (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          titulo TEXT NOT NULL,
          descripcion TEXT,
          fecha TEXT NOT NULL,
          hora TEXT NOT NULL,
          lugar TEXT,
          responsable TEXT,
          estado TEXT NOT NULL DEFAULT 'Programado',
          categoria TEXT DEFAULT 'Culto',
          duracion TEXT,
          notas TEXT,
          archivos TEXT DEFAULT '[]',
          tags TEXT DEFAULT '[]',
          recordatorios TEXT DEFAULT '[]',
          recursos_necesarios TEXT,
          presupuesto INTEGER DEFAULT 0,
          asistentes_esperados INTEGER DEFAULT 0,
          es_publico INTEGER DEFAULT 1,
          requiere_inscripcion INTEGER DEFAULT 0,
          color_tema TEXT DEFAULT '#3B82F6',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      createTable.run();
      console.log("✅ [DB] Tabla presentaciones creada con estructura completa");
      return;
    }

    // Verificar columnas existentes
    const columnas = db.prepare("PRAGMA table_info(presentaciones)").all();
    const nombresColumnas = columnas.map(col => col.name);
    console.log("📋 [DB] Columnas existentes en presentaciones:", nombresColumnas);

    // Agregar columnas faltantes
    const columnasRequeridas = [
      { nombre: 'categoria', tipo: 'TEXT DEFAULT "Culto"' },
      { nombre: 'duracion', tipo: 'TEXT' },
      { nombre: 'notas', tipo: 'TEXT' },
      { nombre: 'archivos', tipo: 'TEXT DEFAULT "[]"' },
      { nombre: 'tags', tipo: 'TEXT DEFAULT "[]"' },
      { nombre: 'recordatorios', tipo: 'TEXT DEFAULT "[]"' },
      { nombre: 'recursos_necesarios', tipo: 'TEXT' },
      { nombre: 'presupuesto', tipo: 'INTEGER DEFAULT 0' },
      { nombre: 'asistentes_esperados', tipo: 'INTEGER DEFAULT 0' },
      { nombre: 'es_publico', tipo: 'INTEGER DEFAULT 1' },
      { nombre: 'requiere_inscripcion', tipo: 'INTEGER DEFAULT 0' },
      { nombre: 'color_tema', tipo: 'TEXT DEFAULT "#3B82F6"' },
      { nombre: 'created_at', tipo: 'DATETIME' }, // ✨ Sin DEFAULT en ALTER TABLE
      { nombre: 'updated_at', tipo: 'DATETIME' }  // ✨ Sin DEFAULT en ALTER TABLE
    ];

    for (const columna of columnasRequeridas) {
      if (!nombresColumnas.includes(columna.nombre)) {
        console.log(`➕ [DB] Agregando columna: ${columna.nombre}`);
        try {
          const alterTable = db.prepare(`
            ALTER TABLE presentaciones 
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
    const columnasFinales = db.prepare("PRAGMA table_info(presentaciones)").all();
    console.log("✅ [DB] Estructura final de tabla presentaciones:", columnasFinales);

  } catch (error) {
    console.error("❌ [DB] Error migrando tabla presentaciones:", error);
  }
}

// Agregar una nueva presentación - VERSIÓN CORREGIDA
function agregarPresentacion(presentacionData) {
  try {
    console.log("💾 [DB] Agregando presentación:", presentacionData);

    // Verificar columnas disponibles para compatibilidad
    const columnas = db.prepare("PRAGMA table_info(presentaciones)").all();
    const nombresColumnas = columnas.map(col => col.name);

    // Si las nuevas columnas no existen, usar la versión antigua
    if (!nombresColumnas.includes('categoria')) {
      console.log("📋 [DB] Usando estructura antigua de presentaciones");
      const stmt = db.prepare(`
        INSERT INTO presentaciones (titulo, descripcion, fecha, hora, lugar, responsable, estado)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run(
        presentacionData.titulo,
        presentacionData.descripcion || '',
        presentacionData.fecha,
        presentacionData.hora,
        presentacionData.lugar || '',
        presentacionData.responsable || '',
        presentacionData.estado || 'Programado'
      );
      return { success: true, id: info.lastInsertRowid };
    }

    // Usar estructura completa si las columnas existen
    const stmt = db.prepare(`
      INSERT INTO presentaciones (
        titulo, descripcion, fecha, hora, lugar, responsable, estado,
        categoria, duracion, notas, archivos, tags, recordatorios,
        recursos_necesarios, presupuesto, asistentes_esperados,
        es_publico, requiere_inscripcion, color_tema
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      presentacionData.titulo,
      presentacionData.descripcion || '',
      presentacionData.fecha,
      presentacionData.hora,
      presentacionData.lugar || '',
      presentacionData.responsable || '',
      presentacionData.estado || 'Programado',
      presentacionData.categoria || 'Culto',
      presentacionData.duracion || '',
      presentacionData.notas || '',
      JSON.stringify(presentacionData.archivos || []),
      JSON.stringify(presentacionData.tags || []),
      JSON.stringify(presentacionData.recordatorios || []),
      presentacionData.recursos_necesarios || '',
      presentacionData.presupuesto || 0,
      presentacionData.asistentes_esperados || 0,
      presentacionData.es_publico ? 1 : 0,
      presentacionData.requiere_inscripcion ? 1 : 0,
      presentacionData.color_tema || '#3B82F6'
    );

    console.log("✅ [DB] Presentación agregada con ID:", info.lastInsertRowid);
    return { success: true, id: info.lastInsertRowid };

  } catch (error) {
    console.error("❌ [DB] Error agregando presentación:", error);
    return { success: false, error: error.message };
  }
}

// Obtener todas las presentaciones - VERSIÓN CORREGIDA
function obtenerPresentaciones() {
  try {
    console.log("📋 [DB] Obteniendo presentaciones...");

    // Verificar columnas disponibles
    const columnas = db.prepare("PRAGMA table_info(presentaciones)").all();
    const nombresColumnas = columnas.map(col => col.name);

    // Construir query según columnas disponibles
    let selectFields = "id, titulo, descripcion, fecha, hora, lugar, responsable, estado";

    const columnasOpcionales = [
      'categoria', 'duracion', 'notas', 'archivos', 'tags', 'recordatorios',
      'recursos_necesarios', 'presupuesto', 'asistentes_esperados',
      'es_publico', 'requiere_inscripcion', 'color_tema', 'created_at', 'updated_at'
    ];

    for (const columna of columnasOpcionales) {
      if (nombresColumnas.includes(columna)) {
        selectFields += `, ${columna}`;
      }
    }

    const query = `SELECT ${selectFields} FROM presentaciones ORDER BY fecha DESC, hora DESC`;
    const stmt = db.prepare(query);
    const presentaciones = stmt.all();

    // Normalizar presentaciones
    const presentacionesNormalizadas = presentaciones.map(p => ({
      id: p.id,
      titulo: p.titulo,
      descripcion: p.descripcion || '',
      fecha: p.fecha,
      hora: p.hora,
      lugar: p.lugar || '',
      responsable: p.responsable || '',
      estado: p.estado || 'Programado',
      categoria: p.categoria || 'Culto',
      duracion: p.duracion || '',
      notas: p.notas || '',
      archivos: p.archivos ? JSON.parse(p.archivos) : [],
      tags: p.tags ? JSON.parse(p.tags) : [],
      recordatorios: p.recordatorios ? JSON.parse(p.recordatorios) : [],
      recursos_necesarios: p.recursos_necesarios || '',
      presupuesto: p.presupuesto || 0,
      asistentes_esperados: p.asistentes_esperados || 0,
      es_publico: p.es_publico !== undefined ? Boolean(p.es_publico) : true,
      requiere_inscripcion: p.requiere_inscripcion !== undefined ? Boolean(p.requiere_inscripcion) : false,
      color_tema: p.color_tema || '#3B82F6',
      created_at: p.created_at || null,
      updated_at: p.updated_at || null
    }));

    console.log("✅ [DB] Presentaciones obtenidas:", presentacionesNormalizadas.length);
    return presentacionesNormalizadas;

  } catch (error) {
    console.error("❌ [DB] Error obteniendo presentaciones:", error);
    return [];
  }
}

// Editar una presentación - VERSIÓN CORREGIDA
function editarPresentacion(presentacionData) {
  try {
    console.log("✏️ [DB] Editando presentación:", presentacionData);

    // Verificar columnas disponibles para compatibilidad
    const columnas = db.prepare("PRAGMA table_info(presentaciones)").all();
    const nombresColumnas = columnas.map(col => col.name);

    // Si las nuevas columnas no existen, usar la versión antigua
    if (!nombresColumnas.includes('categoria')) {
      console.log("📋 [DB] Usando estructura antigua para edición");
      const stmt = db.prepare(`
        UPDATE presentaciones SET 
          titulo = ?, descripcion = ?, fecha = ?, hora = ?, lugar = ?, 
          responsable = ?, estado = ?
        WHERE id = ?
      `);
      const info = stmt.run(
        presentacionData.titulo,
        presentacionData.descripcion || '',
        presentacionData.fecha,
        presentacionData.hora,
        presentacionData.lugar || '',
        presentacionData.responsable || '',
        presentacionData.estado || 'Programado',
        presentacionData.id
      );
      return { success: true, changes: info.changes };
    }

    // Usar estructura completa si las columnas existen
    const stmt = db.prepare(`
      UPDATE presentaciones SET 
        titulo = ?, descripcion = ?, fecha = ?, hora = ?, lugar = ?, 
        responsable = ?, estado = ?, categoria = ?, duracion = ?, 
        notas = ?, archivos = ?, tags = ?, recordatorios = ?,
        recursos_necesarios = ?, presupuesto = ?, asistentes_esperados = ?,
        es_publico = ?, requiere_inscripcion = ?, color_tema = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    const info = stmt.run(
      presentacionData.titulo,
      presentacionData.descripcion || '',
      presentacionData.fecha,
      presentacionData.hora,
      presentacionData.lugar || '',
      presentacionData.responsable || '',
      presentacionData.estado || 'Programado',
      presentacionData.categoria || 'Culto',
      presentacionData.duracion || '',
      presentacionData.notas || '',
      JSON.stringify(presentacionData.archivos || []),
      JSON.stringify(presentacionData.tags || []),
      JSON.stringify(presentacionData.recordatorios || []),
      presentacionData.recursos_necesarios || '',
      presentacionData.presupuesto || 0,
      presentacionData.asistentes_esperados || 0,
      presentacionData.es_publico ? 1 : 0,
      presentacionData.requiere_inscripcion ? 1 : 0,
      presentacionData.color_tema || '#3B82F6',
      presentacionData.id
    );

    console.log("✅ [DB] Presentación editada, filas afectadas:", info.changes);
    return { success: true, changes: info.changes };

  } catch (error) {
    console.error("❌ [DB] Error editando presentación:", error);
    return { success: false, error: error.message };
  }
}

// Eliminar una presentación por ID - VERSIÓN CORREGIDA
function eliminarPresentacion(id) {
  try {
    console.log("🗑️ [DB] Eliminando presentación:", id);

    const stmt = db.prepare("DELETE FROM presentaciones WHERE id = ?");
    const info = stmt.run(id);

    console.log("✅ [DB] Presentación eliminada, filas afectadas:", info.changes);
    return { success: true, changes: info.changes };

  } catch (error) {
    console.error("❌ [DB] Error eliminando presentación:", error);
    return { success: false, error: error.message };
  }
}

// Obtener presentación por ID
function obtenerPresentacionPorId(id) {
  try {
    console.log("🔍 [DB] Obteniendo presentación por ID:", id);

    // Verificar columnas disponibles
    const columnas = db.prepare("PRAGMA table_info(presentaciones)").all();
    const nombresColumnas = columnas.map(col => col.name);

    // Construir query según columnas disponibles
    let selectFields = "id, titulo, descripcion, fecha, hora, lugar, responsable, estado";

    const columnasOpcionales = [
      'categoria', 'duracion', 'notas', 'archivos', 'tags', 'recordatorios',
      'recursos_necesarios', 'presupuesto', 'asistentes_esperados',
      'es_publico', 'requiere_inscripcion', 'color_tema', 'created_at', 'updated_at'
    ];

    for (const columna of columnasOpcionales) {
      if (nombresColumnas.includes(columna)) {
        selectFields += `, ${columna}`;
      }
    }

    const query = `SELECT ${selectFields} FROM presentaciones WHERE id = ?`;
    const stmt = db.prepare(query);
    const presentacion = stmt.get(id);

    if (presentacion) {
      // Normalizar presentación
      const presentacionNormalizada = {
        id: presentacion.id,
        titulo: presentacion.titulo,
        descripcion: presentacion.descripcion || '',
        fecha: presentacion.fecha,
        hora: presentacion.hora,
        lugar: presentacion.lugar || '',
        responsable: presentacion.responsable || '',
        estado: presentacion.estado || 'Programado',
        categoria: presentacion.categoria || 'Culto',
        duracion: presentacion.duracion || '',
        notas: presentacion.notas || '',
        archivos: presentacion.archivos ? JSON.parse(presentacion.archivos) : [],
        tags: presentacion.tags ? JSON.parse(presentacion.tags) : [],
        recordatorios: presentacion.recordatorios ? JSON.parse(presentacion.recordatorios) : [],
        recursos_necesarios: presentacion.recursos_necesarios || '',
        presupuesto: presentacion.presupuesto || 0,
        asistentes_esperados: presentacion.asistentes_esperados || 0,
        es_publico: presentacion.es_publico !== undefined ? Boolean(presentacion.es_publico) : true,
        requiere_inscripcion: presentacion.requiere_inscripcion !== undefined ? Boolean(presentacion.requiere_inscripcion) : false,
        color_tema: presentacion.color_tema || '#3B82F6',
        created_at: presentacion.created_at || null,
        updated_at: presentacion.updated_at || null
      };

      console.log("✅ [DB] Presentación encontrada:", presentacionNormalizada);
      return presentacionNormalizada;
    } else {
      console.log("ℹ️ [DB] Presentación no encontrada");
      return null;
    }

  } catch (error) {
    console.error("❌ [DB] Error obteniendo presentación por ID:", error);
    return null;
  }
}

// Función para exportar presentación (placeholder para implementación futura)
function exportarPresentacion(id) {
  try {
    console.log("📤 [DB] Exportando presentación:", id);

    const presentacion = obtenerPresentacionPorId(id);
    if (!presentacion) {
      return { success: false, error: "Presentación no encontrada" };
    }

    // Aquí implementarías la lógica de exportación
    // Por ahora retornamos éxito como placeholder
    return { success: true, data: presentacion };

  } catch (error) {
    console.error("❌ [DB] Error exportando presentación:", error);
    return { success: false, error: error.message };
  }
}

// ✨ EJECUTAR MIGRACIÓN AL INICIALIZAR
console.log("🔧 [DB] Iniciando migración de tabla presentaciones...");
migrarTablaPresentaciones();

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
    const nombresColumnas = columnas.map(col => col.name);
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
      if (!nombresColumnas.includes(columna.nombre)) {
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

// Agregar nuevo archivo multimedia - CORREGIR FUNCIÓN
function agregarMultimedia(multimediaData) {
  try {
    console.log("💾 [DB] Agregando archivo multimedia:", multimediaData);

    // ✨ CORREGIR VALIDACIÓN - usar 'url' en lugar de 'ruta_archivo'
    if (!multimediaData.nombre || !multimediaData.tipo || !multimediaData.url) {
      throw new Error("Nombre, tipo y url son requeridos");
    }

    // Verificar columnas disponibles
    const columnas = db.prepare("PRAGMA table_info(multimedia)").all();
    const nombresColumnas = columnas.map(col => col.name);

    // Si las nuevas columnas no existen, usar estructura básica
    if (!nombresColumnas.includes('extension')) {
      console.log("📋 [DB] Usando estructura básica de multimedia");
      const stmt = db.prepare(`
        INSERT INTO multimedia (nombre, tipo, tamaño, ruta_archivo, url)
        VALUES (?, ?, ?, ?, ?)
      `);
      const info = stmt.run(
        multimediaData.nombre,
        multimediaData.tipo,
        multimediaData.tamaño || null,
        multimediaData.url, // ✨ usar url como ruta_archivo
        multimediaData.url
      );
      return { success: true, id: info.lastInsertRowid };
    }

    // Usar estructura completa
    const stmt = db.prepare(`
      INSERT INTO multimedia (
        nombre, tipo, tamaño, ruta_archivo, url, extension, duracion,
        resolucion, miniatura, descripcion, tags, favorito, activo, reproducido
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      multimediaData.nombre,
      multimediaData.tipo,
      multimediaData.tamaño || null,
      multimediaData.url, // ✨ usar url como ruta_archivo
      multimediaData.url,
      multimediaData.extension || '',
      multimediaData.duracion || '',
      multimediaData.resolucion || '',
      multimediaData.miniatura || '',
      multimediaData.descripcion || '',
      JSON.stringify(multimediaData.tags || []),
      multimediaData.favorito ? 1 : 0,
      multimediaData.activo ? 1 : 0,
      0 // reproducido por defecto
    );

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
    const nombresColumnas = columnas.map(col => col.name);

    // Construir query según columnas disponibles
    let selectFields = "id, nombre, tipo, tamaño, ruta_archivo, url";

    const columnasOpcionales = [
      'extension', 'duracion', 'resolucion', 'miniatura', 'descripcion',
      'tags', 'favorito', 'activo', 'reproducido', 'fecha_subida', 'fecha_modificacion'
    ];

    for (const columna of columnasOpcionales) {
      if (nombresColumnas.includes(columna)) {
        selectFields += `, ${columna}`;
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

    console.log("✅ [DB] Archivos multimedia obtenidos:", archivosNormalizados.length);
    return archivosNormalizados;

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
    const nombresColumnas = columnas.map(col => col.name);

    // Construir query según columnas disponibles
    let selectFields = "id, nombre, tipo, tamaño, ruta_archivo, url";

    const columnasOpcionales = [
      'extension', 'duracion', 'resolucion', 'miniatura', 'descripcion',
      'tags', 'favorito', 'activo', 'reproducido', 'fecha_subida', 'fecha_modificacion'
    ];

    for (const columna of columnasOpcionales) {
      if (nombresColumnas.includes(columna)) {
        selectFields += `, ${columna}`;
      }
    }

    const query = `SELECT ${selectFields} FROM multimedia WHERE id = ?`;
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
    const nombresColumnas = columnas.map(col => col.name);

    // Si las nuevas columnas no existen, usar estructura básica
    if (!nombresColumnas.includes('extension')) {
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

    console.log(`✅ [DB] Archivos multimedia de tipo ${tipo} obtenidos:`, archivosPorTipo.length);
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
    const nombresColumnas = columnas.map(col => col.name);

    if (!nombresColumnas.includes('reproducido')) {
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
// FUNCIONES DE PRESENTACIONES DE DIAPOSITIVAS - NUEVAS
// ====================================

// ✨ FUNCIÓN PARA MIGRAR TABLA PRESENTACIONES_SLIDES
function migrarTablaPresentacionesSlides() {
  try {
    console.log("🔧 [DB] Verificando estructura de tabla presentaciones_slides...");

    // Verificar si la tabla existe
    const tablaExiste = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='presentaciones_slides'
    `).get();

    if (!tablaExiste) {
      // Crear tabla nueva con estructura completa
      console.log("📋 [DB] Creando tabla presentaciones_slides nueva...");
      const createTable = db.prepare(`
        CREATE TABLE presentaciones_slides (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT NOT NULL,
          descripcion TEXT,
          slides TEXT NOT NULL,
          importado_desde TEXT,
          tipo_archivo TEXT DEFAULT 'custom',
          tamano_archivo INTEGER DEFAULT 0,
          total_slides INTEGER DEFAULT 0,
          slide_actual INTEGER DEFAULT 0,
          configuracion TEXT DEFAULT '{}',
          tags TEXT DEFAULT '[]',
          favorito INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      createTable.run();
      console.log("✅ [DB] Tabla presentaciones_slides creada con estructura completa");
      return;
    }

    // Verificar columnas existentes
    const columnas = db.prepare("PRAGMA table_info(presentaciones_slides)").all();
    const nombresColumnas = columnas.map(col => col.name);
    console.log("📋 [DB] Columnas existentes en presentaciones_slides:", nombresColumnas);

    // Agregar columnas faltantes si es necesario
    const columnasRequeridas = [
      { nombre: 'descripcion', tipo: 'TEXT' },
      { nombre: 'importado_desde', tipo: 'TEXT' },
      { nombre: 'tipo_archivo', tipo: 'TEXT DEFAULT "custom"' },
      { nombre: 'tamano_archivo', tipo: 'INTEGER DEFAULT 0' },
      { nombre: 'total_slides', tipo: 'INTEGER DEFAULT 0' },
      { nombre: 'slide_actual', tipo: 'INTEGER DEFAULT 0' },
      { nombre: 'configuracion', tipo: 'TEXT DEFAULT "{}"' },
      { nombre: 'tags', tipo: 'TEXT DEFAULT "[]"' },
      { nombre: 'favorito', tipo: 'INTEGER DEFAULT 0' },
      { nombre: 'created_at', tipo: 'DATETIME' }, // ✨ Sin DEFAULT en ALTER TABLE
      { nombre: 'updated_at', tipo: 'DATETIME' }  // ✨ Sin DEFAULT en ALTER TABLE
    ];

    for (const columna of columnasRequeridas) {
      if (!nombresColumnas.includes(columna.nombre)) {
        console.log(`➕ [DB] Agregando columna: ${columna.nombre}`);
        try {
          const alterTable = db.prepare(`
            ALTER TABLE presentaciones_slides 
            ADD COLUMN ${columna.nombre} ${columna.tipo}
          `);
          alterTable.run();
          console.log(`✅ [DB] Columna ${columna.nombre} agregada`);
        } catch (error) {
          console.error(`❌ [DB] Error agregando columna ${columna.nombre}:`, error);
        }
      }
    }

    console.log("✅ [DB] Migración de tabla presentaciones_slides completada");

  } catch (error) {
    console.error("❌ [DB] Error migrando tabla presentaciones_slides:", error);
  }
}

// Agregar nueva presentación de diapositivas
function agregarPresentacionSlides(presentacionData) {
  try {
    console.log("💾 [DB] Agregando presentación de diapositivas:", presentacionData.nombre);

    // Validar datos requeridos
    if (!presentacionData.nombre || !presentacionData.slides) {
      throw new Error("Nombre y slides son requeridos");
    }

    // Calcular total de slides
    const slides = Array.isArray(presentacionData.slides)
      ? presentacionData.slides
      : JSON.parse(presentacionData.slides);

    const totalSlides = slides.length;

    const stmt = db.prepare(`
      INSERT INTO presentaciones_slides (
        nombre, descripcion, slides, importado_desde, tipo_archivo,
        tamano_archivo, total_slides, slide_actual, configuracion,
        tags, favorito
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      presentacionData.nombre,
      presentacionData.descripcion || '',
      JSON.stringify(slides),
      presentacionData.importado_desde || null,
      presentacionData.tipo_archivo || 'custom',
      presentacionData.tamano_archivo || 0,
      totalSlides,
      0, // slide_actual por defecto
      JSON.stringify(presentacionData.configuracion || {}),
      JSON.stringify(presentacionData.tags || []),
      presentacionData.favorito ? 1 : 0
    );

    console.log("✅ [DB] Presentación de diapositivas agregada con ID:", info.lastInsertRowid);
    return {
      success: true,
      id: info.lastInsertRowid,
      totalSlides: totalSlides
    };

  } catch (error) {
    console.error("❌ [DB] Error agregando presentación de diapositivas:", error);
    return { success: false, error: error.message };
  }
}

// Obtener todas las presentaciones de diapositivas
function obtenerPresentacionesSlides() {
  try {
    console.log("📋 [DB] Obteniendo presentaciones de diapositivas...");

    const stmt = db.prepare(`
      SELECT * FROM presentaciones_slides 
      ORDER BY updated_at DESC, created_at DESC
    `);
    const presentaciones = stmt.all();

    // Normalizar datos
    const presentacionesNormalizadas = presentaciones.map(p => ({
      id: p.id,
      nombre: p.nombre || 'Sin nombre',
      descripcion: p.descripcion || '',
      slides: p.slides ? JSON.parse(p.slides) : [],
      importado_desde: p.importado_desde || null,
      tipo_archivo: p.tipo_archivo || 'custom',
      tamano_archivo: p.tamano_archivo || 0,
      total_slides: p.total_slides || 0,
      slide_actual: p.slide_actual || 0,
      configuracion: p.configuracion ? JSON.parse(p.configuracion) : {},
      tags: p.tags ? JSON.parse(p.tags) : [],
      favorito: Boolean(p.favorito),
      created_at: p.created_at,
      updated_at: p.updated_at
    }));

    console.log("✅ [DB] Presentaciones de diapositivas obtenidas:", presentacionesNormalizadas.length);
    return presentacionesNormalizadas;

  } catch (error) {
    console.error("❌ [DB] Error obteniendo presentaciones de diapositivas:", error);
    return [];
  }
}

// Obtener presentación de diapositivas por ID
function obtenerPresentacionSlidesPorId(id) {
  try {
    console.log("🔍 [DB] Obteniendo presentación de diapositivas por ID:", id);

    const stmt = db.prepare(`
      SELECT * FROM presentaciones_slides WHERE id = ?
    `);
    const presentacion = stmt.get(id);

    if (presentacion) {
      const presentacionNormalizada = {
        id: presentacion.id,
        nombre: presentacion.nombre || 'Sin nombre',
        descripcion: presentacion.descripcion || '',
        slides: presentacion.slides ? JSON.parse(presentacion.slides) : [],
        importado_desde: presentacion.importado_desde || null,
        tipo_archivo: presentacion.tipo_archivo || 'custom',
        tamano_archivo: presentacion.tamano_archivo || 0,
        total_slides: presentacion.total_slides || 0,
        slide_actual: presentacion.slide_actual || 0,
        configuracion: presentacion.configuracion ? JSON.parse(presentacion.configuracion) : {},
        tags: presentacion.tags ? JSON.parse(presentacion.tags) : [],
        favorito: Boolean(presentacion.favorito),
        created_at: presentacion.created_at,
        updated_at: presentacion.updated_at
      };

      console.log("✅ [DB] Presentación de diapositivas encontrada");
      return presentacionNormalizada;
    } else {
      console.log("ℹ️ [DB] Presentación de diapositivas no encontrada");
      return null;
    }

  } catch (error) {
    console.error("❌ [DB] Error obteniendo presentación de diapositivas por ID:", error);
    return null;
  }
}

// Actualizar presentación de diapositivas
function actualizarPresentacionSlides(presentacionData) {
  try {
    console.log("✏️ [DB] Actualizando presentación de diapositivas:", presentacionData.id);

    // Validar datos requeridos
    if (!presentacionData.id) {
      throw new Error("ID de presentación es requerido");
    }

    // Calcular total de slides si se proporcionan nuevas slides
    let totalSlides = presentacionData.total_slides;
    if (presentacionData.slides) {
      const slides = Array.isArray(presentacionData.slides)
        ? presentacionData.slides
        : JSON.parse(presentacionData.slides);
      totalSlides = slides.length;
    }

    const stmt = db.prepare(`
      UPDATE presentaciones_slides SET 
        nombre = ?, descripcion = ?, slides = ?, importado_desde = ?,
        tipo_archivo = ?, tamano_archivo = ?, total_slides = ?,
        slide_actual = ?, configuracion = ?, tags = ?, favorito = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    // Obtener presentación actual para mantener datos existentes
    const presentacionActual = obtenerPresentacionSlidesPorId(presentacionData.id);
    if (!presentacionActual) {
      throw new Error("Presentación no encontrada");
    }

    const info = stmt.run(
      presentacionData.nombre || presentacionActual.nombre,
      presentacionData.descripcion !== undefined ? presentacionData.descripcion : presentacionActual.descripcion,
      presentacionData.slides ? JSON.stringify(presentacionData.slides) : JSON.stringify(presentacionActual.slides),
      presentacionData.importado_desde !== undefined ? presentacionData.importado_desde : presentacionActual.importado_desde,
      presentacionData.tipo_archivo || presentacionActual.tipo_archivo,
      presentacionData.tamano_archivo !== undefined ? presentacionData.tamano_archivo : presentacionActual.tamano_archivo,
      totalSlides !== undefined ? totalSlides : presentacionActual.total_slides,
      presentacionData.slide_actual !== undefined ? presentacionData.slide_actual : presentacionActual.slide_actual,
      presentacionData.configuracion ? JSON.stringify(presentacionData.configuracion) : JSON.stringify(presentacionActual.configuracion),
      presentacionData.tags ? JSON.stringify(presentacionData.tags) : JSON.stringify(presentacionActual.tags),
      presentacionData.favorito !== undefined ? (presentacionData.favorito ? 1 : 0) : (presentacionActual.favorito ? 1 : 0),
      presentacionData.id
    );

    console.log("✅ [DB] Presentación de diapositivas actualizada, filas afectadas:", info.changes);
    return { success: true, changes: info.changes };

  } catch (error) {
    console.error("❌ [DB] Error actualizando presentación de diapositivas:", error);
    return { success: false, error: error.message };
  }
}

// Eliminar presentación de diapositivas
function eliminarPresentacionSlides(id) {
  try {
    console.log("🗑️ [DB] Eliminando presentación de diapositivas:", id);

    const stmt = db.prepare("DELETE FROM presentaciones_slides WHERE id = ?");
    const info = stmt.run(id);

    console.log("✅ [DB] Presentación de diapositivas eliminada, filas afectadas:", info.changes);
    return { success: true, changes: info.changes };

  } catch (error) {
    console.error("❌ [DB] Error eliminando presentación de diapositivas:", error);
    return { success: false, error: error.message };
  }
}

// Duplicar presentación de diapositivas
function duplicarPresentacionSlides(id) {
  try {
    console.log("📋 [DB] Duplicando presentación de diapositivas:", id);

    // Obtener presentación original
    const original = obtenerPresentacionSlidesPorId(id);
    if (!original) {
      throw new Error("Presentación original no encontrada");
    }

    // Crear copia con nuevo nombre
    const nombreCopia = `${original.nombre} (Copia)`;
    const datosClonados = {
      nombre: nombreCopia,
      descripcion: original.descripcion,
      slides: original.slides,
      importado_desde: original.importado_desde,
      tipo_archivo: original.tipo_archivo,
      tamano_archivo: original.tamano_archivo,
      configuracion: original.configuracion,
      tags: original.tags,
      favorito: false // Las copias no son favoritas por defecto
    };

    const resultado = agregarPresentacionSlides(datosClonados);

    if (resultado.success) {
      console.log("✅ [DB] Presentación de diapositivas duplicada con ID:", resultado.id);
    }

    return resultado;

  } catch (error) {
    console.error("❌ [DB] Error duplicando presentación de diapositivas:", error);
    return { success: false, error: error.message };
  }
}

// Marcar/desmarcar presentación como favorita
function actualizarFavoritoPresentacionSlides(id, favorito) {
  try {
    console.log("⭐ [DB] Actualizando favorito presentación diapositivas:", { id, favorito });

    const stmt = db.prepare(`
      UPDATE presentaciones_slides 
      SET favorito = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    const info = stmt.run(favorito ? 1 : 0, id);

    console.log("✅ [DB] Favorito actualizado, filas afectadas:", info.changes);
    return { success: true, changes: info.changes };

  } catch (error) {
    console.error("❌ [DB] Error actualizando favorito:", error);
    return { success: false, error: error.message };
  }
}

// Obtener presentaciones favoritas
function obtenerPresentacionesSlidesFavoritas() {
  try {
    console.log("⭐ [DB] Obteniendo presentaciones de diapositivas favoritas...");

    const presentaciones = obtenerPresentacionesSlides();
    const favoritas = presentaciones.filter(p => p.favorito);

    console.log("✅ [DB] Presentaciones favoritas obtenidas:", favoritas.length);
    return favoritas;

  } catch (error) {
    console.error("❌ [DB] Error obteniendo presentaciones favoritas:", error);
    return [];
  }
}

// Actualizar slide actual de presentación
function actualizarSlideActualPresentacion(id, slideIndex) {
  try {
    console.log("🎯 [DB] Actualizando slide actual:", { id, slideIndex });

    const stmt = db.prepare(`
      UPDATE presentaciones_slides 
      SET slide_actual = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    const info = stmt.run(slideIndex, id);

    console.log("✅ [DB] Slide actual actualizado, filas afectadas:", info.changes);
    return { success: true, changes: info.changes };

  } catch (error) {
    console.error("❌ [DB] Error actualizando slide actual:", error);
    return { success: false, error: error.message };
  }
}

// Exportar presentación como JSON
function exportarPresentacionSlides(id) {
  try {
    console.log("📤 [DB] Exportando presentación de diapositivas:", id);

    const presentacion = obtenerPresentacionSlidesPorId(id);
    if (!presentacion) {
      return { success: false, error: "Presentación no encontrada" };
    }

    // Preparar datos para exportar
    const datosExportar = {
      version: "1.0",
      tipo: "presentacion-diapositivas",
      exportado_en: new Date().toISOString(),
      datos: {
        nombre: presentacion.nombre,
        descripcion: presentacion.descripcion,
        slides: presentacion.slides,
        total_slides: presentacion.total_slides,
        configuracion: presentacion.configuracion,
        tags: presentacion.tags
      }
    };

    console.log("✅ [DB] Presentación preparada para exportar");
    return { success: true, data: datosExportar };

  } catch (error) {
    console.error("❌ [DB] Error exportando presentación:", error);
    return { success: false, error: error.message };
  }
}

// Importar presentación desde JSON
function importarPresentacionSlides(datosImportar, nombreArchivo = null) {
  try {
    console.log("📥 [DB] Importando presentación de diapositivas desde JSON");

    // Validar estructura de datos
    if (!datosImportar.datos || !datosImportar.datos.slides) {
      throw new Error("Estructura de archivo JSON inválida");
    }

    const datos = datosImportar.datos;
    const nombre = nombreArchivo ?
      nombreArchivo.replace(/\.(json|txt)$/i, '') :
      datos.nombre || 'Presentación Importada';

    const presentacionData = {
      nombre: `${nombre} (Importada)`,
      descripcion: datos.descripcion || 'Presentación importada desde archivo JSON',
      slides: datos.slides,
      importado_desde: nombreArchivo || 'archivo.json',
      tipo_archivo: 'imported',
      configuracion: datos.configuracion || {},
      tags: datos.tags || ['importada']
    };

    const resultado = agregarPresentacionSlides(presentacionData);

    if (resultado.success) {
      console.log("✅ [DB] Presentación importada exitosamente con ID:", resultado.id);
    }

    return resultado;

  } catch (error) {
    console.error("❌ [DB] Error importando presentación:", error);
    return { success: false, error: error.message };
  }
}

// Obtener estadísticas de presentaciones
function obtenerEstadisticasPresentacionesSlides() {
  try {
    console.log("📊 [DB] Obteniendo estadísticas de presentaciones...");

    const stmt = db.prepare(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN favorito = 1 THEN 1 END) as favoritas,
        COUNT(CASE WHEN tipo_archivo = 'powerpoint' THEN 1 END) as powerpoint,
        COUNT(CASE WHEN tipo_archivo = 'image' THEN 1 END) as imagenes,
        COUNT(CASE WHEN tipo_archivo = 'custom' THEN 1 END) as personalizadas,
        SUM(total_slides) as total_slides,
        AVG(total_slides) as promedio_slides
      FROM presentaciones_slides
    `);

    const estadisticas = stmt.get();

    console.log("✅ [DB] Estadísticas obtenidas:", estadisticas);
    return estadisticas;

  } catch (error) {
    console.error("❌ [DB] Error obteniendo estadísticas:", error);
    return {
      total: 0,
      favoritas: 0,
      powerpoint: 0,
      imagenes: 0,
      personalizadas: 0,
      total_slides: 0,
      promedio_slides: 0
    };
  }
}

// ✨ EJECUTAR MIGRACIÓN AL INICIALIZAR
console.log("🔧 [DB] Iniciando migración de tabla presentaciones_slides...");
migrarTablaPresentacionesSlides();

// ====================================
// EXPORTAR TODAS LAS FUNCIONES - ACTUALIZADAS
// ====================================

module.exports = {
  db,
  // Funciones de himnos
  agregarHimno,
  obtenerHimnos,
  obtenerFavoritos,
  actualizarHimno,
  eliminarHimno,
  agregarFavorito,
  actualizarFavorito,
  eliminarFavorito,
  // Funciones de fondos - CORREGIDAS
  obtenerFondos,
  agregarFondo,
  eliminarFondo,
  establecerFondoActivo,
  obtenerFondoActivo,
  inicializarFondosPorDefecto,
  migrarTablaFondos,
  // ✨ Funciones de multimedia activa - NUEVAS
  establecerMultimediaActiva,
  obtenerMultimediaActiva,
  limpiarMultimediaActiva,
  // Funciones de presentaciones - ACTUALIZADAS
  agregarPresentacion,
  obtenerPresentaciones,
  eliminarPresentacion,
  editarPresentacion,
  obtenerPresentacionPorId,
  exportarPresentacion,
  migrarTablaPresentaciones,
  // Funciones de configuración
  obtenerConfiguracion,
  guardarConfiguracion,
  obtenerConfiguracionPorClave,
  actualizarConfiguracionPorClave,
  restaurarConfiguracionPorDefecto,
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
  // Funciones de presentaciones de diapositivas - NUEVAS
  agregarPresentacionSlides,
  obtenerPresentacionesSlides,
  obtenerPresentacionSlidesPorId,
  actualizarPresentacionSlides,
  eliminarPresentacionSlides,
  duplicarPresentacionSlides,
  actualizarFavoritoPresentacionSlides,
  obtenerPresentacionesSlidesFavoritas,
  actualizarSlideActualPresentacion,
  exportarPresentacionSlides,
  importarPresentacionSlides,
  obtenerEstadisticasPresentacionesSlides,
  migrarTablaPresentacionesSlides,
};


