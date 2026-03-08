// src/utils/cargarLibro.js
export async function cargarLibro(nombreLibro) {
  try {
    const modulo = await import(`../data/biblia/${nombreLibro}.js`);
    return modulo.default; // El array de versículos
  } catch (error) {
    console.error("No se pudo cargar el libro:", nombreLibro, error);
    return [];
  }
}
