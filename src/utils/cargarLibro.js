
// src/utils/cargarLibro.js
import {obtenerVersionBiblia} from "./versionBiblia";

const cache = new Map();

// Carpeta (dentro de public/data, servida en /data) de cada versión. Es la MISMA copia que lee el
// servidor para la app móvil: cada archivo es `export default <JSON>;` (array de capítulos).
const CARPETAS = {rv1960: "biblia", rv1909: "biblia_rv1909"};

// Devuelve el libro como array de capítulos (cada uno, array de versículos)
// en la versión pedida (por defecto, la elegida en la app).
export async function cargarLibro(nombreLibro, version = obtenerVersionBiblia()) {
  if (!/^[a-z0-9_]+$/.test(String(nombreLibro || ""))) return [];
  const carpeta = CARPETAS[version] || CARPETAS.rv1960;
  const clave = `${carpeta}/${nombreLibro}`;
  if (cache.has(clave)) return cache.get(clave);
  try {
    // Mismo origen que la app (localhost:3000 en desarrollo, 3001 instalada).
    const res = await fetch(`/data/${carpeta}/${nombreLibro}.js`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const texto = await res.text();
    // JSON.parse y no eval/import: el CSP de producción no permite evaluar código.
    const data = JSON.parse(texto.replace(/^\s*export\s+default\s+/, "").trim().replace(/;+\s*$/, ""));
    if (Array.isArray(data)) cache.set(clave, data);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("No se pudo cargar el libro:", nombreLibro, version, error);
    return [];
  }
}
