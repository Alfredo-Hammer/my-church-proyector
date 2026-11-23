// "Modo lejos": cuando un texto (versículo) no entra en la pantalla con la
// letra mínima configurada, el PROYECTOR lo divide en partes (ver
// dividirTextoEnPartes en src/utils/pantallaScale.js) y avisa acá cuántas hay.
// El que controla (flechas de Biblia.jsx, app móvil vía Express) pregunta
// primero si hay otra parte antes de pasar al siguiente versículo.
//
// Flujo:
//   proyector  --'proyector-partes' {parte,total}-->  main  --'proyector-partes'-->  ventana principal
//   ventana principal --invoke 'proyector-cambiar-parte' (±1)--> main --'cambiar-parte'--> proyector
const { ipcMain } = require("electron");

let estado = { parte: 1, total: 1 };
let getProyectorWindowRef = () => null;
let getMainWindowRef = () => null;

const vivo = (w) => w && !w.isDestroyed();

function notificarVentanaPrincipal() {
  const mw = getMainWindowRef();
  if (vivo(mw)) mw.webContents.send("proyector-partes", estado);
}

// Al proyectar algo nuevo, se vuelve a 1/1 de inmediato: así una flecha
// presionada antes de que el proyector termine de medir no mueve partes del
// texto anterior. El proyector reporta el valor real enseguida.
function reiniciarPartes() {
  estado = { parte: 1, total: 1 };
  notificarVentanaPrincipal();
}

function obtenerPartes() {
  return { ...estado };
}

// direccion: +1 / -1. Devuelve true si cambió de parte (el que llama NO debe
// pasar al versículo siguiente/anterior), false si ya estaba en el borde.
function cambiarParte(direccion) {
  const d = Number(direccion) > 0 ? 1 : -1;
  const nueva = estado.parte + d;
  if (nueva < 1 || nueva > estado.total) return false;
  const pw = getProyectorWindowRef();
  if (!vivo(pw)) return false;
  estado = { ...estado, parte: nueva }; // optimista; el proyector confirma
  pw.webContents.send("cambiar-parte", d);
  notificarVentanaPrincipal();
  return true;
}

function registrar({ getProyectorWindow, getMainWindow }) {
  getProyectorWindowRef = getProyectorWindow;
  getMainWindowRef = getMainWindow;

  ipcMain.on("proyector-partes", (_event, info) => {
    const total = Math.max(1, Math.floor(Number(info?.total) || 1));
    const parte = Math.min(total, Math.max(1, Math.floor(Number(info?.parte) || 1)));
    estado = { parte, total };
    notificarVentanaPrincipal();
  });

  // removeHandler primero: ipcMain.handle lanza si el canal ya tiene handler.
  ipcMain.removeHandler("proyector-cambiar-parte");
  ipcMain.removeHandler("proyector-obtener-partes");
  ipcMain.handle("proyector-cambiar-parte", (_event, direccion) => cambiarParte(direccion));
  ipcMain.handle("proyector-obtener-partes", () => obtenerPartes());

  // Listeners adicionales (los principales viven en ipc/proyectorControl.js):
  // cualquier proyección nueva o limpieza reinicia el contador.
  ipcMain.on("proyectar-versiculo", reiniciarPartes);
  ipcMain.on("proyectar-himno", reiniciarPartes);
  ipcMain.on("proyector-limpiar", reiniciarPartes);
}

module.exports = { registrar, cambiarParte, obtenerPartes, reiniciarPartes };
