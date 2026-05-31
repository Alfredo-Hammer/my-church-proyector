import {useEffect, useLayoutEffect, useMemo, useRef, useState} from "react";
import {AnimatePresence, LazyMotion, domAnimation, m} from "framer-motion";

// Divide el texto en líneas → palabras para el stagger
function parseLines(text) {
  if (!text) return [[""]];
  const lines = String(text).split("\n").filter(Boolean);
  return lines.length
    ? lines.map((l) => l.trim().split(/\s+/).filter(Boolean))
    : [[""]];
}

// Variantes Framer Motion
const EXIT_TRANSITION = {duration: 0.22, ease: [0.4, 0, 1, 1]};
const containerVariants = {
  hidden: {},
  visible: {},
  exit: {opacity: 0, y: -18, filter: "blur(8px)", transition: EXIT_TRANSITION},
};
const wordVariants = (stagger) => ({
  hidden: {opacity: 0, y: 20, filter: "blur(8px)"},
  visible: (i) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      delay: i * stagger,
      duration: 0.42,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
const CLASS_PX = {
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

const ModernTextDisplay = ({
  titulo,
  parrafo,
  numero,
  configuracion,
  mostrarTitulo = true,
  maxFontPx: maxFontPxProp = null,
}) => {
  const textBoxRef = useRef(null);
  const measureRef = useRef(null);
  const [fontSizePx, setFontSizePx] = useState(null);

  // ── Texto visible + clave de animación ───────────────────────────────────
  const [display, setDisplay] = useState({parrafo, titulo});
  const [animKey, setAnimKey] = useState(0);
  const lastChange = useRef(Date.now());

  useEffect(() => {
    if (parrafo === display.parrafo && titulo === display.titulo) return;

    const now = Date.now();
    const elapsed = now - lastChange.current;
    lastChange.current = now;

    setDisplay({parrafo, titulo});

    // Cambios rápidos (< 700 ms) → solo actualiza texto, sin animación
    if (elapsed >= 700) {
      setAnimKey((k) => k + 1);
    }
  }, [parrafo, titulo]);

  // ── Tamaño del párrafo (trigger para recalcular) ──────────────────────────
  const tamañoParrafo = useMemo(() => {
    return configuracion?.fontSize?.parrafo || "text-9xl";
  }, [configuracion]);

  // ── Auto-sizing: usa exactamente el tamaño elegido si cabe; reduce si no ──
  const ajustar = () => {
    const box = textBoxRef.current;
    const measure = measureRef.current;
    if (!box || !measure) return;
    if (!display.parrafo?.trim()) {
      measure.style.fontSize = "";
      setFontSizePx(null);
      return;
    }

    // Si boxHeight < 500px, el contenedor flex no recibió altura → usar windowHeight
    const boxHeight = box.clientHeight;
    const windowHeight = window.innerHeight;
    const MIN_REASONABLE_HEIGHT = 500;

    const rawAvail =
      boxHeight >= MIN_REASONABLE_HEIGHT
        ? boxHeight
        : Math.max(windowHeight * 0.85, 800);

    // Margen de seguridad del 8% para word-wrap y line-height
    const avail = Math.max(0, rawAvail * 0.92);

    const configClass = configuracion?.fontSize?.parrafo || "text-9xl";
    const userMaxPx = maxFontPxProp ?? CLASS_PX[configClass] ?? 128;

    // Si el texto cabe al tamaño exacto elegido → usarlo directamente
    measure.style.fontSize = `${userMaxPx}px`;
    if (measure.scrollHeight <= avail) {
      setFontSizePx(userMaxPx);
      return;
    }

    // Texto no cabe → búsqueda binaria para el mayor tamaño que sí quepa
    const minPx = Math.max(24, Math.round(userMaxPx * 0.2));
    let lo = minPx,
      hi = userMaxPx,
      best = minPx;
    for (let i = 0; i < 32 && hi - lo > 0.3; i++) {
      const mid = (lo + hi) / 2;
      measure.style.fontSize = `${mid}px`;
      if (measure.scrollHeight <= avail) {
        best = mid;
        lo = mid;
      } else hi = mid;
    }
    setFontSizePx(best);
  };

  useLayoutEffect(ajustar, [
    display.parrafo,
    display.titulo,
    mostrarTitulo,
    tamañoParrafo,
    maxFontPxProp,
  ]);
  useEffect(() => {
    window.addEventListener("resize", ajustar);
    return () => window.removeEventListener("resize", ajustar);
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────
  const lines = useMemo(() => parseLines(display.parrafo), [display.parrafo]);
  const wordCount = lines.reduce((s, l) => s + l.length, 0);
  const stagger = Math.min(0.055, 0.85 / Math.max(wordCount, 1));
  const wVariants = useMemo(() => wordVariants(stagger), [stagger]);

  let wordIdx = 0;

  return (
    <LazyMotion features={domAnimation} strict>
      <div className="text-center z-10 relative size-screen flex flex-col justify-center px-[4vw] py-[4vh]">
        {/* Título */}
        {mostrarTitulo && display.titulo?.trim() && (
          <AnimatePresence mode="wait">
            <m.h1
              key={`title-${animKey}`}
              initial={{opacity: 0, y: -16, filter: "blur(5px)"}}
              animate={{
                opacity: 1,
                y: 0,
                filter: "blur(0px)",
                transition: {duration: 0.45, ease: "easeOut"},
              }}
              exit={{
                opacity: 0,
                y: -12,
                filter: "blur(5px)",
                transition: EXIT_TRANSITION,
              }}
              className={`${configuracion?.fontSize?.titulo || "text-5xl"} font-bold mb-[2vh] tracking-wide shrink-0 overflow-hidden break-words max-h-[35%]`}
              style={{color: configuracion?.colorSecundario || "#ffffff"}}
            >
              {display.titulo}
            </m.h1>
          </AnimatePresence>
        )}

        {/* Párrafo con stagger de palabras */}
        <div className="relative flex-1 min-h-0 flex flex-col">
          <div
            ref={textBoxRef}
            className="relative z-10 flex-1 min-h-0 flex items-center justify-center overflow-hidden"
          >
            {/* Elemento oculto para medir sin interferencia de animaciones */}
            <p
              ref={measureRef}
              aria-hidden="true"
              style={{
                position: "absolute",
                visibility: "hidden",
                top: 0,
                left: 0,
                right: 0,
                fontWeight: 600,
                lineHeight: 1.3,
                whiteSpace: "pre-line",
                wordSpacing: "0.28em",
                overflow: "visible",
                pointerEvents: "none",
              }}
            >
              {display.parrafo}
            </p>
            <div className="w-full">
              <p
                className="font-semibold leading-snug"
                style={{
                  color: configuracion?.colorSecundario,
                  lineHeight: 1.3,
                  fontSize: fontSizePx ? `${fontSizePx}px` : undefined,
                }}
              >
                <AnimatePresence mode="wait">
                  <m.span
                    key={`block-${animKey}`}
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    style={{display: "block"}}
                  >
                    {lines.map((lineWords, li) => (
                      <span
                        key={`line-${li}-${lineWords.join("").slice(0, 8)}`}
                        style={{display: "block"}}
                      >
                        {lineWords.map((word) => {
                          const wordPos = wordIdx++;
                          return (
                            <m.span
                              key={`word-${wordPos}-${word.slice(0, 5)}`}
                              custom={wordPos}
                              variants={wVariants}
                              style={{
                                display: "inline-block",
                                marginRight: "0.28em",
                              }}
                            >
                              {word}
                            </m.span>
                          );
                        })}
                      </span>
                    ))}
                  </m.span>
                </AnimatePresence>
              </p>
            </div>
          </div>
        </div>
      </div>
    </LazyMotion>
  );
};

export default ModernTextDisplay;
