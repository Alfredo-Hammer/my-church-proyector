// Himnario en miskito de la iglesia: Moravo o Adventista. Se muestra uno solo.
// - Dentro de la app el tipo interno sigue siendo "moravo" (= "el himnario en miskito"),
//   así órdenes de servicio, rutas (/himnos, /himno/:n) y la app móvil vieja no cambian.
//   Este módulo dice CUÁL himnario es ese y de dónde salen sus datos.
// - La elección se guarda en localStorage (para leerla al instante) y en la
//   configuración (`himnario`) para que el servidor entregue el mismo a la app móvil.

import {useEffect, useState} from "react";
import himnosMoravo from "../data/himnos.json";
import himnosAdventista from "../data/himnos_adventista.json";

export const HIMNARIOS = [
  {id: "moravo", nombre: "Himnario Moravo", corto: "Moravo", plural: "Moravos", himno: "Himno Moravo", himnos: himnosMoravo},
  {id: "adventista", nombre: "Himnario Adventista", corto: "Adventista", plural: "Adventistas", himno: "Himno Adventista", himnos: himnosAdventista},
];

const CLAVE = "himnario:v1";
const EVENTO = "himnario-cambiado";

export function himnarioValido(v) {
  return HIMNARIOS.some((x) => x.id === v) ? v : "moravo";
}

export function obtenerHimnario() {
  try {
    return himnarioValido(localStorage.getItem(CLAVE));
  } catch {
    return "moravo";
  }
}

export function datosHimnario(id = obtenerHimnario()) {
  return HIMNARIOS.find((x) => x.id === id) || HIMNARIOS[0];
}

// Id que usa el servidor para favoritos de un himno base del himnario elegido.
export function idBaseHimno(numero, id = obtenerHimnario()) {
  return `base:${himnarioValido(id)}:${numero}`;
}

export function cambiarHimnario(id, {guardar = true} = {}) {
  const v = himnarioValido(id);
  const antes = obtenerHimnario();
  try {
    localStorage.setItem(CLAVE, v);
  } catch {
    // sin localStorage: queda solo en memoria de esta sesión
  }
  if (guardar) {
    try {
      window.electron?.actualizarConfiguracionPorClave?.("himnario", v);
    } catch {
      // noop
    }
  }
  if (antes !== v) window.dispatchEvent(new CustomEvent(EVENTO, {detail: v}));
  return v;
}

// Al abrir la app: si la configuración (p. ej. tras restaurar un respaldo) dice otra cosa,
// manda la configuración.
export async function sincronizarHimnario() {
  try {
    const guardado = await window.electron?.obtenerConfiguracionPorClave?.("himnario");
    if (guardado === "moravo" || guardado === "adventista") {
      cambiarHimnario(guardado, {guardar: false});
    } else if (window.electron?.actualizarConfiguracionPorClave) {
      // La configuración no lo tiene (instalación vieja o se restauró la de fábrica):
      // guardar el de esta compu para que el servidor y el celular usen el mismo.
      await window.electron.actualizarConfiguracionPorClave("himnario", obtenerHimnario());
    }
  } catch {
    // noop
  }
}

export function alCambiarHimnario(fn) {
  const h = (e) => fn(e.detail);
  window.addEventListener(EVENTO, h);
  return () => window.removeEventListener(EVENTO, h);
}

// Hook: datos del himnario elegido; se actualiza solo si se cambia en Configuración.
export function useHimnario() {
  const [id, setId] = useState(obtenerHimnario);
  useEffect(() => alCambiarHimnario(setId), []);
  return datosHimnario(id);
}
