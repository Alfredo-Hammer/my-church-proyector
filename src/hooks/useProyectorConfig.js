import {useCallback, useEffect, useState} from "react";
import {useIpcListener} from "./useIpcListener";

const videosDefecto = ["fondo.mp4", "video1.mp4", "video2.mp4", "video3.mp4"];

const CONFIG_DEFAULTS = {
  nombreIglesia: "Casa de Dios",
  eslogan: "Bienvenidos a la Casa de Dios",
  logoUrl: "/images/icon-256.png",
  logoSize: "w-80 h-80",
  colorPrimario: "#fb923c",
  colorSecundario: "#ffffff",
  fontSize: {titulo: "text-6xl", parrafo: "text-8xl", eslogan: "text-3xl"},
  videosFondo: videosDefecto,
  intervaloCambioVideo: 120,
  mostrarLogo: true,
  mostrarNombreIglesia: true,
  mostrarEslogan: true,
};

function mergeConfig(prev, incoming) {
  return {
    ...prev,
    ...incoming,
    fontSize: {
      ...prev.fontSize,
      ...(incoming.fontSize || {}),
      ...(incoming.fontSizeTitulo  && {titulo:  incoming.fontSizeTitulo}),
      ...(incoming.fontSizeParrafo && {parrafo: incoming.fontSizeParrafo}),
      ...(incoming.fontSizeEslogan && {eslogan: incoming.fontSizeEslogan}),
    },
    videosFondo: incoming.videosFondo || prev.videosFondo,
    intervaloCambioVideo: incoming.intervaloCambioVideo || prev.intervaloCambioVideo,
  };
}

/**
 * Carga la configuración del proyector desde Electron y la mantiene
 * sincronizada via IPC. Reemplaza el polling de 5 segundos.
 */
export function useProyectorConfig() {
  const [configuracion, setConfiguracion] = useState(CONFIG_DEFAULTS);

  const reload = useCallback(async () => {
    try {
      const config = await window.electron?.obtenerConfiguracion?.();
      if (config) setConfiguracion(prev => mergeConfig(prev, config));
    } catch {
      // noop
    }
  }, []);

  // Carga inicial
  useEffect(() => { reload(); }, [reload]);

  // Sincronización en tiempo real via IPC — sin polling
  const handleUpdate = useCallback((_, nuevaConfig) => {
    setConfiguracion(prev => mergeConfig(prev, nuevaConfig));
  }, []);
  useIpcListener("configuracion-actualizada", handleUpdate);

  return {configuracion, reload};
}
