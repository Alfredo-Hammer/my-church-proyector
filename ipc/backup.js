const {ipcMain, dialog, app} = require("electron");
const fs = require("fs");
const path = require("path");
const JSZip = require("jszip");

const VERSION_MANIFEST = 1;

// Agrega recursivamente una carpeta real del disco a una ruta dentro del zip,
// streameando cada archivo (no carga todo en memoria de una vez).
function agregarDirectorioAlZip(zip, carpetaReal, carpetaZip) {
  if (!fs.existsSync(carpetaReal)) return;
  const entradas = fs.readdirSync(carpetaReal, {withFileTypes: true});
  for (const entrada of entradas) {
    const rutaReal = path.join(carpetaReal, entrada.name);
    const rutaZip = `${carpetaZip}/${entrada.name}`;
    if (entrada.isDirectory()) {
      agregarDirectorioAlZip(zip, rutaReal, rutaZip);
    } else if (entrada.isFile()) {
      zip.file(rutaZip, fs.createReadStream(rutaReal));
    }
  }
}

// Extrae todo lo que esté bajo "prefijoZip/" hacia carpetaDestino. Sobrescribe
// archivos existentes con el mismo nombre pero no borra los que no estén en
// el respaldo — restaurar no debería destruir fondos/logos agregados después.
async function extraerDirectorioDelZip(zip, prefijoZip, carpetaDestino) {
  const entradas = Object.keys(zip.files).filter(
    (nombre) => nombre.startsWith(`${prefijoZip}/`) && !zip.files[nombre].dir,
  );
  for (const nombre of entradas) {
    const relativo = nombre.slice(prefijoZip.length + 1);
    if (!relativo) continue;
    const destino = path.join(carpetaDestino, relativo);
    fs.mkdirSync(path.dirname(destino), {recursive: true});
    const contenido = await zip.files[nombre].async("nodebuffer");
    fs.writeFileSync(destino, contenido);
  }
}

function registrar({writeLog, obtenerRutaBase, getMainWindow, getProyectorWindow, dbPath, cerrarDB, reabrirDB}) {
  ipcMain.handle("exportar-respaldo", async (_event, opciones = {}) => {
    try {
      const incluirMultimedia = !!opciones?.incluirMultimedia;
      const ventana = getMainWindow?.();
      const fecha = new Date().toISOString().slice(0, 10);

      const {canceled, filePath} = await dialog.showSaveDialog(ventana, {
        title: "Guardar respaldo de GloryView",
        defaultPath: `GloryView-Respaldo-${fecha}.zip`,
        filters: [{name: "Respaldo de GloryView", extensions: ["zip"]}],
      });
      if (canceled || !filePath) return {ok: false, cancelado: true};

      const rutaBase = obtenerRutaBase();
      const fondosDir = path.join(rutaBase, "public", "fondos");
      const uploadsDir = path.join(rutaBase, "public", "uploads");
      const multimediaDir = path.join(rutaBase, "public", "multimedia");

      const zip = new JSZip();
      zip.file(
        "manifest.json",
        JSON.stringify(
          {
            version: VERSION_MANIFEST,
            fecha: new Date().toISOString(),
            appVersion: app.getVersion(),
            incluyeMultimedia: incluirMultimedia,
          },
          null,
          2,
        ),
      );

      if (fs.existsSync(dbPath)) {
        zip.file("himnos.db", fs.createReadStream(dbPath));
      }
      agregarDirectorioAlZip(zip, fondosDir, "fondos");
      agregarDirectorioAlZip(zip, uploadsDir, "uploads");
      if (incluirMultimedia) {
        agregarDirectorioAlZip(zip, multimediaDir, "multimedia");
      }

      await new Promise((resolve, reject) => {
        zip
          .generateNodeStream({type: "nodebuffer", streamFiles: true, compression: "DEFLATE"})
          .pipe(fs.createWriteStream(filePath))
          .on("finish", resolve)
          .on("error", reject);
      });

      const {size} = fs.statSync(filePath);
      writeLog?.(`✅ [Backup] Respaldo exportado a: ${filePath} (${(size / 1024 / 1024).toFixed(1)} MB)`);
      return {ok: true, path: filePath, size};
    } catch (error) {
      console.error("❌ [Backup] Error exportando respaldo:", error);
      writeLog?.(`❌ [Backup] Error exportando respaldo: ${error.message}`);
      return {ok: false, error: error.message};
    }
  });

  ipcMain.handle("restaurar-respaldo", async () => {
    try {
      const ventana = getMainWindow?.();
      const {canceled, filePaths} = await dialog.showOpenDialog(ventana, {
        title: "Elegir archivo de respaldo",
        filters: [{name: "Respaldo de GloryView", extensions: ["zip"]}],
        properties: ["openFile"],
      });
      if (canceled || !filePaths?.[0]) return {ok: false, cancelado: true};

      const buffer = fs.readFileSync(filePaths[0]);
      const zip = await JSZip.loadAsync(buffer);

      const manifestEntry = zip.file("manifest.json");
      const dbEntry = zip.file("himnos.db");
      if (!manifestEntry || !dbEntry) {
        return {ok: false, error: "El archivo elegido no es un respaldo válido de GloryView."};
      }
      const manifest = JSON.parse(await manifestEntry.async("string"));

      // Extraer TODO lo demás (fondos/uploads/multimedia) ANTES de tocar la
      // base de datos — descomprimir puede tardar varios segundos si hay
      // archivos grandes (fondos animados en video), y mientras tanto el
      // resto de la app sigue corriendo con normalidad y puede seguir
      // consultando la configuración. Si cerráramos la DB antes de esta
      // parte lenta, cualquier consulta normal que ocurra en el medio
      // fallaría con "the database connection is not open".
      const rutaBase = obtenerRutaBase();
      await extraerDirectorioDelZip(zip, "fondos", path.join(rutaBase, "public", "fondos"));
      await extraerDirectorioDelZip(zip, "uploads", path.join(rutaBase, "public", "uploads"));
      if (manifest.incluyeMultimedia) {
        await extraerDirectorioDelZip(zip, "multimedia", path.join(rutaBase, "public", "multimedia"));
      }
      const dbBuffer = await dbEntry.async("nodebuffer");

      // Ahora sí, la única parte que de verdad necesita la DB cerrada: cerrar,
      // sobrescribir el archivo y reabrir. Es prácticamente instantáneo, así
      // que la ventana en la que la conexión no existe es mínima.
      cerrarDB?.();
      fs.mkdirSync(path.dirname(dbPath), {recursive: true});
      fs.writeFileSync(dbPath, dbBuffer);
      reabrirDB?.();

      // Reabrir contra el archivo restaurado en vez de reiniciar toda la app
      // con app.relaunch() — en pruebas ese mecanismo resultó poco confiable
      // (no siempre remata el proceso viejo). Recargar los webContents ya es
      // el patrón que usa el resto de la app para forzar que tomen datos
      // nuevos (ver nota de "F5 o Cmd+R" del proyector en modo desarrollo).

      const ventanaControl = getMainWindow?.();
      if (ventanaControl && !ventanaControl.isDestroyed()) ventanaControl.webContents.reload();
      const ventanaProyector = getProyectorWindow?.();
      if (ventanaProyector && !ventanaProyector.isDestroyed()) ventanaProyector.webContents.reload();

      writeLog?.(`✅ [Backup] Respaldo restaurado desde: ${filePaths[0]}`);

      return {ok: true, manifest};
    } catch (error) {
      console.error("❌ [Backup] Error restaurando respaldo:", error);
      writeLog?.(`❌ [Backup] Error restaurando respaldo: ${error.message}`);
      return {ok: false, error: error.message};
    }
  });
}

module.exports = {registrar};
