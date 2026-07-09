import {useCallback, useEffect, useRef, useState} from "react";
import {useIpcListener} from "./useIpcListener";

const BASE_URL = "http://localhost:3001";
const videosDefecto = ["fondo.mp4", "video1.mp4", "video2.mp4", "video3.mp4"];

function toAbsoluteUrl(url, tipo) {
  if (!url) return null;
  // Los fondos animados no son un archivo — su url ya es el identificador
  // final ("animado:estrellas"), nunca hay que prefijarla con el servidor.
  if (tipo === "animado") return url;
  return url.startsWith("http") ? url : `${BASE_URL}${url}`;
}

/**
 * Gestiona el sistema de fondos dinámicos con crossfade.
 * - Reemplaza el polling de 3 segundos del código original.
 * - Corrige la race condition del timer de fondoPrevio.
 * - Usa refs para que actualizarFondo sea estable y no cause re-registros de IPC.
 */
export function useBackground({modo, configuracion}) {
  const [fondoActivo,        setFondoActivo]        = useState(null);
  const [fondoActual,        setFondoActual]         = useState("/videos/video1.mp4");
  const [fondoPrevio,        setFondoPrevio]         = useState(null);
  const [usandoFondoDefecto, setUsandoFondoDefecto]  = useState(true);

  const fondoPrevioTimerRef = useRef(null);
  // Refs para que actualizarFondo no se recree en cada cambio de fondo
  const fondoActualRef      = useRef("/videos/video1.mp4");
  const fondoActivoRef      = useRef(null);

  useEffect(() => { fondoActualRef.current = fondoActual; },  [fondoActual]);
  useEffect(() => { fondoActivoRef.current = fondoActivo; },  [fondoActivo]);

  // Ref estable a configuracion.videosFondo para seleccionarVideoDefecto
  const videosFondoRef = useRef(configuracion?.videosFondo);
  useEffect(() => { videosFondoRef.current = configuracion?.videosFondo; }, [configuracion?.videosFondo]);

  const seleccionarVideoDefecto = useCallback(() => {
    const lista = videosFondoRef.current?.length ? videosFondoRef.current : videosDefecto;
    const video = lista[Math.floor(Math.random() * lista.length)];
    setFondoActual(video.startsWith("/") ? video : `/videos/${video}`);
  }, []); // Estable — accede a videosFondoRef en lugar de cierre

  // actualizarFondo es estable: usa refs en lugar de estado en el cierre
  const actualizarFondo = useCallback((nuevoFondo) => {
    if (!nuevoFondo?.url) {
      if (fondoPrevioTimerRef.current) clearTimeout(fondoPrevioTimerRef.current);
      setFondoPrevio(null);
      setFondoActivo(null);
      setUsandoFondoDefecto(true);
      seleccionarVideoDefecto();
      return;
    }

    const url = toAbsoluteUrl(nuevoFondo.url, nuevoFondo.tipo);

    // Guardar fondo actual como capa inferior del crossfade
    const snapshot = {url: fondoActualRef.current, tipo: fondoActivoRef.current?.tipo || "video"};
    setFondoPrevio(prev => prev ?? snapshot);

    setFondoActual(url);
    setFondoActivo({...nuevoFondo, url});
    setUsandoFondoDefecto(false);

    if (fondoPrevioTimerRef.current) clearTimeout(fondoPrevioTimerRef.current);
    fondoPrevioTimerRef.current = setTimeout(() => setFondoPrevio(null), 1400);
  }, [seleccionarVideoDefecto]); // Estable — refs son always-current

  // Cleanup del timer al desmontar
  useEffect(() => () => {
    if (fondoPrevioTimerRef.current) clearTimeout(fondoPrevioTimerRef.current);
  }, []);

  // Carga inicial — se llama solo una vez (deps vacías), sin crear ciclos
  const reload = useCallback(async () => {
    try {
      const fondo = await window.electron?.obtenerFondoActivo?.();
      if (fondo?.url?.trim()) {
        const url = toAbsoluteUrl(fondo.url, fondo.tipo);
        // Carga inicial sin crossfade (setFondoPrevio omitido)
        setFondoActivo({...fondo, url});
        setFondoActual(url);
        setUsandoFondoDefecto(false);
      } else {
        setFondoActivo(null);
        setUsandoFondoDefecto(true);
        seleccionarVideoDefecto();
      }
    } catch {
      setUsandoFondoDefecto(true);
      seleccionarVideoDefecto();
    }
  }, [seleccionarVideoDefecto]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reload(); }, []); // Solo en mount

  // IPC — actualizarFondo es estable, no causa re-registros innecesarios
  const handleActualizar = useCallback((_, fondo) => actualizarFondo(fondo), [actualizarFondo]);
  useIpcListener("actualizar-fondo-activo", handleActualizar);
  useIpcListener("fondo-seleccionado",      handleActualizar);

  // Rotación de video por defecto
  const intervaloCambioRef = useRef(configuracion?.intervaloCambioVideo);
  useEffect(() => { intervaloCambioRef.current = configuracion?.intervaloCambioVideo; }, [configuracion?.intervaloCambioVideo]);

  useEffect(() => {
    if (!usandoFondoDefecto || modo === "multimedia") return;
    const ms = (intervaloCambioRef.current || 120) * 60_000;
    const id = setInterval(seleccionarVideoDefecto, ms);
    return () => clearInterval(id);
  }, [usandoFondoDefecto, modo, seleccionarVideoDefecto]);

  return {fondoActivo, fondoActual, fondoPrevio, usandoFondoDefecto, seleccionarVideoDefecto, reload};
}
