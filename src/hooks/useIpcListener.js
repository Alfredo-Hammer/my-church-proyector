import {useEffect} from "react";

/**
 * Registra un listener IPC con cleanup automático al desmontar o cuando
 * cambian event/handler. handler debe ser estable (useCallback) para evitar
 * re-registros innecesarios.
 *
 * Usa la función de desuscripción que devuelve window.electron.on():
 * removeListener no sirve a través de contextBridge (ver preload.js).
 */
export function useIpcListener(event, handler) {
  useEffect(() => {
    const off = window.electron?.on(event, handler);
    return () => {
      if (typeof off === "function") off();
      else window.electron?.removeListener?.(event, handler);
    };
  }, [event, handler]);
}
