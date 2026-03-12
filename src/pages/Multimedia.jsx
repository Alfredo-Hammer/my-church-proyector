import React, {useState, useEffect} from "react";
import {useMediaPlayer} from "../contexts/MediaPlayerContext";
import {
  FaUpload,
  FaPlay,
  FaPause,
  FaStop,
  FaVolumeUp,
  FaVideoSlash,
  FaMusic,
  FaImage,
  FaTrash,
  FaExpand,
  FaFolder,
  FaStar,
  FaRegStar,
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimes,
  FaTimesCircle,
  FaInfoCircle,
  FaLink,
  FaHistory,
  FaSearch,
  FaFilter,
  FaTh,
  FaList,
  FaDownload,
  FaEye,
  FaShare,
  FaCopy,
  FaGlobe,
  FaYoutube,
} from "react-icons/fa";

const NotificationItem = ({notification}) => {
  const getIcon = () => {
    switch (notification.type) {
      case "success":
        return <FaCheckCircle className="text-green-400" />;
      case "error":
        return <FaTimesCircle className="text-red-400" />;
      case "warning":
        return <FaExclamationTriangle className="text-yellow-400" />;
      default:
        return <FaInfoCircle className="text-blue-400" />;
    }
  };

  const getBgColor = () => {
    switch (notification.type) {
      case "success":
        return "bg-green-900/90 border-green-500/50";
      case "error":
        return "bg-red-900/90 border-red-500/50";
      case "warning":
        return "bg-yellow-900/90 border-yellow-500/50";
      default:
        return "bg-blue-900/90 border-blue-500/50";
    }
  };

  return (
    <div
      className={`${getBgColor()} backdrop-blur-sm border rounded-lg p-4 shadow-lg animate-slide-in-right`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <div
            className="text-sm text-white"
            dangerouslySetInnerHTML={{__html: notification.message}}
          />
        </div>
      </div>
    </div>
  );
};

const Multimedia = () => {
  // ✨ FUNCIÓN PARA OBTENER LA URL BASE CORRECTA
  const getBaseURL = () => {
    // En producción, el servidor Express siempre está en localhost:3001
    // Esto funciona porque main.js inicia el servidor antes de cargar la UI
    return "http://localhost:3001";
  };

  // ✨ Usar el reproductor global del contexto
  const {
    currentMedia,
    lastPlayedMedia,
    isPlaying,
    volume,
    setVolume,
    playMedia: playMediaGlobal,
    togglePlayPause,
    stop: stopGlobal,
    pause,
    resume,
  } = useMediaPlayer();

  // Estados principales
  const [mediaFiles, setMediaFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  // Estados para URLs y historial
  const [urlInput, setUrlInput] = useState("");
  const [urlTitle, setUrlTitle] = useState("");
  const [customQuickLinks, setCustomQuickLinks] = useState([]);
  const [urlHistory, setUrlHistory] = useState([]);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Estados para UI
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [notifications, setNotifications] = useState([]);

  // Estado para control remoto del proyector
  const [proyectingMedia, setProyectingMedia] = useState(null);

  // Estado de conectividad a internet
  const [hayInternet, setHayInternet] = useState(navigator.onLine);

  // ✨ VERIFICAR Y CONFIGURAR ELECTRON API AL INICIO
  useEffect(() => {
    console.log("🔌 [Multimedia] Verificando conexión con Electron...");

    // Verificar métodos disponibles
    const metodosDisponibles = {
      obtenerMultimedia:
        !!window.electron?.obtenerMultimedia ||
        !!window.electronAPI?.obtenerMultimedia,
      proyectarMultimedia:
        !!window.electron?.proyectarMultimedia ||
        !!window.electronAPI?.proyectarMultimedia,
      limpiarProyector:
        !!window.electron?.limpiarProyector ||
        !!window.electronAPI?.limpiarProyector,
      incrementarReproducido:
        !!window.electron?.incrementarReproducido ||
        !!window.electronAPI?.incrementarReproducido,
    };

    console.log("📋 [Multimedia] Métodos IPC disponibles:", metodosDisponibles);

    if (!metodosDisponibles.proyectarMultimedia) {
      showError(
        "⚠️ Funciones de proyección no disponibles. Verifica la conexión con Electron.",
      );
    }

    // Cargar datos iniciales
    const savedHistory = localStorage.getItem("multimedia-url-history");
    if (savedHistory) {
      setUrlHistory(JSON.parse(savedHistory));
    }

    const savedQuickLinks = localStorage.getItem("multimedia-quick-links");
    if (savedQuickLinks) {
      setCustomQuickLinks(JSON.parse(savedQuickLinks));
    }

    loadMediaFromDB();
  }, []);

  // Monitorear conectividad a internet
  useEffect(() => {
    const handleOnline = () => {
      setHayInternet(true);
      showSuccess("✅ Conexión a Internet restaurada", 3000);
    };

    const handleOffline = () => {
      setHayInternet(false);
      showWarning(
        "⚠️ Sin conexión a Internet. Contenido en línea (YouTube) no disponible.",
        5000,
      );
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✨ FUNCIONES MEJORADAS PARA NOTIFICACIONES
  const addNotification = (message, type = "info", duration = 5000) => {
    const id = Date.now() + Math.random();
    const notification = {id, message, type, duration};
    setNotifications((prev) => [...prev, notification]);
    setTimeout(() => removeNotification(id), duration);
    return id;
  };

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
  };

  const showSuccess = (message, duration = 3000) =>
    addNotification(message, "success", duration);
  const showWarning = (message, duration = 4000) =>
    addNotification(message, "warning", duration);
  const showError = (message, duration = 5000) =>
    addNotification(message, "error", duration);
  const showInfo = (message, duration = 4000) =>
    addNotification(message, "info", duration);

  // ✨ FUNCIÓN DE VERIFICACIÓN Y CORRECCIÓN DE URL
  const verificarYCorregirUrl = async (url) => {
    try {
      const response = await fetch(url, {method: "HEAD"});
      if (response.ok) {
        return url;
      }
    } catch (error) {
      console.warn(
        "⚠️ [Multimedia] URL principal falló, intentando corrección:",
        error,
      );
    }

    // Si falla, intentar con el endpoint de corrección
    const nombreArchivo = url.split("/").pop();
    const urlCorregida = `${getBaseURL()}/multimedia-fixed/${nombreArchivo}`;

    try {
      const response = await fetch(urlCorregida, {method: "HEAD"});
      if (response.ok) {
        console.log("✅ [Multimedia] URL corregida exitosa:", urlCorregida);
        return urlCorregida;
      }
    } catch (error) {
      console.error("❌ [Multimedia] Falló también la URL corregida:", error);
    }

    return url; // Devolver la original si todo falla
  };

  // ✨ FUNCIÓN DE VERIFICACIÓN DEL SERVIDOR MULTIMEDIA
  const verificarServidorMultimedia = async () => {
    try {
      console.log("🔍 [Debug] Verificando servidor multimedia...");

      // Probar conectividad básica
      const response = await fetch(`${getBaseURL()}/debug/multimedia`, {
        method: "GET",
        timeout: 5000,
      });

      if (!response.ok) {
        throw new Error(`Servidor respondió con ${response.status}`);
      }

      const data = await response.json();

      console.log("✅ [Debug] Servidor multimedia funcionando:");
      console.log(`  - Puerto: 3001`);
      console.log(`  - Public dir: ${data.publicDir}`);
      console.log(`  - Build dir: ${data.buildDir}`);
      console.log(`  - Archivos public: ${data.publicFiles.length}`);
      console.log(`  - Archivos build: ${data.buildFiles.length}`);

      return {
        working: true,
        port: 3001,
        filesCount: data.totalFiles.length,
        directories: [data.publicDir, data.buildDir],
        files: data.totalFiles,
      };
    } catch (error) {
      console.error("❌ [Debug] Error verificando servidor multimedia:", error);
      return {
        working: false,
        error: error.message,
        port: 3001,
      };
    }
  };

  // ✨ FUNCIÓN DE VALIDACIÓN COMPLETA DE MULTIMEDIA
  const validarMultimediaAntes = async (media) => {
    console.log("🔍 [Validación] ========== INICIO VALIDACIÓN ==========");
    console.log(
      "🔍 [Validación] Validando multimedia antes de reproducir:",
      media,
    );

    try {
      // 1. Verificar que tenemos datos básicos
      if (!media) {
        console.error("❌ [Validación] No se proporcionó objeto multimedia");
        throw new Error("No se proporcionó objeto multimedia");
      }

      if (!media.nombre && !media.url && !media.ruta_archivo) {
        console.error("❌ [Validación] Multimedia sin nombre, URL o ruta");
        throw new Error("Multimedia sin nombre, URL o ruta de archivo");
      }

      // 2. Construir URL como lo haríamos normalmente
      let mediaUrl;

      if (
        media.url &&
        (media.url.startsWith("http://") || media.url.startsWith("https://"))
      ) {
        mediaUrl = media.url;
        console.log("✅ [Validación] URL detectada directamente:", mediaUrl);
      } else if (media.url) {
        const urlLimpia = media.url.replace(/^\/+/, "");
        if (urlLimpia.startsWith("multimedia/")) {
          mediaUrl = `${getBaseURL()}/${urlLimpia}`;
        } else {
          mediaUrl = `${getBaseURL()}/multimedia/${urlLimpia}`;
        }
      } else if (media.ruta_archivo) {
        if (
          media.ruta_archivo.startsWith("http://") ||
          media.ruta_archivo.startsWith("https://")
        ) {
          mediaUrl = media.ruta_archivo;
        } else {
          const archivoLimpio = media.ruta_archivo.replace(/^.*[\\\/]/, "");
          if (media.ruta_archivo.includes("/multimedia/")) {
            const parteDespuesMultimedia =
              media.ruta_archivo.split("/multimedia/")[1];
            mediaUrl = `${getBaseURL()}/multimedia/${parteDespuesMultimedia}`;
          } else {
            mediaUrl = `${getBaseURL()}/multimedia/${archivoLimpio}`;
          }
        }
      } else if (media.nombre) {
        mediaUrl = `${getBaseURL()}/multimedia/${media.nombre}`;
      } else {
        throw new Error("No se pudo determinar la URL del archivo");
      }

      console.log("🔍 [Validación] URL construida:", mediaUrl);

      // 3. ✨ VERIFICACIÓN ESPECIAL PARA YOUTUBE
      // Si es YouTube o URL externa, no validar archivo local
      if (
        media.isYoutube ||
        isYouTubeUrl(mediaUrl) ||
        isYouTubeUrl(media.url) ||
        isYouTubeUrl(media.ruta_archivo) ||
        media.tipo === "youtube" ||
        (mediaUrl &&
          (mediaUrl.includes("youtube.com") || mediaUrl.includes("youtu.be")))
      ) {
        console.log(
          "📺 [Validación] ✅ Es video de YouTube, saltando validación de archivo local",
        );
        console.log(
          "📺 [Validación] Retornando válido para YouTube con URL:",
          mediaUrl,
        );

        // ✅ Para YouTube, confiar en la URL sin validar conectividad
        // Esto evita bloqueos por firewall o problemas de red
        return {
          valid: true,
          url: mediaUrl,
          isYoutube: true,
          contentType: "video/youtube",
        };
      }

      // 4. Para archivos locales, verificar que el archivo existe
      const urlValidada = await verificarYCorregirUrl(mediaUrl);

      // 5. Hacer una verificación final con HEAD request (con timeout de 10 segundos)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout

      try {
        const response = await fetch(urlValidada, {
          method: "HEAD",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Archivo no accesible: HTTP ${response.status}`);
        }

        console.log("✅ [Validación] Multimedia validada exitosamente");
        return {
          valid: true,
          url: urlValidada,
          contentType: response.headers.get("content-type"),
          size: response.headers.get("content-length"),
        };
      } catch (error) {
        clearTimeout(timeoutId);

        // Si el timeout fue excedido, asumir que el archivo es muy grande pero válido
        if (error.name === "AbortError") {
          console.warn(
            "⚠️ [Validación] Timeout en validación (archivo grande), permitiendo reproducción",
          );
          return {
            valid: true,
            url: urlValidada,
            contentType: "video/mp4", // Asumir video
            warning: "Archivo muy grande, validación omitida",
          };
        }

        throw error;
      }
    } catch (error) {
      console.error("❌ [Validación] Error validando multimedia:", error);
      return {
        valid: false,
        error: error.message,
        url: null,
      };
    }
  };

  // ✨ FUNCIONES DE CONTROL REMOTO DEL PROYECTOR
  const enviarComandoProyector = async (comando, datos = null) => {
    try {
      console.log(`🎮 [Control] Enviando comando: ${comando}`, datos);

      if (window.electron?.send) {
        window.electron.send(`proyector-${comando}`, datos);
        console.log(`✅ [Control] Comando ${comando} enviado`);
        return true;
      } else {
        console.warn("⚠️ [Control] window.electron.send no disponible");
        return false;
      }
    } catch (error) {
      console.error(`❌ [Control] Error enviando comando ${comando}:`, error);
      return false;
    }
  };

  const playProyector = () => {
    enviarComandoProyector("play");
    showInfo("▶️ Reproduciendo en proyector");
  };

  const pauseProyector = () => {
    enviarComandoProyector("pause");
    showInfo("⏸️ Pausado en proyector");
  };

  const stopProyector = () => {
    enviarComandoProyector("stop");
    showInfo("⏹️ Detenido en proyector");
  };

  const limpiarProyectorRemoto = () => {
    enviarComandoProyector("limpiar");
    showInfo("🧹 Proyector limpiado");
    // Limpiar estado local también
    setProyectingMedia(null);
  };

  // ✨ FUNCIÓN MEJORADA PARA CARGAR MULTIMEDIA DESDE DB
  const loadMediaFromDB = async () => {
    try {
      setLoading(true);
      console.log("📦 [Multimedia] Cargando multimedia desde DB...");

      let multimedia = [];

      // Intentar diferentes métodos IPC
      if (window.electron?.["db-obtener-multimedia"]) {
        multimedia = await window.electron["db-obtener-multimedia"]();
      } else if (window.electronAPI?.obtenerMultimedia) {
        multimedia = await window.electronAPI.obtenerMultimedia();
      } else if (window.electron?.obtenerMultimedia) {
        multimedia = await window.electron.obtenerMultimedia();
      } else {
        console.warn(
          "⚠️ [Multimedia] No se encontró método para obtener multimedia",
        );
        multimedia = [];
      }

      console.log(
        "✅ [Multimedia] Multimedia cargada:",
        multimedia?.length || 0,
      );
      console.log("📋 [Multimedia] Lista completa de archivos:");
      multimedia?.forEach((media, index) => {
        console.log(
          `  ${index + 1}. ${media.nombre || media.name || "Sin nombre"}`,
        );
        console.log(`     - ID: ${media.id}`);
        console.log(`     - Tipo: ${media.tipo || media.type}`);
        console.log(`     - URL: ${media.url}`);
        console.log(`     - Ruta: ${media.ruta_archivo}`);
        console.log(`     - Extension: ${media.extension}`);
        console.log("     - Objeto completo:", media);
      });

      // Migrar URLs antiguas (localStorage) a la BD para que también aparezcan en la app móvil.
      // Esto evita que la sección Multimedia del móvil quede vacía si el usuario solo usaba URLs.
      let multimediaDespues = multimedia || [];
      try {
        // Nota: históricamente se han guardado URLs en distintas claves de localStorage.
        // - multimedia-urls (legacy)
        // - multimedia-quick-links (accesos rápidos)
        // - multimedia-url-history (historial)
        // Si una URL existe solo en localStorage, la app móvil NO la verá (móvil usa la BD).
        if (window.electron?.agregarMultimedia) {
          const existentes = new Set(
            (Array.isArray(multimediaDespues) ? multimediaDespues : [])
              .flatMap((m) => [m?.url, m?.ruta_archivo])
              .map((v) => String(v || "").trim())
              .filter(Boolean),
          );

          const inferirTipoDesdeUrl = (rawUrl) => {
            const urlStr = String(rawUrl || "").trim();
            if (!urlStr) return "video";
            if (isYouTubeUrl(urlStr)) return "youtube";

            const extension = urlStr
              .split(".")
              .pop()
              ?.toLowerCase()
              .split("?")[0];
            if (
              ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(extension)
            ) {
              return "imagen";
            }
            if (
              ["mp3", "wav", "ogg", "aac", "flac", "m4a"].includes(extension)
            ) {
              return "audio";
            }
            if (["mp4", "webm", "avi", "mov", "mkv"].includes(extension)) {
              return "video";
            }
            return "video";
          };

          const normalizarUrlParaBD = (rawUrl) => {
            const urlStr = String(rawUrl || "").trim();
            if (!urlStr) return {urlOriginal: "", urlFinal: "", tipo: "video"};

            if (isYouTubeUrl(urlStr)) {
              const videoId = extractVideoId(urlStr);
              if (!videoId) {
                return {urlOriginal: urlStr, urlFinal: "", tipo: "youtube"};
              }
              const embed = `https://www.youtube.com/embed/${videoId}?autoplay=0&controls=1&rel=0&modestbranding=1&fs=1`;
              return {urlOriginal: urlStr, urlFinal: embed, tipo: "youtube"};
            }

            return {
              urlOriginal: urlStr,
              urlFinal: urlStr,
              tipo: inferirTipoDesdeUrl(urlStr),
            };
          };

          const intentarInsertarSiNoExiste = async ({
            nombre,
            rawUrl,
            favorito,
          }) => {
            const {urlOriginal, urlFinal, tipo} = normalizarUrlParaBD(rawUrl);
            if (!urlOriginal || !urlFinal) return;

            const key1 = String(urlFinal).trim();
            const key2 = String(urlOriginal).trim();
            if (existentes.has(key1) || existentes.has(key2)) return;

            try {
              await window.electron.agregarMultimedia({
                nombre: String(nombre || "URL").trim() || "URL",
                tipo,
                tamaño: null,
                ruta_archivo: urlOriginal,
                url: urlFinal,
                favorito: Boolean(favorito),
                tags: [],
              });
              existentes.add(key1);
              existentes.add(key2);
            } catch (e) {
              console.warn("⚠️ [Multimedia] No se pudo guardar URL en BD:", e);
            }
          };

          // 1) Migrar multimedia-urls (legacy) a BD y eliminarlo (ya queda en BD)
          const savedUrls = localStorage.getItem("multimedia-urls");
          if (savedUrls) {
            const urlsGuardadas = JSON.parse(savedUrls);
            const urlsArray = Array.isArray(urlsGuardadas) ? urlsGuardadas : [];
            for (const item of urlsArray) {
              await intentarInsertarSiNoExiste({
                nombre: item?.nombre || item?.name || "URL",
                rawUrl: item?.originalUrl || item?.url,
                favorito: Boolean(item?.favorito),
              });
            }
            localStorage.removeItem("multimedia-urls");
          }

          // 2) Migrar accesos rápidos a BD (NO se eliminan: siguen siendo UI local)
          const savedQuickLinks = localStorage.getItem(
            "multimedia-quick-links",
          );
          if (savedQuickLinks) {
            const quickLinks = JSON.parse(savedQuickLinks);
            const quickLinksArray = Array.isArray(quickLinks) ? quickLinks : [];
            for (const link of quickLinksArray) {
              await intentarInsertarSiNoExiste({
                nombre: link?.name || link?.title || "URL",
                rawUrl: link?.url,
                favorito: false,
              });
            }
          }

          // Recargar lista desde BD para reflejar migraciones/sincronización
          try {
            multimediaDespues =
              await window.electron["db-obtener-multimedia"]?.();
            if (!Array.isArray(multimediaDespues))
              multimediaDespues = multimedia || [];
          } catch {
            multimediaDespues = multimedia || [];
          }
        }
      } catch (e) {
        console.warn("⚠️ [Multimedia] Error migrando URLs antiguas:", e);
      }

      // Usar solo BD (las URLs ya migradas quedan aquí)
      const mediaCompleta = [...(multimediaDespues || [])];
      setMediaFiles(mediaCompleta);

      console.log(
        "📊 [Multimedia] Media completa combinada:",
        mediaCompleta.length,
      );
      console.log(
        "📊 [Multimedia] URLs en media completa:",
        mediaCompleta.filter((m) => m.isUrl).length,
      );
      console.log(
        "📊 [Multimedia] Todos los items con isUrl:",
        mediaCompleta.filter((m) => m.isUrl),
      );

      // IMPORTANTE: no auto-reproducir al navegar a esta página.
      // El usuario debe iniciar la reproducción manualmente.
    } catch (error) {
      console.error("❌ [Multimedia] Error al cargar multimedia:", error);
      showError(`❌ Error cargando biblioteca: ${error.message}`);
      setMediaFiles([]);
    } finally {
      setLoading(false);
    }
  };

  // ✨ FUNCIÓN MEJORADA PARA REPRODUCIR MEDIA
  const playMedia = async (media) => {
    try {
      // ✅ VALIDAR SI ES YOUTUBE Y HAY INTERNET
      const esYoutube =
        media.isYoutube ||
        isYouTubeUrl(media.url) ||
        isYouTubeUrl(media.ruta_archivo) ||
        media.tipo === "youtube";

      if (esYoutube && !hayInternet) {
        showError(
          "⚠️ <strong>Se requiere conexión a Internet</strong><br/>Los videos de YouTube necesitan una conexión activa para reproducirse.",
          6000,
        );
        return;
      }

      // ✨ VALIDAR ANTES DE REPRODUCIR
      const validacion = await validarMultimediaAntes(media);
      console.log("🔍 [Multimedia] Resultado de validación:", validacion);

      if (!validacion.valid) {
        const esYoutube =
          media.isYoutube ||
          isYouTubeUrl(media.url) ||
          isYouTubeUrl(media.ruta_archivo) ||
          media.tipo === "youtube";

        let mensajeError;
        if (esYoutube) {
          mensajeError = `❌ No se puede reproducir video de YouTube: ${validacion.error}`;
          showError(
            `${mensajeError}<br/>📺 Verifique su conexión a internet y que la URL de YouTube sea válida`,
          );
        } else {
          mensajeError = `❌ Archivo no disponible: ${validacion.error}`;
          showError(
            `${mensajeError}<br/>📁 Verifique que el archivo existe en multimedia/<br/>💡 Use el botón "Debug: Ver Archivos Disponibles" para revisar archivos disponibles`,
          );
        }

        console.error("❌ [Multimedia] Validación falló:", mensajeError);
        return; // No continuar si la validación falla
      }

      console.log(
        "✅ [Multimedia] Validación exitosa, procediendo a reproducir",
      );

      // Incrementar contador si no es URL
      if (!media.isUrl && media.id) {
        try {
          if (window.electron?.["db-incrementar-reproducido"]) {
            await window.electron["db-incrementar-reproducido"](media.id);
          } else if (window.electronAPI?.incrementarReproducido) {
            await window.electronAPI.incrementarReproducido(media.id);
          }
        } catch (error) {
          console.warn(
            "⚠️ [Multimedia] No se pudo incrementar contador:",
            error,
          );
        }
      }

      // Actualizar el media con la URL validada
      const mediaConUrlValidada = {
        ...media,
        url: validacion.url,
        validatedUrl: validacion.url,
        // Importante: los items provenientes de la BD normalmente no traen isYoutube,
        // pero la UI (preview/controles) lo usaba para decidir entre <iframe> y <video>.
        // Propagamos aquí para que la reproducción no falle.
        isYoutube: Boolean(
          validacion?.isYoutube ||
          media?.isYoutube ||
          media?.tipo === "youtube" ||
          isYouTubeUrl(validacion?.url) ||
          isYouTubeUrl(media?.url) ||
          isYouTubeUrl(media?.ruta_archivo),
        ),
      };

      // ✨ Usar el reproductor global del contexto
      playMediaGlobal(mediaConUrlValidada);
      showSuccess(`▶️ Reproduciendo: ${getMediaName(media)}`);
    } catch (error) {
      console.error("❌ [Multimedia] Error al reproducir media:", error);
      showError(`❌ Error reproduciendo: ${error.message}`);
    }
  };

  // ✨ Función personalizada para controlar play/pause
  // Para videos: controla el elemento <video> local
  // Para audio: usa el contexto global
  const handleTogglePlayPause = () => {
    const effectiveMedia = currentMedia || lastPlayedMedia;
    if (!effectiveMedia) return;

    // Si no hay media seleccionada "actual" pero sí última reproducción,
    // el primer click debe seleccionar y reproducir ese contenido.
    if (!currentMedia) {
      playMedia(effectiveMedia);
      return;
    }

    // Usar el contexto global para todos los tipos de media
    togglePlayPause();
  };

  // ✨ FUNCIÓN DE PRUEBA SIMPLIFICADA PARA PROYECCIÓN
  // ✨ FUNCIÓN NUEVA: PROYECTAR USANDO PATRÓN DE FONDOS
  const projectToScreenNew = async (media) => {
    try {
      console.log(
        "🚀 [Multimedia] ========== NUEVA PROYECCIÓN CON VALIDACIÓN ==========",
      );
      console.log("📺 [Multimedia] Proyectando multimedia:", media);

      // ✨ VALIDAR ANTES DE PROYECTAR
      console.log("🔍 [Multimedia] Validando multimedia antes de proyectar...");
      const validacion = await validarMultimediaAntes(media);

      if (!validacion.valid) {
        const esYoutube =
          media.isYoutube ||
          isYouTubeUrl(media.url) ||
          isYouTubeUrl(media.ruta_archivo) ||
          media.tipo === "youtube";

        let mensajeError;
        if (esYoutube) {
          mensajeError = `❌ No se puede proyectar video de YouTube: ${validacion.error}`;
          showError(
            `${mensajeError}<br/>📺 Verifique su conexión a internet y que la URL de YouTube sea válida`,
          );
        } else {
          mensajeError = `❌ No se puede proyectar: ${validacion.error}`;
          showError(
            `${mensajeError}<br/>📁 Verifique que el archivo existe en multimedia/<br/>💡 Use el botón "Debug: Ver Archivos Disponibles" para revisar archivos disponibles`,
          );
        }

        console.error(
          "❌ [Multimedia] Validación de proyección falló:",
          mensajeError,
        );
        return; // No continuar si la validación falla
      }

      console.log(
        "✅ [Multimedia] Validación exitosa, procediendo a proyectar",
      );
      console.log("🔗 [Multimedia] URL validada:", validacion.url);

      // 🔍 DIAGNÓSTICO CRÍTICO: ¿QUÉ DATOS ESTAMOS RECIBIENDO?
      console.log("🔍 [Multimedia] === DIAGNÓSTICO DE DATOS ===");
      console.log("🔍 [Multimedia] Tipo de objeto media:", typeof media);
      console.log(
        "🔍 [Multimedia] ¿Es null/undefined?:",
        media === null || media === undefined,
      );
      if (media) {
        console.log(
          "🔍 [Multimedia] Tiene propiedades:",
          Object.keys(media).length > 0,
        );
        console.log(
          "🔍 [Multimedia] Propiedades disponibles:",
          Object.keys(media),
        );
        console.log(
          "🔍 [Multimedia] Valores de propiedades:",
          Object.entries(media),
        );
      }
      console.log("🔍 [Multimedia] === FIN DIAGNÓSTICO ===");

      // Validar datos básicos
      if (!media) {
        throw new Error("No se recibió objeto multimedia");
      }

      // ✨ USAR LA URL YA VALIDADA (NO CONSTRUIR DE NUEVO)
      const mediaUrl = validacion.url;
      console.log("🔗 [Multimedia] Usando URL pre-validada:", mediaUrl);

      // Preparar datos para multimedia activa
      const multimediaData = {
        tipo: getMediaType(media),
        url: mediaUrl,
        nombre: getMediaName(media),
        multimediaData: media,
        timestamp: new Date().toISOString(),
      };

      console.log(
        "🎬 [Multimedia] Datos preparados para multimedia activa:",
        multimediaData,
      );

      // ✨ VALIDACIÓN PREVIA ANTES DEL ENVÍO
      if (!multimediaData.tipo || multimediaData.tipo === "unknown") {
        throw new Error(`Tipo de archivo no válido: ${multimediaData.tipo}`);
      }

      if (!multimediaData.url) {
        throw new Error("URL del archivo no está disponible");
      }

      if (
        !multimediaData.url.startsWith("http://") &&
        !multimediaData.url.startsWith("https://")
      ) {
        throw new Error(`URL no es completa: ${multimediaData.url}`);
      }

      console.log(
        "✅ [Multimedia] Validación previa exitosa, estableciendo multimedia activa...",
      );

      // ✨ ABRIR PROYECTOR PRIMERO
      console.log("🖥️ [Multimedia] Abriendo proyector...");
      if (window.electron?.abrirProyector) {
        try {
          await window.electron.abrirProyector();
          console.log("✅ [Multimedia] Proyector abierto");
        } catch (error) {
          console.warn("⚠️ [Multimedia] No se pudo abrir proyector:", error);
        }
      }

      // Dar tiempo para que se abra la ventana
      await new Promise((resolve) => setTimeout(resolve, 500));

      // ✨ ESTABLECER MULTIMEDIA ACTIVA EN BD (SIGUIENDO PATRÓN DE FONDOS)
      if (window.electron?.establecerMultimediaActiva) {
        console.log("🎬 [Multimedia] Estableciendo multimedia activa en BD...");
        const resultado =
          await window.electron.establecerMultimediaActiva(multimediaData);

        if (resultado) {
          console.log(
            "✅ [Multimedia] Multimedia activa establecida exitosamente",
          );

          // Mostrar notificación de éxito
          addNotification({
            type: "success",
            message: `Proyectando: ${multimediaData.nombre}`,
            duration: 3000,
          });

          // Si en escritorio ya está reproduciendo, iniciar reproducción en el proyector.
          // Esto evita tener que dar "play" manualmente en la pantalla del proyector.
          if (isPlaying && window.electron?.send) {
            setTimeout(() => {
              try {
                window.electron.send("proyector-control-multimedia", {
                  action: "play",
                });

                // Sincronizar volumen actual (0..1). Para YouTube esto también hace unMute si corresponde.
                if (typeof volume === "number" && !Number.isNaN(volume)) {
                  window.electron.send("proyector-control-multimedia", {
                    action: "volume",
                    volume: Math.max(0, Math.min(1, volume / 100)),
                  });
                }
              } catch (error) {
                console.warn(
                  "⚠️ [Multimedia] No se pudo enviar PLAY al proyector:",
                  error,
                );
              }
            }, 400);
          }
        } else {
          throw new Error("Error estableciendo multimedia activa en BD");
        }
      } else {
        throw new Error("Función establecerMultimediaActiva no disponible");
      }
    } catch (error) {
      console.error("❌ [Multimedia] Error en proyección:", error);
      addNotification({
        type: "error",
        message: `Error proyectando: ${error.message}`,
        duration: 5000,
      });
    }
  };

  // ✨ FUNCIÓN MEJORADA PARA PROYECTAR EN PANTALLA
  const projectToScreen = async (media) => {
    try {
      console.log(
        "🚀 [Multimedia] ========== INICIANDO PROYECCIÓN REAL ==========",
      );
      console.log("📺 [Multimedia] Proyectando en pantalla:", media);

      // 🔍 DIAGNÓSTICO CRÍTICO: ¿QUÉ DATOS ESTAMOS RECIBIENDO?
      console.log("🔍 [Multimedia] === DIAGNÓSTICO DE DATOS ===");
      console.log("🔍 [Multimedia] Tipo de objeto media:", typeof media);
      console.log(
        "🔍 [Multimedia] ¿Es null/undefined?:",
        media === null || media === undefined,
      );
      if (media) {
        console.log(
          "🔍 [Multimedia] Tiene propiedades:",
          Object.keys(media).length > 0,
        );
        console.log(
          "🔍 [Multimedia] Propiedades disponibles:",
          Object.keys(media),
        );
        console.log(
          "🔍 [Multimedia] Valores de propiedades:",
          Object.entries(media),
        );
      }
      console.log("🔍 [Multimedia] === FIN DIAGNÓSTICO ===");

      console.log("📺 [Multimedia] Estructura completa del objeto media:");
      console.log("📺 [Multimedia] - media.id:", media.id);
      console.log("📺 [Multimedia] - media.nombre:", media.nombre);
      console.log("📺 [Multimedia] - media.name:", media.name);
      console.log("📺 [Multimedia] - media.tipo:", media.tipo);
      console.log("📺 [Multimedia] - media.type:", media.type);
      console.log("📺 [Multimedia] - media.url:", media.url);
      console.log("📺 [Multimedia] - media.ruta_archivo:", media.ruta_archivo);
      console.log("📺 [Multimedia] - media.extension:", media.extension);
      console.log("📺 [Multimedia] - media.isYoutube:", media.isYoutube);
      console.log("📺 [Multimedia] - Todas las propiedades:");
      Object.keys(media).forEach((key) => {
        console.log(`    ${key}:`, media[key]);
      });

      // ✨ CONSTRUIR URL COMPLETA CORRECTAMENTE
      let mediaUrl;

      if (media.url) {
        // Si la URL ya es completa (http://)
        if (
          media.url.startsWith("http://") ||
          media.url.startsWith("https://")
        ) {
          mediaUrl = media.url;
          console.log("🔗 [Multimedia] URL ya es completa:", mediaUrl);
        } else {
          // Si es una URL relativa, agregar el servidor multimedia
          mediaUrl = `${getBaseURL()}/multimedia${
            media.url.startsWith("/") ? media.url : "/" + media.url
          }`;
          console.log(
            "🔗 [Multimedia] URL construida desde URL relativa:",
            mediaUrl,
          );
        }
      } else if (media.ruta_archivo) {
        // Construir desde ruta_archivo - asegurar que use la ruta multimedia
        if (
          media.ruta_archivo.startsWith("http://") ||
          media.ruta_archivo.startsWith("https://")
        ) {
          mediaUrl = media.ruta_archivo;
          console.log(
            "🔗 [Multimedia] URL tomada de ruta_archivo completa:",
            mediaUrl,
          );
        } else {
          const archivoLimpio = media.ruta_archivo.replace(/^.*[\\\/]/, ""); // Solo el nombre del archivo
          mediaUrl = `${getBaseURL()}/multimedia/${archivoLimpio}`;
          console.log(
            "🔗 [Multimedia] URL construida desde nombre de archivo:",
            mediaUrl,
          );
        }
      } else if (media.nombre) {
        // Como último recurso, intentar con el nombre del archivo
        mediaUrl = `${getBaseURL()}/multimedia/${media.nombre}`;
      } else {
        throw new Error("No se pudo determinar la URL del archivo");
      }

      // ✨ VERIFICAR Y CORREGIR URL TAMBIÉN AQUÍ
      mediaUrl = await verificarYCorregirUrl(mediaUrl);

      console.log("🔗 [Multimedia] URL original:", media.url);
      console.log("🔗 [Multimedia] Ruta archivo:", media.ruta_archivo);
      console.log("🔗 [Multimedia] Nombre:", media.nombre);
      console.log("🔗 [Multimedia] URL completa construida:", mediaUrl);

      // Preparar datos para el proyector
      const mediaData = {
        tipo: getMediaType(media),
        url: mediaUrl,
        nombre: getMediaName(media),
        multimediaData: media,
      };

      console.log(
        "📺 [Multimedia] Datos preparados con URL completa:",
        mediaData,
      );
      console.log("📺 [Multimedia] - Tipo detectado:", getMediaType(media));
      console.log("📺 [Multimedia] - Nombre detectado:", getMediaName(media));
      console.log("📺 [Multimedia] - URL final:", mediaUrl);
      console.log(
        "📺 [Multimedia] - ¿Es YouTube?:",
        media.isYoutube || isYouTubeUrl(mediaUrl),
      );

      // ✨ VALIDACIÓN PREVIA ANTES DEL ENVÍO
      if (!mediaData.tipo || mediaData.tipo === "unknown") {
        throw new Error(`Tipo de archivo no válido: ${mediaData.tipo}`);
      }

      if (!mediaData.url) {
        throw new Error("URL del archivo no está disponible");
      }

      if (
        !mediaData.url.startsWith("http://") &&
        !mediaData.url.startsWith("https://")
      ) {
        throw new Error(`URL no es completa: ${mediaData.url}`);
      }

      console.log(
        "✅ [Multimedia] Validación previa exitosa, procediendo con envío...",
      );

      // ✨ ABRIR PROYECTOR USANDO EL MISMO MÉTODO QUE PRESENTATIONMANAGER
      console.log("� [Multimedia] Abriendo proyector...");
      if (window.electron?.abrirProyector) {
        try {
          await window.electron.abrirProyector();
          console.log("✅ [Multimedia] Proyector abierto");
        } catch (error) {
          console.warn("⚠️ [Multimedia] No se pudo abrir proyector:", error);
        }
      }

      // Dar tiempo para que se abra la ventana
      await new Promise((resolve) => setTimeout(resolve, 500));

      // ✨ ENVÍO CON MÚLTIPLES MÉTODOS - SEGUIR PATRÓN DE PRESENTATIONMANAGER
      let proyectionExitosa = false;
      let errorDetails = [];

      // ✨ MÉTODOS DE PROYECCIÓN MEJORADOS - SEGUIR PATRÓN DE PRESENTATIONMANAGER

      // Método 1: Envío directo al proyector (más efectivo)
      if (window.electron?.send && !proyectionExitosa) {
        try {
          console.log("📺 [Multimedia] Método 1: Envío directo al proyector");
          console.log("📺 [Multimedia] Canal: proyectar-multimedia-data");
          console.log("📺 [Multimedia] Datos a enviar:", mediaData);

          window.electron.send("proyectar-multimedia-data", mediaData);
          console.log(
            "✅ [Multimedia] Datos enviados por canal proyectar-multimedia-data",
          );

          // Esperar un poco para que se procese
          await new Promise((resolve) => setTimeout(resolve, 800));
          proyectionExitosa = true;
          console.log("✅ [Multimedia] Envío directo exitoso");
        } catch (error) {
          console.error("❌ [Multimedia] Error en envío directo:", error);
          errorDetails.push(`envío directo: ${error.message}`);
        }
      }

      // Método 2: proyectarMultimedia
      if (window.electron?.proyectarMultimedia && !proyectionExitosa) {
        try {
          console.log("📺 [Multimedia] Método 2: proyectarMultimedia");
          const resultado =
            await window.electron.proyectarMultimedia(mediaData);
          console.log(
            "📺 [Multimedia] Respuesta proyectarMultimedia:",
            resultado,
          );

          if (resultado?.success) {
            proyectionExitosa = true;
            console.log("✅ [Multimedia] proyectarMultimedia exitoso");
          } else {
            errorDetails.push(
              `proyectarMultimedia: ${
                resultado?.error || "Sin respuesta exitosa"
              }`,
            );
          }
        } catch (error) {
          console.error("❌ [Multimedia] Error en proyectarMultimedia:", error);
          errorDetails.push(`proyectarMultimedia: ${error.message}`);
        }
      }

      // Método 3: enviarMultimedia (método directo)
      if (window.electron?.enviarMultimedia && !proyectionExitosa) {
        try {
          console.log("📺 [Multimedia] Método 3: enviarMultimedia");
          window.electron.enviarMultimedia(mediaData);

          // Esperar un poco para verificar
          await new Promise((resolve) => setTimeout(resolve, 500));
          proyectionExitosa = true;
          console.log("✅ [Multimedia] enviarMultimedia ejecutado");
        } catch (error) {
          console.error("❌ [Multimedia] Error en enviarMultimedia:", error);
          errorDetails.push(`enviarMultimedia: ${error.message}`);
        }
      }

      // Método 4: invoke directo
      if (window.electron?.invoke && !proyectionExitosa) {
        try {
          console.log("📺 [Multimedia] Método 4: invoke");
          const resultado = await window.electron.invoke(
            "proyectar-multimedia",
            mediaData,
          );
          console.log("📺 [Multimedia] Respuesta invoke:", resultado);

          if (resultado?.success) {
            proyectionExitosa = true;
            console.log("✅ [Multimedia] invoke exitoso");
          } else {
            errorDetails.push(
              `invoke: ${resultado?.error || "Sin respuesta exitosa"}`,
            );
          }
        } catch (error) {
          console.error("❌ [Multimedia] Error en invoke:", error);
          errorDetails.push(`invoke: ${error.message}`);
        }
      }

      // ✨ EVALUACIÓN DE RESULTADOS
      const tipoArchivo = getMediaType(media);

      if (proyectionExitosa) {
        showSuccess(`📺 Proyectando: ${getMediaName(media)} (${tipoArchivo})`);
        console.log("✅ [Multimedia] Proyección exitosa");

        // Actualizar estado de multimedia proyectada
        setProyectingMedia(media);

        // Incrementar contador si es posible
        if (window.electron?.incrementarReproducido && media.id) {
          try {
            await window.electron.incrementarReproducido(media.id);
          } catch (error) {
            console.warn("⚠️ Error incrementando contador:", error);
          }
        }
      } else {
        throw new Error(
          `Todos los métodos fallaron: ${errorDetails.join(", ")}`,
        );
      }
    } catch (error) {
      console.error("❌ [Multimedia] Error general:", error);
      showError(`❌ Error: ${error.message}`);
    }
  };
  // ✨ FUNCIÓN MEJORADA PARA LIMPIAR PROYECTOR
  const clearProjector = async () => {
    try {
      console.log("🧹 [Multimedia] Limpiando proyector...");

      let limpiezaExitosa = false;

      // Intentar diferentes métodos IPC
      if (window.electron?.limpiarProyector) {
        await window.electron.limpiarProyector();
        limpiezaExitosa = true;
      } else if (window.electronAPI?.limpiarProyector) {
        await window.electronAPI.limpiarProyector();
        limpiezaExitosa = true;
      } else if (window.electron?.invoke) {
        await window.electron.invoke("limpiar-proyector");
        limpiezaExitosa = true;
      } else if (window.electron?.send) {
        window.electron.send("limpiar-proyector");
        limpiezaExitosa = true;
      }

      if (limpiezaExitosa) {
        showInfo("🧹 Proyector limpiado");
        stopGlobal(); // Detener reproducción global
        // Limpiar estado de multimedia proyectada
        setProyectingMedia(null);
      } else {
        throw new Error("No se pudo conectar con el proyector");
      }
    } catch (error) {
      console.error("❌ [Multimedia] Error limpiando proyector:", error);
      showError(`❌ Error limpiando proyector: ${error.message}`);
    }
  };

  // ✨ FUNCIÓN MEJORADA PARA PROCESAR ARCHIVOS
  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setLoading(true);
    showInfo(`📤 Procesando ${files.length} archivo(s)...`);

    const archivosExitosos = [];
    const archivosDuplicados = [];
    const archivosErrores = [];

    try {
      for (const file of files) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);

          let binary = "";
          for (let i = 0; i < uint8Array.byteLength; i++) {
            binary += String.fromCharCode(uint8Array[i]);
          }
          const base64String = btoa(binary);

          const extension = file.name.split(".").pop().toLowerCase();
          let tipo;

          const extensionesVideo = [
            "mp4",
            "avi",
            "mov",
            "wmv",
            "flv",
            "mkv",
            "webm",
          ];
          const extensionesAudio = ["mp3", "wav", "ogg", "aac", "flac", "m4a"];
          const extensionesImagen = [
            "jpg",
            "jpeg",
            "png",
            "gif",
            "bmp",
            "webp",
          ];

          if (extensionesVideo.includes(extension)) {
            tipo = "video";
          } else if (extensionesAudio.includes(extension)) {
            tipo = "audio";
          } else if (extensionesImagen.includes(extension)) {
            tipo = "imagen";
          } else {
            archivosErrores.push({
              nombre: file.name,
              error: "Tipo de archivo no soportado",
            });
            showError(
              `<strong>${file.name}</strong><br/>❌ Formato no soportado`,
            );
            continue;
          }

          const nombreSinExtension = file.name.replace(/\.[^/.]+$/, "");

          // 🔍 VERIFICAR DUPLICADOS
          console.log(
            "🔍 [Upload] Verificando duplicado para:",
            nombreSinExtension,
          );

          let verificacion = null;
          try {
            if (window.electronAPI?.verificarArchivoDuplicado) {
              const datos = {
                nombre: nombreSinExtension,
                tamaño: file.size,
                tipo: tipo,
              };
              verificacion =
                await window.electronAPI.verificarArchivoDuplicado(datos);
              console.log(
                `📥 [Upload] Verificación:`,
                verificacion?.existe ? "DUPLICADO" : "ÚNICO",
              );
            } else if (window.electron?.["verificar-archivo-duplicado"]) {
              console.log(
                `📞 [Upload] Usando window.electron["verificar-archivo-duplicado"]`,
              );
              const datos = {
                nombre: nombreSinExtension,
                tamaño: file.size,
                tipo: tipo,
              };
              console.log(`📤 [Upload] Enviando datos:`, datos);
              verificacion =
                await window.electron["verificar-archivo-duplicado"](datos);
              console.log(`📥 [Upload] Respuesta recibida:`, verificacion);
            } else {
              console.warn(
                "⚠️ [Upload] No hay método de verificación disponible",
              );
            }
          } catch (error) {
            console.error("❌ [Upload] Error verificando duplicados:", error);
          }

          if (verificacion?.existe) {
            console.log("🚫 [Upload] Archivo duplicado - bloqueando carga");
            archivosDuplicados.push({
              nombre: file.name,
              archivoExistente: verificacion.archivo,
            });
            showWarning(
              `<strong>${file.name}</strong><br/>⚠️ Este archivo ya existe en la base de datos`,
            );
            continue; // ✨ Saltar este archivo
          } else {
            console.log("✅ [Upload] Archivo único - procediendo con carga");
          }

          const fileData = {
            nombre: nombreSinExtension,
            extension: extension,
            tipo: tipo,
            tamaño: file.size,
            data: base64String,
            mimeType: file.type,
          };

          console.log("📦 [Upload] Datos del archivo preparados:");
          console.log("  - Nombre:", fileData.nombre);
          console.log("  - Extensión:", fileData.extension);
          console.log("  - Tipo:", fileData.tipo);
          console.log("  - Tamaño:", fileData.tamaño, "bytes");
          console.log("  - MimeType:", fileData.mimeType);
          console.log(
            "  - Data (primeros 50 caracteres):",
            fileData.data.substring(0, 50) + "...",
          );

          // Procesar archivo
          let resultado = null;
          try {
            console.log("📤 [Upload] Enviando archivo para procesar...");
            console.log("🔍 [Upload] Verificando métodos disponibles:");
            console.log(
              "  - window.electron['procesar-archivo-multimedia']:",
              !!window.electron?.["procesar-archivo-multimedia"],
            );
            console.log(
              "  - window.electronAPI?.procesarArchivoMultimedia:",
              !!window.electronAPI?.procesarArchivoMultimedia,
            );
            console.log(
              "  - window.electron?.procesarArchivoMultimedia:",
              !!window.electron?.procesarArchivoMultimedia,
            );

            if (window.electron?.["procesar-archivo-multimedia"]) {
              console.log(
                "📞 [Upload] Usando window.electron['procesar-archivo-multimedia']",
              );
              resultado =
                await window.electron["procesar-archivo-multimedia"](fileData);
            } else if (window.electronAPI?.procesarArchivoMultimedia) {
              console.log(
                "📞 [Upload] Usando window.electronAPI.procesarArchivoMultimedia",
              );
              resultado =
                await window.electronAPI.procesarArchivoMultimedia(fileData);
            } else if (window.electron?.procesarArchivoMultimedia) {
              console.log(
                "📞 [Upload] Usando window.electron.procesarArchivoMultimedia",
              );
              resultado =
                await window.electron.procesarArchivoMultimedia(fileData);
            } else {
              console.error(
                "❌ [Upload] No se encontró ningún método IPC para procesar archivos",
              );
              throw new Error(
                "No hay método disponible para procesar archivos",
              );
            }
            console.log("📥 [Upload] Resultado recibido:", resultado);
            console.log("📥 [Upload] Tipo de resultado:", typeof resultado);
            console.log("📥 [Upload] Propiedad success:", resultado?.success);
            console.log(
              "📥 [Upload] Propiedad multimedia:",
              resultado?.multimedia,
            );
            console.log("📥 [Upload] Propiedad error:", resultado?.error);
          } catch (error) {
            console.error("❌ [Multimedia] Error procesando archivo:", error);
            console.error("❌ [Multimedia] Stack:", error.stack);
            resultado = {success: false, error: error.message};
          }

          // ✨ VALIDACIÓN MEJORADA: Considerar exitoso si:
          // 1. resultado.success === true, O
          // 2. resultado.multimedia existe (significa que se creó el registro), O
          // 3. resultado tiene id (significa que se guardó)
          const exitoso =
            resultado?.success === true ||
            resultado?.multimedia !== undefined ||
            resultado?.id !== undefined;

          console.log("📥 [Upload] ¿Carga exitosa?:", exitoso);

          if (exitoso) {
            archivosExitosos.push({
              nombre: file.name,
              id: resultado.id || resultado.multimedia?.id,
            });
            showSuccess(
              `<strong>${file.name}</strong><br/>✅ Agregado exitosamente`,
            );
          } else {
            if (resultado?.error === "ARCHIVO_DUPLICADO") {
              archivosDuplicados.push({nombre: file.name});
              showWarning(
                `<strong>${file.name}</strong><br/>⚠️ Archivo duplicado`,
              );
            } else {
              archivosErrores.push({
                nombre: file.name,
                error: resultado?.error || "Error desconocido",
              });
              showError(
                `<strong>${file.name}</strong><br/>❌ ${
                  resultado?.error || "Error desconocido"
                }`,
              );
            }
          }
        } catch (error) {
          archivosErrores.push({nombre: file.name, error: error.message});
          showError(`<strong>${file.name}</strong><br/>❌ ${error.message}`);
        }
      }

      if (archivosExitosos.length > 0) {
        await loadMediaFromDB();
      }

      // Resumen final mejorado
      let mensaje = `📊 Procesamiento completado:\n`;
      mensaje += `✅ ${archivosExitosos.length} archivos agregados\n`;

      if (archivosDuplicados.length > 0) {
        mensaje += `⚠️ ${archivosDuplicados.length} archivos duplicados omitidos\n`;
        mensaje += `📝 Duplicados: ${archivosDuplicados
          .map((d) => d.nombre)
          .join(", ")}\n`;
      }

      if (archivosErrores.length > 0) {
        mensaje += `❌ ${archivosErrores.length} archivos con errores\n`;
        mensaje += `📝 Errores: ${archivosErrores
          .map((e) => e.nombre)
          .join(", ")}`;
      }

      console.log("📊 [Upload] Resumen final:", {
        archivosExitosos,
        archivosDuplicados,
        archivosErrores,
      });
      showInfo(mensaje.replace(/\n/g, "<br/>"));
    } catch (error) {
      showError(`<strong>❌ Error general:</strong><br/>${error.message}`);
    }

    setLoading(false);
    event.target.value = "";
  };

  // ✨ NUEVA FUNCIÓN OPTIMIZADA PARA ARCHIVOS GRANDES
  const handleFileUploadOptimizado = async () => {
    try {
      setLoading(true);
      showInfo("📂 Abriendo selector de archivos...");

      console.log("📂 [Upload-Optimizado] Iniciando selección de archivos...");

      // Abrir diálogo de selección de archivos
      const resultado = await window.electron.seleccionarArchivosMultimedia();

      if (!resultado.success) {
        if (resultado.canceled) {
          console.log("❌ [Upload-Optimizado] Selección cancelada");
          showInfo("❌ Selección cancelada");
        } else {
          throw new Error(resultado.error || "Error al seleccionar archivos");
        }
        setLoading(false);
        return;
      }

      const filePaths = resultado.filePaths;
      console.log("✅ [Upload-Optimizado] Archivos seleccionados:", filePaths);

      showInfo(
        `📤 Procesando ${filePaths.length} archivo(s)... (método optimizado)`,
      );

      // Procesar archivos por ruta (sin base64)
      const resultadoProceso =
        await window.electron.procesarArchivosPorRuta(filePaths);

      if (!resultadoProceso.success) {
        throw new Error(resultadoProceso.error || "Error procesando archivos");
      }

      console.log(
        "📊 [Upload-Optimizado] Resultados:",
        resultadoProceso.resultados,
      );

      // Contar éxitos y errores
      const exitosos = resultadoProceso.resultados.filter((r) => r.success);
      const fallidos = resultadoProceso.resultados.filter((r) => !r.success);

      // Mostrar notificaciones individuales
      exitosos.forEach((r) => {
        showSuccess(`<strong>${r.nombre}</strong><br/>✅ Cargado exitosamente`);
      });

      fallidos.forEach((r) => {
        showError(`<strong>${r.nombre}</strong><br/>❌ ${r.error}`);
      });

      // Mostrar resumen
      if (exitosos.length > 0) {
        await loadMediaFromDB();
        showInfo(
          `📊 Procesamiento completado:<br/>✅ ${exitosos.length} archivo(s) agregado(s)<br/>❌ ${fallidos.length} error(es)`,
        );
      }
    } catch (error) {
      console.error("❌ [Upload-Optimizado] Error:", error);
      showError(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ✨ FUNCIÓN MEJORADA PARA ELIMINAR MULTIMEDIA
  const deleteMedia = async (id) => {
    try {
      console.log("🗑️ [Multimedia] Iniciando eliminación, ID:", id);

      const mediaToDelete = mediaFiles.find((m) => m.id === id);
      console.log("🗑️ [Multimedia] Archivo a eliminar:", mediaToDelete);

      if (!mediaToDelete) {
        showError("❌ No se encontró el archivo a eliminar");
        return;
      }

      // Confirmar eliminación con el usuario
      const confirmacion = window.confirm(
        `¿Estás seguro de que deseas eliminar "${getMediaName(mediaToDelete)}"?`,
      );

      if (!confirmacion) {
        console.log("🚫 [Multimedia] Eliminación cancelada por el usuario");
        showInfo("❌ Eliminación cancelada");
        return;
      }

      if (mediaToDelete.isUrl) {
        console.log("🔗 [Multimedia] Eliminando URL de la lista local");
        setMediaFiles((prev) => prev.filter((media) => media.id !== id));
        if (currentMedia?.id === id) {
          stopGlobal(); // Detener reproducción global
        }
        showSuccess(
          `<strong>${getMediaName(
            mediaToDelete,
          )}</strong><br/>🗑️ Removido de la lista`,
        );
        return;
      }

      const fileName = getMediaName(mediaToDelete);
      console.log("📄 [Multimedia] Nombre del archivo:", fileName);

      let resultado = null;
      try {
        console.log("🔍 [Multimedia] Verificando métodos IPC disponibles...");
        console.log(
          "  - window.electron['db-eliminar-multimedia']:",
          !!window.electron?.["db-eliminar-multimedia"],
        );
        console.log(
          "  - window.electronAPI?.eliminarMultimedia:",
          !!window.electronAPI?.eliminarMultimedia,
        );
        console.log(
          "  - window.electron?.eliminarMultimedia:",
          !!window.electron?.eliminarMultimedia,
        );

        if (window.electron?.["db-eliminar-multimedia"]) {
          console.log(
            "📞 [Multimedia] Usando window.electron['db-eliminar-multimedia']",
          );
          resultado = await window.electron["db-eliminar-multimedia"](id);
          console.log("📥 [Multimedia] Resultado recibido:", resultado);
        } else if (window.electronAPI?.eliminarMultimedia) {
          console.log(
            "📞 [Multimedia] Usando window.electronAPI.eliminarMultimedia",
          );
          resultado = await window.electronAPI.eliminarMultimedia(id);
          console.log("📥 [Multimedia] Resultado recibido:", resultado);
        } else if (window.electron?.eliminarMultimedia) {
          console.log(
            "📞 [Multimedia] Usando window.electron.eliminarMultimedia",
          );
          resultado = await window.electron.eliminarMultimedia(id);
          console.log("📥 [Multimedia] Resultado recibido:", resultado);
        } else {
          console.error(
            "❌ [Multimedia] No se encontró ningún método IPC disponible",
          );
          showError("❌ No hay conexión con Electron. Reinicia la aplicación.");
          return;
        }
      } catch (error) {
        console.error("❌ [Multimedia] Error eliminando archivo:", error);
        console.error("📋 [Multimedia] Stack trace:", error.stack);
        resultado = {success: false, error: error.message};
      }

      console.log("📊 [Multimedia] Resultado final:", resultado);
      console.log("📊 [Multimedia] Tipo de resultado:", typeof resultado);
      console.log("📊 [Multimedia] Propiedad success:", resultado?.success);
      console.log("📊 [Multimedia] Propiedad changes:", resultado?.changes);

      // ✨ VALIDACIÓN MEJORADA: Considerar exitoso si:
      // 1. resultado.success === true, O
      // 2. resultado.changes > 0 (significa que se eliminó algo), O
      // 3. resultado existe y no tiene error
      const exitoso =
        resultado?.success === true ||
        (resultado?.changes !== undefined && resultado.changes > 0) ||
        (resultado && !resultado.error);

      console.log("📊 [Multimedia] ¿Operación exitosa?:", exitoso);

      if (exitoso) {
        console.log(
          "✅ [Multimedia] Eliminación exitosa, actualizando estado...",
        );
        setMediaFiles((prev) => prev.filter((media) => media.id !== id));
        if (currentMedia?.id === id) {
          stopGlobal(); // Detener reproducción global
        }
        showSuccess(
          `<strong>${fileName}</strong><br/>🗑️ Eliminado exitosamente`,
        );
        console.log("✅ [Multimedia] Estado actualizado correctamente");
      } else {
        console.error("❌ [Multimedia] Eliminación falló:", resultado);
        showError(
          `<strong>${fileName}</strong><br/>❌ Error al eliminar: ${
            resultado?.error || "Error desconocido"
          }`,
        );
      }
    } catch (error) {
      console.error(
        "❌ [Multimedia] Error general al eliminar archivo:",
        error,
      );
      console.error("📋 [Multimedia] Stack trace:", error.stack);
      showError(`❌ Error al eliminar archivo: ${error.message}`);
    }
  };

  // ✨ FUNCIÓN MEJORADA PARA FAVORITOS
  const toggleFavorite = async (media) => {
    try {
      const nuevoFavorito = !media.favorito;

      // Para URLs, guardar en localStorage
      if (media.isUrl) {
        setMediaFiles((prev) => {
          const updated = prev.map((item) =>
            item.id === media.id ? {...item, favorito: nuevoFavorito} : item,
          );

          // Guardar en localStorage
          const urlsOnly = updated.filter((m) => m.isUrl);
          localStorage.setItem("multimedia-urls", JSON.stringify(urlsOnly));

          return updated;
        });

        showInfo(
          `${nuevoFavorito ? "⭐ Agregado a" : "🗑️ Removido de"} favoritos`,
        );
        return;
      }

      // Para archivos en BD
      let resultado = null;
      try {
        if (window.electron?.["db-actualizar-favorito-multimedia"]) {
          resultado = await window.electron[
            "db-actualizar-favorito-multimedia"
          ](media.id, nuevoFavorito);
        } else if (window.electronAPI?.actualizarFavoritoMultimedia) {
          resultado = await window.electronAPI.actualizarFavoritoMultimedia(
            media.id,
            nuevoFavorito,
          );
        }
      } catch (error) {
        console.error("❌ [Multimedia] Error actualizando favorito:", error);
        resultado = {success: false, error: error.message};
      }

      if (resultado?.success) {
        setMediaFiles((prev) =>
          prev.map((item) =>
            item.id === media.id ? {...item, favorito: nuevoFavorito} : item,
          ),
        );
        showInfo(
          `${nuevoFavorito ? "⭐ Agregado a" : "🗑️ Removido de"} favoritos`,
        );
      } else {
        showError(
          `❌ Error actualizando favorito: ${
            resultado?.error || "Error desconocido"
          }`,
        );
      }
    } catch (error) {
      showError(`❌ Error actualizando favorito: ${error.message}`);
    }
  };

  // Actualizar las funciones de YouTube
  const extractVideoId = (url) => {
    const regex =
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const isYouTubeUrl = (url) => {
    return /(?:youtube\.com|youtu\.be)/.test(url);
  };

  const convertYouTubeToEmbedUrl = (url) => {
    const videoId = extractVideoId(url);
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}?autoplay=0&controls=1&rel=0&modestbranding=1&fs=1`;
    }
    return url;
  };

  // Obtener thumbnail de YouTube
  const getYouTubeThumbnail = (url) => {
    const videoId = extractVideoId(url);
    if (videoId) {
      return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    }
    return null;
  };

  // Agregar esta función antes de handleUrlSubmit
  const saveUrlToHistory = async (url, title) => {
    const historyItem = {
      id: Date.now(),
      url: url,
      title: title,
      timestamp: new Date().toISOString(),
      isYoutube: isYouTubeUrl(url),
    };

    const newHistory = [historyItem, ...urlHistory].slice(0, 50); // Mantener solo los últimos 50
    setUrlHistory(newHistory);
    localStorage.setItem("multimedia-url-history", JSON.stringify(newHistory));
  };

  // Actualizar la función handleUrlSubmit
  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) {
      showWarning("Por favor ingresa una URL válida");
      return;
    }

    if (!urlTitle.trim()) {
      showWarning("Por favor ingresa un título para la URL");
      return;
    }

    try {
      const url = urlInput.trim();
      const title = urlTitle.trim();
      let finalUrl = url;
      let type = "video";

      // Validar URL
      new URL(url);

      // Manejar URLs de YouTube
      if (isYouTubeUrl(url)) {
        const videoId = extractVideoId(url);
        if (videoId) {
          finalUrl = `https://www.youtube.com/embed/${videoId}?autoplay=0&controls=1&rel=0&modestbranding=1&fs=1`;
          type = "youtube";
        } else {
          showError("URL de YouTube inválida");
          return;
        }
      } else {
        // Determinar tipo de contenido para otras URLs
        const extension = url.split(".").pop()?.toLowerCase().split("?")[0];
        if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(extension)) {
          type = "imagen";
        } else if (
          ["mp3", "wav", "ogg", "aac", "flac", "m4a"].includes(extension)
        ) {
          type = "audio";
        } else if (["mp4", "webm", "avi", "mov", "mkv"].includes(extension)) {
          type = "video";
        }
      }

      // Guardar también en BD para que aparezca en la app móvil (/api/multimedia)
      let guardadoEnBD = false;
      try {
        if (window.electron?.agregarMultimedia) {
          const result = await window.electron.agregarMultimedia({
            nombre: title,
            tipo: type,
            tamaño: null,
            ruta_archivo: url,
            url: finalUrl,
            favorito: false,
            tags: [],
          });
          guardadoEnBD = typeof result === "number" && !Number.isNaN(result);
        }
      } catch (e) {
        console.warn("⚠️ [Multimedia] No se pudo guardar URL en BD:", e);
      }

      // Guardar en historial
      await saveUrlToHistory(url, title);

      // Agregar a enlaces rápidos personalizados si no existe
      const quickLinkExists = customQuickLinks.some((link) => link.url === url);
      if (!quickLinkExists) {
        // Verificar si ya se alcanzó el límite de 20
        if (customQuickLinks.length >= 20) {
          showWarning(
            "⚠️ Has alcanzado el límite de 20 enlaces rápidos. Elimina algunos para agregar nuevos.",
          );
          return;
        }

        const newQuickLink = {
          id: Date.now(),
          name: title,
          url: url,
          isYoutube: isYouTubeUrl(url),
          dateAdded: new Date().toISOString(),
        };

        const updatedQuickLinks = [newQuickLink, ...customQuickLinks].slice(
          0,
          20,
        );
        setCustomQuickLinks(updatedQuickLinks);
        localStorage.setItem(
          "multimedia-quick-links",
          JSON.stringify(updatedQuickLinks),
        );

        // Mostrar advertencia cuando se acerque al límite
        if (updatedQuickLinks.length >= 18) {
          showWarning(
            `⚠️ Te quedan ${
              20 - updatedQuickLinks.length
            } espacios para enlaces rápidos`,
          );
        }
      }

      // Refrescar biblioteca desde BD (incluye la URL recién agregada)
      await loadMediaFromDB();

      // ✅ No reproducir automáticamente - el usuario debe hacer clic en reproducir

      if (guardadoEnBD) {
        showSuccess(`<strong>URL agregada:</strong><br/>📺 ${title}`);
      } else {
        showWarning(
          `<strong>URL guardada en el escritorio</strong> (historial/accesos rápidos), pero <strong>NO</strong> se pudo guardar en la BD.<br/>📱 No aparecerá en la app móvil hasta que se sincronice correctamente.`,
          6500,
        );
      }
      setUrlInput("");
      setUrlTitle("");
      setShowUrlModal(false);
    } catch (error) {
      showError("URL inválida. Por favor verifica la dirección.");
    }
  };

  // Funciones auxiliares - ahora usan el contexto global
  // togglePlayPause viene del contexto
  // stopMedia viene del contexto como stopGlobal

  const removeCustomQuickLink = (linkId) => {
    const updatedQuickLinks = customQuickLinks.filter(
      (link) => link.id !== linkId,
    );
    setCustomQuickLinks(updatedQuickLinks);
    localStorage.setItem(
      "multimedia-quick-links",
      JSON.stringify(updatedQuickLinks),
    );
    showInfo("🗑️ Enlace eliminado de accesos rápidos");
  };

  const handleQuickLinkClick = (link) => {
    console.log("🔗 [QuickLink] Iniciando reproducción de quick link:", link);
    console.log("📊 [QuickLink] mediaFiles.length:", mediaFiles.length);

    // En lugar de abrir el modal, reproducir directamente
    let finalUrl = link.url;

    // Si es YouTube, convertir a embed
    if (isYouTubeUrl(link.url)) {
      finalUrl = convertYouTubeToEmbedUrl(link.url);
      console.log("📺 [QuickLink] URL convertida a embed:", finalUrl);
    }

    const mediaItem = {
      id: Date.now(),
      nombre: link.name,
      url: finalUrl,
      isUrl: true,
      isYoutube: isYouTubeUrl(link.url),
      tipo: isYouTubeUrl(link.url) ? "youtube" : "url",
    };

    console.log("📦 [QuickLink] mediaItem creado:", mediaItem);

    // Reproducir directamente
    playMedia(mediaItem);
    showSuccess(`▶️ Reproduciendo: ${link.name}`);
  };

  const playFromHistory = (historyItem) => {
    let finalUrl = historyItem.url;

    if (historyItem.isYoutube || isYouTubeUrl(historyItem.url)) {
      finalUrl = convertYouTubeToEmbedUrl(historyItem.url);
    }

    const mediaItem = {
      id: Date.now(),
      nombre: historyItem.title,
      url: finalUrl,
      originalUrl: historyItem.url,
      tipo: historyItem.isYoutube ? "youtube" : "video",
      tamaño: "URL",
      favorito: false,
      reproducido: 0,
      isUrl: true,
      isYoutube: historyItem.isYoutube || isYouTubeUrl(historyItem.url),
    };

    playMediaGlobal(mediaItem); // Reproducir desde historial
    setShowHistoryModal(false);
    showInfo(`<strong>Reproduciendo:</strong><br/>📺 ${historyItem.title}`);
  };

  const clearHistory = () => {
    if (
      window.confirm("¿Estás seguro de que quieres limpiar todo el historial?")
    ) {
      setUrlHistory([]);
      localStorage.removeItem("multimedia-url-history");
      showInfo("🗑️ Historial limpiado");
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showSuccess("📋 Copiado al portapapeles");
  };

  // Funciones de utilidad
  const getMediaIcon = (type) => {
    switch (type) {
      case "video":
        return <FaVideoSlash className="text-red-400" />;
      case "youtube":
        return <FaYoutube className="text-red-500" />;
      case "audio":
        return <FaMusic className="text-green-400" />;
      case "image":
      case "imagen":
        return <FaImage className="text-blue-400" />;
      default:
        return <FaFolder className="text-gray-400" />;
    }
  };

  const formatFileSize = (size) => {
    if (typeof size === "string") return size;
    return (size / 1024 / 1024).toFixed(2);
  };

  const getMediaName = (media) =>
    media.nombre || media.name || "Archivo sin nombre";

  const mediaForPlayer = currentMedia || lastPlayedMedia;

  const isMediaForPlayerYouTube =
    !!mediaForPlayer && getMediaType(mediaForPlayer) === "youtube";

  // ✨ FUNCIÓN MEJORADA PARA DETECTAR TIPO DE MULTIMEDIA CON YOUTUBE
  function getMediaType(media) {
    // Primero verificar si es YouTube por la propiedad isYoutube
    if (media.isYoutube) {
      return "youtube";
    }

    // Si no tiene isYoutube, verificar por URL
    if (media.url && isYouTubeUrl(media.url)) {
      return "youtube";
    }

    // Si no es YouTube, retornar el tipo original
    return media.tipo || media.type || "unknown";
  }

  const getMediaSize = (media) =>
    media.size || formatFileSize(media.tamaño || 0);

  // Filtros
  const filteredMedia = mediaFiles.filter((media) => {
    const matchesSearch = getMediaName(media)
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterType === "all" || getMediaType(media) === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 min-h-screen overflow-y-auto">
      {/* ✨ CONTENEDOR DE NOTIFICACIONES */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
        {notifications.map((notification) => (
          <NotificationItem key={notification.id} notification={notification} />
        ))}
      </div>

      {/* ✨ HEADER MODERNO ESTILO YOUTUBE */}
      <div className="bg-black/30 backdrop-blur border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-full mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                <FaPlay className="text-2xl" />
              </div>
              <div>
                <h1 className="text-3xl font-semibold text-white">
                  Glory Studio
                </h1>
                <p className="text-white/60">
                  Tu centro de contenido multimedia
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowUrlModal(true)}
                className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-xl border border-white/10 transition-colors flex items-center gap-2"
              >
                <FaLink />
                <span>Agregar URL</span>
              </button>

              {/* Botón optimizado para archivos grandes */}
              <button
                onClick={handleFileUploadOptimizado}
                disabled={loading}
                className={`${
                  loading
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-emerald-600/90 hover:bg-emerald-600"
                } text-white px-4 py-2 rounded-xl border border-emerald-500/20 transition-colors flex items-center gap-2`}
                title="Recomendado para videos grandes"
              >
                <FaUpload />
                <span>{loading ? "Subiendo..." : "Subir (Rápido)"}</span>
              </button>

              {/* Botón original para archivos pequeños */}
              <label
                htmlFor="fileInputHeader"
                className={`${
                  loading
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-emerald-600/90 hover:bg-emerald-600 cursor-pointer"
                } text-white px-4 py-2 rounded-xl border border-emerald-500/20 transition-colors flex items-center gap-2`}
                title="Para archivos pequeños"
              >
                <FaUpload />
                <span>{loading ? "Subiendo..." : "Subir Archivo"}</span>
              </label>
              <input
                type="file"
                multiple
                accept="video/*,audio/*,image/*"
                onChange={handleFileUpload}
                className="hidden"
                id="fileInputHeader"
                disabled={loading}
              />
            </div>
          </div>

          {/* Advertencia de Internet */}
          {!hayInternet && (
            <div className="bg-yellow-900/20 border border-yellow-500/40 rounded-xl p-4 mb-4 flex items-center gap-3">
              <FaExclamationTriangle className="text-yellow-400 text-xl flex-shrink-0" />
              <div className="flex-1">
                <p className="text-yellow-200 font-semibold text-sm">
                  Sin conexión a Internet
                </p>
                <p className="text-yellow-300/80 text-xs mt-1">
                  El contenido en línea como YouTube no estará disponible hasta
                  que se restaure la conexión.
                </p>
              </div>
            </div>
          )}

          {/* Barra de búsqueda y controles */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 relative">
                <FaSearch className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar multimedia..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/10 border border-gray-600 rounded-full text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent transition-all duration-300"
                />
              </div>

              <div className="flex items-center gap-2">
                <FaFilter className="text-gray-400" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="bg-white/10 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-400"
                >
                  <option value="all" className="bg-gray-800">
                    Todos
                  </option>
                  <option value="video" className="bg-gray-800">
                    Videos
                  </option>
                  <option value="youtube" className="bg-gray-800">
                    YouTube
                  </option>
                  <option value="audio" className="bg-gray-800">
                    Audio
                  </option>
                  <option value="imagen" className="bg-gray-800">
                    ImágenesZ
                  </option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === "grid"
                      ? "bg-red-500 text-white"
                      : "bg-white/10 text-gray-400 hover:text-white"
                  }`}
                >
                  <FaTh />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === "list"
                      ? "bg-red-500 text-white"
                      : "bg-white/10 text-gray-400 hover:text-white"
                  }`}
                >
                  <FaList />
                </button>
              </div>
            </div>

            <div className="text-sm text-gray-400">
              {filteredMedia.length} de {mediaFiles.length} archivos
            </div>
          </div>

          {/* ✨ ESTADÍSTICAS - Ancho completo, cards más pequeñas */}
          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-white">
              <FaInfoCircle className="text-blue-400 text-sm" />
              Estadísticas
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              <div className="bg-gray-700/30 rounded-lg p-2 text-center">
                <div className="text-xl font-bold text-white">
                  {mediaFiles.length}
                </div>
                <div className="text-xs text-gray-400">Total</div>
              </div>
              <div className="bg-gray-700/30 rounded-lg p-2 text-center">
                <div className="text-xl font-bold text-purple-400">
                  {
                    mediaFiles.filter(
                      (m) =>
                        getMediaType(m) === "video" ||
                        getMediaType(m) === "youtube",
                    ).length
                  }
                </div>
                <div className="text-xs text-gray-400">Videos</div>
              </div>
              <div className="bg-gray-700/30 rounded-lg p-2 text-center">
                <div className="text-xl font-bold text-green-400">
                  {mediaFiles.filter((m) => getMediaType(m) === "audio").length}
                </div>
                <div className="text-xs text-gray-400">Audio</div>
              </div>
              <div className="bg-gray-700/30 rounded-lg p-2 text-center">
                <div className="text-xl font-bold text-pink-400">
                  {
                    mediaFiles.filter(
                      (m) =>
                        getMediaType(m) === "imagen" ||
                        getMediaType(m) === "image",
                    ).length
                  }
                </div>
                <div className="text-xs text-gray-400">Imágenes</div>
              </div>
              <div className="bg-gray-700/30 rounded-lg p-2 text-center">
                <div className="text-xl font-bold text-yellow-400 flex items-center justify-center gap-1">
                  <FaStar className="text-xs" />
                  {mediaFiles.filter((m) => m.favorito).length}
                </div>
                <div className="text-xs text-gray-400">Favoritos</div>
              </div>
              <div className="bg-gray-700/30 rounded-lg p-2 text-center">
                <div className="text-xl font-bold text-blue-400 flex items-center justify-center gap-1">
                  <FaLink className="text-xs" />
                  {mediaFiles.filter((m) => m.isUrl).length}
                </div>
                <div className="text-xs text-gray-400">URLs</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Columna Izquierda: Reproductor */}
          <div className="xl:col-span-2">
            {/* Reproductor Principal */}
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 shadow-xl mb-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-red-500/20 p-3 rounded-full">
                  <FaPlay className="text-red-400 text-xl" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    Reproductor Principal
                  </h2>
                  <p className="text-gray-400">
                    Control de multimedia y reproducción
                  </p>
                </div>
              </div>

              {mediaForPlayer ? (
                <div className="space-y-4">
                  {/* Información del archivo actual */}
                  <div className="bg-gray-700/50 p-4 rounded-xl">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white truncate mb-1">
                          {getMediaName(mediaForPlayer)}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <span className="capitalize">
                            {getMediaType(mediaForPlayer)}
                          </span>
                          <span>•</span>
                          <span>
                            {mediaForPlayer.isUrl
                              ? "URL"
                              : `${getMediaSize(mediaForPlayer)} MB`}
                          </span>
                          {!currentMedia && (
                            <span className="ml-1 text-xs text-white/60 bg-white/10 border border-white/10 rounded-full px-2 py-0.5">
                              Última reproducción
                            </span>
                          )}
                          {mediaForPlayer.favorito && (
                            <FaStar className="text-yellow-400" />
                          )}
                          {mediaForPlayer.isUrl && (
                            <FaLink className="text-blue-400" />
                          )}
                          {isMediaForPlayerYouTube && (
                            <FaYoutube className="text-red-500" />
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleFavorite(mediaForPlayer)}
                        className={`p-2 rounded transition-colors ${
                          mediaForPlayer.favorito
                            ? "text-yellow-400"
                            : "text-gray-400 hover:text-yellow-400"
                        }`}
                      >
                        {mediaForPlayer.favorito ? <FaStar /> : <FaRegStar />}
                      </button>
                    </div>
                  </div>

                  {/* Vista previa */}
                  <div
                    id="multimedia-preview-container"
                    className={`rounded-xl aspect-video flex items-center justify-center border border-gray-600 overflow-hidden relative ${
                      isMediaForPlayerYouTube ||
                      getMediaType(mediaForPlayer) === "video"
                        ? "bg-transparent"
                        : "bg-black"
                    }`}
                  >
                    {/* Los iframes/videos se renderizan desde GlobalMediaPlayer */}
                    {isMediaForPlayerYouTube ||
                    getMediaType(mediaForPlayer) === "video" ? (
                      // Área vacía donde se posicionará el GlobalMediaPlayer
                      <div className="w-full h-full" />
                    ) : getMediaType(mediaForPlayer) === "audio" ? (
                      <div className="w-full h-full bg-gradient-to-br from-green-600/20 to-green-800/20 flex flex-col items-center justify-center p-8">
                        <FaMusic className="text-green-400 text-6xl mb-6" />
                        <h3 className="text-xl font-semibold text-white mb-4">
                          {getMediaName(mediaForPlayer)}
                        </h3>
                        {/* Visualización del audio - El audio real se reproduce en el contexto global */}
                        <div className="w-full max-w-md bg-gray-800/50 rounded-lg p-6 text-center">
                          <p className="text-gray-300 text-sm mb-2">
                            🎵 Audio reproduciéndose en el reproductor global
                          </p>
                          <p className="text-gray-400 text-xs">
                            El control de audio aparece en la barra inferior
                          </p>
                        </div>
                      </div>
                    ) : getMediaType(mediaForPlayer) === "imagen" ? (
                      <img
                        src={mediaForPlayer.validatedUrl || mediaForPlayer.url}
                        alt={getMediaName(mediaForPlayer)}
                        className="max-w-full max-h-full object-contain"
                        onLoad={() => console.log("✅ Imagen cargada")}
                        onError={(e) => {
                          console.error("❌ Error cargando imagen:", e);
                          const mensaje = `Error cargando imagen: ${getMediaName(
                            mediaForPlayer,
                          )}`;
                          console.error(
                            "📁 URL problemática:",
                            mediaForPlayer.url,
                          );
                          showError(
                            `${mensaje}<br/>📁 Verifique que el archivo existe en multimedia/`,
                          );
                        }}
                      />
                    ) : getMediaType(mediaForPlayer) === "video" ? (
                      <div className="w-full h-full" />
                    ) : null}
                  </div>

                  {/* Controles principales */}
                  <div className="flex items-center justify-center space-x-3">
                    {!isMediaForPlayerYouTube && (
                      <>
                        <button
                          onClick={handleTogglePlayPause}
                          className="bg-red-500 hover:bg-red-600 text-white p-4 rounded-full transition-all duration-300 transform hover:scale-105"
                        >
                          {isPlaying ? (
                            <FaPause className="text-xl" />
                          ) : (
                            <FaPlay className="text-xl" />
                          )}
                        </button>
                        <button
                          onClick={stopGlobal}
                          className="bg-gray-600 hover:bg-gray-700 text-white p-3 rounded-full transition-all duration-300"
                        >
                          <FaStop />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => projectToScreenNew(mediaForPlayer)}
                      className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full transition-all duration-300"
                      title="Proyectar en pantalla completa"
                    >
                      <FaExpand />
                    </button>
                    <button
                      onClick={clearProjector}
                      className="bg-orange-500 hover:bg-orange-600 text-white p-3 rounded-full transition-all duration-300"
                      title="Limpiar proyector"
                    >
                      <FaTimes />
                    </button>
                    {mediaForPlayer.originalUrl && (
                      <button
                        onClick={() =>
                          copyToClipboard(mediaForPlayer.originalUrl)
                        }
                        className="bg-purple-500 hover:bg-purple-600 text-white p-3 rounded-full transition-all duration-300"
                        title="Copiar URL original"
                      >
                        <FaCopy />
                      </button>
                    )}
                  </div>

                  {/* Controles del proyector cuando hay multimedia proyectada */}
                  {proyectingMedia && (
                    <div className="bg-blue-900/30 border border-blue-500/30 rounded-xl p-4 mt-4">
                      <div className="text-center mb-3">
                        <h4 className="text-blue-300 font-medium mb-1">
                          🎬 Control del Proyector
                        </h4>
                        <p className="text-blue-200 text-sm">
                          Proyectando: {getMediaName(proyectingMedia)}
                        </p>
                      </div>
                      <div className="flex items-center justify-center space-x-3">
                        <button
                          onClick={playProyector}
                          className="bg-green-500 hover:bg-green-600 text-white p-3 rounded-full transition-all duration-300 transform hover:scale-105"
                          title="Reproducir en proyector"
                        >
                          <FaPlay className="text-lg" />
                        </button>
                        <button
                          onClick={pauseProyector}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white p-3 rounded-full transition-all duration-300 transform hover:scale-105"
                          title="Pausar en proyector"
                        >
                          <FaPause className="text-lg" />
                        </button>
                        <button
                          onClick={stopProyector}
                          className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-full transition-all duration-300 transform hover:scale-105"
                          title="Detener en proyector"
                        >
                          <FaStop className="text-lg" />
                        </button>
                        <button
                          onClick={limpiarProyectorRemoto}
                          className="bg-orange-500 hover:bg-orange-600 text-white p-3 rounded-full transition-all duration-300 transform hover:scale-105"
                          title="Limpiar proyector (ESC)"
                        >
                          <FaTimes className="text-lg" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Control de volumen (solo para no-YouTube) */}
                  {!isMediaForPlayerYouTube && (
                    <div className="bg-gray-700/50 p-4 rounded-xl">
                      <div className="flex items-center space-x-3">
                        <FaVolumeUp className="text-gray-300 flex-shrink-0" />
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={volume}
                          onChange={(e) => setVolume(e.target.value)}
                          className="flex-1 accent-red-400"
                        />
                        <span className="text-sm text-gray-300 w-12 text-center">
                          {volume}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="bg-gray-700/50 p-8 rounded-full w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                    <FaVideoSlash className="text-4xl text-gray-500" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-400 mb-2">
                    Sin contenido seleccionado
                  </h3>
                  <p className="text-gray-500 text-sm">
                    Selecciona un archivo para reproducir o agrega una URL
                  </p>
                </div>
              )}
            </div>

            {/* Biblioteca de medios */}
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="bg-red-500/20 p-3 rounded-full">
                    <FaFolder className="text-red-400 text-xl" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      Biblioteca Multimedia
                    </h2>
                    <p className="text-gray-400">
                      Gestiona tu contenido multimedia
                    </p>
                  </div>
                </div>
                <button
                  onClick={loadMediaFromDB}
                  className="text-red-400 hover:text-red-300 p-2 hover:bg-red-500/20 rounded-lg transition-all duration-300"
                  title="Actualizar biblioteca"
                >
                  <FaDownload className="text-lg" />
                </button>
              </div>

              {loading && mediaFiles.length === 0 ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-transparent border-t-red-400 border-r-red-400 mx-auto mb-4"></div>
                  <p className="text-gray-400">Cargando biblioteca...</p>
                </div>
              ) : filteredMedia.length === 0 ? (
                <div className="text-center py-12">
                  <FaVideoSlash className="text-6xl text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-400 mb-2">
                    {searchTerm
                      ? "No se encontraron resultados"
                      : "Biblioteca vacía"}
                  </h3>
                  <p className="text-gray-500">
                    {searchTerm
                      ? "Intenta con otros términos de búsqueda"
                      : "Sube tu primer archivo multimedia"}
                  </p>
                </div>
              ) : (
                <div
                  className={`${
                    viewMode === "grid"
                      ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                      : "space-y-3"
                  }`}
                >
                  {filteredMedia.map((media) => {
                    const isCurrentlyPlaying = currentMedia?.id === media.id;

                    return (
                      <div
                        key={media.id}
                        className={`${
                          viewMode === "grid"
                            ? `bg-gray-700/50 rounded-xl overflow-hidden hover:bg-gray-600/50 transition-all duration-300 hover:scale-105 group cursor-pointer ${
                                isCurrentlyPlaying
                                  ? "ring-2 ring-green-500"
                                  : ""
                              }`
                            : `flex items-center p-3 rounded-xl transition-all duration-300 hover:bg-gray-700/50 ${
                                isCurrentlyPlaying
                                  ? "bg-green-900/30 border-2 border-green-400"
                                  : "bg-gray-700/30"
                              }`
                        }`}
                        onClick={() => playMedia(media)}
                      >
                        {viewMode === "grid" ? (
                          <>
                            <div className="aspect-video bg-gray-800 relative overflow-hidden">
                              {getMediaType(media) === "video" ? (
                                <>
                                  <video
                                    src={media.url}
                                    className="w-full h-full object-cover"
                                    muted
                                  />
                                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <FaPlay className="text-white text-3xl" />
                                  </div>
                                </>
                              ) : getMediaType(media) === "youtube" ? (
                                <div className="w-full h-full relative bg-black">
                                  <img
                                    src={getYouTubeThumbnail(
                                      media.url || media.originalUrl,
                                    )}
                                    alt={getMediaName(media)}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.target.style.display = "none";
                                      e.target.nextSibling.style.display =
                                        "flex";
                                    }}
                                  />
                                  <div className="hidden w-full h-full bg-gradient-to-br from-red-600/20 to-red-800/20 items-center justify-center">
                                    <FaYoutube className="text-red-400 text-4xl" />
                                  </div>
                                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <FaPlay className="text-white text-3xl" />
                                  </div>
                                </div>
                              ) : getMediaType(media) === "audio" ? (
                                <div className="w-full h-full bg-gradient-to-br from-green-600/20 to-green-800/20 flex items-center justify-center">
                                  <FaMusic className="text-green-400 text-4xl" />
                                </div>
                              ) : (
                                <img
                                  src={media.url}
                                  alt={getMediaName(media)}
                                  className="w-full h-full object-cover"
                                />
                              )}

                              <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
                                {isCurrentlyPlaying && (
                                  <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 animate-pulse">
                                    <FaPlay className="text-[10px]" />
                                    REPRODUCIENDO
                                  </div>
                                )}
                                {media.favorito && (
                                  <div className="bg-yellow-500 text-black px-2 py-1 rounded-full text-xs font-bold">
                                    <FaStar />
                                  </div>
                                )}
                                {media.isUrl && (
                                  <div className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                                    URL
                                  </div>
                                )}
                                {getMediaType(media) === "youtube" && (
                                  <div className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                                    YT
                                  </div>
                                )}
                                {getMediaType(media) === "youtube" &&
                                  !hayInternet && (
                                    <div className="bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                      <FaExclamationTriangle className="text-[10px]" />
                                      SIN INTERNET
                                    </div>
                                  )}
                              </div>

                              <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                                {media.isUrl
                                  ? "URL"
                                  : `${getMediaSize(media)} MB`}
                              </div>
                            </div>

                            <div className="p-4">
                              <h3 className="font-semibold text-white truncate mb-1">
                                {getMediaName(media)}
                              </h3>
                              <div className="flex items-center justify-between text-sm text-gray-400">
                                <span className="capitalize">
                                  {getMediaType(media)}
                                </span>
                                {media.reproducido > 0 && (
                                  <span className="flex items-center gap-1">
                                    <FaEye className="text-xs" />
                                    {media.reproducido}
                                  </span>
                                )}
                              </div>

                              <div className="flex justify-between items-center mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <div className="flex gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleFavorite(media);
                                    }}
                                    className={`p-1 rounded transition-colors ${
                                      media.favorito
                                        ? "text-yellow-400"
                                        : "text-gray-400 hover:text-yellow-400"
                                    }`}
                                  >
                                    {media.favorito ? (
                                      <FaStar />
                                    ) : (
                                      <FaRegStar />
                                    )}
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      projectToScreenNew(media);
                                    }}
                                    className="p-1 text-gray-400 hover:text-blue-400 rounded transition-colors"
                                  >
                                    <FaExpand />
                                  </button>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteMedia(media.id);
                                  }}
                                  className="p-1 text-gray-400 hover:text-red-400 rounded transition-colors"
                                >
                                  <FaTrash />
                                </button>
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center space-x-4 flex-1 min-w-0">
                              <div className="w-16 h-12 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                                {getMediaIcon(getMediaType(media))}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-white truncate">
                                  {getMediaName(media)}
                                </h3>
                                <div className="flex items-center gap-3 text-sm text-gray-400">
                                  <span className="capitalize">
                                    {getMediaType(media)}
                                  </span>
                                  <span>
                                    {media.isUrl
                                      ? "URL"
                                      : `${getMediaSize(media)} MB`}
                                  </span>
                                  {media.reproducido > 0 && (
                                    <span className="flex items-center gap-1">
                                      <FaEye className="text-xs" />
                                      {media.reproducido}
                                    </span>
                                  )}
                                  {media.favorito && (
                                    <FaStar className="text-yellow-400" />
                                  )}
                                  {media.isUrl && (
                                    <FaLink className="text-blue-400" />
                                  )}
                                  {getMediaType(media) === "youtube" && (
                                    <FaYoutube className="text-red-500" />
                                  )}
                                  {getMediaType(media) === "youtube" &&
                                    !hayInternet && (
                                      <span className="bg-orange-500 text-white px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                                        <FaExclamationTriangle className="text-[10px]" />
                                        SIN INTERNET
                                      </span>
                                    )}
                                </div>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavorite(media);
                                }}
                                className={`p-2 rounded transition-colors ${
                                  media.favorito
                                    ? "text-yellow-400"
                                    : "text-gray-400 hover:text-yellow-400"
                                }`}
                              >
                                {media.favorito ? <FaStar /> : <FaRegStar />}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  projectToScreenNew(media);
                                }}
                                className="p-2 text-blue-400 hover:bg-blue-900/30 rounded transition-colors"
                              >
                                <FaExpand />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteMedia(media.id);
                                }}
                                className="p-2 text-red-400 hover:bg-red-900/30 rounded transition-colors"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ✨ SIDEBAR CON ENLACES RÁPIDOS - MANTENER SOLO ESTA VERSIÓN */}
          <div className="xl:col-span-1 space-y-6">
            {/* Enlaces rápidos YouTube */}
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 shadow-xl">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FaYoutube className="text-red-500" />
                Accesos Rápidos
              </h3>

              {/* Enlaces personalizados */}
              {customQuickLinks.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FaStar className="text-yellow-400" />
                      Tus Enlaces Personalizados
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        customQuickLinks.length >= 18
                          ? "bg-red-500/20 text-red-400"
                          : "bg-blue-500/20 text-blue-400"
                      }`}
                    >
                      {customQuickLinks.length}/20
                    </span>
                  </h4>
                  {/* Mostrar primeros 10 sin scroll */}
                  <div className="space-y-2">
                    {customQuickLinks.slice(0, 10).map((link) => {
                      const isLinkPlaying = currentMedia?.url === link.url;

                      return (
                        <div
                          key={link.id}
                          className={`group rounded-lg overflow-hidden transition-all duration-300 hover:scale-[1.02] ${
                            isLinkPlaying
                              ? "bg-green-700/40 ring-2 ring-green-500"
                              : "bg-gray-700/30 hover:bg-gray-600/50"
                          }`}
                        >
                          <div className="flex items-center gap-3 p-2">
                            {/* Thumbnail o icono */}
                            {link.isYoutube ? (
                              <div className="relative w-32 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-800">
                                <img
                                  src={getYouTubeThumbnail(link.url)}
                                  alt={link.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.style.display = "none";
                                    e.target.nextSibling.style.display = "flex";
                                  }}
                                />
                                <div className="hidden absolute inset-0 items-center justify-center bg-red-900/50">
                                  <FaYoutube className="text-red-500 text-4xl" />
                                </div>
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <FaPlay className="text-white text-2xl" />
                                </div>
                              </div>
                            ) : (
                              <div className="w-20 h-20 flex-shrink-0 rounded-lg bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center">
                                <FaLink className="text-blue-400 text-2xl" />
                              </div>
                            )}

                            {/* Información */}
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={() => handleQuickLinkClick(link)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  handleQuickLinkClick(link);
                                }
                              }}
                              className="flex-1 text-left min-w-0"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <h5 className="font-medium text-white truncate mb-1">
                                    {link.name}
                                  </h5>
                                  <div className="flex items-center gap-2 text-xs text-gray-400">
                                    {link.isYoutube ? (
                                      <>
                                        <FaYoutube className="text-red-500 flex-shrink-0" />
                                        <span>YouTube</span>
                                      </>
                                    ) : (
                                      <>
                                        <FaLink className="text-blue-400 flex-shrink-0" />
                                        <span className="truncate">
                                          URL externa
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeCustomQuickLink(link.id);
                                  }}
                                  className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300"
                                  title="Eliminar enlace"
                                >
                                  <FaTimes className="text-sm" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Mostrar enlaces adicionales (11-20) con scroll */}
                  {customQuickLinks.length > 10 && (
                    <div className="mt-4">
                      <div className="text-xs text-gray-400 mb-2 flex items-center gap-2">
                        <span>
                          📜 Más enlaces ({customQuickLinks.length - 10})
                        </span>
                      </div>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                        {customQuickLinks.slice(10).map((link) => {
                          const isLinkPlaying = currentMedia?.url === link.url;

                          return (
                            <div
                              key={link.id}
                              className={`group rounded-lg overflow-hidden transition-all duration-300 hover:scale-[1.02] ${
                                isLinkPlaying
                                  ? "bg-green-700/40 ring-2 ring-green-500"
                                  : "bg-gray-700/30 hover:bg-gray-600/50"
                              }`}
                            >
                              <div className="flex items-center gap-3 p-2">
                                {/* Thumbnail o icono */}
                                {link.isYoutube ? (
                                  <div className="relative w-32 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-800">
                                    <img
                                      src={getYouTubeThumbnail(link.url)}
                                      alt={link.name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.target.style.display = "none";
                                        e.target.nextSibling.style.display =
                                          "flex";
                                      }}
                                    />
                                    <div className="hidden absolute inset-0 items-center justify-center bg-red-900/50">
                                      <FaYoutube className="text-red-500 text-4xl" />
                                    </div>
                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                      <FaPlay className="text-white text-2xl" />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="w-20 h-20 flex-shrink-0 rounded-lg bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center">
                                    <FaLink className="text-blue-400 text-2xl" />
                                  </div>
                                )}

                                {/* Información */}
                                <div
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => handleQuickLinkClick(link)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      handleQuickLinkClick(link);
                                    }
                                  }}
                                  className="flex-1 text-left min-w-0"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <h5 className="font-medium text-white truncate mb-1">
                                        {link.name}
                                      </h5>
                                      <div className="flex items-center gap-2 text-xs text-gray-400">
                                        {link.isYoutube ? (
                                          <>
                                            <FaYoutube className="text-red-500 flex-shrink-0" />
                                            <span>YouTube</span>
                                          </>
                                        ) : (
                                          <>
                                            <FaLink className="text-blue-400 flex-shrink-0" />
                                            <span className="truncate">
                                              URL externa
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeCustomQuickLink(link.id);
                                      }}
                                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300"
                                      title="Eliminar enlace"
                                    >
                                      <FaTimes className="text-sm" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Separador visual si hay enlaces personalizados */}
              {customQuickLinks.length > 0 && (
                <div className="border-t border-gray-600/50 pt-4 mb-4">
                  <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                    <FaGlobe className="text-blue-400" />
                    Sugerencias
                  </h4>
                </div>
              )}

              {/* Enlaces predefinidos */}
              <div className="space-y-3">
                {[
                  {
                    name: "Música Cristiana",
                    query: "música cristiana",
                    icon: <FaMusic />,
                  },
                  {
                    name: "Predicaciones",
                    query: "predicaciones cristianas",
                    icon: <FaGlobe />,
                  },
                  {
                    name: "Himnos Clásicos",
                    query: "himnos cristianos",
                    icon: <FaMusic />,
                  },
                  {
                    name: "Adoración",
                    query: "música de adoración",
                    icon: <FaMusic />,
                  },
                ].map((link, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
                        link.query,
                      )}`;
                      window.open(youtubeSearchUrl, "_blank");
                    }}
                    className="w-full flex items-center gap-3 p-3 bg-gray-700/30 hover:bg-gray-600/50 rounded-lg transition-all duration-300 text-left group"
                  >
                    <div className="text-gray-400 group-hover:text-white transition-colors">
                      {link.icon}
                    </div>
                    <span className="text-white group-hover:text-gray-100 transition-colors">
                      {link.name}
                    </span>
                    <FaShare className="ml-auto text-gray-500 group-hover:text-gray-300 transition-colors" />
                  </button>
                ))}
              </div>

              {/* Información adicional */}
              <div className="mt-6 p-4 bg-gray-700/30 rounded-lg">
                <h4 className="text-sm font-medium text-gray-300 mb-2">
                  💡 Funciones disponibles:
                </h4>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• Agregar URLs de YouTube y multimedia</li>
                  <li>• Historial de URLs agregadas</li>
                  <li>• Enlaces rápidos personalizados</li>
                  <li>• Búsqueda y filtros avanzados</li>
                  <li>• Proyección en pantalla completa</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ✨ MODAL PARA AGREGAR URL */}
      {showUrlModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-gray-700/50 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-500/20 p-3 rounded-full">
                    <FaLink className="text-blue-400 text-xl" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      Agregar URL
                    </h2>
                    <p className="text-gray-400 text-sm">
                      YouTube, videos, audio o imágenes
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowUrlModal(false);
                    setUrlInput("");
                    setUrlTitle("");
                  }}
                  className="text-gray-400 hover:text-white transition-colors p-2"
                >
                  <FaTimes />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                {/* Campo de título */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Título personalizado
                  </label>
                  <input
                    type="text"
                    value={urlTitle}
                    onChange={(e) => setUrlTitle(e.target.value)}
                    placeholder="Ej: Música de adoración, Predicación especial..."
                    className="w-full p-3 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300"
                    onKeyPress={(e) =>
                      e.key === "Enter" &&
                      document.getElementById("url-input").focus()
                    }
                  />
                </div>

                {/* Campo de URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    URL del contenido multimedia
                  </label>
                  <input
                    id="url-input"
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://youtube.com/watch?v=... o https://ejemplo.com/video.mp4"
                    className="w-full p-3 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300"
                    onKeyPress={(e) => e.key === "Enter" && handleUrlSubmit()}
                  />
                </div>

                {/* Vista previa del tipo de URL */}
                {urlInput && (
                  <div className="bg-gray-700/30 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-white font-semibold">
                        Vista previa:
                      </span>
                      {isYouTubeUrl(urlInput) ? (
                        <span className="bg-red-500/20 text-red-500 text-xs rounded-full px-2 py-1">
                          YouTube
                        </span>
                      ) : (
                        <span className="bg-blue-500/20 text-blue-500 text-xs rounded-full px-2 py-1">
                          URL Normal
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Botones de acción */}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowUrlModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-700 rounded-lg text-gray-300 hover:bg-gray-600 transition-all duration-300"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleUrlSubmit}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <FaLink />
                    Agregar URL
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Multimedia;
