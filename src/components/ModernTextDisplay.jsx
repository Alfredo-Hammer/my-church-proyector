import {useEffect, useLayoutEffect, useMemo, useRef, useState} from "react";
import {AnimatePresence, motion} from "framer-motion";

// Divide el texto en líneas → palabras para el stagger
function parseLines(text) {
  if (!text) return [[""]];
  const lines = String(text).split("\n").filter(Boolean);
  return lines.length ? lines.map((l) => l.trim().split(/\s+/).filter(Boolean)) : [[""]];
}

// Variantes Framer Motion
const EXIT_TRANSITION    = {duration: 0.22, ease: [0.4, 0, 1, 1]};
const containerVariants  = {
  hidden:  {},
  visible: {},           // stagger lo manejan las palabras
  exit:    {opacity: 0, y: -18, filter: "blur(8px)", transition: EXIT_TRANSITION},
};
const wordVariants = (stagger) => ({
  hidden:  {opacity: 0, y: 20,  filter: "blur(8px)"},
  visible: (i) => ({
    opacity: 1, y: 0, filter: "blur(0px)",
    transition: {delay: i * stagger, duration: 0.42, ease: [0.25, 0.46, 0.45, 0.94]},
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
const ModernTextDisplay = ({titulo, parrafo, numero, configuracion, mostrarTitulo = true, maxFontPx: maxFontPxProp = null}) => {
  const textBoxRef   = useRef(null);
  const paragraphRef = useRef(null);
  const measureRef   = useRef(null); // hidden clone for accurate font measurement
  const [fontSizePx, setFontSizePx] = useState(null);

  // ── Texto visible + clave de animación ───────────────────────────────────
  const [display, setDisplay]   = useState({parrafo, titulo});
  const [animKey, setAnimKey]   = useState(0);
  const lastChange              = useRef(Date.now());

  useEffect(() => {
    if (parrafo === display.parrafo && titulo === display.titulo) return;

    const now     = Date.now();
    const elapsed = now - lastChange.current;
    lastChange.current = now;

    setDisplay({parrafo, titulo});

    // Cambios rápidos (temporizador < 700 ms) → solo actualiza texto, sin animación
    if (elapsed >= 700) {
      setAnimKey((k) => k + 1);
    }
  }, [parrafo, titulo]);

  // ── Auto-sizing ───────────────────────────────────────────────────────────
  // tamañoParrafo: reflects the user's chosen class (used as useLayoutEffect trigger)
  const tamañoParrafo = useMemo(() => {
    return configuracion?.fontSize?.parrafo || "text-8xl";
  }, [configuracion]);

  const ajustar = () => {
    const box     = textBoxRef.current;
    const measure = measureRef.current;
    if (!box || !measure) return;
    if (!display.parrafo?.trim()) { measure.style.fontSize = ""; setFontSizePx(null); return; }

    // Margen de seguridad: el elemento visual tiene marginRight en cada palabra
    // lo que causa que envuelva antes que el elemento de medición oculto.
    // Se reduce avail un 10% para compensar y garantizar que el texto quepa.
    const rawAvail = box.clientHeight;
    if (rawAvail <= 0) return;
    const avail = Math.max(0, rawAvail * 0.90 - 2);

    // Tamaño máximo: usa el valor enviado directamente desde HimnoDetalle (más confiable)
    // y como fallback usa la configuración del sistema.
    const CLASS_PX = {
      "text-3xl": 30, "text-4xl": 36, "text-5xl": 48, "text-6xl": 60,
      "text-7xl": 72, "text-8xl": 96, "text-9xl": 128, "text-10xl": 160,
    };
    const configClass = configuracion?.fontSize?.parrafo || "text-8xl";
    // Cap dinámico: nunca superar 25% de la altura disponible del contenedor
    // para que en pantallas grandes (2K/4K) el texto tampoco salga de su área.
    const hardCap = Math.max(40, Math.round(rawAvail * 0.25));
    const maxPx  = Math.min(hardCap, Math.max(40,
      maxFontPxProp ?? CLASS_PX[configClass] ?? 96
    ));
    const minPx  = Math.max(14, Math.round(maxPx * 0.30));

    measure.style.fontSize = `${maxPx}px`;
    if (measure.scrollHeight <= avail) { setFontSizePx(maxPx); return; }

    let lo = minPx, hi = maxPx, best = minPx;
    for (let i = 0; i < 32 && hi - lo > 0.3; i++) {
      const mid = (lo + hi) / 2;
      measure.style.fontSize = `${mid}px`;
      if (measure.scrollHeight <= avail) { best = mid; lo = mid; } else hi = mid;
    }
    setFontSizePx(best);
  };

  // Sincrono (sin RAF) para que el tamaño esté listo antes del paint + animación
  useLayoutEffect(ajustar, [display.parrafo, display.titulo, mostrarTitulo, tamañoParrafo, maxFontPxProp]);
  useEffect(() => {
    window.addEventListener("resize", ajustar);
    return () => window.removeEventListener("resize", ajustar);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  const lines      = useMemo(() => parseLines(display.parrafo), [display.parrafo]);
  const wordCount  = lines.reduce((s, l) => s + l.length, 0);
  const stagger    = Math.min(0.055, 0.85 / Math.max(wordCount, 1));
  const wVariants  = useMemo(() => wordVariants(stagger), [stagger]);

  let wordIdx = 0; // índice global de palabra para el delay acumulado

  return (
    <div className="text-center z-10 relative w-screen h-screen flex flex-col justify-center px-[4vw] py-[4vh]">

      {/* Título */}
      {mostrarTitulo && display.titulo?.trim() && (
        <AnimatePresence mode="wait">
          <motion.h1
            key={`title-${animKey}`}
            initial={{opacity: 0, y: -16, filter: "blur(5px)"}}
            animate={{opacity: 1, y: 0,   filter: "blur(0px)",
              transition: {duration: 0.45, ease: "easeOut"}}}
            exit={{opacity: 0, y: -12, filter: "blur(5px)",
              transition: EXIT_TRANSITION}}
            className={`${configuracion?.fontSize?.titulo || "text-5xl"} font-bold mb-[2vh] tracking-wide shrink-0 overflow-hidden break-words max-h-[35%]`}
            style={{color: configuracion?.colorSecundario || "#ffffff"}}
          >
            {display.titulo}
          </motion.h1>
        </AnimatePresence>
      )}

      {/* Párrafo con stagger de palabras */}
      <div className="relative flex-1 min-h-0 flex flex-col">
        <div ref={textBoxRef} className="relative z-10 flex-1 min-h-0 flex items-center justify-center overflow-hidden">
          {/* Hidden measurement element — always reflects current text without animation interference */}
          <p
            ref={measureRef}
            className={`${tamañoParrafo} font-semibold`}
            aria-hidden="true"
            style={{
              position:    "absolute",
              visibility:  "hidden",
              top:         0,
              left:        0,
              right:       0,
              lineHeight:  1.3,
              whiteSpace:  "pre-line",
              pointerEvents: "none",
            }}
          >
            {display.parrafo}
          </p>
          <div className="w-full">
            <p
              ref={paragraphRef}
              className={`${tamañoParrafo} font-semibold leading-snug`}
              style={{
                color:      configuracion?.colorSecundario,
                lineHeight: 1.3,
                fontSize:   fontSizePx ? `${fontSizePx}px` : undefined,
              }}
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={`block-${animKey}`}
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  style={{display: "block"}}
                >
                  {lines.map((lineWords, li) => (
                    <span key={li} style={{display: "block"}}>
                      {lineWords.map((word) => {
                        const idx = wordIdx++;
                        return (
                          <motion.span
                            key={idx}
                            custom={idx}
                            variants={wVariants}
                            style={{display: "inline-block", marginRight: "0.28em"}}
                          >
                            {word}
                          </motion.span>
                        );
                      })}
                    </span>
                  ))}
                </motion.span>
              </AnimatePresence>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernTextDisplay;
