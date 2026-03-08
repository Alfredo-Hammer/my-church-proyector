const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
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

// Crear conexión a la base de datos
let db = null;

// Función para promisificar las operaciones de SQLite
const promisify = (fn) => {
  return (...args) => {
    return new Promise((resolve, reject) => {
      fn(...args, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  };
};

// Función para inicializar la base de datos
function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error al conectar con la base de datos:', err);
        reject(err);
        return;
      }

      console.log('Conectado a la base de datos SQLite');

      // Habilitar claves foráneas
      db.run("PRAGMA foreign_keys = ON");

      // Crear tablas
      createTables()
        .then(() => {
          console.log('Tablas creadas exitosamente');
          initializeDefaultData()
            .then(() => {
              console.log('Datos por defecto inicializados');
              resolve();
            })
            .catch(reject);
        })
        .catch(reject);
    });
  });
}

// Función para crear las tablas
async function createTables() {
  const tables = [
    // Tabla himnos
    `CREATE TABLE IF NOT EXISTS himnos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero TEXT,
      titulo TEXT,
      letra TEXT,
      favorito INTEGER DEFAULT 0
    )`,

    // Tabla presentaciones
    `CREATE TABLE IF NOT EXISTS presentaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      descripcion TEXT,
      fecha TEXT NOT NULL,
      hora TEXT NOT NULL,
      lugar TEXT,
      responsable TEXT,
      estado TEXT NOT NULL
    )`,

    // Tabla configuracion
    `CREATE TABLE IF NOT EXISTS configuracion (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clave TEXT UNIQUE NOT NULL,
      valor TEXT NOT NULL,
      tipo TEXT DEFAULT 'string',
      descripcion TEXT,
      fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // Tabla fondos
    `CREATE TABLE IF NOT EXISTS fondos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'imagen',
      activo INTEGER DEFAULT 0
    )`,

    // Tabla planes_proyeccion
    `CREATE TABLE IF NOT EXISTS planes_proyeccion (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      elementos TEXT,
      fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // Tabla multimedia
    `CREATE TABLE IF NOT EXISTS multimedia (
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
    )`
  ];

  for (const sql of tables) {
    await new Promise((resolve, reject) => {
      db.run(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

// Función para ejecutar consultas
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
}

// Función para obtener un registro
function getQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

// Función para obtener múltiples registros
function allQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// ====================================
// FUNCIONES DE CONFIGURACIÓN
// ====================================

// Valores por defecto de configuración
const configuracionPorDefecto = {
  nombreIglesia: {
    valor: "",
    tipo: "string",
    descripcion: "Nombre de la iglesia u organización"
  },
  eslogan: {
    valor: "",
    tipo: "string",
    descripcion: "Eslogan o mensaje de bienvenida"
  },
  pastor: {
    valor: "",
    tipo: "string",
    descripcion: "Nombre del pastor principal"
  },
  telefono: {
    valor: "",
    tipo: "string",
    descripcion: "Teléfono de contacto"
  },
  email: {
    valor: "",
    tipo: "string",
    descripcion: "Email de contacto"
  },
  direccion: {
    valor: "",
    tipo: "string",
    descripcion: "Dirección de la iglesia"
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
  logoUrl: {
    valor: "/images/icon-256.png",
    tipo: "string",
    descripcion: "URL del logo de la iglesia"
  },
  colorPrimario: {
    valor: "#1e40af",
    tipo: "color",
    descripcion: "Color primario de la interfaz"
  },
  colorSecundario: {
    valor: "#3b82f6",
    tipo: "color",
    descripcion: "Color secundario de la interfaz"
  },
  // ✨ CAMPOS DE TAMAÑO DE FUENTE
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
  // ✨ NUEVOS CAMPOS DE VISIBILIDAD
  mostrarLogo: {
    valor: "true",
    tipo: "boolean",
    descripcion: "Mostrar logo en la pantalla de bienvenida del proyector"
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

// Función para inicializar datos por defecto
async function initializeDefaultData() {
  try {
    for (const [clave, config] of Object.entries(configuracionPorDefecto)) {
      const existe = await getQuery(
        'SELECT id FROM configuracion WHERE clave = ?',
        [clave]
      );

      if (!existe) {
        await runQuery(
          'INSERT INTO configuracion (clave, valor, tipo, descripcion) VALUES (?, ?, ?, ?)',
          [clave, config.valor, config.tipo, config.descripcion]
        );
      }
    }
  } catch (error) {
    console.error('Error al inicializar datos por defecto:', error);
  }
}

// Función para restaurar configuración a valores por defecto
async function restaurarConfiguracionDefecto() {
  try {
    console.log('🔄 [DB] Restaurando configuración a valores por defecto...');

    // Eliminar todos los registros de configuración
    await runQuery('DELETE FROM configuracion');
    console.log('🗑️ [DB] Configuración anterior eliminada');

    // Reinsertar valores por defecto
    for (const [clave, config] of Object.entries(configuracionPorDefecto)) {
      await runQuery(
        'INSERT INTO configuracion (clave, valor, tipo, descripcion) VALUES (?, ?, ?, ?)',
        [clave, config.valor, config.tipo, config.descripcion]
      );
    }

    console.log('✅ [DB] Configuración restaurada con valores por defecto');
    return true;
  } catch (error) {
    console.error('❌ [DB] Error al restaurar configuración:', error);
    return false;
  }
}

// Función para obtener configuración
async function obtenerConfiguracion(clave) {
  try {
    const config = await getQuery(
      'SELECT valor FROM configuracion WHERE clave = ?',
      [clave]
    );
    return config ? config.valor : null;
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    return null;
  }
}

// Función para actualizar configuración
async function actualizarConfiguracion(clave, valor) {
  try {
    const valorFinal =
      valor === null || valor === undefined
        ? ""
        : typeof valor === "string"
          ? valor
          : typeof valor === "number" || typeof valor === "boolean"
            ? String(valor)
            : JSON.stringify(valor);

    const result = await runQuery(
      `INSERT INTO configuracion (clave, valor, fecha_actualizacion)
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(clave) DO UPDATE SET
         valor = excluded.valor,
         fecha_actualizacion = CURRENT_TIMESTAMP`,
      [clave, valorFinal]
    );

    return result.changes > 0;
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    return false;
  }
}

// ====================================
// FUNCIONES DE HIMNOS
// ====================================

// Función para obtener todos los himnos
async function obtenerHimnos() {
  try {
    return await allQuery('SELECT * FROM himnos ORDER BY numero ASC');
  } catch (error) {
    console.error('Error al obtener himnos:', error);
    return [];
  }
}

// Función para obtener un himno por ID
async function obtenerHimnoPorId(id) {
  try {
    return await getQuery('SELECT * FROM himnos WHERE id = ?', [id]);
  } catch (error) {
    console.error('Error al obtener himno por ID:', error);
    return null;
  }
}

// Función para buscar himnos
async function buscarHimnos(termino) {
  try {
    const query = `
      SELECT * FROM himnos 
      WHERE titulo LIKE ? OR letra LIKE ? OR numero LIKE ?
      ORDER BY numero ASC
    `;
    const params = [`%${termino}%`, `%${termino}%`, `%${termino}%`];
    return await allQuery(query, params);
  } catch (error) {
    console.error('Error al buscar himnos:', error);
    return [];
  }
}

// Función para crear un himno
async function crearHimno(himno) {
  try {
    const result = await runQuery(
      'INSERT INTO himnos (numero, titulo, letra, favorito) VALUES (?, ?, ?, ?)',
      [himno.numero, himno.titulo, himno.letra, himno.favorito || 0]
    );
    return result.lastID;
  } catch (error) {
    console.error('Error al crear himno:', error);
    throw error;
  }
}

// Función para actualizar un himno
async function actualizarHimno(id, himno) {
  try {
    const result = await runQuery(
      'UPDATE himnos SET numero = ?, titulo = ?, letra = ?, favorito = ? WHERE id = ?',
      [himno.numero, himno.titulo, himno.letra, himno.favorito, id]
    );
    return result.changes > 0;
  } catch (error) {
    console.error('Error al actualizar himno:', error);
    return false;
  }
}

// Función para eliminar un himno
async function eliminarHimno(id) {
  try {
    const result = await runQuery('DELETE FROM himnos WHERE id = ?', [id]);
    return result.changes > 0;
  } catch (error) {
    console.error('Error al eliminar himno:', error);
    return false;
  }
}

// ====================================
// FUNCIONES DE PRESENTACIONES
// ====================================

// Función para obtener todas las presentaciones
async function obtenerPresentaciones() {
  try {
    return await allQuery('SELECT * FROM presentaciones ORDER BY fecha DESC, hora DESC');
  } catch (error) {
    console.error('Error al obtener presentaciones:', error);
    return [];
  }
}

// Función para crear una presentación
async function crearPresentacion(presentacion) {
  try {
    const result = await runQuery(
      'INSERT INTO presentaciones (titulo, descripcion, fecha, hora, lugar, responsable, estado) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [presentacion.titulo, presentacion.descripcion, presentacion.fecha, presentacion.hora, presentacion.lugar, presentacion.responsable, presentacion.estado]
    );
    return result.lastID;
  } catch (error) {
    console.error('Error al crear presentación:', error);
    throw error;
  }
}

// Función para actualizar una presentación
async function actualizarPresentacion(id, presentacion) {
  try {
    const result = await runQuery(
      'UPDATE presentaciones SET titulo = ?, descripcion = ?, fecha = ?, hora = ?, lugar = ?, responsable = ?, estado = ? WHERE id = ?',
      [presentacion.titulo, presentacion.descripcion, presentacion.fecha, presentacion.hora, presentacion.lugar, presentacion.responsable, presentacion.estado, id]
    );
    return result.changes > 0;
  } catch (error) {
    console.error('Error al actualizar presentación:', error);
    return false;
  }
}

// Función para eliminar una presentación
async function eliminarPresentacion(id) {
  try {
    const result = await runQuery('DELETE FROM presentaciones WHERE id = ?', [id]);
    return result.changes > 0;
  } catch (error) {
    console.error('Error al eliminar presentación:', error);
    return false;
  }
}

// ====================================
// FUNCIONES DE FONDOS
// ====================================

// Función para obtener todos los fondos
async function obtenerFondos() {
  try {
    return await allQuery('SELECT * FROM fondos ORDER BY activo DESC, id ASC');
  } catch (error) {
    console.error('Error al obtener fondos:', error);
    return [];
  }
}

// Función para crear un fondo
async function crearFondo(fondo) {
  try {
    const result = await runQuery(
      'INSERT INTO fondos (url, tipo, activo) VALUES (?, ?, ?)',
      [fondo.url, fondo.tipo, fondo.activo || 0]
    );
    return result.lastID;
  } catch (error) {
    console.error('Error al crear fondo:', error);
    throw error;
  }
}

// Función para activar un fondo
async function activarFondo(id) {
  try {
    // Primero desactivar todos los fondos
    await runQuery('UPDATE fondos SET activo = 0');

    // Luego activar el fondo seleccionado
    const result = await runQuery('UPDATE fondos SET activo = 1 WHERE id = ?', [id]);
    return result.changes > 0;
  } catch (error) {
    console.error('Error al activar fondo:', error);
    return false;
  }
}

// Función para eliminar un fondo
async function eliminarFondo(id) {
  try {
    const result = await runQuery('DELETE FROM fondos WHERE id = ?', [id]);
    return result.changes > 0;
  } catch (error) {
    console.error('Error al eliminar fondo:', error);
    return false;
  }
}

// ====================================
// FUNCIONES DE PLANES DE PROYECCIÓN
// ====================================

// Función para obtener todos los planes
async function obtenerPlanes() {
  try {
    return await allQuery('SELECT * FROM planes_proyeccion ORDER BY fecha_creacion DESC');
  } catch (error) {
    console.error('Error al obtener planes:', error);
    return [];
  }
}

// Función para crear un plan
async function crearPlan(plan) {
  try {
    const result = await runQuery(
      'INSERT INTO planes_proyeccion (nombre, descripcion, elementos) VALUES (?, ?, ?)',
      [plan.nombre, plan.descripcion, JSON.stringify(plan.elementos)]
    );
    return result.lastID;
  } catch (error) {
    console.error('Error al crear plan:', error);
    throw error;
  }
}

// ====================================
// FUNCIONES DE PRESENTACIONES (COMPATIBILIDAD)
// ====================================

// Función para crear una presentación simple (mapea a planes)
async function agregarPresentacionCompat(presentacion) {
  try {
    const result = await crearPresentacion(presentacion);
    return result;
  } catch (error) {
    console.error('Error al agregar presentación:', error);
    throw error;
  }
}

// Función para obtener presentaciones simples
async function obtenerPresentacionesCompat() {
  try {
    return await obtenerPresentaciones();
  } catch (error) {
    console.error('Error al obtener presentaciones:', error);
    return [];
  }
}

// Función para editar presentación
async function editarPresentacionCompat(id, datos) {
  try {
    return await actualizarPresentacion(id, datos);
  } catch (error) {
    console.error('Error al editar presentación:', error);
    return false;
  }
}

// Función para eliminar presentación
async function eliminarPresentacionCompat(id) {
  try {
    return await eliminarPresentacion(id);
  } catch (error) {
    console.error('Error al eliminar presentación:', error);
    return false;
  }
}

// Función para cerrar la base de datos
function cerrarDB() {
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('Error al cerrar la base de datos:', err);
      } else {
        console.log('Base de datos cerrada');
      }
    });
  }
}

// ==============================
// FUNCIONES DE MULTIMEDIA
// ==============================

// Obtener todos los archivos multimedia
async function obtenerMultimedia() {
  try {
    console.log("📋 [DB-New] Obteniendo archivos multimedia...");

    const query = `
      SELECT id, nombre, tipo, tamaño, ruta_archivo, url, extension, 
             duracion, resolucion, miniatura, descripcion, tags, 
             favorito, activo, reproducido, fecha_subida, fecha_modificacion
      FROM multimedia 
      ORDER BY fecha_subida DESC
    `;

    const result = await allQuery(query);

    // Normalizar archivos
    const archivosNormalizados = result.map(archivo => ({
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

    console.log("✅ [DB-New] Archivos multimedia obtenidos:", archivosNormalizados.length);
    return archivosNormalizados;

  } catch (error) {
    console.error("❌ [DB-New] Error obteniendo archivos multimedia:", error);
    return [];
  }
}

// Agregar archivo multimedia
async function agregarMultimedia(multimediaData) {
  try {
    console.log("📝 [DB-New] Agregando archivo multimedia:", multimediaData);

    const {
      nombre, tipo, tamaño, ruta_archivo, url, extension,
      duracion, resolucion, miniatura, descripcion, tags
    } = multimediaData;

    const query = `
      INSERT INTO multimedia (
        nombre, tipo, tamaño, ruta_archivo, url, extension,
        duracion, resolucion, miniatura, descripcion, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      nombre, tipo, tamaño || 0, ruta_archivo, url || ruta_archivo,
      extension || '', duracion || '', resolucion || '',
      miniatura || '', descripcion || '',
      JSON.stringify(tags || [])
    ];

    const result = await runQuery(query, params);
    console.log("✅ [DB-New] Archivo multimedia agregado con ID:", result.lastID);
    return result.lastID;

  } catch (error) {
    console.error("❌ [DB-New] Error agregando archivo multimedia:", error);
    throw error;
  }
}

// Actualizar favorito multimedia
async function actualizarFavoritoMultimedia(id, favorito) {
  try {
    const query = "UPDATE multimedia SET favorito = ? WHERE id = ?";
    const params = [favorito ? 1 : 0, id];
    await runQuery(query, params);
    console.log(`✅ [DB-New] Favorito multimedia ${id} actualizado a:`, favorito);
    return true;
  } catch (error) {
    console.error("❌ [DB-New] Error actualizando favorito multimedia:", error);
    return false;
  }
}

// Eliminar archivo multimedia
async function eliminarMultimedia(id) {
  try {
    const query = "DELETE FROM multimedia WHERE id = ?";
    await runQuery(query, [id]);
    console.log("✅ [DB-New] Archivo multimedia eliminado:", id);
    return true;
  } catch (error) {
    console.error("❌ [DB-New] Error eliminando archivo multimedia:", error);
    return false;
  }
}

// Obtener multimedia favoritos
async function obtenerMultimediaFavoritos() {
  try {
    const query = `
      SELECT id, nombre, tipo, tamaño, ruta_archivo, url, extension, 
             duracion, resolucion, miniatura, descripcion, tags, 
             favorito, activo, reproducido, fecha_subida, fecha_modificacion
      FROM multimedia 
      WHERE favorito = 1
      ORDER BY fecha_subida DESC
    `;
    return await allQuery(query);
  } catch (error) {
    console.error("❌ [DB-New] Error obteniendo multimedia favoritos:", error);
    return [];
  }
}

// Obtener multimedia por tipo
async function obtenerMultimediaPorTipo(tipo) {
  try {
    const query = `
      SELECT id, nombre, tipo, tamaño, ruta_archivo, url, extension, 
             duracion, resolucion, miniatura, descripcion, tags, 
             favorito, activo, reproducido, fecha_subida, fecha_modificacion
      FROM multimedia 
      WHERE tipo = ?
      ORDER BY fecha_subida DESC
    `;
    return await allQuery(query, [tipo]);
  } catch (error) {
    console.error("❌ [DB-New] Error obteniendo multimedia por tipo:", error);
    return [];
  }
}

// Incrementar contador de reproducido
async function incrementarReproducido(id) {
  try {
    const query = "UPDATE multimedia SET reproducido = reproducido + 1 WHERE id = ?";
    await runQuery(query, [id]);
    console.log("✅ [DB-New] Contador reproducido incrementado para:", id);
    return true;
  } catch (error) {
    console.error("❌ [DB-New] Error incrementando contador:", error);
    return false;
  }
}

// Actualizar archivo multimedia
async function actualizarMultimedia(multimediaData) {
  try {
    const { id, nombre, tipo, tamaño, ruta_archivo, url, extension, duracion, resolucion, miniatura, descripcion, tags } = multimediaData;

    const query = `
      UPDATE multimedia 
      SET nombre = ?, tipo = ?, tamaño = ?, ruta_archivo = ?, url = ?, 
          extension = ?, duracion = ?, resolucion = ?, miniatura = ?, 
          descripcion = ?, tags = ?, fecha_modificacion = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const params = [
      nombre, tipo, tamaño || 0, ruta_archivo, url || ruta_archivo,
      extension || '', duracion || '', resolucion || '',
      miniatura || '', descripcion || '',
      JSON.stringify(tags || []), id
    ];

    await runQuery(query, params);
    console.log("✅ [DB-New] Archivo multimedia actualizado:", id);
    return true;

  } catch (error) {
    console.error("❌ [DB-New] Error actualizando archivo multimedia:", error);
    return false;
  }
}

// Funciones para multimedia activa (estado global)
let multimediaActiva = null;

async function establecerMultimediaActiva(multimediaData) {
  try {
    multimediaActiva = multimediaData;
    console.log("📺 [DB-New] Multimedia activa establecida:", multimediaData?.nombre);
    return true;
  } catch (error) {
    console.error("❌ [DB-New] Error estableciendo multimedia activa:", error);
    return false;
  }
}

async function obtenerMultimediaActiva() {
  try {
    return multimediaActiva;
  } catch (error) {
    console.error("❌ [DB-New] Error obteniendo multimedia activa:", error);
    return null;
  }
}

async function limpiarMultimediaActiva() {
  try {
    multimediaActiva = null;
    console.log("🧹 [DB-New] Multimedia activa limpiada");
    return true;
  } catch (error) {
    console.error("❌ [DB-New] Error limpiando multimedia activa:", error);
    return false;
  }
}

// Exportar funciones
module.exports = {
  // Inicialización
  initializeDatabase,
  cerrarDB,

  // Configuración
  obtenerConfiguracion,
  actualizarConfiguracion,
  restaurarConfiguracionDefecto,

  // Himnos
  obtenerHimnos,
  obtenerHimnoPorId,
  buscarHimnos,
  crearHimno,
  actualizarHimno,
  eliminarHimno,

  // Presentaciones
  obtenerPresentaciones,
  crearPresentacion,
  actualizarPresentacion,
  eliminarPresentacion,

  // Funciones de compatibilidad para presentaciones
  agregarPresentacion: agregarPresentacionCompat,
  editarPresentacion: editarPresentacionCompat,

  // Fondos
  obtenerFondos,
  crearFondo,
  activarFondo,
  eliminarFondo,

  // Planes
  obtenerPlanes,
  crearPlan,

  // Multimedia
  obtenerMultimedia,
  agregarMultimedia,
  actualizarMultimedia,
  eliminarMultimedia,
  actualizarFavoritoMultimedia,
  incrementarReproducido,
  obtenerMultimediaFavoritos,
  obtenerMultimediaPorTipo,

  // Multimedia activa
  establecerMultimediaActiva,
  obtenerMultimediaActiva,
  limpiarMultimediaActiva
};