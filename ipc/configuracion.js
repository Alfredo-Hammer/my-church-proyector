const { ipcMain, BrowserWindow } = require("electron");
const {
  obtenerConfiguracion,
  actualizarConfiguracion,
  restaurarConfiguracionDefecto,
} = require("../db");

function registrar() {
  ipcMain.handle('obtener-configuracion', async () => {
    try {
      console.log("🔍 [Main] Obteniendo configuración...");
      const config = {};

      // Obtener todas las configuraciones disponibles
      const claves = [
        'nombreIglesia', 'eslogan', 'pastor', 'telefono', 'email',
        'direccion', 'sitioWeb', 'horarioCultos', 'logoUrl',
        'colorPrimario', 'colorSecundario',
        // Claves de fontSize
        'fontSizeTitulo', 'fontSizeParrafo', 'fontSizeEslogan',
        // Claves de visibilidad
        'mostrarLogo', 'mostrarNombreIglesia', 'mostrarEslogan',
        // Plantillas GSAP
        'plantillaGsapActiva', 'plantillaGsapColor1', 'plantillaGsapColor2',
        'plantillaGsapColorAcc', 'plantillaGsapVelocidad',
      ];

      for (const clave of claves) {
        const valor = await obtenerConfiguracion(clave);
        if (valor !== null) {
          // ✨ Convertir valores booleanos
          if (valor === 'true' || valor === 'false') {
            config[clave] = valor === 'true';
          } else {
            config[clave] = valor;
          }
        }
      }

      console.log("📋 [Main] Configuración obtenida:", config);
      return config;
    } catch (error) {
      console.error('❌ [Main] Error obteniendo configuración:', error);
      return null;
    }
  });

  ipcMain.handle('guardar-configuracion', async (event, configuracion) => {
    try {
      console.log("💾 [Main] Guardando configuración:", configuracion);
      let resultado = true;

      for (const [clave, valor] of Object.entries(configuracion)) {
        const success = await actualizarConfiguracion(clave, valor);
        if (!success) {
          resultado = false;
        }
      }

      if (resultado) {
        const todasLasVentanas = BrowserWindow.getAllWindows();
        todasLasVentanas.forEach(ventana => {
          if (!ventana.isDestroyed()) {
            console.log("📡 [Main] Notificando configuración actualizada");
            ventana.webContents.send("configuracion-actualizada", configuracion);
          }
        });
      }

      console.log("✅ [Main] Resultado guardado:", resultado);
      return resultado;
    } catch (error) {
      console.error('❌ [Main] Error guardando configuración:', error);
      return false;
    }
  });

  ipcMain.handle('restaurar-configuracion-defecto', async () => {
    try {
      console.log("🔄 [Main] Restaurando configuración por defecto...");
      // Usar la nueva función que limpia y restaura los valores
      const resultado = await restaurarConfiguracionDefecto();

      if (resultado) {
        console.log("✅ [Main] Configuración restaurada exitosamente");

        // Notificar a todas las ventanas sobre la restauración
        const todasLasVentanas = BrowserWindow.getAllWindows();
        todasLasVentanas.forEach(ventana => {
          if (!ventana.isDestroyed()) {
            console.log("📡 [Main] Notificando configuración restaurada");
            ventana.webContents.send("configuracion-actualizada", {});
          }
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ [Main] Error restaurando configuración:', error);
      return false;
    }
  });

  ipcMain.handle('obtener-configuracion-clave', async (event, clave) => {
    try {
      console.log(`🔍 [Main] Obteniendo configuración por clave: ${clave}`);
      const valor = await obtenerConfiguracion(clave);
      console.log(`📋 [Main] Valor obtenido para ${clave}:`, valor);
      return valor;
    } catch (error) {
      console.error('❌ [Main] Error obteniendo configuración por clave:', error);
      return null;
    }
  });

  ipcMain.handle('actualizar-configuracion-clave', async (event, clave, valor) => {
    try {
      console.log(`💾 [Main] Actualizando ${clave} con valor:`, valor);
      const resultado = await actualizarConfiguracion(clave, valor);
      console.log(`✅ [Main] Resultado actualización ${clave}:`, resultado);
      return resultado;
    } catch (error) {
      console.error('❌ [Main] Error actualizando configuración:', error);
      return false;
    }
  });
}

module.exports = { registrar };
