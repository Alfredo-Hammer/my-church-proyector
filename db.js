const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

// Ruta y verificación de carpeta
const dataDir = path.join(__dirname, "data");
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

// Verificar si la tabla 'fondos' existe
const tablaFondosExiste = db.prepare(`
  SELECT name FROM sqlite_master WHERE type='table' AND name='fondos';
`).get();

if (!tablaFondosExiste) {
  console.log("Creando la tabla 'fondos'...");
  // Crear la tabla 'fondos' si no existe
  db.prepare(`
    CREATE TABLE fondos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      tipo TEXT NOT NULL,  -- 'imagen' o 'video'
      activo INTEGER DEFAULT 0
    )
  `).run();
} else {
  try {
    // Verificar si la columna 'tipo' existe
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
  // Asegurarse de que no esté ya marcado como favorito
  const stmt = db.prepare("UPDATE himnos SET favorito = 1 WHERE id = ? AND favorito = 0");
  stmt.run(id);
}

// Marcar o desmarcar como favorito
function actualizarFavorito(id, favorito) {
  const stmt = db.prepare("UPDATE himnos SET favorito = ? WHERE id = ?");
  stmt.run(favorito ? 1 : 0, id);
  console.log(stmt.get(id));

}

//Eliminar himno por ID de favoritos
function eliminarFavorito(id) {
  const stmt = db.prepare("DELETE FROM himnos WHERE id = ?");
  stmt.run(id);
}

// Obtener todos los fondos
function obtenerFondos() {
  const stmt = db.prepare("SELECT * FROM fondos");
  return stmt.all();
}

// Agregar un nuevo fondo
function agregarFondo(url, tipo) {
  const stmt = db.prepare("INSERT INTO fondos (url, tipo) VALUES (?, ?)");
  stmt.run(url, tipo);
}

// Eliminar un fondo por ID
function eliminarFondo(id) {
  const stmt = db.prepare("DELETE FROM fondos WHERE id = ?");
  stmt.run(id);
}

// Establecer un fondo como activo
function establecerFondoActivo(id) {
  // Primero desactivar todos los fondos
  db.prepare("UPDATE fondos SET activo = 0").run();
  // Luego activar el fondo seleccionado
  const stmt = db.prepare("UPDATE fondos SET activo = 1 WHERE id = ?");
  stmt.run(id);
}

// Obtener el fondo activo
function obtenerFondoActivo() {
  const stmt = db.prepare("SELECT * FROM fondos WHERE activo = 1");
  return stmt.get();
}

module.exports = {
  db,
  agregarHimno,
  obtenerHimnos,
  obtenerFavoritos,
  actualizarHimno,
  eliminarHimno,
  agregarFavorito,
  actualizarFavorito,
  eliminarFavorito,
  obtenerFondos,
  agregarFondo,
  eliminarFondo,
  establecerFondoActivo,
  obtenerFondoActivo,
};
