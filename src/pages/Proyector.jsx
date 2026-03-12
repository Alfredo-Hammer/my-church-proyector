import {useEffect, useRef, useState} from "react";
import {motion, AnimatePresence} from "framer-motion";
import ModernMultimediaRenderer from "../components/ModernMultimediaRenderer";
import ModernTextDisplay from "../components/ModernTextDisplay";
import ModernWelcomeScreen from "../components/ModernWelcomeScreen";
import ParticleBackground from "../components/ParticleBackground";

// Función para obtener la URL base del servidor multimedia
const getBaseURL = () => {
  return "http://localhost:3001";
};

// ✨ FUNCIÓN PARA OPTIMIZAR CARGA DE IMÁGENES - ALTA CALIDAD
const optimizarUrlImagen = (url) => {
  if (!url) return null;

  try {
    // Las imágenes de Pixabay ahora se descargan localmente,
    // así que solo retornamos la URL sin necesidad de proxy
    return url;
  } catch (error) {
    console.error("❌ [Proyector] Error optimizando imagen:", error);
    return url;
  }
};

// ✨ FUNCIÓN PARA PRECARGAR IMÁGENES
const precargarImagen = (url) => {
  return new Promise((resolve, reject) => {
    if (!url) {
      resolve(null);
      return;
    }

    const img = new Image();
    img.onload = () => {
      console.log("✅ [Proyector] Imagen precargada:", url);
      resolve(url);
    };
    img.onerror = () => {
      console.warn("⚠️ [Proyector] Error cargando imagen:", url);
      reject(new Error(`Failed to load image: ${url}`));
    };
    img.src = url;
  });
};

// ✨ VIDEOS POR DEFECTO COMO FALLBACK
const videosDefecto = ["fondo.mp4", "video1.mp4", "video2.mp4", "video3.mp4"];

const getRandomVideoDefecto = () => {
  const idx = Math.floor(Math.random() * videosDefecto.length);
  return `/videos/${videosDefecto[idx]}`;
};

// ✨ COMPONENTE DE PARTÍCULAS ANIMADAS
<ParticleBackground />;

// ✨ COMPONENTE DE PANTALLA DE BIENVENIDA MODERNA
<ModernWelcomeScreen />;

// ✨ COMPONENTE DE TEXTO MODERNO
<ModernTextDisplay />;

// ✨ COMPONENTE MULTIMEDIA MEJORADO CON MEJOR MANEJO DE ERRORES
<ModernMultimediaRenderer />;

// ✨ COMPONENTE PRINCIPAL ACTUALIZADO
const Proyector = () => {
  const previousCursorRef = useRef({
    html: "",
    body: "",
  });

  const previousGlobalStylesRef = useRef({
    htmlBg: "",
    bodyBg: "",
    htmlColor: "",
    bodyColor: "",
  });

  useEffect(() => {
    // Ocultar cursor del mouse en el proyector (más robusto que solo Tailwind)
    const htmlEl = document.documentElement;
    const bodyEl = document.body;

    previousCursorRef.current = {
      html: htmlEl?.style?.cursor || "",
      body: bodyEl?.style?.cursor || "",
    };

    if (htmlEl?.style) htmlEl.style.cursor = "none";
    if (bodyEl?.style) bodyEl.style.cursor = "none";

    return () => {
      if (htmlEl?.style) htmlEl.style.cursor = previousCursorRef.current.html;
      if (bodyEl?.style) bodyEl.style.cursor = previousCursorRef.current.body;
    };
  }, []);

  useEffect(() => {
    // Asegurar fondo oscuro SIEMPRE en el proyector.
    // La ventana del proyector carga la misma SPA que la app principal,
    // cuyo body por defecto es claro; si el fondo dinámico se oculta o falla
    // por un instante (updates de configuración, modo slide, etc.) se ve blanco.
    const htmlEl = document.documentElement;
    const bodyEl = document.body;

    previousGlobalStylesRef.current = {
      htmlBg: htmlEl?.style?.backgroundColor || "",
      bodyBg: bodyEl?.style?.backgroundColor || "",
      htmlColor: htmlEl?.style?.color || "",
      bodyColor: bodyEl?.style?.color || "",
    };

    if (htmlEl?.style) {
      htmlEl.style.backgroundColor = "#000";
      htmlEl.style.color = "#fff";
    }
    if (bodyEl?.style) {
      bodyEl.style.backgroundColor = "#000";
      bodyEl.style.color = "#fff";
    }

    return () => {
      if (htmlEl?.style) {
        htmlEl.style.backgroundColor = previousGlobalStylesRef.current.htmlBg;
        htmlEl.style.color = previousGlobalStylesRef.current.htmlColor;
      }
      if (bodyEl?.style) {
        bodyEl.style.backgroundColor = previousGlobalStylesRef.current.bodyBg;
        bodyEl.style.color = previousGlobalStylesRef.current.bodyColor;
      }
    };
  }, []);

  const [parrafo, setParrafo] = useState("");
  const [titulo, setTitulo] = useState("");
  const [numero, setNumero] = useState("");
  const [showContent, setShowContent] = useState(true);

  // ✨ ESTADO PARA CONTROLAR SI MOSTRAR TÍTULO (solo primera vez)
  const [himnoActual, setHimnoActual] = useState(""); // ID del himno actual
  const [mostrarTituloHimno, setMostrarTituloHimno] = useState(true);
  const [tituloInicialMostrado, setTituloInicialMostrado] = useState(false); // ✨ Rastrear si ya mostramos el título

  // ✨ NUEVOS ESTADOS PARA MULTIMEDIA
  const [multimediaActiva, setMultimediaActiva] = useState(null);

  // ====================================
  // Estado reproducción -> main (API móvil)
  // ====================================
  const lastPlaybackStatusSentAtRef = useRef(0);
  const youtubePlayerRef = useRef(null);
  const youtubeApiLoadingRef = useRef(false);
  const youtubeInfoRef = useRef({
    currentTime: 0,
    duration: 0,
    playerState: null,
    volume: null,
    muted: null,
    lastUpdateAt: 0,
  });

  const emitPlaybackStatus = (payload) => {
    try {
      if (!window.electron?.send) return;
      const now = Date.now();
      if (now - (lastPlaybackStatusSentAtRef.current || 0) < 250) return;
      lastPlaybackStatusSentAtRef.current = now;

      window.electron.send("multimedia-playback-status", {
        destino: "proyector",
        ...payload,
      });
    } catch {
      // noop
    }
  };

  useEffect(() => {
    if (!multimediaActiva) {
      emitPlaybackStatus({
        id: null,
        nombre: null,
        currentTime: 0,
        duration: 0,
        paused: true,
        volume: null,
        tipo: null,
      });
      return;
    }

    const multimediaTipo = String(
      multimediaActiva?.tipo || multimediaActiva?.type || "",
    )
      .trim()
      .toLowerCase();
    const multimediaUrl = String(multimediaActiva?.url || "").toLowerCase();
    const isYouTube =
      multimediaTipo === "youtube" ||
      multimediaTipo === "yt" ||
      multimediaUrl.includes("youtube.com") ||
      multimediaUrl.includes("youtu.be");

    // Reset de info de YouTube al cambiar media
    youtubeInfoRef.current = {
      currentTime: 0,
      duration: 0,
      playerState: null,
      volume: null,
      muted: null,
      lastUpdateAt: 0,
    };

    // Limpieza defensiva del player anterior
    try {
      if (!isYouTube && youtubePlayerRef.current?.destroy) {
        youtubePlayerRef.current.destroy();
      }
    } catch {
      // noop
    }
    if (!isYouTube) {
      youtubePlayerRef.current = null;
      youtubeApiLoadingRef.current = false;
    }

    // Detectar HTML5 media real por DOM (más robusto que confiar en multimediaActiva.tipo)
    const selector = "video.multimedia-video, audio.multimedia-audio";
    let el = null;
    let canceled = false;
    let retryTimer = null;

    // --- YouTube status (para barra/seek del móvil) ---
    let ytIframe = null;
    let ytDetachMessageListener = null;
    let ytPollTimer = null;
    let ytAttachTimer = null;

    const parseMaybeJson = (value) => {
      if (!value) return null;
      if (typeof value === "object") return value;
      if (typeof value !== "string") return null;
      const raw = value.trim();
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    };

    const mapYouTubePaused = (playerState) => {
      // https://developers.google.com/youtube/iframe_api_reference#Playback_status
      // -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 video cued
      if (playerState === 1) return false;
      if (playerState === 3) return false;
      return true;
    };

    const emitYouTubeFromRef = () => {
      const info = youtubeInfoRef.current || {};
      const currentTime = Number(info.currentTime);
      const duration = Number(info.duration);
      const playerState =
        info.playerState == null ? null : Number(info.playerState);
      const volRaw = Number(info.volume);
      const muted =
        info.muted == null ? null : Boolean(info.muted) || volRaw === 0;
      const volume = Number.isFinite(volRaw)
        ? Math.max(0, Math.min(1, volRaw / 100))
        : null;

      emitPlaybackStatus({
        id: multimediaActiva?.id ?? null,
        nombre: multimediaActiva?.nombre ?? null,
        currentTime:
          Number.isFinite(currentTime) && currentTime >= 0 ? currentTime : 0,
        duration: Number.isFinite(duration) && duration >= 0 ? duration : 0,
        paused: mapYouTubePaused(playerState),
        volume: muted ? 0 : volume,
        tipo: "youtube",
      });
    };

    const loadYouTubeIframeApi = () => {
      if (youtubeApiLoadingRef.current) return;
      youtubeApiLoadingRef.current = true;

      try {
        if (window.YT?.Player) return;

        // Evitar inyectar 2 veces
        const existing = document.getElementById("yt-iframe-api");
        if (existing) return;

        const tag = document.createElement("script");
        tag.id = "yt-iframe-api";
        tag.src = "https://www.youtube.com/iframe_api";
        tag.async = true;
        document.head.appendChild(tag);
      } catch {
        // noop
      }
    };

    const initYouTubePlayer = async () => {
      if (!ytIframe) return;
      if (youtubePlayerRef.current) return;

      loadYouTubeIframeApi();

      // Esperar un rato a que cargue la API
      const start = Date.now();
      while (!canceled && Date.now() - start < 6000) {
        if (window.YT?.Player) break;
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 100));
      }

      if (canceled) return;
      if (!window.YT?.Player) return;

      try {
        // Crear player sobre el iframe existente
        youtubePlayerRef.current = new window.YT.Player(ytIframe, {
          events: {
            onReady: () => {
              try {
                youtubeInfoRef.current.lastUpdateAt = Date.now();
                youtubeInfoRef.current.duration = Number(
                  youtubePlayerRef.current?.getDuration?.() || 0,
                );
                youtubeInfoRef.current.volume = Number(
                  youtubePlayerRef.current?.getVolume?.() || 0,
                );
                youtubeInfoRef.current.muted = Boolean(
                  youtubePlayerRef.current?.isMuted?.() || false,
                );
                emitYouTubeFromRef();
              } catch {
                // noop
              }
            },
            onStateChange: (ev) => {
              try {
                youtubeInfoRef.current.playerState = ev?.data;
                youtubeInfoRef.current.lastUpdateAt = Date.now();
                emitYouTubeFromRef();
              } catch {
                // noop
              }
            },
          },
        });
      } catch {
        youtubePlayerRef.current = null;
      }
    };

    const readAndEmit = () => {
      try {
        if (!el) return;
        const currentTime = Number(el.currentTime);
        const duration = Number(el.duration);
        const volume = Number(el.volume);

        const tipo =
          String(el.tagName || "").toLowerCase() === "audio"
            ? "audio"
            : String(el.tagName || "").toLowerCase() === "video"
              ? "video"
              : String(
                  multimediaActiva?.tipo || multimediaActiva?.type || "",
                ).trim() || null;

        emitPlaybackStatus({
          id: multimediaActiva?.id ?? null,
          nombre: multimediaActiva?.nombre ?? null,
          currentTime:
            Number.isFinite(currentTime) && currentTime >= 0 ? currentTime : 0,
          duration: Number.isFinite(duration) && duration >= 0 ? duration : 0,
          paused: Boolean(el.paused),
          volume: Number.isFinite(volume) ? volume : null,
          tipo,
        });
      } catch {
        // noop
      }
    };

    const attach = () => {
      if (canceled) return;

      // Si es YouTube, no intentamos buscar <video>/<audio> (no existe)
      if (isYouTube) {
        const tryAttachYouTube = () => {
          if (canceled) return;
          ytIframe = document.getElementById("youtube-player");
          if (!ytIframe) {
            ytAttachTimer = setTimeout(tryAttachYouTube, 200);
            return;
          }

          const onMessage = (ev) => {
            try {
              if (!ytIframe?.contentWindow) return;
              if (ev?.source !== ytIframe.contentWindow) return;

              const msg = parseMaybeJson(ev?.data);
              if (!msg || typeof msg !== "object") return;

              if (msg.event === "infoDelivery" && msg.info) {
                const info = msg.info;
                const ct = Number(info.currentTime);
                const dur = Number(info.duration);
                const vol = Number(info.volume);
                const muted = info.muted == null ? null : Boolean(info.muted);

                if (Number.isFinite(ct))
                  youtubeInfoRef.current.currentTime = ct;
                if (Number.isFinite(dur) && dur > 0)
                  youtubeInfoRef.current.duration = dur;
                if (Number.isFinite(vol)) youtubeInfoRef.current.volume = vol;
                if (muted != null) youtubeInfoRef.current.muted = muted;
                youtubeInfoRef.current.lastUpdateAt = Date.now();
                emitYouTubeFromRef();
              }

              if (msg.event === "onStateChange") {
                // En postMessage API, msg.info suele traer el state
                youtubeInfoRef.current.playerState = msg.info;
                youtubeInfoRef.current.lastUpdateAt = Date.now();
                emitYouTubeFromRef();
              }
            } catch {
              // noop
            }
          };

          window.addEventListener("message", onMessage);
          ytDetachMessageListener = () =>
            window.removeEventListener("message", onMessage);

          // Pedir a YouTube que empiece a enviar eventos
          try {
            ytIframe.contentWindow.postMessage(
              JSON.stringify({event: "listening", id: "youtube-player"}),
              "*",
            );
            ytIframe.contentWindow.postMessage(
              JSON.stringify({
                event: "command",
                func: "addEventListener",
                args: ["onStateChange"],
              }),
              "*",
            );
          } catch {
            // noop
          }

          // Poll por si no llegan infoDelivery (o estando pausado)
          ytPollTimer = setInterval(() => {
            try {
              if (youtubePlayerRef.current?.getCurrentTime) {
                youtubeInfoRef.current.currentTime = Number(
                  youtubePlayerRef.current.getCurrentTime() || 0,
                );
                youtubeInfoRef.current.duration = Number(
                  youtubePlayerRef.current.getDuration() || 0,
                );
                youtubeInfoRef.current.volume = Number(
                  youtubePlayerRef.current.getVolume() || 0,
                );
                youtubeInfoRef.current.muted = Boolean(
                  youtubePlayerRef.current.isMuted?.() || false,
                );
                youtubeInfoRef.current.playerState = Number(
                  youtubePlayerRef.current.getPlayerState?.() ??
                    youtubeInfoRef.current.playerState,
                );
                youtubeInfoRef.current.lastUpdateAt = Date.now();
              }
            } catch {
              // noop
            }

            emitYouTubeFromRef();
          }, 500);

          // Inicializar IFrame API si está disponible (mejora fiabilidad de seek/status)
          initYouTubePlayer();
        };

        tryAttachYouTube();

        return () => {
          try {
            if (ytAttachTimer) clearTimeout(ytAttachTimer);
            if (ytPollTimer) clearInterval(ytPollTimer);
            if (typeof ytDetachMessageListener === "function")
              ytDetachMessageListener();
          } catch {
            // noop
          }

          try {
            youtubePlayerRef.current?.destroy?.();
          } catch {
            // noop
          }

          youtubePlayerRef.current = null;
          youtubeApiLoadingRef.current = false;
        };
      }

      el = document.querySelector(selector);
      if (!el) {
        retryTimer = setTimeout(attach, 200);
        return;
      }

      const handler = () => readAndEmit();
      el.addEventListener("timeupdate", handler);
      el.addEventListener("loadedmetadata", handler);
      el.addEventListener("durationchange", handler);
      el.addEventListener("play", handler);
      el.addEventListener("pause", handler);
      el.addEventListener("ended", handler);
      el.addEventListener("seeked", handler);
      el.addEventListener("volumechange", handler);

      // Estado inicial
      readAndEmit();

      return () => {
        try {
          el?.removeEventListener("timeupdate", handler);
          el?.removeEventListener("loadedmetadata", handler);
          el?.removeEventListener("durationchange", handler);
          el?.removeEventListener("play", handler);
          el?.removeEventListener("pause", handler);
          el?.removeEventListener("ended", handler);
          el?.removeEventListener("seeked", handler);
          el?.removeEventListener("volumechange", handler);
        } catch {
          // noop
        }
      };
    };

    let detach = attach();

    return () => {
      canceled = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (typeof detach === "function") detach();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multimediaActiva]);
  const [modoProyector, setModoProyector] = useState("bienvenida"); // Iniciar en bienvenida

  // Evitar closures stale en listeners IPC registrados 1 sola vez.
  const multimediaActivaRef = useRef(null);
  const modoProyectorRef = useRef("bienvenida");
  const pendingMultimediaControlRef = useRef(null);
  const pendingMultimediaControlRetriesRef = useRef(0);
  const multimediaMountedAtRef = useRef(Date.now());
  const youtubeForcedAutoplayRef = useRef(false);

  useEffect(() => {
    multimediaActivaRef.current = multimediaActiva;
  }, [multimediaActiva]);

  useEffect(() => {
    // Resetear cola de controles cuando cambia la multimedia.
    // Evita que el contador de reintentos se quede “agotado” y los controles
    // no vuelvan a intentar al proyectar un nuevo YouTube.
    pendingMultimediaControlRef.current = null;
    pendingMultimediaControlRetriesRef.current = 0;
    multimediaMountedAtRef.current = Date.now();
    youtubeForcedAutoplayRef.current = false;
  }, [multimediaActiva?.id, multimediaActiva?.url, multimediaActiva?.tipo]);

  useEffect(() => {
    modoProyectorRef.current = modoProyector;
  }, [modoProyector]);

  // ✨ ESTADO PARA NÚMERO DE MONITORES
  const [tieneMultiplesMonitores, setTieneMultiplesMonitores] = useState(false);

  // ✨ ESTADOS PARA FONDOS DINÁMICOS
  const [fondoActivo, setFondoActivo] = useState(null);
  const [fondoActual, setFondoActual] = useState("/videos/video1.mp4");
  const [usandoFondoDefecto, setUsandoFondoDefecto] = useState(true);

  // ✨ NUEVOS ESTADOS PARA EFECTOS
  const [efectosActivos, setEfectosActivos] = useState(true);
  const [transicionSuave, setTransicionSuave] = useState(true);

  // ✨ ESTADOS PARA CONFIGURACIÓN
  const [configuracion, setConfiguracion] = useState({
    nombreIglesia: "Casa de Dios",
    eslogan: "Bienvenidos a la Casa de Dios",
    logoUrl: "/images/icon-256.png",
    logoSize: "w-80 h-80", // Tamaño del logo (w-56 h-56, w-80 h-80, w-96 h-96, etc.)
    colorPrimario: "#fb923c",
    colorSecundario: "#ffffff",
    fontSize: {
      titulo: "text-6xl",
      parrafo: "text-7xl",
      eslogan: "text-3xl",
    },
    videosFondo: videosDefecto,
    intervaloCambioVideo: 120,
    // ✨ OPCIONES DE VISIBILIDAD
    mostrarLogo: true,
    mostrarNombreIglesia: true,
    mostrarEslogan: true,
  });

  // ✨ NUEVO ESTADO PARA MANEJO DE ERRORES DE IMÁGENES
  const [imagenesConError, setImagenesConError] = useState(new Set());
  const [imagenCargando, setImagenCargando] = useState(false);

  // ✨ ESTADOS PARA PRESENTACIONES
  const [presentacionActiva, setPresentacionActiva] = useState(null);
  const [slideActual, setSlideActual] = useState(0);
  const [presentaciones, setPresentaciones] = useState([]);
  const [modoProyeccion, setModoProyeccion] = useState("bienvenida"); // bienvenida, presentacion, multimedia
  const [slideData, setSlideData] = useState(null); // ✨ DATOS DE SLIDE INDIVIDUAL

  // ✨ FUNCIÓN PARA CARGAR CONFIGURACIÓN
  const cargarConfiguracion = async () => {
    try {
      console.log("🔄 [Proyector] Cargando configuración...");

      if (window.electron?.obtenerConfiguracion) {
        const config = await window.electron.obtenerConfiguracion();
        console.log("📋 [Proyector] Configuración obtenida:", config);

        if (config) {
          setConfiguracion((prevConfig) => ({
            ...prevConfig,
            ...config,
            fontSize: {
              ...prevConfig.fontSize,
              ...config.fontSize,
            },
            videosFondo: config.videosFondo || videosDefecto,
            intervaloCambioVideo: config.intervaloCambioVideo || 120,
          }));
          console.log("✅ [Proyector] Configuración aplicada");
        }
      } else {
        console.warn(
          "⚠️ [Proyector] Funciones de configuración no disponibles",
        );
      }
    } catch (error) {
      console.error("❌ [Proyector] Error cargando configuración:", error);
    }
  };

  // ✨ FUNCIÓN PARA CARGAR FONDO ACTIVO
  const cargarFondoActivo = async () => {
    try {
      if (window.electron?.obtenerFondoActivo) {
        const fondo = await window.electron.obtenerFondoActivo();

        if (fondo) {
          if (!fondo.url || fondo.url.trim() === "") {
            setFondoActivo(null);
            setUsandoFondoDefecto(true);
            seleccionarVideoDefecto();
            return;
          }

          // Verificar si la URL necesita ser completa
          let urlCompleta = fondo.url;
          if (!fondo.url.startsWith("http")) {
            urlCompleta = `${getBaseURL()}${fondo.url}`;
          }

          setFondoActivo({...fondo, url: urlCompleta});
          setFondoActual(urlCompleta);
          setUsandoFondoDefecto(false);
        } else {
          setFondoActivo(null);
          setUsandoFondoDefecto(true);
          seleccionarVideoDefecto();
        }
      } else {
        setUsandoFondoDefecto(true);
        seleccionarVideoDefecto();
      }
    } catch (error) {
      console.error("❌ [Proyector] Error cargando fondo activo:", error);
      setUsandoFondoDefecto(true);
      seleccionarVideoDefecto();
    }
  };

  // ✨ FUNCIÓN PARA CARGAR MULTIMEDIA ACTIVA (SIGUIENDO PATRÓN DE FONDOS)
  const cargarMultimediaActiva = async () => {
    try {
      console.log("🎬 [Proyector] Cargando multimedia activa...");

      if (window.electron?.obtenerMultimediaActiva) {
        const multimedia = await window.electron.obtenerMultimediaActiva();
        console.log("📋 [Proyector] Multimedia activa obtenida:", multimedia);

        if (multimedia && multimedia.url && multimedia.tipo) {
          console.log(
            "✅ [Proyector] Aplicando multimedia activa:",
            multimedia,
          );

          // Cambiar modo a multimedia
          setModoProyector("multimedia");

          // Limpiar contenido texto
          setParrafo("");
          setTitulo("");
          setNumero("");

          // Establecer multimedia
          setMultimediaActiva(multimedia);

          // Mostrar contenido
          setShowContent(true);

          console.log("✅ [Proyector] Multimedia activa aplicada exitosamente");
        } else {
          console.log(
            "ℹ️ [Proyector] No hay multimedia activa o datos incompletos",
          );
        }
      } else {
        console.warn(
          "⚠️ [Proyector] Función obtenerMultimediaActiva no disponible",
        );
      }
    } catch (error) {
      console.error("❌ [Proyector] Error cargando multimedia activa:", error);
    }
  };

  // ✨ FUNCIÓN PARA CARGAR PRESENTACIONES
  const cargarPresentaciones = async () => {
    try {
      console.log("📊 [Proyector] Cargando presentaciones...");

      if (window.electron?.obtenerPresentacionesSlides) {
        const presentacionesDB =
          await window.electron.obtenerPresentacionesSlides();
        console.log(
          "📋 [Proyector] Presentaciones obtenidas:",
          presentacionesDB,
        );

        if (presentacionesDB && presentacionesDB.length > 0) {
          const presentacionesFormateadas = presentacionesDB.map(
            (dbPresentation) => ({
              id: dbPresentation.id,
              name: dbPresentation.nombre,
              slides: Array.isArray(dbPresentation.slides)
                ? dbPresentation.slides
                : JSON.parse(dbPresentation.slides || "[]"),
              description: dbPresentation.descripcion || "",
              createdAt: dbPresentation.created_at,
              lastModified: dbPresentation.last_modified,
              slideActual: dbPresentation.slide_actual || 0,
            }),
          );

          setPresentaciones(presentacionesFormateadas);
          console.log(
            `✅ [Proyector] ${presentacionesFormateadas.length} presentaciones cargadas`,
          );
        }
      } else {
        console.warn(
          "⚠️ [Proyector] Función obtenerPresentacionesSlides no disponible",
        );
      }
    } catch (error) {
      console.error("❌ [Proyector] Error cargando presentaciones:", error);
    }
  };

  // ✨ FUNCIÓN PARA SELECCIONAR VIDEO POR DEFECTO
  const seleccionarVideoDefecto = () => {
    const videosDisponibles =
      configuracion.videosFondo.length > 0
        ? configuracion.videosFondo
        : videosDefecto;

    const videoAleatorio =
      videosDisponibles[Math.floor(Math.random() * videosDisponibles.length)];
    const rutaCompleta = videoAleatorio.startsWith("/")
      ? videoAleatorio
      : `/videos/${videoAleatorio}`;

    setFondoActual(rutaCompleta);
    console.log("📺 [Proyector] Video por defecto seleccionado:", rutaCompleta);
  };

  // ✨ FUNCIÓN PARA ACTUALIZAR FONDO ACTIVO
  const actualizarFondoActivo = (nuevoFondo) => {
    console.log("🔄 [Proyector] Actualizando fondo activo:", nuevoFondo);

    if (nuevoFondo && nuevoFondo.url) {
      setFondoActivo(nuevoFondo);
      setFondoActual(nuevoFondo.url);
      setUsandoFondoDefecto(false);
      console.log("✅ [Proyector] Fondo activo actualizado:", nuevoFondo.url);
    } else {
      setFondoActivo(null);
      setUsandoFondoDefecto(true);
      seleccionarVideoDefecto();
      console.log("📺 [Proyector] Volviendo a videos por defecto");
    }
  };

  // ✨ NUEVA FUNCIÓN PARA MOSTRAR MULTIMEDIA CON TRANSICIÓN SUAVE
  const mostrarMultimedia = (mediaData) => {
    console.log(
      "🎬 [Proyector] =================== MOSTRAR MULTIMEDIA ===================",
    );
    console.log(
      "📺 [Proyector] Datos recibidos en mostrarMultimedia:",
      mediaData,
    );

    // Validaciones exhaustivas
    if (!mediaData) {
      console.error("❌ [Proyector] mediaData es null/undefined");
      return;
    }

    if (!mediaData.tipo) {
      console.error(
        "❌ [Proyector] mediaData.tipo faltante. Datos:",
        mediaData,
      );
      return;
    }

    if (!mediaData.url) {
      console.error("❌ [Proyector] mediaData.url faltante. Datos:", mediaData);
      return;
    }

    // ✨ VALIDAR QUE LA URL SEA COMPLETA
    if (
      !mediaData.url.startsWith("http://") &&
      !mediaData.url.startsWith("https://")
    ) {
      return;
    }

    const aplicarMultimedia = () => {
      setMultimediaActiva(mediaData);
      setModoProyector("multimedia");
      setParrafo("");
      setTitulo("");
      setNumero("");
      setShowContent(true);

      console.log("✅ [Proyector] Estados actualizados");
      console.log("✅ [Proyector] multimediaActiva establecida");
      console.log("✅ [Proyector] modoProyector = multimedia");
      console.log("✅ [Proyector] showContent = true");

      // Verificar después de un momento
      setTimeout(() => {
        console.log("🔍 [Proyector] Verificación post-aplicación:");
        console.log("   - modoProyector actual:", modoProyector);
        console.log("   - multimediaActiva actual:", multimediaActiva);
        console.log("   - showContent actual:", showContent);
      }, 100);
    };

    if (transicionSuave) {
      console.log("🔄 [Proyector] Aplicando con transición suave...");
      setShowContent(false);
      setTimeout(() => {
        aplicarMultimedia();
      }, 300);
    } else {
      console.log("⚡ [Proyector] Aplicando sin transición...");
      aplicarMultimedia();
    }

    console.log(
      "🎬 [Proyector] ================================================================",
    );
  };
  // ...existing code...

  // ✨ FUNCIÓN MEJORADA PARA LIMPIAR PROYECTOR
  const limpiarProyector = () => {
    console.log("🧹 [Proyector] Limpiando proyector...");

    if (transicionSuave) {
      setShowContent(false);
      setTimeout(() => {
        setParrafo("");
        setTitulo("");
        setNumero("");
        setMultimediaActiva(null);
        // ✨ RESETEAR CONTROL DE HIMNO
        setHimnoActual("");
        setMostrarTituloHimno(true);
        setTituloInicialMostrado(false);
        // ✨ LIMPIAR TAMBIÉN PRESENTACIONES Y SLIDES
        setPresentacionActiva(null);
        setSlideData(null); // ✨ LIMPIAR DATOS DE SLIDE INDIVIDUAL
        setSlideActual(0);
        // ✨ Siempre volver a bienvenida después de limpiar
        setModoProyector("bienvenida");
        setModoProyeccion("bienvenida");
        setShowContent(true);
        console.log(
          "✅ [Proyector] Proyector limpiado con transición - modo: bienvenida",
        );
      }, 600);
    } else {
      setParrafo("");
      setTitulo("");
      setNumero("");
      setMultimediaActiva(null);
      // ✨ RESETEAR CONTROL DE HIMNO
      setHimnoActual("");
      setMostrarTituloHimno(true);
      setTituloInicialMostrado(false);
      // ✨ LIMPIAR TAMBIÉN PRESENTACIONES Y SLIDES
      setPresentacionActiva(null);
      setSlideData(null); // ✨ LIMPIAR DATOS DE SLIDE INDIVIDUAL
      setSlideActual(0);
      // ✨ Siempre volver a bienvenida después de limpiar
      setModoProyector("bienvenida");
      setModoProyeccion("bienvenida");
      console.log(
        "✅ [Proyector] Proyector limpiado sin transición - modo: bienvenida",
      );
    }
  };

  // ✨ CARGAR CONFIGURACIÓN Y FONDO AL INICIAR
  useEffect(() => {
    const inicializar = async () => {
      await cargarConfiguracion();
      await cargarFondoActivo();
      await cargarMultimediaActiva(); // ✨ CARGAR MULTIMEDIA ACTIVA TAMBIÉN
      await cargarPresentaciones();

      // ✨ APLICAR ESTILOS GLOBALES PARA ALTA CALIDAD
      const style = document.createElement("style");
      style.textContent = `
        /* Optimizaciones globales para alta calidad en el proyector */
        * {
          image-rendering: crisp-edges !important;
          text-rendering: optimizeLegibility !important;
          -webkit-font-smoothing: antialiased !important;
          -moz-osx-font-smoothing: grayscale !important;
          font-kerning: normal !important;
          backface-visibility: hidden !important;
        }
        
        /* Mejoras específicas para texto */
        h1, h2, h3, h4, h5, h6, p, span, div {
          text-rendering: optimizeLegibility !important;
          -webkit-font-smoothing: antialiased !important;
          -moz-osx-font-smoothing: grayscale !important;
        }
        
        /* Mejoras para imágenes */
        img {
          image-rendering: high-quality !important;
          image-rendering: -webkit-optimize-contrast !important;
          image-rendering: optimize-contrast !important;
        }
        
        /* Mejoras para videos */
        video {
          image-rendering: high-quality !important;
        }
        
        /* Disable blur on transforms */
        .motion-div, [data-framer-component] {
          transform: translateZ(0) !important;
          backface-visibility: hidden !important;
        }
      `;
      document.head.appendChild(style);
    };

    inicializar();
  }, []);

  // ✨ POLLING PARA DETECTAR CAMBIOS EN EL FONDO ACTIVO
  useEffect(() => {
    const intervalo = setInterval(async () => {
      await cargarFondoActivo();
    }, 3000);

    return () => {
      clearInterval(intervalo);
    };
  }, []);

  // ✨ POLLING PARA DETECTAR CAMBIOS EN LA CONFIGURACIÓN
  useEffect(() => {
    const intervalo = setInterval(async () => {
      await cargarConfiguracion();
    }, 5000); // Cada 5 segundos

    return () => {
      clearInterval(intervalo);
    };
  }, []);

  // ✨ ESCUCHAR EVENTOS IPC PARA PRESENTACIONES
  useEffect(() => {
    const handleMostrarPresentacion = (event, presentacionData) => {
      console.log("📊 [Proyector] Recibiendo presentación:", presentacionData);
      setPresentacionActiva(presentacionData);
      setSlideActual(presentacionData.slideActual || 0);
      setModoProyeccion("presentacion");
    };

    const handleCambiarSlide = (event, {presentacionId, slideIndex}) => {
      console.log(
        `🎯 [Proyector] Cambiando slide: ${presentacionId} -> ${slideIndex}`,
      );
      if (presentacionActiva?.id === presentacionId) {
        setSlideActual(slideIndex);
      }
    };

    const handleDetenerPresentacion = () => {
      console.log("🛑 [Proyector] Deteniendo presentación");
      setModoProyeccion("bienvenida");
      setPresentacionActiva(null);
      setSlideActual(0);
    };

    const handleLimpiarProyector = () => {
      console.log("🧹 [Proyector] Limpiando proyector desde IPC");
      try {
        setModoProyeccion("bienvenida");
        setModoProyector("bienvenida");
        setPresentacionActiva(null);
        setSlideActual(0);
        console.log("✅ [Proyector] Proyector limpiado exitosamente");
      } catch (error) {
        console.error("❌ [Proyector] Error limpiando proyector:", error);
      }
    };

    // Registrar listeners
    if (window.electron) {
      console.log("🔗 [Proyector] Registrando listeners IPC...");
      window.electron.ipcRenderer.on(
        "mostrar-presentacion",
        handleMostrarPresentacion,
      );
      window.electron.ipcRenderer.on("cambiar-slide", handleCambiarSlide);
      window.electron.ipcRenderer.on(
        "detener-presentacion",
        handleDetenerPresentacion,
      );
      // ✨ NUEVOS LISTENERS PARA SLIDES
      window.electron.ipcRenderer.on(
        "proyectar-slide-data",
        handleProyectarSlideData,
      );
      window.electron.ipcRenderer.on(
        "limpiar-proyector",
        handleLimpiarProyector,
      );
    } else {
      console.warn("⚠️ [Proyector] window.electron no está disponible");
    }

    // ✨ LISTENER PARA LOCALSTORAGE COMO FALLBACK
    const handleStorageChange = (e) => {
      if (e.key === "proyector-slide-data") {
        try {
          const slideData = JSON.parse(e.newValue);
          console.log(
            "📦 [Proyector] Slide recibida via localStorage:",
            slideData,
          );
          handleProyectarSlideData(null, slideData);
        } catch (error) {
          console.error(
            "❌ [Proyector] Error procesando slide desde localStorage:",
            error,
          );
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Cleanup
    return () => {
      if (window.electron) {
        window.electron.ipcRenderer.removeListener(
          "mostrar-presentacion",
          handleMostrarPresentacion,
        );
        window.electron.ipcRenderer.removeListener(
          "cambiar-slide",
          handleCambiarSlide,
        );
        window.electron.ipcRenderer.removeListener(
          "detener-presentacion",
          handleDetenerPresentacion,
        );
        // ✨ CLEANUP PARA NUEVOS LISTENERS
        window.electron.ipcRenderer.removeListener(
          "proyectar-slide-data",
          handleProyectarSlideData,
        );
        window.electron.ipcRenderer.removeListener(
          "limpiar-proyector",
          handleLimpiarProyector,
        );
      }
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [presentacionActiva]);

  // ✨ PRECARGAR IMÁGENES DE LA PRESENTACIÓN ACTUAL
  useEffect(() => {
    if (presentacionActiva?.slides?.[slideActual]?.backgroundImage) {
      const bgImage = presentacionActiva.slides[slideActual].backgroundImage;
      const optimizedUrl = optimizarUrlImagen(bgImage);

      console.log("🔄 [Proyector] Precargando imagen de slide:", optimizedUrl);
      setImagenCargando(true);

      precargarImagen(optimizedUrl)
        .then(() => {
          console.log("✅ [Proyector] Imagen de slide lista");
          setImagenCargando(false);
        })
        .catch((error) => {
          console.error("❌ [Proyector] Error precargando imagen:", error);
          setImagenesConError((prev) => new Set([...prev, bgImage]));
          setImagenCargando(false);
        });
    } else {
      setImagenCargando(false);
    }
  }, [presentacionActiva, slideActual]);

  // ✨ ROTACIÓN DE VIDEOS POR DEFECTO
  useEffect(() => {
    if (!usandoFondoDefecto || modoProyector === "multimedia") return;

    const intervaloMinutos = configuracion.intervaloCambioVideo || 120;
    const intervaloMs = intervaloMinutos * 60 * 1000;

    console.log(
      `📺 [Proyector] Configurando rotación de videos cada ${intervaloMinutos} minutos`,
    );

    const interval = setInterval(() => {
      if (usandoFondoDefecto && modoProyector !== "multimedia") {
        seleccionarVideoDefecto();
      }
    }, intervaloMs);

    return () => clearInterval(interval);
  }, [
    usandoFondoDefecto,
    configuracion.intervaloCambioVideo,
    configuracion.videosFondo,
    modoProyector,
    seleccionarVideoDefecto,
  ]);

  // ✨ HANDLERS PARA SLIDES INDIVIDUALES (FUERA DEL useEffect)
  const handleProyectarSlideData = (event, slideData) => {
    console.log("🎯 [Proyector] Recibiendo slide para proyectar:", slideData);

    try {
      // ✨ VERIFICAR SI ES TIPO SLIDE ESPECÍFICAMENTE
      if (slideData?.tipo === "slide" && slideData?.slide) {
        console.log("📊 [Proyector] Datos de slide válidos encontrados");
        console.log("📊 [Proyector] Estado actual antes del cambio:", {
          modoProyeccion,
          modoProyector,
          showContent,
          presentacionActiva: presentacionActiva?.name,
        });

        // Crear presentación temporal con solo esta slide
        const presentacionTemporal = {
          name: slideData.presentation?.name || "Slide Temporal",
          slides: [slideData.slide],
          currentIndex: 0,
          id: `temp-${Date.now()}`,
        };

        // ✨ ACTUALIZAR ESTADOS - SOLO MODO SLIDE INDIVIDUAL
        setShowContent(true); // ✨ ASEGURAR QUE showContent esté en true
        setSlideData(slideData); // ✨ GUARDAR DATOS DE LA SLIDE INDIVIDUAL
        setSlideActual(0);
        setModoProyector("slide"); // ✨ SOLO MODO SLIDE INDIVIDUAL

        // ✨ LIMPIAR OTROS MODOS Y CONTENIDOS
        setModoProyeccion("bienvenida"); // ✨ DESACTIVAR MODO PRESENTACION
        setPresentacionActiva(null); // ✨ LIMPIAR PRESENTACIÓN ACTIVA

        // ✨ LIMPIAR OTROS CONTENIDOS
        setTitulo("");
        setParrafo("");
        setNumero("");
        setMultimediaActiva(null);

        console.log("✅ [Proyector] Slide proyectada exitosamente:", {
          titulo: slideData.slide.title,
          contenido: slideData.slide.content?.substring(0, 50) + "...",
          modoProyeccion: "presentacion",
          modoProyector: "slide",
          showContent: true,
          presentacionId: presentacionTemporal.id,
          tipo: slideData.tipo,
        });
      } else if (slideData?.slide) {
        // ✨ FALLBACK PARA COMPATIBILIDAD CON CÓDIGO ANTERIOR
        console.log(
          "📊 [Proyector] Datos de slide válidos encontrados (fallback)",
        );

        setShowContent(true);
        setSlideData(slideData); // ✨ GUARDAR DATOS DE LA SLIDE INDIVIDUAL (FALLBACK)
        setSlideActual(0);
        setModoProyector("slide"); // ✨ SOLO MODO SLIDE INDIVIDUAL

        // ✨ LIMPIAR OTROS MODOS Y CONTENIDOS (FALLBACK)
        setModoProyeccion("bienvenida"); // ✨ DESACTIVAR MODO PRESENTACION
        setPresentacionActiva(null); // ✨ LIMPIAR PRESENTACIÓN ACTIVA
        setTitulo("");
        setParrafo("");
        setNumero("");
        setMultimediaActiva(null);

        console.log("✅ [Proyector] Slide proyectada exitosamente (fallback)");
      } else {
        console.warn("⚠️ [Proyector] Datos de slide inválidos:", slideData);
        console.warn(
          "⚠️ [Proyector] Esperado: { tipo: 'slide', slide: {...} }",
        );
      }
    } catch (error) {
      console.error("❌ [Proyector] Error procesando slide:", error);
    }
  };

  // ✨ LISTENERS PARA EVENTOS - CORREGIDO
  useEffect(() => {
    console.log("🔧 [Proyector] Configurando listeners de eventos...");

    // Eventos de himnos y versículos
    const handleMostrarHimno = (event, data) => {
      console.log("🎵 [Proyector] Evento mostrar-himno recibido:", data);
      console.log("🎵 [Proyector] Datos - parrafo:", data.parrafo);
      console.log("🎵 [Proyector] Datos - titulo:", data.titulo);
      console.log("🎵 [Proyector] Datos - numero:", data.numero);
      console.log("🎵 [Proyector] Himno actual:", himnoActual);

      // ✨ Detectar si es un himno nuevo comparando título+número
      const idHimnoNuevo = `${data.titulo}-${data.numero}`;
      console.log(
        "🎵 [Proyector] ID nuevo:",
        idHimnoNuevo,
        "vs actual:",
        himnoActual,
      );

      // Si es un himno completamente nuevo
      if (idHimnoNuevo !== himnoActual) {
        console.log(
          "✨ [Proyector] NUEVO himno detectado - preparando para mostrar título",
        );
        setHimnoActual(idHimnoNuevo);
        setTituloInicialMostrado(false); // Resetear para mostrar título en próxima proyección
      }

      // Si es el mismo himno pero aún no mostramos el título inicial
      if (!tituloInicialMostrado && idHimnoNuevo === himnoActual) {
        console.log(
          "✨ [Proyector] Primera diapositiva - mostrando título como párrafo",
        );
        setTituloInicialMostrado(true);
        setMostrarTituloHimno(false);
        setParrafo(data.titulo); // Mostrar título como párrafo
        setTitulo("");
        setNumero(data.numero);
      } else {
        // Ya mostramos el título, ahora mostrar párrafos normales
        console.log("🔄 [Proyector] Mostrando párrafo normal");
        setMostrarTituloHimno(false);
        setParrafo(data.parrafo);
        setTitulo("");
        setNumero(data.numero);
      }

      setModoProyector("himno");
      setMultimediaActiva(null);
      setShowContent(true);

      console.log("✅ [Proyector] Estados actualizados - modo: himno");
    };

    const handleMostrarVersiculo = (
      event,
      {parrafo, titulo, numero, origen},
    ) => {
      console.log("📖 [Proyector] Evento mostrar-versiculo:", {
        parrafo,
        titulo,
        numero,
        origen,
      });
      if (origen === "clear") {
        limpiarProyector();
        return;
      }

      // ✨ Para versículos de la biblia, SIEMPRE mostrar título
      setMostrarTituloHimno(true);
      setHimnoActual(""); // Resetear para que no interfiera con himnos

      setModoProyector("himno");
      setMultimediaActiva(null);

      if (origen === "biblia") {
        setTitulo(`${titulo} ${numero}`);
        setParrafo(parrafo || "No disponible");
        setNumero("");
      } else if (origen === "himno") {
        setTitulo(titulo || "Himno");
        setParrafo(parrafo || "No disponible");
        setNumero(numero || "");
      }

      setShowContent(true);
    };

    // ✨ LISTENER PARA MULTIMEDIA MEJORADO Y SEPARADO
    const handleMostrarMultimedia = (event, mediaData) => {
      console.log(
        "🎬 [Proyector] =================== RECIBIENDO MULTIMEDIA ===================",
      );
      console.log("📺 [Proyector] Event object:", event);

      // 🔍 DIAGNÓSTICO CRÍTICO: ¿QUÉ DATOS ESTAMOS RECIBIENDO?
      console.log("🔍 [Proyector] === DIAGNÓSTICO RECEPCIÓN IPC ===");
      console.log("🔍 [Proyector] Tipo de objeto mediaData:", typeof mediaData);
      console.log(
        "🔍 [Proyector] ¿Es null/undefined?:",
        mediaData === null || mediaData === undefined,
      );
      if (mediaData) {
        console.log(
          "🔍 [Proyector] Propiedades disponibles:",
          Object.keys(mediaData),
        );
        console.log(
          "🔍 [Proyector] Valores de propiedades:",
          Object.entries(mediaData),
        );
      }
      console.log("🔍 [Proyector] === FIN DIAGNÓSTICO ===");

      console.log(
        "📺 [Proyector] MediaData completo:",
        JSON.stringify(mediaData, null, 2),
      );
      console.log("📺 [Proyector] Tipo:", mediaData?.tipo);
      console.log("📺 [Proyector] URL recibida:", mediaData?.url);
      console.log("📺 [Proyector] Nombre:", mediaData?.nombre);

      // Validación más estricta
      if (!mediaData) {
        console.error("❌ [Proyector] mediaData es null/undefined");
        return;
      }

      if (!mediaData.tipo) {
        console.error("❌ [Proyector] mediaData.tipo faltante");
        return;
      }

      if (!mediaData.url) {
        console.error("❌ [Proyector] mediaData.url faltante");
        return;
      }

      if (
        !mediaData.url.startsWith("http://") &&
        !mediaData.url.startsWith("https://")
      ) {
        console.error("❌ [Proyector] URL no es completa:", mediaData.url);
        return;
      }

      console.log("✅ [Proyector] Validación pasada, aplicando multimedia...");

      // ✨ APLICAR DIRECTAMENTE SIN FUNCIÓN INTERMEDIA
      console.log("🎯 [Proyector] Estableciendo estados de multimedia...");

      // Forzar el cambio de modo primero
      setModoProyector("multimedia");
      console.log("✅ [Proyector] Modo cambiado a multimedia");

      // Limpiar contenido texto
      setParrafo("");
      setTitulo("");
      setNumero("");

      // Establecer multimedia
      setMultimediaActiva(mediaData);
      console.log("✅ [Proyector] Multimedia establecida:", mediaData);

      // Mostrar contenido
      setShowContent(true);

      console.log(
        "🎬 [Proyector] ================================================================",
      );
    };

    const handleLimpiarProyector = () => {
      console.log("🧹 [Proyector] Evento limpiar-proyector recibido");
      limpiarProyector();
    };

    const handleConfiguracionActualizada = (event, nuevaConfig) => {
      console.log("🔄 [Proyector] Configuración actualizada:", nuevaConfig);
      setConfiguracion((prevConfig) => ({
        ...prevConfig,
        ...nuevaConfig,
        fontSize: {
          ...prevConfig.fontSize,
          ...nuevaConfig.fontSize,
        },
        videosFondo: nuevaConfig.videosFondo || prevConfig.videosFondo,
        intervaloCambioVideo:
          nuevaConfig.intervaloCambioVideo || prevConfig.intervaloCambioVideo,
      }));
    };

    const handleActualizarFondoActivo = (event, nuevoFondo) => {
      actualizarFondoActivo(nuevoFondo);
    };

    const handleFondoSeleccionado = (event, fondo) => {
      actualizarFondoActivo(fondo);
    };

    // ✨ HANDLERS PARA MULTIMEDIA ACTIVA (SIGUIENDO PATRÓN DE FONDOS)
    const handleActualizarMultimediaActiva = async (event, multimediaData) => {
      console.log(
        "🎬 [Proyector] =============== EVENTO MULTIMEDIA ACTIVA RECIBIDO ===============",
      );
      console.log("🎬 [Proyector] Datos del evento:", multimediaData);
      console.log("🎬 [Proyector] Tipo de datos:", typeof multimediaData);
      console.log(
        "🎬 [Proyector] ¿Es null/undefined?:",
        multimediaData == null,
      );

      if (multimediaData && multimediaData.url && multimediaData.tipo) {
        console.log(
          "✅ [Proyector] Validación exitosa, aplicando multimedia activa",
        );
        console.log("🎬 [Proyector] URL:", multimediaData.url);
        console.log("🎬 [Proyector] Tipo:", multimediaData.tipo);
        console.log("🎬 [Proyector] Nombre:", multimediaData.nombre);

        // Cambiar modo a multimedia
        console.log("🎬 [Proyector] Cambiando modo a multimedia...");
        setModoProyector("multimedia");

        // Limpiar contenido texto
        console.log("🎬 [Proyector] Limpiando contenido de texto...");
        setParrafo("");
        setTitulo("");
        setNumero("");

        // Establecer multimedia
        console.log("🎬 [Proyector] Estableciendo multimedia activa...");
        setMultimediaActiva(multimediaData);

        // Mostrar contenido
        console.log("🎬 [Proyector] Mostrando contenido...");
        setShowContent(true);

        console.log(
          "✅ [Proyector] Multimedia activa aplicada desde evento exitosamente",
        );
        console.log(
          "🎬 [Proyector] ================================================================",
        );
      } else {
        console.error("❌ [Proyector] Datos de multimedia activa incompletos:");
        console.error("❌ [Proyector] multimediaData:", multimediaData);
        console.error("❌ [Proyector] url disponible:", multimediaData?.url);
        console.error("❌ [Proyector] tipo disponible:", multimediaData?.tipo);
      }
    };

    const handleLimpiarMultimediaActiva = (event) => {
      console.log("🧹 [Proyector] Evento limpiar-multimedia-activa recibido");

      // Solo limpiar si estamos en modo multimedia
      if (modoProyectorRef.current === "multimedia") {
        setModoProyector("welcome");
        setMultimediaActiva(null);
        setParrafo("");
        setTitulo("");
        setNumero("");
        setShowContent(false);
        console.log("✅ [Proyector] Multimedia activa limpiada");
      }
    };

    const handleControlMultimedia = (event, payload, meta = {}) => {
      const {action, mediaId, time, volume} = payload || {};
      console.log("🎮 [Proyector] Control multimedia recibido:", {
        action,
        mediaId,
        time,
        volume,
      });

      // ✨ ACK hacia el main para confirmar que el proyector SÍ recibió el control.
      try {
        // No enviar ACK en reintentos internos; solo en eventos “reales”.
        if (!meta?.isRetry && window.electron?.send && action) {
          window.electron.send("proyector-control-ack", {
            action,
            source: meta?.source || "ipc",
            ts: Date.now(),
          });
        }
      } catch {
        // noop
      }

      const multimedia = multimediaActivaRef.current;
      if (!multimedia) {
        console.log("⚠️ [Proyector] No hay multimedia activa para controlar");
        // Guardar el último control por si llega antes de que se monte el media
        // y reintentar automáticamente (race común al proyectar YouTube).
        if (payload?.action) {
          pendingMultimediaControlRef.current = payload;
          const retries = pendingMultimediaControlRetriesRef.current;
          if (retries < 12) {
            pendingMultimediaControlRetriesRef.current = retries + 1;
            setTimeout(() => {
              const pending = pendingMultimediaControlRef.current;
              if (!pending) return;
              handleControlMultimedia(null, pending, {
                isRetry: true,
                source: meta?.source || "retry",
              });
            }, 200);
          }
        }
        return;
      }

      // IMPORTANTE: en el proyector hay videos de fondo.
      // Nunca usar querySelector('video') genérico o se controlará el fondo.
      const mediaType = multimedia.tipo || multimedia.type;

      const mediaElement =
        mediaType === "video"
          ? document.querySelector(".multimedia-video")
          : mediaType === "audio"
            ? document.querySelector(".multimedia-audio")
            : null;

      const ytPlayer = youtubePlayerRef.current;

      const youtubeIframe = document.getElementById("youtube-player");

      // El iframe puede existir antes de que el Player API esté listo.
      // ModernMultimediaRenderer marca dataset.ready="1" en onLoad.
      const youtubeReady =
        !!youtubeIframe && String(youtubeIframe?.dataset?.ready || "") === "1";

      const canPostMessageYouTube =
        !!youtubeIframe &&
        typeof youtubeIframe.contentWindow?.postMessage === "function";

      const sendYouTubeCommand = (func, args = []) => {
        if (!canPostMessageYouTube) return false;
        try {
          youtubeIframe.contentWindow.postMessage(
            JSON.stringify({event: "command", func, args}),
            "*",
          );
          return true;
        } catch (error) {
          console.error(
            "❌ [Proyector] Error enviando comando YouTube:",
            error,
          );
          return false;
        }
      };

      const tryYouTubePlayerCall = (method, ...args) => {
        try {
          if (!ytPlayer) return false;
          const fn = ytPlayer?.[method];
          if (typeof fn !== "function") return false;
          fn.apply(ytPlayer, args);
          return true;
        } catch {
          return false;
        }
      };

      const scheduleRetry = () => {
        // Reintento corto para carreras: el control puede llegar antes de que el DOM tenga el video.
        pendingMultimediaControlRef.current = payload;
        const retries = pendingMultimediaControlRetriesRef.current;
        const MAX_RETRIES = 40; // ~8-15s con backoff
        if (retries >= MAX_RETRIES) return;
        pendingMultimediaControlRetriesRef.current = retries + 1;
        const delay = Math.min(800, 200 + retries * 50);
        setTimeout(() => {
          const pending = pendingMultimediaControlRef.current;
          if (!pending) return;
          handleControlMultimedia(null, pending, {
            isRetry: true,
            source: meta?.source || "retry",
          });
        }, delay);
      };

      const forceYouTubeAutoplay = () => {
        if (!youtubeIframe?.src) return false;
        try {
          const u = new URL(youtubeIframe.src);
          u.searchParams.set("autoplay", "1");
          u.searchParams.set("mute", "1");
          // En algunos entornos, setear origin inválido hace que ignore comandos.
          // No forzamos origin aquí; respetamos lo que ya viene en la URL.
          youtubeIframe.src = u.toString();
          console.log(
            "🔁 [Proyector] Forzando autoplay YouTube (reload iframe)",
          );

          // Intentar recuperar audio después del reload (si el entorno lo permite).
          setTimeout(() => {
            try {
              sendYouTubeCommand("unMute", []);
            } catch {
              // noop
            }
          }, 1400);
          return true;
        } catch (e) {
          console.warn("⚠️ [Proyector] No se pudo forzar autoplay YouTube:", e);
          return false;
        }
      };

      const isProbablyYouTube =
        mediaType === "youtube" ||
        mediaType === "yt" ||
        String(multimedia?.url || "").includes("youtube") ||
        String(multimedia?.url || "").includes("youtu.be");

      const reinforceYouTubeEarly = () => {
        if (!isProbablyYouTube) return;
        // Aun con postMessage exitoso, YouTube a veces ignora comandos tempranos.
        const msSinceMount = Date.now() - (multimediaMountedAtRef.current || 0);
        if (!youtubeReady || msSinceMount < 8000) {
          scheduleRetry();
        }
      };

      try {
        switch (action) {
          case "play":
            if (mediaElement) {
              mediaElement.play().catch((err) => {
                console.warn(
                  "⚠️ [Proyector] play() falló (posible política autoplay):",
                  err,
                );
              });
              console.log(
                "▶️ [Proyector] Reproduciendo multimedia (video/audio)",
              );
            } else if (
              tryYouTubePlayerCall("playVideo") ||
              tryYouTubePlayerCall("unMute") ||
              sendYouTubeCommand("playVideo", []) ||
              sendYouTubeCommand("unMute", [])
            ) {
              // No forzar mute: el usuario espera audio al presionar Play.
              // Si YouTube ignora comandos tempranos, reinforce/retry se encarga.
              tryYouTubePlayerCall("unMute");
              tryYouTubePlayerCall("playVideo");
              sendYouTubeCommand("playVideo", []);
              sendYouTubeCommand("unMute", []);
              console.log("▶️ [Proyector] Reproduciendo multimedia (YouTube)");
              reinforceYouTubeEarly();

              // Fallback fuerte: si tras varios reintentos YouTube sigue ignorando,
              // recargar el iframe con autoplay=1 (muteado) una sola vez.
              if (
                meta?.isRetry &&
                pendingMultimediaControlRetriesRef.current >= 12 &&
                !youtubeForcedAutoplayRef.current
              ) {
                if (forceYouTubeAutoplay()) {
                  youtubeForcedAutoplayRef.current = true;
                }
              }
            } else {
              console.log(
                "⚠️ [Proyector] No se encontró elemento multimedia para play",
              );
              scheduleRetry();
            }
            break;
          case "pause":
            if (mediaElement) {
              mediaElement.pause();
              console.log("⏸️ [Proyector] Pausando multimedia (video/audio)");
            } else if (
              tryYouTubePlayerCall("pauseVideo") ||
              sendYouTubeCommand("pauseVideo", [])
            ) {
              console.log("⏸️ [Proyector] Pausando multimedia (YouTube)");
              reinforceYouTubeEarly();
            } else {
              console.log(
                "⚠️ [Proyector] No se encontró elemento multimedia para pause",
              );
              scheduleRetry();
            }
            break;
          case "stop":
            if (mediaElement) {
              mediaElement.pause();
              console.log(
                "⏹️ [Proyector] Deteniendo multimedia (video/audio) (pause sin reiniciar)",
              );
            } else if (
              tryYouTubePlayerCall("pauseVideo") ||
              sendYouTubeCommand("pauseVideo", [])
            ) {
              console.log(
                "⏹️ [Proyector] Deteniendo multimedia (YouTube) (pause sin reiniciar)",
              );
              reinforceYouTubeEarly();
            } else {
              console.log(
                "⚠️ [Proyector] No se encontró elemento multimedia para stop",
              );
              scheduleRetry();
            }
            break;
          case "seek":
            if (typeof time !== "number" || Number.isNaN(time)) {
              console.log("⚠️ [Proyector] seek sin 'time' válido:", time);
              break;
            }

            if (mediaElement) {
              mediaElement.currentTime = time;
              console.log("⏩ [Proyector] Seek aplicado (video/audio):", time);
            } else if (
              tryYouTubePlayerCall("seekTo", time, true) ||
              sendYouTubeCommand("seekTo", [time, true])
            ) {
              console.log("⏩ [Proyector] Seek aplicado (YouTube):", time);
              reinforceYouTubeEarly();
            } else {
              console.log(
                "⚠️ [Proyector] No se encontró elemento multimedia para seek",
              );
              scheduleRetry();
            }
            break;
          case "volume":
            if (typeof volume !== "number" || Number.isNaN(volume)) {
              console.log("⚠️ [Proyector] volume sin 'volume' válido:", volume);
              break;
            }

            if (mediaElement) {
              const normalized = Math.max(0, Math.min(1, volume));
              mediaElement.volume = normalized;
              console.log(
                "🔊 [Proyector] Volumen aplicado (video/audio):",
                normalized,
              );
            } else {
              const youtubeVol = Math.round(
                Math.max(0, Math.min(1, volume)) * 100,
              );
              const ok =
                tryYouTubePlayerCall("setVolume", youtubeVol) ||
                sendYouTubeCommand("setVolume", [youtubeVol]);
              if (ok) {
                // Mantener mute/unmute sincronizado con volumen.
                if (youtubeVol === 0) {
                  tryYouTubePlayerCall("mute");
                  sendYouTubeCommand("mute", []);
                } else {
                  tryYouTubePlayerCall("unMute");
                  sendYouTubeCommand("unMute", []);
                }
                console.log(
                  "🔊 [Proyector] Volumen aplicado (YouTube):",
                  youtubeVol,
                );
                reinforceYouTubeEarly();
              } else {
                console.log(
                  "⚠️ [Proyector] No se encontró elemento multimedia para volume",
                );
                scheduleRetry();
              }
            }
            break;
          case "limpiar":
            console.log(
              "🧹 [Proyector] Limpiar recibido desde control remoto (limpieza total)",
            );
            limpiarProyector();
            break;
          default:
            console.log("❌ [Proyector] Acción no reconocida:", action);
        }
      } catch (error) {
        console.error("❌ [Proyector] Error controlando multimedia:", error);
      }
    };

    // ✨ FALLBACK: controles entre ventanas sin IPC (BroadcastChannel)
    let bc = null;
    const handleBroadcastMessage = (ev) => {
      try {
        const payload = ev?.data;
        if (!payload || !payload.action) return;
        console.log(
          "📡 [Proyector] Control recibido por BroadcastChannel:",
          payload,
        );
        handleControlMultimedia(null, payload, {source: "broadcast"});
      } catch (error) {
        console.warn(
          "⚠️ [Proyector] Error procesando BroadcastChannel:",
          error,
        );
      }
    };

    try {
      if (typeof BroadcastChannel !== "undefined") {
        bc = new BroadcastChannel("gloryview-proyector-control");
        bc.addEventListener("message", handleBroadcastMessage);
        console.log("✅ [Proyector] BroadcastChannel de control activo");
      }
    } catch (error) {
      console.warn(
        "⚠️ [Proyector] No se pudo iniciar BroadcastChannel:",
        error,
      );
    }

    // ✨ REGISTRAR TODOS LOS LISTENERS
    if (window.electron?.on) {
      window.electron.on("mostrar-himno", handleMostrarHimno);
      window.electron.on("mostrar-versiculo", handleMostrarVersiculo);
      window.electron.on("mostrar-multimedia", handleMostrarMultimedia);
      window.electron.on("proyectar-multimedia-data", handleMostrarMultimedia);
      window.electron.on("limpiar-proyector", handleLimpiarProyector);
      window.electron.on(
        "configuracion-actualizada",
        handleConfiguracionActualizada,
      );
      window.electron.on(
        "actualizar-fondo-activo",
        handleActualizarFondoActivo,
      );
      window.electron.on("fondo-seleccionado", handleFondoSeleccionado);

      // ✨ LISTENERS PARA MULTIMEDIA ACTIVA Y CONTROLES (vía preload allowlist)
      window.electron.on(
        "actualizar-multimedia-activa",
        handleActualizarMultimediaActiva,
      );
      window.electron.on(
        "limpiar-multimedia-activa",
        handleLimpiarMultimediaActiva,
      );
      window.electron.on("control-multimedia", handleControlMultimedia);

      // ✨ Handshake hacia main: el proyector está listo y con listeners activos.
      try {
        if (window.electron?.send) {
          window.electron.send("proyector-ready", {
            ts: Date.now(),
            hasIpcRenderer: false,
          });
        }
      } catch {
        // noop
      }

      console.log("✅ [Proyector] Todos los listeners registrados");
    } else {
      console.error("❌ [Proyector] window.electron.on no disponible");
    }

    // ✨ Listener para configuración de monitores
    const handleConfigurarMonitores = (event, data) => {
      console.log("📺 [Proyector] Configurando monitores:", data);
      setTieneMultiplesMonitores(data.tieneMultiplesMonitores);

      // ✨ Con múltiples monitores: mostrar bienvenida con logo/eslogan
      // ✨ Con un solo monitor: mantener pantalla negra de espera
      if (data.tieneMultiplesMonitores) {
        console.log(
          "✨ [Proyector] Múltiples monitores detectados - mostrando bienvenida",
        );
        setModoProyector("bienvenida");
        setModoProyeccion("bienvenida");
      } else {
        console.log(
          "🖥️ [Proyector] Un solo monitor - modo espera (pantalla negra)",
        );
        setModoProyector("espera");
        setModoProyeccion("espera");
      }
    };

    if (window.electron?.on) {
      window.electron.on("configurar-monitores", handleConfigurarMonitores);
    }

    // ✨ MANEJO DE TECLAS
    const handleKeyDown = (e) => {
      switch (e.key) {
        case "Escape":
          // ✨ ESC siempre limpia el proyector (vuelve a bienvenida o pantalla en blanco)
          // ✨ No cierra la ventana del proyector
          console.log("🧹 [Proyector] ESC presionado - Limpiando contenido");
          limpiarProyector();
          break;
        case "F5":
          cargarConfiguracion();
          cargarFondoActivo();
          break;
        case "F6":
          if (usandoFondoDefecto) seleccionarVideoDefecto();
          break;
        case "F7":
          setEfectosActivos((prev) => !prev);
          break;
        case "F8":
          setTransicionSuave((prev) => !prev);
          break;
        case " ":
          if (
            modoProyector === "multimedia" &&
            multimediaActiva?.tipo === "video"
          ) {
            const video = document.querySelector(".multimedia-video");
            if (video) {
              if (video.paused) {
                video.play();
              } else {
                video.pause();
              }
            }
            e.preventDefault();
          }
          break;
        default:
          // No action for other keys
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    // ✨ CLEANUP FUNCTION
    return () => {
      console.log("🧹 [Proyector] Limpiando listeners...");
      window.removeEventListener("keydown", handleKeyDown);

      if (bc) {
        try {
          bc.removeEventListener("message", handleBroadcastMessage);
          bc.close();
        } catch {
          // noop
        }
      }

      if (window.electron?.removeListener) {
        window.electron.removeListener("mostrar-himno", handleMostrarHimno);
        window.electron.removeListener(
          "mostrar-versiculo",
          handleMostrarVersiculo,
        );
        window.electron.removeListener(
          "mostrar-multimedia",
          handleMostrarMultimedia,
        );
        window.electron.removeListener(
          "configurar-monitores",
          handleConfigurarMonitores,
        );
        window.electron.removeListener(
          "proyectar-multimedia-data",
          handleMostrarMultimedia,
        );
        window.electron.removeListener(
          "limpiar-proyector",
          handleLimpiarProyector,
        );
        window.electron.removeListener(
          "configuracion-actualizada",
          handleConfiguracionActualizada,
        );
        window.electron.removeListener(
          "actualizar-fondo-activo",
          handleActualizarFondoActivo,
        );
        window.electron.removeListener(
          "fondo-seleccionado",
          handleFondoSeleccionado,
        );

        window.electron.removeListener(
          "actualizar-multimedia-activa",
          handleActualizarMultimediaActiva,
        );
        window.electron.removeListener(
          "limpiar-multimedia-activa",
          handleLimpiarMultimediaActiva,
        );
        window.electron.removeListener(
          "control-multimedia",
          handleControlMultimedia,
        );
      }
    };
  }, []); // ✨ DEPENDENCIAS VACÍAS PARA EVITAR REINICIALIZACIONES

  return (
    <>
      <motion.div
        initial={{opacity: 0}}
        animate={{opacity: 1}}
        transition={{duration: 0.8}}
        className="w-full h-screen flex flex-col items-center justify-center text-white relative overflow-hidden cursor-none"
        style={{
          backgroundColor: "#000",
          // ✨ OPTIMIZACIONES CSS PARA ALTA CALIDAD
          imageRendering: "crisp-edges",
          textRendering: "optimizeLegibility",
          fontSmooth: "always",
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
          backfaceVisibility: "hidden",
          perspective: "1000px",
          willChange: "transform", // Optimizar animaciones
          cursor: "none",
        }}
      >
        {/* ✨ FONDO DINÁMICO MEJORADO */}
        {!(
          (
            (modoProyector === "multimedia" &&
              multimediaActiva?.tipo === "video") ||
            modoProyector === "slide"
          ) // ✨ OCULTAR FONDO CUANDO HAY SLIDES ACTIVAS
        ) && (
          <AnimatePresence mode="wait">
            {fondoActivo && fondoActivo.tipo === "imagen" ? (
              <motion.div
                key={fondoActual}
                className="absolute top-0 left-0 w-full h-full bg-cover bg-center bg-no-repeat -z-10"
                style={{
                  backgroundImage: `url(${fondoActual})`,
                  // ✨ MEJORAS PARA CALIDAD DE IMÁGENES DE FONDO
                  imageRendering: "high-quality",
                  filter: "contrast(1.1) brightness(1.05)", // Mejorar contraste y brillo
                  backfaceVisibility: "hidden",
                }}
                initial={{scale: 1.05, opacity: 0}}
                animate={{scale: 1, opacity: 1}}
                exit={{scale: 0.95, opacity: 0}}
                transition={{duration: 0.8, ease: "easeInOut"}}
              />
            ) : (
              <motion.video
                key={fondoActual}
                className="absolute top-0 left-0 w-full h-full object-cover -z-10 bg-black"
                src={fondoActual}
                autoPlay
                loop
                muted
                // ✨ MEJORAS PARA CALIDAD DE VIDEO
                style={{
                  filter: "contrast(1.05) brightness(1.02)", // Ligera mejora de contraste
                  backfaceVisibility: "hidden",
                }}
                // ✨ ATRIBUTOS PARA MEJOR CALIDAD DE VIDEO
                preload="auto"
                playsInline
                initial={{scale: 1.05, opacity: 0}}
                animate={{scale: 1, opacity: 1}}
                exit={{scale: 0.95, opacity: 0}}
                transition={{duration: 0.8, ease: "easeInOut"}}
                onError={(e) => {
                  console.error("❌ Error cargando video:", fondoActual);
                  if (!usandoFondoDefecto) {
                    console.log("🔄 Fallback a videos por defecto");
                    setUsandoFondoDefecto(true);
                    seleccionarVideoDefecto();
                  }
                }}
              />
            )}
          </AnimatePresence>
        )}

        {/* Overlay gradient mejorado */}
        {!(
          (modoProyector === "multimedia" &&
            multimediaActiva?.tipo === "video") ||
          modoProyector === "slide"
        ) && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/30 -z-5"
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            transition={{duration: 2}}
          />
        )}

        {/* ✨ SISTEMA DE PARTÍCULAS */}
        <ParticleBackground
          mode={modoProyector}
          isActive={
            efectosActivos &&
            modoProyector !== "multimedia" &&
            modoProyector !== "slide"
          }
        />

        {/* ✨ CONTENIDO MULTIMEDIA MEJORADO */}
        <AnimatePresence mode="wait">
          {modoProyector === "multimedia" && showContent && (
            <ModernMultimediaRenderer multimediaActiva={multimediaActiva} />
          )}
        </AnimatePresence>

        {/* ✨ PANTALLA DE BIENVENIDA MODERNA */}
        <AnimatePresence>
          {modoProyector === "bienvenida" && !parrafo && showContent && (
            <ModernWelcomeScreen configuracion={configuracion} />
          )}
        </AnimatePresence>

        {/* ✨ NÚMERO DEL HIMNO MEJORADO */}
        <AnimatePresence>
          {numero && modoProyector === "himno" && showContent && (
            <motion.div
              className="absolute top-8 right-12 z-30"
              initial={{opacity: 0, x: 20, scale: 0.8}}
              animate={{opacity: 1, x: 0, scale: 1}}
              exit={{opacity: 0, x: 20, scale: 0.8}}
              transition={{duration: 0.5, ease: "easeOut"}}
            >
              <div className="backdrop-blur-md bg-white/10 rounded-xl px-6 py-3 border border-white/20">
                <p className="text-2xl font-bold text-white">{numero}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ✨ TEXTO MODERNO PARA HIMNOS/VERSÍCULOS */}
        <AnimatePresence mode="wait">
          {(() => {
            // ✨ Solo requiere párrafo, título es opcional (para himnos sin título arriba)
            const shouldShow =
              parrafo && showContent && modoProyector === "himno";
            console.log("🔍 [Proyector] Condición renderizado texto:", {
              parrafo: !!parrafo,
              titulo: !!titulo,
              showContent,
              modoProyector,
              shouldShow,
            });
            return shouldShow;
          })() && (
            <ModernTextDisplay
              titulo={titulo}
              parrafo={parrafo}
              numero={numero}
              configuracion={configuracion}
              mostrarTitulo={mostrarTituloHimno}
            />
          )}
        </AnimatePresence>

        {/* ✨ PRESENTACIONES MODERNAS */}
        <AnimatePresence mode="wait">
          {(() => {
            const shouldShowPresentation =
              modoProyeccion === "presentacion" &&
              modoProyector !== "slide" && // ✨ NO MOSTRAR SI HAY SLIDE INDIVIDUAL
              presentacionActiva &&
              showContent;

            console.log(
              "🔍 [Proyector] Evaluando condiciones de renderizado:",
              {
                modoProyeccion,
                modoProyector,
                presentacionActiva: !!presentacionActiva,
                showContent,
                shouldShowPresentation,
                currentSlide: presentacionActiva?.slides?.[slideActual]?.title,
              },
            );

            return shouldShowPresentation;
          })() && (
            <motion.div
              key={`${presentacionActiva.id}-${slideActual}`}
              className="w-full h-screen flex items-center justify-center relative z-20 overflow-hidden"
              initial={{opacity: 0, y: 50}}
              animate={{opacity: 1, y: 0}}
              exit={{opacity: 0, y: -50}}
              transition={{duration: 0.6, ease: "easeOut"}}
            >
              {presentacionActiva.slides?.[slideActual] && (
                <div
                  className="w-full h-full flex flex-col items-center justify-center text-center relative overflow-hidden"
                  style={{
                    backgroundColor:
                      presentacionActiva.slides[slideActual].backgroundColor ||
                      "rgba(0,0,0,0.3)",
                    color:
                      presentacionActiva.slides[slideActual].textColor ||
                      "#ffffff",
                    backgroundImage: (() => {
                      const bgImage =
                        presentacionActiva.slides[slideActual].backgroundImage;
                      if (!bgImage) return "none";

                      // Verificar si la imagen ya falló
                      if (imagenesConError.has(bgImage)) {
                        console.warn(
                          "🚫 [Proyector] Imagen previamente falló, usando fallback:",
                          bgImage,
                        );
                        return "none";
                      }

                      // Optimizar URL de imagen para mejor carga
                      const optimizedUrl = optimizarUrlImagen(bgImage);
                      console.log(
                        "🖼️ [Proyector] Cargando imagen de fondo:",
                        optimizedUrl,
                      );

                      return `url(${optimizedUrl})`;
                    })(),
                    backgroundSize:
                      presentacionActiva.slides?.[slideActual]?.renderMode ===
                        "pptx" ||
                      presentacionActiva.slides?.[slideActual]?.layout ===
                        "pptx-image"
                        ? "contain"
                        : "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                  }}
                >
                  {/* Overlay para mejorar legibilidad (no aplicar a PPTX renderizado) */}
                  {!(
                    presentacionActiva.slides?.[slideActual]?.renderMode ===
                      "pptx" ||
                    presentacionActiva.slides?.[slideActual]?.layout ===
                      "pptx-image"
                  ) && (
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm rounded-xl"></div>
                  )}

                  {/* Indicador de carga de imagen */}
                  {imagenCargando && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-5">
                      <div className="flex items-center space-x-3 text-white">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                        <span className="text-lg font-medium">
                          Cargando imagen...
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Contenido de la slide */}
                  <div className="relative z-10 w-full h-full flex flex-col items-center justify-center px-8 py-4 max-h-screen overflow-hidden">
                    {/* Título */}
                    {presentacionActiva.slides[slideActual].title && (
                      <motion.h1
                        className="font-bold mb-6 leading-tight"
                        style={{
                          fontSize:
                            presentacionActiva.slides[slideActual]
                              .titleFontSize || "4rem",
                          textAlign:
                            presentacionActiva.slides[slideActual].textAlign ||
                            "center",
                          // ✨ MEJORAS PARA CALIDAD DE TEXTO
                          textRendering: "optimizeLegibility",
                          WebkitFontSmoothing: "antialiased",
                          MozOsxFontSmoothing: "grayscale",
                          fontKerning: "normal",
                          textShadow: "0 2px 4px rgba(0,0,0,0.5)", // Sombra para mejor contraste
                        }}
                        initial={{opacity: 0, y: 30}}
                        animate={{opacity: 1, y: 0}}
                        transition={{delay: 0.2, duration: 0.6}}
                      >
                        {presentacionActiva.slides[slideActual].title}
                      </motion.h1>
                    )}

                    {/* Contenido */}
                    {presentacionActiva.slides[slideActual].content && (
                      <motion.div
                        className="leading-relaxed max-h-96 overflow-hidden"
                        style={{
                          fontSize:
                            presentacionActiva.slides[slideActual].fontSize ||
                            "2.5rem",
                          textAlign:
                            presentacionActiva.slides[slideActual].textAlign ||
                            "center",
                          // ✨ MEJORAS PARA CALIDAD DE TEXTO DEL CONTENIDO
                          textRendering: "optimizeLegibility",
                          WebkitFontSmoothing: "antialiased",
                          MozOsxFontSmoothing: "grayscale",
                          fontKerning: "normal",
                          textShadow: "0 1px 3px rgba(0,0,0,0.5)", // Sombra más sutil para contenido
                        }}
                        initial={{opacity: 0, y: 30}}
                        animate={{opacity: 1, y: 0}}
                        transition={{delay: 0.4, duration: 0.6}}
                      >
                        {presentacionActiva.slides[slideActual].content
                          .split("\n")
                          .map((line, index) => (
                            <p key={index} className="mb-4">
                              {line}
                            </p>
                          ))}
                      </motion.div>
                    )}
                  </div>

                  {/* Indicador / nombre (no mostrar en PPTX renderizado) */}
                  {!(
                    presentacionActiva.slides?.[slideActual]?.renderMode ===
                      "pptx" ||
                    presentacionActiva.slides?.[slideActual]?.layout ===
                      "pptx-image"
                  ) && (
                    <>
                      <motion.div
                        className="absolute bottom-8 right-8 backdrop-blur-md bg-white/10 rounded-xl px-4 py-2 border border-white/20"
                        initial={{opacity: 0}}
                        animate={{opacity: 1}}
                        transition={{delay: 0.6}}
                      >
                        <p className="text-sm font-medium">
                          {slideActual + 1} /{" "}
                          {presentacionActiva.slides?.length || 0}
                        </p>
                      </motion.div>

                      <motion.div
                        className="absolute top-8 left-8 backdrop-blur-md bg-white/10 rounded-xl px-4 py-2 border border-white/20"
                        initial={{opacity: 0}}
                        animate={{opacity: 1}}
                        transition={{delay: 0.6}}
                      >
                        <p className="text-sm font-medium">
                          📊 {presentacionActiva.name}
                        </p>
                      </motion.div>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ✨ SLIDES INDIVIDUALES (NUEVO MODO) */}
        <AnimatePresence mode="wait">
          {modoProyector === "slide" && slideData && showContent && (
            <motion.div
              key={`slide-${slideData.slide?.id || Date.now()}`}
              className="w-full h-screen flex items-center justify-center relative z-30 overflow-hidden"
              initial={{opacity: 0, y: 50}}
              animate={{opacity: 1, y: 0}}
              exit={{opacity: 0, y: -50}}
              transition={{duration: 0.6, ease: "easeOut"}}
            >
              <div
                className="w-full h-full flex flex-col items-center justify-center text-center relative overflow-hidden"
                style={{
                  backgroundColor:
                    slideData.slide?.backgroundColor || "rgba(0,0,0,0.7)",
                  color: slideData.slide?.textColor || "#ffffff",
                  backgroundImage: slideData.slide?.backgroundImage
                    ? `url(${optimizarUrlImagen(
                        slideData.slide.backgroundImage,
                      )})`
                    : "none",
                  backgroundSize:
                    slideData.slide?.renderMode === "pptx" ||
                    slideData.slide?.layout === "pptx-image"
                      ? "contain"
                      : "cover",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                }}
              >
                {/* Overlay para mejorar legibilidad (no aplicar a PPTX renderizado) */}
                {!(
                  slideData.slide?.renderMode === "pptx" ||
                  slideData.slide?.layout === "pptx-image"
                ) && (
                  <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
                )}

                {/* Contenido de la slide */}
                <div className="relative z-10 w-full h-full flex flex-col items-center justify-center px-8 py-4 max-h-screen overflow-hidden">
                  {/* Título */}
                  {slideData.slide?.title && (
                    <motion.h1
                      className="font-bold mb-6 leading-tight"
                      style={{
                        fontSize: slideData.slide.titleFontSize || "4rem",
                        textAlign: slideData.slide.textAlign || "center",
                        // ✨ MEJORAS PARA CALIDAD DE TEXTO - SLIDES INDIVIDUALES
                        textRendering: "optimizeLegibility",
                        WebkitFontSmoothing: "antialiased",
                        MozOsxFontSmoothing: "grayscale",
                        fontKerning: "normal",
                        textShadow: "0 2px 4px rgba(0,0,0,0.5)",
                      }}
                      initial={{opacity: 0, y: 30}}
                      animate={{opacity: 1, y: 0}}
                      transition={{delay: 0.2, duration: 0.6}}
                    >
                      {slideData.slide.title}
                    </motion.h1>
                  )}

                  {/* Contenido */}
                  {slideData.slide?.content && (
                    <motion.div
                      className="leading-relaxed max-h-96 overflow-hidden"
                      style={{
                        fontSize: slideData.slide.fontSize || "2.5rem",
                        textAlign: slideData.slide.textAlign || "center",
                        // ✨ MEJORAS PARA CALIDAD DE CONTENIDO - SLIDES INDIVIDUALES
                        textRendering: "optimizeLegibility",
                        WebkitFontSmoothing: "antialiased",
                        MozOsxFontSmoothing: "grayscale",
                        fontKerning: "normal",
                        textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                      }}
                      initial={{opacity: 0, y: 30}}
                      animate={{opacity: 1, y: 0}}
                      transition={{delay: 0.4, duration: 0.6}}
                    >
                      {slideData.slide.content
                        .split("\n")
                        .map((line, index) => (
                          <p key={index} className="mb-4">
                            {line}
                          </p>
                        ))}
                    </motion.div>
                  )}
                </div>

                {/* Indicador de slide */}
                {slideData.presentation &&
                  !(
                    slideData.slide?.renderMode === "pptx" ||
                    slideData.slide?.layout === "pptx-image"
                  ) && (
                    <motion.div
                      className="absolute bottom-8 right-8 backdrop-blur-md bg-white/10 rounded-xl px-4 py-2 border border-white/20"
                      initial={{opacity: 0}}
                      animate={{opacity: 1}}
                      transition={{delay: 0.6}}
                    >
                      <p className="text-sm font-medium">
                        {slideData.presentation.currentIndex + 1} /{" "}
                        {slideData.presentation.totalSlides || 1}
                      </p>
                    </motion.div>
                  )}

                {/* Nombre de la presentación */}
                {slideData.presentation?.name &&
                  !(
                    slideData.slide?.renderMode === "pptx" ||
                    slideData.slide?.layout === "pptx-image"
                  ) && (
                    <motion.div
                      className="absolute top-8 left-8 backdrop-blur-md bg-white/10 rounded-xl px-4 py-2 border border-white/20"
                      initial={{opacity: 0}}
                      animate={{opacity: 1}}
                      transition={{delay: 0.6}}
                    >
                      <p className="text-sm font-medium">
                        📊 {slideData.presentation.name}
                      </p>
                    </motion.div>
                  )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
};

export default Proyector;
