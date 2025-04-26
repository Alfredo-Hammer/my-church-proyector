const { app, BrowserWindow, ipcMain, screen, Menu, dialog } = require("electron");
const path = require("path");
const { agregarHimno, obtenerHimnos, db } = require("./db"); // Asegúrate de que esta ruta esté bien

const Store = require("electron-store").default;

const store = new Store();

let mainWindow;
let proyectorWindow;

// Crear ventana principal
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      webSecurity: false,
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
    width: 800,
    height: 600,
    title: "Gestión de Fondos",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      webSecurity: false,
    },
  });

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
  console.log("📤 Himno recibido para proyectar:", himno);

  if (!proyectorWindow) {
    console.log("🖥️ Creando ventana del proyector...");
    createProyectorWindow();

    proyectorWindow.webContents.on("did-finish-load", () => {
      proyectorWindow.webContents.send("mostrar-himno", himno);
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
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [
      { name: "Imágenes y Videos", extensions: ["jpg", "png", "mp4", "mov", "webm"] },
    ],
  });

  if (canceled) return { filePaths: [] };
  return { filePaths };
});

// Cuando se selecciona un fondo y se envía al proyector
ipcMain.on("fondo-seleccionado", (event, filePath) => {
  if (proyectorWindow) {
    const rutaConProtocolo = `file://${filePath}`;
    proyectorWindow.webContents.send("fondo-seleccionado", rutaConProtocolo);
  }
});

// Gestión de fondos (guardar/leer)
ipcMain.on("abrir-gestion-fondos", () => {
  createGestionFondosWindow();
});

ipcMain.handle("obtener-fondos", () => {
  return store.get("fondos", []);
});

ipcMain.handle("guardar-fondos", (event, fondos) => {
  store.set("fondos", fondos);
});

ipcMain.handle("establecer-fondo-activo", (event, fondo) => {
  store.set("fondoActivo", fondo);
});

ipcMain.handle("obtener-fondo-activo", () => {
  return store.get("fondoActivo", null);
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
