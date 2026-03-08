// Silencia logs verbosos (console.log/info/debug) en el renderer.
// Mantiene console.warn/error activos.
// Para reactivarlos:
// - REACT_APP_DEBUG_LOGS=1 (variables de entorno del build)
// - o localStorage.setItem('DEBUG_LOGS', '1')

export function setupConsoleSilencer() {
  try {
    const envEnabled =
      typeof process !== "undefined" &&
      process?.env?.REACT_APP_DEBUG_LOGS === "1";

    const storageEnabled = (() => {
      try {
        return (
          typeof window !== "undefined" &&
          window?.localStorage?.getItem("DEBUG_LOGS") === "1"
        );
      } catch {
        return false;
      }
    })();

    const enabled = envEnabled || storageEnabled;
    if (enabled) return;

    // Guardar originales por si se quiere restaurar manualmente desde DevTools
    if (!console.__originals__) {
      Object.defineProperty(console, "__originals__", {
        value: {
          log: console.log?.bind(console),
          info: console.info?.bind(console),
          debug: console.debug?.bind(console),
        },
        enumerable: false,
        configurable: true,
        writable: false,
      });
    }

    console.log = () => { };
    console.info = () => { };
    console.debug = () => { };
  } catch {
    // no-op
  }
}
