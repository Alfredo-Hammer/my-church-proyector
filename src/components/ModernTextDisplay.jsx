import {Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState} from "react";
import {AnimatePresence, LazyMotion, domAnimation, m} from "framer-motion";

function parseLines(text) {
  if (!text) return [[""]];
  const lines = String(text).split("\n").filter(Boolean);
  return lines.length
    ? lines.map((l) => l.trim().split(/\s+/).filter(Boolean))
    : [[""]];
}

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
    transition: {delay: i * stagger, duration: 0.42, ease: [0.25, 0.46, 0.45, 0.94]},
  }),
});

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
}) => {
  const measureRef = useRef(null);
  const [fontSizePx, setFontSizePx] = useState(null);

  // ── Texto visible + clave de animación ──────────────────────────────────
  const [display, setDisplay] = useState({parrafo, titulo});
  const [animKey, setAnimKey] = useState(0);
  const lastChange = useRef(Date.now());

  useEffect(() => {
    if (parrafo === display.parrafo && titulo === display.titulo) return;
    const now = Date.now();
    const elapsed = now - lastChange.current;
    lastChange.current = now;
    setDisplay({parrafo, titulo});
    if (elapsed >= 700) setAnimKey((k) => k + 1);
  }, [parrafo, titulo]);

  // ── Tamaño configurado (dispara recálculo) ───────────────────────────────
  const tamañoParrafo = useMemo(
    () => configuracion?.fontSize?.parrafo || "text-9xl",
    [configuracion]
  );

  // ── Auto-sizing basado en window.innerHeight (siempre preciso) ──────────
  //
  // measureRef usa position:fixed para que su ancho sea siempre 92vw del
  // viewport real, independiente del estado del layout del DOM. Así evitamos
  // leer clientHeight de un contenedor flex que puede estar en mitad de la
  // animación de fullscreen de macOS.
  const ajustar = () => {
    const measure = measureRef.current;
    if (!measure || !display.parrafo?.trim()) {
      setFontSizePx(null);
      return;
    }

    const configClass = configuracion?.fontSize?.parrafo || "text-9xl";
    const userMaxPx = CLASS_PX[configClass] ?? 128;

    // Altura disponible: viewport menos padding (py-[4vh] = 8vh total) con
    // 5% de margen extra. Si hay título visible, reservamos ~40% para él.
    const tituloVisible = mostrarTitulo && display.titulo?.trim();
    const avail = window.innerHeight * (tituloVisible ? 0.50 : 0.87);

    measure.style.fontSize = `${userMaxPx}px`;
    if (measure.scrollHeight <= avail) {
      setFontSizePx(userMaxPx);
      return;
    }

    const minPx = Math.max(24, Math.round(userMaxPx * 0.2));
    let lo = minPx, hi = userMaxPx, best = minPx;
    for (let i = 0; i < 32 && hi - lo > 0.3; i++) {
      const mid = (lo + hi) / 2;
      measure.style.fontSize = `${mid}px`;
      if (measure.scrollHeight <= avail) { best = mid; lo = mid; }
      else hi = mid;
    }
    setFontSizePx(best);
  };

  // Ref siempre actualizado → evita stale closures en los event handlers
  const ajustarRef = useRef(null);
  ajustarRef.current = ajustar;

  useLayoutEffect(ajustar, [display.parrafo, display.titulo, mostrarTitulo, tamañoParrafo]);

  // Recalcula cuando cambia el tamaño de ventana (incluyendo animación
  // de fullscreen en macOS que crece el viewport progresivamente)
  useEffect(() => {
    const handler = () => ajustarRef.current?.();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────
  const lines = useMemo(() => parseLines(display.parrafo), [display.parrafo]);
  const wordCount = lines.reduce((s, l) => s + l.length, 0);
  const stagger = Math.min(0.055, 0.85 / Math.max(wordCount, 1));
  const wVariants = useMemo(() => wordVariants(stagger), [stagger]);

  let wordIdx = 0;

  return (
    <LazyMotion features={domAnimation} strict>
      {/*
        measureRef: position fixed + left/right 4vw → ancho = 92vw del viewport.
        Se coloca a top:-9999px para que sea invisible sin afectar el layout.
        scrollHeight aquí refleja la altura real que tendría el texto en pantalla.
      */}
      <p
        ref={measureRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          top: "-9999px",
          left: "4vw",
          right: "4vw",
          visibility: "hidden",
          pointerEvents: "none",
          zIndex: -1,
          fontWeight: 600,
          lineHeight: 1.3,
          whiteSpace: "pre-line",
          wordSpacing: "0.28em",
          overflow: "visible",
        }}
      >
        {display.parrafo
          ? display.parrafo.split("\n").filter(Boolean).join("\n")
          : ""}
      </p>

      <div className="text-center z-10 relative size-screen flex flex-col justify-center px-[4vw] py-[4vh] overflow-hidden">
        {/* Título */}
        {mostrarTitulo && display.titulo?.trim() && (
          <AnimatePresence mode="wait">
            <m.h1
              key={`title-${animKey}`}
              initial={{opacity: 0, y: -16, filter: "blur(5px)"}}
              animate={{opacity: 1, y: 0, filter: "blur(0px)", transition: {duration: 0.45, ease: "easeOut"}}}
              exit={{opacity: 0, y: -12, filter: "blur(5px)", transition: EXIT_TRANSITION}}
              className={`${configuracion?.fontSize?.titulo || "text-5xl"} font-bold mb-[2vh] tracking-wide shrink-0 overflow-hidden break-words max-h-[35%]`}
              style={{color: configuracion?.colorSecundario || "#ffffff"}}
            >
              {display.titulo}
            </m.h1>
          </AnimatePresence>
        )}

        {/* Párrafo */}
        <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden">
          <p
            className="font-semibold w-full"
            style={{
              color: configuracion?.colorSecundario,
              lineHeight: 1.3,
              wordSpacing: "0.28em",
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
                  <span key={`line-${li}`} style={{display: "block"}}>
                    {lineWords.map((word) => {
                      const wordPos = wordIdx++;
                      return (
                        <Fragment key={`word-${wordPos}-${word.slice(0, 5)}`}>
                          <m.span
                            custom={wordPos}
                            variants={wVariants}
                            style={{display: "inline-block"}}
                          >
                            {word}
                          </m.span>
                          {" "}
                        </Fragment>
                      );
                    })}
                  </span>
                ))}
              </m.span>
            </AnimatePresence>
          </p>
        </div>
      </div>
    </LazyMotion>
  );
};

export default ModernTextDisplay;
