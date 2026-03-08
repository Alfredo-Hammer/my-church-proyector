import {useEffect, useLayoutEffect, useRef, useState} from "react";
import {motion} from "framer-motion";

// ✨ COMPONENTE DE TEXTO MODERNO
const ModernTextDisplay = ({
  titulo,
  parrafo,
  numero,
  configuracion,
  mostrarTitulo = true, // Ahora controla si mostrar título ARRIBA del párrafo (para versículos)
}) => {
  const textBoxRef = useRef(null);
  const paragraphRef = useRef(null);
  const [fontSizePx, setFontSizePx] = useState(null);

  // ✨ Ajustar tamaño de fuente según longitud del párrafo
  const calcularTamañoTexto = (texto) => {
    const longitud = texto?.length || 0;

    // Si el párrafo es muy largo, reducir el tamaño
    if (longitud > 450) return "text-4xl"; // Muy largo
    if (longitud > 320) return "text-5xl"; // Largo
    if (longitud > 220) return "text-6xl"; // Medio-largo

    // Normal / corto: tamaño equilibrado por defecto
    if (longitud > 120) return configuracion?.fontSize?.parrafo || "text-7xl";
    return configuracion?.fontSize?.parrafo || "text-7xl";
  };

  const tamañoParrafo = calcularTamañoTexto(parrafo);

  const ajustarTextoParaQuepa = () => {
    const boxEl = textBoxRef.current;
    const pEl = paragraphRef.current;
    if (!boxEl || !pEl) return;

    // Si no hay contenido, no forzar medidas
    if (!parrafo || String(parrafo).trim().length === 0) {
      pEl.style.fontSize = "";
      setFontSizePx(null);
      return;
    }

    // Restablecer cualquier font-size anterior para medir el tamaño base real
    pEl.style.fontSize = "";

    const computed = window.getComputedStyle(pEl);
    const computedPx = Number.parseFloat(computed.fontSize || "0");
    if (!Number.isFinite(computedPx) || computedPx <= 0) return;

    // Tamaño máximo sugerido basado en el alto disponible y el # de líneas explícitas.
    // Esto hace que con pocas líneas el texto crezca más, y con muchas se reduzca.
    const availableHeight = Math.max(0, boxEl.clientHeight - 2);
    const explicitLines = String(parrafo)
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean).length;
    const lineCount = Math.max(1, explicitLines);

    // Asumimos line-height ~1.3, y dejamos un pequeño margen.
    // IMPORTANTE: limitar el tamaño máximo para evitar que con 1–2 líneas se vuelva gigante.
    const assumedLineHeight = 1.3;
    const heightBasedMaxPx =
      (availableHeight / (lineCount * assumedLineHeight)) * 0.92;

    const maxCapPx =
      lineCount <= 1
        ? 104
        : lineCount <= 2
          ? 98
          : lineCount <= 3
            ? 92
            : lineCount <= 4
              ? 86
              : 80;

    const maxPx = Math.max(computedPx, Math.min(heightBasedMaxPx, maxCapPx));
    const maxPxClamped = Math.min(140, Math.max(28, maxPx));

    // Límite inferior para evitar texto ilegible
    const minPx = Math.max(22, Math.round(maxPxClamped * 0.42));

    const cabe = () => {
      // Un pequeño margen ayuda a evitar cortes por subpíxeles
      return pEl.scrollHeight <= availableHeight;
    };

    // Probar con el máximo primero
    pEl.style.fontSize = `${maxPxClamped}px`;
    if (cabe()) {
      setFontSizePx(maxPxClamped);
      return;
    }

    // Búsqueda binaria para encontrar el mayor font-size que cabe
    let low = minPx;
    let high = maxPxClamped;
    let best = minPx;

    for (let i = 0; i < 20 && high - low > 0.5; i++) {
      const mid = (low + high) / 2;
      pEl.style.fontSize = `${mid}px`;

      if (cabe()) {
        best = mid;
        low = mid;
      } else {
        high = mid;
      }
    }

    setFontSizePx(best);
  };

  useLayoutEffect(() => {
    // Esperar a que el layout esté estable (animaciones/tipografías)
    const raf = window.requestAnimationFrame(() => {
      ajustarTextoParaQuepa();
    });
    return () => window.cancelAnimationFrame(raf);
  }, [parrafo, titulo, mostrarTitulo, tamañoParrafo]);

  useEffect(() => {
    const handleResize = () => ajustarTextoParaQuepa();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <motion.div
      initial={{opacity: 0, y: 50, scale: 0.95}}
      animate={{opacity: 1, y: 0, scale: 1}}
      exit={{opacity: 0, y: -50, scale: 0.95}}
      transition={{duration: 0.8, ease: "easeOut"}}
      className="text-center z-10 relative w-screen h-screen flex flex-col justify-center px-[4vw] py-[4vh]"
    >
      {/* Title with enhanced styling - Solo mostrar si mostrarTitulo es true */}
      {mostrarTitulo && (
        <motion.h1
          initial={{opacity: 0, y: 20}}
          animate={{opacity: 1, y: 0}}
          exit={{opacity: 0, y: -20}}
          transition={{delay: 0.2, duration: 0.6}}
          className={`${configuracion?.fontSize?.titulo || "text-5xl"} font-bold mb-6 tracking-wide`}
          style={{color: configuracion?.colorSecundario || "#ffffff"}}
        >
          {titulo}
        </motion.h1>
      )}

      {/* Content with enhanced glass morphism */}
      <motion.div
        initial={{opacity: 0, scale: 0.9}}
        animate={{opacity: 1, scale: 1}}
        transition={{delay: mostrarTitulo ? 0.4 : 0.2, duration: 0.6}}
        className="relative flex-1 min-h-0 flex flex-col"
      >
        <div
          ref={textBoxRef}
          className="relative z-10 flex-1 min-h-0 flex items-center justify-center"
        >
          <motion.div
            key={parrafo}
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.5}}
            className="w-full"
          >
            <p
              ref={paragraphRef}
              className={`${tamañoParrafo} font-semibold leading-snug whitespace-pre-wrap`}
              style={{
                color: configuracion.colorSecundario,
                lineHeight: 1.3,
                fontSize: fontSizePx ? `${fontSizePx}px` : undefined,
                overflow: "hidden",
              }}
            >
              {parrafo}
            </p>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ModernTextDisplay;
