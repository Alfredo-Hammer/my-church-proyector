// Pruebas del proceso principal (db.js, datos de la Biblia).
// Corren con el Node de Electron (ELECTRON_RUN_AS_NODE=1) porque better-sqlite3
// está compilado para Electron. Usar: npm run test:main
const fs = require("fs");
const os = require("os");
const path = require("path");

// Base de datos temporal: nunca tocar data/himnos.db del proyecto.
process.env.GLORYVIEW_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "gloryview-test-"));

const filtro = process.argv[2];
for (const f of fs.readdirSync(__dirname).sort()) {
  if (f.endsWith(".test.js") && (!filtro || f.includes(filtro))) require(path.join(__dirname, f));
}
