// Versión de la Biblia elegida en la app (Biblia → selector de versión).
// - rv1960: public/data/biblia; rv1909 (dominio público): public/data/biblia_rv1909.
//   Una sola copia de cada una, compartida con el servidor de la app móvil; la pantalla
//   pide cada libro al propio servidor al abrirlo (src/utils/cargarLibro.js).
// La elección se guarda en localStorage (para leerla al instante) y en la
// configuración (`bibliaVersion`) para que el servidor la use con la app móvil.

export const VERSIONES_BIBLIA = [
  {id: "rv1960", nombre: "Reina-Valera 1960", corto: "RVR60"},
  {id: "rv1909", nombre: "Reina-Valera 1909", corto: "RV1909"},
];

const CLAVE = "biblia-version:v1";
const EVENTO = "biblia-version-cambiada";

export function versionValida(v) {
  return VERSIONES_BIBLIA.some((x) => x.id === v) ? v : "rv1960";
}

export function obtenerVersionBiblia() {
  try {
    return versionValida(localStorage.getItem(CLAVE));
  } catch {
    return "rv1960";
  }
}

export function datosVersion(id = obtenerVersionBiblia()) {
  return VERSIONES_BIBLIA.find((x) => x.id === id) || VERSIONES_BIBLIA[0];
}

export function cambiarVersionBiblia(id) {
  const v = versionValida(id);
  try {
    localStorage.setItem(CLAVE, v);
  } catch {
    // sin localStorage: queda solo en memoria de esta sesión
  }
  try {
    window.electron?.actualizarConfiguracionPorClave?.("bibliaVersion", v);
  } catch {
    // noop
  }
  window.dispatchEvent(new CustomEvent(EVENTO, {detail: v}));
  return v;
}

export function alCambiarVersionBiblia(fn) {
  const h = (e) => fn(e.detail);
  window.addEventListener(EVENTO, h);
  return () => window.removeEventListener(EVENTO, h);
}
