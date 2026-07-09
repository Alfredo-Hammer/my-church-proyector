import Estrellas from "./Estrellas";
import RayoDeLuz from "./RayoDeLuz";
import Lluvia from "./Lluvia";
import Brasas from "./Brasas";

// Los fondos "animado" no tienen archivo real — su `url` en la DB es un
// identificador con prefijo "animado:" (ej. "animado:estrellas"), nunca una
// ruta de disco. Este registro es la única fuente de verdad que mapea ese
// identificador al componente que lo renderiza.
export const FONDOS_ANIMADOS = {
  estrellas: Estrellas,
  "rayo-de-luz": RayoDeLuz,
  lluvia: Lluvia,
  brasas: Brasas,
};

export function idFondoAnimado(url) {
  return typeof url === "string" && url.startsWith("animado:")
    ? url.slice("animado:".length)
    : null;
}

export function componenteFondoAnimado(url) {
  const id = idFondoAnimado(url);
  return id ? FONDOS_ANIMADOS[id] || null : null;
}
