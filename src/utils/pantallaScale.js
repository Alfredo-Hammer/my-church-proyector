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

// ════════════════════════════════════════════════════════════════════════
// AJUSTE DE TEXTO — fuente única para ModernTextDisplay.jsx y PlantillaGSAP.jsx
// ════════════════════════════════════════════════════════════════════════
// Antes cada uno tenía su propia búsqueda binaria + sus propios márgenes
// hardcodeados, lo que hacía que el mismo texto en la misma pantalla se
// viera con tamaño distinto según hubiera o no una plantilla GSAP activa.
// Esta función es la única que decide "¿el texto entra?", para que ambos
// caminos de render den el mismo resultado ante el mismo texto/pantalla.
export const AJUSTE_TEXTO = {
  // Margen de seguridad — % del alto/ancho del viewport que el texto nunca
  // debe invadir. Se puede ajustar acá sin tocar los componentes.
  safeArea: {top: 0.04, bottom: 0.04, left: 0.02, right: 0.02},
  // Tope de líneas: preferimos no seguir agregando líneas sin límite para
  // pasajes muy largos — mejor un tamaño mínimo legible que texto ilegible.
  maxLines: 6,
  minFontSizePx: 24,
};

// measureEl: elemento ya posicionado con el ancho real disponible (ya sea
// offscreen con position:fixed + left/right en vw, o el contenedor visible
// real) — el llamador es responsable de crearlo/reusarlo con
// visibility:hidden si es offscreen. Esta función solo lee su scrollHeight
// a distintos font-size para encontrar el más grande que entra.
export function calcularAjusteTexto({
  measureEl,
  texto,
  disponibleAlto,
  maxFontSizePx,
  minFontSizePx = AJUSTE_TEXTO.minFontSizePx,
  maxLines = AJUSTE_TEXTO.maxLines,
  lineHeight = 1.3,
}) {
  if (!measureEl || !texto?.trim() || !disponibleAlto || disponibleAlto <= 0) {
    return maxFontSizePx;
  }

  const cabe = (px) => {
    measureEl.style.fontSize = `${px}px`;
    measureEl.style.lineHeight = String(lineHeight);
    const lineas = Math.round(measureEl.scrollHeight / (px * lineHeight));
    return measureEl.scrollHeight <= disponibleAlto && lineas <= maxLines;
  };

  if (cabe(maxFontSizePx)) return maxFontSizePx;

  let lo = minFontSizePx,
    hi = maxFontSizePx,
    best = minFontSizePx;
  for (let i = 0; i < 32 && hi - lo > 0.3; i++) {
    const mid = (lo + hi) / 2;
    if (cabe(mid)) {
      best = mid;
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return best;
}
