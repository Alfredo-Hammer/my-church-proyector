import {createContext, useContext, useState, useCallback, useEffect, useRef} from "react";

const NowPlayingContext = createContext();

export const useNowPlaying = () => {
  const ctx = useContext(NowPlayingContext);
  if (!ctx) {
    throw new Error("useNowPlaying debe usarse dentro de NowPlayingProvider");
  }
  return ctx;
};

// Contexto global de "qué himno se está proyectando ahora", independiente de
// qué página esté montada. Permite que el operador navegue a la lista de
// himnos para buscar el siguiente mientras el actual sigue en pantalla, y que
// las flechas ←/→ avancen la proyección desde cualquier página.
export const NowPlayingProvider = ({children}) => {
  const [activeHimno, setActiveHimno] = useState(null); // {numero, titulo, tipo}
  const [slides, setSlides] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Espejo en ref para que las acciones (irA/siguiente/anterior) lean el
  // estado más reciente sin quedar atadas a un closure viejo del listener
  // global de teclado.
  const stateRef = useRef({activeHimno: null, slides: [], currentIndex: 0});
  useEffect(() => {
    stateRef.current = {activeHimno, slides, currentIndex};
  }, [activeHimno, slides, currentIndex]);

  const enviarSlide = useCallback((himno, slidesArr, idx) => {
    if (!himno || !window.electron?.enviarHimno) return;
    const slide = slidesArr[idx];
    window.electron.enviarHimno({
      parrafo: slide?.texto ?? "",
      titulo: himno.titulo,
      numero: himno.numero,
      origen: "himno",
    });
  }, []);

  const proyectar = useCallback((himno, slidesArr, startIndex = 0) => {
    if (!himno || !Array.isArray(slidesArr) || slidesArr.length === 0) return;
    const idx = Math.max(0, Math.min(slidesArr.length - 1, startIndex));
    window.electron?.abrirProyector?.();
    setActiveHimno(himno);
    setSlides(slidesArr);
    setCurrentIndex(idx);
    enviarSlide(himno, slidesArr, idx);
  }, [enviarSlide]);

  const irA = useCallback((index) => {
    const {activeHimno: himno, slides: slidesArr} = stateRef.current;
    if (!himno || slidesArr.length === 0) return;
    const clamped = Math.max(0, Math.min(slidesArr.length - 1, index));
    setCurrentIndex(clamped);
    enviarSlide(himno, slidesArr, clamped);
  }, [enviarSlide]);

  const siguiente = useCallback(() => {
    irA(stateRef.current.currentIndex + 1);
  }, [irA]);

  const anterior = useCallback(() => {
    irA(stateRef.current.currentIndex - 1);
  }, [irA]);

  const detener = useCallback(() => {
    if (window.electron?.enviarVersiculo) {
      window.electron.enviarVersiculo({
        parrafo: "",
        titulo: "",
        numero: "",
        origen: "clear",
      });
    }
    setActiveHimno(null);
    setSlides([]);
    setCurrentIndex(0);
  }, []);

  // Refresca los slides del himno activo (p.ej. tras editar un párrafo) sin
  // arrancar una proyección nueva. No hace nada si el himno editado no es el
  // que está actualmente en pantalla.
  const actualizarSlidesActivos = useCallback((himno, slidesArr, nuevoIndex) => {
    const actual = stateRef.current.activeHimno;
    if (!actual || !himno) return;
    if (actual.numero !== himno.numero || actual.tipo !== himno.tipo) return;
    const idx = Math.max(
      0,
      Math.min(slidesArr.length - 1, nuevoIndex ?? stateRef.current.currentIndex),
    );
    setSlides(slidesArr);
    setCurrentIndex(idx);
    enviarSlide(actual, slidesArr, idx);
  }, [enviarSlide]);

  const esActivo = useCallback((numero, tipo) => {
    const actual = stateRef.current.activeHimno;
    return Boolean(actual && actual.numero === numero && actual.tipo === tipo);
  }, []);

  // Navegación global con flechas — funciona desde cualquier página mientras
  // no haya un input/textarea enfocado, para que el operador pueda buscar el
  // siguiente himno mientras el actual sigue proyectado.
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (["INPUT", "TEXTAREA"].includes(e.target?.tagName)) return;
      if (!stateRef.current.activeHimno) return;
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        anterior();
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        siguiente();
      } else if (e.key === "Escape") {
        e.preventDefault();
        detener();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [siguiente, anterior, detener]);

  const value = {
    activeHimno,
    slides,
    currentIndex,
    isActive: Boolean(activeHimno),
    proyectar,
    irA,
    siguiente,
    anterior,
    detener,
    actualizarSlidesActivos,
    esActivo,
  };

  return (
    <NowPlayingContext.Provider value={value}>
      {children}
    </NowPlayingContext.Provider>
  );
};
