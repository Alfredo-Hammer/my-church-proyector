const { ipcMain } = require("electron");
const {
  crearHimno,
  obtenerHimnos,
  obtenerHimnoPorId,
  actualizarHimno,
  eliminarHimno,
} = require("../db");

function registrar() {
  ipcMain.handle("agregar-himno", async (event, nuevoHimno) => {
    try {
      const { numero, titulo, letra, favorito, fuente } = nuevoHimno;
      const id = await crearHimno({
        numero,
        titulo,
        letra: JSON.stringify(letra),
        favorito: favorito ? 1 : 0,
        fuente: fuente || 'personal',
      });
      return { success: true, id };
    } catch (error) {
      console.error("Error en agregar-himno:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("obtener-himnos", async () => {
    try {
      const himnos = await obtenerHimnos();
      return himnos.map(himno => ({
        ...himno,
        letra: JSON.parse(himno.letra || '[]'),
        favorito: Boolean(himno.favorito)
      }));
    } catch (error) {
      console.error("Error al obtener los himnos:", error);
      throw error;
    }
  });

  ipcMain.handle("obtener-himno-por-id", async (event, id) => {
    try {
      const himno = await obtenerHimnoPorId(id);
      if (!himno) {
        throw new Error("Himno no encontrado");
      }
      return {
        ...himno,
        letra: JSON.parse(himno.letra || '[]'),
        favorito: Boolean(himno.favorito)
      };
    } catch (error) {
      console.error("Error al obtener el himno:", error);
      throw error;
    }
  });

  ipcMain.handle("actualizar-himno", async (event, himno) => {
    try {
      const { id, numero, titulo, letra, fuente } = himno;
      const success = await actualizarHimno(id, {
        numero,
        titulo,
        letra: JSON.stringify(letra),
        favorito: himno.favorito ? 1 : 0,
        fuente: fuente || 'personal',
      });
      return { success };
    } catch (error) {
      console.error("Error al actualizar el himno:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("eliminar-himno", async (event, id) => {
    try {
      const success = await eliminarHimno(id);
      return { success };
    } catch (error) {
      console.error("Error al eliminar el himno:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("obtener-favoritos", async () => {
    try {
      const himnos = await obtenerHimnos();
      const favoritos = himnos.filter(himno => himno.favorito);
      return favoritos.map(himno => ({
        ...himno,
        letra: JSON.parse(himno.letra || '[]'),
        favorito: Boolean(himno.favorito)
      }));
    } catch (error) {
      console.error("Error al obtener favoritos:", error);
      throw error;
    }
  });

  ipcMain.handle("marcar-favorito", async (event, { id, favorito }) => {
    try {
      const himno = await obtenerHimnoPorId(id);
      if (!himno) {
        throw new Error("Himno no encontrado");
      }

      const success = await actualizarHimno(id, {
        ...himno,
        favorito: favorito ? 1 : 0
      });
      return success;
    } catch (error) {
      console.error("Error al marcar favorito:", error);
      throw error;
    }
  });

  ipcMain.handle("eliminar-favorito", async (event, id) => {
    try {
      const himno = await obtenerHimnoPorId(id);
      if (!himno) {
        throw new Error("Himno no encontrado");
      }

      const success = await actualizarHimno(id, {
        ...himno,
        favorito: 0
      });
      console.log(`Himno con ID ${id} marcado como no favorito.`);
      return success;
    } catch (error) {
      console.error("Error al marcar el himno como no favorito:", error);
      throw error;
    }
  });
}

module.exports = { registrar };
