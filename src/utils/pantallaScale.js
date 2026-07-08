// Los tamaños de fuente del proyector (ModernTextDisplay, PlantillaGSAP) están
// calibrados en px/rem fijos para una pantalla de referencia de 1920×1080 —
// la misma resolución que asume el preview "escala 1:5" de Configuracion.jsx.
//
// Sin este factor, la MISMA opción de tamaño (ej. "5XL") se ve más chica en
// pantallas con mayor resolución que la de referencia (ej. un TV 4K de la
// iglesia), porque createProyectorWindow() usa la resolución nativa del
// monitor externo y los px del CSS no escalan solos con eso.
const ALTURA_REFERENCIA = 1080;

export function calcularEscalaFuente() {
  const escala = window.innerHeight / ALTURA_REFERENCIA;
  // clamp para no distorsionar en ventanas muy chicas (modo un solo monitor)
  // ni en resoluciones inusualmente altas
  return Math.min(4, Math.max(0.4, escala));
}

// Tabla compartida de clases Tailwind de fuente → px, en términos de la
// pantalla de referencia (1920×1080). Usada por ModernTextDisplay,
// ModernWelcomeScreen y el preview de Configuracion.jsx — una sola fuente
// de verdad para que las tres coincidan.
export const CLASS_PX = {
  "text-3xl": 30,
  "text-4xl": 36,
  "text-5xl": 48,
  "text-6xl": 60,
  "text-7xl": 72,
  "text-8xl": 96,
  "text-9xl": 128,
  "text-10xl": 160,
  "text-11xl": 200,
};
