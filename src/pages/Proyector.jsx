import {useCallback, useEffect, useReducer, useRef, useState} from "react";
import {LazyMotion, domAnimation, m, AnimatePresence} from "framer-motion";
import ModernMultimediaRenderer from "../components/ModernMultimediaRenderer";
import ModernTextDisplay from "../components/ModernTextDisplay";
import ModernWelcomeScreen from "../components/ModernWelcomeScreen";
import ParticleBackground from "../components/ParticleBackground";
import PlantillaGSAP from "../components/PlantillaGSAP";
import TimerDisplay from "../components/TimerDisplay";
import ErrorBoundary from "../components/ErrorBoundary";
import {useIpcListener} from "../hooks/useIpcListener";
import {useProyectorConfig} from "../hooks/useProyectorConfig";
import {useBackground} from "../hooks/useBackground";
import {useMultimediaControl} from "../hooks/useMultimediaControl";
import {setupConsoleSilencer} from "../utils/consoleSilencer";

// Silenciar logs en producción
setupConsoleSilencer();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const optimizarUrlImagen = (url) => url || null;

const precargarImagen = (url) =>
  new Promise((resolve, reject) => {
    if (!url) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.onload = () => resolve(url);
    img.onerror = () => reject(new Error(`Failed: ${url}`));
    img.src = url;
  });

const leerGsapGlobal = () => {
  try {
    return JSON.parse(
      localStorage.getItem("gsap-plantilla-global:v1") || "null",
    );
  } catch {
    return null;
  }
};

// ─── Modo reducer ─────────────────────────────────────────────────────────────

function modoReducer(_, action) {
  switch (action.type) {
    case "HIMNO":
      return "himno";
    case "MULTIMEDIA":
      return "multimedia";
    case "PRESENTACION":
      return "presentacion";
    case "SLIDE":
      return "slide";
    case "TEMPORIZADOR":
      return "temporizador";
    case "BIENVENIDA":
      return "bienvenida";
    case "ESPERA":
      return "espera";
    case "LIMPIAR":
      return action.destino ?? "bienvenida";
    default:
      return "espera";
  }
}

// ─── Componentes de slide (extraídos para evitar duplicación) ─────────────────

const SLIDE_TEXT_SHADOW_TITLE =
  "0 2px 8px rgba(0,0,0,0.9), 0 0 30px rgba(0,0,0,0.5)";
const SLIDE_TEXT_SHADOW_CONTENT = "0 1px 4px rgba(0,0,0,0.9)";
const TEXT_QUALITY = {
  textRendering: "optimizeLegibility",
  WebkitFontSmoothing: "antialiased",
};

function SlideContentBlock({sl}) {
  return (
    <div
      className="relative z-10 size-full flex flex-col px-8 py-6 overflow-hidden"
      style={{
        fontFamily: sl.fontFamily || "inherit",
        justifyContent:
          sl.verticalAlign === "top"
            ? "flex-start"
            : sl.verticalAlign === "bottom"
              ? "flex-end"
              : "center",
        alignItems:
          sl.textAlign === "left"
            ? "flex-start"
            : sl.textAlign === "right"
              ? "flex-end"
              : "center",
      }}
    >
      {sl.title && (
        <m.h1
          className="mb-4 leading-tight"
          style={{
            fontSize: sl.titleFontSize || "4rem",
            color: sl.textColor || "#ffffff",
            textAlign: sl.textAlign || "center",
            fontWeight: sl.titleBold !== false ? "bold" : "normal",
            fontStyle: sl.titleItalic ? "italic" : "normal",
            textDecoration: sl.titleUnderline ? "underline" : "none",
            textShadow:
              sl.textShadow !== false ? SLIDE_TEXT_SHADOW_TITLE : "none",
            ...TEXT_QUALITY,
          }}
          initial={{opacity: 0, y: 30}}
          animate={{opacity: 1, y: 0}}
          transition={{delay: 0.2, duration: 0.6}}
        >
          {sl.title}
        </m.h1>
      )}
      {sl.content && (
        <m.div
          className="leading-relaxed overflow-hidden"
          style={{
            fontSize: sl.fontSize || "2.5rem",
            color: sl.textColor || "#ffffff",
            textAlign: sl.textAlign || "center",
            fontWeight: sl.contentBold ? "bold" : "normal",
            fontStyle: sl.contentItalic ? "italic" : "normal",
            textDecoration: sl.contentUnderline ? "underline" : "none",
            textShadow:
              sl.textShadow !== false ? SLIDE_TEXT_SHADOW_CONTENT : "none",
            ...TEXT_QUALITY,
          }}
          initial={{opacity: 0, y: 30}}
          animate={{opacity: 1, y: 0}}
          transition={{delay: 0.4, duration: 0.6}}
        >
          {sl.content.split("\n").map((line, i) => (
            <p
              key={`line-${sl.id || 0}-${i}-${line.slice(0, 10)}`}
              className="mb-3"
            >
              {line}
            </p>
          ))}
        </m.div>
      )}
    </div>
  );
}

const isPptxSlide = (sl) =>
  sl?.renderMode === "pptx" || sl?.layout === "pptx-image";

function SlideWrapper({sl, children, counter}) {
  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center text-center relative overflow-hidden"
      style={{
        backgroundColor: sl.backgroundColor || "rgba(0,0,0,0.3)",
        color: sl.textColor || "#ffffff",
        backgroundImage: sl.backgroundImage
          ? `url(${optimizarUrlImagen(sl.backgroundImage)})`
          : "none",
        backgroundSize: isPptxSlide(sl) ? "contain" : "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {!isPptxSlide(sl) && (sl.overlayOpacity ?? 0.3) > 0 && (
        <div
          className="absolute inset-0 rounded-xl"
          style={{backgroundColor: `rgba(0,0,0,${sl.overlayOpacity ?? 0.3})`}}
        />
      )}
      {children}
      {counter && !isPptxSlide(sl) && (
        <m.div
          className="absolute bottom-4 right-4 bg-gray-950/50 rounded-lg px-2.5 py-1 border border-white/10"
          initial={{opacity: 0}}
          animate={{opacity: 1}}
          transition={{delay: 0.6}}
        >
          <p className="text-xs font-medium text-white/70">{counter}</p>
        </m.div>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

const Proyector = () => {
  // ── Cursor y estilos globales ──────────────────────────────────────────────
  const prevCursorRef = useRef({html: "", body: ""});
  const prevStylesRef = useRef({});

  useEffect(() => {
    const h = document.documentElement,
      b = document.body;
    prevCursorRef.current = {
      html: h?.style?.cursor || "",
      body: b?.style?.cursor || "",
    };
    if (h?.style) h.style.cursor = "none";
    if (b?.style) b.style.cursor = "none";
    return () => {
      if (h?.style) h.style.cursor = prevCursorRef.current.html;
      if (b?.style) b.style.cursor = prevCursorRef.current.body;
    };
  }, []);

  useEffect(() => {
    const h = document.documentElement,
      b = document.body;
    prevStylesRef.current = {
      htmlBg: h?.style?.backgroundColor || "",
      bodyBg: b?.style?.backgroundColor || "",
      htmlColor: h?.style?.color || "",
      bodyColor: b?.style?.color || "",
      htmlOverflow: h?.style?.overflow || "",
      bodyOverflow: b?.style?.overflow || "",
    };
    const apply = (el) => {
      el.style.backgroundColor = "#000";
      el.style.color = "#fff";
      el.style.overflow = "hidden";
    };
    if (h?.style) apply(h);
    if (b?.style) apply(b);
    return () => {
      const p = prevStylesRef.current;
      if (h?.style) {
        h.style.backgroundColor = p.htmlBg;
        h.style.color = p.htmlColor;
        h.style.overflow = p.htmlOverflow;
      }
      if (b?.style) {
        b.style.backgroundColor = p.bodyBg;
        b.style.color = p.bodyColor;
        b.style.overflow = p.bodyOverflow;
      }
    };
  }, []);

  // ── Inyectar estilos de renderizado de alta calidad ────────────────────────
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      * { text-rendering:optimizeLegibility!important; -webkit-font-smoothing:antialiased!important; -moz-osx-font-smoothing:grayscale!important; backface-visibility:hidden!important; }
      img { image-rendering:high-quality!important; }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  // ── Modo unificado ─────────────────────────────────────────────────────────
  const [modo, dispatchModo] = useReducer(modoReducer, "bienvenida");

  // ── Estado de contenido ────────────────────────────────────────────────────
  const [parrafo, setParrafo] = useState("");
  const [titulo, setTitulo] = useState("");
  const [numero, setNumero] = useState("");
  const [showContent, setShowContent] = useState(true);

  // ── Seguimiento de himno (refs para evitar closures stale) ─────────────────
  const himnoActualRef = useRef(""); // "titulo-numero" del himno activo
  const tituloMostradoRef = useRef(false); // si ya mostramos el título como párrafo
  const [mostrarTituloHimno, setMostrarTituloHimno] = useState(true);

  // ── Estados secundarios ────────────────────────────────────────────────────
  const [timerData, setTimerData] = useState(null);
  const [multimediaActiva, setMultimediaActiva] = useState(null);
  const [tieneMultiplesMonitores, setTieneMultiplesMonitores] = useState(false);
  const tieneMultiplesMonitoresRef = useRef(false);
  const [presentacionActiva, setPresentacionActiva] = useState(null);
  const [slideActual, setSlideActual] = useState(0);
  const [presentaciones, setPresentaciones] = useState([]);
  const [slideData, setSlideData] = useState(null);
  const [gsapGlobal, setGsapGlobal] = useState(leerGsapGlobal);
  const [efectosActivos, setEfectosActivos] = useState(true);
  const [transicionSuave, setTransicionSuave] = useState(true);
  const [imagenesConError, setImagenesConError] = useState(new Set());
  const [imagenCargando, setImagenCargando] = useState(false);

  useEffect(() => {
    tieneMultiplesMonitoresRef.current = tieneMultiplesMonitores;
  }, [tieneMultiplesMonitores]);

  // ── Hooks especializados ───────────────────────────────────────────────────
  const {configuracion, reload: reloadConfig} = useProyectorConfig();
  const background = useBackground({modo, configuracion});

  // Ref estable para limpiarProyector (evita stale closure en useMultimediaControl)
  const limpiarRef = useRef(null);
  useMultimediaControl({multimediaActiva, limpiarRef});

  // ── limpiarProyector ───────────────────────────────────────────────────────
  const limpiarProyector = useCallback(() => {
    const reset = () => {
      setParrafo("");
      setTitulo("");
      setNumero("");
      setMultimediaActiva(null);
      setTimerData(null);
      himnoActualRef.current = "";
      tituloMostradoRef.current = false;
      setMostrarTituloHimno(true);
      setPresentacionActiva(null);
      setSlideData(null);
      setSlideActual(0);
      dispatchModo({type: "BIENVENIDA"});
      setShowContent(true);
    };
    if (transicionSuave) {
      setShowContent(false);
      setTimeout(reset, 600);
    } else {
      reset();
    }
  }, [transicionSuave]);

  // Mantener limpiarRef sincronizado
  useEffect(() => {
    limpiarRef.current = limpiarProyector;
  }, [limpiarProyector]);

  // ── Handlers IPC (useCallback — deps mínimas vía refs) ────────────────────

  const handleMostrarHimno = useCallback((_, data) => {
    const idHimno = `${data.titulo}-${data.numero}`;

    // Himno nuevo → mostrar título como primera "diapositiva"
    if (idHimno !== himnoActualRef.current) {
      himnoActualRef.current = idHimno;
      tituloMostradoRef.current = false;
    }

    if (!tituloMostradoRef.current) {
      tituloMostradoRef.current = true;
      setParrafo(data.titulo); // título como párrafo en la primera proyección
      setTitulo("");
    } else {
      setParrafo(data.parrafo);
      setTitulo("");
    }
    setNumero(data.numero);
    setMostrarTituloHimno(false);
    setMultimediaActiva(null);
    setShowContent(true);
    dispatchModo({type: "HIMNO"});
  }, []);

  const handleMostrarVersiculo = useCallback(
    (_, {parrafo: p, titulo: t, numero: n, origen}) => {
      if (origen === "clear") {
        limpiarProyector();
        return;
      }
      setMostrarTituloHimno(true);
      himnoActualRef.current = "";
      tituloMostradoRef.current = false;
      setMultimediaActiva(null);
      if (origen === "biblia") {
        setTitulo(`${t} ${n}`);
        setParrafo(p || "No disponible");
        setNumero("");
      } else {
        setTitulo(t || "Himno");
        setParrafo(p || "No disponible");
        setNumero(n || "");
      }
      setShowContent(true);
      dispatchModo({type: "HIMNO"});
    },
    [limpiarProyector],
  );

  const handleMostrarMultimedia = useCallback((_, mediaData) => {
    if (!mediaData?.tipo || !mediaData?.url) return;
    if (
      !mediaData.url.startsWith("http://") &&
      !mediaData.url.startsWith("https://")
    )
      return;
    setParrafo("");
    setTitulo("");
    setNumero("");
    setMultimediaActiva(mediaData);
    setShowContent(true);
    dispatchModo({type: "MULTIMEDIA"});
  }, []);

  const handleLimpiarProyector = useCallback(
    () => limpiarProyector(),
    [limpiarProyector],
  );

  const handleActualizarMultimediaActiva = useCallback((_, data) => {
    if (!data?.url || !data?.tipo) return;
    setParrafo("");
    setTitulo("");
    setNumero("");
    setMultimediaActiva(data);
    setShowContent(true);
    dispatchModo({type: "MULTIMEDIA"});
  }, []);

  const handleLimpiarMultimediaActiva = useCallback(() => {
    if (modo !== "multimedia") return;
    setMultimediaActiva(null);
    setParrafo("");
    setTitulo("");
    setNumero("");
    setShowContent(true);
    dispatchModo({type: "BIENVENIDA"});
  }, [modo]);

  const handleMostrarPresentacion = useCallback((_, pres) => {
    setPresentacionActiva(pres);
    setSlideActual(pres.slideActual || 0);
    dispatchModo({type: "PRESENTACION"});
  }, []);

  const handleCambiarSlide = useCallback((_, {presentacionId, slideIndex}) => {
    setPresentacionActiva((prev) => {
      if (prev?.id === presentacionId) setSlideActual(slideIndex);
      return prev;
    });
  }, []);

  const handleDetenerPresentacion = useCallback(() => {
    setPresentacionActiva(null);
    setSlideActual(0);
    dispatchModo({type: "BIENVENIDA"});
  }, []);

  const handleProyectarSlideData = useCallback((_, sd) => {
    if (!sd?.slide) return;
    setShowContent(true);
    setSlideData(sd);
    setSlideActual(0);
    setPresentacionActiva(null);
    setTitulo("");
    setParrafo("");
    setNumero("");
    setMultimediaActiva(null);
    dispatchModo({type: "SLIDE"});
  }, []);

  const handleMostrarTemporizador = useCallback((_, data) => {
    setTimerData(data);
    setShowContent(true);
    dispatchModo({type: "TEMPORIZADOR"});
  }, []);

  const handleConfigurarMonitores = useCallback((_, data) => {
    setTieneMultiplesMonitores(data.tieneMultiplesMonitores);
    dispatchModo({
      type: data.tieneMultiplesMonitores ? "BIENVENIDA" : "ESPERA",
    });
  }, []);

  // ── Registrar listeners IPC ────────────────────────────────────────────────
  useIpcListener("mostrar-himno", handleMostrarHimno);
  useIpcListener("mostrar-versiculo", handleMostrarVersiculo);
  useIpcListener("mostrar-multimedia", handleMostrarMultimedia);
  useIpcListener("proyectar-multimedia-data", handleMostrarMultimedia);
  useIpcListener("limpiar-proyector", handleLimpiarProyector);
  useIpcListener(
    "actualizar-multimedia-activa",
    handleActualizarMultimediaActiva,
  );
  useIpcListener("limpiar-multimedia-activa", handleLimpiarMultimediaActiva);
  useIpcListener("mostrar-presentacion", handleMostrarPresentacion);
  useIpcListener("cambiar-slide", handleCambiarSlide);
  useIpcListener("detener-presentacion", handleDetenerPresentacion);
  useIpcListener("proyectar-slide-data", handleProyectarSlideData);
  useIpcListener("mostrar-temporizador", handleMostrarTemporizador);
  useIpcListener("configurar-monitores", handleConfigurarMonitores);

  // ── Handshake al arrancar ──────────────────────────────────────────────────
  useEffect(() => {
    try {
      window.electron?.send?.("proyector-ready", {ts: Date.now()});
    } catch {
      /* noop */
    }
  }, []);

  // ── Carga inicial de presentaciones y multimedia activa ────────────────────
  useEffect(() => {
    const init = async () => {
      // Multimedia activa
      try {
        const m = await window.electron?.obtenerMultimediaActiva?.();
        if (m?.url && m?.tipo) {
          setMultimediaActiva(m);
          setParrafo("");
          setTitulo("");
          setNumero("");
          setShowContent(true);
          dispatchModo({type: "MULTIMEDIA"});
        }
      } catch {
        /* noop */
      }

      // Presentaciones
      try {
        const list = await window.electron?.obtenerPresentacionesSlides?.();
        if (list?.length) {
          setPresentaciones(
            list.map((p) => ({
              id: p.id,
              name: p.nombre,
              slides: Array.isArray(p.slides)
                ? p.slides
                : JSON.parse(p.slides || "[]"),
              description: p.descripcion || "",
              createdAt: p.created_at,
              lastModified: p.last_modified,
              slideActual: p.slide_actual || 0,
            })),
          );
        }
      } catch {
        /* noop */
      }
    };
    init();
  }, []);

  // ── localStorage fallback para slide data ──────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "proyector-slide-data:v1") {
        try {
          handleProyectarSlideData(null, JSON.parse(e.newValue));
        } catch {
          /* noop */
        }
      }
      if (e.key === "gsap-plantilla-global:v1") {
        try {
          setGsapGlobal(e.newValue ? JSON.parse(e.newValue) : null);
        } catch {
          /* noop */
        }
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [handleProyectarSlideData]);

  // ── Precargar imagen de slide activo ──────────────────────────────────────
  useEffect(() => {
    const bgImage = presentacionActiva?.slides?.[slideActual]?.backgroundImage;
    if (!bgImage) {
      setImagenCargando(false);
      return;
    }
    setImagenCargando(true);
    precargarImagen(optimizarUrlImagen(bgImage))
      .then(() => setImagenCargando(false))
      .catch(() => {
        setImagenesConError((prev) => new Set([...prev, bgImage]));
        setImagenCargando(false);
      });
  }, [presentacionActiva, slideActual]);

  // ── Teclado ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      switch (e.key) {
        case "Escape":
          limpiarProyector();
          break;
        case "F5":
          reloadConfig();
          background.reload();
          break;
        case "F6":
          if (background.usandoFondoDefecto)
            background.seleccionarVideoDefecto();
          break;
        case "F7":
          setEfectosActivos((p) => !p);
          break;
        case "F8":
          setTransicionSuave((p) => !p);
          break;
        case " ":
          if (modo === "multimedia" && multimediaActiva?.tipo === "video") {
            const v = document.querySelector(".multimedia-video");
            if (v) {
              v.paused ? v.play() : v.pause();
            }
            e.preventDefault();
          }
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [limpiarProyector, reloadConfig, background, modo, multimediaActiva]);

  // ── Condiciones de render ──────────────────────────────────────────────────
  const isVideoBackground =
    modo === "multimedia" && multimediaActiva?.tipo === "video";
  const hideBg = isVideoBackground || modo === "slide";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <ErrorBoundary>
      <LazyMotion features={domAnimation} strict>
        <m.div
          initial={{opacity: 0}}
          animate={{opacity: 1}}
          transition={{duration: 0.8}}
          className="w-full h-screen flex flex-col items-center justify-center text-white relative overflow-hidden cursor-none"
          style={{
            backgroundColor: "#030712",
            imageRendering: "crisp-edges",
            textRendering: "optimizeLegibility",
            WebkitFontSmoothing: "antialiased",
            MozOsxFontSmoothing: "grayscale",
            backfaceVisibility: "hidden",
            perspective: "1000px",
            cursor: "none",
          }}
        >
          {/* ── Fondos dinámicos con crossfade ── */}
          {!hideBg && (
            <>
              <AnimatePresence>
                {background.fondoPrevio && (
                  <m.div
                    key={`previo-${background.fondoPrevio.url}`}
                    className="absolute top-0 left-0 size-full -z-20"
                    initial={{opacity: 1}}
                    animate={{opacity: 1}}
                    exit={{opacity: 0}}
                    transition={{duration: 1.2, ease: "easeInOut"}}
                  >
                    {background.fondoPrevio.tipo === "imagen" ? (
                      <div
                        className="w-full h-full bg-cover bg-center bg-no-repeat"
                        style={{
                          backgroundImage: `url(${background.fondoPrevio.url})`,
                          filter: "contrast(1.1) brightness(1.05)",
                          backfaceVisibility: "hidden",
                        }}
                      />
                    ) : (
                      <video
                        className="w-full h-full object-cover bg-gray-950"
                        src={background.fondoPrevio.url}
                        autoPlay
                        loop
                        muted
                        playsInline
                        style={{
                          filter: "contrast(1.05) brightness(1.02)",
                          backfaceVisibility: "hidden",
                        }}
                      />
                    )}
                  </m.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                <m.div
                  key={background.fondoActual}
                  className="absolute top-0 left-0 size-full -z-10"
                  initial={{opacity: 0}}
                  animate={{opacity: 1}}
                  exit={{opacity: 0}}
                  transition={{duration: 1.0, ease: "easeInOut"}}
                >
                  {background.fondoActivo?.tipo === "imagen" ? (
                    <div
                      className="w-full h-full bg-cover bg-center bg-no-repeat"
                      style={{
                        backgroundImage: `url(${background.fondoActual})`,
                        filter: "contrast(1.1) brightness(1.05)",
                        backfaceVisibility: "hidden",
                      }}
                    />
                  ) : (
                    <video
                      className="w-full h-full object-cover bg-gray-950"
                      src={background.fondoActual}
                      autoPlay
                      loop
                      muted
                      playsInline
                      preload="auto"
                      style={{
                        filter: "contrast(1.05) brightness(1.02)",
                        backfaceVisibility: "hidden",
                      }}
                      onError={() => {
                        if (!background.usandoFondoDefecto)
                          background.seleccionarVideoDefecto();
                      }}
                    />
                  )}
                </m.div>
              </AnimatePresence>

              <m.div
                className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/30 -z-5"
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                transition={{duration: 2}}
              />
            </>
          )}

          {/* ── Partículas ── */}
          <ParticleBackground
            mode={modo}
            isActive={
              efectosActivos && modo !== "multimedia" && modo !== "slide"
            }
          />

          {/* ── Multimedia ── */}
          <AnimatePresence mode="wait">
            {modo === "multimedia" && showContent && (
              <ModernMultimediaRenderer multimediaActiva={multimediaActiva} />
            )}
          </AnimatePresence>

          {/* ── Pantalla de bienvenida ── */}
          <AnimatePresence>
            {modo === "bienvenida" && !parrafo && showContent && (
              <ModernWelcomeScreen configuracion={configuracion} />
            )}
          </AnimatePresence>

          {/* ── Pantalla de espera (fade en lugar de negro abrupto) ── */}
          <AnimatePresence>
            {modo === "espera" && (
              <m.div
                key="espera"
                className="absolute inset-0 bg-gray-950 z-50"
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                exit={{opacity: 0}}
                transition={{duration: 0.5}}
              />
            )}
          </AnimatePresence>

          {/* ── Badge número de himno ── */}
          <AnimatePresence>
            {numero && modo === "himno" && showContent && (
              <m.div
                className="absolute top-8 right-12 z-30"
                initial={{opacity: 0, x: 20, scale: 0.8}}
                animate={{opacity: 1, x: 0, scale: 1}}
                exit={{opacity: 0, x: 20, scale: 0.8}}
                transition={{duration: 0.5, ease: "easeOut"}}
              >
                <div className="backdrop-blur-md bg-white/10 rounded-xl px-6 py-3 border border-white/20">
                  <p className="text-2xl font-bold text-white">{numero}</p>
                </div>
              </m.div>
            )}
          </AnimatePresence>

          {/* ── Texto: himnos y versículos ── */}
          <AnimatePresence mode="wait">
            {parrafo &&
              showContent &&
              modo === "himno" &&
              (gsapGlobal?.plantillaId &&
              gsapGlobal.plantillaId !== "ninguna" ? (
                <div
                  key={`gsap-${gsapGlobal.plantillaId}`}
                  className="absolute inset-0 z-10 w-full h-screen"
                >
                  <PlantillaGSAP
                    titulo={titulo?.trim() || ""}
                    texto={parrafo}
                    plantillaId={gsapGlobal.plantillaId}
                    config={gsapGlobal.config || {}}
                    configuracion={configuracion}
                  />
                </div>
              ) : (
                <ModernTextDisplay
                  titulo={titulo}
                  parrafo={parrafo}
                  configuracion={configuracion}
                  mostrarTitulo={mostrarTituloHimno}
                />
              ))}
          </AnimatePresence>

          {/* ── Presentación completa ── */}
          <AnimatePresence mode="wait">
            {modo === "presentacion" && presentacionActiva && showContent && (
              <m.div
                key={`${presentacionActiva.id}-${slideActual}`}
                className="w-full h-screen flex items-center justify-center relative z-20 overflow-hidden"
                initial={{opacity: 0, y: 50}}
                animate={{opacity: 1, y: 0}}
                exit={{opacity: 0, y: -50}}
                transition={{duration: 0.6, ease: "easeOut"}}
              >
                {presentacionActiva.slides?.[slideActual] &&
                  (() => {
                    const sl = presentacionActiva.slides[slideActual];
                    const bgImg = sl.backgroundImage;
                    const bgStyle =
                      bgImg && !imagenesConError.has(bgImg)
                        ? `url(${optimizarUrlImagen(bgImg)})`
                        : "none";
                    return (
                      <SlideWrapper
                        sl={{
                          ...sl,
                          backgroundImage: bgStyle !== "none" ? bgImg : null,
                        }}
                        counter={`${slideActual + 1} / ${presentacionActiva.slides?.length || 0}`}
                      >
                        {imagenCargando && (
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-950/50 z-5">
                            <div className="flex items-center gap-x-3 text-white">
                              <div className="animate-spin rounded-full size-8 border-b-2 border-white" />
                              <span className="text-lg font-medium">
                                Cargando imagen…
                              </span>
                            </div>
                          </div>
                        )}
                        <SlideContentBlock sl={sl} />
                      </SlideWrapper>
                    );
                  })()}
              </m.div>
            )}
          </AnimatePresence>

          {/* ── Temporizador ── */}
          {modo === "temporizador" && timerData && showContent && (
            <div className="absolute inset-0 z-40">
              <TimerDisplay
                segundos={timerData.segundos}
                total={timerData.total}
                mensaje={timerData.mensaje}
                terminado={timerData.terminado}
                fondo={timerData.fondo ?? null}
              />
            </div>
          )}

          {/* ── Slide individual ── */}
          <AnimatePresence mode="wait">
            {modo === "slide" &&
              slideData?.slide &&
              showContent &&
              (slideData.slide?.gsapTemplate ? (
                <div
                  key={`gsap-slide-${slideData.slide.id}`}
                  className="absolute inset-0 z-30"
                >
                  <PlantillaGSAP
                    titulo={slideData.slide.title || ""}
                    texto={slideData.slide.content || ""}
                    plantillaId={slideData.slide.gsapTemplate}
                    config={slideData.slide.gsapConfig || {}}
                  />
                </div>
              ) : (
                <m.div
                  key={`slide-${slideData.slide?.id || Date.now()}`}
                  className="w-full h-screen flex items-center justify-center relative z-30 overflow-hidden"
                  initial={{opacity: 0, y: 50}}
                  animate={{opacity: 1, y: 0}}
                  exit={{opacity: 0, y: -50}}
                  transition={{duration: 0.6, ease: "easeOut"}}
                >
                  <SlideWrapper
                    sl={slideData.slide}
                    counter={
                      slideData.presentation
                        ? `${slideData.presentation.currentIndex + 1} / ${slideData.presentation.totalSlides || 1}`
                        : null
                    }
                  >
                    <SlideContentBlock sl={slideData.slide} />
                  </SlideWrapper>
                </m.div>
              ))}
          </AnimatePresence>
        </m.div>
      </LazyMotion>
    </ErrorBoundary>
  );
};

export default Proyector;
