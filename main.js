const { app, BrowserWindow, ipcMain, screen, Menu, dialog } = require("electron");
const { parseBibFile } = require("./src/utils/bibliaParser.jsx"); // Asegúrate de que esta ruta esté bien
const path = require("path");
const fs = require("fs");
const { agregarHimno, obtenerHimnos, db,
  obtenerFondos,
  agregarFondo,
  eliminarFondo,
  establecerFondoActivo,
  obtenerFondoActivo,
} = require("./db");

// Crear la carpeta 'assets/fondos' si no existe
const carpetaFondos = path.join(__dirname, "assets", "fondos");
if (!fs.existsSync(carpetaFondos)) {
  fs.mkdirSync(carpetaFondos, { recursive: true });
}

let mainWindow;
let proyectorWindow;

// Crear ventana principal
function createMainWindow() {
  mainWindow = new BrowserWindow({
    fullscreenable: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true, // Asegúrate de que esté habilitado
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL("http://localhost:3000");

  const menuTemplate = [
    {
      label: "Archivo",
      submenu: [
        {
          label: "Crear Fondo",
          click: () => {
            createGestionFondosWindow();
          },
        },
        { role: "quit" },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
}

// Crear ventana del proyector (segunda pantalla)
function createProyectorWindow() {
  const displays = screen.getAllDisplays();
  const externalDisplay = displays.find((d) => d.bounds.x !== 0 || d.bounds.y !== 0);

  if (!externalDisplay) {
    console.log("⚠️ No se encontró una segunda pantalla.");
    return null;
  }

  proyectorWindow = new BrowserWindow({
    x: externalDisplay.bounds.x,
    y: externalDisplay.bounds.y,
    fullscreen: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      webSecurity: false,
      contextIsolation: true,
    },
  });

  proyectorWindow.setMenuBarVisibility(false);
  proyectorWindow.loadURL("http://localhost:3000/proyector");

  proyectorWindow.on("closed", () => {
    proyectorWindow = null;
  });

  return proyectorWindow;
}


// Ventana de gestión de fondos
function createGestionFondosWindow() {
  const gestionFondosWindow = new BrowserWindow({
    width: 1000, // Cambié el ancho para que sea más razonable
    height: 600,
    title: "Fondos", // Cambiar el título de la ventana
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      webSecurity: false,
    },

  });

  gestionFondosWindow.setMenuBarVisibility(false); // Ocultar el menú de la ventana
  gestionFondosWindow.loadURL("http://localhost:3000/gestion-fondos");

  gestionFondosWindow.on("closed", () => {
    console.log("Ventana de gestión de fondos cerrada.");
  });

  return gestionFondosWindow;
}

// --- App Ready ---
app.whenReady().then(() => {
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

// Salir en plataformas que no son Mac
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// --- IPC COMUNICACIÓN ---

// Proyectar himno
ipcMain.on("proyectar-himno", (event, himno) => {

  if (!proyectorWindow) {
    const nuevaVentana = createProyectorWindow();
    if (!nuevaVentana) return; // ⚠️ Si no hay segunda pantalla, salir

    nuevaVentana.webContents.on("did-finish-load", () => {
      nuevaVentana.webContents.send("mostrar-himno", himno);
    });
  } else {
    proyectorWindow.webContents.send("mostrar-himno", himno);
  }
});

// Cerrar el proyector
ipcMain.on("cerrar-proyector", () => {
  if (proyectorWindow) {
    proyectorWindow.close();
    proyectorWindow = null;
  }
});

// Abrir el proyector manualmente
ipcMain.on("abrir-proyector", () => {
  if (!proyectorWindow) {
    createProyectorWindow();
  }
});

// Seleccionar fondo multimedia (imagen o video)
ipcMain.handle("seleccionar-fondo", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [
      {
        name: "Medios compatibles",
        extensions: ["jpg", "jpeg", "png", "gif", "mp4", "webm"],
      },
    ],
    // filters: [
    //   { name: "Imágenes y Videos", extensions: ["jpg", "jpeg", "png", "gif", "mp4", "webm"] },
    // ],
  });

  if (result.canceled) {
    return null;
  }

  const filePath = result.filePaths[0];
  const extension = path.extname(filePath).toLowerCase();

  let tipo = "imagen"; // Default
  if ([".mp4", ".webm"].includes(extension)) {
    tipo = "video";
  }

  return { filePath, tipo }; // ⬅️ Devolver también el tipo
});

// Cuando se selecciona un fondo y se envía al proyector
ipcMain.on("fondo-seleccionado", (event, { filePath, tipo }) => {
  if (proyectorWindow) {
    const rutaConProtocolo = `file://${filePath}`;
    proyectorWindow.webContents.send("fondo-seleccionado", { ruta: rutaConProtocolo, tipo });
  }
});

// Gestión de fondos (guardar/leer)
ipcMain.handle("obtener-fondos", async () => {
  return obtenerFondos();
});

ipcMain.handle("agregar-fondo", async (event, { url, tipo }) => {


  try {

    // Verificar si la carpeta 'assets/fondos' existe
    const carpetaFondos = path.join(__dirname, "assets", "fondos");
    if (!fs.existsSync(carpetaFondos)) {
      fs.mkdirSync(carpetaFondos, { recursive: true });
    }

    // Copiar el archivo a la carpeta 'assets/fondos'
    const nombreArchivo = path.basename(url);
    const destino = path.join(__dirname, "assets", "fondos", nombreArchivo);
    fs.copyFileSync(url, destino);

    // Convertir la ruta a una URL válida
    const rutaConProtocolo = `file://${destino.replace(/\\/g, "/")}`;

    // Guardar la ruta modificada en la base de datos
    agregarFondo(rutaConProtocolo, tipo);
    console.log("Fondo agregado:", { url: rutaConProtocolo, tipo });
  } catch (error) {
    console.error("Error al agregar fondo:", error);
  }
});

ipcMain.handle("eliminar-fondo", async (event, id) => {
  eliminarFondo(id);
});

ipcMain.handle("establecer-fondo-activo", async (event, id) => {
  establecerFondoActivo(id);
});

ipcMain.handle("obtener-fondo-activo", async () => {
  return obtenerFondoActivo();
});

ipcMain.on("fondo-activo-cambiado", (event, fondo) => {
  console.log("Reenviando fondo activo al proyector:", fondo); // Agregar mensaje de consola
  if (proyectorWindow) {
    proyectorWindow.webContents.send("actualizar-fondo-activo", fondo);
  } else {
    console.error("La ventana del proyector no está disponible.");
  }
});

// 🧠 Handler para agregar himnos desde React
ipcMain.handle("agregar-himno", async (event, nuevoHimno) => {
  try {
    const { numero, titulo, letra, favorito } = nuevoHimno;
    agregarHimno(numero, titulo, letra, favorito);
    return { success: true };
  } catch (error) {
    console.error("Error en agregar-himno:", error);
    return { success: false, error: error.message };
  }
});

// 🧠 Handler para obtener himnos desde Reac
ipcMain.handle("obtener-himnos", async () => {
  try {
    return obtenerHimnos();
  } catch (error) {
    console.error("Error al obtener los himnos:", error);
    throw error;
  }
});

ipcMain.handle("obtener-himno-por-id", async (event, id) => {
  try {
    const himno = db.prepare("SELECT * FROM himnos WHERE id = ?").get(id);
    if (!himno) {
      throw new Error("Himno no encontrado");
    }
    return {
      ...himno,
      letra: JSON.parse(himno.letra),
    };
  } catch (error) {
    console.error("Error al obtener el himno:", error);
    throw error;
  }
});

// 🧠 Handler para actualizar un himno desde React
ipcMain.handle("actualizar-himno", async (event, himno) => {
  try {
    const { id, numero, titulo, letra } = himno;
    db.prepare("UPDATE himnos SET numero = ?, titulo = ?, letra = ? WHERE id = ?").run(
      numero,
      titulo,
      JSON.stringify(letra),
      id
    );
    return { success: true };
  } catch (error) {
    console.error("Error al actualizar el himno:", error);
    return { success: false, error: error.message };
  }
});

// 🧠 Handler para eliminar un himno desde React
ipcMain.handle("eliminar-himno", async (event, id) => {
  try {
    db.prepare("DELETE FROM himnos WHERE id = ?").run(id);
    return { success: true };
  } catch (error) {
    console.error("Error al eliminar el himno:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("obtener-favoritos", async () => {
  try {
    const stmt = db.prepare("SELECT * FROM himnos WHERE favorito = 1 ORDER BY numero");
    const rows = stmt.all(); // Usar .all() para obtener múltiples filas
    return rows.map((row) => ({
      ...row,
      letra: JSON.parse(row.letra),
      favorito: Boolean(row.favorito),
    }));
  } catch (error) {
    console.error("Error al obtener favoritos:", error);
    throw error;
  }
});

ipcMain.handle("marcar-favorito", async (event, { id, favorito }) => {
  try {
    const stmt = db.prepare("UPDATE himnos SET favorito = ? WHERE id = ?");
    stmt.run(favorito ? 1 : 0, id); // Actualizar el campo favorito
    return true;
  } catch (error) {
    console.error("Error al marcar favorito:", error);
    throw error;
  }
});

// Eliminar favorito
ipcMain.handle("eliminar-favorito", async (event, id) => {
  try {
    const stmt = db.prepare("UPDATE himnos SET favorito = 0 WHERE id = ?");
    stmt.run(id);
    console.log(`Himno con ID ${id} marcado como no favorito.`);
  } catch (error) {
    console.error("Error al marcar el himno como no favorito:", error);
    throw error;
  }
});

//Mostrar versículo
ipcMain.on("proyectar-versiculo", (event, versiculo) => {
  if (proyectorWindow) {
    proyectorWindow.webContents.send("mostrar-versiculo", versiculo);
  } else {
    console.error("No se encontró la ventana del proyector.");
  }
});
