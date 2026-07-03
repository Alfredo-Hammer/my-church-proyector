import {useCallback, useEffect, useState} from "react";
import {useIpcListener} from "./useIpcListener";

const videosDefecto = ["fondo.mp4", "video1.mp4", "video2.mp4", "video3.mp4"];

const CONFIG_DEFAULTS = {
  nombreIglesia: "Casa de Dios",
  eslogan: "Bienvenidos a la Casa de Dios",
  logoUrl: "/images/icon-256.png",
  logoSize: "size-80",
  colorPrimario: "#fb923c",
  colorSecundario: "#ffffff",
  fontSize: {titulo: "text-6xl", parrafo: "text-9xl", eslogan: "text-3xl"},
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

const CACHE_KEY = "proyector-config-cache:v2";

function loadCachedConfig() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveConfigCache(config) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(config));
  } catch {}
}

/**
 * Carga la configuración del proyector desde Electron y la mantiene
 * sincronizada via IPC. El caché en localStorage elimina el flash de
 * tamaño incorrecto en el primer párrafo cuando el IPC aún no respondió.
 *
 * Solo reload() guarda en caché porque recibe la config COMPLETA.
 * handleUpdate solo actualiza el estado en memoria (la config del IPC es parcial).
 */
export function useProyectorConfig() {
  const [configuracion, setConfiguracion] = useState(() => {
    const cached = loadCachedConfig();
    return cached ? mergeConfig(CONFIG_DEFAULTS, cached) : CONFIG_DEFAULTS;
  });

  const reload = useCallback(async () => {
    try {
      const config = await window.electron?.obtenerConfiguracion?.();
      if (config) {
        saveConfigCache(config);
        setConfiguracion(prev => mergeConfig(prev, config));
      }
    } catch {
      // noop
    }
  }, []);

  // Carga inicial
  useEffect(() => { reload(); }, [reload]);

  // Sincronización en tiempo real via IPC — sin polling.
  // nuevaConfig es PARCIAL (solo los campos que cambiaron), por eso
  // NO se guarda en caché aquí; solo se actualiza el estado en memoria.
  const handleUpdate = useCallback((_, nuevaConfig) => {
    setConfiguracion(prev => mergeConfig(prev, nuevaConfig));
  }, []);
  useIpcListener("configuracion-actualizada", handleUpdate);

  return {configuracion, reload};
}
