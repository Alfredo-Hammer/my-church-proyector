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
  // Tope de líneas. Ojo: un tope bajo NO agranda la letra, la achica — con 6
  // un versículo largo quedaba obligado a entrar en 6 líneas aunque hubiera
  // alto de sobra para 8 líneas más grandes (medido: 69px vs ~85px a 1080p).
  // El alto disponible ya limita solo; esto queda como freno para textos
  // absurdamente largos.
  maxLines: 9,
  minFontSizePx: 24,
  // Cuánto se permite achicar (fracción) para que ningún verso de una estrofa
  // quede partido en dos líneas. Más que esto, se acepta el corte.
  maxReduccionVersos: 0.25,
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

  let best;
  if (cabe(maxFontSizePx)) {
    best = maxFontSizePx;
  } else {
    let lo = minFontSizePx,
      hi = maxFontSizePx;
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
  }

  // Estrofas (texto con saltos de línea): el tamaño "más grande que cabe"
  // puede partir un verso a la mitad ("Cantemos hoy con / gratitud"), que se
  // lee peor que un verso entero un poco más chico. Si achicando hasta un
  // AJUSTE_TEXTO.maxReduccionVersos cada verso entra en su línea, se prefiere.
  const versos = texto.split("\n").filter((l) => l.trim()).length;
  if (versos >= 2) {
    const lineasCon = (px) => {
      measureEl.style.fontSize = `${px}px`;
      measureEl.style.lineHeight = String(lineHeight);
      return Math.round(measureEl.scrollHeight / (px * lineHeight));
    };
    if (lineasCon(best) > versos) {
      const piso = best * (1 - AJUSTE_TEXTO.maxReduccionVersos);
      if (lineasCon(piso) <= versos) {
        let lo = piso,
          hi = best,
          sinCortes = piso;
        for (let i = 0; i < 24 && hi - lo > 0.3; i++) {
          const mid = (lo + hi) / 2;
          if (lineasCon(mid) <= versos) {
            sinCortes = mid;
            lo = mid;
          } else {
            hi = mid;
          }
        }
        best = sinCortes;
      }
    }
  }

  measureEl.style.fontSize = `${best}px`;
  return best;
}

// ════════════════════════════════════════════════════════════════════════
// MODO LEJOS — dividir un texto largo en partes
// ════════════════════════════════════════════════════════════════════════
// Si un texto no entra en pantalla con la letra mínima configurada, se divide
// en partes que sí entran. Se corta preferentemente al final de una oración
// (. ; : ? !), después en comas, y solo como último recurso entre palabras.
// Las partes se equilibran (dos mitades parecidas, no "todo + 3 palabras").
//
// cabe(textoParte) → boolean: la decide el llamador midiendo a la letra
// mínima en el área disponible real (ver Proyector.jsx).
export const MODO_LEJOS = {
  minimoDefectoPct: 10, // % del alto de pantalla
  maxPartes: 8,
};

function trozosDeFrase(texto) {
  // Oraciones/cláusulas con su puntuación y espacio final incluidos.
  const trozos = texto.match(/[^.;:!?,]+[.;:!?,]*["»”)]*\s*/g) || [texto];
  return trozos.filter((t) => t.trim());
}

// Peso del corte después de cada trozo: menor = mejor lugar para cortar.
const pesoCorte = (trozo) => (/[.;:!?]["»”)]*\s*$/.test(trozo) ? 0 : /,\s*$/.test(trozo) ? 1 : 2);

function partirPorPalabras(texto, cabe) {
  const palabras = texto.trim().split(/\s+/);
  const partes = [];
  let actual = "";
  for (const p of palabras) {
    const prueba = actual ? `${actual} ${p}` : p;
    if (!actual || cabe(prueba)) {
      actual = prueba;
    } else {
      partes.push(actual);
      actual = p;
    }
  }
  if (actual) partes.push(actual);
  return partes;
}

export function dividirTextoEnPartes(texto, cabe, maxPartes = MODO_LEJOS.maxPartes) {
  const limpio = String(texto || "").trim();
  if (!limpio || cabe(limpio)) return [limpio];

  // Unidades: trozos de frase; si alguno solo ya no cabe, se parte por palabras.
  const unidades = [];
  for (const t of trozosDeFrase(limpio)) {
    if (cabe(t.trim())) unidades.push(t);
    else partirPorPalabras(t, cabe).forEach((u, i, arr) => unidades.push(i < arr.length - 1 ? `${u} ` : `${u}${/\s$/.test(t) ? " " : ""}`));
  }

  const unir = (arr) => arr.join("").trim();

  // 1) Greedy: cuántas partes hacen falta como mínimo.
  let n = 0;
  {
    let actual = [];
    for (const u of unidades) {
      if (actual.length && !cabe(unir([...actual, u]))) {
        n++;
        actual = [u];
      } else {
        actual.push(u);
      }
    }
    if (actual.length) n++;
  }
  n = Math.min(Math.max(n, 2), maxPartes);

  // 2) Equilibrar: elegir los n-1 cortes cerca de los puntos ideales
  // (largo total / n), prefiriendo fin de oración > coma > palabra, y
  // verificando que cada parte quepa. Si no se logra con n, probar n+1.
  const largos = unidades.map((u) => u.length);
  const total = largos.reduce((a, b) => a + b, 0);
  for (let partes = n; partes <= maxPartes; partes++) {
    const cortes = [];
    let desde = 0;
    let ok = true;
    for (let k = 1; k < partes; k++) {
      const ideal = (total * k) / partes;
      let mejor = -1;
      let mejorCosto = Infinity;
      let acumulado = largos.slice(0, desde).reduce((a, b) => a + b, 0);
      for (let i = desde; i < unidades.length - (partes - k); i++) {
        acumulado += largos[i];
        if (!cabe(unir(unidades.slice(desde, i + 1)))) break;
        // costo: distancia al ideal + penalización por mal lugar de corte
        const costo = Math.abs(acumulado - ideal) / Math.max(1, total / partes) + pesoCorte(unidades[i]) * 0.35;
        if (costo < mejorCosto) {
          mejorCosto = costo;
          mejor = i;
        }
      }
      if (mejor < 0) {
        ok = false;
        break;
      }
      cortes.push(mejor);
      desde = mejor + 1;
    }
    if (!ok) continue;
    const resultado = [];
    let ini = 0;
    for (const c of [...cortes, unidades.length - 1]) {
      resultado.push(unir(unidades.slice(ini, c + 1)));
      ini = c + 1;
    }
    if (resultado.every((p) => p && cabe(p))) return resultado;
  }

  // 3) Último recurso: greedy puro por palabras.
  return partirPorPalabras(limpio, cabe).slice(0, maxPartes);
}
