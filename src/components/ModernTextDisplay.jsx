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
const ModernTextDisplay = ({titulo, parrafo, numero, configuracion, mostrarTitulo = true}) => {
  const textBoxRef   = useRef(null);
  const paragraphRef = useRef(null);
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
  const tamañoParrafo = useMemo(() => {
    const len = display.parrafo?.length || 0;
    if (len > 450) return "text-4xl";
    if (len > 320) return "text-5xl";
    if (len > 220) return "text-6xl";
    return configuracion?.fontSize?.parrafo || "text-7xl";
  }, [display.parrafo, configuracion]);

  const ajustar = () => {
    const box = textBoxRef.current;
    const p   = paragraphRef.current;
    if (!box || !p) return;
    if (!display.parrafo?.trim()) { p.style.fontSize = ""; setFontSizePx(null); return; }

    p.style.fontSize = "";
    const base = parseFloat(window.getComputedStyle(p).fontSize || "0");
    if (!isFinite(base) || base <= 0) return;

    const avail     = Math.max(0, box.clientHeight - 2);
    const lines     = Math.max(1, String(display.parrafo).split("\n").filter(Boolean).length);
    const heightMax = (avail / (lines * 1.3)) * 0.92;
    const cap       = lines <= 1 ? 104 : lines <= 2 ? 98 : lines <= 3 ? 92 : lines <= 4 ? 86 : 80;
    const maxPx     = Math.min(140, Math.max(28, Math.max(base, Math.min(heightMax, cap))));
    const minPx     = Math.max(22, Math.round(maxPx * 0.42));

    p.style.fontSize = `${maxPx}px`;
    if (p.scrollHeight <= avail) { setFontSizePx(maxPx); return; }

    let lo = minPx, hi = maxPx, best = minPx;
    for (let i = 0; i < 20 && hi - lo > 0.5; i++) {
      const mid = (lo + hi) / 2;
      p.style.fontSize = `${mid}px`;
      if (p.scrollHeight <= avail) { best = mid; lo = mid; } else hi = mid;
    }
    setFontSizePx(best);
  };

  // Sincrono (sin RAF) para que el tamaño esté listo antes del paint + animación
  useLayoutEffect(ajustar, [display.parrafo, display.titulo, mostrarTitulo, tamañoParrafo]);
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
            className={`${configuracion?.fontSize?.titulo || "text-5xl"} font-bold mb-6 tracking-wide`}
            style={{color: configuracion?.colorSecundario || "#ffffff"}}
          >
            {display.titulo}
          </motion.h1>
        </AnimatePresence>
      )}

      {/* Párrafo con stagger de palabras */}
      <div className="relative flex-1 min-h-0 flex flex-col">
        <div ref={textBoxRef} className="relative z-10 flex-1 min-h-0 flex items-center justify-center overflow-hidden">
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
