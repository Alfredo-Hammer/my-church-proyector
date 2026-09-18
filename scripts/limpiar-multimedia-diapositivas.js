// Elimina de la tabla `multimedia` las filas que en realidad son imágenes
// de Diapositivas (quedaron ahí por un bug ya corregido que reusaba el
// pipeline de subida de Multimedia). No borra ningún archivo del disco,
// solo la fila de la base de datos — Diapositivas sigue usando el archivo
// normalmente porque guarda la URL directamente, no una referencia a esta
// tabla.
//
// Uso:
//   node scripts/limpiar-multimedia-diapositivas.js           -> solo muestra qué borraría
//   node scripts/limpiar-multimedia-diapositivas.js --borrar  -> borra de verdad

const path = require('path');
const os = require('os');
const fs = require('fs');
const Database = require('better-sqlite3');

const candidatos = [
  path.join(os.homedir(), 'Library', 'Application Support', 'GloryView', 'data', 'himnos.db'),
  path.join(__dirname, '..', 'data', 'himnos.db'), // fallback: base de datos en modo desarrollo
];

const dbPath = candidatos.find((p) => fs.existsSync(p));
if (!dbPath) {
  console.error('No encontré la base de datos en ninguna de estas rutas:');
  candidatos.forEach((p) => console.error('  -', p));
  console.error('Si tu base de datos está en otro lado, editá la lista `candidatos` en este script.');
  process.exit(1);
}

console.log('Usando base de datos:', dbPath);

const db = new Database(dbPath);
const borrarDeVerdad = process.argv.includes('--borrar');

const presentaciones = db.prepare('SELECT imagenes FROM diapositivas').all();
const urlsDiapositivas = new Set();
for (const p of presentaciones) {
  try {
    const imagenes = JSON.parse(p.imagenes || '[]');
    for (const img of imagenes) {
      if (img?.url) urlsDiapositivas.add(img.url);
    }
  } catch { /* fila corrupta, se ignora */ }
}

console.log(`Diapositivas: ${presentaciones.length} presentaciones, ${urlsDiapositivas.size} imágenes únicas referenciadas.`);

if (urlsDiapositivas.size === 0) {
  console.log('No hay nada que limpiar.');
  process.exit(0);
}

const placeholders = Array.from(urlsDiapositivas).map(() => '?').join(',');
const filas = db.prepare(`SELECT id, nombre, url FROM multimedia WHERE url IN (${placeholders})`).all(...urlsDiapositivas);

console.log(`\nEncontradas ${filas.length} filas en "multimedia" que en realidad son de Diapositivas:`);
filas.forEach((f) => console.log(`  #${f.id}  ${f.nombre}  (${f.url})`));

if (filas.length === 0) {
  console.log('\nNada para borrar — ya está limpio.');
  process.exit(0);
}

if (!borrarDeVerdad) {
  console.log(`\nEsto fue solo una vista previa. Para borrar de verdad, corré:`);
  console.log(`  node scripts/limpiar-multimedia-diapositivas.js --borrar`);
} else {
  const ids = filas.map((f) => f.id);
  const del = db.prepare(`DELETE FROM multimedia WHERE id IN (${ids.map(() => '?').join(',')})`);
  const info = del.run(...ids);
  console.log(`\nBorradas ${info.changes} filas de "multimedia". Los archivos en disco NO se tocaron.`);
}

db.close();
