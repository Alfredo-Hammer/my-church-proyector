import {useEffect} from "react";

/**
 * Registra un listener IPC con cleanup automático al desmontar o cuando
 * cambian event/handler. handler debe ser estable (useCallback) para evitar
 * re-registros innecesarios.
 */
export function useIpcListener(event, handler) {
  useEffect(() => {
    window.electron?.on(event, handler);
    return () => window.electron?.removeListener(event, handler);
  }, [event, handler]);
}
