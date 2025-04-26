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

// Crear tabla si no existe
db.prepare(`
  CREATE TABLE IF NOT EXISTS himnos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero TEXT,
    titulo TEXT,
    letra TEXT,
    favorito INTEGER DEFAULT 0
  )
`).run();

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

// Marcar o desmarcar como favorito
function actualizarFavorito(id, favorito) {
  const stmt = db.prepare("UPDATE himnos SET favorito = ? WHERE id = ?");
  stmt.run(favorito ? 1 : 0, id);
}

module.exports = {
  db,
  agregarHimno,
  obtenerHimnos,
  actualizarHimno,
  eliminarHimno,
  actualizarFavorito,
};
